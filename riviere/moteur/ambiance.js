/* ============ l'ambiance : l'heure qu'il est, le temps qu'il fait, et l'air du lieu où l'on passe ============ */
// Trois choses se mélangent, sans jamais toucher aux formes du monde :
//   l'HEURE   "jour" (par défaut), "aube", "matin", "soir", "crepuscule", "nuit", un nombre (17.5), "reelle" (l'heure de ta montre),
//             "cycle" (une journée entière défile pendant la séance : "jour_min" minutes pour 24 h, départ à "heure_depart")
//   le TEMPS  "beau" (par défaut), "nuages", "pluie", "orage", "brume", "neige", "vent", "variable" (il change tout seul, en douceur)
//   le LIEU   une pièce du niveau peut avoir une ambiance ("ambiance": "sous-bois") ; une grotte a la sienne (contenu : BIOME.grottes) ;
//             chaque sorte de rive peut semer ses particules ("particules": "feuilles" dans la région)
// Qui décide : l'adresse (?heure=nuit&meteo=pluie), sinon le choix du menu (gardé sur la machine), sinon le niveau, sinon jour et beau.
// Tout passe par les réglages partagés (COMMUNS) et par le ciel (CIEL.U) : aucun matériau n'a besoin de connaître l'heure.
// Ajouter une ambiance de lieu : "ambiances" dans la région. Ajouter un temps : une ligne dans METEOS.

/* l'heure : des repères, entre lesquels on glisse. haut, bas : les couleurs du ciel (null : celles du jour de la région) ; teinte : celle de toute la scène ;
   nuit : les lampes et les fenêtres s'allument ; etoiles ; nuage : la couleur des nuages */
