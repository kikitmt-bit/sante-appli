"""Le circuit du jour de « La Rivière » (15/11, étape 5 du plan) : chaque matin, le même circuit pour tout le monde, et son classement.

Qui fait quoi :
  - GitHub, chaque nuit (.github/workflows/circuit-du-jour.yml → riviere/outils/circuit_du_jour.py), tire le circuit avec le générateur noté
    (étape 4), sans crédits ni navigateur : un pour l'eau (le rameur), un pour la terre (vélo, skieur de fond). La graine et les réglages
    viennent de la date seule (`options`) : refaire le même jour donne le même circuit. Il l'écrit dans CHEMIN (branche data, dépôt privé).
  - L'appli (app.py, ?ecran=rameur) le lit et le donne à la page (`D.jour`), avec le classement : le meilleur tour de chaque joueur sur ce
    circuit, pris dans ses records (data/riviere/records.json, étape 2). Rien de nouveau à envoyer : un record du circuit du jour part avec la
    séance, comme sur n'importe quel circuit.
Aucune donnée de santé : un pseudo, des couleurs, un temps de tour, une machine."""
import datetime as dt
import hashlib

CHEMIN = "data/riviere/jour/{}.json"
ACTIVITES = ("eau", "terre")
JOURS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."]


def _des(jour, quoi):
    """Un tirage propre à la date (et à ce qu'on tire) : un nombre entre 0 et 1, le même sur toutes les machines."""
    return int(hashlib.sha256(f"{jour}|{quoi}".encode()).hexdigest()[:8], 16) / 0xFFFFFFFF


def _un(jour, quoi, liste):
    return liste[int(_des(jour, quoi) * len(liste)) % len(liste)]


def _quelques(jour, quoi, liste, n):
    """n éléments différents de la liste, choisis par la date."""
    return sorted(liste, key=lambda k: _des(jour, f"{quoi}|{k}"))[:n]


def id_du_jour(jour, activite):
    return f"jour-{activite}-{jour}"


def nom_du_jour(jour):
    d = dt.date.fromisoformat(str(jour))
    return f"Circuit du jour · {JOURS[d.weekday()]} {d.day:02d}/{d.month:02d}"


def options(jour, activite, essai=0):
    """Les réglages du générateur pour ce jour (`essai` : un autre tirage le même jour, si le premier ne passe pas le contrôle).
    Eau : ~2 km de décor (un tour de 8 à 10 min au rameur) ; terre : ~3,5 km. Ronflex dort sur la route un jour sur deux (étape 6)."""
    jour = str(jour)
    graine = int(jour.replace("-", "")) % 100000 * 10 + essai
    if activite == "terre":
        avec = _quelques(jour, "terre", ["village", "foret", "champs", "montagne", "tunnel", "pont", "volcan"], 2 + int(_des(jour, "nb-t") * 2))
        o = {"activite": "terre", "km": round(3.2 + _des(jour, "km-t") * .8, 1), "virages": _un(jour, "vir-t", ["quelques", "sinueux", "quelques", "tres"]),
             "denivele": _un(jour, "den-t", [20, 35, 50, 70]), "forme": _un(jour, "forme", ["boucle", "boucle", "boucle", "huit"])}
    else:
        avec = _quelques(jour, "eau", ["lac", "foret", "marais", "plage", "grotte", "cascade", "pont", "village", "port"], 2 + int(_des(jour, "nb") * 2))
        o = {"activite": "eau", "km": round(1.8 + _des(jour, "km") * .5, 1), "virages": _un(jour, "vir", ["quelques", "sinueux", "quelques", "tres", "droit"]),
             "denivele": _un(jour, "den", [0, 10, 15, 25, 40]), "forme": "boucle"}
    if _des(jour, "ronflex") < .5:
        avec.append("ronflex")
    o.update({"boucle": o["forme"] != "ouvert", "avec": {k: True for k in avec}, "graine": graine, "tirages": 24, "nom": nom_du_jour(jour),
              "heure": _un(jour, "heure", ["jour", "jour", "jour", "matin", "soir"]), "meteo": _un(jour, "meteo", ["beau", "beau", "beau", "nuages", "variable"])})
    return o


def preparer(niveau, jour, activite, note):
    """Le circuit tel qu'il est rangé : son nom, son identifiant du jour, sa note (pour le menu)."""
    niveau = dict(niveau)
    niveau.update({"id": id_du_jour(jour, activite), "nom": nom_du_jour(jour), "jour": str(jour), "note": note})
    return niveau


def classement(fichier_jour, records_par_joueur, dresseurs, moi):
    """{activité: {machine: [{nom, t, moi, couleurs}, …] du plus rapide au plus lent}} : le meilleur tour de chaque joueur sur le circuit du jour.
    records_par_joueur = {ident: contenu de son data/riviere/records.json} ; dresseurs = {ident: sa carte publiée (pseudo, couleurs)}."""
    out = {}
    for act in ACTIVITES:
        niv = (fichier_jour or {}).get(act) or {}
        if not niv.get("id"):
            continue
        par_machine = {}
        for ident, fichier in (records_par_joueur or {}).items():
            for r in ((fichier or {}).get("records") or {}).values():
                t = ((r or {}).get("tour") or {}).get("t")
                if r.get("niveau") != niv["id"] or not isinstance(t, (int, float)) or t <= 0:
                    continue
                m = str(r.get("machine") or "rameur")
                garde = par_machine.setdefault(m, {})
                if ident not in garde or t < garde[ident]:
                    garde[ident] = t
        for m, temps in par_machine.items():
            lignes = []
            for ident, t in sorted(temps.items(), key=lambda x: x[1]):
                d = (dresseurs or {}).get(ident) or {}
                lignes.append({"nom": str(d.get("nom") or ("Kiki" if ident == "kiki" else "Dresseur"))[:20], "t": round(float(t), 1), "moi": ident == moi,
                               "couleurs": {k: d[k] for k in ("casquette", "veste") if d.get(k)}})
            out.setdefault(act, {})[m] = lignes
    return out


def pour_le_jeu(fichier_jour, classe):
    """Ce que la page reçoit (D.jour) : les deux circuits du jour et leur classement. None s'il n'y a pas (encore) de circuit du jour."""
    if not fichier_jour:
        return None
    circuits = [fichier_jour[a] for a in ACTIVITES if isinstance(fichier_jour.get(a), dict) and fichier_jour[a].get("pieces")]
    return {"jour": fichier_jour.get("jour"), "circuits": circuits, "classement": classe or {}} if circuits else None
