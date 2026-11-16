/* ============ les tronçons : sur une longue route, le monde n'est construit qu'autour de soi (16/11, étape 8 du plan, lot 3) ============ */
// Un circuit de 2 km est construit d'un bloc au chargement. Une vraie route de 20 km ne peut pas l'être (une minute de calcul, des millions
// de triangles en mémoire) : quand TRONCONS est vrai (piste.js), le monde est découpé en petites tâches, faites quand la caméra s'en approche
// et effacées quand elle s'en éloigne. La piste, elle, est toujours calculée en entier (elle est légère : quelques nombres par mètre).
//   « s » : un carré de sol de 60 m (24 mailles de 2,5 m), rangé sur un quadrillage fixe du monde ;
//   « b » : un tronçon de 48 m de piste : ses deux rives et son ruban de route ;
//   « d » : le décor du même tronçon (objets, forêts, bornes, Pokémon, lumières).
// Une tâche est voulue dès qu'elle est à moins de « rin » mètres de la caméra (un peu plus loin que la brume : on ne la voit jamais arriver),
// effacée au-delà de « rout ». Chaque image, tronconsMaj() avance la tâche la plus proche pendant quelques millisecondes seulement
// (les constructions rendent la main : des function* avec yield) : le jeu ne se fige pas. Seul ce qui manque tout près (un départ, un saut
// dans le film, __aller) est fait d'un coup.
// Le résultat ne dépend ni de l'ordre ni du moment : le sol vient du champ (une fonction du lieu), le décor d'un tronçon a son propre hasard
// (la graine du niveau et son numéro). Pour que deux tronçons voisins ne posent rien l'un dans l'autre : les pairs se décorent seuls,
// les impairs attendent leurs deux voisins pairs et évitent ce qu'ils ont posé.
// Les ponts, les tunnels, le lointain restent construits d'un bloc (ils sont rares). Pas encore par tronçons : les rencontres (Ronflex).
const TR = {L: TRONCON_M, T: 24, C: 2.5, URGENT: 150, n: 0, t: 0, taches: new Map(), file: [], bouts: [], piste: null, vx: 1e9, vz: 1e9, sale: true, halos: false,
  rayon: +PARAMS.get("rayon") || 0, stats: {faites: 0, effacees: 0, ms: 0, pire: 0, images: 0, retard: 0}};
const trRayons = () => { const rin = TR.rayon || Math.min(VISION.b1, B1) + 70; return [rin, rin + 90]; };

function trTache(type, k, tj) {   // la tâche, créée au besoin (type "s" : k et tj sont les numéros du carré ; sinon k est le numéro du tronçon)
  const cle = type === "s" ? "s" + k + "," + tj : type + k; let t = TR.taches.get(cle); if (t) return t;
  if (type === "s") { const c = TR.T * TR.C; t = {cle, type, ti: k, tj, x: (k + .5) * c, z: (tj + .5) * c, r: c * .71}; }
  else { const b = TR.bouts[k]; t = {cle, type, k, x: b.x, z: b.z, r: b.r + (type === "d" ? 60 : 16)}; }   // (le décor déborde sur les côtés de la route)
  Object.assign(t, {etat: 0, gen: null, mailles: [], d: 0, p: 0, mort: false});
  TR.taches.set(cle, t); return t;
}
function trAjouter(t, m, nom) {   // une maille de plus dans le monde : elle appartient à sa tâche
  m.name = nom;
  if (nom === "foret") { MONDE.foret.push(m); m.visible = !(typeof QUALITE !== "undefined" && QUALITE.crans.includes("foret")); }
  ombrePour(m); scene.add(m); t.mailles.push(m);
}
function trEffacer(t) {
  t.mort = true; t.gen = null; TR.taches.delete(t.cle); if (t.etat === 2) TR.stats.effacees++;
  for (const m of t.mailles) { scene.remove(m); m.geometry.dispose(); if (m.userData.aSoi) { m.material.map.dispose(); m.material.dispose(); } }
  if (t.mailles.some(m => m.name === "foret")) MONDE.foret = MONDE.foret.filter(m => !t.mailles.includes(m));
  t.mailles = [];
  const M = t.monde; if (!M) return;
  if (M.animes.length) MONDE.animes = MONDE.animes.filter(a => !M.animes.includes(a));
  if (M.lumieres.length) { MONDE.lumieres = MONDE.lumieres.filter(l => !M.lumieres.includes(l)); TR.halos = true; }
  if (M.sons.length) MONDE.sons = MONDE.sons.filter(l => !M.sons.includes(l));
  if (M.evenements.length) MONDE.evenements = MONDE.evenements.filter(l => !M.evenements.includes(l));
  for (const q of t.pantins || []) retirerPublic(q);
  t.pantins = null; t.monde = null; t.occ = null;
  if (EFFETS.ombres) OMBRES.cle = "";
}

