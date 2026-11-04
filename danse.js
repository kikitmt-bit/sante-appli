// La danse au doigt (04/11, carte blanche de Kiki) : un clin d'œil dans l'onglet Muscu, 4 musiques, pour s'amuser et donner envie d'un vrai tapis. Elle ne rapporte aucun point : le jeu se gagne
// en faisant du sport. Musiques et pas (fichiers StepMania) : dépôt privé, branche « danse », jamais ce dépôt public (danse.py). Inclus dans pokemon_ui.html par ecran_pokemon.py.
// Adversaires et décors : seulement des lieux déjà atteints, comme aux autres combats (le reste du jeu doit rester une surprise).
const DANSE_CHANSONS = {
  zinnia: {titre: "La Danse du Dragon", phrase: "Un vent furieux souffle sur la piste.", types: ["Dragon", "Vol"], decors: ["Route Victoire", "Mont Sélénite", "Route 3", "Route 1"]},
  skull: {titre: "La Bande des Ruelles", phrase: "Ils ont le rythme dans la peau, et aucune manière.", types: ["Poison", "Normal"], decors: ["Céladopole", "Lavanville", "Jadielle"]},
  colress: {titre: "Le Savant Fou", phrase: "Il a tout calculé, sauf toi.", types: ["Électrik", "Acier"], decors: ["Grotte et Centrale", "Safrania", "Carmin-sur-Mer", "Argenta"]},
  red: {titre: "L'Ultime Combat", phrase: "Au sommet, quelqu'un t'attend sans dire un mot.", types: ["Feu", "Combat"], decors: ["Plateau Indigo", "Cramois'Île", "Forêt de Jade", "Bourg Palette"]},
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
.pkm-entr .d-saut{animation:d-saut .5s steps(3) infinite alternate}@keyframes d-saut{to{transform:translateY(-8px)}}
.pkm-entr .d-bip{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center;font-size:24px;touch-action:none;min-height:240px}
.pkm-entr .d-bip img{width:120px;height:120px;object-fit:contain;image-rendering:pixelated;transition:transform .07s}.pkm-entr .d-bip img.tape{transform:translateY(-14px) scale(1.08)}
.pkm-entr .d-bip b{font-size:54px;font-weight:400;color:#F8C838;text-shadow:2px 2px 0 #141C38}
.entr-scene.danse .piste{position:relative;flex:1;min-height:0;min-width:0;background:#141C38;touch-action:none;overflow:hidden}
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
  const atteints = () => LIEUX.slice(0, V.ici + 1).map(l => l.nom.replace(" (retour)", ""));
  const decorDe = ch => { const a = atteints(); const nom = ch.decors.find(d => a.includes(d) && DECORS_COMBAT[d]) || a.slice().reverse().find(d => DECORS_COMBAT[d]) || "Bourg Palette"; return DECORS_COMBAT[nom]; };
  const rang = (ch, d) => (mem.best || {})[`${ch.cle}_${d}`];
  const fermer = () => { chargement++; fin(); try { if (verrou) verrou.release(); } catch (e) {} v.remove(); try { dessinerMuscu(); } catch (e) {} };

  function menu() {
    fin(); v.className = "pkm-entr danse-menu"; mem.niveau = mem.niveau || "Beginner"; mem.vitesse = mem.vitesse || "Normale";
    v.innerHTML = `<div class="d-tete"><img class="d-saut" src="${IMG.anim(acteur)}" ${repli(acteur)} alt=""><div><h3>Danse au doigt</h3><small>${sansVeuve("Pour le plaisir, sans aucun point. Sur un vrai tapis de danse, ce sera du vrai sport !")}</small></div></div>
      ${chansons.map(ch => { const r = rang(ch, mem.niveau); return `<button class="d-ch" data-ch="${ch.cle}"><i style="background-image:url('${D.scenes}${decorDe(ch).image}')"></i><span><b>${ch.titre}</b><small>${sansVeuve(ch.phrase)}</small></span><span class="rg">${r ? danseRang(r) : ""}</span></button>`; }).join("")}
      <div class="d-reg">Difficulté<div class="choix" data-reg="niveau">${DANSE_NIVEAUX.map(([k, n]) => `<button class="${mem.niveau === k ? "on" : ""}" data-v="${k}">${n}</button>`).join("")}</div>
        Vitesse des flèches<div class="choix" data-reg="vitesse">${DANSE_VITESSES.map(([n]) => `<button class="${mem.vitesse === n ? "on" : ""}" data-v="${n}">${n}</button>`).join("")}</div></div>
      <button class="sec" data-bip>Régler le son${mem.calage == null ? "" : ` (réglé : ${Math.round(mem.calage * 1000)} ms)`}</button>
      <button class="sec retour">Retour</button>`;
    v.querySelector(".retour").onclick = fermer;
    v.querySelector("[data-bip]").onclick = () => reglerSon(menu);
    v.querySelectorAll(".choix button").forEach(b => b.onclick = () => { mem[b.parentElement.dataset.reg] = b.dataset.v; danseMem.garder(mem); menu(); });
    v.querySelectorAll("[data-ch]").forEach(b => b.onclick = () => { const ch = chansons.find(x => x.cle === b.dataset.ch); audio();
      if (mem.calage == null) reglerSon(() => preparer(ch), true); else preparer(ch); });
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

  // Les 3 adversaires : de préférence aux types du morceau, toujours des lieux atteints, jamais son starter
  function equipeDe(ch) {
    const lieux = LIEUX.slice(0, V.ici + 1), pool = [...new Set(lieux.flatMap(l => l.pokemon || []))].filter(n => !(G.starter && G.starter.ligne.includes(n)));
    const melange = a => a.map(n => [Math.random(), n]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
    const dansType = melange(pool.filter(n => (PAR_NUM[n].types || []).some(t => ch.types.includes(t)))), autres = melange(pool.filter(n => !dansType.includes(n)));
    const eq = [...dansType, ...autres].slice(0, 3);
    while (eq.length < 3) { const n = adversaireDuLieu(eq[eq.length - 1] || null); eq.push(n); }
    return eq.sort((a, b) => RARES.has(a) - RARES.has(b));  // le plus rare en dernier
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
    const a = ctx(), decor = decorDe(ch), equipe = equipeDe(ch), notes = chart.notes.map(n => ({...n, fait: null}));
    const tenues = notes.filter(n => n.finT !== undefined).length, max = notes.length + tenues, duree = (DANSE_VITESSES.find(([n]) => n === mem.vitesse) || DANSE_VITESSES[1])[1];
    const dernier = Math.max(...notes.map(n => n.finT || n.t)), finJeu = Math.min(dernier + 1.8, tampon.duration + .3);
    v.className = "pkm-entr plein";
    v.innerHTML = `<div class="entr-scene danse"><div class="monde" style="background-image:url('${D.scenes}${decor.image}')">
        <img class="ennemi rogne" src="${IMG.grand(equipe[0])}" alt="" style="left:${decor.e[0]}%;top:${decor.e[1]}%;width:${decor.te}%">
        <img class="coach rogne" src="${D.images}/pokemon/back/${acteur}.png" alt="" style="left:${decor.c[0]}%;top:${decor.c[1]}%;width:${decor.tc * .72}%">
        <div class="pv-e"><span class="equipe"></span><span class="nom-e"></span><div class="barre"><i></i></div></div><div class="eclair"></div><div class="txt"></div></div>
      <div class="piste"><canvas class="c-piste"></canvas><button class="quitter retour">✕</button></div></div>`;
    const S = v.querySelector(".entr-scene"), E = S.querySelector(".ennemi"), C = S.querySelector(".coach"), txt = S.querySelector(".txt"), barre = S.querySelector(".barre i"), eclair = S.querySelector(".eclair"), piste = S.querySelector(".piste"), toile = S.querySelector("canvas"), c = toile.getContext("2d");
    rognerImages(S);
    const R0 = 3;
    const src = a.createBufferSource(); src.buffer = tampon; src.connect(a.destination);
    const debut = a.currentTime + R0; src.start(debut);
    const temps = () => a.currentTime - debut - (mem.calage || 0);
    const J = {points: 0, combo: 0, meilleur: 0, compte: {Parfait: 0, Bien: 0, Juste: 0, "Raté": 0}, ecarts: [], rangE: 0, attaque: 0, mot: null, parts: [], eclats: [0, 0, 0, 0]};
    const tenu = [0, 0, 0, 0], doigts = new Map(), actives = [];
    let finie = false, premiere = 0, parole = 0, attaqueFin = 0;
    const part = DANSE_VICTOIRE * max / equipe.length;
    const dire = (t, ms = 1300) => { parole = performance.now() + ms; txt.textContent = sansVeuve(t); };
    const peindre = () => { const r = J.rangE < equipe.length ? 1 - (J.points - J.rangE * part) / part : 0, p = Math.max(r * 100, 0); barre.style.width = `${p}%`; barre.className = p < 25 ? "bas" : p < 55 ? "moyen" : "";
      S.querySelector(".nom-e").textContent = J.rangE < equipe.length ? PAR_NUM[equipe[J.rangE]].nom : "K.O. !"; S.querySelector(".equipe").textContent = `${Math.min(J.rangE + 1, equipe.length)}/${equipe.length}`; };
    const crier = n => { try { const x = new PW.Audio(CRI(n)); x.volume = .3; x.play().catch(() => {}); } catch (e) {} };
    const flash = () => { eclair.classList.remove("on"); void eclair.offsetWidth; eclair.classList.add("on"); S.classList.remove("fort"); void S.offsetWidth; S.classList.add("fort"); };
    dire(`${ch.titre} : un ${PAR_NUM[equipe[0]].nom} approche !`, 2500); peindre(); setTimeout(() => crier(equipe[0]), 500);
    try { PAGE_HAUTE().navigator.wakeLock.request("screen").then(l => { verrou = l; }).catch(() => {}); } catch (e) {}

    const gagne = pts => {
      J.points += pts;
      while (J.rangE < equipe.length && J.points >= (J.rangE + 1) * part) {
        const parti = equipe[J.rangE++]; E.classList.add("ko"); flash(); vibre(60); crier(parti);
        if (J.rangE === equipe.length) { dire("Victoire ! Finis le morceau pour le panache !", 3000); [[76, 0], [79, .12], [84, .24], [88, .36]].forEach(([k, t]) => ton(NOTE(k), t, .2, {type: "square", vol: .06})); }
        else { const n = equipe[J.rangE]; dire(`${PAR_NUM[parti].nom} est K.O. !`, 1000);
          setTimeout(() => { if (finie) return; rogne(IMG.grand(n)).then(([s]) => { E.src = s; }); E.classList.remove("ko"); E.classList.add("entre"); requestAnimationFrame(() => requestAnimationFrame(() => E.classList.remove("entre"))); dire(`Un ${PAR_NUM[n].nom} prend le relais !`, 1200); crier(n); }, 800); }
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
    let dpr = redim(); const surRedim = () => { dpr = redim(); }; PW.addEventListener("resize", surRedim);
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
    const pct = J.points / max, r = danseRang(pct), gagne = J.rangE >= equipe.length, cle = `${ch.cle}_${chart.diff}`;
    mem.best = mem.best || {}; const record = pct > (mem.best[cle] || 0); if (record) mem.best[cle] = pct; danseMem.garder(mem);
    if (gagne) EPIQUE.fanfare();
    const moy = J.ecarts.length ? J.ecarts.reduce((x, y) => x + y, 0) / J.ecarts.length : 0, affiner = J.ecarts.length >= 20 && Math.abs(moy) > .025;
    v.className = "pkm-entr danse-menu";
    v.innerHTML = `<div class="d-tete"><img class="d-saut" src="${IMG.anim(gagne ? acteur : equipe[Math.min(J.rangE, equipe.length - 1)])}" ${repli(gagne ? acteur : equipe[Math.min(J.rangE, equipe.length - 1)])} alt=""><div><h3>${gagne ? "Victoire !" : `${PAR_NUM[equipe[Math.min(J.rangE, equipe.length - 1)]].nom} s'est enfui…`}</h3><small>${ch.titre}</small></div></div>
      <div class="boite"><div class="d-gros">${r}</div><div class="d-lignes"><span>Score${record ? " (record !)" : ""}</span><span>${Math.round(pct * 100)} %</span>${Object.entries(J.compte).map(([k, n]) => `<span>${k}</span><span>${n}</span>`).join("")}<span>Meilleure suite</span><span>${J.meilleur}</span></div></div>
      ${affiner ? `<button class="sec" data-affine>Tes touches arrivent ${Math.round(Math.abs(moy) * 1000)} ms ${moy > 0 ? "en retard" : "en avance"} : corriger</button>` : ""}
      <button class="go" data-re>Rejouer</button><button class="sec retour">Autre morceau</button>
      <div class="boite d-promo">${sansVeuve("Au doigt, c'est pour rire. <b>Sur un vrai tapis de danse USB</b>, le même jeu se jouera avec les pieds, avec bien plus de musiques, et là, tes minutes de sport compteront pour de bon. Bientôt !")}</div>
      <div class="d-credit">Pas : Starmen91 · Musiques : Game Freak</div>`;
    v.querySelector("[data-re]").onclick = () => preparer(ch); v.querySelector(".retour").onclick = menu;
    const af = v.querySelector("[data-affine]"); if (af) af.onclick = () => { mem.calage = Math.max(-.1, Math.min((mem.calage || 0) + moy, .6)); danseMem.garder(mem); af.textContent = "Corrigé !"; af.disabled = true; };
  }
  menu();
  if (ouvrirSur) preparer(chansons.find(x => x.cle === ouvrirSur));
}
