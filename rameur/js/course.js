/* ============ la séance : la vitesse vient des coups ============ */
const TAU = 3.5;
const S = {etat: "menu", t: 0, s: LONG - ELAN, v: 0, vL: 0, vn: 0, dist: 0, nb: 0, coupsT: [], auto: false, tour: 0, tourT0: 0, temps: [], prochainCoup: 0, etatV: 0};
function coup(force = .6, metres) {
  if (S.etat !== "course") return;
  S.v += (metres || 6 + 4 * force) / TAU; S.nb++; S.coupsT.push(S.t); if (S.coupsT.length > 8) S.coupsT.shift();
  gerbe(force); bruitage(650 + force * 900, .8, .22 + force * .25, .6);
}
const cadence = () => { const c = S.coupsT, n = c.length; if (n < 2 || S.t - c[n - 1] > 6) return 0; const k = Math.min(4, n - 1); return 60 / ((c[n - 1] - c[n - 1 - k]) / k); };
function avancer(ds) { S.s += ds; if (S.s >= LONG) { S.s -= LONG; if (S.etat === "course") nouveauTour(); } }  // la ligne : un vrai circuit, on repasse par le mètre 0
function son(dt) {
  if (!AC) return;
  merG.gain.value = sonOn ? .075 : 0; merF.frequency.value = 520 + S.vn * 300;
  ventG.gain.value = sonOn ? clamp(S.vn * .12, 0, .14) : 0; ventF.frequency.value = 600 + S.vn * 1300; chuteG.gain.value = 0;
  prochainChant -= dt; if (prochainChant > 0 || !sonOn || S.etat === "menu" || dansTunnel(S.s)) return;
  prochainChant = 2.5 + Math.random() * 5; const f = 1800 + Math.random() * 1600;
  for (let i = 0; i < 2 + Math.random() * 3; i++) { const o = note(f, .09, "sine", .016, i * .13); if (o) o.frequency.exponentialRampToValueAtTime(f * 1.35, AC.currentTime + i * .13 + .08); }
}
/* les images par seconde (?perf=1 dans l'adresse) */
const FPS = {n: 0, t: 0};
function mesurer(dt) { FPS.n++; FPS.t += dt; if (FPS.t < 1) return; $("fps").textContent = Math.round(FPS.n / FPS.t) + " i/s"; FPS.n = 0; FPS.t = 0; }

/* ============ la boucle : tout se met à jour, puis tout se dessine ============ */
let T = 0, dernier = performance.now();
function boucle(now) {
  requestAnimationFrame(boucle);
  const dt = clamp((now - dernier) / 1000, 0, .05); dernier = Math.max(dernier, now); T += dt;
  if (S.etat === "course") {
    S.t += dt;
    if (S.auto && S.t >= S.prochainCoup) { coup(.5 + Math.random() * .35); S.prochainCoup = S.t + 60 / (24 + 3 * Math.sin(S.t * .05)); }
    S.v *= Math.exp(-dt / TAU); avancer(S.v * dt); S.dist += S.v * dt;
  } else if (S.etat === "menu") avancer(dt * 1.6);  // derrière le menu : on glisse doucement
  S.vL = lerp(S.vL || 0, S.v, clamp(dt / 1.6, 0, 1)); S.vn = clamp((S.vL - 1.5) / 3, 0, 1.2);
  const caE = cadence(); S.etatV = caE >= 30 ? 2 : caE >= 26 ? 1 : 0;  // Croisière jusqu'à 25 coups/min (Kiki rame à 24), Rapide dès 26, TURBO dès 30
  majFantome(dt, T); sillage(dt, S.vL); avancerGouttes(dt);
  const pos = S.s - ZH;
  dessiner(pos, T); dessinerGouttes(pos); dessinerHero(pos, T); lignesVitesse(T);
  son(dt); majHud(dt); mesurer(dt);
}
