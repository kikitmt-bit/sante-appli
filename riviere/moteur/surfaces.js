/* ============ les surfaces : ce sur quoi on avance (l'eau, la terre, le goudron…) et les ponts ============ */
// La piste est un ruban qui connaît sa position le long du parcours (aSU : le mètre, l'écart au milieu), la distance à son bord
// et sa pente. Chaque surface a son matériau (contenu/surfaces) ; une pièce du niveau choisit la sienne ("surface": "terre").
// Ajouter une surface = ajouter une entrée à SURFACES : {materiau, liquide, monture, poussiere, bruit}.
const SURFACES = {};
const PISTE_VS = `
  #ifndef MER
  attribute vec2 aSU; attribute float aBord; attribute vec2 aEc; attribute float aPente;
  #endif
  varying vec3 vW; varying float vZ, vBord, vPente; varying vec2 vSU, vEc;
  void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vec4 mv = viewMatrix * w; vZ = -mv.z;
  #ifdef MER
    vSU = vec2(-9999., 0.); vBord = 99.; vEc = vec2(0.); vPente = 0.;
  #else
    vSU = aSU; vBord = aBord; vEc = aEc; vPente = aPente;
  #endif
    gl_Position = projectionMatrix * mv; }`;

/* ---- l'eau : deux bleus en taches, des reflets, l'écume des rives, le sillage, les ronds de chaque coup, l'écume des rapides et des chutes ---- */
const EAU_U = Object.assign({uC1: {value: new THREE.Vector3(...hex(BIOME.eau.c1))}, uC2: {value: new THREE.Vector3(...hex(BIOME.eau.c2))}, uClair: {value: new THREE.Vector3(...hex(BIOME.eau.clair))},
  uReflet: {value: new THREE.Vector3(...hex(BIOME.eau.reflet))}, uEcume: {value: new THREE.Vector3(...hex(BIOME.eau.ecume))}, uNag: {value: new THREE.Vector4(-999, 0, 0, 0)},
  uCoups: {value: [0, 1, 2, 3].map(() => new THREE.Vector3(-999, 0, -99))}, uLong: {value: BOUCLE ? LONG : 0}}, COMMUNS);
