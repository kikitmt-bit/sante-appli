/* ============ le générateur : quelques cases cochées, un bouton, un circuit qui tient debout ============ */
// Il ne dessine rien lui-même : il assemble des MODULES (les mêmes que la palette de l'éditeur), puis fait construire le résultat par le
// vrai code de la piste (SOURCE_PISTE : le même que le jeu) et lit son contrôleur. Un tirage qui se croise ou ne se referme pas est jeté,
// on en tire un autre : ce qui sort est toujours jouable. Même graine, mêmes cases : même circuit.
// Ajouter un module = une entrée dans MODULES : {nom, pour (ce qu'il apporte), pieces(R, o) → une liste de pièces}.

/* construire un brouillon avec le vrai code de la piste, sans toucher à la page : {PISTE, verif, erreur} */
function essayerNiveau(niveau) {
  try {
    const f = new Function("NIVEAU", "BIOME", "D", "location", SOURCE_PISTE + "\nreturn {PISTE, verif: verifier(), tour: TOUR_VRAI, boucle: BOUCLE};");
    return f(JSON.parse(JSON.stringify(niveau)), region(BIOMES[niveau.biome] ? niveau.biome : Object.keys(BIOMES)[0]), {}, {search: ""});
  } catch (e) { return {erreur: e && e.message || String(e)}; }
}

