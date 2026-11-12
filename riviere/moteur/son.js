/* ============ le son : très doux, fait par le code (aucun fichier) ============ */
// Kiki, 11/11 : « un son très très soft et léger, juste quand le Pokémon rame », et le bruit des cascades, qui arrive et repart très
// progressivement selon la distance (une cascade qui monte : à peine ; une chute : un peu plus). Rien dans un tunnel, jamais d'écho.
// Ni vent, ni eau qui file, ni retombée, ni tintement. Pas de musique. Le bouton « Son » le coupe ; le choix est gardé (riviere_son).
const SON = {ctx: null, actif: true, n: {}};
try { SON.actif = localStorage.getItem("riviere_son") !== "0"; } catch (e) {}
/* les cascades : les pièces « net » qui montent ou descendent de 2 m au moins ; leur milieu, et leur force */
const CASCADES = (() => {
  const o = [];
  for (const p of PISTE.pieces) {
    const m = +p.monte || 0; if (!p.net || Math.abs(m) < 2) continue;
    const a = at((p.s0 + p.s1) / 2); o.push({x: a.x, y: a.y, z: a.z, fort: m < 0 ? .1 : .035, portee: m < 0 ? 80 : 60});
  }
  return o;
})();
function sonDemarrer() {   // à appeler depuis un toucher : un navigateur ne joue aucun son avant
  if (!SON.actif) return;
  if (SON.ctx) { if (SON.ctx.state === "suspended") SON.ctx.resume().catch(() => {}); return; }
  try {
    const C = window.AudioContext || window.webkitAudioContext, ctx = new C(), n = SON.n;
    const tampon = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = tampon.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    SON.bruit = tampon;
    n.sortie = ctx.createGain(); n.sortie.gain.value = .8; n.sortie.connect(ctx.destination);
    const source = ctx.createBufferSource(); source.buffer = tampon; source.loop = true;   // la cascade : un bruit grave et doux
    const f1 = ctx.createBiquadFilter(); f1.type = "lowpass"; f1.frequency.value = 900; f1.Q.value = .3;
    const f2 = ctx.createBiquadFilter(); f2.type = "highpass"; f2.frequency.value = 120;
    n.cascade = ctx.createGain(); n.cascade.gain.value = 0;
    source.connect(f1); f1.connect(f2); f2.connect(n.cascade); n.cascade.connect(n.sortie);
    const sp = ctx.createBufferSource(); sp.buffer = tampon; sp.loop = true;   // la pluie : le même bruit, plus aigu
    const f3 = ctx.createBiquadFilter(); f3.type = "bandpass"; f3.frequency.value = 3200; f3.Q.value = .4;
    n.pluie = ctx.createGain(); n.pluie.gain.value = 0;
    sp.connect(f3); f3.connect(n.pluie); n.pluie.connect(n.sortie); sp.start(0, .7);
    source.start(); SON.ctx = ctx;
  } catch (e) { SON.actif = false; }
}
function sonBasculer() {
  SON.actif = !SON.actif; try { localStorage.setItem("riviere_son", SON.actif ? "1" : "0"); } catch (e) {}
  if (SON.actif) sonDemarrer(); else if (SON.ctx) SON.ctx.suspend().catch(() => {});
  return SON.actif;
}
/* chaque image : où on est (s), dans un tunnel ou non. La cascade la plus proche s'entend selon la distance, en fondu lent */
function sonMaj(s, tunnel) {
  const c = SON.ctx; if (!c || !SON.actif || c.state !== "running") return;
  const a = at(s); let g = 0;
  if (!tunnel) for (const L of [CASCADES, MONDE.sons]) for (const k of L) { const d = Math.hypot(a.x - k.x, a.y - k.y, a.z - k.z), f = 1 - lisse(4, k.portee, d); g = Math.max(g, k.fort * f * f); }
  SON.n.cascade.gain.setTargetAtTime(g, c.currentTime, 1.2);
  SON.n.pluie.gain.setTargetAtTime(tunnel ? 0 : .035 * clamp(AMB.m.pluie, 0, 1), c.currentTime, 1.5);   // la pluie : un bruissement très doux, rien dans une grotte
}
function sonCoup(force, liquide) {   // un coup de rame : un petit « flouch » très doux (sur la terre : un pas feutré)
  const c = SON.ctx; if (!c || !SON.actif || c.state !== "running") return;
  const t = c.currentTime, g = c.createGain(), s = c.createBufferSource(), f = c.createBiquadFilter(); g.connect(SON.n.sortie);
  s.buffer = SON.bruit; f.type = liquide ? "bandpass" : "lowpass"; f.Q.value = .6;
  f.frequency.setValueAtTime(liquide ? 900 : 300, t); f.frequency.exponentialRampToValueAtTime(liquide ? 380 : 120, t + .35);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.035 + .03 * Math.min(1, force), t + .06); g.gain.exponentialRampToValueAtTime(.0005, t + .5);
  s.connect(f); f.connect(g); s.start(t, Math.random()); s.stop(t + .55);
}
function sonPlouf() {}   // (retombées et tintements retirés : Kiki, 11/11)
function sonTinte() {}
