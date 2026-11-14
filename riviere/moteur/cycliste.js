/* ============ le cycliste : ton dresseur sur le vélo, ton Pokémon dans le panier (12/11 ; refait le 14/11, Kiki : « le même style low poly que le vélo ») ============ */
// Un personnage en volumes à facettes, comme le vélo et les arbres (couleurs unies, une couleur par facette, lumière en paliers), aux
// proportions d'un jeu Pokémon : grosse tête, grands yeux, mèches en pointes. Plus de rendu en pixels par-dessus (pixel.js, retiré le 14/11).
// Il porte les couleurs de TA carte du dresseur (peau, casquette = la couleur d'accent, veste = le haut, pantalon : D.dresseur, donné
// par l'appli ; ?tenue=Claire,Bleu,Vert,Noir pour essayer).
// LA GARDE-ROBE (14/11, Kiki : « un personnage évolutif, auquel on pourra changer les vêtements, les accessoires ») : le corps est nu
// et toujours le même ; chaque vêtement ou accessoire occupe UN emplacement (cheveux, haut, bas, chaussures, tete, dos, poignets) et
// dit ce qu'il dessine sur chaque membre (GARDE_ROBE). La tenue de base (TENUE_BASE) : t-shirt, pantalon, baskets, bracelets, sans
// casquette ni sac. Ajouter un habit = ajouter une entrée dans GARDE_ROBE ; le choisir : D.dresseur.habits (plus tard) ou, pour
// essayer, ?habits=casquette,sac,short (emplacement deviné par le nom). La casquette et le sac à dos de la première version y sont.
// Il est articulé : chaque membre est un volume rigide, posé à chaque image par cinématique inverse (deux os) dans le repère du vélo :
//   les pieds suivent les pédales (la cheville joue un peu), les mains tiennent le guidon (qui braque), le bassin roule à chaque coup ;
//   il est ASSIS SUR la selle (ASSISE : le bas des fesses touche le dessus de la selle) ; danseuse dans les côtes (debout, le corps
//   compense la bascule du vélo) ; en descente rapide, il se ramasse, pédales à plat ; la tête regarde dans le virage et reste plus
//   droite que le vélo ; il se soulève au saut et amortit à la réception ; à l'arrêt : il glisse de la selle, pose le pied à terre du
//   côté où le vélo penche, et regarde son Pokémon, qui se retourne vers lui.
// Ton Pokémon (le sprite du nageur) voyage dans le panier : il regarde la route, se retourne de temps en temps vers toi, saute de joie
// à fond de train et à chaque tour. Au menu, la caméra tourne lentement autour de vous deux (camera.js : VITRINE).
// Le fantôme (fantome.js) est une copie de ce vélo et de ce cycliste, en transparence (copierCycliste).
const TENUES = {
  peau: {"Très claire": ["#FFE0C4", "#ECB696", "#965C50"], "Claire": ["#FFC594", "#DE9473", "#7B4141"], "Mate": ["#DEA06C", "#BA784E", "#683A28"],
    "Foncée": ["#A26844", "#7A4C32", "#42261A"], "Très foncée": ["#70462E", "#543422", "#2A1810"]},   // clair, moyen, ombre (ceux de la carte du dresseur)
  tissu: {"Rouge": ["#6A2929", "#C53939", "#FF6A4A"], "Bleu": ["#1E2E6E", "#3860C8", "#70A0FF"], "Vert": ["#164E26", "#2E9646", "#76D676"],
    "Jaune": ["#74580A", "#E4B41E", "#FFE66E"], "Orange": ["#763A0A", "#E6761E", "#FFAE5E"], "Rose": ["#76264E", "#DE5E9E", "#FF9ECE"],
    "Violet": ["#3E1E66", "#7E46BE", "#B686EE"], "Noir": ["#14141C", "#343442", "#6A6A7E"], "Blanc": ["#606070", "#DADAE6", "#FFFFFF"]},   // ombre, couleur, reflet
  pantalon: {"Jean": ["#39397B", "#73A4C5"], "Noir": ["#1C1C26", "#4E4E5E"], "Gris": ["#42424E", "#9494A4"], "Beige": ["#745C3A", "#CCB280"],
    "Kaki": ["#344222", "#7A8E52"], "Bordeaux": ["#541822", "#A83E4E"], "Blanc": ["#6C6C7C", "#E8E8F2"]},
};
function tenue() {
  const t = (PARAMS.get("tenue") || "").split(","), d = (typeof D === "object" && D && D.dresseur) || {};
  const choix = (k, i, defaut) => { const v = t[i] || d[k]; return TENUES[k === "peau" ? "peau" : k === "pantalon" ? "pantalon" : "tissu"][v] ? v : defaut; };
  const peau = choix("peau", 0, "Claire"), cas = choix("casquette", 1, "Rouge"), ves = choix("veste", 2, "Rouge"), pan = choix("pantalon", 3, "Jean");
  const P = TENUES.peau[peau].map(hex), C = TENUES.tissu[cas].map(hex), V = TENUES.tissu[ves].map(hex), J = TENUES.pantalon[pan].map(hex);
  const sacBleu = ves === "Jaune" || ves === "Orange";   // le sac jaune ne doit jamais se perdre sur la veste
  const accBlanc = cas === ves;   // une couleur d'accent identique au haut : les détails passent en blanc, sinon on ne les voit plus
  return {peau: P[1], peauC: P[0], peauO: P[2], cas: C[1], casO: C[0], ves: V[1], vesO: V[0], vesC: V[2], pan: melange(J[0], J[1], .68), panO: melange(J[0], J[1], .42), panC: melange(J[1], [1, 1, 1], .25),
    acc: accBlanc ? hex("#F4F2EC") : C[1], accO: accBlanc ? hex("#C8C6C0") : C[0],
    chaussure: C[1], cheveux: peau === "Foncée" || peau === "Très foncée" ? hex("#241A16") : hex("#4A3226"),
    sac: hex(sacBleu ? "#3E6CC8" : "#F2C030"), sacO: hex(sacBleu ? "#2C4C96" : "#C8931C"), couchage: hex(sacBleu ? "#C8503C" : "#4C8A44"),
    blanc: hex("#F4F2EC"), blancO: hex("#C9C6BE"), noir: hex("#26242E"), oeil: hex("#2A2236"), gant: hex("#30303C"), rouge: hex("#E03C30"), sangle: hex("#3A3A46")};
}

