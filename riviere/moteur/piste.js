/* ============ la piste : les pièces du niveau deviennent une ligne en 3D, mètre par mètre ============ */
// Une pièce : {nom, long (m), virage (degrés, + = à droite), eau ou large (largeur, m), g et d (la sorte de rive à gauche et à droite)}
// et, au choix :
//   monte    mètres gagnés sur la pièce (négatif : une descente ; "auto" : ce qui manque pour revenir à la hauteur du départ)
//   net      la pente n'est pas adoucie (une chute, un tremplin, une cascade)
//   surface  "eau" (par défaut), "terre", "goudron"… (contenu/surfaces)
//   pont     la piste est en l'air : le sol ne la suit pas, un tablier est construit ; on peut passer dessous
//   tunnel   une montagne passe au-dessus
//   allure   le décor défile plus ou moins vite ici (1,4 : des rapides ; 0,7 : une côte), sans toucher aux vrais chiffres
//   camera   {haut, recul} : la caméra plus haute ou plus loin sur cette pièce
//   lieux, objets
// La dernière pièce d'un circuit peut être {"raccord": true} : le moteur calcule le chemin qui referme la boucle, sans déformer les autres.
// (Ancienne façon, toujours acceptée : une pièce au virage "auto", et les longueurs s'ajustent.)
// Tout le reste (terrain, surfaces, décor) se déduit de cette ligne : le niveau ne contient aucune forme.
// Tous ces mètres sont des mètres de DÉCOR : le décor défile « allure » fois plus vite que le joueur n'avance (la distance affichée reste la vraie).
const TYPES = Object.keys(BIOME.rives), NT = TYPES.length, RIVES = TYPES.map(t => BIOME.rives[t]);
const MARGE = 12;   // une pièce « tunnel » : la grotte commence 12 m après le début de la pièce et finit 12 m avant (la gorge d'approche)
const FONDU = 10;   // deux rives voisines se fondent l'une dans l'autre sur 2 × 10 m
const ALLURE = clamp(+PARAMS.get("allure") || NIVEAU.allure || 2, 1, 4);
const BOUCLE = !!NIVEAU.boucle, SENS = NIVEAU.boucle === "droite" ? 1 : -1;
const largeur = p => p.large !== undefined ? p.large : p.eau;

/* l'ancienne fermeture d'une boucle : la pièce « auto » prend le virage qui manque pour faire un tour complet, puis les longueurs
   s'ajustent (le moins possible, jamais celles des pièces « fixe », à lieu ou à tunnel) pour que la piste retombe sur son départ. */
function fermer(pieces) {
  const autos = pieces.filter(p => p.virage === "auto"), somme = pieces.reduce((t, p) => t + (p.virage === "auto" ? 0 : p.virage || 0), 0);
  if (!autos.length) throw new Error("Une boucle a besoin d'une pièce « raccord » à la fin (ou d'une pièce au virage « auto »).");
  for (const p of autos) p.virage = (SENS * 360 - somme) / autos.length;
  let h = 0;
  const V = pieces.map(p => { const A = p.virage * Math.PI / 180, f = Math.abs(A) < 1e-9 ? 1 : Math.sin(A / 2) / (A / 2), v = [f * Math.sin(h + A / 2), -f * Math.cos(h + A / 2)]; h += A; return v; });
  const W = pieces.map(p => p.fixe || p.lieux || p.tunnel ? 0 : p.long * p.long), M = [[0, 0], [0, 0]], r = [0, 0];
  pieces.forEach((p, i) => { for (let a = 0; a < 2; a++) { r[a] += p.long * V[i][a]; for (let b = 0; b < 2; b++) M[a][b] += W[i] * V[i][a] * V[i][b]; } });
  const det = M[0][0] * M[1][1] - M[0][1] * M[1][0], l0 = (r[0] * M[1][1] - r[1] * M[0][1]) / det, l1 = (M[0][0] * r[1] - M[1][0] * r[0]) / det;
  pieces.forEach((p, i) => {
    p.long0 = p.long; p.long -= W[i] * (V[i][0] * l0 + V[i][1] * l1);
    if (p.long < 20) throw new Error("La boucle ne se ferme pas : revoir la pièce « " + (p.nom || i) + " ».");
  });
  if (NIVEAU.distance) { const k = NIVEAU.distance * ALLURE / pieces.reduce((t, p) => t + p.long, 0); for (const p of pieces) p.long *= k; }   // distance : les vrais mètres d'un tour
}

