/* ============ le contrôle sans dessin : ce niveau tient-il debout ? ============ */
// Collé après les modules « purs » du moteur et jeu/note.js (page.py : controle). Il construit la piste, le champ, pose tout le décor, puis
// parcourt le sol à la recherche de trous et de cassures. Il écrit une ligne « BILAN {…} » : les contrôles automatiques la lisent
// (tests/test_riviere.py, avec node) ; dans un navigateur : le serveur d'essai, ?pur=1.
/* une longue route (TRONCONS) : le décor comme le jeu le pose, tronçon par tronçon (moteur/troncons.js) ; un kilomètre sur cinq, tout serait long.
   On y contrôle ce que les tronçons promettent : le même décor quel que soit l'ordre, et rien de posé dans un objet du tronçon d'à côté. */
function decorParTroncons() {
  const n = Math.ceil(LONG / TRONCON_M), faits = new Map(), formes = new Map(), bilan = {total: n, faits: 0, fenetre: 0, chevauchements: 0, ordre: true};
  const poids = Z => { let t = 0; for (const F of Z.formes.values()) t += F.p.length / 9; return t; };
  const empreinte = Z => { let h = 2166136261; for (const F of Z.formes.values()) for (let i = 0; i < F.p.length; i += 7) { h ^= Math.round(F.p[i] * 100) | 0; h = Math.imul(h, 16777619); } return h >>> 0; };
  const poser = (k, dans = faits) => {
    if (dans.has(k)) return dans.get(k);
    const v = []; if (k % 2) for (const j of [k - 1, k + 1]) if (j >= 0 && j < n) for (const o of poser(j, dans).occ) v.push(o);
    const Z = zoneTroncon(k, v); Z.formes = poserDecor(Z); dans.set(k, Z); return Z;
  };
  for (let k0 = 0; k0 < n; k0 += 100) { let tri = 0; for (let k = k0; k < Math.min(k0 + 20, n); k++) tri += poids(poser(k)); bilan.fenetre = Math.max(bilan.fenetre, Math.round(tri)); }   // (20 tronçons : 960 m, à peu près ce qu'on voit d'un coup)
  // l'ordre : trois tronçons refaits à part, en commençant par l'autre bout
  if (n > 8) { const autre = new Map(); for (const k of [7, 6, 5]) poser(k, autre); for (const k of [5, 6, 7]) if (empreinte(autre.get(k)) !== empreinte(poser(k))) bilan.ordre = false; }
  for (const [k, Z] of faits) { const V = faits.get(k + 1); if (V) for (const a of Z.occ) for (const b of V.occ) if (!a.ex && !b.ex && Math.hypot(a.x - b.x, a.z - b.z) < Math.min(a.r + b.r - .02, 8)) bilan.chevauchements++; }   // (au-delà de 8 m entre deux centres, le contrôle de place ne voit pas deux très gros objets : c'est ainsi dans tout le jeu)
  for (const k of ["poses", "sprites", "evenements", "lumieres", "etiquettes"]) MONDE[k] = [];
  MONDE.masse = 0;
  for (const [k, Z] of [...faits].sort((a, b) => a[0] - b[0])) { for (const [c, F] of Z.formes) formes.set(k + "/" + c, F); for (const q of ["poses", "sprites", "evenements", "lumieres", "etiquettes"]) MONDE[q].push(...Z.monde[q]); MONDE.masse += Z.monde.masse; }
  bilan.faits = faits.size;
  return [formes, bilan];
}
(() => {
  const t0 = Date.now(), v = verifier(), [formes, troncons] = TRONCONS ? decorParTroncons() : [poserDecor(), null], objets = {}, P = PISTE, G = CASES;
  if (typeof PLAN !== "undefined" && PLAN) { v.erreurs.push(...planControle()); v.ok = !v.erreurs.length; }   // (24/11) une ville dessinée : le parcours est-il celui d'un piéton ?
  const flottants = MONDE.poses.filter(p => p.flotte > .15); if (flottants.length && !NIVEAU.cache) { v.erreurs.push(flottants.length + " objet(s) au-dessus du sol : « " + flottants[0].nom + " » au mètre " + Math.round(flottants[0].s)); v.ok = false; }   // (24/11)
  for (const p of MONDE.poses) objets[p.nom] = (objets[p.nom] || 0) + 1;
  let triangles = 0; for (const F of formes.values()) triangles += F.p.length / 9;
  // le sol, point par point : jamais de valeur absurde, jamais de mur entre deux bouts de piste qui se font face (jeu/note.js : scannerSol)
  let haut = 0; for (let i = 0; i < P.M; i++) haut = Math.max(haut, P.Y[i]);
  const sol = scannerSol(hauteur, Q, G, (a, b) => ecart(sLigne(a), sLigne(b)), MASSIF, haut, TRONCONS ? 12 : 4);
  let serres = 0; for (const L of LIBRE) for (let i = 0; i < P.N; i++) if (L[i] < 50) serres++;
  const bilan = Object.assign(v, {niveau: NIVEAU.id, objets, poses: MONDE.poses.length, ecartes: MONDE.ecartes || 0, sprites: MONDE.sprites.length, evenements: MONDE.evenements.length, metres: P.M, triangles: Math.round(triangles), masse: MONDE.masse || 0, effets: EFFETS_NOMS.filter(k => EFFETS[k]),
    troncons, absurdes: sol.absurdes, changements: sol.changements, cassures: sol.cassures, pire: sol.pire, rives_serrees: serres, surfaces: P.surfaces, ponts: P.PONT.reduce((a, b) => a + b, 0), ms: Date.now() - t0});
  bilan.note = noterCircuit(PISTE, NIVEAU, BIOME, TOUR_VRAI);
  // les fourches : les vrais mètres de chaque voie (ils doivent être les mêmes), et ce qui est posé sur la voie « force »
  bilan.voies = P.voies.map(v => { let calme = 0, force = 0, saut = 0; for (let s = v.a; s < v.b; s++) { calme += 1 / P.ALL[s]; force += 1 / P.ALL[v.dec + s]; saut = Math.max(saut, Math.abs(P.Y[v.dec + s] - P.Y[s])); }
    return {nom: v.nom, calme: +calme.toFixed(3), force: +force.toFixed(3), ecart_haut: +saut.toFixed(2), bouts: [+(P.Y[v.dec + v.a] - P.Y[v.a]).toFixed(3), +(P.Y[v.dec + v.b - 1] - P.Y[v.b - 1]).toFixed(3)], poses: MONDE.poses.filter(p => p.v && p.v[P.voies.indexOf(v)]).length}; });
  globalThis.__bilan = bilan;
  console.log("BILAN " + JSON.stringify(bilan));
})();
