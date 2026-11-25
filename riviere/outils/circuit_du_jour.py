"""Fabrique les circuits du jour de « La Rivière » (étape 5 du plan ; refait le 25/11) : un par machine, avec les générateurs de chacune, sans navigateur.
    python riviere/outils/circuit_du_jour.py                     -> ceux d'aujourd'hui (heure de Paris) : bilan à l'écran
    python riviere/outils/circuit_du_jour.py --jour 2026-11-16   -> ceux d'un autre jour
    python riviere/outils/circuit_du_jour.py --sortie f.json      -> les écrit dans un fichier (le serveur d'essai : riviere/outils/jour-essai.json, ?jour=1)
    SANTE_TOKEN=… python riviere/outils/circuit_du_jour.py github -> écrit ceux d'aujourd'hui ET de demain dans la branche data du dépôt privé
Le même jour donne toujours les mêmes circuits (graine et réglages tirés de la date : riviere/jour.py). Un tirage que le contrôle complet du
moteur refuse (sol, décor) est remplacé par le suivant du même jour (4 essais). Un jour déjà écrit en entier n'est jamais refait : un circuit
ne change pas en cours de journée, même si un générateur a changé. Il faut node (voir generer.py)."""
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


def un_circuit(jour, machine, dire=print):
    """Le circuit du jour d'une machine, contrôlé ; None si aucun des 4 essais ne passe."""
    for essai in range(4):
        o = J.options(jour, machine, essai)
        r = generer.generer(o)
        if r.get("erreur"):
            dire(f"  {machine}, essai {essai + 1} : {r['erreur']}")
            continue
        niveau = J.preparer(r["niveau"], jour, machine)
        mauvais = generer.defauts(generer.bilan(circuit=niveau))
        if mauvais:
            dire(f"  {machine}, essai {essai + 1} : refusé ({' ; '.join(mauvais)})")
            continue
        dire(f"  {machine} : « {niveau['nom']} » ({o['style']}, {o['sorte']}, nature {o['nature']}), {r['long']} m de décor")
        return niveau
    return None


def fabriquer(jour, dire=print):
    out = {"jour": str(jour), "fait": dt.datetime.now(ZoneInfo("Europe/Paris")).isoformat(timespec="seconds")}
    for m in J.MACHINES:
        n = un_circuit(jour, m, dire)
        if n:
            out[m] = n
    return out


def deja_la(chemin):
    """Ce jour est-il déjà écrit en entier dans la branche data ?"""
    import requests
    r = requests.get(f"https://api.github.com/repos/{DEPOT}/contents/{chemin}", params={"ref": "data"}, timeout=60,
                     headers={"Authorization": f"Bearer {os.environ['SANTE_TOKEN']}", "Accept": "application/vnd.github.raw+json"})
    return r.status_code == 200 and all(m in r.json() for m in J.MACHINES)


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
    if a.ou == "github" and not os.environ.get("SANTE_TOKEN"):
        raise SystemExit("Secret SANTE_TOKEN absent : rien d'écrit.")
    rates = 0
    for j in (jour, jour + dt.timedelta(days=1)) if a.ou == "github" else (jour,):
        if a.ou == "github" and deja_la(J.CHEMIN.format(j)):
            print(f"Circuits du {j} : déjà là.")
            continue
        print(f"Circuits du jour du {j} :")
        f = fabriquer(j)
        if not any(m in f for m in J.MACHINES):
            print("Aucun circuit n'a passé le contrôle : rien d'écrit (l'appli garde ceux de la veille).")
            rates += 1
            continue
        texte = json.dumps(f, ensure_ascii=False, separators=(",", ":"))
        if a.ou == "github":
            ecrire_github(J.CHEMIN.format(j), texte)
            print(f"Écrit dans la branche data ({len(texte) // 1024} Ko).")
        elif a.sortie:
            Path(a.sortie).write_text(texte, encoding="utf-8")
            print(f"Écrit : {a.sortie} ({len(texte) // 1024} Ko)")
    if rates:
        raise SystemExit(1)
