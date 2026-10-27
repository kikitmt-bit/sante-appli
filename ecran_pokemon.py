"""Onglet 🎮 Pokémon : barre d'effort, Poké Balls à ouvrir (animation 3D, plein écran), voyage dans Kanto (carte,
arènes), balls spéciales du jour, dernières captures et Pokédex. Les images viennent directement du dépôt public
PokeAPI/sprites (pokemon.IMAGES). Tout l'écran est un seul composant HTML (pokemon_ui.html) : c'est lui qui sait quelles
Poké Balls ont été ouvertes (localStorage du téléphone + liste partagée avec la montre, data/pokemon/ouvertes.json, écrite
par le script Google : secrets SCRIPT_URL et JEU_CLE), donc ce qui apparaît déjà dans le Pokédex."""
import datetime as dt
import json
from pathlib import Path

import streamlit.components.v1 as components
import streamlit as st

import chiffres
import pokemon
from pokedex import COULEURS_TYPES, LEGENDAIRES, POKEMON

UI = Path(__file__).with_name("pokemon_ui.html")


def _js(objet):
    return json.dumps(objet, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def _conseils():
    """Type -> activités qui le favorisent (pour « Où le trouver » dans le Pokédex)."""
    conseils = {}
    for ic, nom, types in [*pokemon.SOURCES.values(), *pokemon.SPORTS.values(), pokemon.MUSCU]:
        for t in types or ():
            if f"{ic} {nom}" not in conseils.setdefault(t, []):
                conseils[t].append(f"{ic} {nom}")
    return conseils


def afficher(lire, aujourd):
    with st.spinner("Ouverture du Pokédex…"):
        captures, etat = pokemon.charger_jeu(lire, aujourd)
        f = lire([pokemon.OUVERTES])

    m, R = etat["mesures"], pokemon.REGLAGES
    ic, nom, types = etat["origine"]
    sport_ic, sport_nom, _ = pokemon.sport_principal(m)
    sources = [("👟", "Pas", m["points"]["pas"]), ("🔥", "Minutes en zone", m["points"]["zone"]),
               ("🪜", "Étages", m["points"]["etages"]), (sport_ic, f"Séances ({sport_nom})", m["points"]["sport"])]
    donnees = {
        "aujourdhui": str(aujourd),
        "ouvertes": list((f[pokemon.OUVERTES] or {}).get("ouvertes", {})),
        "jeu": {"url": st.secrets["SCRIPT_URL"], "cle": st.secrets["JEU_CLE"]}
               if st.secrets.get("SCRIPT_URL") and st.secrets.get("JEU_CLE") else None,
        "captures": [{
            "id": c["id"], "jour": c["jour"], "num": c["num"], "ball": c.get("ball", "poke"),
            "shiny": c["shiny"], "raison": c["raison"], "lieu": c.get("lieu", ""), "legendaire": c["num"] in LEGENDAIRES,
            "quand": "aujourd'hui" if c["jour"] == str(aujourd) else
                     f"{chiffres.JOURS[dt.date.fromisoformat(c['jour']).weekday()]} {c['jour'][8:]}/{c['jour'][5:7]}",
        } for c in captures],
        "images": pokemon.IMAGES,
        "dex": [[n, p["nom"], p["types"]] for n, p in POKEMON.items()],
        "voyage": etat["voyage"],
        "carte": f"https://raw.githubusercontent.com/kikitmt-bit/sante-appli/main/{etat['voyage']['carte']['image']}",
        "scenes": "https://raw.githubusercontent.com/kikitmt-bit/sante-appli/main/scenes/",
        "legendaires": LEGENDAIRES,
        "couleurs": COULEURS_TYPES,
        "conseils": _conseils(),
        "barre": {"points": round(etat["barre"], 1), "taille": R["barre"],
                  "sources": [[i, n, round(v)] for i, n, v in sources if v >= 0.5],
                  "origine": [ic, nom, types or []], "pas_offerts": R["pas_offerts"]},
        "jour": {"pas": m["pas"], "zone": m["zone"], "seance": m["seance_max"], "sommeil": m["sommeil"],
                 "serie": etat["serie"], "serie_ok": etat["serie_ok"], "fenetre": etat["fenetre"],
                 "shiny_bonus": etat["shiny_bonus"]},
        "regles": {k: R[k] for k in ("objectif_pas", "objectif_zone", "exploit_pas", "exploit_zone", "exploit_seance",
                                     "master_jours", "master_fenetre", "nuit", "seance_min", "force")},
    }
    components.html(UI.read_text(encoding="utf-8").replace("__DONNEES__", _js(donnees)), height=900)
