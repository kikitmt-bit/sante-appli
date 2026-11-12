/* ============ le rendu : une petite image nette, agrandie sans lissage ============ */
// Tout le monde est dessiné dans une image de 720 pixels de haut au plus (un seul grain de pixel pour tout ; elle baisse toute seule
// jusqu'à 432 si la machine peine : jeu.js), avec un contour sombre
// autour des formes proches. Un seul matériau pour tout ce qui est solide : la couleur vient de chaque sommet, la lumière est
// en paliers (comme un sprite), un fin motif de pixels habille les sols et les parois de près. Le ciel suit l'heure (ambiance.js).
// L'image fait exactement « l'écran divisé par un nombre entier » (2 sur la tablette : 800 pixels de haut ; 2 sur un téléphone en
// paysage : 720) : tous les pixels ont la même taille à l'écran. Si la machine peine, on divise par un cran de plus (jeu.js). ?h= impose la hauteur.
let HAUT = 432;
const FINESSE = {cran: 0};   // crans de finesse retirés parce que la machine peine
function tailleImage() {
  const dpr = devicePixelRatio || 1, w = Math.max(1, innerWidth), h = Math.max(1, innerHeight), asp = clamp(w / h, .4, 2.6), court = Math.min(w, h) * dpr;
  let petit;
  if (+PARAMS.get("h")) petit = clamp(+PARAMS.get("h"), 240, 1080);
  else { let n = Math.max(1, Math.ceil(court / 800)) + (asp < 1 ? 1 : 0); while (n > 1 && court / n < 400) n--; petit = Math.max(300, Math.round(court / (n + FINESSE.cran))); }
  return asp >= 1 ? [Math.round(petit * asp), petit, asp] : [petit, Math.round(petit / asp), asp];   // en portrait, le petit côté est la largeur
}
const CONTOUR = PARAMS.get("contour") !== "0";
const canvas = $("c"), renderer = new THREE.WebGLRenderer({canvas, antialias: false, powerPreference: "high-performance"});
renderer.setPixelRatio(1); renderer.info.autoReset = false;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(52, 1.6, .5, 420);   // au-delà de la brume, rien n'est dessiné
const BRUME = hex(BIOME.brume), B0 = 60, B1 = 400;
scene.fog = new THREE.Fog(new THREE.Color(...BRUME), B0, B1);   // pour les sprites ; le reste a sa brume dans son matériau
const SOLEIL = new THREE.Vector3(.42, .76, .5).normalize();
const VISION = {b0: B0, b1: B1};   // jusqu'où on voit : jeu.js la réduit si la machine peine, ambiance.js y ajoute la brume du temps qu'il fait
// Les réglages partagés par TOUS les matériaux. ambiance.js les fait vivre : l'heure (uTeinte, uNuit), le temps (uPluie, uNeige, la brume), le lieu (uSombre).
const COMMUNS = {uBrume: {value: new THREE.Vector3(...BRUME)}, uB0: {value: B0}, uB1: {value: B1}, uSombre: {value: 1}, uT: {value: 0}, uTeinte: {value: new THREE.Vector3(1, 1, 1)},
  uNuit: {value: 0}, uPluie: {value: 0}, uNeige: {value: 0}, uLueur: {value: new THREE.Vector3(1, .92, .6)}};
const TEINTES = [];   // les matériaux simples (sprites, panneaux) : ambiance.js leur donne la teinte de l'heure

