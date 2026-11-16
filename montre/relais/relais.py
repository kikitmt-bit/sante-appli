"""Relais vocal « Claude direct » : la montre parle à Claude en direct, par l'abonnement de Kiki (pas de clé API).

Ce programme tourne sur le PC. Il garde Claude Code lancé (`claude -p` en flux continu, connecté une fois avec
`claude auth login`, dossier .claude-montre du dossier personnel) : pas de démarrage à chaque question. La montre
ouvre une connexion sur le Wi-Fi de la maison, envoie une ligne {"cle", "q", "nouveau"} et reçoit la réponse phrase
par phrase ({"t": "…"} puis {"fin": true, "ms": {…}}), pour la lire à voix haute dès la première phrase.
Aucun outil n'est donné à Claude ici : il ne peut que répondre.

Lancer :  python relais.py            (clé et port lus dans ../secret.properties : RELAIS_CLE, RELAIS_ADR)
Essayer : python relais.py --essai "Quelle est la capitale du Canada ?"
"""
import datetime, glob, hmac, json, os, queue, re, socket, socketserver, subprocess, sys, tempfile, threading, time

ICI = os.path.dirname(os.path.abspath(__file__))
CONFIG = os.path.join(os.path.expanduser("~"), ".claude-montre")
MODELE = "haiku"
SYSTEME = (
    "Tu es Claude, et tu discutes à voix haute avec Kiki, en français : il te parle depuis sa montre et ta réponse est "
    "lue par une voix de synthèse. Réponds comme dans une conversation : une à trois phrases courtes, naturelles, "
    "tutoiement. Jamais de liste, de titre, de symbole, d'émoji ni d'abréviation : écris les nombres et les unités "
    "comme on les dit. Commence directement par la réponse. Si la question demande plus, donne l'essentiel puis "
    "propose de détailler. Ce que tu reçois vient d'une dictée : devine le sens malgré les mots mal transcrits. "
    "Chaque message commence par la date et l'heure entre crochets : ne t'en sers que si c'est utile.")
JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
CLE = ""
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
    """Le Claude Code livré avec l'appli Claude du PC (la version la plus récente), ou celui du PATH."""
    c = glob.glob(os.path.join(os.environ.get("LOCALAPPDATA", ""), "Claude-Data", "*", "claude-code", "*", "*", "claude.exe"))

    def version(p):
        return [int(x) for x in re.findall(r"\d+", os.path.basename(os.path.dirname(os.path.dirname(p))))]
    return max(c, key=version) if c else "claude"


def journal(*a):
    l = time.strftime("%Y-%m-%d %H:%M:%S ") + " ".join(str(x) for x in a)
    print(l, flush=True)
    try:
        with open(os.path.join(ICI, "relais.log"), "a", encoding="utf-8") as f:
            f.write(l + "\n")
    except OSError:
        pass


