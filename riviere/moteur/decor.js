/* ============ le décor : d'abord les lieux (posés exactement), puis les règles de la région (posées au hasard, semé par le niveau) ============ */
// Un lieu (Bourg Palette…) est décrit une fois dans lieux/<région>.json : une liste d'objets, chacun à « a » mètres le long de la rive
// et « e » mètres du bord de l'eau. Un niveau le pose en une ligne. Une règle de la région dit : quels objets, sur quelles rives,
// dans quelle bande de distance au bord, tous les combien de mètres. Même niveau, même graine : toujours le même décor.
// Les registres : le contenu (contenu/objets/*.js) y ajoute ses recettes, sans toucher au moteur.
const PAL = couleurs(BIOME.palette);
// les registres : les recettes ; la place que prend chaque objet (m) ; les objets qui font réagir la monture ("saut", "plongee") ;
// les grands repères au loin (contenu/lointains, dessinés par rendu.js). Tous ici : decor.js est un module pur, que le contrôle sans dessin charge.
const OBJETS = {}, RAYON = {}, EVENEMENTS = {}, LOINTAINS = {};
/* (17/11) la place d'un objet étendu (une rue qui part, un rond-point) : EMPRISE[nom] = o => [[x, z, r], …] dans le repère de l'objet ;
   rien d'autre ne sera posé dans ces ronds (une règle ne pose un tel objet que si tous ses ronds sont libres) */
const EMPRISE = {};
const MONDE = {etiquettes: [], animes: [], sprites: [], evenements: [], poses: [], lumieres: [], sons: []};
/* ce qu'une recette peut laisser dans le monde, en plus de ses volumes. Une fabrique : le monde entier a ses listes (MONDE), un tronçon a les siennes (troncons.js) */
const kMonde = MONDE => ({
  etiquette(F, texte, x, y, z, l, h) { const [X, Z] = F.monde(x, z); MONDE.etiquettes.push({texte, x: X, y: F.oy + y * F.k, z: Z, lacet: F.lacet, l: l * F.k, h: h * F.k}); },
  anime(F, x, y, z, recette, vitesse) { const [X, Z] = F.monde(x, z), P = new Forme(); recette(P); MONDE.animes.push({forme: P, x: X, y: F.oy + y * F.k, z: Z, lacet: F.lacet, vitesse}); },
  sprite(F, cle, o) { MONDE.sprites.push({cle, x: F.ox, y: F.oy, z: F.oz, lacet: F.lacet, taille: o.taille || 1, vole: (o.haut || 0) > 1.5 && !o.pose, bouge: o.bouge || null, s: o._s, cote: o._cote, e: o._e, v: o._v}); },
  son(F, x, y, z, fort = .08, portee = 80) { const [X, Z] = F.monde(x, z); MONDE.sons.push({x: X, y: F.oy + y * F.k, z: Z, fort, portee}); },   // un bruit d'eau qui s'entend selon la distance (une cascade)
  lumiere(F, x, y, z, couleur, taille = 3, toujours = false) { const [X, Z] = F.monde(x, z); MONDE.lumieres.push({x: X, y: F.oy + y * F.k, z: Z, c: couleur, t: taille * F.k, toujours}); },   // une lueur : la nuit (une lampe, une fenêtre), ou toujours (un cristal, de la lave)
});
const K_MONDE = kMonde(MONDE);
/* tout placer (aucun appel à three.js : se contrôle sans navigateur).
   (16/11, étape 8, lot 3) Sur une longue route, le monde est construit par tronçons (troncons.js) : poserDecorPas(Z) ne pose alors que le décor
   du tronçon Z, de Z.a à Z.b mètres, avec son propre hasard (Z.R, Z.RF) et ses propres listes (Z.monde, Z.K), en rendant la main entre deux
   règles (yield) : le jeu ne se fige pas. Z.voisins : la place déjà prise par les tronçons d'à côté ; Z.occ : celle qu'il prend. Sans Z : tout le circuit, d'un coup, comme toujours. */
