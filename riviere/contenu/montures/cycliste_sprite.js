/* ============ ton dresseur à vélo, en sprite (17/11, Kiki : « une vraie planche de sprites dessinée avec soin, comme un sprite de jeu ») ============ */
// La planche (contenu/montures/cycliste.png et .json) est dessinée par riviere/outils/atelier_velo.py : 7 angles (0 = de dos, 12 et 25 = les
// virages du jeu, 45, 90 = de côté, 135, 180 = de face ; l'autre côté = le miroir), 4 animations (il pédale : 8 images, en danseuse : 8,
// roue libre ramassé : 4, pied à terre : 1). Ses couleurs-clés sont repeintes aux couleurs de ta carte du dresseur (peau, casquette = le vélo
// aussi, veste, pantalon ; ?tenue=Claire,Bleu,Vert,Noir pour essayer). page.py glisse la planche dans la page (CYCLISTE_SPRITE).
// C'est la vue par défaut à vélo et au skieur de fond « À vélo » ; le vélo 3D et le dresseur à facettes (velo.js, cycliste.js) restent :
// Réglages du menu « Ton cycliste : en sprite / en 3D » (riviere_cycliste), ?cycliste=3d pour essayer.
// Il prend l'image vue de la caméra (directions.js : angleVue), il penche dans les virages comme un vrai vélo (la bascule s'efface quand on le
// voit de côté), se met en danseuse dans les côtes, se ramasse en roue libre dans les descentes rapides, pose le pied à terre à l'arrêt.
// Au sol : l'ombre et la trace du pneu (comme le vélo 3D), la poussière de la roue arrière. Ton Pokémon court à côté de toi.
const CYC = {mode: (PARAMS.get("cycliste") || lireReglage("riviere_cycliste", "sprite")) === "3d" ? "3d" : "sprite", m: null, fant: null, tex: null, toile: null,
  ph: 0, rf: 0, incl: 0, immobile: 0, etat: "assis", image: 0, joie: 0, tour: 0, vu: false};
