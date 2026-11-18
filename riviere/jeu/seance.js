/* ============ la séance : le menu, la fin, ce qu'affiche le rameur, l'enregistrement (11/11, Kiki) ============ */
// Une vraie séance : la montre rame, le chrono part au premier coup, chaque tour est chronométré ; « Fin » arrête tout, on entre ce qu'affiche
// le rameur (distance, temps, calories : tout facultatif) et la séance part comme celles du téléphone : localStorage pkm_rameur, puis la page
// de l'appli se recharge et l'envoie (app.py, envoyer_rameur → seances_rameur.ranger). L'essai (sans montre) n'enregistre jamais rien.
// Toutes les machines (14/11, étape 1 du plan) : même séance, avec "machine" ; le marcheur elliptique sans saisie (pas d'écran : sa distance est
// l'estimation vers le bas du jeu, gardée à part dans "estime", jamais comptée), le vélo seulement avec un vrai capteur ("capteur" : sa distance).
const ATTENTE = "pkm_rameur", ENCOURS = "riviere_encours";
const lireLS = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const ecrireLS = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
const isoLocal = ms => { const d = new Date(ms), o = -d.getTimezoneOffset(), z = x => String(Math.floor(Math.abs(x))).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}${o < 0 ? "-" : "+"}${z(o / 60)}:${z(o % 60)}`; };
const metres = m => Math.round(m).toLocaleString("fr-FR");
const aDuContenu = b => b.nb > 0 || (MACHINE.continu && b.dist > 20);   // une séance qui vaut d'être gardée (le vélo n'a pas de « coups »)
const gardable = b => MACHINE.enregistre && (!MACHINE.capteurRequis || !!b.capteur);
const DANS_APPLI = (() => { try { return window.parent !== window && !!window.parent.location.href; } catch (e) { return false; } })();

function panneau(html) { const p = $("panneau"); p.innerHTML = `<div class="boite">${html}</div>`; p.hidden = false; return p; }
function fermerPanneau() { $("panneau").hidden = true; $("panneau").innerHTML = ""; }
function majBoutons() { $("bAuto").hidden = S.mode !== "essai"; $("bFin").hidden = !S.mode || S.pause; $("hPret").hidden = !(S.mode === "vraie" && !S.lance && !S.pause); }

/* le menu (refait le 17/11) : jeu/menu.js */
/* le circuit du jour (15/11, étape 5 du plan) : tiré par GitHub cette nuit, le même pour tout le monde (D.jour, riviere/jour.py) ; son classement =
   le meilleur tour de chaque joueur sur ce circuit et cette machine, pris dans les records du serveur (un record part avec la séance enregistrée) */
function classementDuJour() {
  if (!NIVEAU.jour || !D.jour) return "";
  const lignes = (((D.jour.classement || {})[DISCIPLINE] || {})[MACHINE_NOM] || []).slice(0, 10), pour = {rameur: "au rameur", elliptique: "au marcheur elliptique", velo: "à vélo"}[MACHINE_NOM] || "";
  const esc2 = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<div class="classement"><small>CLASSEMENT DU JOUR ${pour.toUpperCase()}</small>${lignes.length ? `<ol>${lignes.map(l => `<li${l.moi ? ' class="moi"' : ""}><span>${esc2(l.nom)}</span><b>${chrono(l.t)}</b></li>`).join("")}</ol>`
    : `<p class="petit">Personne n'a encore bouclé un tour aujourd'hui : le premier tour d'une séance enregistrée prend la tête.</p>`}
    <p class="petit">Un nouveau circuit chaque matin. Ton meilleur tour compte une fois la séance enregistrée.</p></div>`;
}
function majTexteFantome() { const el = $("mFantome"); if (!el) return;
  el.textContent = FANTOME.choix === "aucun" ? "Pas de fantôme." : FANTOME.choix === "record" ? (FANTOME.record ? "Ton record (" + chrono(FANTOME.record.t) + ") nage avec toi dès le premier tour." : "Pas encore de record : ton meilleur tour de la séance le remplace dès le 2e tour.") : "Ton meilleur tour de cette séance nage avec toi dès le 2e tour."; }
function majMenuMontre() {
  const el = $("mMontre"); if (!el) return;
  const la = MONTRE.sujet && MONTRE.vu && performance.now() - MONTRE.vu < 12000;
  el.className = "etat-montre" + (la ? " la" : "");
  if (MACHINE_NOM === "velo") { el.className = "etat-montre" + (BT.appareil ? " la" : ""); el.textContent = BT.appareil ? BT.nom + " relié" : "Relie ton home trainer : Réglages, Capteur Bluetooth"; return; }
  el.textContent = !MONTRE.sujet ? "Pas de lien avec la montre ici : seul l'essai marche." : la ? "Montre reliée" + (MONTRE.h ? " · ♥ " + MONTRE.h : "") : "Sur la montre : « Capteurs », " + (MACHINE.montre || MACHINE.nom) + ", ● Enregistrer";
}
setInterval(majMenuMontre, 1000);

/* départ : on remet tout à zéro, avant la ligne */
function commencer(mode) {
  if (!CHANTIER.pret) { CHANTIER.depart = mode; majMenuDepart(); return; }   // (17/11) le monde n'est pas fini : on part dès qu'il l'est
  fermerMenu();
  Object.assign(S, {mode, s: PARAMS.has("s") ? +PARAMS.get("s") : BOUCLE ? LONG - ELAN : 6, v: 0, v1: 0, v2: 0, vL: 0, vn: 0, t: 0, dist: 0, nb: 0, mG: 0, coupsT: [], cad: [], tour: 0, tourT0: 0, tours: [],
    lance: false, pause: false, capteurVu: false, debutMur: 0, t0: performance.now(), pauseTot: 0, auto: mode === "essai" && PARAMS.get("auto") !== "0", prochain: .6});
  M.y = null; CAM.y = null; sonDemarrer(); eveiller();
  S.capteur = false; BT.v = 0; BT.coups = null; RIVAUX.t0 = null; for (const r of RIVAUX.liste) r.vr = 0; SEG.actif = null; SEG.faits = []; SEG.dernier = null;
  fermerPanneau(); majAuto(); majBoutons(); fantomeChoisi(); fourchesDepart(); filmDepart();
  if (mode === "essai") annoncer("ESSAI : TOUCHE L'ÉCRAN");
}

/* pendant la séance : on la garde sur la machine toutes les 10 s (un onglet fermé, une coupure : on la récupère au menu) */
const bilanDe = () => ({machine: MACHINE_NOM, debutMur: S.debutMur, t: S.t, nb: S.nb, cad: (S.cad || []).slice(), dist: MACHINE.continu ? S.dist : Math.max(S.dist, S.mG || 0), tours: S.tours.slice(), segments: SEG.faits.slice(), capteur: !!S.capteurVu, maj: Date.now()});
setInterval(() => { if (S.mode === "vraie" && S.lance && !S.pause && MACHINE.enregistre) ecrireLS(ENCOURS, bilanDe()); }, 10000);

function mettrePause() { S.pause = true; S.pauseDebut = performance.now(); majBoutons(); }
function reprendre() { S.pauseTot += performance.now() - S.pauseDebut; S.pause = false; fermerPanneau(); majBoutons(); }
$("bFin").addEventListener("pointerdown", e => { e.stopPropagation();
  if (FILM.actif) return;
  if (S.mode === "essai" || !gardable(bilanDe())) { mettrePause(); filmJouer(finEssai); return; }   // d'abord le film de la séance (film.js), puis le résumé
  mettrePause(); if (S.lance) ecrireLS(ENCOURS, bilanDe());
  filmJouer(() => ouvrirFin(bilanDe(), false)); });

function resume(b) {
  const meilleur = b.tours.length ? Math.min(...b.tours) : 0;
  return `<div class="chiffres"><div><small>TEMPS</small>${fmt(b.t)}</div><div><small>${MACHINE.gestes}</small>${b.nb}</div>
    <div><small>CADENCE</small>${b.t > 20 ? Math.round(b.nb / (b.t / 60)) : 0}/min</div><div><small>DISTANCE</small>${MACHINE.saisie || MACHINE.capteurRequis ? "" : "≈ "}${metres(b.dist)} m</div></div>
    ${b.tours.length ? `<div class="tours">${b.tours.map((t, i) => `<span class="${t === meilleur && b.tours.length > 1 ? "mieux" : ""}">Tour ${i + 1} · ${chrono(t)}</span>`).join("")}</div>` : `<p class="petit">Aucun tour complet.</p>`}
    ${(b.segments || []).length ? `<div class="tours">${b.segments.map(g => `<span>${g.nom} · ${chrono(g.t)}</span>`).join("")}</div>` : ""}`;
}
function finEssai() {
  const essai = S.mode === "essai";
  const p = panneau(`<h1>${essai ? "Fin de l'essai" : "Fin de la séance"}</h1>${resume(bilanDe())}${NIVEAU.brouillon ? blocGarder("f") : ""}<p class="petit">${essai ? "Un essai n'est jamais enregistré." : MACHINE.capteurRequis ? "Aucun capteur Bluetooth n'a donné ta vitesse : sans lui, je ne sais pas ce que tu as vraiment fait, cette séance ne comptera nulle part." : "Les séances de cette machine ne sont pas encore enregistrées dans l'appli : celle-ci ne comptera nulle part."}</p>
    <div class="choix"><button class="${NIVEAU.brouillon ? "sec" : "rouge"}" id="fMenu">${NIVEAU.brouillon ? "" : "▶ "}${essai ? "Retour au menu" : "Terminer (rien n'est gardé)"}</button><button class="sec" id="fReprendre">Reprendre</button>${filmRevoirBouton()}</div>`);
  if (p.querySelector("#fFilm")) p.querySelector("#fFilm").onclick = () => { fermerPanneau(); filmJouer(finEssai); };
  p.querySelector("#fMenu").onclick = () => { ecrireLS(ENCOURS, null); ouvrirMenu(); };
  p.querySelector("#fReprendre").onclick = reprendre;
  if (NIVEAU.brouillon) relierGarder("f");
}

/* la fin d'une vraie séance : ce qu'affiche le rameur, au pavé numérique (la tablette n'a pas toujours de clavier) */
function ouvrirFin(b, recuperee, deja) {   // deja : ce qui était entré avant « Revoir le film »
  if (!aDuContenu(b)) { ecrireLS(ENCOURS, null); ouvrirMenu(); return; }
  const champs = Object.assign({dist: "", min: "", sec: "", kcal: ""}, deja); let actif = "dist", jeter = 0;
  const p = panneau(`<h1>${recuperee ? "Séance interrompue" : "Fin de la séance"}</h1>
    <div class="choix"><button class="sec" id="fJeter">✕ Annuler la séance (elle ne comptera pas)</button></div>${resume(b)}
    ${MACHINE.saisie ? `<h2>Ce qu'affiche ton rameur</h2>
    <div class="saisie">
      <label data-c="dist"><small>DISTANCE</small><span></span> m</label>
      <label data-c="min" class="court"><small>TEMPS</small><span></span> min</label><label data-c="sec" class="court"><small>&nbsp;</small><span></span> s</label>
      <label data-c="kcal"><small>CALORIES</small><span></span> kcal</label>
    </div>
    <div class="pave">${[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map(k => `<button class="touche" data-k="${k}" ${k === "" ? "disabled" : ""}>${k}</button>`).join("")}</div>
    <p class="petit">Tout est facultatif : sans temps, je garde celui du jeu (${fmt(b.t)}).</p>` : `<p class="petit">${MACHINE.capteurRequis ? "Distance mesurée par ton capteur." : "Ta machine n'affiche rien : la distance est une estimation vers le bas (≈) ; dans Poké Fit, seul ton temps compte."}</p>`}
    <p class="alerte" id="fErreur"></p>
    <div class="choix">
      <button class="rouge" id="fGarder">▶ Enregistrer la séance</button>
      ${recuperee ? "" : `<button class="sec" id="fReprendre">Reprendre</button>${filmRevoirBouton()}`}
    </div>`);
  if (!recuperee && p.querySelector("#fFilm")) p.querySelector("#fFilm").onclick = () => { const c = Object.assign({}, champs); fermerPanneau(); filmJouer(() => ouvrirFin(b, false, c)); };
  const maj = () => p.querySelectorAll(".saisie label").forEach(l => { const c = l.dataset.c; l.classList.toggle("actif", c === actif); l.querySelector("span").textContent = champs[c] || (c === "dist" ? "—" : c === "kcal" ? "—" : "--"); });
  p.querySelectorAll(".saisie label").forEach(l => l.onclick = () => { actif = l.dataset.c; maj(); });
  p.querySelectorAll(".touche").forEach(t => t.onclick = () => { const k = t.dataset.k, max = {dist: 6, min: 3, sec: 2, kcal: 4}[actif];
    if (k === "⌫") champs[actif] = champs[actif].slice(0, -1); else if (champs[actif].length < max) champs[actif] = (champs[actif] + k).replace(/^0+(?=\d)/, "");
    if (actif === "sec" && +champs.sec > 59) champs.sec = "59"; maj(); });
  if (MACHINE.saisie) maj();
  if (!recuperee) p.querySelector("#fReprendre").onclick = reprendre;
  p.querySelector("#fJeter").onclick = e => { if (++jeter < 2) { e.target.textContent = "Sûr ? Touche encore : rien ne sera gardé"; return; } ecrireLS(ENCOURS, null); ouvrirMenu(); };
  p.querySelector("#fGarder").onclick = () => {
    const n = c => (+champs[c] > 0 ? +champs[c] : null), temps = n("min") || n("sec") ? (n("min") || 0) * 60 + (n("sec") || 0) : null;
    const err = garder(b, MACHINE.saisie ? {distance: n("dist"), temps_s: temps, kcal: n("kcal")} : {distance: null, temps_s: null, kcal: null});
    if (err) p.querySelector("#fErreur").textContent = err;
  };
}

function garder(b, saisi) {
  const duree = saisi.temps_s || Math.round(b.t), debut = b.debutMur || Date.now() - b.t * 1000, meilleur = b.tours.length ? Math.min(...b.tours) : null;
  const s = {id: isoLocal(debut).slice(0, 19).replace("T", "-").replace(/:/g, ""), version: 1, machine: MACHINE_NOM, source: MACHINE.capteurRequis ? "capteur" : "montre",
    debut: isoLocal(debut), fin: isoLocal(debut + duree * 1000), duree_s: duree, actif_s: Math.round(b.t), coups: b.nb, cadence: b.t > 20 && b.nb ? Math.round(b.nb / (b.t / 60) * 10) / 10 : null,
    ...(b.cad && b.cad.length ? {par_min: {cad: b.cad}} : {}),
    saisi: {distance: saisi.distance, temps_s: saisi.temps_s, watts: null, kcal: saisi.kcal},
    ...(MACHINE.saisie ? {} : MACHINE.capteurRequis ? {capteur: {distance: Math.round(b.dist)}} : {estime: {distance: Math.round(b.dist)}}),
    jeu: {mode: "riviere", niveau: NIVEAU.id, tour_m: Math.round(TOUR_M), dist: Math.round(b.dist), tours: b.tours.length,
      meilleur_tour: meilleur && Math.round(meilleur * 10) / 10, temps_tours: b.tours.map(t => Math.round(t * 10) / 10), segments: b.segments || [], heure: AMB.heure, meteo: AMB.meteo}};
  const deja = (lireLS(ATTENTE, []) || []).filter(a => a.seance && a.seance.id !== s.id);
  const recs = recordsAEnvoyer();   // tes records battus pendant que le serveur ne les avait pas : ils partent avec la séance (records.js)
  if (!ecrireLS(ATTENTE, [...deja, {seance: s, ...(recs ? {records: recs} : {})}])) return "Impossible de garder la séance sur cette machine (plus de place ?).";
  ecrireLS(ENCOURS, null);
  // le rechargement de l'appli peut prendre quelques secondes : le formulaire disparaît tout de suite (une seule séance gardée, même si on retouche)
  const p = panneau(`<h1>Séance gardée !</h1>${resume(b)}<p>${DANS_APPLI ? "Je l'envoie et je recharge, ça peut prendre quelques secondes." : "Gardée sur cette machine. Hors de l'appli (essai sur le PC), elle n'est pas envoyée."}</p>
    <div class="choix">${DANS_APPLI ? "" : `<button class="rouge" id="gMenu">▶ Retour au menu</button>`}</div>`);
  if (DANS_APPLI) setTimeout(() => { try { window.parent.location.reload(); } catch (e) { location.reload(); } }, 400);
  else p.querySelector("#gMenu").onclick = ouvrirMenu;
  return null;
}