/* ---- un carré de sol : le même calcul que construireTerrain (terrain.js : celluleSol, sommetSol), sur 60 m de côté ---- */
function* trSol(t) {
  const T = TR.T, C = TR.C, i0 = t.ti * T, j0 = t.tj * T, n = T + 3;
  let pres_ = 1e9; for (let b = 0; b <= T; b += 4) for (let a = 0; a <= T; a += 4) { pres((i0 + a) * C, (j0 + b) * C); pres_ = Math.min(pres_, Q.e); }
  if (pres_ > VU_LOIN + 30) return;   // trop loin de toute la piste pour être vu un jour : rien
  const pas = pres_ >= 160 ? 4 : pres_ >= 75 ? 2 : 1;   // loin de la piste : des mailles deux puis quatre fois plus grandes
  const HH = new Float32Array(n * n), GI = new Int32Array(n * n), GE = new Float32Array(n * n), GC = new Uint8Array(n * n), GK = new Uint8Array(n * n);
  const m4 = v => ((v % 4) + 4) % 4, utile = (a, b) => pas < 4 || (m4(a) === 0 && m4(b) !== 2) || (m4(b) === 0 && m4(a) !== 2);   // à grandes mailles : les nœuds et leurs quatre voisins (pour la pente)
  for (let b = -1; b <= T + 1; b++) {
    for (let a = -1; a <= T + 1; a++) if (utile(a, b)) celluleSol((i0 + a) * C, (j0 + b) * C, (b + 1) * n + a + 1, HH, GI, GE, GC, GK);
    yield;
  }
  const F = new Forme(), K = (a, b) => (b + 1) * n + a + 1;
  const som = (a, b) => { const k = K(a, b); sommetSol(F, (i0 + a) * C, (j0 + b) * C, HH[k], (HH[k + 1] - HH[k - 1]) / (2 * C), (HH[k + n] - HH[k - n]) / (2 * C), GI[k], GC[k], GK[k], GE[k]); };
  for (let b = 0; b < T; b += pas) { if (b % 4 === 0) yield; for (let a = 0; a < T; a += pas) {
    for (const tri of [[[a, b], [a, b + pas], [a + pas, b]], [[a + pas, b], [a, b + pas], [a + pas, b + pas]]]) {
      const [p, q, r] = tri.map(v => K(v[0], v[1]));
      if (HH[p] < -.3 && HH[q] < -.3 && HH[r] < -.3) continue;
      if (GK[p] === 1 && GK[q] === 1 && GK[r] === 1) continue;
      const k1 = GK[p] === 1 || GK[q] === 1 || GK[r] === 1, k2 = GK[p] >= 2 || GK[q] >= 2 || GK[r] >= 2; if (k1 && k2) continue;
      for (const v of tri) som(v[0], v[1]);
    }
  } }
  yield;
  const m = F.maille(); if (m) trAjouter(t, m, "terrain");
}
/* ---- un tronçon de piste : ses rives (4 m à la fois), puis son ruban ---- */
function* trBande(t) {
  const a = t.k * TR.L, b = Math.min(a + TR.L, LONG), R = fabriqueRives(), F = new Forme();
  for (let c = a; c < b; c += 4) { R.morceau(F, c, Math.min(c + 4, b)); yield; }
  const m = F.maille(); if (m) trAjouter(t, m, "rives");
  yield;
  const rubans = []; TR.piste.decouper(a, b, -1, rubans);
  for (const [a0, a1] of rubans) trAjouter(t, TR.piste.unRuban(a0, a1), "piste");
}
/* ---- le décor d'un tronçon (decor.js : poserDecorPas), puis ce qu'il laisse dans le monde ---- */
function* trDecor(t) {
  const k = t.k, Z = zoneTroncon(k), M = Z.monde;
  if (k % 2) for (const v of [k - 1, k + 1]) { const o = TR.taches.get("d" + v); if (o && o.occ) for (const x of o.occ) Z.voisins.push(x); }
  const formes = yield* poserDecorPas(Z);
  t.occ = Z.occ; t.monde = M;
  for (const [cle, F] of formes) { const m = F.maille(cle === "t" ? MAT_ABRI : MAT_MONDE); if (m) trAjouter(t, m, cle === "t" ? "decor-abri" : cle === "f" ? "foret" : "decor"); yield; }
  for (const e of M.etiquettes) { const m = mailleEtiquette(e); m.userData.aSoi = true; scene.add(m); t.mailles.push(m); }
  for (const a of M.animes) { const m = mailleAnimee(a); if (m) { scene.add(m); t.mailles.push(m); } MONDE.animes.push(a); }
  for (const l of M.lumieres) MONDE.lumieres.push(l); if (M.lumieres.length) TR.halos = true;
  for (const l of M.sons) MONDE.sons.push(l);
  for (const l of M.evenements) MONDE.evenements.push(l);
  if (M.sprites.length) ajouterPublic(M.sprites).then(l => { if (t.mort) l.forEach(retirerPublic); else t.pantins = l; });
}
const TR_GENRES = {s: trSol, b: trBande, d: trDecor};

