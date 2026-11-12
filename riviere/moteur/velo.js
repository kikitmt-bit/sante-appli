/* ============ le vélo : la monture « cycliste ». Ton Pokémon pédale sur un vrai vélo en volumes (12/11, Kiki) ============ */
// Le vélo est construit une fois, en pièces qui bougent : le cadre, la roue arrière, l'avant (fourche, roue, guidon, panier) qui braque,
// le pédalier qui tourne. Ton dresseur est dessus (cycliste.js : un personnage articulé dont les pieds suivent les pédales), ton Pokémon dans le panier.
// Ce qui bouge : les roues selon la vitesse ; le pédalier selon la vitesse (roue libre en descente rapide, arrêt) ; le vélo penche dans
// les virages (comme un vrai : selon la vitesse et la courbe), le guidon braque ; dans une côte raide, il se met en danseuse
// (debout, le vélo bascule d'un côté à l'autre à chaque coup de pédale) ; il se cabre au saut et s'écrase un peu à la réception ;
// il vibre sur les pavés ; à l'arrêt, il penche sur le côté. Au sol : son ombre (surfaces.js : uOmbre), sa trace et sa poussière sur la terre.
const ROUE = .33, ECH_VELO = 1.05, TOUR_PEDALE = 6.2;   // rayon d'une roue (m), taille du vélo, mètres parcourus par tour de pédale
const VELO = {g: null, roueAr: null, roueAv: null, avant: null, pedalier: null, roue: 0, pedale: 0, incl: 0, tangage: 0, braq: 0, choc: 0, debout: 0, pos: new THREE.Vector3()};

