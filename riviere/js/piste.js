/* ============ la piste : les pièces du niveau deviennent une ligne, mètre par mètre ============ */
// Une pièce : {nom, long (m), virage (degrés, + = à droite), eau (largeur, m), g et d (la sorte de rive à gauche et à droite), tunnel}.
// Tout le reste (terrain, eau, décor) se déduit de cette ligne : le niveau ne contient aucune forme.
// Tous ces mètres sont des mètres de DÉCOR : le décor défile ALLURE fois plus vite que le rameur n'avance (la distance affichée reste la vraie).
const TYPES = Object.keys(BIOME.rives), NT = TYPES.length, RIVES = TYPES.map(t => BIOME.rives[t]);
const MARGE = 12;   // une pièce « tunnel » : la grotte commence 12 m après le début de la pièce et finit 12 m avant (la gorge d'approche)
const FONDU = 10;   // deux rives voisines se fondent l'une dans l'autre sur 2 × 10 m
const ALLURE = clamp(+PARAMS.get("allure") || NIVEAU.allure || 2, 1, 4);
const BOUCLE = !!NIVEAU.boucle, SENS = NIVEAU.boucle === "droite" ? 1 : -1;   // un circuit tourne à gauche (la terre au milieu, à gauche), sauf « droite »

/* fermer une boucle : la pièce « auto » prend le virage qui manque pour faire un tour complet, puis les longueurs s'ajustent (le moins possible,
   jamais celles des pièces « fixe », à lieu ou à tunnel) pour que la rivière retombe pile sur son départ. On dessine librement, le calcul referme. */
function fermer(pieces) {
  const autos = pieces.filter(p => p.virage === "auto"), somme = pieces.reduce((t, p) => t + (p.virage === "auto" ? 0 : p.virage || 0), 0);
  if (!autos.length) throw new Error("Une boucle a besoin d'une pièce au virage « auto »."); for (const p of autos) p.virage = (SENS * 360 - somme) / autos.length;
  let h = 0; const V = pieces.map(p => { const A = p.virage * Math.PI / 180, f = Math.abs(A) < 1e-9 ? 1 : Math.sin(A / 2) / (A / 2), v = [f * Math.sin(h + A / 2), -f * Math.cos(h + A / 2)]; h += A; return v; });
  const W = pieces.map(p => p.fixe || p.lieux || p.tunnel ? 0 : p.long * p.long), M = [[0, 0], [0, 0]], r = [0, 0];
  pieces.forEach((p, i) => { for (let a = 0; a < 2; a++) { r[a] += p.long * V[i][a]; for (let b = 0; b < 2; b++) M[a][b] += W[i] * V[i][a] * V[i][b]; } });
  const det = M[0][0] * M[1][1] - M[0][1] * M[1][0], l0 = (r[0] * M[1][1] - r[1] * M[0][1]) / det, l1 = (M[0][0] * r[1] - M[1][0] * r[0]) / det;
  pieces.forEach((p, i) => { p.long0 = p.long; p.long -= W[i] * (V[i][0] * l0 + V[i][1] * l1); if (p.long < 20) throw new Error("La boucle ne se ferme pas : revoir la pièce « " + (p.nom || i) + " »."); });
  if (NIVEAU.distance) { const k = NIVEAU.distance * ALLURE / pieces.reduce((t, p) => t + p.long, 0); for (const p of pieces) p.long *= k; }   // distance : les vrais mètres d'un tour
}
const PISTE = (() => {
  const X = [], Z = [], H = [], W0 = [], KG = [], KD = [], TUN = [], PC = [], pieces = [], source = NIVEAU.pieces.map(p => Object.assign({}, p));
  if (BOUCLE) fermer(source);
  let x = 0, z = 0, h = 0, s = 0, titre = "";
  source.forEach((p, ip) => {
    const n = Math.max(1, Math.round(p.long)), k = (p.virage || 0) * Math.PI / 180 / n; titre = p.nom || titre;
    for (const c of [p.g, p.d]) if (!TYPES.includes(c)) throw new Error("Rive inconnue dans le niveau : " + c);
    pieces.push(Object.assign(p, {s0: s, s1: s + n, titre}));
    for (let i = 0; i < n; i++) { X.push(x); Z.push(z); H.push(h); W0.push(p.eau / 2); KG.push(TYPES.indexOf(p.g)); KD.push(TYPES.indexOf(p.d)); TUN.push(p.tunnel && i >= MARGE && i < n - MARGE ? 1 : 0); PC.push(ip);
      h += k / 2; x += Math.sin(h); z -= Math.cos(h); h += k / 2; s++; }
  });
  const N = X.length, borne = i => BOUCLE ? ((i % N) + N) % N : clamp(i, 0, N - 1), W = new Float32Array(N);
  if (BOUCLE) for (let i = 0; i < N; i++) { X[i] -= x * i / N; Z[i] -= z * i / N; }   // les derniers centimètres, répartis sur tout le tour
  for (let i = 0; i < N; i++) { let t = 0; for (let j = -FONDU; j <= FONDU; j++) t += W0[borne(i + j)]; W[i] = t / (2 * FONDU + 1); }
  const poids = K => { const o = new Float32Array(N * NT);   // la part de chaque sorte de rive, à chaque mètre
    for (let i = 0; i < N; i++) { for (let j = -FONDU; j <= FONDU; j++) o[i * NT + K[borne(i + j)]] += 1 / (2 * FONDU + 1);
      for (let t = 0; t < NT; t++) { const w = o[i * NT + t]; if (!RIVES[t].franc || w <= 0 || w >= .999) continue;   // une rive « franche » (un quai) ne se fond jamais avec la nature
        const ici = K[i] === t; for (let u = 0; u < NT; u++) o[i * NT + u] = ici ? (u === t ? 1 : 0) : (u === t ? 0 : o[i * NT + u] / (1 - w)); } }
    return o; };
  return {N, X, Z, H, HFIN: h, W, PG: poids(KG), PD: poids(KD), TUN, PC, pieces};
})();
const LONG = BOUCLE ? PISTE.N : PISTE.N - 1;   // la longueur du niveau (un tour, pour une boucle)
const idx = s => { const i = Math.round(s), N = PISTE.N; return BOUCLE ? ((i % N) + N) % N : clamp(i, 0, N - 1); };          // le mètre de la piste le plus proche de s
const ecart = (a, b) => { const d = a - b; return BOUCLE ? d - LONG * Math.round(d / LONG) : d; };                           // de b à a le long de la piste (au plus court sur une boucle)

