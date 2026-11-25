"""Les surfaces qui se battent (25/11, Kiki : « on voit les textures qui se chevauchent entre deux maisons, sous les balcons ») : deux morceaux de décor de couleurs différentes,
posés dans le même plan (à moins de 6 mm), qui se recouvrent près du parcours : à l'écran, ils clignotent. Sans navigateur.
    python riviere/outils/chevauchements.py rame-ile [--loin 30] [--ecart 0.006] [--liste 40]
Il faut node (sur ce PC : export PATH="/c/Users/kikit/Android/node-v26.13.1-win-arm64:$PATH")."""
import argparse
import sys
from pathlib import Path

ICI = Path(__file__).resolve().parent
sys.path.insert(0, str(ICI))
sys.path.insert(0, str(ICI.parent))
import page  # noqa: E402
from generer import _node  # noqa: E402

JS = r"""
;(() => {
  const LOIN = %(loin)s, EC = %(ecart)s, REG = []; let prof = 0;
  for (const k of Object.keys(OBJETS)) { const f = OBJETS[k]; OBJETS[k] = function (F, o, R, K) { const a = F.p.length; prof++; const r = f.call(this, F, o, R, K); prof--; if (!prof && F.p.length > a) REG.push({F, a, b: F.p.length, k, x: o && o.x, z: o && o.z}); return r; }; }
  poserDecor();
  // les triangles près du parcours, rangés par plan (orientation, distance) et par carrés de 6 m
  const T = new Map(), vus = []; let total = 0;
  REG.forEach((q, n) => { if (["joncs", "nenuphars", "saule_eau", "arbre_rue", "masse_bois", "arbre_bois", "haie", "jardin_eau", "massif", "fougere", "buisson_bois"].includes(q.k)) return; const p = q.F.p, c = q.F.c;
    for (let i = q.a; i < q.b; i += 9) { const A = [p[i], p[i + 1], p[i + 2]], B = [p[i + 3], p[i + 4], p[i + 5]], C = [p[i + 6], p[i + 7], p[i + 8]]; pres(A[0], A[2]); if (Math.hypot(A[0] - PISTE.X[Q.i], A[2] - PISTE.Z[Q.i]) > LOIN) continue;
      let u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], v = [C[0] - A[0], C[1] - A[1], C[2] - A[2]], N = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = Math.hypot(...N); if (l < 2e-4) continue; N = N.map(x => x / l);
      const s = Math.abs(N[1]) > .02 ? Math.sign(N[1]) : Math.abs(N[0]) > .02 ? Math.sign(N[0]) : Math.sign(N[2]); N = N.map(x => x * s); const d = N[0] * A[0] + N[1] * A[1] + N[2] * A[2]; total++;
      const t = {n, A, B, C, N, d, c: [c[i], c[i + 1], c[i + 2]], m: q.F.m[i / 3]}, a = N.map(x => Math.round(x * 60)).join(","); for (const e of [0, 1]) { const kk = a + "/" + (Math.floor(d / .03) + e) + "/" + Math.floor(A[0] / 6) + "," + Math.floor(A[2] / 6); if (!T.has(kk)) T.set(kk, []); T.get(kk).push(t); } } });
  const coupe = (P, Qp) => { let R = P; const n = Qp.length; let ar = 0; for (let i = 0; i < n; i++) { const a = Qp[i], b = Qp[(i + 1) %% n]; ar += a[0] * b[1] - b[0] * a[1]; } const sg = Math.sign(ar);
    for (let i = 0; i < n && R.length; i++) { const a = Qp[i], b = Qp[(i + 1) %% n], f = q => sg * ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0])), o = []; for (let j = 0; j < R.length; j++) { const p = R[j], q = R[(j + 1) %% R.length], fp = f(p), fq = f(q); if (fp >= 0) o.push(p); if (fp >= 0 !== fq >= 0) { const w = fp / (fp - fq); o.push([p[0] + (q[0] - p[0]) * w, p[1] + (q[1] - p[1]) * w]); } } R = o; }
    let s = 0; for (let i = 0; i < R.length; i++) { const a = R[i], b = R[(i + 1) %% R.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };
  const fait = new Set(), par = new Map(); let id = new Map(); const num = t => { if (!id.has(t)) id.set(t, id.size); return id.get(t); };
  for (const L of T.values()) for (let i = 0; i < L.length; i++) for (let j = 0; j < i; j++) { const a = L[i], b = L[j]; if (a === b || a.N[0] * b.N[0] + a.N[1] * b.N[1] + a.N[2] * b.N[2] < .9998) continue;
    const ec = Math.max(...[b.A, b.B, b.C].map(q => Math.abs(a.N[0] * q[0] + a.N[1] * q[1] + a.N[2] * q[2] - a.d))); if (ec > EC) continue; if (Math.abs(a.c[0] - b.c[0]) + Math.abs(a.c[1] - b.c[1]) + Math.abs(a.c[2] - b.c[2]) < .09 && Math.floor(a.m) === Math.floor(b.m)) continue;
    const cle = num(a) < num(b) ? num(a) + "_" + num(b) : num(b) + "_" + num(a); if (fait.has(cle)) continue; fait.add(cle);
    const ax = Math.abs(a.N[0]), ay = Math.abs(a.N[1]), az = Math.abs(a.N[2]), pr = ay >= ax && ay >= az ? q => [q[0], q[2]] : ax >= az ? q => [q[2], q[1]] : q => [q[0], q[1]], s = coupe([a.A, a.B, a.C].map(pr), [b.A, b.B, b.C].map(pr)); if (s < .004) continue;
    const qa = REG[a.n], qb = REG[b.n], noms = [qa.k, qb.k].sort().join(" + ") + (a.n === b.n ? " (lui-même)" : ""); pres(a.A[0], a.A[2]); if (!par.has(noms)) par.set(noms, {n: 0, s: 0, ex: []}); const o = par.get(noms); o.n++; o.s += s; if (o.ex.length < 4) o.ex.push({m: sLigne(Q.i), y: +(a.A[1] - 2).toFixed(2), s: +s.toFixed(3), ca: a.c.map(x => Math.round(x * 255)), cb: b.c.map(x => Math.round(x * 255)), N: a.N.map(x => +x.toFixed(2))}); }
  console.log("CHEV " + JSON.stringify({total, L: [...par].sort((a, b) => b[1].s - a[1].s)}));
})();
"""


def chevauchements(niveau, loin=30, ecart=.006):
    src = page.controle(niveau)
    return _node(src[:src.index("function decorParTroncons")] + JS % {"loin": loin, "ecart": ecart}, "CHEV")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("niveau")
    ap.add_argument("--loin", type=float, default=30)
    ap.add_argument("--ecart", type=float, default=.006)
    ap.add_argument("--liste", type=int, default=40)
    o = ap.parse_args()
    r = chevauchements(o.niveau, o.loin, o.ecart)
    print(r["total"], "triangles regardés")
    for nom, q in r["L"][:o.liste]:
        print(f"{nom} : {q['n']} fois, {q['s']:.2f} m²  {q['ex'][:2]}")
