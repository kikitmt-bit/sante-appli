/* ============ le décor : d'abord les lieux (posés exactement), puis les règles de la région (posées au hasard, semé par le niveau) ============ */
// Un lieu (Bourg Palette…) est décrit une fois dans lieux/<région>.json : une liste d'objets, chacun à « a » mètres le long de la rive
// et « e » mètres du bord de l'eau. Un niveau le pose en une ligne. Une règle de la région dit : quels objets, sur quelles rives,
// dans quelle bande de distance au bord, tous les combien de mètres. Même niveau, même graine : toujours le même décor.
// Les registres : le contenu (contenu/objets/*.js) y ajoute ses recettes, sans toucher au moteur.
const PAL = couleurs(BIOME.palette);
const OBJETS = {}, RAYON = {}, EVENEMENTS = {};   // les recettes ; la place que prend chaque objet (m) ; les objets qui font réagir la monture ("saut", "plongee")
const MONDE = {etiquettes: [], animes: [], sprites: [], evenements: [], poses: [], lumieres: [], sons: []};
const K_MONDE = {
  etiquette(F, texte, x, y, z, l, h) { const [X, Z] = F.monde(x, z); MONDE.etiquettes.push({texte, x: X, y: F.oy + y * F.k, z: Z, lacet: F.lacet, l: l * F.k, h: h * F.k}); },
  anime(F, x, y, z, recette, vitesse) { const [X, Z] = F.monde(x, z), P = new Forme(); recette(P); MONDE.animes.push({forme: P, x: X, y: F.oy + y * F.k, z: Z, lacet: F.lacet, vitesse}); },
  sprite(F, cle, o) { MONDE.sprites.push({cle, x: F.ox, y: F.oy, z: F.oz, lacet: F.lacet, taille: o.taille || 1, vole: (o.haut || 0) > 1.5 && !o.pose, bouge: o.bouge || null, s: o._s, cote: o._cote, e: o._e}); },
  son(F, x, y, z, fort = .08, portee = 80) { const [X, Z] = F.monde(x, z); MONDE.sons.push({x: X, y: F.oy + y * F.k, z: Z, fort, portee}); },   // un bruit d'eau qui s'entend selon la distance (une cascade)
  lumiere(F, x, y, z, couleur, taille = 3, toujours = false) { const [X, Z] = F.monde(x, z); MONDE.lumieres.push({x: X, y: F.oy + y * F.k, z: Z, c: couleur, t: taille * F.k, toujours}); },   // une lueur : la nuit (une lampe, une fenêtre), ou toujours (un cristal, de la lave)
};
function poserDecor() {   // tout placer (aucun appel à three.js : se contrôle sans navigateur)
  const P = PISTE, R = hasard((NIVEAU.graine || 1) * 7919 + 1), formes = new Map(), reserves = [], pris = new Map(), poses = [];
  const forme = s => { const k = Math.floor(idx(s) / 48); if (!formes.has(k)) formes.set(k, new Forme()); return formes.get(k); };
  const libre = (x, z, r) => { const ci = Math.floor(x / 8), cj = Math.floor(z / 8); for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) for (const o of pris.get(i + "," + j) || []) if (Math.hypot(o.x - x, o.z - z) < r + o.r) return false; return true; };
  const occuper = (x, z, r) => { const k = Math.floor(x / 8) + "," + Math.floor(z / 8); if (!pris.has(k)) pris.set(k, []); pris.get(k).push({x, z, r}); };
  for (let i = 0; i < P.N; i += 3) if (P.PONT[i]) occuper(P.X[i], P.Z[i], P.W[i] + 3);   // rien ne pousse à travers un pont
  for (let i = 0; i < P.N; i += 2) if (P.CROIX[i]) occuper(P.X[i], P.Z[i], P.W[i] + 2);   // ni au milieu d'un carrefour
  function poser(nom, s, cote, e, o = {}, ech = 1) {
    const recette = OBJETS[nom]; if (!recette) { console.warn("Objet inconnu : " + nom); return; }
    const a = at(s), sg = cote === "g" ? -1 : 1, q = cote === "c" || cote === "portail" ? pose(s, e || 0) : pose(s, sg * (a.w + e));
    const y = (cote === "c" || o.flotte ? a.y : cote === "portail" ? a.y + hRive(idx(s), 0, 2) + .5 : hauteur(q.x, q.z)) + (o.haut || 0);   // flotte : sur l'eau, contre la rive (un bateau, un ponton ; e négatif)   // « portail » : perché au-dessus de l'entrée d'une grotte ; haut : sur un toit, en l'air
    let lacet = Math.atan2(-sg * Math.cos(a.h), -sg * Math.sin(a.h));   // de face pour qui est sur l'eau
    if (o.face === "arrivant") lacet += sg * 62 * Math.PI / 180;        // tourné vers celui qui arrive (un panneau)
    if (o.tourne) lacet += o.tourne * Math.PI / 180;
    recette(forme(s).poser(q.x, y, q.z, lacet, ech).matiere(2), Object.assign({eau: a.w * 2, _s: s, _cote: cote, _e: e || 0}, o), R, K_MONDE); if (EVENEMENTS[nom]) MONDE.evenements.push({s: BOUCLE ? idx(s) : s, type: EVENEMENTS[nom]});   // un tronc, des rondins : ton Pokémon saute ou plonge
    occuper(q.x, q.z, (o.r === undefined ? RAYON[nom] || 1 : o.r) * ech); poses.push({nom, s, cote, e});   // (11/11 : ces deux appels étaient avalés par le commentaire ci-dessus : aucun contrôle de place, aucun Pokémon caché derrière un arbre)
  }
  // 1) les lieux et les objets que le niveau pose exactement
  for (const pc of P.pieces) {
    for (const L of pc.lieux || []) { const lieu = LIEUX[L.lieu]; if (!lieu) { console.warn("Lieu inconnu : " + L.lieu); continue; } const s0 = pc.s0 + (L.a || 0);
      reserves.push({cote: L.cote, s0: s0 - 3, s1: s0 + lieu.long + 3, e: lieu.prof});
      for (const o of lieu.objets) poser(o.o, s0 + o.a, L.cote, o.e, o); }
    for (const o of pc.objets || []) if (!o.surface || o.surface === pc.surface) poser(o.o, o.cote === "portail" ? (o.sortie ? pc.s1 - MARGE - 1.2 : pc.s0 + MARGE + 1.2) : pc.s0 + o.a, o.cote, o.e, o);
  }
  // 2) les règles de la région
  const reserve = (s, cote, e) => reserves.some(z => z.cote === cote && s > z.s0 && s < z.s1 && e < z.e);
  for (const r of BIOME.regles) { const sur = r.sur.map(t => TYPES.indexOf(t)), total = Object.values(r.objets).reduce((a, b) => a + b, 0);
    if (r.derriere) {  // caché derrière un arbre déjà posé : il dépasse du tronc, on est content de le repérer
      let dernier = -1e9; const nom = Object.keys(r.objets)[0];
      for (const p of poses.filter(p => r.derriere.includes(p.nom) && p.e >= r.bande[0] && p.e <= r.bande[1] && p.cote !== "c").sort((a, b) => a.s - b.s)) { const i = idx(p.s), PW = p.cote === "g" ? P.PG : P.PD; let w = 0; for (const t of sur) w += PW[i * NT + t];
        if (w < .6 || p.s - dernier < r.pas * (.6 + R() * .8)) continue; dernier = p.s; poser(nom, p.s + .55, p.cote, p.e + .9, Object.assign({r: .3}, r.reglages, r.nums ? {num: r.nums[Math.floor(R() * r.nums.length)]} : null)); }
      continue; }
    for (const cote of ["g", "d"]) { const sg = cote === "g" ? -1 : 1, PW = cote === "g" ? P.PG : P.PD; let s = R() * r.pas;
      for (; s < LONG; s += r.pas * (.5 + R())) { const i = idx(s); let w = 0; for (const t of sur) w += PW[i * NT + t]; if (w < .6 || P.PONT[i]) continue;
        const e = lerp(r.bande[0], r.bande[1], R()), ech = r.echelle ? lerp(r.echelle[0], r.echelle[1], R()) : 1; let nom = Object.keys(r.objets)[0], t = R() * total; for (const [k, v] of Object.entries(r.objets)) { if ((t -= v) <= 0) { nom = k; break; } }
        if (reserve(s, cote, e) || (r.sauf || []).includes(pieceEn(s).titre)) continue;
        const q = pose(s, sg * (at(s).w + e)); pres(q.x, q.z); if (Math.abs(Q.e - e) > 1.5) continue;   // dans un virage serré, ce point est en fait plus près d'un autre bout de rivière
        const y = hauteur(q.x, q.z); if (Q.e < .3 || y - P.Y[Q.i] < (DISC_PISTE === "terre" ? -90 : .15)) continue;   // jamais sur une route ; sur l'eau, jamais au ras de l'eau
        if (r.plat !== undefined) { const q3 = pose(s, sg * (at(s).w + 3)); if (hauteur(q3.x, q3.z) - P.Y[Q.i] > r.plat) continue; }   // plat : la rive, à 3 m du bord, ne monte pas plus haut (des roseaux jamais au pied d'une paroi)
        const pente = Math.max(Math.abs(hauteur(q.x + 1.5, q.z) - hauteur(q.x - 1.5, q.z)), Math.abs(hauteur(q.x, q.z + 1.5) - hauteur(q.x, q.z - 1.5))) / 3; if (pente > (r.pente || .45)) continue;
        const rayon = (RAYON[nom] || 1) * ech * (r.serre || 1); if (!libre(q.x, q.z, rayon)) continue;
        poser(nom, s, cote, e, Object.assign({r: (RAYON[nom] || 1) * (r.serre || 1)}, r.reglages, r.nums ? {num: r.nums[Math.floor(R() * r.nums.length)]} : null), ech); } } }
  MONDE.poses = poses;
  return formes;
}
function construireDecor() {
  const formes = poserDecor();
  for (const F of formes.values()) { const m = F.maille(); if (m) { m.name = "decor"; scene.add(m); } }
  // les étiquettes (le texte des panneaux) et les objets qui tournent
  for (const e of MONDE.etiquettes) { const c = toile(Math.round(e.l * 28), Math.round(e.h * 28), x => { x.fillStyle = "#" + PAL.planche.map(v => Math.round(v * 255).toString(16).padStart(2, "0")).join(""); x.fillRect(0, 0, 999, 999); x.fillStyle = "#3A2A18"; x.textAlign = "center"; x.textBaseline = "middle";
      let px = Math.round(e.h * 28 * .8); x.font = px + 'px "Jersey 15", monospace'; while (x.measureText(e.texte).width > e.l * 28 - 6 && px > 6) { px--; x.font = px + 'px "Jersey 15", monospace'; } x.fillText(e.texte, e.l * 14, e.h * 14 + 1); });
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(e.l, e.h), new THREE.MeshBasicMaterial({map: t})); m.position.set(e.x, e.y, e.z); m.rotation.y = e.lacet; scene.add(m); }
  for (const a of MONDE.animes) { a.maille = a.forme.maille(); a.maille.position.set(a.x, a.y, a.z); a.maille.rotation.order = "YXZ"; a.maille.rotation.y = a.lacet; scene.add(a.maille); }
}
function animerDecor(t) { for (const a of MONDE.animes) a.maille.rotation.z = t * a.vitesse; }