const EAU_FS = `uniform float uT, uB0, uB1, uSombre; uniform vec3 uC1, uC2, uClair, uReflet, uEcume, uBrume, uTeinte; uniform vec4 uNag; uniform vec3 uCoups[4]; uniform float uLong;
  varying vec3 vW; varying float vZ, vBord, vPente; varying vec2 vSU, vEc;
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float lelong(float a, float b) { float d = a - b; return uLong > 0. ? mod(d + uLong * .5, uLong) - uLong * .5 : d; }   // de b à a le long de la piste (une boucle se referme)
  void main() { vec2 p = vW.xz; float prox = 1. - smoothstep(45., 150., vZ);
    vec2 q = floor(p * 4.) / 4.;
    float n = sin(q.x * .42 + uT * .35) + sin(q.y * .57 - uT * .5 + sin(q.x * .23) * 1.8) + sin((q.x + q.y) * .31 + uT * .2);
    vec3 c = mix(uC1, uC2, step(.35, n) * prox);
    vec2 g = vec2(p.x / 1.5, p.y / .42); float rang = floor(g.y); g.x += h21(vec2(rang, 3.)) * 7. + uT * .22 * (mod(rang, 2.) - .5);
    vec2 cel = floor(g), f = fract(g);
    if (h21(cel + floor(uT * .9 + h21(cel) * 5.) * .013) > .9 && f.x > .1 && f.x < .55 + .3 * h21(cel + 7.) && f.y < .55) c = mix(c, uReflet, prox);
    float raide = abs(vPente), rap = smoothstep(.02, .11, raide);
    if (rap > 0.) { float sens = vPente < 0. ? 1. : -1.;   // l'eau qui dévale : des traits d'écume qui filent vers le bas de la pente
      vec2 r = vec2(vSU.x * .7 - sens * uT * 4.5, vSU.y * 1.7), k = floor(r);
      if (h21(k) < rap * .5 && fract(r.x) < .72 && fract(r.y) > .18) c = mix(c, uEcume, .85);
      float chute = smoothstep(.3, .7, raide);
      if (chute > 0.) { vec2 t = floor(vec2(vSU.y * 3.5, vSU.x * .6 - sens * uT * 9.)); c = mix(c, mix(uClair, uEcume, step(.4, h21(t))), chute); } }
    float ec = vSU.y < 0. ? vEc.x : vEc.y;
    if (ec > .5) { c = mix(c, uClair, .5 * (1. - smoothstep(0., 2.6, vBord)));
      float o = sin(vSU.x * 1.3 + uT * 1.6) * .1 + sin(vSU.x * .37 - uT) * .08;
      if (vBord < .3 + o) c = uEcume; else if (vBord > .8 + o && vBord < .98 + o && h21(vec2(floor(vSU.x / .9), 1.)) > .35) c = mix(c, uEcume, .8); }
    float ds = lelong(uNag.x, vSU.x), du = vSU.y - uNag.y, vit = uNag.z;
    if (ds > -.9 && ds < 26.) { float a = (1. - ds / 26.) * vit;
      if (ds > .3 && ds < 16. && abs(abs(du) - (.4 + ds * .3)) < .06 + ds * .006 && h21(floor(vec2(vSU.x * 2.5, vSU.y * 6.)) + floor(uT * 5.)) < (1. - ds / 16.) * (.2 + vit) * .75) c = mix(c, uEcume, .9);                       // les deux bras du sillage
      if (ds > .2 && ds < 7. && abs(du) < .28 + ds * .05 && h21(floor(vec2(vSU.x * 3., vSU.y * 6.)) * 1.7 + floor(uT * 7.)) < .34 * (1. - ds / 7.) * (.2 + vit)) c = mix(c, uEcume, .85);   // l'eau brassée, juste derrière
      float col = length(vec2(du, ds * 1.1 + .1) / vec2(.86, .62)); if (uNag.w < .5 && col < 1. && col > .7 + .12 * sin(uT * 7. + du * 6.)) c = uEcume; }     // le col d'écume autour du corps
    for (int i = 0; i < 4; i++) { float age = uT - uCoups[i].z; if (age < 0. || age > 1.6) continue;
      float d = length(vec2(vSU.y - uCoups[i].y, lelong(vSU.x, uCoups[i].x))), r = .5 + age * 1.9;
      if (abs(d - r) < .08 + .03 * age && h21(floor(vec2(vSU.x * 5., vSU.y * 5.))) > age / 1.6) c = mix(c, uEcume, .9); }
    c = mix(c, uBrume, smoothstep(uB0, uB1, vZ) * .94);
    gl_FragColor = vec4(c * uSombre * uTeinte, 1.); }`;
const MAT_EAU = new THREE.ShaderMaterial({uniforms: EAU_U, vertexShader: PISTE_VS, fragmentShader: EAU_FS, side: THREE.DoubleSide});
const MAT_MER = new THREE.ShaderMaterial({uniforms: EAU_U, vertexShader: PISTE_VS, fragmentShader: EAU_FS, defines: {MER: 1}, side: THREE.DoubleSide});
SURFACES.eau = {materiau: MAT_EAU, liquide: true, monture: "nageur"};

/* ---- la terre ferme : un chemin de terre ou une route (ligne au milieu, bordures rouges et blanches) ---- */
const ROUTE_FS = `uniform float uT, uB0, uB1, uSombre, uMode; uniform vec3 uC1, uC2, uBordC, uLigne, uBrume, uTeinte;
  varying vec3 vW; varying float vZ, vBord, vPente; varying vec2 vSU, vEc;
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() { vec2 p = vW.xz; float prox = 1. - smoothstep(45., 150., vZ);
    vec2 q = floor(p * 3.) / 3.;
    float n = sin(q.x * .9 + sin(q.y * .7) * 2.) * sin(q.y * 1.1 + q.x * .3);
    vec3 c = mix(uC1, uC2, step(.25, n) * prox);
    if (h21(floor(p * 3.)) > .94) c = mix(c, uC2 * .8, prox);                                       // des graviers
    float o = sin(vSU.x * .9) * .12;
    if (uMode > .5) {
      if (vBord < .7) c = mix(uLigne, vec3(.84, .22, .2), step(.5, fract(vSU.x / 3.)));             // les bordures
      else if (abs(vSU.y) < .1 && fract(vSU.x / 5.) < .5) c = uLigne;                                 // la ligne du milieu
    } else {
      if (vBord < .5 + o) c = uBordC;                                                                // l'accotement (plus d'ornières au milieu : Kiki, 11/11)
    }
    c = mix(c, uBrume, smoothstep(uB0, uB1, vZ) * .94);
    gl_FragColor = vec4(c * uSombre * uTeinte, 1.); }`;
