"""Les chiffres de santé (sans Streamlit) : partagés par l'appli et par l'analyse du coach du matin (coach.py)."""
import calendar
import datetime as dt
from pathlib import Path
from zoneinfo import ZoneInfo

import pandas as pd

TZ = ZoneInfo("Europe/Paris")
OBJECTIFS = {"pas": 5000, "zone": 15, "sommeil": 7 * 60}  # (plus tard : page « Réglages »)
JOURS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"]
PHASES = {"DEEP": "Profond", "LIGHT": "Léger", "REM": "Paradoxal", "AWAKE": "Éveil", "ASLEEP": "Endormi", "RESTLESS": "Agité"}
CONSIGNE = Path(__file__).with_name("coach.md")


# ---------- Petits outils ----------
def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def contenu(p):
    """Le contenu d'un point (point['sleep'], point['dailyRestingHeartRate']…)."""
    for k, v in p.items():
        if k not in ("name", "dataSource") and not k.endswith("Time") and isinstance(v, dict):
            return v
    return p


def table(t):
    """Tableau compact du script -> DataFrame."""
    return pd.DataFrame(t["lignes"], columns=t["colonnes"]) if t and t.get("lignes") else pd.DataFrame()


def somme(t, *cols):
    df = table(t)
    for c in cols:
        if c in df:
            return pd.to_numeric(df[c], errors="coerce").sum()
    return None


def premier(points, *chemin):
    """Valeur au bout de `chemin` dans le contenu du premier point qui l'a."""
    for p in points or []:
        v = contenu(p)
        for k in chemin:
            v = v.get(k) if isinstance(v, dict) else None
        if v is not None:
            return v
    return None


def duree(s):
    """« 615s » -> secondes."""
    return num(str(s).rstrip("s")) or 0


def local(t):
    return pd.Timestamp(t).tz_convert(TZ)


def hm(minutes):
    if minutes is None or pd.isna(minutes):
        return "–"
    if minutes < 60:
        return f"{int(round(minutes))} min"
    return f"{int(minutes // 60)} h {int(minutes % 60):02d}"


def heure(minutes):
    """Minutes depuis minuit (peut dépasser 24 h) -> « 23:40 »."""
    if minutes is None or pd.isna(minutes):
        return "–"
    m = int(round(minutes)) % 1440
    return f"{m // 60:02d}:{m % 60:02d}"


def nombre(v, dec=0):
    return f"{v:,.{dec}f}".replace(",", " ").replace(".", ",")


def sommeil(points):
    """Minutes par phase et heures de coucher / lever pour les nuits d'un jour (la nuit compte pour le matin où elle finit)."""
    phases, coucher, lever = {}, None, None
    for p in points or []:
        c = contenu(p)
        resume = (c.get("summary") or {}).get("stagesSummary")
        if resume:
            for s in resume:
                phases[s["type"]] = phases.get(s["type"], 0) + (num(s.get("minutes")) or 0)
        else:
            stages = c.get("stages") or []
            if not stages:  # pas de phases : toute la durée
                iv = c.get("interval", {})
                stages = [{"type": "ASLEEP", "startTime": iv.get("startTime"), "endTime": iv.get("endTime")}]
            for s in stages:
                try:
                    m = (pd.Timestamp(s["endTime"]) - pd.Timestamp(s["startTime"])).total_seconds() / 60
                except Exception:
                    continue
                if m > 0:
                    phases[s.get("type", "?")] = phases.get(s.get("type", "?"), 0) + m
        iv = c.get("interval") or {}
        if iv.get("startTime") and ((c.get("metadata") or {}).get("mainSleep") or coucher is None):
            debut, fin = local(iv["startTime"]), local(iv["endTime"])
            coucher = debut.hour * 60 + debut.minute + (1440 if debut.hour < 12 else 0)  # 00:30 -> 24:30
            lever = fin.hour * 60 + fin.minute
    return phases, coucher, lever


