"""Ma santé : toutes mes données Google Health (récoltées par sante.gs dans la branche « data ») sur une seule page,
filtrées par jour / 7 jours / semaine / mois / année, avec l'analyse d'un coach (Claude)."""
import datetime as dt
import hashlib
import hmac
import json
import time
from concurrent.futures import ThreadPoolExecutor

import altair as alt
import pandas as pd
import requests
import streamlit as st
import streamlit.components.v1 as components
from streamlit_js_eval import streamlit_js_eval

import ecran_pokemon
import pokemon
from chiffres import (JOURS, METRIQUES, OBJECTIFS, TZ, agrege, analyses_precedentes, bornes, charger, chemin_analyse,
                      dossier_coach, hm, joli, nombre, par_jour, table)

st.set_page_config(page_title="Ma santé", page_icon="❤️", layout="centered")

BLEU, GRIS = "#6B8CFF", "#9AA7C2"
PERIODES = ["Jour", "7 jours", "Semaine", "Mois", "Année"]
MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]
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
.block-container{padding-top:.6rem;max-width:760px}
header[data-testid="stHeader"],[data-testid="stToolbar"],[data-testid="stDecoration"],[data-testid="stStatusWidget"]{display:none !important}
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
[data-testid="stExpander"] h4{font-size:1.05rem !important;padding:.6rem 0 .2rem !important}
[data-testid="stHorizontalBlock"]{flex-wrap:nowrap !important;gap:.5rem}
[data-testid="stColumn"]{min-width:0 !important}
</style>""", unsafe_allow_html=True)


# ---------- Lecture des fichiers (GitHub, branche data) ----------
def _github(path):
    """« chemin » dans la branche data, ou « branche:chemin » (ex. sprites:paquets/025.json)."""
    s = st.secrets
    branche, _, path = path.rpartition(":") if ":" in path.split("/")[0] else (s.get("GITHUB_BRANCH", "data"), "", path)
    r = requests.get(f"https://api.github.com/repos/{s['GITHUB_REPO']}/contents/{path}",
                     params={"ref": branche}, timeout=30,
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
    a_lire = [p for p in paths if p not in c or c[p][1] is None and now - c[p][0] > 120 or
              not p.startswith("sprites:") and now - c[p][0] > (120 if p in recents else 3600)]  # images : gardées
    if a_lire:
        with ThreadPoolExecutor(8) as ex:
            for p, v in zip(a_lire, ex.map(_github, a_lire)):
                c[p] = (now, v)
    return {p: c[p][1] for p in paths}


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
    st.altair_chart(ch.properties(height=hauteur), width="stretch")


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
    st.altair_chart(ch.properties(height=200), width="stretch")


# ---------- Coach ----------
def coach(d, lire_vite, aujourd):
    """L'analyse écrite chaque matin vers 6 h (tâche programmée Claude + coach.py), et le dossier à copier dans Claude."""
    periode, debut, fin = d["periode"], d["debut"], d["fin"]
    if periode == "Jour":  # aujourd'hui n'est pas fini : on montre l'analyse d'hier
        jour = min(fin, aujourd - dt.timedelta(days=1))
        cle, titre = ("Jour", jour), ("Analyse d'hier" if jour == aujourd - dt.timedelta(days=1)
                                      else f"Analyse du {JOURS[jour.weekday()]} {jour:%d/%m}")
    elif periode in ("Semaine", "Mois"):  # la période en cours n'est pas finie : bilan de la précédente
        ref = debut - dt.timedelta(days=1) if bornes(periode, debut)[1] >= aujourd else debut
        cle = (periode, bornes(periode, ref)[0])
        titre = (f"Bilan de la semaine du {cle[1]:%d/%m}" if periode == "Semaine"
                 else f"Bilan du mois de {cle[1]:%m/%Y}")
    else:
        cle, titre = None, None
    precedentes = analyses_precedentes(lire_vite, fin) if periode == "Jour" else ()
    texte = dossier_coach(d, precedentes)
    if not cle:
        bouton_copier(texte, "📋 Copier pour le coach")
        return
    chemin = chemin_analyse(*cle)
    a = lire_vite([chemin])[chemin]
    c1, c2 = st.columns([5, 1])
    with c1, st.expander(f"🧠 {titre}"):
        if a:
            st.markdown(a["texte"])
        else:
            st.caption("Pas encore d'analyse pour cette période : le coach écrit celle de la veille chaque matin "
                       "vers 6 h, le bilan de la semaine le lundi et celui du mois le 1er.")
    with c2:
        bouton_copier(texte, "📋")


