/* ============ les surfaces : ce sur quoi on avance (l'eau, la terre, le goudron…) et les ponts ============ */
// La piste est un ruban qui connaît sa position le long du parcours (aSU : le mètre, l'écart au milieu), la distance à son bord
// et sa pente. Chaque surface a son matériau (contenu/surfaces) ; une pièce du niveau choisit la sienne ("surface": "terre").
// Ajouter une surface = ajouter une entrée à SURFACES : {materiau, liquide, monture, poussiere, bruit}.
const SURFACES = {};
const ABRI_PISTE = EFFETS.ombres || REEL.reflets;   // la piste sait si elle est sous une voûte (aAbri) : pas d'ombre portée, pas de ciel reflété
const PISTE_VS = `
  #ifndef MER
  attribute vec2 aSU; attribute float aBord; attribute vec2 aEc; attribute float aPente, aVoie; ${EFFETS.eau ? "attribute vec3 aFlot;" : ""} ${ABRI_PISTE ? "attribute float aAbri;" : ""}
  #endif
  #ifdef PARSOMMET
  attribute vec3 aC1, aC2, aCl, aRe, aEcu; attribute float aLuit; varying vec3 vC1, vC2, vCl, vRe, vEcu; varying float vLuit;
  #endif
  varying vec3 vW; varying float vZ, vBord, vPente, vVoie; varying vec2 vSU, vEc; ${EFFETS.eau ? "varying vec3 vFlot;" : ""} ${ABRI_PISTE ? "varying float vAbri;" : ""}
  void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vec4 mv = viewMatrix * w; vZ = -mv.z;
  #ifdef PARSOMMET
    vC1 = aC1; vC2 = aC2; vCl = aCl; vRe = aRe; vEcu = aEcu; vLuit = aLuit;
  #endif
  #ifdef MER
    vSU = vec2(-9999., 0.); vBord = 99.; vEc = vec2(0.); vPente = 0.; vVoie = 0.; ${EFFETS.eau ? "vFlot = vec3(0., 0., 1.);" : ""} ${ABRI_PISTE ? "vAbri = 0.;" : ""}
  #else
    vSU = aSU; vBord = aBord; vEc = aEc; vPente = aPente; vVoie = aVoie; ${EFFETS.eau ? "vFlot = aFlot;" : ""} ${ABRI_PISTE ? "vAbri = aAbri;" : ""}
  #endif
    gl_Position = projectionMatrix * mv; }`;

/* ---- l'eau : deux bleus en taches, des reflets, l'écume des rives, le sillage, les ronds de chaque coup, l'écume des rapides et des chutes ---- */
const EAU_U = Object.assign({uC1: {value: new THREE.Vector3(...hex(BIOME.eau.c1))}, uC2: {value: new THREE.Vector3(...hex(BIOME.eau.c2))}, uClair: {value: new THREE.Vector3(...hex(BIOME.eau.clair))},
  uReflet: {value: new THREE.Vector3(...hex(BIOME.eau.reflet))}, uEcume: {value: new THREE.Vector3(...hex(BIOME.eau.ecume))}, uNag: {value: new THREE.Vector4(-999, 0, 0, 0)}, uCorps: {value: new THREE.Vector4(.45, 0, 0, 0)},
  uCoups: {value: [0, 1, 2, 3].map(() => new THREE.Vector3(-999, 0, -99))}, uLong: {value: BOUCLE ? LONG : 0}, uLuit: {value: 0}, uVoie: {value: 0}}, COMMUNS, EFFETS.ombres ? PORTEE_U : null,
  REEL.reflets ? {uCielH: CIEL.U.uHaut, uCielB: CIEL.U.uBas, uCielG: CIEL.U.uGris, uCouvert: CIEL.U.uCouvert, uSolC: CIEL.U.uSolC, uSoleil: {value: SOLEIL}} : null);   // uVoie : la voie où l'on est, dans une fourche (PISTE.VO)
/* (étape 9 du plan : l'eau coule. Chaque mètre de la piste connaît son courant : aFlot = sa vitesse le long de la piste, ses remous, son calme (courantEau).
   Les reflets naissent, dérivent avec le courant le temps de leur courte vie, et s'éteignent : deux couches décalées d'une demi-vie, pour qu'il y en ait toujours
   autant ; là où ça file (un passage étroit), des filets clairs ; en aval d'une chute ou de rapides, des flocons d'écume qui s'en vont. Une eau libre (un lac,
   la mer) garde ses reflets d'avant, les mêmes que ceux du large. À l'ombre (effets.js), l'eau fonce et ne brille pas.) */
const EAU_PR = EFFETS.ombres ? "proxR" : "prox";
const EAU_REFLETS = `vec2 g = vec2(p.x / 1.5, p.y / .42); float rang = floor(g.y); g.x += h21(vec2(rang, 3.)) * 7. + uT * .22 * (mod(rang, 2.) - .5);
    vec2 cel = floor(g), f = fract(g);
    float phR = fract(uT * .9 + h21(cel) * 5.), douxR = smoothstep(0., .25, phR) * (1. - smoothstep(.75, 1., phR));   // (18/11, Kiki : des flashs) un reflet s'allume et s'éteint en fondu, plus d'un coup
    if (h21(cel + floor(uT * .9 + h21(cel) * 5.) * .013) > .9 && f.x > .1 && f.x < .55 + .3 * h21(cel + 7.) && f.y < .55) c = mix(c, RE, ${EAU_PR} * netR * douxR);`;