const HEURES = BIOME.heures || [
  [0, "#0A0F2E", "#1C2A58", [.44, .52, .84], 1, 1, "#39446E"],
  [5, "#0A0F2E", "#1C2A58", [.44, .52, .84], 1, 1, "#39446E"],
  [6.2, "#34488E", "#F2B48C", [.80, .72, .80], .5, .25, "#F0A090"],
  [7.4, "#5A98E4", "#FBE0BE", [1, .94, .86], 0, 0, "#FFE8D0"],
  [9.5, null, null, [1, 1, 1], 0, 0, "#FFFFFF"],
  [16.5, null, null, [1, 1, 1], 0, 0, "#FFFFFF"],
  [18.2, "#4C80D2", "#F8D8A2", [1.03, .92, .76], 0, 0, "#FFE2B4"],
  [19.4, "#3A4A98", "#F6945C", [.96, .72, .62], .35, 0, "#FF9C78"],
  [20.4, "#1A2254", "#665088", [.58, .56, .82], 1, .6, "#6C5C90"],
  [21.6, "#0A0F2E", "#1C2A58", [.44, .52, .84], 1, 1, "#39446E"],
  [24, "#0A0F2E", "#1C2A58", [.44, .52, .84], 1, 1, "#39446E"],
];
const HEURES_NOM = {aube: 6.3, matin: 8, jour: 12, soir: 18.4, crepuscule: 19.5, nuit: 23};
const METEOS = {
  beau: {couvert: 0, pluie: 0, neige: 0, brume: 0, vent: .2, orage: 0},
  nuages: {couvert: .6, pluie: 0, neige: 0, brume: .05, vent: .45, orage: 0},
  pluie: {couvert: .9, pluie: .75, neige: 0, brume: .3, vent: .5, orage: 0},
  orage: {couvert: 1, pluie: 1, neige: 0, brume: .35, vent: .9, orage: 1},
  brume: {couvert: .4, pluie: 0, neige: 0, brume: 1, vent: .05, orage: 0},
  neige: {couvert: .75, pluie: 0, neige: .85, brume: .4, vent: .3, orage: 0},
  vent: {couvert: .25, pluie: 0, neige: 0, brume: 0, vent: 1, orage: 0},
};
const VARIABLE = ["beau", "beau", "beau", "nuages", "nuages", "pluie", "beau", "brume", "nuages", "orage", "beau", "vent"];   // « variable » : la suite des temps, tirée d'après la date
const AMBIANCES = Object.assign({
  "sous-bois": {teinte: [.84, .97, .82], sombre: .93, brume: "#CDE8B4", voile: .5, dense: .22, particules: "pollen"},
  marais: {teinte: [.9, .98, .88], brume: "#D4E4C0", voile: .7, dense: .5, particules: "lucioles"},
  grotte: {sombre: .86, abri: 1},
  volcan: {teinte: [1.06, .92, .84], brume: "#E8C0A8", voile: .6, dense: .2, particules: "braises"},
  sommet: {teinte: [.96, 1, 1.06], dense: .12},
  plage: {teinte: [1.04, 1.01, .95]},
}, BIOME.ambiances || {});
/* les particules : couleur(s), taille (pixels), vitesse propre, errance, lumineuse ou non, combien */
const PARTICULES = Object.assign({
  pollen: {c: ["#FFF6C0"], t: 1.5, v: [0, .12, 0], err: .45, n: 46},
  lucioles: {c: ["#D8FF70", "#F4FF9C"], t: 2.5, v: [0, 0, 0], err: .7, lum: 1, clignote: 1, n: 34},
  feuilles: {c: [(BIOME.palette.feuilles || [0, "#62C262"])[1], (BIOME.palette.feuilles || [0, 0, "#A2E27A"])[2], "#E0B050"], t: 2.5, v: [0, -1, 0], err: .9, vent: 1, n: 30},
  petales: {c: ["#FFC0D8", "#FFE0EC"], t: 2, v: [0, -.7, 0], err: .8, vent: 1, n: 40},
  braises: {c: ["#FF9040", "#FFD060"], t: 2, v: [0, 1.3, 0], err: .7, lum: 1, n: 50},
  poussiere: {c: ["#EFE8D8"], t: 1.5, v: [0, -.04, 0], err: .12, n: 36},
  etincelles: {c: ["#A8F0FF", "#FFFFFF"], t: 2, v: [0, .1, 0], err: .2, lum: 1, clignote: 1, n: 40},
  neige: {c: ["#FFFFFF"], t: 2, v: [0, -1.5, 0], err: .55, vent: 1, n: 190},
}, BIOME.particules || {});
const NUIT_A_LA_PLACE = {pollen: "lucioles", petales: "lucioles", feuilles: "lucioles"};   // la nuit, dehors : des lucioles à la place

const AMB = {
  heure: "jour", h: 12, meteo: "beau", m: Object.assign({}, METEOS.beau), manteau: 0, eclair: 0, attente: 6, echo: 0, t: 0, t0: 0,
  zone: {teinte: [1, 1, 1], sombre: 1, voile: 0, dense: 0, abri: 0, brume: [1, 1, 1]}, nuit: 0, soleilFixe: SOLEIL.clone(), teinte: [1, 1, 1],
};
const choixAmbiance = (cle, defaut) => { const g = lireReglage("riviere_" + cle, null); return PARAMS.get(cle) || (g && g !== "circuit" ? g : null) || NIVEAU[cle] || defaut; };
function reglerAmbiance(heure, meteo) {   // changer l'heure ou le temps (le menu, les essais : window.__ambiance("nuit", "pluie"))
  if (heure !== undefined && heure !== null) { AMB.heure = heure; AMB.t0 = AMB.t; }
  if (meteo !== undefined && meteo !== null) { AMB.meteo = METEOS[meteo] || meteo === "variable" ? meteo : "beau"; if (meteo === "neige") AMB.manteau = .55; }
}
reglerAmbiance(choixAmbiance("heure", "jour"), choixAmbiance("meteo", "beau"));
if (METEOS[AMB.meteo]) Object.assign(AMB.m, METEOS[AMB.meteo]);   // au départ : tout de suite le temps demandé

