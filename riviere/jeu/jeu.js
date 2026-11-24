/* ============ le jeu : la vitesse vient des gestes de la machine ; le moteur dessine, le jeu compte ============ */
// Les chiffres sont vrais (distance, temps, allure, cadence : ceux de la machine) ; seul le décor triche : il défile plus ou moins
// vite selon le niveau, la pièce, la pente et la machine (piste.js : ALL ; allure.js : MACHINE.allure).
// Chaque geste fait avancer d'exactement M_COUP vrais mètres (× son amplitude au marcheur elliptique : montre.js) (l'élan s'épuise, mais sa somme vaut M_COUP) ; sa force ne change que l'éclaboussure.
const ELAN = BOUCLE ? (NIVEAU.elan === undefined ? 120 : NIVEAU.elan) : 0;   // sur un circuit, on part avant la ligne (mètres de décor) : le chrono démarre lancé
const S = {s: PARAMS.has("s") ? +PARAMS.get("s") : BOUCLE ? LONG - ELAN : 6, v: 0, vL: 0, vn: 0, vd: 0, t: 0, dist: 0, nb: 0, coupsT: [], auto: false, prochain: .6, elan: 0, fondu: 0, fige: PARAMS.has("fige"),
  tour: 0, tourT0: 0, tours: [], enAir: false, v1: 0, v2: 0,
  mode: null, lance: false, pause: false, debutMur: 0, t0: 0, pauseTot: 0, pauseDebut: 0};   // mode : null = le menu, "vraie" = une vraie séance (la montre), "essai" = sans montre
function demarrerChrono() { if (S.lance) return; S.lance = true; S.debutMur = Date.now(); S.t0 = performance.now(); S.pauseTot = 0; S.t = 0; majBoutons(); if (!BOUCLE) rivauxDepart(); }
function coup(force = .6, muet = false, fois = 1) {   // un geste de la machine ; muet : un geste rattrapé (il compte, sans éclaboussure) ; fois : ses mètres selon son amplitude (montre.js)
  if (!S.mode || S.pause) return;
  demarrerChrono();   // le chrono de la séance part au premier geste, comme sur l'écran du rameur
  S.v += M_COUP * fois / TAU; S.mG = (S.mG || 0) + M_COUP * fois; S.nb++; S.coupsT.push(S.t); if (S.coupsT.length > 8) S.coupsT.shift();
  // les gestes minute par minute (pauses retirées) : dans Poké Fit, une minute de rameur à 20 coups ou plus = une minute de sport (seances_rameur.minutes_sport)
  if (S.mode === "vraie") { S.cad = S.cad || []; const m = Math.floor(S.t / 60); while (S.cad.length <= m) S.cad.push(0); S.cad[m]++; }
  if (muet) return;
  S.elan = 1; S.coupT = T; sonCoup(force, M.liquide);
  if (M.liquide) { gerbe(S.s, force, M.d, M.y, GABARIT.hw); EAU_U.uCoups.value[S.nb % 4].set(S.s - .3, M.d, COMMUNS.uT.value); }
}
function vitesseCapteur(v) { S.v = v; S.capteur = true; if (S.mode === "vraie" && !BT.faux) S.capteurVu = true; }   // (16/11) le faux home trainer ne compte jamais   // capteurVu : un vrai capteur a fait avancer cette séance (elle peut être gardée)   // pour un capteur de vitesse continue (home trainer), plus tard : v en vrais m/s
const cadence = () => { if (BT.cadence !== null && performance.now() - BT.vu < 4000) return BT.cadence; const c = S.coupsT, n = c.length; if (MACHINE.monture === "cycliste" && MACHINE.physique && n < 2) return VELO.cadence || 0; if (n < 2 || S.t - c[n - 1] > 6) return 0; const k = Math.min(4, n - 1); return 60 / ((c[n - 1] - c[n - 1 - k]) / k); };   // (à vélo sans capteur de cadence : celle des pédales qu'on voit tourner)

