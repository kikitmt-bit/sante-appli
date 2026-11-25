/* ============ Kanto, la ville et la variété (17/11, carte blanche de Kiki : « ressentir la ville », « énormément de diversité ») ============ */
// Des rues qui partent à droite et à gauche, des carrefours, un rond-point, la grande route qui continue quand on la quitte pour un chemin de terre,
// des boutiques, des arrêts de bus, des voitures garées, des feux ; des essences d'arbres par bosquets (bouleaux, pommiers, cerisiers, pins, arbres roux, saules).
// Aucune image : tout par le code, dans le style du monde. Même repère que les autres objets : x le long de la piste, z vers la piste, y vers le haut ;
// un objet posé sur la piste ("cote": "c") : x vers l'arrière, z vers la gauche.
// Rien ici ne tire dans le hasard du niveau (R) : chaque variation vient de la place de l'objet (hv) ; le reste du décor ne bouge donc pas d'un arbre.
Object.assign(RAYON, {rue: 3, carrefour: 0, rond_point: 0, route_suite: 0, magasin: 5.5, arret_bus: 1.6, banc: .8, voiture: 2, feu: .3, fontaine: 2.6, poteau_indicateur: .6,
  bouleau: 1.9, pommier: 2.4, cerisier: 2.4, pin: 2.6, roux: 2.3, saule: 2.8});

const DECOR_NEUF = NIVEAU.decor !== "classique";   // "decor": "classique" dans un niveau : le décor d'avant le 17/11 (kanto-1km reste identique à l'œil)
const hv = (F, k = 0) => h2(Math.round(F.ox * 3.1) + k * 13.7, Math.round(F.oz * 2.3) - k * 7.9);   // le tirage propre à un objet (sa place), k : le combientième
const terresDe = nom => { const T = (BIOME.terres || {})[nom] || {goudron: ["#6E7480", "#666C78", "#F2F0E2", "#F2F0E2"], terre: ["#D2B080", "#C4A070", "#A88658", "#FFFFFF"], paves: ["#BCB4A4", "#ACA494", "#7C766C", "#D4CEC0"]}[nom]; return {a: hex(T[0]), b: hex(T[1]), bord: hex(T[2]), ligne: hex(T[3])}; };

/* ---- dessiner à plat sur le sol (et par-dessus la piste là où l'on passe dessus) ---- */
function solRoute(X, Z) { let y = hauteur(X, Z); pres(X, Z); if (Q.e < .6 && !Q.bout) y = Math.max(y, PISTE.Y[Q.i]); return y; }
// une bande le long d'un axe (pts : [[x, z], …] dans le repère de l'objet), de d0 à d1 mètres de l'axe (+ : à gauche de l'axe) ; col2 : un ton sur deux, au hasard ;
// sauf : rien là où la piste passe déjà (un rond-point autour duquel on tourne) ; surf : peinte avec le matériau de cette surface de la piste
// ("goudron", "paves" : le même grain que la route, Forme.sol ; 17/11, Kiki : les plaques grises unies du rond-point « complètement buggées »)
function bandeSol(F, pts, d0, d1, col, dy = .05, col2 = null, sauf = false, surf = null) {
  F.va = 0; const L = [], S = [0];
  for (let k = 1; k < pts.length; k++) S.push(S[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  for (let k = 0; k < pts.length; k++) {
    const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)]; let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    const ligne = []; for (const d of [d0, d1]) { const [X, Z] = F.monde(pts[k][0] - tz * d, pts[k][1] + tx * d); ligne.push([X, solRoute(X, Z) + dy, Z]); }
    L.push(ligne); }
  for (let k = 0; k + 1 < L.length; k++) {
    if (sauf) { const [X, Z] = F.monde((pts[k][0] + pts[k + 1][0]) / 2, (pts[k][1] + pts[k + 1][1]) / 2); pres(X, Z); if (Q.e < -.4 && !Q.bout) continue; }
    const [A, B] = L[k], [C, D] = L[k + 1];
    if (surf) { for (const [p, sv, uv] of [[A, k, d0], [B, k, d1], [D, k + 1, d1], [A, k, d0], [D, k + 1, d1], [C, k + 1, d0]]) F.sol(surf, p[0], p[1], p[2], S[sv], uv); continue; }
    const c = col2 && h2(k * 1.7 + Math.round(F.ox), d0 * 3.3 + Math.round(F.oz)) > .55 ? col2 : col;
    for (const p of [A, B, D, A, D, C]) F.v(p[0], p[1], p[2], 0, 1, 0, c, 2); }
  return L;
}
/* (17/11, Kiki : « le chemin n'a aucun fondu, c'est vraiment abrupt ») un chemin de terre peint sur le sol comme le bas-côté d'une route :
   la terre du sol au milieu (sa matière, ses deux tons en taches), qui se fond dans ce qu'il y a autour (l'herbe, le bas-côté) sur fr mètres
   de chaque côté, le bord irrégulier ; et sur les fin derniers mètres, il s'efface dans l'herbe. Aucune couleur unie, aucun trait. */
