"""Le fichier de la montre (data/pokemon/montre.json, branche data du dépôt privé) : barre d'effort et Poké Balls pas
encore ouvertes, avec leur Pokémon et son image. Calculé par GitHub (.github/workflows/montre.yml), que le script Google
déclenche après chaque récolte, avec exactement les règles de pokemon.py. La montre le lit par le script Google
(doGet ?quoi=montre), qui enlève au passage les Poké Balls ouvertes depuis (data/pokemon/ouvertes.json, liste partagée
par la montre et le téléphone).

    python3 montre.py DOSSIER_DATA [DOSSIER_SPRITES]   -> écrit DOSSIER_DATA/data/pokemon/montre.json (essais en local)
    SANTE_TOKEN=… python3 montre.py github              -> lit et écrit directement dans le dépôt privé (GitHub Actions)

Dépôt public : ce script n'affiche jamais de données dans le journal (les journaux de GitHub Actions sont publics).
"""
import base64
import datetime as dt
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import chiffres
import pokemon
from pokedex import LEGENDAIRES, POKEMON

MONTRE = "data/pokemon/montre.json"
PAQUET = "sprites:paquets/{:03d}.json"  # comme ecran_pokemon.py
JOURS_OUVERTES = 14  # plus vieilles : comptées ouvertes (comme sur le téléphone)
DEPOT = "kikitmt-bit/sante"


def contenu(lire, maintenant):
    """Le contenu de montre.json."""
    aujourd = maintenant.date()
    captures, etat = pokemon.charger_jeu(lire, aujourd)
    ouvertes = (lire([pokemon.OUVERTES])[pokemon.OUVERTES] or {}).get("ouvertes", {})
    limite = str(aujourd - dt.timedelta(days=JOURS_OUVERTES))
    a_ouvrir = [c for c in captures if c["id"] not in ouvertes and c["jour"] >= limite]
    derniere = captures[-1:]  # la dernière capture, pour la revoir sur la montre (rien n'est enregistré)
    # Le Pokédex de la montre : espèces des Poké Balls ouvertes (ou de plus de 14 jours) et les 6 dernières ouvertes
    vues = [c for c in captures if c["id"] in ouvertes or c["jour"] < limite]
    recentes = vues[-6:][::-1]
    paquets = lire([PAQUET.format(n) for n in sorted({c["num"] for c in a_ouvrir + derniere + recentes})])
    m, ic_nom = etat["mesures"], etat["origine"]
    # La nuit qui finit ce matin (heures de coucher et de lever, pour l'afficher la première heure après le réveil)
    resume = (lire([f"data/resume/{aujourd.year}.json"])[f"data/resume/{aujourd.year}.json"] or {}).get(str(aujourd))
    s = chiffres.stats_jour(resume) if resume else {}
    hm = lambda x: f"{int(x) // 60 % 24:02d}:{int(x) % 60:02d}" if x == x and x is not None else None  # noqa: E731
    gagnee = lambda cle: any(c["jour"] == str(aujourd) and c["id"].split("#")[1].startswith(cle) for c in captures)  # noqa: E731
    R = pokemon.REGLAGES
    une = lambda c: {"id": c["id"], "jour": c["jour"], "ball": c["ball"], "raison": c["raison"],  # noqa: E731
                     "num": c["num"], "nom": POKEMON[c["num"]]["nom"], "types": POKEMON[c["num"]]["types"],
                     "shiny": c["shiny"], "nouvelle": c["nouvelle"], "legendaire": c["num"] in LEGENDAIRES,
                     "image": (paquets[PAQUET.format(c["num"])] or {}).get(c["fichier"], "")}
    return {
        "v": 1, "maj": maintenant.isoformat(timespec="minutes"), "jour": str(aujourd),
        "barre": {"points": round(etat["barre"], 1), "taille": pokemon.REGLAGES["barre"],
                  "origine": f"{ic_nom[0]} {ic_nom[1]}"},
        "aujourdhui": {"pas": round(m["pas"]), "zone": round(m["zone"]), "etages": round(m["etages"]),
                       "sport": round(m["sport"]), "serie": etat["serie"]},
        "balls": [une(c) for c in a_ouvrir],
        "derniere": une(derniere[0]) if derniere else None,
        "objectifs": {"pas": round(m["pas"]), "zone": round(m["zone"]), "seance": round(m["seance_max"]),
                      "serie": etat["serie"], "serie_ok": etat["serie_ok"], "joker": etat["joker_libre"],
                      "super": gagnee("super"), "hyper": gagnee("hyper"), "shiny": round(etat["shiny_bonus"], 2),
                      "regles": {k: R[k] for k in ("objectif_pas", "objectif_zone", "exploit_pas", "exploit_zone",
                                                   "exploit_seance", "serie_legendaire", "nuit", "pas_offerts")}},
        "nuit": {"duree": round(m["sommeil"]), "coucher": hm(s.get("coucher")), "lever": hm(s.get("lever")),
                 "phases": {k: nombre(s.get(k)) for k in ("profond", "leger", "paradoxal", "eveil")}}
                if m.get("sommeil") else None,
        "sante": {k: nombre(s.get(k), 1 if k in ("km",) else 0) for k in
                  ("pas", "km", "kcal", "zone", "etages", "fc_repos", "vfc", "spo2", "min_sport", "seances")}
                 | {"sport": pokemon.sport_principal(m)[1] if m.get("sports") else None},
        "pokedex": {"especes": len({c["num"] for c in vues}), "total": len(POKEMON), "dernieres": [une(c) for c in recentes]},
        "coeur": coeur(lire, maintenant),
    }