function heureDuMoment() {
  const v = AMB.heure;
  if (v === "reelle") { const d = new Date(); return d.getHours() + d.getMinutes() / 60; }
  if (v === "cycle") return ((NIVEAU.heure_depart === undefined ? 16 : NIVEAU.heure_depart) + (AMB.t - AMB.t0) / 60 * 24 / (NIVEAU.jour_min || 12)) % 24;
  if (HEURES_NOM[v] !== undefined) return HEURES_NOM[v];
  return isFinite(+v) ? ((+v % 24) + 24) % 24 : 12;
}
function meteoDuMoment() {
  if (AMB.meteo !== "variable") return METEOS[AMB.meteo] || METEOS.beau;
  const d = new Date(), graine = d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate(), k = Math.floor(AMB.t / ((NIVEAU.meteo_min || 3) * 60));   // un temps toutes les 3 minutes, la suite dépend du jour
  return METEOS[VARIABLE[Math.floor(hasard(graine + k * 97)() * VARIABLE.length)]];
}
const _ca = [0, 0, 0], _cb = [0, 0, 0];
function ambianceZone(s) {   // l'air du lieu : la grotte où l'on est, sinon l'ambiance de la pièce
  const p = pieceEn(s);
  if (PISTE.TUN[idx(s)]) return Object.assign({}, AMBIANCES.grotte, (GROTTES[p.grotte] || {}).ambiance);
  return AMBIANCES[p.ambiance] || null;
}
function particulesDuLieu(s, Z) {   // ce qui flotte dans l'air ici : l'ambiance le dit, sinon la sorte de rive (une forêt sème ses feuilles)
  if (Z && Z.particules !== undefined) return Z.particules;
  if (Z && Z.abri) return null;
  const i = idx(s); let mieux = 0, nom = null;
  for (let t = 0; t < NT; t++) { const w = PISTE.PG[i * NT + t] + PISTE.PD[i * NT + t]; if (w > mieux && RIVES[t].particules) { mieux = w; nom = RIVES[t].particules; } }
  return mieux > .6 ? nom : null;
}