def bouton_copier(texte, libelle):
    """Bouton qui copie le dossier du coach (consigne + données) sans l'afficher, pour le coller dans Claude."""
    contenu_js = json.dumps(texte, ensure_ascii=False).replace("</", "<\\/")
    components.html(f"""<style>body{{margin:0;background:transparent}}
button{{width:100%;height:42px;border-radius:.5rem;border:1px solid rgba(238,242,250,.2);background:#0D1322;
color:#EEF2FA;font:500 15px Outfit,sans-serif;cursor:pointer}}button:active{{border-color:#6B8CFF}}</style>
<button id="b" title="Copier toutes les données de la période pour les coller dans Claude">{libelle}</button>
<script>const t = {contenu_js}, b = document.getElementById("b"), l = b.textContent;
b.onclick = async () => {{
  try {{ await navigator.clipboard.writeText(t); }}
  catch (e) {{ const a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select();
             document.execCommand("copy"); a.remove(); }}
  b.textContent = "✓"; setTimeout(() => b.textContent = l, 1500);
}};</script>""", height=44)


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
        ok = st.form_submit_button("🔓 Entrer", type="primary", width="stretch")
    if ok and hmac.compare_digest(essai.encode(), pw.encode()):
        st.session_state["ok"] = st.session_state["memoriser"] = True
        st.rerun()
    if ok:
        st.error("Mot de passe incorrect.")
    st.stop()


# ---------- Période affichée ----------
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

onglet_sante, onglet_pokemon, onglet_config = st.tabs(["❤️ Santé", "🎮 Pokémon", "⚙️ Configuration"])

