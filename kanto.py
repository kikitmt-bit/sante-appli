"""Le voyage dans Kanto : les points de la barre d'effort font avancer sur la carte, de Bourg Palette au Plateau Indigo
(7 000 points, environ 3 mois avec les arrêts aux arènes : réglages de l'audit du 02/11). Chaque lieu a ses Pokémon : on
n'attrape que dans les lieux déjà atteints (jamais ceux à venir), surtout celui où l'on est (pokemon.tirer). Dans une ville à
arène, on s'arrête jusqu'à réussir le défi du champion ou son plan B, cumulés depuis l'arrivée : rien ne se perd, et un jour
d'exploit compte double pour les défis « objectif du jour ». Pendant le défi, le dresseur reste à l'arène : les points gagnés
ne font pas avancer la carte. Un badge = une Hyper Ball du type du champion ; la Ligue = la Master Ball de Mewtwo.
Trois sanctuaires (oiseaux légendaires) se débloquent sur la route : un petit défi qui ne bloque jamais.

Tout est rejoué depuis le premier jour du jeu avec les vraies données (comme les balls) : rien n'est enregistré."""
import datetime as dt

from pokedex import POKEMON

_NUM = {p["nom"]: n for n, p in POKEMON.items()}


def _n(noms):
    return [_NUM[x] for x in noms.split(", ")] if noms else []


def _plan_b(jours):
    """Le plan B d'une arène : la difficulté monte d'arène en arène, et un jour d'exploit compte pour deux."""
    return "objectif", jours, f"{jours} jours avec ton objectif du jour (un exploit compte double)"


def _arene(champion, type_, badge, image, defi, cible, texte, plan_b):
    return {"champion": champion, "type": type_, "badge": badge, "image": image, "defi": defi, "cible": cible,
            "texte": texte, "b": dict(zip(("defi", "cible", "texte"), plan_b)) if plan_b else None}


