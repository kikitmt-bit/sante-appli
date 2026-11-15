/* ============ le résumé de séance (15/11, étape 10 du plan) : 20 à 30 s de ta séance rejouées à la fin, comme un petit film ============ */
// Pendant la séance, le jeu garde en mémoire ton trajet (toutes les 0,2 s : le temps, le mètre de décor, les vrais mètres, les voies prises aux
// fourches), l'heure de tes coups, et les moments que lui signalent les autres modules (un tour, Ronflex réveillé ou le « BOING ! », une fourche
// prise par la voie « force »). Les sauts, les entrées de tunnel et ton plus gros effort se retrouvent ensuite dans le trajet.
// À « ■ Fin », filmJouer choisit 3 à 5 moments, environ 5 s chacun, et les rejoue dans le vrai décor : ton Pokémon refait exactement ton trajet,
// la caméra change de plan à chaque moment (de face, de côté, d'en haut, posée au bord), ralenti au sommet d'un saut ; puis tes chiffres.
// Rien n'est enregistré ni envoyé : le film n'existe qu'en mémoire, le temps de la séance. « Passer » à tout moment ; s'il plante, on passe.
// Pour regarder sans ramer : window.__filmEssai(minutes) fabrique une fausse séance sur le circuit (toujours la voie calme) et la rejoue.
const FILM = {t: [], s: [], d: [], v: [], coups: [], ev: [], prochain: 0,   // le trajet, les coups, les moments signalés
  actif: false, plans: [], k: 0, tau: 0, rate: 1, phase: null, ensuite: null, avant: null, el: null, nbAvant: 0, dernier: null};
const FILM_PAS = .2;

function filmDepart() { Object.assign(FILM, {t: [], s: [], d: [], v: [], coups: [], ev: [], prochain: 0, dernier: null}); FILM.nbAvant = S.nb; }   // une nouvelle séance
const masqueVoies = () => { let m = 0; for (let f = 0; f < PISTE.NF; f++) if (VOIES.prise[f]) m |= 1 << f; return m; };
function filmNoter() {   // à chaque image d'une séance lancée, hors pause
  if (FILM.actif || BANC || S.fige) return;
  if (S.nb > FILM.nbAvant) { for (let k = FILM.nbAvant; k < S.nb; k++) FILM.coups.push(S.t); FILM.nbAvant = S.nb; }
  if (S.t < FILM.prochain) return;
  FILM.prochain = S.t + FILM_PAS;
  FILM.t.push(S.t); FILM.s.push(S.s); FILM.d.push(S.dist); FILM.v.push(masqueVoies());
}
function filmEvenement(e) { if (FILM.actif || !S.mode || BANC) return; e.t = S.t; e.s = S.s; FILM.ev.push(e); }   // appelé par jeu.js, rencontres.js, fourches.js

/* ---- lire le trajet : où étais-tu au temps tau de la séance ---- */
function filmIndice(tau) { const T_ = FILM.t; let a = 0, b = T_.length - 1; if (tau <= T_[0]) return 0; if (tau >= T_[b]) return b; while (b - a > 1) { const m = (a + b) >> 1; if (T_[m] <= tau) a = m; else b = m; } return a; }
function filmPoint(tau) {   // {s, d, v (voies), vd (m/s de décor), vr (vrais m/s)}
  const F = FILM, n = F.t.length, i = filmIndice(tau), j = Math.min(n - 1, i + 1), dt = F.t[j] - F.t[i] || 1, u = clamp((tau - F.t[i]) / dt, 0, 1);
  let s0 = F.s[i], s1 = F.s[j];
  if (BOUCLE && s1 < s0 - LONG / 2) s1 += LONG;
  const saute = !BOUCLE && Math.abs(s1 - s0) > 60;   // un parcours ouvert qui repart du début : pas d'entre-deux
  let s = saute ? s0 : lerp(s0, s1, u); if (BOUCLE) s = ((s % LONG) + LONG) % LONG;
  return {s, d: lerp(F.d[i], F.d[j], u), v: F.v[i], vd: saute ? 0 : (s1 - s0) / dt, vr: (F.d[j] - F.d[i]) / dt};
}
function poserVoies(m) { for (let f = 0; f < PISTE.NF; f++) VOIES.prise[f] = (m >> f) & 1; }
function filmPassage(cible, apres, max = 150) {   // quand ton trajet passe le mètre « cible » (après le temps « apres ») ; null : jamais
  const F = FILM;
  for (let i = Math.max(1, filmIndice(apres)); i < F.t.length && F.t[i] - apres <= max; i++) {
    const a = ecart(cible, F.s[i - 1]), b = ecart(cible, F.s[i]);
    if (a > 0 && b <= 0 && a - b < 40) return lerp(F.t[i - 1], F.t[i], a / (a - b || 1));
  }
  return null;
}

