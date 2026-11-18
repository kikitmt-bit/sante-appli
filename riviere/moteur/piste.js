/* ============ la piste : les pièces du niveau deviennent une ligne en 3D, mètre par mètre ============ */
// Une pièce : {nom, long (m), virage (degrés, + = à droite), eau ou large (largeur, m), g et d (la sorte de rive à gauche et à droite)}
// et, au choix :
//   monte    mètres gagnés sur la pièce (négatif : une descente ; "auto" : ce qui manque pour revenir à la hauteur du départ)
//   net      la pente n'est pas adoucie (une chute, un tremplin, une cascade)
//   surface  "eau" (par défaut), "terre", "goudron"… (contenu/surfaces)
//   pont     la piste est en l'air : le sol ne la suit pas, un tablier est construit ; on peut passer dessous (true, "bois", "arches")
//   ravin    avec pont : le sol se creuse de ce nombre de mètres sous le pont, une rivière coule au fond
//   tunnel   une montagne passe au-dessus (true, ou le nom d'une grotte de la région : "cristal", "terre"… ; tunnel.js)
//   ambiance l'air du lieu ("sous-bois", "marais"… ; ambiance.js)
//   segment  un nom : ce bout de piste est chronométré à part (un sprint, une côte), avec son record
//   allure   le décor défile plus ou moins vite ici (1,4 : des rapides ; 0,7 : une côte), sans toucher aux vrais chiffres
//   camera   {haut, recul} : la caméra plus haute ou plus loin sur cette pièce
//   lieux, objets
// "boucle": "huit" (un circuit en 8, sur la terre : il se croise à niveau, un carrefour) : la dernière pièce au virage "auto" prend ce qui manque pour que les virages s'annulent.
// La dernière pièce d'un circuit peut être {"raccord": true} : le moteur calcule le chemin qui referme la boucle, sans déformer les autres.
// (Ancienne façon, toujours acceptée : une pièce au virage "auto", et les longueurs s'ajustent.)
// Tout le reste (terrain, surfaces, décor) se déduit de cette ligne : le niveau ne contient aucune forme.
// Tous ces mètres sont des mètres de DÉCOR : le décor défile « allure » fois plus vite que le joueur n'avance (la distance affichée reste la vraie).
const TYPES = Object.keys(BIOME.rives), NT = TYPES.length, RIVES = TYPES.map(t => BIOME.rives[t]);
const MARGE = 12;   // une pièce « tunnel » : la grotte commence 12 m après le début de la pièce et finit 12 m avant (la gorge d'approche)
const FONDU = 10;   // deux rives voisines se fondent l'une dans l'autre sur 2 × 10 m
const ALLURE = clamp(+PARAMS.get("allure") || NIVEAU.allure || 2, 1, 4);
const BOUCLE = !!NIVEAU.boucle, SENS = NIVEAU.boucle === "droite" ? 1 : -1;
const largeur = p => p.large !== undefined ? p.large : p.eau;
const DISC_PISTE = NIVEAU.discipline || (["terre", "goudron", "paves"].includes(NIVEAU.surface) ? "terre" : "eau");   // l'activité du circuit (la même règle que depart.js)

/* l'ancienne fermeture d'une boucle : la pièce « auto » prend le virage qui manque pour faire un tour complet, puis les longueurs
   s'ajustent (le moins possible, jamais celles des pièces « fixe », à lieu ou à tunnel) pour que la piste retombe sur son départ. */
function fermer(pieces) {
  const autos = pieces.filter(p => p.virage === "auto"), somme = pieces.reduce((t, p) => t + (p.virage === "auto" ? 0 : p.virage || 0), 0);
  if (!autos.length) throw new Error("Une boucle a besoin d'une pièce « raccord » à la fin (ou d'une pièce au virage « auto »).");
  for (const p of autos) p.virage = ((NIVEAU.boucle === "huit" ? 0 : SENS * 360) - somme) / autos.length;   // un 8 ("boucle": "huit") : ses virages s'annulent
  let h = 0;
  const V = pieces.map(p => { const A = p.virage * Math.PI / 180, f = Math.abs(A) < 1e-9 ? 1 : Math.sin(A / 2) / (A / 2), v = [f * Math.sin(h + A / 2), -f * Math.cos(h + A / 2)]; h += A; return v; });
  const W = pieces.map(p => p.fixe || p.lieux || p.tunnel ? 0 : p.long * p.long), M = [[0, 0], [0, 0]], r = [0, 0];
  pieces.forEach((p, i) => { for (let a = 0; a < 2; a++) { r[a] += p.long * V[i][a]; for (let b = 0; b < 2; b++) M[a][b] += W[i] * V[i][a] * V[i][b]; } });
  const det = M[0][0] * M[1][1] - M[0][1] * M[1][0], l0 = (r[0] * M[1][1] - r[1] * M[0][1]) / det, l1 = (M[0][0] * r[1] - M[1][0] * r[0]) / det;
  pieces.forEach((p, i) => {
    p.long0 = p.long; p.long -= W[i] * (V[i][0] * l0 + V[i][1] * l1);
    if (p.long < 20) throw new Error("La boucle ne se ferme pas : revoir la pièce « " + (p.nom || i) + " ».");
  });
  if (NIVEAU.distance) { const k = NIVEAU.distance * ALLURE / pieces.reduce((t, p) => t + p.long, 0); for (const p of pieces) p.long *= k; }   // distance : les vrais mètres d'un tour
}

