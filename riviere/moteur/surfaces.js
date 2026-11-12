/* ============ les surfaces : ce sur quoi on avance (l'eau, la terre, le goudron…) et les ponts ============ */
// La piste est un ruban qui connaît sa position le long du parcours (aSU : le mètre, l'écart au milieu), la distance à son bord
// et sa pente. Chaque surface a son matériau (contenu/surfaces) ; une pièce du niveau choisit la sienne ("surface": "terre").
// Ajouter une surface = ajouter une entrée à SURFACES : {materiau, liquide, monture, poussiere, bruit}.
const SURFACES = {};
const PISTE_VS = `
  #ifndef MER
  attribute vec2 aSU; attribute float aBord; attribute vec2 aEc; attribute float aPente;
  #endif
  #ifdef PARSOMMET
  attribute vec3 aC1, aC2, aCl, aRe, aEcu; attribute float aLuit; varying vec3 vC1, vC2, vCl, vRe, vEcu; varying float vLuit;
  #endif
  varying vec3 vW; varying float vZ, vBord, vPente; varying vec2 vSU, vEc;
  void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vec4 mv = viewMatrix * w; vZ = -mv.z;
  #ifdef PARSOMMET
    vC1 = aC1; vC2 = aC2; vCl = aCl; vRe = aRe; vEcu = aEcu; vLuit = aLuit;
  #endif
  #ifdef MER
    vSU = vec2(-9999., 0.); vBord = 99.; vEc = vec2(0.); vPente = 0.;
  #else
    vSU = aSU; vBord = aBord; vEc = aEc; vPente = aPente;
  #endif
    gl_Position = projectionMatrix * mv; }`;

/* ---- l'eau : deux bleus en taches, des reflets, l'écume des rives, le sillage, les ronds de chaque coup, l'écume des rapides et des chutes ---- */
const EAU_U = Object.assign({uC1: {value: new THREE.Vector3(...hex(BIOME.eau.c1))}, uC2: {value: new THREE.Vector3(...hex(BIOME.eau.c2))}, uClair: {value: new THREE.Vector3(...hex(BIOME.eau.clair))},
  uReflet: {value: new THREE.Vector3(...hex(BIOME.eau.reflet))}, uEcume: {value: new THREE.Vector3(...hex(BIOME.eau.ecume))}, uNag: {value: new THREE.Vector4(-999, 0, 0, 0)},
  uCoups: {value: [0, 1, 2, 3].map(() => new THREE.Vector3(-999, 0, -99))}, uLong: {value: BOUCLE ? LONG : 0}, uLuit: {value: 0}}, COMMUNS);
