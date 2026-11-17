/* ============ les trotteurs : au marcheur elliptique, ton Pokémon trottine devant toi (16/11, Kiki) ============ */
// Un Pokémon terrestre en sprite de Donjon Mystère, vu de dos : un footing léger, pas une course. Même principe que les nageurs du rameur :
// une petite fiche par Pokémon (contenu/trotteurs.json), sa VRAIE taille (celle du Pokédex, ajoutée par page.py), la caméra qui s'adapte
// (GABARIT), le corps qui se tourne dans les virages (monture.js), le choix au menu gardé sur l'appareil (riviere_trotteur, ?trotteur=25).
// Son trot suit TES gestes : un tour de jambes de la machine = « cycles » cycles de marche (fiche), calés sur chaque geste reçu ; plus de
// geste, il ralentit et s'arrête sur une pose de repos. Au sol : son ombre à sa taille, un peu de poussière à chaque foulée.
// La vitesse du décor (6,5 km/h à l'allure habituelle) est dans jeu/allure.js : VU.
const TROT = {ph: 0, corr: 0, nb: -1, pas: -1, num: 0, fiche: null};
const ficheTrotteur = num => (TROTTEURS.liste || []).find(f => f.num === +num) || null;
const trotteurVoulu = () => { const n = +PARAMS.get("trotteur") || +lireReglage("riviere_trotteur", 0); return ficheTrotteur(n) ? n : ficheTrotteur(TROTTEURS.defaut) ? TROTTEURS.defaut : ((TROTTEURS.liste || [])[0] || {}).num || 0; };
const trotteurActif = () => DISCIPLINE !== "eau" && typeof MACHINE !== "undefined" && MACHINE.monture === "trotteur" && (TROTTEURS.liste || []).length > 0;

/* la hauteur du corps sur la première image, en pixels : la planche d'une marche qui bondit (Évoli, Tauros) est plus haute que son Pokémon */
function corpsTrotteur(pl, rang) {
  let y0 = -1, y1 = -1;
  for (let y = 0; y < pl.fh; y++) if (pl.largeur(rang, y) > 0) { if (y0 < 0) y0 = y; y1 = y + 1; }
  return y0 < 0 ? 0 : y1 - y0;
}
async function changerTrotteur(num) {   // le Pokémon choisi, à sa vraie taille ; false : pas de fiche ou pas de planche (le jeu garde le Pokémon du circuit)
  const fiche = ficheTrotteur(num) || ficheTrotteur(trotteurVoulu()); if (!fiche) return false;
  const pl = await planche(String(fiche.num).padStart(4, "0") + "/Walk"); if (!pl) return false;
  if (nageur) retirerPantin(nageur);
  const b = pl.boite(4), corps = corpsTrotteur(pl, 4) || (b.y1 - b.y0), h = (fiche.taille || .5) * (fiche.part || 1) * (b.y1 - b.y0) / corps;
  nageur = new Pantin(pl, 4, 1, h); nageur.trot = fiche;
  Object.assign(TROT, {num: fiche.num, fiche, ph: 0, corr: 0, nb: -1, pas: -1}); NAGEUR.num = fiche.num; NAGEUR.fiche = null;
  GABARIT.f = clamp(Math.pow((fiche.taille || .5) / .97, .42), .76, 1.85); GABARIT.hw = clamp(nageur.l / 2, .12, 1.2);
  if (typeof fantomeOublier === "function") fantomeOublier();
  return true;
}

function poussiereTrot(s, d, y, large, force) {   // quelques grains qui sautent derrière la patte qui pousse
  const a = pose(s, d), G = GOUTTES;
  for (let j = 0; j < 3; j++) {
    const k = G.k = (G.k + 1) % G.n;
    G.p[k * 3] = a.x + (Math.random() - .5) * large; G.p[k * 3 + 1] = y + .04; G.p[k * 3 + 2] = a.z + (Math.random() - .5) * large; G.sol[k] = y - .08;
    G.v[k * 3] = (Math.random() - .5) * .9; G.v[k * 3 + 1] = (.7 + Math.random() * 1.1) * force; G.v[k * 3 + 2] = (Math.random() - .5) * .9; G.vie[k] = 1;
    G.t[k] = .8 + Math.random() * .6;
  }
  G.geo.attributes.aT.needsUpdate = true;
}

/* chaque image (appelé par monture.js : MONTURES.trotteur.animer) : p = où il est, k = la courbe de la piste devant lui */
function trotter(N, t, dt, S, p, sol, bond, k) {
  if (!N) return;
  orienterPantin(N, S.s, M.d);   // vu de la caméra (directions.js)
  const f = N.trot || {}, cycles = f.cycles || 1, g = Math.sqrt(N.h), phi = S.phi === undefined ? 9 : S.phi, T_ = TROT;
  // le rythme : celui de tes gestes. À chaque geste reçu, le trot se recale en douceur sur le début d'un cycle ; sans geste, il s'éteint.
  const tours = (cadence() || MACHINE.cadence || 55) / 60, r = tours * cycles * (phi <= 1.3 ? 1 : clamp(2.3 - phi, 0, 1));
  if (S.nb !== T_.nb) { if (T_.nb >= 0 && S.nb > T_.nb) T_.corr = Math.round(T_.ph / cycles) * cycles - T_.ph; T_.nb = S.nb; }
  if (dt > 0) {
    const c = T_.corr * (1 - Math.exp(-dt / .2)); T_.corr -= c; T_.ph += Math.max(0, r * dt + c);
    if (r === 0 && (S.vd || 0) < .3) T_.ph += (Math.ceil(T_.ph - .02) - T_.ph) * clamp(dt * 5, 0, 1);   // à l'arrêt : il finit sa foulée et se pose
  }
  const marche = clamp((S.vd || 0) / .8, 0, 1) * (1 - M.sorti), frac = ((T_.ph % 1) + 1) % 1;
  N.image(N.pl.image(frac * N.pl.total * .999));
  const saut = Math.abs(Math.sin(T_.ph * Math.PI * 2)) * (f.foulee === undefined ? .05 : f.foulee) * g * marche;
  N.m.position.set(p.x, M.y + saut + bond * (bond > 0 ? 1 : N.h), p.z); N.regarder();
  N.m.rotation.z = -clamp(k * 2.2, -.12, .12) * Math.min(1, (S.vd || 0) / 1.5) * (1 - M.sorti);   // il se penche un peu dans le virage
  N.m.scale.set(N.l, N.h, 1);
  // la poussière : à chaque foulée (deux par cycle), derrière lui
  const pas = Math.floor(T_.ph * 2);
  if (pas !== T_.pas) { T_.pas = pas; if (dt > 0 && marche > .6 && !S.enAir) poussiereTrot(S.s - .2 - N.h * .2, M.d, M.y, N.l * .7, clamp(g, .6, 1.3)); }
  // l'ombre à sa taille : surfaces.js la dessine plus petite et plus pâle avec la hauteur ; on lui dit une hauteur qui donne sa largeur à lui
  const haut = Math.max(0, M.y + Math.max(0, bond) + saut - sol), kO = clamp(N.l * 1.25, .3, 2.2);
  OMBRE_U.uOmbre.value.set(.55 / kO, (1 / kO * (1 + haut * .35) - 1) / .35, 0);
}
if (typeof MONTURES !== "undefined") MONTURES.trotteur = {enfonce: 0, foulee: 0, trace: Infinity, animer: trotter};   // trace : la poussière vient de ses foulées, pas des mètres parcourus
