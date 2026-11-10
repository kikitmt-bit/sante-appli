/* ============ la piste : le niveau (JSON) devient des bandes de 2 m ============ */
// Chaque bande porte : la courbure, la hauteur du sol, la largeur de l'eau de chaque côté, la nature et la hauteur de chaque rive.
// Les rives voisines se fondent en douceur (moyenne glissante) : jamais de marche brusque.
const GAIN_VIRAGE = 0.8;   // à l'image, un virage est un peu moins serré qu'en vrai (un virage de 130° en 110 m ne se dessine pas tel quel)
const MER_LARGEUR = 400;   // une rive « mer » : l'eau continue jusqu'à l'horizon
const PISTE = (() => {
  const secs = []; let s = 0, nom = "", cumul = 0;
  for (const c of NIVEAU.sections) { if (c.nom) nom = c.nom; secs.push(Object.assign({}, c, {nom, s0: s, s1: s + c.long, h0: cumul})); s += c.long; cumul += c.colline || 0; }
  const LONG = s, NS = Math.round(LONG / 2), SEG = LONG / NS;
  const F = () => new Float32Array(NS);
  const P = {LONG, NS, SEG, secs, kap: F(), vir: F(), sol: F(), ew: F(), wl: F(), wr: F(), hg: F(), hd: F(), bg: F(), bd: F(), kg: new Array(NS), kd: new Array(NS), sec: new Uint8Array(NS), tun: new Uint8Array(NS), hdg: F(), px: F(), pz: F()};
  let k = 0;
  for (let i = 0; i < NS; i++) {
    const m = (i + .5) * SEG; while (k < secs.length - 1 && m >= secs[k].s1) k++;
    const c = secs[k], rg = BIOME.rives[c.rives[0]], rd = BIOME.rives[c.rives[1]];
    P.sec[i] = k; P.vir[i] = c.virage * Math.PI / 180 / c.long; P.kap[i] = P.vir[i] * GAIN_VIRAGE;
    P.sol[i] = c.h0 + (c.colline || 0) * lisse(0, 1, (m - c.s0) / c.long);
    P.ew[i] = c.eau / 2; P.wl[i] = c.rives[0] === "mer" ? MER_LARGEUR : c.eau / 2; P.wr[i] = c.rives[1] === "mer" ? MER_LARGEUR : c.eau / 2;
    P.hg[i] = rg.h; P.hd[i] = rd.h; P.bg[i] = rg.larg; P.bd[i] = rd.larg; P.kg[i] = c.rives[0]; P.kd[i] = c.rives[1];
    P.tun[i] = c.rives[0] === "tunnel" || c.rives[1] === "tunnel" ? 1 : 0;
  }
  const lisser = (a, rayon) => { const r = Math.round(rayon / SEG), o = new Float32Array(NS); for (let i = 0; i < NS; i++) { let t = 0; for (let j = -r; j <= r; j++) t += a[(i + j + NS) % NS]; o[i] = t / (2 * r + 1); } a.set(o); };
  for (const a of [P.ew, P.wl, P.wr]) lisser(a, 12);
  for (const a of [P.hg, P.hd, P.bg, P.bd]) lisser(a, 8);
  // le plan vu de dessus (pour la mini-carte) : on suit le cap, puis on répartit l'écart de fermeture
  let h = 0, x = 0, z = 0; for (let i = 0; i < NS; i++) { P.px[i] = x; P.pz[i] = z; P.hdg[i] = h; h += P.vir[i] * SEG; x += Math.cos(h) * SEG; z += Math.sin(h) * SEG; }
  const ex = x, ez = z; for (let i = 0; i < NS; i++) { P.px[i] -= ex * i / NS; P.pz[i] -= ez * i / NS; }
  return P;
})();
const LONG = PISTE.LONG, NS = PISTE.NS, SEG = PISTE.SEG;
const ELAN = NIVEAU.elan, DEPART = 0;  // la ligne est au mètre 0 ; on part ELAN mètres avant
const mod = s => ((s % LONG) + LONG) % LONG;
const idx = s => Math.min(NS - 1, Math.floor(mod(s) / SEG));
const SECTION = nom => PISTE.secs.find(c => c.nom === nom);
const val = (a, s) => { const f = mod(s) / SEG, i = Math.min(NS - 1, Math.floor(f)); return lerp(a[i], a[(i + 1) % NS], f - i); };  // une valeur de la piste, fondue entre deux bandes
const hdgA = s => { const f = mod(s) / SEG, i = Math.min(NS - 1, Math.floor(f)); return PISTE.hdg[i] + PISTE.vir[i] * (f - i) * SEG; };
const TUNNELS = []; { let d = -1; for (let i = 0; i <= NS; i++) { const t = i < NS && PISTE.tun[i]; if (t && d < 0) d = i * SEG; if (!t && d >= 0) { TUNNELS.push([d, i * SEG]); d = -1; } } }
const dansTunnel = s => TUNNELS.some(([a, b]) => mod(s) > a - 1 && mod(s) < b);
const surBoucle = s => mod(s - DEPART);
