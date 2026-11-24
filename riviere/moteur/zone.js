/* ============ la zone : une ville libre, posée dans le monde (rues courbes, en diagonale, en pente) ============ */
// (24/11, étape 13 du plan) « plan » (plan.js) dessinait une ville plate, à angles droits, qui prenait tout le circuit. Ici, "zone" dans un niveau décrit
// des VOIES, chacune une courbe quelconque, à la hauteur qu'on veut. Le sol n'est jamais assemblé morceau par morceau : en chaque point, on mesure la
// distance à chaque voie, et cette distance dit ce qu'il y a sous les pieds (chaussée, trottoir, pavés, allée, jardin). Aucune jointure ne peut s'ouvrir.
// La hauteur du sol, elle, est votée par les voies voisines : une rue est toujours plate en travers, deux rues qui se croisent se rejoignent en douceur.
// La zone (mètres, x vers la droite, z vers le bas ; le départ du parcours est en 0, 0 et regarde vers -z) :
//   graine · voies: [{id, nom, sol: "chaussee" (défaut) | "paves" (une ruelle) | "sable" (une allée) | "terre" (un chemin de campagne, étape 14), l: la largeur, t: ses trottoirs (3 m ; 0 sans chaussée),
//     pts: [{x, z, r: l'arrondi, y: la hauteur}, …], g, d: ce qui borde chaque côté (zone_plan.js)}] · places: [{nom, pts: [{x, z, r}], …}]
//   (étape 14) nature: [{genre: "foret" | "clairiere" | "pre" | "verger" | "potagers", nom, pts: [{x, z, r}]}] : ce qu'il y a autour des chemins (zone_plan.js) ; la dernière écrite l'emporte
//   (étape 15, à vélo) velo: true : on roule sur la chaussée. rc : l'arrondi des coins (6 m) · d'une voie : t: 0 = une route de campagne (ni trottoir ni bordure, un accotement), piste: {b, l} = de chaque
//     côté une bande plantée de b mètres puis une piste cyclable de l mètres, traces: true = un chemin carrossable (l'herbe au milieu) · bateaux: [{v, s0, s1, raison}] : la chaussée monte au niveau du trottoir
//   Une hauteur donnée à un point vaut pour lui ; entre deux, la pente est douce. Là où une voie en croise une autre écrite avant elle, elle prend sa hauteur.
// Ce fichier ne connaît pas la piste (c'est elle qui se pose sur la zone : piste.js) et ne dessine rien : il se contrôle sans navigateur.

