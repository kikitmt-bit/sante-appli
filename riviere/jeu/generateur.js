/* ============ le générateur : quelques cases cochées, un bouton, un circuit qui tient debout ============ */
// Il ne dessine rien lui-même : il assemble des MODULES (les mêmes que la palette de l'éditeur), puis fait construire le résultat par le
// vrai code de la piste (SOURCE_PISTE : le même que le jeu) et lit son contrôleur. Un tirage qui se croise ou ne se referme pas est jeté,
// on en tire un autre : ce qui sort est toujours jouable. Parmi ceux qui tiennent debout, il garde LE MIEUX NOTÉ (jeu/note.js : rythme,
// variété, contrastes, repères, moments forts, relief, retour), après avoir habillé ses rives pour que le paysage change souvent (habiller).
// Même graine, mêmes cases : même circuit, sur toutes les machines : la recherche compte ses tirages, jamais le temps (14/11, étape 4 du plan :
// avant, elle s'arrêtait au bout de 12 s, donc plus tôt sur une machine lente). Il tourne aussi sans navigateur : page.py (generateur),
// python riviere/outils/generer.py.
// Ajouter un module = une entrée dans MODULES : {nom, pour (ce qu'il apporte), pieces(R, o) → une liste de pièces}.

/* construire un brouillon avec le vrai code de la piste, sans toucher à la page : {PISTE, verif, erreur} */
function essayerNiveau(niveau) {
  try {
    const f = new Function("NIVEAU", "BIOME", "D", "location", SOURCE_PISTE + (niveau.plan || niveau.zone ? "\n" + SOURCE_PLAN : "") + "\nconst verif_ = verifier(); " + (niveau.plan || niveau.zone ? "verif_.erreurs.push(...planControle()); verif_.ok = !verif_.erreurs.length; " : "") + "return {PISTE, verif: verif_, tour: TOUR_VRAI, boucle: BOUCLE};");
    return f(JSON.parse(JSON.stringify(niveau)), region(BIOMES[niveau.biome] ? niveau.biome : Object.keys(BIOMES)[0]), {}, {search: ""});
  } catch (e) { return {erreur: e && e.message || String(e)}; }
}

/* le sol d'un brouillon, construit par le vrai code du champ : {ok, cassures, pire, absurdes} (jeu/note.js : scannerSol). Plus lent que la piste
   seule (tout le terrain est parcouru) : le générateur ne le demande que pour les tirages qu'il s'apprête à retenir. */
function solNiveau(niveau) {
  try {
    const f = new Function("NIVEAU", "BIOME", "D", "location", "scannerSol", SOURCE_PISTE + "\n" + SOURCE_CHAMP + "\nreturn scannerSol(hauteur, Q, CASES, (a, b) => ecart(sLigne(a), sLigne(b)), MASSIF);");
    return f(JSON.parse(JSON.stringify(niveau)), region(BIOMES[niveau.biome] ? niveau.biome : Object.keys(BIOMES)[0]), {}, {search: ""}, scannerSol);
  } catch (e) { return {ok: false, erreur: e && e.message || String(e)}; }
}

/* les modules : des bouts de circuit tout faits. v = le virage qui lui est demandé (degrés), o = les réglages du tirage (rives du moment…).
   act : l'activité du module ("eau" : le rameur, sur une rivière ; "terre" : vélo et elliptique, routes et chemins). Deux mondes à part (Kiki, 12/11). */
/* (17/11) un rond-point qu'on traverse tout droit : on entre en tournant à droite, on fait un quart de tour à gauche autour de l'île, on ressort à droite.
   Les rayons sont liés (r1 = r / (√2 − 1)) pour que l'île soit pile sur l'axe de la route ; l'objet rond_point dessine l'anneau, l'île et les autres branches. */
function rondPoint(b, R, r = 12) { const r1 = r / (Math.SQRT2 - 1), L1 = Math.round(r1 * Math.PI / 4 * 10) / 10, L2 = Math.round(r * Math.PI / 2 * 10) / 10;
  return [Object.assign({}, b, {nom: "Le rond-point", long: L1, virage: 45, fixe: true}), Object.assign({}, b, {long: L2, virage: -90, fixe: true, objets: [{o: "rond_point", cote: "c", a: L2 / 2, r, ville: b.g === "trottoir", branches: R() < .5 ? 1 : 2}]}), Object.assign({}, b, {long: L1, virage: 45, fixe: true})]; }