/* les modules : des bouts de circuit tout faits. v = le virage qui lui est demandé (degrés), o = les réglages du tirage (rives du moment…) */
const MODULES = {
  droite: {nom: "Ligne droite", pieces: (R, o) => [{long: 70 + Math.round(R() * 50), virage: Math.round((R() - .5) * 16), eau: o.eau, g: o.g, d: o.d}]},
  virage: {nom: "Virage", pieces: (R, o) => [{long: 70 + Math.round(R() * 40), virage: o.v, eau: o.eau, g: o.g, d: o.d}]},
  s: {nom: "Un S", pieces: (R, o) => { const a = 35 + Math.round(R() * 20); return [{long: 55, virage: a, eau: o.eau, g: o.g, d: o.d}, {long: 55, virage: -a + o.v, eau: o.eau, g: o.g, d: o.d}]; }},
  epingle: {nom: "Épingle", pieces: (R, o) => [{nom: "L'épingle", long: 46, virage: Math.sign(o.v || -1) * 150, eau: 8, g: o.g, d: o.d}]},
  lac: {nom: "Lac", pour: "lac", pieces: (R, o) => [{nom: "Le lac", long: 110 + Math.round(R() * 40), virage: o.v, eau: 28 + Math.round(R() * 8), g: "plage", d: "foret", surface: o.terre ? undefined : "lagon", camera: {haut: .8, recul: 1},
    objets: o.terre ? [] : [{o: "pokemon", num: 131, cote: "c", a: 60, e: 8, haut: -.9, bouge: {type: "nage", long: 44, vitesse: 1.3}}]}]},
  foret: {nom: "Sous-bois", pour: "foret", pieces: (R, o) => [{nom: "Le sous-bois", long: 100 + Math.round(R() * 50), virage: o.v, eau: 9, g: "foret", d: "foret", ambiance: "sous-bois"}]},
  marais: {nom: "Marais", pour: "marais", pieces: (R, o) => [{nom: "Le marais", long: 110 + Math.round(R() * 40), virage: o.v, eau: 13, g: "marais", d: "marais", surface: o.terre ? undefined : "marais", ambiance: "marais",
    objets: o.terre ? [] : [{o: "nenuphars", cote: "c", a: 24, e: -4.6}, {o: "nenuphars", cote: "c", a: 62, e: 4.7}, {o: "pokemon", num: 60, cote: "c", a: 62, e: 4.9, haut: .05}]}]},
  plage: {nom: "Plage", pour: "plage", pieces: (R, o) => [{nom: "La plage", long: 110 + Math.round(R() * 40), virage: o.v, eau: 16, g: "dune", d: "mer", ambiance: "plage"}]},
  grotte: {nom: "Grotte", pour: "grotte", pieces: (R, o) => { const style = o.grotte || ["cristal", "calcaire", "terre", "roche"][Math.floor(R() * 4)], rive = style === "calcaire" ? "calcaire" : "montagne";
    return [{nom: {cristal: "Grotte de cristal", calcaire: "Grotte aux stalactites", terre: "La galerie", roche: "La grotte", glace: "Grotte de glace"}[style] || "La grotte", long: 100 + Math.round(R() * 30), virage: clamp(o.v, -80, 80), eau: 9, g: rive, d: rive, tunnel: style, surface: style === "cristal" && !o.terre ? "source" : undefined, fixe: true}]; }},
  cascade: {nom: "Falaise et cascade", pour: "cascade", pieces: (R, o) => [{nom: "La grande cascade", long: 90, virage: o.v, eau: 10, g: "falaise", d: "foret", objets: [{o: "cascade", cote: "g", a: 45, e: 2, large: 6 + Math.round(R() * 2)}]}]},
  cote: {nom: "Côte", pour: "relief", pieces: (R, o) => [{nom: "La côte", long: 80 + Math.round(R() * 30), virage: o.v, eau: 9, g: "foret", d: "pre", monte: 3 + Math.round(R() * 3), segment: "La côte"}]},
  chute: {nom: "Cascade à remonter", pour: "relief", pieces: (R, o) => [{nom: "La Cascade", long: 10, virage: 0, eau: 8, g: "montagne", d: "pre", monte: 4.5, net: true}, {long: 50, virage: o.v, eau: 9, g: "foret", d: "pre"}]},
  rapides: {nom: "Rapides", pour: "relief", pieces: (R, o) => [{nom: "Les rapides", long: 45, virage: o.v / 2 - 25, eau: 8, g: "foret", d: "montagne", monte: -1.5, allure: 1.3}, {long: 45, virage: o.v / 2 + 25, eau: 8, g: "montagne", d: "foret", monte: -1.5, allure: 1.3}]},
  saut: {nom: "Grand saut", pour: "relief", pieces: (R, o) => [{nom: "Le grand saut", long: 5, virage: 0, eau: 8, g: "montagne", d: "montagne", monte: .8, net: true}, {long: 3, virage: 0, eau: 8, g: "montagne", d: "montagne", monte: -3.8, net: true}, {long: 50, virage: o.v, eau: 10, g: "pre", d: "foret"}]},
  pont: {nom: "Pont sur un ravin", pour: "pont", pieces: (R, o) => [{nom: "Le pont", long: 18, virage: 0, eau: 9, g: "pre", d: "pre"}, {long: 70 + Math.round(R() * 20), virage: clamp(o.v, -25, 25), eau: 9, g: "pre", d: "pre", pont: ["arches", "bois", true][Math.floor(R() * 3)], ravin: 8 + Math.round(R() * 4), segment: "Sprint du pont", camera: {haut: .5}}, {long: 18, virage: 0, eau: 9, g: "pre", d: "pre"}]},
  village: {nom: "Village", pour: "village", pieces: (R, o) => { const lieux = Object.keys(LIEUX_TOUS[o.lieux] || {}).filter(k => k !== "note"), lieu = lieux[Math.floor(R() * lieux.length)]; if (!lieu) return MODULES.droite.pieces(R, o);
    const L = LIEUX_TOUS[o.lieux][lieu].long; return [{nom: lieu.replace(/-/g, " ").replace(/^./, c => c.toUpperCase()), long: L + 40, virage: clamp(o.v, -20, 20), eau: 13, g: "bourg", d: "pre", lieux: [{lieu, cote: "g", a: 20}], fixe: true}]; }},
  port: {nom: "Port", pour: "port", pieces: (R, o) => [{nom: "Le port", long: 130, virage: clamp(o.v, -15, 15), eau: 17, g: "quai", d: "pre", fixe: true, objets: [
    {o: "lampadaire", cote: "g", a: 14, e: 1.6}, {o: "lampadaire", cote: "g", a: 54, e: 1.6}, {o: "lampadaire", cote: "g", a: 94, e: 1.6},
    {o: "bateau", cote: "g", a: 26, e: -1.6, flotte: true}, {o: "bateau", cote: "g", a: 42, e: -1.6, flotte: true, voile: true}, {o: "ponton", cote: "g", a: 62, e: -3.6, flotte: true, tourne: 90, long: 7}, {o: "bateau", cote: "g", a: 74, e: -1.7, flotte: true},
    {o: "caisses", cote: "g", a: 34, e: 4}, {o: "entrepot", cote: "g", a: 30, e: 15}, {o: "immeuble", cote: "g", a: 60, e: 17}, {o: "immeuble", cote: "g", a: 86, e: 18}, {o: "immeuble", cote: "g", a: 110, e: 17},
    {o: "phare", cote: "g", a: 122, e: 7}, {o: "pokemon", num: 129, cote: "c", a: 90, e: 5.5, bouge: {type: "saut", tous: 5, haut: 2.3}}]}]},
};

