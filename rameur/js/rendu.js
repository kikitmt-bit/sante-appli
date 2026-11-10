/* ============ le rendu pseudo-3D (comme Mario Kart sur Super Nintendo, OutRun) ============ */
// La rivière est une suite de bandes de 2 m, dessinées de la plus lointaine à la plus proche. Chaque bande est projetée (perspective),
// puis remplie ligne par ligne en pixels entiers : aucun bord lissé, un seul grain de pixel pour tout. L'image fait 270 pixels de haut,
// agrandie sans lissage par le navigateur. Le décor (arbres, maisons…) est fait de sprites tournés vers la caméra, mis à l'échelle.
const cv = $("c"), cx = cv.getContext("2d", {alpha: false});
const E = {W: 480, H: 270, HY: 108};
const CAMD = 1 / Math.tan(70 * Math.PI / 360);   // champ de vision de 70°
const CAMH = 2.8;     // hauteur de la caméra au-dessus de l'eau (m)
const ZH = 8;         // ton Pokémon est 8 m devant la caméra
const ND = 220;       // bandes dessinées (440 m)
const BN = 50, BF = 420;  // la brume : début, fin (m)
const HC = 7;         // hauteur de la voûte d'un tunnel (m)
function tailleEcran() { const asp = innerWidth / innerHeight; E.H = 270; E.W = clamp(Math.round(E.H * asp), 360, 640); cv.width = E.W; cv.height = E.H; E.HY = Math.round(E.H * .4); cx.imageSmoothingEnabled = false; }
addEventListener("resize", tailleEcran); tailleEcran();

/* ---- les couleurs : chacune a 8 nuances de brume, calculées une fois ---- */
const BRUME_RVB = rvb(BIOME.brume), PAL = new Map();
function pal(hex) { let p = PAL.get(hex); if (!p) { const c = rvb(hex); p = Array.from({length: 8}, (_, f) => { const t = f / 7; return `rgb(${Math.round(lerp(c[0], BRUME_RVB[0], t))},${Math.round(lerp(c[1], BRUME_RVB[1], t))},${Math.round(lerp(c[2], BRUME_RVB[2], t))})`; }); PAL.set(hex, p); } return p; }
const brumeDe = z => Math.min(7, Math.floor(lisse(BN, BF, z) * 8));

/* ---- deux formes de base, remplies en pixels entiers ---- */
function trapeze(yH, yB, xl0, xr0, xl1, xr1, couleur) {  // haut (yH) et bas (yB) horizontaux
  const y0 = Math.round(yH), y1 = Math.round(yB); if (y1 <= y0) return; const h = y1 - y0, ya = Math.max(y0, 0), yb = Math.min(y1, E.H); cx.fillStyle = couleur;
  for (let y = ya; y < yb; y++) { const t = (y - y0 + .5) / h, a = Math.round(lerp(xl0, xl1, t)), b = Math.round(lerp(xr0, xr1, t)); if (b > a) cx.fillRect(a, y, b - a, 1); }
}
function colonnes(xa, xb, ta, ba, tb, bb, couleur) {  // deux côtés verticaux (en xa et xb), haut (t) et bas (b) de chacun
  if (xb < xa) { [xa, xb, ta, tb, ba, bb] = [xb, xa, tb, ta, bb, ba]; }
  const x0 = Math.round(xa), x1 = Math.round(xb); if (x1 <= x0) return; const w = x1 - x0; cx.fillStyle = couleur;
  for (let x = Math.max(x0, 0); x < Math.min(x1, E.W); x++) { const t = (x - x0 + .5) / w, y0 = Math.round(lerp(ta, tb, t)), y1 = Math.round(lerp(ba, bb, t)); if (y1 > y0) cx.fillRect(x, y0, 1, y1 - y0); }
}

/* ---- le fond : le ciel en bandes, des nuages, deux rangées de montagnes qui tournent avec les virages ---- */
const NUAGES = toile(512, 70, x => { const R = hasard(5);
  for (let k = 0; k < 20; k++) { const cx0 = R() * 512, cy = 22 + R() * 34, w = 14 + R() * 34, h = 5 + R() * 8;
    for (let X = -w; X <= w; X++) { const top = Math.round(h * Math.sqrt(Math.max(0, 1 - (X / w) ** 2)) * (.75 + .35 * Math.sin(X * .35 + k)));
      for (let Y = -top; Y <= 2; Y++) { const xx = ((Math.round(cx0 + X) % 512) + 512) % 512; x.fillStyle = Y >= 1 ? "#B8D0E8" : Y > -top + 2 ? "#F8FCFF" : "#FFFFFF"; if (Y >= 0 && Y < 1) x.fillStyle = "#DCE8F4"; x.fillRect(xx, Math.round(cy + Y), 1, 1); } } } });