/* ---- choisir les moments ---- */
const titrePiece = s => { const p = pieceEn(s); return p && p.titre ? String(p.titre) : ""; };
function filmChoisir() {
  const F = FILM, n = F.t.length; if (n < 50) return [];   // moins de 10 s de trajet : pas de film
  const t0 = F.t[0], t1 = F.t[n - 1], C = [], garde = Array.from(VOIES.prise);
  const ajoute = (c) => { c.ta = Math.max(t0, c.tc - (c.av || 3)); c.tb = Math.min(t1, c.tc + (c.ap || 2)); if (c.tb - c.ta >= 2.5) C.push(c); };
  // les tours : le record, ton meilleur tour de la séance
  const tours = F.ev.filter(e => e.type === "tour"), meilleur = tours.length ? Math.min(...tours.map(e => e.tl)) : 0;
  for (const e of tours) {
    const best = e.tl === meilleur;
    ajoute({type: "tour", tc: e.t, av: 3.2, ap: 1.8, plan: "face", cle: "tour" + e.n, score: e.record ? 100 : best ? 55 : 15,
      titre: "TOUR " + e.n + " · " + chrono(e.tl), sous: e.record ? "RECORD !" : best && tours.length > 1 ? "Ton meilleur tour de la séance" : ""});
  }
  // Ronflex : le moment où tu passes à sa hauteur
  for (const e of F.ev.filter(e => e.type === "ronflex" || e.type === "boing")) {
    const r = RENC.liste[e.i]; if (!r) continue;
    const tp = e.type === "boing" ? e.t : filmPassage(r.s, e.t); if (tp === null) continue;
    if (e.type === "ronflex") ajoute({type: "ronflex", tc: tp, av: 3.2, ap: 2, plan: "fixe", sFixe: r.s + 13, haut: .8, cote: -(e.cote || 1), renc: e.i, cle: "renc" + e.i + "_" + Math.round(tp / 60), score: 80, titre: "RONFLEX RÉVEILLÉ !", sous: "Il t'a laissé passer"});
    else ajoute({type: "boing", tc: tp, av: 3, ap: 2.2, plan: "cote", cle: "renc" + e.i + "_" + Math.round(tp / 60), score: 50, titre: "BOING !", sous: "Ronflex dormait encore…"});
  }
  // une fourche prise par la voie « force » : le milieu de la voie
  for (const e of F.ev.filter(e => e.type === "fourche")) {
    const v = PISTE.voies[e.nf]; if (!v) continue;
    const tp = filmPassage(v.a + ecart(v.b, v.a) * .4, e.t); if (tp === null) continue;
    ajoute({type: "fourche", tc: tp, av: 3, ap: 2, plan: "haut", cle: "f" + e.nf + "_" + Math.round(tp / 60), score: 70, titre: String(v.annonce || "La voie rapide").toUpperCase() + " !", sous: "Tu as forcé à la fourche"});
  }
  // dans le trajet : les sauts (une chute ou un tremplin de 1,5 m au moins), les entrées de tunnel, les nouveaux paysages
  let netAv = 0, tunAv = 0, titreAv = null;
  for (let i = 0; i < n; i += 1) {
    poserVoies(F.v[i]); const s = F.s[i], k = idx(s), net = PISTE.NET[k] ? 1 : 0, tun = PISTE.TUN[k] ? 1 : 0, ti = titrePiece(s);
    if (net && !netAv) {
      const y0 = at(s - 2).y; let bas = y0, sBas = s; for (let m = 0; m <= 30; m += 1) { const y = at(s + m).y; if (y < bas - .05) { bas = y; sBas = s + m; } }
      const chute = y0 - bas;   // la caméra : au bord, une dizaine de mètres après le pied de la chute, elle te regarde tomber
      if (chute >= 1.5) ajoute({type: "saut", tc: F.t[i] + .6, av: 3, ap: 2.6, plan: "fixe", sFixe: sBas + 11, haut: 1.2, cote: 1, cle: "saut" + Math.round(s / 20), score: 60 + Math.min(20, chute * 3), titre: (ti || "Le grand saut").toUpperCase(), sous: "Quel saut !"});
    }
    if (tun && !tunAv && i > 0) ajoute({type: "tunnel", tc: F.t[i], av: 3.5, ap: 1.5, plan: "jeu", cle: "tun" + Math.round(s / 20), score: 25, titre: (ti || "Le tunnel").toUpperCase(), sous: ""});
    if (ti && ti !== titreAv && i > 0) ajoute({type: "paysage", tc: F.t[i] + 4, av: 2.5, ap: 2.5, plan: "cote", cle: "p" + ti, score: 10, titre: ti.toUpperCase(), sous: ""});
    netAv = net; tunAv = tun; titreAv = ti;
  }
  for (let f = 0; f < PISTE.NF; f++) VOIES.prise[f] = garde[f];
  // ton plus gros effort : les 4 secondes les plus rapides, s'il dépasse nettement ta moyenne
  const fen = Math.round(4 / FILM_PAS), moy = (F.d[n - 1] - F.d[0]) / Math.max(1, t1 - t0); let mx = 0, im = -1;
  for (let i = fen; i < n; i++) { const v = (F.d[i] - F.d[i - fen]) / Math.max(.1, F.t[i] - F.t[i - fen]); if (v > mx) { mx = v; im = i; } }
  if (im > 0 && moy > .3 && mx > moy * 1.12)
    ajoute({type: "sprint", tc: F.t[im] - 1, av: 3, ap: 2, plan: "cote", cle: "sprint", score: 40, titre: "TON PLUS GROS EFFORT", sous: MACHINE.affiche === "kmh" ? (mx * 3.6).toFixed(1) + " km/h" : fmt(500 / mx) + " /500 m"});
  // les meilleurs, assez loin les uns des autres, jamais deux fois le même endroit
  C.sort((a, b) => b.score - a.score);
  const pris = [], cles = new Set();
  for (const c of C) {
    if (pris.length >= 5) break;
    if (cles.has(c.cle) || pris.some(p => c.ta < p.tb + .5 && c.tb > p.ta - .5)) continue;
    pris.push(c); cles.add(c.cle);
  }
  pris.sort((a, b) => a.tc - b.tc);
  const TOUR_PLANS = ["cote", "haut", "face", "jeu"];
  for (let k = 1; k < pris.length; k++) if (pris[k].plan === pris[k - 1].plan && !["fixe"].includes(pris[k].plan)) pris[k].plan = TOUR_PLANS[(TOUR_PLANS.indexOf(pris[k].plan) + 1) % TOUR_PLANS.length];
  return pris;
}