const EAU_FS = `uniform float uT, uB0, uB1, uSombre, uPluie, uLuit; uniform vec3 uC1, uC2, uClair, uReflet, uEcume, uBrume, uTeinte; uniform vec4 uNag; uniform vec3 uCoups[4]; uniform float uLong;
  varying vec3 vW; varying float vZ, vBord, vPente; varying vec2 vSU, vEc;
  #ifdef PARSOMMET
  varying vec3 vC1, vC2, vCl, vRe, vEcu; varying float vLuit;
  #endif
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float lelong(float a, float b) { float d = a - b; return uLong > 0. ? mod(d + uLong * .5, uLong) - uLong * .5 : d; }   // de b à a le long de la piste (une boucle se referme)
  void main() {
  #ifdef PARSOMMET
    vec3 C1 = vC1, C2 = vC2, CL = vCl, RE = vRe, EC = vEcu; float LU = vLuit;
  #else
    vec3 C1 = uC1, C2 = uC2, CL = uClair, RE = uReflet, EC = uEcume; float LU = uLuit;
  #endif
    vec2 p = vW.xz; float prox = 1. - smoothstep(45., 150., vZ);
    vec2 q = floor(p * 4.) / 4.;
    float n = sin(q.x * .42 + uT * .35) + sin(q.y * .57 - uT * .5 + sin(q.x * .23) * 1.8) + sin((q.x + q.y) * .31 + uT * .2);
    vec3 c = mix(C1, C2, step(.35, n) * prox);
    vec2 g = vec2(p.x / 1.5, p.y / .42); float rang = floor(g.y); g.x += h21(vec2(rang, 3.)) * 7. + uT * .22 * (mod(rang, 2.) - .5);
    vec2 cel = floor(g), f = fract(g);
    if (h21(cel + floor(uT * .9 + h21(cel) * 5.) * .013) > .9 && f.x > .1 && f.x < .55 + .3 * h21(cel + 7.) && f.y < .55) c = mix(c, RE, prox);
    float raide = abs(vPente), rap = smoothstep(.02, .11, raide);
    if (rap > 0.) { float sens = vPente < 0. ? 1. : -1.;   // l'eau qui dévale : des traits d'écume qui filent vers le bas de la pente
      vec2 r = vec2(vSU.x * .7 - sens * uT * 4.5, vSU.y * 1.7), k = floor(r);
      if (h21(k) < rap * .5 && fract(r.x) < .72 && fract(r.y) > .18) c = mix(c, EC, .85);
      float chute = smoothstep(.3, .7, raide);
      if (chute > 0.) { vec2 t = floor(vec2(vSU.y * 3.5, vSU.x * .6 - sens * uT * 9.)); c = mix(c, mix(CL, EC, step(.4, h21(t))), chute); } }
    float ec = vSU.y < 0. ? vEc.x : vEc.y;
    if (ec > .5) { c = mix(c, CL, .5 * (1. - smoothstep(0., 2.6, vBord)));
      float o = sin(vSU.x * 1.3 + uT * 1.6) * .1 + sin(vSU.x * .37 - uT) * .08;
      if (vBord < .3 + o) c = EC; else if (vBord > .8 + o && vBord < .98 + o && h21(vec2(floor(vSU.x / .9), 1.)) > .35) c = mix(c, EC, .8); }
    float ds = lelong(uNag.x, vSU.x), du = vSU.y - uNag.y, vit = uNag.z;
    if (ds > -.9 && ds < 26.) { float a = (1. - ds / 26.) * vit;
      if (ds > .3 && ds < 16. && abs(abs(du) - (.4 + ds * .3)) < .06 + ds * .006 && h21(floor(vec2(vSU.x * 2.5, vSU.y * 6.)) + floor(uT * 5.)) < (1. - ds / 16.) * (.2 + vit) * .75) c = mix(c, EC, .9);                       // les deux bras du sillage
      if (ds > .2 && ds < 7. && abs(du) < .28 + ds * .05 && h21(floor(vec2(vSU.x * 3., vSU.y * 6.)) * 1.7 + floor(uT * 7.)) < .34 * (1. - ds / 7.) * (.2 + vit)) c = mix(c, EC, .85);   // l'eau brassée, juste derrière
      float col = length(vec2(du, ds * 1.1 + .1) / vec2(.86, .62)); if (uNag.w < .5 && col < 1. && col > .7 + .12 * sin(uT * 7. + du * 6.)) c = EC; }     // le col d'écume autour du corps
    for (int i = 0; i < 4; i++) { float age = uT - uCoups[i].z; if (age < 0. || age > 1.6) continue;
      float d = length(vec2(vSU.y - uCoups[i].y, lelong(vSU.x, uCoups[i].x))), r = .5 + age * 1.9;
      if (abs(d - r) < .08 + .03 * age && h21(floor(vec2(vSU.x * 5., vSU.y * 5.))) > age / 1.6) c = mix(c, EC, .9); }
    if (uPluie > 0. && prox > 0.) { vec2 cel = floor(p / 1.4); float ph = fract(uT * 1.5 + h21(cel) * 7.), tir = floor(uT * 1.5 + h21(cel) * 7.);   // la pluie : un petit rond dans chaque case, de temps en temps
      vec2 o = (cel + .5 + (vec2(h21(cel + tir), h21(cel - tir)) - .5) * .6) * 1.4;
      if (h21(cel * 1.3 + tir) < uPluie * .75 && abs(length(p - o) - ph * .5) < .07) c = mix(c, EC, .7 * (1. - ph) * prox); }
    c *= mix(uSombre * uTeinte, vec3(1.), LU);   // une eau qui luit (une source dans une grotte) ne s'assombrit pas
    gl_FragColor = vec4(mix(c, uBrume, smoothstep(uB0, uB1, vZ) * .94 * (1. - .5 * LU)), 1.); }`;
