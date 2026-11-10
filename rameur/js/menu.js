function iconeProg() {  // le portrait de ton Pokémon, posé sur le plan
  const c = $("progMoi"); if (!c) return; const x = c.getContext("2d"); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 32, 32);
  const P = NAGEURS[choix]; animsDe(P.n).then(a => { const A = a.Idle || a.Walk; return chargerImg(`${PMD}${P.n}/${A.fichier}-Anim.png`).then(img => {
    const k = Math.min(32 / A.fw, 32 / A.fh); x.clearRect(0, 0, 32, 32); x.drawImage(img, 0, 0, A.fw, A.fh, (32 - A.fw * k) / 2, (32 - A.fh * k) / 2, A.fw * k, A.fh * k); }); }).catch(() => {});
}
function boutonsFantomes() {  // au menu : contre quel fantôme rouler
  const r = recordTous(), L = [["record", "Mon meilleur tour" + (r ? " · " + fmtT(r.temps) : " (pas encore)")], ["seance", "Mon meilleur tour de la séance"], ["aucun", "Aucun"]];
  $("fantomes").innerHTML = L.map(([k, t]) => `<button data-f="${k}" class="${FANTOME.mode === k ? "on" : ""}" aria-pressed="${FANTOME.mode === k}">${t}</button>`).join("");
  $("fantomes").querySelectorAll("button").forEach(b => b.onclick = () => { FANTOME.mode = b.dataset.f; try { localStorage.setItem("circuit_fantome", FANTOME.mode); } catch (e) {} boutonsFantomes(); });
}

/* ============ le menu ============ */
// les kilomètres de ton compagnon : ceux du serveur (toutes tes séances au rameur), plus les séances finies ici et pas encore comptées par le serveur
const KM_LOCAUX = "circuit_km_en_attente";  // [{nb: séances connues du serveur à ce moment, m: mètres}]
function kmTotal() { const srv = ((D.progression || {}).metres || 0), nb = (D.progression || {}).nb || 0; let loc = [];
  try { loc = (JSON.parse(localStorage.getItem(KM_LOCAUX)) || []).filter(e => e.nb >= nb); } catch (e) {} return (srv + loc.reduce((t, e) => t + e.m, 0)) / 1000; }
