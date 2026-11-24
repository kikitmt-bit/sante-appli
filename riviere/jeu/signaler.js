/* ============ signaler un défaut : un toucher, et l'endroit exact est gardé (24/11, Kiki : « comment arriver à ce que tu corriges tous les bugs ? ») ============ */
// Le bouton ⚑ (en course) garde le circuit, le mètre, l'heure, le temps qu'il fait, la machine et l'image qu'on a sous les yeux. Rien à écrire.
// Tout attend sur la machine (localStorage « riviere_signal », 20 au plus) ; l'appli les range au chargement suivant dans data/riviere/signalements/
// (app.py : envoyer_signalements), où Claude les relit. Aucune donnée de santé : ni cœur, ni temps, ni distance.
const SIGNAL = {cle: "riviere_signal", max: 20};
function signalerImage() {   // l'image affichée, en petit (640 px de large) : redessinée tout de suite, car l'image d'avant n'est plus lisible
  try { dessiner(); const c = renderer.domElement, l = 640, h = Math.round(640 * c.height / c.width), t = document.createElement("canvas"); t.width = l; t.height = h; t.getContext("2d").drawImage(c, 0, 0, l, h); return t.toDataURL("image/jpeg", .72); } catch (e) { return null; }
}
function signaler() {
  const d = new Date(), p = v => String(v).padStart(2, "0"), id = d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()), a = at(S.s);
  const o = {id, niveau: NIVEAU.id, nom: NIVEAU.nom || "", s: Math.round(S.s * 10) / 10, metre: idx(S.s), piece: pieceEn(S.s).titre, x: +a.x.toFixed(1), z: +a.z.toFixed(1), voies: PISTE.NF ? [...VOIES.prise] : undefined, machine: MACHINE_NOM,
    heure: lireReglage("riviere_heure", null), meteo: lireReglage("riviere_meteo", null), effets: EFFETS_NOMS.filter(k => EFFETS[k]), reel: REEL_NOMS.filter(k => REEL[k]), ecran: innerWidth + "x" + innerHeight, image: signalerImage()};
  if (NIVEAU.perso || NIVEAU.brouillon || NIVEAU.jour) o.circuit = NIVEAU;   // un circuit fait sur cette machine, ou celui du jour : il n'est pas dans le dépôt, il part avec
  const liste = lireReglage(SIGNAL.cle, []), l = (Array.isArray(liste) ? liste : []).concat(o).slice(-SIGNAL.max);
  const ok = ecrireReglage(SIGNAL.cle, l) || ecrireReglage(SIGNAL.cle, l.map(q => Object.assign({}, q, {image: null})));   // plus de place sur la machine : l'endroit seul, sans les images
  annoncer(ok ? "⚑ NOTÉ, MERCI !" : "⚑ PAS GARDÉ (PLUS DE PLACE)");
  return o;
}
$("bSignal").addEventListener("pointerdown", e => { e.stopPropagation(); e.preventDefault(); if (S.mode) signaler(); });
$("bSignal").addEventListener("click", e => e.stopPropagation());
window.__signaler = signaler;
