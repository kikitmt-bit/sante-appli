/* ============ les outils : petites fonctions partagées par tous les modules ============ */
const $ = id => document.getElementById(id);
const PARAMS = new URLSearchParams(location.search);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const lisse = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function hasard(g) { let a = (g >>> 0) || 1; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const h2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function bruit(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return lerp(lerp(h2(xi, yi), h2(xi + 1, yi), u), lerp(h2(xi, yi + 1), h2(xi + 1, yi + 1), u), v); }
const fbm = (x, y) => bruit(x, y) * .55 + bruit(x * 2.1 + 7, y * 2.1 + 3) * .3 + bruit(x * 4.3 + 1, y * 4.3 + 9) * .15;
const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const couleurs = o => typeof o === "string" ? hex(o) : Array.isArray(o) ? o.map(couleurs) : Object.fromEntries(Object.entries(o).map(([k, v]) => [k, couleurs(v)]));  // toute une palette d'un coup
const fonce = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const melange = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
function toile(w, h, dessin) { const c = document.createElement("canvas"); c.width = w; c.height = h; if (dessin) dessin(c.getContext("2d")); return c; }
const fmt = s => { s = Math.max(0, s); return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0"); };
