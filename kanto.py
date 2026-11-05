"""Kanto, la première région, un prélude (Kiki, 05/11) : de Bourg Palette au Plateau Indigo en 2 000 points, 2 mois au plus en jouant normalement. On y attrape le
moins de Pokémon possible : 74 sauvages, les 72 autres sont gardés pour les régions suivantes (POUR_PLUS_TARD), pour qu'il reste de quoi se faire plaisir sur toute
l'aventure. Les règles du voyage sont dans region.py. Mewtwo : la Ligue ; Mew : le diplôme, quand on a les 74 ; trois sanctuaires (oiseaux)."""
import random

from region import arene as _arene, numeros, plan_b as _plan_b, Region, voie as _o

# (nom, points depuis l'étape d'avant, x, y en pixels sur l'image de la carte (CARTE), Pokémon du lieu, arène ou None)
# Les badges : images n° 1 à 8 du dépôt PokeAPI/sprites (sprites/badges/N.png), dans l'ordre des jeux.
LIEUX = [
    ("Bourg Palette", 0, 328, 775, "", None),  # pas de sauvage : les starters sont plus loin (comme dans les jeux)
    ("Route 1", 30, 300, 698, "Roucool, Rattata", None),
    ("Jadielle", 54, 240, 652, "Nidoran♀, Nidoran♂, Piafabec, Férosinge", None),
    ("Forêt de Jade", 66, 240, 450, "Chenipan, Chrysacier, Papilusion, Aspicot, Coconfort, Dardargnan, Pikachu", None),
    ("Argenta", 89, 245, 262, "Racaillou, Onix",
     _arene("Pierre", "Roche", "Badge Roche", 1, [_o("etages", 35, "35 étages en une journée"), _o("pompes", 30, "30 pompes")], _plan_b(3))),
    ("Route 3", 89, 420, 299, "Rondoudou, Abo", None),
    ("Mont Sélénite", 100, 615, 193, "Nosferapti, Paras, Grodoudou, Amonita, Kabuto", None),
    ("Azuria", 100, 968, 192, "Chétiflor, Boustiflor, Poissirène",
     _arene("Ondine", "Eau", "Badge Cascade", 2, [_o("eau", 20, "20 min de rameur ou de natation"), _o("km", 5, "5 km en une journée")], _plan_b(3))),
    ("Route 5 et Cave Taupiqueur", 89, 985, 340, "Miaouss, Taupiqueur, Triopikeur", None),
    ("Carmin-sur-Mer", 100, 850, 815, "Tentacool, Krabby",
     _arene("Major Bob", "Électrik", "Badge Foudre", 3, [_o("sport_jour", 15, "15 min de sport en une journée")], _plan_b(4))),
    ("Grotte et Centrale", 111, 1266, 300, "Voltorbe, Électrode, Raichu", None),
    ("Lavanville", 89, 1325, 352, "Osselait, Ossatueur", None),
    ("Céladopole", 100, 755, 537,
     "Porygon, Empiflor, Saquedeneu",
     _arene("Erika", "Plante", "Badge Prisme", 4, [_o("pas_jour", 8000, "8 000 pas en une journée")], _plan_b(4))),
    ("Piste cyclable", 111, 523, 690, "Doduo, Dodrio, Rattatac, Rapasdepic, Canarticho, Roucoups", None),
    ("Parmanie et Parc Safari", 111, 1118, 848,
     "Nidorina, Nidorino, Noeunoeuf, Noadkoko, Parasect, Excelangue",
     _arene("Koga", "Poison", "Badge Âme", 5, [_o("soir", 2000, "2 000 pas après 20 h"), _o("pompes", 60, "60 pompes")], _plan_b(4))),
    ("Safrania", 134, 985, 512, "Kicklee, Tygnon, Soporifik, Hypnomade",
     _arene("Morgane", "Psy", "Badge Marais", 6, [_o("seance", 20, "Une séance de 20 min : yoga, étirements, ce que tu veux")], _plan_b(4))),
    ("Îles Écume", 134, 540, 1008,
     "Otaria, Lamantine, Hypotrempe, Hypocéan, Poissoroy, Tentacruel, Krabboss", None),
    ("Cramois'Île", 111, 150, 975,
     "Tadmorv, Grotadmorv, Amonistar, Kabutops",
     _arene("Auguste", "Feu", "Badge Volcan", 7, [_o("sport_jour", 30, "30 min de sport en une journée")], _plan_b(4))),
    ("Jadielle (retour)", 154, 240, 652, "Nidoqueen, Nidoking, Persian, Colossinge",
     _arene("Giovanni", "Sol", "Badge Terre", 8, [_o("force", 20, "20 min de muscu ou de rameur en une journée"), _o("pompes", 80, "80 pompes"), _o("tractions", 25, "25 tractions")], _plan_b(4))),
    ("Route Victoire", 111, 161, 232, "Gravalanch, Nosferalto, Arbok",
     None),
    ("Plateau Indigo", 117, 102, 92,
     "Roucarnage, Grolem",
     _arene("Conseil 4", None, "Ligue Pokémon", None, None, _plan_b(5), [
         ("Olga", [_o("pas_jour", 10000, "10 000 pas en une journée")]),
         ("Aldo", [_o("force", 20, "20 min de muscu ou de rameur en une journée"), _o("pompes", 60, "60 pompes"), _o("tractions", 20, "20 tractions")]),
         ("Agatha", [_o("etages", 40, "40 étages en une journée"), _o("pompes", 60, "60 pompes")]),
         ("Peter", [_o("seance", 45, "Une séance de 45 min")]),
         ("Régis", [_o("complet", 1, "Une journée complète : 5 000 pas et 10 min de sport")])])),
]
# La carte : pixel art 16 bits généré par Kiki avec ChatGPT (2e version du 29/10, plus fidèle : Plateau Indigo, volcan de
# Cramois'Île, Piste cyclable sur pilotis), servie depuis ce dépôt public (dossier cartes/). Deux bouts de route ajoutés
# par Claude avec des morceaux de la carte (Route 3 vers le Mont Sélénite, ponton de Céladopole à la Piste cyclable).
# zoom = combien de fois l'écran la carte est affichée (on voit le coin du dresseur, on fait glisser pour le reste ;
# « Toute la carte » = 1) : à régler pour chaque région, pour que villes et dresseur aient la même taille partout.
CARTE = {"region": "Kanto", "image": "cartes/kanto.webp?v=2", "largeur": 1448, "hauteur": 1086, "zoom": 2}
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