const TRONCON_M = 48;   // la longueur d'un tronçon de décor (m)
function zoneTroncon(k, voisins) {   // le tronçon numéro k : ses mètres, son hasard (la graine du niveau et son numéro : toujours le même décor), ses listes
  const n = Math.ceil(LONG / TRONCON_M), g = NIVEAU.graine || 1, M = {etiquettes: [], animes: [], sprites: [], evenements: [], poses: [], lumieres: [], sons: [], masse: 0};
  return {k, a: k * TRONCON_M, b: Math.min((k + 1) * TRONCON_M, LONG), premier: k === 0, dernier: k === n - 1, R: hasard(g * 7919 + 1 + k * 104729), RF: hasard(g * 4409 + 3 + k * 15485863), monde: M, K: kMonde(M), occ: [], voisins: voisins || []};
}
/* l'orientation d'un objet posé : de face pour qui passe ; « arrivant » : tourné vers celui qui arrive (un panneau) ; « tourne » : en plus, en degrés */
function lacetDe(a, sg, o) { let l = Math.atan2(-sg * Math.cos(a.h), -sg * Math.sin(a.h)); if (o.face === "arrivant") l += sg * 62 * Math.PI / 180; if (o.tourne) l += o.tourne * Math.PI / 180; return l; }
function emprise(nom, o, q, lacet, ech) { const cs = Math.cos(lacet), sn = Math.sin(lacet); return EMPRISE[nom](o).map(([x, z, r]) => [q.x + (x * cs + z * sn) * ech, q.z + (-x * sn + z * cs) * ech, r * ech]); }
/* (17/11, Kiki : « une autoroute ne devient pas d'un coup un chemin de terre ») là où la ligne passe d'une route (goudron, pavés) à un chemin (terre),
   la route continue tout droit et c'est le chemin qui s'en va : la région dit quel objet la dessine ("jonctions" : {objet, routes, chemins}).
   Seulement si le chemin tourne vraiment (18° au moins dans ses 40 premiers mètres) : sinon les deux se recouvriraient. */
