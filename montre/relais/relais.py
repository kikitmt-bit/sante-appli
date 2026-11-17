"""Relais vocal « Claude direct » : la montre parle à Claude en direct, par l'abonnement de Kiki (pas de clé API).

Ce programme garde Claude Code lancé (`claude -p` en flux continu, connecté une fois avec `claude auth login`) : pas
de démarrage à chaque question. Il reçoit une ligne {"q", "nouveau"} et renvoie la réponse phrase par phrase
({"t": "…"} puis {"fin": true, "ms": {…, "modele": "Haiku"}}), pour que la montre la lise à voix haute dès la
première phrase. Aucun outil n'est donné à Claude ici : il ne peut que répondre.

Choix du modèle (17/11/2026, demandé par Kiki) : Haiku répond toujours en premier (réponse en 2-3 s). S'il juge que la
question demande de réfléchir, il commence par [SONNET] ou [OPUS] suivi d'une courte phrase d'attente (« Bonne
question, je réfléchis. »), lue tout de suite ; le relais pose alors la question à Sonnet (effort moyen) ou Opus
(effort élevé), lancés à la demande et gardés 10 min pour la suite. Chaque modèle reçoit les échanges qu'il n'a pas
vus, pour garder le fil de la conversation.

Deux comptes (comme le Claude des routines) : compte 1 = connexion par défaut (`claude-connexion`), compte 2 = dossier
~/.claude-2 (`claude-connexion-2`). Si le compte utilisé répond « limite atteinte », le relais passe à l'autre et
repose la question ; le compte qui a répondu devient le compte par défaut (retenu dans compte.txt).

Sur le téléphone (choix de Kiki, 17/11/2026 : pas de PC) : dans Termux, Ubuntu de proot-distro, installé par
installer-telephone.sh ; lancé par la commande `claude-montre` (= python3 relais.py --local : n'écoute que le
téléphone lui-même, 127.0.0.1, sans clé). L'appli « Pokémon (montre) » du téléphone fait le pont avec la montre en
Bluetooth (PontVocal).
Sur un PC ou un serveur : python relais.py (clé et port dans ../secret.properties : RELAIS_CLE, RELAIS_ADR ; la ligne
reçue doit alors porter "cle").
Essayer : python relais.py --essai "Quelle est la capitale du Canada ?" "Pourquoi le ciel est bleu ?"
"""
import datetime, glob, hmac, json, os, queue, re, shlex, socket, socketserver, subprocess, sys, tempfile, threading, time

ICI = os.path.dirname(os.path.abspath(__file__))
MAISON = os.path.expanduser("~")
ORAL = (
    "Tu es Claude, et tu discutes à voix haute avec Kiki, en français : il te parle depuis sa montre et ta réponse est "
    "lue par une voix de synthèse. Réponds comme dans une conversation, naturellement, en le tutoyant. Jamais de liste, "
    "de titre, de symbole, d'émoji ni d'abréviation : écris les nombres et les unités comme on les dit. Commence "
    "directement par la réponse. Ce que tu reçois vient d'une dictée : devine le sens malgré les mots mal transcrits. "
    "Chaque message commence par la date et l'heure entre crochets : ne t'en sers que si c'est utile. Il peut aussi "
    "contenir, entre parenthèses, des échanges de la conversation que tu n'as pas vus (répondus par un autre modèle) : "
    "tiens-en compte comme si c'était toi.")
SYSTEME_HAIKU = ORAL + (
    " Fais une à trois phrases courtes ; si la question demande plus, donne l'essentiel puis propose de détailler. "
    "Avant de répondre, juge la question. Si elle demande vraiment de réfléchir (un conseil, une comparaison, une "
    "explication détaillée, un calcul, un avis argumenté), ne réponds pas : écris seulement [SONNET] suivi d'une très "
    "courte phrase d'attente naturelle et variée, par exemple « Bonne question, laisse-moi réfléchir. ». Si elle est "
    "difficile ou importante (santé, argent, décision importante, raisonnement long ou délicat), fais pareil avec "
    "[OPUS]. Si Kiki demande explicitement de réfléchir plus, d'approfondir ou de demander à Opus, utilise [OPUS]. "
    "Pour tout le reste (faits, définitions, petite conversation, suite simple d'un échange), réponds toi-même.")