const TUILE_M = 1024;  // largeur d'un tour de montagnes (pixels), qui se raccorde à elle-même
const relief = (x, a, b, c, ph) => Math.sin(x / TUILE_M * Math.PI * 2 * a + ph) * .5 + Math.sin(x / TUILE_M * Math.PI * 2 * b + ph * 2.1) * .3 + Math.sin(x / TUILE_M * Math.PI * 2 * c + ph * .6) * .2;
function fond(pos, t) {
  const {W, HY} = E, haut = rvb(BIOME.ciel.haut), bas = rvb(BIOME.ciel.bas), NB = 14;
  for (let k = 0; k < NB; k++) { const u = Math.pow(k / (NB - 1), .8), y0 = Math.round(k * HY / NB), y1 = Math.round((k + 1) * HY / NB); cx.fillStyle = `rgb(${Math.round(lerp(haut[0], bas[0], u))},${Math.round(lerp(haut[1], bas[1], u))},${Math.round(lerp(haut[2], bas[2], u))})`; cx.fillRect(0, y0, W, y1 - y0); }
  const off = hdgA(pos) * W * .9 * GAIN_VIRAGE * 2.2;   // le fond tourne avec le cap
  const dn = ((Math.round(off * .5 + t * 1.5) % 512) + 512) % 512; for (let x = -dn; x < W; x += 512) cx.drawImage(NUAGES, Math.round(x), HY - 62);
  for (const [coul, a, b, c, ph, base, amp] of [[BIOME.montagnes.loin, 3, 7, 13, 1, 10, 22], [BIOME.montagnes.pres, 5, 11, 17, 3, 5, 12]]) {
    cx.fillStyle = pal(coul)[coul === BIOME.montagnes.loin ? 4 : 2];
    for (let x = 0; x < W; x++) { const X = ((Math.round(x + off * (coul === BIOME.montagnes.loin ? .6 : 1)) % TUILE_M) + TUILE_M) % TUILE_M, h = Math.max(1, Math.round(base + amp * (relief(X, a, b, c, ph) + .5))); cx.fillRect(x, HY - h, 1, h + 1); } }
  cx.fillStyle = `rgb(${BRUME_RVB.join(",")})`; cx.fillRect(0, HY, W, E.H - HY);   // sous l'horizon : la brume
}

/* ---- les bords de la piste vus de la caméra (recalculés à chaque image) ---- */
const N1 = ND + 1, K = () => new Float64Array(N1);
const B = {z: K(), X: K(), ppm: K(), sx: K(), g: K(), sy: K(), xwl: K(), xwr: K(), xol: K(), xor: K(), ytl: K(), ytr: K(), yc: K(), hg: K(), hd: K(), i: new Int32Array(N1)};
const DYN = new Map();   // des sprites qui bougent (le fantôme…) : bande -> liste
function bords(pos) {
  const P = PISTE, camG = val(P.sol, pos), W2 = E.W / 2; let zp = 0, X = 0, p = 0;
  for (let n = 0; n <= ND; n++) {
    const fr = mod(pos) / SEG - Math.floor(mod(pos) / SEG), z = n === 0 ? .35 : (n - fr) * SEG, d = z - zp, s = pos + z;
    const k = P.kap[idx(pos + zp + d / 2)]; X += p * d + .5 * k * d * d; p += k * d; zp = z;
    const g = val(P.sol, s) - camG, ppm = CAMD / z * W2, sy = E.HY + ppm * (CAMH - g), hg = val(P.hg, s), hd = val(P.hd, s), sx = W2 + ppm * X;
    B.z[n] = z; B.X[n] = X; B.ppm[n] = ppm; B.sx[n] = sx; B.g[n] = g; B.sy[n] = sy; B.hg[n] = hg; B.hd[n] = hd; B.i[n] = idx(s);
    B.xwl[n] = sx - ppm * val(P.wl, s); B.xwr[n] = sx + ppm * val(P.wr, s); B.xol[n] = B.xwl[n] - ppm * val(P.bg, s); B.xor[n] = B.xwr[n] + ppm * val(P.bd, s);
    B.ytl[n] = sy - ppm * hg; B.ytr[n] = sy - ppm * hd; B.yc[n] = sy - ppm * HC;
  }
}

