/* ============ les villes : un plan tiré au sort, puis un vrai parcours de piéton dessus (moteur/plan.js) ============ */
// (24/11, Kiki : « aucune carte qui ne soit pas réaliste ») Le parcours ne fait que ce qu'un piéton ferait : il reste au milieu d'un trottoir droit, tourne au coin
// d'un îlot, traverse sur un passage, entre dans le parc par une porte, à angle droit, suit ses allées, traverse une place. Tout le reste est refusé (planControle).
// Mêmes options, même ville, sur toutes les machines. Aucun accès à la page : se lance aussi avec node (page.py : generateur).
const VILLES_NOMS = {rues: ["des Lilas", "du Moulin", "des Tilleuls", "du Marché", "de l'École", "des Roucool", "du Pont", "des Écoles", "de la Gare", "des Pêcheurs", "du Four", "des Cerisiers"],
  parcs: ["Parc des Roucool", "Jardin des Plantes", "Parc de l'Étang", "Jardin Chetiflor", "Parc Ponyta"], places: ["La place du Marché", "La place de la Fontaine", "La place des Platanes"]};

/* un chemin fermé (points {x, z, r, nom…}, coins arrondis de rayon r) → des pièces exactes : une droite, un arc, une droite… Le premier point est le départ, au milieu d'une droite */
function piecesDuChemin(pts, modele) {
  const n = pts.length, o = [], deg = 180 / Math.PI; let x = pts[0].x, z = pts[0].z, nom = null;
  const pousser = (long, virage, p) => { if (long < .05) return; const q = Object.assign({}, modele, {long, virage}); if (p && p.nom && p.nom !== nom) { q.nom = p.nom; nom = p.nom; } if (p && p.segment) q.segment = p.segment; o.push(q); };
  for (let i = 1; i <= n; i++) {
    const A = pts[i - 1], B = pts[i % n], C = pts[(i + 1) % n];
    if (i === n) { pousser(Math.hypot(B.x - x, B.z - z), 0, A); break; }
    const la = Math.hypot(B.x - A.x, B.z - A.z), lc = Math.hypot(C.x - B.x, C.z - B.z), ux = (B.x - A.x) / la, uz = (B.z - A.z) / la, vx = (C.x - B.x) / lc, vz = (C.z - B.z) / lc;
    const th = Math.atan2(ux * vz - uz * vx, ux * vx + uz * vz), r = B.r || 3, d = r * Math.tan(Math.abs(th) / 2);   // (z vers le bas : th positif = à droite, comme les virages d'un niveau)
    if (Math.abs(th) < .01) { pousser(Math.hypot(B.x - x, B.z - z), 0, A); x = B.x; z = B.z; continue; }
    const long = Math.hypot(B.x - ux * d - x, B.z - uz * d - z); if ((B.x - ux * d - x) * ux + (B.z - uz * d - z) * uz < -.01) throw new Error("Un coin du parcours est trop arrondi pour la place qu'il a.");
    pousser(long, 0, A); pousser(r * Math.abs(th), th * deg, A); x = B.x + vx * d; z = B.z + vz * d;
  }
  return o;
}

