/* ============ les adversaires : des Pokémon qui font le circuit à allure régulière (des « lièvres », comme les meneurs d'allure de Zwift) ============ */
// Au menu : « Adversaires » : aucun, tranquilles, coriaces. Leur allure se règle sur TOI : ton record du tour sur cette machine
// (sinon, l'allure habituelle de la machine). Ils partent avec toi au passage de la ligne (au premier geste sur un parcours ouvert),
// avancent en VRAIS mètres par seconde (une côte les freine comme toi), et le classement s'affiche sous le chrono du tour.
// Leurs Pokémon viennent de la région ("rivaux": {"eau": […], "terre": […]}). Rien n'est enregistré : c'est pour le plaisir de la course.
const RIVAUX = {choix: lireReglage("riviere_rivaux", "aucun"), liste: [], t0: null, pret: false};
const RIVAUX_NIVEAUX = {aucun: [], tranquilles: [.86, .93, 1], coriaces: [.97, 1.04, 1.11]};
const COULEURS_RIVAUX = ["#F8C838", "#FF8A8A", "#8CE0A0"];
function choisirRivaux(k) { RIVAUX.choix = RIVAUX_NIVEAUX[k] ? k : "aucun"; ecrireReglage("riviere_rivaux", RIVAUX.choix); preparerRivaux(); }
async function preparerRivaux() {
  for (const r of RIVAUX.liste) if (r.pantin) { scene.remove(r.pantin.m); const i = TEINTES.indexOf(r.pantin.m.material); if (i >= 0) TEINTES.splice(i, 1); }
  RIVAUX.liste = []; RIVAUX.t0 = null;
  const nums = (BIOME.rivaux || {})[SURFACES[surfaceEn(0)] && SURFACES[surfaceEn(0)].liquide ? "eau" : "terre"] || [], base = record ? TOUR_M / record : MACHINE.cadence * M_COUP / 60 * .92;
  const facteurs = RIVAUX_NIVEAUX[RIVAUX.choix] || [];
  for (let k = 0; k < facteurs.length && k < nums.length; k++) {
    const r = {num: nums[k], v: base * facteurs[k], vr: 0, s: 0, d: [-2.3, 2.5, -3.6][k % 3], couleur: COULEURS_RIVAUX[k % 3], pantin: null, ph: k * 1.7};
    RIVAUX.liste.push(r);
    const pl = await planche(String(r.num).padStart(4, "0") + "/Walk");
    if (pl && RIVAUX.liste.includes(r)) { r.pantin = new Pantin(pl, 4, 1.25); r.pantin.m.visible = false; }
  }
}
function rivauxDepart() { RIVAUX.t0 = S.t; for (const r of RIVAUX.liste) r.vr = 0; }
function animerRivaux(t, dt) {
  const L = RIVAUX.liste; if (!L.length) return;
  const parti = RIVAUX.t0 !== null && S.mode && !S.pause;
  for (const r of L) {
    if (parti) r.vr += r.v * MACHINE.allure * dt;
    r.s = BOUCLE ? decorDe(r.vr) : Math.min(LONG - 2, decorDe(Math.min(r.vr, TOUR_VRAI)));
    const N = r.pantin; if (!N) continue;
    N.m.visible = RIVAUX.t0 !== null || S.tour === 0;
    const a = at(r.s), d = clamp(r.d, -(a.w - 1), a.w - 1), p = pose(RIVAUX.t0 === null ? (BOUCLE ? 2 : 8) : r.s, d), k = PISTE.COURB[idx(r.s + 2)], devant = ecart(r.s, S.s) > -3;
    N.rangee(devant ? (k > .028 ? 3 : k < -.028 ? 5 : 4) : 0); N.image(N.pl.image(t * .55 + r.ph));
    N.m.position.set(p.x, hauteurPantin(RIVAUX.t0 === null ? 2 : r.s, N, t + r.ph), p.z); N.regarder();
  }
}
/* le classement : ta place, et l'écart (en vrais mètres) avec celui qui te précède ou te suit */
function classement() {
  const L = RIVAUX.liste; if (!L.length || RIVAUX.t0 === null) return "";
  const moi = (BOUCLE ? Math.max(0, S.tour - 1) * TOUR_VRAI : 0) + vrai(S.s), devant = L.filter(r => r.vr > moi).sort((a, b) => a.vr - b.vr)[0], derriere = L.filter(r => r.vr <= moi).sort((a, b) => b.vr - a.vr)[0];
  const place = L.filter(r => r.vr > moi).length + 1, m = x => Math.round(Math.abs(x - moi) / MACHINE.allure) + " m";
  return place + (place === 1 ? "er" : "e") + " sur " + (L.length + 1) + (devant ? " · ▲ " + m(devant.vr) : derriere ? " · ▼ " + m(derriere.vr) : "");
}
