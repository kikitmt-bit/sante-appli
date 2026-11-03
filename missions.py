"""La mission du jour : une seule par jour, un Pokémon, un défi, 20 à 40 points d'effort selon la difficulté. Refaites le 03/11
avec Kiki : tirées au hasard parmi ce que la montre du joueur sait mesurer (pas la même avant 5 jours), sans changement possible,
sans sommeil ni horaires de bureau (amis infirmiers de nuit). Seuils testés sur 14 jours de vrais joueurs.
Les 4 anciennes (`ancienne`) restent pour rejouer les jours d'avant NOUVELLES à l'identique.

Le choix est fait par le calcul de chaque heure (montre.py) et gardé dans data/pokemon/missions.json (branche data), avec
ce qu'il faut lire dans les fichiers du jour (que l'appli ne lit pas) : pas d'avant 13 h, pas d'après 20 h, meilleure heure, heures
à 1 000 pas ; il ne change plus ensuite. L'appli et pokemon.jouer lisent ce fichier pour savoir si la mission est réussie."""
import datetime as dt
import random

import chiffres

FICHIER = "data/pokemon/missions.json"
DEPUIS = dt.date(2026, 10, 30)  # premier jour avec une mission
NOUVELLES = dt.date(2026, 11, 4)  # premier jour des missions d'aujourd'hui
BONUS = 25                       # points d'effort d'une ancienne mission réussie
HISTOIRE = 14                    # jours de données qu'il faut pour le fantôme et Rattata (et jours regardés par l'ancien choix)
PAS_REVENIR = 5                  # une mission ne revient pas avant ce nombre de jours
PAS_FANTOME = 4000               # battre une journée à 800 pas ne serait pas un défi
SOIR = 20                        # les pas à partir de cette heure : le défi de Koga (gardés avec ceux du matin)

