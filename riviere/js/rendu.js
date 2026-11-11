/* ============ le rendu : une petite image nette, agrandie sans lissage ============ */
// Tout le monde est dessiné dans une image de 720 pixels de haut au plus (un seul grain de pixel pour tout ; elle baisse toute seule
// jusqu'à 432 si la machine peine : jeu.js), avec un contour sombre
// autour des formes proches. Un seul matériau pour tout ce qui est solide : la couleur vient de chaque sommet, la lumière est
// en paliers (comme un sprite), un fin motif de pixels habille les sols et les parois de près.
let PLAFOND = 720, HAUT = 432;   // la hauteur de l'image : celle de l'écran, entre 432 et 720 pixels (?h= l'impose)
const hauteurVoulue = () => +PARAMS.get("h") ? clamp(+PARAMS.get("h"), 240, 1080) : clamp(Math.round(innerHeight * (devicePixelRatio || 1)), 432, PLAFOND);
const CONTOUR = PARAMS.get("contour") !== "0";
const canvas = $("c"), renderer = new THREE.WebGLRenderer({canvas, antialias: false, powerPreference: "high-performance"});
renderer.setPixelRatio(1); renderer.info.autoReset = false;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(52, 1.6, .5, 420);   // au-delà de la brume, rien n'est dessiné
const BRUME = hex(BIOME.brume), B0 = 60, B1 = 400;
scene.fog = new THREE.Fog(new THREE.Color(...BRUME), B0, B1);   // pour les sprites ; le reste a sa brume dans son matériau
const SOLEIL = new THREE.Vector3(.42, .76, .5).normalize();
const COMMUNS = {uBrume: {value: new THREE.Vector3(...BRUME)}, uB0: {value: B0}, uB1: {value: B1}, uSombre: {value: 1}, uT: {value: 0}};

/* le motif de pixels : rouge = touffes (sols), vert = strates (parois), bleu = pavés */
const DETAIL = (() => { const N = 64, c = toile(N, N), x = c.getContext("2d"), im = x.createImageData(N, N), d = im.data, R = hasard(11), tour = (a, b) => ((a % b) + b) % b;
  const bp = (X, Y) => { const xi = Math.floor(X), yi = Math.floor(Y), xf = X - xi, yf = Y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), g = (a, b) => h2(tour(a, 8), tour(b, 8)); return lerp(lerp(g(xi, yi), g(xi + 1, yi), u), lerp(g(xi, yi + 1), g(xi + 1, yi + 1), u), v); };
  for (let Y = 0; Y < N; Y++) for (let X = 0; X < N; X++) { const k = (Y * N + X) * 4, n = bp(X / 8, Y / 8) * .7 + bp(X / 4 + 3, Y / 4 + 5) * .3;
    let r = n > .63 ? .28 : n < .3 ? .72 : .5; if (R() < .035) r = .22; else if (R() < .03) r = .8;
    const yy = Y + Math.round(1.5 * Math.sin(X / N * Math.PI * 4)), bande = Math.floor(tour(yy, N) / 8); let g = bande % 2 ? .4 : .56; if (tour(yy, 8) === 0) g = .16; else if (R() < .05) g -= .12; if (h2(Math.floor(X / 3) + bande * 7, bande) > .93 && tour(X, 3) === 0) g = .22;
    const rang = Math.floor(Y / 8), xx = tour(X + (rang % 2) * 8, 16); let b = .5 + (h2(Math.floor(tour(X + (rang % 2) * 8, N) / 16), rang) - .5) * .22; if (xx === 0 || Y % 8 === 0) b = .2;
    d[k] = r * 255; d[k + 1] = g * 255; d[k + 2] = b * 255; d[k + 3] = 255; }
  x.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; })();

const MAT_MONDE = new THREE.ShaderMaterial({vertexColors: true, side: THREE.DoubleSide,
  uniforms: Object.assign({uDetail: {value: DETAIL}, uSoleil: {value: SOLEIL}}, COMMUNS),
  vertexShader: `attribute float mat; varying vec3 vC, vN, vW; varying float vM, vZ;
    void main() { vC = color; vN = mat3(modelMatrix) * normal; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vM = mat; vec4 mv = viewMatrix * w; vZ = -mv.z; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform sampler2D uDetail; uniform vec3 uSoleil, uBrume; uniform float uB0, uB1, uSombre; varying vec3 vC, vN, vW; varying float vM, vZ;
    void main() { vec3 n = normalize(vN);
      float lum = .6 + .4 * (dot(n, uSoleil) * .5 + .5) + .04 * n.y; lum = floor(lum * 7. + .5) / 7.;   // la lumière en paliers
      float det = 1.;
      if (vM < 1.5) { float t;
        if (n.y < .6) t = texture2D(uDetail, vec2(abs(n.x) > abs(n.z) ? vW.z : vW.x, vW.y) / 6.).g;
        else if (vM > .5) t = texture2D(uDetail, vW.xz / 6.).b;
        else t = texture2D(uDetail, vW.xz / 6.).r;
        det = mix(1., .72 + .56 * t, 1. - smoothstep(20., 70., vZ)); }
      vec3 c = vC * lum * det;
      c = mix(c, uBrume, smoothstep(uB0, uB1, vZ) * .94);
      gl_FragColor = vec4(c * uSombre, 1.); }`});