function retenirKm() { try { const nb = (D.progression || {}).nb || 0, L = (JSON.parse(localStorage.getItem(KM_LOCAUX)) || []).filter(e => e.nb >= nb); localStorage.setItem(KM_LOCAUX, JSON.stringify(L)); } catch (e) {} }
const debloque = i => kmTotal() >= NAGEURS[i].km;
let choix = 0; try { choix = +localStorage.getItem("circuit_forme"); } catch (e) {}
if (!(choix >= 0 && choix < NAGEURS.length) || !debloque(choix)) choix = NAGEURS.map((_, i) => i).filter(debloque).pop() || 0;
function dessinerForme(c, i, silhouette) {  // le Pokémon en pixels dans une petite toile (sa silhouette s'il n'est pas encore débloqué)
  const x = c.getContext("2d"), W = c.width, P = NAGEURS[i]; x.imageSmoothingEnabled = false;
  animsDe(P.n).then(a => { const A = a.Idle || a.Walk; return chargerImg(`${PMD}${P.n}/${A.fichier}-Anim.png`).then(img => {
    const k = Math.floor(Math.min(W / A.fw, W / A.fh) * 10) / 10; x.clearRect(0, 0, W, W); x.drawImage(img, 0, 0, A.fw, A.fh, (W - A.fw * k) / 2, (W - A.fh * k) / 2, A.fw * k, A.fh * k);
    if (silhouette) { x.globalCompositeOperation = "source-in"; x.fillStyle = "#30304A"; x.fillRect(0, 0, W, W); x.globalCompositeOperation = "source-over"; } }); }).catch(() => {});
}
function boutonsNageurs() {
  const km = kmTotal();
  $("nageurs").innerHTML = NAGEURS.map((n, i) => { const ok = km >= n.km;
    return `<button data-i="${i}" class="${i === choix ? "on" : ""}" aria-pressed="${i === choix}" ${ok ? "" : "disabled"}><canvas width="64" height="64"></canvas><span>${ok ? n.nom : "???"}</span><small>${ok ? (i === choix ? "Choisi" : "Débloqué") : "à " + n.km + " km"}</small></button>`; }).join("");
  $("nageurs").querySelectorAll("button").forEach(b => { const i = +b.dataset.i; dessinerForme(b.querySelector("canvas"), i, !debloque(i)); if (debloque(i)) b.onclick = () => choisir(i); });
  // le compagnon : ses kilomètres et la prochaine évolution
  const actuel = NAGEURS.map((_, i) => i).filter(debloque).pop() || 0, suivant = NAGEURS[actuel + 1];
  $("mNom").textContent = NAGEURS[actuel].nom; dessinerForme($("mPortrait"), actuel, false);
  $("mKm").textContent = km.toFixed(1).replace(".", ",") + " km ramés";
  if (suivant) { const k0 = NAGEURS[actuel].km; $("mBarre").style.width = clamp((km - k0) / (suivant.km - k0) * 100, 0, 100).toFixed(1) + "%";
    $("mProchain").textContent = `Évolue dans ${(suivant.km - km).toFixed(1).replace(".", ",")} km`; }
  else { $("mBarre").style.width = "100%"; $("mProchain").textContent = "Forme finale atteinte !"; }
}
function choisir(i) { if (!debloque(i)) return; choix = i; try { localStorage.setItem("circuit_forme", i); } catch (e) {} boutonsNageurs(); construire(choix); construireFantome(choix); iconeProg(); }
function evolutionDe(metres) {  // en fin de séance : la séance compte tout de suite pour l'évolution ; si un seuil est passé, on l'annonce
  if (!(metres > 0)) return ""; const avant = kmTotal();
  try { const L = JSON.parse(localStorage.getItem(KM_LOCAUX)) || []; L.push({nb: (D.progression || {}).nb || 0, m: Math.round(metres)}); localStorage.setItem(KM_LOCAUX, JSON.stringify(L)); } catch (e) {}
  const apres = kmTotal(), nv = NAGEURS.findIndex(n => avant < n.km && apres >= n.km);
  if (nv < 0) return `<p class="sous">${NAGEURS[choix].nom} a maintenant ${apres.toFixed(1).replace(".", ",")} km au compteur.</p>`;
  setTimeout(() => { const c = $("evoPortrait"); if (c) dessinerForme(c, nv, false); }, 60);
  setTimeout(() => { note(523, .15, "square", .05); note(659, .15, "square", .05, .15); note(784, .15, "square", .05, .3); note(1046, .4, "square", .06, .45); }, 300);
  return `<div class="mCompagnon"><canvas id="evoPortrait" width="96" height="96"></canvas><div class="mInfos"><b>Quoi ? ${NAGEURS[nv - 1].nom} évolue !</b><span>Tu peux maintenant nager avec ${NAGEURS[nv].nom}. Choisis-le dans le menu.</span></div></div>`;
}
let essai = false, telOk = false, conn = null, TEL_TXT = "Je cherche ton téléphone…";
function majMenu() {
  const t = $("mTel"); t.textContent = essai ? "Essai sans téléphone" : telOk ? "Téléphone relié ✓" : TEL_TXT; t.className = "pill " + (telOk ? "ok" : essai ? "" : "ko");
  $("bPartir").disabled = !(telOk || essai || SEANCE.etat === "mesure"); $("bEssai").hidden = telOk || essai;
  $("aide").textContent = essai ? "Essai : touche l'écran ou la barre d'espace pour ramer, ou lance Auto." : telOk ? "Téléphone relié ! Installe-toi et pars quand tu es prêt." : "Sur le téléphone : Muscu → Rameur → « Avec la tablette », puis accroche-le sous le siège.";
}