/* ---- les volumes à facettes (dans le repère de chaque membre) ---- */
// un fuseau : une section en ellipse (a sur x, b sur z) de y0 à y1, n facettes ; lisse : ombré en rond (rare), sinon à facettes (le style du vélo)
function fuseau(F, o) {
  const {cx = 0, cz = 0, y0, y1, a0, b0, a1 = a0, b1 = b0, col, n = 7, ph = Math.PI / n, lisse: L = false, bas = false, haut = false} = o, col2 = o.col2 || col;
  const pente = ((a0 + b0) - (a1 + b1)) / 2 / Math.max(.001, y1 - y0);
  const P = (t, y, a, b) => [cx + Math.cos(t) * a, y, cz + Math.sin(t) * b], Nr = t => nrm([Math.cos(t) * (b0 + b1), pente * (a0 + b0), Math.sin(t) * (a0 + a1)]);
  for (let i = 0; i < n; i++) {
    const t0 = ph + i / n * Math.PI * 2, t1 = ph + (i + 1) / n * Math.PI * 2, tm = (t0 + t1) / 2, n0 = L ? Nr(t0) : Nr(tm), n1 = L ? Nr(t1) : Nr(tm);
    const A = P(t0, y0, a0, b0), B = P(t1, y0, a0, b0), C = P(t1, y1, a1, b1), E = P(t0, y1, a1, b1);
    F.l(A, n0, col, F.md); F.l(B, n1, col, F.md); F.l(C, n1, col2, F.md); F.l(A, n0, col, F.md); F.l(C, n1, col2, F.md); F.l(E, n0, col2, F.md);
    if (bas) F.tri([cx, y0, cz], B, A, col, [0, -1, 0]);
    if (haut) F.tri([cx, y1, cz], E, C, col2, [0, 1, 0]);
  }
}
// une suite de fuseaux : anneaux [y, a, b] (et une couleur par tronçon) : un torse, une manche, une jambe qui s'affine
function anneaux(F, R, col, o = {}) {
  for (let i = 0; i < R.length - 1; i++) { const [y0, a0, b0] = R[i], [y1, a1, b1] = R[i + 1];
    fuseau(F, {cx: o.cx || 0, cz: o.cz || 0, y0, y1, a0, b0, a1, b1, col: typeof col === "function" ? col(i) : col, n: o.n || 7, bas: o.bas && i === 0, haut: o.haut && i === R.length - 2}); }
}
// une boule (ellipsoïde), couleur(n) : la couleur selon la direction ; garde(n) : ne garder qu'une partie ; plat : à facettes (par défaut)
function boule3(F, cx, cy, cz, rx, ry, rz, couleur, garde = null, nl = 10, nb = 6, plat = true) {
  const U = (i, j) => { const th = i / nl * Math.PI * 2, ph = -Math.PI / 2 + j / nb * Math.PI; return [Math.cos(ph) * Math.cos(th), Math.sin(ph), Math.cos(ph) * Math.sin(th)]; };
  const P = u => [cx + u[0] * rx, cy + u[1] * ry, cz + u[2] * rz], N = u => nrm([u[0] / rx, u[1] / ry, u[2] / rz]), col = typeof couleur === "function" ? couleur : () => couleur;
  for (let j = 0; j < nb; j++) for (let i = 0; i < nl; i++) {
    const A = U(i, j), B = U(i + 1, j), C = U(i + 1, j + 1), E = U(i, j + 1), m = nrm([A[0] + B[0] + C[0] + E[0], A[1] + B[1] + C[1] + E[1], A[2] + B[2] + C[2] + E[2]]);
    if (garde && !garde(m)) continue;
    const c = col(m), nf = N(m), n = plat ? () => nf : N;
    F.l(P(A), n(A), c, F.md); F.l(P(B), n(B), c, F.md); F.l(P(C), n(C), c, F.md); F.l(P(A), n(A), c, F.md); F.l(P(C), n(C), c, F.md); F.l(P(E), n(E), c, F.md);
  }
}
// un disque à plat, dans le plan (u, v)
function disqueVers(F, c, u, v, r, couleur, n = 14) {
  const N = nrm([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]), col = typeof couleur === "function" ? couleur : () => couleur;
  for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, p = a => [c[0] + (u[0] * Math.cos(a) + v[0] * Math.sin(a)) * r, c[1] + (u[1] * Math.cos(a) + v[1] * Math.sin(a)) * r, c[2] + (u[2] * Math.cos(a) + v[2] * Math.sin(a)) * r];
    F.tri(c, p(a0), p(a1), col((a0 + a1) / 2), N); }
}
// une Poké Ball à plat (le haut rouge, le bas blanc, la bande et le bouton) : c le centre, u vers le haut de l'emblème, v sur le côté
function emblemePokeball(F, c, u, v, r, T, decal) {
  const sur = k => [c[0] + decal[0] * k, c[1] + decal[1] * k, c[2] + decal[2] * k];
  disqueVers(F, c, u, v, r, T.noir, 12);
  disqueVers(F, sur(1), u, v, r * .86, a => Math.sin(a) > .12 ? T.rouge : Math.sin(a) < -.12 ? T.blanc : T.noir, 12);
  disqueVers(F, sur(2), u, v, r * .3, T.noir, 8); disqueVers(F, sur(3), u, v, r * .18, T.blanc, 8);
}
// une mèche : une pyramide à 4 pans (une couleur par pan : la lumière en paliers), de la base b vers la pointe, axe d, largeur r
function meche(F, b, d, l, r, col) {
  const A = nrm(d), ref = Math.abs(A[1]) < .9 ? [0, 1, 0] : [1, 0, 0], U = nrm([A[1] * ref[2] - A[2] * ref[1], A[2] * ref[0] - A[0] * ref[2], A[0] * ref[1] - A[1] * ref[0]]), W = [A[1] * U[2] - A[2] * U[1], A[2] * U[0] - A[0] * U[2], A[0] * U[1] - A[1] * U[0]];
  const S = [b[0] + A[0] * l, b[1] + A[1] * l, b[2] + A[2] * l], K = k => { const a = k * Math.PI / 2 + Math.PI / 4, c = Math.cos(a) * r, s = Math.sin(a) * r * .7; return [b[0] + U[0] * c + W[0] * s, b[1] + U[1] * c + W[1] * s, b[2] + U[2] * c + W[2] * s]; };
  for (let k = 0; k < 4; k++) { const p = K(k), q = K(k + 1), m = [(p[0] + q[0]) / 2 - b[0], (p[1] + q[1]) / 2 - b[1], (p[2] + q[2]) / 2 - b[2]]; F.tri(p, q, S, k % 2 ? col : fonce(col, .86), nrm([m[0] + A[0] * r * .4, m[1] + A[1] * r * .4, m[2] + A[2] * r * .4])); }
}