const MODULES = {
  droite: {nom: "Ligne droite", act: "eau", pieces: (R, o) => [{long: 70 + Math.round(R() * 50), virage: Math.round((R() - .5) * 16), eau: o.eau, g: o.g, d: o.d}]},
  virage: {nom: "Virage", act: "eau", pieces: (R, o) => [{long: 70 + Math.round(R() * 40), virage: o.v, eau: o.eau, g: o.g, d: o.d}]},
  s: {nom: "Un S", act: "eau", pieces: (R, o) => { const a = 35 + Math.round(R() * 20); return [{long: 55, virage: a, eau: o.eau, g: o.g, d: o.d}, {long: 55, virage: -a + o.v, eau: o.eau, g: o.g, d: o.d}]; }},
  epingle: {nom: "Épingle", act: "eau", pieces: (R, o) => [{nom: "L'épingle", long: 46, virage: Math.sign(o.v || -1) * 150, eau: 8, g: o.g, d: o.d}]},
  lac: {nom: "Lac", act: "eau", pour: "lac", pieces: (R, o) => [{nom: "Le lac", long: 110 + Math.round(R() * 40), virage: o.v, eau: 28 + Math.round(R() * 8), g: "plage", d: "foret", surface: o.terre ? undefined : "lagon", camera: {haut: .8, recul: 1},
    objets: o.terre ? [] : [{o: "pokemon", num: 131, cote: "c", a: 60, e: 8, haut: -.9, bouge: {type: "nage", long: 44, vitesse: 1.3}}]}]},
  foret: {nom: "Sous-bois", act: "eau", pour: "foret", pieces: (R, o) => [{nom: "Le sous-bois", long: 100 + Math.round(R() * 50), virage: o.v, eau: 9, g: "foret", d: "foret", ambiance: "sous-bois"}]},
  marais: {nom: "Marais", act: "eau", pour: "marais", pieces: (R, o) => [{nom: "Le marais", long: 110 + Math.round(R() * 40), virage: o.v, eau: 13, g: "marais", d: "marais", surface: o.terre ? undefined : "marais", ambiance: "marais",
    objets: o.terre ? [] : [{o: "nenuphars", cote: "c", a: 24, e: -4.6}, {o: "nenuphars", cote: "c", a: 62, e: 4.7}, {o: "pokemon", num: 60, cote: "c", a: 62, e: 4.9, haut: .05}]}]},
  plage: {nom: "Plage", act: "eau", pour: "plage", pieces: (R, o) => [{nom: "La plage", long: 110 + Math.round(R() * 40), virage: o.v, eau: 16, g: "dune", d: "mer", ambiance: "plage"}]},
  grotte: {nom: "Grotte", act: "eau", pour: "grotte", pieces: (R, o) => { const style = o.grotte || ["cristal", "calcaire", "terre", "roche"][Math.floor(R() * 4)], rive = style === "calcaire" ? "calcaire" : "montagne";
    return [{nom: {cristal: "Grotte de cristal", calcaire: "Grotte aux stalactites", terre: "La galerie", roche: "La grotte", glace: "Grotte de glace"}[style] || "La grotte", long: 100 + Math.round(R() * 30), virage: clamp(o.v, -80, 80), eau: 9, g: rive, d: rive, tunnel: style, surface: style === "cristal" && !o.terre ? "source" : undefined, fixe: true}]; }},
  cascade: {nom: "Falaise et cascade", act: "eau", pour: "cascade", pieces: (R, o) => [{nom: "La grande cascade", long: 90, virage: o.v, eau: 10, g: "falaise", d: "foret", objets: [{o: "cascade", cote: "g", a: 45, e: 2, large: 6 + Math.round(R() * 2)}]}]},
  cote: {nom: "Côte", act: "eau", pour: "relief", pieces: (R, o) => [{nom: "La côte", long: 80 + Math.round(R() * 30), virage: o.v, eau: 9, g: "foret", d: "pre", monte: 3 + Math.round(R() * 3), segment: "La côte"}]},
  chute: {nom: "Cascade à remonter", act: "eau", pour: "relief", pieces: (R, o) => [{nom: "La Cascade", long: 10, virage: 0, eau: 8, g: "montagne", d: "pre", monte: 4.5, net: true}, {long: 50, virage: o.v, eau: 9, g: "foret", d: "pre"}]},
  rapides: {nom: "Rapides", act: "eau", pour: "relief", pieces: (R, o) => [{nom: "Les rapides", long: 45, virage: o.v / 2 - 25, eau: 8, g: "foret", d: "montagne", monte: -1.5, allure: 1.3}, {long: 45, virage: o.v / 2 + 25, eau: 8, g: "montagne", d: "foret", monte: -1.5, allure: 1.3}]},
  saut: {nom: "Grand saut", act: "eau", pour: "relief", pieces: (R, o) => [{nom: "Le grand saut", long: 5, virage: 0, eau: 8, g: "montagne", d: "montagne", monte: .8, net: true}, {long: 3, virage: 0, eau: 8, g: "montagne", d: "montagne", monte: -3.8, net: true}, {long: 50, virage: o.v, eau: 10, g: "pre", d: "foret"}]},
  pont: {nom: "Pont sur un ravin", act: "eau", pour: "pont", pieces: (R, o) => [{nom: "Le pont", long: 18, virage: 0, eau: 9, g: "pre", d: "pre"}, {long: 70 + Math.round(R() * 20), virage: clamp(o.v, -25, 25), eau: 9, g: "pre", d: "pre", pont: ["arches", "bois", true][Math.floor(R() * 3)], ravin: 8 + Math.round(R() * 4), segment: "Sprint du pont", camera: {haut: .5}}, {long: 18, virage: 0, eau: 9, g: "pre", d: "pre"}]},
  village: {nom: "Village", act: "eau", pour: "village", pieces: (R, o) => { const lieux = Object.keys(LIEUX_TOUS[o.lieux] || {}).filter(k => k !== "note"), lieu = lieux[Math.floor(R() * lieux.length)]; if (!lieu) return MODULES.droite.pieces(R, o);
    const L = LIEUX_TOUS[o.lieux][lieu].long; return [{nom: lieu.replace(/-/g, " ").replace(/^./, c => c.toUpperCase()), long: L + 40, virage: clamp(o.v, -20, 20), eau: 13, g: "bourg", d: "pre", lieux: [{lieu, cote: "g", a: 20}], fixe: true}]; }},
  port: {nom: "Port", act: "eau", pour: "port", pieces: (R, o) => {   // (17/11, Kiki : « le même port qu'au tout début, mêmes bateaux ») : chaque port tiré au hasard
    const L = 110 + Math.round(R() * 50), ob = [], g = (nom, a, e, plus) => ob.push(Object.assign({o: nom, cote: "g", a: Math.round(a), e}, plus));
    for (let a = 12 + R() * 6; a < L - 8; a += 32 + R() * 14) g("lampadaire", a, 1.6);
    for (let a = 18 + R() * 10; a < L - 24; a += 12 + R() * 13) { const t = R(); if (t < .18) g("ponton", a, -3.6, {flotte: true, tourne: 90, long: 5 + Math.round(R() * 4)}); else g("bateau", a, -1.55 - R() * .3, {flotte: true, voile: t > .62}); }
    for (let a = 20 + R() * 12; a < L - 14; a += 22 + R() * 16) { const t = R(); if (t < .3) g("entrepot", a, 14 + Math.round(R() * 3)); else if (t < .85) g("immeuble", a, 16 + Math.round(R() * 4)); else g("magasin", a, 9, {varie: true}); }
    for (let k = 1 + Math.floor(R() * 3); k > 0; k--) g("caisses", 20 + R() * (L - 40), 3.4 + R() * 1.4);
    if (R() < .6) g("phare", L - 8, 7);
    ob.push({o: "pokemon", num: [129, 72, 98, 118][Math.floor(R() * 4)], cote: "c", a: Math.round(30 + R() * (L - 60)), e: 5.5, bouge: {type: "saut", tous: 5, haut: 2.3}});
    return [{nom: ["Le port", "Le vieux port", "La marina", "Le port de pêche"][Math.floor(R() * 4)], long: L, virage: clamp(o.v, -15, 15), eau: 15 + Math.round(R() * 4), g: "quai", d: "pre", fixe: true, objets: ob}]; }},
  ronflex: {nom: "Ronflex sur la rivière", act: "eau", pour: "ronflex", pieces: (R, o) => [{nom: "La sieste de Ronflex", long: 110 + Math.round(R() * 30), virage: clamp(o.v, -20, 20), eau: 12, g: o.g, d: o.d,
    objets: [{o: "ronflex", cote: "c", a: 80, haut: -.35}]}]},   // étape 6 : forcer pour le réveiller (jeu/rencontres.js)
  // ---- la terre : routes, rues, chemins (des rives posées au niveau de la route : kanto-routes) ----
  route: {nom: "Route", act: "terre", pieces: (R, o) => [{long: 80 + Math.round(R() * 50), virage: o.v, large: 8, g: o.g, d: o.d}]},
  virage_t: {nom: "Virage", act: "terre", pieces: (R, o) => [{long: 70 + Math.round(R() * 40), virage: o.v, large: 8, g: o.g, d: o.d}]},
  s_t: {nom: "Un S", act: "terre", pieces: (R, o) => { const a = 35 + Math.round(R() * 25); return [{long: 55, virage: a, large: 8, g: o.g, d: o.d}, {long: 55, virage: -a + o.v, large: 8, g: o.g, d: o.d}]; }},
  lacet: {nom: "Épingle", act: "terre", pieces: (R, o) => [{nom: "L'épingle", long: 46, virage: Math.sign(o.v || -1) * 160, large: 7, g: o.g, d: o.d}]},
  village_t: {nom: "Rue de village", pour: "village", act: "terre", pieces: (R, o) => {   // (17/11, Kiki : « ressentir la ville ») un carrefour, souvent un rond-point en ville, une rue qui part
    const nom = ["Bourg Palette", "Jadielle", "Argenta", "Lavanville", "Carmin sur Mer", "Parmanie"][Math.floor(R() * 6)], ville = R() < .5, b = {large: 9, g: "trottoir", d: "trottoir"}, cote = R() < .5 ? "g" : "d";
    if (!ville) b.surface = "paves";
    const A = Object.assign({nom: (/^[AEIOUÉ]/.test(nom) ? "Rue d'" : "Rue de ") + nom, long: 84 + Math.round(R() * 26), virage: clamp(Math.round(o.v / 3), -12, 12),
      objets: [{o: "panneau", cote: "d", a: 10, e: 2.6, texte: nom.toUpperCase(), face: "arrivant", large: 3.6}, {o: "carrefour", cote: "c", a: 52 + Math.round(R() * 10), cotes: ["gd", "gd", "g", "d"][Math.floor(R() * 4)]}].concat(R() < .6 ? [{o: "centre", cote, a: 22, e: 9}] : [])}, b);
    const fin = Object.assign({long: 70 + Math.round(R() * 30), virage: clamp(Math.round(o.v * 2 / 3), -20, 20), objets: [{o: "rue", cote: cote === "g" ? "d" : "g", a: 26, e: .4}]}, b);
    return [A].concat(ville && R() < .7 ? rondPoint(b, R) : [], [fin]); }},
  sousbois_t: {nom: "Sous-bois", pour: "foret", act: "terre", pieces: (R, o) => {   // (17/11, Kiki) on quitte la route pour le chemin en tournant : la route continue tout droit (JONCTIONS de decor.js)
    const c = R() < .5 ? -1 : 1, b = {large: 5, g: "sous_bois", d: "sous_bois", surface: "terre", ambiance: "sous-bois"};
    return [Object.assign({nom: "Le chemin du bois", long: 34, virage: c * 40}, b), Object.assign({nom: "Le sous-bois", long: 100 + Math.round(R() * 50), virage: o.v, objets: R() < .6 ? [{o: "mare", cote: R() < .5 ? "g" : "d", a: 50, e: 11}] : []}, b),
      Object.assign({nom: "La sortie du bois", long: 34, virage: -c * 40}, b)]; }},
  champs_t: {nom: "Les champs", pour: "champs", act: "terre", pieces: (R, o) => [{nom: "Les champs", long: 130 + Math.round(R() * 50), virage: o.v, large: 8, g: "champ", d: R() < .5 ? "champ" : "bas_cote"}]},
  col_t: {nom: "Col de montagne", pour: "montagne", act: "terre", pieces: (R, o) => { const sg = Math.sign(o.v || -1), mont = sg < 0 ? "g" : "d";   // la montagne du côté où l'on tourne, le ravin de l'autre ; après l'épingle, ils changent de côté
    const cote = (m, a, b) => m === "g" ? {g: a, d: b} : {g: b, d: a};
    if (o.ouvert) return [Object.assign({nom: "La montée du col", long: 160 + Math.round(R() * 40), virage: Math.round(o.v / 2), large: 7, monte: 11, segment: "Le col"}, cote(mont, "talus", "ravin")),   // de A à B : la montée sans épingle (elle ferait revenir la route sur elle-même)
      Object.assign({long: 150 + Math.round(R() * 40), virage: Math.round(o.v / 2), large: 7, monte: 10, segment: "Le col"}, cote(mont === "g" ? "d" : "g", "talus", "ravin"))];
    return [Object.assign({nom: "La montée du col", long: 150 + Math.round(R() * 40), virage: Math.round(o.v / 2), large: 7, monte: 10, segment: "Le col"}, cote(mont, "talus", "ravin")),
      Object.assign({nom: "Le lacet", long: 52, virage: -sg * 160, large: 7, monte: 3.5, segment: "Le col"}, cote(mont, "talus", "ravin")),
      Object.assign({long: 140 + Math.round(R() * 40), virage: Math.round(o.v / 2), large: 7, monte: 9, segment: "Le col"}, cote(mont === "g" ? "d" : "g", "talus", "ravin"))]; }},
  descente_t: {nom: "Descente", pour: "montagne", act: "terre", pieces: (R, o) => [{nom: "La descente", long: 180 + Math.round(R() * 60), virage: o.v, large: 7, g: o.v < 0 ? "talus" : "ravin", d: o.v < 0 ? "ravin" : "talus", monte: -14}]},
  tunnel_t: {nom: "Tunnel", pour: "tunnel", act: "terre", pieces: (R, o) => [{nom: "Le tunnel", long: 110 + Math.round(R() * 20), virage: clamp(o.v, -50, 50), large: 7, g: "montagne", d: "montagne", tunnel: true, fixe: true}]},
  pont_t: {nom: "Pont sur un ravin", pour: "pont", act: "terre", pieces: (R, o) => [{nom: "Le pont", long: 18, virage: 0, large: 8, g: "bas_cote", d: "bas_cote"}, {long: 70 + Math.round(R() * 20), virage: clamp(o.v, -25, 25), large: 8, g: "bas_cote", d: "bas_cote", pont: ["arches", "bois", true][Math.floor(R() * 3)], ravin: 9 + Math.round(R() * 4), segment: "Le pont"}, {long: 18, virage: 0, large: 8, g: "bas_cote", d: "bas_cote"}]},
  rondpoint_t: {nom: "Rond-point", pour: "rondpoint", act: "terre", pieces: (R, o) => { const b = {large: 8, g: o.g, d: o.d}; return [Object.assign({long: 40, virage: 0}, b), ...rondPoint(b, R), Object.assign({nom: "La route", long: 40, virage: o.v}, b)]; }},
  echangeur_t: {nom: "Échangeur", pour: "echangeur", act: "terre", pieces: (R, o) => {   // (17/11, Kiki : « de la verticalité ») une boucle qui monte et repasse au-dessus de sa propre route, sur un pont
    const c = R() < .5 ? -1 : 1, r = 26, b = {large: 8, g: "bas_cote", d: "bas_cote", fixe: true}, h = 7 + Math.round(R() * 2);
    return [Object.assign({nom: "L'échangeur", long: 64, virage: 0, segment: "L'échangeur"}, b), Object.assign({long: Math.round(1.5 * Math.PI * r), virage: c * 270, monte: h, segment: "L'échangeur"}, b),
      Object.assign({long: 12, virage: 0, monte: .3}, b), Object.assign({nom: "Le pont de l'échangeur", long: 28, virage: 0, pont: R() < .5 ? true : "arches"}, b), Object.assign({nom: "La descente", long: Math.round((h + .3) / .08), virage: 0, monte: -h - .3}, b)]; }},
  ronflex_t: {nom: "Ronflex sur la route", pour: "ronflex", act: "terre", pieces: (R, o) => [{nom: "La sieste de Ronflex", long: 120 + Math.round(R() * 30), virage: clamp(o.v, -20, 20), large: 8, g: o.g, d: o.d,
    objets: [{o: "ronflex", cote: "c", a: 85}]}]},
  fourche: {nom: "Fourche autour d'une île", act: "eau", pour: "fourche", pieces: (R, o) => {   // (étape 7 du plan) la rivière se sépare : le bras tranquille, ou les rapides et leur chute si on force ; mêmes longueurs, virages inverses
    const A = 32 + Math.round(R() * 8), L = 30, S = 40 + Math.round(R() * 30), c = R() < .5 ? -1 : 1, h = 2.5 + Math.round(R() * 2) / 2, w = 9;
    const voie = (cote, g, d, milieu) => [{long: L, virage: cote * A, eau: w, g, d}, {long: L, virage: -cote * A, eau: w, g, d}, ...milieu, {long: L, virage: -cote * A, eau: w, g, d}, {long: L, virage: cote * A, eau: w, g, d}];
    const cg = c < 0 ? o.g : "pre", cd = c < 0 ? "pre" : o.d, fg = c < 0 ? "pre" : "montagne", fd = c < 0 ? "montagne" : "pre";   // l'île au milieu : des prés ; la voie des rapides longe une paroi
    const calme = voie(c, cg, cd, [{long: S, virage: 0, eau: w, g: cg, d: cd, monte: -h}]); calme[0].nom = "Le bras tranquille";
    const force = voie(-c, c < 0 ? "pre" : o.g, c < 0 ? o.d : "pre", [{long: S - 20, virage: 0, eau: 7, g: fg, d: fd, monte: -.6, allure: 1.3}, {nom: "Le tremplin", long: 5, virage: 0, eau: 7, g: fg, d: fd, monte: .7, net: true},
      {long: 3, virage: 0, eau: 7, g: fg, d: fd, monte: -h - .1, net: true}, {nom: "Le bassin", long: 12, virage: 0, eau: 8, g: fg, d: fd}]); force[0].nom = "Les rapides";
    return [{fourche: "L'île aux rapides", annonce: "LES RAPIDES", calme, force, nom: "L'île aux rapides", long: 4 * L + S, virage: 0, eau: 12, g: o.g, d: o.d, monte: -h, fixe: true}]; }},
  fourche_t: {nom: "Fourche : la route ou le chemin", act: "terre", pour: "fourche", pieces: (R, o) => {   // la route se sépare : la route, ou un chemin de terre à bosses si on force
    const A = 30 + Math.round(R() * 8), L = 30, S = 54 + Math.round(R() * 30), c = R() < .5 ? -1 : 1;
    const voie = (cote, b, milieu) => [Object.assign({long: L, virage: cote * A}, b), Object.assign({long: L, virage: -cote * A}, b), ...milieu, Object.assign({long: L, virage: -cote * A}, b), Object.assign({long: L, virage: cote * A}, b)];
    const bc = {large: 7, g: c < 0 ? o.g : "champ", d: c < 0 ? "champ" : o.d}, bf = {large: 5, surface: "terre", g: c < 0 ? "champ" : "sous_bois", d: c < 0 ? "sous_bois" : "champ"}, bosse = nom => [Object.assign({long: 5, virage: 0, monte: .6, net: true}, bf, nom ? {nom} : null), Object.assign({long: 4, virage: 0, monte: -.6, net: true}, bf)];
    const calme = voie(c, bc, [Object.assign({long: S, virage: 0}, bc)]); calme[0].nom = "La route";
    const force = voie(-c, bf, [Object.assign({long: S - 34, virage: 0}, bf), ...bosse("Les bosses"), Object.assign({long: 16, virage: 0}, bf), ...bosse()]); force[0].nom = "Le chemin des bosses";
    return [{fourche: "Le chemin des bosses", annonce: "LE CHEMIN DES BOSSES", calme, force, nom: "La fourche", long: 4 * L + S, virage: 0, large: 8, g: o.g, d: o.d, fixe: true}]; }},
  cendres_t: {nom: "Col des cendres", pour: "volcan", act: "terre", pieces: (R, o) => [{nom: "Le col des cendres", long: 130 + Math.round(R() * 40), virage: o.v, large: 7, g: o.v < 0 ? "cendres" : "ravin", d: o.v < 0 ? "ravin" : "cendres", ambiance: "volcan"}]},
  // (18/11, Kiki : « à pied, ça pourrait être des parcours totalement différents : le trottoir, un petit chemin, la forêt, un escalier ») le footing du
  // marcheur elliptique, au trot (o.style = "pied") : des passages qu'aucune voiture ne prend. Ils se suivent par quartiers (listeFooting), jamais au hasard.
  rue_p: {nom: "Le trottoir d'une rue", pour: "village", act: "pied", pieces: (R, o) => [{nom: ["La rue des Lilas", "La rue du Marché", "L'avenue des Tilleuls", "La rue de la Gare", "La rue des Écoles", "La rue des Peupliers"][Math.floor(R() * 6)], long: 115 + Math.round(R() * 45), virage: clamp(o.v, -60, 60), large: 2.6, g: "rue", d: "facades", surface: "trottoir", objets: [{o: "rue_continue", cote: "g", a: 0, e: 0, sens: -1, long: 30}, {o: "rue_continue", cote: "g", a: 115, e: 0, long: 40, fin: true}]}].map(q => { q.objets[1].a = q.long; return q; })},   // (18/11, 2e version) le trottoir d'une vraie rue : la chaussée et le trottoir d'en face sont la bande de la rive « rue » ; la rue continue au-delà de ses deux bouts
  ruelle_p: {nom: "Une ruelle", pour: "village", act: "pied", pieces: (R, o) => [{nom: "Le passage", long: 50 + Math.round(R() * 25), virage: clamp(o.v, -50, 50), large: 2.2, g: "venelle", d: "venelle", surface: "paves"}]},
  place_p: {nom: "Une place", pour: "village", act: "pied", pieces: (R, o) => [{nom: "La place", long: 44, virage: clamp(o.v, -12, 12), large: 12, g: "place", d: "place", surface: "paves", objets: [{o: "fontaine", cote: R() < .5 ? "g" : "d", a: 22, e: 2.8}]}]},
  escalier_p: {nom: "Un escalier", pour: "escalier", act: "pied", pieces: (R, o) => { const m = R() < .7 ? 5.5 : -5.5, b = {virage: 0, large: 3, g: "escalier", d: "escalier", fixe: true};
    return [Object.assign({long: 12, surface: "paves"}, b), Object.assign({nom: m > 0 ? "L'escalier" : "Les marches", long: 22, surface: "marches", monte: m, segment: "L'escalier"}, b), Object.assign({long: 10, surface: "paves"}, b)]; }},
  parc_p: {nom: "Un parc", pour: "parc", act: "pied", pieces: (R, o) => [{nom: "Le parc", long: 100 + Math.round(R() * 40), virage: o.v, large: 3, g: "parc", d: "parc", surface: "terre"}]},
  sentier_p: {nom: "Un sentier en forêt", pour: "foret", act: "pied", pieces: (R, o) => [{nom: "Le sentier", long: 90 + Math.round(R() * 40), virage: o.v, large: 2.2, g: "sous_bois", d: "sous_bois", surface: "terre", ambiance: "sous-bois"}]},
  chemin_p: {nom: "Un chemin entre les champs", pour: "champs", act: "pied", pieces: (R, o) => [{nom: "Le chemin des champs", long: 110 + Math.round(R() * 40), virage: o.v, large: 2.6, g: "champ", d: "champ", surface: "terre"}]},
  bordroute_p: {nom: "Le long d'une petite route", pour: "champs", act: "pied", pieces: (R, o) => [{nom: "Le long de la petite route", long: 120 + Math.round(R() * 40), virage: clamp(o.v, -40, 40), large: 2, g: "champ", d: "campagne", surface: "terre"}]},
  passerelle_p: {nom: "Une passerelle", pour: "pont", act: "pied", pieces: (R, o) => { const b = {virage: 0, large: 2.6, g: "bas_cote", d: "bas_cote", surface: "terre", fixe: true};
    return [Object.assign({long: 16}, b), Object.assign({nom: "La passerelle", long: 34, pont: R() < .6 ? "bois" : true, ravin: 6}, b), Object.assign({long: 16}, b)]; }},
};

