/* ============ la zone, dessinée : le sol d'une ville libre, d'un seul tenant (moteur/zone.js dit où sont les rues, zone_plan.js ce qu'on y pose) ============ */
// Le sol est une trame de petits triangles (50 cm aux coins des rues, 1 m près d'elles, 4 m dans l'herbe), coupés exactement là où la distance à une rue change de signe : la bordure,
// le bord du trottoir, celui d'une allée. Chaque coupe tombe sur une arête partagée par deux triangles : aucune fente possible, quelle que soit la courbe.
// Les dalles, la bordure et les pavés d'une ruelle suivent leur rue (s le long, u en travers) ; le goudron et les pavés d'une place, le monde.
const MAT_ZONE = PLAN && PLAN.zone ? new THREE.ShaderMaterial({uniforms: Object.assign({uSoleil: {value: SOLEIL}}, COMMUNS, EFFETS.ombres ? PORTEE_U : null), vertexShader: PLAN_VS, fragmentShader: planFS("vU / 1.25", "vU * vec2(1.5, 1.9)", "clamp(1. + .9 * (dot(vN, uSoleil) - uSoleil.y), .8, 1.14)"), side: THREE.DoubleSide}) : null;
const MAT_ZONE_PEINT = MAT_ZONE ? Object.assign(MAT_ZONE.clone(), {uniforms: MAT_ZONE.uniforms, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6}) : null;