function cheminFondu(F, pts, demi, fr = 2.2, fin = 12) {
  F.va = 0; const T = SOLS.terre || SOLS[Object.keys(SOLS)[0]], D = [-(demi + fr), -(demi + fr * .5), -demi * .6, demi * .6, demi + fr * .5, demi + fr], L = [], S = [0];
  for (let k = 1; k < pts.length; k++) S.push(S[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  const lg = S[S.length - 1];
  for (let k = 0; k < pts.length; k++) {
    const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)]; let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    const bout = lisse(0, fin, lg - S[k]);   // 0 au bout du chemin, 1 avant ses fin derniers mètres
    L.push(D.map((d, j) => { const [X, Z] = F.monde(pts[k][0] - tz * d, pts[k][1] + tx * d), y = solRoute(X, Z) + .06, g = couleurEn(X, Z);
      const tord = (bruit(X / 3.2 + 5, Z / 3.2 - 2) - .5) * 1.6, w = j === 0 || j === D.length - 1 ? 0 : (1 - lisse(demi - .4, demi + fr, Math.abs(d) + tord)) * bout;
      const t = T.c[(bruit(X / 5.5 + 9, Z / 5.5 + 2) > .56 ? 1 : 0) % T.c.length], hx = hauteur(X + 1.25, Z) - hauteur(X - 1.25, Z), hz = hauteur(X, Z + 1.25) - hauteur(X, Z - 1.25);
      return [X, y, Z, nrm([-hx / 2.5, 1, -hz / 2.5]), [lerp(g[0], t[0], w), lerp(g[1], t[1], w), lerp(g[2], t[2], w)]]; })); }
  for (let k = 0; k + 1 < L.length; k++) for (let j = 0; j + 1 < D.length; j++) {
    const A = L[k][j], B = L[k][j + 1], C = L[k + 1][j], E = L[k + 1][j + 1];
    for (const p of [A, B, E, A, E, C]) F.v(p[0], p[1], p[2], p[3][0], p[3][1], p[3][2], p[4], 0); }
}
// la face d'une bordure (un trottoir) à d mètres de l'axe : de dy0 à dy1 au-dessus du sol
function faceSol(F, pts, d, dy0, dy1, col) {
  F.va = 0;
  for (let k = 0; k + 1 < pts.length; k++) {
    const P = [pts[k], pts[k + 1]].map((p, j) => { const a = pts[Math.max(0, k + j - 1)], b = pts[Math.min(pts.length - 1, k + j + 1)]; let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; const [X, Z] = F.monde(p[0] - tz / l * d, p[1] + tx / l * d); return [X, solRoute(X, Z), Z]; });
    const [A, B] = P, N = nrm([B[2] - A[2], 0, A[0] - B[0]]);
    F.v(A[0], A[1] + dy0, A[2], N[0], 0, N[2], col, 2); F.v(B[0], B[1] + dy0, B[2], N[0], 0, N[2], col, 2); F.v(B[0], B[1] + dy1, B[2], N[0], 0, N[2], col, 2);
    F.v(A[0], A[1] + dy0, A[2], N[0], 0, N[2], col, 2); F.v(B[0], B[1] + dy1, B[2], N[0], 0, N[2], col, 2); F.v(A[0], A[1] + dy1, A[2], N[0], 0, N[2], col, 2); }
}
const axe = (x0, z0, x1, z1, pas = 3) => { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / pas)); return Array.from({length: n + 1}, (_, k) => [lerp(x0, x1, k / n), lerp(z0, z1, k / n)]); };
/* poser un autre objet du kit à un point de celui-ci, tourné de phi (radians) : sa face (+z) regarde alors (sin phi, cos phi) dans notre repère */
function sousObjet(F, nom, x, z, phi, o, R, K) {
  if (!OBJETS[nom]) return; const [X, Z] = F.monde(x, z), sv = [F.ox, F.oy, F.oz, F.lacet, F.k];
  F.poser(X, hauteur(X, Z), Z, F.lacet + phi, F.k); OBJETS[nom](F, Object.assign({_e: 99}, o), R, K); F.poser(...sv).matiere(2);
}

