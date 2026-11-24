/* ============ les bâtiments d'une ville en pente (moteur/zone.js, 24/11, étape 13) ============ */
// Les mêmes maisons, boutiques et immeubles qu'ailleurs, posés sur un sol qui n'est pas plat : le seuil à la hauteur du sol le plus haut devant la façade,
// un soubassement de pierre qui descend jusqu'au sol le plus bas, et les marches qu'il faut devant la porte.
function solPente(F, o) {   // ce que fait le sol autour du bâtiment, dans son repère : {haut (devant la façade), bas (tout autour)}
  const l = o.l / 2, d = o.p / 2, y = (x, z) => solLocal(F, x, z); let haut = -9, bas = 9;
  for (const u of [-1, -.5, 0, .5, 1]) haut = Math.max(haut, y(u * l, d + .1)); for (const [u, w] of [[-1, 1], [1, 1], [-1, -1], [1, -1], [0, 1], [0, -1], [-1, 0], [1, 0]]) bas = Math.min(bas, y(u * l, w * d)); return {haut, bas}; }
function socleEtMarches(F, o, g, xp, seuil, large) {   // le soubassement, puis le perron : de vraies marches jusqu'au sol, devant la porte (xp)
  const d = o.p / 2, pi = PAL.pierre; if (g.bas - g.haut < -1.1) F.boite(0, g.bas - g.haut - .5, 0, o.l + .2, g.haut - g.bas + .4, o.p + .2, pi[1]);
  if (!large) return; let y = seuil, z = d + 1; for (let k = 0; k < 9; k++) { const s = solLocal(F, xp, z + .16); if (y - s < .2) break; y -= Math.min(.17, y - s); F.boite(xp, s - .4, z + .16, large, y - s + .4, .34, pi[k % 2 ? 1 : 2], {haut: pi[2]}); z += .32; } }
Object.assign(RAYON, {maison_pente: 6, magasin_pente: 6, immeuble_pente: 7, arbre_rue: 2.3});
const TIGES = {arbre: 1.2, roux: 1.2, pommier: 2, cerisier: 1, bouleau: 0, pin: 0, saule: .6};   // ce qu'on ajoute au tronc de chaque essence (m)
Object.assign(OBJETS, {
  /* (24/11, Kiki : « un gros arbre qui avait l'air de flotter, comme s'il n'avait pas de tronc ») un arbre de rue ou de jardin : la même essence qu'ailleurs, sur un tronc plus
     haut, qu'on voit au-dessus d'une haie ou d'une barrière. esp : l'essence, sinon celle du bosquet */
  arbre_rue(F, o, R, K) { const esp = o.esp || especeArbre(F, o) || "arbre", h = TIGES[esp] || 0, t = esp === "cerisier" ? [hex("#5A3A2E"), hex("#6C4838")] : PAL.tronc, x = [F.ox, F.oy, F.oz, F.lacet, F.k];
    if (h) { F.cyl(0, -.4, 0, .36, .3, h + 1.2, 6, t[0], t[1]); F.poser(x[0], x[1] + h * x[4], x[2], x[3], x[4]).matiere(2); } OBJETS[esp](F, Object.assign({}, o, {espece: false}), R, K); },
  maison_pente(F, o, R, K) { const g = solPente(F, o); F.poser(F.ox, F.oy + g.haut * F.k, F.oz, F.lacet, F.k).matiere(2); OBJETS.maison(F, o, R, K); const xp = -o.l * .27; { const s = solLocal(F, xp, o.p / 2 + .9); if (s < -.15) F.boite(xp, s - .3, o.p / 2 + .5, 1.9, -s + .3, 1, PAL.pierre[1]); } socleEtMarches(F, o, {haut: 0, bas: g.bas - g.haut}, xp, .35, 1.9); },
  magasin_pente(F, o, R, K) { const g = solPente(F, o); F.poser(F.ox, F.oy + g.haut * F.k, F.oz, F.lacet, F.k).matiere(2); OBJETS.magasin(F, o, R, K); socleEtMarches(F, o, {haut: 0, bas: g.bas - g.haut}, 0, 0, 0);
    { const xp = o.l * .26 + .6, d = o.p / 2, s = solLocal(F, xp, d + .3); F.boite(xp, s - .2, d + .22, 1.5, Math.max(.16, (.35 - s) * .5 + .2), .42, PAL.pierre[2]); } },
  immeuble_pente(F, o, R, K) { const g = solPente(F, o); F.poser(F.ox, F.oy + g.haut * F.k, F.oz, F.lacet, F.k).matiere(2); OBJETS.immeuble(F, o, R, K); socleEtMarches(F, o, {haut: 0, bas: g.bas - g.haut}, 0, 0, 0); },
});