/* où est le mètre s de la piste (au-delà des deux bouts d'un niveau ouvert : tout droit ; sur une boucle : on refait le tour) */
function at(s) {
  const P = PISTE, N = P.N;
  if (BOUCLE) { s = ((s % N) + N) % N; const i = Math.min(N - 1, Math.floor(s)), u = s - i, j = (i + 1) % N; return {x: lerp(P.X[i], P.X[j], u), z: lerp(P.Z[i], P.Z[j], u), h: lerp(P.H[i], j ? P.H[j] : P.HFIN, u), w: lerp(P.W[i], P.W[j], u)}; }
  if (s <= 0) return {x: P.X[0] + Math.sin(P.H[0]) * s, z: P.Z[0] - Math.cos(P.H[0]) * s, h: P.H[0], w: P.W[0]};
  if (s >= LONG) { const d = s - LONG; return {x: P.X[LONG] + Math.sin(P.H[LONG]) * d, z: P.Z[LONG] - Math.cos(P.H[LONG]) * d, h: P.H[LONG], w: P.W[LONG]}; }
  const i = Math.floor(s), u = s - i; return {x: lerp(P.X[i], P.X[i + 1], u), z: lerp(P.Z[i], P.Z[i + 1], u), h: lerp(P.H[i], P.H[i + 1], u), w: lerp(P.W[i], P.W[i + 1], u)};
}
function pose(s, d) { const a = at(s); return {x: a.x + Math.cos(a.h) * d, z: a.z + Math.sin(a.h) * d, h: a.h, w: a.w}; }   // d en mètres, + = à droite
const pieceEn = s => PISTE.pieces[PISTE.PC[idx(s)]];

/* le point de la piste le plus proche d'un point du monde : Q.i (le mètre), Q.d (écart, + = à droite), Q.e (distance au bord de l'eau).
   Les points de la piste sont rangés dans une grille de cases de 32 m : on ne compare qu'aux cases voisines (un circuit de 2 km a 2 000 points). */
const Q = {i: 0, d: 0, e: 0};
const CASES = (() => { const P = PISTE, C = 32, M = 260; let xa = 1e9, xb = -1e9, za = 1e9, zb = -1e9;
  for (let i = 0; i < P.N; i++) { xa = Math.min(xa, P.X[i]); xb = Math.max(xb, P.X[i]); za = Math.min(za, P.Z[i]); zb = Math.max(zb, P.Z[i]); }
  const x0 = xa - M, z0 = za - M, nx = Math.ceil((xb + M - x0) / C), nz = Math.ceil((zb + M - z0) / C), cases = Array.from({length: nx * nz}, () => []);
  for (let i = 0; i < P.N; i++) cases[Math.floor((P.Z[i] - z0) / C) * nx + Math.floor((P.X[i] - x0) / C)].push(i);
  return {C, x0, z0, nx, nz, cases, xa, xb, za, zb}; })();
function pres(x, z) {
  const P = PISTE, N = P.N, G = CASES, cx = clamp(Math.floor((x - G.x0) / G.C), 0, G.nx - 1), cz = clamp(Math.floor((z - G.z0) / G.C), 0, G.nz - 1); let b = 1e18, bi = -1;
  for (let r = 0; r < 40; r++) {  // anneau par anneau, jusqu'à être sûr qu'aucune case plus lointaine ne peut faire mieux
    for (let j = cz - r; j <= cz + r; j++) { if (j < 0 || j >= G.nz) continue; const pas = j === cz - r || j === cz + r ? 1 : 2 * r || 1;
      for (let i = cx - r; i <= cx + r; i += pas) { if (i < 0 || i >= G.nx) continue; for (const k of G.cases[j * G.nx + i]) { const dx = x - P.X[k], dz = z - P.Z[k], q = dx * dx + dz * dz; if (q < b) { b = q; bi = k; } } } }
    if (bi >= 0 && b <= (r * G.C) * (r * G.C)) break; }
  if (bi < 0) bi = 0;
  const c = Math.cos(P.H[bi]), sn = Math.sin(P.H[bi]), dx = x - P.X[bi], dz = z - P.Z[bi], av = dx * sn - dz * c;
  Q.i = bi; Q.d = dx * c + dz * sn; Q.e = ((!BOUCLE && ((bi === 0 && av < 0) || (bi === N - 1 && av > 0))) ? Math.sqrt(b) : Math.abs(Q.d)) - P.W[bi];
  return Q;
}
