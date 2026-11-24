/* ============ la zone, dessinée : le sol d'une ville libre, d'un seul tenant (moteur/zone.js dit où sont les rues, zone_plan.js ce qu'on y pose) ============ */
// Le sol est une trame de petits triangles (50 cm aux coins des rues, 1 m près d'elles, 4 m dans l'herbe), coupés exactement là où la distance à une rue change de signe : la bordure,
// le bord du trottoir, celui d'une allée. Chaque coupe tombe sur une arête partagée par deux triangles : aucune fente possible, quelle que soit la courbe.
// La bordure et les pavés d'une ruelle suivent leur rue (s le long, u en travers) ; le goudron, le trottoir et les pavés d'une place, le monde.
// (24/11, Kiki : « dans un virage, on voit le raccord du quadrillage », et entre le trottoir et les allées des maisons) Le trottoir n'a donc plus de dalles :
// un enrobé clair, sans direction, avec un grain et de grandes taches ; le même, au même endroit du monde, pour les allées des maisons. Aucun raccord possible.
const ZONE_TROTTOIR = "{ float l = vb(p / 8. + 2.), m = vb(p / 1.9 + 5.), g = h21(floor(p * 7.)); c = mix(vec3(.815, .796, .755), vec3(.785, .765, .722), step(.56, l)) * (.972 + .056 * m) * (1. + (.075 * g - .037) * pres); if (h21(floor(p * 3.5) + 7.) > .955) c *= mix(1., .935, pres); }";
const MAT_ZONE = PLAN && PLAN.zone ? new THREE.ShaderMaterial({uniforms: Object.assign({uSoleil: {value: SOLEIL}}, COMMUNS, EFFETS.ombres ? PORTEE_U : null), vertexShader: PLAN_VS, fragmentShader: planFS(ZONE_TROTTOIR, "vU * vec2(1.5, 1.9)", "clamp(1. + .9 * (dot(vN, uSoleil) - uSoleil.y), .8, 1.14)"), side: THREE.DoubleSide}) : null;
const MAT_ZONE_PEINT = MAT_ZONE ? Object.assign(MAT_ZONE.clone(), {uniforms: MAT_ZONE.uniforms, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6}) : null;

