/* ============ outils communs : petites fonctions, chargement des images ============ */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const lisse = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const fmt = s => { s = Math.max(0, s); return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0"); };
const fmtT = s => fmt(s) + "," + Math.floor((s % 1) * 10);  // un temps au dixième
/* un hasard qui se répète : la même graine donne toujours le même décor */
function hasard(graine) { let a = graine | 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = k => { const x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const PMD = "https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite/";
const PKAPI = n => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iii/emerald/${n}.png`;
const BUNDLE = {};  // dans l'appli, les images se lisent en ligne (rien d'intégré)
const IMAGES_URL = /^(localhost|127\.)/.test(location.hostname) ? "scenes/circuit/" : "https://raw.githubusercontent.com/kikitmt-bit/sante-appli/main/scenes/circuit/";
const IMGS = {};
const chargerImg = url => IMGS[url] || (IMGS[url] = new Promise((ok, ko) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = ko; i.src = BUNDLE[url] || url; }));
function toile(w, h, f) { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.imageSmoothingEnabled = false; f && f(x, w, h); return c; }
/* une couleur « #RRGGBB » -> [r, v, b] */
const rvb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
