/* ============ le jeu : la vitesse vient des gestes de la machine ; le moteur dessine, le jeu compte ============ */
// Les chiffres sont vrais (distance, temps, allure, cadence : ceux de la machine) ; seul le décor triche : il défile plus ou moins
// vite selon le niveau, la pièce, la pente et la machine (piste.js : ALL ; allure.js : MACHINE.allure).
// Chaque geste fait avancer d'exactement M_COUP vrais mètres (l'élan s'épuise, mais sa somme vaut M_COUP) ; sa force ne change que l'éclaboussure.
const ELAN = BOUCLE ? (NIVEAU.elan === undefined ? 120 : NIVEAU.elan) : 0;   // sur un circuit, on part avant la ligne (mètres de décor) : le chrono démarre lancé
const S = {s: PARAMS.has("s") ? +PARAMS.get("s") : BOUCLE ? LONG - ELAN : 6, v: 0, vL: 0, vn: 0, vd: 0, t: 0, dist: 0, nb: 0, coupsT: [], auto: false, prochain: .6, elan: 0, fondu: 0, fige: PARAMS.has("fige"),
  tour: 0, tourT0: 0, tours: [], enAir: false, v1: 0, v2: 0,
  mode: null, lance: false, pause: false, debutMur: 0, t0: 0, pauseTot: 0, pauseDebut: 0};   // mode : null = le menu, "vraie" = une vraie séance (la montre), "essai" = sans montre
function coup(force = .6, muet = false) {   // un geste de la machine ; muet : un geste rattrapé (il compte, sans éclaboussure)
  if (!S.mode || S.pause) return;
  if (!S.lance) { S.lance = true; S.debutMur = Date.now(); S.t0 = performance.now(); S.pauseTot = 0; majBoutons(); }   // le chrono de la séance part au premier geste, comme sur l'écran du rameur
  S.v += M_COUP / TAU; S.nb++; S.coupsT.push(S.t); if (S.coupsT.length > 8) S.coupsT.shift();
  if (muet) return;
  S.elan = 1; sonCoup(force, M.liquide);
  if (M.liquide) { gerbe(S.s, force, M.d, M.y); EAU_U.uCoups.value[S.nb % 4].set(S.s - .3, M.d, COMMUNS.uT.value); }
}
function vitesseCapteur(v) { S.v = v; S.capteur = true; }   // pour un capteur de vitesse continue (home trainer), plus tard : v en vrais m/s
const cadence = () => { const c = S.coupsT, n = c.length; if (n < 2 || S.t - c[n - 1] > 6) return 0; const k = Math.min(4, n - 1); return 60 / ((c[n - 1] - c[n - 1 - k]) / k); };

/* les tours d'un circuit : le chrono part au premier passage de la ligne ; le meilleur tour est gardé sur cette machine, par machine de sport */
const CLE_RECORD = "riviere_" + (MACHINE_NOM === "rameur" ? "" : MACHINE_NOM + "_") + (NIVEAU.id || NIVEAU.nom) + "_" + (NIVEAU.distance || Math.round(TOUR_M)) + "m_record";
let record = 0; try { record = +localStorage.getItem(CLE_RECORD) || 0; } catch (e) {}
const chrono = s => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0") + "," + Math.floor(s * 10 % 10);
function annoncer(texte) { const a = $("annonce"); a.textContent = texte; a.classList.remove("vu"); void a.offsetWidth; a.classList.add("vu"); }
function passerLaLigne() {
  if (S.tour === 0) { S.tour = 1; S.tourT0 = S.t; fantomeDepart(); annoncer("TOP CHRONO !"); sonTinte([660, 880]); return; }
  const t = S.t - S.tourT0, vraie = S.mode === "vraie" && !PARAMS.has("s"), mieux = !record || t < record; S.tours.push(t); S.tour++; S.tourT0 = S.t;
  fantomeTour(t, mieux && vraie);
  if (mieux && vraie) { record = t; try { localStorage.setItem(CLE_RECORD, String(t)); } catch (e) {} }
  annoncer("TOUR " + (S.tour - 1) + " · " + chrono(t) + (mieux && S.mode === "vraie" ? " · RECORD !" : ""));
  sonTinte(mieux && S.mode === "vraie" ? [660, 880, 1320] : [660, 880]);
}

function hud() {
  $("vTemps").textContent = fmt(S.t); $("vCad").textContent = Math.round(cadence());
  $("vVit").textContent = MACHINE.affiche === "kmh" ? (S.vL * 3.6).toFixed(1) : S.vL > .6 ? fmt(500 / S.vL) : "-:--";
  $("vDist").textContent = Math.round(S.dist); $("vCoeur").textContent = MONTRE.h && performance.now() - MONTRE.vu < 15000 ? MONTRE.h : "--"; majCarte();
  const titre = pieceEn(S.s).titre; if ($("vLieu").textContent !== titre) $("vLieu").textContent = titre;
  if (BOUCLE) {
    const n = S.tours.length;
    $("vTour").textContent = S.tour ? "Tour " + S.tour + "  " + chrono(S.t - S.tourT0) : "Élan · " + Math.max(0, Math.round((TOUR_VRAI - vrai(S.s)) / MACHINE.allure)) + " m";
    $("vTours").textContent = (n ? "Dernier " + chrono(S.tours[n - 1]) : "") + (record ? (n ? " · " : "") + "Record " + chrono(record) : "");
  }
}

