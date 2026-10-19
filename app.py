"""Ma santé : toutes mes données Google Health (récoltées par sante.gs dans la branche « data ») sur une seule page,
filtrées par jour / 7 jours / semaine / mois / année, avec l'analyse d'un coach (Claude)."""
import calendar
import datetime as dt
import hashlib
import hmac
import json
import time
from concurrent.futures import ThreadPoolExecutor
from zoneinfo import ZoneInfo

import altair as alt
import pandas as pd
import requests
import streamlit as st
from streamlit_js_eval import streamlit_js_eval

TZ = ZoneInfo("Europe/Paris")
st.set_page_config(page_title="Ma santé", page_icon="❤️", layout="centered")

BLEU, GRIS = "#6B8CFF", "#9AA7C2"
OBJECTIFS = {"pas": 5000, "zone": 15, "sommeil": 7 * 60}  # (plus tard : page « Réglages »)
PERIODES = ["Jour", "7 jours", "Semaine", "Mois", "Année"]
JOURS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"]
MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]
PHASES = {"DEEP": "Profond", "LIGHT": "Léger", "REM": "Paradoxal", "AWAKE": "Éveil", "ASLEEP": "Endormi", "RESTLESS": "Agité"}
COULEURS_PHASES = {"Profond": "#3E5BD8", "Léger": "#6B8CFF", "Paradoxal": "#B39DFF", "Éveil": "#FF9E80"}
SPORTS = {"WALKING": "🚶", "OUTDOOR_BIKE": "🚴", "BIKING": "🚴", "ROWING_MACHINE": "🚣", "ELLIPTICAL": "🏞️",
          "RUNNING": "🏃", "SPORT": "💪", "SWIMMING": "🏊", "OTHER": "⭐"}

# Noms en français des types de Google Health (pour les données brutes)
NOMS = {
    "steps": "Pas", "distance": "Distance", "floors": "Étages", "altitude": "Altitude",
    "active-energy-burned": "Calories actives", "basal-energy-burned": "Calories au repos (métabolisme)",
    "total-calories": "Calories totales", "active-minutes": "Minutes actives", "active-zone-minutes": "Minutes en zone",
    "activity-level": "Niveau d'activité (minute par minute)", "sedentary-period": "Périodes assises",
    "exercise": "Exercices", "swim-lengths-data": "Longueurs de nage", "vo2-max": "VO2 max", "run-vo2-max": "VO2 max (course)",
    "daily-vo2-max": "VO2 max du jour", "heart-rate": "Cardio (par minute)", "time-in-heart-rate-zone": "Temps en zones cardio",
    "calories-in-heart-rate-zone": "Calories par zone cardio", "daily-heart-rate-zones": "Seuils des zones cardio",
    "daily-resting-heart-rate": "Fréquence cardiaque au repos", "heart-rate-variability": "Variabilité cardiaque (VFC)",
    "daily-heart-rate-variability": "Variabilité cardiaque du jour", "electrocardiogram": "ECG",
    "irregular-rhythm-notification": "Alertes de rythme irrégulier", "sleep": "Sommeil",
    "respiratory-rate-sleep-summary": "Respiration pendant le sommeil", "daily-respiratory-rate": "Respiration du jour",
    "oxygen-saturation": "Oxygène dans le sang (SpO2)", "daily-oxygen-saturation": "SpO2 du jour",
    "daily-sleep-temperature-derivations": "Température de la peau (nuit)", "core-body-temperature": "Température corporelle",
    "weight": "Poids", "body-fat": "Masse grasse", "height": "Taille", "blood-glucose": "Glycémie",
    "hydration-log": "Eau", "nutrition-log": "Alimentation",
}

st.markdown("""<style>
.block-container{padding-top:2.2rem;max-width:760px}
.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:6px 0 12px}
.tile{background:#1C2740;border-radius:12px;padding:10px 12px}
.tile .l{font-size:.78rem;color:#9AA7C2}
.tile .v{font-size:1.35rem;font-weight:700;color:#EEF2FA;line-height:1.3}
.tile .s{font-size:.72rem;color:#9AA7C2}
.bar{height:6px;background:#0D1322;border-radius:3px;margin-top:6px;overflow:hidden}
.bar div{height:100%;background:#6B8CFF;border-radius:3px}
.bar div.ok{background:#4CD3A0}
.fresh{font-size:.8rem;color:#9AA7C2;margin:-4px 0 8px}
.sport{background:#1C2740;border-radius:12px;padding:8px 12px;margin:4px 0;font-size:.9rem}
.sport .s{color:#9AA7C2;font-size:.78rem}
h3{margin-top:1.4rem !important}
[data-testid="stHorizontalBlock"]{flex-wrap:nowrap !important;gap:.5rem}
[data-testid="stColumn"]{min-width:0 !important}
</style>""", unsafe_allow_html=True)


