"""Le jeu Pokémon : on gagne des Poké Balls en faisant du sport, jamais en ne faisant rien. Réglages : audit du 02/11.

- La **barre d'effort** se remplit avec les pas (au-delà des 1 000 de la vie à la maison), les minutes de sport (zone
  cardio intense ou maximum, jaune et rouge sur la montre : 5 points la minute), les étages et les séances de sport
  (musculation, pompes, tractions, rameur : 2 points par minute) ; elle ne se vide pas le soir. Barre pleine (100 points)
  = une Poké Ball, dont les types favoris dépendent de ce qui a le plus rempli la barre ce jour-là.
- **Super Ball** : journée « objectif double » (5 000 pas ET 10 min de sport), ou n'importe quel exploit. Shiny ×2.
- **Hyper Ball** : exploit du jour (10 000 pas, 25 min de sport ou une séance de 45 min). Shiny ×4.
- **Shiny Ball** : 25 jours avec l'objectif (5 000 pas ou 10 min de sport) sur les 30 derniers, ou un sanctuaire dont on a
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
import kanto
import missions
from pokedex import LEGENDAIRES, POKEMON

REGLAGES = {
    # Partie en cours : premier jour et numéro. Recommencer à zéro = nouvelle date + nouveau numéro (les identifiants
    # des balls changent, donc rien de l'ancienne partie ne revient : captures figées, balls ouvertes). Partie 1 : du
    # 19/10 au 26/10 ; parties 2 et 3 (27/10) : pour régler le jeu ; partie 4 (02/11) : les règles de l'audit.
    "debut": dt.date(2026, 11, 2), "partie": 4,
    "shiny": 0.03,                   # chance de shiny de base
    "shiny_max": 0.5,
    "nuit": 420, "shiny_nuit": 1.5,  # nuit d'au moins 7 h : shiny ×1,5 toute la journée
    "part_lieu": 0.8,                # chance de tirer dans le lieu actuel plutôt qu'en rattrapage (s'il reste des deux)
    "sac": 3,                        # balls qui attendent le lieu suivant quand il n'y a plus rien de nouveau
    "chasse": 0.03,                  # chasse aux shiny : chance de la 1re ball, puis autant en plus à chaque ball ratée
    "pts_niveau": 195, "niveau_depart": 1, "evolutions": (16, 36),  # le starter : 1re évolution à 2 925 points, 2e à 6 825 (toujours avant les 7 000 de la carte)
    "bonus_pompe": .5, "bonus_traction": 1, "bonus_squat": .25, "bonus_gestes_max": 25,  # points d'effort par pompe, par traction, par squat, et au plus par jour
    "rend": 3,                       # le champion rend ce qui a été gagné sur tant de derniers jours
    "legende_chance": {"poke": 0.001, "super": 0.0025, "hyper": 0.005},  # un oiseau par surprise, un seul par région
    "barre": 100,                    # points d'effort pour une Poké Ball
    "pas_offerts": 1000,             # les pas de la vie à la maison ne comptent pas
    "seance_min": 10,                # une séance compte à partir de 10 min
    "force": 2, "force_depuis": dt.date(2026, 10, 27),  # points par minute de musculation / rameur (avant : 1)
    "master_jours": 25, "master_fenetre": 30,  # jours avec l'objectif sur les 30 derniers pour un légendaire
    "objectif_pas": 5000, "objectif_zone": 10,
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
    "pesees": 3, "pesee_avant": 12, "bonus_pesee": 10,
}

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

STARTERS = [1, 4, 7]  # Bulbizarre, Salamèche, Carapuce : le cadeau du Professeur Chen
LIGNES = {n: [n, n + 1, n + 2] for n in STARTERS}  # ses évolutions


def niveau(points):
    """Le niveau du starter, d'après les points d'effort depuis le début."""
    return REGLAGES["niveau_depart"] + int(points // REGLAGES["pts_niveau"])

OISEAUX = [144, 145, 146]  # ce que la chance peut donner avant les sanctuaires
TOTAL_ESPECES = len(POKEMON) - len(LEGENDAIRES)  # les 146 du diplôme

# Les images (dépôt public PokeAPI/sprites)
IMAGES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites"


def image(num, shiny=False):
    """La petite image (96 px) d'un Pokémon, normale ou shiny."""
    return f"{IMAGES}/pokemon/{'shiny/' if shiny else ''}{num}.png"