/* les tours d'un circuit : le chrono part au premier passage de la ligne ; le meilleur tour, par machine de sport, est gardé sur le serveur
   (records.js) et sur cette machine : on prend le meilleur des deux */
const CLE_RECORD = "riviere_" + CLE_CIRCUIT + "_record";
let record = 0; try { record = +localStorage.getItem(CLE_RECORD) || 0; } catch (e) {}
if (tourServeur() && (!record || tourServeur().t < record)) record = tourServeur().t;
const chrono = s => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0") + "," + Math.floor(s * 10 % 10);
function annoncer(texte) { const a = $("annonce"); a.textContent = texte; a.classList.remove("vu"); void a.offsetWidth; a.classList.add("vu"); }
function passerLaLigne() {
  if (S.tour === 0) { S.tour = 1; S.tourT0 = S.t; fantomeDepart(); rivauxDepart(); annoncer("TOP CHRONO !"); sonTinte([660, 880]); return; }
  const t = S.t - S.tourT0, vraie = S.mode === "vraie" && !PARAMS.has("s"), mieux = !record || t < record; S.tours.push(t); S.tour++; S.tourT0 = S.t;
  fantomeTour(t, mieux && vraie); filmEvenement({type: "tour", n: S.tour - 1, tl: t, record: mieux && S.mode === "vraie"});
  if (mieux && vraie) { record = t; try { localStorage.setItem(CLE_RECORD, String(t)); } catch (e) {} }
  annoncer("TOUR " + (S.tour - 1) + " · " + chrono(t) + (mieux && S.mode === "vraie" ? " · RECORD !" : ""));
  sonTinte(mieux && S.mode === "vraie" ? [660, 880, 1320] : [660, 880]);
}

function hud() {
  $("vTemps").textContent = fmt(S.t); $("vCad").textContent = Math.round(cadence());
  $("vVit").textContent = MACHINE.affiche === "kmh" ? (S.vL * 3.6).toFixed(1) : S.vL > .6 ? fmt(500 / S.vL) : "-:--";
  $("vDist").textContent = Math.round(S.dist); if (MACHINE.pas) $("vPas").textContent = S.nb * MACHINE.pas; $("vCoeur").textContent = MONTRE.h && performance.now() - MONTRE.vu < 15000 ? MONTRE.h : "--"; majCarte();
  const titre = pieceEn(S.s).titre; if ($("vLieu").textContent !== titre) $("vLieu").textContent = titre;
  const watts = BT.appareil && BT.puissance !== null && performance.now() - BT.vu < 4000 ? BT.puissance : MACHINE.physique && S.auto && S.mode === "essai" ? 150 : null;
  if (($("hWatts").hidden = watts === null) === false) $("vWatts").textContent = Math.round(watts);
  $("vSeg").textContent = texteSegment() || classement(); majProfil();
  if (!BOUCLE) { const n = S.tours.length; $("vTour").textContent = "Parcours " + (n + 1) + "  " + chrono(Math.max(0, S.t - S.tourT0)); $("vTours").textContent = (n ? "Dernier " + chrono(S.tours[n - 1]) : "") + (record ? (n ? " · " : "") + "Record " + chrono(record) : ""); }
  if (BOUCLE) {
    const n = S.tours.length;
    $("vTour").textContent = S.tour ? "Tour " + S.tour + "  " + chrono(S.t - S.tourT0) : "Élan · " + Math.max(0, Math.round((TOUR_VRAI - vrai(S.s)) / MACHINE.allure)) + " m";
    $("vTours").textContent = (n ? "Dernier " + chrono(S.tours[n - 1]) : "") + (record ? (n ? " · " : "") + "Record " + chrono(record) : "");
  }
}

/* ---- la qualité qui s'adapte : si la machine peine, une image un peu moins fine puis une vue un peu moins longue, tour à tour.
   Si baisser ne change rien (l'écran est bridé, par exemple en économie d'énergie), on remet et on n'insiste pas ; quand tout va bien, on remonte. ---- */