def coeur(lire, maintenant):
    """L'écran Cœur de la montre : courbe des dernières 24 h (moyenne et mini / maxi par demi-heure, minute par minute
    de la montre), dernière mesure, FC au repos et VFC des 7 derniers jours, minutes du jour dans chaque zone."""
    import pandas as pd
    aujourd = maintenant.date()
    hier = aujourd - dt.timedelta(days=1)
    chemins = {j: f"data/jour/{j.year}/{j}.json" for j in (hier, aujourd)}
    f = lire(list(chemins.values()))
    morceaux = []
    for j, c in chemins.items():
        hr = ((f.get(c) or {}).get("types") or {}).get("heart-rate")
        df = chiffres.table(hr) if isinstance(hr, dict) else pd.DataFrame()
        if df.empty or "beatsPerMinuteAvg" not in df:
            continue
        df["t"] = pd.to_datetime(str(j) + " " + df["heure"].astype(str), errors="coerce")
        morceaux.append(df.dropna(subset=["t"]))
    serie, derniere = [], None
    if morceaux:
        df = pd.concat(morceaux).sort_values("t")
        debut = pd.Timestamp(maintenant.replace(tzinfo=None) - dt.timedelta(hours=24)).floor("30min")
        df = df[df["t"] >= debut]
        if not df.empty:
            last = df.iloc[-1]
            derniere = {"bpm": round(float(last["beatsPerMinuteAvg"])), "heure": last["t"].strftime("%H:%M")}
            g = df.groupby(((df["t"] - debut).dt.total_seconds() // 1800).astype(int))
            for k, d in g:
                serie.append([int(k), round(float(d["beatsPerMinuteAvg"].mean())), int(d["beatsPerMinuteMin"].min()),
                              int(d["beatsPerMinuteMax"].max())])
            debut_h = debut.strftime("%H:%M")
        else:
            debut_h = None
    else:
        debut_h = None
    # FC au repos et VFC des 7 derniers jours, zones du jour (résumés annuels)
    annees = sorted({(aujourd - dt.timedelta(days=i)).year for i in range(7)})
    resumes = {}
    for y in annees:
        resumes.update(lire([f"data/resume/{y}.json"])[f"data/resume/{y}.json"] or {})
    semaine = []
    for i in range(6, -1, -1):
        j = aujourd - dt.timedelta(days=i)
        st = chiffres.stats_jour(resumes.get(str(j))) if resumes.get(str(j)) else {}
        semaine.append({"jour": chiffres.JOURS[j.weekday()][:1].upper(), "repos": nombre(st.get("fc_repos")),
                        "vfc": nombre(st.get("vfc"))})
    r = resumes.get(str(aujourd)) or {}
    z = chiffres.premier(r.get("active-zone-minutes:jour"), "sumInFatBurnHeartZone")
    zones = None
    if z is not None:
        c = chiffres.contenu(r["active-zone-minutes:jour"][0])
        zones = {"graisses": nombre(c.get("sumInFatBurnHeartZone")), "cardio": nombre(c.get("sumInCardioHeartZone")),
                 "pic": nombre(c.get("sumInPeakHeartZone"))}
    st = chiffres.stats_jour(r) if r else {}
    return {"debut": debut_h, "serie": serie, "derniere": derniere, "semaine": semaine, "zones": zones,
            "max": nombre(st.get("fc_max")), "repos": nombre(st.get("fc_repos"))}


def nombre(x, chiffres_apres=0):
    """Un nombre propre pour le JSON (None si absent)."""
    try:
        return None if x is None or x != x else round(float(x), chiffres_apres) if chiffres_apres else round(float(x))
    except (TypeError, ValueError):
        return None


def lecteur_local(dossier, sprites=None):
    def un(chemin):
        if chemin.startswith("sprites:"):
            if not sprites:
                return None
            p = Path(sprites) / chemin.split(":", 1)[1]
        else:
            p = Path(dossier) / chemin
        return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None
    return lambda chemins: {c: un(c) for c in chemins}


def _api(jeton):
    import requests
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {jeton}", "Accept": "application/vnd.github+json"})
    return s


def lecteur_github(session):
    def un(chemin):
        branche, _, p = chemin.rpartition(":") if ":" in chemin.split("/")[0] else ("data", "", chemin)
        r = session.get(f"https://api.github.com/repos/{DEPOT}/contents/{p}", params={"ref": branche}, timeout=60,
                        headers={"Accept": "application/vnd.github.raw+json"})
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.json()

    deja = {}

    def lire(chemins):
        manque = [c for c in chemins if c not in deja]
        with ThreadPoolExecutor(8) as ex:
            deja.update(zip(manque, ex.map(un, manque)))
        return {c: deja[c] for c in chemins}
    return lire


def sans_heure(texte):
    return {k: v for k, v in json.loads(texte).items() if k != "maj"} if texte else None


def ecrire_github(session, texte, chemin=MONTRE, pareil=lambda a, b: sans_heure(a) == sans_heure(b)):
    """Écrit un fichier (montre.json par défaut) dans la branche data, seulement s'il a changé (à part l'heure)."""
    url = f"https://api.github.com/repos/{DEPOT}/contents/{chemin}"
    for essai in range(3):  # 409 : la branche a bougé entre-temps (récolte du script Google), on réessaie
        r = session.get(url, params={"ref": "data"}, timeout=60)
        avant = r.json() if r.status_code == 200 else None
        if avant and pareil(base64.b64decode(avant["content"]).decode("utf-8"), texte):
            return "inchangé"
        corps = {"message": chemin.rsplit("/", 1)[-1].removesuffix(".json"), "branch": "data", "content": base64.b64encode(texte.encode()).decode()}
        if avant:
            corps["sha"] = avant["sha"]
        r = session.put(url, json=corps, timeout=60)
        if r.status_code in (200, 201):
            return "écrit"
        if r.status_code != 409:
            r.raise_for_status()
    raise RuntimeError("GitHub refuse l'écriture (409 trois fois)")


def main(args):
    maintenant = dt.datetime.now(chiffres.TZ)
    if args[:1] == ["github"]:
        if not os.environ.get("SANTE_TOKEN"):
            return print("Secret SANTE_TOKEN pas encore créé : rien à faire.")
        session = _api(os.environ["SANTE_TOKEN"])
        lire = lecteur_github(session)
        texte = json.dumps(contenu(lire, maintenant), ensure_ascii=False, separators=(",", ":"))
        print("montre.json :", ecrire_github(session, texte))
        # Captures des jours finis figées (avant, c'était la tâche du coach du matin ; le coach est maintenant à la demande)
        captures, _ = pokemon.charger_jeu(lire, maintenant.date())
        figees = json.dumps({"captures": [c for c in captures if c["jour"] < str(maintenant.date())]},
                            ensure_ascii=False, indent=0)
        print("captures figées :", ecrire_github(session, figees, pokemon.FIGEES,
                                                 lambda a, b: json.loads(a) == json.loads(b)))
    elif args:
        chemin = Path(args[0]) / MONTRE
        chemin.parent.mkdir(parents=True, exist_ok=True)
        d = contenu(lecteur_local(args[0], args[1] if len(args) > 1 else None), maintenant)
        chemin.write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print(chemin)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
