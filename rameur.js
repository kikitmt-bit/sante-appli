// Le rameur (Kiki, 06/11) : le téléphone fixé au siège compte les coups, sans rien savoir de son orientation. Inclus dans pokemon_ui.html par ecran_pokemon.py.
// Kiki entre à la fin ce qu'affiche le rameur : ces chiffres apprennent à l'appli à les deviner (seances_rameur.modele). Les capteurs sont gardés pour régler la détection.

// Changer l'adresse de la page : Streamlit interdit à ses cadres de le faire eux-mêmes (PW.location.href lève une erreur ; reload() passe). Un petit script posé dans la page parente, lui, en a le droit.
function allerA(url) {
  PW.__allerA = 0;
  try { const s = P.createElement("script"); s.textContent = `window.__allerA=1;location.href=${JSON.stringify(url)};`; P.head.appendChild(s); s.remove(); } catch (e) {}
  if (!PW.__allerA) PW.location.reload();
}

// Le calcul, sans aucun écran. ajouter(t en ms, accélération sans la pesanteur en m/s²).
// Le rail impose une seule direction : on la retrouve dans le mouvement (axe principal), quelle que soit la façon dont le téléphone est accroché.
const RAMEUR = {seuil: .08, oubli: 2.5, duree: [1, 8], course: .1, pic: .15, trou: 12, serie: 4};
function analyseurRameur() {
  const moy = [0, 0, 0], cov = [.01, 0, 0, .01, 0, .01], coups = [];
  let axe = [.577, .577, .577], avant = null, pAvant = 0, v = 0, sens = 0, demi = null, precedent = null;
  const finir = t => { if (!demi) return; demi.fin = t;
    if (precedent) {
      const [lent, vif] = precedent.pic > demi.pic ? [demi, precedent] : [precedent, demi], dur = (t - precedent.debut) / 1000, course = Math.max(demi.dist, precedent.dist), pic = vif.pic;
      if (dur >= RAMEUR.duree[0] && dur <= RAMEUR.duree[1] && course >= RAMEUR.course && pic >= RAMEUR.pic) {
        coups.push({t, dur, course, vit: pic, ratio: (lent.fin - lent.debut) / Math.max(vif.fin - vif.debut, 1)}); precedent = null; }
      else precedent = demi;  // une secousse : on repart du dernier mouvement, sans perdre le fil
    } else precedent = demi;
    demi = null; };
  return {coups, ajouter(t, x, y, z) {
    if (avant !== null && t - avant > 2000) { v = 0; sens = 0; demi = null; precedent = null; pAvant = 0; }
    const dt = avant === null ? 0 : Math.min((t - avant) / 1000, .25); avant = t;
    const km = Math.min(dt / 10, 1), kc = Math.min(dt / 20, 1), a = [x, y, z];
    for (let i = 0; i < 3; i++) { moy[i] += (a[i] - moy[i]) * km; a[i] -= moy[i]; }
    [a[0] * a[0], a[0] * a[1], a[0] * a[2], a[1] * a[1], a[1] * a[2], a[2] * a[2]].forEach((c, i) => { cov[i] += (c - cov[i]) * kc; });
    const n = [cov[0] * axe[0] + cov[1] * axe[1] + cov[2] * axe[2], cov[1] * axe[0] + cov[3] * axe[1] + cov[4] * axe[2], cov[2] * axe[0] + cov[4] * axe[1] + cov[5] * axe[2]], l = Math.hypot(...n);
    if (l > 1e-9) axe = n.map(c => c / l);
    const p = a[0] * axe[0] + a[1] * axe[1] + a[2] * axe[2];
    v = (v + (p + pAvant) / 2 * dt) * Math.exp(-dt / RAMEUR.oubli); pAvant = p;
    const s = v > RAMEUR.seuil ? 1 : v < -RAMEUR.seuil ? -1 : 0;
    if (s && s !== sens) { finir(t); sens = s; demi = {debut: t, dist: 0, pic: 0}; }
    if (demi) { demi.dist += Math.abs(v) * dt; demi.pic = Math.max(demi.pic, Math.abs(v)); }
  }};
}
// Les coups isolés (accrocher le téléphone, le décrocher, se lever) ne comptent pas : seulement les séries d'au moins 4 coups, sans arrêt de plus de 12 s.
function bilanRameur(coups) {
  const series = []; let s = [];
  coups.forEach(c => { if (s.length && (c.t - s[s.length - 1].t) / 1000 > RAMEUR.trou) { series.push(s); s = []; } s.push(c); });
  if (s.length) series.push(s);
  const bons = series.filter(x => x.length >= RAMEUR.serie);
  const tous = bons.flat(), n = tous.length;
  if (!n) return {coups: 0, actif_s: 0, cadence: 0, course_cm: 0, vitesse: 0, ratio: 0, par_min: {cad: [], course: []}, premier: null, dernier: null};
  const actif = bons.reduce((t, x) => t + (x[x.length - 1].t - x[0].t) / 1000 + x[0].dur, 0), moy = f => tous.reduce((t, c) => t + f(c), 0) / n;
  const debut = tous[0].t - tous[0].dur * 1000, cad = [], course = [];
  tous.forEach(c => { const m = Math.floor((c.t - debut) / 60000); while (cad.length <= m) { cad.push(0); course.push(0); } cad[m]++; course[m] += c.course * 100; });
  return {coups: n, actif_s: Math.round(actif), cadence: Math.round(n / actif * 600) / 10, course_cm: Math.round(moy(c => c.course) * 100), vitesse: Math.round(moy(c => c.vit) * 100) / 100, ratio: Math.round(moy(c => c.ratio) * 100) / 100,
    par_min: {cad, course: course.map((c, i) => cad[i] ? Math.round(c / cad[i]) : 0)}, premier: debut, dernier: tous[n - 1].t};
}
// La tablette (Kiki, 07/11) : chaque coup part en direct vers l'écran du jeu (?ecran=rameur), d'appareil à appareil (PeerJS : leur serveur gratuit ne sert qu'à
// se trouver). Tout est facultatif : sans tablette, la séance se passe exactement comme avant. surEtat(true / false) dit si la tablette est reliée.
const PEERJS = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
function lienTablette(surEtat, surMessage = () => {}, bonjour = () => ({})) {
  const nom = D.rameur && D.rameur.lien;
  if (!nom) return {envoyer() {}, fermer() {}};
  let peer = null, conn = null, essai = null, fini = false, enCours = false;
  const charger = () => window.Peer ? Promise.resolve() : new Promise((ok, ko) => { const s = document.createElement("script"); s.src = PEERJS; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
  const relier = () => {
    if (fini || conn || enCours || !peer || peer.destroyed) return;
    if (peer.disconnected) { try { peer.reconnect(); } catch (e) {} return; }
    enCours = true; const c = peer.connect("pokefit-rameur-" + nom, {reliable: true});
    const rate = setTimeout(() => { enCours = false; try { c.close(); } catch (e) {} }, 8000);
    c.on("open", () => { clearTimeout(rate); enCours = false; conn = c; surEtat(true); c.send({type: "bonjour", ...bonjour()}); });
    c.on("data", m => { if (conn === c && m && typeof m === "object") surMessage(m); });
    c.on("close", () => { clearTimeout(rate); enCours = false; if (conn === c) { conn = null; if (!fini) surEtat(false); } });
    c.on("error", () => { clearTimeout(rate); enCours = false; });
  };
  charger().then(() => {
    if (fini) return;
    peer = new window.Peer();
    peer.on("open", () => { relier(); essai = setInterval(relier, 5000); });  // la tablette peut s'ouvrir après : on la cherche toutes les 5 s
    peer.on("error", e => { if (e.type === "peer-unavailable") enCours = false; });
  }).catch(() => {});
  return {
    envoyer(m) { if (conn && conn.open) { try { conn.send(m); } catch (e) {} } },
    fermer() { fini = true; clearInterval(essai); try { if (conn) conn.close(); if (peer) peer.destroy(); } catch (e) {} },
  };
}
const isoLocal = ms => { const d = new Date(ms), o = -d.getTimezoneOffset(), z = x => String(Math.floor(Math.abs(x))).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}${o < 0 ? "-" : "+"}${z(o / 60)}:${z(o % 60)}`; };
const RAMEUR_ENCOURS = "pkm_rameur_encours", RAMEUR_ATTENTE = "pkm_rameur", RAMEUR_BRUT_MAX = 108000, RAMEUR_DECOMPTE = 10, RAMEUR_PALIER = 300;  // 90 min de capteurs ; décompte et annonces du temps, en secondes
function rameurInterrompu() { try { return JSON.parse(localStorage.getItem(RAMEUR_ENCOURS) || "null"); } catch (e) { return null; } }
const STYLE_RAMEUR = `
.pkm-rameur .poche b{font-size:150px}.pkm-rameur .rame-info{display:flex;justify-content:space-around;width:100%;font-size:26px;margin-top:10px}.pkm-rameur .rame-info span small{display:block;font-size:15px}
.pkm-rameur .champs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px}.pkm-rameur label{display:block;color:#686850;font-size:16px}
.pkm-rameur .temps{display:flex;align-items:center;gap:4px}.pkm-rameur input{width:100%;min-width:0;box-sizing:border-box;padding:7px;background:#fff;color:#383828;border:2px solid #484838;border-radius:7px 3px;font:inherit;font-size:22px;user-select:text;-webkit-user-select:text}
.pkm-rameur .alerte{color:#C03028}.pkm-rameur .fait{display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;margin:6px 0}.pkm-rameur .fait b{display:block;font-weight:400;font-size:25px;color:#C03028}`;
function ecranRameur({reprise = null} = {}) {
  preparerScene(); installerStyle("pkm-entr-style", STYLE_ENTR); installerStyle("pkm-rameur-style", STYLE_RAMEUR);
  const v = P.createElement("div"); v.className = "pkm-entr pkm-rameur"; P.body.appendChild(v);
  const parler = t => { try { const s = PW.speechSynthesis; s.cancel(); const u = new PW.SpeechSynthesisUtterance(t); u.lang = "fr-FR"; s.speak(u); } catch (e) {} };
  let verrou = null, chrono = null, garde = null, lire = null, surVisible = null, tablette = null, tabletteOk = false;
  const ecrireTablette = () => { const el = v.querySelector(".r-tab"); if (el) el.textContent = tabletteOk ? "Tablette reliée ✓" : (D.rameur && D.rameur.lien ? "Tablette : pas reliée (facultatif)" : ""); };
  const couper = () => { if (tablette) { tablette.envoyer({type: "fin"}); const t = tablette; tablette = null; setTimeout(() => t.fermer(), 500); } clearInterval(chrono); clearInterval(garde); if (lire) PW.removeEventListener("devicemotion", lire); if (surVisible) P.removeEventListener("visibilitychange", surVisible); try { if (verrou) verrou.release(); } catch (e) {} };
  const fermer = () => { couper(); v.remove(); };
  const oublier = () => { try { localStorage.removeItem(RAMEUR_ENCOURS); } catch (e) {} };

  function formulaire(e) {
    const b = bilanRameur(e.coups.map(c => ({t: c[0], dur: c[1], course: c[2], vit: c[3], ratio: c[4]}))), m = D.rameur && D.rameur.modele;
    const devine = m && b.coups >= 20 ? b.coups * (m.a + m.b * b.vitesse) : null;
    const mm = s => `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")}`;
    v.innerHTML = `<div class="boite"><h3>Séance terminée</h3>
        ${b.coups ? `<div class="fait"><span><b>${b.coups}</b>coups</span><span><b>${String(b.cadence).replace(".", ",")}</b>coups / min</span><span><b>${mm(b.actif_s)}</b>à ramer</span><span><b>≈ ${b.course_cm} cm</b>de course</span></div>`
          : `<p class="alerte">Le téléphone n'a pas vu de coups : entre au moins le temps du rameur pour garder ta séance.</p>`}
        ${e.trou > 20 ? `<p class="alerte">Le téléphone a arrêté de mesurer ${Math.round(e.trou / 60) || 1} min : il s'est sûrement mis en veille. Entre le temps du rameur.</p>` : ""}
      </div>
      <div class="boite"><h3>Ce qu'affiche le rameur</h3><small>Entre ce que tu peux : plus tu en donnes, plus vite l'appli apprend. La distance est la plus utile.</small>
        <div class="champs"><div><label>Distance (m)</label><input class="f-dist" type="number" inputmode="numeric" min="0" placeholder="${devine ? "≈ " + Math.round(devine) : ""}"></div>
        <div><label>Temps (min, s)</label><div class="temps"><input class="f-min" type="number" inputmode="numeric" min="0" placeholder="${Math.floor(b.actif_s / 60)}"><input class="f-sec" type="number" inputmode="numeric" min="0" max="59" placeholder="${String(b.actif_s % 60).padStart(2, "0")}"></div></div>
        <div><label>Watts moyens</label><input class="f-watts" type="number" inputmode="numeric" min="0"></div><div><label>Calories</label><input class="f-kcal" type="number" inputmode="numeric" min="0"></div></div>
        <p class="alerte f-erreur"></p></div>
      <button class="go garder">Enregistrer ma séance</button><button class="sec jeter">Ne pas la garder</button>`;
    const nb = c => { const x = parseFloat(v.querySelector(c).value); return x > 0 ? x : null; };
    confirmerDeuxFois(v.querySelector(".jeter"), "Sûr ? Touche encore : elle sera perdue", () => { oublier(); fermer(); });
    v.querySelector(".garder").onclick = () => {
      const erreur = garderSeance(e, {distance: nb(".f-dist"), min: nb(".f-min"), sec: nb(".f-sec"), watts: nb(".f-watts"), kcal: nb(".f-kcal")});
      if (erreur) v.querySelector(".f-erreur").textContent = erreur;
    };
  }
  // Ce qu'on garde d'une séance finie (saisie = ce qu'affiche le rameur, entré sur le téléphone ou sur la tablette ; jeu = ce que la tablette a joué) -> texte d'erreur, sinon recharge l'appli
  function garderSeance(e, saisie, jeu = null) {
    const b = bilanRameur(e.coups.map(c => ({t: c[0], dur: c[1], course: c[2], vit: c[3], ratio: c[4]}))), ok = x => (x > 0 ? x : null);
    const temps = ok(saisie.min) || ok(saisie.sec) ? (ok(saisie.min) || 0) * 60 + (ok(saisie.sec) || 0) : null, duree = temps || b.actif_s;
    if (!duree) return "Il me faut le temps du rameur pour compter cette séance.";
    const debut = b.coups ? e.debutMur + (b.premier - e.debutT) : e.debutMur, fin = Math.max(b.coups ? e.debutMur + (b.dernier - e.debutT) : e.finMur, debut + duree * 1000 * (temps ? 1 : 0));
    const s = {id: isoLocal(debut).slice(0, 19).replace("T", "-").replace(/:/g, ""), version: 1, debut: isoLocal(debut), fin: isoLocal(fin), duree_s: Math.round(duree), actif_s: b.actif_s, coups: b.coups, cadence: b.cadence, course_cm: b.course_cm, vitesse: b.vitesse, ratio: b.ratio, par_min: b.par_min,
      trou_s: Math.round(e.trou), saisi: {distance: ok(saisie.distance), temps_s: temps, watts: ok(saisie.watts), kcal: ok(saisie.kcal)}};
    if (jeu) s.jeu = jeu;
    let deja = []; try { deja = JSON.parse(localStorage.getItem(RAMEUR_ATTENTE) || "[]"); } catch (x) {}
    deja = deja.filter(a => a.seance.id !== s.id);
    try { localStorage.setItem(RAMEUR_ATTENTE, JSON.stringify([...deja, {seance: s, brut: e.brut, coups: e.coups}])); }
    catch (x) {
      try { localStorage.setItem(RAMEUR_ATTENTE, JSON.stringify([...deja.map(a => ({seance: a.seance})), {seance: s}])); }  // plus de place : la séance d'abord, sans les capteurs
      catch (y) { return "Le téléphone n'a plus de place : ta séance reste gardée ici, dis-le à Claude."; }
    }
    oublier();
    if (tablette) tablette.envoyer({type: "garde", id: s.id});
    // Le rechargement peut prendre plusieurs secondes : le formulaire disparaît tout de suite, sinon on retouche le bouton sans rien voir (Kiki, 06/11 : 40 copies de la même séance)
    const recharger = () => PW.location.reload();
    v.innerHTML = `<div class="boite"><h3>Séance gardée !</h3><p>Elle est bien sur ton téléphone. Je l'envoie et je recharge l'appli, ça peut prendre quelques secondes.</p></div><button class="sec relancer" style="visibility:hidden">Recharger l'appli</button>`;
    v.querySelector(".relancer").onclick = recharger;
    setTimeout(() => { const b2 = v.querySelector(".relancer"); if (b2) b2.style.visibility = "visible"; }, 15000);
    setTimeout(recharger, tablette ? 700 : 0);  // le temps que la tablette reçoive « gardée »
    return null;
  }
  reprise = reprise || rameurInterrompu();  // une séance pas encore enregistrée passe d'abord : une nouvelle l'écraserait
  if (reprise) return formulaire(reprise);

  const avecTab = !!(D.rameur && D.rameur.lien);
  v.innerHTML = `<div class="boite"><div class="tete-e"><img src="${IMG.mini(86)}" alt=""><h3>Le rameur</h3></div>
      <p><b>Seul</b> : après « Lancer », tu as 10 secondes pour fixer le téléphone au siège, bien serré, dans le sens que tu veux. Démarre quand la voix dit « zéro ». L'écran reste allumé, la voix te dit le temps toutes les 5 minutes.</p>
      ${avecTab ? `<p><b>Avec la tablette</b> : ouvre d'abord le jeu dessus (l'appli avec <b>?ecran=rameur</b> à la fin de l'adresse). Le téléphone se relie, tu l'accroches, et tout se pilote depuis la tablette : départ, fin, ce qu'affiche le rameur.</p>` : ""}</div>
    ${avecTab ? `<button class="go tab">Avec la tablette</button>` : ""}<button class="${avecTab ? "sec" : "go"} lancer">Lancer seul</button><button class="sec retour">Retour</button>`;
  v.querySelector(".retour").onclick = fermer;
  let mesure = null;  // la séance en cours : {etat(), arreter(), nb(), debutMur}
  const preparer = async () => {
    audio();
    if (PW.DeviceMotionEvent && PW.DeviceMotionEvent.requestPermission) { try { await PW.DeviceMotionEvent.requestPermission(); } catch (e) {} }
    const allumer = async () => { for (const w of [PAGE_HAUTE(), PW]) { try { verrou = await w.navigator.wakeLock.request("screen"); return; } catch (e) {} } };
    await allumer();
    surVisible = () => { if (P.visibilityState === "visible") allumer(); }; P.addEventListener("visibilitychange", surVisible);
  };
  // Le décompte : le temps d'accrocher le téléphone et de s'installer (Kiki, 06/11) ; on ne mesure qu'à partir de « zéro ». muet : c'est la tablette qui parle
  const decompter = async (n, muet) => {
    for (let s = n; s >= 0; s--) {
      const el = v.querySelector(".r-compte"); if (el) el.textContent = s;
      if (!muet) parler(s ? String(s) : "Zéro");
      if (tablette) tablette.envoyer(s ? {type: "decompte", s} : {type: "zero"});
      if (s) await new Promise(r => setTimeout(r, 1000));
      if (!v.isConnected) return false;
    }
    return true;
  };
  function mesurer(pilote) {  // pilote = la tablette commande tout : pas de voix ici, et la fin vient d'elle
    vibre(200); if (!pilote) ton(880, 0, .3, {type: "square", vol: .1});
    const A = analyseurRameur(), brut = []; let debutT = null, debutMur = Date.now(), recus = 0, dernier = null, trou = 0, sx = 0, sy = 0, sz = 0, sn = 0, suivant = 0, annonce = false, g = null, envoyes = 0;
    lire = e => {
      const t = e.timeStamp || performance.now(), a = e.acceleration, i = e.accelerationIncludingGravity;
      let x, y, z;
      if (a && a.x != null) { x = a.x; y = a.y; z = a.z; }
      else if (i && i.x != null) { g = g || {x: i.x, y: i.y, z: i.z}; g.x += (i.x - g.x) * .02; g.y += (i.y - g.y) * .02; g.z += (i.z - g.z) * .02; x = i.x - g.x; y = i.y - g.y; z = i.z - g.z; }
      else return;
      recus++;
      if (debutT === null) { debutT = t; debutMur = Date.now(); suivant = t; }
      if (dernier !== null && t - dernier > 2000) trou += (t - dernier) / 1000;
      dernier = t; sx += x; sy += y; sz += z; sn++;
      if (t >= suivant) {  // 20 mesures par seconde, moyennées : assez pour un coup de rame, et 30 min tiennent sur le téléphone
        const mx = sx / sn, my = sy / sn, mz = sz / sn; sx = sy = sz = sn = 0; suivant = t + 50;
        A.ajouter(t, mx, my, mz);
        while (envoyes < A.coups.length) { const c = A.coups[envoyes++]; if (tablette) tablette.envoyer({type: "coup", n: envoyes, dur: c.dur, course: c.course, vit: c.vit, ratio: c.ratio}); }
        if (brut.length < RAMEUR_BRUT_MAX) brut.push(`${Math.round(mx * 100)},${Math.round(my * 100)},${Math.round(mz * 100)}`);
      }
    };
    PW.addEventListener("devicemotion", lire);
    v.innerHTML = `<div class="poche"><b class="r-nb">0</b><small>coups</small><div class="rame-info"><span><span class="r-cad">–</span><small>coups / min</small></span><span><span class="r-temps">0:00</span><small>temps</small></span></div><div class="msg r-msg"></div><div class="msg r-tab"></div></div><button class="${pilote ? "sec" : "go"} finir">${pilote ? "Terminer ici" : "Terminer"}</button>`;
    ecrireTablette();
    const etat = () => ({debutT, debutMur, finMur: Date.now(), trou, brut: brut.join(";"), coups: A.coups.map(c => [Math.round(c.t), Math.round(c.dur * 100) / 100, Math.round(c.course * 1000) / 1000, Math.round(c.vit * 100) / 100, Math.round(c.ratio * 100) / 100])});
    const sauver = () => { try { localStorage.setItem(RAMEUR_ENCOURS, JSON.stringify(etat())); } catch (e) {} };
    const q = c => v.querySelector(c);
    let palierDit = 0;
    chrono = setInterval(() => {
      const n = A.coups.length, recents = A.coups.filter(c => dernier - c.t < 20000), sec = Math.round((Date.now() - debutMur) / 1000);
      q(".r-nb").textContent = n; q(".r-temps").textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
      q(".r-cad").textContent = recents.length >= 3 ? Math.round(recents.length * 60 / Math.max((recents[recents.length - 1].t - recents[0].t) / 1000 + recents[0].dur, 1)) : "–";
      q(".r-msg").textContent = !recus && sec > 3 ? "Les capteurs ne répondent pas" : n ? "" : "J'attends tes premiers coups";
      if (pilote) return;
      const palier = Math.floor(sec / RAMEUR_PALIER);
      if (palier > palierDit) { palierDit = palier; parler(`${palier * RAMEUR_PALIER / 60} minutes`); }  // le temps depuis « zéro », pauses comprises, comme le chrono à l'écran
      else if (!annonce && n >= 5) { annonce = true; vibre(40); parler("C'est bon, je compte tes coups."); }
    }, 500);
    garde = setInterval(sauver, 30000);
    // Arrêter les capteurs et garder la séance de côté ; avec la tablette, le lien reste ouvert pour recevoir ce qu'affiche le rameur
    const arreter = () => {
      const e = etat(); clearInterval(chrono); clearInterval(garde); PW.removeEventListener("devicemotion", lire); lire = null; sauver(); mesure = null;
      return e;
    };
    mesure = {etat, arreter, nb: () => A.coups.length, debutMur};
    confirmerDeuxFois(q(".finir"), "Touche encore pour finir", () => { const e = arreter(); couper(); formulaire(e); });
  }
  v.querySelector(".lancer").onclick = async () => {
    await preparer();
    tablette = null;  // seul : comme avant, sans tablette (Kiki, 07/11 : c'est l'un ou l'autre)
    v.innerHTML = `<div class="gros r-compte">10</div><div class="rythme">Accroche le téléphone et mets-toi en position</div><button class="sec retour">Annuler</button>`;
    v.querySelector(".retour").onclick = () => { try { PW.speechSynthesis.cancel(); } catch (e) {} fermer(); };
    if (await decompter(RAMEUR_DECOMPTE, false)) mesurer(false);
  };
  // Avec la tablette (Kiki, 07/11 : le téléphone est sous le siège, on ne peut plus le toucher) : il se relie et attend ses ordres.
  // La tablette envoie « lancer » (décompte), « stop » (fin des capteurs), puis « saisie » (ce qu'affiche le rameur) ou « jeter ».
  const btab = v.querySelector(".tab");
  if (btab) btab.onclick = async () => {
    await preparer();
    let fin = null, attente = true;
    const ecran = () => {
      if (mesure || !v.isConnected) return;
      v.innerHTML = fin ? `<div class="boite"><h3>Séance terminée</h3><p>Entre ce qu'affiche le rameur sur la tablette : elle me l'envoie et j'enregistre la séance.</p><div class="msg r-tab"></div></div><button class="sec remplir">Remplir ici plutôt</button>`
        : `<div class="boite"><h3>Avec la tablette</h3><p>Accroche le téléphone au siège, bien serré, et installe-toi. Tout se lance depuis la tablette.</p><p class="msg r-tab"></p></div><button class="sec retour">Annuler</button>`;
      ecrireTablette();
      if (fin) v.querySelector(".remplir").onclick = () => { const e = fin; couper(); formulaire(e); };
      else v.querySelector(".retour").onclick = fermer;
    };
    const bilanPour = e => {
      const b = bilanRameur(e.coups.map(c => ({t: c[0], dur: c[1], course: c[2], vit: c[3], ratio: c[4]}))), m = D.rameur && D.rameur.modele;
      return {type: "bilan", coups: b.coups, cadence: b.cadence, actif_s: b.actif_s, trou_s: Math.round(e.trou), devine: m && b.coups >= 20 ? Math.round(b.coups * (m.a + m.b * b.vitesse)) : null};
    };
    tablette = lienTablette(ok => { tabletteOk = ok; ecrireTablette(); if (ok) vibre(60); },
      async m => {
        if (m.type === "lancer" && attente && !mesure && !fin) {
          attente = false; v.innerHTML = `<div class="gros r-compte">${m.s || 5}</div><div class="rythme">Départ donné par la tablette</div><div class="msg r-tab"></div>`; ecrireTablette();
          if (await decompter(Math.max(0, Math.min(15, m.s || 5)), true)) mesurer(true);
        } else if (m.type === "lancer" && mesure) tablette.envoyer({type: "zero"});  // déjà en route : la tablette s'était déconnectée
        else if (m.type === "stop" && mesure) { fin = mesure.arreter(); ecran(); tablette.envoyer(bilanPour(fin)); }
        else if (m.type === "stop" && fin) tablette.envoyer(bilanPour(fin));
        else if (m.type === "saisie" && fin) { const err = garderSeance(fin, m, m.jeu || null); if (err) tablette.envoyer({type: "erreur", texte: err}); }
        else if (m.type === "jeter" && fin) { oublier(); tablette.envoyer({type: "jete"}); vibre(80); fermer(); }
      },
      () => ({etat: mesure ? "mesure" : fin ? "fini" : "attente", n: mesure ? mesure.nb() : 0, depuis: mesure ? mesure.debutMur : null}));
    ecran();
  };
}