# ---------- Lecture des fichiers (GitHub, branche data) ----------
def _github(path):
    s = st.secrets
    r = requests.get(f"https://api.github.com/repos/{s['GITHUB_REPO']}/contents/{path}",
                     params={"ref": s.get("GITHUB_BRANCH", "data")}, timeout=30,
                     headers={"Authorization": f"Bearer {s['GITHUB_TOKEN']}", "Accept": "application/vnd.github.raw+json"})
    if r.status_code == 404:
        return None
    r.raise_for_status()
    return r.json()


@st.cache_resource
def _cache():
    return {}  # chemin -> (heure de lecture, contenu)


@st.cache_resource
def _analyses():
    return {}  # empreinte des données envoyées -> texte du coach


def lire(paths, recents=()):
    """Contenu de plusieurs fichiers (lus en parallèle). Relus après 2 min pour les plus récents, 1 h pour les autres."""
    c, now = _cache(), time.time()
    a_lire = [p for p in paths if p not in c or now - c[p][0] > (120 if p in recents else 3600)]
    if a_lire:
        with ThreadPoolExecutor(8) as ex:
            for p, v in zip(a_lire, ex.map(_github, a_lire)):
                c[p] = (now, v)
    return {p: c[p][1] for p in paths}


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
    "assis": ("Temps assis", "moyenne", "min"), "sommeil": ("Sommeil", "moyenne", "min"),
    "profond": ("Profond", "moyenne", "min"), "paradoxal": ("Paradoxal", "moyenne", "min"),
    "leger": ("Léger", "moyenne", "min"), "eveil": ("Éveillé", "moyenne", "min"),
    "coucher": ("Coucher", "moyenne", "h"), "lever": ("Lever", "moyenne", "h"),
    "fc_repos": ("FC au repos", "moyenne", "bpm"), "fc_max": ("FC max", "max", "bpm"),
    "vfc": ("Variabilité (VFC)", "moyenne", "ms"), "resp": ("Respiration", "moyenne", "/min"),
    "spo2": ("SpO2", "moyenne", "%"), "poids": ("Poids", "dernier", "kg"), "gras": ("Masse grasse", "dernier", "%"),
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


def tuiles(cles, df, avant, un_jour, legende_avant):
    html = []
    for cle in cles:
        v = agrege(df, cle)
        if v is None or (cle in ("seances", "min_sport") and not v):
            continue
        nom, agg, _ = METRIQUES[cle]
        sous, barre = "", ""
        if not un_jour and agg == "total" and cle != "seances":
            sous = f"moy. {joli(cle, v / len(df))} / jour"
        elif not un_jour and agg == "moyenne":
            sous = "moyenne"
        elif agg == "dernier":
            sous = "dernière pesée"
        a, p = par_jour(avant, cle), par_jour(df, cle)
        if a and p is not None and not (un_jour and df.index[-1] == dt.datetime.now(TZ).date()) and METRIQUES[cle][2] != "h":
            ecart = (p - a) / a * 100
            if abs(ecart) >= 1:
                sous += f"{' · ' if sous else ''}{'▲' if ecart > 0 else '▼'} {abs(ecart):.0f} % vs {legende_avant}"
        obj = OBJECTIFS.get(cle)
        if obj and un_jour:
            pct = min(v / obj * 100, 100)
            barre = f'<div class="bar"><div class="{"ok" if pct >= 100 else ""}" style="width:{pct:.0f}%"></div></div>'
            sous = f"objectif {joli(cle, obj)}" + (f" · {sous}" if sous else "")
        elif obj and agg == "total":
            col = pd.to_numeric(df[cle], errors="coerce")
            sous += f" · objectif {(col >= obj).sum()} j / {len(df)}"
        html.append(f'<div class="tile"><div class="l">{nom}</div><div class="v">{joli(cle, v)}</div>'
                    f'<div class="s">{sous}</div>{barre}</div>')
    if html:
        st.markdown(f'<div class="tiles">{"".join(html)}</div>', unsafe_allow_html=True)
    return bool(html)