/* le raccord : le plus court chemin « virage, ligne droite, virage » (de rayon donné) entre la fin des pièces et le départ */
function cheminRaccord(x0, z0, t0, x1, z1, t1, R) {
  const T2 = Math.PI * 2, m = a => ((a % T2) + T2) % T2, dx = x1 - x0, dz = z1 - z0, d = Math.hypot(dx, dz) / R, th = Math.atan2(dz, dx);
  const a = m(t0 - th), b = m(t1 - th), sa = Math.sin(a), sb = Math.sin(b), ca = Math.cos(a), cb = Math.cos(b), cab = Math.cos(a - b), sol = [];
  let p2 = 2 + d * d - 2 * cab + 2 * d * (sa - sb);
  if (p2 >= 0) { const tmp = Math.atan2(cb - ca, d + sa - sb); sol.push([m(-a + tmp), Math.sqrt(p2), m(b - tmp), 1, 1]); }
  p2 = 2 + d * d - 2 * cab + 2 * d * (sb - sa);
  if (p2 >= 0) { const tmp = Math.atan2(ca - cb, d - sa + sb); sol.push([m(a - tmp), Math.sqrt(p2), m(-b + tmp), -1, -1]); }
  p2 = -2 + d * d + 2 * cab + 2 * d * (sa + sb);
  if (p2 >= 0) { const p = Math.sqrt(p2), tmp = Math.atan2(-ca - cb, d + sa + sb) - Math.atan2(-2, p); sol.push([m(-a + tmp), p, m(-b + tmp), 1, -1]); }
  p2 = d * d - 2 + 2 * cab - 2 * d * (sa + sb);
  if (p2 >= 0) { const p = Math.sqrt(p2), tmp = Math.atan2(ca + cb, d - sa - sb) - Math.atan2(2, p); sol.push([m(a - tmp), p, m(b - tmp), -1, 1]); }
  sol.sort((u, v) => (u[0] + u[1] + u[2]) - (v[0] + v[1] + v[2]));
  return sol[0] || null;
}
function nombres(pieces) {   // le nombre de mètres de chaque pièce : arrondis en cumulé, pour que le total soit juste
  let cum = 0;
  return pieces.map(p => { const a = Math.round(cum); cum += p.long; return Math.max(1, Math.round(cum) - a); });
}
function poseFinale(pieces) {   // où arrive la suite de pièces (le même calcul, pas à pas, que la piste)
  const ns = nombres(pieces); let x = 0, z = 0, h = 0;
  pieces.forEach((p, ip) => { const n = ns[ip], k = (p.virage || 0) * Math.PI / 180 / n; for (let i = 0; i < n; i++) { h += k / 2; x += Math.sin(h); z -= Math.cos(h); h += k / 2; } });
  return {x, z, h};
}
function raccorder(pieces) {
  const r = pieces[pieces.length - 1], avant = pieces.slice(0, -1), fin = poseFinale(avant), R = r.rayon || 30;
  const sol = cheminRaccord(fin.x, fin.z, fin.h - Math.PI / 2, 0, 0, -Math.PI / 2, R);
  if (!sol) throw new Error("Le raccord ne trouve pas de chemin : rapprocher la fin du départ, ou changer son rayon.");
  const [t, p, q, s1, s2] = sol, base = Object.assign({}, r), deg = 180 / Math.PI, bouts = [];
  delete base.raccord; delete base.rayon; delete base.objets; delete base.lieux;
  if (t * R >= 1) bouts.push(Object.assign({}, base, {long: Math.round(t * R), virage: s1 * t * deg}));
  if (p * R >= 1) bouts.push(Object.assign({}, base, {long: Math.round(p * R), virage: 0, droit: true}));
  if (q * R >= 1) bouts.push(Object.assign({}, base, {long: Math.round(q * R), virage: s2 * q * deg}));
  if (!bouts.length) return avant;
  (bouts.find(b => b.droit) || bouts[0]).objets = r.objets;   // ses objets vont sur la ligne droite
  bouts.slice(1).forEach(b => delete b.nom);
  if (typeof r.monte === "number") { const L = bouts.reduce((a, b) => a + b.long, 0); for (const b of bouts) b.monte = r.monte * b.long / L; }
  return avant.concat(bouts);
}

function adoucir(A, rayon, boucle, garde) {   // la moyenne des voisins, à « rayon » mètres de chaque côté
  // garde[i] : ce mètre ne bouge pas, et ses voisins ne regardent pas au-delà de lui (le pied d'une chute reste net : l'eau ne remonte pas après)
  const N = A.length, O = new Float32Array(N), en = i => boucle ? ((i % N) + N) % N : clamp(i, 0, N - 1);
  for (let i = 0; i < N; i++) {
    if (garde && garde[i]) { O[i] = A[i]; continue; }
    let t = A[i];
    for (const sens of [-1, 1]) { let v = A[i], mur = false; for (let j = 1; j <= rayon; j++) { const k = en(i + sens * j); if (!mur && garde && garde[k]) mur = true; if (!mur) v = A[k]; t += v; } }
    O[i] = t / (2 * rayon + 1);
  }
  return O;
}

/* ---- les fourches (15/11, étape 7 du plan) : la rivière se sépare en deux voies, puis se rejoint ----
   Dans un niveau, une pièce {"fourche": "L'île", "calme": [pièces…], "force": [pièces…]}. La voie « calme » fait partie de la ligne, comme si ses
   pièces étaient écrites à la suite : sans fourche prise, rien ne change. La voie « force » est une deuxième suite de mètres entre les deux mêmes
   points ; elle a EXACTEMENT autant de mètres que la calme (ses longueurs s'ajustent, le moins possible), donc la position du joueur reste un seul
   nombre, s, et les deux voies comptent les mêmes vrais mètres : un seul record par circuit, et il reste juste. Ses mètres sont rangés à la
   suite de ceux de la ligne (indices N… M-1) dans tous les tableaux de la piste ; idx(s) et at(s) y vont quand la voie est prise (VOIES.prise).
   Près de la séparation et de la jonction, tant que les deux eaux se touchent, la voie « force » prend la hauteur, la largeur et les rives de la calme. */
function resoudreVoie(pieces, h0, dx, dz, n, nom) {   // les longueurs d'une voie : elle arrive au bon endroit, avec exactement n mètres
  const m = pieces.length, L0 = pieces.map(p => p.long), V = []; let h = h0;
  for (const p of pieces) { const A = p.virage * Math.PI / 180, f = Math.abs(A) < 1e-9 ? 1 : Math.sin(A / 2) / (A / 2); V.push([f * Math.sin(h + A / 2), -f * Math.cos(h + A / 2), 1]); h += A; }
  const W = pieces.map(p => p.fixe || p.net ? 0 : p.long * p.long), r = [dx, dz, n], M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  pieces.forEach((p, i) => { for (let a = 0; a < 3; a++) { r[a] -= p.long * V[i][a]; for (let b = 0; b < 3; b++) M[a][b] += W[i] * V[i][a] * V[i][b]; } });
  const det = M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
  const ech = Math.max(1, M[0][0], M[1][1], M[2][2]);
  if (m < 3 || Math.abs(det) < 1e-7 * ech * ech * ech) throw new Error("Fourche « " + nom + " » : la voie « force » a besoin d'au moins trois pièces, dont deux virages, pour rejoindre l'autre.");
  const col = k => M.map((ligne, a) => ligne.map((v, b) => b === k ? r[a] : v)), d3 = A => A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
  const l = [0, 1, 2].map(k => d3(col(k)) / det);
  pieces.forEach((p, i) => {
    p.long0 = L0[i]; p.long = L0[i] + W[i] * (V[i][0] * l[0] + V[i][1] * l[1] + V[i][2] * l[2]);
    if (!(p.long >= 1) || p.long < L0[i] * .5 || p.long > L0[i] * 2) throw new Error("Fourche « " + nom + " » : la voie « force » ne rejoint pas l'autre sans trop déformer « " + (p.nom || "sa pièce n° " + (i + 1)) + " » (" + Math.round(L0[i]) + " m demandés, il en faudrait " + Math.round(p.long) + "). Le plus simple : les mêmes longueurs que la voie calme, et les virages inverses.");
  });
}

