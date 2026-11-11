/* ============ le terrain : tout vient de la piste et des rives de la région ============ */
// Chaque sorte de rive a un profil : la hauteur du sol selon la distance au bord de l'eau. Le sol d'un point du monde, c'est le profil
// de la rive la plus proche (deux rives voisines se mélangent en douceur), plus des bosses. Près de l'eau, un ruban précis suit la rive
// (bord net, quai droit, falaise) ; au-delà, une grille de 2,5 m. Le monde est une île : à 120 m de la rivière, le sol redescend dans la mer.
const SOLS = Object.fromEntries(Object.entries(BIOME.sols).map(([k, v]) => [k, {c: v.c.map(hex), mat: v.mat || 0}]));
const RB = 12, STATIONS = [0, .02, .4, 1.2, 3, 6, 10, 13.5];   // le ruban : ses points, en mètres depuis le bord de l'eau
function profil(pts, e) { if (e <= pts[0][0]) return pts[0][1]; for (let k = 1; k < pts.length; k++) if (e < pts[k][0]) return lerp(pts[k - 1][1], pts[k][1], (e - pts[k - 1][0]) / (pts[k][0] - pts[k - 1][0])); return pts[pts.length - 1][1]; }
function hVraie(i, cote, e, x, z) {  // la hauteur du sol à e mètres du bord de l'eau, au mètre i de la piste, du côté donné (0 = gauche)
  const P = cote ? PISTE.PD : PISTE.PG; let h = 0, a = 0;
  for (let t = 0; t < NT; t++) { const w = P[i * NT + t]; if (w) { h += w * profil(RIVES[t].profil, e); a += w * (RIVES[t].bosses || 0); } }
  if (a) h += a * lisse(4, 34, e) * (fbm(x / 46 + 3, z / 46 + 7) - .42) * 2;
  if (BOUCLE && cote === (SENS < 0 ? 0 : 1)) return lerp(h, 5 + 5 * (fbm(x / 70 + 1, z / 70 + 4) - .4), lisse(100, 190, e));   // au milieu d'un circuit : de douces collines, jamais la mer
  return lerp(h, -3, lisse(120, 170, e));
}
function hauteur(x, z) {  // la hauteur du sol en un point du monde (au-dessus d'un tunnel : le dessus de la montagne)
  pres(x, z); const i = Q.i, cote = Q.d > 0 ? 1 : 0;
  if (Q.e < .8) return PISTE.TUN[i] ? hVraie(i, cote, 2, x, z) + .2 : (Q.e < 0 ? -1.5 : hVraie(i, cote, Q.e, x, z));
  return hVraie(i, cote, Q.e, x, z);
}
const COUL = [0, 0, 0, 0];
function couleurSol(i, cote, e, ny, x, z) {  // la couleur du sol : celle de la rive (sable puis herbe…), la paroi si ça monte raide, en taches de deux tons
  const P = cote ? PISTE.PD : PISTE.PG, raide = 1 - lisse(.6, .8, ny), tache = bruit(x / 5.5 + 9, z / 5.5 + 2) > .56 ? 1 : 0, ee = e + (bruit(x / 6, z / 6) - .5) * 4; let r = 0, g = 0, b = 0, m = 0;
  for (let t = 0; t < NT; t++) { const w = P[i * NT + t]; if (!w) continue; const R = RIVES[t]; let nom = R.sols[R.sols.length - 1][0]; for (const [n, jusqu] of R.sols) if (ee < jusqu) { nom = n; break; }
    const S = SOLS[nom], Pa = SOLS[R.paroi], c = S.c[tache % S.c.length], p = Pa.c[tache % Pa.c.length];
    r += w * lerp(c[0], p[0], raide); g += w * lerp(c[1], p[1], raide); b += w * lerp(c[2], p[2], raide); m += w * (raide > .5 ? Pa.mat : S.mat); }
  if (BOUCLE && e > 100 && cote === (SENS < 0 ? 0 : 1)) { const k = lisse(100, 190, e), c = SOLS.herbe.c[tache % SOLS.herbe.c.length]; r = lerp(r, c[0], k); g = lerp(g, c[1], k); b = lerp(b, c[2], k); }   // au milieu d'un circuit : la même herbe partout
  COUL[0] = r; COUL[1] = g; COUL[2] = b; COUL[3] = m > .5 ? 1 : 0; return COUL;
}
function couleurEn(x, z) { pres(x, z); const c = couleurSol(Q.i, Q.d > 0 ? 1 : 0, Math.max(Q.e, 0), 1, x, z); return [c[0], c[1], c[2]]; }