# ---------- Graphiques ----------
def regroupe(df, cles, mensuel):
    """Lignes du graphique : un point par jour, ou par mois (moyenne par jour) pour les longues périodes."""
    d = df[[c for c in cles if c in df]].apply(pd.to_numeric, errors="coerce")
    if mensuel:
        d = d.groupby(pd.to_datetime(d.index).to_period("M")).mean()
        d.index = [f"{MOIS[p.month - 1]}" for p in d.index]
    else:
        d.index = [f"{JOURS[x.weekday()]} {x:%d/%m}" for x in d.index]
    return d


def graphique(d, cle, titre, type_="barre", diviseur=1, objectif=None, couleur=BLEU, hauteur=170):
    if cle not in d or d[cle].notna().sum() == 0:
        return
    data = pd.DataFrame({"x": d.index, "y": d[cle] / diviseur})
    x = alt.X("x:N", sort=None, title=None, axis=alt.Axis(labelAngle=-45 if len(d) > 8 else 0))
    y = alt.Y("y:Q", title=None, scale=alt.Scale(zero=type_ == "barre"))
    tip = [alt.Tooltip("x:N", title=" "), alt.Tooltip("y:Q", title=titre, format=",.1f")]
    if type_ == "barre":
        ch = alt.Chart(data).mark_bar(color=couleur, cornerRadiusTopLeft=3, cornerRadiusTopRight=3).encode(x, y, tooltip=tip)
    else:
        ch = alt.Chart(data.dropna()).mark_line(color=couleur, point=True).encode(x, y, tooltip=tip)
    if objectif:
        ch += alt.Chart(pd.DataFrame({"y": [objectif / diviseur]})).mark_rule(color="#4CD3A0", strokeDash=[4, 4]).encode(y="y:Q")
    st.markdown(f"**{titre}**")
    st.altair_chart(ch.properties(height=hauteur), use_container_width=True)


def graphique_sommeil(d):
    cols = {"profond": "Profond", "leger": "Léger", "paradoxal": "Paradoxal", "eveil": "Éveil"}
    if not any(c in d and d[c].notna().any() for c in cols):
        return
    data = d[[c for c in cols if c in d]].rename(columns=cols).div(60).reset_index(names="x")
    data = data.melt("x", var_name="Phase", value_name="h").dropna()
    ch = alt.Chart(data).mark_bar().encode(
        alt.X("x:N", sort=None, title=None, axis=alt.Axis(labelAngle=-45 if len(d) > 8 else 0)),
        alt.Y("h:Q", title=None, stack=True),
        alt.Color("Phase:N", scale=alt.Scale(domain=list(COULEURS_PHASES), range=list(COULEURS_PHASES.values())),
                  legend=alt.Legend(orient="bottom", title=None)),
        order=alt.Order("ordre:Q"), tooltip=["x:N", "Phase:N", alt.Tooltip("h:Q", format=".1f", title="heures")],
    ).transform_calculate(ordre=f"indexof({list(COULEURS_PHASES)}, datum.Phase)")
    st.markdown("**Sommeil par nuit (heures)**")
    st.altair_chart(ch.properties(height=200), use_container_width=True)


# ---------- Coach (Claude) ----------
COACH_CONTEXTE = """Homme, en télétravail. Reprend le sport en douceur après une longue pause ; l'hiver arrive (froid,
nuit tôt), donc les sorties du soir sont difficiles. Se déplace souvent à vélo. Matériel à la maison : rameur, tapis de
danse Dance Dance Revolution, poids du corps (pompes, tractions). Parc extérieur avec appareils (vélo elliptique…) près
de chez lui. Déteste les burpees : ne jamais en proposer. Objectifs : 5 000 pas par jour minimum (sur le tapis de danse
si besoin), 15 minutes en zone par jour, rameur 1 à 2 fois par semaine (10 min), quelques pompes et tractions, garder
la masse grasse sous 20 %. Il veut des objectifs réalistes et progressifs pour ne pas se décourager."""

COACH_SYSTEME = """Tu es le meilleur coach sportif et santé du monde, avec l'œil d'un préparateur physique et d'un
spécialiste du sommeil. Tu analyses les données du bracelet Fitbit (Inspire HR) et de la balance (Aria 2) de ton
élève et tu lui écris directement, en français, en le tutoyant.

Profil de l'élève :
{contexte}

Règles :
- Appuie chaque remarque sur des chiffres précis tirés des données (compare à ses propres moyennes, aux objectifs et
  aux repères de santé reconnus pour son âge). Pas de généralités creuses.
- Sois honnête mais encourageant : souligne les progrès réels, nomme clairement ce qui coince.
- Les « minutes en zone » se calculent comme Fitbit : zone brûle-graisses ×1, cardio et pic ×2.
- Une journée en cours n'est pas finie : juge-la en tenant compte de l'heure.
- La masse grasse de la balance varie de 1 à 2 points selon l'hydratation : raisonne sur la tendance, pas sur une pesée.
- Propose des actions faisables chez lui ou près de chez lui, en hiver, en télétravail. Jamais de burpees.
- Tu n'es pas médecin : si un chiffre est inquiétant (FC au repos qui grimpe fort, sommeil très court plusieurs nuits…),
  dis-le simplement et conseille d'en parler à un médecin.
- Format Markdown, titres en ####, phrases courtes, lisible sur téléphone. {longueur}

Plan de ta réponse :
#### En bref
(2 phrases : le verdict de la période)
#### Ce qui va bien
#### Ce qui coince
#### Sommeil et récupération
#### Mon plan pour toi
(3 actions concrètes et chiffrées maximum, pour demain ou la semaine qui vient)
#### Le défi
(un seul petit défi motivant et réaliste)"""