/* une ville et son parcours. o : {km (décor), graine, nom} */
function tirerVille(o, graine, k0) {
  const R = hasard(graine * 6151 + 17), tire = (a, b) => a + (b - a) * R(), choix = l => l.splice(Math.floor(R() * l.length), 1)[0], noms = {rues: VILLES_NOMS.rues.slice(), parcs: VILLES_NOMS.parcs.slice(), places: VILLES_NOMS.places.slice()};
  const T = 3, M = T / 2, k = k0 || Math.max(.8, Math.min(1.9, (o.km || 1.5) / 1.05)), miroir = R() < .5 ? -1 : 1;
  // les rues : 5 nord-sud, 4 est-ouest. Les boulevards du tour et la rue de la place sont plus larges
  const larg = [8.4, 6.4, 7.4, 6.4, 8.4], haut = [8.4, 6.4, 7.4, 8.4], kp = Math.min(k, 1.05), cols = [tire(72, 84) * k, tire(74, 86) * kp, tire(92, 108) * k, tire(86, 100) * k], rangs = [tire(66, 78) * k, tire(70, 80) * kp, tire(64, 74) * k];   // (la place garde une taille humaine)
  const ns = [{x: 0, l: larg[0]}], eo = [{z: 0, l: haut[0]}]; cols.forEach((w, i) => ns.push({x: ns[i].x + w, l: larg[i + 1]})); rangs.forEach((w, i) => eo.push({z: eo[i].z + w, l: haut[i + 1]}));
  const B = (i0, i1, j0, j1) => ({x0: ns[i0].x + ns[i0].l / 2, x1: ns[i1 + 1].x - ns[i1 + 1].l / 2, z0: eo[j0].z + eo[j0].l / 2, z1: eo[j1 + 1].z - eo[j1 + 1].l / 2});
  const p = B(2, 3, 0, 1), s = B(1, 1, 1, 1), nParc = choix(noms.parcs), nPlace = choix(noms.places), X = u => p.x0 + (p.x1 - p.x0) * u, Z = v => p.z0 + (p.z1 - p.z0) * v;
  const zc = s.z0 + (s.z1 - s.z0) * tire(.58, .68), gx = X(tire(.12, .2));   // la porte ouest du parc, en face de la place ; sa porte nord, sur le boulevard
  const vz = (zc - p.z0) / (p.z1 - p.z0), jit = (a, d = .025) => a + tire(-d, d);
  const tour = [{x: gx, z: p.z0 + T}, {x: gx, z: Z(.2), r: 9}, {x: X(jit(.36)), z: Z(jit(.23)), r: 14}, {x: X(jit(.62)), z: Z(jit(.13)), r: 16}, {x: X(jit(.86)), z: Z(jit(.27)), r: 16}, {x: X(jit(.87)), z: Z(jit(.58)), r: 15},
    {x: X(jit(.7)), z: Z(jit(.68)), r: 13}, {x: X(jit(.7)), z: Z(jit(.87)), r: 12}, {x: X(jit(.42)), z: Z(jit(.86)), r: 14}, {x: X(.27), z: zc, r: 11}, {x: p.x0 + T, z: zc}];
  const etang = {x: X(jit(.52)), z: Z(jit(.47)), r: Math.min((p.x1 - p.x0) * .115, (p.z1 - p.z0) * .13), k: 1.25, g: R() * 6}, q = tour.map(a => [a.x, a.z]);
  const secondes = [{l: 2.4, pts: [{x: q[2][0], z: q[2][1] + 1}, {x: X(.31), z: Z(.5), r: 12}, {x: q[9][0] + 3, z: zc - .5}]},                                                             // l'allée de l'ouest, entre deux points du tour
    {l: 2.6, pts: [{x: q[5][0], z: q[5][1] - 8}, {x: p.x1 - T, z: q[5][1] - 8}]}, {l: 2.6, pts: [{x: q[7][0] - 8, z: q[7][1] - .5}, {x: q[7][0] - 8, z: p.z1 - T}]}];            // les portes est et sud
  const portes = [{cote: "n", x: gx, z: p.z0, texte: nParc}, {cote: "o", x: p.x0, z: zc, texte: nParc}, {cote: "e", x: p.x1, z: q[5][1] - 8, texte: nParc}, {cote: "s", x: q[7][0] - 8, z: p.z1, texte: nParc}];
  const styles = {a: choix([{o: "maisons"}, {n: "residences", o: "maisons"}]), b: choix(["boutiques", "residences"]), c: choix([{o: "residences", s: "maisons"}, {o: "maisons", s: "boutiques"}, {o: "maisons", s: "residences"}])};
  const ilots = [{i0: 2, i1: 3, j0: 0, j1: 1, type: "parc", nom: nParc, portes, allees: [{l: 3.2, pts: tour}].concat(secondes), etang, kiosque: {x: X(.14), z: Math.min(Z(.9), zc + 20) , lacet: Math.PI * .8}},
    {i0: 1, i1: 1, j0: 1, j1: 1, type: "place", nom: nPlace, decale: -(s.z1 - s.z0) * .2},
    {i0: 0, i1: 0, j0: 0, j1: 0, type: "bati", cotes: styles.a}, {i0: 1, i1: 1, j0: 0, j1: 0, type: "bati", cotes: {s: "boutiques", n: styles.b}}, {i0: 0, i1: 0, j0: 1, j1: 1, type: "bati", cotes: {e: "boutiques"}},
    {i0: 0, i1: 0, j0: 2, j1: 2, type: "bati", cotes: styles.c}, {i0: 1, i1: 1, j0: 2, j1: 2, type: "bati", cotes: {n: "boutiques", o: "boutiques"}}, {i0: 2, i1: 2, j0: 2, j1: 2, type: "bati"}, {i0: 3, i1: 3, j0: 2, j1: 2, type: "bati"}];
  // le parcours : le boulevard de l'ouest vers le nord, le boulevard du nord, la porte du parc (à angle droit), ses allées, la place, la rue commerçante, le retour
  const ouest = B(0, 0, 0, 2), xo = ouest.x0 + M, zn = ouest.z0 + M, zs = ouest.z1 - M, xp = s.x0 + M, b12 = B(1, 1, 2, 2), rues = [1, 2, 3, 4].map(() => "La rue " + choix(noms.rues));
  const chemin = [{x: xo, z: lerp(zn, zs, .62), nom: "Le boulevard " + choix(noms.rues)}, {x: xo, z: zn, r: 3, nom: rues[0]}, {x: gx, z: zn, r: 3, nom: nParc, segment: "Le tour du parc"}]
    .concat(tour.slice(1, -1).map((a, i) => ({x: a.x, z: a.z, r: a.r, nom: [null, "L'allée des bancs", null, "Le tour de l'étang", null, "La roseraie", null, "La pelouse", null][i] || undefined, segment: "Le tour du parc"})))
    .concat([{x: p.x0 + 12, z: zc, r: 3, nom: nPlace}, {x: xp, z: zc, r: 3, nom: rues[1]}, {x: xp, z: b12.z1 - M, r: 3, nom: rues[2]}, {x: xo, z: zs, r: 3, nom: chemin0()}]);
  function chemin0() { return rues[3]; }
  const x0 = chemin[0].x, z0 = chemin[0].z, C = v => Math.round(v * 1000) / 1000, dec = a => Object.assign({}, a, {x: C((a.x - x0) * miroir), z: C(a.z - z0)});
  const route = chemin.map(dec), pieces = piecesDuChemin(route, {large: 2, g: "plan", d: "plan", surface: "libre"});
  pieces[0].objets = [{o: "ligne", cote: "c", a: 1, eau: .1}];
  const ns2 = ns.map(r => ({x: C((r.x - x0) * miroir), l: r.l})), eo2 = eo.map(r => ({z: C(r.z - z0), l: r.l})), nc = ns.length - 1;
  if (miroir < 0) ns2.reverse();
  const inverse = {n: "n", s: "s", o: "e", e: "o"}, il = ilots.map(a => { const b = JSON.parse(JSON.stringify(a)); if (miroir < 0) { b.i0 = nc - 1 - a.i1; b.i1 = nc - 1 - a.i0; if (b.cotes) b.cotes = Object.fromEntries(Object.entries(b.cotes).map(([c, v]) => [inverse[c], v])); }
    if (b.portes) b.portes = b.portes.map(d => Object.assign(dec(d), {cote: miroir < 0 ? inverse[d.cote] : d.cote})); if (b.allees) b.allees = b.allees.map(d => ({l: d.l, pts: d.pts.map(dec)})); if (b.etang) b.etang = dec(b.etang); if (b.kiosque) b.kiosque = dec(b.kiosque); return b; });
  const passages = [dec({x: ns[2].x, z: zc, l: ns[2].l, sens: "x"})];
  return {id: "ville-" + graine, nom: o.nom || "Le tour de " + nPlace.replace(/^La /, "la ") + " et du parc", biome: "kanto-plan", lieux: "kanto", discipline: "terre", surface: "libre", machines: ["elliptique"], boucle: miroir > 0 ? "droite" : "gauche", allure: 1.08, elan: 40, graine, nageur: 25, loin: "terres",
    peuple: ["boy", "lass", "youngster", "woman_1", "cooltrainer_f", "gentleman", "picnicker", "bug_catcher", "beauty", "camper"].map(nom => ({o: "habitant", nom})).concat([16, 133, 39, 43, 35, 52].map(num => ({o: "pokemon", num}))),
    plan: {graine, ns: ns2, eo: eo2, ilots: il, passages}, pieces};
}
/* plusieurs villes sont tirées ; la première qui passe tout le contrôle est gardée. controler(niveau) → une liste de défauts (vide : bonne) */
function genererVille(o, controler) {
  let dernier = null, essais = 0;
  for (let k = 0; k < 40; k++) { essais++; let n; try { const g = (o.graine || 1) + k * 101, long = q => q.pieces.reduce((t, a) => t + a.long, 0); n = tirerVille(o, g); for (let j = 0, kk = Math.max(.8, Math.min(1.9, (o.km || 1.5) / 1.05)); j < 3; j++) { kk = Math.max(.8, Math.min(1.9, kk * (o.km || 1.5) * 1000 / long(n))); n = tirerVille(o, g, kk); } const d = controler(n); if (!d.length) return {niveau: n, essais}; dernier = d; } catch (e) { dernier = [e.message]; } }
  return {erreur: "Aucune ville sans défaut : " + (dernier || []).slice(0, 3).join(" ; "), essais};
}
