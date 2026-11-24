/* ============ les effets du rendu : le vent dans les feuillages, les ombres portées (étape 9 du plan, 15/11) ============ */
// Deux effets qui passent par les matériaux de tout le monde ; ce fichier leur donne les mêmes bouts de shader et les mêmes réglages.
// (Les deux autres effets vivent chez eux : l'eau qui coule dans surfaces.js, les forêts en masse dans decor.js.)
// Chacun s'éteint : depart.js (EFFETS). Éteint, il n'ajoute pas une ligne aux shaders : le rendu est exactement celui d'avant.
//
// LE VENT. Une recette d'objet dit ce qui plie : F.vent(force, y0, y1) avant ses feuillages (forme.js). Chaque sommet porte alors
//   aVent = (de combien il bouge au plus, en mètres ; la phase de son objet). Les rafales traversent le monde dans le sens du vent
//   (VENT_DIR) ; leur force suit le temps qu'il fait (ambiance.js). Le temps du vent avance par crans de 1/10 s : le feuillage
//   bouge comme un sprite animé, sans faire fourmiller les pixels, et les ombres ne sont redessinées que 10 fois par seconde.
// LES OMBRES. Le soleil « photographie » le monde autour de la caméra (une carte de profondeur de 160 m de côté) ; chaque matériau
//   y lit si son point est caché du soleil. Deux tons, bord net (quatre lectures mélangées puis tranchées : pas d'escalier),
//   seulement près de la caméra. Elles suivent l'heure, s'effacent la nuit, sous un ciel couvert et sous la pluie.
//   Les grottes n'en reçoivent pas (MAT_ABRI, aAbri sur la piste) : elles gardent leur lumière (Kiki : jamais de tunnel sombre).
//   La monture ne porte pas d'ombre ici (elle bouge à chaque image) : elle garde la sienne, dessinée sur le sol.

const VENT_U = {uVt: {value: 0}, uVf: {value: 0}, uVd: {value: new THREE.Vector2(VENT_DIR[0], VENT_DIR[1])}};
const VENT_VS = EFFETS.vent ? "attribute vec2 aVent; uniform float uVt, uVf; uniform vec2 uVd;" : "";
// (w : la position du sommet dans le monde ; un feuillage penche sous le vent et bat autour de cette pente)
const VENT_VS_MAIN = EFFETS.vent ? `if (aVent.x > 0.) { float b = .42 + .5 * sin(uVt * 1.15 - aVent.y) + .26 * sin(uVt * 2.9 - aVent.y * 1.9 + 1.3);
      w.xz += uVd * (aVent.x * uVf * b); w.y -= aVent.x * uVf * abs(b) * .12; }` : "";

const OMBRES = {actif: EFFETS.ombres, coupe: false, taille: 2048, demi: 80, pas: 128, loin: [52, 74], cam: null, cible: null, mat: null, cle: "", force: 0, images: 0};
const PORTEE_U = {tOmbre: {value: null}, uOmbreM: {value: new THREE.Matrix4()}, uOmbreP: {value: new THREE.Vector4(0, 1 / 2048, 52, 74)}, uOmbreL: {value: new THREE.Vector3(0, 1, 0)}};
/* dans un shader de fragment : ombreEn(point du monde, sa normale, sa distance à la caméra) → 1 à l'ombre, 0 au soleil */
const PORTEE_FS = EFFETS.ombres ? `uniform sampler2D tOmbre; uniform mat4 uOmbreM; uniform vec4 uOmbreP; uniform vec3 uOmbreL;
  float ombreEn(vec3 w, vec3 n, float z) {
    if (uOmbreP.x <= 0. || z > uOmbreP.w) return 0.;
    vec4 q = uOmbreM * vec4(w + n * .16 + uOmbreL * .1, 1.);   // on regarde un peu au-dessus de la surface : elle ne se fait pas d'ombre à elle-même
    if (q.x < .002 || q.x > .998 || q.y < .002 || q.y > .998 || q.z > 1.) return 0.;
    // (24/11, Kiki : « des bords en dents de scie ») seize lectures (4 × 4 points de carte, pondérées en douceur) au lieu de quatre : le bord d'une ombre rasante suit une ligne
    // lisse au lieu de monter en escalier d'un point à l'autre ; puis il est resserré : deux tons, un bord net d'un ou deux pixels. (rendu plus réaliste : trois fois plus large, flou)
    float e = uOmbreP.y${REEL.lumiere ? " * 2." : ""}, d = q.z - .0004; vec2 t = q.xy / e - .5, f = fract(t), b = (floor(t) + .5) * e;
    vec4 wx = vec4((1. - f.x) * (1. - f.x), 2. + 2. * f.x - 2. * f.x * f.x, 1. + 2. * f.x, f.x * f.x), wy = vec4((1. - f.y) * (1. - f.y), 2. + 2. * f.y - 2. * f.y * f.y, 1. + 2. * f.y, f.y * f.y);
    wx.y = 2. - f.x * f.x; wx.z = 1. + 2. * f.x - f.x * f.x; wy.y = 2. - f.y * f.y; wy.z = 1. + 2. * f.y - f.y * f.y; float s = 0.;
    for (int j = 0; j < 4; j++) { float y = float(j) - 1., wj = j == 0 ? wy.x : j == 1 ? wy.y : j == 2 ? wy.z : wy.w;
      vec4 l = vec4(texture2D(tOmbre, b + vec2(-e, y * e)).x, texture2D(tOmbre, b + vec2(0., y * e)).x, texture2D(tOmbre, b + vec2(e, y * e)).x, texture2D(tOmbre, b + vec2(2. * e, y * e)).x);
      s += wj * dot(wx, step(l, vec4(d))); }
    s /= dot(wx, vec4(1.)) * dot(wy, vec4(1.));
    return ${REEL.lumiere ? "s" : "smoothstep(.38, .62, s)"} * uOmbreP.x * (1. - smoothstep(uOmbreP.z, uOmbreP.w, z)); }` : "";

