"""Une ville libre (moteur/zone.js, étape 13 du plan) : du dessin de l'auteur au circuit du jeu.
    python riviere/outils/zone.py ville-hauts            -> lit outils/zones/ville-hauts.json, pose le parcours, écrit contenu/niveaux/ville-hauts.json,
                                                            le contrôle (sol, parcours, 45 m, objets) et dessine son plan (outils/planches/, hors dépôt)
    options : --essai (n'écrit rien dans le jeu), --pas 0.5 (finesse du plan dessiné)
Le dessin : des voies (des points arrondis, quelques hauteurs), des places, des objets, et les étapes du parcours (voir jeu/villes.js, cheminDeZone).
Il faut node (sur ce PC : export PATH="/c/Users/kikit/Android/node-v26.13.1-win-arm64:$PATH")."""
import argparse
import json
import sys
from pathlib import Path

ICI = Path(__file__).resolve().parent
RACINE = ICI.parent
sys.path.insert(0, str(ICI))
sys.path.insert(0, str(RACINE))
import page  # noqa: E402
from generer import _node, defauts  # noqa: E402

COULEURS = {"chaussee": "#5E5F63", "passage": "#E8E6DF", "trottoir": "#CDC8BC", "place": "#BFB4A3", "allee": "#D9BC88", "chemin": "#B0804E", "jardin": "#9BD672", "pelouse": "#86C860", "dehors": "#5FA04C"}

VUE = r"""
;(() => { const P = PLAN, Z = P.zone, PAS = %s, o = {x0: Z.xa, z0: Z.za, nx: Math.ceil((Z.xb - Z.xa) / PAS), nz: Math.ceil((Z.zb - Z.za) / PAS), pas: PAS, noms: ["chaussee", "passage", "trottoir", "place", "allee", "chemin", "jardin", "pelouse", "dehors"], n: "", h: []};
  for (let j = 0; j < o.nz; j++) for (let i = 0; i < o.nx; i++) o.n += o.noms.indexOf(P.nature(o.x0 + i * PAS, o.z0 + j * PAS));
  for (let j = 0; j < o.nz; j += 4) for (let i = 0; i < o.nx; i += 4) o.h.push(+Z.sol(o.x0 + i * PAS, o.z0 + j * PAS).toFixed(2));
  o.objets = P.objets.map(q => ({o: q.o, x: q.x, z: q.z, lacet: q.lacet || 0, l: q.l, p: q.p, r: q.r, haie: q.haie, masse: q.masse, axe: q.boiteX}));
  o.route = Array.from({length: PISTE.N}, (_, i) => [+PISTE.X[i].toFixed(2), +PISTE.Z[i].toFixed(2), +PISTE.Y[i].toFixed(4)]);
  o.evts = evenementsZone(); o.vide = videZone(); o.noeuds = Z.noeuds; o.passages = P.passages.map(p => ({x: p.x, z: p.z, dx: p.dx, dz: p.dz, l: p.l, w: p.w, route: p.route}));
  console.log("VUE " + JSON.stringify(o)); })();
"""


def niveau_de(dessin):
    """Le niveau du jeu, à partir du dessin de l'auteur (jeu/villes.js : niveauDeZone)."""
    js = page.AVANT_NODE % '""' + "\n" + "\n".join(page._module("moteur", m) for m in ("outils",)) + "\n" + page._module("jeu", "villes")
    return _node(js + "\nconsole.log('NIVEAU ' + JSON.stringify(niveauDeZone(" + json.dumps(dessin, ensure_ascii=False) + ")));\n", "NIVEAU")