/* ---- un sprite du décor : une image, ou une forme provisoire (« bloc ») ---- */
const ASPECT = {};
function image(nom) { const a = BIOME.sprites[nom]; if (!a || !a.img) return null; if (!(nom in ASPECT)) { ASPECT[nom] = null; chargerImg(IMAGES_URL + a.img).then(i => ASPECT[nom] = i).catch(() => ASPECT[nom] = false); } return ASPECT[nom] || null; }
function dessinerBloc(o, x, yb, w, h, v) {
  const b = o.bloc, mur = pal(o.murs)[v], toit = pal(o.toit)[v];
  if (o.nom === "ilot") { const lignes = Math.max(2, Math.round(h)); cx.fillStyle = mur; for (let k = 0; k < lignes; k++) { const t = k / lignes, dem = w / 2 * Math.sqrt(1 - t * t * .9); cx.fillRect(Math.round(x - dem), Math.round(yb - k - 1), Math.max(1, Math.round(dem * 2)), 1); } cx.fillStyle = toit; cx.fillRect(Math.round(x - w * .3), Math.round(yb - h), Math.max(1, Math.round(w * .6)), Math.max(1, Math.round(h * .25))); return; }
  const x0 = Math.round(x - w / 2), y0 = Math.round(yb - h), ww = Math.max(1, Math.round(w)), hh = Math.max(1, Math.round(h));
  cx.fillStyle = mur; cx.fillRect(x0, y0, ww, hh);
  cx.fillStyle = toit; const rh = o.nom === "phare" ? Math.round(hh * .16) : Math.max(1, Math.round(hh * .28)); cx.fillRect(o.nom === "phare" ? x0 : x0 - Math.round(ww * .06), y0, o.nom === "phare" ? ww : ww + Math.round(ww * .12), rh);
  if (o.nom === "maison" && ww > 10) { cx.fillStyle = "rgba(40,50,80,.55)"; const fw = Math.max(2, Math.round(ww * .16)), fh = Math.max(2, Math.round(hh * .22)); cx.fillRect(x0 + Math.round(ww * .18), y0 + Math.round(hh * .5), fw, fh); cx.fillRect(x0 + ww - Math.round(ww * .18) - fw, y0 + Math.round(hh * .5), fw, fh); cx.fillStyle = "rgba(90,50,30,.8)"; cx.fillRect(x0 + Math.round(ww * .45), y0 + Math.round(hh * .62), Math.max(2, Math.round(ww * .12)), Math.round(hh * .38)); }
  if (o.nom === "phare" && ww > 6) { cx.fillStyle = "rgba(216,56,48,.9)"; for (const f of [.38, .62]) cx.fillRect(x0, y0 + Math.round(hh * f), ww, Math.max(1, Math.round(hh * .08))); }
}
function dessinerSprite(o, n) {
  const zS = (B.z[n] + B.z[n + 1]) / 2; if (zS < 2.5) return;
  const ppm = CAMD / zS * E.W / 2, X = (B.X[n] + B.X[n + 1]) / 2, g = (B.g[n] + B.g[n + 1]) / 2, sx = E.W / 2 + ppm * (X + o.x), yb = E.HY + ppm * (CAMH - (g + o.y)), w = o.larg * ppm, h = o.haut * ppm;
  if (w < 2 || sx + w / 2 < 0 || sx - w / 2 > E.W || yb - h > E.H) return;
  cx.globalAlpha = 1 - .85 * lisse(BN, BF, zS);
  if (o.dessiner) o.dessiner(cx, sx, yb, ppm);
  else if (o.bloc) dessinerBloc(o, sx, yb, w, h, brumeDe(zS) > 3 ? 3 : 0);
  else { const im = image(o.nom); if (im) { cx.imageSmoothingEnabled = w < im.width * .6; cx.drawImage(im, Math.round(sx - w / 2), Math.round(yb - h), Math.round(w), Math.round(h)); cx.imageSmoothingEnabled = false; } }
  cx.globalAlpha = 1;
}

/* ---- la façade d'un tunnel : un pan de montagne percé d'une arche ---- */
function facade(n, par) {
  const roche = BIOME.rives.tunnel, c = pal(roche.paroi[par]), sx = B.sx[n], ppm = B.ppm[n], x0 = sx - 45 * ppm, x1 = sx + 45 * ppm, yh = E.HY - ppm * (26 - CAMH + B.g[n]), yc = B.yc[n], yb = B.sy[n];
  const strate = (y0, y1, xa, xb) => { for (let y = Math.max(0, Math.round(y0)); y < Math.min(E.H, Math.round(y1)); y++) { cx.fillStyle = ((y >> 2) & 1) ? c[0] : pal(roche.paroi[1 - par])[0]; cx.fillRect(Math.round(xa), y, Math.max(0, Math.round(xb) - Math.round(xa)), 1); } };
  strate(yh, yc, x0, x1); strate(yc, yb, x0, B.xwl[n]); strate(yc, yb, B.xwr[n], x1);
  cx.fillStyle = pal(roche.dessus[par])[0]; cx.fillRect(Math.round(x0), Math.round(yh), Math.max(0, Math.round(x1) - Math.round(x0)), 2);
}