const OMBRES_PORTENT = ["terrain", "rives", "decor", "foret", "ponts", "cratere"];
function ombrePour(m) { if (!EFFETS.ombres) return; if (OMBRES_PORTENT.includes(m.name)) m.layers.enable(1); OMBRES.cle = ""; }   // une maille arrivée après coup (un tronçon : troncons.js) : elle porte son ombre, la carte est à refaire
function construireOmbres() {   // une fois le monde construit : qui porte une ombre, et la carte
  if (!EFFETS.ombres) return;
  const O = OMBRES;
  scene.traverse(m => { if (m.isMesh && OMBRES_PORTENT.includes(m.name)) m.layers.enable(1); });
  O.cible = new THREE.WebGLRenderTarget(O.taille, O.taille, {minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, stencilBuffer: false});
  O.cible.depthTexture = new THREE.DepthTexture(O.taille, O.taille); O.cible.depthTexture.type = THREE.UnsignedIntType;
  O.cam = new THREE.OrthographicCamera(-O.demi, O.demi, O.demi, -O.demi, 1, 700); O.cam.layers.set(1);
  O.mat = new THREE.ShaderMaterial({uniforms: VENT_U, side: THREE.DoubleSide, colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1.2, polygonOffsetUnits: 2,
    vertexShader: VENT_VS + " void main() { vec4 w = modelMatrix * vec4(position, 1.); " + VENT_VS_MAIN + " gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: "void main() { gl_FragColor = vec4(1.); }"});
  PORTEE_U.tOmbre.value = O.cible.depthTexture; PORTEE_U.uOmbreP.value.set(0, 1 / O.taille, O.loin[0], O.loin[1]);
}
const _oc = new THREE.Vector3(), _od = new THREE.Vector3(), _ox = new THREE.Vector3(), _oy = new THREE.Vector3(), _om = new THREE.Matrix4();
/* chaque image, avant de dessiner : la force du vent et des ombres, et, seulement s'il le faut, la carte des ombres refaite
   (la caméra a avancé d'un cran de 10 m, le soleil a tourné, ou le vent a bougé les feuillages : 10 fois par seconde au plus) */
function effetsMaj(t, meteo, nuit) {
  if (EFFETS.vent) { VENT_U.uVt.value = Math.floor(t * 10) / 10; VENT_U.uVf.value = .5 + 1.5 * clamp(meteo.vent, 0, 1); }
  const O = OMBRES; if (!O.cible) return;
  O.force = O.coupe ? 0 : clamp(1 - nuit * 1.5, 0, 1) * clamp(1 - meteo.couvert * 1.15, 0, 1) * clamp(1 - meteo.pluie * 2, 0, 1) * clamp(1 - meteo.brume * 1.3, 0, 1);
  PORTEE_U.uOmbreP.value.x = O.force; if (O.force <= .01) { O.cle = ""; return; }
  // la boîte : devant la caméra, à plat ; elle n'avance que par crans entiers de points de la carte (les bords d'ombre ne tremblent pas)
  const L = PORTEE_U.uOmbreL.value.copy(SOLEIL).normalize(), tx = 2 * O.demi / O.taille, cran = O.pas * tx;
  camera.getWorldDirection(_od); _od.y = 0; if (_od.lengthSq() < 1e-6) _od.set(0, 0, -1); _od.normalize();
  _oc.copy(camera.position).addScaledVector(_od, 34); _oc.y = camera.position.y - 2;
  O.cam.position.copy(_oc).addScaledVector(L, 350); O.cam.up.set(0, 1, 0); O.cam.lookAt(_oc); O.cam.updateMatrixWorld();
  _ox.setFromMatrixColumn(O.cam.matrixWorld, 0); _oy.setFromMatrixColumn(O.cam.matrixWorld, 1);
  const cx = _oc.dot(_ox), cy = _oc.dot(_oy), sx = Math.round(cx / cran) * cran, sy = Math.round(cy / cran) * cran;
  _oc.addScaledVector(_ox, sx - cx).addScaledVector(_oy, sy - cy);
  O.cam.position.copy(_oc).addScaledVector(L, 350); O.cam.lookAt(_oc); O.cam.updateMatrixWorld(); O.cam.matrixWorldInverse.copy(O.cam.matrixWorld).invert();
  const cle = Math.round(sx / cran) + "," + Math.round(sy / cran) + "," + Math.round(_oc.dot(L) / 40) + "/" + Math.round(L.x * 500) + "," + Math.round(L.y * 500) + "," + Math.round(L.z * 500) + "/" + (EFFETS.vent ? (NIVEAU.files ? Math.floor(VENT_U.uVt.value * 5) : VENT_U.uVt.value) + "," + VENT_U.uVf.value.toFixed(2) : "");
  if (cle === O.cle) return;
  O.cle = cle; O.images++;
  PORTEE_U.uOmbreM.value.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1).multiply(_om.multiplyMatrices(O.cam.projectionMatrix, O.cam.matrixWorldInverse));
  const avant = renderer.getRenderTarget();
  renderer.setRenderTarget(O.cible); renderer.clear(); scene.overrideMaterial = O.mat; renderer.render(scene, O.cam); scene.overrideMaterial = null; renderer.setRenderTarget(avant);
}
/* la machine peine : on coupe les ombres (jeu.js : le premier cran de la qualité) ; elle respire : on les remet */
function couperOmbres(oui) { OMBRES.coupe = !!oui; OMBRES.cle = ""; }