/* un circuit : o = {km, virages, denivele (m), avec: {grotte, cascade, pont, lac, village, port, marais, plage, foret}, heure, meteo, graine, boucle, biome, terre}
   virages : "droit", "quelques", "sinueux", "tres" (des S serrés et des épingles) ; denivele : les mètres de montée sur le parcours (0 à 80).
   (relief : l'ancien réglage, toujours compris : plat = 0 m, vallonné = 15 m, montagneux = 40 m) */
const SINUEUX = {   // par réglage : les bouts ajoutés pour faire la longueur (sur l'eau, sur la terre), l'ampleur des virages (degrés), la chance qu'un virage reparte de l'autre côté
  droit: {bouts: ["droite", "droite", "virage", "foret"], terre: ["route", "route", "virage_t", "champs_t"], ampleur: 10, change: .5},
  quelques: {bouts: ["virage", "virage", "s", "droite", "foret"], terre: ["virage_t", "virage_t", "s_t", "route", "virage_t"], ampleur: 40, change: .65},
  sinueux: {bouts: ["virage", "s", "s", "virage", "foret"], terre: ["virage_t", "s_t", "s_t", "virage_t", "route"], ampleur: 75, change: .8},
  tres: {bouts: ["s", "s", "virage", "epingle", "s", "virage"], terre: ["s_t", "s_t", "virage_t", "lacet", "s_t", "virage_t"], ampleur: 110, change: .85}};
