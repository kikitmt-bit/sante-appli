/* ============ le contrôle sans dessin : ce niveau tient-il debout ? ============ */
// Collé après les modules « purs » du moteur (page.py : controle). Il construit la piste, le champ, pose tout le décor, puis
// parcourt le sol à la recherche de trous et de cassures. Il écrit une ligne « BILAN {…} » : les contrôles automatiques la lisent
// (tests/test_riviere.py, avec node) ; dans un navigateur : le serveur d'essai, ?pur=1.
(() => {
  const t0 = Date.now(), v = verifier(), formes = poserDecor(), objets = {}, P = PISTE, G = CASES;
  for (const p of MONDE.poses) objets[p.nom] = (objets[p.nom] || 0) + 1;
  let triangles = 0; for (const F of formes.values()) triangles += F.p.length / 9;
  // le sol, point par point : jamais de valeur absurde, jamais de mur entre deux bouts de piste qui se font face
  let points = 0, absurdes = 0, cassures = 0, pire = 0;
  for (let z = G.za - 110; z < G.zb + 110; z += 4) {
    let h0 = null, i0 = 0, e0 = 0;
    for (let x = G.xa - 110; x < G.xb + 110; x += 3) {
      const h = hauteur(x, z), i = Q.i, e = Q.e;
      if (!(h > -50 && h < 200)) absurdes++;
      if (h0 !== null && e > 14 && e0 > 14 && Math.abs(ecart(i, i0)) > 60) { points++; const d = Math.abs(h - h0); pire = Math.max(pire, d); if (d > 4) cassures++; }
      h0 = h; i0 = i; e0 = e;
    }
  }
  let serres = 0; for (const L of LIBRE) for (let i = 0; i < P.N; i++) if (L[i] < 50) serres++;
  const bilan = Object.assign(v, {niveau: NIVEAU.id, objets, poses: MONDE.poses.length, sprites: MONDE.sprites.length, evenements: MONDE.evenements.length, triangles: Math.round(triangles),
    absurdes, changements: points, cassures, pire: +pire.toFixed(2), rives_serrees: serres, surfaces: P.surfaces, ponts: P.PONT.reduce((a, b) => a + b, 0), ms: Date.now() - t0});
  globalThis.__bilan = bilan;
  console.log("BILAN " + JSON.stringify(bilan));
})();
