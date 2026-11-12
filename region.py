"""Ce qui est commun à toutes les régions : le voyage sur la carte, les arènes et leurs défis, les sanctuaires. Les données de chaque région
(lieux, Pokémon, champions, carte) sont dans kanto.py, johto.py… ; regions.py en fait la liste.

Les points de la barre d'effort font avancer sur la carte. On n'attrape que dans les lieux déjà atteints (jamais ceux à venir), surtout celui où
l'on est (pokemon.tirer). Dans une ville à arène, on s'arrête jusqu'à réussir le défi du champion ou son plan B : un exploit à son thème, faisable
vite, avec une autre voie quand il faut du matériel ou un escalier ; jamais de sommeil ni d'horaire de coucher (travail de nuit, horaires décalés).
Le plan B, plus long, reste pour tous : un jour d'exploit y compte double, une petite journée moitié. Pendant le défi, le dresseur reste à l'arène :
les points gagnés ne font pas avancer la carte. Un badge = une Hyper Ball du type du champion ; la Ligue = une Master Ball. Des sanctuaires (légendaires)
se débloquent sur la route : un petit défi qui ne bloque jamais.

Tout est rejoué depuis le premier jour du jeu avec les vraies données (comme les balls) : rien n'est enregistré."""
from pokedex import POKEMON

_NUM = {p["nom"]: n for n, p in POKEMON.items()}


def numeros(noms):
    """« Roucool, Rattata » -> [16, 19]."""
    return [_NUM[x] for x in noms.split(", ")] if noms else []


PAS_PETIT = 3000  # une petite journée compte pour moitié au plan B : à 4 000 pas sans sport, on restait bloqué à vie chez Pierre (03/11)
SANCTUAIRE_CIBLE = 5  # jours d'exploit
# Le filet (05/11, Kiki : une région se finit en 2 mois environ, plus de 3 mois sur une carte doit être presque impossible). Un jour actif = 2 000 pas au moins.
JOUR_ACTIF = 2000
VELO_JOUR, VELO_RYTHME, VELO_MIN = 30, 60, 45  # à partir du 30e jour, en retard sur une carte faite en 60 jours : le vélo, chaque jour actif compte double sur la carte, 45 points au moins


def plan_b(jours):
    """Le plan B d'une arène : la difficulté monte d'arène en arène, un jour d'exploit compte pour deux, une petite journée pour moitié."""
    return "objectif", jours, f"{jours} jours avec ton objectif du jour (un exploit compte double, une journée à {PAS_PETIT // 1000} 000 pas compte moitié)"


def voie(defi, cible, texte):
    """Une voie pour réussir une épreuve (voir DEFIS)."""
    return {"defi": defi, "cible": cible, "texte": texte}


def arene(champion, type_, badge, image, voies, plan_b_, epreuves=None, pokemon=None):
    """voies : une seule suffit. epreuves (la Ligue) : [(adversaire, voies)], toutes à réussir, dans l'ordre qu'on veut. pokemon = le Pokémon du
    champion (Kiki, 05/11) : il le confie avec le badge, et il ne sort jamais d'une ball ordinaire de la région."""
    ep = [{"qui": q, "voies": v} for q, v in epreuves] if epreuves else [{"qui": None, "voies": voies}]
    return {"champion": champion, "type": type_, "badge": badge, "image": image, "epreuves": ep,
            "texte": " ou ".join(o["texte"] for o in voies) if voies else f"{len(ep)} épreuves",
            "b": dict(zip(("defi", "cible", "texte"), plan_b_)), "pokemon": numeros(pokemon)[0] if pokemon else None}


DEFIS = {  # défi -> (valeur d'une journée, unité, « somme » = cumulé depuis l'arrivée ou « jour » = la meilleure journée depuis l'arrivée)
    "etages": (lambda j: j["etages"], "étages", "jour"),  # en une journée : cumulés, ils venaient tout seuls (11 par jour chez Kiki, 03/11)
    "eau": (lambda j: j["eau"], "min", "somme"),
    "pompes": (lambda j: j["pompes"], "pompes", "somme"),
    "tractions": (lambda j: j["tractions"], "tractions", "somme"),
    "sport_jour": (lambda j: j["zone"], "min", "jour"),
    "pas_jour": (lambda j: j["pas"], "pas", "jour"),
    "soir": (lambda j: j["soir"], "pas", "jour"),
    "km": (lambda j: j["km"], "km", "jour"),
    "seance": (lambda j: j["seance"], "min", "jour"),
    "force": (lambda j: j["force_min"], "min", "jour"),
    "complet": (lambda j: j["double"], "jour", "jour"),
    "objectif": (lambda j: 2 if j["hyper"] else 1 if j["ok"] else .5 if j["pas"] >= PAS_PETIT else 0, "jours", "somme"),  # un jour d'exploit compte double, une petite journée moitié
}