def tableau_coach(df):
    """Données jour par jour (ou par semaine si la période est longue) en CSV compact pour Claude."""
    d = df[[c for c in METRIQUES if c in df]].apply(pd.to_numeric, errors="coerce").dropna(axis=1, how="all")
    if len(d) > 62:
        d = d.groupby(pd.to_datetime(d.index).to_period("W")).mean()
        d.index = [f"semaine du {p.start_time:%d/%m}" for p in d.index]
    else:
        d.index = [f"{JOURS[x.weekday()]} {x:%d/%m}" for x in d.index]
    for c in ("coucher", "lever"):
        if c in d:
            d[c] = d[c].map(heure)
    unites = {"min": "min", "h": "heure", "km": "km", "n": "", "bpm": "bpm", "ms": "ms", "/min": "/min",
              "%": "%", "kg": "kg"}
    d.columns = [f"{METRIQUES[c][0]} ({unites[METRIQUES[c][2]]})".replace(" ()", "") for c in d.columns]
    return d.round(1).to_csv(sep=";")


def message_coach(periode, debut, fin, df, avant, legende_avant, seances, age, pesees):
    maintenant = dt.datetime.now(TZ)
    poids = "\n".join(f"- {d:%d/%m/%y} : {nombre(r.poids, 1)} kg, {nombre(r.gras, 1) if pd.notna(r.gras) else '?'} % de gras"
                      for d, r in pesees.dropna(subset=["poids"]).tail(30).iterrows()) or "aucune"
    moyennes = "\n".join(f"- {METRIQUES[c][0]} : {joli(c, par_jour(avant, c))}" for c in METRIQUES
                         if par_jour(avant, c) is not None)
    return (f"Âge : {age or 'inconnu'} ans. Nous sommes le {maintenant:%d/%m/%Y}, il est {maintenant:%H:%M}.\n"
            f"Période à analyser : {periode.lower()} du {debut:%d/%m/%Y} au {fin:%d/%m/%Y}.\n\n"
            f"Données (une ligne par {'semaine, moyenne par jour' if len(df) > 62 else 'jour'}) :\n{tableau_coach(df)}\n"
            f"Séances d'exercice de la période :\n{chr(10).join(seances) or 'aucune'}\n\n"
            f"Pour comparer, moyennes par jour {legende_avant} :\n{moyennes or 'pas de données'}\n\n"
            f"Pesées des 3 derniers mois (jusqu'à la fin de la période) :\n{poids}")