/* ---- l'écran du film : bandes de cinéma, le titre du moment, « Passer », le noir entre deux plans, tes chiffres à la fin ---- */
function filmEcran() {
  if (FILM.el) return FILM.el;
  const st = document.createElement("style");
  st.textContent = "#film{position:fixed;inset:0;pointer-events:none;z-index:40;font-family:inherit}"
    + "#film .bande{position:absolute;left:0;right:0;height:9vh;background:#000;transition:transform .5s}#film .b1{top:0;transform:translateY(-100%)}#film .b2{bottom:0;transform:translateY(100%)}"
    + "#film.on .b1,#film.on .b2{transform:none}"
    + "#film .noir{position:absolute;inset:0;background:#000;opacity:0}"
    + "#film .tete{position:absolute;left:max(2.2vw,env(safe-area-inset-left,0px));top:2.2vh;font-size:min(4vh,3vw);color:#F8C838;letter-spacing:.08em}"
    + "#film .titre{position:absolute;left:50%;bottom:13vh;transform:translateX(-50%);text-align:center;white-space:nowrap;font-size:min(9vh,7vw);opacity:0;transition:opacity .4s}"
    + "#film .titre small{font-size:.45em;color:#F8C838;-webkit-text-stroke:.1em #1B2440}#film .titre.vu{opacity:1}"
    + "#film .fin{position:absolute;left:50%;top:36%;transform:translate(-50%,-50%);text-align:center;white-space:nowrap;font-size:min(8vh,6vw);opacity:0;transition:opacity .5s}"
    + "#film .fin.vu{opacity:1}#film .fin small{font-size:.45em;color:#F8C838;margin-bottom:.3em}#film .fin p{margin:.25em 0 0;font-size:.55em}"
    + "#film button{position:absolute;right:max(2.2vw,env(safe-area-inset-right,0px));bottom:calc(9vh + 1.5vh);pointer-events:auto;font:inherit;font-size:min(4.4vh,3.6vw);padding:.15em .9em;color:#383828;background:#F8F8E8;border:2px solid #484838;border-radius:12px 5px;box-shadow:3px 3px 0 #1B2440}"
    + "body.film .hud,body.film #carte,body.film #profil,body.film #bAuto,body.film #bFin,body.film #bSon,body.film #bPlein,body.film #panneau{display:none!important}body.film #film .hud{display:block!important}";
  document.head.appendChild(st);
  const el = document.createElement("div"); el.id = "film"; el.hidden = true;
  el.innerHTML = '<div class="noir"></div><div class="bande b1"></div><div class="bande b2"></div><div class="hud tete">LE RÉSUMÉ DE TA SÉANCE</div>'
    + '<div class="hud titre"><span></span><small></small></div><div class="hud fin"></div><button type="button">Passer ▶</button>';
  document.body.appendChild(el);
  el.querySelector("button").addEventListener("pointerdown", e => { e.stopPropagation(); filmFinir(); });
  return FILM.el = el;
}

