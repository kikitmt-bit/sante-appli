/* ============ l'atelier de sprites : arbres, maisons, rochers… dessinés par le code, pixel par pixel ============ */
// Tout vient de la palette du biome (BIOME.palette) et d'un seul grain de pixel : les objets vont ensemble, quel que soit le niveau.
// Chaque fonction rend une petite image dont le BAS touche le sol (le pied de l'objet est sur la dernière ligne) ; la graine donne une variante.
const JARDIN = (() => {
  const PAL = BIOME.palette, SOMBRE = "#12202A";
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function peintre(w, h) {
    const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.imageSmoothingEnabled = false;
    const m = new Uint8Array(w * h), lum = new Float32Array(w * h);
    return {c, x, w, h, m, lum,
      px(i, j, col) { if (i >= 0 && j >= 0 && i < w && j < h) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } },
      rect(i, j, a, b, col) { x.fillStyle = col; x.fillRect(i, j, a, b); },
      disque(cx, cy, r, ry = r, l0 = null) { for (let j = Math.max(0, Math.floor(cy - ry)); j <= Math.min(h - 1, Math.ceil(cy + ry)); j++) for (let i = Math.max(0, Math.floor(cx - r)); i <= Math.min(w - 1, Math.ceil(cx + r)); i++) { const dx = (i - cx) / r, dy = (j - cy) / ry; if (dx * dx + dy * dy <= 1) { m[j * w + i] = 1; lum[j * w + i] = clamp(.5 + (-dx * .55 - dy * .75) * .5 + (l0 === null ? 0 : l0), 0, 1); } } },
      // colorie le masque avec une rampe de couleurs (sombre -> clair), un liseré sombre tout autour, un peu de tramage entre deux nuances
      peindre(rampe, contour = SOMBRE, tramage = true) { const n = rampe.length;
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { if (!m[j * w + i]) continue; const bord = !(i > 0 && m[j * w + i - 1] && i < w - 1 && m[j * w + i + 1] && j > 0 && m[(j - 1) * w + i] && (j === h - 1 || m[(j + 1) * w + i]));
          if (bord && !(j === h - 1)) { this.px(i, j, contour); continue; }
          const v = lum[j * w + i] * (n - .01), k = Math.floor(v), f = v - k; let idx = k; if (tramage && f > .62 && (i + j) % 2 === 0 && k < n - 1) idx = k + 1; if (tramage && f < .38 && (i + j) % 2 === 0 && k > 0) idx = k - 1; this.px(i, j, rampe[clamp(idx, 0, n - 1)]); } },
      ombre(cx, cy, rx, ry, a = .3) { x.fillStyle = `rgba(10,30,20,${a})`; for (let j = -ry; j <= ry; j++) { const l = Math.round(rx * Math.sqrt(1 - (j / ry) ** 2)); x.fillRect(Math.round(cx - l), Math.round(cy + j), l * 2, 1); } },
      vide() { m.fill(0); }};
  }
  const feuilles = PAL.feuilles, tronc = PAL.tronc, pierre = PAL.pierre;
  const GEN = {
    arbre(seed) {
      const R = hasard(seed * 131 + 7), p = peintre(48, 64);
      p.ombre(24, 61, 15, 3, .3);
      p.rect(21, 38, 6, 24, tronc[1]); p.rect(21, 38, 3, 24, tronc[2]); p.rect(26, 38, 1, 24, SOMBRE); p.rect(20, 38, 1, 24, SOMBRE); p.rect(19, 58, 10, 4, tronc[1]); p.rect(19, 58, 4, 4, tronc[2]); p.rect(18, 61, 12, 1, SOMBRE);
      const blobs = [[24, 25, 17, 15]]; for (let k = 0; k < 5; k++) { const a = R() * 6.28, d = 8 + R() * 6; blobs.push([clamp(24 + Math.cos(a) * d, 12, 36), clamp(24 + Math.sin(a) * d * .8, 14, 36), 8 + R() * 4, 7 + R() * 3]); }
      blobs.sort((u, v) => u[1] - v[1]); for (const [cx, cy, r, ry] of blobs) p.disque(cx, cy, r, ry, R() * .12 - .06);
      p.peindre(feuilles);
      for (let k = 0; k < 10; k++) { const i = 12 + Math.floor(R() * 22), j = 8 + Math.floor(R() * 22); if (p.m[j * 48 + i] && p.lum[j * 48 + i] > .45) { p.px(i, j, feuilles[3]); p.px(i + 1, j, feuilles[3]); } }
      for (let k = 0; k < 6; k++) { const i = 12 + Math.floor(R() * 24), j = 22 + Math.floor(R() * 16); if (p.m[j * 48 + i]) p.px(i, j, feuilles[0]); }
      return p.c;
    },
    sapin(seed) {
      const R = hasard(seed * 71 + 3), p = peintre(40, 64); p.ombre(20, 61, 13, 3, .3);
      p.rect(17, 54, 6, 10, tronc[1]); p.rect(17, 54, 3, 10, tronc[2]);
      const tiers = [[3, 22, 9], [15, 36, 12], [27, 50, 15], [38, 58, 18]];
      for (const [y0, y1, dem] of tiers) for (let j = y0; j < y1; j++) { const t = (j - y0) / (y1 - y0), l = Math.round(dem * (.15 + .85 * t)); for (let i = 20 - l; i <= 20 + l; i++) { p.m[j * 40 + i] = 1; p.lum[j * 40 + i] = clamp(.55 + (-(i - 20) / (l + 1)) * .42 - (j - y0) / (y1 - y0) * .22, 0, 1); } }
      p.peindre(feuilles.slice(0, 4).map((c, i) => i === 3 ? feuilles[3] : c)); return p.c;
    },
    buisson(seed) {
      const R = hasard(seed * 53 + 1), p = peintre(32, 22); p.ombre(16, 20, 12, 2, .25);
      for (const [cx, cy, r, ry] of [[16, 13, 10, 8], [8, 15, 7, 6], [24, 15, 7, 6]]) p.disque(cx + (R() - .5) * 2, cy, r, ry, R() * .1 - .05); p.peindre(feuilles);
      for (let k = 0; k < 4; k++) { const i = 8 + Math.floor(R() * 16), j = 8 + Math.floor(R() * 7); if (p.m[j * 32 + i]) p.px(i, j, "#F2D84A"); } return p.c;
    },
    rocher(seed) {
      const R = hasard(seed * 97 + 5), p = peintre(32, 56); p.ombre(16, 53, 13, 3, .3);
      for (let j = 4; j < 55; j++) { const t = (j - 4) / 51, dem = Math.round(4 + 9 * Math.pow(t, .7) + Math.sin(j * .5 + seed) * .5); for (let i = 16 - dem; i <= 16 + dem; i++) { p.m[j * 32 + i] = 1; p.lum[j * 32 + i] = clamp(.5 - (i - 16) / dem * .45 - t * .1 + (R() < .04 ? .15 : 0), 0, 1); } }
      p.peindre(pierre, SOMBRE, false); return p.c;
    },
    caillou(seed) {  // un rocher bas et arrondi
      const R = hasard(seed * 29 + 4), p = peintre(40, 24); p.ombre(20, 22, 17, 2, .28);
      for (const [cx, cy, r, ry] of [[20, 14, 15, 9], [11, 17, 9, 6], [29, 16, 9, 7]]) p.disque(cx + (R() - .5) * 2, cy, r, ry, R() * .1 - .05);
      p.peindre(pierre, SOMBRE, false); return p.c;
    },
    ilot(seed) {
      const R = hasard(seed * 61 + 9), p = peintre(72, 26); p.ombre(36, 24, 32, 2, .2);
      for (let j = 6; j < 25; j++) { const t = (j - 6) / 19, dem = Math.round(14 + 20 * Math.pow(t, .6)); for (let i = 36 - dem; i <= 36 + dem; i++) { p.m[j * 72 + i] = 1; p.lum[j * 72 + i] = clamp(.55 - (i - 36) / dem * .3 - t * .25, 0, 1); } }
      p.peindre(pierre, SOMBRE, false); for (let j = 4; j < 11; j++) { const dem = Math.round(11 + (j - 4) * 2.4 + Math.sin(j) * 1.5); for (let i = 36 - dem; i <= 36 + dem; i++) p.px(i, j, j < 5 ? SOMBRE : feuilles[1 + ((i + j) % 5 === 0 ? 1 : 0)]); } return p.c;
    },
    roseaux(seed) {
      const R = hasard(seed * 17 + 2), p = peintre(32, 40);
      for (let k = 0; k < 11; k++) { const x0 = 3 + Math.floor(R() * 26), h = 18 + Math.floor(R() * 20), pen = (R() - .5) * .5; for (let j = 0; j < h; j++) p.px(Math.round(x0 + pen * j), 39 - j, j > h - 5 && k % 3 === 0 ? "#8A5A34" : feuilles[1 + (k % 2)]); if (k % 3 === 0) for (let j = 0; j < 3; j++) p.px(Math.round(x0 + pen * h), 39 - h - j, "#8A5A34"); }
      return p.c;
    },
    maison(seed) {
      const R = hasard(seed * 41 + 11), p = peintre(72, 64), mur = PAL.murs[seed % PAL.murs.length], toit = PAL.toits[(seed >> 1) % PAL.toits.length], plat = seed % 4 === 3;
      const cl = (h, f) => { const c = hex(h); return `rgb(${clamp(Math.round(c[0] * f), 0, 255)},${clamp(Math.round(c[1] * f), 0, 255)},${clamp(Math.round(c[2] * f), 0, 255)})`; };
      p.ombre(36, 62, 33, 2, .22);
      const x0 = 7, x1 = 64, yH = plat ? 18 : 26, yB = 62;
      p.rect(x0 - 1, yH - 1, x1 - x0 + 3, yB - yH + 2, SOMBRE); p.rect(x0, yH, x1 - x0 + 1, yB - yH + 1, mur); p.rect(x1 - 8, yH, 9, yB - yH + 1, cl(mur, .82)); p.rect(x0, yB - 5, x1 - x0 + 1, 6, PAL.pierre[1]); p.rect(x0, yB - 5, x1 - x0 + 1, 1, PAL.pierre[2]);
      if (plat) {  // toit-terrasse : un rebord, une bande de couleur, une cheminée
        p.rect(x0 - 3, yH - 6, x1 - x0 + 7, 7, SOMBRE); p.rect(x0 - 2, yH - 5, x1 - x0 + 5, 5, PAL.pierre[2]); p.rect(x0 - 2, yH - 1, x1 - x0 + 5, 1, PAL.pierre[1]); p.rect(x0, yH + 2, x1 - x0 + 1, 3, toit);
        p.rect(48, yH - 14, 8, 9, SOMBRE); p.rect(49, yH - 13, 6, 8, "#A04A38"); p.rect(48, yH - 14, 8, 2, PAL.pierre[1]);
      } else {  // grand toit : des rangées de tuiles qui descendent de la crête
        for (let j = 0; j < 25; j++) { const t = j / 24, dem = Math.round(6 + 31 * t + (j > 21 ? 3 : 0)); p.rect(36 - dem - 1, 2 + j, dem * 2 + 3, 1, SOMBRE); p.rect(36 - dem, 2 + j, dem * 2 + 1, 1, j % 4 === 3 ? cl(toit, .72) : cl(toit, 1 - (36 - 8) * 0 + (j % 2 ? 0 : .06))); p.rect(36 + Math.round(dem * .45), 2 + j, Math.round(dem * .55) + 1, 1, j % 4 === 3 ? cl(toit, .6) : cl(toit, .84)); }
        p.rect(36 - 37, 27, 75, 1, SOMBRE); p.rect(46, 4, 7, 11, SOMBRE); p.rect(47, 5, 5, 9, "#A04A38"); p.rect(46, 4, 7, 2, PAL.pierre[1]);
      }
      const fen = (i, j, w, h) => { p.rect(i - 1, j - 1, w + 2, h + 2, SOMBRE); p.rect(i, j, w, h, "#CBE8F6"); p.rect(i, j, w, 2, "#F4FBFF"); p.rect(i + Math.floor(w / 2), j, 1, h, "#FFFFFF"); p.rect(i, j + Math.floor(h / 2), w, 1, "#FFFFFF"); p.rect(i - 2, j, 2, h, toit); p.rect(i + w, j, 2, h, toit); };
      fen(26, yH + 8, 10, 12); fen(44, yH + 8, 10, 12);
      p.rect(13, yB - 20, 10, 16, SOMBRE); p.rect(14, yB - 19, 8, 15, "#8A5A34"); p.rect(14, yB - 19, 3, 15, "#A56E40"); p.px(20, yB - 11, "#F2D84A"); p.rect(12, yB - 4, 12, 1, PAL.pierre[2]);
      return p.c;
    },
    lampadaire(seed) { const p = peintre(14, 64); p.rect(6, 6, 2, 56, SOMBRE); p.rect(6, 6, 1, 56, "#5A5A6A"); p.rect(5, 60, 4, 4, SOMBRE); p.rect(6, 61, 2, 3, "#5A5A6A"); p.rect(7, 5, 6, 2, SOMBRE); p.rect(10, 6, 4, 6, SOMBRE); p.rect(11, 7, 2, 4, "#FFE890"); return p.c; },
    bouee(seed) { const p = peintre(16, 24); for (let j = 4; j < 22; j++) { const dem = j < 8 ? 2 + (j - 4) : j < 18 ? 6 : 6 - (j - 17); for (let i = 8 - dem; i < 8 + dem; i++) { p.m[j * 16 + i] = 1; p.lum[j * 16 + i] = .5 + (i < 8 ? .2 : -.1); } } p.peindre(["#8A1E18", "#D83830", "#F4F4F4", "#FFFFFF"], SOMBRE, false); p.rect(7, 1, 2, 4, SOMBRE); p.rect(6, 0, 4, 2, "#F8E088"); return p.c; },
    tribune(seed) {
      const p = peintre(96, 44); p.ombre(48, 42, 46, 2, .2);
      for (let k = 0; k < 4; k++) { const y = 12 + k * 8; p.rect(2 + k * 5, y, 92 - k * 10, 9, SOMBRE); p.rect(3 + k * 5, y + 1, 90 - k * 10, 7, PAL.pierre[1 + (k % 2)]); const R = hasard(seed + k); for (let i = 6 + k * 5; i < 88 - k * 5; i += 4) if (R() < .75) { p.rect(i, y + 2, 3, 3, PAL.toits[Math.floor(R() * PAL.toits.length)]); p.px(i + 1, y + 1, "#F0C89A"); } }
      p.rect(0, 4, 96, 4, SOMBRE); p.rect(1, 5, 94, 2, "#F4F4F4"); for (let i = 4; i < 92; i += 12) p.rect(i, 5, 6, 2, "#D83830"); p.rect(2, 8, 2, 34, SOMBRE); p.rect(92, 8, 2, 34, SOMBRE); return p.c;
    },
    phare(seed) {
      const p = peintre(40, 128); p.ombre(20, 126, 16, 2, .25);
      for (let j = 22; j < 127; j++) { const t = (j - 22) / 104, dem = Math.round(6 + 6 * t); for (let i = 20 - dem; i <= 20 + dem; i++) { p.m[j * 40 + i] = 1; p.lum[j * 40 + i] = .62 - (i - 20) / dem * .3; } }
      p.peindre(["#9AA0AC", "#D2D6DE", "#F0F2F6", "#FFFFFF"], SOMBRE, false);
      for (let b = 0; b < 4; b++) { const y = 36 + b * 26; for (let j = y; j < y + 10; j++) { const t = (j - 22) / 104, dem = Math.round(6 + 6 * t); for (let i = 20 - dem + 1; i < 20 + dem; i++) p.px(i, j, i > 20 + dem * .3 ? "#8A1E18" : "#D83830"); } }
      p.rect(8, 18, 24, 5, SOMBRE); p.rect(9, 19, 22, 3, "#5A5A6A"); p.rect(10, 8, 20, 10, SOMBRE); p.rect(11, 9, 18, 8, "#FFE890"); p.rect(11, 9, 4, 8, "#FFFFFF"); p.rect(20, 9, 1, 8, SOMBRE);
      for (let j = 0; j < 8; j++) { p.rect(20 - (j + 3), j, (j + 3) * 2 + 1, 1, SOMBRE); p.rect(20 - (j + 2), j, (j + 2) * 2 - 1 + 2, 1, j < 1 ? SOMBRE : "#D83830"); } p.rect(19, 0, 3, 2, SOMBRE); return p.c;
    }
  };
  const cache = {};
  return {noms: Object.keys(GEN), variante(nom, v) { const cle = nom + "#" + v; return cache[cle] || (cache[cle] = GEN[nom](v)); }, existe: nom => nom in GEN};
})();
