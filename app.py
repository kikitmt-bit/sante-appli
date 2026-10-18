"""Ma santé : toutes mes données Google Health (récoltées par sante.gs dans la branche « data »), par jour, semaine, mois."""
import datetime as dt
import hashlib
import hmac
import json
import time
from concurrent.futures import ThreadPoolExecutor
from zoneinfo import ZoneInfo

import pandas as pd
import requests
import streamlit as st
from streamlit_js_eval import streamlit_js_eval

TZ = ZoneInfo("Europe/Paris")
st.set_page_config(page_title="Ma santé", page_icon="❤️", layout="centered")

# Noms en français des types de Google Health
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
PHASES = {"DEEP": "Profond", "LIGHT": "Léger", "REM": "Paradoxal", "AWAKE": "Éveil", "ASLEEP": "Endormi", "RESTLESS": "Agité"}

st.markdown("""<style>
.block-container{padding-top:2.2rem;max-width:760px}
.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:6px 0 14px}
.tile{background:#1C2740;border-radius:12px;padding:10px 12px}
.tile .l{font-size:.78rem;color:#9AA7C2}
.tile .v{font-size:1.35rem;font-weight:700;color:#EEF2FA;line-height:1.3}
.tile .s{font-size:.75rem;color:#9AA7C2}
.fresh{font-size:.8rem;color:#9AA7C2;margin:-6px 0 8px}
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


def hm(minutes):
    if minutes is None or pd.isna(minutes):
        return "–"
    return f"{int(minutes // 60)} h {int(minutes % 60):02d}"


def sommeil(points):
    """Minutes par phase pour les nuits d'un jour (la nuit compte pour le matin où elle finit)."""
    phases = {}
    for p in points or []:
        c = contenu(p)
        stages = c.get("stages") or []
        if not stages:  # pas de phases : toute la durée
            iv = c.get("interval", {})
            stages = [{"type": "ASLEEP", "startTime": iv.get("startTime"), "endTime": iv.get("endTime")}]
        for s in stages:
            try:
                m = (pd.Timestamp(s["endTime"]) - pd.Timestamp(s["startTime"])).total_seconds() / 60
            except Exception:
                continue
            if m <= 0:
                continue
            phases[s.get("type", "?")] = phases.get(s.get("type", "?"), 0) + m
    return phases


# ---------- Les chiffres d'une journée ----------
def stats_jour(j, r):
    """j = fichier du jour (types), r = résumé du jour. -> {nom: valeur} (None si absent)."""
    t, r = (j or {}).get("types", {}), r or {}
    s = {}
    # Totaux du jour calculés par Google (sans doublons) ; à défaut, somme des minutes
    s["Pas"] = num(premier(r.get("steps:jour"), "countSum"))
    if s["Pas"] is None:
        s["Pas"] = somme(t.get("steps"), "countSum", "count")
    mm = num(premier(r.get("distance:jour"), "millimetersSum"))
    if mm is None:
        mm = somme(t.get("distance"), "millimetersSum", "millimeters")
    s["Distance (km)"] = mm / 1e6 if mm is not None else None
    s["Calories totales"] = num(premier(r.get("total-calories:jour"), "kcalSum"))
    s["Calories actives"] = num(premier(r.get("active-energy-burned:jour"), "kcalSum"))
    if s["Calories actives"] is None:
        s["Calories actives"] = somme(t.get("active-energy-burned"), "kcalSum", "kcal")
    am = premier(r.get("active-minutes:jour"), "activeMinutesRollupByActivityLevel")
    if am:
        par = {x.get("activityLevel"): num(x.get("activeMinutesSum")) or 0 for x in am}
        s["Minutes actives"] = sum(par.values())
        s["dont intenses"] = par.get("VIGOROUS")
    sed = table(t.get("sedentary-period"))
    s["Temps assis"] = sed["secondes"].sum() / 60 if "secondes" in sed else None
    ph = sommeil(r.get("sleep"))
    if ph:
        s["Sommeil"] = sum(v for k, v in ph.items() if k != "AWAKE")
        for k in ("DEEP", "LIGHT", "REM", "AWAKE"):
            if k in ph:
                s[f"Sommeil {PHASES[k].lower()}"] = ph[k]
    s["FC au repos"] = num(premier(r.get("daily-resting-heart-rate"), "beatsPerMinute"))
    hr = table(t.get("heart-rate"))
    cols = [c for c in hr.columns if "max" in c.lower()]
    s["FC max"] = pd.to_numeric(hr[cols[0]], errors="coerce").max() if cols else None
    s["VFC (ms)"] = num(premier(r.get("daily-heart-rate-variability"), "averageHeartRateVariabilityMilliseconds"))
    s["Respiration (/min)"] = num(premier(r.get("daily-respiratory-rate"), "breathsPerMinute"))
    s["SpO2 (%)"] = num(premier(r.get("daily-oxygen-saturation"), "averagePercentage"))
    g = num(premier(r.get("weight"), "weightGrams"))
    s["Poids (kg)"] = g / 1000 if g else None
    ex = r.get("exercise") or []
    s["Exercices"] = len(ex) or None
    s["Minutes d'exercice"] = sum(duree(contenu(p).get("activeDuration")) for p in ex) / 60 if ex else None
    return s


# Comment additionner sur une semaine / un mois : total (+ moyenne par jour) ou moyenne
TOTAUX = {"Pas", "Distance (km)", "Calories totales", "Calories actives", "Minutes actives", "dont intenses",
          "Exercices", "Minutes d'exercice"}
DUREES = {"Temps assis", "Sommeil", "Sommeil profond", "Sommeil léger", "Sommeil paradoxal", "Sommeil éveil"}


def joli(nom, v):
    if v is None or pd.isna(v):
        return "–"
    if nom in DUREES or nom in ("Minutes actives", "dont intenses", "Minutes d'exercice"):
        return hm(v)
    if "km" in nom or "kg" in nom or "ms" in nom or "/min" in nom:
        return f"{v:,.1f}".replace(",", " ").replace(".", ",")
    return f"{v:,.0f}".replace(",", " ")


def tuiles(stats_par_jour, un_jour):
    df = pd.DataFrame(stats_par_jour).T
    html = []
    for nom in df.columns:
        col = pd.to_numeric(df[nom], errors="coerce").dropna()
        if col.empty:
            continue
        if un_jour:
            v, sous = col.iloc[0], ""
        elif nom in TOTAUX:
            v, sous = col.sum(), f"moy. {joli(nom, col.mean())} / jour"
        else:
            v, sous = col.mean(), f"moyenne sur {len(col)} j"
        html.append(f'<div class="tile"><div class="l">{nom}</div><div class="v">{joli(nom, v)}</div>'
                    f'<div class="s">{sous}</div></div>')
    st.markdown(f'<div class="tiles">{"".join(html)}</div>' if html else "Aucune donnée pour cette période.",
                unsafe_allow_html=True)
    return df


def brut(points):
    """Points bruts de Google -> DataFrame à plat (les listes restent en texte)."""
    df = pd.json_normalize(points)
    for c in df.columns:
        if df[c].map(lambda x: isinstance(x, (list, dict))).any():
            df[c] = df[c].map(lambda x: json.dumps(x, ensure_ascii=False) if isinstance(x, (list, dict)) else x)
    return df


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


# ---------- Page ----------
if "GITHUB_TOKEN" not in st.secrets:
    st.error("Secrets manquants : GITHUB_TOKEN, GITHUB_REPO (Streamlit Cloud → Settings → Secrets).")
    st.stop()
JETON = verrou()
if st.session_state.pop("memoriser", False):  # retenu sur ce téléphone (sans date d'expiration / 400 jours)
    streamlit_js_eval(js_expressions=f"localStorage.setItem('sante_ok','{JETON}'); document.cookie='sante_ok={JETON}; "
                      "max-age=34560000; path=/; SameSite=Lax; Secure'; 1", key="memo_ok")

st.markdown("## ❤️ Ma santé")
c1, c2 = st.columns([3, 2])
with c1:
    periode = st.segmented_control("Période", ["Jour", "Semaine", "Mois"], default="Jour", key="periode",
                                   label_visibility="collapsed") or "Jour"
aujourd = dt.datetime.now(TZ).date()
with c2:
    ref = st.date_input("Date", aujourd, max_value=aujourd, format="DD/MM/YYYY", label_visibility="collapsed")

if periode == "Jour":
    debut, fin = ref, ref
elif periode == "Semaine":
    debut = ref - dt.timedelta(days=ref.weekday())
    fin = debut + dt.timedelta(days=6)
else:
    debut = ref.replace(day=1)
    fin = (debut + dt.timedelta(days=32)).replace(day=1) - dt.timedelta(days=1)
fin = min(fin, aujourd)
jours = [debut + dt.timedelta(days=i) for i in range((fin - debut).days + 1)]

recents = {f"data/jour/{d.year}/{d}.json" for d in (aujourd, aujourd - dt.timedelta(days=1))}
recents |= {f"data/resume/{aujourd.year}.json", "data/profil.json"}
chemins = [f"data/jour/{d.year}/{d}.json" for d in jours]
annees = sorted({d.year for d in jours})
with st.spinner("Lecture des données…"):
    fichiers = lire(chemins + [f"data/resume/{y}.json" for y in annees] + ["data/profil.json"], recents)

# Fraîcheur : heure de la dernière mesure reçue aujourd'hui (l'heure de synchro donnée par Google n'est pas mise à jour)
du_jour = (fichiers.get(f"data/jour/{aujourd.year}/{aujourd}.json") or {}).get("types", {})
heures = [l[0] for typ in ("steps", "heart-rate", "active-energy-burned") if isinstance(du_jour.get(typ), dict)
          for l in du_jour[typ].get("lignes", []) if l and l[0]]
cf, cb = st.columns([4, 1])
with cf:
    st.markdown(f'<div class="fresh">⌚ Dernière mesure reçue aujourd\'hui : {max(heures)[:5] if heures else "aucune"}'
                ' · relu toutes les 2 min</div>', unsafe_allow_html=True)
with cb:
    if st.button("🔄", help="Relire les données maintenant"):
        _cache().clear()
        st.rerun()

resumes = {}
for y in annees:
    resumes.update(fichiers.get(f"data/resume/{y}.json") or {})
par_jour = {d: (fichiers.get(f"data/jour/{d.year}/{d}.json"), resumes.get(str(d))) for d in jours}
JOURS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"]
stats = {f"{JOURS[d.weekday()]} {d:%d/%m}": stats_jour(j, r) for d, (j, r) in par_jour.items()}
df = tuiles(stats, periode == "Jour")

# ---------- Graphiques ----------
if periode == "Jour":
    j, r = par_jour[ref]
    t = (j or {}).get("types", {})
    pas = table(t.get("steps"))
    col = next((c for c in ("countSum", "count") if c in pas), None)
    if col:
        if col == "count" and (pas["secondes"] == 60).any():  # ancienne liste brute : la série minute par minute seulement
            pas = pas[pas["secondes"] == 60]
        pas["Heure"] = pas["heure"].str[:2] + "h"
        st.markdown("**Pas par heure**")
        st.bar_chart(pas.groupby("Heure")[col].sum(), color="#6B8CFF", height=200, y_label="", x_label="")
    hr = table(t.get("heart-rate"))
    moy = [c for c in hr.columns if "avg" in c.lower() or "mean" in c.lower()]
    if moy:
        st.markdown("**Cardio (moyenne par minute)**")
        st.line_chart(hr.set_index(hr["heure"].str[:5])[moy[0]], color="#6B8CFF", height=200, y_label="", x_label="")
    ph = sommeil((r or {}).get("sleep"))
    if ph:
        st.markdown("**Sommeil de la nuit**")
        st.bar_chart(pd.Series({PHASES.get(k, k): v / 60 for k, v in ph.items()}, name="heures"),
                     color="#6B8CFF", height=180, horizontal=True, y_label="", x_label="heures")
    for p in (r or {}).get("exercise") or []:
        c = contenu(p)
        m = c.get("metricsSummary", {})
        st.markdown(f"🏃 **{c.get('displayName', c.get('exerciseType', 'Exercice'))}** · "
                    f"{pd.Timestamp(c['interval']['startTime']).tz_convert(TZ):%H:%M} · "
                    f"{hm(duree(c.get('activeDuration')) / 60)} · {m.get('caloriesKcal', '–')} kcal · "
                    f"cardio moyen {m.get('averageHeartRateBeatsPerMinute', '–')}")
elif not df.empty:
    for nom, titre, convert in (("Pas", "Pas par jour", 1), ("Sommeil", "Sommeil par nuit (heures)", 1 / 60),
                                ("FC au repos", "Fréquence cardiaque au repos", 1), ("VFC (ms)", "Variabilité cardiaque (ms)", 1),
                                ("Calories totales", "Calories totales par jour", 1)):
        if nom in df and pd.to_numeric(df[nom], errors="coerce").notna().any():
            st.markdown(f"**{titre}**")
            serie = pd.to_numeric(df[nom], errors="coerce") * convert
            serie.index = pd.CategoricalIndex(serie.index, categories=list(serie.index), ordered=True)
            if nom in ("FC au repos", "VFC (ms)"):
                st.line_chart(serie, color="#6B8CFF", height=180, y_label="", x_label="")
            else:
                st.bar_chart(serie, color="#6B8CFF", height=180, y_label="", x_label="")
    with st.expander("📋 Tableau jour par jour"):
        st.dataframe(df.apply(lambda col: col.map(lambda v: joli(col.name, v))), use_container_width=True)

# ---------- Toutes les données brutes ----------
st.markdown("### 📦 Toutes les données")
st.caption("Tout ce que Google a donné pour la période, tel quel (une rubrique par type).")
detail, totaux = {}, {}
for d, (j, r) in par_jour.items():
    for typ, v in ((j or {}).get("types") or {}).items():
        df_t = table(v) if isinstance(v, dict) else brut(v)
        if not df_t.empty:
            df_t.insert(0, "jour", str(d))
            detail.setdefault(typ, []).append(df_t)
    for cle, pts in (r or {}).items():
        if cle.endswith(":jour"):
            df_t = brut(pts)
            df_t.insert(0, "jour", str(d))
            totaux.setdefault(cle[:-5], []).append(df_t)

if not detail and not totaux:
    st.info("Rien pour cette période (la récolte de l'historique est peut-être encore en cours).")
if totaux:
    st.markdown("**Totaux du jour calculés par Google**")
    for typ in sorted(totaux, key=lambda k: NOMS.get(k, k)):
        lignes = pd.concat(totaux[typ], ignore_index=True)
        with st.expander(f"{NOMS.get(typ, typ)} · {len(lignes)} ligne(s)"):
            st.dataframe(lignes, use_container_width=True, hide_index=True)
if detail:
    st.markdown("**Détail (tous les points)**")
    for typ in sorted(detail, key=lambda k: NOMS.get(k, k)):
        lignes = pd.concat(detail[typ], ignore_index=True)
        with st.expander(f"{NOMS.get(typ, typ)} · {len(lignes)} ligne(s)"):
            st.dataframe(lignes, use_container_width=True, hide_index=True)

st.divider()
if st.button("🔒 Ne plus mémoriser ce téléphone"):
    streamlit_js_eval(js_expressions="localStorage.removeItem('sante_ok'); "
                      "document.cookie='sante_ok=; max-age=0; path=/; SameSite=Lax; Secure'; 1", key="oubli_ok")
    st.session_state.clear()
    st.success("C'est oublié : le mot de passe sera redemandé à la prochaine ouverture.")
