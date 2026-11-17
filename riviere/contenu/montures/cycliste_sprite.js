/* ============ ton dresseur à vélo, en sprite (17/11, Kiki : « une vraie planche de sprites dessinée avec soin, comme un sprite de jeu ») ============ */
// Deux planches, dessinées par riviere/outils/atelier_velo.py, glissées dans la page par page.py :
//   CYCLISTE_SPRITE (contenu/montures/cycliste.png et .json) : le dresseur ET son vélo, tout en pixels ;
//   CYCLISTE_SEUL (cycliste_seul.png et .json) : le dresseur seul, calé sur le vélo 3D (pieds sur ses pédales, mains sur ses poignées).
// Chacune : 7 angles (0 = de dos, 12 et 25 = les virages du jeu, 45, 90 = de côté, 135, 180 = de face ; l'autre côté = le miroir),
// 4 animations (il pédale : 8 images, en danseuse : 8, roue libre ramassé : 4, pied à terre : 1), des couleurs-clés repeintes aux couleurs
// de ta carte du dresseur (peau, casquette = le vélo aussi, veste, pantalon ; ?tenue=Claire,Bleu,Vert,Noir pour essayer).
// Trois façons de le voir (Réglages du menu « Ton cycliste », riviere_cycliste, ?cycliste=sprite|mixte|3d) :
//   sprite : tout en pixels (par défaut) ; mixte (17/11, Kiki) : le vélo 3D et son panier, ton dresseur en pixels dessus ;
//   3d : le vélo et le dresseur à facettes (velo.js, cycliste.js).
// Le sprite prend l'image vue de la caméra (directions.js : angleVue), penche dans les virages comme un vrai vélo (la bascule s'efface vu de
// côté), se met en danseuse dans les côtes, se ramasse en roue libre dans les descentes rapides, pose le pied à terre à l'arrêt.
const MODES_CYCLISTE = ["sprite", "mixte", "3d"];
const CYC = {mode: (m => MODES_CYCLISTE.includes(m) ? m : "sprite")(PARAMS.get("cycliste") || lireReglage("riviere_cycliste", "sprite")),
  ph: 0, rf: 0, incl: 0, immobile: 0, etat: "assis", image: 0, joie: 0, tour: 0};