# ---------- Les chiffres d'une journée ----------
def stats_jour(r, j=None):
    """r = résumé du jour (totaux de Google), j = fichier du jour (secours). -> {clé: valeur}."""
    r, t = r or {}, (j or {}).get("types", {})
    s = {"pas": num(premier(r.get("steps:jour"), "countSum"))}
    if s["pas"] is None and t:
        s["pas"] = somme(t.get("steps"), "countSum", "count")
    mm = num(premier(r.get("distance:jour"), "millimetersSum"))
    s["km"] = mm / 1e6 if mm is not None else None
    s["kcal"] = num(premier(r.get("total-calories:jour"), "kcalSum"))
    s["kcal_act"] = num(premier(r.get("active-energy-burned:jour"), "kcalSum"))
    am = premier(r.get("active-minutes:jour"), "activeMinutesRollupByActivityLevel")
    if am:
        par = {x.get("activityLevel"): num(x.get("activeMinutesSum")) or 0 for x in am}
        s["actives"] = par.get("MODERATE", 0) + par.get("VIGOROUS", 0)
        s["legeres"] = par.get("LIGHT")
    # Minutes en zone : brûle-graisses ×1, cardio et pic ×2 (comme Fitbit). Calculées depuis le temps passé dans
    # chaque zone (l'Inspire HR ne donne pas le total « officiel », seule la Pixel Watch le donnait).
    azm = premier(r.get("active-zone-minutes:jour"), "sumInFatBurnHeartZone")
    if azm is not None:
        z = contenu(r["active-zone-minutes:jour"][0])
        s["zone"] = num(z.get("sumInFatBurnHeartZone")) + 2 * ((num(z.get("sumInCardioHeartZone")) or 0)
                                                               + (num(z.get("sumInPeakHeartZone")) or 0))
    else:
        zones = premier(r.get("time-in-heart-rate-zone:jour"), "timeInHeartRateZones")
        if zones:
            m = {x["heartRateZone"]: duree(x.get("duration")) / 60 for x in zones}
            s["zone"] = m.get("MODERATE", 0) + 2 * (m.get("VIGOROUS", 0) + m.get("PEAK", 0))
    s["etages"] = num(premier(r.get("floors:jour"), "countSum"))
    alt = num(premier(r.get("altitude:jour"), "gainMillimetersSum"))
    s["denivele"] = alt / 1000 if alt is not None else None
    sed = premier(r.get("sedentary-period:jour"), "durationSum")
    s["assis"] = duree(sed) / 60 if sed else None
    ph, s["coucher"], s["lever"] = sommeil(r.get("sleep"))
    if ph:
        s["sommeil"] = sum(v for k, v in ph.items() if k != "AWAKE")
        for k, nom in (("DEEP", "profond"), ("LIGHT", "leger"), ("REM", "paradoxal"), ("AWAKE", "eveil")):
            s[nom] = ph.get(k)
    s["fc_repos"] = num(premier(r.get("daily-resting-heart-rate"), "beatsPerMinute"))
    s["fc_max"] = num(premier(r.get("heart-rate:jour"), "beatsPerMinuteMax"))
    s["vfc"] = num(premier(r.get("daily-heart-rate-variability"), "averageHeartRateVariabilityMilliseconds"))
    s["resp"] = num(premier(r.get("daily-respiratory-rate"), "breathsPerMinute"))
    s["spo2"] = num(premier(r.get("daily-oxygen-saturation"), "averagePercentage"))
    s["spo2_min"] = num(premier(r.get("daily-oxygen-saturation"), "lowerBoundPercentage"))
    g = num(premier(r.get("weight:jour"), "weightGramsAvg")) or num(premier(r.get("weight"), "weightGrams"))
    s["poids"] = g / 1000 if g else None
    s["gras"] = num(premier(r.get("body-fat:jour"), "bodyFatPercentageAvg")) or num(premier(r.get("body-fat"), "percentage"))
    ex = r.get("exercise") or []
    s["seances"] = len(ex)
    s["min_sport"] = sum(duree(contenu(p).get("activeDuration")) for p in ex) / 60
    return s