const MAT_EAU = new THREE.ShaderMaterial({uniforms: EAU_U, vertexShader: PISTE_VS, fragmentShader: EAU_FS, side: THREE.DoubleSide});
const MAT_MER = new THREE.ShaderMaterial({uniforms: EAU_U, vertexShader: PISTE_VS, fragmentShader: EAU_FS, defines: {MER: 1}, side: THREE.DoubleSide});
// la piste d'eau porte ses couleurs sommet par sommet : d'une eau à l'autre (rivière, marais, lagon…), elles se fondent sur ~100 m (couleursEau)
const MAT_EAUX = new THREE.ShaderMaterial({uniforms: EAU_U, vertexShader: PISTE_VS, fragmentShader: EAU_FS, defines: {PARSOMMET: 1}, side: THREE.DoubleSide});
SURFACES.eau = {materiau: MAT_EAU, liquide: true, monture: "nageur"};
/* les autres eaux de la région ("eaux" : un marais vert, une source qui luit dans une grotte, une eau de lagon…) : la même eau, d'autres couleurs.
   Une pièce du niveau la choisit comme une surface : "surface": "marais". */
for (const [nom, e] of Object.entries(BIOME.eaux || {})) {
  const v = (h, d) => ({value: new THREE.Vector3(...hex(h || d))}), E = BIOME.eau;
  const U = Object.assign({}, EAU_U, {uC1: v(e.c1, E.c1), uC2: v(e.c2, E.c2), uClair: v(e.clair, E.clair), uReflet: v(e.reflet, E.reflet), uEcume: v(e.ecume, E.ecume), uLuit: {value: e.luit || 0}});
  SURFACES[nom] = {materiau: new THREE.ShaderMaterial({uniforms: U, vertexShader: PISTE_VS, fragmentShader: EAU_FS, side: THREE.DoubleSide}), liquide: true, monture: "nageur", eau: true};
}

/* ---- la terre ferme : un chemin de terre ou une route (ligne au milieu, bordures rouges et blanches) ---- */
const ROUTE_FS = `uniform float uT, uB0, uB1, uSombre, uMode, uPluie; uniform vec3 uC1, uC2, uBordC, uLigne, uBrume, uTeinte;
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
    c *= 1. - .16 * uPluie;                                                                           // mouillée, elle fonce
    gl_FragColor = vec4(mix(c * uSombre * uTeinte, uBrume, smoothstep(uB0, uB1, vZ) * .94), 1.); }`;
function matRoute(c1, c2, bord, ligne, mode) {
  const v = h => ({value: new THREE.Vector3(...hex(h))});
  return new THREE.ShaderMaterial({uniforms: Object.assign({uC1: v(c1), uC2: v(c2), uBordC: v(bord), uLigne: v(ligne), uMode: {value: mode}}, COMMUNS), vertexShader: PISTE_VS, fragmentShader: ROUTE_FS, side: THREE.DoubleSide});
}
const TERRES = BIOME.terres || {};
SURFACES.terre = {materiau: matRoute(...(TERRES.terre || ["#D9B886", "#CBA672", "#B48C5C", "#FFFFFF"]), 0), liquide: false, monture: "coureur", poussiere: (TERRES.terre || ["#D9B886"])[0]};
SURFACES.goudron = {materiau: matRoute(...(TERRES.goudron || ["#6E7480", "#646A76", "#F8F8E8", "#F8F8E8"]), 1), liquide: false, monture: "coureur", poussiere: "#C8CCD4"};
const surface = s => SURFACES[surfaceEn(s)] || SURFACES.eau;

