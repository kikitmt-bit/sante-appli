/* ============ les sprites qui suivent la caméra (17/11, Kiki : le film de fin montre ton personnage de face, de côté, d'en haut…) ============ */
// Un sprite est une image plate : on choisit l'image d'après l'angle entre la direction où va le personnage et celle d'où regarde la caméra.
// Les Pokémon de Donjon Mystère ont 8 directions (rangées : 0 = de face, 2 = vers la droite de l'écran, 4 = de dos, 6 = vers la gauche).
// Pendant le jeu, la caméra est derrière toi : on garde la règle d'avant (de dos, tourné du côté d'un virage serré), identique au pixel près.
// Dès que la caméra n'est plus derrière (le film de fin, la vitrine du menu), c'est l'angle de la caméra qui choisit.
// Le cycliste en sprite (cycliste_sprite.js) a ses propres vues : il utilise angleVue.
function angleVue(x, z, fx, fz) {   // l'angle de la marche vue de la caméra : 0 = il s'éloigne (de dos), positif = il va vers la droite de l'écran, ±π = de face
  const cx = x - camera.position.x, cz = z - camera.position.z, l = Math.hypot(cx, cz) || 1, ax = cx / l, az = cz / l, lf = Math.hypot(fx, fz) || 1;
  return Math.atan2((fx * -az + fz * ax) / lf, (fx * ax + fz * az) / lf);
}
const rangeeVue = a => ((4 - Math.round(a / (Math.PI / 4))) % 8 + 8) % 8;
const DERRIERE = Math.PI / 6;   // jusqu'à 30° : la caméra est « derrière » (le jeu)
function avanceEn(s, d) { const a = pose(s, d), b = pose(s + 1, d); return [b.x - a.x, b.z - a.z]; }   // où va la piste au mètre s
/* ton Pokémon (ou son fantôme) : la rangée vue de la caméra ; il garde la même image d'animation quand il change de rangée */
function orienterPantin(N, s, d = 0, serre = .028) {   // serre : la courbe à partir de laquelle il se tourne (le trotteur : un vrai lacet seulement)
  const [fx, fz] = avanceEn(s, d), a = angleVue(N.m.position.x, N.m.position.z, fx, fz), k = PISTE.COURB[idx(s + 2)];
  const r = Math.abs(a) < DERRIERE ? (k > serre ? 3 : k < -serre ? 5 : 4) : rangeeVue(a);   // derrière : dans un virage serré, il se tourne du côté du virage (comme avant)
  if (r === N.rang) return;
  const i = N.i; N.rangee(r); if (i >= 0 && N.i < 0) N.image(i);
}
