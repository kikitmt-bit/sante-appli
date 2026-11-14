/* ============ les Pokémon : sprites de Pokémon Donjon Mystère (Chunsoft, via PMD SpriteCollab, CC BY-NC 4.0), toujours tournés vers la caméra ============ */
// Les planches arrivent avec la page (LOT, préparé par page.py depuis le dépôt en ligne) : une rangée par direction (0 = face, 4 = de dos),
// une colonne par image d'animation. Un Pokémon dont la planche manque n'est simplement pas affiché.
const PXM = .036;   // la taille d'un pixel de sprite dans le monde (m)
const PLANCHES = {};
const PMD_URL = "https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite/", GENS_URL = "https://raw.githubusercontent.com/pret/pokefirered/ce6406d8c2eaf46d543c8a2606de0c3cb1951982/graphics/object_events/pics/people/";
/* une planche qui n'est pas venue avec la page (un circuit fait dans l'éditeur, un rival) : on la lit en ligne, au même endroit que page.py */
async function plancheEnLigne(cle) {
  try {
    if (cle[0] === "h") return {png: GENS_URL + cle.slice(2) + ".png", fw: 16, fh: 32, dur: [9999]};
    const [num, anim] = cle.split("/"), base = PMD_URL + num + "/", xml = new DOMParser().parseFromString(await (await fetch(base + "AnimData.xml")).text(), "text/xml"), blocs = {};
    for (const a of xml.querySelectorAll("Anim")) blocs[a.querySelector("Name").textContent] = a;
    let a = blocs[anim]; if (!a) return null;
    const copie = a.querySelector("CopyOf"); if (copie) a = blocs[copie.textContent];
    return {png: base + a.querySelector("Name").textContent + "-Anim.png", fw: +a.querySelector("FrameWidth").textContent, fh: +a.querySelector("FrameHeight").textContent,
      dur: [...a.querySelectorAll("Duration")].map(d => +d.textContent), m: TAILLES_PKM[String(+num)]};
  } catch (e) { return null; }
}
function planche(cle) {
  if (PLANCHES[cle]) return PLANCHES[cle];
  return PLANCHES[cle] = new Promise(async ok => { setTimeout(() => ok(null), 12000);   // une image en ligne qui ne vient pas ne bloque jamais le départ (12/11)
    const L = LOT[cle] || await plancheEnLigne(cle); if (!L) return ok(null); const im = new Image(); if (L.png.slice(0, 5) !== "data:") im.crossOrigin = "anonymous";
    im.onload = () => { try { const c = toile(im.width, im.height, x => x.drawImage(im, 0, 0)), cx = c.getContext("2d"), img = cx.getImageData(0, 0, im.width, im.height), d = img.data;
      const cols = Math.max(1, Math.floor(im.width / L.fw)), rows = Math.max(1, Math.floor(im.height / L.fh)), boites = {};
      const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
      ok({tex, W: im.width, H: im.height, fw: L.fw, fh: L.fh, cols, rows, dur: L.dur, m: L.m, total: L.dur.reduce((a, b) => a + b, 0) / 60,
        boite(r) { r = Math.min(r, rows - 1); if (boites[r]) return boites[r]; let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;   // le cadre utile d'une rangée (sans les marges vides)
          for (let i = 0; i < cols; i++) for (let Y = 0; Y < L.fh; Y++) for (let X = 0; X < L.fw; X++) if (d[((r * L.fh + Y) * im.width + i * L.fw + X) * 4 + 3] > 20) { x0 = Math.min(x0, X); x1 = Math.max(x1, X + 1); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y + 1); }
          return boites[r] = x1 < 0 ? {x0: 0, x1: L.fw, y0: 0, y1: L.fh} : {x0, x1, y0, y1}; },
        largeur(r, y) { r = Math.min(r, rows - 1); y = clamp(Math.round(y), 0, L.fh - 1); let x0 = 1e9, x1 = -1;   // la largeur du corps (en pixels) sur une ligne de la première image : là où l'eau le coupe
          for (let X = 0; X < L.fw; X++) if (d[((r * L.fh + y) * im.width + X) * 4 + 3] > 20) { x0 = Math.min(x0, X); x1 = Math.max(x1, X + 1); }
          return x1 < 0 ? 0 : x1 - x0; },
        image(t) { let s = (t % this.total) * 60, i = 0; while (i < this.dur.length - 1 && s >= this.dur[i]) { s -= this.dur[i]; i++; } return Math.min(i, cols - 1); }}); } catch (e) { ok(null); } };
    im.onerror = () => ok(null); im.src = L.png; });
}
const GEO_SPRITE = new THREE.PlaneGeometry(1, 1).translate(0, .5, 0);
class Pantin {  // un sprite debout dans le monde
  constructor(pl, rang, taille = 1, hauteur = 0) {   // hauteur : en mètres dans le monde (sinon : la taille du dessin)
    this.pl = pl; this.rang = Math.min(rang, pl.rows - 1); this.b = pl.boite(this.rang); this.tex = pl.tex.clone(); this.tex.needsUpdate = true;
    const bw = this.b.x1 - this.b.x0, bh = this.b.y1 - this.b.y0; this.tex.repeat.set(bw / pl.W, bh / pl.H); this.h = hauteur ? hauteur * taille : bh * PXM * taille; this.l = this.h * bw / bh;
    this.m = new THREE.Mesh(GEO_SPRITE, new THREE.MeshBasicMaterial({map: this.tex, alphaTest: .5, side: THREE.DoubleSide})); this.m.scale.set(this.l, this.h, 1); this.i = -1; this.image(0); scene.add(this.m); TEINTES.push(this.m.material); }
  image(i) { if (i === this.i) return; this.i = i; this.tex.offset.set((i * this.pl.fw + this.b.x0) / this.pl.W, 1 - (this.rang * this.pl.fh + this.b.y1) / this.pl.H); }
  rangee(r) { r = Math.min(r, this.pl.rows - 1); if (r === this.rang) return; this.rang = r; this.b = this.pl.boite(r); const bw = this.b.x1 - this.b.x0, bh = this.b.y1 - this.b.y0; this.tex.repeat.set(bw / this.pl.W, bh / this.pl.H); this.l = this.h * bw / bh; this.m.scale.set(this.l, this.h, 1); this.i = -1; }   // changer de direction (0 = face, 4 = dos, 3 et 5 = trois quarts dos)
  regarder() { this.m.rotation.y = Math.atan2(camera.position.x - this.m.position.x, camera.position.z - this.m.position.z); }
}
function retirerPantin(N) { scene.remove(N.m); const k = TEINTES.indexOf(N.m.material); if (k >= 0) TEINTES.splice(k, 1); N.m.material.dispose(); if (N.sous) N.sous.material.dispose(); N.tex.dispose(); }

