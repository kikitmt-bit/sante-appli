/* ============ le son : des bruitages faits par le code (aucun fichier), qui suivent la vitesse ============ */
// L'eau qui file, le vent, les rapides, l'éclaboussure de chaque coup, les retombées, l'écho étouffé des grottes, un tintement au tour.
// Pas de musique (Kiki, 11/11). Le bouton « Son » le coupe ; le choix est gardé sur la machine (riviere_son).
const SON = {ctx: null, actif: true, n: {}};
try { SON.actif = localStorage.getItem("riviere_son") !== "0"; } catch (e) {}
function sonDemarrer() {   // à appeler depuis un toucher : un navigateur ne joue aucun son avant
  if (!SON.actif) return;
  if (SON.ctx) { if (SON.ctx.state === "suspended") SON.ctx.resume().catch(() => {}); return; }
  try {
    const C = window.AudioContext || window.webkitAudioContext, ctx = new C(), n = SON.n;
    const tampon = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = tampon.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    SON.bruit = tampon;
    n.sortie = ctx.createGain(); n.sortie.gain.value = .8; n.sortie.connect(ctx.destination);
    n.voile = ctx.createBiquadFilter(); n.voile.type = "lowpass"; n.voile.frequency.value = 16000; n.voile.connect(n.sortie);   // une grotte étouffe tout
    const source = ctx.createBufferSource(); source.buffer = tampon; source.loop = true;
    const voie = (type, f, q) => { const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain(); g.gain.value = 0; source.connect(fl); fl.connect(g); g.connect(n.voile); return {fl, g}; };
    n.eau = voie("bandpass", 700, .7); n.vent = voie("highpass", 1800, .3); n.rapides = voie("lowpass", 420, .4);
    source.start(); SON.ctx = ctx;
  } catch (e) { SON.actif = false; }
}
function sonBasculer() {
  SON.actif = !SON.actif; try { localStorage.setItem("riviere_son", SON.actif ? "1" : "0"); } catch (e) {}
  if (SON.actif) sonDemarrer(); else if (SON.ctx) SON.ctx.suspend().catch(() => {});
  return SON.actif;
}
/* chaque image : la vitesse (0 à 1,2), sur l'eau ou non, dans un tunnel ou non, la raideur de la pente alentour */
function sonMaj(vn, liquide, tunnel, raide) {
  const c = SON.ctx; if (!c || !SON.actif || c.state !== "running") return;
  const n = SON.n, t = c.currentTime, v = (p, x) => p.setTargetAtTime(x, t, .12);
  v(n.eau.g.gain, liquide ? .035 + .13 * vn : .012 * vn); v(n.eau.fl.frequency, liquide ? 500 + 900 * vn : 260);
  v(n.vent.g.gain, .05 * vn * vn + (liquide ? 0 : .02 * vn));
  v(n.rapides.g.gain, liquide ? Math.min(.5, raide * 2.2) : 0);
  v(n.voile.frequency, tunnel ? 1500 : 16000);
}
function sonCoup(force, liquide) {   // l'éclaboussure d'un coup de rame (sur la terre : un pas sourd)
  const c = SON.ctx; if (!c || !SON.actif || c.state !== "running") return;
  const t = c.currentTime, g = c.createGain(); g.connect(SON.n.voile);
  if (liquide) {
    const s = c.createBufferSource(), f = c.createBiquadFilter(); s.buffer = SON.bruit; f.type = "bandpass"; f.frequency.setValueAtTime(1400, t); f.frequency.exponentialRampToValueAtTime(500, t + .3); f.Q.value = .8;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.12 + .16 * force, t + .03); g.gain.exponentialRampToValueAtTime(.001, t + .45);
    s.connect(f); f.connect(g); s.start(t, Math.random()); s.stop(t + .5);
  } else {
    const o = c.createOscillator(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(55, t + .12);
    g.gain.setValueAtTime(.16, t); g.gain.exponentialRampToValueAtTime(.001, t + .16); o.connect(g); o.start(t); o.stop(t + .18);
  }
}
function sonPlouf(force, liquide) {   // une retombée après un saut, une chute d'eau franchie
  const c = SON.ctx; if (!c || !SON.actif || c.state !== "running") return;
  const t = c.currentTime, g = c.createGain(), s = c.createBufferSource(), f = c.createBiquadFilter(); g.connect(SON.n.voile);
  s.buffer = SON.bruit; f.type = "lowpass"; f.frequency.setValueAtTime(liquide ? 2600 : 500, t); f.frequency.exponentialRampToValueAtTime(liquide ? 300 : 90, t + .6);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.35 * force, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + .8);
  s.connect(f); f.connect(g); s.start(t, Math.random()); s.stop(t + .85);
}
function sonTinte(notes) {   // un petit tintement (le passage de la ligne, un record) : notes en hertz
  const c = SON.ctx; if (!c || !SON.actif || c.state !== "running") return;
  notes.forEach((hz, i) => {
    const t = c.currentTime + i * .13, o = c.createOscillator(), g = c.createGain(); o.type = "triangle"; o.frequency.value = hz;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.12, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + .5);
    o.connect(g); g.connect(SON.n.sortie); o.start(t); o.stop(t + .55);
  });
}
