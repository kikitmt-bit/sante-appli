"""Les Pokémon des régions du jeu (Kanto : 1 à 151, Johto : 152 à 251) : numéro, nom français, types (types actuels : Mélofée est Fée, Magnéti Acier…).
Les images sont dans le dépôt privé (branche « sprites »), jamais ici."""

_LISTE = """
Bulbizarre:Plante/Poison Herbizarre:Plante/Poison Florizarre:Plante/Poison Salamèche:Feu Reptincel:Feu
Dracaufeu:Feu/Vol Carapuce:Eau Carabaffe:Eau Tortank:Eau Chenipan:Insecte Chrysacier:Insecte Papilusion:Insecte/Vol
Aspicot:Insecte/Poison Coconfort:Insecte/Poison Dardargnan:Insecte/Poison Roucool:Normal/Vol Roucoups:Normal/Vol
Roucarnage:Normal/Vol Rattata:Normal Rattatac:Normal Piafabec:Normal/Vol Rapasdepic:Normal/Vol Abo:Poison Arbok:Poison
Pikachu:Électrik Raichu:Électrik Sabelette:Sol Sablaireau:Sol Nidoran♀:Poison Nidorina:Poison Nidoqueen:Poison/Sol
Nidoran♂:Poison Nidorino:Poison Nidoking:Poison/Sol Mélofée:Fée Mélodelfe:Fée Goupix:Feu Feunard:Feu
Rondoudou:Normal/Fée Grodoudou:Normal/Fée Nosferapti:Poison/Vol Nosferalto:Poison/Vol Mystherbe:Plante/Poison
Ortide:Plante/Poison Rafflesia:Plante/Poison Paras:Insecte/Plante Parasect:Insecte/Plante Mimitoss:Insecte/Poison
Aéromite:Insecte/Poison Taupiqueur:Sol Triopikeur:Sol Miaouss:Normal Persian:Normal Psykokwak:Eau Akwakwak:Eau
Férosinge:Combat Colossinge:Combat Caninos:Feu Arcanin:Feu Ptitard:Eau Têtarte:Eau Tartard:Eau/Combat Abra:Psy
Kadabra:Psy Alakazam:Psy Machoc:Combat Machopeur:Combat Mackogneur:Combat Chétiflor:Plante/Poison
Boustiflor:Plante/Poison Empiflor:Plante/Poison Tentacool:Eau/Poison Tentacruel:Eau/Poison Racaillou:Roche/Sol
Gravalanch:Roche/Sol Grolem:Roche/Sol Ponyta:Feu Galopa:Feu Ramoloss:Eau/Psy Flagadoss:Eau/Psy Magnéti:Électrik/Acier
Magnéton:Électrik/Acier Canarticho:Normal/Vol Doduo:Normal/Vol Dodrio:Normal/Vol Otaria:Eau Lamantine:Eau/Glace
Tadmorv:Poison Grotadmorv:Poison Kokiyas:Eau Crustabri:Eau/Glace Fantominus:Spectre/Poison Spectrum:Spectre/Poison
Ectoplasma:Spectre/Poison Onix:Roche/Sol Soporifik:Psy Hypnomade:Psy Krabby:Eau Krabboss:Eau Voltorbe:Électrik
Électrode:Électrik Noeunoeuf:Plante/Psy Noadkoko:Plante/Psy Osselait:Sol Ossatueur:Sol Kicklee:Combat Tygnon:Combat
Excelangue:Normal Smogo:Poison Smogogo:Poison Rhinocorne:Sol/Roche Rhinoféros:Sol/Roche Leveinard:Normal
Saquedeneu:Plante Kangourex:Normal Hypotrempe:Eau Hypocéan:Eau Poissirène:Eau Poissoroy:Eau Stari:Eau Staross:Eau/Psy
M._Mime:Psy/Fée Insécateur:Insecte/Vol Lippoutou:Glace/Psy Élektek:Électrik Magmar:Feu Scarabrute:Insecte
Tauros:Normal Magicarpe:Eau Léviator:Eau/Vol Lokhlass:Eau/Glace Métamorph:Normal Évoli:Normal Aquali:Eau
Voltali:Électrik Pyroli:Feu Porygon:Normal Amonita:Roche/Eau Amonistar:Roche/Eau Kabuto:Roche/Eau Kabutops:Roche/Eau
Ptéra:Roche/Vol Ronflex:Normal Artikodin:Glace/Vol Électhor:Électrik/Vol Sulfura:Feu/Vol Minidraco:Dragon
Draco:Dragon Dracolosse:Dragon/Vol Mewtwo:Psy Mew:Psy
Germignon:Plante Macronium:Plante Méganium:Plante Héricendre:Feu Feurisson:Feu Typhlosion:Feu Kaiminus:Eau
Crocrodil:Eau Aligatueur:Eau Fouinette:Normal Fouinar:Normal Hoothoot:Normal/Vol Noarfang:Normal/Vol
Coxy:Insecte/Vol Coxyclaque:Insecte/Vol Mimigal:Insecte/Poison Migalos:Insecte/Poison Nostenfer:Poison/Vol
Loupio:Eau/Électrik Lanturn:Eau/Électrik Pichu:Électrik Mélo:Fée Toudoudou:Normal/Fée Togepi:Fée
Togetic:Fée/Vol Natu:Psy/Vol Xatu:Psy/Vol Wattouat:Électrik Lainergie:Électrik Pharamp:Électrik
Joliflor:Plante Marill:Eau/Fée Azumarill:Eau/Fée Simularbre:Roche Tarpaud:Eau Granivol:Plante/Vol
Floravol:Plante/Vol Cotovol:Plante/Vol Capumain:Normal Tournegrin:Plante Héliatronc:Plante Yanma:Insecte/Vol
Axoloto:Eau/Sol Maraiste:Eau/Sol Mentali:Psy Noctali:Ténèbres Cornèbre:Ténèbres/Vol Roigada:Eau/Psy
Feuforêve:Spectre Zarbi:Psy Qulbutoké:Psy Girafarig:Normal/Psy Pomdepik:Insecte Foretress:Insecte/Acier
Insolourdo:Normal Scorplane:Sol/Vol Steelix:Acier/Sol Snubbull:Fée Granbull:Fée Qwilfish:Eau/Poison
Cizayox:Insecte/Acier Caratroc:Insecte/Roche Scarhino:Insecte/Combat Farfuret:Ténèbres/Glace Teddiursa:Normal
Ursaring:Normal Limagma:Feu Volcaropod:Feu/Roche Marcacrin:Glace/Sol Cochignon:Glace/Sol Corayon:Eau/Roche
Rémoraid:Eau Octillery:Eau Cadoizo:Glace/Vol Démanta:Eau/Vol Airmure:Acier/Vol Malosse:Ténèbres/Feu
Démolosse:Ténèbres/Feu Hyporoi:Eau/Dragon Phanpy:Sol Donphan:Sol Porygon2:Normal Cerfrousse:Normal
Queulorior:Normal Debugant:Combat Kapoera:Combat Lippouti:Glace/Psy Élekid:Électrik Magby:Feu Écrémeuh:Normal
Leuphorie:Normal Raikou:Électrik Entei:Feu Suicune:Eau Embrylex:Roche/Sol Ymphect:Roche/Sol
Tyranocif:Roche/Ténèbres Lugia:Psy/Vol Ho-Oh:Feu/Vol Celebi:Psy/Plante
"""

POKEMON = {}  # numéro -> {"nom", "types"}
for _i, _p in enumerate(_LISTE.split(), 1):
    _nom, _types = _p.split(":")
    POKEMON[_i] = {"nom": _nom.replace("_", " "), "types": _types.split("/")}
assert len(POKEMON) == 251

LEGENDAIRES = [144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251]  # seulement dans les Master Balls

COULEURS_TYPES = {
    "Normal": "#A8A77A", "Feu": "#EE8130", "Eau": "#6390F0", "Électrik": "#F7D02C", "Plante": "#7AC74C",
    "Glace": "#96D9D6", "Combat": "#C22E28", "Poison": "#A33EA1", "Sol": "#E2BF65", "Vol": "#A98FF3",
    "Psy": "#F95587", "Insecte": "#A6B91A", "Roche": "#B6A136", "Spectre": "#735797", "Dragon": "#6F35FC",
    "Acier": "#B7B7CE", "Fée": "#D685AD",
}