const CYC_PL = {velo: {data: () => typeof CYCLISTE_SPRITE !== "undefined" ? CYCLISTE_SPRITE : null}, seul: {data: () => typeof CYCLISTE_SEUL !== "undefined" ? CYCLISTE_SEUL : null}};
const plOk = pl => { const d = pl.data(); return !!(d && d.png && d.fiche); };
const cycSprite = () => plOk(CYC_PL.velo);
function cycTons() {   // pour chaque matière repeinte : clair, moyen, ombre, trait (les tables de la carte du dresseur : cycliste.js, TENUES)
  const t = (PARAMS.get("tenue") || "").split(","), d = (typeof D === "object" && D && D.dresseur) || {}, hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const choix = (k, i, defaut) => { const v = t[i] || d[k]; return TENUES[k === "peau" ? "peau" : k === "pantalon" ? "pantalon" : "tissu"][v] ? v : defaut; };
  const peau = choix("peau", 0, "Claire"), P = TENUES.peau[peau].map(hx), C = TENUES.tissu[choix("casquette", 1, "Rouge")].map(hx), V = TENUES.tissu[choix("veste", 2, "Bleu")].map(hx), J = TENUES.pantalon[choix("pantalon", 3, "Jean")].map(hx);
  const mel = (a, b, k) => a.map((x, i) => Math.round(x + (b[i] - x) * k)), noir = [16, 14, 24], tissu = T => [mel(T[1], T[2], .55), T[1], mel(T[0], T[1], .35), mel(T[0], noir, .5)];
  const ch = hx(peau === "Foncée" || peau === "Très foncée" ? "#241A16" : "#4A3226");
  return {peau: [P[0], P[1], mel(P[1], P[2], .6), mel(P[2], noir, .4)], cas: tissu(C), ves: tissu(V), cadre: tissu(C),
    pan: [mel(J[1], [255, 255, 255], .12), mel(J[0], J[1], .68), mel(J[0], J[1], .32), mel(J[0], noir, .5)], chev: [mel(ch, [255, 255, 255], .18), ch, mel(ch, noir, .4), mel(ch, noir, .7)]};
}
function construirePlanche(pl) {   // une fois : la planche repeinte, le sprite et son fantôme (ils partagent l'image)
  if (pl.m || pl.charge || !plOk(pl)) return;
  pl.charge = true; const data = pl.data(), F = pl.fiche = data.fiche, im = new Image();
  im.onload = () => {
    const c = toile(im.width, im.height, x => x.drawImage(im, 0, 0)), x = c.getContext("2d"), img = x.getImageData(0, 0, im.width, im.height), dd = img.data, T = cycTons(), table = new Map();
    for (const [nom, cles] of Object.entries(F.cles)) cles.forEach((h, i) => { const k = [1, 3, 5].map(j => parseInt(h.slice(j, j + 2), 16)); table.set(k[0] << 16 | k[1] << 8 | k[2], T[nom][i]); });
    for (let i = 0; i < dd.length; i += 4) { if (!dd[i + 3]) continue; const n = table.get(dd[i] << 16 | dd[i + 1] << 8 | dd[i + 2]); if (n) { dd[i] = n[0]; dd[i + 1] = n[1]; dd[i + 2] = n[2]; } }
    x.putImageData(img, 0, 0);
    // (17/11, Kiki : les roues rentraient dans le sol) le plus bas pixel de chaque rangée : vue d'un peu au-dessus, la roue la plus proche descend
    // sous le point d'appui ; on relève l'image d'autant pour qu'elle touche le sol, sans s'enfoncer
    pl.bas = F.rangs.map((g, rg) => { let bas = 0; for (let y = 0; y < F.h; y++) for (let X = 0; X < F.w * g.images; X++) if (dd[((rg * F.h + y) * im.width + X) * 4 + 3] > 20) { bas = y; break; } return bas; });
    const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    const w = F.w / F.px, h = F.h / F.px, geo = new THREE.PlaneGeometry(w, h).translate(w / 2 - F.cx / F.px, F.cy / F.px - h / 2, 0);   // l'origine = le point du sol sous le pédalier
    const quad = (mat, decal) => { const t2 = tex.clone(); t2.needsUpdate = true; t2.repeat.set(F.w / im.width, F.h / im.height); mat.map = t2; const m = new THREE.Mesh(geo, mat); m.visible = false; m.renderOrder = decal; scene.add(m); TEINTES.push(mat); return m; };
    pl.W = im.width; pl.H = im.height;
    pl.m = quad(new THREE.MeshBasicMaterial({alphaTest: .5, side: THREE.DoubleSide}), 0);
    const fm = new THREE.MeshBasicMaterial({alphaTest: .5, side: THREE.DoubleSide, transparent: true, opacity: .55, depthWrite: false});   // le fantôme : presque blanc, une pointe de bleu (comme celui des Pokémon)
    fm.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.88, .94, 1.), .65);"); };
    pl.fant = quad(fm, 2);
  };
  im.src = data.png;
}
const _cv = typeof THREE !== "undefined" ? new THREE.Vector3() : null;   // (le contrôle sans navigateur n'a pas la 3D)
/* une image de la planche, en (x, y, z), le personnage allant vers (fx, fz) : la vue la plus proche de l'angle de la caméra (miroir de l'autre
   côté), l'animation de l'état ; roll : il penche (la bascule s'efface vu de côté) ; o.leve : relever pour que le bas touche le sol ;
   o.devant : avancer l'image vers la caméra (sur le vélo 3D : devant le cadre, derrière le panier), o.ech : sa taille */
