"""Les fentes du sol d'une ville libre (24/11, étape 13) : chaque arête doit être partagée par deux triangles.
    python riviere/outils/fentes.py ville-hauts
« longues » : les arêtes de plus de 4 cm qui n'ont qu'un triangle, à l'intérieur de la ville (58 sur ville-hauts : des points posés en plein milieu d'une arête droite au bord de la
placette, sans conséquence, une sous-couche est dessous) ; « marches » : deux triangles voisins qui ne sont pas à la même hauteur ailleurs que sur une bordure (toutes sur les rampes).
Un nombre qui monte d'un coup = une vraie fente. Il faut Chrome (playwright)."""
import json
import subprocess
import sys
import time
from pathlib import Path

ICI = Path(__file__).resolve().parent
sys.path.insert(0, str(ICI))
from captures import port_libre  # noqa: E402

JS = """(() => { const E = new Map(), K = v => Math.round(v * 200); let tris = 0, aire = 0;
 const ajoute = (P, i) => { const p = [0, 1, 2].map(k => [P.getX(i + k), P.getY(i + k), P.getZ(i + k)]), a = (p[1][0] - p[0][0]) * (p[2][2] - p[0][2]) - (p[2][0] - p[0][0]) * (p[1][2] - p[0][2]); if (Math.abs(a) < 2e-5) return; tris++; aire += Math.abs(a) / 2;
   for (let k = 0; k < 3; k++) { const A = p[k], B = p[(k + 1) % 3], ka = K(A[0]) + "," + K(A[2]), kb = K(B[0]) + "," + K(B[2]); if (ka === kb) continue; const c = ka < kb ? ka + "|" + kb : kb + "|" + ka; if (!E.has(c)) E.set(c, []); E.get(c).push([A, B]); } };
 scene.traverse(m => { if (!m.isMesh) return; const g = m.geometry, P = g.attributes.position; if (m.name === "plan" && m.material === MAT_ZONE) { const t = g.attributes.aT; for (let i = 0; i < P.count; i += 3) if (t.getX(i) !== 3 && t.getX(i) !== 8) ajoute(P, i); } else if (m.name === "plan-herbe") for (let i = 0; i < P.count; i += 3) ajoute(P, i); });
 let longues = 0, marches = 0; const ex = [];
 for (const L of E.values()) { const [A, B] = L[0];
   if (L.length === 1) { const d = Math.hypot(A[0] - B[0], A[2] - B[2]), x = (A[0] + B[0]) / 2, z = (A[2] + B[2]) / 2; if (d > .04 && PLAN.bord(x, z) < -8) { longues++; if (ex.length < 5) ex.push([+x.toFixed(1), +z.toFixed(1), +d.toFixed(2), PLAN.nature(x, z)]); } }
   else if (L.length === 2) { const [a, b] = L, d = Math.min(Math.abs(a[0][1] - b[0][1]) + Math.abs(a[1][1] - b[1][1]), Math.abs(a[0][1] - b[1][1]) + Math.abs(a[1][1] - b[0][1])); if (d > .002 && Math.abs(ZONE.champs((A[0] + B[0]) / 2, (A[2] + B[2]) / 2).f) > .03) marches++; } }
 return {triangles: tris, m2: Math.round(aire), longues, marches, exemples: ex}; })()"""

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    from playwright.sync_api import sync_playwright
    port = port_libre()
    srv = subprocess.Popen([sys.executable, str(ICI.parent / "serveur.py"), str(port)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)
    try:
        with sync_playwright() as p:
            nav = p.chromium.launch(channel="chrome", headless=True, args=["--ignore-gpu-blocklist", "--enable-gpu"])
            pg = nav.new_page(viewport={"width": 640, "height": 400})
            pg.goto(f"http://localhost:{port}/?niveau={sys.argv[1]}&machine=elliptique&s=0&fige=1", timeout=120000)
            pg.wait_for_function("window.__pret !== undefined", timeout=90000)
            print(json.dumps(pg.evaluate(JS), ensure_ascii=False))
            nav.close()
    finally:
        srv.terminate()