/* ---- une rue qui part de la route (ou un chemin de campagne) : l'axe va de (0, z0) dans le sens dir (±1 en z), sur L mètres ---- */
const RUE = {demi: 3, trot: 1.7, pasMaison: 12, recul: 8.7};
function maisonsRue(z0, dir, L) { const o = []; for (let d = 9; d < L - 4; d += RUE.pasMaison) for (const s of [-1, 1]) o.push([s * RUE.recul, z0 + dir * d]); return o; }
function empriseRue(z0, dir, L, ville, chemin) { const o = []; for (let d = 0; d <= L + 6; d += 6) o.push([0, z0 + dir * d, chemin ? 2.4 : ville ? 5.4 : 4]); if (ville) for (const [x, z] of maisonsRue(z0, dir, L)) o.push([x, z, 4.6]); if (ville) o.push([0, z0 + dir * (L + 8), 5.5]); return o; }
const ENSEIGNES = ["CAFÉ", "FLEURISTE", "CYCLES", "BAIES", "PÂTISSERIE", "LIBRAIRIE", "PRIMEUR", "BOULANGERIE", "OBJETS", "THÉ", "GLACES", "POKÉ-VÉLO"];
function dessinerRue(F, o, R, K, z0, dir, L, ville, chemin) {
  const T = terresDe(chemin ? "terre" : "goudron"), demi = chemin ? 1.5 : RUE.demi, pts = axe(0, z0, 0, z0 + dir * L), blanc = T.ligne;
  if (chemin) cheminFondu(F, axe(0, z0, 0, z0 + dir * L, 3), demi); else bandeSol(F, pts, -demi, demi, T.a, .05, T.b, false, "goudron");
  if (chemin) { const s = hv(F, 3) < .5 ? -1 : 1; for (let d = 8; d < L; d += 10) sousObjet(F, "buisson", s * (demi + 1.2), z0 + dir * d, 0, {}, R, K); return; }
  for (let d = 7; d < L - 2; d += 5) bandeSol(F, axe(0, z0 + dir * d, 0, z0 + dir * (d + 2.4), 1.2), -.07, .07, blanc, .07);   // la ligne du milieu
  bandeSol(F, axe(0, z0 + dir * 1.6, 0, z0 + dir * 2.1, .5), dir > 0 ? 0 : -demi + .2, dir > 0 ? demi - .2 : 0, blanc, .07);   // la ligne d'arrêt
  if (!ville) { for (const s of [-1, 1]) bandeSol(F, axe(0, z0 + dir * 2, 0, z0 + dir * L), s * (demi - .32), s * (demi - .17), blanc, .07);
    const s = hv(F, 6) < .5 ? -1 : 1; for (let d = 12; d < L; d += 11) if (hv(F, 7 + d) < .6) sousObjet(F, "arbre", s * (demi + 3.2), z0 + dir * d, 0, {}, R, K);   // une rangée d'arbres, d'un côté
    return; }
  for (let x = -demi + .5; x < demi - .3; x += 1) bandeSol(F, axe(x, z0 + dir * 2.8, x, z0 + dir * 5.4, 1.3), -.25, .25, blanc, .07);   // le passage piéton
  const pv = terresDe("paves"), tp = axe(0, z0 + dir * 2.4, 0, z0 + dir * L);
  for (const s of [-1, 1]) { bandeSol(F, tp, s * demi, s * (demi + RUE.trot), pv.a, .2, pv.b); faceSol(F, tp, s * demi, .03, .2, pv.bord); faceSol(F, tp, s * (demi + RUE.trot), 0, .2, pv.bord); }
  // de chaque côté : maisons et boutiques (la façade sur la rue), réverbères, voitures garées
  maisonsRue(z0, dir, L).forEach(([x, z], k) => { const s = Math.sign(x), t = hv(F, 20 + k); if (t < .12) return;
    const nom = k < 2 && t < .55 ? "magasin" : t > .9 ? "immeuble" : "maison";
    sousObjet(F, nom, x + (nom === "immeuble" ? s * 1 : 0), z, -s * Math.PI / 2, {varie: true, enseigne: ENSEIGNES[Math.floor(hv(F, 40 + k) * ENSEIGNES.length)]}, R, K); });
  for (let d = 9; d < L; d += 16) sousObjet(F, "lampadaire", (Math.floor(d / 16) % 2 ? 1 : -1) * (demi + .35), z0 + dir * d, 0, {}, R, K);
  for (let d = 12; d < L - 4; d += 7) if (hv(F, 60 + d) < .3) { const s = hv(F, 61 + d) < .5 ? -1 : 1; sousObjet(F, "voiture", s * (demi - 1.05), z0 + dir * d, (dir * s > 0 ? -1 : 1) * Math.PI / 2, {}, R, K); }
  sousObjet(F, hv(F, 9) < .6 ? "maison" : "immeuble", 0, z0 + dir * (L + 8), dir > 0 ? Math.PI : 0, {varie: true}, R, K);   // au bout, une façade ferme la rue
}
const longRue = o => o.long || (o.chemin ? 46 : 52);
EMPRISE.rue = o => empriseRue((o._e || .35) + .1, -1, longRue(o), o.ville !== false && !o.chemin, o.chemin);
Object.assign(OBJETS, {
  rue(F, o, R, K) {  // une rue qui part de la route, entre les maisons ("ville": false : une route de campagne ; "chemin": true : un chemin de terre)
    if (!DECOR_NEUF) return; dessinerRue(F, o, R, K, (o._e || 0) + .1, -1, longRue(o), o.ville !== false && !o.chemin, o.chemin); },
  carrefour(F, o, R, K) {  // un carrefour (sur la piste, "cote": "c") : une rue à gauche et une à droite ("cotes": "g" ou "d" : un seul côté), passages piétons, feux
    if (!DECOR_NEUF) return; const w = o.eau / 2, L = o.long || 52, ville = o.ville !== false, cotes = o.cotes || "gd";
    if (cotes.includes("g")) dessinerRue(F, o, R, K, w, 1, L, ville); if (cotes.includes("d")) dessinerRue(F, o, R, K, -w, -1, L, ville);
    if (!ville) return; const blanc = terresDe("goudron").ligne;
    for (const x0 of [-9.5, 6.5]) for (let z = -w + .5; z < w - .3; z += 1) bandeSol(F, axe(x0, z, x0 + 3, z, 1.5), -.25, .25, blanc, .06);   // les passages piétons sur la route
    for (const [x, z, phi] of [[-6.4, w + 1.1, Math.PI / 2], [6.4, -w - 1.1, -Math.PI / 2]]) sousObjet(F, "feu", x, z, phi, {}, R, K); },
  rond_point(F, o, R, K) {  // un rond-point, autour duquel la piste tourne (sur la piste, au milieu du virage ; "r" : le rayon de la piste) ; ses autres branches partent en rues
    if (!DECOR_NEUF) return; const w = o.eau / 2, r = o.r || 12, T = terresDe("goudron"), ri = r - w - .35, y0 = solLocal(F, 0, r), ville = o.ville !== false;
    const anneau = []; for (let k = 0; k <= 48; k++) { const t = k / 48 * Math.PI * 2; anneau.push([Math.sin(t) * r, r - Math.cos(t) * r]); }
    bandeSol(F, anneau, -w, w, T.a, .05, null, true, "goudron");
    for (let k = 0; k < 48; k += 2) bandeSol(F, anneau.slice(k, k + 2), w - .32, w - .17, T.ligne, .07, null, true);   // le bord intérieur, en pointillés
    F.cyl(0, y0 - .3, r, ri + .15, ri + .15, .55, 20, PAL.pierre[2], PAL.pierre[2]); F.rond(0, y0 + .26, r, ri, ri, PAL.herbes[1], 20);
    const t = hv(F, 1), haie = PAL.feuilles;
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; F.boule(Math.sin(a) * (ri - .7), y0 + .5, r + Math.cos(a) * (ri - .7), .75, .5, .75, haie, 0); }   // une haie basse tout autour
    if (t < .3) sousObjet(F, "fontaine", 0, r, 0, {}, R, K);
    else if (t < .6) statueBall(F, 0, y0 + .26, r);
    else if (t < .8) sousObjet(F, "arbre", 0, r, 0, {espece: false}, R, K);
    else sousObjet(F, "cerisier", 0, r, 0, {}, R, K);
    dessinerRue(F, o, R, K, 2 * r + w - .2, 1, o.long || 50, ville);   // la branche d'en face
    if (o.branches !== 1) dessinerRue(F, o, R, K, -w, -1, o.long || 50, ville); },   // et celle de droite
  route_suite(F, o, R, K) {  // là où l'on quitte la grande route pour un chemin (decor.js, JONCTIONS) : la route continue tout droit, puis tourne et s'en va
    if (!DECOR_NEUF) return; const T = terresDe(o.surface === "paves" ? "paves" : "goudron"), w = (o.large || 8) / 2, pts = cheminSuite(o), pv = o.surface === "paves";
    const bons = []; let y0 = null;
    for (const p of pts) { const [X, Z] = F.monde(p[0], p[1]); pres(X, Z); const loin = Math.abs(ecart(sLigne(Q.i), o._s)) > 50; if (loin && Q.e < w + 3) break; const y = hauteur(X, Z); if (y0 === null) y0 = y; if (Math.abs(y - y0) > 7) break; bons.push(p); }
    if (bons.length < 3) return;
    bandeSol(F, bons, -w, w, T.a, .05, T.b, false, pv ? "paves" : "goudron");
    if (!pv) { for (const s of [-1, 1]) bandeSol(F, bons.slice(2), s * (w - .34), s * (w - .19), T.ligne, .07); for (let k = 3; k + 1 < bons.length; k += 2) bandeSol(F, bons.slice(k, k + 2), -.07, .07, T.ligne, .07); }
    for (let k = 6; k < bons.length; k += 5) { const [x, z] = bons[k]; sousObjet(F, "poteau", x, z + (o.sens * o.vers > 0 ? -1 : 1) * (w + 1.8), 0, {}, R, K); }
    const cote = o.sens * o.vers > 0 ? -1 : 1;   // le poteau indicateur : du côté où part le chemin, face à qui arrive
    sousObjet(F, "poteau_indicateur", 4, cote * (w + 2.2), Math.PI / 2, {haut: VILLES[Math.floor(hv(F, 2) * VILLES.length)], bas: COINS[Math.floor(hv(F, 3) * COINS.length)], vers: cote}, R, K); },
});
const VILLES = ["JADIELLE", "ARGENTA", "AZURIA", "CARMIN", "CÉLADOPOLE", "LAVANVILLE", "PARMANIE", "SAFRANIA", "FUCHSIA", "BOURG PALETTE"];
const COINS = ["FORÊT DE JADE", "LE BOIS", "LA FERME", "L'ÉTANG", "LE MOULIN", "LES CHAMPS", "LA COLLINE", "LE VERGER"];
function cheminSuite(o) {   // l'axe de la route qui continue : 45 m tout droit, un virage de 35° qui l'éloigne du chemin, puis tout droit (dans le repère de l'objet)
  const dx = -(o.sens || 1), b = (o.sens || 1) * (o.vers || 1), pts = []; let x = dx * -4, z = 0, a = 0;
  for (let d = -4; d <= 130; d += 3) { pts.push([x, z]); if (d > 45 && d < 90) a = Math.min(35, a + 35 * 3 / 45); const t = a * Math.PI / 180; x += dx * Math.cos(t) * 3; z += b * Math.sin(t) * 3; }
  return pts; }
