"""Le voyage dans Kanto : les points de la barre d'effort font avancer sur la carte, de Bourg Palette au Plateau Indigo
(environ 3 mois). Chaque lieu a ses Pokémon : les Poké Balls donnent surtout ceux de l'endroit où l'on est, un peu ceux
des lieux déjà traversés et de l'étape suivante. Dans une ville à arène, on s'arrête jusqu'à réussir le défi du champion
(sur les 7 derniers jours, depuis l'arrivée), ou son plan B qui se fait en marchant (6 jours sur 7 avec l'objectif du
jour) : un défi n'est jamais bloquant. Rien ne se perd : les points gagnés pendant ce temps font avancer d'un coup
après le badge. Un badge = une Hyper Ball du type du champion (espèce nouvelle) ; la Ligue = une Master Ball (légendaire).

Tout est rejoué depuis le premier jour du jeu avec les vraies données (comme les balls) : rien n'est enregistré."""
import datetime as dt

from pokedex import POKEMON

_NUM = {p["nom"]: n for n, p in POKEMON.items()}


def _n(noms):
    return [_NUM[x] for x in noms.split(", ")]


PLAN_B = ("objectif", 6, "6 jours sur 7 avec ton objectif du jour")


def _arene(champion, type_, badge, image, defi, cible, texte, plan_b=PLAN_B):
    return {"champion": champion, "type": type_, "badge": badge, "image": image, "defi": defi, "cible": cible,
            "texte": texte, "b": dict(zip(("defi", "cible", "texte"), plan_b)) if plan_b else None}


