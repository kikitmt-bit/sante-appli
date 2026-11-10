/* ============ l'écran : chiffres, flash, plan du circuit ============ */
function flash(v) { $("flash").style.opacity = v; }
function majHud(dt) {
  flash(Math.max(+$("flash").style.opacity - dt * 1.4, 0));
  $("vitesse").style.opacity = S.etatV === 2 ? .7 : S.etatV === 1 ? .25 : 0;
  if (S.etat === "course" || S.etat === "decompte") { const ca = cadence();
    $("hT").textContent = fmt(S.t); $("hD").textContent = (D.modele ? "" : "≈") + Math.round(S.dist); $("hC").textContent = Math.round(ca); $("hN").textContent = S.nb;
    $("hV").textContent = (S.vL * 3.6).toFixed(1).replace(".", ","); $("h5").textContent = (S.vL > .5 ? fmt(500 / S.vL) : "–:––") + " /500 m";
    const e = S.vL < .3 || ca < 1 ? "À l'arrêt" : S.t < 15 ? "Mise en route" : ca < 18 ? "Tranquille" : ["Croisière", "Rapide", "TURBO !"][S.etatV]; $("hE").textContent = e; $("hE").className = ["", "rapide", "turbo"][S.etatV];
    majTour(); }
  majCarte();
}
/* le plan du circuit, en bas à gauche, sur fond transparent : le tracé en blanc, ton Pokémon, ton fantôme */
const PLAN = (() => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < NS; i++) { x0 = Math.min(x0, PISTE.px[i]); x1 = Math.max(x1, PISTE.px[i]); z0 = Math.min(z0, PISTE.pz[i]); z1 = Math.max(z1, PISTE.pz[i]); }
  const W = 420, pad = 54, k = (W - 2 * pad) / Math.max(x1 - x0, z1 - z0), H = Math.ceil((z1 - z0) * k + 2 * pad), ox = (W - (x1 - x0) * k) / 2;
  return {W, H, xy: (x, z) => [ox + (x - x0) * k, pad + (z - z0) * k]}; })();
const posPlan = s => { const f = mod(s) / SEG, i = Math.min(NS - 1, Math.floor(f)), j = (i + 1) % NS, u = f - i; return PLAN.xy(lerp(PISTE.px[i], PISTE.px[j], u), lerp(PISTE.pz[i], PISTE.pz[j], u)); };
const fondPlan = toile(PLAN.W, PLAN.H, x => {
  x.imageSmoothingEnabled = true; x.lineJoin = x.lineCap = "round";
  const trace = (a, b) => { x.beginPath(); for (let i = a; i <= b; i++) { const [px, py] = PLAN.xy(PISTE.px[i % NS], PISTE.pz[i % NS]); i === a ? x.moveTo(px, py) : x.lineTo(px, py); } };
  trace(0, NS); x.closePath(); x.strokeStyle = "rgba(16,24,44,.7)"; x.lineWidth = 22; x.stroke(); x.strokeStyle = "#FFFFFF"; x.lineWidth = 11; x.stroke();
  for (const [t0, t1] of TUNNELS) { trace(Math.floor(t0 / SEG), Math.ceil(t1 / SEG)); x.strokeStyle = "#AEB8C8"; x.lineWidth = 11; x.stroke(); }  // le tunnel, en gris clair
  const [lx, ly] = posPlan(DEPART), h = hdgA(DEPART), nx = -Math.sin(h), nz = Math.cos(h);  // la ligne, en damier
  for (let i = -3; i < 3; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? "#202020" : "#F8F8F8"; const px = lx + nx * (i + .5) * 4.5 + Math.cos(h) * (j - .5) * 4.5, py = ly + nz * (i + .5) * 4.5 + Math.sin(h) * (j - .5) * 4.5; x.fillRect(px - 2.4, py - 2.4, 4.8, 4.8); }
});
const cvPlan = $("carte"); cvPlan.width = PLAN.W; cvPlan.height = PLAN.H; const ctxPlan = cvPlan.getContext("2d");
const iconeFantome = toile(32, 32);
function poserPortrait(x, px, py, k, alpha, fantome) {  // le sprite de ton Pokémon (centré sur le tracé), avec un contour sombre ; le fantôme : sa silhouette blanc bleuté
  let m = $("progMoi"); const T = 32 * k;
  if (fantome) { const f = iconeFantome.getContext("2d"); f.clearRect(0, 0, 32, 32); f.globalCompositeOperation = "source-over"; f.drawImage(m, 0, 0); f.globalCompositeOperation = "source-in"; f.fillStyle = "#9FD8FF"; f.fillRect(0, 0, 32, 32); f.globalCompositeOperation = "source-over"; m = iconeFantome; } x.save(); x.imageSmoothingEnabled = false; x.globalAlpha = alpha;
  x.shadowColor = "rgba(16,24,44,.9)"; x.shadowBlur = 0; for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) { x.shadowOffsetX = dx; x.shadowOffsetY = dy; x.drawImage(m, px - T / 2, py - T / 2, T, T); }
  x.shadowColor = "transparent"; x.drawImage(m, px - T / 2, py - T / 2, T, T); x.restore(); }
function majCarte() {
  if ($("hud").hidden) return; const x = ctxPlan; x.clearRect(0, 0, PLAN.W, PLAN.H); x.drawImage(fondPlan, 0, 0);
  if (FANTOME.u !== null && FANTOME.u !== undefined) { const [gx, gy] = posPlan(DEPART + FANTOME.u); poserPortrait(x, gx, gy, 2.4, .9, true); }
  const [mx, my] = posPlan(S.s); poserPortrait(x, mx, my, 2.6, 1);
}