/* le raccord : le plus court chemin « virage, ligne droite, virage » (de rayon donné) entre la fin des pièces et le départ */
function cheminRaccord(x0, z0, t0, x1, z1, t1, R) {
  const T2 = Math.PI * 2, m = a => ((a % T2) + T2) % T2, dx = x1 - x0, dz = z1 - z0, d = Math.hypot(dx, dz) / R, th = Math.atan2(dz, dx);
  const a = m(t0 - th), b = m(t1 - th), sa = Math.sin(a), sb = Math.sin(b), ca = Math.cos(a), cb = Math.cos(b), cab = Math.cos(a - b), sol = [];
  let p2 = 2 + d * d - 2 * cab + 2 * d * (sa - sb);
  if (p2 >= 0) { const tmp = Math.atan2(cb - ca, d + sa - sb); sol.push([m(-a + tmp), Math.sqrt(p2), m(b - tmp), 1, 1]); }
  p2 = 2 + d * d - 2 * cab + 2 * d * (sb - sa);
  if (p2 >= 0) { const tmp = Math.atan2(ca - cb, d - sa + sb); sol.push([m(a - tmp), Math.sqrt(p2), m(-b + tmp), -1, -1]); }
  p2 = -2 + d * d + 2 * cab + 2 * d * (sa + sb);
  if (p2 >= 0) { const p = Math.sqrt(p2), tmp = Math.atan2(-ca - cb, d + sa + sb) - Math.atan2(-2, p); sol.push([m(-a + tmp), p, m(-b + tmp), 1, -1]); }
  p2 = d * d - 2 + 2 * cab - 2 * d * (sa + sb);
  if (p2 >= 0) { const p = Math.sqrt(p2), tmp = Math.atan2(ca + cb, d - sa - sb) - Math.atan2(2, p); sol.push([m(a - tmp), p, m(b - tmp), -1, 1]); }
  sol.sort((u, v) => (u[0] + u[1] + u[2]) - (v[0] + v[1] + v[2]));
  return sol[0] || null;
}
function nombres(pieces) {   // le nombre de mètres de chaque pièce : arrondis en cumulé, pour que le total soit juste
  let cum = 0;
  return pieces.map(p => { const a = Math.round(cum); cum += p.long; return Math.max(1, Math.round(cum) - a); });
}
function poseFinale(pieces) {   // où arrive la suite de pièces (le même calcul, pas à pas, que la piste)
  const ns = nombres(pieces); let x = 0, z = 0, h = 0;
  pieces.forEach((p, ip) => { const n = ns[ip], k = (p.virage || 0) * Math.PI / 180 / n; for (let i = 0; i < n; i++) { h += k / 2; x += Math.sin(h); z -= Math.cos(h); h += k / 2; } });
  return {x, z, h};
}
function raccorder(pieces) {
  const r = pieces[pieces.length - 1], avant = pieces.slice(0, -1), fin = poseFinale(avant), R = r.rayon || 30;
  const sol = cheminRaccord(fin.x, fin.z, fin.h - Math.PI / 2, 0, 0, -Math.PI / 2, R);
  if (!sol) throw new Error("Le raccord ne trouve pas de chemin : rapprocher la fin du départ, ou changer son rayon.");
  const [t, p, q, s1, s2] = sol, base = Object.assign({}, r), deg = 180 / Math.PI, bouts = [];
  delete base.raccord; delete base.rayon; delete base.objets; delete base.lieux;
  if (t * R >= 1) bouts.push(Object.assign({}, base, {long: Math.round(t * R), virage: s1 * t * deg}));
  if (p * R >= 1) bouts.push(Object.assign({}, base, {long: Math.round(p * R), virage: 0, droit: true}));
  if (q * R >= 1) bouts.push(Object.assign({}, base, {long: Math.round(q * R), virage: s2 * q * deg}));
  if (!bouts.length) return avant;
  (bouts.find(b => b.droit) || bouts[0]).objets = r.objets;   // ses objets vont sur la ligne droite
  bouts.slice(1).forEach(b => delete b.nom);
  if (typeof r.monte === "number") { const L = bouts.reduce((a, b) => a + b.long, 0); for (const b of bouts) b.monte = r.monte * b.long / L; }
  return avant.concat(bouts);
}

