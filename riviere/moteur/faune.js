/* ============ la faune (25/11, Kiki : des Pokémon « à leur bonne taille, dans leur bon biome, un peu plus rares », « pas juste leur sprite qui rebondit ») ============ */
// Sur un circuit dessiné d'après une zone, les Pokémon ne sont plus semés par le décor : le parcours est découpé en rencontres (contenu/faune.json :
// une tous les 100 à 200 m selon la machine), et chacune tire une SCÈNE qui va avec l'endroit. Ce fichier ne fait que choisir et
// placer (aucun dessin : il se contrôle sans navigateur) ; jeu/faune.js les fait vivre. Même circuit, même jour : mêmes rencontres ; le lendemain, d'autres.
// Les milieux (milieuEn) : rue, place, quai, parc, jardin, herbe, berge, riviere, lac, et les aires de la nature (foret, pre, champ, verger, potagers, lande, clairiere).
const FAUNE_SIEGES = {   // là où l'on se pose : [x, y, z] dans le repère de l'objet (y : au-dessus du sol sous ce point)
  banc: q => [.42, .47, 0], lampadaire: q => [0, 4.2, 0], cloture_bois: q => [-(q.long || 2.6) / 2 + .04, 1.2, 0], meule: q => [.05, 1, .34], rocher_mousse: q => [0, .8 * (q.ech || 1), 0],
  barque: q => [.5, .2, 0], peniche: q => [0, 1.92, 0], ponton_bois: q => [.5, null, (q.long || 5) - .9], arbre_bois: q => [0, 0, 0], arbre_rue: q => [0, 0, 0]};
