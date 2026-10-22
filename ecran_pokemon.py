"""Onglet 🎮 Pokémon : barre d'effort, Poké Balls à ouvrir (animation 3D, plein écran), balls spéciales du jour,
dernières captures et Pokédex. Tout l'écran est un seul composant HTML (pokemon_ui.html) : c'est lui qui sait quelles
Poké Balls ont été ouvertes (localStorage du téléphone + liste partagée avec la montre, data/pokemon/ouvertes.json, écrite
par le script Google : secrets SCRIPT_URL et JEU_CLE), donc ce qui apparaît déjà dans le Pokédex."""
import datetime as dt
import json
from pathlib import Path

import streamlit.components.v1 as components
import streamlit as st

import chiffres
import pokemon
from pokedex import COULEURS_TYPES, JEUX, LEGENDAIRES, POKEMON

PAQUET = "sprites:paquets/{:03d}.json"  # toutes les versions d'un Pokémon (images en base64), branche « sprites »
VIGNETTES = "sprites:paquets/vignettes.json"
UI = Path(__file__).with_name("pokemon_ui.html")


def _js(objet):
    return json.dumps(objet, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def _version(v):
    return f"Gén. {v['generation']} · {JEUX.get(v['jeu'], v['jeu'])}"


def _conseils():
    """Type -> activités qui le favorisent (pour « Où le trouver » dans le Pokédex)."""
    conseils = {}
    for ic, nom, types in [*pokemon.SOURCES.values(), *pokemon.SPORTS.values()]:
        for t in types or ():
            if f"{ic} {nom}" not in conseils.setdefault(t, []):
                conseils[t].append(f"{ic} {nom}")
    return conseils


def afficher(lire, aujourd):
    with st.spinner("Ouverture du Pokédex…"):
        captures, etat = pokemon.charger_jeu(lire, aujourd)
        especes = sorted({c["num"] for c in captures})
        f = lire([VIGNETTES, pokemon.OUVERTES] + [PAQUET.format(n) for n in especes])
    vignettes, paquets = f[VIGNETTES] or {}, {n: f[PAQUET.format(n)] or {} for n in especes}

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
            "id": c["id"], "jour": c["jour"], "num": c["num"], "fichier": c["fichier"], "ball": c.get("ball", "poke"),
            "shiny": c["shiny"], "raison": c["raison"], "version": _version(c), "legendaire": c["num"] in LEGENDAIRES,
            "quand": "aujourd'hui" if c["jour"] == str(aujourd) else
                     f"{chiffres.JOURS[dt.date.fromisoformat(c['jour']).weekday()]} {c['jour'][8:]}/{c['jour'][5:7]}",
        } for c in captures],
        "images": {f"{c['num']}/{c['fichier']}": paquets[c["num"]].get(c["fichier"], "") for c in captures},
        "dex": [[n, p["nom"], p["types"], vignettes.get(str(n), ""),
                 [[v["fichier"], _version(v), int(v["variante"] == "shiny")] for v in pokemon.VERSIONS[n]]]
                for n, p in POKEMON.items()],
        "legendaires": LEGENDAIRES,
        "couleurs": COULEURS_TYPES,
        "conseils": _conseils(),
        "barre": {"points": round(etat["barre"], 1), "taille": R["barre"],
                  "sources": [[i, n, round(v)] for i, n, v in sources if v >= 0.5],
                  "origine": [ic, nom, types or []], "pas_offerts": R["pas_offerts"]},
        "jour": {"pas": m["pas"], "zone": m["zone"], "seance": m["seance_max"], "sommeil": m["sommeil"],
                 "serie": etat["serie"], "serie_ok": etat["serie_ok"], "joker": etat["joker_libre"],
                 "shiny_bonus": etat["shiny_bonus"]},
        "regles": {k: R[k] for k in ("objectif_pas", "objectif_zone", "exploit_pas", "exploit_zone", "exploit_seance",
                                     "serie_legendaire", "nuit", "seance_min")},
    }
    components.html(UI.read_text(encoding="utf-8").replace("__DONNEES__", _js(donnees)), height=900)
