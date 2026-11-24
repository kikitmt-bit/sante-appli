/* ============ le plan : la ville (rues, îlots, trottoirs, parc) est dessinée D'ABORD ; le parcours marche dessus ============ */
// (24/11, Kiki : « le trottoir d'un coup dévie, fait un grand virage, change de texture ») Partout ailleurs, le monde se déduit de la piste : la piste
// ÉTAIT le trottoir, donc il tournait avec elle. Ici c'est l'inverse : "plan" dans un niveau décrit une ville, et la piste n'est plus qu'un chemin
// invisible posé dessus (surface « libre » : elle ne dessine que l'ombre du coureur). Le sol ne change donc jamais parce que l'on tourne.
// Les rues sont droites et se croisent à angle droit ; entre elles, des îlots aux coins arrondis, chacun entouré de son trottoir.
// Le plan (mètres, x vers la droite, z vers le bas ; le départ du parcours est en 0, 0 et regarde vers -z) :
//   graine · ns: [{x, l}] les rues nord-sud (leur axe, la largeur de la chaussée) · eo: [{z, l}] les rues est-ouest, dans l'ordre
//   ilots: [{i0, i1, j0, j1, type, cotes: {n, s, o, e}, nom, portes, allees, etang}] (i : entre la rue ns[i] et ns[i + 1] ; plusieurs colonnes : un grand îlot, sans rue dedans)
//   passages: [{x, z, l, sens}] les passages piétons au milieu d'une rue (les autres, aux carrefours, sont déduits)
// Ce fichier ne dessine rien (aucun appel à three.js) : il se contrôle sans navigateur (planControle, tout en bas).
const PLAN = (() => {
  if (ZONE) return planDeZone();   // (étape 13) une ville libre : mêmes réponses, autre fabrication (zone.js, zone_plan.js)
  const p = NIVEAU.plan; if (!p) return null;
  const T = 3, RC = 3, MARGE_P = 90;   // la largeur d'un trottoir ; l'arrondi d'un coin d'îlot ; la ceinture d'arbres autour de la ville
  const ns = p.ns, eo = p.eo, xA = ns[0].x - ns[0].l / 2, xB = ns[ns.length - 1].x + ns[ns.length - 1].l / 2, zA = eo[0].z - eo[0].l / 2, zB = eo[eo.length - 1].z + eo[eo.length - 1].l / 2;
  const ilots = p.ilots.map(o => Object.assign({cotes: {}}, o, {x0: ns[o.i0].x + ns[o.i0].l / 2, x1: ns[o.i1 + 1].x - ns[o.i1 + 1].l / 2, z0: eo[o.j0].z + eo[o.j0].l / 2, z1: eo[o.j1 + 1].z - eo[o.j1 + 1].l / 2}));
  const ilotEn = (i, j) => ilots.find(o => i >= o.i0 && i <= o.i1 && j >= o.j0 && j <= o.j1) || null;
  // les carrefours : là où deux rues se croisent vraiment (pas au milieu d'un grand îlot) ; leurs branches : n, s, o, e
  const carrefours = [];
  ns.forEach((a, i) => eo.forEach((b, j) => {
    const no = ilotEn(i - 1, j - 1), ne = ilotEn(i, j - 1), so = ilotEn(i - 1, j), se = ilotEn(i, j);
    const br = {n: j > 0 && !(no && no === ne), s: j < eo.length - 1 && !(so && so === se), o: i > 0 && !(no && no === so), e: i < ns.length - 1 && !(ne && ne === se)};
    if ([br.n, br.s, br.o, br.e].filter(Boolean).length >= 2) carrefours.push({i, j, x: a.x, z: b.z, lx: a.l, lz: b.l, br});
  }));
  // les passages piétons : à chaque branche d'un carrefour, dans l'alignement du trottoir ; puis ceux du milieu d'une rue. {x0, x1, z0, z1, sens} (sens « x » : on traverse en allant le long de x)
  const passages = [];
  for (const c of carrefours) { const xa = c.x - c.lx / 2, xb = c.x + c.lx / 2, za = c.z - c.lz / 2, zb = c.z + c.lz / 2;
    if (c.br.n) passages.push({x0: xa, x1: xb, z0: za - T + .2, z1: za - .2, sens: "x"}); if (c.br.s) passages.push({x0: xa, x1: xb, z0: zb + .2, z1: zb + T - .2, sens: "x"});
    if (c.br.o) passages.push({x0: xa - T + .2, x1: xa - .2, z0: za, z1: zb, sens: "z"}); if (c.br.e) passages.push({x0: xb + .2, x1: xb + T - .2, z0: za, z1: zb, sens: "z"}); }
  for (const q of p.passages || []) passages.push(q.sens === "x" ? {x0: q.x - q.l / 2, x1: q.x + q.l / 2, z0: q.z - 1.8, z1: q.z + 1.8, sens: "x", milieu: true} : {x0: q.x - 1.8, x1: q.x + 1.8, z0: q.z - q.l / 2, z1: q.z + q.l / 2, sens: "z", milieu: true});
  // un plateau : le carrefour surélevé au niveau des trottoirs (aucune marche à descendre), jusqu'à 4 m dans chaque branche
  const plateaux = carrefours.map(c => ({x0: c.x - c.lx / 2 - T - 1, x1: c.x + c.lx / 2 + T + 1, z0: c.z - c.lz / 2 - T - 1, z1: c.z + c.lz / 2 + T + 1, c}));
  for (const q of passages) if (q.milieu) plateaux.push(q.sens === "x" ? {x0: q.x0, x1: q.x1, z0: q.z0 - .8, z1: q.z1 + .8, m: q} : {x0: q.x0 - .8, x1: q.x1 + .8, z0: q.z0, z1: q.z1, m: q});
  /* une ligne brisée aux coins arrondis → des points tous les mètres : [[x, z], …] (une allée, un parcours). pts : [{x, z, r}] */
  const arrondir = (pts, pas = 1) => {
    const o = [], n = pts.length; let dx = pts[0].x, dz = pts[0].z; const segment = (x, z) => { const l = Math.hypot(x - dx, z - dz), k = Math.max(1, Math.round(l / pas)); for (let t = o.length ? 1 : 0; t <= k; t++) o.push([lerp(dx, x, t / k), lerp(dz, z, t / k)]); dx = x; dz = z; };
    for (let i = 1; i < n - 1; i++) { const A = pts[i - 1], B = pts[i], C = pts[i + 1], la = Math.hypot(B.x - A.x, B.z - A.z), lc = Math.hypot(C.x - B.x, C.z - B.z), ux = (B.x - A.x) / la, uz = (B.z - A.z) / la, vx = (C.x - B.x) / lc, vz = (C.z - B.z) / lc;
      const cr = ux * vz - uz * vx, th = Math.atan2(cr, ux * vx + uz * vz), r = B.r || 4, d = r * Math.tan(Math.abs(th) / 2);
      if (Math.abs(th) < .02) { segment(B.x, B.z); continue; }
      segment(B.x - ux * d, B.z - uz * d);
      const sg = Math.sign(th), cx = B.x - ux * d - uz * r * sg, cz = B.z - uz * d + ux * r * sg, a0 = Math.atan2(B.z - uz * d - cz, B.x - ux * d - cx), k = Math.max(2, Math.round(r * Math.abs(th) / pas));
      for (let t = 1; t <= k; t++) o.push([cx + Math.cos(a0 + th * t / k) * r, cz + Math.sin(a0 + th * t / k) * r]);
      dx = B.x + vx * d; dz = B.z + vz * d; }
    segment(pts[n - 1].x, pts[n - 1].z); return o;
  };
  const allees = []; for (const o of ilots) for (const a of o.allees || []) allees.push({l: a.l || 3, pts: arrondir(a.pts), ilot: o});
  const C = 8, grille = new Map();   // les points des allées, rangés par cases de 8 m : la distance à l'allée la plus proche
  allees.forEach((a, k) => { for (let i = 0; i + 1 < a.pts.length; i++) { const cle = Math.floor(a.pts[i][0] / C) + "," + Math.floor(a.pts[i][1] / C); if (!grille.has(cle)) grille.set(cle, []); grille.get(cle).push([k, i]); } });
  const distAllee = (x, z) => { const cx = Math.floor(x / C), cz = Math.floor(z / C); let b = 99;   // la distance au bord de l'allée la plus proche (négative : dedans)
    for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) for (const [k, i] of grille.get((cx + a) + "," + (cz + c)) || []) { const [ax, az] = allees[k].pts[i], [bx, bz] = allees[k].pts[i + 1], ux = bx - ax, uz = bz - az, t = clamp(((x - ax) * ux + (z - az) * uz) / (ux * ux + uz * uz || 1), 0, 1); b = Math.min(b, Math.hypot(x - ax - ux * t, z - az - uz * t) - allees[k].l / 2); }
    return b; };
  const distRect = (o, x, z) => Math.max(o.x0 - x, x - o.x1, o.z0 - z, z - o.z1);   // (négative : dedans)
  const bordIlot = (o, x, z) => {   // la distance au bord de l'îlot (positive : dedans), coins arrondis compris
    const ex = Math.max(o.x0 + RC - x, x - o.x1 + RC, 0), ez = Math.max(o.z0 + RC - z, z - o.z1 + RC, 0);
    return ex > 0 && ez > 0 ? RC - Math.hypot(ex, ez) : -distRect(o, x, z); };
  const rayonEtang = (E, a) => E.r * (1 + .16 * Math.sin(a * 2 + E.g) + .08 * Math.sin(a * 3 + E.g * 2.3) + .05 * Math.sin(a * 5 + E.g));
  const distEtang = (E, x, z) => Math.hypot(x - E.x, (z - E.z) * E.k) - rayonEtang(E, Math.atan2((z - E.z) * E.k, x - E.x));
  const entrees = [];   // les petits sols ajoutés par poserPlan (une allée de jardin, une cour de garage) : {x0, x1, z0, z1, nature}
  /* la nature du sol en un point : « chaussee », « passage », « trottoir », « pelouse », « allee », « place », « jardin », « etang », « dehors » */
  function nature(x, z) {
    if (x < xA - MARGE_P || x > xB + MARGE_P || z < zA - MARGE_P || z > zB + MARGE_P) return "dehors";
    for (const o of ilots) { if (distRect(o, x, z) > 0) continue; const b = bordIlot(o, x, z); if (b < 0) break;
      if (b < T) return "trottoir";
      if (o.type === "place") return "place";
      if (o.etang && distEtang(o.etang, x, z) < 0) return "etang";
      if (o.type === "parc") return distAllee(x, z) < 0 ? "allee" : "pelouse";
      return "jardin"; }
    if (x < xA - T || x > xB + T || z < zA - T || z > zB + T) return "pelouse";
    if (x < xA || x > xB || z < zA || z > zB) return "trottoir";   // le trottoir d'en face des boulevards
    for (const q of passages) if (x >= q.x0 - (q.sens === "x" ? 2 : 0) && x <= q.x1 + (q.sens === "x" ? 2 : 0) && z >= q.z0 - (q.sens === "z" ? 2 : 0) && z <= q.z1 + (q.sens === "z" ? 2 : 0)) return "passage";   // (2 m de plus : l'arrondi du coin, à plat)
    return "chaussee";
  }
  const haut = (x, z) => { const n = nature(x, z); if (n === "chaussee") { for (const q of plateaux) if (x > q.x0 && x < q.x1 && z > q.z0 && z < q.z1) return 0; return -.12; } return n === "etang" ? -.3 : n === "pelouse" || n === "jardin" ? -.02 : 0; };
  const bord = (x, z) => Math.max(xA - MARGE_P - x, x - xB - MARGE_P, zA - MARGE_P - z, z - zB - MARGE_P);   // la distance au plan (négative : dedans)
  return {T, RC, MARGE: MARGE_P, ns, eo, ilots, ilotEn, carrefours, passages, plateaux, allees, arrondir, distAllee, distRect, bordIlot, distEtang, rayonEtang, nature, haut, bord, xA, xB, zA, zB, graine: p.graine || 1, objets: [], entrees, sols: []};
})();
const COUL_PLAN = {trottoir: [.80, .78, .73], passage: [.80, .78, .73], chaussee: [.37, .375, .39], allee: [.83, .71, .52], place: [.74, .70, .64]};

