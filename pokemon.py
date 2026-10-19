"""Le jeu Pokémon : chaque jour, des missions (pas, sortie, étages, minutes en zone, sommeil…) qui donnent chacune une
capture, avec plus de chances de tomber sur certains types selon la mission.

Tout est rejouable : chaque capture a un identifiant (« 2026-10-19#pas5000 ») qui sert de graine au hasard, donc les
mêmes données donnent toujours les mêmes Pokémon. Chaque matin, la tâche du coach fige les jours passés dans
data/pokemon/captures.json (branche data) : une capture figée ne change plus jamais, même si la montre synchronise tard.

    python3 pokemon.py figer DOSSIER_DATA   -> ajoute à data/pokemon/captures.json les captures des jours passés
"""
import datetime as dt
import json
import random
import sys
from pathlib import Path

import pandas as pd

import chiffres
from pokedex import LEGENDAIRES, POKEMON

REGLAGES = {
    "debut": dt.date(2026, 10, 19),  # premier jour du jeu (Pokédex remis à zéro le 19/10)
    "shiny": 0.03,                   # chance de shiny de base
    "shiny_max": 0.5,
    "masse_grasse": [(20.0, 1.5), (20.5, 1.25)],  # sous ce % (moyenne des 7 dernières pesées) : shiny ×
    "biais_type": 0.8,               # chance qu'une mission donne un Pokémon de ses types
    "garde_fou": 25,                 # après tant de tirages sans nouvelle espèce, la suivante est garantie nouvelle
    "serie_legendaire": 30,          # jours d'affilée avec l'objectif pour un légendaire
    "objectif_pas": 5000, "objectif_zone": 15,  # « objectif atteint » pour la série
}

# Les missions du jour, dans l'ordre où on les remplit d'habitude (le sommeil le matin, le reste au fil de la journée).
# mesure : chiffre du jour comparé au seuil ; types : None = tous les types ; shiny : multiplicateur de chance.
MISSIONS = [
    {"cle": "sommeil", "icone": "😴", "titre": "Nuit de 7 h", "mesure": "sommeil", "seuil": 420, "unite": "min",
     "types": ["Psy", "Spectre", "Fée"], "shiny": 1},
    {"cle": "cadeau", "icone": "🎁", "titre": "Cadeau du jour", "mesure": None, "seuil": 0, "types": None, "shiny": 1},
    {"cle": "pas5000", "icone": "👟", "titre": "5 000 pas", "mesure": "pas", "seuil": 5000, "types": None, "shiny": 1},
    {"cle": "pas6500", "icone": "👟", "titre": "6 500 pas", "mesure": "pas", "seuil": 6500, "types": None, "shiny": 1.5},
    {"cle": "pas8000", "icone": "👟", "titre": "8 000 pas", "mesure": "pas", "seuil": 8000, "types": None, "shiny": 2.5},
    {"cle": "pas10000", "icone": "👟", "titre": "10 000 pas", "mesure": "pas", "seuil": 10000, "types": None,
     "shiny": 4},
    {"cle": "sortie", "icone": "🌳", "titre": "Marche dehors de 20 min", "mesure": "marche", "seuil": 20,
     "unite": "min", "types": ["Plante", "Insecte", "Poison"], "shiny": 1},
    {"cle": "etages", "icone": "🪜", "titre": "10 étages", "mesure": "etages", "seuil": 10,
     "types": ["Roche", "Sol", "Acier"], "shiny": 1},
    {"cle": "zone15", "icone": "🔥", "titre": "15 min en zone", "mesure": "zone", "seuil": 15, "unite": "min",
     "types": ["Feu", "Électrik", "Combat"], "shiny": 1.5},
    {"cle": "zone30", "icone": "🔥", "titre": "30 min en zone", "mesure": "zone", "seuil": 30, "unite": "min",
     "types": ["Feu", "Électrik", "Combat", "Dragon"], "shiny": 3},
    {"cle": "velo", "icone": "🚴", "titre": "Vélo 10 min", "mesure": "velo", "seuil": 10, "unite": "min",
     "types": ["Vol", "Normal"], "shiny": 1},
    {"cle": "rameur", "icone": "🚣", "titre": "Rameur 10 min", "mesure": "rameur", "seuil": 10, "unite": "min",
     "types": ["Eau", "Glace"], "shiny": 1.5},
]
SPORTS_MESURE = {"WALKING": "marche", "OUTDOOR_BIKE": "velo", "BIKING": "velo", "ROWING_MACHINE": "rameur"}
VERSIONS = {int(k): [dict(zip(("fichier", "generation", "jeu", "variante"), v)) for v in vs]
            for k, vs in json.loads(Path(__file__).with_name("versions.json").read_text(encoding="utf-8")).items()}