# (nom, points depuis l'étape d'avant, x, y en pixels sur l'image de la carte (CARTE), Pokémon du lieu, arène ou None)
# Les badges : images n° 1 à 8 du dépôt PokeAPI/sprites (sprites/badges/N.png), dans l'ordre des jeux.
LIEUX = [
    ("Bourg Palette", 0, 328, 775, "", None),  # pas de sauvage : les starters sont plus loin (comme dans les jeux)
    ("Route 1", 100, 300, 698, "Roucool, Rattata", None),
    ("Jadielle", 190, 240, 652, "Nidoran♀, Nidoran♂, Piafabec, Férosinge", None),
    ("Forêt de Jade", 230, 240, 450, "Chenipan, Chrysacier, Papilusion, Aspicot, Coconfort, Dardargnan, Pikachu", None),
    ("Argenta", 310, 245, 262, "Racaillou, Onix",
     _arene("Pierre", "Roche", "Badge Roche", 1, "etages", 35, "35 étages", _plan_b(4))),
    ("Route 3", 310, 420, 299, "Rondoudou, Abo, Sabelette, Herbizarre", None),
    ("Mont Sélénite", 350, 615, 193, "Nosferapti, Paras, Mélofée, Mélodelfe, Grodoudou, Amonita, Kabuto", None),
    ("Azuria", 350, 968, 192, "Chétiflor, Mystherbe, Abra, Psykokwak, Ptitard, Carabaffe, Bulbizarre, Salamèche",
     _arene("Ondine", "Eau", "Badge Cascade", 2, "eau", 45, "45 min de rameur ou de natation", _plan_b(4))),
    ("Route 5 et Cave Taupiqueur", 310, 985, 340, "Miaouss, Taupiqueur, Triopikeur, Mimitoss, Reptincel", None),
    ("Carmin-sur-Mer", 350, 850, 815, "Magicarpe, Tentacool, Kokiyas, Krabby, Poissirène, Carapuce",
     _arene("Major Bob", "Électrik", "Badge Foudre", 3, "zone10", 3, "3 jours avec 10 min de sport", _plan_b(5))),
    ("Grotte et Centrale", 390, 1266, 300, "Voltorbe, Électrode, Magnéti, Magnéton, Élektek, Machoc, Raichu", None),
    ("Lavanville", 310, 1325, 352, "Fantominus, Spectrum, Osselait, Ossatueur", None),
    ("Céladopole", 350, 755, 537,
     "Évoli, Aquali, Voltali, Pyroli, Porygon, Ortide, Rafflesia, Boustiflor, Empiflor, Saquedeneu",
     _arene("Erika", "Plante", "Badge Prisme", 4, "pas", 45000, "45 000 pas", _plan_b(5))),
    ("Piste cyclable", 390, 523, 690, "Doduo, Dodrio, Ronflex, Rattatac, Rapasdepic, Canarticho, Roucoups", None),
    ("Parmanie et Parc Safari", 390, 1118, 848,
     "Rhinocorne, Kangourex, Tauros, Leveinard, Insécateur, Scarabrute, Minidraco, Draco, Nidorina, Nidorino, "
     "Noeunoeuf, Noadkoko, Parasect, Aéromite, Excelangue",
     _arene("Koga", "Poison", "Badge Âme", 5, "objectif", 5, "5 jours avec ton objectif du jour (un exploit compte double)", None)),
    ("Safrania", 470, 985, 512, "Kicklee, Tygnon, Lippoutou, M. Mime, Soporifik, Hypnomade, Lokhlass, Kadabra",
     _arene("Morgane", "Psy", "Badge Marais", 6, "force", 2, "2 séances de muscu (pompes, tractions, rameur…)", _plan_b(6))),
    ("Îles Écume", 470, 540, 1008,
     "Otaria, Lamantine, Stari, Staross, Hypotrempe, Hypocéan, Poissoroy, Crustabri, Tentacruel, Akwakwak, Têtarte, "
     "Krabboss, Ramoloss", None),
    ("Cramois'Île", 390, 150, 975,
     "Ponyta, Galopa, Goupix, Feunard, Caninos, Arcanin, Magmar, Tadmorv, Grotadmorv, Smogo, Smogogo, Métamorph, "
     "Ptéra, Amonistar, Kabutops",
     _arene("Auguste", "Feu", "Badge Volcan", 7, "zone", 60, "60 min de sport", _plan_b(6))),
    ("Jadielle (retour)", 540, 240, 652, "Rhinoféros, Nidoqueen, Nidoking, Sablaireau, Persian, Colossinge",
     _arene("Giovanni", "Sol", "Badge Terre", 8, "pas", 60000, "60 000 pas", _plan_b(7))),
    ("Route Victoire", 390, 161, 232, "Machopeur, Mackogneur, Gravalanch, Grolem, Nosferalto, Arbok, Tartard, Alakazam",
     None),
    ("Plateau Indigo", 410, 102, 92,
     "Dracolosse, Léviator, Ectoplasma, Flagadoss, Florizarre, Dracaufeu, Tortank, Roucarnage",
     _arene("Conseil 4", None, "Ligue Pokémon", None, "super", 4, "4 jours de Super Ball, un par membre du Conseil 4", _plan_b(7))),
]
# La carte : pixel art 16 bits généré par Kiki avec ChatGPT (2e version du 29/10, plus fidèle : Plateau Indigo, volcan de
# Cramois'Île, Piste cyclable sur pilotis), servie depuis ce dépôt public (dossier cartes/). Deux bouts de route ajoutés
# par Claude avec des morceaux de la carte (Route 3 vers le Mont Sélénite, ponton de Céladopole à la Piste cyclable).
# zoom = combien de fois l'écran la carte est affichée (on voit le coin du dresseur, on fait glisser pour le reste ;
# « Toute la carte » = 1) : à régler pour chaque région, pour que villes et dresseur aient la même taille partout.
CARTE = {"image": "cartes/kanto.webp?v=2", "largeur": 1448, "hauteur": 1086, "zoom": 2}
# Le chemin depuis l'étape d'avant suit les routes dessinées sur la carte : points de passage (pixels de l'image)
VIA = {
    "Route 1": [(327, 745), (318, 700)],
    "Jadielle": [(268, 698), (268, 657)],
    "Argenta": [(240, 285)],
    "Route 3": [(295, 275), (295, 299)],
    "Mont Sélénite": [(483, 299), (483, 338), (640, 335), (640, 243), (615, 243)],
    "Azuria": [(925, 192)],
    "Route 5 et Cave Taupiqueur": [(985, 215)],
    "Carmin-sur-Mer": [(985, 765), (930, 778), (850, 778)],
    "Lavanville": [(1266, 352)],
    "Céladopole": [(1266, 352), (1266, 505), (900, 505), (835, 505), (835, 537)],
    "Piste cyclable": [(711, 537), (711, 515), (523, 515)],
    "Parmanie et Parc Safari": [(523, 812), (850, 812), (850, 830), (1060, 830)],
    "Cramois'Île": [(470, 1060), (172, 1062), (172, 1000)],
    "Route Victoire": [(240, 285), (161, 282)],
    "Plateau Indigo": [(161, 183), (102, 183)],
}
# Pour ne pas repasser par une route déjà faite : on vole (CS Vol, arc) ou on surfe (CS Surf) ; « grotte » = à pied
# sous la montagne (tirets) ; même nombre de points, seul le dessin change
MODES = {"Azuria": "grotte", "Grotte et Centrale": "vol", "Safrania": "vol", "Îles Écume": "vol", "Cramois'Île": "surf",
         "Jadielle (retour)": "vol"}
