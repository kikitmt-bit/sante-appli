"""L'inspection d'un circuit de La Rivière (24/11) : une image tous les 10 m, telles que le joueur les voit, rangées en planches numérotées.
    python riviere/outils/inspecter.py ville-jadielle                  -> tout le tour, une vue tous les 10 m
    python riviere/outils/inspecter.py vitrine --pas 15 --de 200 --a 600
    options : --machine rameur|elliptique|velo (sinon celle du circuit), --vues jeu|dessus|gauche|droite (séparées par des virgules), --heure nuit,
              --cols 4 --rangs 5 (une planche), --large 480, --voie 1 (la voie « force » des fourches), --dossier <chemin>
Images dans riviere/outils/inspection/ (HORS dépôt). À regarder une à une AVANT de donner un circuit à Kiki : objets qui flottent, jointures, trous,
sols qui changent sans raison, chemins qu'aucun piéton ne prendrait. Ce qu'un calcul peut voir est refusé avant (planControle, defauts.js) ; ceci est pour le reste."""
import argparse
import io
import json
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ICI = Path(__file__).resolve().parent
RACINE = ICI.parent
sys.path.insert(0, str(ICI))
from captures import port_libre  # noqa: E402


def inspecter(niveau, pas=10, de=0, a=None, machine=None, vues=("jeu",), cols=4, rangs=5, large=480, dossier=None, heure=None, voie=None, alt=45):
    from PIL import Image, ImageDraw, ImageFont
    from playwright.sync_api import sync_playwright
    dossier = Path(dossier or ICI / "inspection")
    dossier.mkdir(parents=True, exist_ok=True)
    niv = json.loads((RACINE / "contenu" / "niveaux" / f"{niveau}.json").read_text(encoding="utf-8"))
    machine = machine or (niv.get("machines") or ["velo" if niv.get("discipline") == "terre" else "rameur"])[0]
    port = port_libre()
    srv = subprocess.Popen([sys.executable, str(RACINE / "serveur.py"), str(port)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    planches, haut = [], round(large * 9 / 16)
    police = ImageFont.truetype("arial.ttf", 15) if sys.platform == "win32" else ImageFont.load_default()
    try:
        for _ in range(60):
            try:
                urllib.request.urlopen(f"http://localhost:{port}/?niveau={niveau}", timeout=10).read(10)
                break
            except Exception:
                time.sleep(.3)
        with sync_playwright() as p:
            nav = p.chromium.launch(channel="chrome", headless=True, args=["--ignore-gpu-blocklist", "--enable-gpu"])
            pg = nav.new_page(viewport={"width": 960, "height": 540})
            erreurs = []
            pg.on("pageerror", lambda e: erreurs.append(str(e)))
            pg.on("console", lambda m: erreurs.append(m.text) if m.type in ("error", "warning") and "GL Driver" not in m.text else None)
            for vue in vues:
                url = f"http://localhost:{port}/?niveau={niveau}&machine={machine}&s=0&fige=1&h=540" + (f"&vue={vue}&alt={alt}" if vue != "jeu" else "") + (f"&heure={heure}" if heure else "") + (f"&voie={voie}" if voie is not None else "")
                pg.goto(url, timeout=120000)
                pg.wait_for_function("window.__pret !== undefined", timeout=120000)
                pg.add_style_tag(content="body > *:not(canvas) { display: none !important }")
                long_, images = pg.evaluate("LONG"), []
                for s in range(int(de), int(a if a is not None else long_), int(pas)):
                    pg.evaluate(f"window.__aller({s}); for (let k = 0; k < 3; k++) window.__image();")
                    im = Image.open(io.BytesIO(pg.locator("canvas").first.screenshot())).convert("RGB").resize((large, haut), Image.LANCZOS)
                    d = ImageDraw.Draw(im)
                    d.rectangle((0, 0, 64, 20), fill=(20, 20, 30))
                    d.text((5, 2), f"{s} m", fill="white", font=police)
                    images.append(im)
                n = cols * rangs
                for k in range(0, len(images), n):
                    lot = images[k:k + n]
                    planche = Image.new("RGB", (cols * large, -(-len(lot) // cols) * haut), "white")
                    for j, im in enumerate(lot):
                        planche.paste(im, (j % cols * large, j // cols * haut))
                    f = dossier / f"{niveau}-{vue}-{k // n + 1:02d}.png"
                    planche.save(f)
                    planches.append(f)
            for e in dict.fromkeys(erreurs):
                print("ERREUR", e[:400])
            nav.close()
    finally:
        srv.terminate()
    return planches


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("niveau")
    for nom, t, v in (("pas", float, 10), ("de", float, 0), ("a", float, None), ("cols", int, 4), ("rangs", int, 5), ("large", int, 480), ("alt", float, 45)):
        ap.add_argument("--" + nom, type=t, default=v)
    ap.add_argument("--machine")
    ap.add_argument("--vues", default="jeu")
    ap.add_argument("--heure")
    ap.add_argument("--voie")
    ap.add_argument("--dossier")
    o = vars(ap.parse_args())
    o["vues"] = o["vues"].split(",")
    for f in inspecter(o.pop("niveau"), **o):
        print(f)