# clé: (libellé, agrégation sur une période, format)
METRIQUES = {
    "pas": ("Pas", "total", "n"), "km": ("Distance", "total", "km"), "zone": ("Minutes en zone", "total", "min"),
    "actives": ("Minutes actives", "total", "min"), "min_sport": ("Temps d'exercice", "total", "min"),
    "seances": ("Séances", "total", "n"), "kcal": ("Calories totales", "total", "n"),
    "kcal_act": ("Calories actives", "total", "n"), "etages": ("Étages", "total", "n"),
    "denivele": ("Dénivelé positif", "total", "m"),
    "assis": ("Temps assis", "moyenne", "min"), "sommeil": ("Sommeil", "moyenne", "min"),
    "profond": ("Profond", "moyenne", "min"), "paradoxal": ("Paradoxal", "moyenne", "min"),
    "leger": ("Léger", "moyenne", "min"), "eveil": ("Éveillé", "moyenne", "min"),
    "coucher": ("Coucher", "moyenne", "h"), "lever": ("Lever", "moyenne", "h"),
    "fc_repos": ("FC au repos", "moyenne", "bpm"), "fc_max": ("FC max", "max", "bpm"),
    "vfc": ("Variabilité (VFC)", "moyenne", "ms"), "resp": ("Respiration", "moyenne", "/min"),
    "spo2": ("SpO2 (nuit)", "moyenne", "%"), "spo2_min": ("SpO2 la plus basse", "moyenne", "%"), "poids": ("Poids", "dernier", "kg"), "gras": ("Masse grasse", "dernier", "%"),
}


def joli(cle, v):
    if v is None or pd.isna(v):
        return "–"
    f = METRIQUES[cle][2]
    if f == "min":
        return hm(v)
    if f == "h":
        return heure(v)
    if f == "km":
        return f"{nombre(v, 1)} km"
    if f in ("kg", "%", "ms", "/min"):
        return f"{nombre(v, 1)} {f}".replace(" /min", "/min")
    if f == "m":
        return f"{nombre(v)} m"
    if f == "bpm":
        return f"{nombre(v)} bpm"
    return nombre(v)


def agrege(df, cle):
    """Valeur d'une période : total, moyenne, max ou dernière mesure."""
    col = pd.to_numeric(df[cle], errors="coerce").dropna() if cle in df else pd.Series(dtype=float)
    if col.empty:
        return None
    agg = METRIQUES[cle][1]
    return {"total": col.sum, "moyenne": col.mean, "max": col.max, "dernier": lambda: col.iloc[-1]}[agg]()


def par_jour(df, cle):
    """Valeur moyenne par jour (pour comparer deux périodes de longueurs différentes)."""
    col = pd.to_numeric(df[cle], errors="coerce").dropna() if cle in df else pd.Series(dtype=float)
    if col.empty:
        return None
    if METRIQUES[cle][1] == "total":
        return col.sum() / max(len(df), 1)
    return agrege(df, cle)

# ---------- Période ----------
def bornes(periode, ref):
    if periode == "Jour":
        return ref, ref
    if periode == "7 jours":
        return ref - dt.timedelta(days=6), ref
    if periode == "Semaine":
        debut = ref - dt.timedelta(days=ref.weekday())
        return debut, debut + dt.timedelta(days=6)
    if periode == "Mois":
        return ref.replace(day=1), ref.replace(day=calendar.monthrange(ref.year, ref.month)[1])
    return ref.replace(month=1, day=1), ref.replace(month=12, day=31)