SYSTEME_GRAND = ORAL + (
    " On t'a confié cette question parce qu'elle demande de la réflexion : réponds de façon juste et utile, en trois à "
    "six phrases au plus, à l'oral. Kiki vient déjà d'entendre une courte phrase d'attente : ne dis pas bonjour, ne "
    "répète pas la question, va droit au but.")
GRANDS = {"SONNET": ("sonnet", "medium", "Sonnet"), "OPUS": ("opus", "high", "Opus")}
GARDE_GRAND = 600  # s : un grand modèle reste lancé 10 min après avoir servi
JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
CLE = ""
LOCAL = False
RELAIS = None


def secrets_montre():
    d = {}
    try:
        with open(os.path.join(ICI, "..", "secret.properties"), encoding="utf-8") as f:
            for l in f:
                if "=" in l and not l.lstrip().startswith("#"):
                    k, v = l.split("=", 1)
                    d[k.strip()] = v.strip()
    except OSError:
        pass
    return d


def claude_exe():
    """La commande Claude : CLAUDE_EXE si donnée (essais), sinon le Claude Code de l'appli Claude du PC, ou celui du PATH."""
    if os.environ.get("CLAUDE_EXE"):
        return shlex.split(os.environ["CLAUDE_EXE"], posix=os.name != "nt")
    c = glob.glob(os.path.join(os.environ.get("LOCALAPPDATA", ""), "Claude-Data", "*", "claude-code", "*", "*", "claude.exe"))

    def version(p):
        return [int(x) for x in re.findall(r"\d+", os.path.basename(os.path.dirname(os.path.dirname(p))))]
    return [max(c, key=version) if c else "claude"]


def journal(*a):
    l = time.strftime("%Y-%m-%d %H:%M:%S ") + " ".join(str(x) for x in a)
    print(l, flush=True)
    try:
        with open(os.path.join(ICI, "relais.log"), "a", encoding="utf-8") as f:
            f.write(l + "\n")
    except OSError:
        pass


# ---------- Les comptes ----------
def dossier_compte(n):
    """Dossier de connexion du compte n (None = celui par défaut de Claude Code)."""
    if os.name == "nt":  # sur le PC, des connexions à part de celle de l'appli Claude
        return os.path.join(MAISON, ".claude-montre" + ("" if n == 1 else "-%d" % n))
    return None if n == 1 else os.path.join(MAISON, ".claude-%d" % n)


def comptes_connectes():
    """Les comptes utilisables : le 1 toujours, le 2 s'il a été connecté (claude-connexion-2)."""
    l = [1]
    d = dossier_compte(2)
    if d and os.path.exists(os.path.join(d, ".credentials.json")):
        l.append(2)
    return l


def compte_retenu():
    try:
        with open(os.path.join(ICI, "compte.txt")) as f:
            n = int(f.read().strip())
        return n if n in comptes_connectes() else 1
    except (OSError, ValueError):
        return 1


def retenir_compte(n):
    try:
        with open(os.path.join(ICI, "compte.txt"), "w") as f:
            f.write(str(n))
    except OSError:
        pass


class Limite(Exception):
    pass


