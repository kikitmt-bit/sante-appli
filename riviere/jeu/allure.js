/* ============ les machines : ce que chaque capteur envoie, et combien de vrais mètres ça fait ============ */
// Le jeu ne connaît pas « des coups de rame » : il reçoit des GESTES (un coup de rame, un tour d'elliptique), qui valent chacun
// « metres » vrais mètres, ou plus tard une VITESSE continue (home trainer : vitesseCapteur). Une fiche par machine :
//   metres    vrais mètres par geste (rameur : appris sur les séances ; elliptique : estimé, plutôt bas)
//   tau       en combien de secondes l'élan d'un geste s'épuise ; lisse : le filtre qui rend la glisse continue
//   allure    le décor défile ce nombre de fois plus vite que les vrais mètres (une machine lente garde un décor vivant)
//   cadence   gestes par minute de l'essai automatique ; v0, v1 : les vitesses « lente » et « rapide » (m/s), pour les effets
//   affiche   "500" (temps aux 500 m) ou "kmh" ; enregistre : la séance est-elle gardée dans l'appli (14/11 : les trois machines)
//   saisie    à la fin, on entre ce qu'affiche la machine (le rameur seul : le marcheur elliptique n'a pas d'écran, le home trainer donne tout)
//   capteurRequis : gardée seulement si un vrai capteur Bluetooth a donné la vitesse (le vélo : jamais les 150 W de l'essai)
//   ampli     (18/11, Kiki) les mètres d'un geste suivent son amplitude, mesurée au poignet par la montre (v28, champ « a » en cm) :
//             metres × (amplitude ÷ ref), entre min et max fois. Au marcheur elliptique, des petits gestes rapides ne font plus
//             filer, de grands gestes appuyés rapportent un peu plus (séance du 18/11 : ~61 cm normal, 67-70 grand, 7-8 tout petit).
//             Sans mesure (ancienne montre, essai, geste après une pause) : × 1.
// Records et fantômes sont séparés par machine. ?machine=elliptique choisit la machine (sinon : D.machine, sinon le rameur).
const MACHINES = {
  rameur: {nom: "Rameur", geste: "coup", gestes: "COUPS", metres: clamp(+D.m_coup || 9, 4, 16), tau: 3.5, lisse: .8, allure: 1, cadence: 24, v0: 1, v1: 4.2, affiche: "500", enregistre: true, saisie: true},
  // L'elliptique du parc n'affiche rien : 1,3 m par tour de pédale (deux pas de 65 cm), soit environ 4,3 km/h à 55 tours/min. Estimé vers le bas (Kiki, 11/11).
  // Le vélo (home trainer) : une machine CONTINUE. Sa vitesse vient d'un capteur Bluetooth (jeu/capteurs.js) : des watts et la physique (poids, pente, air),
  // ou la vitesse que donne l'appareil. En essai, un toucher = un tour de pédale (6 m), « Auto » = 150 watts. masse : toi et le vélo (kg).
  velo: {nom: "Vélo", monture: "cycliste", geste: "tour", gestes: "TOURS", metres: 6, tau: 2.2, lisse: .5, allure: 1, cadence: 60, v0: 2.5, v1: 9.5, affiche: "kmh", enregistre: true, capteurRequis: true, continu: true, physique: true, masse: clamp(+lireReglage("riviere_masse", 85) || 85, 40, 160)},
  // « elliptique » = la machine du parc de Kiki : un SKIEUR DE FOND (air walker), les pieds restent à plat et glissent d'avant en arrière, les bras
  // poussent les poignées (12/11, Kiki : ce n'est pas un elliptique). La clé reste "elliptique" : c'est le sujet de la montre et la clé des records.
  // Ce qu'on y voit, au choix du menu (gardé sur la machine ; ?monture= pour essayer) : ton Pokémon qui trottine (16/11, par défaut :
  // contenu/montures/trotteur.js) ou ton dresseur à vélo. Les rollers et l'ancienne vue « il court » n'existent plus : qui les avait choisis voit le trot.
  elliptique: {nom: "Marcheur elliptique", montre: "Marcheur elliptique", monture: (PARAMS.get("monture") || lireReglage("riviere_monture_elliptique", "trotteur")) === "cycliste" ? "cycliste" : "trotteur",
    geste: "tour", gestes: "TOURS", metres: clamp(+D.m_tour || 1.3, .5, 3), ampli: {ref: 61, min: .15, max: 1.3}, pas: 2, tau: 1.2, lisse: .7, allure: 3, cadence: 55, v0: .3, v1: 1.7, affiche: "kmh", enregistre: true},
};
const MACHINE_NOM = (() => { const m = MACHINES[MACHINE_MENU] ? MACHINE_MENU : MACHINES[PARAMS.get("machine")] ? PARAMS.get("machine") : MACHINES[lireReglage("riviere_machine", null)] ? lireReglage("riviere_machine", null) : MACHINES[D.machine] ? D.machine : "rameur";
  if (DISCIPLINE === "eau") return "rameur";   // un circuit sur l'eau se rame ; un circuit sur la terre se fait à vélo ou à l'elliptique
  return m !== "rameur" ? m : MACHINES[lireReglage("riviere_machine_terre", null)] ? lireReglage("riviere_machine_terre", null) : "velo"; })();   // l'adresse, sinon le choix du menu, sinon l'appli
