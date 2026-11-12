/* ============ les grottes : une voûte qui suit la piste, une façade de roche percée d'une arche à chaque bout ============ */
// Une pièce marquée « tunnel » suffit : la montagne passe au-dessus (terrain.js), ici on creuse le passage.
// "tunnel": true = la grotte de roche de toujours. "tunnel": "cristal" (ou {"style": "cristal"}) = une grotte de la région, décrite
// une fois dans sa fiche ("grottes") :
//   roche        le sol dont elle prend les couleurs (sinon : la paroi des rives « montagne »)
//   haut         la hauteur de la voûte (5,4 m par défaut, 7 au plus)
//   brut         0 à 1 : des parois cabossées, à facettes (0 : un tunnel lisse)
//   stalactites, stalagmites   une tous les N mètres, à peu près
//   cristaux     {"couleurs": ["#7CE8FF", …], "pas": 7} : des gerbes de cristaux qui luisent, avec leur halo
//   poutres      des étais de bois tous les N mètres (une galerie de mine), une lanterne à chacun
//   ambiance     l'air de la grotte (ambiance.js) : {"sombre": .6, "teinte": […], "particules": "etincelles"}
//   ampleur      la taille des salles d'une caverne (1 par défaut ; 0,6 = plus intime, 1,3 = immense)
//   caverne      false : garder le simple couloir même avec des parois brutes
// L'eau d'une grotte se choisit sur la pièce, comme partout : "surface": "source".
// Deux familles (Kiki, 12/11 : « un tunnel camouflé en grotte, ça ne va pas ») : un TUNNEL (roche par défaut, galerie de mine) est un ouvrage :
// voûte régulière, pierres maçonnées ; une CAVERNE (parois brutes) s'ouvre derrière son entrée en grandes salles (champ.js : CAV),
// parois à facettes, rives de roche, stalactites, colonnes ; la rivière n'en occupe que le milieu.
const HV = 5.4, PIED = 1.6;   // la voûte : sa hauteur au milieu, la hauteur de ses murs droits
const GROTTES = Object.assign({roche: {}}, BIOME.grottes || {});
function sectionVoute(w, hv = HV) { const a = w - .05, pts = [[-a, -.8], [-a, PIED]]; for (let k = 1; k < 8; k++) { const t = k / 8 * Math.PI; pts.push([-a * Math.cos(t), PIED + (hv - PIED) * Math.sin(t)]); } pts.push([a, PIED], [a, -.8]); return pts; }
const NF = 4, NA = 14;   // une caverne : points de chaque rive, points de la voûte
function coupeCaverne(i, brut, gr) {  // la coupe d'une caverne au mètre i : l'eau, la rive de roche, la paroi, la voûte, l'autre paroi, l'autre rive, l'eau
  const ii = idx(Math.round(i)), A = at(i), a = A.w - .05, f = CAV.F[ii], eL = CAV.L[ii], eR = CAV.R[ii], H = CAV.H[ii], base = lerp(PIED, 1.3, f), pts = [[-a, -.8]], sorte = [0];
  const rive = (sg, e, t) => [sg * (a + e * t), lerp(PIED * t, .3 + (base - .3) * t * t, f)];
  for (let q = 1; q <= NF; q++) { pts.push(rive(-1, eL, q / NF)); sorte.push(1); }
  for (let j = 1; j < NA; j++) { const th = Math.PI * (1 - j / NA), c = Math.cos(th); pts.push([c * (a + (c < 0 ? eL : eR)), base + (H - base) * Math.pow(Math.sin(th), lerp(1, .7, f))]); sorte.push(2); }
  for (let q = NF; q >= 1; q--) { pts.push(rive(1, eR, q / NF)); sorte.push(1); }
  pts.push([a, -.8]); sorte.push(0);
  const k0 = f * brut, cy = (base + H) * .45;   // le relief : de grosses bosses (bruit) et des facettes (un écart par sommet) ; rien au bord de l'eau ni à l'entrée
  if (k0 > 0) for (let k = 1; k < pts.length - 1; k++) {
    const [u, y] = pts[k], ny = (y - cy) * .8, l = Math.hypot(u, ny) || 1, d = k0 * ((fbm(i * .07 + gr, k * .35 + gr) - .45) * 4 + (h2(Math.round(i * 4) * .425 + gr, k * 3.1) - .5) * 1.1);
    if (sorte[k] === 1) pts[k] = [u + d * .25 * Math.sign(u), Math.max(.15, y + d * .3)];
    else { let U = u + u / l * d; const Y = Math.max(.6, y + ny / l * d); if (Y < 3.5) U = Math.sign(u) * Math.max(Math.abs(U), a + .4); pts[k] = [U, Y]; }
  }
  return {A, pts, sorte, f, H, base};
}
function plafondCaverne(C, u) {  // la hauteur de la voûte au-dessus du point u d'une coupe
  for (let k = 0; k < C.pts.length - 1; k++) { if (C.sorte[k] !== 2 && C.sorte[k + 1] !== 2) continue; const [u0, y0] = C.pts[k], [u1, y1] = C.pts[k + 1];
    if (u >= Math.min(u0, u1) && u <= Math.max(u0, u1) && Math.min(y0, y1) > C.base + .5) return lerp(y0, y1, (u - u0) / ((u1 - u0) || 1)); }
  return C.H; }
