/* ============ les capteurs Bluetooth : un home trainer, un rameur ou un elliptique connecté, une ceinture cardio ============ */
// Le navigateur (Chrome, Edge ; pas Safari) parle directement à l'appareil : rien à installer. Au menu : « Relier un capteur Bluetooth ».
// Ce qu'on sait lire (les services standards, ceux que parlent presque tous les appareils connectés) :
//   FTMS (Fitness Machine)  un vélo d'appartement ou home trainer (vitesse, cadence, puissance), un rameur (coups, allure), un elliptique
//   Cycling Power           un capteur de puissance seul (pédalier, home trainer simple)
//   Cycling Speed & Cadence un capteur de cadence
//   Heart Rate              une ceinture cardio (elle remplace le cœur de la montre)
// Un home trainer qui se pilote (FTMS) reçoit la PENTE du circuit : ça durcit dans les côtes, comme sur Zwift (« difficulte » : 50 % par défaut).
// Avec une puissance (des watts), la vitesse vient de la physique : ton poids, la pente, l'air. Une côte ralentit pour de vrai,
// et le décor ne triche plus avec la pente (MACHINE.physique). Sans capteur, en essai : « Auto » pédale à 150 watts.
// ÉCRIT SANS APPAREIL SOUS LA MAIN (12/11) : à essayer sur un vrai home trainer. La lecture des trames se contrôle sans appareil : window.__trames().
const BT = {appareil: null, nom: "", etat: "", puissance: null, cadence: null, vitesse: null, coeur: 0, vu: 0, ctrl: null, pente: null, envoi: 0, coups: null, v: 0, difficulte: clamp(+lireReglage("riviere_difficulte", .5), 0, 1)};
const BT_OK = (() => { try { return !!navigator.bluetooth; } catch (e) { return false; } })();
const S16 = (d, o) => d.getInt16(o, true), U16 = (d, o) => d.getUint16(o, true), U24 = (d, o) => d.getUint8(o) | d.getUint8(o + 1) << 8 | d.getUint8(o + 2) << 16;

/* la lecture des trames : chaque appareil n'envoie que les champs que ses drapeaux annoncent, dans l'ordre de la norme */
function lireVelo(d) {   // FTMS, Indoor Bike Data (0x2AD2)
  const f = U16(d, 0), o = {}; let i = 2;
  if (!(f & 1)) { o.vitesse = U16(d, i) * .01 / 3.6; i += 2; }
  if (f & 2) i += 2;
  if (f & 4) { o.cadence = U16(d, i) * .5; i += 2; }
  if (f & 8) i += 2;
  if (f & 16) i += 3;
  if (f & 32) i += 2;
  if (f & 64) { o.puissance = S16(d, i); i += 2; }
  if (f & 128) i += 2;
  if (f & 256) i += 5;
  if (f & 512) { o.coeur = d.getUint8(i); i += 1; }
  return o;
}
function lireRameur(d) {   // FTMS, Rower Data (0x2AD1)
  const f = U16(d, 0), o = {}; let i = 2;
  if (!(f & 1)) { o.cadence = d.getUint8(i) * .5; o.coups = U16(d, i + 1); i += 3; }
  if (f & 2) i += 1;
  if (f & 4) i += 3;
  if (f & 8) { const p = U16(d, i); if (p > 0 && p < 2000) o.vitesse = 500 / p; i += 2; }
  if (f & 16) i += 2;
  if (f & 32) { o.puissance = S16(d, i); i += 2; }
  if (f & 64) i += 2;
  if (f & 128) i += 2;
  if (f & 256) i += 5;
  if (f & 512) { o.coeur = d.getUint8(i); i += 1; }
  return o;
}
function lireElliptique(d) {   // FTMS, Cross Trainer Data (0x2ACE) : trois octets de drapeaux
  const f = U24(d, 0), o = {}; let i = 3;
  if (!(f & 1)) { o.vitesse = U16(d, i) * .01 / 3.6; i += 2; }
  if (f & 2) i += 2;
  if (f & 4) i += 3;
  if (f & 8) { o.cadence = U16(d, i) / 2; i += 4; }      // des pas par minute : deux pas = un tour
  if (f & 16) { o.coups = Math.floor(U16(d, i) * .1); i += 2; }
  if (f & 32) i += 4;
  if (f & 64) i += 4;
  if (f & 128) i += 2;
  if (f & 256) { o.puissance = S16(d, i); i += 2; }
  return o;
}
const TOURS_BT = {n: null, t: null};
function lirePuissance(d) {   // Cycling Power Measurement (0x2A63) : les watts, et la cadence si le pédalier la donne
  const f = U16(d, 0), o = {puissance: S16(d, 2)}; let i = 4;
  if (f & 1) i += 1;
  if (f & 4) i += 2;
  if (f & 16) i += 6;
  if (f & 32) { const n = U16(d, i), t = U16(d, i + 2); o.cadence = cadenceTours(n, t); }
  return o;
}
function lireCadence(d) {   // Cycling Speed and Cadence (0x2A5B)
  const f = d.getUint8(0), o = {}; let i = 1;
  if (f & 1) i += 6;
  if (f & 2) o.cadence = cadenceTours(U16(d, i), U16(d, i + 2));
  return o;
}
function cadenceTours(n, t) {   // des tours comptés et l'instant du dernier (en 1/1024 s) : la cadence entre deux trames
  const T = TOURS_BT; let c;
  if (T.n !== null && t !== T.t) { const dn = (n - T.n + 65536) % 65536, dt = ((t - T.t + 65536) % 65536) / 1024; if (dt > 0 && dn < 20) c = dn / dt * 60; }
  if (t !== T.t || T.n === null) { T.n = n; T.t = t; }
  return c;
}
const lireCoeur = d => ({coeur: d.getUint8(0) & 1 ? U16(d, 1) : d.getUint8(1)});

