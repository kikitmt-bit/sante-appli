/* ============ Kanto, les grands repères du lointain : un volcan, de hautes montagnes, une île ============ */
// Un niveau les nomme : "lointain": [{"o": "volcan", "cap": 150}, {"o": "pics", "cap": -30}] (cap : degrés, 0 = droit devant au départ).
// Les recettes dessinent en mètres, pour un repère à 1 400 m ; F.matiere(4) = lumineux (la lave) ; K.anime({forme, maj(maille, t)}) = une pièce qui bouge ; K.panache({y, haut, large, vent, duree}) = une fumée qui monte.
Object.assign(LOINTAINS, {
  volcan(F, o, R, K) {  // un cône tronqué, un cratère qui rougeoie, des coulées, un panache de fumée
    const roche = hex("#6A5258"), ombre = hex("#544046"), lave = PAL.lave || [hex("#FF7A30"), hex("#FFC850")], n = 12, H = 440, R1 = 640, R2 = 120;
    const P = (i, r, y) => { const a = i / n * Math.PI * 2, k = 1 + .12 * Math.sin(i * 2.7 + r * .01); return [Math.cos(a) * r * k, y, Math.sin(a) * r * k]; };
    for (let i = 0; i < n; i++) { const a = (i + .5) / n * Math.PI * 2, vers = [Math.cos(a), .6, Math.sin(a)];
      F.poly([P(i, R1, -30), P(i + 1, R1, -30), P(i + 1, R1 * .55, H * .5), P(i, R1 * .55, H * .5)], i % 2 ? roche : ombre, vers);
      F.poly([P(i, R1 * .55, H * .5), P(i + 1, R1 * .55, H * .5), P(i + 1, R2, H), P(i, R2, H)], i % 2 ? ombre : roche, vers); }
    F.matiere(4);
    F.rond(0, H - 6, 0, R2 * .92, R2 * .92, lave[0], n);
    for (const i of [1, 4, 8]) { const a = (i + .5) / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), w = 16;   // les coulées
      F.poly([[c * R2 - s * w, H + 2, s * R2 + c * w], [c * R2 + s * w, H + 2, s * R2 - c * w], [c * R1 * .5 + s * w * .7, H * .56, s * R1 * .5 - c * w * .7], [c * R1 * .5 - s * w * .7, H * .56, s * R1 * .5 + c * w * .7]], lave[i % 2], [c, .6, s]); }
    F.matiere(2);
    K.panache({y: H - 20, haut: 560, large: 210, vent: 300, duree: 55, n: 24}); },   // la fumée : des bouffées qui montent et s'effacent (Kiki, 12/11 : plus de boules figées)
  pics(F, o, R) {  // une chaîne de hautes montagnes aux sommets enneigés
    const n = o.n || 6, large = o.large || 2300, c1 = hex("#7C9CCC"), c2 = hex("#6688BC"), neige = [.95, .97, 1], neige2 = [.82, .88, .97];
    for (let k = 0; k < n; k++) { const x0 = (k / (n - 1) - .5) * large + (R() - .5) * 160, z0 = (R() - .5) * 300, H = 420 + R() * 420, B = H * (.75 + R() * .35), m = 7, cs = H * (.62 + R() * .1);
      const P = (i, f) => { const a = i / m * Math.PI * 2 + k, r = B * (1 - f) * (1 + .22 * Math.sin(i * 3.1 + k)); return [x0 + Math.cos(a) * r, -30 + (H + 30) * f, z0 + Math.sin(a) * r]; };
      for (let i = 0; i < m; i++) { const a = (i + .5) / m * Math.PI * 2 + k, vers = [Math.cos(a), .5, Math.sin(a)], f = cs / H;
        F.poly([P(i, 0), P(i + 1, 0), P(i + 1, f), P(i, f)], i % 2 ? c1 : c2, vers);
        F.poly([P(i, f), P(i + 1, f), P(i, 1)], i % 2 ? neige : neige2, vers); } } },
  ile(F, o, R) {  // une île basse, au large : une colline, quelques arbres
    const vert = hex("#6CBC5C"), vert2 = hex("#5CAC50"), sable = hex("#EADCA8"), n = 10;
    const P = (i, r, y) => { const a = i / n * Math.PI * 2; return [Math.cos(a) * r * 1.8, y, Math.sin(a) * r]; };
    for (let i = 0; i < n; i++) { const a = (i + .5) / n * Math.PI * 2, vers = [Math.cos(a), .8, Math.sin(a)];
      F.poly([P(i, 330, -20), P(i + 1, 330, -20), P(i + 1, 250, 22), P(i, 250, 22)], sable, vers);
      F.poly([P(i, 250, 22), P(i + 1, 250, 22), P(i + 1, 90, 110), P(i, 90, 110)], i % 2 ? vert : vert2, vers);
      F.poly([P(i, 90, 110), P(i + 1, 90, 110), [0, 135, 0]], i % 2 ? vert2 : vert, vers); } },
});
