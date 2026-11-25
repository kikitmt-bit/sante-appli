/* ============ la zone, habillée : les passages piétons, les parcelles le long des courbes, et le contrôle du parcours (moteur/zone.js dit où sont les rues) ============ */
// Mêmes réponses que plan.js (nature, haut, bord, objets…) : champ.js, decor.js, terrain.js et forme.js ne savent pas laquelle des deux villes ils ont.
// Ce fichier vient après la piste : c'est elle qui dit où l'on traverse. Il ne dessine rien (aucun appel à three.js).
// Le bord d'une voie (g, d : sa gauche, sa droite) : "maisons" (défaut d'une rue), "serre" (les mêmes, côte à côte, tout près du trottoir), "boutiques", "residences", "haie", "rien",
// "mur" (défaut d'une ruelle), ou une liste [{a: de ce mètre, b: à celui-ci, style}] ; ce qui n'est pas dit prend le style par défaut.
// (lot 3) d'une voie : marches: {a, b} (un escalier, de ce mètre à celui-ci) ; d'une place : boutiques: [les côtés bordés de boutiques], garde: [ceux qui ont un garde-corps] (côté i : du point i
// au suivant) ; de la zone : jardins: [{nom, pts, x, z}] (arbres, bancs, kiosque, un portail là où une allée y entre), vues: [{x, z, r}] (rien de haut là : on regarde au loin).
function planDeZone() {
  const Z = ZONE, D = Z.D, V = Z.voies, T = PISTE;
  // où le parcours traverse une chaussée : un passage piéton, dans sa direction
  const passages = [], dessus = i => Z.champs(T.X[i], T.Z[i]).f < .12; let i0 = 0; while (i0 < T.N && dessus(i0)) i0++;
  if (!Z.velo) for (let n = 0; n < T.N;) { const i = (i0 + n) % T.N; if (!dessus(i)) { n++; continue; } let m = n; while (m < T.N + n && dessus((i0 + m) % T.N)) m++;
    const traversee = (a, b) => { const dx = T.X[b] - T.X[a], dz = T.Z[b] - T.Z[a], l = Math.hypot(dx, dz) || 1, x = (T.X[a] + T.X[b]) / 2, z = (T.Z[a] + T.Z[b]) / 2; Z.champs(x, z); const k = D.k, q = Z.place(k, x, z); passages.push({x, z, dx: dx / l, dz: dz / l, l: l / 2 + .7, w: 1.5, k, s: q.s, route: true, i0: a, i1: b}); };
    const a = i, e = m - n - 1, b = (a + e) % T.N, ec = (u, v) => { const d = T.H[(a + u) % T.N] - T.H[(a + v) % T.N]; return Math.abs(Math.atan2(Math.sin(d), Math.cos(d))); };   // (lot 3) deux rues traversées l'une après l'autre, au coin d'en face : deux passages, pas un seul en biais
    if (ec(0, e) > .8) { let u = 0, v = e; while (u < e && ec(0, u + 1) < .2) u++; while (v > u && ec(e, v - 1) < .2) v--; traversee(a, (a + u) % T.N); traversee((a + v) % T.N, b); const c = (a + Math.round((u + v) / 2)) % T.N; passages.push({x: T.X[c], z: T.Z[c], dx: Math.sin(T.H[c]), dz: -Math.cos(T.H[c]), l: 1, w: 1.9, k: -1, s: 0, coin: true}); } else traversee(a, b);
    n = m; }
  for (const c of Z.croisements) passages.push(Object.assign({velo: true}, c));   // (étape 15) là où une piste cyclable traverse une rue
  // à chaque croisement : le plateau (le carrefour au niveau des trottoirs), et un passage sur chaque branche
  const plateaux = [];   // {k, s0, s1} : la chaussée de la voie k est surélevée entre s0 et s1 (une rampe de 1,1 m de chaque côté)
  for (const n of Z.noeuds) {
    const rues = n.v.filter(q => V[q.k].sol === "chaussee"); if (rues.length < 2 || n.bout) continue;
    for (const q of rues) { const v = V[q.k], e = Z.enVoie(v, q.s); let d = 0;
      for (const w of rues) { if (w === q) continue; const o = V[w.k], f = Z.enVoie(o, w.s), sn = Math.max(.35, Math.abs(e.tx * f.tz - e.tz * f.tx)), cs = Math.abs(e.tx * f.tx + e.tz * f.tz); d = Math.max(d, (o.piste ? o.h - 1.15 : o.l / 2 + o.t / 2 + (Z.velo ? Z.RC - 3 : 0)) / sn + v.l / 2 * cs / sn); }
      if (Z.velo && !v.t) continue; if (!Z.velo) plateaux.push({k: q.k, s0: q.s - d - 1.8, s1: q.s + d + 1.8});
      for (const sg of [-1, 1]) { const s = q.s + sg * d; if (s < 8 || s > v.L - 8) continue; const p = Z.enVoie(v, s); if (passages.some(a => !a.velo && (Math.hypot(a.x - p.x, a.z - p.z) < 4.5 || a.k === q.k && Math.abs(a.s - s) < 4))) continue;
        passages.push({x: p.x, z: p.z, dx: -p.tz, dz: p.tx, l: v.l / 2, w: 1.25, k: q.k, s}); } } }
  for (const p of passages) if (p.route) { const v = V[p.k], e = Z.enVoie(v, p.s), biais = Math.abs(p.dx * e.tx + p.dz * e.tz) * v.l / 2; plateaux.push({k: p.k, s0: p.s - 1.9 - biais, s1: p.s + 1.9 + biais}); }
  for (let k = 0; k < V.length; k++) { const L = plateaux.filter(p => p.k === k).sort((a, b) => a.s0 - b.s0); for (let i = 0; i + 1 < L.length; i++) if (L[i + 1].s0 < L[i].s1 + 4) { L[i + 1].s0 = L[i].s0; L[i + 1].s1 = Math.max(L[i + 1].s1, L[i].s1); L[i].mort = true; } }
  const RAMPE = 1.1, plats = Z.velo ? Z.plats : plateaux.filter(p => !p.mort), platsDe = V.map((v, k) => plats.filter(p => p.k === k));
  /* rampe : de combien de mètres on est entré dans le plateau le plus proche (négatif : encore dehors) ; surPlat : 1 au niveau des trottoirs, 0 en bas, une rampe entre les deux */
  const rampe = (k, s) => { let m = -99; for (const p of platsDe[k]) m = Math.max(m, Math.min(s - p.s0, p.s1 - s)); return m; };
  const surPlat = (k, s) => clamp(1 + rampe(k, s) / RAMPE, 0, 1);
  const surPassage = (x, z, plus = 2) => passages.find(p => { const ex = x - p.x, ez = z - p.z; return Math.abs(ex * p.dx + ez * p.dz) < p.l + plus && Math.abs(ez * p.dx - ex * p.dz) < p.w; }) || null;
  function nature(x, z) {   // « chaussee », « passage », « trottoir », « place » (pavés), « allee », « chemin » (de terre), « jardin », « pelouse », « dehors »
    Z.champs(x, z);
    if (D.w < 0 && D.o > 0) return "eau";   // (étape 15, lot 2)
    if (D.f < 0) return surPassage(x, z) ? "passage" : "chaussee";
    if (Z.velo && D.t < 0) { if (D.y < 0) return "piste"; if (D.b < 0) return "bande"; }
    if (D.t < 0) return "trottoir"; if (D.y < 0 && Z.eaux.length) return "piste"; if (D.p < 0) return "place"; if (D.a < 0) return "allee"; if (D.c < 0) return "chemin";
    return Math.min(D.t, D.p, D.a, D.c, D.y) < 16 ? "jardin" : Z.bord(x, z) > 0 ? "dehors" : "pelouse";
  }
  const MARCHE = .12;   // la hauteur d'une bordure
  const haut = (x, z) => { const h = Z.sol(x, z); Z.champs(x, z); if (D.w < 0 && D.o > 0) return Z.W.y; if (D.f >= 0) return h; if (Z.velo) return h - Z.creux(x, z); const k = D.k; return h - MARCHE * (1 - surPlat(k, Z.place(k, x, z).s)); };
  const distDur = (x, z) => { Z.champs(x, z); return Math.min(D.t, D.p, D.a, D.c, Z.eaux.length ? Math.min(D.y, D.w) : 99); };   // la distance au sol dur (ou à l'eau) le plus proche (négative : dessus)
  return {zone: Z, graine: Z.graine, nature, haut, bord: Z.bord, sol: Z.sol, passages, plateaux: plats, surPlat, rampe, RAMPE, MARCHE, surPassage, distDur, objets: [], sols: [], entrees: [], maisons: [], enMarches: (x, z, plus = 0) => { Z.champs(x, z); const k = D.k, m = k >= 0 && V[k].marches; if (!m) return false; const s = Z.place(k, x, z).s; return s > m.a - plus && s < m.b + plus; }};
}