const CY = {g: null, T: null, parts: {}, habits: null, arret: 1, lacet: 0, tangage: 0, sac: 0, sacV: 0, regard: 0, prochainRegard: 9, saut: 0, joie: 0, tour: 0, pk: new THREE.Vector3()};
const LONGUEURS = {cuisse: .46, tibia: .45, bras: .29, avantBras: .28};
const ASSISE = 1.035;   // la hauteur du bassin assis, dans le repère du vélo : le dessus de la selle est à .955 (velo.js), le bas des fesses 8 cm sous le bassin
const MEMBRES = ["torse", "tete", "dos", "cuisse-1", "cuisse1", "tibia-1", "tibia1", "pied-1", "pied1", "patin-1", "patin1", "bras-1", "bras1", "avantBras-1", "avantBras1"];

/* ---- le corps : le même pour tous, sous les habits ----
   Repères : torse = l'origine au bassin, y le long du dos, z vers l'avant, x vers sa gauche ; tete = son centre, x vers l'avant, y en haut,
   z vers sa droite ; membres = y le long du membre, de l'articulation de départ à celle d'arrivée ; pied = y vers la pointe, z vers le haut. */
const CORPS = {
  torse(F, T, s, cache) {   // le bassin, le tronc (cachés par les habits qui les couvrent : sinon leurs facettes passeraient au travers), le cou
    if (!cache.has("bassin")) anneaux(F, [[-.075, .118, .092], [.02, .142, .108]], T.peau, {bas: true});
    if (!cache.has("tronc")) anneaux(F, [[.02, .142, .108], [.2, .15, .108], [.36, .17, .118], [.43, .13, .1], [.47, .07, .065]], T.peau, {haut: true});
    fuseau(F, {y0: .44, y1: .57, a0: .05, b0: .048, a1: .046, b1: .044, col: T.peau});   // le cou
  },
  tete(F, T) {
    // un crâne un peu plus large en haut, un menton plus étroit (la tête n'est pas une boule)
    boule3(F, 0, 0, 0, .148, .155, .142, T.peau, null, 10, 7);
    boule3(F, .02, -.06, 0, .118, .095, .112, T.peau, null, 8, 5);   // la mâchoire, les joues
    for (const s of [-1, 1]) {
      boule3(F, -.008, -.02, s * .14, .03, .044, .026, T.peau, null, 6, 4);   // les oreilles
      // les yeux : grands, un peu en amande, bien écartés (on les voit de trois-quarts), un reflet blanc ; le sourcil au-dessus, décidé
      boule3(F, .128, -.012, s * .064, .022, .042, .026, T.oeil, null, 6, 5);
      boule3(F, .146, .004, s * .058, .008, .013, .009, T.blanc, null, 5, 3);
      F.boite(.135, .046 + .004, s * .066 - .028, .02, .016, .056, fonce(T.cheveux, .9));
      boule3(F, .112, -.066, s * .084, .012, .011, .02, melange(T.peau, hex("#FF7070"), .35), null, 6, 4);   // les joues roses
    }
    meche(F, [.142, -.045, 0], [1, -.6, 0], .016, .014, fonce(T.peau, .88));   // le nez, tout petit
    // le sourire : un petit croissant sombre, plus haut aux coins
    for (let i = 0; i < 5; i++) { const z0 = -.034 + i * .017, z1 = z0 + .017, y = z => -.098 + Math.pow(z / .034, 2) * .014;
      F.quad([.133, y(z0), z0], [.133, y(z1), z1], [.131, y(z1) - .008, z1], [.131, y(z0) - .008, z0], melange(T.peauO, hex("#C04848"), .4), [1, 0, 0]); }
  },
  bras(F, T, s) { boule3(F, 0, 0, 0, .062, .062, .062, T.peau, null, 7, 4); anneaux(F, [[0, .058, .058], [.15, .05, .05], [LONGUEURS.bras, .044, .044]], T.peau, {n: 6}); },
  avantBras(F, T, s) {
    const L = LONGUEURS.avantBras; boule3(F, 0, 0, 0, .046, .046, .046, T.peau, null, 7, 4); anneaux(F, [[0, .044, .044], [.12, .045, .043], [L - .02, .035, .033]], T.peau, {n: 6});
    // la main fermée sur la poignée : une moufle à facettes et le pouce par-dessus
    boule3(F, 0, L + .03, .004, .046, .058, .042, T.peau, null, 7, 4);
    boule3(F, -s * .0, L + .02, .042, .018, .03, .018, T.peau, null, 5, 3);
  },
  cuisse(F, T, s, cache) { if (cache.has("cuisse")) return; boule3(F, 0, 0, 0, .085, .085, .085, T.peau, null, 7, 4); anneaux(F, [[0, .086, .086], [.25, .074, .076], [LONGUEURS.cuisse, .06, .062]], T.peau); },
  tibia(F, T, s, cache) { if (cache.has("tibia")) return; boule3(F, 0, 0, 0, .062, .062, .062, T.peau, null, 7, 4); anneaux(F, [[0, .058, .06], [.14, .056, .06], [LONGUEURS.tibia, .038, .04]], T.peau); },
  pied(F, T, s, cache) { if (cache.has("pied")) return; boule3(F, 0, .02, -.03, .045, .11, .04, T.peau, null, 6, 4); },
  patin(F, T, s) {   // le roller (même repère que la chaussure) : une platine à la couleur d'accent, quatre roues, le frein au talon
    F.boite(0, -.025, -.098, .05, .29, .022, T.accO);
    for (const x of [-.032, .032]) F.boite(x, -.025, -.118, .012, .27, .03, T.acc);
    for (const y of [-.135, -.06, .015, .09]) { boule3(F, 0, y, -.15, .022, .036, .036, hex("#F2C030"), null, 8, 4); boule3(F, 0, y, -.15, .026, .014, .014, T.sangle, null, 6, 3); }
    F.boite(0, -.19, -.13, .045, .04, .05, T.noir);
  },
};

