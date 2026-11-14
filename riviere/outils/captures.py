"""Captures de référence de La Rivière : chaque circuit à 10 endroits figés, dans un Chrome sans fenêtre.
    python riviere/outils/captures.py ref            -> écrit les images de référence dans riviere/outils/captures/ref/ (HORS dépôt : .gitignore)
    python riviere/outils/captures.py compare        -> refait les images, les compare aux références, dit ce qui a changé (images dans .../neuf/ et .../diff/)
    options : --niveau <nom> (un seul circuit), --tolerance 1.5 (% de pixels qui peuvent différer avant l'alerte)
Le décor est semé par le niveau : à code identique, les images sont identiques (l'eau et le ciel étant figés par ?fige=1)."""
import argparse
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ICI = Path(__file__).resolve().parent
RACINE = ICI.parent
DOSSIER = ICI / "captures"
PORT = 8791
POINTS = 10
LARG, HAUT = 960, 540
sys.path.insert(0, str(RACINE))


def niveaux():
    return sorted(p.stem for p in (RACINE / "contenu" / "niveaux").glob("*.json"))


def ecart(a, b):
    from PIL import ImageChops
    d = ImageChops.difference(a, b).convert("L").point(lambda v: 255 if v > 24 else 0)
    return 100 * sum(d.histogram()[255:]) / (d.width * d.height)


def attendre_calme(pg, chemin, max_s=15):
    """La caméra et le nageur se posent lentement (surtout sur une machine sans carte graphique) : on ne garde l'image que quand deux prises
    de suite sont presque identiques."""
    import io
    from PIL import Image
    avant, t0 = None, time.time()
    while True:
        pg.wait_for_timeout(600)
        im = Image.open(io.BytesIO(pg.screenshot())).convert("RGB")
        if (avant is not None and ecart(avant, im) < .08) or time.time() - t0 > max_s:
            im.save(chemin)
            return
        avant = im


def prendre(dossier, noms):
    from playwright.sync_api import sync_playwright
    dossier.mkdir(parents=True, exist_ok=True)
    srv = subprocess.Popen([sys.executable, str(RACINE / "serveur.py"), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                urllib.request.urlopen(f"http://localhost:{PORT}/?niveau=essai", timeout=2).read(10)
                break
            except Exception:
                time.sleep(.3)
        with sync_playwright() as p:
            nav = p.chromium.launch(channel="chrome", headless=True, args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
            pg = nav.new_page(viewport={"width": LARG, "height": HAUT})
            for nom in noms:
                url = f"http://localhost:{PORT}/?niveau={nom}&s=0&fige=1&h=432"
                pg.goto(url)
                pg.wait_for_function("window.__pret !== undefined", timeout=60000)
                long_ = pg.evaluate("LONG")
                for i in range(POINTS):
                    s = round(long_ * i / POINTS) + 6
                    pg.evaluate(f"window.__aller({s})")
                    attendre_calme(pg, dossier / f"{nom}-{i:02d}.png")
                print(nom, long_, "m :", POINTS, "images", flush=True)
            nav.close()
    finally:
        srv.terminate()


def comparer(tol):
    from PIL import Image, ImageChops
    ref, neuf, diff = DOSSIER / "ref", DOSSIER / "neuf", DOSSIER / "diff"
    diff.mkdir(parents=True, exist_ok=True)
    mauvais = 0
    for f in sorted(ref.glob("*.png")):
        g = neuf / f.name
        if not g.exists():
            continue
        a, b = Image.open(f).convert("RGB"), Image.open(g).convert("RGB")
        d = ImageChops.difference(a, b).convert("L").point(lambda v: 255 if v > 24 else 0)
        pct = 100 * sum(d.histogram()[255:]) / (d.width * d.height)
        if pct > tol:
            mauvais += 1
            d.save(diff / f.name)
            print(f"CHANGÉ  {f.name} : {pct:.2f} % des pixels")
    print("identiques" if not mauvais else f"{mauvais} image(s) changée(s) : voir {diff}")
    return mauvais


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("quoi", choices=["ref", "compare"])
    ap.add_argument("--niveau")
    ap.add_argument("--tolerance", type=float, default=1.5)
    a = ap.parse_args()
    noms = [a.niveau] if a.niveau else niveaux()
    if a.quoi == "ref":
        prendre(DOSSIER / "ref", noms)
    else:
        prendre(DOSSIER / "neuf", noms)
        sys.exit(1 if comparer(a.tolerance) else 0)