# Les sanctuaires (oiseaux légendaires), lieu -> Pokémon : un défi cumulé depuis qu'on l'a atteint, qui ne bloque jamais.
SANCTUAIRES = {"Grotte et Centrale": 145, "Îles Écume": 144, "Route Victoire": 146}
# Les Pokémon rares (⭐) : 3 fois moins de chances que les autres Pokémon de leur lieu
_RARES = ("Pikachu, Évoli, Porygon, Minidraco, Draco, Dracolosse, Lokhlass, Ronflex, Insécateur, Scarabrute, "
          "Leveinard, Kangourex, Tauros, Métamorph, Ptéra, Amonita, Kabuto, Lippoutou, M. Mime, Élektek, Magmar, "
          "Kicklee, Tygnon, Excelangue, Onix, Saquedeneu, Noadkoko, Léviator, Bulbizarre, Salamèche, Carapuce")

# Gardés pour plus tard (Kiki, 05/11), région -> Pokémon, chacun vérifié dans les vrais jeux (Bulbapedia, cerveau : projets/sante/disponibilite-pokemon/). Johto les a déjà ;
# les autres sont à placer en construisant leur région. Les starters de Kanto reviennent à Kalos, comme dans X et Y (sauf celui du joueur, qui évolue).
POUR_PLUS_TARD = {
    "Johto": "Goupix, Feunard, Caninos, Arcanin, Insécateur, Lippoutou, Élektek, Magmar, Scarabrute, Tauros, Lokhlass, Évoli, Aquali, Voltali, Pyroli, Ramoloss, Flagadoss, Kokiyas, Crustabri",
    "Hoenn": "Mystherbe, Ortide, Rafflesia, Abra, Kadabra, Alakazam, Magicarpe, Léviator, Sabelette, Sablaireau, Psykokwak, Akwakwak, Rhinocorne, Rhinoféros, Stari, Staross",
    "Sinnoh": "Machoc, Machopeur, Mackogneur, Fantominus, Spectrum, Ectoplasma, Ronflex, Magnéti, Magnéton",
    "Unys": "Minidraco, Draco, Dracolosse",
    "Kalos": "Bulbizarre, Herbizarre, Florizarre, Salamèche, Reptincel, Dracaufeu, Carapuce, Carabaffe, Tortank, Ptéra, Kangourex",
    "Alola": "Mélofée, Mélodelfe, Métamorph, Leveinard",
    "Galar": "Ponyta, Galopa, M. Mime, Smogo, Smogogo",
    "Paldea": "Mimitoss, Aéromite, Ptitard, Têtarte, Tartard",
}
REPORTES = [n for noms in POUR_PLUS_TARD.values() for n in numeros(noms)]