function construireTerrain() {
  const P = PISTE, C = BOUCLE ? 3 : 2.5, M = 185, T = 24; let xa = 1e9, xb = -1e9, za = 1e9, zb = -1e9;
  for (let i = 0; i < P.N; i++) { xa = Math.min(xa, P.X[i]); xb = Math.max(xb, P.X[i]); za = Math.min(za, P.Z[i]); zb = Math.max(zb, P.Z[i]); }
  const x0 = Math.floor((xa - M) / C) * C, z0 = Math.floor((za - M) / C) * C, nx = Math.ceil((xb + M - x0) / C) + 1, nz = Math.ceil((zb + M - z0) / C) + 1, n = nx * nz;
  const HH = new Float32Array(n), GI = new Int32Array(n), GE = new Float32Array(n), GC = new Uint8Array(n), GK = new Uint8Array(n);
  // 1 = le couloir de la rivière à ciel ouvert, 2 = le dessus d'un tunnel, 3 = les flancs d'un tunnel, 0 = le reste
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = x0 + i * C, z = z0 + j * C, k = j * nx + i; pres(x, z); const e = Q.e, pi = Q.i, cote = Q.d > 0 ? 1 : 0, tun = P.TUN[pi]; GI[k] = pi; GE[k] = e; GC[k] = cote;
    if (e < .8) { if (tun) { HH[k] = hVraie(pi, cote, 2, x, z) + .2; GK[k] = 2; } else { HH[k] = -1.5; GK[k] = 1; } }
    else if (tun || e >= RB) { HH[k] = hVraie(pi, cote, e, x, z); GK[k] = tun && e < RB ? 3 : 0; }
    else { const f = 1 - lisse(RB - 5, RB, e); HH[k] = hVraie(pi, cote, Math.max(0, e - 3 * f), x, z) - .9 * f; } }   // sous le ruban des rives : un peu plus bas, pour ne jamais dépasser
  for (let tj = 0; tj < nz - 1; tj += T) for (let ti = 0; ti < nx - 1; ti += T) { const F = new Forme();
    const som = (i, j) => { const k = j * nx + i, x = x0 + i * C, z = z0 + j * C, hx = (HH[j * nx + Math.min(nx - 1, i + 1)] - HH[j * nx + Math.max(0, i - 1)]) / (2 * C), hz = (HH[Math.min(nz - 1, j + 1) * nx + i] - HH[Math.max(0, j - 1) * nx + i]) / (2 * C), N = nrm([-hx, 1, -hz]);
      const c = couleurSol(GI[k], GC[k], GK[k] === 2 ? 3 : Math.max(GE[k], 0), N[1], x, z); F.v(x, HH[k], z, N[0], N[1], N[2], c, c[3]); };
    let loin = true; for (let j = tj; j <= Math.min(tj + T, nz - 1) && loin; j += 4) for (let i = ti; i <= Math.min(ti + T, nx - 1); i += 4) if (GE[j * nx + i] < 75) { loin = false; break; }
    const pas = loin && tj + T <= nz - 1 && ti + T <= nx - 1 ? 2 : 1;   // loin de la rivière, des mailles deux fois plus grandes : quatre fois moins de triangles
    for (let j = tj; j < Math.min(tj + T, nz - 1); j += pas) for (let i = ti; i < Math.min(ti + T, nx - 1); i += pas) { const a = j * nx + i, b = a + pas, c = a + pas * nx, d = c + pas;
      for (const [p, q, r] of [[a, c, b], [b, c, d]]) { if (HH[p] < -.3 && HH[q] < -.3 && HH[r] < -.3) continue;   // sous l'eau : rien à dessiner
        const k1 = GK[p] === 1 || GK[q] === 1 || GK[r] === 1, k2 = GK[p] >= 2 || GK[q] >= 2 || GK[r] >= 2; if (k1 && k2) continue;   // à cheval sur l'entrée d'un tunnel : la façade prend le relais
        for (const k of [p, q, r]) som(k % nx, Math.floor(k / nx)); } }
    const m = F.maille(); if (m) { m.name = "terrain"; scene.add(m); } }
}

/* le ruban des rives : du bord de l'eau jusqu'à 13,5 m, mètre par mètre (bord net, parois droites) */
function construireRives() {
  const P = PISTE, nS = STATIONS.length, iMer = TYPES.indexOf("mer"), memo = [new Map(), new Map()];
  const coupe = (i, cote) => { let o = memo[cote].get(i); if (o) return o; const sg = cote ? 1 : -1, a = at(i), ox = sg * Math.cos(a.h), oz = sg * Math.sin(a.h), pts = [];
    for (let j = 0; j < nS; j++) { const e = STATIONS[j], x = a.x + ox * (a.w + e), z = a.z + oz * (a.w + e); pts.push([x, j === 0 ? -.8 : hVraie(i, cote, e, x, z) - (j === nS - 1 ? .9 : 0), z]); }
    const segs = []; for (let j = 0; j < nS - 1; j++) { const de = STATIONS[j + 1] - STATIONS[j], dy = pts[j + 1][1] - pts[j][1], N = nrm([-dy * ox, de, -dy * oz]), c0 = couleurSol(i, cote, STATIONS[j], N[1], pts[j][0], pts[j][2]).slice(), c1 = couleurSol(i, cote, STATIONS[j + 1], N[1], pts[j + 1][0], pts[j + 1][2]).slice(); segs.push({N, c0, c1}); }
    o = {pts, segs}; memo[cote].set(i, o); return o; };
  for (let c0 = 0; c0 < LONG; c0 += 40) { const F = new Forme();
    for (const cote of [0, 1]) { const PW = cote ? P.PD : P.PG;
      for (let i = c0; i < Math.min(c0 + 40, LONG); i++) { const j = BOUCLE ? (i + 1) % P.N : i + 1; if (P.TUN[i] && P.TUN[j]) continue; if (PW[i * NT + iMer] > .97 && PW[j * NT + iMer] > .97) continue;
        const A = coupe(i, cote), B = coupe(j, cote);
        for (let j = 0; j < nS - 1; j++) { const sa = A.segs[j], sb = B.segs[j], V = [[A.pts[j], sa.N, sa.c0], [A.pts[j + 1], sa.N, sa.c1], [B.pts[j + 1], sb.N, sb.c1], [B.pts[j], sb.N, sb.c0]];
          for (const k of [0, 1, 2, 0, 2, 3]) { const [p, N, c] = V[k]; F.v(p[0], p[1], p[2], N[0], N[1], N[2], c, c[3]); } } } }
    const m = F.maille(); if (m) { m.name = "rives"; scene.add(m); } }
}
