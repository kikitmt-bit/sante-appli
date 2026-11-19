/* ============ le footing en ville (18/11, 2e version, carte blanche de Kiki : « ni beau, ni fun, ni pratique ») ============ */
// Ce qui manquait pour une vraie sortie à pied : des haies et des murets tout près du trottoir (on sent qu'on avance), la rue qui continue
// tout droit quand on la quitte pour un passage, l'entrée d'un parc, un kiosque, une terrasse de café, des massifs.
// Même repère que les autres objets : x le long de la piste, z vers la piste, y vers le haut. Aucun tirage dans le hasard du niveau (hv : la place).
Object.assign(RAYON, {voiture_roule: 0, haie: .5, muret: .4, rue_continue: 0, portail_parc: 0, kiosque: 4.2, terrasse: 1.8, massif: 1.2, poubelle: .3});

const FOOT = {haie: [hex("#3E8E46"), hex("#4FA352"), hex("#69BC5E")], terre: hex("#8C6A44")};
/* une haie taillée, le long de la piste (long : sa longueur) : un pied plus sombre, un dessus clair, quelques bosses pour casser le trait */
function haieFoot(F, x0, x1, z, h, p, k0) {
  const t = FOOT.haie, L = x1 - x0;
  F.vent(.03, h * .6, h).boite((x0 + x1) / 2, 0, z, L, h, p, t[1], {haut: t[2]});
  for (let x = x0 + .6; x < x1 - .6; x += 1.4) { const r = h2(Math.round(F.ox * 7 + x * 13 + k0), Math.round(F.oz * 5 - x * 3)); if (r < .45) continue;
    F.boite(x, h - .02, z + (r - .7) * .2, .7 + r * .5, .14 + r * .12, p * .7, t[1], {haut: t[2]}); }
  F.vent(); F.boite((x0 + x1) / 2, 0, z, L + .04, .22, p + .04, t[0]);
}
Object.assign(OBJETS, {
  haie(F, o) { const L = o.long || 6; haieFoot(F, -L / 2, L / 2, 0, o.h || 1.05, o.p || .75, 1); },
  muret(F, o) { const L = o.long || 6, h = o.h || .7, pi = PAL.pierre;   // un muret de pierre et sa couvertine, posé sur le sol pierre par pierre
    for (let x = -L / 2; x < L / 2 - .01; x += 1.5) { const l = Math.min(1.5, L / 2 - x), y0 = hauteur(...F.monde(x + l / 2, 0)) - F.oy;
      F.boite(x + l / 2, y0 - .3, 0, l + .02, h + .3, .4, h2(Math.round(F.ox + x * 3), Math.round(F.oz)) > .5 ? pi[1] : melange(pi[1], pi[2], .4)); F.boite(x + l / 2, y0 + h, 0, l + .06, .1, .5, pi[2]); } },
  massif(F, o) {   // un massif de fleurs dans sa bordure de pierre : de la terre, des touffes rondes de couleurs franches (jamais des cubes)
    const r = o.r0 || 1.1, c = [hex("#E84A5F"), hex("#F7D046"), hex("#F2F0F5"), hex("#B05CC8")][Math.floor(hv(F, 2) * 4)], f = PAL.feuilles;
    F.cyl(0, -.1, 0, r + .12, r + .12, .32, 10, PAL.pierre[2], PAL.pierre[2]); F.rond(0, .23, 0, r, r, FOOT.terre, 10);
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 + hv(F, k) * .4, d = k === 6 ? 0 : r * .55; F.boule(Math.cos(a) * d, .3, Math.sin(a) * d, .32, .26, .32, [f[0], f[1], f[1]], 0);
      F.boule(Math.cos(a) * d, .5, Math.sin(a) * d, .2, .14, .2, [melange(c, [0, 0, 0], .2), c, melange(c, BLANC, .3)], 0); } },
  poubelle(F) { const v = hex("#3C7A4E"); F.cyl(0, 0, 0, .04, .04, .55, 6, PAL.cadre, PAL.cadre); F.cyl(0, .5, 0, .24, .26, .55, 8, v, melange(v, BLANC, .15), v); },
  terrasse(F, o, R, K) {   // une table de café, deux chaises, un parasol à bandes
    const b = PAL.bois_clair, toile = [hex("#E04A3A"), hex("#F4F0E6")], h = 2.3;
    F.cyl(0, 0, 0, .05, .05, .72, 6, PAL.cadre, PAL.cadre); F.cyl(0, .72, 0, .42, .42, .05, 10, BLANC, BLANC, BLANC);
    for (const s of [-1, 1]) { F.boite(s * .75, .42, 0, .4, .06, .4, b); F.boite(s * .93, .45, 0, .06, .45, .4, b); for (const dz of [-.17, .17]) F.boite(s * .75, 0, dz, .05, .42, .05, PAL.cadre); }
    F.cyl(0, .77, 0, .03, .03, h - .77, 5, BLANC, BLANC);
    for (let k = 0; k < 8; k++) { const a0 = k / 8 * Math.PI * 2, a1 = (k + 1) / 8 * Math.PI * 2, r = 1.25, y = h - .35;
      F.tri([0, h + .05, 0], [Math.cos(a0) * r, y, Math.sin(a0) * r], [Math.cos(a1) * r, y, Math.sin(a1) * r], toile[k % 2], [0, 1, 0]);
      F.tri([0, h + .05, 0], [Math.cos(a1) * r, y, Math.sin(a1) * r], [Math.cos(a0) * r, y, Math.sin(a0) * r], fonce(toile[k % 2], .8), [0, -1, 0]); } },
  kiosque(F, o, R, K) {   // le kiosque à musique du parc : un socle de pierre, huit colonnes blanches, un toit vert en pointe
    const r = 3.4, n = 8, vert = hex("#3F8C6A"), pi = PAL.pierre;
    F.cyl(0, -.3, 0, r + .3, r + .3, .9, 16, pi[1], pi[2], pi[1]); F.boite(0, -.3, r + .55, 1.6, .6, .7, pi[2]);
    for (let k = 0; k < n; k++) { const a = (k + .5) / n * Math.PI * 2; F.cyl(Math.cos(a) * r, .6, Math.sin(a) * r, .1, .1, 2.5, 6, BLANC, BLANC); }
    F.cyl(0, 3.1, 0, r + .5, r + .5, .25, 16, BLANC, BLANC, BLANC); F.cyl(0, 3.35, 0, r + .6, .2, 1.7, 16, vert, melange(vert, BLANC, .2), fonce(vert, .7)); F.boule(0, 5.1, 0, .22, .22, .22, [PAL.or[0], PAL.or[1], PAL.or[2]], 0);
    K.lumiere(F, 0, 2.8, 0, PAL.lumiere, 5); },
  portail_parc(F, o, R, K) {   // (posé sur la piste, "cote": "c") l'entrée d'un parc : deux piliers de pierre, une grille en arc, son nom, une haie de chaque côté
    const w = (o.eau || 3) / 2 + .45, pi = PAL.pierre, fer = hex("#2E3640"), sv = [F.ox, F.oy, F.oz, F.lacet, F.k];
    F.poser(F.ox, F.oy, F.oz, F.lacet + Math.PI / 2, F.k);   // (tourné d'un quart : x en travers de la piste, z vers qui arrive)
    for (const s of [-1, 1]) { F.boite(s * w, -.2, 0, .7, 2.6, .7, pi[1], {haut: pi[2]}); F.boite(s * w, 2.4, 0, .85, .18, .85, pi[2]); F.boule(s * w, 2.75, 0, .22, .22, .22, [pi[0], pi[1], pi[2]], 0); }
    for (let k = 0; k < 14; k++) { const a0 = k / 14 * Math.PI, a1 = (k + 1) / 14 * Math.PI, y0 = 2.45 + Math.sin(a0) * .8, y1 = 2.45 + Math.sin(a1) * .8, x0 = -Math.cos(a0) * w, x1 = -Math.cos(a1) * w;
      F.quad([x0, y0, 0], [x1, y1, 0], [x1, y1 + .12, 0], [x0, y0 + .12, 0], fer, [0, 0, 1]); F.quad([x1, y1, 0], [x0, y0, 0], [x0, y0 + .12, 0], [x1, y1 + .12, 0], fer, [0, 0, -1]); }
    if (o.texte) { F.boite(0, 2.72, 0, Math.min(2 * w - .5, 3.3), .5, .08, hex("#2E3640")); K.etiquette(F, o.texte, 0, 2.97, .05, Math.min(2 * w - .7, 3.1), .4, 48); }
    haieFoot(F, w + .4, w + 6, 0, 1.15, .8, 3); haieFoot(F, -w - 6, -w - .4, 0, 1.15, .8, 5);
    F.poser(...sv); },
  /* (18/11, Kiki : « une qui roule très rarement, ça donne de la vie ») une voiture qui passe de temps en temps sur la chaussée de la rue,
     dans un sens ou dans l'autre, à 30 km/h, au milieu (les voitures garées restent le long des bordures). Posée "cote": "g", "e": 0 au début
     de la rue ; long : les mètres de rue qu'elle parcourt. Deux fois sur cinq par cycle de 70 s : on n'en croise pas à chaque rue. */
  voiture_roule(F, o) {
    if (typeof THREE === "undefined" || typeof scene === "undefined" || o._e === 99) return;   // (le contrôle sans dessin ; un objet posé à blanc)
    const s0 = o._s, L = o.long || 150, per = o.periode || 70, k0 = Math.floor(hv(F, 5) * 97), v = 8.4, modeles = ["citadine", "berline", "break", "camionnette", "sport"];
    let m = null, vu = -1;
    VIVANTS.push(t => {
      const tl = t + s0 * 1.7, cycle = Math.floor(tl / per), tt = tl - cycle * per, hz = h2(cycle * 7.3 + s0 * .37, 3.1);   // (chaque rue a son propre rythme)
      if (hz > .4 || tt > L / v) { if (m) m.visible = false; return; }
      if (vu !== cycle) { vu = cycle; if (m) { scene.remove(m); m.geometry.dispose(); }   // à chaque passage, une autre voiture
        const G = new Forme(); dessinerVoiture(G, modeles[(k0 + cycle) % 5], k0 + cycle * 5, null); m = G.maille(); m.name = "voiture-roule"; scene.add(m); }
      const sens = hz < .2 ? 1 : -1, d = tt * v, s1 = sens > 0 ? s0 + d : s0 + L - d, s = BOUCLE ? ((s1 % LONG) + LONG) % LONG : s1, A = at(s), p = pose(s, -(A.w + (sens > 0 ? 2.95 : 4.25)));
      m.position.set(p.x, A.y - .1, p.z); m.rotation.y = Math.PI / 2 - A.h + (sens > 0 ? 0 : Math.PI); m.visible = true;
    });
  },
  /* la rue continue tout droit quand on la quitte (un passage entre deux maisons, l'entrée d'un parc) ; sens -1 : elle venait de là (on y entre).
     Posée côté de la rue ("cote": "g", "e": 0), au mètre où la bande de la rive s'arrête : la même coupe que la bande (surfaces.js, BANDE_RUE). */
  rue_continue(F, o, R, K) {
    const dir = o.sens === -1 ? -1 : 1;
    { const A = ancreRue(o, o._s); F.poser(A.x, hauteur(A.x, A.z), A.z, A.lacet, F.k); }   // (19/11) partir de la rue encore droite : 6 m avant le coin, dans l'axe qu'elle avait 10 m avant (la bande s'y arrête aussi : surfaces.js)
    const L = (o.long || 40) + 6, y0 = (at(o._s - dir * 6).y) - F.oy, pas = 2;
    const coupe = BANDE_RUE.filter(([u]) => u < 9.71);
    for (let x = -1.5; x < L; x += pas) for (let j = -1; j < coupe.length - 1; j++) {   // (elle chevauche le bout de la bande d'un mètre et demi : aucune fente entre les deux)
   // j = -1 : notre trottoir, qui continue aussi, intact, dès le coin (19/11, Kiki : « le trottoir doit rester un trottoir tout droit ») ; la piste qui tourne passe dessous
      const u0 = j < 0 ? -2.6 : coupe[j][0], u1 = j < 0 ? 0 : coupe[j + 1][0], dy0 = j < 0 ? 0 : coupe[j][1], dy1 = j < 0 ? 0 : coupe[j + 1][1];
      const pt = (xx, u, dy) => { const [X, Z] = F.monde(dir * xx, -u), yv = Math.max(hauteur(X, Z) + .03, F.oy + y0 + dy + .02); return [X, yv, Z]; };
      const A = pt(x, u0, dy0), B = pt(x, u1, dy1), C = pt(x + pas, u1, dy1), D = pt(x + pas, u0, dy0);
      for (const [p, sv, uv] of [[A, x, u0], [B, x, u1], [C, x + pas, u1], [A, x, u0], [C, x + pas, u1], [D, x + pas, u0]]) F.sol("rue_bande", p[0], p[1], p[2], dir * sv + o._s, uv);
      if (j < 0) { const E = [A[0], A[1] - .4, A[2]], G = [D[0], D[1] - .4, D[2]];   // le flanc de notre trottoir, côté jardins
        for (const [p, sv] of [[A, x], [D, x + pas], [G, x + pas], [A, x], [G, x + pas], [E, x]]) F.sol("rue_bande", p[0], p[1], p[2], dir * sv + o._s, 9.8); }
    }
    for (let x = 8; x < L - 4; x += 12) sousObjet(F, "maison", dir * x, -15.5, 0, {varie: true}, R, K);   // les maisons d'en face, tournées vers elle
    for (let x = 6; x < L; x += 16) sousObjet(F, "lampadaire", dir * x, -9.35, 0, {}, R, K);
    for (let x = 11; x < L - 4; x += 12) { const [X, Z] = F.monde(dir * x, 9.6); pres(X, Z); if (Q.e > 5) sousObjet(F, "maison", dir * x, 9.6, Math.PI, {varie: true}, R, K); }   // de notre côté aussi, derrière le trottoir, jamais sur le chemin qu'on a pris
    sousObjet(F, hv(F, 4) < .5 ? "immeuble" : "maison", dir * (L + 6), -5, dir > 0 ? -Math.PI / 2 : Math.PI / 2, {varie: true}, R, K);   // au bout, une façade ferme la vue
  },
});
/* l'ancre de la rue qui continue : le bord de la piste 6 m avant le coin, dans l'axe de la rue 10 m avant (repère : x le long, z vers la piste) */
function ancreRue(o, s) {
  const dir = o.sens === -1 ? -1 : 1, a10 = at(s - dir * 10), h = a10.h, fx = Math.sin(h), fz = -Math.cos(h);
  return {x: a10.x + fx * dir * 4 - Math.cos(h) * a10.w, z: a10.z + fz * dir * 4 - Math.sin(h) * a10.w, lacet: Math.atan2(Math.cos(h), Math.sin(h)), fx, fz, rx: Math.cos(h), rz: Math.sin(h), dir};
}
SOL_PLAT.rue_continue = (o, s) => {   // la rue et notre trottoir, du coin jusqu'au bout : l'herbe des rives n'y pousse pas (terrain.js)
  const A = ancreRue(o, s), L = (o.long || 40) + 6, P = (x, z) => [A.x + A.fx * A.dir * x + A.rx * z, A.z + A.fz * A.dir * x + A.rz * z];
  return [P(0, -9.8), P(L, -9.8), P(L, 2.7), P(0, 2.7)];
};
EMPRISE.rue_continue = o => { const L = o.long || 40, dir = o.sens === -1 ? -1 : 1, r = []; for (let x = -4; x <= L + 6; x += 5) r.push([dir * x, -5, 5.2]); for (let x = -6; x <= L; x += 2.5) r.push([dir * x, 1.5, 2.1]); return r; };   // la rue, et notre trottoir qui la longe : rien n'y est posé
