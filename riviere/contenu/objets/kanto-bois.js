/* ============ la campagne et les bois autour d'une ville (moteur/zone.js, étape 14, 24/11) ============ */
// Les arbres d'un bois (un long tronc nu, la couronne au-dessus de la tête), le sous-bois, et ce qu'on voit en sortant d'un village :
// clôtures de prés, potagers et leur cabane, entrée d'un chemin, tas de bois, table. Tout suit le sol (solLocal).
Object.assign(RAYON, {arbre_bois: 2.4, masse_bois: 2, fougere: .5, buisson_bois: .9, jeune_pousse: .4, rocher_mousse: 1.1, tronc_couche: 1.3, cloture_bois: .3, entree_chemin: 0, carre_potager: 3, cabane_jardin: 2, stere: 1.4, table_bois: 1.5, barriere_bout: 1.6, abreuvoir: 1.3});
const BOISERIE = {gris: ["#7A6A5C", "#8E7E6E"].map(hex), brun: ["#6A4A30", "#7E5A3C"].map(hex), roux: ["#8A5434", "#B06E42"].map(hex), rustique: ["#7C6248", "#94785A", "#AC9070"].map(hex), coupe: hex("#E2C088"),
  hetre: ["#3E8E40", "#5AAE4C", "#8ED066"].map(hex), chene: ["#3A7E3A", "#549A44", "#84BC58"].map(hex), bouleau: ["#5CA84A", "#88CA62", "#C0EA8E"].map(hex), pin: ["#2C6A3A", "#3C8646", "#5AA258"].map(hex), dore: ["#8E9A36", "#B8B444", "#DCCE60"].map(hex),
  fougere: ["#3A8038", "#4F9A40", "#6CB650"].map(hex), mousse: [hex("#5E8E3C"), hex("#78AA48")], terre: [hex("#7A5638"), hex("#8C6644")]};
