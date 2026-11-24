/* ============ le terrain : les maillages du sol, d'après le champ ============ */
// Près de la piste, un ruban précis suit chaque rive (bord net, quai droit, falaise) ; au-delà, une grille de 2,5 à 3 m.
// Le monde est une île (ou des terres) : loin de la piste, le sol redescend dans la mer ou ondule en collines (champ.js).
const RB = 12, STATIONS = [0, .02, .4, 1.2, 3, 6, 10, LARGE_RIVE];   // le ruban : ses points, en mètres depuis le bord de la piste

/* une cellule de la grille du sol : sa hauteur, le mètre de piste le plus proche (GI), sa distance au bord (GE), son côté (GC), sa nature (GK) :
   1 = le lit de la piste à ciel ouvert, 2 = le dessus d'un tunnel, 3 = les flancs d'un tunnel, 0 = le reste. Partagée avec les tronçons (troncons.js). */
function celluleSol(x, z, k, HH, GI, GE, GC, GK) {
  const P = PISTE, h = hSol(x, z), e = Q.e, pi = Q.i, cote = Q.d > 0 ? 1 : 0, tun = P.TUN[pi], culee = Q.bout === 2;
  GI[k] = pi; GE[k] = e; GC[k] = cote;
  const bec = culee && Q.av > -3 && Math.abs(Q.d) < P.W[pi] + .8;   // juste au bout d'un pont, dans le couloir de la piste : le sol passe sous le tablier (11/11 : deux coins d'herbe sur l'eau ; puis un trou sous le pont, d'où la culée)
  if (bec) { HH[k] = Math.min(h, P.Y[pi] - 1); GK[k] = 0; }   // juste sous le tablier (la culée de pierre cache le reste : surfaces.js)
  else if (e < .8 && !culee) { if (tun) { HH[k] = h; GK[k] = 2; } else { HH[k] = P.Y[pi] - 1.5; GK[k] = 1; } }
  else if (tun || e >= RB || culee) { HH[k] = h; GK[k] = tun && e < RB ? 3 : 0; }
  else {   // sous le ruban des rives : un peu plus bas, pour ne jamais dépasser
    const f = 1 - lisse(RB - 5, RB, e);
    HH[k] = h - .9 * f - Math.max(0, hRive(pi, cote, e) - hRive(pi, cote, Math.max(0, e - 3 * f)));
  }
}
function sommetSol(F, x, z, h, hx, hz, gi, gc, gk, ge) {   // un sommet du sol : sa pente (hx, hz) donne sa normale, donc sa couleur (la paroi si c'est raide)
  const N = nrm([-hx, 1, -hz]), c = couleurSol(gi, gc, gk === 2 ? 3 : Math.max(ge, 0), N[1], x, z); F.v(x, h, z, N[0], N[1], N[2], c, c[3]);
}
async function construireTerrain(cede) {   // cede (17/11) : rendre la main toutes les 40 ms (le menu reste vivant pendant que le monde se construit derrière) ; le résultat est le même
  let tc = performance.now(); const souffle = async () => { if (cede && performance.now() - tc > 40) { await cede(); tc = performance.now(); } };
  const P = PISTE, C = BOUCLE ? 3 : 2.5, M = 185, T = 24; let xa = 1e9, xb = -1e9, za = 1e9, zb = -1e9;
  for (let i = 0; i < P.M; i++) { xa = Math.min(xa, P.X[i]); xb = Math.max(xb, P.X[i]); za = Math.min(za, P.Z[i]); zb = Math.max(zb, P.Z[i]); }
  const x0 = Math.floor((xa - M) / C) * C, z0 = Math.floor((za - M) / C) * C, nx = Math.ceil((xb + M - x0) / C) + 1, nz = Math.ceil((zb + M - z0) / C) + 1, n = nx * nz;
  const HH = new Float32Array(n), GI = new Int32Array(n), GE = new Float32Array(n), GC = new Uint8Array(n), GK = new Uint8Array(n);
  // (16/11, étape 8 : une vraie route de 5 km tient dans un rectangle de 2 à 4 km de côté, presque vide) les carreaux de la grille à plus de
  // VU_LOIN m de toute la piste ne sont jamais vus (la caméra ne voit pas plus loin) : ni vote ni triangle. Sur un circuit de 2 km, aucun ou presque.
  const ntx = Math.ceil(nx / T), ntz = Math.ceil(nz / T), LOINT = new Uint8Array(ntx * ntz), demi = T * C * .71;
  for (let b = 0; b < ntz; b++) for (let a = 0; a < ntx; a++) {
    const cx = x0 + (a + .5) * T * C, cz = z0 + (b + .5) * T * C; let d = Infinity;
    for (let i = 0; i < P.M && d > VU_LOIN + demi; i += 4) d = Math.min(d, Math.hypot(P.X[i] - cx, P.Z[i] - cz));
    LOINT[b * ntx + a] = d > VU_LOIN + demi + 4 ? 1 : 0;
  }
  for (let j = 0; j < nz; j++) { for (let i = 0; i < nx; i++) {
    if (LOINT[Math.floor(j / T) * ntx + Math.floor(i / T)]) { const k = j * nx + i; HH[k] = -9; GE[k] = 999; continue; }   // jamais vu : sous la « mer », rien n'est dessiné
    celluleSol(x0 + i * C, z0 + j * C, j * nx + i, HH, GI, GE, GC, GK);
  } await souffle(); }
  for (let tj = 0; tj < nz - 1; tj += T) for (let ti = 0; ti < nx - 1; ti += T) {
    await souffle();
    const F = new Forme();
    const som = (i, j) => {
      const k = j * nx + i, hx = (HH[j * nx + Math.min(nx - 1, i + 1)] - HH[j * nx + Math.max(0, i - 1)]) / (2 * C), hz = (HH[Math.min(nz - 1, j + 1) * nx + i] - HH[Math.max(0, j - 1) * nx + i]) / (2 * C);
      sommetSol(F, x0 + i * C, z0 + j * C, HH[k], hx, hz, GI[k], GC[k], GK[k], GE[k]);
    };
    let loin = true, tresLoin = P.N > 3000;   // (16/11) une vraie route de plus de 3 km : au-delà de 160 m, des mailles quatre fois plus grandes (les circuits de 2 km ne changent pas)
    for (let j = tj; j <= Math.min(tj + T, nz - 1) && loin; j += 4) for (let i = ti; i <= Math.min(ti + T, nx - 1); i += 4) { if (GE[j * nx + i] < 160) tresLoin = false; if (GE[j * nx + i] < 75) { loin = false; break; } }
    const plein = tj + T <= nz - 1 && ti + T <= nx - 1, pas = tresLoin && plein ? 4 : loin && plein ? 2 : 1;   // loin de la piste, des mailles deux fois plus grandes : quatre fois moins de triangles
    for (let j = tj; j < Math.min(tj + T, nz - 1); j += pas) for (let i = ti; i < Math.min(ti + T, nx - 1); i += pas) {
      const a = j * nx + i, b = a + pas, c = a + pas * nx, d = c + pas;
      for (const [p, q, r] of [[a, c, b], [b, c, d]]) {
        if (HH[p] < -.3 && HH[q] < -.3 && HH[r] < -.3) continue;   // sous la mer : rien à dessiner
        if (GK[p] === 1 && GK[q] === 1 && GK[r] === 1) continue;   // sous la piste : rien à dessiner
        if (typeof PLAN !== "undefined" && PLAN && [p, q, r].every(k => PLAN.bord(x0 + (k % nx) * C, z0 + Math.floor(k / nx) * C) < -8)) continue;   // sous une ville dessinée (plan.js)
        const k1 = GK[p] === 1 || GK[q] === 1 || GK[r] === 1, k2 = GK[p] >= 2 || GK[q] >= 2 || GK[r] >= 2; if (k1 && k2) continue;   // à cheval sur l'entrée d'un tunnel : la façade prend le relais
        for (const k of [p, q, r]) som(k % nx, Math.floor(k / nx));
      }
    }
    const m = F.maille(); if (m) { m.name = "terrain"; scene.add(m); }
  }
}

