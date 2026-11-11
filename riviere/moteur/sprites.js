/* ============ les Pokémon : sprites de Pokémon Donjon Mystère (Chunsoft, via PMD SpriteCollab, CC BY-NC 4.0), toujours tournés vers la caméra ============ */
// Les planches arrivent avec la page (LOT, préparé par page.py depuis le dépôt en ligne) : une rangée par direction (0 = face, 4 = de dos),
// une colonne par image d'animation. Un Pokémon dont la planche manque n'est simplement pas affiché.
const PXM = .036;   // la taille d'un pixel de sprite dans le monde (m)
const PLANCHES = {};
function planche(cle) {
  if (PLANCHES[cle]) return PLANCHES[cle];
  return PLANCHES[cle] = new Promise(ok => { const L = LOT[cle]; if (!L) return ok(null); const im = new Image();
    im.onload = () => { const c = toile(im.width, im.height, x => x.drawImage(im, 0, 0)), cx = c.getContext("2d"), img = cx.getImageData(0, 0, im.width, im.height), d = img.data;
      const cols = Math.max(1, Math.floor(im.width / L.fw)), rows = Math.max(1, Math.floor(im.height / L.fh)), boites = {};
      const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
      ok({tex, W: im.width, H: im.height, fw: L.fw, fh: L.fh, cols, rows, dur: L.dur, m: L.m, total: L.dur.reduce((a, b) => a + b, 0) / 60,
        boite(r) { r = Math.min(r, rows - 1); if (boites[r]) return boites[r]; let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;   // le cadre utile d'une rangée (sans les marges vides)
          for (let i = 0; i < cols; i++) for (let Y = 0; Y < L.fh; Y++) for (let X = 0; X < L.fw; X++) if (d[((r * L.fh + Y) * im.width + i * L.fw + X) * 4 + 3] > 20) { x0 = Math.min(x0, X); x1 = Math.max(x1, X + 1); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y + 1); }
          return boites[r] = x1 < 0 ? {x0: 0, x1: L.fw, y0: 0, y1: L.fh} : {x0, x1, y0, y1}; },
        image(t) { let s = (t % this.total) * 60, i = 0; while (i < this.dur.length - 1 && s >= this.dur[i]) { s -= this.dur[i]; i++; } return Math.min(i, cols - 1); }}); };
    im.onerror = () => ok(null); im.src = L.png; });
}
const GEO_SPRITE = new THREE.PlaneGeometry(1, 1).translate(0, .5, 0);
class Pantin {  // un sprite debout dans le monde
  constructor(pl, rang, taille = 1, hauteur = 0) {   // hauteur : en mètres dans le monde (sinon : la taille du dessin)
    this.pl = pl; this.rang = Math.min(rang, pl.rows - 1); this.b = pl.boite(this.rang); this.tex = pl.tex.clone(); this.tex.needsUpdate = true;
    const bw = this.b.x1 - this.b.x0, bh = this.b.y1 - this.b.y0; this.tex.repeat.set(bw / pl.W, bh / pl.H); this.h = hauteur ? hauteur * taille : bh * PXM * taille; this.l = this.h * bw / bh;
    this.m = new THREE.Mesh(GEO_SPRITE, new THREE.MeshBasicMaterial({map: this.tex, alphaTest: .5, side: THREE.DoubleSide})); this.m.scale.set(this.l, this.h, 1); this.i = -1; this.image(0); scene.add(this.m); }
  image(i) { if (i === this.i) return; this.i = i; this.tex.offset.set((i * this.pl.fw + this.b.x0) / this.pl.W, 1 - (this.rang * this.pl.fh + this.b.y1) / this.pl.H); }
  rangee(r) { r = Math.min(r, this.pl.rows - 1); if (r === this.rang) return; this.rang = r; this.b = this.pl.boite(r); const bw = this.b.x1 - this.b.x0, bh = this.b.y1 - this.b.y0; this.tex.repeat.set(bw / this.pl.W, bh / this.pl.H); this.l = this.h * bw / bh; this.m.scale.set(this.l, this.h, 1); this.i = -1; }   // changer de direction (0 = face, 4 = dos, 3 et 5 = trois quarts dos)
  regarder() { this.m.rotation.y = Math.atan2(camera.position.x - this.m.position.x, camera.position.z - this.m.position.z); }
}