/* ---- le ciel : un anneau peint une fois (bandes, nuages, montagnes au loin), qui fait tout le tour et ne change jamais ---- */
const CIEL = (() => { const W = 2048, H = 512, c = toile(W, H), x = c.getContext("2d"), im = x.createImageData(W, H), d = im.data;
  const haut = hex(BIOME.ciel.haut), bas = hex(BIOME.ciel.bas), m1 = hex(BIOME.ciel.montagnes[0]), m2 = hex(BIOME.ciel.montagnes[1]), HOR = Math.round(H * .952), T2 = Math.PI * 2;
  const s = (X, a, ph) => Math.sin(X / W * T2 * a + ph), px = (X, Y, col) => { const k = (Y * W + ((X % W) + W) % W) * 4; d[k] = col[0] * 255; d[k + 1] = col[1] * 255; d[k + 2] = col[2] * 255; d[k + 3] = 255; };
  for (let X = 0; X < W; X++) { const loin = 16 + 34 * (.5 + .5 * (s(X, 3, 1) * .5 + s(X, 7, 2.2) * .3 + s(X, 15, .4) * .2)), presM = 6 + 14 * (.5 + .5 * (s(X, 5, 3) * .55 + s(X, 11, 1.3) * .3 + s(X, 23, 2) * .15));
    for (let Y = 0; Y < H; Y++) { const e = HOR - Y; let col;
      if (e < 0) col = bas; else if (e < presM) col = m2; else if (e < loin) col = e > loin - 5 && loin > 40 ? [.96, .98, 1] : m1;
      else { const u = Math.pow(clamp(e / (HOR * .8), 0, 1), .7); col = melange(bas, haut, Math.round(u * 12) / 12); }
      px(X, Y, col); } }
  const R = hasard(4), blanc = [1, 1, 1], gris = [.8, .87, .95];
  for (let k = 0; k < 30; k++) { const cx0 = R() * W, base = HOR - 70 - R() * 230, n = 3 + Math.floor(R() * 4), lobes = []; let lx = 0;
    for (let j = 0; j < n; j++) { const r = 9 + R() * 16; lobes.push([lx, r, r * (.55 + R() * .3)]); lx += r * (.9 + R() * .5); }
    for (let X = -30; X < lx + 30; X++) for (let Y = -34; Y <= 0; Y++) { let dans = false; for (const [ox, rx, ry] of lobes) if ((X - ox) ** 2 / (rx * rx) + (Y * Y) / (ry * ry) < 1) { dans = true; break; }
      if (dans) px(Math.round(cx0 + X), Math.round(base + Y), Y > -3 ? gris : blanc); } }
  x.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  const RAYON = 1700, HC = 1800, m = new THREE.Mesh(new THREE.CylinderGeometry(RAYON, RAYON, HC, 64, 1, true), new THREE.MeshBasicMaterial({map: t, side: THREE.BackSide, fog: false, depthWrite: false}));
  m.frustumCulled = false; const sc = new THREE.Scene(); sc.add(m); renderer.setClearColor(new THREE.Color(...haut)); return {m, y: HC / 2 - HC * .048, scene: sc, cam: new THREE.PerspectiveCamera(52, 1.6, 10, 4000)}; })();

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
  HAUT = hauteurVoulue(); const asp = clamp(innerWidth / Math.max(1, innerHeight), .6, 2.6), H = HAUT, W = Math.round(H * asp);
  renderer.setSize(W, H, false); camera.aspect = asp; camera.updateProjectionMatrix();
  if (CONTOUR) { if (cible) { cible.depthTexture.dispose(); cible.dispose(); }
    cible = new THREE.WebGLRenderTarget(W, H, {minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter});
    cible.depthTexture = new THREE.DepthTexture(W, H); cible.depthTexture.type = THREE.UnsignedIntType;
    POST.mat.uniforms.tC.value = cible.texture; POST.mat.uniforms.tD.value = cible.depthTexture; POST.mat.uniforms.uPx.value.set(1 / W, 1 / H); }
}
addEventListener("resize", tailleEcran); tailleEcran();
function dessiner() {  // d'abord le ciel (sa propre caméra, qui ne fait que tourner), puis le monde par-dessus
  renderer.info.reset(); renderer.autoClear = false;
  CIEL.cam.quaternion.copy(camera.quaternion); CIEL.cam.fov = camera.fov; CIEL.cam.aspect = camera.aspect; CIEL.cam.updateProjectionMatrix(); CIEL.m.position.y = CIEL.y - camera.position.y;
  renderer.setRenderTarget(CONTOUR ? cible : null); renderer.clear(); if (CIEL.m.visible) renderer.render(CIEL.scene, CIEL.cam); renderer.clearDepth(); renderer.render(scene, camera);
  if (CONTOUR) { renderer.setRenderTarget(null); renderer.clear(); renderer.render(POST.scene, POST.cam); }
}