EMPRISE.route_suite = o => cheminSuite(o).filter((p, k) => k % 2 === 0 && k > 2).map(([x, z]) => [x, z, (o.large || 8) / 2 + 1.6]);
EMPRISE.carrefour = o => { const w = o.eau / 2, L = o.long || 52, v = o.ville !== false, c = o.cotes || "gd"; return [].concat(c.includes("g") ? empriseRue(w, 1, L, v) : [], c.includes("d") ? empriseRue(-w, -1, L, v) : []); };
EMPRISE.rond_point = o => { const w = o.eau / 2, r = o.r || 12, v = o.ville !== false; return [[0, r, r + w + 1.5]].concat(empriseRue(2 * r + w, 1, o.long || 50, v), o.branches !== 1 ? empriseRue(-w, -1, o.long || 50, v) : []); };
function statueBall(F, x, y, z) { const rouge = hex("#D83830"), blanc = hex("#F4F2EA"), noir = PAL.cadre;   // une grande Poké Ball de pierre peinte sur un socle
  F.boite(x, y, z, 1.6, 1.1, 1.6, PAL.pierre[1], {haut: PAL.pierre[2]}); const c = y + 1.1 + .8;
  F.dome(x, c, z, .8, .8, .8, [rouge, rouge, melange(rouge, BLANC, .25)], 10, true); F.dome(x, c, z, .8, -.8, .8, [blanc, blanc, blanc], 10, true);
  F.cyl(x, c - .06, z, .82, .82, .12, 12, noir); F.cyl(x, c - .14, z + .66, .2, .2, .28, 8, noir); }