/* ---- la qualité qui s'adapte : si la machine peine, une image un peu moins fine puis une vue un peu moins longue, tour à tour.
   Si baisser ne change rien (l'écran est bridé, par exemple en économie d'énergie), on remet et on n'insiste pas ; quand tout va bien, on remonte. ---- */
const IMAGES_MAX = PARAMS.has("eco") ? 30 : 60;   // jamais plus (un téléphone à 120 images/s chaufferait pour rien) ; ?eco=1 : 30
const QUALITE = {crans: [], bas: 0, haut: 0, essai: null, gel: 0, bloque: 0};
function porter(b1) { COMMUNS.uB1.value = b1; scene.fog.far = b1; camera.far = b1 + 20; camera.updateProjectionMatrix(); POST.mat.uniforms.uF.value = camera.far; }   // voir moins loin (la brume se rapproche d'autant) : moins de décor à dessiner
function cran(nom, sens) { if (nom === "finesse") { FINESSE.cran += sens; tailleEcran(); } else porter(COMMUNS.uB1.value * (sens > 0 ? .82 : 1 / .82)); }
function regler(ips) {   // une fois par seconde
  const q = QUALITE;
  if (BANC || PARAMS.has("h") || VUE.mode !== "jeu" || document.visibilityState !== "visible" || T < 4) { q.bas = q.haut = 0; return; }
  if (q.essai) {
    if (--q.essai.attente > 0) return;
    const e = q.essai; q.essai = null;
    if (e.sens > 0) { if (ips < e.avant * 1.12) { cran(e.nom, -1); q.crans.pop(); q.gel = 90; } }                // baisser n'a rien changé : on remet, et on n'essaie plus pendant 90 s
    else if (ips < IMAGES_MAX * .87) { cran(e.nom, 1); q.crans.push(e.nom); q.bloque = 180; }                    // remonter était trop : on redescend
    return;
  }
  if (q.gel > 0) q.gel--; if (q.bloque > 0) q.bloque--;
  q.bas = ips < IMAGES_MAX * .75 && ips > 8 ? q.bas + 1 : 0; q.haut = ips >= IMAGES_MAX * .95 ? q.haut + 1 : 0;
  if (q.bas >= 2 && !q.gel && q.crans.length < 6) {
    let nom = q.crans.length % 2 ? "vue" : "finesse";
    if (nom === "vue" && COMMUNS.uB1.value <= 220) nom = "finesse"; if (nom === "finesse" && HAUT <= 380) nom = COMMUNS.uB1.value > 220 ? "vue" : null;
    q.bas = 0; if (!nom) return;
    cran(nom, 1); q.crans.push(nom); q.essai = {nom, sens: 1, avant: ips, attente: 3};
  } else if (q.haut >= 20 && q.crans.length && !q.bloque) { const nom = q.crans.pop(); cran(nom, -1); q.essai = {nom, sens: -1, attente: 3}; q.haut = 0; }
}