/* le motif de pixels : rouge = touffes (sols), vert = strates (parois), bleu = pavés */
const DETAIL = (() => { const N = 64, c = toile(N, N), x = c.getContext("2d"), im = x.createImageData(N, N), d = im.data, R = hasard(11), tour = (a, b) => ((a % b) + b) % b;
  const bp = (X, Y) => { const xi = Math.floor(X), yi = Math.floor(Y), xf = X - xi, yf = Y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), g = (a, b) => h2(tour(a, 8), tour(b, 8)); return lerp(lerp(g(xi, yi), g(xi + 1, yi), u), lerp(g(xi, yi + 1), g(xi + 1, yi + 1), u), v); };
  for (let Y = 0; Y < N; Y++) for (let X = 0; X < N; X++) { const k = (Y * N + X) * 4, n = bp(X / 8, Y / 8) * .7 + bp(X / 4 + 3, Y / 4 + 5) * .3;
    let r = n > .63 ? .28 : n < .3 ? .72 : .5; if (R() < .035) r = .22; else if (R() < .03) r = .8;
    const yy = Y + Math.round(1.5 * Math.sin(X / N * Math.PI * 4)), bande = Math.floor(tour(yy, N) / 8); let g = bande % 2 ? .4 : .56; if (tour(yy, 8) === 0) g = .16; else if (R() < .05) g -= .12; if (h2(Math.floor(X / 3) + bande * 7, bande) > .93 && tour(X, 3) === 0) g = .22;
    const rang = Math.floor(Y / 8), xx = tour(X + (rang % 2) * 8, 16); let b = .5 + (h2(Math.floor(tour(X + (rang % 2) * 8, N) / 16), rang) - .5) * .22; if (xx === 0 || Y % 8 === 0) b = .2;
    d[k] = r * 255; d[k + 1] = g * 255; d[k + 2] = b * 255; d[k + 3] = 255; }
  x.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; })();

/* Le matériau de tout ce qui est solide. La matière de chaque sommet (attribut mat) choisit le rendu :
   0 sol naturel (touffes, strates sur les parois) · 1 pavés · 2 uni (murs, toits, feuillages)
   3 fenêtre (éclairée la nuit, pas toutes) · 7 lampe (allumée la nuit) · 4 lumineux (cristal, lave : brille toujours)
   5 chute d'eau (l'écume dévale) · 6 eau calme (une mare : des reflets) */
