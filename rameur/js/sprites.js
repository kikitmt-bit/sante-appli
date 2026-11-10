/* ============ les Pokémon : sprites de Pokémon Donjon Mystère (Chunsoft, via PMD SpriteCollab, CC BY-NC 4.0), lus en ligne ============ */
// Chaque planche : une rangée par direction (0 = face, 4 = de dos), une colonne par image d'animation. Dernière version du dépôt ;
// si une image ne charge plus, on se rabat sur le sprite PokeAPI du même Pokémon.
const CACHE = {};
function animsDe(n) {
  return CACHE[n] || (CACHE[n] = (BUNDLE[PMD + n + "/AnimData.xml"] ? Promise.resolve(BUNDLE[PMD + n + "/AnimData.xml"]) : fetch(PMD + n + "/AnimData.xml").then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })).then(xml => {
    const doc = new DOMParser().parseFromString(xml, "text/xml"), blocs = {}, out = {};
    doc.querySelectorAll("Anim").forEach(a => blocs[a.querySelector("Name").textContent] = a);
    for (const [nom, a0] of Object.entries(blocs)) { let a = a0; const cp = a.querySelector("CopyOf"); if (cp) a = blocs[cp.textContent]; if (!a || !a.querySelector("FrameWidth")) continue;
      out[nom] = {fichier: a.querySelector("Name").textContent, fw: +a.querySelector("FrameWidth").textContent, fh: +a.querySelector("FrameHeight").textContent, dur: [...a.querySelectorAll("Duration")].map(d => +d.textContent)}; }
    return out; }));
}
async function chargerPMD(n, nom, num) {
  try {
    const A = (await animsDe(n))[nom]; if (!A) throw new Error("pas de " + nom);
    const img = await chargerImg(`${PMD}${n}/${A.fichier}-Anim.png`);
    return decouperPlanche(img, A.fw, A.fh, A.dur);
  } catch (e) { const i = await chargerImg(PKAPI(num || +n)); return decouperPlanche(i, i.width, i.height, [1]); }
}
function decouperPlanche(img, fw, fh, dur) {  // le cadre utile de chaque rangée est mesuré (les marges transparentes sont rognées)
  const cols = Math.max(1, Math.floor(img.width / fw)), rows = Math.max(1, Math.floor(img.height / fh)), c = toile(img.width, img.height, x => x.drawImage(img, 0, 0)), d = c.getContext("2d").getImageData(0, 0, img.width, img.height).data, boites = {};
  const o = {img: c, fw, fh, cols, rows, dur, total: dur.reduce((s, v) => s + v, 0) / 60,
    bbox(r) { r = Math.min(r, rows - 1); if (boites[r]) return boites[r]; let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
      for (let i = 0; i < cols; i++) for (let Y = 0; Y < fh; Y++) for (let X = 0; X < fw; X++) if (d[((r * fh + Y) * img.width + i * fw + X) * 4 + 3] > 20) { x0 = Math.min(x0, X); x1 = Math.max(x1, X + 1); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y + 1); }
      return boites[r] = x1 < 0 ? {x0: 0, x1: fw, y0: 0, y1: fh} : {x0, x1, y0, y1}; },
    image(temps) { let s = (temps % o.total) * 60, i = 0; while (i < dur.length - 1 && s >= dur[i]) { s -= dur[i]; i++; } return Math.min(i, cols - 1); }};
  return o;
}
function teindre(o, couleur) {  // la même planche, d'une seule couleur (le fantôme)
  const c = toile(o.img.width, o.img.height, x => { x.drawImage(o.img, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = couleur; x.fillRect(0, 0, o.img.width, o.img.height); });
  return Object.assign(Object.create(o), {img: c});
}
/* dessiner une image d'une planche : bas du cadre en (sx, yBas), agrandi d'un nombre entier de fois ; plonge = part du corps sous l'eau (cachée sous yEau) */
function dessinerPMD(o, i, rang, sx, yBas, ech, plonge = 0, yEau = null) {
  const b = o.bbox(rang), w = (b.x1 - b.x0) * ech, h = (b.y1 - b.y0) * ech, yb = yBas + plonge * h;
  cx.save(); if (yEau !== null) { cx.beginPath(); cx.rect(0, 0, E.W, Math.round(yEau)); cx.clip(); }
  cx.drawImage(o.img, i * o.fw + b.x0, Math.min(rang, o.rows - 1) * o.fh + b.y0, b.x1 - b.x0, b.y1 - b.y0, Math.round(sx - w / 2), Math.round(yb - h), w, h); cx.restore();
  return {w, h};
}

/* ---- ton Pokémon : de dos, le corps dans l'eau, avec son sillage ---- */
const NAGEURS = [{n: "0007", nom: "Carapuce", plonge: .3, km: 0}, {n: "0008", nom: "Carabaffe", plonge: .32, km: 20}, {n: "0009", nom: "Tortank", plonge: .34, km: 60}];
const HERO_ECH = Math.max(2, Math.round(E.H / 150));   // chaque pixel du Pokémon fait 3 pixels de l'image (à 450 px de haut) : toujours net
let heros = null, construction = 0;
async function construire(i) { const n = ++construction, o = await chargerPMD(NAGEURS[i].n, "Walk", +NAGEURS[i].n); if (n === construction) heros = o; }
const GOUTTES = [];   // gouttes et écume : {s (m le long de la piste), x (m), y (m), vx, vy, vs, vie, max, eau}
function gerbe(force) {  // un coup de rame : une gerbe de chaque côté
  const n = 12 + Math.round(force * 18);
  for (let c = -1; c <= 1; c += 2) for (let k = 0; k < n; k++) GOUTTES.push({s: S.s - .2 + (Math.random() - .5) * .5, x: c * (.5 + Math.random() * .3), y: .1, vx: c * (.8 + Math.random() * 2), vy: 2.2 + Math.random() * 3 * (.5 + force), vs: -(1 + Math.random() * 2), vie: .7 + Math.random() * .4, max: 1.1, eau: false});
}
function sillage(dt, v) {  // de l'écume qui reste à la surface, derrière toi
  const n = Math.min(6, Math.round(v * dt * 14 + Math.random()));
  for (let k = 0; k < n; k++) { const c = Math.random() < .5 ? -1 : 1; GOUTTES.push({s: S.s - .6, x: c * (.3 + Math.random() * .25), y: 0, vx: c * (.5 + Math.random() * 1.1) * (.5 + v * .12), vy: 0, vs: 0, vie: .9 + Math.random() * .7, max: 1.6, eau: true}); }
}
function avancerGouttes(dt) { for (let i = GOUTTES.length - 1; i >= 0; i--) { const g = GOUTTES[i]; g.vie -= dt; if (g.vie <= 0) { GOUTTES.splice(i, 1); continue; }
  g.x += g.vx * dt; g.s += g.vs * dt; if (!g.eau) { g.vy -= 11 * dt; g.y += g.vy * dt; if (g.y < 0) { g.y = 0; g.eau = true; g.vy = 0; g.vx *= .3; g.vs = 0; } } else { g.vx *= Math.pow(.4, dt); } } }
function dessinerGouttes(pos) {
  for (const g of GOUTTES) { const z = g.s - pos; if (z < 1) continue; const w = surEau(z, pos), x = E.W / 2 + w.ppm * g.x, y = w.y - w.ppm * g.y, t = g.vie / g.max;
    cx.fillStyle = g.eau ? (t > .5 ? "#F2FAFF" : "#C8E4F8") : (Math.random() < .5 ? "#F2FAFF" : "#A8D4F8"); const q = Math.max(1, Math.round(w.ppm * .05)); cx.fillRect(Math.round(x), Math.round(y), q, g.eau ? Math.max(1, Math.round(q / 2)) : q); }
}
function dessinerHero(pos, t) {
  if (!heros) return; const w = surEau(ZH, pos), rang = (() => { const k = val(PISTE.vir, S.s + 2); return k < -.006 ? 5 : k > .006 ? 3 : 4; })();
  const i = heros.image(t * (.6 + S.vn * 1.2)), bob = Math.round(Math.sin(t * 5) * .6);
  const {w: ww} = dessinerPMD(heros, i, rang, E.W / 2, w.y + bob, HERO_ECH, NAGEURS[choix].plonge, w.y + 2);
  // l'écume autour du corps, à la surface
  const y = Math.round(w.y) + 1; cx.fillStyle = "#EAF8FF"; cx.fillRect(Math.round(E.W / 2 - ww / 2 - 4), y, Math.round(ww + 8), 1);
  cx.fillStyle = "#C8E4F8"; cx.fillRect(Math.round(E.W / 2 - ww / 2 - 7), y + 1, Math.round(ww + 14), 1);
  for (let k = 0; k < 6; k++) { const a = Math.sin(t * 6 + k * 2.4) * .5 + .5; cx.fillStyle = "#EAF8FF"; cx.fillRect(Math.round(E.W / 2 - ww / 2 - 10 + (k % 2 ? ww + 20 : 0) + a * 3), y + (k >> 1) - 1, 2, 1); }
}
