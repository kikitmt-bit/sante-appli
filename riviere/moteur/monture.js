/* ============ la monture : ton Pokémon sur la piste. Il nage, il court, il prend la corde, il saute pour de vrai ============ */
// La surface de la piste choisit la monture (SURFACES.eau.monture = "nageur") : le même Pokémon nage dans l'eau et court sur la terre.
// Ajouter une monture = ajouter une entrée à MONTURES.
const MONTURES = {
  nageur: {enfonce: .42, foulee: 0},     // dans l'eau jusqu'à mi-corps
  coureur: {enfonce: 0, foulee: .09},    // posé sur le sol, il rebondit à chaque foulée
};
const PESANTEUR = 7;   // celle du jeu (m/s²) : un peu plus douce que la vraie, les sauts durent
const M = {y: null, vy: 0, air: false, d: 0, sorti: 0, trace: 0, liquide: true, couleur: null};

/* la corde : dans un virage, il se décale vers l'intérieur */
function trajectoire(s) { const P = PISTE, i = idx(s + 4); return clamp(P.COURB[i] * 60, -1, 1) * P.W[i] * .42; }
function retomber(S, choc) {
  gerbe(S.s, clamp(choc / 5, .4, 1.4), M.d, M.y); sonPlouf(clamp(choc / 6, .35, 1), M.liquide); CAM.choc = Math.min(.5, choc * .07);
}
function animerMonture(t, dt, S) {
  const a = at(S.s), sol = a.y, surf = surface(S.s), mt = MONTURES[surf.monture] || MONTURES.nageur;
  M.liquide = !!surf.liquide;
  const couleur = M.liquide ? "#F2FBFF" : surf.poussiere || "#D9B886";
  if (couleur !== M.couleur) { M.couleur = couleur; GOUTTES.m.material.color.set(couleur); }
  M.d += (trajectoire(S.s) - M.d) * clamp(dt * 1.5, 0, 1);
  // le vrai saut : quand le sol se dérobe plus vite qu'il ne tombe, il s'envole, puis retombe
  if (M.y === null || S.fige || !(dt > 0)) { M.y = sol; M.vy = 0; M.air = false; }
  else if (M.air) {
    M.vy -= PESANTEUR * dt; M.y += M.vy * dt;
    if (M.y <= sol) { const choc = -M.vy; M.y = sol; M.vy = 0; M.air = false; retomber(S, choc); }
  } else {
    const vSol = (sol - M.y) / dt, libre = M.vy - PESANTEUR * dt;
    if (vSol < libre - 1 && S.vd > .5) { M.air = true; M.vy = libre; M.y += M.vy * dt; gerbe(S.s, .7, M.d, M.y); }
    else { M.vy = clamp(vSol, -12, 12); M.y = sol; }
  }
  // un tronc : il saute par-dessus, comme un dauphin ; des rondins : il passe dessous (la hauteur dépend de sa position, pas du temps)
  let bond = 0;
  for (const e of MONDE.evenements) {
    const d = ecart(S.s, e.s);
    if (e.type === "saut" && d > -4.5 && d < 4.5) bond = Math.sin((d + 4.5) / 9 * Math.PI) * 1.9;
    else if (e.type === "plongee" && d > -3.5 && d < 4) bond = -Math.sin((d + 3.5) / 7.5 * Math.PI) * 1.7;
  }
  const bondit = Math.abs(bond) > .25;
  if (bondit !== M.bondit) { M.bondit = bondit; gerbe(S.s, .9, M.d, sol); sonPlouf(.5, M.liquide); }
  S.enAir = M.air || bondit;
  M.sorti += ((M.air ? 1 : 0) - M.sorti) * clamp(dt * 8, 0, 1);
  // la poussière de la course, sur la terre
  if (!M.liquide && !S.enAir && S.vd > 1) {
    M.trace += S.vd * dt;
    if (M.trace > 1.1) {
      M.trace = 0; const p = pose(S.s - .4, M.d), G = GOUTTES;
      for (let j = 0; j < 3; j++) {
        const k = G.k = (G.k + 1) % G.n; G.p[k * 3] = p.x + (Math.random() - .5) * .5; G.p[k * 3 + 1] = M.y + .08; G.p[k * 3 + 2] = p.z + (Math.random() - .5) * .5; G.sol[k] = M.y - .1;
        G.v[k * 3] = (Math.random() - .5) * 1.2; G.v[k * 3 + 1] = 1 + Math.random() * 1.4; G.v[k * 3 + 2] = (Math.random() - .5) * 1.2; G.vie[k] = 1;
      }
    }
  }
  EAU_U.uNag.value.set(S.s, M.d, S.vn, S.enAir || !M.liquide ? 1 : 0);
  const N = nageur; if (!N) return;
  const p = pose(S.s, M.d), k = PISTE.COURB[idx(S.s + 2)];
  N.rangee(k > .028 ? 3 : k < -.028 ? 5 : 4);   // dans un virage serré, il se tourne du côté du virage
  N.image(N.pl.image(t * (M.liquide ? .45 + S.vn * .2 : .7 + S.vn * 1.2)));
  const corps = M.liquide ? (-N.h * mt.enfonce + Math.sin(t * 3) * .03 + S.elan * .03) * (1 - M.sorti) : Math.abs(Math.sin(t * (5 + S.vn * 7))) * mt.foulee * (S.vd > .4 ? 1 : 0) * (1 - M.sorti);
  N.m.position.set(p.x, M.y + corps + bond * (bond > 0 ? 1 : N.h), p.z); N.regarder();
}
/* à quelle hauteur dessiner un autre pantin au mètre s (le fantôme) */
function hauteurPantin(s, N, t) { return at(s).y + (surface(s).liquide ? -N.h * .42 + Math.sin(t * 3 + 1) * .03 : 0); }
