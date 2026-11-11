/* ============ le jeu : la vitesse vient des coups ; la caméra suit ton Pokémon, toujours au même angle ============ */
// Les chiffres sont vrais (distance, temps, allure, cadence : ceux du rameur) ; seul le décor triche : il défile ALLURE fois plus vite.
const TAU = 3.5;   // l'élan d'un coup s'épuise en 3,5 s
const LISSE = .8;  // (11/11, Kiki : « il avance par à-coups ») l'élan de chaque coup passe par deux filtres de 0,8 s : une glisse continue, à peine plus vive après chaque coup
const M_COUP = clamp(+D.m_coup || 9, 4, 16);   // mètres par coup : appris sur ses séances avec la montre (distance du rameur / coups de la montre), sinon 9 (ses séances du 06 au 11/11 : 9,0 à 9,1)
// Chaque coup fait avancer d'exactement M_COUP (l'élan s'épuise, mais sa somme vaut M_COUP) : à la fin, la distance du jeu = celle du rameur. La force du geste ne change que l'éclaboussure.
const ELAN = BOUCLE ? (NIVEAU.elan === undefined ? 120 : NIVEAU.elan) : 0;   // sur un circuit, on part avant la ligne (mètres de décor) : le chrono démarre lancé
const S = {s: PARAMS.has("s") ? +PARAMS.get("s") : BOUCLE ? LONG - ELAN : 6, v: 0, vL: 0, vn: 0, t: 0, dist: 0, nb: 0, coupsT: [], auto: false, prochain: .6, elan: 0, fondu: 0, fige: PARAMS.has("fige"),
  tour: 0, tourT0: 0, tours: [], enAir: false, v1: 0, v2: 0,
  mode: null, lance: false, pause: false, debutMur: 0, t0: 0, pauseTot: 0, pauseDebut: 0};   // mode : null = le menu, "vraie" = une vraie séance (la montre rame), "essai" = sans montre
function coup(force = .6) { if (!S.mode || S.pause) return;
  if (!S.lance) { S.lance = true; S.debutMur = Date.now(); S.t0 = performance.now(); S.pauseTot = 0; majBoutons(); }   // le chrono de la séance part au premier coup, comme sur l'écran du rameur
  S.v += M_COUP / TAU; S.nb++; S.elan = 1; S.coupsT.push(S.t); if (S.coupsT.length > 8) S.coupsT.shift();
  gerbe(S.s, force); const u = EAU_U.uCoups.value, k = S.nb % 4; u[k].set(S.s - .3, 0, COMMUNS.uT.value); }
const cadence = () => { const c = S.coupsT, n = c.length; if (n < 2 || S.t - c[n - 1] > 6) return 0; const k = Math.min(4, n - 1); return 60 / ((c[n - 1] - c[n - 1 - k]) / k); };

/* les tours d'un circuit : le chrono part au premier passage de la ligne ; le meilleur tour est gardé sur cette machine */
const CLE_RECORD = "riviere_" + (NIVEAU.id || NIVEAU.nom) + "_" + (NIVEAU.distance || LONG) + "m_record";   // un record par longueur de tour (et depuis le calibrage du 11/11 : les tours d'avant étaient plus longs)
let record = 0; try { record = +localStorage.getItem(CLE_RECORD) || 0; } catch (e) {}
const chrono = s => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0") + "," + Math.floor(s * 10 % 10);
function annoncer(texte) { const a = $("annonce"); a.textContent = texte; a.classList.remove("vu"); void a.offsetWidth; a.classList.add("vu"); }
function passerLaLigne() {
  if (S.tour === 0) { S.tour = 1; S.tourT0 = S.t; fantomeDepart(); annoncer("TOP CHRONO !"); return; }
  const t = S.t - S.tourT0, mieux = !record || t < record; S.tours.push(t); S.tour++; S.tourT0 = S.t;
  fantomeTour(t, mieux && !PARAMS.has("s") && S.mode === "vraie");
  if (mieux && !PARAMS.has("s") && S.mode === "vraie") { record = t; try { localStorage.setItem(CLE_RECORD, String(t)); } catch (e) {} }
  annoncer("TOUR " + (S.tour - 1) + " · " + chrono(t) + (mieux && S.mode === "vraie" ? " · RECORD !" : ""));
}