/* les habits des rives d'un bout ordinaire (ligne droite, virage, S, épingle, et le retour) : [gauche, droite] */
const HABITS = {eau: [["pre", "pre"], ["foret", "pre"], ["pre", "foret"], ["foret", "foret"], ["falaise", "pre"], ["falaise", "foret"], ["falaise", "falaise"], ["dune", "pre"], ["plage", "foret"]],
  terre: [["bas_cote", "bas_cote"], ["champ", "bas_cote"], ["bas_cote", "champ"], ["champ", "champ"], ["sous_bois", "bas_cote"], ["bas_cote", "sous_bois"], ["sous_bois", "sous_bois"]]};
const BOUTS_LIBRES = ["droite", "virage", "s", "epingle", "route", "virage_t", "s_t", "lacet"];
/* habiller un tirage qui tient debout : les rives de ses bouts ordinaires sont rechoisies une à une pour que la note monte (le paysage change
   plus souvent, plus franchement). Les rives ne changent pas le tracé : rien à reconstruire, on renote seulement. Deux passes, dans l'ordre
   des pièces : aucun hasard, donc le même résultat partout. Rend la note finale. */
function habiller(niveau, r, biome, terre, existe, sansParoi) {
  const P = r.PISTE, src = niveau.pieces, B = region(biome), noter = () => noterCircuit(P, niveau, B, r.tour), dernier = src.length - 1;
  const haute = n => n === "falaise", habits = (terre ? HABITS.terre : HABITS.eau).filter(h => existe(h[0]) && existe(h[1]) && !(sansParoi && (haute(h[0]) || haute(h[1]))));
  const mettre = (i, g, d) => { src[i].g = g; src[i].d = d; const cibles = P.pieces.filter(q => q._i === i); for (const q of cibles) { q.g = g; q.d = d; } };   // (_i : la pièce du fichier dont vient chaque pièce construite)
  const serre = p => p.virage && typeof p.virage === "number" && Math.abs(p.virage) / p.long > 1.3;   // pas de falaise dans un virage très serré
  if (sansParoi) src.forEach((p, i) => { if ((p.libre || p.raccord) && (haute(p.g) || haute(p.d))) mettre(i, haute(p.g) ? "pre" : p.g, haute(p.d) ? "pre" : p.d); });   // on repart sans les falaises
  let note = noter();
  for (let passe = 0; passe < 2; passe++) {
    let mieux = false;
    src.forEach((p, i) => {
      if (!p.libre && !p.raccord) return;
      const avant = [p.g, p.d]; let garde = avant, n0 = note.note;
      for (const h of habits) {
        if (h[0] === avant[0] && h[1] === avant[1] || serre(p) && (haute(h[0]) || haute(h[1]))) continue;
        mettre(i, h[0], h[1]); const n = noter();
        if (n.note > n0) { n0 = n.note; garde = h; note = n; mieux = true; }
      }
      mettre(i, garde[0], garde[1]);
    });
    if (!mieux) break;
  }
  return noter();
}
/* déplier le retour : le raccord d'une boucle (un virage, une ligne droite, un virage) fait souvent 300 à 500 m d'un seul paysage. Son premier
   virage et sa ligne droite deviennent de vraies pièces d'une centaine de mètres, que habiller() peut varier ; un petit raccord referme la
   boucle au bout (les 50 derniers mètres et le dernier virage). Le tracé ne change pas. Si le moteur n'en veut pas : on garde l'ancien. */
