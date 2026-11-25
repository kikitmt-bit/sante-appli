"""Le circuit du jour de « La Rivière » (15/11, étape 5 du plan ; refait le 25/11) : chaque matin, le même circuit pour tout le monde, et son classement.

Qui fait quoi :
  - GitHub (.github/workflows/circuit-du-jour.yml → riviere/outils/circuit_du_jour.py) tire, sans crédits ni navigateur, trois circuits
    indépendants, un par machine, avec les générateurs de chacune : le rameur (jeu/iles.js, jeu/lacs.js), le vélo (jeu/velo_villes.js,
    jeu/quais.js), le marcheur elliptique (jeu/villes.js). La graine et les réglages viennent de la date seule (`options`) : refaire le même
    jour donne le même circuit. Il écrit celui du jour et celui du lendemain (une tâche programmée peut partir dix heures en retard) dans
    CHEMIN (branche data, dépôt privé).
  - L'appli (app.py, ?ecran=rameur) le lit et le donne à la page (`D.jour`), avec le classement : le meilleur tour de chaque joueur sur ce
    circuit, pris dans ses records (data/riviere/records.json, étape 2). Rien de nouveau à envoyer : un record du circuit du jour part avec la
    séance, comme sur n'importe quel circuit.
Aucune donnée de santé : un pseudo, des couleurs, un temps de tour, une machine."""
import datetime as dt
import hashlib

CHEMIN = "data/riviere/jour/{}.json"
MACHINES = ("rameur", "velo", "elliptique")
ANCIENS = ("eau", "terre")  # les fichiers d'avant le 25/11 : un circuit pour l'eau, un pour la terre


def _des(jour, quoi):
    """Un tirage propre à la date (et à ce qu'on tire) : un nombre entre 0 et 1, le même sur toutes les machines."""
    return int(hashlib.sha256(f"{jour}|{quoi}".encode()).hexdigest()[:8], 16) / 0xFFFFFFFF


def _un(jour, quoi, liste):
    return liste[int(_des(jour, quoi) * len(liste)) % len(liste)]


def _chacun_son_tour(jour, quoi, liste):
    """Chaque valeur de la liste (3 au moins) revient autant de fois que les autres, dans un ordre mélangé, jamais deux jours de suite."""
    n, k = dt.date.fromisoformat(str(jour)).toordinal(), len(liste)

    def ordre(bloc):
        return sorted(range(k), key=lambda i: _des(bloc, f"{quoi}|{i}"))
    o, avant = ordre(n // k), ordre(n // k - 1)
    if o[0] == avant[-1]:
        o[0], o[1] = o[1], o[0]
    return liste[o[n % k]]


def id_du_jour(jour, machine):
    return f"jour-{machine}-{jour}"


def options(jour, machine, essai=0):
    """Les réglages du générateur pour ce jour et cette machine (`essai` : un autre tirage le même jour, si le premier ne passe pas le contrôle).
    Les mêmes boutons que « Créer un circuit → Générer » ; chaque machine a ses propres tirages, et ce qui change le plus (la forme, la longueur,
    le décor, le genre de ville) change d'un jour à l'autre."""
    jour = str(jour)

    def tour(quoi, liste):
        return _chacun_son_tour(jour, f"{machine}|{quoi}", liste)
    o = {"graine": int(jour.replace("-", "")) % 100000 * 10 + essai, "sinueux": int(_des(jour, f"{machine}|sinueux") < .5)}
    if machine == "rameur":
        o.update({"activite": "eau", "style": tour("forme", ["ile", "lac", "retour"]), "km": tour("km", [1.5, 2, 2, 2.5]), "nature": tour("nature", [.34, .5, .75]),
                  "denivele": 0, "sorte": tour("sorte", ["bourg", "pavillons", "immeubles"])})
    elif machine == "velo":
        o.update({"activite": "terre", "style": ["velo", "quais"][dt.date.fromisoformat(jour).toordinal() % 2], "km": tour("km", [2.5, 3, 3.5]), "nature": tour("nature", [.34, .5, .75]),
                  "denivele": tour("relief", [0, 15, 35]), "sorte": tour("sorte", ["bourg", "pavillons", "immeubles"])})
    else:  # à pied, au marcheur elliptique : des km de décor (1 km = 0,65 km de jambes environ)
        o.update({"activite": "terre", "style": "pied", "km": tour("km", [.9, 1.1, 1.3, 1.5]), "nature": tour("nature", [0, .5, .7]), "denivele": tour("relief", [0, 12, 25]),
                  "sorte": tour("sorte", ["bourg", "pavillons", "immeubles", "coteau"])})
        o.pop("sinueux")
    return o


def ambiance(jour, machine):
    """L'heure et le temps prévus ce jour-là (le menu peut toujours en choisir d'autres)."""
    return {"heure": _un(jour, f"{machine}|heure", ["jour", "jour", "jour", "matin", "soir"]), "meteo": _un(jour, f"{machine}|meteo", ["beau", "beau", "beau", "nuages", "variable"])}


def preparer(niveau, jour, machine):
    """Le circuit tel qu'il est rangé : il garde son nom (« Le lac aux Roseaux »), avec son identifiant du jour, l'heure et le temps prévus."""
    niveau = dict(niveau)
    niveau.update({"id": id_du_jour(jour, machine), "jour": str(jour), "machines": [machine]})
    niveau.update({k: v for k, v in ambiance(jour, machine).items() if v not in ("jour", "beau")})
    return niveau


def classement(fichier_jour, records_par_joueur, dresseurs, moi):
    """{circuit (sa machine) : {machine: [{nom, t, moi, couleurs}, …] du plus rapide au plus lent}} : le meilleur tour de chaque joueur sur le circuit du jour.
    records_par_joueur = {ident: contenu de son data/riviere/records.json} ; dresseurs = {ident: sa carte publiée (pseudo, couleurs)}."""
    out = {}
    for act in MACHINES + ANCIENS:
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
    """Ce que la page reçoit (D.jour) : les circuits du jour et leur classement. None s'il n'y a pas (encore) de circuit du jour."""
    if not fichier_jour:
        return None
    circuits = [fichier_jour[a] for a in MACHINES + ANCIENS if isinstance(fichier_jour.get(a), dict) and fichier_jour[a].get("pieces")]
    return {"jour": fichier_jour.get("jour"), "circuits": circuits, "classement": classe or {}} if circuits else None
