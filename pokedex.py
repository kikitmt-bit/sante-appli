"""Les 151 Pokémon de la 1re génération : numéro, nom français, types (types actuels : Mélofée est Fée, Magnéti Acier…).
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
"""

POKEMON = {}  # numéro -> {"nom", "types"}
for _i, _p in enumerate(_LISTE.split(), 1):
    _nom, _types = _p.split(":")
    POKEMON[_i] = {"nom": _nom.replace("_", " "), "types": _types.split("/")}
assert len(POKEMON) == 151

LEGENDAIRES = [144, 145, 146, 150, 151]  # seulement dans les Master Balls

COULEURS_TYPES = {
    "Normal": "#A8A77A", "Feu": "#EE8130", "Eau": "#6390F0", "Électrik": "#F7D02C", "Plante": "#7AC74C",
    "Glace": "#96D9D6", "Combat": "#C22E28", "Poison": "#A33EA1", "Sol": "#E2BF65", "Vol": "#A98FF3",
    "Psy": "#F95587", "Insecte": "#A6B91A", "Roche": "#B6A136", "Spectre": "#735797", "Dragon": "#6F35FC",
    "Acier": "#B7B7CE", "Fée": "#D685AD",
}

# Poids officiels en kg (Pokédex, données PokeAPI) : pour comparer les pesées de Kiki à des Pokémon
POIDS = {1: 6.9, 2: 13, 3: 100, 4: 8.5, 5: 19, 6: 90.5, 7: 9, 8: 22.5, 9: 85.5, 10: 2.9, 11: 9.9, 12: 32, 13: 3.2, 14: 10, 15: 29.5, 16: 1.8, 17: 30, 18: 39.5, 19: 3.5, 20: 18.5, 21: 2, 22: 38, 23: 6.9, 24: 65, 25: 6, 26: 30, 27: 12, 28: 29.5, 29: 7, 30: 20, 31: 60, 32: 9, 33: 19.5, 34: 62, 35: 7.5, 36: 40, 37: 9.9, 38: 19.9, 39: 5.5, 40: 12, 41: 7.5, 42: 55, 43: 5.4, 44: 8.6, 45: 18.6, 46: 5.4, 47: 29.5, 48: 30, 49: 12.5, 50: 0.8, 51: 33.3, 52: 4.2, 53: 32, 54: 19.6, 55: 76.6, 56: 28, 57: 32, 58: 19, 59: 155, 60: 12.4, 61: 20, 62: 54, 63: 19.5, 64: 56.5, 65: 48, 66: 19.5, 67: 70.5, 68: 130, 69: 4, 70: 6.4, 71: 15.5, 72: 45.5, 73: 55, 74: 20, 75: 105, 76: 300, 77: 30, 78: 95, 79: 36, 80: 78.5, 81: 6, 82: 60, 83: 15, 84: 39.2, 85: 85.2, 86: 90, 87: 120, 88: 30, 89: 30, 90: 4, 91: 132.5, 92: 0.1, 93: 0.1, 94: 40.5, 95: 210, 96: 32.4, 97: 75.6, 98: 6.5, 99: 60, 100: 10.4, 101: 66.6, 102: 2.5, 103: 120, 104: 6.5, 105: 45, 106: 49.8, 107: 50.2, 108: 65.5, 109: 1, 110: 9.5, 111: 115, 112: 120, 113: 34.6, 114: 35, 115: 80, 116: 8, 117: 25, 118: 15, 119: 39, 120: 34.5, 121: 80, 122: 54.5, 123: 56, 124: 40.6, 125: 30, 126: 44.5, 127: 55, 128: 88.4, 129: 10, 130: 235, 131: 220, 132: 4, 133: 6.5, 134: 29, 135: 24.5, 136: 25, 137: 36.5, 138: 7.5, 139: 35, 140: 11.5, 141: 40.5, 142: 59, 143: 460, 144: 55.4, 145: 52.6, 146: 60, 147: 3.3, 148: 16.5, 149: 210, 150: 122, 151: 4}