function tube(F, a, b, r, col, n = 5) {   // un tube de a à b (dans le repère du vélo)
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(d[0], d[1], d[2]) || 1, u = d.map(v => v / L), t = Math.abs(u[1]) < .9 ? [0, 1, 0] : [1, 0, 0];
  const x = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]], P = nrm(x(u, t)), Qv = x(u, P);
  for (let k = 0; k < n; k++) {
    const a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2, o = A => [P[0] * Math.cos(A) + Qv[0] * Math.sin(A), P[1] * Math.cos(A) + Qv[1] * Math.sin(A), P[2] * Math.cos(A) + Qv[2] * Math.sin(A)];
    const o0 = o(a0), o1 = o(a1), N = o((a0 + a1) / 2), m = (p, w) => [p[0] + w[0] * r, p[1] + w[1] * r, p[2] + w[2] * r];
    F.quad(m(a, o0), m(a, o1), m(b, o1), m(b, o0), col, N);
  }
}
function roueVelo(couleurs) {   // une roue, son axe sur z : pneu épais à facettes, jante, rayons, moyeu
  const F = new Forme(), n = 16, w = .05, r0 = ROUE, r1 = ROUE - .065, r2 = ROUE - .085, [pneu, jante, rayon] = couleurs;
  for (let k = 0; k < n; k++) {
    const a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1), cm = Math.cos((a0 + a1) / 2), sm = Math.sin((a0 + a1) / 2);
    const P = (r, z, c, s) => [c * r, s * r, z], ton = k % 2 ? pneu : fonce(pneu, .85);
    F.quad(P(r0, -w, c0, s0), P(r0, -w, c1, s1), P(r0, w, c1, s1), P(r0, w, c0, s0), ton, [cm, sm, 0]);   // la bande de roulement
    for (const z of [-w, w]) { F.quad(P(r1, z, c0, s0), P(r1, z, c1, s1), P(r0, z, c1, s1), P(r0, z, c0, s0), ton, [0, 0, Math.sign(z)]);   // les flancs du pneu
      F.quad(P(r2, z * .5, c0, s0), P(r2, z * .5, c1, s1), P(r1, z, c1, s1), P(r1, z, c0, s0), jante, [0, 0, Math.sign(z)]); }   // la jante
  }
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + .2; tube(F, [0, 0, k % 2 ? .02 : -.02], [Math.cos(a) * r2, Math.sin(a) * r2, 0], .007, rayon, 3); }   // les rayons
  F.boite(0, -.035, 0, .07, .07, .1, jante);
  return F.maille();
}
function construireVelo() {
  const g = new THREE.Group(); g.rotation.order = "YXZ"; g.visible = false; g.scale.setScalar(ECH_VELO); scene.add(g); VELO.g = g;
  const cadre = hex("#D83830"), cadre2 = fonce(cadre, .8), gris = hex("#8A8E98"), noir = hex("#2C2C34"), blanc = hex("#F2F0EA"), roues = [hex("#34343C"), hex("#C8CCD4"), hex("#9EA2AC")];
  const AR = [-.52, ROUE, 0], PB = [-.02, .3, 0], SEL = [-.2, .84, 0], DIR = [.38, .86, 0], DIRB = [.43, .62, 0];
  // le cadre, la selle, le garde-boue et son feu, la chaîne
  const F = new Forme();
  tube(F, PB, SEL, .028, cadre); tube(F, SEL, DIR, .026, cadre); tube(F, PB, DIRB, .032, cadre); tube(F, DIRB, DIR, .034, cadre2);
  for (const z of [-.055, .055]) { tube(F, [PB[0], PB[1], z * .4], [AR[0], AR[1], z], .018, cadre2); tube(F, [SEL[0] + .02, SEL[1] - .06, z * .3], [AR[0], AR[1], z], .016, cadre2); }
  tube(F, SEL, [SEL[0] - .02, SEL[1] + .07, 0], .018, gris);
  F.boite(-.22, .9, 0, .3, .055, .15, noir, {haut: fonce(noir, 1.35)});   // la selle
  for (let k = 0; k < 9; k++) { const a0 = (25 + k * 16) * Math.PI / 180, a1 = (25 + (k + 1) * 16) * Math.PI / 180, r = ROUE + .045, P = (a, z) => [AR[0] - Math.cos(a) * r, AR[1] + Math.sin(a) * r, z];   // le garde-boue arrière
    F.quad(P(a0, -.06), P(a1, -.06), P(a1, .06), P(a0, .06), k % 2 ? cadre : fonce(cadre, .9), [-Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2), 0]); }
  F.matiere(4).boite(AR[0] - ROUE - .07, AR[1] + .1, 0, .04, .07, .08, hex("#FF3828")).matiere(2);   // le feu arrière (il brille toujours)
  tube(F, [PB[0], PB[1] + .1, .06], [AR[0], AR[1] + .05, .06], .008, noir, 3); tube(F, [PB[0], PB[1] - .1, .06], [AR[0], AR[1] - .05, .06], .008, noir, 3);   // la chaîne
  F.disque(PB[0], PB[1], .066, .11, .11, gris, 0, Math.PI * 2, 14);
  g.add(F.maille());
  // la roue arrière
  VELO.roueAr = roueVelo(roues); VELO.roueAr.position.set(AR[0], AR[1], 0); g.add(VELO.roueAr);
  // le pédalier : deux manivelles opposées, deux pédales
  const P = new Forme();
  for (const [z, s] of [[.085, 1], [-.085, -1]]) { tube(P, [0, 0, z], [0, -s * .17, z], .016, gris, 4); P.boite(0, -s * .17 - .015, z + Math.sign(z) * .05, .1, .03, .09, noir); }
  VELO.pedalier = P.maille(); VELO.pedalier.position.set(PB[0], PB[1], 0); g.add(VELO.pedalier);
  // l'avant, qui braque autour de la douille : fourche, roue, guidon et poignées, phare, panier
  const av = new THREE.Group(); av.position.set(DIRB[0], 0, 0); g.add(av); VELO.avant = av;
  const A = new Forme(), x0 = -DIRB[0], FR = [.52 + x0, ROUE, 0];
  for (const z of [-.05, .05]) tube(A, [DIRB[0] + x0, DIRB[1], z * .5], [FR[0], FR[1], z], .017, gris);
  tube(A, [DIR[0] + x0, DIR[1], 0], [DIR[0] + x0 - .03, DIR[1] + .13, 0], .02, gris);
  tube(A, [DIR[0] + x0 - .03, DIR[1] + .13, -.3], [DIR[0] + x0 - .03, DIR[1] + .13, .3], .017, gris);
  for (const z of [-1, 1]) tube(A, [DIR[0] + x0 - .03, DIR[1] + .13, z * .2], [DIR[0] + x0 - .03, DIR[1] + .13, z * .32], .026, noir);
  A.matiere(7).boite(DIR[0] + x0 + .09, DIR[1] + .02, 0, .07, .08, .08, PAL.lumiere).matiere(2);   // le phare (allumé la nuit)
  const bx = DIR[0] + x0 + .2, by = DIR[1] - .06, l = .3, h = .2, p = .34;   // le panier blanc, ajouré
  A.boite(bx, by, 0, l, .02, p, blanc);
  for (let k = 0; k <= 3; k++) { const y = by + .02 + k * h / 3.2; A.boite(bx, y, -p / 2, l, .018, .018, blanc); A.boite(bx, y, p / 2, l, .018, .018, blanc); A.boite(bx + l / 2, y, 0, .018, .018, p, blanc); A.boite(bx - l / 2, y, 0, .018, .018, p, blanc); }
  for (const [dx, dz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) A.boite(bx + dx * l / 2, by, dz * p / 2, .02, h, .02, blanc);
  av.add(A.maille());
  VELO.roueAv = roueVelo(roues); VELO.roueAv.position.set(FR[0], FR[1], 0); av.add(VELO.roueAv);
  VELO.pieces = g.children.slice();   // les pièces du vélo (le cycliste viendra s'ajouter au groupe) : cachées quand il est en rollers
  MONDE.lumieres.push(VELO.lampe = {x: 0, y: -999, z: 0, c: PAL.lumiere, t: 3, toujours: false});   // la lumière du phare, qui suit le vélo
}