/* ---- les objets de la ville ---- */
Object.assign(OBJETS, {
  magasin(F, o, R, K) {  // une boutique : grande vitrine, store rayé, enseigne ; un étage d'habitation au-dessus
    const t = hv(F), l = o.l || 7.4 + hv(F, 1) * 1.8, p = 6, d = p / 2, h = 5.6, mur = PAL.murs[["blanc", "creme", "jaune", "gris", "pierre"][Math.floor(hv(F, 2) * 5)]];
    const store = hex(["#D84838", "#3C7CD8", "#3CA058", "#E8A030", "#9050C0"][Math.floor(t * 5)]), toit = PAL.toits[["rouge", "bleu", "vert", "orange", "gris", "brun"][Math.floor(hv(F, 3) * 6)]];
    F.tapis(-l / 2 - .6, -d - .6, l / 2 + .6, d + 1, null, .74, 3);
    F.boite(0, -1.2, 0, l + .2, 1.55, p + .2, PAL.pierre[1]); F.boite(0, .35, 0, l, h - .35, p, mur);
    F.matiere(3).plaque(-l / 2 + .5, .55, l * .22, 2.6, d + .04, PAL.vitre_claire).matiere(2); F.plaque(l * .26, .35, l * .26 + 1.2, 2.5, d + .04, PAL.portes[["vert", "rouge", "gris", "violet"][Math.floor(hv(F, 4) * 4)]]);
    for (let k = 0; k < 6; k++) { const x0 = -l / 2 + .3 + (l - .6) * k / 6, x1 = -l / 2 + .3 + (l - .6) * (k + 1) / 6; F.poly([[x0, 3.05, d + .05], [x1, 3.05, d + .05], [x1, 2.55, d + 1.2], [x0, 2.55, d + 1.2]], k % 2 ? BLANC : store, [0, 1, 1]); }
    F.boite(0, 3.2, d + .02, l * .7, .7, .12, PAL.planche); fenetre(F, -l * .22, 3.95, 1.6, 1.1, d); fenetre(F, l * .22, 3.95, 1.6, 1.1, d);
    if (hv(F, 5) < .5) F.toitMaison(0, h, 0, l, p, .5, toit, mur); else F.boite(0, h, 0, l + .3, .35, p + .3, fonce(mur, .8), {haut: PAL.pierre[1]});
    if (o.enseigne && K) K.etiquette(F, o.enseigne, 0, 3.55, d + .09, l * .66, .55); },
  arret_bus(F) {  // un abribus : toit plat, vitre du fond, banc, panneau rond
    const c = PAL.cadre, v = PAL.vitre_claire;
    for (const x of [-1.4, 1.4]) F.boite(x, -.2, -.5, .1, 2.6, .1, c); F.boite(0, 2.35, 0, 3.2, .12, 1.5, fonce(c, 1.3), {haut: BLANC});
    F.matiere(3); F.quad([-1.4, .3, -.55], [1.4, .3, -.55], [1.4, 2.3, -.55], [-1.4, 2.3, -.55], v, [0, 0, 1]); F.matiere(2);
    F.boite(0, .45, -.25, 2.4, .08, .4, PAL.bois_clair); F.boite(0, -.2, -.25, 2.2, .65, .08, c);
    F.cyl(2, -.2, .3, .05, .05, 2.6, 6, c); F.disque(2, 2.45, .36, .32, .32, hex("#3C7CD8")); F.disque(2, 2.45, .38, .2, .2, BLANC); },
  banc(F) { const b = PAL.bois_clair;
    if (!DECOR_NEUF) { F.boite(0, .4, 0, 1.7, .08, .45, b); F.boite(0, .5, -.24, 1.7, .4, .06, b); for (const x of [-.7, .7]) F.boite(x, -.2, 0, .08, .62, .45, PAL.cadre); return; }
    // (18/11) un banc de parc : des lattes de bois (l'assise, le dossier penché), deux pieds de fonte vert sombre, les accoudoirs
    const fonte = hex("#2F4A3C"), b2 = fonce(b, .86);
    for (let k = 0; k < 3; k++) F.boite(0, .42, .12 - k * .15, 1.8, .05, .11, k % 2 ? b2 : b, {haut: k % 2 ? b : melange(b, BLANC, .12)});
    for (let k = 0; k < 3; k++) { const y = .58 + k * .16, z = -.28 - k * .04; F.quad([-.9, y, z], [.9, y, z], [.9, y + .1, z - .03], [-.9, y + .1, z - .03], k % 2 ? b2 : b, [0, .3, 1]); F.quad([.9, y, z - .04], [-.9, y, z - .04], [-.9, y + .1, z - .07], [.9, y + .1, z - .07], b2, [0, -.3, -1]); }
    for (const x of [-.78, .78]) { F.boite(x, -.15, .18, .07, .6, .07, fonte); F.boite(x, -.15, -.24, .07, 1.2, .07, fonte); F.boite(x, .36, -.03, .07, .06, .48, fonte); F.boite(x, .62, -.02, .08, .05, .44, fonte, {haut: b}); F.boite(x, .45, .18, .07, .2, .06, fonte); } },
  voiture(F, o = {}, R, K) {  // une voiture du garage de Kanto (le long de x, l'avant en +x) : voir dessinerVoiture, plus bas
    const t = hv(F, 1), modele = o.modele || (t < .3 ? "citadine" : t < .58 ? "berline" : t < .75 ? "break" : t < .88 ? "camionnette" : "sport");
    F.ombre(0, 0, 2.3, 1.1); const i0 = F.p.length; dessinerVoiture(F, modele, Math.floor(hv(F) * 97), K);
    if (o.bordure) {   // (19/11, Kiki) garée à cheval sur le trottoir : les roues de ce côté (o.bordure = ±1 : le côté +z ou -z) montées sur la bordure de 12 cm, la voiture un peu penchée
      const k = o.bordure * (o.marche || .12) / 1.5, dz = (o.marche || .12) / 2;
      for (let i = i0; i < F.p.length; i += 3) { const zl = ((F.p[i] - F.ox) * F.sn + (F.p[i + 2] - F.oz) * F.cs) / F.k; F.p[i + 1] += zl * k + dz; } } },
  feu(F) {  // un feu tricolore
    const c = PAL.cadre; F.cyl(0, -.2, 0, .08, .07, 3, 6, c); F.boite(0, 2.3, .1, .42, 1.15, .3, fonce(c, .8));
    F.matiere(7); [["#E84030", 2.97], ["#F0B030", 2.65], ["#48C058", 2.33]].forEach(([h, y], k) => F.disque(0, y + .07, .26, .13, .13, k === Math.floor(hv(F) * 3) ? hex(h) : fonce(hex(h), .35))); F.matiere(2); },
  fontaine(F) {  // une fontaine ronde : bassin de pierre, eau, colonne et vasque
    const p = PAL.pierre; F.cyl(0, -.2, 0, 2.2, 2.2, .75, 16, p[1], p[2]); F.matiere(6).rond(0, .5, 0, 1.95, 1.95, PAL.eau_mare, 16).matiere(2);
    F.cyl(0, .4, 0, .3, .25, 1.4, 8, p[2]); F.cyl(0, 1.75, 0, .2, .9, .3, 10, p[1], p[2]); F.matiere(5).cyl(0, 2.05, 0, .12, .04, .7, 6, PAL.eau_chute).matiere(2); },
  poteau_indicateur(F, o, R, K) {  // un poteau à deux flèches : la grande route d'un côté, le chemin de l'autre
    const b = PAL.tronc, pl = PAL.planche, v = o.vers || 1; F.boite(0, -.3, 0, .16, 2.9, .16, b[0]);
    for (const [y, sens, texte] of [[2.15, -v, o.haut], [1.55, v, o.bas]]) { F.boite(sens * .75, y, .09, 1.5, .42, .07, pl); F.poly([[sens * 1.5, y, .13], [sens * 1.85, y + .21, .13], [sens * 1.5, y + .42, .13]], pl, [0, 0, 1]); if (texte) K.etiquette(F, texte, sens * .78, y + .21, .14, 1.4, .34); } },
});

/* ---- les essences d'arbres, par bosquets ("especes" de la région : {bosquet, melange, liste: {arbre: 10, bouleau: 2, …}}) ----
   Une case de « bosquet » mètres a son essence dominante ; « melange » de ses arbres la prennent, les autres restent des arbres de Kanto. Le saule : au bord de l'eau seulement. */
