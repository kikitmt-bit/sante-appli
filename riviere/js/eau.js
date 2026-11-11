/* ============ l'eau : deux bleus en taches, des reflets, l'écume des rives, le sillage et les ronds de chaque coup ============ */
// La rivière est un ruban qui connaît sa position le long de la piste (pour l'écume des bords et le sillage) ; la mer, un grand plan.
const EAU_U = Object.assign({uC1: {value: new THREE.Vector3(...hex(BIOME.eau.c1))}, uC2: {value: new THREE.Vector3(...hex(BIOME.eau.c2))}, uClair: {value: new THREE.Vector3(...hex(BIOME.eau.clair))},
  uReflet: {value: new THREE.Vector3(...hex(BIOME.eau.reflet))}, uEcume: {value: new THREE.Vector3(...hex(BIOME.eau.ecume))}, uNag: {value: new THREE.Vector4(-999, 0, 0, 0)},
  uCoups: {value: [0, 1, 2, 3].map(() => new THREE.Vector3(-999, 0, -99))}, uLong: {value: BOUCLE ? LONG : 0}}, COMMUNS);
const EAU_VS = `
  #ifndef MER
  attribute vec2 aSU; attribute float aBord; attribute vec2 aEc;
  #endif
  varying vec3 vW; varying float vZ, vBord; varying vec2 vSU, vEc;
  void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vec4 mv = viewMatrix * w; vZ = -mv.z;
  #ifdef MER
    vSU = vec2(-9999., 0.); vBord = 99.; vEc = vec2(0.);
  #else
    vSU = aSU; vBord = aBord; vEc = aEc;
  #endif
    gl_Position = projectionMatrix * mv; }`;
const EAU_FS = `uniform float uT, uB0, uB1, uSombre; uniform vec3 uC1, uC2, uClair, uReflet, uEcume, uBrume; uniform vec4 uNag; uniform vec3 uCoups[4]; uniform float uLong;
  varying vec3 vW; varying float vZ, vBord; varying vec2 vSU, vEc;
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float lelong(float a, float b) { float d = a - b; return uLong > 0. ? mod(d + uLong * .5, uLong) - uLong * .5 : d; }   // de b à a le long de la piste (une boucle se referme)
  void main() { vec2 p = vW.xz; float prox = 1. - smoothstep(45., 150., vZ);
    vec2 q = floor(p * 4.) / 4.;
    float n = sin(q.x * .42 + uT * .35) + sin(q.y * .57 - uT * .5 + sin(q.x * .23) * 1.8) + sin((q.x + q.y) * .31 + uT * .2);
    vec3 c = mix(uC1, uC2, step(.35, n) * prox);
    vec2 g = vec2(p.x / 1.5, p.y / .42); float rang = floor(g.y); g.x += h21(vec2(rang, 3.)) * 7. + uT * .22 * (mod(rang, 2.) - .5);
    vec2 cel = floor(g), f = fract(g);
    if (h21(cel + floor(uT * .9 + h21(cel) * 5.) * .013) > .9 && f.x > .1 && f.x < .55 + .3 * h21(cel + 7.) && f.y < .55) c = mix(c, uReflet, prox);
    float ec = vSU.y < 0. ? vEc.x : vEc.y;
    if (ec > .5) { c = mix(c, uClair, .5 * (1. - smoothstep(0., 2.6, vBord)));
      float o = sin(vSU.x * 1.3 + uT * 1.6) * .1 + sin(vSU.x * .37 - uT) * .08;
      if (vBord < .3 + o) c = uEcume; else if (vBord > .8 + o && vBord < .98 + o && h21(vec2(floor(vSU.x / .9), 1.)) > .35) c = mix(c, uEcume, .8); }
    float ds = lelong(uNag.x, vSU.x), du = vSU.y - uNag.y, vit = uNag.z;
    if (ds > -.9 && ds < 26.) { vec2 k = floor(vec2(vSU.x * 5., vSU.y * 5.)); float a = (1. - ds / 26.) * vit;
      if (ds > .3 && ds < 16. && abs(abs(du) - (.4 + ds * .3)) < .06 + ds * .006 && h21(floor(vec2(vSU.x * 2.5, vSU.y * 6.)) + floor(uT * 5.)) < (1. - ds / 16.) * (.2 + vit) * .75) c = mix(c, uEcume, .9);                       // les deux bras du sillage
      if (ds > .2 && ds < 7. && abs(du) < .28 + ds * .05 && h21(floor(vec2(vSU.x * 3., vSU.y * 6.)) * 1.7 + floor(uT * 7.)) < .34 * (1. - ds / 7.) * (.2 + vit)) c = mix(c, uEcume, .85);   // l'eau brassée, juste derrière
      float col = length(vec2(du, ds * 1.1 + .1) / vec2(.86, .62)); if (uNag.w < .5 && col < 1. && col > .7 + .12 * sin(uT * 7. + du * 6.)) c = uEcume; }     // le col d'écume autour du corps
    for (int i = 0; i < 4; i++) { float age = uT - uCoups[i].z; if (age < 0. || age > 1.6) continue;
      float d = length(vec2(vSU.y - uCoups[i].y, lelong(vSU.x, uCoups[i].x))), r = .5 + age * 1.9;
      if (abs(d - r) < .08 + .03 * age && h21(floor(vec2(vSU.x * 5., vSU.y * 5.))) > age / 1.6) c = mix(c, uEcume, .9); }
    c = mix(c, uBrume, smoothstep(uB0, uB1, vZ) * .94);
    gl_FragColor = vec4(c * uSombre, 1.); }`;