/* ---- ce qui est posé : les boutiques, les maisons, les clôtures, la rue, les jardins. Tout est essayé à sa place le long de la courbe ; ce qui ne tient pas n'est pas posé. ---- */
function remplirZone() {
  const P = PLAN; if (!P || P.rempli) return; P.rempli = true;
  const Z = P.zone, V = Z.voies, D = Z.D, R = hasard(P.graine * 7121 + 13), tire = (a, b) => a + (b - a) * R(), choix = l => l[Math.floor(R() * l.length)];
  const poser = (o, x, z, lacet, q = {}) => { const b = Object.assign({o, x, z, lacet}, q); P.objets.push(b); return b; };
  // les boîtes déjà prises (les bâtiments), rangées par cases de 16 m
  const BOITES = new Map(), cle = (a, b) => a * 4096 + b;
  const autour = (x, z, f) => { const cx = Math.floor(x / 16), cz = Math.floor(z / 16); for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) for (const q of BOITES.get(cle(cx + a, cz + c)) || []) if (f(q)) return true; return false; };
  const prendre = b => { const k = cle(Math.floor(b.x / 16), Math.floor(b.z / 16)); if (!BOITES.has(k)) BOITES.set(k, []); BOITES.get(k).push(b); };
  const boitesDe = (x, z, d) => autour(x, z, b => distBoite(b, x, z) < d), sauvages = g => ((NIVEAU.sauvages || {})[g] || {}).nums || [];
  const boite = (x, z, lacet, l, p) => ({x, z, c: Math.cos(lacet), s: Math.sin(lacet), l: l / 2, p: p / 2});
  const points = b => [[1, 1], [1, -1], [-1, 1], [-1, -1], [0, 1], [0, -1], [1, 0], [-1, 0], [.5, 1], [-.5, 1], [0, 0]].map(([u, v]) => [b.x + u * b.l * b.c + v * b.p * b.s, b.z - u * b.l * b.s + v * b.p * b.c]);
  const croise = (A, B, m) => { const G = Object.assign({}, A, {l: A.l + m, p: A.p + m}); return points(G).some(([x, z]) => distBoite(B, x, z) < 0) || points(B).some(([x, z]) => distBoite(G, x, z) < 0); };
  const VUES = Z.donnees.vues || [], JD = Z.donnees.jardins || [], dansVue = (x, z, d = 0) => VUES.some(v => Math.hypot(v.x - x, v.z - z) < v.r + d), dansJardin = (x, z) => JD.some(j => { let o = false; for (let a = 0, b = j.pts.length - 1; a < j.pts.length; b = a++) { const A = j.pts[a], B = j.pts[b]; if ((B.z > z) !== (A.z > z) && x < (A.x - B.x) * (z - B.z) / (A.z - B.z) + B.x) o = !o; } return o; });
  const tient = (b, m, libre = .9) => !dansVue(b.x, b.z, 4) && points(b).every(([x, z]) => P.distDur(x, z) >= libre && Z.bord(x, z) <= -3) && !autour(b.x, b.z, q => croise(b, q, m));
  // un point du bord d'une voie : sg = -1 à gauche, 1 à droite ; e mètres derrière le trottoir ; (nx, nz) : vers la rue
  const bord = (v, sg, s, e) => { const q = Z.enVoie(v, s, sg * (v.h + e)), nx = sg * q.tz, nz = -sg * q.tx; return {x: q.x, z: q.z, nx, nz, lacet: Math.atan2(nx, nz)}; };
  const styleEn = (v, sg, s) => { const b = sg < 0 ? v.g : v.d, def = v.sol === "chaussee" ? (v.t ? "maisons" : "rien") : v.sol === "paves" ? "mur" : v.sol === "terre" || v.sol === "cyclable" ? "rien" : "arbres"; if (!b) return def; if (typeof b === "string") return b; const q = b.find(a => s >= (a.a || 0) && s < (a.b === undefined ? 1e9 : a.b)); return q ? q.style : def; };
  const noms = ["Boulangerie", "Librairie", "Fleuriste", "Café", "Épicerie", "Coiffeur", "Pharmacie", "Cycles", "Pâtisserie", "Primeur", "Presse", "Cordonnier"]; let kEns = Math.floor(R() * 12);
  const chemin = (x0, z0, x1, z1, w, nature = "trottoir") => P.sols.push({x0, z0, x1, z1, w, nature});
  // 0. les parvis : le trottoir élargi devant chaque file de boutiques (avant tout le reste : il compte dans les distances)
  const FILES = [];
  for (const v of V) for (const sg of [-1, 1]) { let a = null; for (let s = 0; s <= v.L + 1; s += 1) { const on = s <= v.L && styleEn(v, sg, s) === "boutiques"; if (on && a === null) a = s; if (!on && a !== null) { if (s - a > 12) FILES.push({v, sg, a, b: Math.min(s, v.L)}); a = null; } } }
  for (const f of FILES) { f.e = 2.6; Z.parvis.push({k: f.v.k, sg: f.sg, s0: f.a, s1: f.b, e: 2.6}); }
  for (const p of Z.places) for (const i of p.boutiques || []) { const A = p.pts[i], B = p.pts[(i + 1) % p.pts.length], l = Math.hypot(B.x - A.x, B.z - A.z), tx = (B.x - A.x) / l, tz = (B.z - A.z) / l; FILES.push({v: {k: -1, l: 0, t: 0, h: 0, L: l, n: 2, P: [[A.x, A.z], [B.x, B.z]], S: [0, l], TX: [tx, tx], TZ: [tz, tz]}, sg: ((A.x + B.x) / 2 - p.cx) * -tz + ((A.z + B.z) / 2 - p.cz) * tx > 0 ? 1 : -1, a: 1.2, b: l - .6, e: .1}); }   // (lot 3) les façades d'une place : un côté droit, sans trottoir
  // 1. les repères de la zone ("objets" : une fontaine, un kiosque…), à leur place exacte
  for (const q of Z.donnees.objets || []) { poser(q.o, q.x, q.z, q.lacet || 0, Object.assign({dur: true}, q)); if (q.r) prendre(boite(q.x, q.z, 0, q.r * 2, q.r * 2)); }
  // 2. les boutiques, côte à côte
  for (const f of FILES) { const n = Math.max(1, Math.round((f.b - f.a) / 9)), w = (f.b - f.a) / n;
    for (let k = 0; k < n; k++) {
      const s = f.a + (k + .5) * w, A = bord(f.v, f.sg, s - w / 2, f.e), B = bord(f.v, f.sg, s + w / 2, f.e), mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2, q = bord(f.v, f.sg, s, f.e), L = q.lacet, pr = 6;
      const angle = Math.acos(clamp(A.nx * B.nx + A.nz * B.nz, -1, 1)), creux = (B.nx - A.nx) * (B.x - A.x) + (B.nz - A.nz) * (B.z - A.z) < 0;   // creux : la façade est au creux de la courbe, les fonds s'écartent ; sinon ils se serrent
      const l = Math.hypot(B.x - A.x, B.z - A.z) - .08 - (creux ? 0 : 2 * pr * Math.tan(angle / 2)), b = boite(mx - q.nx * pr / 2, mz - q.nz * pr / 2, L, l, pr); if (l < 5.2 || !tient(b, -.2, -.15)) continue; prendre(b);
      const im = l > 7.4 && R() < .2, nom = noms[kEns++ % noms.length]; poser(im ? "immeuble_pente" : "magasin_pente", b.x, b.z, L, {varie: im, l, p: pr, enseigne: im ? undefined : nom, dur: true, voir: !im, pignon: !!NIVEAU.sorte && !im, dos: !!NIVEAU.sorte && im});
      const pt = (dx, e) => [mx + Math.cos(L) * dx + q.nx * e, mz - Math.sin(L) * dx + q.nz * e];
      if (!im && (nom === "Café" || nom === "Pâtisserie")) for (const g of [-1, 1]) { const [x, z] = pt(g * 1.9, 1.45); poser("terrasse", x, z, L, {r: 1, libre: true}); }
      else if (!im && (nom === "Primeur" || nom === "Épicerie")) { const [x, z] = pt(-1.4, 1.3); poser("etal", x, z, L, {r: 1.2, libre: true}); }
      else if (!im && nom === "Fleuriste") for (const g of [-1, 1]) { const [x, z] = pt(g * 2.4, .9); poser("massif", x, z, 0, {r: .9, r0: .6, libre: true}); } } }
  // 3. les maisons et les résidences : on avance le long de la courbe, chacune essayée à plusieurs reculs
  for (const v of V) for (const sg of [-1, 1]) {
    for (let s = 5; s < v.L - 4;) {
      const st = styleEn(v, sg, s), res = st === "residences", serre = st === "serre"; if (st !== "maisons" && !res && !serre) { s += 2; continue; }
      const l = res ? tire(12, 15) : tire(7.6, 9.2), pr = res ? 8.4 : tire(5.9, 6.6), w = l + (res ? tire(7, 9) : serre ? tire(1.5, 2.6) : tire(5, 6.6)), e0 = res ? 6 : serre ? tire(2.3, 2.8) : tire(3.8, 5.4), sc = s + w / 2; let mis = null;
      if (sc > v.L - 3 || styleEn(v, sg, sc) !== st) { s += 2; continue; }
      for (const de of [0, 1.2, 2.4]) { const q = bord(v, sg, sc, e0 + de + pr / 2), b = boite(q.x, q.z, q.lacet, l + (serre ? .4 : 1.2), pr + 1.2); if (!tient(b, serre ? .5 : 1.6)) continue; mis = {q, L: q.lacet, b, e: e0 + de}; break; }
      if (!mis) { s += 1.5; continue; }
      prendre(mis.b); const M = {v, sg, sa: sc - w / 2, sb: sc + w / 2, sc, l, pr, e: mis.e, L: mis.L, x: mis.q.x, z: mis.q.z, genre: choix(serre ? ["muret", "muret", "haie"] : ["haie", "barriere", "barriere", "muret"]), hh: choix(serre ? [.5] : [.6, .75, .9]), larg: res ? 1.2 : .9};
      poser(res ? "immeuble_pente" : "maison_pente", M.x, M.z, M.L, {varie: true, l, p: pr, dur: true, dos: !!NIVEAU.sorte});
      // la porte (à gauche de la façade) et son chemin jusqu'au trottoir
      const px = res ? 0 : -l * .27, pt = (dx, e) => [M.x + Math.cos(M.L) * dx + mis.q.nx * e, M.z - Math.sin(M.L) * dx + mis.q.nz * e]; let e1 = pr / 2 + .6; const [dx0, dz0] = pt(px, e1);
      while (e1 < 18) { const [x, z] = pt(px, e1); if (P.distDur(x, z) < .05) break; e1 += .1; }
      if (e1 < 18) { const [dx1, dz1] = pt(px, e1 + .15); chemin(dx0, dz0, dx1, dz1, res ? 2 : 1.4); Z.champs(dx1, dz1); if (D.k === v.k) M.sp = Z.place(v.k, dx1, dz1).s; }
      P.maisons.push(M); s = sc + w / 2; } }
  // 4. les clôtures : le long du trottoir, d'un coin à l'autre, ouvertes devant chaque porte
  for (const v of V) { if (v.sol !== "chaussee" || !v.t) continue; for (const sg of [-1, 1]) {
    const MS = P.maisons.filter(m => m.v === v && m.sg === sg); let debut = null;
    const bonne = s => { const st = styleEn(v, sg, s); if (st === "boutiques" || st === "rien") return false; const q = bord(v, sg, s, .5), d = P.distDur(q.x, q.z); return d > .34 && d < .75 && !MS.some(m => m.sp !== undefined && Math.abs(s - m.sp) < m.larg); };
    const run = (a, b) => { let der = null; if (b - a < 3.4) return; for (let s = a; s < b - .4;) {
      let c = Math.min(b, s + .5); const A = bord(v, sg, s, .5), m = MS.find(q => s >= q.sa && s < q.sb), fin = m ? Math.min(b, Math.max(m.sb, s + .6)) : b;
      for (;;) { const n = Math.min(fin, c + .5); if (n <= c || n - s > 3.2) break; const B = bord(v, sg, n, .5), M = bord(v, sg, (s + n) / 2, .5); if (Math.hypot((A.x + B.x) / 2 - M.x, (A.z + B.z) / 2 - M.z) > .06) break; c = n; }
      const B = bord(v, sg, c, .5), l = Math.hypot(B.x - A.x, B.z - A.z), n = bord(v, sg, (s + c) / 2, .5), genre = m ? m.genre : styleEn(v, sg, s) === "haie" ? "haie" : styleEn(v, sg, s) === "cloture" ? "cloture_bois" : ["barriere", "haie"][Math.floor(s / 34 + v.k * 3 + sg) & 1], h = genre === "haie";
      if (der && l > .5) der.fin = genre !== "cloture_bois"; if (l > .5) der = poser(genre, (A.x + B.x) / 2, (A.z + B.z) / 2, Math.atan2(-(B.z - A.z), B.x - A.x), {long: l + (h ? .06 : 0), h: h ? (m ? m.hh : .7) : genre === "muret" ? .6 : undefined, l, p: h ? .75 : .4, dur: true, haie: true, incline: h}); s = c; } if (der) der.fin = true; };
    for (let s = 0; s <= v.L; s += .5) { const on = bonne(s); if (on && debut === null) debut = s; if ((!on || s + .5 > v.L) && debut !== null) { run(debut, s - .25); debut = null; } } } }
  // 4 bis (lot 3). une ruelle entre ses murs (une haie haute par endroits) ; un escalier entre deux murets à main courante ; le garde-corps d'un belvédère
  for (const v of V) { if (v.sol !== "paves") continue; for (const sg of [-1, 1]) { let ton = Math.floor(R() * 4), genre = R() < (sg < 0 ? .7 : .94) ? "mur_ruelle" : "haie", reste = tire(14, 26), dep = 0;
    const ok = s => { if (styleEn(v, sg, s) !== "mur") return false; const q = bord(v, sg, s, .34); return P.distDur(q.x, q.z) > .28; };
    for (let s = 0; s < v.L;) { if (!ok(s)) { s += .25; continue; } let c = s; while (c + .25 <= Math.min(v.L, s + 2.8) && ok(c + .25)) { c += .25; const A = bord(v, sg, s, .34), B = bord(v, sg, c, .34), M = bord(v, sg, (s + c) / 2, .34); if (Math.hypot((A.x + B.x) / 2 - M.x, (A.z + B.z) / 2 - M.z) > .07) break; } if (c - s < .4) { s = c + .25; continue; }
      const A = bord(v, sg, s, .34), B = bord(v, sg, c, .34), l = Math.hypot(B.x - A.x, B.z - A.z), L = Math.atan2(A.nx + B.nx, A.nz + B.nz), rampe = !!v.marches && c > v.marches.a - 1 && s < v.marches.b + 1, g = rampe ? "mur_ruelle" : genre, mur = g === "mur_ruelle"; if ((reste -= c - s) < 0) { ton = Math.floor(R() * 4); genre = R() < (sg < 0 ? .7 : .94) ? "mur_ruelle" : "haie"; reste = tire(14, 26); }
      const lampe = mur && sg > 0 && s - dep > 15; if (lampe) dep = s;
      poser(g, (A.x + B.x) / 2, (A.z + B.z) / 2, L, {long: l + .04, l, p: .4, dur: true, haie: true, h: rampe ? .5 : mur ? 2.05 : 1.5, rampe, ton, lampe, porte: mur && !rampe && l > 2 && R() < .07, lierre: mur && !rampe && R() < .3, incline: !mur}); s = c; } } }
  for (const p of Z.places) for (const i of p.garde || []) { const A = p.pts[i], B = p.pts[(i + 1) % p.pts.length], l = Math.hypot(B.x - A.x, B.z - A.z), ux = (B.x - A.x) / l, uz = (B.z - A.z) / l, ex = p.cx - (A.x + B.x) / 2, ez = p.cz - (A.z + B.z) / 2, d = Math.hypot(ex, ez), nx = ex / d, nz = ez / d, g = p.garde, n = p.pts.length, a0 = g.includes((i + n - 1) % n) ? .35 : 1.4, a1 = l - (g.includes((i + 1) % n) ? .35 : 1.4), m = Math.max(1, Math.round((a1 - a0) / 2.6));
    for (let k = 0; k < m; k++) { const s = a0 + (k + .5) * (a1 - a0) / m; poser("garde_corps", A.x + ux * s + nx * .35, A.z + uz * s + nz * .35, Math.atan2(-uz, ux), {long: (a1 - a0) / m + .02, l: (a1 - a0) / m, p: .3, dur: true, haie: true}); } }
  // 4 ter (étape 14). la campagne : les clôtures le long d'un chemin ("cloture" : des prés, "haie" : entre deux jardins), les potagers, le verger
  for (const v of V) { const rte = v.sol === "chaussee" && !v.t, pl = rte ? .5 : 0; if (v.sol !== "terre" && !rte) continue; for (const sg of [-1, 1]) {   // (étape 15) rte : une route de campagne, ses clôtures derrière l'accotement
    const ok = (s, st) => { if (styleEn(v, sg, s) !== st) return false; const e = pl + (st === "haie" ? .85 : 1.1), q = bord(v, sg, s, e), d = P.distDur(q.x, q.z); return d > e - .25 - pl && !boitesDe(q.x, q.z, .5); };
    let der = null, fin = -1; for (let s = .5; s < v.L - .5;) { const st = styleEn(v, sg, s); if (st !== "cloture" && st !== "haie" || !ok(s, st)) { s += .5; continue; }
      const e = pl + (st === "haie" ? .85 : 1.1); let c = s; while (c + .5 <= Math.min(v.L, s + (st === "haie" ? 3 : 2.7)) && ok(c + .5, st)) { c += .5; const A = bord(v, sg, s, e), B = bord(v, sg, c, e), M = bord(v, sg, (s + c) / 2, e); if (Math.hypot((A.x + B.x) / 2 - M.x, (A.z + B.z) / 2 - M.z) > .09) break; }
      if (c - s < (st === "haie" ? 1.6 : 1)) { s = c + .5; continue; } const A = bord(v, sg, s, e), B = bord(v, sg, c, e), l = Math.hypot(B.x - A.x, B.z - A.z), L = Math.atan2(-(B.z - A.z), B.x - A.x), h = st === "haie";
      if (der && s > fin + .01) der.fin = true; der = poser(h ? "haie" : "cloture_bois", (A.x + B.x) / 2, (A.z + B.z) / 2, L, {long: l + (h ? .06 : 0), h: h ? 1.1 : undefined, l, p: h ? .75 : .3, dur: true, haie: true, incline: h}); fin = s = c; } if (der) der.fin = true; } }   // fin : le dernier pan d'une clôture a son poteau au bout (24/11, Kiki)
  const tournee = (a, x, z) => { const q = a.pts, i = a.cote || 0, A = q[i], B = q[(i + 1) % q.length], l = Math.hypot(B.x - A.x, B.z - A.z), ux = (B.x - A.x) / l, uz = (B.z - A.z) / l; return {ux, uz, x: a.cx + ux * x - uz * z, z: a.cz + uz * x + ux * z, lacet: Math.atan2(-uz, ux)}; };   // une place dans une aire, rangée le long d'un de ses côtés (cote)
  for (const a of Z.aires) { const R2 = hasard(P.graine * 31 + Math.round(a.cx)), t2 = (u, w) => u + (w - u) * R2(), G = Math.hypot(a.x1 - a.x0, a.z1 - a.z0) / 2;
    if (a.genre === "potagers") { let cab = 0; for (let x = -G; x < G; x += 6.4) for (let z = -G; z < G; z += 5.2) { const q = tournee(a, x, z), cabane = cab % 5 === 2; if (Z.distPlace(a, q.x, q.z) > -2.4) continue; const b = boite(q.x, q.z, q.lacet, cabane ? 2.8 : 5, cabane ? 2.4 : 3.8); if (!tient(b, .6, 1)) continue; prendre(b); cab++; poser(cabane ? "cabane_jardin" : "carre_potager", q.x, q.z, q.lacet, {l: cabane ? 2.8 : 5, p: cabane ? 2.4 : 3.8, dur: true, voir: cabane}); } }
    if (a.genre === "verger") for (let x = -G; x < G; x += 6) for (let z = -G; z < G; z += 6) { const q = tournee(a, x + t2(-.3, .3), z + t2(-.3, .3)); if (Z.distPlace(a, q.x, q.z) > -2 || P.distDur(q.x, q.z) < 2.6 || boitesDe(q.x, q.z, 3)) continue; poser("arbre_rue", q.x, q.z, R2() * 6, {esp: a.esp || "pommier", r: .5, couronne: 1.9, ech: .74, dur: P.distDur(q.x, q.z) < 6}); }
    if (a.genre === "champ") { const vi = a.culture === "vignes", pz = vi ? 2.3 : a.culture === "ble" ? 1.15 : 1.7, px = vi ? 2.5 : 3; for (let x = -G; x < G; x += px) for (let z = -G; z < G; z += pz) { const q = tournee(a, x, z); if (Z.distPlace(a, q.x, q.z) > -1) continue; const d = P.distDur(q.x, q.z); if (d < 1.7 || d > 22 || boitesDe(q.x, q.z, 2) || VUES.some(v => Math.hypot(v.x - q.x, v.z - q.z) < v.r)) continue; pres(q.x, q.z); if (Math.hypot(q.x - PISTE.X[Q.i], q.z - PISTE.Z[Q.i]) > 24) continue; poser("rang_" + a.culture, q.x, q.z, q.lacet, {l: px, p: .6, libre: true, long: px + .02}); } }
    if (a.genre === "lande") for (let k = 0; k < 1500; k++) { const x = t2(a.x0, a.x1), z = t2(a.z0, a.z1), n = fbm(x / 8 + 4, z / 8), w = R2(); if (Z.distPlace(a, x, z) > -1 || n < .42) continue; const d = P.distDur(x, z); if (d < .8 || d > 30 || boitesDe(x, z, 1)) continue; poser(w < .93 ? "bruyere" : w < .97 ? "rocher_mousse" : "jeune_pousse", x, z, w * 60, {r: .7, ech: .7 + R2() * .6, libre: true}); }
    if (a.genre === "pre") for (let k = 0; k < 26; k++) { const x = t2(a.x0, a.x1), z = t2(a.z0, a.z1); if (Z.distPlace(a, x, z) > -5 || P.distDur(x, z) < 5) continue; { const top = Z.aireEn(x, z); if (!top || top.genre !== "pre") continue; } if (k % 7 === 0) poser("meule", x, z, t2(0, 6), {r: 1.6}); else if (k % 5 === 1 && sauvages("pre").length) poser("pokemon", x, z, 0, {num: choix(sauvages("pre")), r: .8}); } }
  // 5. la rue : réverbères d'un côté puis de l'autre, voitures garées, boîtes aux lettres
  for (const v of V) { if (v.sol !== "chaussee" || !v.t) continue; let k = 0;
    if (v.piste) { let m = 0; for (let s = 4; s < v.L - 3; s += 2.9, m++) for (const sg of [-1, 1]) { const e = v.l / 2 + .2 + (v.piste.b - .2) / 2, q = Z.enVoie(v, s, sg * e), dans = d => { const w = Z.enVoie(v, s + d, sg * e); return P.nature(w.x, w.z) === "bande" && Z.ecart(v.k) < v.piste.b + .1; }, L = Math.atan2(-q.tz, q.tx), g = (m + (sg > 0 ? 0 : 2)) % 4; if (!dans(-1.5) || !dans(1.5)) continue;   // (étape 15) la bande : un arbre, un massif long, un réverbère, un massif long…
      if (g === 0) poser("arbre_rue", q.x, q.z, m * 2.4, {esp: v.esp, tige: v.esp === "cerisier" ? 3.5 : undefined, r: .3, couronne: 1.4, ech: .62, dur: true, bordure: true}); else if (g === 2) poser("lampadaire", q.x, q.z, 0, {r: .24, dur: true, bordure: true}); else poser("plate_bande", q.x, q.z, L, {l: 2.5, p: 1, long: 2.5, dur: true, haie: true, ton: m}); } }
    else for (let s = 7; s < v.L - 4; s += 13) { const sg = k++ % 2 ? 1 : -1, eb = Z.velo ? v.t - .4 : .38, q = Z.enVoie(v, s, sg * (v.l / 2 + eb)); Z.champs(q.x, q.z); if (Math.abs(D.f - eb) > .1 || P.passages.some(p => Math.hypot(p.x - q.x, p.z - q.z) < p.l + 2.2) || !degage(q.x, q.z, Z.velo ? 1.8 : 1.04) || Z.velo && (Math.abs(D.t + .4) > .15 || Z.croisements.some(p => Math.hypot(p.x - q.x, p.z - q.z) < 8))) continue; poser("lampadaire", q.x, q.z, 0, {r: .24, dur: true, bordure: true}); }
    if (v.voitures !== false && v.l >= 6) { const sg = v.k % 2 ? 1 : -1; for (let s = 10; s < v.L - 8; s += 6.4) { if (R() < .5 || P.rampe(v.k, s) > -5.5 || v.ponts && Z.surPont(v, s, 9) || (Z.donnees.vides || []).some(w => w.v === v.id && s > w.s0 - 4 && s < w.s1 + 4)) continue; const q = Z.enVoie(v, s, sg * (v.l / 2 - 1.1)); Z.champs(q.x, q.z); if (D.k !== v.k || Math.abs(D.f + 1.1) > .15) continue; if (Z.velo && (!degage(q.x, q.z, 2.3) || P.passages.some(p => Math.hypot(p.x - q.x, p.z - q.z) < 7))) continue; const dir = sg > 0 ? 1 : -1; poser("voiture", q.x, q.z, Math.atan2(-q.tz * dir, q.tx * dir), {l: 4.6, p: 1.9, boiteX: true, dur: true, incline: true}); } } }
  for (const m of P.maisons) { if (m.sp === undefined || m.pr > 8) continue; const q = bord(m.v, m.sg, m.sp + (m.larg + .35) * (R() < .5 ? -1 : 1), .55); if (P.distDur(q.x, q.z) > .3) poser("boite_lettres", q.x, q.z, q.lacet, {r: .3, libre: true}); }
  if (Z.eaux.length) habillerEaux(poser, R, degage);
  // 6. les jardins et les bois : par essais, jamais sur du dur, ni dans une maison ; plus serrés loin des rues
  const S = new Map(), semer = (x, z, r) => { const k = cle(Math.floor(x / 6), Math.floor(z / 6)); if (!S.has(k)) S.set(k, []); S.get(k).push([x, z, r]); };
  const libreA = (x, z, r) => { const cx = Math.floor(x / 6), cz = Math.floor(z / 6); for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) for (const q of S.get(cle(cx + a, cz + c)) || []) if (Math.hypot(q[0] - x, q[1] - z) < q[2] + r) return false; return true; };
  const boitesPres = (x, z, d) => autour(x, z, b => distBoite(b, x, z) < d);
  const chemins = (x, z, d) => P.sols.some(s => { if (Math.abs(s.x0 - x) > 20 || Math.abs(s.z0 - z) > 20) return false; const ux = s.x1 - s.x0, uz = s.z1 - s.z0, t = clamp(((x - s.x0) * ux + (z - s.z0) * uz) / (ux * ux + uz * uz || 1), 0, 1); return Math.hypot(x - s.x0 - ux * t, z - s.z0 - uz * t) < s.w / 2 + d; });
  for (const q of P.objets) if (q.r && !q.haie) semer(q.x, q.z, q.r);
  // (lot 3) un jardin : ses portails, les bancs et les réverbères le long de son allée, un kiosque, des massifs, des bosquets
  for (const j of JD) for (const v of V) { if (v.sol !== "sable" || v.nom !== j.nom) continue; const pt = (s, u) => Z.enVoie(v, s, u), dur = (x, z) => P.distDur(x, z);
    for (const bout of [0, 1]) { let s = bout ? v.L : 0; const pas = bout ? -.25 : .25; while (s >= 0 && s <= v.L) { const q = pt(s, 0); if (Z.champs(q.x, q.z).t > .55) break; s += pas; } const q = pt(s, 0), nx = bout ? q.tx : -q.tx, nz = bout ? q.tz : -q.tz; if (bout) j.s1 = s; else j.s0 = s;
      poser("portail_parc", q.x, q.z, Math.atan2(-nz, nx), {eau: v.l + .5, texte: j.nom.replace(/^Le /, ""), ouvert: true, sansHaie: true, r: .1, voir: true}); for (const u of [-1, 1]) { const w = pt(s, u * (v.l / 2 + .8)); semer(w.x, w.z, 1.6); } }
    const m = pt((j.s0 + j.s1) / 2, 0); for (const u of R() < .5 ? [13, -13, 16, -16] : [-13, 13, -16, 16]) { const x = m.x - m.tz * u, z = m.z + m.tx * u; if (dur(x, z) < 6 || !dansJardin(x, z) || boitesPres(x, z, 5) || !libreA(x, z, 5)) continue; poser("kiosque", x, z, Math.atan2(m.x - x, m.z - z), {r: 4.1, dur: true, voir: true}); semer(x, z, 5.2); break; }
    let k = Math.floor(R() * 4); for (let s = j.s0 + 7; s < j.s1 - 6; s += 8.5, k++) { const sg = k % 2 ? 1 : -1, q = pt(s, sg * (v.l / 2 + 1)), L = Math.atan2(sg * q.tz, -sg * q.tx); if (Math.abs(dur(q.x, q.z) - 1) > .35 || !libreA(q.x, q.z, 1.2)) continue; semer(q.x, q.z, 1.3); if (k % 4 === 1) poser("lampadaire", q.x, q.z, 0, {r: .3, dur: true}); else if (k % 4 === 3) poser("massif", q.x, q.z, 0, {r: 1.1, r0: .7, dur: true}); else poser("banc", q.x, q.z, L, {r: 1, dur: true, voir: true}); }
    const xs = j.pts.map(q => q.x), zs = j.pts.map(q => q.z); for (let x = Math.min(...xs) + 4; x < Math.max(...xs); x += 4.4) for (let z = Math.min(...zs) + 4; z < Math.max(...zs); z += 4.4) { const X = x + tire(-1.6, 1.6), Y = z + tire(-1.6, 1.6), u = R(), w = R(), b = fbm(X / 26 + P.graine, Y / 26 + 3) > .5, d = dur(X, Y), r = b ? 2.1 : 3; if (!dansJardin(X, Y) || d < 2.6 || u > (b ? .62 : .13) || !libreA(X, Y, r) || boitesPres(X, Y, 2.4)) continue; semer(X, Y, r); if (w < .12) poser("buisson", X, Y, 0, {r: 1}); else poser("arbre_rue", X, Y, w * 31, {r: .6, couronne: 2.5, dur: d < 6}); } }
  for (const m of P.maisons) { if (m.pr > 8) continue; for (const dx of [-.36, .12, .4]) { if (R() < .35) continue;
    const e = m.pr / 2 + m.e * tire(.42, .62), x = m.x + Math.cos(m.L) * dx * m.l + Math.sin(m.L) * e, z = m.z - Math.sin(m.L) * dx * m.l + Math.cos(m.L) * e, t = R(); if (P.distDur(x, z) < 1.2 || chemins(x, z, 1) || boitesPres(x, z, .9) || !libreA(x, z, 1.1)) continue; semer(x, z, 1.1);
    if (t < .55) poser(t < .3 ? "massif" : "buisson", x, z, 0, {r: 1.1}); else if (degage(x, z, 3.3)) poser("arbre_rue", x, z, R() * 6, {esp: t < .8 ? "pommier" : "cerisier", r: .5, couronne: 1.6, ech: .62}); } }
  // (24/11, Kiki : « un gros arbre qui flotte, sans tronc ») les silhouettes de forêt n'ont pas de tronc : jamais à moins de 40 m du chemin, et un peu enfoncées
  for (let x = Z.xa + 20; x < Z.xb - 20; x += 4.6) for (let z = Z.za + 20; z < Z.zb - 20; z += 4.6) {
    const X = x + tire(-1.9, 1.9), Y = z + tire(-1.9, 1.9), u = R(), v = R(), w = R(), bz = Z.bord(X, Y); if (bz > 6 || dansVue(X, Y) || dansJardin(X, Y)) continue; const d = Math.min(P.distDur(X, Y), bz + Z.MARGE); pres(X, Y); const proche = Math.hypot(X - PISTE.X[Q.i], Y - PISTE.Z[Q.i]);
    // (étape 14) un bois : de vrais troncs près du chemin, des silhouettes loin ; un pré, un verger : presque rien
    const ai = Z.aireEn(X, Y, 3), g = ai && ai.genre; if (g && g !== "foret") { if (g !== "pre" || u > .012 || d < 6 || proche < 8 || !libreA(X, Y, 3)) continue; semer(X, Y, 3); poser("arbre_rue", X, Y, v * 6.28, {r: .6, couronne: 2.5}); continue; }
    if (g) { if (proche > 32) { if (d < 3 || u > .86 || boitesPres(X, Y, 2.1) || !libreA(X, Y, 1.9)) continue; semer(X, Y, 1.9); poser("masse_bois", X, Y, v * 6.28, {esp: ai.esp, r: 1.6, couronne: 2, pres: true, ech: 1 + w * .5, masse: true, dy: -.5}); }
      else if (d > 1.5 && u < .84 && proche > 2.5 && libreA(X, Y, 2) && !boitesPres(X, Y, 1.5)) { semer(X, Y, 2); poser("arbre_bois", X, Y, v * 6.28, {esp: ai.esp, r: .45, couronne: 2.4, ech: .86 + w * .34, dur: d < 6, bois: true, leger: proche > 15}); } continue; }
    const dense = Z.aires.length && proche > 115 ? 0 : d > 24 && proche > 40 ? (NIVEAU.files ? .2 : Z.aires.length ? .5 : .72) : d > 13 ? (proche > 40 ? .3 : .2) : .13; if (d < 2.6 || u > dense || boitesPres(X, Y, 2.1) || chemins(X, Y, 1.2)) continue;
    const loin = proche > 40 && d > 13, r = loin && d > 24 ? 1.9 : 2.5; if (!libreA(X, Y, r) || proche < 4.8) continue; semer(X, Y, r);
    if (loin) poser(Z.aires.length ? "masse_bois" : "arbre_masse", X, Y, v * 6.28, {r: 1.6, couronne: 2, pres: true, ech: .85 + w * .4, masse: true, dy: -.5}); else poser("arbre_rue", X, Y, v * 6.28, {r: .6, couronne: 2.5, dur: d < 6}); }
  // (étape 14) le sous-bois, seulement le long du chemin : fougères en nappes, jeunes pousses, rochers moussus, un tronc couché de temps en temps
  const PRES = new Set(); if (Z.aires.length) for (let i = 0; i < PISTE.N; i += 4) { const cx = Math.floor(PISTE.X[i] / 16), cz = Math.floor(PISTE.Z[i] / 16); for (let a = -2; a <= 2; a++) for (let c = -2; c <= 2; c++) PRES.add(cle(cx + a, cz + c)); }
  if (Z.aires.length) for (let x = Z.xa + 20; x < Z.xb - 20; x += 1.7) for (let z = Z.za + 20; z < Z.zb - 20; z += 1.7) { if (!PRES.has(cle(Math.floor(x / 16), Math.floor(z / 16)))) continue; const u = R(), v = R(), w = R(), X = x + (v - .5) * 1.5, Y = z + (w - .5) * 1.5; if (u > .5) continue; pres(X, Y); const proche = Math.hypot(X - PISTE.X[Q.i], Y - PISTE.Z[Q.i]); if (proche > 15 || proche < 1.7) continue;
    const a = Z.aireEn(X, Y, 3); if (!a || a.genre !== "foret") continue; const d = P.distDur(X, Y), nappe = fbm(X / 11 + 2, Y / 11 + 8); if (d < .55 || boitesPres(X, Y, .8)) continue;
    if (u < .006 && d > 1.2 && proche > 3.4 && libreA(X, Y, 1.7)) { semer(X, Y, 1.7); poser(w < .5 ? "tronc_couche" : "rocher_mousse", X, Y, v * 6.28, {r: 1.1, dur: d < 6, voir: proche < 6}); }
    else if (nappe > .5 && u < (nappe - .5) * 4.2 && libreA(X, Y, .62)) { semer(X, Y, .62); poser("fougere", X, Y, v * 6.28, {r: .5, ech: .7 + w * .6, libre: true}); }
    else if (u > .436 && u < .466 && d > 1.5 && proche > 2.6 && libreA(X, Y, 1.75)) { semer(X, Y, 1.75); poser("arbre_bois", X, Y, v * 6.28, {esp: a.esp, r: .45, couronne: 2.4, ech: .84 + w * .3, dur: d < 6, bois: true}); }
    else if (u > .466 && u < .486 && proche > 2.6 && libreA(X, Y, .95)) { semer(X, Y, .95); poser("buisson_bois", X, Y, v * 6.28, {r: .7, ech: .7 + w * .6, libre: true}); }
    else if (u > .488 && libreA(X, Y, 1)) { semer(X, Y, 1); poser("jeune_pousse", X, Y, v * 6.28, {r: .4, libre: true}); } }
  // 7. les passants et les Pokémon : près du chemin, jamais dessus
  const gens = (NIVEAU.peuple || []).filter(q => q.o === "habitant").map(q => q.nom), nums = (NIVEAU.peuple || []).filter(q => q.o === "pokemon").map(q => q.num); let kg = 0, dernier = -99;
  for (let i = 12; i < PISTE.N - 6; i++) { if (i - dernier < 26) continue; const a = PISTE.H[i], sg = R() < .5 ? -1 : 1; let saut = 0;
    for (const sd of [sg, -sg]) { const e = Z.velo ? tire(2.9, 4.8) : tire(2.1, 4.6), x = PISTE.X[i] + Math.cos(a) * e * sd, z = PISTE.Z[i] + Math.sin(a) * e * sd, n = P.nature(x, z); if (!degage(x, z, 1.5) || Z.eaux.length && (Z.champs(x, z).w < (n === "jardin" ? 2.4 : 1) || D.w < 9 && D.o < 7) || P.surPassage(x, z, 3) || !libreA(x, z, .9) || boitesPres(x, z, .7)) continue;
      if ((n === "trottoir" || n === "place") && gens.length && (!Z.velo || [[.6, 0], [-.6, 0], [0, .6], [0, -.6]].every(([u, w]) => P.nature(x + u, z + w) === n))) poser("habitant", x, z, 0, {nom: gens[kg++ % gens.length], r: .3, voir: true}); else if (n === "jardin" && nums.length && P.distDur(x, z) > .9) { const a = Z.aireEn(x, z), S = a ? sauvages(a.genre === "pre" ? "verger" : a.genre) : nums; if (!S.length || P.objets.some(q => q.haie && Math.hypot(q.x - x, q.z - z) < 4 && distBoite(boiteObjet(q), x, z) < .6)) continue; poser("pokemon", x, z, 0, {num: S[kg++ % S.length], r: .4, voir: true}); if (a) saut = 20; } else continue;
      semer(x, z, .9); dernier = i + saut + Math.floor(tire(-6, 8)); break; } }
  // ce qui est loin du parcours ne se voit que de loin : les petits objets n'y sont pas, les arbres y sont de simples silhouettes
  P.objets = P.objets.filter(q => { pres(q.x, q.z); const d = Math.hypot(q.x - PISTE.X[Q.i], q.z - PISTE.Z[Q.i]);
    if (["massif", "banc", "poubelle", "terrasse", "boite_lettres", "buisson", "etal"].includes(q.o)) return d < 42; if (NIVEAU.files && d > 92 && ["maison_pente", "immeuble_pente", "magasin_pente"].includes(q.o)) return false; if (q.o === "lampadaire" || q.o === "voiture") return d < 60; if (SOUS_BOIS.includes(q.o)) return d < 16; if (q.haie) return d < 90;
    if (["arbre", "arbre_rue", "bouleau"].includes(q.o) && d > 60) { q.o = "arbre_masse"; q.pres = true; q.ech = (q.ech || 1) * .8; q.dur = false; q.dy = -.5; } return true; });
}

