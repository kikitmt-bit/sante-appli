/* ============ les raretés du ciel (17/11, Kiki : « un avion qui passe, assez rare : tous les 10 km à peu près, une chance de l'apercevoir ;
   des choses qu'on voit très rarement, et quand on les voit, un vrai effet waouh ») ============ */
// Chaque rareté a sa fréquence moyenne en VRAIS kilomètres (ceux de la machine) : à chaque mètre avancé, une petite chance qu'elle passe.
// Elle ne passe qu'en avançant (pas au menu, pas à l'arrêt, pas pendant le film de fin), une seule à la fois, et seulement si le temps qu'il fait
// et l'heure s'y prêtent. Tout se passe dans le ciel lointain (CIEL.loin, rendu.js : derrière le monde). Rien n'est gardé ni envoyé.
// Essai : ?rare=avion (ou montgolfiere, etoile, roucool, legendaire) la fait passer tout de suite, puis toutes les 40 s ; window.__rare("avion").
const RARETES = {
  avion: {km: 10, duree: 38, quand: (m, nuit) => m.couvert < .85},
  montgolfiere: {km: 16, duree: 70, quand: (m, nuit) => nuit < .3 && m.pluie < .05 && m.vent < .7},
  etoile: {km: 1.2, duree: 1.4, quand: (m, nuit) => nuit > .7 && m.couvert < .5},
  roucool: {km: 4, duree: 24, quand: (m, nuit) => nuit < .4 && m.pluie < .3},
  legendaire: {km: 35, duree: 16, quand: (m, nuit) => m.pluie < .3 && m.orage < .1},
};
const RARE = {actif: null, essai: PARAMS.get("rare"), prochainEssai: 4, vu: []};
let MAT_RARE_ = null;   // éclairée par le soleil en paliers comme le reste du monde, à peine voilée par l'air (celle des repères lointains noie leur pied dans la brume)
const MAT_RARE = () => MAT_RARE_ || (MAT_RARE_ = new THREE.ShaderMaterial({vertexColors: true, side: THREE.DoubleSide, uniforms: {uSoleil: {value: SOLEIL}, uTeinte: COMMUNS.uTeinte, uVoile: COMMUNS.uBrume},
  vertexShader: "varying vec3 vC, vN; void main() { vC = color; vN = mat3(modelMatrix) * normal; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }",
  fragmentShader: "uniform vec3 uSoleil, uTeinte, uVoile; varying vec3 vC, vN; void main() { float l = .6 + .4 * (dot(normalize(vN), uSoleil) * .5 + .5); l = floor(l * 5. + .5) / 5.; gl_FragColor = vec4(mix(vC * l * uTeinte, uVoile, .18), 1.); }"}));
function capVue() { const v = new THREE.Vector3(); camera.getWorldDirection(v); return Math.atan2(v.x, -v.z); }   // vers où regarde la caméra (0 = −z)
const versCap = (cap, d, y) => new THREE.Vector3(Math.sin(cap) * d, y, -Math.cos(cap) * d);
/* une traversée du ciel : de gauche à droite (ou l'inverse) devant soi, à « d » mètres, à la hauteur y ; le groupe suit, tourné dans le sens de la marche */
function traversee(g, t, o) { const u = clamp(t / o.duree, 0, 1), c = o.cap + o.sens * lerp(-o.ouvre, o.ouvre, u), p = versCap(c, o.d, o.y + (o.monte || 0) * u);
  g.position.copy(p); g.rotation.set(0, -c + (o.sens < 0 ? Math.PI : 0), 0); g.userData.c = c; return u; }   // (son x local suit la marche : vu de côté)

