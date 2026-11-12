/* ============ la séance : le menu, la fin, ce qu'affiche le rameur, l'enregistrement (11/11, Kiki) ============ */
// Une vraie séance : la montre rame, le chrono part au premier coup, chaque tour est chronométré ; « Fin » arrête tout, on entre ce qu'affiche
// le rameur (distance, temps, calories : tout facultatif) et la séance part comme celles du téléphone : localStorage pkm_rameur, puis la page
// de l'appli se recharge et l'envoie (app.py, envoyer_rameur → seances_rameur.ranger). L'essai (sans montre) n'enregistre jamais rien.
const ATTENTE = "pkm_rameur", ENCOURS = "riviere_encours";
const lireLS = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const ecrireLS = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
const isoLocal = ms => { const d = new Date(ms), o = -d.getTimezoneOffset(), z = x => String(Math.floor(Math.abs(x))).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}${o < 0 ? "-" : "+"}${z(o / 60)}:${z(o % 60)}`; };
const metres = m => Math.round(m).toLocaleString("fr-FR");
const DANS_APPLI = (() => { try { return window.parent !== window && !!window.parent.location.href; } catch (e) { return false; } })();

function panneau(html) { const p = $("panneau"); p.innerHTML = `<div class="boite">${html}</div>`; p.hidden = false; return p; }
function fermerPanneau() { $("panneau").hidden = true; $("panneau").innerHTML = ""; }
function majBoutons() { $("bAuto").hidden = S.mode !== "essai"; $("bFin").hidden = !S.mode || S.pause; $("hPret").hidden = !(S.mode === "vraie" && !S.lance && !S.pause); }

/* le menu : ce qu'on voit en arrivant. En haut l'essentiel (le circuit, la montre, commencer) ; dessous, repliés : l'ambiance, la machine, les adversaires, le fantôme */
const HEURES_MENU = [["circuit", "Du circuit"], ["reelle", "Heure réelle"], ["matin", "Matin"], ["jour", "Jour"], ["soir", "Soir"], ["nuit", "Nuit"], ["cycle", "Journée qui défile"]];
const METEOS_MENU = [["circuit", "Du circuit"], ["beau", "Beau"], ["variable", "Variable"], ["nuages", "Nuages"], ["pluie", "Pluie"], ["orage", "Orage"], ["brume", "Brume"], ["neige", "Neige"]];
const ACTIVITE = {rameur: "eau", elliptique: "terre", velo: "terre"};   // l'activité de chaque machine : ses circuits à elle (eau : rivières ; terre : routes et chemins)
const boutons = (liste, choisi, attr) => liste.map(([k, t]) => `<button class="opt${choisi === k ? " on" : ""}" data-${attr}="${k}">${t}</button>`).join("");
function choisirCircuit(id) {   // un autre circuit : on le garde pour les prochaines fois, et la page repart avec lui
  if (FORCE) { try { sessionStorage.setItem("riviere_niveau_une_fois", id); } catch (e) {} } else ecrireReglage("riviere_niveau_" + disciplineDe(NIVEAUX[id] || CIRCUITS_PERSO[id]), id);
  relancer();
}
function ouvrirMenu() {
  S.mode = null; S.pause = false; majBoutons();
  const enc = lireLS(ENCOURS, null), reprise = enc && enc.nb > 0 && Date.now() - enc.maj < 12 * 3600e3 ? enc : null;
  const attend = (lireLS(ATTENTE, []) || []).length, der = D.derniere;
  const circuits = Object.entries(NIVEAUX).filter(([k, n]) => !n.cache && disciplineDe(n) === DISCIPLINE).map(([k, n]) => [k, n.nom || k]).concat(Object.entries(CIRCUITS_PERSO).filter(([k, n]) => disciplineDe(n) === DISCIPLINE).map(([k, n]) => [k, "✏️ " + (n.nom || k)]));
  const hChoix = PARAMS.get("heure") || lireReglage("riviere_heure", "circuit") || "circuit", mChoix = PARAMS.get("meteo") || lireReglage("riviere_meteo", "circuit") || "circuit";
  const p = panneau(`<h1>${NIVEAU.nom}${NIVEAU.brouillon ? " <small style='font-size:.5em;color:#B05010'>(brouillon)</small>" : ""}</h1>
    <p class="sous">${MACHINE.nom}${BOUCLE ? " · un tour = " + metres(TOUR_M) + " m" : " · " + metres(TOUR_M) + " m"}${record ? " · record " + chrono(record) : ""}</p>
    <p class="etat-montre" id="mMontre"></p>
    ${attend ? `<p class="alerte">Une séance attend d'être envoyée : recharge la page.</p>` : ""}
    ${der ? `<p class="petit">Dernière séance : ${der.quand}${der.distance ? " · " + metres(der.distance) + " m" : ""}${der.tours ? " · " + der.tours + " tour" + (der.tours > 1 ? "s" : "") : ""}</p>` : ""}
    <div class="choix">
      ${NIVEAU.brouillon ? `<button class="rouge" id="mEditeur2">✏️ Retour à l'éditeur</button>` : ""}
      ${reprise ? `<button class="rouge" id="mReprise">▶ Récupérer la séance interrompue (${fmt(reprise.t)})</button>` : ""}
      <button class="rouge" id="mGo">▶ Commencer la séance</button>
      <button class="sec" id="mEssai">Essayer sans montre</button>
    </div>
    <details class="pli" ${circuits.length > 1 ? "" : "hidden"}><summary>Circuit : ${NIVEAU.nom}</summary>
      <div class="fantomes">${circuits.map(([k, t]) => `<button class="opt${(NIVEAU.id || "") === k ? " on" : ""}" data-c="${k}">${t}</button>`).join("")}</div>
      <div class="fantomes"><button class="opt" id="mEditeur">✏️ Créer ou modifier un circuit</button></div></details>
    <details class="pli"><summary>Ambiance : l'heure et le temps</summary>
      <div class="fantomes"><small>L'HEURE</small>${boutons(HEURES_MENU, hChoix, "h")}</div>
      <div class="fantomes"><small>LE TEMPS</small>${boutons(METEOS_MENU, mChoix, "m")}</div></details>
    <details class="pli"><summary>Machine : ${MACHINE.nom}</summary>
      <div class="fantomes"><small>SUR L'EAU (les rivières)</small>${boutons([["rameur", MACHINES.rameur.nom]], MACHINE_NOM, "machine")}</div>
      <div class="fantomes"><small>SUR LA TERRE (routes, chemins, rues : d'autres circuits)</small>${boutons(Object.entries(MACHINES).filter(([k]) => ACTIVITE[k] === "terre").map(([k, m]) => [k, m.nom]), MACHINE_NOM, "machine")}</div>
      ${MACHINE_NOM === "elliptique" ? `<div class="fantomes"><small>TON POKÉMON À L'ELLIPTIQUE</small>${boutons([["coureur", "Il court"], ["cycliste", "À vélo"]], MACHINE.monture === "cycliste" ? "cycliste" : "coureur", "monture")}</div>` : ""}
      <div class="fantomes"><small>CAPTEUR BLUETOOTH (home trainer, rameur ou elliptique connecté, ceinture cardio)</small>
        <button class="opt" id="mBT" ${BT_OK ? "" : "disabled"}>Relier un capteur</button><p class="petit" id="mBTetat">${BT_OK ? BT.etat || "Rien de relié." : "Ce navigateur ne parle pas Bluetooth (Chrome ou Edge le font)."}</p></div></details>
    <details class="pli"><summary>Adversaires et fantôme</summary>
      <div class="fantomes"><small>ADVERSAIRES (des Pokémon qui tiennent une allure réglée sur la tienne)</small>${boutons([["aucun", "Aucun"], ["tranquilles", "Tranquilles"], ["coriaces", "Coriaces"]], RIVAUX.choix, "r")}</div>
      <div class="fantomes"><small>TON FANTÔME</small>${boutons([["record", "Mon record"], ["seance", "Meilleur tour de la séance"], ["aucun", "Aucun"]], FANTOME.choix, "f")}<p class="petit" id="mFantome"></p></div>
      <div class="fantomes"><small>SON</small><button class="opt${SON.actif ? " on" : ""}" id="mSon">${SON.actif ? "Bruitages" : "Coupé"}</button></div></details>`);
  let sur = 0;   // une séance interrompue se perdrait : deux touchers (le cadre de l'appli n'autorise pas les fenêtres de confirmation)
  const un = (sel, liste, f) => p.querySelectorAll(sel).forEach(b => b.onclick = () => { p.querySelectorAll(sel).forEach(x => x.classList.toggle("on", x === b)); f(b); });
  p.querySelector("#mGo").onclick = e => { if (reprise && ++sur < 2) { e.target.textContent = "La séance interrompue sera perdue : touche encore"; return; } ecrireLS(ENCOURS, null); commencer("vraie"); };
  p.querySelector("#mEssai").onclick = () => commencer("essai");
  if (reprise) p.querySelector("#mReprise").onclick = () => ouvrirFin(reprise, true);
  if (NIVEAU.brouillon) p.querySelector("#mEditeur2").onclick = () => ouvrirEditeur();
  p.querySelector("#mEditeur").onclick = () => ouvrirEditeur();
  p.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { if (b.dataset.c !== NIVEAU.id || NIVEAU.brouillon) { b.textContent = "Chargement…"; choisirCircuit(b.dataset.c); } });
  un("[data-h]", null, b => { ecrireReglage("riviere_heure", b.dataset.h); reglerAmbiance(b.dataset.h === "circuit" ? NIVEAU.heure || "jour" : b.dataset.h, null); });   // on voit le ciel changer derrière le menu
  un("[data-m]", null, b => { ecrireReglage("riviere_meteo", b.dataset.m); reglerAmbiance(null, b.dataset.m === "circuit" ? NIVEAU.meteo || "beau" : b.dataset.m); });
  p.querySelectorAll("[data-machine]").forEach(b => b.onclick = () => { if (b.dataset.machine === MACHINE_NOM) return; ecrireReglage("riviere_machine", b.dataset.machine); if (ACTIVITE[b.dataset.machine] === "terre") ecrireReglage("riviere_machine_terre", b.dataset.machine); ecrireReglage("riviere_surface", null); b.textContent = "Chargement…"; relancer(); });
  p.querySelectorAll("[data-monture]").forEach(b => b.onclick = () => { if (b.dataset.monture === (MACHINE.monture === "cycliste" ? "cycliste" : "coureur")) return; ecrireReglage("riviere_monture_elliptique", b.dataset.monture); b.textContent = "Chargement…"; relancer(); });
  un("[data-r]", null, b => choisirRivaux(b.dataset.r));
  un("[data-f]", null, b => { choisirFantome(b.dataset.f); majTexteFantome(); });
  p.querySelector("#mBT").onclick = async e => { const el = $("mBTetat"), t = setInterval(() => { if (el.isConnected) el.textContent = BT.etat; }, 300); await relierCapteur(); clearInterval(t); if (el.isConnected) el.textContent = BT.etat; };
  p.querySelector("#mSon").onclick = e => { const oui = sonBasculer(); e.target.classList.toggle("on", oui); e.target.textContent = oui ? "Bruitages" : "Coupé"; majSon(); };
  majTexteFantome(); majMenuMontre();
}
function majTexteFantome() { const el = $("mFantome"); if (!el) return;
  el.textContent = FANTOME.choix === "aucun" ? "Pas de fantôme." : FANTOME.choix === "record" ? (FANTOME.record ? "Ton record (" + chrono(FANTOME.record.t) + ") nage avec toi dès le premier tour." : "Pas encore de record : ton meilleur tour de la séance le remplace dès le 2e tour.") : "Ton meilleur tour de cette séance nage avec toi dès le 2e tour."; }
function majMenuMontre() {
  const el = $("mMontre"); if (!el) return;
  const la = MONTRE.sujet && MONTRE.vu && performance.now() - MONTRE.vu < 12000;
  el.className = "etat-montre" + (la ? " la" : "");
  el.textContent = !MONTRE.sujet ? "Pas de lien avec la montre ici : seul l'essai marche." : la ? "Montre reliée" + (MONTRE.h ? " · ♥ " + MONTRE.h : "") : "Sur la montre : « Capteurs », " + MACHINE.nom + ", ● Enregistrer";
}
setInterval(majMenuMontre, 1000);

/* départ : on remet tout à zéro, avant la ligne */
function commencer(mode) {
  Object.assign(S, {mode, s: PARAMS.has("s") ? +PARAMS.get("s") : BOUCLE ? LONG - ELAN : 6, v: 0, v1: 0, v2: 0, vL: 0, vn: 0, t: 0, dist: 0, nb: 0, coupsT: [], tour: 0, tourT0: 0, tours: [],
    lance: false, pause: false, debutMur: 0, t0: performance.now(), pauseTot: 0, auto: mode === "essai" && PARAMS.get("auto") !== "0", prochain: .6});
  M.y = null; CAM.y = null; sonDemarrer(); eveiller();
  S.capteur = false; BT.v = 0; BT.coups = null; RIVAUX.t0 = null; for (const r of RIVAUX.liste) r.vr = 0; SEG.actif = null; SEG.faits = []; SEG.dernier = null;
  fermerPanneau(); majAuto(); majBoutons(); fantomeChoisi();
  if (mode === "essai") annoncer("ESSAI : TOUCHE L'ÉCRAN");
}

/* pendant la séance : on la garde sur la machine toutes les 10 s (un onglet fermé, une coupure : on la récupère au menu) */
const bilanDe = () => ({debutMur: S.debutMur, t: S.t, nb: S.nb, dist: MACHINE.continu ? S.dist : Math.max(S.dist, S.nb * M_COUP), tours: S.tours.slice(), segments: SEG.faits.slice(), maj: Date.now()});
setInterval(() => { if (S.mode === "vraie" && S.lance && !S.pause) ecrireLS(ENCOURS, bilanDe()); }, 10000);

function mettrePause() { S.pause = true; S.pauseDebut = performance.now(); majBoutons(); }
function reprendre() { S.pauseTot += performance.now() - S.pauseDebut; S.pause = false; fermerPanneau(); majBoutons(); }
$("bFin").addEventListener("pointerdown", e => { e.stopPropagation();
  if (S.mode === "essai" || !MACHINE.enregistre) { mettrePause(); finEssai(); return; }
  mettrePause(); if (S.lance) ecrireLS(ENCOURS, bilanDe());
  ouvrirFin(bilanDe(), false); });

function resume(b) {
  const meilleur = b.tours.length ? Math.min(...b.tours) : 0;
  return `<div class="chiffres"><div><small>TEMPS</small>${fmt(b.t)}</div><div><small>${MACHINE.gestes}</small>${b.nb}</div>
    <div><small>CADENCE</small>${b.t > 20 ? Math.round(b.nb / (b.t / 60)) : 0}/min</div><div><small>DISTANCE</small>${metres(b.dist)} m</div></div>
    ${b.tours.length ? `<div class="tours">${b.tours.map((t, i) => `<span class="${t === meilleur && b.tours.length > 1 ? "mieux" : ""}">Tour ${i + 1} · ${chrono(t)}</span>`).join("")}</div>` : `<p class="petit">Aucun tour complet.</p>`}
    ${(b.segments || []).length ? `<div class="tours">${b.segments.map(g => `<span>${g.nom} · ${chrono(g.t)}</span>`).join("")}</div>` : ""}`;
}
function finEssai() {
  const p = panneau(`<h1>Fin de l'essai</h1>${resume(bilanDe())}<p class="petit">${S.mode === "essai" ? "Un essai n'est jamais enregistré." : "Les séances de cette machine ne sont pas encore enregistrées dans l'appli."}</p>
    <div class="choix"><button class="rouge" id="fMenu">▶ Retour au menu</button><button class="sec" id="fReprendre">Reprendre</button></div>`);
  p.querySelector("#fMenu").onclick = ouvrirMenu;
  p.querySelector("#fReprendre").onclick = reprendre;
}

/* la fin d'une vraie séance : ce qu'affiche le rameur, au pavé numérique (la tablette n'a pas toujours de clavier) */
function ouvrirFin(b, recuperee) {
  if (!b.nb) { ecrireLS(ENCOURS, null); ouvrirMenu(); return; }
  const champs = {dist: "", min: "", sec: "", kcal: ""}; let actif = "dist", jeter = 0;
  const p = panneau(`<h1>${recuperee ? "Séance interrompue" : "Fin de la séance"}</h1>${resume(b)}
    <h2>Ce qu'affiche ton rameur</h2>
    <div class="saisie">
      <label data-c="dist"><small>DISTANCE</small><span></span> m</label>
      <label data-c="min" class="court"><small>TEMPS</small><span></span> min</label><label data-c="sec" class="court"><small>&nbsp;</small><span></span> s</label>
      <label data-c="kcal"><small>CALORIES</small><span></span> kcal</label>
    </div>
    <div class="pave">${[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map(k => `<button class="touche" data-k="${k}" ${k === "" ? "disabled" : ""}>${k}</button>`).join("")}</div>
    <p class="petit">Tout est facultatif : sans temps, je garde celui du jeu (${fmt(b.t)}).</p>
    <p class="alerte" id="fErreur"></p>
    <div class="choix">
      <button class="rouge" id="fGarder">▶ Enregistrer la séance</button>
      ${recuperee ? "" : `<button class="sec" id="fReprendre">Reprendre</button>`}
      <button class="sec" id="fJeter">Jeter la séance</button>
    </div>`);
  const maj = () => p.querySelectorAll(".saisie label").forEach(l => { const c = l.dataset.c; l.classList.toggle("actif", c === actif); l.querySelector("span").textContent = champs[c] || (c === "dist" ? "—" : c === "kcal" ? "—" : "--"); });
  p.querySelectorAll(".saisie label").forEach(l => l.onclick = () => { actif = l.dataset.c; maj(); });
  p.querySelectorAll(".touche").forEach(t => t.onclick = () => { const k = t.dataset.k, max = {dist: 6, min: 3, sec: 2, kcal: 4}[actif];
    if (k === "⌫") champs[actif] = champs[actif].slice(0, -1); else if (champs[actif].length < max) champs[actif] = (champs[actif] + k).replace(/^0+(?=\d)/, "");
    if (actif === "sec" && +champs.sec > 59) champs.sec = "59"; maj(); });
  maj();
  if (!recuperee) p.querySelector("#fReprendre").onclick = reprendre;
  p.querySelector("#fJeter").onclick = e => { if (++jeter < 2) { e.target.textContent = "Sûr ? Touche encore pour jeter"; return; } ecrireLS(ENCOURS, null); ouvrirMenu(); };
  p.querySelector("#fGarder").onclick = () => {
    const n = c => (+champs[c] > 0 ? +champs[c] : null), temps = n("min") || n("sec") ? (n("min") || 0) * 60 + (n("sec") || 0) : null;
    const err = garder(b, {distance: n("dist"), temps_s: temps, kcal: n("kcal")});
    if (err) p.querySelector("#fErreur").textContent = err;
  };
}

function garder(b, saisi) {
  const duree = saisi.temps_s || Math.round(b.t), debut = b.debutMur || Date.now() - b.t * 1000, meilleur = b.tours.length ? Math.min(...b.tours) : null;
  const s = {id: isoLocal(debut).slice(0, 19).replace("T", "-").replace(/:/g, ""), version: 1, source: "montre", debut: isoLocal(debut), fin: isoLocal(debut + duree * 1000),
    duree_s: duree, actif_s: Math.round(b.t), coups: b.nb, cadence: b.t > 20 ? Math.round(b.nb / (b.t / 60) * 10) / 10 : null,
    saisi: {distance: saisi.distance, temps_s: saisi.temps_s, watts: null, kcal: saisi.kcal},
    jeu: {mode: "riviere", niveau: NIVEAU.id, tour_m: Math.round(TOUR_M), dist: Math.round(b.dist), tours: b.tours.length,
      meilleur_tour: meilleur && Math.round(meilleur * 10) / 10, temps_tours: b.tours.map(t => Math.round(t * 10) / 10), segments: b.segments || [], heure: AMB.heure, meteo: AMB.meteo}};
  const deja = (lireLS(ATTENTE, []) || []).filter(a => a.seance && a.seance.id !== s.id);
  if (!ecrireLS(ATTENTE, [...deja, {seance: s}])) return "Impossible de garder la séance sur cette machine (plus de place ?).";
  ecrireLS(ENCOURS, null);
  // le rechargement de l'appli peut prendre quelques secondes : le formulaire disparaît tout de suite (une seule séance gardée, même si on retouche)
  const p = panneau(`<h1>Séance gardée !</h1>${resume(b)}<p>${DANS_APPLI ? "Je l'envoie et je recharge, ça peut prendre quelques secondes." : "Gardée sur cette machine. Hors de l'appli (essai sur le PC), elle n'est pas envoyée."}</p>
    <div class="choix">${DANS_APPLI ? "" : `<button class="rouge" id="gMenu">▶ Retour au menu</button>`}</div>`);
  if (DANS_APPLI) setTimeout(() => { try { window.parent.location.reload(); } catch (e) { location.reload(); } }, 400);
  else p.querySelector("#gMenu").onclick = ouvrirMenu;
  return null;
}
