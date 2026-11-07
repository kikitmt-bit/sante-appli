"""Le jeu Pokémon : on gagne des Poké Balls en faisant du sport, jamais en ne faisant rien. Réglages : audit du 02/11.

- La **barre d'effort** se remplit avec les pas (au-delà des 1 000 de la vie à la maison), les minutes de sport (zone
  cardio intense ou maximum, jaune et rouge sur la montre : 5 points la minute) et les séances de sport (musculation,
  pompes, tractions, rameur : 2 points par minute ; pas la marche, ses pas comptent déjà) ; elle ne se vide pas le soir. Barre pleine (100 points)
  = une Poké Ball, dont les types favoris dépendent de ce qui a le plus rempli la barre ce jour-là.
- **Super Ball** : journée « objectif double » (5 000 pas ET 10 min de sport), ou n'importe quel exploit. Shiny ×2.
- **Hyper Ball** : exploit du jour (10 000 pas, 25 min de sport ou une séance de 45 min). Shiny ×4.
- **Shiny Ball** : 25 jours avec l'objectif (5 000 pas, 10 min de sport ou 15 points de muscu) sur les 30 derniers, ou un sanctuaire dont on a
  déjà le légendaire : un shiny garanti parmi les Pokémon déjà attrapés.
- **Starter** : il gagne un niveau tous les `pts_niveau` points d'effort et évolue aux niveaux de `evolutions` (16 et 36, comme
  dans les jeux). Ses évolutions ne sortent plus des balls : elles se méritent.
- **Anniversaire** : une Shiny Ball si on ouvre l'appli ce jour-là, une par an (voir `charger_jeu`).
- **Légendaires** : les oiseaux dans leurs sanctuaires (kanto.SANCTUAIRES), Mewtwo à la Ligue, Mew au Pokédex complet
  (les 146 autres). Toute petite chance par ball (`legende_chance`) de tomber sur un oiseau avant, une seule fois par région.
- Une nuit de 7 h ne donne pas de Poké Ball mais rend les shiny plus fréquents toute la journée (×1,5).
- **Voyage dans Kanto** (kanto.py) : on n'attrape que dans les lieux déjà atteints (`part_lieu` = lieu actuel, le reste en
  rattrapage). Plus rien de nouveau : les `sac` premières balls attendent le lieu suivant, les autres partent en **chasse
  aux shiny** (`chasse`, puis la même chose en plus à chaque ball ratée ; ratée = le Pokémon s'enfuit, « rate » dans la capture).
- **Arène** : dès le lendemain de l'arrivée, tant que le champion n'est pas battu, Super Ball, Hyper Ball et mission sont
  retenues ; les Poké Balls sans rien de nouveau attendent, sans chasse. Le champion rend ce qui a été gagné sur les `rend`
  derniers jours ; le reste est perdu. Foncer rapporte donc toujours plus que traîner.
- **Fin de Kanto** : après la Ligue, plus de sac : tout sert à finir Kanto (Pokémon manquants, puis chasse). Une région
  suivante commencera sac vide et barre à zéro.

Le Pokédex : une entrée par espèce, en normal et en shiny. Jamais de doublon.

Tout est rejouable : chaque capture a un identifiant (« 2026-11-02-p4#poke3 », voir `ident`) qui sert de graine au hasard,
donc les mêmes données donnent toujours les mêmes Pokémon. Mais le tirage dépend des chiffres du jour : le calcul de la
montre (montre.py, après chaque récolte + chaque heure) fige donc toutes les captures dans data/pokemon/captures_v2.json
(branche data) : une capture figée ne change plus jamais. Une ball qui attend (sac, retenue par le champion) n'est pas
encore une capture ; elle garde le jour où elle a été gagnée (donc son identifiant) quand elle sort.

    python3 pokemon.py figer DOSSIER_DATA   -> écrit data/pokemon/captures_v2.json (toutes les captures)
"""
import datetime as dt
import json
import math
import random
import re
import sys
from pathlib import Path

import pandas as pd

import chiffres
import missions
import regions
import pesees
import seances_rameur
from pokedex import LEGENDAIRES, POKEMON
from region import Voyage

REGLAGES = {
    # Partie en cours : premier jour et numéro. Recommencer à zéro = nouvelle date + nouveau numéro (les identifiants
    # des balls changent, donc rien de l'ancienne partie ne revient : captures figées, balls ouvertes). Partie 1 : du
    # 19/10 au 26/10 ; parties 2 et 3 (27/10) : pour régler le jeu ; partie 4 (02/11) : les règles de l'audit.
    "debut": dt.date(2026, 11, 2), "partie": 4,
    "shiny": 0.02,                   # chance de shiny de base (3 % avant le lancement du 09/11 : presque un shiny tous les deux jours pour un sportif)
    "shiny_max": 0.5,
    "nuit": 420, "shiny_nuit": 1.5,  # nuit d'au moins 7 h : shiny ×1,5 toute la journée
    "part_lieu": 0.8,                # chance de tirer dans le lieu actuel plutôt qu'en rattrapage (s'il reste des deux)
    "sac": 3,                        # balls qui attendent le lieu suivant quand il n'y a plus rien de nouveau
    "chasse": 0.03,                  # chasse aux shiny : chance de la 1re ball, puis autant en plus à chaque ball ratée
    "niveau_depart": 1, "evolutions": (16, 36),  # le starter : niveaux réglés sur la carte de sa région (pts_niveau), forme finale toujours avant la fin de la carte (Kiki, 05/11)
    # La relance (idée de Kiki, 05/11) : 5 jours de suite sans objectif = pendant 7 jours un objectif à sa portée (sa moyenne de pas + 20 %, entre 2 000 et 5 000, ou 5 min de sport) ; réussi, le jour compte et donne une Poké Ball. Une fois tous les 14 jours au plus : s'arrêter ne doit pas devenir une astuce.
    "relance_jours": 5, "relance_duree": 7, "relance_ecart": 14, "relance_min": 2000, "relance_max": 5000, "relance_sport": 5,
    "bonus_pompe": .5, "bonus_traction": 1.5, "bonus_squat": .25, "bonus_planche": .1, "bonus_gestes_max": 40, "ancien_gestes_max": 25,  # points d'effort par pompe, par traction, par squat, et au plus par jour (25 avant le 04/11)
    "objectif_gestes": 15, "bonus_famille": 15, "familles_semaine": 5, "hebdo_jours": 4,  # audit du 03/11, depuis le 04/11 : 15 points de muscu dans la journée (30 pompes, 10 tractions, 60 squats) = l'objectif du jour est atteint ; chaque famille de sport travaillée dans la semaine : +15 ; les 5 familles (« semaine parfaite », Kiki, 07/11, dès le lancement ; 4 avant) : une Super Ball ; 4 jours d'objectif sur 7 : une Super Ball, jusqu'au lancement seulement (Kiki, 07/11 : seule la semaine parfaite compte)
    "rattrapage": .25, "rattrapage_garde": 8,  # dans une nouvelle région : 25 % de chances d'un Pokémon manquant des régions d'avant, et à coup sûr après 8 balls sans (Kiki, 29/10)
    "pas_moment": 2000, "poids_moment": 3,  # Johto : 2 000 pas le matin ou le soir rendent ses Pokémon 3 fois plus fréquents ce jour-là
    "rend": 3,                       # le champion rend ce qui a été gagné sur tant de derniers jours
    "legende_chance": {"poke": 0.01, "super": 0.025, "hyper": 0.05},  # un oiseau par surprise, un seul par région ; ×10 au lancement (Kiki, 07/11 : un moment exceptionnel, mais qui arrive)
    "barre": 100,                    # points d'effort pour une Poké Ball
    "pas_offerts": 1000,             # les pas de la vie à la maison ne comptent pas
    "seance_min": 10,                # une séance compte à partir de 10 min
    "force": 2, "force_depuis": dt.date(2026, 10, 27), "rameur_simple": dt.date(2026, 11, 5),  # points par minute de musculation (avant le 27/10 : 1) ; le rameur compte double jusqu'au 04/11, puis comme les autres sports : il fait monter le cœur, ses minutes de sport le récompensent déjà (Kiki, 04/11)
    "master_jours": 25, "master_fenetre": 30,  # jours avec l'objectif sur les 30 derniers pour un légendaire
    "objectif_pas": 5000, "objectif_zone": chiffres.OBJECTIFS["zone_sport"],
    # Les objectifs du jour qui s'adaptent (Kiki, 07/11) : les pas bougent de 10 % chaque lundi selon la semaine d'avant (presque toujours réussi : un cran
    # au-dessus ; rarement : un cran en dessous) ; la muscu démarre à 10 points, passe à 15 après 2 réussites, à 20 si on la fait souvent (4 jours sur 7),
    # et retombe à 15 si on la délaisse, jamais à 10. Les minutes de sport restent à 10 (beaucoup de montres n'en donnent pas), les exploits ne bougent pas.
    "paliers_pas": (4500, 5000, 5500), "pas_monte": .85, "pas_descend": .35,
    "paliers_gestes": (10, 15, 20), "gestes_debut": 2, "gestes_souvent": 4, "gestes_oubli": 2,
    "niveau_max": 100,  # le niveau du starter, comme dans les jeux
    "exploit_pas": 10000, "exploit_zone": 25, "exploit_seance": 45,
    # 01/11 (Kiki) : les « minutes en zone » de Google comptent la zone modérée (verte, dès 108 bpm), atteinte en marchant
    # ou assis le cœur un peu haut (soirée) : 323 min le 31/10 pour une journée de marche. Le jeu ne compte plus que les
    # minutes de vrai sport, zone intense ou maximum (jaune / rouge, dès 132 bpm : 60 % de la réserve cardiaque, seuil
    # de Google qui suit l'âge et le cœur au repos), 5 points la minute (20 min = une Poké Ball). Avant cette date :
    # l'ancien calcul (toutes les minutes en zone, cardio comptée 4 fois par erreur, 2 points, 15 / 30 min) pour que
    # rien ne bouge dans le passé (captures, carte).
    "zone_depuis": dt.date(2026, 11, 1), "zone_points": 5,
    "ancien_zone": {"points": 2, "objectif": 15, "exploit": 30},
    # Pesée (29/10, demande de Kiki : il oublie de se peser) : chaque pesée du matin (avant midi : même poids qu'au
    # réveil s'il n'a pas mangé) = +10 points d'effort, une par jour ; objectif affiché : 3 par semaine (stats fiables).
    # Plus de Poké Ball pour la pesée (Kiki : « trop bien comme cadeau »).
    "pesees": 7, "pesee_avant": 12, "bonus_pesee": 3, "ancien_bonus_pesee": 10,  # dès le lancement (Kiki, 07/11) : 3 points chaque matin, sans plafond (une pesée par jour donne les données les plus fiables) ; avant : 10, 3 par semaine
}

