/* ============ le départ : quel circuit, quelle région, quels réglages gardés sur cette machine ============ */
// La page arrive avec TOUS les circuits du jeu (NIVEAUX), toutes les régions (BIOMES) et tous leurs lieux (LIEUX_TOUS).
// Le circuit joué est, dans l'ordre : un brouillon envoyé par l'éditeur (une seule fois), le circuit choisi au menu
// (gardé sur cette machine : riviere_niveau), sinon celui que l'appli a servi (NIVEAU_SERVI).
// Les circuits faits dans l'éditeur sont gardés sur la machine (riviere_circuits) : on crée, on joue, sans rien envoyer nulle part.
// Une région peut hériter d'une autre ("herite": "kanto") : elle ne redit que ce qui change (ses couleurs, ses arbres…).
const lireReglage = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
const ecrireReglage = (k, v) => { try { if (v === null || v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
const CIRCUITS_PERSO = (() => { const c = lireReglage("riviere_circuits", {}); return c && typeof c === "object" ? c : {}; })();
const FORCE = !!(D.force || (D.params && D.params.force));   // l'adresse demande CE circuit : le choix gardé ne passe pas devant

function fusion(a, b) {   // b par-dessus a : les objets se complètent, tout le reste est remplacé
  if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) || Array.isArray(b)) return b === undefined ? a : b;
  const o = Object.assign({}, a);
  for (const k of Object.keys(b)) o[k] = fusion(a[k], b[k]);
  return o;
}
function region(nom, vus = []) {
  const b = BIOMES[nom];
  if (!b) throw new Error("Région inconnue : « " + nom + " ».");
  if (!b.herite) return b;
  if (vus.includes(nom)) throw new Error("La région « " + nom + " » hérite d'elle-même.");
  const parent = region(b.herite, vus.concat(nom)), o = fusion(parent, b);
  o.regles = b.regles || (parent.regles || []).concat(b.regles_plus || []);   // regles : à la place de celles du parent ; regles_plus : en plus
  return o;
}
const NIVEAU = (() => {
  let brouillon = null, unefois = null;
  try { brouillon = JSON.parse(sessionStorage.getItem("riviere_essai") || "null"); sessionStorage.removeItem("riviere_essai"); } catch (e) {}
  if (brouillon && Array.isArray(brouillon.pieces)) return Object.assign(brouillon, {brouillon: true});
  try { unefois = sessionStorage.getItem("riviere_niveau_une_fois"); sessionStorage.removeItem("riviere_niveau_une_fois"); } catch (e) {}
  const garde = unefois || (FORCE ? null : lireReglage("riviere_niveau", null));
  const n = CIRCUITS_PERSO[garde] || NIVEAUX[garde] || NIVEAUX[NIVEAU_SERVI] || Object.values(NIVEAUX)[0];
  return CIRCUITS_PERSO[garde] === n ? Object.assign({}, n, {perso: true}) : n;
})();
const BIOME = region(BIOMES[NIVEAU.biome] ? NIVEAU.biome : Object.keys(BIOMES)[0]);
const LIEUX = LIEUX_TOUS[NIVEAU.lieux] || LIEUX_TOUS[BIOME.lieux] || LIEUX_TOUS[NIVEAU.biome] || {};
/* relancer la page (changer de circuit, de machine) : dans l'appli, la page est dans un cadre qu'on recharge sans recharger l'appli */
function relancer() {
  try { const f = window.frameElement; if (f && f.srcdoc) { const s = f.srcdoc; f.srcdoc = s; return; } } catch (e) {}
  location.reload();
}