class Moteur:
    """Un Claude lancé, qui attend les messages (une conversation : il garde le fil)."""

    def __init__(self, modele, systeme, effort=None, compte=1):
        self.modele, self.compte, self.vu = modele, compte, 0   # vu = nombre d'échanges de l'historique déjà connus
        self.servi = time.time()
        env = dict(os.environ)
        env.pop("ANTHROPIC_API_KEY", None)  # jamais de clé API : l'abonnement seulement
        d = dossier_compte(compte)
        if d:
            env["CLAUDE_CONFIG_DIR"] = d
        else:
            env.pop("CLAUDE_CONFIG_DIR", None)
        cmd = claude_exe() + ["-p", "--model", modele, "--verbose",
                              "--input-format", "stream-json", "--output-format", "stream-json", "--include-partial-messages",
                              "--no-session-persistence", "--tools", "", "--system-prompt", systeme, "--setting-sources", ""]
        if effort:
            cmd += ["--effort", effort]
        self.p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                  cwd=tempfile.gettempdir(), env=env, bufsize=0,
                                  creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        self.q = queue.Queue()
        threading.Thread(target=self._lire, daemon=True).start()

    def _lire(self):
        for l in self.p.stdout:
            try:
                self.q.put(json.loads(l))
            except ValueError:
                pass
        self.q.put(None)

    def vivant(self):
        return self.p.poll() is None

    def arreter(self):
        try:
            self.p.stdin.close()
        except OSError:
            pass
        try:
            self.p.terminate()
        except OSError:
            pass

    def poser(self, texte):
        """Envoie le message ; donne ("t", morceau de texte) au fil de l'eau, puis ("fin", None) ou ("erreur", message).
        Lève Limite si le compte est à sa limite."""
        self.servi = time.time()
        while not self.q.empty():
            self.q.get_nowait()
        msg = {"type": "user", "message": {"role": "user", "content": [{"type": "text", "text": texte}]}}
        try:
            self.p.stdin.write((json.dumps(msg) + "\n").encode("utf-8"))
            self.p.stdin.flush()
        except OSError:
            yield "erreur", "Claude s'est arrêté"
            return
        while True:
            try:
                ev = self.q.get(timeout=120)
            except queue.Empty:
                yield "erreur", "Claude ne répond pas"
                return
            if ev is None:
                yield "erreur", "Claude s'est arrêté"
                return
            if ev.get("type") == "stream_event":
                e = ev.get("event", {})
                if e.get("type") == "content_block_delta" and e.get("delta", {}).get("type") == "text_delta":
                    yield "t", e["delta"]["text"]
            elif ev.get("type") == "result":
                self.servi = time.time()
                if ev.get("is_error"):
                    r = str(ev.get("result", ""))
                    if "Not logged in" in r or "/login" in r:
                        yield "erreur", "Claude n'est pas connecté au compte %d" % self.compte
                    elif "limit" in r.lower() or ev.get("api_error_status") == 429:
                        raise Limite(r[:120])
                    else:
                        yield "erreur", r[:120] or "Erreur de Claude"
                else:
                    yield "fin", None
                return