/* les couleurs de l'eau, mètre par mètre : celles de l'eau de chaque mètre, puis lissées le long de la piste (trois passes de ±30 m) :
   on passe d'une eau à l'autre sans jamais voir de trait (Kiki, 12/11 : « on ne doit pas s'en rendre compte du tout ») */
function couleursEau() {
  const P = PISTE, N = P.N, E = BIOME.eau, n = 16, pal = nom => { const e = (BIOME.eaux || {})[nom] || {}; return [...hex(e.c1 || E.c1), ...hex(e.c2 || E.c2), ...hex(e.clair || E.clair), ...hex(e.reflet || E.reflet), ...hex(e.ecume || E.ecume), e.luit || 0]; };
  const memo = {}; let T = new Float32Array(N * n);
  for (let i = 0; i < N; i++) { const nom = P.surfaces[P.SF[i]]; T.set(memo[nom] || (memo[nom] = pal(nom)), i * n); }
  const R = 30, at2 = k => BOUCLE ? ((k % N) + N) % N : clamp(k, 0, N - 1);
  for (let passe = 0; passe < 3; passe++) { const O = new Float32Array(N * n), som = new Float64Array(n);
    for (let k = -R; k <= R; k++) for (let c = 0; c < n; c++) som[c] += T[at2(k) * n + c];
    for (let i = 0; i < N; i++) { for (let c = 0; c < n; c++) O[i * n + c] = som[c] / (2 * R + 1);
      const sort = at2(i - R), entre = at2(i + R + 1); for (let c = 0; c < n; c++) som[c] += T[entre * n + c] - T[sort * n + c]; }
    T = O; }
  // là où les rives s'ouvrent sur une eau libre (un lac, la mer : rive sous l'eau), la piste prend exactement l'eau du large (MAT_MER) : aucune limite entre les deux
  const base = pal("eau"), ouv = new Float32Array(N);
  for (let i = 0; i < N; i++) ouv[i] = Math.max(lisse(-.2, -1, hRive(i, 0, 3)), lisse(-.2, -1, hRive(i, 1, 3)));
  for (let i = 0; i < N; i++) { let m = 0; for (let k = -12; k <= 12; k++) m = Math.max(m, ouv[at2(i + k)] * (1 - Math.abs(k) / 13)); for (let c = 0; c < n; c++) T[i * n + c] = lerp(T[i * n + c], base[c], m); }
  return T;
}