/* la caméra : derrière ton Pokémon, 2,35 m au-dessus de l'eau, elle regarde 10 m devant lui */
const VUE = {mode: PARAMS.get("vue") || "jeu"};
function cadrer() {
  if (VUE.mode === "haut") { const G = CASES, cx = (G.xa + G.xb) / 2, cz = (G.za + G.zb) / 2, h = Math.max(G.xb - G.xa, G.zb - G.za) * .75 + 260; camera.position.set(cx, h, cz + 1); camera.lookAt(cx, 0, cz); return; }
  if (VUE.mode === "gauche" || VUE.mode === "droite") { const sg = VUE.mode === "gauche" ? -1 : 1, c = pose(S.s, -sg * 3), d = pose(S.s, sg * 30); camera.position.set(c.x, 2.6, c.z); camera.lookAt(d.x, 3, d.z); return; }   // pour vérifier une rive, de face
  const recul = 5.5 + S.vn * .8, c = pose(S.s - recul, 0), d = pose(S.s + 10, 0); camera.position.set(c.x, 1.95, c.z); camera.lookAt(d.x, .8, d.z);   // (11/11, Kiki) un peu plus bas et plus près : l'eau et les rives filent plus vite, même champ de vision
  const fov = 58 + S.vn * 9; if (Math.abs(fov - camera.fov) > .05) { camera.fov = fov; camera.updateProjectionMatrix(); }   // plus on va vite, plus le champ s'ouvre : le décor file sur les côtés
}
function hud() {
  $("vTemps").textContent = fmt(S.t); $("vCad").textContent = Math.round(cadence()); $("vVit").textContent = S.vL > .6 ? fmt(500 / S.vL) : "-:--"; $("vDist").textContent = Math.round(S.dist); $("vCoeur").textContent = MONTRE.h && performance.now() - MONTRE.vu < 15000 ? MONTRE.h : "--"; majCarte();
  const titre = pieceEn(S.s).titre; if ($("vLieu").textContent !== titre) $("vLieu").textContent = titre;
  if (BOUCLE) { const n = S.tours.length;
    $("vTour").textContent = S.tour ? "Tour " + S.tour + "  " + chrono(S.t - S.tourT0) : "Élan · " + Math.max(0, Math.round(ecart(LONG, S.s) / ALLURE)) + " m";
    $("vTours").textContent = (n ? "Dernier " + chrono(S.tours[n - 1]) : "") + (record ? (n ? " · " : "") + "Record " + chrono(record) : ""); }
}
function porter(b1) { COMMUNS.uB1.value = b1; scene.fog.far = b1; camera.far = b1 + 20; camera.updateProjectionMatrix(); POST.mat.uniforms.uF.value = camera.far; }   // voir moins loin (la brume se rapproche d'autant) : moins de décor à dessiner
let T = 0, dernier = performance.now(); const FPS = {n: 0, t: 0, v: 0};
function boucle(now) {
  requestAnimationFrame(boucle);
  const vrai = clamp((now - dernier) / 1000, 0, 1), dt = Math.min(vrai, .05); dernier = now; T += dt; COMMUNS.uT.value = T;   // le temps, la cadence et la distance suivent la vraie horloge, même si la machine rame (les animations, elles, sont bornées)
  if (!S.fige && S.mode && !S.pause) { if (S.lance || S.mode === "essai") S.t = (now - S.t0 - S.pauseTot) / 1000;   // le temps = la vraie horloge depuis le premier coup, moins les pauses
    if (S.auto && S.t >= S.prochain) { coup(.5 + Math.random() * .35); S.prochain = S.t + 60 / (24 + 3 * Math.sin(S.t * .05)); }
    const e = Math.exp(-vrai / TAU), f = 1 - Math.exp(-vrai / LISSE); S.v *= e; S.v1 += (S.v - S.v1) * f; S.v2 += (S.v1 - S.v2) * f;
    const pas = S.v2 * vrai; S.s += pas * ALLURE; S.dist += pas; }
  S.elan = Math.max(0, S.elan - dt * 2.5); S.vL = lerp(S.vL, S.v2, clamp(dt / 1.2, 0, 1)); S.vn = clamp((S.vL - 1) / 3.2, 0, 1.2);
  if (BOUCLE) { if (S.s >= LONG) { S.s -= LONG; passerLaLigne(); } }
  else { if (S.s > LONG - 14 && !S.fondu) S.fondu = .01;   // au bout d'un niveau ouvert : fondu au blanc, et on repart du début
    if (S.fondu) { S.fondu += dt * 1.4; if (S.fondu >= 1 && S.s > LONG / 2) S.s = 6; if (S.fondu >= 2) S.fondu = 0; $("voile").style.opacity = S.fondu ? (S.fondu < 1 ? S.fondu : 2 - S.fondu) : 0; } }
  EAU_U.uNag.value.set(S.s, 0, S.vn, S.enAir ? 1 : 0);
  COMMUNS.uSombre.value = lerp(COMMUNS.uSombre.value, dansTunnel(S.s) ? .86 : 1, clamp(dt * 3, 0, 1));
  cadrer(); animerSprites(T, S); animerFantome(T); animerGouttes(dt); animerDecor(T); dessiner(); hud();
  FPS.n++; FPS.t += dt; if (FPS.t >= 1) { FPS.v = Math.round(FPS.n / FPS.t); FPS.n = 0; FPS.t = 0; FPS.bas = FPS.v < 45 && FPS.v > 8 && T > 4 && document.visibilityState === "visible" ? (FPS.bas || 0) + 1 : 0; if (FPS.bas >= 2) { FPS.bas = 0; FPS.alt = !FPS.alt; if (FPS.alt && HAUT > 432) PLAFOND = Math.max(432, Math.round(HAUT * .85)); else if (COMMUNS.uB1.value > 220) porter(COMMUNS.uB1.value * .82); else if (HAUT > 432) PLAFOND = Math.max(432, Math.round(HAUT * .85)); }   // la machine peine : tour à tour une image un peu moins fine, puis une vue un peu moins longue
    if (hauteurVoulue() !== HAUT || Math.abs(camera.aspect - innerWidth / Math.max(1, innerHeight)) > .01) tailleEcran();
    if (PARAMS.has("perf")) $("vFps").textContent = HAUT + " px · " + FPS.v + " i/s · " + renderer.info.render.triangles + " triangles · " + renderer.info.render.calls + " objets"; }
}