const IMAGES_MAX = PARAMS.has("eco") ? 30 : 60;   // jamais plus (un téléphone à 120 images/s chaufferait pour rien) ; ?eco=1 : 30
const QUALITE = {crans: [], bas: 0, haut: 0, essai: null, gel: 0, bloque: 0, vains: {}};   // vains : les effets qu'il n'a servi à rien de couper (on ne réessaie pas)
function porter(b1) { VISION.b1 = b1; camera.far = b1 + 20; camera.updateProjectionMatrix(); POST.mat.uniforms.uF.value = camera.far; }   // voir moins loin (la brume se rapproche d'autant) : moins de décor à dessiner
function cran(nom, sens) { if (nom === "ombres") couperOmbres(sens > 0); else if (nom === "foret") { for (const m of MONDE.foret) m.visible = sens < 0; OMBRES.cle = ""; } else if (nom === "finesse") { FINESSE.cran += sens; tailleEcran(); } else porter(VISION.b1 * (sens > 0 ? .82 : 1 / .82)); }
function regler(ips) {   // une fois par seconde
  const q = QUALITE;
  if (BANC || PARAMS.has("h") || VUE.mode !== "jeu" || document.visibilityState !== "visible" || T < 4) { q.bas = q.haut = 0; return; }
  if (q.essai) {
    if (--q.essai.attente > 0) return;
    const e = q.essai; q.essai = null;
    if (e.sens > 0) { if (ips < e.avant * 1.12) { cran(e.nom, -1); q.crans.pop(); if (e.nom === "ombres" || e.nom === "foret") { q.vains[e.nom] = 1; q.gel = 3; } else q.gel = 90; } }                // baisser n'a rien changé : on remet, et on n'essaie plus pendant 90 s
    else if (ips < IMAGES_MAX * .87) { cran(e.nom, 1); q.crans.push(e.nom); q.bloque = 180; }                    // remonter était trop : on redescend
    return;
  }
  if (q.gel > 0) q.gel--; if (q.bloque > 0) q.bloque--;
  q.bas = ips < IMAGES_MAX * .75 && ips > 8 ? q.bas + 1 : 0; q.haut = ips >= IMAGES_MAX * .95 ? q.haut + 1 : 0;
  const effets = (OMBRES.cible ? ["ombres"] : []).concat((MONDE.foret || []).length ? ["foret"] : []), manque = effets.find(k => !q.crans.includes(k) && !q.vains[k]), autres = q.crans.filter(k => k !== "ombres" && k !== "foret").length;   // d'abord les effets (étape 9 du plan) : les ombres, puis la forêt en masse
  if (q.bas >= 2 && !q.gel && (manque || autres < 6)) {
    let nom = manque || (autres % 2 ? "vue" : "finesse");
    if (!manque) { if (nom === "vue" && VISION.b1 <= 220) nom = "finesse"; if (nom === "finesse" && HAUT <= 380) nom = VISION.b1 > 220 ? "vue" : null; }
    q.bas = 0; if (!nom) return;
    cran(nom, 1); q.crans.push(nom); q.essai = {nom, sens: 1, avant: ips, attente: 3};
  } else if (q.haut >= 20 && q.crans.length && !q.bloque) { const nom = q.crans.pop(); cran(nom, -1); q.essai = {nom, sens: -1, attente: 3}; q.haut = 0; }
}