# Poids officiels en kg (Pokédex, données PokeAPI) : pour comparer les pesées de Kiki à des Pokémon
POIDS = {1: 6.9, 2: 13, 3: 100, 4: 8.5, 5: 19, 6: 90.5, 7: 9, 8: 22.5, 9: 85.5, 10: 2.9, 11: 9.9, 12: 32, 13: 3.2, 14: 10, 15: 29.5, 16: 1.8, 17: 30, 18: 39.5, 19: 3.5, 20: 18.5, 21: 2, 22: 38, 23: 6.9, 24: 65, 25: 6, 26: 30, 27: 12, 28: 29.5, 29: 7, 30: 20, 31: 60, 32: 9, 33: 19.5, 34: 62, 35: 7.5, 36: 40, 37: 9.9, 38: 19.9, 39: 5.5, 40: 12, 41: 7.5, 42: 55, 43: 5.4, 44: 8.6, 45: 18.6, 46: 5.4, 47: 29.5, 48: 30, 49: 12.5, 50: 0.8, 51: 33.3, 52: 4.2, 53: 32, 54: 19.6, 55: 76.6, 56: 28, 57: 32, 58: 19, 59: 155, 60: 12.4, 61: 20, 62: 54, 63: 19.5, 64: 56.5, 65: 48, 66: 19.5, 67: 70.5, 68: 130, 69: 4, 70: 6.4, 71: 15.5, 72: 45.5, 73: 55, 74: 20, 75: 105, 76: 300, 77: 30, 78: 95, 79: 36, 80: 78.5, 81: 6, 82: 60, 83: 15, 84: 39.2, 85: 85.2, 86: 90, 87: 120, 88: 30, 89: 30, 90: 4, 91: 132.5, 92: 0.1, 93: 0.1, 94: 40.5, 95: 210, 96: 32.4, 97: 75.6, 98: 6.5, 99: 60, 100: 10.4, 101: 66.6, 102: 2.5, 103: 120, 104: 6.5, 105: 45, 106: 49.8, 107: 50.2, 108: 65.5, 109: 1, 110: 9.5, 111: 115, 112: 120, 113: 34.6, 114: 35, 115: 80, 116: 8, 117: 25, 118: 15, 119: 39, 120: 34.5, 121: 80, 122: 54.5, 123: 56, 124: 40.6, 125: 30, 126: 44.5, 127: 55, 128: 88.4, 129: 10, 130: 235, 131: 220, 132: 4, 133: 6.5, 134: 29, 135: 24.5, 136: 25, 137: 36.5, 138: 7.5, 139: 35, 140: 11.5, 141: 40.5, 142: 59, 143: 460, 144: 55.4, 145: 52.6, 146: 60, 147: 3.3, 148: 16.5, 149: 210, 150: 122, 151: 4}
# Taille en mètres et chances d'être une femelle, en huitièmes (-1 = sans sexe), comme POIDS : données officielles (PokeAPI)
TAILLES = {1: 0.7, 2: 1, 3: 2, 4: 0.6, 5: 1.1, 6: 1.7, 7: 0.5, 8: 1, 9: 1.6, 10: 0.3, 11: 0.7, 12: 1.1, 13: 0.3, 14: 0.6, 15: 1, 16: 0.3, 17: 1.1, 18: 1.5, 19: 0.3, 20: 0.7, 21: 0.3, 22: 1.2, 23: 2, 24: 3.5, 25: 0.4, 26: 0.8, 27: 0.6, 28: 1, 29: 0.4, 30: 0.8, 31: 1.3, 32: 0.5, 33: 0.9, 34: 1.4, 35: 0.6, 36: 1.3, 37: 0.6, 38: 1.1, 39: 0.5, 40: 1, 41: 0.8, 42: 1.6, 43: 0.5, 44: 0.8, 45: 1.2, 46: 0.3, 47: 1, 48: 1, 49: 1.5, 50: 0.2, 51: 0.7, 52: 0.4, 53: 1, 54: 0.8, 55: 1.7, 56: 0.5, 57: 1, 58: 0.7, 59: 1.9, 60: 0.6, 61: 1, 62: 1.3, 63: 0.9, 64: 1.3, 65: 1.5, 66: 0.8, 67: 1.5, 68: 1.6, 69: 0.7, 70: 1, 71: 1.7, 72: 0.9, 73: 1.6, 74: 0.4, 75: 1, 76: 1.4, 77: 1, 78: 1.7, 79: 1.2, 80: 1.6, 81: 0.3, 82: 1, 83: 0.8, 84: 1.4, 85: 1.8, 86: 1.1, 87: 1.7, 88: 0.9, 89: 1.2, 90: 0.3, 91: 1.5, 92: 1.3, 93: 1.6, 94: 1.5, 95: 8.8, 96: 1, 97: 1.6, 98: 0.4, 99: 1.3, 100: 0.5, 101: 1.2, 102: 0.4, 103: 2, 104: 0.4, 105: 1, 106: 1.5, 107: 1.4, 108: 1.2, 109: 0.6, 110: 1.2, 111: 1, 112: 1.9, 113: 1.1, 114: 1, 115: 2.2, 116: 0.4, 117: 1.2, 118: 0.6, 119: 1.3, 120: 0.8, 121: 1.1, 122: 1.3, 123: 1.5, 124: 1.4, 125: 1.1, 126: 1.3, 127: 1.5, 128: 1.4, 129: 0.9, 130: 6.5, 131: 2.5, 132: 0.3, 133: 0.3, 134: 1, 135: 0.8, 136: 0.9, 137: 0.8, 138: 0.4, 139: 1, 140: 0.5, 141: 1.3, 142: 1.8, 143: 2.1, 144: 1.7, 145: 1.6, 146: 2, 147: 1.8, 148: 4, 149: 2.2, 150: 2, 151: 0.4}
FEMELLES = {1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 4, 11: 4, 12: 4, 13: 4, 14: 4, 15: 4, 16: 4, 17: 4, 18: 4, 19: 4, 20: 4, 21: 4, 22: 4, 23: 4, 24: 4, 25: 4, 26: 4, 27: 4, 28: 4, 29: 8, 30: 8, 31: 8, 32: 0, 33: 0, 34: 0, 35: 6, 36: 6, 37: 6, 38: 6, 39: 6, 40: 6, 41: 4, 42: 4, 43: 4, 44: 4, 45: 4, 46: 4, 47: 4, 48: 4, 49: 4, 50: 4, 51: 4, 52: 4, 53: 4, 54: 4, 55: 4, 56: 4, 57: 4, 58: 2, 59: 2, 60: 4, 61: 4, 62: 4, 63: 2, 64: 2, 65: 2, 66: 2, 67: 2, 68: 2, 69: 4, 70: 4, 71: 4, 72: 4, 73: 4, 74: 4, 75: 4, 76: 4, 77: 4, 78: 4, 79: 4, 80: 4, 81: -1, 82: -1, 83: 4, 84: 4, 85: 4, 86: 4, 87: 4, 88: 4, 89: 4, 90: 4, 91: 4, 92: 4, 93: 4, 94: 4, 95: 4, 96: 4, 97: 4, 98: 4, 99: 4, 100: -1, 101: -1, 102: 4, 103: 4, 104: 4, 105: 4, 106: 0, 107: 0, 108: 4, 109: 4, 110: 4, 111: 4, 112: 4, 113: 8, 114: 4, 115: 8, 116: 4, 117: 4, 118: 4, 119: 4, 120: -1, 121: -1, 122: 4, 123: 4, 124: 8, 125: 2, 126: 2, 127: 4, 128: 0, 129: 4, 130: 4, 131: 4, 132: -1, 133: 1, 134: 1, 135: 1, 136: 1, 137: -1, 138: 1, 139: 1, 140: 1, 141: 1, 142: 1, 143: 1, 144: -1, 145: -1, 146: -1, 147: 4, 148: 4, 149: 4, 150: -1, 151: -1}