function deplierRetour(niveau, r) {   // (18/11 : ses pièces gardent le revêtement du retour : celui d'un footing reste sur le trottoir)
  const P = niveau.pieces, i0 = P.length - 1, modele = P[i0], bouts = r.PISTE.pieces.filter(q => q._i === i0), neufs = [];
  if (!modele.raccord || r.PISTE.N - bouts[0].s0 < 170) return r;
  const piece = (long, virage) => { const q = {long, virage, g: modele.g, d: modele.d, libre: true}; if (modele.surface) q.surface = modele.surface; if (modele.large !== undefined) q.large = modele.large; else q.eau = modele.eau; if (modele.monte === "auto") q.monte = "auto"; return q; };
  for (const b of bouts) {
    if (!b.droit) { if (b.long >= 12) neufs.push(piece(b.long, +b.virage.toFixed(3))); continue; }
    const reste = b.long - 50, n = Math.max(1, Math.round(reste / 105));
    // (17/11, Kiki : « jamais d'énormes lignes droites, ça se voit que c'est fait parce que c'est pratique ») : la ligne droite du retour devient
    // des S doux qui s'annulent (le cap revient au même) ; le petit raccord du bout rattrape l'écart de côté
    if (reste >= 60) for (let k = 0; k < n; k++) neufs.push(piece(Math.round(reste / n), n > 1 ? (k % 2 ? -1 : 1) * (n % 2 && k === n - 1 ? 0 : 16) : 0));
    break;
  }
  if (!neufs.some(q => Math.abs(q.virage) <= 16 && q.long >= 60)) return r;
  neufs[0].nom = modele.nom || "Le retour";
  const ancien = modele.nom; modele.nom = "Le dernier virage";
  P.splice(i0, 0, ...neufs);
  const r2 = essayerNiveau(niveau);
  if (!r2.erreur && r2.verif.ok && r2.verif.fermeture < 3) return r2;
  P.splice(i0, neufs.length); modele.nom = ancien;
  return r;
}
/* onduler (17/11) : un bout libre de plus de 140 m presque droit (moins de 12°) devient deux virages doux et opposés, de même cap à la sortie :
   plus de longues lignes droites tirées à la règle (sauf « presque droit », et jamais les deux lignes du carrefour d'un 8) */
