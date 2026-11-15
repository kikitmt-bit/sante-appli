"""La planche d'un circuit de La Rivière (étape 4 du plan) : de quoi juger un circuit d'un coup d'œil, sans le parcourir.
    python riviere/outils/planche.py                -> une planche par circuit du jeu
    python riviere/outils/planche.py vitrine essai  -> seulement ces circuits
    options : --max 16 (vues au plus), --dossier <chemin>
Une planche = une image : en haut le nom, la note sur 100 et ses sept critères ; puis une vue au milieu de chaque paysage et une juste
avant chaque moment fort (saut, chute, grotte, pont…), avec l'instant du tour ; en bas la frise du tour : chaque paysage à sa vraie durée,
les repères au-dessus, les moments forts dessous. Tout vient de la note (jeu/note.js : `sequences`, `reperes`, `forts`) : rien d'inventé ici.
Images rangées dans riviere/outils/planches/ (HORS dépôt : .gitignore). Chrome sans fenêtre, comme les captures de référence : ~2 min par circuit.
Pour un circuit tiré par le générateur : `generer.py … --ecrire <nom>`, puis `planche.py <nom>`."""
import argparse
import io
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ICI = Path(__file__).resolve().parent
RACINE = ICI.parent
sys.path.insert(0, str(ICI))
from captures import attendre_calme, niveaux  # noqa: E402

PORT = 8792
LARG, HAUT = 960, 540          # la prise de vue (comme les captures de référence)
VIG_L, VIG_H = 400, 225        # une vignette
COLS = 4
MARGE = 16

# ce que la page calcule : la note, et pour chaque vue l'endroit (mètres de décor, pour __aller) et l'instant (secondes du tour)
JS_PLAN = """(max) => {
  const terre = (NIVEAU.discipline || (["terre", "goudron", "paves"].includes(NIVEAU.surface) ? "terre" : "eau")) === "terre";
  const v = terre ? RYTHME.terre : RYTHME.eau, N = PISTE.N, VR = PISTE.VR, duree = VR[N] / v;
  const note = noterCircuit(PISTE, NIVEAU, BIOME, TOUR_VRAI);
  const tDe = s => VR[Math.max(0, Math.min(N, Math.round(s)))] / v;
  const sDe = t => { let a = 0, b = N; const c = Math.max(0, Math.min(duree, t)) * v; while (b - a > 1) { const m = (a + b) >> 1; if (VR[m] < c) a = m; else b = m; } return a; };
  const seqs = note.sequences.map(q => { const fin = q.s1 < q.s0 ? q.s1 + N : q.s1; return {...q, t0: tDe(q.s0), t1: q.s1 < q.s0 ? tDe(q.s1) + duree : tDe(q.s1), sm: Math.round((q.s0 + fin) / 2) % N}; });
  const vues = seqs.map(q => ({s: q.sm, quoi: q.titre || q.paysage, sorte: "paysage", poids: q.t}));
  for (const f of note.forts) { const s = sDe(f.t), avant = ["saut", "plongée", "chute", "remontée", "cascade"].includes(f.quoi) ? 14 : 0;
    vues.push({s: (s - avant + N) % N, quoi: f.quoi, sorte: "fort", poids: 1e6}); }
  vues.sort((a, b) => b.poids - a.poids);   // les moments forts d'abord, puis les paysages les plus longs
  const gardees = [];
  for (const x of vues) { if (gardees.length >= max) break; if (gardees.some(g => Math.min(Math.abs(g.s - x.s), N - Math.abs(g.s - x.s)) < 25)) continue; gardees.push(x); }
  gardees.forEach(g => { g.t = tDe(g.s); }); gardees.sort((a, b) => a.t - b.t);
  return {nom: NIVEAU.nom || NIVEAU.id, terre, duree, note: note.note, criteres: note.criteres, sequences: seqs, reperes: note.reperes, forts: note.forts, vues: gardees};
}"""

