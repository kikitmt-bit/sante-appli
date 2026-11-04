// La danse au doigt (04/11, carte blanche de Kiki) : un clin d'œil dans l'onglet Muscu, 4 musiques, pour s'amuser et donner envie d'un vrai tapis. 1 point d'effort par jour, pour le premier morceau fini (trace geste-danse) :
// le jeu se gagne en faisant du sport. Classement entre joueurs par morceau et difficulté (trace danse-<morceau>-<difficulté>_<millièmes>_<moment>, pokemon.meilleurs_scores). Musiques et pas (fichiers StepMania) : dépôt privé, branche « danse », jamais ce dépôt public (danse.py). Inclus dans pokemon_ui.html par ecran_pokemon.py.
// Chaque musique est un vrai combat : son dresseur, son décor, son équipe (noms ici : le Pokédex du jeu ne connaît que Kanto), un effet animé. Ces images ne vont pas dans le Pokédex et ne nomment jamais de région.
const DANSE_DECOR = n => ({image: `combat-danse-${n}.webp`, e: [71.2, 44.7], c: [29.3, 65.7], te: 22, tc: 30});
const DANSE_CHANSONS = {
  skull: {court: "Skull", titre: "Vs Team Skull", phrase: "Ils ont le rythme dans la peau, et aucune manière.", decor: DANSE_DECOR("skull"), effet: "pluie",
    qui: "Le Sbire", sprite: "skull_grunt_m", equipe: [[734, "Manglouton"], [42, "Nosferalto"], [757, "Tritox"]],
    debut: "Yo ! T'as cru pouvoir danser sur NOTRE bitume ?", fin: "Pfff… c'était même pas mon vrai niveau, yo.", perdu: "Yo ! Retourne t'entraîner, petit !"},
  colress: {court: "Nikolaï", titre: "Vs Nikolaï", phrase: "Il a tout calculé, sauf toi.", decor: DANSE_DECOR("colress"), effet: "machines",
    qui: "Nikolaï", sprite: "colress", equipe: [[82, "Magnéton"], [437, "Archéodong"], [601, "Cliticlic"]],
    debut: "Voyons ce que ton rythme révèle sur ton Pokémon.", fin: "Fascinant ! Des données inestimables.", perdu: "Intéressant… mais insuffisant."},
  zinnia: {court: "Zinnia", titre: "Vs Zinnia", phrase: "Un vent furieux souffle sur la piste.", decor: DANSE_DECOR("zinnia"), effet: "vent",
    qui: "Zinnia", image: "https://play.pokemonshowdown.com/sprites/trainers/zinnia.png", equipe: [[334, "Altaria"], [373, "Drattak"], [384, "Rayquaza"]],
    debut: "Le vent t'a porté jusqu'ici. Danse, si tu l'oses.", fin: "Haha ! Tu danses comme une tempête.", perdu: "Le ciel attendra encore un peu."},
  red: {court: "Red", titre: "Vs Red", phrase: "Au sommet, quelqu'un t'attend sans dire un mot.", decor: DANSE_DECOR("red"), effet: "neige",
    qui: "Red", sprite: "red", equipe: [[25, "Pikachu"], [143, "Ronflex"], [6, "Dracaufeu"]],
    debut: "…", fin: "…!", perdu: "…"},
};
const DANSE_NIVEAUX = [["Beginner", "Tranquille"], ["Easy", "Facile"], ["Medium", "Costaud"], ["Hard", "Expert"]];
const DANSE_VITESSES = [["Lente", 1.7], ["Normale", 1.3], ["Rapide", .95]];  // secondes pour traverser la piste
const DANSE_FENETRES = [["Parfait", .06, 1, "#F8C838"], ["Bien", .11, .6, "#48C868"], ["Juste", .16, .3, "#40A8F8"]];  // au doigt : un peu plus large qu'aux pieds
const DANSE_VICTOIRE = .65;  // la part des points qu'il faut pour mettre K.O. les 3 adversaires
const DANSE_RANGS = [[.95, "S"], [.85, "A"], [DANSE_VICTOIRE, "B"], [.45, "C"], [0, "D"]];
const danseMem = {lire() { try { return JSON.parse(localStorage.getItem("pkm_danse") || "{}"); } catch (e) { return {}; } },
  garder(m) { try { localStorage.setItem("pkm_danse", JSON.stringify(m)); } catch (e) {} }};
const danseRang = p => DANSE_RANGS.find(([s]) => p >= s)[1];
const danseSons = {};  // la musique décodée, gardée le temps de la visite