/* les commandes : toucher l'écran ou la barre d'espace = un coup ; « Auto » rame tout seul */
function majAuto() { $("bAuto").classList.toggle("on", S.auto); }
$("bAuto").addEventListener("pointerdown", e => { e.stopPropagation(); S.auto = !S.auto; S.prochain = S.t + .3; majAuto(); });
let veille = false; const eveille = () => { if (veille) return; veille = true; try { navigator.wakeLock.request("screen").catch(() => {}); } catch (e) {} };   // l'écran ne s'éteint pas pendant qu'on rame
const essai = () => S.mode === "essai";   // toucher l'écran ne rame qu'en essai : pendant une vraie séance, seule la montre fait avancer
addEventListener("pointerdown", e => { eveille(); if (!essai() || S.pause || e.target.closest("button, .panneau")) return; S.auto = false; majAuto(); coup(.7); });
addEventListener("keydown", e => { if (!essai() || S.pause || e.target.closest("input")) return; if (e.code === "Space") { e.preventDefault(); S.auto = false; majAuto(); coup(.7); } else if (e.key === "a") { S.auto = !S.auto; majAuto(); } });
window.__aller = s => { S.s = s; S.fondu = 0; return s; };
window.__vue = m => { VUE.mode = m; const loin = m === "haut"; COMMUNS.uB0.value = loin ? 9000 : B0; COMMUNS.uB1.value = loin ? 19000 : B1; scene.fog.near = COMMUNS.uB0.value; scene.fog.far = COMMUNS.uB1.value;
  camera.far = loin ? 6000 : 420; camera.fov = 52; camera.updateProjectionMatrix(); POST.mat.uniforms.uF.value = camera.far; CIEL.m.visible = !loin; };
window.__piste = () => PISTE.pieces.map(p => [p.titre, Math.round(p.long0 || p.long), p.s1 - p.s0, +(+p.virage).toFixed(1)]);   // les pièces : longueur demandée, longueur réelle, virage

/* ============ le départ : on construit le monde depuis les fichiers, puis on lance ============ */
(async () => {
  const t0 = performance.now();
  try { await Promise.race([document.fonts.load('20px "Jersey 15"'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  construireTerrain(); construireRives(); construireEau(); construireTunnels(); construireDecor(); await construireSprites();
  window.__pret = Math.round(performance.now() - t0); if (VUE.mode !== "jeu") window.__vue(VUE.mode);
  $("hTour").hidden = !BOUCLE; majAuto(); $("charge").hidden = true; requestAnimationFrame(boucle);
  if (PARAMS.has("s") || PARAMS.has("fige") || VUE.mode !== "jeu") commencer(PARAMS.get("auto") === "0" ? "vraie" : "essai"); else ouvrirMenu();   // les vues de contrôle partent tout de suite
})().catch(e => { $("charge").textContent = "Erreur : " + e.message; console.error(e); });