/* une mesure arrive : on garde ce qu'elle apporte ; un rameur connecté compte ses coups lui-même */
function mesureBT(o) {
  BT.vu = performance.now();
  if (o.puissance !== undefined) BT.puissance = Math.max(0, o.puissance);
  if (o.cadence !== undefined) BT.cadence = o.cadence;
  if (o.vitesse !== undefined) BT.vitesse = o.vitesse;
  if (o.coeur) { BT.coeur = o.coeur; MONTRE.h = o.coeur; MONTRE.vu = BT.vu; }
  if (o.coups !== undefined && !MACHINE.continu) {
    if (BT.coups !== null && o.coups > BT.coups && o.coups - BT.coups < 6) { S.auto = false; majAuto(); for (let k = BT.coups; k < o.coups; k++) coup(.6); }
    BT.coups = o.coups;
  }
}

/* relier : le navigateur montre sa liste d'appareils, on s'abonne à tout ce que l'appareil choisi sait dire */
async function relierCapteur() {
  if (!BT_OK) { BT.etat = "Ce navigateur ne sait pas parler en Bluetooth (essaie Chrome ou Edge)."; return false; }
  const SERVICES = [0x1826, 0x1818, 0x1816, 0x180D];
  try {
    BT.etat = "Choisis ton appareil…";
    const app = await navigator.bluetooth.requestDevice({filters: SERVICES.map(s => ({services: [s]})), optionalServices: SERVICES});
    BT.etat = "Connexion à " + (app.name || "l'appareil") + "…";
    const serveur = await app.gatt.connect(), lus = [];
    const ecouter = async (service, carac, lire, nom) => {
      try { const c = await (await serveur.getPrimaryService(service)).getCharacteristic(carac);
        c.addEventListener("characteristicvaluechanged", e => { try { mesureBT(lire(e.target.value)); } catch (x) {} });
        await c.startNotifications(); lus.push(nom); return true; } catch (e) { return false; }
    };
    await ecouter(0x1826, 0x2AD2, lireVelo, "vélo"); await ecouter(0x1826, 0x2AD1, lireRameur, "rameur"); await ecouter(0x1826, 0x2ACE, lireElliptique, "elliptique");
    if (!lus.includes("vélo")) await ecouter(0x1818, 0x2A63, lirePuissance, "puissance");
    await ecouter(0x1816, 0x2A5B, lireCadence, "cadence"); await ecouter(0x180D, 0x2A37, lireCoeur, "cœur");
    try {   // un home trainer qui se pilote : on lui demande la main, pour lui envoyer la pente
      const c = await (await serveur.getPrimaryService(0x1826)).getCharacteristic(0x2AD9);
      await c.startNotifications().catch(() => {}); await c.writeValue(new Uint8Array([0])); BT.ctrl = c; lus.push("pente pilotée");
    } catch (e) { BT.ctrl = null; }
    app.addEventListener("gattserverdisconnected", () => { BT.etat = "Appareil déconnecté."; BT.appareil = null; BT.ctrl = null; BT.puissance = BT.vitesse = BT.cadence = null; S.capteur = false; });
    BT.appareil = app; BT.nom = app.name || "Appareil"; BT.etat = lus.length ? BT.nom + " relié : " + lus.join(", ") + "." : BT.nom + " ne donne rien que je sache lire.";
    return lus.length > 0;
  } catch (e) { BT.etat = e && e.name === "NotFoundError" ? "Aucun appareil choisi." : "Connexion impossible : " + (e && e.message || e); return false; }
}

