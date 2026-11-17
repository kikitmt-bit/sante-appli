/* ============ Kanto, les vraies routes (17/11, étape 8 du plan, lot 4) : ce que la carte OpenStreetMap voit le long d'une vraie route ============ */
// La chapelle, la piscine, la tour-relais, les rangs de vigne. Posés par le niveau (outils/osm.py) à leur vraie place et à leur taille,
// ou par les règles de la région kanto-reel (les vignes). Même repère que les autres objets : x le long de la route, z vers la route, y vers le haut.
Object.assign(RAYON, {chapelle: 6, piscine: 0, tour_relais: 5, vignes: 7});
Object.assign(OBJETS, {
  chapelle(F, o) {  // une chapelle de Provence : murs de pierre blonde, toit de tuiles orangées, clocher-mur et sa cloche, porte en arc
    const l = o.l || 10, p = o.p || 6.5, h = 5.2, d = p / 2, pierre = hex("#ECDDBE"), joint = fonce(pierre, .86), toit = PAL.toits.orange;
    F.tapis(-l / 2 - .8, -d - .8, l / 2 + .8, d + 1, null, .74, 3);
    F.boite(0, -1.3, 0, l + .2, 1.6, p + .2, PAL.pierre[1]); F.boite(0, .3, 0, l, h - .3, p, pierre);
    for (let y = 1.1; y < h - .3; y += .9) F.plaque(-l / 2, y, l / 2, y + .06, d + .015, joint);   // les assises de pierre
    F.toit(0, h, 0, l, p, 1.6, .45, toit, pierre);
    // la porte en arc et l'oculus, sur la façade qui regarde la route
    F.plaque(-.85, .3, .85, 2.6, d + .03, fonce(pierre, .7)); F.disque(0, 2.6, d + .03, .85, .85, fonce(pierre, .7), 0, Math.PI, 8);
    F.plaque(-.7, .3, .7, 2.5, d + .06, PAL.portes.rouge); F.disque(0, 2.5, d + .06, .7, .7, PAL.portes.rouge, 0, Math.PI, 8);
    F.disque(0, 4.1, d + .03, .45, .45, PAL.vitre, 0, Math.PI * 2, 10);
    // le clocher-mur, au bout du toit : un mur percé d'un arc, une cloche, une petite croix
    const xc = l / 2 - .4;
    F.boite(xc, h - .2, 0, .7, 3.4, 2.2, pierre, {haut: fonce(pierre, .92)});
    F.plaqueX(-.55, h + 1.3, .55, h + 2.4, xc + .36, fonce(pierre, .55)); F.plaqueX(-.55, h + 1.3, .55, h + 2.4, xc - .36, fonce(pierre, .55));
    F.cyl(xc, h + 1.55, 0, .32, .14, .6, 7, PAL.or[0], PAL.or[1]);
    F.boite(xc, h + 3.2, 0, .12, .9, .12, PAL.cadre); F.boite(xc, h + 3.7, 0, .12, .12, .55, PAL.cadre); },
  piscine(F, o) {  // une piscine : l'eau bleue dans sa margelle blanche (la Provence vue de la route)
    const l = o.l || 8, p = o.p || 4, b = .55, blanc = hex("#F4F2EA"), eau = hex("#4CB8F0"), clair = hex("#8AD8FA");
    F.tapis(-l / 2 - 1.4, -p / 2 - 1.4, l / 2 + 1.4, p / 2 + 1.4, hex("#E8DCC0"), .74, 3);   // la plage de la piscine
    F.boite(0, -.6, -p / 2 - b / 2, l + 2 * b, .7, b, blanc); F.boite(0, -.6, p / 2 + b / 2, l + 2 * b, .7, b, blanc);
    F.boite(-l / 2 - b / 2, -.6, 0, b, .7, p, blanc); F.boite(l / 2 + b / 2, -.6, 0, b, .7, p, blanc);
    F.boite(0, -.6, 0, l, .64, p, eau, {haut: eau});
    F.plaque(-l / 2 + .4, .041, -l / 2 + 1.6, .05, 0, clair); },   // (une ride claire sur l'eau, vue de près)
  tour_relais(F, o, R, K) {  // la tour-relais d'un sommet : socle de béton blanc, fût rond, mât rayé rouge et blanc, son feu la nuit
    const blanc = hex("#F2F2EE"), gris = hex("#B4BAC4"), rouge = PAL.fleurs.rouge;
    if (o.mat) {   // une antenne seule (« mast » sur la carte) : un mât en treillis rayé, ses haubans suggérés par trois pieds
      const H = Math.max(8, Math.min(o.haut_t || 18, 40));
      F.ombre(0, 0, 1.6, 1.6); F.boite(0, -.4, 0, 1.6, .6, 1.6, PAL.pierre[1]);
      for (let k = 0; k < 6; k++) F.cyl(0, .2 + k * H / 6, 0, .32 - k * .03, .29 - k * .03, H / 6, 4, k % 2 ? blanc : rouge, k % 2 ? blanc : rouge);
      K.lumiere(F, 0, H + .4, 0, rouge, 1.4); return; }
    const H = Math.max(18, Math.min(o.haut_t || 40, 70)), f = H * .55;
    F.ombre(0, 0, 6, 6);
    F.boite(0, -1.2, 0, 11, 1.6, 9, PAL.pierre[1]); F.boite(0, .4, 0, 10.6, 4.4, 8.6, blanc, {haut: gris});
    F.matiere(3); for (const x of [-3.4, -1.1, 1.2, 3.5]) F.plaque(x - .7, 2.2, x + .7, 3.6, 4.32, PAL.vitre); F.matiere(2);
    F.cyl(0, 4.8, 0, 2.6, 2.3, f - 4.8, 10, blanc, blanc);
    F.cyl(0, f, 0, 3.4, 3.4, 1.1, 10, gris, gris, gris);   // la plateforme des antennes
    for (let k = 0; k < 6; k++) { const y = f + 1.1 + k * (H - f - 1.1) / 6; F.cyl(0, y, 0, .55 - k * .06, .5 - k * .06, (H - f - 1.1) / 6, 6, k % 2 ? blanc : rouge, k % 2 ? blanc : rouge); }
    K.lumiere(F, 0, H + .3, 0, rouge, 2.2); },
  vignes(F, o, R) {  // une parcelle de vigne : des rangs perpendiculaires à la route, des ceps bas et touffus, qui suivent le sol
    const n = o.rangs || 5, L = o.long || 12, ecart = 2.3, piquet = PAL.tronc[1], pas = 1.6;
    const vert = [hex("#5CA83C"), hex("#74BC48"), hex("#A6D86A")];
    for (let r = 0; r < n; r++) { const x = (r - (n - 1) / 2) * ecart;
      if (o.simple) { for (const z of [-L / 4, L / 4]) F.boite(x, solLocal(F, x, z) + .1, z, .6, .75, L / 2 - .3, vert[r % 2], {haut: vert[2]}); continue; }   // au loin : un rang = deux blocs
      for (let z = -L / 2 + pas / 2, k = 0; z < L / 2; z += pas, k++) { const y = solLocal(F, x, z), t = (r * 7 + k * 3) % 5;
        F.boite(x, y + .1, z, .62 + (t % 2) * .1, .82 + t * .04, pas - .55, vert[t % 2], {haut: vert[2]}); }
      for (const z of [-L / 2, L / 2]) F.boite(x, solLocal(F, x, z) - .2, z, .1, 1.35, .1, piquet); } },
});