/* ---- (étape 15, lot 2) ce qui borde l'eau et ce qui flotte : les ponts, le garde-corps et la promenade d'un quai, les roseaux et les saules d'un talus, péniches et barques, Pokémon de rivière ---- */
function habillerEaux(poser, R, degage) {
  const P = PLAN, Z = P.zone, D = Z.D, tire = (a, b) => a + (b - a) * R(), bateaux = [], nums = ((NIVEAU.sauvages || {}).eau || {}).nums || [], loinDe = (x, z) => { pres(x, z); return Math.hypot(x - PISTE.X[Q.i], z - PISTE.Z[Q.i]); };
  const ponts = []; for (const v of Z.PORTS) for (const p of v.ponts) { const e = Z.enVoie(v, (p.a + p.b) / 2), rue = v.t > 0; ponts.push({x: e.x, z: e.z, r: (p.b - p.a) / 2 + v.hp});
    poser(v.pont === "bois" ? "pont_bois" : v.pont === "fer" ? "pont_fer" : "pont_pierre", e.x, e.z, Math.atan2(-e.tz, e.tx), {long: p.b - p.a + .1, large: v.hp * 2, eau0: Z.eaux[p.eau].y, arches: v.arches, bout: v.bout || (rue ? 1.5 : 3), cones: !rue, l: p.b - p.a, p: v.hp * 2, libre: true, ouvert: true, pont: true, voir: true, vu: p.b - p.a}); }
  for (const v of Z.eaux) for (const sg of [-1, 1]) {
    const bord = (s, e) => { const q = Z.enEau(v, s); return Object.assign(Z.enEau(v, s, sg * (q.h + e)), {nx: sg * q.tz, nz: -sg * q.tx}); };   // e : au-delà du bord (négatif : sur l'eau) ; (nx, nz) : vers l'eau
    for (const b of Z.bergesDe(v, sg)) { if (b.style !== "quai") continue; const a0 = b.a || 0, b0 = Math.min(b.b === undefined ? v.L : b.b, v.L);
      // le garde-corps, d'un pont à l'autre, posé sur la pierre du bord
      const bout = s => (b.bouts || []).find(q => s >= q.a && s < q.b) || {}, ok = s => { const q = bord(s, .28); return Z.champs(q.x, q.z).m < -.1 && Z.champs(q.x, q.z).o > .05; }; if (b.garde !== "rien") for (let s = a0; s < b0;) { if (!ok(s)) { s += .2; continue; } let c = s; while (c + .2 <= b0 && c - s < 2.5 && ok(c + .2)) c += .2; if (c - s < .5) { s = c + .2; continue; }
        const A = bord(s, .28), B = bord(c, .28), l = Math.hypot(B.x - A.x, B.z - A.z); poser((bout((s + c) / 2).garde || b.garde) !== "muret" ? "garde_corps" : "parapet_quai", (A.x + B.x) / 2, (A.z + B.z) / 2, Math.atan2(-(B.z - A.z), B.x - A.x), {long: l + .02, l, p: .4, dur: true, haie: true}); s = c; }
      // la promenade : un arbre, un banc tourné vers l'eau, un arbre, un réverbère…
      if (b.prom) { let k = 0; const e = b.ea || b.prom * .5 + .2; for (let s = a0 + 10; s < b0 - 8; s += 4.6, k++) { const q = bord(s, e), sable = [-.9, 0, .9].every(w => { const r = bord(s + w, e), n = P.nature(r.x, r.z); return n === "allee"; }); if (!sable || !degage(q.x, q.z, 1.95) || ponts.some(p => Math.hypot(p.x - q.x, p.z - q.z) < p.r + 1.2) || P.objets.some(o => !o.l && o.r && Math.hypot(o.x - q.x, o.z - q.z) < 2.6)) continue;
        // (lot 2b) bouts: [{a, b, genre, arbres, garde}] : la promenade change de visage en chemin ; genre : "arbres" (défaut), "fleurs" (massifs et petits arbres), "livres" (les boîtes des bouquinistes, sur le bord), "terrasses" (les tables d'un café), "nu" (on ne voit que l'eau)
        const bt = bout(s), genre = bt.genre || "arbres"; if (genre === "livres" && k % 4 !== 3) { const w = bord(s, 1.02); poser("bouquiniste", w.x, w.z, Math.atan2(-q.nx, -q.nz), {r: 1.15, dur: true, ton: k, voir: k % 4 === 0}); if (k % 4 === 1) { const m = bord(s + 2.1, Math.min(2, e)); if (degage(m.x, m.z, 1.6)) poser("habitant", m.x, m.z, 0, {nom: ["gentleman", "woman_1", "beauty"][k % 3], r: .3, voir: true}); } continue; }
        if (genre === "terrasses" && k % 2 === 0) { const w = bord(s, Math.min(e, 2.1)); poser("terrasse", w.x, w.z, Math.atan2(q.nx, q.nz), {r: 1.05, voir: true, libre: true}); continue; }
        if (genre === "fleurs" && k % 2 === 0) { if (k % 6) poser("plate_bande", q.x, q.z, Math.atan2(-q.tz, q.tx), {l: 2.5, p: 1, long: 2.5, dur: true, haie: true, ton: k}); else poser("arbre_rue", q.x, q.z, k * 2.4, {esp: "cerisier", r: .42, couronne: 1.4, ech: .7, dur: true, bordure: true}); continue; }
        if (k % 2 === 0) { if (b.arbres !== "rien" && genre === "arbres") poser("arbre_rue", q.x, q.z, k * 2.4, {esp: bt.arbres || b.arbres || "platane", r: .42, couronne: 1.6, dur: true, bordure: true}); } else if (k % 4 === 1) { const w = bord(s, Math.min(e, 1.75)); poser("banc", w.x, w.z, Math.atan2(q.nx, q.nz), {r: .8, dur: true, voir: true}); } else { const w = bord(s, 1.05); poser("lampadaire", w.x, w.z, 0, {r: .24, dur: true, bordure: true}); } } }
      // ce qui est amarré : péniches et barques, jamais sous un pont
      let s = a0 + 16; while (s < b0 - 14 && b.bateaux !== false) { const g = R() < .4, l = g ? tire(17, 21) : 4.2, q = bord(s, g ? -2.75 : -1.3); if (loinDe(q.x, q.z) < 130 && !ponts.some(p => Math.hypot(p.x - q.x, p.z - q.z) < p.r + l / 2 + 4) && [-l / 2, l / 2].every(u => { const w = bord(s + u, g ? -2.75 : -1.3), d = Z.eauEn(w.x, w.z); return d.e < -1 && d.q > .9; })) { poser(g ? "peniche" : "barque", q.x, q.z, Math.atan2(-q.tz * sg, q.tx * sg), {l, p: g ? 4.2 : 1.5, libre: true, flotte: true, voir: g, vu: 15}); bateaux.push(q); if (!g && R() < .5) { const w = bord(s + 5.2, -1.4); if (Z.eauEn(w.x, w.z).q > .9) poser("barque", w.x, w.z, Math.atan2(-w.tz * sg, w.tx * sg) + .06, {l: 4.2, p: 1.5, libre: true, flotte: true}); } }
        if (R() < .4) { const w = bord(s + l / 2 + 3.5, 0), o = Z.champs(w.x, w.z).o; if (o > 4) poser("echelle_quai", w.x + w.nx * .02, w.z + w.nz * .02, Math.atan2(w.nx, w.nz), {eau0: v.y, r: .4, libre: true, muraille: true}); } s += l + tire(9, 24); } }
    // un talus : des roseaux par nappes, des nénuphars, un saule ou des cailloux de loin en loin
    for (let s = 4, der = -99; s < v.L - 4; s += 1.25) { const q = bord(s, 0); if (Z.eauEn(q.x, q.z).q > .02 || loinDe(q.x, q.z) > 62 || ponts.some(p => Math.hypot(p.x - q.x, p.z - q.z) < p.r + 2)) continue; const n = fbm(q.x / 13 + 7, q.z / 13 + sg * 3), u = R(), w = R();
      if (n > .47 && u < .86) { const e = bord(s + w - .5, -.6 + R() * 1.1); poser("joncs", e.x, e.z, w * 6, {r: .5, ech: .85 + w * .4, libre: true, flotte: true, y0: v.y}); if (u < .6) { const f = bord(s + u, -1.1 - w); poser("joncs", f.x, f.z, u * 9, {r: .5, ech: .8 + w * .4, libre: true, flotte: true, y0: v.y}); } }
      else if (n < .42 && u < .05) { const e = bord(s, -2.4 - w * 2); poser("nenuphars", e.x, e.z, w * 6, {r: 2, libre: true, flotte: true, n: 7}); }
      else if (u > .975) { const e = bord(s, .9); if (P.distDur(e.x, e.z) > .7) poser("rocher_mousse", e.x, e.z, w * 6, {r: .6, ech: .7, libre: true}); }
      if (s - der > 19 && u > .8) { const e = bord(s, 2.6 + w); Z.champs(e.x, e.z); const libre = Math.min(D.t, D.a, D.c, D.f, D.y); if (libre > 1.7 && degage(e.x, e.z, 3)) { poser("arbre_rue", e.x, e.z, w * 6, {esp: "saule", r: .6, couronne: 2.2, ech: .9}); der = s; } } } }
  // les Pokémon de la rivière : ils vont et viennent le long de l'eau, près du parcours
  if (nums.length) for (const v of Z.eaux) { let k = 0; for (let s = 20; s < v.L - 30; s += tire(34, 52)) { const c = Z.enEau(v, s), u = tire(-.45, .45) * c.h, A = Z.enEau(v, s, u), B = Z.enEau(v, s + 12, u); if (loinDe(A.x, A.z) > 34 || bateaux.some(q => Math.hypot(q.x - A.x, q.z - A.z) < 9) || ponts.some(p => Math.hypot(p.x - A.x, p.z - A.z) < p.r + 3)) continue; poser("pokemon", A.x, A.z, 0, {num: nums[k++ % nums.length], r: .5, libre: true, flotte: true, voir: true, vu: 18, bouge: {type: "va", x: B.x, z: B.z, vitesse: tire(.7, 1.4)}}); } }
}