# La catégorie de chaque espèce (les noms officiels) et sa description : des textes écrits pour ce jeu, pas ceux des jeux Pokémon
CATEGORIES = {1: "Pokémon Graine", 2: "Pokémon Graine", 3: "Pokémon Graine", 4: "Pokémon Lézard", 5: "Pokémon Flamme", 6: "Pokémon Flamme", 7: "Pokémon Minitortue", 8: "Pokémon Tortue", 9: "Pokémon Carapace", 10: "Pokémon Ver", 11: "Pokémon Cocon", 12: "Pokémon Papillon", 13: "Pokémon Insectopic", 14: "Pokémon Cocon", 15: "Pokémon Guêpoison", 16: "Pokémon Minoiseau", 17: "Pokémon Oiseau", 18: "Pokémon Oiseau", 19: "Pokémon Souris", 20: "Pokémon Souris", 21: "Pokémon Minoiseau", 22: "Pokémon Bec-Oiseau", 23: "Pokémon Serpent", 24: "Pokémon Cobra", 25: "Pokémon Souris", 26: "Pokémon Souris", 27: "Pokémon Souris", 28: "Pokémon Souris", 29: "Pokémon Vénépic", 30: "Pokémon Vénépic", 31: "Pokémon Perceur", 32: "Pokémon Vénépic", 33: "Pokémon Vénépic", 34: "Pokémon Perceur", 35: "Pokémon Fée", 36: "Pokémon Fée", 37: "Pokémon Renard", 38: "Pokémon Renard", 39: "Pokémon Bouboule", 40: "Pokémon Bouboule", 41: "Pokémon Chovsouris", 42: "Pokémon Chovsouris", 43: "Pokémon Racine", 44: "Pokémon Racine", 45: "Pokémon Fleur", 46: "Pokémon Champignon", 47: "Pokémon Champignon", 48: "Pokémon Vermine", 49: "Pokémon Papipoison", 50: "Pokémon Taupe", 51: "Pokémon Taupe", 52: "Pokémon Chadégout", 53: "Pokémon Chadeville", 54: "Pokémon Canard", 55: "Pokémon Canard", 56: "Pokémon Porsinge", 57: "Pokémon Porsinge", 58: "Pokémon Chiot", 59: "Pokémon Légendaire", 60: "Pokémon Têtard", 61: "Pokémon Têtard", 62: "Pokémon Têtard", 63: "Pokémon Psy", 64: "Pokémon Psy", 65: "Pokémon Psy", 66: "Pokémon Colosse", 67: "Pokémon Colosse", 68: "Pokémon Colosse", 69: "Pokémon Fleur", 70: "Pokémon Carnivore", 71: "Pokémon Carnivore", 72: "Pokémon Mollusque", 73: "Pokémon Mollusque", 74: "Pokémon Roche", 75: "Pokémon Roche", 76: "Pokémon Titanesque", 77: "Pokémon Cheval Feu", 78: "Pokémon Cheval Feu", 79: "Pokémon Crétin", 80: "Pokémon Symbiose", 81: "Pokémon Magnétique", 82: "Pokémon Magnétique", 83: "Pokémon Canard Fou", 84: "Pokémon Duoiseau", 85: "Pokémon Trioiseau", 86: "Pokémon Otarie", 87: "Pokémon Otarie", 88: "Pokémon Dégueu", 89: "Pokémon Dégueu", 90: "Pokémon Bivalve", 91: "Pokémon Bivalve", 92: "Pokémon Gaz", 93: "Pokémon Gaz", 94: "Pokémon Ombre", 95: "Pokémon Serpenroc", 96: "Pokémon Hypnose", 97: "Pokémon Hypnose", 98: "Pokémon Doux Crabe", 99: "Pokémon Pince", 100: "Pokémon Balle", 101: "Pokémon Balle", 102: "Pokémon Œuf", 103: "Pokémon Fruitpalme", 104: "Pokémon Solitaire", 105: "Pokémon Gard’Os", 106: "Pokémon Latteur", 107: "Pokémon Puncheur", 108: "Pokémon Lécheur", 109: "Pokémon Gaz Mortel", 110: "Pokémon Gaz Mortel", 111: "Pokémon Piquant", 112: "Pokémon Perceur", 113: "Pokémon Œuf", 114: "Pokémon Vigne", 115: "Pokémon Maternel", 116: "Pokémon Dragon", 117: "Pokémon Dragon", 118: "Pokémon Poisson", 119: "Pokémon Poisson", 120: "Pokémon Étoile", 121: "Pokémon Mystérieux", 122: "Pokémon Bloqueur", 123: "Pokémon Mante", 124: "Pokémon Humanoïde", 125: "Pokémon Électrique", 126: "Pokémon Crache-Feu", 127: "Pokémon Scarabée", 128: "Pokémon Buffle", 129: "Pokémon Poisson", 130: "Pokémon Terrifiant", 131: "Pokémon Transport", 132: "Pokémon Morphing", 133: "Pokémon Évolutif", 134: "Pokémon Bulleur", 135: "Pokémon Orage", 136: "Pokémon Flamme", 137: "Pokémon Virtuel", 138: "Pokémon Spirale", 139: "Pokémon Spirale", 140: "Pokémon Carapace", 141: "Pokémon Carapace", 142: "Pokémon Fossile", 143: "Pokémon Pionceur", 144: "Pokémon Glaciaire", 145: "Pokémon Électrique", 146: "Pokémon Flamme", 147: "Pokémon Dragon", 148: "Pokémon Dragon", 149: "Pokémon Dragon", 150: "Pokémon Génétique", 151: "Pokémon Nouveau"}
DESCRIPTIONS = {
    1: "Sa graine se charge de soleil pendant les longues balades. Plus il y a de kilomètres au compteur, plus elle pèse lourd sur son dos.",
    2: "Porter ce gros bouton sur le dos transforme la moindre promenade en séance de musculation des jambes.",
    3: "Sa fleur géante dégage un parfum qui attire tout le voisinage. Difficile de passer inaperçu pendant le footing du matin.",
    4: "Sa flamme de queue sert de jauge de forme : vive après l'effort, plus timide après une nuit trop courte.",
    5: "Ne tient pas en place tant que sa flamme réclame du combat. Une bonne course suffit parfois à la calmer.",
    6: "Ses ailes l'emportent plus haut que les nuages. Son souffle fait fondre les rochers, et parfois aussi les records.",
    7: "Se réfugie dans sa carapace au moindre doute, puis en ressort en crachant de l'eau. Une tactique qui marche bien mieux qu'on ne le pense.",
    8: "Ses oreilles et sa queue touffue en font un nageur de fond redoutable, capable d'enchaîner les longueurs sans jamais se plaindre.",
    9: "Les canons de sa carapace visent juste à grande distance. Le dos large, les épaules solides : un adepte évident du rameur.",
    10: "Passe ses journées à grignoter des feuilles en marchant très lentement. Compte chaque pas comme une victoire.",
    11: "Immobile dans sa coque, mais très occupé à l'intérieur. La preuve qu'un jour de repos fait aussi partie de l'entraînement.",
    12: "Repère les fleurs de très loin et peut voler des heures sans se poser. Ses ailes laissent une fine poudre derrière son passage.",
    13: "Minuscule, mais le dard sur sa tête décourage les curieux. Avance droit devant, sans jamais regarder derrière.",
    14: "Ne bouge presque pas et tient pourtant tête à tout ce qui passe. Sa patience est son meilleur muscle.",
    15: "Vole en essaim à toute allure, dards en avant. Mieux vaut ne pas couper sa trajectoire pendant un sprint.",
    16: "Préfère éviter les disputes et s'éloigner à tire-d'aile. Un adepte convaincu de la marche matinale dans les herbes.",
    17: "Patrouille un vaste territoire chaque jour, sans jamais sauter une ronde. Sa régularité ferait envie à n'importe quel sportif.",
    18: "Sa crête se dresse juste avant un piqué fulgurant. Peu de Pokémon atteignent une telle vitesse en plein ciel.",
    19: "Ronge tout ce qui dépasse et file au moindre bruit. Ses petites pattes enchaînent les pas bien plus vite qu'on ne le croit.",
    20: "Ses dents poussent sans arrêt et l'obligent à ronger du matin au soir. Personne ne sait vraiment quand ce Pokémon dort.",
    21: "Petites ailes, grande voix. Doit battre l'air sans arrêt pour rester en vol : une vraie séance de cardio.",
    22: "Son long bec fouille le sol et l'eau à la recherche d'un repas. Tient le ciel pendant des journées entières sans faiblir.",
    23: "Se faufile sans un bruit dans l'herbe haute et sait attendre le bon moment, des heures s'il le faut.",
    24: "Le motif de son ventre impressionne jusqu'aux plus téméraires. Une simple posture suffit à gagner bien des combats.",
    25: "Ses joues se chargent d'électricité pendant la sieste. Au réveil, mieux vaut ne pas lui serrer la patte.",
    26: "Un trop-plein de courant, et voilà ses nerfs à vif. Un bon défoulement s'impose, sinon c'est tout le quartier qui saute.",
    27: "Se roule en boule au moindre danger : un exercice de gainage répété des dizaines de fois par jour.",
    28: "Ses griffes creusent la roche à une vitesse folle. Après le travail, quelques roulades pour dérouiller ses piquants.",
    29: "Petite mais coriace. Ses piquants discrets cachent un poison dont on se souvient longtemps.",
    30: "Veille sur les siens avec une grande douceur, et sort ses piquants dès qu'on s'en approche de trop près.",
    31: "Une armure d'écailles, des bras puissants : elle peut renverser un adversaire d'un seul coup de reins.",
    32: "Ses grandes oreilles guettent le moindre bruit. Ce petit costaud fonce sans réfléchir quand il s'agit de protéger les siens.",
    33: "Fonce tête baissée, corne en avant, et réfléchit ensuite. Un partenaire d'entraînement à manier avec précaution.",
    34: "Un seul coup de sa queue épaisse suffit à faire tomber un arbre. Ses séances de musculation font trembler le sol.",
    35: "Danse sous la pleine lune, dit-on, loin des regards. Personne n'a encore osé lui demander son programme.",
    36: "Fuit le bruit et les foules, et bondit si légèrement que ses pas ne laissent aucune trace. La discrétion faite Pokémon.",
    37: "Passe plus de temps à lisser son pelage qu'à courir, et le résultat lui donne plutôt raison.",
    38: "On lui prête plusieurs siècles de vie. La preuve qu'il n'est jamais trop tard pour commencer à bouger.",
    39: "Ses chansons font tomber tout le monde de sommeil, ce qui le vexe beaucoup. Un excellent allié pour une nuit de 7 heures.",
    40: "Un corps élastique, douillet comme un oreiller. Personne n'a jamais résisté à une sieste sur son ventre.",
    41: "Sans yeux, se repère aux ultrasons. Vole toute la nuit et rentre avant l'aube : le sommeil, ce sera pour plus tard.",
    42: "Une grande bouche, des crocs affûtés et un appétit sans fin. Il lui faut bien ça pour tenir toute la nuit en l'air.",
    43: "Le jour, seules ses feuilles dépassent du sol. La nuit, part se promener sur ses racines et fait ses pas pendant que tout le monde dort.",
    44: "Son odeur épouvantable fait fuir presque tout le monde, sauf quelques amateurs. Ne cherche jamais de partenaire de course.",
    45: "Ses immenses pétales pèsent lourd à porter. À chaque pas, un nuage de pollen : mieux vaut ne pas s'entraîner juste à côté.",
    46: "Deux petits champignons ont élu domicile sur son dos et profitent du voyage. Ce Pokémon ne marche jamais vraiment seul.",
    47: "Le champignon a fini par prendre toute la place et décide maintenant du chemin. Drôle de façon de se faire coacher.",
    48: "Ses gros yeux voient tout, surtout la nuit. Attiré par la lumière, comme tout le monde devant son écran à minuit.",
    49: "Ses ailes sèment une poudre différente selon leur couleur. Danse dans la lumière jusque tard, sans se soucier de l'heure du coucher.",
    50: "On ne voit jamais que sa tête. Qui sait, il y a peut-être un vrai marathonien là-dessous.",
    51: "Trois têtes, un seul objectif : creuser le plus profond possible. Elles ne se disputent jamais sur l'allure à tenir.",
    52: "Adore tout ce qui brille et sort surtout la nuit. Compte ses pièces plus souvent que ses pas.",
    53: "Une démarche souple, un port de tête hautain. Ne court que si ça en vaut vraiment la peine, mais alors, très vite.",
    54: "Une migraine permanente, et des pouvoirs qui surgissent sans prévenir. Une bonne nuit de sommeil ne lui ferait pas de mal.",
    55: "Nage plus vite que tous les champions du bord de mer, avec des palmes faites pour ça. Son front brille à l'approche d'un effort.",
    56: "S'emporte pour un rien et ne s'arrête plus. Personne n'a jamais vu la fin d'une de ses colères.",
    57: "Ses poings ne connaissent pas le repos. Sa colère a fini par lui faire des épaules qu'on n'ose plus regarder.",
    58: "Fidèle et courageux, ne refuse jamais une sortie. Le meilleur partenaire de footing dont on puisse rêver.",
    59: "Court si vite et si loin qu'on le croirait porté par le vent. Les vieilles légendes parlent déjà de son endurance.",
    60: "La spirale de son ventre fascine ceux qui la regardent. Bien plus à l'aise en nageant qu'en marchant sur ses petites pattes.",
    61: "Toujours luisant, ce nageur sort parfois de l'eau pour marcher. Ses jambes se musclent à vue d'œil.",
    62: "Des bras énormes, un crawl infatigable. Traverse l'océan comme d'autres vont à la boulangerie.",
    63: "Passe ses journées à dormir, et se téléporte dès qu'on l'approche. Objectif sommeil : très largement dépassé.",
    64: "Une cuillère à la main, des ondes plein la tête. Sa présence dérègle les montres, ce qui complique beaucoup le compte des pas.",
    65: "Un cerveau immense, un corps frêle : sa tête ne tient que par la pensée. Ne fait jamais de musculation, et ça se voit.",
    66: "S'entraîne sans relâche en soulevant tout ce qui lui tombe sous la main. Un corps taillé pour la salle, et des journées entières pour y aller.",
    67: "Porte des charges énormes pour aider les gens, et appelle ça un échauffement. Ne connaît pas le mot courbature.",
    68: "Quatre bras, quatre fois plus de séries. Personne n'ose lui demander s'il a encore besoin de la machine.",
    69: "Tout en tige, mais d'une souplesse étonnante. Se penche pour esquiver et se redresse aussitôt : une séance d'étirements permanente.",
    70: "Un grand sourire plein d'appétit, et des crochets pour s'accrocher aux branches. Préfère de loin le repas à la séance.",
    71: "Patiente au fond de la jungle en attendant que le déjeuner vienne tout seul. Le parfait contre-exemple d'une journée active.",
    72: "Presque entièrement fait d'eau, ce Pokémon dérive au gré des vagues. Ses cristaux concentrent la lumière du soleil.",
    73: "Ses longs tentacules se déploient comme un filet dans les vagues. Sans doute le plus gros volume de bras jamais vu en mer.",
    74: "Les promeneurs le prennent pour un simple caillou, jusqu'à ce qu'il se lève. N'ayant que des bras, ne connaît qu'un seul exercice : les pompes.",
    75: "Descend les pentes en roulant, sans frein ni regret. Un entraînement de montagne pris à l'envers.",
    76: "Trois cents kilos de roche qui dévalent la montagne : on entend ses pas bien avant de le voir. Sa balance ne s'en est jamais remise.",
    77: "Sa crinière de feu s'agite à chaque foulée. Gambade dès ses premières heures, et ne s'arrête plus jamais vraiment.",
    78: "Accélère tant que ses flammes traînent derrière. Adore faire la course avec tout ce qui bouge, et gagne presque toujours.",
    79: "Peut rester une journée entière au bord de l'eau, la queue dans la rivière, à ne rien faire. Un modèle pour les jours de repos.",
    80: "Un coquillage accroché à sa queue, et personne pour le lui signaler. Sa réaction la plus rapide prend environ une journée.",
    81: "Flotte en grésillant, attiré par toutes les lignes électriques. Dérègle volontiers les montres connectées qui passent trop près.",
    82: "Trois Magnéti soudés, et une onde qui fait grésiller les écrans alentour. Le travail d'équipe ne leur pose aucun problème.",
    83: "Ne se sépare jamais de son poireau, qui lui sert à tout : arme, outil, et même haltère.",
    84: "Deux têtes jamais d'accord sur la direction, mais une paire de jambes qui avale les kilomètres. Un coureur né.",
    85: "Trois têtes, trois avis, et des jambes qui tranchent. Quand il s'agit d'aller vite, personne ne discute.",
    86: "La corne sur son front casse la glace devant son passage. Pour ce nageur, l'eau froide n'est pas une épreuve mais un plaisir.",
    87: "Une fourrure d'un blanc pur, une grâce folle dans l'eau glacée. Pour récupérer, préfère un lit de neige.",
    88: "Sa présence fait tourner le lait et fuir les passants. Ne connaîtra jamais la joie d'un vestiaire partagé.",
    89: "Laisse une trace gluante partout où ça passe, et rien n'y repousse. Éviter absolument de partager sa serviette.",
    90: "Referme sa coquille au moindre danger et tire la langue le reste du temps. Difficile de dire si c'est de la peur ou de l'insolence.",
    91: "Sa carapace résiste à presque tout, et on ne sait toujours pas à quoi ressemble ce qui vit dedans. C'est sans doute mieux comme ça.",
    92: "Un nuage de gaz avec deux yeux. Aucun poids, aucun muscle, mais un vrai talent pour faire fuir tout le monde.",
    93: "Surgit du mur, tire la langue, disparaît. Personne n'a jamais réussi à le prendre en photo, ni à lui faire faire un pas.",
    94: "Se cache dans ton ombre la nuit et te glisse un frisson dans le dos. Si tu dors mal, c'est peut-être à cause de ça.",
    95: "Une chaîne de rochers longue de près de neuf mètres, qui creuse à toute vitesse. Le dénivelé, ça le connaît.",
    96: "Renifle les rêves à travers les murs. Les nuits trop courtes ne l'intéressent pas du tout : ça manque de goût.",
    97: "Son pendule ne tombe jamais en panne et ses yeux ne clignent pas. Compte les moutons à la place de tout le monde.",
    98: "Creuse son trou sur la plage et fait mouliner ses pinces. Marche de côté, ce qui complique beaucoup le calcul des pas.",
    99: "Une pince géante, un seul bras musclé : le déséquilibre typique de qui ne travaille jamais l'autre côté.",
    100: "Ressemble à s'y méprendre à une Poké Ball, et n'attend que ça. Explose à la première surprise : prudence avant de le ramasser.",
    101: "Roule à toute vitesse, se charge d'électricité, et finit souvent par exploser. Un programme d'entraînement assez court.",
    102: "Six œufs qui ne se quittent jamais et se parlent par la pensée. Ne laissent personne courir seul.",
    103: "Trois têtes qui pensent chacune de leur côté, sous le soleil tropical. Au moins, l'une d'elles pense à s'hydrater.",
    104: "Ne quitte jamais son os, fidèle compagnon de route comme d'autres leur gourde. Ce qui se cache sous son crâne reste un secret.",
    105: "Manie son os comme un javelot, le lance et le rattrape sans même regarder. Ne l'a encore jamais perdu.",
    106: "Ses jambes s'allongent pour frapper à distance, sans prévenir. Ne saute jamais la séance des jambes, et ça se voit.",
    107: "Enchaîne les directs plus vite que l'œil. Ne sort jamais sans ses gants, même pour aller chercher le pain.",
    108: "Une langue immense, qui goûte tout avant de toucher quoi que ce soit. Le seul muscle vraiment entraîné ici.",
    109: "Flotte en crachant des fumées. Tout le contraire d'une bonne séance d'air pur.",
    110: "Deux corps de gaz qui gonflent et dégonflent à tour de rôle. Un excellent exercice de respiration, à pratiquer très loin de là.",
    111: "Fonce droit devant et n'a aucune idée de la façon de tourner. Un entraînement très efficace, en ligne droite.",
    112: "Debout sur ses pattes arrière, sa corne perce tout sur son passage. Sa peau encaisse les coups sans sourciller.",
    113: "Soigne tout le monde avec douceur et porte un œuf qui porte bonheur. Le soutien rêvé pour les lendemains de grosses séances.",
    114: "Personne n'a jamais vu ce qu'il y a sous ce tas de lianes. Elles repoussent à vue d'œil, de toute façon.",
    115: "Ne lâche jamais son petit, qui voyage dans sa poche. Prouve chaque jour qu'on peut boxer et faire du portage en même temps.",
    116: "Minuscule, se laisse porter par les courants en s'agrippant aux algues. Sa petite nageoire bat plus vite que l'œil ne le voit.",
    117: "Piquants dressés, jets d'encre à volonté. Un nageur rapide qui aime garder de la marge sur ses poursuivants.",
    118: "Porte sa corne fièrement et remonte les rivières sans se lasser. Ondule avec élégance, même à contre-courant.",
    119: "Creuse son nid dans les rochers à coups de corne. Un travail d'automne, mené sans jamais prendre un jour de congé.",
    120: "Son cœur rouge brille la nuit, et ses branches repoussent quand elles se cassent. Le roi de la récupération.",
    121: "Tourne sur soi-même à toute vitesse dans l'eau, et son cœur change de couleur. Personne ne sait vraiment ce qui se passe là-dedans.",
    122: "Bâtit des murs invisibles à la seule force de ses mains. Ses gestes sont si précis qu'on finit par y croire, et par s'y cogner.",
    123: "Ses lames fendent l'air en plein bond, si vite qu'on entend le coup avant de le voir.",
    124: "Danse en ondulant des hanches sans que personne ne sache pourquoi. Son rythme finit toujours par gagner toute la salle.",
    125: "Fait sauter les plombs à la moindre approche. Un moulinet de bras à la fois, de quoi recharger tout un quartier.",
    126: "Son corps brûle si fort que l'air tremble autour. Né dans les volcans, ne craint pas de transpirer.",
    127: "Ses pinces soulèvent bien plus que son propre poids. Un champion du soulevé de terre, sans doute le plus têtu de la forêt.",
    128: "Se fouette les flancs de ses trois queues avant de charger. Un vrai échauffement, et ensuite plus rien ne l'arrête.",
    129: "Saute beaucoup, nage mal, et n'a aucune attaque digne de ce nom. Continue pourtant à s'entraîner tous les jours. On en reparlera.",
    130: "Un seul de ses accès de colère peut raser une ville entière. Il paraît qu'à force d'efforts, tout le monde peut y arriver.",
    131: "Transporte volontiers les voyageurs sur son dos à travers la mer. Son chant doux résonne au loin les soirs de brume.",
    132: "Peut copier n'importe quelle forme, mais oublie parfois de soigner les détails. Copie aussi les efforts des autres, et n'en retient que le résultat.",
    133: "Un pelage doux, des gènes instables et un immense avenir. Personne ne peut dire ce que ses efforts en feront.",
    134: "Se fond dans l'eau au point de disparaître. Sa nage est si fluide qu'on n'en voit aucune trace.",
    135: "Ses poils se dressent en aiguilles électrisées. Une seule boucle autour du parc, et tout le monde sent passer le courant.",
    136: "Sa fourrure garde la chaleur de son corps, qui monte à vive allure. Après un effort, un nuage de flammes s'échappe.",
    137: "Un Pokémon entièrement fait de données, capable de se glisser dans les réseaux. Compte ses pas en nombres à virgule.",
    138: "Ranimé à partir d'un fossile, nage en se servant de ses tentacules. Quelques millions d'années d'entraînement à rattraper.",
    139: "Une coquille si lourde que chaque déplacement devient un effort. Cela aurait causé sa disparition : à méditer avant d'arrêter le sport.",
    140: "Ressurgi d'un vieux fossile, marche au fond de l'eau sous sa carapace. Ses yeux brillent dans le noir comme ceux d'un vieux sage.",
    141: "Ses faux tranchantes et sa silhouette profilée en font un nageur redoutable. Un prédateur d'un autre âge, toujours en forme.",
    142: "Réveillé d'un morceau d'ambre, son cri perce les nuages. Des millions d'années d'inactivité, rattrapés en un seul vol.",
    143: "Mange, dort, recommence. La nuit la plus longue de Kanto, et le contraire exact de ce que ce jeu te demande en journée.",
    144: "Ses ailes font tomber la neige en plein vol. Rares sont ceux qui l'ont aperçu, et encore plus rares ceux qui l'ont suivi.",
    145: "Se nourrit d'orages et plonge à travers les éclairs. Les montagnes tremblent à son passage, et la foudre lui obéit.",
    146: "Chaque battement d'ailes laisse une traînée de braises. Annonce le printemps, dit-on, à qui marche jusqu'à ses volcans.",
    147: "Longtemps pris pour une légende par les pêcheurs. Mue sans cesse et repart à chaque fois plus long : une progression lente, mais sûre.",
    148: "Sa fine silhouette change le temps qu'il fait, dit-on. Glisse dans l'air et dans l'eau avec une sérénité absolue.",
    149: "Un corps massif, et pourtant une vitesse de vol folle. Porte secours aux naufragés, entre deux tours du monde.",
    150: "Créé pour être le plus fort, et ne connaît que ça. Aucune séance ne lui suffit : n'a jamais trouvé d'adversaire à sa mesure.",
    151: "Si rare que beaucoup doutent de son existence. Seuls les plus patients finissent par le croiser, et ce n'est jamais par hasard.",
}

