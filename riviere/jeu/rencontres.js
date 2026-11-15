/* ============ les rencontres du parcours (15/11, étape 6 du plan) : Ronflex qui dort sur la route ============ */
// contenu/evenements/ronflex.js le pose (RENCONTRES). Quand tu arrives (~25 s avant lui, à ton allure), le jeu te demande de forcer : 8 % plus vite
// que ta croisière pendant 5 s en tout (jeu/effort.js), une jauge le montre. Réussi : il bâille, saute, et s'en va sur la rive ; il te regarde
// passer en sautant de joie. Raté : tu rebondis sur son ventre (le saut de monture.js). Au tour suivant, il s'est rendormi au même endroit.
// Rien ne ralentit jamais le joueur : les vrais chiffres ne bougent pas. Un essai (?s=…, ?fige=1) : Ronflex dort, rien n'est demandé.
const RENC = {liste: [], boite: null};
function construireRencontres() {
  for (const r of typeof RENCONTRES === "undefined" ? [] : RENCONTRES) {
    const q = PUBLIC.find(p => Math.abs(p.x0 - r.x) < .01 && Math.abs(p.z0 - r.z) < .01), e = MONDE.evenements.find(v => v.type === "saut" && (v.vo || 0) === (r.vo || 0) && Math.abs(ecart(v.s, r.s)) < 1);
    if (!q) continue;
    RENC.liste.push(Object.assign({}, r, {q, ev: e || null, etat: "dort", t0: 0, debout: null, joie: null, lat: 0}));
  }
  if (!RENC.liste.length) return;
  RENC.boite = document.createElement("div"); RENC.boite.className = "hud"; RENC.boite.id = "hRencontre"; RENC.boite.hidden = true;
  RENC.boite.innerHTML = '<small id="rTitre">RONFLEX DORT SUR ' + (DISCIPLINE === "eau" ? "LA RIVIÈRE" : "LA ROUTE") + ' !</small><span id="rTexte">Accélère pour le réveiller</span><i><u id="rJauge"></u></i>';
  document.body.appendChild(RENC.boite);
  const st = document.createElement("style");
  st.textContent = "#hRencontre{left:50%;top:22vh;transform:translateX(-50%);font-size:min(5.4vh,4.2vw);text-align:center;white-space:nowrap}"
    + "#hRencontre i{display:block;margin:.25em auto 0;width:9em;height:.42em;border:.08em solid #1B2440;background:#F8F8E8;border-radius:.2em;overflow:hidden}"
    + "#hRencontre u{display:block;height:100%;width:0;background:#48C868}#hRencontre.plein u{background:#F8C838}";
  document.head.appendChild(st);
  // la planche de Ronflex debout (il marche jusqu'à la rive) et celle où il saute de joie
  Promise.all([planche("0143/Walk"), planche("0143/Hop")]).then(([w, h]) => {
    for (const r of RENC.liste) {
      if (w) { r.debout = new Pantin(w, 0, 1, clamp(1.5 * Math.pow(w.m || 2.1, .7), .55, 8)); r.debout.m.visible = false; }
      if (h) { r.joie = new Pantin(h, 0, 1, clamp(1.5 * Math.pow(h.m || 2.1, .7), .55, 8)); r.joie.m.visible = false; }
    }
  });
}
function majBoiteRencontre(r) {
  const b = RENC.boite, d = EFFORT.demande; if (!b) return;
  b.hidden = !r; if (!r) return;
  const j = d ? d.jauge : 0, force = EFFORT.ratio >= (d ? d.seuil : 1.08);
  $("rJauge").style.width = Math.round(j * 100) + "%"; b.classList.toggle("plein", j >= 1);
  $("rTexte").textContent = j >= 1 ? "Il se réveille !" : force ? "Continue, il remue…" : "Accélère pour le réveiller";
}
function placer(p, x, y, z, px, pz) {   // poser un sprite et le tourner dans le sens où il va (les 8 directions des sprites de Donjon Mystère)
  p.m.position.set(x, y, z); p.regarder();
  const dx = x - px, dz = z - pz;
  if (dx * dx + dz * dz > 1e-7) { const fx = x - camera.position.x, fz = z - camera.position.z, l = Math.hypot(fx, fz) || 1, ax = fx / l, az = fz / l;
    p.rangee(((Math.round(Math.atan2(dx * -az + dz * ax, -(dx * ax + dz * az)) / (Math.PI / 4)) % 8) + 8) % 8); }
}
function rencontresMaj(t, dt) {
  if (!RENC.liste.length) return;
  let montree = null;
  const jeu = S.mode && !S.pause && !PARAMS.has("s") && !S.fige;
  for (const r of RENC.liste) {
    if (r.vo && PISTE.VO[idx(r.s)] !== r.vo) { if (r.demande) { finirEffort(); r.demande = null; } continue; }   // il dort sur l'autre voie d'une fourche
    const devant = ecart(r.s, S.s), zone = Math.max(60, 25 * (S.croisiere || 3.6));
    if (r.etat === "dort") {
      if (jeu && devant > 4 && devant < zone) {
        if (!r.demande && !EFFORT.demande) { r.demande = demanderEffort({seuil: 1.08, duree: 5, reussi: () => reveiller(r, T)}); annoncer("RONFLEX !"); }
        if (r.demande) montree = r;
      } else if (r.demande && devant <= 4) {   // trop tard : il dort toujours, tu rebondis sur son ventre
        finirEffort(); r.demande = null; r.etat = "passe"; annoncer("BOING !"); filmEvenement({type: "boing", i: RENC.liste.indexOf(r)});
      } else if (r.demande && devant >= zone) { finirEffort(); r.demande = null; }
    } else if (r.etat === "reveil" || r.etat === "debout") {
      const u = t - r.t0, D2 = r.debout, J = r.joie, a = at(r.s), cote = r.cote || 1, bord = cote * (a.w + 3.2);
      if (u < 1.4) {   // il saute sur place : réveillé !
        if (J) { J.m.visible = true; if (D2) D2.m.visible = false; J.image(J.pl.image(u)); placer(J, r.x, r.y + Math.abs(Math.sin(u * 6)) * .35, r.z, r.x, r.z); J.rangee(0); }
      } else if (u < 4.6) {   // il s'en va sur la rive
        const k = (u - 1.4) / 3.2, lat = r.e + (bord - r.e) * (k * k * (3 - 2 * k)), p = pose(r.s, lat), y = lerp(r.y, hauteur(p.x, p.z), clamp(k * 1.6, 0, 1));
        if (J) J.m.visible = false;
        if (D2) { D2.m.visible = true; D2.image(D2.pl.image(u)); placer(D2, p.x, y, p.z, r.px === undefined ? r.x : r.px, r.pz === undefined ? r.z : r.pz); }
        r.px = p.x; r.pz = p.z;
      } else {   // sur la rive : il saute de joie quand tu passes près de lui
        r.etat = "debout"; const p = pose(r.s, bord), pres = Math.abs(devant) < 25;
        if (D2) D2.m.visible = !pres || !J; if (J) { J.m.visible = pres; if (pres) { J.image(J.pl.image(u)); placer(J, p.x, hauteur(p.x, p.z) + Math.abs(Math.sin(u * 7)) * .3, p.z, p.x, p.z); J.rangee(0); } }
        if (D2 && !pres) { placer(D2, p.x, hauteur(p.x, p.z), p.z, p.x, p.z); D2.rangee(0); D2.image(0); }
      }
      if (devant < -40 || devant > zone * 1.5) rendormir(r);   // derrière toi (ou au tour suivant) : il se rendort à sa place
    } else if (r.etat === "passe" && (devant < -40 || devant > zone * 1.5)) r.etat = "dort";
    if (r.etat === "dort" && r.demande && !jeu) { finirEffort(); r.demande = null; }
  }
  majBoiteRencontre(montree);
}
function reveiller(r, t) {
  r.etat = "reveil"; r.t0 = t; r.demande = null; finirEffort(); r.px = r.pz = undefined;
  r.cote = (M.d || 0) > r.e ? -1 : 1;   // il s'en va du côté où tu n'es pas
  r.q.m.visible = false; if (r.ev) { const k = MONDE.evenements.indexOf(r.ev); if (k >= 0) MONDE.evenements.splice(k, 1); }
  annoncer("RONFLEX SE RÉVEILLE !"); sonTinte([523, 659, 784]); filmEvenement({type: "ronflex", i: RENC.liste.indexOf(r), cote: r.cote});
}
function rendormir(r) {
  r.etat = "dort"; r.q.m.visible = true; if (r.debout) r.debout.m.visible = false; if (r.joie) r.joie.m.visible = false;
  if (r.ev && !MONDE.evenements.includes(r.ev)) MONDE.evenements.push(r.ev);
}
