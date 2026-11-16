/* ============ le contrôle sans dessin : ce niveau tient-il debout ? ============ */
// Collé après les modules « purs » du moteur et jeu/note.js (page.py : controle). Il construit la piste, le champ, pose tout le décor, puis
// parcourt le sol à la recherche de trous et de cassures. Il écrit une ligne « BILAN {…} » : les contrôles automatiques la lisent
// (tests/test_riviere.py, avec node) ; dans un navigateur : le serveur d'essai, ?pur=1.
(() => {
  const t0 = Date.now(), v = verifier(), formes = poserDecor(), objets = {}, P = PISTE, G = CASES;
  for (const p of MONDE.poses) objets[p.nom] = (objets[p.nom] || 0) + 1;
  let triangles = 0; for (const F of formes.values()) triangles += F.p.length / 9;
  // le sol, point par point : jamais de valeur absurde, jamais de mur entre deux bouts de piste qui se font face (jeu/note.js : scannerSol)
  let haut = 0; for (let i = 0; i < P.M; i++) haut = Math.max(haut, P.Y[i]);
  const sol = scannerSol(hauteur, Q, G, (a, b) => ecart(sLigne(a), sLigne(b)), MASSIF, haut);
  let serres = 0; for (const L of LIBRE) for (let i = 0; i < P.N; i++) if (L[i] < 50) serres++;
  const bilan = Object.assign(v, {niveau: NIVEAU.id, objets, poses: MONDE.poses.length, sprites: MONDE.sprites.length, evenements: MONDE.evenements.length, metres: P.M, triangles: Math.round(triangles), masse: MONDE.masse || 0, effets: EFFETS_NOMS.filter(k => EFFETS[k]),
    absurdes: sol.absurdes, changements: sol.changements, cassures: sol.cassures, pire: sol.pire, rives_serrees: serres, surfaces: P.surfaces, ponts: P.PONT.reduce((a, b) => a + b, 0), ms: Date.now() - t0});
  bilan.note = noterCircuit(PISTE, NIVEAU, BIOME, TOUR_VRAI);
  // les fourches : les vrais mètres de chaque voie (ils doivent être les mêmes), et ce qui est posé sur la voie « force »
  bilan.voies = P.voies.map(v => { let calme = 0, force = 0, saut = 0; for (let s = v.a; s < v.b; s++) { calme += 1 / P.ALL[s]; force += 1 / P.ALL[v.dec + s]; saut = Math.max(saut, Math.abs(P.Y[v.dec + s] - P.Y[s])); }
    return {nom: v.nom, calme: +calme.toFixed(3), force: +force.toFixed(3), ecart_haut: +saut.toFixed(2), bouts: [+(P.Y[v.dec + v.a] - P.Y[v.a]).toFixed(3), +(P.Y[v.dec + v.b - 1] - P.Y[v.b - 1]).toFixed(3)], poses: MONDE.poses.filter(p => p.v && p.v[P.voies.indexOf(v)]).length}; });
  globalThis.__bilan = bilan;
  console.log("BILAN " + JSON.stringify(bilan));
})();
