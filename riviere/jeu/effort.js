/* ============ la brique « effort » (15/11, étape 6 du plan) : forcer plus que sa croisière ============ */
// Ta croisière = ta vitesse habituelle de la séance (de vrais m/s), qui s'ajuste doucement (environ 1 min 30) : au départ, l'allure habituelle
// de la machine ; ensuite, la tienne. EFFORT.ratio = ta vitesse des dernières secondes ÷ ta croisière (1 = comme d'habitude, 1,1 = 10 % plus vite).
// Un moment du jeu demande un effort : demanderEffort({seuil, duree, reussi}) ; la jauge se remplit tant que tu es au-dessus du seuil, se vide
// trois fois plus lentement sinon ; pleine = réussi. Pendant un effort demandé, la croisière ne bouge pas (sinon elle te suivrait et tu ne
// la dépasserais jamais). Aucune cadence imposée : on compare toujours à TON rythme. Les vrais chiffres ne changent jamais.
// Servira aussi aux embranchements (étape 7 : la voie spectaculaire si on force).
const EFFORT = {croisiere: 0, vite: 0, ratio: 1, demande: null};
const habituelle = () => MACHINE.physique ? 7.5 : (MACHINE.cadence || 24) * M_COUP / 60;   // de vrais m/s
function effortMaj(dt) {
  if (!(dt > 0)) return;
  const v = S.mode && !S.pause ? S.v2 || 0 : 0;
  if (!EFFORT.croisiere) EFFORT.croisiere = habituelle();
  EFFORT.vite += (v - EFFORT.vite) * (1 - Math.exp(-dt / 2.5));
  if (S.mode && !S.pause && !EFFORT.demande && v > EFFORT.croisiere * .5) EFFORT.croisiere += (v - EFFORT.croisiere) * (1 - Math.exp(-dt / 90));
  EFFORT.ratio = EFFORT.croisiere > 0 ? EFFORT.vite / EFFORT.croisiere : 1;
  const d = EFFORT.demande; if (!d || d.fini) return;
  if (EFFORT.ratio >= d.seuil) d.jauge = Math.min(1, d.jauge + dt / d.duree); else d.jauge = Math.max(0, d.jauge - dt / (d.duree * 3));
  if (d.jauge >= 1) { d.fini = true; if (d.reussi) d.reussi(); }
}
function demanderEffort(o = {}) { EFFORT.demande = {seuil: o.seuil || 1.08, duree: o.duree || 5, jauge: 0, fini: false, reussi: o.reussi || null}; return EFFORT.demande; }
function finirEffort() { EFFORT.demande = null; }
