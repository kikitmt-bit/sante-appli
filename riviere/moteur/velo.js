/* ============ le vélo : la monture « cycliste ». Ton Pokémon pédale sur un vrai vélo en volumes (12/11, Kiki) ============ */
// Le vélo est construit une fois, en pièces qui bougent : le cadre, la roue arrière, l'avant (fourche, roue, guidon, panier) qui braque,
// le pédalier qui tourne. Ton dresseur est dessus (cycliste.js : un personnage articulé dont les pieds suivent les pédales), ton Pokémon dans le panier.
// Ce qui bouge : les roues selon la vitesse ; le pédalier selon la vitesse (roue libre en descente rapide, arrêt) ; le vélo penche dans
// les virages (comme un vrai : selon la vitesse et la courbe), le guidon braque ; dans une côte raide, il se met en danseuse
// (debout, le vélo bascule d'un côté à l'autre à chaque coup de pédale) ; il se cabre au saut et s'écrase un peu à la réception ;
// il vibre sur les pavés ; à l'arrêt, il penche sur le côté. Au sol : son ombre (surfaces.js : uOmbre), sa trace et sa poussière sur la terre.
const ROUE = .31, PNEU = .034, ECH_VELO = 1.05, TOUR_PEDALE = 6.2;   // rayon d'une roue (m), demi-largeur du pneu, taille du vélo, mètres parcourus par tour de pédale
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
function roueVelo(couleurs) {   // une roue, son axe sur z : un pneu étroit à facettes, une jante claire, cinq bâtons épais (on les voit tourner, sans scintiller), le moyeu
  const F = new Forme(), n = 16, w = PNEU, r0 = ROUE, r1 = ROUE - .06, r2 = ROUE - .1, wj = w * .72, [pneu, jante, baton] = couleurs;
  for (let k = 0; k < n; k++) {
    const a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1), cm = Math.cos((a0 + a1) / 2), sm = Math.sin((a0 + a1) / 2);
    const P = (r, z, c, s) => [c * r, s * r, z], ton = k % 2 ? pneu : fonce(pneu, .85);
    F.quad(P(r0, -w, c0, s0), P(r0, -w, c1, s1), P(r0, w, c1, s1), P(r0, w, c0, s0), ton, [cm, sm, 0]);   // la bande de roulement
    F.quad(P(r2, -wj, c0, s0), P(r2, -wj, c1, s1), P(r2, wj, c1, s1), P(r2, wj, c0, s0), fonce(jante, .8), [-cm, -sm, 0]);   // le dedans de la jante
    for (const sg of [-1, 1]) {
      F.quad(P(r1, sg * w, c0, s0), P(r1, sg * w, c1, s1), P(r0, sg * w, c1, s1), P(r0, sg * w, c0, s0), ton, [0, 0, sg]);   // les flancs du pneu
      F.quad(P(r2, sg * wj, c0, s0), P(r2, sg * wj, c1, s1), P(r1, sg * w, c1, s1), P(r1, sg * w, c0, s0), jante, [0, 0, sg]);   // la jante
    }
  }
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + .3; tube(F, [Math.cos(a) * .03, Math.sin(a) * .03, 0], [Math.cos(a) * (r2 + .008), Math.sin(a) * (r2 + .008), 0], .018, baton, 4); }   // les bâtons
  tube(F, [0, 0, -.052], [0, 0, .052], .05, jante, 8);
  for (const sg of [-1, 1]) F.disque(0, 0, sg * .053, .05, .05, fonce(jante, .9), 0, Math.PI * 2, 8);
  return F.maille();
}
function gardeBoue(F, cx, cy, deg0, deg1, n, col) {   // un garde-boue : un arc au-dessus d'une roue, de l'angle deg0 (0 = vers l'arrière) à deg1
  const r = ROUE + .04, l = PNEU + .008;
  for (let k = 0; k < n; k++) { const a0 = (deg0 + (deg1 - deg0) * k / n) * Math.PI / 180, a1 = (deg0 + (deg1 - deg0) * (k + 1) / n) * Math.PI / 180, P = (a, z) => [cx - Math.cos(a) * r, cy + Math.sin(a) * r, z];
    F.quad(P(a0, -l), P(a1, -l), P(a1, l), P(a0, l), k % 2 ? col : fonce(col, .9), [-Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2), 0]); }
}
/* Le vélo (refait le 14/11, Kiki : « les pneus rentrent dans le cadre, c'est un peu fouillis »). Rien ne se traverse plus : la tête de
   fourche est au-dessus du pneu avant, la fourche et les haubans passent de chaque côté du pneu, les garde-boue aussi. Moins de petites
   pièces qui scintillent : des roues à bâtons au lieu de fins rayons, un carter blanc à la place de la chaîne, un panier plein en lattes.
   Ce que cycliste.js attend n'a pas bougé : le pédalier en (-.02, .3), la selle, les poignées, le fond du panier, le pivot de l'avant en x = .43. */
