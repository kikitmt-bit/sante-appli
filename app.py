"""Pokémon Sport : le jeu (Aventure, Pokédex, Dresseur) et les chiffres de santé. Toutes mes données Google Health (récoltées
par sante.gs dans la branche « data ») dans l'onglet Santé, filtrées par jour / 7 jours / semaine / mois / année, avec
l'analyse d'un coach (Claude)."""
import datetime as dt
import hashlib
import hmac
import json
import random
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

import base64
from pathlib import Path

import altair as alt
import pandas as pd
import requests
import streamlit as st
from streamlit_js_eval import streamlit_js_eval

import amis
import bilan
import ecran_calibrage
import ecran_pokemon
import pokemon
from pokedex import LEGENDAIRES, POIDS, POKEMON
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
@import url('https://fonts.googleapis.com/css2?family=Jersey+15&display=swap');
.block-container,[data-testid="stMainBlockContainer"]{padding-top:.6rem !important;max-width:760px}
header[data-testid="stHeader"],[data-testid="stToolbar"],[data-testid="stDecoration"],[data-testid="stStatusWidget"]{display:none !important}
.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:4px 0 8px}
.tile{position:relative;background:#1C2740;border-radius:14px;padding:9px 11px 8px;min-width:0;overflow:hidden}
.tile .l{font-size:.76rem;color:#9AA7C2;display:flex;justify-content:space-between;gap:4px;align-items:center}
.tile .v{font-size:1.32rem;font-weight:800;color:#EEF2FA;line-height:1.25}
.tile .s{font-size:.7rem;color:#9AA7C2;line-height:1.25}
.chip{flex:0 0 auto;font-size:.66rem;font-weight:800;border-radius:7px;padding:0 5px;line-height:1.5;background:#0D1322;color:#9AA7C2;white-space:nowrap}
.chip.bien{color:#4CD3A0}.chip.moins{color:#FF9E80}
.spark{display:flex;align-items:flex-end;gap:2px;height:24px;margin-top:6px}
.spark i{flex:1 1 0;min-width:1px;border-radius:2px 2px 0 0;background:color-mix(in srgb,var(--c) 42%,transparent)}
.spark i:last-child{background:var(--c)}
.spark i.vide{background:#0D1322;height:2px !important}
.bar{height:6px;background:#0D1322;border-radius:3px;margin-top:6px;overflow:hidden}
.bar div{height:100%;background:var(--c,#6B8CFF);border-radius:3px}
.bar div.ok{background:#4CD3A0}
.fresh{font-size:.8rem;color:#9AA7C2;margin:-4px 0 8px}
.sport{background:#1C2740;border-radius:12px;padding:8px 12px;margin:4px 0;font-size:.9rem}
.sport .s{color:#9AA7C2;font-size:.78rem}
h3{margin-top:1.4rem !important}
[class*="st-key-rub_"]{background:#141C31;border-radius:20px;padding:10px 12px 12px;margin-top:8px;gap:.5rem}
.rubrique{display:flex;align-items:center;gap:8px;font-size:1.18rem;font-weight:800;color:#EEF2FA;min-height:52px;padding-bottom:12px}
.rubrique img{width:60px;height:60px;margin:-6px -4px -6px -8px;image-rendering:pixelated;filter:drop-shadow(0 2px 2px rgba(0,0,0,.45))}
.chart-titre{font-size:.84rem;font-weight:700;color:#C9D3EA;margin:4px 0 2px}
.curieux{display:flex;align-items:center;gap:9px;background:#1C2740;border-radius:13px;padding:5px 11px;font-size:.82rem;line-height:1.3;color:#C9D3EA;margin:2px 0 6px}
.curieux img{flex:0 0 auto;height:38px;max-width:64px;object-fit:contain;image-rendering:pixelated}.curieux b{color:#EEF2FA}
.tile.une-tuile{grid-column:1/-1}.une-tuile .cases{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}.une-tuile .cases>div:last-child:nth-child(odd){grid-column:1/-1}
.pese{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:2px 4px;margin-top:8px;padding-top:6px;border-top:2px dashed #D8D8B8}
.pese span{display:inline-flex;align-items:center;color:#686850}.pese img{height:34px;max-width:52px;object-fit:contain;image-rendering:pixelated}
.nuit{background:linear-gradient(135deg,#232A58,#1A2240);border-radius:15px;padding:10px 12px;margin:2px 0 8px}
.nuit .horaires{display:flex;align-items:center;gap:7px;font-size:.86rem;font-weight:700;color:#EEF2FA}
.nuit .horaires img{width:24px;height:24px;image-rendering:pixelated}.nuit .horaires .tot{flex:1;text-align:center;font-size:1.36rem;font-weight:800}
.nuit .phases{display:flex;height:15px;border-radius:8px;overflow:hidden;margin:8px 0 7px;gap:1px}
.nuit .leg{display:grid;grid-template-columns:repeat(4,1fr);gap:3px;font-size:.7rem;color:#C9D3EA;line-height:1.2}
.nuit .leg i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:3px}.nuit .leg b{display:block;font-size:.86rem;color:#EEF2FA}
.pouls{display:flex;align-items:center;gap:12px;background:#1C2740;border-radius:14px;padding:8px 12px;margin:2px 0 8px}
.pouls .v{font-size:1.32rem;font-weight:800;color:#EEF2FA;line-height:1.2}.pouls .s{font-size:.72rem;color:#9AA7C2;line-height:1.3}
.st-key-periode button{padding:2px 8px !important;min-height:30px !important}.st-key-periode p{font-size:.82rem !important}
.st-key-periode [data-testid="stButtonGroup"],.st-key-periode div[role="radiogroup"]{flex-wrap:nowrap}
.statut{display:inline-block;font-size:.68rem;font-weight:800;letter-spacing:.5px;color:#fff;border-radius:5px;padding:1px 7px;margin-left:8px;vertical-align:2px;background:var(--c);box-shadow:0 2px 0 rgba(0,0,0,.35)}
.st-key-bloc_coach summary p::before{content:"";display:inline-block;width:26px;height:26px;margin:-6px 6px -6px 0;vertical-align:-3px;
  background:url(https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/64.gif) center/contain no-repeat;image-rendering:pixelated}
.bilan{background:#1C2740;border-radius:18px;padding:12px;margin:0 0 12px}
.bilan .tete{font-size:1.08rem;font-weight:800;color:#EEF2FA;line-height:1.2}.bilan .phrase{font-size:.84rem;color:#9AA7C2;margin:2px 0 0}
.bilan .obs{display:flex;gap:9px;align-items:center;margin-top:9px}
.bilan .obs img{flex:0 0 52px;width:52px;height:52px;object-fit:contain;image-rendering:pixelated}
.bilan .bulle{flex:1;min-width:0;position:relative;background:#141C31;border-radius:13px;padding:8px 11px;border:2px solid var(--c)}
.bilan .bulle:before{content:"";position:absolute;left:-9px;top:50%;margin-top:-6px;border:6px solid transparent;border-left:0;border-right:8px solid var(--c)}
.bilan .obs b{display:block;font-size:.95rem;line-height:1.25;color:#EEF2FA}
.bilan .obs p{margin:2px 0 0 !important;font-size:.84rem;line-height:1.35;color:#C9D3EA}
.bilan .obs .cs{margin-top:4px !important;color:#FFE27A}
.bilan .note{font-size:.7rem;color:#7C8AA8;margin-top:8px}
.combat{background:linear-gradient(180deg,#5FAE6E 0,#7CC47F 42%,#E6D9A5 42%,#D9C98F 100%);border-radius:18px;padding:10px;margin:6px 0 14px;box-shadow:inset 0 0 0 3px rgba(0,0,0,.18);font-family:'Jersey 15',Outfit,monospace}
.combat .rang{display:flex;align-items:center;gap:6px;margin-top:6px}.combat .rang:first-child{margin-top:0}
.combat .poke{position:relative;flex:0 0 66px;height:58px;display:flex;align-items:flex-end;justify-content:center}
.combat .poke:before{content:"";position:absolute;left:3px;right:3px;bottom:1px;height:15px;border-radius:50%;background:rgba(60,70,30,.42)}
.combat .poke img{position:relative;max-width:64px;max-height:56px;object-fit:contain;image-rendering:pixelated;margin-bottom:4px}
.combat .hud{flex:1;min-width:0;background:#F8F8E8;border:3px solid #484838;border-radius:10px 4px 10px 4px;box-shadow:3px 3px 0 rgba(40,40,30,.4);padding:3px 9px 4px;color:#383828}
.combat .l1{display:flex;justify-content:space-between;align-items:baseline;gap:6px;font-size:1.28rem;line-height:1}
.combat .l1 span{font-size:1.05rem;color:#585840;white-space:nowrap}
.combat .pv{display:flex;align-items:center;gap:4px;margin-top:3px;background:#484838;border-radius:7px;padding:2px 4px}
.combat .pv b{font-size:.82rem;font-weight:400;color:#F8C838;line-height:1}
.combat .pv div{flex:1;height:8px;border-radius:4px;background:#F0F0E0;overflow:hidden}
.combat .pv i{display:block;height:100%;border-radius:4px;background:var(--pv)}
.combat .val{text-align:right;font-size:1.28rem;line-height:1;margin-top:2px}
.combat .val small{font-size:.95rem;color:#686850}
.combat .gagne{color:#2F8F4E}
.prof-tete{display:flex;align-items:center;gap:11px}
.prof-portrait{flex:0 0 60px;width:60px;height:60px;border-radius:50%;border:3px solid #FFE27A;background-repeat:no-repeat;box-shadow:0 2px 8px rgba(0,0,0,.45)}
[data-testid="stExpander"] h4{font-size:1.05rem !important;padding:.6rem 0 .2rem !important}
[data-testid="stHorizontalBlock"]{flex-wrap:nowrap !important;gap:.5rem}
[data-testid="stColumn"]{min-width:0 !important}
</style>""", unsafe_allow_html=True)


# Haut de page : 5 onglets (Aventure, Muscu, Pokédex, Dresseur : le jeu ; Santé : les chiffres). Le conteneur « outils » : synchroniser
# en bas à gauche, ⚙️ caché. La barre est du simple HTML : les clics sont écoutés par le jeu
# (pokemon_ui.html, relierNav), sans recharger la page ; body.page-sante montre les chiffres au lieu du jeu. Les pages restent
# en place, repliées (height 0) plutôt que display:none : les graphiques gardent leur largeur et le jeu continue de tourner.
PIKACHU = base64.b64encode(Path(__file__).with_name("pikachu.png").read_bytes()).decode()
POKEDEX = base64.b64encode(b"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="1.5" width="18" height="21" rx="3" fill="#E8382F" stroke="#7A1712" stroke-width="1.5"/>
<circle cx="8" cy="6.5" r="2.8" fill="#6FD0FF" stroke="#fff" stroke-width="1.2"/><circle cx="13" cy="5" r="1" fill="#FFD84A"/><circle cx="16.3" cy="5" r="1" fill="#5BE07A"/>
<rect x="6" y="11" width="12" height="8.5" rx="1" fill="#BDEB9B" stroke="#7A1712"/></svg>""").decode()
LEVEINARD = f"{pokemon.IMAGES}/pokemon/versions/generation-iii/emerald/113.png"  # Leveinard, l'infirmier des Pokémon : la santé
# Le professeur de la région : il signe l'analyse. Son portrait vient de son labo (carré de son visage, en pixels de l'image de 940 px de large) ; une ligne par région ouverte.
PROFESSEUR = {"nom": "Professeur Chen", "image": "https://raw.githubusercontent.com/kikitmt-bit/sante-appli/main/scenes/labo-chen-vide.webp", "largeur": 940, "visage": (640, 530, 175)}
FIXE = pokemon.IMAGES + "/pokemon/versions/generation-iii/emerald/{}.png"  # les Pokémon des titres de rubrique : image fixe, sans cadre
ANIME = pokemon.IMAGES + "/pokemon/other/showdown/{}.gif"  # les Pokémon qui illustrent la page Santé (de Kanto : rien ne dévoile la suite)
st.markdown("""<style>
/* La direction artistique, la même que dans le jeu : une GBA moderne */
[data-testid="stApp"]{background:repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 2px,transparent 2px 6px),#22315A !important}
[data-testid="stApp"] *:not([data-testid="stIconMaterial"]):not([class*="material"]){font-family:'Jersey 15',Outfit,system-ui,sans-serif !important;font-size-adjust:.53;font-synthesis:none;font-weight:400 !important}
[role="dialog"] *:not([data-testid="stIconMaterial"]):not([class*="material"]){font-family:'Jersey 15',Outfit,system-ui,sans-serif !important;font-size-adjust:.53;font-synthesis:none;font-weight:400 !important;color:#383828}
[role="dialog"]{background:#F8F8E8 !important;border:3px solid #484838 !important;border-radius:12px 5px 12px 5px !important;box-shadow:3px 3px 0 rgba(10,15,35,.45) !important}
[role="dialog"] button{background:#fff !important;border:2px solid #484838 !important;color:#383828 !important}
[role="dialog"] button[aria-label="Close"]{background:none !important;border:0 !important}
[role="dialog"] button[aria-label="Close"] svg{fill:#383828}
[role="dialog"] hr{border-color:#C8C8A8 !important}
[role="dialog"] label[data-baseweb="checkbox"] > div:first-child{background:#A8A890 !important}
[role="dialog"] label[data-baseweb="checkbox"]:has(input:checked) > div:first-child{background:#D83830 !important}
.fresh{color:#D8E0F0 !important;font-size:.84rem !important;white-space:nowrap}
.nav-jeu{background:#141C38 !important;border-radius:10px !important}
.nav-jeu button{color:#C9D3EA !important;font-size:12.5px !important;line-height:1.1 !important;border-radius:8px 4px 8px 4px !important;border:2px solid transparent !important}
.nav-jeu button.on{background:#F8F8E8 !important;color:#383828 !important;border-color:#484838 !important;box-shadow:2px 2px 0 rgba(0,0,0,.4) !important}
.st-key-outils button,.st-key-page_sante [data-testid="stBaseButton-secondary"],.st-key-page_sante [data-testid="stDateInputField"],.st-key-page_sante [data-baseweb="input"],.st-key-periode button{
  background:#F8F8E8 !important;color:#383828 !important;border:2px solid #484838 !important;box-shadow:2px 2px 0 rgba(10,15,35,.45) !important;border-radius:8px 4px 8px 4px !important}
.st-key-page_sante [data-testid="stBaseButton-secondary"] p,.st-key-periode p,.st-key-page_sante input{color:#383828 !important;-webkit-text-fill-color:#383828}
.st-key-page_sante [data-testid="stDateInput"] *{color:#383828 !important;-webkit-text-fill-color:#383828;background:transparent !important}
.st-key-page_sante [data-testid="stDateInput"] [data-testid="stDateInputField"]{background:#F8F8E8 !important}
.st-key-periode button[aria-checked="true"],.st-key-periode button[kind*="Active"],.st-key-periode button[data-testid*="Active"]{background:#D83830 !important}
.st-key-periode button[aria-checked="true"] p,.st-key-periode button[kind*="Active"] p,.st-key-periode button[data-testid*="Active"] p{color:#fff !important}
.st-key-periode [data-testid="stButtonGroup"]{gap:4px !important}
.st-key-bloc_coach [data-testid="stExpander"],.st-key-bloc_coach details{background:#F8F8E8 !important;border:3px solid #484838 !important;border-radius:12px 5px 12px 5px !important;box-shadow:3px 3px 0 rgba(10,15,35,.45)}
.st-key-bloc_coach summary *,.st-key-bloc_coach [data-testid="stMarkdownContainer"] *{color:#383828 !important}
/* les boîtes */
.tile,.bilan,.nuit,.pouls,.curieux,div:has(> .vega-embed){background:#F8F8E8 !important;color:#383828 !important;border:3px solid #484838 !important;border-radius:12px 5px 12px 5px !important;box-shadow:3px 3px 0 rgba(10,15,35,.45) !important}
.tile .l,.tile .s,.curieux,.pouls .s,.bilan .phrase,.bilan .note{color:#686850 !important}
.tile .l{font-size:.86rem !important}.tile .s{font-size:.8rem !important}
.tile .v,.pouls .v,.bilan .tete,.curieux b{color:#383828 !important}
.tile .v{font-size:1.5rem !important}
.chip{background:#E8E8D0 !important;color:#686850 !important;font-size:.76rem !important;border-radius:5px !important}
.chip.bien{background:#D0F0D8 !important;color:#227040 !important}.chip.moins{background:#F8DCD0 !important;color:#B04020 !important}
.spark i{background:#C8C8A8 !important}.spark i:last-child{background:var(--c) !important}.spark i.vide{background:#E0E0C8 !important}
.bar{background:#484838 !important;height:12px !important;padding:2px;border-radius:6px !important}
.bar div{background:#48C868 !important;border-radius:4px !important}.bar div.ok{background:#F8C838 !important}
.bilan{padding:10px !important}
.bilan .bulle{background:#fff !important;border:2px solid #484838 !important;border-radius:8px 3px 8px 3px !important}
.bilan .bulle:before{display:none}
.bilan .obs b{color:#383828 !important;font-size:1.04rem !important}.bilan .obs p{color:#585840 !important;font-size:.94rem !important;line-height:1.25 !important}.bilan .obs .cs{color:#B05010 !important}
.statut{border-radius:4px !important;font-size:.76rem !important;box-shadow:1px 1px 0 rgba(0,0,0,.4) !important}
.prof-portrait{border-color:#484838 !important}
[class*="st-key-rub_"]{background:rgba(12,18,44,.55) !important;border:3px solid #484838 !important;border-radius:14px 6px 14px 6px !important}
.rubrique{color:#fff !important;font-size:1.32rem !important;text-shadow:2px 2px 0 #141C38}
.chart-titre{color:#fff !important;font-size:.95rem !important;text-shadow:1px 1px 0 #141C38}
.leg-sommeil{display:flex;justify-content:space-between;gap:8px;margin:0 2px 5px;color:#D8E0F0;font-size:.86rem;white-space:nowrap}
.leg-sommeil span{display:inline-flex;align-items:center;gap:4px}.leg-sommeil i{width:10px;height:10px;border-radius:2px;flex:0 0 10px}
div:has(> .vega-embed){padding:6px 4px 2px !important}
.vega-embed{width:100% !important}
.nuit{background:#232A58 !important;color:#fff}.nuit .horaires,.nuit .tot{color:#fff !important}.nuit .leg{color:#D8E0F0 !important;font-size:.82rem !important}.nuit .leg b{color:#fff !important;font-size:1rem !important}
.nuit .tot{font-size:1.6rem !important}
.pouls .v{font-size:1.5rem !important}.pouls .s{font-size:.84rem !important}
.curieux{font-size:.92rem !important}
.combat{background:rgba(12,18,44,.55) !important;border:3px solid #484838 !important;border-radius:14px 6px 14px 6px !important;box-shadow:none !important;padding:8px !important}
.combat .poke:before{display:none}
[data-testid="stCaptionContainer"] *{color:#D8E0F0 !important}
</style>""", unsafe_allow_html=True)
# Synchroniser (03/11, Kiki : ces boutons n'allaient pas en haut) : une petite boîte du jeu, toujours en bas à gauche, à portée de pouce ; elle tourne pendant le chargement.
# Le bouton ⚙️ reste dans la page mais caché : c'est « Paramètres », tout en bas de Dresseur, qui le touche (pokemon_ui.html).
SYNCHRO = urllib.parse.quote('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="#D83830" shape-rendering="crispEdges"><g id="a"><path d="M4 2h7v1h1v1h1v3h-2V5h-1V4H5v1H4v1H2V4h1V3h1z"/><path d="M9 7h6v1h-1v1h-1v1h-1V9h-1V8H9z"/></g><g transform="rotate(180 8 8)"><path d="M4 2h7v1h1v1h1v3h-2V5h-1V4H5v1H4v1H2V4h1V3h1z"/><path d="M9 7h6v1h-1v1h-1v1h-1V9h-1V8H9z"/></g></svg>')
st.markdown(f"""<style>
[data-testid="stMainBlockContainer"]{{position:relative;padding-bottom:70px !important}}
[data-testid="stLayoutWrapper"]:has(> .st-key-outils){{position:fixed;left:14px;bottom:14px;z-index:5;width:auto !important}}
[data-testid="stElementContainer"]:has(iframe[height="0"]),
[data-testid="stElementContainer"]:has(> [data-testid="stMarkdown"] style){{display:none !important}}
.st-key-cfg{{display:none !important}}
.st-key-maj button{{position:relative;width:46px;height:46px;min-height:46px;padding:0;border:3px solid #484838 !important;border-radius:12px 5px 12px 5px !important;box-shadow:3px 3px 0 rgba(10,15,35,.45) !important}}
.st-key-maj button p{{font-size:0}}
.st-key-maj button:before{{content:"";position:absolute;inset:5px;background:url("data:image/svg+xml,{SYNCHRO}") center/contain no-repeat}}
[data-test-script-state="running"] .st-key-maj button:before{{animation:synchro 1.2s steps(8) infinite}}
@keyframes synchro{{to{{transform:rotate(360deg)}}}}
.nav-jeu{{display:flex;gap:3px;background:#0A101D;border-radius:14px;padding:3px}}
.nav-jeu button{{flex:1 1 0;min-width:0;position:relative;display:flex;flex-direction:column;align-items:center;gap:1px;border:0;border-radius:11px;padding:4px 0 3px;
  background:none;color:#9AA7C2;font:700 11.5px Outfit,sans-serif;cursor:pointer}}
.nav-jeu button.on{{background:#1C2740;color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.14)}}
.nav-jeu img{{width:27px;height:27px;object-fit:contain;image-rendering:pixelated;display:block}}
.nav-jeu img.leveinard,.nav-jeu img.sprite{{transform:scale(1.25)}}
.nav-jeu .nb{{position:absolute;top:1px;right:calc(50% - 22px);min-width:15px;padding:0 3px;border-radius:8px;background:#E8382F;color:#fff;font-size:10px;line-height:15px}}
.nav-jeu .nb[hidden]{{display:none}}
body:not(.page-sante) [data-testid="stLayoutWrapper"]:has(> .st-key-page_sante),body.page-sante [data-testid="stLayoutWrapper"]:has(> .st-key-page_jeu){{height:0 !important;min-height:0;overflow:hidden;visibility:hidden;margin:0;flex:0 0 0 !important}}
</style>""", unsafe_allow_html=True)
NAV = f"""<div class="nav-jeu">
<button class="on" data-o="aventure"><img src="data:image/png;base64,{PIKACHU}" alt=""><span class="nb" hidden></span>Aventure</button>
<button data-o="muscu"><img class="sprite" src="{pokemon.IMAGES}/pokemon/versions/generation-iii/emerald/68.png" alt="">Muscu</button>
<button data-o="sante"><img class="leveinard" src="{LEVEINARD}" alt="">Santé</button>
<button data-o="dex"><img src="data:image/svg+xml;base64,{POKEDEX}" alt="">Pokédex</button>
<button data-o="dresseur"><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="">Dresseur</button></div>"""


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


def ecrire_depot(path, objet, message):
    """Écrit un petit fichier JSON dans la branche data (le jeton GitHub de l'appli a le droit d'écrire). -> réussi ?"""
    s = st.secrets
    url = f"https://api.github.com/repos/{s['GITHUB_REPO']}/contents/{path}"
    entetes = {"Authorization": f"Bearer {s['GITHUB_TOKEN']}", "Accept": "application/vnd.github+json"}
    branche = s.get("GITHUB_BRANCH", "data")
    try:
        r = requests.get(url, params={"ref": branche}, headers=entetes, timeout=20)
        sha = r.json().get("sha") if r.status_code == 200 else None
        corps = {"message": message, "branch": branche, "content": base64.b64encode(
            json.dumps(objet, ensure_ascii=False).encode()).decode()} | ({"sha": sha} if sha else {})
        ok = requests.put(url, json=corps, headers=entetes, timeout=30).status_code in (200, 201)
    except requests.RequestException:
        ok = False
    if ok:
        _cache()[path] = (time.time(), objet)
    return ok


def publier_dresseur(texte):
    """Le pseudo et les couleurs du dresseur de ce téléphone, pour que les autres joueurs le voient (une fois par visite,
    seulement s'ils ont changé ; jamais la date de naissance, la taille ni le sexe)."""
    d = amis.dresseur_du_telephone(texte)
    if not d or st.session_state.get("dresseur_publie") == d:
        return
    st.session_state["dresseur_publie"] = d
    chemin = amis.DRESSEURS.format(AMI or amis.KIKI)
    if lire_depot([chemin], {chemin})[chemin] != d:
        ecrire_depot(chemin, d, "dresseur")


def les_joueurs(aujourd):
    """Tous les joueurs (soi compris), résumés pour le jeu ; gardés 10 min. Un joueur en panne est simplement absent."""
    moi = AMI or amis.KIKI
    tous = amis.joueurs(REGISTRE)
    if len(tous) < 2:
        return []
    c, now = _cache(), time.time()
    dresseurs = lire_depot([amis.DRESSEURS.format(i) for i in tous], {amis.DRESSEURS.format(i) for i in tous})
    out = []
    for ident, debut in tous.items():
        cle = f"jeu-de:{ident}:{aujourd}"
        if cle not in c or now - c[cle][0] > 600:
            try:
                c[cle] = (now, amis.partie(lire_depot, ident, debut, aujourd))
            except Exception:  # noqa: BLE001 : un ami en panne ne gêne jamais les autres
                c[cle] = (now, None)
        if c[cle][1]:
            out.append(amis.public(ident, dresseurs.get(amis.DRESSEURS.format(ident)), c[cle][1], ident == moi))
    return out


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


def rubrique(num, titre, couleur=None):
    """Le titre d'une rubrique, illustré par un Pokémon (num)."""
    st.markdown(f'<div class="rubrique"><img src="{FIXE.format(num)}" alt="">{titre}</div>', unsafe_allow_html=True)


def ecran_combat(df, un_jour):
    """Les 3 objectifs de la journée, à la façon d'un écran de combat Pokémon : ta barre de PV se remplit vers l'objectif. Vert à partir
    de la moitié, jaune avant, rouge au début, comme dans les jeux. Doduo court, Ponyta est un cheval de feu, Ronflex dort."""
    html = []
    for cle, num, nom in (("pas", 84, "PAS"), ("zone_sport", 77, "SPORT"), ("sommeil", 143, "SOMMEIL")):
        v, obj = par_jour(df, cle), OBJECTIFS.get(cle)
        v = 0 if v is None or v != v else v
        pct = min(v / obj * 100, 100) if obj else 0
        pv = "#48C868" if pct >= 50 else "#F8C838" if pct >= 20 else "#E85038"
        fait = v >= obj
        html.append(f'<div class="rang"><div class="poke"><img src="{ANIME.format(num)}" alt=""></div><div class="hud"><div class="l1">{nom}<span>{"moyenne / jour" if not un_jour else "objectif atteint !" if fait else ""}</span></div>'
                    f'<div class="pv"><b>PV</b><div><i style="width:{pct:.0f}%;--pv:{pv}"></i></div></div>'
                    f'<div class="val {"gagne" if fait else ""}">{joli(cle, v) if v else "0"}<small> / {joli(cle, obj)}</small></div></div></div>')
    st.markdown(f'<div class="combat">{"".join(html)}</div>', unsafe_allow_html=True)


def carte_bilan(b):
    """Le bilan du jour ou de la période : calculé ici, sans IA (bilan.py)."""
    if not b:
        return
    couleurs = {"bon": "#4CD3A0", "neutre": "#6B8CFF", "alerte": "#FF9E80"}
    tons = {c["ton"] for c in b["cartes"]}
    # un statut à la façon des combats Pokémon, en un mot
    nom_statut, coul = ("À MÉNAGER", "#E0526B") if "alerte" in tons else ("EN FORME", "#2FA88A") if tons == {"bon"} else ("CORRECT", "#5A7BE8")
    statut = f'<span class="statut" style="--c:{coul}">{nom_statut}</span>' if tons else ""
    obs = "".join(f'<div class="obs" style="--c:{couleurs[c["ton"]]}"><img src="{ANIME.format(c["num"])}" alt="{c["qui"]}"><div class="bulle"><b>{c["titre"]}</b><p>{c["texte"]}</p>'
                  + (f'<p class="cs">{c["conseil"]}</p>' if c.get("conseil") else "") + "</div></div>" for c in b["cartes"])
    x, y, cote = PROFESSEUR["visage"]
    k = 54 / cote  # le visage dans le médaillon
    portrait = (f'<div class="prof-portrait" style="background-image:url({PROFESSEUR["image"]});background-size:{PROFESSEUR["largeur"] * k:.0f}px auto;'
                f'background-position:-{x * k:.0f}px -{y * k:.0f}px"></div>')
    st.markdown(f'<div class="bilan"><div class="prof-tete">{portrait}<div><div class="tete">{b["titre"]} du {PROFESSEUR["nom"]}{statut}</div><div class="phrase">{b["phrase"]}</div></div></div>{obs}'
                '<div class="note">Calculé sur tes données : des repères utiles, pas un avis médical.</div></div>', unsafe_allow_html=True)


# Le sens d'une évolution : plus = mieux (1), moins = mieux (-1), ni l'un ni l'autre (0)
SENS = {"pas": 1, "zone_sport": 1, "zone": 1, "km": 1, "etages": 1, "denivele": 1, "actives": 1, "min_sport": 1, "seances": 1, "kcal_act": 1, "assis": -1, "sommeil": 1,
        "profond": 1, "paradoxal": 1, "eveil": -1, "fc_repos": -1, "vfc": 1, "spo2": 1, "spo2_min": 1}


def mini_courbe(valeurs, couleur, depuis_zero=True):
    """De petites barres : les derniers jours d'un coup d'œil, le dernier en plein."""
    v = pd.to_numeric(valeurs, errors="coerce").tail(21)
    if v.notna().sum() < 3:
        return ""
    bas = 0 if depuis_zero else v.min() - (v.max() - v.min()) * .35
    haut = v.max() - bas or 1
    barres = "".join('<i class="vide"></i>' if pd.isna(x) else f'<i style="height:{max((x - bas) / haut * 100, 7):.0f}%"></i>' for x in v)
    return f'<div class="spark" style="--c:{couleur}">{barres}</div>'


def tuiles(cles, df, avant, un_jour, legende_avant, couleur=BLEU, histoire=None):
    """Les chiffres : la valeur, sa tendance en couleur, et une mini-courbe des derniers jours (histoire : tout le passé)."""
    html = []
    for cle in cles:
        v = agrege(df, cle)
        if v is None or (cle in ("seances", "min_sport") and not v):
            continue
        nom, agg, fmt = METRIQUES[cle]
        sous, barre, puce = "", "", ""
        if not un_jour and agg == "total" and cle != "seances":
            sous = f"moy. {joli(cle, v / len(df))} / jour"
        elif not un_jour and agg == "moyenne":
            sous = "moyenne"
        elif agg == "dernier":
            sous = "dernière pesée"
        a, p = par_jour(avant, cle), par_jour(df, cle)
        if a and p is not None and not (un_jour and df.index[-1] == dt.datetime.now(TZ).date()) and fmt != "h":
            ecart = (p - a) / a * 100
            if abs(ecart) >= 1:
                sens = SENS.get(cle, 0) * (1 if ecart > 0 else -1)
                puce = f'<span class="chip {"bien" if sens > 0 else "moins" if sens < 0 else ""}" title="par rapport à : {legende_avant}">{"▲" if ecart > 0 else "▼"} {abs(ecart):.0f} %</span>'
        obj = OBJECTIFS.get(cle)
        if obj and un_jour:
            pct = min(v / obj * 100, 100)
            barre = f'<div class="bar"><div class="{"ok" if pct >= 100 else ""}" style="width:{pct:.0f}%;--c:{couleur}"></div></div>'
            sous = f"objectif {joli(cle, obj)}" + (f" · {sous}" if sous else "")
        elif obj and agg == "total":
            col = pd.to_numeric(df[cle], errors="coerce")
            sous += f" · objectif {(col >= obj).sum()} j / {len(df)}"
        serie = histoire if un_jour and histoire is not None else df
        courbe = "" if barre or cle not in serie else mini_courbe(serie[cle], couleur, fmt in ("n", "min", "km", "m"))
        html.append(f'<div class="tile"><div class="l"><span>{nom}</span>{puce}</div><div class="v">{joli(cle, v)}</div>'
                    f'<div class="s">{sous}</div>{barre}{courbe}</div>')
    if html:
        st.markdown(f'<div class="tiles">{"".join(html)}</div>', unsafe_allow_html=True)
    return bool(html)


def carte_nuit(ligne):
    """La nuit d'un seul coup d'œil : du coucher au lever, et ses phases (Pierre Lune, Pierre Soleil : objets du jeu)."""
    total = ligne.get("sommeil")
    if total is None or pd.isna(total):
        return False
    noms = (("profond", "Profond"), ("leger", "Léger"), ("paradoxal", "Paradoxal"), ("eveil", "Éveil"))
    v = {c: float(ligne[c]) for c, _ in noms if c in ligne and pd.notna(ligne[c]) and ligne[c] > 0}
    somme = sum(v.values()) or 1
    bande = "".join(f'<i style="flex:{v[c] / somme:.3f};background:{COULEURS_PHASES[n]}"></i>' for c, n in noms if c in v)
    leg = "".join(f'<div><i style="background:{COULEURS_PHASES[n]}"></i>{n}<b>{hm(v[c])}</b></div>' for c, n in noms if c in v)
    img = pokemon.IMAGES + "/items/{}.png"
    st.markdown(f'<div class="nuit"><div class="horaires"><img src="{img.format("moon-stone")}" alt="">{joli("coucher", ligne.get("coucher"))}'
                f'<span class="tot">{hm(total)}</span>{joli("lever", ligne.get("lever"))}<img src="{img.format("sun-stone")}" alt=""></div>'
                f'{f"""<div class="phases">{bande}</div><div class="leg">{leg}</div>""" if v else ""}</div>', unsafe_allow_html=True)
    return True


def carte_pouls(bpm):
    """Le cœur au repos et son repère."""
    if bpm is None or pd.isna(bpm) or bpm <= 0:
        return
    st.markdown(f'<div class="pouls"><div><div class="v">{bpm:.0f} bpm au repos</div>'
                f'<div class="s">Chez un adulte, le repère va de 60 à 100, et plus bas chez les sportifs.</div></div></div>', unsafe_allow_html=True)


def curiosite_denivele(metres):
    """Une comparaison pour le plaisir, sur de vrais chiffres (Onix mesure 8,8 m dans le Pokédex)."""
    if metres is None or pd.isna(metres) or metres < 9:
        return
    st.markdown(f'<div class="curieux"><img src="{ANIME.format(95)}" alt=""><span><b>{nombre(metres)} m de dénivelé</b> : autant que <b>{nombre(metres / 8.8, 1)} Onix</b> dressés bout à bout.</span></div>', unsafe_allow_html=True)


def poids_en_pokemon(kg, jour):
    """Ton poids en Pokémon (poids officiels du Pokédex), une combinaison différente à chaque pesée."""
    rng = random.Random(str(jour))
    candidats = [(n, w) for n, w in POIDS.items() if 1 <= w <= kg and n in POKEMON and n not in LEGENDAIRES]
    for _ in range(400):
        reste, choix = kg, {}
        for _ in range(3):
            pool = [c for c in candidats if c[1] <= reste * 1.01 and c[0] not in choix]
            if not pool:
                break
            n, w = rng.choice(pool)
            nb = rng.randint(1, min(3, max(int(reste // w), 1)))
            choix[n] = nb
            reste -= nb * w
        if abs(reste) <= kg * .015 and 2 <= sum(choix.values()) <= 5:
            return "<span> + </span>".join(f'<span>{f"{nb} × " if nb > 1 else ""}<img src="{ANIME.format(n)}" alt="{POKEMON[n]["nom"]}" title="{POKEMON[n]["nom"]}"></span>' for n, nb in choix.items())
    return None


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


def _style(ch, hauteur):
    """Le même habillage partout : pas de cadre, juste de quoi lire, dans les couleurs de l'appli."""
    return (ch.properties(height=hauteur, background="transparent", padding={"left": 8, "right": 6, "top": 6, "bottom": 2}).configure_view(stroke=None)
            .configure_axis(grid=False, domain=False, ticks=False, labelColor="#585840", labelFontSize=13, labelFont="Jersey 15", titleColor="#585840")
            .configure_axisY(grid=True, gridColor="#D8D8C0", gridDash=[2, 4], labelPadding=4, minExtent=30))


def graphique(d, cle, titre, type_="barre", diviseur=1, objectif=None, couleur=BLEU, hauteur=170, reperes=5):
    if cle not in d or d[cle].notna().sum() == 0:
        return
    data = pd.DataFrame({"x": d.index, "y": d[cle] / diviseur})
    etiquettes = {"values": list(d.index[::-(-len(d) // reperes)])} if len(d) > reperes else {}  # quelques repères seulement : ils ne se chevauchent jamais
    x = alt.X("x:N", sort=None, title=None, axis=alt.Axis(labelAngle=0, labelOverlap="greedy", **etiquettes))
    valeurs = data["y"].dropna()
    marge = max((valeurs.max() - valeurs.min()) * .25, abs(valeurs.max()) * .01, .5)  # une courbe se lit sur ses variations, pas depuis zéro
    echelle = alt.Scale(zero=True) if type_ == "barre" else alt.Scale(zero=False, nice=False, domain=[float(valeurs.min() - marge), float(valeurs.max() + marge)])
    y = alt.Y("y:Q", title=None, scale=echelle, axis=alt.Axis(tickCount=4))
    tip = [alt.Tooltip("x:N", title=" "), alt.Tooltip("y:Q", title=titre, format=",.1f")]
    if type_ == "barre":
        ch = alt.Chart(data).mark_bar(color=couleur, cornerRadiusTopLeft=4, cornerRadiusTopRight=4).encode(x, y, tooltip=tip)
    else:  # une courbe douce avec un voile de couleur dessous
        degrade = alt.Gradient(gradient="linear", x1=1, x2=1, y1=1, y2=0, stops=[alt.GradientStop(color=couleur + "00", offset=0), alt.GradientStop(color=couleur + "66", offset=1)])
        ch = alt.Chart(data.dropna()).mark_area(line={"color": couleur, "strokeWidth": 2}, color=degrade, interpolate="monotone", clip=True).encode(x, y, y2=alt.value(hauteur), tooltip=tip)
        if len(data.dropna()) <= 31:
            ch += alt.Chart(data.dropna()).mark_circle(color=couleur, size=26, opacity=.9).encode(x, y, tooltip=tip)
    if objectif:
        ch += alt.Chart(pd.DataFrame({"y": [objectif / diviseur]})).mark_rule(color="#2F8F4E", strokeDash=[4, 4]).encode(y="y:Q")
    st.markdown(f'<div class="chart-titre">{titre}</div>', unsafe_allow_html=True)
    st.altair_chart(_style(ch, hauteur), width="stretch")


def graphique_sommeil(d):
    cols = {"profond": "Profond", "leger": "Léger", "paradoxal": "Paradoxal", "eveil": "Éveil"}
    if not any(c in d and d[c].notna().any() for c in cols):
        return
    data = d[[c for c in cols if c in d]].rename(columns=cols).div(60).reset_index(names="x")
    data = data.melt("x", var_name="Phase", value_name="h").dropna()
    ch = alt.Chart(data).mark_bar(cornerRadius=2).encode(
        alt.X("x:N", sort=None, title=None, axis=alt.Axis(labelAngle=0, labelOverlap="greedy")),
        alt.Y("h:Q", title=None, stack=True, axis=alt.Axis(tickCount=4)),
        alt.Color("Phase:N", scale=alt.Scale(domain=list(COULEURS_PHASES), range=list(COULEURS_PHASES.values())),
                  legend=None),
        order=alt.Order("ordre:Q"), tooltip=["x:N", "Phase:N", alt.Tooltip("h:Q", format=".1f", title="heures")],
    ).transform_calculate(ordre=f"indexof({list(COULEURS_PHASES)}, datum.Phase)")
    legende = "".join(f'<span><i style="background:{c}"></i>{n}</span>' for n, c in COULEURS_PHASES.items())
    st.markdown(f'<div class="chart-titre">Sommeil par nuit (heures)</div><div class="leg-sommeil">{legende}</div>', unsafe_allow_html=True)
    st.altair_chart(_style(ch, 160), width="stretch")


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
    with c1, st.container(key="bloc_coach"), st.expander(titre):
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
    st.iframe(f"""<style>body{{margin:0;background:transparent}}
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
                "- **Tes chiffres ne sont visibles que par toi** dans l'appli, jamais par les autres joueurs. Eux voient "
                "seulement le jeu : ton pseudo, ton dresseur sur la carte, ton lieu, tes badges, ton Pokédex et tes belles captures.\n"
                "- **Bon à savoir :** ils sont rangés dans le dépôt privé de Kiki, qui gère l'appli et peut donc y accéder.\n"
                "- **Date de naissance, taille et sexe** (facultatifs) : ils restent sur ton téléphone. Le jour de ton anniversaire, seule la trace de ton cadeau est enregistrée.\n"
                "- **Tu peux tout arrêter** quand tu veux : Dresseur → Paramètres → Supprimer mes données.")
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
    synchroniser = st.button("Synchroniser", key="maj", help="Aller chercher tes dernières données maintenant")
    st.button("⚙️", key="cfg", help="Configuration", on_click=lambda: st.session_state.update(config=True))
if synchroniser:  # hors du conteneur : son message d'attente ne s'écrit pas dans le petit bouton
    actualiser()
st.markdown(NAV, unsafe_allow_html=True)
# L'âge et la taille restent sur le téléphone (carte du dresseur) : relus à l'ouverture, pour le calcul, jamais enregistrés ici
CARTE_TEL = streamlit_js_eval(js_expressions="localStorage.getItem('pkm_dresseur') || ''", key="profil_dresseur")
PROFIL = bilan.lire_profil(CARTE_TEL, dt.datetime.now(TZ).date())
if CARTE_TEL is not None:
    publier_dresseur(CARTE_TEL)
if not AMI:  # L'apprentissage du téléphone (entraînement) : ses mesures, rangées dans le dépôt privé pour régler la détection
    MESURES_TEL = streamlit_js_eval(js_expressions="localStorage.getItem('pkm_appr') || ''", key="appr_lire")
    if MESURES_TEL and st.session_state.get("appr_envoye") != MESURES_TEL[:200]:
        try:
            ok = all(ecrire_depot(f"data/calibrage/mouvements/{m['type']}-{str(m['quand'])[:19].replace(':', '-')}.json", m, "mesures de l'apprentissage") for m in json.loads(MESURES_TEL))
        except (ValueError, KeyError, TypeError):
            ok = False
        if ok:
            st.session_state["appr_envoye"] = MESURES_TEL[:200]
            streamlit_js_eval(js_expressions="localStorage.removeItem('pkm_appr')", key="appr_effacer")
            st.toast("✅ Mesures envoyées à Claude, merci !")
        else:
            st.toast("⚠️ Mesures pas envoyées : elles restent sur ton téléphone, recharge l'appli pour réessayer.")
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
    st.markdown(f'<div class="fresh">⌚ Dernière mesure{" aujourd" + chr(39) + "hui" if fin == debut else ""} : {max(heures)[:5] if heures else "aucune"}'
                f' · {debut:%d/%m}{f" → {fin:%d/%m}" if fin != debut else ""}</div>', unsafe_allow_html=True)

    histoire = stats.loc[fin - dt.timedelta(days=20):fin]  # les 3 dernières semaines, pour les mini-courbes de la vue Jour
    ecran_combat(df, un_jour)
    jour_bilan = aujourd - dt.timedelta(days=1) if un_jour and fin == aujourd else fin
    fichier_bilan = f"data/jour/{jour_bilan.year}/{jour_bilan}.json"
    carte_bilan(bilan.analyser(stats, periode, debut, fin, aujourd, lire_vite([fichier_bilan])[fichier_bilan] if un_jour else None, PROFIL))
    # Le coach Claude, volet et bouton 📋, est retiré de l'écran pour l'instant (Kiki, 02/11) : coach() reste prête, pour Kiki seul (if not AMI)

    # ----- Activité -----
    with st.container(key="rub_activite"):
        rubrique(128, "Activité", BLEU)  # Tauros, toujours lancé
        tuiles(["pas", "zone_sport", "km", "etages", "denivele", "actives", "zone", "min_sport", "seances", "kcal", "kcal_act", "assis"],
               df, avant, un_jour, legende_avant, BLEU, histoire)
        curiosite_denivele(agrege(df, "denivele"))
        if un_jour:
            pas = table(j_ref.get("steps"))
            col = next((c for c in ("countSum", "count") if c in pas), None)
            if col:
                if col == "count" and (pas["secondes"] == 60).any():  # ancienne liste brute : la série par minute seulement
                    pas = pas[pas["secondes"] == 60]
                h = pd.to_numeric(pas[col], errors="coerce").groupby(pas["heure"].str[:2] + "h").sum()
                graphique(pd.DataFrame({"pas": h}), "pas", "Pas par heure")
        else:
            d = regroupe(df, ["pas", "zone_sport"], mensuel)
            graphique(d, "pas", "Pas par jour" + (" (moyenne par mois)" if mensuel else ""),
                      objectif=OBJECTIFS["pas"])
            graphique(d, "zone_sport", "Minutes de sport par jour" + (" (moyenne par mois)" if mensuel else ""),
                      objectif=OBJECTIFS["zone_sport"], couleur="#FF9E80", hauteur=140)

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
    with st.container(key="rub_sommeil"):
        rubrique(39, "Sommeil", "#7E5BD8")  # Rondoudou et sa berceuse
        # un seul jour : la carte de la nuit ; une période : les moyennes
        nuit_vue = un_jour and carte_nuit(df.iloc[-1].to_dict())
        if not nuit_vue and not tuiles(["sommeil", "profond", "paradoxal", "leger", "eveil", "coucher", "lever"], df, avant, un_jour,
                                       legende_avant, "#B39DFF", histoire):
            st.caption("Pas de sommeil enregistré pour cette période.")
        nuits = stats.loc[fin - dt.timedelta(days=6):fin] if un_jour else df  # un jour : la semaine pour comparer
        graphique_sommeil(regroupe(nuits, ["profond", "leger", "paradoxal", "eveil"], mensuel))

    # ----- Cœur -----
    with st.container(key="rub_coeur"):
        rubrique(113, "Cœur et respiration", "#E0526B")  # Leveinard, l'infirmier
        carte_pouls(par_jour(df, "fc_repos"))
        tuiles(["fc_repos", "vfc", "fc_max", "resp", "spo2", "spo2_min"], df, avant, un_jour, legende_avant, "#FF7C93", histoire)
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
    with st.container(key="rub_poids"):
        rubrique(76, "Poids et masse grasse", "#2FA88A")  # Grolem, 300 kg
        pesees = donnees["pesees"]
        if pesees.empty:
            st.caption("Aucune pesée ces 3 derniers mois.")
        else:
            der = pesees.index[-1]
            gras7 = pesees["gras"].dropna().tail(7).mean()
            en_pokemon = poids_en_pokemon(pesees["poids"].dropna().iloc[-1], der)
            cases = [("Poids", joli("poids", pesees["poids"].dropna().iloc[-1]), f"pesée du {der:%d/%m}")]
            rep = bilan.repere_gras(PROFIL["age"], PROFIL["sexe"])
            repere_gras = f" · repère {rep[0]} à {rep[1]} %" if rep else ""
            if pesees["gras"].notna().any():
                cases.append(("Masse grasse", joli("gras", pesees["gras"].dropna().iloc[-1]), f"7 dernières pesées : {nombre(gras7, 1)} %{repere_gras}"))
            i = bilan.imc(pesees["poids"].dropna().iloc[-1], PROFIL["taille"])
            if i:
                cases.append(("IMC", nombre(i, 1), "repère 18,5 à 25, ne distingue pas le muscle du gras"))
            p_debut = pesees.loc[debut:, "poids"].dropna()
            if len(p_debut) >= 2:
                cases.append(("Évolution sur la période", f'{"+" if p_debut.iloc[-1] > p_debut.iloc[0] else ""}{nombre(p_debut.iloc[-1] - p_debut.iloc[0], 1)} kg', f"{len(p_debut)} pesées"))
            grille = "".join(f'<div><div class="l">{l}</div><div class="v">{v}</div><div class="s">{t}</div></div>' for l, v, t in cases)
            soit = f'<div class="pese">{en_pokemon}</div>' if en_pokemon else ""
            st.markdown(f'<div class="tiles"><div class="tile une-tuile"><div class="cases">{grille}</div>{soit}</div></div>', unsafe_allow_html=True)
            courbe = pesees.loc[(debut if len(jours) >= 30 else donnees["debut_tout"]):]
            if len(courbe) >= 2:
                meme_annee = courbe.index[0].year == courbe.index[-1].year
                courbe.index = [x.strftime("%d/%m" if meme_annee else "%d/%m/%y") for x in courbe.index]
                g1, g2 = st.columns(2)
                with g1:
                    graphique(courbe, "poids", "Poids (kg)", type_="ligne", hauteur=150, reperes=2)
                with g2:
                    graphique(courbe, "gras", "Masse grasse (%)", type_="ligne", couleur="#FF9E80", hauteur=150, reperes=2)

with page_jeu:
    ecran_pokemon.afficher(lire_vite, aujourd, JOUEUR, bilan.conseil_du_jour(charger(lire_vite, "Jour", aujourd, aujourd)["stats"], aujourd, PROFIL), PROFIL["anniversaire"],
                           les_joueurs(aujourd))


def suivi_amis(emails):
    """Pour Kiki : chaque ami relié, ce que Google a vraiment donné (14 derniers jours) ; rien n'est enregistré."""
    st.caption("Pour vérifier que tout marche et calibrer le jeu. Tes amis savent que tu as accès à leurs données "
               "(écrit sur leur page d'accueil) ; eux ne voient jamais celles des autres.")
    aujourd = dt.datetime.now(TZ).date()
    for email in emails:
        ident = id_ami(email)
        d = (lire_depot([amis.DRESSEURS.format(ident)])[amis.DRESSEURS.format(ident)] or {}).get("nom") or "pseudo pas encore choisi"
        with st.expander(f"{d} · {email}"):
            try:
                s = amis.suivi(lire_depot, ident, dt.date.fromisoformat(REGISTRE[ident]["debut"]), aujourd)
            except Exception as e:  # noqa: BLE001
                st.error(f"Lecture impossible : {str(e)[:150]}")
                continue
            if s["derniere"]:
                quand = dt.datetime.fromisoformat(s["derniere"].replace("Z", "+00:00")).astimezone(TZ)
                st.markdown(f"Dernière récolte : **{quand:%d/%m à %H:%M}**")
            else:
                st.markdown("Dernière récolte : **aucune**")
            for msg, types in s["erreurs"].items():
                aide = (" → ce compte Google n'est pas configuré dans l'appli **Google Santé** (ou ce n'est pas celui de sa montre)"
                        if "not linked" in msg.lower() else "")
                st.warning(f"Google refuse {len(types)} type(s) : « {msg} »{aide}")
            jours = pd.DataFrame([{"Jour": f"{JOURS[j['jour'].weekday()]} {j['jour']:%d/%m}", "Pas": j["pas"],
                                   "Min de sport": j["zone_sport"], "Sommeil": hm(j["sommeil"]) if j["sommeil"] else None,
                                   "Types reçus": j["types"]} for j in s["jours"]])
            st.dataframe(jours, hide_index=True, width="stretch")


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
        copains = comptes() - {str(st.user.get("email", "")).lower()} if GOOGLE else set()
        if copains:
            st.markdown("**👥 Comptes des amis**")
            for email in sorted(copains):
                info = REGISTRE.get(id_ami(email))
                st.caption(f"{'✅ relié le ' + info['debut'] if info else '⏳ montre pas encore reliée'} · {email}")
            if any(id_ami(e) in REGISTRE for e in copains) and st.toggle("🔧 Suivi des amis (récolte, erreurs de Google)", key="suivi"):
                suivi_amis(sorted(e for e in copains if id_ami(e) in REGISTRE))
        if st.toggle("📊 Calibrage du jeu (objectifs réussis, par qui, comment)", key="calibrage"):
            ecran_calibrage.afficher(lire_depot, REGISTRE, dt.datetime.now(TZ).date(), graphique, ecrire_depot)
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


if st.session_state.pop("config", False):  # « Paramètres », en bas de Dresseur
    configuration()