/* ---- qui est voulu, qui est de trop : refait quand la caméra a bougé de 10 m ---- */
function trVoir(cx, cz) {
  const [rin, rout] = trRayons(), c = TR.T * TR.C, demi = c * .71; TR.vx = cx; TR.vz = cz; TR.sale = false;
  for (let k = 0; k < TR.n; k++) { const b = TR.bouts[k], d = Math.hypot(b.x - cx, b.z - cz) - b.r; if (d - 16 < rin) trTache("b", k); if (d - 60 < rin) trTache("d", k); }
  for (let tj = Math.floor((cz - rin - demi) / c); tj <= Math.floor((cz + rin + demi) / c); tj++) for (let ti = Math.floor((cx - rin - demi) / c); ti <= Math.floor((cx + rin + demi) / c); ti++)
    if (Math.hypot((ti + .5) * c - cx, (tj + .5) * c - cz) - demi < rin) trTache("s", ti, tj);
  TR.file.length = 0;
  for (const t of TR.taches.values()) {
    t.d = Math.hypot(t.x - cx, t.z - cz) - t.r; t.p = t.d + (t.type === "d" ? 25 : 0);   // à distance égale : le sol et la route d'abord
    if (t.d > rout) trEffacer(t); else if (t.etat < 2) TR.file.push(t);
  }
  TR.file.sort((a, b) => a.p - b.p);
}
function trAvancer(t) {   // un pas de plus (le décor d'un tronçon impair : ses deux voisins pairs d'abord)
  if (t.type === "d" && t.k % 2 && !t.gen) for (const v of [t.k - 1, t.k + 1]) if (v >= 0 && v < TR.n) { const o = trTache("d", v); if (o.etat < 2) { t = o; break; } }
  if (!t.gen) { t.gen = TR_GENRES[t.type](t); t.etat = 1; }
  if (t.gen.next().done) { t.etat = 2; t.gen = null; TR.stats.faites++; }
}
/* chaque image (jeu.js), après la caméra : quelques millisecondes de construction. tout : finir tout ce qui est voulu (une capture, un contrôle) */
function tronconsMaj(tout, x, z) {
  if (!TRONCONS) return;
  const p = camera.position, t0 = performance.now(); if (x === undefined) { x = p.x; z = p.z; }
  if (TR.sale || Math.hypot(x - TR.vx, z - TR.vz) > 10) trVoir(x, z);
  const image = clamp(t0 - TR.t, 0, 100); TR.t = t0;   // la durée de l'image d'avant : le budget est une part du temps (un cinquième), 3 ms à 60 images/s, plus sur une machine lente
  let budget = tout === true ? 1e9 : Math.max(typeof S !== "undefined" && !S.mode ? 12 : 3, image * .2), pas = 0;   // au menu, rien ne presse le jeu : on construit plus vite
  const urgent = typeof tout === "number" ? tout : TR.URGENT; let force = tout === true, presse = false;
  while (TR.file.length) {
    const t = TR.file[0]; if (t.etat === 2 || t.mort) { TR.file.shift(); continue; }
    if (t.d > urgent) {
      if (t.d < Math.min(VISION.b1, B1) && !force) { force = true; budget = Math.max(8, image * .5); TR.stats.retard++; }   // quelque chose manque là où l'on voit : on force un peu
      if (performance.now() - t0 > budget) break;
    }
    else presse = true;   // tout près et pas encore là (un départ, un saut) : fait d'un coup
    trAvancer(t); pas++;
  }
  if (TR.halos) { TR.halos = false; refaireHalos(); }
  if (pas) { const ms = performance.now() - t0, s = TR.stats; s.ms += ms; s.images++; if (tout === undefined && !presse) s.pire = Math.max(s.pire, ms); }   // (pire : en route, hors des sauts)
}
function tronconsDemarrer() {   // au chargement, à la place de construireTerrain, construireRives, construirePiste et construireDecor
  const P = PISTE; TR.n = Math.ceil(LONG / TR.L); TR.piste = fabriquePiste(); MONDE.foret = [];
  for (let k = 0; k < TR.n; k++) {   // le cercle qui entoure chaque tronçon de piste
    const a = k * TR.L, b = Math.min(a + TR.L, LONG); let xa = 1e9, xb = -1e9, za = 1e9, zb = -1e9;
    for (let i = a; i <= b; i++) { xa = Math.min(xa, P.X[i]); xb = Math.max(xb, P.X[i]); za = Math.min(za, P.Z[i]); zb = Math.max(zb, P.Z[i]); }
    TR.bouts.push({x: (xa + xb) / 2, z: (za + zb) / 2, r: Math.hypot(xb - xa, zb - za) / 2});
  }
  const a = at(S.s), complet = PARAMS.has("s") || PARAMS.has("fige") || PARAMS.has("banc");   // une vue de contrôle : tout, tout de suite
  tronconsMaj(complet ? true : 230, a.x, a.z);   // sinon : ce qui est près d'abord, le reste pendant le menu
}
window.__troncons = () => { const o = {s: [0, 0], b: [0, 0], d: [0, 0]}; let tri = 0; for (const t of TR.taches.values()) { o[t.type][t.etat === 2 ? 1 : 0]++; for (const m of t.mailles) tri += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; }
  return Object.assign({sol: o.s, bandes: o.b, decors: o.d, triangles: Math.round(tri), attente: TR.file.length, rayons: trRayons()}, TR.stats, {ms: Math.round(TR.stats.ms), pire: +TR.stats.pire.toFixed(1)}); };