def coach(periode, debut, fin, df, avant, legende_avant, seances, age, pesees):
    st.markdown("### 🧠 Le coach")
    cle_api = st.secrets.get("ANTHROPIC_API_KEY")
    if not cle_api:
        st.info("Pour avoir l'analyse du coach, ajoute le secret **ANTHROPIC_API_KEY** dans Streamlit "
                "(Settings → Secrets).")
        return
    msg = message_coach(periode, debut, fin, df, avant, legende_avant, seances, age, pesees)
    empreinte = hashlib.sha256(msg.split("\n", 1)[1].encode()).hexdigest()  # sans l'heure : même données = même analyse
    deja = _analyses().get(empreinte)
    if deja:
        st.markdown(deja)
        if not st.button("🔁 Refaire l'analyse", key="recoach"):
            return
    elif not st.button("🧠 Analyser mes données", type="primary", use_container_width=True, key="coach"):
        st.caption("Le coach lit tous les chiffres de la période affichée et te donne son analyse et un plan.")
        return
    import anthropic  # chargé seulement quand on demande une analyse
    longueur = "Environ 250 mots." if periode == "Jour" else "Environ 400 mots."
    systeme = COACH_SYSTEME.format(contexte=st.secrets.get("COACH_CONTEXTE", COACH_CONTEXTE), longueur=longueur)
    client = anthropic.Anthropic(api_key=cle_api)
    try:
        with st.spinner("Le coach analyse tes données…"):
            with client.beta.messages.stream(
                model="claude-opus-5-5", max_tokens=16000, system=systeme,
                output_config={"effort": "medium"},
                betas=["server-side-fallback-2026-07-01"], fallbacks="default",
                messages=[{"role": "user", "content": msg}],
            ) as flux:
                texte = st.write_stream(flux.text_stream)
                final = flux.get_final_message()
    except anthropic.AuthenticationError:
        st.error("La clé ANTHROPIC_API_KEY est refusée : vérifie-la dans les secrets Streamlit.")
        return
    except anthropic.RateLimitError:
        st.error("Trop de demandes d'un coup : réessaie dans une minute.")
        return
    except anthropic.APIStatusError as e:
        st.error(f"Le coach n'a pas pu répondre (erreur {e.status_code}). Vérifie le crédit sur console.anthropic.com.")
        return
    except anthropic.APIConnectionError:
        st.error("Pas de connexion avec le coach. Réessaie dans un instant.")
        return
    if final.stop_reason == "refusal":
        st.warning("Le coach n'a pas voulu analyser ces données. Réessaie plus tard.")
        return
    _analyses()[empreinte] = texte
    if deja:
        st.rerun()


# ---------- Mot de passe (l'appli est publique sur Streamlit : rien n'est affiché sans lui) ----------
def verrou():
    """Mot de passe APP_PASSWORD tapé une fois, puis mémorisé sur ce téléphone (localStorage + cookie : le cookie seul
    ne suffit pas sur Streamlit Cloud). Ce qui est mémorisé est une empreinte, pas le mot de passe."""
    pw = str(st.secrets.get("APP_PASSWORD", ""))
    if not pw:
        st.error("Secret APP_PASSWORD manquant (Streamlit Cloud → Settings → Secrets).")
        st.stop()
    jeton = hashlib.sha256(f"sante:{pw}".encode()).hexdigest()[:24]
    if st.session_state.get("ok") or st.context.cookies.get("sante_ok") == jeton:
        st.session_state["ok"] = True
        return jeton
    stored = streamlit_js_eval(js_expressions="localStorage.getItem('sante_ok') || ''", key="lire_ok")
    if stored is None:  # réponse du navigateur pas encore arrivée
        st.stop()
    if stored == jeton:
        st.session_state["ok"] = True
        return jeton
    st.markdown("## ❤️ Ma santé")
    with st.form("connexion", border=False):
        essai = st.text_input("Mot de passe", type="password")
        ok = st.form_submit_button("🔓 Entrer", type="primary", use_container_width=True)
    if ok and hmac.compare_digest(essai.encode(), pw.encode()):
        st.session_state["ok"] = st.session_state["memoriser"] = True
        st.rerun()
    if ok:
        st.error("Mot de passe incorrect.")
    st.stop()


# ---------- Période affichée ----------
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


def decaler(sens):
    """Boutons ◀ ▶ : période précédente / suivante."""
    p, r = st.session_state["periode"] or "Jour", st.session_state["ref"]
    if p == "Jour":
        r += dt.timedelta(days=sens)
    elif p in ("7 jours", "Semaine"):
        r += dt.timedelta(days=7 * sens)
    elif p == "Mois":
        a, m = divmod(r.month - 1 + sens, 12)
        r = dt.date(r.year + a, m + 1, min(r.day, 28))
    else:
        r = dt.date(r.year + sens, r.month, min(r.day, 28))
    st.session_state["ref"] = min(r, dt.datetime.now(TZ).date())


# ---------- Page ----------
if "GITHUB_TOKEN" not in st.secrets:
    st.error("Secrets manquants : GITHUB_TOKEN, GITHUB_REPO (Streamlit Cloud → Settings → Secrets).")
    st.stop()
JETON = verrou()
if st.session_state.pop("memoriser", False):  # retenu sur ce téléphone (sans date d'expiration / 400 jours)
    streamlit_js_eval(js_expressions=f"localStorage.setItem('sante_ok','{JETON}'); document.cookie='sante_ok={JETON}; "
                      "max-age=34560000; path=/; SameSite=Lax; Secure'; 1", key="memo_ok")

st.markdown("## ❤️ Ma santé")
onglet_sante, onglet_pokemon = st.tabs(["❤️ Santé", "🎮 Pokémon"])