/* ---- les recettes : un groupe à poser dans CIEL.loin, et ce qu'il fait à chaque image ---- */
const DESSINS_RARES = {
  avion(o) {   // un avion de ligne blanc, empennage rouge à Poké Ball, deux traînées de condensation qui s'effilochent derrière lui
    const F = new Forme(), blanc = hex("#F4F4F0"), gris = hex("#B8BEC8"), rouge = hex("#D83830"), vitre = hex("#3C4A68");
    F.boite(0, -1.6, 0, 34, 3.4, 3.4, blanc, {haut: blanc}); for (const s of [-1, 1]) F.quad([-17, -.9, s * 1.72], [17, -.9, s * 1.72], [17, -.3, s * 1.72], [-17, -.3, s * 1.72], rouge, [0, 0, s]); F.boite(0, -1.75, 0, 33, .35, 3.3, hex("#3C7CD8")); F.boite(18.5, -1.2, 0, 3, 2.6, 2.6, blanc); F.boite(20.6, -.8, 0, 1.4, 1.8, 1.8, gris);
    F.boite(-18, -1, 0, 3, 2.6, 2.4, blanc); F.poly([[-16, 1.6, 0], [-21, 1.8, 0], [-22.4, 8.5, 0], [-19.5, 8.5, 0]], rouge, [0, 0, 1]);
    for (const s of [-1, 1]) { F.poly([[4, -.6, s * 1.6], [-4, -.6, s * 1.6], [-8, -.2, s * 19], [-5.5, -.2, s * 19]], gris, [0, 1, 0]); F.boite(1, -2.6, s * 6.5, 5, 1.6, 1.6, gris); F.poly([[-17, .4, s * 1], [-20.5, .4, s * 1], [-22, .5, s * 7], [-20, .5, s * 7]], gris, [0, 1, 0]); }
    for (let x = -13; x < 15; x += 1.6) for (const s of [-1, 1]) F.quad([x, .1, s * 1.72], [x + .8, .1, s * 1.72], [x + .8, .8, s * 1.72], [x, .8, s * 1.72], vitre, [0, 0, s]);
    const g = new THREE.Group(), m = F.maille(MAT_RARE()); m.frustumCulled = false; g.add(m); g.scale.setScalar(2.2);
    const traine = [], matT = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: .85, depthWrite: false}), geo = new THREE.BoxGeometry(1, 1, 1);
    let dernier = 0;
    return {g, maj(t, dt) { traversee(g, t, o);
      if (t - dernier > .18) { dernier = t; for (const s of [-1, 1]) { const b = new THREE.Mesh(geo, matT.clone()); b.position.copy(g.localToWorld(new THREE.Vector3(-4, -2.6, s * 6.5))); b.rotation.copy(g.rotation); b.scale.set(9, 2.2, 2.2); b.frustumCulled = false; b.userData.t = t; CIEL.loin.add(b); traine.push(b); } }
      for (let k = traine.length - 1; k >= 0; k--) { const b = traine[k], age = t - b.userData.t; b.scale.y = b.scale.z = 1.2 + age * .45; b.material.opacity = .85 * Math.max(0, 1 - age / 14); if (age > 14) { CIEL.loin.remove(b); b.material.dispose(); traine.splice(k, 1); } } },
      fin() { for (const b of traine) { CIEL.loin.remove(b); b.material.dispose(); } }};
  },
  montgolfiere(o) {   // une montgolfière à bandes de couleur, sa nacelle en osier, qui dérive lentement en montant
    const F = new Forme(), cols = [["#D83830", "#F0C030"], ["#3C7CD8", "#F4F4F0"], ["#3CA058", "#F0A030"], ["#9050C0", "#F0C030"]][Math.floor(Math.random() * 4)].map(hex);
    const prof = [[0, 1.6], [2, 4.2], [5, 6.6], [8.5, 7.4], [11.5, 6.6], [14, 4.4], [15.6, 1.5]];
    for (let k = 0; k + 1 < prof.length; k++) for (let i = 0; i < 12; i++) { const a0 = i / 12 * Math.PI * 2, a1 = (i + 1) / 12 * Math.PI * 2, [y0, r0] = prof[k], [y1, r1] = prof[k + 1], c = cols[i % 2];
      F.quad([Math.cos(a0) * r0, y0, Math.sin(a0) * r0], [Math.cos(a1) * r0, y0, Math.sin(a1) * r0], [Math.cos(a1) * r1, y1, Math.sin(a1) * r1], [Math.cos(a0) * r1, y1, Math.sin(a0) * r1], k > 3 ? fonce(c, 1.08) : c, nrm([Math.cos(a0 + .26), .2, Math.sin(a0 + .26)])); }
    const osier = hex("#A87A44"); F.boite(0, -4.2, 0, 2.2, 1.6, 2.2, osier, {haut: fonce(osier, .8)}); for (const [x, z] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) F.boite(x, -2.6, z, .08, 2.8, .08, hex("#5A4A3A"));
    const g = new THREE.Group(), m = F.maille(MAT_RARE()); m.frustumCulled = false; g.add(m); g.scale.setScalar(1.6);
    return {g, maj(t) { traversee(g, t, o); g.position.y += Math.sin(t * .4) * 1.2; }};
  },
  etoile(o) {   // une étoile filante : un trait blanc qui file et s'éteint
    const m = new THREE.Mesh(new THREE.BoxGeometry(110, 3, 3), new THREE.MeshBasicMaterial({color: 0xFFFBE0, transparent: true, depthWrite: false})), g = new THREE.Group(); m.position.set(-55, 16, 0); m.rotation.z = .28; m.frustumCulled = false; g.add(m);   // (le trait penché, la tête en bas : elle tombe)
    return {g, maj(t) { const u = traversee(g, t, o); m.material.opacity = Math.sin(Math.PI * u); }, fin() { m.material.dispose(); }};
  },
  roucool(o) { return volee(o, "0016", 7, 9); },   // une volée de Roucool en V
  legendaire(o) { const n = ["0144", "0145", "0146"][Math.floor(Math.random() * 3)]; return volee(o, n, 1, 26); },   // Artikodin, Électhor ou Sulfura, immense, qui traverse le ciel
};
function volee(o, num, nb, taille) {   // des Pokémon qui volent (sprites de Donjon Mystère, vus de côté), en V
  const g = new THREE.Group(), oiseaux = [];
  planche(num + "/Walk").then(pl => { if (!pl || RARE.actif === null || RARE.actif.g !== g) return;
    for (let k = 0; k < nb; k++) { const N = new Pantin(pl, o.sens > 0 ? 2 : 6, taille); scene.remove(N.m); const i = TEINTES.indexOf(N.m.material); if (i >= 0) TEINTES.splice(i, 1);
      const rang = Math.ceil(k / 2), cote = k % 2 ? 1 : -1; N.m.position.set(-rang * 2.2 * taille / 9, (Math.random() - .5) * taille * .2, cote * rang * 2.6 * taille / 9); N.m.frustumCulled = false; g.add(N.m); oiseaux.push({N, ph: Math.random()}); } });
  return {g, maj(t) { traversee(g, t, o); for (const b of oiseaux) { b.N.image(b.N.pl.image(t + b.ph)); b.N.m.rotation.y = -g.userData.c - g.rotation.y; } },   // (chacun face à nous)
    fin() { for (const b of oiseaux) { b.N.m.material.dispose(); b.N.tex.dispose(); } }};
}