let T = 0, dernier = performance.now(); const FPS = {n: 0, t: 0, v: 0};
function boucle(now) {
  requestAnimationFrame(boucle);
  if (now - dernier < 1000 / IMAGES_MAX - 1.2) return;   // pas plus de 60 images par seconde
  const ecoule = (now - dernier) / 1000, vraiDt = clamp(ecoule, 0, 1), dt = Math.min(vraiDt, .05); dernier = now; T += dt; COMMUNS.uT.value = T;   // le temps, la cadence et la distance suivent la vraie horloge, même si la machine rame (les animations, elles, sont bornées)
  if (BANC && !BANC.fini) bancAvance(vraiDt);
  else if (!S.fige && S.mode && !S.pause) {
    if (S.lance || S.mode === "essai") S.t = (now - S.t0 - S.pauseTot) / 1000;   // le temps = la vraie horloge depuis le premier geste, moins les pauses
    if (S.auto && S.t >= S.prochain) { coup(.5 + Math.random() * .35); S.prochain = S.t + 60 / (MACHINE.cadence * (1 + .12 * Math.sin(S.t * .05))); }
    const e = Math.exp(-vraiDt / TAU), f = 1 - Math.exp(-vraiDt / LISSE); if (!S.capteur) S.v *= e; S.v1 += (S.v - S.v1) * f; S.v2 += (S.v1 - S.v2) * f;
    const pas = S.v2 * vraiDt, A = PISTE.ALL[idx(S.s)] * MACHINE.allure; S.s += pas * A; S.dist += pas; S.vd = S.v2 * A;
  } else S.vd = 0;
  S.elan = Math.max(0, S.elan - dt * 2.5); S.vL = lerp(S.vL, S.v2, clamp(dt / 1.2, 0, 1)); S.vn = clamp((S.vL - MACHINE.v0) / (MACHINE.v1 - MACHINE.v0), 0, 1.2);
  if (BOUCLE) { if (S.s >= LONG) { S.s -= LONG; if (!BANC) passerLaLigne(); } }
  else {
    if (S.s > LONG - 14 && !S.fondu) S.fondu = .01;   // au bout d'un niveau ouvert : fondu au blanc, et on repart du début
    if (S.fondu) { S.fondu += dt * 1.4; if (S.fondu >= 1 && S.s > LONG / 2) { S.s = 6; M.y = null; CAM.y = null; } if (S.fondu >= 2) S.fondu = 0; $("voile").style.opacity = S.fondu ? (S.fondu < 1 ? S.fondu : 2 - S.fondu) : 0; }
  }
  const tunnel = dansTunnel(S.s);
  COMMUNS.uSombre.value = lerp(COMMUNS.uSombre.value, tunnel ? .86 : 1, clamp(dt * 3, 0, 1));
  animerMonture(T, dt, S); cadrer(dt, S, T); animerPublic(T, S); animerFantome(T); animerGouttes(dt); animerDecor(T);
  sonMaj(S.s, !!tunnel);
  dessiner(); hud();
  if (BANC && !BANC.fini) bancImage(ecoule);
  FPS.n++; FPS.t += vraiDt;
  if (FPS.t >= 1) {
    FPS.v = Math.round(FPS.n / FPS.t); FPS.n = 0; FPS.t = 0; regler(FPS.v);
    const [w, h] = tailleImage(); if (w !== canvas.width || h !== canvas.height) tailleEcran();
    if (PARAMS.has("perf")) $("vFps").textContent = canvas.width + " × " + HAUT + " · " + FPS.v + " i/s · " + renderer.info.render.triangles + " triangles · " + renderer.info.render.calls + " objets";
  }
}

/* les commandes : toucher l'écran ou la barre d'espace = un geste (en essai seulement) ; « Auto » avance tout seul */
function majAuto() { $("bAuto").classList.toggle("on", S.auto); }
$("bAuto").addEventListener("pointerdown", e => { e.stopPropagation(); S.auto = !S.auto; S.prochain = S.t + .3; majAuto(); });
function majSon() { $("bSon").classList.toggle("off", !SON.actif); $("bSon").textContent = SON.actif ? "Son" : "Son coupé"; }
$("bSon").addEventListener("pointerdown", e => { e.stopPropagation(); sonBasculer(); majSon(); });
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
  VUE.mode = m; const loin = m === "haut"; COMMUNS.uB0.value = loin ? 9000 : B0; COMMUNS.uB1.value = loin ? 19000 : B1; scene.fog.near = COMMUNS.uB0.value; scene.fog.far = COMMUNS.uB1.value;
  camera.far = loin ? 6000 : 420; camera.fov = 52; camera.updateProjectionMatrix(); POST.mat.uniforms.uF.value = camera.far; CIEL.m.visible = !loin;
};
window.__piste = () => PISTE.pieces.map(p => [p.titre, Math.round(p.long0 || p.long), p.s1 - p.s0, +(+p.virage).toFixed(1), +(+p.monte || 0).toFixed(1)]);   // les pièces : longueur demandée, longueur réelle, virage, montée
window.__verif = verifier;
window.__image = () => { animerMonture(T, 0, S); cadrer(0, S, T); animerPublic(T, S); dessiner(); hud(); return Math.round(S.s); };   // redessiner tout de suite (pour une capture)

/* ============ le départ : on construit le monde depuis les fichiers, puis on lance ============ */
(async () => {
  const t0 = performance.now();
  try { await Promise.race([document.fonts.load('20px "Jersey 15"'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  construireTerrain(); construireRives(); construirePiste(); construirePonts(); construireTunnels(); construireDecor(); await construireSprites();
  window.__pret = Math.round(performance.now() - t0); if (VUE.mode !== "jeu") window.__vue(VUE.mode);
  const v = verifier(); if (!v.ok) console.warn("Niveau à revoir :\n" + v.erreurs.join("\n"));
  $("hTour").hidden = !BOUCLE; $("lVit").textContent = MACHINE.affiche === "kmh" ? "VITESSE" : "ALLURE"; $("uVit").textContent = MACHINE.affiche === "kmh" ? "km/h" : "/500 m";
  majAuto(); majSon(); $("charge").hidden = true; requestAnimationFrame(boucle);
  if (BANC) lancerBanc();
  else if (PARAMS.has("s") || PARAMS.has("fige") || VUE.mode !== "jeu") commencer(PARAMS.get("auto") === "0" ? "vraie" : "essai");   // les vues de contrôle partent tout de suite
  else ouvrirMenu();
})().catch(e => { $("charge").textContent = "Erreur : " + e.message; console.error(e); });
