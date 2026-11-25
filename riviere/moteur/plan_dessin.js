/* ============ le plan, dessiné : chaussées, trottoirs, passages piétons, allées, places, pelouses, étang (moteur/plan.js dit où) ============ */
// Tout est à plat, par couches (une couche un peu plus haut que celle d'avant) : la chaussée partout, puis les îlots, qui la recouvrent ; aucun
// bord ne dépend d'un autre, donc aucune jointure ne peut s'ouvrir. Les motifs (dalles, pavés, grain) suivent la place dans le monde, jamais la piste.
const PLAN_VS = `attribute float aT; attribute vec2 aU; varying vec3 vW, vN; varying float vZ, vT; varying vec2 vU;
  void main() { vT = aT; vU = aU; vN = normal; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vec4 mv = viewMatrix * w; vZ = -mv.z; gl_Position = projectionMatrix * mv; }`;
// aT : 0 la chaussée · 1 le trottoir (dalles) · 2 la bordure de pierre · 3 son flanc · 4 une allée de parc (sable stabilisé) · 5 le bord d'une allée
//      6 une place pavée · 7 la peinture · 8 la pierre (bassin, béton) · 9 le plateau d'un carrefour · 10 un chemin de terre (aU : 1 dans un bois, la distance à son bord) · 11 le même, de loin
//      16 le mur d'un quai (aU : le long, la hauteur au-dessus de l'eau)
//      12 une piste cyclable (aU : s, la distance à son bord) · 13 la même, peinte en travers d'une rue · 14 l'herbe au milieu d'un chemin carrossable · 15 une piste cyclable, de loin
const planFS = (trottoir, paves, ombrage) => `${PORTEE_FS}
  uniform float uB0, uB1, uSombre, uPluie; uniform vec3 uBrume, uTeinte, uSoleil;
  varying vec3 vW, vN; varying float vZ, vT; varying vec2 vU;
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vb(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
  void main() { vec2 p = vW.xz; float pres = 1. - smoothstep(16., 70., vZ), jn = 1. - smoothstep(14., 34., vZ), mo = 1. - smoothstep(26., 80., vZ); vec3 c;
    if (vT < .5) { c = vec3(.37, .375, .39) * (.92 + .16 * vb(p / 7. + 4.)) * (1. + (.1 * h21(floor(p * 5.)) - .05) * pres); if (vb(p / vec2(11., 3.) + 9.) > .8) c *= .92; }
    else if (vT < 1.5) ${trottoir}
    else if (vT < 2.5) { float b = floor(vU.x); c = vec3(.89, .87, .83) * (.96 + .05 * h21(vec2(b, 1.))); if (fract(vU.x) < .04) c = mix(c, vec3(.55, .54, .51), .5 * jn); }
    else if (vT < 3.5) c = vec3(.55, .54, .51);
    else if (vT < 4.5) { float n = vb(p / 1.7 + 3.), m = vb(p / 6.); c = mix(vec3(.85, .735, .545), vec3(.80, .68, .49), step(.56, m)) * (1. + (.1 * n - .05)); if (h21(floor(p * 4.)) > .95) c *= mix(1., .86, pres); }
    else if (vT < 5.5) c = vec3(.62, .52, .36) * (.95 + .1 * h21(floor(p * 2.)));
    else if (vT < 6.5) { vec2 g = ${paves}; g.x += step(1., mod(floor(g.y), 2.)) * .5; vec2 f = fract(g); float hp = h21(floor(g)), m = vb(p / 9.); c = mix(vec3(.75, .71, .64), vec3(.69, .65, .585), mix(.5, step(.5, hp), mo)) * (.93 + .1 * mix(.5, hp, mo)) * (.96 + .08 * m); if (f.x < .08 || f.y < .1) c = mix(c, vec3(.53, .5, .45), .8 * jn); }
    else if (vT < 7.5) c = vec3(.93, .92, .88) * (.95 + .07 * h21(floor(p * 3.)));
    else if (vT < 8.5) c = vec3(.60, .59, .57) * (.95 + .08 * vb(p * 1.3));
    else if (vT > 15.5) { float r = floor(vU.y / .42), x = vU.x / 1.15 + .5 * mod(r, 2.) + h21(vec2(r, 3.)) * .3; vec2 f = vec2(fract(x), fract(vU.y / .42)); float h = h21(vec2(floor(x), r)); c = mix(vec3(.70, .655, .575), vec3(.62, .575, .50), h) * (.95 + .1 * vb(vU * 1.7)); if (f.x < .035 || f.y < .09) c = mix(c, vec3(.44, .41, .36), .75 * jn);
      c = mix(c, vec3(.36, .40, .30), .75 * (1. - smoothstep(.06, .62, vU.y + (vb(vU * vec2(1.4, .6) + 5.) - .5) * .5))); if (vU.y > 1.1 && vb(vU * vec2(.35, .12) + 9.) > .74) c *= .9; }   // des assises de pierre, une frange d'algues au ras de l'eau
    else if (vT > 13.5 && vT < 14.5) { float d = abs(vU.y - .45) + (vb(p * 1.3 + 3.) - .5) * .3 + (h21(floor(p * 8.)) - .5) * .16; if (d > .3) discard; c = mix(vec3(.56, .72, .34), vec3(.50, .66, .31), step(.5, vb(p / 2.1))) * (1. + (.12 * h21(floor(p * 7.)) - .06) * pres); }
    else if (vT > 11.5) { c = mix(vec3(.735, .475, .395), vec3(.70, .445, .37), step(.55, vb(p / 4. + 3.))) * (1. + (.09 * h21(floor(p * 6.)) - .045) * pres); if (vT > 12.5 && vT < 13.5) c *= .97; else if (vT < 12.5 && vU.y > -.11) c = mix(c, vec3(.93, .92, .88), .9); }
    else if (vT > 9.5) { float n = vb(p / 1.3 + 3.), m = vb(p / 5. + 1.), g = h21(floor(p * 7.)), bord = vT > 10.5 ? -1. : vU.y + (vb(p * 1.1 + 8.) - .5) * .55 + (h21(floor(p * 8.)) - .5) * .34; if (bord > .1) discard;
      c = mix(vec3(.745, .60, .425), vec3(.69, .545, .375), smoothstep(.4, .62, m)) * (.95 + .1 * n) * (1. + (.09 * g - .045) * pres); c = mix(c, vec3(.545, .425, .30), .42 * vU.x); c = mix(c, c * vec3(.86, .9, .78), smoothstep(-.5, .05, bord));
      float cl = h21(floor(p * 13.) + 5.); if (cl > .985) c *= mix(1., .8, pres); else if (cl < .012) c = mix(c, vec3(.78, .72, .64), .6 * pres);   // des cailloux
      float f = h21(floor(p * 11.) + 17.); if (vU.x > .5 && f > .955) c = mix(c, f > .978 ? vec3(.76, .48, .22) : vec3(.60, .55, .27), .7 * pres); }   // dans un bois : la terre plus sombre, des feuilles tombées
    else c = vec3(.44, .445, .455) * (.95 + .08 * vb(p / 5.)) * (1. + (.08 * h21(floor(p * 5.)) - .04) * pres);
    c *= vN.y > .5 ? ${ombrage} : vT > 15.5 ? .84 + .2 * max(0., dot(vN, uSoleil)) : .78 + .22 * max(0., dot(vN, uSoleil));
    ${EFFETS.ombres ? "c *= mix(vec3(1.), vec3(.64, .68, .76), ombreEn(vW, vec3(0., 1., 0.), vZ));" : ""}
    c *= 1. - .16 * uPluie;
    gl_FragColor = vec4(mix(c * uSombre * uTeinte, uBrume, smoothstep(uB0, uB1, vZ) * .94), 1.); }`;   // (étape 13) le même pour une ville libre (zone_dessin.js) : son trottoir uni, ses pentes prennent la lumière