/* ---- faire passer une rareté ---- */
function lancerRare(nom) {
  const R0 = RARETES[nom]; if (!R0 || RARE.actif) return false;
  // (la caméra du jeu ne laisse voir que 0 à 6° au-dessus de l'horizon sous les compteurs : tout passe bas, au-dessus des arbres du fond)
  const cap = capVue(), haut = {avion: 64, montgolfiere: 38, etoile: 100, roucool: 26, legendaire: 48}[nom], loin = {avion: 820, montgolfiere: 520, etoile: 1000, roucool: 380, legendaire: 620}[nom];
  const o = {duree: R0.duree, cap, sens: Math.random() < .5 ? -1 : 1, d: loin * (.9 + Math.random() * .25), y: haut * (.85 + Math.random() * .3), ouvre: {avion: .75, montgolfiere: .32, etoile: .3, roucool: .6, legendaire: .7}[nom], monte: nom === "montgolfiere" ? 40 : 0};
  const r = DESSINS_RARES[nom](o); CIEL.loin.add(r.g); RARE.actif = Object.assign(r, {nom, t: 0, o}); RARE.vu.push(nom); return true;
}
function raretesMaj(dt, S) {
  const A = RARE.actif;
  if (A) { A.t += dt; A.maj(A.t, dt); if (A.t > A.o.duree) { CIEL.loin.remove(A.g); if (A.fin) A.fin(); RARE.actif = null; } return; }
  if (RARE.essai && RARETES[RARE.essai]) { RARE.prochainEssai -= dt; if (RARE.prochainEssai <= 0) { RARE.prochainEssai = 40; lancerRare(RARE.essai); } return; }
  if (!S.mode || S.pause || S.fige || FILM.actif || !(S.dist > 0)) { RARE.d0 = S.dist; return; }
  const dm = S.dist - (RARE.d0 === undefined ? S.dist : RARE.d0); RARE.d0 = S.dist; if (!(dm > 0) || dm > 50) return;
  for (const [nom, R0] of Object.entries(RARETES)) if (R0.quand(AMB.m, AMB.nuit || 0) && Math.random() < dm / (R0.km * 1000)) { lancerRare(nom); break; }
}
window.__rare = nom => lancerRare(nom || "avion");