/* ---- le ruban de la piste, par tronçons de 40 m (toutes les eaux ensemble, chaque terre à part) ; la mer, un grand plan ---- */
function construirePiste() {
  const P = PISTE, rubans = [], EAUX_C = couleursEau(), genre = i => { const nom = P.surfaces[P.SF[idx(i)]], S = SURFACES[nom]; return !S || S.liquide ? "eau" : nom; };
  for (let c0 = 0; c0 < LONG; c0 += 40) {
    const fin = Math.min(c0 + 40, LONG); let debut = c0;
    for (let i = c0; i <= fin; i++) {   // un ruban par suite de mètres de même genre (l'eau, quelle qu'elle soit ; ou une terre)
      if (i < fin && genre(i) === genre(debut)) continue;
      if (i > debut) rubans.push([debut, i]);
      debut = i;
    }
  }
  for (const [a0, a1] of rubans) {
    const pos = [], su = [], bord = [], ec = [], pente = [], ind = [], liquide = genre(a0) === "eau", C = [[], [], [], [], [], []];
    for (let i = a0; i <= a1; i++) {
      const o = idx(i) * 16;
      const a = at(i), w = a.w, rx = Math.cos(a.h), rz = Math.sin(a.h), ii = idx(i), pont = P.PONT[ii], eg = pont || hRive(ii, 0, .02) > .02 ? 1 : 0, ed = pont || hRive(ii, 1, .02) > .02 ? 1 : 0;
      for (const u of [-(w + .6), -w, -w / 2, 0, w / 2, w, w + .6]) { pos.push(a.x + rx * u, a.y, a.z + rz * u); su.push(i, u); bord.push(w - Math.abs(u)); ec.push(eg, ed); pente.push(P.COULE[ii]);
        if (liquide) { for (let c = 0; c < 5; c++) C[c].push(EAUX_C[o + c * 3], EAUX_C[o + c * 3 + 1], EAUX_C[o + c * 3 + 2]); C[5].push(EAUX_C[o + 15]); } }
    }
    for (let i = 0; i < a1 - a0; i++) for (let j = 0; j < 6; j++) { const a = i * 7 + j, b = a + 7; ind.push(a, a + 1, b, a + 1, b + 1, b); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("aSU", new THREE.Float32BufferAttribute(su, 2)); g.setAttribute("aBord", new THREE.Float32BufferAttribute(bord, 1));
    g.setAttribute("aEc", new THREE.Float32BufferAttribute(ec, 2)); g.setAttribute("aPente", new THREE.Float32BufferAttribute(pente, 1)); g.setIndex(ind);
    if (liquide) ["aC1", "aC2", "aCl", "aRe", "aEcu", "aLuit"].forEach((a, c) => g.setAttribute(a, new THREE.Float32BufferAttribute(C[c], c < 5 ? 3 : 1)));
    const nom = P.surfaces[P.SF[idx(a0)]], m = new THREE.Mesh(g, liquide ? MAT_EAUX : SURFACES[nom].materiau); m.name = "piste"; scene.add(m);
    if (!SURFACES[nom]) console.warn("Surface inconnue : " + nom);
  }
  const mer = new THREE.Mesh(new THREE.PlaneGeometry(7000, 7000), MAT_MER); mer.rotation.x = -Math.PI / 2; mer.position.set(P.X[P.N >> 1], -.15, P.Z[P.N >> 1]); mer.name = "mer"; scene.add(mer);
}

/* ---- les ponts : sous chaque suite de mètres « pont », un tablier de pierre, deux parapets, des piles jusqu'au sol ---- */
function construirePonts() {
  const P = PISTE, N = P.N, F = new Forme(), plages = [];
  let debut = -1;
  for (let i = 0; i <= N; i++) {
    const pont = i < N && P.PONT[i];
    if (pont && debut < 0) debut = i;
    if (!pont && debut >= 0) { plages.push([debut, i]); debut = -1; }
  }
  if (BOUCLE && plages.length > 1 && plages[0][0] === 0 && plages[plages.length - 1][1] === N) { plages[0][0] = plages.pop()[0] - N; }   // un pont à cheval sur la ligne
  for (const [ia, ib] of plages) {
    // le style du pont : "pont": true (pierre), "bois" (planches et poteaux), "arches" (pierre claire et grandes arches dorées, lampes aux piliers)
    const style = typeof pieceEn(ia).pont === "string" ? pieceEn(ia).pont : "pierre", pierre = style === "bois" ? [PAL.tronc[0], PAL.tronc[1], PAL.planche] : style === "arches" ? [PAL.pierre[1], PAL.pierre[2], PAL.murs.pierre] : PAL.pierre;
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
    for (const [i0, sens] of [[ia, 1], [ib, -1]]) {   // les culées : un massif de pierre sous chaque bout du tablier, qui s'enfonce dans le sol
      // plus large que le tablier et enfoncé dans la colline : aucune fente de ciel entre le pont et le sol (11/11)
      const a = at(i0 + sens * 2.5), e0 = a.w + .9, e = e0 + 2.5;
      let sol = Infinity; for (const u of [-e, 0, e]) { const q = pose(i0 + sens * 2.5, u); sol = Math.min(sol, hauteur(q.x, q.z)); }
      const bas = Math.min(a.y - 3.5, sol - 1), G = F.poser(a.x, bas, a.z, -a.h, 1);
      G.boite(0, 0, 0, e0 * 2, a.y - .9 - bas, 5.2, pierre[1], {haut: pierre[2], mat: 0});                                       // sous le tablier
      for (const sg of [-1, 1]) G.boite(sg * (e0 + 1.25), 0, 0, 2.5, a.y + .55 - bas, 5.2, pierre[1], {haut: pierre[2], mat: 0});   // les deux ailes, à hauteur du parapet
    }
    if (style === "arches" || style === "bois") {   // au-dessus des parapets : des poteaux ; pour « arches », une grande arche dorée d'un poteau à l'autre, une lampe sur chaque poteau
      const pas = style === "arches" ? 10 : 4, or = PAL.or || [PAL.pierre[0], PAL.lumiere, PAL.lumiere], n0 = Math.max(1, Math.round((ib - ia) / pas)), dl = (ib - ia) / n0;
      for (let k = 0; k <= n0; k++) { const i = ia + k * dl, a = at(i);
        for (const sg of [-1, 1]) { const u = sg * (a.w + .45), x = a.x + Math.cos(a.h) * u, z = a.z + Math.sin(a.h) * u;
          F.poser(x, a.y, z, -a.h, 1);
          if (style === "bois") { F.boite(0, .6, 0, .22, .7, .22, pierre[0], {haut: pierre[2]}); continue; }
          F.boite(0, .6, 0, .7, 1.3, .7, pierre[2], {haut: pierre[1]}); F.matiere(7).boule(0, 2.25, 0, .38, .38, .38, [or[1], or[2], or[2]], 0).matiere(2); MONDE.lumieres.push({x, y: a.y + 2.25, z, c: PAL.lumiere, t: 4.5, toujours: false});
          if (k === n0) continue;
          F.poser(0, 0, 0, 0, 1);
          const m = 10, pt = (j, r) => { const t = j / m, b = at(i + dl * t), v = sg * (b.w + .45), h = .7 + Math.sin(t * Math.PI) * 2.6; return [b.x + Math.cos(b.h) * (v + r), b.y + h, b.z + Math.sin(b.h) * (v + r)]; };
          for (let j = 0; j < m; j++) { const A = pt(j, 0), B = pt(j + 1, 0); F.quad([A[0], A[1], A[2]], [B[0], B[1], B[2]], [B[0], B[1] + .34, B[2]], [A[0], A[1] + .34, A[2]], j % 2 ? or[1] : or[0], [sg * Math.cos(at(i).h), 0, sg * Math.sin(at(i).h)]);
            const C = pt(j, sg * .18), E = pt(j + 1, sg * .18); F.quad([A[0], A[1] + .34, A[2]], [B[0], B[1] + .34, B[2]], [E[0], E[1] + .34, E[2]], [C[0], C[1] + .34, C[2]], or[2], [0, 1, 0]); } } }
      F.poser(0, 0, 0, 0, 1); }
    for (let i = ia + 4; i < ib - 2; i += 9) {   // les piles : jamais dans la piste qui passe dessous
      const a = at(i), sol = hauteur(a.x, a.z); if (Q.e < 1.5 && !Q.bout) continue;
      const bas = Math.min(sol, a.y - 2) - .6, ht = a.y - .9 - bas; if (ht < .8) continue;
      F.poser(a.x, bas, a.z, -a.h, 1).boite(0, 0, 0, a.w * 2 + 1.2, ht, 1.7, pierre[1], {haut: pierre[2], mat: 0});
    }
  }
  F.poser(0, 0, 0, 0, 1);
  for (const r of RAVINS) {   // la rivière au fond d'un ravin : une eau calme, à plat, que les pentes du ravin viennent border
    if (!r.eau || r.creux < 3) continue;
    const cx = r.x + r.ux * r.L / 2, cz = r.z + r.uz * r.L / 2, y = r.y + .8 - r.creux + Math.min(1.6, r.creux * .16), l = r.L * .3, eau = PAL.eau_mare || hex(BIOME.eau.c1);
    F.poser(cx, y, cz, Math.atan2(-r.uz, r.ux), 1).matiere(6);
    F.quad([-l, 0, -125], [l, 0, -125], [l, 0, 125], [-l, 0, 125], eau, [0, 1, 0]);
    F.matiere(2).poser(0, 0, 0, 0, 1);
  }
  const m = F.maille(); if (m) { m.name = "ponts"; scene.add(m); }
  return plages;
}