let T = 0, dernier = performance.now(); const FPS = {n: 0, t: 0, v: 0, pire: 0};
function boucle(now) {
  requestAnimationFrame(boucle);
  if (MENU.ouvert && !FILM.actif && !(BANC && !BANC.fini)) { dernier = now; return; }   // (17/11) le menu cache tout : rien à dessiner derrière
  if (now - dernier < 1000 / IMAGES_MAX - 1.2) return;   // pas plus de 60 images par seconde
  const ecoule = (now - dernier) / 1000, vraiDt = clamp(ecoule, 0, 1), dt = Math.min(vraiDt, .05); dernier = now; if (!S.fige) T += dt; COMMUNS.uT.value = T;   // ?fige=1 fige aussi le temps des animations (les captures de référence en ont besoin)
  //   // le temps, la cadence et la distance suivent la vraie horloge, même si la machine rame (les animations, elles, sont bornées)
  if (BANC && !BANC.fini) bancAvance(vraiDt);
  else if (FILM.actif) filmAvance(vraiDt);   // le résumé de la séance (film.js) : ton trajet rejoué
  else if (!S.fige && S.mode && !S.pause) {
    if (S.lance || S.mode === "essai") S.t = (now - S.t0 - S.pauseTot) / 1000;   // le temps = la vraie horloge depuis le premier geste, moins les pauses
    if (S.auto && !MACHINE.physique && S.t >= S.prochain) { coup(.5 + Math.random() * .35); S.prochain = S.t + 60 / (MACHINE.cadence * (1 + .12 * Math.sin(S.t * .05))); }
    capteursMaj(vraiDt);   // un capteur de vitesse ou de puissance (home trainer) : c'est lui qui donne S.v
    const e = Math.exp(-vraiDt / TAU), f = 1 - Math.exp(-vraiDt / LISSE); if (!S.capteur) S.v *= e; S.v1 += (S.v - S.v1) * f; S.v2 += (S.v1 - S.v2) * f;
    const pas = S.v2 * vraiDt, A = VISUEL ? allureVue(idx(S.s), S.v2) : (MACHINE.physique ? PISTE.ALL0 : PISTE.ALL)[idx(S.s)] * MACHINE.allure; S.s += pas * A; S.dist += pas; S.vd = S.v2 * A;   // une machine qui ressent la pente pour de vrai : le décor ne triche plus avec elle
    parcoursMaj(); if (S.lance) filmNoter();
  } else S.vd = 0;
  const da = FILM.actif ? dt * FILM.rate : dt; if (FILM.actif) { T += da - dt; COMMUNS.uT.value = T; }   // le ralenti du film : les animations aussi
  S.croisiere = (MACHINE.physique ? 7.5 : MACHINE.cadence * M_COUP / 60) * MACHINE.allure * ALLURE;   // pour le zoom de la caméra : la vitesse du décor à l'allure habituelle
  S.elan = Math.max(0, S.elan - dt * 2.5); S.vL = lerp(S.vL, S.v2, clamp(dt / 1.2, 0, 1)); S.vn = clamp((S.vL - MACHINE.v0) / (MACHINE.v1 - MACHINE.v0), 0, 1.2);
  S.phi = S.coupT === undefined || !S.mode ? 9 : (T - S.coupT) / clamp(60 / (cadence() || MACHINE.cadence || 24), 1.2, 4);   // où on en est du geste : 0 = il vient de partir, 1 = le suivant est attendu (monture.js : la nage suit tes coups)
  if (BOUCLE) { if (S.s >= LONG) { S.s -= LONG; if (!BANC) passerLaLigne(); } }
  else {
    if (S.s > LONG - 14 && !S.fondu && !FILM.actif) { S.fondu = .01; arrivee(); }   // au bout d'un parcours ouvert : son temps, un fondu au blanc, et on repart du début
    if (S.fondu) { S.fondu += dt * 1.4; if (S.fondu >= 1 && S.s > LONG / 2) { S.s = 6; M.y = null; CAM.y = null; } if (S.fondu >= 2) S.fondu = 0; $("voile").style.opacity = S.fondu ? (S.fondu < 1 ? S.fondu : 2 - S.fondu) : 0; }
  }
  const tunnel = dansTunnel(S.s);
  animerMonture(T, da, S); cadrer(da, S, T); if (FILM.actif) filmCadrer(); tronconsMaj(); ambianceMaj(da, S.s); lumieresProches(); animerPublic(T, S, da);
  if (!FILM.actif) { effortMaj(vraiDt); fourchesMaj(); animerFantome(T); animerRivaux(T, vraiDt); }
  rencontresMaj(T, da); animerGouttes(da); animerDecor(T); animerLointain(T); raretesMaj(da, S);   // (17/11) un avion, une montgolfière… très rarement (raretes.js)
  sonMaj(S.s, !!tunnel);
  effetsMaj(T, AMB.m, AMB.nuit); dessiner(); if (!FILM.actif) hud();
  if (BANC && !BANC.fini) bancImage(ecoule);
  FPS.n++; FPS.t += vraiDt; if (ecoule < .5) FPS.pire = Math.max(FPS.pire, ecoule * 1000);   // (la page cachée puis revenue ne compte pas comme un à-coup)
  if (FPS.t >= 1) {
    FPS.v = Math.round(FPS.n / FPS.t); const pire = Math.round(FPS.pire); FPS.n = 0; FPS.t = 0; FPS.pire = 0; regler(FPS.v);
    const [w, h] = tailleImage(); if (w !== canvas.width || h !== canvas.height) tailleEcran();
    /* (18/11, Kiki) les images par seconde toujours à l'écran en jeu, pour voir si les 60 tiennent : vert = 58 et plus sans à-coup,
       orange = un peu en dessous ou une image qui a traîné (plus de 25 ms), rouge = sous 45 ; « pire » = l'image la plus lente de la seconde */
    const v = $("vFps"), cible = IMAGES_MAX;
    v.className = "hud " + (FPS.v >= cible - 2 && pire <= 25 ? "ok" : FPS.v >= cible * .75 ? "moyen" : "mal");
    v.innerHTML = FPS.v + " <small>i/s · pire " + pire + " ms</small>" + (PARAMS.has("perf") ? "<small><br>" + canvas.width + " × " + HAUT + " · " + renderer.info.render.triangles + " triangles · " + renderer.info.render.calls + " objets</small>" : "");
  }
}