TOUS_LES_JOURS = set(range(7))
# cle -> titre, texte, seuil, jours possibles (0 = lundi), unité ; num = son Pokémon, bonus = points, phrase = sa petite phrase,
# geste = ce que le téléphone compte lui-même (pompes, squats, series : boutons)
MISSIONS = {
    # Les anciennes (jusqu'au 03/11)
    "matinee": {"titre": "Matinée active", "texte": "2 000 pas avant 13 h", "seuil": 2000, "jours": {0, 1, 2, 3, 4},
                "unite": "pas", "lacune": "matinées actives", "ancienne": True},
    "coucher": {"titre": "Coucher à l'heure", "texte": "Ce soir, au lit avant 0 h 30", "seuil": 24 * 60 + 30,
                "jours": {6, 0, 1, 2, 3}, "unite": "heure", "lacune": "couchers avant 0 h 30", "ancienne": True},
    "zone": {"titre": "Fais monter ton cœur", "texte": "10 min de sport (zone jaune)", "seuil": 10,
             "jours": TOUS_LES_JOURS, "unite": "min", "lacune": "jours avec 10 min de sport", "ancienne": True},
    "seance": {"titre": "Petite séance", "texte": "10 min de sport (rameur, pompes…)", "seuil": 10,
               "jours": TOUS_LES_JOURS, "unite": "min", "lacune": "jours avec une séance", "ancienne": True},
    # Avec les pas
    "doduo": {"titre": "Doduo est pressé", "texte": "3 000 pas en 60 min d'affilée", "seuil": 3000, "jours": TOUS_LES_JOURS, "unite": "pas",
              "num": 84, "bonus": 30, "phrase": "Deux têtes, et aucune ne veut arriver la dernière."},
    "trio": {"titre": "Le trio de Triopikeur", "texte": "1 000 pas dans 3 heures différentes", "seuil": 3, "jours": TOUS_LES_JOURS, "unite": "heures",
             "num": 51, "bonus": 35, "phrase": "Une fois, deux fois, trois fois : il ressort toujours quelque part."},
    "ronde": {"titre": "La ronde de Nosferapti", "texte": "2 000 pas après 20 h", "seuil": 2000, "jours": TOUS_LES_JOURS, "unite": "pas",
              "num": 41, "bonus": 35, "phrase": "La nuit tombe : c'est l'heure de sortir."},
    "voyage": {"titre": "Le voyage de Lokhlass", "texte": "6 km dans la journée", "seuil": 6, "jours": TOUS_LES_JOURS, "unite": "km",
               "num": 131, "bonus": 25, "phrase": "Il connaît toutes les routes, même celles sans eau."},
    "sortie": {"titre": "La grande sortie de Dodrio", "texte": "12 000 pas aujourd'hui", "seuil": 12000, "jours": {5, 6}, "unite": "pas",
               "num": 85, "bonus": 40, "phrase": "Trois têtes pour choisir la route : la plus longue a gagné."},
    "fantome": {"titre": "Le fantôme de Spectrum", "texte": "Bats ton toi d'il y a 7 jours : {seuil} pas", "seuil": PAS_FANTOME, "jours": TOUS_LES_JOURS, "unite": "pas",
                "num": 93, "bonus": 30, "phrase": "Ton toi de la semaine dernière te regarde en ricanant."},
    "course": {"titre": "La course de Rattata", "texte": "20 % de plus que ta moyenne : {seuil} pas", "seuil": PAS_FANTOME, "jours": TOUS_LES_JOURS, "unite": "pas",
               "num": 19, "bonus": 25, "phrase": "Petit, vif, et jamais satisfait de sa moyenne."},
    # Sans matériel, en un toucher, sur l'honneur
    "defi": {"titre": "Le défi de Mackogneur", "texte": "20 pompes dans la journée", "seuil": 20, "jours": TOUS_LES_JOURS, "unite": "pompes", "geste": "pompes",
             "num": 68, "bonus": 20, "phrase": "Il en fait autant avec chaque bras. Lui en a quatre."},
    "serie": {"titre": "La série de Tygnon", "texte": "3 fois 10 pompes, à 30 min d'écart au moins", "seuil": 3, "jours": TOUS_LES_JOURS, "unite": "séries", "geste": "series",
              "num": 107, "bonus": 30, "phrase": "Une série, une pause, et on remet ça."},
    "cuisses": {"titre": "Les cuisses de Kangourex", "texte": "50 squats dans la journée", "seuil": 50, "jours": TOUS_LES_JOURS, "unite": "squats", "geste": "squats",
                "num": 115, "bonus": 20, "phrase": "Avec un petit dans la poche, en plus."},
    # Seulement si la montre mesure le sport
    "galop": {"titre": "Le galop de Ponyta", "texte": "15 min de sport en zone jaune", "seuil": 15, "jours": TOUS_LES_JOURS, "unite": "min",
              "num": 77, "bonus": 40, "phrase": "Marcher vite ne suffira pas : la crinière doit s'enflammer."},
    "charge": {"titre": "La charge de Tauros", "texte": "Une séance de 20 min", "seuil": 20, "jours": TOUS_LES_JOURS, "unite": "min",
               "num": 128, "bonus": 25, "phrase": "Tête baissée, et sans s'arrêter avant la fin."},
}
TIRAGE = [c for c, m in MISSIONS.items() if not m.get("ancienne")]


ZONE_SPORT = dt.date(2026, 11, 1)  # depuis : minutes de sport (zone jaune / rouge) au lieu des minutes en zone


def cle_zone(jour):
    """Le chiffre de la mission « zone » : minutes de sport depuis le 01/11 (avant : minutes en zone, inchangé)."""
    return "zone_sport" if jour >= ZONE_SPORT else "zone"


def pas_matin(jour_fichier, avant=13, apres=None):
    """Les pas d'avant 13 h (ou d'après une heure : apres) (heure locale) d'un fichier du jour, ou None s'il n'y en a pas."""
    t = chiffres.table((jour_fichier or {}).get("types", {}).get("steps"))
    if "countSum" not in t or "heure" not in t:
        return None
    h = t["heure"].astype(str).str[:2]
    import pandas as pd
    garde = h >= f"{apres:02d}" if apres is not None else h < f"{avant:02d}"
    return float(pd.to_numeric(t.loc[garde, "countSum"], errors="coerce").sum())


