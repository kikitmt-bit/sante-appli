/* ============ le décor : posé par règles (le biome), pas à la main ============ */
// Chaque règle du biome dit : quel sprite (avec des poids), dans quelles sections, de quel côté, à quelle distance du bord de l'eau (bande),
// tous les combien de mètres (pas), avec quelle probabilité, sur quelles rives. Le hasard est semé par le niveau : même niveau, même décor.
// Les repères (phare, tribunes…) sont posés exactement, à l'endroit que le niveau indique.
const DECOR = Array.from({length: NS}, () => []);   // les sprites de chaque bande
const DECOR_LISTE = [];
function poserDecor() {
  const R = hasard(NIVEAU.graine * 7919), choisir = (poids) => { let t = 0; for (const v of Object.values(poids)) t += v; let r = R() * t; for (const [n, v] of Object.entries(poids)) { if ((r -= v) <= 0) return n; } return Object.keys(poids)[0]; };
  const pris = {g: [], d: []};  // ce qui est déjà posé, pour ne rien coller
  function sprite(nom, s, x, y, echelle) {
    const def = BIOME.sprites[nom]; if (!def) return;
    let o;
    if (def.bloc) { const b = def.bloc, v = Math.floor(R() * 99); o = {nom, bloc: b, larg: b.larg * echelle, haut: b.haut * echelle, murs: b.murs[v % b.murs.length], toit: b.toit[(v >> 2) % b.toit.length]}; }
    else o = {nom, img: def.img, larg: def.larg * echelle, haut: def.larg * echelle * def.px[1] / def.px[0]};
    o.s = s; o.x = x; o.y = y; DECOR[idx(s)].push(o); DECOR_LISTE.push(o); return o;
  }
  for (const r of BIOME.regles) {
    for (const c of PISTE.secs) {
      if (r.sections ? !r.sections.includes(c.nom) : (r.sauf || []).includes(c.nom)) continue;
      for (const cote of r.cote) {
        const sg = cote === "g" ? -1 : 1; let s = c.s0 + 1 + R() * r.pas * .5;
        while (s < c.s1 - 1) {
          const pas = r.pas * (.7 + .6 * R()), i = idx(s), kind = (sg < 0 ? PISTE.kg : PISTE.kd)[i];
          const bien = R() < r.proba && (kind !== "mer" || (r.sur && r.sur.includes("mer"))) && kind !== "tunnel" && (!r.sur || r.sur.includes(kind));
          if (bien) {
            const d = lerp(r.bande[0], r.bande[1], R()), nom = choisir(r.sprites), ech = r.echelle ? lerp(r.echelle[0], r.echelle[1], R()) : 1, def = BIOME.sprites[nom];
            const larg = (def.bloc ? def.bloc.larg : def.larg) * ech;
            if (!pris[cote].some(p => Math.abs(p.s - s) < (p.larg + larg) * .5 && Math.abs(p.d - d) < 5)) {
              pris[cote].push({s, d, larg});
              sprite(nom, s, sg * (PISTE.ew[i] + d), PISTE.sol[i] + (sg < 0 ? PISTE.hg[i] : PISTE.hd[i]), ech);
            }
          }
          s += pas;
        }
      }
    }
  }
  for (const p of NIVEAU.reperes || []) {  // les repères : exactement où le niveau le dit
    const c = SECTION(p.section), s = c.s0 + p.a, i = idx(s), sg = p.cote === "g" ? -1 : 1;
    if (p.cote === "c") sprite(p.sprite, s, p.dist, PISTE.sol[i] - .3, 1);
    else sprite(p.sprite, s, sg * (PISTE.ew[i] + p.dist), PISTE.sol[i] + (sg < 0 ? PISTE.hg[i] : PISTE.hd[i]), 1);
  }
}
poserDecor();