function adoucir(A, rayon, boucle, garde) {   // la moyenne des voisins, à « rayon » mètres de chaque côté
  // garde[i] : ce mètre ne bouge pas, et ses voisins ne regardent pas au-delà de lui (le pied d'une chute reste net : l'eau ne remonte pas après)
  const N = A.length, O = new Float32Array(N), en = i => boucle ? ((i % N) + N) % N : clamp(i, 0, N - 1);
  for (let i = 0; i < N; i++) {
    if (garde && garde[i]) { O[i] = A[i]; continue; }
    let t = A[i];
    for (const sens of [-1, 1]) { let v = A[i], mur = false; for (let j = 1; j <= rayon; j++) { const k = en(i + sens * j); if (!mur && garde && garde[k]) mur = true; if (!mur) v = A[k]; t += v; } }
    O[i] = t / (2 * rayon + 1);
  }
  return O;
}

const PISTE = (() => {
  let source = NIVEAU.pieces.map(p => Object.assign({}, p));
  if (source.some(p => p.raccord)) {
    if (!BOUCLE || !source[source.length - 1].raccord) throw new Error("La pièce « raccord » se met à la fin d'un circuit en boucle.");
    source = raccorder(source);
  } else if (BOUCLE) fermer(source);
  // la hauteur : chaque pièce monte ou descend ; un circuit revient à sa hauteur de départ
  const autosY = source.filter(p => p.monte === "auto"), sommeY = source.reduce((t, p) => t + (+p.monte || 0), 0);
  for (const p of autosY) p.monte = BOUCLE ? -sommeY / autosY.length : 0;
  const derive = BOUCLE && !autosY.length ? -sommeY : 0;   // sans pièce « auto » : l'écart est réparti sur tout le tour
  const X = [], Z = [], H = [], Y0 = [], W0 = [], KG = [], KD = [], TUN = [], PONT = [], NET = [], SF = [], PC = [], A0 = [], K0 = [], CH0 = [], CR0 = [], pieces = [], surfaces = [];
  const ns = nombres(source);
  let x = 0, z = 0, h = 0, y = 0, s = 0, titre = "";
  source.forEach((p, ip) => {
    const n = ns[ip], k = (p.virage || 0) * Math.PI / 180 / n, w = largeur(p); titre = p.nom || titre;
    for (const c of [p.g, p.d]) if (!TYPES.includes(c)) throw new Error("Rive inconnue dans le niveau : " + c);
    if (!(w > 0)) throw new Error("Pièce sans largeur : « " + titre + " ».");
    const surf = PARAMS.get("surface") || p.surface || NIVEAU.surface || "eau"; if (!surfaces.includes(surf)) surfaces.push(surf);
    pieces.push(Object.assign(p, {s0: s, s1: s + n, titre, surface: surf}));
    for (let i = 0; i < n; i++) {
      X.push(x); Z.push(z); H.push(h); Y0.push(y); W0.push(w / 2); KG.push(TYPES.indexOf(p.g)); KD.push(TYPES.indexOf(p.d));
      TUN.push(p.tunnel && i >= MARGE && i < n - MARGE ? 1 : 0); PONT.push(p.pont ? 1 : 0); NET.push(p.net ? 1 : 0); SF.push(surfaces.indexOf(surf)); PC.push(ip);
      A0.push(p.allure || 1); K0.push(k); CH0.push((p.camera && p.camera.haut) || 0); CR0.push((p.camera && p.camera.recul) || 0);
      y += (+p.monte || 0) / n; h += k / 2; x += Math.sin(h); z -= Math.cos(h); h += k / 2; s++;
    }
  });
  const N = X.length, borne = i => BOUCLE ? ((i % N) + N) % N : clamp(i, 0, N - 1);
  const fermeture = BOUCLE ? Math.hypot(x, z) : 0;
  if (BOUCLE) for (let i = 0; i < N; i++) { X[i] -= x * i / N; Z[i] -= z * i / N; Y0[i] += derive * i / N; }   // les derniers centimètres, répartis sur tout le tour
  // la hauteur adoucie (sauf les pièces « net »), jamais sous le niveau de la mer
  let Y = adoucir(adoucir(Y0, 4, BOUCLE, NET), 4, BOUCLE, NET), bas = Infinity;
  for (let i = 0; i < N; i++) bas = Math.min(bas, Y[i]);
  for (let i = 0; i < N; i++) Y[i] -= bas;
  const PENTE = new Float32Array(N); for (let i = 0; i < N; i++) PENTE[i] = (Y[borne(i + 1)] - Y[borne(i - 1)]) / 2;
  // le sens où l'eau file (COULE, la pente vue par l'eau) : vers le bas d'une pente, mais une petite bosse (un tremplin, moins de 2 m)
  // ne la fait pas remonter vers le joueur : sur une montée courte, l'eau continue dans le sens de la course (Kiki, 11/11)
  const COULE = Float32Array.from(PENTE);
  for (let i = 0; i < N; i++) {
    if (PENTE[i] <= .01 || PENTE[borne(i - 1)] > .01) continue;   // le pied d'une montée
    let j = i, n = 0; while (PENTE[borne(j)] > .01 && n < N) { j++; n++; }
    if (Y[borne(j)] - Y[i] < 2) for (let k = i; k < j; k++) COULE[borne(k)] = -PENTE[borne(k)];
  }
  const COURB = adoucir(K0, 5, BOUCLE), W = adoucir(W0, FONDU, BOUCLE), CAMH = adoucir(CH0, 12, BOUCLE), CAMR = adoucir(CR0, 12, BOUCLE);
  // l'allure du décor : celle du niveau, celle de la pièce, et la pente (ça file dans une descente, ça peine dans une côte)
  const pd = adoucir(PENTE, 5, BOUCLE), al = new Float32Array(N);
  for (let i = 0; i < N; i++) al[i] = ALLURE * A0[i] * (NIVEAU.allurePente === false ? 1 : clamp(1 - pd[i] * 3.5, .55, 1.7));
  const ALL = adoucir(al, 8, BOUCLE), VR = new Float64Array(N + 1);   // VR : les vrais mètres depuis la ligne (pour une allure de machine de 1)
  for (let i = 0; i < N; i++) VR[i + 1] = VR[i] + 1 / ALL[i];
  // la part de chaque sorte de rive, à chaque mètre
  const poids = K => {
    const o = new Float32Array(N * NT);
    for (let i = 0; i < N; i++) {
      for (let j = -FONDU; j <= FONDU; j++) o[i * NT + K[borne(i + j)]] += 1 / (2 * FONDU + 1);
      for (let t = 0; t < NT; t++) {   // une rive « franche » (un quai) ne se fond jamais avec la nature
        const w = o[i * NT + t]; if (!RIVES[t].franc || w <= 0 || w >= .999) continue;
        const ici = K[i] === t; for (let u = 0; u < NT; u++) o[i * NT + u] = ici ? (u === t ? 1 : 0) : (u === t ? 0 : o[i * NT + u] / (1 - w));
      }
    }
    return o;
  };
  // les bouts : 1 = le bout d'un niveau ouvert, 2 = la culée d'un pont (le sol s'arrête, la piste continue en l'air)
  const FA = new Uint8Array(N), FR = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (PONT[i]) continue;
    if (BOUCLE ? PONT[(i + 1) % N] : i < N - 1 && PONT[i + 1]) FA[i] = 2; else if (!BOUCLE && i === N - 1) FA[i] = 1;
    if (BOUCLE ? PONT[(i + N - 1) % N] : i > 0 && PONT[i - 1]) FR[i] = 2; else if (!BOUCLE && i === 0) FR[i] = 1;
  }
  const CH = new Float32Array(N), SH = new Float32Array(N); for (let i = 0; i < N; i++) { CH[i] = Math.cos(H[i]); SH[i] = Math.sin(H[i]); }
  return {N, X, Z, Y, H, HFIN: h, W, PG: poids(KG), PD: poids(KD), TUN, PONT, NET, SF, PC, PENTE, COULE, COURB, ALL, VR, CAMH, CAMR, FA, FR, CH, SH, pieces, surfaces, fermeture};
})();
const LONG = BOUCLE ? PISTE.N : PISTE.N - 1;   // la longueur du niveau (un tour, pour une boucle)
const idx = s => { const i = Math.round(s), N = PISTE.N; return BOUCLE ? ((i % N) + N) % N : clamp(i, 0, N - 1); };          // le mètre de la piste le plus proche de s
const ecart = (a, b) => { const d = a - b; return BOUCLE ? d - LONG * Math.round(d / LONG) : d; };                           // de b à a le long de la piste (au plus court sur une boucle)
const surfaceEn = s => PISTE.surfaces[PISTE.SF[idx(s)]];
const vrai = s => { const N = PISTE.N, t = BOUCLE ? ((s % N) + N) % N : clamp(s, 0, N), i = Math.min(N - 1, Math.floor(t)); return lerp(PISTE.VR[i], PISTE.VR[i + 1], t - i); };   // les vrais mètres depuis la ligne
const TOUR_VRAI = PISTE.VR[PISTE.N];

