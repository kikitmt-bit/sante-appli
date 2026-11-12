/* ============ Kanto, la nature et le port : cascade, mare, nénuphars, palmier, phare, bateaux, quais, immeubles (12/11) ============ */
// Mêmes règles que kanto.js : F = la Forme (x = le long de la piste, y = vers le haut, z = vers la piste), o = les réglages du fichier,
// R = le hasard du niveau, K = le monde (K.lumiere : une lueur la nuit ; K.son : un bruit qui s'entend selon la distance).
// Les matières (F.matiere) : 3 fenêtre (éclairée la nuit), 7 lampe, 4 lumineux, 5 chute d'eau, 6 eau calme.
Object.assign(RAYON, {cascade: 3.5, mare: 4.5, nenuphars: 0, palmier: 1.6, phare: 3.4, bateau: 0, ponton: 0, caisses: 1.3, bitte: .3, immeuble: 7, entrepot: 9, cristal: 1});
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
  bateau(F, o, R) {  // un bateau amarré (à poser avec "flotte": true, e négatif : sur l'eau, contre le quai) ; "voile": true = un voilier
    const c = PAL.coque[o.coque || ["rouge", "bleu", "blanc"][Math.floor(R() * 3)]], bl = PAL.coque.blanc, W = 1.15, y0 = -.45, y1 = .65, bois = PAL.bois_clair;
    for (const s of [1, -1]) { const z = s * W;
      F.poly([[-3, y0, z * .75], [1.6, y0, z * .75], [1.6, y1, z], [-3, y1, z]], s > 0 ? c : fonce(c, .86), [0, 0, s]);
      F.poly([[1.6, y0, z * .75], [3, y0 + .3, 0], [3.5, y1 + .25, 0], [1.6, y1, z]], s > 0 ? fonce(c, .93) : fonce(c, .8), [.5, 0, s]);
      F.poly([[-3, y1 - .22, z * 1.01], [1.6, y1 - .22, z * 1.01], [1.6, y1 - .06, z * 1.01], [-3, y1 - .06, z * 1.01]], bl, [0, 0, s]); }
    F.poly([[-3, y0, -W * .75], [-3, y0, W * .75], [-3, y1, W], [-3, y1, -W]], fonce(c, .8), [-1, 0, 0]);
    F.poly([[-3, y1, -W], [-3, y1, W], [1.6, y1, W], [3.5, y1 + .25, 0], [1.6, y1, -W]], bois, [0, 1, 0]);
    if (o.voile) { F.cyl(.3, y1, 0, .09, .06, 6.6, 5, bois); F.poly([[.45, y1 + .9, 0], [.45, y1 + 6.3, 0], [3.1, y1 + 1, 0]], bl, [0, 0, 1]); F.poly([[.15, y1 + 1.1, 0], [.15, y1 + 5.6, 0], [-2.7, y1 + 1.1, 0]], fonce(bl, .93), [0, 0, 1]); }
    else { F.boite(-1, y1, 0, 2, 1.25, 1.6, bl, {haut: c}); F.matiere(3).plaque(-1.7, y1 + .5, -.3, y1 + 1.05, .83, PAL.vitre).plaqueX(-.6, y1 + .5, .6, y1 + 1.05, .03, PAL.vitre).matiere(2); F.cyl(-1.6, y1 + 1.25, 0, .05, .05, 1.5, 4, PAL.cadre); } },
  ponton(F, o) {  // un ponton de bois sur ses pieux (avec "flotte": true ; "tourne": 90 pour qu'il avance dans l'eau)
    const L = o.long || 8, l = o.large || 2.2, bois = PAL.planche, n = Math.max(2, Math.round(L / 2.4));
    F.boite(0, .5, 0, L, .16, l, bois, {haut: melange(bois, [1, 1, 1], .12)});
    for (let k = 0; k < n; k++) for (const s of [-1, 1]) F.cyl(-L / 2 + .3 + (L - .6) * k / (n - 1), -1.6, s * (l / 2 - .15), .13, .13, 2.5, 5, PAL.tronc[0], PAL.tronc[1]); },
  caisses(F, o, R) { const b = PAL.bois_clair, s = fonce(b, .8);
    F.boite(0, -.1, 0, 1.2, 1.1, 1.2, b, {haut: s}); F.boite(1.25, -.1, .2, 1, .9, 1, s, {haut: b}); if (R() < .6) F.boite(.5, 1, .1, .9, .8, .9, fonce(b, .9), {haut: s}); },
  bitte(F) { F.cyl(0, -.2, 0, .2, .16, .7, 6, PAL.cadre); F.cyl(0, .5, 0, .26, .26, .14, 6, PAL.cadre); },
  entrepot(F, o) {  // un entrepôt du port : long, bas, un grand portail
    const l = o.l || 14, p = o.p || 8, h = 4.2, d = p / 2, mur = PAL.murs[o.mur || "jaune"], toit = PAL.toits[o.toit || "gris"];
    F.tapis(-l / 2 - .8, -d - .8, l / 2 + .8, d + 1, null, .74, 3);
    F.boite(0, -1.2, 0, l + .2, 1.6, p + .2, PAL.pierre[1]); F.boite(0, .4, 0, l, h - .4, p, mur); F.toit(0, h, 0, l, p, 1.3, .5, toit, mur);
    F.plaque(-2.2, .4, 2.2, 3.4, d + .03, PAL.cadre); F.plaque(-2, .4, 2, 3.2, d + .06, PAL.portes.gris);
    for (const x of [-l / 2 + 2, l / 2 - 2]) { F.plaque(x - .9, 2.3, x + .9, 3.3, d + .03, BLANC); F.matiere(3).plaque(x - .78, 2.42, x + .78, 3.18, d + .06, PAL.vitre).matiere(2); } },
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