/* un circuit : o = {km, relief ("plat", "vallonne", "montagne"), avec: {grotte, cascade, pont, lac, village, port, marais, plage, foret}, heure, meteo, graine, boucle, biome, terre} */
function genererCircuit(o) {
  const biome = o.biome || NIVEAU.biome, lieux = BIOMES[biome] && BIOMES[biome].lieux || biome, sens = -1;
  const rives = Object.keys(region(biome).rives), a = n => rives.includes(n);
  let mieux = null, bons = 0;
  for (let essai = 0; essai < 60; essai++) {
    const graine = (o.graine || 1) * 1000 + essai, R = hasard(graine), cible = clamp(o.km || 1, .3, 6) * 1000, pieces = [];
    // la liste des modules : ce qui est coché, complété par des lignes droites, des virages et des S ; mélangée
    const voulus = Object.keys(o.avec || {}).filter(k => o.avec[k]), liste = [];
    for (const k of voulus) { const m = Object.keys(MODULES).filter(n => MODULES[n].pour === k); if (m.length) liste.push(m[Math.floor(R() * m.length)]); }
    if (o.relief === "vallonne") liste.push("cote", "rapides");
    if (o.relief === "montagne") liste.push("chute", "rapides", "cote", "saut");
    const nb = Math.max(liste.length + 2, Math.round(cible / 105));
    while (liste.length < nb - 1) liste.push(["virage", "virage", "s", "droite", "foret"][Math.floor(R() * 5)]);
    for (let i = liste.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [liste[i], liste[j]] = [liste[j], liste[i]]; }
    const iPort = liste.indexOf("port"), iVillage = liste.indexOf("village");   // le départ : devant le port ou le village, sinon une ligne droite
    const depart = iPort >= 0 ? liste.splice(iPort, 1)[0] : iVillage >= 0 ? liste.splice(iVillage, 1)[0] : "droite";
    liste.unshift(depart);
    // les virages : un tour complet à gauche pour une boucle (le raccord fera le dernier quart), répartis au hasard
    const total = o.boucle === false ? (R() - .5) * 240 : sens * 285, parts = liste.map(() => .4 + R()), somme = parts.reduce((x, y) => x + y, 0);
    let decor = ["pre", "pre"], haut = 0;
    liste.forEach((nom, k) => {
      if (R() < .35) decor = [["pre", "pre"], ["foret", "pre"], ["pre", "foret"], ["foret", "foret"], a("falaise") ? ["falaise", "pre"] : ["foret", "pre"]][Math.floor(R() * 5)];
      const morceau = MODULES[nom].pieces(R, {v: Math.round(total * parts[k] / somme), eau: 9 + Math.round(R() * 5), g: decor[0], d: decor[1], lieux, terre: !!o.terre, grotte: o.grotte});
      for (const p of morceau) { for (const c of ["g", "d"]) if (!a(p[c])) p[c] = "pre"; if (p.surface === undefined) delete p.surface; haut += +p.monte || 0; pieces.push(p); }
    });
    if (!pieces[0].nom) pieces[0].nom = "Le départ";
    pieces[0].objets = [{o: "ligne", cote: "c", a: 0}].concat(pieces[0].objets || []);
    if (o.boucle !== false) pieces.push({nom: "Le retour", raccord: true, rayon: 30, eau: 12, g: "pre", d: "pre", monte: "auto"});
    const niveau = {id: "perso-" + graine, nom: o.nom || "Circuit n° " + (o.graine || 1), biome, lieux, graine: graine % 97 + 1, nageur: NIVEAU.nageur || 7, allure: 1, elan: 60, pieces};
    if (o.boucle !== false) niveau.boucle = "gauche";
    if (o.terre) niveau.surface = "terre";
    if (o.heure && o.heure !== "jour") niveau.heure = o.heure;
    if (o.meteo && o.meteo !== "beau") niveau.meteo = o.meteo;
    // on l'essaie ; trop long ou trop court : on étire ses lignes droites et on réessaie une fois
    let r = essayerNiveau(niveau);
    if (!r.erreur && r.verif.ok) {
      const k = cible / r.PISTE.N;
      if (Math.abs(k - 1) > .08) { for (const p of pieces) if (!p.fixe && !p.net && !p.raccord && !p.pont && p.long > 30) p.long = Math.round(p.long * clamp(k, .6, 2.2)); r = essayerNiveau(niveau); }
    }
    if (r.erreur || !r.verif.ok || (o.boucle !== false && r.verif.fermeture >= 3)) continue;
    // parmi les tirages qui tiennent debout, on garde le plus ramassé : celui dont le raccord (la ligne droite du retour) est le plus court
    const retour = o.boucle === false ? 0 : r.PISTE.N - r.PISTE.pieces[pieces.length - 1].s0;
    if (!mieux || retour < mieux.retour) mieux = {niveau, essais: essai + 1, long: r.PISTE.N, retour};
    if (++bons >= 8 || retour < 140) break;
  }
  if (mieux) { for (const p of mieux.niveau.pieces) delete p.fixe; return mieux; }
  return {erreur: "Pas de circuit trouvé avec ces réglages : essaie une autre graine, ou moins de choses à la fois."};
}
window.__generer = genererCircuit;