const PLAN_DALLES = "{ vec2 g = p / 1.25, f = fract(g); float hp = h21(floor(g) + 31.); c = mix(vec3(.824, .804, .761), vec3(.788, .769, .725), mix(.38, step(.62, hp), mo)) * (.97 + .05 * mix(.5, hp, mo)); if (f.x < .05 || f.y < .05) c = mix(c, vec3(.671, .651, .608), .85 * jn); }";   // le trottoir d'une ville à angles droits : de grandes dalles
const PLAN_FS = planFS(PLAN_DALLES, "p * vec2(1.5, 1.9)", "1.");
const MAT_PLAN = PLAN ? new THREE.ShaderMaterial({uniforms: Object.assign({uSoleil: {value: SOLEIL}}, COMMUNS, EFFETS.ombres ? PORTEE_U : null), vertexShader: PLAN_VS, fragmentShader: PLAN_FS, side: THREE.DoubleSide}) : null;

/* la piste posée sur un plan ne se dessine pas : seulement l'ombre du coureur sous ses pattes (le même calcul que celle de la terre : surfaces.js) */
if (PLAN) SURFACES.libre = {liquide: false, monture: "coureur", poussiere: "#D0CBC0", materiau: new THREE.ShaderMaterial({transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8, side: THREE.DoubleSide,
  uniforms: Object.assign({uNag: EAU_U.uNag, uVoie: EAU_U.uVoie}, OMBRE_U, COMMUNS), vertexShader: PISTE_VS,
  fragmentShader: `uniform vec3 uOmbre; uniform vec4 uNag; varying vec3 vW; varying float vZ, vBord, vPente, vVoie; varying vec2 vSU, vEc;
    void main() { if (uOmbre.x <= 0.) discard; float ds = vSU.x - uNag.x, du = vSU.y - uNag.y, k = 1. / (1. + uOmbre.y * .35);
      float e = uOmbre.z > 1.5 ? length(vec2((ds - .28 * (uOmbre.z - 2.)) / (.42 * (uOmbre.z - 2.) * k), du / (.55 * (uOmbre.z - 2.) * k))) : length(vec2((ds + .1) / ((uOmbre.z > .5 ? .95 : .55) * k), du / ((uOmbre.z > .5 ? .26 : .42) * k)));
      if (e >= 1.) discard; gl_FragColor = vec4(0., 0., 0., (e < .62 ? .3 : .17) * uOmbre.x * k); }`})};