const MAT_MONDE = new THREE.ShaderMaterial({vertexColors: true, side: THREE.DoubleSide,
  uniforms: Object.assign({uDetail: {value: DETAIL}, uSoleil: {value: SOLEIL}, uLp: {value: [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector4(0, -999, 0, 1))}, uLc: {value: [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector3())}}, COMMUNS),
  vertexShader: `attribute float mat; varying vec3 vC, vN, vW; varying float vM, vZ;
    void main() { vC = color; vN = mat3(modelMatrix) * normal; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vM = mat; vec4 mv = viewMatrix * w; vZ = -mv.z; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform sampler2D uDetail; uniform vec3 uSoleil, uBrume, uTeinte, uLueur; uniform float uB0, uB1, uSombre, uT, uNuit, uNeige; uniform vec4 uLp[6]; uniform vec3 uLc[6]; varying vec3 vC, vN, vW; varying float vM, vZ;
    float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    vec3 eclaire(vec3 n) {   // les lumières proches (cristaux, lanternes, lampadaires la nuit) éclairent ce qui les entoure, en paliers
      vec3 l = vec3(0.); for (int i = 0; i < 6; i++) { vec3 d = uLp[i].xyz - vW; float r = length(d), a = 1. - r / uLp[i].w; if (a <= 0.) continue;
        a = a * a * (.4 + .6 * max(dot(n, d / max(r, .001)), 0.)); l += uLc[i] * floor(a * 6. + .5) / 6.; }
      return l; }
    void main() { vec3 n = normalize(vN); float brume = smoothstep(uB0, uB1, vZ) * .94; vec3 c;
      float lum = .6 + .4 * (dot(n, uSoleil) * .5 + .5) + .04 * n.y; lum = floor(lum * 7. + .5) / 7.;   // la lumière en paliers
      if (vM > 6.5) { c = mix(vC * lum * uSombre * uTeinte, uLueur, uNuit); gl_FragColor = vec4(mix(c, uBrume, brume * (1. - .6 * uNuit)), 1.); return; }
      if (vM > 3.5) {
        if (vM < 4.5) { c = vC * (.9 + .1 * sin(uT * 2.3 + vW.x * .7 + vW.z * .9)); gl_FragColor = vec4(mix(c, uBrume, brume * .5), 1.); return; }
        if (vM < 5.5) { float lat = abs(n.x) > abs(n.z) ? vW.z : vW.x, col = floor(lat * 4.);
          float f = h21(vec2(col, floor(vW.y * 3. + uT * (8. + 5. * h21(vec2(col, 3.))))));
          c = mix(vC, vec3(.95, .98, 1.), step(.58, f)); }
        else { vec2 q = floor(vW.xz * 4.) / 4.; float o = sin(q.x * .9 + uT * .4) + sin(q.y * 1.1 - uT * .3); c = vC * (o > .7 ? 1.1 : 1.);
          vec2 g = floor(vW.xz * vec2(1.2, 3.)); if (h21(g + floor(uT * .8 + h21(g) * 5.) * .013) > .94) c = mix(c, vec3(1.), .55); }
        gl_FragColor = vec4(mix(c * uSombre * uTeinte, uBrume, brume), 1.); return; }
      if (vM > 2.5) { float t = clamp((vM - 3.) / .42, 0., 1.), allume = step(t, uNuit * .64) * (.82 + .18 * fract(t * 7.3));   // chaque vitre entière : allumée ou non (deux sur trois au cœur de la nuit, de plus en plus au crépuscule)
        c = mix(vC * lum * uSombre * uTeinte, uLueur, allume); gl_FragColor = vec4(mix(c, uBrume, brume * (1. - .6 * allume)), 1.); return; }
      float det = 1.;
      if (vM < 1.5) { float t;
        if (n.y < .6 && vM > 1.2) t = texture2D(uDetail, vec2(abs(n.x) > abs(n.z) ? vW.z : vW.x, vW.y) / 3.).b;   // un mur maçonné (un tunnel) : des pierres
        else if (n.y < .6) t = texture2D(uDetail, vec2(abs(n.x) > abs(n.z) ? vW.z : vW.x, vW.y) / 6.).g;
        else if (vM > .5) t = texture2D(uDetail, vW.xz / 6.).b;   // (1 : des pavés ; 1,3 : un mur maçonné, seulement les tunnels)
        else t = texture2D(uDetail, vW.xz / 6.).r;
        det = mix(1., .72 + .56 * t, 1. - smoothstep(20., 70., vZ)); }
      c = vC * lum * det;
      if (uNeige > 0. && n.y > .55 && h21(floor(vW.xz * 2.5)) < uNeige) c = vec3(.92, .95, 1.) * lum;   // la neige tient sur ce qui est à plat
      gl_FragColor = vec4(mix(c * uSombre * uTeinte + vC * eclaire(n) * det, uBrume, brume), 1.); }`});
/* les six lumières les plus proches de la caméra (allumées : toujours, ou la nuit), à chaque image */
const LUM_PROCHES = [];
function lumieresProches() {
  const L = MONDE.lumieres || [], U = MAT_MONDE.uniforms, p = camera.position, nuit = COMMUNS.uNuit.value; LUM_PROCHES.length = 0;
  for (const l of L) { const f = l.toujours ? 1 : clamp((nuit - .25) / .5, 0, 1); if (!f) continue; const d = Math.hypot(l.x - p.x, l.y - p.y, l.z - p.z), r = l.t * 1.8 + 2; if (d > r + 70) continue; LUM_PROCHES.push([d - r, l, f, r]); }
  LUM_PROCHES.sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < 6; i++) { const e = LUM_PROCHES[i];
    if (!e) { U.uLp.value[i].set(0, -999, 0, 1); U.uLc.value[i].set(0, 0, 0); continue; }
    const [, l, f, r] = e, k = (l.toujours ? .55 : .5) * f; U.uLp.value[i].set(l.x, l.y, l.z, r); U.uLc.value[i].set(l.c[0] * k, l.c[1] * k, l.c[2] * k); }
}

/* ---- le ciel : un anneau qui fait tout le tour. Le dégradé, le soleil, la lune et les étoiles sont calculés (ils suivent l'heure) ;
   les montagnes et les nuages sont peints une fois (les nuages défilent avec le vent) ---- */
