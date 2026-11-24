"""L'empreinte chiffrée de chaque circuit (24/11) : sa piste, son sol, tout son décor posé, maillages compris. Pour prouver qu'un chantier n'a rien changé aux autres.
    python riviere/outils/empreintes.py ref       -> avant le chantier : garde les empreintes (outils/captures/empreintes.json, hors dépôt)
    python riviere/outils/empreintes.py compare   -> après : dit circuit par circuit si c'est identique
Il faut node (sur ce PC : export PATH="/c/Users/kikit/Android/node-v26.13.1-win-arm64:$PATH"). Environ une minute."""
import json
import sys
from pathlib import Path

ICI = Path(__file__).resolve().parent
RACINE = ICI.parent
sys.path.insert(0, str(ICI))
sys.path.insert(0, str(RACINE))
import page  # noqa: E402
from generer import _node  # noqa: E402

FICHIER = ICI / "captures" / "empreintes.json"
AJOUT = r"""
;(() => { const P = PISTE, h = {v: 2166136261}, m = x => { h.v ^= Math.round(x * 1000) | 0; h.v = Math.imul(h.v, 16777619); };
  for (const k of ["X", "Y", "Z", "H", "W", "PENTE", "ALL", "VR"]) for (let i = 0; i < P[k].length; i++) m(P[k][i]); const piste = h.v >>> 0;
  h.v = 2166136261; const G = CASES; if (P.N < 6000) for (let x = G.xa - 60; x < G.xb + 60; x += 7) for (let z = G.za - 60; z < G.zb + 60; z += 7) { m(hauteur(x, z)); m(hSol(x, z)); } const sol = h.v >>> 0;
  let decor = 0, n = 0; if (!TRONCONS) { h.v = 2166136261; for (const F of poserDecor().values()) for (const A of [F.p, F.n, F.c, F.m]) { for (let i = 0; i < A.length; i++) m(A[i]); n += A.length; } decor = h.v >>> 0; }
  console.log("SIGNATURE " + JSON.stringify({piste, sol, decor, n})); })();
"""


def empreintes():
    r = {}
    for f in sorted((RACINE / "contenu" / "niveaux").glob("*.json")):
        r[f.stem] = _node(page.controle(f.stem) + AJOUT, "SIGNATURE")
    return r


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    e = empreintes()
    if sys.argv[1:] == ["ref"]:
        FICHIER.parent.mkdir(exist_ok=True)
        FICHIER.write_text(json.dumps(e, indent=1), encoding="utf-8")
        print(len(e), "circuits :", FICHIER)
    else:
        ref = json.loads(FICHIER.read_text(encoding="utf-8"))
        for k in sorted(set(ref) | set(e)):
            print(f"{k:<20}", "identique" if ref.get(k) == e.get(k) else "nouveau" if k not in ref else "retiré" if k not in e else "DIFFÉRENT : " + ", ".join(q for q in e[k] if e[k][q] != ref[k][q]))
