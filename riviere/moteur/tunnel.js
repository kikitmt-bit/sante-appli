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
// L'eau d'une grotte se choisit sur la pièce, comme partout : "surface": "source".
const HV = 5.4, PIED = 1.6;   // la voûte : sa hauteur au milieu, la hauteur de ses murs droits
const GROTTES = Object.assign({roche: {}}, BIOME.grottes || {});
function sectionVoute(w, hv = HV) { const a = w - .05, pts = [[-a, -.8], [-a, PIED]]; for (let k = 1; k < 8; k++) { const t = k / 8 * Math.PI; pts.push([-a * Math.cos(t), PIED + (hv - PIED) * Math.sin(t)]); } pts.push([a, PIED], [a, -.8]); return pts; }
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
    const pas = [ia - .4]; for (let i = ia; i <= ib; i++) pas.push(i); pas.push(ib + .4);   // la voûte dépasse un peu de chaque façade : jamais de jour entre les deux
    let avant = coupe(pas[0]);
    for (let n = 0; n < pas.length - 1; n++) { const i = pas[n], apres = coupe(pas[n + 1]), A = avant.A, B = apres.A, ca = fonce(roche[1], sombre(i)), cb = fonce(roche[1], sombre(pas[n + 1]));
      for (let k = 0; k < avant.pts.length - 1; k++) { const V = [[monde(A, ...avant.pts[k]), ca], [monde(A, ...avant.pts[k + 1]), ca], [monde(B, ...apres.pts[k + 1]), cb], [monde(B, ...apres.pts[k]), cb]], ton = k % 2 ? .93 : 1;
        let N = [0, 1, 0];
        if (brut) { const a = V[0][0], b = V[1][0], c = V[3][0], e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; N = nrm([e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]);
          const vers = [A.x - a[0], A.y + 2 - a[1], A.z - a[2]]; if (N[0] * vers[0] + N[1] * vers[1] + N[2] * vers[2] < 0) N = [-N[0], -N[1], -N[2]]; }   // les facettes regardent l'intérieur
        for (const j of [0, 1, 2, 0, 2, 3]) F.v(V[j][0][0], V[j][0][1], V[j][0][2], N[0], N[1], N[2], fonce(V[j][1], ton), 0); }
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
    // les deux façades
    F.matiere(2);
    for (const [i, dir] of [[ia, -1], [ib, 1]]) { const a = at(i), w = a.w, rx = Math.cos(a.h), rz = Math.sin(a.h), fx = Math.sin(a.h) * dir, fz = -Math.cos(a.h) * dir, L = w + 3.2, dedans = at(i - dir * 6);
      const pt = (u, y, av = .05) => [a.x + rx * u + fx * av, a.y + y, a.z + rz * u + fz * av], haut = u => hRive(idx(i), u > 0 ? 1 : 0, Math.max(2, Math.abs(u) - w)) + .5 * (1 - lisse(w + 1, L, Math.abs(u)));   // hauteurs au-dessus de la piste
      const A0 = w - .05, bas = [], S0 = sectionVoute(w, hv);   // le bas de la façade : le sol sur les côtés, exactement la voûte au milieu
      for (let k = 0; k < 5; k++) bas.push([-L + (L - A0) * k / 5, -.8, -L + (L - A0) * (k + 1) / 5, -.8]);
      for (let k = 1; k < S0.length - 2; k++) bas.push([S0[k][0], S0[k][1], S0[k + 1][0], S0[k + 1][1]]);
      for (let k = 0; k < 5; k++) bas.push([A0 + (L - A0) * k / 5, -.8, A0 + (L - A0) * (k + 1) / 5, -.8]);
      for (const [u0, b0, u1, b1] of bas) { const V = [pt(u0, b0), pt(u1, b1), pt(u1, haut(u1)), pt(u0, haut(u0))];
        for (const j of [0, 1, 2, 0, 2, 3]) F.v(V[j][0], V[j][1], V[j][2], fx, 0, fz, roche[0], 0);
        // le rebord, au-dessus : il rejoint la montagne
        const q = (u, d) => { const b = d ? dedans : a; return [b.x + Math.cos(b.h) * u, a.y + haut(u) - (d ? .1 : 0), b.z + Math.sin(b.h) * u]; }, T = [q(u0, 0), q(u1, 0), q(u1, 1), q(u0, 1)];
        for (const j of [0, 1, 2, 0, 2, 3]) { const c = couleurSol(idx(i), T[j] === T[0] || T[j] === T[3] ? (u0 > 0 ? 1 : 0) : (u1 > 0 ? 1 : 0), 3, 1, T[j][0], T[j][2]); F.v(T[j][0], T[j][1], T[j][2], 0, 1, 0, c, 0); } }
      // l'arche : des pierres plus claires autour de l'ouverture
      const S = sectionVoute(w, hv), clair = melange(roche[0], [1, 1, 1], .28), gr = (hv - PIED + .6) / (hv - PIED), ext = ([u, y]) => y <= PIED ? [u + Math.sign(u) * .6, y] : [u * (1 + .6 / (w - .05)), PIED + (y - PIED) * gr];
      for (let k = 0; k < S.length - 1; k++) { const V = [pt(S[k][0], S[k][1], .2), pt(S[k + 1][0], S[k + 1][1], .2), pt(...ext(S[k + 1]), .2), pt(...ext(S[k]), .2)];
        for (const j of [0, 1, 2, 0, 2, 3]) F.v(V[j][0], V[j][1], V[j][2], fx, 0, fz, k % 2 ? clair : fonce(clair, .9), 2); } }
  }
  const m = F.maille(); if (m) { m.name = "tunnels"; scene.add(m); }
  return plages;
}
const dansTunnel = s => PISTE.TUN[idx(s)] ? 1 : 0;