/* ---- les particules : une boîte d'air autour de la caméra, qui la suit ---- */
const PART = (() => {
  const n = 260, o = {n, p: new Float32Array(n * 3), v: new Float32Array(n * 3), c: new Float32Array(n * 3), t: new Float32Array(n), l: new Float32Array(n), ph: new Float32Array(n), type: new Array(n).fill(null), compte: {}};
  o.geo = new THREE.BufferGeometry();
  o.geo.setAttribute("position", new THREE.BufferAttribute(o.p, 3)); o.geo.setAttribute("color", new THREE.BufferAttribute(o.c, 3)); o.geo.setAttribute("aT", new THREE.BufferAttribute(o.t, 1)); o.geo.setAttribute("aL", new THREE.BufferAttribute(o.l, 1));
  o.m = new THREE.Points(o.geo, new THREE.ShaderMaterial({uniforms: {uTeinte: COMMUNS.uTeinte, uSombre: COMMUNS.uSombre}, depthWrite: false,
    vertexShader: "attribute vec3 color; attribute float aT, aL; varying vec3 vC; varying float vL; void main() { vC = color; vL = aL; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_PointSize = aT; }",
    fragmentShader: "uniform vec3 uTeinte; uniform float uSombre; varying vec3 vC; varying float vL; void main() { gl_FragColor = vec4(mix(vC * uTeinte * uSombre, vC, vL), 1.); }"}));
  o.m.frustumCulled = false; o.m.name = "particules"; scene.add(o.m);
  for (let k = 0; k < n; k++) { o.p[k * 3 + 1] = -999; o.ph[k] = Math.random() * 99; }
  return o;
})();
const PLUIE = (() => {
  const n = 280, o = {n, p: new Float32Array(n * 3), g: new Float32Array(n * 6)};
  o.geo = new THREE.BufferGeometry(); o.geo.setAttribute("position", new THREE.BufferAttribute(o.g, 3));
  o.mat = new THREE.LineBasicMaterial({color: 0xC4DCF4, transparent: true, opacity: .55, depthWrite: false, fog: false});
  o.m = new THREE.LineSegments(o.geo, o.mat); o.m.frustumCulled = false; o.m.name = "pluie"; o.geo.setDrawRange(0, 0); scene.add(o.m);
  for (let k = 0; k < n; k++) { o.p[k * 3] = (Math.random() - .5) * 30; o.p[k * 3 + 1] = Math.random() * 14; o.p[k * 3 + 2] = (Math.random() - .5) * 30; }
  return o;
})();
const tour = (v, h) => ((v + h) % (2 * h) + 2 * h) % (2 * h) - h;   // ramène dans la boîte [-h, h]
function animerParticules(dt, s, Z, abri) {
  const P = PART, m = AMB.m, vent = m.vent, vx = .9 * vent * 2.4, vz = .45 * vent * 2.4;
  // combien de chaque sorte on veut ici
  const voulu = {}; let lieu = particulesDuLieu(s, Z);
  if (lieu && AMB.nuit > .6 && NUIT_A_LA_PLACE[lieu] && !abri) lieu = NUIT_A_LA_PLACE[lieu];
  for (const nom of lieu ? [].concat(lieu) : []) if (PARTICULES[nom]) voulu[nom] = PARTICULES[nom].n;
  if (m.neige > .05 && abri < .5) voulu.neige = Math.round(PARTICULES.neige.n * m.neige);
  if (vent > .7 && abri < .5 && !voulu.feuilles && !m.neige) voulu.feuilles = 26;
  const fx = -Math.sin(camera.rotation.y), cx = camera.position.x, cy = camera.position.y + 3.5, cz = camera.position.z, HX = 20, HY = 7.5;
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir); const ox = cx + dir.x * 13, oz = cz + dir.z * 13;
  const compte = P.compte; for (const k in compte) compte[k] = 0;
  for (let k = 0; k < P.n; k++) if (P.type[k]) compte[P.type[k]] = (compte[P.type[k]] || 0) + 1;
  for (let k = 0; k < P.n; k++) {
    let ty = P.type[k], def = ty && PARTICULES[ty];
    const j = k * 3;
    if (def) {
      P.ph[k] += dt;
      const e = def.err, ph = P.ph[k];
      P.p[j] += (def.v[0] + (def.vent ? vx : vx * .25) + Math.sin(ph * 1.3 + k) * e) * dt; P.p[j + 1] += (def.v[1] + Math.sin(ph * 1.7 + k * 2.1) * e * .5) * dt; P.p[j + 2] += (def.v[2] + (def.vent ? vz : vz * .25) + Math.cos(ph * 1.1 + k * .7) * e) * dt;
      const rx = P.p[j] - ox, ry = P.p[j + 1] - cy, rz = P.p[j + 2] - oz, wx = tour(rx, HX), wy = tour(ry, HY), wz = tour(rz, HX), sorti = wx !== rx || wy !== ry || wz !== rz;
      P.p[j] = ox + wx; P.p[j + 1] = cy + wy; P.p[j + 2] = oz + wz;
      if (def.clignote) P.t[k] = Math.sin(ph * 2.2 + k) > -.2 ? def.t : 0;
      if (sorti && (compte[ty] || 0) > (voulu[ty] || 0)) { compte[ty]--; P.type[k] = ty = null; def = null; }   // il y en a trop de cette sorte : celle-ci s'en va en sortant de la boîte
    }
    if (!def) {
      let nv = null; for (const nom in voulu) if ((compte[nom] || 0) < voulu[nom]) { nv = nom; break; }
      if (!nv) { P.p[j + 1] = -999; P.t[k] = 0; continue; }
      const d = PARTICULES[nv], col = hex(d.c[k % d.c.length]); compte[nv] = (compte[nv] || 0) + 1; P.type[k] = nv;
      P.p[j] = ox + (Math.random() - .5) * 2 * HX; P.p[j + 1] = cy + (Math.random() - .5) * 2 * HY; P.p[j + 2] = oz + (Math.random() - .5) * 2 * HX;
      P.c[j] = col[0]; P.c[j + 1] = col[1]; P.c[j + 2] = col[2]; P.t[k] = d.t; P.l[k] = d.lum || 0;
    }
  }
  P.geo.attributes.position.needsUpdate = true; P.geo.attributes.color.needsUpdate = true; P.geo.attributes.aT.needsUpdate = true; P.geo.attributes.aL.needsUpdate = true;
  // la pluie : des traits qui tombent, penchés par le vent
  const L = PLUIE, actifs = Math.round(L.n * clamp(m.pluie, 0, 1) * (1 - abri));
  if (actifs > 0) {
    const px = cx + dir.x * 9, pz = cz + dir.z * 9, tx = vx * 1.6, tz = vz * 1.6, ty = -21, k0 = .034;
    for (let k = 0; k < actifs; k++) {
      const j = k * 3; L.p[j] += tx * dt; L.p[j + 1] += ty * dt; L.p[j + 2] += tz * dt;
      const X = px + tour(L.p[j] - px, 15), Y = camera.position.y + 3 + tour(L.p[j + 1] - camera.position.y - 3, 7), Zz = pz + tour(L.p[j + 2] - pz, 15); L.p[j] = X; L.p[j + 1] = Y; L.p[j + 2] = Zz;
      const g = k * 6; L.g[g] = X; L.g[g + 1] = Y; L.g[g + 2] = Zz; L.g[g + 3] = X - tx * k0; L.g[g + 4] = Y - ty * k0; L.g[g + 5] = Zz - tz * k0;
    }
    L.geo.attributes.position.needsUpdate = true;
  }
  L.geo.setDrawRange(0, actifs * 2);
}

