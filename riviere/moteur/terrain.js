/* ============ le terrain : les maillages du sol, d'après le champ ============ */
// Près de la piste, un ruban précis suit chaque rive (bord net, quai droit, falaise) ; au-delà, une grille de 2,5 à 3 m.
// Le monde est une île (ou des terres) : loin de la piste, le sol redescend dans la mer ou ondule en collines (champ.js).
const RB = 12, STATIONS = [0, .02, .4, 1.2, 3, 6, 10, LARGE_RIVE];   // le ruban : ses points, en mètres depuis le bord de la piste

function construireTerrain() {
  const P = PISTE, C = BOUCLE ? 3 : 2.5, M = 185, T = 24; let xa = 1e9, xb = -1e9, za = 1e9, zb = -1e9;
  for (let i = 0; i < P.N; i++) { xa = Math.min(xa, P.X[i]); xb = Math.max(xb, P.X[i]); za = Math.min(za, P.Z[i]); zb = Math.max(zb, P.Z[i]); }
  const x0 = Math.floor((xa - M) / C) * C, z0 = Math.floor((za - M) / C) * C, nx = Math.ceil((xb + M - x0) / C) + 1, nz = Math.ceil((zb + M - z0) / C) + 1, n = nx * nz;
  const HH = new Float32Array(n), GI = new Int32Array(n), GE = new Float32Array(n), GC = new Uint8Array(n), GK = new Uint8Array(n);
  // 1 = le lit de la piste à ciel ouvert, 2 = le dessus d'un tunnel, 3 = les flancs d'un tunnel, 0 = le reste
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i * C, z = z0 + j * C, k = j * nx + i, h = hSol(x, z), e = Q.e, pi = Q.i, cote = Q.d > 0 ? 1 : 0, tun = P.TUN[pi], culee = Q.bout === 2;
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
  for (let tj = 0; tj < nz - 1; tj += T) for (let ti = 0; ti < nx - 1; ti += T) {
    const F = new Forme();
    const som = (i, j) => {
      const k = j * nx + i, x = x0 + i * C, z = z0 + j * C, hx = (HH[j * nx + Math.min(nx - 1, i + 1)] - HH[j * nx + Math.max(0, i - 1)]) / (2 * C), hz = (HH[Math.min(nz - 1, j + 1) * nx + i] - HH[Math.max(0, j - 1) * nx + i]) / (2 * C), N = nrm([-hx, 1, -hz]);
      const c = couleurSol(GI[k], GC[k], GK[k] === 2 ? 3 : Math.max(GE[k], 0), N[1], x, z); F.v(x, HH[k], z, N[0], N[1], N[2], c, c[3]);
    };
    let loin = true;
    for (let j = tj; j <= Math.min(tj + T, nz - 1) && loin; j += 4) for (let i = ti; i <= Math.min(ti + T, nx - 1); i += 4) if (GE[j * nx + i] < 75) { loin = false; break; }
    const pas = loin && tj + T <= nz - 1 && ti + T <= nx - 1 ? 2 : 1;   // loin de la piste, des mailles deux fois plus grandes : quatre fois moins de triangles
    for (let j = tj; j < Math.min(tj + T, nz - 1); j += pas) for (let i = ti; i < Math.min(ti + T, nx - 1); i += pas) {
      const a = j * nx + i, b = a + pas, c = a + pas * nx, d = c + pas;
      for (const [p, q, r] of [[a, c, b], [b, c, d]]) {
        if (HH[p] < -.3 && HH[q] < -.3 && HH[r] < -.3) continue;   // sous la mer : rien à dessiner
        if (GK[p] === 1 && GK[q] === 1 && GK[r] === 1) continue;   // sous la piste : rien à dessiner
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
function construireRives() {
  const P = PISTE, nS = STATIONS.length, iMer = TYPES.indexOf("mer"), memo = [new Map(), new Map()];
  const coupe = (i, cote) => {
    let o = memo[cote].get(i); if (o) return o;
    const sg = cote ? 1 : -1, a = at(i), ii = idx(i), ox = sg * Math.cos(a.h), oz = sg * Math.sin(a.h), libre = LIBRE[cote][ii], serre = libre < 50, lim = serre ? Math.max(libre, .6) + .7 : 99, es = [], pts = [];
    for (let j = 0; j < nS; j++) {
      const e = Math.min(STATIONS[j], lim), x = a.x + ox * (a.w + e), z = a.z + oz * (a.w + e); let y;
      if (j === 0) y = a.y - .8;
      else {
        const sol = hSol(x, z), exact = a.y + hRive(ii, cote, e) + AMP[cote][ii] * lisse(4, 34, e) * (fbm(x / 46 + 3, z / 46 + 7) - .42) * 2;
        y = lerp(exact, sol, Math.max(lisse(1.2, 9, e), serre ? lisse(.35 * lim, lim, e) : 0)) - (j === nS - 1 && !serre ? .9 : 0);
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
  const PRES_X = new Uint8Array(P.N); for (let i = 0; i < P.N; i++) if (P.CROIX[i]) for (let k = -25; k <= 25; k++) PRES_X[BOUCLE ? ((i + k) % P.N + P.N) % P.N : clamp(i + k, 0, P.N - 1)] = 1;   // près d'un carrefour
  const surAutre = (V, i) => { const x = (V[0][0] + V[2][0]) / 2, z = (V[0][2] + V[2][2]) / 2; pres(x, z); return Q.e < .5 && Math.abs(ecart(Q.i, i)) > 20; };   // ce bout de rive tomberait sur l'autre route
  for (let c0 = 0; c0 < LONG; c0 += 40) {
    const F = new Forme();
    for (const cote of [0, 1]) {
      const PW = cote ? P.PD : P.PG;
      for (let i = c0; i < Math.min(c0 + 40, LONG); i++) {
        const j = BOUCLE ? (i + 1) % P.N : i + 1;
        if (P.TUN[i] && P.TUN[j]) continue;
        if (P.PONT[i] || P.PONT[j]) {   // la culée d'un pont : le ruban s'arrête, une jupe ferme son bout
          const k = P.PONT[i] ? j : i; if (P.PONT[k]) continue;
          const A = coupe(k, cote), a = at(k), nx = Math.sin(a.h) * (P.PONT[i] ? -1 : 1), nz = -Math.cos(a.h) * (P.PONT[i] ? -1 : 1);
          for (let s = 0; s < nS - 1; s++) {
            const c = fonce(A.segs[s].c0, .8), V = [A.pts[s], A.pts[s + 1], [A.pts[s + 1][0], A.pts[s + 1][1] - 4, A.pts[s + 1][2]], [A.pts[s][0], A.pts[s][1] - 4, A.pts[s][2]]];
            for (const q of [0, 1, 2, 0, 2, 3]) F.v(V[q][0], V[q][1], V[q][2], nx, 0, nz, c, 0);
          }
          continue;
        }
        if (PW[i * NT + iMer] > .97 && PW[j * NT + iMer] > .97) continue;
        const A = coupe(i, cote), B = coupe(j, cote);
        for (let s = 0; s < nS - 1; s++) {
          const sa = A.segs[s], sb = B.segs[s], V = [[A.pts[s], sa.N, sa.c0], [A.pts[s + 1], sa.N, sa.c1], [B.pts[s + 1], sb.N, sb.c1], [B.pts[s], sb.N, sb.c0]];
          if (PRES_X[idx(i)] && surAutre([A.pts[s], A.pts[s + 1], B.pts[s + 1]], i)) continue;
          for (const k of [0, 1, 2, 0, 2, 3]) { const [p, N, c] = V[k]; F.v(p[0], p[1], p[2], N[0], N[1], N[2], c, c[3]); }
        }
      }
    }
    const m = F.maille(); if (m) { m.name = "rives"; scene.add(m); }
  }
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