const PISTE = (() => {
  let source = []; const FK0 = [];
  NIVEAU.pieces.forEach((p, ip) => {   // une fourche : sa voie calme entre dans la ligne ; sa voie « force » est gardée à part (_i : le numéro de la pièce dans le fichier)
    if (!p.fourche) { source.push(Object.assign({}, p, {_i: ip})); return; }
    if (!Array.isArray(p.calme) || !p.calme.length || !Array.isArray(p.force) || !p.force.length) throw new Error("Fourche « " + p.fourche + " » : il lui faut une voie « calme » et une voie « force ».");
    const f = {nom: String(p.fourche), calme: p.calme.map(c => Object.assign({}, c, {fourche: FK0.length + 1, _i: ip})), force: p.force.map(c => Object.assign({}, c, {_i: ip})), effort: p.effort || null, annonce: p.annonce || null, cote: p.cote || null};
    if (f.calme.concat(f.force).some(c => c.fourche !== FK0.length + 1 && c.fourche || c.raccord || c.calme)) throw new Error("Fourche « " + f.nom + " » : ni fourche ni raccord dans une fourche.");
    source.push(...f.calme); FK0.push(f);
  });
  if (source.some(p => p.raccord)) {
    if (!BOUCLE || !source[source.length - 1].raccord) throw new Error("La pièce « raccord » se met à la fin d'un circuit en boucle.");
    source = raccorder(source);
  } else if (BOUCLE) fermer(source);
  // la hauteur : chaque pièce monte ou descend ; un circuit revient à sa hauteur de départ
  const autosY = source.filter(p => p.monte === "auto"), sommeY = source.reduce((t, p) => t + (+p.monte || 0), 0);
  for (const p of autosY) p.monte = BOUCLE ? -sommeY / autosY.length : 0;
  const derive = BOUCLE && !autosY.length ? -sommeY : 0;   // sans pièce « auto » : l'écart est réparti sur tout le tour
  const X = [], Z = [], H = [], Y0 = [], W0 = [], KG = [], KD = [], TUN = [], PONT = [], NET = [], SF = [], PC = [], A0 = [], K0 = [], CH0 = [], CR0 = [], pieces = [], surfaces = [];
  const ns = nombres(source);
  let x = 0, z = 0, h = 0, y = 0, s = 0, titre = "";
  source.forEach((p, ip) => {
    const n = ns[ip], k = (p.virage || 0) * Math.PI / 180 / n, w = largeur(p); titre = p.nom || titre;
    for (const c of [p.g, p.d]) if (!TYPES.includes(c)) throw new Error("Rive inconnue dans le niveau : " + c);
    if (!(w > 0)) throw new Error("Pièce sans largeur : « " + titre + " ».");
    const surf = p.surface || NIVEAU.surface || (DISC_PISTE === "terre" ? "terre" : "eau"); if (!surfaces.includes(surf)) surfaces.push(surf);   // la surface : la pièce, sinon le circuit (12/11 : la machine ne change plus un circuit d'eau en chemin)
    pieces.push(Object.assign(p, {s0: s, s1: s + n, titre, surface: surf, grotte: p.tunnel ? (typeof p.tunnel === "string" ? p.tunnel : p.tunnel.style || "roche") : null}));
    for (let i = 0; i < n; i++) {
      X.push(x); Z.push(z); H.push(h); Y0.push(y); W0.push(w / 2); KG.push(TYPES.indexOf(p.g)); KD.push(TYPES.indexOf(p.d));
      TUN.push(p.tunnel && i >= MARGE && i < n - MARGE ? 1 : 0); PONT.push(p.pont ? 1 : 0); NET.push(p.net ? 1 : 0); SF.push(surfaces.indexOf(surf)); PC.push(ip);
      A0.push(p.allure || 1); K0.push(k); CH0.push((p.camera && p.camera.haut) || 0); CR0.push((p.camera && p.camera.recul) || 0);
      y += (+p.monte || 0) / n; h += k / 2; x += Math.sin(h); z -= Math.cos(h); h += k / 2; s++;
    }
  });
  const N = X.length, borne = i => BOUCLE ? ((i % N) + N) % N : clamp(i, 0, N - 1);
  const fermeture = BOUCLE ? Math.hypot(x, z) : 0;
  if (BOUCLE) for (let i = 0; i < N; i++) { X[i] -= x * i / N; Z[i] -= z * i / N; Y0[i] += derive * i / N; }   // les derniers centimètres, répartis sur tout le tour
  // la hauteur adoucie (sauf les pièces « net »), jamais sous le niveau de la mer
  let Y = adoucir(adoucir(Y0, 4, BOUCLE, NET), 4, BOUCLE, NET), bas = Infinity;
  // les voies « force » des fourches : leur tracé (il rejoint la ligne au mètre près), leur hauteur ; le reste plus bas, quand la ligne est finie
  const PAD = 40, chaine = (A, B, a, b) => { const o = []; for (let k = -PAD; k < 0; k++) o.push(A[borne(a + k)]); for (let k = 0; k < B.length; k++) o.push(B[k]); for (let k = 0; k < PAD; k++) o.push(A[borne(b + k)]); return o; };   // un tableau de la ligne, où la voie remplace la calme (avec 40 m de chaque côté)
  const voies = FK0.map((f, nf) => {
    const a = f.calme[0].s0, b = f.calme[f.calme.length - 1].s1, n = b - a, P2 = f.force, deg = 180 / Math.PI;
    if (a < 1 || b > N - 1) throw new Error("Fourche « " + f.nom + " » : il faut une pièce avant elle et une après (elle ne peut ni ouvrir ni fermer le circuit).");
    const tourne = (H[b] - H[a]) * deg, autosV = P2.filter(p => p.virage === "auto"), sommeV = P2.reduce((t, p) => t + (p.virage === "auto" ? 0 : +p.virage || 0), 0);
    if (!autosV.length && Math.abs(tourne - sommeV) > .5) throw new Error("Fourche « " + f.nom + " » : la voie « force » tourne de " + Math.round(sommeV) + "° en tout, la calme de " + Math.round(tourne) + "° : il faut le même total (ou une pièce au virage « auto »).");
    for (const p of P2) { p.virage = p.virage === "auto" ? (tourne - sommeV) / autosV.length : +p.virage || 0; if (!(p.long > 0)) throw new Error("Fourche « " + f.nom + " » : une pièce sans longueur."); }
    if (!autosV.length) P2[P2.length - 1].virage += tourne - sommeV;
    resoudreVoie(P2, H[a], X[b] - X[a], Z[b] - Z[a], n, f.nom);
    const cible = Y0[b] - Y0[a], autosM = P2.filter(p => p.monte === "auto"), sommeM = P2.reduce((t, p) => t + (+p.monte || 0), 0);
    for (const p of autosM) p.monte = (cible - sommeM) / autosM.length;
    const reste = autosM.length ? 0 : (cible - sommeM) / n;   // sans pièce « auto » : l'écart de hauteur est réparti sur toute la voie
    const o = {nom: f.nom, a, b, n, effort: f.effort, annonce: f.annonce, X: [], Z: [], H: [], Y0: [], W0: [], KG: [], KD: [], TUN: [], PONT: [], NET: [], SF: [], PC: [], A0: [], K0: [], CH0: [], CR0: []};
    const ns2 = nombres(P2); let x = X[a], z = Z[a], h = H[a], y = Y0[a], l = 0, titre2 = f.nom;
    P2.forEach((p, ip) => {
      const nn = ns2[ip], k = p.virage * Math.PI / 180 / nn, w = largeur(p); titre2 = p.nom || titre2;
      for (const c of [p.g, p.d]) if (!TYPES.includes(c)) throw new Error("Rive inconnue dans le niveau : " + c);
      if (!(w > 0)) throw new Error("Pièce sans largeur : « " + titre2 + " ».");
      const surf = p.surface || NIVEAU.surface || (DISC_PISTE === "terre" ? "terre" : "eau"); if (!surfaces.includes(surf)) surfaces.push(surf);
      pieces.push(Object.assign(p, {s0: a + l, s1: a + l + nn, titre: titre2, surface: surf, voie: nf + 1, grotte: p.tunnel ? (typeof p.tunnel === "string" ? p.tunnel : p.tunnel.style || "roche") : null}));
      for (let i = 0; i < nn; i++) {
        o.X.push(x); o.Z.push(z); o.H.push(h); o.Y0.push(y); o.W0.push(w / 2); o.KG.push(TYPES.indexOf(p.g)); o.KD.push(TYPES.indexOf(p.d));
        o.TUN.push(p.tunnel && i >= MARGE && i < nn - MARGE ? 1 : 0); o.PONT.push(p.pont ? 1 : 0); o.NET.push(p.net ? 1 : 0); o.SF.push(surfaces.indexOf(surf)); o.PC.push(pieces.length - 1);
        o.A0.push(p.allure || 1); o.K0.push(k); o.CH0.push((p.camera && p.camera.haut) || 0); o.CR0.push((p.camera && p.camera.recul) || 0);
        y += (+p.monte || 0) / nn + reste; h += k / 2; x += Math.sin(h); z -= Math.cos(h); h += k / 2; l++;
      }
    });
    if (l !== n) throw new Error("Fourche « " + f.nom + " » : la voie « force » fait " + l + " m au lieu de " + n + ".");
    o.ecart = Math.hypot(x - X[b], z - Z[b]);
    if (o.ecart > 4) throw new Error("Fourche « " + f.nom + " » : la voie « force » arrive à " + o.ecart.toFixed(1) + " m de l'autre.");
    for (let i = 0; i < n; i++) { o.X[i] -= (x - X[b]) * i / n; o.Z[i] -= (z - Z[b]) * i / n; }   // les derniers centimètres, répartis sur toute la voie
    // où les deux voies se quittent, où elles se retrouvent : entre les deux, leurs eaux ne doivent jamais se toucher
    const sep = new Float32Array(n);
    for (let i = 0; i < n; i++) { let m = Infinity; for (let j = a; j < b; j++) { const d = Math.hypot(o.X[i] - X[j], o.Z[i] - Z[j]) - o.W0[i] - W0[j]; if (d < m && !(Math.abs(o.Y0[i] - Y0[j]) >= 4.5 && (o.PONT[i] || PONT[j] || o.TUN[i] || TUN[j]))) m = d; } sep[i] = m; }
    let l1 = 0, l2 = n - 1; while (l1 < n && sep[l1] < 1) l1++; while (l2 >= 0 && sep[l2] < 1) l2--;
    if (l1 > n * .45 || n - 1 - l2 > n * .45) throw new Error("Fourche « " + f.nom + " » : les deux voies ne s'écartent pas assez l'une de l'autre (il faut des virages plus marqués, ou des voies plus étroites).");
    for (let i = l1; i <= l2; i++) if (sep[i] < 1) throw new Error("Fourche « " + f.nom + " » : les deux voies se touchent, " + i + " m après la séparation.");
    o.gA = l1 + 12; o.gB = n - 1 - l2 + 12;   // jusque-là (et 8 m de fondu), la voie « force » prend la hauteur, la largeur et les rives de la calme
    o.garde = i => Math.max(1 - lisse(o.gA - 8, o.gA, i), 1 - lisse(o.gB - 8, o.gB, n - i));
    for (let i = 0; i < n; i++) if ((i < o.gA || i >= n - o.gB) && (o.TUN[i] || o.PONT[i] || o.NET[i] || TUN[a + i] || PONT[a + i] || NET[a + i])) throw new Error("Fourche « " + f.nom + " » : ni grotte, ni pont, ni chute à moins de " + Math.max(o.gA, o.gB) + " m de la séparation ou de la jonction.");
    const tN = chaine(NET, o.NET, a, b), ys = adoucir(adoucir(chaine(Y0, o.Y0, a, b), 4, false, tN), 4, false, tN); o.Y = new Float32Array(n);
    for (let i = 0; i < n; i++) { o.Y[i] = lerp(ys[PAD + i], Y[a + i], o.garde(i)); bas = Math.min(bas, o.Y[i]); }
    const mi = n >> 1; o.droite = (o.X[mi] - X[a + mi]) * Math.cos(H[a + mi]) + (o.Z[mi] - Z[a + mi]) * Math.sin(H[a + mi]) > 0;   // la voie « force » passe à droite de la calme ?
    return o;
  });
  for (let i = 0; i < N; i++) bas = Math.min(bas, Y[i]);
  for (let i = 0; i < N; i++) Y[i] -= bas;
  for (const v of voies) for (let i = 0; i < v.n; i++) v.Y[i] -= bas;
  // la pente, et le sens où l'eau file (COULE, la pente vue par l'eau) : vers le bas d'une pente, mais une petite bosse (un tremplin, moins de 2 m)
  // ne la fait pas remonter vers le joueur : sur une montée courte, l'eau continue dans le sens de la course (Kiki, 11/11)
  const pentes = (Y, boucle) => {
    const n = Y.length, bn = i => boucle ? ((i % n) + n) % n : clamp(i, 0, n - 1), PENTE = new Float32Array(n); for (let i = 0; i < n; i++) PENTE[i] = (Y[bn(i + 1)] - Y[bn(i - 1)]) / 2;
    const COULE = Float32Array.from(PENTE);
    for (let i = 0; i < n; i++) {
      if (PENTE[i] <= .01 || PENTE[bn(i - 1)] > .01) continue;   // le pied d'une montée
      let j = i, c = 0; while (PENTE[bn(j)] > .01 && c < n) { j++; c++; }
      if (Y[bn(j)] - Y[i] < 2) for (let k = i; k < j; k++) COULE[bn(k)] = -PENTE[bn(k)];
    }
    return [PENTE, COULE];
  };
  let [PENTE, COULE] = pentes(Y, BOUCLE);
  let COURB = adoucir(K0, 5, BOUCLE), W = adoucir(W0, FONDU, BOUCLE), CAMH = adoucir(CH0, 12, BOUCLE), CAMR = adoucir(CR0, 12, BOUCLE);
  // l'allure du décor : celle du niveau, celle de la pièce, et la pente (ça file dans une descente, ça peine dans une côte)
  const allures = (PENTE, A0, boucle) => {
    const n = PENTE.length, pd = adoucir(PENTE, 5, boucle), al = new Float32Array(n), al0 = new Float32Array(n);
    for (let i = 0; i < n; i++) { al0[i] = ALLURE * A0[i]; al[i] = al0[i] * (NIVEAU.allurePente === false ? 1 : clamp(1 - pd[i] * 3.5, .55, 1.7)); }
    return [adoucir(al, 8, boucle), adoucir(al0, 8, boucle)];
  };
  let [ALL, ALL0] = allures(PENTE, A0, BOUCLE);   // ALL0 : sans l'effet de la pente (une machine qui la ressent pour de vrai : un home trainer)
  const VR = new Float64Array(N + 1);   // VR : les vrais mètres depuis la ligne (pour une allure de machine de 1)
  for (let i = 0; i < N; i++) VR[i + 1] = VR[i] + 1 / ALL[i];
  // la part de chaque sorte de rive, à chaque mètre
  const poids = (K, n = N, bn = borne) => {
    const o = new Float32Array(n * NT);
    for (let i = 0; i < n; i++) {
      for (let j = -FONDU; j <= FONDU; j++) o[i * NT + K[bn(i + j)]] += 1 / (2 * FONDU + 1);
      for (let t = 0; t < NT; t++) {   // une rive « franche » (un quai) ne se fond jamais avec la nature
        const w = o[i * NT + t]; if (!RIVES[t].franc || w <= 0 || w >= .999) continue;
        const ici = K[i] === t; for (let u = 0; u < NT; u++) o[i * NT + u] = ici ? (u === t ? 1 : 0) : (u === t ? 0 : o[i * NT + u] / (1 - w));
      }
    }
    return o;
  };
  let PG = poids(KG), PD = poids(KD);
  // les voies « force », suite : tout ce qui se lit mètre par mètre, rangé à la suite de la ligne (indices N… M-1)
  let M = N;
  const FK = new Uint8Array(N);   // pour chaque mètre de la ligne : le numéro de sa fourche (0 : aucune)
  for (const v of voies) {
    const {a, b, n} = v, tn = n + 2 * PAD, cl = i => clamp(i, 0, tn - 1), coupe = A => A.subarray(PAD, PAD + n), etendre = (A, B) => { const o = new A.constructor(A.length + B.length); o.set(A); o.set(B, A.length); return o; };
    const fondre = (B, A, pas = 1) => { for (let i = 0; i < n; i++) { const g = v.garde(i); for (let t = 0; t < pas; t++) B[i * pas + t] = lerp(B[i * pas + t], A[(a + i) * pas + t], g); } return B; };   // près des deux bouts : comme la voie calme
    const [pe, co] = pentes(chaine(Y, v.Y, a, b), false), [al, al0] = allures(pe, chaine(A0, v.A0, a, b), false);
    const alb = coupe(al).slice(), al0b = coupe(al0).slice(); let rc = 0, rb = 0, rc0 = 0, rb0 = 0;
    for (let i = 0; i < n; i++) { rc += 1 / ALL[a + i]; rb += 1 / alb[i]; rc0 += 1 / ALL0[a + i]; rb0 += 1 / al0b[i]; }
    for (let i = 0; i < n; i++) { alb[i] *= rb / rc; al0b[i] *= rb0 / rc0; }   // les deux voies comptent exactement les mêmes vrais mètres : seul le décor file plus ou moins vite
    v.allure = rb / rc; v.dec = M - a;   // v.dec + s : l'indice du mètre s de la voie dans les tableaux
    const pg = poids(chaine(KG, v.KG, a, b), tn, cl).subarray(PAD * NT, (PAD + n) * NT).slice(), pdr = poids(chaine(KD, v.KD, a, b), tn, cl).subarray(PAD * NT, (PAD + n) * NT).slice();
    PG = etendre(PG, fondre(pg, PG, NT)); PD = etendre(PD, fondre(pdr, PD, NT));
    Y = etendre(Y, v.Y); PENTE = etendre(PENTE, coupe(pe)); COULE = etendre(COULE, coupe(co)); ALL = etendre(ALL, alb); ALL0 = etendre(ALL0, al0b);
    COURB = etendre(COURB, coupe(adoucir(chaine(K0, v.K0, a, b), 5, false)));
    W = etendre(W, fondre(coupe(adoucir(chaine(W0, v.W0, a, b), FONDU, false)).slice(), W));
    CAMH = etendre(CAMH, fondre(coupe(adoucir(chaine(CH0, v.CH0, a, b), 12, false)).slice(), CAMH)); CAMR = etendre(CAMR, fondre(coupe(adoucir(chaine(CR0, v.CR0, a, b), 12, false)).slice(), CAMR));
    for (let i = 0; i < n; i++) if (v.garde(i) > .5) v.SF[i] = SF[a + i];   // tant que les deux voies se touchent : le même revêtement (un chemin de terre ne commence qu'une fois séparé de la route)
    for (const k of ["X", "Z", "H", "TUN", "PONT", "NET", "SF", "PC"]) { const A = {X, Z, H, TUN, PONT, NET, SF, PC}[k]; for (let i = 0; i < n; i++) A.push(v[k][i]); }
    for (let i = a; i < b; i++) FK[i] = voies.indexOf(v) + 1;
    M += n;
  }
  const voisin = (i, j) => {   // le mètre qui est à j mètres de l'indice i, le long de sa voie (une voie « force » continue sur la ligne, à ses deux bouts)
    if (i < N) return borne(i + j);
    for (const v of voies) { const s = i - v.dec; if (s >= v.a && s < v.b) return s + j >= v.a && s + j < v.b ? i + j : borne(s + j); }
    return i;
  };
  const SM = new Float32Array(M), VO = new Uint8Array(M), INT = new Uint8Array(M), GARDE = new Float32Array(M);   // GARDE : de 1 (aux deux bouts d'une voie « force », là où elle copie la calme) à 0   // SM : le mètre s de chaque indice ; VO : 0 hors fourche, 2f+1 la voie calme de la fourche f, 2f+2 sa voie « force » ; INT : le côté de l'autre voie (1 gauche, 2 droite)
  for (let i = 0; i < N; i++) SM[i] = i;
  voies.forEach((v, nf) => { for (let s = v.a; s < v.b; s++) { SM[v.dec + s] = s; VO[s] = 2 * nf + 1; VO[v.dec + s] = 2 * nf + 2; GARDE[v.dec + s] = v.garde(s - v.a); INT[s] = v.droite ? 2 : 1; INT[v.dec + s] = v.droite ? 1 : 2; } });
  // un pont qui enjambe la piste commence et finit assez loin de l'eau qu'il enjambe : ses culées (le massif de pierre de chaque bout)
  // ne tombent jamais dans la rivière d'en dessous (12/11 : sur le Huit, la rivière passait sous le tout premier mètre du pont)
  const enjambe = [];
  for (let i = 0; i < N; i++) { if (!PONT[i]) continue;
    for (let j = 0; j < N; j++) { const ds = Math.abs(i - j), d2 = BOUCLE ? Math.min(ds, N - ds) : ds; if (d2 < 40 || PONT[j] || Y[i] - Y[j] < 3) continue;
      if (Math.hypot(X[i] - X[j], Z[i] - Z[j]) < W[j] + 1) enjambe.push([i, Math.ceil(W[j] + 9)]); } }
  for (const [i, m] of enjambe) for (let k = -m; k <= m; k++) { const kk = BOUCLE ? ((i + k) % N + N) % N : i + k; if (kk >= 0 && kk < N) PONT[kk] = 1; }
  // les carrefours (sur la terre) : deux passages de la piste à la même hauteur se croisent à niveau (un circuit en 8). 1 : le passage du dessous, 2 : celui du dessus (dessiné par-dessus)
  const CROIX = new Uint8Array(M);
  if (DISC_PISTE === "terre") { const G = 6, cases = new Map();
    for (let i = 0; i < N; i++) { const k = Math.floor(X[i] / G) + "," + Math.floor(Z[i] / G); if (!cases.has(k)) cases.set(k, []); cases.get(k).push(i); }
    for (let i = 0; i < N; i++) { const cx = Math.floor(X[i] / G), cz = Math.floor(Z[i] / G);
      for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) for (const j of cases.get((cx + a) + "," + (cz + b)) || []) { const ds = Math.abs(i - j), d2 = BOUCLE ? Math.min(ds, N - ds) : ds;
        if (d2 < 30 || PONT[i] || PONT[j] || Math.abs(Y[i] - Y[j]) > 1.5) continue;
        if (Math.hypot(X[i] - X[j], Z[i] - Z[j]) < W[i] + W[j] + 2.5) CROIX[i] = Math.max(CROIX[i], i > j ? 2 : 1); } } }
  // les bouts : 1 = le bout d'un niveau ouvert, 2 = la culée d'un pont (le sol s'arrête, la piste continue en l'air)
  const FA = new Uint8Array(M), FR = new Uint8Array(M);
  for (let i = 0; i < N; i++) {
    if (PONT[i]) continue;
    if (BOUCLE ? PONT[(i + 1) % N] : i < N - 1 && PONT[i + 1]) FA[i] = 2; else if (!BOUCLE && i === N - 1) FA[i] = 1;
    if (BOUCLE ? PONT[(i + N - 1) % N] : i > 0 && PONT[i - 1]) FR[i] = 2; else if (!BOUCLE && i === 0) FR[i] = 1;
  }
  for (let i = N; i < M; i++) { if (PONT[i]) continue; if (PONT[voisin(i, 1)]) FA[i] = 2; if (PONT[voisin(i, -1)]) FR[i] = 2; }
  const CH = new Float32Array(M), SH = new Float32Array(M); for (let i = 0; i < M; i++) { CH[i] = Math.cos(H[i]); SH[i] = Math.sin(H[i]); }
  // les segments chronométrés : des pièces qui se suivent et portent le même nom de segment
  const segments = [];
  for (const p of pieces) { if (!p.segment || p.voie) continue; const d = segments[segments.length - 1]; if (d && d.nom === p.segment && d.s1 === p.s0) d.s1 = p.s1; else segments.push({nom: p.segment, s0: p.s0, s1: p.s1}); }
  return {N, M, NF: voies.length, FK, SM, VO, INT, GARDE, voisin, voies: voies.map(v => ({nom: v.nom, a: v.a, b: v.b, n: v.n, dec: v.dec, gA: v.gA, gB: v.gB, droite: v.droite, allure: v.allure, ecart: v.ecart, effort: v.effort, annonce: v.annonce})),
    X, Z, Y, H, HFIN: h, W, PG, PD, TUN, PONT, NET, SF, PC, PENTE, COULE, COURB, ALL, ALL0, VR, CAMH, CAMR, FA, FR, CH, SH, CROIX, pieces, surfaces, segments, fermeture};
})();
const LONG = BOUCLE ? PISTE.N : PISTE.N - 1;   // la longueur du niveau (un tour, pour une boucle)
/* (16/11, étape 8, lot 3) le monde par tronçons : sur une longue route ouverte (plus de 6 km, ou "troncons": true dans le niveau), le sol, les rives,
   la route et le décor ne sont construits qu'autour de soi, et effacés derrière (moteur/troncons.js). ?troncons=1 ou 0 dans l'adresse : pour comparer.
   Jamais sur une boucle ni avec une fourche : ces circuits restent construits d'un bloc, comme toujours. */
