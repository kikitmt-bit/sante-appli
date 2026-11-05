"""Johto, la deuxième région : un Japon d'autrefois en automne (2 500 points, un peu plus longue que Kanto). Les règles du voyage sont dans region.py.
Liste des lieux validée par Kiki le 04/11 (carte blanche) ; Jasmine avant Chuck pour éviter un aller-retour, la Ferme avant Rosalia pour suivre la route de la carte. Ho-Oh : la Ligue ; Celebi : le diplôme,
quand on a les 113 autres, dont 19 Pokémon gardés de Kanto ; quatre sanctuaires (Raikou, Entei, Suicune, Lugia). Les défis changent d'un champion à l'autre : jamais de sommeil ni d'heure de coucher."""
from region import arene as _arene, numeros, plan_b as _plan_b, Region, voie as _o

# (nom, points depuis l'étape d'avant, x, y en pixels sur l'image de la carte (CARTE), Pokémon du lieu, arène ou None)
# Les badges : images n° 9 à 16 du dépôt PokeAPI/sprites (sprites/badges/N.png).
LIEUX = [
    ("Bourg Geon", 0, 1207, 605, "", None),  # pas de sauvage : les starters sont plus loin (comme à Kanto)
    ("Route 29", 36, 1285, 470, "Fouinette, Hoothoot, Coxy, Mimigal", None),
    ("Ville Griotte", 68, 1350, 442, "Rémoraid, Loupio, Wattouat", None),
    ("Mauville", 193, 1215, 148, "Granivol, Tournegrin, Marill, Pichu",
     _arene("Albert", "Vol", "Badge Zéphyr", 9, [_o("etages", 40, "40 étages en une journée"), _o("km", 6, "6 km en une journée")], _plan_b(3))),
    ("Ruines d'Alpha", 107, 1150, 205, "Zarbi, Natu, Insolourdo", None),
    ("Caves Jumelles", 125, 1035, 622, "Axoloto, Toudoudou, Phanpy, Scorplane, Lokhlass", None),
    ("Écorcia", 129, 450, 558, "Pomdepik, Scarhino, Yanma, Germignon, Héricendre, Ramoloss, Flagadoss",
     _arene("Hector", "Insecte", "Badge Essaim", 10, [_o("pas_jour", 9000, "9 000 pas en une journée")], _plan_b(3))),
    ("Bois aux Chênes", 111, 350, 470, "Capumain, Coxyclaque, Migalos, Togepi, Simularbre", None),
    ("Doublonville", 125, 800, 542, "Snubbull, Écrémeuh, Queulorior, Kaiminus, Mélo, Macronium, Évoli",
     _arene("Blanche", "Normal", "Badge Plaine", 11, [_o("sport_jour", 20, "20 min de sport en une journée")], _plan_b(4))),
    ("Parc Naturel", 143, 655, 472, "Floravol, Héliatronc, Girafarig, Joliflor, Feurisson, Insécateur, Scarabrute, Caninos, Arcanin", None),
    ("Ferme de la Route 39", 125, 625, 650, "Granbull, Leuphorie, Lainergie, Crocrodil, Togetic, Cerfrousse, Tauros", None),
    ("Rosalia", 161, 850, 692, "Feuforêve, Mentali, Noctali, Aquali, Voltali, Pyroli, Cornèbre, Noarfang, Fouinar, Goupix, Feunard",
     _arene("Mortimer", "Spectre", "Badge Brume", 12, [_o("soir", 3000, "3 000 pas après 20 h"), _o("seance", 30, "Une séance de 30 min")], _plan_b(4))),
    ("Oliville", 225, 545, 797, "Lanturn, Qwilfish, Octillery, Corayon, Azumarill, Foretress, Kokiyas, Crustabri",
     _arene("Jasmine", "Acier", "Badge Minéral", 14, [_o("seance", 40, "Une séance de 40 min")], _plan_b(4))),
    ("Irisia", 168, 530, 985, "Debugant, Kapoera, Tarpaud, Maraiste, Caratroc",
     _arene("Chuck", "Combat", "Badge Choc", 13, [_o("pompes", 100, "100 pompes"), _o("tractions", 30, "30 tractions"), _o("force", 30, "30 min de muscu ou de rameur en une journée")], _plan_b(4))),
    ("Tourb'Îles", 118, 1245, 895, "Roigada, Démanta, Xatu, Cotovol, Hyporoi", None),
    ("Mont Creuset", 96, 1282, 425, "Teddiursa, Ursaring, Limagma, Volcaropod, Magby, Magmar, Steelix", None),
    ("Acajou", 93, 945, 362, "Marcacrin, Cochignon, Malosse, Démolosse, Élekid, Élektek",
     _arene("Frédo", "Glace", "Badge Glacier", 15, [_o("eau", 30, "30 min de rameur ou de natation"), _o("km", 8, "8 km en une journée")], _plan_b(4))),
    ("Lac Colère", 96, 880, 238, "Qulbutoké, Pharamp, Cizayox, Nostenfer", None),
    ("Route de Glace", 96, 572, 190, "Farfuret, Lippouti, Lippoutou, Cadoizo", None),
    ("Ébènelle", 139, 262, 236, "Donphan, Airmure, Embrylex, Ymphect",
     _arene("Sandra", "Dragon", "Badge Lever", 16, [_o("sport_jour", 40, "40 min de sport en une journée"), _o("pas_jour", 12000, "12 000 pas en une journée")], _plan_b(4))),
    ("Plateau de la Ligue", 146, 55, 65, "Méganium, Typhlosion, Aligatueur, Tyranocif, Porygon2",
     _arene("Conseil 4", None, "Ligue Pokémon", None, None, _plan_b(5), [
         ("Clément", [_o("seance", 45, "Une séance de 45 min")]),
         ("Koga", [_o("soir", 3000, "3 000 pas après 20 h"), _o("pompes", 80, "80 pompes")]),
         ("Aldo", [_o("force", 30, "30 min de muscu ou de rameur en une journée"), _o("pompes", 80, "80 pompes"), _o("tractions", 30, "30 tractions")]),
         ("Marion", [_o("pas_jour", 12000, "12 000 pas en une journée")]),
         ("Peter", [_o("sport_jour", 40, "40 min de sport en une journée")])])),
]
# La carte : même style que Kanto (ChatGPT, Kiki, 29/10), servie depuis ce dépôt public (dossier cartes/).
CARTE = {"region": "Johto", "image": "cartes/johto.webp?v=1", "largeur": 1448, "hauteur": 1086, "zoom": 2}
# Le chemin depuis l'étape d'avant suit les routes dessinées sur la carte : points de passage (pixels de l'image)
VIA = {
    "Route 29": [(1250, 540)],
    "Ville Griotte": [(1285, 442)],
    "Mauville": [(1385, 440), (1385, 345), (1365, 265), (1310, 250), (1305, 170), (1255, 150)],
    "Ruines d'Alpha": [(1190, 150), (1190, 205)],
    "Caves Jumelles": [(1060, 265), (1040, 290), (1040, 380)],
    "Bois aux Chênes": [(352, 556)],
    "Parc Naturel": [(705, 480)],
    "Ferme de la Route 39": [(640, 478), (612, 545), (612, 650)],
    "Rosalia": [(612, 600), (612, 560), (650, 548), (800, 548), (800, 600), (840, 650)],
    "Irisia": [(545, 880), (530, 930)],
    "Mont Creuset": [(1385, 490), (1385, 445), (1282, 442)],
    "Acajou": [(1045, 375)],
    "Lac Colère": [(905, 305)],
    "Route de Glace": [(790, 305), (740, 310), (720, 355), (620, 345), (610, 240), (575, 235)],
    "Plateau de la Ligue": [(180, 236), (178, 138), (115, 133), (110, 85), (60, 78)],
}
# Pour ne pas repasser par une route déjà faite : on vole, on surfe ; « grotte » = à pied sous la montagne ; même nombre de points, seul le dessin change
MODES = {"Caves Jumelles": "grotte", "Écorcia": "vol", "Doublonville": "vol", "Oliville": "vol", "Tourb'Îles": "surf", "Mont Creuset": "surf", "Acajou": "grotte", "Lac Colère": "surf", "Ébènelle": "grotte"}
# Les sanctuaires, lieu -> Pokémon : un défi cumulé depuis qu'on l'a atteint, qui ne bloque jamais.
SANCTUAIRES = {"Rosalia": 243, "Tourb'Îles": 249, "Mont Creuset": 244, "Lac Colère": 245}
# Les Pokémon rares (⭐) : 3 fois moins de chances que les autres Pokémon de leur lieu
_RARES = ("Pichu, Togepi, Germignon, Héricendre, Kaiminus, Mélo, Feuforêve, Zarbi, Cadoizo, Scarhino, Qulbutoké, Embrylex, Ymphect, Tyranocif, Porygon2, Cizayox, "
          "Hyporoi, Airmure, Lippouti, Élekid, Magby, Simularbre, Démanta, Steelix, Queulorior, Kapoera, Mentali, Noctali, "
          "Lokhlass, Évoli, Insécateur, Scarabrute, Lippoutou, Élektek, Magmar, Tauros")

