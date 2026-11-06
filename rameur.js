// Le rameur (Kiki, 06/11) : le téléphone fixé au siège compte les coups, sans rien savoir de son orientation. Inclus dans pokemon_ui.html par ecran_pokemon.py.
// Kiki entre à la fin ce qu'affiche le rameur : ces chiffres apprennent à l'appli à les deviner (seances_rameur.modele). Les capteurs sont gardés pour régler la détection.

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
const isoLocal = ms => { const d = new Date(ms), o = -d.getTimezoneOffset(), z = x => String(Math.floor(Math.abs(x))).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}${o < 0 ? "-" : "+"}${z(o / 60)}:${z(o % 60)}`; };
const RAMEUR_ENCOURS = "pkm_rameur_encours", RAMEUR_ATTENTE = "pkm_rameur", RAMEUR_BRUT_MAX = 108000, RAMEUR_DECOMPTE = 10, RAMEUR_PALIER = 300;  // 90 min de capteurs ; décompte et annonces du temps, en secondes
function rameurInterrompu() { try { return JSON.parse(localStorage.getItem(RAMEUR_ENCOURS) || "null"); } catch (e) { return null; } }
const STYLE_RAMEUR = `
.pkm-rameur .poche b{font-size:150px}.pkm-rameur .rame-info{display:flex;justify-content:space-around;width:100%;font-size:26px;margin-top:10px}.pkm-rameur .rame-info span small{display:block;font-size:15px}
.pkm-rameur .champs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px}.pkm-rameur label{display:block;color:#686850;font-size:16px}
.pkm-rameur .temps{display:flex;align-items:center;gap:4px}.pkm-rameur input{width:100%;min-width:0;box-sizing:border-box;padding:7px;background:#fff;color:#383828;border:2px solid #484838;border-radius:7px 3px;font:inherit;font-size:22px;user-select:text;-webkit-user-select:text}
.pkm-rameur .alerte{color:#C03028}.pkm-rameur .fait{display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;margin:6px 0}.pkm-rameur .fait b{display:block;font-weight:400;font-size:25px;color:#C03028}`;
// surFermer et quitter : pour la page du raccourci (rameur_page.html), où fermer ne ramène pas au jeu
function ecranRameur({reprise = null, surFermer = null, quitter = null} = {}) {
  preparerScene(); installerStyle("pkm-entr-style", STYLE_ENTR); installerStyle("pkm-rameur-style", STYLE_RAMEUR);
  const v = P.createElement("div"); v.className = "pkm-entr pkm-rameur"; P.body.appendChild(v);
  const parler = t => { try { const s = PW.speechSynthesis; s.cancel(); const u = new PW.SpeechSynthesisUtterance(t); u.lang = "fr-FR"; s.speak(u); } catch (e) {} };
  let verrou = null, chrono = null, garde = null, lire = null, surVisible = null;
  const couper = () => { clearInterval(chrono); clearInterval(garde); if (lire) PW.removeEventListener("devicemotion", lire); if (surVisible) P.removeEventListener("visibilitychange", surVisible); try { if (verrou) verrou.release(); } catch (e) {} };
  const fermer = () => { couper(); v.remove(); if (surFermer) surFermer(); };
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
      const temps = nb(".f-min") || nb(".f-sec") ? (nb(".f-min") || 0) * 60 + (nb(".f-sec") || 0) : null, duree = temps || b.actif_s;
      if (!duree) { v.querySelector(".f-erreur").textContent = "Il me faut le temps du rameur pour compter cette séance."; return; }
      const debut = b.coups ? e.debutMur + (b.premier - e.debutT) : e.debutMur, fin = Math.max(b.coups ? e.debutMur + (b.dernier - e.debutT) : e.finMur, debut + duree * 1000 * (temps ? 1 : 0));
      const s = {id: isoLocal(debut).slice(0, 19).replace("T", "-").replace(/:/g, ""), version: 1, debut: isoLocal(debut), fin: isoLocal(fin), duree_s: Math.round(duree), actif_s: b.actif_s, coups: b.coups, cadence: b.cadence, course_cm: b.course_cm, vitesse: b.vitesse, ratio: b.ratio, par_min: b.par_min,
        trou_s: Math.round(e.trou), saisi: {distance: nb(".f-dist"), temps_s: temps, watts: nb(".f-watts"), kcal: nb(".f-kcal")}};
      let deja = []; try { deja = JSON.parse(localStorage.getItem(RAMEUR_ATTENTE) || "[]"); } catch (x) {}
      deja = deja.filter(a => a.seance.id !== s.id);
      try { localStorage.setItem(RAMEUR_ATTENTE, JSON.stringify([...deja, {seance: s, brut: e.brut, coups: e.coups}])); }
      catch (x) {
        try { localStorage.setItem(RAMEUR_ATTENTE, JSON.stringify([...deja.map(a => ({seance: a.seance})), {seance: s}])); }  // plus de place : la séance d'abord, sans les capteurs
        catch (y) { v.querySelector(".f-erreur").textContent = "Le téléphone n'a plus de place : ta séance reste gardée ici, dis-le à Claude."; return; }
      }
      oublier();
      // Le rechargement peut prendre plusieurs secondes : le formulaire disparaît tout de suite, sinon on retouche le bouton sans rien voir (Kiki, 06/11 : 40 copies de la même séance)
      const recharger = () => { const u = new URL(PW.location.href); u.searchParams.set("frais", "1"); PW.location.href = u.href; };
      v.innerHTML = `<div class="boite"><h3>Séance gardée !</h3><p>Elle est bien sur ton téléphone. Je l'envoie et je recharge l'appli, ça peut prendre quelques secondes.</p></div><button class="sec relancer" style="visibility:hidden">Recharger l'appli</button>`;
      v.querySelector(".relancer").onclick = recharger;
      setTimeout(() => { const b2 = v.querySelector(".relancer"); if (b2) b2.style.visibility = "visible"; }, 15000);
      recharger();
    };
  }
  reprise = reprise || rameurInterrompu();  // une séance pas encore enregistrée passe d'abord : une nouvelle l'écraserait
  if (reprise) return formulaire(reprise);

  v.innerHTML = `<div class="boite"><div class="tete-e"><img src="${IMG.mini(86)}" alt=""><h3>Le rameur</h3></div>
      <p>Après « Lancer », tu as 10 secondes pour fixer le téléphone au siège, bien serré, dans le sens que tu veux. Démarre quand la voix dit « zéro ».</p><p>L'écran reste allumé. La voix te dira quand les coups sont comptés, puis le temps toutes les 5 minutes.</p></div>
    <button class="go lancer">Lancer la séance</button><button class="sec retour">${quitter ? quitter.texte : "Retour"}</button>`;
  v.querySelector(".retour").onclick = quitter ? quitter.faire : fermer;
  v.querySelector(".lancer").onclick = async () => {
    audio();
    if (PW.DeviceMotionEvent && PW.DeviceMotionEvent.requestPermission) { try { await PW.DeviceMotionEvent.requestPermission(); } catch (e) {} }
    const allumer = async () => { for (const w of [PAGE_HAUTE(), PW]) { try { verrou = await w.navigator.wakeLock.request("screen"); return; } catch (e) {} } };
    await allumer();
    surVisible = () => { if (P.visibilityState === "visible") allumer(); }; P.addEventListener("visibilitychange", surVisible);
    // Le temps d'accrocher le téléphone et de s'installer (Kiki, 06/11) : on ne mesure qu'à partir de « zéro »
    v.innerHTML = `<div class="gros r-compte">10</div><div class="rythme">Accroche le téléphone et mets-toi en position</div><button class="sec retour">Annuler</button>`;
    let annule = false; v.querySelector(".retour").onclick = () => { annule = true; try { PW.speechSynthesis.cancel(); } catch (e) {} fermer(); };
    for (let s = RAMEUR_DECOMPTE; s >= 0; s--) {
      v.querySelector(".r-compte").textContent = s; parler(s ? String(s) : "Zéro");
      if (s) await new Promise(r => setTimeout(r, 1000));
      if (annule) return;
    }
    vibre(200); ton(880, 0, .3, {type: "square", vol: .1});
    const A = analyseurRameur(), brut = []; let debutT = null, debutMur = Date.now(), recus = 0, dernier = null, trou = 0, sx = 0, sy = 0, sz = 0, sn = 0, suivant = 0, annonce = false, g = null;
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
        if (brut.length < RAMEUR_BRUT_MAX) brut.push(`${Math.round(mx * 100)},${Math.round(my * 100)},${Math.round(mz * 100)}`);
      }
    };
    PW.addEventListener("devicemotion", lire);
    v.innerHTML = `<div class="poche"><b class="r-nb">0</b><small>coups</small><div class="rame-info"><span><span class="r-cad">–</span><small>coups / min</small></span><span><span class="r-temps">0:00</span><small>temps</small></span></div><div class="msg r-msg"></div></div><button class="go finir">Terminer</button>`;
    const etat = () => ({debutT, debutMur, finMur: Date.now(), trou, brut: brut.join(";"), coups: A.coups.map(c => [Math.round(c.t), Math.round(c.dur * 100) / 100, Math.round(c.course * 1000) / 1000, Math.round(c.vit * 100) / 100, Math.round(c.ratio * 100) / 100])});
    const sauver = () => { try { localStorage.setItem(RAMEUR_ENCOURS, JSON.stringify(etat())); } catch (e) {} };
    const q = c => v.querySelector(c);
    let palierDit = 0;
    chrono = setInterval(() => {
      const n = A.coups.length, recents = A.coups.filter(c => dernier - c.t < 20000), sec = Math.round((Date.now() - debutMur) / 1000);
      q(".r-nb").textContent = n; q(".r-temps").textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
      q(".r-cad").textContent = recents.length >= 3 ? Math.round(recents.length * 60 / Math.max((recents[recents.length - 1].t - recents[0].t) / 1000 + recents[0].dur, 1)) : "–";
      q(".r-msg").textContent = !recus && sec > 3 ? "Les capteurs ne répondent pas" : n ? "" : "J'attends tes premiers coups";
      const palier = Math.floor(sec / RAMEUR_PALIER);
      if (palier > palierDit) { palierDit = palier; parler(`${palier * RAMEUR_PALIER / 60} minutes`); }  // le temps depuis « zéro », pauses comprises, comme le chrono à l'écran
      else if (!annonce && n >= 5) { annonce = true; vibre(40); parler("C'est bon, je compte tes coups."); }
    }, 500);
    garde = setInterval(sauver, 30000);
    confirmerDeuxFois(q(".finir"), "Touche encore pour finir", () => { const e = etat(); couper(); sauver(); formulaire(e); });
  };
}
