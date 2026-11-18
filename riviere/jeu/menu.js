/* ============ le menu (refait le 17/11, carte blanche de Kiki : « tout sur une page, pratique, ludique, sans chargement inutile ») ============ */
// Un seul écran, sans défiler (PC et tablette en paysage ; le téléphone en portrait garde tout à portée de pouce) :
//   en haut   la machine (rameur, marcheur elliptique, vélo) et ⚙ (capteur Bluetooth, son, effets) ;
//   à gauche  les circuits de cette machine, chacun avec son tracé, sa distance, boucle ou parcours, son dénivelé ;
//   à droite  le circuit choisi en grand (tracé, profil, record, classement du jour), trois vignettes à toucher (l'ambiance, ton compagnon,
//             adversaires et fantôme : chacune ouvre sa feuille), puis « Commencer », qui se remplit pendant que le circuit se construit.
// Derrière le menu, rien n'est dessiné : le monde du circuit se construit, invisible (jeu.js : CHANTIER). Choisir un autre circuit recharge
// la page avec lui (le menu revient aussitôt, son monde se reconstruit derrière).
// Les tracés des autres circuits viennent du vrai code de la piste (generateur.js : essayerNiveau), sans construire leur monde ; ils sont gardés
// sur la machine (riviere_traces) : la fois suivante, ils sont là tout de suite.
const MENU = {ouvert: false, feuille: null, traces: {}, file: [], sur: 0, jet: 0};
const HEURES_MENU = [["circuit", "Du circuit"], ["reelle", "Heure réelle"], ["matin", "Matin"], ["jour", "Jour"], ["soir", "Soir"], ["nuit", "Nuit"], ["cycle", "Journée qui défile"]];
const METEOS_MENU = [["circuit", "Du circuit"], ["beau", "Beau"], ["variable", "Variable"], ["nuages", "Nuages"], ["pluie", "Pluie"], ["orage", "Orage"], ["brume", "Brume"], ["neige", "Neige"]];
const ACTIVITE = {rameur: "eau", elliptique: "terre", velo: "terre"};   // l'activité de chaque machine : ses circuits à elle (eau : rivières ; terre : routes et chemins)
const MACHINES_MENU = [["rameur", "Rameur", "🚣", "Sur l'eau · la montre compte tes coups"], ["elliptique", "Marcheur elliptique", "🚶", "L'appareil du parc · la montre compte tes tours"], ["velo", "Vélo", "🚲", "Sur la route · home trainer Bluetooth"]];
const NOM_HEURE = {aube: "l'aube", matin: "le matin", jour: "en plein jour", soir: "le soir", crepuscule: "au crépuscule", nuit: "la nuit", reelle: "à l'heure réelle", cycle: "une journée qui défile"};
const NOM_METEO = {beau: "beau temps", nuages: "nuageux", pluie: "pluie", orage: "orage", brume: "brume", neige: "neige", vent: "grand vent", variable: "variable"};
const SOUS_HEURE = {circuit: () => "prévue : " + (NOM_HEURE[NIVEAU.heure || "jour"] || NIVEAU.heure + " h"), reelle: () => "celle qu'il est maintenant", cycle: () => "24 h en 12 minutes"};
const SOUS_METEO = {circuit: () => "prévu : " + (NOM_METEO[NIVEAU.meteo || "beau"] || NIVEAU.meteo), variable: () => "change toutes les 3 min"};
const escM = t => String(t === undefined || t === null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const libelle = (liste, k) => (liste.find(x => x[0] === k) || liste[0])[1];
const longueur = m => m < 1000 ? Math.round(m / 10) * 10 + " m" : (m / 1000).toFixed(m < 10000 ? 1 : 0).replace(".", ",") + " km";
const metresNageur = n => n.taille ? String(n.taille).replace(".", ",") + " m" : "";

/* ---- un circuit en quelques chiffres et un tracé (sans construire son monde) ---- */
function resumeTrace(P, tour, boucle) {
  const pas = Math.max(1, Math.round(P.N / 260)), pts = [];
  for (let i = 0; i < P.N; i += pas) pts.push([Math.round(P.X[i] * 10) / 10, Math.round(P.Z[i] * 10) / 10, Math.round(P.Y[i] * 10) / 10, P.TUN && P.TUN[i] ? 1 : 0]);
  let dp = 0, haut = -1e9, bas = 1e9; for (let i = 1; i < P.N; i++) { const d = P.Y[i] - P.Y[i - 1]; if (d > 0) dp += d; }
  for (let i = 0; i < P.N; i++) { haut = Math.max(haut, P.Y[i]); bas = Math.min(bas, P.Y[i]); }
  return {pts, tour: Math.round(tour), boucle: !!boucle, dplus: Math.round(dp), relief: Math.round(haut - bas)};
}
const signature = n => { const t = JSON.stringify(n.pieces || []); let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return (n.boucle || "") + ":" + t.length + ":" + h; };
function traceDe(id, n) {   // tout de suite si on l'a (ce circuit-ci, ou gardé sur la machine) ; sinon null, et il sera calculé un peu plus tard
  if (MENU.traces[id]) return MENU.traces[id];
  if (n === NIVEAU || (id === NIVEAU.id && !NIVEAU.brouillon)) return MENU.traces[id] = resumeTrace(PISTE, TOUR_VRAI, BOUCLE);
  const g = (lireReglage("riviere_traces", {}) || {})[id];
  if (g && g.sig === signature(n)) return MENU.traces[id] = g.t;
  return null;
}
function calculerTraces(liste) {   // les tracés qui manquent, un par un, sans bloquer le menu
  const manque = liste.filter(([id, n]) => !traceDe(id, n));
  const suivant = () => { const x = manque.shift(); if (!x || !MENU.ouvert) return; const [id, n] = x, r = essayerNiveau(n);
    if (r && r.PISTE) { const t = MENU.traces[id] = resumeTrace(r.PISTE, r.tour, r.boucle); const g = lireReglage("riviere_traces", {}) || {}; g[id] = {sig: signature(n), t}; ecrireReglage("riviere_traces", g); }
    const cv = document.querySelector(`#menu [data-c="${CSS.escape(id)}"] canvas`); if (cv && MENU.traces[id]) { dessinerTrace(cv, MENU.traces[id], disciplineDe(n), false); infosCarte(id); }
    suivant(); };
  setTimeout(suivant, 0);   // d'un coup (quelques dizaines de ms chacun, une seule fois : ensuite ils sont gardés), avant que le monde ne commence à se construire
}
/* le tracé vu du ciel : la rivière en bleu, la route en sable, les tunnels en gris ; la ligne (un damier) ou le départ et l'arrivée */
function dessinerTrace(cv, T, disc, grand) {
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.width = Math.max(40, Math.round(r.width * dpr)), H = cv.height = Math.max(40, Math.round(r.height * dpr)), x = cv.getContext("2d");
  const p = T.pts; if (!p.length) return; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const q of p) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); }
  const marge = (grand ? 18 : 9) * dpr, k = Math.min((W - 2 * marge) / Math.max(1, x1 - x0), (H - 2 * marge) / Math.max(1, z1 - z0)), ox = (W - (x1 - x0) * k) / 2, oz = (H - (z1 - z0) * k) / 2;
  const X = q => ox + (q[0] - x0) * k, Z = q => oz + (q[1] - z0) * k, eau = disc === "eau", trait = (grand ? 7 : 4.5) * dpr;
  const chemin = () => { x.beginPath(); p.forEach((q, i) => i ? x.lineTo(X(q), Z(q)) : x.moveTo(X(q), Z(q))); if (T.boucle) x.closePath(); };
  x.lineJoin = x.lineCap = "round";
  chemin(); x.strokeStyle = "#1B2440"; x.lineWidth = trait + 4 * dpr; x.stroke();
  chemin(); x.strokeStyle = eau ? "#5AB4F0" : "#E8C27A"; x.lineWidth = trait; x.stroke();
  x.strokeStyle = "#9A98A8"; x.lineWidth = trait; for (let i = 1; i < p.length; i++) if (p[i][3] && p[i - 1][3]) { x.beginPath(); x.moveTo(X(p[i - 1]), Z(p[i - 1])); x.lineTo(X(p[i]), Z(p[i])); x.stroke(); }   // les tunnels
  if (grand) { chemin(); x.strokeStyle = eau ? "rgba(255,255,255,.55)" : "rgba(255,248,220,.6)"; x.lineWidth = 1.2 * dpr; x.setLineDash([3 * dpr, 5 * dpr]); x.stroke(); x.setLineDash([]); }
  const a = p[0], b = p[Math.min(p.length - 1, 2)], ang = Math.atan2(Z(b) - Z(a), X(b) - X(a)), c = (grand ? 5 : 3.4) * dpr;
  if (T.boucle) {   // la ligne : un petit damier en travers
    x.save(); x.translate(X(a), Z(a)); x.rotate(ang); for (let i = -2; i < 2; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? "#1B2440" : "#fff"; x.fillRect((j - 1) * c, i * c, c, c); } x.restore();
  } else {
    const fin = p[p.length - 1], rond = (q, col) => { x.beginPath(); x.arc(X(q), Z(q), c * 1.15, 0, 7); x.fillStyle = col; x.fill(); x.lineWidth = 2 * dpr; x.strokeStyle = "#1B2440"; x.stroke(); };
    rond(a, "#48C868"); rond(fin, "#D83830");
  }
}
function dessinerProfil(cv, T, disc) {   // l'altitude le long du tour
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.width = Math.max(40, Math.round(r.width * dpr)), H = cv.height = Math.max(20, Math.round(r.height * dpr)), x = cv.getContext("2d");
  const p = T.pts; let lo = 1e9, hi = -1e9; for (const q of p) { lo = Math.min(lo, q[2]); hi = Math.max(hi, q[2]); }
  const amp = Math.max(hi - lo, 8), y = v => H - 3 * dpr - (v - lo) / amp * (H - 8 * dpr);
  x.beginPath(); x.moveTo(0, H); p.forEach((q, i) => x.lineTo(i / (p.length - 1) * W, y(q[2]))); x.lineTo(W, H); x.closePath();
  x.fillStyle = disc === "eau" ? "#3E7FB8" : "#B9874A"; x.fill();
  x.beginPath(); p.forEach((q, i) => i ? x.lineTo(i / (p.length - 1) * W, y(q[2])) : x.moveTo(0, y(q[2]))); x.strokeStyle = "#F8F8E8"; x.lineWidth = 2 * dpr; x.stroke();
}
const texteRelief = T => T.dplus < 10 ? "Plat" : "↗ " + T.dplus + " m";
const texteForme = T => T.boucle ? "Circuit" : "Parcours";