/* où est le mètre s de la piste (au-delà des deux bouts d'un niveau ouvert : tout droit ; sur une boucle : on refait le tour) */
function at(s) {
  const P = PISTE, N = P.N;
  if (BOUCLE) {
    s = ((s % N) + N) % N; const i = Math.min(N - 1, Math.floor(s)), u = s - i, j = (i + 1) % N;
    return {x: lerp(P.X[i], P.X[j], u), y: lerp(P.Y[i], P.Y[j], u), z: lerp(P.Z[i], P.Z[j], u), h: lerp(P.H[i], j ? P.H[j] : P.HFIN, u), w: lerp(P.W[i], P.W[j], u)};
  }
  if (s <= 0) return {x: P.X[0] + Math.sin(P.H[0]) * s, y: P.Y[0], z: P.Z[0] - Math.cos(P.H[0]) * s, h: P.H[0], w: P.W[0]};
  if (s >= LONG) { const d = s - LONG; return {x: P.X[LONG] + Math.sin(P.H[LONG]) * d, y: P.Y[LONG], z: P.Z[LONG] - Math.cos(P.H[LONG]) * d, h: P.H[LONG], w: P.W[LONG]}; }
  const i = Math.floor(s), u = s - i;
  return {x: lerp(P.X[i], P.X[i + 1], u), y: lerp(P.Y[i], P.Y[i + 1], u), z: lerp(P.Z[i], P.Z[i + 1], u), h: lerp(P.H[i], P.H[i + 1], u), w: lerp(P.W[i], P.W[i + 1], u)};
}
function pose(s, d) { const a = at(s); a.x += Math.cos(a.h) * d; a.z += Math.sin(a.h) * d; return a; }   // d en mètres, + = à droite
const pieceEn = s => PISTE.pieces[PISTE.PC[idx(s)]];