class Region:
    """Une région du jeu. lieux = [(nom, points depuis l'étape d'avant, x, y en pixels sur l'image de la carte, Pokémon du lieu, arène ou None)] ;
    via = le chemin depuis l'étape d'avant, qui suit les routes de la carte ; modes = « vol », « surf », « grotte » pour ne pas repasser par une route déjà
    faite (même nombre de points, seul le dessin change) ; sanctuaires = lieu -> légendaire ; ligue = le légendaire de la Ligue ; diplome = celui du
    Pokédex complet de la région ; cadeau = (clé de la ball, raison) du starter du professeur ; suivante = le texte de l'appel de fin de région."""

    def __init__(self, nom, numeros_, legendaires, lieux, carte, via, modes, sanctuaires, rares, starters, ligue, diplome, cadeau, cle_diplome, raison_diplome, moments=None, arene_max=None, reportes=(), variante=None):
        self.nom, self.carte, self.starters, self.ligue, self.diplome = nom, carte, starters, ligue, diplome
        self.cadeau, self.cle_diplome, self.raison_diplome = cadeau, cle_diplome, raison_diplome
        self.lieux = [{"nom": n, "x": x, "y": y, "pokemon": numeros(pk), "arene": ar, "pas": d, "via": via.get(n, []),
                       "mode": modes.get(n, "route")} for n, d, x, y, pk, ar in lieux]
        self.dist = []  # points cumulés pour atteindre chaque lieu
        for lieu in self.lieux:
            self.dist.append((self.dist[-1] if self.dist else 0) + lieu["pas"])
        self.arenes = [i for i, lieu in enumerate(self.lieux) if lieu["arene"]]  # la dernière = la Ligue
        self.variante = variante  # variante(graine) -> les Pokémon de chaque lieu pour ce joueur : tout le monde n'a pas exactement les mêmes
        self.arene_max = arene_max  # après tant de jours actifs à une arène, le champion laisse passer
        self.rival = {}  # lieu -> image de la rencontre avec le rival de la région (rival.py)
        self.especes = set(numeros_) - set(legendaires) - set(reportes)  # les Pokémon du diplôme ; reportes = gardés pour les régions suivantes, à étaler sur tout le jeu
        self.champions = {lieu["arene"]["pokemon"] for lieu in self.lieux if lieu["arene"] and lieu["arene"].get("pokemon")}  # jamais dans une ball ordinaire
        self.lieux_et_legendes = (set(numeros_) - set(reportes)) | self.champions | {n + k for n in starters for k in range(3)}  # le starter et ses évolutions, même s'ils sortent des balls bien plus tard
        vus = [n for lieu in self.lieux for n in lieu["pokemon"]]
        assert set(vus) == self.especes and len(vus) == len(self.especes), f"{nom} : Pokémon sans lieu ou en double : {self.especes ^ set(vus)}"
        self.sanct_index = {i: sanctuaires[lieu["nom"]] for i, lieu in enumerate(self.lieux) if lieu["nom"] in sanctuaires}
        self.legendes_chance = sorted(sanctuaires.values())  # ce que la toute petite chance peut donner avant les sanctuaires
        self.rares = set(numeros(rares))
        self.moments = {k: set(numeros(v)) for k, v in (moments or {}).items()}  # la nouveauté de la région : les Pokémon du matin et du soir
        for lieu in self.lieux:  # l'écran a besoin de l'unité et du mode de chaque voie
            for e in (lieu["arene"] or {}).get("epreuves", []):
                for v in e["voies"]:
                    v["unite"], v["mode"] = DEFIS[v["defi"]][1:]


# Avec ce matériel, une voie en écarte une autre de la même épreuve (Kiki, 12/11 : avec un rameur, Ondine demande le rameur, pas 5 km)
REMPLACE = {"eau": ("rameur", "km")}


def voie_ecartee(v, voies, materiel):
    """La voie v n'est pas proposée à ce joueur : son matériel en rend une autre de l'épreuve possible (REMPLACE)."""
    return any(o["defi"] in REMPLACE and REMPLACE[o["defi"]][0] in (materiel or ()) and v["defi"] == REMPLACE[o["defi"]][1] for o in voies)