# Pour que deux joueurs ne finissent pas Kanto avec exactement les mêmes Pokémon (Kiki, 05/11) : chacun a 6 Pokémon de plus, pris parmi ceux gardés pour plus tard (jamais
# les starters), et 6 de moins, propres à lui, tirés sur son identifiant. Ceux qu'il n'a pas ici reviennent ensuite : à Johto (rattrapage) ou dans leur région. Aucun n'est perdu.
# Là où chacun apparaît alors à Kanto, lieu -> Pokémon (sa place d'origine dans la région).
SURPRISES = {
    "Route 3": "Sabelette", "Mont Sélénite": "Mélofée, Mélodelfe", "Azuria": "Mystherbe, Abra, Psykokwak, Ptitard", "Route 5 et Cave Taupiqueur": "Mimitoss",
    "Carmin-sur-Mer": "Magicarpe, Kokiyas", "Grotte et Centrale": "Magnéti, Magnéton, Élektek, Machoc", "Lavanville": "Fantominus, Spectrum",
    "Céladopole": "Évoli, Aquali, Voltali, Pyroli, Ortide, Rafflesia", "Piste cyclable": "Ronflex",
    "Parmanie et Parc Safari": "Rhinocorne, Kangourex, Tauros, Leveinard, Insécateur, Scarabrute, Minidraco, Draco, Aéromite", "Safrania": "Lippoutou, M. Mime, Lokhlass, Kadabra",
    "Îles Écume": "Stari, Staross, Crustabri, Akwakwak, Têtarte, Ramoloss", "Cramois'Île": "Ponyta, Galopa, Goupix, Feunard, Caninos, Arcanin, Magmar, Smogo, Smogogo, Métamorph, Ptéra",
    "Jadielle (retour)": "Rhinoféros, Sablaireau", "Route Victoire": "Machopeur, Mackogneur, Tartard, Alakazam", "Plateau Indigo": "Dracolosse, Léviator, Ectoplasma, Flagadoss",
}
NB_SURPRISES = 6
_MINI_LIEU = 2  # un lieu garde au moins 2 Pokémon


def variante(graine):
    """Les Pokémon de chaque lieu de Kanto pour ce joueur : toujours les mêmes pour lui, différents d'un joueur à l'autre."""
    rng = random.Random(f"kanto-{graine}")
    listes = [list(lieu["pokemon"]) for lieu in REGION.lieux]
    index = {lieu["nom"]: i for i, lieu in enumerate(REGION.lieux)}
    possibles = sorted((n, index[nom]) for nom, noms in SURPRISES.items() for n in numeros(noms))
    for n, i in rng.sample(possibles, NB_SURPRISES):
        listes[i].append(n)
    retirables = sorted((n, i) for i, liste in enumerate(listes) for n in liste if n in REGION.especes)
    rng.shuffle(retirables)
    retires = 0
    for n, i in retirables:
        if retires < NB_SURPRISES and len(listes[i]) > _MINI_LIEU:
            listes[i].remove(n)
            retires += 1
    return listes


REGION = Region("Kanto", range(1, 152), [144, 145, 146, 150, 151], LIEUX, CARTE, VIA, MODES, SANCTUAIRES, _RARES, [1, 4, 7], 150, 151,
                ("chen", "🎁 Cadeau du Professeur Chen"), "diplome", "🎓 Diplôme du Professeur Chen", arene_max=3, reportes=REPORTES, variante=variante)
LIEUX, DIST, ARENES, SANCT_INDEX, RARES = REGION.lieux, REGION.dist, REGION.arenes, REGION.sanct_index, REGION.rares
REGION.rival = {"Route 3": "rival-k1-route", "Azuria": "rival-k2-pont", "Carmin-sur-Mer": "rival-k3-navire", "Route Victoire": "rival-k4-victoire"}
