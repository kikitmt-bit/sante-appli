/* ============ la note d'un circuit : est-il intéressant à parcourir ? ============ */
// On ne dirige pas : l'intérêt d'un circuit vient de ce qui défile. La note regarde la CONSTRUCTION du circuit (pas sa beauté : pour ça, la planche) :
//   rythme     le paysage change souvent (Kiki, 11/11 : toutes les 20 à 40 secondes à son allure)
//   variete    plusieurs paysages différents sur le tour, aucun qui prend toute la place
//   contrastes deux paysages voisins ne se ressemblent pas (ouvert puis fermé, clair puis sombre, ville puis nature)
//   reperes    des endroits qu'on reconnaît (un village, une grotte, un phare, un volcan au loin), répartis sur le tour
//   forts      des moments où il se passe quelque chose (saut, chute, rapides, pont, grotte), répartis eux aussi
//   relief     des montées et des descentes, jamais une côte interminable
//   droites    pas de longue ligne droite (le retour d'une boucle en est souvent une)
// Elle ne lit que la piste construite et le fichier du circuit : aucun dessin, donc elle tourne aussi sans navigateur (page.py : generateur, controle).
// noterCircuit(P, niveau, biome, tourVrai) : P = la piste construite (PISTE, ou celle d'essayerNiveau), tourVrai = TOUR_VRAI.
// Régler la note : les tables ci-dessous (FAMILLES, POIDS_NOTE, RYTHME). Une nouvelle rive sans famille est devinée d'après son profil.

/* la famille d'une rive (ce qu'on voit sur la berge) et sa teinte (le monde de couleurs) : deux familles de même teinte se ressemblent */
const FAMILLES = {
  pre: ["pre", "vert"], bas_cote: ["pre", "vert"], champ: ["champ", "vert"], foret: ["foret", "vert"], sous_bois: ["foret", "vert"],
  plage: ["plage", "sable"], dune: ["plage", "sable"], mer: ["mer", "large"], lac: ["lac", "large"], marais: ["marais", "marais"],
  montagne: ["roche", "roche"], falaise: ["roche", "roche"], calcaire: ["calcaire", "roche"], talus: ["roche", "roche"], ravin: ["vide", "large"],
  volcan: ["volcan", "volcan"], cendres: ["volcan", "volcan"], bourg: ["ville", "ville"], quai: ["ville", "ville"], ville: ["ville", "ville"], trottoir: ["ville", "ville"]};
const BOISE = {foret: .45, marais: .15, ville: .3};   // ce qui ferme la vue sans être une paroi : des arbres, des maisons
const LUMIERE = {"sous-bois": .55, marais: .75, volcan: .65, sommet: 1, plage: 1};   // l'air du lieu : plus ou moins clair
const POIDS_NOTE = {rythme: 30, variete: 20, contrastes: 10, reperes: 15, forts: 15, relief: 5, droites: 5};
const RYTHME = {eau: 3.3, terre: 5.5, long: 45, change: .2, fort: .38, cote: {eau: 90, terre: 300}, droit: .0025, droite: 30};   // vitesses de référence (m/s : Kiki au rameur, un vélo à 20 km/h) ; un paysage « trop long » : plus de 45 s ; une côte « sans fin » : 90 s sur l'eau, 5 min à vélo (un col, c'est le but) ; « tout droit » : moins de 14° de virage aux 100 m, et une ligne droite « trop longue » : plus de 30 s
const REPERES_OBJETS = ["phare", "cascade", "barrage", "centre", "boutique", "labo", "ilot", "eolienne", "entrepot", "mare", "bateau"];
const NOMS_NOTE = {rythme: "Rythme", variete: "Variété", contrastes: "Contrastes", reperes: "Repères", forts: "Moments forts", relief: "Relief", droites: "Lignes droites"};