class Voyage:
    """L'état du voyage dans une région, mis à jour jour après jour par pokemon.jouer."""

    def __init__(self, region, graine=None, materiel=None):
        self.r, self.materiel = region, materiel
        self.pokemon = region.variante(graine) if graine and region.variante else [lieu["pokemon"] for lieu in region.lieux]  # les Pokémon de chaque lieu pour ce joueur
        self.badges = {}      # numéro d'arène (1 à 9, 9 = Ligue) -> date du badge
        self.arrivee = None   # date d'arrivée à l'arène en cours
        self.histo = []       # (date, chiffres pour les voies du défi, chiffres du jour entier) depuis l'arrivée à l'arène ; le jour de l'arrivée, les voies ne
                              # comptent que ce qui suit l'arrivée (dès DEFI_MINUTE) ; le plan B et les jours actifs comptent toujours le jour entier
        self.pos = 0.0
        self.cumul = 0.0      # les points d'effort vus jusqu'ici (pour n'ajouter que ceux du jour)
        self.exploits = {}    # lieu d'un sanctuaire atteint -> jours d'exploit depuis
        self.sanct_faits = {}  # lieu d'un sanctuaire réussi -> date
        self.sanct_du_jour = []  # les sanctuaires réussis aujourd'hui
        self.debut = None     # le premier jour dans la région
        self.velo = None      # le jour où le joueur en retard a reçu le vélo
        self.bonus = 0.0      # les points de carte que le vélo a ajoutés (le niveau du starter les compte, pour rester en avance sur la carte)
        self.nets = set()     # les arènes gagnées par le vrai défi (victoire nette), pas parce que le champion a laissé passer

    def arene_suivante(self):
        """Index (dans les lieux) de la prochaine arène à gagner, ou None (Ligue gagnée)."""
        return next((i for k, i in enumerate(self.r.arenes, 1) if k not in self.badges), None)

    def valeur(self, d, jour):
        """Où en est une voie (ou le plan B), depuis l'arrivée à l'arène."""
        f, _, mode = DEFIS[d["defi"]]
        plein = d is self.r.lieux[self.arene_suivante()]["arene"]["b"]  # le plan B : le jour entier
        vals = [float(f(jd if plein else jv)) for x, jv, jd in self.histo if x <= jour]
        return (sum(vals) if mode == "somme" else max(vals, default=0)) if vals else 0

    def jours_actifs(self, jour):
        """Les jours actifs depuis l'arrivée à l'arène."""
        return sum(1 for x, _, j in self.histo if x <= jour and j["pas"] >= JOUR_ACTIF)

    def defi(self, jour):
        """(les valeurs de chaque voie de chaque épreuve, la valeur du plan B) de l'arène où l'on est arrivé."""
        a = self.r.lieux[self.arene_suivante()]["arene"]
        return [[self.valeur(v, jour) for v in e["voies"]] for e in a["epreuves"]], self.valeur(a["b"], jour)

    def par_defi(self, jour):
        """Le vrai défi du champion est-il réussi (une voie de chaque épreuve) ? C'est la victoire nette, qui rapporte une Super Ball en plus."""
        a = self.r.lieux[self.arene_suivante()]["arene"]
        ep, _ = self.defi(jour)
        return all(any(x >= v["cible"] and not voie_ecartee(v, e["voies"], self.materiel) for x, v in zip(vals, e["voies"])) for vals, e in zip(ep, a["epreuves"]))

    def reussi(self, jour):
        a = self.r.lieux[self.arene_suivante()]["arene"]
        if self.r.arene_max and self.jours_actifs(jour) >= self.r.arene_max:
            return True
        return self.defi(jour)[1] >= a["b"]["cible"] or self.par_defi(jour)

    def avancer(self, jour, j, cumul, detail=None):
        """Un jour de plus : j = chiffres du jour, cumul = points d'effort depuis le début de la région. -> [(numéro, lieu)] des
        badges gagnés ce jour-là ; self.sanct_du_jour = les sanctuaires réussis ce jour-là. detail = une fonction qui donne la journée minute
        par minute (pokemon.Journee), seulement lue le jour d'une arrivée à une arène ou d'une victoire : le défi ne compte que ce qui suit
        l'arrivée, et la carte repart avec les points faits après la victoire (Kiki, 12/11). Sans detail : le jour entier, comme avant."""
        dist = self.r.dist
        gagnes, gain, self.cumul = [], max(cumul - self.cumul, 0), cumul
        self.debut = self.debut or jour
        n = (jour - self.debut).days + 1
        if self.velo is None and self.arene_suivante() is not None and n >= VELO_JOUR and self.pos < dist[-1] * n / VELO_RYTHME:
            self.velo = jour
        if self.velo and j["pas"] >= JOUR_ACTIF:
            en_plus = max(gain, VELO_MIN - gain, 0)
            gain += en_plus
            self.bonus += en_plus
        D, lu = None, False

        def journee():
            nonlocal D, lu
            if not lu:
                D, lu = (detail() if detail else None), True
            return D
        t0, debut_defi = -1, 0  # la minute jusqu'où les points du jour ont déjà servi ; la minute où le défi en cours a commencé aujourd'hui
        while True:
            i = self.arene_suivante()
            base = gain * (journee().part(t0) if t0 >= 0 and journee() else 0)  # les points du jour déjà passés (route, défi)
            reste = gain - base if t0 < 1439 else 0
            if i is None:
                self.pos = min(self.pos + reste, dist[-1])
                break
            if not self.arrivee:  # sur la route : on avance, jamais au-delà de l'arène
                if self.pos + reste < dist[i]:
                    self.pos += reste
                    break
                besoin = dist[i] - self.pos
                self.pos, self.arrivee, self.histo = dist[i], jour, []
                if journee():  # la minute où il arrive : le défi commence là
                    debut_defi = t0 = next((t for t in range(max(t0, 0), 1440) if gain * D.part(t) - base >= besoin - 1e-9), 1439)
                else:
                    debut_defi = t0 = 0
            # à l'arène : ce que le défi compte aujourd'hui (depuis l'arrivée si c'est aujourd'hui, sinon le jour entier)
            depuis = debut_defi if self.arrivee == jour else 0
            jv = journee().j(depuis, 1439) if depuis > 0 and journee() else j
            self.histo = [h for h in self.histo if h[0] != jour] + [(jour, jv, j)]
            if not self.reussi(jour):
                break
            t_v = 1439
            if journee():  # la minute de la victoire : la première où le défi est réussi
                D_ = journee()
                bas, haut = max(depuis, 0), 1439
                while bas < haut:
                    mi = (bas + haut) // 2
                    self.histo[-1] = (jour, D_.j(depuis, mi), D_.j(0, mi))
                    if self.reussi(jour):
                        haut = mi
                    else:
                        bas = mi + 1
                t_v = bas
                self.histo[-1] = (jour, D_.j(depuis, t_v), D_.j(0, t_v))
            k = self.r.arenes.index(i) + 1
            if self.par_defi(jour):
                self.nets.add(k)
            self.badges[k], self.arrivee, self.histo = jour, None, []
            gagnes.append((k, self.r.lieux[i]))
            if not journee():  # sans le détail de la journée : la carte repart demain (comme avant)
                break
            t0, debut_defi = t_v, 0
        self.sanct_du_jour = []
        for i in self.r.sanct_index:
            if self.pos >= dist[i] and i not in self.sanct_faits:
                self.exploits[i] = self.exploits.get(i, 0) + (1 if j["hyper"] else 0)
                if self.exploits[i] >= SANCTUAIRE_CIBLE:
                    self.sanct_faits[i] = jour
                    self.sanct_du_jour.append(i)
        return gagnes

    def ici(self):
        return max(i for i, d in enumerate(self.r.dist) if d <= self.pos)

    def atteints(self):
        """(Pokémon du lieu actuel, Pokémon des lieux déjà traversés) : jamais ceux des lieux à venir."""
        i = self.ici()
        return self.pokemon[i], [n for liste in self.pokemon[:i] for n in liste]

    def especes(self):
        """Tous les Pokémon de la région pour ce joueur (son diplôme)."""
        return {n for liste in self.pokemon for n in liste} | self.r.champions

    def etat(self, jour):
        """Ce que l'écran montre : la carte, où l'on est, les badges, le défi en cours."""
        r, i, a = self.r, self.ici(), self.arene_suivante()
        defi = None
        if a is not None:
            arrive = self.pos >= r.dist[a]
            ep, b = self.defi(jour) if arrive else ([], 0)
            defi = {"lieu": a, "numero": r.arenes.index(a) + 1, "epreuves": [[round(x, 1) for x in vals] for vals in ep], "valeur_b": round(b, 1),
                    "arrive": arrive, "depuis": str(self.arrivee) if self.arrivee else None, "reste": round(r.dist[a] - self.pos),
                    "actifs": self.jours_actifs(jour) if arrive else 0, "max": r.arene_max}
        sanct = [{"lieu": k, "num": n, "nom": r.lieux[k]["nom"], "valeur": self.exploits.get(k, 0), "cible": SANCTUAIRE_CIBLE,
                  "atteint": self.pos >= r.dist[k], "fait": k in self.sanct_faits} for k, n in r.sanct_index.items()]
        return {"lieux": [{k: lieu[k] for k in ("nom", "x", "y", "arene", "via", "mode")} | {"dist": d, "pokemon": [n for n in liste if n not in r.champions]}  # le Pokémon du champion n'est pas « du coin »
                          for lieu, d, liste in zip(r.lieux, r.dist, self.pokemon)],
                "pos": round(self.pos, 1), "ici": i, "badges": {k: str(d) for k, d in self.badges.items()},
                "defi": defi, "sanctuaires": sanct, "velo": str(self.velo) if self.velo else None, "total": r.dist[-1], "rares": sorted(r.rares), "carte": r.carte}
