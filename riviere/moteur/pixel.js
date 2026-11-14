/* ============ le dresseur en pixels, sur le vélo en 3D (14/11, Kiki : « le vélo rouge en 3D, et un sprite de notre personnage dessus ») ============ */
// Le vélo reste en volumes (roues, pédalier, guidon, panier). Le dresseur, lui, devient un SPRITE en pixel art, redessiné à chaque image :
// on reprend le squelette du cycliste en volumes (cycliste.js : bassin, jambes sur les pédales, bras au guidon, tête, sac à dos), et un
// petit dessinateur le « peint » en pixels, vu exactement d'où regarde la caméra : de dos en ligne droite, un peu de côté dans les virages,
// de face au menu quand la caméra tourne autour. Ses jambes suivent donc les vraies pédales, coup par coup.
//   - chaque membre = quelques « gélules » (un segment et un rayon), peintes à plat en 3 ou 4 tons (lumière en haut à gauche, comme un sprite) ;
//   - un contour sombre autour de la silhouette et entre deux membres qui se chevauchent (la jambe de devant sur celle de derrière) ;
//   - chaque pixel garde sa profondeur : le sprite passe devant ou derrière le cadre, la selle, le pédalier, comme un vrai volume (gl_FragDepth).
// Le choix « En pixels » / « En volumes » se fait au menu (riviere_dresseur_rendu) ; ?dresseur=volumes pour essayer.
const PIX = {actif: (PARAMS.get("dresseur") || lireReglage("riviere_dresseur_rendu", "pixels")) !== "volumes", W: 76, H: 88, m: .026, moi: null, fantome: null, prims: null};

/* les gélules de chaque membre, dans le repère du membre (les mêmes que les volumes de cycliste.js) ; c : la couleur de la tenue, f : une couleur
   qui dépend de l'endroit (le visage, la casquette, la Poké Ball du sac), null = rien à peindre ici */
