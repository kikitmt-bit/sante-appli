/* ============ la route à vélo (24/11, étape 15) : la bande fleurie d'une piste cyclable, un chantier, les panneaux ============ */
// Même repère que les autres objets : x en travers, z vers qui regarde, y vers le haut.
Object.assign(RAYON, {plate_bande: 1.3, barriere_chantier: 1, cone_chantier: .25, tas_paves: .9, tranchee: 2, panneau_route: .3, panneau_ville: .8, borne_bois: .2, boite_outils: .5});
const ROUTE_C = {orange: hex("#F08A24"), rouge: hex("#D8362E"), bleu: hex("#2F6FC4"), gris: hex("#8D9296"), jaune: hex("#F5C83A"), terre: [hex("#6E5138"), hex("#83624A"), hex("#97765A")]};
const PLATES = [["#E84A5F", "#F7D046"], ["#F2F0F5", "#B05CC8"], ["#F7D046", "#F2F0F5"], ["#F08AB0", "#E84A5F"], ["#7A8CF0", "#F2F0F5"]];
/* le vélo blanc d'un panneau, sur une façade : deux roues, un cadre */
function veloPeint(F, x, y, z, k, col) {
  for (const s of [-1, 1]) for (let i = 0; i < 10; i++) { const a = i / 10 * 6.2832, b = (i + 1) / 10 * 6.2832, P = (t, r) => [x + (s * .5 + Math.cos(t) * r) * k, y + Math.sin(t) * r * k, z]; F.quad(P(a, .24), P(a, .33), P(b, .33), P(b, .24), col, [0, 0, 1]); }
  const trait = (x0, y0, x1, y1) => { const l = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / l * .045, ny = (x1 - x0) / l * .045; F.quad([x + (x0 - nx) * k, y + (y0 - ny) * k, z], [x + (x1 - nx) * k, y + (y1 - ny) * k, z], [x + (x1 + nx) * k, y + (y1 + ny) * k, z], [x + (x0 + nx) * k, y + (y0 + ny) * k, z], col, [0, 0, 1]); };
  trait(-.5, 0, -.2, .42); trait(-.2, .42, .34, .42); trait(-.2, .42, .02, 0); trait(.02, 0, .34, .42); trait(-.5, 0, .02, 0); trait(.5, 0, .3, .6); trait(.3, .6, .48, .62);
}
Object.assign(OBJETS, {
  plate_bande(F, o) {   // un massif long : de la terre, deux rangs de touffes rondes, deux couleurs qui alternent
    const L = o.long || 2.5, f = PAL.feuilles, c = PLATES[Math.abs(o.ton || 0) % PLATES.length].map(hex), y = x => solLocal(F, x);
    F.boite(0, y(0) - .25, 0, L, .33, .95, FOOT.terre);
    for (let k = 0, n = Math.round(L / .46); k < n; k++) for (const s of [-1, 1]) { const x = -L / 2 + .24 + k * (L - .48) / (n - 1), z = s * .23 + (hv(F, k * 2 + s) - .5) * .1, b = y(x), q = c[(k + (s > 0 ? 1 : 0)) % 2], r = .24 + hv(F, k + 9 * s) * .05;
      F.vent(.02, b, b + .5); F.dome(x, b + .06, z, r + .05, .24, r + .05, [f[0], f[1], f[1]], 5, true); F.dome(x, b + .22, z, r * .72, .19, r * .72, [melange(q, [0, 0, 0], .18), q, melange(q, BLANC, .25)], 5, true); } F.vent(); },
  barriere_chantier(F, o) {   // une barrière de chantier rouge et blanche, sur deux pieds, son feu orange
    const L = o.long || 2; for (const s of [-1, 1]) { F.boite(s * (L / 2 - .25), 0, 0, .1, 1.05, .07, ROUTE_C.gris); F.boite(s * (L / 2 - .25), 0, 0, .14, .07, .7, hex("#4A4E52")); }
    for (const y of [.42, .8]) for (let k = 0, n = Math.round(L / .33); k < n; k++) { const x0 = -L / 2 + k * L / n; F.boite(x0 + L / n / 2, y, 0, L / n, .22, .05, k % 2 ? BLANC : ROUTE_C.rouge); }
    if (o.feu) { F.cyl(L / 2 - .25, 1.05, 0, .09, .07, .16, 7, ROUTE_C.orange, ROUTE_C.jaune); } },
  cone_chantier(F) { F.boite(0, 0, 0, .42, .05, .42, hex("#C9551A")); F.cyl(0, .05, 0, .16, .045, .62, 9, ROUTE_C.orange, ROUTE_C.orange); F.cyl(0, .28, 0, .116, .085, .13, 9, BLANC, BLANC); },
  tas_paves(F, o) {   // des pavés neufs empilés sur une palette, et quelques-uns posés à côté
    const b = PAL.bois_clair, p = [hex("#B7AE9F"), hex("#A49B8C"), hex("#C6BEB0")]; for (const z of [-.4, 0, .4]) F.boite(0, 0, z, 1.2, .12, .14, b);
    for (let e = 0; e < 3; e++) for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { if (e === 2 && (i * 3 + j * 5) % 4 === 0) continue; F.boite(-.42 + i * .28, .13 + e * .17, -.42 + j * .28, .265, .16, .265, p[(i * 5 + j * 3 + e) % 3]); }
    for (const [x, z, a] of [[.95, .3, 0], [.8, -.5, 1], [-.9, .6, 2]]) F.boite(x, 0, z, .26, .16, .26, p[a]); },
  tranchee(F, o) {   // la chaussée ouverte : le fond de terre sombre, le bord d'enrobé cassé, un tuyau bleu, la terre en tas le long
    const L = o.long || 6, l = o.large || 1.5, t = ROUTE_C.terre, y = x => solLocal(F, x) + .015, n = Math.ceil(L / 1.5);
    for (let k = 0; k < n; k++) { const x0 = -L / 2 + k * L / n, x1 = x0 + L / n, h0 = (hv(F, k) - .5) * .22, h1 = (hv(F, k + 1) - .5) * .22, b = (x, z, d) => [x, y(x) + d, z];
      F.quad(b(x0, -l / 2 - .14 + h0, 0), b(x1, -l / 2 - .14 + h1, 0), b(x1, l / 2 + .14 - h1, 0), b(x0, l / 2 + .14 - h0, 0), t[1], [0, 1, 0]);
      F.quad(b(x0, -l / 2 + .12 + h0, .006), b(x1, -l / 2 + .12 + h1, .006), b(x1, l / 2 - .12 - h1, .006), b(x0, l / 2 - .12 - h0, .006), fonce(t[0], .62), [0, 1, 0]);
      F.boite((x0 + x1) / 2, y(x0) + .01, 0, L / n + .02, .07, .22, ROUTE_C.bleu, {haut: melange(ROUTE_C.bleu, BLANC, .25)}); }
    const R = hasard(Math.round(F.ox * 7 + F.oz * 3)); for (let k = 0; k < 5; k++) F.caillou(-L / 2 + (k + .5) * L / 5, y(0) + .05, -l / 2 - .62, .6, .38 + R() * .22, .46, t, R); },
  boite_outils(F) { F.boite(0, 0, 0, .9, .42, .45, ROUTE_C.jaune, {haut: fonce(ROUTE_C.jaune, .85)}); F.boite(0, .42, 0, .5, .06, .06, hex("#3A3E42")); for (const [x, r] of [[.62, .02], [-.66, .02]]) F.cyl(x, 0, .1, r, r, 1.25, 5, PAL.bois_clair, PAL.bois_clair); },
  panneau_route(F, o, R, K) {   // genre : "sens" (sens interdit), "barree" (rue barrée), "cyclable" (obligation vélos), "travaux", "deviation" (vélos par le trottoir)
    const g = o.genre || "cyclable", h = o.haut || 2.1; F.cyl(0, 0, 0, .045, .045, h + .34, 7, ROUTE_C.gris, ROUTE_C.gris);
    const rond = (c, y = h) => { F.disque(0, y, .062, .42, .42, hex("#EEF0F2"), 0, 6.2832, 20); F.disque(0, y, .068, .385, .385, c, 0, 6.2832, 20); F.disque(0, y, -.02, .42, .42, ROUTE_C.gris, 0, 6.2832, 20); };
    if (g === "sens") { rond(ROUTE_C.rouge); F.plaque(-.27, h - .07, .27, h + .07, .076, BLANC); }
    if (g === "cyclable") { rond(ROUTE_C.bleu); veloPeint(F, 0, h - .13, .076, .36, BLANC); }
    if (g === "travaux") { const P = r => [[-r, h - r * .6, 0], [r, h - r * .6, 0], [0, h + r * 1.1, 0]].map(([x, y]) => [x, y, .062]); F.poly(P(.5), ROUTE_C.rouge, [0, 0, 1]); F.poly(P(.36).map(q => [q[0], q[1], .07]), ROUTE_C.jaune, [0, 0, 1]); F.poly(P(.5).map(q => [q[0], q[1], -.02]), ROUTE_C.gris, [0, 0, -1]); F.plaque(-.15, h - .12, .15, h - .04, .078, hex("#2A2A2A")); F.disque(0, h + .06, .078, .07, .07, hex("#2A2A2A"), 0, 6.2832, 10); }
    if (g === "barree" || g === "deviation") { const c = g === "barree" ? BLANC : ROUTE_C.jaune, l = g === "barree" ? 1.5 : 1.1; F.boite(0, h - .2, .03, l, .5, .05, c); F.boite(0, h - .23, .02, l + .06, .56, .05, g === "barree" ? ROUTE_C.rouge : hex("#2A2A2A"));
      if (g === "barree") { if (K && K.etiquette) K.etiquette(F, "RUE BARRÉE", 0, h + .05, .07, 1.36, .3, 72); } else { veloPeint(F, -.2, h - .03, .065, .3, hex("#2A2A2A")); F.poly([[.24, h - .1, .065], [.24, h + .2, .065], [.46, h + .05, .065]], hex("#2A2A2A"), [0, 0, 1]); } } },
  panneau_ville(F, o, R, K) {   // l'entrée d'une ville : son nom sur fond blanc bordé de rouge ; barre : la sortie, le nom rayé
    const w = 2.3, h = 1.35; for (const s of [-1, 1]) F.cyl(s * .85, 0, 0, .05, .05, h + .5, 7, ROUTE_C.gris, ROUTE_C.gris);
    F.boite(0, h, .02, w, .62, .06, ROUTE_C.rouge); F.boite(0, h + .06, .04, w - .12, .5, .06, BLANC); if (K && K.etiquette) K.etiquette(F, o.texte || "JADIELLE", 0, h + .31, .085, w - .3, .38, 80);
    if (o.barre) F.poly([[-w / 2 + .1, h + .06, .1], [-w / 2 + .3, h + .06, .1], [w / 2 - .1, h + .56, .1], [w / 2 - .3, h + .56, .1]], ROUTE_C.rouge, [0, 0, 1]);
    F.boite(0, h, -.03, w, .62, .02, ROUTE_C.gris); },
  borne_bois(F) { F.cyl(0, -.1, 0, .11, .1, 1.05, 8, PAL.tronc[0], PAL.bois_clair); F.cyl(0, .72, 0, .112, .11, .1, 8, BLANC, BLANC); },
});