const EAU_COURANT = `if (vFlot.z > .999 || h21(floor(p / 2.5)) < vFlot.z) { ${EAU_REFLETS} }
    else { float cv = vFlot.x, av = abs(cv), bande = floor(vSU.x / 7.);
      for (int j = 0; j < 2; j++) { float fj = float(j), tt = uT / 2.6 + h21(vec2(bande, 5.)) + fj * .5, ph = fract(tt), vie = floor(tt), poids = 1. - abs(2. * ph - 1.), sj = vSU.x - cv * 2.6 * (ph - .5);
        vec2 g = vec2(vSU.y / 1.5, sj / .42); float rang = floor(g.y); g.x += h21(vec2(rang, 3. + fj)) * 7.;
        vec2 cel = floor(g), f = fract(g);
        if (h21(cel + vie * .137 + fj * 31.) < .115 * poids && f.x > .1 && f.x < .55 + .3 * h21(cel + 7.) && f.y < .55) c = mix(c, RE, ${EAU_PR} * netR);
        if (av > 1.) { vec2 r = vec2(sj / 2.6, vSU.y / .3), k = floor(r); if (h21(k + vie * .31 + fj * 17.) < (av - 1.) * .07 * poids && fract(r.x) < .75 && fract(r.y) > .3) c = mix(c, CL, .6 * ${EAU_PR}); }
        if (vFlot.y > .02) { vec2 r = vec2(sj / .3, vSU.y / .36), k = floor(r), fr = fract(r); float hf = h21(k + vie * .53 + fj * 7.);   // des flocons d'écume, petits, de tailles inégales
          if (hf < vFlot.y * .16 * poids && fr.x > .15 && fr.y > .15 && fr.x < .6 + 6. * hf && fr.y < .55 + 6. * hf) c = mix(c, EC, .8 * prox); } } }`;
/* (rendu plus réaliste, REEL.reflets, 18/11) : l'eau reflète le ciel, de plus en plus quand on la regarde de loin (Fresnel), des vaguelettes la
   rident (une normale qui ondule ; des carrés de 25 cm faisaient des traînées en éventail vus de près), le soleil y scintille, et le long des rives elle fonce (le reflet des berges).
   Sous une voûte (vAbri) ni ciel ni soleil. Le reste (reflets, écume, sillage, ronds) se pose par-dessus, comme avant. */
const EAU_REEL = `
    vec3 V = normalize(cameraPosition - vW);
    vec2 dn = vec2(sin(p.x * 1.7 + uT * 1.3) + sin(p.y * 2.3 - uT * 1.1 + p.x * .6), sin(p.y * 1.9 + uT * 1.5) + sin(p.x * 2.9 + p.y * .8 - uT * .9)) * .03
            + (vec2(vn(p * .7 + uT * .4), vn(p * .7 - uT * .35 + 7.)) - .5) * .1 + (vec2(vn(p * 2.3 - uT * .8 + 3.), vn(p * 2.3 + uT * .7 + 11.)) - .5) * .05;
    vec3 Nw = normalize(vec3(dn.x, 1., dn.y)), Rw = reflect(-V, Nw); float dehors = 1. - vAbri;
    float fres = (.06 + .94 * pow(1. - max(dot(V, Nw), 0.), 5.)) * dehors;
    vec3 cielR = mix(mix(uCielB, uCielH, smoothstep(0., .45, Rw.y)), uCielG, uCouvert * .8);
    c = mix(c, cielR, clamp(fres, 0., .62));
    if ((vSU.y < 0. ? vEc.x : vEc.y) > .5) c *= mix(.74, 1., smoothstep(.5, 8., vBord));   // seulement le long d'une vraie berge (pas au bord de la piste sur un lac)`;
const EAU_SOLEIL = `{ float sp = pow(max(dot(Rw, uSoleil), 0.), 220.) * dehors * (1. - uCouvert) * (1. - uNuit) * prox;   // le soleil qui scintille : des points vifs
      if (sp > .3) c = mix(c, uSolC * 1.15, .85); else c += uSolC * sp * .5; }
    `;