/* ---- ton Pokémon (monture.js l'anime) et ceux des rives (qui sautent de joie quand tu passes) ---- */
let nageur = null; const PUBLIC = [];
async function construireSprites() {
  const pl = await planche(String(NIVEAU.nageur || 7).padStart(4, "0") + "/Walk"); if (pl) nageur = new Pantin(pl, 4, 1.5);
  // la taille des Pokémon suit leur vraie taille, adoucie (un Rattata de 30 cm reste visible, un Lokhlass de 2,5 m est énorme) ; un habitant fait 1,5 m
  for (const o of MONDE.sprites) {
    const p = await planche(o.cle); if (!p) continue;
    const q = new Pantin(p, 0, o.taille, o.cle[0] === "h" ? 1.5 : p.m ? clamp(1.5 * Math.pow(p.m, .7), .55, 8) : 0);
    q.vole = o.vole; q.fixe = o.cle[0] === "h"; q.m.position.set(o.x, o.y, o.z); pres(o.x, o.z); q.s = Q.i; q.y0 = o.y; q.ph = Math.random() * 9; PUBLIC.push(q);
  }
}
function animerPublic(t, S) {
  for (const q of PUBLIC) {
    q.image(q.pl.image(t + q.ph)); const d = Math.abs(ecart(q.s, S.s));
    q.m.position.y = q.y0 + (q.vole ? Math.sin(t * 2.2 + q.ph) * .35 : d < 22 && S.v > .8 ? Math.abs(Math.sin(t * 8 + q.ph)) * .4 : 0); q.regarder();
    // de loin, un Pokémon rapetisse moins vite que le décor : on le reconnaît avant d'être à côté
    const loin = Math.hypot(camera.position.x - q.m.position.x, camera.position.z - q.m.position.z), k = q.fixe || loin < 12 ? 1 : Math.min(2.2, Math.pow(loin / 12, .5));
    q.m.scale.set(q.l * k, q.h * k, 1);
  }
}

/* ---- les éclaboussures (ou la poussière, sur la terre) : de petits points qui retombent ---- */
const GOUTTES = {n: 140, p: new Float32Array(420), v: new Float32Array(420), vie: new Float32Array(140), sol: new Float32Array(140), k: 0};
GOUTTES.geo = new THREE.BufferGeometry(); GOUTTES.geo.setAttribute("position", new THREE.BufferAttribute(GOUTTES.p, 3));
GOUTTES.m = new THREE.Points(GOUTTES.geo, new THREE.PointsMaterial({color: 0xF2FBFF, size: 2, sizeAttenuation: false, depthWrite: false, fog: false})); GOUTTES.m.frustumCulled = false; scene.add(GOUTTES.m);
function gerbe(s, force, d = 0, y = null) {   // au mètre s, à d mètres du milieu, depuis la hauteur y (sinon : celle de la piste)
  const a = pose(s, d), base = y === null ? a.y : y, n = 14 + Math.round(force * 16);
  for (let j = 0; j < n; j++) {
    const k = GOUTTES.k = (GOUTTES.k + 1) % GOUTTES.n, c = j % 2 ? 1 : -1, lat = c * (.45 + Math.random() * .3), vl = c * (.8 + Math.random() * 2.2), va = -(.5 + Math.random() * 2);
    GOUTTES.p[k * 3] = a.x + Math.cos(a.h) * lat; GOUTTES.p[k * 3 + 1] = base + .1; GOUTTES.p[k * 3 + 2] = a.z + Math.sin(a.h) * lat; GOUTTES.sol[k] = base - .3;
    GOUTTES.v[k * 3] = Math.cos(a.h) * vl + Math.sin(a.h) * va; GOUTTES.v[k * 3 + 1] = 2 + Math.random() * 3 * (.5 + force); GOUTTES.v[k * 3 + 2] = Math.sin(a.h) * vl - Math.cos(a.h) * va; GOUTTES.vie[k] = 1;
  }
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