class Relais:
    """La conversation en cours (Haiku + un Haiku d'avance pour la suivante), les grands modèles lancés à la demande,
    et l'historique des échanges, que chaque modèle reçoit pour la partie qu'il n'a pas vue."""

    def __init__(self):
        self.verrou = threading.Lock()
        self.compte = compte_retenu()
        self.haiku = self._haiku()
        self.reserve = self._haiku()
        self.grands = {}          # "OPUS" -> Moteur
        self.hist = []            # [(question, réponse, modèle)]
        threading.Thread(target=self._menage, daemon=True).start()

    def _haiku(self):
        return Moteur("haiku", SYSTEME_HAIKU, None, self.compte)

    def _menage(self):
        while True:
            time.sleep(30)
            with self.verrou:
                for k, m in list(self.grands.items()):
                    if time.time() - m.servi > GARDE_GRAND:
                        m.arreter()
                        del self.grands[k]

    def _tout_arreter(self):
        for m in [self.haiku, self.reserve] + list(self.grands.values()):
            m.arreter()
        self.grands = {}

    def _changer_compte(self):
        """Passe à l'autre compte connecté ; faux s'il n'y en a pas."""
        autres = [c for c in comptes_connectes() if c != self.compte]
        if not autres:
            return False
        self._tout_arreter()
        self.compte = autres[0]
        journal("compte", self.compte, "(l'autre est à sa limite)")
        self.haiku = self._haiku()
        self.reserve = self._haiku()
        self.haiku.vu = 0
        return True

    def _nouvelle_conversation(self):
        self.haiku.arreter()
        self.haiku = self.reserve if self.reserve.vivant() else self._haiku()
        self.reserve = self._haiku()
        for m in self.grands.values():
            m.arreter()
        self.grands = {}
        self.hist = []

    def nouvelle(self):
        with self.verrou:
            if self.hist or not self.haiku.vivant():  # sinon rien n'a encore été dit : on garde celui-ci
                self._nouvelle_conversation()

    def _message(self, m, q):
        """Le message pour le modèle m : date, échanges qu'il n'a pas vus, puis la question."""
        n = datetime.datetime.now()
        entete = "[%s %d %s %d, %02d:%02d] " % (JOURS[n.weekday()], n.day, MOIS[n.month - 1], n.year, n.hour, n.minute)
        manque = self.hist[m.vu:]
        m.vu = len(self.hist) + 1
        if manque:
            entete += "(Échanges que tu n'as pas vus : " + " ".join(
                "Kiki : « %s » %s : « %s »" % (a, mod, r) for a, r, mod in manque) + ") "
        return entete + q

    def _grand(self, k):
        m = self.grands.get(k)
        if m is None or not m.vivant():
            modele, effort, _ = GRANDS[k]
            m = Moteur(modele, SYSTEME_GRAND, effort, self.compte)
            self.grands[k] = m
        return m

    def parler(self, q):
        """Donne ("t", phrase prête à lire), puis ("fin", temps en ms + modèle) ou ("erreur", message)."""
        with self.verrou:
            d = time.perf_counter()
            essais = 0
            while True:
                try:
                    yield from self._parler(q, d)
                    return
                except Limite as e:
                    essais += 1
                    journal("LIMITE compte", self.compte, ":", e)
                    if essais > 1 or not self._changer_compte():
                        yield "erreur", "Limite atteinte sur " + ("les deux comptes" if len(comptes_connectes()) > 1 else "ton compte")
                        return
                    retenir_compte(self.compte)

    def _parler(self, q, d):
        if not self.haiku.vivant():
            self._nouvelle_conversation()
        ms, dit = {}, []
        etat = {"premiere": True}

        def lire(moteur, message, debut_tag):
            """Lit la réponse de moteur ; donne les phrases ; renvoie le tag [SONNET]/[OPUS] trouvé au début (ou None)."""
            reste, tag, decide = "", None, not debut_tag
            for quoi, v in moteur.poser(message):
                if quoi == "erreur":
                    raise RuntimeError(v)
                if quoi == "fin":
                    break
                ms.setdefault("mot", round((time.perf_counter() - d) * 1000))
                reste += v
                if not decide:  # le tout début : un tag ?
                    s = reste.lstrip()
                    m = re.match(r"\[(SONNET|OPUS)\]\s*", s)
                    if m:
                        tag, reste, decide = m.group(1), s[m.end():], True
                    elif not s.startswith("[") or len(s) > 9 or "]" in s:
                        decide = True
                    else:
                        continue
                while True:
                    phrase, reste = couper(reste, etat["premiere"])
                    if phrase is None:
                        break
                    ms.setdefault("phrase", round((time.perf_counter() - d) * 1000))
                    etat["premiere"] = False
                    dit.append(phrase)
                    yield phrase
            if propre(reste):
                ms.setdefault("phrase", round((time.perf_counter() - d) * 1000))
                etat["premiere"] = False
                dit.append(propre(reste))
                yield propre(reste)
            return tag

        try:
            gen = lire(self.haiku, self._message(self.haiku, q), True)
            while True:
                try:
                    yield "t", next(gen)
                except StopIteration as fin:
                    tag = fin.value
                    break
            modele = "Haiku"
            if tag:
                attente = " ".join(dit)
                _, _, modele = GRANDS[tag]
                grand = self._grand(tag)
                message = self._message(grand, q)     # avant d'ajouter cet échange : il ne doit pas le voir en double
                self.hist.append((q, attente, "Haiku"))
                self.haiku.vu = len(self.hist) - 1   # Haiku recevra cet échange avec la réponse du grand modèle
                dit.clear()
                ms["confie"] = round((time.perf_counter() - d) * 1000)
                gen = lire(grand, message, False)
                for p in gen:
                    yield "t", p
                self.hist[-1] = (q, (attente + " " + " ".join(dit)).strip(), modele)
                grand.vu = len(self.hist)
            else:
                self.hist.append((q, " ".join(dit), "Haiku"))
                self.haiku.vu = len(self.hist)
        except RuntimeError as e:
            journal("ERREUR:", e, "| Q:", q[:80])
            self.reserve.arreter()
            self._nouvelle_conversation()
            yield "erreur", str(e)
            return
        ms["total"] = round((time.perf_counter() - d) * 1000)
        ms["modele"] = modele
        if len(comptes_connectes()) > 1:
            ms["compte"] = self.compte
        journal("Q:", q[:80], "| R:", self.hist[-1][1][:120], "|", ms)
        yield "fin", ms