const CYC_ECH = 1;   // la planche est à l'échelle (30 pixels par mètre)
const cycSprite = () => typeof CYCLISTE_SPRITE !== "undefined" && CYCLISTE_SPRITE && CYCLISTE_SPRITE.png && CYCLISTE_SPRITE.fiche;
function cycTons() {   // pour chaque matière repeinte : clair, moyen, ombre, trait (les tables de la carte du dresseur : cycliste.js, TENUES)
  const t = (PARAMS.get("tenue") || "").split(","), d = (typeof D === "object" && D && D.dresseur) || {}, hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const choix = (k, i, defaut) => { const v = t[i] || d[k]; return TENUES[k === "peau" ? "peau" : k === "pantalon" ? "pantalon" : "tissu"][v] ? v : defaut; };
  const peau = choix("peau", 0, "Claire"), P = TENUES.peau[peau].map(hx), C = TENUES.tissu[choix("casquette", 1, "Rouge")].map(hx), V = TENUES.tissu[choix("veste", 2, "Bleu")].map(hx), J = TENUES.pantalon[choix("pantalon", 3, "Jean")].map(hx);
  const mel = (a, b, k) => a.map((x, i) => Math.round(x + (b[i] - x) * k)), noir = [16, 14, 24], tissu = T => [mel(T[1], T[2], .55), T[1], mel(T[0], T[1], .35), mel(T[0], noir, .5)];
  const ch = hx(peau === "Foncée" || peau === "Très foncée" ? "#241A16" : "#4A3226");
  return {peau: [P[0], P[1], mel(P[1], P[2], .6), mel(P[2], noir, .4)], cas: tissu(C), ves: tissu(V), cadre: tissu(C),
    pan: [mel(J[1], [255, 255, 255], .12), mel(J[0], J[1], .68), mel(J[0], J[1], .32), mel(J[0], noir, .5)], chev: [mel(ch, [255, 255, 255], .18), ch, mel(ch, noir, .4), mel(ch, noir, .7)]};
}
function construireCyclisteSprite() {   // une fois : la planche repeinte, le sprite et son fantôme (ils partagent l'image)
  if (CYC.m || CYC.charge || !cycSprite()) return;
  CYC.charge = true; const F = CYCLISTE_SPRITE.fiche, im = new Image();
  im.onload = () => {
    const c = toile(im.width, im.height, x => x.drawImage(im, 0, 0)), x = c.getContext("2d"), img = x.getImageData(0, 0, im.width, im.height), dd = img.data, T = cycTons(), table = new Map();
    for (const [nom, cles] of Object.entries(F.cles)) cles.forEach((h, i) => { const k = [1, 3, 5].map(j => parseInt(h.slice(j, j + 2), 16)); table.set(k[0] << 16 | k[1] << 8 | k[2], T[nom][i]); });
    for (let i = 0; i < dd.length; i += 4) { if (!dd[i + 3]) continue; const n = table.get(dd[i] << 16 | dd[i + 1] << 8 | dd[i + 2]); if (n) { dd[i] = n[0]; dd[i + 1] = n[1]; dd[i + 2] = n[2]; } }
    x.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    const w = F.w / F.px * CYC_ECH, h = F.h / F.px * CYC_ECH, geo = new THREE.PlaneGeometry(w, h).translate(w / 2 - F.cx / F.px * CYC_ECH, F.cy / F.px * CYC_ECH - h / 2, 0);   // l'origine = le point du sol sous le pédalier
    const quad = (mat, decal) => { const t2 = tex.clone(); t2.needsUpdate = true; t2.repeat.set(F.w / im.width, F.h / im.height); mat.map = t2; const m = new THREE.Mesh(geo, mat); m.visible = false; m.renderOrder = decal; scene.add(m); TEINTES.push(mat); return m; };
    CYC.W = im.width; CYC.H = im.height; CYC.toile = c;
    CYC.m = quad(new THREE.MeshBasicMaterial({alphaTest: .5, side: THREE.DoubleSide}), 0);
    const fm = new THREE.MeshBasicMaterial({alphaTest: .5, side: THREE.DoubleSide, transparent: true, opacity: .55, depthWrite: false});   // le fantôme : presque blanc, une pointe de bleu (comme celui des Pokémon)
    fm.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.88, .94, 1.), .65);"); };
    CYC.fant = quad(fm, 2);
  };
  im.src = CYCLISTE_SPRITE.png;
}
/* l'image à montrer : la vue la plus proche de l'angle de la caméra (miroir de l'autre côté), l'animation de l'état */
function poserCyclisteSprite(m, s, d, y, etat, image, incl) {
  const F = CYCLISTE_SPRITE.fiche, [fx, fz] = avanceEn(s, d), p = pose(s, d);
  m.position.set(p.x, y, p.z);
  const a = angleVue(p.x, p.z, fx, fz), dev = Math.abs(a) * 180 / Math.PI;
  let r = -1, mieux = 1e9;
  F.rangs.forEach((g, i) => { if (g.etat === etat && Math.abs(g.deg - dev) < mieux) { mieux = Math.abs(g.deg - dev); r = i; } });
  if (r < 0) return;
  const g = F.rangs[r], miroir = a < 0 && g.deg > 0 && g.deg < 180, i = Math.min(image, g.images - 1);   // de dos et de face : jamais de miroir (le carter est à droite)
  m.material.map.offset.set(i * F.w / CYC.W, 1 - (r + 1) * F.h / CYC.H);
  m.rotation.set(0, Math.atan2(camera.position.x - p.x, camera.position.z - p.z), -incl * Math.cos(dev * Math.PI / 180));   // tourné vers la caméra ; il penche dans le virage, la bascule s'efface vu de côté
  m.scale.set(miroir ? -1 : 1, 1, 1); m.visible = true;
}
function pedalerSprite(N, t, dt, S, p, sol, bond, k) {
  construireCyclisteSprite(); if (!CYC.m) return;
  const i = idx(S.s), v = Math.max(0, S.vd || 0), pente = PISTE.PENTE[i], kv = PISTE.COURB[idx(S.s + 3)];
  const roule = v > .25, libre = pente < -.035 && v > 5, debout = pente > .055 && roule && !S.enAir;
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
  const y = M.y + Math.max(0, bond) - VELO.choc * .12;
  poserCyclisteSprite(CYC.m, S.s, M.d, y, etat, image, CYC.incl);
  GABARIT.f = 1.12; GABARIT.hw = .3;   // la caméra recule un peu : un dresseur sur son vélo fait 1,7 m
  OMBRE_U.uOmbre.value.set(1, Math.max(0, M.y + Math.max(0, bond) - sol), 1);   // l'ombre du vélo, et la trace du pneu sur un chemin (surfaces.js)
  // ton Pokémon court à côté de toi, à sa vraie taille, un peu devant à ta gauche ; il saute de joie à chaque tour
  if (!N) return;
  if (S.tour !== CYC.tour) { if (S.tour > CYC.tour) CYC.joie = 2.6; CYC.tour = S.tour; }
  CYC.joie = Math.max(0, CYC.joie - (dt || 0));
  const q = pose(S.s + .5, M.d - 1.15), taille = clamp(N.pl.m || .6, .3, 1.4), f = taille / N.h;
  const saut = CYC.joie > 0 && roule ? Math.abs(Math.sin(t * 8.5)) * .25 : roule ? Math.abs(Math.sin(t * (5 + S.vn * 6))) * .05 : 0;
  N.m.position.set(q.x, at(S.s + .5).y + saut, q.z); orienterPantin(N, S.s + .5, M.d - 1.15); N.regarder();
  N.image(roule ? N.pl.image(t * (.9 + S.vn * 1.1)) : 0); N.m.rotation.z = 0; N.m.scale.set(N.l * f, N.h * f, 1);
}
/* le fantôme : le même cycliste en transparence, 1,8 m à ta droite, dans la même pose que toi (fantome.js l'appelle) */
function fantomeCyclisteSprite(sG) {
  if (!CYC.fant) return; if (sG === null) { CYC.fant.visible = false; return; }
  poserCyclisteSprite(CYC.fant, sG, 1.8, at(sG).y, CYC.etat === "arret" ? "assis" : CYC.etat, CYC.image, 0);
}
const cycActif = () => !!(CYC.m && CYC.m.visible);
function cacherCyclisteSprite() { if (CYC.m) CYC.m.visible = false; if (CYC.fant) CYC.fant.visible = false; }
if (typeof MONTURES !== "undefined") {
  const SPRITE = {enfonce: 0, foulee: 0, animer: pedalerSprite, get trace() { return typeof S !== "undefined" && surfaceEn(S.s) === "terre" ? .9 : 4; }}, TROIS_D = MONTURES.cycliste;
  MONTURES.cyclisteSprite = SPRITE; MONTURES.cycliste3D = TROIS_D;
  CYC.choisir = mode => {   // le réglage du menu : tout de suite, sans recharger
    CYC.mode = mode === "3d" || !cycSprite() ? "3d" : "sprite"; ecrireReglage("riviere_cycliste", CYC.mode);
    MONTURES.cycliste = CYC.mode === "sprite" ? SPRITE : TROIS_D; if (CYC.mode === "3d") cacherCyclisteSprite();
  };
  if (CYC.mode === "sprite" && cycSprite()) MONTURES.cycliste = SPRITE; else CYC.mode = "3d";
  const cacher3D = cacherVelo;   // monture.js l'appelle pour toute monture sans vélo 3D : le sprite se cache, puis pedalerSprite le remontre s'il est la monture du moment
  cacherVelo = function () { cacher3D(); cacherCyclisteSprite(); };
}