/* le point AU SOL de la piste le plus proche d'un point du monde (un pont ne compte pas : le sol ne le suit pas) :
   Q.i (le mètre), Q.d (écart, + = à droite), Q.av (en avant de ce mètre), Q.e (distance au bord de la piste), Q.bout (0, 1 ou 2 : voir FA et FR).
   Les points de la piste sont rangés dans une grille de cases de 32 m : on ne compare qu'aux cases voisines. */
const Q = {i: 0, d: 0, av: 0, e: 0, bout: 0};
const CASES = (() => {
  const P = PISTE, C = 32, M = 260; let xa = 1e9, xb = -1e9, za = 1e9, zb = -1e9;
  for (let i = 0; i < P.N; i++) { xa = Math.min(xa, P.X[i]); xb = Math.max(xb, P.X[i]); za = Math.min(za, P.Z[i]); zb = Math.max(zb, P.Z[i]); }
  const x0 = xa - M, z0 = za - M, nx = Math.ceil((xb + M - x0) / C), nz = Math.ceil((zb + M - z0) / C), cases = Array.from({length: nx * nz}, () => []);
  for (let i = 0; i < P.N; i++) if (!P.PONT[i]) cases[Math.floor((P.Z[i] - z0) / C) * nx + Math.floor((P.X[i] - x0) / C)].push(i);
  return {C, x0, z0, nx, nz, cases, xa, xb, za, zb};
})();
function pres(x, z) {
  const P = PISTE, G = CASES, cx = clamp(Math.floor((x - G.x0) / G.C), 0, G.nx - 1), cz = clamp(Math.floor((z - G.z0) / G.C), 0, G.nz - 1); let b = 1e18, bi = -1;
  for (let r = 0; r < 40; r++) {  // anneau par anneau, jusqu'à être sûr qu'aucune case plus lointaine ne peut faire mieux
    for (let j = cz - r; j <= cz + r; j++) {
      if (j < 0 || j >= G.nz) continue; const pas = j === cz - r || j === cz + r ? 1 : 2 * r || 1;
      for (let i = cx - r; i <= cx + r; i += pas) {
        if (i < 0 || i >= G.nx) continue;
        for (const k of G.cases[j * G.nx + i]) { const dx = x - P.X[k], dz = z - P.Z[k], q = dx * dx + dz * dz; if (q < b) { b = q; bi = k; } }
      }
    }
    if (bi >= 0 && b <= (r * G.C) * (r * G.C)) break;
  }
  if (bi < 0) bi = 0;
  const c = P.CH[bi], sn = P.SH[bi], dx = x - P.X[bi], dz = z - P.Z[bi], av = dx * sn - dz * c;
  Q.i = bi; Q.d = dx * c + dz * sn; Q.av = av;
  Q.bout = av > 0 ? P.FA[bi] : av < 0 ? P.FR[bi] : 0;
  Q.e = (Q.bout ? Math.sqrt(dx * dx + dz * dz) : Math.abs(Q.d)) - P.W[bi];
  return Q;
}