FIGEES = "data/pokemon/captures_v2.json"
OUVERTES = "data/pokemon/ouvertes.json"  # Poké Balls ouvertes, partagées par la montre et le téléphone (script Google)


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
    """Séance de musculation (pompes, tractions, poids…) ou de rameur, d'après son type ou son nom."""
    t, nom = (c.get("exerciseType") or "").upper(), (c.get("displayName") or "").lower()
    return any(f in t for f in FORCE_TYPES) or any(f in nom for f in FORCE_NOMS)


def mesures(s, exercices, jour=None):
    """Les chiffres du jour utilisés par le jeu : pas, zone, étages, sommeil, minutes de sport par type de séance."""
    m = {k: s[k] if pd.notna(s.get(k)) else 0 for k in ("pas", "zone", "etages", "sommeil")}
    m["nouveau"] = nouveau(jour)
    if m["nouveau"]:  # minutes de sport (jaune / rouge)
        m["zone"] = s["zone_sport"] if pd.notna(s.get("zone_sport")) else 0
    elif pd.notna(s.get("zone_cardio_x2")):  # l'ancien calcul, à l'identique (cardio et pic comptés 4 fois)
        m["zone"] += s["zone_cardio_x2"]
    m["sports"], m["seance_max"], m["force"], m["nb_force"], m["eau"] = {}, 0, 0, 0, 0
    for c in exercices:
        minutes = chiffres.duree(c.get("activeDuration")) / 60
        if minutes >= REGLAGES["seance_min"]:
            t = c.get("exerciseType") or "OTHER"
            if est_force(c):
                m["force"] += minutes
                m["nb_force"] += 1
            if "ROWING" in t or "SWIM" in t:
                m["eau"] += minutes
                t = t if t in SPORTS else "FORCE"
            m["sports"][t] = m["sports"].get(t, 0) + minutes
            m["seance_max"] = max(m["seance_max"], minutes)
    m["sport"] = sum(m["sports"].values())
    force = m["force"] if jour is None or jour >= REGLAGES["force_depuis"] else 0
    m["points"] = points_par_source(m["pas"], m["zone"], m["etages"], m["sport"], force, seuils_zone(m)[0])
    return m


def sport_principal(m):
    if not m["sports"]:
        return SPORT_AUTRE
    t = max(m["sports"], key=m["sports"].get)
    return MUSCU if t == "FORCE" else SPORTS.get(t, SPORT_AUTRE)


def origine_barre(m):
    """(icône, libellé, types) de ce qui a le plus rempli la barre ce jour-là, sans compter les pas (ils sont là presque
    tous les jours) : zone, étages ou séances dès 10 points, sinon les pas (tous les types)."""
    autres = {k: v for k, v in m["points"].items() if k != "pas" and v >= 10}
    cle = max(autres, key=autres.get) if autres else "pas"
    return sport_principal(m) if cle == "sport" else SOURCES[cle]


def exploit(m):
    """L'exploit du jour (pour l'Hyper Ball), ou None."""
    if m["seance_max"] >= REGLAGES["exploit_seance"]:
        ic, nom, types = sport_principal(m)
        return ic, f"Séance de {m['seance_max']:.0f} min ({nom})", types
    if m["zone"] >= seuils_zone(m)[2]:
        return "🔥", f"{m['zone']:.0f} min {'de sport' if m.get('nouveau', True) else 'en zone'}", SOURCES["zone"][2]
    if m["pas"] >= REGLAGES["exploit_pas"]:
        return "👟", f"{chiffres.nombre(m['pas'])} pas", None
    return None


def tirer(graine, possedees, ici, passes, types=None, shiny=0.03, p_nouvelle=0.0, seul_type=None):
    """Une capture dans les lieux atteints (ici = lieu actuel, passes = lieux traversés), jamais de doublon, ou None s'il
    n'y a plus d'espèce nouvelle (la ball attend ou part en chasse). types = types favoris de la barre (×3) ; seul_type =
    ball d'arène (ce type s'il en reste)."""
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
    poids = [(1 / 3 if n in kanto.RARES else 1) * (3 if types and set(types) & set(POKEMON[n]["types"]) else 1) for n in pool]
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
        if i is not None and n:
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
        if minutes < REGLAGES["seance_min"] or debut.date() != jour:
            continue
        a = debut.hour * 60 + debut.minute
        b = min(fin.hour * 60 + fin.minute if fin.date() == jour else 1439, 1439)
        pts = minutes * (REGLAGES["force"] if est_force(c) and jour >= REGLAGES["force_depuis"] else 1)
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
    ok = exploite if cle == "hyper" else lambda x: (x[0] >= REGLAGES["objectif_pas"] and x[1] >= obj) or exploite(x)
    i = next((k for k, x in enumerate(chrono) if ok(x)), None)
    total = chrono[-1][2]
    if i is None or total <= 0:
        return apres
    return round(min(avant + chrono[i][2] / total * (apres - avant), apres), 1)