/* chaque image : le vélo suit la monture (monture.js), le Pokémon s'assoit dessus */
function animerVelo(t, dt, S, p, y, N) {
  if (!VELO.g) construireVelo();
  const g = VELO.g, i = idx(S.s), v = Math.max(0, S.vd || 0), k = PISTE.COURB[idx(S.s + 3)], pente = PISTE.PENTE[i], k1 = clamp(dt * 4, 0, 1), surf = surfaceEn(S.s);
  g.visible = true;
  const patins = typeof MACHINE !== "undefined" && MACHINE.monture === "patineur";   // en rollers : le même groupe (il penche, suit la pente, saute), sans le vélo
  if (VELO.patins !== patins) { VELO.patins = patins; for (const m of VELO.pieces) m.visible = !patins; }
  // pédaler ou non : roue libre dans une descente rapide, rien à l'arrêt ; en danseuse dans une côte raide
  const roule = v > .25, libre = pente < -.035 && v > 5, debout = pente > .055 && roule && !S.enAir && !patins;
  VELO.roue += v / (ROUE * ECH_VELO) * dt;
  const braquet = 1 + clamp(pente / .08, 0, 1) * .9;   // dans une côte, un petit braquet : les pédales tournent plus vite pour la même vitesse
  if (roule && !libre) VELO.pedale += v / ((typeof MACHINE !== "undefined" && MACHINE.tourVu) || TOUR_PEDALE) * (patins ? 1 : braquet) * Math.PI * 2 * dt;   // au skieur de fond : un tour de jambes de la machine = un tour de pédale (ou deux poussées)
  else {   // en roue libre, les pédales se mettent à plat ; à l'arrêt, la pédale gauche remonte devant, prête à repartir (cycliste.js : le pied droit à terre)
    const c0 = VELO.pedale, cible = libre ? Math.round((c0 - Math.PI / 2) / Math.PI) * Math.PI + Math.PI / 2 : Math.round((c0 - 1) / (Math.PI * 2)) * Math.PI * 2 + 1;
    VELO.pedale += (cible - c0) * clamp(dt * 3, 0, 1);
  }
  VELO.cadence = roule && !libre ? v / TOUR_PEDALE * braquet * 60 : 0;   // tours de pédale par minute (sans capteur de cadence, c'est elle qui s'affiche)
  VELO.debout += ((debout ? 1 : 0) - VELO.debout) * clamp(dt * 3, 0, 1);
  VELO.groupe = (VELO.groupe || 0) + (((libre && v > 9) ? 1 : 0) - (VELO.groupe || 0)) * clamp(dt * 3, 0, 1);   // en roue libre rapide : il se ramasse sur le vélo
  const c = VELO.pedale, balance = Math.sin(c) * VELO.debout;
  // pencher dans le virage (comme un vrai vélo : selon la vitesse et la courbe), braquer, se cabrer dans les sauts
  const incl = roule ? clamp(Math.atan(v * v * k / 9.8) * 1.5, -.42, .42) : patins ? 0 : .12;
  VELO.incl += (incl - VELO.incl) * k1; VELO.braq += (clamp(k * 7, -.3, .3) - VELO.braq) * k1;
  const tang = Math.atan(pente) + (M.air ? clamp(M.vy * .05, -.3, .35) : 0); VELO.tangage += (tang - VELO.tangage) * clamp(dt * 6, 0, 1);
  VELO.choc *= Math.exp(-dt * 7);
  const vibre = surf === "paves" && roule ? (h2(Math.floor(t * 30), 3) - .5) * .025 * Math.min(1, v / 5) : 0;
  const dy = -VELO.choc * .12 + vibre;
  g.position.set(p.x, y + dy, p.z); g.rotation.set(VELO.incl + balance * .09, Math.PI / 2 - at(S.s).h, VELO.tangage);
  VELO.roueAr.rotation.z = -VELO.roue; VELO.roueAv.rotation.z = -VELO.roue; VELO.pedalier.rotation.z = -c; VELO.avant.rotation.y = -VELO.braq + balance * .06;
  g.updateMatrixWorld();
  // le phare
  const ph = g.localToWorld(VELO.pos.set(.62, 1, 0)); Object.assign(VELO.lampe, {x: ph.x, y: patins ? -999 : ph.y, z: ph.z});
  // ton dresseur sur la selle (cycliste.js : il pédale, tient le guidon, se met en danseuse…), ton Pokémon dans le panier
  const e = {c, v, roule, libre, balance, vibre};
  if (typeof animerCycliste !== "function") return;   // une page assemblée pendant une mise à jour de l'appli (12/11) : le vélo seul, plutôt qu'un plantage
  if (patins && typeof animerPatineur === "function") { animerPatineur(t, dt, S, e); g.updateMatrixWorld(); animerCompagnon(t, dt, S, N, e); return; }
  animerCycliste(t, dt, S, e); g.updateMatrixWorld(); animerPanier(t, dt, S, N, e);
}
function cacherVelo() { if (VELO.g) { VELO.g.visible = false; VELO.lampe.y = -999; } if (typeof cacherFantomeVelo === "function") cacherFantomeVelo(); if (typeof nageur !== "undefined" && nageur && nageur.m.rotation.z) { nageur.m.rotation.z = 0; nageur.m.scale.set(nageur.l, nageur.h, 1); } }