LIEUX = [{"nom": nom, "x": x, "y": y, "pokemon": _n(pk), "arene": ar, "pas": d, "via": VIA.get(nom, []),
          "mode": MODES.get(nom, "route")} for nom, d, x, y, pk, ar in LIEUX]
DIST = []  # points cumulés pour atteindre chaque lieu
for _l in LIEUX:
    DIST.append((DIST[-1] if DIST else 0) + _l["pas"])
ARENES = [i for i, l in enumerate(LIEUX) if l["arene"]]  # la dernière = la Ligue

_hors = set(POKEMON) - {n for l in LIEUX for n in l["pokemon"]} - {144, 145, 146, 150, 151}
assert not _hors, f"Pokémon sans lieu : {_hors}"

# Les sanctuaires (oiseaux légendaires), lieu -> Pokémon : un défi cumulé depuis qu'on l'a atteint, qui ne bloque jamais.
# Mewtwo : la Ligue ; Mew : le diplôme, quand on a les 146 autres (pokemon.jouer).
SANCTUAIRES = {"Grotte et Centrale": 145, "Îles Écume": 144, "Route Victoire": 146}
SANCTUAIRE_CIBLE = 5  # jours d'exploit
SANCT_INDEX = {i: SANCTUAIRES[l["nom"]] for i, l in enumerate(LIEUX) if l["nom"] in SANCTUAIRES}

# Les Pokémon rares (⭐) : 3 fois moins de chances que les autres Pokémon de leur lieu
RARES = set(_n("Pikachu, Évoli, Porygon, Minidraco, Draco, Dracolosse, Lokhlass, Ronflex, Insécateur, Scarabrute, "
               "Leveinard, Kangourex, Tauros, Métamorph, Ptéra, Amonita, Kabuto, Lippoutou, M. Mime, Élektek, Magmar, "
               "Kicklee, Tygnon, Excelangue, Onix, Saquedeneu, Noadkoko, Léviator, Bulbizarre, Salamèche, Carapuce"))

DEFIS = {  # défi -> (valeur d'une journée, unité)
    "etages": (lambda j: j["etages"], "étages"),
    "eau": (lambda j: j["eau"], "min"),
    "zone10": (lambda j: j["zone"] >= 10, "jours"),  # minutes de sport (jaune / rouge) depuis le 01/11
    "pas": (lambda j: j["pas"], "pas"),
    "objectif": (lambda j: 2 if j["hyper"] else j["ok"], "jours"),  # un jour d'exploit compte double
    "force": (lambda j: j["force"], "séances"),
    "zone": (lambda j: j["zone"], "min"),
    "super": (lambda j: j["super"], "jours"),
}