def double_ok(m):
    """Journée « objectif double » : les pas ET les minutes de sport."""
    return m["pas"] >= REGLAGES["objectif_pas"] and m["zone"] >= seuils_zone(m)[1]


def super_ok(m):
    """La Super Ball du jour : objectif double, ou n'importe quel exploit (une Hyper Ball sans Super Ball n'aurait pas de sens)."""
    return double_ok(m) or exploit(m) is not None


def objectif_ok(m):
    """Le jour compte pour la Master Ball (5 000 pas ou 10 min de sport)."""
    return m["pas"] >= REGLAGES["objectif_pas"] or m["zone"] >= seuils_zone(m)[1]


def balls_du_jour(jour, m, avant, apres, shiny_ball=None, badges=(), debut=None, sanctuaires=()):
    """Les Poké Balls gagnées un jour : avant / apres = points d'effort cumulés depuis le début du jeu ; shiny_ball = numéro
    de la Shiny Ball gagnée ce jour-là (25 jours sur 30), ou None ; badges = [(numéro, lieu)] des arènes gagnées ce jour-là ;
    sanctuaires = les balls des sanctuaires réussis ce jour-là ; debut = le premier jour du joueur (par défaut, celui de la
    partie de Kiki)."""
    dues = []
    if jour == (debut or REGLAGES["debut"]):  # le premier jour : le Professeur Chen offre un des 3 starters, au hasard
        dues.append({"cle": "chen", "ball": "poke", "raison": "🎁 Cadeau du Professeur Chen", "types": None,
                     "parmi": STARTERS})
    for k, lieu in badges:
        a = lieu["arene"]
        if a["type"] is None:  # la Ligue : Mewtwo
            dues.append({"cle": "ligue", "ball": "master", "raison": "🏆 Champion de la Ligue Pokémon !",
                         "types": None, "fixe": 150})
        else:
            dues.append({"cle": f"badge{k}", "ball": "hyper", "types": None, "seul_type": a["type"], "nouvelle": 1,
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
    return f"{jour}{'' if REGLAGES['partie'] == 1 else '-p' + str(REGLAGES['partie'])}{'-' + ami if ami else ''}#{cle}"


GESTES = "data/pokemon/gestes.json"  # pompes, tractions et squats, jour par jour (la montre ne sait pas les compter)
_GESTE = re.compile(r"#geste-(pompes|tractions|squats)_(-?\d+)_(\d+)$")
SERIE_ECART = 30 * 60 * 1000  # une nouvelle série de pompes : 30 min après la précédente (en millisecondes, comme les traces)
SERIE_POMPES = 10


def series_de(touches):
    """Le nombre de séries d'au moins 10 pompes à 30 min d'écart, depuis les touchers [(moment, nombre)] sur le bouton."""
    series, total, dernier = 0, 0, None
    for moment, n in sorted(touches):
        if dernier is not None and moment - dernier >= SERIE_ECART:
            series, total = series + (total >= SERIE_POMPES), 0
        total, dernier = total + n, moment
    return series + (total >= SERIE_POMPES)


def gestes_du(ancien, ouvertes, ami, aujourd):
    """Les pompes, tractions et squats de chaque jour : {jour: {"pompes", "tractions", "squats", "series"}}. Le téléphone laisse chaque toucher sur le bouton dans
    la liste partagée (« …#geste-pompes_10_1234 »), qui ne garde que 20 jours : le calcul de chaque heure (montre.py) les recopie dans
    gestes.json ; aujourd'hui et les jours récents viennent de la liste, les plus vieux du fichier."""
    jours, traces = {j: dict(v) for j, v in ((ancien or {}).get("jours") or {}).items()}, {}
    for i in ouvertes or ():
        m = _GESTE.search(i)
        if m and i.startswith(ident(i[:10], "geste", ami).split("geste")[0]):
            t = traces.setdefault(i[:10], {"pompes": 0, "tractions": 0, "squats": 0, "_touches": []})
            t[m[1]] += int(m[2])
            if m[1] == "pompes":
                t["_touches"].append((int(m[3]), int(m[2])))
    limite = str(aujourd - dt.timedelta(days=18))
    for j, t in traces.items():
        if j >= limite:
            touches = t.pop("_touches")
            jours[j] = {k: max(v, 0) for k, v in t.items()} | {"series": series_de(touches)}
    return jours


def bonus_du_jour(jour, stats, resumes, mission_du, gestes=None):
    """Les petits bonus de points d'effort d'un jour : [(icône, texte, points)]. Pesée du matin : +10 ; mission du
    jour réussie : +25 (le coucher d'hier soir est compté ce matin, quand la nuit est connue). Comptés le jour où on
    les sait : rien ne change après coup (sinon les Poké Balls déjà gagnées se décaleraient)."""
    b = []
    if pesee_matin(resumes.get(str(jour))):
        b.append(("⚖️", "Pesée du matin", REGLAGES["bonus_pesee"]))
    g = (gestes or {}).get(str(jour)) or {}
    pts = min(g.get("pompes", 0) * REGLAGES["bonus_pompe"] + g.get("tractions", 0) * REGLAGES["bonus_traction"] + g.get("squats", 0) * REGLAGES["bonus_squat"],
              REGLAGES["bonus_gestes_max"])
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
            b.append(("🎯", f"Mission : {m['titre']}", m.get("bonus", missions.BONUS)))
    return b


def jouer(stats, resumes, aujourd, figees=(), missions_jours=None, fichiers_jour=None, joueur=None, anniversaires=(), gestes=None):
    """Rejoue le jeu du premier jour à aujourd'hui. stats = DataFrame par jour (chiffres.stats_jour), resumes = {jour:
    résumé}, fichiers_jour = {jour: fichier du jour} (facultatif : moment des Super / Hyper Balls). Les captures
    figées sont reprises telles quelles ; les autres sont tirées. Chaque capture a « c » = les points cumulés au moment
    où elle a été tirée, et l'état a la « frise » (points et position sur la carte au début et à la fin de chaque
    jour) : c'est ce que rejoue la carte. joueur = {"id", "debut"} pour un ami (None : Kiki) ; anniversaires = les jours où
    une Shiny Ball d'anniversaire est due ; gestes = les pompes et tractions de chaque jour (gestes_du). -> (captures, état)."""
    R = REGLAGES
    figees = {c["id"]: c for c in figees}
    captures, possedees, cumul = [], set(), 0.0
    debut, ami = joueur["debut"] if joueur else R["debut"], joueur["id"] if joueur else None
    jours_ok, shiny_balls, depuis_master = [], 0, debut  # Shiny Ball : jours avec l'objectif dans la fenêtre
    voyage = kanto.Voyage()
    jour, m, ok, shiny_bonus = debut, {}, False, 1
    pesees = set()  # les jours de la semaine en cours avec une pesée le matin
    mission_du = lambda j: (missions_jours or {}).get(str(j)) if j >= missions.DEPUIS else None  # noqa: E731
    bonus, frise = [], []
    retenues, en_attente, missions_gardees = [], [], []  # gardées par le champion ; sac et balls sans rien de nouveau
    chaine, chance_prise, perdues, en_defi = 0, False, 0, False
    avant, chrono, hier = 0.0, None, None
    starter = None  # le Pokémon du cadeau du Professeur
    reserves = lambda noms: [n for n in noms if not starter or n not in LIGNES[starter][1:]]  # ses évolutions ne sortent pas des balls  # noqa: E731

    def noter(c):
        nonlocal chaine, chance_prise, starter
        captures.append(c)
        if c["id"].endswith("#chen"):
            starter = c["num"]
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
        manquent = [n for n in OISEAUX if n not in {x for x, _ in possedees}]
        if rng.random() < p and manquent:
            mi["fixe"], mi["chance"] = rng.choice(manquent), True
            chance_prise = True

    def capture(mi, ici, passes):
        """La capture d'une ball, ou None si elle ne donne rien pour l'instant."""
        i, ball = mi["id"], BALLS[mi["ball"]]
        p = min(R["shiny"] * ball["shiny"] * mi["shiny_bonus"], R["shiny_max"])
        rng = random.Random(i)
        if mi.get("fixe"):
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
            c = tirer(i, possedees, reserves(ici), reserves(passes), mi["types"], p, mi.get("nouvelle", ball["nouvelle"]), mi.get("seul_type"))
        return c

    def finaliser(c, mi, lieu):
        nonlocal chrono
        cle = mi["cle"]
        c |= {"id": mi["id"], "jour": str(mi["jour"]), "ball": mi["ball"], "raison": mi["raison"], "lieu": lieu}
        if cle.startswith("poke") and cle[4:].isdigit():
            c["c"] = int(cle[4:]) * R["barre"]
        elif cle == "chen":
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
        s = stats.loc[jour].to_dict() if jour in stats.index else {}
        m = mesures(s, [chiffres.contenu(p) for p in (resumes.get(str(jour)) or {}).get("exercise") or []], jour)
        ok, chrono = objectif_ok(m), None
        debut_fenetre = max(depuis_master, jour - dt.timedelta(days=R["master_fenetre"] - 1))
        jours_ok = [j for j in jours_ok if j >= debut_fenetre] + ([jour] if ok else [])
        shiny_ball = None
        if len(jours_ok) >= R["master_jours"]:  # 25 jours sur 30 : une Shiny Ball, et on recommence à compter
            shiny_balls += 1
            shiny_ball, jours_ok, depuis_master = shiny_balls, [], jour + dt.timedelta(days=1)
        shiny_bonus = R["shiny_nuit"] if m["sommeil"] >= R["nuit"] else 1
        tous_bonus = bonus_du_jour(jour, stats, resumes, mission_du, gestes)
        mission_jour = [b for b in tous_bonus if b[0] == "🎯"]
        bonus = [b for b in tous_bonus if b[0] != "🎯"]
        # dès le lendemain de l'arrivée, la mission attend la victoire (les points du jour ne bougent plus la carte)
        etait_en_defi = voyage.arrivee is not None and voyage.arrivee < jour
        if not etait_en_defi:
            bonus += mission_jour
        avant, cumul = cumul, cumul + sum(m["points"].values()) + sum(p for _, _, p in bonus)
        p0 = voyage.pos
        g = (gestes or {}).get(str(jour)) or {}
        soir = ((missions_jours or {}).get(str(jour)) or {}).get("pas_soir") or 0
        badges = voyage.avancer(jour, {"pas": m["pas"], "zone": m["zone"], "etages": m["etages"], "eau": m["eau"], "force_min": m["force"],
                                       "seance": m["seance_max"], "soir": soir, "pompes": g.get("pompes", 0), "tractions": g.get("tractions", 0),
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
        lieu = kanto.LIEUX[voyage.ici()]["nom"]
        frise.append({"jour": str(jour), "c0": round(avant, 1), "c1": round(cumul, 1), "p0": round(p0, 1),
                      "p1": round(voyage.pos, 1)})
        if jour.weekday() == 0:
            pesees = set()
        if pesee_matin(resumes.get(str(jour))):
            pesees.add(jour)
        sanct = []
        for k in voyage.sanct_du_jour:
            num = kanto.SANCT_INDEX[k]
            nom = POKEMON[num]["nom"]
            if num in {n for n, _ in possedees}:  # déjà attrapé par chance : le sanctuaire donne une Shiny Ball
                sanct.append({"cle": f"sanct{num}", "ball": "shiny", "types": None,
                              "raison": f"🏛️ Sanctuaire de {kanto.LIEUX[k]['nom']} ({nom} déjà attrapé)"})
            else:
                sanct.append({"cle": f"sanct{num}", "ball": "master", "types": None, "fixe": num,
                              "raison": f"🏛️ Sanctuaire de {kanto.LIEUX[k]['nom']} : {nom}"})
        dues = balls_du_jour(jour, m, avant, cumul, shiny_ball, badges, debut, sanct)
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
                if niveau(cumul) >= seuil and not any(n == num for n, _ in possedees):
                    mi = {"cle": f"evo{stade}", "ball": "evo", "types": None, "fixe": num, "jour": jour, "shiny_bonus": 1,
                          "raison": f"✨ {POKEMON[LIGNES[starter][stade - 1]]['nom']} évolue en {POKEMON[num]['nom']}", "id": ident(jour, f"evo{stade}", ami)}
                    noter(figees.get(mi["id"]) or finaliser(capture(mi, ici, passes), mi, lieu))
        # le Pokédex est complet (les 146) : le diplôme du Professeur Chen, avec Mew
        if len({n for n, _ in possedees if n not in LEGENDAIRES}) >= TOTAL_ESPECES and 151 not in {n for n, _ in possedees}:
            mi = {"cle": "diplome", "ball": "master", "types": None, "fixe": 151, "jour": jour, "shiny_bonus": shiny_bonus,
                  "raison": "🎓 Diplôme du Professeur Chen", "id": ident(jour, "diplome", ami)}
            noter(figees.get(mi["id"]) or finaliser(capture(mi, ici, passes), mi, lieu))
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
    niv = niveau(cumul)
    prochaine = next((s for s in R["evolutions"] if s > niv), None)
    return captures, {"pesees": {"semaine": semaine, "nb": len(pesees), "cible": R["pesees"],
                                 "avant": R["pesee_avant"], "derniere": derniere, "bonus": R["bonus_pesee"]},
                      "serie": len(jours_ok), "serie_ok": ok, "fenetre": fenetre, "voyage": voyage.etat(aujourd),
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
                      "fini": 9 in voyage.badges, "hier": hier, "gestes_jour": (gestes or {}).get(str(aujourd)) or {"pompes": 0, "tractions": 0, "squats": 0, "series": 0},
                      "starter": starter and {"ligne": LIGNES[starter], "niveau": niv, "pts_niveau": R["pts_niveau"], "dans_niveau": round(cumul % R["pts_niveau"], 1),
                                              "evolue_a": prochaine, "reste": round((prochaine - R["niveau_depart"]) * R["pts_niveau"] - cumul) if prochaine else None}}


def etat_mission(aujourd, stats, mission_du, gestes=None):
    """Ce que l'écran montre de la mission du jour (et du coucher d'hier soir)."""
    st = lambda j: stats.loc[j].to_dict() if j in stats.index else {}  # noqa: E731
    e, hier = mission_du(aujourd), mission_du(aujourd - dt.timedelta(days=1))
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
                  "bonus": m.get("bonus", missions.BONUS), "num": m.get("num"), "geste": m.get("geste")}
    if hier and hier.get("cle") == "coucher":
        c = st(aujourd).get("coucher")
        sortie = (sortie or {}) | {"hier_coucher": None if c is None or c != c else round(c),
                                   "hier_ok": missions.reussite("coucher", aujourd - dt.timedelta(days=1), st, mission_du)}
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
    debut, ami = joueur["debut"] if joueur else REGLAGES["debut"], joueur["id"] if joueur else None
    annees = range(debut.year, aujourd.year + 1)
    # les fichiers d'aujourd'hui et d'hier : le moment des Super / Hyper Balls pas encore figées avec leur moment
    recents = {j: f"data/jour/{j.year}/{j}.json" for j in (aujourd - dt.timedelta(days=1), aujourd) if j >= debut}
    f = lire([f"data/resume/{y}.json" for y in annees] + [FIGEES, OUVERTES, GESTES, missions.FICHIER] + list(recents.values()))
    resumes = {}
    for y in annees:
        resumes.update(f.get(f"data/resume/{y}.json") or {})
    jours = [debut + dt.timedelta(days=i) for i in range((aujourd - debut).days + 1)]
    stats = pd.DataFrame({j: chiffres.stats_jour(resumes.get(str(j))) for j in jours}).T
    figees = [c for c in (f.get(FIGEES) or {}).get("captures", [])  # seulement celles de la partie en cours
              if c["jour"] >= str(debut) and c["id"].startswith(ident(c["jour"], "", ami))]
    anniv = jours_anniversaire((f.get(OUVERTES) or {}).get("ouvertes", {}), figees, ami, debut, aujourd, anniversaire)
    gestes = gestes_du(f.get(GESTES), (f.get(OUVERTES) or {}).get("ouvertes", {}), ami, aujourd)
    return jouer(stats, resumes, aujourd, figees, (f.get(missions.FICHIER) or {}).get("jours"),
                 {j: f.get(c) for j, c in recents.items()}, joueur, anniv, gestes)


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