# Johto (données officielles : PokeAPI ; descriptions : nos propres textes, jamais ceux des jeux, dépôt public)
POIDS.update({152: 6.4, 153: 15.8, 154: 100.5, 155: 7.9, 156: 19, 157: 79.5, 158: 9.5, 159: 25, 160: 88.8, 161: 6, 162: 32.5, 163: 21.2, 164: 40.8, 165: 10.8, 166: 35.6, 167: 8.5, 168: 33.5, 169: 75, 170: 12, 171: 22.5, 172: 2, 173: 3, 174: 1, 175: 1.5, 176: 3.2, 177: 2, 178: 15, 179: 7.8, 180: 13.3, 181: 61.5, 182: 5.8, 183: 8.5, 184: 28.5, 185: 38, 186: 33.9, 187: 0.5, 188: 1, 189: 3, 190: 11.5, 191: 1.8, 192: 8.5, 193: 38, 194: 8.5, 195: 75, 196: 26.5, 197: 27, 198: 2.1, 199: 79.5, 200: 1, 201: 5, 202: 28.5, 203: 41.5, 204: 7.2, 205: 125.8, 206: 14, 207: 64.8, 208: 400, 209: 7.8, 210: 48.7, 211: 3.9, 212: 118, 213: 20.5, 214: 54, 215: 28, 216: 8.8, 217: 125.8, 218: 35, 219: 55, 220: 6.5, 221: 55.8, 222: 5, 223: 12, 224: 28.5, 225: 16, 226: 220, 227: 50.5, 228: 10.8, 229: 35, 230: 152, 231: 33.5, 232: 120, 233: 32.5, 234: 71.2, 235: 58, 236: 21, 237: 48, 238: 6, 239: 23.5, 240: 21.4, 241: 75.5, 242: 46.8, 243: 178, 244: 198, 245: 187, 246: 72, 247: 152, 248: 202, 249: 216, 250: 199, 251: 5})
TAILLES.update({152: 0.9, 153: 1.2, 154: 1.8, 155: 0.5, 156: 0.9, 157: 1.7, 158: 0.6, 159: 1.1, 160: 2.3, 161: 0.8, 162: 1.8, 163: 0.7, 164: 1.6, 165: 1, 166: 1.4, 167: 0.5, 168: 1.1, 169: 1.8, 170: 0.5, 171: 1.2, 172: 0.3, 173: 0.3, 174: 0.3, 175: 0.3, 176: 0.6, 177: 0.2, 178: 1.5, 179: 0.6, 180: 0.8, 181: 1.4, 182: 0.4, 183: 0.4, 184: 0.8, 185: 1.2, 186: 1.1, 187: 0.4, 188: 0.6, 189: 0.8, 190: 0.8, 191: 0.3, 192: 0.8, 193: 1.2, 194: 0.4, 195: 1.4, 196: 0.9, 197: 1, 198: 0.5, 199: 2, 200: 0.7, 201: 0.5, 202: 1.3, 203: 1.5, 204: 0.6, 205: 1.2, 206: 1.5, 207: 1.1, 208: 9.2, 209: 0.6, 210: 1.4, 211: 0.5, 212: 1.8, 213: 0.6, 214: 1.5, 215: 0.9, 216: 0.6, 217: 1.8, 218: 0.7, 219: 0.8, 220: 0.4, 221: 1.1, 222: 0.6, 223: 0.6, 224: 0.9, 225: 0.9, 226: 2.1, 227: 1.7, 228: 0.6, 229: 1.4, 230: 1.8, 231: 0.5, 232: 1.1, 233: 0.6, 234: 1.4, 235: 1.2, 236: 0.7, 237: 1.4, 238: 0.4, 239: 0.6, 240: 0.7, 241: 1.2, 242: 1.5, 243: 1.9, 244: 2.1, 245: 2, 246: 0.6, 247: 1.2, 248: 2, 249: 5.2, 250: 3.8, 251: 0.6})
FEMELLES.update({152: 1, 153: 1, 154: 1, 155: 1, 156: 1, 157: 1, 158: 1, 159: 1, 160: 1, 161: 4, 162: 4, 163: 4, 164: 4, 165: 4, 166: 4, 167: 4, 168: 4, 169: 4, 170: 4, 171: 4, 172: 4, 173: 6, 174: 6, 175: 1, 176: 1, 177: 4, 178: 4, 179: 4, 180: 4, 181: 4, 182: 4, 183: 4, 184: 4, 185: 4, 186: 4, 187: 4, 188: 4, 189: 4, 190: 4, 191: 4, 192: 4, 193: 4, 194: 4, 195: 4, 196: 1, 197: 1, 198: 4, 199: 4, 200: 4, 201: -1, 202: 4, 203: 4, 204: 4, 205: 4, 206: 4, 207: 4, 208: 4, 209: 6, 210: 6, 211: 4, 212: 4, 213: 4, 214: 4, 215: 4, 216: 4, 217: 4, 218: 4, 219: 4, 220: 4, 221: 4, 222: 6, 223: 4, 224: 4, 225: 4, 226: 4, 227: 4, 228: 4, 229: 4, 230: 4, 231: 4, 232: 4, 233: -1, 234: 4, 235: 4, 236: 0, 237: 0, 238: 8, 239: 2, 240: 2, 241: 8, 242: 8, 243: -1, 244: -1, 245: -1, 246: 4, 247: 4, 248: 4, 249: -1, 250: -1, 251: -1})
CATEGORIES.update({152: "Pokémon Feuille", 153: "Pokémon Feuille", 154: "Pokémon Herbe", 155: "Pokémon Souris Feu", 156: "Pokémon Volcan", 157: "Pokémon Volcan", 158: "Pokémon Mâchoire", 159: "Pokémon Mâchoire", 160: "Pokémon Mâchoire", 161: "Pokémon Espion", 162: "Pokémon Allongé", 163: "Pokémon Hibou", 164: "Pokémon Hibou", 165: "Pokémon 5 Étoiles", 166: "Pokémon 5 Étoiles", 167: "Pokémon Crache Fil", 168: "Pokémon Long-Patte", 169: "Pokémon Chovsouris", 170: "Pokémon Poisson", 171: "Pokémon Lumière", 172: "Pokémon Minisouris", 173: "Pokémon Étoile", 174: "Pokémon Bouboule", 175: "Pokémon Balle Pic", 176: "Pokémon Bonheur", 177: "Pokémon Minoiseau", 178: "Pokémon Mystique", 179: "Pokémon Laine", 180: "Pokémon Laine", 181: "Pokémon Lumière", 182: "Pokémon Fleur", 183: "Pokémon Aquasouris", 184: "Pokémon Aqualapin", 185: "Pokémon Imitation", 186: "Pokémon Grenouille", 187: "Pokémon Pissenlit", 188: "Pokémon Pissenlit", 189: "Pokémon Pissenlit", 190: "Pokémon Longqueue", 191: "Pokémon Graine", 192: "Pokémon Soleil", 193: "Pokémon Translaile", 194: "Pokémon Poisson", 195: "Pokémon Poisson", 196: "Pokémon Soleil", 197: "Pokémon Lune", 198: "Pokémon Obscurité", 199: "Pokémon Royal", 200: "Pokémon Strident", 201: "Pokémon Symbolique", 202: "Pokémon Patient", 203: "Pokémon Long-Cou", 204: "Pokémon Ver Caché", 205: "Pokémon Ver Caché", 206: "Pokémon Serpent", 207: "Pokémon Scorpivol", 208: "Pokémon Serpenfer", 209: "Pokémon Fée", 210: "Pokémon Fée", 211: "Pokémon Bouboule", 212: "Pokémon Pince", 213: "Pokémon Pourri", 214: "Pokémon Unicorne", 215: "Pokémon Grifacérée", 216: "Pokémon Mini Ours", 217: "Pokémon Hibernant", 218: "Pokémon Lave", 219: "Pokémon Lave", 220: "Pokémon Cochon", 221: "Pokémon Porc", 222: "Pokémon Corail", 223: "Pokémon Jet", 224: "Pokémon Jet", 225: "Pokémon Livraison", 226: "Pokémon Cervolant", 227: "Pokémon Armoiseau", 228: "Pokémon Sombre", 229: "Pokémon Sombre", 230: "Pokémon Dragon", 231: "Pokémon Long-Nez", 232: "Pokémon Armure", 233: "Pokémon Virtuel", 234: "Pokémon Maxi Corne", 235: "Pokémon Peintre", 236: "Pokémon Bagarreur", 237: "Pokémon Poirier", 238: "Pokémon Bisou", 239: "Pokémon Électrique", 240: "Pokémon Charbon", 241: "Pokémon Vachalait", 242: "Pokémon Bonheur", 243: "Pokémon Foudre", 244: "Pokémon Volcan", 245: "Pokémon Aurore", 246: "Pokémon Peaupierre", 247: "Pokémon Carapadure", 248: "Pokémon Armure", 249: "Pokémon Plongeon", 250: "Pokémon Arcenciel", 251: "Pokémon Temporel"})
DESCRIPTIONS.update({
    152: "La feuille sur sa tête capte le moindre rayon de soleil. Aime les pauses au parc, surtout celles qui durent.",
    153: "Les bourgeons de son cou embaument l'air autour de lui. Une marche à ses côtés, et la mauvaise humeur reste en chemin.",
    154: "Son parfum calme les plus agités. Dans un groupe de randonnée, c'est celui qui empêche tout le monde de se disputer sur le chemin à prendre.",
    155: "Sa flamme jaillit du dos dès qu'on le surprend. Le reste du temps, il préfère rester roulé en boule, ce qui n'a jamais fait gagner une course.",
    156: "Les flammes de son cou font fuir les curieux. Rapide et vif, il esquive mieux qu'il n'attaque.",
    157: "Une crinière de feu qui s'embrase quand il se fâche. L'air tremble autour de lui, et ce n'est pas seulement à cause de la chaleur.",
    158: "Mord tout ce qui bouge, sans méchanceté, par simple curiosité. Ses dresseurs apprennent vite à garder leurs distances.",
    159: "Une fois ses crocs plantés, il ne lâche plus. Une ténacité qui ferait merveille sur une barre de traction.",
    160: "Malgré son gabarit, il démarre comme une flèche. Sa mâchoire en a découragé plus d'un avant même le début du combat.",
    161: "Se dresse sur sa queue pour surveiller les environs. Une sentinelle infatigable, à condition qu'il reste quelque chose à grignoter.",
    162: "Si long et si fin qu'il se faufile partout. Son nid est un vrai labyrinthe, et lui seul en connaît la sortie.",
    163: "Toujours sur une seule patte, l'autre bien au chaud. Son horloge interne ne se trompe jamais d'une minute.",
    164: "Tourne la tête presque en entier sans bouger le corps. Rien ne lui échappe dans la nuit, pas même un souffle.",
    165: "Vit en essaim et panique dès qu'il se retrouve seul. La preuve qu'il vaut mieux s'entraîner à plusieurs.",
    166: "Les étoiles de son dos brillent à la tombée de la nuit. Il sort quand les autres rentrent, et dessine des constellations en volant.",
    167: "Patiente des heures sur sa toile sans bouger d'un millimètre. Un gainage que personne d'autre ne tiendrait.",
    168: "Son fil est assez solide pour le porter partout, et il rentre à la maison en le suivant. Jamais perdu, même sans carte.",
    169: "Quatre ailes, et aucun bruit. Ses vols de nuit sont si silencieux qu'on ne découvre son passage qu'au matin.",
    170: "Ses antennes clignotent pour discuter avec ses semblables au fond de l'eau. Une conversation qu'on devine sans jamais la comprendre.",
    171: "Sa lumière guide les marins par nuit noire. Vu du rivage, on le prendrait pour une étoile tombée à la mer.",
    172: "Encore incapable de maîtriser son électricité, il se décharge dès qu'il rit. Ses camarades de jeu ont les cheveux dressés.",
    173: "On dit qu'il descend sur Terre les nuits d'étoiles filantes. Tout petit, et déjà du mal à garder les pieds au sol.",
    174: "Tout rond, tout mou, et très fier de ses rebonds. Sa carrière en saut en hauteur s'arrête là où commence le vent.",
    175: "Sa coquille renferme, dit-on, tout ce qu'il y a de bon. Il suffit de le voir sourire pour avoir envie de le croire.",
    176: "Ne se montre qu'auprès de ceux qui se montrent gentils. Ses ailes répandent une poudre qui donne le sourire.",
    177: "Trop petit pour voler loin, il sautille de branche en branche. Son regard fixe finit toujours par mettre mal à l'aise.",
    178: "Reste immobile face au soleil toute la journée. On raconte qu'il voit l'avenir d'un œil et le passé de l'autre.",
    179: "Sa laine accumule l'électricité à chaque frottement. Mieux vaut éviter les câlins par temps sec.",
    180: "Sa toison a laissé place à une peau lisse, qui encaisse mieux la tension. Une transformation physique bien visible, sans régime particulier.",
    181: "La boule au bout de sa queue se voit depuis l'espace, paraît-il. En mer, on l'a longtemps pris pour un phare.",
    182: "Danse dès que le soleil revient. Après une longue pluie, on peut en voir des dizaines se trémousser au même rythme.",
    183: "Sa queue flotte à la surface comme une bouée et lui évite de couler. Le meilleur moyen de rendre la natation sans effort.",
    184: "De longues oreilles qui entendent tout sous l'eau, et une force étonnante dans les pattes. Ne pas se fier à son air de peluche.",
    185: "Se fait passer pour un arbre, alors qu'il n'aime pas l'eau. La plus mauvaise cachette du monde dès que l'arrosoir sort.",
    186: "Son cri fait accourir tous les Ptitard des environs. Un vrai entraîneur de groupe, qui gonfle les joues pour se faire entendre.",
    187: "Si léger qu'une petite brise l'emporte. Il s'accroche aux autres pour rester sur place, comme quoi la légèreté a ses limites.",
    188: "Sa fleur s'ouvre dès qu'il fait beau et lui sert de thermomètre. Il flotte juste assez haut pour regarder les autres marcher.",
    189: "Se laisse porter par les vents d'une région à l'autre. Un tour du monde complet, sans un seul pas au compteur.",
    190: "Sa queue fait tout : attraper, grimper, ouvrir les fruits. À force, ses vraies mains ont presque oublié à quoi elles servent.",
    191: "Tombe du ciel sans prévenir et reste planté là où il atterrit. Une entrée dans le monde assez peu glorieuse.",
    192: "Suit le soleil toute la journée, puis s'arrête net au coucher. Personne ne respecte mieux son rythme de sommeil.",
    193: "Peut virer à angle droit en plein vol sans ralentir. Ses battements d'ailes font vibrer les vitres jusqu'à les briser.",
    194: "Sort de l'eau quand le froid arrive et avance à son rythme sur la berge. Une marche lente, mais qui ne s'arrête jamais.",
    195: "Toujours le même sourire tranquille, même quand il se cogne contre les rochers. On lui envierait presque cette sérénité.",
    196: "Son pelage sent la moindre variation de l'air, et il devine ce que va faire son adversaire. Pas besoin d'échauffement quand on sait tout à l'avance.",
    197: "Ses anneaux s'allument les nuits de pleine lune. Il préfère ses sorties au clair de lune, loin de la foule.",
    198: "Sa présence passe pour un mauvais présage, ce qui l'amuse beaucoup. Il préfère les balades de nuit, quand personne ne le voit passer.",
    199: "Le coquillage sur sa tête a libéré une intelligence hors du commun. Il réfléchit tant qu'il oublie parfois de bouger.",
    200: "Adore les cris de surprise. Ses plaisanteries de minuit en ont fait se lever plus d'un, bien avant le réveil.",
    201: "Vingt-huit formes différentes, et personne ne sait encore ce qu'elles veulent dire. Les archéologues y ont laissé leurs meilleures années.",
    202: "Encaisse tout sans jamais frapper le premier. Il se cache dans le noir, et sa queue, elle, garde un secret bien gardé.",
    203: "Sa seconde tête, au bout de la queue, ne dort jamais. Un partenaire d'entraînement toujours là pour surveiller ses arrières.",
    204: "Accroché à sa branche, il attend sans bouger qu'on l'approche de trop près. La sieste la plus dangereuse de la forêt.",
    205: "Une coquille d'acier qui ne s'ouvre presque jamais. Pour savoir ce qu'il y a dedans, il faudra se lever de bonne heure.",
    206: "Creuse des galeries très compliquées avec sa queue, puis s'enfuit à reculons dès qu'on le regarde. Bon courage pour le suivre.",
    207: "Plane sans un bruit et se pose droit sur le visage de sa proie. Sa technique de vol est bien plus travaillée que son atterrissage.",
    208: "Son corps a durci sous des pressions énormes, bien plus bas que les plus profondes galeries. Une transformation qui force le respect.",
    209: "Cette grosse mâchoire fait fuir les passants, alors qu'il cherche seulement de la compagnie. Quand on le connaît, c'est une vraie crème.",
    210: "Ses crocs sont si lourds qu'il doit pencher la tête en arrière. Timide au fond, il ne mord qu'en cas de frayeur.",
    211: "Avale de l'eau pour se gonfler et projette ses épines dans toutes les directions. Sa respiration est son point fort.",
    212: "Ses pinces d'acier écrasent tout. Ses ailes ne servent presque plus à voler, mais elles règlent parfaitement sa température pendant l'effort.",
    213: "Conserve des baies au fond de sa coquille jusqu'à ce qu'elles fermentent. Une boisson d'après-séance à éviter absolument.",
    214: "Soulève cent fois son poids avec sa corne et projette ses adversaires au loin. Aucun autre insecte ne passe autant de temps à la salle.",
    215: "Griffes acérées et regard en coin. Il escalade les arbres pour voler les œufs, et son record ne risque pas d'être homologué.",
    216: "Se lèche les pattes couvertes de miel à longueur de journée. Son programme d'entraînement commence toujours demain.",
    217: "Le matin, il suit le même sentier forestier pour chercher sa nourriture. Sa régularité finit par laisser des traces dans le sol.",
    218: "De la lave à la place du sang : s'il s'arrête de bouger, il refroidit et durcit. Une excellente raison de ne jamais rester assis.",
    219: "Sa coquille est si chaude qu'elle fait fondre la pluie avant qu'elle ne le touche. Le rêve par mauvais temps, pour sortir sans parapluie.",
    220: "Fouille la terre gelée de son nez à la recherche de champignons. Le froid ne l'arrête jamais, et il en sort tout content.",
    221: "Son épaisse fourrure lui cache complètement les yeux. Il charge droit devant lui, et le terrain se chargera du reste.",
    222: "Ses branches repoussent quand elles se brisent. Les récifs où il vit sont un bon exemple de récupération après l'effort.",
    223: "Vise juste, même à plusieurs mètres, d'un jet d'eau bien placé. Son entraînement à la cible dure depuis des générations.",
    224: "S'installe dans un trou de rocher et n'en sort que pour attraper ce qui passe. Ses huit bras sont aussi utiles qu'encombrants.",
    225: "Traîne toute l'année un sac rempli de cadeaux pour qui s'est perdu en montagne. Ses journées à porter sa charge valent bien une randonnée.",
    226: "Glisse au-dessus des vagues comme s'il volait. Par beau temps, il saute hors de l'eau pour le seul plaisir.",
    227: "Son corps d'acier cache des ailes aussi fines qu'un couteau. Une carapace très lourde, qui ne l'empêche pas de voler à toute vitesse.",
    228: "Chasse en meute, et ses aboiements se répondent d'une colline à l'autre. Une sortie de groupe qu'on préfère éviter la nuit.",
    229: "Son hurlement glace le sang de quiconque l'entend. Il fume un peu quand il s'énerve : mieux vaut lui laisser de l'avance.",
    230: "Dort au fond des mers et ne remonte que pour les tempêtes. On dit que ses bâillements font naître les tourbillons.",
    231: "Trop petit pour porter ses oreilles sans trébucher. Son nez se lève pour dire bonjour, ou pour vous arroser sans prévenir.",
    232: "Roule en boule à toute allure et ne sait pas très bien freiner. Très fort en descente, nettement moins au moment de s'arrêter.",
    233: "Mise à jour de la version précédente, et ça se voit. Il a appris tout seul quelques gestes qu'on ne lui a jamais montrés.",
    234: "Ses bois donnent le vertige à ceux qui les regardent trop longtemps. Les passants le croisent souvent sans se souvenir de l'avoir vu.",
    235: "Trace sa signature partout où il passe, avec la peinture de sa queue. Chaque Queulorior a la sienne, et aucun ne veut en changer.",
    236: "Toujours à provoquer le premier venu, surtout s'il est plus grand. Il perd souvent, recommence aussitôt, et finit par progresser.",
    237: "Se bat sur la tête en tournant sur lui-même. Ses cours de gym ont dû être très particuliers.",
    238: "Passe son temps à tout tester avec ses lèvres. Elle balance ses bras en marchant, comme si elle comptait les pas.",
    239: "Fait tourner ses bras pour charger son électricité. Quand il s'arrête, il se vide : la meilleure raison au monde de continuer à bouger.",
    240: "Sa température monte très haut dès qu'il s'agite, et il crache de petites étincelles. Un vrai petit échauffement à lui tout seul.",
    241: "Son lait est tellement bon que tout le monde vient en demander. Une boisson de récupération que les sportifs de la région connaissent bien.",
    242: "Sent la tristesse à des kilomètres et accourt avec un œuf pour réconforter. Personne n'a encore réussi à finir une mauvaise journée près d'elle.",
    243: "On dit qu'il est né de la foudre tombée sur une tour en flammes. Il traverse la région à toute vitesse, et le tonnerre arrive après lui.",
    244: "Chaque fois qu'un volcan se réveille, il en naîtrait un nouveau. Ceux qui l'ont croisé parlent surtout de la chaleur, jamais du reste.",
    245: "Il court sur l'eau sans la troubler, porté par le vent du nord. Là où il passe, même la mare la plus sale redevient claire.",
    246: "Naît sous terre et doit manger toute une montagne avant de voir le jour. Pour un début d'entraînement, on a vu plus simple.",
    247: "Enfermé dans sa carapace, il s'agite et creuse sous pression. On l'entend gronder d'en bas : quelque chose se prépare.",
    248: "Ses pas font trembler le sol, et les montagnes changent de forme sur son passage. Il cherche sans cesse un adversaire à sa hauteur.",
    249: "Dort au fond d'une fosse marine, car le moindre battement de ses ailes déclenche une tempête. Il préfère éviter de s'entraîner en public.",
    250: "Ses plumes laissent un arc-en-ciel derrière lui. Il ne se montre qu'à ceux qui ont le cœur pur et de bonnes jambes pour monter jusqu'en haut de la tour.",
    251: "Voyage dans le temps pour veiller sur les forêts. Là où il passe, l'herbe repousse ; et certains assurent l'avoir vu demain.",
})
