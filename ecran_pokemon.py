"""Onglet 🎮 Pokémon : barre d'effort, Poké Balls à ouvrir (animation 3D, plein écran), voyage dans Kanto (carte,
arènes), balls spéciales du jour, dernières captures et Pokédex. Les images viennent directement du dépôt public
PokeAPI/sprites (pokemon.IMAGES). Tout l'écran est un seul composant HTML (pokemon_ui.html) : c'est lui qui sait quelles
Poké Balls ont été ouvertes (localStorage du téléphone + liste partagée avec la montre, data/pokemon/ouvertes.json, écrite
par le script Google : secrets SCRIPT_URL et JEU_CLE), donc ce qui apparaît déjà dans le Pokédex."""
import datetime as dt
import hashlib
import hmac
import json
from pathlib import Path

import streamlit as st

import chiffres
import pokemon
from pokedex import CATEGORIES, COULEURS_TYPES, DESCRIPTIONS, FEMELLES, LEGENDAIRES, POIDS, POKEMON, TAILLES

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


def _acces_jeu(joueur):
    """Ce que le téléphone reçoit pour noter ses Poké Balls ouvertes : Kiki a la clé du jeu ; un ami, une signature qui ne
    sert qu'à ça (la clé du jeu ouvre aussi la montre, l'agenda et Claude de Kiki : elle ne quitte jamais le serveur)."""
    s = st.secrets
    if not s.get("SCRIPT_URL"):
        return None
    if not joueur:
        return {"url": s["SCRIPT_URL"], "cle": s["JEU_CLE"]} if s.get("JEU_CLE") else None
    if not s.get("SCRIPT_CLE"):
        return None
    sig = hmac.new(s["SCRIPT_CLE"].encode(), f"ouvrir:{joueur['id']}".encode(), hashlib.sha256).hexdigest()
    return {"url": s["SCRIPT_URL"], "joueur": joueur["id"], "sig": sig}


def afficher(lire, aujourd, joueur=None, conseil=None, anniversaire=False, joueurs=()):
    """joueur = {"id", "debut"} pour un ami (lire donne alors ses fichiers à lui), None pour Kiki ; conseil = la phrase utile du
    récap du matin (bilan.conseil_du_jour) ; anniversaire = c'est son anniversaire aujourd'hui (date gardée sur son téléphone) ;
    joueurs = tous les joueurs résumés pour le jeu (amis.public, soi compris : « moi »), pour la carte et l'onglet Dresseur."""
    with st.spinner("Ouverture du Pokédex…"):
        captures, etat = pokemon.charger_jeu(lire, aujourd, joueur, anniversaire)
        f = lire([pokemon.OUVERTES])

    m, R = etat["mesures"], pokemon.REGLAGES
    ic, nom, types = etat["origine"]
    sport_ic, sport_nom, _ = pokemon.sport_principal(m)
    sources = [("👟", "Pas", m["points"]["pas"]), ("🔥", "Minutes de sport", m["points"]["zone"]),
               ("🪜", "Étages", m["points"]["etages"]), (sport_ic, f"Séances ({sport_nom})", m["points"]["sport"])]
    donnees = {
        "aujourdhui": str(aujourd),
        "ouvertes": list((f[pokemon.OUVERTES] or {}).get("ouvertes", {})),
        "prefixe": pokemon.ident(aujourd, "", joueur["id"] if joueur else None),
        "gestes_jour": etat["gestes_jour"],
        "jeu": _acces_jeu(joueur),
        "captures": [{
            "id": c["id"], "jour": c["jour"], "num": c["num"], "ball": c.get("ball", "poke"),
            "shiny": c["shiny"], "raison": c["raison"], "lieu": c.get("lieu", ""), "legendaire": c["num"] in LEGENDAIRES,
            "c": c.get("c"), "rate": bool(c.get("rate")), "chasse": bool(c.get("chasse")), "chance": bool(c.get("chance")),
            "quand": "aujourd'hui" if c["jour"] == str(aujourd) else
                     f"{chiffres.JOURS[dt.date.fromisoformat(c['jour']).weekday()]} {c['jour'][8:]}/{c['jour'][5:7]}",
        } for c in captures],
        "images": pokemon.IMAGES,
        "dex": [[n, p["nom"], p["types"]] for n, p in POKEMON.items()],
        "voyage": etat["voyage"] | {"frise": etat["frise"], "cumul": etat["cumul"]},
        "pesees": etat["pesees"],
        "poids": POIDS,
        "tailles": TAILLES,
        "femelles": FEMELLES,
        "categories": CATEGORIES,
        "descriptions": DESCRIPTIONS,
        "carte": f"https://raw.githubusercontent.com/kikitmt-bit/sante-appli/main/{etat['voyage']['carte']['image']}",
        "scenes": "https://raw.githubusercontent.com/kikitmt-bit/sante-appli/main/scenes/",
        "legendaires": LEGENDAIRES,
        "couleurs": COULEURS_TYPES,
        "conseils": _conseils(),
        "barre": {"points": round(etat["barre"], 1), "taille": R["barre"],
                  "sources": [[i, n, round(v)] for i, n, v in sources if v >= 0.5],
                  "origine": [ic, nom, types or []], "pas_offerts": R["pas_offerts"],
                  "bonus": [list(b) for b in etat["bonus"]]},
        "mission": etat["mission"],
        "joueurs": list(joueurs),
        "matin": {"hier": etat["hier"], "conseil": conseil},
        "jeu_etat": {k: etat[k] for k in ("defi_grise", "perdues", "retenues", "missions_gardees", "sac", "chasse", "fini", "starter")},
        "jour": {"pas": m["pas"], "zone": m["zone"], "seance": m["seance_max"], "sommeil": m["sommeil"],
                 "serie": etat["serie"], "serie_ok": etat["serie_ok"], "fenetre": etat["fenetre"],
                 "shiny_bonus": etat["shiny_bonus"]},
        "regles": {k: R[k] for k in ("objectif_pas", "objectif_zone", "exploit_pas", "exploit_zone", "exploit_seance", "zone_points",
                                     "master_jours", "master_fenetre", "nuit", "seance_min", "force", "partie", "sac", "rend", "pas_offerts", "bonus_pompe", "bonus_traction", "bonus_gestes_max")},
    }
    if joueur:  # ce que le téléphone retient (dresseur, voyage déjà vu…) : à part pour chaque joueur
        donnees["regles"]["partie"] = f"{R['partie']}-{joueur['id']}"
    st.iframe(UI.read_text(encoding="utf-8").replace("__DONNEES__", _js(donnees)), height=900)