/* le ruban des rives : du bord de la piste jusqu'à 13,5 m, mètre par mètre (bord net, parois droites).
   Tout près du bord, la hauteur est exacte ; plus loin, elle rejoint le champ (le vote). À l'intérieur d'un virage serré,
   le ruban s'arrête à sa largeur libre, à la hauteur du champ : les deux côtés d'une épingle se rejoignent sans se replier. */
let PRES_X = null;   // les mètres proches d'un carrefour (calculés une fois)
function fabriqueRives() {   // de quoi construire les rives, d'un mètre à un autre (le circuit entier : construireRives ; un tronçon : troncons.js)
  const P = PISTE, nS = STATIONS.length, iMer = TYPES.indexOf("mer"), memo = [new Map(), new Map()];
  const coupe = (i, cote) => {
    let o = memo[cote].get(i); if (o) return o;
    const sg = cote ? 1 : -1, a = at(i), ii = idx(i), ox = sg * Math.cos(a.h), oz = sg * Math.sin(a.h), libre = LIBRE[cote][ii], serre = libre < 50, pointe = serre && P.INT[ii] === cote + 1, lim = serre ? (pointe ? Math.max(libre, .05) : Math.max(libre, .6) + .7) : 99, es = [], pts = [];
    const sort = pointe && surface(i).liquide ? lisse(.1, 1.8, libre) : 1;   // la pointe de l'île d'une fourche : la rive sort de l'eau peu à peu, là où les deux voies se quittent. (19/11, Kiki : « un trou bleu » à l'embranchement du parc) sur la terre, rien ne la cache : elle reste au niveau du sol
    for (let j = 0; j < nS; j++) {
      const e = Math.min(STATIONS[j], lim), x = a.x + ox * (a.w + e), z = a.z + oz * (a.w + e); let y;
      if (j === 0) y = a.y - .8;
      else {
        const sol = hSol(x, z), exact = a.y + hRive(ii, cote, e) + AMP[cote][ii] * lisse(4, 34, e) * (fbm(x / 46 + 3, z / 46 + 7) - .42) * 2;
        y = lerp(exact, sol, Math.max(lisse(1.2, 9, e), serre ? lisse(.35 * lim, lim, e) : 0)) - (j === nS - 1 && !serre ? .9 : 0);
        if (pointe) y = a.y - .8 + (y - a.y + .8) * sort;
        if (zonesSol().length) { const Zn = dansSolPlat(x, z); if (Zn) y = Math.min(y, Zn.y - .25); }   // un objet peint ce sol lui-même (decor.js : SOL_PLAT) : le ruban passe dessous
      }
      es.push(e); pts.push([x, y, z]);
    }
    const segs = [];
    for (let j = 0; j < nS - 1; j++) {
      const de = Math.max(.01, es[j + 1] - es[j]), dy = pts[j + 1][1] - pts[j][1], N = nrm([-dy * ox, de, -dy * oz]);
      segs.push({N, c0: couleurSol(ii, cote, es[j], N[1], pts[j][0], pts[j][2]).slice(), c1: couleurSol(ii, cote, es[j + 1], N[1], pts[j + 1][0], pts[j + 1][2]).slice()});
    }
    o = {pts, segs}; memo[cote].set(i, o); return o;
  };
  if (!PRES_X) { PRES_X = new Uint8Array(P.M); for (let i = 0; i < P.N; i++) if (P.CROIX[i]) for (let k = -25; k <= 25; k++) PRES_X[BOUCLE ? ((i + k) % P.N + P.N) % P.N : clamp(i + k, 0, P.N - 1)] = 1; }   // près d'un carrefour
  const surAutre = (V, i) => { const x = (V[0][0] + V[2][0]) / 2, z = (V[0][2] + V[2][2]) / 2; pres(x, z); return Q.e < .5 && Math.abs(ecart(sLigne(Q.i), i)) > 20; };   // ce bout de rive tomberait sur l'autre route
  const morceau = (F, i0, i1) => {   // les rives des deux côtés, du mètre i0 au mètre i1, ajoutées à la forme F
    for (const cote of [0, 1]) {
      const PW = cote ? P.PD : P.PG;
      for (let i = i0; i < i1; i++) {
        const j = BOUCLE ? (i + 1) % P.N : i + 1, ii = idx(i), jj = idx(j);
        if (P.TUN[ii] && P.TUN[jj]) continue;
        if (P.INT[ii] === cote + 1 && LIBRE[cote][ii] < .1 && LIBRE[cote][jj] < .1) continue;   // une fourche : du côté de l'autre voie, pas de rive tant que les deux eaux se touchent
        if (P.PONT[ii] || P.PONT[jj]) {   // la culée d'un pont : le ruban s'arrête, une jupe ferme son bout
          const k = P.PONT[ii] ? j : i; if (P.PONT[idx(k)]) continue;
          const A = coupe(k, cote), a = at(k), nx = Math.sin(a.h) * (P.PONT[ii] ? -1 : 1), nz = -Math.cos(a.h) * (P.PONT[ii] ? -1 : 1);
          for (let s = 0; s < nS - 1; s++) {
            const c = fonce(A.segs[s].c0, .8), V = [A.pts[s], A.pts[s + 1], [A.pts[s + 1][0], A.pts[s + 1][1] - 4, A.pts[s + 1][2]], [A.pts[s][0], A.pts[s][1] - 4, A.pts[s][2]]];
            for (const q of [0, 1, 2, 0, 2, 3]) F.v(V[q][0], V[q][1], V[q][2], nx, 0, nz, c, 0);
          }
          continue;
        }
        if (PW[ii * NT + iMer] > .97 && PW[jj * NT + iMer] > .97) continue;
        const A = coupe(i, cote), B = coupe(j, cote);
        for (let s = 0; s < nS - 1; s++) {
          const sa = A.segs[s], sb = B.segs[s], V = [[A.pts[s], sa.N, sa.c0], [A.pts[s + 1], sa.N, sa.c1], [B.pts[s + 1], sb.N, sb.c1], [B.pts[s], sb.N, sb.c0]];
          if (PRES_X[idx(i)] && surAutre([A.pts[s], A.pts[s + 1], B.pts[s + 1]], i)) continue;
          for (const k of [0, 1, 2, 0, 2, 3]) { const [p, N, c] = V[k]; F.v(p[0], p[1], p[2], N[0], N[1], N[2], c, c[3]); }
        }
      }
    }
  };
  return {morceau, oublier() { memo[0].clear(); memo[1].clear(); }};
}
function construireRives() {
  if (typeof PLAN !== "undefined" && PLAN) return;   // (24/11) une ville dessinée : la piste n'a pas de rives
  const P = PISTE, K = fabriqueRives();
  // la ligne, de s0 à s1 ; puis la voie « force » de chaque fourche, entre les deux mêmes mètres (idx et at la suivent : surLaVoie)
  const ruban = (s0, s1) => { K.oublier();
   for (let c0 = s0; c0 < s1; c0 += 40) {
    const F = new Forme(); K.morceau(F, c0, Math.min(c0 + 40, s1));
    const m = F.maille(); if (m) { m.name = "rives"; scene.add(m); }
   }
  };
  ruban(0, LONG);
  P.voies.forEach((v, nf) => surLaVoie(nf, () => ruban(v.a, v.b)));
  raccordFourches();
}
/* (19/11, Kiki : « un trou bleu à l'embranchement ») le sol entre les deux voies d'une fourche sur la terre. Près de la pointe, chaque voie ne
   dessine son bord intérieur que jusqu'à sa largeur libre : une fente restait au milieu, où la grille, enfoncée pour laisser passer le ruban des
   rives, laissait voir le ciel (sur l'eau, l'eau la cache). Un ruban d'herbe, juste sous les rives, va du bord d'une voie au bord de l'autre. */
