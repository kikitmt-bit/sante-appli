/* ============ Kanto, la nature et le port : cascade, mare, nénuphars, palmier, phare, bateaux, quais, immeubles (12/11) ============ */
// Mêmes règles que kanto.js : F = la Forme (x = le long de la piste, y = vers le haut, z = vers la piste), o = les réglages du fichier,
// R = le hasard du niveau, K = le monde (K.lumiere : une lueur la nuit ; K.son : un bruit qui s'entend selon la distance).
// Les matières (F.matiere) : 3 fenêtre (éclairée la nuit), 7 lampe, 4 lumineux, 5 chute d'eau, 6 eau calme.
Object.assign(RAYON, {ilot: 7, barrage: 0, cascade: 3.5, mare: 4.5, nenuphars: 0, palmier: 1.6, phare: 3.4, bateau: 0, ponton: 0, caisses: 1.3, bitte: .3, immeuble: 7, entrepot: 9, cristal: 1});
Object.assign(OBJETS, {
  cascade(F, o, R, K) {  // une grande chute d'eau sur une paroi (rives falaise, montagne, calcaire) : posée à e = 2, sa nappe tombe jusqu'à la piste
    const L = o.large || 5, d = L / 2, eau = PAL.eau_chute, pied = at(o._s).y - F.oy, e = (o._e || 2) + .3, blanc = [.94, .98, 1];
    F.tapis(-d * .8, -16, d * .8, .1, eau, 1, 8, 6);                                            // le ruisseau, sur le plateau
    const profil = [[-.2, .12], [1, -.5], [e - .1, -2.4], [e + .25, pied + .05]];             // la nappe : du rebord jusqu'à l'eau
    F.matiere(5);
    for (let k = 0; k < profil.length - 1; k++) { const [z0, y0] = profil[k], [z1, y1] = profil[k + 1]; F.quad([-d, y0, z0], [d, y0, z0], [d, y1, z1], [-d, y1, z1], eau, [0, .25, 1]); }
    F.rond(0, pied + .07, e + 1.1, d + 1.1, 1.7, blanc, 10);                                   // l'écume, au pied
    F.matiere(2);
    for (const sx of [-1, 1]) { F.caillou(sx * (d + .5), -.2, .5, .9, .8, .9, PAL.pierre, R); F.caillou(sx * (d + .9), pied + .2, e + .9, .8, .6, .7, PAL.pierre, R); }
    K.son(F, 0, pied, e, .09, 85); },
  mare(F, o, R, K) {  // une mare : de l'eau calme, des nénuphars, quelques roseaux
    const r = o.r || 2.6 + R() * 1.8, n = 12, rayons = [], vase = SOLS.vase ? SOLS.vase.c[0] : PAL.tronc[1]; let bas = 1e9;
    for (let i = 0; i < n; i++) { const k = .84 + R() * .3, a = i / n * Math.PI * 2, [X, Z] = F.monde(Math.cos(a) * r * 1.25 * k, Math.sin(a) * r * k); rayons.push(k); bas = Math.min(bas, hauteur(X, Z)); }
    const y = bas - F.oy + .06;
    F.rond(0, y - .02, 0, r * 1.25 + .35, r + .35, vase, n, rayons);
    F.matiere(6).rond(0, y, 0, r * 1.25, r, PAL.eau_mare, n, rayons).matiere(2);
    for (let k = 0; k < 4; k++) { const a = R() * 6.28, q = .2 + R() * .55, x = Math.cos(a) * r * q, z = Math.sin(a) * r * q * .8, t = .26 + R() * .22; F.rond(x, y + .03, z, t, t, PAL.nenuphar[k % 2], 7); if (k % 2) F.rond(x + .05, y + .06, z, .1, .1, PAL.fleurs.blanc, 5); }
    for (let k = 0; k < 5; k++) { const a = R() * 6.28, x = Math.cos(a) * r * 1.2, z = Math.sin(a) * r * .95, h = .5 + R() * .5; F.boite(x, y - .2, z, .06, h + .2, .06, PAL.herbes[1]); if (k % 2) F.boite(x, y + h - .1, z, .11, .26, .11, PAL.tronc[1]); } },
  nenuphars(F, o, R) {  // sur l'eau (cote "c", e = l'écart au milieu) : un tapis de nénuphars
    const n = o.n || 8, l = o.large || 5;
    for (let k = 0; k < n; k++) { const x = (R() - .5) * l, z = (R() - .5) * 2.6, t = .3 + R() * .32; F.rond(x, .05, z, t, t, PAL.nenuphar[k % 2], 7); if (k % 3 === 0) F.rond(x + .06, .08, z + .04, .12, .12, k % 2 ? PAL.fleurs.blanc : [1, .72, .82], 5); } },
  palmier(F, o, R) {  // un palmier : un tronc qui penche, de longues palmes qui retombent
    const t = PAL.tronc, p = PAL.palmes, H = 4.4 + R() * 1.6, penche = (R() - .5) * 1.8, n = 4; let x = 0, y = -.3;
    F.ombre(penche * .5, 0, 2.2, 2);
    for (let k = 0; k < n; k++) { const h = (H + .3) / n; F.cyl(x, y, 0, .3 - k * .035, .27 - k * .035, h + .06, 6, k % 2 ? t[0] : t[1]); y += h; x += penche * (k + 1) / 10; }
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 + R() * .5, c = Math.cos(a), s = Math.sin(a), L = 2.5 + R() * .9, l = .5, col = p[k % 3], wx = -s * l, wz = c * l;
      const B = [x, y, 0], M = [x + c * L * .55, y + .6, s * L * .55], T = [x + c * L, y - .75, s * L];
      F.poly([[B[0] - wx * .3, B[1], B[2] - wz * .3], [B[0] + wx * .3, B[1], B[2] + wz * .3], [M[0] + wx, M[1], M[2] + wz], [M[0] - wx, M[1], M[2] - wz]], col, [c * .3, 1, s * .3]);
      F.poly([[M[0] - wx, M[1], M[2] - wz], [M[0] + wx, M[1], M[2] + wz], T], fonce(col, .9), [c, .6, s]); }
    for (let k = 0; k < 3; k++) F.boule(x + Math.cos(k * 2.1) * .3, y - .25, Math.sin(k * 2.1) * .3, .2, .2, .2, [t[0], t[0], t[1]], 0); },
  phare(F, o, R, K) {  // un phare rayé rouge et blanc ; sa lanterne s'allume la nuit
    const b = PAL.blanc, r = PAL.toits.rouge; F.ombre(0, 0, 3.2, 3.2);
    F.cyl(0, -1.2, 0, 2.7, 2.5, 1.9, 10, PAL.pierre[1], PAL.pierre[2]);
    for (let k = 0; k < 5; k++) F.cyl(0, .7 + k * 2.6, 0, 1.95 - k * .14, 1.81 - k * .14, 2.6, 10, k % 2 ? r : b);
    F.cyl(0, 13.7, 0, 1.8, 1.8, .3, 10, PAL.cadre); F.matiere(7).cyl(0, 14, 0, 1, 1, 1.5, 8, PAL.lumiere).matiere(2); F.cyl(0, 15.5, 0, 1.4, 0, 1.3, 8, r);
    K.lumiere(F, 0, 14.7, 0, PAL.lumiere, 17); },
  bateau(F, o, R, K) {  // un bateau amarré (à poser avec "flotte": true, e négatif : sur l'eau, contre le quai) ; "voile": true = un voilier.
    // Refait le 12/11 (Kiki : « très prototype ») : une coque galbée en sections, un liseré, un pont en lattes, un bastingage, des défenses côté quai ;
    // à moteur : une cabine vitrée, un pare-brise, une bouée, un feu de mât ; voilier : grand-voile et foc gonflés, en panneaux, bôme, pavillon.
    const nomC = o.coque || ["rouge", "bleu", "blanc"][Math.floor(R() * 3)], c = PAL.coque[nomC], bl = PAL.coque.blanc, lis = nomC === "blanc" ? PAL.coque.bleu : bl;
    const bois = PAL.bois_clair, bois2 = fonce(bois, .9), dessous = hex("#8A3A34"), voilier = !!o.voile;
    // la coque : des sections de la poupe (x = -3.2) à l'étrave (x = 3.7) : [x, demi-largeur, hauteur du bord, fond]
    const SEC = [[-3.2, .98, .72, -.32], [-2.5, 1.16, .7, -.46], [-1.3, 1.26, .68, -.54], [.2, 1.24, .7, -.56], [1.4, 1.06, .76, -.5], [2.4, .74, .86, -.38], [3.1, .38, .96, -.22], [3.7, .02, 1.06, -.02]];
    const T = [0, .1, .32, .58, .82, 1], pt = (S, t, sg) => [S[0] + (S[0] > 2.5 ? t * .12 : 0), S[2] + (S[3] - S[2]) * Math.pow(t, 1.5), sg * S[1] * (1 - Math.pow(t, 2.4))];
    const teinte = k => [lis, c, c, fonce(c, .86), dessous][k];
    for (const sg of [-1, 1]) for (let a = 0; a < SEC.length - 1; a++) for (let k = 0; k < T.length - 1; k++)
      F.poly([pt(SEC[a], T[k], sg), pt(SEC[a + 1], T[k], sg), pt(SEC[a + 1], T[k + 1], sg), pt(SEC[a], T[k + 1], sg)], fonce(teinte(k), sg > 0 ? 1 : .9), [0, -.3, sg]);
    const P0 = SEC[0], tableau = []; for (const t of T) tableau.push(pt(P0, t, 1)); for (const t of T.slice().reverse()) tableau.push(pt(P0, t, -1));
    F.poly(tableau, fonce(c, .78), [-1, 0, 0]);
    // le pont : quatre lattes dans la longueur ; le bastingage blanc tout autour
    for (let a = 0; a < SEC.length - 1; a++) { const A = SEC[a], B = SEC[a + 1];
      for (let k = 0; k < 4; k++) { const z0 = -1 + k / 2, z1 = -1 + (k + 1) / 2;
        F.poly([[A[0], A[2] - .02, A[1] * z0], [B[0], B[2] - .02, B[1] * z0], [B[0], B[2] - .02, B[1] * z1], [A[0], A[2] - .02, A[1] * z1]], k % 2 ? bois : bois2, [0, 1, 0]); }
      for (const sg of [-1, 1]) F.poly([[A[0], A[2] - .02, sg * A[1] * .97], [B[0], B[2] - .02, sg * B[1] * .97], [B[0], B[2] + .16, sg * B[1] * .97], [A[0], A[2] + .16, sg * A[1] * .97]], bl, [0, 0, sg]); }
    F.boite(-3.17, .7, 0, .1, .18, 1.9, bl);
    for (const x of [-1.8, 0, 1.6]) F.cyl(x, .1, -1.24, .13, .13, .5, 6, bl);   // les défenses, côté quai
    if (voilier) {
      const xm = .6, ym = .7, hm = 7.4, cote = R() < .5 ? -1 : 1;
      F.cyl(xm, ym, 0, .1, .07, hm, 6, PAL.cadre); F.boite(xm - 1.6, ym + 1.05, 0, 3.4, .12, .12, bois);
      F.poly([[xm, ym + hm, 0], [xm, ym + hm - .5, 0], [xm - .8, ym + hm - .25, .02]], hex("#D84838"), [0, 0, 1]);   // le pavillon
      const voile = (bas0, bas1, haut, pts, creux) => {   // une voile : du guindant (le long du mât ou de l'étai) à la chute, gonflée par le vent, en panneaux
        const P = (a, b) => { const g = [lerp(bas0[0], haut[0], a), lerp(bas0[1], haut[1], a), 0], d = [lerp(bas1[0], haut[0], a), lerp(bas1[1], haut[1], a), 0];
          return [lerp(g[0], d[0], b), lerp(g[1], d[1], b), cote * creux * Math.sin(Math.PI * b) * (1 - a * .7)]; };
        for (let a = 0; a < pts; a++) for (let b = 0; b < 3; b++) F.poly([P(a / pts, b / 3), P(a / pts, (b + 1) / 3), P((a + 1) / pts, (b + 1) / 3), P((a + 1) / pts, b / 3)], fonce(bl, a % 2 ? .93 : 1), [0, 0, cote]); };
      voile([xm, ym + 1.2], [xm - 3.2, ym + 1.2], [xm, ym + hm - .3], 6, .55);
      voile([xm + .2, ym + .5], [3.6, 1.2], [xm + .1, ym + hm * .82], 5, .4);
    } else {
      const cab = hex("#F4F2EA"), toit = fonce(c, .92);
      F.boite(-1.1, .66, 0, 2.6, 1.15, 1.7, cab); F.boite(-1.15, 1.81, 0, 2.9, .14, 1.9, toit);
      F.poly([[.2, .66, -.85], [.2, .66, .85], [.75, 1.6, .7], [.75, 1.6, -.7]], cab, [1, .4, 0]);
      F.matiere(3).poly([[.3, .9, -.72], [.3, .9, .72], [.66, 1.5, .6], [.66, 1.5, -.6]], PAL.vitre, [1, .4, 0]);
      for (const x of [-1.9, -.9]) for (const sg of [-1, 1]) F.plaque(x - .38, 1.02, x + .38, 1.5, sg * .88, PAL.vitre);
      F.matiere(2);
      F.disque(-1.1, 1.2, .9, .3, .3, hex("#D84838")); for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) F.disque(-1.1, 1.2, .91, .3, .3, bl, a, a + .5, 3); F.disque(-1.1, 1.2, .92, .15, .15, cab);
      F.cyl(-1.6, 1.95, 0, .05, .04, 1.4, 4, PAL.cadre); F.matiere(7).cyl(-1.6, 3.35, 0, .1, .1, .16, 6, PAL.lumiere).matiere(2);
      if (K && K.lumiere) K.lumiere(F, -1.6, 3.43, 0, PAL.lumiere, 1.6); } },
  ponton(F, o, R) {  // un ponton de bois (avec "flotte": true ; "tourne": 90 pour qu'il avance dans l'eau) : lattes ajourées, longerons, pieux à chapeau, corde, échelle
    const L = o.long || 8, l = o.large || 2.2, P = PAL.planche, n = Math.max(2, Math.round(L / 2.4)), corde = hex("#D2BC88"), pieu = PAL.tronc;
    for (const sg of [-1, 1]) F.boite(0, .32, sg * (l / 2 - .25), L, .16, .2, fonce(P, .7));
    for (let x = -L / 2 + .13, k = 0; x < L / 2; x += .29, k++) F.boite(x, .48, 0, .23, .09, l, fonce(P, [1, .93, .86][Math.floor(h2(k, L) * 3)]), {haut: melange(fonce(P, [1, .93, .86][Math.floor(h2(k, L) * 3)]), [1, 1, 1], .1)});
    const xs = []; for (let k = 0; k < n; k++) xs.push(-L / 2 + .2 + (L - .4) * k / (n - 1));
    for (const x of xs) for (const sg of [-1, 1]) { F.cyl(x, -1.6, sg * (l / 2 + .05), .14, .13, 2.75, 6, pieu[0], pieu[1]); F.cyl(x, 1.15, sg * (l / 2 + .05), .16, .16, .07, 6, fonce(pieu[0], .8)); }
    for (let k = 0; k < xs.length - 1; k++) for (const sg of [-1, 1]) { const a = xs[k], b = xs[k + 1], m = (a + b) / 2;   // la corde, qui pend un peu entre deux pieux
      F.boite((a + m) / 2, .98, sg * (l / 2 + .05), m - a, .05, .05, corde); F.boite((m + b) / 2, .98, sg * (l / 2 + .05), b - m, .05, .05, corde); F.boite(m, .93, sg * (l / 2 + .05), .3, .05, .05, corde); }
    const xe = L / 2 + .12; for (const sg of [-1, 1]) F.boite(xe, -.9, sg * .32, .07, 1.6, .07, PAL.cadre);   // l'échelle, au bout
    for (let y = -.6; y < .6; y += .32) F.boite(xe, y, 0, .06, .05, .64, PAL.cadre);
    F.cyl(xs[1] - .3, .53, -l / 2 + .35, .09, .07, .22, 6, PAL.cadre); },
  caisses(F, o, R) {  // un coin de quai : une palette, des caisses cerclées, des tonneaux, parfois un sac
    const b = PAL.bois_clair, cadre = fonce(b, .62), fer = hex("#5A5E68");
    const caisse = (x, y, z, s, t) => { const c = fonce(b, t);
      F.boite(x, y, z, s, s, s, c, {haut: melange(c, [1, 1, 1], .08)});
      for (const [dx, dz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) F.boite(x + dx * (s / 2 - .04), y, z + dz * (s / 2 - .04), .1, s + .01, .1, cadre);   // les montants
      for (const yy of [y, y + s - .09]) F.boite(x, yy, z, s + .03, .09, s + .03, cadre);   // les cerclages du bas et du haut
      F.boite(x, y + s * .45, z, s + .02, .07, s + .02, fonce(cadre, .95)); };
    const tonneau = (x, y, z, r, h) => { const c = hex("#9C6A3C");
      F.cyl(x, y, z, r, r * 1.12, h / 2, 9, c, fonce(c, 1.05)); F.cyl(x, y + h / 2, z, r * 1.12, r, h / 2, 9, fonce(c, 1.05), c, fonce(c, .8));
      for (const t of [.12, .5, .88]) F.cyl(x, y + h * t - .04, z, r * (t === .5 ? 1.14 : 1.05), r * (t === .5 ? 1.14 : 1.05), .08, 9, fer); };
    F.boite(0, -.05, 0, 2.4, .14, 1.6, fonce(b, .78)); for (const x of [-1, 0, 1]) F.boite(x, -.15, 0, .16, .12, 1.6, cadre);   // la palette
    caisse(-.55, .09, -.1, 1.05, 1); caisse(.6, .09, .15, .9, .9); if (R() < .7) caisse(-.4, 1.14, -.05, .8, .95);
    tonneau(2.1, -.1, -.3, .38, 1.05); if (R() < .6) tonneau(2.25, -.1, .55, .36, 1);
    if (R() < .5) F.boule(-1.7, .15, .5, .5, .32, .4, [hex("#A89068"), hex("#C2A87C"), hex("#D6BE92")], 1); },
  bitte(F) {  // une bitte d'amarrage en fonte : socle, fût, chapeau en champignon, une boucle de corde
    const f = hex("#3C4048"), c = hex("#565C66");
    F.cyl(0, -.25, 0, .3, .3, .12, 8, f); F.cyl(0, -.13, 0, .17, .14, .52, 8, c, f); F.cyl(0, .39, 0, .14, .27, .1, 8, f, c); F.cyl(0, .49, 0, .27, .22, .08, 8, c, fonce(c, 1.2));
    F.cyl(0, .12, 0, .19, .19, .07, 8, hex("#D2BC88")); },
  entrepot(F, o, R, K) {  // un entrepôt du port : bardage ondulé, grand portail coulissant à croisillons, auvent, fenêtres hautes, lanterneau, enseigne
    const l = o.l || 14, p = o.p || 8, h = 4.6, d = p / 2, mur = PAL.murs[o.mur || "jaune"], toit = PAL.toits[o.toit || "gris"], onde = fonce(mur, .9), cadre = PAL.cadre;
    F.tapis(-l / 2 - .8, -d - .8, l / 2 + .8, d + 1, null, .74, 3);
    F.boite(0, -1.2, 0, l + .3, 1.65, p + .3, PAL.pierre[1], {haut: PAL.pierre[2]}); F.boite(0, .45, 0, l, h - .45, p, mur);
    for (let x = -l / 2 + .25; x < l / 2; x += .5) F.plaque(x - .08, .5, x + .08, h - .1, d + .02, onde);   // le bardage ondulé : des côtes verticales
    for (let z = -d + .25; z < d; z += .5) for (const sg of [-1, 1]) F.plaqueX(z - .08, .5, z + .08, h - .1, sg * (l / 2 + .02), onde);
    F.toit(0, h, 0, l, p, 1.5, .45, toit, mur); F.boite(0, h + 1.45, 0, l * .5, .45, 1.1, fonce(toit, .85), {haut: fonce(toit, 1.1)});   // le lanterneau, sur le faîte
    const pw = Math.min(5, l * .36);
    F.plaque(-pw / 2 - .2, .45, pw / 2 + .2, 3.75, d + .04, cadre); F.plaque(-pw / 2, .45, pw / 2, 3.55, d + .07, PAL.portes.gris);
    for (const sg of [-1, 1]) { const x0 = sg > 0 ? 0 : -pw / 2, x1 = sg > 0 ? pw / 2 : 0;   // deux battants, chacun son croisillon
      F.plaque(x0 + .05, .55, x1 - .05, .67, d + .1, cadre); F.plaque(x0 + .05, 3.35, x1 - .05, 3.47, d + .1, cadre); F.plaque(x1 - .07, .55, x1 + .03, 3.47, d + .1, cadre);
      F.poly([[x0 + .1, .67, d + .1], [x0 + .28, .67, d + .1], [x1 - .1, 3.35, d + .1], [x1 - .28, 3.35, d + .1]], cadre, [0, 0, 1]); }
    F.boite(0, 3.85, d + .65, pw + 1.4, .18, 1.4, fonce(toit, .9), {haut: toit}); for (const sg of [-1, 1]) F.poly([[sg * (pw / 2 + .5), 3.85, d + .02], [sg * (pw / 2 + .5), 3.85, d + 1.3], [sg * (pw / 2 + .5), 3.2, d + .02]], cadre, [sg, 0, 0]);
    F.matiere(3); for (let x = -l / 2 + 1.2; x < l / 2 - .8; x += 2.2) if (Math.abs(x) > pw / 2 + .8) F.plaque(x - .6, 3.2, x + .6, 3.9, d + .05, PAL.vitre); F.matiere(2);
    F.boite(0, 4.05, d + .1, pw * .8, .7, .1, hex("#2C4C8C"));
    if (K && K.etiquette) K.etiquette(F, o.texte || "ENTREPÔT 3", 0, 4.4, d + .17, pw * .75, .55);
    F.matiere(7).boite(-pw / 2 - .9, 3.5, d + .25, .3, .3, .3, PAL.lumiere).matiere(2); if (K && K.lumiere) K.lumiere(F, -pw / 2 - .9, 3.6, d + .4, PAL.lumiere, 3.5); },
  ilot(F, o, R) {  // un îlot dans un lac ("cote": "c", "e" : à quelle distance du milieu de l'eau) : rochers, plage, herbe ; y poser arbres et Pokémon avec "haut"
    const r = o.r || 6, roc = [hex("#7C7F8C"), hex("#9498A4"), hex("#B4B8C2")], sable = hex("#E6D6A4"), vert = [hex("#4E9C48"), hex("#64B456"), hex("#7CC864")];
    F.caillou(0, -2.4, 0, r * 1.05, 2.6, r * .85, roc, R);
    const bord = []; for (let k = 0; k < 16; k++) bord.push(.85 + .3 * h2(k, r));
    F.rond(0, .04, 0, r * 1.18, r * .98, sable, 16, bord);
    F.dome(0, -.25, 0, r * .9, 1.35, r * .72, vert, 9, true);
    for (let k = 0; k < 4 + Math.floor(R() * 3); k++) { const a = R() * Math.PI * 2, rr = r * (.95 + R() * .25); F.caillou(Math.cos(a) * rr * 1.1, -.25, Math.sin(a) * rr * .9, .45 + R() * .5, .4 + R() * .45, .45 + R() * .5, roc, R); }
    for (let k = 0; k < 7; k++) { const a = R() * Math.PI * 2, rr = r * (1.05 + R() * .15), x = Math.cos(a) * rr * 1.1, z = Math.sin(a) * rr * .9;
      for (let m = 0; m < 3; m++) F.cyl(x + (R() - .5) * .4, -.3, z + (R() - .5) * .4, .05, .02, 1.1 + R() * .8, 4, hex("#5E8C3C"), hex("#8CB45C")); } },
  barrage(F, o, R, K) {  // le barrage au bout des gorges : on arrive dans une impasse, l'eau passe par-dessus la crête et tombe d'un étage ; ton Pokémon saute (à poser "cote": "c" à la crête)
    const W = (o.eau || 8) / 2, pierre = PAL.pierre, clair = melange(pierre[2], [1, 1, 1], .15), sombre = fonce(pierre[0], .85), z0 = W + 1.7, chute = o.chute || 5.5, fer = hex("#4A505C");
    F.boite(-.15, -.55, 0, .9, .55, W * 2 + .4, clair, {haut: melange(clair, [1, 1, 1], .2)});   // la crête, sous une lame d'eau
    for (const sg of [-1, 1]) { const z = sg * z0;   // les deux tours de pierre
      F.boite(0, -chute - 1, z, 3.6, chute + 6.4, 3.2, pierre[1], {haut: pierre[2]});
      for (let y = -chute; y < 5; y += 1.1) F.boite(0, y, z, 3.68, .12, 3.28, sombre);   // les assises
      F.boite(0, 5.4, z, 4, .45, 3.6, clair);
      for (const dx of [-1.4, 0, 1.4]) F.boite(dx, 5.85, z + sg * 1.4, .6, .6, .5, clair);   // les créneaux, côté extérieur
      F.cyl(-1.4, 5.85, z - sg * 1.2, .1, .08, 1.1, 6, PAL.cadre); F.matiere(7).boite(-1.4, 6.95, z - sg * 1.2, .34, .4, .34, PAL.lumiere).matiere(2); F.cyl(-1.4, 7.35, z - sg * 1.2, .26, 0, .3, 4, PAL.cadre);
      if (K && K.lumiere) K.lumiere(F, -1.4, 7.1, z - sg * 1.2, PAL.lumiere, 4); }
    F.boite(0, 4.4, 0, 2.2, .7, z0 * 2, pierre[1], {haut: clair});   // la passerelle des vannes, d'une tour à l'autre : on passe dessous, puis on saute
    for (const sg of [-1, 1]) F.boite(0, 5.1, sg * .95, .12, .6, z0 * 2 - 3.4, fer);
    for (let z = -z0 + 2.2; z < z0 - 2; z += 1.3) F.boite(0, 5.1, z, .1, .6, .1, fer);
    for (const zz of [-W * .5, W * .5]) {   // deux volants de vanne
      F.cyl(0, 5.1, zz, .06, .06, .7, 5, fer);
      F.cyl(0, 5.78, zz, .42, .42, .07, 8, hex("#C83C30")); F.cyl(0, 5.85, zz, .1, .1, .06, 6, fer); }
    F.boite(-.1, 3.65, 0, 2.3, .14, z0 * 2 - 3.2, sombre);
    for (const sg of [-1, 1]) F.boite(1.2, -chute - .2, sg * (W + .15), 1.6, chute + .4, .5, sombre); },   // les bajoyers, le long de la chute
  immeuble(F, o, R) {  // un immeuble de ville (Céladopole, Safrania) : ses fenêtres s'allument la nuit
    const l = o.l || 9, p = o.p || 8, et = o.etages || 4 + Math.floor(R() * 4), h = et * 2.9 + 1, d = p / 2, mur = PAL.murs[o.mur || ["gris", "creme", "blanc", "pierre"][Math.floor(R() * 4)]], n = Math.max(2, Math.floor(l / 2.3)), m = Math.max(2, Math.floor(p / 2.3));
    F.tapis(-l / 2 - .8, -d - .8, l / 2 + .8, d + 1, null, .74, 3);
    F.boite(0, -1.2, 0, l + .2, 1.6, p + .2, PAL.pierre[1]); F.boite(0, .4, 0, l, h - .4, p, mur);
    for (let e = 0; e < et; e++) { const y = 1.2 + e * 2.9;
      F.plaque(-l / 2, y - .32, l / 2, y - .22, d + .02, fonce(mur, .86));
      F.matiere(3);
      for (let k = 0; k < n; k++) { const x = -l / 2 + l * (k + .5) / n; if (e === 0 && k === Math.floor(n / 2)) continue; F.plaque(x - .62, y, x + .62, y + 1.5, d + .05, PAL.vitre); }
      for (let k = 0; k < m; k++) { const z = -d + p * (k + .5) / m; for (const s of [-1, 1]) F.plaqueX(z - .62, y, z + .62, y + 1.5, s * (l / 2 + .05), PAL.vitre); }
      F.matiere(2); }
    const xp = -l / 2 + l * (Math.floor(n / 2) + .5) / n; F.plaque(xp - .8, .4, xp + .8, 2.7, d + .05, PAL.portes[o.porte || "gris"]);
    F.boite(0, h, 0, l + .5, .4, p + .5, fonce(mur, .8), {haut: PAL.pierre[1]}); F.boite(l * .2, h + .4, -p * .15, 1.6, 1.1, 1.6, PAL.pierre[1], {haut: PAL.pierre[2]}); },
  cristal(F, o, R, K) {  // une gerbe de cristaux qui luisent (au bord de l'eau, dans une clairière)
    const col = hex(o.couleur || "#7CE8FF"), n = 3 + Math.floor(R() * 3);
    F.matiere(4);
    for (let k = 0; k < n; k++) F.pointe((R() - .5) * .8, -.2, (R() - .5) * .8, (R() - .5) * .7, 1, (R() - .5) * .7, .2 + R() * .2, 1 + R() * 1.6, 5, fonce(col, .72), melange(col, [1, 1, 1], .45));
    F.matiere(2); K.lumiere(F, 0, 1, 0, col, 5, true); },
});