/* ---- jouer, et tout remettre comme avant ---- */
function filmPossible() { return !BANC && !S.fige && FILM.t.length >= 50; }
function filmJouer(ensuite) {
  let plans = [];
  try { plans = filmPossible() ? filmChoisir() : []; } catch (e) { console.error(e); plans = []; }
  if (!plans.length) { ensuite(); return; }
  const F = FILM;
  F.avant = {s: S.s, nb: S.nb, coupT: S.coupT, elan: S.elan, v1: S.v1, v2: S.v2, vL: S.vL, vd: S.vd, prise: Array.from(VOIES.prise), M: Object.assign({}, M),
    renc: RENC.liste.map(r => ({etat: r.etat, t0: r.t0, cote: r.cote, demande: r.demande, q: r.q.m.visible, ev: r.ev ? MONDE.evenements.includes(r.ev) : false,
      d: r.debout ? r.debout.m.visible : false, j: r.joie ? r.joie.m.visible : false})),
    fourches: FOURCHES.liste.map(f => f.etat), fov: camera.fov};
  F.dernier = plans; F.plans = plans; F.ensuite = ensuite; F.k = -1; F.actif = true; F.phase = "plan";
  EFFORT.demande = null; for (const r of RENC.liste) r.demande = null; for (const f of FOURCHES.liste) f.demande = null;
  if (FANTOME.pantin) FANTOME.pantin.m.visible = false; if (typeof cacherFantomeVelo === "function") cacherFantomeVelo();
  for (const r of RIVAUX.liste) if (r.pantin) r.pantin.m.visible = false;
  const el = filmEcran(); el.hidden = false; el.querySelector(".fin").classList.remove("vu"); document.body.classList.add("film");
  requestAnimationFrame(() => el.classList.add("on"));
  filmPlan(0);
}
function filmPlan(k) {   // aller au début du plan k (un saut dans le temps : on pose tout comme c'était)
  const F = FILM, p = F.plans[k]; F.k = k; F.tau = p.ta;
  const q = filmPoint(p.ta); poserVoies(q.v);
  S.s = q.s; S.coupT = undefined; M.y = null; M.air = false; M.vy = 0; M.d = trajectoire(S.s); CAM.y = null; CAM.z1 = null; CAM.g = null;
  for (const r of RENC.liste) filmRonflex(r, p.ta);
  const ti = F.el.querySelector(".titre"); ti.classList.remove("vu"); ti.querySelector("span").textContent = p.titre; ti.querySelector("small").textContent = p.sous || "";
  ti.querySelector("small").hidden = !p.sous;
  p.fixe = null;
  if (p.plan === "fixe") {   // la caméra posée au bord, un peu après le moment : on te voit arriver
    const a = at(p.sFixe), cote = p.cote || 1, lat = cote * Math.max(2.2, a.w * .8), c = pose(p.sFixe, lat), tun = dansTunnel(p.sFixe);
    c.y = Math.max(a.y + 1.6 + (p.haut || 0), tun ? -1e9 : hauteur(c.x, c.z) + 1.1); p.fixe = c;
  }
}
function filmRonflex(r, tau) {   // Ronflex comme il était à ce moment de la séance : endormi, ou réveillé (debout sur la rive)
  const ev = FILM.ev.find(e => e.type === "ronflex" && RENC.liste[e.i] === r && e.t <= tau && (filmPassage(r.s, e.t) || e.t + 60) + 6 > tau);
  rendormir(r);
  if (!ev) return;
  r.etat = "debout"; r.t0 = T - Math.max(5, tau - ev.t); r.cote = ev.cote || 1; r.q.m.visible = false; r.px = r.pz = undefined;
  if (r.ev) { const k = MONDE.evenements.indexOf(r.ev); if (k >= 0) MONDE.evenements.splice(k, 1); }
  if (tau - ev.t < 4.6) r.etat = "reveil";
}
function filmAvance(dt) {   // à chaque image du film, à la place de la séance : le temps du film avance, ton Pokémon suit ton trajet
  const F = FILM, p = F.plans[F.k];
  if (F.phase === "fin") {
    F.finT += dt; F.rate = 1; F.tau = Math.min(F.tau + dt, FILM.t[FILM.t.length - 1]);
    if (F.finT > 4.2) { filmFinir(); return; }
  } else {
    // le ralenti : au sommet d'un saut
    F.rate = p.type === "saut" ? lerp(1, .35, 1 - lisse(.25, .9, Math.abs(F.tau - p.tc))) : 1;
    const avant = F.tau; F.tau += dt * F.rate;
    for (const e of F.ev) if (e.type === "ronflex" && avant < e.t && e.t <= F.tau) { const r = RENC.liste[e.i]; if (r && r.etat === "dort") filmReveil(r, e.cote); }
    for (const c of F.coups) if (avant < c && c <= F.tau) { S.coupT = T; S.elan = 1; S.nb++; if (M.liquide && !M.air) gerbe(S.s, .6, M.d, M.y, GABARIT.hw); }
    if (F.tau - p.ta > .4) F.el.querySelector(".titre").classList.add("vu");
    if (F.tau >= p.tb) {
      if (F.k + 1 < F.plans.length) { filmPlan(F.k + 1); return; }
      F.phase = "fin"; F.finT = 0; F.el.querySelector(".titre").classList.remove("vu");
      const b = bilanDe(), meilleur = b.tours.length ? Math.min(...b.tours) : 0;
      const fin = F.el.querySelector(".fin");
      fin.innerHTML = `<small>TA SÉANCE</small>${fmt(b.t)} · ${metres(b.dist)} m<p>${b.tours.length ? b.tours.length + (b.tours.length > 1 ? " tours" : " tour") + " · meilleur " + chrono(meilleur) : b.nb + " " + String(MACHINE.gestes || "gestes").toLowerCase()}</p>`;
      fin.classList.add("vu"); F.finVue = {s: S.s};
    }
  }
  const q = filmPoint(F.tau); poserVoies(q.v);
  S.s = q.s; S.v2 = S.v1 = S.v = Math.max(0, q.vr); S.vd = Math.max(0, q.vd);
  // le noir entre deux plans (et un voile pendant les chiffres de la fin)
  const noir = F.phase === "fin" ? .45 * lisse(0, .6, F.finT) + lisse(3.6, 4.2, F.finT) * .55 : clamp(Math.max(1 - (F.tau - p.ta) / .35, F.k + 1 < F.plans.length ? 1 - (p.tb - F.tau) / .35 : 0), 0, 1);
  F.el.querySelector(".noir").style.opacity = noir.toFixed(3);
}
function filmReveil(r, cote) {   // il se réveille dans le film : comme dans la séance, sans annonce ni son
  r.etat = "reveil"; r.t0 = T; r.demande = null; r.px = r.pz = undefined; r.cote = cote || 1; r.q.m.visible = false;
  if (r.ev) { const k = MONDE.evenements.indexOf(r.ev); if (k >= 0) MONDE.evenements.splice(k, 1); }
}
function filmCadrer() {   // après cadrer() : le plan du moment remplace la caméra de jeu
  const F = FILM, p = F.phase === "fin" ? {plan: "haut", fin: true} : F.plans[F.k]; if (!p || p.plan === "jeu") return;
  const g = typeof GABARIT !== "undefined" ? Math.max(1, GABARIT.f) : 1, cible = pose(S.s, M.d); cible.y = (M.y === null ? cible.y : M.y) + .55 * g;
  const tun = dansTunnel(S.s), u = F.phase === "fin" ? F.finT / 4.2 : clamp((F.tau - p.ta) / Math.max(.1, p.tb - p.ta), 0, 1);
  let plan = p.plan; if (plan === "haut" && tun) plan = "face";
  const sur = (c, h) => { c.y = Math.max(c.y + h, tun ? -1e9 : hauteur(c.x, c.z) + 1.1); return c; };
  let c;
  if (plan === "face") { c = sur(pose(S.s + (7 + 2 * (1 - u)) * g, M.d * .4), 1.25 * g); }
  else if (plan === "cote") { const a = at(S.s), cote = (M.d || 0) > 0 ? -1 : 1; c = sur(pose(S.s + lerp(5, -3, u) * g, cote * Math.max(2.4, a.w * .78)), 1.5 * g); }
  else if (plan === "haut") { c = pose(S.s - lerp(7, 4, u) * g, 0); c.y += lerp(8, p.fin ? 18 : 12, u) * g; }
  else if (plan === "fixe" && p.fixe) {
    c = p.fixe; const r = p.renc !== undefined ? RENC.liste[p.renc] : null;
    if (r) { const a = at(r.s), o = pose(r.s, (r.cote || 1) * (a.w + 3.2)); cible.x = lerp(cible.x, o.x, .45); cible.z = lerp(cible.z, o.z, .45); cible.y = lerp(cible.y, o.y + 1, .45); }   // Ronflex dans le cadre aussi
  }
  else return;
  camera.position.set(c.x, c.y, c.z); camera.lookAt(cible.x, cible.y, cible.z);
  let fov = plan === "haut" ? 55 : 50; if (camera.aspect < 1) fov = Math.min(92, 2 * Math.atan(Math.tan(fov * Math.PI / 360) / camera.aspect) * 180 / Math.PI);
  if (Math.abs(fov - camera.fov) > .05) { camera.fov = fov; camera.updateProjectionMatrix(); }
}
function filmFinir() {   // le film est fini (ou passé) : tout comme avant, puis la suite (le résumé, la saisie)
  const F = FILM; if (!F.actif) return;
  F.actif = false; F.phase = null;
  const A = F.avant;
  try {
    for (let f = 0; f < PISTE.NF; f++) VOIES.prise[f] = A.prise[f];
    Object.assign(S, {s: A.s, nb: A.nb, coupT: A.coupT, elan: A.elan, v1: A.v1, v2: A.v2, vL: A.vL, vd: A.vd}); S.v = A.v2; Object.assign(M, A.M);
    RENC.liste.forEach((r, i) => { const R = A.renc[i]; rendormir(r); Object.assign(r, {etat: R.etat, t0: R.t0, cote: R.cote, demande: null}); r.q.m.visible = R.q;
      if (r.ev && !R.ev) { const k = MONDE.evenements.indexOf(r.ev); if (k >= 0) MONDE.evenements.splice(k, 1); }
      if (r.debout) r.debout.m.visible = R.d; if (r.joie) r.joie.m.visible = R.j; });
    FOURCHES.liste.forEach((f, i) => { f.etat = A.fourches[i]; f.demande = null; });
    CAM.y = null; CAM.z1 = null; CAM.g = null; camera.fov = A.fov; camera.updateProjectionMatrix();
  } catch (e) { console.error(e); }
  const el = F.el; el.classList.remove("on"); el.querySelector(".fin").classList.remove("vu"); el.querySelector(".titre").classList.remove("vu"); el.querySelector(".noir").style.opacity = 0;
  document.body.classList.remove("film"); el.hidden = true;
  const suite = F.ensuite; F.ensuite = null; if (suite) suite();
}
const filmRevoirBouton = () => FILM.t.length >= 50 && !BANC && !S.fige ? `<button class="sec" id="fFilm">🎬 Revoir le film</button>` : "";