const TRONCONS = !BOUCLE && !PISTE.NF && PARAMS.get("troncons") !== "0" && (PARAMS.get("troncons") === "1" || NIVEAU.troncons === true || (NIVEAU.troncons !== false && PISTE.N > 6000));
/* les voies prises : pour chaque fourche, 0 = la voie calme (la ligne), 1 = la voie « force ». idx(s) et at(s) suivent ce choix : c'est celui du joueur.
   Pour un autre que lui (le fantôme, un adversaire), ou pour construire le décor d'une voie : surVoie(choix, f), le temps d'un calcul. */
const VOIES = {prise: new Uint8Array(PISTE.NF), calme: new Uint8Array(PISTE.NF)};
function surVoie(choix, f) {   // choix : un tableau (une case par fourche), ou 0 / 1 pour toutes
  const garde = VOIES.prise; VOIES.prise = typeof choix === "number" ? new Uint8Array(PISTE.NF).fill(choix) : choix || VOIES.calme;
  try { return f(); } finally { VOIES.prise = garde; }
}
const surLaVoie = (nf, f) => { const c = new Uint8Array(PISTE.NF); c[nf] = 1; return surVoie(c, f); };   // sur la voie « force » de la fourche nf (pour la construire, la décorer)
const voieEn = i => { const f = PISTE.FK[i]; return f && VOIES.prise[f - 1] ? PISTE.voies[f - 1].dec + i : i; };   // l'indice du mètre i de la ligne, sur la voie prise
const idx = s => { const i = Math.round(s), N = PISTE.N, j = BOUCLE ? ((i % N) + N) % N : clamp(i, 0, N - 1); return PISTE.NF ? voieEn(j) : j; };          // le mètre de la piste le plus proche de s (sur la voie prise)
const sLigne = i => PISTE.SM[i];   // l'inverse : le mètre s d'un indice (un point d'une voie « force » : le même s que la voie calme)
const ecart = (a, b) => { const d = a - b; return BOUCLE ? d - LONG * Math.round(d / LONG) : d; };                           // de b à a le long de la piste (au plus court sur une boucle)
const surfaceEn = s => PISTE.surfaces[PISTE.SF[idx(s)]];
const vrai = s => { const N = PISTE.N, t = BOUCLE ? ((s % N) + N) % N : clamp(s, 0, N), i = Math.min(N - 1, Math.floor(t)); return lerp(PISTE.VR[i], PISTE.VR[i + 1], t - i); };   // les vrais mètres depuis la ligne
const TOUR_VRAI = PISTE.VR[PISTE.N];
function decorDe(v) {   // l'inverse : à quel mètre de décor est-on après v vrais mètres depuis la ligne
  const VR = PISTE.VR, N = PISTE.N; v = BOUCLE ? ((v % TOUR_VRAI) + TOUR_VRAI) % TOUR_VRAI : clamp(v, 0, TOUR_VRAI);
  let a = 0, b = N; while (b - a > 1) { const m = (a + b) >> 1; if (VR[m] <= v) a = m; else b = m; }
  return a + (VR[a + 1] > VR[a] ? (v - VR[a]) / (VR[a + 1] - VR[a]) : 0);
}

