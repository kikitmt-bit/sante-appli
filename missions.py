"""La mission du jour (29/10, demande de Kiki) : une seule mission par jour, choisie sur ses lacunes des 14 derniers
jours (celle qu'il réussit le moins), parmi des missions faisables en télétravail et en appartement. Réussie = un petit
bonus de points d'effort (pas de Poké Ball). Les étages et les pauses toutes les 2 h ont été écartés (pas d'escalier,
télétravail). Le week-end : pas de mission de coucher.

Le choix est fait par le calcul de chaque heure (montre.py) et gardé dans data/pokemon/missions.json (branche data), avec
les pas d'avant 13 h de chaque jour (il faut les fichiers du jour, que l'appli ne lit pas) ; il ne change plus ensuite.
L'appli et pokemon.jouer lisent ce fichier pour savoir si la mission est réussie."""
import datetime as dt
import random

import chiffres

FICHIER = "data/pokemon/missions.json"
DEPUIS = dt.date(2026, 10, 30)  # premier jour avec une mission
BONUS = 25                       # points d'effort d'une mission réussie
HISTOIRE = 14                    # jours regardés pour trouver les lacunes

# cle -> titre, texte, seuil, jours possibles (0 = lundi), unité
MISSIONS = {
    "matinee": {"titre": "Matinée active", "texte": "2 000 pas avant 13 h", "seuil": 2000, "jours": {0, 1, 2, 3, 4},
                "unite": "pas", "lacune": "matinées actives"},
    "coucher": {"titre": "Coucher à l'heure", "texte": "Ce soir, au lit avant 0 h 30", "seuil": 24 * 60 + 30,
                "jours": {6, 0, 1, 2, 3}, "unite": "heure", "lacune": "couchers avant 0 h 30"},
    "zone": {"titre": "Fais monter ton cœur", "texte": "10 min en zone", "seuil": 10, "jours": set(range(7)),
             "unite": "min", "lacune": "jours avec 10 min en zone"},
    "seance": {"titre": "Petite séance", "texte": "10 min de sport (rameur, pompes…)", "seuil": 10,
               "jours": set(range(7)), "unite": "min", "lacune": "jours avec une séance"},
}


def pas_matin(jour_fichier, avant=13):
    """Les pas d'avant 13 h (heure locale) d'un fichier du jour, ou None s'il n'y en a pas."""
    t = chiffres.table((jour_fichier or {}).get("types", {}).get("steps"))
    if "countSum" not in t or "heure" not in t:
        return None
    h = t["heure"].astype(str).str[:2]
    import pandas as pd
    return float(pd.to_numeric(t.loc[h < f"{avant:02d}", "countSum"], errors="coerce").sum())


def reussite(cle, jour, stats, pas_du_matin):
    """True / False / None (on ne sait pas encore). stats(j) = chiffres.stats_jour du jour j (dict, peut être vide) ;
    pas_du_matin(j) = pas d'avant 13 h ou None. Le coucher d'un soir se lit dans la nuit qui finit le lendemain."""
    m = MISSIONS[cle]
    if cle == "matinee":
        v = pas_du_matin(jour)
        return None if v is None else v >= m["seuil"]
    if cle == "coucher":
        c = stats(jour + dt.timedelta(days=1)).get("coucher")
        return None if c is None or c != c else c <= m["seuil"]
    if cle == "zone":
        v = stats(jour).get("zone")
        return None if v is None or v != v else v >= m["seuil"]
    if cle == "seance":
        v = stats(jour).get("min_sport")
        return None if v is None or v != v else v >= m["seuil"]
    return None


def choisir(jour, stats, pas_du_matin, hier=None):
    """La mission du jour : la moins réussie des 14 derniers jours parmi celles possibles ce jour-là (pas deux fois de
    suite si une autre est presque aussi faible). -> (cle, raison)."""
    graine = random.Random(str(jour))
    notes = []
    for cle, m in MISSIONS.items():
        if jour.weekday() not in m["jours"]:
            continue
        r = [reussite(cle, j, stats, pas_du_matin) for j in (jour - dt.timedelta(days=k) for k in range(1, HISTOIRE + 1))
             if j.weekday() in m["jours"]]
        r = [x for x in r if x is not None]
        taux = sum(r) / len(r) if r else .5
        note = (1 - taux) - (.2 if cle == hier else 0) + graine.random() * .05
        notes.append((note, cle, sum(r), len(r)))
    note, cle, ok, n = max(notes)
    m = MISSIONS[cle]
    raison = f"Ces {HISTOIRE} derniers jours : {ok} {m['lacune']} sur {n}" if n else "Pour bien démarrer"
    return cle, raison


def calculer(ancien, aujourd, stats, lire_jour):
    """Le contenu de missions.json : {"jours": {jour: {cle, raison, pas_matin}}}. Les missions déjà choisies ne
    changent plus ; les pas d'avant 13 h sont relus pour aujourd'hui et hier (le reste est gardé)."""
    jours = dict((ancien or {}).get("jours", {}))
    debut = DEPUIS - dt.timedelta(days=HISTOIRE)
    a_lire = [debut + dt.timedelta(days=k) for k in range((aujourd - debut).days + 1)]
    a_lire = [j for j in a_lire if str(j) not in jours or "pas_matin" not in jours[str(j)] or j >= aujourd - dt.timedelta(days=1)]
    fichiers = lire_jour(a_lire)
    for j in a_lire:
        jours.setdefault(str(j), {})["pas_matin"] = pas_matin(fichiers.get(j))
    pm = lambda j: (jours.get(str(j)) or {}).get("pas_matin")  # noqa: E731
    j = DEPUIS
    while j <= aujourd:
        e = jours.setdefault(str(j), {})
        if "cle" not in e:
            e["cle"], e["raison"] = choisir(j, stats, pm, (jours.get(str(j - dt.timedelta(days=1))) or {}).get("cle"))
        j += dt.timedelta(days=1)
    return {"jours": dict(sorted(jours.items()))}