function construirePlan(cede) {
  const P = PLAN; if (!P) return; if (P.zone) return construireZone(cede); remplirPlan();
  const B = new Map();   // les morceaux, par carrés de 96 m (ce qui est derrière soi n'est pas dessiné)
  const morceau = (x, z) => { const k = Math.floor(x / 96) + "," + Math.floor(z / 96); if (!B.has(k)) B.set(k, {p: [], n: [], t: [], u: []}); return B.get(k); };
  const tri = (a, b, c, t, N = [0, 1, 0], U = null) => { const M = morceau((a[0] + b[0] + c[0]) / 3, (a[2] + b[2] + c[2]) / 3); [a, b, c].forEach((v, k) => { M.p.push(v[0], v[1], v[2]); M.n.push(N[0], N[1], N[2]); M.t.push(t); M.u.push(U ? U[k] : 0, 0); }); };
  const quad = (a, b, c, d, t, N, U) => { tri(a, b, c, t, N, U ? [U[0], U[1], U[2]] : null); tri(a, c, d, t, N, U ? [U[0], U[2], U[3]] : null); };
  const rect = (x0, z0, x1, z1, y, t, pas = 48) => { for (let x = x0; x < x1 - .001; x += pas) for (let z = z0; z < z1 - .001; z += pas) { const X = Math.min(x1, x + pas), Z = Math.min(z1, z + pas); quad([x, y, z], [X, y, z], [X, y, Z], [x, y, Z], t); } };
  /* un rectangle aux coins arrondis, rentré de e : toujours le même nombre de points, pour relier deux rentrées */
  const tourDe = (o, e) => {
    const r = Math.max(.02, P.RC - e), A = {x0: o.x0 + e, x1: o.x1 - e, z0: o.z0 + e, z1: o.z1 - e}, l = [], N = 7;
    for (const [cx, cz, a0] of [[A.x1 - r, A.z0 + r, -Math.PI / 2], [A.x1 - r, A.z1 - r, 0], [A.x0 + r, A.z1 - r, Math.PI / 2], [A.x0 + r, A.z0 + r, Math.PI]]) for (let k = 0; k <= N; k++) l.push([cx + Math.cos(a0 + k / N * Math.PI / 2) * r, cz + Math.sin(a0 + k / N * Math.PI / 2) * r]);
    return l; };
  const anneau = (o, e0, e1, y0, y1, t) => {
    const A = tourDe(o, e0), C = tourDe(o, e1); let d = 0;
    for (let k = 0; k < A.length; k++) {
      const j = (k + 1) % A.length, l = Math.hypot(A[j][0] - A[k][0], A[j][1] - A[k][1]), n = Math.max(1, Math.ceil(l / 48)), N = y0 === y1 ? [0, 1, 0] : nrm([A[j][1] - A[k][1], 0, A[k][0] - A[j][0]]); if (l < .001) continue;
      for (let m = 0; m < n; m++) { const u0 = m / n, u1 = (m + 1) / n, pt = (L, u, y) => [lerp(L[k][0], L[j][0], u), y, lerp(L[k][1], L[j][1], u)]; quad(pt(A, u0, y0), pt(A, u1, y0), pt(C, u1, y1), pt(C, u0, y1), t, N, [d + l * u0, d + l * u1, d + l * u1, d + l * u0]); }
      d += l; } };
  // 1. la chaussée, partout sous la ville ; les carrefours et les passages surélevés, leurs rampes et leurs dents de requin
  rect(P.xA, P.zA, P.xB, P.zB, -.12, 0);
  for (const q of P.plateaux) {
    if (q.c) { const lx = q.c.lx / 2 + 1.2, lz = q.c.lz / 2 + 1.2; rect(q.x0, q.c.z - lz, q.x1, q.c.z + lz, -.006, 9); rect(q.c.x - lx, q.z0, q.c.x + lx, q.z1, -.006, 9); }   // en croix : jamais sur les jardins des coins
    else rect(q.x0, q.z0, q.x1, q.z1, -.006, 9);
    const c = q.c, D = 1.1, mx = (q.x0 + q.x1) / 2, mz = (q.z0 + q.z1) / 2;
    const bras = c ? [c.br.n && ["n", c.x, c.lx], c.br.s && ["s", c.x, c.lx], c.br.o && ["o", c.z, c.lz], c.br.e && ["e", c.z, c.lz]].filter(Boolean) : q.m.sens === "x" ? [["n", mx, q.x1 - q.x0], ["s", mx, q.x1 - q.x0]] : [["o", mz, q.z1 - q.z0], ["e", mz, q.z1 - q.z0]];
    for (const [b, m, l] of bras) {
      const a0 = m - l / 2, a1 = m + l / 2, S = {n: [q.z0, -1], s: [q.z1, 1], o: [q.x0, -1], e: [q.x1, 1]}[b], pt = (a, d, y) => b === "n" || b === "s" ? [a, y, S[0] + S[1] * d] : [S[0] + S[1] * d, y, a];
      quad(pt(a0, 0, -.006), pt(a1, 0, -.006), pt(a1, D, -.118), pt(a0, D, -.118), 9);
      for (let k = 0; k < 3; k++) { const a = lerp(a0, a1, (k + .5) / 3), w = Math.min(.5, l / 9), y = d => -.004 - .114 * d / D + .012; tri(pt(a - w, D * .9, y(D * .9)), pt(a + w, D * .9, y(D * .9)), pt(a, .12, y(.12)), 7); } } }
  // 2. la peinture : les bandes des passages, la ligne du milieu des grandes rues
  for (const q of P.passages) {
    const L = q.sens === "x" ? q.x1 - q.x0 : q.z1 - q.z0, n = Math.max(3, Math.round(L));
    for (let k = 0; k < n; k++) { const a = (q.sens === "x" ? q.x0 : q.z0) + (k + .25) * L / n, b = a + .5 * L / n; if (q.sens === "x") rect(a, q.z0, b, q.z1, .006, 7); else rect(q.x0, a, q.x1, b, .006, 7); } }
  for (const [liste, sens] of [[P.ns, "z"], [P.eo, "x"]]) for (const r of liste) {
    if (r.l < 7) continue; const L0 = sens === "z" ? P.zA : P.xA, L1 = sens === "z" ? P.zB : P.xB;
    for (let a = L0 + 1; a < L1 - 3; a += 6) { const x = sens === "z" ? r.x : a + 1.5, z = sens === "z" ? a + 1.5 : r.z; if (P.nature(x, z) !== "chaussee" || P.plateaux.some(q => P.distRect(q, x, z) < 3)) continue; if (sens === "z") rect(r.x - .07, a, r.x + .07, a + 3, -.108, 7); else rect(a, r.z - .07, a + 3, r.z + .07, -.108, 7); } }
  // 3. les îlots : le flanc, la bordure, le trottoir ; dedans : une place, ou de l'herbe (plus bas, avec la matière du monde)
  for (const o of P.ilots) { anneau(o, 0, 0, -.14, 0, 3); anneau(o, 0, .2, 0, 0, 2); anneau(o, .2, P.T, 0, 0, 1); if (o.type === "place") rect(o.x0 + P.T - .9, o.z0 + P.T - .9, o.x1 - P.T + .9, o.z1 - P.T + .9, -.01, 6); }
  // le trottoir d'en face, autour de la ville (un cadre : il entoure la chaussée) : quatre bandes droites
  const X0 = P.xA, X1 = P.xB, Z0 = P.zA, Z1 = P.zB, T = P.T;
  for (const [a, b, c, d] of [[X0 - T, Z0 - T, X1 + T, Z0], [X0 - T, Z1, X1 + T, Z1 + T], [X0 - T, Z0, X0, Z1], [X1, Z0, X1 + T, Z1]]) rect(a, b, c, d, 0, 1);
  for (const [a, b, c, d, N] of [[X0, Z0, X1, Z0, [0, 0, 1]], [X0, Z1, X1, Z1, [0, 0, -1]], [X0, Z0, X0, Z1, [1, 0, 0]], [X1, Z0, X1, Z1, [-1, 0, 0]]]) quad([a, -.14, b], [c, -.14, d], [c, .004, d], [a, .004, b], 3, N);
  for (const [a, b, c, d] of [[X0 - .2, Z0 - .2, X1 + .2, Z0], [X0 - .2, Z1, X1 + .2, Z1 + .2], [X0 - .2, Z0, X0, Z1], [X1, Z0, X1 + .2, Z1]]) rect(a, b, c, d, .008, 8);
  // 4. les petits sols des parcelles (l'allée d'une maison, une cour, le devant des boutiques)
  for (const s of P.sols) rect(s.x0, s.z0, s.x1, s.z1, s.y, s.nature === "place" ? 6 : 1);
  // 5. les allées : leur bord d'abord, toutes, puis leur sable, toutes : là où deux allées se rejoignent, aucun bord ne les traverse
  const ruban = (pts, l, y, t) => {
    const bord = pts.map((q, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / d * l / 2, nz = (b[0] - a[0]) / d * l / 2; return [[q[0] + nx, y, q[1] + nz], [q[0] - nx, y, q[1] - nz]]; });
    for (let i = 0; i + 1 < bord.length; i++) quad(bord[i][0], bord[i][1], bord[i + 1][1], bord[i + 1][0], t); };
  const rondelle = (x, z, r, y, t) => { for (let k = 0; k < 14; k++) { const a = k / 14 * 6.2832, b = (k + 1) / 14 * 6.2832; tri([x, y, z], [x + Math.cos(a) * r, y, z + Math.sin(a) * r], [x + Math.cos(b) * r, y, z + Math.sin(b) * r], t); } };
  const bouts = a => [a.pts[0], a.pts[a.pts.length - 1]].filter(q => P.bordIlot(a.ilot, q[0], q[1]) > T + 1);
  for (const a of P.allees) { ruban(a.pts, a.l + .36, -.012, 5); for (const q of bouts(a)) rondelle(q[0], q[1], a.l / 2 + .18, -.012, 5); }
  for (const a of P.allees) { ruban(a.pts, a.l, -.004, 4); for (const q of bouts(a)) rondelle(q[0], q[1], a.l / 2, -.004, 4); }
  // 6. l'étang : une margelle de pierre, puis l'eau (plus bas)
  for (const o of P.ilots) {
    const E = o.etang; if (!E) continue; const n = 56, pt = (a, d, y) => { const r = P.rayonEtang(E, a) + d; return [E.x + Math.cos(a) * r, y, E.z + Math.sin(a) * r / E.k]; };
    for (let k = 0; k < n; k++) { const a = k / n * 6.28319, b = (k + 1) / n * 6.28319, m = (a + b) / 2;
      quad(pt(a, .55, .1), pt(b, .55, .1), pt(b, 0, .1), pt(a, 0, .1), 8); quad(pt(a, .55, -.1), pt(b, .55, -.1), pt(b, .55, .1), pt(a, .55, .1), 8, [Math.cos(m), 0, Math.sin(m)]); quad(pt(a, 0, .1), pt(b, 0, .1), pt(b, 0, -.4), pt(a, 0, -.4), 8, [-Math.cos(m), 0, -Math.sin(m)]); } }
  for (const M of B.values()) {
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(M.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(M.n, 3)); g.setAttribute("aT", new THREE.Float32BufferAttribute(M.t, 1)); g.setAttribute("aU", new THREE.Float32BufferAttribute(M.u, 2));
    const m = new THREE.Mesh(g, MAT_PLAN); m.name = "plan"; scene.add(m); }
  // 7. l'herbe (la matière du monde, les deux tons en taches) et l'eau
  const H = new Map(), forme = (x, z) => { const k = Math.floor(x / 96) + "," + Math.floor(z / 96); if (!H.has(k)) H.set(k, new Forme()); return H.get(k); }, tons = SOLS.herbe.c;
  const ton = (x, z) => tons[(bruit(x / 5.5 + 9, z / 5.5 + 2) > .56 ? 1 : 0) % tons.length];
  const pelouse = (x0, z0, x1, z1, y, pas, E = null) => { for (let x = x0; x < x1 - .01; x += pas) for (let z = z0; z < z1 - .01; z += pas) {
    const X = Math.min(x1, x + pas), Z = Math.min(z1, z + pas), V = [[x, z], [X, z], [X, Z], [x, Z]], d = E ? V.map(v => P.distEtang(E, v[0], v[1])) : null; if (d && d.every(v => v < -.1)) continue;
    const F = forme(x, z); for (const k of [0, 1, 2, 0, 2, 3]) F.v(V[k][0], d && d[k] < .3 ? -.06 : y, V[k][1], 0, 1, 0, ton(V[k][0], V[k][1]), 0); } };
  for (const o of P.ilots) {
    if (o.type === "place") continue; pelouse(o.x0 + T - .9, o.z0 + T - .9, o.x1 - T + .9, o.z1 - T + .9, -.02, o.type === "parc" ? 2 : 3, o.etang || null);
    const E = o.etang; if (!E) continue; const F = forme(E.x, E.z), n = 48, pt = a => [E.x + Math.cos(a) * (P.rayonEtang(E, a) + .1), .02, E.z + Math.sin(a) * (P.rayonEtang(E, a) + .1) / E.k];
    F.poser(0, 0, 0, 0, 1).matiere(6); for (let k = 0; k < n; k++) F.tri([E.x, .02, E.z], pt(k / n * 6.28319), pt((k + 1) / n * 6.28319), PAL.eau_mare, [0, 1, 0]); F.matiere(2); }
  const M = P.MARGE;
  for (const [a, b, c, d] of [[X0 - M, Z0 - M, X1 + M, Z0 - T], [X0 - M, Z1 + T, X1 + M, Z1 + M], [X0 - M, Z0 - T, X0 - T, Z1 + T], [X1 + T, Z0 - T, X1 + M, Z1 + T]]) pelouse(a, b, c, d, -.02, 5);
  for (const F of H.values()) { const m = F.maille(); if (m) { m.name = "plan-herbe"; scene.add(m); } }
  circulationPlan();
}
/* les voitures qui passent : seulement dans les rues que le parcours ne traverse jamais, d'un bout à l'autre (elles naissent et s'effacent dans la brume) */
function circulationPlan() {
  const P = PLAN, voies = [], croise = (x0, z0, x1, z1) => { for (let i = 0; i < PISTE.N; i++) if (PISTE.X[i] > x0 && PISTE.X[i] < x1 && PISTE.Z[i] > z0 && PISTE.Z[i] < z1) return true; return false; };
  const entiere = (x, z) => { const n = P.nature(x, z); return n === "chaussee" || n === "passage"; };
  for (const r of P.ns) if (!croise(r.x - r.l / 2, P.zA, r.x + r.l / 2, P.zB)) { let ok = true; for (let z = P.zA + 2; z < P.zB - 2; z += 5) if (!entiere(r.x, z)) ok = false; if (ok) voies.push({r, sens: "z", a: P.zA + 3, b: P.zB - 3}); }
  for (const r of P.eo) if (!croise(P.xA, r.z - r.l / 2, P.xB, r.z + r.l / 2)) { let ok = true; for (let x = P.xA + 2; x < P.xB - 2; x += 5) if (!entiere(x, r.z)) ok = false; if (ok) voies.push({r, sens: "x", a: P.xA + 3, b: P.xB - 3}); }
  voies.forEach((v, k) => {
    const L = v.b - v.a, per = L / 8.4 + 14 + k * 5; let m = null, vu = -1;
    VIVANTS.push(t => {
      const tl = t + k * 23, cycle = Math.floor(tl / per), tt = tl - cycle * per;
      if (h2(cycle * 7.3 + k, 3.1) > .55 || tt * 8.4 > L) { if (m) m.visible = false; return; }
      if (vu !== cycle) { vu = cycle; if (m) { scene.remove(m); m.geometry.dispose(); } const G = new Forme(); dessinerVoiture(G, ["citadine", "berline", "break", "camionnette", "sport"][(k + cycle) % 5], k * 3 + cycle * 5, null); m = G.maille(); m.name = "voiture-roule"; scene.add(m); }
      const d = cycle % 2 ? 1 : -1, a = d > 0 ? v.a + tt * 8.4 : v.b - tt * 8.4;   // on roule à droite
      if (v.sens === "z") { m.position.set(v.r.x - d * 1.3, -.12, a); m.rotation.y = d > 0 ? -Math.PI / 2 : Math.PI / 2; } else { m.position.set(a, -.12, v.r.z + d * 1.3); m.rotation.y = d > 0 ? 0 : Math.PI; }
      m.visible = true; }); });
}
