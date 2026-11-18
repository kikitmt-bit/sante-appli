/* ============ Vichy, le lac d'Allier (18/11, Kiki : son vrai parcours de kayak et de paddle, le plus fidèle possible) ============ */
// Les repères du lac, posés par le niveau (outils/plan_eau.py) à leur vraie place d'après OpenStreetMap : le pont Jacques Chirac, le club
// d'aviron et son grand ponton, la plage des Célestins (parasols, transats). Premier jet en volumes simples : à refaire d'après les photos de Kiki.
// Repère d'un objet : x le long de la route (vers l'arrière), z vers la route (à gauche pour un objet "cote": "c"), y vers le haut.
Object.assign(RAYON, {pont_route: 0, club_aviron: 0, ponton_aviron: 0, parasol: 1.4, transat: .9, skiffs: 2});
Object.assign(OBJETS, {
  pont_route(F, o, R, K) {  // un grand pont routier qui enjambe tout le lac ("cote": "c" là où la route passe dessous ; "tourne" : son axe ;
    // "de" et "a" : où il commence et finit le long de son axe, en mètres depuis ce point ; "hauteur" : le dessous du tablier au-dessus de l'eau)
    const x0 = o.de === undefined ? -60 : o.de, x1 = o.a === undefined ? 60 : o.a, H = o.hauteur || 8.5, l = o.large || 11, ep = 1.5;
    const beton = hex("#DCD6C8"), ombre = fonce(beton, .78), garde = hex("#5C6470"), trottoir = hex("#C8C2B4"), route = hex("#70747C"), L = x1 - x0, xm = (x0 + x1) / 2;
    F.boite(xm, H, 0, L, ep, l, beton, {haut: route});   // le tablier
    F.quad([x0, H, -l / 2], [x1, H, -l / 2], [x1, H, l / 2], [x0, H, l / 2], ombre, [0, -1, 0]);   // son dessous, qu'on voit en passant
    F.boite(xm, H + ep, l / 2 - .9, L, .18, 1.8, trottoir); F.boite(xm, H + ep, -l / 2 + .9, L, .18, 1.8, trottoir);   // les trottoirs
    F.boite(xm, H + ep + .02, 0, L, .02, .14, hex("#F2F2EE"));   // la ligne blanche au milieu
    for (const sg of [-1, 1]) {   // les garde-corps : une lisse en haut, des barreaux serrés (à cette distance : une bande ajourée)
      F.boite(xm, H + ep + 1.05, sg * (l / 2 - .05), L, .09, .09, garde);
      for (let x = x0 + .6; x < x1; x += 1.2) F.boite(x, H + ep + .18, sg * (l / 2 - .05), .06, .9, .06, garde);
      F.boite(xm, H + .25, sg * (l / 2 + .02), L, .5, .04, fonce(beton, .9));   // la corniche, plus claire en façade
    }
    for (let x = x0 + 14; x < x1 - 6; x += 28) {   // les réverbères, en quinconce, qui s'allument le soir
      const sg = Math.round((x - x0) / 28) % 2 ? 1 : -1, z = sg * (l / 2 - .4);
      F.cyl(x, H + ep + .18, z, .09, .07, 6.4, 5, garde); F.boite(x, H + ep + 6.5, z - sg * .7, .16, .1, 1.5, garde);
      F.matiere(7).boite(x, H + ep + 6.3, z - sg * 1.3, .4, .18, .5, PAL.lumiere).matiere(2);
      if (K && K.lumiere) K.lumiere(F, x, H + ep + 6.2, z - sg * 1.3, PAL.lumiere, 2);
    }
    // les piles : des voiles de béton dans l'eau, arrondies, jamais là où passe la route (autour de x = 0)
    const pas = o.travee || 34, libre = o.libre || 13;
    for (let x = x0 + pas; x < x1 - pas * .5; x += pas) {
      if (Math.abs(x) < libre) continue;
      F.boite(x, -1.6, 0, 2.2, H + 1.6, l * .7, beton, {haut: beton});
      F.cyl(x, -1.6, l * .35, 1.1, 1.1, H + 1.6, 8, beton, beton); F.cyl(x, -1.6, -l * .35, 1.1, 1.1, H + 1.6, 8, beton, beton);
      F.boite(x, H - .7, 0, 3.2, .7, l + .4, ombre);   // le chapiteau sous le tablier
      F.rond(x, .03, 0, 1.9, l * .5, [.95, .98, 1], 10);   // un peu d'écume au pied
    }
    for (const x of [x0, x1]) F.boite(x, -1.8, 0, 4, H + 1.8, l + 1, ombre, {haut: beton});   // les culées, sur chaque berge
  },
  club_aviron(F, o, R, K) {  // le club d'aviron : un long hangar à bateaux (grandes portes, toit plat débordant), un étage vitré, le nom du club
    const l = o.l || 34, p = o.p || 12, h = 4.6, d = p / 2, mur = hex("#F0EEE6"), toit = hex("#5E6A78"), bleu = hex("#2E6CB8"), porte = hex("#8C96A4");
    F.ombre(0, 0, l / 2 + 1, d + 1); F.boite(0, -1, 0, l + .4, 1.2, p + .4, PAL.pierre[1]);
    F.boite(0, .2, 0, l, h, p, mur, {haut: toit});
    const n = Math.max(3, Math.round(l / 6.5)), w = (l - 2) / n;   // les portes du hangar, côté eau (face à la route : z > 0)
    for (let k = 0; k < n; k++) { const x = -l / 2 + 1 + w * (k + .5); F.plaque(x - w / 2 + .35, .2, x + w / 2 - .35, 3.7, d + .02, porte);
      for (let y = .7; y < 3.7; y += .5) F.plaque(x - w / 2 + .35, y, x + w / 2 - .35, y + .05, d + .03, fonce(porte, .85)); }
    F.boite(0, h + .2, 0, l + 1.6, .3, p + 1.6, toit);   // le toit plat qui déborde
    F.plaque(-l / 2 + 1, 3.95, l / 2 - 1, 4.55, d + .03, bleu);   // le bandeau bleu du club
    const le = l * .45; F.boite(l / 2 - le / 2 - 1, h + .5, -1, le, 3, p - 3, mur, {haut: toit});   // l'étage du club-house, vitré côté eau
    F.matiere(3); for (let x = l / 2 - le - .5; x < l / 2 - 1.6; x += 1.9) F.plaque(x, h + 1, x + 1.5, h + 3, d - 2.48, PAL.vitre); F.matiere(2);
    F.boite(l / 2 - le / 2 - 1, h + 3.5, -1, le + .8, .25, p - 2.2, toit);
    F.cyl(-l / 2 - 2, -.2, d - 1, .08, .06, 9, 5, PAL.cadre);   // le mât et son drapeau bleu
    F.boite(-l / 2 - 2.6, 7.6, d - 1, 1.2, .8, .04, bleu);
  },
  ponton_aviron(F, o, R) {  // le grand ponton flottant du club, le long de la berge : plateau de bois sur flotteurs, des skiffs posés dessus
    const L = o.long || 50, l = o.large || 4, P = PAL.planche, flot = hex("#E6E8EC");
    F.boite(0, -.25, 0, L, .3, l - .3, flot);   // les flotteurs
    F.boite(0, .05, 0, L, .16, l, fonce(P, .95), {haut: melange(P, [1, 1, 1], .08)});
    for (let x = -L / 2 + 1.5; x < L / 2; x += 3) F.boite(x, .2, 0, .08, .02, l, fonce(P, .78));   // les joints des plateaux
    for (const sg of [-1, 1]) for (let x = -L / 2 + 3; x < L / 2; x += 12) F.cyl(x, .2, sg * (l / 2 - .2), .1, .08, .35, 5, PAL.cadre);   // les taquets
    const coques = [hex("#F2F2EE"), hex("#E8C440"), hex("#3878D0"), hex("#D84838")];
    for (let k = 0, x = -L / 2 + 6; x < L / 2 - 6; x += 9, k++) {   // des skiffs retournés, posés sur le ponton : longs et fins
      const c = coques[Math.floor(h2(k, L) * coques.length)], z = (h2(k, 7) - .5) * (l - 1.4);
      F.boite(x, .22, z, 7.6, .24, .32, c, {haut: c}); F.boite(x, .22, z, 8.2, .14, .16, fonce(c, .9));
    }
  },
  skiffs(F, o, R) {  // un râtelier de skiffs devant le hangar : trois étages de coques
    const coques = [hex("#F2F2EE"), hex("#E8C440"), hex("#3878D0")], bois = PAL.tronc;
    for (const x of [-3.6, 0, 3.6]) F.boite(x, 0, 0, .14, 2.6, .14, bois[0]);
    for (let k = 0; k < 3; k++) { F.boite(0, .6 + k * .8, 0, 8.4, .08, .5, fonce(bois[0], .8)); const c = coques[k]; F.boite(0, .7 + k * .8, 0, 8, .22, .34, c); }
  },
  parasol(F, o, R) {  // un parasol de plage (toile rayée, mât de bois) ; parfois un transat à son pied
    const toiles = [[hex("#E84838"), hex("#F8F4EC")], [hex("#2E7CD8"), hex("#F8F4EC")], [hex("#F2C230"), hex("#F8F4EC")]], t = toiles[Math.floor(R() * toiles.length)];
    F.ombre(.4, 0, 1.4, 1.4); F.cyl(0, 0, 0, .05, .05, 2.3, 5, PAL.tronc[1]);
    for (let k = 0; k < 8; k++) { const a0 = k * Math.PI / 4, a1 = a0 + Math.PI / 4, r = 1.35, c = t[k % 2];
      F.tri([0, 2.55, 0], [Math.cos(a0) * r, 2.15, Math.sin(a0) * r], [Math.cos(a1) * r, 2.15, Math.sin(a1) * r], c, [0, 1, 0]); }
    if (R() < .6) OBJETS.transat(F, {x: 1.2}, R);
  },
  transat(F, o, R) {  // un transat : cadre de bois, toile colorée
    const x = o.x || 0, toile = [hex("#2E7CD8"), hex("#E84838"), hex("#3CB060"), hex("#F2C230")][Math.floor(R() * 4)], b = PAL.planche;
    F.boite(x, .25, 0, 1.6, .06, .6, toile); F.boite(x - .95, .3, 0, .06, .7, .6, toile);
    for (const dz of [-.3, .3]) { F.boite(x, .1, dz, 1.7, .05, .05, fonce(b, .7)); F.boite(x - .95, .1, dz, .05, .8, .05, fonce(b, .7)); }
  },
});
