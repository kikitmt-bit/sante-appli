/* ============ le champ : la hauteur et la couleur du sol en tout point du monde, par vote des points de la piste ============ */
// Chaque sorte de rive a un profil : la hauteur du sol selon la distance au bord de la piste, au-dessus de la piste à cet endroit.
// Le sol d'un point du monde n'est pas la copie du point de piste le plus proche : tous les points de piste voisins VOTENT, les plus
// proches comptant le plus. Entre deux bouts de piste qui se font face (une épingle, un lacet, une rampe au-dessus d'une rivière),
// le sol passe donc en douceur de l'un à l'autre, sans cassure. Un pont ne vote pas : le sol passe dessous.
// Ce fichier ne dessine rien (aucun appel à three.js) : il se contrôle sans navigateur.
const SOLS = Object.fromEntries(Object.entries(BIOME.sols).map(([k, v]) => [k, {c: v.c.map(hex), mat: v.mat || 0}]));
const ILE = NIVEAU.loin ? NIVEAU.loin !== "terres" : DISC_PISTE !== "terre";   // un circuit sur la terre n'est jamais une île : des collines au loin, aucune mer
/* une montagne au milieu d'un circuit en boucle ("massif": {"haut": 140, "rayon": 0.9, "cratere": true}) : un volcan dont on fait le tour (Kiki, 12/11 : « faire le tour du volcan »).
   Son centre : le milieu du circuit (dx, dz pour le décaler) ; rayon : par rapport à la distance moyenne du circuit à ce milieu ; sol, roche : ses couleurs en haut */
const MASSIF = (() => { const m = NIVEAU.massif, P = PISTE; if (!m) return null; let x = 0, z = 0, y = 0, d = 0;
  for (let i = 0; i < P.N; i++) { x += P.X[i]; z += P.Z[i]; y += P.Y[i]; } x /= P.N; z /= P.N; y /= P.N;
  for (let i = 0; i < P.N; i++) d += Math.hypot(P.X[i] - x, P.Z[i] - z); d /= P.N;
  return {x: x + (m.dx || 0), z: z + (m.dz || 0), y, h: m.haut || 120, r: (m.rayon || .9) * d, cratere: m.cratere !== false, sol: m.sol || "cendre", roche: m.roche || "basalte"}; })();
function massifEn(x, z) { const r = Math.hypot(x - MASSIF.x, z - MASSIF.z) / MASSIF.r; if (r >= 1) return -1e9;
  const rc = MASSIF.cratere ? .1 : 0, haut = MASSIF.y + MASSIF.h * Math.pow(1 - Math.max(r, rc), 1.35) + 7 * r * (fbm(x / 40 + 5, z / 40 + 1) - .45);
  return r < rc ? haut - MASSIF.h * .16 * (1 - (r / rc) ** 2) : haut; }   // au loin, hors du circuit : la mer (par défaut) ou des collines ("loin": "terres")
function profil(pts, e) {
  if (e <= pts[0][0]) return pts[0][1];
  for (let k = 1; k < pts.length; k++) if (e < pts[k][0]) return lerp(pts[k - 1][1], pts[k][1], (e - pts[k - 1][0]) / (pts[k][0] - pts[k - 1][0]));
  return pts[pts.length - 1][1];
}
function hRive(i, cote, e) {  // la hauteur de la rive au-dessus de la piste, à e mètres du bord, au mètre i, du côté donné (0 = gauche) : le calcul exact
  const P = cote ? PISTE.PD : PISTE.PG; let h = 0;
  for (let t = 0; t < NT; t++) { const w = P[i * NT + t]; if (w) h += w * profil(RIVES[t].profil, e); }
  return h;
}
/* les mêmes profils, rangés d'avance pour chaque mètre de piste (le vote en lit des dizaines par point du monde) */
const NE = 40, E_MAX = 200;
const REL = [0, 1].map(() => new Float32Array(PISTE.N * NE)), AMP = [0, 1].map(() => new Float32Array(PISTE.N));
for (let cote = 0; cote < 2; cote++) {
  const PW = cote ? PISTE.PD : PISTE.PG;
  for (let i = 0; i < PISTE.N; i++) {
    for (let m = 0; m < NE; m++) REL[cote][i * NE + m] = hRive(i, cote, E_MAX * (m / (NE - 1)) ** 2);
    let a = 0; for (let t = 0; t < NT; t++) a += PW[i * NT + t] * (RIVES[t].bosses || 0);
    AMP[cote][i] = a;
  }
}
function relTab(cote, i, e) {
  const u = Math.sqrt(clamp(e, 0, E_MAX) / E_MAX) * (NE - 1), m = Math.min(NE - 2, Math.floor(u)), T = REL[cote], k = i * NE + m;
  return T[k] + (T[k + 1] - T[k]) * (u - m);
}
/* les grottes en cavernes (une grotte de la région à parois brutes : "brut" > 0, sans étais) : leur gabarit mètre par mètre.
   Étroites à l'entrée (l'arche de la façade), elles s'ouvrent en grandes salles ; la rivière n'en occupe que le milieu, des rives de roche de chaque côté.
   L, R : ce que la salle a de plus que l'eau, à gauche et à droite ; H : sa hauteur ; F : 0 à l'entrée, 1 au cœur. tunnel.js la creuse, ici la montagne passe au-dessus. */