function onduler(pieces, R, garder) {
  for (let i = pieces.length - 1; i >= 0; i--) { const p = pieces[i];
    if (!p.libre || garder(p) || typeof p.virage !== "number" || Math.abs(p.virage) >= 12 || p.long <= 140 || p.raccord) continue;
    const a = Math.round(14 + R() * 10) * (R() < .5 ? -1 : 1), q = Object.assign({}, p, {long: Math.round(p.long / 2), virage: Math.round(p.virage / 2 + a)});
    p.long -= q.long; p.virage = Math.round(p.virage / 2 - a); delete q.nom; delete q.objets; delete q.segment;
    if (p.monte !== undefined && typeof p.monte === "number") { q.monte = Math.round(p.monte / 2 * 10) / 10; p.monte = Math.round((p.monte - q.monte) * 10) / 10; }
    pieces.splice(i + 1, 0, q); }
}
/* (18/11) le footing : des quartiers qui se suivent comme une vraie sortie (la ville, un escalier, le parc, la forêt, les champs, une passerelle, la
   ville) ; chaque quartier s'allonge d'un bout de plus tant que la longueur n'y est pas. Seuls les quartiers cochés ; jamais rien que de la ville. */
function listeFooting(R, o, cible) {
  const A = o.avec || {}, ville = A.village !== false, est = {rue_p: 137, ruelle_p: 85, place_p: 40, escalier_p: 44, parc_p: 120, sentier_p: 110, chemin_p: 130, bordroute_p: 140, passerelle_p: 66}, Z = [];
  if (ville) Z.push({m: ["rue_p"].concat(R() < .6 ? ["place_p"] : [], ["ruelle_p"]), rep: "rue_p"});
  if (A.escalier) Z.push({m: ["escalier_p"]});
  if (A.parc) Z.push({m: ["parc_p"], rep: "parc_p"});
  if (A.foret) Z.push({m: ["sentier_p"], rep: "sentier_p"});
  if (A.champs) Z.push({m: ["chemin_p"].concat(R() < .7 ? ["bordroute_p"] : []), rep: "chemin_p"});
  if (!Z.some(z => ["parc_p", "sentier_p", "chemin_p"].includes(z.rep))) Z.push({m: ["parc_p"], rep: "parc_p"});
  if (A.pont) Z.push({m: ["passerelle_p"]});
  if (ville) Z.push({m: ["rue_p"], rep: "rue_p"});
  const reps = [].concat(...Z.filter(z => z.rep).map(z => Array(z.rep === "sentier_p" ? 3 : z.rep === "rue_p" ? 1 : 2).fill(z))), total = () => Z.reduce((t, z) => t + z.m.reduce((u, n) => u + est[n], 0), 0);   // (la nature s'allonge plus que la ville)
  for (let k = 0; k < 60 && total() < cible * .92; k++) { const z = reps[Math.floor(R() * reps.length)]; z.m.push(z.rep); }
  return [].concat(...Z.map(z => z.m));
}
const REGION_TERRE = b => BIOMES[b + "-routes"] ? b + "-routes" : Object.keys(BIOMES).find(k => /routes/.test(k)) || b;   // la région des routes qui va avec une région
function circuitVille(o) {   // (étape 13, lot 3) une ville libre (villes.js) : ni note ni habillage, elle est contrôlée (zoneControle) ou jetée
  let bon = null; const r = genererVille(o, n => { const e = essayerNiveau(n); bon = e; return e.erreur ? [e.erreur] : e.verif.erreurs; }); if (r.erreur || r.suite) return r;
  return {niveau: r.niveau, note: noterCircuit(bon.PISTE, r.niveau, region(r.niveau.biome), bon.tour), long: bon.PISTE.N, retour: 0, essais: r.essais, lourds: r.lourds, raisons: r.raisons, bons: 1};
}
function genererCircuit(o) {
  if (o.activite === "eau" && ["ile", "lac", "retour", "surprise"].includes(o.style)) return circuitVille(Object.assign({}, o, {iles: true, denivele: 0, forme2: o.style === "surprise" ? ["ile", "lac", "retour"][((o.graine || 1) * 7919 >>> 4) % 3] : o.style}));   // (étape 15, lot 3b-1) au rameur, le tour d'une île (iles.js)
  if (o.activite === "terre" && (o.style === "pied" || o.style === "velo" || o.style === "quais") && typeof genererVille === "function") return circuitVille(o.style === "pied" ? o : Object.assign({}, o, {velo: true}, o.style === "quais" ? {quais: true} : {}));   // (24/11) à pied : une ville dessinée d'abord (villes.js), plus des modules bout à bout
  const terre = o.activite === "terre", pied = terre && o.style === "pied", huit = terre && !pied && o.forme === "huit";   // pied : le footing (listeFooting)
  if (huit) o = Object.assign({}, o, {boucle: true});
  if (o.forme === "ouvert") o = Object.assign({}, o, {boucle: false});   // (la forme suffit : « De A à B » = pas une boucle)
  const biome0 = (o.biome || "kanto").replace(/-routes$/, ""), biome = terre ? REGION_TERRE(biome0) : biome0, lieux = BIOMES[biome] && BIOMES[biome].lieux || biome0, sens = -1;
  const rives = Object.keys(region(biome).rives), a = n => rives.includes(n);
  // la recherche : au plus MAX tirages ; elle s'arrête quand VOULUS tirages tiennent debout, et garde le mieux noté (o.tirages, o.essais : pour chercher plus longtemps)
  const VOULUS = clamp(Math.round(+o.tirages || 8), 1, 200), MAX = clamp(Math.round(+o.essais || Math.max(60, VOULUS * 6)), 1, 1500);
  let bons = 0, essais = 0; const raisons = [], valables = [];
  for (let essai = 0; essai < MAX; essai++) { essais = essai + 1;
    const graine = (o.graine || 1) * 1000 + essai, R = hasard(graine), cible = clamp(o.km || 1, .3, 50) * 1000, pieces = [];
    // la liste des modules : ce qui est coché, complété par des lignes droites, des virages et des S ; mélangée
    const voulus = Object.keys(o.avec || {}).filter(k => o.avec[k]), liste = [];
    for (const k of voulus) { if (["fourche", "echangeur", "rondpoint"].includes(k) && huit) continue; const m = Object.keys(MODULES).filter(n => MODULES[n].pour === k && MODULES[n].act === (terre ? "terre" : "eau")); if (m.length) liste.push(m[Math.floor(R() * m.length)]); }
    const D = clamp(o.denivele !== undefined ? +o.denivele : {plat: 0, vallonne: 15, montagne: 40}[o.relief] ?? 15, 0, terre ? 250 : 80), SIN = SINUEUX[o.virages] || SINUEUX.quelques, BOUTS = terre ? SIN.terre : SIN.bouts;
    if (!terre && D >= 20) liste.push("rapides");
    if (!terre && D >= 35) liste.push("chute", "saut");
    if (terre && D >= 60 && !liste.includes("col_t")) liste.push("col_t");
    if (terre && D >= 60) liste.push("descente_t");
    const nb = Math.max(liste.length + 2, Math.round(cible / (o.virages === "tres" || o.virages === "sinueux" ? 85 : 105)));
    const bouts = o.boucle === false ? BOUTS.filter(b => b !== "epingle" && b !== "lacet") : BOUTS;   // de A à B : pas d'épingle (elle ferait revenir la route sur elle-même)
    while (liste.length < nb - 1) liste.push(bouts[Math.floor(R() * bouts.length)]);
    for (let i = liste.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [liste[i], liste[j]] = [liste[j], liste[i]]; }
    const iPort = liste.indexOf("port"), iVillage = liste.indexOf(terre ? "village_t" : "village");   // le départ : devant le port ou le village, sinon une ligne droite
    const depart = iPort >= 0 ? liste.splice(iPort, 1)[0] : iVillage >= 0 ? liste.splice(iVillage, 1)[0] : terre ? "route" : "droite";
    liste.unshift(depart);
    if (pied) liste.splice(0, liste.length, ...listeFooting(R, o, cible));
    // un 8 : deux lignes droites qui se croisent à niveau (un carrefour), une boucle à gauche entre elles, une boucle à droite
    const iCroix = huit ? 1 + Math.floor((liste.length - 1) / 2) : -1;
    if (huit) liste.splice(iCroix, 0, terre && iVillage >= 0 ? "village_t" : "route");
    // les virages : un tour complet à gauche pour une boucle (le raccord fera le dernier quart), répartis au hasard
    const total = o.boucle === false ? (R() - .5) * 120 : sens * 285, parts = liste.map((_, k) => huit && (k === 0 || k === iCroix) ? 0 : .4 + R()), somme = parts.reduce((x, y) => x + y, 0);
    const sommeLobe = a => parts.slice(a[0], a[1]).reduce((x, y) => x + y, 0) || 1, lobes = [[1, iCroix], [iCroix + 1, liste.length]];
    // par-dessus ce partage, chaque bout tourne pour de bon, d'un côté puis souvent de l'autre (Kiki, 12/11 : « quasiment tout le temps des lignes droites ») ;
    // ces virages-là s'annulent sur le tour : une boucle se referme toujours
    let sg = R() < .5 ? -1 : 1; const vagues = liste.map(() => { if (R() < SIN.change) sg = -sg; return sg * SIN.ampleur * (.55 + .7 * R()); }), moy = vagues.reduce((x, y) => x + y, 0) / vagues.length;
    const virageDe = k => { if (huit) { if (k === 0 || k === iCroix) return 0; const L = k < iCroix ? lobes[0] : lobes[1]; return clamp(Math.round((k < iCroix ? -270 : 270) * parts[k] / sommeLobe(L) + vagues[k] * .4), -170, 170); }
      if (o.boucle === false) return clamp(Math.round(vagues[k] - cap * .55), Math.max(-120, -75 - cap), Math.min(120, 75 - cap));   // le cap reste à moins de 75° de celui du départ : la route avance toujours   // (17/11) de A à B : elle serpente mais revient toujours vers son cap ; une longue route ne repasse jamais sur elle-même
      return clamp(Math.round(total * parts[k] / somme + vagues[k] - moy), -170, 170); };
    let cap = 0;   // de A à B : le cap où l'on en est (degrés, 0 = celui du départ)
    let decor = terre ? ["bas_cote", "bas_cote"] : ["pre", "pre"], haut = 0; const debutLobe2 = [];
    const DECORS = terre ? [["bas_cote", "bas_cote"], ["champ", "bas_cote"], ["bas_cote", "champ"], ["sous_bois", "bas_cote"], ["bas_cote", "sous_bois"]] : [["pre", "pre"], ["foret", "pre"], ["pre", "foret"], ["foret", "foret"], a("falaise") ? ["falaise", "pre"] : ["foret", "pre"]];
    liste.forEach((nom, k) => {
      if (R() < .35) decor = DECORS[Math.floor(R() * DECORS.length)];
      if (huit && k === iCroix + 1) debutLobe2.push(pieces.length);
      const morceau = MODULES[nom].pieces(R, {v: virageDe(k), eau: 9 + Math.round(R() * 5), g: decor[0], d: decor[1], lieux, terre: !!o.terre, grotte: o.grotte, ouvert: o.boucle === false});
      if (huit && (k === 0 || k === iCroix)) for (const p of morceau) { p.virage = 0; p.long = Math.max(p.long, 150); delete p.monte; }   // les deux lignes droites du carrefour, à plat
      if (pied && k && liste[k - 1] === nom) delete morceau[0].nom;   // (le footing) un quartier garde son nom : la même rue, le même sentier
      for (const p of morceau) { for (const q of [p].concat(p.calme || [], p.force || [])) for (const c of ["g", "d"]) if (!a(q[c])) q[c] = terre ? "bas_cote" : "pre"; if (p.surface === undefined) delete p.surface; haut += +p.monte || 0;
        if (BOUTS_LIBRES.includes(nom) && !(huit && (k === 0 || k === iCroix))) p.libre = true;
        if (BOUTS_LIBRES.includes(nom) && !p.nom && k && !BOUTS_LIBRES.includes(liste[k - 1]) && p === morceau[0]) p.nom = terre ? "La route" : "La rivière";   // (17/11) sinon il garde le nom du lieu d'avant (« Le rond-point » pendant des kilomètres)
        pieces.push(p); if (typeof p.virage === "number") cap += p.virage; }
    });
    if (huit) { pieces.push({nom: "Le retour au carrefour", long: 90, virage: "auto", large: 8, g: decor[0], d: decor[1]}); for (const p of pieces) { if (p.monte !== undefined) delete p.monte; if (p.long < 40) { p.fixe = true; p.long = Math.max(p.long, 21); } } }   // (17/11) un 8 se referme en ajustant les longueurs : une pièce courte (les rampes d'un pont, 18 m) n'est jamais raccourcie sous 20 m
    // le dénivelé : ce que les bouts de relief n'ont pas apporté se répartit en montées et en descentes douces (7 % au plus) sur les bouts ordinaires
    // (sur la terre, 10 % au plus : le vélo monte bien plus que l'eau ; un 8 : chaque boucle monte puis redescend, le carrefour reste à plat)
    const pente = pied ? .08 : terre ? .1 : .07, plat = p => !p.fixe && !p.net && !p.pont && !p.tunnel && !p.lieux && (terre ? p.surface !== "paves" && p.surface !== "marches" && p.g !== "trottoir" && p.g !== "escalier" : !p.surface) && p.virage !== "auto" && p.long >= 40 && !["mer", "marais", "dune", "plage", "quai"].includes(p.d);
    const repartir = (liste, monter, descendre) => { const libres = liste.filter(p => plat(p) && p.monte === undefined);
      for (let i = libres.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [libres[i], libres[j]] = [libres[j], libres[i]]; }
      let aMonter = Math.max(0, monter - liste.reduce((t, p) => t + Math.max(0, +p.monte || 0), 0)), aDescendre = Math.max(0, descendre - liste.reduce((t, p) => t + Math.max(0, -(+p.monte || 0)), 0));
      libres.forEach((p, k) => { const max = p.long * pente, haut = k % 2 === 0 ? aMonter >= aDescendre : aMonter > aDescendre;   // une montée, une descente, à peu près à tour de rôle
        if (haut && aMonter > .5) { const m = Math.min(aMonter, max); p.monte = Math.round(m * 10) / 10; aMonter -= m; if (!p.nom) p.nom = terre ? "La montée" : "La côte"; }
        else if (aDescendre > .5) { const m = Math.min(aDescendre, max); p.monte = -Math.round(m * 10) / 10; aDescendre -= m; } }); };
    if (huit) { const b2 = debutLobe2[0] || pieces.length, L1 = pieces.slice(1, b2).filter(p => p.virage !== 0 || p.long < 150), L2 = pieces.slice(b2);   // chaque boucle monte et redescend d'autant
      const ordre = L => { const a = L.slice(0, Math.ceil(L.length / 2)), b = L.slice(Math.ceil(L.length / 2)); repartir(a, D / 2, 0); repartir(b, 0, D / 2); }; ordre(L1); ordre(L2); }
    else repartir(pieces, D, o.boucle === false ? D * (.3 + .5 * R()) : D);
    if (!pieces[0].nom) pieces[0].nom = "Le départ";
    pieces[0].objets = [{o: "ligne", cote: "c", a: 0}].concat(pieces[0].objets || []);
    if (o.boucle !== false && pied) pieces.push({nom: "Le retour", raccord: true, rayon: 30, large: 2.6, g: "rue", d: "facades", surface: "trottoir", monte: "auto"});
    else if (o.boucle !== false && !huit) pieces.push(terre ? {nom: "Le retour", raccord: true, rayon: 34, large: 8, g: "bas_cote", d: "bas_cote", monte: "auto"} : {nom: "Le retour", raccord: true, rayon: 30, eau: 12, g: "pre", d: "pre", monte: "auto"});
    const niveau = {id: "perso-" + graine, nom: o.nom || (terre ? "Parcours n° " : "Circuit n° ") + (o.graine || 1), biome, lieux, graine: graine % 97 + 1, nageur: NIVEAU.nageur || 7, allure: 1, elan: 60, pieces};
    if (o.boucle !== false) niveau.boucle = huit ? "huit" : "gauche";
    if (pied) { niveau.machines = ["elliptique"]; if (!o.nom) niveau.nom = "Footing n° " + (o.graine || 1); }   // (un parcours à pied : pas pour le vélo)
    if (terre) { niveau.discipline = "terre"; niveau.surface = pied ? "terre" : "goudron"; if (o.avec && o.avec.volcan && o.boucle !== false && !huit) niveau.massif = {haut: 120 + Math.round(R() * 80), rayon: .8, cratere: true}; else if (o.avec && o.avec.volcan) niveau.lointain = [{o: "volcan", cap: Math.round(R() * 360), taille: .7}]; }
    if (o.heure && o.heure !== "jour") niveau.heure = o.heure;
    if (o.meteo && o.meteo !== "beau") niveau.meteo = o.meteo;
    // on l'essaie ; trop long ou trop court : on étire ses lignes droites et on réessaie une fois
    const carrefour = p => huit && p.virage === 0 && p.long >= 150, droit = o.virages === "droit";
    if (!droit) onduler(pieces, R, carrefour);
    let r = essayerNiveau(niveau);
    if (!r.erreur && r.verif.ok) {
      const k = cible / r.PISTE.N;
      if (Math.abs(k - 1) > .08) { for (const p of pieces) if (!p.fixe && !p.net && !p.raccord && !p.pont && p.long > 30) p.long = Math.round(p.long * clamp(k, .6, 2.2)); if (!droit) onduler(pieces, R, carrefour); r = essayerNiveau(niveau); }
    }
    if (!r.erreur && huit && !r.verif.croisements.some(c => c.carrefour)) r.verif.ok = false, r.verif.erreurs = ["pas de carrefour"];   // un 8 doit se croiser pour de bon
    if (r.erreur || !r.verif.ok || (o.boucle !== false && r.verif.fermeture >= 3)) { raisons.push(r.erreur || (r.verif.erreurs[0] || "boucle mal refermée").replace(/[0-9.,]+/g, "#")); continue; }
    if (o.boucle !== false && !huit && o.deplier !== false) r = deplierRetour(niveau, r);
    // parmi les tirages qui tiennent debout, on garde le mieux noté (à note égale : le plus ramassé, celui dont le retour est le plus court)
    const racc = r.PISTE.pieces.find(q => q._i === pieces.length - 1), retour = o.boucle === false || huit || !racc ? 0 : r.PISTE.N - racc.s0;
    const note = o.habiller === false || pied ? noterCircuit(r.PISTE, niveau, region(biome), r.tour) : habiller(niveau, r, biome, terre, a);
    valables.push({niveau, r, long: r.PISTE.N, retour, note, rang: bons});
    if (++bons >= VOULUS) break;
  }
  // du mieux noté au moins bien noté : le premier dont le sol n'a ni trou ni marche (au plus 5 essayés ; un tirage que ses falaises font
  // échouer est rhabillé sans elles avant d'être écarté). Si aucun ne passe : le mieux noté, et on le dit (sol.ok faux).
  valables.sort((x, y) => y.note.note - x.note.note || x.retour - y.retour || x.rang - y.rang);
  let mieux = null;
  for (const c of valables.slice(0, o.sol === false ? 0 : 5)) {
    c.sol = solNiveau(c.niveau);
    if (!c.sol.ok && !terre && o.habiller !== false) { c.note = habiller(c.niveau, c.r, biome, terre, a, true); c.sol = solNiveau(c.niveau); }
    if (c.sol.ok) { mieux = c; break; }
  }
  mieux = mieux || valables[0];
  window.__raisons = raisons; if (mieux) { for (const p of mieux.niveau.pieces) { if (!huit) delete p.fixe; delete p.libre; if (p.fourche) for (const k of ["long", "virage", "eau", "large", "g", "d", "monte", "nom"]) delete p[k]; } return {niveau: mieux.niveau, long: mieux.long, retour: mieux.retour, note: mieux.note, sol: mieux.sol || null, essais, bons}; }
  window.__raisons = raisons;
  return {erreur: "Pas de circuit trouvé avec ces réglages : essaie « Un autre », moins de virages, ou une longueur plus courte."};
}
window.__generer = genererCircuit;