# (nom, points depuis l'étape d'avant, x, y en pixels sur l'image de la carte (CARTE), Pokémon du lieu, arène ou None)
# Les badges : images n° 1 à 8 du dépôt PokeAPI/sprites (sprites/badges/N.png), dans l'ordre des jeux.
LIEUX = [
    ("Bourg Palette", 0, 340, 722, "Bulbizarre, Salamèche, Carapuce", None),
    ("Route 1", 150, 262, 640, "Roucool, Rattata", None),
    ("Jadielle", 250, 190, 556, "Nidoran♀, Nidoran♂, Piafabec, Férosinge", None),
    ("Forêt de Jade", 300, 222, 380, "Chenipan, Chrysacier, Papilusion, Aspicot, Coconfort, Dardargnan, Pikachu", None),
    ("Argenta", 400, 195, 200, "Racaillou, Onix",
     _arene("Pierre", "Roche", "Badge Roche", 1, "etages", 35, "35 étages en 7 jours")),
    ("Route 3", 400, 508, 246, "Rondoudou, Abo, Sabelette, Herbizarre", None),
    ("Mont Sélénite", 450, 600, 140, "Nosferapti, Paras, Mélofée, Mélodelfe, Grodoudou, Amonita, Kabuto", None),
    ("Azuria", 450, 1168, 58, "Chétiflor, Mystherbe, Abra, Psykokwak, Ptitard, Carabaffe",
     _arene("Ondine", "Eau", "Badge Cascade", 2, "eau", 45, "45 min de rameur ou de natation en 7 jours")),
    ("Route 5 et Cave Taupiqueur", 400, 1006, 250, "Miaouss, Taupiqueur, Triopikeur, Mimitoss, Reptincel", None),
    ("Carmin-sur-Mer", 450, 990, 632, "Magicarpe, Tentacool, Kokiyas, Krabby, Poissirène",
     _arene("Major Bob", "Électrik", "Badge Foudre", 3, "zone20", 3, "3 jours avec 20 min en zone")),
    ("Grotte et Centrale", 500, 1298, 210, "Voltorbe, Électrode, Magnéti, Magnéton, Élektek, Machoc, Raichu", None),
    ("Lavanville", 400, 1360, 236, "Fantominus, Spectrum, Osselait, Ossatueur", None),
    ("Céladopole", 450, 720, 428,
     "Évoli, Aquali, Voltali, Pyroli, Porygon, Ortide, Rafflesia, Boustiflor, Empiflor, Saquedeneu",
     _arene("Erika", "Plante", "Badge Prisme", 4, "pas", 45000, "45 000 pas en 7 jours")),
    ("Piste cyclable", 500, 546, 640, "Doduo, Dodrio, Ronflex, Rattatac, Rapasdepic, Canarticho, Roucoups", None),
    ("Parmanie et Parc Safari", 500, 724, 822,
     "Rhinocorne, Kangourex, Tauros, Leveinard, Insécateur, Scarabrute, Minidraco, Draco, Nidorina, Nidorino, "
     "Noeunoeuf, Noadkoko, Parasect, Aéromite, Excelangue",
     _arene("Koga", "Poison", "Badge Âme", 5, "objectif", 5, "5 jours sur 7 avec l'objectif du jour", None)),
    ("Safrania", 600, 990, 428, "Kicklee, Tygnon, Lippoutou, M. Mime, Soporifik, Hypnomade, Lokhlass, Kadabra",
     _arene("Morgane", "Psy", "Badge Marais", 6, "force", 2, "2 séances de muscu (pompes, tractions, rameur…)")),
    ("Îles Écume", 600, 532, 992,
     "Otaria, Lamantine, Stari, Staross, Hypotrempe, Hypocéan, Poissoroy, Crustabri, Tentacruel, Akwakwak, Têtarte, "
     "Krabboss, Ramoloss", None),
    ("Cramois'Île", 500, 186, 940,
     "Ponyta, Galopa, Goupix, Feunard, Caninos, Arcanin, Magmar, Tadmorv, Grotadmorv, Smogo, Smogogo, Métamorph, "
     "Ptéra, Amonistar, Kabutops",
     _arene("Auguste", "Feu", "Badge Volcan", 7, "zone", 120, "120 min en zone en 7 jours")),
    ("Jadielle (retour)", 700, 190, 556, "Rhinoféros, Nidoqueen, Nidoking, Sablaireau, Persian, Colossinge",
     _arene("Giovanni", "Sol", "Badge Terre", 8, "pas", 60000, "60 000 pas en 7 jours")),
    ("Route Victoire", 500, 375, 395, "Machopeur, Mackogneur, Gravalanch, Grolem, Nosferalto, Arbok, Tartard, Alakazam",
     None),
    ("Plateau Indigo", 500, 105, 104,
     "Dracolosse, Léviator, Ectoplasma, Flagadoss, Florizarre, Dracaufeu, Tortank, Roucarnage",
     _arene("Conseil 4", None, "Ligue Pokémon", None, "super", 4, "4 jours avec l'objectif double (Super Ball) en 7 jours",
            ("objectif", 7, "7 jours sur 7 avec ton objectif du jour"))),
]
# La carte : pixel art 16 bits généré par Kiki avec ChatGPT (28/10), même style pour toutes les régions (prompt dans
# CLAUDE.md) ; servie depuis ce dépôt public (dossier cartes/)
CARTE = {"image": "cartes/kanto.webp", "largeur": 1448, "hauteur": 1086}
LIEUX = [{"nom": nom, "x": x, "y": y, "pokemon": _n(pk), "arene": ar, "pas": d} for nom, d, x, y, pk, ar in LIEUX]
DIST = []  # points cumulés pour atteindre chaque lieu
for _l in LIEUX:
    DIST.append((DIST[-1] if DIST else 0) + _l["pas"])
ARENES = [i for i, l in enumerate(LIEUX) if l["arene"]]  # la dernière = la Ligue

_hors = set(POKEMON) - {n for l in LIEUX for n in l["pokemon"]} - {144, 145, 146, 150, 151}
assert not _hors, f"Pokémon sans lieu : {_hors}"

# Les Pokémon rares (⭐) : 3 fois moins de chances que les autres Pokémon de leur lieu
RARES = set(_n("Pikachu, Évoli, Porygon, Minidraco, Draco, Dracolosse, Lokhlass, Ronflex, Insécateur, Scarabrute, "
               "Leveinard, Kangourex, Tauros, Métamorph, Ptéra, Amonita, Kabuto, Lippoutou, M. Mime, Élektek, Magmar, "
               "Kicklee, Tygnon, Excelangue, Onix, Saquedeneu, Noadkoko, Léviator"))