function poserSur(pl, m, x, y, z, fx, fz, etat, image, roll, o = {}) {
  const F = pl.fiche, a = angleVue(x, z, fx, fz), dev = Math.abs(a) * 180 / Math.PI;
  let r = -1, mieux = 1e9;
  F.rangs.forEach((g, i) => { if (g.etat === etat && Math.abs(g.deg - dev) < mieux) { mieux = Math.abs(g.deg - dev); r = i; } });
  if (r < 0) return;
  const g = F.rangs[r], miroir = a < 0 && g.deg > 0 && g.deg < 180, i = Math.min(image, g.images - 1), ech = o.ech || 1;   // de dos et de face : jamais de miroir (le carter est à droite)
  m.position.set(x, y + (o.leve ? Math.max(0, (pl.bas ? pl.bas[r] : F.cy) - F.cy + 1) / F.px * ech : 0), z);
  let k = ech;
  if (o.devant) { _cv.copy(camera.position).sub(m.position); const dist = _cv.length() || 1; m.position.addScaledVector(_cv, o.devant * ech / dist); k *= (dist - o.devant * ech) / dist; }   // même place à l'écran, un peu plus près
  m.material.map.offset.set(i * F.w / pl.W, 1 - (r + 1) * F.h / pl.H);
  m.rotation.set(0, Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z), -roll * Math.cos(dev * Math.PI / 180));   // tourné vers la caméra ; il penche dans le virage, la bascule s'efface vu de côté
  m.scale.set(miroir ? -k : k, k, k); m.visible = true;
}
function poserCyclisteSprite(m, s, d, y, etat, image, incl) {   // tout en pixels : sur la piste au mètre s
  const [fx, fz] = avanceEn(s, d), p = pose(s, d);
  poserSur(CYC_PL.velo, m, p.x, y, p.z, fx, fz, etat, image, incl, {leve: true});
}
/* ---- tout en pixels : la monture « cycliste » (velo.js n'est pas dessiné) ---- */
function pedalerSprite(N, t, dt, S, p, sol, bond, k) {
  const pl = CYC_PL.velo; construirePlanche(pl); if (!pl.m) return;
  const i = idx(S.s), v = Math.max(0, S.vd || 0), pente = PISTE.PENTE[i], kv = PISTE.COURB[idx(S.s + 3)];
  const roule = v > .25, libre = pente < -.035 && v > 5;
  // (18/11, Kiki : toujours en danseuse dans le Ventoux) assis dans les côtes ; debout seulement dans les plus rudes (dès 10 %, jusqu'à ce que ça redescende sous 8,5 %)
  CYC.danse = roule && !S.enAir && pente > (CYC.danse ? .085 : .10);
  const debout = CYC.danse;
  const braquet = 1 + clamp(pente / .08, 0, 1) * .9;   // dans une côte, un petit braquet : les jambes tournent plus vite pour la même vitesse (comme velo.js)
  if (dt > 0 && roule && !libre) CYC.ph += v / ((typeof MACHINE !== "undefined" && MACHINE.tourVu) || TOUR_PEDALE) * braquet * dt;
  VELO.cadence = roule && !libre ? v / TOUR_PEDALE * braquet * 60 : 0;   // sans capteur de cadence, c'est elle qui s'affiche (jeu.js)
  CYC.immobile = roule ? 0 : CYC.immobile + (dt || 0);
  const etat = !roule && (CYC.immobile > .5 || S.fige || !S.mode) ? "arret" : libre && v > 7 ? "ramasse" : debout ? "danseuse" : "assis";
  let image = 0;
  if (etat === "ramasse") { CYC.rf += Math.min(v / ROUE / (Math.PI / 8), 14) * (dt || 0); image = Math.floor(CYC.rf) % 4; }   // les rayons qui tournent (pas plus de 14 images par seconde)
  else if (etat !== "arret") image = Math.floor(((CYC.ph % 1) + 1) % 1 * 8) % 8;
  CYC.etat = etat; CYC.image = image;
  const incl = roule ? clamp(Math.atan(v * v * kv / 9.8) * 1.5, -.42, .42) : 0;
  CYC.incl += (incl - CYC.incl) * (dt > 0 ? clamp(dt * 4, 0, 1) : 1);
  VELO.choc = (VELO.choc || 0) * Math.exp(-(dt || 0) * 7);
  poserCyclisteSprite(pl.m, S.s, M.d, M.y + Math.max(0, bond) - VELO.choc * .12, etat, image, CYC.incl);
  GABARIT.f = 1.12; GABARIT.hw = .3;   // la caméra recule un peu : un dresseur sur son vélo fait 1,7 m
  OMBRE_U.uOmbre.value.set(1, Math.max(0, M.y + Math.max(0, bond) - sol), 1);   // l'ombre du vélo (surfaces.js)
  // ton Pokémon court à côté de toi, à sa vraie taille, un peu devant à ta gauche ; il saute de joie à chaque tour
  if (!N) return;
  if (S.tour !== CYC.tour) { if (S.tour > CYC.tour) CYC.joie = 2.6; CYC.tour = S.tour; }
  CYC.joie = Math.max(0, CYC.joie - (dt || 0));
  const q = pose(S.s + .5, M.d - 1.15), taille = clamp(N.pl.m || .6, .3, 1.4), f = taille / N.h;
  const saut = CYC.joie > 0 && roule ? Math.abs(Math.sin(t * 8.5)) * .25 : roule ? Math.abs(Math.sin(t * (5 + S.vn * 6))) * .05 : 0;
  N.m.position.set(q.x, at(S.s + .5).y + saut, q.z); orienterPantin(N, S.s + .5, M.d - 1.15); N.regarder();
  N.image(roule ? N.pl.image(t * (.9 + S.vn * 1.1)) : 0); N.m.rotation.z = 0; N.m.scale.set(N.l * f, N.h * f, 1);
}
/* ---- le vélo 3D avec ton dresseur en pixels (17/11, Kiki) : velo.js dessine le vélo, son panier et ton Pokémon dedans ; ici, le dresseur ---- */
// velo.js l'appelle à la place du dresseur à facettes ; rend false si ce n'est pas le mode « mixte » (le dresseur à facettes revient).
const _cf = typeof THREE !== "undefined" ? new THREE.Vector3() : null;
function cyclisteSurVelo(t, dt, S, e) {
  const pl = CYC_PL.seul, mixte = CYC.mode === "mixte" && plOk(pl);
  if (typeof CY !== "undefined" && CY.g) CY.g.visible = !mixte;
  if (!mixte) { if (pl.m) pl.m.visible = false; return false; }
  construirePlanche(pl); if (!pl.m) return true;   // en attendant l'image : le vélo seul
  const etat = !e.roule ? "arret" : (VELO.groupe || 0) > .5 ? "ramasse" : VELO.debout > .5 ? "danseuse" : "assis";
  const image = etat === "assis" || etat === "danseuse" ? ((Math.round((e.c + Math.PI / 2) / (Math.PI / 4)) % 8) + 8) % 8 : 0;   // le même angle de pédalier que le vélo 3D
  CYC.etat = etat; CYC.image = image;
  const g = VELO.g; _cf.setFromMatrixColumn(g.matrixWorld, 0);   // l'avant du vélo, dans le monde
  poserSur(pl, pl.m, g.position.x, g.position.y, g.position.z, _cf.x, _cf.z, etat, image, VELO.incl + e.balance * .09, {devant: .5, ech: ECH_VELO});   // (18/11, Kiki : la selle lui sortait des fesses) plus près de la caméra que l'arrière de la selle 3D (.37 m)
  return true;
}
/* le fantôme : tout en pixels, le même cycliste en transparence, 1,8 m à ta droite ; sur le vélo 3D, ton dresseur en pixels sur le vélo fantôme */
function fantomeCyclisteSprite(sG) {
  const pl = CYC_PL.velo; if (!pl.fant) return; if (sG === null) { pl.fant.visible = false; return; }
  const [fx, fz] = avanceEn(sG, 1.8), p = pose(sG, 1.8);
  poserSur(pl, pl.fant, p.x, at(sG).y, p.z, fx, fz, CYC.etat === "arret" ? "assis" : CYC.etat, CYC.image, 0, {leve: true});
}
function fantomeCyclisteSurVelo(sG) {
  const pl = CYC_PL.seul; if (!pl.fant) return;
  const G = typeof FANTOME_VELO !== "undefined" && FANTOME_VELO.g;
  if (CYC.mode !== "mixte" || sG === null || !G) { pl.fant.visible = false; return; }
  G.updateMatrixWorld(); _cf.setFromMatrixColumn(G.matrixWorld, 0);
  poserSur(pl, pl.fant, G.position.x, G.position.y, G.position.z, _cf.x, _cf.z, CYC.etat === "arret" ? "assis" : CYC.etat, CYC.image, G.rotation.x, {devant: .5, ech: ECH_VELO});
}
const cycActif = () => !!(CYC_PL.velo.m && CYC_PL.velo.m.visible);
function cacherCyclisteSprite() { for (const pl of [CYC_PL.velo, CYC_PL.seul]) { if (pl.m) pl.m.visible = false; if (pl.fant) pl.fant.visible = false; } }
if (typeof MONTURES !== "undefined") {
  const SPRITE = {enfonce: 0, foulee: 0, animer: pedalerSprite, get trace() { return typeof S !== "undefined" && surfaceEn(S.s) === "terre" ? .9 : 4; }}, TROIS_D = MONTURES.cycliste;
  MONTURES.cyclisteSprite = SPRITE; MONTURES.cycliste3D = TROIS_D;
  CYC.choisir = mode => {   // le réglage du menu : tout de suite, sans recharger
    CYC.mode = MODES_CYCLISTE.includes(mode) ? mode : "sprite";
    if (CYC.mode === "sprite" && !cycSprite()) CYC.mode = "3d";
    ecrireReglage("riviere_cycliste", CYC.mode);
    MONTURES.cycliste = CYC.mode === "sprite" ? SPRITE : TROIS_D; cacherCyclisteSprite();
  };
  if (CYC.mode === "sprite" && !cycSprite()) CYC.mode = "3d";
  MONTURES.cycliste = CYC.mode === "sprite" ? SPRITE : TROIS_D;
  const cacher3D = cacherVelo;   // monture.js l'appelle pour toute monture sans vélo 3D : le sprite se cache, puis pedalerSprite le remontre s'il est la monture du moment
  cacherVelo = function () { cacher3D(); cacherCyclisteSprite(); };
}