/* ---- ce qui est posé sur le plan : des listes, sans rien dessiner. Chaque objet : {o, x, z, lacet, r (place au sol, rayon), l, p (place en rectangle), dur (arrête le coureur), …réglages}
   Tout est à sa parcelle, donc rien ne se touche par construction ; planControle le vérifie quand même. ---- */
function remplirPlan() {
  const P = PLAN; if (P && P.zone) return remplirZone(); if (!P || P.rempli) return; P.rempli = true;
  const R = hasard(P.graine * 7121 + 13), tire = (a, b) => a + (b - a) * R(), choix = l => l[Math.floor(R() * l.length)];
  const poser = (o, x, z, lacet, q = {}) => { P.objets.push(Object.assign({o, x, z, lacet}, q)); };
  const sol = (x0, z0, x1, z1, nature, y = -.008) => P.sols.push({x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), nature, y});
  /* un côté d'îlot : son repère. f = vers la rue ; t = le long du côté ; (a, e) : a mètres le long, e mètres derrière le trottoir */
  const cote = (o, c) => { const m = P.T, I = {x0: o.x0 + m, x1: o.x1 - m, z0: o.z0 + m, z1: o.z1 - m};
    const K = {n: {f: [0, -1], t: [1, 0], ox: I.x0, oz: I.z0, L: I.x1 - I.x0}, s: {f: [0, 1], t: [-1, 0], ox: I.x1, oz: I.z1, L: I.x1 - I.x0}, o: {f: [-1, 0], t: [0, -1], ox: I.x0, oz: I.z1, L: I.z1 - I.z0}, e: {f: [1, 0], t: [0, 1], ox: I.x1, oz: I.z0, L: I.z1 - I.z0}}[c];
    K.pt = (a, e) => [K.ox + K.t[0] * a - K.f[0] * e, K.oz + K.t[1] * a - K.f[1] * e]; K.lacet = Math.atan2(K.f[0], K.f[1]); K.profond = c === "n" || c === "s" ? I.z1 - I.z0 : I.x1 - I.x0; return K; };
  // une haie entre deux longueurs d'un côté, à e mètres derrière le trottoir
  const haie = (K, a0, a1, e, h = 1.05) => { if (a1 - a0 < .5) return; for (let a = a0; a < a1 - .01;) { const b = Math.min(a1, a + 12), [x, z] = K.pt((a + b) / 2, e); poser("haie", x, z, K.lacet, {long: b - a, h, l: b - a, p: .75, dur: true, haie: true}); a = b; } };
  /* la clôture d'une parcelle : une haie, une barrière blanche ou un muret (le même genre sur toute la largeur d'une maison) */
  const cloture = (K, genre, a0, a1, h) => { if (a1 - a0 < .6) return; if (genre === "haie") return haie(K, a0, a1, .5, h); const [x, z] = K.pt((a0 + a1) / 2, .4); poser(genre, x, z, K.lacet, {long: a1 - a0, l: a1 - a0, p: .4, dur: true, haie: true}); };
  const maisons = (o, c, debut, fin) => {   // des maisons, chacune sur sa parcelle, tournées vers la rue
    const K = cote(o, c), n = Math.max(1, Math.round((fin - debut) / tire(14.2, 16))), w = (fin - debut) / n; if (w < 12.5) return;
    for (let k = 0; k < n; k++) {
      const a0 = debut + k * w, coinA = k === 0 && debut === 0, coinB = k === n - 1 && Math.abs(fin - K.L) < .01, garage = w > 13.6 && !coinA && !coinB && R() < .42 ? (R() < .5 ? -1 : 1) : 0, am = a0 + w / 2 - garage * .9, l = Math.min(w - (garage ? 6.8 : 5), tire(7.6, 9.2)), pr = tire(5.9, 6.6), e = tire(4.6, 6), [x, z] = K.pt(am, e + pr / 2), genre = choix(["haie", "haie", "barriere", "muret"]), hh = choix([.75, .95, 1.05]);
      poser("maison", x, z, K.lacet, {varie: true, l, p: pr, dur: true});
      const ap = am + l * .27;   // (la porte est à gauche de la façade vue de la rue : le long du côté, elle est du côté des « a » croissants ou non selon le repère, réglé ici)
      const ax = K.lacet === undefined ? ap : am + portePlan(K) * l * .27, [px0, pz0] = K.pt(ax - .7, 0), [px1, pz1] = K.pt(ax + .7, e);
      sol(px0, pz0, px1, pz1, "trottoir");
      const ga = garage ? a0 + w / 2 + garage * (w / 2 - 1.75) : null, ml = portePlan(K) > 0 ? -1 : 1, trous = [[ax - (ml < 0 ? 1.6 : .8), ax + (ml > 0 ? 1.6 : .8)]]; if (garage) trous.push([ga - 1.5, ga + 1.5]);
      if (garage) { const [x0, z0] = K.pt(ga - 1.4, 0), [x1, z1] = K.pt(ga + 1.4, 8.5); sol(x0, z0, x1, z1, "place"); if (R() < .6) { const [cx, cz] = K.pt(ga, 5); poser("voiture", cx, cz, Math.atan2(-K.f[1], K.f[0]), {l: 1.9, p: 4.6, tourneRect: true, dur: true}); } }
      trous.sort((u, v) => u[0] - v[0]); let a = a0; for (const [u, v] of trous) { cloture(K, genre, a + (a === a0 ? (coinA ? 2.6 : .05) : 0), u, hh); a = v; } cloture(K, genre, a, a0 + w - (coinB ? 2.6 : .05), hh); if (coinA || coinB) { const [x, z] = K.pt(coinA ? 1.7 : K.L - 1.7, 1.7); if (c === "n" || c === "s") poser("massif", x, z, 0, {r: .9, r0: .7, coin: true}); }
      const bl = ax + ml * 1.15; { const [x, z] = K.pt(bl, .55); if (!(garage && Math.abs(bl - ga) < 2)) poser("boite_lettres", x, z, K.lacet, {r: .3, libre: true}); }
      // le jardin : un arbre ou deux derrière, un massif devant
      if (K.profond > 26) for (const s of [-1, 1]) if (R() < .6) { const [x, z] = K.pt(am + s * tire(1, w / 2 - 2.6), e + pr + tire(3.4, 5)); poser("arbre", x, z, R() * 6.28, {r: .6, couronne: 2.5}); }
      const sm = -portePlan(K), am2 = am + sm * w * .24; if (R() < .8 && Math.abs(am2 - ax) > 2.4 && !(garage && Math.abs(am2 - ga) < 3.2)) { const t = R(), [x, z] = K.pt(am2, 2.4); if (t < .35) poser("pommier", x, z, R() * 6, {r: .5, couronne: 1.6, ech: .62}); else if (t < .5) poser("cerisier", x, z, R() * 6, {r: .5, couronne: 1.6, ech: .62}); else poser(t < .75 ? "massif" : "buisson", x, z, 0, {r: 1.2}); }
    } };
  const residences = (o, c, debut, fin) => {   // des immeubles au milieu d'une pelouse, une haie basse, un chemin jusqu'à l'entrée
    const K = cote(o, c), n = Math.max(1, Math.round((fin - debut) / 24)), w = (fin - debut) / n; if (w < 18) return maisons(o, c, debut, fin);
    for (let k = 0; k < n; k++) {
      const am = debut + (k + .5) * w, l = Math.min(w - 6, tire(13, 17)), pr = 8.4, e = 6, [x, z] = K.pt(am, e + pr / 2); poser("immeuble", x, z, K.lacet, {varie: true, l, p: pr, dur: true});
      const [px0, pz0] = K.pt(am - 1.1, 0), [px1, pz1] = K.pt(am + 1.1, e); sol(px0, pz0, px1, pz1, "trottoir"); haie(K, debut + k * w + (k ? 0 : 2.6), am - 1.3, .5, .7); haie(K, am + 1.3, debut + (k + 1) * w - (k < n - 1 ? 0 : 2.6), .5, .7);
      for (const s of [-1, 1]) { const [x2, z2] = K.pt(am + s * (w / 2 - 2.6), 3.2); poser(choix(["bouleau", "arbre", "cerisier"]), x2, z2, R() * 6, {r: .5, couronne: 2, ech: .8}); const [x3, z3] = K.pt(am + s * 2.6, 2.6); poser("massif", x3, z3, 0, {r: 1.2}); } } };
  const boutiques = (o, c, debut, fin) => {   // des boutiques serrées les unes contre les autres, au ras d'un trottoir élargi de 2,4 m
    const K = cote(o, c), n = Math.max(1, Math.round((fin - debut) / 9)), w = (fin - debut) / n, [x0, z0] = K.pt(debut, 0), [x1, z1] = K.pt(fin, 2.6), noms = P.enseignes || (P.enseignes = ["Boulangerie", "Librairie", "Fleuriste", "Café", "Épicerie", "Coiffeur", "Pharmacie", "Cycles", "Pâtisserie", "Primeur", "Presse", "Cordonnier"]);
    sol(x0, z0, x1, z1, "trottoir");
    for (let k = 0; k < n; k++) { const a = debut + (k + .5) * w;
      if (w > 8 && R() < .22) { const pr = 8, [x, z] = K.pt(a, 2.6 + pr / 2); poser("immeuble", x, z, K.lacet, {varie: true, l: w - .1, p: pr, dur: true}); continue; }
      const [x, z] = K.pt(a, 2.6 + 3); P.kEns = (P.kEns || 0) + 1; const nom = noms[P.kEns % noms.length]; poser("magasin", x, z, K.lacet, {l: w - .05, p: 6, enseigne: nom, dur: true});
      if (nom === "Café" || nom === "Pâtisserie") for (const s of [-1, 1]) { const [tx, tz] = K.pt(a + s * 1.9, 1.15); poser("terrasse", tx, tz, K.lacet, {r: 1, libre: true}); }
      else if (nom === "Primeur" || nom === "Épicerie") { const [tx, tz] = K.pt(a - 1.4, 1.1); poser("etal", tx, tz, K.lacet, {r: 1.2, libre: true}); }
      else if (nom === "Fleuriste") for (const s of [-1, 1]) { const [tx, tz] = K.pt(a + s * 2.4, 1.6); poser("massif", tx, tz, 0, {r: .9, r0: .6, libre: true}); } } };
  const batir = {maisons, boutiques, residences};
  const gens = (NIVEAU.peuple || []).filter(q => q.o === "habitant").map(q => q.nom); let kg = 0;   // les passants du niveau ("peuple") : jamais sur le chemin
  const passants = (o, n, bon) => { for (let k = 0, mis = 0; k < 400 && mis < n && gens.length; k++) { const x = tire(o.x0 + 4, o.x1 - 4), z = tire(o.z0 + 4, o.z1 - 4); if (!degage(x, z, 1.6) || !bon(x, z) || P.objets.some(q => q.o !== "haie" && Math.abs(q.x - x) < 6 && Math.hypot(q.x - x, q.z - z) < Math.min(q.r || 3, 3) + .5 && !(q.l && distBoite(boiteObjet(q), x, z) > .5))) continue; mis++; poser("habitant", x, z, 0, {nom: gens[kg++ % gens.length], r: .3}); } };
  for (const o of P.ilots) {
    const I = {x0: o.x0 + P.T, x1: o.x1 - P.T, z0: o.z0 + P.T, z1: o.z1 - P.T}, lx = I.x1 - I.x0, lz = I.z1 - I.z0;
    if (o.type === "place") {   // une place pavée : une fontaine au milieu, des arbres et des bancs autour, des terrasses ; le couloir du parcours reste libre (degager)
      const cx = (I.x0 + I.x1) / 2, cz = (I.z0 + I.z1) / 2, libre = (x, z, r) => degage(x, z, r + 1.2); if (libre(cx, cz + (o.decale || 0), 2.4)) poser("fontaine", cx, cz + (o.decale || 0), 0, {r: 2.3, dur: true});
      for (const [c, L] of [["n", lx], ["s", lx], ["o", lz], ["e", lz]]) { const K = cote(o, c); for (let a = 5; a < L - 4; a += 8) { const [x, z] = K.pt(a, 2); if (!libre(x, z, .8)) continue; if (Math.round(a / 8) % 2) poser("arbre", x, z, R() * 6, {r: .5, couronne: 2.4, dur: true}); else { poser("banc", x, z, K.lacet + Math.PI, {r: 1, dur: true}); } }
        for (let a = 9; a < L - 8; a += 16) { const [x, z] = K.pt(a + 1, .35); if (libre(x, z, .4)) poser("lampadaire", x, z, 0, {r: .3, dur: true}); } }
      for (const s of [-1, 1]) for (let k = 0; k < 7; k++) { const x = cx + (k - 3) * 5.2, z = cz - (o.decale || 0) * 1.15 + s * 2.6; if (x > I.x0 + 5 && x < I.x1 - 5 && libre(x, z, 1.9)) poser("etal", x, z, s > 0 ? Math.PI : 0, {r: 1.7, dur: true, num: k}); }   // deux rangées d'étals face à face
      for (let x = I.x0 + 12; x < I.x1 - 10; x += 13) for (const dz of [-.24, .02, .36]) { const z = cz + dz * lz; if (!libre(x, z, 1.6) || P.objets.some(q => Math.abs(q.x - x) < 5 && Math.hypot(q.x - x, q.z - z) < (q.r || 2) + 2.6)) continue; poser("arbre", x, z, R() * 6, {r: .5, couronne: 2.4, dur: true}); const z2 = z + 3.6; if (libre(x, z2, .6) && !P.objets.some(q => Math.hypot(q.x - x, q.z - z2) < (q.r || 2) + .8)) poser("lampadaire", x, z2, 0, {r: .3, dur: true}); }   // des arbres et des réverbères en rangs
      for (let k = 0; k < 60; k++) { const x = tire(I.x0 + 6, I.x1 - 6), z = tire(I.z0 + 6, I.z1 - 6); if (libre(x, z, 1.6) && Math.hypot(x - cx, z - cz - (o.decale || 0)) > 6 && !P.objets.some(q => q.o === "terrasse" && Math.hypot(q.x - x, q.z - z) < 4.2 || Math.hypot(q.x - x, q.z - z) < (q.couronne || q.r || 2) + 1.8)) poser("terrasse", x, z, 0, {r: 1.3, dur: true}); }
      passants(o, 9, (x, z) => P.nature(x, z) === "place");
    } else if (o.type === "parc") {
      // le pourtour : une haie derrière le trottoir, ouverte aux portes ; à chaque porte, un portail dans l'axe de son allée
      for (const c of ["n", "s", "o", "e"]) { const K = cote(o, c), pts = (o.portes || []).filter(q => q.cote === c).map(q => K.t[0] ? (q.x - K.ox) * K.t[0] : (q.z - K.oz) * K.t[1]).sort((a, b) => a - b); let a = 2.8;
        for (const q of pts) { haie(K, a, q - 2.35, .6, 1.2); a = q + 2.35; const [x, z] = K.pt(q, .6); poser("portail_parc", x, z, Math.atan2(K.t[0], K.t[1]), {eau: 3.4, texte: (o.portes.find(d => d.cote === c) || {}).texte || o.nom, ouvert: true, sansHaie: true}); }
        haie(K, a, K.L - 2.8, .6, 1.2); if (c === "n" || c === "s") for (const q of [1.9, K.L - 1.9]) { const [x, z] = K.pt(q, 1.9); poser("massif", x, z, 0, {r: 1.1, r0: .9}); } }
      if (o.kiosque) poser("kiosque", o.kiosque.x, o.kiosque.z, o.kiosque.lacet || 0, {r: 4.1, dur: true});
      // le long des allées : bancs tournés vers l'allée, réverbères, poubelles, massifs
      for (const A of P.allees.filter(a => a.ilot === o)) { let d = 0;
        for (let i = 6; i < A.pts.length - 6; i++) { if (i % 11) continue; const [x, z] = A.pts[i], [x2, z2] = A.pts[i + 1], l = Math.hypot(x2 - x, z2 - z) || 1, sg = d++ % 2 ? 1 : -1, nx = -(z2 - z) / l * sg, nz = (x2 - x) / l * sg, e = A.l / 2 + (d % 2 ? .75 : 1), X = x + nx * e, Z = z + nz * e;
          if (P.distAllee(X, Z) < .55 || o.etang && P.distEtang(o.etang, X, Z) < 1.6 || o.kiosque && Math.hypot(X - o.kiosque.x, Z - o.kiosque.z) < 6.5) continue;
          const L = Math.atan2(-nx, -nz); if (d % 3 === 1) poser("lampadaire", X, Z, 0, {r: .3, dur: true}); else { poser("banc", X, Z, L, {r: 1, dur: true}); if (d % 3 === 2) { const tx = (x2 - x) / l, tz = (z2 - z) / l; if (P.distAllee(X + tx * 1.6, Z + tz * 1.6) > .5) poser("poubelle", X + tx * 1.6, Z + tz * 1.6, 0, {r: .3, dur: true}); } } } }
      // les arbres : par bosquets, jamais sur une allée ni dans l'étang
      const S = []; const ok = (x, z, r, d) => P.distAllee(x, z) > d && !(o.etang && P.distEtang(o.etang, x, z) < 2.2) && !S.some(q => Math.hypot(q[0] - x, q[1] - z) < q[2] + r) && !P.objets.some(q => q.r && q.o !== "arbre" && Math.abs(q.x - x) < 8 && Math.hypot(q.x - x, q.z - z) < q.r + Math.min(r, 1.6));
      const bosquet = (x, z) => fbm(x / 34 + P.graine, z / 34 + 3) > .5;
      for (let k = 0; k < lx * lz / 26; k++) { const x = tire(I.x0 + 4, I.x1 - 4), z = tire(I.z0 + 4, I.z1 - 4), b = bosquet(x, z); if (!b && R() < .82) continue; const r = b ? 2.1 : 3; if (!ok(x, z, r, 1.9)) continue; S.push([x, z, r]); poser("arbre", x, z, R() * 6.28, {r: .6, couronne: 2.5, dur: true}); }
      for (let k = 0; k < lx * lz / 160; k++) { const x = tire(I.x0 + 3, I.x1 - 3), z = tire(I.z0 + 3, I.z1 - 3); if (!ok(x, z, 1.2, 1.6)) continue; S.push([x, z, 1.2]); poser(R() < .45 ? "massif" : "buisson", x, z, 0, {r: 1.2, dur: true}); }
      passants(o, 5, (x, z) => { const dA = P.distAllee(x, z); return dA > 1.2 && dA < 2.8 && ok(x, z, .5, .5); });
      const nums = o.pokemon || [16, 133, 39, 43, 35, 52]; for (let k = 0; k < 60 && (o.kp || 0) < 9; k++) { const x = tire(I.x0 + 4, I.x1 - 4), z = tire(I.z0 + 4, I.z1 - 4), dA = P.distAllee(x, z); if (dA < .9 || dA > 4 || !ok(x, z, .8, .9)) continue; S.push([x, z, .8]); o.kp = (o.kp || 0) + 1; poser("pokemon", x, z, 0, {num: choix(nums), r: .4}); }
    } else {   // un îlot bâti : sur chaque côté, des maisons ou des boutiques ; un côté nord et un côté sud prennent les coins
      const pf = 17, styles = {n: o.cotes.n || o.cotes.tous || "maisons", s: o.cotes.s || o.cotes.tous || "maisons", o: o.cotes.o || o.cotes.tous || "maisons", e: o.cotes.e || o.cotes.tous || "maisons"};
      for (const c of ["n", "s"]) batir[styles[c]](o, c, 0, lx);
      for (const c of ["o", "e"]) { const K = cote(o, c), L = K.L, jonction = 1;
        if (L - 2 * pf > 13) batir[styles[c]](o, c, pf, L - pf);
        for (const [a0, a1] of [[0, pf], [L - pf, L]]) if (L - 2 * pf > 13 ? true : a0 === 0) { const voisinBoutique = c === "o" ? (a0 === 0 ? styles.s : styles.n) === "boutiques" : (a0 === 0 ? styles.n : styles.s) === "boutiques"; haie(K, a0 + (a0 === 0 ? (voisinBoutique ? 9 : 2.6) : 0), (L - 2 * pf > 13 ? a1 : L) - (a1 === L ? (voisinBoutique ? 9 : 2.6) : 0), .5, .95); } }
      if (lx > 46 && lz > 46) for (let k = 0; k < (lx - 40) * (lz - 40) / 90; k++) { const x = tire(I.x0 + 20, I.x1 - 20), z = tire(I.z0 + 20, I.z1 - 20); if (!P.objets.some(q => Math.hypot(q.x - x, q.z - z) < (q.couronne || 4.8) + 2)) poser("arbre", x, z, R() * 6, {r: .6, couronne: 2.5}); }   // le cœur de l'îlot : des jardins
    }
    // le trottoir : un réverbère tous les 24 m, au bord de la chaussée (et un arbre dans sa grille sur les grandes rues), jamais dans un passage
    for (const c of ["n", "s", "o", "e"]) { const K = cote(o, c); for (let a = 8; a < K.L - 4; a += 12) { const pair = Math.round(a / 12) % 2, [x, z] = K.pt(a, -2.62); if (P.passages.some(q => P.distRect(q, x, z) < 1.2)) continue; if (pair) poser("lampadaire", x, z, 0, {r: .24, dur: true, bordure: true}); } }
  }
  // les voitures garées le long des rues (d'un seul côté), loin des carrefours et des passages
  for (const [liste, sens] of [[P.ns, "z"], [P.eo, "x"]]) liste.forEach((r, k) => { if (r.l < 7) return; const L0 = sens === "z" ? P.zA : P.xA, L1 = sens === "z" ? P.zB : P.xB;
    for (let a = L0 + 14; a < L1 - 10; a += 6.2) { const d = (k % 2 ? 1 : -1) * (r.l / 2 - 1.1), x = sens === "z" ? r.x + d : a, z = sens === "z" ? a : r.z + d; if (R() < .55 || P.nature(x, z) !== "chaussee" || P.plateaux.some(q => P.distRect(q, x, z) < 5.4)) continue;
      const dx = sens === "z" ? 0 : (d > 0 ? 1 : -1), dz = sens === "z" ? (d > 0 ? -1 : 1) : 0; poser("voiture", x, z, Math.atan2(-dz, dx), {l: sens === "z" ? 1.9 : 4.6, p: sens === "z" ? 4.6 : 1.9, axe: true, dur: true}); } });
  // autour de la ville, de l'autre côté des boulevards : une rangée de maisons puis la ceinture d'arbres
  const dehors = {x0: P.xA, x1: P.xB, z0: P.zA, z1: P.zB}, tour = [{f: [0, 1], x0: P.xA, z0: P.zA, t: [1, 0], L: P.xB - P.xA}, {f: [0, -1], x0: P.xB, z0: P.zB, t: [-1, 0], L: P.xB - P.xA}, {f: [1, 0], x0: P.xA, z0: P.zB, t: [0, -1], L: P.zB - P.zA}, {f: [-1, 0], x0: P.xB, z0: P.zA, t: [0, 1], L: P.zB - P.zA}];
  for (const K0 of tour) { const K = Object.assign({}, K0, {lacet: Math.atan2(K0.f[0], K0.f[1]), profond: 60}); K.pt = (a, e) => [K.x0 + K.t[0] * a - K.f[0] * (e + P.T), K.z0 + K.t[1] * a - K.f[1] * (e + P.T)];
    const n = Math.floor(K.L / 16), w = K.L / n; for (let k = 0; k < n; k++) { const am = (k + .5) * w, l = tire(7.6, 9.2), pr = 6.2, e = 5, [x, z] = K.pt(am, e + pr / 2), ax = am + portePlan(K) * l * .27; poser("maison", x, z, K.lacet, {varie: true, l, p: pr, dur: true});
      const [px0, pz0] = K.pt(ax - .7, 0), [px1, pz1] = K.pt(ax + .7, e); sol(px0, pz0, px1, pz1, "trottoir"); haie(K, k * w + .05, ax - .8, .5); haie(K, ax + .8, (k + 1) * w - .05, .5); }
    for (let a = 8; a < K.L; a += 24) { const [x, z] = K.pt(a, -2.62); if (!P.passages.some(q => P.distRect(q, x, z) < 1.2)) poser("lampadaire", x, z, 0, {r: .24, dur: true, bordure: true}); }
    for (let a = -70; a < K.L + 70; a += 5.2) for (let e = 20; e < P.MARGE - 6; e += 5.2) { const [x, z] = K.pt(a + tire(-1.6, 1.6), e + tire(-1.6, 1.6)); if (P.distRect(dehors, x, z) < 20) continue; if (R() < .3 + (e > 30 ? .25 : 0)) poser("arbre_masse", x, z, R() * 6.28, {r: 1.6, couronne: 2, pres: e < 40, ech: tire(.85, 1.3), masse: true}); } }
  // ce qui est loin du parcours ne se voit que de loin : les petits objets n'y sont pas, les arbres y sont de simples silhouettes (la tablette de Kiki)
  P.objets = P.objets.filter(q => { pres(q.x, q.z); const d = Math.hypot(q.x - PISTE.X[Q.i], q.z - PISTE.Z[Q.i]);
    if (["massif", "banc", "poubelle", "terrasse", "boite_lettres", "buisson", "etal"].includes(q.o)) return d < 42;
    if (q.o === "lampadaire" || q.o === "voiture") return d < 55;
    if (q.haie) return d < 95;
    if (["arbre", "pommier", "cerisier", "bouleau"].includes(q.o) && d > 34) { q.o = "arbre_masse"; q.pres = true; q.ech = (q.ech || 1) * .8; }
    return true; });
  // un coin de ceinture est semé par deux côtés : on n'y garde qu'un arbre par place
  const vus = new Map(); P.objets = P.objets.filter(q => { if (!q.masse) return true; const c = Math.floor(q.x / 4.6) + "," + Math.floor(q.z / 4.6); if (vus.has(c)) return false; vus.set(c, 1); return true; });
}
/* la porte d'une maison est à gauche de sa façade (x local négatif : kanto.js, maison) ; le long du côté, c'est vers les « a » négatifs si t va dans le sens des x locaux, sinon positifs */
function portePlan(K) { const cs = Math.cos(K.lacet), sn = Math.sin(K.lacet); return (K.t[0] * cs - K.t[1] * sn) > 0 ? -1 : 1; }
/* le couloir du parcours : un point est-il à plus de r mètres du milieu de la piste ? */
function degage(x, z, r) { pres(x, z); return Math.hypot(x - PISTE.X[Q.i], z - PISTE.Z[Q.i]) > r; }