function construireCaverne(F, ia, ib, G, roche, brut, R, sombre) {
  const gr = (NIVEAU.graine || 1) * 3.7 + ia * .13, monde = (A, u, y) => [A.x + Math.cos(A.h) * u, A.y + y, A.z + Math.sin(A.h) * u];
  const pas = [ia - .4]; for (let i = ia; i <= ib; i++) pas.push(i); pas.push(ib + .4);
  const memo = new Map(), coupe = i => { let c = memo.get(i); if (!c) memo.set(i, c = coupeCaverne(i, brut, gr)); return c; };
  const sol = melange(roche[2] || roche[0], roche[1], .35);
  for (let n = 0; n < pas.length - 1; n++) { const C0 = coupe(pas[n]), C1 = coupe(pas[n + 1]), A = C0.A, B = C1.A, cy = (C0.base + C0.H) * .45;
    for (let k = 0; k < C0.pts.length - 1; k++) {
      const a = monde(A, ...C0.pts[k]), b = monde(A, ...C0.pts[k + 1]), c = monde(B, ...C1.pts[k + 1]), d = monde(B, ...C1.pts[k]);
      for (const [p, q, r] of [[a, b, c], [a, c, d]]) {
        const e1 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], e2 = [r[0] - p[0], r[1] - p[1], r[2] - p[2]]; let N = nrm([e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]);
        const vers = [A.x - p[0], A.y + cy - p[1], A.z - p[2]]; if (N[0] * vers[0] + N[1] * vers[1] + N[2] * vers[2] < 0) N = [-N[0], -N[1], -N[2]];   // les facettes regardent l'intérieur
        const haut = clamp((p[1] - A.y) / Math.max(4, C0.H), 0, 1), tache = h2(Math.floor(pas[n] / 3) + k * 7.1, k * 1.3 + gr), plat = N[1] > .55;
        const col = fonce(plat ? sol : tache < .4 ? roche[0] : roche[1], sombre(pas[n]) * (plat ? 1.08 : 1.02 - .2 * haut) * (.94 + .1 * h2(n + gr, k)));
        for (const P of [p, q, r]) F.v(P[0], P[1], P[2], N[0], N[1], N[2], col, plat ? 0 : 2); } } }
  // ce qui habite la caverne : stalactites en grappes, stalagmites et rochers sur les rives, colonnes dans les grandes salles, cristaux
  const pointe = (p, dir, r, l, s) => F.pointe(p[0], p[1], p[2], (R() - .5) * .14, dir, (R() - .5) * .14, r, l, 5, fonce(roche[1], sombre(s) * 1.05), fonce(roche[2] || roche[0], sombre(s) * 1.25));
  const indices = (C, sorte) => C.pts.map((_, k) => k).filter(k => C.sorte[k] === sorte);
  F.poser(0, 0, 0, 0, 1).matiere(2);
  for (let s = ia + 10 + R() * 4; s < ib - 8; s += (G.stalactites || 4) * (.4 + R() * .8)) { const C = coupe(Math.round(s)); if (C.f < .3) continue;
    const haut = indices(C, 2).filter(k => C.pts[k][1] > C.base + (C.H - C.base) * .55), k = haut[Math.floor(R() * haut.length)]; if (k === undefined) continue;
    const n = 1 + Math.floor(R() * 3), taille = .7 + C.H / 9;
    for (let m = 0; m < n; m++) { const u = C.pts[k][0] + (R() - .5) * 2.2, y = plafondCaverne(C, u); pointe(monde(C.A, u, y + .4), -1, (.25 + R() * .35) * taille, (.8 + R() * 2.2) * taille * (m ? .6 : 1), s); } }
  for (let s = ia + 10 + R() * 4; s < ib - 8; s += (G.stalagmites || 6) * (.5 + R())) { const C = coupe(Math.round(s)); if (C.f < .4) continue;
    const rives = indices(C, 1), k = rives[Math.floor(R() * rives.length)], p = C.pts[k]; if (Math.abs(p[0]) < C.A.w + 1.2) continue;
    if (R() < .45) F.caillou(...monde(C.A, p[0], p[1] - .1), .7 + R() * 1.1, .5 + R() * .7, .7 + R() * 1.1, [fonce(roche[0], sombre(s) * .9), fonce(roche[1], sombre(s)), fonce(roche[2] || roche[0], sombre(s) * 1.1)], R);
    else for (let m = 0; m < 1 + Math.floor(R() * 3); m++) pointe(monde(C.A, p[0] + (R() - .5) * 1.4, p[1] - .3), 1, .3 + R() * .35, (1 + R() * 2.4) * (m ? .55 : 1), s); }
  for (let s = ia + 26 + R() * 10; s < ib - 22; s += 26 + R() * 30) { const ii = idx(Math.round(s)), C = coupe(Math.round(s)), sg = R() < .5 ? -1 : 1, e = sg < 0 ? CAV.L[ii] : CAV.R[ii]; if (C.f < .85 || e < 7) continue;
    const u = sg * (C.A.w + e * (.45 + R() * .25)), y0 = .2, y1 = plafondCaverne(C, u), [x, , z] = monde(C.A, u, 0), r = .55 + R() * .45, mi = lerp(y0, y1, .45 + R() * .15);   // une colonne : une stalagmite et une stalactite qui se sont rejointes
    F.cyl(x, C.A.y + y0 - .3, z, r * 2.2, r * .8, mi - y0 + .3, 7, fonce(roche[0], sombre(s)), fonce(roche[1], sombre(s)));
    F.cyl(x, C.A.y + mi, z, r * .8, r * 1.9, y1 - mi + .6, 7, fonce(roche[1], sombre(s)), fonce(roche[0], sombre(s) * .9)); }
  if (G.cristaux) { const K = G.cristaux, cols = (K.couleurs || ["#7CE8FF"]).map(hex);   // des gerbes de cristaux sur les rives, au pied des parois ; chacune éclaire la roche autour
    for (let s = ia + 12 + R() * 6; s < ib - 10; s += (K.pas || 14) * (.6 + R() * .8)) { const C = coupe(Math.round(s)), rives = indices(C, 1).filter(k => Math.abs(C.pts[k][0]) > C.A.w + 1.5); if (!rives.length) continue;
      const k = rives[Math.floor(R() * rives.length)], p = monde(C.A, C.pts[k][0], C.pts[k][1] - .2), col = cols[Math.floor(R() * cols.length)], n = 3 + Math.floor(R() * 4), sg = Math.sign(C.pts[k][0]);
      F.matiere(4);
      for (let m = 0; m < n; m++) { const dx = (R() - .5) * 1.6, dz = (R() - .5) * 1.6, h = (.7 + R() * 1.6) * (K.taille || 1) * (m ? .75 : 1.3);
        F.pointe(p[0] + dx * .5, p[1], p[2] + dz * .5, dx * .45 + sg * Math.cos(C.A.h) * .25, 1, dz * .45 + sg * Math.sin(C.A.h) * .25, .14 + R() * .16, h, 5, fonce(col, .6), melange(col, [1, 1, 1], .35)); }
      F.matiere(2);
      MONDE.lumieres.push({x: p[0], y: p[1] + 1, z: p[2], c: col, t: 3 * (K.taille || 1), toujours: true}); } }
}
function construireTunnels() {
  const P = PISTE, F = new Forme(), plages = []; let debut = -1;
  for (let i = 0; i < P.N; i++) { if (P.TUN[i] && debut < 0) debut = i; if (debut >= 0 && (!P.TUN[i] || i === P.N - 1)) { plages.push([debut, P.TUN[i] ? i : i - 1]); debut = -1; } }
  for (const [ia, ib] of plages) {
    const G = GROTTES[pieceEn(ia).grotte] || {}, hv = clamp(G.haut || HV, 4, 7), brut = clamp(G.brut || 0, 0, 1), R = hasard((NIVEAU.graine || 1) * 131 + ia);
    const roche = Array.isArray(G.roche) ? G.roche.map(hex) : SOLS[G.roche || RIVES[TYPES.indexOf(NIVEAU.rocheTunnel || "montagne")].paroi].c;
    const fonduBout = i => lisse(0, 8, Math.min(i - ia, ib - i));
    // la coupe de la voûte au mètre i : lisse aux deux bouts (elle rejoint l'arche de la façade), cabossée vers l'intérieur de la montagne
    const coupe = i => { const A = at(i), S = sectionVoute(A.w, hv), f = brut * fonduBout(i);
      return {A, pts: S.map(([u, y], k) => { if (!f || y < 0) return [u, y]; const r = 1 + f * .34 * bruit(i * .23 + k * 1.9, k * 3.3 + i * .11); return [u * (1 + (r - 1) * .8), Math.min(7.8, 1 + (y - 1) * r)]; })}; };
    const monde = (A, u, y) => [A.x + Math.cos(A.h) * u, A.y + y, A.z + Math.sin(A.h) * u];
    const sombre = i => .52 + .34 * (1 - lisse(0, 16, Math.min(i - ia, ib - i)));   // plus sombre au milieu, plus claire près des entrées
    const caverne = CAV.F[idx(Math.round((ia + ib) / 2))] > 0;
    if (caverne) construireCaverne(F, ia, ib, G, roche, brut, R, i => .78 + .2 * (1 - lisse(0, 16, Math.min(i - ia, ib - i))));   // une caverne est plus claire : on doit voir ses salles
    else {
    const pas = [ia - .4]; for (let i = ia; i <= ib; i++) pas.push(i); pas.push(ib + .4);   // la voûte dépasse un peu de chaque façade : jamais de jour entre les deux
    let avant = coupe(pas[0]);
    for (let n = 0; n < pas.length - 1; n++) { const i = pas[n], apres = coupe(pas[n + 1]), A = avant.A, B = apres.A, ca = fonce(roche[1], sombre(i)), cb = fonce(roche[1], sombre(pas[n + 1]));
      for (let k = 0; k < avant.pts.length - 1; k++) { const V = [[monde(A, ...avant.pts[k]), ca], [monde(A, ...avant.pts[k + 1]), ca], [monde(B, ...apres.pts[k + 1]), cb], [monde(B, ...apres.pts[k]), cb]], ton = k % 2 ? .93 : 1;
        let N = [0, 1, 0];
        if (brut) { const a = V[0][0], b = V[1][0], c = V[3][0], e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; N = nrm([e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]);
          const vers = [A.x - a[0], A.y + 2 - a[1], A.z - a[2]]; if (N[0] * vers[0] + N[1] * vers[1] + N[2] * vers[2] < 0) N = [-N[0], -N[1], -N[2]]; }   // les facettes regardent l'intérieur
        for (const j of [0, 1, 2, 0, 2, 3]) F.v(V[j][0][0], V[j][0][1], V[j][0][2], N[0], N[1], N[2], fonce(V[j][1], ton), brut ? 0 : 1); }   // un tunnel lisse est maçonné (des pierres : rendu.js)
      avant = apres; }
    // ce qui habite la grotte : stalactites, stalagmites, cristaux, étais
    const plafond = (C, u) => { for (let k = 1; k < C.pts.length - 2; k++) { const [u0, y0] = C.pts[k], [u1, y1] = C.pts[k + 1]; if (u >= u0 && u <= u1) return lerp(y0, y1, (u - u0) / Math.max(.001, u1 - u0)); } return PIED; };
    const semer = (tousLes, f) => { if (!(tousLes > 0)) return; for (let s = ia + 5 + R() * tousLes; s < ib - 5; s += tousLes * (.5 + R())) f(s, coupe(s)); };
    F.poser(0, 0, 0, 0, 1).matiere(0);
    semer(G.stalactites, (s, C) => { const a = C.A.w, u = (R() * 2 - 1) * a * .82, y = plafond(C, u), l = (Math.abs(u) < 1.8 ? .5 : .8) + R() * (Math.abs(u) < 1.8 ? .5 : 1.3), p = monde(C.A, u, y + .3);
      F.pointe(p[0], p[1], p[2], (R() - .5) * .12, -1, (R() - .5) * .12, .2 + R() * .22, l + .3, 5, fonce(roche[1], sombre(s) * 1.1), fonce(roche[2] || roche[0], sombre(s) * 1.25)); });
    semer(G.stalagmites, (s, C) => { const a = C.A.w, sg = R() < .5 ? -1 : 1, u = sg * (a - .35 - R() * Math.min(1, a * .22)), p = monde(C.A, u, -.5);
      F.pointe(p[0], p[1], p[2], (R() - .5) * .1, 1, (R() - .5) * .1, .26 + R() * .3, 1 + R() * 1.6, 5, fonce(roche[1], sombre(s) * 1.05), fonce(roche[2] || roche[0], sombre(s) * 1.3)); });
    if (G.cristaux) { const K = G.cristaux, cols = (K.couleurs || ["#7CE8FF"]).map(hex);
      semer(K.pas || 8, (s, C) => { const a = C.A.w, haut = R() < .28, sg = R() < .5 ? -1 : 1, u = haut ? (R() * 2 - 1) * a * .7 : sg * (a - .25 - R() * .5), y = haut ? plafond(C, u) + .1 : -.35, p = monde(C.A, u, y), col = cols[Math.floor(R() * cols.length)], n = 2 + Math.floor(R() * 3);
        F.matiere(4);
        for (let k = 0; k < n; k++) { const dx = (R() - .5) * 1.1, dz = (R() - .5) * 1.1, h = (.6 + R() * 1.3) * (K.taille || 1);
          F.pointe(p[0] + dx * .35, p[1], p[2] + dz * .35, dx * .5 - (haut ? 0 : sg * Math.cos(C.A.h) * .35), haut ? -1 : 1, dz * .5 - (haut ? 0 : sg * Math.sin(C.A.h) * .35), .16 + R() * .16, h, 5, fonce(col, .72), melange(col, [1, 1, 1], .45)); }
        F.matiere(0);
        MONDE.lumieres.push({x: p[0], y: p[1] + (haut ? -.6 : .7), z: p[2], c: col, t: 4.5 * (K.taille || 1), toujours: true}); }); }
    if (G.poutres) { const bois = PAL.tronc, feu = hex(G.lanterne || "#FFD070");
      for (let s = ia + 4; s < ib - 3; s += G.poutres) { const A = at(s), a = A.w - .32, yb = PIED + (hv - PIED) * .46, demi = a * Math.sqrt(Math.max(.05, 1 - .46 * .46)) + .15;
        F.poser(A.x, A.y, A.z, -A.h, 1).matiere(2);
        for (const sg of [-1, 1]) F.boite(0, -.8, sg * a, .34, yb + .8, .34, bois[0], {haut: bois[1]});
        F.boite(0, yb, 0, .38, .34, demi * 2, bois[1], {haut: bois[0]});
        F.boite(0, yb - .42, -a + 1, .1, .42, .1, bois[0]); F.matiere(4).boite(0, yb - .82, -a + 1, .3, .4, .3, feu).matiere(2);
        const [lx, lz] = F.monde(0, -a + 1); MONDE.lumieres.push({x: lx, y: A.y + yb - .62, z: lz, c: feu, t: 5, toujours: true}); }
      F.poser(0, 0, 0, 0, 1).matiere(0); }
    }
    // les deux façades
    F.matiere(2);
    for (const [i, dir] of [[ia, -1], [ib, 1]]) { const a = at(i), w = a.w, rx = Math.cos(a.h), rz = Math.sin(a.h), fx = Math.sin(a.h) * dir, fz = -Math.cos(a.h) * dir, L = w + 3.2, dedans = at(i - dir * 6);
      const pt = (u, y, av = .05) => [a.x + rx * u + fx * av, a.y + y, a.z + rz * u + fz * av], haut = u => hRive(idx(i), u > 0 ? 1 : 0, Math.max(2, Math.abs(u) - w)) + .5 * (1 - lisse(w + 1, L, Math.abs(u)));   // hauteurs au-dessus de la piste
      const A0 = w - .05, bas = [], S0 = sectionVoute(w, hv);   // le bas de la façade : le sol sur les côtés, exactement la voûte au milieu
      for (let k = 0; k < 5; k++) bas.push([-L + (L - A0) * k / 5, -.8, -L + (L - A0) * (k + 1) / 5, -.8]);
      for (let k = 1; k < S0.length - 2; k++) bas.push([S0[k][0], S0[k][1], S0[k + 1][0], S0[k + 1][1]]);
      for (let k = 0; k < 5; k++) bas.push([A0 + (L - A0) * k / 5, -.8, A0 + (L - A0) * (k + 1) / 5, -.8]);
      for (const [u0, b0, u1, b1] of bas) {
        if (caverne) {   // une caverne : la façade est une roche brute, en bosses et en facettes (rien ne bouge au bord du trou ni en haut, où elle rejoint la montagne)
          const NR = 4, ru = (u, y, r) => r === 0 || r === NR ? 0 : Math.sin(Math.PI * r / NR) * (.4 + 1.6 * fbm(u * .3 + i * .1, y * .3 + 4)) + (h2(Math.round(u * 3), Math.round(y * 3) + i) - .5) * .5;
          const P = (u, b, r) => { const y = lerp(b, haut(u), r / NR); return pt(u, y, .05 + ru(u, y, r)); };
          for (let r = 0; r < NR; r++) { const Q = [P(u0, b0, r), P(u1, b1, r), P(u1, b1, r + 1), P(u0, b0, r + 1)];
            for (const [p, q, t] of [[Q[0], Q[1], Q[2]], [Q[0], Q[2], Q[3]]]) { const e1 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], e2 = [t[0] - p[0], t[1] - p[1], t[2] - p[2]]; let N = nrm([e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]);
              if (N[0] * fx + N[2] * fz < 0) N = [-N[0], -N[1], -N[2]];
              const col = fonce(h2(Math.round(u0 * 2) + r * 5, i) < .45 ? roche[1] : roche[0], .92 + .12 * h2(r, Math.round(u0 * 3)));
              for (const X of [p, q, t]) F.v(X[0], X[1], X[2], N[0], N[1], N[2], col, 2); } }
        } else { const V = [pt(u0, b0), pt(u1, b1), pt(u1, haut(u1)), pt(u0, haut(u0))];
          for (const j of [0, 1, 2, 0, 2, 3]) F.v(V[j][0], V[j][1], V[j][2], fx, 0, fz, roche[0], 0); }
        // le rebord, au-dessus : il rejoint la montagne
        const q = (u, d) => { const b = d ? dedans : a; return [b.x + Math.cos(b.h) * u, a.y + haut(u) - (d ? .1 : 0), b.z + Math.sin(b.h) * u]; }, T = [q(u0, 0), q(u1, 0), q(u1, 1), q(u0, 1)];
        for (const j of [0, 1, 2, 0, 2, 3]) { const c = couleurSol(idx(i), T[j] === T[0] || T[j] === T[3] ? (u0 > 0 ? 1 : 0) : (u1 > 0 ? 1 : 0), 3, 1, T[j][0], T[j][2]); F.v(T[j][0], T[j][1], T[j][2], 0, 1, 0, c, 0); } }
      // l'arche : des pierres plus claires autour de l'ouverture
      // (une caverne : un rebord de roche déchiqueté, plus sombre, qui avance un peu)
      const S = sectionVoute(w, hv), clair = caverne ? fonce(roche[0], .78) : melange(roche[0], [1, 1, 1], .28), lg = k => caverne ? .5 + 1.3 * h2(k * 1.7 + i, 3) : .6;
      const ext = ([u, y], k) => { const g = lg(k), gr = (hv - PIED + g) / (hv - PIED); return y <= PIED ? [u + Math.sign(u) * g, y] : [u * (1 + g / (w - .05)), PIED + (y - PIED) * gr]; };
      for (let k = 0; k < S.length - 1; k++) { const av = caverne ? .45 : .2, V = [pt(S[k][0], S[k][1], .2), pt(S[k + 1][0], S[k + 1][1], .2), pt(...ext(S[k + 1], k + 1), av), pt(...ext(S[k], k), av)];
        for (const j of [0, 1, 2, 0, 2, 3]) F.v(V[j][0], V[j][1], V[j][2], fx, 0, fz, k % 2 ? clair : fonce(clair, .9), 2); } }
  }
  const m = F.maille(); if (m) { m.name = "tunnels"; scene.add(m); }
  return plages;
}
const dansTunnel = s => PISTE.TUN[idx(s)] ? 1 : 0;