# Le lancement (Kiki, 06/11) : le lundi 9 novembre 2026 à 4 h 30, heure de Paris, la partie repart de zéro toute seule, pour tous les joueurs. Une fois passé, ce bloc peut disparaître
# (avec "debut" et "partie" écrits en dur dans REGLAGES). Les données de sport ne bougent pas.
LANCEMENT = dt.datetime(2026, 11, 9, 4, 30, tzinfo=chiffres.TZ)


def au_lancement(maintenant=None):
    """Passe à la partie du lancement si l'heure est venue. Appelé à chaque calcul : l'appli reste allumée d'un jour à l'autre, un réglage lu une seule fois ne bougerait jamais."""
    if REGLAGES["partie"] == 4 and (maintenant or dt.datetime.now(chiffres.TZ)) >= LANCEMENT:
        REGLAGES.update(debut=LANCEMENT.date(), partie=5)


BALLS = {  # shiny : multiplicateur ; nouvelle : chance d'une espèce jamais vue
    "poke": {"nom": "Poké Ball", "shiny": 1, "nouvelle": 0},
    "super": {"nom": "Super Ball", "shiny": 2, "nouvelle": 0.5},
    "hyper": {"nom": "Hyper Ball", "shiny": 4, "nouvelle": 1},
    "master": {"nom": "Master Ball", "shiny": 1, "nouvelle": 1},
    "shiny": {"nom": "Shiny Ball", "shiny": 1, "nouvelle": 0},
    "evo": {"nom": "Évolution", "shiny": 0, "nouvelle": 1},  # pas une vraie ball : la scène d'évolution du starter
}

# Ce qui remplit la barre : (icône, libellé, types favoris quand c'est ce qui a le plus rempli la barre du jour)
SOURCES = {
    "pas": ("👟", "Pas", None),
    "zone": ("🔥", "Minutes de sport", ["Feu", "Électrik", "Combat", "Dragon"]),
    "etages": ("🪜", "Étages", ["Roche", "Sol", "Acier"]),
}
SPORTS = {  # séances : type Google -> (icône, nom, types favoris)
    "WALKING": ("🌳", "Marche", ["Plante", "Insecte", "Poison"]),
    "OUTDOOR_BIKE": ("🚴", "Vélo", ["Vol", "Normal"]), "BIKING": ("🚴", "Vélo", ["Vol", "Normal"]),
    "ROWING_MACHINE": ("🚣", "Rameur", ["Eau", "Glace"]), "SWIMMING": ("🏊", "Natation", ["Eau", "Glace"]),
    "ELLIPTICAL": ("🏞️", "Elliptique", ["Psy", "Spectre", "Fée"]),
    "RUNNING": ("🏃", "Course", ["Feu", "Combat"]),
}
SPORT_AUTRE = ("💪", "Sport", None)
MUSCU = ("🏋️", "Musculation", ["Combat", "Acier"])
# Séances qui comptent comme de la force (2 points par minute) : rameur et tout ce qui ressemble à de la musculation
FORCE_TYPES = ("ROWING", "STRENGTH", "WEIGHT", "CALISTHENIC", "CIRCUIT", "HIIT", "CROSSFIT", "CORE", "BOOTCAMP",
               "FUNCTIONAL", "INTERVAL")
FORCE_NOMS = ("muscu", "renfo", "force", "poids", "haltère", "pompe", "traction", "gainage", "circuit", "hiit",
              "crossfit", "fractionné", "rameur", "strength", "weight", "rowing")

LIGNES = {n: [n, n + 1, n + 2] for r in regions.REGIONS for n in r.starters}  # le cadeau du professeur de chaque région et ses évolutions