/* ---- l'ambiance en petites vignettes : un bout de ciel peint aux couleurs du jeu (ambiance.js : HEURES, METEOS) ---- */
const hexRVB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const melRVB = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rvb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
function heureVignette(k) {   // le choix du menu → une heure (nombre)
  if (k === "circuit") return heureVignette(NIVEAU.heure || "jour");
  if (k === "reelle") { const d = new Date(); return d.getHours() + d.getMinutes() / 60; }
  if (k === "cycle") return 12;
  return HEURES_NOM[k] !== undefined ? HEURES_NOM[k] : isFinite(+k) ? +k : 12;
}
function cielA(h) {   // les couleurs du ciel (haut, bas), la nuit (0 à 1), à une heure
  let k = 0; while (k < HEURES.length - 2 && HEURES[k + 1][0] <= h) k++;
  const A = HEURES[k], B = HEURES[k + 1], u = clamp((h - A[0]) / Math.max(.001, B[0] - A[0]), 0, 1), jh = [104, 176, 240], jb = [206, 236, 255];
  return {haut: melRVB(A[1] ? hexRVB(A[1]) : jh, B[1] ? hexRVB(B[1]) : jh, u), bas: melRVB(A[2] ? hexRVB(A[2]) : jb, B[2] ? hexRVB(B[2]) : jb, u), nuit: lerp(A[4], B[4], u)};
}
function meteoVignette(k) { const v = k === "circuit" ? NIVEAU.meteo || "beau" : k; return v === "variable" ? "variable" : METEOS[v] ? v : "beau"; }
function peindreCiel(cv, heure, meteo) {   // une petite scène en pixels : ciel, astre, collines, et le temps qu'il fait
  const W = 64, H = 36; cv.width = W; cv.height = H; const x = cv.getContext("2d"), m = meteo === "variable" ? null : METEOS[meteo] || METEOS.beau;
  const tranche = (x0, x1, h, mm) => {
    const c = cielA(h), gris = mm ? mm.couvert * .55 : .2, haut = melRVB(c.haut, [128, 134, 150], gris * (1 - c.nuit * .6)), bas = melRVB(c.bas, [170, 174, 186], gris * (1 - c.nuit * .6));
    for (let y = 0; y < H; y++) { x.fillStyle = rvb(melRVB(haut, bas, Math.min(1, y / (H * .72)))); x.fillRect(x0, y, x1 - x0, 1); }
    if (c.nuit > .5) for (let i = 0; i < 9; i++) { const sx = x0 + (i * 37 % Math.max(1, x1 - x0)), sy = 2 + (i * 13) % 14; x.fillStyle = "#FFF6D8"; x.fillRect(sx, sy, 1, 1); }
    const t = clamp((h - 6) / 13, 0, 1), astre = c.nuit > .5;   // le soleil passe d'est en ouest ; la nuit, la lune
    const ax = x0 + (astre ? .7 : .12 + t * .76) * (x1 - x0), ay = astre ? 7 : 22 - Math.sin(t * Math.PI) * 15;
    if (!(mm && mm.couvert > .85)) { x.fillStyle = astre ? "#F4F0D0" : h < 8 || h > 17.5 ? "#FFB860" : "#FFE870"; x.fillRect(Math.round(ax) - 2, Math.round(ay) - 2, 5, 5); x.fillRect(Math.round(ax) - 1, Math.round(ay) - 3, 3, 7); x.fillRect(Math.round(ax) - 3, Math.round(ay) - 1, 7, 3);
      if (astre) { x.fillStyle = rvb(haut); x.fillRect(Math.round(ax), Math.round(ay) - 2, 3, 3); } }
    return c;
  };
  let c;
  if (heure === "cycle") { const hs = [7, 12, 18.6, 23]; hs.forEach((h, i) => { const r = tranche(Math.round(i * W / 4), Math.round((i + 1) * W / 4), h, m); if (i === 1) c = r; }); }
  else c = tranche(0, W, heureVignette(heure), m);
  const nuit = heure === "cycle" ? .3 : c.nuit, sombre = col => rvb(melRVB(hexRVB(col), [24, 30, 70], nuit * .6));
  const coll = (col, h0, a, ph) => { x.fillStyle = sombre(col); for (let X = 0; X < W; X++) { const y = Math.round(H - h0 - a * Math.sin(X / W * 6.28 * 1.3 + ph)); x.fillRect(X, y, 1, H - y); } };
  coll("#7CC46A", 11, 3, 1); coll("#4F9E4E", 6, 2, 3.2);
  if (ACTIVITE[MACHINE_NOM] === "eau") { x.fillStyle = sombre("#4AA0DC"); x.fillRect(0, H - 4, W, 4); x.fillStyle = sombre("#9AD4F4"); for (let X = 2; X < W; X += 9) x.fillRect(X, H - 3, 4, 1); }
  const nuages = mm => { const n = Math.round(1 + mm.couvert * 5), col = mm.orage ? "#7A7E92" : mm.pluie ? "#A4A8B8" : "#F4F6FA";
    for (let i = 0; i < n; i++) { const cx = (i * 23 + 6) % (W + 10) - 6, cy = 4 + (i * 7) % 9; x.fillStyle = sombre(col); x.fillRect(cx, cy, 14, 4); x.fillRect(cx + 3, cy - 2, 8, 2); x.fillRect(cx + 1, cy + 4, 12, 1); } };
  if (m) {
    if (m.couvert > .3) nuages(m);
    if (m.pluie) { x.fillStyle = "rgba(200,220,255,.85)"; for (let i = 0; i < 26; i++) { const px = (i * 17) % W, py = 9 + (i * 11) % 22; x.fillRect(px, py, 1, 3); x.fillRect(px - 1, py + 3, 1, 1); } }
    if (m.neige) { x.fillStyle = "#fff"; for (let i = 0; i < 30; i++) x.fillRect((i * 19) % W, 6 + (i * 13) % 28, 1, 1); x.fillRect(0, H - 3, W, 3); }
    if (m.orage) { x.fillStyle = "#FFE860"; [[30, 9], [28, 13], [31, 13], [29, 18]].forEach(([a, b], i) => x.fillRect(a, b, i === 2 ? 2 : 2, 4)); }
    if (m.brume > .5) { x.fillStyle = "rgba(235,238,244,.55)"; x.fillRect(0, 14, W, 4); x.fillRect(0, 22, W, 5); x.fillStyle = "rgba(235,238,244,.35)"; x.fillRect(0, 8, W, 3); }
  } else {   // variable : du beau, des nuages, une averse
    nuages({couvert: .5}); x.fillStyle = "rgba(200,220,255,.85)"; for (let i = 0; i < 8; i++) x.fillRect(40 + (i * 5) % 18, 12 + (i * 7) % 12, 1, 3);
  }
}

