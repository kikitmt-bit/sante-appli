/* ============ l'éditeur de circuits (refait le 17/11, Kiki : « une usine à gaz, des boutons partout ; ce qui doit être mis en valeur, c'est d'essayer ») ============ */
// Deux écrans, tout dans la page, rien n'est envoyé nulle part :
//   1. l'ACCUEIL (« Créer un circuit » au menu) : « Générer » (longueur, virages, relief, forme en quelques boutons, ce qu'on veut y voir en
//      tuiles, un gros bouton) ; « Dessiner » (partir de zéro, de son brouillon, ou d'un circuit du jeu) ; « Mes circuits » (les retoucher, les jouer).
//      L'activité est celle de la machine choisie au menu (eau pour le rameur, terre pour le vélo et le marcheur elliptique).
//   2. l'ATELIER : le plan en grand (le VRAI code de la piste, generateur.js : essayerNiveau ; le contrôleur dit ce qui cloche), le profil dessous ;
//      toucher le plan ou le profil choisit une pièce ; à droite seulement l'essentiel de cette pièce (longueur, virage, largeur, montée), « + Ajouter
//      une pièce », et repliés : plus de réglages, le circuit, la note en détail, exporter/importer. En haut, en grand : « ▶ Essayer ».
// « Essayer » lance tout de suite le brouillon en essai (il avance tout seul ; toucher l'écran rame) ; à la fin de l'essai, et au menu tant
// qu'on y est, « Ce circuit te plaît ? Le garder » (menu.js : blocGarder). « Garder sans l'essayer » reste possible, en petit en bas de l'atelier.
// Sur le serveur d'essai du PC, « Écrire dans le jeu » range le fichier dans contenu/niveaux.
const ED = {n: null, sel: 0, res: null, vue: "accueil", ajout: false, plis: {}, depuisGen: false, effacer: null,
  gen: {activite: DISCIPLINE, forme: "boucle", km: 2, virages: "quelques", denivele: 0, avec: {grotte: true, cascade: true, pont: true, lac: true}, graine: 1}, msg: ""};