function raccordFourches() {
  const P = PISTE, F = new Forme();
  P.voies.forEach(v => {
    let A = null;
    for (let s = v.a; s <= v.b; s++) {
      const c = Math.min(s, P.N - 1), f = v.dec + Math.min(s, v.b - 1), S = SURFACES[P.surfaces[P.SF[c]]];
      if (!S || S.liquide || !P.INT[c] || LIBRE[P.INT[c] - 1][c] >= LARGE_RIVE - .5) { A = null; continue; }
      const gc = P.INT[c] === 2 ? 1 : -1, gf = P.INT[f] === 2 ? 1 : -1, wc = P.W[c] - .05, wf = P.W[f] - .05;
      const B = [[P.X[c] + gc * P.CH[c] * wc, P.Y[c] - .03, P.Z[c] + gc * P.SH[c] * wc], [P.X[f] + gf * P.CH[f] * wf, P.Y[f] - .03, P.Z[f] + gf * P.SH[f] * wf]];
      if (A) { const mx = (A[0][0] + B[1][0]) / 2, mz = (A[0][2] + B[1][2]) / 2, col = couleurSol(c, P.INT[c] - 1, 1.5, 1, mx, mz).slice(0, 3);
        F.v(...A[0], 0, 1, 0, col, 0); F.v(...A[1], 0, 1, 0, col, 0); F.v(...B[1], 0, 1, 0, col, 0); F.v(...A[0], 0, 1, 0, col, 0); F.v(...B[1], 0, 1, 0, col, 0); F.v(...B[0], 0, 1, 0, col, 0); }
      A = B;
    }
  });
  const m = F.maille(); if (m) { m.name = "rives"; scene.add(m); }
}

/* le cratère d'une montagne au milieu du circuit (champ.js : MASSIF) : de la lave au fond, sa lueur, une fumée qui monte */
function construireMassif() {
  if (!MASSIF || !MASSIF.cratere) return;
  const y = hSol(MASSIF.x, MASSIF.z), F = new Forme(), lave = PAL.lave || [hex("#FF7A30"), hex("#FFC850")], rl = MASSIF.r * .06, bord = [];
  for (let k = 0; k < 14; k++) bord.push(.8 + .35 * h2(k, 9));
  F.matiere(4).rond(MASSIF.x, y + 1.2, MASSIF.z, rl, rl, lave[0], 14, bord).rond(MASSIF.x, y + 1.3, MASSIF.z, rl * .55, rl * .55, lave[1], 10).matiere(2);
  const m = F.maille(); if (m) { m.name = "cratere"; scene.add(m); }
  MONDE.lumieres.push({x: MASSIF.x, y: y + 4, z: MASSIF.z, c: lave[0], t: rl * 1.2, toujours: true});
  panache(scene, {x: MASSIF.x, y: y + 2, z: MASSIF.z, haut: MASSIF.h * 1.3, large: MASSIF.r * .2, vent: MASSIF.h * .6, duree: 45, n: 20});
}
