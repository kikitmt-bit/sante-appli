/* ============ les grottes : une voûte qui suit la rivière, une façade de roche percée d'une arche à chaque bout ============ */
// Une pièce marquée « tunnel » suffit : la montagne passe au-dessus (terrain.js), ici on creuse le passage.
const HV = 5.4, PIED = 1.6;   // la voûte : sa hauteur au milieu, la hauteur de ses murs droits
function sectionVoute(w) { const a = w - .05, pts = [[-a, -.8], [-a, PIED]]; for (let k = 1; k < 8; k++) { const t = k / 8 * Math.PI; pts.push([-a * Math.cos(t), PIED + (HV - PIED) * Math.sin(t)]); } pts.push([a, PIED], [a, -.8]); return pts; }
function construireTunnels() {
  const P = PISTE, roche = SOLS[RIVES[TYPES.indexOf(NIVEAU.rocheTunnel || "montagne")].paroi].c, F = new Forme(), plages = []; let debut = -1;
  for (let i = 0; i < P.N; i++) { if (P.TUN[i] && debut < 0) debut = i; if (debut >= 0 && (!P.TUN[i] || i === P.N - 1)) { plages.push([debut, P.TUN[i] ? i : i - 1]); debut = -1; } }
  for (const [ia, ib] of plages) {
    // la voûte : plus sombre au milieu, plus claire près des entrées
    const pas = [ia - .4]; for (let i = ia; i <= ib; i++) pas.push(i); pas.push(ib + .4);   // la voûte dépasse un peu de chaque façade : jamais de jour entre les deux
    for (let n = 0; n < pas.length - 1; n++) { const i = pas[n], A = at(i), B = at(pas[n + 1]), sa = sectionVoute(A.w), sb = sectionVoute(B.w), ca = fonce(roche[1], .52 + .34 * (1 - lisse(0, 16, Math.min(i - ia, ib - i)))), cb = fonce(roche[1], .52 + .34 * (1 - lisse(0, 16, Math.min(pas[n + 1] - ia, ib - pas[n + 1]))));
      const pt = (a, [u, y]) => [a.x + Math.cos(a.h) * u, y, a.z + Math.sin(a.h) * u];
      for (let k = 0; k < sa.length - 1; k++) { const V = [[pt(A, sa[k]), ca], [pt(A, sa[k + 1]), ca], [pt(B, sb[k + 1]), cb], [pt(B, sb[k]), cb]], ton = k % 2 ? .93 : 1;
        for (const j of [0, 1, 2, 0, 2, 3]) F.v(V[j][0][0], V[j][0][1], V[j][0][2], 0, 1, 0, fonce(V[j][1], ton), 0); } }
    // les deux façades
    for (const [i, dir] of [[ia, -1], [ib, 1]]) { const a = at(i), w = a.w, rx = Math.cos(a.h), rz = Math.sin(a.h), fx = Math.sin(a.h) * dir, fz = -Math.cos(a.h) * dir, L = w + 3.2, dedans = at(i - dir * 6);
      const pt = (u, y, av = .05) => [a.x + rx * u + fx * av, y, a.z + rz * u + fz * av], haut = u => { const cote = u > 0 ? 1 : 0, p = pt(u, 0); return hVraie(i, cote, Math.max(2, Math.abs(u) - w), p[0], p[2]) + .5 * (1 - lisse(w + 1, L, Math.abs(u))); };
      const A0 = w - .05, bas = [], S0 = sectionVoute(w);   // le bas de la façade : le sol sur les côtés, exactement la voûte au milieu
      for (let k = 0; k < 5; k++) bas.push([-L + (L - A0) * k / 5, -.8, -L + (L - A0) * (k + 1) / 5, -.8]);
      for (let k = 1; k < S0.length - 2; k++) bas.push([S0[k][0], S0[k][1], S0[k + 1][0], S0[k + 1][1]]);
      for (let k = 0; k < 5; k++) bas.push([A0 + (L - A0) * k / 5, -.8, A0 + (L - A0) * (k + 1) / 5, -.8]);
      for (const [u0, b0, u1, b1] of bas) { const V = [pt(u0, b0), pt(u1, b1), pt(u1, haut(u1)), pt(u0, haut(u0))];
        for (const j of [0, 1, 2, 0, 2, 3]) F.v(V[j][0], V[j][1], V[j][2], fx, 0, fz, roche[0], 0);
        // le rebord, au-dessus : il rejoint la montagne
        const q = (u, d) => { const b = d ? dedans : a; return [b.x + Math.cos(b.h) * u, haut(u) - (d ? .1 : 0), b.z + Math.sin(b.h) * u]; }, T = [q(u0, 0), q(u1, 0), q(u1, 1), q(u0, 1)];
        for (const j of [0, 1, 2, 0, 2, 3]) { const c = couleurSol(i, T[j] === T[0] || T[j] === T[3] ? (u0 > 0 ? 1 : 0) : (u1 > 0 ? 1 : 0), 3, 1, T[j][0], T[j][2]); F.v(T[j][0], T[j][1], T[j][2], 0, 1, 0, c, 0); } }
      // l'arche : des pierres plus claires autour de l'ouverture
      const S = sectionVoute(w), clair = melange(roche[0], [1, 1, 1], .28), gr = (HV - PIED + .6) / (HV - PIED), ext = ([u, y]) => y <= PIED ? [u + Math.sign(u) * .6, y] : [u * (1 + .6 / (w - .05)), PIED + (y - PIED) * gr];
      for (let k = 0; k < S.length - 1; k++) { const V = [pt(S[k][0], S[k][1], .2), pt(S[k + 1][0], S[k + 1][1], .2), pt(...ext(S[k + 1]), .2), pt(...ext(S[k]), .2)];
        for (const j of [0, 1, 2, 0, 2, 3]) F.v(V[j][0], V[j][1], V[j][2], fx, 0, fz, k % 2 ? clair : fonce(clair, .9), 2); } }
  }
  const m = F.maille(); if (m) scene.add(m);
  return plages;
}
const dansTunnel = s => PISTE.TUN[idx(s)] ? 1 : 0;