async function construireZone(cede) {   // cede : rendre la main toutes les 40 ms (le menu reste vivant pendant que le monde se construit derrière) ; le résultat est le même
  const P = PLAN, Z = P.zone, D = Z.D, V = Z.voies; let tc = performance.now(); remplirZone();
  const longue = !!NIVEAU.sorte, lots = [new Map(), new Map(), new Map()], morceau = (q, x, z) => { const M = lots[q], k = Math.floor(x / 64) + "," + Math.floor(z / 64); if (!M.has(k)) M.set(k, {p: [], n: [], t: [], u: []}); return M.get(k); };
  const normale = (x, z) => nrm([(Z.sol(x - .7, z) - Z.sol(x + .7, z)) / 1.4, 1, (Z.sol(x, z - .7) - Z.sol(x, z + .7)) / 1.4]);
  const chaussee = (x, z) => { Z.champs(x, z); const k = D.k; return Z.sol(x, z) - (k < 0 ? P.MARCHE : P.MARCHE * (1 - P.surPlat(k, Z.place(k, x, z).s))); };   // la hauteur de la chaussée (plus bas que le trottoir, sauf sur un plateau)
  const tri = (a, b, c, t, N, U, q = 0) => { const M = morceau(q, (a[0] + b[0] + c[0]) / 3, (a[2] + b[2] + c[2]) / 3); [a, b, c].forEach((v, k) => { const n = N || normale(v[0], v[2]); M.p.push(v[0], v[1], v[2]); M.n.push(n[0], n[1], n[2]); M.t.push(t); M.u.push(U ? U[k][0] : 0, U ? U[k][1] : 0); }); };
  // l'herbe, avec la matière du monde (les deux tons en taches), par carrés
  const CH = longue ? 64 : 96, HB = new Map(), forme = (x, z) => { const k = Math.floor(x / CH) + "," + Math.floor(z / CH); if (!HB.has(k)) HB.set(k, new Forme()); return HB.get(k); }, tons = SOLS.herbe.c, TON_AIRE = {foret: ["#5E9C46", "#7C8E4A"], clairiere: ["#8ED65E", "#80C852"], pre: ["#A2D868", "#94CC5C"]}, tonsAire = Object.fromEntries(Object.entries(TON_AIRE).map(([k, l]) => [k, l.map(hex)]));
  const ton = (x, z) => { const a = Z.aires.length ? Z.aireEn(x, z, 4) : null, T = a && tonsAire[a.genre] || tons; return T[(bruit(x / 5.5 + 9, z / 5.5 + 2) > .56 ? 1 : 0) % T.length]; };   // (étape 14) l'herbe d'un pré, le sol d'un bois
  const avecMarches = V.some(v => v.marches), creux = (x, z) => avecMarches && P.enMarches(x, z, -.1) && Math.abs(D.u) < V[D.k].l / 2 + .42 ? .34 : 0;   // (lot 3) l'herbe ne dépasse pas des marches, au pied de leurs murets
  const herbe = L => { const F = forme(L[0].x, L[0].z); for (let i = 1; i + 1 < L.length; i++) for (const q of [L[0], L[i], L[i + 1]]) { const n = normale(q.x, q.z); F.v(q.x, Z.sol(q.x, q.z) - creux(q.x, q.z), q.z, n[0], n[1], n[2], ton(q.x, q.z), 0); } };
  // couper un polygone convexe là où un champ vaut « val » : [le morceau dessous, le morceau dessus, les deux points de la coupe]
  const CHAMPS = ["x", "z", "f", "t", "p", "a", "c", "g"];
  const couper = (L, c, val) => {
    let dedans = 0, dehors = 0; for (const q of L) if (q[c] < val) dedans++; else dehors++;
    if (!dehors) return [L, null, null]; if (!dedans) return [null, L, null];
    const A = [], B = [], T = [];
    for (let i = 0; i < L.length; i++) { const p = L[i], q = L[(i + 1) % L.length], vp = p[c] - val, vq = q[c] - val; (vp < 0 ? A : B).push(p);
      if (vp < 0 !== vq < 0) { const w = vp / (vp - vq), m = {k: p.k, v: p.v}; for (const k of CHAMPS) m[k] = p[k] + (q[k] - p[k]) * w; m[c] = val; A.push(m); B.push(m); T.push(m); } }
    return [A.length > 2 ? A : null, B.length > 2 ? B : null, T.length === 2 ? T : null]; };
  // les sommets de la trame, gardés (chaque point n'est mesuré qu'une fois) ; i, j : en demi-mètres
  const NX = Math.ceil(Z.xb - Z.xa) + 2, NZ = Math.ceil(Z.zb - Z.za) + 2, memo = new Map(), sommet = (i, j) => { const k = j * NX * 2 + i; let o = memo.get(k); if (!o) { const x = Z.xa + i / 2, z = Z.za + j / 2; Z.champs(x, z); o = {x, z, f: D.f, t: D.t, p: D.p, a: D.a, c: D.c, k: D.e < 6 ? D.k : -1, v: Z.proches()}; memo.set(k, o); } return o; };
  let kC = -1, kA = -1, kB = -1;   // la voie du petit carré en cours : ses dalles la suivent ; à un coin de rue, il y en a deux (kA, kB) et les dalles se coupent sur la ligne à égale distance des deux
  const bande = q => { const r = Z.place(kC, q.x, q.z); return [r.s, Math.abs(r.u) - V[kC].l / 2]; }, ruelle = q => { const r = Z.place(kC, q.x, q.z); return [r.u, r.s]; }, libre = q => [q.x, q.z];
  const dur = (L, t, U) => { const pts = L.map(q => [q.x, Z.sol(q.x, q.z) - (t === 6 && kC >= 0 && V[kC].marches && P.enMarches(q.x, q.z, -.2) ? .32 : 0), q.z]), u = U ? L.map(U) : null; for (let i = 1; i + 1 < L.length; i++) tri(pts[0], pts[i], pts[i + 1], t, null, u ? [u[0], u[i], u[i + 1]] : null); };
  const route = L => { const pts = L.map(q => [q.x, chaussee(q.x, q.z), q.z]); let plat = true; for (const q of pts) { if (Z.sol(q[0], q[2]) - q[1] > .004) plat = false; } for (let i = 1; i + 1 < L.length; i++) tri(pts[0], pts[i], pts[i + 1], plat ? 9 : 0); };
  const flanc = (T, L) => {   // la face de la bordure, de la chaussée jusqu'au trottoir
    const [A, B] = T, ya = chaussee(A.x, A.z), yb = chaussee(B.x, B.z), ha = Z.sol(A.x, A.z), hb = Z.sol(B.x, B.z); if (ha - ya < .003 && hb - yb < .003) return;
    let nx = B.z - A.z, nz = A.x - B.x; const l = Math.hypot(nx, nz) || 1, m = L.reduce((t, q) => t + (q.x - A.x) * nx + (q.z - A.z) * nz, 0), N = [nx / l * (m < 0 ? -1 : 1), 0, nz / l * (m < 0 ? -1 : 1)];
    const a = [A.x, ya - .03, A.z], b = [B.x, yb - .03, B.z], c = [B.x, hb, B.z], d = [A.x, ha, A.z]; tri(a, b, c, 3, N); tri(a, c, d, 3, N); };
  const bois = (x, z) => { const a = Z.aires.length ? Z.aireEn(x, z, 3) : null; return a && a.genre === "foret" ? 1 : 0; };
  const carre = L0 => {   // un triangle de la trame, coupé selon ce qu'il y a dessous
    let reste = L0, r, T;
    [r, reste, T] = couper(reste, "f", 0); if (r) route(r); if (T) flanc(T, r); if (!reste) return;
    [r, reste] = couper(reste, "t", 0);
    if (r) { let pierre; [pierre, r] = couper(r, "f", .2); if (pierre) dur(pierre, 2, bande); if (r) dur(r, 1, bande); } if (!reste) return;
    [r, reste] = couper(reste, "p", 0); if (r) dur(r, 6, kC >= 0 && V[kC].sol === "paves" && Z.ecart(kC) < .6 ? ruelle : libre); if (!reste) return;
    [r, reste] = couper(reste, "a", 0); if (r) { let bo; [r, bo] = couper(r, "a", -.18); if (bo) dur(bo, 5); if (r) dur(r, 4); } if (!reste) return;
    herbe(reste);
    [r] = couper(reste, "c", .62); if (r) { const u = r.map(q => [bois(q.x, q.z), q.c]), pts = r.map(q => [q.x, Z.sol(q.x, q.z) + .015, q.z]); for (let i = 1; i + 1 < r.length; i++) tri(pts[0], pts[i], pts[i + 1], 10, null, [u[0], u[i], u[i + 1]], 1); } };   // (étape 14) un chemin de terre : posé sur l'herbe, ses bords s'effilochent dans le shader (aucun trait entre la terre et l'herbe)
  // trois finesses de trame côte à côte : là où deux se touchent, la plus grosse prend les points de la plus fine (un éventail depuis son milieu), donc jamais une fente
  const G = 4, FIN = new Map(), finEn = (a, b) => { const k = b * NX + a; let v = FIN.get(k); if (v === undefined) { Z.champs(Z.xa + a + .5, Z.za + b + .5); v = Math.abs(D.f) < .8 && Z.arrondi() ? 1 : 2; if (v === 2 && D.f < 0 && D.k >= 0) { const r = P.rampe(D.k, Z.place(D.k, Z.xa + a + .5, Z.za + b + .5).s); if (r > -1.8 && r < .7) v = 1; } FIN.set(k, v); } return v; };
  const BL = new Map(), bloc = (i, j) => { const k = j * NX + i; let v = BL.get(k); if (v === undefined) { const x = Z.xa + i + G / 2, z = Z.za + j + G / 2; if (Z.bord(x, z) > 1) v = 0; else { Z.champs(x, z); v = Math.min(D.t, D.p, D.a, D.c) > 4.2 ? 1 : 2; } BL.set(k, v); } return v; };   // 0 : hors de la zone · 1 : de l'herbe · 2 : à couper
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
  for (const p of P.passages) { if (p.coin) continue; const L = 2 * (p.l - (p.route ? .7 : 0)), n = Math.max(3, Math.round(L)); for (let k = 0; k < n; k++) { const a = -L / 2 + (k + .5) * L / n, cx = p.x + p.dx * a, cz = p.z + p.dz * a, w = p.w - .1, e = Z.enVoie(V[p.k], p.s), l = L / n / 4;
    // (24/11, Kiki : « le passage piéton déborde sur le trottoir ») chaque bande est parallèle à sa rue, même si l'on traverse de biais, et s'arrête avant la bordure
    const libre = u => { for (const v of [-l, l]) { Z.champs(cx + e.tx * u - e.tz * v, cz + e.tz * u + e.tx * v); if (D.f > -.1) return false; } return true; }; let u0 = -w, u1 = w; while (u0 < u1 && !libre(u0)) u0 += .05; while (u1 > u0 && !libre(u1)) u1 -= .05; if (u1 - u0 < .5) continue;
    ruban(droite(cx + e.tx * u0, cz + e.tz * u0, cx + e.tx * u1, cz + e.tz * u1, 3), 2 * l, yPeint, 7); } }
  for (const v of V) { if (v.sol !== "chaussee") continue;
    if (v.l >= 6.6) for (let s = 2; s < v.L - 4; s += 6) { if (P.rampe(v.k, s) > -2.5 || P.rampe(v.k, s + 3) > -2.5) continue; ruban(Array.from({length: 5}, (_, i) => { const q = Z.enVoie(v, s + i * .75); return [q.x, q.z]; }), .14, yPeint, 7); }
    for (const p of P.plateaux) { if (p.k !== v.k) continue; for (const [s, dir] of [[p.s0, -1], [p.s1, 1]]) { if (s < 4 || s > v.L - 4) continue; const m = Z.enVoie(v, s + dir * .5); Z.champs(m.x, m.z); if (D.k !== v.k) continue;   // les dents de requin, sur chaque rampe
      for (let k = 0; k < 3; k++) { const u = v.l * ((k + .5) / 3 - .5), w = Math.min(.5, v.l / 9), A = Z.enVoie(v, s + dir * P.RAMPE * .9, u - w), B = Z.enVoie(v, s + dir * P.RAMPE * .9, u + w), C = Z.enVoie(v, s + dir * .12, u); tri([A.x, yPeint(A.x, A.z), A.z], [B.x, yPeint(B.x, B.z), B.z], [C.x, yPeint(C.x, C.z), C.z], 7, null, null, 1); } } } }
  // (lot 3) les marches d'un escalier : de vraies contremarches de 16 cm le long de la voie, d'un bord à l'autre ; la pente du sol passe au milieu de chacune
  for (const v of V) { if (!v.marches) continue; const y = s => { const q = Z.enVoie(v, s); return Z.sol(q.x, q.z); }, {a, b} = v.marches, monte = y(b) > y(a) ? 1 : -1, n = Math.max(3, Math.round(Math.abs(y(b) - y(a)) / .16)), w = v.l / 2 + .33, dh = Math.abs(y(b) - y(a)) / n, S = []; let s = a;
    for (let k = 0; k <= n; k++) { const ya = y(a) + monte * k * dh; while (s < b && (y(s) - ya) * monte < 0) s += .02; S.push(k === n ? b : s); }
    const pt = (s, u, y) => { const q = Z.enVoie(v, s, u); return [q.x, y, q.z]; };
    for (let k = 0; k < n; k++) { const s0 = S[k], s1 = S[k + 1], y1 = y(a) + monte * (k + (monte > 0 ? .55 : .45)) * dh, av = monte > 0 ? s0 : s1, q = Z.enVoie(v, av), N = [-q.tx * monte, 0, -q.tz * monte], A = pt(s0, -w, y1), B = pt(s0, w, y1), C = pt(s1, w, y1), E = pt(s1, -w, y1), U = [[0, .2], [.5, .2], [.5, .6], [0, .6]];
      tri(A, B, C, 2, [0, 1, 0], [U[0], U[1], U[2]]); tri(A, C, E, 2, [0, 1, 0], [U[0], U[2], U[3]]);   // le giron, puis la contremarche, puis les deux flancs
      const c0 = pt(av, -w, y1 - dh - .04), c1 = pt(av, w, y1 - dh - .04), c2 = pt(av, w, y1), c3 = pt(av, -w, y1); tri(c0, c1, c2, 3, N); tri(c0, c2, c3, 3, N);
      for (const u of [-w, w]) { const sg = Math.sign(u), M = [-q.tz * sg, 0, q.tx * sg], d0 = pt(s0, u, y1 - .6), d1 = pt(s1, u, y1 - .6), d2 = pt(s1, u, y1), d3 = pt(s0, u, y1); tri(d0, d1, d2, 3, M); tri(d0, d2, d3, 3, M); } } }
  for (const s of P.sols) { const n = Math.max(1, Math.round(Math.hypot(s.x1 - s.x0, s.z1 - s.z0) / .8)); ruban(droite(s.x0, s.z0, s.x1, s.z1, n), s.w, yChemin, 1, true); }
  // (lot 3) une longue ville : le sol fin ne se voit qu'à moins de 135 m ; au-delà, un ruban par rue et une herbe en grands carrés, un peu plus bas (donc cachés tant que le sol fin est là)
  let HL = null; if (longue) { HL = new Forme(); const pas = 8, bas = .5, pt = (x, z, d) => [x, Z.sol(x, z) - d, z];
    for (let x = Z.xa; x < Z.xb; x += pas) for (let z = Z.za; z < Z.zb; z += pas) { if (Z.bord(x + pas / 2, z + pas / 2) > 3) continue; const L = [[x, z], [x + pas, z], [x + pas, z + pas], [x, z + pas]]; for (const i of [0, 1, 2, 0, 2, 3]) { const [X, Y] = L[i], n = normale(X, Y); HL.v(X, Z.sol(X, Y) - bas, Y, n[0], n[1], n[2], ton(X, Y), 0); } }
    const bandeLoin = (v, u0, u1, t, d) => { let a = null; for (let s = 0; s <= v.L + 3.9; s += 4) { const q = Math.min(s, v.L), A = Z.enVoie(v, q, u0), B = Z.enVoie(v, q, u1), b = [pt(A.x, A.z, d), pt(B.x, B.z, d)]; if (a) { tri(a[0], a[1], b[1], t, null, null, 2); tri(a[0], b[1], b[0], t, null, null, 2); } a = b; } };
    for (const v of V) { const r = v.l / 2; if (v.sol === "chaussee") { bandeLoin(v, -r - v.t, -r, 1, .34); bandeLoin(v, r, r + v.t, 1, .34); bandeLoin(v, -r, r, 0, .26); } else bandeLoin(v, -r, r, v.sol === "paves" ? 6 : v.sol === "terre" ? 11 : 4, .34); }
    for (const p of Z.places) { const c = pt(p.cx, p.cz, .3); for (let i = 0; i + 1 < p.C.length; i += 1) tri(c, pt(p.C[i][0], p.C[i][1], .3), pt(p.C[i + 1][0], p.C[i + 1][1], .3), 6, null, null, 2); } }
  lots.forEach((M, q) => { for (const m of M.values()) { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(m.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(m.n, 3)); g.setAttribute("aT", new THREE.Float32BufferAttribute(m.t, 1)); g.setAttribute("aU", new THREE.Float32BufferAttribute(m.u, 2));
    const o = new THREE.Mesh(g, q === 1 ? MAT_ZONE_PEINT : MAT_ZONE); o.name = q === 2 ? "plan-loin" : "plan"; if (longue && q < 2) voirLoin(o, 0, q ? 100 : 135); scene.add(o); } });
  for (const F of HB.values()) { const m = F.maille(); if (m) { m.name = "plan-herbe"; if (longue) voirLoin(m, 0, 135); scene.add(m); } }
  if (HL) { const m = HL.maille(); if (m) { m.name = "plan-loin"; scene.add(m); } }
}