async function construireZone(cede) {   // cede : rendre la main toutes les 40 ms (le menu reste vivant pendant que le monde se construit derrière) ; le résultat est le même
  const P = PLAN, Z = P.zone, D = Z.D, V = Z.voies; let tc = performance.now(); remplirZone();
  const lots = [new Map(), new Map()], morceau = (q, x, z) => { const M = lots[q], k = Math.floor(x / 64) + "," + Math.floor(z / 64); if (!M.has(k)) M.set(k, {p: [], n: [], t: [], u: []}); return M.get(k); };
  const normale = (x, z) => nrm([(Z.sol(x - .7, z) - Z.sol(x + .7, z)) / 1.4, 1, (Z.sol(x, z - .7) - Z.sol(x, z + .7)) / 1.4]);
  const chaussee = (x, z) => { Z.champs(x, z); const k = D.k; return Z.sol(x, z) - (k < 0 ? P.MARCHE : P.MARCHE * (1 - P.surPlat(k, Z.place(k, x, z).s))); };   // la hauteur de la chaussée (plus bas que le trottoir, sauf sur un plateau)
  const tri = (a, b, c, t, N, U, q = 0) => { const M = morceau(q, (a[0] + b[0] + c[0]) / 3, (a[2] + b[2] + c[2]) / 3); [a, b, c].forEach((v, k) => { const n = N || normale(v[0], v[2]); M.p.push(v[0], v[1], v[2]); M.n.push(n[0], n[1], n[2]); M.t.push(t); M.u.push(U ? U[k][0] : 0, U ? U[k][1] : 0); }); };
  // l'herbe, avec la matière du monde (les deux tons en taches), par carrés de 96 m
  const HB = new Map(), forme = (x, z) => { const k = Math.floor(x / 96) + "," + Math.floor(z / 96); if (!HB.has(k)) HB.set(k, new Forme()); return HB.get(k); }, tons = SOLS.herbe.c, ton = (x, z) => tons[(bruit(x / 5.5 + 9, z / 5.5 + 2) > .56 ? 1 : 0) % tons.length];
  const herbe = L => { const F = forme(L[0].x, L[0].z); for (let i = 1; i + 1 < L.length; i++) for (const q of [L[0], L[i], L[i + 1]]) { const n = normale(q.x, q.z); F.v(q.x, Z.sol(q.x, q.z), q.z, n[0], n[1], n[2], ton(q.x, q.z), 0); } };
  // couper un polygone convexe là où un champ vaut « val » : [le morceau dessous, le morceau dessus, les deux points de la coupe]
  const CHAMPS = ["x", "z", "f", "t", "p", "a", "g"];
  const couper = (L, c, val) => {
    let dedans = 0, dehors = 0; for (const q of L) if (q[c] < val) dedans++; else dehors++;
    if (!dehors) return [L, null, null]; if (!dedans) return [null, L, null];
    const A = [], B = [], T = [];
    for (let i = 0; i < L.length; i++) { const p = L[i], q = L[(i + 1) % L.length], vp = p[c] - val, vq = q[c] - val; (vp < 0 ? A : B).push(p);
      if (vp < 0 !== vq < 0) { const w = vp / (vp - vq), m = {k: p.k, v: p.v}; for (const k of CHAMPS) m[k] = p[k] + (q[k] - p[k]) * w; m[c] = val; A.push(m); B.push(m); T.push(m); } }
    return [A.length > 2 ? A : null, B.length > 2 ? B : null, T.length === 2 ? T : null]; };
  // les sommets de la trame, gardés (chaque point n'est mesuré qu'une fois) ; i, j : en demi-mètres
  const NX = Math.ceil(Z.xb - Z.xa) + 2, NZ = Math.ceil(Z.zb - Z.za) + 2, memo = new Map(), sommet = (i, j) => { const k = j * NX * 2 + i; let o = memo.get(k); if (!o) { const x = Z.xa + i / 2, z = Z.za + j / 2; Z.champs(x, z); o = {x, z, f: D.f, t: D.t, p: D.p, a: D.a, k: D.e < 6 ? D.k : -1, v: Z.proches()}; memo.set(k, o); } return o; };
  let kC = -1, kA = -1, kB = -1;   // la voie du petit carré en cours : ses dalles la suivent ; à un coin de rue, il y en a deux (kA, kB) et les dalles se coupent sur la ligne à égale distance des deux
  const bande = q => { const r = Z.place(kC, q.x, q.z); return [r.s, Math.abs(r.u) - V[kC].l / 2]; }, ruelle = q => { const r = Z.place(kC, q.x, q.z); return [r.u, r.s]; }, libre = q => [q.x, q.z];
  const dur = (L, t, U) => { const pts = L.map(q => [q.x, Z.sol(q.x, q.z), q.z]), u = U ? L.map(U) : null; for (let i = 1; i + 1 < L.length; i++) tri(pts[0], pts[i], pts[i + 1], t, null, u ? [u[0], u[i], u[i + 1]] : null); };
  const route = L => { const pts = L.map(q => [q.x, chaussee(q.x, q.z), q.z]); let plat = true; for (const q of pts) { if (Z.sol(q[0], q[2]) - q[1] > .004) plat = false; } for (let i = 1; i + 1 < L.length; i++) tri(pts[0], pts[i], pts[i + 1], plat ? 9 : 0); };
  const flanc = (T, L) => {   // la face de la bordure, de la chaussée jusqu'au trottoir
    const [A, B] = T, ya = chaussee(A.x, A.z), yb = chaussee(B.x, B.z), ha = Z.sol(A.x, A.z), hb = Z.sol(B.x, B.z); if (ha - ya < .003 && hb - yb < .003) return;
    let nx = B.z - A.z, nz = A.x - B.x; const l = Math.hypot(nx, nz) || 1, m = L.reduce((t, q) => t + (q.x - A.x) * nx + (q.z - A.z) * nz, 0), N = [nx / l * (m < 0 ? -1 : 1), 0, nz / l * (m < 0 ? -1 : 1)];
    const a = [A.x, ya - .03, A.z], b = [B.x, yb - .03, B.z], c = [B.x, hb, B.z], d = [A.x, ha, A.z]; tri(a, b, c, 3, N); tri(a, c, d, 3, N); };
  const carre = L0 => {   // un triangle de la trame, coupé selon ce qu'il y a dessous
    let reste = L0, r, T;
    [r, reste, T] = couper(reste, "f", 0); if (r) route(r); if (T) flanc(T, r); if (!reste) return;
    [r, reste] = couper(reste, "t", 0);
    if (r) { let pierre; [pierre, r] = couper(r, "f", .2); if (pierre) dur(pierre, 2, bande); if (r) dur(r, 1, bande); } if (!reste) return;
    [r, reste] = couper(reste, "p", 0); if (r) dur(r, 6, kC >= 0 && V[kC].sol === "paves" && Z.ecart(kC) < .6 ? ruelle : libre); if (!reste) return;
    [r, reste] = couper(reste, "a", 0); if (r) { let bo; [r, bo] = couper(r, "a", -.18); if (bo) dur(bo, 5); if (r) dur(r, 4); } if (!reste) return;
    herbe(reste); };
  // trois finesses de trame côte à côte : là où deux se touchent, la plus grosse prend les points de la plus fine (un éventail depuis son milieu), donc jamais une fente
  const G = 4, FIN = new Map(), finEn = (a, b) => { const k = b * NX + a; let v = FIN.get(k); if (v === undefined) { Z.champs(Z.xa + a + .5, Z.za + b + .5); v = Math.abs(D.f) < .8 && Z.arrondi() ? 1 : 2; if (v === 2 && D.f < 0 && D.k >= 0) { const r = P.rampe(D.k, Z.place(D.k, Z.xa + a + .5, Z.za + b + .5).s); if (r > -1.8 && r < .7) v = 1; } FIN.set(k, v); } return v; };
  const BL = new Map(), bloc = (i, j) => { const k = j * NX + i; let v = BL.get(k); if (v === undefined) { const x = Z.xa + i + G / 2, z = Z.za + j + G / 2; if (Z.bord(x, z) > 1) v = 0; else { Z.champs(x, z); v = Math.min(D.t, D.p, D.a) > 4.2 ? 1 : 2; } BL.set(k, v); } return v; };   // 0 : hors de la zone · 1 : de l'herbe · 2 : à couper
  const eventail = (c, L, f) => { for (let k = 0; k < L.length; k++) f([c, L[k], L[(k + 1) % L.length]]); };
  for (let j = 0; j + G < NZ; j += G) { if (cede && performance.now() - tc > 40) { await cede(); tc = performance.now(); }
   for (let i = 0; i + G < NX; i += G) {
    const sorte = bloc(i, j); if (!sorte) continue;
    if (sorte === 1) { const L = [], pt = (a, b) => ({x: Z.xa + i + a, z: Z.za + j + b}); let n = 0;
      for (const [a, b, da, db, vi, vj] of [[0, 0, 1, 0, 0, -G], [G, 0, 0, 1, G, 0], [G, G, -1, 0, 0, G], [0, G, 0, -1, -G, 0]]) { L.push(pt(a, b)); if (bloc(i + vi, j + vj) === 2) { n++; for (let k = 1; k < G; k++) L.push(pt(a + da * k, b + db * k)); } }
      if (n) eventail(pt(G / 2, G / 2), L, herbe); else herbe(L); continue; }
    { const q = [[0, 0], [G, 0], [G, G], [0, G]].map(([a, b]) => [Z.xa + i + a, Z.sol(Z.xa + i + a, Z.za + j + b) - .3, Z.za + j + b]); tri(q[0], q[1], q[2], 8, [0, 1, 0]); tri(q[0], q[2], q[3], 8, [0, 1, 0]); }   // une sous-couche : là où le sol est partagé entre deux rues, un pixel qui manquerait laisse voir du gris, jamais le ciel
    for (let b = j; b < j + G; b++) for (let a = i; a < i + G; a++) {
      const fin = finEn(a, b), deux = L0 => {   // un polygone de la trame : à quelles voies sont ses dalles
        let S = L0; const ks = [...new Set(S.map(q => q.k))].filter(k => k >= 0 && V[k].sol === "chaussee"); kB = -1; kC = (S.find(q => q.k >= 0) || S[0]).k;
        if (ks.length > 1) { kA = ks[0]; kB = ks[1]; S = S.map(q => Object.assign({}, q, {g: (q.v[kA] === undefined ? 14 : q.v[kA]) - (q.v[kB] === undefined ? 14 : q.v[kB])})); }
        Z.champs(S[0].x, S[0].z); if (kB < 0) return carre(S); const [A, B] = couper(S, "g", 0); if (A) { kC = kA; carre(A); } if (B) { kC = kB; carre(B); } };
      if (fin === 1) { for (let jj = 0; jj < 2; jj++) for (let ii = 0; ii < 2; ii++) { const I = a * 2 + ii, J = b * 2 + jj, S = [sommet(I, J), sommet(I + 1, J), sommet(I + 1, J + 1), sommet(I, J + 1)]; deux([S[0], S[1], S[2]]); deux([S[0], S[2], S[3]]); } continue; }
      const I = a * 2, J = b * 2, L = []; let n = 0;
      for (const [x, z, mx, mz, va, vb] of [[0, 0, 1, 0, 0, -1], [2, 0, 2, 1, 1, 0], [2, 2, 1, 2, 0, 1], [0, 2, 0, 1, -1, 0]]) { L.push(sommet(I + x, J + z)); if (finEn(a + va, b + vb) === 1) { n++; L.push(sommet(I + mx, J + mz)); } }
      if (n) eventail(sommet(I + 1, J + 1), L, deux); else { deux([L[0], L[1], L[2]]); deux([L[0], L[2], L[3]]); } } } }
  // la peinture et les petits chemins, posés sur le sol
  const ruban = (L, w, y, t, U) => {   // L : une ligne [[x, z], …] ; un ruban large de w, à y(x, z)
    const n = L.length, O = L.map((q, i) => { const a = L[Math.max(0, i - 1)], b = L[Math.min(n - 1, i + 1)], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [-(b[1] - a[1]) / d * w / 2, (b[0] - a[0]) / d * w / 2]; }); let s = 0;
    for (let i = 0; i + 1 < n; i++) { const l = Math.hypot(L[i + 1][0] - L[i][0], L[i + 1][1] - L[i][1]), P4 = [[L[i][0] + O[i][0], L[i][1] + O[i][1], s, 0], [L[i][0] - O[i][0], L[i][1] - O[i][1], s, w], [L[i + 1][0] - O[i + 1][0], L[i + 1][1] - O[i + 1][1], s + l, w], [L[i + 1][0] + O[i + 1][0], L[i + 1][1] + O[i + 1][1], s + l, 0]]; s += l;
      const q = P4.map(p => [p[0], y(p[0], p[1]), p[1]]), u = P4.map(p => [p[2], p[3]]); tri(q[0], q[1], q[2], t, null, U ? [u[0], u[1], u[2]] : null, 1); tri(q[0], q[2], q[3], t, null, U ? [u[0], u[2], u[3]] : null, 1); } };
  const yPeint = (x, z) => chaussee(x, z) + .012, yChemin = (x, z) => Z.sol(x, z) + .025, droite = (x0, z0, x1, z1, n) => Array.from({length: n + 1}, (_, i) => [lerp(x0, x1, i / n), lerp(z0, z1, i / n)]);
  for (const p of P.passages) { const L = 2 * (p.l - (p.route ? .7 : 0)), n = Math.max(3, Math.round(L)); for (let k = 0; k < n; k++) { const a = -L / 2 + (k + .5) * L / n, cx = p.x + p.dx * a, cz = p.z + p.dz * a, w = p.w - .1; ruban(droite(cx - p.dz * w, cz + p.dx * w, cx + p.dz * w, cz - p.dx * w, 3), .5 * L / n, yPeint, 7); } }
  for (const v of V) { if (v.sol !== "chaussee") continue;
    if (v.l >= 6.6) for (let s = 2; s < v.L - 4; s += 6) { if (P.rampe(v.k, s) > -2.5 || P.rampe(v.k, s + 3) > -2.5) continue; ruban(Array.from({length: 5}, (_, i) => { const q = Z.enVoie(v, s + i * .75); return [q.x, q.z]; }), .14, yPeint, 7); }
    for (const p of P.plateaux) { if (p.k !== v.k) continue; for (const [s, dir] of [[p.s0, -1], [p.s1, 1]]) { if (s < 4 || s > v.L - 4) continue; const m = Z.enVoie(v, s + dir * .5); Z.champs(m.x, m.z); if (D.k !== v.k) continue;   // les dents de requin, sur chaque rampe
      for (let k = 0; k < 3; k++) { const u = v.l * ((k + .5) / 3 - .5), w = Math.min(.5, v.l / 9), A = Z.enVoie(v, s + dir * P.RAMPE * .9, u - w), B = Z.enVoie(v, s + dir * P.RAMPE * .9, u + w), C = Z.enVoie(v, s + dir * .12, u); tri([A.x, yPeint(A.x, A.z), A.z], [B.x, yPeint(B.x, B.z), B.z], [C.x, yPeint(C.x, C.z), C.z], 7, null, null, 1); } } } }
  for (const s of P.sols) { const n = Math.max(1, Math.round(Math.hypot(s.x1 - s.x0, s.z1 - s.z0) / .8)); ruban(droite(s.x0, s.z0, s.x1, s.z1, n), s.w, yChemin, 1, true); }
  lots.forEach((M, q) => { for (const m of M.values()) { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(m.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(m.n, 3)); g.setAttribute("aT", new THREE.Float32BufferAttribute(m.t, 1)); g.setAttribute("aU", new THREE.Float32BufferAttribute(m.u, 2));
    const o = new THREE.Mesh(g, q ? MAT_ZONE_PEINT : MAT_ZONE); o.name = "plan"; scene.add(o); } });
  for (const F of HB.values()) { const m = F.maille(); if (m) { m.name = "plan-herbe"; scene.add(m); } }
}