def charger(lire, periode, ref, aujourd):
    """Tout ce qu'il faut pour afficher ou analyser une période. `lire(chemins)` -> {chemin: contenu ou None}."""
    debut, fin = bornes(periode, ref)
    fin = min(fin, aujourd)
    jours = [debut + dt.timedelta(days=i) for i in range((fin - debut).days + 1)]
    # Comparaison : les 7 jours d'avant pour un jour, sinon la période précédente de même longueur
    debut_avant = debut - dt.timedelta(days=7 if periode == "Jour" else len(jours))
    debut_tout = min(debut_avant, fin - dt.timedelta(days=90))  # le poids : 3 mois au moins
    annees = range(debut_tout.year, fin.year + 1)
    fichier_ref = f"data/jour/{fin.year}/{fin}.json"
    f = lire([f"data/resume/{y}.json" for y in annees] + ["data/profil.json", fichier_ref])
    resumes = {}
    for y in annees:
        resumes.update(f.get(f"data/resume/{y}.json") or {})
    tous = [debut_tout + dt.timedelta(days=i) for i in range((fin - debut_tout).days + 1)]
    stats = pd.DataFrame({d: stats_jour(resumes.get(str(d)), f.get(fichier_ref) if d == fin else None)
                          for d in tous}).T
    seances = sorted((contenu(p) for d in jours for p in (resumes.get(str(d)) or {}).get("exercise") or []),
                     key=lambda c: c["interval"]["startTime"])
    return {
        "periode": periode, "debut": debut, "fin": fin, "jours": jours, "stats": stats, "resumes": resumes,
        "df": stats.loc[debut:fin], "avant": stats.loc[debut_avant:debut - dt.timedelta(days=1)],
        "legende_avant": "7 j d'avant" if periode == "Jour" else "période d'avant",
        "debut_tout": debut_tout, "j_ref": (f.get(fichier_ref) or {}).get("types", {}),
        "age": ((f.get("data/profil.json") or {}).get("profile") or {}).get("age"),
        "seances": [seance(c) for c in seances],
        "pesees": stats.loc[:fin, ["poids", "gras"]].apply(pd.to_numeric, errors="coerce").dropna(how="all"),
    }


def seance(c):
    """Une séance d'exercice -> {type, nom, quand, details, km, minutes}."""
    m = c.get("metricsSummary", {})
    km = (num(m.get("distanceMillimeters")) or 0) / 1e6
    z = m.get("heartRateZoneDurations") or {}
    zone = (duree(z.get("moderateTime")) + 2 * (duree(z.get("vigorousTime")) + duree(z.get("peakTime")))) / 60
    minutes = duree(c.get("activeDuration")) / 60
    details = [hm(minutes)] + ([f"{nombre(km, 1)} km"] if km else []) + \
              [f"{m.get('caloriesKcal', '–')} kcal", f"cardio moy. {m.get('averageHeartRateBeatsPerMinute', '–')}",
               f"{zone:.0f} min en zone"]
    return {"type": c.get("exerciseType"), "nom": c.get("displayName") or c.get("exerciseType", "Exercice"),
            "quand": local(c["interval"]["startTime"]), "details": details, "km": km, "minutes": minutes}


# ---------- Le dossier du coach ----------
def tableau(df):
    """Données jour par jour (ou par semaine si la période est longue) en CSV compact."""
    d = df[[c for c in METRIQUES if c in df]].apply(pd.to_numeric, errors="coerce").dropna(axis=1, how="all")
    if len(d) > 62:
        d = d.groupby(pd.to_datetime(d.index).to_period("W")).mean()
        d.index = [f"semaine du {p.start_time:%d/%m}" for p in d.index]
    else:
        d.index = [f"{JOURS[x.weekday()]} {x:%d/%m}" for x in d.index]
    d = d.round(1).astype(object)
    for c in ("coucher", "lever"):
        if c in d:
            d[c] = d[c].map(heure)
    unites = {"min": "min", "h": "heure", "km": "km", "n": "", "bpm": "bpm", "ms": "ms", "/min": "/min", "%": "%",
              "kg": "kg", "m": "m"}
    d.columns = [f"{METRIQUES[c][0]} ({unites[METRIQUES[c][2]]})".replace(" ()", "") for c in d.columns]
    return d.to_csv(sep=";")


def par_heure(j_ref):
    """Pas et cardio moyen heure par heure (vue Jour)."""
    lignes = []
    pas, hr = table(j_ref.get("steps")), table(j_ref.get("heart-rate"))
    if "countSum" in pas:
        p = pd.to_numeric(pas["countSum"], errors="coerce").groupby(pas["heure"].str[:2]).sum()
        lignes.append("Pas par heure : " + ", ".join(f"{h}h {v:.0f}" for h, v in p.items() if v))
    moy = [c for c in hr.columns if "avg" in c.lower()]
    if moy:
        f = pd.to_numeric(hr[moy[0]], errors="coerce").groupby(hr["heure"].str[:2]).mean()
        lignes.append("Cardio moyen par heure : " + ", ".join(f"{h}h {v:.0f}" for h, v in f.items()))
    return "\n".join(lignes)


