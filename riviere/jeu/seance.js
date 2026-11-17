/* ============ la séance : le menu, la fin, ce qu'affiche le rameur, l'enregistrement (11/11, Kiki) ============ */
// Une vraie séance : la montre rame, le chrono part au premier coup, chaque tour est chronométré ; « Fin » arrête tout, on entre ce qu'affiche
// le rameur (distance, temps, calories : tout facultatif) et la séance part comme celles du téléphone : localStorage pkm_rameur, puis la page
// de l'appli se recharge et l'envoie (app.py, envoyer_rameur → seances_rameur.ranger). L'essai (sans montre) n'enregistre jamais rien.
// Toutes les machines (14/11, étape 1 du plan) : même séance, avec "machine" ; le skieur de fond sans saisie (pas d'écran : sa distance est
// l'estimation vers le bas du jeu, gardée à part dans "estime", jamais comptée), le vélo seulement avec un vrai capteur ("capteur" : sa distance).
const ATTENTE = "pkm_rameur", ENCOURS = "riviere_encours";
const lireLS = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const ecrireLS = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
const isoLocal = ms => { const d = new Date(ms), o = -d.getTimezoneOffset(), z = x => String(Math.floor(Math.abs(x))).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}${o < 0 ? "-" : "+"}${z(o / 60)}:${z(o % 60)}`; };
const metres = m => Math.round(m).toLocaleString("fr-FR");
const aDuContenu = b => b.nb > 0 || (MACHINE.continu && b.dist > 20);   // une séance qui vaut d'être gardée (le vélo n'a pas de « coups »)
const gardable = b => MACHINE.enregistre && (!MACHINE.capteurRequis || !!b.capteur);
const DANS_APPLI = (() => { try { return window.parent !== window && !!window.parent.location.href; } catch (e) { return false; } })();

function panneau(html) { const p = $("panneau"); p.innerHTML = `<div class="boite">${html}</div>`; p.hidden = false; return p; }
function fermerPanneau() { $("panneau").hidden = true; $("panneau").innerHTML = ""; }
function majBoutons() { $("bAuto").hidden = S.mode !== "essai"; $("bFin").hidden = !S.mode || S.pause; $("hPret").hidden = !(S.mode === "vraie" && !S.lance && !S.pause); }

/* le menu : ce qu'on voit en arrivant (refait le 12/11, Kiki : « cohérent et pratique »). Il se lit de haut en bas, dans l'ordre où l'on choisit :
   1. la machine (trois grands boutons : rameur, skieur de fond, vélo) ; 2. les circuits de cette machine seulement (l'eau pour le rameur, la terre
   pour le skieur de fond et le vélo), créer ou générer le sien ; 3. les réglages, repliés (ambiance, adversaires, fantôme, capteur Bluetooth, son) ;
   tout en bas, l'état de la montre et « Commencer la séance ». Tant qu'aucune machine n'a été choisie sur cet appareil, seule la 1re étape se montre. */
const HEURES_MENU = [["circuit", "Du circuit"], ["reelle", "Heure réelle"], ["matin", "Matin"], ["jour", "Jour"], ["soir", "Soir"], ["nuit", "Nuit"], ["cycle", "Journée qui défile"]];
const METEOS_MENU = [["circuit", "Du circuit"], ["beau", "Beau"], ["variable", "Variable"], ["nuages", "Nuages"], ["pluie", "Pluie"], ["orage", "Orage"], ["brume", "Brume"], ["neige", "Neige"]];
const ACTIVITE = {rameur: "eau", elliptique: "terre", velo: "terre"};   // l'activité de chaque machine : ses circuits à elle (eau : rivières ; terre : routes et chemins)
const MACHINES_MENU = [["rameur", "Rameur", "Sur l'eau · la montre compte tes coups"], ["elliptique", "Skieur de fond", "L'appareil du parc, pieds à plat · la montre compte tes tours"], ["velo", "Vélo", "Sur la terre · home trainer Bluetooth"]];
const boutons = (liste, choisi, attr) => liste.map(([k, t]) => `<button class="opt${choisi === k ? " on" : ""}" data-${attr}="${k}">${t}</button>`).join("");
const libelle = (liste, k) => ((liste.find(x => x[0] === k) || liste[0])[1]).toLowerCase();
/* le Pokémon qui nage (14/11) : choisi au menu parmi les nageurs (contenu/nageurs.json), gardé sur l'appareil (riviere_nageur) */
const metresNageur = n => n.taille ? String(n.taille).replace(".", ",") + " m" : "";
const texteNageur = () => { const f = NAGEUR.fiche || {}; return (f.nom || "celui du circuit") + (f.taille ? " (" + metresNageur(f) + ")" : ""); };
async function portraitNageur(cv, num) {   // sa tête au menu : la première image de sa planche, de face
  const pl = await planche(String(num).padStart(4, "0") + "/Walk"); if (!pl || !cv.isConnected) return;
  const b = pl.boite(0), w = b.x1 - b.x0, h = b.y1 - b.y0, k = Math.min(cv.width / w, cv.height / h, 2), x = cv.getContext("2d");
  x.imageSmoothingEnabled = false; x.drawImage(pl.tex.image, b.x0, b.y0, w, h, Math.round((cv.width - w * k) / 2), Math.round(cv.height - h * k), Math.round(w * k), Math.round(h * k));
}
function choisirCircuit(id) {   // un autre circuit : on le garde pour les prochaines fois, et la page repart avec lui
  if (FORCE) { try { sessionStorage.setItem("riviere_niveau_une_fois", id); } catch (e) {} } else ecrireReglage("riviere_niveau_" + disciplineDe(NIVEAUX[id] || CIRCUITS_PERSO[id]), id);
  relancer();
}
function choisirMachine(m) {   // une autre machine : gardée sur l'appareil ; pour le reste de la visite, elle passe aussi devant celle de l'adresse
  ecrireReglage("riviere_machine", m); if (ACTIVITE[m] === "terre") ecrireReglage("riviere_machine_terre", m); ecrireReglage("riviere_surface", null);
  try { sessionStorage.setItem("riviere_machine_menu", m); } catch (e) {}
  if (m === MACHINE_NOM) { ouvrirMenu(); return; }   // c'était déjà elle (premier choix sur cet appareil) : rien à reconstruire
  relancer();
}
function ouvrirMenu() {
  S.mode = null; S.pause = false; majBoutons();
  const enc = lireLS(ENCOURS, null), reprise = enc && aDuContenu(enc) && Date.now() - enc.maj < 12 * 3600e3 && (enc.machine || "rameur") === MACHINE_NOM && gardable(enc) ? enc : null;
  if (enc && !reprise && (enc.machine || "rameur") === MACHINE_NOM) ecrireLS(ENCOURS, null);   // une séance qui ne s'enregistre pas (skieur de fond) ou trop vieille : rien à récupérer
  const attend = (lireLS(ATTENTE, []) || []).length, der = (D.dernieres || {})[MACHINE_NOM] || (MACHINE_NOM === "rameur" ? D.derniere : null);
  const choisie = MACHINE_CHOISIE || !!lireReglage("riviere_machine", null), disc = ACTIVITE[MACHINE_NOM], bonne = disc === DISCIPLINE;
  const circuits = Object.entries(NIVEAUX).filter(([k, n]) => !n.cache && disciplineDe(n) === disc).sort((x, y) => (y[1].jour ? 1 : 0) - (x[1].jour ? 1 : 0)).map(([k, n]) => [k, n.nom || k, false])
    .concat(Object.entries(CIRCUITS_PERSO).filter(([k, n]) => disciplineDe(n) === disc).map(([k, n]) => [k, n.nom || k, true]));
  const courant = k => bonne && !NIVEAU.brouillon && (NIVEAU.id || "") === k;
  const hChoix = PARAMS.get("heure") || lireReglage("riviere_heure", "circuit") || "circuit", mChoix = PARAMS.get("meteo") || lireReglage("riviere_meteo", "circuit") || "circuit";
  const pour = {rameur: "le rameur", elliptique: "le skieur de fond", velo: "le vélo"}[MACHINE_NOM];
  const p = panneau(`<h1>Ta séance</h1>
    ${attend ? `<p class="alerte">Une séance attend d'être envoyée : recharge la page.</p>` : ""}
    <h2><span class="num">1</span>Ta machine</h2>
    <div class="machines">${MACHINES_MENU.map(([k, t, s]) => `<button class="machine${choisie && k === MACHINE_NOM ? " on" : ""}" data-machine="${k}"><b>${t}</b><small>${s}</small></button>`).join("")}</div>
    ${choisie && MACHINE_NOM === "rameur" && DISCIPLINE === "eau" && NAGEUR.fiche ? `<details class="pli"><summary id="mNageur">Ton Pokémon : ${texteNageur()}</summary>
      <div class="nageurs">${NAGEURS.liste.map(n => `<button class="nageur${n.num === NAGEUR.num ? " on" : ""}" data-nageur="${n.num}"><canvas width="48" height="48"></canvas><b>${n.nom}</b><small>${metresNageur(n)}</small></button>`).join("")}</div>
      <p class="petit">Chacun nage à sa vraie taille. Les temps et les records ne changent pas.</p></details>` : ""}
    ${choisie && MACHINE_NOM === "elliptique" ? `<div class="fantomes"><small>CE QUE TU VOIS</small>${boutons([["trotteur", "Ton Pokémon trottine"], ["cycliste", "À vélo"]], MACHINE.monture, "monture")}<p class="petit">${MACHINE.monture === "trotteur" ? "Le décor défile au petit trot (6,5 km/h à ton allure habituelle) ; les chiffres restent tes vrais mètres. Ses records sont à part de ceux du vélo." : "Le décor défile comme sur un vélo (15 km/h à ton allure habituelle) ; les chiffres restent tes vrais mètres."}</p></div>
      ${MACHINE.monture === "trotteur" && TROT.fiche ? `<div class="nageurs">${TROTTEURS.liste.map(n => `<button class="nageur${n.num === TROT.num ? " on" : ""}" data-trotteur="${n.num}"><canvas width="48" height="48"></canvas><b>${n.nom}</b><small>${metresNageur(n)}</small></button>`).join("")}</div><p class="petit">Ton Pokémon : chacun trottine à sa vraie taille.</p>` : ""}` : ""}
    ${choisie && MACHINE.monture === "cycliste" && typeof CYC !== "undefined" && cycSprite() ? `<div class="fantomes"><small>TON CYCLISTE</small>${boutons([["sprite", "Tout en pixels"], ["mixte", "Vélo 3D, dresseur en pixels"], ["3d", "Tout en 3D"]], CYC.mode, "cycliste")}<p class="petit">Tout en pixels : ton dresseur et son vélo dessinés comme les Pokémon. Vélo 3D : le vélo en volumes avec son panier, ton dresseur en pixels dessus. Les records ne changent pas.</p></div>` : ""}
    ${!choisie ? `<p class="petit">Choisis ta machine : ses circuits apparaîtront ensuite.</p>` : `
    <h2><span class="num">2</span>Ton circuit</h2>
    ${NIVEAU.brouillon ? `<p class="petit">Tu essaies un brouillon de l'éditeur : ${NIVEAU.nom}.</p>` : ""}
    <div class="circuits">${circuits.map(([k, t, perso]) => `<button class="circuit${courant(k) ? " on" : ""}${NIVEAUX[k] && NIVEAUX[k].jour ? " dujour" : ""}" data-c="${k}"><b>${perso ? "✏️ " : NIVEAUX[k] && NIVEAUX[k].jour ? "☀️ " : ""}${t}</b>${NIVEAUX[k] && NIVEAUX[k].jour && !courant(k) ? `<small>Le même pour tout le monde aujourd'hui, avec son classement</small>` : ""}${courant(k) ? `<small>${BOUCLE ? "Un tour = " + metres(TOUR_M) + " m" : metres(TOUR_M) + " m"}${record ? " · record " + chrono(record) : " · pas encore de record"}${NIVEAU.jour && typeof NIVEAU.note === "number" ? " · note " + NIVEAU.note + " / 100" : ""}</small>` : ""}</button>`).join("")}</div>
    ${classementDuJour()}
    ${circuits.length ? "" : `<p class="alerte">Pas encore de circuit pour ${pour} : crée le tien ou génère-le.</p>`}
    <div class="fantomes">${NIVEAU.brouillon ? `<button class="opt" id="mEditeur2">✏️ Retour à l'éditeur</button>` : ""}<button class="opt" id="mEditeur">✏️ Créer, générer ou modifier un circuit</button></div>
    <h2><span class="num">3</span>Réglages</h2>
    <details class="pli"><summary>Ambiance : ${hChoix === "circuit" && mChoix === "circuit" ? "celle du circuit" : (hChoix === "circuit" ? "heure du circuit" : libelle(HEURES_MENU, hChoix)) + ", " + (mChoix === "circuit" ? "temps du circuit" : libelle(METEOS_MENU, mChoix))}</summary>
      <div class="fantomes"><small>L'HEURE</small>${boutons(HEURES_MENU, hChoix, "h")}</div>
      <div class="fantomes"><small>LE TEMPS</small>${boutons(METEOS_MENU, mChoix, "m")}</div>
      <div class="fantomes"><small>LES EFFETS (l'eau qui coule, le vent dans les arbres, les forêts au loin, les ombres)</small>${EFFETS.circuit ? boutons([["1", "Avec"], ["0", "Sans"]], lireReglage("riviere_effets", "1") === "0" ? "0" : "1", "x") : `<p class="petit">Pas sur ce circuit : il reste tel qu'il a toujours été.</p>`}</div></details>
    <details class="pli"><summary>Adversaires et fantôme</summary>
      <div class="fantomes"><small>ADVERSAIRES (des Pokémon qui tiennent une allure réglée sur la tienne)</small>${boutons([["aucun", "Aucun"], ["tranquilles", "Tranquilles"], ["coriaces", "Coriaces"]], RIVAUX.choix, "r")}</div>
      <div class="fantomes"><small>TON FANTÔME</small>${boutons([["record", "Mon record"], ["seance", "Meilleur tour de la séance"], ["aucun", "Aucun"]], FANTOME.choix, "f")}<p class="petit" id="mFantome"></p></div></details>
    <details class="pli"${MACHINE_NOM === "velo" ? " open" : ""}><summary>Capteur Bluetooth et son</summary>
      <div class="fantomes"><small>CAPTEUR BLUETOOTH (home trainer, rameur ou elliptique connecté, ceinture cardio)</small>
        <button class="opt" id="mBT" ${BT_OK ? "" : "disabled"}>Relier un capteur</button><p class="petit" id="mBTetat">${BT_OK ? BT.etat || "Rien de relié." : "Ce navigateur ne parle pas Bluetooth (Chrome ou Edge le font)."}</p></div>
      ${MACHINE_NOM === "velo" ? `<div class="fantomes"><small>DURETÉ DES PENTES (un home trainer pilotable durcit dans les côtes ; 100 % = la vraie pente, les descentes comptent à moitié)</small>${boutons([["0", "0 %"], ["0.25", "25 %"], ["0.5", "50 %"], ["0.75", "75 %"], ["1", "100 %"]], String(BT.difficulte), "dur")}
        <button class="opt" id="mFaux">Essayer avec un faux home trainer</button><p class="petit">Le faux home trainer imite un vrai (il reçoit la pente et durcit) : pour voir que tout marche. Une séance faite avec lui ne compte jamais.</p></div>` : ""}
      <div class="fantomes"><small>SON</small><button class="opt${SON.actif ? " on" : ""}" id="mSon">${SON.actif ? "Bruitages" : "Coupé"}</button></div></details>
    <div class="depart">
      <p class="etat-montre" id="mMontre"></p>
      ${der ? `<p class="petit">Dernière séance : ${der.quand}${der.distance ? " · " + metres(der.distance) + " m" : der.estime ? " · ≈ " + metres(der.estime) + " m" : ""}${der.tours ? " · " + der.tours + " tour" + (der.tours > 1 ? "s" : "") : ""}</p>` : ""}
      <div class="choix">
        ${reprise ? `<button class="rouge" id="mReprise">▶ Récupérer la séance interrompue (${fmt(reprise.t)})</button><button class="sec" id="mJeter">Annuler la séance interrompue</button>` : ""}
        <button class="rouge" id="mGo" ${bonne ? "" : "disabled"}>▶ Commencer la séance</button>
        <button class="sec" id="mEssai" ${bonne ? "" : "disabled"}>Essayer sans montre</button>
      </div></div>`}`);
  p.querySelectorAll("[data-machine]").forEach(b => b.onclick = () => { if (choisie && b.dataset.machine === MACHINE_NOM) return; b.querySelector("small").textContent = "Chargement…"; choisirMachine(b.dataset.machine); });
  if (!choisie) return;
  let sur = 0;   // une séance interrompue se perdrait : deux touchers (le cadre de l'appli n'autorise pas les fenêtres de confirmation)
  const un = (sel, liste, f) => p.querySelectorAll(sel).forEach(b => b.onclick = () => { p.querySelectorAll(sel).forEach(x => x.classList.toggle("on", x === b)); f(b); });
  p.querySelector("#mGo").onclick = e => { if (reprise && ++sur < 2) { e.target.textContent = "La séance interrompue sera perdue : touche encore"; return; } ecrireLS(ENCOURS, null); commencer("vraie"); };
  p.querySelector("#mEssai").onclick = () => commencer("essai");
  if (reprise) p.querySelector("#mReprise").onclick = () => ouvrirFin(reprise, true);
  let jet = 0;   // deux touchers : elle ne compterait jamais
  if (reprise) p.querySelector("#mJeter").onclick = e => { if (++jet < 2) { e.target.textContent = "Elle ne comptera pas : touche encore pour l'annuler"; return; } ecrireLS(ENCOURS, null); ouvrirMenu(); };
  if (NIVEAU.brouillon) p.querySelector("#mEditeur2").onclick = () => ouvrirEditeur();
  p.querySelector("#mEditeur").onclick = () => ouvrirEditeur();
  p.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { if (!courant(b.dataset.c)) { b.querySelector("b").textContent = "Chargement…"; choisirCircuit(b.dataset.c); } });
  p.querySelectorAll("[data-nageur]").forEach(b => { portraitNageur(b.querySelector("canvas"), +b.dataset.nageur);   // ton Pokémon : il change tout de suite, derrière le menu
    b.onclick = async () => { const n = +b.dataset.nageur; if (n === NAGEUR.num) return; ecrireReglage("riviere_nageur", n); p.querySelectorAll("[data-nageur]").forEach(x => x.classList.toggle("on", x === b));
      await changerNageur(n); const el = $("mNageur"); if (el) el.textContent = "Ton Pokémon : " + texteNageur(); }; });
  p.querySelectorAll("[data-trotteur]").forEach(b => { portraitNageur(b.querySelector("canvas"), +b.dataset.trotteur);   // ton trotteur (skieur de fond) : il change tout de suite, derrière le menu
    b.onclick = async () => { const n = +b.dataset.trotteur; if (n === TROT.num) return; ecrireReglage("riviere_trotteur", n); p.querySelectorAll("[data-trotteur]").forEach(x => x.classList.toggle("on", x === b)); await changerTrotteur(n); }; });
  p.querySelectorAll("[data-cycliste]").forEach(b => b.onclick = () => { if (b.dataset.cycliste === CYC.mode) return; CYC.choisir(b.dataset.cycliste); p.querySelectorAll("[data-cycliste]").forEach(x => x.classList.toggle("on", x === b)); });   // tout de suite, derrière le menu
  p.querySelectorAll("[data-monture]").forEach(b => b.onclick = () => { if (b.dataset.monture === MACHINE.monture) return; ecrireReglage("riviere_monture_elliptique", b.dataset.monture); b.textContent = "Chargement…"; relancer(); });
  un("[data-h]", null, b => { ecrireReglage("riviere_heure", b.dataset.h); reglerAmbiance(b.dataset.h === "circuit" ? NIVEAU.heure || "jour" : b.dataset.h, null); });   // on voit le ciel changer derrière le menu
  un("[data-m]", null, b => { ecrireReglage("riviere_meteo", b.dataset.m); reglerAmbiance(null, b.dataset.m === "circuit" ? NIVEAU.meteo || "beau" : b.dataset.m); });
  un("[data-x]", null, b => { if (b.dataset.x === (lireReglage("riviere_effets", "1") === "0" ? "0" : "1")) return; ecrireReglage("riviere_effets", b.dataset.x); b.textContent = "Chargement…"; relancer(); });   // les effets (étape 9 du plan) : le monde est refait avec ou sans
  un("[data-r]", null, b => choisirRivaux(b.dataset.r));
  un("[data-f]", null, b => { choisirFantome(b.dataset.f); majTexteFantome(); });
  un("[data-dur]", null, b => { BT.difficulte = +b.dataset.dur; BT.pente = null; ecrireReglage("riviere_difficulte", BT.difficulte); });   // (16/11) la dureté des pentes du home trainer
  const faux = p.querySelector("#mFaux"); if (faux) faux.onclick = async () => { const el = $("mBTetat"); await relierCapteur(true); if (el && el.isConnected) el.textContent = BT.etat; };
  p.querySelector("#mBT").onclick = async e => { const el = $("mBTetat"), t = setInterval(() => { if (el.isConnected) el.textContent = BT.etat; }, 300); await relierCapteur(); clearInterval(t); if (el.isConnected) el.textContent = BT.etat; };
  p.querySelector("#mSon").onclick = e => { const oui = sonBasculer(); e.target.classList.toggle("on", oui); e.target.textContent = oui ? "Bruitages" : "Coupé"; majSon(); };
  majTexteFantome(); majMenuMontre();
}
/* le circuit du jour (15/11, étape 5 du plan) : tiré par GitHub cette nuit, le même pour tout le monde (D.jour, riviere/jour.py) ; son classement =
   le meilleur tour de chaque joueur sur ce circuit et cette machine, pris dans les records du serveur (un record part avec la séance enregistrée) */
function classementDuJour() {
  if (!NIVEAU.jour || !D.jour) return "";
  const lignes = (((D.jour.classement || {})[DISCIPLINE] || {})[MACHINE_NOM] || []).slice(0, 10), pour = {rameur: "au rameur", elliptique: "au skieur de fond", velo: "à vélo"}[MACHINE_NOM] || "";
  const esc2 = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<div class="classement"><small>CLASSEMENT DU JOUR ${pour.toUpperCase()}</small>${lignes.length ? `<ol>${lignes.map(l => `<li${l.moi ? ' class="moi"' : ""}><span>${esc2(l.nom)}</span><b>${chrono(l.t)}</b></li>`).join("")}</ol>`
    : `<p class="petit">Personne n'a encore bouclé un tour aujourd'hui : le premier tour d'une séance enregistrée prend la tête.</p>`}
    <p class="petit">Un nouveau circuit chaque matin. Ton meilleur tour compte une fois la séance enregistrée.</p></div>`;
}
function majTexteFantome() { const el = $("mFantome"); if (!el) return;
  el.textContent = FANTOME.choix === "aucun" ? "Pas de fantôme." : FANTOME.choix === "record" ? (FANTOME.record ? "Ton record (" + chrono(FANTOME.record.t) + ") nage avec toi dès le premier tour." : "Pas encore de record : ton meilleur tour de la séance le remplace dès le 2e tour.") : "Ton meilleur tour de cette séance nage avec toi dès le 2e tour."; }
function majMenuMontre() {
  const el = $("mMontre"); if (!el) return;
  const la = MONTRE.sujet && MONTRE.vu && performance.now() - MONTRE.vu < 12000;
  el.className = "etat-montre" + (la ? " la" : "");
  if (MACHINE_NOM === "velo") { el.className = "etat-montre" + (BT.appareil ? " la" : ""); el.textContent = BT.appareil ? BT.nom + " relié" : "Relie ton home trainer : Réglages, Capteur Bluetooth"; return; }
  el.textContent = !MONTRE.sujet ? "Pas de lien avec la montre ici : seul l'essai marche." : la ? "Montre reliée" + (MONTRE.h ? " · ♥ " + MONTRE.h : "") : "Sur la montre : « Capteurs », " + (MACHINE.montre || MACHINE.nom) + ", ● Enregistrer";
}
setInterval(majMenuMontre, 1000);

/* départ : on remet tout à zéro, avant la ligne */
function commencer(mode) {
  Object.assign(S, {mode, s: PARAMS.has("s") ? +PARAMS.get("s") : BOUCLE ? LONG - ELAN : 6, v: 0, v1: 0, v2: 0, vL: 0, vn: 0, t: 0, dist: 0, nb: 0, coupsT: [], tour: 0, tourT0: 0, tours: [],
    lance: false, pause: false, capteurVu: false, debutMur: 0, t0: performance.now(), pauseTot: 0, auto: mode === "essai" && PARAMS.get("auto") !== "0", prochain: .6});
  M.y = null; CAM.y = null; sonDemarrer(); eveiller();
  S.capteur = false; BT.v = 0; BT.coups = null; RIVAUX.t0 = null; for (const r of RIVAUX.liste) r.vr = 0; SEG.actif = null; SEG.faits = []; SEG.dernier = null;
  fermerPanneau(); majAuto(); majBoutons(); fantomeChoisi(); fourchesDepart(); filmDepart();
  if (mode === "essai") annoncer("ESSAI : TOUCHE L'ÉCRAN");
}

/* pendant la séance : on la garde sur la machine toutes les 10 s (un onglet fermé, une coupure : on la récupère au menu) */
const bilanDe = () => ({machine: MACHINE_NOM, debutMur: S.debutMur, t: S.t, nb: S.nb, dist: MACHINE.continu ? S.dist : Math.max(S.dist, S.nb * M_COUP), tours: S.tours.slice(), segments: SEG.faits.slice(), capteur: !!S.capteurVu, maj: Date.now()});
setInterval(() => { if (S.mode === "vraie" && S.lance && !S.pause && MACHINE.enregistre) ecrireLS(ENCOURS, bilanDe()); }, 10000);

function mettrePause() { S.pause = true; S.pauseDebut = performance.now(); majBoutons(); }
function reprendre() { S.pauseTot += performance.now() - S.pauseDebut; S.pause = false; fermerPanneau(); majBoutons(); }
$("bFin").addEventListener("pointerdown", e => { e.stopPropagation();
  if (FILM.actif) return;
  if (S.mode === "essai" || !gardable(bilanDe())) { mettrePause(); filmJouer(finEssai); return; }   // d'abord le film de la séance (film.js), puis le résumé
  mettrePause(); if (S.lance) ecrireLS(ENCOURS, bilanDe());
  filmJouer(() => ouvrirFin(bilanDe(), false)); });

function resume(b) {
  const meilleur = b.tours.length ? Math.min(...b.tours) : 0;
  return `<div class="chiffres"><div><small>TEMPS</small>${fmt(b.t)}</div><div><small>${MACHINE.gestes}</small>${b.nb}</div>
    <div><small>CADENCE</small>${b.t > 20 ? Math.round(b.nb / (b.t / 60)) : 0}/min</div><div><small>DISTANCE</small>${MACHINE.saisie || MACHINE.capteurRequis ? "" : "≈ "}${metres(b.dist)} m</div></div>
    ${b.tours.length ? `<div class="tours">${b.tours.map((t, i) => `<span class="${t === meilleur && b.tours.length > 1 ? "mieux" : ""}">Tour ${i + 1} · ${chrono(t)}</span>`).join("")}</div>` : `<p class="petit">Aucun tour complet.</p>`}
    ${(b.segments || []).length ? `<div class="tours">${b.segments.map(g => `<span>${g.nom} · ${chrono(g.t)}</span>`).join("")}</div>` : ""}`;
}
function finEssai() {
  const essai = S.mode === "essai";
  const p = panneau(`<h1>${essai ? "Fin de l'essai" : "Fin de la séance"}</h1>${resume(bilanDe())}<p class="petit">${essai ? "Un essai n'est jamais enregistré." : MACHINE.capteurRequis ? "Aucun capteur Bluetooth n'a donné ta vitesse : sans lui, je ne sais pas ce que tu as vraiment fait, cette séance ne comptera nulle part." : "Les séances de cette machine ne sont pas encore enregistrées dans l'appli : celle-ci ne comptera nulle part."}</p>
    <div class="choix"><button class="rouge" id="fMenu">▶ ${essai ? "Retour au menu" : "Terminer (rien n'est gardé)"}</button><button class="sec" id="fReprendre">Reprendre</button>${filmRevoirBouton()}</div>`);
  if (p.querySelector("#fFilm")) p.querySelector("#fFilm").onclick = () => { fermerPanneau(); filmJouer(finEssai); };
  p.querySelector("#fMenu").onclick = () => { ecrireLS(ENCOURS, null); ouvrirMenu(); };
  p.querySelector("#fReprendre").onclick = reprendre;
}

/* la fin d'une vraie séance : ce qu'affiche le rameur, au pavé numérique (la tablette n'a pas toujours de clavier) */
function ouvrirFin(b, recuperee, deja) {   // deja : ce qui était entré avant « Revoir le film »
  if (!aDuContenu(b)) { ecrireLS(ENCOURS, null); ouvrirMenu(); return; }
  const champs = Object.assign({dist: "", min: "", sec: "", kcal: ""}, deja); let actif = "dist", jeter = 0;
  const p = panneau(`<h1>${recuperee ? "Séance interrompue" : "Fin de la séance"}</h1>
    <div class="choix"><button class="sec" id="fJeter">✕ Annuler la séance (elle ne comptera pas)</button></div>${resume(b)}
    ${MACHINE.saisie ? `<h2>Ce qu'affiche ton rameur</h2>
    <div class="saisie">
      <label data-c="dist"><small>DISTANCE</small><span></span> m</label>
      <label data-c="min" class="court"><small>TEMPS</small><span></span> min</label><label data-c="sec" class="court"><small>&nbsp;</small><span></span> s</label>
      <label data-c="kcal"><small>CALORIES</small><span></span> kcal</label>
    </div>
    <div class="pave">${[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map(k => `<button class="touche" data-k="${k}" ${k === "" ? "disabled" : ""}>${k}</button>`).join("")}</div>
    <p class="petit">Tout est facultatif : sans temps, je garde celui du jeu (${fmt(b.t)}).</p>` : `<p class="petit">${MACHINE.capteurRequis ? "Distance mesurée par ton capteur." : "Ta machine n'affiche rien : la distance est une estimation vers le bas (≈) ; dans Poké Fit, seul ton temps compte."}</p>`}
    <p class="alerte" id="fErreur"></p>
    <div class="choix">
      <button class="rouge" id="fGarder">▶ Enregistrer la séance</button>
      ${recuperee ? "" : `<button class="sec" id="fReprendre">Reprendre</button>${filmRevoirBouton()}`}
    </div>`);
  if (!recuperee && p.querySelector("#fFilm")) p.querySelector("#fFilm").onclick = () => { const c = Object.assign({}, champs); fermerPanneau(); filmJouer(() => ouvrirFin(b, false, c)); };
  const maj = () => p.querySelectorAll(".saisie label").forEach(l => { const c = l.dataset.c; l.classList.toggle("actif", c === actif); l.querySelector("span").textContent = champs[c] || (c === "dist" ? "—" : c === "kcal" ? "—" : "--"); });
  p.querySelectorAll(".saisie label").forEach(l => l.onclick = () => { actif = l.dataset.c; maj(); });
  p.querySelectorAll(".touche").forEach(t => t.onclick = () => { const k = t.dataset.k, max = {dist: 6, min: 3, sec: 2, kcal: 4}[actif];
    if (k === "⌫") champs[actif] = champs[actif].slice(0, -1); else if (champs[actif].length < max) champs[actif] = (champs[actif] + k).replace(/^0+(?=\d)/, "");
    if (actif === "sec" && +champs.sec > 59) champs.sec = "59"; maj(); });
  if (MACHINE.saisie) maj();
  if (!recuperee) p.querySelector("#fReprendre").onclick = reprendre;
  p.querySelector("#fJeter").onclick = e => { if (++jeter < 2) { e.target.textContent = "Sûr ? Touche encore : rien ne sera gardé"; return; } ecrireLS(ENCOURS, null); ouvrirMenu(); };
  p.querySelector("#fGarder").onclick = () => {
    const n = c => (+champs[c] > 0 ? +champs[c] : null), temps = n("min") || n("sec") ? (n("min") || 0) * 60 + (n("sec") || 0) : null;
    const err = garder(b, MACHINE.saisie ? {distance: n("dist"), temps_s: temps, kcal: n("kcal")} : {distance: null, temps_s: null, kcal: null});
    if (err) p.querySelector("#fErreur").textContent = err;
  };
}

function garder(b, saisi) {
  const duree = saisi.temps_s || Math.round(b.t), debut = b.debutMur || Date.now() - b.t * 1000, meilleur = b.tours.length ? Math.min(...b.tours) : null;
  const s = {id: isoLocal(debut).slice(0, 19).replace("T", "-").replace(/:/g, ""), version: 1, machine: MACHINE_NOM, source: MACHINE.capteurRequis ? "capteur" : "montre",
    debut: isoLocal(debut), fin: isoLocal(debut + duree * 1000), duree_s: duree, actif_s: Math.round(b.t), coups: b.nb, cadence: b.t > 20 && b.nb ? Math.round(b.nb / (b.t / 60) * 10) / 10 : null,
    saisi: {distance: saisi.distance, temps_s: saisi.temps_s, watts: null, kcal: saisi.kcal},
    ...(MACHINE.saisie ? {} : MACHINE.capteurRequis ? {capteur: {distance: Math.round(b.dist)}} : {estime: {distance: Math.round(b.dist)}}),
    jeu: {mode: "riviere", niveau: NIVEAU.id, tour_m: Math.round(TOUR_M), dist: Math.round(b.dist), tours: b.tours.length,
      meilleur_tour: meilleur && Math.round(meilleur * 10) / 10, temps_tours: b.tours.map(t => Math.round(t * 10) / 10), segments: b.segments || [], heure: AMB.heure, meteo: AMB.meteo}};
  const deja = (lireLS(ATTENTE, []) || []).filter(a => a.seance && a.seance.id !== s.id);
  const recs = recordsAEnvoyer();   // tes records battus pendant que le serveur ne les avait pas : ils partent avec la séance (records.js)
  if (!ecrireLS(ATTENTE, [...deja, {seance: s, ...(recs ? {records: recs} : {})}])) return "Impossible de garder la séance sur cette machine (plus de place ?).";
  ecrireLS(ENCOURS, null);
  // le rechargement de l'appli peut prendre quelques secondes : le formulaire disparaît tout de suite (une seule séance gardée, même si on retouche)
  const p = panneau(`<h1>Séance gardée !</h1>${resume(b)}<p>${DANS_APPLI ? "Je l'envoie et je recharge, ça peut prendre quelques secondes." : "Gardée sur cette machine. Hors de l'appli (essai sur le PC), elle n'est pas envoyée."}</p>
    <div class="choix">${DANS_APPLI ? "" : `<button class="rouge" id="gMenu">▶ Retour au menu</button>`}</div>`);
  if (DANS_APPLI) setTimeout(() => { try { window.parent.location.reload(); } catch (e) { location.reload(); } }, 400);
  else p.querySelector("#gMenu").onclick = ouvrirMenu;
  return null;
}