def plan(v, fichier, ech=5):
    """Le plan vu du ciel : le sol, les objets, le parcours coloré par sa pente, les courbes de niveau."""
    from PIL import Image, ImageDraw, ImageFont
    import math
    k = ech * v["pas"]
    im = Image.new("RGB", (v["nx"], v["nz"]))
    im.putdata([tuple(int(COULEURS[v["noms"][int(c)]][a:a + 2], 16) for a in (1, 3, 5)) for c in v["n"]])
    im = im.resize((round(v["nx"] * k), round(v["nz"] * k)), Image.NEAREST)
    d = ImageDraw.Draw(im)
    pt = lambda x, z: ((x - v["x0"]) * ech, (z - v["z0"]) * ech)  # noqa: E731
    nx = -(-v["nx"] // 4)
    H = v["h"]
    for j in range(len(H) // nx - 1):   # les courbes de niveau, tous les mètres
        for i in range(nx - 1):
            a, b, c = H[j * nx + i], H[j * nx + i + 1], H[(j + 1) * nx + i]
            for q in (b, c):
                if math.floor(a) != math.floor(q):
                    x, z = (i * 4 + (2 if q is b else 0)) * k, (j * 4 + (2 if q is c else 0)) * k
                    gros = max(math.floor(a), math.floor(q)) % 5 == 0
                    d.ellipse((x - 1 - gros, z - 1 - gros, x + 1 + gros, z + 1 + gros), fill="#7A4A20" if gros else "#B58A58")
    for q in v["objets"]:
        x, z = pt(q["x"], q["z"])
        if q.get("l"):
            c, s, l, p = math.cos(q["lacet"]), math.sin(q["lacet"]), q["l"] / 2, q["p"] / 2
            coins = [pt(q["x"] + a * l * c + b * p * s, q["z"] - a * l * s + b * p * c) for a, b in ((1, 1), (1, -1), (-1, -1), (-1, 1))]
            d.polygon(coins, fill={"maison_pente": "#C8584A", "magasin_pente": "#4A78C8", "immeuble_pente": "#8A68B0", "voiture": "#E8C030"}.get(q["o"], "#2E7A3A"), outline="#402020" if not q.get("haie") else None)
        else:
            r = {"arbre": 2.3, "arbre_masse": 1.6, "arbre_bois": 1.2, "arbre_rue": 1.6}.get(q["o"], .5) * ech
            d.ellipse((x - r, z - r, x + r, z + r), fill={"arbre": "#3F8A3A", "arbre_masse": "#3A7A38", "arbre_bois": "#2E6A30", "arbre_rue": "#3F8A3A", "lampadaire": "#202020", "pokemon": "#FF00C0", "habitant": "#FF7000"}.get(q["o"], "#5FA050"))
    R = v["route"]
    for i in range(len(R)):
        a, b = R[i], R[(i + 1) % len(R)]
        pente = b[2] - a[2]
        coul = "#FFFFFF" if abs(pente) < .02 else "#FFD000" if abs(pente) < .05 else "#FF6000" if abs(pente) < .08 else "#E00000"
        d.line(pt(a[0], a[1]) + pt(b[0], b[1]), fill=coul, width=4)
    try:
        police = ImageFont.truetype("arial.ttf", 15)
    except OSError:
        police = ImageFont.load_default()
    for i in range(0, len(R), 50):
        d.text(pt(R[i][0] + 1, R[i][1]), f"{i} ({R[i][2]:.1f})", fill="#000080", font=police)
    for n in v["noeuds"]:
        x, z = pt(n["x"], n["z"])
        d.ellipse((x - 5, z - 5, x + 5, z + 5), outline="#FF00FF", width=2)
    fichier.parent.mkdir(exist_ok=True)
    im.save(fichier)


def fabriquer(nom, essai=False, pas=.5):
    dessin = json.loads((ICI / "zones" / f"{nom}.json").read_text(encoding="utf-8"))
    n = niveau_de(dessin)
    b = _node(page.controle(nom, circuit=n), "BILAN")
    v = _node(page.controle(nom, circuit=n) + VUE % pas, "VUE")
    f = ICI / "planches" / f"{nom}-plan.png"
    plan(v, f)
    if not essai:
        (RACINE / "contenu" / "niveaux" / f"{nom}.json").write_text(json.dumps(n, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    return n, b, v, f


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("nom")
    ap.add_argument("--essai", action="store_true")
    ap.add_argument("--pas", type=float, default=.5)
    o = ap.parse_args()
    n, b, v, f = fabriquer(o.nom, o.essai, o.pas)
    R = v["route"]
    print(f"{o.nom} : {len(R)} m de décor, hauteur {min(r[2] for r in R):.1f} à {max(r[2] for r in R):.1f} m, pente la plus forte {max(abs(R[(i + 1) % len(R)][2] - R[i][2]) for i in range(len(R))) * 100:.1f} %")
    print(f"  le plus long bout où rien ne se passe : {v['vide']['m']} m, à partir du mètre {v['vide']['i']}")
    print(f"  {b['triangles']} triangles de décor, {b['poses']} objets, {b['masse']} arbres au loin")
    for e in defauts(b):
        print("  DÉFAUT :", e)
    print("  plan :", f)