TOTAL_VERSIONS = sum(len(v) for v in VERSIONS.values())
FIGEES = "data/pokemon/captures.json"


def mesures(s, exercices):
    """Les chiffres du jour utilisés par les missions (la plus longue séance de chaque sport, en minutes)."""
    m = {k: s[k] if pd.notna(s.get(k)) else 0 for k in ("pas", "zone", "etages", "sommeil")}
    for c in exercices:
        cle = SPORTS_MESURE.get(c.get("exerciseType"))
        if cle:
            m[cle] = max(m.get(cle, 0), chiffres.duree(c.get("activeDuration")) / 60)
    return m


def tirer(graine, possedees, sans_nouvelle, types=None, shiny=0.03, legendaire=False):
    """Une capture : d'abord l'espèce (biais de type, garde-fou), puis une version pas encore possédée."""
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
        if sans_nouvelle >= REGLAGES["garde_fou"]:
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


def jouer(stats, resumes, aujourd, figees=()):
    """Rejoue le jeu du premier jour à aujourd'hui. stats = DataFrame par jour (chiffres.stats_jour), resumes = {jour:
    résumé}. Les captures figées sont reprises telles quelles ; les autres sont tirées. -> (captures, état)."""
    figees = {c["id"]: c for c in figees}
    captures, possedees, sans_nouvelle, serie, joker_semaine = [], set(), 0, 0, None
    gras = stats["gras"].apply(pd.to_numeric, errors="coerce") if "gras" in stats else pd.Series(dtype=float)
    jour, m = REGLAGES["debut"], {}
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
        dues = [mi for mi in MISSIONS if mi["mesure"] is None or m.get(mi["mesure"], 0) >= mi["seuil"]]
        if ok and serie % REGLAGES["serie_legendaire"] == 0:
            dues.append({"cle": f"serie{serie}", "icone": "👑", "titre": f"Série de {serie} jours", "types": None,
                         "shiny": 1, "legendaire": True})
        ids = {f"{jour}#{mi['cle']}" for mi in dues}
        dues += [{"cle": i.split("#")[1]} for i in figees if i.startswith(f"{jour}#") and i not in ids]  # figées
        for mi in dues:  # une capture figée reste, même si les chiffres ont baissé depuis
            ident = f"{jour}#{mi['cle']}"
            c = figees.get(ident)
            if c is None:
                p = min(REGLAGES["shiny"] * mi["shiny"] * bonus, REGLAGES["shiny_max"])
                c = tirer(ident, possedees, sans_nouvelle, mi["types"], p, mi.get("legendaire", False))
                if c is None:
                    continue
                c |= {"id": ident, "jour": str(jour), "raison": f"{mi['icone']} {mi['titre']}"}
            captures.append(c)
            possedees.add((c["num"], c["fichier"]))
            sans_nouvelle = 0 if c["nouvelle"] else sans_nouvelle + 1
        jour += dt.timedelta(days=1)
    return captures, {"serie": serie, "possedees": possedees, "mesures": m, "sans_nouvelle": sans_nouvelle}


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