/* ---- ton Pokémon dans l'eau (14/11, Kiki : « plus immersif », chaque Pokémon à sa vraie taille) ----
   Sa fiche (contenu/nageurs.json) dit qui il est : sa taille (celle du Pokédex), la part de son corps sous l'eau, sa façon de nager.
   Le sprite est dessiné deux fois : au-dessus de l'eau tel quel, avec un liseré d'écume qui le lèche à la surface ; dessous, on le
   devine, bleuté, de plus en plus effacé avec la profondeur, et l'eau le fait onduler. monture.js le fait nager au rythme des coups. */
const NAGEUR_VS = "varying vec2 vUv; varying float vY; void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vY = w.y; gl_Position = projectionMatrix * viewMatrix * w; }";
const NAGEUR_FS = `uniform sampler2D map; uniform vec2 uOff, uRep, uTexel; uniform vec3 uTeinte, uEcume, uBleu; uniform float uEau, uPx, uT, uMouille;
  varying vec2 vUv; varying float vY;
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() { vec2 uv = vUv * uRep + uOff; float prof = (uEau - vY) / uPx;   // prof : combien de pixels du sprite sous la surface
  #ifdef SOUS
    if (uMouille < .5 || prof <= 0.) discard;
    if (prof > 1.5) uv.x += floor(sin(uT * 4. + floor(prof) * .8) + .5) * uTexel.x;
    vec4 t = texture2D(map, uv); if (t.a < .5) discard;
    gl_FragColor = vec4(mix(t.rgb, uBleu, .58) * uTeinte, floor(clamp(.64 - prof * .03, .12, .64) * 6. + .5) / 6.);
  #else
    if (uMouille > .5 && prof > 0.) discard;
    vec4 t = texture2D(map, uv); if (t.a < .5) discard;
    vec3 c = t.rgb;
    if (uMouille > .5 && prof > -1. - step(.55, h21(vec2(floor(uv.x / uTexel.x), floor(uT * 6.))))) c = uEcume;
    gl_FragColor = vec4(c * uTeinte, 1.);
  #endif
  }`;
