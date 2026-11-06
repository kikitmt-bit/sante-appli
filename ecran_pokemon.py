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
import regions
import rival
import seances_rameur
from pokedex import CATEGORIES, COULEURS_TYPES, DESCRIPTIONS, LEGENDAIRES, POIDS, POKEMON, TAILLES

UI = Path(__file__).with_name("pokemon_ui.html")
DANSE = Path(__file__).with_name("danse.js")
RAMEUR = Path(__file__).with_name("rameur.js")


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


def afficher(lire, aujourd, joueur=None, conseil=None, anniversaire=False, joueurs=(), chansons=(), profil=None):
    """joueur = {"id", "debut"} pour un ami (lire donne alors ses fichiers à lui), None pour Kiki ; conseil = la phrase utile du
    récap du matin (bilan.conseil_du_jour) ; anniversaire = c'est son anniversaire aujourd'hui (date gardée sur son téléphone) ;
    joueurs = tous les joueurs résumés pour le jeu (amis.public, soi compris : « moi »), pour la carte et l'onglet Dresseur ;
    chansons = les musiques de la danse au doigt (danse.charger)."""
    with st.spinner("Ouverture du Pokédex…"):
        captures, etat = pokemon.charger_jeu(lire, aujourd, joueur, anniversaire)
        f = lire([pokemon.OUVERTES])
    # l'aperçu de Johto (Kiki seul, ?essais=1&johto=1) : la carte et les champions de la région, sans aucune capture ni rien d'enregistré
    apercu = joueur is None and st.query_params.get("essais") == "1" and st.query_params.get("johto") == "1"
    if apercu:
        captures, etat = pokemon.apercu_region(etat, 1, float(st.query_params.get("pos", 830)))
    index = etat["region"]["index"]
    nums = {n for r in regions.REGIONS[:index + 1] for n in r.lieux_et_legendes}  # rien de la région suivante n'arrive sur le téléphone : la suite reste une surprise
    nums |= {c["num"] for c in captures} | {n for lieu in etat["voyage"]["lieux"] for n in lieu["pokemon"]}  # ce qui est déjà attrapé et les Pokémon de ses lieux à lui doivent toujours s'afficher
    for j in joueurs:  # sauf ce qu'un ami en avance a déjà attrapé : ses captures doivent pouvoir s'afficher
        nums |= set(j.get("especes") or ()) | {x["num"] for x in (j.get("dernieres") or ())} | {x["num"] for x in (j.get("nouvelles") or ()) if x.get("num")}
        if j.get("starter"):
            nums.add(j["starter"]["num"])

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
        "jeu": None if apercu else _acces_jeu(joueur),
        "region": etat["region"],
        "carnet": etat["carnet"],
        "rival": rival.pour_ecran(etat, aujourd, profil),
        "moments": etat["moments"],
        "kiki": joueur is None,
        # les tests, les aperçus et les réglages des capteurs : Kiki seul, avec ?essais=1 dans l'adresse (le reste du jeu doit rester une surprise, pour lui aussi)
        "essais": joueur is None and st.query_params.get("essais") == "1",
        "captures": [{
            "id": c["id"], "jour": c["jour"], "num": c["num"], "ball": c.get("ball", "poke"),
            "shiny": c["shiny"], "raison": c["raison"], "lieu": c.get("lieu", ""), "legendaire": c["num"] in LEGENDAIRES,
            "c": c.get("c"), "rate": bool(c.get("rate")), "chasse": bool(c.get("chasse")), "chance": bool(c.get("chance")), "champion": bool(c.get("champion")),
            "quand": "aujourd'hui" if c["jour"] == str(aujourd) else
                     f"{chiffres.JOURS[dt.date.fromisoformat(c['jour']).weekday()]} {c['jour'][8:]}/{c['jour'][5:7]}",
        } for c in captures],
        "images": pokemon.IMAGES,
        "dex": [[n, p["nom"], p["types"]] for n, p in POKEMON.items() if n in nums],
        "voyage": etat["voyage"] | {"frise": etat["frise"], "cumul": etat["cumul"]},
        "pesees": etat["pesees"],
        "poids": {n: v for n, v in POIDS.items() if n in nums},
        "tailles": {n: v for n, v in TAILLES.items() if n in nums},
        "categories": {n: v for n, v in CATEGORIES.items() if n in nums},
        "descriptions": {n: v for n, v in DESCRIPTIONS.items() if n in nums},
        "carte": f"https://raw.githubusercontent.com/kikitmt-bit/sante-appli/main/{etat['voyage']['carte']['image']}",
        "scenes": "https://raw.githubusercontent.com/kikitmt-bit/sante-appli/main/scenes/",
        "legendaires": [n for n in LEGENDAIRES if n in nums],
        "couleurs": COULEURS_TYPES,
        "conseils": _conseils(),
        "barre": {"points": round(etat["barre"], 1), "taille": R["barre"],
                  "sources": [[i, n, round(v)] for i, n, v in sources if v >= 0.5],
                  "origine": [ic, nom, types or []], "pas_offerts": R["pas_offerts"],
                  "bonus": [list(b) for b in etat["bonus"]]},
        "mission": etat["mission"],
        "joueurs": list(joueurs),
        "danse": [{"cle": c["cle"], "sm": c["sm"]} for c in chansons],
        "rameur": seances_rameur.pour_ecran(lire([seances_rameur.FICHIER])[seances_rameur.FICHIER], aujourd) if joueur is None else None,
        "matin": {"hier": etat["hier"], "conseil": conseil},
        "jeu_etat": {k: etat[k] for k in ("defi_grise", "perdues", "retenues", "missions_gardees", "sac", "chasse", "fini", "starter", "semaine", "semaine_passee", "relance")},
        "jour": {"pas": m["pas"], "zone": m["zone"], "seance": m["seance_max"], "sommeil": m["sommeil"],
                 "serie": etat["serie"], "serie_ok": etat["serie_ok"], "fenetre": etat["fenetre"],
                 "shiny_bonus": etat["shiny_bonus"]},
        "regles": {k: R[k] for k in ("objectif_pas", "objectif_zone", "exploit_pas", "exploit_zone", "exploit_seance", "zone_points",
                                     "master_jours", "master_fenetre", "nuit", "seance_min", "force", "partie", "sac", "rend", "pas_offerts", "bonus_pompe", "bonus_traction", "bonus_squat", "bonus_planche", "bonus_danse", "bonus_gestes_max", "objectif_gestes", "bonus_famille", "familles_semaine", "hebdo_jours")},
    }
    if joueur:  # ce que le téléphone retient (dresseur, voyage déjà vu…) : à part pour chaque joueur
        donnees["regles"]["partie"] = f"{R['partie']}-{joueur['id']}"
    if index or apercu:  # chaque région a ses points : le voyage déjà vu repart de zéro
        donnees["regles"]["partie"] = f"{donnees['regles']['partie']}-r{index}" + ("-apercu" if apercu else "")
    page = UI.read_text(encoding="utf-8").replace("/*__DANSE_JS__*/", DANSE.read_text(encoding="utf-8")).replace("/*__RAMEUR_JS__*/", RAMEUR.read_text(encoding="utf-8"))
    st.iframe(page.replace("__DONNEES__", _js(donnees)), height=900)
