/* ============ le kit d'objets : chacun est une petite recette de volumes, dans son repère (z = vers la rivière, x = dans le sens du courant, y = vers le haut) ============ */
// Ajouter un objet au jeu = ajouter une recette ici. Les niveaux, les régions et les lieux n'utilisent que des noms d'objets.
// F : la Forme où dessiner (déjà placée et tournée) ; o : ses réglages (venus du fichier) ; R : le hasard du niveau ; K : le monde (étiquettes, sprites, objets animés).
const PAL = couleurs(BIOME.palette);
const RAYON = {arbre: 2.3, arbre_loin: 3.1, buisson: 1, rocher: 1.2, herbes: 1.6, fleurs: 1, roseaux: .5, maison: 6, labo: 11, centre: 8, boutique: 7, eolienne: 2, panneau: 1.6, barriere: .3, boite_lettres: .4, lampadaire: .4, pokemon: .8, habitant: .6, chemin: 0, tronc: 0, rondins: 0, ligne: 0};
const BLANC = [1, 1, 1];
const EVENEMENTS = {tronc: "saut", rondins: "plongee"};   // ces objets font réagir ton Pokémon quand il arrive dessus
/* les pièces communes aux bâtiments */
function fenetre(F, x, y, w, h, z, barres = 1) {  // un cadre blanc, une vitre bleue, des montants
  F.plaque(x - w / 2 - .12, y - .12, x + w / 2 + .12, y + h + .12, z + .03, BLANC); F.plaque(x - w / 2, y, x + w / 2, y + h, z + .06, PAL.vitre);
  for (let k = 1; k <= barres; k++) { const X = x - w / 2 + w * k / (barres + 1); F.plaque(X - .05, y, X + .05, y + h, z + .09, BLANC); } }
function pokeball(F, x, y, z, r, fond, trait) {  // l'emblème : une Poké Ball vue de face
  F.disque(x, y, z, r, r, fond, 0, Math.PI * 2, 18); F.plaque(x - r, y - r * .09, x + r, y + r * .09, z + .03, trait); F.disque(x, y, z + .05, r * .36, r * .36, trait, 0, Math.PI * 2, 12); F.disque(x, y, z + .08, r * .2, r * .2, fond, 0, Math.PI * 2, 10); }
