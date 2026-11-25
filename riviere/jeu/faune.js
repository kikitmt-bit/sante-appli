/* ============ la faune : elle vit (25/11 ; où et qui : moteur/faune.js, contenu/faune.json) ============ */
// Une bête = un Pokémon de Donjon Mystère avec TOUTES ses animations (dormir, manger, sauter, frapper, s'envoler…), à sa vraie taille : la hauteur de son
// image au repos = sa taille du Pokédex, et chaque animation garde la même échelle, calée sur ses pieds. Une ombre ronde le pose au sol.
// Ses images arrivent quand on approche (240 m), jamais au départ. Une scène commence quand on arrive (dv : les mètres qu'il reste avant elle), finit
// quand on est passé, et se remet en place quand on est loin : le tour d'après, elle recommence.
// Ajouter une façon d'être : une fonction de plus dans JEUX (g : la scène, b : la bête, t : le temps de la scène, dt, dv).
const FAUNE_VIE = {groupes: []};
const OMBRE_FAUNE = (() => { const g = new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2); return [g, new THREE.MeshBasicMaterial({color: 0x101828, transparent: true, opacity: .28, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -60})]; })();
class Bete {
  constructor(a) {
    this.a = a; this.num = String(a.num).padStart(4, "0"); this.h = (TAILLES_PKM[String(a.num)] || .6) * ((FAUNE.especes[a.num] || {}).part || 1);
    this.p = {}; this.x = a.x; this.y = a.y; this.z = a.z; this.cx = a.cx; this.cz = a.cz; this.mode = null; this.t0 = 0; this.ph = Math.random() * 9; this.k = 1; this.kl = 1; this.cache = false; this.ombre = null; this.actif = null; this.pas = 1;
  }
  async charger(noms) {
    if (!this.p.Idle) this.p.Idle = 1, this.base = planche(this.num + "/Idle").then(async pl => { pl = pl || await planche(this.num + "/Walk"); if (!pl) return false; const b = pl.boite(0); this.mpp = this.h / Math.max(1, b.y1 - b.y0); this.pied = b.y1 - pl.fh / 2; this.poser("Idle", pl); this.ombre = new THREE.Mesh(...OMBRE_FAUNE); this.ombre.visible = false; const r = clamp((b.x1 - b.x0) * this.mpp * .42, .1, 2.4); this.ombre.scale.set(r, 1, r * .8); scene.add(this.ombre); return true; });
    if (!await this.base) return;
    for (const n of noms) if (!this.p[n]) { this.p[n] = 1; planche(this.num + "/" + n).then(pl => { if (pl) this.poser(n, pl); else this.p[n] = null; }); }
  }
  poser(n, pl) { const q = new Pantin(pl, 0, 1, 1); q.m.visible = false; q.m.material.transparent = false; this.p[n] = q; }
  a_(n) { return this.p[n] && this.p[n].m ? this.p[n] : null; }
  /* jouer l'animation n (l'Idle si elle n'est pas là) ; vite : sa vitesse ; rend true quand elle est finie (une fois jouée en entier) */
  jouer(n, t, vite = 1) {
    if (this.mode !== n) { this.mode = n; this.t0 = t; }
    const q = this.a_(n) || this.a_("Idle"); if (this.actif && this.actif !== q) this.actif.m.visible = false; this.actif = q; if (!q) return false;
    const u = (t - this.t0) * vite; q.image(q.pl.image(Math.max(0, u))); return u >= q.pl.total; }
  vers(dx, dz) { if (dx * dx + dz * dz > 1e-6) { this.cx = dx; this.cz = dz; } }
  regardeMoi() { this.cx = camera.position.x - this.x; this.cz = camera.position.z - this.z; }
  /* poser l'image : tournée vers la caméra, la rangée d'après son cap (0 = de face, 4 = de dos), les pieds au sol ; dy : en l'air */
  montrer(dy = 0, ombre = true) {
    const q = this.actif; if (!q) return; const vu = !this.cache; q.m.visible = vu; if (this.ombre) this.ombre.visible = vu && ombre && !this.a.eau; if (!vu) return;
    const fx = this.x - camera.position.x, fz = this.z - camera.position.z, l = Math.hypot(fx, fz) || 1, ax = fx / l, az = fz / l, vr = this.cx * -az + this.cz * ax, vf = this.cx * ax + this.cz * az;
    const r = ((Math.round(Math.atan2(vr, -vf) / (Math.PI / 4)) % 8) + 8) % 8, i = q.i; if (q.rang !== Math.min(r, q.pl.rows - 1)) { q.rangee(r); q.image(Math.max(0, i)); }
    const m = this.mpp, b = q.b, ang = Math.atan2(-fx, -fz), xo = ((b.x0 + b.x1) / 2 - q.pl.fw / 2) * m * this.kl, yo = (q.pl.fh / 2 + this.pied - b.y1) * m * this.k;
    q.m.rotation.y = ang; q.m.scale.set((b.x1 - b.x0) * m * this.kl, (b.y1 - b.y0) * m * this.k, 1); q.m.position.set(this.x + Math.cos(ang) * xo, this.y + dy + yo, this.z - Math.sin(ang) * xo);
    if (this.ombre) { this.ombre.position.set(this.x, this.y + .07, this.z); }
  }
  eteindre() { if (this.actif) this.actif.m.visible = false; if (this.ombre) this.ombre.visible = false; }
  remettre() { const a = this.a; this.x = a.x; this.y = a.y; this.z = a.z; this.cx = a.cx; this.cz = a.cz; this.mode = null; this.cache = false; this.k = this.kl = 1; this.st = null; this.tic = null; this.pt = 0; this.u = 0; }
}
/* aller vers un point, au pas : rend true quand il y est */
function beteVa(b, p, v, dt, t, vite) { const dx = p.x - b.x, dz = p.z - b.z, l = Math.hypot(dx, dz), m = v * dt; b.vers(dx, dz); b.jouer("Walk", t, vite); if (l <= m) { b.x = p.x; b.z = p.z; b.y = p.y; return true; } b.x += dx / l * m; b.z += dz / l * m; b.y += (p.y - b.y) * m / l; return false; }
/* au repos : de temps en temps, un petit geste à lui ; quand on passe tout près, il se tourne et saute de joie */
function beteRepos(g, b, t, dv, joie = true) {
  if (joie && dv < 11 && dv > -4) { b.regardeMoi(); b.tic = null; b.jouer("Hop", t); return; }
  if (b.tic) { if (b.jouer(b.tic, t)) { b.tic = null; b.att = t + 2.5 + Math.random() * 4; } return; }
  b.jouer("Idle", t + b.ph); if (b.att === undefined) b.att = t + Math.random() * 3;
  if (t > b.att && g.tics.length) { const n = g.tics[Math.floor(Math.random() * g.tics.length)]; if (b.a_(n)) b.tic = n; else b.att = t + 1; }
}
const vit = v => clamp(v * 1.1, .6, 3);   // la vitesse de l'animation de marche, selon l'allure
const gerbeA = (b, force) => { pres(b.x, b.z); gerbe(sLigne(Q.i), force, Q.d, b.y, clamp(b.h * .5, .2, 1.4)); };
const JEUX = {
  regarde: {anims: ["Hop"], maj(g, b, t, dt, dv) { beteRepos(g, b, t, dv, !b.a.perche); if (b.a.perche && dv < 14 && dv > -3) b.regardeMoi(); b.montrer(0, !b.a.perche); }},
  dort: {anims: ["Sleep"], maj(g, b, t, dt, dv) { b.jouer("Sleep", t + b.ph); b.montrer(0, !b.a.perche); }},
  travaille: {anims: ["Strike"], maj(g, b, t, dt, dv) { if (b.tic) { if (b.jouer("Strike", t)) { b.tic = null; b.att = t + .5 + Math.random(); } } else { b.jouer("Idle", t); if (!(t < b.att)) b.tic = 1; } b.montrer(); }},
  flane: {anims: ["Walk"], maj(g, b, t, dt, dv) {
    const P = b.a.pts || [], v = g.d.vitesse || clamp(.35 + b.h * .5, .35, 1.3);
    if (P.length > 1 && b.st === "va") { if (beteVa(b, P[b.pt], v, dt, t, vit(v / b.h * .6))) { b.st = null; b.att = t + 2 + Math.random() * 4; b.dep = b.att + 1.5; } }
    else { beteRepos(g, b, t, dv, false); if (b.dep === undefined) b.dep = t + Math.random() * 4; if (P.length > 1 && t > b.dep && !b.tic) { b.pt = (b.pt + 1 + Math.floor(Math.random() * (P.length - 1))) % P.length; if (Math.abs(b.pt - (b.der || 0)) > 1) b.pt = (b.der || 0) + Math.sign(b.pt - (b.der || 0)); b.der = b.pt; b.st = "va"; } else if (dv < 9 && dv > -3) b.regardeMoi(); }   // d'un point au voisin seulement : le chemin entre les deux est libre
    b.montrer(); }},
  envol: {anims: ["FlapAround", "Hover", "Walk", "Eat", "Attack"], maj(g, b, t, dt, dv) {
    if (b.st === "parti") { b.cache = true; b.eteindre(); return; }
    if (!b.st && dv < 8 + (S.vd || 0) * 1.5 && dv > -2) { b.st = "attend"; b.t1 = t + Math.random() * .55; const h = at(g.s).h, sd = Q_cote(b, g.s), e = .25 + Math.random() * .5; b.dx = Math.sin(h) * Math.cos(e) + Math.cos(h) * sd * Math.sin(e); b.dz = -Math.cos(h) * Math.cos(e) + Math.sin(h) * sd * Math.sin(e); b.v = 0; b.dy = 0; }
    if (b.st === "attend" && t > b.t1) b.st = "vole";
    if (b.st === "vole") { b.v = Math.min(8.5, b.v + 11 * dt); b.x += b.dx * b.v * dt; b.z += b.dz * b.v * dt; b.dy += (1.6 + b.v * .38) * dt; b.vers(b.dx, b.dz); b.jouer(b.a_("Walk") ? "Walk" : "FlapAround", t, 2.6); b.montrer(b.dy, b.dy < 1.5); if (b.dy > 24) b.st = "parti"; return; }
    if (b.tic) { if (b.jouer(b.tic, t)) { b.tic = null; b.att = t + .5 + Math.random() * 3; } } else { b.jouer("Idle", t + b.ph); if (b.att === undefined) b.att = t + Math.random() * 3; if (t > b.att) { const a = Math.random() * 6.28; if (!b.a.perche) b.vers(Math.cos(a), Math.sin(a)); b.tic = b.a_("Eat") ? "Eat" : "Attack"; } }
    b.montrer(0, !b.a.perche); }},
  fuite: {anims: ["Walk"], maj(g, b, t, dt, dv) {
    if (b.st === "parti") { b.eteindre(); return; }
    if (!b.st && dv < 5 + (S.vd || 0) * 1.3 && dv > -2) { b.st = "surpris"; b.t1 = t + .25; b.regardeMoi(); }
    if (b.st === "surpris") { b.jouer("Hop", t); if (t > b.t1) b.st = "court"; b.montrer(); return; }
    if (b.st === "court") { if (beteVa(b, b.a.pts[1], 5, dt, t, 3)) { b.st = "parti"; b.eteindre(); return; } const l = Math.hypot(b.a.pts[1].x - b.x, b.a.pts[1].z - b.z); b.k = b.kl = clamp(l / .8, .05, 1); b.montrer(); return; }
    beteRepos(g, b, t, 99); b.montrer(); }},
  court: {anims: ["Walk", "Hop", "Attack"], maj(g, b, t, dt, dv) {   // il t'attend, part avec toi, reste à ta hauteur jusqu'au bout de son terrain, et te regarde partir
    const T = b.a.pts, L = g.long, moi = -dv;
    if (!b.st && dv < 7 && dv > -L) { b.st = "court"; b.u = 0; b.v = 0; }
    if (b.st === "court") { const but = clamp(moi + 4.5 + Math.sin(t * .7) * 1.4, 0, L), vm = Math.max(S.vd || 0, .2) * 1.5 + 1.2; b.v += (clamp((but - b.u) * 1.6, 0, vm) - b.v) * Math.min(1, dt * 4); b.u += b.v * dt; const i = Math.min(T.length - 2, Math.floor(b.u / 2)), f = clamp(b.u / 2 - i, 0, 1); b.x = lerp(T[i].x, T[i + 1].x, f); b.z = lerp(T[i].z, T[i + 1].z, f); b.y = lerp(T[i].y, T[i + 1].y, f); b.vers(T[i + 1].x - T[i].x, T[i + 1].z - T[i].z);
      if (b.v > .25) b.jouer("Walk", t, clamp(b.v / (b.h + .4), .8, 3.2)); else b.jouer("Idle", t); if (b.u > L - .6) b.st = "fini"; b.montrer(b.v > 2.5 ? Math.abs(Math.sin(t * 9)) * b.h * .12 : 0); return; }
    if (b.st === "fini") { b.regardeMoi(); if (moi < L + 12) b.jouer("Hop", t); else b.jouer("Idle", t); } else beteRepos(g, b, t, 99); b.montrer(); }},
  nage: {anims: ["Walk"], maj(g, b, t, dt, dv) { const P = b.a.pts, v = clamp(.5 + b.h * .3, .5, 1.3), p = P[b.pt || 0]; if (beteVa(b, p, v, dt, t, .7)) b.pt = b.pt ? 0 : 1; b.montrer(-b.h * .36 + Math.sin(t * 2.2 + b.ph) * .04, false); }},
  plonge: {anims: ["Walk", "Hop"], maj(g, b, t, dt, dv) {   // il nage, plonge juste avant toi, et ressort plus loin, de l'autre côté
    const P = b.a.pts, loin = P[2] || P[1];
    if (!b.st && dv < 6 + (S.vd || 0) * .8 && dv > -1) { b.st = "plonge"; b.t1 = t; gerbeA(b, .6); }
    if (b.st === "plonge") { const u = (t - b.t1) / .6; b.jouer("Walk", t); b.montrer(-b.h * (.36 + u * 1.1), false); if (u >= 1) { b.st = "dessous"; b.t1 = t; b.eteindre(); } return; }
    if (b.st === "dessous") { b.eteindre(); if (t - b.t1 > 1.5) { b.st = "ressort"; b.t1 = t; b.x = loin.x; b.z = loin.z; b.regardeMoi(); gerbeA(b, .8); } return; }
    if (b.st === "ressort") { const u = clamp((t - b.t1) / .5, 0, 1); b.regardeMoi(); b.jouer(u < 1 ? "Walk" : "Hop", t); b.montrer(-b.h * (1.3 - u * .94) + Math.sin(t * 2.2) * .04, false); return; }
    if (beteVa(b, P[b.pt || 0], .6, dt, t, .7)) b.pt = b.pt ? 0 : 1; b.montrer(-b.h * .36 + Math.sin(t * 2.2 + b.ph) * .04, false); }},
  saute: {anims: ["Walk", "Hop"], maj(g, b, t, dt, dv) {   // sous l'eau ; quand tu arrives, il jaillit, deux ou trois fois
    const [A, B] = b.a.pts; if (dv > 30 || dv < -12) { b.eteindre(); b.t1 = undefined; return; }
    if (b.t1 === undefined) { b.t1 = t + .2 + b.ph * .14; b.sens = 0; b.dehors = false; }
    const u = (t - b.t1) / (.75 + b.h * .25); if (u < 0) { b.eteindre(); return; }
    if (u >= 1) { if (b.dehors) { b.dehors = false; b.x = b.sens ? A.x : B.x; b.z = b.sens ? A.z : B.z; gerbeA(b, .9); } b.eteindre(); b.t1 = t + 1.4 + Math.random() * 1.6; b.sens ^= 1; return; }
    const p = b.sens ? B : A, q = b.sens ? A : B; if (!b.dehors) { b.dehors = true; b.x = p.x; b.z = p.z; gerbeA(b, .8); }
    b.x = lerp(p.x, q.x, u); b.z = lerp(p.z, q.z, u); b.vers(q.x - p.x, q.z - p.z); b.jouer("Walk", t, 2); b.montrer(Math.sin(u * Math.PI) * (.9 + b.h * .8) - b.h * .4, false); }},
  arrose: {anims: ["Shoot", "Hop"], maj(g, b, t, dt, dv) {
    if (dv < 10 && dv > -1) { b.regardeMoi(); if (b.tic) { if (b.jouer("Shoot", t)) { b.tic = null; b.att = t + .8; } else { const l = Math.hypot(b.cx, b.cz) || 1, u = (t - b.t0) * 9; if (u < 5 && Math.random() < .8) { const x = b.x, z = b.z; b.x += b.cx / l * u; b.z += b.cz / l * u; gerbeA(b, .05); b.x = x; b.z = z; } } } else { b.jouer("Idle", t); if (!(t < b.att)) b.tic = 1; } } else beteRepos(g, b, t, dv, false);
    b.montrer(); }},
  taupe: {anims: ["Hop"], maj(g, b, t, dt, dv) {   // il sort de terre à ton approche, te regarde, et rentre juste avant que tu passes
    const but = dv < 24 && dv > 4.5 - b.ph * .2 ? 1 : 0; b.u = (b.u || 0) + clamp(but - (b.u || 0), -dt * 4, dt * 1.6); if (b.u < .02) { b.eteindre(); return; } b.regardeMoi(); b.jouer("Idle", t); b.montrer(-b.h * 1.15 * (1 - b.u) + (b.u > .95 ? Math.abs(Math.sin(t * 5 + b.ph)) * .03 : 0), b.u > .6); }},
  teleporte: {anims: ["Sleep"], maj(g, b, t, dt, dv) {   // il dort (dix-huit heures par jour) ; dérangé, il disparaît, et se rendort un peu plus loin
    if (b.st === "parti") { if (t - b.t1 < 2) { b.eteindre(); return; } const p = b.a.pts[b.a.pts.length - 1]; b.x = p.x; b.y = p.y; b.z = p.z; b.k = b.kl = 1; b.st = "loin"; }
    if (!b.st && dv < 7 && dv > -2) { b.st = "flash"; b.t1 = t; }
    if (b.st === "flash") { const u = (t - b.t1) / .3; b.kl = Math.max(.03, 1 - u); b.k = 1 + u * .9; b.jouer("Sleep", t); b.montrer(0, false); if (u >= 1) { b.st = "parti"; b.t1 = t; b.eteindre(); } return; }
    b.jouer("Sleep", t); b.montrer(); }},
  danse: {anims: ["Walk", "Hop", "Dance"], maj(g, b, t, dt, dv, i, n) { const c = g.centre || b.a, r = Math.hypot(b.a.x - c.x, b.a.z - c.z) || 1, a0 = Math.atan2(b.a.z - c.z, b.a.x - c.x), a = a0 + t * .5; b.x = c.x + Math.cos(a) * r; b.z = c.z + Math.sin(a) * r; b.y = c.y; b.vers(-Math.sin(a), Math.cos(a)); b.jouer(b.a_("Dance") ? "Dance" : "Hop", t + i * .2); b.montrer(); }},
  guette: {anims: ["Hop"], maj(g, b, t, dt, dv) {   // derrière un tronc : il passe la tête à ton approche, et se cache quand tu es là
    const but = dv < 26 && dv > 6 ? .62 + Math.sin(t * 1.3 + b.ph) * .38 : 0; b.u = (b.u || 0) + clamp(but - (b.u || 0), -dt * 3.5, dt * 1.6); b.x = b.a.x + b.a.lx * b.u; b.z = b.a.z + b.a.lz * b.u; b.regardeMoi(); b.jouer("Idle", t); b.montrer(); }},
  plane: {anims: ["Walk"], maj(g, b, t, dt, dv, i, n) { const d = g.d, R = (d.rayon || 8) * (1 + i * .18), v = d.vitesse || 4, a = t * v / R + i * 6.283 / n + g.ph, x = b.a.x + Math.cos(a) * R, z = b.a.z + Math.sin(a) * R; b.vers(-Math.sin(a), Math.cos(a)); b.x = x; b.z = z; b.y = b.a.y; b.jouer("Walk", t + b.ph, d.haut > 6 ? 1 : 1.8); b.montrer((d.haut || 3) + Math.sin(t * 1.7 + b.ph) * (d.haut > 6 ? .9 : .35), d.haut < 3); }},
  hante: {anims: ["Walk"], maj(g, b, t, dt, dv) {   // il flotte, et s'efface quand on l'approche
    const but = dv < 34 && dv > 7 ? 1 : 0; b.u = (b.u || 0) + clamp(but - (b.u || 0), -dt * 2.2, dt * .8); if (b.u < .04) { b.eteindre(); return; } b.regardeMoi(); b.jouer("Idle", t); b.kl = b.k = .25 + .75 * b.u; b.x = b.a.x + Math.sin(t * .6 + b.ph) * .5; b.montrer((g.d.haut || 1) + Math.sin(t * 1.4 + b.ph) * .16, false); }},
};
const Q_cote = (b, s) => { const a = at(s); return (b.a.x - a.x) * Math.cos(a.h) + (b.a.z - a.z) * Math.sin(a.h) < 0 ? -1 : 1; };   // de quel côté du parcours
function construireFaune() {
  FAUNE_VIE.groupes = (MONDE.faune || []).map(f => ({d: f.d, s: f.s, long: f.long || 0, centre: f.centre, tics: f.d.tics || [], ph: Math.random() * 6.28, betes: f.acts.map(a => new Bete(a)), pret: false, t: 0, actif: false}));
  for (const g of FAUNE_VIE.groupes) g.betes.forEach(b => b.remettre());
}
function animerFaune(t, S, dt) {
  const nuit = typeof AMB !== "undefined" && AMB.nuit > .5;
  for (const g of FAUNE_VIE.groupes) {
    const dv = ecart(g.s, S.s), J = JEUX[g.d.jeu] || JEUX.regarde, portee = g.d.haut > 6 ? 190 : 120, la = dv < portee && dv > -45 - g.long && (!g.d.moment || (g.d.moment === "nuit") === nuit);
    if (!g.pret && dv < 240 && dv > -80) { g.pret = true; const noms = J.anims.concat(g.tics); for (const b of g.betes) b.charger(noms); }
    if (!la) { if (g.actif) { g.actif = false; for (const b of g.betes) { b.eteindre(); b.remettre(); } } continue; }
    g.actif = true; const n = g.betes.length; for (let i = 0; i < n; i++) if (g.betes[i].a_("Idle")) J.maj(g, g.betes[i], t, dt, dv, i, n);
  }
}
window.__faune = () => FAUNE_VIE.groupes.map(g => Math.round(g.s) + " m : " + g.d.id + " (" + g.d.jeu + (g.d.moment ? ", " + g.d.moment : "") + ") × " + g.betes.length);