/* ---- le contrôle : ce parcours est-il celui d'un vrai piéton ? (refusé sinon : le générateur tire une autre ville) ---- */
const SOLS_A_PIED = ["trottoir", "passage", "allee", "place", "chemin"];
/* les passages permis d'un sol à un autre : la liste fermée. Tout ce qui n'y est pas est refusé. */
const PASSAGES_PERMIS = {"trottoir>passage": 1, "passage>trottoir": 1, "trottoir>allee": 1, "allee>trottoir": 1, "trottoir>place": 1, "place>trottoir": 1, "trottoir>chemin": 1, "chemin>trottoir": 1};
function planControle() {
  const P = PLAN, o = []; if (!P) return o; if (P.zone) return zoneControle(); remplirPlan();
  const T = PISTE; let avant = null; const dire = t => { if (o.length < 30) o.push(t); };
  for (let i = 0; i < T.N; i++) {
    const a = T.H[i], n = P.nature(T.X[i], T.Z[i]);
    for (const u of [-.7, 0, .7]) { const m = P.nature(T.X[i] + Math.cos(a) * u, T.Z[i] + Math.sin(a) * u); if (!SOLS_A_PIED.includes(m)) dire("Au mètre " + i + ", le coureur marche sur « " + m + " »."); }
    if (avant && n !== avant) { if (!PASSAGES_PERMIS[avant + ">" + n]) dire("Au mètre " + i + ", le sol passe de « " + avant + " » à « " + n + " »."); }
    if (n === "allee" !== (avant === "allee") && avant) {   // trottoir → allée : à angle droit (à 25° près)
      const d = [[0, 1], [1, 0]].map(([x, z]) => Math.abs(Math.sin(a) * x - Math.cos(a) * z)); if (Math.max(...d) < Math.cos(.44)) dire("Au mètre " + i + ", l'entrée du parc n'est pas prise à angle droit."); }
    avant = n; }
  // rien de solide sur le chemin
  for (const q of P.objets) { if (!q.dur || q.ouvert) continue; pres(q.x, q.z); const b = q.l ? boiteObjet(q) : null;
    for (let k = -14; k <= 14; k++) { const i = idx(sLigne(Q.i) + k), dx = T.X[i] - q.x, dz = T.Z[i] - q.z, d = b ? distBoite(b, T.X[i], T.Z[i]) : Math.hypot(dx, dz) - q.r; if (d < .75) { dire("« " + q.o + " » à " + d.toFixed(2) + " m du chemin, au mètre " + i + "."); break; } } }
  // deux objets l'un dans l'autre, un bâtiment sur la chaussée ou le trottoir
  const C = 12, G = new Map(), solides = P.objets.filter(q => q.dur && !q.haie && !q.ouvert && !q.libre);
  for (const q of solides) { const b = q.l ? boiteObjet(q) : null; if (b && !q.axe && q.o !== "voiture") for (const [x, z] of coinsBoite(b)) { const m = P.nature(x, z); if (m === "chaussee" || m === "passage" || m === "trottoir" && !P.sols.some(s => 0)) { dire("« " + q.o + " » déborde sur « " + m + " » (" + Math.round(x) + ", " + Math.round(z) + ")."); break; } }
    const k = Math.floor(q.x / C) + "," + Math.floor(q.z / C); if (!G.has(k)) G.set(k, []); G.get(k).push(q); }
  for (const q of solides) { const cx = Math.floor(q.x / C), cz = Math.floor(q.z / C); for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) for (const w of G.get((cx + a) + "," + (cz + c)) || []) { if (w === q || w.x < q.x || w.x === q.x && w.z <= q.z) continue; if (seTouchent(q, w)) dire("« " + q.o + " » et « " + w.o + " » se touchent (" + Math.round(q.x) + ", " + Math.round(q.z) + ")."); } }
  return o;
}
function boiteObjet(q) { const c = Math.cos(q.lacet || 0), s = Math.sin(q.lacet || 0), fixe = q.axe || q.tourneRect && Math.abs(s) < .01; if (q.axe) return {x: q.x, z: q.z, c: 1, s: 0, l: q.l / 2, p: q.p / 2}; if (q.tourneRect) return {x: q.x, z: q.z, c, s, l: q.p / 2, p: q.l / 2}; return {x: q.x, z: q.z, c, s, l: q.l / 2, p: q.p / 2}; }
const distBoite = (b, x, z) => { const dx = x - b.x, dz = z - b.z, u = Math.abs(dx * b.c - dz * b.s) - b.l, v = Math.abs(dx * b.s + dz * b.c) - b.p; return u > 0 || v > 0 ? Math.hypot(Math.max(u, 0), Math.max(v, 0)) : Math.max(u, v); };
const coinsBoite = b => [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([u, v]) => [b.x + (u * b.l * b.c + v * b.p * b.s) * .98, b.z + (-u * b.l * b.s + v * b.p * b.c) * .98]);
function seTouchent(a, b) { const A = a.l ? boiteObjet(a) : null, B = b.l ? boiteObjet(b) : null; if (!A && !B) return Math.hypot(a.x - b.x, a.z - b.z) < (a.r || 0) + (b.r || 0) - .05; if (A && !B) return distBoite(A, b.x, b.z) < (b.r || 0) - .05; if (B && !A) return distBoite(B, a.x, a.z) < (a.r || 0) - .05;
  return coinsBoite(A).concat([[A.x, A.z]]).some(([x, z]) => distBoite(B, x, z) < -.08) || coinsBoite(B).concat([[B.x, B.z]]).some(([x, z]) => distBoite(A, x, z) < -.08); }