function primsDresseur() {
  const L = LONGUEURS, P = [], g = (m, a, b, r, c, f) => P.push({m, a, b, r, c, f});
  // le tronc (origine au bassin, y le long du dos, z vers l'avant, x vers sa gauche)
  for (const x of [-.065, .065]) { g("torse", [x, -.06, 0], [x, .04, 0], .115, "pan"); g("torse", [x, .07, 0], [x, .37, 0], .118, "ves"); }
  g("torse", [0, .07, 0], [0, .37, 0], .125, "ves");
  g("torse", [0, .44, 0], [0, .48, 0], .085, "blanc"); g("torse", [0, .46, 0], [0, .56, 0], .05, "peau");
  for (const s of [-1, 1]) g("torse", [s * .1, .47, -.02], [s * .11, .2, .13], .022, "sangle");
  // le sac à dos (derrière : z négatif), son rabat, sa poche frappée d'une Poké Ball, le sac de couchage roulé dessus
  for (const x of [-.06, .06]) g("sac", [x, .12, -.215], [x, .3, -.215], .09, "sac");
  g("sac", [-.07, .34, -.222], [.07, .34, -.222], .085, "sacO");
  g("sac", [-.045, .175, -.29], [.045, .175, -.29], .06, "sac");
  g("sac", [0, .175, -.322], [0, .175, -.322], .05, null, p => { const dy = p.y - .175, r = Math.hypot(p.x, dy);
    return r < .013 ? "blanc" : r < .024 ? "noir" : Math.abs(dy) < .009 ? "noir" : dy > 0 ? "rouge" : "blanc"; });
  g("sac", [-.19, .455, -.2], [.19, .455, -.2], .064, null, p => Math.abs(Math.abs(p.x) - .11) < .018 ? "sangle" : "couchage");
  // la tête (x vers l'avant, y en haut, z vers sa droite) : le visage devant, les cheveux derrière, la casquette, la visière
  g("tete", [0, 0, 0], [0, 0, 0], .155, null, p => {
    if (p.x > .08 && Math.abs(Math.abs(p.z) - .062) < .03 && p.y > -.08 && p.y < .012) return "noir";        // les yeux
    if (p.x > .12 && Math.abs(p.z) < .025 && p.y < -.06 && p.y > -.09) return "peauO";                        // la bouche
    return p.x < .0 || (p.y > -.03 && Math.abs(p.z) > .12 && p.x < .02) ? "cheveux" : "peau"; });
  for (const s of [-1, 1]) g("tete", [-.005, -.015, s * .148], [-.005, -.015, s * .148], .033, "peau");
  for (const z of [-.075, 0, .075]) g("tete", [-.11, -.03, z], [-.16, -.12, z * 1.25], .034, "cheveux");      // les mèches sur la nuque
  g("tete", [-.004, .03, 0], [-.004, .03, 0], .165, null, p => p.y < .04 ? null : p.x > .07 && p.y < .15 ? "blanc" : "cas");
  for (const z of [-.07, 0, .07]) g("tete", [.13, .03, z], [.25, .012, z * .9], .022, "cas");                  // la visière
  // les membres (y le long du membre, depuis son articulation)
  for (const s of [-1, 1]) {
    g("cuisse" + s, [0, 0, 0], [0, L.cuisse, 0], .078, "pan");
    g("tibia" + s, [0, 0, 0], [0, .36, 0], .062, "pan"); g("tibia" + s, [0, .37, 0], [0, .4, 0], .068, "panC"); g("tibia" + s, [0, .42, 0], [0, .45, 0], .047, "blanc");
    g("pied" + s, [0, -.1, -.03], [0, .14, -.03], .052, "chaussure"); g("pied" + s, [0, -.11, -.068], [0, .16, -.068], .026, "blanc");
    g("patin" + s, [0, -.17, -.105], [0, .12, -.105], .026, "cas");
    for (const y of [-.135, -.06, .015, .09]) g("patin" + s, [0, y, -.15], [0, y, -.15], .036, "roue");
    g("bras" + s, [0, 0, 0], [0, .11, 0], .074, "ves"); g("bras" + s, [0, .12, 0], [0, .14, 0], .068, "blanc"); g("bras" + s, [0, .14, 0], [0, L.bras, 0], .045, "peau");
    g("avantBras" + s, [0, 0, 0], [0, .19, 0], .043, "peau"); g("avantBras" + s, [0, .2, 0], [0, .23, 0], .049, "ves"); g("avantBras" + s, [0, L.avantBras, 0], [0, L.avantBras, 0], .055, "gant");
  }
  return P;
}

const PIX_VS = `varying vec2 vUv; varying vec3 vVue;
void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vVue = mv.xyz; gl_Position = projectionMatrix * mv; }`;
const PIX_FS = `uniform sampler2D uCoul, uProf; uniform mat4 uProj; uniform vec3 uTeinte; uniform float uFantome; varying vec2 vUv; varying vec3 vVue;
void main() {
  vec4 c = texture2D(uCoul, vUv); if (c.a < .5) discard;
  vec3 P = vVue + normalize(vVue) * (texture2D(uProf, vUv).r * 2. - 1.);   // le vrai point : plus loin ou plus près que le panneau, le long du regard
  vec4 cl = uProj * vec4(P, 1.); gl_FragDepthEXT = cl.z / cl.w * .5 + .5;
  vec3 col = c.rgb * uTeinte; if (uFantome > .5) col = mix(col, vec3(.88, .94, 1.), .7);
  gl_FragColor = vec4(col, uFantome > .5 ? .42 : 1.);
}`;
function creerPixel(fantome) {
  const W = PIX.W, H = PIX.H, tex = d => { const t = new THREE.DataTexture(d, W, H, THREE.RGBAFormat); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; };
  const coul = new Uint8Array(W * H * 4), prof = new Uint8Array(W * H * 4), tC = tex(coul), tP = tex(prof);
  const mat = new THREE.ShaderMaterial({uniforms: {uCoul: {value: tC}, uProf: {value: tP}, uProj: {value: camera.projectionMatrix}, uTeinte: {value: new THREE.Color(1, 1, 1)}, uFantome: {value: fantome ? 1 : 0}},
    vertexShader: PIX_VS, fragmentShader: PIX_FS, side: THREE.DoubleSide, transparent: !!fantome, depthWrite: !fantome, extensions: {fragDepth: true}});
  mat.color = mat.uniforms.uTeinte.value; TEINTES.push(mat);   // la teinte de l'heure (ambiance.js), comme les autres sprites
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W * PIX.m, H * PIX.m), mat); m.name = fantome ? "fantome-dresseur" : "dresseur-pixels"; m.frustumCulled = false; m.visible = false; scene.add(m);
  return {m, coul, prof, tC, tP, z: new Float32Array(W * H), grp: new Int16Array(W * H), rgb: new Float32Array(W * H * 3), base: new Float32Array(W * H * 3)};
}

