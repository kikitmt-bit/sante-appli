/* ============ les machines : ce que chaque capteur envoie, et combien de vrais mètres ça fait ============ */
// Le jeu ne connaît pas « des coups de rame » : il reçoit des GESTES (un coup de rame, un tour d'elliptique), qui valent chacun
// « metres » vrais mètres, ou plus tard une VITESSE continue (home trainer : vitesseCapteur). Une fiche par machine :
//   metres    vrais mètres par geste (rameur : appris sur les séances ; elliptique : estimé, plutôt bas)
//   tau       en combien de secondes l'élan d'un geste s'épuise ; lisse : le filtre qui rend la glisse continue
//   allure    le décor défile ce nombre de fois plus vite que les vrais mètres (une machine lente garde un décor vivant)
//   cadence   gestes par minute de l'essai automatique ; v0, v1 : les vitesses « lente » et « rapide » (m/s), pour les effets
//   affiche   "500" (temps aux 500 m) ou "kmh" ; enregistre : la séance est-elle gardée dans l'appli
// Records et fantômes sont séparés par machine. ?machine=elliptique choisit la machine (sinon : D.machine, sinon le rameur).
const MACHINES = {
  rameur: {nom: "Rameur", geste: "coup", gestes: "COUPS", metres: clamp(+D.m_coup || 9, 4, 16), tau: 3.5, lisse: .8, allure: 1, cadence: 24, v0: 1, v1: 4.2, affiche: "500", enregistre: true},
  // L'elliptique du parc n'affiche rien : 1,3 m par tour de pédale (deux pas de 65 cm), soit environ 4,3 km/h à 55 tours/min. Estimé vers le bas (Kiki, 11/11).
  // Le vélo (home trainer) : une machine CONTINUE. Sa vitesse vient d'un capteur Bluetooth (jeu/capteurs.js) : des watts et la physique (poids, pente, air),
  // ou la vitesse que donne l'appareil. En essai, un toucher = un tour de pédale (6 m), « Auto » = 150 watts. masse : toi et le vélo (kg).
  velo: {nom: "Vélo", geste: "tour", gestes: "TOURS", metres: 6, tau: 2.2, lisse: .5, allure: 1, cadence: 60, v0: 2.5, v1: 9.5, affiche: "kmh", enregistre: false, continu: true, physique: true, masse: clamp(+lireReglage("riviere_masse", 85) || 85, 40, 160)},
  elliptique: {nom: "Elliptique", geste: "tour", gestes: "TOURS", metres: clamp(+D.m_tour || 1.3, .5, 3), tau: 1.2, lisse: .7, allure: 3, cadence: 55, v0: .3, v1: 1.7, affiche: "kmh", enregistre: false},
};
const MACHINE_NOM = MACHINES[PARAMS.get("machine")] ? PARAMS.get("machine") : MACHINES[lireReglage("riviere_machine", null)] ? lireReglage("riviere_machine", null) : MACHINES[D.machine] ? D.machine : "rameur";   // l'adresse, sinon le choix du menu, sinon l'appli
const MACHINE = MACHINES[MACHINE_NOM];
const M_COUP = MACHINE.metres, TAU = MACHINE.tau, LISSE = MACHINE.lisse;
const TOUR_M = TOUR_VRAI / MACHINE.allure;   // les vrais mètres d'un tour de circuit, sur cette machine
