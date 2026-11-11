/* ============ le fantôme et le plan du circuit (11/11, Kiki : « comme dans l'ancien jeu », à la Mario Kart) ============ */
// Chaque tour est noté toutes les 0,1 s : [temps depuis la ligne, mètres de décor depuis la ligne]. Le fantôme rejoue un tour : le meilleur de la
// séance (dès le 2e tour) ou ton record de tous les temps (dès le 1er, gardé sur cette machine, seulement en vraie séance). Choisi au menu.
const CLE_FANTOME = CLE_RECORD.replace(/_record$/, "_fantome"), CLE_CHOIX = "riviere_fantome_choix";
const FANTOME = {choix: "record", record: null, seance: null, actuel: null, trace: [], derniere: 0, pantin: null};
try { FANTOME.choix = localStorage.getItem(CLE_CHOIX) || "record"; const r = JSON.parse(localStorage.getItem(CLE_FANTOME) || "null"); if (r && r.t && r.pts) FANTOME.record = r; } catch (e) {}

function choisirFantome(k) { FANTOME.choix = k; try { localStorage.setItem(CLE_CHOIX, k); } catch (e) {} }
function prendreFantome() { const F = FANTOME; F.actuel = F.choix === "aucun" ? null : F.choix === "record" ? (F.record || F.seance) : F.seance; }
function fantomeChoisi() { FANTOME.seance = null; FANTOME.trace = []; prendreFantome(); }   // une nouvelle séance : plus de meilleur tour de séance
function fantomeDepart() { FANTOME.trace = [0, 0]; FANTOME.derniere = 0; prendreFantome(); }
function fantomeTour(t, nouveauRecord) {
  const F = FANTOME; F.trace.push(Math.round(t * 10) / 10, LONG); const tour = {t, pts: F.trace};
  if (!F.seance || t < F.seance.t) F.seance = tour;
  if (nouveauRecord) { F.record = tour; try { localStorage.setItem(CLE_FANTOME, JSON.stringify(tour)); } catch (e) {} }
  fantomeDepart();
}
function sFantome(f, tau) {   // où était le fantôme tau secondes après la ligne (null : il a fini son tour)
  const p = f.pts, n = p.length / 2; if (tau >= p[(n - 1) * 2]) return null;
  let a = 0, b = n - 1; while (b - a > 1) { const m = (a + b) >> 1; if (p[m * 2] <= tau) a = m; else b = m; }
  const ta = p[a * 2], tb = p[b * 2]; return p[a * 2 + 1] + (p[b * 2 + 1] - p[a * 2 + 1]) * (tb > ta ? (tau - ta) / (tb - ta) : 0);
}
function animerFantome(t) {
  const F = FANTOME;
  if (S.tour > 0 && !S.pause) { const tau = S.t - S.tourT0; if (tau - F.derniere >= .1) { F.derniere = tau; F.trace.push(Math.round(tau * 10) / 10, Math.round(S.s * 10) / 10); } }
  F.sG = F.actuel && S.tour > 0 ? sFantome(F.actuel, S.t - S.tourT0) : null;
  if (F.sG !== null && !F.pantin && nageur) {   // le même Pokémon, presque blanc avec une pointe de bleu, en transparence
    F.pantin = new Pantin(nageur.pl, 4, 1.5); const m = F.pantin.m.material; m.transparent = true; m.opacity = .7; m.depthWrite = false;
    m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.88, .94, 1.), .65);"); }; }
  if (!F.pantin) return;
  F.pantin.m.visible = F.sG !== null;
  if (F.sG === null) return;
  const a = pose(F.sG, 1.8), N = F.pantin; N.image(N.pl.image(t * .55)); N.m.position.set(a.x, -N.h * .42 + Math.sin(t * 3 + 1) * .03, a.z); N.regarder();
}