function especeArbre(F, o) {
  const E = DECOR_NEUF && BIOME.especes; if (!E || o.espece === false) return null;
  const Z = E.bosquet || 60, cz = Math.floor(F.oz / Z), cx = Math.floor(F.ox / Z + h2(cz, 3.7));
  const liste = Object.entries(E.liste).filter(([n]) => n === "arbre" || OBJETS[n] && (n !== "saule" || (typeof ZONE !== "undefined" && ZONE && ZONE.velo ? ZONE.eauEn(F.ox, F.oz).e < 9 : o._e < 9))), tot = liste.reduce((t, [, p]) => t + p, 0);
  let t = h2(cx * 1.31 + 5.1, cz * 1.77 - 3.3) * tot, dom = "arbre"; for (const [n, p] of liste) if ((t -= p) <= 0) { dom = n; break; }
  return dom === "arbre" || hv(F, 5) > (E.melange || .75) ? null : dom;
}
const TONS = {bouleau: ["#5CA84A", "#88CA62", "#C0EA8E"], pommier: ["#3A9448", "#5CB858", "#94D872"], cerisier: ["#D47898", "#EE9EBC", "#FFD2E2"], pin: ["#2C6A3A", "#3C8646", "#5AA258"], roux: ["#B24E2A", "#DE7A34", "#F4B456"], saule: ["#4C9A48", "#78BE5E", "#A8DC80"]};
const tons = nom => TONS[nom].map(hex);
function tonsMasse(F) { const n = especeArbre(F, {}); return n && TONS[n] && n !== "cerisier" ? tons(n) : null; }   // la forêt du fond prend aussi les couleurs des bosquets (sauf le rose)
Object.assign(OBJETS, {
  bouleau(F) {  // un bouleau : tronc blanc tacheté, feuillage clair et haut
    const h = 6.4 + hv(F) * 1.6, blanc = hex("#EEEAE0"), t = tons("bouleau"); F.ombre(0, 0, 1.8, 1.6);
    F.cyl(0, -.3, 0, .2, .13, h * .8, 5, blanc, blanc); for (let k = 0; k < 2; k++) F.boite(0, .7 + k * h * .2, .17 * (k % 2 ? 1 : -1), .14, .08, .06, PAL.cadre);
    F.vent(.35, h * .3, h).dome(0, h * .45, 0, 1.55, 1.9, 1.55, t, 7); F.dome(0, h * .7, 0, 1.05, 1.6, 1.05, t, 6, true); F.vent(); },
  pommier(F) {  // un pommier : court, rond, des pommes rouges
    const t = tons("pommier"), r = 2.2 + hv(F) * .4, rouge = hex("#D83830"); F.ombre(0, 0, 2.4, 2.2);
    F.cyl(0, -.3, 0, .34, .26, 1.6, 5, PAL.tronc[0], PAL.tronc[1]);
    F.vent(.2, .9, 4).dome(0, 1.7, 0, r, 2, r, t, 8);
    for (let k = 0; k < 4; k++) { const a = k * 1.57 + hv(F, k) * .8, y = 1.5 + hv(F, k + 9) * 1.1, rr = Math.sqrt(Math.max(.1, 1 - Math.pow((y - 1.7) / 2, 2))) * r * .9; F.boite(Math.cos(a) * rr, y, Math.sin(a) * rr, .26, .26, .26, rouge, {haut: melange(rouge, BLANC, .3)}); }   // (18/11, Kiki : les pommes « volaient » à côté du feuillage : elles en sortent à peine)
    F.vent(); },
  cerisier(F) {  // un cerisier en fleurs : tronc sombre, nuage rose
    const t = tons("cerisier"), r = 2.3 + hv(F) * .5, brun = hex("#5A3A2E"); F.ombre(0, 0, 2.5, 2.3);   // (17/11, Kiki : le carré rose dessous, « très moche » : l'herbe normale et son ombre, comme les autres arbres)
    F.cyl(0, -.3, 0, .32, .22, 2, 5, brun, fonce(brun, 1.2)); F.boite(.4, 1.3, 0, .9, .14, .14, brun);
    F.vent(.25, 1, 5).dome(0, 2.4, 0, r, 1.6, r, t, 8); F.dome(.4, 3.1, .3, r * .72, 1.4, r * .72, t, 7, true); F.vent(); },
  pin(F) {  // un pin parasol : haut tronc nu, couronne large et plate
    const t = tons("pin"), h = 6.5 + hv(F) * 2, r = 2.8 + hv(F, 1) * .8; F.ombre(.4, 0, 2.6, 2.4);
    F.cyl(0, -.3, 0, .3, .2, h, 5, PAL.tronc[0], PAL.tronc[1]); F.boite(.5, h * .7, 0, 1.2, .16, .16, PAL.tronc[0]);
    F.vent(.3, h - 1, h + 1.5).dome(0, h - .2, 0, r, 1.1, r, t, 8); F.dome(.6, h + .4, .3, r * .7, .9, r * .7, t, 7, true); F.vent(); },
  roux(F) {  // un arbre d'automne : la silhouette de l'arbre de Kanto, roux
    const t = tons("roux"); F.ombre(0, 0, 2.5, 2.3); F.cyl(0, -.4, 0, .38, .32, 1.6, 5, PAL.tronc[0], PAL.tronc[1]);
    F.vent(.3, .9, 5.8).dome(0, 2.05, 0, 2.35, 1.4, 2.35, t, 8); F.dome(0, 2.9, 0, 1.8, 1.55, 1.8, t, 7, true); F.dome(0, 4.05, 0, 1.2, 1.75, 1.2, t, 6, true); F.vent(); },
  saule(F) {  // un saule pleureur, au bord de l'eau : un dôme et des rideaux de feuilles qui tombent
    // (25/11, Kiki : « les pics sur l'extérieur de l'arbre qui dépassent, notamment en haut ») c'étaient des cônes pointés vers le bas, dont la base sortait du dôme. Maintenant des rideaux de feuilles : chacun naît DANS la couronne, s'arrondit avec elle et retombe en s'effilant
    const t = tons("saule"), h = 4.6 + hv(F) * .8, r = 2.6; F.ombre(0, 0, 2.8, 2.6);
    F.cyl(0, -.3, 0, .4, .3, h - 1, 5, PAL.tronc[0], PAL.tronc[1]);
    F.vent(.35, 1, h + 1).dome(0, h - .55, 0, r, 1.5, r, t, 9); F.dome(.1, h + .25, -.1, r * .62, 1.05, r * .62, [t[1], t[1], t[2]], 7, true);
    for (const [n, ray, long, dec] of [[13, 1, 1, 0], [9, .72, .86, .4]]) for (let k = 0; k < n; k++) {   // deux rangs de rideaux, en quinconce ; un rideau : une bande qui suit la couronne puis tombe, en trois pans
      const a = (k + dec) / n * Math.PI * 2 + (hv(F, k + n) - .5) * .22, c = Math.cos(a), s = Math.sin(a), L = (2.1 + hv(F, k + 3 + n) * 1.1) * long, w = (.62 + hv(F, k + 7) * .16) * (ray < 1 ? .9 : 1), f = k % 2 ? t[1] : melange(t[0], t[1], .55);
      const P = [[.78, h + .05, .55], [1.03, h - .75, 1], [1.06, h - .75 - L * .62, .8], [1, h - .75 - L, .16]].map(([q, y, e]) => [c * r * ray * q, y, s * r * ray * q, e * w]);
      for (let i = 0; i + 1 < P.length; i++) { const A = P[i], B = P[i + 1], q = (X, g) => [X[0] - s * X[3] * g, X[1], X[2] + c * X[3] * g], tn = i === 0 ? melange(f, t[2], .3) : i === 2 ? melange(f, t[0], .5) : f; F.poly([q(A, -1), q(A, 1), q(B, 1), q(B, -1)], tn, [c, .25, s]); } }
    F.vent(); },
});
/* la maison et l'immeuble varient selon leur place ("varie": true) : couleurs, étage, taille ; jamais deux rues pareilles */
function varieMaison(F) { const m = Object.keys(PAL.murs), t = Object.keys(PAL.toits).filter(k => k !== "paille"), p = Object.keys(PAL.portes);
  return {mur: m[Math.floor(hv(F, 11) * m.length)], toit: t[Math.floor(hv(F, 12) * t.length)], porte: p[Math.floor(hv(F, 13) * p.length)], etage: hv(F, 14) > .3, l: 7.4 + hv(F, 15) * 2, p: 5.8 + hv(F, 16) * 1}; }

