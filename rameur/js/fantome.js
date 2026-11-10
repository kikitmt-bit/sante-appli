/* ============ les tours et le fantôme ============ */
// Le fantôme rejoue un tour entier : ton meilleur tour de tous les temps (gardé sur la tablette) ou le meilleur de la séance (dès le 2e tour).
// Un tour = une liste de points [temps depuis la ligne (s), mètres depuis la ligne], un tous les dixièmes de seconde.
const CLE_RECORD = "rameur2_" + NIVEAU.id + "_record";  // une clé par niveau et par machine : jamais un temps comparé à un autre circuit
const FANTOME = {mode: "record", pts: [], dernierPt: -1, seance: null, courant: null, u: null, o: null};
try { FANTOME.mode = localStorage.getItem("circuit_fantome") || "record"; } catch (e) {}
function recordTous() { try { const r = JSON.parse(localStorage.getItem(CLE_RECORD)); return r && r.temps > 0 && r.pts && r.pts.length > 10 ? r : null; } catch (e) { return null; } }
function choisirFantome() { FANTOME.courant = FANTOME.mode === "aucun" ? null : FANTOME.mode === "seance" ? FANTOME.seance : (recordTous() || FANTOME.seance); }
function remiseFantome() { FANTOME.pts = []; FANTOME.dernierPt = -1; FANTOME.seance = null; FANTOME.courant = null; FANTOME.u = null; DYN.clear(); }
let constructionFantome = 0;
async function construireFantome(i) { const n = ++constructionFantome, o = await chargerPMD(NAGEURS[i].n, "Walk", +NAGEURS[i].n); if (n === constructionFantome) FANTOME.o = teindre(o, "#DCF4FF"); }
const uLigne = s => mod(s - DEPART);  // mètres depuis la ligne
function uFantome(pts, tau) {  // où était le fantôme, tau secondes après la ligne (null : il a fini son tour)
  if (!pts || !pts.length || tau > pts[pts.length - 1][0]) return null;
  let lo = 0, hi = pts.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m][0] <= tau) lo = m; else hi = m; }
  const [t0, u0] = pts[lo], [t1, u1] = pts[hi]; return lerp(u0, u1, clamp((tau - t0) / Math.max(t1 - t0, 1e-3), 0, 1));
}
function tFantome(pts, u) {  // quand le fantôme est passé là (pour l'écart)
  if (!pts || !pts.length || u > pts[pts.length - 1][1]) return null;
  let lo = 0, hi = pts.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m][1] <= u) lo = m; else hi = m; }
  const [t0, u0] = pts[lo], [t1, u1] = pts[hi]; return lerp(t0, t1, clamp((u - u0) / Math.max(u1 - u0, 1e-3), 0, 1));
}
function nouveauTour() {  // la ligne de départ : le temps du tour qui finit, et le suivant qui commence
  if (S.tour > 0) { const tps = S.t - S.tourT0, record = !S.temps.length || tps < Math.min(...S.temps); S.temps.push(tps);
    const pts = FANTOME.pts.concat([[+tps.toFixed(2), LONG]]), ancien = recordTous(), recordAbsolu = !essai && (!ancien || tps < ancien.temps);
    if (record) FANTOME.seance = {temps: tps, pts};
    if (recordAbsolu) try { localStorage.setItem(CLE_RECORD, JSON.stringify({temps: tps, pts, jour: new Date().toISOString().slice(0, 10)})); } catch (e) {}
    $("gros").innerHTML = `TOUR ${S.tour}<small>${fmtT(tps)}${recordAbsolu && ancien ? " · RECORD !" : record && S.temps.length > 1 ? " · meilleur tour !" : ""}</small>`; note(784, .12, "square", .05); note(1046, .25, "square", .05, .13);
    clearTimeout(nouveauTour.t); nouveauTour.t = setTimeout(() => { $("gros").innerHTML = ""; }, 2600); }
  else { $("gros").innerHTML = "TOP CHRONO !"; note(1046, .3, "square", .05); clearTimeout(nouveauTour.t); nouveauTour.t = setTimeout(() => { $("gros").innerHTML = ""; }, 1400); }
  S.tour++; S.tourT0 = S.t; FANTOME.pts = []; FANTOME.dernierPt = -1; choisirFantome();
}
function majFantome(dt, t) {
  if (S.etat === "course" && S.tour > 0) { const tau = S.t - S.tourT0;  // on enregistre ton tour
    if (tau - FANTOME.dernierPt >= .1) { FANTOME.pts.push([+tau.toFixed(2), +uLigne(S.s).toFixed(2)]); FANTOME.dernierPt = tau; } }
  DYN.clear(); const o = FANTOME.o; if (!o) return;
  const u = S.tour > 0 && (S.etat === "course" || S.etat === "fin") && FANTOME.courant ? uFantome(FANTOME.courant.pts, S.t - S.tourT0) : null;
  FANTOME.u = u; if (u === null) return;
  const s = DEPART + u, kc = val(PISTE.vir, s + 2), rang = kc < -.006 ? 5 : kc > .006 ? 3 : 4, i = o.image(t * 1.2);
  DYN.set(idx(s), [{s, x: 1.8, y: 0, larg: 2, haut: 2, dessiner(c, sx, yb, ppm) {  // un peu sur la droite, pour ne pas se confondre avec toi
    const k = HERO_ECH * ppm / (CAMD / ZH * E.W / 2), b = o.bbox(rang), w = (b.x1 - b.x0) * k, h = (b.y1 - b.y0) * k; cx.save(); cx.beginPath(); cx.rect(0, 0, E.W, Math.round(yb + 2)); cx.clip(); cx.globalAlpha *= .75;
    cx.drawImage(o.img, i * o.fw + b.x0, rang * o.fh + b.y0, b.x1 - b.x0, b.y1 - b.y0, Math.round(sx - w / 2), Math.round(yb + .3 * h - h), Math.round(w), Math.round(h)); cx.restore(); }}]);
}
function majTour() {  // à gauche : le temps du tour en cours, l'écart avec le fantôme, puis les tours finis (le meilleur en vert)
  let h = "";
  if (!S.tour) h = `<div class="encours"><span>Élan</span><span>${Math.max(0, Math.round(LONG - S.s))} m</span></div><div class="ancien"><span>jusqu'à la ligne</span></div>`;
  else { const tau = S.t - S.tourT0; h = `<div class="encours"><span>Tour ${S.tour}</span><span>${fmtT(tau)}</span></div>`;
    if (FANTOME.courant) { const g = tFantome(FANTOME.courant.pts, uLigne(S.s)); if (g !== null && tau > 3) { const e = tau - g;
      h += `<div class="ecart ${e <= 0 ? "devant" : "derriere"}"><span>Fantôme</span><span>${e <= 0 ? "−" : "+"}${Math.abs(e).toFixed(1).replace(".", ",")} s</span></div>`; } } }
  const best = S.temps.length ? Math.min(...S.temps) : 0;
  S.temps.map((t, i) => [t, i]).reverse().slice(0, 5).forEach(([t, i]) => { h += `<div class="${t === best ? "meilleur" : "ancien"}"><span>Tour ${i + 1}</span><span>${fmtT(t)}${t === best && S.temps.length > 1 ? " ★" : ""}</span></div>`; });
  if (majTour.h !== h) { $("tours").innerHTML = h; majTour.h = h; }
}