const CAV = (() => {
  const P = PISTE, N = P.N, L = new Float32Array(N), R = new Float32Array(N), H = new Float32Array(N), F = new Float32Array(N), G0 = BIOME.grottes || {};
  const remplir = (ia, ib) => {
    const G = G0[pieceEn(ia).grotte] || {}; if (!(G.brut > 0) || G.poutres || G.caverne === false) return;
    const hv = clamp(G.haut || 5.4, 4, 7), gr = (NIVEAU.graine || 1) * 7.3 + ia * .37, amp = G.ampleur || 1;
    for (let i = ia; i <= ib; i++) { const f = lisse(0, 20, Math.min(i - ia, ib - i)), cl = bruit(i / 30 + gr, 1.3), cr = bruit(i / 30 + gr, 5.7), ch = bruit(i / 42 + gr, 9.1);
      L[i] = f * (2.5 + 12 * cl * cl) * amp; R[i] = f * (2.5 + 12 * cr * cr) * amp; H[i] = lerp(hv, (7.5 + 9 * ch) * Math.min(amp, 1.3), f); F[i] = f; }
  };
  let debut = -1;
  for (let i = 0; i <= N; i++) { const t = i < N && P.TUN[i]; if (t && debut < 0) debut = i; if (!t && debut >= 0) { remplir(debut, i - 1); debut = -1; } }
  return {L, R, H, F};
})();

function relDe(j, lat, av) {  // la hauteur (au-dessus de la piste) que le mètre j propose pour un point à « lat » mètres sur son côté et « av » mètres devant lui
  const P = PISTE, cote = lat > 0 ? 1 : 0, bout = av > 0 ? P.FA[j] : av < 0 ? P.FR[j] : 0;
  if (bout === 2) {   // la culée d'un pont : le sol redescend devant, et reste sous le tablier
    const r = relTab(cote, j, Math.max(Math.hypot(lat, av) - P.W[j], 0)) - .7 * Math.abs(av);
    return Math.abs(lat) < P.W[j] + 1.2 ? Math.min(r, -.4 - .7 * Math.abs(av)) : r;
  }
  const e = (bout ? Math.hypot(lat, av) : Math.abs(lat)) - P.W[j];
  if (P.TUN[j]) {
    const dessus = e < .8 ? relTab(cote, j, 2) + .2 : relTab(cote, j, Math.max(e, 0));   // au-dessus d'un tunnel : le dessus de la montagne
    if (CAV.F[j] > 0 && e < (cote ? CAV.R[j] : CAV.L[j]) + 7) return Math.max(dessus, CAV.H[j] + 5.5);   // au-dessus d'une caverne : assez haut pour la couvrir
    if (e < .8) return dessus;
  }
  return relTab(cote, j, Math.max(e, 0));
}