/* une ligne brisée aux coins arrondis → ses points, tous les « pas » mètres : {pts: [[x, z], …], s: [la distance depuis le début], som: [la distance de chaque sommet]} */
function courbeZone(pts, pas = 1, nom = "") {
  const o = [], som = [0], n = pts.length; let dx = pts[0].x, dz = pts[0].z; o.push([dx, dz]);
  const droit = (x, z) => { const l = Math.hypot(x - dx, z - dz), k = Math.max(1, Math.round(l / pas)); if (l > 1e-6) for (let t = 1; t <= k; t++) o.push([lerp(dx, x, t / k), lerp(dz, z, t / k)]); dx = x; dz = z; };
  for (let i = 1; i < n - 1; i++) {
    const A = pts[i - 1], B = pts[i], C = pts[i + 1], la = Math.hypot(B.x - A.x, B.z - A.z), lc = Math.hypot(C.x - B.x, C.z - B.z), ux = (B.x - A.x) / la, uz = (B.z - A.z) / la, vx = (C.x - B.x) / lc, vz = (C.z - B.z) / lc;
    const th = Math.atan2(ux * vz - uz * vx, ux * vx + uz * vz), r = B.r || 4, d = r * Math.tan(Math.abs(th) / 2);
    if (Math.abs(th) < .005) { droit(B.x, B.z); som.push(o.length - 1); continue; }
    if ((B.x - ux * d - dx) * ux + (B.z - uz * d - dz) * uz < -.02 || d > lc + .02) throw new Error("« " + nom + " » : l'arrondi du point " + i + " (" + r + " m) n'a pas la place.");
    droit(B.x - ux * d, B.z - uz * d);
    const sg = Math.sign(th), cx = dx - uz * r * sg, cz = dz + ux * r * sg, a0 = Math.atan2(dz - cz, dx - cx), k = Math.max(2, Math.round(r * Math.abs(th) / pas)), i0 = o.length - 1;
    for (let t = 1; t <= k; t++) o.push([cx + Math.cos(a0 + th * t / k) * r, cz + Math.sin(a0 + th * t / k) * r]);
    som.push(i0 + Math.round(k / 2)); dx = B.x + vx * d; dz = B.z + vz * d;
  }
  droit(pts[n - 1].x, pts[n - 1].z); som.push(o.length - 1);
  const s = [0]; for (let i = 1; i < o.length; i++) s.push(s[i - 1] + Math.hypot(o[i][0] - o[i - 1][0], o[i][1] - o[i - 1][1]));
  return {pts: o, s, som: som.map(i => s[i])};
}
/* une courbe douce par des hauteurs données (jamais au-delà d'elles) : C = [[s, y], …] triés ; doux : [au début, à la fin], la rue y rejoint une autre : elle part presque à plat */
function profilZone(C, doux = [false, false]) {
  if (!C.length) return () => 0; if (C.length === 1) return () => C[0][1];
  const n = C.length, p = [], m = new Array(n); for (let i = 0; i + 1 < n; i++) p.push((C[i + 1][1] - C[i][1]) / (C[i + 1][0] - C[i][0]));
  m[0] = p[0] * (doux[0] ? .3 : 1); m[n - 1] = p[n - 2] * (doux[1] ? .3 : 1); for (let i = 1; i < n - 1; i++) m[i] = p[i - 1] * p[i] <= 0 ? 0 : 2 * p[i - 1] * p[i] / (p[i - 1] + p[i]);
  return s => {
    if (s <= C[0][0]) return C[0][1]; if (s >= C[n - 1][0]) return C[n - 1][1];
    let i = 0; while (s > C[i + 1][0]) i++; const h = C[i + 1][0] - C[i][0], u = (s - C[i][0]) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * C[i][1] + (u3 - 2 * u2 + u) * h * m[i] + (3 * u2 - 2 * u3) * C[i + 1][1] + (u3 - u2) * h * m[i + 1]; };
}
const unionRonde = (a, b, r) => Math.max(r, Math.min(a, b)) - Math.hypot(Math.max(r - a, 0), Math.max(r - b, 0));   // deux distances réunies, l'angle rentrant arrondi (le coin d'un trottoir)