def pts_niveau(region=None):
    """Les points d'un niveau du starter : un 36e de la carte, pour qu'il soit au niveau 36 (sa forme finale) avant d'arriver au bout."""
    return int((region or regions.REGIONS[0]).dist[-1] // REGLAGES["evolutions"][-1])


def niveau(points, region=None):
    """Le niveau du starter, d'après les points depuis le début de la région (ceux du vélo compris : la carte ne doit jamais passer devant)."""
    return min(REGLAGES["niveau_depart"] + int(points // pts_niveau(region)), REGLAGES["niveau_max"])

NOMS_FAMILLES = {"marche": "la marche", "cardio": "le cardio", "pousser": "les bras", "tirer": "le dos", "jambes": "les jambes"}

# Les images (dépôt public PokeAPI/sprites)
IMAGES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites"


def image(num, shiny=False):
    """La petite image (96 px) d'un Pokémon, normale ou shiny."""
    return f"{IMAGES}/pokemon/{'shiny/' if shiny else ''}{num}.png"


FIGEES = "data/pokemon/captures_v2.json"
OUVERTES = "data/pokemon/ouvertes.json"  # Poké Balls ouvertes, partagées par la montre et le téléphone (script Google)


def equitable(jour):
    """Le même effort vaut la même chose pour tous, quelle que soit la montre (règles du 04/11) : les étages ne donnent plus de points
    (toutes les montres ne les comptent pas) et la marche n'est plus une séance (ses pas comptent déjà). Jour inconnu : oui."""
    return jour is None or jour >= missions.NOUVELLES


def nouveau(jour):
    """Le jour suit-il les règles des minutes de sport (zone jaune / rouge) ? (jour inconnu : oui)"""
    return jour is None or jour >= REGLAGES["zone_depuis"]


def seuils_zone(m):
    """(points par minute, objectif, exploit) des minutes en zone selon le jour des mesures m."""
    if m.get("nouveau", True):
        return REGLAGES["zone_points"], REGLAGES["objectif_zone"], REGLAGES["exploit_zone"]
    a = REGLAGES["ancien_zone"]
    return a["points"], a["objectif"], a["exploit"]


def points_par_source(pas, zone, etages, sport, force=0.0, par_min=None):
    """Points d'effort d'une journée, par source (zone = minutes de sport jaune / rouge ; sport = minutes des séances
    d'au moins 10 min, dont force = minutes de musculation / rameur, qui comptent double)."""
    par_min = REGLAGES["zone_points"] if par_min is None else par_min
    return {"pas": max(pas - REGLAGES["pas_offerts"], 0) / 100, "zone": par_min * zone, "etages": etages,
            "sport": sport + (REGLAGES["force"] - 1) * force}


def est_force(c):
    """Séance de musculation (pompes, tractions, poids…) ou de rameur, d'après son type ou son nom (les défis de force les acceptent tous)."""
    t, nom = (c.get("exerciseType") or "").upper(), (c.get("displayName") or "").lower()
    return any(f in t for f in FORCE_TYPES) or any(f in nom for f in FORCE_NOMS)


def compte_double(c, jour=None):
    """Cette séance vaut-elle double ? La muscu, qui fait peu monter le cœur ; plus le rameur depuis REGLAGES["rameur_simple"]."""
    rameur = "ROWING" in (c.get("exerciseType") or "").upper() or "rameur" in (c.get("displayName") or "").lower()
    return est_force(c) and not (rameur and (jour is None or jour >= REGLAGES["rameur_simple"]))


def mesures(s, exercices, jour=None):
    """Les chiffres du jour utilisés par le jeu : pas, zone, étages, sommeil, minutes de sport par type de séance."""
    m = {k: s[k] if pd.notna(s.get(k)) else 0 for k in ("pas", "zone", "etages", "sommeil")}
    m["nouveau"] = nouveau(jour)
    if m["nouveau"]:  # minutes de sport (jaune / rouge)
        m["zone"] = s["zone_sport"] if pd.notna(s.get("zone_sport")) else 0
    elif pd.notna(s.get("zone_cardio_x2")):  # l'ancien calcul, à l'identique (cardio et pic comptés 4 fois)
        m["zone"] += s["zone_cardio_x2"]
    m["sports"], m["seance_max"], m["force"], m["nb_force"], m["eau"] = {}, 0, 0, 0, 0
    double = 0
    for c in exercices:
        minutes = chiffres.duree(c.get("activeDuration")) / 60
        if minutes >= REGLAGES["seance_min"] and not (equitable(jour) and chiffres.est_marche(c)):
            t = c.get("exerciseType") or "OTHER"
            if "ROWING" in t or "SWIM" in t:
                m["eau"] += minutes
            if est_force(c):
                m["force"] += minutes
                m["nb_force"] += 1
                double += minutes if compte_double(c, jour) else 0
            if t not in SPORTS and (est_force(c) or "ROWING" in t or "SWIM" in t):  # musculation : ses types (Combat, Acier), voir sport_principal
                t = "FORCE"
            m["sports"][t] = m["sports"].get(t, 0) + minutes
            m["seance_max"] = max(m["seance_max"], minutes)
    m["sport"] = sum(m["sports"].values())
    force = double if jour is None or jour >= REGLAGES["force_depuis"] else 0
    m["points"] = points_par_source(m["pas"], m["zone"], 0 if equitable(jour) else m["etages"], m["sport"], force, seuils_zone(m)[0])
    return m


def sport_principal(m):
    if not m["sports"]:
        return SPORT_AUTRE
    t = max(m["sports"], key=m["sports"].get)
    return MUSCU if t == "FORCE" else SPORTS.get(t) or (SPORTS["BIKING"] if "BIK" in t else SPORT_AUTRE)  # tout vélo, d'appartement compris


def origine_barre(m):
    """(icône, libellé, types) de ce qui a le plus rempli la barre ce jour-là, sans compter les pas (ils sont là presque
    tous les jours) : zone, étages, séances, pompes et squats dès 10 points, sinon les pas (tous les types). Une séance d'un sport qui a ses
    types passe avant les minutes de sport, qui valent 5 fois plus : sinon le rameur ne donnerait jamais Eau et Glace (Kiki, 05/11)."""
    autres = {k: v for k, v in {**m["points"], "gestes": m.get("gestes_pts", 0)}.items() if k != "pas" and v >= 10}
    if sport_principal(m)[2]:
        autres.pop("zone", None)
    cle = max(autres, key=autres.get) if autres else "pas"
    return MUSCU if cle == "gestes" else sport_principal(m) if cle == "sport" else SOURCES[cle]


def exploit(m):
    """L'exploit du jour (pour l'Hyper Ball), ou None."""
    if m["seance_max"] >= REGLAGES["exploit_seance"]:
        ic, nom, types = sport_principal(m)
        return ic, f"Séance de {m['seance_max']:.0f} min ({nom})", types
    if m["zone"] >= seuils_zone(m)[2]:
        return "🔥", f"{m['zone']:.0f} min {'de sport' if m.get('nouveau', True) else 'en zone'}", sport_principal(m)[2] or SOURCES["zone"][2]
    if m["pas"] >= REGLAGES["exploit_pas"]:
        return "👟", f"{chiffres.nombre(m['pas'])} pas", None
    return None


def moments_du_jour(ligne):
    """La nouveauté de Johto, le jour et la nuit : d'après la journée (missions.json), ['matin'] si on a bien bougé avant 13 h, ['soir'] après 20 h, ou les deux."""
    ligne, R = ligne or {}, REGLAGES
    return [m for m, pas in (("matin", ligne.get("pas_matin")), ("soir", ligne.get("pas_soir"))) if (pas or 0) >= R["pas_moment"]]


def tirer(graine, possedees, ici, passes, types=None, shiny=0.03, p_nouvelle=0.0, seul_type=None, moment=None):
    """Une capture dans les lieux atteints (ici = lieu actuel, passes = lieux traversés), jamais de doublon, ou None s'il
    n'y a plus d'espèce nouvelle (la ball attend ou part en chasse). types = types favoris de la barre (×3) ; seul_type =
    ball d'arène (ce type s'il en reste) ; moment = {numéro: multiplicateur} (Johto : Pokémon du matin ou du soir)."""
    rng = random.Random(graine)
    especes = {n for n, _ in possedees}
    neufs = [n for n in [*ici, *passes] if n not in especes]
    if not neufs:
        return None
    est_shiny = rng.random() < shiny
    pool = neufs
    if est_shiny and rng.random() >= p_nouvelle:
        pool = [n for n in [*ici, *passes] if (n, True) not in possedees] or neufs
    if seul_type:
        pool = [n for n in pool if seul_type in POKEMON[n]["types"]] or pool
    lieu, autres = [n for n in pool if n in ici], [n for n in pool if n not in ici]
    if lieu and autres:
        pool = lieu if rng.random() < REGLAGES["part_lieu"] else autres
    poids = [(1 / 3 if n in regions.RARES else 1) * (3 if types and set(types) & set(POKEMON[n]["types"]) else 1) * (moment or {}).get(n, 1) for n in pool]
    num = rng.choices(pool, weights=poids)[0]
    return {"num": num, "shiny": est_shiny, "nouvelle": num not in especes}


def chasser(graine, possedees, ici, passes, chaine):
    """Une ball de la chasse aux shiny : Pokémon déjà attrapé pas encore en shiny, chance qui monte à chaque ball ratée. ->
    capture (« rate » = il s'enfuit), ou None s'il n'y a plus rien à chasser."""
    rng = random.Random(f"{graine}#chasse")
    especes = {n for n, _ in possedees}
    pool = [n for n in [*ici, *passes] if n in especes and (n, True) not in possedees]
    if not pool:
        return None
    num = rng.choice(pool)
    if rng.random() < REGLAGES["chasse"] * (chaine + 1):
        return {"num": num, "shiny": True, "nouvelle": False, "chasse": True}
    return {"num": num, "shiny": False, "nouvelle": False, "chasse": True, "rate": True}


def _minute(h):
    """« 18:05:00 » -> minute de la journée (0 à 1439)."""
    try:
        return int(str(h)[:2]) * 60 + int(str(h)[3:5])
    except ValueError:
        return None


def chronologie(fichier, resume, jour):
    """La journée minute par minute (fichier du jour : pas, minutes en zone, étages ; séances du résumé), pour savoir à
    quel moment une Super / Hyper Ball a été gagnée (replay de la carte, 01/11). -> liste de 1 440 tuples cumulés
    (pas, minutes de sport, points d'effort calculés, séance la plus longue finie), ou None sans fichier."""
    t = (fichier or {}).get("types") or {}
    if not t.get("steps"):
        return None
    neuf = nouveau(jour)
    pas, zone, etages, sport, fin_seance = [0.0] * 1440, [0.0] * 1440, [0.0] * 1440, [0.0] * 1440, [0.0] * 1440
    for h, _, n in (t["steps"].get("lignes") or []):
        i = _minute(h)
        if i is not None and n:
            pas[i] += float(n)
    for h, _, z, v in ((t.get("active-zone-minutes") or {}).get("lignes") or []):
        i = _minute(h)
        if i is None or not v:
            continue
        if neuf:  # minutes de sport : zone intense ou maximum, une fois chacune
            zone[i] += 1 if z in ("CARDIO", "PEAK") else 0
        else:  # l'ancien calcul : toutes les minutes en zone, cardio et pic comptés 4 fois
            zone[i] += float(v) * (2 if z in ("CARDIO", "PEAK") else 1)
    for h, _, n in ((t.get("floors") or {}).get("lignes") or []):
        i = _minute(h)
        if i is not None and n and not equitable(jour):
            etages[i] += float(n)
    par_min = seuils_zone({"nouveau": neuf})[0]
    for p in (resume or {}).get("exercise") or []:
        c = chiffres.contenu(p)
        minutes = chiffres.duree(c.get("activeDuration")) / 60
        iv = c.get("interval") or {}
        try:
            debut = dt.datetime.fromisoformat(iv["startTime"].replace("Z", "+00:00")).astimezone(chiffres.TZ)
            fin = dt.datetime.fromisoformat(iv["endTime"].replace("Z", "+00:00")).astimezone(chiffres.TZ)
        except (KeyError, ValueError):
            continue
        if minutes < REGLAGES["seance_min"] or debut.date() != jour or (equitable(jour) and chiffres.est_marche(c)):
            continue
        a = debut.hour * 60 + debut.minute
        b = min(fin.hour * 60 + fin.minute if fin.date() == jour else 1439, 1439)
        pts = minutes * (REGLAGES["force"] if compte_double(c, jour) and jour >= REGLAGES["force_depuis"] else 1)
        for i in range(a, b + 1):
            sport[i] += pts / (b - a + 1)
        fin_seance[b] = max(fin_seance[b], minutes)
    sortie, cp, cz, ce, cs, sm = [], 0.0, 0.0, 0.0, 0.0, 0.0
    for i in range(1440):
        cp, cz, ce, cs, sm = cp + pas[i], cz + zone[i], ce + etages[i], cs + sport[i], max(sm, fin_seance[i])
        sortie.append((cp, cz, max(cp - REGLAGES["pas_offerts"], 0) / 100 + par_min * cz + ce + cs, sm))
    return sortie


def moment(cle, chrono, m, avant, apres):
    """Les points cumulés (depuis le début du jeu) au moment où la ball spéciale `cle` a été gagnée ce jour-là, d'après
    la chronologie (ramenée au vrai total du jour) ; sans chronologie : la fin de la journée."""
    if not chrono or cle not in ("super", "hyper"):
        return apres
    _, obj, exp = seuils_zone(m)
    exploite = lambda x: (x[3] >= REGLAGES["exploit_seance"] or x[1] >= exp  # noqa: E731
                          or x[0] >= REGLAGES["exploit_pas"])
    ok = exploite if cle == "hyper" else lambda x: (x[0] >= obj_pas(m) and x[1] >= obj) or exploite(x)
    i = next((k for k, x in enumerate(chrono) if ok(x)), None)
    total = chrono[-1][2]
    if i is None or total <= 0:
        return apres
    return round(min(avant + chrono[i][2] / total * (apres - avant), apres), 1)


def obj_pas(m):
    """L'objectif de pas de ce jour-là (il s'adapte chaque lundi, voir REGLAGES["paliers_pas"])."""
    return m.get("obj_pas") or REGLAGES["objectif_pas"]


def double_ok(m):
    """Journée « objectif double » : les pas ET les minutes de sport."""
    return m["pas"] >= obj_pas(m) and m["zone"] >= seuils_zone(m)[1]


def super_ok(m):
    """La Super Ball du jour : objectif double, ou n'importe quel exploit (une Hyper Ball sans Super Ball n'aurait pas de sens)."""
    return double_ok(m) or exploit(m) is not None


def objectif_ok(m):
    """Le jour compte pour la Master Ball (5 000 pas ou 10 min de sport)."""
    return m["pas"] >= obj_pas(m) or m["zone"] >= seuils_zone(m)[1]


def balls_du_jour(jour, m, avant, apres, shiny_ball=None, badges=(), debut=None, sanctuaires=(), region=None):
    """Les Poké Balls gagnées un jour : avant / apres = points d'effort cumulés depuis le début du jeu ; shiny_ball = numéro
    de la Shiny Ball gagnée ce jour-là (25 jours sur 30), ou None ; badges = [(numéro, lieu)] des arènes gagnées ce jour-là ;
    sanctuaires = les balls des sanctuaires réussis ce jour-là ; debut = le premier jour du joueur dans la région (par défaut, celui de la
    partie de Kiki) ; region = la région en cours (par défaut, la première)."""
    dues, region = [], region or regions.REGIONS[0]
    if jour == (debut or REGLAGES["debut"]):  # le premier jour de la région : le professeur offre un des 3 starters, au hasard
        dues.append({"cle": region.cadeau[0], "ball": "poke", "raison": region.cadeau[1], "types": None,
                     "parmi": region.starters})
    for k, lieu in badges:
        a = lieu["arene"]
        if a["type"] is None:  # la Ligue : son légendaire
            dues.append({"cle": "ligue", "ball": "master", "raison": "🏆 Champion de la Ligue Pokémon !",
                         "types": None, "fixe": region.ligue})
        else:
            dues.append({"cle": f"badge{k}", "ball": "hyper", "types": None, "seul_type": a["type"], "nouvelle": 1, "champion": a.get("pokemon"),
                         "raison": f"🏅 {a['badge']} ({a['champion']}, {lieu['nom']})"})
    dues += list(sanctuaires)
    if shiny_ball:
        dues.append({"cle": f"shinyball{shiny_ball}", "ball": "shiny", "types": None,
                     "raison": f"👑 {REGLAGES['master_jours']} jours sur {REGLAGES['master_fenetre']}"})
    e = exploit(m)
    if e:
        dues.append({"cle": "hyper", "ball": "hyper", "raison": f"{e[0]} Exploit : {e[1]}", "types": e[2]})
    if super_ok(m):
        dues.append({"cle": "super", "ball": "super", "types": None,
                     "raison": "🎯 Objectif double : pas et minutes de sport" if double_ok(m) else "🎯 Ton exploit du jour"})
    ic, nom, types = origine_barre(m)
    b = REGLAGES["barre"]
    for k in range(math.floor(avant / b) + 1, math.floor(apres / b) + 1):
        dues.append({"cle": f"poke{k}", "ball": "poke", "raison": f"⚡ Barre d'effort n° {k} ({ic} {nom})",
                     "types": types})
    return dues


def pesees_du_jour(resume):
    """Les pesées d'un jour (résumé brut) : [(heure locale décimale, kg, % de graisse ou None)]."""
    gras = {}
    for p in (resume or {}).get("body-fat") or []:
        b = p.get("bodyFat") or {}
        gras[(b.get("sampleTime") or {}).get("physicalTime")] = b.get("percentage")
    sortie = []
    for p in (resume or {}).get("weight") or []:
        w = p.get("weight") or {}
        t = w.get("sampleTime") or {}
        h = (t.get("civilTime") or {}).get("time") or {}
        if w.get("weightGrams"):
            sortie.append((h.get("hours", 0) + h.get("minutes", 0) / 60, w["weightGrams"] / 1000, gras.get(t.get("physicalTime"))))
    return sorted(sortie)


def pesee_matin(resume):
    return any(h < REGLAGES["pesee_avant"] for h, _, _ in pesees_du_jour(resume))


def ident(jour, cle, ami=None):
    """Identifiant d'une ball (et graine de son tirage) : « 2026-10-27-p2#poke3 » (partie 1 : « 2026-10-19#poke3 ») ;
    un ami a le sien dedans (« 2026-11-02-p3-a1b2c3d4e5f6#poke3 ») : chacun ses tirages, même avec les mêmes chiffres."""
    au_lancement()
    return f"{jour}{'' if REGLAGES['partie'] == 1 else '-p' + str(REGLAGES['partie'])}{'-' + ami if ami else ''}#{cle}"


GESTES = "data/pokemon/gestes.json"  # pompes, tractions et squats, jour par jour (la montre ne sait pas les compter)
_GESTE = re.compile(r"#geste-(pompes|tractions|squats|planche|combatshiny|danse|appel)_(-?\d+)_(\d+)$")
_SCORE = re.compile(r"#danse-([a-z]+)-([A-Za-z]+)_(\d+)_\d+$")  # la danse au doigt : morceau, difficulté, score en millièmes (danse.js)
SERIE_ECART = 30 * 60 * 1000  # une nouvelle série de pompes : 30 min après la précédente (en millisecondes, comme les traces)
SERIE_POMPES = 10


def series_de(touches):
    """Le nombre de séries d'au moins 10 pompes à 30 min d'écart, depuis les touchers [(moment, nombre)] sur le bouton."""
    series, total, dernier = 0, 0, None
    for moment, n in sorted(touches):
        if n >= 0 and dernier is not None and moment - dernier >= SERIE_ECART:  # une annulation se déduit de la dernière série, même bien plus tard
            series, total = series + (total >= SERIE_POMPES), 0
        total += n
        dernier = moment if n >= 0 else dernier
    return series + (total >= SERIE_POMPES)


def gestes_du(ancien, ouvertes, ami, aujourd):
    """Les pompes, tractions et squats de chaque jour : {jour: {"pompes", "tractions", "squats", "series"}}. Le téléphone laisse chaque toucher sur le bouton dans
    la liste partagée (« …#geste-pompes_10_1234 »), qui ne garde que 20 jours : le calcul de chaque heure (montre.py) les recopie dans
    gestes.json ; aujourd'hui et les jours récents viennent de la liste, les plus vieux du fichier."""
    jours, traces, scores = {j: dict(v) for j, v in ((ancien or {}).get("jours") or {}).items()}, {}, {}
    for i in ouvertes or ():
        m, s = _GESTE.search(i), _SCORE.search(i)
        if (m or s) and i.startswith(ident(i[:10], "geste", ami).split("geste")[0]):
            t = traces.setdefault(i[:10], {"pompes": 0, "tractions": 0, "squats": 0, "planche": 0, "combatshiny": 0, "danse": 0, "appel": 0, "_touches": []})
            if s:
                du_jour, cle = scores.setdefault(i[:10], {}), f"{s[1]}_{s[2]}"
                du_jour[cle] = max(du_jour.get(cle, 0), int(s[3]))
                continue
            t[m[1]] += int(m[2])
            if m[1] == "pompes":
                t["_touches"].append((int(m[3]), int(m[2])))
    limite = str(aujourd - dt.timedelta(days=18))
    for j, t in traces.items():
        if j >= limite:
            touches = t.pop("_touches")
            jours[j] = {k: max(v, 0) for k, v in t.items()} | {"series": series_de(touches)} | ({"scores": scores[j]} if j in scores else {})
    return jours


def meilleurs_scores(gestes):
    """Les meilleurs scores de la danse au doigt, tous jours confondus : {"zinnia_Beginner": 873} (en millièmes). Visibles par les autres joueurs."""
    out = {}
    for g in (gestes or {}).values():
        for cle, s in (g.get("scores") or {}).items():
            out[cle] = max(out.get(cle, 0), s)
    return out


def points_gestes(g, jour):
    """Les points d'effort des pompes, tractions, squats et planche d'un jour."""
    R = REGLAGES
    return min(g.get("pompes", 0) * R["bonus_pompe"] + g.get("tractions", 0) * R["bonus_traction"] + g.get("squats", 0) * R["bonus_squat"] + g.get("planche", 0) * R["bonus_planche"],
               R["bonus_gestes_max"] if equitable(jour) else R["ancien_gestes_max"])


def bonus_du_jour(jour, stats, resumes, mission_du, gestes=None):
    """Les petits bonus de points d'effort d'un jour : [(icône, texte, points)]. Pesée du matin : +10 ; mission du
    jour réussie : +25 (le coucher d'hier soir est compté ce matin, quand la nuit est connue). Comptés le jour où on
    les sait : rien ne change après coup (sinon les Poké Balls déjà gagnées se décaleraient)."""
    b = []
    if pesee_matin(resumes.get(str(jour))) and jour >= LANCEMENT.date():
        b.append(("⚖️", "Pesée du matin", REGLAGES["bonus_pesee"]))  # tous les jours, sans plafond
    elif pesee_matin(resumes.get(str(jour))):
        # avant le lancement : 3 par semaine au plus (depuis le 04/11, Kiki : 30 points par semaine au plus)
        avant = sum(pesee_matin(resumes.get(str(jour - dt.timedelta(days=k)))) for k in range(1, jour.weekday() + 1))
        if avant < 3 or jour < missions.NOUVELLES:
            b.append(("⚖️", "Pesée du matin", REGLAGES["ancien_bonus_pesee"]))
    g = (gestes or {}).get(str(jour)) or {}
    pts = points_gestes(g, jour)
    if pts:
        b.append(("💪", "Pompes, tractions et squats", pts))
    st = lambda j: stats.loc[j].to_dict() if j in stats.index else {}  # noqa: E731
    hier = jour - dt.timedelta(days=1)
    for j, quand in ((hier, "coucher"), (jour, None)):
        e = mission_du(j)
        if not e or not e.get("cle") or (quand and e["cle"] != quand) or (not quand and e["cle"] == "coucher"):
            continue
        if missions.reussite(e["cle"], j, st, mission_du, gestes):
            m = missions.MISSIONS[e["cle"]]
            b.append(("🎯", f"Mission : {m['titre']}", missions.bonus_de(e["cle"], e)))
    return b


def debut_de(joueur):
    """Le premier jour du joueur dans la partie : pour un ami, le jour où il a relié sa montre, mais jamais avant le début de la partie (une remise à zéro vaut pour tout le monde)."""
    au_lancement()
    return max(joueur["debut"], REGLAGES["debut"]) if joueur else REGLAGES["debut"]


def jouer(stats, resumes, aujourd, figees=(), missions_jours=None, fichiers_jour=None, joueur=None, anniversaires=(), gestes=None, materiel=None):
    """Rejoue le jeu du premier jour à aujourd'hui. stats = DataFrame par jour (chiffres.stats_jour), resumes = {jour:
    résumé}, fichiers_jour = {jour: fichier du jour} (facultatif : moment des Super / Hyper Balls). Les captures
    figées sont reprises telles quelles ; les autres sont tirées. Chaque capture a « c » = les points cumulés au moment
    où elle a été tirée, et l'état a la « frise » (points et position sur la carte au début et à la fin de chaque
    jour) : c'est ce que rejoue la carte. joueur = {"id", "debut"} pour un ami (None : Kiki) ; anniversaires = les jours où
    une Shiny Ball d'anniversaire est due ; gestes = les pompes et tractions de chaque jour (gestes_du). -> (captures, état)."""
    R = REGLAGES
    figees = {c["id"]: c for c in figees}
    captures, possedees, cumul = [], set(), 0.0
    debut, ami = debut_de(joueur), joueur["id"] if joueur else None
    jours_ok, shiny_balls, depuis_master = [], 0, debut  # Shiny Ball : jours avec l'objectif dans la fenêtre
    reg_i, region, debut_region, depart = 0, regions.REGIONS[0], debut, False  # la région en cours ; depart = l'appel du professeur est accepté : la suivante commence demain
    graine_lieux = f"{R['partie']}-{ami or 'kiki'}"  # ses Pokémon dans chaque lieu : pas exactement les mêmes que ceux des autres joueurs
    voyage = Voyage(region, graine_lieux)
    listes = {region.nom: voyage.especes()}  # les Pokémon de chaque région pour ce joueur
    sport_vu = False  # une minute de sport au moins depuis le début : sinon, la montre ne les mesure peut-être pas (rival.py)
    derniers = []  # les 14 derniers jours, pour les moqueries du rival (rival.py)
    carnet = nouveau_carnet()  # les chiffres du voyage dans la région en cours, pour le Carnet de fin de région
    jour, m, ok, shiny_bonus = debut, mesures({}, [], debut), False, 1  # la partie n'a pas encore commencé (date à venir) : une journée vide, l'appli ne plante pas
    relance, sans_objectif, pas_recents = None, 0, []  # la relance en cours ou la dernière ; les jours de suite sans objectif ; les pas des derniers jours avec des données
    pesees = set()  # les jours de la semaine en cours avec une pesée le matin
    o_pas, o_gestes, pas_semaine, muscu_ok, gestes_depuis = R["objectif_pas"], R["paliers_gestes"][0], [], [], debut  # les objectifs du jour qui s'adaptent
    sem, semaine_passee = None, None  # la semaine en cours et celle d'avant (bilan du dimanche)
    mission_du = lambda j: (missions_jours or {}).get(str(j)) if j >= missions.DEPUIS else None  # noqa: E731
    bonus, frise = [], []
    retenues, en_attente, missions_gardees = [], [], []  # gardées par le champion ; sac et balls sans rien de nouveau
    chaine, chance_prise, perdues, en_defi = 0, False, 0, False
    avant, chrono, hier = 0.0, None, None
    starter, mes_starters, sans_rattrapage = None, [], 0  # le Pokémon du cadeau du professeur de la région, et ceux des régions d'avant
    # les évolutions du starter et les Pokémon des champions de la région ne sortent pas des balls ordinaires
    reserves = lambda noms: [n for n in noms if n not in region.champions and not any(n in LIGNES[x][1:] for x in mes_starters)]  # noqa: E731

    def noter(c):
        nonlocal chaine, chance_prise, starter, sans_rattrapage
        captures.append(c)
        if c["id"].endswith("#" + region.cadeau[0]):
            starter = c["num"]
            mes_starters.append(starter)
        elif reg_i and c.get("ball") in ("poke", "super", "hyper") and not c.get("chasse"):
            sans_rattrapage = 0 if c.get("rattrapage") else sans_rattrapage + 1
        if not c.get("rate"):
            possedees.add((c["num"], c["shiny"]))
        if c.get("chasse"):
            chaine = 0 if c["shiny"] else chaine + 1
        chance_prise = chance_prise or bool(c.get("chance"))

    def tenter_legende(mi):
        """La toute petite chance d'un oiseau : tirée une seule fois par ball, quand elle sort."""
        nonlocal chance_prise
        p = R["legende_chance"].get(mi["ball"])
        if not p or mi.get("tentee") or mi.get("parmi") or mi.get("seul_type") or chance_prise:
            return
        mi["tentee"] = True
        rng = random.Random(f"{mi['id']}#legende")
        manquent = [n for n in region.legendes_chance if n not in {x for x, _ in possedees}]
        if rng.random() < p and manquent:
            mi["fixe"], mi["chance"] = rng.choice(manquent), True
            chance_prise = True

    def capture(mi, ici, passes):
        """La capture d'une ball, ou None si elle ne donne rien pour l'instant."""
        i, ball = mi["id"], BALLS[mi["ball"]]
        p = min(R["shiny"] * ball["shiny"] * mi["shiny_bonus"], R["shiny_max"])
        rng = random.Random(i)
        if mi.get("champion") and mi["champion"] not in {n for n, _ in possedees}:  # le Pokémon du champion, confié avec le badge
            c = {"num": mi["champion"], "shiny": rng.random() < p, "nouvelle": True, "champion": True}
        elif mi.get("fixe"):
            c = {"num": mi["fixe"], "shiny": rng.random() < p, "nouvelle": True}
            if mi.get("chance"):
                c["chance"] = True
        elif mi.get("parmi"):
            manquent = [n for n in mi["parmi"] if (n, False) not in possedees] or mi["parmi"]
            c = {"num": rng.choice(manquent), "shiny": False, "nouvelle": True}
        elif mi["ball"] == "shiny":  # un shiny garanti, parmi les Pokémon déjà attrapés (jamais un légendaire)
            pool = [n for n, s in possedees if not s and (n, True) not in possedees and n not in LEGENDAIRES]
            if not pool:
                return None
            c = {"num": rng.choice(sorted(pool)), "shiny": True, "nouvelle": False}
        else:
            # dans une nouvelle région, une chance de tomber sur ce qui manque aux régions d'avant (les balls d'arène gardent le type du champion)
            manquants = [] if mi.get("seul_type") else sorted(n for r in regions.REGIONS[:reg_i] for n in r.especes | listes[r.nom] if n not in {x for x, _ in possedees})
            hasard = bool(manquants) and (random.Random(f"{i}#rattrapage").random() < R["rattrapage"] or sans_rattrapage >= R["rattrapage_garde"])
            c = tirer(i, possedees, reserves(manquants), [], mi["types"], p, 1) if hasard else None
            if not c:
                bonus_moment = {n: R["poids_moment"] for k in moments_du_jour((missions_jours or {}).get(str(mi["jour"]))) for n in region.moments.get(k, ())}
                c = tirer(i, possedees, reserves(ici), reserves(passes), mi["types"], p, mi.get("nouvelle", ball["nouvelle"]), mi.get("seul_type"), bonus_moment)
                if c:
                    return c
                c = tirer(i, possedees, reserves(manquants), [], mi["types"], p, 1)  # plus rien de nouveau ici : d'abord ce qui manque aux régions d'avant
            if c:
                c["rattrapage"] = True
        return c

    def finaliser(c, mi, lieu):
        nonlocal chrono
        cle = mi["cle"]
        c |= {"id": mi["id"], "jour": str(mi["jour"]), "ball": mi["ball"], "raison": mi["raison"], "lieu": lieu}
        if cle.startswith("poke") and cle[4:].isdigit():
            c["c"] = int(cle[4:]) * R["barre"]
        elif cle == region.cadeau[0]:
            c["c"] = round(avant, 1)
        elif cle in ("super", "hyper") and mi["jour"] == jour:
            if chrono is None:
                chrono = chronologie((fichiers_jour or {}).get(jour), resumes.get(str(jour)), jour) or []
            c["c"] = moment(cle, chrono, m, avant, cumul)
        else:
            c["c"] = cumul
        c["c"] = round(min(max(c["c"], avant), cumul), 1)  # dans la journée où elle sort
        return c

    while jour <= aujourd:
        if depart:  # l'appel a été accepté hier : la nouvelle région commence à minuit, sac vide et barre à zéro
            reg_i, region, debut_region, depart = reg_i + 1, regions.REGIONS[reg_i + 1], jour, False
            voyage, cumul, avant, frise, starter, chance_prise, sans_rattrapage = Voyage(region, graine_lieux), 0.0, 0.0, [], None, False, 0
            listes[region.nom] = voyage.especes()
            carnet = nouveau_carnet()
        s = stats.loc[jour].to_dict() if jour in stats.index else {}
        m = mesures(s, [chiffres.contenu(p) for p in (resumes.get(str(jour)) or {}).get("exercise") or []], jour)
        g = (gestes or {}).get(str(jour)) or {}
        m["gestes_pts"] = points_gestes(g, jour)
        if jour.weekday() == 0 and len(pas_semaine) >= 4:  # le lundi, l'objectif de pas suit la semaine d'avant (4 jours avec la montre au moins)
            part, i = sum(p >= o_pas for p in pas_semaine) / len(pas_semaine), R["paliers_pas"].index(o_pas)
            o_pas = R["paliers_pas"][min(i + 1, 2) if part >= R["pas_monte"] else max(i - 1, 0) if part <= R["pas_descend"] else i]
        if jour.weekday() == 0:
            pas_semaine = []
        m["obj_pas"], m["obj_gestes"] = o_pas, o_gestes
        ok, chrono = objectif_ok(m) or (equitable(jour) and m["gestes_pts"] >= o_gestes), None
        reprise = bool(relance and relance["debut"] <= jour <= relance["fin"] and not relance["fait"] and (m["pas"] >= relance["cible"] or m["zone"] >= R["relance_sport"]))
        if reprise:
            relance["fait"], ok = True, True
        debut_fenetre = max(depuis_master, jour - dt.timedelta(days=R["master_fenetre"] - 1))
        jours_ok = [j for j in jours_ok if j >= debut_fenetre] + ([jour] if ok else [])
        if ((gestes or {}).get(str(jour)) or {}).get("combatshiny"):  # un shiny battu à l'entraînement : un jour de plus sur la barre (un seul par jour)
            jours_ok.append(jour)
        shiny_ball = None
        if len(jours_ok) >= R["master_jours"]:  # 25 jours sur 30 : une Shiny Ball, et on recommence à compter
            shiny_balls += 1
            shiny_ball, jours_ok, depuis_master = shiny_balls, [], jour + dt.timedelta(days=1)
        shiny_bonus = R["shiny_nuit"] if m["sommeil"] >= R["nuit"] else 1
        if jour.weekday() == 0 or sem is None:
            semaine_passee = sem
            sem = {"lundi": str(jour - dt.timedelta(days=jour.weekday())), "jours_ok": 0, "familles": [], "par_jour": [], "parfaite": {}, "hebdo": False, "variete": False, "jours": 0, "pas": 0, "sport": 0, "nuits": 0, "points": 0}
        sem["jours"] += 1
        sem["jours_ok"] += ok
        sem["pas"] += round(m["pas"])
        sem["sport"] += round(m["zone"])
        sem["nuits"] += m["sommeil"] >= R["nuit"]
        du_jour = missions.familles_du(s, g, o_pas, materiel) if jour >= LANCEMENT.date() else missions.familles_du(s, g)  # la marche suit son objectif de pas du moment (Kiki, 07/11)
        nouvelles_familles = [f for f in missions.FAMILLES if f in du_jour and f not in sem["familles"]] if equitable(jour) else []
        if du_jour:
            sem["par_jour"].append([str(jour), sorted(du_jour)])
            sem["parfaite"] = missions.semaine_parfaite([(j, set(fs)) for j, fs in sem["par_jour"]])
        sem["familles"] += nouvelles_familles
        tous_bonus = bonus_du_jour(jour, stats, resumes, mission_du, gestes)
        mission_jour = [b for b in tous_bonus if b[0] == "🎯"]
        bonus = [b for b in tous_bonus if b[0] != "🎯"]
        # dès le lendemain de l'arrivée, la mission attend la victoire (les points du jour ne bougent plus la carte)
        etait_en_defi = voyage.arrivee is not None and voyage.arrivee < jour
        if not etait_en_defi:
            bonus += mission_jour
        bonus += [("🧩", f"Variété : {NOMS_FAMILLES[f]}", R["bonus_famille"]) for f in nouvelles_familles]
        avant, cumul = cumul, cumul + sum(m["points"].values()) + sum(p for _, _, p in bonus)
        sem["points"] += round(cumul - avant)
        km_jour = s.get("km") if s.get("km") == s.get("km") and s.get("km") else 0
        derniers = derniers[-13:] + [{"jour": str(jour), "pas": round(m["pas"]), "zone": round(m["zone"]), "sommeil": round(m["sommeil"]), "pompes": g.get("pompes", 0), "tractions": g.get("tractions", 0), "squats": g.get("squats", 0), **{k: float(s[k]) if pd.notna(s.get(k)) else None for k in ("fc_repos", "vfc", "gras")}}]
        sport_vu = sport_vu or m["zone"] > 0
        carnet["jours"] += 1
        carnet["pas"] += round(m["pas"])
        carnet["km"] += float(km_jour)
        carnet["sport"] += round(m["zone"])
        for k in ("pompes", "tractions", "squats", "planche"):
            carnet[k] += max(g.get(k, 0), 0)
        for k in ("min_rameur", "min_danse"):
            if pd.notna(s.get(k)):
                carnet[k] += float(s[k])
        carnet["rameur_m"] += sum((chiffres.num((chiffres.contenu(p).get("metricsSummary") or {}).get("distanceMillimeters")) or 0) / 1000 for p in (resumes.get(str(jour)) or {}).get("exercise") or [] if "ROWING" in (chiffres.contenu(p).get("exerciseType") or ""))
        if m["pas"] > carnet["record"]["pas"]:
            carnet["record"] = {"pas": round(m["pas"]), "jour": str(jour)}
        p0 = voyage.pos
        soir = ((missions_jours or {}).get(str(jour)) or {}).get("pas_soir") or 0
        km = s.get("km") if s.get("km") == s.get("km") and s.get("km") else 0  # None ou NaN : pas de distance ce jour-là
        badges = voyage.avancer(jour, {"pas": m["pas"], "zone": m["zone"], "etages": m["etages"], "eau": m["eau"], "force_min": m["force"],
                                       "seance": m["seance_max"], "soir": soir, "km": km, "pompes": g.get("pompes", 0), "tractions": g.get("tractions", 0),
                                       "ok": ok, "double": double_ok(m), "hyper": exploit(m) is not None}, cumul)
        en_defi = voyage.arrivee is not None and voyage.arrivee < jour and not badges
        limite = jour - dt.timedelta(days=R["rend"] - 1)
        if etait_en_defi:
            missions_gardees += [(jour, b) for b in mission_jour]
            missions_gardees = [(j, b) for j, b in missions_gardees if j >= limite]
            if badges:  # le champion rend les missions des derniers jours : tout se débloque dans la journée
                rendues = [b for _, b in missions_gardees]
                bonus += rendues
                cumul += sum(p for _, _, p in rendues)
                voyage.cumul, missions_gardees = cumul, []
        if not en_defi:
            missions_gardees = []
        ici, passes = voyage.atteints()
        lieu = region.lieux[voyage.ici()]["nom"]
        frise.append({"jour": str(jour), "c0": round(avant, 1), "c1": round(cumul, 1), "p0": round(p0, 1),
                      "p1": round(voyage.pos, 1)})
        if jour.weekday() == 0:
            pesees = set()
        if pesee_matin(resumes.get(str(jour))):
            pesees.add(jour)
        sanct = []
        for k in voyage.sanct_du_jour:
            num = region.sanct_index[k]
            nom = POKEMON[num]["nom"]
            if num in {n for n, _ in possedees}:  # déjà attrapé par chance : le sanctuaire donne une Shiny Ball
                sanct.append({"cle": f"sanct{num}", "ball": "shiny", "types": None,
                              "raison": f"🏛️ Sanctuaire de {region.lieux[k]['nom']} ({nom} déjà attrapé)"})
            else:
                sanct.append({"cle": f"sanct{num}", "ball": "master", "types": None, "fixe": num,
                              "raison": f"🏛️ Sanctuaire de {region.lieux[k]['nom']} : {nom}"})
        dues = balls_du_jour(jour, m, avant, cumul, shiny_ball, badges, debut_region, sanct, region)
        dues += [{"cle": f"net{k}", "ball": "super", "types": None, "raison": f"⚔️ Victoire nette : le défi de {lieu['arene']['champion']} réussi"}
                 for k, lieu in badges if k in voyage.nets]  # le vrai défi réussi, pas seulement « le champion te laisse passer »
        if reprise:
            dues.append({"cle": "reprise", "ball": "poke", "types": None, "raison": "🔄 Poké Ball de la reprise"})
        if equitable(jour) and jour < LANCEMENT.date() and not sem["hebdo"] and sem["jours_ok"] >= R["hebdo_jours"]:
            sem["hebdo"] = True
            dues.append({"cle": "hebdo", "ball": "super", "types": None, "raison": f"📅 {R['hebdo_jours']} jours d'objectif dans la semaine"})
        if equitable(jour) and not sem["variete"] and (len(sem["parfaite"]) >= R["familles_semaine"] if jour >= LANCEMENT.date() else len(sem["familles"]) >= 4):  # 5 sports, 5 jours différents
            sem["variete"] = True
            dues.append({"cle": "variete", "ball": "super", "types": None, "raison": "🧩 Semaine parfaite : les 5 sports" if jour >= LANCEMENT.date() else "🧩 4 sports différents dans la semaine"})
        if jour in anniversaires:
            dues.append({"cle": f"anniv{jour.year}", "ball": "shiny", "types": None, "raison": "🎂 Joyeux anniversaire !"})
        # une capture figée reste, même si les chiffres ont baissé depuis
        for i in [i for i in figees if i.startswith(ident(jour, "", ami))]:
            c = figees[i]
            c.setdefault("lieu", lieu)
            c.setdefault("c", cumul)
            noter(c)
        for mi in dues:
            mi |= {"id": ident(jour, mi["cle"], ami), "jour": jour, "shiny_bonus": shiny_bonus}
            if mi["id"] in figees:
                continue
            if en_defi and mi["cle"] in ("super", "hyper"):
                retenues.append(mi)
            else:
                en_attente.append(mi)
        if badges:  # victoire : le champion rend ce qu'il gardait des derniers jours
            perdues += sum(1 for mi in retenues if mi["jour"] < limite)
            en_attente += [mi for mi in retenues if mi["jour"] >= limite]
            retenues = []
            for mi in en_attente:
                mi.pop("defi", None)
        elif en_defi:
            perdues += sum(1 for mi in retenues + en_attente if mi["jour"] < limite and (mi in retenues or mi.get("defi")))
            retenues = [mi for mi in retenues if mi["jour"] >= limite]
            en_attente = [mi for mi in en_attente if mi["jour"] >= limite or not mi.get("defi")]
        fini = 9 in voyage.badges
        reste, sac = [], 0
        for mi in en_attente:
            tenter_legende(mi)
            c = capture(mi, ici, passes)
            if c is None and not en_defi and (fini or sac >= R["sac"]) and mi["ball"] != "shiny":
                c = chasser(mi["id"], possedees, ici, passes, chaine)
                if c is None and fini:
                    continue
            if c is not None:
                noter(finaliser(c, mi, lieu))
            elif en_defi and mi["ball"] != "shiny":
                mi["defi"] = True
                reste.append(mi)
            else:
                sac += 1
                reste.append(mi)
        en_attente = reste
        if jour == aujourd - dt.timedelta(days=1):  # pour le récap du matin
            hier = {"jour": str(jour), "pas": round(m["pas"]), "zone": round(m["zone"]), "super": super_ok(m), "hyper": exploit(m) is not None,
                    "mission": bool(mission_jour)}
        # le starter évolue : au niveau voulu, s'il n'a pas déjà cette forme
        if starter:
            for stade, seuil in enumerate(R["evolutions"], 1):
                num = LIGNES[starter][stade]
                if niveau(cumul + voyage.bonus, region) >= seuil and not any(n == num for n, _ in possedees):
                    mi = {"cle": f"evo{stade}", "ball": "evo", "types": None, "fixe": num, "jour": jour, "shiny_bonus": 1,
                          "raison": f"✨ {POKEMON[LIGNES[starter][stade - 1]]['nom']} évolue en {POKEMON[num]['nom']}", "id": ident(jour, f"evo{stade}", ami)}
                    noter(figees.get(mi["id"]) or finaliser(capture(mi, ici, passes), mi, lieu))
        # le Pokédex d'une région est complet : son diplôme, avec son légendaire (Kanto : les 146, puis Mew)
        for r in regions.REGIONS[:reg_i + 1]:
            if listes[r.nom] <= {n for n, _ in possedees} and r.diplome not in {n for n, _ in possedees}:
                mi = {"cle": r.cle_diplome, "ball": "master", "types": None, "fixe": r.diplome, "jour": jour, "shiny_bonus": shiny_bonus,
                      "raison": r.raison_diplome, "id": ident(jour, r.cle_diplome, ami)}
                noter(figees.get(mi["id"]) or finaliser(capture(mi, ici, passes), mi, lieu))
        if m["pas"] > 0 and jour < aujourd:  # montre oubliée, jour pas fini : ça ne compte pas pour la relance
            sans_objectif = 0 if ok else sans_objectif + 1
            pas_recents = (pas_recents + [m["pas"]])[-7:]
            libre = relance is None or jour >= relance["debut"] - dt.timedelta(days=1) + dt.timedelta(days=R["relance_ecart"])
            if sans_objectif >= R["relance_jours"] and libre:
                cible = min(max(round(sum(pas_recents) / len(pas_recents) * 1.2, -2), R["relance_min"]), R["relance_max"])
                relance = {"debut": jour + dt.timedelta(days=1), "fin": jour + dt.timedelta(days=R["relance_duree"]), "cible": int(cible), "fait": False}
        if jour < aujourd:  # les objectifs de demain, d'après la journée finie
            if m["pas"] > 0:
                pas_semaine.append(m["pas"])
            if m["gestes_pts"] >= o_gestes:
                muscu_ok.append(jour)
            semaine_m = [j for j in muscu_ok if j > jour - dt.timedelta(days=7)]
            pg = R["paliers_gestes"]
            if (o_gestes == pg[0] and len(muscu_ok) >= R["gestes_debut"]) or (o_gestes == pg[1] and len(semaine_m) >= R["gestes_souvent"]):
                o_gestes, muscu_ok, gestes_depuis = pg[pg.index(o_gestes) + 1], [], jour + dt.timedelta(days=1)
            elif o_gestes == pg[2] and jour - gestes_depuis >= dt.timedelta(days=6) and len(semaine_m) < R["gestes_oubli"]:
                o_gestes, muscu_ok, gestes_depuis = pg[1], [], jour + dt.timedelta(days=1)
        if fini and g.get("appel") and reg_i + 1 < len(regions.REGIONS):  # l'appel du professeur est accepté (trace du téléphone) : départ demain matin
            depart = True
        jour += dt.timedelta(days=1)
    b = R["barre"]
    # La fenêtre de la Shiny Ball : un état par jour (1 = objectif, 0 = raté, None = aujourd'hui pas encore), du plus
    # vieux au plus récent, depuis la dernière Shiny Ball
    debut_fenetre = max(depuis_master, aujourd - dt.timedelta(days=R["master_fenetre"] - 1))
    fenetre = [1 if j in jours_ok else (None if j == aujourd else 0)
               for j in (debut_fenetre + dt.timedelta(days=i) for i in range((aujourd - debut_fenetre).days + 1))]
    lundi = aujourd - dt.timedelta(days=aujourd.weekday())
    semaine = [1 if j in pesees else (None if j >= aujourd else 0) for j in (lundi + dt.timedelta(days=i) for i in range(7))]
    if aujourd in pesees:
        semaine[aujourd.weekday()] = 1
    derniere = None
    for k in range(120):  # la dernière pesée (pour la comparer à des Pokémon)
        j = aujourd - dt.timedelta(days=k)
        ps = pesees_du_jour(resumes.get(str(j)))
        if ps:
            h, kg, gras = ps[-1]
            derniere = {"jour": str(j), "heure": round(h, 2), "kg": kg, "gras": gras}
            break
    ici, passes = voyage.atteints()
    especes = {n for n, _ in possedees}
    plus_rien = [*ici, *passes] and not [n for n in reserves([*ici, *passes]) if n not in especes]
    return captures, {"pesees": {"semaine": semaine, "nb": len(pesees), "cible": R["pesees"],
                                 "avant": R["pesee_avant"], "derniere": derniere, "bonus": R["bonus_pesee"]},
                      "serie": len(jours_ok), "serie_ok": ok, "objectifs": {"pas": o_pas, "gestes": o_gestes}, "fenetre": fenetre, "voyage": voyage.etat(aujourd),
                      "possedees": possedees, "mesures": m,
                      "barre": cumul % b, "origine": origine_barre(m) if m else SOURCES["pas"], "shiny_bonus": shiny_bonus,
                      "bonus": bonus, "mission": etat_mission(aujourd, stats, mission_du, gestes), "cumul": round(cumul, 1),
                      "frise": frise[-30:],
                      "defi_grise": en_defi, "perdues": perdues,
                      "retenues": [{"ball": mi["ball"], "jour": str(mi["jour"])} for mi in retenues],
                      "missions_gardees": sum(p for _, (_, _, p) in missions_gardees),
                      "sac": [mi["ball"] for mi in en_attente],
                      "chasse": {"actif": bool(plus_rien) and not en_defi, "chaine": chaine,
                                 "chance": round(min(R["chasse"] * (chaine + 1), 1), 2)},
                      "carnet": carnet, "derniers": derniers, "sport_vu": sport_vu, "moments": moments_du_jour((missions_jours or {}).get(str(aujourd))) if region.moments else None, "semaine": sem, "semaine_passee": semaine_passee, "danse": meilleurs_scores({j: v for j, v in (gestes or {}).items() if j >= str(debut)}),
                      "fini": 9 in voyage.badges, "hier": hier, "region": {"index": reg_i, "nom": region.nom, "debut": str(debut_region), "depart": depart,
                                                                           "suivante": regions.REGIONS[reg_i + 1].nom if reg_i + 1 < len(regions.REGIONS) else None}, "gestes_jour": (gestes or {}).get(str(aujourd)) or {"pompes": 0, "tractions": 0, "squats": 0, "series": 0},
                      "relance": {"cible": relance["cible"], "sport": R["relance_sport"], "fait": relance["fait"], "debut": str(relance["debut"]), "fin": str(relance["fin"])} if relance and relance["debut"] <= aujourd <= relance["fin"] else None,
                      "starter": starter and {"ligne": LIGNES[starter], "niveau": niveau(cumul + voyage.bonus, region), "pts_niveau": pts_niveau(region), "dans_niveau": round((cumul + voyage.bonus) % pts_niveau(region), 1)}}


def nouveau_carnet():
    return {"jours": 0, "pas": 0, "km": 0.0, "sport": 0, "pompes": 0, "tractions": 0, "squats": 0, "planche": 0, "min_rameur": 0.0, "rameur_m": 0.0, "min_danse": 0.0, "record": {"pas": 0, "jour": None}}


def apercu_region(etat, index, pos):
    """L'aperçu d'une région sans y être (Kiki seul, onglet Tester) : sa carte, ses champions, aucune capture. Rien n'est enregistré."""
    region = regions.REGIONS[index]
    v = Voyage(region)
    v.pos = pos
    sans_arene = {**etat, "voyage": v.etat(dt.date.today()), "frise": [], "cumul": pos, "barre": 0, "fini": False, "defi_grise": False, "sac": [], "retenues": [], "starter": None, "relance": None, "perdues": 0,
                  "region": {"index": index, "nom": region.nom, "debut": str(dt.date.today()), "depart": False, "suivante": None}, "chasse": {"actif": False, "chaine": 0, "chance": 0}, "moments": []}
    return [], sans_arene


def etat_mission(aujourd, stats, mission_du, gestes=None):
    """Ce que l'écran montre de la mission du jour."""
    st = lambda j: stats.loc[j].to_dict() if j in stats.index else {}  # noqa: E731
    e = mission_du(aujourd)
    sortie = None
    if e and e.get("cle"):
        m, s = missions.MISSIONS[e["cle"]], st(aujourd)
        if m.get("ancienne"):
            valeur = {"matinee": e.get("pas_matin"), "zone": s.get(missions.cle_zone(aujourd)), "seance": s.get("min_sport")}.get(e["cle"])
        else:
            valeur = missions.valeur(e["cle"], aujourd, st, mission_du, gestes)
        seuil = missions.seuil_de(e["cle"], e)
        sortie = {"cle": e["cle"], "titre": m["titre"], "texte": m["texte"].replace("{seuil}", chiffres.nombre(seuil)), "seuil": seuil, "unite": m["unite"],
                  "raison": m.get("phrase") or e.get("raison", ""), "valeur": None if valeur is None or valeur != valeur else round(valeur, 1 if m["unite"] == "km" else None),
                  "ok": missions.reussite(e["cle"], aujourd, st, mission_du, gestes) if e["cle"] != "coucher" else None,
                  "bonus": missions.bonus_de(e["cle"], e), "num": m.get("num"), "geste": m.get("geste")}
    return sortie


def jours_anniversaire(ouvertes, figees, ami, debut, aujourd, aujourdhui_anniv):
    """Les jours où une Shiny Ball d'anniversaire est due, une par an. La date de naissance reste sur le téléphone : ici, on sait
    seulement que le joueur a ouvert l'appli le jour de son anniversaire (aujourdhui_anniv), et le téléphone laisse une trace dans la
    liste partagée (« …#demande-anniv ») pour que le calcul de chaque heure (montre.py) fige la ball : seul ce jour est connu."""
    deja = {c["id"].split("#anniv")[1] for c in figees if "#anniv" in c["id"]}
    jours = []
    for i in ouvertes:
        try:
            j = dt.date.fromisoformat(i[:10])
        except ValueError:
            continue
        if i == ident(j, "demande-anniv", ami):
            jours.append(j)
    if aujourdhui_anniv:
        jours.append(aujourd)
    sortie = set()
    for j in sorted(jours):
        if str(j.year) not in deja and debut <= j <= aujourd:
            deja.add(str(j.year))
            sortie.add(j)
    return sortie


def charger_jeu(lire, aujourd, joueur=None, anniversaire=False):
    """Statistiques depuis le début du jeu et captures figées, avec la fonction `lire` de l'appli (pour un ami : lire
    donne ses fichiers à lui, voir chiffres.chez, et joueur = {"id", "debut"}). anniversaire = le joueur a ouvert l'appli le jour de
    son anniversaire."""
    debut, ami = debut_de(joueur), joueur["id"] if joueur else None
    annees = range(debut.year, aujourd.year + 1)
    # les fichiers d'aujourd'hui et d'hier : le moment des Super / Hyper Balls pas encore figées avec leur moment
    recents = {j: f"data/jour/{j.year}/{j}.json" for j in (aujourd - dt.timedelta(days=1), aujourd) if j >= debut}
    f = lire([f"data/resume/{y}.json" for y in annees] + [FIGEES, OUVERTES, GESTES, missions.FICHIER, seances_rameur.FICHIER, pesees.FICHIER] + list(recents.values()))
    resumes = {}
    for y in annees:
        resumes.update(f.get(f"data/resume/{y}.json") or {})
    resumes = pesees.fusionner(seances_rameur.fusionner(resumes, f.get(seances_rameur.FICHIER)), f.get(pesees.FICHIER))
    jours =[debut + dt.timedelta(days=i) for i in range((aujourd - debut).days + 1)]
    lignes_m = (f.get(missions.FICHIER) or {}).get("jours") or {}
    stats = pd.DataFrame({j: missions.avec_coeur(chiffres.stats_jour(resumes.get(str(j))), lignes_m.get(str(j)), j) for j in jours}).T
    figees = [c for c in (f.get(FIGEES) or {}).get("captures", [])  # seulement celles de la partie en cours
              if c["jour"] >= str(debut) and c["id"].startswith(ident(c["jour"], "", ami))]
    anniv = jours_anniversaire((f.get(OUVERTES) or {}).get("ouvertes", {}), figees, ami, debut, aujourd, anniversaire)
    gestes = gestes_du(f.get(GESTES), (f.get(OUVERTES) or {}).get("ouvertes", {}), ami, aujourd)
    materiel = missions.materiel_de({"materiel": (f.get(missions.FICHIER) or {}).get("materiel")}, ami)  # écrit par montre.py avec la mission
    return jouer(stats, resumes, aujourd, figees, (f.get(missions.FICHIER) or {}).get("jours"),
                 {j: f.get(c) for j, c in recents.items()}, joueur, anniv, gestes, materiel)


def figer(dossier):
    """Écrit le fichier des captures figées : toutes, aujourd'hui compris (une ball vue ne change plus)."""
    import coach
    aujourd = dt.datetime.now(chiffres.TZ).date()
    captures, _ = charger_jeu(coach.lecteur(dossier), aujourd)
    chemin = Path(dossier) / FIGEES
    chemin.parent.mkdir(parents=True, exist_ok=True)
    chemin.write_text(json.dumps({"captures": captures}, ensure_ascii=False, indent=0), encoding="utf-8")
    print(f"{chemin} : {len(captures)} captures figées")


if __name__ == "__main__":
    if sys.argv[1:2] == ["figer"]:
        figer(sys.argv[2])
    else:
        sys.exit(__doc__)