function batimentPokemon(F, l, p, teinte) {  // le Centre Pokémon et la Boutique : murs blancs, grandes vitres, toit bombé de couleur vive, fronton à la Poké Ball
  const h = 3.5, d = p / 2, clair = melange(teinte, BLANC, .16), sombre = fonce(teinte, .74), cadre = PAL.cadre, v = PAL.vitre_claire;
  F.tapis(-l / 2 - 1, -d - 1, l / 2 + 1, d + 1.4, null, .74, 3);
  F.boite(0, -1.2, 0, l + .3, 1.6, p + .3, PAL.pierre[1]); F.boite(0, .4, 0, l, h - .4, p, PAL.murs.blanc);
  for (const s of [-1, 1]) { const x0 = s * 1.9, x1 = s * (l / 2 - .5), a = Math.min(x0, x1), b = Math.max(x0, x1);   // les grandes vitres, de chaque côté de la porte
    F.plaque(a, .95, b, 2.95, d + .03, cadre); F.plaque(a + .12, 1.07, b - .12, 2.83, d + .06, v); for (let k = 1; k < 3; k++) { const X = lerp(a, b, k / 3); F.plaque(X - .06, 1.07, X + .06, 2.83, d + .09, cadre); }
    F.plaqueX(-d + .8, .95, d - .8, 2.95, s * (l / 2 + .03), cadre); F.plaqueX(-d + .92, 1.07, d - .92, 2.83, s * (l / 2 + .06), v); }
  F.plaque(-1.3, .4, 1.3, 3.05, d + .03, BLANC); F.plaque(-1.15, .4, 1.15, 2.9, d + .06, v); F.plaque(-.05, .4, .05, 2.9, d + .09, cadre); F.boite(0, 0, d + .7, 3, .4, 1.4, PAL.pierre[2]);   // la porte vitrée et sa marche
  F.boule(0, 2.95, d, 1.55, .85, 1.15, [sombre, teinte, clair], 1, true);                                             // l'auvent rond, au-dessus de la porte
  F.boite(0, h, 0, l + 1, .26, p + 1, PAL.murs.blanc); F.biseau(0, h + .26, 0, l + 1, p + 1, .6, .4, teinte, teinte); F.biseau(0, h + .86, 0, l + .2, p + .2, .45, 1.2, clair, clair);   // le toit bombé
  F.boite(0, h - .05, d + .35, 4.6, 1.3, .5, teinte, {haut: clair}); F.disque(0, h + 1.2, d + .6, 2.3, 1.15, teinte, 0, Math.PI, 14); F.disque(0, h + 1.2, d + .1, 2.3, 1.15, sombre, 0, Math.PI, 14);   // le fronton
  pokeball(F, 0, h + 1.05, d + .63, .92, BLANC, sombre);
}
const OBJETS = {
  arbre(F, o, R) {  // l'arbre de Kanto : trois étages bien ronds, du plus large au plus petit, vert clair, la pointe en haut
    const t = PAL.feuilles; F.ombre(0, 0, 2.5, 2.3);
    F.cyl(0, -.4, 0, .38, .32, 1.6, 5, PAL.tronc[0], PAL.tronc[1]);
    F.dome(0, 2.05, 0, 2.35, 1.4, 2.35, t, 8); F.dome(0, 2.9, 0, 1.8, 1.55, 1.8, t, 7, true); F.dome(0, 4.05, 0, 1.2, 1.75, 1.2, t, 6, true); },
  arbre_loin(F, o, R) { const t = PAL.feuilles; F.cyl(0, -.5, 0, .45, .35, 1.8, 4, PAL.tronc[0]); F.dome(0, 2.6, 0, 3.1, 1.9, 3.1, t, 6); F.dome(0, 3.9, 0, 2.2, 3.2, 2.2, t, 6, true); },
  buisson(F, o, R) { const t = PAL.feuilles; F.ombre(.2, 0, 1.3, 1); F.boule(0, .45, 0, 1, .75, .9, t, 0); F.boule(.7, .35, .2, .65, .55, .6, t, 0); },
  rocher(F, o, R) { F.ombre(.2, 0, 1.4, 1.2); F.caillou(0, .25, 0, 1.1, .8, .95, PAL.pierre, R); if (R() < .5) F.caillou(.9, .1, .4, .5, .4, .5, PAL.pierre, R); },
  herbes(F, o, R) {  // les hautes herbes : des touffes sombres et serrées
    const t = PAL.herbes; for (let k = 0; k < 9; k++) { const a = R() * 6.283, d = Math.sqrt(R()) * 1.7, x = Math.cos(a) * d, z = Math.sin(a) * d;
      F.cyl(x, 0, z, .3, 0, .5 + R() * .25, 4, t[0], t[1]); } },
  fleurs(F, o, R) { const c = o.couleur ? PAL.fleurs[o.couleur] : null; for (let k = 0; k < 5; k++) { const a = R() * 6.283, d = Math.sqrt(R()) * 1, x = Math.cos(a) * d, z = Math.sin(a) * d;
      F.boite(x, 0, z, .22, .3, .22, c || (R() < .6 ? PAL.fleurs.rouge : PAL.fleurs.blanc)); } },
  roseaux(F, o, R) { for (let k = 0; k < 4; k++) { const x = (R() - .5) * 1.4, z = (R() - .5) * .5, h = .55 + R() * .5; F.boite(x, -.4, z, .06, h + .4, .06, PAL.herbes[1]); if (k % 2) F.boite(x, h - .05, z, .11, .26, .11, PAL.tronc[1]); } },
  barriere(F, o) { const L = o.long || 6, n = Math.max(2, Math.round(L / 1.25) + 1), b = PAL.blanc;
    for (let k = 0; k < n; k++) F.boite(-L / 2 + L * k / (n - 1), -.3, 0, .16, 1.15, .16, b, {haut: BLANC});
    F.boite(0, .28, 0, L, .12, .08, b); F.boite(0, .6, 0, L, .12, .08, b); },
  boite_lettres(F) { F.boite(0, -.3, 0, .12, 1.2, .12, PAL.pierre[0]); F.boite(0, .85, 0, .5, .36, .36, PAL.pierre[2], {haut: BLANC}); F.boite(.27, .95, 0, .06, .2, .12, PAL.fleurs.rouge); },
  lampadaire(F) { F.cyl(0, -.3, 0, .13, .08, 3.5, 6, PAL.cadre); F.boite(0, 3.2, 0, .42, .5, .42, PAL.lumiere, {haut: PAL.cadre}); F.boite(0, 3.7, 0, .56, .1, .56, PAL.cadre); },
  panneau(F, o, R, K) { const L = o.large || 3.4, H = 1.05, b = PAL.tronc;
    F.boite(-L / 2 + .25, -.3, 0, .2, 1.9, .2, b[0]); F.boite(L / 2 - .25, -.3, 0, .2, 1.9, .2, b[0]); F.boite(0, .75, .05, L, H, .14, b[1], {devant: PAL.planche});
    K.etiquette(F, o.texte || "", 0, .75 + H / 2, .14, L - .3, H - .2); },
  chemin(F, o) { F.tapis(-(o.large || 1.6) / 2, 0, (o.large || 1.6) / 2, o.long || 6, PAL.chemin, 1, Math.ceil((o.long || 6) / 2)); },
  maison(F, o) {  // la maison de Kanto : large, à étage, murs clairs à lames, grandes fenêtres bleues, grand toit de couleur franche qui déborde
    const l = o.l || 8.4, p = o.p || 6.2, h = o.etage === false ? 3 : 5.2, mur = PAL.murs[o.mur || "creme"], toit = PAL.toits[o.toit || "rouge"], d = p / 2;
    F.tapis(-l / 2 - .8, -d - .8, l / 2 + .8, d + 1, null, .74, 3);
    F.boite(0, -1.2, 0, l + .2, 1.55, p + .2, PAL.pierre[1]); F.boite(0, .35, 0, l, h - .35, p, mur);
    for (let y = .95; y < h - .2; y += .62) F.plaque(-l / 2, y, l / 2, y + .05, d + .015, fonce(mur, .88));   // les lames du mur
    F.toitMaison(0, h, 0, l, p, .7, toit, mur);
    F.plaque(-l * .27 - .72, .35, -l * .27 + .72, 2.55, d + .03, BLANC); F.plaque(-l * .27 - .6, .35, -l * .27 + .6, 2.43, d + .06, o.porte ? PAL.portes[o.porte] : PAL.portes.gris); F.plaque(-l * .27 - .32, 1.55, -l * .27 + .32, 2.15, d + .09, PAL.vitre);
    F.boite(-l * .27, 0, d + .5, 1.9, .35, 1, PAL.pierre[2]);
    fenetre(F, l * .22, 1.1, 2.4, 1.3, d); if (o.etage !== false) { fenetre(F, -l * .24, 3.35, 2.4, 1.3, d); fenetre(F, l * .22, 3.35, 2.4, 1.3, d); }
    for (const sx of [-1, 1]) { F.plaqueX(-.75, 1.1, .75, 2.4, sx * (l / 2 + .03), BLANC); F.plaqueX(-.63, 1.22, .63, 2.28, sx * (l / 2 + .06), PAL.vitre); } },
  labo(F, o, R, K) {  // le laboratoire du Professeur Chen : une haute façade ronde sous un toit en demi-rond brun, une aile basse à côté
    const mur = PAL.murs.pierre, brun = PAL.toits.brun, x = 3.2, d = 4.5, hm = 4;
    F.tapis(-9.8, -5.4, 7.6, 5.8, null, .74, 3);
    // l'aile basse
    F.boite(-4.65, -1.2, 0, 8.9, 1.6, 6.6, PAL.pierre[1]); F.boite(-4.65, .4, 0, 8.7, 2.7, 6.4, mur, {mat: 0}); F.toit(-4.65, 3.1, 0, 8.7, 6.4, 1.9, .5, PAL.toits.paille, mur);
    fenetre(F, -6.7, 1.15, 1.5, 1.4, 3.2); fenetre(F, -3.3, 1.15, 1.5, 1.4, 3.2);
    // le corps rond
    F.boite(x, -1.2, 0, 7.2, 1.6, 9.2, PAL.pierre[1]); F.boite(x, .4, 0, 7, hm - .4, 9, mur, {mat: 0});
    F.disque(x, hm, d, 3.5, 3.5, mur, 0, Math.PI, 16); F.disque(x, hm, -d, 3.5, 3.5, mur, 0, Math.PI, 16);
    F.voute(x, hm, -d - .3, d + .5, 3.8, brun, fonce(brun, .9), 14); F.arche(x, hm, d + .5, 3.4, 3.8, fonce(brun, .74), 14); F.arche(x, hm, -d - .3, 3.4, 3.8, fonce(brun, .74), 14);
    F.boite(x - 3.65, hm - .25, .1, .5, .3, 9.8, fonce(brun, .74)); F.boite(x + 3.65, hm - .25, .1, .5, .3, 9.8, fonce(brun, .74));
    F.disque(x, hm + .2, d + .03, 2, 2, BLANC, 0, Math.PI, 14); F.disque(x, hm + .2, d + .06, 1.8, 1.8, PAL.vitre, 0, Math.PI, 14);                 // la grande fenêtre en éventail
    for (const a of [.5, 1.05, 1.57, 2.09, 2.64]) F.poly([[x - .05 * Math.sin(a), hm + .2 + .05 * Math.cos(a), d + .09], [x + .05 * Math.sin(a), hm + .2 - .05 * Math.cos(a), d + .09], [x + Math.cos(a) * 1.8, hm + .2 + Math.sin(a) * 1.8, d + .09]], BLANC, [0, 0, 1]);
    F.boite(x, hm - .15, d + .35, 4.4, .3, .7, PAL.pierre[2]);                                                                                    // le linteau
    F.plaque(x - 1, .4, x + 1, 3.3, d + .03, BLANC); F.plaque(x - .85, .4, x + .85, 3.15, d + .06, PAL.portes.violet); F.disque(x, 2.1, d + .09, .46, .46, BLANC); F.disque(x, 2.1, d + .12, .34, .34, PAL.vitre);
    F.boite(x, 0, d + .6, 2.6, .4, 1.2, PAL.pierre[2]);
    F.boite(x + 1.9, hm + 2.2, -1.6, .95, 2.4, .95, PAL.pierre[2], {mat: 0}); F.boite(x + 1.9, hm + 4.6, -1.6, 1.2, .25, 1.2, PAL.pierre[0]);        // la cheminée
    F.boite(-.6, -.2, d + 3.4, 2.8, 1.25, .55, PAL.pierre[1], {haut: PAL.pierre[2]}); pokeball(F, -.6, .5, d + 3.7, .36, PAL.pierre[2], PAL.pierre[0]); },   // la pierre gravée, devant
  centre(F) { batimentPokemon(F, 12, 8, PAL.toits.rouge); },
  boutique(F) { batimentPokemon(F, 10, 7, PAL.toits.bleu); },
  eolienne(F, o, R, K) { F.ombre(0, 0, 1.2, 1.2); F.cyl(0, -1, 0, .36, .2, 12, 7, PAL.blanc, BLANC); F.boite(0, 10.8, .2, .7, .7, 1.5, PAL.blanc);
    K.anime(F, 0, 11.15, 1.05, P => { for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), q = (r, t) => [c * r - s * t, s * r + c * t, 0];
      P.poly([q(.2, -.28), q(4.6, -.1), q(4.6, .1), q(.2, .28)], BLANC, [0, 0, 1]); } P.boule(0, 0, 0, .42, .42, .42, [PAL.fleurs.rouge, PAL.fleurs.rouge, PAL.fleurs.rouge], 0); }, 1.6); },
  tronc(F, o, R) {  // un tronc qui flotte en travers : ton Pokémon saute par-dessus
    const b = PAL.tronc; F.boite(0, -.3, 0, .95, .8, 6.5, b[0], {haut: b[1]}); F.boite(.1, .3, 1.6, .28, .5, .28, b[0]); F.boite(-.1, .3, -1.9, .26, .4, .26, b[0]);
    for (const z of [-3.26, 3.26]) F.disque(0, .1, z, .34, .34, PAL.planche, 0, Math.PI * 2, 8); },
  rondins(F, o, R) {  // une ligne de rondins d'une rive à l'autre, au ras de l'eau : ton Pokémon passe dessous
    const b = PAL.tronc, L = (o.eau || 12) + 1.5, n = Math.round(L / 2.2);
    for (let k = 0; k < n; k++) { const z = -L / 2 + L * (k + .5) / n; F.boite(0, -.25, z, .7, .62, L / n - .12, k % 2 ? b[0] : b[1], {haut: PAL.planche}); F.boite(0, .3, z, .16, .5, .16, PAL.fleurs.rouge, {haut: BLANC}); } },
  ligne(F, o) {  // la ligne de départ et d'arrivée : deux mâts, une banderole à damier au-dessus de l'eau
    const d = (o.eau || 12) / 2 + 1.2, c = .7, n = Math.round(d * 2 / c), noir = PAL.cadre;
    for (const z of [-d, d]) { F.cyl(0, -1, z, .3, .24, 8.2, 7, PAL.blanc, BLANC); F.boule(0, 7.3, z, .5, .5, .5, [PAL.fleurs.rouge, PAL.fleurs.rouge, PAL.fleurs.rouge], 0); }
    for (let k = 0; k < n; k++) for (let j = 0; j < 2; j++) { const z0 = -d + 2 * d * k / n, z1 = -d + 2 * d * (k + 1) / n; F.quad([0, 5.2 + j * c, z0], [0, 5.2 + j * c, z1], [0, 5.2 + (j + 1) * c, z1], [0, 5.2 + (j + 1) * c, z0], (k + j) % 2 ? noir : BLANC, [0, 1, 0]); } },
  pokemon(F, o, R, K) { K.sprite(F, String(o.num).padStart(4, "0") + "/" + (o.anim || "Idle"), o); },
  habitant(F, o, R, K) { K.sprite(F, "h/" + o.nom, o); },
};