# La nouveauté de Johto (feuille de route) : le jour et la nuit. Bouger le matin ou le soir rend ces Pokémon plus fréquents ce jour-là : on varie ses heures, sans rien rater.
MOMENTS = {"matin": "Coxy, Mentali, Héliatronc, Tournegrin, Granivol, Floravol, Cotovol, Yanma, Joliflor, Wattouat, Natu",
           "soir": "Hoothoot, Noarfang, Noctali, Feuforêve, Cornèbre, Mimigal, Migalos, Malosse, Démolosse, Nostenfer, Coxyclaque"}

# Les Pokémon de Kanto gardés pour ici (kanto.POUR_PLUS_TARD), placés là où les vrais jeux de Johto les mettent : ils restent à découvrir après le prélude.
_DE_KANTO = numeros("Goupix, Feunard, Caninos, Arcanin, Insécateur, Lippoutou, Élektek, Magmar, Scarabrute, Tauros, Lokhlass, Évoli, Aquali, Voltali, Pyroli, Ramoloss, Flagadoss, Kokiyas, Crustabri")

REGION = Region("Johto", [*range(152, 252), *_DE_KANTO], [243, 244, 245, 249, 250, 251], LIEUX, CARTE, VIA, MODES, SANCTUAIRES, _RARES, [152, 155, 158], 250, 251,
                ("orme", "🎁 Cadeau du Professeur Orme"), "diplome-johto", "🎓 Diplôme du Professeur Orme", MOMENTS, arene_max=4)
REGION.rival = {"Mauville": "rival-j1-mauville", "Bois aux Chênes": "rival-j2-bois", "Rosalia": "rival-j3-rosalia", "Ébènelle": "rival-j4-antre"}
