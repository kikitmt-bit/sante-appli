"""Pokémon Sport : le jeu (Aventure, Pokédex, Dresseur) et les chiffres de santé. Toutes mes données Google Health (récoltées
par sante.gs dans la branche « data ») dans l'onglet Santé, filtrées par jour / 7 jours / semaine / mois / année, avec
l'analyse d'un coach (Claude)."""
import datetime as dt
import hashlib
import hmac
import json
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

import base64
from pathlib import Path

import altair as alt
import pandas as pd
import requests
import streamlit as st
import streamlit.components.v1 as components
from streamlit_js_eval import streamlit_js_eval

import ecran_pokemon
import pokemon
from chiffres import (JOUEURS, JOURS, MEMOIRE, METRIQUES, OBJECTIFS, TZ, agrege, analyses_precedentes, bornes, charger,
                      chemin_analyse, dossier_ami, dossier_coach, hm, joli, nombre, par_jour, table)

st.set_page_config(page_title="Pokémon Sport", page_icon=str(Path(__file__).with_name("pikachu.png")), layout="centered")

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
.block-container,[data-testid="stMainBlockContainer"]{padding-top:.6rem !important;max-width:760px}
header[data-testid="stHeader"],[data-testid="stToolbar"],[data-testid="stDecoration"],[data-testid="stStatusWidget"]{display:none !important}
.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:6px 0 12px}
.tile{background:linear-gradient(160deg,#212E4C,#1A2438);border-radius:14px;padding:10px 12px;border-top:3px solid var(--c,#6B8CFF)}
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
.rubrique{display:flex;align-items:center;gap:9px;margin:1.5rem 0 .5rem;font-size:1.2rem;font-weight:800;color:#EEF2FA}
.rubrique i{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:11px;background:var(--c);font-style:normal;font-size:1.1rem;box-shadow:0 3px 8px rgba(0,0,0,.35)}
.anneaux{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:6px 0 14px;background:#1C2740;border-radius:18px;padding:14px 8px}
.anneau-s{text-align:center;min-width:0}
.anneau-s .rond{--t:clamp(74px,24vw,104px);width:var(--t);height:var(--t);margin:0 auto 6px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  background:conic-gradient(var(--c) calc(var(--p) * 1%),#0D1322 0)}
.anneau-s .rond div{width:calc(var(--t) - 16px);height:calc(var(--t) - 16px);border-radius:50%;background:#1C2740;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1}
.anneau-s .rond span{font-size:1.15rem}.anneau-s .rond b{font-size:.92rem;font-weight:800;color:#EEF2FA;white-space:nowrap}
.anneau-s .n{font-size:.82rem;font-weight:700;color:#EEF2FA}.anneau-s .o{font-size:.7rem;color:#9AA7C2}
[data-testid="stExpander"] h4{font-size:1.05rem !important;padding:.6rem 0 .2rem !important}
[data-testid="stHorizontalBlock"]{flex-wrap:nowrap !important;gap:.5rem}
[data-testid="stColumn"]{min-width:0 !important}
</style>""", unsafe_allow_html=True)


# Haut de page : 4 onglets (Aventure, Pokédex, Dresseur : le jeu ; Santé : les chiffres) et, sur la même ligne à droite, deux
# petits boutons 🔄 ⚙️ (le conteneur « outils », posé par-dessus). La barre est du simple HTML : les clics sont écoutés par le jeu
# (pokemon_ui.html, relierNav), sans recharger la page ; body.page-sante montre les chiffres au lieu du jeu. Les pages restent
# en place, repliées (height 0) plutôt que display:none : les graphiques gardent leur largeur et le jeu continue de tourner.
PIKACHU = base64.b64encode(Path(__file__).with_name("pikachu.png").read_bytes()).decode()
POKEDEX = base64.b64encode(b"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="1.5" width="18" height="21" rx="3" fill="#E8382F" stroke="#7A1712" stroke-width="1.5"/>
<circle cx="8" cy="6.5" r="2.8" fill="#6FD0FF" stroke="#fff" stroke-width="1.2"/><circle cx="13" cy="5" r="1" fill="#FFD84A"/><circle cx="16.3" cy="5" r="1" fill="#5BE07A"/>
<rect x="6" y="11" width="12" height="8.5" rx="1" fill="#BDEB9B" stroke="#7A1712"/></svg>""").decode()
LEVEINARD = f"{pokemon.IMAGES}/pokemon/versions/generation-vii/icons/113.png"  # Leveinard, l'infirmier des Pokémon : la santé
st.markdown(f"""<style>
[data-testid="stMainBlockContainer"]{{position:relative;padding-bottom:70px !important}}
.st-key-outils{{gap:4px !important}}
[data-testid="stLayoutWrapper"]:has(> .st-key-outils){{position:absolute;top:.6rem;right:1rem;z-index:5;width:auto !important}}
[data-testid="stElementContainer"]:has(iframe[height="0"]),
[data-testid="stElementContainer"]:has(> [data-testid="stMarkdown"] style){{display:none !important}}
.st-key-outils button{{min-height:30px;height:30px;width:30px;padding:0;font-size:.8rem}}
.nav-jeu{{display:flex;gap:3px;background:#0A101D;border-radius:14px;padding:3px;margin-right:72px}}
.nav-jeu button{{flex:1 1 0;min-width:0;position:relative;display:flex;flex-direction:column;align-items:center;gap:1px;border:0;border-radius:11px;padding:4px 0 3px;
  background:none;color:#9AA7C2;font:700 11.5px Outfit,sans-serif;cursor:pointer}}
.nav-jeu button.on{{background:#1C2740;color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.14)}}
.nav-jeu img{{width:26px;height:26px;object-fit:contain;image-rendering:pixelated;display:block}}
.nav-jeu img.leveinard{{transform:scale(1.75)}}
.nav-jeu .nb{{position:absolute;top:1px;right:calc(50% - 22px);min-width:15px;padding:0 3px;border-radius:8px;background:#E8382F;color:#fff;font-size:10px;line-height:15px}}
.nav-jeu .nb[hidden]{{display:none}}
body:not(.page-sante) [data-testid="stLayoutWrapper"]:has(> .st-key-page_sante),body.page-sante [data-testid="stLayoutWrapper"]:has(> .st-key-page_jeu){{height:0 !important;min-height:0;overflow:hidden;visibility:hidden;margin:0;flex:0 0 0 !important}}
</style>""", unsafe_allow_html=True)
NAV = f"""<div class="nav-jeu">
<button class="on" data-o="aventure"><img src="data:image/png;base64,{PIKACHU}" alt=""><span class="nb" hidden></span>Aventure</button>
<button data-o="dex"><img src="data:image/svg+xml;base64,{POKEDEX}" alt="">Pokédex</button>
<button data-o="dresseur"><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="">Dresseur</button>
<button data-o="sante"><img class="leveinard" src="{LEVEINARD}" alt="">Santé</button></div>"""


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


def demander_recolte(**en_plus):
    """Demande au script Google (déployé en Application Web : secrets SCRIPT_URL et SCRIPT_CLE) de récolter tout de suite."""
    s = st.secrets
    with st.spinner("Je demande tes dernières données à Google…"):
        try:
            params = {"cle": s.get("SCRIPT_CLE", "")} | ({"joueur": AMI} if AMI else {}) | en_plus
            return requests.get(s["SCRIPT_URL"], params=params, timeout=90).json()
        except Exception as e:
            return {"ok": False, "erreur": str(e)[:120]}


def oublier_fichiers():
    """Les fichiers de la personne connectée seront relus (les images restent en mémoire)."""
    c = _cache()
    for chemin in [k for k in c if not k.startswith("sprites:") and k.startswith(PREFIXE)]:
        del c[chemin]


def actualiser():
    """Bouton 🔄 : récolte immédiate de l'essentiel d'aujourd'hui, puis relit les fichiers."""
    if st.secrets.get("SCRIPT_URL"):
        rep = demander_recolte()
        st.session_state["message_maj"] = ("✅ Données à jour" if rep.get("ok")
                                           else f"⚠️ Actualisation impossible : {rep.get('erreur', '?')}")
    oublier_fichiers()
    st.rerun()


def lire(paths, recents=()):
    """Les fichiers de la personne connectée : ceux de Kiki, ou pour un ami les mêmes dans son dossier (PREFIXE). Le
    seul chemin qui mène aux données : un ami ne peut pas lire celles d'un autre."""
    lu = lire_depot([PREFIXE + p for p in paths], {PREFIXE + p for p in recents})
    return {p: lu[PREFIXE + p] for p in paths}


def lire_depot(paths, recents=()):
    """Contenu de plusieurs fichiers (lus en parallèle). Relus après 2 min pour les plus récents, 1 h pour les autres."""
    c, now = _cache(), time.time()
    a_lire = [p for p in paths if p not in c or c[p][1] is None and now - c[p][0] > 120 or
              not p.startswith("sprites:") and now - c[p][0] > (120 if p in recents else 3600)]  # images : gardées
    if a_lire:
        with ThreadPoolExecutor(8) as ex:
            for p, v in zip(a_lire, ex.map(_github, a_lire)):
                c[p] = (now, v)
    return {p: c[p][1] for p in paths}


def rubrique(icone, titre, couleur):
    st.markdown(f'<div class="rubrique" style="--c:{couleur}"><i>{icone}</i>{titre}</div>', unsafe_allow_html=True)


def anneaux(df, un_jour):
    """Les 3 anneaux du haut de la page, façon montre : pas, minutes en zone, sommeil par rapport à l'objectif (par jour)."""
    html = []
    for cle, icone, nom, couleur in (("pas", "👟", "Pas", BLEU), ("zone", "🔥", "En zone", "#FF9E80"), ("sommeil", "😴", "Sommeil", "#B39DFF")):
        v, obj = par_jour(df, cle), OBJECTIFS.get(cle)
        if v is None or v != v or not obj:
            v = 0
        pct = min(v / obj * 100, 100) if obj else 0
        html.append(f'<div class="anneau-s"><div class="rond" style="--c:{couleur};--p:{pct:.0f}"><div><span>{icone}</span><b>{joli(cle, v) if v else "–"}</b></div></div>'
                    f'<div class="n">{nom}</div><div class="o">{"objectif" if un_jour else "moy. / jour · objectif"} {joli(cle, obj)}</div></div>')
    st.markdown(f'<div class="anneaux">{"".join(html)}</div>', unsafe_allow_html=True)


def tuiles(cles, df, avant, un_jour, legende_avant, couleur=BLEU):
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
        html.append(f'<div class="tile" style="--c:{couleur}"><div class="l">{nom}</div><div class="v">{joli(cle, v)}</div>'
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
    """L'analyse du coach (écrite à la demande : bouton 🧠, tâche Claude + coach.py), et le dossier à copier dans Claude."""
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
    texte = dossier_coach(d, precedentes, (lire_vite([MEMOIRE])[MEMOIRE] or {}).get("texte"))
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
            st.caption("Pas encore d'analyse pour cette période : touche le bouton ci-dessous pour la demander au coach.")
        bouton_demander(*cle, refaire=bool(a))
    with c2:
        bouton_copier(texte, "📋")


def bouton_demander(periode, date, refaire):
    """Lance la tâche Claude « Coach santé (à la demande) » par son adresse web (secrets COACH_URL et COACH_TOKEN,
    créés sur claude.ai/code/routines → la tâche → déclencheur API). Plus rien d'automatique : seulement sur demande."""
    s, cle = st.secrets, f"coach:{periode}:{date}"
    if not (s.get("COACH_URL") and s.get("COACH_TOKEN")):
        st.caption("Bouton du coach pas encore branché (secrets COACH_URL et COACH_TOKEN à ajouter).")
        return
    deja = st.session_state.get(cle)
    if deja and time.time() - deja < 600:
        st.info("⏳ Demande envoyée : le coach écrit l'analyse. Touche 🔄 dans 2 ou 3 minutes pour la voir.")
        return
    if not st.button("🔁 Refaire l'analyse" if refaire else "🧠 Demander l'analyse au coach", key=f"btn_{cle}",
                     width="stretch"):
        return
    texte = (f"Demande depuis l'appli (bouton), pas l'analyse du matin. PÉRIODE = {periode}, DATE = {date:%Y-%m-%d} "
             f"(le jour analysé, le lundi de la semaine ou le 1er du mois). Fais l'étape 3 avec « {periode} {date:%Y-%m-%d} » "
             "à la place de « Jour HIER » (si la période est en cours, analyse ce qui est déjà là et dis-le ; une "
             "analyse déjà écrite est remplacée). L'étape 4 (carnet) seulement si PÉRIODE = Jour ; ignore l'étape 5. "
             "Puis les étapes 6, 7 et 8 comme d'habitude.")
    try:
        r = requests.post(s["COACH_URL"], json={"text": texte}, timeout=30,
                          headers={"Authorization": f"Bearer {s['COACH_TOKEN']}", "anthropic-version": "2023-06-01"})
        ok = r.status_code == 200
        erreur = "" if ok else (r.json().get("error", {}).get("message") if "json" in r.headers.get("content-type", "")
                                else r.text)[:150]
    except Exception as e:
        ok, erreur = False, str(e)[:150]
    if ok:
        st.session_state[cle] = time.time()
        st.rerun()
    else:
        st.error(f"⚠️ Le coach n'a pas pu être lancé : {erreur}")


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
def comptes():
    """Adresses Gmail qui ont le droit d'entrer (secret COMPTES : liste, ou adresses séparées par des virgules)."""
    c = st.secrets.get("COMPTES", [])
    return {a.strip().lower() for a in (c.split(",") if isinstance(c, str) else c) if a.strip()}


def connexion_google():
    """Connexion avec Google (st.login, secrets [auth]) ; seules les adresses de COMPTES entrent. Streamlit retient la
    connexion 30 jours sur le téléphone."""
    if not st.user.get("is_logged_in"):
        st.markdown("## Pokémon Sport")
        st.button("Se connecter avec Google", type="primary", width="stretch", on_click=st.login)
        st.stop()
    if str(st.user.get("email", "")).lower() not in comptes():
        st.markdown("## Pokémon Sport")
        st.error(f"Le compte {st.user.get('email', '')} n'a pas accès à cette appli.")
        st.button("Changer de compte", width="stretch", on_click=st.logout)
        st.stop()


def identifiant_ami():
    """None pour Kiki (secret PROPRIETAIRE, ou la seule adresse de COMPTES), sinon l'identifiant de l'ami : son dossier
    de données et sa graine au jeu, sans son adresse. Dans le doute (plusieurs comptes et pas de PROPRIETAIRE), personne
    n'est Kiki : ses données ne s'affichent jamais chez un ami."""
    if not GOOGLE:
        return None
    email, autorises = str(st.user.get("email", "")).lower(), comptes()
    moi = str(st.secrets.get("PROPRIETAIRE", "")).strip().lower() or (next(iter(autorises)) if len(autorises) == 1 else "")
    return None if email == moi else id_ami(email)


def id_ami(email):
    return hashlib.sha256(f"sante:{email}".encode()).hexdigest()[:12]


def accueil_ami():
    """Un ami pas encore relié : ce que fait l'appli de ses données, puis « Relier ma montre » (page du script Google)."""
    s = st.secrets
    st.markdown("## Pokémon Sport")
    st.markdown("Ton sport fait avancer ton dresseur et te fait gagner des Poké Balls. Pour ça, l'appli lit les données de "
                "ta montre dans **Google Santé**.")
    st.markdown("- **Lu :** activité, pas, cardio, séances, sommeil, poids, à partir des 14 jours avant ton inscription. Rien d'autre.\n"
                "- **Tes chiffres ne sont visibles que par toi** dans l'appli, jamais par les autres joueurs.\n"
                "- **Bon à savoir :** ils sont rangés dans le dépôt privé de Kiki, qui gère l'appli et peut donc y accéder.\n"
                "- **Tu peux tout arrêter** quand tu veux : ⚙️ → Supprimer mes données.")
    if s.get("SCRIPT_URL") and s.get("SCRIPT_CLE"):
        exp = int(time.time()) + 3600
        sig = hmac.new(s["SCRIPT_CLE"].encode(), f"relier:{AMI}:{exp}".encode(), hashlib.sha256).hexdigest()
        lien = f"{s['SCRIPT_URL']}?{urllib.parse.urlencode({'quoi': 'relier', 'joueur': AMI, 'exp': exp, 'sig': sig})}"
        st.link_button("⌚ Relier ma montre", lien, type="primary", width="stretch")
    else:
        st.warning("La liaison des montres n'est pas encore ouverte : reviens un peu plus tard.")
    with st.expander("Quelle montre ?"):
        st.markdown("**Fitbit ou Pixel Watch** : rien à régler. Vérifie juste que l'appli Google Santé est ouverte avec le "
                    "même compte Google que ta montre.\n\n"
                    "**Autre marque (Samsung, Garmin, Xiaomi, Amazfit…) sur un téléphone Android** : dans l'appli de ta montre, "
                    "active **Health Connect** ; puis dans Google Santé : Paramètres → Applis et appareils connectés → "
                    "Health Connect, et autorise la lecture.\n\n"
                    "**iPhone / Apple Watch** : pas possible pour l'instant (Health Connect n'existe que sur Android).")
    if st.button("C'est fait", width="stretch", help="Une fois ta montre reliée"):
        _cache().pop(JOUEURS, None)
        st.rerun()
    st.button("🚪 Se déconnecter", width="stretch", on_click=st.logout)
    st.stop()


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
    st.markdown("## Pokémon Sport")
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
GOOGLE = "auth" in st.secrets  # connexion Google ; sinon l'ancien mot de passe APP_PASSWORD (le temps de la régler)
JETON = connexion_google() if GOOGLE else verrou()
AMI = identifiant_ami()  # None : Kiki
PREFIXE = dossier_ami(AMI) if AMI else ""
REGISTRE = lire_depot([JOUEURS], {JOUEURS})[JOUEURS] or {}
if AMI and AMI not in REGISTRE:
    accueil_ami()
JOUEUR = {"id": AMI, "debut": dt.date.fromisoformat(REGISTRE[AMI]["debut"])} if AMI else None
# Les données d'un ami sont récoltées à l'ouverture de l'appli (une fois par jour sinon, pour ménager les quotas de Google).
# En cas de panne, il voit simplement ses dernières données.
if AMI and st.secrets.get("SCRIPT_URL") and "recolte_ouverture" not in st.session_state:
    st.session_state["recolte_ouverture"] = True
    reponse_recolte = demander_recolte(ouverture=1)
    if reponse_recolte.get("ok") and not reponse_recolte.get("frais"):
        oublier_fichiers()
if st.session_state.pop("memoriser", False):  # retenu sur ce téléphone (sans date d'expiration / 400 jours)
    streamlit_js_eval(js_expressions=f"localStorage.setItem('sante_ok','{JETON}'); document.cookie='sante_ok={JETON}; "
                      "max-age=34560000; path=/; SameSite=Lax; Secure'; 1", key="memo_ok")

if "message_maj" in st.session_state:
    st.toast(st.session_state.pop("message_maj"))
with st.container(key="outils", horizontal=True):
    if st.button("🔄", key="maj", help="Aller chercher tes dernières données maintenant"):
        actualiser()
    st.button("⚙️", key="cfg", help="Configuration", on_click=lambda: st.session_state.update(config=True))
st.markdown(NAV, unsafe_allow_html=True)
page_jeu, page_sante = st.container(key="page_jeu"), st.container(key="page_sante")

with page_sante:
    aujourd = dt.datetime.now(TZ).date()
    st.session_state.setdefault("ref", aujourd)
    periode = st.segmented_control("Période", PERIODES, default="Jour", key="periode",
                                   label_visibility="collapsed") or "Jour"
    fin_affichee = bornes(periode, st.session_state["ref"])[1]
    c1, c2, c3 = st.columns([1, 4, 1], vertical_alignment="center")
    c1.button("◀", on_click=decaler, args=(-1,), width="stretch", help="Période précédente")
    c2.date_input("Date", key="ref", max_value=aujourd, format="DD/MM/YYYY", label_visibility="collapsed")
    c3.button("▶", on_click=decaler, args=(1,), width="stretch", disabled=fin_affichee >= aujourd,
              help="Période suivante")

    recents = {f"data/jour/{x.year}/{x}.json" for x in (aujourd, aujourd - dt.timedelta(days=1))}
    recents |= {f"data/resume/{aujourd.year}.json", "data/profil.json",
                chemin_analyse("Jour", aujourd - dt.timedelta(days=1)), pokemon.FIGEES, pokemon.OUVERTES}
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

    anneaux(df, un_jour)
    if not AMI:  # le coach connaît le profil de Kiki et tourne sur son abonnement
        coach(donnees, lire_vite, aujourd)

    # ----- Activité -----
    rubrique("🏃", "Activité", BLEU)
    tuiles(["pas", "zone", "km", "etages", "denivele", "actives", "min_sport", "seances", "kcal", "kcal_act", "assis"],
           df, avant, un_jour, legende_avant, BLEU)
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
    rubrique("😴", "Sommeil", "#7E5BD8")
    if not tuiles(["sommeil", "profond", "paradoxal", "leger", "eveil", "coucher", "lever"], df, avant, un_jour,
                  legende_avant, "#B39DFF"):
        st.caption("Pas de sommeil enregistré pour cette période.")
    nuits = stats.loc[fin - dt.timedelta(days=6):fin] if un_jour else df  # un jour : la semaine pour comparer
    graphique_sommeil(regroupe(nuits, ["profond", "leger", "paradoxal", "eveil"], mensuel))

    # ----- Cœur -----
    rubrique("❤️", "Cœur et respiration", "#E0526B")
    tuiles(["fc_repos", "vfc", "fc_max", "resp", "spo2", "spo2_min"], df, avant, un_jour, legende_avant, "#FF7C93")
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
    rubrique("⚖️", "Poids et masse grasse", "#2FA88A")
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

with page_jeu:
    ecran_pokemon.afficher(lire_vite, aujourd, JOUEUR)


@st.dialog("⚙️ Configuration", width="large")
def configuration():
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
    if not AMI:
        amis = comptes() - {str(st.user.get("email", "")).lower()} if GOOGLE else set()
        if amis:
            st.markdown("**👥 Comptes des amis**")
            for email in sorted(amis):
                info = REGISTRE.get(id_ami(email))
                st.caption(f"{'✅ relié le ' + info['debut'] if info else '⏳ montre pas encore reliée'} · {email}")
    else:
        st.markdown("**⌚ Ma montre** : reliée depuis le " + JOUEUR["debut"].strftime("%d/%m/%Y"))
        with st.expander("Supprimer mes données"):
            st.caption("Coupe l'accès à Google Santé et retire tes données et ta partie de l'appli. Il en reste une trace "
                       "dans l'historique du dépôt privé de Kiki : demande-lui de l'effacer si tu le souhaites.")
            if st.checkbox("Oui, je veux tout supprimer", key="adieu") and st.button("Supprimer", type="primary"):
                try:
                    rep = requests.get(st.secrets["SCRIPT_URL"], timeout=90, params={
                        "quoi": "delier", "cle": st.secrets.get("SCRIPT_CLE", ""), "joueur": AMI}).json()
                except Exception as e:
                    rep = {"ok": False, "erreur": str(e)[:120]}
                if rep.get("ok"):
                    c = _cache()
                    for chemin in [k for k in c if k.startswith(PREFIXE) or k == JOUEURS]:
                        del c[chemin]
                    st.rerun()
                st.error(f"Suppression impossible : {rep.get('erreur', '?')}")
    if GOOGLE:
        st.caption(f"Connecté avec {st.user.get('email', '')}")
        st.button("🚪 Se déconnecter", on_click=st.logout)
    elif st.button("🔒 Ne plus mémoriser ce téléphone"):
        streamlit_js_eval(js_expressions="localStorage.removeItem('sante_ok'); "
                          "document.cookie='sante_ok=; max-age=0; path=/; SameSite=Lax; Secure'; 1", key="oubli_ok")
        st.session_state.clear()
        st.success("C'est oublié : le mot de passe sera redemandé à la prochaine ouverture.")


if st.session_state.pop("config", False):  # bouton ⚙️ en haut à droite
    configuration()