/* les commandes : toucher l'écran ou la barre d'espace = un geste (en essai seulement) ; « Auto » avance tout seul */
function majAuto() { $("bAuto").classList.toggle("on", S.auto); }
$("bAuto").addEventListener("pointerdown", e => { e.stopPropagation(); S.auto = !S.auto; S.prochain = S.t + .3; majAuto(); });
function majSon() { $("bSon").classList.toggle("off", !SON.actif); $("bSon").textContent = SON.actif ? "Son" : "Son coupé"; }
$("bSon").addEventListener("pointerdown", e => { e.stopPropagation(); sonBasculer(); majSon(); });
/* le plein écran (Kiki, 12/11) : demandé tout seul au premier toucher (un navigateur ne l'accorde qu'après un geste) ; le petit bouton sous « Son »
   en sort ou y revient. Dans l'appli, c'est la page de l'appli qui passe en plein écran (le jeu la recouvre déjà) ; si tu en sors (bouton, Échap),
   il ne revient plus tout seul pendant cette visite. */
const PLEIN = {doc: (() => { try { return window.parent !== window && window.parent.document.documentElement ? window.parent.document : document; } catch (e) { return document; } })(), non: false, voulu: false};
try { PLEIN.non = sessionStorage.getItem("riviere_plein_non") === "1"; } catch (e) {}
const enPlein = () => !!(PLEIN.doc.fullscreenElement || PLEIN.doc.webkitFullscreenElement);
function pleinEcran(oui) {
  const d = PLEIN.doc, el = d.documentElement;
  try {
    if (oui && !enPlein()) { const f = el.requestFullscreen || el.webkitRequestFullscreen; if (f) { PLEIN.voulu = true; const r = f.call(el, {navigationUI: "hide"}); if (r && r.catch) r.catch(() => {}); } }
    else if (!oui && enPlein()) { const f = d.exitFullscreen || d.webkitExitFullscreen; if (f) f.call(d); }
  } catch (e) {}
}
function majPlein() { $("bPlein").textContent = enPlein() ? "✕ Plein écran" : "⛶ Plein écran"; $("bPlein").hidden = !(PLEIN.doc.fullscreenEnabled || PLEIN.doc.webkitFullscreenEnabled); }
function pasEnPlein(oui) { PLEIN.non = oui; try { sessionStorage.setItem("riviere_plein_non", oui ? "1" : "0"); } catch (e) {} }
for (const ev of ["pointerup", "click"]) addEventListener(ev, e => { if (!PLEIN.non && !enPlein() && !(e.target.closest && e.target.closest("#bPlein, .b-plein"))) pleinEcran(true); }, true);
for (const ev of ["fullscreenchange", "webkitfullscreenchange"]) PLEIN.doc.addEventListener(ev, () => { if (!enPlein() && PLEIN.voulu) pasEnPlein(true); majPlein(); });
$("bPlein").addEventListener("pointerdown", e => e.stopPropagation());
$("bPlein").addEventListener("click", e => { e.stopPropagation(); const oui = !enPlein(); pasEnPlein(!oui); pleinEcran(oui); });
majPlein();
/* l'écran ne s'éteint pas pendant la séance : on le redemande à chaque retour sur la page (la demande se perd dès qu'on la quitte) */
const VEILLE = {verrou: null};
async function eveiller() {
  if (VEILLE.verrou && !VEILLE.verrou.released) return;
  for (const nav of [navigator, (() => { try { return window.parent !== window ? window.parent.navigator : null; } catch (e) { return null; } })()]) {
    try { if (nav && nav.wakeLock) { VEILLE.verrou = await nav.wakeLock.request("screen"); return; } } catch (e) {}
  }
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && S.mode) eveiller(); });
const essai = () => S.mode === "essai";   // toucher l'écran n'avance qu'en essai : pendant une vraie séance, seule la montre fait avancer
addEventListener("pointerdown", e => { eveiller(); sonDemarrer(); if (!essai() || S.pause || e.target.closest("button, .panneau")) return; S.auto = false; majAuto(); coup(.7); });
addEventListener("keydown", e => { if (!essai() || S.pause || e.target.closest("input")) return; if (e.code === "Space") { e.preventDefault(); S.auto = false; majAuto(); coup(.7); } else if (e.key === "a") { S.auto = !S.auto; majAuto(); } });
window.__aller = s => { S.s = s; S.fondu = 0; M.y = null; CAM.y = null; return s; };
window.__vue = m => {
  VUE.mode = m; const loin = m === "haut"; VISION.b0 = loin ? 9000 : B0; VISION.b1 = loin ? 19000 : B1;
  camera.far = loin ? 6000 : 420; camera.fov = 52; camera.updateProjectionMatrix(); POST.mat.uniforms.uF.value = camera.far; CIEL.m.visible = !loin;
};
window.__piste = () => PISTE.pieces.map(p => [p.titre, Math.round(p.long0 || p.long), p.s1 - p.s0, +(+p.virage).toFixed(1), +(+p.monte || 0).toFixed(1)]);   // les pièces : longueur demandée, longueur réelle, virage, montée
window.__verif = verifier;
window.__image = () => { animerMonture(T, 0, S); cadrer(0, S, T); tronconsMaj(true); ambianceMaj(0, S.s); lumieresProches(); animerPublic(T, S, 0); effetsMaj(T, AMB.m, AMB.nuit); dessiner(); hud(); return Math.round(S.s); };   // redessiner tout de suite (pour une capture)