/* ---- la garde-robe : chaque habit = un emplacement et ce qu'il dessine sur chaque membre (mêmes repères que le corps) ---- */
const GARDE_ROBE = {
  cheveux: {
    // des cheveux en pointes : une masse à facettes sur le crâne et la nuque, une frange en mèches sur le front, des pointes rabattues
    // vers l'arrière par le vent (de dos, c'est ce qu'on voit le plus : il faut qu'elles aient de l'allure)
    pointes: {tete(F, T, s, cache) {
      const c = T.cheveux, c2 = fonce(c, .82);
      boule3(F, -.012, .012, 0, .16, .165, .153, m => m[1] > .45 ? melange(c, [1, 1, 1], .1) : c, m => m[0] < .42 && m[1] > -.5 && !(m[0] > .1 && m[1] < .2) && !(cache.has("dessus") && m[1] > .05), 10, 7);
      boule3(F, -.05, -.07, 0, .12, .1, .13, c2, m => m[0] < -.1, 8, 5);   // la nuque
      if (!cache.has("dessus")) for (const [z, l, a] of [[-.09, .085, -.3], [-.035, .1, -.1], [.025, .1, .12], [.08, .08, .35]]) meche(F, [.1, .09, z], [.55, -.75, a * .5], l, .042, c);   // la frange
      for (const [y, z, l] of [[.12, 0, .13], [.07, -.08, .12], [.07, .08, .12], [.0, -.11, .11], [.0, .11, .11], [-.06, -.05, .1], [-.06, .05, .1], [.15, -.06, .1], [.15, .06, .1]]) if (!cache.has("dessus") || y < .05)   // sous un chapeau : seules celles de la nuque
        meche(F, [-.08, y, z], [-1, .18 - y * .9, z * 2.2], l, .05, (y * 100 + z * 50) % 2 > .5 ? c : c2);
      for (const s of [-1, 1]) meche(F, [.03, .02, s * .14], [-.1, -1, s * .25], .07, .03, c2);   // les pattes, devant les oreilles
    }},
  },
  haut: {
    // le t-shirt : à la couleur de ta veste, col rond et bords des manches à la couleur d'accent, une bande sur la poitrine et dans le dos
    tshirt: {cache: ["tronc"],
      torse(F, T) {
        const R = [[-.04, .126, .1], [.03, .15, .114], [.13, .153, .114], [.2, .157, .115], [.24, .163, .118], [.36, .182, .126], [.43, .14, .108], [.468, .082, .072]];
        anneaux(F, R, i => i === 0 ? T.vesO : i === 3 ? T.acc : T.ves, {n: 8, haut: true});
        fuseau(F, {y0: .455, y1: .49, a0: .083, b0: .074, a1: .075, b1: .068, col: T.acc, n: 8});   // le col
      },
      bras(F, T, s) { boule3(F, 0, 0, 0, .076, .076, .076, T.ves, m => m[1] < .6, 8, 5); anneaux(F, [[0, .074, .074], [.11, .068, .068]], T.ves, {n: 7}); fuseau(F, {y0: .11, y1: .135, a0: .07, b0: .07, col: T.acc, n: 7}); },
    },
  },
  bas: {
    // le pantalon : plus large en haut, un revers clair, la couture plus sombre sur le côté
    pantalon: {cache: ["bassin", "cuisse", "tibia"],
      torse(F, T) { anneaux(F, [[-.082, .124, .098], [.0, .148, .114], [.06, .152, .116]], T.pan, {n: 8, bas: true}); fuseau(F, {y0: .045, y1: .07, a0: .155, b0: .118, col: T.panO, n: 8}); },   // la ceinture
      cuisse(F, T, s) { boule3(F, 0, 0, 0, .092, .092, .092, T.pan, null, 7, 4); anneaux(F, [[0, .093, .093], [.25, .08, .082], [LONGUEURS.cuisse, .068, .07]], T.pan); },
      tibia(F, T, s) { boule3(F, 0, 0, 0, .07, .07, .07, T.pan, null, 7, 4); anneaux(F, [[0, .066, .068], [.3, .06, .062], [.37, .062, .064]], T.pan); fuseau(F, {y0: .36, y1: .41, a0: .068, b0: .07, col: T.panC}); },
    },
    short: {cache: ["bassin"],
      torse(F, T) { GARDE_ROBE.bas.pantalon.torse(F, T); },
      cuisse(F, T, s) { boule3(F, 0, 0, 0, .092, .092, .092, T.pan, null, 7, 4); anneaux(F, [[0, .093, .093], [.24, .086, .088]], T.pan); fuseau(F, {y0: .23, y1: .26, a0: .088, b0: .09, col: T.panC}); },
    },
  },
  chaussures: {
    // des baskets : à la couleur d'accent, semelle épaisse blanche, bout arrondi, une bande blanche sur le côté, la languette, une chaussette blanche
    baskets: {cache: ["pied"],
      tibia(F, T, s) { fuseau(F, {y0: .405, y1: LONGUEURS.tibia + .01, a0: .044, b0: .046, col: T.blanc}); },
      pied(F, T, s) {
        const c = T.chaussure, cO = fonce(c, .82);
        F.boite(0, -.1, -.072, .112, .25, .032, T.blanc, {haut: T.blanc});                    // la semelle
        F.boite(0, -.095, -.04, .1, .2, .07, c);                                                 // le dessus
        boule3(F, 0, .1, -.042, .056, .065, .05, c, m => m[2] > -.4 || m[1] > .2, 7, 4);       // le bout arrondi
        boule3(F, 0, .118, -.06, .058, .05, .022, T.blanc, null, 7, 3);                         // le bout de semelle
        F.boite(0, -.1, .015, .09, .1, .045, cO);                                                // le talon, jusqu'à la cheville
        for (const x of [-.051, .051]) F.boite(x, -.03, -.035, .006, .1, .028, T.blanc);        // la bande sur le côté
        F.boite(0, -.02, .03, .07, .1, .012, T.blanc);                                           // la languette
      },
    },
  },
  poignets: {
    bracelets: {avantBras(F, T, s) { fuseau(F, {y0: LONGUEURS.avantBras - .045, y1: LONGUEURS.avantBras - .005, a0: .042, b0: .04, col: T.acc, n: 7}); }},
  },
  tete: {
    // la casquette de la première version : une calotte à la couleur d'accent, le devant blanc frappé d'une Poké Ball, une visière
    casquette: {cache: ["dessus"], tete(F, T) {
      const cy = .03, c = T.cas;
      boule3(F, -.004, cy, 0, .168, .14, .164, m => m[0] > .52 && m[1] < .86 ? T.blanc : c, m => m[1] > -.08, 10, 5);
      boule3(F, -.004, cy + .138, 0, .022, .016, .022, T.casO, null, 6, 3);
      emblemePokeball(F, [.158, cy + .062, 0], [0, 1, 0], [0, 0, 1], .036, T, [.0025, 0, 0]);
      const arc = 6, vis = (a, r, y) => [Math.cos(a) * r * 1.02, y, Math.sin(a) * r * .9];
      for (let i = 0; i < arc; i++) { const a0 = -1.15 + 2.3 * i / arc, a1 = -1.15 + 2.3 * (i + 1) / arc;
        F.quad(vis(a0, .14, cy + .012), vis(a1, .14, cy + .012), vis(a1, .28, cy - .012), vis(a0, .28, cy - .012), c, [.15, 1, 0]);
        F.quad(vis(a0, .14, cy - .002), vis(a1, .14, cy - .002), vis(a1, .28, cy - .026), vis(a0, .28, cy - .026), T.casO, [-.1, -1, 0]); }
    }},
  },
  dos: {
    // le sac à dos de la première version : jaune (bleu sur une veste jaune), une poche frappée d'une Poké Ball, le sac de couchage roulé dessus
    sac: {
      torse(F, T) { for (const s of [-1, 1]) { tube(F, [s * .1, .47, -.11], [s * .105, .49, 0], .022, T.sangle, 4); tube(F, [s * .105, .49, 0], [s * .1, .36, .132], .022, T.sangle, 4); tube(F, [s * .1, .36, .132], [s * .12, .2, .13], .02, T.sangle, 4); } },
      dos(F, T) {
        fuseau(F, {cz: -.215, y0: .05, y1: .37, a0: .15, b0: .088, a1: .158, b1: .092, col: T.sac, n: 8, bas: true, haut: true});
        fuseau(F, {cz: -.222, y0: .27, y1: .4, a0: .166, b0: .1, a1: .155, b1: .094, col: T.sacO, n: 8, haut: true});
        fuseau(F, {cz: -.31, y0: .1, y1: .25, a0: .108, b0: .036, col: T.sac, n: 8, bas: true, haut: true});
        emblemePokeball(F, [0, .175, -.348], [0, 1, 0], [1, 0, 0], .056, T, [0, 0, -.0025]);
        tube(F, [-.19, .455, -.2], [.19, .455, -.2], .064, T.couchage, 8);
        for (const x of [-.19, .19]) disqueVers(F, [x, .455, -.2], [0, 1, 0], [0, 0, 1], .064, fonce(T.couchage, .78), 8);
      },
    },
  },
};
const TENUE_BASE = {cheveux: "pointes", haut: "tshirt", bas: "pantalon", chaussures: "baskets", poignets: "bracelets", tete: null, dos: null};
function habitsChoisis() {   // la tenue de base, puis ce que demande la carte du dresseur (plus tard : D.dresseur.habits), puis ?habits= pour essayer
  const H = Object.assign({}, TENUE_BASE), d = (typeof D === "object" && D && D.dresseur) || {};
  const dire = v => { for (const [empl, liste] of Object.entries(GARDE_ROBE)) if (liste[v]) H[empl] = v; else if (v === "sans-" + empl) H[empl] = null; };
  if (Array.isArray(d.habits)) d.habits.forEach(dire);
  (PARAMS.get("habits") || "").split(",").filter(Boolean).forEach(dire);
  return H;
}

