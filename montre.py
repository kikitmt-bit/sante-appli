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
    paquets = lire([PAQUET.format(n) for n in sorted({c["num"] for c in a_ouvrir + derniere})])
    m, ic_nom = etat["mesures"], etat["origine"]
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
    }


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

    def lire(chemins):
        with ThreadPoolExecutor(8) as ex:
            return dict(zip(chemins, ex.map(un, chemins)))
    return lire


def sans_heure(texte):
    return {k: v for k, v in json.loads(texte).items() if k != "maj"} if texte else None


def ecrire_github(session, texte):
    """Écrit montre.json dans la branche data, seulement s'il a changé (à part l'heure)."""
    url = f"https://api.github.com/repos/{DEPOT}/contents/{MONTRE}"
    for essai in range(3):  # 409 : la branche a bougé entre-temps (récolte du script Google), on réessaie
        r = session.get(url, params={"ref": "data"}, timeout=60)
        avant = r.json() if r.status_code == 200 else None
        if avant and sans_heure(base64.b64decode(avant["content"]).decode("utf-8")) == sans_heure(texte):
            return "inchangé"
        corps = {"message": "montre", "branch": "data", "content": base64.b64encode(texte.encode()).decode()}
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
        texte = json.dumps(contenu(lecteur_github(session), maintenant), ensure_ascii=False, separators=(",", ":"))
        print("montre.json :", ecrire_github(session, texte))
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
