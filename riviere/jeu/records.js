/* ============ les records sur le serveur (14/11, étape 2 du plan) ============ */
// Ton meilleur tour, son fantôme et tes records de segments te suivent d'un appareil à l'autre : l'appli donne ceux du serveur (D.records),
// la machine en garde une copie (localStorage), et ce qui bat le serveur part avec la prochaine séance enregistrée (seance.js, garder ;
// seances_rameur.garder_records côté serveur, qui ne garde jamais un temps moins bon). Un essai ne fait jamais de record.
// La clé d'un circuit : la machine (sauf le rameur), le circuit, les vrais mètres d'un tour et l'EMPREINTE du tracé construit : si le tracé change
// (un virage, une longueur, le moteur de la piste), c'est un autre circuit et son classement repart de zéro ; changer le décor ne change rien.
const EMPREINTE = (() => {
  const P = PISTE; let h = 2166136261;
  const mix = v => { h = Math.imul(h ^ (v | 0), 16777619); };
  mix(P.N); mix(Math.round(TOUR_M)); mix(BOUCLE ? 1 : 0);
  for (let i = 0; i < P.N; i += 10) { mix(Math.round(P.X[i])); mix(Math.round(P.Z[i])); mix(Math.round(P.Y[i])); }   // au mètre près : le même sur toutes les machines
  return (h >>> 0).toString(36);
})();
const CLE_CIRCUIT = (MACHINE_NOM === "rameur" ? "" : CLE_MACHINE + "_") + String(NIVEAU.id || NIVEAU.nom).replace(/[^\w.-]/g, "-") + "_" + (NIVEAU.distance || Math.round(TOUR_M)) + "m_" + EMPREINTE;
const SERVEUR = (D.records || {})[CLE_CIRCUIT] || {};   // ce que le serveur garde pour ce circuit : {tour: {t, jour, pts}, segments: {nom: t}}
const tourServeur = () => SERVEUR.tour && SERVEUR.tour.t > 0 ? SERVEUR.tour : null;

function alleger(pts) {   // la trace du fantôme pour le serveur : un point par seconde (au lieu de dix), le dernier toujours gardé (la ligne)
  const o = [pts[0], pts[1]]; let sec = Math.floor(pts[0]);
  for (let i = 2; i < pts.length - 2; i += 2) if (Math.floor(pts[i]) > sec) { sec = Math.floor(pts[i]); o.push(pts[i], pts[i + 1]); }
  if (pts.length > 2) o.push(pts[pts.length - 2], pts[pts.length - 1]);
  return o;
}
function recordsAEnvoyer() {   // ce qui bat ce que le serveur a (null : rien) ; appelé à l'enregistrement d'une séance
  const o = {}, ts = tourServeur(), segS = SERVEUR.segments || {}, r1 = t => Math.round(t * 10) / 10;
  if (record && (!ts || record < ts.t - .05)) {
    const f = FANTOME.record && Math.abs(FANTOME.record.t - record) < .05 && FANTOME.record.pts && FANTOME.record.pts.length >= 4 ? FANTOME.record : null;
    o.tour = {t: r1(record), ...(f ? {pts: alleger(f.pts)} : {})};
  }
  const segs = {}; for (const [nom, t] of Object.entries(SEG.records || {})) if (t > 0 && (!segS[nom] || t < segS[nom] - .05)) segs[nom] = r1(t);
  if (Object.keys(segs).length) o.segments = segs;
  return Object.keys(o).length ? {[CLE_CIRCUIT]: {machine: MACHINE_NOM, niveau: String(NIVEAU.id || NIVEAU.nom), ...o}} : null;
}
