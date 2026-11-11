/* ============ la caméra : derrière ta monture, elle suit la pente, se penche dans les virages et accompagne les sauts ============ */
// Une pièce du niveau peut la régler : "camera": {"haut": 1.5, "recul": 2} (plus haute au-dessus d'un lac, plus loin dans une descente).
const VUE = {mode: PARAMS.get("vue") || "jeu"};
const CAM = {y: null, ly: 0, roulis: 0, saut: 0, choc: 0};
function cadrer(dt, S, T) {   // S : l'état du jeu (s, vn, fige) ; T : le temps des animations
  if (VUE.mode === "haut") {   // le plan vu du ciel
    const G = CASES, cx = (G.xa + G.xb) / 2, cz = (G.za + G.zb) / 2, h = Math.max(G.xb - G.xa, G.zb - G.za) * .75 + 260;
    camera.position.set(cx, h, cz + 1); camera.lookAt(cx, 0, cz); return;
  }
  if (VUE.mode === "gauche" || VUE.mode === "droite") {   // pour vérifier une rive, de face
    const sg = VUE.mode === "gauche" ? -1 : 1, c = pose(S.s, -sg * 3), d = pose(S.s, sg * 30);
    camera.position.set(c.x, c.y + 2.6, c.z); camera.lookAt(d.x, d.y + 3, d.z); return;
  }
  const P = PISTE, i = idx(S.s), recul = 5.5 + S.vn * .8 + P.CAMR[i], c = pose(S.s - recul, M.d * .6), d = pose(S.s + 10, M.d * .3);
  const yc = c.y + 1.95 + P.CAMH[i], yl = d.y + .8, net = CAM.y === null || S.fige || !(dt > 0), k = net ? 1 : 1 - Math.exp(-dt / .16);
  if (CAM.y === null) { CAM.y = yc; CAM.ly = yl; }
  CAM.y += (yc - CAM.y) * k; CAM.ly += (yl - CAM.ly) * k;
  CAM.saut += ((M.y === null ? 0 : M.y - at(S.s).y) * .55 - CAM.saut) * k;   // un saut : la caméra le suit à moitié
  CAM.choc = Math.max(0, CAM.choc - (dt || 0) * 1.6);                          // une retombée : une petite secousse
  camera.position.set(c.x, CAM.y + CAM.saut - CAM.choc * Math.abs(Math.sin(T * 30)) * .25, c.z);
  camera.lookAt(d.x, CAM.ly + CAM.saut * .6, d.z);
  const roulis = clamp(-P.COURB[idx(S.s + 3)] * 1.5, -.11, .11) * (.35 + .65 * Math.min(1, S.vn));   // elle se penche dans le virage, d'autant plus qu'on va vite
  CAM.roulis += (roulis - CAM.roulis) * (net ? 1 : 1 - Math.exp(-dt / .35));
  camera.rotateZ(CAM.roulis);
  let fov = 58 + S.vn * 9;   // plus on va vite, plus le champ s'ouvre : le décor file sur les côtés
  if (camera.aspect < 1) fov = Math.min(92, 2 * Math.atan(Math.tan(fov * Math.PI / 360) / camera.aspect) * 180 / Math.PI);   // en portrait : on garde la largeur de vue
  if (Math.abs(fov - camera.fov) > .05) { camera.fov = fov; camera.updateProjectionMatrix(); }
}