function membre(nom, F) { const m = F.maille() || new THREE.Mesh(); m.matrixAutoUpdate = false; m.name = "cycliste-" + nom; CY.g.add(m); CY.parts[nom] = m; return m; }
function construireCycliste() {
  const T = CY.T = tenue(), g = CY.g = new THREE.Group(); g.name = "cycliste"; VELO.g.add(g);
  const H = CY.habits = habitsChoisis(), portes = Object.entries(H).filter(([, v]) => v).map(([e, v]) => GARDE_ROBE[e][v]);
  const cache = new Set(portes.flatMap(h => h.cache || []));   // ce que les habits couvrent : le corps ne le dessine pas
  for (const nom of MEMBRES) {
    const base = nom.replace(/-?1$/, ""), s = nom.endsWith("-1") ? -1 : 1, F = new Forme();
    if (CORPS[base]) CORPS[base](F, T, s, cache);
    for (const h of portes) if (h[base]) h[base](F, T, s, cache);
    membre(nom, F);
  }
  const tete = CY.parts.tete; tete.matrixAutoUpdate = true; tete.rotation.order = "YZX"; tete.scale.setScalar(1.14);   // une tête un peu grosse, comme dans les jeux
  for (const s of [-1, 1]) CY.parts["patin" + s].visible = false;
}

/* ---- la pose, à chaque image (tout dans le repère du vélo : x vers l'avant, y en haut, z vers la droite) ---- */
const V3 = () => new THREE.Vector3(), cy_A = V3(), cy_B = V3(), cy_J = V3(), cy_d = V3(), cy_w = V3(), cy_x = V3(), cy_y = V3(), cy_z = V3(), cy_p = V3(), cy_q = V3();
function orienter(m, A, dirY, pole) {   // un membre : son origine en A, son axe y vers dirY, son axe z du côté de pole
  cy_y.copy(dirY).normalize(); cy_z.copy(pole).addScaledVector(cy_y, -pole.dot(cy_y)).normalize(); cy_x.crossVectors(cy_y, cy_z);
  m.matrix.makeBasis(cy_x, cy_y, cy_z).setPosition(A); m.matrixWorldNeedsUpdate = true;
}
function deuxOs(m1, m2, A, T, l1, l2, pole, fin) {   // cinématique inverse : de A (hanche, épaule) vers T (cheville, main) ; fin reçoit le bout réel
  cy_d.subVectors(T, A); const d = cy_d.length() || 1e-4, dm = clamp(d, Math.abs(l1 - l2) + .01, (l1 + l2) * .999); cy_d.divideScalar(d);
  const ca = (l1 * l1 + dm * dm - l2 * l2) / (2 * l1 * dm), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
  cy_w.copy(pole).addScaledVector(cy_d, -pole.dot(cy_d)).normalize();
  cy_J.copy(A).addScaledVector(cy_d, l1 * ca).addScaledVector(cy_w, l1 * sa);
  orienter(m1, A, cy_q.subVectors(cy_J, A), pole);
  cy_q.subVectors(T, cy_J).normalize(); fin.copy(cy_J).addScaledVector(cy_q, l2); orienter(m2, cy_J, cy_q, pole);
}
// où sont les poignées et le fond du panier : ils tournent avec l'avant du vélo (velo.js : VELO.avant, autour de x = .43)
function avantVers(x, y, z, out) { const a = VELO.avant.rotation.y, c = Math.cos(a), s = Math.sin(a); return out.set(.43 + x * c + z * s, y, -x * s + z * c); }