const EAU_FS = `${PORTEE_FS} ${EFFETS.eau ? "varying vec3 vFlot;" : ""} ${ABRI_PISTE ? "varying float vAbri;" : ""}${REEL.reflets ? " uniform vec3 uCielH, uCielB, uCielG, uSoleil, uSolC; uniform float uCouvert, uNuit;" : ""}
  uniform float uT, uB0, uB1, uSombre, uPluie, uLuit, uVoie; uniform vec3 uC1, uC2, uClair, uReflet, uEcume, uBrume, uTeinte; uniform vec4 uNag, uCorps; uniform vec3 uCoups[4]; uniform float uLong;
  varying vec3 vW; varying float vZ, vBord, vPente, vVoie; varying vec2 vSU, vEc;
  #ifdef PARSOMMET
  varying vec3 vC1, vC2, vCl, vRe, vEcu; varying float vLuit;
  #endif
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }${BRUIT_GLSL}
  float lelong(float a, float b) { float d = a - b; return uLong > 0. ? mod(d + uLong * .5, uLong) - uLong * .5 : d; }   // de b à a le long de la piste (une boucle se referme)
  void main() {
  #ifdef PARSOMMET
    vec3 C1 = vC1, C2 = vC2, CL = vCl, RE = vRe, EC = vEcu; float LU = vLuit;
  #else
    vec3 C1 = uC1, C2 = uC2, CL = uClair, RE = uReflet, EC = uEcume; float LU = uLuit;
  #endif
    vec2 p = vW.xz; float prox = 1. - smoothstep(45., 150., vZ);
    float netR = 1. - smoothstep(12., 32., vZ);   // (18/11, Kiki : ça clignotait loin devant) un trait de reflet fait ~23 cm : au-delà de ~15 m il devient plus fin qu'un pixel
    //   et paraît ou disparaît d'une image à l'autre ; il s'efface donc avec la distance (les taches des deux bleus, elles, restent jusqu'au loin)
    vec2 q = floor(p * 4.) / 4.;
    float n = sin(q.x * .42 + uT * .35) + sin(q.y * .57 - uT * .5 + sin(q.x * .23) * 1.8) + sin((q.x + q.y) * .31 + uT * .2);
    vec3 c = mix(C1, C2, step(.35, n) * prox);${REEL.reflets ? EAU_REEL : ""}
    ${EFFETS.ombres ? "float omb = ombreEn(vW, vec3(0., 1., 0.), vZ) * (1. - vAbri), proxR = prox * (1. - .65 * omb);" : ""}
    ${EFFETS.eau ? EAU_COURANT : EAU_REFLETS}
    ${REEL.reflets ? EAU_SOLEIL : ""}float raide = abs(vPente), rap = smoothstep(.02, .11, raide);
    if (rap > 0.) { float sens = vPente < 0. ? 1. : -1.;   // l'eau qui dévale : des traits d'écume qui filent vers le bas de la pente
      vec2 r = vec2(vSU.x * .7 - sens * uT * 4.5, vSU.y * 1.7), k = floor(r);
      if (h21(k) < rap * .5 && fract(r.x) < .72 && fract(r.y) > .18) c = mix(c, EC, .85);
      float chute = smoothstep(.3, .7, raide);
      if (chute > 0.) { vec2 t = floor(vec2(vSU.y * 3.5, vSU.x * .6 - sens * uT * 9.)); c = mix(c, mix(CL, EC, step(.4, h21(t))), chute); } }
    float ec = vSU.y < 0. ? vEc.x : vEc.y;
    if (ec > .5) { c = mix(c, CL, .5 * (1. - smoothstep(0., 2.6, vBord)));
      float o = sin(vSU.x * 1.3 + uT * 1.6) * .1 + sin(vSU.x * .37 - uT) * .08;
      if (vBord < .3 + o) c = EC; else if (vBord > .8 + o && vBord < .98 + o && h21(vec2(floor(vSU.x / .9), 1.)) > .35) c = mix(c, EC, .8); }
    // Le sillage (refait le 14/11). ds : derrière lui, du : à côté ; hw : sa demi-largeur à la ligne d'eau ; el : l'élan du coup de rame (de 1 à 0).
    // Les pixels d'écume sont accrochés à l'eau : ils restent en arrière quand il avance.
    float ds = lelong(uNag.x, vSU.x), du = vSU.y - uNag.y, vit = uNag.z, hw = uCorps.x, el = uCorps.y, lg = 1. + hw;
    bool ici = vVoie < .5 || abs(vVoie - uVoie) < .5;   // dans une fourche : seulement sur la voie où l'on est
    if (ici && ds > -2. * lg && ds < 36.) {
      vec2 gp = floor(vec2(vSU.x * 4., vSU.y * 10.)); float hz = h21(gp + floor(uT * 2.) * .37), q = 1. - ds / (7. + 12. * hw);
      if (ds > .15 && q > 0. && abs(du) < hw * .85 + ds * .09 && hz < q * .42 * (.2 + vit) * (.6 + .5 * el)) c = mix(c, hz < q * .1 ? EC : CL, .9);   // l'eau brassée, juste derrière
      float bras = abs(abs(du) - (hw + .1 + ds * .33)); q = 1. - ds / 32.;
      if (ds > 0. && q > 0. && bras < (ds < 3. * lg ? .09 : .05) * (.6 + .4 * lg) && h21(gp + 17.) < q * (.2 + .5 * vit) * (.6 + .4 * el)) c = mix(c, EC, .92);   // les deux bras du sillage : épais près de lui, ils s'ouvrent et s'effacent
      else if (ds > 0. && q > 0. && bras < .22 * lg && hz < q * .2 * (.2 + vit)) c = mix(c, CL, .8);   // leur frange claire
      if (uNag.w < .5) { float col = length(vec2(du / (hw + .32 + .12 * el), (ds * 1.1 + .1) / (.5 + .25 * hw + .1 * el)));
        if (col < 1. && col > .76 + .1 * sin(uT * 7. + du * 6.)) c = EC;   // le col d'écume autour du corps
        else if (ds < 0. && col > 1.12 && col < 1.12 + .3 * el && hz < .7) c = mix(c, CL, .85); } }   // la vague qu'il pousse devant lui à chaque coup
    for (int i = 0; i < 4; i++) { float age = uT - uCoups[i].z; if (!ici || age < 0. || age > 1.6) continue;
      float d = length(vec2(vSU.y - uCoups[i].y, lelong(vSU.x, uCoups[i].x))), r = .3 + hw + age * (1.5 + hw);
      if (abs(d - r) < (.08 + .03 * age) * (1. + .5 * hw) && h21(floor(vec2(vSU.x * 5., vSU.y * 5.))) > age / 1.6) c = mix(c, EC, .9); }
    if (uPluie > 0. && prox > 0.) { vec2 cel = floor(p / 1.4); float ph = fract(uT * 1.5 + h21(cel) * 7.), tir = floor(uT * 1.5 + h21(cel) * 7.);   // la pluie : un petit rond dans chaque case, de temps en temps
      vec2 o = (cel + .5 + (vec2(h21(cel + tir), h21(cel - tir)) - .5) * .6) * 1.4;
      if (h21(cel * 1.3 + tir) < uPluie * .75 && abs(length(p - o) - ph * .5) < .07) c = mix(c, EC, .7 * (1. - ph) * prox); }
    ${EFFETS.ombres ? "c *= mix(vec3(1.), vec3(.76, .8, .88), omb);" : ""}
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
const OMBRE_U = {uOmbre: {value: new THREE.Vector3(0, 0, 0)}};   // l'ombre de ta monture sur la terre : (force, hauteur au-dessus du sol, 0 / 1 = vélo / 2 + taille = un trotteur) ; uNag donne où elle est
const ROUTE_FS = `${PORTEE_FS} ${ABRI_PISTE ? "varying float vAbri;" : ""}
  uniform float uT, uB0, uB1, uSombre, uMode, uPluie, uVoie; uniform vec3 uC1, uC2, uBordC, uLigne, uBrume, uTeinte, uOmbre; uniform vec4 uNag;
  varying vec3 vW; varying float vZ, vBord, vPente, vVoie; varying vec2 vSU, vEc;
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }${BRUIT_GLSL}
  void main() { vec2 p = vW.xz; float prox = 1. - smoothstep(45., 150., vZ);
    vec2 q = floor(p * 3.) / 3.;
    float n = sin(q.x * .9 + sin(q.y * .7) * 2.) * sin(q.y * 1.1 + q.x * .3);
    vec3 c = mix(uC1, uC2, step(.25, n) * prox);
    if (h21(floor(p * 3.)) > .94) c = mix(c, uC2 * .8, prox);                                       // des graviers${REEL.matieres ? `
    c *= (.9 + .2 * vn(p / 9. + 2.3)) * (1. + (.14 * h21(floor(p * 8.)) - .07) * prox);              // (rendu plus réaliste) des taches et du grain` : ""}
    float o = sin(vSU.x * .9) * .12;
    bool marque = vBord < 50.;                                                                       // (dans un carrefour : aucune marque)
    if (uMode > 3.5) {                                                                               // (18/11, footing, 2e version) un trottoir : des dalles claires, des joints fins qui s'effacent au loin (pas de moiré), un liseré du côté des jardins
      float W = vBord + abs(vSU.y), jn = 1. - smoothstep(14., 30., vZ); vec2 g = vec2(vSU.x / 1.2, (vSU.y + W) / 1.3), f = fract(g); float hp = h21(floor(g));
      c = mix(uC1, uC2, step(.62, hp)) * (.97 + .05 * hp);
      if (f.x < .06 || f.y < .06) c = mix(c, uBordC, .85 * jn);
      if (marque && vSU.y > 0. && vBord < .14) c = uLigne;
    } else if (uMode > 2.5) {                                                                        // (18/11, footing) un escalier de pierre : une marche tous les 36 cm, l'ombre de la contremarche, le nez clair
      float m = vSU.x / .36, f = fract(m), hp = h21(vec2(floor(m), floor(vSU.y * .8 + 9.)));
      c = mix(uC1, uC2, step(.55, hp)) * (.95 + .07 * hp);
      if (f > .78) c = uBordC * (.9 + .1 * hp); else if (f < .09) c = uLigne;
      if (marque && vBord < .16) c = uBordC * .85;                                                   // le bord de pierre, de chaque côté
    } else if (uMode > 1.5) {                                                                        // des pavés, une bordure de pierre
      vec2 g = vec2(vSU.x * 2.4, vSU.y * 2.8); g.x += step(1., mod(floor(g.y), 2.)) * .5; vec2 f = fract(g); float hp = h21(floor(g));
      c = mix(uC1, uC2, step(.5, hp)) * (.93 + .1 * hp); if (f.x < .1 || f.y < .13) c = uBordC;
      if (marque && vBord < .3) c = uLigne;
    } else if (uMode > .5) {
      if (vEc.x > .5) { if (marque && vBord < .7) c = mix(uLigne, vec3(.84, .22, .2), step(.5, fract(vSU.x / 3.))); }   // les bordures rouges et blanches : un circuit en boucle tout en goudron (17/11, Kiki), jamais le long d'un trottoir (vEc.x : VIB)
      else if (marque && vBord > .18 && vBord < .34) c = uLigne;                                       // sinon une route ordinaire : la ligne blanche de rive
      if (marque && vBord > .7 && abs(vSU.y) < .1 && fract(vSU.x / 5.) < .5 && vBord + abs(vSU.y) > 2.6) c = uLigne;   // la ligne du milieu (pas sur une petite route)
    } else {
      if (marque && vBord < .5 + o) c = uBordC;                                                      // l'accotement (plus d'ornières au milieu : Kiki, 11/11)
    }
    if (uOmbre.x > 0. && (vVoie < .5 || abs(vVoie - uVoie) < .5)) { float ds = vSU.x - uNag.x, du = vSU.y - uNag.y, h = uOmbre.y, k = 1. / (1. + h * .35);   // l'ombre : une ellipse simple, plus petite et plus pâle quand on saute
      float e = uOmbre.z > 1.5 ? length(vec2((ds - .28 * (uOmbre.z - 2.)) / (.42 * (uOmbre.z - 2.) * k), du / (.55 * (uOmbre.z - 2.) * k)))   // (18/11, Kiki : « il flotte à 20 cm ») un trotteur (z = 2 + sa taille) : l'ombre sous ses pattes, un peu devant
        : length(vec2((ds + .1) / ((uOmbre.z > .5 ? .95 : .55) * k), du / ((uOmbre.z > .5 ? .26 : .42) * k)));   // (17/11, Kiki : l'ombre tramée et la trace du pneu, « complexe et moche ») : deux tons nets, rien d'autre
      if (e < 1.) c *= 1. - (e < .62 ? .3 : .17) * uOmbre.x * k; }
    ${EFFETS.ombres ? "c *= mix(vec3(1.), vec3(.64, .68, .76), ombreEn(vW, vec3(0., 1., 0.), vZ) * (1. - vAbri));   // les ombres portées (effets.js)" : ""}
    c *= 1. - .16 * uPluie;                                                                           // mouillée, elle fonce
    gl_FragColor = vec4(mix(c * uSombre * uTeinte, uBrume, smoothstep(uB0, uB1, vZ) * .94), 1.); }`;
/* les bords d'une route (17/11, Kiki : « les bandes rouges et blanches, pas systématiquement ») : "vibreurs" sur un circuit en boucle tout en goudron,
   sinon "ligne" (la ligne blanche de rive d'une route ordinaire) ; un niveau peut le dire lui-même : "bordures": "vibreurs" | "ligne" */
const BORDURES = NIVEAU.bordures || (BOUCLE && PISTE.surfaces.length && PISTE.surfaces.every(n => n === "goudron") ? "vibreurs" : "ligne");
const VIB = (() => { const P = PISTE, V = new Uint8Array(P.M), urb = TYPES.map((t, k) => RIVES[k].urbain ? 1 : 0);   // mètre par mètre : des vibreurs ici ? (jamais le long d'une rive « urbaine » : une rue, un quai)
  if (BORDURES !== "vibreurs") return V;
  for (let i = 0; i < P.M; i++) { let u = 0; for (let t = 0; t < NT; t++) if (urb[t]) u += P.PG[i * NT + t] + P.PD[i * NT + t]; V[i] = u > .3 ? 0 : 1; }
  return V; })();
function matRoute(c1, c2, bord, ligne, mode) {
  const v = h => ({value: new THREE.Vector3(...hex(h))});
  return new THREE.ShaderMaterial({uniforms: Object.assign({uC1: v(c1), uC2: v(c2), uBordC: v(bord), uLigne: v(ligne), uMode: {value: mode}, uNag: EAU_U.uNag, uVoie: EAU_U.uVoie}, OMBRE_U, COMMUNS, EFFETS.ombres ? PORTEE_U : null), vertexShader: PISTE_VS, fragmentShader: ROUTE_FS, side: THREE.DoubleSide});
}
const TERRES = BIOME.terres || {};
SURFACES.terre = {materiau: matRoute(...(TERRES.terre || ["#D9B886", "#CBA672", "#B48C5C", "#FFFFFF"]), 0), liquide: false, monture: "coureur", poussiere: (TERRES.terre || ["#D9B886"])[0]};
SURFACES.goudron = {materiau: matRoute(...(TERRES.goudron || ["#6E7480", "#646A76", "#F8F8E8", "#F8F8E8"]), 1), liquide: false, monture: "coureur", poussiere: "#C8CCD4"};
SURFACES.marches = {materiau: matRoute(...(TERRES.marches || ["#CDC5B6", "#C1B9A9", "#8C857A", "#ECE6D8"]), 3), liquide: false, monture: "coureur", poussiere: "#D6D0C4"};   // (18/11) un escalier : pour le footing (le marcheur elliptique, au trot)
SURFACES.paves = {materiau: matRoute(...(TERRES.paves || ["#BCB4A4", "#ACA494", "#7C766C", "#D4CEC0"]), 2), liquide: false, monture: "coureur", poussiere: "#C8C0B0"};   // une rue de village
SURFACES.trottoir = {materiau: matRoute(...(TERRES.trottoir || ["#D2CDC2", "#C9C4B9", "#ABA69B", "#9C978C"]), 4), liquide: false, monture: "coureur", poussiere: "#D0CBC0"};   // (18/11, footing) le trottoir où l'on court ; la rue d'à côté est une bande de la rive (construireBandes)

/* ---- (18/11, footing, Kiki : « une vraie route, un trottoir de chaque côté, et on court sur le trottoir ») les bandes d'une rive ----
   Une rive peut porter une bande ("bande": "rue" dans la région) : un ruban qui suit la piste exactement, à côté d'elle, dessiné comme elle
   (net, sans les couleurs du terrain qui faisaient des escaliers) : la bordure, le caniveau, la chaussée et sa ligne, ses passages piétons,
   l'autre bordure, le trottoir d'en face. u = la distance au bord de la piste (0 : la bordure de notre trottoir). Le terrain passe dessous
   (le profil de la rive le creuse de 18 cm), la bande se pose par-dessus. Un objet peut la prolonger (Forme.sol("rue_bande", …), même u).
   Règle de dessin : un virage qui a la rue à l'intérieur garde un rayon de 14 m au moins (sinon le bord d'en face se replie). */
const BANDE_FS = `${PORTEE_FS} ${ABRI_PISTE ? "varying float vAbri;" : ""}
  uniform float uB0, uB1, uSombre, uPluie; uniform vec3 uBrume, uTeinte;
  varying vec3 vW; varying float vZ, vBord, vPente, vVoie; varying vec2 vSU, vEc;
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vb(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
  vec3 dalles(vec2 q, float jn) { vec2 g = q / vec2(1.2, 1.3), f = fract(g); float hp = h21(floor(g) + 31.);
    vec3 c = mix(vec3(.824, .804, .761), vec3(.788, .769, .725), step(.62, hp)) * (.97 + .05 * hp);
    if (f.x < .06 || f.y < .06) c = mix(c, vec3(.671, .651, .608), .85 * jn); return c; }
  void main() { float s = vSU.x, u = vSU.y, pres = 1. - smoothstep(16., 70., vZ), jn = 1. - smoothstep(14., 30., vZ); vec3 c;
    vec3 bordure = vec3(.89, .87, .83), face = vec3(.55, .54, .51), caniveau = vec3(.70, .69, .66);
    if (u < 0.) c = dalles(vec2(s, -u), jn);                                                         // (un objet qui prolonge la rue) notre trottoir
    else if (u < .22 || (u > 6.98 && u < 7.2)) { c = bordure * (.96 + .05 * h21(vec2(floor(s / 1.), u > 1. ? 1. : 0.))); if (fract(s) < .04) c = mix(c, face, .5 * jn); }   // la bordure de pierre, par blocs d'un mètre
    else if (u < .26 || (u > 6.94 && u < 6.98)) c = face;                                          // son flanc
    else if (u < .55 || u > 6.65 && u < 6.94) c = caniveau;                                          // le caniveau
    else if (u < 6.65) {                                                                             // la chaussée : un gris neutre, du grain de près, quelques reprises
      vec2 g = floor(vec2(s, u) * 5.); c = vec3(.37, .375, .39) * (.92 + .16 * vb(vec2(s, u) / 7. + 4.)) * (1. + (.1 * h21(g) - .05) * pres);
      if (vb(vec2(s / 11., u / 2.) + 9.) > .78) c *= .9;                                             // une reprise de goudron
      float m = mod(s + 23., 97.);
      if (m < 3.4 && u > .9 && u < 6.3) { if (fract((u - .9) / 1.) < .5) c = vec3(.93, .92, .88); }   // un passage piéton
      else if (abs(u - 3.6) < .07 && fract(s / 6.) < .5) c = vec3(.93, .92, .88);                      // la ligne du milieu
    }
    else if (u < 9.62) c = dalles(vec2(s, u - 7.2), jn);                                            // le trottoir d'en face
    else c = face * .9;                                                                              // son bord, du côté des jardins
    ${EFFETS.ombres ? "c *= mix(vec3(1.), vec3(.64, .68, .76), ombreEn(vW, vec3(0., 1., 0.), vZ)" + (ABRI_PISTE ? " * (1. - vAbri)" : "") + ");" : ""}
    c *= 1. - .16 * uPluie;
    gl_FragColor = vec4(mix(c * uSombre * uTeinte, uBrume, smoothstep(uB0, uB1, vZ) * .94), 1.); }`;
const MAT_BANDE = new THREE.ShaderMaterial({uniforms: Object.assign({}, COMMUNS, EFFETS.ombres ? PORTEE_U : null), vertexShader: PISTE_VS, fragmentShader: BANDE_FS, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4});
SURFACES.rue_bande = {materiau: MAT_BANDE, liquide: false, monture: "coureur", bande: true};   // (jamais une surface de piste : seulement les bandes et les objets qui les prolongent)
function construireBandes() {
  const P = PISTE, N = P.N, avec = TYPES.map((t, k) => RIVES[k].bande === "rue" ? 1 : 0);
  if (!avec.some(Boolean)) return;
  for (let cote = 0; cote < 2; cote++) {
    const PW = cote ? P.PD : P.PG, sg = cote ? 1 : -1, oui = new Uint8Array(N);
    for (let i = 0; i < N; i++) { let w = 0; for (let t = 0; t < NT; t++) if (avec[t]) w += PW[i * NT + t]; oui[i] = w > .5 && !P.PONT[i] && !P.TUN[i] ? 1 : 0; }
    let debut = 0; if (BOUCLE && oui[0]) { debut = oui.indexOf(0); if (debut < 0) debut = 0; }
    const runs = []; let a = -1;
    for (let k = 0; k <= N; k++) { const i = (debut + k) % N, on = k < N && oui[i]; if (on && a < 0) a = debut + k; if (!on && a >= 0) { runs.push([a, debut + k]); a = -1; } }
    // (19/11) là où la piste quitte la rue en tournant (un passage, un parc), la rue ne suit pas le début du virage : elle s'arrête 6 m avant, droite,
    // et l'objet rue_continue la prolonge tout droit depuis là (kanto-footing.js)
    const cap = j => P.H[BOUCLE ? ((j % N) + N) % N : clamp(j, 0, N - 1)], tourne = (j0, j1) => Math.abs(cap(j1) - cap(j0)) > .26;
    for (const r of runs) { if (r[1] - r[0] > 30 && tourne(r[1] - 12, r[1] + 6)) r[1] -= 6; if (r[1] - r[0] > 30 && tourne(r[0] - 6, r[0] + 12)) r[0] += 6; }
    for (const [a0, a1] of runs) {
      const pos = [], su = [], bord = [], ind = [], abri = [], n = BANDE_RUE.length, fin = BOUCLE || a1 < N ? a1 : N - 1;
      for (let s = a0; s <= fin; s++) { const sm = BOUCLE ? s % N : s, A = at(sm), rx = Math.cos(A.h), rz = Math.sin(A.h);
        for (const [u, y] of BANDE_RUE) { const d = sg * (A.w + u); pos.push(A.x + rx * d, A.y + y + .02, A.z + rz * d); su.push(s, u); bord.push(99); if (ABRI_PISTE) abri.push(0); } }
      for (let k = 0; k < fin - a0; k++) for (let j = 0; j < n - 1; j++) { const p = k * n + j, q = p + n; ind.push(p, p + 1, q, p + 1, q + 1, q); }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("aSU", new THREE.Float32BufferAttribute(su, 2)); g.setAttribute("aBord", new THREE.Float32BufferAttribute(bord, 1));
      if (abri.length) g.setAttribute("aAbri", new THREE.Float32BufferAttribute(abri, 1)); g.setIndex(ind);
      const m = new THREE.Mesh(g, MAT_BANDE); m.name = "bande"; scene.add(m);
    }
  }
}
const surface = s => SURFACES[surfaceEn(s)] || SURFACES.eau;
const DESSUS = {};   // le matériau du passage « du dessus » d'un carrefour : le même, dessiné par-dessus l'autre
function matDessus(nom) { const m = SURFACES[nom].materiau; return DESSUS[nom] || (DESSUS[nom] = new THREE.ShaderMaterial({uniforms: m.uniforms, vertexShader: m.vertexShader, fragmentShader: m.fragmentShader, side: m.side, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4})); }

/* les couleurs de l'eau, mètre par mètre : celles de l'eau de chaque mètre, puis lissées le long de la piste (trois passes de ±30 m) :
   on passe d'une eau à l'autre sans jamais voir de trait (Kiki, 12/11 : « on ne doit pas s'en rendre compte du tout ») */
function couleursEau() {
  const P = PISTE, N = P.N, M = P.M, E = BIOME.eau, n = 16, pal = nom => { const e = (BIOME.eaux || {})[nom] || {}; return [...hex(e.c1 || E.c1), ...hex(e.c2 || E.c2), ...hex(e.clair || E.clair), ...hex(e.reflet || E.reflet), ...hex(e.ecume || E.ecume), e.luit || 0]; };
  const memo = {}; let T = new Float32Array(M * n);
  for (let i = 0; i < M; i++) { const nom = P.surfaces[P.SF[i]]; T.set(memo[nom] || (memo[nom] = pal(nom)), i * n); }
  const R = 30, at2 = k => BOUCLE ? ((k % N) + N) % N : clamp(k, 0, N - 1);
  for (let passe = 0; passe < 3; passe++) { const O = new Float32Array(M * n), som = new Float64Array(n);
    for (let k = -R; k <= R; k++) for (let c = 0; c < n; c++) som[c] += T[at2(k) * n + c];
    for (let i = 0; i < N; i++) { for (let c = 0; c < n; c++) O[i * n + c] = som[c] / (2 * R + 1);
      const sort = at2(i - R), entre = at2(i + R + 1); for (let c = 0; c < n; c++) som[c] += T[entre * n + c] - T[sort * n + c]; }
    for (let i = N; i < M; i++) for (let c = 0; c < n; c++) { let t = 0; for (let k = -R; k <= R; k++) t += T[P.voisin(i, k) * n + c]; O[i * n + c] = t / (2 * R + 1); }   // les voies « force » des fourches
    T = O; }
  for (let i = N; i < M; i++) for (let c = 0; c < n; c++) T[i * n + c] = lerp(T[i * n + c], T[P.SM[i] * n + c], P.GARDE[i]);   // aux deux bouts d'une voie : exactement l'eau de la voie calme
  // là où les rives s'ouvrent sur une eau libre (un lac, la mer : rive sous l'eau), la piste prend exactement l'eau du large (MAT_MER) : aucune limite entre les deux
  const base = pal("eau"), ouv = new Float32Array(M);
  for (let i = 0; i < M; i++) ouv[i] = Math.max(lisse(-.2, -1, hRive(i, 0, 3)), lisse(-.2, -1, hRive(i, 1, 3)));
  for (let i = 0; i < M; i++) { let m = 0; for (let k = -12; k <= 12; k++) m = Math.max(m, ouv[P.voisin(i, k)] * (1 - Math.abs(k) / 13)); for (let c = 0; c < n; c++) T[i * n + c] = lerp(T[i * n + c], base[c], m); }
  return T;
}

/* le courant (étape 9 du plan), mètre par mètre : la vitesse de l'eau le long de la piste (m/s ; + : dans le sens de la course), ses remous (de 0 à 1 :
   l'écume qui s'en va en aval d'une chute ou de rapides) et son calme (1 : une eau libre, lac ou mer, sans courant).
   L'eau descend la rivière avec toi, plus vite là où elle se resserre ; elle dévale les pentes ; autour d'une remontée (la Cascade), elle vient vers toi. */
function courantEau() {
  const P = PISTE, M = P.M, F = new Float32Array(M * 3), g = new Float32Array(M), neg = new Float32Array(M), ouv = new Float32Array(M);
  // (une pente douce ne fait pas un torrent : comme l'écume des rapides, le courant ne s'emballe qu'au-delà de 2 % de pente)
  for (let i = 0; i < M; i++) { g[i] = -Math.sign(P.COULE[i]) * lisse(.012, .1, Math.abs(P.COULE[i])); neg[i] = lisse(.01, .04, P.COULE[i]); ouv[i] = Math.max(lisse(-.2, -1, hRive(i, 0, 3)), lisse(-.2, -1, hRive(i, 1, 3))); }
  const moy = (A, R, passes) => { for (let p = 0; p < passes; p++) { const O = new Float32Array(M); for (let i = 0; i < M; i++) { let t = 0; for (let k = -R; k <= R; k++) t += A[P.voisin(i, k)]; O[i] = t / (2 * R + 1); } A = O; } return A; };
  const remonte = moy(neg, 40, 3), calme = moy(ouv, 12, 2); let v = new Float32Array(M);
  for (let i = 0; i < M; i++) { const sens = clamp(1 - 28 * remonte[i], -1, 1), etroit = Math.pow(clamp(6 / Math.max(2, P.W[i]), .4, 2.4), .8); v[i] = (sens * .6 * etroit + g[i] * 3.4) * (1 - .9 * calme[i]); }
  v = moy(v, 5, 2);
  const r = new Float32Array(M), k = Math.exp(-1 / 22);   // les remous : nés là où l'eau dévale, emportés par le courant, effacés en une cinquantaine de mètres
  for (let i = 0; i < M; i++) r[i] = lisse(.03, .12, Math.abs(P.COULE[i]));
  for (let tour = 0; tour < 2; tour++) { for (let i = 0; i < M; i++) { const a = P.voisin(i, -1); if (a !== i && v[a] > 0) r[i] = Math.max(r[i], r[a] * k); }
    for (let i = M - 1; i >= 0; i--) { const a = P.voisin(i, 1); if (a !== i && v[a] < 0) r[i] = Math.max(r[i], r[a] * k); } }
  for (let i = 0; i < M; i++) { F[i * 3] = v[i]; F[i * 3 + 1] = r[i] * (1 - calme[i]); F[i * 3 + 2] = calme[i]; }
  return F;
}

/* ---- le ruban de la piste, par tronçons de 40 m (toutes les eaux ensemble, chaque terre à part) ; la mer, un grand plan ---- */
function fabriquePiste() {   // de quoi construire le ruban de la piste (le circuit entier : construirePiste ; un tronçon : troncons.js)
  const P = PISTE, EAUX_C = couleursEau(), FLOT = EFFETS.eau ? courantEau() : null, genre = i => { const nom = P.surfaces[P.SF[idx(i)]], S = SURFACES[nom]; return !S || S.liquide ? "eau" : nom + (P.CROIX[idx(i)] === 2 ? "+" : ""); };
  const sorte = i => genre(i) + "/" + P.VO[idx(i)];   // dans une fourche, chaque voie a ses rubans (le sillage ne se dessine que sur la voie où l'on est)
  const decouper = (s0, s1, nf, rubans) => { for (let c0 = s0; c0 < s1; c0 += 40) {
    const fin = Math.min(c0 + 40, s1); let debut = c0;
    for (let i = c0; i <= fin; i++) {   // un ruban par suite de mètres de même genre (l'eau, quelle qu'elle soit ; ou une terre)
      if (i < fin && sorte(i) === sorte(debut)) continue;
      if (i > debut) rubans.push([debut, i, nf]);
      debut = i;
    }
  } };
  const unRuban = (a0, a1) => {
    const pos = [], su = [], bord = [], ec = [], pente = [], voie = [], ind = [], flot = [], abri = [], liquide = genre(a0) === "eau", C = [[], [], [], [], [], []], vo = P.VO[idx(a0)];
    for (let i = a0; i <= a1; i++) {
      const o = idx(i) * 16;
      const a = at(i), w = a.w, rx = Math.cos(a.h), rz = Math.sin(a.h), ii = idx(i), pont = P.PONT[ii], colle = P.INT[ii] && LIBRE[P.INT[ii] - 1][ii] < .6;   // colle : dans une fourche, l'autre voie touche encore celle-ci (ni écume ni marque de ce côté)
      const eg = (pont || hRive(ii, 0, .02) > .02) && !(colle && P.INT[ii] === 1) ? 1 : 0, ed = (pont || hRive(ii, 1, .02) > .02) && !(colle && P.INT[ii] === 2) ? 1 : 0;
      for (const u of [-(w + .6), -w, -w / 2, 0, w / 2, w, w + .6]) { pos.push(a.x + rx * u, a.y, a.z + rz * u); su.push(i, u); bord.push(P.CROIX[ii] || (colle && !liquide) ? 99 : w - Math.abs(u)); if (liquide) ec.push(eg, ed); else ec.push(VIB[ii], 0); pente.push(P.COULE[ii]); voie.push(vo); if (FLOT && liquide) flot.push(FLOT[ii * 3], FLOT[ii * 3 + 1], FLOT[ii * 3 + 2]); if (ABRI_PISTE) abri.push(P.TUN[ii] ? 1 : 0);
        if (liquide) { for (let c = 0; c < 5; c++) C[c].push(EAUX_C[o + c * 3], EAUX_C[o + c * 3 + 1], EAUX_C[o + c * 3 + 2]); C[5].push(EAUX_C[o + 15]); } }
    }
    for (let i = 0; i < a1 - a0; i++) for (let j = 0; j < 6; j++) { const a = i * 7 + j, b = a + 7; ind.push(a, a + 1, b, a + 1, b + 1, b); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("aSU", new THREE.Float32BufferAttribute(su, 2)); g.setAttribute("aBord", new THREE.Float32BufferAttribute(bord, 1));
    g.setAttribute("aEc", new THREE.Float32BufferAttribute(ec, 2)); g.setAttribute("aPente", new THREE.Float32BufferAttribute(pente, 1)); g.setAttribute("aVoie", new THREE.Float32BufferAttribute(voie, 1)); g.setIndex(ind);
    if (flot.length) g.setAttribute("aFlot", new THREE.Float32BufferAttribute(flot, 3)); if (abri.length) g.setAttribute("aAbri", new THREE.Float32BufferAttribute(abri, 1));
    if (liquide) ["aC1", "aC2", "aCl", "aRe", "aEcu", "aLuit"].forEach((a, c) => g.setAttribute(a, new THREE.Float32BufferAttribute(C[c], c < 5 ? 3 : 1)));
    const nom = P.surfaces[P.SF[idx(a0)]], m = new THREE.Mesh(g, liquide ? MAT_EAUX : genre(a0).endsWith("+") ? matDessus(nom) : SURFACES[nom].materiau); m.name = "piste";
    if (!SURFACES[nom]) console.warn("Surface inconnue : " + nom);
    return m;
  };
  return {decouper, unRuban};
}
function construirePiste() {
  const P = PISTE, rubans = [], K = fabriquePiste();
  K.decouper(0, LONG, -1, rubans);
  P.voies.forEach((v, nf) => surLaVoie(nf, () => K.decouper(v.a, v.b, nf, rubans)));   // la voie « force » de chaque fourche, entre les mêmes mètres
  for (const [a0, a1, nf] of rubans) { if (nf < 0) scene.add(K.unRuban(a0, a1)); else surLaVoie(nf, () => scene.add(K.unRuban(a0, a1))); }
  construireBandes();   // (18/11) la rue à côté du trottoir
  if (DISC_PISTE === "terre") return;   // sur la terre : aucune mer
  const mer = new THREE.Mesh(new THREE.PlaneGeometry(7000, 7000), MAT_MER); mer.rotation.x = -Math.PI / 2; mer.position.set(P.X[P.N >> 1], RECUL ? -.035 : -.15, P.Z[P.N >> 1]); mer.name = "mer"; scene.add(mer);
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
  const unPont = (ia, ib) => {
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
  };
  for (const [ia, ib] of plages) unPont(ia, ib);
  P.voies.forEach((v, nf) => surLaVoie(nf, () => { let d = -1; for (let s = v.a; s <= v.b; s++) { const pont = s < v.b && P.PONT[idx(s)]; if (pont && d < 0) d = s; if (!pont && d >= 0) { unPont(d, s); d = -1; } } }));   // les ponts d'une voie « force »
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