const PETITS_PLAN = ["lampadaire", "voiture", "boite_lettres", "massif", "banc", "poubelle", "terrasse", "etal", "buisson", "longue_vue"];   // (lot 3) ce qui ne se voit plus à 110 m
const SOUS_BOIS = ["fougere", "buisson_bois", "jeune_pousse", "rocher_mousse", "tronc_couche"];   // (étape 14) ce qui ne se voit plus à 55 m
/* poser tout ça dans le monde (appelé par decor.js, comme le reste du décor) : par carrés de 64 m, clés « p… » (« f… » : la forêt) */
function* poserPlan(formes, MD, K, poses) {
  remplirPlan(); const R = hasard(PLAN.graine * 331 + 7); let n = 0;
  for (const q of PLAN.objets) {
    const recette = OBJETS[q.o]; if (!recette) { console.warn("Objet inconnu : " + q.o); continue; }
    const sorte = NIVEAU.sorte, CA = q.masse || q.haie && !sorte ? 120 : 64, k = (q.masse ? "f" : sorte && q.bois ? "b" : sorte && SOUS_BOIS.includes(q.o) ? "s" : q.haie ? "n" : sorte && PETITS_PLAN.includes(q.o) ? "q" : sorte && q.o === "immeuble_pente" ? "i" : "p") + Math.floor(q.x / CA) + "," + Math.floor(q.z / CA); if (!formes.has(k)) formes.set(k, new Forme());
    pres(q.x, q.z); const s = sLigne(Q.i), cote = Q.d > 0 ? "d" : "g", e = Q.e;
    const F = formes.get(k), n0 = F.m.length; recette(F.poser(q.x, PLAN.haut(q.x, q.z) + (q.dy || 0), q.z, q.lacet || 0, q.ech || 1).matiere(2), Object.assign({eau: 3, _s: s, _cote: cote, _e: e}, q), R, K);
    if (q.incline) { const gx = (PLAN.sol(q.x + 1, q.z) - PLAN.sol(q.x - 1, q.z)) / 2, gz = (PLAN.sol(q.x, q.z + 1) - PLAN.sol(q.x, q.z - 1)) / 2; for (let i = n0; i < F.m.length; i++) if (F.m[i]) F.p[i * 3 + 1] += (F.p[i * 3] - q.x) * gx + (F.p[i * 3 + 2] - q.z) * gz; }   // (étape 13) une voiture garée, une haie : couchées sur la pente (pas leur ombre, déjà posée au sol)
    if (k[0] === "i") { const j = "j" + k.slice(1); if (!formes.has(j)) formes.set(j, new Forme()); OBJETS.immeuble_loin(formes.get(j).poser(q.x, PLAN.haut(q.x, q.z), q.z, q.lacet || 0, q.ech || 1).matiere(2), q, R, K); }   // sa silhouette, vue de loin
    if (k[0] === "b") { const j = "c" + k.slice(1); if (!formes.has(j)) formes.set(j, new Forme()); OBJETS.arbre_bois_loin(formes.get(j).poser(q.x, PLAN.haut(q.x, q.z), q.z, q.lacet || 0, q.ech || 1).matiere(2), q, R, K); }   // (étape 14) un arbre du bois, vu de loin
    if (q.masse) MD.masse++; else poses.push({nom: q.o, s, cote, e, plan: true, v: null});
    if (++n % 60 === 0) yield;
  }
}
