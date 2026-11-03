"""Calibrer le jeu (03/11, demande de Kiki) : pour chaque joueur et chaque jour, ce qu'il a fait, ce qu'il a réussi et par quel
chemin, pour voir quels objectifs sont trop durs ou trop faciles. Recalculé depuis les données brutes (elles survivent à un
reset), sauf les balls vraiment sorties, propres à la partie : d'où la copie à garder avant un reset (data/calibrage/).
Sans Streamlit. L'écran est dans ecran_calibrage.py, visible par Kiki seul. Rien ici n'est visible par les autres joueurs."""
import collections
import datetime as dt

import pandas as pd

import amis
import chiffres
import missions
import pokemon

COPIE = "data/calibrage/partie-{}-{}.json"
DE_PEU = .8  # « raté de peu » : au moins 80 % du seuil


def journal(lire_depot, ident, debut, depuis, aujourd, nom):
    """Une ligne par jour depuis `depuis` pour ce joueur (ident = amis.KIKI ou l'identifiant de l'ami, debut = sa date de début)."""
    ami = None if ident == amis.KIKI else ident
    lire = chiffres.chez(lire_depot, chiffres.dossier_ami(ami)) if ami else lire_depot
    annees = range(depuis.year, aujourd.year + 1)
    f = lire([f"data/resume/{y}.json" for y in annees] + [missions.FICHIER, pokemon.GESTES, pokemon.OUVERTES])
    resumes = {}
    for y in annees:
        resumes.update(f.get(f"data/resume/{y}.json") or {})
    jours_m = (f.get(missions.FICHIER) or {}).get("jours") or {}
    gestes = pokemon.gestes_du(f.get(pokemon.GESTES), (f.get(pokemon.OUVERTES) or {}).get("ouvertes", {}), ami, aujourd)
    jours = [depuis + dt.timedelta(days=k) for k in range((aujourd - depuis).days + 1)]
    stats = pd.DataFrame({j: chiffres.stats_jour(resumes.get(str(j))) for j in jours}).T
    st = lambda j: stats.loc[j].to_dict() if j in stats.index else {}  # noqa: E731
    mission_du = lambda j: jours_m.get(str(j)) if j >= missions.DEPUIS else None  # noqa: E731
    captures, _ = pokemon.charger_jeu(lire, aujourd, {"id": ami, "debut": debut} if ami else None)
    balls = collections.Counter((c["jour"], c.get("ball", "poke")) for c in captures if not c.get("rate"))
    lignes = []
    for j in jours:
        s = chiffres.stats_jour(resumes.get(str(j)))
        m = pokemon.mesures(s, [chiffres.contenu(p) for p in (resumes.get(str(j)) or {}).get("exercise") or []], j)
        _, obj_sport, exp_sport = pokemon.seuils_zone(m)
        R = pokemon.REGLAGES
        g = gestes.get(str(j)) or {}
        e = mission_du(j) or {}
        cle = e.get("cle")
        info = missions.MISSIONS.get(cle) or {}
        valeur = None if not cle or info.get("ancienne") else missions.valeur(cle, j, st, mission_du, gestes)
        lignes.append({
            "joueur": nom, "jour": str(j), "en_cours": j == aujourd, "donnees": bool(m["pas"]), "sport_mesure": s.get("zone_sport") is not None,
            "pas": round(float(m["pas"])), "km": round(float(s.get("km") or 0), 1), "sport": round(float(m["zone"]), 1),
            "seance_max": round(float(m["seance_max"])), "force": round(float(m["force"])), "etages": round(float(m["etages"])),
            "pompes": g.get("pompes", 0), "tractions": g.get("tractions", 0), "squats": g.get("squats", 0),
            "pts_pas": round(float(m["points"]["pas"]), 1), "pts_sport": round(float(m["points"]["zone"]), 1),
            "pts_etages": round(float(m["points"]["etages"]), 1), "pts_seance": round(float(m["points"]["sport"]), 1),
            "pts_bonus": round(float(sum(p for _, _, p in pokemon.bonus_du_jour(j, stats, resumes, mission_du, gestes))), 1),
            "super": bool(pokemon.super_ok(m)), "super_double": bool(pokemon.double_ok(m)), "hyper": pokemon.exploit(m) is not None,
            "hyper_pas": bool(m["pas"] >= R["exploit_pas"]), "hyper_sport": bool(m["zone"] >= exp_sport), "hyper_seance": bool(m["seance_max"] >= R["exploit_seance"]),
            "objectif": bool(pokemon.objectif_ok(m)), "obj_pas": R["objectif_pas"], "obj_sport": obj_sport, "exp_pas": R["exploit_pas"], "exp_sport": exp_sport, "exp_seance": R["exploit_seance"],
            "mission": cle, "mission_titre": info.get("titre"), "mission_ok": bool(missions.reussite(cle, j, st, mission_du, gestes)) if cle else None,
            "mission_seuil": missions.seuil_de(cle, e) if cle else None, "mission_valeur": None if valeur is None else round(float(valeur), 1), "mission_unite": info.get("unite"),
            **{f"balls_{b}": balls[(str(j), b)] for b in ("poke", "super", "hyper", "master", "shiny")},
        })
    return lignes