class Moteur:
    """Un Claude lancé, qui attend les messages (une conversation : il garde le fil)."""

    def __init__(self):
        env = dict(os.environ, CLAUDE_CONFIG_DIR=CONFIG)
        env.pop("ANTHROPIC_API_KEY", None)  # jamais de clé API : l'abonnement seulement
        self.p = subprocess.Popen(
            [claude_exe(), "-p", "--model", MODELE, "--verbose",
             "--input-format", "stream-json", "--output-format", "stream-json", "--include-partial-messages",
             "--no-session-persistence", "--tools", "", "--system-prompt", SYSTEME, "--setting-sources", ""],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
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
        """Envoie le message ; donne ("t", morceau de texte) au fil de l'eau, puis ("fin", None) ou ("erreur", message)."""
        while not self.q.empty():
            self.q.get_nowait()
        msg = {"type": "user", "message": {"role": "user", "content": [{"type": "text", "text": texte}]}}
        try:
            self.p.stdin.write((json.dumps(msg) + "\n").encode("utf-8"))
            self.p.stdin.flush()
        except OSError:
            yield "erreur", "Claude s'est arrêté sur le PC"
            return
        while True:
            try:
                ev = self.q.get(timeout=90)
            except queue.Empty:
                yield "erreur", "Claude ne répond pas"
                return
            if ev is None:
                yield "erreur", "Claude s'est arrêté sur le PC"
                return
            if ev.get("type") == "stream_event":
                e = ev.get("event", {})
                if e.get("type") == "content_block_delta" and e.get("delta", {}).get("type") == "text_delta":
                    yield "t", e["delta"]["text"]
            elif ev.get("type") == "result":
                if ev.get("is_error"):
                    r = str(ev.get("result", ""))
                    if "Not logged in" in r or "/login" in r:
                        yield "erreur", "Claude n'est pas connecté sur le PC"
                    elif "limit" in r.lower():
                        yield "erreur", "Limite de l'abonnement atteinte"
                    else:
                        yield "erreur", r[:120] or "Erreur de Claude"
                else:
                    yield "fin", None
                return


class Relais:
    """La conversation en cours + un Claude d'avance, déjà lancé, pour la suivante."""

    def __init__(self):
        self.verrou = threading.Lock()
        self.actif = Moteur()
        self.reserve = Moteur()
        self.entame = False

    def _suivant(self):
        self.actif.arreter()
        self.actif = self.reserve if self.reserve.vivant() else Moteur()
        self.reserve = Moteur()
        self.entame = False

    def nouvelle(self):
        with self.verrou:
            if self.entame or not self.actif.vivant():  # sinon rien n'a encore été dit : on garde celui-ci
                self._suivant()

    def parler(self, q):
        """Donne ("t", phrase prête à lire), puis ("fin", temps en ms) ou ("erreur", message)."""
        with self.verrou:
            if not self.actif.vivant():
                self._suivant()
            n = datetime.datetime.now()
            entete = "[%s %d %s %d, %02d:%02d] " % (JOURS[n.weekday()], n.day, MOIS[n.month - 1], n.year, n.hour, n.minute)
            d = time.perf_counter()
            self.entame = True
            ms = {}
            reste, tout, premiere = "", "", True
            for quoi, v in self.actif.poser(entete + q):
                if quoi == "t":
                    ms.setdefault("mot", round((time.perf_counter() - d) * 1000))
                    reste += v
                    while True:
                        phrase, reste = couper(reste, premiere)
                        if phrase is None:
                            break
                        ms.setdefault("phrase", round((time.perf_counter() - d) * 1000))
                        premiere = False
                        tout += phrase + " "
                        yield "t", phrase
                elif quoi == "fin":
                    if propre(reste):
                        ms.setdefault("phrase", round((time.perf_counter() - d) * 1000))
                        tout += propre(reste)
                        yield "t", propre(reste)
                    ms["total"] = round((time.perf_counter() - d) * 1000)
                    journal("Q:", q[:80], "| R:", tout.strip()[:120], "|", ms)
                    yield "fin", ms
                else:
                    journal("ERREUR:", v, "| Q:", q[:80])
                    self.reserve.arreter()  # lancé avant la panne (pas connecté…) : on repart de deux Claude neufs
                    self._suivant()
                    yield "erreur", v


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
        self.connection.settimeout(120)
        try:
            self.connection.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            d = json.loads(self.rfile.readline(20000).decode("utf-8"))
        except (ValueError, OSError):
            return
        if not CLE or not hmac.compare_digest(str(d.get("cle", "")).encode(), CLE.encode()):
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
        RELAIS.actif.arreter()
        RELAIS.reserve.arreter()
        sys.exit(0)
    if not CLE:
        sys.exit("RELAIS_CLE manque dans montre/secret.properties")
    journal("Relais vocal prêt, port", PORT, "| Claude :", claude_exe())
    try:
        Serveur(("0.0.0.0", PORT), Poste).serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        RELAIS.actif.arreter()
        RELAIS.reserve.arreter()
