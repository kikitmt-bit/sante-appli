/* ============ Kanto, le bord des routes (12/11) : glissière, poteau, borne, bottes de foin ============ */
// Pour les circuits sur la terre (vélo, elliptique). Même repère que les autres objets : x le long de la route, z vers la route, y vers le haut.
Object.assign(RAYON, {glissiere: .2, poteau: .3, borne: .3, meule: 1.6, borne_km: .5, arche_arrivee: 0});
Object.assign(OBJETS, {
  glissiere(F, o) {  // une glissière de sécurité au bord d'un ravin : 5 m de lisse en acier sur ses poteaux, un catadioptre
    const L = o.long || 5, acier = hex("#B8BEC8"), sombre = hex("#7C828E");
    for (let x = -L / 2 + .3; x < L / 2; x += 1.25) F.boite(x, -.4, -.12, .1, 1.1, .1, sombre);
    F.boite(0, .38, 0, L, .32, .06, acier, {haut: fonce(acier, 1.1)}); F.boite(0, .5, -.04, L, .06, .06, fonce(acier, .82));
    F.boite(0, .5, .05, .1, .1, .03, hex("#F0A030")); },
  poteau(F, o, R) {  // un poteau télégraphique en bois, sa traverse et ses isolateurs
    const b = PAL.tronc, h = 6.6 + R() * .8;
    F.cyl(0, -.3, 0, .15, .11, h, 6, b[0], b[1]); F.boite(0, h - .9, 0, .14, .14, 1.7, b[0]);
    for (const z of [-.7, -.25, .25, .7]) F.cyl(0, h - .76, z, .05, .04, .2, 5, BLANC); },
  borne(F) {  // une borne de route : blanche, tête rouge, une plaque
    const blanc = hex("#F2F2EA"), rouge = hex("#D84838");
    F.boite(0, -.2, 0, .36, .75, .24, blanc); F.boite(0, .55, 0, .38, .26, .26, rouge, {haut: fonce(rouge, 1.1)});
    F.plaque(-.12, .2, .12, .38, .13, hex("#E8D890")); },
  meule(F, o, R) {  // des bottes de foin : deux ou trois en tas
    const paille = hex("#E2C46C"), lien = hex("#B8963C"), botte = (x, y, z) => { F.boite(x, y, z, 1.2, .55, .62, paille, {haut: melange(paille, BLANC, .15)}); for (const dx of [-.3, .3]) F.boite(x + dx, y - .01, z, .05, .57, .64, lien); };
    botte(0, -.1, 0); botte(.1, -.1, .68); botte(.05, .45, .34); if (R() < .5) botte(1.4, -.1, .2); },
  // (16/11, étape 8 du plan) les vraies routes de riviere/outils/gpx.py
  borne_km(F, o, R, K) {  // la borne d'un kilomètre de col, comme les vraies : « SOMMET 3 KM », la pente du kilomètre qui vient, tête à sa couleur
    const blanc = hex("#F2F2EA"), p = o.pente || 0, tete = hex(p >= 10 ? "#30302C" : p >= 8 ? "#D84838" : p >= 5 ? "#F0B830" : "#58A848");
    F.boite(0, -.3, 0, .8, 1.55, .42, blanc, {haut: blanc}); F.boite(0, 1.25, 0, .86, .38, .48, tete, {haut: fonce(tete, 1.1)});
    K.etiquette(F, "SOMMET " + (o.texte || ""), 0, .9, .22, .74, .28); K.etiquette(F, p + " %", 0, .42, .22, .54, .34); },
  arche_arrivee(F, o, R, K) {  // l'arche d'arrivée en haut d'un col : deux piliers, une banderole à damier, le mot « SOMMET »
    const d = (o.large || 6) / 2 + 1.1, noir = PAL.cadre, rouge = PAL.fleurs.rouge, c = .6, n = Math.round(d * 2 / c);
    for (const x of [-d, d]) { F.boite(x, -.6, 0, .7, 6.4, .7, BLANC, {haut: BLANC}); F.boite(x, 5.5, 0, .8, .4, .8, rouge); }
    F.boite(0, 5.75, 0, 2 * d + .8, 1.05, .5, rouge, {haut: fonce(rouge, 1.1)});
    for (let k = 0; k < n; k++) for (let j = 0; j < 2; j++) { const x0 = -d + 2 * d * k / n, x1 = -d + 2 * d * (k + 1) / n; F.quad([x0, 4.3 + j * c, .27], [x1, 4.3 + j * c, .27], [x1, 4.3 + (j + 1) * c, .27], [x0, 4.3 + (j + 1) * c, .27], (k + j) % 2 ? noir : BLANC, [0, 0, 1]); }
    K.etiquette(F, o.texte || "ARRIVÉE", 0, 6.27, .27, Math.min(2 * d - .6, 4.2), .85); },
});