with onglet_sante:
    aujourd = dt.datetime.now(TZ).date()
    st.session_state.setdefault("ref", aujourd)
    periode = st.segmented_control("Période", PERIODES, default="Jour", key="periode",
                                   label_visibility="collapsed") or "Jour"
    fin_affichee = bornes(periode, st.session_state["ref"])[1]
    c1, c2, c3, c4 = st.columns([1, 3, 1, 1], vertical_alignment="center")
    c1.button("◀", on_click=decaler, args=(-1,), width="stretch", help="Période précédente")
    c2.date_input("Date", key="ref", max_value=aujourd, format="DD/MM/YYYY", label_visibility="collapsed")
    c3.button("▶", on_click=decaler, args=(1,), width="stretch", disabled=fin_affichee >= aujourd,
              help="Période suivante")
    if c4.button("🔄", width="stretch", help="Relire les données maintenant"):
        _cache().clear()
        st.rerun()

    recents = {f"data/jour/{x.year}/{x}.json" for x in (aujourd, aujourd - dt.timedelta(days=1))}
    recents |= {f"data/resume/{aujourd.year}.json", "data/profil.json",
                chemin_analyse("Jour", aujourd - dt.timedelta(days=1)), pokemon.FIGEES}
    lire_vite = lambda chemins: lire(chemins, recents)  # noqa: E731
    with st.spinner("Lecture des données…"):
        donnees = charger(lire_vite, periode, st.session_state["ref"], aujourd)
        du_jour = (lire_vite([f"data/jour/{aujourd.year}/{aujourd}.json"]).popitem()[1] or {}).get("types", {})
    debut, fin, jours, stats = donnees["debut"], donnees["fin"], donnees["jours"], donnees["stats"]
    df, avant, legende_avant, j_ref = donnees["df"], donnees["avant"], donnees["legende_avant"], donnees["j_ref"]
    un_jour, mensuel = periode == "Jour", len(jours) > 62

    # Fraîcheur : heure de la dernière mesure reçue aujourd'hui (l'heure de synchro donnée par Google n'est pas à jour)
    heures = [l[0] for typ in ("steps", "heart-rate", "active-energy-burned") if isinstance(du_jour.get(typ), dict)
              for l in du_jour[typ].get("lignes", []) if l and l[0]]
    st.markdown(f'<div class="fresh">⌚ Dernière mesure reçue aujourd\'hui : {max(heures)[:5] if heures else "aucune"}'
                f' · {debut:%d/%m/%Y}{f" → {fin:%d/%m/%Y}" if fin != debut else ""}</div>', unsafe_allow_html=True)

    coach(donnees, lire_vite, aujourd)

    # ----- Activité -----
    st.markdown("### 🏃 Activité")
    tuiles(["pas", "zone", "km", "etages", "denivele", "actives", "min_sport", "seances", "kcal", "kcal_act", "assis"],
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

    lignes_sport = [(x["type"], x["nom"], x["quand"], x["details"], x["km"], x["minutes"]) for x in donnees["seances"]]
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
    tuiles(["fc_repos", "vfc", "fc_max", "resp", "spo2", "spo2_min"], df, avant, un_jour, legende_avant)
    if un_jour:
        hr = table(j_ref.get("heart-rate"))
        hr = hr.sort_values("heure") if "heure" in hr else hr
        moy = [c for c in hr.columns if "avg" in c.lower() or "mean" in c.lower()]
        if moy:
            d = pd.DataFrame({"fc": pd.to_numeric(hr[moy[0]], errors="coerce").values}, index=hr["heure"].str[:5])
            graphique(d.iloc[::5], "fc", "Cardio de la journée (bpm)", type_="ligne")
        spo = table(j_ref.get("oxygen-saturation"))  # Pixel Watch : mesures pendant le sommeil
        if "percentage" in spo:
            spo = spo.sort_values("heure")
            d = pd.DataFrame({"spo2": pd.to_numeric(spo["percentage"], errors="coerce").values},
                             index=spo["heure"].str[:5])
            graphique(d, "spo2", "Oxygène dans le sang pendant le sommeil (%)", type_="ligne", couleur="#4CD3A0",
                      hauteur=140)
    else:
        d = regroupe(df, ["fc_repos", "vfc", "spo2"], mensuel)
        graphique(d, "spo2", "Oxygène dans le sang la nuit (%)", type_="ligne", couleur="#4CD3A0", hauteur=140)
        graphique(d, "fc_repos", "FC au repos (bpm)", type_="ligne", hauteur=140)
        graphique(d, "vfc", "Variabilité cardiaque (ms) — plus haut = mieux récupéré", type_="ligne",
                  couleur="#B39DFF", hauteur=140)

    # ----- Poids -----
    st.markdown("### ⚖️ Poids et masse grasse")
    pesees = donnees["pesees"]
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
        courbe = pesees.loc[(debut if len(jours) >= 30 else donnees["debut_tout"]):]
        if len(courbe) >= 2:
            courbe.index = [f"{x:%d/%m/%y}" for x in courbe.index]
            g1, g2 = st.columns(2)
            with g1:
                graphique(courbe, "poids", "Poids (kg)", type_="ligne", hauteur=150)
            with g2:
                graphique(courbe, "gras", "Masse grasse (%)", type_="ligne", couleur="#FF9E80", hauteur=150)

with onglet_pokemon:
    ecran_pokemon.afficher(lire_vite, aujourd)

with onglet_config:
    # ----- Toutes les données brutes (pour vérifier ce que Google donne) -----
    if st.toggle("📦 Afficher toutes les données brutes", key="brut"):
        st.caption(f"Tout ce que Google a donné pour la période choisie dans l'onglet Santé ({debut:%d/%m/%Y}"
                   f"{f' → {fin:%d/%m/%Y}' if fin != debut else ''}), tel quel (une rubrique par type).")
        jours_brut = jours[-31:]
        bruts = lire([f"data/jour/{d.year}/{d}.json" for d in jours_brut], recents)
        detail, totaux = {}, {}
        for d in jours:
            for cle, pts in (donnees["resumes"].get(str(d)) or {}).items():
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
                    st.dataframe(lignes, width="stretch", hide_index=True)

    st.divider()
    if st.button("🔒 Ne plus mémoriser ce téléphone"):
        streamlit_js_eval(js_expressions="localStorage.removeItem('sante_ok'); "
                          "document.cookie='sante_ok=; max-age=0; path=/; SameSite=Lax; Secure'; 1", key="oubli_ok")
        st.session_state.clear()
        st.success("C'est oublié : le mot de passe sera redemandé à la prochaine ouverture.")