def rythme(jour_fichier):
    """(le plus de pas en 60 min d'affilée, le nombre d'heures à 1 000 pas ou plus) d'un fichier du jour, ou (None, None)."""
    t = chiffres.table((jour_fichier or {}).get("types", {}).get("steps"))
    if "countSum" not in t or "heure" not in t:
        return None, None
    import pandas as pd
    n, h = pd.to_numeric(t["countSum"], errors="coerce").fillna(0), t["heure"].astype(str)
    minutes = n.groupby([int(x[:2]) * 60 + int(x[3:5]) for x in h]).sum().reindex(range(1440), fill_value=0)
    return float(minutes.rolling(60, min_periods=1).sum().max()), int((n.groupby(h.str[:2]).sum() >= 1000).sum())


def valeur(cle, jour, stats, info, gestes=None):
    """Où en est le joueur sur une mission, ce jour-là (None : on ne sait pas). info(j) = sa ligne de missions.json, gestes =
    pokemon.gestes_du."""
    m, e, s = MISSIONS[cle], info(jour) or {}, stats(jour)
    if m.get("geste"):
        return ((gestes or {}).get(str(jour)) or {}).get(m["geste"], 0)
    v = {"doduo": e.get("max60"), "trio": e.get("h1000"), "ronde": e.get("pas_soir"), "voyage": s.get("km"), "sortie": s.get("pas"), "fantome": s.get("pas"),
         "course": s.get("pas"), "galop": s.get(cle_zone(jour)), "charge": s.get("seance_max")}[cle]
    return None if v is None or v != v else v


def seuil_de(cle, e):
    """Le seuil du jour : le fantôme et Rattata ont le leur, calculé quand la mission est tirée et gardé avec elle."""
    return (e or {}).get("seuil") or MISSIONS[cle]["seuil"]


def reussite(cle, jour, stats, info, gestes=None):
    """True / False / None (on ne sait pas encore). stats(j) = chiffres.stats_jour du jour j (dict, peut être vide) ;
    info(j) = sa ligne de missions.json ou None. Le coucher d'un soir se lit dans la nuit qui finit le lendemain."""
    m = MISSIONS[cle]
    if not m.get("ancienne"):
        v = valeur(cle, jour, stats, info, gestes)
        return None if v is None else v >= seuil_de(cle, info(jour))
    if cle == "matinee":
        v = (info(jour) or {}).get("pas_matin")
        return None if v is None else v >= m["seuil"]
    if cle == "coucher":
        c = stats(jour + dt.timedelta(days=1)).get("coucher")
        return None if c is None or c != c else c <= m["seuil"]
    if cle == "zone":
        v = stats(jour).get(cle_zone(jour))
        return None if v is None or v != v else v >= m["seuil"]
    if cle == "seance":
        v = stats(jour).get("min_sport")
        return None if v is None or v != v else v >= m["seuil"]
    return None


