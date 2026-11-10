/* ============ le son : l'eau, le vent de la vitesse, les éclaboussures, les oiseaux, l'écho des tunnels ============ */
let AC = null, sonOn = true, BRUIT = null, merG = null, merF = null, ventG = null, ventF = null, chuteG = null, prochainChant = 3;
function audio() {
  if (AC) { if (AC.state === "suspended") AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
  BRUIT = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate); const dd = BRUIT.getChannelData(0); let b = 0;
  for (let i = 0; i < dd.length; i++) { b = (b + .02 * (Math.random() * 2 - 1)) / 1.02; dd[i] = b * 3.5 + (Math.random() * 2 - 1) * .15; }
  const boucleB = (f, q, type) => { const s = AC.createBufferSource(); s.buffer = BRUIT; s.loop = true; const fi = AC.createBiquadFilter(); fi.type = type; fi.frequency.value = f; fi.Q.value = q; const g = AC.createGain(); g.gain.value = 0; s.connect(fi); fi.connect(g); g.connect(AC.destination); s.start(0, Math.random() * 1.5); return [g, fi]; };
  [merG, merF] = boucleB(520, .7, "lowpass"); [ventG, ventF] = boucleB(900, .5, "bandpass"); [chuteG] = boucleB(1400, .4, "bandpass");
}
function bruitage(freq, q, vol, dur) {
  if (!AC || !sonOn) return; const s = AC.createBufferSource(); s.buffer = BRUIT; const f = AC.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
  const g = AC.createGain(), t = AC.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .03); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  s.connect(f); f.connect(g); g.connect(AC.destination); s.start(t, Math.random()); s.stop(t + dur + .1);
}
function note(freq, dur, type = "sine", vol = .03, quand = 0) { if (!AC || !sonOn) return null; const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + quand;
  o.type = type; o.frequency.setValueAtTime(freq, t); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + .02); return o; }