class Nageur extends Pantin {
  constructor(pl, fiche) {
    const h = fiche.taille ? fiche.taille * (fiche.part || 1) : 0;   // sa vraie taille ; sans taille connue : celle du dessin, comme avant
    super(pl, 4, h ? 1 : 1.5, h);
    this.fiche = fiche; this.enfonce = fiche.enfonce === undefined ? .42 : fiche.enfonce;
    const vieux = this.m.material, k = TEINTES.indexOf(vieux); if (k >= 0) TEINTES.splice(k, 1); vieux.dispose();
    const U = this.U = {map: {value: this.tex}, uOff: {value: this.tex.offset}, uRep: {value: this.tex.repeat}, uTexel: {value: new THREE.Vector2(1 / pl.W, 1 / pl.H)}, uTeinte: {value: new THREE.Color(1, 1, 1)},
      uEcume: {value: new THREE.Vector3(...hex(BIOME.eau.ecume))}, uBleu: {value: new THREE.Vector3(...hex(BIOME.eau.c2))}, uEau: {value: -9999}, uPx: {value: 1}, uMouille: {value: 0}, uT: COMMUNS.uT};
    const mat = plus => new THREE.ShaderMaterial(Object.assign({uniforms: U, vertexShader: NAGEUR_VS, fragmentShader: NAGEUR_FS, side: THREE.DoubleSide}, plus));
    this.m.material = mat({}); this.m.material.color = U.uTeinte.value; TEINTES.push(this.m.material);   // la teinte de l'heure, comme les autres sprites
    this.sous = new THREE.Mesh(GEO_SPRITE, mat({defines: {SOUS: 1}, transparent: true, depthTest: false, depthWrite: false})); this.sous.renderOrder = 4; this.m.add(this.sous);
    this.pixel();
  }
  pixel() { this.U.uPx.value = this.h / (this.b.y1 - this.b.y0); }   // la taille d'un pixel du sprite dans le monde
  rangee(r) { super.rangee(r); if (this.U) this.pixel(); }
  mouiller(eau, oui) { this.U.uEau.value = eau; this.U.uMouille.value = oui ? 1 : 0; }   // la hauteur de l'eau là où il est ; hors de l'eau (un saut, la terre) : le sprite entier
  demiLargeur() { const b = this.b, px = this.pl.largeur(this.rang, b.y1 - this.enfonce * (b.y1 - b.y0) - 1); return clamp((px || (b.x1 - b.x0) * .7) * this.U.uPx.value / 2, .12, 2.2); }   // sa demi-largeur à la ligne d'eau (m)
}
/* le gabarit de ta monture : la caméra recule et monte pour un grand Pokémon, le sillage et les gerbes prennent sa largeur */
const GABARIT = {f: 1, hw: .45};
const NAGEUR = {num: 0, fiche: null};
const ficheNageur = num => (NAGEURS.liste || []).find(f => f.num === +num) || null;
const nageurVoulu = () => +PARAMS.get("nageur") || +lireReglage("riviere_nageur", 0) || NAGEURS.defaut || NIVEAU.nageur || 7;   // ?nageur=131, sinon le choix du menu, sinon Carapuce
async function changerNageur(num) {   // sur l'eau : le Pokémon choisi, à sa vraie taille ; sur la terre : celui du circuit, comme avant
  const eau = DISCIPLINE === "eau", n = eau ? +num || NIVEAU.nageur || 7 : NIVEAU.nageur || 7, pl = await planche(String(n).padStart(4, "0") + "/Walk"); if (!pl) return false;
  if (nageur) retirerPantin(nageur);
  const fiche = eau ? ficheNageur(n) || {num: n} : null;
  nageur = fiche ? new Nageur(pl, fiche) : new Pantin(pl, 4, 1.5); NAGEUR.num = n; NAGEUR.fiche = fiche;
  GABARIT.f = fiche ? clamp(Math.pow(nageur.h / .97, .42), .76, 1.85) : 1; GABARIT.hw = fiche ? nageur.demiLargeur() : .45;
  if (typeof fantomeOublier === "function") fantomeOublier();
  return true;
}