def possible(cle, jour, stats):
    """Cette mission peut-elle être tirée pour ce joueur, ce jour-là ? -> son seuil du jour (celui de MISSIONS le plus souvent), ou None."""
    m = MISSIONS[cle]
    if jour.weekday() not in m["jours"]:
        return None
    avant = [stats(jour - dt.timedelta(days=k)) for k in range(1, 29)]  # du plus récent au plus ancien
    pas = [s["pas"] for s in avant if s.get("pas") and s["pas"] == s["pas"]][:HISTOIRE]
    if cle in ("fantome", "course") and len(pas) < HISTOIRE:
        return None  # pas assez de données : elles apparaissent toutes seules quand il y en a
    if cle == "fantome":
        p = avant[6].get("pas")
        return None if not p or p != p else max(round(p) + 1, PAS_FANTOME)
    if cle == "course":
        return max(round(sum(pas) / len(pas) * 1.2, -2), PAS_FANTOME)
    if cle == "voyage":  # distance fiable : au moins 40 cm par pas les jours de marche (certaines montres ne la donnent qu'en partie)
        r = [s["km"] * 1000 / s["pas"] for s in avant[:HISTOIRE] if (s.get("pas") or 0) >= 3000 and s.get("km") and s["km"] == s["km"]]
        return m["seuil"] if r and sorted(r)[len(r) // 2] >= .4 else None
    if cle == "galop":  # la montre donne les zones ?
        return m["seuil"] if any(s.get("zone_sport") is not None and s["zone_sport"] == s["zone_sport"] for s in avant[:HISTOIRE]) else None
    if cle == "charge":  # la montre enregistre les séances ?
        return m["seuil"] if any((s.get("min_sport") or 0) > 0 for s in avant) else None
    return m["seuil"]


def tirer(jour, stats, jours, ami=None):
    """La mission du jour, au hasard (chacun la sienne), parmi celles possibles pour ce joueur ; pas une des 5 derniers jours. -> sa ligne."""
    recentes = {(jours.get(str(jour - dt.timedelta(days=k))) or {}).get("cle") for k in range(1, PAS_REVENIR + 1)}
    seuils = {c: s for c in TIRAGE if (s := possible(c, jour, stats)) is not None}
    choix = [c for c in seuils if c not in recentes] or list(seuils)
    cle = random.Random(f"{jour}{ami or ''}").choice(choix)
    return {"cle": cle, "seuil": seuils[cle], "raison": ""}


def choisir(jour, stats, pas_du_matin, hier=None):
    """Avant NOUVELLES : la moins réussie des 14 derniers jours parmi les anciennes (pas deux fois de suite si une autre est
    presque aussi faible). -> (cle, raison)."""
    graine = random.Random(str(jour))
    notes = []
    for cle, m in MISSIONS.items():
        if m.get("ancienne") is None or jour.weekday() not in m["jours"]:
            continue
        r = [reussite(cle, j, stats, lambda x: {"pas_matin": pas_du_matin(x)}) for j in (jour - dt.timedelta(days=k) for k in range(1, HISTOIRE + 1))
             if j.weekday() in m["jours"]]
        r = [x for x in r if x is not None]
        taux = sum(r) / len(r) if r else .5
        note = (1 - taux) - (.2 if cle == hier else 0) + graine.random() * .05
        notes.append((note, cle, sum(r), len(r)))
    note, cle, ok, n = max(notes)
    m = MISSIONS[cle]
    raison = f"Ces {HISTOIRE} derniers jours : {ok} {m['lacune']} sur {n}" if n else "Pour bien démarrer"
    return cle, raison


def calculer(ancien, aujourd, stats, lire_jour, ami=None):
    """Le contenu de missions.json : {"jours": {jour: {cle, seuil, raison, pas_matin, pas_soir, max60, h1000}}}. Les missions déjà
    choisies ne changent plus ; les pas sont relus pour les 3 derniers jours (une montre peut arriver en retard ; le reste est gardé)."""
    jours = dict((ancien or {}).get("jours", {}))
    debut = DEPUIS - dt.timedelta(days=HISTOIRE)
    a_lire = [debut + dt.timedelta(days=k) for k in range((aujourd - debut).days + 1)]
    a_lire = [j for j in a_lire if str(j) not in jours or "pas_soir" not in jours[str(j)] or j >= aujourd - dt.timedelta(days=3)]
    fichiers = lire_jour(a_lire)
    for j in a_lire:
        jours.setdefault(str(j), {})["pas_matin"] = pas_matin(fichiers.get(j))
        jours[str(j)]["pas_soir"] = pas_matin(fichiers.get(j), apres=SOIR)
        jours[str(j)]["max60"], jours[str(j)]["h1000"] = rythme(fichiers.get(j))
    pm = lambda j: (jours.get(str(j)) or {}).get("pas_matin")  # noqa: E731
    j = DEPUIS
    while j <= aujourd:
        e = jours.setdefault(str(j), {})
        if "cle" not in e:
            if j >= NOUVELLES:
                e.update(tirer(j, stats, jours, ami))
            else:
                e["cle"], e["raison"] = choisir(j, stats, pm, (jours.get(str(j - dt.timedelta(days=1))) or {}).get("cle"))
        j += dt.timedelta(days=1)
    return {"jours": dict(sorted(jours.items()))}
