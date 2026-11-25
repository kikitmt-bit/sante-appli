/* ============ ramer dans une zone (étape 15, lot 3, 25/11) : ce qui borde l'eau vu d'une barque, la place sous les ponts, et le contrôle du rameur ============ */
// zone.rame: true ; le parcours suit les eaux (cheminDeZone : {v: l'id d'une eau, cote: "m"}), la piste est à leur hauteur, l'eau est d'un seul tenant (zone_dessin.js, construireEauxUnies). Ne dessine rien.
// Une berge "quai" se découpe en bouts: [{a, b, genre, …}] : "maisons" (les pieds dans l'eau, côte à côte, une trouée de temps en temps), "jardins" (des parcelles qui descendent à l'eau), "arbres", "fleurs", "terrasses", "nu"
// (habillerEaux) ; prom: la largeur de la promenade sablée de ce bout. Une berge "talus" : genre "saules", "roseaux", "nenuphars", "herbe" ; tal: la largeur du talus.
const VIDE_RAME = 70, PAYSAGE_RAME = 175;   // (Kiki) un événement au moins tous les 70 m, un paysage tous les 110 à 150 m (175 au plus)

/* les couverts (on passe sous des maisons) : [{x, z, dx, dz, l, w, h}], et la place au-dessus de l'eau à chaque mètre du parcours */
function couvertsRame(Z) { return (Z.donnees.objets || []).filter(q => q.o === "passage_maisons").map(q => ({x: q.x, z: q.z, dx: Math.sin(q.lacet || 0), dz: Math.cos(q.lacet || 0), l: (q.long || 16) / 2, w: (q.large || 11) / 2, h: (q.voute || 3.5) - .35})); }
let PLAFONDS_ = null;
function plafondRame(s) {   // la hauteur libre au-dessus de l'eau, au mètre s : 99 à l'air libre ; elle baisse en douceur avant un pont (la caméra se baisse)
  if (!PLAFONDS_) {
    const Z = PLAN.zone, T = PISTE, N = T.N, B = new Float32Array(N).fill(99);
    for (let i = 0; i < N; i++) { Z.champs(T.X[i], T.Z[i]); if (Z.D.o < 0) B[i] = Z.sol(T.X[i], T.Z[i]) - T.Y[i] - .85;
      for (const q of PLAN.couverts) { const ex = T.X[i] - q.x, ez = T.Z[i] - q.z; if (Math.abs(ex * q.dx + ez * q.dz) < q.l + .5 && Math.abs(ez * q.dx - ex * q.dz) < q.w) B[i] = Math.min(B[i], q.h); } }
    PLAFONDS_ = new Float32Array(N).fill(99);
    for (let i = 0; i < N; i++) { if (B[i] > 90) continue; for (let d = -16; d <= 16; d++) { const j = (i + d + N) % N; PLAFONDS_[j] = Math.min(PLAFONDS_[j], B[i] + Math.max(0, Math.abs(d) - 4) * .22); } } }
  return PLAFONDS_[idx(s)]; }