const FAUNE_OUVERT = ["garde_corps", "cloture_bois", "barriere", "banc", "barque", "lampadaire", "pont_pierre", "pont_bois", "pont_fer", "plate_bande"];   // ce qui ne cache pas un Pokémon
const FAUNE_BAS = ["fougere", "jeune_pousse", "bruyere", "chemin", "joncs"];   // on se tient dedans
function milieuEn(x, z) {
  const P = PLAN, Z = P.zone, D = Z.D, n = P.nature(x, z), w = D.w, a = D.a;
  if (n === "eau") return NIVEAU.plan_eau === "lac" || Z.W.h > 18 ? "lac" : "riviere";
  if (n === "trottoir") return "rue"; if (n === "place") return "place"; if (n === "allee") return Z.eaux.length && w < 9 ? "quai" : "dur"; if (n !== "jardin" && n !== "pelouse") return "dur";
  const A = Z.aireEn(x, z); if (A) return A.genre; if (Z.eaux.length && w < 6 && Z.W.q < .5) return "berge"; if (a < 12) return "parc";
  return P.maisons.some(m => Math.abs(m.x - x) < 20 && Math.abs(m.z - z) < 20) ? "jardin" : "herbe";
}
function poserFaune(MD) {
  MD.faune = []; if (typeof FAUNE === "undefined" || !PLAN || !PLAN.zone) return;
  const P = PLAN, Z = P.zone, machine = Z.rame ? "rameur" : Z.velo ? "velo" : "elliptique", GAP = FAUNE.rythme[machine], K = Math.max(3, Math.round(LONG / GAP)), G = LONG / K;
  const jour = PARAMS.has("faune") ? +PARAMS.get("faune") : FORCE || PARAMS.has("fige") ? 0 : Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);   // ?faune=3 : le tirage d'un autre jour
  const R = hasard((NIVEAU.graine || 1) * 613 + jour * 7919 + 5), tire = (a, b) => a + (b - a) * R(), choix = l => l[Math.floor(R() * l.length)];
  const taille = num => (TAILLES_PKM[String(num)] || .6) * ((FAUNE.especes[num] || {}).part || 1);
  // les objets, par cases de 8 m
  const CASES_F = new Map(), cle = (a, b) => a * 4096 + b;
  for (const q of P.objets) { if (q.o === "pokemon" || q.masse || q.pont) continue; const r = q.l ? Math.hypot(q.l, q.p) / 2 : (q.r || 0) + .5; for (let a = Math.floor((q.x - r) / 8); a <= Math.floor((q.x + r) / 8); a++) for (let b = Math.floor((q.z - r) / 8); b <= Math.floor((q.z + r) / 8); b++) { const k = cle(a, b); if (!CASES_F.has(k)) CASES_F.set(k, []); CASES_F.get(k).push(q); } }
  const ici = (x, z) => CASES_F.get(cle(Math.floor(x / 8), Math.floor(z / 8))) || [], loin = (q, x, z) => q.l && q.p ? distBoite(boiteObjet(q), x, z) : Math.hypot(q.x - x, q.z - z) - (q.r || 0);
  const libre = (x, z, r, sauf) => { for (const dx of [-r, 0, r]) for (const dz of [-r, 0, r]) for (const q of ici(x + dx, z + dz)) if (q !== sauf && !FAUNE_BAS.includes(q.o) && loin(q, x, z) < r) return false; return true; };
  const duParcours = (x, z) => { pres(x, z); return Math.hypot(x - PISTE.X[Q.i], z - PISTE.Z[Q.i]); };
  const MINI = Z.rame ? 3.2 : Z.velo ? 2.6 : 1.9, y = (x, z) => P.haut(x, z);
  const bon = (x, z, r, dans, sauf) => duParcours(x, z) >= MINI && dans.includes(milieuEn(x, z)) && Z.bord(x, z) < -3 && !P.surPassage(x, z, 2) && libre(x, z, r, sauf);
  // le voit-on en arrivant ? du parcours, 16 m puis 8 m avant : aucun mur, aucune maison, aucune haie, aucun talus entre les deux ; et il est assez grand pour qu'on le voie (souple : un groupe, ou quelqu'un qui court)
  const couvert = s => { if (!Z.rame) return false; for (let k = -24; k < 4; k += 3) if (plafondRame(idx(s + k)) < 90) return true; return false; };
  const assez = (t, x, z, souple) => t / Math.hypot(duParcours(x, z), 7) > (souple ? .032 : .046);
  const vu = (s, x, z, sauf, t = .5, perche = 0) => { if (couvert(s)) return false; const haut = y(x, z) + perche + t * .6;
    for (const av of [16, 8]) { const A = at(s - av), l = Math.hypot(x - A.x, z - A.z), n = Math.max(2, Math.ceil(l / .7)), ye = A.y + 1.9;
      for (let k = 2; k < n; k++) { const X = lerp(A.x, x, k / n), W = lerp(A.z, z, k / n); if (k % 3 === 0 && l * (1 - k / n) > .8 && y(X, W) > lerp(ye, haut, k / n)) return false;
        for (const q of ici(X, W)) { if (q === sauf) continue; if (!q.l && q.o.startsWith("arbre") && Math.hypot(q.x - X, q.z - W) < .45) return false; if (t < 1.3 && perche < .3 && (q.o === "joncs" && Math.hypot(q.x - X, q.z - W) < .5 || q.o.startsWith("rang_") && distBoite(boiteObjet(q), X, W) < .3)) return false; if (q.l && (q.dur || q.haie || q.muraille) && !FAUNE_OUVERT.includes(q.o) && distBoite(boiteObjet(q), X, W) < .1) return false; } } }
    return true; };
  // le bord : à partir d'où l'on n'est plus sur le parcours (à la rame : la berge), de chaque côté, au mètre s
  const bordMemo = new Map(), bordDe = (s, sd) => { const k = Math.round(s) * 2 + (sd > 0 ? 1 : 0); if (bordMemo.has(k)) return bordMemo.get(k); let e = MINI;
    if (Z.rame) { for (e = 3; e < 26; e += .5) { const q = pose(s, sd * e); Z.eauEn(q.x, q.z); if (Z.W.e > .3) break; } } else for (; e < 9; e += .5) { const q = pose(s, sd * e); if (milieuEn(q.x, q.z) !== "dur") break; }
    bordMemo.set(k, e); return e; };
  // les objets qui peuvent recevoir une scène, rangés le long du parcours
  const anc = new Map(), noms = new Set(); for (const d of FAUNE.scenes) for (const n of (d.sur || []).concat(d.pres || [])) noms.add(n);
  for (const q of P.objets) { if (!noms.has(q.o)) continue; const e = duParcours(q.x, q.z); if (e > 17) continue; if (!anc.has(q.o)) anc.set(q.o, []); anc.get(q.o).push({q, s: sLigne(Q.i), e, sd: Q.d > 0 ? 1 : -1}); }
  const monde = (q, l) => { const c = Math.cos(q.lacet || 0), n = Math.sin(q.lacet || 0); return {x: q.x + l[0] * c + l[2] * n, z: q.z - l[0] * n + l[2] * c}; };
  const eauDe = d => (d.dans || []).includes("riviere") || (d.sur || []).includes("barque") || (d.sur || []).includes("ponton_bois");   // à la rame, on les voit de tout près : plus souvent
  const deja = new Map(), pris = [], proches = (noms, s, max) => { const L = []; for (const o of noms) for (const a of anc.get(o) || []) if (Math.abs(ecart(a.s, s)) < G * .42 && !pris.includes(a.q) && a.e < max) L.push(a); return L; };
  const acteur = (num, x, z, plus) => Object.assign({num, x, z, y: y(x, z), cx: 0, cz: 1}, plus);
  /* un bout de promenade : d'autres endroits permis autour, reliés en ligne droite */
  const autour = (x, z, r, rayon, dans) => { const o = [{x, z, y: y(x, z)}];
    for (let k = 0; k < 14 && o.length < 4; k++) { const a = R() * 6.283, d = tire(.5, 1) * rayon, A = o[o.length - 1], X = x + Math.cos(a) * d, W = z + Math.sin(a) * d; let ok = true; for (let u = .25; u <= 1 && ok; u += .25) ok = bon(lerp(A.x, X, u), lerp(A.z, W, u), r, dans); if (ok) o.push({x: X, z: W, y: y(X, W)}); }
    return o; };
  /* essayer une scène au mètre s : rend ses acteurs, ou rien */
  function essayer(d, s, num) {
    const t = taille(num), r = clamp(t * .4, .25, 1.4), n = d.n ? Math.round(tire(d.n[0], d.n[1])) : 1, dans = d.dans || [];
    if (d.sur) {   // sur un objet
      const L = proches(d.sur, s, d.jeu === "guette" ? 6 : Z.rame ? 14 : 11); if (!L.length) return null;
      const a = choix(L), q = a.q, l = FAUNE_SIEGES[q.o](q), p = monde(q, l); if (dans.length && !dans.includes(milieuEn(p.x, p.z)) || !assez(t * 1.1, p.x, p.z) || !vu(a.s, p.x, p.z, q, t, l[1] || .6)) return null;
      pris.push(q);
      if (d.jeu === "guette") { const A = at(a.s - 9), ex = q.x - A.x, ez = q.z - A.z, m = Math.hypot(ex, ez), h = at(a.s).h; return {s: a.s, acts: [acteur(num, q.x + ex / m * .45, q.z + ez / m * .45, {lx: -Math.cos(h) * a.sd * .62, lz: -Math.sin(h) * a.sd * .62})]}; }   // derrière le tronc ; lx, lz : vers le parcours
      const b = acteur(num, p.x, p.z, {perche: true, cx: Math.sin(q.lacet || 0), cz: Math.cos(q.lacet || 0)}); b.y = l[1] === null ? q.eau0 + .65 : (q.flotte ? y(q.x, q.z) : y(p.x, p.z)) + l[1];
      return {s: a.s, acts: [b]};
    }
    if (d.pres) {   // à côté d'un objet
      const L = proches(d.pres, s, 17); if (!L.length) return null;
      const a = choix(L), q = a.q, A = at(a.s), vers = Math.atan2(A.z - q.z, A.x - q.x), k = q.l ? Math.max(q.l, q.p) / 2 : q.r || .5, vole = d.jeu === "plane" || d.jeu === "hante";
      for (let j = 0; j < 8; j++) {
        const an = vers + (R() - .5) * 2.6, D0 = vole ? .2 : k + r + .15, x = q.x + Math.cos(an) * D0, z = q.z + Math.sin(an) * D0, m = milieuEn(x, z);
        if (m === "riviere" || m === "lac" || m === "dur" && !vole || duParcours(x, z) < MINI || !vole && !libre(x, z, r * .8, q) || !assez(t, x, z, n > 1) || !vu(a.s, x, z, q, t, vole ? 1 : 0)) continue;
        const o = []; for (let i = 0; i < n; i++) { const aa = i * 2.2, g = i && !vole ? r * 2.4 : 0, X = x + Math.cos(aa) * g, W = z + Math.sin(aa) * g; if (g && (!libre(X, W, r * .7, q) || duParcours(X, W) < MINI || milieuEn(X, W) !== m)) continue; o.push(acteur(num, X, W, {cx: q.x - X, cz: q.z - W, vise: true, pts: d.jeu === "flane" ? autour(X, W, r * .7, 1.8, [m]) : null})); }
        pris.push(q); return {s: a.s, acts: o}; }
      return null;
    }
    const eau = dans.includes("riviere") || dans.includes("lac"), ciel = d.jeu === "plane" && d.haut > 6;
    for (const sd of R() < .5 ? [1, -1] : [-1, 1]) {
      if (eau) {   // dans l'eau : entre le parcours et la berge
        const b0 = Z.rame ? bordDe(s, sd) : 0, e = Z.rame ? Math.max(3.2 + t * .4, Math.min(b0 - 1.6 - t * .5, tire(3.6, 9) + (d.large || 0))) : tire(5, 22); if (Z.rame && (e > b0 - 1 - t * .4 || b0 < 5)) continue;
        const dedans = q => dans.includes(milieuEn(q.x, q.z)) && Z.W.e < -(.8 + t * .45) && duParcours(q.x, q.z) > MINI - .4 && libre(q.x, q.z, .8 + t * .4), q = pose(s, sd * e); if (!dedans(q) || couvert(s) || !assez(d.jeu === "saute" ? t : t * .7, q.x, q.z, true) || d.large && Z.W.h < d.large) continue;
        const o = []; for (let i = 0; i < n; i++) { const A = pose(s + i * 2.6, sd * (e + i % 2)), B = pose(s + i * 2.6 + (d.jeu === "saute" ? 3.4 + t : 10), sd * e), C = pose(s + 17 + i * 2.6, -sd * e); if (!dedans(A) || !dedans(B)) continue; o.push(acteur(num, A.x, A.z, {eau: true, y: Z.W.y, pts: [A, B].concat(Z.rame && dedans(C) ? [C] : []).map(w => ({x: w.x, z: w.z, y: Z.W.y}))})); }
        if (o.length) return {s, acts: o}; continue; }
      const b0 = bordDe(s, sd), bande = d.bande || [1, 4], e = Math.max(MINI + r * .6, b0 + tire(bande[0], bande[1])), q = pose(s, sd * e); if (t < 1 && !ciel && e > (Z.rame ? b0 + 3.5 : 8.5)) continue; const h = q.h, dx = Math.sin(h), dz = -Math.cos(h), nx = Math.cos(h) * sd, nz = Math.sin(h) * sd;
      if (ciel) { if (dans.includes(milieuEn(q.x, q.z))) return {s, acts: [acteur(num, q.x, q.z, {})]}; continue; }
      if (!bon(q.x, q.z, d.jeu === "plane" ? .2 : r, dans) || !assez(t, q.x, q.z, n > 1 || d.jeu === "court") || !vu(s, q.x, q.z, null, t, d.jeu === "plane" || d.jeu === "hante" ? d.haut || 1 : 0)) continue;
      if (d.jeu === "court") {   // une piste le long du parcours, toute permise, 22 m au moins
        const T = []; for (let u = 0; u <= 70; u += 2) { const w = pose(s + u, sd * e); if (!bon(w.x, w.z, r * .8, dans)) break; T.push({x: w.x, z: w.z, y: y(w.x, w.z)}); } if (T.length < 12 || T.some((w, i) => i && Math.abs(w.y - T[i - 1].y) > .9)) continue;
        return {s, long: (T.length - 1) * 2, acts: [acteur(num, q.x, q.z, {cx: dx, cz: dz, pts: T})]}; }
      if (d.jeu === "fuite") {   // vers l'abri : en s'éloignant du parcours
        for (const [u, w] of [[6, 5], [8, 3], [5, 7], [9, 1], [-3, 6]]) { const X = q.x + dx * u + nx * w, W = q.z + dz * u + nz * w; let ok = true; for (let k = .2; k <= 1 && ok; k += .2) { const a = lerp(q.x, X, k), b = lerp(q.z, W, k), m = milieuEn(a, b); ok = m !== "riviere" && m !== "lac" && libre(a, b, .2) && duParcours(a, b) > MINI; }
          if (ok) return {s, acts: [acteur(num, q.x, q.z, {pts: [{x: q.x, z: q.z, y: y(q.x, q.z)}, {x: X, z: W, y: y(X, W)}]})]}; }
        continue; }
      const o = [], serre = d.ecart || Math.max(1, t * 1.3), vole = d.jeu === "plane" || d.jeu === "hante"; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + R() * (d.jeu === "danse" ? 0 : 1), g = n === 1 || vole ? 0 : d.jeu === "danse" ? .9 + n * .14 : serre * (.5 + R() * .8), X = q.x + Math.cos(a) * g, W = q.z + Math.sin(a) * g; if (g && !bon(X, W, r * .8, dans)) continue;
        o.push(acteur(num, X, W, {cx: -nx, cz: -nz, pts: d.jeu === "flane" ? autour(X, W, r * .8, clamp(1.4 + t * 1.6, 1.4, 5), dans) : d.jeu === "teleporte" ? autour(X, W, r, 5, dans) : null})); }
      if (o.length >= Math.min(2, n)) return {s, acts: o, centre: {x: q.x, z: q.z, y: y(q.x, q.z)}};
    }
    return null;
  }
  for (const q of P.objets) if (q.o === "pokemon" && (q.num === 66 || q.num === 67)) { pres(q.x, q.z); MD.faune.push({d: {id: "chantier", jeu: "travaille"}, k: -1, s: sLigne(Q.i), acts: [acteur(q.num, q.x, q.z, {})]}); }   // les ouvriers d'une rue barrée (velo_villes.js)
  for (let k = 0; k < K; k++) {
    const s0 = (k + .5 + (R() - .5) * .34) * G, tirer = garde => {
      const L = FAUNE.scenes.filter(d => garde(d) && (deja.get(d.id) || 0) < 2 && d.qui.some(n => (deja.get(n) || 0) < 2)).map(d => { const num = choix(d.qui); return {d, num, r: Math.pow(R(), 1 / (d.poids * (Z.rame && eauDe(d) ? 1.6 : 1) * Math.pow(.1, deja.get(num) || 0) * Math.pow(.6, deja.get(d.jeu) || 0) * Math.pow(.15, deja.get(d.id) || 0)))}; }).sort((a, b) => b.r - a.r);   // une espèce déjà vue, une façon d'être déjà vue : bien moins de chances
      for (const c of L) for (const u of [0, .14, -.14, .28, -.28]) { const g = essayer(c.d, idx(s0 + u * G), c.num); if (!g || MD.faune.some(w => w.k >= 0 && w.k !== k && Math.abs(ecart(w.s, g.s)) < G * .45)) continue; MD.faune.push(Object.assign({d: c.d, k}, g)); deja.set(c.num, (deja.get(c.num) || 0) + 1); deja.set(c.d.jeu, (deja.get(c.d.jeu) || 0) + 1); deja.set(c.d.id, (deja.get(c.d.id) || 0) + 1); return c.d; }
      return null; };
    const d = tirer(d => d.moment !== "nuit"); if (!d || d.moment === "jour") tirer(d => d.moment === "nuit");   // de jour seulement : quelqu'un d'autre prend sa place la nuit
  }
}