let JONCTIONS_ = null;   // (calculées au premier décor : les recettes du contenu sont chargées après ce fichier)
const JONCTIONS = () => JONCTIONS_ || (JONCTIONS_ = (() => {
  const J = BIOME.jonctions, P = PISTE, o = []; if (!J || DISC_PISTE !== "terre" || !OBJETS[J.objet]) return o;
  const classe = i => { const n = P.surfaces[P.SF[i]]; return (J.routes || []).includes(n) ? "r" : (J.chemins || []).includes(n) ? "c" : null; };
  const H = i => P.H[BOUCLE ? ((i % P.N) + P.N) % P.N : clamp(i, 0, P.N - 1)], tour = (a, b) => { let d = H(a) - H(b); while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
  for (let i = BOUCLE ? 0 : 1; i < P.N; i++) { const j = BOUCLE ? (i + P.N - 1) % P.N : i - 1, a = classe(j), b = classe(i);
    if (!a || !b || a === b || P.FK && P.FK[i] || P.PONT[i] || P.TUN[i]) continue;
    const sens = a === "r" ? 1 : -1, dh = sens > 0 ? tour(i + 40, i - 2) : tour(i + 2, i - 40); if (Math.abs(dh) < .31) continue;
    const route = sens > 0 ? j : i, h0 = H(sens > 0 ? i - 3 : i + 3);
    o.push(Object.assign({o: J.objet, s: i, sens, tourne: (h0 - at(i).h) * 180 / Math.PI, surface: P.surfaces[P.SF[route]], large: P.W[route] * 2, vers: dh > 0 ? 1 : -1}, J.reglages)); }
  return o; })());
function poserDecor(Z) { const g = poserDecorPas(Z); let r; do r = g.next(); while (!r.done); return r.value; }
function* poserDecorPas(Z) {
  const P = PISTE, MD = Z ? Z.monde : MONDE, K = Z ? Z.K : K_MONDE, R = Z ? Z.R : hasard((NIVEAU.graine || 1) * 7919 + 1), formes = new Map(), reserves = [], pris = new Map(), poses = [];
  const ici = s => !Z || ((s >= Z.a || Z.premier) && (s < Z.b || Z.dernier));   // ce mètre est-il dans le tronçon ?
  const forme = s => { const i = idx(s), k = EFFETS.ombres && P.TUN[i] ? "t" + (Z ? "" : Math.floor(i / 48)) : Z ? 0 : Math.floor(i / 48); if (!formes.has(k)) formes.set(k, new Forme()); return formes.get(k); };   // (« t » : dans une grotte, à l'abri des ombres portées : effets.js)
  const libre = (x, z, r) => { const ci = Math.floor(x / 8), cj = Math.floor(z / 8); for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) for (const o of pris.get(i + "," + j) || []) if (Math.hypot(o.x - x, o.z - z) < r + o.r) return false; return true; };
  const occuper = (x, z, r) => { const k = Math.floor(x / 8) + "," + Math.floor(z / 8); if (!pris.has(k)) pris.set(k, []); pris.get(k).push({x, z, r}); };
  const mi = Z ? at((Z.a + Z.b) / 2) : null, pas_loin = i => !Z || Math.hypot(P.X[i] - mi.x, P.Z[i] - mi.z) < 260;   // un tronçon ne regarde que ce qui l'entoure
  for (let i = 0; i < P.M; i += 3) if (P.PONT[i] && pas_loin(i)) occuper(P.X[i], P.Z[i], P.W[i] + 3);   // rien ne pousse à travers un pont
  for (let i = 0; i < P.N; i += 2) if (P.CROIX[i] && pas_loin(i)) occuper(P.X[i], P.Z[i], P.W[i] + 2);   // ni au milieu d'un carrefour
  if (Z) for (const o of Z.voisins) occuper(o.x, o.z, o.r);   // ni dans un objet du tronçon d'à côté
  let exacts = true;   // on en est aux objets posés exactement par le niveau (ils ne regardent pas la place : comme toujours)
  const prendre = (x, z, r) => { occuper(x, z, r); if (Z) Z.occ.push({x, z, r, ex: exacts}); };
  // un objet du niveau posé juste à côté du tronçon (par son voisin) : on lui garde sa place, sans le poser
  const garder = (nom, s, cote, e, o) => { if (!OBJETS[nom] || cote === "c" || cote === "portail" || s < Z.a - 14 || s >= Z.b + 14) return; const q = pose(s, (cote === "g" ? -1 : 1) * (at(s).w + e)); occuper(q.x, q.z, o.r === undefined ? RAYON[nom] || 1 : o.r); };
  function poser(nom, s, cote, e, o = {}, ech = 1) {
    const recette = OBJETS[nom]; if (!recette) { console.warn("Objet inconnu : " + nom); return; }
    const a = at(s), sg = cote === "g" ? -1 : 1, q = cote === "c" || cote === "portail" ? pose(s, e || 0) : pose(s, sg * (a.w + e));
    const y = (cote === "c" || o.flotte ? a.y : cote === "portail" ? a.y + hRive(idx(s), 0, 2) + .5 : hauteur(q.x, q.z)) + (o.haut || 0);   // flotte : sur l'eau, contre la rive (un bateau, un ponton ; e négatif)   // « portail » : perché au-dessus de l'entrée d'une grotte ; haut : sur un toit, en l'air
    const lacet = lacetDe(a, sg, o), oo = Object.assign({eau: a.w * 2, _s: s, _cote: cote, _e: e || 0, _v: P.NF ? VOIES.prise.slice() : null, _vo: P.VO[idx(s)]}, o);
    recette(forme(s).poser(q.x, y, q.z, lacet, ech).matiere(2), oo, R, K); if (EVENEMENTS[nom]) MD.evenements.push({s: BOUCLE ? sLigne(idx(s)) : s, type: EVENEMENTS[nom], vo: P.VO[idx(s)]});   // un tronc, des rondins : ton Pokémon saute ou plonge
    prendre(q.x, q.z, (o.r === undefined ? RAYON[nom] || 1 : o.r) * ech); if (EMPRISE[nom]) for (const [X, Z2, r] of emprise(nom, oo, q, lacet, ech)) prendre(X, Z2, r); poses.push({nom, s, cote, e, v: P.NF ? VOIES.prise.slice() : null});   // (11/11 : ces deux appels étaient avalés par le commentaire ci-dessus : aucun contrôle de place, aucun Pokémon caché derrière un arbre)
  }
  const poserCache = (...args) => { exacts = true; try { poser(...args); } finally { exacts = false; } };   // (collé à son arbre, exprès : lui non plus ne regarde pas la place)
  // 1) les lieux et les objets que le niveau pose exactement
  const exact = pc => {
    for (const L of pc.lieux || []) { const lieu = LIEUX[L.lieu]; if (!lieu) { console.warn("Lieu inconnu : " + L.lieu); continue; } const s0 = pc.s0 + (L.a || 0);
      reserves.push({cote: L.cote, s0: s0 - 3, s1: s0 + lieu.long + 3, e: lieu.prof, vo: P.VO[idx(s0)]});
      for (const o of lieu.objets) { if (ici(s0 + o.a)) poser(o.o, s0 + o.a, L.cote, o.e, o); else garder(o.o, s0 + o.a, L.cote, o.e, o); } }
    for (const o of pc.objets || []) if (!o.surface || o.surface === pc.surface) { const s = o.cote === "portail" ? (o.sortie ? pc.s1 - MARGE - 1.2 : pc.s0 + MARGE + 1.2) : pc.s0 + o.a; if (ici(s)) poser(o.o, s, o.cote, o.e, o); else garder(o.o, s, o.cote, o.e, o); }
  };
  for (const j of JONCTIONS()) if (ici(j.s)) poser(j.o, j.s, "c", 0, j); else if (Z) garder(j.o, j.s, "c", 0, j);   // (17/11) une route qui devient un chemin : un embranchement
  for (const pc of P.pieces) { if (Z && (pc.s1 < Z.a - 400 || pc.s0 > Z.b + 400)) continue; if (pc.voie) surLaVoie(pc.voie - 1, () => exact(pc)); else exact(pc); }   // (une pièce de la voie « force » d'une fourche : ses objets sont posés sur elle)
  exacts = false; if (Z) yield;
  // 2) les règles de la région
  const reserve = (s, cote, e) => reserves.some(z => z.cote === cote && s > z.s0 && s < z.s1 && e < z.e && !(z.vo && P.VO[idx(s)] && z.vo !== P.VO[idx(s)]));   // (pas un lieu de l'autre voie d'une fourche)
  for (const r of BIOME.regles) { const sur = r.sur.map(t => TYPES.indexOf(t)), total = Object.values(r.objets).reduce((a, b) => a + b, 0);
    if (r.derriere) {  // caché derrière un arbre déjà posé : il dépasse du tronc, on est content de le repérer
      let dernier = -1e9; const nom = Object.keys(r.objets)[0];
      for (const p of poses.filter(p => r.derriere.includes(p.nom) && p.e >= r.bande[0] && p.e <= r.bande[1] && p.cote !== "c").sort((a, b) => a.s - b.s)) { const i = p.v ? surVoie(p.v, () => idx(p.s)) : idx(p.s), PW = p.cote === "g" ? P.PG : P.PD; let w = 0; for (const t of sur) w += PW[i * NT + t];
        if (w < .6 || p.s - dernier < r.pas * (.6 + R() * .8)) continue; dernier = p.s; const cache = () => poserCache(nom, p.s + .55, p.cote, p.e + .9, Object.assign({r: .3}, r.reglages, r.nums ? {num: r.nums[Math.floor(R() * r.nums.length)]} : null)); if (p.v) surVoie(p.v, cache); else cache(); }
      if (Z) yield;
      continue; }
    const semer = (s0, s1, cotes = ["g", "d"]) => { for (const cote of cotes) { const sg = cote === "g" ? -1 : 1, PW = cote === "g" ? P.PG : P.PD; let s = s0 + R() * r.pas;
      for (; s < s1; s += r.pas * (.5 + R())) { const i = idx(s); let w = 0; for (const t of sur) w += PW[i * NT + t]; if (w < .6 || P.PONT[i]) continue;
        const e = lerp(r.bande[0], r.bande[1], R()), ech = r.echelle ? lerp(r.echelle[0], r.echelle[1], R()) : 1; let nom = Object.keys(r.objets)[0], t = R() * total; for (const [k, v] of Object.entries(r.objets)) { if ((t -= v) <= 0) { nom = k; break; } }
        if (reserve(s, cote, e) || (r.sauf || []).includes(pieceEn(s).titre)) continue;
        const q = pose(s, sg * (at(s).w + e)); pres(q.x, q.z); if (Math.abs(Q.e - e) > 1.5) continue;   // dans un virage serré, ce point est en fait plus près d'un autre bout de rivière
        const y = hauteur(q.x, q.z); if (Q.e < .3 || y - P.Y[Q.i] < (DISC_PISTE === "terre" ? -90 : .15)) continue;   // jamais sur une route ; sur l'eau, jamais au ras de l'eau
        if (r.plat !== undefined) { const q3 = pose(s, sg * (at(s).w + 3)); if (hauteur(q3.x, q3.z) - P.Y[Q.i] > r.plat) continue; }   // plat : la rive, à 3 m du bord, ne monte pas plus haut (des roseaux jamais au pied d'une paroi)
        const pente = Math.max(Math.abs(hauteur(q.x + 1.5, q.z) - hauteur(q.x - 1.5, q.z)), Math.abs(hauteur(q.x, q.z + 1.5) - hauteur(q.x, q.z - 1.5))) / 3; if (pente > (r.pente || .45)) continue;
        const rayon = (RAYON[nom] || 1) * ech * (r.serre || 1); if (!libre(q.x, q.z, rayon)) continue;
        if (EMPRISE[nom]) { const a2 = at(s), oo = Object.assign({eau: a2.w * 2}, r.reglages); if (emprise(nom, oo, q, lacetDe(a2, sg, oo), ech).some(([X, Z2, rr]) => !libre(X, Z2, rr))) continue; }
        poser(nom, s, cote, e, Object.assign({r: (RAYON[nom] || 1) * (r.serre || 1)}, r.reglages, r.nums ? {num: r.nums[Math.floor(R() * r.nums.length)]} : null), ech); } } };
    if (Z) { const fin = Math.min(Z.b, LONG), bout = r.pas < 6 ? 12 : 1e9;   // (une règle serrée, un sous-bois : 12 m à la fois ; les autres d'un trait, leurs objets gardent leur écart)
      for (const cote of ["g", "d"]) for (let c = Z.a; c < fin; c += bout) { semer(c, Math.min(c + bout, fin), [cote]); yield; } continue; }
    semer(0, LONG);
    P.voies.forEach((v, nf) => surLaVoie(nf, () => semer(v.a, v.b))); }   // puis la voie « force » de chaque fourche
  // 3) les forêts en masse (étape 9 du plan) : au-delà des arbres posés un à un, la région couvre ses rives boisées d'arbres réduits à leur
  //    silhouette, sur une trame serrée. "forets" : [{sur, bande, maille, objet, bosquets}] ; bosquets (de 0 à 1) : seulement par taches, avec des clairières.
  //    Son propre hasard, après tout le reste : le décor d'avant ne bouge pas d'un arbre. Rangées par carrés de 64 m (clés « f… »).
  MD.masse = 0;
  // (un tronçon : sa part du plafond d'arbres, celle d'un circuit de 2 km ramenée à sa longueur ; une seule forme)
  if (EFFETS.foret) { const RF = Z ? Z.RF : hasard((NIVEAU.graine || 1) * 4409 + 3), MAXI = (BIOME.forets_max || 3200) * (Z ? (Z.b - Z.a) / 2000 : 1), choisis = [], carre = (x, z) => { const k = Z ? "f" : "f" + Math.floor(x / 64) + "," + Math.floor(z / 64); if (!formes.has(k)) formes.set(k, new Forme()); return formes.get(k); };
    for (const r of BIOME.forets || []) { const sur = r.sur.map(t => TYPES.indexOf(t)), m = r.maille || 6, nom = r.objet || "arbre_masse", recette = OBJETS[nom], ray = RAYON[nom] || 1.7; if (!recette) { console.warn("Objet inconnu : " + nom); continue; }
      const semer = (s0, s1, cotes = ["g", "d"]) => { for (const cote of cotes) { const sg = cote === "g" ? -1 : 1, PW = cote === "g" ? P.PG : P.PD;
        for (let s = s0 + RF() * m; s < s1; s += m) { const i = idx(s); let w = 0; for (const t of sur) w += PW[i * NT + t]; if (w < .6 || P.PONT[i] || P.TUN[i]) continue;
          for (let e0 = r.bande[0] + RF() * m; e0 < r.bande[1]; e0 += m) { const e = e0 + (RF() - .5) * m * .7, ss = s + (RF() - .5) * m * .7, lacet = RF() * 6.283, ech = lerp(.85, 1.3, RF());
            const q = pose(ss, sg * (at(ss).w + e));
            if (r.bosquets !== undefined && fbm(q.x / 42 + 11, q.z / 42 + 5) < r.bosquets) continue;
            if (reserve(ss, cote, e)) continue;
            pres(q.x, q.z); if (Math.abs(Q.e - e) > 2.5) continue;   // ce point est en fait plus près d'un autre bout de la piste : ce n'est pas notre rive
            const y = hauteur(q.x, q.z); if (y - P.Y[Q.i] < (DISC_PISTE === "terre" ? -90 : .5) || !libre(q.x, q.z, ray)) continue;
            choisis.push([recette, q.x, y, q.z, lacet, ech, e < (r.pres === undefined ? 62 : r.pres)]); prendre(q.x, q.z, ray); } } } };
      if (Z) { const fin = Math.min(Z.b, LONG); for (const cote of ["g", "d"]) for (let c = Z.a; c < fin; c += 12) { semer(c, Math.min(c + 12, fin), [cote]); yield; } continue; }
      semer(0, LONG);
      P.voies.forEach((v, nf) => surLaVoie(nf, () => semer(v.a, v.b))); }
    const garde = Math.min(1, MAXI / Math.max(1, choisis.length));   // trop d'arbres pour la machine : on éclaircit partout pareil, jamais une forêt entière en moins
    for (const [recette, x, y, z, lacet, ech, pres] of choisis) { if (garde < 1 && RF() > garde) continue; recette(carre(x, z).poser(x, y, z, lacet, ech).matiere(2), {pres}, RF, K); MD.masse++; if (Z && MD.masse % 12 === 0) yield; } }
  MD.poses = poses;
  return formes;
}
/* le texte d'un panneau, d'une borne : une petite image posée sur l'objet */
function mailleEtiquette(e) {
  const c = toile(Math.round(e.l * 28), Math.round(e.h * 28), x => { x.fillStyle = "#" + PAL.planche.map(v => Math.round(v * 255).toString(16).padStart(2, "0")).join(""); x.fillRect(0, 0, 999, 999); x.fillStyle = "#3A2A18"; x.textAlign = "center"; x.textBaseline = "middle";
      let px = Math.round(e.h * 28 * .8); x.font = px + 'px "Jersey 15", monospace'; while (x.measureText(e.texte).width > e.l * 28 - 6 && px > 6) { px--; x.font = px + 'px "Jersey 15", monospace'; } x.fillText(e.texte, e.l * 14, e.h * 14 + 1); });
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(e.l, e.h), new THREE.MeshBasicMaterial({map: t})); m.position.set(e.x, e.y, e.z); m.rotation.y = e.lacet; return m;
}
function mailleAnimee(a) { a.maille = a.forme.maille(); a.maille.position.set(a.x, a.y, a.z); a.maille.rotation.order = "YXZ"; a.maille.rotation.y = a.lacet; return a.maille; }
function construireDecor() {
  const formes = poserDecor();
  MONDE.foret = [];   // les maillages de la forêt en masse : la qualité les cache si la machine peine (jeu.js)
  for (const [k, F] of formes) { const abri = typeof k === "string" && k[0] === "t", foret = typeof k === "string" && k[0] === "f", m = F.maille(abri ? MAT_ABRI : MAT_MONDE); if (m) { m.name = abri ? "decor-abri" : foret ? "foret" : "decor"; if (foret) MONDE.foret.push(m); scene.add(m); } }
  // les étiquettes (le texte des panneaux) et les objets qui tournent
  for (const e of MONDE.etiquettes) scene.add(mailleEtiquette(e));
  for (const a of MONDE.animes) scene.add(mailleAnimee(a));
}
function animerDecor(t) { for (const a of MONDE.animes) a.maille.rotation.z = t * a.vitesse; }