const cy_P = V3(), cy_Y = V3(), cy_X = V3(), cy_Z = new THREE.Vector3(1, 0, 0), cy_H = V3(), cy_T = V3(), cy_fin = V3(), cy_pole = V3(), cy_sac = new THREE.Matrix4(), cy_m = new THREE.Matrix4();
function animerCycliste(t, dt, S, e) {   // e : ce que velo.js sait (c pédalier, v vitesse, roule, libre, balance)
  if (!CY.g) construireCycliste();
  for (const s of [-1, 1]) CY.parts["patin" + s].visible = false;
  const P = CY.parts, k = x => clamp(dt * x, 0, 1), L = LONGUEURS, c = e.c, deb = VELO.debout, grp = VELO.groupe || 0, air = M.sorti || 0, choc = VELO.choc;
  CY.arret += ((e.roule ? 0 : 1) - CY.arret) * k(2.2); const arr = lisse(0, 1, CY.arret), pedale = 1 - arr;
  // le bassin : sur la selle ; debout en danseuse ; reculé et bas quand il se ramasse ; glissé vers l'avant à l'arrêt
  cy_P.set(-.235, ASSISE + .008 * Math.abs(Math.sin(c)) * (1 - deb) * pedale, 0);
  cy_P.lerp(cy_p.set(-.13, 1.1, -e.balance * .07), deb).lerp(cy_p.set(-.275, ASSISE - .01, 0), grp * (1 - deb)).lerp(cy_p.set(-.1, .925, .03), arr);
  cy_P.y += .05 * air - .06 * choc;
  // le dos : penché vers le guidon, il roule un peu à chaque coup de pédale (et, en danseuse, contre la bascule du vélo)
  const th = lerp(lerp(lerp(.52, .8, deb), .98, grp * (1 - deb)), .2, arr) + .22 * choc, ro = (.05 * Math.sin(c) * (1 - deb) - e.balance * .16) * pedale;
  cy_Y.set(Math.sin(th), Math.cos(th) * Math.cos(ro), Math.cos(th) * Math.sin(ro));
  orienter(P.torse, cy_P, cy_Y, cy_Z); cy_X.setFromMatrixColumn(P.torse.matrix, 0);   // cy_X : vers sa gauche (z négatif)
  // le sac : il tressaute (un ressort) sur les bosses, les réceptions et un peu à chaque coup de pédale
  CY.sacV += (-CY.sac * 160 - CY.sacV * 9 + (choc > .05 ? -choc * 30 : 0) + (e.vibre || 0) * 600) * Math.min(dt, .05); CY.sac = clamp(CY.sac + CY.sacV * Math.min(dt, .05), -.12, .12);
  const ang = CY.sac + .025 * Math.sin(2 * c) * pedale * (e.roule ? 1 : 0);
  cy_sac.makeTranslation(0, .42, -.12).multiply(cy_m.makeRotationX(ang)).multiply(cy_m.makeTranslation(0, -.42, .12));
  P.dos.matrix.copy(P.torse.matrix).multiply(cy_sac); P.dos.matrixWorldNeedsUpdate = true;
  // la tête : au bout du cou, presque droite ; elle regarde dans le virage, vers le haut quand il se ramasse, vers son Pokémon à l'arrêt
  cy_H.copy(cy_P).addScaledVector(cy_Y, .47).addScaledVector(cy_p.copy(cy_Y).lerp(cy_q.set(0, 1, 0), .75).normalize(), .18);
  const tete = P.tete; tete.position.copy(cy_H);
  // à l'arrêt, il regarde tour à tour son Pokémon et la caméra (toi)
  let lv = -VELO.braq * 1.4, tv = lerp(-.1, .12, grp);
  if (arr > .5) {
    const toi = ((t * .16) % 1) > .42; tv = -.42; lv = 0;
    if (toi) { VELO.g.updateMatrixWorld(); cy_p.copy(camera.position); VELO.g.worldToLocal(cy_p).sub(cy_H);
      lv = clamp(-Math.atan2(cy_p.z, cy_p.x), -1.15, 1.15); tv = clamp(Math.atan2(cy_p.y, Math.hypot(cy_p.x, cy_p.z)), -.3, .35); }
  }
  CY.lacet += (lv - CY.lacet) * k(5); CY.tangage += (tv - CY.tangage) * k(5);
  const roulis = -(VELO.incl + e.balance * .09) * .55 + ro * .3;
  tete.rotation.set(roulis, CY.lacet, CY.tangage + Math.sin(c * 2) * .012 * pedale);
  // les jambes : les pieds sur les pédales (la cheville joue un peu) ; à l'arrêt, le pied du côté où le vélo penche se pose par terre
  const pied = VELO.incl >= 0 ? 1 : -1;
  for (const s of [-1, 1]) {
    const phi = s > 0 ? c : c + Math.PI, px = -.02 - s * .17 * Math.sin(c), py = .3 - s * .17 * Math.cos(c) + .015, tf = -.08 - .14 * Math.cos(phi);
    let fx = Math.cos(tf), fy = Math.sin(tf);
    cy_T.set(px - fx * .095 - fy * .075, py - fy * .095 + fx * .075, s * .135);
    if (s === pied && arr > 0) {   // le pied à terre : le sol, dans le repère du vélo penché
      const zs = s * .33; cy_T.lerp(cy_p.set(-.13, -zs * Math.tan(VELO.incl) + .08, zs), arr);
      fx = lerp(fx, 1, arr); fy = lerp(fy, 0, arr);
    }
    cy_A.copy(cy_P).addScaledVector(cy_X, -s * .095).addScaledVector(cy_Y, -.02);   // la hanche
    cy_pole.set(1, .25, s * .3).normalize();
    deuxOs(P["cuisse" + s], P["tibia" + s], cy_A, cy_T, L.cuisse, L.tibia, cy_pole, cy_fin);
    orienter(P["pied" + s], cy_fin, cy_q.set(fx, fy, 0), cy_p.set(-fy, fx, 0));
  }
  // les bras : des épaules aux poignées, les coudes vers l'extérieur (bien écartés quand il se ramasse)
  for (const s of [-1, 1]) {
    cy_A.copy(cy_P).addScaledVector(cy_Y, .425).addScaledVector(cy_X, -s * .17);
    avantVers(-.08, .99, s * .26, cy_T);
    cy_pole.set(-.55 - grp * .3, -.35, s * (1 + grp)).normalize();
    deuxOs(P["bras" + s], P["avantBras" + s], cy_A, cy_T, L.bras, L.avantBras, cy_pole, cy_fin);
  }
}

