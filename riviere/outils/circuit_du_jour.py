"""Fabrique le circuit du jour de « La Rivière » (étape 5 du plan) : un pour l'eau, un pour la terre, avec le générateur noté, sans navigateur.
    python riviere/outils/circuit_du_jour.py                     -> celui d'aujourd'hui (heure de Paris) : bilan à l'écran
    python riviere/outils/circuit_du_jour.py --jour 2026-11-16   -> celui d'un autre jour
    python riviere/outils/circuit_du_jour.py --sortie f.json      -> l'écrit dans un fichier (le serveur d'essai : riviere/outils/jour-essai.json, ?jour=1)
    SANTE_TOKEN=… python riviere/outils/circuit_du_jour.py github -> l'écrit dans la branche data du dépôt privé (GitHub Actions, chaque nuit)
Le même jour donne toujours le même circuit (graine et réglages tirés de la date : riviere/jour.py). Un tirage que le contrôle complet du
moteur refuse (sol, décor) est remplacé par le suivant du même jour (4 essais). Il faut node (voir generer.py)."""
import argparse
import base64
import datetime as dt
import json
import os
import sys
from pathlib import Path
from zoneinfo import ZoneInfo

ICI = Path(__file__).resolve().parent
sys.path.insert(0, str(ICI))
sys.path.insert(0, str(ICI.parent))
import generer  # noqa: E402
import jour as J  # noqa: E402  (riviere/jour.py)

DEPOT = "kikitmt-bit/sante"


def un_circuit(jour, activite, dire=print):
    """Le circuit du jour d'une activité, contrôlé ; None si aucun des 4 essais ne passe."""
    for essai in range(4):
        r = generer.generer(J.options(jour, activite, essai))
        if r.get("erreur"):
            dire(f"  {activite}, essai {essai + 1} : {r['erreur']}")
            continue
        niveau = J.preparer(r["niveau"], jour, activite, r["note"]["note"])
        mauvais = generer.defauts(generer.bilan(circuit=niveau))
        if r.get("sol") and not r["sol"].get("ok"):
            mauvais.append("une marche dans le sol")
        if mauvais:
            dire(f"  {activite}, essai {essai + 1} : refusé ({' ; '.join(mauvais)})")
            continue
        dire(f"  {activite} : {r['note']['note']} / 100, {r['long']} m de décor, avec {', '.join(J.options(jour, activite, essai)['avec'])}")
        return niveau
    return None


def fabriquer(jour, dire=print):
    out = {"jour": str(jour), "fait": dt.datetime.now(ZoneInfo("Europe/Paris")).isoformat(timespec="seconds")}
    for act in J.ACTIVITES:
        n = un_circuit(jour, act, dire)
        if n:
            out[act] = n
    return out


def ecrire_github(chemin, texte):
    import requests
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {os.environ['SANTE_TOKEN']}", "Accept": "application/vnd.github+json"})
    url = f"https://api.github.com/repos/{DEPOT}/contents/{chemin}"
    for _ in range(3):  # 409 : la branche a bougé entre-temps (une récolte), on réessaie
        r = s.get(url, params={"ref": "data"}, timeout=60)
        corps = {"message": "riviere : circuit du jour", "branch": "data", "content": base64.b64encode(texte.encode()).decode()}
        if r.status_code == 200:
            corps["sha"] = r.json()["sha"]
        r = s.put(url, json=corps, timeout=60)
        if r.status_code in (200, 201):
            return
        if r.status_code != 409:
            r.raise_for_status()
    raise RuntimeError("GitHub refuse l'écriture (409 trois fois)")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ou", nargs="?", choices=["github"])
    ap.add_argument("--jour")
    ap.add_argument("--sortie")
    a = ap.parse_args()
    jour = dt.date.fromisoformat(a.jour) if a.jour else dt.datetime.now(ZoneInfo("Europe/Paris")).date()
    print(f"Circuit du jour du {jour} :")
    f = fabriquer(jour)
    if not any(k in f for k in J.ACTIVITES):
        raise SystemExit("Aucun circuit n'a passé le contrôle : rien d'écrit (l'appli garde celui de la veille).")
    texte = json.dumps(f, ensure_ascii=False, separators=(",", ":"))
    if a.ou == "github":
        if not os.environ.get("SANTE_TOKEN"):
            raise SystemExit("Secret SANTE_TOKEN absent : rien d'écrit.")
        ecrire_github(J.CHEMIN.format(jour), texte)
        print(f"Écrit dans la branche data ({len(texte) // 1024} Ko).")
    elif a.sortie:
        Path(a.sortie).write_text(texte, encoding="utf-8")
        print(f"Écrit : {a.sortie}")