/* ---- le plan du circuit, en bas à gauche : le tracé, le tunnel en gris, la ligne, toi et ton fantôme ---- */
const CARTE = {fond: null, k: 1, ox: 0, oz: 0, taille: 0, icone: null};
function construireCarte() {
  const cv = $("carte"), px = Math.round(cv.clientWidth * devicePixelRatio); if (!px) return;
  cv.width = cv.height = px; CARTE.taille = px;
  const P = PISTE, N = P.N; let xa = 1e9, xb = -1e9, za = 1e9, zb = -1e9;
  for (let i = 0; i < N; i++) { xa = Math.min(xa, P.X[i]); xb = Math.max(xb, P.X[i]); za = Math.min(za, P.Z[i]); zb = Math.max(zb, P.Z[i]); }
  const marge = px * .1; CARTE.k = (px - 2 * marge) / Math.max(xb - xa, zb - za, 1); CARTE.ox = marge + ((px - 2 * marge) - (xb - xa) * CARTE.k) / 2 - xa * CARTE.k; CARTE.oz = marge + ((px - 2 * marge) - (zb - za) * CARTE.k) / 2 - za * CARTE.k;
  const f = document.createElement("canvas"); f.width = f.height = px; const c = f.getContext("2d"), X = i => P.X[i] * CARTE.k + CARTE.ox, Z = i => P.Z[i] * CARTE.k + CARTE.oz;
  const trait = (couleur, l, garde) => { c.strokeStyle = couleur; c.lineWidth = l; c.lineJoin = c.lineCap = "round"; c.beginPath(); let dedans = false;
    for (let i = 0; i <= N; i++) { const j = i % N, ok = garde(j); if (ok && !dedans) { c.moveTo(X(j), Z(j)); dedans = true; } else if (ok) c.lineTo(X(j), Z(j)); else dedans = false; if (!BOUCLE && i === N - 1) break; } c.stroke(); };
  const u = px / 100;
  trait("#1B2440", 7 * u, () => true); trait("#F8F8E8", 3.2 * u, () => true); trait("#9098A8", 3.2 * u, j => P.TUN[j]);
  const h = P.H[0], cx = X(0), cz = Z(0);   // la ligne : un petit damier en travers
  for (let k = -2; k < 2; k++) for (let l = 0; l < 2; l++) { c.fillStyle = (k + l) & 1 ? "#1B2440" : "#fff"; const d = (k + .5) * 1.6 * u, e = (l - .5) * 1.6 * u;
    c.fillRect(cx + Math.cos(h) * d - Math.sin(h) * e - .8 * u, cz + Math.sin(h) * d + Math.cos(h) * e - .8 * u, 1.6 * u, 1.6 * u); }
  CARTE.fond = f;
}
function majCarte() {
  const cv = $("carte"); if (!cv || cv.hidden) return;
  if (!CARTE.fond || Math.abs(Math.round(cv.clientWidth * devicePixelRatio) - CARTE.taille) > 2) construireCarte(); if (!CARTE.fond) return;
  const c = cv.getContext("2d"), px = CARTE.taille; c.clearRect(0, 0, px, px); c.drawImage(CARTE.fond, 0, 0); c.imageSmoothingEnabled = false;
  const icone = (s, alpha) => { const a = at(s), x = a.x * CARTE.k + CARTE.ox, z = a.z * CARTE.k + CARTE.oz, t = px * .16;
    if (nageur) { const pl = nageur.pl, b = pl.boite(0), w = b.x1 - b.x0, hh = b.y1 - b.y0, k = t / Math.max(w, hh); c.globalAlpha = alpha;
      c.drawImage(pl.tex.image, b.x0, b.y0, w, hh, x - w * k / 2, z - hh * k / 2, w * k, hh * k); c.globalAlpha = 1; }
    else { c.globalAlpha = alpha; c.fillStyle = "#F8C838"; c.beginPath(); c.arc(x, z, px * .04, 0, 7); c.fill(); c.globalAlpha = 1; } };
  if (FANTOME.sG !== null && FANTOME.sG !== undefined) icone(FANTOME.sG, .45);
  icone(S.s, 1);
}