// Le fichier de pas : tempo, arrêts et notes de chaque difficulté, pour un seul tapis
function danseLire(texte) {
  const propre = texte.replace(/\/\/.*$/gm, ""), tags = {}, charts = [];
  for (const [, cle, val] of propre.matchAll(/#([A-Za-z]+):([^;]*);/g)) {
    const c = cle.toUpperCase();
    if (c !== "NOTES") { tags[c] = val.trim(); continue; }
    const p = val.split(":");
    if (p.length >= 6 && p[0].trim() === "dance-single") charts.push({diff: p[2].trim(), niveau: p[3].trim(), lignes: p[5]});
  }
  const paires = s => (s || "").split(",").map(x => x.split("=").map(Number)).filter(x => x.length === 2 && x.every(Number.isFinite)).sort((a, b) => a[0] - b[0]);
  const bpms = paires(tags.BPMS), arrets = paires(tags.STOPS), offset = parseFloat(tags.OFFSET) || 0;
  const evts = [...bpms.slice(1).map(([b, v]) => ({b, v})), ...arrets.map(([b, d]) => ({b, d}))].sort((x, y) => x.b - y.b || (x.d === undefined ? -1 : 1));
  const seg = [{b: 0, t: -offset, bpm: bpms[0][1]}];
  let b0 = 0, t0 = -offset, bpm = bpms[0][1];
  for (const e of evts) {
    t0 += (e.b - b0) * 60 / bpm; b0 = e.b;
    if (e.v !== undefined) { bpm = e.v; seg.push({b: b0, t: t0, bpm}); }
    else { seg.push({b: b0, t: t0, bpm: 0}); t0 += e.d; seg.push({b: b0, t: t0, bpm}); }
  }
  const beatDe = x => { let g = seg[0]; for (const v of seg) { if (v.t <= x) g = v; else break; } return g.bpm ? g.b + (x - g.t) * g.bpm / 60 : g.b; };
  const tempsDe = x => { let g = seg[0]; for (const v of seg) { if (v.b < x) g = v; else break; } return g.t + (x - g.b) * 60 / g.bpm; };
  for (const c of charts) {
    c.notes = [];
    const ouvertes = {};
    c.lignes.split(",").forEach((m, im) => {
      const l = m.split(/\s+/).filter(x => x.length >= 4);
      l.forEach((ligne, il) => {
        const beat = im * 4 + il / l.length * 4;
        for (let col = 0; col < 4; col++) {
          const k = ligne[col];
          if (k === "1" || k === "2" || k === "4") { const n = {col, beat, t: tempsDe(beat), part: il / l.length * 4 % 1}; c.notes.push(n); if (k !== "1") ouvertes[col] = n; }
          else if (k === "3" && ouvertes[col]) { ouvertes[col].finB = beat; ouvertes[col].finT = tempsDe(beat); delete ouvertes[col]; }
        }
      });
    });
    delete c.lignes;
  }
  return {charts, beatDe, bpmMax: Math.max(...bpms.map(x => x[1]))};
}

// Une flèche en pixels, façon sprite : aplat, contour sombre, haut plus clair. Pointe vers le haut, tournée au dessin.
const DANSE_FORME = ["....#....", "...###...", "..#####..", ".#######.", "#########", "..#####..", "..#####..", "..#####..", "..#####.."];
const danseSprites = {};
function danseFleche(couleur, clair) {
  const cle = couleur + clair; if (danseSprites[cle]) return danseSprites[cle];
  const c = P.createElement("canvas"), x = c.getContext("2d"), N = 11; c.width = c.height = N * 4;
  const plein = (a, b) => (DANSE_FORME[b] || "")[a] === "#";
  for (let b = -1; b <= 9; b++) for (let a = -1; a <= 9; a++) {
    const px = (a + 1) * 4, py = (b + 1) * 4;
    if (plein(a, b)) { x.fillStyle = b < 4 && (a + b < 8) ? clair : couleur; x.fillRect(px, py, 4, 4); }
    else if (plein(a - 1, b) || plein(a + 1, b) || plein(a, b - 1) || plein(a, b + 1)) { x.fillStyle = "#141C38"; x.fillRect(px, py, 4, 4); }
  }
  return danseSprites[cle] = c;
}

// Ce qui doit bouger n'est jamais dans l'image (Kiki, 04/11 : de la pluie figée, c'est moche) : pluie et éclairs, bulles et voyants, vent et feuilles, neige et rafales.
function danseEffet(type, toile) {
  const c = toile.getContext("2d"), H = () => toile.height, W = () => toile.width, A = (a, b) => a + Math.random() * (b - a);
  let t = 0, eclair = 0, prochain = A(5, 10), rafale = 0;
  const gouttes = Array.from({length: 46}, () => ({x: Math.random(), y: Math.random(), v: A(.9, 1.5)}));
  const ronds = Array.from({length: 9}, () => ({x: Math.random(), y: A(.4, 1), r: Math.random()}));
  const flocons = Array.from({length: 70}, () => ({x: Math.random(), y: Math.random(), v: A(.07, .22), g: A(0, 6), s: Math.random() < .25 ? 3 : 2}));
  const traits = Array.from({length: 9}, () => ({x: Math.random(), y: A(.05, .9), v: A(.5, 1), l: A(.05, .13)}));
  const feuilles = Array.from({length: 9}, () => ({x: Math.random(), y: A(.2, .85), v: A(.12, .3), g: A(0, 6), o: Math.random() < .5 ? "#7CC860" : "#B8D860"}));
  const bulles = Array.from({length: 22}, (_, i) => ({tube: i % 3, y: Math.random(), v: A(.1, .28), g: Math.random()}));
  const TUBES = [[.007, .083, .17, .33], [.095, .155, .17, .32], [.905, .985, .19, .25]];
  const VOYANTS = [[.513, .041, "#F85848"], [.797, .041, "#F85848"], [.476, .072, "#58E0F8"], [.848, .072, "#58E0F8"], [.263, .258, "#F85848"], [.34, .329, "#F85848"], [.897, .315, "#F85848"], [.98, .315, "#F85848"]];
  return dt => {
    t += dt; const w = W(), h = H(); c.clearRect(0, 0, w, h);
    if (type === "pluie") {
      c.fillStyle = "rgba(190,205,255,.55)";
      gouttes.forEach(g => { g.y += g.v * dt * 1.5; g.x -= g.v * dt * .18; if (g.y > 1) { g.y = 0; g.x = Math.random() * 1.15; } c.fillRect(Math.round(g.x * w), Math.round(g.y * h), 1, 6); c.fillRect(Math.round(g.x * w) - 1, Math.round(g.y * h) + 5, 1, 5); });
      c.fillStyle = "rgba(200,215,255,.5)";
      ronds.forEach(r => { r.r += dt * 1.4; if (r.r > 1) { r.r = 0; r.x = Math.random(); r.y = A(.42, 1); } const x = r.x * w, y = r.y * h, l = 2 + r.r * 12; c.globalAlpha = 1 - r.r; c.fillRect(x - l, y, l * 2, 1); c.fillRect(x - l * .6, y - 2, l * 1.2, 1); c.fillRect(x - l * .6, y + 2, l * 1.2, 1); });
      c.globalAlpha = 1; prochain -= dt;
      if (prochain < 0) { eclair = 1; prochain = A(7, 15); }
      if (eclair > 0) { c.fillStyle = `rgba(220,225,255,${eclair * .42 * (eclair > .7 || eclair < .4 ? 1 : .3)})`; c.fillRect(0, 0, w, h); eclair -= dt * 2.4; }
    } else if (type === "neige") {
      rafale = Math.max(0, rafale - dt * .5); prochain -= dt; if (prochain < 0) { rafale = 1; prochain = A(5, 10); }
      flocons.forEach(f => { f.y += f.v * dt * (1 + rafale); f.x += (.02 + rafale * .5) * dt + Math.sin(t + f.g) * .0008; if (f.y > 1) { f.y = 0; f.x = Math.random(); } if (f.x > 1) f.x = 0; c.fillStyle = "rgba(255,255,255,.9)"; c.fillRect(Math.round(f.x * w), Math.round(f.y * h), f.s, f.s); });
      if (rafale > 0) { c.fillStyle = `rgba(235,242,255,${rafale * .16})`; c.fillRect(0, 0, w, h); }
    } else if (type === "vent") {
      traits.forEach(l => { l.x += l.v * dt; if (l.x > 1.2) { l.x = -l.l; l.y = A(.05, .9); } c.fillStyle = "rgba(235,255,245,.35)"; c.fillRect(Math.round(l.x * w), Math.round(l.y * h), Math.round(l.l * w), 1); });
      feuilles.forEach(f => { f.x += f.v * dt; if (f.x > 1.02) { f.x = -.02; f.y = A(.2, .85); } const y = f.y + Math.sin(t * 2 + f.g) * .025; c.fillStyle = f.o; c.fillRect(Math.round(f.x * w), Math.round(y * h), 3, 2); });
    } else if (type === "machines") {
      bulles.forEach(b => { const [x0, x1, y0, y1] = TUBES[b.tube]; b.y -= b.v * dt; if (b.y < 0) { b.y = 1; b.g = Math.random(); } c.fillStyle = "rgba(225,255,255,.85)"; c.fillRect(Math.round((x0 + (x1 - x0) * b.g) * w), Math.round((y0 + (y1 - y0) * b.y) * h), 2, 2); });
      VOYANTS.forEach(([x, y, co], i) => { c.globalAlpha = Math.max(0, Math.sin(t * (1.1 + i * .23) + i * 1.7)); c.fillStyle = co; c.fillRect(Math.round(x * w) - 2, Math.round(y * h) - 1, 5, 3); }); c.globalAlpha = 1;
    }
  };
}

const STYLE_DANSE = `
.pkm-entr.danse-menu{gap:8px}
.pkm-entr .d-ch{display:flex;align-items:center;gap:10px;width:100%;padding:7px;text-align:left;background:#F8F8E8;color:#383828;border:3px solid #484838;border-radius:12px 5px;box-shadow:3px 3px 0 rgba(10,15,35,.45)}
.pkm-entr .d-ch:active{transform:translate(2px,2px);box-shadow:none}
.pkm-entr .d-ch i{flex:none;width:84px;height:56px;background-size:cover;background-position:center;image-rendering:pixelated;border:2px solid #484838;border-radius:6px 3px}
.pkm-entr .d-ch b{display:block;font-size:22px;font-weight:400;color:#C03028;line-height:1}.pkm-entr .d-ch small{display:block;font-size:15px;line-height:1.05;margin-top:2px}
.pkm-entr .d-ch .rg{flex:none;margin-left:auto;width:38px;text-align:center;font-size:32px;color:#B05010;line-height:1}
.pkm-entr .d-tete{display:flex;align-items:center;gap:10px;color:#fff}.pkm-entr .d-tete img{width:64px;height:64px;object-fit:contain;image-rendering:pixelated}.pkm-entr .d-tete h3{color:#F8C838;margin:0;text-shadow:2px 2px 0 #141C38}.pkm-entr .d-tete small{color:#C9D3EA}
.pkm-entr .d-reg{color:#C9D3EA;font-size:17px}.pkm-entr .d-reg .choix{margin:2px 0 6px}
.pkm-entr .d-promo{font-size:17px;line-height:1.1}.pkm-entr .d-promo b{font-weight:400;color:#C03028}
.pkm-entr .d-credit{color:#8FA0C4;font-size:13px;text-align:center}
.pkm-entr .d-gros{font-size:84px;line-height:1;text-align:center;color:#C03028}
.pkm-entr .d-lignes{display:grid;grid-template-columns:1fr auto;gap:0 10px;font-size:20px}.pkm-entr .d-lignes span:nth-child(even){text-align:right}
.pkm-entr .d-classe{display:grid;gap:3px;margin-top:6px}.pkm-entr .d-classe div{display:grid;grid-template-columns:26px 1fr auto 24px;gap:6px;align-items:center;padding:3px 7px;font-size:19px;line-height:1;border-radius:7px 3px}
.pkm-entr .d-classe div.toi{background:#F8E8A0}.pkm-entr .d-classe .n{color:#B05010}.pkm-entr .d-classe .r{text-align:center;color:#C03028}.pkm-entr .d-vide{margin:8px 0 2px;text-align:center;color:#686850;font-size:16px}
.pkm-entr .d-saut{animation:d-saut .5s steps(3) infinite alternate}@keyframes d-saut{to{transform:translateY(-8px)}}
.pkm-entr .d-bip{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center;font-size:24px;touch-action:none;min-height:240px}
.pkm-entr .d-bip img{width:120px;height:120px;object-fit:contain;image-rendering:pixelated;transition:transform .07s}.pkm-entr .d-bip img.tape{transform:translateY(-14px) scale(1.08)}
.pkm-entr .d-bip b{font-size:54px;font-weight:400;color:#F8C838;text-shadow:2px 2px 0 #141C38}
.entr-scene.danse .piste{position:relative;flex:1;min-height:0;min-width:0;background:#141C38;touch-action:none;overflow:hidden}
.entr-scene.danse canvas.c-effet{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;pointer-events:none;z-index:1}
.entr-scene.danse .d-dresseur{position:absolute;transform:translate(-50%,-100%);height:40%;image-rendering:pixelated;object-fit:contain;transition:transform .5s,opacity .5s;z-index:1}.entr-scene.danse .d-dresseur.part{transform:translate(90%,-100%);opacity:0}
.entr-scene.danse canvas.c-piste{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;display:block}
.entr-scene.danse .ennemi,.entr-scene.danse .coach{transition:opacity .45s}
.entr-scene.danse .pv-e{position:absolute;left:2%;top:3%;width:46%;font-size:15px;padding:2px 7px;z-index:2}.entr-scene.danse .barre{height:9px}
.entr-scene.danse .pv-e .equipe{float:right;color:#686850}
.entr-scene.danse .txt{font-size:18px;padding:4px 9px}
.entr-scene.danse .quitter{position:absolute;right:6px;top:6px;width:34px;height:34px;padding:0;background:#F8F8E8;border:2px solid #484838;border-radius:7px 3px;color:#383828;font-size:18px;z-index:5}
.entr-scene.danse.fort .monde{animation:entr-secousse .22s}
@media (orientation:landscape){.entr-scene.danse .monde{max-width:50%}}`;

function danse(ouvrirSur = null) {
  preparerScene(); installerStyle("pkm-entr-style", STYLE_ENTR); installerStyle("pkm-danse-style", STYLE_DANSE);
  const acteur = formeStarter() || 25, nomA = PAR_NUM[acteur].nom, attaques = (PAR_NUM[acteur].types || []).map(t => ATTAQUES[t]).find(Boolean) || ["Vive-Attaque", "Éclair", "Charge", "Fatal-Foudre"];
  const v = P.createElement("div"); v.className = "pkm-entr danse-menu"; P.body.appendChild(v);
  const ctx = () => audio();
  const mem = danseMem.lire();
  let chargement = 0, fin = () => {}, verrou = null;
  const chansons = (D.danse || []).filter(c => DANSE_CHANSONS[c.cle]).map(c => ({...c, ...DANSE_CHANSONS[c.cle]}));
  const rang = (ch, d) => (mem.best || {})[`${ch.cle}_${d}`];
  const fermer = () => { chargement++; fin(); try { if (verrou) verrou.release(); } catch (e) {} v.remove(); try { dessinerMuscu(); } catch (e) {} };

  function menu() {
    fin(); v.className = "pkm-entr danse-menu"; mem.niveau = mem.niveau || "Beginner"; mem.vitesse = mem.vitesse || "Normale";
    v.innerHTML = `<div class="d-tete"><img class="d-saut" src="${IMG.anim(acteur)}" ${repli(acteur)} alt=""><div><h3>Danse au doigt</h3><small>${sansVeuve("Pour le plaisir : 1 point par jour pour le premier morceau fini. Sur un vrai tapis de danse, ce sera du vrai sport !")}</small></div></div>
      ${chansons.map(ch => { const r = rang(ch, mem.niveau); return `<button class="d-ch" data-ch="${ch.cle}"><i style="background-image:url('${D.scenes}${ch.decor.image}')"></i><span><b>${ch.titre}</b><small>${sansVeuve(ch.phrase)}</small></span><span class="rg">${r ? danseRang(r) : ""}</span></button>`; }).join("")}
      <div class="d-reg">Difficulté<div class="choix" data-reg="niveau">${DANSE_NIVEAUX.map(([k, n]) => `<button class="${mem.niveau === k ? "on" : ""}" data-v="${k}">${n}</button>`).join("")}</div>
        Vitesse des flèches<div class="choix" data-reg="vitesse">${DANSE_VITESSES.map(([n]) => `<button class="${mem.vitesse === n ? "on" : ""}" data-v="${n}">${n}</button>`).join("")}</div></div>
      <button class="sec" data-cl>Classement</button>
      <button class="sec" data-bip>Régler le son${mem.calage == null ? "" : ` (réglé : ${Math.round(mem.calage * 1000)} ms)`}</button>
      <button class="sec retour">Retour</button>`;
    v.querySelector(".retour").onclick = fermer;
    v.querySelector("[data-bip]").onclick = () => reglerSon(menu);
    v.querySelector("[data-cl]").onclick = () => { fin(); v.innerHTML = `<div class="boite"><h3>Classement</h3><div class="d-zone"></div></div><button class="sec retour">Retour</button>`;
      v.querySelector(".retour").onclick = menu; dessinerClassement(v.querySelector(".d-zone"), chansons[0].cle, mem.niveau); };
    v.querySelectorAll(".choix button").forEach(b => b.onclick = () => { mem[b.parentElement.dataset.reg] = b.dataset.v; danseMem.garder(mem); menu(); });
    v.querySelectorAll("[data-ch]").forEach(b => b.onclick = () => { const ch = chansons.find(x => x.cle === b.dataset.ch); audio();
      if (mem.calage == null) reglerSon(() => preparer(ch), true); else preparer(ch); });
  }

  // Le classement d'un morceau dans une difficulté : le meilleur score de chacun (millièmes), le mien en direct. Les scores des autres arrivent à l'actualisation.
  function dessinerClassement(zone, cle, diff) {
    const k = `${cle}_${diff}`, moi = (D.joueurs || []).find(j => j.moi), s = (((moi || {}).danse || {})[k] || 0) / 1000, mien = Math.max(s, (mem.best || {})[k] || 0);
    const lignes = (D.joueurs || []).filter(j => !j.moi && (j.danse || {})[k]).map(j => ({nom: j.nom, s: j.danse[k] / 1000}));
    if (mien) lignes.push({nom: (moi && moi.nom) || "Toi", s: mien, toi: true});
    lignes.sort((a, b) => b.s - a.s || !!b.toi - !!a.toi);
    let place = 0;
    const rangees = lignes.map((l, i) => { if (!i || l.s < lignes[i - 1].s) place = i + 1;
      return `<div class="${l.toi ? "toi" : ""}"><span class="n">${place}.</span><span>${l.nom}</span><span>${String(Math.round(l.s * 1000) / 10).replace(".", ",")} %</span><span class="r">${danseRang(l.s)}</span></div>`; }).join("");
    zone.innerHTML = `<div class="choix" data-q="cle">${chansons.map(c => `<button class="${c.cle === cle ? "on" : ""}" data-v="${c.cle}">${c.court}</button>`).join("")}</div>
      <div class="choix" style="margin-top:4px" data-q="diff">${DANSE_NIVEAUX.map(([d, n]) => `<button class="${d === diff ? "on" : ""}" data-v="${d}">${n}</button>`).join("")}</div>
      ${rangees ? `<div class="d-classe">${rangees}</div>` : `<div class="d-vide">Personne n'a encore de score ici. À toi !</div>`}`;
    zone.querySelectorAll("button").forEach(b => b.onclick = () => dessinerClassement(zone, b.parentElement.dataset.q === "cle" ? b.dataset.v : cle, b.parentElement.dataset.q === "diff" ? b.dataset.v : diff));
  }

  // Le réglage du son : un bip régulier, sans rien à regarder, et on touche l'écran dessus. L'écart moyen dit tout : retard du son du téléphone (énorme en Bluetooth), de l'écran tactile, et le sien.
  function reglerSon(suite, premiereFois = false) {
    fin(); v.className = "pkm-entr danse-menu"; const N = 16, IGNORE = 4, ECART = .6;
    const accueil = () => { v.innerHTML = `<div class="boite"><h3>Régler le son</h3><p>${sansVeuve(`Chaque téléphone a un petit retard de son. Pour que les flèches tombent juste, touche l'écran <b>en même temps que le bip</b>, ${N} fois, en écoutant plutôt qu'en regardant.`)}</p></div>
        <button class="go" data-go>C'est parti</button>${premiereFois ? `<button class="sec" data-passe>Plus tard</button>` : ""}<button class="sec retour">Retour</button>`;
      v.querySelector("[data-go]").onclick = lancer; v.querySelector(".retour").onclick = menu;
      const pa = v.querySelector("[data-passe]"); if (pa) pa.onclick = () => { const a = ctx(); mem.calage = (a && (a.outputLatency || a.baseLatency)) || .05; danseMem.garder(mem); suite(); }; };
    const lancer = () => {
      const a = ctx(); if (!a) return;
      v.innerHTML = `<div class="d-bip"><img src="${IMG.grand(acteur)}" alt=""><b>0 / ${N}</b><span>Touche l'écran sur chaque bip</span></div><button class="sec retour">Annuler</button>`;
      const zone = v.querySelector(".d-bip"), img = zone.querySelector("img"), cpt = zone.querySelector("b"), debut = a.currentTime + 1;
      v.querySelector(".retour").onclick = accueil;
      for (let k = 0; k < N; k++) { const o = a.createOscillator(), g = a.createGain(), t = debut + k * ECART; o.type = "square"; o.frequency.value = k % 4 ? 880 : 1320;
        g.gain.setValueAtTime(.16, t); g.gain.exponentialRampToValueAtTime(.001, t + .07); o.connect(g).connect(a.destination); o.start(t); o.stop(t + .08); }
      const ecarts = []; let touches = 0;
      zone.onpointerdown = e => { e.preventDefault(); const t = a.currentTime - Math.max(PW.performance.now() - e.timeStamp, 0) / 1000, k = Math.round((t - debut) / ECART);
        touches++; cpt.textContent = `${Math.min(touches, N)} / ${N}`; img.classList.add("tape"); setTimeout(() => img.classList.remove("tape"), 70);
        if (k >= IGNORE && k < N) ecarts.push(t - (debut + k * ECART)); };
      const id = setTimeout(() => {
        ecarts.sort((x, y) => x - y);
        if (ecarts.length < 6) { v.innerHTML = `<div class="boite"><h3>Pas assez de touches</h3><p>${sansVeuve("Essaie de toucher à chaque bip, sans t'arrêter.")}</p></div><button class="go" data-go>Recommencer</button><button class="sec retour">Retour</button>`; v.querySelector("[data-go]").onclick = lancer; v.querySelector(".retour").onclick = accueil; return; }
        const med = ecarts[ecarts.length >> 1], disp = ecarts[ecarts.length * 3 >> 2] - ecarts[ecarts.length >> 2], regulier = disp < .09;
        mem.calage = Math.max(-.1, Math.min(med, .6)); danseMem.garder(mem);
        v.innerHTML = `<div class="boite"><h3>Son réglé</h3><p>${sansVeuve(`Le retard de ton téléphone : <b>${Math.round(mem.calage * 1000)} ms</b>. ${regulier ? "Tes touches étaient bien régulières." : "Tes touches étaient un peu irrégulières : tu peux recommencer si les flèches semblent décalées."}`)}</p><small>${sansVeuve("À refaire si tu changes de casque ou d'enceinte, surtout en Bluetooth.")}</small></div>
          <button class="go" data-go>Continuer</button><button class="sec" data-re>Recommencer</button>`;
        v.querySelector("[data-go]").onclick = suite; v.querySelector("[data-re]").onclick = lancer;
      }, (debut - a.currentTime + N * ECART + .4) * 1000);
      fin = () => { clearTimeout(id); fin = () => {}; };
    };
    accueil();
  }

  async function preparer(ch) {
    const jeton = ++chargement; fin(); v.className = "pkm-entr danse-menu";
    v.innerHTML = `<div class="d-bip"><img class="d-saut" src="${IMG.grand(acteur)}" alt=""><span>${ch.titre}…</span></div><button class="sec retour">Retour</button>`;
    v.querySelector(".retour").onclick = () => { chargement++; menu(); };
    const erreur = t => { if (jeton !== chargement) return; v.innerHTML = `<div class="boite"><h3>Oups</h3><p>${sansVeuve(t)}</p></div><button class="sec retour">Retour</button>`; v.querySelector(".retour").onclick = menu; };
    try {
      const a = ctx();
      if (!danseSons[ch.cle]) {
        const lecteur = [...P.querySelectorAll(".st-key-danse audio")][(D.danse || []).findIndex(c => c.cle === ch.cle)];
        if (!lecteur || !(lecteur.currentSrc || lecteur.src)) return erreur("La musique n'est pas disponible pour le moment. Réessaie dans un instant.");
        const r = await PW.fetch(lecteur.currentSrc || lecteur.src); if (!r.ok) throw new Error("musique");
        const octets = await r.arrayBuffer();
        danseSons[ch.cle] = await new Promise((ok, non) => { const p = a.decodeAudioData(octets, ok, non); if (p && p.catch) p.catch(non); });
      }
      if (jeton !== chargement) return;
      const lu = danseLire(ch.sm), chart = lu.charts.find(c => c.diff === mem.niveau) || lu.charts[0];
      combatDanse(ch, lu, chart, danseSons[ch.cle]);
    } catch (e) { erreur("Ton téléphone n'arrive pas à lire cette musique."); }
  }

  function combatDanse(ch, lu, chart, tampon) {
    const a = ctx(), decor = ch.decor, equipe = ch.equipe.map(x => x[0]), nomE = n => ch.equipe.find(x => x[0] === n)[1], notes = chart.notes.map(n => ({...n, fait: null}));
    const tenues = notes.filter(n => n.finT !== undefined).length, max = notes.length + tenues, duree = (DANSE_VITESSES.find(([n]) => n === mem.vitesse) || DANSE_VITESSES[1])[1];
    const dernier = Math.max(...notes.map(n => n.finT || n.t)), finJeu = Math.min(dernier + 1.8, tampon.duration + .3);
    v.className = "pkm-entr plein";
    v.innerHTML = `<div class="entr-scene danse"><div class="monde" style="background-image:url('${D.scenes}${decor.image}')">
        <img class="ennemi rogne entre" src="${IMG.grand(equipe[0])}" alt="" style="left:${decor.e[0]}%;top:${decor.e[1]}%;width:${decor.te}%">
        ${ch.image ? `<img class="d-dresseur" src="${ch.image}" alt="" style="left:${decor.e[0]}%;top:${decor.e[1]}%">` : `<canvas class="d-dresseur" style="left:${decor.e[0]}%;top:${decor.e[1]}%"></canvas>`}
        <img class="coach rogne" src="${D.images}/pokemon/back/${acteur}.png" alt="" style="left:${decor.c[0]}%;top:${decor.c[1]}%;width:${decor.tc * .72}%">
        <div class="pv-e"><span class="equipe"></span><span class="nom-e"></span><div class="barre"><i></i></div></div><canvas class="c-effet"></canvas><div class="eclair"></div><div class="txt"></div></div>
      <div class="piste"><canvas class="c-piste"></canvas><button class="quitter retour">✕</button></div></div>`;
    const S = v.querySelector(".entr-scene"), E = S.querySelector(".ennemi"), C = S.querySelector(".coach"), txt = S.querySelector(".txt"), barre = S.querySelector(".barre i"), eclair = S.querySelector(".eclair"), piste = S.querySelector(".piste"), toile = S.querySelector(".c-piste"), c = toile.getContext("2d");
    rognerImages(S);
    const R0 = 4;  // le dresseur parle, envoie son Pokémon, et la musique part
    const Dr = S.querySelector(".d-dresseur"), M = S.querySelector(".monde"), te = S.querySelector(".c-effet"), effet = danseEffet(ch.effet, te);
    const rde = () => { const r = M.getBoundingClientRect(); te.width = Math.round(r.width / 2); te.height = Math.round(r.height / 2); }; rde();
    if (!ch.image) championAnime(Dr, ch.sprite, true);
    const src = a.createBufferSource(); src.buffer = tampon; src.connect(a.destination);
    const debut = a.currentTime + R0; src.start(debut);
    const temps = () => a.currentTime - debut - (mem.calage || 0);
    const J = {points: 0, combo: 0, meilleur: 0, compte: {Parfait: 0, Bien: 0, Juste: 0, "Raté": 0}, ecarts: [], rangE: 0, attaque: 0, mot: null, parts: [], eclats: [0, 0, 0, 0]};
    const tenu = [0, 0, 0, 0], doigts = new Map(), actives = [];
    let finie = false, premiere = 0, parole = 0, attaqueFin = 0;
    const part = DANSE_VICTOIRE * max / equipe.length;
    const dire = (t, ms = 1300) => { parole = performance.now() + ms; txt.textContent = sansVeuve(t); };
    const peindre = () => { const r = J.rangE < equipe.length ? 1 - (J.points - J.rangE * part) / part : 0, p = Math.max(r * 100, 0); barre.style.width = `${p}%`; barre.className = p < 25 ? "bas" : p < 55 ? "moyen" : "";
      S.querySelector(".nom-e").textContent = J.rangE < equipe.length ? nomE(equipe[J.rangE]) : "K.O. !"; S.querySelector(".equipe").textContent = `${Math.min(J.rangE + 1, equipe.length)}/${equipe.length}`; };
    const crier = n => { try { const x = new PW.Audio(CRI(n)); x.volume = .3; x.play().catch(() => {}); } catch (e) {} };
    const flash = () => { eclair.classList.remove("on"); void eclair.offsetWidth; eclair.classList.add("on"); S.classList.remove("fort"); void S.offsetWidth; S.classList.add("fort"); };
    dire(`${ch.qui} : ${ch.debut}`, 2200); peindre();
    setTimeout(() => { if (finie) return; Dr.classList.add("part"); E.classList.remove("entre"); dire(`${ch.qui} envoie ${nomE(equipe[0])} !`, 1500); crier(equipe[0]); }, 2200);
    try { PAGE_HAUTE().navigator.wakeLock.request("screen").then(l => { verrou = l; }).catch(() => {}); } catch (e) {}

    const gagne = pts => {
      J.points += pts;
      while (J.rangE < equipe.length && J.points >= (J.rangE + 1) * part) {
        const parti = equipe[J.rangE++]; E.classList.add("ko"); flash(); vibre(60); crier(parti);
        if (J.rangE === equipe.length) { Dr.classList.remove("part"); dire(`${ch.qui} : ${ch.fin}`, 3500); [[76, 0], [79, .12], [84, .24], [88, .36]].forEach(([k, t]) => ton(NOTE(k), t, .2, {type: "square", vol: .06})); }
        else { const n = equipe[J.rangE]; dire(`${nomE(parti)} est K.O. !`, 1000);
          setTimeout(() => { if (finie) return; rogne(IMG.grand(n)).then(([s]) => { E.src = s; }); E.classList.remove("ko"); E.classList.add("entre"); requestAnimationFrame(() => requestAnimationFrame(() => E.classList.remove("entre"))); dire(`${ch.qui} envoie ${nomE(n)} !`, 1200); crier(n); }, 800); }
      }
      peindre();
    };
    const etoiles = (col, coul, nb) => { for (let i = 0; i < nb && J.parts.length < 40; i++) J.parts.push({col, x: (Math.random() - .5) * 18, y: 0, vx: (Math.random() - .5) * 200, vy: -80 - Math.random() * 220, vie: 1, coul}); };
    const appui = (col, t) => {
      J.eclats[col] = 1;
      const n = notes.find(x => x.col === col && !x.fait && Math.abs(x.t - t) <= DANSE_FENETRES[2][1]);
      if (!n) return;
      const ec = t - n.t, f = DANSE_FENETRES.find(x => Math.abs(ec) <= x[1]);
      n.fait = f[0]; J.compte[f[0]]++; J.ecarts.push(ec); J.combo++; J.meilleur = Math.max(J.meilleur, J.combo); J.mot = [f[0], f[3], performance.now()];
      etoiles(col, f[3], f[0] === "Parfait" ? 7 : 4); vibre(8);
      if (n.finT !== undefined) { n.tient = true; actives.push(n); }
      C.classList.add("attaque"); attaqueFin = performance.now() + 110;
      if (J.rangE < equipe.length) { E.classList.add("touche"); setTimeout(() => E.classList.remove("touche"), 90); }
      if (J.combo % 25 === 0) { flash(); dire(J.combo % 50 ? `${nomA} utilise ${attaques[J.attaque++ % attaques.length]} !` : `Coup critique ! ${J.combo} d'affilée !`); }
      gagne(f[2]);
    };
    const redim = () => { const r = piste.getBoundingClientRect(), d = Math.min(PW.devicePixelRatio || 1, 2); toile.width = Math.round(r.width * d); toile.height = Math.round(r.height * d); return d; };
    let dpr = redim(); const surRedim = () => { dpr = redim(); rde(); }; PW.addEventListener("resize", surRedim);
    const instant = e => a.currentTime - Math.max(PW.performance.now() - e.timeStamp, 0) / 1000 - debut - (mem.calage || 0);
    piste.onpointerdown = e => { if (e.target.closest(".quitter")) return; e.preventDefault(); const r = piste.getBoundingClientRect(), col = Math.max(0, Math.min(3, Math.floor((e.clientX - r.left) / r.width * 4)));
      doigts.set(e.pointerId, col); tenu[col]++; try { piste.setPointerCapture(e.pointerId); } catch (x) {} appui(col, instant(e)); };
    const lache = e => { if (!doigts.has(e.pointerId)) return; tenu[doigts.get(e.pointerId)]--; doigts.delete(e.pointerId); };
    piste.onpointerup = lache; piste.onpointercancel = lache; piste.oncontextmenu = e => e.preventDefault();
    const dehors = () => { if (P.visibilityState !== "visible") { arreter(); menu(); } };
    P.addEventListener("visibilitychange", dehors);
    const arreter = () => { if (finie) return; finie = true; try { src.stop(); } catch (e) {} PW.removeEventListener("resize", surRedim); P.removeEventListener("visibilitychange", dehors); fin = () => {}; };
    fin = arreter;
    S.querySelector(".quitter").onclick = e => { e.stopPropagation(); arreter(); menu(); };

    const flecheCol = (W, col) => (col + .5) * W / 4;
    let avant = performance.now();
    const image = () => {
      if (finie) return;
      const W = toile.width / dpr, H = toile.height / dpr, t = temps(), beat = lu.beatDe(t), pas = W / 4, tp = Math.min(pas * .88, 120), ry = H - 64 - tp / 2 - 4, now = performance.now(), dt = Math.min((now - avant) / 1000, .1); avant = now;
      effet(dt);
      const parBeat = ry / duree * 60 / lu.bpmMax, frac = beat - Math.floor(beat), bat = t > -1 ? Math.max(0, 1 - frac * 3) : 0;
      if (attaqueFin && now > attaqueFin) { C.classList.remove("attaque"); attaqueFin = 0; }
      if (parole && now > parole) { parole = 0; txt.textContent = sansVeuve(J.rangE < equipe.length ? `Que doit faire ${nomA} ?` : `${nomA} danse de joie !`); }
      const saut = Math.round(bat * 4) * 2; C.style.translate = `0 ${-saut}px`; E.style.translate = `0 ${saut ? -2 : 0}px`;
      for (let i = premiere; i < notes.length; i++) { const n = notes[i]; if (n.t > t + .2) break;
        if (!n.fait && t - n.t > DANSE_FENETRES[2][1]) { n.fait = "Raté"; J.compte["Raté"]++; J.combo = 0; J.mot = ["Raté", "#B8B8B8", now]; } }
      while (premiere < notes.length && notes[premiere].fait && (notes[premiere].finT === undefined || notes[premiere].finT < t - .3 || notes[premiere].fait === "Raté") && notes[premiere].t < t - .3) premiere++;
      for (let i = actives.length - 1; i >= 0; i--) { const n = actives[i];
        if (!tenu[n.col]) { n.lache = n.lache === undefined ? t : n.lache; if (t - n.lache > .15) { n.tient = false; n.perdue = true; actives.splice(i, 1); J.mot = ["Lâché !", "#B8B8B8", now]; continue; } } else n.lache = undefined;
        if (t >= n.finT) { n.tient = false; n.gardee = true; actives.splice(i, 1); etoiles(n.col, "#F8C838", 8); J.mot = ["Tenu !", "#F8C838", now]; gagne(1); } }
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.imageSmoothingEnabled = false; c.clearRect(0, 0, W, H);
      for (let i = 1; i < 4; i++) { c.fillStyle = "rgba(255,255,255,.06)"; c.fillRect(i * pas - 1, 0, 2, H); }
      for (let col = 0; col < 4; col++) { const x = flecheCol(W, col), e = J.eclats[col], px = x - tp / 2, py = ry - tp / 2;
        c.fillStyle = tenu[col] ? "#40A8F8" : "#22315A"; c.fillRect(px, py, tp, tp); c.strokeStyle = e > .1 ? "#F8C838" : "#8FA0C4"; c.lineWidth = 3; c.strokeRect(px + 1.5, py + 1.5, tp - 3, tp - 3);
        if (e > .02) { c.fillStyle = `rgba(255,255,255,${e * .13})`; c.fillRect(col * pas + 2, 0, pas - 4, ry); }
        c.save(); c.translate(x, ry); c.rotate([-Math.PI / 2, Math.PI, 0, Math.PI / 2][col]); const k = tp * (.68 + bat * .05); c.globalAlpha = .55 + bat * .35; c.drawImage(danseFleche("#F8F8E8", "#FFFFFF"), -k / 2, -k / 2, k, k); c.restore();
        J.eclats[col] = Math.max(0, e - dt * 6); }
      const coul = n => n.part === 0 ? ["#D83830", "#F87868"] : n.part === .5 ? ["#2878D8", "#70B8F8"] : ["#30A850", "#70E090"];
      for (let i = premiere; i < notes.length; i++) { const n = notes[i], y = ry - (n.beat - beat) * parBeat; if (y < -tp) break;
        const x = flecheCol(W, n.col), tn = tp * .78, finY = n.finB !== undefined ? ry - (n.finB - beat) * parBeat : null;
        if (n.finB !== undefined && !n.gardee && !n.perdue && n.fait !== "Raté") { const depart = n.tient ? ry : Math.min(y, ry + tp); c.fillStyle = n.tient ? "#F8C838" : "rgba(143,160,196,.75)"; c.fillRect(x - tn * .24, Math.max(finY, 0), tn * .48, Math.max(depart - Math.max(finY, 0), 0)); c.fillStyle = "#141C38"; c.fillRect(x - tn * .24, Math.max(finY, 0), tn * .48, 3); }
        if (n.fait) continue;
        const cc = coul(n); c.save(); c.translate(x, Math.round(y)); c.rotate([-Math.PI / 2, Math.PI, 0, Math.PI / 2][n.col]); c.drawImage(danseFleche(cc[0], cc[1]), -tn / 2, -tn / 2, tn, tn); c.restore(); }
      J.parts = J.parts.filter(p => { p.vie -= dt * 1.8; p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.vie <= 0) return false; c.fillStyle = p.coul; c.globalAlpha = Math.min(p.vie * 2, 1); const s = p.vie > .5 ? 6 : 4; c.fillRect(flecheCol(W, p.col) + p.x - s / 2, ry + p.y - s / 2, s, s); c.globalAlpha = 1; return true; });
      c.textAlign = "center"; c.textBaseline = "middle";
      const ecrit = (s, x, y, taille, couleur) => { c.font = `${taille}px 'Jersey 15',monospace`; c.fillStyle = "#141C38"; c.fillText(s, x + 2, y + 2); c.fillStyle = couleur; c.fillText(s, x, y); };
      if (t < 0) ecrit(String(Math.ceil(-t)), W / 2, ry * .45, 96, "#FFFFFF");
      if (J.mot && now - J.mot[2] < 480) ecrit(J.mot[0], W / 2, ry * .55, 40, J.mot[1]);
      if (J.combo > 2) { ecrit(String(J.combo), W / 2, ry * .32, 56 + bat * 5, J.combo >= 25 ? "#F8C838" : "#FFFFFF"); ecrit("d'affilée", W / 2, ry * .32 + 34, 20, "#C9D3EA"); }
      if (t > finJeu) { arreter(); return resultat(ch, chart, J, max, equipe); }
      PW.requestAnimationFrame(image);
    };
    PW.requestAnimationFrame(image);
  }

  function resultat(ch, chart, J, max, equipe) {
    const pct = max ? J.points / max : 0, r = danseRang(pct), gagne = J.rangE >= equipe.length, cle = `${ch.cle}_${chart.diff}`;
    // Le morceau est fini : le point du jour (le premier seulement), et le score pour le classement quand il bat le meilleur connu (ce téléphone ou le serveur)
    mem.best = mem.best || {}; const score = Math.round(pct * 1000), servi = (((D.joueurs || []).find(j => j.moi) || {}).danse || {})[cle] || 0;
    const record = pct > Math.max(mem.best[cle] || 0, servi / 1000), maintenant = Date.now(), premierDuJour = !TEST && !gestesAuj().danse;
    if (pct > (mem.best[cle] || 0)) mem.best[cle] = pct;
    danseMem.garder(mem);
    if (premierDuJour) memoriser(`${TEST ? "test#" : D.prefixe}geste-danse_1_${maintenant}`);
    if (!TEST && record && score > 0) memoriser(`${D.prefixe}danse-${ch.cle}-${chart.diff}_${score}_${maintenant}`);
    if (gagne) EPIQUE.fanfare();
    const moy = J.ecarts.length ? J.ecarts.reduce((x, y) => x + y, 0) / J.ecarts.length : 0, affiner = J.ecarts.length >= 20 && Math.abs(moy) > .025;
    v.className = "pkm-entr danse-menu";
    v.innerHTML = `<div class="d-tete"><img class="d-saut" src="${IMG.anim(gagne ? acteur : equipe[Math.min(J.rangE, equipe.length - 1)])}" ${repli(gagne ? acteur : equipe[Math.min(J.rangE, equipe.length - 1)])} alt=""><div><h3>${gagne ? "Victoire !" : "Défaite…"}</h3><small>${ch.titre} · ${ch.qui} : ${gagne ? ch.fin : ch.perdu}</small></div></div>
      <div class="boite"><div class="d-gros">${r}</div><div class="d-lignes"><span>Score${record ? " (record !)" : ""}</span><span>${Math.round(pct * 100)} %</span>${Object.entries(J.compte).map(([k, n]) => `<span>${k}</span><span>${n}</span>`).join("")}<span>Meilleure suite</span><span>${J.meilleur}</span>${premierDuJour ? "<span>Point du jour</span><span>+1</span>" : ""}</div></div>
      <div class="boite"><h3>Classement</h3><div class="d-zone"></div></div>
      ${affiner ? `<button class="sec" data-affine>Tes touches arrivent ${Math.round(Math.abs(moy) * 1000)} ms ${moy > 0 ? "en retard" : "en avance"} : corriger</button>` : ""}
      <button class="go" data-re>Rejouer</button><button class="sec retour">Autre morceau</button>
      <div class="boite d-promo">${sansVeuve("Au doigt, c'est pour rire. <b>Sur un vrai tapis de danse USB</b>, le même jeu se jouera avec les pieds, avec bien plus de musiques, et là, tes minutes de sport compteront pour de bon. Bientôt !")}</div>
      <div class="d-credit">Pas : Starmen91 · Musiques : Game Freak</div>`;
    v.querySelector("[data-re]").onclick = () => preparer(ch); v.querySelector(".retour").onclick = menu;
    dessinerClassement(v.querySelector(".d-zone"), ch.cle, chart.diff);
    const af = v.querySelector("[data-affine]"); if (af) af.onclick = () => { mem.calage = Math.max(-.1, Math.min((mem.calage || 0) + moy, .6)); danseMem.garder(mem); af.textContent = "Corrigé !"; af.disabled = true; };
  }
  menu();
  if (ouvrirSur) preparer(chansons.find(x => x.cle === ouvrirSur));
}