const MACHINE = MACHINES[MACHINE_NOM];
if (MACHINE.pas && typeof document !== "undefined" && $("hPas")) $("hPas").hidden = false;   // (18/11) un aller-retour = 2 pas : séance du 18/11, 3 804 pas comptés ainsi pour 3 822 à la montre
const M_COUP = MACHINE.metres, TAU = MACHINE.tau, LISSE = MACHINE.lisse;
/* la vitesse VUE (12/11, Kiki) : au marcheur elliptique, le décor ne défile pas à tes vrais mètres par seconde mais à l'allure de ce que tu vois.
   (18/11, Kiki : entre 4,2 et 4,3 km/h, on ne voyait aucune différence) au-dessus de l'allure habituelle, le décor amplifie l'écart :
   à vélo, 15 km/h à ton allure habituelle (MACHINE.cadence tours par minute), 19 à +10 %, 25 à +25 %, 32 au plus.
   Au trot (16/11, Kiki : un footing léger, 6-7 km/h à l'œil) : 6,5 km/h à ton allure habituelle, 9 à +10 % (de grands gestes appuyés), 12 au plus.
   Une vraie côte freine, une descente lance. Les chiffres affichés restent les vrais (distance, km/h, cadence : ceux de tes jambes). */
const VISUEL = MACHINE_NOM === "elliptique";
const VU = MACHINE.monture === "trotteur" ? {base: 6.5, plus: 25, max: 12, descente: 1.1, cote: 1.6, min: .82} : {base: 15, plus: 40, max: 32, descente: 1.5, cote: 6, min: .38};   // cote, min : ce qu'une côte enlève (18/11, Kiki : au trot, presque rien ; à 10 % : −16 %)
const CROISIERE_VRAIE = MACHINE.cadence * M_COUP / 60;   // tes vrais m/s à l'allure habituelle
function kmhVus(v) { const r = v / CROISIERE_VRAIE; return Math.min(VU.max, r <= 1 ? VU.base * r : VU.base + VU.plus * (r - 1)); }
function allureVue(i, v) {   // combien de mètres de décor pour un vrai mètre, ici, à cette vitesse
  const f = PISTE.ALL[i] / PISTE.ALL0[i], pente = NIVEAU.allurePente === false ? PISTE.PENTE[i] : (1 - f) / 3.5;   // la pente adoucie (piste.js en a tiré ALL ; une vraie route, à l'échelle 1:1, ne la met pas dans ALL)
  return kmhVus(Math.max(v, .05)) / 3.6 * clamp(1 - pente * VU.cote, VU.min, VU.descente) * (PISTE.ALL0[i] / ALLURE) / Math.max(v, .05);
}
if (VISUEL) { MACHINE.allure = VU.base / 3.6 / (CROISIERE_VRAIE * ALLURE); MACHINE.tourVu = VU.base / 3.6 / (MACHINE.cadence / 60); }   // un tour de circuit à l'allure habituelle ; un tour de jambes = tant de mètres vus (pédales, foulées)
const CLE_MACHINE = MACHINE_NOM + (VISUEL ? "-" + MACHINE.monture : "");   // records et fantômes à part : la vitesse vue change les temps des tours
const TOUR_M = TOUR_VRAI / MACHINE.allure;   // les vrais mètres d'un tour de circuit, sur cette machine
