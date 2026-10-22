"""Le jeu Pokémon : on gagne des Poké Balls en faisant du sport, jamais en ne faisant rien.

- La **barre d'effort** se remplit avec les pas (au-delà des 2 000 de la vie de tous les jours), les minutes en zone,
  les étages et les séances de sport ; elle ne se vide pas le soir. Barre pleine (100 points) = une Poké Ball, dont les
  types favoris dépendent de ce qui a le plus rempli la barre ce jour-là (rameur -> Eau / Glace…).
- **Super Ball** : journée « objectif double » (5 000 pas ET 15 min en zone). Shiny ×2, une chance sur deux d'une
  espèce jamais vue.
- **Hyper Ball** : exploit du jour (10 000 pas, 30 min en zone ou une séance de 45 min). Shiny ×4, espèce nouvelle.
- **Master Ball** : 30 jours d'affilée avec l'objectif (5 000 pas ou 15 min en zone, un joker par semaine) = un
  légendaire.
- Une nuit de 7 h ne donne pas de Poké Ball mais rend les shiny plus fréquents toute la journée (×1,5).

Tout est rejouable : chaque capture a un identifiant (« 2026-10-19#poke3 ») qui sert de graine au hasard, donc les
mêmes données donnent toujours les mêmes Pokémon. Chaque matin, la tâche du coach fige les jours passés dans
data/pokemon/captures_v2.json (branche data) : une capture figée ne change plus jamais, même si la montre synchronise
tard. (captures.json = l'ancien prototype, une Poké Ball offerte chaque jour : plus lu.)

    python3 pokemon.py figer DOSSIER_DATA   -> ajoute à data/pokemon/captures_v2.json les captures des jours passés
"""
import datetime as dt
import json
import math
import random
import sys
from pathlib import Path

import pandas as pd

import chiffres
from pokedex import LEGENDAIRES, POKEMON