function noterCircuit(P, niveau, biome, tourVrai) {
  const N = P.N, boucle = !!niveau.boucle, terre = (niveau.discipline || (["terre", "goudron", "paves"].includes(niveau.surface) ? "terre" : "eau")) === "terre";
  const vitesse = terre ? RYTHME.terre : RYTHME.eau, sec = (a, b) => (P.VR[Math.min(N, b)] - P.VR[Math.min(N, a)]) / vitesse, duree = sec(0, N);
  const temps = t => t < 60 ? Math.round(t) + " s" : Math.floor(t / 60) + " min " + String(Math.round(t % 60)).padStart(2, "0");
  const pc = x => Math.round(x * 100) + " %", clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  /* ---- le visage de chaque pièce : ce qu'on y voit ---- */
  const famille = nom => { if (FAMILLES[nom]) return FAMILLES[nom]; const r = biome.rives[nom] || {}, h = paroi(nom); return r.franc ? ["ville", "ville"] : h > 12 ? ["roche", "roche"] : ["pre", "vert"]; };
  const paroi = nom => { const r = biome.rives[nom]; let h = 0; for (const [d, y] of (r && r.profil) || []) if (d <= 14) h = Math.max(h, y); return h; };   // la hauteur de la berge dans ses 14 premiers mètres
  const visage = p => {
    const fg = famille(p.g), fd = famille(p.d), w = p.large !== undefined ? p.large : p.eau;
    const ferme = c => clampN(paroi(c) / 14, 0, 1) * .8 + (BOISE[famille(c)[0]] || 0);
    let ouvert = 1 - clampN((ferme(p.g) + ferme(p.d)) / 2, 0, 1) + (w >= 20 ? .15 : w <= 8 ? -.08 : 0), clair = LUMIERE[p.ambiance] === undefined ? 1 : LUMIERE[p.ambiance];
    if (p.pont) ouvert = 1;
    if (p.tunnel) { ouvert = 0; clair = p.grotte === "cristal" || p.grotte === "glace" ? .3 : .12; }
    const ville = fg[0] === "ville" || fd[0] === "ville" || !!(p.lieux && p.lieux.length);
    const nom = p.tunnel ? "grotte" : p.pont ? "pont" : ville ? "ville" : [fg[0], fd[0]].sort().join(" et ").replace(/^(\w+) et \1$/, "$1");
    return {g: fg, d: fd, ouvert: clampN(ouvert, 0, 1), clair, ville, surface: p.surface || "", ambiance: p.ambiance || "", pont: !!p.pont, tunnel: !!p.tunnel, large: w >= 20 ? 2 : w <= 8 ? 0 : 1, nom};
  };
  const cote = (a, b) => a[0] === b[0] ? 0 : a[1] === b[1] ? .4 : 1;
  const ecartVisages = (a, b) => {   // de 0 (le même paysage) à 1 (tout change)
    if (a.tunnel !== b.tunnel) return 1;
    const droit = [cote(a.g, b.g), cote(a.d, b.d)], croise = [cote(a.g, b.d), cote(a.d, b.g)], m = droit[0] + droit[1] <= croise[0] + croise[1] ? droit : croise;
    const rives = (m[0] + m[1]) / 4 + Math.max(m[0], m[1]) / 2;   // une seule berge qui change du tout au tout (une falaise) compte déjà
    return clampN(.3 * rives + .28 * Math.abs(a.ouvert - b.ouvert) + .22 * Math.abs(a.clair - b.clair) + (a.ville !== b.ville ? .14 : 0) + (a.surface !== b.surface ? .1 : 0)
      + (a.ambiance !== b.ambiance ? .05 : 0) + (a.pont !== b.pont ? .2 : 0) + Math.abs(a.large - b.large) * .06, 0, 1);
  };
  /* ---- les séquences : des pièces qui se suivent sans que le paysage change ---- */
  const pieces = P.pieces.filter(p => p.s1 > p.s0 && !p.voie), V = pieces.map(visage), seqs = [];   // (la voie « force » d'une fourche ne fait pas partie de la ligne : elle compte plus bas, comme un moment fort)
  pieces.forEach((p, i) => {
    const d = seqs[seqs.length - 1], e = d ? ecartVisages(d.v, V[i]) : 1;
    if (d && sec(p.s0, p.s1) < 4) { d.s1 = p.s1; d.pieces.push(i); }   // une pièce de quelques mètres (un tremplin, une chute) n'est pas un paysage
    else if (d && e < RYTHME.change) { d.s1 = p.s1; d.pieces.push(i); if (sec(p.s0, p.s1) > sec(pieces[d.pieces[0]].s0, pieces[d.pieces[0]].s1)) { d.v = V[i]; d.titre = p.titre || d.titre; } }
    else seqs.push({s0: p.s0, s1: p.s1, v: V[i], titre: p.titre || "", pieces: [i], ecart: e});
  });
  if (boucle && seqs.length > 2) {   // sur une boucle, la dernière séquence continue peut-être dans la première
    const a = seqs[0], z = seqs[seqs.length - 1], e = ecartVisages(z.v, a.v);
    if (e < RYTHME.change) { a.avant = sec(z.s0, z.s1); a.s0b = z.s0; seqs.pop(); } else a.ecart = e;
  } else if (seqs.length) seqs[0].ecart = null;
  for (const q of seqs) q.t = sec(q.s0, q.s1) + (q.avant || 0);
  const criteres = [], ajoute = (cle, note, phrase) => criteres.push({cle, nom: NOMS_NOTE[cle], note: Math.round(clampN(note, 0, 1) * 100), poids: POIDS_NOTE[cle], phrase});

  /* le rythme : la part du tour passée dans un paysage qu'on voit depuis trop longtemps */
  const trop = seqs.reduce((t, q) => t + Math.max(0, q.t - RYTHME.long), 0) / duree, longue = seqs.reduce((a, b) => b.t > a.t ? b : a, seqs[0]), moyenne = duree / seqs.length;
  ajoute("rythme", 1 - trop / .5, "Le paysage change toutes les " + temps(moyenne) + " en moyenne" + (longue.t > RYTHME.long ? " ; le plus long sans changement : " + temps(longue.t) + (longue.titre ? " (" + longue.titre + ")" : "") : "") + ".");

  /* la variété : combien de paysages différents, et aucun qui écrase les autres */
  const parts = {}; for (const q of seqs) parts[q.v.nom] = (parts[q.v.nom] || 0) + q.t / duree;
  const noms = Object.keys(parts).sort((a, b) => parts[b] - parts[a]), effectif = Math.exp(-noms.reduce((t, k) => t + parts[k] * Math.log(parts[k]), 0)), voulu = clampN(2.5 + duree / 110, 3.5, 7.5);
  ajoute("variete", (effectif - 1) / (voulu - 1), noms.length + " paysage" + (noms.length > 1 ? "s" : "") + " : " + noms.slice(0, 4).map(k => k + " " + pc(parts[k])).join(", ") + (noms.length > 4 ? "…" : "") + ".");

  /* les contrastes : la force moyenne des changements */
  const ch = seqs.filter(q => q.ecart !== null && q.ecart !== undefined), fortsCh = ch.filter(q => q.ecart >= RYTHME.fort).length;
  ajoute("contrastes", ch.length ? ch.reduce((t, q) => t + Math.min(1, q.ecart / .5), 0) / ch.length * Math.min(1, ch.length / 3) : 0,
    ch.length ? fortsCh + " changement" + (fortsCh > 1 ? "s" : "") + " franc" + (fortsCh > 1 ? "s" : "") + " sur " + ch.length + " (ouvert ou fermé, clair ou sombre, ville ou nature)." : "Un seul paysage : aucun contraste.");

  /* les repères et les moments forts : où ils sont sur le tour (en secondes), et le plus long trou entre deux */
  const reperes = [], forts = [], milieu = p => sec(0, Math.round((p.s0 + p.s1) / 2));
  for (const p of pieces) {
    if (p.tunnel) { reperes.push({t: milieu(p), quoi: "grotte"}); forts.push({t: milieu(p), quoi: "grotte"}); }
    if (p.pont) { reperes.push({t: milieu(p), quoi: "pont"}); forts.push({t: milieu(p), quoi: "pont"}); }
    for (const L of p.lieux || []) reperes.push({t: sec(0, p.s0 + (L.a || 0)), quoi: L.lieu});
    if ((p.large !== undefined ? p.large : p.eau) >= 24 || famille(p.g)[0] === "lac") reperes.push({t: milieu(p), quoi: "lac"});
    for (const o of p.objets || []) {
      const t = sec(0, Math.min(p.s1, p.s0 + (o.a || 0)));
      if (REPERES_OBJETS.includes(o.o)) reperes.push({t, quoi: o.o});
      if (o.o === "tronc" || o.o === "rondins") forts.push({t, quoi: o.o === "tronc" ? "saut" : "plongée"});
      if (o.o === "cascade") forts.push({t, quoi: "cascade"});
    }
    if (p.net && Math.abs(+p.monte || 0) >= 2) forts.push({t: milieu(p), quoi: p.monte > 0 ? "remontée" : "chute"});
    if ((p.allure || 1) >= 1.15) forts.push({t: milieu(p), quoi: "rapides"});
    if (p.segment) forts.push({t: milieu(p), quoi: "sprint"});
  }
  for (const v of P.voies || []) { reperes.push({t: sec(0, v.a), quoi: "fourche"}); forts.push({t: sec(0, v.a), quoi: "fourche"}); }   // une fourche : on la reconnaît, et il s'y passe quelque chose
  const unis = liste => { liste.sort((a, b) => a.t - b.t); return liste.filter((x, i) => !i || x.quoi !== liste[i - 1].quoi || x.t - liste[i - 1].t > 12); };
  const trou = liste => { if (!liste.length) return duree; let m = 0; for (let i = 1; i < liste.length; i++) m = Math.max(m, liste[i].t - liste[i - 1].t); return Math.max(m, boucle ? liste[0].t + duree - liste[liste.length - 1].t : Math.max(liste[0].t, duree - liste[liste.length - 1].t)); };
  const R = unis(reperes), F = unis(forts), loin = (niveau.lointain || []).length + (niveau.massif ? 1 : 0), sortes = new Set(R.map(x => x.quoi)).size;
  const voulusR = clampN(duree / 100, 2, 8), trouR = trou(R);
  ajoute("reperes", R.length || loin ? .65 * Math.min(1, (sortes + loin * .7) / voulusR) + .35 * (R.length ? 1 - clampN((trouR / duree - .3) / .5, 0, 1) : .3) : 0,
    (R.length ? sortes + " sorte" + (sortes > 1 ? "s" : "") + " de repère (" + [...new Set(R.map(x => x.quoi))].slice(0, 5).join(", ").replace(/-/g, " ") + ")" : "Aucun repère au bord de la piste")
    + (loin ? ", " + loin + " au loin" : "") + (R.length > 1 && trouR / duree > .45 ? " ; rien pendant " + temps(trouR) : "") + ".");
  const voulusF = clampN(duree / 80, 2, 10), trouF = trou(F), sortesF = [...new Set(F.map(x => x.quoi))];
  ajoute("forts", F.length ? .6 * Math.min(1, F.length / voulusF) * Math.min(1, .5 + sortesF.length / 4) + .4 * (1 - clampN((trouF / duree - .3) / .5, 0, 1)) : 0,
    F.length ? F.length + " moment" + (F.length > 1 ? "s" : "") + " fort" + (F.length > 1 ? "s" : "") + " (" + sortesF.slice(0, 5).join(", ") + ")" + (F.length > 1 && trouF / duree > .45 ? " ; rien pendant " + temps(trouF) : "") + "." : "Aucun moment fort : ni saut, ni chute, ni rapides.");

  /* le relief : du dénivelé, et jamais une côte sans fin */
  let monte = 0, haut = 0, cote0 = -1, pire = 0;
  for (let i = 0; i < N; i++) { const d = P.Y[(i + 1) % N] - P.Y[i]; haut = Math.max(haut, P.Y[i]); if (i < N - 1 || boucle) monte += Math.max(0, d);
    if (P.PENTE[i] > .012) { if (cote0 < 0) cote0 = i; pire = Math.max(pire, sec(cote0, i + 1)); } else cote0 = -1; }
  const bonD = terre ? 30 : 6, coteMax = terre ? RYTHME.cote.terre : RYTHME.cote.eau;
  ajoute("relief", haut < 1 ? .35 : (.55 + .45 * Math.min(1, monte / bonD)) * (1 - clampN((pire - coteMax) / 120, 0, .6)),
    haut < 1 ? "Tout plat." : Math.round(monte) + " m de montée, point haut " + haut.toFixed(haut < 10 ? 1 : 0) + " m" + (pire > coteMax ? " ; une côte de " + temps(pire) + " d'affilée" : "") + ".");

  /* les lignes droites : la part du tour passée tout droit depuis plus de 30 s (le raccord d'une boucle en est souvent une) */
  const lignes = []; let d0 = -1;
  for (let i = 0; i <= N; i++) { const droit = i < N && Math.abs(P.COURB[i]) < RYTHME.droit; if (droit && d0 < 0) d0 = i; if (!droit && d0 >= 0) { lignes.push({s0: d0, s1: i, t: sec(d0, i)}); d0 = -1; } }
  if (boucle && lignes.length > 1 && lignes[0].s0 === 0 && lignes[lignes.length - 1].s1 === N) { const z = lignes.pop(); lignes[0].t += z.t; lignes[0].s0 = z.s0; }
  const droitTrop = lignes.reduce((x, l) => x + Math.max(0, l.t - RYTHME.droite), 0) / duree, pireL = lignes.reduce((x, l) => l.t > x.t ? l : x, {t: 0}), ouL = pireL.t ? P.pieces[P.PC[Math.min(N - 1, pireL.s0 + 5)]].titre : "";
  ajoute("droites", 1 - droitTrop / .25, pireL.t > RYTHME.droite ? "La plus longue ligne droite dure " + temps(pireL.t) + (ouL ? " (" + ouL + ")" : "") + "." : "Aucune longue ligne droite.");

  const total = Math.round(criteres.reduce((t, c) => t + c.note * c.poids, 0) / criteres.reduce((t, c) => t + c.poids, 0));
  return {note: total, duree: Math.round(duree), criteres,
    sequences: seqs.map(q => ({s0: q.s0b !== undefined ? q.s0b : q.s0, s1: q.s1, t: Math.round(q.t), paysage: q.v.nom, titre: q.titre, ouvert: +q.v.ouvert.toFixed(2), clair: +q.v.clair.toFixed(2), ecart: q.ecart === null || q.ecart === undefined ? null : +q.ecart.toFixed(2)})),
    reperes: R.map(x => ({t: Math.round(x.t), quoi: x.quoi})), forts: F.map(x => ({t: Math.round(x.t), quoi: x.quoi}))};
}
/* le sol d'un circuit, point par point : jamais de valeur absurde, jamais de mur entre deux bouts de piste qui se font face (le cratère d'un
   massif est un creux voulu, à parois raides : il ne compte pas). Reçoit ce dont il a besoin du champ (moteur/champ.js) : il sert au contrôle
   sans dessin (controle.js) et au générateur, qui écarte un tirage dont le sol a une marche (solNiveau). */