const MAT_EAU = new THREE.ShaderMaterial({uniforms: EAU_U, vertexShader: EAU_VS, fragmentShader: EAU_FS});
const MAT_MER = new THREE.ShaderMaterial({uniforms: EAU_U, vertexShader: EAU_VS, fragmentShader: EAU_FS, defines: {MER: 1}});

function construireEau() {
  const P = PISTE;
  for (let c0 = 0; c0 < LONG; c0 += 40) { const pos = [], su = [], bord = [], ec = [], idx = [], fin = Math.min(c0 + 40, LONG);
    for (let i = c0; i <= fin; i++) { const a = at(i), w = a.w, rx = Math.cos(a.h), rz = Math.sin(a.h), ii = BOUCLE ? i % P.N : i, eg = hVraie(ii, 0, .02, a.x - rx * w, a.z - rz * w) > .02 ? 1 : 0, ed = hVraie(ii, 1, .02, a.x + rx * w, a.z + rz * w) > .02 ? 1 : 0;
      for (const u of [-(w + .6), -w, -w / 2, 0, w / 2, w, w + .6]) { pos.push(a.x + rx * u, 0, a.z + rz * u); su.push(i, u); bord.push(w - Math.abs(u)); ec.push(eg, ed); } }
    for (let i = 0; i < fin - c0; i++) for (let j = 0; j < 6; j++) { const a = i * 7 + j, b = a + 7; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("aSU", new THREE.Float32BufferAttribute(su, 2)); g.setAttribute("aBord", new THREE.Float32BufferAttribute(bord, 1)); g.setAttribute("aEc", new THREE.Float32BufferAttribute(ec, 2)); g.setIndex(idx);
    const m = new THREE.Mesh(g, MAT_EAU); MAT_EAU.side = THREE.DoubleSide; scene.add(m); }
  const mer = new THREE.Mesh(new THREE.PlaneGeometry(7000, 7000), MAT_MER); mer.rotation.x = -Math.PI / 2; mer.position.set(P.X[P.N >> 1], -.15, P.Z[P.N >> 1]); MAT_MER.side = THREE.DoubleSide; scene.add(mer);
}