/* ---- pour regarder sans ramer (essais sur le PC) : une fausse séance à allure régulière, toujours sur la voie calme ---- */
window.__filmEssai = (minutes = 4) => {
  if (!S.mode) commencer("essai");
  S.pause = true; S.pauseDebut = performance.now();
  filmDepart(); const v = (MACHINE.physique ? 7 : (MACHINE.cadence || 24) * M_COUP / 60);
  let s = BOUCLE ? LONG - ELAN : 6, d = 0, tour = 0, tt = 0; const tours = [];
  for (let t = 0; t <= minutes * 60; t += FILM_PAS) {
    const vv = v * (1 + .15 * Math.sin(t / 23)), all = (MACHINE.physique ? PISTE.ALL0 : PISTE.ALL)[idx(s)] * MACHINE.allure;
    s += vv * FILM_PAS * all; d += vv * FILM_PAS;
    if (BOUCLE && s >= LONG) { s -= LONG; if (tour > 0) { tours.push(t - tt); FILM.ev.push({type: "tour", n: tour, tl: t - tt, record: tours.length === 2, t, s}); } tour++; tt = t; }
    if (!BOUCLE && s > LONG - 14) s = 6;
    FILM.t.push(t); FILM.s.push(s); FILM.d.push(d); FILM.v.push(0);
    if (Math.floor((t - FILM_PAS) * v / M_COUP) < Math.floor(t * v / M_COUP)) FILM.coups.push(t);
  }
  S.t = minutes * 60; S.dist = d; S.tours = tours; S.nb = FILM.coups.length; FILM.nbAvant = S.nb; S.s = s;
  filmJouer(() => { console.log("film fini", FILM.dernier.map(p => p.type + " " + p.plan + " " + p.titre)); });
  return FILM.dernier && FILM.dernier.map(p => [p.type, p.plan, p.titre, Math.round(p.ta), Math.round(p.tb)]);
};
