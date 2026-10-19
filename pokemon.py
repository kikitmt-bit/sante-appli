"""Le jeu Pokémon : chaque jour, des captures gagnées avec les pas et les minutes en zone.

Tout est rejouable : chaque capture a un identifiant (« 2026-10-18#2 ») qui sert de graine au hasard, donc les mêmes
données donnent toujours les mêmes Pokémon. Chaque matin, la tâche du coach fige les jours passés dans
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
    "debut": dt.date(2026, 10, 12),  # premier jour du jeu (prototype : lundi 12/10)
    "shiny": 0.03,                   # chance de shiny de base
    "shiny_max": 0.5,
    "paliers_pas": [(5000, 1), (6500, 1.5), (8000, 2.5), (10000, 4)],  # (pas, multiplicateur de shiny) : 1 capture chacun
    "paliers_zone": [(15, 1.5), (30, 3)],  # (minutes en zone, multiplicateur) : 1 capture chacun, du type de l'exercice
    "masse_grasse": [(20.0, 1.5), (20.5, 1.25)],  # sous ce % (moyenne des 7 dernières pesées) : shiny ×
    "biais_type": 0.8,               # chance que la capture d'un exercice soit de sa famille de types
    "garde_fou": 25,                 # après tant de tirages sans nouvelle espèce, la suivante est garantie nouvelle
    "serie_legendaire": 30,          # jours d'affilée avec l'objectif pour un légendaire
    "objectif_pas": 5000, "objectif_zone": 15,  # « objectif atteint » pour la série
}

FAMILLES = {
    "Marche": ["Plante", "Insecte"], "Vélo": ["Normal", "Vol"], "Rameur": ["Eau", "Glace"],
    "Muscu": ["Combat", "Roche", "Sol", "Acier"], "Cardio": ["Électrik", "Feu", "Psy", "Fée"],
    "Soir": ["Poison", "Spectre", "Dragon"],
}
SPORT_FAMILLE = {
    "WALKING": "Marche", "OUTDOOR_BIKE": "Vélo", "BIKING": "Vélo", "ROWING_MACHINE": "Rameur", "SPORT": "Muscu",
    "WEIGHTS": "Muscu", "STRENGTH_TRAINING": "Muscu", "WORKOUT": "Muscu", "ELLIPTICAL": "Cardio", "RUNNING": "Cardio",
    "DANCE": "Cardio", "AEROBIC_WORKOUT": "Cardio", "OTHER": "Cardio",
}
VERSIONS = {int(k): [dict(zip(("fichier", "generation", "jeu", "variante"), v)) for v in vs]
            for k, vs in json.loads(Path(__file__).with_name("versions.json").read_text(encoding="utf-8")).items()}
TOTAL_VERSIONS = sum(len(v) for v in VERSIONS.values())
FIGEES = "data/pokemon/captures.json"


def famille_du_jour(exercices):
    """Famille de types de la séance qui a donné le plus de minutes en zone (après 21 h : « Soir »)."""
    meilleure, score = None, -1
    for c in exercices:
        z = (c.get("metricsSummary") or {}).get("heartRateZoneDurations") or {}
        s = (chiffres.duree(z.get("moderateTime")) + 2 * (chiffres.duree(z.get("vigorousTime"))
             + chiffres.duree(z.get("peakTime")))) * 1000 + chiffres.duree(c.get("activeDuration"))
        if s > score:
            meilleure, score = c, s
    if not meilleure:
        return None
    h = chiffres.local(meilleure["interval"]["startTime"]).hour
    return "Soir" if h >= 21 or h < 5 else SPORT_FAMILLE.get(meilleure.get("exerciseType"))


def captures_dues(s, famille, legendaire):
    """Les captures gagnées par une journée (dans un ordre fixe : les paliers ne font qu'en ajouter)."""
    dues = [{"raison": "Cadeau du jour", "mult": 1}]
    dues += [{"raison": f"{chiffres.nombre(p)} pas", "mult": m} for p, m in REGLAGES["paliers_pas"]
             if (s.get("pas") or 0) >= p]
    dues += [{"raison": f"{p} min en zone", "mult": m, "famille": famille} for p, m in REGLAGES["paliers_zone"]
             if (s.get("zone") or 0) >= p]
    if legendaire:
        dues.append({"raison": f"Série de {legendaire} jours", "mult": 1, "legendaire": True})
    return dues


def tirer(graine, possedees, sans_nouvelle, famille=None, shiny=0.03, legendaire=False):
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
        if famille and rng.random() < REGLAGES["biais_type"]:
            # Un Pokémon à deux types compte pour moitié dans chacune de ses familles (équitable sur la durée)
            w = [sum(t in FAMILLES[famille] for t in POKEMON[n]["types"]) / len(POKEMON[n]["types"]) for n in pool]
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
    par_jour = {}
    for c in figees:
        par_jour.setdefault(c["jour"], []).append(c)
    captures, possedees, sans_nouvelle, serie, joker_semaine = [], set(), 0, 0, None
    gras = stats["gras"].apply(pd.to_numeric, errors="coerce") if "gras" in stats else pd.Series(dtype=float)
    jour = REGLAGES["debut"]
    while jour <= aujourd:
        s = stats.loc[jour].to_dict() if jour in stats.index else {}
        ok = (s.get("pas") or 0) >= REGLAGES["objectif_pas"] or (s.get("zone") or 0) >= REGLAGES["objectif_zone"]
        if ok:
            serie += 1
        elif jour < aujourd:  # une journée ratée : le joker de la semaine la couvre, sinon la série repart à zéro
            semaine = jour.isocalendar()[:2]
            if joker_semaine != semaine and serie:
                joker_semaine = semaine
            else:
                serie = 0
        legendaire = serie if ok and serie and serie % REGLAGES["serie_legendaire"] == 0 else 0
        pesees = gras.loc[:jour - dt.timedelta(days=1)].dropna().tail(7)
        bonus = next((m for seuil, m in REGLAGES["masse_grasse"] if len(pesees) and pesees.mean() < seuil), 1)
        famille = famille_du_jour([chiffres.contenu(p) for p in (resumes.get(str(jour)) or {}).get("exercise") or []])
        deja, dues = par_jour.get(str(jour), []), captures_dues(s, famille, legendaire)
        for k in range(max(len(deja), len(dues))):  # une capture figée reste, même si les chiffres ont baissé depuis
            if k < len(deja):
                c = deja[k]
            else:
                due = dues[k]
                p = min(REGLAGES["shiny"] * due["mult"] * bonus, REGLAGES["shiny_max"])
                c = tirer(f"{jour}#{k}", possedees, sans_nouvelle, due.get("famille"), p, due.get("legendaire", False))
                if c is None:
                    continue
                c |= {"id": f"{jour}#{k}", "jour": str(jour), "raison": due["raison"],
                      "famille": due.get("famille")}
            captures.append(c)
            possedees.add((c["num"], c["fichier"]))
            sans_nouvelle = 0 if c["nouvelle"] else sans_nouvelle + 1
        jour += dt.timedelta(days=1)
    s = stats.loc[aujourd].to_dict() if aujourd in stats.index else {}
    prochain_pas = next((p for p, _ in REGLAGES["paliers_pas"] if (s.get("pas") or 0) < p), None)
    prochain_zone = next((p for p, _ in REGLAGES["paliers_zone"] if (s.get("zone") or 0) < p), None)
    return captures, {"serie": serie, "possedees": possedees, "pas": s.get("pas") or 0, "zone": s.get("zone") or 0,
                      "prochain_pas": prochain_pas, "prochain_zone": prochain_zone, "sans_nouvelle": sans_nouvelle}


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
    return jouer(stats, resumes, aujourd, (f.get(FIGEES) or {}).get("captures", []))


def figer(dossier):
    """Ajoute au fichier des captures figées celles des jours passés (jamais aujourd'hui, qui n'est pas fini)."""
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