function matRoute(c1, c2, bord, ligne, mode) {
  const v = h => ({value: new THREE.Vector3(...hex(h))});
  return new THREE.ShaderMaterial({uniforms: Object.assign({uC1: v(c1), uC2: v(c2), uBordC: v(bord), uLigne: v(ligne), uMode: {value: mode}}, COMMUNS), vertexShader: PISTE_VS, fragmentShader: ROUTE_FS, side: THREE.DoubleSide});
}
const TERRES = BIOME.terres || {};
SURFACES.terre = {materiau: matRoute(...(TERRES.terre || ["#D9B886", "#CBA672", "#B48C5C", "#FFFFFF"]), 0), liquide: false, monture: "coureur", poussiere: (TERRES.terre || ["#D9B886"])[0]};
SURFACES.goudron = {materiau: matRoute(...(TERRES.goudron || ["#6E7480", "#646A76", "#F8F8E8", "#F8F8E8"]), 1), liquide: false, monture: "coureur", poussiere: "#C8CCD4"};
const surface = s => SURFACES[surfaceEn(s)] || SURFACES.eau;

/* ---- le ruban de la piste, par tronçons de 40 m et par surface ; la mer, un grand plan ---- */
function construirePiste() {
  const P = PISTE, rubans = [];
  for (let c0 = 0; c0 < LONG; c0 += 40) {
    const fin = Math.min(c0 + 40, LONG); let debut = c0;
    for (let i = c0; i <= fin; i++) {   // un ruban par suite de mètres de même surface
      if (i < fin && P.SF[idx(i)] === P.SF[idx(debut)]) continue;
      if (i > debut) rubans.push([debut, i]);
      debut = i;
    }
  }
  for (const [a0, a1] of rubans) {
    const pos = [], su = [], bord = [], ec = [], pente = [], ind = [];
    for (let i = a0; i <= a1; i++) {
      const a = at(i), w = a.w, rx = Math.cos(a.h), rz = Math.sin(a.h), ii = idx(i), pont = P.PONT[ii], eg = pont || hRive(ii, 0, .02) > .02 ? 1 : 0, ed = pont || hRive(ii, 1, .02) > .02 ? 1 : 0;
      for (const u of [-(w + .6), -w, -w / 2, 0, w / 2, w, w + .6]) { pos.push(a.x + rx * u, a.y, a.z + rz * u); su.push(i, u); bord.push(w - Math.abs(u)); ec.push(eg, ed); pente.push(P.COULE[ii]); }
    }
    for (let i = 0; i < a1 - a0; i++) for (let j = 0; j < 6; j++) { const a = i * 7 + j, b = a + 7; ind.push(a, a + 1, b, a + 1, b + 1, b); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("aSU", new THREE.Float32BufferAttribute(su, 2)); g.setAttribute("aBord", new THREE.Float32BufferAttribute(bord, 1));
    g.setAttribute("aEc", new THREE.Float32BufferAttribute(ec, 2)); g.setAttribute("aPente", new THREE.Float32BufferAttribute(pente, 1)); g.setIndex(ind);
    const nom = P.surfaces[P.SF[idx(a0)]], m = new THREE.Mesh(g, (SURFACES[nom] || SURFACES.eau).materiau); m.name = "piste"; scene.add(m);
    if (!SURFACES[nom]) console.warn("Surface inconnue : " + nom);
  }
  const mer = new THREE.Mesh(new THREE.PlaneGeometry(7000, 7000), MAT_MER); mer.rotation.x = -Math.PI / 2; mer.position.set(P.X[P.N >> 1], -.15, P.Z[P.N >> 1]); mer.name = "mer"; scene.add(mer);
}

/* ---- les ponts : sous chaque suite de mètres « pont », un tablier de pierre, deux parapets, des piles jusqu'au sol ---- */
function construirePonts() {
  const P = PISTE, N = P.N, F = new Forme(), pierre = PAL.pierre, plages = [];
  let debut = -1;
  for (let i = 0; i <= N; i++) {
    const pont = i < N && P.PONT[i];
    if (pont && debut < 0) debut = i;
    if (!pont && debut >= 0) { plages.push([debut, i]); debut = -1; }
  }
  if (BOUCLE && plages.length > 1 && plages[0][0] === 0 && plages[plages.length - 1][1] === N) { plages[0][0] = plages.pop()[0] - N; }   // un pont à cheval sur la ligne
  for (const [ia, ib] of plages) {
    const sec = i => {   // la coupe du pont au mètre i : de gauche à droite, le contour du tablier et de ses parapets
      const a = at(i), rx = Math.cos(a.h), rz = Math.sin(a.h), w = a.w, e = w + .9, pt = (u, y) => [a.x + rx * u, a.y + y, a.z + rz * u];
      return {a, rx, rz, c: [pt(-e, -.9), pt(-e, .6), pt(-w - .05, .6), pt(-w - .05, -.1), pt(w + .05, -.1), pt(w + .05, .6), pt(e, .6), pt(e, -.9)]};
    };
    const tons = [pierre[1], pierre[2], pierre[0], null, pierre[0], pierre[2], pierre[1], pierre[0]];   // côté, dessus du parapet, dedans, (le fond : la piste le couvre), …, le dessous
    for (let i = ia - 1; i <= ib; i++) {
      const A = sec(i), B = sec(i + 1);
      for (let k = 0; k < 8; k++) {
        if (k === 3) continue;
        const k2 = (k + 1) % 8, V = [A.c[k], A.c[k2], B.c[k2], B.c[k]], dx = A.c[k2][0] - A.c[k][0], dy = A.c[k2][1] - A.c[k][1], dz = A.c[k2][2] - A.c[k][2];
        const nrmale = Math.abs(dy) > .01 ? [(k < 4 ? -1 : 1) * A.rx * (k === 2 || k === 4 ? -1 : 1), 0, (k < 4 ? -1 : 1) * A.rz * (k === 2 || k === 4 ? -1 : 1)] : [0, k === 7 ? -1 : 1, 0];
        for (const q of [0, 1, 2, 0, 2, 3]) F.v(V[q][0], V[q][1], V[q][2], nrmale[0], nrmale[1], nrmale[2], tons[k], k === 1 || k === 5 ? 1 : 0);
      }
    }
    for (const [i, sens] of [[ia - 1, -1], [ib + 1, 1]]) {   // les deux bouts fermés : les parapets et le tablier ne sont plus creux (11/11)
      const A = sec(i), c = A.c, nx = Math.sin(A.a.h) * sens, nz = -Math.cos(A.a.h) * sens;
      for (const [p, q, r, t] of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 3, 4, 7]]) for (const V of [[c[p], c[q], c[r]], [c[p], c[r], c[t]], [c[p], c[r], c[q]], [c[p], c[t], c[r]]]) for (const v of V) F.v(v[0], v[1], v[2], nx, 0, nz, pierre[1], 0);
    }
    for (let i = ia + 4; i < ib - 2; i += 9) {   // les piles : jamais dans la piste qui passe dessous
      const a = at(i), sol = hauteur(a.x, a.z); if (Q.e < 1.5 && !Q.bout) continue;
      const bas = Math.min(sol, a.y - 2) - .6, ht = a.y - .9 - bas; if (ht < .8) continue;
      F.poser(a.x, bas, a.z, -a.h, 1).boite(0, 0, 0, a.w * 2 + 1.2, ht, 1.7, pierre[1], {haut: pierre[2], mat: 0});
    }
  }
  F.poser(0, 0, 0, 0, 1);
  const m = F.maille(); if (m) { m.name = "ponts"; scene.add(m); }
  return plages;
}
