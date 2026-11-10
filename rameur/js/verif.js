/* ============ la vérification : des contrôles automatiques et une planche d'images du circuit ============ */
// ?perf=1 : les images par seconde à l'écran.  ?planche=1 : au lieu du jeu, une image tous les 50 m (la planche), pour contrôler le niveau d'un coup d'œil
// (réglages : &pas=20 &cols=3 &de=100 &a=250).
// window.__verif() rend la liste des problèmes trouvés (vide = tout va bien).
if (PARAMS.get("perf")) $("fps").style.cssText = "display:block;position:fixed;left:10px;top:150px;color:#fff;font-size:22px;text-shadow:2px 2px 0 #000";
function verifier() {
  const pb = [], P = PISTE;
  const cap = P.secs.reduce((t, c) => t + c.virage, 0); if (Math.abs(cap - (NIVEAU.tour === undefined ? -360 : NIVEAU.tour)) > 1.5) pb.push(`les virages font ${cap.toFixed(1)}° au lieu d'un tour complet (360°)`);
  const col = P.secs.reduce((t, c) => t + (c.colline || 0), 0); if (Math.abs(col) > .01) pb.push(`les collines ne se compensent pas (${col} m)`);
  for (const c of P.secs) for (const r of c.rives) if (!BIOME.rives[r]) pb.push(`rive inconnue « ${r} » dans ${c.nom}`);
  for (const c of P.secs) if (c.eau < 4) pb.push(`eau trop étroite dans ${c.nom} (${c.eau} m)`);
  for (const o of DECOR_LISTE) { const i = idx(o.s), dedans = Math.abs(o.x) < P.ew[i] + .4 && o.nom !== "ilot"; if (dedans) pb.push(`${o.nom} posé sur l'eau au mètre ${Math.round(o.s)}`); }
  for (const nom of Object.keys(BIOME.sprites)) { const d = BIOME.sprites[nom]; if (d.img && ASPECT[nom] === false) pb.push(`image introuvable : ${d.img}`); }
  const dens = {}; for (const o of DECOR_LISTE) dens[o.nom] = (dens[o.nom] || 0) + 1;
  return {problemes: pb, longueur: Math.round(P.LONG), bandes: P.NS, sprites: dens, tunnels: TUNNELS.map(t => t.map(Math.round))};
}
// le décor est-il fluide ? On avance par pas de 10 cm et on suit l'écran d'un sprite : un saut (accélération brusque) = un décor qui « sautille »
function verifierFluidite() {
  const pb = [], cibles = DECOR_LISTE.filter(o => o.img).slice(0, 400); let pire = 0, quel = null;
  for (let s0 = 0; s0 < LONG; s0 += 97) { const suivis = {};
    for (let k = 0; k < 120; k++) { const pos = s0 + k * .1; bords(pos);
      for (const o of cibles) { const z = mod(o.s - pos); if (z < 15 || z > 150) continue; const n = Math.max(0, Math.min(ND - 1, B.z.findIndex((v, i) => i < ND && z >= v && z < B.z[i + 1]))); const q = ecranSprite(o, n, pos); (suivis[o.s] ||= []).push(q.yb + q.sx * .01); } }
    for (const [cle, v] of Object.entries(suivis)) for (let i = 2; i < v.length; i++) { const a = Math.abs(v[i] - 2 * v[i - 1] + v[i - 2]); if (a > pire) { pire = a; quel = cle; } } }
  if (pire > 1.5) pb.push(`le décor sautille : écart de ${pire.toFixed(1)} px entre deux images (sprite au mètre ${quel})`);
  return {problemes: pb, pire: +pire.toFixed(2)};
}
window.__fluidite = verifierFluidite;
window.__verif = verifier;
async function faireLaPlanche(pas = 50, cols = 4, de = 0, a = LONG) {
  $("menu").hidden = true; $("hud").hidden = true;
  const avecImage = Object.keys(BIOME.sprites).filter(n => BIOME.sprites[n].img); avecImage.forEach(image);
  const attente = Date.now(); while ((!heros || avecImage.some(n => !ASPECT[n] && ASPECT[n] !== false)) && Date.now() - attente < 15000) await new Promise(r => setTimeout(r, 200));
  await new Promise(r => setTimeout(r, 600));
  const L = Math.ceil((a - de) / pas), rows = Math.ceil(L / cols), TW = E.W, TH = E.H, feuille = toile(cols * TW, rows * TH), x = feuille.getContext("2d");
  S.etat = "course"; S.v = 4.5; S.vL = 4.5; S.vn = .8;
  for (let k = 0; k < L; k++) { const s = de + k * pas; S.s = s; GOUTTES.length = 0; dessiner(s - ZH, k); dessinerHero(s - ZH, k * .3);
    x.drawImage(cv, (k % cols) * TW, Math.floor(k / cols) * TH); const c = PISTE.secs[PISTE.sec[idx(s)]];
    x.font = "16px monospace"; x.fillStyle = "#000"; x.fillRect((k % cols) * TW, Math.floor(k / cols) * TH, 150, 20); x.fillStyle = "#fff"; x.fillText(`${s} m · ${c.nom}`, (k % cols) * TW + 4, Math.floor(k / cols) * TH + 15); }
  feuille.id = "planche"; feuille.style.cssText = "position:fixed;left:0;top:0;width:100%;height:auto;z-index:99;background:#000"; document.body.appendChild(feuille);
  window.__planche = feuille; return feuille;
}
window.__planche_lancer = faireLaPlanche;
if (PARAMS.get("planche")) faireLaPlanche(+PARAMS.get("pas") || 50, +PARAMS.get("cols") || 4, +PARAMS.get("de") || 0, +PARAMS.get("a") || LONG);
