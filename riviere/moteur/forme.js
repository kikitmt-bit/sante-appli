/* ============ les formes : des volumes simples, dont chaque sommet porte sa couleur ============ */
// Une Forme accumule des triangles (position, normale, couleur, matière) ; à la fin, elle devient UN seul objet à dessiner.
// matière : 0 = sol naturel (motif de touffes, strates sur les parois), 1 = pavés, 2 = uni (murs, toits, feuillages).
const nrm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const ICO = (() => {  // deux boules à facettes : 20 faces (au loin, les rochers) et 80 faces (les feuillages)
  const t = (1 + Math.sqrt(5)) / 2, V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(nrm);
  const F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const V2 = V.slice(), F2 = [], milieux = new Map(), m = (a, b) => { const k = a < b ? a + "_" + b : b + "_" + a; if (!milieux.has(k)) { milieux.set(k, V2.length); V2.push(nrm([V[a][0] + V[b][0], V[a][1] + V[b][1], V[a][2] + V[b][2]])); } return milieux.get(k); };
  for (const [a, b, c] of F) { const ab = m(a, b), bc = m(b, c), ca = m(c, a); F2.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
  return [{V, F}, {V: V2, F: F2}]; })();

class Forme {
  constructor() { this.p = []; this.n = []; this.c = []; this.m = []; this.md = 2; this.poser(0, 0, 0, 0, 1); }
  matiere(m = 2) { this.md = m; return this; }   // la matière de ce qui suit (rendu.js : 2 uni, 3 fenêtre, 7 lampe, 4 lumineux, 5 chute d'eau, 6 eau calme) ; sans argument : retour à l'uni
  poser(x, y, z, lacet = 0, ech = 1) { this.ox = x; this.oy = y; this.oz = z; this.lacet = lacet; this.cs = Math.cos(lacet); this.sn = Math.sin(lacet); this.k = ech; return this; }
  monde(x, z) { return [this.ox + (x * this.cs + z * this.sn) * this.k, this.oz + (-x * this.sn + z * this.cs) * this.k]; }   // un point du plan de l'objet, dans le monde
  v(x, y, z, nx, ny, nz, col, mat) { this.p.push(x, y, z); this.n.push(nx, ny, nz); this.c.push(col[0], col[1], col[2]); this.m.push(mat); }   // un sommet, dans le monde
  l(P, N, col, mat) { const {cs, sn, k} = this; this.v(this.ox + (P[0] * cs + P[2] * sn) * k, this.oy + P[1] * k, this.oz + (-P[0] * sn + P[2] * cs) * k, N[0] * cs + N[2] * sn, N[1], -N[0] * sn + N[2] * cs, col, mat); }   // un sommet, dans le repère de l'objet
  tri(a, b, c, col, N, mat = this.md) { this.l(a, N, col, mat); this.l(b, N, col, mat); this.l(c, N, col, mat); }
  quad(a, b, c, d, col, N, mat = this.md) { this.tri(a, b, c, col, N, mat); this.tri(a, c, d, col, N, mat); }
  poly(pts, col, vers, mat = this.md) {  // un polygone plat ; « vers » : de quel côté il regarde, à peu près
    const a = pts[0], b = pts[1], c = pts[2], u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let N = nrm([u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]); if (N[0] * vers[0] + N[1] * vers[1] + N[2] * vers[2] < 0) N = [-N[0], -N[1], -N[2]];
    for (let i = 1; i < pts.length - 1; i++) this.tri(pts[0], pts[i], pts[i + 1], col, N, mat); }
  boite(x, y, z, lx, ly, lz, col, o = {}) {  // centre (x, z), base à la hauteur y
    const a = x - lx / 2, b = x + lx / 2, c = z - lz / 2, d = z + lz / 2, e = y, f = y + ly, m = o.mat === undefined ? this.md : o.mat;
    this.quad([a, e, d], [b, e, d], [b, f, d], [a, f, d], o.devant || col, [0, 0, 1], m); this.quad([b, e, c], [a, e, c], [a, f, c], [b, f, c], col, [0, 0, -1], m);
    this.quad([b, e, d], [b, e, c], [b, f, c], [b, f, d], col, [1, 0, 0], m); this.quad([a, e, c], [a, e, d], [a, f, d], [a, f, c], col, [-1, 0, 0], m);
    this.quad([a, f, d], [b, f, d], [b, f, c], [a, f, c], o.haut || col, [0, 1, 0], m); }
  plaque(x0, y0, x1, y1, z, col) { this.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], col, [0, 0, z >= 0 ? 1 : -1]); }      // un rectangle sur une façade (devant ou derrière)
  plaqueX(z0, y0, z1, y1, x, col) { this.quad([x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0], col, [x >= 0 ? 1 : -1, 0, 0]); }      // … sur un côté
  toit(x, y, z, lx, lz, h, deb, col, pignon) {  // deux pans, le faîte le long de x ; il déborde des murs de « deb »
    const a = x - lx / 2, b = x + lx / 2, c = z - lz / 2, d = z + lz / 2, p = h / (lz / 2), bas = y - deb * p, col2 = fonce(col, .86);
    this.poly([[a - deb, bas, d + deb], [b + deb, bas, d + deb], [b + deb, y + h, z], [a - deb, y + h, z]], col, [0, 1, 1]);
    this.poly([[b + deb, bas, c - deb], [a - deb, bas, c - deb], [a - deb, y + h, z], [b + deb, y + h, z]], col2, [0, 1, -1]);
    this.poly([[a - deb, bas - .22, d + deb], [b + deb, bas - .22, d + deb], [b + deb, bas, d + deb], [a - deb, bas, d + deb]], fonce(col, .7), [0, 0, 1]);   // la rive du toit, plus sombre
    if (pignon) { this.poly([[a, y, c], [a, y, d], [a, y + h, z]], pignon, [-1, 0, 0]); this.poly([[b, y, d], [b, y, c], [b, y + h, z]], pignon, [1, 0, 0]); } }
  disque(x, y, z, rx, ry, col, a0 = 0, a1 = Math.PI * 2, n = 14) {  // sur une façade : un disque, ou une part de disque (de l'angle a0 à a1)
    for (let i = 0; i < n; i++) { const t0 = a0 + (a1 - a0) * i / n, t1 = a0 + (a1 - a0) * (i + 1) / n; this.tri([x, y, z], [x + Math.cos(t0) * rx, y + Math.sin(t0) * ry, z], [x + Math.cos(t1) * rx, y + Math.sin(t1) * ry, z], col, [0, 0, z >= 0 ? 1 : -1]); } }
  arche(x, y, z, r0, r1, col, n = 12) {  // sur une façade : un demi-anneau (le bord d'un toit rond)
    for (let i = 0; i < n; i++) { const t0 = Math.PI * i / n, t1 = Math.PI * (i + 1) / n, P = (t, r) => [x + Math.cos(t) * r, y + Math.sin(t) * r, z]; this.quad(P(t0, r0), P(t0, r1), P(t1, r1), P(t1, r0), col, [0, 0, z >= 0 ? 1 : -1]); } }
  voute(x, y, z0, z1, r, col, col2, n = 12) {  // un toit en demi-rond, dont l'axe va vers la rivière ; deux couleurs en rangées
    for (let i = 0; i < n; i++) { const t0 = Math.PI * i / n, t1 = Math.PI * (i + 1) / n, c = i % 2 ? col2 : col, n0 = [Math.cos(t0), Math.sin(t0), 0], n1 = [Math.cos(t1), Math.sin(t1), 0];
      const A = [x + n0[0] * r, y + n0[1] * r, z0], B = [x + n0[0] * r, y + n0[1] * r, z1], C = [x + n1[0] * r, y + n1[1] * r, z1], D = [x + n1[0] * r, y + n1[1] * r, z0];
      this.l(A, n0, c, this.md); this.l(B, n0, c, this.md); this.l(C, n1, c, this.md); this.l(A, n0, c, this.md); this.l(C, n1, c, this.md); this.l(D, n1, c, this.md); } }
  biseau(x, y, z, lx, lz, h, r, col, haut) {  // un toit plat aux bords en pente : le dessus est en retrait de r
    const a = x - lx / 2, b = x + lx / 2, c = z - lz / 2, d = z + lz / 2, f = y + h;
    this.poly([[a, y, d], [b, y, d], [b - r, f, d - r], [a + r, f, d - r]], col, [0, 1, 1]); this.poly([[b, y, c], [a, y, c], [a + r, f, c + r], [b - r, f, c + r]], fonce(col, .86), [0, 1, -1]);
    this.poly([[b, y, d], [b, y, c], [b - r, f, c + r], [b - r, f, d - r]], fonce(col, .93), [1, 1, 0]); this.poly([[a, y, c], [a, y, d], [a + r, f, d - r], [a + r, f, c + r]], fonce(col, .93), [-1, 1, 0]);
    this.poly([[a + r, f, d - r], [b - r, f, d - r], [b - r, f, c + r], [a + r, f, c + r]], haut || col, [0, 1, 0]); }
  toitMaison(x, y, z, lx, lz, deb, col, pignon) {  // le toit des maisons de Kanto : un grand couvercle presque plat, au bord court et raide, qui déborde
    const a = x - lx / 2 - deb, b = x + lx / 2 + deb, d = lz / 2, clair = melange(col, [1, 1, 1], .14), ya = y + .2 + .85 * deb / (deb + .5);
    for (const s of [1, -1]) { const Z = v => z + s * v, c = s > 0 ? col : fonce(col, .86);
      this.poly([[a, y - .2, Z(d + deb)], [b, y - .2, Z(d + deb)], [b, y + .2, Z(d + deb)], [a, y + .2, Z(d + deb)]], fonce(col, .7), [0, 0, s]);
      this.poly([[a, y + .2, Z(d + deb)], [b, y + .2, Z(d + deb)], [b, y + 1.05, Z(d - .5)], [a, y + 1.05, Z(d - .5)]], c, [0, 1, s]);
      this.poly([[a, y + 1.05, Z(d - .5)], [b, y + 1.05, Z(d - .5)], [b, y + 1.6, z], [a, y + 1.6, z]], s > 0 ? clair : col, [0, 1, s * .2]); }
    for (const [X, sx] of [[x - lx / 2, -1], [x + lx / 2, 1]]) this.poly([[X, y, z - d], [X, y, z + d], [X, ya, z + d], [X, y + 1.05, z + d - .5], [X, y + 1.6, z], [X, y + 1.05, z - d + .5], [X, ya, z - d]], pignon, [sx, 0, 0]); }
  cyl(x, y, z, r1, r2, h, n, col, col2, fond) {  // un tronc de cône (r2 = 0 : un cône), couleur du bas puis du haut ; fond : la couleur du dessous, s'il se voit
    const pente = (r1 - r2) / h; col2 = col2 || col;
    if (fond) for (let i = 1; i < n - 1; i++) { const p = k => [x + Math.cos(k / n * Math.PI * 2) * r1, y, z + Math.sin(k / n * Math.PI * 2) * r1]; this.tri(p(0), p(i), p(i + 1), fond, [0, -1, 0]); }
    for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1), n0 = nrm([c0, pente, s0]), n1 = nrm([c1, pente, s1]);
      const A = [x + c0 * r1, y, z + s0 * r1], B = [x + c1 * r1, y, z + s1 * r1], C = [x + c1 * r2, y + h, z + s1 * r2], D = [x + c0 * r2, y + h, z + s0 * r2];
      this.l(A, n0, col, this.md); this.l(B, n1, col, this.md); this.l(C, n1, col2, this.md); if (r2 > 0) { this.l(A, n0, col, this.md); this.l(C, n1, col2, this.md); this.l(D, n0, col2, this.md); } }
    if (r2 > 0) for (let i = 1; i < n - 1; i++) { const p = k => [x + Math.cos(k / n * Math.PI * 2) * r2, y + h, z + Math.sin(k / n * Math.PI * 2) * r2]; this.tri(p(0), p(i), p(i + 1), col2, [0, 1, 0]); } }
  pointe(x, y, z, ax, ay, az, r, h, n, col, col2) {  // un cône penché (stalactite, cristal, épine) : sa base en (x, y, z), sa pointe à h le long de l'axe (ax, ay, az)
    const A = nrm([ax, ay, az]), ref = Math.abs(A[1]) < .9 ? [0, 1, 0] : [1, 0, 0], U = nrm([A[1] * ref[2] - A[2] * ref[1], A[2] * ref[0] - A[0] * ref[2], A[0] * ref[1] - A[1] * ref[0]]), W = [A[1] * U[2] - A[2] * U[1], A[2] * U[0] - A[0] * U[2], A[0] * U[1] - A[1] * U[0]];
    const S = [x + A[0] * h, y + A[1] * h, z + A[2] * h], B = a => { const c = Math.cos(a), s = Math.sin(a); return [U[0] * c + W[0] * s, U[1] * c + W[1] * s, U[2] * c + W[2] * s]; }; col2 = col2 || col;
    for (let i = 0; i < n; i++) { const d0 = B(i / n * Math.PI * 2), d1 = B((i + 1) / n * Math.PI * 2), N = B((i + .5) / n * Math.PI * 2);
      this.l([x + d0[0] * r, y + d0[1] * r, z + d0[2] * r], N, col, this.md); this.l([x + d1[0] * r, y + d1[1] * r, z + d1[2] * r], N, col, this.md); this.l(S, N, col2, this.md); } }
  boule(x, y, z, rx, ry, rz, tons, detail = 1, demi = false) {  // tons : [sombre, moyen, clair], du dessous au dessus
    const {V, F} = ICO[detail], ton = v => v[1] > .32 ? tons[2] : v[1] > -.3 ? tons[1] : tons[0];
    for (const f of F) { if (demi && V[f[0]][1] < -.01 && V[f[1]][1] < -.01 && V[f[2]][1] < -.01) continue; for (const i of f) { const v = V[i]; this.l([x + v[0] * rx, y + Math.max(demi ? 0 : -9, v[1]) * ry, z + v[2] * rz], v, ton(v), this.md); } } }
  dome(x, y, z, rx, ry, rz, tons, n = 7, demi = false) {  // une boule légère (n côtés) ; demi : seulement le dessus (le dessous est caché par l'étage d'en dessous)
    const lat = demi ? [0, .62, 1] : [-1, -.5, .5, 1], P = (i, s) => { const a = i / n * Math.PI * 2, c = Math.sqrt(Math.max(0, 1 - s * s)); return [Math.cos(a) * c, s, Math.sin(a) * c]; }, ton = v => v[1] > .4 ? tons[2] : v[1] > -.2 ? tons[1] : tons[0];
    const S = v => this.l([x + v[0] * rx, y + v[1] * ry, z + v[2] * rz], v, ton(v), this.md);
    for (let k = 0; k < lat.length - 1; k++) for (let i = 0; i < n; i++) { const A = P(i, lat[k]), B = P(i + 1, lat[k]), C = P(i + 1, lat[k + 1]), D = P(i, lat[k + 1]);
      if (Math.abs(lat[k]) < 1) { S(A); S(B); S(C); } if (Math.abs(lat[k + 1]) < 1) { S(A); S(C); S(D); } } }
  caillou(x, y, z, rx, ry, rz, tons, R) {  // un rocher : une boule cabossée, à facettes
    const {V, F} = ICO[0], k = V.map(() => .72 + R() * .5), P = i => [x + V[i][0] * rx * k[i], y + V[i][1] * ry * k[i], z + V[i][2] * rz * k[i]];
    for (const [a, b, c] of F) { const A = P(a), B = P(b), C = P(c), m = [(V[a][0] + V[b][0] + V[c][0]) / 3, (V[a][1] + V[b][1] + V[c][1]) / 3, (V[a][2] + V[b][2] + V[c][2]) / 3]; this.poly([A, B, C], m[1] > .3 ? tons[2] : m[1] > -.2 ? tons[1] : tons[0], m); } }
  rond(x, y, z, rx, rz, col, n = 10, rayons = null) {  // un disque à plat (une mare, un nénuphar, de l'écume) ; rayons : un facteur par sommet, pour un bord irrégulier
    const P = i => { const a = i / n * Math.PI * 2, k = rayons ? rayons[i % n] : 1; return [x + Math.cos(a) * rx * k, y, z + Math.sin(a) * rz * k]; };
    for (let i = 0; i < n; i++) this.tri([x, y, z], P(i), P(i + 1), col, [0, 1, 0]); }
  tapis(x0, z0, x1, z1, col, k = .72, n = 6, mat = null) {  // une surface posée sur le sol, qui en suit le relief : une ombre, un chemin (k = assombrit le sol ; col = sa propre couleur ; mat : sa matière)
    for (let j = 0; j < n; j++) { const P = [[x0, lerp(z0, z1, j / n)], [x1, lerp(z0, z1, j / n)], [x1, lerp(z0, z1, (j + 1) / n)], [x0, lerp(z0, z1, (j + 1) / n)]].map(([lx, lz]) => { const [X, Z] = this.monde(lx, lz); return [X, hauteur(X, Z) + .07, Z, col || fonce(couleurEn(X, Z), k)]; });
      for (const [a, b, c] of [[0, 1, 2], [0, 2, 3]]) for (const i of [a, b, c]) this.v(P[i][0], P[i][1], P[i][2], 0, 1, 0, P[i][3], mat !== null ? mat : col ? 2 : 0); } }
  ombre(x, z, rx, rz) {  // une ombre ronde, sur le sol
    const [cx, cz] = this.monde(x, z), c0 = fonce(couleurEn(cx, cz), .7), pts = []; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, [X, Z] = this.monde(x + Math.cos(a) * rx, z + Math.sin(a) * rz); pts.push([X, hauteur(X, Z) + .07, Z]); }
    const yc = hauteur(cx, cz) + .07; for (let i = 0; i < 8; i++) { const A = pts[i], B = pts[(i + 1) % 8]; this.v(cx, yc, cz, 0, 1, 0, c0, 0); this.v(A[0], A[1], A[2], 0, 1, 0, c0, 0); this.v(B[0], B[1], B[2], 0, 1, 0, c0, 0); } }
  maille(materiau = MAT_MONDE) { if (!this.p.length) return null; const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3)); g.setAttribute("mat", new THREE.Float32BufferAttribute(this.m, 1));
    return new THREE.Mesh(g, materiau); }
}
/* chaque outil de dessin rend la Forme : on peut les enchaîner (F.matiere(3).plaque(…).matiere(2)) */
for (const k of Object.getOwnPropertyNames(Forme.prototype)) {
  if (["constructor", "monde", "maille", "v", "l", "tri", "quad", "poly"].includes(k)) continue;   // pas les outils de base, appelés des centaines de milliers de fois
  const f = Forme.prototype[k];
  Forme.prototype[k] = function (...a) { const r = f.apply(this, a); return r === undefined ? this : r; };
}