const ZONE = (() => {
  const z0 = NIVEAU.zone; if (!z0) return null;
  const VEL = !!z0.velo, RC = z0.rc || 3, RT = VEL ? Math.max(.4, RC - 3.5) : .4, MARGE_Z = z0.marge || 46;   // l'arrondi d'une bordure à un coin de rue ; ce que la zone garde autour de ses rues (parcelles, jardins, arbres)
  const voies = z0.voies.map((v, k) => {
    const sol = v.sol || "chaussee", c = courbeZone(v.pts, 1, v.nom || v.id);
    return Object.assign({}, v, {k, sol, l: v.l || (sol === "chaussee" ? 6.2 : sol === "terre" ? 2.4 : 2.8), t: sol === "chaussee" ? (v.piste ? v.piste.b + v.piste.l + 2.7 : v.t === undefined ? 3 : v.t) : 0, P: c.pts, S: c.s, som: c.som, L: c.s[c.s.length - 1], n: c.pts.length});
  });
  for (const v of voies) { v.bx0 = v.bz0 = 1e9; v.bx1 = v.bz1 = -1e9; for (const [x, z] of v.P) { v.bx0 = Math.min(v.bx0, x); v.bx1 = Math.max(v.bx1, x); v.bz0 = Math.min(v.bz0, z); v.bz1 = Math.max(v.bz1, z); } }
  for (const v of voies) { v.h = v.l / 2 + v.t; v.TX = new Float32Array(v.n); v.TZ = new Float32Array(v.n);
    for (let i = 0; i < v.n; i++) { const a = v.P[Math.max(0, i - 1)], b = v.P[Math.min(v.n - 1, i + 1)], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; v.TX[i] = (b[0] - a[0]) / d; v.TZ[i] = (b[1] - a[1]) / d; } }
  /* le point d'une voie le plus proche : {d, s, u (écart, + = à droite de son sens), i} */
  const surVoieZ = (v, x, z, i0 = 0, i1 = v.n - 2) => { let b = 1e18, o = null; for (let i = Math.max(0, i0); i <= Math.min(v.n - 2, i1); i++) { const [ax, az] = v.P[i], [bx, bz] = v.P[i + 1], ux = bx - ax, uz = bz - az, l2 = ux * ux + uz * uz || 1, t = clamp(((x - ax) * ux + (z - az) * uz) / l2, 0, 1), ex = x - ax - ux * t, ez = z - az - uz * t, q = ex * ex + ez * ez;
    if (q < b) { b = q; const l = Math.sqrt(l2); o = {d: Math.sqrt(q), s: v.S[i] + t * l, u: (ez * ux - ex * uz) / l, i}; } } return o; };
  // les croisements : là où une voie en coupe une autre, ou s'arrête sur elle. [{x, z, v: [{k, s}]}]
  const noeuds = [], noter = (x, z, k, s, k2, s2) => { let n = noeuds.find(q => Math.hypot(q.x - x, q.z - z) < 6); if (!n) { n = {x, z, v: []}; noeuds.push(n); } for (const [a, b] of [[k, s], [k2, s2]]) if (!n.v.some(q => q.k === a)) n.v.push({k: a, s: b}); };
  for (let k = 0; k < voies.length; k++) for (let j = 0; j < k; j++) {
    const A = voies[j], B = voies[k];
    for (const bout of [0, B.n - 1]) { const q = surVoieZ(A, B.P[bout][0], B.P[bout][1]); if (q.d < A.l / 2 + .5) noter(B.P[bout][0], B.P[bout][1], j, q.s, k, B.S[bout]); }
    for (const bout of [0, A.n - 1]) { const q = surVoieZ(B, A.P[bout][0], A.P[bout][1]); if (q.d < B.l / 2 + .5) noter(A.P[bout][0], A.P[bout][1], j, A.S[bout], k, q.s); }
    if (A.bx0 > B.bx1 + 3 || B.bx0 > A.bx1 + 3 || A.bz0 > B.bz1 + 3 || B.bz0 > A.bz1 + 3) continue;
    for (let i = 0; i + 1 < B.n; i++) { const [ax, az] = B.P[i], [bx, bz] = B.P[i + 1]; if (ax < A.bx0 - 3 || ax > A.bx1 + 3 || az < A.bz0 - 3 || az > A.bz1 + 3) continue;
      for (let m = 0; m + 1 < A.n; m++) { const [cx, cz] = A.P[m]; { const dd = Math.max(Math.abs(cx - ax), Math.abs(cz - az)); if (dd > 8) { m += Math.floor(dd) - 6; continue; } } if (Math.abs(cx - ax) > 3 || Math.abs(cz - az) > 3) continue; const [dx, dz] = A.P[m + 1], r1 = bx - ax, r2 = bz - az, s1 = dx - cx, s2 = dz - cz, den = r1 * s2 - r2 * s1; if (Math.abs(den) < 1e-9) continue;
        const t = ((cx - ax) * s2 - (cz - az) * s1) / den, w = ((cx - ax) * r2 - (cz - az) * r1) / den; if (t < 0 || t >= 1 || w < 0 || w >= 1) continue;
        noter(ax + r1 * t, az + r2 * t, j, lerp(A.S[m], A.S[m + 1], w), k, lerp(B.S[i], B.S[i + 1], t)); } }
  }
  // la hauteur de chaque voie : ses points, puis les voies déjà réglées qu'elle croise
  for (const v of voies) {
    let C = v.pts.map((q, i) => [v.som[i], q.y]).filter(q => typeof q[1] === "number");
    for (const n of noeuds) { const ici = n.v.find(q => q.k === v.k), avant = n.v.filter(q => q.k < v.k).sort((a, b) => a.k - b.k)[0]; if (!ici || !avant) continue; C = C.filter(q => Math.abs(q[0] - ici.s) > 5); C.push([ici.s, voies[avant.k].yEn(avant.s)]); }
    C.sort((a, b) => a[0] - b[0]); const joint = s => noeuds.some(n => n.v.some(q => q.k === v.k && Math.abs(q.s - s) < 1.5)); v.yEn = profilZone(C, [joint(0), joint(v.L)]); v.Y = Float32Array.from(v.S, v.yEn);
  }
  // les places, et la nature : un contour arrondi, sa boîte
  const contour = (p, pas) => { const q = p.pts, m = {x: (q[0].x + q[1].x) / 2, z: (q[0].z + q[1].z) / 2}, C = courbeZone([m].concat(q.slice(1), [q[0], m]), pas, p.nom).pts; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const [x, z] of C) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    return Object.assign({}, p, {C, x0, x1, z0, z1, cx: C.reduce((t, a) => t + a[0], 0) / C.length, cz: C.reduce((t, a) => t + a[1], 0) / C.length}); }, places = (z0.places || []).map(p => contour(p, 1)), aires = (z0.nature || []).map(p => contour(p, 5));
  const distPlace = (p, x, z) => {   // la distance au bord d'une place (négative : dedans)
    const hx = Math.max(p.x0 - x, x - p.x1, 0), hz = Math.max(p.z0 - z, z - p.z1, 0); if (hx > 16 || hz > 16) return Math.hypot(hx, hz);
    let b = 1e18, dedans = false; const C = p.C; for (let i = 0, j = C.length - 1; i < C.length; j = i++) { const [ax, az] = C[j], [bx, bz] = C[i], ux = bx - ax, uz = bz - az, t = clamp(((x - ax) * ux + (z - az) * uz) / (ux * ux + uz * uz || 1), 0, 1); b = Math.min(b, (x - ax - ux * t) ** 2 + (z - az - uz * t) ** 2); if ((bz > z) !== (az > z) && x < (ax - bx) * (z - bz) / (az - bz) + bx) dedans = !dedans; }
    return (dedans ? -1 : 1) * Math.sqrt(b); };
  const dansPlace = (p, x, z) => { let o = false; const C = p.C; for (let i = 0, j = C.length - 1; i < C.length; j = i++) { const bz = C[i][1], az = C[j][1]; if (bz > z !== az > z) { const bx = C[i][0]; if (x < (C[j][0] - bx) * (z - bz) / (az - bz) + bx) o = !o; } } return o; };   // dedans ou dehors, sans la distance (bien plus vite)
  /* (étape 14) ce qu'il y a là : "foret", "pre"… ou null (la ville, ses jardins) ; flou : le bord de l'aire ondule de tant de mètres */
  const CA = 48, casesA = new Map(); aires.forEach((a, i) => { for (let u = Math.floor((a.x0 - 12) / CA); u <= Math.floor((a.x1 + 12) / CA); u++) for (let w = Math.floor((a.z0 - 12) / CA); w <= Math.floor((a.z1 + 12) / CA); w++) { const k = u * 4096 + w; if (!casesA.has(k)) casesA.set(k, []); casesA.get(k).push(a); } });   // les aires, rangées par cases (un long chemin en a une soixantaine)
  const VIDE_A = [], airesPres = (x, z) => casesA.get(Math.floor(x / CA) * 4096 + Math.floor(z / CA)) || VIDE_A;
  const aireEn = (x, z, flou = 0) => { const L = airesPres(x, z); if (!L.length) return null; const X = flou ? x + (fbm(x / 9 + 3, z / 9) - .5) * flou * 2 : x, W = flou ? z + (fbm(x / 9, z / 9 + 7) - .5) * flou * 2 : z; for (let i = L.length - 1; i >= 0; i--) { const a = L[i]; if (X > a.x0 && X < a.x1 && W > a.z0 && W < a.z1 && dansPlace(a, X, W)) return a; } return null; };
  // de combien on est entré dans la nature (12 m au plus), gardé sur une trame de 6 m : demandé des centaines de milliers de fois
  const PA = 6, profA = new Map(), profEn = (i, j) => { const k = i * 65536 + j; let d = profA.get(k); if (d !== undefined) return d; const x = i * PA, z = j * PA; d = 0; for (const a of airesPres(x, z)) { if (x < a.x0 || x > a.x1 || z < a.z0 || z > a.z1) continue; d = Math.max(d, -distPlace(a, x, z)); if (d > 12) break; } d = Math.min(13, d); profA.set(k, d); return d; };
  const bosse = (x, z, em) => { if (em < 2) return 0; const u = x / PA, w = z / PA, i = Math.floor(u), j = Math.floor(w), a = u - i, b = w - j, d = lerp(lerp(profEn(i, j), profEn(i + 1, j), a), lerp(profEn(i, j + 1), profEn(i + 1, j + 1), a), b); return d <= 0 ? 0 : lisse(2, 12, em) * lisse(0, 12, d) * (fbm(x / 17 + 5, z / 17 + 1) - .5) * 2.4; };   // le sol d'un bois ou d'un pré n'est jamais lisse (loin du chemin)
  // tout ce qui est dur, en points (tous les 2 m) : pour la hauteur et pour le bord de la zone
  let xa = 1e9, xb = -1e9, za = 1e9, zb = -1e9; const PT = [];
  for (const v of voies) for (let i = 0; i < v.n; i++) { const [x, z] = v.P[i]; if (i % 2 === 0 || i === v.n - 1) PT.push([x, z, v.Y[i], v.h]); xa = Math.min(xa, x); xb = Math.max(xb, x); za = Math.min(za, z); zb = Math.max(zb, z); }
  for (const p of places) if (typeof p.y === "number") for (let x = p.x0; x <= p.x1; x += 2) for (let z = p.z0; z <= p.z1; z += 2) if (distPlace(p, x, z) < -1) PT.push([x, z, p.y, 1]);
  for (const p of places) { xa = Math.min(xa, p.x0); xb = Math.max(xb, p.x1); za = Math.min(za, p.z0); zb = Math.max(zb, p.z1); }
  xa -= MARGE_Z + 20; xb += MARGE_Z + 20; za -= MARGE_Z + 20; zb += MARGE_Z + 20;
  const CP = 16, npx = Math.ceil((xb - xa) / CP) + 1, npz = Math.ceil((zb - za) / CP) + 1, casesP = Array.from({length: npx * npz}, () => []);
  PT.forEach((q, i) => casesP[clamp(Math.floor((q[1] - za) / CP), 0, npz - 1) * npx + clamp(Math.floor((q[0] - xa) / CP), 0, npx - 1)].push(i));
  const R0 = {em: 0, y: 0}, VE = new Float64Array(PT.length), VY = new Float64Array(PT.length);
  function voter_(x, z) {   // la hauteur votée, et la distance au bord de la voie la plus proche (R0.em)
    const cx = clamp(Math.floor((x - xa) / CP), 0, npx - 1), cz = clamp(Math.floor((z - za) / CP), 0, npz - 1); let em = 1e9, fait = -1, nv = 0;
    for (let r = 0; r < 60; r++) {
      for (let j = cz - r; j <= cz + r; j++) { if (j < 0 || j >= npz) continue; const pas = j === cz - r || j === cz + r ? 1 : 2 * r || 1; for (let i = cx - r; i <= cx + r; i += pas) { if (i < 0 || i >= npx) continue; const L = casesP[j * npx + i]; for (let n = 0; n < L.length; n++) { const q = PT[L[n]], dx = x - q[0], dz = z - q[1], e = Math.max(0, Math.sqrt(dx * dx + dz * dz) - q[3]); VE[nv] = e; VY[nv++] = q[2]; if (e < em) em = e; } } }
      if (em < 1e8 && fait < 0) fait = r + Math.ceil((15 + 1.1 * em) / CP) + 1; if (fait >= 0 && r >= fait) break; }
    const B = 9 + 1.1 * em, lim = em + B; let sw = 0, sy = 0; for (let i = 0; i < nv; i++) { if (VE[i] >= lim) continue; const u = 1 - (VE[i] - em) / B, w = u * u * u; sw += w; sy += w * VY[i]; }
    R0.em = em; R0.y = sw ? sy / sw : 0; return R0;
  }
  // la hauteur du sol, gardée sur deux trames (calculées au premier besoin) : de 8 m partout, de 1 m à moins de 26 m d'une rue, l'une passant à l'autre en douceur.
  // Partout la même fonction, lissée entre ses points : jamais deux sols qui se croisent.
  const trame = pas => { const nx = Math.ceil((xb - xa) / pas) + 2, nz = Math.ceil((zb - za) / pas) + 2, H = new Float32Array(nx * nz).fill(NaN), E = new Float32Array(nx * nz), R = {y: 0, e: 0}; const n = (i, j) => { const k = j * nx + i; if (H[k] !== H[k]) { voter_(xa + i * pas, za + j * pas); H[k] = R0.y + (aires.length ? bosse(xa + i * pas, za + j * pas, R0.em) : 0); E[k] = R0.em; } return k; };
    return (x, z) => { const u = clamp((x - xa) / pas, 0, nx - 1.001), w = clamp((z - za) / pas, 0, nz - 1.001), i = Math.floor(u), j = Math.floor(w), a = u - i, b = w - j, k0 = n(i, j), k1 = n(i + 1, j), k2 = n(i, j + 1), k3 = n(i + 1, j + 1), p = (1 - a) * (1 - b), q = a * (1 - b), r = (1 - a) * b, s = a * b; R.y = H[k0] * p + H[k1] * q + H[k2] * r + H[k3] * s; R.e = E[k0] * p + E[k1] * q + E[k2] * r + E[k3] * s; return R; }; };
  const large = trame(8), fine = trame(VEL ? 2 : 1);
  const sol = (x, z) => { const g = large(x, z), e = g.e, y = g.y; if (e >= 26) return y; const f = fine(x, z).y; return e <= 16 ? f : lerp(f, y, lisse(16, 26, e)); };
  const bord = (x, z) => { const hx = Math.max(xa - x, x - xb, 0), hz = Math.max(za - z, z - zb, 0); let d = large(x, z).e; for (const p of places) if (d > 0) d = Math.min(d, Math.max(0, distPlace(p, x, z))); return d - MARGE_Z + Math.hypot(hx, hz); };   // la distance au bord de la zone (négative : dedans)
  // les distances à chaque voie, en un point. Après l'appel, D : f (bord de chaussée, négatif : dessus), t (bord extérieur du trottoir), p (pavés), a (sable), c (chemin de terre), et la voie la plus proche (k, s, u)
  const C8 = 8, grille = new Map();
  // une rue qui s'arrête sur une autre : son bout (un demi-disque) ne doit pas dépasser de l'autre côté, sinon la bordure d'en face fait une bosse
  for (const v of voies) { v.a0 = 0; v.a1 = v.L; for (const n of noeuds) { const q = n.v.find(o => o.k === v.k); if (!q || !n.v.some(o => o.k !== v.k && voies[o.k].sol === "chaussee" && !(VEL && (o.s < 1.5 || o.s > voies[o.k].L - 1.5)))) continue; if (q.s < 1.5) v.a0 = v.l / 2; if (q.s > v.L - 1.5) v.a1 = v.L - v.l / 2; } }
  for (const v of voies) for (let i = 0; i + 1 < v.n; i++) { if (v.S[i + 1] < v.a0 || v.S[i] > v.a1) continue; const cle = Math.floor(v.P[i][0] / C8) * 4096 + Math.floor(v.P[i][1] / C8); if (!grille.has(cle)) grille.set(cle, []); grille.get(cle).push(v.k, i); }
  // pour chaque carré de 4 m : les seuls petits segments qui peuvent être les plus proches d'un de ses points (une dizaine au lieu de deux cents)
  const C4 = 4, CAND = new Map(), PORTEE_V = 17, carreV = (x, z) => {
    const ca = Math.floor(x / C4), cb = Math.floor(z / C4), cle = ca * 8192 + cb; let L = CAND.get(cle); if (L) return L;
    const mx = (ca + .5) * C4, mz = (cb + .5) * C4, cx = Math.floor(mx / C8), cz = Math.floor(mz / C8), par = new Map();
    for (let a = -3; a <= 3; a++) for (let c = -3; c <= 3; c++) { const G = grille.get((cx + a) * 4096 + cz + c); if (!G) continue;
      for (let n = 0; n < G.length; n += 2) { const k = G[n], i = G[n + 1], P = voies[k].P, ax = P[i][0], az = P[i][1], ux = P[i + 1][0] - ax, uz = P[i + 1][1] - az, t = clamp(((mx - ax) * ux + (mz - az) * uz) / (ux * ux + uz * uz || 1), 0, 1), d = Math.hypot(mx - ax - ux * t, mz - az - uz * t); let o = par.get(k); if (!o) { o = {b: 1e9, l: []}; par.set(k, o); } if (d < o.b) o.b = d; o.l.push([d, i]); } }
    const r = []; for (const k of [...par.keys()].sort((a, b) => a - b)) { const o = par.get(k); if (o.b > PORTEE_V + 2.9) continue; for (const [d, i] of o.l) if (d <= o.b + 5.7) r.push(k, i); }
    L = Int32Array.from(r); CAND.set(cle, L); return L; };
  const bD = new Float64Array(voies.length), bI = new Int32Array(voies.length), vu = new Int32Array(voies.length), pris = new Int32Array(voies.length); let tour = 0, np = 0;
  const parvis = [];   // (zone_plan.js) {k, sg, s0, s1, e} : le trottoir élargi de e mètres, d'un côté d'une voie, entre deux distances
  const D = {f: 99, t: 99, p: 99, a: 99, c: 99, y: 99, b: 99, k: -1, s: 0, u: 0, e: 99};
  function champs(x, z) {
    tour++; np = 0; const L = carreV(x, z);
    for (let n = 0; n < L.length; n += 2) { const k = L[n], i = L[n + 1], P = voies[k].P, A = P[i], B = P[i + 1], ux = B[0] - A[0], uz = B[1] - A[1], ex = x - A[0], ez = z - A[1]; let t = (ex * ux + ez * uz) / (ux * ux + uz * uz || 1); t = t < 0 ? 0 : t > 1 ? 1 : t; const q = (ex - ux * t) ** 2 + (ez - uz * t) ** 2;
      if (vu[k] !== tour) { vu[k] = tour; bD[k] = q; bI[k] = i; pris[np++] = k; } else if (q < bD[k]) { bD[k] = q; bI[k] = i; } }
    let f = 99, t = 99, p = 99, al = 99, ch = 99, e = 99, ko = -1, m = 0;
    for (let n = 0; n < np; n++) { const k = pris[n]; if (bD[k] > PORTEE_V * PORTEE_V) { vu[k] = 0; continue; } pris[m++] = k; const v = voies[k], d = Math.sqrt(bD[k]), dh = d - v.h; if (dh < e) { e = dh; ko = k; }
      if (v.sol === "chaussee") { f = unionRonde(f, d - v.l / 2, RC); t = unionRonde(t, d - v.l / 2 - v.t, RT); if (VEL && !v.t) ch = unionRonde(ch, d - v.l / 2 - .3, 5); } else if (v.sol === "paves") p = unionRonde(p, d - v.l / 2, 1); else if (v.sol === "terre") ch = unionRonde(ch, d - v.l / 2, VEL ? 5 : 2); else al = unionRonde(al, d - v.l / 2, 2.5); }
    np = m;
    // (étape 15) les pistes cyclables : une bande plantée, puis la piste ; là où une rue coupe l'avenue, la bande s'arrête avant elle et la piste s'évase pour qu'on y tourne
    let y = 99, bn = 99; if (VEL) for (let n = 0; n < np; n++) { const k = pris[n], v = voies[k]; if (!v.piste) continue; const eb = Math.sqrt(bD[k]) - v.l / 2; if (eb > 16) continue; let fo = 99; for (let j = 0; j < np; j++) { const o = voies[pris[j]]; if (pris[j] !== k && o.sol === "chaussee") fo = Math.min(fo, Math.sqrt(bD[pris[j]]) - o.l / 2); }
      y = Math.min(y, unionRonde(Math.abs(eb - v.piste.b - v.piste.l / 2) - v.piste.l / 2, fo, 4)); bn = Math.min(bn, Math.max(.2 - eb, eb - v.piste.b, 7 - fo)); }
    for (const q of places) if (x > q.x0 - 17 && x < q.x1 + 17 && z > q.z0 - 17 && z < q.z1 + 17) p = unionRonde(p, distPlace(q, x, z), .5);
    if (parvis.length && t < 12) for (const q of parvis) { if (vu[q.k] !== tour) continue; const v = voies[q.k], w = surVoieZ(v, x, z, bI[q.k] - 1, bI[q.k] + 1), o = q.sg * w.u - v.h; t = Math.min(t, Math.max(q.s0 - w.s, w.s - q.s1, o - q.e, -o - 2)); }   // le trottoir élargi devant les boutiques
    D.f = f; D.t = t; D.p = p; D.a = al; D.c = ch; D.y = y; D.b = bn; D.k = ko; D.e = e; return D;
  }
  /* la place d'un point le long de la voie k : D.s (la distance depuis son début), D.u (l'écart, + = à droite) ; à demander juste après champs(x, z) */
  const place = (k, x, z) => { const v = voies[k], ici = vu[k] === tour, q = surVoieZ(v, x, z, ici ? bI[k] - 3 : 0, ici ? bI[k] + 3 : v.n); D.s = q.s; D.u = q.u; return D; };
  const proches = () => { const o = {}; for (let n = 0; n < np; n++) { const k = pris[n]; o[k] = Math.sqrt(bD[k]) - voies[k].h; } return o; };   // la distance au bord de chaque voie proche ; à demander juste après champs(x, z)
  const arrondi = () => { let n = 0; for (let i = 0; i < np; i++) { const k = pris[i]; if (voies[k].sol === "chaussee" && Math.sqrt(bD[k]) - voies[k].l / 2 < RC + .4) n++; } return n > 1; };   // est-on dans l'arrondi d'un coin de rue ? à demander juste après champs(x, z)
  const ecart = k => vu[k] === tour ? Math.sqrt(bD[k]) - voies[k].l / 2 : 99;   // la distance au bord de la voie k ; à demander juste après champs(x, z)
  const enVoie = (v, s, u = 0) => { s = clamp(s, 0, v.L); let i = Math.min(v.n - 2, Math.max(0, Math.floor(s / v.L * (v.n - 1)))); while (i > 0 && v.S[i] > s) i--; while (i < v.n - 2 && v.S[i + 1] < s) i++; const w = (s - v.S[i]) / (v.S[i + 1] - v.S[i] || 1), tx = lerp(v.TX[i], v.TX[i + 1], w), tz = lerp(v.TZ[i], v.TZ[i + 1], w), d = Math.hypot(tx, tz) || 1;
    return {x: lerp(v.P[i][0], v.P[i + 1][0], w) - tz / d * u, z: lerp(v.P[i][1], v.P[i + 1][1], w) + tx / d * u, tx: tx / d, tz: tz / d}; };   // un point de la voie (u : l'écart, + = à droite), et sa direction
  // (étape 15) à vélo, la chaussée est une marche plus bas que les trottoirs, sauf : au bout d'une rue qui devient une route, sur une route de campagne, sur un « bateau », et là où une piste cyclable la traverse
  const plats = [], croisements = [], boutsV = voies.map(() => []), avec = voies.map(() => []), RAMPE = 1.1;
  if (VEL) {
    const auBout = q => q.s < 1.5 || q.s > voies[q.k].L - 1.5, rues = n => n.v.filter(q => voies[q.k].sol === "chaussee");
    for (const n of noeuds) { const L = rues(n); if (L.length < 2) continue; n.bout = L.length === 2 && L.every(auBout);
      for (const q of L) for (const w of L) { if (w === q) continue; const v = voies[q.k], o = voies[w.k];
        if (n.bout) { if (v.t && !o.t) boutsV[q.k].push(q.s); continue; } if (!v.t && o.t) avec[q.k].push([q.s, o.h]);
        if (!o.piste || auBout(w)) continue; const e = enVoie(v, q.s), f = enVoie(o, w.s), sn = Math.max(.35, Math.abs(e.tx * f.tz - e.tz * f.tx)), mi = o.l / 2 + o.piste.b + o.piste.l / 2;
        for (const sg of [-1, 1]) { const s = q.s + sg * mi / sn; if (s < 0 || s > v.L) continue; const a = q.s + sg * (mi - 2.1) / sn, b = q.s + sg * (mi + 4.4) / sn, p = enVoie(v, s); plats.push({k: q.k, s0: Math.min(a, b), s1: Math.max(a, b)}); croisements.push({k: q.k, s, ka: w.k, x: p.x, z: p.z, dx: f.tx, dz: f.tz, l: v.l / 2 / sn, w: o.piste.l / 2}); } } }
    for (const b of z0.bateaux || []) plats.push({k: voies.findIndex(v => v.id === b.v), s0: b.s0, s1: b.s1, raison: b.raison}); }
  const platsDe = voies.map((v, k) => plats.filter(p => p.k === k)), rampe = (k, s) => { let m = -99; for (const p of platsDe[k]) m = Math.max(m, Math.min(s - p.s0, p.s1 - s)); return m; };
  const marche = (k, s) => { let m = voies[k].t ? 1 : 0; for (const b of boutsV[k]) m *= lisse(0, 16, Math.abs(s - b)); for (const [b, h] of avec[k]) m = Math.max(m, 1 - lisse(h + 1, h + 10, Math.abs(s - b))); return .12 * m * (1 - clamp(1 + rampe(k, s) / RAMPE, 0, 1)); };
  /* de combien la chaussée est plus basse que le sol voisin, au point de champs(x, z) ; entre deux rues, un mélange : jamais une marche au milieu d'un carrefour */
  const creux = (x, z) => { let w = 0, y = 0; for (let n = 0; n < np; n++) { const k = pris[n], v = voies[k]; if (v.sol !== "chaussee") continue; const e = Math.sqrt(bD[k]) - v.l / 2; if (e > 2.5) continue; const q = (2.5 - e) ** 3; w += q; y += q * marche(k, surVoieZ(v, x, z, bI[k] - 2, bI[k] + 2).s); } return w ? y / w : 0; };
  return {velo: VEL, plats, croisements, rampe, creux, RAMPE, zone: true, graine: z0.graine || 1, donnees: z0, voies, places, noeuds, RC, MARGE: MARGE_Z, xa, xb, za, zb, parvis, sol, bord, champs, place, ecart, proches, arrondi, surVoieZ, enVoie, distPlace, aires, aireEn, D};
})();
const SUR_PLAN = !!(NIVEAU.plan || NIVEAU.zone);   // la piste est posée sur une ville (plan.js ou zone.js) : ses longueurs sont exactes