/* les bords habités : les maisons les pieds dans l'eau, les jardins (avant tout le reste : remplirZone n'y pose plus rien) */
function bordsRame(poser, prendre, boite, R, outils) {
  const P = PLAN, Z = P.zone, D = Z.D, tire = (a, b) => a + (b - a) * R(), choix = l => l[Math.floor(R() * l.length)], occupe = outils.occupe;
  const durSec = (x, z) => { Z.champs(x, z); return Math.min(D.f, D.t, D.p, D.a, D.c, D.y); };
  const surPont = (x, z, d) => Z.PORTS.some(v => v.ponts.some(p => Math.hypot(p.x - x, p.z - z) < (p.b - p.a) / 2 + v.hp + d && Z.surVoieZ(v, x, z).d < v.hp + d));
  const sousCouvert = (x, z, d) => P.couverts.some(q => { const ex = x - q.x, ez = z - q.z; return Math.abs(ex * q.dx + ez * q.dz) < q.l + d && Math.abs(ez * q.dx - ex * q.dz) < q.w + 6; });
  for (const v of Z.eaux) for (const sg of [-1, 1]) {
    const bord = (s, e) => { const q = Z.enEau(v, s); return Object.assign(Z.enEau(v, s, sg * (q.h + e)), {nx: sg * q.tz, nz: -sg * q.tx}); }, vrai = s => { const q = bord(s, 0); return Math.abs(Z.eauEn(q.x, q.z).e) < .25; };
    for (const b of Z.bergesDe(v, sg)) for (const t of b.bouts || []) {
      const a = Math.max(0, t.a), f = Math.min(v.L, t.b);
      if (t.genre === "maisons") { let k = Math.floor(R() * 5), depuis = 0, avant = -1, der = null; const trou = cote => { if (der) der.flanc = (der.flanc || 0) | (cote === sg ? 2 : 1); der = null; };
        for (let s = a; s < f - 4.5;) {
          const l = Math.min(tire(5.6, 8.1), f - s), A = bord(s, -.02), B = bord(s + l, -.02), M = bord(s + l / 2, 0);
          if (!vrai(s) || !vrai(s + l) || [A, B, M].some(q => surPont(q.x, q.z, 1.6)) || sousCouvert(M.x, M.z, l / 2 + 1)) { trou(1); s += 1; continue; }
          if (depuis > 3 + Math.floor(R() * 3) && f - s > 14 && [.3, 2.2, 4.1].every(d => [.6, 3, 6].every(e => { const q = bord(s + d, e); return Math.abs(Z.sol(q.x, q.z) - v.y - (Z.donnees.quai || 1.15)) < .06; }))) { trou(1);   // une trouée entre deux maisons : un escalier qui descend à l'eau, un passage pavé jusqu'à la rue, sinon jusqu'à la porte d'une cour
            const m = bord(s + 2.2, .02), L0 = Math.atan2(m.nx, m.nz), a0 = bord(s + 2.2, .58); poser("escalier_eau", m.x, m.z, L0, {eau0: v.y, r: 1.6, libre: true, muraille: true, dur: true, voir: true});
            let e1 = 4; while (e1 < 34) { const q = bord(s + 2.2, e1); if (durSec(q.x, q.z) < .1 || occupe(q.x, q.z, 1.6)) break; e1 += .25; } const q1 = bord(s + 2.2, e1), rue = e1 < 34 && durSec(q1.x, q1.z) < .1, q2 = bord(s + 2.2, rue ? e1 + .1 : 7.2);
            outils.chemin(a0.x, a0.z, q2.x, q2.z, 2.6, "trottoir"); if (!rue) poser("mur_ruelle", bord(s + 2.2, 7.4).x, bord(s + 2.2, 7.4).z, L0, {long: 4.7, l: 4.7, p: .4, h: 2.05, ton: k % 4, porte: true, lampe: true, lierre: R() < .5, dur: true, haie: true});
            const c = bord(s + 1.4 + R() * 1.6, 2.2 + R()); if (R() < .75) { if (R() < .5) poser("habitant", c.x, c.z, 0, {nom: choix(["woman_1", "lass", "gentleman"]), r: .3, libre: true, voir: true}); else poser("pokemon", c.x, c.z, 0, {num: choix([52, 37, 39]), r: .3, libre: true, voir: true}); }
            s += 4.4; depuis = 0; continue; }
          const ch = Math.hypot(B.x - A.x, B.z - A.z), L = Math.atan2(M.nx, M.nz), mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2; let mis = null;
          for (const p of [8, 7, 6, 5]) { const x = mx - M.nx * p / 2, z = mz - M.nz * p / 2, q = boite(x, z, L, ch, p);
            if ([[-1, -1], [1, -1], [0, -1]].some(([u, w]) => { const X = x + u * ch / 2 * Math.cos(L) + w * p / 2 * Math.sin(L), Y = z - u * ch / 2 * Math.sin(L) + w * p / 2 * Math.cos(L); return durSec(X, Y) < .5 || Z.eauEn(X, Y).e < 2; })) continue;
            mis = {x, z, p, q}; break; }
          if (!mis) { trou(1); s += 2; continue; }
          let ton; do ton = Math.floor(R() * 8); while (ton === avant); avant = ton; prendre(mis.q);
          const nue = !der; der = poser("maison_canal", mis.x, mis.z, L, {l: ch + .03, p: mis.p, eau0: v.y, ton, lanterne: k % 3 === 0, r: 4, libre: true, muraille: true, dur: true, canal: true}); if (nue) der.flanc = sg > 0 ? 1 : 2; k++; depuis++; s += l; } trou(1); }
      if (t.genre === "jardins") { let k = Math.floor(R() * 3);
        for (let s = a; s < f - 9; k++) {
          const w = Math.min(tire(11.5, 14.5), f - s), m = s + w / 2, M = bord(m, 0), L = Math.atan2(M.nx, M.nz);
          if (!vrai(s) || !vrai(s + w) || surPont(M.x, M.z, w / 2 + 1.5)) { s += 2; continue; }
          let mais = 0; for (const rec of [13, 15.5, 18]) { const q = bord(m, rec + 3.2), bo = boite(q.x, q.z, L, 8.4, 6.4); if (!outils.tient(bo, 1.2)) continue; prendre(bo); poser("maison_pente", q.x, q.z, L, {varie: true, l: tire(7.6, 8.6), p: 6.2, dur: true, dos: true}); mais = rec; break; }
          for (let u = s + .2; u < s + w - 1; u += 2.5) { const c = Math.min(u + 2.5, s + w - .1), A = bord(u, .3), B = bord(c, .3), l = Math.hypot(B.x - A.x, B.z - A.z), x = (A.x + B.x) / 2, z = (A.z + B.z) / 2, N = bord((u + c) / 2, 0), La = Math.atan2(N.nx, N.nz);
            if (l < .6 || k % 3 === 1 && c > m - 2.6 && u < m + 2.6) continue; poser("parapet_quai", x, z, La, {long: l + .02, l, p: .4, dur: true, haie: true}); if (R() < .6) poser("jardin_eau", x, z, La, {long: l, r: .5, libre: true, muraille: true}); }
          if (k % 3 === 1) { const e = bord(m, .02), a0 = bord(m, .6), a1 = bord(m, mais || 6); poser("escalier_eau", e.x, e.z, L, {eau0: v.y, r: 1.6, libre: true, muraille: true, voir: true}); outils.chemin(a0.x, a0.z, a1.x, a1.z, 1.5, "trottoir"); for (const d of [-1, 1]) { const w0 = bord(m + d * 2.2, .3), w1 = bord(m + d * 2.75, .3); if (d * 2.75 + m > s && d * 2.75 + m < s + w) poser("parapet_quai", (w0.x + w1.x) / 2, (w0.z + w1.z) / 2, L, {long: .57, l: .57, p: .4, dur: true, haie: true}); } }
          else if (k % 3 === 0) { const e = bord(m + tire(-2, 2), -1.15); poser(R() < .5 ? "barque" : "canoe", e.x, e.z, Math.atan2(-M.tz * sg, M.tx * sg), {l: 4.2, p: 1.5, libre: true, flotte: true, voir: true}); }
          else { const e = bord(m, 1.7); poser("banc", e.x, e.z, L, {r: .8, voir: true}); }
          { const A = bord(s, 1.2), B = bord(s, 8.5), l = Math.hypot(B.x - A.x, B.z - A.z), x = (A.x + B.x) / 2, z = (A.z + B.z) / 2; if (!occupe(x, z, 1) && durSec(x, z) > 1) poser("haie", x, z, Math.atan2(-(B.z - A.z), B.x - A.x), {long: l, l, p: .75, h: 1.2, dur: true, haie: true, incline: true}); }
          for (const [u, e, o] of [[tire(1.8, 3.2), tire(3.5, 6), "arbre"], [w - tire(1.8, 3.4), tire(3, 8), "arbre"], [w * .5 + tire(-2, 2), tire(3, 5), "massif"], [tire(3, w - 3), tire(5, 8), R() < .4 ? "table_bois" : "massif"]]) { const q = bord(s + u, e); if (occupe(q.x, q.z, 2) || durSec(q.x, q.z) < 2 || k % 3 === 1 && Math.abs(u - w / 2) < 1.9) continue;
            if (o === "arbre") poser("arbre_rue", q.x, q.z, R() * 6, {esp: choix(["cerisier", "pommier", "bouleau", "cerisier"]), r: .6, couronne: 2, ech: .78}); else poser(o, q.x, q.z, R() * 6, {r: 1.1, r0: .7}); }
          if (R() < .75) { const q = bord(s + tire(2, w - 2), tire(1.4, 3)); if (R() < .45) poser("habitant", q.x, q.z, 0, {nom: choix(["beauty", "camper", "picnicker", "youngster", "woman_1"]), r: .3, libre: true, voir: true}); else poser("pokemon", q.x, q.z, 0, {num: choix([133, 39, 43, 16, 35, 58]), r: .4, libre: true, voir: true}); }
          s += w; } }
    } }
}
/* la rampe d'une rue vers son pont, là où le quai reste à plat : un mur de soutènement de chaque côté, son parapet et sa jardinière, un pilier de pierre au bord de l'eau */
function rampesRame(poser) {
  const Z = PLAN.zone, y0 = Z.eaux[0].y;
  for (const v of Z.PORTS) for (const p of v.ponts) for (const g of [-1, 1]) { const s0 = g < 0 ? p.a : p.b;
    for (const sg of [-1, 1]) { const at0 = d => { const q = Z.enVoie(v, s0 + g * d, sg * (v.hp + .5)), r = Z.enVoie(v, s0 + g * d, sg * (v.hp - .1)), o = Z.enVoie(v, s0 + g * d, sg * (v.hp + 1.5)); return {x: q.x, z: q.z, nx: -sg * q.tz, nz: sg * q.tx, haut: Z.sol(r.x, r.z), bas: Z.sol(o.x, o.z)}; };
      const A0 = at0(.42); poser("pilier_rampe", A0.x, A0.z, Math.atan2(A0.nx, A0.nz), {y0, haut: A0.haut, r: .7, libre: true, muraille: true, incline: false});
      let d = 1; while (d < 30) { const A = at0(d), B = at0(d + 2.4); Z.champs(B.x + B.nx, B.z + B.nz); if (Z.voies.some(w => w !== v && Z.ecart(w.k) - (w.t || 0) < .6)) break; if (A.haut - A.bas < .12 && B.haut - B.bas < .12) break; const l = Math.hypot(B.x - A.x, B.z - A.z), M = at0(d + 1.2), L = Math.atan2(M.nx, M.nz), inv = (B.x - A.x) * Math.cos(L) - (B.z - A.z) * Math.sin(L) < 0, [U, W] = inv ? [B, A] : [A, B];
        poser("mur_rampe", (A.x + B.x) / 2, (A.z + B.z) / 2, L, {long: l + .002, ha: U.haut, hb: W.haut, ba: U.bas, bb: W.bas, sobre: v.sol === "terre", r: .8, libre: true, muraille: true}); d += 2.4; } } } }