/* le vote. Après l'appel : V.h (la hauteur du sol), V.y (la hauteur de la piste alentour), V.a (l'ampleur des bosses) ; Q décrit le point de piste le plus proche */
const V = {h: 0, y: 0, a: 0};
function voter(x, z) {
  pres(x, z);
  const P = PISTE, G = CASES, i1 = Q.i, e1 = Q.e, d1 = Math.hypot(Q.d, Q.av);
  const B = Math.min(5 + .45 * Math.max(0, e1), 70), rmax = d1 + B, pas = Math.max(1, Math.floor(e1 / 12));   // loin de la piste : on vote large, et un point de piste sur « pas » suffit
  let sw = 1, sh = P.Y[i1] + relDe(i1, Q.d, Q.av), sy = P.Y[i1], sa = AMP[Q.d > 0 ? 1 : 0][i1];
  const ca = clamp(Math.floor((x - rmax - G.x0) / G.C), 0, G.nx - 1), cb = clamp(Math.floor((x + rmax - G.x0) / G.C), 0, G.nx - 1);
  const za = clamp(Math.floor((z - rmax - G.z0) / G.C), 0, G.nz - 1), zb = clamp(Math.floor((z + rmax - G.z0) / G.C), 0, G.nz - 1);
  for (let cz = za; cz <= zb; cz++) for (let cx = ca; cx <= cb; cx++) {
    const L = G.cases[cz * G.nx + cx];
    for (let n = 0; n < L.length; n++) {
      const k = L[n]; if (k === i1 || (pas > 1 && k % pas)) continue;
      const dx = x - P.X[k], dz = z - P.Z[k], d = Math.sqrt(dx * dx + dz * dz); if (d >= rmax) continue;
      const u = 1 - (d - d1) / B, w = u * u, lat = dx * P.CH[k] + dz * P.SH[k], av = dx * P.SH[k] - dz * P.CH[k];
      sw += w; sh += w * (P.Y[k] + relDe(k, lat, av)); sy += w * P.Y[k]; sa += w * AMP[lat > 0 ? 1 : 0][k];
    }
  }
  V.h = sh / sw; V.y = sy / sw; V.a = sa / sw;
  return V;
}
/* les ravins : une pièce « pont » peut passer au-dessus d'un ravin ("ravin": 9 = sa profondeur en mètres) : le sol se creuse sous le pont,
   en travers, sur une centaine de mètres de chaque côté ; une rivière coule au fond (surfaces.js), sauf "ravin_eau": false */
const RAVINS = (() => {
  const P = PISTE, o = []; let debut = -1;
  for (let i = 0; i <= P.N; i++) {
    const pont = i < P.N && P.PONT[i] && P.pieces[P.PC[i]].ravin > 0;
    if (pont && debut < 0) debut = i;
    if (!pont && debut >= 0) { const a = debut, b = i - 1, dx = P.X[b] - P.X[a], dz = P.Z[b] - P.Z[a], L = Math.hypot(dx, dz) || 1; o.push({ia: a, ib: b, x: P.X[a], z: P.Z[a], ux: dx / L, uz: dz / L, L, creux: P.pieces[P.PC[a]].ravin, y: P.Y[a], eau: P.pieces[P.PC[a]].ravin_eau !== false}); debut = -1; }
  }
  return o;
})();
function creuser(x, z) {   // de combien le sol descend ici, à cause d'un ravin
  let c = 0;
  for (const r of RAVINS) { const dx = x - r.x, dz = z - r.z, u = (dx * r.ux + dz * r.uz) / r.L, v = Math.abs(dx * r.uz - dz * r.ux);
    if (u <= .04 || u >= .96 || v > 130) continue;
    c = Math.max(c, r.creux * lisse(.04, .34, u) * (1 - lisse(.66, .96, u)) * (1 - lisse(55, 130, v))); }
  return c;
}
function finir(x, z) {  // après le vote : les bosses, puis les ravins, puis le lointain (des collines dans le circuit, la mer ou des collines dehors)
  const e = Q.e; let h = V.h;
  if (RAVINS.length) h -= creuser(x, z);
  if (V.a) h += V.a * lisse(4, 34, e) * (fbm(x / 46 + 3, z / 46 + 7) - .42) * 2;
  if (e > 100) {
    if ((BOUCLE && dedans(x, z)) || !ILE) h = lerp(h, V.y + 5 + 5 * (fbm(x / 70 + 1, z / 70 + 4) - .4), lisse(100, 190, e));
    else h = lerp(h, -3, lisse(120, 170, e));
  }
  if (MASSIF) { const m = massifEn(x, z); if (m > h) h = lerp(h, m, lisse(8, 40, e)); }
  return h;
}
function hSol(x, z) { voter(x, z); return finir(x, z); }   // le sol, sans creuser le lit de la piste (pour les rives)
function hauteur(x, z) {  // la hauteur du sol en un point du monde (dans la piste : son lit ; au-dessus d'un tunnel : le dessus de la montagne)
  voter(x, z);
  if (Q.e < 0 && Q.bout !== 2 && !PISTE.TUN[Q.i]) return PISTE.Y[Q.i] - 1.5;
  return finir(x, z);
}