/* où est le mètre s de la piste (au-delà des deux bouts d'un niveau ouvert : tout droit ; sur une boucle : on refait le tour) */
function at(s) {
  const P = PISTE, N = P.N;
  if (BOUCLE) {
    s = ((s % N) + N) % N; let i = Math.min(N - 1, Math.floor(s)), j = (i + 1) % N; const u = s - i, fin = !j;
    if (P.NF) { i = voieEn(i); j = voieEn(j); }
    return {x: lerp(P.X[i], P.X[j], u), y: lerp(P.Y[i], P.Y[j], u), z: lerp(P.Z[i], P.Z[j], u), h: lerp(P.H[i], fin ? P.HFIN : P.H[j], u), w: lerp(P.W[i], P.W[j], u)};
  }
  if (s <= 0) return {x: P.X[0] + Math.sin(P.H[0]) * s, y: P.Y[0], z: P.Z[0] - Math.cos(P.H[0]) * s, h: P.H[0], w: P.W[0]};
  if (s >= LONG) { const d = s - LONG; return {x: P.X[LONG] + Math.sin(P.H[LONG]) * d, y: P.Y[LONG], z: P.Z[LONG] - Math.cos(P.H[LONG]) * d, h: P.H[LONG], w: P.W[LONG]}; }
  let i = Math.floor(s), j = i + 1; const u = s - i;
  if (P.NF) { i = voieEn(i); j = voieEn(j); }
  return {x: lerp(P.X[i], P.X[j], u), y: lerp(P.Y[i], P.Y[j], u), z: lerp(P.Z[i], P.Z[j], u), h: lerp(P.H[i], P.H[j], u), w: lerp(P.W[i], P.W[j], u)};
}
function pose(s, d) { const a = at(s); a.x += Math.cos(a.h) * d; a.z += Math.sin(a.h) * d; return a; }   // d en mètres, + = à droite
const pieceEn = s => PISTE.pieces[PISTE.PC[idx(s)]];

