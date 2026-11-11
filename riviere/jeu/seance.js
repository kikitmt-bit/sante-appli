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

/* le menu : ce qu'on voit en arrivant */
function ouvrirMenu() {
  S.mode = null; S.pause = false; majBoutons();
  const enc = lireLS(ENCOURS, null), reprise = enc && enc.nb > 0 && Date.now() - enc.maj < 12 * 3600e3 ? enc : null;
  const attend = (lireLS(ATTENTE, []) || []).length, der = D.derniere;
  const p = panneau(`<h1>${NIVEAU.nom}</h1>
    <p class="sous">${MACHINE.nom}${BOUCLE ? " · un tour = " + metres(TOUR_M) + " m" : ""}${record ? " · record du tour " + chrono(record) : ""}</p>
    <p class="etat-montre" id="mMontre"></p>
    ${attend ? `<p class="alerte">Une séance attend d'être envoyée : recharge la page.</p>` : ""}
    ${der ? `<p class="petit">Dernière séance : ${der.quand}${der.distance ? " · " + metres(der.distance) + " m" : ""}${der.tours ? " · " + der.tours + " tour" + (der.tours > 1 ? "s" : "") : ""}</p>` : ""}
    <div class="fantomes"><small>TON FANTÔME</small>${[["record", "Mon record"], ["seance", "Meilleur tour de la séance"], ["aucun", "Aucun"]].map(([k, t]) =>
      `<button class="opt${FANTOME.choix === k ? " on" : ""}" data-f="${k}">${t}</button>`).join("")}<p class="petit" id="mFantome"></p></div>
    <div class="fantomes"><small>SON</small><button class="opt${SON.actif ? " on" : ""}" id="mSon">${SON.actif ? "Bruitages" : "Coupé"}</button></div>
    <div class="choix">
      ${reprise ? `<button class="rouge" id="mReprise">▶ Récupérer la séance interrompue (${fmt(reprise.t)})</button>` : ""}
      <button class="rouge" id="mGo">▶ Commencer la séance</button>
      <button class="sec" id="mEssai">Essayer sans montre</button>
    </div>`);
  let sur = 0;   // une séance interrompue se perdrait : deux touchers (le cadre de l'appli n'autorise pas les fenêtres de confirmation)
  p.querySelector("#mGo").onclick = e => { if (reprise && ++sur < 2) { e.target.textContent = "La séance interrompue sera perdue : touche encore"; return; } ecrireLS(ENCOURS, null); commencer("vraie"); };
  p.querySelector("#mEssai").onclick = () => commencer("essai");
  if (reprise) p.querySelector("#mReprise").onclick = () => ouvrirFin(reprise, true);
  p.querySelectorAll("[data-f]").forEach(b => b.onclick = () => { choisirFantome(b.dataset.f); p.querySelectorAll("[data-f]").forEach(x => x.classList.toggle("on", x === b)); majTexteFantome(); });
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
  fermerPanneau(); majAuto(); majBoutons(); fantomeChoisi();
  if (mode === "essai") annoncer("ESSAI : TOUCHE L'ÉCRAN");
}

/* pendant la séance : on la garde sur la machine toutes les 10 s (un onglet fermé, une coupure : on la récupère au menu) */
const bilanDe = () => ({debutMur: S.debutMur, t: S.t, nb: S.nb, dist: Math.max(S.dist, S.nb * M_COUP), tours: S.tours.slice(), maj: Date.now()});
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
    ${b.tours.length ? `<div class="tours">${b.tours.map((t, i) => `<span class="${t === meilleur && b.tours.length > 1 ? "mieux" : ""}">Tour ${i + 1} · ${chrono(t)}</span>`).join("")}</div>` : `<p class="petit">Aucun tour complet.</p>`}`;
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
      meilleur_tour: meilleur && Math.round(meilleur * 10) / 10, temps_tours: b.tours.map(t => Math.round(t * 10) / 10)}};
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