/* l'essence d'un arbre du bois : par bosquets de 34 m, un arbre sur quatre d'une autre */
function essenceBois(F) { const a = h2(Math.floor(F.ox / 34) + 11, Math.floor(F.oz / 34) - 7), b = hv(F, 5) > .74 ? hv(F, 6) : a; return b < .36 ? "hetre" : b < .6 ? "chene" : b < .78 ? "pin" : b < .93 ? "bouleau" : "dore"; }
Object.assign(OBJETS, {
  arbre_bois(F, o) {   // un arbre de forêt : tronc haut et nu, une fourche, la couronne à 4 ou 5 m : on passe dessous
    const e = essenceBois(F), t = BOISERIE[e], k = hv(F, 1), q = hv(F, 2), a = hv(F, 3) * 6.28; F.ombre(0, 0, 1.6, 1.5);
    if (e === "pin") { const h = 6 + k * 2; F.cyl(0, -.5, 0, .3, .17, h + .5, 6, BOISERIE.roux[0], BOISERIE.roux[1]); for (const [y, r, d] of [[h - 2.2, 1.5, .6], [h - .6, 1.9, 0], [h + .5, 1.3, 0]]) F.vent(.25, h * .5, h + 1.5).dome(Math.cos(a) * d, y, Math.sin(a) * d, r, .7, r, t, 6); F.vent(); return; }
    if (e === "bouleau") { const h = 6.2 + k * 1.6, b = hex("#EEEAE0"); F.cyl(0, -.5, 0, .19, .1, h, 5, b, b); for (let i = 0; i < 4; i++) { const y = .5 + i * .95 + q * .3, s = i % 2 ? 1 : -1; F.boite(s * .1, y, .08, .16, .08, .12, PAL.cadre); }
      F.vent(.35, h * .4, h + 1).dome(.3, h - 2, .2, 1.25, 1.3, 1.25, t, 6); F.dome(0, h - .5, 0, 1.35, 1.7, 1.35, t, 7); F.vent(); return; }
    const gros = e === "chene", h = (gros ? 3.8 : 4.6) + k * 1.4, tr = e === "hetre" ? BOISERIE.gris : BOISERIE.brun, r = (gros ? 2.7 : 2.5) + q * .5, cx = Math.cos(a), cz = Math.sin(a);
    F.cyl(0, -.5, 0, gros ? .44 : .34, gros ? .26 : .2, h + 1, 6, tr[0], tr[1]);
    for (const s of [0, 2.2, 4.3]) F.pointe(Math.cos(a + s) * .3, -.3, Math.sin(a + s) * .3, Math.cos(a + s) * .5, .9, Math.sin(a + s) * .5, .16, .95, 4, tr[0]);   // les racines
    F.pointe(0, h - .9, 0, cx, .9, cz, .13, 1.9, 4, tr[0]);   // une branche basse
    F.vent(.25, h * .6, h + 4).dome(0, h + 1.2, 0, r, 1.55, r, t, 8); F.dome(cx * 1.4, h + .5, cz * 1.4, r * .62, .95, r * .62, t, 6); F.dome(-cz * 1.3, h + .9, cx * 1.3, r * .55, .9, r * .55, t, 6); F.dome(-cx * .3, h + 2.1, -cz * .3, r * .72, 1.7, r * .72, t, 7, true); F.vent(); },
  arbre_bois_loin(F) { const t = BOISERIE[essenceBois(F)], h = 4.4 + hv(F, 1); F.cyl(0, -.5, 0, .34, .2, h, 4, BOISERIE.brun[0], BOISERIE.brun[1]); F.dome(0, h + .9, 0, 2.6, 2.5, 2.6, t, 5); },   // le même, à plus de 95 m
  masse_bois(F, o, R) {   // le fond du bois, à plus de 40 m : la silhouette d'un arbre, aux couleurs du bosquet
    const e = essenceBois(F), t = BOISERIE[e === "dore" ? "hetre" : e], k = .78 + R() * .16, c = [fonce(t[0], k * .9), fonce(melange(t[0], t[1], .5), k), fonce(melange(t[1], t[2], .3), k)], r = 2.4 + R() * .8, h = 5.6 + R() * 2.4;
    F.vent(.4, .5, h + 1).dome(0, .4, 0, r, h * .62, r, c, 5, true); F.dome(0, .4 + h * .42, 0, r * .66, h * .58, r * .66, c, 5, true); F.vent(); },
  fougere(F) {   // une fougère : des frondes fines en couronne, qui montent, s'arrondissent et retombent
    const n = 8, t = BOISERIE.fougere; F.vent(.05, 0, .7); for (let i = 0; i < n; i++) { const a = (i + hv(F, i) * .6) / n * 6.283, c = Math.cos(a), s = Math.sin(a), l = .6 + hv(F, i + 9) * .28, h = .34 + hv(F, i + 20) * .16, P = (d, u, y) => [c * d - s * u, y, s * d + c * u], K = [[.03, .015, 0], [l * .38, .075, h * .86], [l * .74, .06, h], [l, 0, h * .62]];
      for (let k = 0; k < 3; k++) { const A = K[k], B = K[k + 1], col = t[Math.min(2, k + (i & 1))]; if (k < 2) F.quad(P(A[0], -A[1], A[2]), P(A[0], A[1], A[2]), P(B[0], B[1], B[2]), P(B[0], -B[1], B[2]), col, [0, 1, 0]); else F.tri(P(A[0], -A[1], A[2]), P(A[0], A[1], A[2]), P(B[0], 0, B[2]), col, [0, 1, 0]); } } F.vent(); },
  buisson_bois(F) {   // un buisson de sous-bois : trois touffes rondes, sombres dessous
    const t = hv(F) < .6 ? BOISERIE.chene : BOISERIE.hetre, a = hv(F, 2) * 6.28, c = Math.cos(a), s = Math.sin(a); F.ombre(0, 0, .9, .8); F.vent(.05, 0, 1).dome(0, .28, 0, .7, .55, .62, t, 7); F.dome(c * .55, .2, s * .55, .46, .4, .44, t, 6); F.dome(-c * .42, .24, -s * .5, .42, .38, .42, t, 6); F.vent(); },
  jeune_pousse(F) {   // un jeune arbre : une tige et trois touffes
    const t = hv(F) < .5 ? BOISERIE.hetre : BOISERIE.bouleau, h = 1.1 + hv(F, 1) * .9; F.cyl(0, -.1, 0, .05, .03, h, 4, BOISERIE.brun[0]); F.vent(.12, 0, h).dome(0, h * .7, 0, .42, .4, .42, t, 5); F.dome(.1, h + .1, 0, .3, .42, .3, t, 5); F.vent(); },
  rocher_mousse(F, o, R) { F.ombre(.1, 0, 1.2, 1); F.caillou(0, .2, 0, 1.1, .75, .9, PAL.pierre, R); F.dome(.05, .52, 0, .72, .3, .6, [BOISERIE.mousse[0], BOISERIE.mousse[0], BOISERIE.mousse[1]], 7, true); if (R() < .6) F.caillou(.95, Math.min(.1, solLocal(F, .95, .5) + .1), .5, .42, .34, .4, PAL.pierre, R); },
  tronc_couche(F) {   // un arbre tombé, posé sur le sol, sa coupe claire, de la mousse dessus
    const L = 2.6 + hv(F) * 1.2, r = .26, y0 = solLocal(F, -L / 2) + r * .8, y1 = solLocal(F, L / 2) + r * .8, b = BOISERIE.brun, n = 7; F.ombre(0, 0, L / 2, .5);
    const P = (x, y, i) => [x, y + Math.sin(i / n * 6.283) * r, Math.cos(i / n * 6.283) * r]; for (let i = 0; i < n; i++) { const m = (i + .5) / n * 6.283, N = [0, Math.sin(m), Math.cos(m)]; F.quad(P(-L / 2, y0, i), P(L / 2, y1, i), P(L / 2, y1, i + 1), P(-L / 2, y0, i + 1), N[1] > .75 ? BOISERIE.mousse[i % 2] : b[i % 2], N); }
    for (const [x, y, s] of [[-L / 2, y0, -1], [L / 2, y1, 1]]) for (let i = 0; i < n; i++) F.tri([x, y, 0], P(x, y, i), P(x, y, i + 1), i % 2 ? BOISERIE.coupe : fonce(BOISERIE.coupe, .9), [s, 0, 0]);
    F.pointe(L * .1, lerp(y0, y1, .6) + r * .6, 0, .4, 1, .3, .08, .6, 4, b[0]); },
  cloture_bois(F, o) {   // la clôture d'un pré : des pieux, deux lisses rondes, un peu de travers
    const L = o.long || 2.6, b = BOISERIE.rustique, xs = [-L / 2 + .04, L / 2 - .04]; for (const x of o.fin ? xs : [xs[0]]) F.cyl(x, solLocal(F, x) - .3, 0, .085, .07, 1.45 + hv(F) * .12, 5, b[0], b[1], b[2]);
    for (const [h, e] of [[.42, .1], [.86, .11]]) { const d = (hv(F, h * 10) - .5) * .06; lisseEnPente(F, -L / 2 - .05, solLocal(F, -L / 2) + h + d, L / 2 + .05, solLocal(F, L / 2) + h - d, 0, e, .08, b[1], b[2]); } },
  entree_chemin(F, o, R, K) {   // l'entrée d'un chemin au bout d'une rue : deux forts poteaux, une barrière de chaque côté, le panneau du chemin (o.large : le passage libre)
    const w = (o.large || 2.6) / 2 + .16, b = BOISERIE.rustique; for (const s of [-1, 1]) { const y = solLocal(F, s * w); F.boite(s * w, y - .4, 0, .26, 1.75, .26, b[0], {haut: b[2]}); F.boite(s * w, y + 1.35, 0, .34, .1, .34, b[2]);
      const lg = o.cote && s === -o.cote ? .0 : 2.3; if (lg) { const x1 = s * (w + lg), y1 = solLocal(F, x1); F.boite(x1, y1 - .4, 0, .2, 1.45, .2, b[0], {haut: b[2]}); for (const h of [.4, .8]) lisseEnPente(F, Math.min(s * w, x1), (s > 0 ? y : y1) + h, Math.max(s * w, x1), (s > 0 ? y1 : y) + h, 0, .13, .09, b[1], b[2]); } }
    const x = (o.cote || 1) * (w + .95), y = solLocal(F, x); if (o.texte) { F.boite(x, y + 1.15, .1, 2.1, .52, .08, b[0], {devant: PAL.planche}); K.etiquette(F, o.texte, x, y + 1.41, .16, 1.95, .4, 64); F.boite(x, y - .2, .04, .12, 1.4, .1, b[0]); } },
  barriere_bout(F) {   // au bout d'une rue : une barrière de bois peinte, blanc et rouge, sur deux pieds
    const r = hex("#D8443A"); for (const x of [-1.15, 1.15]) F.boite(x, solLocal(F, x) - .3, 0, .16, 1.25, .16, BOISERIE.rustique[0], {haut: BOISERIE.rustique[2]}); for (let k = 0; k < 6; k++) F.boite(-1.25 + k * .5, solLocal(F, 0) + .58, .1, .5, .28, .07, k % 2 ? r : PAL.blanc); },
  carre_potager(F, o) {   // un carré de potager : la terre entre quatre planches, trois rangs de légumes, parfois des tuteurs ou un arrosoir
    const L = (o.l || 5) - .5, W = (o.p || 3.8) - .5, y = Math.max(...[[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]].map(([a, c]) => solLocal(F, a * L / 2, c * W / 2))), b = BOISERIE.rustique, t = BOISERIE.terre;
    F.boite(0, y - 1, 0, L, 1.16, W, t[0], {haut: t[0]}); for (const s of [-1, 1]) { F.boite(0, y - .8, s * W / 2, L + .16, 1.02, .1, b[1], {haut: b[2]}); F.boite(s * L / 2, y - .8, 0, .1, 1.02, W + .1, b[1], {haut: b[2]}); }
    for (let k = 0; k < 3; k++) { const z = (k - 1) * W * .29, g = Math.floor(hv(F, k + 3) * 5); F.boite(0, y + .14, z, L - .5, .1, .5, t[1], {haut: t[1]});
      for (let x = -L / 2 + .55; x < L / 2 - .4; x += g === 2 ? .85 : .62) { const j = hv(F, Math.round(x * 7) + k * 19); if (j < .1) continue;
        if (g === 0) F.dome(x, y + .3, z, .24, .2, .24, [hex("#4E9A46"), hex("#78BE58"), hex("#A8DC80")], 6, true);   // des salades
        else if (g === 1) { F.pointe(x, y + .2, z, .1 * (j - .5), 1, 0, .1, .42, 4, hex("#58A84A"), hex("#88CC64")); F.boite(x, y + .16, z, .1, .1, .1, hex("#E8843A")); }   // des carottes
        else if (g === 2) { F.boite(x, y + .2, z, .04, 1.05, .04, b[2]); F.dome(x, y + .72, z, .2, .42, .2, [hex("#3A8A3E"), hex("#4FA04A"), hex("#6CB85A")], 5); for (const [u, h] of [[.16, .5], [-.14, .78], [.1, .98]]) F.boite(x + u, y + h, z + .12, .12, .12, .12, hex("#D83A30")); }   // des tomates
        else if (g === 3) { F.dome(x, y + .28, z, .26, .24, .26, [hex("#5A8AA0"), hex("#7AAAB0"), hex("#A4CCC4")], 6, true); }   // des choux
        else { F.dome(x, y + .24, z, .34, .14, .3, [hex("#3E8A3E"), hex("#58A44A"), hex("#7ABC5C")], 5, true); if (j > .5) F.boule(x + .1, y + .28, z + .2, .16, .13, .16, [hex("#C8641E"), hex("#E88A2E"), hex("#F4AA4C")], 0); } } } },   // des citrouilles
  cabane_jardin(F) {   // la cabane d'un jardinier : des planches, un toit de bardeaux, une porte, une petite fenêtre, un tonneau
    const g = [["#8C6A48", "#A07C56"], ["#6E8A78", "#7E9C88"], ["#9A5A48", "#AE6C56"]][Math.floor(hv(F, 3) * 3)].map(hex), bas = Math.min(0, ...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, c]) => solLocal(F, a * 1.2, c))), t = hex("#6A5A50");
    F.boite(0, bas - .2, 0, 2.5, .3 - bas, 2.1, PAL.pierre[0]); for (let k = 0; k < 8; k++) F.boite(-1.05 + k * .3, .1, 0, .29, 1.9, 1.9, g[k % 2]);
    F.toit(0, 2, 0, 2.4, 1.9, .75, .28, t, g[0]); F.plaque(-.75, .12, .05, 1.8, .97, fonce(g[0], .7)); F.plaque(-.69, .16, -.01, 1.74, .99, fonce(g[1], .86)); F.boite(-.1, .9, 1.02, .06, .12, .05, PAL.or[1]);
    F.plaque(.3, .85, .92, 1.5, .97, PAL.blanc); F.matiere(3).plaque(.36, .91, .86, 1.44, .99, PAL.vitre).matiere(2);
    { const y = solLocal(F, 1.55, .6); F.cyl(1.55, y - .1, .6, .28, .3, .85, 8, BOISERIE.rustique[0], BOISERIE.rustique[1], null); for (const h of [.15, .55]) F.cyl(1.55, y + h, .6, .31, .31, .06, 8, FER); } },
  stere(F) {   // un tas de bois de chauffage : des rondins rangés entre deux piquets
    const L = 2.2, b = BOISERIE.brun; F.ombre(0, 0, 1.5, .8); F.boite(0, solLocal(F, 0) - .4, 0, L - .16, 1.27, .9, fonce(b[0], .5));   // (24/11, Kiki : « on voit à travers ») le cœur du tas, sombre, derrière les rondins
    for (const x of [-L / 2 - .08, L / 2 + .08]) F.boite(x, solLocal(F, x) - .3, 0, .1, 1.55, .1, BOISERIE.rustique[0]);
    for (let j = 0; j < 4; j++) for (let k = 0; k < 8 - (j % 2); k++) { const r = .125 + hv(F, j * 9 + k) * .02, x = -L / 2 + .14 + k * .275 + (j % 2) * .137, y = solLocal(F, 0) + .12 + j * .235, n = 6, P = (i, z) => [x + Math.cos(i / n * 6.283) * r, y + Math.sin(i / n * 6.283) * r, z];
      for (const z of [.5, -.5]) for (let i = 0; i < n; i++) F.tri([x, y, z], P(i, z), P(i + 1, z), i % 3 ? BOISERIE.coupe : fonce(BOISERIE.coupe, .88), [0, 0, Math.sign(z)]);
      if (j === 3 || k === 0 || k === 7 - (j % 2)) for (let i = 0; i < n; i++) { const m = (i + .5) / n * 6.283; F.quad(P(i, .5), P(i + 1, .5), P(i + 1, -.5), P(i, -.5), b[i % 2], [Math.cos(m), Math.sin(m), 0]); } } },
  table_bois(F) {   // une table de pique-nique : le plateau et deux bancs sur des pieds en A
    const b = BOISERIE.rustique; F.ombre(0, 0, 1.2, 1); for (let k = 0; k < 4; k++) F.boite(0, .72, -.3 + k * .2, 1.8, .06, .18, b[1], {haut: b[2]}); for (const s of [-1, 1]) { F.boite(0, .42, s * .72, 1.8, .06, .28, b[1], {haut: b[2]}); for (const x of [-.62, .62]) { F.boite(x, .34, 0, .1, .08, 1.6, b[0]); F.poly([[x - .05, -.2, s * .75], [x + .05, -.2, s * .75], [x + .05, .74, s * .2], [x - .05, .74, s * .2]], b[0], [0, 0, s]); F.poly([[x - .05, -.2, s * .65], [x + .05, -.2, s * .65], [x + .05, .74, s * .1], [x - .05, .74, s * .1]], b[0], [0, 0, -s]); } } },
  abreuvoir(F) {   // l'abreuvoir d'un pré : une auge de pierre pleine d'eau
    const pi = PAL.pierre; F.boite(0, -.3, 0, 2.2, .85, .95, pi[1], {haut: pi[2]}); F.matiere(6).quad([-.95, .56, .34], [.95, .56, .34], [.95, .56, -.34], [-.95, .56, -.34], PAL.eau_mare, [0, 1, 0]); F.matiere(2); },
});