def comptes(lignes):
    """Les journées qu'on peut compter : finies, et avec des données (un jour sans récolte n'est pas un jour raté)."""
    return [x for x in lignes if not x["en_cours"] and x["donnees"]]


def _part(n, total):
    return f"{n} / {total} ({round(n / total * 100)} %)" if total else "–"


def taux(lignes):
    """Qui réussit quoi, par joueur : une ligne par joueur."""
    out = []
    for nom in dict.fromkeys(x["joueur"] for x in lignes):
        j = [x for x in comptes(lignes) if x["joueur"] == nom]
        t, avec = len(j), [x for x in j if x["mission"]]
        out.append({"Joueur": nom, "Jours": t, "Sport mesuré": _part(sum(x["sport_mesure"] for x in j), t),
                    "5 000 pas": _part(sum(x["pas"] >= x["obj_pas"] for x in j), t), "Objectif du jour": _part(sum(x["objectif"] for x in j), t),
                    "Super Ball": _part(sum(x["super"] for x in j), t), "Hyper Ball": _part(sum(x["hyper"] for x in j), t),
                    "Hyper par les pas": _part(sum(x["hyper_pas"] for x in j), t), "Hyper par le sport": _part(sum(x["hyper_sport"] for x in j), t),
                    "Hyper par une séance": _part(sum(x["hyper_seance"] for x in j), t),
                    "Mission": _part(sum(bool(x["mission_ok"]) for x in avec), len(avec))})
    return out


def par_jour(lignes):
    """Combien de joueurs ont atteint la Super et l'Hyper Ball, chaque jour (jours finis, joueurs avec des données)."""
    out = {}
    for x in comptes(lignes):
        d = out.setdefault(x["jour"], {"joueurs": 0, "super": 0, "hyper": 0})
        d["joueurs"] += 1
        d["super"] += x["super"]
        d["hyper"] += x["hyper"]
    return out


def missions_tableau(lignes):
    """Chaque mission : tirée combien de fois, réussie combien de fois, et jusqu'où on est allé quand on a raté."""
    par = collections.defaultdict(list)
    for x in comptes(lignes):
        if x["mission"]:
            par[x["mission"]].append(x)
    out = []
    for cle, xs in sorted(par.items(), key=lambda kv: -len(kv[1])):
        rates = [x["mission_valeur"] / x["mission_seuil"] for x in xs if not x["mission_ok"] and x["mission_valeur"] is not None and x["mission_seuil"]]
        info = missions.MISSIONS[cle]
        out.append({"Mission": info["titre"] + (" (ancienne)" if info.get("ancienne") else ""), "Points": info.get("bonus", missions.BONUS), "Tirée": len(xs),
                    "Réussie": _part(sum(bool(x["mission_ok"]) for x in xs), len(xs)), "Quand c'est raté, en moyenne": f"{round(sum(rates) / len(rates) * 100)} % du seuil" if rates else "–"})
    return out


def rates_de_peu(lignes):
    """Les journées où un objectif a été raté de peu : c'est ce qui montre qu'un seuil est mal placé."""
    out = []
    nb = chiffres.nombre

    def ajoute(x, objectif, manque):
        out.append({"Joueur": x["joueur"], "Jour": x["jour"], "Objectif": objectif, "Ce qui a manqué": manque})
    for x in comptes(lignes):
        if not x["super"] and x["sport_mesure"]:  # sans mesure du sport, la Super Ball est impossible : pas un raté de peu
            parts = [(x["pas"] / x["obj_pas"], f"{nb(x['pas'])} / {nb(x['obj_pas'])} pas"), (x["sport"] / x["obj_sport"], f"{x['sport']:g} / {x['obj_sport']} min de sport")]
            if min(p for p, _ in parts) >= DE_PEU:
                ajoute(x, "Super Ball", " et ".join(t for p, t in parts if p < 1))
        if not x["hyper"]:
            voies = [(x["pas"] / x["exp_pas"], f"{nb(x['pas'])} / {nb(x['exp_pas'])} pas")]
            if x["sport_mesure"]:
                voies += [(x["sport"] / x["exp_sport"], f"{x['sport']:g} / {x['exp_sport']} min de sport"), (x["seance_max"] / x["exp_seance"], f"séance de {x['seance_max']} / {x['exp_seance']} min")]
            p, t = max(voies)
            if p >= DE_PEU:
                ajoute(x, "Hyper Ball", t)
        if x["mission"] and not x["mission_ok"] and x["mission_valeur"] is not None and x["mission_seuil"] and x["mission_valeur"] / x["mission_seuil"] >= DE_PEU:
            ajoute(x, x["mission_titre"], f"{x['mission_valeur']:g} / {x['mission_seuil']:g} {x['mission_unite']}")
    return sorted(out, key=lambda r: r["Jour"], reverse=True)