/* ---- en rollers (12/11, Kiki : au skieur de fond, « ça fait comme du ski, du roller ») : la poussée du patineur, les pieds en V ----
   Une jambe glisse sous le corps pendant que l'autre pousse vers l'arrière et l'extérieur, la pointe ouverte, puis revient en l'air ;
   le poids passe sur la jambe qui glisse ; le bras opposé à la jambe qui pousse part devant ; bassin bas, dos penché. Un tour de jambes
   de la machine = une poussée de chaque jambe (velo.js : VELO.pedale suit la cadence). En descente rapide, il se met en boule, pieds
   parallèles ; à l'arrêt, il se redresse, les bras le long du corps. Mêmes membres que le cycliste, plus les rollers. */
function animerPatineur(t, dt, S, e) {
  if (!CY.g) construireCycliste();
  const P = CY.parts, k = x => clamp(dt * x, 0, 1), L = LONGUEURS, c = e.c, air = M.sorti || 0, choc = VELO.choc, grp = VELO.groupe || 0;
  for (const s of [-1, 1]) P["patin" + s].visible = true;
  CY.arret += ((e.roule ? 0 : 1) - CY.arret) * k(2.2); const arr = lisse(0, 1, CY.arret), va = (1 - arr) * (1 - grp * .85);   // l'ampleur de la poussée
  const sc = Math.sin(c);
  // le bassin : bas quand il patine, plus bas en boule, debout à l'arrêt ; il passe au-dessus de la jambe qui glisse
  cy_P.set(-.03, lerp(lerp(.86 + .018 * Math.cos(2 * c) * va, .74, grp), .99, arr), -.075 * sc * va);
  cy_P.y += .05 * air - .07 * choc;
  const th = lerp(lerp(.5, .9, grp), .1, arr) + .2 * choc, ro = -.09 * sc * va;
  cy_Y.set(Math.sin(th), Math.cos(th) * Math.cos(ro), Math.cos(th) * Math.sin(ro));
  orienter(P.torse, cy_P, cy_Y, cy_Z); cy_X.setFromMatrixColumn(P.torse.matrix, 0);
  // le sac tressaute à chaque poussée
  CY.sacV += (-CY.sac * 160 - CY.sacV * 9 + (choc > .05 ? -choc * 30 : 0)) * Math.min(dt, .05); CY.sac = clamp(CY.sac + CY.sacV * Math.min(dt, .05), -.12, .12);
  cy_sac.makeTranslation(0, .42, -.12).multiply(cy_m.makeRotationX(CY.sac + .03 * Math.sin(2 * c) * va)).multiply(cy_m.makeTranslation(0, -.42, .12));
  P.dos.matrix.copy(P.torse.matrix).multiply(cy_sac); P.dos.matrixWorldNeedsUpdate = true;
  // la tête : droite, elle regarde loin devant (plus haut quand il est penché) et dans le virage
  cy_H.copy(cy_P).addScaledVector(cy_Y, .47).addScaledVector(cy_p.copy(cy_Y).lerp(cy_q.set(0, 1, 0), .75).normalize(), .18);
  const tete = P.tete; tete.position.copy(cy_H);
  CY.lacet += (-VELO.braq * 1.4 - CY.lacet) * k(5); CY.tangage += (-.1 + (th - .5) * .55 - CY.tangage) * k(5);
  tete.rotation.set(-VELO.incl * .55 + ro * .4, CY.lacet, CY.tangage);
  // les jambes : la cheville au-dessus des roues (18 cm), la trajectoire de la poussée, la pointe qui s'ouvre
  for (const s of [-1, 1]) {
    const ps = s > 0 ? c : c + Math.PI, ouvre = Math.pow(Math.sin(ps / 2), 2) * va, leve = Math.max(0, -Math.sin(ps)) * va;
    cy_T.set(.06 - .4 * ouvre, .185 + .09 * leve + .05 * air, s * (.1 + .26 * ouvre));
    const a = s * .38 * ouvre;
    cy_A.copy(cy_P).addScaledVector(cy_X, -s * .095).addScaledVector(cy_Y, -.02);   // la hanche
    cy_pole.set(1, .1, s * .35).normalize();
    deuxOs(P["cuisse" + s], P["tibia" + s], cy_A, cy_T, L.cuisse, L.tibia, cy_pole, cy_fin);
    orienter(P["pied" + s], cy_fin, cy_q.set(Math.cos(a), 0, Math.sin(a)), cy_p.set(0, 1, 0));
    P["patin" + s].matrix.copy(P["pied" + s].matrix); P["patin" + s].matrixWorldNeedsUpdate = true;
  }
  // les bras : le bras opposé à la jambe qui pousse part devant, l'autre derrière ; en boule, les mains dans le dos ; à l'arrêt, le long du corps
  for (const s of [-1, 1]) {
    cy_A.copy(cy_P).addScaledVector(cy_Y, .425).addScaledVector(cy_X, -s * .17);
    const fa = -s * sc * va;
    cy_T.copy(cy_A).add(cy_p.set(.06 + .34 * fa, -.44 + .14 * Math.max(0, fa), s * (.05 - .12 * Math.max(0, fa))));
    cy_T.lerp(cy_p.copy(cy_P).add(cy_q.set(-.25, .12, s * .12)), grp * (1 - arr));
    cy_T.lerp(cy_p.copy(cy_A).add(cy_q.set(.02, -.52, s * .05)), arr);
    cy_pole.set(-1, -.3, s * .6).normalize();
    deuxOs(P["bras" + s], P["avantBras" + s], cy_A, cy_T, L.bras, L.avantBras, cy_pole, cy_fin);
  }
}