const CIEL = (() => { const W = 2048, H = 512, HOR = Math.round(H * .952), T2 = Math.PI * 2;
  const peindre = dessin => { const c = toile(W, H), x = c.getContext("2d"), im = x.createImageData(W, H), d = im.data;
    dessin((X, Y, col) => { if (Y < 0 || Y >= H) return; const k = (Y * W + ((X % W) + W) % W) * 4; d[k] = col[0] * 255; d[k + 1] = col[1] * 255; d[k + 2] = col[2] * 255; d[k + 3] = 255; });
    x.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; };
  const m1 = hex(BIOME.ciel.montagnes[0]), m2 = hex(BIOME.ciel.montagnes[1]), s = (X, a, ph) => Math.sin(X / W * T2 * a + ph), relief = BIOME.ciel.relief === undefined ? 1 : BIOME.ciel.relief;
  const paysage = peindre(px => { for (let X = 0; X < W; X++) { const loin = (16 + 34 * (.5 + .5 * (s(X, 3, 1) * .5 + s(X, 7, 2.2) * .3 + s(X, 15, .4) * .2))) * relief, presM = (6 + 14 * (.5 + .5 * (s(X, 5, 3) * .55 + s(X, 11, 1.3) * .3 + s(X, 23, 2) * .15))) * relief;
    for (let e = 0; e < loin; e++) px(X, HOR - e, e < presM ? m2 : e > loin - 5 && loin > 40 ? [.96, .98, 1] : m1); } });
  const nuages = peindre(px => { const R = hasard(4), blanc = [1, 1, 1], gris = [.8, .87, .95];
    for (let k = 0; k < 30; k++) { const cx0 = R() * W, base = HOR - 70 - R() * 230, n = 3 + Math.floor(R() * 4), lobes = []; let lx = 0;
      for (let j = 0; j < n; j++) { const r = 9 + R() * 16; lobes.push([lx, r, r * (.55 + R() * .3)]); lx += r * (.9 + R() * .5); }
      for (let X = -30; X < lx + 30; X++) for (let Y = -34; Y <= 0; Y++) { let dans = false; for (const [ox, rx, ry] of lobes) if ((X - ox) ** 2 / (rx * rx) + (Y * Y) / (ry * ry) < 1) { dans = true; break; }
        if (dans) px(Math.round(cx0 + X), Math.round(base + Y), Y > -3 ? gris : blanc); } } });
  const haut = hex(BIOME.ciel.haut), bas = hex(BIOME.ciel.bas), v3 = c => ({value: new THREE.Vector3(...c)});
  const U = {tP: {value: paysage}, tN: {value: nuages}, uHaut: v3(haut), uBas: v3(bas), uLoin: v3([1, 1, 1]), uNuage: v3([1, 1, 1]), uGris: v3([.62, .66, .72]), uCouvert: {value: 0}, uEtoiles: {value: 0}, uGraine: {value: ((NIVEAU.graine || 1) * 17.31) % 97}, uDens: {value: .0028 * (NIVEAU.etoiles || (.55 + .9 * h2(NIVEAU.graine || 1, 3)))},
    uSol: v3([0, -1, 0]), uSolC: v3([1, .97, .8]), uLune: v3([0, -1, 0]), uDefile: {value: 0}, uEclair: {value: 0}, uT: COMMUNS.uT, uHor: {value: 1 - HOR / H}};
  const mat = new THREE.ShaderMaterial({uniforms: U, side: THREE.BackSide, depthWrite: false, depthTest: false,
    vertexShader: "varying vec2 vUv; varying vec3 vP; void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `uniform sampler2D tP, tN; uniform vec3 uHaut, uBas, uLoin, uNuage, uGris, uSol, uSolC, uLune; uniform float uCouvert, uEtoiles, uDefile, uEclair, uT, uHor, uGraine, uDens; varying vec2 vUv; varying vec3 vP;
      float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() { float e = (vUv.y - uHor) / (1. - uHor); vec3 dir = normalize(vP), c = uBas;
        if (e > 0.) { float u = pow(clamp(e / .8, 0., 1.), .7); c = mix(uBas, uHaut, floor(u * 12. + .5) / 12.); }   // le dégradé, en bandes
        c = mix(c, uGris, uCouvert * .82);
        if (e > .02) {
          if (uEtoiles > 0.) { float vis = uEtoiles * (1. - uCouvert) * smoothstep(.02, .12, e);   // des étoiles fixes, comme de vraies étoiles : chacune son éclat, aucune ne clignote
            vec2 g = floor(vec2(vUv.x * 1400., vUv.y * 340.)); float h = h21(g + uGraine);
            if (h > 1. - uDens) { float b = fract(h * 917.3); c = mix(c, mix(vec3(1., .97, .86), vec3(.86, .93, 1.), fract(h * 53.1)), vis * (.22 + .78 * b * b * b)); }
            float gros = 0.;   // de rares étoiles plus brillantes : une petite croix
            if (h21(g * .71 + uGraine + 11.) > .99935) gros = 1.;
            else if (h21((g + vec2(1., 0.)) * .71 + uGraine + 11.) > .99935 || h21((g - vec2(1., 0.)) * .71 + uGraine + 11.) > .99935 || h21((g + vec2(0., 1.)) * .71 + uGraine + 11.) > .99935 || h21((g - vec2(0., 1.)) * .71 + uGraine + 11.) > .99935) gros = .4;
            c = mix(c, vec3(1., .99, .94), vis * gros); }
          float ds = dot(dir, uSol), k = 1. - uCouvert * .9;
          if (ds > .9989) c = mix(c, uSolC, k); else if (ds > .9955) c = mix(c, uSolC, .32 * k); else if (ds > .986) c = mix(c, uSolC, .13 * k);
          float dl = dot(dir, uLune); if (dl > .9992 && dot(dir, normalize(uLune + vec3(.03, .012, .02))) < .9994) c = mix(c, vec3(.96, .97, .88), k); }
        vec4 n1 = texture2D(tN, vec2(vUv.x + uT * uDefile, vUv.y)), n2 = texture2D(tN, vec2(vUv.x * 2. + uT * uDefile * 1.6 + .37, vUv.y * 1.35 - .28));
        c = mix(c, n2.rgb * uNuage * .9, n2.a * smoothstep(.25, .8, uCouvert));
        c = mix(c, n1.rgb * uNuage, n1.a);
        vec4 p = texture2D(tP, vUv); c = mix(c, mix(p.rgb * uLoin, c, .3 * uCouvert), p.a);
        gl_FragColor = vec4(c + uEclair * .35, 1.); }`});
  const RAYON = 1700, HC = 1800, m = new THREE.Mesh(new THREE.CylinderGeometry(RAYON, RAYON, HC, 64, 1, true), mat);
  m.frustumCulled = false; const sc = new THREE.Scene(), loin = new THREE.Group(); sc.add(m); sc.add(loin); renderer.setClearColor(new THREE.Color(...haut));
  return {m, U, loin, y: HC / 2 - HC * (1 - HOR / H), scene: sc, cam: new THREE.PerspectiveCamera(52, 1.6, 10, 4000), jour: {haut, bas}, animes: []}; })();

/* ---- le lointain : de grands repères au-delà du monde (un volcan, de hautes montagnes, une ville), toujours dans la même direction.
   Un niveau les nomme : "lointain": [{"o": "volcan", "cap": 140, "taille": 1}] (cap : en degrés, 0 = droit devant au départ, 90 = à droite).
   Les recettes sont dans contenu/lointains (LOINTAINS.volcan = (F, o, R, K) => …), en mètres, à 1 400 m de distance. ---- */
const LOINTAINS = {};
const MAT_LOIN = new THREE.ShaderMaterial({vertexColors: true, side: THREE.DoubleSide, uniforms: {uSoleil: {value: SOLEIL}, uTeinte: COMMUNS.uTeinte, uVoile: COMMUNS.uBrume, uT: COMMUNS.uT},
  vertexShader: "attribute float mat; varying vec3 vC, vN; varying float vM, vY; void main() { vC = color; vN = mat3(modelMatrix) * normal; vec4 w = modelMatrix * vec4(position, 1.); vY = w.y - modelMatrix[3].y; vM = mat; gl_Position = projectionMatrix * viewMatrix * w; }",
  fragmentShader: `uniform vec3 uSoleil, uTeinte, uVoile; uniform float uT; varying vec3 vC, vN; varying float vM, vY;
    void main() { float lum = .62 + .38 * (dot(normalize(vN), uSoleil) * .5 + .5); lum = floor(lum * 5. + .5) / 5.;
      bool feu = vM > 3.5; vec3 c = feu ? vC * (.85 + .15 * sin(uT * 1.7 + vY * .03)) : vC * lum * uTeinte;
      float v = mix(1., .34 + .3 * (1. - smoothstep(0., 300., vY)), smoothstep(-8., 40., vY));   // le pied se perd dans la brume de l'horizon
      gl_FragColor = vec4(mix(c, uVoile, feu ? v * .35 : v), 1.); }`});
/* un panache (la fumée d'un volcan, d'une cheminée d'usine) : des bouffées en pixels, un peu transparentes, qui montent, gonflent,
   dérivent avec le vent et s'effacent ; une nouvelle part sans cesse. K.panache({x, y, z, haut, large, vent, duree, n, couleur}) */
const PANACHE_U = {uT: COMMUNS.uT, uHpx: {value: 800}, uTeinte: COMMUNS.uTeinte, uVoile: COMMUNS.uBrume};
function panache(g, o) {
  const n = o.n || 16, pos = [], ph = [], gr = [];
  for (let k = 0; k < n; k++) { pos.push(o.x || 0, o.y || 0, o.z || 0); ph.push(k / n); gr.push(h2(k + 1, 7)); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("aPh", new THREE.Float32BufferAttribute(ph, 1)); geo.setAttribute("aGr", new THREE.Float32BufferAttribute(gr, 1));
  const v = x => ({value: x}), m = new THREE.Points(geo, new THREE.ShaderMaterial({transparent: true, depthWrite: false,
    uniforms: Object.assign({uH: v(o.haut || 420), uL: v(o.large || 110), uV: v(o.vent || 150), uD: v(o.duree || 45), uC: v(new THREE.Vector3(...hex(o.couleur || "#B4AEB8")))}, PANACHE_U),
    vertexShader: `attribute float aPh, aGr; uniform float uT, uHpx, uH, uL, uV, uD; varying float vA, vGr;
      void main() { float age = fract(uT / uD + aPh);
        vec3 p = position + vec3(uV * age * age + sin(aGr * 40. + age * 3.) * uL * .45 * age, uH * (age * .8 + .2 * sqrt(age)), cos(aGr * 30.) * uL * .3 * age);
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
        float taille = uL * (.4 + age * 1.5) * (.8 + .4 * aGr) * length(modelMatrix[0].xyz);
        gl_PointSize = min(taille * projectionMatrix[1][1] * uHpx * .5 / -mv.z, 400.);
        vA = smoothstep(0., .12, age) * (1. - smoothstep(.4, 1., age)); vGr = aGr; }`,
    fragmentShader: `uniform vec3 uC, uTeinte, uVoile; varying float vA, vGr;
      float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() { vec2 q = (floor(gl_PointCoord * 16.) + .5) / 16.; float r = length(q - .5) * 2. + .22 * h21(floor(q * 5.) + vGr * 17.) - .11;   // un bord bosselé
        float a = (1. - smoothstep(.55, .95, r)) * vA * .5; a = floor(a * 5. + .5) / 5.; if (a < .05) discard;   // la transparence en paliers, comme un sprite
        vec3 c = uC * (.8 + .32 * (1. - q.y) + .06 * step(.5, h21(floor(q * 8.) + vGr)));
        gl_FragColor = vec4(mix(c * uTeinte, uVoile, .28), a); }`}));
  m.frustumCulled = false; g.add(m);
}
function construireLointain() {
  const R = hasard((NIVEAU.graine || 1) * 31 + 5), liste = NIVEAU.lointain || BIOME.lointain || [];
  for (const o of liste) {
    const recette = LOINTAINS[o.o]; if (!recette) { console.warn("Repère lointain inconnu : " + o.o); continue; }
    const cap = (o.cap || 0) * Math.PI / 180, dist = 1400 * (o.dist || 1), F = new Forme(), g = new THREE.Group();
    recette(F, o, R, {anime(f) { f.groupe = g; CIEL.animes.push(f); }, panache(p) { panache(g, p); }});
    const m = F.maille(MAT_LOIN); if (!m) continue;
    m.frustumCulled = false; g.add(m); g.position.set(Math.sin(cap) * dist, o.y || 0, -Math.cos(cap) * dist); g.rotation.y = -cap; g.scale.setScalar(o.taille || 1); CIEL.loin.add(g);
  }
  for (const a of CIEL.animes) if (a.forme) { a.maille = a.forme.maille(MAT_LOIN); a.maille.frustumCulled = false; a.groupe.add(a.maille); }
}
function animerLointain(t) { for (const a of CIEL.animes) a.maj(a.maille, t); }

/* ---- la petite image, et le contour sombre autour des formes proches ---- */
let cible = null;
const POST = {scene: new THREE.Scene(), cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
  mat: new THREE.ShaderMaterial({depthTest: false, depthWrite: false, uniforms: {tC: {value: null}, tD: {value: null}, uPx: {value: new THREE.Vector2()}, uN: {value: camera.near}, uF: {value: camera.far}},
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }",
    fragmentShader: `uniform sampler2D tC, tD; uniform vec2 uPx; uniform float uN, uF; varying vec2 vUv;
      float lin(vec2 uv) { float z = texture2D(tD, uv).x * 2. - 1.; return 2. * uN * uF / (uF + uN - z * (uF - uN)); }
      void main() { vec3 c = texture2D(tC, vUv).rgb; float z = lin(vUv);
        float m = max(max(lin(vUv + vec2(uPx.x, 0.)), lin(vUv - vec2(uPx.x, 0.))), max(lin(vUv + vec2(0., uPx.y)), lin(vUv - vec2(0., uPx.y))));
        float bord = step(z * .1 + .3, m - z) * (1. - smoothstep(55., 120., z));
        gl_FragColor = vec4(mix(c, c * .5, bord * .85), 1.); }`})};
POST.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), POST.mat));
function tailleEcran() {
  const [W, H, asp] = tailleImage(); HAUT = H; PANACHE_U.uHpx.value = H;
  renderer.setSize(W, H, false); camera.aspect = asp; camera.updateProjectionMatrix();
  if (CONTOUR) { if (cible) { cible.depthTexture.dispose(); cible.dispose(); }
    cible = new THREE.WebGLRenderTarget(W, H, {minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter});
    cible.depthTexture = new THREE.DepthTexture(W, H); cible.depthTexture.type = THREE.UnsignedIntType;
    POST.mat.uniforms.tC.value = cible.texture; POST.mat.uniforms.tD.value = cible.depthTexture; POST.mat.uniforms.uPx.value.set(1 / W, 1 / H); }
}
addEventListener("resize", tailleEcran); tailleEcran();
function dessiner() {  // d'abord le ciel (sa propre caméra, qui ne fait que tourner), puis le monde par-dessus
  renderer.info.reset(); renderer.autoClear = false;
  CIEL.cam.quaternion.copy(camera.quaternion); CIEL.cam.fov = camera.fov; CIEL.cam.aspect = camera.aspect; CIEL.cam.updateProjectionMatrix(); CIEL.m.position.y = CIEL.y - camera.position.y; CIEL.loin.position.y = -camera.position.y;
  renderer.setRenderTarget(CONTOUR ? cible : null); renderer.clear(); if (CIEL.m.visible) renderer.render(CIEL.scene, CIEL.cam); renderer.clearDepth(); renderer.render(scene, camera);
  if (CONTOUR) { renderer.setRenderTarget(null); renderer.clear(); renderer.render(POST.scene, POST.cam); }
}