REGLAGES = {
    "debut": dt.date(2026, 10, 19),  # premier jour du jeu (règles v2 rejouées depuis le 19/10 avec les vraies données)
    "shiny": 0.03,                   # chance de shiny de base
    "shiny_max": 0.5,
    "nuit": 420, "shiny_nuit": 1.5,  # nuit d'au moins 7 h : shiny ×1,5 toute la journée
    "masse_grasse": [(20.0, 1.5), (20.5, 1.25)],  # sous ce % (moyenne des 7 dernières pesées) : shiny ×
    "biais_type": 0.8,               # chance qu'une Poké Ball donne un Pokémon de ses types favoris
    "garde_fou": 12,                 # après tant de captures sans nouvelle espèce, la suivante est garantie nouvelle
    "barre": 100,                    # points d'effort pour une Poké Ball
    "pas_offerts": 2000,             # les pas de la vie de tous les jours ne comptent pas
    "seance_min": 10,                # une séance compte à partir de 10 min
    "serie_legendaire": 30,          # jours d'affilée avec l'objectif pour un légendaire
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

VERSIONS = {int(k): [dict(zip(("fichier", "generation", "jeu", "variante"), v)) for v in vs]
            for k, vs in json.loads(Path(__file__).with_name("versions.json").read_text(encoding="utf-8")).items()}
TOTAL_VERSIONS = sum(len(v) for v in VERSIONS.values())
FIGEES = "data/pokemon/captures_v2.json"
OUVERTES = "data/pokemon/ouvertes.json"  # Poké Balls ouvertes, partagées par la montre et le téléphone (script Google)


def points_par_source(pas, zone, etages, sport):
    """Points d'effort d'une journée, par source (sport = minutes des séances d'au moins 10 min)."""
    return {"pas": max(pas - REGLAGES["pas_offerts"], 0) / 100, "zone": 2 * zone, "etages": etages, "sport": sport}


def mesures(s, exercices):
    """Les chiffres du jour utilisés par le jeu : pas, zone, étages, sommeil, minutes de sport par type de séance."""
    m = {k: s[k] if pd.notna(s.get(k)) else 0 for k in ("pas", "zone", "etages", "sommeil")}
    m["sports"], m["seance_max"] = {}, 0
    for c in exercices:
        minutes = chiffres.duree(c.get("activeDuration")) / 60
        if minutes >= REGLAGES["seance_min"]:
            t = c.get("exerciseType") or "OTHER"
            m["sports"][t] = m["sports"].get(t, 0) + minutes
            m["seance_max"] = max(m["seance_max"], minutes)
    m["sport"] = sum(m["sports"].values())
    m["points"] = points_par_source(m["pas"], m["zone"], m["etages"], m["sport"])
    return m


def sport_principal(m):
    return SPORTS.get(max(m["sports"], key=m["sports"].get), SPORT_AUTRE) if m["sports"] else SPORT_AUTRE


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


def tirer(graine, possedees, sans_nouvelle, types=None, shiny=0.03, p_nouvelle=0.0, legendaire=False):
    """Une capture : d'abord l'espèce (nouvelle espèce selon la ball, biais de type, garde-fou), puis une version pas
    encore possédée (jamais de doublon)."""
    rng = random.Random(graine)
    manquantes = {n: [v for v in VERSIONS[n] if (n, v["fichier"]) not in possedees] for n in VERSIONS}
    especes = {n for n, _ in possedees}
    num = None
    if legendaire:
        num = next((n for n in LEGENDAIRES if n not in especes), None) or \
              next((n for n in LEGENDAIRES if manquantes[n]), None)
    if num is None:
        pool = [n for n in POKEMON if n not in LEGENDAIRES and manquantes[n]]
        if not pool:
            return None  # tout est complet !
        if sans_nouvelle >= REGLAGES["garde_fou"] or rng.random() < p_nouvelle:
            pool = [n for n in pool if n not in especes] or pool
        poids = [1.0] * len(pool)
        if types and rng.random() < REGLAGES["biais_type"]:
            # Un Pokémon à deux types compte pour moitié dans chacun (équitable sur la durée)
            w = [sum(t in types for t in POKEMON[n]["types"]) / len(POKEMON[n]["types"]) for n in pool]
            if any(w):
                poids = w
        num = rng.choices(pool, weights=poids)[0]
    est_shiny = rng.random() < shiny
    choix = [v for v in manquantes[num] if (v["variante"] == "shiny") == est_shiny] or manquantes[num]
    v = rng.choice(choix)
    return {"num": num, "fichier": v["fichier"], "shiny": v["variante"] == "shiny", "jeu": v["jeu"],
            "generation": v["generation"], "nouvelle": num not in especes}


def balls_du_jour(jour, m, avant, apres, ok, serie):
    """Les Poké Balls gagnées un jour : avant / apres = points d'effort cumulés depuis le début du jeu."""
    dues = []
    if ok and serie and serie % REGLAGES["serie_legendaire"] == 0:
        dues.append({"cle": f"master{serie}", "ball": "master", "raison": f"👑 Série de {serie} jours",
                     "types": None, "legendaire": True})
    e = exploit(m)
    if e:
        dues.append({"cle": "hyper", "ball": "hyper", "raison": f"{e[0]} Exploit : {e[1]}", "types": e[2]})
    if m["pas"] >= REGLAGES["objectif_pas"] and m["zone"] >= REGLAGES["objectif_zone"]:
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
    captures, possedees, sans_nouvelle, serie, joker_semaine, cumul = [], set(), 0, 0, None, 0.0
    gras = stats["gras"].apply(pd.to_numeric, errors="coerce") if "gras" in stats else pd.Series(dtype=float)
    jour, m, ok, bonus = REGLAGES["debut"], {}, False, 1
    while jour <= aujourd:
        s = stats.loc[jour].to_dict() if jour in stats.index else {}
        m = mesures(s, [chiffres.contenu(p) for p in (resumes.get(str(jour)) or {}).get("exercise") or []])
        ok = m["pas"] >= REGLAGES["objectif_pas"] or m["zone"] >= REGLAGES["objectif_zone"]
        if ok:
            serie += 1
        elif jour < aujourd:  # une journée ratée : le joker de la semaine la couvre, sinon la série repart à zéro
            semaine = jour.isocalendar()[:2]
            if joker_semaine != semaine and serie:
                joker_semaine = semaine
            else:
                serie = 0
        pesees = gras.loc[:jour - dt.timedelta(days=1)].dropna().tail(7)
        bonus = next((b for seuil, b in REGLAGES["masse_grasse"] if len(pesees) and pesees.mean() < seuil), 1)
        if m["sommeil"] >= REGLAGES["nuit"]:
            bonus *= REGLAGES["shiny_nuit"]
        avant, cumul = cumul, cumul + sum(m["points"].values())
        dues = balls_du_jour(jour, m, avant, cumul, ok, serie)
        ids = {f"{jour}#{mi['cle']}" for mi in dues}
        dues += [{"cle": i.split("#")[1]} for i in figees if i.startswith(f"{jour}#") and i not in ids]  # figées
        for mi in dues:  # une capture figée reste, même si les chiffres ont baissé depuis
            ident = f"{jour}#{mi['cle']}"
            c = figees.get(ident)
            if c is None:
                ball = BALLS[mi["ball"]]
                p = min(REGLAGES["shiny"] * ball["shiny"] * bonus, REGLAGES["shiny_max"])
                c = tirer(ident, possedees, sans_nouvelle, mi["types"], p, ball["nouvelle"], mi.get("legendaire", False))
                if c is None:
                    continue
                c |= {"id": ident, "jour": str(jour), "ball": mi["ball"], "raison": mi["raison"]}
            captures.append(c)
            possedees.add((c["num"], c["fichier"]))
            sans_nouvelle = 0 if c["nouvelle"] else sans_nouvelle + 1
        jour += dt.timedelta(days=1)
    b = REGLAGES["barre"]
    return captures, {"serie": serie, "serie_ok": ok, "joker_libre": joker_semaine != aujourd.isocalendar()[:2],
                      "possedees": possedees, "mesures": m, "sans_nouvelle": sans_nouvelle,
                      "barre": cumul % b, "origine": origine_barre(m) if m else SOURCES["pas"], "shiny_bonus": bonus}


def charger_jeu(lire, aujourd):
    """Statistiques depuis le début du jeu (+ pesées d'avant) et captures figées, avec la fonction `lire` de l'appli."""
    debut = REGLAGES["debut"] - dt.timedelta(days=60)
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
    """Écrit le fichier des captures figées : celles des jours passés (jamais aujourd'hui, qui n'est pas fini)."""
    import coach
    aujourd = dt.datetime.now(chiffres.TZ).date()
    captures, _ = charger_jeu(coach.lecteur(dossier), aujourd)
    passees = [c for c in captures if c["jour"] < str(aujourd)]
    chemin = Path(dossier) / FIGEES
    chemin.parent.mkdir(parents=True, exist_ok=True)
    chemin.write_text(json.dumps({"captures": passees}, ensure_ascii=False, indent=0), encoding="utf-8")
    print(f"{chemin} : {len(passees)} captures figées")


if __name__ == "__main__":
    if sys.argv[1:2] == ["figer"]:
        figer(sys.argv[2])
    else:
        sys.exit(__doc__)