function scannerSol(hauteur, Q, G, ecart, MASSIF, haut = 0, pasZ = 4) {   // haut : le plus haut de la piste (une vraie route de col monte à 500 m et plus) ; pasZ : l'écart entre deux lignes (une route de 20 km : 12 m, sinon le contrôle dure 30 s)
  const cratere = (x, z) => !!(MASSIF && MASSIF.cratere && Math.hypot(x - MASSIF.x, z - MASSIF.z) / MASSIF.r < .12);
  let points = 0, absurdes = 0, cassures = 0, pire = 0;
  for (let z = G.za - 110; z < G.zb + 110; z += pasZ) {
    let h0 = null, i0 = 0, e0 = 0, c0 = false;
    for (let x = G.xa - 110; x < G.xb + 110; x += 3) {
      const h = hauteur(x, z), i = Q.i, e = Q.e, c = cratere(x, z);
      if (e > VU_LOIN) { const saut = Math.floor((e - VU_LOIN) / 3) * 3; if (saut > 3) x += saut - 3; h0 = null; continue; }   // (16/11) jamais vu : on passe (la distance à la piste ne baisse que d'un mètre par mètre)
      if (!(h > -50 && h < 200 + haut)) absurdes++;
      if (h0 !== null && e > 14 && e0 > 14 && !c && !c0 && Math.abs(ecart(i, i0)) > 60) {
        points++;
        const d = Math.abs(h - h0);
        pire = Math.max(pire, d);
        if (d > 4) cassures++;
      }
      h0 = h; i0 = i; e0 = e; c0 = c;
    }
  }
  return {absurdes, changements: points, cassures, pire: +pire.toFixed(2), ok: !absurdes && !cassures};
}
/* la note en une ligne et ses raisons, pour l'afficher : les deux critères les plus faibles d'abord */
function resumeNote(n) {
  const tri = n.criteres.slice().sort((a, b) => (a.note - 100) * a.poids - (b.note - 100) * b.poids);
  return {titre: "Note " + n.note + " / 100", lignes: tri.map(c => c.nom + " " + c.note + " : " + c.phrase)};
}