DEFIS = {  # défi -> (valeur d'une journée, unité)
    "etages": (lambda j: j["etages"], "étages"),
    "eau": (lambda j: j["eau"], "min"),
    "zone20": (lambda j: j["zone"] >= 20, "jours"),
    "pas": (lambda j: j["pas"], "pas"),
    "objectif": (lambda j: j["ok"], "jours"),
    "force": (lambda j: j["force"], "séances"),
    "zone": (lambda j: j["zone"], "min"),
    "super": (lambda j: j["super"], "jours"),
}


class Voyage:
    """L'état du voyage, mis à jour jour après jour par pokemon.jouer."""

    def __init__(self):
        self.badges = {}      # numéro d'arène (1 à 9, 9 = Ligue) -> date du badge
        self.arrivee = None   # date d'arrivée à l'arène en cours
        self.histo = []       # (date, chiffres du jour) : pour les défis
        self.pos = 0.0

    def arene_suivante(self):
        """Index (dans LIEUX) de la prochaine arène à gagner, ou None (Ligue gagnée)."""
        return next((i for k, i in enumerate(ARENES, 1) if k not in self.badges), None)

    def defi(self, jour):
        """[(valeur, cible)] du défi de l'arène où l'on est arrivé et de son plan B, sur les 7 derniers jours depuis
        l'arrivée."""
        a = LIEUX[self.arene_suivante()]["arene"]
        depuis = max(self.arrivee or jour, jour - dt.timedelta(days=6))
        return [(sum(float(DEFIS[d["defi"]][0](j)) for x, j in self.histo if depuis <= x <= jour), d["cible"])
                for d in (a, a["b"]) if d]

    def avancer(self, jour, j, cumul):
        """Un jour de plus : j = chiffres du jour, cumul = points d'effort depuis le début. -> [(numéro, arène)] des
        badges gagnés ce jour-là."""
        self.histo = [(d, x) for d, x in self.histo if d > jour - dt.timedelta(days=7)] + [(jour, j)]
        gagnes = []
        while True:
            i = self.arene_suivante()
            if i is None:
                self.pos = min(cumul, DIST[-1])
                break
            self.pos = min(cumul, DIST[i])
            if cumul < DIST[i]:
                break
            self.arrivee = self.arrivee or jour
            if all(valeur < cible for valeur, cible in self.defi(jour)):
                break
            k = ARENES.index(i) + 1
            self.badges[k], self.arrivee = jour, None
            gagnes.append((k, LIEUX[i]))
        return gagnes

    def ici(self):
        return max(i for i, d in enumerate(DIST) if d <= self.pos)

    def poids(self):
        """Pokémon -> poids au tirage : le lieu actuel surtout, puis les lieux traversés et l'étape suivante ; les rares
        3 fois moins."""
        i, p = self.ici(), {}
        for k, l in enumerate(LIEUX[:i + 2]):
            for n in l["pokemon"]:
                p[n] = max(p.get(n, 0), (6 if k == i else 2 if k < i else 1) / (3 if n in RARES else 1))
        return p

    def etat(self, jour):
        """Ce que l'écran montre : la carte, où l'on est, les badges, le défi en cours."""
        i, a = self.ici(), self.arene_suivante()
        defi = None
        if a is not None:
            ar = LIEUX[a]["arene"]
            arrive = self.pos >= DIST[a]
            valeurs = [v for v, _ in self.defi(jour)] if arrive else [0, 0]
            defi = {"lieu": a, "numero": ARENES.index(a) + 1, "valeur": round(valeurs[0], 1), "unite": DEFIS[ar["defi"]][1],
                    "valeur_b": round(valeurs[1], 1) if ar["b"] else None,
                    "arrive": arrive, "depuis": str(self.arrivee) if self.arrivee else None, "reste": round(DIST[a] - self.pos)}
        return {"lieux": [{k: l[k] for k in ("nom", "x", "y", "pokemon", "arene")} | {"dist": d}
                          for l, d in zip(LIEUX, DIST)],
                "pos": round(self.pos, 1), "ici": i, "badges": {k: str(d) for k, d in self.badges.items()},
                "defi": defi, "total": DIST[-1], "rares": sorted(RARES), "carte": CARTE}