def dossier_coach(d, analyses=()):
    """Consigne du coach (coach.md) + toutes les données de la période : à coller dans Claude, ou lu par l'analyse
    du matin. `analyses` = [(titre, texte)] des analyses précédentes, pour que le coach suive ses propres conseils."""
    df, avant, periode = d["df"], d["avant"], d["periode"]
    maintenant = dt.datetime.now(TZ)
    longueur = "Environ 250 mots." if periode == "Jour" else "Environ 450 mots."
    consigne = CONSIGNE.read_text(encoding="utf-8").replace("{longueur}", longueur)
    moyennes = "\n".join(f"- {METRIQUES[c][0]} : {joli(c, par_jour(avant, c))}" for c in METRIQUES
                         if par_jour(avant, c) is not None)
    pesees = d["pesees"].dropna(subset=["poids"]).tail(30)
    poids = "\n".join(f"- {j:%d/%m/%y} : {nombre(r.poids, 1)} kg, "
                      f"{nombre(r.gras, 1) + ' %' if pd.notna(r.gras) else '?'} de masse grasse"
                      for j, r in pesees.iterrows())
    seances = "\n".join(f"- {JOURS[s['quand'].weekday()]} {s['quand']:%d/%m %H:%M} : {s['nom']} ({', '.join(s['details'])})"
                        for s in d["seances"])
    parties = [
        consigne, "---",
        f"Âge : {d['age'] or 'inconnu'} ans. Nous sommes le {maintenant:%d/%m/%Y}, il est {maintenant:%H:%M}.",
        f"Période à analyser : {periode.lower()} du {d['debut']:%d/%m/%Y} au {d['fin']:%d/%m/%Y}.",
        f"Objectifs : {OBJECTIFS['pas']} pas et {OBJECTIFS['zone']} min en zone par jour, {hm(OBJECTIFS['sommeil'])} "
        "de sommeil.",
        f"\n## Données (une ligne par {'semaine, moyenne par jour' if len(df) > 62 else 'jour'})\n{tableau(df)}",
    ]
    if periode == "Jour":
        parties.append(f"## Les 14 jours d'avant (pour le contexte)\n"
                       f"{tableau(d['stats'].loc[d['debut'] - dt.timedelta(days=14):d['debut'] - dt.timedelta(days=1)])}")
        parties.append(f"## Heure par heure\n{par_heure(d['j_ref']) or 'pas de détail'}")
    parties += [f"## Séances d'exercice de la période\n{seances or 'aucune'}",
                f"## Moyennes par jour {d['legende_avant']}\n{moyennes or 'pas de données'}",
                f"## Pesées des 3 derniers mois\n{poids or 'aucune'}"]
    if analyses:
        parties.append("## Tes analyses précédentes (pour suivre tes propres conseils)\n" +
                       "\n\n".join(f"### {t}\n{x}" for t, x in analyses))
    return "\n\n".join(parties)


# ---------- Analyses du coach, rangées dans la branche data ----------
def chemin_analyse(periode, debut):
    if periode == "Jour":
        return f"data/coach/jour/{debut.year}/{debut}.json"
    if periode == "Semaine":
        return f"data/coach/semaine/{debut.year}/{debut}.json"  # lundi de la semaine
    if periode == "Mois":
        return f"data/coach/mois/{debut:%Y-%m}.json"
    return None


def analyses_precedentes(lire, fin, n=3):
    """Les n dernières analyses du jour avant `fin` -> [(titre, texte)]."""
    dates = [fin - dt.timedelta(days=i) for i in range(1, n + 1)]
    f = lire([chemin_analyse("Jour", x) for x in dates])
    return [(f"Analyse du {x:%d/%m}", f[chemin_analyse("Jour", x)]["texte"]) for x in reversed(dates)
            if f.get(chemin_analyse("Jour", x))]
