/* ============ le banc de mesure : ?banc=1 ============ */
// Le jeu fait un tour tout seul, à vitesse fixe (12 m de décor par seconde : environ une minute), sans changer la qualité en route,
// puis affiche ce que la machine a tenu. À lancer une fois sur chaque écran (tablette, téléphone) : on sait où on en est.
const BANC = PARAMS.has("banc") ? {ft: [], cpu: [], tri: 0, objets: 0, dist: 0, fini: false, t: 0, vitesse: +PARAMS.get("banc") > 1 ? +PARAMS.get("banc") : 12} : null;
function lancerBanc() {
  commencer("essai"); S.auto = false; majAuto(); S.s = 0; M.y = null; CAM.y = null; $("bFin").hidden = true; $("bAuto").hidden = true;
  annoncer("BANC DE MESURE");
}
function bancAvance(dt) {   // le décor défile tout seul ; les effets de vitesse sont à fond
  if (T < 2) return;   // deux secondes pour que tout soit chargé
  const pas = BANC.vitesse * dt; S.s += pas; BANC.dist += pas; BANC.t += dt; S.vd = BANC.vitesse; S.v2 = S.vL = MACHINE.v1; S.t = BANC.t;
  if (BANC.dist >= LONG) finBanc();
}
function bancImage(ecoule) {
  if (T < 2 || BANC.fini) return;
  BANC.ft.push(ecoule * 1000); BANC.tri = Math.max(BANC.tri, renderer.info.render.triangles); BANC.objets = Math.max(BANC.objets, renderer.info.render.calls);
}
function finBanc() {
  BANC.fini = true; S.mode = null; S.v2 = S.vL = 0;
  const ft = BANC.ft.slice().sort((a, b) => a - b), n = ft.length, moy = ft.reduce((a, b) => a + b, 0) / n, pire = ft[Math.floor(n * .99)], lentes = ft.filter(x => x > 1000 / IMAGES_MAX * 1.35).length;
  const ips = 1000 / moy, tient = ips > IMAGES_MAX * .95 && lentes / n < .02, ecran = Math.round(innerWidth * devicePixelRatio) + " × " + Math.round(innerHeight * devicePixelRatio);
  const verdict = tient ? "Cette machine tient " + IMAGES_MAX + " images par seconde." : ips > IMAGES_MAX * .75 ? "Presque : quelques images en retard." : "Cette machine peine : il faudra alléger.";
  panneau(`<h1>Banc de mesure</h1><p class="sous">${NIVEAU.nom} · ${MACHINE.nom}</p>
    <div class="chiffres"><div><small>IMAGES / S</small>${ips.toFixed(1)}</div><div><small>LES 1 % PIRES</small>${Math.round(1000 / pire)} i/s</div>
    <div><small>EN RETARD</small>${(lentes / n * 100).toFixed(1)} %</div><div><small>IMAGE</small>${canvas.width} × ${canvas.height}</div></div>
    <p><b>${verdict}</b></p>
    <p class="petit">Écran ${ecran} · ${BANC.tri.toLocaleString("fr-FR")} triangles au plus · ${BANC.objets} objets · monde construit en ${(window.__pret / 1000).toFixed(1)} s · ${n} images mesurées</p>
    <p class="petit">Note ces chiffres (ou fais une capture) et donne-les à Claude.</p>
    <div class="choix"><button class="rouge" id="bcEncore">▶ Refaire la mesure</button></div>`).querySelector("#bcEncore").onclick = () => location.reload();
  window.__banc = {ips: +ips.toFixed(1), pire: Math.round(1000 / pire), retard: +(lentes / n * 100).toFixed(1), image: [canvas.width, canvas.height], triangles: BANC.tri, objets: BANC.objets, images: n};
}