/* le point AU SOL de la piste le plus proche d'un point du monde (un pont ne compte pas : le sol ne le suit pas) :
   Q.i (le mètre), Q.d (écart, + = à droite), Q.av (en avant de ce mètre), Q.e (distance au bord de la piste), Q.bout (0, 1 ou 2 : voir FA et FR).
   Les points de la piste sont rangés dans une grille de cases de 32 m : on ne compare qu'aux cases voisines. */
const Q = {i: 0, d: 0, av: 0, e: 0, bout: 0};
const CASES = (() => {
  const P = PISTE, C = 32, M = 260; let xa = 1e9, xb = -1e9, za = 1e9, zb = -1e9;
  for (let i = 0; i < P.M; i++) { xa = Math.min(xa, P.X[i]); xb = Math.max(xb, P.X[i]); za = Math.min(za, P.Z[i]); zb = Math.max(zb, P.Z[i]); }
  const x0 = xa - M, z0 = za - M, nx = Math.ceil((xb + M - x0) / C), nz = Math.ceil((zb + M - z0) / C), cases = Array.from({length: nx * nz}, () => []);
  for (let i = 0; i < P.M; i++) if (!P.PONT[i]) cases[Math.floor((P.Z[i] - z0) / C) * nx + Math.floor((P.X[i] - x0) / C)].push(i);
  return {C, x0, z0, nx, nz, cases, xa, xb, za, zb};
})();
function pres(x, z) {
  const P = PISTE, G = CASES, cx = clamp(Math.floor((x - G.x0) / G.C), 0, G.nx - 1), cz = clamp(Math.floor((z - G.z0) / G.C), 0, G.nz - 1); let b = 1e18, bi = -1;
  for (let r = 0; r < 40; r++) {  // anneau par anneau, jusqu'à être sûr qu'aucune case plus lointaine ne peut faire mieux
    for (let j = cz - r; j <= cz + r; j++) {
      if (j < 0 || j >= G.nz) continue; const pas = j === cz - r || j === cz + r ? 1 : 2 * r || 1;
      for (let i = cx - r; i <= cx + r; i += pas) {
        if (i < 0 || i >= G.nx) continue;
        for (const k of G.cases[j * G.nx + i]) { const dx = x - P.X[k], dz = z - P.Z[k], q = dx * dx + dz * dz; if (q < b) { b = q; bi = k; } }
      }
    }
    if (bi >= 0 && b <= (r * G.C) * (r * G.C)) break;
  }
  if (bi < 0) bi = 0;
  const c = P.CH[bi], sn = P.SH[bi], dx = x - P.X[bi], dz = z - P.Z[bi], av = dx * sn - dz * c;
  Q.i = bi; Q.d = dx * c + dz * sn; Q.av = av;
  Q.bout = av > 0 ? P.FA[bi] : av < 0 ? P.FR[bi] : 0;
  Q.e = (Q.bout ? Math.sqrt(dx * dx + dz * dz) : Math.abs(Q.d)) - P.W[bi];
  return Q;
}