/* ---- les halos : chaque lumière posée par un objet (K.lumiere) a sa lueur, la nuit (ou toujours : un cristal, de la lave) ---- */
const HALOS = {m: null, u: {uEch: {value: 600}, uNuit: COMMUNS.uNuit, uT: COMMUNS.uT, uB1: COMMUNS.uB1}};
function construireAmbiance() {
  const L = MONDE.lumieres || []; if (!L.length) return;
  const n = L.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), t = new Float32Array(n), tj = new Float32Array(n), ph = new Float32Array(n);
  L.forEach((l, k) => { pos.set([l.x, l.y, l.z], k * 3); col.set(l.c, k * 3); t[k] = l.t; tj[k] = l.toujours ? 1 : 0; ph[k] = (k * 2.399) % 6.283; });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.setAttribute("aT", new THREE.BufferAttribute(t, 1)); g.setAttribute("aJ", new THREE.BufferAttribute(tj, 1)); g.setAttribute("aPh", new THREE.BufferAttribute(ph, 1));
  HALOS.m = new THREE.Points(g, new THREE.ShaderMaterial({uniforms: HALOS.u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 color; attribute float aT, aJ, aPh; uniform float uEch, uNuit, uT, uB1; varying vec3 vC; varying float vA;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; float d = -mv.z; gl_PointSize = clamp(aT * uEch / d, 3., 96.);
        vA = mix(uNuit, 1., aJ) * (1. - smoothstep(uB1 * .6, uB1 * .95, d)) * (.86 + .14 * sin(uT * 3. + aPh)); vC = color; }`,
    fragmentShader: "varying vec3 vC; varying float vA; void main() { float r = length(gl_PointCoord - .5) * 2.; float a = r < .28 ? .55 : r < .58 ? .27 : r < 1. ? .11 : 0.; if (a * vA < .01) discard; gl_FragColor = vec4(vC * a * vA, 1.); }"}));
  HALOS.m.frustumCulled = false; HALOS.m.name = "halos"; scene.add(HALOS.m);
}

/* ---- chaque image : tout mélanger, puis régler le ciel, la brume, la teinte ---- */
const mixc = (a, b, t, o) => { o[0] = lerp(a[0], b[0], t); o[1] = lerp(a[1], b[1], t); o[2] = lerp(a[2], b[2], t); return o; };
function ambianceMaj(dt, s) {
  AMB.t += dt;
  // 1) l'heure
  const h = AMB.h = heureDuMoment(); let k = 0; while (k < HEURES.length - 2 && HEURES[k + 1][0] <= h) k++;
  const A = HEURES[k], B = HEURES[k + 1], u = clamp((h - A[0]) / Math.max(.001, B[0] - A[0]), 0, 1), J = CIEL.jour;
  const haut = mixc(A[1] ? hex(A[1]) : J.haut, B[1] ? hex(B[1]) : J.haut, u, []), bas = mixc(A[2] ? hex(A[2]) : J.bas, B[2] ? hex(B[2]) : J.bas, u, []);
  const teinte = mixc(A[3], B[3], u, []), nuit = lerp(A[4], B[4], u), etoiles = lerp(A[5], B[5], u), nuage = mixc(hex(A[6]), hex(B[6]), u, []);
  // 2) le temps qu'il fait : il glisse vers celui qu'on veut (une demi-minute)
  const cible = meteoDuMoment(), m = AMB.m, f = AMB.t < .5 ? 1 : 1 - Math.exp(-dt / 12);
  for (const c in m) m[c] += ((cible[c] || 0) - m[c]) * f;
  AMB.manteau = clamp(AMB.manteau + dt * (m.neige > .3 ? .006 : -.004), 0, .8);
  // 3) le lieu
  const Zc = ambianceZone(s), Z = AMB.zone, g = dt > 0 ? 1 - Math.exp(-dt / .5) : 1, zt = (Zc && Zc.teinte) || [1, 1, 1];
  for (let i = 0; i < 3; i++) Z.teinte[i] += (zt[i] - Z.teinte[i]) * g;
  Z.sombre += (((Zc && Zc.sombre) || 1) - Z.sombre) * g; Z.voile += (((Zc && Zc.voile) || 0) - Z.voile) * g; Z.dense += (((Zc && Zc.dense) || 0) - Z.dense) * g; Z.abri += (((Zc && Zc.abri) || 0) - Z.abri) * g;
  if (Zc && Zc.brume) mixc(Z.brume, hex(Zc.brume), g, Z.brume);
  const abri = Z.abri;
  // les éclairs d'un orage
  if (m.orage > .5 && abri < .5) { AMB.attente -= dt; if (AMB.attente <= 0) { AMB.eclair = 1; AMB.echo = .16; AMB.attente = 5 + Math.random() * 12; } }
  if (AMB.echo > 0) { AMB.echo -= dt; if (AMB.echo <= 0) AMB.eclair = Math.max(AMB.eclair, .8); }
  AMB.eclair = Math.max(0, AMB.eclair - dt * 7);
  // 4) la teinte de la scène : l'heure, le ciel couvert (plus terne, plus gris), le lieu
  const c = m.couvert, gris = (teinte[0] + teinte[1] + teinte[2]) / 3, sombre = Z.sombre * (1 + .8 * AMB.eclair * (1 - abri));
  for (let i = 0; i < 3; i++) teinte[i] = lerp(teinte[i], gris, .35 * c) * (1 - .2 * c) * Z.teinte[i];
  COMMUNS.uTeinte.value.set(teinte[0], teinte[1], teinte[2]); COMMUNS.uSombre.value = sombre; AMB.nuit = nuit; AMB.teinte = teinte;
  COMMUNS.uNuit.value = nuit; COMMUNS.uPluie.value = m.pluie * (1 - abri); COMMUNS.uNeige.value = AMB.manteau * (1 - abri);
  // 5) le ciel
  const U = CIEL.U, lumCiel = clamp(gris, .3, 1), G = [.62 * lumCiel, .66 * lumCiel, .72 * lumCiel];
  U.uHaut.value.set(haut[0], haut[1], haut[2]); U.uBas.value.set(bas[0], bas[1], bas[2]); U.uGris.value.set(G[0], G[1], G[2]); U.uCouvert.value = c; U.uEtoiles.value = etoiles;
  U.uNuage.value.set(nuage[0] * (1 - .32 * c), nuage[1] * (1 - .3 * c), nuage[2] * (1 - .26 * c)); U.uLoin.value.set(teinte[0] / Z.teinte[0], teinte[1] / Z.teinte[1], teinte[2] / Z.teinte[2]);
  U.uDefile.value = .0005 + .0035 * m.vent; U.uEclair.value = AMB.eclair;
  const ang = Math.PI * (h - 6.3) / 13.5, el = Math.sin(ang) * 1.08, ce = Math.cos(el);   // le soleil se lève à l'est (à droite du départ) vers 6 h 20, passe derrière nous, se couche à l'ouest vers 19 h 50
  U.uSol.value.set(Math.cos(ang) * ce, Math.sin(el), Math.sin(ang) * ce * .55 + .2).normalize();
  const bas01 = clamp(1 - Math.sin(el) * 2.2, 0, 1); U.uSolC.value.set(1, lerp(.97, .62, bas01), lerp(.82, .3, bas01));
  const al = Math.PI * (((h - 19.2) % 24 + 24) % 24) / 11.6, ell = Math.sin(al) * .9, cl = Math.cos(ell); U.uLune.value.set(Math.cos(al) * cl * .8 - .2, Math.sin(ell), Math.sin(al) * cl * .5 + .5).normalize();
  if (AMB.heure === "jour") SOLEIL.copy(AMB.soleilFixe);   // le jour par défaut : la lumière de toujours
  else { const src = Math.sin(el) > .12 ? U.uSol.value : U.uLune.value; SOLEIL.set(src.x, Math.max(src.y, .42), src.z).normalize(); }
  renderer.setClearColor(new THREE.Color(lerp(haut[0], G[0], c * .82), lerp(haut[1], G[1], c * .82), lerp(haut[2], G[2], c * .82)));
  // 6) la brume : la couleur du bas du ciel, plus dense par temps de brume ou dans un lieu voilé ; à l'abri (une grotte), elle s'assombrit
  mixc(bas, G, c * .82, _ca); mixc(_ca, Z.brume, Z.voile, _cb);
  const b = clamp(Math.max(m.brume + m.pluie * .12, Z.dense), 0, 1), fonceB = lerp(1, .5 * Z.sombre, abri);
  COMMUNS.uBrume.value.set(_cb[0] * fonceB + AMB.eclair * .2, _cb[1] * fonceB + AMB.eclair * .2, _cb[2] * fonceB + AMB.eclair * .2);
  const b0 = lerp(VISION.b0, Math.min(VISION.b0, 10), b), b1 = VISION.b1 * lerp(1, .34, b);
  COMMUNS.uB0.value = b0; COMMUNS.uB1.value = b1; scene.fog.near = b0; scene.fog.far = b1; scene.fog.color.setRGB(COMMUNS.uBrume.value.x, COMMUNS.uBrume.value.y, COMMUNS.uBrume.value.z);
  // les sprites et les panneaux prennent la teinte
  const tr = Math.min(1.1, teinte[0] * sombre), tg = Math.min(1.1, teinte[1] * sombre), tb = Math.min(1.1, teinte[2] * sombre);
  for (const mat of TEINTES) mat.color.setRGB(tr, tg, tb);
  PLUIE.mat.color.setRGB(.77 * lumCiel, .86 * lumCiel, .96 * lumCiel);
  HALOS.u.uEch.value = HAUT / (2 * Math.tan(camera.fov * Math.PI / 360));
  animerParticules(dt, s, Zc, abri);
}
window.__ambiance = (heure, meteo) => { reglerAmbiance(heure, meteo); if (meteo && METEOS[meteo]) Object.assign(AMB.m, METEOS[meteo]); return {heure: AMB.heure, meteo: AMB.meteo}; };
