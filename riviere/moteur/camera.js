/* ============ la caméra : derrière ta monture, elle suit la pente, se penche dans les virages et accompagne les sauts ============ */
// Une pièce du niveau peut la régler : "camera": {"haut": 1.5, "recul": 2} (plus haute au-dessus d'un lac, plus loin dans une descente).
const VUE = {mode: PARAMS.get("vue") || "jeu"};
const CAM = {y: null, ly: 0, roulis: 0, saut: 0, choc: 0, z1: null, z2: 0, g: null, h: 1.95};
/* le zoom de la vitesse (Kiki, 11/11) : à l'arrêt la caméra est plus près, à l'allure de croisière comme avant, en turbo un peu plus loin.
   Il suit la vitesse du DÉCOR (une côte freine : elle se rapproche) à travers deux filtres lents : on ne le voit jamais bouger. */
// S.croisiere : les m/s de décor à l'allure habituelle (donnés par le jeu, qui connaît la machine).
/* la vitrine (12/11) : au menu, à vélo, la caméra tourne lentement autour de ton dresseur et de son Pokémon, de face puis de côté ;
   au départ, elle glisse derrière lui en 2 à 3 secondes (en tournant autour, jamais à travers). ?vitrine=1 : la garder pendant la course. */
const VITRINE = {f: 1, a: 0, l: 0}, cam_cv = new THREE.Vector3(), cam_cb = new THREE.Vector3(), cam_cr = new THREE.Vector3();
function vitrine(dt, S) {
  const voulue = (!S.mode && VUE.mode === "jeu" && !(typeof BANC !== "undefined" && BANC)) || PARAMS.has("vitrine") ? 1 : 0, V = VITRINE;
  V.f += (voulue - V.f) * (dt > 0 ? 1 - Math.exp(-dt / (voulue ? .5 : .85)) : 1); V.a += (dt || 0) * .16;
  const f = lisse(0, 1, V.f); if (f < .002) return 0;
  const b = VELO.g.position, h = at(S.s).h, fx = Math.sin(h), fz = -Math.cos(h), rx = Math.cos(h), rz = Math.sin(h);   // l'avant et la droite du vélo
  // la caméra normale, vue depuis le vélo : son angle autour de lui, sa distance, sa hauteur
  const ox = camera.position.x - b.x, oz = camera.position.z - b.z, bn = Math.atan2(ox * rx + oz * rz, ox * fx + oz * fz), Rn = Math.hypot(ox, oz), Hn = camera.position.y - b.y;
  V.l += ((!S.mode && innerWidth > 900 && innerWidth > innerHeight ? 1 : 0) - V.l) * (dt > 0 ? 1 - Math.exp(-dt / .85) : 1);   // au menu, sur une tablette : le cycliste en entier, à gauche du panneau
  const large = lisse(0, 1, V.l), bo = .45 + 1.05 * (.5 - .5 * Math.cos(V.a)), Ro = lerp(2.75, 5, large) + .25 * Math.sin(V.a * .7), Ho = 1.15 + .25 * Math.sin(V.a * .5);   // de trois-quarts face à profil, à droite (le côté du pied à terre)
  let db = bo - bn; db -= Math.round(db / (Math.PI * 2)) * Math.PI * 2;
  const be = bn + db * f, R = lerp(Rn, Ro, f), H = lerp(Hn, Ho, f);
  camera.position.set(b.x + (Math.cos(be) * fx + Math.sin(be) * rx) * R, b.y + H, b.z + (Math.cos(be) * fz + Math.sin(be) * rz) * R);
  cam_cb.set(b.x + fx * .2, b.y + .85, b.z + fz * .2);
  if (large > .001) { cam_cr.set(cam_cb.z - camera.position.z, 0, camera.position.x - cam_cb.x).normalize(); cam_cb.addScaledVector(cam_cr, -2.3 * large); }
  cam_cv.lerp(cam_cb, f); return f;
}
function cadrer(dt, S, T) {   // S : l'état du jeu (s, vn, fige) ; T : le temps des animations
  if (VUE.mode === "haut") {   // le plan vu du ciel
    const G = CASES, cx = (G.xa + G.xb) / 2, cz = (G.za + G.zb) / 2, h = Math.max(G.xb - G.xa, G.zb - G.za) * .75 + 260;
    camera.position.set(cx, h, cz + 1); camera.lookAt(cx, 0, cz); return;
  }
  if (VUE.mode === "gauche" || VUE.mode === "droite") {   // pour vérifier une rive, de face
    const sg = VUE.mode === "gauche" ? -1 : 1, c = pose(S.s, -sg * 3), d = pose(S.s, sg * 30);
    camera.position.set(c.x, c.y + 2.6, c.z); camera.lookAt(d.x, d.y + 3, d.z); return;
  }
  const zc = clamp((S.vd || 0) / (S.croisiere || 3.6 * ALLURE), 0, 1.4), kz = CAM.z1 === null || S.fige || !(dt > 0) ? 1 : 1 - Math.exp(-dt / 1.4);
  if (CAM.z1 === null) { CAM.z1 = zc; CAM.z2 = zc; }
  CAM.z1 += (zc - CAM.z1) * kz; CAM.z2 += (CAM.z1 - CAM.z2) * kz;
  const dz = CAM.z2 - 1;   // -1 à l'arrêt, 0 en croisière, jusqu'à +0,4 en turbo
  // à vélo : de trois-quarts arrière, un peu à droite (le côté de la chaîne) et un peu plus haut, pour voir le vélo, ses roues et ses pédales (12/11)
  const velo = typeof VELO !== "undefined" && VELO.g && VELO.g.visible, lat = velo ? 1.05 : 0;
  // le gabarit (14/11) : chaque Pokémon nage à sa vraie taille ; pour un grand, la caméra recule et monte (elle se rapproche d'un petit), sans à-coup.
  // Sous une voûte, elle ne monte pas plus haut que 2,9 m : elle reste dans le tunnel.
  const P = PISTE, i = idx(S.s), gab = velo ? 1 : GABARIT.f, kg = CAM.g === null || S.fige || !(dt > 0) ? 1 : 1 - Math.exp(-dt / .9);
  if (CAM.g === null) CAM.g = gab;
  CAM.g += (gab - CAM.g) * kg;
  const g = CAM.g, recul = (5.5 + S.vn * .8 + dz * .7) * g + P.CAMR[i] - (velo ? 1.6 : 0), c = pose(S.s - recul, M.d * .6 + lat), d = pose(S.s + (velo ? 7 : 10 * g), M.d * .3 - lat * .1);
  const voute = g > 1.05 && (P.TUN[i] || P.TUN[idx(S.s + 16)] || P.TUN[idx(S.s - recul)]);
  CAM.h += ((voute ? Math.min(1.95 * g, 2.9) : 1.95 * g) - CAM.h) * kg;
  const yc = c.y + CAM.h + (velo ? .45 : 0) + dz * .15 + P.CAMH[i], yl = d.y + (velo ? -.55 : .8 * g), net = CAM.y === null || S.fige || !(dt > 0), k = net ? 1 : 1 - Math.exp(-dt / .16);
  if (CAM.y === null) { CAM.y = yc; CAM.ly = yl; }
  CAM.y += (yc - CAM.y) * k; CAM.ly += (yl - CAM.ly) * k;
  CAM.saut += ((M.y === null ? 0 : M.y - at(S.s).y) * .55 - CAM.saut) * k;   // un saut : la caméra le suit à moitié
  CAM.choc = Math.max(0, CAM.choc - (dt || 0) * 1.6);                          // une retombée : une petite secousse
  camera.position.set(c.x, CAM.y + CAM.saut - CAM.choc * Math.abs(Math.sin(T * 30)) * .25, c.z);
  cam_cv.set(d.x, CAM.ly + CAM.saut * .6, d.z);
  const vit = velo ? vitrine(dt, S) : 0; camera.lookAt(cam_cv);
  const roulis = clamp(-P.COURB[idx(S.s + 3)] * 1.5, -.11, .11) * (.35 + .65 * Math.min(1, S.vn));   // elle se penche dans le virage, d'autant plus qu'on va vite
  CAM.roulis += (roulis - CAM.roulis) * (net ? 1 : 1 - Math.exp(-dt / .35));
  camera.rotateZ(CAM.roulis * (1 - vit));
  let fov = lerp(58 + S.vn * 9 + dz * 7, 46, vit);   // plus on va vite, plus le champ s'ouvre : le décor file sur les côtés
  if (camera.aspect < 1) fov = Math.min(92, 2 * Math.atan(Math.tan(fov * Math.PI / 360) / camera.aspect) * 180 / Math.PI);   // en portrait : on garde la largeur de vue
  if (Math.abs(fov - camera.fov) > .05) { camera.fov = fov; camera.updateProjectionMatrix(); }
}