# couleur d'une famille de paysage dans la frise (les noms de la note : « pre et foret », « ville », « grotte »…)
TEINTES = {"pre": "#8CC56B", "champ": "#CBD46A", "foret": "#3E8A4A", "plage": "#E8D39A", "mer": "#3F7FC4", "lac": "#62A9D9",
           "marais": "#6F8C5B", "roche": "#9A8F84", "calcaire": "#CFC8B4", "vide": "#5A5A66", "volcan": "#A8473A", "ville": "#D9A35E",
           "grotte": "#3A3248", "pont": "#B08A5A"}


def police(taille, gras=False):
    from PIL import ImageFont
    for nom in (["segoeuib.ttf", "arialbd.ttf"] if gras else ["segoeui.ttf", "arial.ttf"]):
        try:
            return ImageFont.truetype(nom, taille)
        except OSError:
            pass
    return ImageFont.load_default()


def temps(t):
    t = int(round(t))
    return f"{t // 60}:{t % 60:02d}"


def prendre(noms, maxi):
    """Les vues de chaque circuit : {nom: (plan, [images])}."""
    from playwright.sync_api import sync_playwright
    from PIL import Image
    srv = subprocess.Popen([sys.executable, str(RACINE / "serveur.py"), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    res = {}
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
                pg.goto(f"http://localhost:{PORT}/?niveau={nom}&s=0&fige=1&h=432")
                pg.wait_for_function("window.__pret !== undefined", timeout=60000)
                pg.add_style_tag(content=".hud,#carte,#profil,button,#credit,#voile{visibility:hidden!important}")   # les chiffres et le plan du jeu n'ont rien à faire sur la planche
                plan = pg.evaluate(JS_PLAN, maxi)
                images = []
                tmp = ICI / "planches" / "_vue.png"
                tmp.parent.mkdir(parents=True, exist_ok=True)
                for vue in plan["vues"]:
                    pg.evaluate(f"window.__aller({vue['s']})")
                    attendre_calme(pg, tmp, max_s=10)
                    images.append(Image.open(tmp).convert("RGB"))
                tmp.unlink(missing_ok=True)
                res[nom] = (plan, images)
                print(f"{nom} : {plan['note']} / 100, {len(images)} vues", flush=True)
            nav.close()
    finally:
        srv.terminate()
    return res


def frise(d, x0, y0, larg, plan):
    """Le tour en une bande : chaque paysage à sa durée (deux couleurs quand les deux rives diffèrent), repères dessus, moments forts dessous."""
    duree, f, fp = plan["duree"], police(15), police(13)
    H = 34
    X = lambda t: x0 + larg * (t % duree) / duree if t <= duree else x0 + larg * min(1, t / duree)
    for q in plan["sequences"]:
        parts = [TEINTES.get(w, "#BBBBBB") for w in q["paysage"].replace(" et ", " ").split()] or ["#BBBBBB"]
        morceaux = [(q["t0"], min(q["t1"], duree))] + ([(0, q["t1"] - duree)] if q["t1"] > duree else [])
        for a, b in morceaux:
            xa, xb = x0 + larg * a / duree, x0 + larg * b / duree
            for k, c in enumerate(parts):
                d.rectangle([xa, y0 + H * k / len(parts), xb, y0 + H * (k + 1) / len(parts)], fill=c)
            d.line([xa, y0, xa, y0 + H], fill="#22222A", width=1)
    d.rectangle([x0, y0, x0 + larg, y0 + H], outline="#22222A", width=2)
    # repères au-dessus (triangle), moments forts dessous (losange), avec leur nom en alternant les hauteurs pour qu'ils ne se recouvrent pas
    for liste, haut in ((plan["reperes"], True), (plan["forts"], False)):
        for i, r in enumerate(liste):
            x = x0 + larg * r["t"] / duree
            if haut:
                d.polygon([(x - 6, y0 - 12), (x + 6, y0 - 12), (x, y0 - 2)], fill="#E0B030", outline="#22222A")
                d.text((min(max(x, x0 + 40), x0 + larg - 40), y0 - 16 - 15 * (i % 2)), r["quoi"].replace("-", " "), font=fp, fill="#3A3A30", anchor="ms")
            else:
                yb = y0 + H
                d.polygon([(x, yb + 2), (x + 6, yb + 9), (x, yb + 16), (x - 6, yb + 9)], fill="#D83830", outline="#22222A")
                d.text((min(max(x, x0 + 40), x0 + larg - 40), yb + 31 + 15 * (i % 2)), r["quoi"], font=fp, fill="#3A3A30", anchor="ms")
    for k in range(0, int(duree) + 1, 60):   # une graduation par minute
        x = x0 + larg * k / duree
        d.line([x, y0 + H, x, y0 + H + 4], fill="#22222A")
    d.text((x0, y0 + H + 62), "0:00", font=f, fill="#686850")
    d.text((x0 + larg, y0 + H + 62), temps(duree), font=f, fill="#686850", anchor="ra")
    vus = []   # la légende : seulement les couleurs présentes
    for q in plan["sequences"]:
        for w in q["paysage"].replace(" et ", " ").split():
            if w in TEINTES and w not in vus:
                vus.append(w)
    x = x0 + 80
    for w in vus:
        d.rectangle([x, y0 + H + 64, x + 14, y0 + H + 78], fill=TEINTES[w], outline="#22222A")
        d.text((x + 19, y0 + H + 62), w, font=fp, fill="#3A3A30")
        x += 30 + d.textlength(w, font=fp)


def assembler(plan, images, chemin):
    from PIL import Image, ImageDraw
    n = len(images)
    lignes = (n + COLS - 1) // COLS
    larg = MARGE + COLS * (VIG_L + MARGE)
    haut_tete = 64 + 22 * len(plan["criteres"])
    haut_vig = VIG_H + 30
    haut_frise = 175
    H = haut_tete + lignes * (haut_vig + MARGE) + haut_frise
    im = Image.new("RGB", (larg, H), "#F8F8E8")
    d = ImageDraw.Draw(im)
    # en-tête : le nom, la note, la durée d'un tour, puis les sept critères
    d.text((MARGE, 12), plan["nom"], font=police(30, True), fill="#383828")
    d.text((larg - MARGE, 12), f"{plan['note']} / 100", font=police(30, True), fill="#C03028", anchor="ra")
    d.text((larg - MARGE, 48), f"un tour : {temps(plan['duree'])} ({'vélo à 20 km/h' if plan['terre'] else 'rameur, allure de Kiki'})", font=police(14), fill="#686850", anchor="ra")
    y = 58
    for c in plan["criteres"]:
        coul = "#2E8B4A" if c["note"] >= 75 else "#B05010" if c["note"] >= 45 else "#C03028"
        d.text((MARGE, y), f"{c['nom']}", font=police(15, True), fill="#383828")
        d.text((MARGE + 130, y), f"{c['note']:>3}", font=police(15, True), fill=coul)
        d.text((MARGE + 170, y), c["phrase"], font=police(15), fill="#383828")
        y += 22
    # les vues
    for i, (vue, img) in enumerate(zip(plan["vues"], images)):
        x, yv = MARGE + (i % COLS) * (VIG_L + MARGE), haut_tete + (i // COLS) * (haut_vig + MARGE)
        im.paste(img.resize((VIG_L, VIG_H), Image.LANCZOS), (x, yv))
        cadre = "#D83830" if vue["sorte"] == "fort" else "#484838"
        d.rectangle([x - 1, yv - 1, x + VIG_L, yv + VIG_H], outline=cadre, width=3 if vue["sorte"] == "fort" else 1)
        d.text((x, yv + VIG_H + 5), temps(vue["t"]), font=police(16, True), fill="#C03028" if vue["sorte"] == "fort" else "#383828")
        d.text((x + 48, yv + VIG_H + 5), vue["quoi"].replace("-", " ")[:48], font=police(16), fill="#383828")
    frise(d, MARGE, H - haut_frise + 46, larg - 2 * MARGE, plan)
    chemin.parent.mkdir(parents=True, exist_ok=True)
    im.save(chemin, optimize=True)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("circuits", nargs="*")
    ap.add_argument("--max", type=int, default=16)
    ap.add_argument("--dossier", default=str(ICI / "planches"))
    a = ap.parse_args()
    noms = a.circuits or niveaux()
    for nom, (plan, images) in prendre(noms, a.max).items():
        f = Path(a.dossier) / f"{nom}.png"
        assembler(plan, images, f)
        print("  ->", f, flush=True)