/* ---- ton Pokémon (monture.js l'anime) et ceux du monde : ceux des rives sautent de joie quand tu passes, d'autres vivent leur vie ---- */
// Un Pokémon peut bouger ("bouge" dans le niveau, le lieu ou la règle) :
//   {"type": "vol", "rayon": 14, "haut": 9, "vitesse": 5}     il tourne dans le ciel
//   {"type": "ronde", "long": 10, "vitesse": 1.2}             il va et vient le long de la rive
//   {"type": "nage", "long": 30, "vitesse": 2}                il va et vient dans l'eau, le long de la piste (cote "c")
//   {"type": "saut", "tous": 5, "haut": 2.2}                  il jaillit de l'eau de temps en temps (un Magicarpe)
// Il se tourne tout seul dans le sens où il va (les 8 directions des sprites de Donjon Mystère).
let nageur = null; const PUBLIC = [];
async function construireSprites() {
  if (!await changerNageur(nageurVoulu())) await changerNageur(NIVEAU.nageur || 7);
  // la taille des Pokémon suit leur vraie taille, adoucie (un Rattata de 30 cm reste visible, un Lokhlass de 2,5 m est énorme) ; un habitant fait 1,5 m
  await Promise.all(MONDE.sprites.map(o => planche(o.cle)));
  for (const o of MONDE.sprites) {
    const p = await planche(o.cle); if (!p) continue;
    const q = new Pantin(p, 0, o.taille, o.cle[0] === "h" ? 1.5 : p.m ? clamp(1.5 * Math.pow(p.m, .7), .55, 8) : 0);
    q.vole = o.vole; q.fixe = o.cle[0] === "h"; q.m.position.set(o.x, o.y, o.z); pres(o.x, o.z); q.s = Q.i; q.y0 = o.y; q.x0 = o.x; q.z0 = o.z; q.ph = Math.random() * 9;
    if (o.bouge) { q.bouge = Object.assign({}, o.bouge); q.s0 = o.s; q.cote = o.cote; q.e = o.e; q.px = o.x; q.pz = o.z; }
    PUBLIC.push(q);
  }
}
function bouger(q, t, S) {   // où est-il maintenant, et vers où regarde-t-il
  const b = q.bouge, v = b.vitesse || 1.5, p = q.m.position; let x = q.x0, y = q.y0, z = q.z0;
  if (b.type === "vol") { const r = b.rayon || 14, a = t * v / r + q.ph; x += Math.cos(a) * r; z += Math.sin(a) * r; y += (b.haut || 9) + Math.sin(t * .7 + q.ph) * 1.2; }
  else if (b.type === "ronde" || b.type === "nage") {
    const L = b.long || 10, u = ((t * v + q.ph * 3) % (2 * L)), d = u < L ? u : 2 * L - u, eau = b.type === "nage", s = q.s0 + d - L / 2;
    const a = eau || q.cote === "c" ? pose(s, q.e) : pose(s, (q.cote === "g" ? -1 : 1) * (at(s).w + q.e));
    x = a.x; z = a.z; y = eau ? a.y - q.h * .4 + Math.sin(t * 3 + q.ph) * .04 : hauteur(a.x, a.z); q.s = idx(s);
  } else if (b.type === "saut") {
    const T = b.tous || 5, u = ((t + q.ph) % T) / 1.1;
    if (u < 1) { y += Math.sin(u * Math.PI) * (b.haut || 2.2) - q.h * .3; if (!q.dehors) { q.dehors = true; if (Math.abs(ecart(q.s, S.s)) < 120) gerbe(q.s, .8, q.e || 0, at(q.s).y); } }
    else { y -= q.h * 1.4; q.dehors = false; }
  }
  const dx = x - q.px, dz = z - q.pz; q.px = x; q.pz = z; p.set(x, y, z);
  if (dx * dx + dz * dz > 1e-7) {   // sa direction, vue depuis la caméra : 0 = de face, 2 = vers la droite, 4 = de dos, 6 = vers la gauche
    const fx = x - camera.position.x, fz = z - camera.position.z, l = Math.hypot(fx, fz) || 1, ax = fx / l, az = fz / l, vr = dx * -az + dz * ax, vf = dx * ax + dz * az;
    q.rangee(((Math.round(Math.atan2(vr, -vf) / (Math.PI / 4)) % 8) + 8) % 8);
  }
}
function animerPublic(t, S, dt) {
  for (const q of PUBLIC) {
    q.image(q.pl.image(t + q.ph));
    if (q.bouge) bouger(q, t, S);
    else { const d = Math.abs(ecart(q.s, S.s)); q.m.position.y = q.y0 + (q.vole ? Math.sin(t * 2.2 + q.ph) * .35 : d < 22 && S.v > .8 ? Math.abs(Math.sin(t * 8 + q.ph)) * .4 : 0); }
    q.regarder();
    // de loin, un Pokémon rapetisse moins vite que le décor : on le reconnaît avant d'être à côté
    const loin = Math.hypot(camera.position.x - q.m.position.x, camera.position.z - q.m.position.z), k = q.fixe || loin < 12 ? 1 : Math.min(2.2, Math.pow(loin / 12, .5));
    q.m.scale.set(q.l * k, q.h * k, 1);
  }
}

