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