/* un point est-il à l'intérieur du circuit ? (au loin : des collines dedans, la mer dehors) */
const CONTOUR_PISTE = (() => { const o = []; if (BOUCLE) for (let i = 0; i < PISTE.N; i += 5) o.push(PISTE.X[i], PISTE.Z[i]); return o; })();
function dedans(x, z) {
  const C = CONTOUR_PISTE, n = C.length / 2; let c = false;
  for (let i = 0, j = n - 1; i < n; j = i++) { const xi = C[i * 2], zi = C[i * 2 + 1], xj = C[j * 2], zj = C[j * 2 + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; }
  return c;
}

/* le contrôleur : ce niveau tient-il debout ? (virages, pentes, fermeture, croisements) */
function verifier() {
  const P = PISTE, N = P.N, erreurs = [], croisements = [];
  if (BOUCLE && P.fermeture > 3) erreurs.push("La boucle se referme mal : " + P.fermeture.toFixed(1) + " m d'écart.");
  let rayonMin = Infinity, penteMax = 0, haut = 0;
  for (const p of P.pieces) {
    if (!p.virage) continue;
    const R = (p.s1 - p.s0) / Math.abs(p.virage * Math.PI / 180), w = largeur(p) / 2; rayonMin = Math.min(rayonMin, R);
    if (R < w + 1.5) erreurs.push("Virage trop serré : « " + p.titre + " » (rayon " + R.toFixed(1) + " m pour une demi-largeur de " + w + " m).");
  }
  const presNet = i => { for (let j = -8; j <= 8; j++) if (P.NET[BOUCLE ? ((i + j) % N + N) % N : clamp(i + j, 0, N - 1)]) return true; return false; };   // autour d'une chute, la pente est voulue
  for (let i = 0; i < N; i++) { haut = Math.max(haut, P.Y[i]); if (!presNet(i)) penteMax = Math.max(penteMax, Math.abs(P.PENTE[i])); }
  if (penteMax > .3) erreurs.push("Pente trop raide (" + Math.round(penteMax * 100) + " %) : allonger la pièce, ou la marquer « net » si c'est une chute.");
  const pas = 2, coupe = (a, b, c, d) => {   // les segments ab et cd se coupent-ils ?
    const o = (p, q, r) => (P.X[q] - P.X[p]) * (P.Z[r] - P.Z[p]) - (P.Z[q] - P.Z[p]) * (P.X[r] - P.X[p]);
    return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
  };
  for (let i = 0; i + pas < N; i += pas) for (let j = i + 30; j < N; j += pas) {
    if (BOUCLE && N - j + i < 30) continue;
    const j2 = BOUCLE ? (j + pas) % N : Math.min(N - 1, j + pas);
    if (j2 === j || !coupe(i, i + pas, j, j2)) continue;
    if (croisements.some(c => Math.abs(c.s1 - i) < 12 && Math.abs(c.s2 - j) < 12)) continue;
    const dy = P.Y[j] - P.Y[i], dessus = dy > 0 ? j : i, dessous = dy > 0 ? i : j, bon = (P.PONT[dessus] || P.TUN[dessous]) && Math.abs(dy) >= 4.5;
    croisements.push({s1: i, s2: j, ecart: +Math.abs(dy).toFixed(1), bon: !!bon});
    if (!bon) erreurs.push("La piste se croise au mètre " + i + " et au mètre " + j + " sans pont : il faut une pièce « pont » au-dessus, 4,5 m plus haut au moins (ici " + Math.abs(dy).toFixed(1) + " m).");
  }
  return {ok: !erreurs.length, erreurs, croisements, longueur: N, tourVrai: +TOUR_VRAI.toFixed(1), haut: +haut.toFixed(1), penteMax: +penteMax.toFixed(3), rayonMin: +rayonMin.toFixed(1), fermeture: +P.fermeture.toFixed(2)};
}