/* ---- ton Pokémon court à côté de toi (en rollers) : un peu devant, à ta gauche, à sa taille ---- */
function animerCompagnon(t, dt, S, N, e) {
  if (!N) return;
  if (S.tour !== CY.tour) { if (S.tour > CY.tour) CY.joie = 2.6; CY.tour = S.tour; }
  CY.joie = Math.max(0, CY.joie - dt);
  cy_p.set(1.6, 0, -1.05); VELO.g.localToWorld(cy_p);
  const h = Math.min(N.h, .95), f = h / N.h, court = e.roule, joie = CY.joie > 0 && court;
  const kc = PISTE.COURB[idx(S.s + 2)];
  N.rangee(CY.arret > .6 ? 0 : kc > .028 ? 3 : kc < -.028 ? 5 : 4);
  N.image(court ? N.pl.image(t * (.9 + S.vn * 1.1)) : 0);
  const saut = joie ? Math.abs(Math.sin(t * 8.5)) * .25 : court ? Math.abs(Math.sin(t * (5 + S.vn * 6))) * .06 : 0;
  N.m.position.set(cy_p.x, cy_p.y + saut, cy_p.z); N.regarder(); N.m.rotation.z = 0; N.m.scale.set(N.l * f, h, 1);
}

/* ---- ton Pokémon, dans le panier ---- */
function animerPanier(t, dt, S, N, e) {
  if (!N) return;
  // ce qu'il fait : il regarde la route ; de temps en temps il se retourne vers toi ; à l'arrêt il te regarde ; il saute de joie à fond et à chaque tour
  if (S.tour !== CY.tour) { if (S.tour > CY.tour) CY.joie = 2.6; CY.tour = S.tour; }
  CY.joie = Math.max(0, CY.joie - dt); CY.prochainRegard -= dt;
  if (CY.prochainRegard <= 0) { CY.regard = 1.8; CY.prochainRegard = 14 + Math.random() * 16; }
  CY.regard = Math.max(0, CY.regard - dt);
  const fete = CY.joie > 0 || (S.vn > 1.02 && e.roule), versToi = CY.arret > .6 || CY.regard > 0;
  CY.saut = fete ? Math.abs(Math.sin(t * 8.5)) * .09 : CY.saut * Math.exp(-dt * 12);
  // sa place : le fond du panier (qui tourne avec le guidon), dans le monde
  avantVers(.15, .805, 0, CY.pk); VELO.g.localToWorld(CY.pk);
  // vers où il regarde, vu de la caméra : la route (l'avant du vélo) ou toi (l'arrière)
  cy_q.set(1, 0, 0).applyQuaternion(VELO.g.quaternion); if (versToi) cy_q.negate();
  const fx = CY.pk.x - camera.position.x, fz = CY.pk.z - camera.position.z, lg = Math.hypot(fx, fz) || 1, ax = fx / lg, az = fz / lg;
  N.rangee(((Math.round(Math.atan2(cy_q.x * -az + cy_q.z * ax, -(cy_q.x * ax + cy_q.z * az)) / (Math.PI / 4)) % 8) + 8) % 8);
  N.image(fete ? N.pl.image(t * 1.6) : 0);
  const l = Math.min(.4 * N.l / N.h, .44), hh = l * N.h / N.l;   // à la taille du panier, quel que soit le Pokémon
  N.m.position.set(CY.pk.x, CY.pk.y + CY.saut - VELO.choc * .05 + (e.vibre || 0), CY.pk.z);
  N.regarder(); N.m.rotation.z = -(VELO.incl + e.balance * .09) * .9; N.m.scale.set(l, hh, 1);
}

/* ---- le fantôme à vélo : une copie du vélo et du cycliste, presque blanche, en transparence ; il reprend la pose du tien ---- */
const FANTOME_VELO = {g: null, src: [], dst: [], avant: null};
function copierCycliste(sG, pantin, t) {
  const G = FANTOME_VELO;
  if (!G.g) {
    G.g = VELO.g.clone(true); G.g.name = "fantome-velo";
    const mat = new THREE.MeshBasicMaterial({vertexColors: true, transparent: true, opacity: .42, depthWrite: false});
    mat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace("#include <color_fragment>", "#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.88, .94, 1.), .7);"); };
    G.g.traverse(o => { if (o.isMesh) o.material = mat; }); scene.add(G.g);
    VELO.g.traverse(o => G.src.push(o)); G.g.traverse(o => G.dst.push(o));
    G.avant = G.dst[G.src.indexOf(VELO.avant)];
  }
  G.g.visible = sG !== null; if (sG === null) { return; }
  for (let i = 1; i < G.src.length; i++) { const a = G.src[i], b = G.dst[i]; if (!b) continue;
    b.visible = a.visible;
    if (a.matrixAutoUpdate) { b.position.copy(a.position); b.quaternion.copy(a.quaternion); b.scale.copy(a.scale); } else { b.matrix.copy(a.matrix); b.matrixWorldNeedsUpdate = true; } }
  const p = pose(sG, 1.8), i = idx(sG), k = PISTE.COURB[idx(sG + 3)];
  G.g.position.set(p.x, p.y, p.z); G.g.rotation.set(clamp(k * 22, -.3, .3), Math.PI / 2 - at(sG).h, Math.atan(PISTE.PENTE[i]));
  G.g.updateMatrixWorld();
  if (pantin && VELO.patins) {   // en rollers : son Pokémon court à côté de lui
    cy_p.set(1.6, 0, -1.05); G.g.localToWorld(cy_p); pantin.m.position.copy(cy_p); pantin.regarder(); pantin.rangee(4); pantin.image(pantin.pl.image(t * 1.2));
    const h = Math.min(pantin.h, .95); pantin.m.scale.set(pantin.l * h / pantin.h, h, 1);
  } else if (pantin) {   // son Pokémon (le fantôme du tien), dans le panier du fantôme
    const a = G.avant.rotation.y, cs = Math.cos(a), sn = Math.sin(a); cy_p.set(.43 + .15 * cs, .805, -.15 * sn); G.g.localToWorld(cy_p);
    pantin.m.position.copy(cy_p); pantin.regarder(); pantin.rangee(4); pantin.image(0);
    const h = .4, l = Math.min(h * pantin.l / pantin.h, .44); pantin.m.scale.set(l, l * pantin.h / pantin.l, 1);
  }
}
function cacherFantomeVelo() { if (FANTOME_VELO.g) FANTOME_VELO.g.visible = false; }
