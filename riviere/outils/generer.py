"""Le générateur de circuits de La Rivière, SANS navigateur (étape 4 du plan) : le même code que l'onglet « Générer » du jeu, lancé avec node.
    python riviere/outils/generer.py --notes                         -> la note de chaque circuit du jeu, avec ses raisons
    python riviere/outils/generer.py --notes vitrine                 -> un seul circuit, en détail (ses séquences de paysage)
    python riviere/outils/generer.py --km 2 --avec lac,grotte,pont   -> tire, construit, note, garde le meilleur ; écrit son bilan
        options : --activite eau|terre, --virages droit|quelques|sinueux|tres, --denivele 15, --forme boucle|ouvert|huit, --graine 1,
                  --tirages 8 (les tirages valables comparés : plus il y en a, meilleur est le circuit gardé, plus c'est long), --nom "…"
        --ecrire <nom> : range le circuit dans contenu/niveaux/<nom>.json, seulement si le moteur le construit sans défaut (le contrôle des tests)
        --json : écrit le circuit (son texte) au lieu du bilan
Mêmes options, même circuit, sur toutes les machines : la recherche compte ses tirages, jamais le temps.
Il faut node (sur ce PC : export PATH="/c/Users/kikit/Android/node-v26.13.1-win-arm64:$PATH")."""
import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RACINE))
import page  # noqa: E402


def _node(programme, marque):
    """Lance un programme JavaScript avec node et rend l'objet écrit sur la ligne qui commence par `marque`."""
    if not shutil.which("node"):
        raise SystemExit("node est introuvable : voir en tête de ce fichier.")
    with tempfile.TemporaryDirectory() as d:
        f = Path(d) / "programme.js"
        f.write_text(programme, encoding="utf-8")
        r = subprocess.run(["node", str(f)], capture_output=True, text=True, encoding="utf-8", timeout=900)
    if r.returncode:
        raise RuntimeError(r.stderr[-1500:])
    return json.loads([ligne for ligne in r.stdout.splitlines() if ligne.startswith(marque + " ")][-1][len(marque) + 1:])


def generer(options):
    """Un circuit : {niveau, note, long, retour, essais, bons}, ou {erreur}."""
    return _node(page.generateur(options), "CIRCUIT")


def bilan(niveau=None, circuit=None):
    """Le contrôle complet d'un circuit (piste, sol, décor posé) et sa note : celui d'un fichier du jeu, ou d'un circuit pas encore écrit."""
    return _node(page.controle(niveau or "essai", circuit=circuit), "BILAN")


def defauts(b):
    """Ce qui empêche d'écrire un circuit dans le jeu : les mêmes exigences que tests/test_riviere.py."""
    d = list(b.get("erreurs") or [])
    if b.get("absurdes"):
        d.append("des hauteurs de sol absurdes")
    if b.get("cassures"):
        d.append(f"des cassures dans le sol (la pire : {b['pire']} m)")
    if b.get("poses", 0) <= 100:
        d.append("presque aucun décor posé")
    return d


def texte_note(n, detail=False):
    lignes = [f"  {c['nom']:<14}{c['note']:>4}   {c['phrase']}" for c in n["criteres"]]
    if detail:
        lignes.append("  Les paysages, dans l'ordre : " + " | ".join(f"{s['paysage']} {s['t']} s" for s in n["sequences"]))
    return "\n".join(lignes)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--notes", nargs="*", metavar="circuit")
    ap.add_argument("--km", type=float, default=2)
    ap.add_argument("--activite", choices=["eau", "terre"], default="eau")
    ap.add_argument("--virages", choices=["droit", "quelques", "sinueux", "tres"], default="quelques")
    ap.add_argument("--denivele", type=float, default=15)
    ap.add_argument("--forme", choices=["boucle", "ouvert", "huit"], default="boucle")
    ap.add_argument("--avec", default="")
    ap.add_argument("--graine", type=int, default=1)
    ap.add_argument("--tirages", type=int, default=8)
    ap.add_argument("--nom")
    ap.add_argument("--ecrire", metavar="nom")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    if a.notes is not None:
        noms = a.notes or sorted(f.stem for f in (RACINE / "contenu" / "niveaux").glob("*.json"))
        notes = {nom: bilan(nom)["note"] for nom in noms}
        for nom in sorted(noms, key=lambda k: -notes[k]["note"]):
            print(f"{notes[nom]['note']:>3} / 100   {nom}   (un tour : {notes[nom]['duree'] // 60} min {notes[nom]['duree'] % 60:02d})")
            print(texte_note(notes[nom], detail=len(noms) == 1))
        sys.exit(0)
    o = {"km": a.km, "activite": a.activite, "virages": a.virages, "denivele": a.denivele, "forme": a.forme, "boucle": a.forme != "ouvert",
         "avec": {k: True for k in a.avec.split(",") if k}, "graine": a.graine, "tirages": a.tirages}
    if a.nom:
        o["nom"] = a.nom
    r = generer(o)
    if r.get("erreur"):
        raise SystemExit(r["erreur"])
    niveau = r["niveau"]
    if a.ecrire:
        niveau["id"] = re.sub(r"[^a-z0-9-]", "", a.ecrire.lower())[:40]
    b = bilan(circuit=niveau)
    mauvais = defauts(b)
    if a.json:
        print(json.dumps(niveau, ensure_ascii=False, indent=1))
    else:
        print(f"{r['note']['note']} / 100   « {niveau['nom']} » : {r['long']} m de décor, le meilleur de {r['bons']} tirages valables ({r['essais']} essayés)")
        print(texte_note(r["note"], detail=True))
        print("  Contrôle du moteur : " + ("sans défaut" if not mauvais else " ; ".join(mauvais)) + f" ({b['poses']} objets posés, {b['triangles']} triangles)")
    if a.ecrire:
        if mauvais:
            raise SystemExit("Pas écrit : " + " ; ".join(mauvais))
        f = RACINE / "contenu" / "niveaux" / (niveau["id"] + ".json")
        f.write_text(json.dumps(niveau, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"Écrit : {f.relative_to(RACINE.parent)}", file=sys.stderr)
