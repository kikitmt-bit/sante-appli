"""Kanto, la première région : de Bourg Palette au Plateau Indigo (7 000 points, environ 3 mois avec les arrêts aux arènes : réglages de
l'audit du 02/11). Les règles du voyage sont dans region.py. Mewtwo : la Ligue ; Mew : le diplôme, quand on a les 146 autres ; trois sanctuaires (oiseaux)."""
from region import arene as _arene, numeros, plan_b as _plan_b, Region, voie as _o

# (nom, points depuis l'étape d'avant, x, y en pixels sur l'image de la carte (CARTE), Pokémon du lieu, arène ou None)
# Les badges : images n° 1 à 8 du dépôt PokeAPI/sprites (sprites/badges/N.png), dans l'ordre des jeux.
LIEUX = [
    ("Bourg Palette", 0, 328, 775, "", None),  # pas de sauvage : les starters sont plus loin (comme dans les jeux)
    ("Route 1", 100, 300, 698, "Roucool, Rattata", None),
    ("Jadielle", 190, 240, 652, "Nidoran♀, Nidoran♂, Piafabec, Férosinge", None),
    ("Forêt de Jade", 230, 240, 450, "Chenipan, Chrysacier, Papilusion, Aspicot, Coconfort, Dardargnan, Pikachu", None),
    ("Argenta", 310, 245, 262, "Racaillou, Onix",
     _arene("Pierre", "Roche", "Badge Roche", 1, [_o("etages", 35, "35 étages en une journée"), _o("pompes", 30, "30 pompes")], _plan_b(6))),
    ("Route 3", 310, 420, 299, "Rondoudou, Abo, Sabelette, Herbizarre", None),
    ("Mont Sélénite", 350, 615, 193, "Nosferapti, Paras, Mélofée, Mélodelfe, Grodoudou, Amonita, Kabuto", None),
    ("Azuria", 350, 968, 192, "Chétiflor, Mystherbe, Abra, Psykokwak, Ptitard, Carabaffe, Bulbizarre, Salamèche",
     _arene("Ondine", "Eau", "Badge Cascade", 2, [_o("eau", 20, "20 min de rameur ou de natation"), _o("km", 5, "5 km en une journée")], _plan_b(6))),
    ("Route 5 et Cave Taupiqueur", 310, 985, 340, "Miaouss, Taupiqueur, Triopikeur, Mimitoss, Reptincel", None),
    ("Carmin-sur-Mer", 350, 850, 815, "Magicarpe, Tentacool, Kokiyas, Krabby, Poissirène, Carapuce",
     _arene("Major Bob", "Électrik", "Badge Foudre", 3, [_o("sport_jour", 15, "15 min de sport en une journée")], _plan_b(7))),
    ("Grotte et Centrale", 390, 1266, 300, "Voltorbe, Électrode, Magnéti, Magnéton, Élektek, Machoc, Raichu", None),
    ("Lavanville", 310, 1325, 352, "Fantominus, Spectrum, Osselait, Ossatueur", None),
    ("Céladopole", 350, 755, 537,
     "Évoli, Aquali, Voltali, Pyroli, Porygon, Ortide, Rafflesia, Boustiflor, Empiflor, Saquedeneu",
     _arene("Erika", "Plante", "Badge Prisme", 4, [_o("pas_jour", 8000, "8 000 pas en une journée")], _plan_b(7))),
    ("Piste cyclable", 390, 523, 690, "Doduo, Dodrio, Ronflex, Rattatac, Rapasdepic, Canarticho, Roucoups", None),
    ("Parmanie et Parc Safari", 390, 1118, 848,
     "Rhinocorne, Kangourex, Tauros, Leveinard, Insécateur, Scarabrute, Minidraco, Draco, Nidorina, Nidorino, "
     "Noeunoeuf, Noadkoko, Parasect, Aéromite, Excelangue",
     _arene("Koga", "Poison", "Badge Âme", 5, [_o("soir", 2000, "2 000 pas après 20 h"), _o("pompes", 60, "60 pompes")], _plan_b(7))),
    ("Safrania", 470, 985, 512, "Kicklee, Tygnon, Lippoutou, M. Mime, Soporifik, Hypnomade, Lokhlass, Kadabra",
     _arene("Morgane", "Psy", "Badge Marais", 6, [_o("seance", 20, "Une séance de 20 min : yoga, étirements, ce que tu veux")], _plan_b(8))),
    ("Îles Écume", 470, 540, 1008,
     "Otaria, Lamantine, Stari, Staross, Hypotrempe, Hypocéan, Poissoroy, Crustabri, Tentacruel, Akwakwak, Têtarte, "
     "Krabboss, Ramoloss", None),
    ("Cramois'Île", 390, 150, 975,
     "Ponyta, Galopa, Goupix, Feunard, Caninos, Arcanin, Magmar, Tadmorv, Grotadmorv, Smogo, Smogogo, Métamorph, "
     "Ptéra, Amonistar, Kabutops",
     _arene("Auguste", "Feu", "Badge Volcan", 7, [_o("sport_jour", 30, "30 min de sport en une journée")], _plan_b(8))),
    ("Jadielle (retour)", 540, 240, 652, "Rhinoféros, Nidoqueen, Nidoking, Sablaireau, Persian, Colossinge",
     _arene("Giovanni", "Sol", "Badge Terre", 8, [_o("force", 20, "20 min de muscu ou de rameur en une journée"), _o("pompes", 80, "80 pompes"), _o("tractions", 25, "25 tractions")], _plan_b(9))),
    ("Route Victoire", 390, 161, 232, "Machopeur, Mackogneur, Gravalanch, Grolem, Nosferalto, Arbok, Tartard, Alakazam",
     None),
    ("Plateau Indigo", 410, 102, 92,
     "Dracolosse, Léviator, Ectoplasma, Flagadoss, Florizarre, Dracaufeu, Tortank, Roucarnage",
     _arene("Conseil 4", None, "Ligue Pokémon", None, None, _plan_b(10), [
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

REGION = Region("Kanto", range(1, 152), [144, 145, 146, 150, 151], LIEUX, CARTE, VIA, MODES, SANCTUAIRES, _RARES, [1, 4, 7], 150, 151,
                ("chen", "🎁 Cadeau du Professeur Chen"), "diplome", "🎓 Diplôme du Professeur Chen")
LIEUX, DIST, ARENES, SANCT_INDEX, RARES = REGION.lieux, REGION.dist, REGION.arenes, REGION.sanct_index, REGION.rares