/* ---- les éclaboussures (ou la poussière, sur la terre) : de petits points qui retombent ---- */
// Des gouttes de plusieurs tailles (14/11) : de gros pixels au cœur de la gerbe, de petits autour ; la taille suit la finesse de l'image.
const GOUTTES = {n: 360, p: new Float32Array(1080), v: new Float32Array(1080), vie: new Float32Array(360), sol: new Float32Array(360), t: new Float32Array(360).fill(1.2), k: 0};
GOUTTES.geo = new THREE.BufferGeometry(); GOUTTES.geo.setAttribute("position", new THREE.BufferAttribute(GOUTTES.p, 3)); GOUTTES.geo.setAttribute("aT", new THREE.BufferAttribute(GOUTTES.t, 1));
GOUTTES.m = new THREE.Points(GOUTTES.geo, new THREE.ShaderMaterial({depthWrite: false, uniforms: {uC: {value: new THREE.Color(0xF2FBFF)}, uHpx: PANACHE_U.uHpx},
  vertexShader: "attribute float aT; uniform float uHpx; void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_PointSize = max(1.5, floor(aT * uHpx / 360. + .5)); }",
  fragmentShader: "uniform vec3 uC; void main() { gl_FragColor = vec4(uC, 1.); }"}));
GOUTTES.m.material.color = GOUTTES.m.material.uniforms.uC.value; GOUTTES.m.frustumCulled = false; scene.add(GOUTTES.m);
function gerbe(s, force, d = 0, y = null, large = .45, nb = 0) {   // au mètre s, à d mètres du milieu, depuis la hauteur y (sinon : celle de la piste) ; large : la demi-largeur de qui éclabousse
  const a = pose(s, d), base = y === null ? a.y : y, k2 = Math.sqrt(clamp(large / .45, .5, 4)), n = nb || Math.round((14 + force * 16) * k2);
  for (let j = 0; j < n; j++) {
    const k = GOUTTES.k = (GOUTTES.k + 1) % GOUTTES.n, c = j % 2 ? 1 : -1, lat = c * (large + Math.random() * .3), vl = c * (.8 + Math.random() * 2.2) * k2, va = -(.5 + Math.random() * 2);
    GOUTTES.p[k * 3] = a.x + Math.cos(a.h) * lat; GOUTTES.p[k * 3 + 1] = base + .1; GOUTTES.p[k * 3 + 2] = a.z + Math.sin(a.h) * lat; GOUTTES.sol[k] = base - .3;
    GOUTTES.v[k * 3] = Math.cos(a.h) * vl + Math.sin(a.h) * va; GOUTTES.v[k * 3 + 1] = (2 + Math.random() * 3 * (.5 + force)) * k2; GOUTTES.v[k * 3 + 2] = Math.sin(a.h) * vl - Math.cos(a.h) * va; GOUTTES.vie[k] = 1;
    GOUTTES.t[k] = j < n * .3 ? 1.9 + Math.random() * .7 : .9 + Math.random() * .8;
  }
  GOUTTES.geo.attributes.aT.needsUpdate = true;
}
function animerGouttes(dt) {
  const G = GOUTTES;
  for (let k = 0; k < G.n; k++) {
    if (G.vie[k] <= 0) { G.p[k * 3 + 1] = -60; continue; }
    G.v[k * 3 + 1] -= 11 * dt; for (let j = 0; j < 3; j++) G.p[k * 3 + j] += G.v[k * 3 + j] * dt;
    if (G.p[k * 3 + 1] < G.sol[k]) G.vie[k] = 0;
  }
  G.geo.attributes.position.needsUpdate = true;
}