def propre(t):
    """Rien qui se lise mal à voix haute (au cas où Claude met quand même de la mise en forme)."""
    return re.sub(r"\s+", " ", re.sub(r"[*_#`]+", "", t)).strip()


def couper(t, premiere):
    """Première phrase complète de t (suivie d'autre chose), ou un début de réponse assez long coupé à une virgule,
    pour que la voix démarre vite. Renvoie (phrase, reste), ou (None, t) s'il n'y a pas encore de quoi lire."""
    for m in re.finditer(r"[.!?…]+[\"»)]?\s+(?=\S)", t):
        avant, apres = t[:m.end()], t[m.end():]
        if re.search(r"\b(M|Mme|Mlle|Dr|St|Ste)\.\s+$", avant):
            continue  # « M. Dupont » : pas une fin de phrase
        if re.search(r"(\d|\b(etc|ex|cf|p))\.\s+$", avant) and re.match(r"[\da-zà-ÿ]", apres):
            continue  # « 3. 5 », « etc. et » : la phrase continue
        p = propre(t[:m.end()])
        if p:
            return p, t[m.end():]
    if premiere and len(t) > 70:
        m = re.search(r"[,;:]\s+(?=\S)", t[25:])
        if m:
            return propre(t[:25 + m.end()]), t[25 + m.end():]
    return None, t


class Poste(socketserver.StreamRequestHandler):
    def handle(self):
        self.connection.settimeout(180)
        try:
            self.connection.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            d = json.loads(self.rfile.readline(20000).decode("utf-8"))
        except (ValueError, OSError):
            return
        if not LOCAL and (not CLE or not hmac.compare_digest(str(d.get("cle", "")).encode(), CLE.encode())):
            journal("refusé (clé) depuis", self.client_address[0])
            return
        if d.get("nouveau"):
            RELAIS.nouvelle()
        q = str(d.get("q", "")).strip()[:2000]
        if not q:
            self.dire({"ok": True})
            return
        ouvert = True
        for quoi, v in RELAIS.parler(q):  # si la montre a raccroché, on laisse Claude finir (le fil reste entier)
            if ouvert:
                ouvert = self.dire({"t": v} if quoi == "t" else {"fin": True, "ms": v} if quoi == "fin" else {"erreur": v})

    def dire(self, o):
        try:
            self.wfile.write((json.dumps(o, ensure_ascii=False) + "\n").encode("utf-8"))
            self.wfile.flush()
            return True
        except OSError:
            return False


class Serveur(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    S = secrets_montre()
    CLE = S.get("RELAIS_CLE", "")
    PORT = int(S.get("RELAIS_ADR", "192.168.0.35:8793").rsplit(":", 1)[-1])
    RELAIS = Relais()
    if "--essai" in sys.argv:
        for question in sys.argv[sys.argv.index("--essai") + 1:]:
            for quoi, v in RELAIS.parler(question):
                print(quoi, v, flush=True)
        RELAIS._tout_arreter()
        sys.exit(0)
    LOCAL = "--local" in sys.argv
    if not LOCAL and not CLE:
        sys.exit("RELAIS_CLE manque dans montre/secret.properties")
    journal("Relais vocal prêt, port", PORT, "(téléphone seul)" if LOCAL else "", "| comptes :", comptes_connectes(),
            "| compte utilisé :", RELAIS.compte)
    try:
        Serveur(("127.0.0.1" if LOCAL else "0.0.0.0", PORT), Poste).serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        RELAIS._tout_arreter()