function construireVelo() {
  const g = new THREE.Group(); g.rotation.order = "YXZ"; g.visible = false; g.scale.setScalar(ECH_VELO); scene.add(g); VELO.g = g;
  const cadre = hex("#D83830"), cadre2 = fonce(cadre, .8), gris = hex("#8A8E98"), noir = hex("#2C2C34"), blanc = hex("#F2F0EA"), blanc2 = hex("#DCD8CC"), roues = [hex("#34343C"), hex("#ECEAE2"), hex("#B4B8C0")];
  const AR = [-.52, ROUE, 0], PB = [-.02, .3, 0], SEL = [-.2, .84, 0], DIR = [.385, .9, 0], DIRB = [.43, .72, 0], AV = .56, LARGE = PNEU + .03;   // LARGE : où passent la fourche et les haubans, de chaque côté du pneu
  // le cadre, la selle, le garde-boue et son feu, le carter
  const F = new Forme();
  tube(F, PB, SEL, .028, cadre); tube(F, SEL, DIR, .026, cadre); tube(F, PB, DIRB, .032, cadre); tube(F, DIRB, DIR, .036, cadre2);
  for (const z of [-1, 1]) { tube(F, [PB[0], PB[1], z * .045], [AR[0], AR[1], z * LARGE], .016, cadre2); tube(F, [SEL[0] - .01, SEL[1] - .1, z * .05], [AR[0], AR[1], z * LARGE], .014, cadre2); }
  tube(F, [AR[0], AR[1], -LARGE - .012], [AR[0], AR[1], LARGE + .012], .014, gris, 4);   // l'axe arrière
  tube(F, SEL, [SEL[0] - .02, SEL[1] + .07, 0], .018, gris);
  F.boite(-.22, .9, 0, .3, .055, .15, noir, {haut: fonce(noir, 1.35)});   // la selle
  gardeBoue(F, AR[0], AR[1], 20, 168, 9, cadre);
  F.matiere(4).boite(AR[0] - ROUE - .045, AR[1] + .085, 0, .04, .07, .07, hex("#FF3828")).matiere(2);   // le feu arrière (il brille toujours)
  // le carter de la chaîne : un disque blanc devant le plateau, une barre jusqu'au moyeu arrière, un petit disque au bout
  F.disque(PB[0], PB[1], .075, .118, .118, blanc, 0, Math.PI * 2, 12); F.disque(PB[0], PB[1], -.02, .1, .1, gris, 0, Math.PI * 2, 10);
  F.boite((PB[0] + AR[0]) / 2, PB[1] - .05, .069, AR[0] * -1 + PB[0], .1, .012, blanc, {haut: blanc2}); F.disque(AR[0], PB[1], .075, .05, .05, blanc, 0, Math.PI * 2, 8);
  F.disque(PB[0], PB[1], .0765, .035, .035, gris, 0, Math.PI * 2, 8);
  g.add(F.maille());
  // la roue arrière
  VELO.roueAr = roueVelo(roues); VELO.roueAr.position.set(AR[0], AR[1], 0); g.add(VELO.roueAr);
  // le pédalier : deux manivelles opposées, deux pédales (le milieu d'une pédale à 13,5 cm du cadre : là où cycliste.js pose le pied)
  const P = new Forme();
  for (const s of [-1, 1]) { tube(P, [0, 0, s * .092], [0, -s * .17, s * .092], .016, gris, 4); P.boite(0, -s * .17 - .015, s * .135, .1, .03, .09, noir); }
  VELO.pedalier = P.maille(); VELO.pedalier.position.set(PB[0], PB[1], 0); g.add(VELO.pedalier);
  // l'avant, qui braque autour de la douille : fourche, roue et son garde-boue, potence, guidon et poignées, phare, panier
  const av = new THREE.Group(); av.position.set(DIRB[0], 0, 0); g.add(av); VELO.avant = av;
  const A = new Forme(), x0 = -DIRB[0], FR = [AV + x0, ROUE, 0], GX = -.08, GY = .99;   // (GX, GY) : le guidon
  tube(A, [0, DIRB[1], -LARGE - .01], [0, DIRB[1], LARGE + .01], .02, gris, 4);   // la tête de fourche, au-dessus du pneu
  for (const z of [-1, 1]) tube(A, [0, DIRB[1], z * LARGE], [FR[0], FR[1], z * LARGE], .016, gris);
  tube(A, [FR[0], FR[1], -LARGE - .012], [FR[0], FR[1], LARGE + .012], .013, gris, 4);   // l'axe avant
  gardeBoue(A, FR[0], FR[1], 55, 150, 6, cadre);
  tube(A, [DIR[0] + x0, DIR[1], 0], [GX, GY, 0], .02, gris);   // la potence
  tube(A, [GX, GY, -.3], [GX, GY, .3], .017, gris);
  for (const z of [-1, 1]) tube(A, [GX, GY, z * .2], [GX, GY, z * .32], .026, noir);   // les poignées
  A.matiere(7).boite(.07, DIRB[1] - .02, 0, .07, .08, .08, PAL.lumiere).matiere(2);   // le phare (allumé la nuit), sur la tête de fourche
  // le panier : un fond, quatre côtés en lattes de deux blancs (sans jour : rien ne scintille, et ton Pokémon dépasse du bord), un rebord
  const bx = .15, by = .8, l = .3, h = .2, p = .34, nl = 5;
  A.boite(bx, by, 0, l, .02, p, blanc2);
  for (let k = 0; k < nl; k++) { const ton = k % 2 ? blanc : blanc2, x = bx - l / 2 + (k + .5) * l / nl, z = -p / 2 + (k + .5) * p / nl;
    for (const sg of [-1, 1]) { A.boite(x, by + .02, sg * p / 2, l / nl, h, .02, ton); A.boite(bx + sg * l / 2, by + .02, z, .02, h, p / nl, ton); } }
  for (const sg of [-1, 1]) { A.boite(bx, by + .02 + h, sg * p / 2, l + .04, .025, .04, blanc); A.boite(bx + sg * l / 2, by + .02 + h, 0, .04, .025, p + .04, blanc); }
  tube(A, [.02, DIRB[1], 0], [bx - .04, by, 0], .014, gris, 4);   // le support du panier
  for (const z of [-1, 1]) tube(A, [GX, GY, z * .1], [bx - l / 2, by + h * .8, z * .1], .011, gris, 4);
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
