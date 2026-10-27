"""Le jeu Pokémon : on gagne des Poké Balls en faisant du sport, jamais en ne faisant rien.

- La **barre d'effort** se remplit avec les pas (au-delà des 2 000 de la vie de tous les jours), les minutes en zone,
  les étages et les séances de sport (musculation, pompes, tractions, rameur : 2 points par minute) ; elle ne se vide
  pas le soir. Barre pleine (100 points) = une Poké Ball, dont les
  types favoris dépendent de ce qui a le plus rempli la barre ce jour-là (rameur -> Eau / Glace…).
- **Super Ball** : journée « objectif double » (5 000 pas ET 15 min en zone). Shiny ×2, une chance sur deux d'une
  espèce jamais vue.
- **Hyper Ball** : exploit du jour (10 000 pas, 30 min en zone ou une séance de 45 min). Shiny ×4, espèce nouvelle.
- **Master Ball** : 25 jours avec l'objectif (5 000 pas ou 15 min en zone) sur les 30 derniers = un légendaire. Une
  journée ratée ne remet rien à zéro : elle sort de la fenêtre 30 jours plus tard.
- Une nuit de 7 h ne donne pas de Poké Ball mais rend les shiny plus fréquents toute la journée (×1,5).
- **Voyage dans Kanto** (kanto.py) : les mêmes points font avancer sur la carte ; les Poké Balls donnent surtout les
  Pokémon du lieu où l'on est. Badge d'arène = Hyper Ball du type du champion ; Ligue = Master Ball.

Le Pokédex : une entrée par espèce, en normal et en shiny (plus de « versions » des différents jeux depuis le 28/10 ;
les images viennent du dépôt public PokeAPI/sprites). Jamais de doublon : on tire une espèce pas encore attrapée (ou
son shiny).

Tout est rejouable : chaque capture a un identifiant (« 2026-10-19#poke3 ») qui sert de graine au hasard, donc les
mêmes données donnent toujours les mêmes Pokémon. Mais le tirage dépend des chiffres du jour (types de la barre,
balls déjà gagnées) : le calcul de la montre (montre.py, après chaque récolte + chaque heure) fige donc toutes les captures,
celles d'aujourd'hui comprises, dans data/pokemon/captures_v2.json (branche data) : une capture figée ne change plus
jamais, même si la journée continue ou si la montre synchronise tard. (captures.json = l'ancien prototype, une Poké Ball offerte chaque jour : plus lu.)

    python3 pokemon.py figer DOSSIER_DATA   -> écrit data/pokemon/captures_v2.json (toutes les captures)
"""
import datetime as dt
import json
import math
import random
import sys
from pathlib import Path

import pandas as pd

import chiffres
import kanto
from pokedex import LEGENDAIRES, POKEMON

REGLAGES = {
    "debut": dt.date(2026, 10, 19),  # premier jour du jeu (règles v2 rejouées depuis le 19/10 avec les vraies données)
    "shiny": 0.03,                   # chance de shiny de base
    "shiny_max": 0.5,
    "nuit": 420, "shiny_nuit": 1.5,  # nuit d'au moins 7 h : shiny ×1,5 toute la journée
    "biais_type": 0.8,               # chance qu'une Poké Ball donne un Pokémon de ses types favoris
    "garde_fou": 12,                 # après tant de captures sans nouvelle espèce, la suivante est garantie nouvelle
    "barre": 100,                    # points d'effort pour une Poké Ball
    "pas_offerts": 2000,             # les pas de la vie de tous les jours ne comptent pas
    "seance_min": 10,                # une séance compte à partir de 10 min
    "force": 2, "force_depuis": dt.date(2026, 10, 28),  # points par minute de musculation / rameur (avant : 1)
    "master_jours": 25, "master_fenetre": 30,  # jours avec l'objectif sur les 30 derniers pour un légendaire
    "objectif_pas": 5000, "objectif_zone": 15,
    "exploit_pas": 10000, "exploit_zone": 30, "exploit_seance": 45,
}