/* ---- le contrôle : le parcours d'un vrai piéton, rien sur le chemin, rien qui se touche, des pentes douces, et jamais plus de 45 m sans qu'il se passe quelque chose ---- */
const VIDE_MAX = 45, PENTE_MAX = .11, PENTE_MARCHES = .29;   // (24/11, Kiki : « les lignes droites sont trop longues » ; on fait 1,8 m de décor par seconde : 45 m = 25 s)
/* ce qui se passe le long du parcours : [{i, quoi}] */
function evenementsZone() {
  const P = PLAN, T = PISTE, N = T.N, o = [], b = i => ((i % N) + N) % N, tourne = (i, j) => { const d = T.H[b(j)] - T.H[b(i)]; return Math.abs(Math.atan2(Math.sin(d), Math.cos(d))); }; let avant = null;
  for (let i = 0; i < N; i++) {
    if (tourne(i - 8, i + 8) > .24) o.push({i, quoi: "virage"});
    const n = P.nature(T.X[i], T.Z[i]); if (avant && n !== avant) o.push({i, quoi: n}); avant = n;
    const p1 = (T.Y[b(i)] - T.Y[b(i - 14)]) / 14, p2 = (T.Y[b(i + 14)] - T.Y[b(i)]) / 14; if (Math.abs(p2 - p1) > .035) o.push({i, quoi: "pente"}); }
  for (const n of P.zone.noeuds) { pres(n.x, n.z); if (Math.hypot(n.x - T.X[Q.i], n.z - T.Z[Q.i]) < 12) o.push({i: sLigne(Q.i), quoi: "carrefour"}); }
  for (const q of P.objets) if (q.voir) { pres(q.x, q.z); if (Math.hypot(q.x - T.X[Q.i], q.z - T.Z[Q.i]) < (q.vu || (q.l ? q.p / 2 + 5 : 6))) o.push({i: sLigne(Q.i), quoi: q.o}); }
  return o.sort((a, c) => a.i - c.i);
}
function videZone() {   // le plus long bout où rien ne se passe : {m, i}
  const E = evenementsZone(), N = PISTE.N; if (!E.length) return {m: N, i: 0}; let r = {m: 0, i: 0};
  for (let k = 0; k < E.length; k++) { const a = E[k].i, c = k + 1 < E.length ? E[k + 1].i : E[0].i + N; if (c - a > r.m) r = {m: c - a, i: a}; } return r;
}
/* (étape 14) les sorties de ville, une liste fermée : 1. la rue finit, et le chemin part dans le prolongement de son trottoir ; 2. le chemin arrive sur un trottoir, à angle droit (à 25° près) */
function sortieZone(i) {
  const Z = PLAN.zone, x = PISTE.X[i], z = PISTE.Z[i]; let k = -1, b = null; for (const v of Z.voies) { if (v.sol !== "chaussee") continue; const q = Z.surVoieZ(v, x, z); if (!b || q.d < b.d) { b = q; k = v.k; } }
  if (!b || b.d > 12) return "le chemin commence loin de toute rue."; const v = Z.voies[k], e = Z.enVoie(v, b.s); let q = null, w = null; for (const o of Z.voies) if (o.sol === "terre") { const r = Z.surVoieZ(o, x, z); if (!q || r.d < q.d) { q = r; w = o; } } const g = Z.enVoie(w, q.s), c = Math.abs(g.tx * e.tx + g.tz * e.tz), bout = b.s < 1 || b.s > v.L - 1;
  if (bout && c > .97) return ""; if (!bout && c < .42) return "";
  return "on passe de « " + (v.nom || v.id) + " » au chemin " + (bout ? "au bout de la rue, mais pas dans le prolongement de son trottoir." : "de biais (" + Math.round(90 - Math.acos(c) * 57.3) + "° au lieu de 0).");
}
/* (étape 15) à vélo : sur quoi l'on roule, et la liste fermée des passages d'une voie à l'autre ; chacun a une raison qu'on voit */
const VIDE_VELO = 130, SOLS_A_VELO = ["chaussee", "passage", "piste", "trottoir", "allee", "chemin"];
function parcoursVelo(dire) {
  const P = PLAN, Z = P.zone, V = Z.voies, T = PISTE, N = T.N, b = i => ((i % N) + N) % N, sol = [], rue = [];
  for (let i = 0; i < N; i++) { let n = P.nature(T.X[i], T.Z[i]); if (n === "passage") n = "chaussee"; let k = -1, m = 99; for (const v of V) { if (v.sol !== "chaussee") continue; const e = Z.ecart(v.k); if (e < m) { m = e; k = v.k; } } sol.push(n); rue.push(k); }
  const autour = (i, f) => { for (let d = -6; d <= 6; d++) if (f(b(i + d))) return true; return false; };
  const raisonEn = (i, plus) => { const k = rue[i]; if (k < 0) return ""; const q = Z.surVoieZ(V[k], T.X[i], T.Z[i]), p = Z.plats.find(w => w.k === k && w.raison && q.s > w.s0 - plus && q.s < w.s1 + plus); return p ? p.raison : ""; };
  let trot = 0, travaux = false;
  for (let i = 0; i < N; i++) {
    const a = T.H[i], n = sol[i], de = n === "chemin" ? .3 : .55, n0 = sol[b(i - 1)], x = T.X[i], z = T.Z[i];
    for (const u of [-de, 0, de]) { const m = P.nature(x + Math.cos(a) * u, z + Math.sin(a) * u); if (!SOLS_A_VELO.includes(m)) dire("Au mètre " + i + ", on roule sur « " + m + " »."); }
    if (n !== n0) {
      const sans = [n0, n].sort().join("+");
      if (sans === "chaussee+trottoir") { if (!raisonEn(i, 2)) dire("Au mètre " + i + ", on passe de « " + n0 + " » à « " + n + " » sans bateau."); }
      else if (sans === "chemin+piste") { const bouts = []; for (const v of V) if (v.sol === "cyclable" || v.sol === "terre") for (const w of [0, v.n - 1]) if (Math.hypot(v.P[w][0] - x, v.P[w][1] - z) < 4) bouts.push({sol: v.sol, tx: v.TX[w], tz: v.TZ[w]}); const a = bouts.find(q => q.sol === "terre"), c = bouts.find(q => q.sol === "cyclable"); if (!a || !c || Math.abs(a.tx * c.tx + a.tz * c.tz) < .95) dire("Au mètre " + i + ", la piste cyclable et le chemin ne se suivent pas bout à bout."); }
      else if (sans === "chaussee+piste") { if (raisonEn(i, 2) !== "piste" && !P.passages.some(p => p.velo && Math.hypot(p.x - x, p.z - z) < p.l + 5)) dire("Au mètre " + i + ", on entre sur la piste cyclable ailleurs qu'à un carrefour."); }
      else if (sans === "chaussee+chemin") { const k = rue[i], v = V[k], q = Z.surVoieZ(v, x, z), h = T.H[b(n === "chemin" ? i + 9 : i - 9)], e = Z.enVoie(v, q.s), co = Math.abs(Math.sin(h) * e.tx - Math.cos(h) * e.tz), bout = q.s < 1.5 || q.s > v.L - 1.5; if (bout ? co < .95 : v.t || co > .42) dire("Au mètre " + i + ", la route et le chemin ne se rejoignent ni d'équerre ni bout à bout (" + Math.round(Math.acos(Math.min(1, co)) * 57.3) + "°)."); }
      else if (sans !== "allee+trottoir") dire("Au mètre " + i + ", le sol passe de « " + n0 + " » à « " + n + " »."); }
    if (n === "trottoir") { trot++; if (raisonEn(i, 20) === "travaux") travaux = true; if (trot === (travaux ? 37 : 11)) dire("Au mètre " + i + ", on roule depuis " + trot + " m sur le trottoir."); } else { trot = 0; travaux = false; }
    // à droite de la chaussée, sauf aux carrefours et là où l'on change de voie
    if (n !== "chaussee" || rue[i] < 0) continue;
    const v = V[rue[i]], q = Z.surVoieZ(v, x, z), e = Z.enVoie(v, q.s), co = Math.sin(a) * e.tx - Math.cos(a) * e.tz;
    if (Math.abs(co) < .9 || Z.noeuds.some(w => Math.hypot(w.x - x, w.z - z) < 22) || autour(i, j => sol[j] !== "chaussee") || raisonEn(i, 26)) continue;
    const u = q.u * Math.sign(co); if (u < .3 || u > v.l / 2 - .5) dire("Au mètre " + i + ", on ne tient pas la droite de « " + (v.nom || v.id) + " » (" + u.toFixed(1) + " m)."); }
}
function zoneControle() {
  const P = PLAN, Z = P.zone, D = Z.D, T = PISTE, o = [], VM = Z.velo ? VIDE_VELO : VIDE_MAX; const dire = t => { if (o.length < 30) o.push(t); }; let avant = null;
  if (Z.velo) parcoursVelo(dire); else for (let i = 0; i < T.N; i++) {
    const a = T.H[i], n = P.nature(T.X[i], T.Z[i]);
    const de = n === "chemin" ? .35 : .7; for (const u of [-de, 0, de]) { const m = P.nature(T.X[i] + Math.cos(a) * u, T.Z[i] + Math.sin(a) * u); if (!SOLS_A_PIED.includes(m)) dire("Au mètre " + i + ", le coureur marche sur « " + m + " »."); }
    if (avant && n !== avant && !PASSAGES_PERMIS[avant + ">" + n]) dire("Au mètre " + i + ", le sol passe de « " + avant + " » à « " + n + " ».");
    if (avant && n !== avant && (n === "chemin" || avant === "chemin")) { const m = sortieZone(i); if (m) dire("Au mètre " + i + ", " + m); }
    avant = n; }
  if (!Z.velo) for (const p of P.passages) if (p.route) { const v = Z.voies[p.k], e = Z.enVoie(v, p.s), an = Math.abs(p.dx * e.tx + p.dz * e.tz);
    if (an > Math.sin(.49)) dire("Au mètre " + p.i0 + ", on traverse « " + (v.nom || v.id) + " » en biais (" + Math.round(Math.asin(an) * 57.3) + "°)."); if (p.l > 6) dire("Au mètre " + p.i0 + ", la traversée fait " + Math.round(p.l * 2 - 1.4) + " m."); }
  let pm = 0, im = 0; for (let i = 0; i < T.N; i++) { const q = Math.abs(T.PENTE[i]); if (q > PENTE_MAX && q < PENTE_MARCHES && P.enMarches(T.X[i], T.Z[i], 9)) continue; if (q > pm) { pm = q; im = i; } }   // (un escalier, lui seul, est plus raide)
  if (pm > PENTE_MAX) dire("La pente atteint " + Math.round(pm * 100) + " % au mètre " + im + ".");
  if (o.length) return o;   // (étape 14) un parcours déjà fautif : inutile de poser tout le décor (c'est le plus long)
  remplirZone(); const vide = videZone(); if (vide.m > VM) dire("Rien ne se passe pendant " + Math.round(vide.m) + " m, à partir du mètre " + vide.i + " (" + VM + " au plus).");
  for (const q of P.objets) { if (!q.dur || q.ouvert) continue; pres(q.x, q.z); if (Math.hypot(q.x - T.X[Q.i], q.z - T.Z[Q.i]) > 16) continue; const b = q.l ? boiteObjet(q) : null;
    for (let k = -14; k <= 14; k++) { const i = idx(sLigne(Q.i) + k), dx = T.X[i] - q.x, dz = T.Z[i] - q.z, d = b ? distBoite(b, T.X[i], T.Z[i]) : Math.hypot(dx, dz) - q.r; if (d < .75) { dire("« " + q.o + " » à " + d.toFixed(2) + " m du chemin, au mètre " + i + "."); break; } } }
  const C = 16, G = new Map(), solides = P.objets.filter(q => q.dur && !q.haie && !q.ouvert && !q.libre && !q.masse);
  if (Z.eaux.length) { for (let i = 0; i < T.N; i++) if (P.nature(T.X[i], T.Z[i]) === "eau") { dire("Au mètre " + i + ", on roule dans l'eau."); break; }   // (étape 15, lot 2)
    for (const q of P.objets) { if (q.flotte || q.pont || q.muraille || q.masse) continue; Z.champs(q.x, q.z); if (D.w < -.3 && D.o > 0) dire("« " + q.o + " » est dans l'eau (" + Math.round(q.x) + ", " + Math.round(q.z) + ")."); } }
  for (const q of solides) { const b = q.l && !q.boiteX ? boiteObjet(q) : null; if (b) for (const [x, z] of coinsBoite(b)) if (P.distDur(x, z) < -.3) { dire("« " + q.o + " » déborde sur « " + P.nature(x, z) + " » (" + Math.round(x) + ", " + Math.round(z) + ")."); break; }
    const k = Math.floor(q.x / C) + "," + Math.floor(q.z / C); if (!G.has(k)) G.set(k, []); G.get(k).push(q); }
  for (const q of solides) { const cx = Math.floor(q.x / C), cz = Math.floor(q.z / C); for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) for (const w of G.get((cx + a) + "," + (cz + c)) || []) { if (w === q || w.x < q.x || w.x === q.x && w.z <= q.z) continue; if (seTouchent(q, w)) dire("« " + q.o + " » et « " + w.o + " » se touchent (" + Math.round(q.x) + ", " + Math.round(q.z) + ")."); } }
  return o;
}