/* la physique d'un vélo : des watts, un poids, une pente, de l'air → une vitesse (m/s). Elle s'intègre : l'élan existe, une côte se sent */
function physiqueVelo(v, watts, pente, dt) {
  const m = MACHINE.masse || 85, g = 9.81, crr = .005, cda = .32, rho = 1.2;
  const force = watts / Math.max(v, 1.2) - m * g * (pente + crr) - .5 * rho * cda * v * v;
  return clamp(v + force / m * dt, 0, 25);
}
/* chaque image : ce que les capteurs disent devient la vitesse du jeu (vrais mètres par seconde) */
function capteursMaj(dt) {
  if (!S.mode || S.pause) return;
  const frais = BT.appareil && performance.now() - BT.vu < 4000, pente = PISTE.PENTE[idx(S.s)];
  let watts = null, vitesse = null;
  if (frais) { watts = BT.puissance; vitesse = BT.vitesse; }
  else if (MACHINE.physique && S.mode === "essai" && S.auto) watts = 150;   // l'essai sans capteur : 150 watts, pour voir la pente jouer
  if (MACHINE.physique && watts !== null) { BT.v = physiqueVelo(BT.v, watts, pente, Math.min(dt, .1)); vitesseCapteur(BT.v); if (watts > 0 && !S.lance) demarrerChrono(); }
  else if (MACHINE.continu && vitesse !== null) { BT.v = vitesse; vitesseCapteur(vitesse); if (vitesse > .3 && !S.lance) demarrerChrono(); }
  else { S.capteur = false; BT.v = S.v; }
  // la pente, envoyée au home trainer toutes les 2 s si elle a changé (FTMS : simulation, opération 0x11 ; la pente en centièmes de pour cent)
  if (BT.ctrl && frais && (BT.envoi -= dt) <= 0) {
    BT.envoi = 2; const p = Math.round(clamp(pente * 100 * BT.difficulte, -10, 20) * 100);
    if (p !== BT.pente) { BT.pente = p; const b = new DataView(new ArrayBuffer(7)); b.setUint8(0, 0x11); b.setInt16(1, 0, true); b.setInt16(3, p, true); b.setUint8(5, 50); b.setUint8(6, 51); BT.ctrl.writeValue(b.buffer).catch(() => {}); }
  }
}
/* le contrôle sans appareil : des trames écrites à la main, lues par les mêmes fonctions (window.__trames()) */
window.__trames = () => {
  const dv = o => new DataView(new Uint8Array(o).buffer), r = {};
  r.velo = lireVelo(dv([0x44, 0x02, 0xC4, 0x09, 0xB4, 0x00, 0xC8, 0x00, 0x8C]));          // 25,00 km/h, 90 tr/min, 200 W, cœur 140
  r.rameur = lireRameur(dv([0x2C, 0x00, 0x30, 0x2A, 0x00, 0x10, 0x27, 0x00, 0x78, 0x00, 0x96, 0x00]));   // 24 coups/min, 42 coups, 10 000 m, 2:00 /500 m, 150 W
  r.puissance = lirePuissance(dv([0x00, 0x00, 0xFA, 0x00]));                               // 250 W
  r.coeur = lireCoeur(dv([0x00, 0x8E]));                                                    // 142
  let v = 0; for (let k = 0; k < 6000; k++) v = physiqueVelo(v, 200, 0, .02); r.plat_200w_kmh = +(v * 3.6).toFixed(1);
  v = 0; for (let k = 0; k < 6000; k++) v = physiqueVelo(v, 200, .06, .02); r.cote6_200w_kmh = +(v * 3.6).toFixed(1);
  return r;
};
