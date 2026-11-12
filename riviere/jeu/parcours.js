/* ============ le parcours : les segments chronométrés, le profil d'altitude, l'arrivée d'un parcours ouvert ============ */
// SEGMENTS : une pièce du niveau peut porter "segment": "Sprint du pont" (plusieurs pièces qui se suivent, le même nom : un seul segment).
// À l'entrée, le chrono du segment part ; à la sortie, le temps s'annonce avec l'écart à ton record. Le record de chaque segment est gardé
// sur la machine, par circuit et par machine de sport, seulement en vraie séance (comme le record du tour).
// PROFIL : dès que le circuit a du relief (1,5 m), son profil s'affiche en bas : les côtes, les segments en doré, les grottes en gris, toi dessus.
// ARRIVÉE : un parcours ouvert (de A à B) annonce son temps à l'arrivée, garde son record, puis repart du début.
const CLE_SEGMENTS = CLE_RECORD.replace(/_record$/, "_segments");
const SEG = {actif: null, t0: 0, records: lireReglage(CLE_SEGMENTS, {}) || {}, faits: [], dernier: null};
const dansSegment = (g, s) => BOUCLE ? ecart(s, g.s0) >= 0 && ecart(s, g.s1) < 0 : s >= g.s0 && s < g.s1;
function parcoursMaj() {
  if (!S.mode || S.pause || !S.lance) return;
  const ici = PISTE.segments.find(g => dansSegment(g, S.s)) || null;
  if (ici === SEG.actif) return;
  if (SEG.actif && S.t - SEG.t0 > 2) {   // on en sort : son temps, et l'écart au record
    const g = SEG.actif, t = S.t - SEG.t0, rec = SEG.records[g.nom], vraie = S.mode === "vraie" && !PARAMS.has("s"), mieux = !rec || t < rec;
    SEG.faits.push({nom: g.nom, t: Math.round(t * 10) / 10}); SEG.dernier = {nom: g.nom, t, ecart: rec ? t - rec : null};
    if (mieux && vraie) { SEG.records[g.nom] = Math.round(t * 10) / 10; ecrireReglage(CLE_SEGMENTS, SEG.records); }
    annoncer(g.nom.toUpperCase() + " · " + chrono(t) + (rec ? (mieux ? " · −" : " · +") + Math.abs(t - rec).toFixed(1).replace(".", ",") + " s" : "") + (mieux && vraie && rec ? " · RECORD !" : ""));
  }
  SEG.actif = ici; SEG.t0 = S.t;
  if (ici) annoncer(ici.nom.toUpperCase() + (SEG.records[ici.nom] ? " · record " + chrono(SEG.records[ici.nom]) : " · C'EST PARTI !"));
}
function texteSegment() {
  const g = SEG.actif; if (!g) return "";
  const rec = SEG.records[g.nom];
  return g.nom + "  " + chrono(S.t - SEG.t0) + (rec ? "  (record " + chrono(rec) + ")" : "");
}
function arrivee() {   // au bout d'un parcours ouvert
  if (!S.lance) return;
  const t = S.t - S.tourT0, vraie = S.mode === "vraie" && !PARAMS.has("s"), mieux = !record || t < record;
  S.tours.push(t); S.tourT0 = S.t;
  if (mieux && vraie) { record = t; try { localStorage.setItem(CLE_RECORD, String(t)); } catch (e) {} }
  annoncer("ARRIVÉE · " + chrono(t) + (mieux && vraie ? " · RECORD !" : ""));
  RIVAUX.t0 = null;
}

/* ---- le profil d'altitude ---- */
const PROFIL = {fond: null, l: 0, h: 0, ok: false, min: 0, max: 0};
function construireProfil() {
  const cv = $("profil"), P = PISTE; let haut = 0; for (let i = 0; i < P.N; i++) haut = Math.max(haut, P.Y[i]);
  PROFIL.ok = haut >= 1.5; cv.hidden = !PROFIL.ok; $("hPente").hidden = !PROFIL.ok; document.body.classList.toggle("relief", PROFIL.ok);
  if (!PROFIL.ok) return;
  const l = Math.round(cv.clientWidth * devicePixelRatio), h = Math.round(cv.clientHeight * devicePixelRatio); if (!l || !h) return;
  cv.width = l; cv.height = h; PROFIL.l = l; PROFIL.h = h; PROFIL.max = Math.max(haut, 4);
  const f = document.createElement("canvas"); f.width = l; f.height = h; const c = f.getContext("2d"), m = Math.max(2, Math.round(h * .08));
  const X = i => m + (l - 2 * m) * i / (P.N - 1), Y = y => h - m - (h - 2 * m) * .86 * y / PROFIL.max - (h - 2 * m) * .08;
  const bande = (couleur, garde) => { c.fillStyle = couleur; for (let i = 0; i < P.N - 1; i++) { if (!garde(i)) continue; c.beginPath(); c.moveTo(X(i), h - m); c.lineTo(X(i), Y(P.Y[i])); c.lineTo(X(i + 1) + .6, Y(P.Y[i + 1])); c.lineTo(X(i + 1) + .6, h - m); c.fill(); } };
  bande("rgba(27,36,64,.72)", () => true); bande("#7CC860", () => true);
  bande("#9098A8", i => P.TUN[i]); bande("#C8B890", i => P.PONT[i]); bande("#F8C838", i => P.segments.some(g => i >= g.s0 && i < g.s1));
  c.strokeStyle = "#1B2440"; c.lineWidth = Math.max(2, h * .05); c.lineJoin = "round"; c.beginPath(); for (let i = 0; i < P.N; i++) { if (i) c.lineTo(X(i), Y(P.Y[i])); else c.moveTo(X(i), Y(P.Y[i])); } c.stroke();
  PROFIL.fond = f; PROFIL.X = X; PROFIL.Y = Y;
}
function majProfil() {
  if (!PROFIL.ok) return;
  const cv = $("profil"); if (!PROFIL.fond || Math.abs(Math.round(cv.clientWidth * devicePixelRatio) - PROFIL.l) > 2) construireProfil(); if (!PROFIL.fond) return;
  const c = cv.getContext("2d"), {l, h} = PROFIL; c.clearRect(0, 0, l, h); c.drawImage(PROFIL.fond, 0, 0);
  const point = (s, couleur, r) => { const i = idx(s); c.fillStyle = "#1B2440"; c.beginPath(); c.arc(PROFIL.X(i), PROFIL.Y(PISTE.Y[i]), r + h * .035, 0, 7); c.fill(); c.fillStyle = couleur; c.beginPath(); c.arc(PROFIL.X(i), PROFIL.Y(PISTE.Y[i]), r, 0, 7); c.fill(); };
  for (const r of RIVAUX.liste) if (RIVAUX.t0 !== null) point(r.s, r.couleur, h * .05);
  if (FANTOME.sG !== null && FANTOME.sG !== undefined) point(FANTOME.sG, "#CFE2FF", h * .055);
  point(S.s, "#FFFFFF", h * .085);
  const p = PISTE.PENTE[idx(S.s + 2)] * 100, el = $("hPente");
  el.textContent = Math.abs(p) < 1.5 ? "" : (p > 0 ? "▲ " : "▼ ") + Math.abs(p).toFixed(0) + " %"; el.style.color = p > 0 ? "#FF8A8A" : "#8CE0A0";
}