/* ---- le garage (18/11, 2e version, Kiki : « 4 roues carrées, c'est très très moche ») : cinq modèles dessinés par leur profil de côté
   (le bas de caisse, puis l'habitacle plus étroit), de vraies roues rondes dans leurs passages, pare-chocs, phares, feux, poignées,
   rétroviseurs, plaques. Repère : x le long (l'avant en +x), z en travers, y vers le haut, le sol à 0. Le modèle et la couleur viennent
   de la place de la voiture (hv) : jamais du hasard du niveau. Une voiture qui roule (contenu/objets/kanto-footing.js) est dessinée ici aussi. ---- */
const GARAGE = {
  // corps : le profil du bas de caisse (convexe, dans le sens trigonométrique) ; cab : celui de l'habitacle ; z, zc : leurs demi-largeurs ; roues : [x, rayon]
  citadine: {corps: [[-1.72, .3], [1.72, .3], [1.8, .5], [1.66, .82], [.82, .9], [-1.64, .92], [-1.78, .58]], cab: [[.78, .88], [-1.62, .9], [-1.52, 1.47], [.02, 1.5]], z: .82, zc: .7, roues: [[1.12, .31], [-1.12, .31]]},
  berline: {corps: [[-2.12, .3], [2.12, .3], [2.2, .5], [2.06, .78], [1.05, .86], [-2.02, .88], [-2.18, .56]], cab: [[1, .84], [-1.32, .86], [-.95, 1.4], [.28, 1.42]], z: .86, zc: .72, roues: [[1.4, .33], [-1.38, .33]]},
  break: {corps: [[-2.16, .3], [2.14, .3], [2.22, .5], [2.07, .78], [1.05, .86], [-2.12, .88], [-2.22, .56]], cab: [[1, .84], [-2.04, .86], [-1.98, 1.44], [.24, 1.46]], z: .86, zc: .74, roues: [[1.42, .33], [-1.42, .33]], barres: true},
  camionnette: {corps: [[-2.3, .32], [2.3, .32], [2.38, .56], [2.25, .98], [-2.3, .98], [-2.35, .58]], cab: [[2.22, .96], [-2.28, .96], [-2.26, 2.12], [1.42, 2.12], [1.98, 1.5]], z: .92, zc: .9, roues: [[1.58, .35], [-1.58, .35]], van: true},
  sport: {corps: [[-2.06, .26], [2.06, .26], [2.18, .4], [2.05, .62], [.9, .7], [-1.96, .74], [-2.1, .5]], cab: [[.62, .68], [-1.22, .72], [-.78, 1.12], [-.08, 1.14]], z: .88, zc: .7, roues: [[1.36, .33], [-1.32, .34]], aileron: true},
};
const TEINTES_AUTO = ["#D8504A", "#4A7FD0", "#F2C744", "#EDEBE3", "#4FA36B", "#E98AA8", "#5C6470", "#9ACBE0", "#E8873A", "#8A64B8", "#C8CCD2", "#2F4A7A"];
const aireAuto = pts => pts.reduce((t, p, i) => { const q = pts[(i + 1) % pts.length]; return t + p[0] * q[1] - q[0] * p[1]; }, 0);
function prismeAuto(F, pts, z, col, haut) {   // un profil (x, y) extrudé de -z à +z ; les faces qui regardent le ciel prennent « haut », le dessous est sombre
  if (aireAuto(pts) < 0) pts = pts.slice().reverse();   // (dans n'importe quel sens : les normales regardent toujours dehors)
  F.poly(pts.map(([x, y]) => [x, y, z]), col, [0, 0, 1]); F.poly(pts.map(([x, y]) => [x, y, -z]), col, [0, 0, -1]);
  for (let i = 0; i < pts.length; i++) { const A = pts[i], B = pts[(i + 1) % pts.length], dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1, n = [dy / l, -dx / l, 0];
    F.quad([A[0], A[1], z], [B[0], B[1], z], [B[0], B[1], -z], [A[0], A[1], -z], n[1] > .55 ? haut : n[1] < -.5 ? fonce(col, .55) : col, n); }
}
const retrecir = (pts, k, dy = 0) => { const cx = pts.reduce((t, p) => t + p[0], 0) / pts.length, cy = pts.reduce((t, p) => t + p[1], 0) / pts.length; return pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k + dy]); };
function roueAuto(F, x, r, z, w) {   // une roue : le pneu à dix faces, la jante claire, le moyeu
  const pneu = hex("#25272C"), jante = hex("#B9BEC6"), n = 10, s = Math.sign(z), z1 = z + s * w / 2, z0 = z - s * w / 2, pt = (a, rr, zz) => [x + Math.cos(a) * rr, r + Math.sin(a) * rr, zz];
  for (let k = 0; k < n; k++) { const a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2; F.quad(pt(a0, r, z0), pt(a1, r, z0), pt(a1, r, z1), pt(a0, r, z1), pneu, [Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2), 0]); }
  const disque = (rr, zz, col) => F.poly(Array.from({length: n}, (_, k) => pt(k / n * Math.PI * 2, rr, zz)), col, [0, 0, s]);
  disque(r, z1, pneu); disque(r * .62, z1 + s * .005, jante); disque(r * .22, z1 + s * .01, fonce(jante, .7));
}
function dessinerVoiture(F, modele, k, K) {
  const G = GARAGE[modele] || GARAGE.berline, col = hex(G.van ? (k % 3 ? "#F2F0EA" : "#4A7FD0") : TEINTES_AUTO[k % TEINTES_AUTO.length]), clair = melange(col, BLANC, .22), sombre = hex("#2E3138");
  const vitre = hex("#3E5A78"), reflet = hex("#8EB8D8"), chrome = hex("#C9CDD3"), z = G.z, zc = G.zc, c = G.cab, xs = G.corps.map(p => p[0]), xa = Math.min(...xs), xb = Math.max(...xs);
  const toit = !G.van && !G.aileron && k % 4 === 1 ? hex("#F4F2EC") : clair;   // une sur quatre : le toit blanc
  prismeAuto(F, G.corps, z, col, clair);                                                              // le bas de caisse
  prismeAuto(F, c, zc, col, toit);                                                                     // l'habitacle, plus étroit
  // les vitres de côté (un montant au milieu, un reflet), posées sur l'habitacle
  const bas = Math.max(c[0][1], c[1][1]) + .07;
  for (const sz of [1, -1]) { const zz = sz * (zc + .006);
    if (G.van) { F.poly([[2.08, 1.08], [1.55, 1.08], [1.45, 1.95], [1.82, 1.95], [2.02, 1.5]].map(([x, y]) => [x, y, zz]), vitre, [0, 0, sz]); continue; }
    const v = retrecir(c, .84, .02).map(([x, y]) => [x, Math.max(y, bas)]), x0 = Math.min(...v.map(p => p[0])), x1 = Math.max(...v.map(p => p[0])), xm = (x0 + x1) / 2 - .05;
    F.poly(v.map(([x, y]) => [x, y, zz]), vitre, [0, 0, sz]);
    F.quad([xm - .05, bas, zz + sz * .004], [xm + .05, bas, zz + sz * .004], [xm + .05, c[3][1], zz + sz * .004], [xm - .05, c[3][1], zz + sz * .004], col, [0, 0, sz]);
    F.quad([x1 - .4, bas + .04, zz + sz * .006], [x1 - .28, bas + .04, zz + sz * .006], [x1 - .48, bas + .3, zz + sz * .006], [x1 - .6, bas + .3, zz + sz * .006], reflet, [0, 0, sz]); }
  // le pare-brise et la lunette arrière : posés sur les faces penchées de l'habitacle
  const cx = c.reduce((t, p) => t + p[0], 0) / c.length, cy = c.reduce((t, p) => t + p[1], 0) / c.length;
  const face = (A, B, k0, k1) => { const dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy), o = (dy * ((A[0] + B[0]) / 2 - cx) - dx * ((A[1] + B[1]) / 2 - cy)) < 0 ? -1 : 1, n = [o * dy / l, -o * dx / l, 0], P = (t, zz) => [lerp(A[0], B[0], t) + n[0] * .01, lerp(A[1], B[1], t) + n[1] * .01, zz];
    F.quad(P(k0, -zc * .86), P(k1, -zc * .86), P(k1, zc * .86), P(k0, zc * .86), vitre, n); };
  face(c[c.length - 1], c[0], .1, .9);                                                                 // le pare-brise
  face(c[1], c[2], G.van ? .55 : .12, .88);                                                            // la lunette arrière (une camionnette : petite, en haut des portes)
  // les roues dans leurs passages (un arc sombre sur la caisse)
  for (const [x, r] of G.roues) for (const sz of [1, -1]) {
    F.poly(Array.from({length: 7}, (_, j) => { const a = j / 6 * Math.PI; return [x + Math.cos(a) * (r + .1), r + Math.sin(a) * (r + .1), sz * (z + .004)]; }), sombre, [0, 0, sz]);
    roueAuto(F, x, r, sz * (z - .08), .24); }
  // pare-chocs et plaques, phares (ils s'allument la nuit), calandre, feux rouges
  for (const [x, sx] of [[xb, 1], [xa, -1]]) { F.boite(x - sx * .05, .3, 0, .2, .2, 2 * z + .06, hex("#4A4D55"), {haut: hex("#5C6068")});
    F.boite(x + sx * .06, .34, 0, .02, .12, .5, sx > 0 ? BLANC : hex("#F4D648")); }
  const xf = Math.max(...G.corps.filter(p => p[1] > .45).map(p => p[0])), xr = Math.min(...G.corps.filter(p => p[1] > .45).map(p => p[0]));
  F.matiere(7); for (const sz of [1, -1]) F.boite(xf - .03, .58, sz * (z - .24), .07, .14, .3, PAL.lumiere); F.matiere(2);
  F.boite(xf - .02, .5, 0, .05, .2, z * .9, sombre);
  for (const sz of [1, -1]) F.boite(xr + .02, .6, sz * (z - .2), .06, .16, .3, hex("#C8382E"));
  // la ligne des portes, les poignées, les rétroviseurs
  const portes = G.van ? [1.45, -.2] : modele === "citadine" || modele === "sport" ? [-.2] : [.05, -.85], poignees = G.van ? [1.05] : modele === "citadine" || modele === "sport" ? [-.55] : [-.3, -1.2];
  for (const sz of [1, -1]) { const zz = sz * (z + .006), y1 = Math.max(c[0][1], c[1][1]) - .02;
    for (const xd of portes) F.quad([xd, .44, zz], [xd + .03, .44, zz], [xd + .03, y1, zz], [xd, y1, zz], fonce(col, .72), [0, 0, sz]);
    for (const xd of poignees) F.boite(xd, .72, sz * (z + .01), .2, .05, .03, chrome);
    F.boite(c[0][0] - .12, c[0][1] + .06, sz * (zc + .1), .12, .1, .16, col); }
  if (G.barres) for (const sz of [1, -1]) F.boite((c[2][0] + c[3][0]) / 2, c[3][1], sz * (zc - .1), c[3][0] - c[2][0], .06, .05, sombre);
  if (G.aileron) { F.boite(xa + .2, .74, 0, .28, .05, 2 * z - .1, sombre); for (const sz of [1, -1]) F.boite(xa + .22, .62, sz * (z - .2), .06, .14, .05, sombre); }
  if (G.van) {   // la camionnette du Poké Mart : sa bande et son nom, des deux côtés
    const bande = hex(k % 3 ? "#4A7FD0" : "#F2F0EA");
    for (const sz of [1, -1]) F.quad([-2.2, 1.32, sz * (zc + .006)], [1.25, 1.32, sz * (zc + .006)], [1.25, 1.48, sz * (zc + .006)], [-2.2, 1.48, sz * (zc + .006)], bande, [0, 0, sz]);
    if (K) { K.etiquette(F, "POKÉ MART", -.5, 1.78, zc + .012, 2, .3, 48);
      const sv = [F.ox, F.oy, F.oz, F.lacet, F.k]; F.poser(F.ox, F.oy, F.oz, F.lacet + Math.PI, F.k); K.etiquette(F, "POKÉ MART", .5, 1.78, zc + .012, 2, .3, 48); F.poser(...sv); } }
}