const px_C = new THREE.Vector3(), px_F = new THREE.Vector3(), px_R = new THREE.Vector3(), px_U = new THREE.Vector3(), px_Y = new THREE.Vector3(0, 1, 0), px_A = new THREE.Vector3(),
  px_B = new THREE.Vector3(), px_P = new THREE.Vector3(), px_M = new THREE.Matrix4(), px_I = new THREE.Matrix4();
const PIX_L = (() => { const v = [-.48, .62, .62], n = Math.hypot(...v); return v.map(x => x / n); })();   // la lumière du sprite : en haut à gauche, un peu devant
const PIX_NUIT = [.1, .08, .22];
/* peindre le dresseur : R = le sprite (le tien ou le fantôme), parts = ses membres (ceux de cycliste.js, ou leurs copies), g = son vélo */
function peindreDresseur(R, parts, g) {
  const T = CY.T, W = PIX.W, H = PIX.H, px = PIX.m, prims = PIX.prims || (PIX.prims = primsDresseur());
  if (!T.roue) T.roue = hex("#F2C030");
  g.localToWorld(px_C.set(-.12, .98, 0));   // le milieu du dresseur
  px_F.subVectors(px_C, camera.position).normalize(); px_R.crossVectors(px_F, px_Y).normalize(); px_U.crossVectors(px_R, px_F);
  R.m.position.copy(px_C); R.m.quaternion.setFromRotationMatrix(px_M.makeBasis(px_R, px_U, px_A.copy(px_F).negate())); R.m.visible = true;
  const z = R.z, rgb = R.rgb, base = R.base, grp = R.grp; z.fill(Infinity); grp.fill(-1);
  for (let n = 0; n < prims.length; n++) {
    const q = prims[n], part = parts[q.m], src = CY.parts[q.m]; if (!part || !src || !src.visible) continue;
    const mw = part.matrixWorld, s = mw.getMaxScaleOnAxis(); if (q.f) px_I.copy(mw).invert();
    px_A.fromArray(q.a).applyMatrix4(mw).sub(px_C); px_B.fromArray(q.b).applyMatrix4(mw).sub(px_C);
    const au = px_A.dot(px_R) / px + W / 2, av = H / 2 - px_A.dot(px_U) / px, ad = px_A.dot(px_F), bu = px_B.dot(px_R) / px + W / 2, bv = H / 2 - px_B.dot(px_U) / px, bd = px_B.dot(px_F);
    const r = Math.max(.6, q.r * s / px), dx = bu - au, dy = bv - av, L2 = dx * dx + dy * dy, gr = q.m.charCodeAt(0) * 7 + q.m.length;   // gr : le membre (pour les contours entre membres)
    const i0 = Math.max(0, Math.floor(Math.min(au, bu) - r)), i1 = Math.min(W - 1, Math.ceil(Math.max(au, bu) + r)), j0 = Math.max(0, Math.floor(Math.min(av, bv) - r)), j1 = Math.min(H - 1, Math.ceil(Math.max(av, bv) + r));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const pu = i + .5, pv = j + .5, t = L2 > 1e-6 ? clamp(((pu - au) * dx + (pv - av) * dy) / L2, 0, 1) : 0, ex = pu - au - dx * t, ey = pv - av - dy * t, d2 = ex * ex + ey * ey;
      if (d2 > r * r) continue;
      const nz = Math.sqrt(1 - d2 / (r * r)), prof = ad + (bd - ad) * t - nz * r * px, k = j * W + i;
      if (prof >= z[k]) continue;
      let c = q.c ? T[q.c] : null;
      if (q.f) { px_P.copy(px_C).addScaledVector(px_R, (pu - W / 2) * px).addScaledVector(px_U, (H / 2 - pv) * px).addScaledVector(px_F, prof).applyMatrix4(px_I); const k2 = q.f(px_P); if (!k2) continue; c = T[k2]; }
      if (!c) continue;
      // la lumière en paliers : reflet, couleur, ombre, ombre profonde (jamais de dégradé)
      const lum = (ex / r) * PIX_L[0] - (ey / r) * PIX_L[1] + nz * PIX_L[2];
      const o = lum > .8 ? melange(c, [1, 1, 1], .22) : lum > .38 ? c : lum > .05 ? melange(c, PIX_NUIT, .32) : melange(c, PIX_NUIT, .52);
      z[k] = prof; grp[k] = gr; rgb[k * 3] = o[0]; rgb[k * 3 + 1] = o[1]; rgb[k * 3 + 2] = o[2]; base[k * 3] = c[0]; base[k * 3 + 1] = c[1]; base[k * 3 + 2] = c[2];
    }
  }
  // le contour : autour de la silhouette, et sur un membre qui passe derrière un autre (la jambe du fond sous celle de devant)
  const C = R.coul, D = R.prof, voisins = [1, -1, W, -W];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, o = ((H - 1 - j) * W + i) * 4;   // les textures se lisent de bas en haut
    let col = null, prof = z[k];
    if (prof !== Infinity) {
      let derriere = false;
      for (const dv of voisins) { const n = k + dv; if ((dv === 1 && i === W - 1) || (dv === -1 && i === 0) || n < 0 || n >= W * H) continue; if (z[n] < prof - .09 && grp[n] !== grp[k]) { derriere = true; break; } }
      col = derriere ? [base[k * 3] * .3 + .03, base[k * 3 + 1] * .3 + .03, base[k * 3 + 2] * .3 + .06] : [rgb[k * 3], rgb[k * 3 + 1], rgb[k * 3 + 2]];
    } else {
      let m = -1, best = Infinity;
      for (const dv of voisins) { const n = k + dv; if ((dv === 1 && i === W - 1) || (dv === -1 && i === 0) || n < 0 || n >= W * H) continue; if (z[n] < best) { best = z[n]; m = n; } }
      if (m >= 0) { col = [base[m * 3] * .22 + .03, base[m * 3 + 1] * .22 + .03, base[m * 3 + 2] * .22 + .07]; prof = best + .015; }
    }
    if (!col) { C[o + 3] = 0; continue; }
    C[o] = col[0] * 255; C[o + 1] = col[1] * 255; C[o + 2] = col[2] * 255; C[o + 3] = 255;
    D[o] = clamp(Math.round((prof + 1) * 127.5), 0, 255);
  }
  R.tC.needsUpdate = true; R.tP.needsUpdate = true;
}