/* la paroi d'une rive : un seul aplat si elle est basse, des strates (couches de roche) si elle est haute */
function paroi(xc, xn, c, n, hc, hn, couleurs, par, f) {
  const yF = B.sy[c], yN = B.sy[n], pc = B.ppm[c], pn = B.ppm[n], ns = Math.max(1, Math.round(Math.max(hc, hn) / 1.3));
  if (ns <= 1) return colonnes(xc, xn, yF - pc * hc, yF, yN - pn * hn, yN, pal(couleurs[par])[f]);
  for (let k = 0; k < ns; k++) { const a = k / ns, b = (k + 1) / ns; colonnes(xc, xn, yF - pc * hc * b, yF - pc * hc * a, yN - pn * hn * b, yN - pn * hn * a, pal(couleurs[(k + par) & 1])[f]); }
}

/* ---- le monde, de la bande la plus lointaine à la plus proche ---- */
function monde(pos) {
  bords(pos);
  const gi0 = Math.floor(pos / SEG), P = PISTE, ter = BIOME.terrains;
  for (let n = ND - 1; n >= 0; n--) {
    const c = n + 1, i = B.i[n], gi = gi0 + n, par = (gi >> 1) & 1, f = brumeDe(B.z[c]);
    const yF = B.sy[c], yN = B.sy[n]; if (yF >= yN) continue;   // une bande cachée derrière une crête
    const rg = BIOME.rives[P.kg[i]], rd = BIOME.rives[P.kd[i]], tg = pal(ter[rg.derriere] ? ter[rg.derriere][par] : ter.herbe[par]), td = pal(ter[rd.derriere] ? ter[rd.derriere][par] : ter.herbe[par]);
    // à gauche, puis à droite : le terrain au-delà, le dessus de la rive, sa paroi
    if (B.ytl[c] < B.ytl[n]) { trapeze(B.ytl[c], B.ytl[n], -4, B.xol[c], -4, B.xol[n], tg[f]); trapeze(B.ytl[c], B.ytl[n], B.xol[c], B.xwl[c], B.xol[n], B.xwl[n], pal(rg.dessus[par])[f]); }
    if (B.ytr[c] < B.ytr[n]) { trapeze(B.ytr[c], B.ytr[n], B.xor[c], E.W + 4, B.xor[n], E.W + 4, td[f]); trapeze(B.ytr[c], B.ytr[n], B.xwr[c], B.xor[c], B.xwr[n], B.xor[n], pal(rd.dessus[par])[f]); }
    if (P.kg[i] !== "mer") paroi(B.xwl[c], B.xwl[n], c, n, B.hg[c], B.hg[n], rg.paroi, par, f);
    if (P.kd[i] !== "mer") paroi(B.xwr[c], B.xwr[n], c, n, B.hd[c], B.hd[n], rd.paroi, par, f);
    // l'eau, avec un liseré d'écume sur les bords
    const fc = Math.max(1, B.ppm[c] * .35), fn = Math.max(1, B.ppm[n] * .35), eau = BIOME.eau[par];
    trapeze(yF, yN, B.xwl[c] - (P.kg[i] === "mer" ? 0 : fc), B.xwr[c] + (P.kd[i] === "mer" ? 0 : fc), B.xwl[n] - (P.kg[i] === "mer" ? 0 : fn), B.xwr[n] + (P.kd[i] === "mer" ? 0 : fn), pal(BIOME.ecume)[f]);
    trapeze(yF, yN, B.xwl[c], B.xwr[c], B.xwl[n], B.xwr[n], pal(eau)[f]);
    if (P.tun[i]) {  // la voûte
      const pl = BIOME.rives.tunnel.plafond[par]; trapeze(B.yc[n], B.yc[c], B.xwl[n], B.xwr[n], B.xwl[c], B.xwr[c], pal(pl)[f]);
      if (!P.tun[(i + NS - 1) % NS]) facade(n, par);
    }
    for (const o of DECOR[i]) dessinerSprite(o, n);
    const dyn = DYN.get(i); if (dyn) for (const o of dyn) dessinerSprite(o, n);
  }
}
/* la position de l'eau (ligne de l'écran) à une distance z devant la caméra, plus la largeur d'un mètre à cet endroit */
function surEau(z, pos) { const ppm = CAMD / z * E.W / 2, g = val(PISTE.sol, pos + z) - val(PISTE.sol, pos); return {ppm, y: E.HY + ppm * (CAMH - g), x: E.W / 2}; }
function dessiner(pos, t) { fond(pos, t || 0); monde(pos); }