with onglet_pokemon:
    st.markdown("### 🎮 Bientôt")
    st.write("Ici viendront ton Pokédex, tes captures du jour et ton Pokémon partenaire.")

with onglet_sante:
    aujourd = dt.datetime.now(TZ).date()
    st.session_state.setdefault("ref", aujourd)
    periode = st.segmented_control("Période", PERIODES, default="Jour", key="periode",
                                   label_visibility="collapsed") or "Jour"
    debut, fin = bornes(periode, st.session_state["ref"])
    c1, c2, c3, c4 = st.columns([1, 3, 1, 1], vertical_alignment="center")
    c1.button("◀", on_click=decaler, args=(-1,), use_container_width=True, help="Période précédente")
    c2.date_input("Date", key="ref", max_value=aujourd, format="DD/MM/YYYY", label_visibility="collapsed")
    c3.button("▶", on_click=decaler, args=(1,), use_container_width=True, disabled=fin >= aujourd,
              help="Période suivante")
    if c4.button("🔄", use_container_width=True, help="Relire les données maintenant"):
        _cache().clear()
        st.rerun()

    fin = min(fin, aujourd)
    jours = [debut + dt.timedelta(days=i) for i in range((fin - debut).days + 1)]
    # Période de comparaison : les 7 jours d'avant pour un jour, sinon la période précédente de même longueur
    n_avant = 7 if periode == "Jour" else len(jours)
    debut_avant = debut - dt.timedelta(days=n_avant)
    legende_avant = "7 j d'avant" if periode == "Jour" else "période d'avant"
    debut_poids = min(debut_avant, fin - dt.timedelta(days=90))  # le poids : 3 mois au moins pour la courbe

    annees = range(debut_poids.year, fin.year + 1)
    fichier_ref = f"data/jour/{fin.year}/{fin}.json"
    du_jour_chemin = f"data/jour/{aujourd.year}/{aujourd}.json"
    recents = {f"data/jour/{d.year}/{d}.json" for d in (aujourd, aujourd - dt.timedelta(days=1))}
    recents |= {f"data/resume/{aujourd.year}.json", "data/profil.json"}
    with st.spinner("Lecture des données…"):
        fichiers = lire([f"data/resume/{y}.json" for y in annees] + ["data/profil.json", du_jour_chemin, fichier_ref],
                        recents)
    resumes = {}
    for y in annees:
        resumes.update(fichiers.get(f"data/resume/{y}.json") or {})
    age = ((fichiers.get("data/profil.json") or {}).get("profile") or {}).get("age")

    # Fraîcheur : heure de la dernière mesure reçue aujourd'hui (l'heure de synchro donnée par Google n'est pas à jour)
    du_jour = (fichiers.get(du_jour_chemin) or {}).get("types", {})
    heures = [l[0] for typ in ("steps", "heart-rate", "active-energy-burned") if isinstance(du_jour.get(typ), dict)
              for l in du_jour[typ].get("lignes", []) if l and l[0]]
    st.markdown(f'<div class="fresh">⌚ Dernière mesure reçue aujourd\'hui : {max(heures)[:5] if heures else "aucune"}'
                f' · {debut:%d/%m/%Y}{f" → {fin:%d/%m/%Y}" if fin != debut else ""}</div>', unsafe_allow_html=True)

    tous = [debut_poids + dt.timedelta(days=i) for i in range((fin - debut_poids).days + 1)]
    stats = pd.DataFrame({d: stats_jour(resumes.get(str(d)), fichiers.get(fichier_ref) if d == fin else None)
                          for d in tous}).T
    df, avant = stats.loc[debut:fin], stats.loc[debut_avant:debut - dt.timedelta(days=1)]
    un_jour, mensuel = periode == "Jour", len(jours) > 62
    j_ref = (fichiers.get(fichier_ref) or {}).get("types", {})
    seances = sorted((contenu(p) for d in jours for p in (resumes.get(str(d)) or {}).get("exercise") or []),
                     key=lambda c: c["interval"]["startTime"])

    # ----- Activité -----
    st.markdown("### 🏃 Activité")
    tuiles(["pas", "zone", "km", "actives", "min_sport", "seances", "kcal", "kcal_act", "etages", "assis"],
           df, avant, un_jour, legende_avant)
    if un_jour:
        pas = table(j_ref.get("steps"))
        col = next((c for c in ("countSum", "count") if c in pas), None)
        if col:
            if col == "count" and (pas["secondes"] == 60).any():  # ancienne liste brute : la série par minute seulement
                pas = pas[pas["secondes"] == 60]
            h = pd.to_numeric(pas[col], errors="coerce").groupby(pas["heure"].str[:2] + "h").sum()
            graphique(pd.DataFrame({"pas": h}), "pas", "Pas par heure")
    else:
        d = regroupe(df, ["pas", "zone"], mensuel)
        graphique(d, "pas", "Pas par jour" + (" (moyenne par mois)" if mensuel else ""),
                  objectif=OBJECTIFS["pas"])
        graphique(d, "zone", "Minutes en zone par jour" + (" (moyenne par mois)" if mensuel else ""),
                  objectif=OBJECTIFS["zone"], couleur="#FF9E80", hauteur=140)

    lignes_sport = []
    for c in seances:
        m = c.get("metricsSummary", {})
        km = (num(m.get("distanceMillimeters")) or 0) / 1e6
        z = m.get("heartRateZoneDurations") or {}
        zone = duree(z.get("moderateTime")) / 60 + 2 * (duree(z.get("vigorousTime")) + duree(z.get("peakTime"))) / 60
        quand = local(c["interval"]["startTime"])
        nom = c.get("displayName") or c.get("exerciseType", "Exercice")
        details = [hm(duree(c.get("activeDuration")) / 60)] + ([f"{nombre(km, 1)} km"] if km else []) + \
                  [f"{m.get('caloriesKcal', '–')} kcal", f"cardio moy. {m.get('averageHeartRateBeatsPerMinute', '–')}",
                   f"{zone:.0f} min en zone"]
        lignes_sport.append((c.get("exerciseType"), nom, quand, details, km, duree(c.get("activeDuration")) / 60))
    if lignes_sport:
        st.markdown("**Séances**")
        if not un_jour:  # résumé par sport
            res = pd.DataFrame([(n, k, m) for _, n, _, _, k, m in lignes_sport], columns=["Sport", "km", "min"])
            res = res.groupby("Sport").agg(Séances=("min", "size"), Durée=("min", "sum"), Distance=("km", "sum"))
            res = res.sort_values("Séances", ascending=False)
            st.markdown('<div class="tiles">' + "".join(
                f'<div class="tile"><div class="l">{n}</div><div class="v">{int(r.Séances)}×</div><div class="s">'
                f'{hm(r.Durée)}{f" · {nombre(r.Distance, 1)} km" if r.Distance else ""}</div></div>'
                for n, r in res.iterrows()) + "</div>", unsafe_allow_html=True)
        liste = "".join(f'<div class="sport">{SPORTS.get(t, "⭐")} <b>{n}</b> · {JOURS[q.weekday()]} {q:%d/%m %H:%M}'
                        f'<div class="s">{" · ".join(dd)}</div></div>' for t, n, q, dd, _, _ in reversed(lignes_sport))
        if len(lignes_sport) > 5:
            with st.expander(f"Les {len(lignes_sport)} séances"):
                st.markdown(liste, unsafe_allow_html=True)
        else:
            st.markdown(liste, unsafe_allow_html=True)

    # ----- Sommeil -----
    st.markdown("### 😴 Sommeil")
    if not tuiles(["sommeil", "profond", "paradoxal", "leger", "eveil", "coucher", "lever"], df, avant, un_jour,
                  legende_avant):
        st.caption("Pas de sommeil enregistré pour cette période.")
    nuits = stats.loc[fin - dt.timedelta(days=6):fin] if un_jour else df  # un jour : la semaine pour comparer
    graphique_sommeil(regroupe(nuits, ["profond", "leger", "paradoxal", "eveil"], mensuel))

    # ----- Cœur -----
    st.markdown("### ❤️ Cœur et respiration")
    tuiles(["fc_repos", "vfc", "fc_max", "resp", "spo2"], df, avant, un_jour, legende_avant)
    if un_jour:
        hr = table(j_ref.get("heart-rate"))
        hr = hr.sort_values("heure") if "heure" in hr else hr
        moy = [c for c in hr.columns if "avg" in c.lower() or "mean" in c.lower()]
        if moy:
            d = pd.DataFrame({"fc": pd.to_numeric(hr[moy[0]], errors="coerce").values}, index=hr["heure"].str[:5])
            graphique(d.iloc[::5], "fc", "Cardio de la journée (bpm)", type_="ligne")
    else:
        d = regroupe(df, ["fc_repos", "vfc"], mensuel)
        graphique(d, "fc_repos", "FC au repos (bpm)", type_="ligne", hauteur=140)
        graphique(d, "vfc", "Variabilité cardiaque (ms) — plus haut = mieux récupéré", type_="ligne",
                  couleur="#B39DFF", hauteur=140)

    # ----- Poids -----
    st.markdown("### ⚖️ Poids et masse grasse")
    pesees = stats.loc[:fin, ["poids", "gras"]].apply(pd.to_numeric, errors="coerce").dropna(how="all")
    if pesees.empty:
        st.caption("Aucune pesée ces 3 derniers mois.")
    else:
        der = pesees.index[-1]
        gras7 = pesees["gras"].dropna().tail(7).mean()
        html = [f'<div class="tile"><div class="l">Poids</div><div class="v">{joli("poids", pesees["poids"].dropna().iloc[-1])}'
                f'</div><div class="s">pesée du {der:%d/%m}</div></div>']
        if pesees["gras"].notna().any():
            html.append(f'<div class="tile"><div class="l">Masse grasse</div><div class="v">'
                        f'{joli("gras", pesees["gras"].dropna().iloc[-1])}</div><div class="s">moyenne des 7 dernières '
                        f'pesées : {nombre(gras7, 1)} %</div></div>')
        p_debut = pesees.loc[debut:, "poids"].dropna()
        if len(p_debut) >= 2:
            html.append(f'<div class="tile"><div class="l">Évolution sur la période</div><div class="v">'
                        f'{"+" if p_debut.iloc[-1] > p_debut.iloc[0] else ""}{nombre(p_debut.iloc[-1] - p_debut.iloc[0], 1)} kg</div><div class="s">{len(p_debut)} pesées</div></div>')
        st.markdown(f'<div class="tiles">{"".join(html)}</div>', unsafe_allow_html=True)
        courbe = pesees.loc[(debut if len(jours) >= 30 else debut_poids):]
        if len(courbe) >= 2:
            courbe.index = [f"{x:%d/%m/%y}" for x in courbe.index]
            g1, g2 = st.columns(2)
            with g1:
                graphique(courbe, "poids", "Poids (kg)", type_="ligne", hauteur=150)
            with g2:
                graphique(courbe, "gras", "Masse grasse (%)", type_="ligne", couleur="#FF9E80", hauteur=150)

    # ----- Coach -----
    textes_seances = [f"- {JOURS[q.weekday()]} {q:%d/%m %H:%M} : {n} ({', '.join(dd)})" for _, n, q, dd, _, _ in lignes_sport]
    coach(periode, debut, fin, df, avant, legende_avant, textes_seances, age, pesees)

    # ----- Toutes les données brutes (pour vérifier ce que Google donne) -----
    st.divider()
    if st.toggle("📦 Afficher toutes les données brutes", key="brut"):
        st.caption("Tout ce que Google a donné pour la période, tel quel (une rubrique par type).")
        jours_brut = jours[-31:]
        bruts = lire([f"data/jour/{d.year}/{d}.json" for d in jours_brut], recents)
        detail, totaux = {}, {}
        for d in jours:
            for cle, pts in (resumes.get(str(d)) or {}).items():
                df_t = pd.json_normalize(pts) if pts else pd.DataFrame()
                if not df_t.empty:
                    df_t.insert(0, "jour", str(d))
                    totaux.setdefault(cle, []).append(df_t)
        for d in jours_brut:
            for typ, v in ((bruts.get(f"data/jour/{d.year}/{d}.json") or {}).get("types") or {}).items():
                df_t = table(v) if isinstance(v, dict) else pd.json_normalize(v)
                if not df_t.empty:
                    df_t.insert(0, "jour", str(d))
                    detail.setdefault(typ, []).append(df_t)
        for titre, groupe in (("Résumés du jour", totaux), ("Détail (tous les points, 31 jours max)", detail)):
            if groupe:
                st.markdown(f"**{titre}**")
            for typ in sorted(groupe, key=lambda k: NOMS.get(k.split(":")[0], k)):
                lignes = pd.concat(groupe[typ], ignore_index=True)
                lignes = lignes.map(lambda x: json.dumps(x, ensure_ascii=False) if isinstance(x, (list, dict)) else x)
                nom = NOMS.get(typ.split(":")[0], typ) + (" (total du jour)" if typ.endswith(":jour") else "")
                with st.expander(f"{nom} · {len(lignes)} ligne(s)"):
                    st.dataframe(lignes, use_container_width=True, hide_index=True)

    if st.button("🔒 Ne plus mémoriser ce téléphone"):
        streamlit_js_eval(js_expressions="localStorage.removeItem('sante_ok'); "
                          "document.cookie='sante_ok=; max-age=0; path=/; SameSite=Lax; Secure'; 1", key="oubli_ok")
        st.session_state.clear()
        st.success("C'est oublié : le mot de passe sera redemandé à la prochaine ouverture.")
