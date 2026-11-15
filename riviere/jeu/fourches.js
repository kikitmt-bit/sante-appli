/* ============ les fourches (15/11, étape 7 du plan) : la voie spectaculaire si on force ============ */
// La piste se sépare en deux voies qui se rejoignent (moteur/piste.js : une pièce {"fourche", "calme", "force"}). On ne dirige pas : c'est l'effort
// qui choisit. Une trentaine de secondes avant la séparation, « FOURCHE ! » et une jauge (jeu/effort.js, la même que pour Ronflex) : ramer plus fort
// que SA croisière la remplit ; pleine, on prend la voie « force » (les rapides, la chute…) ; sinon la voie calme, sans rien perdre : rien ne
// ralentit jamais le joueur, et les deux voies comptent exactement les mêmes vrais mètres (un seul record par circuit).
// Le choix est arrêté 26 m avant la séparation (la caméra regarde déjà plus loin) et oublié 45 m après la jonction.
// Dans une fourche du niveau : "effort": {"seuil": 1.08, "duree": 5}, "annonce": "LES RAPIDES". Pour regarder sans ramer : ?voie=1 (toujours la
// voie « force »), ?voie=0 (toujours la calme). Avec ?s= ou ?fige=1, rien n'est demandé.
const FOURCHES = {liste: [], boite: null, impose: PARAMS.get("voie"), tour: new Uint8Array(PISTE.NF)};   // tour : les voies prises pendant ce tour (gardées avec le fantôme)
const DECIDE = 26;
function construireFourches() {
  FOURCHES.liste = PISTE.voies.map((v, nf) => ({nf, v, etat: "loin", demande: null}));
  if (!FOURCHES.liste.length) return;
  if (FOURCHES.impose === "1") VOIES.prise.fill(1);
  const b = FOURCHES.boite = document.createElement("div"); b.className = "hud"; b.id = "hFourche"; b.hidden = true;
  b.innerHTML = '<small id="fTitre"></small><span id="fTexte"></span><i><u id="fJauge"></u></i>';
  document.body.appendChild(b);
  const st = document.createElement("style");
  st.textContent = "#hFourche{left:50%;top:22vh;transform:translateX(-50%);font-size:min(5.4vh,4.2vw);text-align:center;white-space:nowrap}"
    + "#hFourche i{display:block;margin:.25em auto 0;width:9em;height:.42em;border:.08em solid #1B2440;background:#F8F8E8;border-radius:.2em;overflow:hidden}"
    + "#hFourche u{display:block;height:100%;width:0;background:#40A8F8}#hFourche.plein u{background:#F8C838}";
  document.head.appendChild(st);
}
const nomVoie = v => String(v.annonce || "la voie rapide");
function prendreVoie(f) {
  VOIES.prise[f.nf] = 1; FOURCHES.tour[f.nf] = 1; f.etat = "force"; f.demande = null; finirEffort();
  annoncer(nomVoie(f.v).toUpperCase() + " !"); sonTinte([523, 659, 784]); filmEvenement({type: "fourche", nf: f.nf});
}
function fourchesDepart() {   // une nouvelle séance : aucune voie prise
  for (const f of FOURCHES.liste) { if (f.demande) finirEffort(); f.demande = null; f.etat = "loin"; }
  if (FOURCHES.impose !== "1") VOIES.prise.fill(0);
  FOURCHES.tour.fill(FOURCHES.impose === "1" ? 1 : 0);
}
function fourchesMaj() {
  if (!FOURCHES.liste.length) return;
  const jeu = S.mode && !S.pause && !PARAMS.has("s") && !S.fige && FOURCHES.impose === null, zone = Math.max(80, 28 * (S.croisiere || 3.6));
  let montree = null;
  for (const f of FOURCHES.liste) {
    const v = f.v, devant = ecart(v.a, S.s), apres = ecart(S.s, v.b);
    if (f.etat === "loin") {
      if (jeu && devant > DECIDE && devant < zone) {
        if (!f.demande && !EFFORT.demande) { const e = v.effort || {}; f.demande = demanderEffort({seuil: e.seuil || 1.08, duree: e.duree || 5, reussi: () => prendreVoie(f)}); annoncer("FOURCHE !"); }
        if (f.demande) montree = f;
      } else if (devant <= DECIDE && devant > -8) {   // trop tard pour forcer : la voie calme, sans rien perdre
        if (f.demande) { finirEffort(); f.demande = null; }
        f.etat = "calme";
      } else if (f.demande) { finirEffort(); f.demande = null; }
    } else if (apres > 45 || devant > zone + 20) {   // loin derrière : au tour suivant, tout recommence
      f.etat = "loin"; if (FOURCHES.impose !== "1") VOIES.prise[f.nf] = 0;
    }
    if (f.demande && !jeu) { finirEffort(); f.demande = null; }
  }
  const b = FOURCHES.boite; b.hidden = !montree; if (!montree) return;
  const d = montree.demande, force = EFFORT.ratio >= d.seuil;
  $("fTitre").textContent = (DISCIPLINE === "eau" ? "LA RIVIÈRE" : "LA ROUTE") + " SE SÉPARE DANS " + Math.max(0, Math.round((ecart(montree.v.a, S.s) - DECIDE) / 10) * 10) + " M";
  $("fTexte").textContent = force ? "Continue : " + nomVoie(montree.v).toLowerCase() + " !" : "Accélère pour prendre " + nomVoie(montree.v).toLowerCase();
  $("fJauge").style.width = Math.round(d.jauge * 100) + "%"; b.classList.toggle("plein", d.jauge >= 1);
}
