/* ============ l'éditeur de circuits : on assemble des pièces, on voit le plan en direct, on essaie tout de suite ============ */
// Depuis le menu : « Créer ou modifier un circuit ». Tout se passe dans la page, sans rien envoyer nulle part :
//   - à gauche, le plan vu du ciel et le profil d'altitude, redessinés à chaque retouche par le VRAI code de la piste (generateur.js : essayerNiveau) ;
//     le contrôleur du moteur dit tout de suite ce qui cloche (un virage trop serré, un croisement sans pont, une boucle qui ne se referme pas) ;
//   - à droite, la liste des pièces et les réglages de la pièce choisie ; « + » ajoute un module tout fait (ligne droite, épingle, lac, grotte, pont…) ;
//   - « Générer » : quelques cases, un bouton, un circuit complet qu'on retouche ensuite ;
//   - « Essayer » lance le jeu sur le brouillon ; « Garder » le range dans « Mes circuits » (sur cette machine), il apparaît au menu ;
//   - « Exporter » donne le texte du circuit (à coller ailleurs, ou à donner à Claude pour qu'il entre dans le jeu) ; « Importer » le relit.
// Sur le serveur d'essai du PC, « Écrire dans le jeu » range le fichier dans contenu/niveaux.
const ED = {n: null, sel: 0, res: null, onglet: "pieces", gen: {activite: DISCIPLINE, forme: "boucle", km: 1, virages: "quelques", denivele: 15, avec: {grotte: true, cascade: true, pont: true, lac: true}, graine: 1}, msg: ""};
const ED_CLE = "riviere_brouillon";
const propre = n => { const o = JSON.parse(JSON.stringify(n)); for (const k of ["brouillon", "perso", "cache"]) delete o[k]; for (const p of o.pieces) for (const k of ["s0", "s1", "titre", "grotte", "long0"]) delete p[k]; return o; };
const idDe = nom => "perso-" + (nom || "circuit").toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
const esc = t => String(t === undefined || t === null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

function ouvrirEditeur(niveau) {
  S.mode = null; S.pause = false; fermerPanneau(); majBoutons();
  ED.n = propre(niveau || (NIVEAU.brouillon ? NIVEAU : null) || lireReglage(ED_CLE, null) || Object.assign({}, NIVEAU, {id: NIVEAU.perso ? NIVEAU.id : idDe("copie de " + NIVEAU.nom), nom: NIVEAU.perso ? NIVEAU.nom : "Copie de " + NIVEAU.nom}));
  ED.sel = 0; ED.msg = ""; $("editeur").hidden = false; document.body.classList.add("edite"); edTout();
}
function fermerEditeur() { $("editeur").hidden = true; document.body.classList.remove("edite"); ouvrirMenu(); }
function edChange() { ecrireReglage(ED_CLE, ED.n); ED.res = essayerNiveau(ED.n); edPlan(); edEtat(); }
function edTout() { edChange(); edPanneau(); }

/* ---- le plan et le profil ---- */
function edPlan() {
  const cv = $("edPlan"), l = cv.width = Math.round(cv.clientWidth * devicePixelRatio), h = cv.height = Math.round(cv.clientHeight * devicePixelRatio), c = cv.getContext("2d");
  c.fillStyle = "#8FCF70"; c.fillRect(0, 0, l, h);
  const r = ED.res; if (!r || r.erreur) { c.fillStyle = "#383828"; c.font = Math.round(h * .045) + 'px "Jersey 15", monospace'; c.textAlign = "center"; c.fillText("Le tracé ne se construit pas", l / 2, h / 2); edProfil(null); return; }
  const P = r.PISTE, N = P.N; let xa = 1e9, xb = -1e9, za = 1e9, zb = -1e9;
  for (let i = 0; i < N; i++) { xa = Math.min(xa, P.X[i]); xb = Math.max(xb, P.X[i]); za = Math.min(za, P.Z[i]); zb = Math.max(zb, P.Z[i]); }
  const m = 34 * devicePixelRatio, k = Math.min((l - 2 * m) / Math.max(xb - xa, 40), (h - 2 * m) / Math.max(zb - za, 40)), ox = (l - (xb - xa) * k) / 2 - xa * k, oz = (h - (zb - za) * k) / 2 - za * k;
  const X = i => P.X[i] * k + ox, Z = i => P.Z[i] * k + oz; ED.vue = {k, ox, oz};
  const B = region(ED.n.biome), solDe = nom => { const R = B.rives[nom]; return R ? B.sols[R.sols[0][0]].c[0] : "#84D45C"; };
  const trait = (couleur, larg, garde, cap = "round") => { c.strokeStyle = couleur; c.lineWidth = larg; c.lineJoin = "round"; c.lineCap = cap; c.beginPath(); let dedans = false;
    for (let i = 0; i <= N; i++) { if (!r.boucle && i === N) break; const j = i % N, ok = garde(j); if (ok && !dedans) { c.moveTo(X(j), Z(j)); dedans = true; } else if (ok) c.lineTo(X(j), Z(j)); else dedans = false; } c.stroke(); };
  // les rives (la couleur de leur sol), puis la piste, les grottes, les ponts, la pièce choisie
  for (const cote of [0, 1]) for (const p of P.pieces) { const nom = cote ? p.d : p.g; c.strokeStyle = nom === "mer" ? "#3C90EC" : solDe(nom); c.lineWidth = 30 * k + 4; c.lineCap = "butt"; c.beginPath();
    for (let i = p.s0; i <= Math.min(p.s1, N - 1); i++) { const sg = cote ? 1 : -1, x = (P.X[i] + sg * P.CH[i] * (P.W[i] + 15)) * k + ox, z = (P.Z[i] + sg * P.SH[i] * (P.W[i] + 15)) * k + oz; if (i === p.s0) c.moveTo(x, z); else c.lineTo(x, z); } c.stroke(); }
  const larg = i => Math.max(5, P.W[i] * 2 * k), eau = s => !["terre", "goudron"].includes(s);
  for (const p of P.pieces) { c.strokeStyle = "#1B2440"; c.lineWidth = larg(p.s0) + 5; c.lineCap = "round"; c.beginPath(); for (let i = p.s0; i <= Math.min(p.s1, N - 1); i++) { if (i === p.s0) c.moveTo(X(i), Z(i)); else c.lineTo(X(i), Z(i)); } if (r.boucle && p.s1 >= N) c.lineTo(X(0), Z(0)); c.stroke(); }
  P.pieces.forEach((p, ip) => { const couleur = p.tunnel ? "#8088A0" : p.pont ? "#D8C8A0" : p.surface === "terre" ? "#D9B886" : p.surface === "goudron" ? "#6E7480" : (B.eaux && B.eaux[p.surface] ? B.eaux[p.surface].c1 : "#3C90EC");
    c.strokeStyle = couleur; c.lineWidth = larg(p.s0); c.lineCap = "butt"; c.beginPath(); for (let i = p.s0; i <= Math.min(p.s1, N - 1); i++) { if (i === p.s0) c.moveTo(X(i), Z(i)); else c.lineTo(X(i), Z(i)); } if (r.boucle && p.s1 >= N) c.lineTo(X(0), Z(0)); c.stroke(); });
  const choisie = P.pieces.filter(p => p._i === ED.sel || edIndex(p) === ED.sel);
  for (const p of choisie) { c.strokeStyle = "#F8C838"; c.lineWidth = Math.max(4, 3 * devicePixelRatio); c.setLineDash([8, 6]); c.lineCap = "butt"; c.beginPath(); for (let i = p.s0; i <= Math.min(p.s1, N - 1); i++) { if (i === p.s0) c.moveTo(X(i), Z(i)); else c.lineTo(X(i), Z(i)); } c.stroke(); c.setLineDash([]); }
  // le départ (un damier), le sens (des flèches), les croisements, les noms
  const fl = (i, taille, couleur) => { const a = Math.atan2(P.Z[Math.min(N - 1, i + 2)] - P.Z[i], P.X[Math.min(N - 1, i + 2)] - P.X[i]); c.save(); c.translate(X(i), Z(i)); c.rotate(a); c.fillStyle = couleur; c.beginPath(); c.moveTo(taille, 0); c.lineTo(-taille * .7, taille * .7); c.lineTo(-taille * .7, -taille * .7); c.fill(); c.restore(); };
  for (let i = 30; i < N - 5; i += 90) fl(i, 6 * devicePixelRatio, "#FFFFFF");
  c.save(); c.translate(X(0), Z(0)); c.rotate(P.H[0]); const u = 5 * devicePixelRatio; for (let a = -2; a < 2; a++) for (let b = 0; b < 2; b++) { c.fillStyle = (a + b) & 1 ? "#1B2440" : "#fff"; c.fillRect(a * u, (b - 1) * u, u, u); } c.restore();
  for (const x of r.verif.croisements) { c.strokeStyle = x.bon ? "#2E8A48" : "#D83830"; c.lineWidth = 3 * devicePixelRatio; c.beginPath(); c.arc(X(x.s1), Z(x.s1), 9 * devicePixelRatio, 0, 7); c.stroke(); }
  c.font = Math.round(13 * devicePixelRatio) + 'px "Jersey 15", monospace'; c.textAlign = "center"; c.lineWidth = 3 * devicePixelRatio; c.strokeStyle = "#1B2440"; c.fillStyle = "#fff";
  for (const p of P.pieces) { if (!p.nom) continue; const i = Math.min(N - 1, Math.round((p.s0 + p.s1) / 2)); c.strokeText(p.nom, X(i), Z(i) - 10 * devicePixelRatio); c.fillText(p.nom, X(i), Z(i) - 10 * devicePixelRatio); }
  edProfil(r);
}
function edIndex(p) {   // à quelle pièce du brouillon correspond une pièce de la piste (le raccord en devient plusieurs)
  const r = ED.res.PISTE.pieces, src = ED.n.pieces, i = r.indexOf(p);
  return Math.min(i, src.length - 1);
}
function edProfil(r) {
  const cv = $("edProfil"), l = cv.width = Math.round(cv.clientWidth * devicePixelRatio), h = cv.height = Math.round(cv.clientHeight * devicePixelRatio), c = cv.getContext("2d");
  c.fillStyle = "#22315A"; c.fillRect(0, 0, l, h); if (!r) return;
  const P = r.PISTE, N = P.N, max = Math.max(4, r.verif.haut), X = i => 4 + (l - 8) * i / (N - 1), Y = y => h - 5 - (h - 12) * y / max;
  P.pieces.forEach((p, ip) => { c.fillStyle = edIndex(p) === ED.sel ? "#F8C838" : p.tunnel ? "#9098A8" : p.pont ? "#C8B890" : ip % 2 ? "#7CC860" : "#6CB854"; c.beginPath(); c.moveTo(X(p.s0), h); for (let i = p.s0; i <= Math.min(p.s1, N - 1); i++) c.lineTo(X(i), Y(P.Y[i])); c.lineTo(X(Math.min(p.s1, N - 1)), h); c.fill(); });
}
function edEtat() {
  const r = ED.res, el = $("edEtat");
  if (!r || r.erreur) { el.className = "ko"; el.textContent = "✖ " + (r ? r.erreur : "?"); return; }
  const v = r.verif;
  el.className = v.ok ? "ok" : "ko";
  el.innerHTML = (v.ok ? "✔ Jouable" : "✖ À corriger") + " · " + v.longueur + " m de décor · " + (r.boucle ? "un tour" : "le parcours") + " ≈ " + Math.round(r.tour) + " vrais m · point haut " + v.haut + " m"
    + (v.ok ? "" : "<br>" + v.erreurs.map(esc).join("<br>")) + (ED.msg ? "<br><b>" + esc(ED.msg) + "</b>" : "");
}

/* ---- le panneau de droite : les pièces, le circuit, le générateur ---- */
const champ = (nom, cle, v, min, max, pas, unite = "") => `<label class="ed-l"><span>${nom}</span><button data-pm="${cle}" data-d="${-pas}">−</button><input type="range" data-k="${cle}" min="${min}" max="${max}" step="${pas}" value="${v}"><button data-pm="${cle}" data-d="${pas}">+</button><b data-v="${cle}">${v}${unite}</b></label>`;
const choix = (nom, cle, v, liste) => `<label class="ed-l"><span>${nom}</span><select data-k="${cle}">${liste.map(([k, t]) => `<option value="${esc(k)}"${String(v) === String(k) ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;
function edPanneau() {
  const n = ED.n, B = region(n.biome), el = $("edCote"), p = n.pieces[ED.sel] || n.pieces[0], rives = Object.keys(B.rives).filter(k => disciplineDe(n) === "terre" ? B.rives[k].pour === "terre" || k === "montagne" : !B.rives[k].pour).map(k => [k, k]);   // les rives de l'activité (plus la montagne, pour un tunnel)
  const onglets = [["pieces", "Pièces"], ["circuit", "Circuit"], ["generer", "Générer"], ["mes", "Mes circuits"]].map(([k, t]) => `<button class="ed-o${ED.onglet === k ? " on" : ""}" data-onglet="${k}">${t}</button>`).join("");
  let h = `<div class="ed-onglets">${onglets}</div>`;
  if (ED.onglet === "pieces") {
    h += `<div class="ed-liste">${n.pieces.map((q, i) => `<button class="ed-p${i === ED.sel ? " on" : ""}" data-sel="${i}">${i + 1}. ${esc(q.nom || (q.raccord ? "raccord" : "suite"))}${q.raccord ? " ↺" : ""}${q.tunnel ? " ◗" : ""}${q.pont ? " ⌒" : ""}${q.net ? " ⇅" : ""}</button>`).join("")}</div>
      <div class="ed-barre"><button data-act="haut">↑</button><button data-act="bas">↓</button><button data-act="double">Doubler</button><button data-act="retire">Retirer</button></div>
      <details class="ed-plus"><summary>+ Ajouter après cette pièce</summary><div class="ed-mods">${Object.entries(MODULES).filter(([k, m]) => (m.act || "eau") === disciplineDe(n)).map(([k, m]) => `<button data-mod="${k}">${m.nom}</button>`).join("")}</div></details>`;
    if (p) {
      const raccord = !!p.raccord;
      h += `<div class="ed-form"><label class="ed-l"><span>Nom</span><input type="text" data-k="nom" value="${esc(p.nom)}" placeholder="(suite de la pièce d'avant)"></label>`;
      if (raccord) h += `<p class="ed-note">Le raccord referme la boucle tout seul : un virage, une ligne droite, un virage.</p>` + champ("Rayon", "rayon", p.rayon || 30, 12, 80, 2, " m");
      else h += champ("Longueur", "long", p.long, 3, 400, 5, " m") + champ("Virage", "virage", p.virage === "auto" ? 0 : p.virage || 0, -180, 180, 5, "°")
        + `<div class="ed-rapides">${[-90, -45, 0, 45, 90].map(v => `<button data-virage="${v}">${v > 0 ? "+" : ""}${v}°</button>`).join("")}<small>− à gauche, + à droite</small></div>`;
      h += champ("Largeur", p.large !== undefined ? "large" : "eau", p.large !== undefined ? p.large : p.eau, 5, 40, 1, " m")
        + champ("Monte", "monte", typeof p.monte === "number" ? p.monte : 0, -10, 10, .5, " m")
        + `<div class="ed-coches"><label><input type="checkbox" data-c="monte_auto"${p.monte === "auto" ? " checked" : ""}> revient à la hauteur du départ</label><label><input type="checkbox" data-c="net"${p.net ? " checked" : ""}> pente nette (chute, tremplin)</label></div>`
        + choix("Rive gauche", "g", p.g, rives) + choix("Rive droite", "d", p.d, rives);
      if (!raccord) h += choix("Grotte", "tunnel", p.tunnel === true ? "roche" : p.tunnel || "", [["", "non"]].concat(Object.keys(Object.assign({roche: {}}, B.grottes)).map(k => [k, k])))
        + choix("Pont", "pont", p.pont === true ? "pierre" : p.pont || "", [["", "non"], ["pierre", "pierre"], ["bois", "bois"], ["arches", "arches dorées"]])
        + (p.pont ? champ("Ravin dessous", "ravin", p.ravin || 0, 0, 14, 1, " m") : "");
      h += choix("Surface", "surface", p.surface || "", disciplineDe(n) === "terre" ? [["", "celle du circuit"], ["terre", "chemin de terre"], ["goudron", "route goudronnée"], ["paves", "rue pavée"]] : [["", "celle du circuit"], ["eau", "eau"]].concat(Object.keys(B.eaux || {}).map(k => [k, "eau : " + k])))
        + choix("Ambiance", "ambiance", p.ambiance || "", [["", "aucune"]].concat(Object.keys(AMBIANCES).filter(k => k !== "grotte").map(k => [k, k])))
        + champ("Vitesse du décor", "allure", p.allure || 1, .6, 1.6, .05, " ×")
        + `<label class="ed-l"><span>Segment chronométré</span><input type="text" data-k="segment" value="${esc(p.segment)}" placeholder="(aucun)"></label>`;
      const lieux = Object.keys(LIEUX_TOUS[n.lieux] || LIEUX_TOUS[n.biome] || {}).filter(k => k !== "note"), L = (p.lieux || [])[0];
      if (!raccord && lieux.length) h += choix("Lieu", "lieu", L ? L.lieu + "|" + L.cote : "", [["", "aucun"]].concat(lieux.flatMap(k => [[k + "|g", k + " (à gauche)"], [k + "|d", k + " (à droite)"]])));
      h += `<div class="ed-objets"><span>Objets posés à la main</span>${(p.objets || []).map((o, i) => `<div class="ed-obj"><b>${esc(o.o)}${o.num ? " n° " + o.num : ""}${o.texte ? " « " + esc(o.texte) + " »" : ""}</b>
          <select data-ok="${i}" data-oc="cote">${[["g", "gauche"], ["d", "droite"], ["c", "sur la piste"], ["portail", "sur la grotte"]].map(([k, t]) => `<option value="${k}"${o.cote === k ? " selected" : ""}>${t}</option>`).join("")}</select>
          <input type="number" data-ok="${i}" data-oc="a" value="${o.a === undefined ? "" : o.a}" title="mètres depuis le début de la pièce"><input type="number" data-ok="${i}" data-oc="e" value="${o.e === undefined ? "" : o.e}" title="mètres depuis le bord"><button data-oretire="${i}">×</button></div>`).join("")}
        <div class="ed-obj"><select id="edObj">${Object.keys(OBJETS).sort().map(k => `<option>${k}</option>`).join("")}</select><input type="number" id="edNum" placeholder="n° Pokémon" title="pour un Pokémon : son numéro"><button data-act="objet">+ Poser</button></div>
        <small>côté · mètres depuis le début de la pièce · mètres depuis le bord</small></div></div>`;
    }
  } else if (ED.onglet === "circuit") {
    const loin = Object.keys(LOINTAINS);
    h += `<div class="ed-form"><label class="ed-l"><span>Nom du circuit</span><input type="text" data-n="nom" value="${esc(n.nom)}"></label>`
      + choix("Forme", "n:boucle", n.boucle === "huit" ? "huit" : n.boucle ? "boucle" : "ouvert", [["boucle", "une boucle (des tours)"], ["ouvert", "un parcours de A à B"]].concat(disciplineDe(n) === "terre" ? [["huit", "un 8 (un carrefour)"]] : []))
      + (Object.keys(BIOMES).length > 1 ? choix("Région", "n:biome", n.biome, Object.keys(BIOMES).map(k => [k, BIOMES[k].nom || k])) : "")
      + choix("Activité", "n:discipline", disciplineDe(n), [["eau", "rameur : une rivière"], ["terre", "vélo, skieur de fond : routes et chemins"]])
      + (disciplineDe(n) === "terre" ? choix("Revêtement", "n:surface", n.surface || "terre", [["terre", "chemin de terre"], ["goudron", "route goudronnée"], ["paves", "rue pavée"]]) : "")
      + choix("Heure", "n:heure", n.heure || "jour", HEURES_MENU.filter(x => x[0] !== "circuit")) + choix("Temps", "n:meteo", n.meteo || "beau", METEOS_MENU.filter(x => x[0] !== "circuit"))
      + `<label class="ed-l"><span>Décor (la graine)</span><button data-act="graine">🎲 Autre tirage du décor</button><b>${n.graine || 1}</b></label>`
      + champ("Élan avant la ligne", "n:elan", n.elan === undefined ? 120 : n.elan, 0, 200, 10, " m")
      + `<div class="ed-objets"><span>Repères au loin</span>${(n.lointain || []).map((o, i) => `<div class="ed-obj"><b>${esc(o.o)}</b><input type="number" data-lk="${i}" value="${o.cap || 0}" title="cap, en degrés : 0 = droit devant au départ, 90 = à droite"><button data-lretire="${i}">×</button></div>`).join("")}
        <div class="ed-obj"><select id="edLoin">${loin.map(k => `<option>${k}</option>`).join("")}</select><button data-act="loin">+ Ajouter</button></div><small>cap en degrés : 0 = droit devant au départ, 90 = à droite, 180 = derrière</small></div></div>`;
  } else if (ED.onglet === "generer") {
    const G = ED.gen, terre = G.activite === "terre", cases = terre
      ? [["village", "un village"], ["foret", "un sous-bois"], ["champs", "des champs"], ["montagne", "un col de montagne"], ["volcan", "un volcan"], ["tunnel", "un tunnel"], ["pont", "un pont sur un ravin"]]
      : [["port", "un port"], ["village", "un village"], ["lac", "un lac"], ["foret", "un sous-bois"], ["marais", "un marais"], ["plage", "une plage"], ["cascade", "une cascade"], ["grotte", "une grotte"], ["pont", "un pont sur un ravin"]];
    h += `<div class="ed-form"><p class="ed-note">Choisis l'activité, coche ce que tu veux y trouver, puis « Générer ». Le circuit obtenu se retouche pièce par pièce.</p>`
      + choix("Activité", "g:activite", G.activite || "eau", [["eau", "rameur : une rivière"], ["terre", "vélo, skieur de fond : routes et chemins"]])
      + (terre ? `<p class="ed-note">Sur la terre : des routes posées sur le sol, des rues pavées, des chemins en sous-bois, des cols ; un volcan au milieu d'une boucle ; un 8 qui se croise à un carrefour.</p>` : "")
      + champ("Longueur", "g:km", G.km, .4, terre ? 6 : 4, .1, " km")
      + choix("Virages", "g:virages", G.virages || "quelques", [["droit", "presque droit"], ["quelques", "quelques virages"], ["sinueux", "sinueux"], ["tres", "très sinueux (épingles)"]])
      + champ("Dénivelé", "g:denivele", Math.min(G.denivele ?? 15, terre ? 250 : 80), 0, terre ? 250 : 80, 5, " m")
      + choix("Forme", "g:forme", G.forme === "huit" && !terre ? "boucle" : G.forme || "boucle", [["boucle", "une boucle"], ["ouvert", "de A à B"]].concat(terre ? [["huit", "un 8 (qui se croise à un carrefour)"]] : []))
      + `<div class="ed-coches">${cases.map(([k, t]) => `<label><input type="checkbox" data-g="${k}"${G.avec[k] ? " checked" : ""}> ${t}</label>`).join("")}</div>`
      + choix("Heure", "g:heure", G.heure || "jour", HEURES_MENU.filter(x => x[0] !== "circuit")) + choix("Temps", "g:meteo", G.meteo || "beau", METEOS_MENU.filter(x => x[0] !== "circuit"))
      + `<div class="ed-barre"><button class="rouge" data-act="generer">▶ Générer</button><button data-act="autre">🎲 Un autre</button></div></div>`;
  } else {
    const persos = Object.entries(CIRCUITS_PERSO);
    h += `<div class="ed-form"><div class="ed-objets"><span>Mes circuits (gardés sur cette machine)</span>${persos.length ? persos.map(([k, c]) => `<div class="ed-obj"><b>${esc(c.nom || k)}</b><button data-ouvre="${esc(k)}">Modifier</button><button data-joue="${esc(k)}">Jouer</button><button data-efface="${esc(k)}">×</button></div>`).join("") : "<small>Aucun pour l'instant : « Garder » range le brouillon ici.</small>"}</div>
      <div class="ed-objets"><span>Partir d'un circuit du jeu</span>${Object.entries(NIVEAUX).map(([k, c]) => `<div class="ed-obj"><b>${esc(c.nom || k)}</b><button data-copie="${esc(k)}">Copier</button></div>`).join("")}
      <div class="ed-obj"><b>Une page blanche</b><button data-act="vide">Nouveau</button></div></div>
      <div class="ed-objets"><span>Exporter, importer</span><textarea id="edTexte" rows="5" placeholder="Le texte d'un circuit"></textarea>
      <div class="ed-barre"><button data-act="exporter">Exporter le brouillon</button><button data-act="importer">Importer ce texte</button>${location.hostname === "localhost" || location.hostname === "127.0.0.1" ? `<button data-act="ecrire">Écrire dans le jeu (PC)</button>` : ""}</div></div></div>`;
  }
  el.innerHTML = h;
}

/* ---- les gestes ---- */
function edPiece() { return ED.n.pieces[ED.sel]; }
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
  if (["nom", "segment", "surface", "ambiance", "g", "d"].includes(cle)) { if (v === "") delete p[cle]; else p[cle] = v; return false; }
  if (cle === "monte") { if (+v === 0) delete p.monte; else p.monte = num(v); return false; }
  if (cle === "allure") { if (+v === 1) delete p.allure; else p.allure = num(v); return false; }
  if (cle === "ravin") { if (+v === 0) delete p.ravin; else p.ravin = num(v); return false; }
  p[cle] = num(v); return false;
}
$("editeur").addEventListener("input", e => {   // pendant qu'on glisse un curseur : le plan suit, le panneau ne bouge pas
  const t = e.target;
  if (t.dataset.k && t.type === "range") { edRegler(t.dataset.k, t.value); const b = $("edCote").querySelector(`[data-v="${t.dataset.k}"]`); if (b) b.textContent = t.value + b.textContent.replace(/^[-0-9.,]+/, ""); edChange(); }
});
$("editeur").addEventListener("change", e => {
  const t = e.target, d = t.dataset, n = ED.n, p = edPiece();
  if (d.k) { if (edRegler(d.k, t.value) || t.tagName === "SELECT") edTout(); else { edChange(); if (d.k === "nom") edPanneau(); } }
  else if (d.n) { n[d.n] = t.value; if (d.n === "nom" && !CIRCUITS_PERSO[n.id]) n.id = idDe(t.value); edChange(); }
  else if (d.c === "monte_auto") { if (t.checked) p.monte = "auto"; else delete p.monte; edTout(); }
  else if (d.c === "net") { if (t.checked) p.net = true; else delete p.net; edTout(); }
  else if (d.g) ED.gen.avec[d.g] = t.checked;
  else if (d.ok !== undefined) { const o = p.objets[+d.ok]; if (d.oc === "cote") o.cote = t.value; else if (t.value === "") delete o[d.oc]; else o[d.oc] = +t.value; edChange(); }
  else if (d.lk !== undefined) { n.lointain[+d.lk].cap = +t.value || 0; edChange(); }
});
$("editeur").addEventListener("click", e => {
  const t = e.target.closest("button"); if (!t) return;
  const d = t.dataset, n = ED.n, P = n.pieces, p = edPiece(); ED.msg = "";
  if (d.onglet) { ED.onglet = d.onglet; edPanneau(); }
  else if (d.sel !== undefined) { ED.sel = +d.sel; edPlan(); edPanneau(); }
  else if (d.pm) { const inp = $("edCote").querySelector(`input[data-k="${d.pm}"]`); inp.value = clamp(+inp.value + +d.d, +inp.min, +inp.max); edRegler(d.pm, inp.value); edTout(); }
  else if (d.virage !== undefined) { p.virage = +d.virage; edTout(); }
  else if (d.mod) { const avant = p || {eau: 11, g: "pre", d: "pre"}, morceau = MODULES[d.mod].pieces(hasard(Date.now() % 100000), {v: -45, eau: avant.raccord ? 11 : avant.large || avant.eau || 11, g: avant.g, d: avant.d, lieux: n.lieux || n.biome, terre: n.surface === "terre"});
    for (const q of morceau) { delete q.fixe; if (q.surface === undefined) delete q.surface; }
    const ou = p && p.raccord ? ED.sel : ED.sel + 1; P.splice(ou, 0, ...morceau); ED.sel = ou; edTout(); }
  else if (d.oretire !== undefined) { p.objets.splice(+d.oretire, 1); if (!p.objets.length) delete p.objets; edTout(); }
  else if (d.lretire !== undefined) { n.lointain.splice(+d.lretire, 1); if (!n.lointain.length) delete n.lointain; edTout(); }
  else if (d.ouvre) { ouvrirEditeur(CIRCUITS_PERSO[d.ouvre]); ED.onglet = "pieces"; edPanneau(); }
  else if (d.joue) choisirCircuit(d.joue);
  else if (d.efface) { if (t.textContent !== "Sûr ?") { t.textContent = "Sûr ?"; return; } delete CIRCUITS_PERSO[d.efface]; ecrireReglage("riviere_circuits", CIRCUITS_PERSO); edPanneau(); }
  else if (d.copie) { const c = NIVEAUX[d.copie]; ouvrirEditeur(Object.assign({}, c, {id: idDe("copie de " + c.nom), nom: "Copie de " + c.nom})); ED.onglet = "pieces"; edPanneau(); }
  else if (d.act) edAction(d.act, t);
});
$("edPlan").addEventListener("pointerdown", e => {   // toucher le plan : on choisit la pièce la plus proche
  const r = ED.res; if (!r || r.erreur || !ED.vue) return;
  const b = e.target.getBoundingClientRect(), x = ((e.clientX - b.left) * devicePixelRatio - ED.vue.ox) / ED.vue.k, z = ((e.clientY - b.top) * devicePixelRatio - ED.vue.oz) / ED.vue.k, P = r.PISTE; let mieux = 1e18, im = 0;
  for (let i = 0; i < P.N; i += 2) { const q = (P.X[i] - x) ** 2 + (P.Z[i] - z) ** 2; if (q < mieux) { mieux = q; im = i; } }
  ED.sel = edIndex(P.pieces[P.PC[im]]); ED.onglet = "pieces"; edPlan(); edPanneau();
});
function edAction(act, bouton) {
  const n = ED.n, P = n.pieces, i = ED.sel, p = P[i];
  if (act === "haut" && i > 0 && !p.raccord) { [P[i - 1], P[i]] = [P[i], P[i - 1]]; ED.sel--; }
  else if (act === "bas" && i < P.length - 1 && !P[i + 1].raccord) { [P[i + 1], P[i]] = [P[i], P[i + 1]]; ED.sel++; }
  else if (act === "double" && p && !p.raccord) { const c = JSON.parse(JSON.stringify(p)); delete c.lieux; delete c.objets; P.splice(i + 1, 0, c); ED.sel++; }
  else if (act === "retire" && P.length > 1) { if (p.raccord && n.boucle) { ED.msg = "Une boucle a besoin de son raccord : passe en « parcours de A à B » dans l'onglet Circuit pour l'enlever."; edEtat(); return; } P.splice(i, 1); ED.sel = Math.max(0, i - 1); }
  else if (act === "objet") { const nom = $("edObj").value, num = +$("edNum").value, o = {o: nom, cote: ["ligne", "tronc", "rondins", "nenuphars"].includes(nom) ? "c" : "g", a: Math.round((p.long || 40) / 2)};
    if (o.cote !== "c") o.e = ({cascade: 2, bateau: -1.6, ponton: -3.6, phare: 7, maison: 15, immeuble: 17, entrepot: 15, centre: 19, boutique: 18, labo: 21}[nom]) || 3;
    if (nom === "bateau" || nom === "ponton") o.flotte = true; if (nom === "pokemon") o.num = num > 0 ? num : 25; if (nom === "habitant") o.nom = "youngster"; if (nom === "panneau") o.texte = n.nom.toUpperCase();
    (p.objets = p.objets || []).push(o); }
  else if (act === "graine") n.graine = Math.floor(Math.random() * 96) + 1;
  else if (act === "loin") (n.lointain = n.lointain || []).push({o: $("edLoin").value, cap: 0});
  else if (act === "generer" || act === "autre") {
    if (act === "autre" || !ED.gen.fait) ED.gen.graine = Math.floor(Math.random() * 9000) + 1; ED.gen.fait = true;
    bouton.textContent = "Je cherche…";
    setTimeout(() => { const r = genererCircuit(Object.assign({biome: n.biome}, ED.gen));
      if (r.erreur) { ED.msg = r.erreur; edPanneau(); edEtat(); return; }
      ED.n = r.niveau; ED.sel = 0; ED.msg = "Circuit trouvé au " + r.essais + (r.essais > 1 ? "e" : "er") + " tirage. Retouche-le dans « Pièces », ou essaie-le."; edTout(); }, 30);
    return; }
  else if (act === "vide") { ED.n = {id: idDe("mon circuit " + Math.floor(Math.random() * 900 + 100)), nom: "Mon circuit", biome: n.biome, lieux: n.lieux, graine: 3, nageur: n.nageur || 7, boucle: "gauche", allure: 1, elan: 60,
      pieces: [{nom: "Le départ", long: 100, virage: 0, eau: 12, g: "pre", d: "pre", objets: [{o: "ligne", cote: "c", a: 0}]}, {nom: "Premier virage", long: 80, virage: -90, eau: 11, g: "foret", d: "pre"}, {nom: "Le retour", raccord: true, rayon: 30, eau: 12, g: "pre", d: "pre", monte: "auto"}]}; ED.sel = 0; ED.onglet = "pieces"; }
  else if (act === "exporter") { const t = JSON.stringify(propre(n), null, 1); $("edTexte").value = t; try { navigator.clipboard.writeText(t); ED.msg = "Le texte du circuit est copié."; } catch (e) { ED.msg = "Copie le texte ci-dessous."; } edEtat(); return; }
  else if (act === "importer") { try { const o = JSON.parse($("edTexte").value); if (!Array.isArray(o.pieces)) throw new Error("pas de pièces"); if (!o.id || NIVEAUX[o.id]) o.id = idDe(o.nom); ED.n = propre(o); ED.sel = 0; ED.onglet = "pieces"; ED.msg = "Circuit importé."; } catch (e) { ED.msg = "Ce texte n'est pas un circuit : " + e.message; edEtat(); return; } }
  else if (act === "ecrire") { const o = propre(n); o.id = o.id.replace(/^perso-/, "");
    fetch("/niveau", {method: "POST", body: JSON.stringify(o)}).then(r => r.text()).then(t => { ED.msg = t; edEtat(); }).catch(e => { ED.msg = "Échec : " + e; edEtat(); }); return; }
  else if (act === "essayer" || act === "garder" || act === "jouer") {
    const r = ED.res; if (!r || r.erreur || !r.verif.ok) { ED.msg = "Ce circuit n'est pas encore jouable : corrige ce qui est en rouge."; edEtat(); return; }
    if (act === "essayer") { try { sessionStorage.setItem("riviere_essai", JSON.stringify(propre(n))); } catch (e) {} relancer(); return; }
    if (!n.id || NIVEAUX[n.id]) n.id = idDe(n.nom);
    CIRCUITS_PERSO[n.id] = propre(n);
    if (!ecrireReglage("riviere_circuits", CIRCUITS_PERSO)) { ED.msg = "Impossible de garder le circuit sur cette machine."; edEtat(); return; }
    if (act === "jouer") { choisirCircuit(n.id); return; }
    ED.msg = "« " + n.nom + " » est gardé : il est au menu, dans la liste des circuits."; edEtat(); return; }
  else if (act === "fermer") { fermerEditeur(); return; }
  edTout();
}