BALLS = {  # shiny : multiplicateur ; nouvelle : chance d'une espèce jamais vue
    "poke": {"nom": "Poké Ball", "shiny": 1, "nouvelle": 0},
    "super": {"nom": "Super Ball", "shiny": 2, "nouvelle": 0.5},
    "hyper": {"nom": "Hyper Ball", "shiny": 4, "nouvelle": 1},
    "master": {"nom": "Master Ball", "shiny": 4, "nouvelle": 1},
}

# Ce qui remplit la barre : (icône, libellé, types favoris quand c'est ce qui a le plus rempli la barre du jour)
SOURCES = {
    "pas": ("👟", "Pas", None),
    "zone": ("🔥", "Minutes en zone", ["Feu", "Électrik", "Combat", "Dragon"]),
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

# Les images (dépôt public PokeAPI/sprites)
IMAGES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites"


def image(num, shiny=False):
    """La petite image (96 px) d'un Pokémon, normale ou shiny."""
    return f"{IMAGES}/pokemon/{'shiny/' if shiny else ''}{num}.png"


FIGEES = "data/pokemon/captures_v2.json"
OUVERTES = "data/pokemon/ouvertes.json"  # Poké Balls ouvertes, partagées par la montre et le téléphone (script Google)


def points_par_source(pas, zone, etages, sport, force=0.0):
    """Points d'effort d'une journée, par source (sport = minutes des séances d'au moins 10 min, dont force = minutes
    de musculation / rameur, qui comptent double)."""
    return {"pas": max(pas - REGLAGES["pas_offerts"], 0) / 100, "zone": 2 * zone, "etages": etages,
            "sport": sport + (REGLAGES["force"] - 1) * force}


def est_force(c):
    """Séance de musculation (pompes, tractions, poids…) ou de rameur, d'après son type ou son nom."""
    t, nom = (c.get("exerciseType") or "").upper(), (c.get("displayName") or "").lower()
    return any(f in t for f in FORCE_TYPES) or any(f in nom for f in FORCE_NOMS)


def mesures(s, exercices, jour=None):
    """Les chiffres du jour utilisés par le jeu : pas, zone, étages, sommeil, minutes de sport par type de séance."""
    m = {k: s[k] if pd.notna(s.get(k)) else 0 for k in ("pas", "zone", "etages", "sommeil")}
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
    m["points"] = points_par_source(m["pas"], m["zone"], m["etages"], m["sport"], force)
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
    if m["zone"] >= REGLAGES["exploit_zone"]:
        return "🔥", f"{m['zone']:.0f} min en zone", SOURCES["zone"][2]
    if m["pas"] >= REGLAGES["exploit_pas"]:
        return "👟", f"{chiffres.nombre(m['pas'])} pas", None
    return None


def tirer(graine, possedees, sans_nouvelle, types=None, shiny=0.03, p_nouvelle=0.0, legendaire=False, lieux=None,
          seul_type=None):
    """Une capture : une espèce (ou son shiny) pas encore attrapée, jamais de doublon. lieux = poids des Pokémon selon
    l'endroit du voyage ; types = types favoris de la barre (×3) ; seul_type = ball d'arène (ce type seulement)."""
    rng = random.Random(graine)
    especes = {n for n, _ in possedees}
    est_shiny = rng.random() < shiny
    base = list(LEGENDAIRES) if legendaire else [n for n in POKEMON if n not in LEGENDAIRES]
    if seul_type and any((n, False) not in possedees for n in base if seul_type in POKEMON[n]["types"]):
        base, lieux = [n for n in base if seul_type in POKEMON[n]["types"]], None
    pool = [n for n in base if (n, est_shiny) not in possedees]
    if not pool:  # tout est attrapé dans cette variante : l'autre (les shiny quand toutes les espèces sont là)
        est_shiny = not est_shiny
        pool = [n for n in base if (n, est_shiny) not in possedees]
        if not pool:
            return None  # tout est complet !
    if sans_nouvelle >= REGLAGES["garde_fou"] or rng.random() < p_nouvelle:
        pool = [n for n in pool if n not in especes] or pool
    poids = [lieux.get(n, 0) for n in pool] if lieux else [1] * len(pool)
    if not any(poids):  # plus rien de nouveau par ici : n'importe où dans Kanto
        poids = [1] * len(pool)
    if types:
        poids = [w * (3 if set(types) & set(POKEMON[n]["types"]) else 1) for w, n in zip(poids, pool)]
    num = rng.choices(pool, weights=poids)[0]
    return {"num": num, "shiny": est_shiny, "nouvelle": num not in especes}


def super_ok(m):
    """Journée « objectif double » (Super Ball)."""
    return m["pas"] >= REGLAGES["objectif_pas"] and m["zone"] >= REGLAGES["objectif_zone"]


def objectif_ok(m):
    """Le jour compte pour la Master Ball (5 000 pas ou 15 min en zone)."""
    return m["pas"] >= REGLAGES["objectif_pas"] or m["zone"] >= REGLAGES["objectif_zone"]


def balls_du_jour(jour, m, avant, apres, master=None, badges=()):
    """Les Poké Balls gagnées un jour : avant / apres = points d'effort cumulés depuis le début du jeu ; master = numéro
    de la Master Ball gagnée ce jour-là, ou None ; badges = [(numéro, lieu)] des arènes gagnées ce jour-là."""
    dues = []
    for k, lieu in badges:
        a = lieu["arene"]
        if a["type"] is None:  # la Ligue
            dues.append({"cle": "ligue", "ball": "master", "raison": "🏆 Champion de la Ligue Pokémon !",
                         "types": None, "legendaire": True})
        else:
            dues.append({"cle": f"badge{k}", "ball": "hyper", "types": None, "seul_type": a["type"], "nouvelle": 1,
                         "raison": f"🏅 {a['badge']} ({a['champion']}, {lieu['nom']})"})
    if master:
        dues.append({"cle": f"master{master}", "ball": "master",
                     "raison": f"👑 {REGLAGES['master_jours']} jours sur {REGLAGES['master_fenetre']}",
                     "types": None, "legendaire": True})
    e = exploit(m)
    if e:
        dues.append({"cle": "hyper", "ball": "hyper", "raison": f"{e[0]} Exploit : {e[1]}", "types": e[2]})
    if super_ok(m):
        dues.append({"cle": "super", "ball": "super", "raison": "🎯 Objectif double : pas et minutes en zone",
                     "types": None})
    ic, nom, types = origine_barre(m)
    b = REGLAGES["barre"]
    for k in range(math.floor(avant / b) + 1, math.floor(apres / b) + 1):
        dues.append({"cle": f"poke{k}", "ball": "poke", "raison": f"⚡ Barre d'effort n° {k} ({ic} {nom})",
                     "types": types})
    return dues


def jouer(stats, resumes, aujourd, figees=()):
    """Rejoue le jeu du premier jour à aujourd'hui. stats = DataFrame par jour (chiffres.stats_jour), resumes = {jour:
    résumé}. Les captures figées sont reprises telles quelles ; les autres sont tirées. -> (captures, état)."""
    figees = {c["id"]: c for c in figees}
    captures, possedees, sans_nouvelle, cumul = [], set(), 0, 0.0
    jours_ok, masters, depuis_master = [], 0, REGLAGES["debut"]  # Master Ball : jours avec l'objectif dans la fenêtre
    voyage = kanto.Voyage()
    jour, m, ok, bonus = REGLAGES["debut"], {}, False, 1
    while jour <= aujourd:
        s = stats.loc[jour].to_dict() if jour in stats.index else {}
        m = mesures(s, [chiffres.contenu(p) for p in (resumes.get(str(jour)) or {}).get("exercise") or []], jour)
        ok = objectif_ok(m)
        debut_fenetre = max(depuis_master, jour - dt.timedelta(days=REGLAGES["master_fenetre"] - 1))
        jours_ok = [j for j in jours_ok if j >= debut_fenetre] + ([jour] if ok else [])
        master = None
        if len(jours_ok) >= REGLAGES["master_jours"]:  # 25 jours sur 30 : une Master Ball, et on recommence à compter
            masters += 1
            master, jours_ok, depuis_master = masters, [], jour + dt.timedelta(days=1)
        bonus = REGLAGES["shiny_nuit"] if m["sommeil"] >= REGLAGES["nuit"] else 1
        avant, cumul = cumul, cumul + sum(m["points"].values())
        badges = voyage.avancer(jour, {"pas": m["pas"], "zone": m["zone"], "etages": m["etages"], "eau": m["eau"],
                                       "force": m["nb_force"], "ok": ok, "super": super_ok(m)}, cumul)
        lieu, poids_lieux = kanto.LIEUX[voyage.ici()]["nom"], voyage.poids()
        dues = balls_du_jour(jour, m, avant, cumul, master, badges)
        ids = {f"{jour}#{mi['cle']}" for mi in dues}
        dues += [{"cle": i.split("#")[1]} for i in figees if i.startswith(f"{jour}#") and i not in ids]  # figées
        dues.sort(key=lambda mi: f"{jour}#{mi['cle']}" not in figees)  # figées d'abord : les nouvelles les évitent
        for mi in dues:  # une capture figée reste, même si les chiffres ont baissé depuis
            ident = f"{jour}#{mi['cle']}"
            c = figees.get(ident)
            if c is None:
                ball = BALLS[mi["ball"]]
                p = min(REGLAGES["shiny"] * ball["shiny"] * bonus, REGLAGES["shiny_max"])
                c = tirer(ident, possedees, sans_nouvelle, mi["types"], p, mi.get("nouvelle", ball["nouvelle"]),
                          mi.get("legendaire", False), poids_lieux, mi.get("seul_type"))
                if c is None:
                    continue
                c |= {"id": ident, "jour": str(jour), "ball": mi["ball"], "raison": mi["raison"], "lieu": lieu}
            else:
                c.setdefault("lieu", lieu)  # captures figées d'avant le voyage
            captures.append(c)
            possedees.add((c["num"], c["shiny"]))
            sans_nouvelle = 0 if c["nouvelle"] else sans_nouvelle + 1
        jour += dt.timedelta(days=1)
    b = REGLAGES["barre"]
    # La fenêtre de la Master Ball : un état par jour (1 = objectif, 0 = raté, None = aujourd'hui pas encore), du plus
    # vieux au plus récent, depuis la dernière Master Ball
    debut_fenetre = max(depuis_master, aujourd - dt.timedelta(days=REGLAGES["master_fenetre"] - 1))
    fenetre = [1 if j in jours_ok else (None if j == aujourd else 0)
               for j in (debut_fenetre + dt.timedelta(days=i) for i in range((aujourd - debut_fenetre).days + 1))]
    return captures, {"serie": len(jours_ok), "serie_ok": ok, "fenetre": fenetre, "voyage": voyage.etat(aujourd),
                      "possedees": possedees, "mesures": m, "sans_nouvelle": sans_nouvelle,
                      "barre": cumul % b, "origine": origine_barre(m) if m else SOURCES["pas"], "shiny_bonus": bonus}


def charger_jeu(lire, aujourd):
    """Statistiques depuis le début du jeu et captures figées, avec la fonction `lire` de l'appli."""
    debut = REGLAGES["debut"]
    annees = range(debut.year, aujourd.year + 1)
    f = lire([f"data/resume/{y}.json" for y in annees] + [FIGEES])
    resumes = {}
    for y in annees:
        resumes.update(f.get(f"data/resume/{y}.json") or {})
    jours = [debut + dt.timedelta(days=i) for i in range((aujourd - debut).days + 1)]
    stats = pd.DataFrame({j: chiffres.stats_jour(resumes.get(str(j))) for j in jours}).T
    figees = [c for c in (f.get(FIGEES) or {}).get("captures", []) if c["jour"] >= str(REGLAGES["debut"])]
    return jouer(stats, resumes, aujourd, figees)


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