/* un point est-il à l'intérieur du circuit ? (au loin : des collines dedans, la mer dehors) */
const CONTOUR_PISTE = (() => { const o = []; if (BOUCLE) for (let i = 0; i < PISTE.N; i += 5) o.push(PISTE.X[i], PISTE.Z[i]); return o; })();
function dedans(x, z) {
  const C = CONTOUR_PISTE, n = C.length / 2; let c = false;
  for (let i = 0, j = n - 1; i < n; j = i++) { const xi = C[i * 2], zi = C[i * 2 + 1], xj = C[j * 2], zj = C[j * 2 + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; }
  return c;
}

/* le contrôleur : ce niveau tient-il debout ? (virages, pentes, fermeture, croisements) */
function verifier() {
  const P = PISTE, N = P.N, erreurs = [], croisements = [];
  if (BOUCLE && P.fermeture > 3) erreurs.push("La boucle se referme mal : " + P.fermeture.toFixed(1) + " m d'écart.");
  let rayonMin = Infinity, penteMax = 0, haut = 0;
  for (const p of P.pieces) {
    if (!p.virage || p.voie) continue;
    const R = (p.s1 - p.s0) / Math.abs(p.virage * Math.PI / 180), w = largeur(p) / 2; rayonMin = Math.min(rayonMin, R);
    if (R < w + 1.5) erreurs.push("Virage trop serré : « " + p.titre + " » (rayon " + R.toFixed(1) + " m pour une demi-largeur de " + w + " m).");
  }
  const presNet = i => { for (let j = -8; j <= 8; j++) if (P.NET[BOUCLE ? ((i + j) % N + N) % N : clamp(i + j, 0, N - 1)]) return true; return false; };   // autour d'une chute, la pente est voulue
  for (let i = 0; i < N; i++) { haut = Math.max(haut, P.Y[i]); if (!presNet(i)) penteMax = Math.max(penteMax, Math.abs(P.PENTE[i])); }
  if (penteMax > .3) erreurs.push("Pente trop raide (" + Math.round(penteMax * 100) + " %) : allonger la pièce, ou la marquer « net » si c'est une chute.");
  const pas = 2, coupe = (a, b, c, d) => {   // les segments ab et cd se coupent-ils ?
    const o = (p, q, r) => (P.X[q] - P.X[p]) * (P.Z[r] - P.Z[p]) - (P.Z[q] - P.Z[p]) * (P.X[r] - P.X[p]);
    return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
  };
  // (16/11, lot 3) on ne compare un bout de piste qu'à ses voisins (une grille de 16 m), dans le même ordre qu'avant : le même résultat,
  // sans les N²/8 comparaisons (55 millions pour une route de 21 km)
  const GV = 16, grille = new Map(), case_ = k => Math.floor(P.X[k] / GV) + "," + Math.floor(P.Z[k] / GV);
  for (let j = 0; j < N; j += pas) { const k = case_(j); if (!grille.has(k)) grille.set(k, []); grille.get(k).push(j); }
  for (let i = 0; i + pas < N; i += pas) { const cx = Math.floor(P.X[i] / GV), cz = Math.floor(P.Z[i] / GV), voisins = [];
   for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const j of grille.get((cx + a) + "," + (cz + b)) || []) if (j >= i + 30) voisins.push(j);
   voisins.sort((a, b) => a - b);
   for (const j of voisins) {
    if (BOUCLE && N - j + i < 30) continue;
    const j2 = BOUCLE ? (j + pas) % N : Math.min(N - 1, j + pas);
    if (j2 === j || !coupe(i, i + pas, j, j2)) continue;
    if (croisements.some(c => Math.abs(c.s1 - i) < 12 && Math.abs(c.s2 - j) < 12)) continue;
    const dy = P.Y[j] - P.Y[i], dessus = dy > 0 ? j : i, dessous = dy > 0 ? i : j, angle = Math.abs(Math.sin(P.H[i] - P.H[j]));
    const lac = !!NIVEAU.rivage && DISC_PISTE !== "terre" && Math.abs(dy) < .3 && !P.PONT[i] && !P.PONT[j] && !P.TUN[i] && !P.TUN[j];   // (18/11) sur un grand lac ("rivage") : on recroise son sillage sur la même eau (le tour d'une île)
    const carrefour = lac || DISC_PISTE === "terre" && Math.abs(dy) < .8 && angle > .42 && !P.PONT[i] && !P.PONT[j];   // sur la terre : un carrefour à niveau, s'il n'est pas trop rasant
    const bon = carrefour || (P.PONT[dessus] || P.TUN[dessous]) && Math.abs(dy) >= 4.5;
    croisements.push({s1: i, s2: j, ecart: +Math.abs(dy).toFixed(1), bon: !!bon, carrefour});
    if (!bon && DISC_PISTE === "terre") erreurs.push(Math.abs(dy) < .8 ? "Le carrefour des mètres " + i + " et " + j + " est trop rasant : les deux passages doivent se croiser franchement (plus de 25°)." : "La piste se croise aux mètres " + i + " et " + j + " à des hauteurs différentes (" + Math.abs(dy).toFixed(1) + " m) : à la même hauteur (un carrefour), ou un pont 4,5 m plus haut au moins.");
    else if (!bon) erreurs.push("La piste se croise au mètre " + i + " et au mètre " + j + " sans pont : il faut une pièce « pont » au-dessus, 4,5 m plus haut au moins (ici " + Math.abs(dy).toFixed(1) + " m).");
   }
  }
  // (17/11, Kiki : le circuit du jour du 16/11, deux routes superposées en biais sur 30 m, l'une 1 à 2 m au-dessus de l'autre, des trous dans
  // la route) deux passages qui se RECOUVRENT sans que leurs lignes du milieu se coupent : le contrôle d'avant ne les voyait pas. Un recouvrement
  // n'est permis qu'autour d'un vrai croisement (carrefour franc ou pont, ci-dessus) ou sous un pont / dans un tunnel 4,5 m plus bas.
  let recouvre = null;
  for (let i = 0; i < N && !recouvre; i += pas) { const cx = Math.floor(P.X[i] / GV), cz = Math.floor(P.Z[i] / GV);
    for (let a = -1; a <= 1 && !recouvre; a++) for (let b = -1; b <= 1 && !recouvre; b++) for (const j of grille.get((cx + a) + "," + (cz + b)) || []) {
      const ds = BOUCLE ? Math.min(j - i, N - j + i) : j - i, ww = P.W[i] + P.W[j];   // un autre passage, pas la même étendue d'eau (un lac large : deux points proches se touchent forcément)
      if (j < i + 30 || ds < 30 + 2 * ww) continue;
      if (Math.hypot(P.X[i] - P.X[j], P.Z[i] - P.Z[j]) >= ww - .5) continue;
      if (Math.abs(P.Y[i] - P.Y[j]) >= 4.5 && (P.PONT[i] || P.PONT[j] || P.TUN[i] || P.TUN[j])) continue;
      const dy = Math.abs(P.Y[i] - P.Y[j]);   // autour d'un carrefour, les deux routes doivent rester à plat l'une par rapport à l'autre (une qui monte, l'autre qui descend : des trous)
      if (croisements.some(c => c.bon && Math.abs(c.s1 - i) < 40 && Math.abs(c.s2 - j) < 40 && (!c.carrefour || dy < .4))) continue;
      recouvre = [i, j, dy]; break;
    } }
  if (recouvre) erreurs.push("Deux passages de la piste se recouvrent aux mètres " + recouvre[0] + " et " + recouvre[1] + " (" + recouvre[2].toFixed(1) + " m de haut entre eux) : écarter les deux routes, ou un vrai carrefour (à plat, à la même hauteur, plus de 25°), ou un pont 4,5 m plus haut.");
  // les voies « force » des fourches : leurs virages, leurs pentes, et elles ne touchent le reste du circuit qu'à leurs deux bouts
  for (const v of P.voies) {
    for (const p of P.pieces) { if (!p.voie || P.voies[p.voie - 1] !== v || !p.virage) continue;
      const R = (p.s1 - p.s0) / Math.abs(p.virage * Math.PI / 180), w = largeur(p) / 2; rayonMin = Math.min(rayonMin, R);
      if (R < w + 1.5) erreurs.push("Virage trop serré dans la fourche « " + v.nom + " » : « " + p.titre + " » (rayon " + R.toFixed(1) + " m pour une demi-largeur de " + w + " m)."); }
    let pm = 0; for (let s = v.a; s < v.b; s++) { const i = v.dec + s; haut = Math.max(haut, P.Y[i]); let net = false; for (let j = -8; j <= 8; j++) if (P.NET[P.voisin(i, j)]) net = true; if (!net) pm = Math.max(pm, Math.abs(P.PENTE[i])); }
    if (pm > .3) erreurs.push("Pente trop raide dans la fourche « " + v.nom + " » (" + Math.round(pm * 100) + " %) : allonger la pièce, ou la marquer « net » si c'est une chute."); penteMax = Math.max(penteMax, pm);
    if (v.allure < .72 || v.allure > 1.4) erreurs.push("Fourche « " + v.nom + " » : le décor de la voie « force » défilerait " + v.allure.toFixed(2) + " fois plus vite que l'autre pour compter les mêmes vrais mètres : rapprocher les pentes et les allures des deux voies.");
    for (let s = v.a + v.gA; s < v.b - v.gB; s += 2) { const i = v.dec + s;
      for (let j = 0; j < N; j += 2) { if (j >= v.a - 30 && j < v.b + 30) continue;
        if (Math.hypot(P.X[i] - P.X[j], P.Z[i] - P.Z[j]) < P.W[i] + P.W[j] + 1 && !(Math.abs(P.Y[i] - P.Y[j]) >= 4.5 && (P.PONT[i] || P.PONT[j] || P.TUN[i] || P.TUN[j]))) { erreurs.push("Fourche « " + v.nom + " » : sa voie « force » touche un autre bout du circuit (mètre " + j + ")."); j = N; s = v.b; } } }
  }
  return {ok: !erreurs.length, erreurs, croisements, fourches: P.voies.map(v => ({nom: v.nom, de: v.a, a: v.b, garde: [v.gA, v.gB], allure: +v.allure.toFixed(3), ecart: +v.ecart.toFixed(2), droite: v.droite})), longueur: N, tourVrai: +TOUR_VRAI.toFixed(1), haut: +haut.toFixed(1), penteMax: +penteMax.toFixed(3), rayonMin: +rayonMin.toFixed(1), fermeture: +P.fermeture.toFixed(2)};
}
