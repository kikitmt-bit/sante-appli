/* ============ départ, pause, fin ============ */
const SEANCE = {etat: "aucune", t0: null, bilan: null, saisi: null, relance: 0};
let minuteur = 0;
function demarrer() {
  pleinEcran(); allumer();
  $("menu").hidden = true; $("hud").hidden = false; $("essai").hidden = !essai;
  Object.assign(S, {etat: "decompte", t: 0, s: LONG - ELAN, v: 0, vL: 0, nb: 0, coupsT: [], dist: 0, tour: 0, tourT0: 0, temps: [], auto: false}); remiseFantome(); majTour.h = "";
  let n = 3;
  if (SEANCE.etat === "aucune" && !essai) { SEANCE.etat = "lancee"; SEANCE.relance = 0; envoyer({type: "lancer", s: 5}); n = 5; }
  const montre = () => { note(523, .15, "square", .04); $("gros").innerHTML = n + (n > 3 || SEANCE.etat === "lancee" ? "<small>Mets-toi en position</small>" : ""); };
  montre(); clearInterval(minuteur);
  minuteur = setInterval(() => { n--; if (n > 0) return montre(); clearInterval(minuteur); partir(); }, 1000);
}
function partir() {  // la tablette ne dépend jamais du téléphone pour partir (Kiki, 07/11) : elle le relance s'il ne répond pas
  note(1046, .3, "square", .05);
  $("gros").textContent = "RAME !"; setTimeout(() => { if ($("gros").textContent === "RAME !") $("gros").textContent = ""; }, 1300);
  S.etat = "course"; if (essai && SEANCE.etat === "aucune") { SEANCE.etat = "mesure"; SEANCE.t0 = Date.now(); }
}
setInterval(() => {
  if (S.etat !== "course" || essai || SEANCE.etat !== "lancee") return;
  envoyer({type: "lancer", s: 0}); $("tel").hidden = false;
  $("tel").textContent = telOk ? "Le téléphone ne démarre pas : rallume son écran" : "Pas de téléphone : Rameur → « Avec la tablette »";
}, 4000);
function tenir(b, f) {  // un bouton à maintenir 1,2 s (en sueur, pas de fausse manœuvre)
  let t0 = 0, id = 0; const i = b.querySelector("i");
  const stop = () => { cancelAnimationFrame(id); t0 = 0; if (i) i.style.width = "0"; };
  const tic = () => { const p = (performance.now() - t0) / 1200; if (i) i.style.width = Math.min(100, p * 100) + "%"; if (p >= 1) { stop(); f(); } else id = requestAnimationFrame(tic); };
  b.onpointerdown = e => { e.preventDefault(); t0 = performance.now(); id = requestAnimationFrame(tic); };
  b.onpointerup = b.onpointerleave = b.onpointercancel = stop;
}
function terminer() {
  $("pause").hidden = true; S.etat = "fin"; $("essai").hidden = true; $("tel").hidden = true; clearInterval(minuteur);
  if (essai) { SEANCE.bilan = {coups: S.nb, cadence: Math.round(cadence()), actif_s: Math.round(S.t), devine: Math.round(S.dist)}; ouvrirSaisie(); return; }
  if (SEANCE.etat === "aucune" || SEANCE.etat === "lancee") { SEANCE.saisi = {distance: S.dist, temps: S.t}; finir(true); return; }
  SEANCE.etat = "stop"; envoyer({type: "stop"}); ouvrirSaisie();
}
const SAISIE = {distance: "", min: "", sec: "", watts: "", kcal: ""}; let champActif = "distance";
function ouvrirSaisie() { $("saisie").hidden = false; Object.keys(SAISIE).forEach(k => SAISIE[k] = ""); champActif = "distance"; dessinerSaisie(); }
function dessinerSaisie(msg = "") {
  const b = SEANCE.bilan, ph = {distance: b && b.devine ? "≈ " + b.devine : "", min: b ? String(Math.floor(b.actif_s / 60)) : "", sec: b ? String(b.actif_s % 60).padStart(2, "0") : "", watts: "", kcal: ""};
  $("saisieSous").textContent = !b ? "J'attends le téléphone…" : b.coups ? `Le téléphone a compté ${b.coups} coups. Entre ce que tu lis sur le rameur : la distance est la plus utile, le reste est facultatif.` : "Le téléphone n'a pas vu de coups : entre au moins le temps du rameur pour garder ta séance.";
  const champ = (k, lab) => `<button class="champ ${champActif === k ? "actif" : ""}" data-k="${k}"><span class="lab">${lab}</span><span class="v num ${SAISIE[k] ? "" : "vide"}">${SAISIE[k] || ph[k] || "–"}</span></button>`;
  $("saisieGrille").innerHTML = `<div><div class="champs">${champ("distance", "Distance (m)")}${champ("watts", "Watts moyens")}${champ("min", "Temps : minutes")}${champ("sec", "Temps : secondes")}${champ("kcal", "Calories")}</div>
      <p class="message">${msg}</p><div class="ligne" style="margin-top:10px"><button class="go" id="sOk" ${b ? "" : "disabled"}>Enregistrer</button><button class="tenir" id="sJeter"><i></i>Ne pas la garder (maintiens)</button></div></div>
    <div class="pave">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-n="${n}">${n}</button>`).join("")}<button data-n="c">⌫</button><button data-n="0">0</button><button data-n="x" style="font-size:24px">Effacer</button></div>`;
  $("saisieGrille").querySelectorAll(".champ").forEach(e => e.onclick = () => { champActif = e.dataset.k; dessinerSaisie(); });
  $("saisieGrille").querySelectorAll(".pave button").forEach(e => e.onclick = () => { const n = e.dataset.n, v = SAISIE[champActif];
    SAISIE[champActif] = n === "c" ? v.slice(0, -1) : n === "x" ? "" : (v + n).replace(/^0+(?=\d)/, "").slice(0, champActif === "sec" ? 2 : 6); dessinerSaisie(); });
  $("sOk").onclick = () => {
    if (!SEANCE.bilan || SEANCE.etat === "saisie") return;
    const nb = k => +SAISIE[k] || null;
    if (!(nb("min") || nb("sec")) && !SEANCE.bilan.actif_s) return dessinerSaisie("Il me faut le temps du rameur pour compter cette séance.");
    SEANCE.saisi = {distance: nb("distance") || SEANCE.bilan.devine, temps: (nb("min") || 0) * 60 + (nb("sec") || 0) || SEANCE.bilan.actif_s};
    if (essai) return finir(false);
    envoyer({type: "saisie", distance: nb("distance"), min: nb("min"), sec: nb("sec"), watts: nb("watts"), kcal: nb("kcal"), jeu: {mode: "circuit", circuit: "baie", pokemon: NAGEURS[choix].nom, dist: Math.round(S.dist), tours: S.temps.length, meilleur_tour: S.temps.length ? Math.round(Math.min(...S.temps) * 10) / 10 : null}});
    SEANCE.etat = "saisie"; dessinerSaisie("J'envoie au téléphone…");
    clearTimeout(SEANCE.attente); SEANCE.attente = setTimeout(() => { if (SEANCE.etat === "saisie") { SEANCE.etat = "stop"; dessinerSaisie("Le téléphone ne répond pas : regarde son écran, il a peut-être déjà enregistré."); } }, 9000);
  };
  tenir($("sJeter"), () => { if (essai) return finir(true); envoyer({type: "jeter"}); });
}
function finir(jetee) {  // le résumé de la séance, puis retour au menu
  $("saisie").hidden = true; clearTimeout(SEANCE.attente);
  const d = SEANCE.saisi ? SEANCE.saisi.distance : S.dist, t = SEANCE.saisi ? SEANCE.saisi.temps : S.t;
  $("finCarte").innerHTML = `<h1>${jetee ? "SÉANCE NON GARDÉE" : essai ? "ESSAI TERMINÉ" : "SÉANCE ENREGISTRÉE !"}</h1>
    <p class="sous">${jetee ? "Rien n'a été enregistré." : essai ? "Sans téléphone, rien n'est enregistré." : "Le téléphone l'envoie à Poké Fit : elle compte comme toutes tes séances."}</p>
    <div class="stats"><div><span class="lab">Temps</span><b class="num">${fmt(t)}</b></div><div><span class="lab">Distance</span><b class="num">${Math.round(d || 0)} m</b></div>
      <div><span class="lab">Allure moyenne</span><b class="num">${d > 0 && t > 0 ? fmt(500 / (d / t)) : "–:––"}</b></div><div><span class="lab">Coups</span><b class="num">${S.nb}</b></div>
      <div><span class="lab">Cadence moyenne</span><b class="num">${t > 0 ? Math.round(S.nb / (t / 60)) : 0} /min</b></div><div><span class="lab">Tours</span><b class="num">${S.temps.length}${S.temps.length ? " · meilleur " + fmtT(Math.min(...S.temps)) : ""}</b></div></div>
    ${jetee || essai ? "" : evolutionDe(d)}<div class="ligne"><button class="go" id="fOk">▶ OK</button></div>`;
  $("fin").hidden = false;
  $("fOk").onclick = () => { $("fin").hidden = true; $("hud").hidden = true; $("menu").hidden = false;
    Object.assign(SEANCE, {etat: "aucune", t0: null, bilan: null, saisi: null}); Object.assign(S, {etat: "menu", t: 0, nb: 0, coupsT: [], dist: 0}); essai = false; boutonsFantomes(); majMenu(); };
}

/* ============ le téléphone sous le siège ============ */
const vits = [];
function coupReel(m) {
  if (S.etat !== "course") return;
  const vit = +m.vit || 0; vits.push(vit); if (vits.length > 20) vits.shift();
  const tri = [...vits].sort((a, b) => a - b), med = tri[Math.floor(tri.length / 2)] || vit || 1;
  const force = clamp(vits.length < 3 ? .5 : .5 + (vit / med - 1) * 1.5, 0, 1);  // fort = plus vite que tes derniers coups
  coup(force, D.modele ? Math.max(3, D.modele.a + D.modele.b * vit) : 6 + 4 * force);
}
function envoyer(m) { if (conn && conn.open) { try { conn.send(m); } catch (e) {} } }
function recevoir(m) {
  if (!m || typeof m !== "object") return;
  if (m.type === "bonjour") { telOk = true;
    if (m.etat === "mesure" && SEANCE.etat !== "mesure") { SEANCE.etat = "mesure"; SEANCE.t0 = m.depuis || Date.now(); }
    if (m.etat === "fini" && SEANCE.etat !== "saisie") { SEANCE.etat = "stop"; envoyer({type: "stop"}); if ($("saisie").hidden) ouvrirSaisie(); }
    if (m.etat === "attente" && SEANCE.etat === "lancee") envoyer({type: "lancer", s: 0});
    if (SEANCE.etat !== "lancee") $("tel").hidden = true;
    majMenu(); }
  if (m.type === "zero" || (m.type === "coup" && SEANCE.etat === "lancee")) { SEANCE.etat = "mesure"; SEANCE.t0 = SEANCE.t0 || Date.now(); $("tel").hidden = true; }
  if (m.type === "coup") coupReel(m);
  if (m.type === "bilan") { SEANCE.bilan = m; if (!$("saisie").hidden) dessinerSaisie(); }
  if (m.type === "garde") finir(false);
  if (m.type === "erreur") { SEANCE.etat = "stop"; dessinerSaisie(m.texte || "Le téléphone n'a pas pu enregistrer."); }
  if (m.type === "jete") finir(true);
}
let peer = null;
function ecouter() {
  if (!D.lien || !window.Peer) { TEL_TXT = D.lien ? "Lien impossible : recharge la page" : "Pas de lien pour ce compte"; majMenu(); return; }
  peer = new Peer("pokefit-rameur-" + D.lien);
  peer.on("open", () => { TEL_TXT = "En attente du téléphone"; majMenu(); });
  peer.on("connection", c => {
    c.on("open", () => { if (conn && conn !== c) { try { conn.close(); } catch (e) {} } conn = c; });
    c.on("data", d => { conn = c; recevoir(d); });
    c.on("close", () => { if (conn !== c) return; conn = null; telOk = false; TEL_TXT = "Téléphone déconnecté"; majMenu(); if (S.etat === "course") { $("tel").hidden = false; $("tel").textContent = "Téléphone perdu : il se reconnecte…"; } });
  });
  peer.on("disconnected", () => setTimeout(() => { try { if (!peer.destroyed) peer.reconnect(); } catch (e) {} }, 3000));
  peer.on("error", e => { if (["unavailable-id", "network", "server-error", "socket-error"].includes(e.type)) { TEL_TXT = "Je réessaie de me relier…"; majMenu(); try { peer.destroy(); } catch (x) {} setTimeout(ecouter, 8000); } });
}
async function allumer() { for (const w of [window, window.parent]) { try { await w.navigator.wakeLock.request("screen"); return; } catch (e) {} } }
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") allumer(); });
const docPlein = () => { try { if (window.parent.document.fullscreenElement) return window.parent.document; } catch (e) {} return document.fullscreenElement ? document : null; };
function pleinEcran() { if (docPlein()) return; for (const d of (() => { try { return [window.parent.document, document]; } catch (e) { return [document]; } })()) { try { const p = d.documentElement.requestFullscreen(); if (p) { p.catch(() => {}); return; } } catch (e) {} } }

/* ============ commandes ============ */
$("bPartir").onclick = () => { audio(); if (!$("bPartir").disabled) demarrer(); };
$("bEssai").onclick = () => { audio(); essai = true; majMenu(); };
$("pSon").onclick = () => { audio(); sonOn = !sonOn; $("pSon").textContent = "Son : " + (sonOn ? "oui" : "non"); };
$("bPlein").onclick = () => { const d = docPlein(); if (d) d.exitFullscreen(); else pleinEcran(); };
$("bPause").onclick = () => { $("pauseTxt").textContent = `${fmt(S.t)} · ${Math.round(S.dist)} m. ${essai ? "" : "Le téléphone continue de compter : la séance ne s'arrête que si tu la termines."}`; $("pause").hidden = false; };
$("pReprendre").onclick = () => { $("pause").hidden = true; };
$("pChanger").onclick = () => { $("pause").hidden = true; const L = NAGEURS.map((_, i) => i).filter(debloque); choisir(L[(L.indexOf(choix) + 1) % L.length]); flash(1); };
tenir($("pTerminer"), terminer);
$("bCoup").onclick = e => { e.stopPropagation(); coup(.65 + Math.random() * .2); };
$("bAuto").onclick = e => { e.stopPropagation(); S.auto = !S.auto; $("bAuto").classList.toggle("on", S.auto); };
cv.addEventListener("pointerdown", () => { audio(); if (essai && S.etat === "course") coup(.6 + Math.random() * .25); });
addEventListener("keydown", e => { if (e.code === "Space" && essai && S.etat === "course") { e.preventDefault(); coup(.7); } });