/* les berges naturelles, les habitants du quai, les Pokémon de l'eau (après habillerEaux, qui a posé ponts, promenades et garde-corps) */
function bergesRame(poser, R) {
  const P = PLAN, Z = P.zone, D = Z.D, tire = (a, b) => a + (b - a) * R(), choix = l => l[Math.floor(R() * l.length)], nums = ((NIVEAU.sauvages || {}).eau || {}).nums || [], loinDe = (x, z) => { pres(x, z); return Math.hypot(x - PISTE.X[Q.i], z - PISTE.Z[Q.i]); };
  const pont = (x, z, d) => Z.PORTS.some(v => v.ponts.some(p => Math.hypot(p.x - x, p.z - z) < (p.b - p.a) / 2 + d)), pris = [];
  const libre = (x, z, r) => !pris.some(q => Math.hypot(q[0] - x, q[1] - z) < q[2] + r) && !P.objets.some(q => q.l ? q.dur && Math.abs(q.x - x) < 14 && Math.abs(q.z - z) < 14 && distBoite(boiteObjet(q), x, z) < r : q.dur && !q.haie && q.r && Math.hypot(q.x - x, q.z - z) < q.r + r);
  const plat = (x, z) => { const h = Z.sol(x, z); return [[.7, 0], [-.7, 0], [0, .7], [0, -.7]].every(([a, b]) => Math.abs(Z.sol(x + a, z + b) - h) < .14); };
  const surBarque = (x, z, d) => P.objets.some(w => w.flotte && w.l && Math.hypot(w.x - x, w.z - z) < w.l / 2 + d);
  for (const v of Z.eaux) for (const sg of [-1, 1]) {
    const bord = (s, e) => { const q = Z.enEau(v, s); return Object.assign(Z.enEau(v, s, sg * (q.h + e)), {nx: sg * q.tz, nz: -sg * q.tx}); }, vrai = (q, e) => Math.abs(Z.eauEn(q.x, q.z).e - e) < .4;
    for (const b of Z.bergesDe(v, sg)) {
      if (b.style === "quai") { for (const t of b.bouts || [b]) { if (t.genre === "maisons" || t.genre === "jardins") continue; let k = 0;
        for (let s = Math.max(6, t.a || 0) + 5; s < Math.min(v.L - 6, t.b === undefined ? v.L : t.b) - 4; s += tire(9, 17)) { const q = bord(s, tire(1.3, 2.4)); if (Z.eauEn(q.x, q.z).e < 1 || loinDe(q.x, q.z) > 24 || pont(q.x, q.z, 3) || !libre(q.x, q.z, .7) || !plat(q.x, q.z)) continue; const n = P.nature(q.x, q.z); if (n === "eau" || n === "chaussee") continue;
          if (++k % 3) poser("habitant", q.x, q.z, 0, {nom: choix(["beauty", "gentleman", "lass", "youngster", "woman_1", "picnicker", "camper", "cooltrainer_f"]), r: .3, libre: true, voir: true}); else poser("pokemon", q.x, q.z, 0, {num: choix([52, 58, 133, 39, 16]), r: .4, libre: true, voir: true}); pris.push([q.x, q.z, .6]); } } continue; }
      const g = b.genre || "herbe", a = Math.max(2, b.a || 0), f = Math.min(v.L - 2, b.b === undefined ? v.L : b.b);
      if (g === "saules") for (let s = a + tire(0, 4); s < f; s += tire(8, 11.5)) { const q = bord(s, tire(1.7, 2.6)); if (Z.eauEn(q.x, q.z).e < 1.2 || loinDe(q.x, q.z) > 60 || pont(q.x, q.z, 5) || !libre(q.x, q.z, 2)) continue; Z.champs(q.x, q.z); if (Math.min(D.c, D.f, D.t, D.a) < 1) continue;
        poser("saule_eau", q.x, q.z, Math.atan2(q.nx, q.nz), {r: .6, couronne: 2.4, ech: tire(.82, 1.06), penche: tire(1.5, 2.6), dur: false}); pris.push([q.x, q.z, 2.4]); }
      const roseaux = g === "roseaux", seuil = g === "herbe" ? .5 : g === "nenuphars" ? .44 : .57;
      for (let s = a; s < f; s += roseaux ? .8 : 1.25) { const q0 = bord(s, 0); if (!vrai(q0, 0) || loinDe(q0.x, q0.z) > 60 || pont(q0.x, q0.z, 2.5)) continue; const n = fbm(q0.x / 13 + 7, q0.z / 13 + sg * 3); if (!roseaux && n < seuil) continue;
        for (let m = 0; m < (roseaux ? 3 : 2); m++) { const e = roseaux ? .7 - m * .95 - R() * .7 : .3 - R() * 1.1 - m * .5, q = bord(s + R() * .8, e); if (loinDe(q.x, q.z) < 3 || R() < .15 || surBarque(q.x, q.z, .6)) continue; poser("joncs", q.x, q.z, R() * 6, {r: .5, ech: (roseaux ? 1.05 : .8) + R() * .45, libre: true, flotte: true, y0: v.y, leger: true}); } }
      if (!roseaux) for (let s = a + 3; s < f; s += tire(3, g === "nenuphars" ? 5 : 22)) { const e = -tire(1.6, g === "nenuphars" ? 4.2 : 2.6), q = bord(s, e); if (Z.eauEn(q.x, q.z).e > -1 || loinDe(q.x, q.z) < 4.2 || loinDe(q.x, q.z) > 50 || pont(q.x, q.z, 3)) continue; poser("nenuphars", q.x, q.z, R() * 6, {r: 2, libre: true, flotte: true, n: 7, large: 4}); }
      for (let s = a + 6; s < f - 4; s += tire(13, 24)) { const q = bord(s, tire(1.7, 4)); if (Z.eauEn(q.x, q.z).e < 1 || loinDe(q.x, q.z) > 24 || pont(q.x, q.z, 3) || !libre(q.x, q.z, .9)) continue; Z.champs(q.x, q.z); if (Math.min(D.c, D.f, D.t, D.a) < .6) continue; const u = R(), A = Z.aireEn(q.x, q.z), S = A && ((NIVEAU.sauvages || {})[A.genre] || {}).nums;
        if (u < .32) { const w = bord(s, 1.6); poser("rocher_mousse", w.x, w.z, u * 60, {r: .7, ech: .7 + R() * .5, libre: true}); } else if (u < .82) { poser("pokemon", q.x, q.z, 0, {num: choix(S || [60, 79, 54, 43, 46, 102, 16, 133]), r: .4, libre: true, voir: true}); pris.push([q.x, q.z, .8]); } } } }
  if (nums.length) for (const v of Z.eaux) { let k = 0; for (let s = 16; s < v.L - 24; s += tire(26, 44)) { const c = Z.enEau(v, s); if (c.h < 4) continue; const u = (R() < .5 ? -1 : 1) * tire(2.5, Math.max(2.6, c.h - 1.5)), A = Z.enEau(v, s, u), B = Z.enEau(v, s + 9, u);
    if (Math.abs(u) > c.h - 1.2 || [A, B].some(q => loinDe(q.x, q.z) > 30 || loinDe(q.x, q.z) < 2.4 || Z.eauEn(q.x, q.z).e > -1 || pont(q.x, q.z, 2) || surBarque(q.x, q.z, 2.5))) continue; poser("pokemon", A.x, A.z, 0, {num: nums[k++ % nums.length], r: .5, libre: true, flotte: true, voir: true, bouge: {type: "va", x: B.x, z: B.z, vitesse: tire(.6, 1.1)}}); } }
}
/* le contrôle : rester dans l'eau, de la place de chaque côté (un deuxième rameur), sous les ponts, rien de dur près du parcours, un paysage qui change */
function parcoursRame(dire) {
  const P = PLAN, Z = P.zone, D = Z.D, T = PISTE, N = T.N; remplirZone();
  for (let i = 0; i < N; i++) { const a = T.H[i], x = T.X[i], z = T.Z[i];
    for (const u of [-3, 0, 3]) { const w = Z.eauEn(x + Math.cos(a) * u, z + Math.sin(a) * u).e; if (w > -.8) { dire("Au mètre " + i + ", la berge est trop près du parcours (il faut 3,8 m d'eau de chaque côté)."); break; } }
    if (Math.abs(T.COURB[i]) > 1 / 11) dire("Au mètre " + i + ", on tourne trop court (rayon " + (1 / Math.abs(T.COURB[i])).toFixed(1) + " m, 11 au moins)."); const h = plafondRame(i); if (h < 2.35) dire("Au mètre " + i + ", on passe à " + h.toFixed(1) + " m sous un pont (2,35 au moins)."); }
  for (const q of P.objets) { pres(q.x, q.z); if (Math.hypot(q.x - T.X[Q.i], q.z - T.Z[Q.i]) > 26 || q.haie) continue; const i0 = Q.i;
    if (q.pont) { const L = q.long, n = q.arches || 1, wp = 1.7, sp = (L - (n - 1) * wp) / n, c = Math.cos(q.lacet), s = Math.sin(q.lacet);
      for (let k = -8; k <= 8; k++) { const i = idx(sLigne(i0) + k), ex = T.X[i] - q.x, ez = T.Z[i] - q.z, lx = ex * c - ez * s, lz = ex * s + ez * c; if (Math.abs(lz) > q.large / 2 + 2) continue; let m = 99; for (let j = 0; j < n; j++) m = Math.min(m, Math.abs(lx + L / 2 - sp / 2 - j * (sp + wp)) - sp / 2); if (m > -2.4) { dire("Au mètre " + i + ", on passe à " + (-m).toFixed(1) + " m d'une pile de pont (2,4 au moins)."); break; } } continue; }
    Z.champs(q.x, q.z); if (D.o < 0 || !q.flotte && !q.muraille && !q.dur || q.dessus || (q.o === "pokemon" || q.o === "habitant") && !q.flotte) continue;
    const plante = q.o === "joncs" || q.o === "nenuphars", b = q.l && q.p ? boiteObjet(q) : null, r = q.o === "nenuphars" ? 1.9 : q.o === "pokemon" ? .2 : q.r || 0;
    for (let k = -14; k <= 14; k++) { const i = idx(sLigne(i0) + k), d = b ? distBoite(b, T.X[i], T.Z[i]) : Math.hypot(T.X[i] - q.x, T.Z[i] - q.z) - r; if (d < (plante ? 1.6 : q.flotte ? 1.9 : 2.2)) { dire("« " + q.o + " » à " + d.toFixed(2) + " m du parcours, au mètre " + i + "."); break; } } }
  const t = []; for (const p of T.pieces) { if (!t.length || p.titre !== t[t.length - 1][0]) t.push([p.titre, 0, p.s0]); t[t.length - 1][1] += p.s1 - p.s0; } if (t.length > 1 && t[0][0] === t[t.length - 1][0]) { t[0][1] += t[t.length - 1][1]; t.pop(); }
  for (const [n, l, s] of t) if (l > PAYSAGE_RAME) dire("« " + n + " » dure " + Math.round(l) + " m, à partir du mètre " + s + " (" + PAYSAGE_RAME + " au plus).");
}