/* ---- le menu ---- */
function circuitsDuMenu() {
  const disc = ACTIVITE[MACHINE_NOM];
  return Object.entries(NIVEAUX).filter(([k, n]) => !n.cache && disciplineDe(n) === disc).sort((x, y) => (y[1].jour ? 1 : 0) - (x[1].jour ? 1 : 0))
    .concat(Object.entries(CIRCUITS_PERSO).filter(([k, n]) => disciplineDe(n) === disc));
}
const estCourant = id => ACTIVITE[MACHINE_NOM] === DISCIPLINE && !NIVEAU.brouillon && (NIVEAU.id || "") === id;
function recordDe(id) {   // ton meilleur tour sur ce circuit, à cette machine : celui de cette machine pour le circuit courant, ceux du serveur pour les autres
  if (estCourant(id) && record) return record;
  let r = 0; for (const v of Object.values(D.records || {})) if (v && v.niveau === id && (v.machine === CLE_MACHINE || v.machine === MACHINE_NOM) && v.tour && v.tour.t > 0 && (!r || v.tour.t < r)) r = v.tour.t;
  return r;
}
function carteCircuit([id, n]) {
  const perso = !!CIRCUITS_PERSO[id], on = estCourant(id);
  return `<button class="m-carte${on ? " on" : ""}${n.jour ? " jour" : ""}" data-c="${escM(id)}"><canvas></canvas><span class="m-c-txt">
    <b>${n.jour ? "☀️ " : perso ? "✏️ " : ""}${escM(n.nom || id)}</b><small class="m-c-info">…</small></span><i class="m-barre"><u></u></i></button>`;
}
function infosCarte(id) {
  const el = document.querySelector(`#menu [data-c="${CSS.escape(id)}"] .m-c-info`), T = MENU.traces[id]; if (!el || !T) return;
  const r = recordDe(id), n = NIVEAUX[id] || CIRCUITS_PERSO[id] || {};
  el.textContent = [longueur(T.tour), texteForme(T), texteRelief(T)].join(" · ") + (n.jour ? " · du jour" : r ? " · record " + chrono(r) : "");
}
function vitesseHabituelle() { return MACHINE.physique ? 7.5 : MACHINE.cadence * M_COUP / 60; }   // en vrais m/s, à l'allure habituelle
function blocApercu() {
  const bonne = ACTIVITE[MACHINE_NOM] === DISCIPLINE, T = bonne ? resumeTrace(PISTE, TOUR_VRAI, BOUCLE) : null;
  if (!T) return `<div class="m-apercu vide"><p>${circuitsDuMenu().length ? "Choisis un circuit." : "Pas encore de circuit pour cette machine : crée le tien ou génère-le."}</p></div>`;
  const duree = TOUR_VRAI / Math.max(.5, vitesseHabituelle()), r = record;
  return `<div class="m-apercu"><canvas class="m-grand"></canvas><div class="m-fiche">
    <h1>${NIVEAU.brouillon ? "✏️ " : NIVEAU.jour ? "☀️ " : ""}${escM(NIVEAU.nom || NIVEAU.id)}</h1>
    <div class="m-puces"><span><small>${BOUCLE ? "UN TOUR" : "DISTANCE"}</small>${longueur(TOUR_VRAI)}</span><span><small>FORME</small>${BOUCLE ? "Circuit" : "Parcours"}</span><span><small>DÉNIVELÉ</small>${T.dplus < 10 ? "Plat" : "+" + T.dplus + " m"}</span><span><small>À TON ALLURE</small>≈ ${Math.max(1, Math.round(duree / 60))} min</span></div>
    <canvas class="m-profil"></canvas>
    <p class="m-record">${r ? (BOUCLE ? "Ton record du tour : " : "Ton record : ") + "<b>" + chrono(r) + "</b>" : "Pas encore de record ici."}${NIVEAU.jour && typeof NIVEAU.note === "number" ? " · note " + NIVEAU.note + " / 100" : ""}</p>
    ${NIVEAU.route ? `<p class="m-record" style="opacity:.6;font-size:.8em">${NIVEAU.osm ? "Tracé et décor d'après" : "Tracé d'après"} OpenStreetMap · © les contributeurs d'OpenStreetMap</p>` : ""}
    ${NIVEAU.brouillon ? blocGarder("m") : classementDuJour()}</div></div>`;
}
function vignettes() {
  const h = PARAMS.get("heure") || lireReglage("riviere_heure", "circuit") || "circuit", m = PARAMS.get("meteo") || lireReglage("riviere_meteo", "circuit") || "circuit";
  const amb = (h === "circuit" && m === "circuit" ? "Celle du circuit" : libelle(HEURES_MENU, h) + " · " + libelle(METEOS_MENU, m).toLowerCase());
  const comp = MACHINE.monture === "cycliste" ? {nom: "Ton dresseur à vélo", sous: {sprite: "Tout en pixels", mixte: "Vélo 3D", "3d": "Tout en 3D"}[CYC.mode] || ""}
    : MACHINE_NOM === "elliptique" ? {nom: (ficheTrotteur(trotteurVoulu()) || {}).nom || "Ton Pokémon", sous: "trottine"}
    : DISCIPLINE === "eau" ? {nom: (ficheNageur(nageurVoulu()) || {nom: "Ton Pokémon"}).nom, sous: "nage avec toi"} : {nom: "Ton Pokémon", sous: ""};
  const fan = {record: "Fantôme : ton record", seance: "Fantôme : la séance", aucun: "Sans fantôme"}[FANTOME.choix], riv = {aucun: "sans adversaire", tranquilles: "adversaires tranquilles", coriaces: "adversaires coriaces"}[RIVAUX.choix];
  return `<div class="m-tuiles">
    <button class="m-tuile" data-f="ambiance"><canvas class="m-ciel"></canvas><span><small>AMBIANCE</small>${escM(amb)}</span></button>
    <button class="m-tuile" data-f="compagnon"><canvas class="m-portrait" width="56" height="56"></canvas><span><small>COMPAGNON</small>${escM(comp.nom)}<em>${escM(comp.sous)}</em></span></button>
    <button class="m-tuile" data-f="course"><i class="m-pictos">👻</i><span><small>LA COURSE</small>${escM(fan)}<em>${escM(riv)}</em></span></button></div>`;
}
function ouvrirMenu() {
  S.mode = null; S.pause = false; majBoutons(); fermerPanneau(); MENU.ouvert = true; document.body.classList.add("au-menu");
  if (lireReglage("riviere_menu_v2", null) === null) { ecrireReglage("riviere_menu_v2", 1); ecrireReglage("riviere_circuits", null); for (const k of Object.keys(CIRCUITS_PERSO)) delete CIRCUITS_PERSO[k]; }   // (17/11, Kiki) les circuits faits à l'essai sont effacés une fois
  const el = $("menu"), choisie = MACHINE_CHOISIE || !!lireReglage("riviere_machine", null);
  const enc = lireLS(ENCOURS, null), reprise = enc && aDuContenu(enc) && Date.now() - enc.maj < 12 * 3600e3 && (enc.machine || "rameur") === MACHINE_NOM && gardable(enc) ? enc : null;
  if (enc && !reprise && (enc.machine || "rameur") === MACHINE_NOM) ecrireLS(ENCOURS, null);   // une séance qui ne s'enregistre pas (marcheur elliptique) ou trop vieille : rien à récupérer
  const attend = (lireLS(ATTENTE, []) || []).length, der = (D.dernieres || {})[MACHINE_NOM] || (MACHINE_NOM === "rameur" ? D.derniere : null), bonne = ACTIVITE[MACHINE_NOM] === DISCIPLINE;
  const liste = circuitsDuMenu();
  MENU.sur = 0; MENU.jet = 0;
  el.innerHTML = `<header class="m-tete"><div class="m-nom">Poké Swift</div>
      <nav class="m-machines"${choisie ? "" : " hidden"}>${MACHINES_MENU.map(([k, t, ic]) => `<button class="m-machine${choisie && k === MACHINE_NOM ? " on" : ""}" data-machine="${k}"><i>${ic}</i><b>${t}</b></button>`).join("")}</nav>
      ${boutonPlein("m-rond")}<button class="m-rond" id="mRegl" title="Réglages">⚙</button></header>
    ${!choisie ? `<div class="m-accueil"><h1>Quelle machine aujourd'hui ?</h1><div class="m-grandes">${MACHINES_MENU.map(([k, t, ic, s]) => `<button class="m-machine grande" data-machine="${k}"><i>${ic}</i><b>${t}</b><small>${s}</small></button>`).join("")}</div>
      <p class="m-petit">Ses circuits apparaîtront ensuite. Tu pourras en changer à tout moment, en haut.</p></div>` : `
    <div class="m-corps">
      <section class="m-liste"><div class="m-titre2">Les circuits ${{rameur: "du rameur", elliptique: "du marcheur elliptique", velo: "du vélo"}[MACHINE_NOM]}</div>
        ${NIVEAU.brouillon ? `<button class="m-carte on brouillon" id="mBrouillon"><span class="m-c-txt"><b>✏️ ${escM(NIVEAU.nom)}</b><small>Ton brouillon, en essai · le retoucher</small></span><i class="m-barre"><u></u></i></button>` : ""}
        <div class="m-cartes">${liste.map(carteCircuit).join("")}</div></section>
      <button class="m-creer" id="mEditeur"><b>✏️ Créer un circuit</b><small>le générer en deux touchers, ou le dessiner</small></button>
      <section class="m-droite">${blocApercu()}${vignettes()}</section>
        <div class="m-depart">
          ${attend ? `<p class="m-alerte">Une séance attend d'être envoyée : recharge la page.</p>` : ""}
          ${reprise ? `<div class="m-reprise"><button class="m-go petit" id="mReprise">▶ Récupérer la séance interrompue (${fmt(reprise.t)})</button><button class="m-sec" id="mJeter">Annuler</button></div>` : ""}
          <div class="m-boutons"><button class="m-go" id="mGo" ${bonne ? "" : "disabled"}><span class="m-plein"></span><b>▶ Commencer</b><small id="mGoTxt"></small></button><button class="m-sec" id="mEssai" ${bonne ? "" : "disabled"}>Essayer<br>sans montre</button></div>
          <p class="etat-montre" id="mMontre"></p>
          ${der ? `<p class="m-petit">Dernière séance : ${der.quand}${der.distance ? " · " + metres(der.distance) + " m" : der.estime ? " · ≈ " + metres(der.estime) + " m" : ""}${der.tours ? " · " + der.tours + " tour" + (der.tours > 1 ? "s" : "") : ""}</p>` : ""}
        </div></div>`}
    <div class="m-voile" id="mVoile" hidden><div class="m-feuille" id="mFeuille"></div></div>`;
  el.hidden = false;
  el.querySelectorAll("[data-machine]").forEach(b => b.onclick = () => { if (choisie && b.dataset.machine === MACHINE_NOM) return; b.classList.add("charge"); choisirMachine(b.dataset.machine); });
  $("mRegl").onclick = () => ouvrirFeuille("reglages");
  if (!choisie) return;
  for (const [id, n] of liste) { const T = traceDe(id, n); if (T) { dessinerTrace(el.querySelector(`[data-c="${CSS.escape(id)}"] canvas`), T, disciplineDe(n), false); infosCarte(id); } }
  calculerTraces(liste);
  el.querySelectorAll(".m-cartes [data-c]").forEach(b => b.onclick = () => { if (estCourant(b.dataset.c)) return; b.classList.add("charge"); b.querySelector(".m-c-info").textContent = "Je le prépare…"; choisirCircuit(b.dataset.c); });
  if (NIVEAU.brouillon) $("mBrouillon").onclick = () => ouvrirEditeur(NIVEAU);
  $("mEditeur").onclick = () => { fermerMenu(); ouvrirEditeur(); };
  el.querySelectorAll(".m-tuile").forEach(b => b.onclick = () => ouvrirFeuille(b.dataset.f));
  $("mGo").onclick = e => { if (reprise && ++MENU.sur < 2) { e.currentTarget.querySelector("b").textContent = "La séance interrompue sera perdue : touche encore"; return; } ecrireLS(ENCOURS, null); commencer("vraie"); };
  $("mEssai").onclick = () => commencer("essai");
  if (reprise) { $("mReprise").onclick = () => { fermerMenu(); ouvrirFin(reprise, true); };
    $("mJeter").onclick = e => { if (++MENU.jet < 2) { e.target.textContent = "Sûr ?"; return; } ecrireLS(ENCOURS, null); ouvrirMenu(); }; }
  (() => { const g = el.querySelector(".m-grand"), pr = el.querySelector(".m-profil"), T = bonne ? MENU.traces[NIVEAU.id] || resumeTrace(PISTE, TOUR_VRAI, BOUCLE) : null;
    if (g && T) dessinerTrace(g, T, DISCIPLINE, true); if (pr && T) { if (T.relief < 2) pr.hidden = true; else dessinerProfil(pr, T, DISCIPLINE); } majVignettes();
    const on = el.querySelector(".m-cartes .m-carte.on"), box = el.querySelector(".m-cartes");   // le circuit choisi, à l'écran (au téléphone, les circuits défilent de côté)
    if (on && box) { box.scrollLeft = Math.max(0, on.offsetLeft - box.offsetLeft - 8); if (box.scrollHeight > box.clientHeight) box.scrollTop = Math.max(0, on.offsetTop - box.offsetTop - 8); } })();
  if (NIVEAU.brouillon) relierGarder("m");
  majMenuDepart(); majMenuMontre();
  try { if (sessionStorage.getItem("riviere_essai_go")) { sessionStorage.removeItem("riviere_essai_go"); if (NIVEAU.brouillon && bonne) commencer("essai"); } } catch (e) {}   // « Essayer » de l'éditeur : on part tout de suite
}
/* un brouillon de l'éditeur qu'on vient d'essayer (17/11, Kiki : « ce qui doit être mis en valeur, c'est d'essayer ; une fois dans le circuit,
   ce circuit vous a plu ? l'enregistrer ») : au menu et à la fin de l'essai, on le garde en un toucher, ou on retourne le retoucher */
function blocGarder(px) {
  return `<div class="m-garder"><b>Ce circuit te plaît ?</b><span><input type="text" id="${px}Nom" maxlength="40" value="${escM(NIVEAU.nom || "Mon circuit")}" aria-label="Son nom">
    <button class="m-go petit" id="${px}Garder">💾 Le garder</button><button class="m-sec" id="${px}Retoucher">✏️ Le retoucher</button></span>
    <small>Gardé, il rejoint tes circuits au menu (sur cet appareil).</small></div>`;
}
function relierGarder(px) {
  const g = $(px + "Garder"), r = $(px + "Retoucher"); if (!g) return;
  g.onclick = () => { g.textContent = "Je le range…"; garderBrouillon($(px + "Nom").value); };
  r.onclick = () => ouvrirEditeur(NIVEAU);
}
function garderBrouillon(nom) {
  const n = propre(NIVEAU); n.nom = String(nom || "").trim() || n.nom || "Mon circuit";
  if (!(n.id && CIRCUITS_PERSO[n.id])) { const base = idDe(n.nom); let id = base, k = 2; while (CIRCUITS_PERSO[id]) id = base + "-" + k++; n.id = id; }   // un circuit déjà gardé (qu'on retouchait) est remplacé ; sinon un nom neuf
  CIRCUITS_PERSO[n.id] = n;
  if (!ecrireReglage("riviere_circuits", CIRCUITS_PERSO)) { alert("Impossible de garder le circuit sur cet appareil (plus de place ?)."); return; }
  ecrireReglage(ED_CLE, n);   // l'éditeur repartira de lui (le retoucher le remplace)
  choisirCircuit(n.id);
}
function fermerMenu() { MENU.ouvert = false; document.body.classList.remove("au-menu"); const el = $("menu"); el.hidden = true; el.innerHTML = ""; }
function majVignettes() {
  const el = $("menu"), c = el.querySelector(".m-ciel"); if (c) peindreCiel(c, PARAMS.get("heure") || lireReglage("riviere_heure", "circuit") || "circuit", meteoVignette(PARAMS.get("meteo") || lireReglage("riviere_meteo", "circuit") || "circuit"));
  const p = el.querySelector(".m-portrait"); if (p) portraitCompagnon(p);
}
async function portraitNageur(cv, num) {   // sa tête : la première image de sa planche, de face
  const pl = await planche(String(num).padStart(4, "0") + "/Walk"); if (!pl || !cv.isConnected) return;
  const b = pl.boite(0), w = b.x1 - b.x0, h = b.y1 - b.y0, k = Math.min(cv.width / w, cv.height / h, 2), x = cv.getContext("2d");
  x.clearRect(0, 0, cv.width, cv.height); x.imageSmoothingEnabled = false; x.drawImage(pl.tex.image, b.x0, b.y0, w, h, Math.round((cv.width - w * k) / 2), Math.round(cv.height - h * k), Math.round(w * k), Math.round(h * k));
}
function portraitCycliste(cv) {   // le dresseur à vélo, de trois quarts (la planche du sprite)
  const d = typeof CYCLISTE_SPRITE !== "undefined" && CYCLISTE_SPRITE; if (!d) return;
  const F = d.fiche, r = Math.max(0, F.rangs.findIndex(g => g.etat === "assis" && g.deg === 45)), im = new Image();
  im.onload = () => { if (!cv.isConnected) return; const x = cv.getContext("2d"), k = Math.min(cv.width / F.w, cv.height / F.h); x.clearRect(0, 0, cv.width, cv.height); x.imageSmoothingEnabled = false; x.drawImage(im, 0, r * F.h, F.w, F.h, (cv.width - F.w * k) / 2, cv.height - F.h * k, F.w * k, F.h * k); };
  im.src = d.png;
}
function portraitCompagnon(cv) {
  if (MACHINE.monture === "cycliste") return portraitCycliste(cv);
  if (MACHINE_NOM === "elliptique") return portraitNageur(cv, trotteurVoulu());
  portraitNageur(cv, DISCIPLINE === "eau" ? nageurVoulu() : NIVEAU.nageur || 7);
}
/* « Commencer » se remplit pendant que le circuit se construit ; la carte du circuit aussi */
function majMenuDepart() {
  const g = $("mGo"); if (!g || !MENU.ouvert) return;
  const part = CHANTIER.part, pret = CHANTIER.pret;
  g.querySelector(".m-plein").style.width = Math.round(part * 100) + "%"; g.classList.toggle("pret", pret);
  $("mGoTxt").textContent = pret ? "" : CHANTIER.depart ? "Départ dès que c'est prêt… " + Math.round(part * 100) + " %" : "Je prépare le circuit… " + Math.round(part * 100) + " %";
  const c = document.querySelector("#menu .m-carte.on .m-barre u"); if (c) { c.style.width = Math.round(part * 100) + "%"; c.parentNode.classList.toggle("fini", pret); }
}
CHANTIER.suivis.push(majMenuDepart);

/* ---- les feuilles : un réglage à la fois, par-dessus le menu ---- */
const choixBoutons = (liste, choisi, attr) => liste.map(([k, t, s]) => `<button class="m-opt${choisi === k ? " on" : ""}" data-${attr}="${k}">${t}${s ? `<small>${s}</small>` : ""}</button>`).join("");
function ouvrirFeuille(quoi) {
  const v = $("mVoile"), f = $("mFeuille"); if (!v) return; MENU.feuille = quoi;
  const fermer = `<button class="m-rond m-fermer" id="mFermer">✕</button>`;
  if (quoi === "ambiance") {
    const h = PARAMS.get("heure") || lireReglage("riviere_heure", "circuit") || "circuit", m = PARAMS.get("meteo") || lireReglage("riviere_meteo", "circuit") || "circuit";
    const vignette = (attr, k, t, sous) => `<button class="m-vciel${(attr === "h" ? h : m) === k ? " on" : ""}" data-${attr}="${k}"><canvas></canvas><b>${t}</b>${sous ? `<small>${sous}</small>` : ""}</button>`;
    f.innerHTML = `${fermer}<h2>L'ambiance</h2>
      <div class="m-sous">L'heure</div><div class="m-cieux">${HEURES_MENU.map(([k, t]) => vignette("h", k, k === "circuit" ? "Celle du circuit" : t, SOUS_HEURE[k] ? SOUS_HEURE[k]() : "")).join("")}</div>
      <div class="m-sous">Le temps</div><div class="m-cieux">${METEOS_MENU.map(([k, t]) => vignette("m", k, k === "circuit" ? "Celui du circuit" : t, SOUS_METEO[k] ? SOUS_METEO[k]() : "")).join("")}</div>`;
    const peindre = () => { const hh = lireReglage("riviere_heure", "circuit") || "circuit", mm = lireReglage("riviere_meteo", "circuit") || "circuit";
      f.querySelectorAll("[data-h] canvas").forEach(c => peindreCiel(c, c.parentNode.dataset.h, meteoVignette(mm)));
      f.querySelectorAll("[data-m] canvas").forEach(c => peindreCiel(c, hh, meteoVignette(c.parentNode.dataset.m))); };
    peindre();
    f.querySelectorAll("[data-h]").forEach(b => b.onclick = () => { ecrireReglage("riviere_heure", b.dataset.h); f.querySelectorAll("[data-h]").forEach(x => x.classList.toggle("on", x === b)); reglerAmbiance(b.dataset.h === "circuit" ? NIVEAU.heure || "jour" : b.dataset.h, null); peindre(); majTuiles(); });
    f.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { ecrireReglage("riviere_meteo", b.dataset.m); f.querySelectorAll("[data-m]").forEach(x => x.classList.toggle("on", x === b)); const mm = b.dataset.m === "circuit" ? NIVEAU.meteo || "beau" : b.dataset.m; reglerAmbiance(null, mm); if (METEOS[mm]) Object.assign(AMB.m, METEOS[mm]); peindre(); majTuiles(); });
  } else if (quoi === "compagnon") {
    const ell = MACHINE_NOM === "elliptique", cyc = MACHINE.monture === "cycliste", eau = DISCIPLINE === "eau" && MACHINE_NOM === "rameur";
    const grille = (liste, choisi, attr) => `<div class="m-pokes">${liste.map(n => `<button class="m-poke${n.num === choisi ? " on" : ""}" data-${attr}="${n.num}"><canvas width="56" height="56"></canvas><b>${escM(n.nom)}</b><small>${metresNageur(n)}</small></button>`).join("")}</div>`;
    f.innerHTML = `${fermer}<h2>Ton compagnon</h2>
      ${ell ? `<div class="m-sous">Ce que tu vois</div><div class="m-opts">${choixBoutons([["trotteur", "Ton Pokémon trottine", "6,5 km/h à ton allure habituelle"], ["cycliste", "À vélo", "15 km/h à ton allure habituelle"]], MACHINE.monture, "monture")}</div><p class="m-petit">Les chiffres restent tes vrais mètres. Chaque façon a ses records.</p>` : ""}
      ${ell && !cyc && TROTTEURS.liste.length ? `<div class="m-sous">Qui trottine</div>${grille(TROTTEURS.liste, trotteurVoulu(), "trotteur")}` : ""}
      ${cyc && cycSprite() ? `<div class="m-sous">Ton cycliste</div><div class="m-opts">${choixBoutons([["sprite", "Tout en pixels"], ["mixte", "Vélo 3D", "ton dresseur en pixels dessus"], ["3d", "Tout en 3D"]], CYC.mode, "cycliste")}</div><p class="m-petit">Aux couleurs de ta carte du dresseur. Les records ne changent pas.</p>` : ""}
      ${eau && NAGEURS.liste.length ? `<div class="m-sous">Qui nage avec toi <em>chacun à sa vraie taille</em></div>${grille(NAGEURS.liste, nageurVoulu(), "nageur")}` : ""}
      ${!ell && !cyc && !eau ? `<p class="m-petit">Sur ce circuit, c'est le Pokémon du circuit qui t'accompagne.</p>` : ""}`;
    f.querySelectorAll("canvas[width]").forEach(c => { const b = c.parentNode; portraitNageur(c, +(b.dataset.nageur || b.dataset.trotteur)); });
    const pick = (attr, cle, changer) => f.querySelectorAll(`[data-${attr}]`).forEach(b => b.onclick = () => { const n = +b.dataset[attr]; ecrireReglage(cle, n); f.querySelectorAll(`[data-${attr}]`).forEach(x => x.classList.toggle("on", x === b)); quandMonde(() => changer(n)); majTuiles(); });
    pick("nageur", "riviere_nageur", changerNageur); pick("trotteur", "riviere_trotteur", changerTrotteur);
    f.querySelectorAll("[data-cycliste]").forEach(b => b.onclick = () => { const k = b.dataset.cycliste; if (k === CYC.mode) return; ecrireReglage("riviere_cycliste", k); f.querySelectorAll("[data-cycliste]").forEach(x => x.classList.toggle("on", x === b));
      if (CHANTIER.pret) CYC.choisir(k); else { CYC.mode = k; quandMonde(() => CYC.choisir(k)); } majTuiles(); });
    f.querySelectorAll("[data-monture]").forEach(b => b.onclick = () => { if (b.dataset.monture === MACHINE.monture) return; ecrireReglage("riviere_monture_elliptique", b.dataset.monture); b.textContent = "Un instant…"; relancer(); });
  } else if (quoi === "course") {
    f.innerHTML = `${fermer}<h2>La course</h2>
      <div class="m-sous">Ton fantôme <em>ton meilleur tour, en transparence</em></div><div class="m-opts">${choixBoutons([["record", "Mon record"], ["seance", "Le meilleur tour de la séance"], ["aucun", "Aucun"]], FANTOME.choix, "fa")}</div><p class="m-petit" id="mFantome"></p>
      <div class="m-sous">Des adversaires <em>des Pokémon qui tiennent une allure réglée sur la tienne</em></div><div class="m-opts">${choixBoutons([["aucun", "Aucun"], ["tranquilles", "Tranquilles"], ["coriaces", "Coriaces"]], RIVAUX.choix, "r")}</div>`;
    const un = (sel, g) => f.querySelectorAll(sel).forEach(b => b.onclick = () => { f.querySelectorAll(sel).forEach(x => x.classList.toggle("on", x === b)); g(b); majTuiles(); });
    un("[data-fa]", b => { choisirFantome(b.dataset.fa); majTexteFantome(); });
    un("[data-r]", b => { if (CHANTIER.pret) choisirRivaux(b.dataset.r); else { RIVAUX.choix = RIVAUX_NIVEAUX[b.dataset.r] ? b.dataset.r : "aucun"; ecrireReglage("riviere_rivaux", RIVAUX.choix); } });
    majTexteFantome();
  } else if (quoi === "reglages") {
    const velo = MACHINE_NOM === "velo";
    f.innerHTML = `${fermer}<h2>Réglages</h2>
      <div class="m-sous">Capteur Bluetooth <em>home trainer, rameur ou elliptique connecté, ceinture cardio</em></div>
      <div class="m-opts"><button class="m-opt" id="mBT" ${BT_OK ? "" : "disabled"}>Relier un capteur</button>${velo ? `<button class="m-opt" id="mFaux">Faux home trainer<small>pour essayer : ne compte jamais</small></button>` : ""}</div>
      <p class="m-petit" id="mBTetat">${BT_OK ? escM(BT.etat || "Rien de relié.") : "Ce navigateur ne parle pas Bluetooth (Chrome ou Edge le font)."}</p>
      ${velo ? `<div class="m-sous">Dureté des pentes <em>100 % = la vraie pente ; les descentes comptent à moitié</em></div><div class="m-opts">${choixBoutons([["0", "0 %"], ["0.25", "25 %"], ["0.5", "50 %"], ["0.75", "75 %"], ["1", "100 %"]], String(BT.difficulte), "dur")}</div>` : ""}
      <div class="m-sous">Le son <em>de petits bruitages, jamais de musique</em></div><div class="m-opts">${choixBoutons([["1", "Bruitages"], ["0", "Coupé"]], SON.actif ? "1" : "0", "son")}</div>
      <div class="m-sous">Les effets du décor <em>l'eau qui coule, le vent dans les arbres, les forêts au loin, les ombres</em></div>
      <div class="m-opts">${choixBoutons([["1", "Avec"], ["0", "Sans", "seulement pour un très vieil ordinateur"]], lireReglage("riviere_effets", "1") === "0" ? "0" : "1", "x")}</div>
      <div class="m-sous">Un rendu plus réaliste <em>à essayer, chacun à part : le décor reste celui de Kanto</em></div>
      ${REEL_CHOIX.map(([k, nom, quoi]) => `<div class="m-sous m-reel">${nom} <em>${quoi}</em></div><div class="m-opts">${choixBoutons([["0", "Comme avant"], ["1", "Plus réaliste"]], REEL[k] ? "1" : "0", "reel-" + k)}</div>`).join("")}`;
    f.querySelectorAll("[data-x]").forEach(b => b.onclick = () => { if (b.dataset.x === (lireReglage("riviere_effets", "1") === "0" ? "0" : "1")) return; ecrireReglage("riviere_effets", b.dataset.x); b.textContent = "Je refais le monde…"; relancer(); });
    for (const [k] of REEL_CHOIX) f.querySelectorAll(`[data-reel-${k}]`).forEach(b => b.onclick = () => { const oui = b.getAttribute("data-reel-" + k) === "1"; if (oui === REEL[k]) return;
      const l = REEL_NOMS.filter(n => n === k ? oui : REEL[n]); ecrireReglage("riviere_reel", l.join(",")); b.textContent = "Je refais le monde…"; relancer(); });
    f.querySelectorAll("[data-son]").forEach(b => b.onclick = () => { if ((b.dataset.son === "1") !== SON.actif) sonBasculer(); f.querySelectorAll("[data-son]").forEach(x => x.classList.toggle("on", x === b)); majSon(); });
    f.querySelectorAll("[data-dur]").forEach(b => b.onclick = () => { BT.difficulte = +b.dataset.dur; BT.pente = null; ecrireReglage("riviere_difficulte", BT.difficulte); f.querySelectorAll("[data-dur]").forEach(x => x.classList.toggle("on", x === b)); });
    const faux = $("mFaux"); if (faux) faux.onclick = async () => { await relierCapteur(true); const el = $("mBTetat"); if (el) el.textContent = BT.etat; majMenuMontre(); };
    $("mBT").onclick = async () => { const el = $("mBTetat"), t = setInterval(() => { if (el.isConnected) el.textContent = BT.etat; }, 300); await relierCapteur(); clearInterval(t); if (el.isConnected) el.textContent = BT.etat; majMenuMontre(); };
  }
  v.hidden = false;
  $("mFermer").onclick = fermerFeuille; v.onclick = e => { if (e.target === v) fermerFeuille(); };
}
/* le rendu plus réaliste (REEL de depart.js, 18/11) : trois interrupteurs, chacun à part ; changer recharge la page (les shaders se font au départ) */
const REEL_CHOIX = [["lumiere", "La lumière", "douce, un ciel sans bandes, des ombres au bord flou"], ["reflets", "L'eau", "elle reflète le ciel, le soleil y scintille"], ["matieres", "Les matières", "l'herbe, la terre et la roche ont du grain"]];
function fermerFeuille() { const v = $("mVoile"); if (v) v.hidden = true; MENU.feuille = null; }
function majTuiles() { const t = document.querySelector("#menu .m-tuiles"); if (!t) return; const n = document.createElement("div"); n.innerHTML = vignettes(); t.replaceWith(n.firstElementChild);
  document.querySelectorAll("#menu .m-tuile").forEach(b => b.onclick = () => ouvrirFeuille(b.dataset.f)); majVignettes(); }