/* chaque image, une fois la caméra posée (jeu.js) : le sprite remplace le dresseur en volumes, ou l'inverse */
function majDresseurPixels() {
  const sur = typeof VELO !== "undefined" && VELO.g && VELO.g.visible && CY.g;
  if (!sur || !PIX.actif) { if (PIX.moi) PIX.moi.m.visible = false; if (CY.g) CY.g.visible = true; return; }
  CY.g.visible = false;
  if (!PIX.moi) PIX.moi = creerPixel(false);
  peindreDresseur(PIX.moi, CY.parts, VELO.g);
}
/* le fantôme à vélo (cycliste.js : copierCycliste) : le même sprite, presque blanc, en transparence */
function peindreFantomePixels(G, visible) {
  if (!PIX.actif || !visible || !CY.g) { if (PIX.fantome) PIX.fantome.m.visible = false; return; }
  if (!PIX.fantome) PIX.fantome = creerPixel(true);
  if (!G.parts) { G.parts = {}; for (const [k, p] of Object.entries(CY.parts)) G.parts[k] = G.dst[G.src.indexOf(p)]; }
  peindreDresseur(PIX.fantome, G.parts, G.g);
}
function choisirRenduDresseur(pixels) { PIX.actif = pixels; ecrireReglage("riviere_dresseur_rendu", pixels ? "pixels" : "volumes"); }