class Voyage:
    """L'état du voyage, mis à jour jour après jour par pokemon.jouer."""

    def __init__(self):
        self.badges = {}      # numéro d'arène (1 à 9, 9 = Ligue) -> date du badge
        self.arrivee = None   # date d'arrivée à l'arène en cours
        self.histo = []       # (date, chiffres du jour) depuis l'arrivée à l'arène : pour les défis
        self.pos = 0.0
        self.cumul = 0.0      # les points d'effort vus jusqu'ici (pour n'ajouter que ceux du jour)
        self.exploits = {}    # lieu d'un sanctuaire atteint -> jours d'exploit depuis
        self.sanct_faits = {}  # lieu d'un sanctuaire réussi -> date
        self.sanct_du_jour = []  # les sanctuaires réussis aujourd'hui

    def arene_suivante(self):
        """Index (dans LIEUX) de la prochaine arène à gagner, ou None (Ligue gagnée)."""
        return next((i for k, i in enumerate(ARENES, 1) if k not in self.badges), None)

    def defi(self, jour):
        """[(valeur, cible)] du défi de l'arène où l'on est arrivé et de son plan B, cumulés depuis l'arrivée."""
        a = LIEUX[self.arene_suivante()]["arene"]
        return [(sum(float(DEFIS[d["defi"]][0](j)) for x, j in self.histo if x <= jour), d["cible"])
                for d in (a, a["b"]) if d]

    def avancer(self, jour, j, cumul):
        """Un jour de plus : j = chiffres du jour, cumul = points d'effort depuis le début. -> [(numéro, arène)] des
        badges gagnés ce jour-là ; self.sanct_du_jour = les sanctuaires réussis ce jour-là."""
        gagnes, gain, self.cumul = [], max(cumul - self.cumul, 0), cumul
        while True:
            i = self.arene_suivante()
            if i is None:
                self.pos = min(self.pos + gain, DIST[-1])
                break
            # on avance, mais jamais au-delà de l'arène tant que son badge n'est pas gagné (le reste est perdu pour la carte)
            self.pos, gain = min(self.pos + gain, DIST[i]), 0
            if self.pos < DIST[i]:
                break
            if not self.arrivee:
                self.arrivee, self.histo = jour, []
            if not self.histo or self.histo[-1][0] != jour:
                self.histo.append((jour, j))
            if all(valeur < cible for valeur, cible in self.defi(jour)):
                break
            k = ARENES.index(i) + 1
            self.badges[k], self.arrivee, self.histo = jour, None, []
            gagnes.append((k, LIEUX[i]))
        self.sanct_du_jour = []
        for i in SANCT_INDEX:
            if self.pos >= DIST[i] and i not in self.sanct_faits:
                self.exploits[i] = self.exploits.get(i, 0) + (1 if j["hyper"] else 0)
                if self.exploits[i] >= SANCTUAIRE_CIBLE:
                    self.sanct_faits[i] = jour
                    self.sanct_du_jour.append(i)
        return gagnes

    def ici(self):
        return max(i for i, d in enumerate(DIST) if d <= self.pos)

    def atteints(self):
        """(Pokémon du lieu actuel, Pokémon des lieux déjà traversés) : jamais ceux des lieux à venir."""
        i = self.ici()
        return LIEUX[i]["pokemon"], [n for l in LIEUX[:i] for n in l["pokemon"]]

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
        sanct = [{"lieu": i, "num": n, "nom": LIEUX[i]["nom"], "valeur": self.exploits.get(i, 0), "cible": SANCTUAIRE_CIBLE,
                  "atteint": self.pos >= DIST[i], "fait": i in self.sanct_faits} for i, n in SANCT_INDEX.items()]
        return {"lieux": [{k: l[k] for k in ("nom", "x", "y", "pokemon", "arene", "via", "mode")} | {"dist": d}
                          for l, d in zip(LIEUX, DIST)],
                "pos": round(self.pos, 1), "ici": i, "badges": {k: str(d) for k, d in self.badges.items()},
                "defi": defi, "sanctuaires": sanct, "total": DIST[-1], "rares": sorted(RARES), "carte": CARTE}