/* le plein écran, toujours à portée (17/11, Kiki : « un endroit un peu caché mais accessible tout le temps ») : un petit bouton à côté de ⚙ au menu,
   et dans le haut de l'éditeur ; il passe en plein écran ou en sort (jeu.js : pleinEcran) */
const boutonPlein = cls => (PLEIN.doc.fullscreenEnabled || PLEIN.doc.webkitFullscreenEnabled) ? `<button class="${cls} b-plein" title="Plein écran">${enPlein() ? "🗗" : "⛶"}</button>` : "";
document.addEventListener("click", e => { const b = e.target.closest && e.target.closest(".b-plein"); if (!b) return; e.stopPropagation(); const oui = !enPlein(); pasEnPlein(!oui); pleinEcran(oui); }, true);
for (const ev of ["fullscreenchange", "webkitfullscreenchange"]) PLEIN.doc.addEventListener(ev, () => document.querySelectorAll(".b-plein").forEach(b => b.textContent = enPlein() ? "🗗" : "⛶"));
/* changer de circuit ou de machine : gardé pour les prochaines fois, et la page repart avec (le menu revient aussitôt) */
function choisirCircuit(id) {
  if (FORCE) { try { sessionStorage.setItem("riviere_niveau_une_fois", id); } catch (e) {} } else ecrireReglage("riviere_niveau_" + disciplineDe(NIVEAUX[id] || CIRCUITS_PERSO[id]), id);
  relancer();
}
function choisirMachine(m) {   // une autre machine : gardée sur l'appareil ; pour le reste de la visite, elle passe aussi devant celle de l'adresse
  ecrireReglage("riviere_machine", m); if (ACTIVITE[m] === "terre") ecrireReglage("riviere_machine_terre", m); ecrireReglage("riviere_surface", null);
  try { sessionStorage.setItem("riviere_machine_menu", m); } catch (e) {}
  if (m === MACHINE_NOM) { ouvrirMenu(); return; }   // c'était déjà elle (premier choix sur cet appareil) : rien à reconstruire
  relancer();
}
addEventListener("resize", () => { if (!MENU.ouvert) return; clearTimeout(MENU.rz); MENU.rz = setTimeout(() => { if (MENU.feuille) return; const f = MENU.feuille; ouvrirMenu(); if (f) ouvrirFeuille(f); }, 250); });
addEventListener("keydown", e => { if (MENU.ouvert && e.key === "Escape" && MENU.feuille) fermerFeuille(); });