/* ============ le départ : on construit le monde depuis les fichiers, puis on lance ============ */
// (17/11, Kiki : « on s'en fout de voir le circuit derrière le menu, ça fait un chargement inutile ») : le menu s'ouvre TOUT DE SUITE, sur un fond
// tout simple, sans le monde ; le circuit choisi se construit derrière, invisible, par petites étapes (le menu reste vivant entre deux), et le
// bouton « Commencer » se remplit au fur et à mesure (CHANTIER.part, de 0 à 1). Toucher « Commencer » avant la fin : ça part dès que c'est prêt.
// Les vues de contrôle (?s=, ?fige, ?vue=, ?banc=1) attendent le monde derrière l'écran de chargement, comme avant.
const CHANTIER = {pret: false, part: 0, ensuite: [], suivis: [], depart: null, ms: 0, etapes: []};   // etapes : [part, ms] de chaque étape (pour régler les parts)
window.__chantier = CHANTIER;
function quandMonde(f) { if (CHANTIER.pret) return f(); CHANTIER.ensuite.push(f); }   // ce qui touche au monde (changer de Pokémon, d'adversaires…) attend qu'il soit là
const pause0 = () => new Promise(r => { CHANTIER.bloc = Math.max(CHANTIER.bloc || 0, performance.now() - (CHANTIER.repris || performance.now())); let fait = false; const ok = () => { if (!fait) { fait = true; CHANTIER.repris = performance.now(); r(); } }; requestAnimationFrame(() => setTimeout(ok, 0)); setTimeout(ok, 80); });   // laisser l'écran se redessiner (la barre avance)
async function batirMonde() {
  const vers = but => async () => { CHANTIER.part += (but - CHANTIER.part) * .1; for (const s of CHANTIER.suivis) s(CHANTIER.part); await pause0(); };   // pendant une longue étape, la barre avance doucement vers sa fin
  const t0 = performance.now(), etape = async (f, part) => { const a = performance.now(); await f(); CHANTIER.etapes.push([part, Math.round(performance.now() - a)]); CHANTIER.part = part; for (const s of CHANTIER.suivis) s(part); await pause0(); };
  // les parts : le temps que prend chaque étape (mesuré le 17/11 : le terrain la moitié, le décor un quart, sur la Baie de Carmin comme sur Céladopole)
  if (TRONCONS) await etape(tronconsDemarrer, .45);   // (16/11, lot 3) une longue route : seulement ce qui entoure le départ, le reste au fil de la route (moteur/troncons.js)
  else { await etape(() => construireTerrain(vers(.5)), .5); await etape(construireRives, .58); await etape(() => { construirePiste(); construirePlan(); }, .6); await etape(() => construireDecor(vers(.88)), .88); }
  await etape(() => { construireMassif(); construirePonts(); construireTunnels(); construireLointain(); construireAmbiance(); }, .91);
  await etape(construireSprites, .98); await etape(() => { construireRencontres(); construireFourches(); construireOmbres(); }, .99);
  window.__pret = CHANTIER.ms = Math.round(performance.now() - t0); if (VUE.mode !== "jeu") window.__vue(VUE.mode);
  const v = verifier(); if (!v.ok) console.warn("Niveau à revoir :\n" + v.erreurs.join("\n"));
  $("hTour").hidden = false; construireProfil(); await preparerRivaux(); $("lVit").textContent = MACHINE.affiche === "kmh" ? "VITESSE" : "ALLURE"; $("uVit").textContent = MACHINE.affiche === "kmh" ? "km/h" : "/500 m";
  majAuto(); majSon(); requestAnimationFrame(boucle);
  CHANTIER.pret = true; CHANTIER.part = 1; for (const s of CHANTIER.suivis) s(1);
  for (const f of CHANTIER.ensuite.splice(0)) { try { await f(); } catch (e) { console.error(e); } }
  if (CHANTIER.depart) { const m = CHANTIER.depart; CHANTIER.depart = null; commencer(m); }   // « Commencer » touché pendant la construction
}
(async () => {
  try { await Promise.race([document.fonts.load('20px "Jersey 15"'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  if (BANC || PARAMS.has("s") || PARAMS.has("fige") || VUE.mode !== "jeu") {   // les vues de contrôle : le monde d'abord, puis tout de suite la course
    await batirMonde(); $("charge").hidden = true;
    if (BANC) lancerBanc(); else commencer(PARAMS.get("auto") === "0" ? "vraie" : "essai");
    return;
  }
  $("charge").hidden = true; ouvrirMenu();   // le menu d'abord, le monde ensuite, derrière
  await new Promise(r => setTimeout(r, 120)); await batirMonde();
})().catch(e => { $("charge").hidden = false; $("charge").textContent = "Erreur : " + e.message; console.error(e); });