/* la largeur libre de chaque rive : à l'intérieur d'un virage serré, les rives s'arrêtent là où un autre bout de piste devient plus proche (99 : rien ne gêne) */
const LARGE_RIVE = 13.5;
const LIBRE = [0, 1].map(cote => {
  const P = PISTE, N = P.N, o = new Float32Array(N).fill(99), sg = cote ? 1 : -1;
  const bon = (i, e) => { const d = P.W[i] + e; pres(P.X[i] + sg * P.CH[i] * d, P.Z[i] + sg * P.SH[i] * d); return Q.e > e - .4; };
  for (let i = 0; i < N; i++) {
    if (P.PONT[i] || bon(i, LARGE_RIVE)) continue;
    let a = 0, b = LARGE_RIVE; for (let k = 0; k < 7; k++) { const m = (a + b) / 2; if (bon(i, m)) a = m; else b = m; }
    o[i] = a;
  }
  const f = new Float32Array(N);   // le plus petit des voisins : une limite régulière
  for (let i = 0; i < N; i++) { let m = 99; for (let j = -2; j <= 2; j++) m = Math.min(m, o[BOUCLE ? ((i + j) % N + N) % N : clamp(i + j, 0, N - 1)]); f[i] = m; }
  return f;
});

const COUL = [0, 0, 0, 0];
function couleurSol(i, cote, e, ny, x, z) {  // la couleur du sol : celle de la rive (sable puis herbe…), la paroi si ça monte raide, en taches de deux tons
  const P = cote ? PISTE.PD : PISTE.PG, raide = 1 - lisse(.6, .8, ny), tache = bruit(x / 5.5 + 9, z / 5.5 + 2) > .56 ? 1 : 0, ee = e + (bruit(x / 6, z / 6) - .5) * 4; let r = 0, g = 0, b = 0, m = 0;
  for (let t = 0; t < NT; t++) {
    const w = P[i * NT + t]; if (!w) continue;
    const R = RIVES[t]; let nom = R.sols[R.sols.length - 1][0]; for (const [n, jusqu] of R.sols) if (ee < jusqu) { nom = n; break; }
    const S = SOLS[nom], Pa = SOLS[R.paroi], c = S.c[tache % S.c.length], p = Pa.c[tache % Pa.c.length];
    r += w * lerp(c[0], p[0], raide); g += w * lerp(c[1], p[1], raide); b += w * lerp(c[2], p[2], raide); m += w * (raide > .5 ? Pa.mat : S.mat);
  }
  if (e > 100 && ((BOUCLE && dedans(x, z)) || !ILE)) {   // au loin, dans les collines : la même herbe partout
    const k = lisse(100, 190, e), c = SOLS.herbe.c[tache % SOLS.herbe.c.length]; r = lerp(r, c[0], k); g = lerp(g, c[1], k); b = lerp(b, c[2], k);
  }
  if (MASSIF && e > 8) { const rr = Math.hypot(x - MASSIF.x, z - MASSIF.z) / MASSIF.r;   // la montagne : de l'herbe au pied, de la cendre en haut, sa roche dans les pentes raides
    if (rr < 1.05) { const k = lisse(8, 40, e) * (1 - lisse(.8, 1.05, rr)), S = SOLS[rr < .55 + .08 * (bruit(x / 30, z / 30) - .5) ? MASSIF.sol : "herbe"] || SOLS.herbe, Pa = SOLS[MASSIF.roche] || SOLS.roche, c = melange(S.c[tache % S.c.length], Pa.c[tache % Pa.c.length], raide);
      r = lerp(r, c[0], k); g = lerp(g, c[1], k); b = lerp(b, c[2], k); } }
  COUL[0] = r; COUL[1] = g; COUL[2] = b; COUL[3] = m > .5 ? 1 : 0; return COUL;
}
function couleurEn(x, z) { pres(x, z); const c = couleurSol(Q.i, Q.d > 0 ? 1 : 0, Math.max(Q.e, 0), 1, x, z); return [c[0], c[1], c[2]]; }