const ED_CLE = "riviere_brouillon";
const propre = n => { const o = JSON.parse(JSON.stringify(n)); for (const k of ["brouillon", "perso", "cache"]) delete o[k]; for (const p of o.pieces) for (const k of ["s0", "s1", "titre", "grotte", "long0"]) delete p[k]; return o; };
const idDe = nom => "perso-" + (nom || "circuit").toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
const esc = t => String(t === undefined || t === null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const edActivite = () => ACTIVITE[MACHINE_NOM] || DISCIPLINE;   // l'activité de la machine du menu

/* ouvrir : sans circuit = l'accueil ; avec un circuit (le brouillon qu'on vient d'essayer, un des siens) = l'atelier */
function ouvrirEditeur(niveau) {
  S.mode = null; S.pause = false; fermerPanneau(); if (typeof fermerMenu === "function" && MENU.ouvert) fermerMenu(); majBoutons();
  ED.gen.activite = edActivite(); ED.msg = ""; ED.ajout = false; ED.effacer = null;
  $("editeur").hidden = false; document.body.classList.add("edite");
  if (niveau) edAtelier(niveau, false); else edAccueil();
}
function fermerEditeur() { $("editeur").hidden = true; document.body.classList.remove("edite"); ouvrirMenu(); }
function edAtelier(niveau, depuisGen) {
  ED.n = propre(niveau); ED.sel = 0; ED.vue = "atelier"; ED.depuisGen = !!depuisGen; ED.ajout = false;
  $("edAccueil").hidden = true; $("edAtelier").hidden = false; edTete(); edTout();
}
function edChange() {
  ecrireReglage(ED_CLE, ED.n); ED.res = essayerNiveau(ED.n); ED.note = null;
  try { const r = ED.res; if (r && !r.erreur && r.verif.ok && !ED.n.zone) ED.note = noterCircuit(r.PISTE, ED.n, region(ED.n.biome), r.tour); } catch (e) {}
  edPlan(); edEtat(); edNote();
}
/* la note du brouillon, en détail : chaque critère, sa note, sa raison ; les plus faibles en premier */
function edNoteHTML() {
  const n = ED.note; if (!n) return `<small>Pas de note tant que le circuit n'est pas jouable.</small>`;
  const tri = n.criteres.slice().sort((a, b) => (a.note - 100) * a.poids - (b.note - 100) * b.poids);
  return tri.map(c => `<div class="ed-crit"><b>${c.nom}</b><i><u style="width:${c.note}%;background:${c.note >= 70 ? "#48C868" : c.note >= 40 ? "#F8C838" : "#D83830"}"></u></i><em>${c.note}</em><small>${esc(c.phrase)}</small></div>`).join("")
    + `<small>Un tour ≈ ${fmt(n.duree)} à ton allure, ${n.sequences.length} paysages qui se suivent. La note juge la construction du circuit, pas sa beauté.</small>`;
}
function edNote() { const el = $("edNote"); if (el) el.innerHTML = edNoteHTML(); }
function edTout() { edChange(); edPanneau(); }
/* le haut de l'éditeur : le titre (l'accueil) ou le nom du circuit et « Essayer » (l'atelier) */
function edTete() {
  const at = ED.vue === "atelier";
  $("edTitre").innerHTML = at ? `<input id="edNom" data-n="nom" maxlength="40" value="${esc(ED.n.nom)}" aria-label="Le nom du circuit" title="Le nom du circuit">` : "Créer un circuit";
  $("edDroite").innerHTML = (at ? `<span id="edStatut" class="ed-statut"></span><button class="rouge ed-essayer" data-act="essayer">▶ Essayer</button>` : "") + boutonPlein("ed-rond");
  $("edRetour").textContent = at ? "← Accueil" : "← Menu";
}

/* ---- le plan et le profil ---- */
function edPlan() {
  const cv = $("edPlan"), l = cv.width = Math.round(cv.clientWidth * devicePixelRatio), h = cv.height = Math.round(cv.clientHeight * devicePixelRatio), c = cv.getContext("2d");
  c.fillStyle = "#8FCF70"; c.fillRect(0, 0, l, h);
  const r = ED.res; if (!r || r.erreur) { c.fillStyle = "#383828"; c.font = Math.round(h * .045) + 'px "Jersey 15", monospace'; c.textAlign = "center"; c.fillText("Le tracé ne se construit pas", l / 2, h / 2); edProfil(null); return; }
  const P = r.PISTE, N = P.N; let xa = 1e9, xb = -1e9, za = 1e9, zb = -1e9;
  for (let i = 0; i < N; i++) { xa = Math.min(xa, P.X[i]); xb = Math.max(xb, P.X[i]); za = Math.min(za, P.Z[i]); zb = Math.max(zb, P.Z[i]); }
  const m = 34 * devicePixelRatio, k = Math.min((l - 2 * m) / Math.max(xb - xa, 40), (h - 2 * m) / Math.max(zb - za, 40)), ox = (l - (xb - xa) * k) / 2 - xa * k, oz = (h - (zb - za) * k) / 2 - za * k;
  const X = i => P.X[i] * k + ox, Z = i => P.Z[i] * k + oz; ED.vuePlan = {k, ox, oz};
  const B = region(ED.n.biome), solDe = nom => { const R = B.rives[nom]; return R ? B.sols[R.sols[0][0]].c[0] : "#84D45C"; };
  const trait = (couleur, larg, garde, cap = "round") => { c.strokeStyle = couleur; c.lineWidth = larg; c.lineJoin = "round"; c.lineCap = cap; c.beginPath(); let dedans = false;
    for (let i = 0; i <= N; i++) { if (!r.boucle && i === N) break; const j = i % N, ok = garde(j); if (ok && !dedans) { c.moveTo(X(j), Z(j)); dedans = true; } else if (ok) c.lineTo(X(j), Z(j)); else dedans = false; } c.stroke(); };
  // les rives (la couleur de leur sol), puis la piste, les grottes, les ponts, la pièce choisie
  if (ED.n.zone) {   // (24/11, Kiki : « regarde le plan ») une ville et sa nature : les bois, les champs, les rues, comme sur une carte
    const z = ED.n.zone, px = q => [q.x * k + ox, q.z * k + oz], CARTE = {foret: "#4E9A46", clairiere: "#9BDC72", pre: "#A4DA78", verger: "#86C062", potagers: "#B08A5C", lande: "#B79AAE", ble: "#E6CC6C", tournesols: "#F0C040", lavande: "#B49AD8", vignes: "#A8A860"};
    for (const a of z.nature || []) { c.fillStyle = CARTE[a.culture || a.genre] || "#8FCF70"; c.beginPath(); a.pts.forEach((q, i) => i ? c.lineTo(...px(q)) : c.moveTo(...px(q))); c.fill(); }
    for (const [o, coul] of [["mare", "#4C9CE8"], ["chapelle", "#E8785A"]]) for (const q of (z.objets || []).filter(q => q.o === o)) { c.fillStyle = coul; c.beginPath(); c.arc(...px(q), Math.max(3 * devicePixelRatio, (q.r || 3) * k), 0, 7); c.fill(); }
    for (const e of z.eaux || []) { c.strokeStyle = "#4C9CE8"; c.lineWidth = Math.max(4, e.pts.reduce((t, q) => t + (q.l || e.l || 20), 0) / e.pts.length * k); c.lineJoin = c.lineCap = "round"; c.beginPath(); e.pts.forEach((q, i) => i ? c.lineTo(...px(q)) : c.moveTo(...px(q))); c.stroke(); }
    for (const v of z.voies) { const rue = (v.sol || "chaussee") === "chaussee"; c.strokeStyle = rue ? "#D8D2C4" : v.sol === "terre" ? "#B98A58" : "#E8D4A8"; c.lineWidth = Math.max(rue ? 3 : 2, (v.l + (rue ? 5 : 0)) * k) ; c.lineJoin = c.lineCap = "round"; c.beginPath(); v.pts.forEach((q, i) => i ? c.lineTo(...px(q)) : c.moveTo(...px(q))); c.stroke(); }
    for (const q of z.places || []) { c.fillStyle = "#CDBFA6"; c.beginPath(); q.pts.forEach((w, i) => i ? c.lineTo(...px(w)) : c.moveTo(...px(w))); c.fill(); }
  } else for (const cote of [0, 1]) for (const p of P.pieces) { const nom = cote ? p.d : p.g; c.strokeStyle = nom === "mer" ? "#3C90EC" : solDe(nom); c.lineWidth = 30 * k + 4; c.lineCap = "butt"; c.beginPath();
    for (let i = p.s0; i <= Math.min(p.s1, N - 1); i++) { const sg = cote ? 1 : -1, x = (P.X[edJ(P, p, i)] + sg * P.CH[edJ(P, p, i)] * (P.W[edJ(P, p, i)] + 15)) * k + ox, z = (P.Z[edJ(P, p, i)] + sg * P.SH[edJ(P, p, i)] * (P.W[edJ(P, p, i)] + 15)) * k + oz; if (i === p.s0) c.moveTo(x, z); else c.lineTo(x, z); } c.stroke(); }
  const larg = i => Math.max(5, P.W[i] * 2 * k), eau = s => !["terre", "goudron"].includes(s);
  for (const p of P.pieces) { c.strokeStyle = "#1B2440"; c.lineWidth = larg(edJ(P, p, p.s0)) + 5; c.lineCap = "round"; c.beginPath(); for (let i = p.s0; i <= Math.min(p.s1, N - 1); i++) { if (i === p.s0) c.moveTo(X(edJ(P, p, i)), Z(edJ(P, p, i))); else c.lineTo(X(edJ(P, p, i)), Z(edJ(P, p, i))); } if (r.boucle && p.s1 >= N) c.lineTo(X(0), Z(0)); c.stroke(); }
  P.pieces.forEach((p, ip) => { const couleur = p.tunnel ? "#8088A0" : p.pont ? "#D8C8A0" : p.surface === "terre" ? "#D9B886" : p.surface === "goudron" ? "#6E7480" : p.surface === "libre" ? "#F0803C" : (B.eaux && B.eaux[p.surface] ? B.eaux[p.surface].c1 : "#3C90EC");
    c.strokeStyle = couleur; c.lineWidth = larg(p.s0); c.lineCap = "butt"; c.beginPath(); for (let i = p.s0; i <= Math.min(p.s1, N - 1); i++) { if (i === p.s0) c.moveTo(X(edJ(P, p, i)), Z(edJ(P, p, i))); else c.lineTo(X(edJ(P, p, i)), Z(edJ(P, p, i))); } if (r.boucle && p.s1 >= N) c.lineTo(X(0), Z(0)); c.stroke(); });
  const choisie = P.pieces.filter(p => p._i === ED.sel || edIndex(p) === ED.sel);
  for (const p of choisie) { c.strokeStyle = "#F8C838"; c.lineWidth = Math.max(4, 3 * devicePixelRatio); c.setLineDash([8, 6]); c.lineCap = "butt"; c.beginPath(); for (let i = p.s0; i <= Math.min(p.s1, N - 1); i++) { if (i === p.s0) c.moveTo(X(edJ(P, p, i)), Z(edJ(P, p, i))); else c.lineTo(X(edJ(P, p, i)), Z(edJ(P, p, i))); } c.stroke(); c.setLineDash([]); }
  // le départ (un damier), le sens (des flèches), les croisements, les noms
  const fl = (i, taille, couleur) => { const a = Math.atan2(P.Z[Math.min(N - 1, i + 2)] - P.Z[i], P.X[Math.min(N - 1, i + 2)] - P.X[i]); c.save(); c.translate(X(i), Z(i)); c.rotate(a); c.fillStyle = couleur; c.beginPath(); c.moveTo(taille, 0); c.lineTo(-taille * .7, taille * .7); c.lineTo(-taille * .7, -taille * .7); c.fill(); c.restore(); };
  for (let i = 30; i < N - 5; i += 90) fl(i, 6 * devicePixelRatio, "#FFFFFF");
  c.save(); c.translate(X(0), Z(0)); c.rotate(P.H[0]); const u = 5 * devicePixelRatio; for (let a = -2; a < 2; a++) for (let b = 0; b < 2; b++) { c.fillStyle = (a + b) & 1 ? "#1B2440" : "#fff"; c.fillRect(a * u, (b - 1) * u, u, u); } c.restore();
  for (const x of r.verif.croisements) { c.strokeStyle = x.bon ? "#2E8A48" : "#D83830"; c.lineWidth = 3 * devicePixelRatio; c.beginPath(); c.arc(X(x.s1), Z(x.s1), 9 * devicePixelRatio, 0, 7); c.stroke(); }
  c.font = Math.round(13 * devicePixelRatio) + 'px "Jersey 15", monospace'; c.textAlign = "center"; c.lineWidth = 3 * devicePixelRatio; c.strokeStyle = "#1B2440"; c.fillStyle = "#fff";
  const pris = [], H13 = 14 * devicePixelRatio; for (const p of P.pieces) { if (!p.nom) continue; const i = Math.min(N - 1, Math.round((p.s0 + p.s1) / 2)), tx = X(edJ(P, p, i)), tz = Z(edJ(P, p, i)) - 10 * devicePixelRatio, w = c.measureText(p.nom).width / 2 + 4; if (ED.n.zone && pris.some(q => q.nom === p.nom && Math.hypot(q.x - tx, q.z - tz) < 160 * devicePixelRatio || Math.abs(q.x - tx) < q.w + w && Math.abs(q.z - tz) < H13)) continue; pris.push({x: tx, z: tz, w, nom: p.nom}); c.strokeText(p.nom, X(edJ(P, p, i)), Z(edJ(P, p, i)) - 10 * devicePixelRatio); c.fillText(p.nom, X(edJ(P, p, i)), Z(edJ(P, p, i)) - 10 * devicePixelRatio); }
  edProfil(r);
}
const edJ = (P, p, i) => p.voie && i < P.voies[p.voie - 1].b ? P.voies[p.voie - 1].dec + i : i;   // l'indice du mètre i d'une pièce (une pièce de la voie « force » d'une fourche a ses mètres à part)
function edIndex(p) {   // à quelle pièce du brouillon correspond une pièce de la piste (le raccord en devient plusieurs, une fourche aussi)
  const r = ED.res.PISTE.pieces, src = ED.n.pieces, i = p._i !== undefined ? p._i : r.indexOf(p);
  return Math.min(i, src.length - 1);
}
function edProfil(r) {
  const cv = $("edProfil"), l = cv.width = Math.round(cv.clientWidth * devicePixelRatio), h = cv.height = Math.round(cv.clientHeight * devicePixelRatio), c = cv.getContext("2d");
  c.fillStyle = "#22315A"; c.fillRect(0, 0, l, h); if (!r) return;
  const P = r.PISTE, N = P.N, max = Math.max(4, r.verif.haut), X = i => 4 + (l - 8) * i / (N - 1), Y = y => h - 5 - (h - 12) * y / max;
  P.pieces.forEach((p, ip) => { c.fillStyle = edIndex(p) === ED.sel ? "#F8C838" : p.tunnel ? "#9098A8" : p.pont ? "#C8B890" : ip % 2 ? "#7CC860" : "#6CB854"; c.beginPath(); c.moveTo(X(p.s0), h); for (let i = p.s0; i <= Math.min(p.s1, N - 1); i++) c.lineTo(X(i), Y(P.Y[edJ(P, p, i)])); c.lineTo(X(Math.min(p.s1, N - 1)), h); c.fill(); });
}
function edEtat() {
  const r = ED.res, el = $("edEtat");
  if (!r || r.erreur) { el.className = "ko"; el.textContent = "✖ " + (r ? r.erreur : "?"); const st = $("edStatut"); if (st) { st.className = "ed-statut ko"; st.textContent = "✖ À corriger"; } return; }
  const v = r.verif;
  el.className = v.ok ? "ok" : "ko";
  const faible = ED.note ? ED.note.criteres.slice().sort((a, b) => (a.note - 100) * a.poids - (b.note - 100) * b.poids)[0] : null;
  const st = $("edStatut"); if (st) { st.className = "ed-statut " + (v.ok ? "ok" : "ko"); st.textContent = v.ok ? "✔ Jouable" + (ED.note ? " · " + ED.note.note + " / 100" : "") : "✖ À corriger"; }
  el.innerHTML = (v.ok ? "✔ Jouable" : "✖ À corriger") + " · " + v.longueur + " m de décor · " + (r.boucle ? "un tour" : "le parcours") + " ≈ " + Math.round(r.tour / (typeof VISUEL !== "undefined" && VISUEL ? MACHINE.allure : 1)) + " vrais m" + (typeof VISUEL !== "undefined" && VISUEL ? " " + ({trotteur: "au trot", cycliste: "à vélo"}[MACHINE.monture] || "") : "") + " · point haut " + v.haut + " m"
    + (ED.note ? " · <b>note " + ED.note.note + " / 100</b>" + (faible && faible.note < 70 ? "<br><small>Le point faible : " + faible.nom.toLowerCase() + ". " + esc(faible.phrase) + "</small>" : "") : "")
    + (v.ok ? "" : "<br>" + v.erreurs.map(esc).join("<br>")) + (ED.msg ? "<br><b>" + esc(ED.msg) + "</b>" : "");
}


/* ---- l'accueil : générer, dessiner, mes circuits ---- */
// (17/11, Kiki : « on peut faire 5 km ? et des routes de 50 km, avec les tronçons ») la longueur au curseur, par crans : fins au début, larges ensuite.
// Une boucle est construite d'un bloc : 8 km au plus ; de A à B, le monde se construit autour de soi (moteur/troncons.js) : 50 km.
const PAS_KM = [1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50];
const PAS_PIED = [.5, .75, 1, 1.25, 1.5];   // (étape 13, lot 3) une ville à pied : des km de tes jambes (le décor en fait une fois et demie plus)
const PAS_VELO = [1.5, 2, 2.5, 3, 3.5, 4];   // (étape 15, lot 1b) ville et campagne à vélo : la vraie distance
const PAS_ILE = [1.5, 2, 2.5, 3], ilePossible = G => G.activite === "eau" && MACHINE_NOM === "rameur", enIle = G => G.style === "ile" && ilePossible(G);   // (étape 15, lot 3b-1) au rameur : le tour d'une île
const pasKm = G => enIle(G) ? PAS_ILE : enVelo(G) ? PAS_VELO : G.style === "pied" && piedPossible(G) ? PAS_PIED : PAS_KM;
const kmMax = G => enIle(G) ? PAS_ILE.length - 1 : enVelo(G) ? PAS_VELO.length - 1 : G.style === "pied" && piedPossible(G) ? PAS_PIED.reduce((m, k, i) => !VISUEL || k * MACHINE.allure * 1.08 < 3.7 ? i : m, 0) : PAS_KM.indexOf(G.forme === "ouvert" ? 50 : 8);
/* (18/11, Kiki) au marcheur elliptique, le générateur peut faire un footing : des trottoirs, une ruelle, un escalier, un parc, un sentier, une passerelle (style « pied ») */
const piedPossible = G => G.activite === "terre" && MACHINE_NOM === "elliptique";
const veloPossible = G => G.activite === "terre" && MACHINE_NOM === "velo", enVelo = G => (G.style === "velo" || G.style === "quais") && veloPossible(G), styleDe = G => enIle(G) || enVelo(G) ? G.style : piedPossible(G) ? (G.style === "velo" || G.style === "quais" ? "pied" : G.style) : undefined;   // (étape 15, lot 1b) à la machine vélo : « Ville et campagne », ou la route d'avant
const kmDecor = G => G.style === "pied" && piedPossible(G) && typeof VISUEL !== "undefined" && VISUEL ? +(G.km * MACHINE.allure * 1.08).toFixed(2) : G.km;   // un tour de 1 km au trot = ~1,5 km de décor (1,08 : l'allure d'une ville, villes.js)
const texteKm = km => String(km).replace(".", ",") + " km";
const dureeKm = km => { const v = typeof vitesseHabituelle === "function" ? vitesseHabituelle() : 3.6, m = Math.round(km * 1000 / Math.max(.5, v) / 60); return " ≈ " + (m >= 90 ? Math.floor(m / 60) + " h " + String(m % 60).padStart(2, "0") : m + " min") + " à ton allure"; };
const puces = (cle, v, liste) => `<div class="ed-puces">${liste.map(([k, t]) => `<button class="ed-puce${String(v) === String(k) ? " on" : ""}" data-gk="${cle}" data-gv="${esc(k)}">${t}</button>`).join("")}</div>`;
const CASES_GEN = {
  pied: [["village", "🏘️", "La ville"], ["escalier", "🪜", "Un escalier"], ["parc", "🌳", "Un parc"], ["foret", "🌲", "Un sentier en forêt"], ["champs", "🌾", "Les champs"], ["pont", "🌉", "Une passerelle"]],   // (18/11) le footing
  eau: [["port", "⚓", "Un port"], ["village", "🏘️", "Un village"], ["lac", "🏞️", "Un lac"], ["foret", "🌲", "Un sous-bois"], ["marais", "🪷", "Un marais"], ["plage", "🏖️", "Une plage"], ["cascade", "💦", "Une cascade"], ["grotte", "🕳️", "Une grotte"], ["pont", "🌉", "Un pont"], ["ronflex", "😴", "Ronflex"], ["fourche", "⑂", "Des rapides"]],
  terre: [["village", "🏘️", "Un village"], ["foret", "🌲", "Un sous-bois"], ["champs", "🌾", "Des champs"], ["montagne", "⛰️", "Un col"], ["volcan", "🌋", "Un volcan"], ["tunnel", "🚇", "Un tunnel"], ["pont", "🌉", "Un pont"], ["ronflex", "😴", "Ronflex"], ["fourche", "⑂", "Un chemin à bosses"], ["rondpoint", "🔄", "Un rond-point"], ["echangeur", "🛣️", "Un échangeur"]]};
function edAccueil() {
  ED.vue = "accueil"; $("edAtelier").hidden = true; $("edAccueil").hidden = false; edTete();
  const G = ED.gen, terre = G.activite === "terre", brouillon = lireReglage(ED_CLE, null), bonBrouillon = brouillon && Array.isArray(brouillon.pieces) && disciplineDe(brouillon) === G.activite;
  const persos = Object.entries(CIRCUITS_PERSO).filter(([k, c]) => disciplineDe(c) === G.activite), jeu = Object.entries(NIVEAUX).filter(([k, c]) => !c.cache && !c.jour && disciplineDe(c) === G.activite);
  const pour = {rameur: "au rameur", elliptique: "au marcheur elliptique", velo: "à vélo"}[MACHINE_NOM] || "";
  if (piedPossible(G) && G.style === undefined) G.style = MACHINE.monture === "trotteur" ? "pied" : "route";
  if (veloPossible(G) && G.style !== "route" && G.style !== "quais") G.style = "velo"; if (piedPossible(G) && (G.style === "velo" || G.style === "quais")) G.style = MACHINE.monture === "trotteur" ? "pied" : "route";
  if (ilePossible(G)) { if (G.style !== "riviere") G.style = "ile"; } else if (G.style === "ile" || G.style === "riviere") G.style = undefined;
  const ile = enIle(G), velo = enVelo(G), pied = piedPossible(G) && G.style === "pied";
  if (ile) { if (!PAS_ILE.includes(G.km)) G.km = 2; if (![.34, .5, .75].includes(G.nature)) G.nature = .5; G.sinueux = G.sinueux ? 1 : 0; if (G.sorte === "coteau") G.sorte = ""; }
  if (velo && !G.avecVelo) { G.avecVelo = true; G.km = 2.5; G.denivele = 15; G.nature = .5; }
  if (velo) { if (!PAS_VELO.includes(G.km)) G.km = 2.5; if (![0, 15, 35].includes(+G.denivele)) G.denivele = 15; if (![.34, .5, .75].includes(G.nature)) G.nature = .5; G.sinueux = G.sinueux ? 1 : 0; if (G.sorte === "coteau") G.sorte = ""; }
  else if (pied && ![0, .5, .7].includes(G.nature)) G.nature = .5;
  if (pied && !G.avecPied) { G.avecPied = true; G.denivele = 12; Object.assign(G.avec, {village: true, escalier: true, parc: true, foret: true, champs: true, pont: true}); if (G.forme === "huit") G.forme = "boucle"; }
  if (pied && (!PAS_PIED.includes(G.km) || PAS_PIED.indexOf(G.km) > kmMax(G))) G.km = PAS_PIED[Math.min(2, kmMax(G))]; if (!pied && !velo && !ile && !PAS_KM.includes(G.km)) G.km = 2; if (pied && ![0, 12, 25].includes(+G.denivele)) G.denivele = 12; if (pied && G.nature === undefined) G.nature = .5;
  $("edAccueil").innerHTML = `<div class="ed-acc">
    <section class="ed-bloc ed-gen"><h2>🎲 Générer un circuit</h2><p class="ed-note">Dis ce que tu veux, je le dessine ${pour}${pied || velo || ile ? " : je n'en garde que ce qui passe tous mes contrôles" : " : je garde le mieux noté de plusieurs essais"}.</p>
      ${piedPossible(G) ? `<div class="ed-q">Où tu cours</div>${puces("style", G.style, [["pied", "À pied"], ["route", "Sur la route"]])}` : ""}
      ${veloPossible(G) ? `<div class="ed-q">Où tu roules</div>${puces("style", G.style, [["velo", "Ville et campagne"], ["quais", "Au bord de l'eau"], ["route", "Sur la route"]])}` : ""}
      ${ilePossible(G) ? `<div class="ed-q">Où tu rames</div>${puces("style", G.style, [["ile", "Autour d'une île"], ["riviere", "Sur une rivière"]])}` : ""}
      ${velo || ile ? `<div class="ed-q">Longueur <b class="ed-km" id="edKm">${texteKm(G.km)}</b><small id="edKmT">${dureeKm(G.km)}</small></div>
      <div class="ed-curseur"><span>1,5 km</span><input type="range" id="edKmR" min="0" max="${kmMax(G)}" step="1" value="${pasKm(G).indexOf(G.km)}"><span>${ile ? 3 : 4} km</span></div>
      <div class="ed-q">Le décor</div>${puces("nature", G.nature, [[.34, "Surtout la ville"], [.5, "Moitié-moitié"], [.75, ile ? "Surtout la nature" : "Surtout la campagne"]])}
      <div class="ed-deux">${ile ? "" : `<div><div class="ed-q">Relief</div>${puces("denivele", G.denivele, [[0, "Plat"], [15, "Vallonné"], [35, "Ça grimpe"]])}</div>`}
      <div><div class="ed-q">Ça tourne</div>${puces("sinueux", G.sinueux, [[0, ile ? "Calme" : "Tranquille"], [1, "Sinueux"]])}</div></div>
      <div class="ed-q">La ville</div>${puces("sorte", G.sorte || "", [["", "Surprise"], ["bourg", "Vieux bourg"], ["pavillons", "Pavillons"], ["immeubles", "Immeubles"]])}
      <small class="ed-aide">${ile ? "Une île tirée au sort, jamais deux fois la même : tu en fais le tour par ses deux bras, entre les vieilles maisons, les quais, les jardins, les saules et les champs." : G.style === "quais" ? "Une rivière tirée au sort, jamais deux fois la même : ses quais, ses ponts, sa vieille ville, le chemin de halage, puis la campagne." : "Une boucle tirée au sort, jamais deux fois la même : la ville, ses commerces, ses parcs, puis la campagne par les petites routes, les chemins et les sentiers. Pour un col ou une longue route : « Sur la route »."}</small>` : pied ? `<div class="ed-q">Longueur <b class="ed-km" id="edKm">${texteKm(G.km)}</b><small id="edKmT">${dureeKm(G.km)}</small></div>
      <div class="ed-curseur"><span>0,5 km</span><input type="range" id="edKmR" min="0" max="${kmMax(G)}" step="1" value="${PAS_PIED.indexOf(G.km)}"><span>${texteKm(PAS_PIED[kmMax(G)])}</span></div>
      <div class="ed-q">Le décor</div>${puces("nature", G.nature, [[0, "Tout en ville"], [.5, "Moitié-moitié"], [.7, "Surtout la nature"]])}
      <div class="ed-q">Relief</div>${puces("denivele", G.denivele, [[0, "Plat"], [12, "Vallonné"], [25, "Ça grimpe"]])}
      <div class="ed-q">La ville</div>${puces("sorte", G.sorte || "", [["", "Surprise"], ["bourg", "Vieux bourg"], ["pavillons", "Pavillons"], ["immeubles", "Immeubles"], ["coteau", "Sur un coteau"]])}
      <small class="ed-aide">Une ville tirée au sort, jamais deux fois la même : des rues qui tournent et qui grimpent, une placette, un jardin, des passages, un escalier quand ça monte.${G.nature ? " On en sort par le bout d'une rue : des prés, des vergers, un bois et sa clairière, puis on revient." : ""}</small>` : `<div class="ed-q">Forme</div>${puces("forme", G.forme === "huit" && (!terre || pied) ? "boucle" : G.forme, [["boucle", "Une boucle (des tours)"], ["ouvert", "De A à B"]].concat(terre && !pied ? [["huit", "Un 8"]] : []))}
      <div class="ed-q">Longueur <b class="ed-km" id="edKm">${texteKm(G.km)}</b><small id="edKmT">${dureeKm(G.km)}</small></div>
      <div class="ed-curseur"><span>1 km</span><input type="range" id="edKmR" min="0" max="${kmMax(G) }" step="1" value="${PAS_KM.indexOf(G.km)}"><span>${PAS_KM[kmMax(G)]} km</span></div>
      ${G.forme === "ouvert" ? "" : `<small class="ed-aide">Une boucle va jusqu'à ${PAS_KM[kmMax(G)]} km ; « De A à B » va jusqu'à 50 km (le monde se construit autour de toi au fil de la route).</small>`}
      <div class="ed-deux"><div><div class="ed-q">Virages</div>${puces("virages", G.virages, [["droit", "Presque droit"], ["quelques", "Quelques-uns"], ["sinueux", "Sinueux"], ["tres", "Très sinueux"]])}</div>
      <div><div class="ed-q">Relief</div>${puces("denivele", G.denivele, pied ? [[0, "Plat"], [15, "Vallonné"], [35, "Ça grimpe"]] : terre ? [[0, "Plat"], [40, "Vallonné"], [120, "Montagneux"], [250, "Un col"]] : [[0, "Plat"], [20, "Vallonné"], [50, "Montagneux"]])}</div></div>
      <div class="ed-q">Ce que tu veux y voir</div>
      <div class="ed-tuiles">${CASES_GEN[pied ? "pied" : terre ? "terre" : "eau"].map(([k, ic, t]) => `<button class="ed-tuile${G.avec[k] ? " on" : ""}" data-avec="${k}"><i>${ic}</i>${t}</button>`).join("")}</div>`}
      <button class="rouge ed-grand" data-act="generer">▶ Générer mon circuit</button><p class="ed-msg" id="edMsg">${esc(ED.msg)}</p></section>
    <div class="ed-col">
      <section class="ed-bloc"><h2>✏️ Le dessiner</h2><p class="ed-note">Pièce par pièce, sur le plan : un virage, une ligne droite, un lac, une grotte…</p>
        <div class="ed-liste2">${bonBrouillon ? `<button class="ed-ligne fort" data-act="reprendre"><b>Reprendre mon brouillon</b><small>${esc(brouillon.nom || "")}</small></button>` : ""}
        <button class="ed-ligne" data-act="vide"><b>Partir de zéro</b><small>un départ, un virage, le retour</small></button>
        ${jeu.map(([k, c]) => `<button class="ed-ligne" data-copie="${esc(k)}"><b>Partir de « ${esc(c.nom || k)} »</b><small>une copie, à retoucher</small></button>`).join("")}</div></section>
      ${persos.length ? `<section class="ed-bloc"><h2>📁 Mes circuits</h2><div class="ed-liste2">${persos.map(([k, c]) => `<div class="ed-perso"><b>${esc(c.nom || k)}</b><button data-ouvre="${esc(k)}">✏️ Retoucher</button><button data-joue="${esc(k)}">▶ Jouer</button><button class="ed-x" data-efface="${esc(k)}" title="Le supprimer">${ED.effacer === k ? "Sûr ?" : "🗑"}</button></div>`).join("")}</div></section>` : ""}
    </div></div>`;
}

/* ---- générer sans jamais laisser en plan (17/11, Kiki : « on me demande ce que je veux, je coche tout, et ça me dit non ; je ne sais même pas
   ce qui bloque ») : si le tirage échoue, on réessaie tout seul en assouplissant, dans cet ordre : le 8 devient une boucle, un cran de virages
   en moins, puis on retire un à un les éléments les plus difficiles à caser ; on dit ce qui a changé. L'effort suit la longueur (une longue route
   est vite tracée, mais habiller ses rives et contrôler tout son sol prendrait des minutes). ---- */
const NOMS_LIEUX = {placette: "une placette", jardin: "un jardin", parc: "un parc", ruelle: "un passage entre deux murs", escalier: "un escalier", "belvédère": "un belvédère", bois: "un bois", "clairière": "une clairière", hameau: "un hameau", champs: "des champs", lande: "une lande", verger: "un verger", "étang": "un étang", potagers: "des potagers", "piste cyclable": "une piste cyclable", quais: "des quais", ponts: "des ponts", halage: "un chemin de halage"};   // ce que traverse une ville tirée au sort (villes.js)
Object.assign(NOMS_LIEUX, NOMS_PAYSAGES);
const DIFFICILES = ["escalier", "echangeur", "fourche", "montagne", "tunnel", "rondpoint", "pont", "grotte", "cascade", "port", "village", "volcan", "marais", "plage", "lac", "ronflex", "champs", "foret"];
const NOMS_AVEC = Object.fromEntries([].concat(CASES_GEN.eau, CASES_GEN.terre, CASES_GEN.pied).map(([k, , t]) => [k, t.toLowerCase()]));
function effortDe(G) { const km = +G.km || 1; return km <= 4 ? {} : km <= 8 ? {tirages: 3} : {tirages: km > 20 ? 1 : 2, habiller: false, sol: false}; }
function genererSouple(G0, dire, fin) {
  const changes = [], cran = {tres: "sinueux", sinueux: "quelques", quelques: "droit"};
  if (G0.forme === "ouvert" && +G0.km > 6 && G0.avec && G0.avec.fourche) { G0 = Object.assign({}, G0, {avec: Object.assign({}, G0.avec, {fourche: false})}); changes.push("Sans fourche : au-delà de 6 km, la route se construit au fil du chemin, ce qu'une fourche empêche."); }
  const essais = [[Object.assign({}, G0), changes.join(" ")]];
  let G = Object.assign({}, G0, {avec: Object.assign({}, G0.avec)});
  if (G.forme === "huit") { G = Object.assign({}, G, {forme: "boucle", boucle: true, km: Math.min(+G.km || 2, 8)}); changes.push("Le 8 ne se croisait pas proprement : je t'ai fait une boucle."); essais.push([G, changes.join(" ")]); }
  if (cran[G.virages]) { G = Object.assign({}, G, {virages: cran[G.virages]}); changes.push("Un peu moins de virages."); essais.push([G, changes.join(" ")]); }
  const retires = [];
  for (const k of DIFFICILES) if (G.avec[k]) { G = Object.assign({}, G, {avec: Object.assign({}, G.avec, {[k]: false})}); retires.push(NOMS_AVEC[k] || k); essais.push([G, changes.concat("Sans : " + retires.join(", ") + " (je n'arrivais pas à tout caser).").join(" ")]); }
  if (["pied", "velo", "quais", "ile"].includes(G0.style)) {   // (étape 13, lot 3) une ville : rien à retirer ; si aucune ne tient, on en cherche d'autres, puis le relief qu'on peut. Par petits lots : la page reste vivante
    essais.length = 0; essais.push([G0, ""], [Object.assign({}, G0, {graine: (+G0.graine || 1) + 9001}), ""], [Object.assign({}, G0, {graine: (+G0.graine || 1) + 18002, sorte: ""}), "Je n'ai pas réussi à caser ce genre de ville : en voici une autre."], [Object.assign({}, G0, {graine: (+G0.graine || 1) + 27003, sorte: "", denivele: 0}), "Je n'ai pas réussi avec ce relief : celle-ci est plate."]); }
  let i = 0, k0 = 0;
  const suivant = () => { const [o, change] = essais[i];
    if (["pied", "velo", "quais", "ile"].includes(G0.style)) { const quoi = G0.style === "quais" || G0.style === "ile" ? "Je fais couler une rivière…" : G0.style === "velo" ? "Je dessine ta boucle…" : "Je dessine ta ville…"; dire(i || k0 ? quoi + " (essai " + (i * 400 + k0) + ")" : quoi);
      setTimeout(() => { const r = genererCircuit(Object.assign({}, o, {k0, tranche: 8})); if (r.suite) { k0 = r.suite; suivant(); } else if (!r.erreur) { r.change = change; fin(r); } else { k0 = 0; if (++i < essais.length) suivant(); else fin({erreur: "Je n'ai vraiment rien trouvé : essaie une autre longueur."}); } }, 30); return; }
    dire(i === 0 ? (+o.km > 8 ? "Je trace ta route…" : "Je dessine ton circuit…") : "Je cherche autrement…");
    setTimeout(() => { const r = genererCircuit(Object.assign({}, o, effortDe(o), i ? {essais: 30} : {}));   // (un essai assoupli cherche moins longtemps)
      if (!r.erreur) { r.change = change; fin(r); return; }
      if (++i < essais.length) suivant(); else fin({erreur: "Je n'ai vraiment rien trouvé, même en simplifiant : essaie une autre longueur."}); }, 40); };
  suivant();
}

/* ---- l'atelier : la pièce choisie en premier, le reste replié ---- */
const champ = (nom, cle, v, min, max, pas, unite = "") => `<label class="ed-l"><span>${nom}</span><button data-pm="${cle}" data-d="${-pas}">−</button><input type="range" data-k="${cle}" min="${min}" max="${max}" step="${pas}" value="${v}"><button data-pm="${cle}" data-d="${pas}">+</button><b data-v="${cle}">${v}${unite}</b></label>`;
const choix = (nom, cle, v, liste) => `<label class="ed-l"><span>${nom}</span><select data-k="${cle}">${liste.map(([k, t]) => `<option value="${esc(k)}"${String(v) === String(k) ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;
const pli = (cle, titre, corps) => `<details class="ed-pli" data-pli="${cle}"${ED.plis[cle] ? " open" : ""}><summary>${titre}</summary><div class="ed-form">${corps}</div></details>`;
const nomPiece = (q, i) => q.fourche ? "⑂ " + q.fourche : q.nom || (q.raccord ? "Le retour" : "Pièce " + (i + 1));
function edPanneau() {
  if (ED.vue !== "atelier") return;
  const n = ED.n, B = region(n.biome), el = $("edCote"), P = n.pieces, p = P[ED.sel] || P[0], terre = disciplineDe(n) === "terre";
  const fin = `<div class="ed-bas">${ED.depuisGen ? `<button data-act="autre">🎲 Générer une autre</button>` : ""}<button class="ed-lien" data-act="garder">💾 Garder sans l'essayer</button></div>`, avance = pli("avance", "Avancé : exporter, importer", `<textarea id="edTexte" rows="5" placeholder="Le texte d'un circuit"></textarea>
    <div class="ed-icones"><button data-act="exporter">Exporter</button><button data-act="importer">Importer ce texte</button>${location.hostname === "localhost" || location.hostname === "127.0.0.1" ? `<button data-act="ecrire">Écrire dans le jeu (PC)</button>` : ""}</div>`);
  if (n.zone) {   // (étape 13, lot 3) une ville se tire d'un bloc : on ne la retouche pas pièce par pièce (le parcours quitterait le trottoir)
    const rues = [...new Set(P.map(q => q.nom).filter(Boolean))];
    el.innerHTML = `<div class="ed-piece"><p class="ed-note">${esc(({bourg: "Un vieux bourg", pavillons: "Un quartier de pavillons", immeubles: "Un quartier d'immeubles", coteau: "Un quartier sur un coteau"})[n.zone.eaux ? "" : n.sorte] || (n.zone.rame ? "Une île entre deux bras de rivière" : n.zone.eaux ? "Une ville au bord de l'eau" : "Une ville"))}${(n.traverse || []).length ? " : tu y traverses " + esc(n.traverse.map(q => NOMS_LIEUX[q] || q).join(", ")) : ""}.</p><p class="ed-note">${esc(rues.join(" · "))}</p></div>`
      + pli("circuit", "Le circuit (heure, temps)", choix("Heure prévue", "n:heure", n.heure || "jour", HEURES_MENU.filter(x => x[0] !== "circuit")) + choix("Temps prévu", "n:meteo", n.meteo || "beau", METEOS_MENU.filter(x => x[0] !== "circuit"))) + avance + fin;
    return; }
  const rives = Object.keys(B.rives).filter(k => terre ? B.rives[k].pour === "terre" || k === "montagne" : !B.rives[k].pour).map(k => [k, k]);   // les rives de l'activité (plus la montagne, pour un tunnel)
  let h = `<div class="ed-piece"><div class="ed-ptete"><button data-act="prec" title="La pièce d'avant">◀</button><b>${esc(nomPiece(p, ED.sel))}<small>pièce ${ED.sel + 1} sur ${P.length}${p.raccord ? " · referme la boucle toute seule" : ""}</small></b><button data-act="suiv" title="La pièce d'après">▶</button></div>`;
  if (p.fourche) h += `<p class="ed-note">Une fourche : deux voies qui se rejoignent, la voie « force » se prend en forçant. Ses pièces se retouchent dans « Avancé » (exporter, modifier le texte, importer).</p>`;
  else if (p.raccord) h += champ("Rayon des virages", "rayon", p.rayon || 30, 12, 80, 2, " m");
  else h += champ("Longueur", "long", p.long, 3, 400, 5, " m") + champ("Virage", "virage", p.virage === "auto" ? 0 : p.virage || 0, -180, 180, 5, "°")
    + `<div class="ed-rapides">${[[-90, "↰ 90°"], [-45, "↖ 45°"], [0, "↑ droit"], [45, "↗ 45°"], [90, "↱ 90°"]].map(([v, t]) => `<button data-virage="${v}">${t}</button>`).join("")}</div>`;
  if (!p.fourche) h += champ("Largeur", p.large !== undefined ? "large" : "eau", p.large !== undefined ? p.large : p.eau, 5, 40, 1, " m") + champ("Montée", "monte", typeof p.monte === "number" ? p.monte : 0, -10, 10, .5, " m");
  h += `<div class="ed-icones"><button data-act="haut" title="La mettre avant la précédente">↑ Avant</button><button data-act="bas" title="La mettre après la suivante">↓ Après</button><button data-act="double">⧉ Doubler</button><button data-act="retire">🗑 Retirer</button></div></div>`;
  h += `<div class="ed-ajout"><button class="ed-plusgros${ED.ajout ? " on" : ""}" data-act="ajout">＋ Ajouter une pièce après celle-ci</button>${ED.ajout ? `<div class="ed-mods">${Object.entries(MODULES).filter(([k, m]) => (m.act || "eau") === disciplineDe(n)).map(([k, m]) => `<button data-mod="${k}">${m.nom}</button>`).join("")}</div>` : ""}</div>`;
  if (!p.fourche) {
    let plus = `<label class="ed-l"><span>Nom</span><input type="text" data-k="nom" value="${esc(p.nom)}" placeholder="(la suite de la pièce d'avant)"></label>`
      + choix("Rive gauche", "g", p.g, rives) + choix("Rive droite", "d", p.d, rives)
      + `<div class="ed-coches"><label><input type="checkbox" data-c="monte_auto"${p.monte === "auto" ? " checked" : ""}> revient à la hauteur du départ</label><label><input type="checkbox" data-c="net"${p.net ? " checked" : ""}> pente nette (chute, tremplin)</label></div>`;
    if (!p.raccord) plus += choix("Grotte", "tunnel", p.tunnel === true ? "roche" : p.tunnel || "", [["", "non"]].concat(Object.keys(Object.assign({roche: {}}, B.grottes)).map(k => [k, k])))
      + choix("Pont", "pont", p.pont === true ? "pierre" : p.pont || "", [["", "non"], ["pierre", "pierre"], ["bois", "bois"], ["arches", "arches dorées"]])
      + (p.pont ? champ("Ravin dessous", "ravin", p.ravin || 0, 0, 14, 1, " m") : "");
    plus += choix("Surface", "surface", p.surface || "", terre ? [["", "celle du circuit"], ["terre", "chemin de terre"], ["goudron", "route goudronnée"], ["paves", "rue pavée"], ["marches", "escalier (à pied)"]] : [["", "celle du circuit"], ["eau", "eau"]].concat(Object.keys(B.eaux || {}).map(k => [k, "eau : " + k])))
      + choix("Ambiance", "ambiance", p.ambiance || "", [["", "aucune"]].concat(Object.keys(AMBIANCES).filter(k => k !== "grotte").map(k => [k, k])))
      + champ("Vitesse du décor", "allure", p.allure || 1, .6, 1.6, .05, " ×")
      + `<label class="ed-l"><span>Segment chronométré</span><input type="text" data-k="segment" value="${esc(p.segment)}" placeholder="(aucun)"></label>`;
    const lieux = Object.keys(LIEUX_TOUS[n.lieux] || LIEUX_TOUS[n.biome] || {}).filter(k => k !== "note"), L = (p.lieux || [])[0];
    if (!p.raccord && lieux.length) plus += choix("Lieu", "lieu", L ? L.lieu + "|" + L.cote : "", [["", "aucun"]].concat(lieux.flatMap(k => [[k + "|g", k + " (à gauche)"], [k + "|d", k + " (à droite)"]])));
    plus += `<div class="ed-objets"><span>Objets posés à la main</span>${(p.objets || []).map((o, i) => `<div class="ed-obj"><b>${esc(o.o)}${o.num ? " n° " + o.num : ""}${o.texte ? " « " + esc(o.texte) + " »" : ""}</b>
        <select data-ok="${i}" data-oc="cote">${[["g", "gauche"], ["d", "droite"], ["c", "sur la piste"], ["portail", "sur la grotte"]].map(([k, t]) => `<option value="${k}"${o.cote === k ? " selected" : ""}>${t}</option>`).join("")}</select>
        <input type="number" data-ok="${i}" data-oc="a" value="${o.a === undefined ? "" : o.a}" title="mètres depuis le début de la pièce"><input type="number" data-ok="${i}" data-oc="e" value="${o.e === undefined ? "" : o.e}" title="mètres depuis le bord"><button data-oretire="${i}">×</button></div>`).join("")}
      <div class="ed-obj"><select id="edObj">${Object.keys(OBJETS).sort().map(k => `<option>${k}</option>`).join("")}</select><input type="number" id="edNum" placeholder="n° Pokémon" title="pour un Pokémon : son numéro"><button data-act="objet">+ Poser</button></div>
      <small>côté · mètres depuis le début de la pièce · mètres depuis le bord</small></div>`;
    h += pli("plus", "Plus de réglages pour cette pièce", plus);
  }
  const loin = Object.keys(LOINTAINS);
  h += pli("circuit", "Le circuit (forme, heure, temps, décor)", choix("Forme", "n:boucle", n.boucle === "huit" ? "huit" : n.boucle ? "boucle" : "ouvert", [["boucle", "une boucle (des tours)"], ["ouvert", "un parcours de A à B"]].concat(terre ? [["huit", "un 8 (un carrefour)"]] : []))
    + (terre ? choix("Revêtement", "n:surface", n.surface || "terre", [["terre", "chemin de terre"], ["goudron", "route goudronnée"], ["paves", "rue pavée"]]) : "")
    + choix("Heure prévue", "n:heure", n.heure || "jour", HEURES_MENU.filter(x => x[0] !== "circuit")) + choix("Temps prévu", "n:meteo", n.meteo || "beau", METEOS_MENU.filter(x => x[0] !== "circuit"))
    + (Object.keys(BIOMES).length > 2 ? choix("Région", "n:biome", n.biome, Object.keys(BIOMES).filter(k => terre ? /routes/.test(k) : !/routes/.test(k)).map(k => [k, BIOMES[k].nom || k])) : "")
    + `<label class="ed-l"><span>Le décor</span><button data-act="graine">🎲 Tirer un autre décor</button></label>`
    + champ("Élan avant la ligne", "n:elan", n.elan === undefined ? 120 : n.elan, 0, 200, 10, " m")
    + `<div class="ed-objets"><span>Repères au loin</span>${(n.lointain || []).map((o, i) => `<div class="ed-obj"><b>${esc(o.o)}</b><input type="number" data-lk="${i}" value="${o.cap || 0}" title="cap, en degrés : 0 = droit devant au départ, 90 = à droite"><button data-lretire="${i}">×</button></div>`).join("")}
      <div class="ed-obj"><select id="edLoin">${loin.map(k => `<option>${k}</option>`).join("")}</select><button data-act="loin">+ Ajouter</button></div><small>cap en degrés : 0 = droit devant au départ, 90 = à droite, 180 = derrière</small></div>`);
  h += pli("note", `La note en détail${ED.note ? " : " + ED.note.note + " / 100" : ""}`, `<div id="edNote">${edNoteHTML()}</div>`);
  h += avance + fin.replace("une autre", "un autre");
  el.innerHTML = h;
}

/* ---- les gestes ---- */
function edPiece() { return ED.n ? ED.n.pieces[ED.sel] : null; }   // à l'accueil, pas encore de circuit (le curseur de longueur déclenchait l'erreur)
function edRegler(cle, v) {   // un réglage change : cle = un champ de la pièce, ou « n:… » (le circuit), « g:… » (le générateur)
  const n = ED.n, p = edPiece(), num = x => Math.round(+x * 100) / 100;
  if (cle.startsWith("g:")) { const k = cle.slice(2), G = ED.gen; if (k === "km" || k === "denivele") G[k] = +v; else if (k === "forme") { G.forme = v; G.boucle = v !== "ouvert"; } else G[k] = v; return k === "activite"; }
  if (cle.startsWith("n:")) { const k = cle.slice(2);
    if (k === "boucle" && v === "huit") { n.boucle = "huit"; n.pieces = n.pieces.filter(q => !q.raccord); n.pieces.forEach(q => { if (q.virage === "auto") q.virage = 0; }); n.pieces[n.pieces.length - 1].virage = "auto"; ED.sel = Math.min(ED.sel, n.pieces.length - 1); return true; }   // un 8 : la dernière pièce prend le virage qui annule les autres
    if (k === "boucle") { if (v === "boucle") { if (n.boucle === "huit") n.pieces.forEach(q => { if (q.virage === "auto") q.virage = 0; }); n.boucle = "gauche"; if (!n.pieces.some(q => q.raccord || q.virage === "auto")) n.pieces.push(disciplineDe(n) === "terre" ? {nom: "Le retour", raccord: true, rayon: 34, large: 8, g: "bas_cote", d: "bas_cote", monte: "auto"} : {nom: "Le retour", raccord: true, rayon: 30, eau: 12, g: "pre", d: "pre", monte: "auto"}); } else { delete n.boucle; n.pieces = n.pieces.filter(q => !q.raccord); ED.sel = Math.min(ED.sel, n.pieces.length - 1); } return true; }
    if (k === "discipline") { if (v === "terre") { n.discipline = "terre"; n.biome = REGION_TERRE(n.biome); n.surface = n.surface && n.surface !== "eau" ? n.surface : "goudron"; } else { delete n.discipline; delete n.surface; n.biome = n.biome.replace(/-routes$/, ""); if (n.boucle === "huit") n.boucle = "gauche"; } return true; }
    if (k === "elan") n.elan = +v; else if (v === "" || v === "jour" && k === "heure" || v === "beau" && k === "meteo") delete n[k]; else n[k] = v;
    return k === "biome"; }
  if (!p) return false;
  if (cle === "tunnel") { if (v) { p.tunnel = v === "roche" ? true : v; delete p.pont; delete p.ravin; } else delete p.tunnel; return true; }
  if (cle === "pont") { if (v) { p.pont = v === "pierre" ? true : v; delete p.tunnel; } else { delete p.pont; delete p.ravin; } return true; }
  if (cle === "lieu") { if (v) { const [lieu, cote] = v.split("|"); p.lieux = [{lieu, cote, a: 10}]; const L = (LIEUX_TOUS[n.lieux] || LIEUX_TOUS[n.biome] || {})[lieu]; if (L && p.long < L.long + 30) p.long = L.long + 30; } else delete p.lieux; return true; }
  if (["nom", "segment", "surface", "ambiance", "g", "d", "fourche", "annonce"].includes(cle)) { if (cle === "fourche" && v === "") return false; if (v === "") delete p[cle]; else p[cle] = v; return false; }
  if (cle === "monte") { if (+v === 0) delete p.monte; else p.monte = num(v); return false; }
  if (cle === "allure") { if (+v === 1) delete p.allure; else p.allure = num(v); return false; }
  if (cle === "ravin") { if (+v === 0) delete p.ravin; else p.ravin = num(v); return false; }
  p[cle] = num(v); return false;
}
$("editeur").addEventListener("input", e => {   // pendant qu'on glisse un curseur : le plan suit, le panneau ne bouge pas
  const t = e.target;
  if (t.id === "edKmR") { ED.gen.km = pasKm(ED.gen)[+t.value]; $("edKm").textContent = texteKm(ED.gen.km); $("edKmT").textContent = dureeKm(ED.gen.km); return; }
  if (t.dataset.k && t.type === "range") { edRegler(t.dataset.k, t.value); const b = $("edCote").querySelector(`[data-v="${t.dataset.k}"]`); if (b) b.textContent = t.value + b.textContent.replace(/^[-0-9.,]+/, ""); edChange(); }
});
$("editeur").addEventListener("toggle", e => { const d = e.target.closest && e.target.closest("details[data-pli]"); if (d) ED.plis[d.dataset.pli] = d.open; }, true);   // un pli ouvert le reste
$("editeur").addEventListener("change", e => {
  const t = e.target, d = t.dataset, n = ED.n, p = edPiece();
  if (d.k) { if (edRegler(d.k, t.value) || t.tagName === "SELECT") edTout(); else { edChange(); if (d.k === "nom") edPanneau(); } }
  else if (d.n) { n[d.n] = t.value; if (d.n === "nom" && !CIRCUITS_PERSO[n.id]) n.id = idDe(t.value); edChange(); }
  else if (d.c === "monte_auto") { if (t.checked) p.monte = "auto"; else delete p.monte; edTout(); }
  else if (d.c === "net") { if (t.checked) p.net = true; else delete p.net; edTout(); }
  else if (d.ok !== undefined) { const o = p.objets[+d.ok]; if (d.oc === "cote") o.cote = t.value; else if (t.value === "") delete o[d.oc]; else o[d.oc] = +t.value; edChange(); }
  else if (d.lk !== undefined) { n.lointain[+d.lk].cap = +t.value || 0; edChange(); }
});
$("editeur").addEventListener("click", e => {
  const t = e.target.closest("button"); if (!t) return;
  const d = t.dataset, n = ED.n, p = n && edPiece(); ED.msg = "";
  if (d.gk) { const G = ED.gen, v = d.gv; if (["km", "denivele", "nature", "sinueux"].includes(d.gk)) G[d.gk] = +v; else if (d.gk === "forme") { G.forme = v; G.boucle = v !== "ouvert"; if (pasKm(G).indexOf(G.km) > kmMax(G)) G.km = pasKm(G)[kmMax(G)]; } else G[d.gk] = v; edAccueil(); }
  else if (d.avec) { ED.gen.avec[d.avec] = !ED.gen.avec[d.avec]; t.classList.toggle("on", !!ED.gen.avec[d.avec]); }
  else if (d.pm) { const inp = $("edCote").querySelector(`input[data-k="${d.pm}"]`); inp.value = clamp(+inp.value + +d.d, +inp.min, +inp.max); edRegler(d.pm, inp.value); edTout(); }
  else if (d.virage !== undefined) { p.virage = +d.virage; edTout(); }
  else if (d.mod) { const avant = p || {eau: 11, g: "pre", d: "pre"}, morceau = MODULES[d.mod].pieces(hasard(Date.now() % 100000), {v: -45, eau: avant.raccord ? 11 : avant.large || avant.eau || 11, g: avant.g, d: avant.d, lieux: n.lieux || n.biome, terre: n.surface === "terre"});
    for (const q of morceau) { delete q.fixe; if (q.surface === undefined) delete q.surface; }
    const ou = p && p.raccord ? ED.sel : ED.sel + 1; n.pieces.splice(ou, 0, ...morceau); ED.sel = ou; ED.ajout = false; edTout(); }
  else if (d.oretire !== undefined) { p.objets.splice(+d.oretire, 1); if (!p.objets.length) delete p.objets; edTout(); }
  else if (d.lretire !== undefined) { n.lointain.splice(+d.lretire, 1); if (!n.lointain.length) delete n.lointain; edTout(); }
  else if (d.ouvre) edAtelier(CIRCUITS_PERSO[d.ouvre], false);
  else if (d.joue) { $("editeur").hidden = true; document.body.classList.remove("edite"); choisirCircuit(d.joue); }
  else if (d.efface) { if (ED.effacer !== d.efface) { ED.effacer = d.efface; edAccueil(); return; } ED.effacer = null; delete CIRCUITS_PERSO[d.efface]; ecrireReglage("riviere_circuits", CIRCUITS_PERSO); edAccueil(); }
  else if (d.copie) { const c = NIVEAUX[d.copie]; edAtelier(Object.assign({}, c, {id: idDe("copie de " + c.nom), nom: "Copie de " + c.nom}), false); }
  else if (d.act) edAction(d.act, t);
});
function edChoisirEn(e, cv, X) {   // toucher le plan ou le profil : on choisit la pièce sous le doigt
  const r = ED.res; if (!r || r.erreur) return; const P = r.PISTE, im = X(P, e.target.getBoundingClientRect()); if (im < 0) return;
  ED.sel = edIndex(P.pieces[P.PC[im]]); ED.ajout = false; edPlan(); edPanneau();
}
$("edPlan").addEventListener("pointerdown", e => edChoisirEn(e, $("edPlan"), (P, b) => { const V = ED.vuePlan; if (!V) return -1;
  const x = ((e.clientX - b.left) * devicePixelRatio - V.ox) / V.k, z = ((e.clientY - b.top) * devicePixelRatio - V.oz) / V.k; let mieux = 1e18, im = 0;
  for (let i = 0; i < P.N; i += 2) { const q = (P.X[i] - x) ** 2 + (P.Z[i] - z) ** 2; if (q < mieux) { mieux = q; im = i; } } return im; }));
$("edProfil").addEventListener("pointerdown", e => edChoisirEn(e, $("edProfil"), (P, b) => clamp(Math.round((e.clientX - b.left) / b.width * (P.N - 1)), 0, P.N - 1)));
function edAction(act, bouton) {
  const n = ED.n, P = n ? n.pieces : [], i = ED.sel, p = P[i];
  if (act === "retour") { if (ED.vue === "atelier") edAccueil(); else fermerEditeur(); return; }
  if (act === "generer" || act === "autre") {
    ED.gen.graine = Math.floor(Math.random() * 9000) + 1;   // un nouveau tirage à chaque fois
    bouton.disabled = true;
    genererSouple(Object.assign({}, ED.gen, {km: kmDecor(ED.gen), style: styleDe(ED.gen)}), t => { bouton.textContent = t; }, r => {
      if (r.erreur) { bouton.disabled = false; ED.msg = r.erreur; if (ED.vue === "accueil") edAccueil(); else { edEtat(); edPanneau(); } return; }
      edAtelier(r.niveau, true); ED.msg = (r.niveau.zone ? (r.niveau.zone.rame ? "Voici ton île" : r.niveau.zone.velo ? "Voici ta boucle" : "Voici ta ville") : "Voici ton circuit") + (r.niveau.plan ? ". " : r.niveau.zone ? " : " + (r.niveau.traverse || []).map(q => NOMS_LIEUX[q] || q).join(", ") + ". " : " (" + r.note.note + " / 100). ") + (r.change ? r.change + " " : "") + (r.niveau.zone ? "Essaie-la, ou génères-en une autre." : "Essaie-le, ou retouche-le en touchant le plan.")
        + (r.sol && !r.sol.ok ? " Son sol a une marche quelque part : « Générer un autre » peut l'éviter." : ""); edEtat(); });
    return; }
  if (act === "reprendre") { edAtelier(lireReglage(ED_CLE, null), false); return; }
  if (act === "vide") { const t = ED.gen.activite === "terre", b = t ? REGION_TERRE("kanto") : "kanto";
    edAtelier(t ? {id: idDe("mon circuit " + Math.floor(Math.random() * 900 + 100)), nom: "Mon circuit", biome: b, lieux: "kanto", discipline: "terre", surface: "goudron", graine: 3, boucle: "gauche", allure: 1, elan: 60,
        pieces: [{nom: "Le départ", long: 100, virage: 0, large: 8, g: "bas_cote", d: "bas_cote", objets: [{o: "ligne", cote: "c", a: 0}]}, {nom: "Premier virage", long: 80, virage: -90, large: 8, g: "champ", d: "bas_cote"}, {nom: "Le retour", raccord: true, rayon: 34, large: 8, g: "bas_cote", d: "bas_cote", monte: "auto"}]}
      : {id: idDe("mon circuit " + Math.floor(Math.random() * 900 + 100)), nom: "Mon circuit", biome: b, lieux: "kanto", graine: 3, nageur: 7, boucle: "gauche", allure: 1, elan: 60,
        pieces: [{nom: "Le départ", long: 100, virage: 0, eau: 12, g: "pre", d: "pre", objets: [{o: "ligne", cote: "c", a: 0}]}, {nom: "Premier virage", long: 80, virage: -90, eau: 11, g: "foret", d: "pre"}, {nom: "Le retour", raccord: true, rayon: 30, eau: 12, g: "pre", d: "pre", monte: "auto"}]}, false);
    return; }
  if (act === "prec" || act === "suiv") { ED.sel = (i + (act === "suiv" ? 1 : P.length - 1)) % P.length; ED.ajout = false; edPlan(); edPanneau(); return; }
  if (act === "ajout") { ED.ajout = !ED.ajout; edPanneau(); return; }
  if (act === "haut" && i > 0 && !p.raccord) { [P[i - 1], P[i]] = [P[i], P[i - 1]]; ED.sel--; }
  else if (act === "bas" && i < P.length - 1 && !P[i + 1].raccord) { [P[i + 1], P[i]] = [P[i], P[i + 1]]; ED.sel++; }
  else if (act === "double" && p && !p.raccord && !p.fourche) { const c = JSON.parse(JSON.stringify(p)); delete c.lieux; delete c.objets; P.splice(i + 1, 0, c); ED.sel++; }
  else if (act === "retire" && P.length > 1) { if (p.raccord && n.boucle) { ED.msg = "Une boucle a besoin de son retour : passe en « parcours de A à B » (Le circuit) pour l'enlever."; edEtat(); return; } P.splice(i, 1); ED.sel = Math.max(0, i - 1); }
  else if (act === "objet") { const nom = $("edObj").value, num = +$("edNum").value, o = {o: nom, cote: ["ligne", "tronc", "rondins", "nenuphars", "ronflex"].includes(nom) ? "c" : "g", a: Math.round((p.long || 40) / 2)};
    if (o.cote !== "c") o.e = ({cascade: 2, bateau: -1.6, ponton: -3.6, phare: 7, maison: 15, immeuble: 17, entrepot: 15, centre: 19, boutique: 18, labo: 21}[nom]) || 3;
    if (nom === "bateau" || nom === "ponton") o.flotte = true; if (nom === "pokemon") o.num = num > 0 ? num : 25; if (nom === "habitant") o.nom = "youngster"; if (nom === "panneau") o.texte = n.nom.toUpperCase();
    (p.objets = p.objets || []).push(o); }
  else if (act === "graine") n.graine = Math.floor(Math.random() * 96) + 1;
  else if (act === "loin") (n.lointain = n.lointain || []).push({o: $("edLoin").value, cap: 0});
  else if (act === "exporter") { const t = JSON.stringify(propre(n), null, 1); $("edTexte").value = t; try { navigator.clipboard.writeText(t); ED.msg = "Le texte du circuit est copié."; } catch (e) { ED.msg = "Copie le texte du cadre."; } edEtat(); return; }
  else if (act === "importer") { try { const o = JSON.parse($("edTexte").value); if (!Array.isArray(o.pieces)) throw new Error("pas de pièces"); if (!o.id || NIVEAUX[o.id]) o.id = idDe(o.nom); edAtelier(o, false); ED.msg = "Circuit importé."; edEtat(); } catch (e) { ED.msg = "Ce texte n'est pas un circuit : " + e.message; edEtat(); } return; }
  else if (act === "ecrire") { const o = propre(n); o.id = o.id.replace(/^perso-/, "");
    fetch("/niveau", {method: "POST", body: JSON.stringify(o)}).then(r => r.text()).then(t => { ED.msg = t; edEtat(); }).catch(e => { ED.msg = "Échec : " + e; edEtat(); }); return; }
  else if (act === "essayer" || act === "garder") {
    const r = ED.res; if (!r || r.erreur || !r.verif.ok) { ED.msg = "Ce circuit n'est pas encore jouable : corrige ce qui est en rouge sous le plan."; edEtat(); return; }
    if (act === "essayer") { try { sessionStorage.setItem("riviere_essai", JSON.stringify(propre(n))); sessionStorage.setItem("riviere_essai_go", "1"); } catch (e) {} bouton.textContent = "Je prépare…"; relancer(); return; }
    if (!(n.id && CIRCUITS_PERSO[n.id])) { const base = idDe(n.nom); let id = base, k = 2; while (CIRCUITS_PERSO[id]) id = base + "-" + k++; n.id = id; }
    CIRCUITS_PERSO[n.id] = propre(n);
    if (!ecrireReglage("riviere_circuits", CIRCUITS_PERSO)) { ED.msg = "Impossible de garder le circuit sur cet appareil."; edEtat(); return; }
    ecrireReglage(ED_CLE, n); ED.msg = "« " + n.nom + " » est gardé : il est au menu, avec tes circuits."; edEtat(); return; }
  edTout();
}
