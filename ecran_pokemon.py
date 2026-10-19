"""Onglet 🎮 Pokémon : chiffres du Pokédex, captures du jour (Poké Balls à ouvrir, avec l'animation) et Pokédex."""
import datetime as dt
import json

import streamlit as st
import streamlit.components.v1 as components

import chiffres
import pokemon
from pokedex import COULEURS_TYPES, JEUX, LEGENDAIRES, POKEMON

PAQUET = "sprites:paquets/{:03d}.json"  # toutes les versions d'un Pokémon (images en base64), branche « sprites »
VIGNETTES = "sprites:paquets/vignettes.json"


def _js(objet):
    return json.dumps(objet, ensure_ascii=False).replace("</", "<\\/")


def _version(c):
    return f"{'✨ Shiny · ' if c['shiny'] else ''}Gén. {c['generation']} · {JEUX.get(c['jeu'], c['jeu'])}"


def afficher(lire, aujourd):
    with st.spinner("Ouverture du Pokédex…"):
        captures, etat = pokemon.charger_jeu(lire, aujourd)
        especes = sorted({c["num"] for c in captures})
        f = lire([VIGNETTES] + [PAQUET.format(n) for n in especes])
    vignettes, paquets = f[VIGNETTES] or {}, {n: f[PAQUET.format(n)] or {} for n in especes}

    # ----- Les chiffres -----
    n_shiny = sum(c["shiny"] for c in captures)
    serie, objectif_serie = etat["serie"], pokemon.REGLAGES["serie_legendaire"]
    st.markdown(f"""<div class="tiles">
<div class="tile"><div class="l">Pokédex</div><div class="v">{len(especes)} / 151</div>
<div class="bar"><div style="width:{len(especes) / 151 * 100:.0f}%"></div></div></div>
<div class="tile"><div class="l">Versions</div><div class="v">{len(captures)} / {pokemon.TOTAL_VERSIONS}</div>
<div class="s">dont {n_shiny} shiny ✨</div></div></div>""", unsafe_allow_html=True)

    # ----- Captures récentes (Poké Balls à ouvrir) -----
    depuis = str(aujourd - dt.timedelta(days=7))
    recentes = [{
        "id": c["id"], "aujourdhui": c["jour"] == str(aujourd), "num": c["num"], "nom": POKEMON[c["num"]]["nom"],
        "types": POKEMON[c["num"]]["types"], "image": paquets[c["num"]].get(c["fichier"], ""),
        "version": _version(c), "shiny": c["shiny"], "nouvelle": c["nouvelle"], "raison": c["raison"],
        "legendaire": c["num"] in LEGENDAIRES,
        "quand": "aujourd'hui" if c["jour"] == str(aujourd) else
                 f"{chiffres.JOURS[dt.date.fromisoformat(c['jour']).weekday()]} {c['jour'][8:]}/{c['jour'][5:7]}",
    } for c in captures if c["jour"] >= depuis]
    st.markdown("### 🎁 Tes Poké Balls")
    a_venir = []
    components.html(CAPTURES.replace("__CAPTURES__", _js(recentes)).replace("__AVENIR__", _js(a_venir))
                    .replace("__COULEURS__", _js(COULEURS_TYPES)), height=150)

    # ----- Les missions du jour -----
    st.markdown("### 🎯 Missions du jour")
    st.caption("Chaque mission réussie = une Poké Ball. Une mission avec des types te donne 8 fois sur 10 un "
               "Pokémon de ces types.")
    m, gagnees = etat["mesures"], {c["id"].split("#")[1] for c in captures if c["jour"] == str(aujourd)}
    lignes = []
    for mi in pokemon.MISSIONS + [{"cle": "serie", "icone": "👑", "titre": f"Série de {objectif_serie} jours",
                                   "mesure": "serie", "seuil": objectif_serie, "types": None, "shiny": 1}]:
        v = serie % objectif_serie if mi["cle"] == "serie" else m.get(mi["mesure"], 0) if mi["mesure"] else 0
        fait = mi["cle"] in gagnees
        if mi["cle"] == "serie":
            detail = f"{serie} j d'affilée à 5 000 pas ou 15 min en zone · un légendaire au bout"
        elif not mi["mesure"]:
            detail = "offert chaque jour"
        else:
            u = mi.get("unite")
            f = (lambda x: chiffres.hm(x)) if mi["mesure"] == "sommeil" else \
                (lambda x: f"{x:.0f} min") if u == "min" else (lambda x: chiffres.nombre(x))
            detail = f"{f(v)} / {f(mi['seuil'])}" + ("" if fait else f" · encore {f(max(mi['seuil'] - v, 0))}")
        types = ("".join(f'<span class="ty" style="background:{COULEURS_TYPES[t]}">{t}</span>' for t in mi["types"])
                 if mi["types"] else '<span class="ty tous">Tous types</span>')
        if mi["shiny"] > 1:
            types += f'<span class="ty sh">✨ shiny ×{chiffres.nombre(mi["shiny"], 1) if mi["shiny"] % 1 else int(mi["shiny"])}</span>'
        pct = 100 if fait or not mi["mesure"] else min(v / mi["seuil"] * 100, 100)
        lignes.append(f"""<div class="mi {'ok' if fait else ''}"><div class="ic">{mi['icone']}</div><div class="co">
<div class="t">{mi['titre']}<span class="et">{'✅ gagnée' if fait else ''}</span></div><div>{types}</div>
<div class="bar"><div class="{'ok' if fait else ''}" style="width:{pct:.0f}%"></div></div><div class="s">{detail}</div>
</div></div>""")
    st.markdown("""<style>
.mi{display:flex;gap:10px;background:#1C2740;border-radius:12px;padding:6px 12px;margin:5px 0;align-items:center}
.mi.ok{box-shadow:inset 0 0 0 1px #4CD3A0}.mi .ic{font-size:1.25rem;width:26px;text-align:center}.mi .co{flex:1}
.mi .t{font-weight:700;font-size:.95rem}.mi .et{float:right;font-size:.75rem;color:#4CD3A0;font-weight:600}
.mi .s{font-size:.75rem;color:#9AA7C2;margin-top:2px}
.ty{display:inline-block;padding:0 7px;border-radius:8px;font-size:.68rem;font-weight:600;color:#fff;margin:2px 3px 0 0;
  text-shadow:0 1px 1px rgba(0,0,0,.35)}.ty.tous{background:#2A3756}.ty.sh{background:#7A6420}
</style>""" + "".join(lignes), unsafe_allow_html=True)

    # ----- Le Pokédex -----
    possedees = {}
    for c in captures:
        possedees.setdefault(c["num"], []).append(c["fichier"])
    dex = [{
        "num": n, "nom": p["nom"], "types": p["types"], "vignette": vignettes.get(str(n), ""),
        "versions": [{"image": paquets[n].get(v["fichier"], "") if v["fichier"] in possedees.get(n, []) else "",
                      "titre": _version(v | {"shiny": v["variante"] == "shiny"}), "shiny": v["variante"] == "shiny"}
                     for v in pokemon.VERSIONS[n]] if n in possedees else len(pokemon.VERSIONS[n]),
    } for n, p in POKEMON.items()]
    st.markdown("### 📕 Pokédex")
    components.html(POKEDEX.replace("__DEX__", _js(dex)).replace("__COULEURS__", _js(COULEURS_TYPES)),
                    height=31 * 84 + 20, scrolling=False)


STYLE_COMMUN = """<style>
*{box-sizing:border-box}body{margin:0;background:transparent;color:#EEF2FA;font-family:Outfit,system-ui,sans-serif}
img{image-rendering:pixelated}
.type{display:inline-block;padding:1px 8px;border-radius:9px;font-size:11px;font-weight:600;color:#fff;margin:0 2px;
  text-shadow:0 1px 1px rgba(0,0,0,.35)}
</style>"""

CAPTURES = STYLE_COMMUN + """<style>
#rang{display:flex;gap:10px;overflow-x:auto;padding:6px 2px 4px}
.case{flex:0 0 76px;text-align:center;font-size:10.5px;color:#9AA7C2;cursor:pointer}
.case .fond{width:76px;height:76px;border-radius:14px;background:#1C2740;display:flex;align-items:center;
  justify-content:center;position:relative}
.case.ouverte img{max-width:64px;max-height:64px}
.case.avenir{cursor:default}.case.avenir .fond{background:transparent;border:2px dashed #2A3756}
.case.avenir .ball{opacity:.25}
.case .nouv{position:absolute;top:-5px;right:-5px;background:#FF5D5D;color:#fff;border-radius:9px;font-size:9px;
  padding:1px 5px;font-weight:700}
.ball{width:44px;height:44px;border-radius:50%;border:3px solid #111;position:relative;overflow:hidden;
  background:linear-gradient(#EE1515 0 46%,#111 46% 54%,#F4F4F4 54%)}
.ball:after{content:"";position:absolute;width:12px;height:12px;border-radius:50%;background:#F4F4F4;
  border:3px solid #111;left:50%;top:50%;transform:translate(-50%,-50%)}
.case:not(.avenir):not(.ouverte) .ball{animation:attente 2.4s infinite}
@keyframes attente{0%,70%,100%{transform:rotate(0)}76%{transform:rotate(-12deg)}84%{transform:rotate(10deg)}}
#scene{display:none;position:relative;height:430px;border-radius:16px;overflow:hidden;margin-top:8px;
  background:radial-gradient(circle at 50% 40%,#22305A,#0D1322 70%)}
#scene .ball{position:absolute;left:50%;top:42%;width:96px;height:96px;margin:-48px 0 0 -48px;border-width:5px}
#scene .ball:after{width:24px;height:24px;border-width:5px}
.tremble{animation:tremble .55s ease-in-out 3}
@keyframes tremble{0%,100%{transform:rotate(0)}25%{transform:rotate(-22deg)}75%{transform:rotate(22deg)}}
#eclair{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
.flash{animation:flash .7s ease-out}
@keyframes flash{0%{opacity:0}25%{opacity:1}100%{opacity:0}}
#poke{position:absolute;left:50%;top:34%;transform:translate(-50%,-50%) scale(.2);opacity:0;
  filter:brightness(0);transition:transform .5s cubic-bezier(.2,1.6,.4,1),opacity .3s,filter 1.1s ease .7s}
#poke.vu{transform:translate(-50%,-50%) scale(1);opacity:1}
#poke.couleur{filter:brightness(1) drop-shadow(0 0 18px rgba(107,140,255,.55))}
#poke.couleur.brille{filter:brightness(1) drop-shadow(0 0 22px rgba(255,215,90,.9))}
#infos{position:absolute;left:0;right:0;bottom:16px;text-align:center;opacity:0;transition:opacity .6s}
#infos.vu{opacity:1}
#infos .n{font-size:13px;color:#9AA7C2}#infos .nom{font-size:26px;font-weight:800;margin:2px 0}
#infos .v{font-size:13px;color:#C9D3EA;margin-top:6px}#infos .r{font-size:12px;color:#9AA7C2;margin-top:3px}
#infos .badge{display:inline-block;background:#FF5D5D;border-radius:9px;padding:2px 9px;font-size:12px;font-weight:700;
  margin-bottom:6px}
#fermer{position:absolute;top:10px;right:12px;font-size:22px;color:#9AA7C2;cursor:pointer;background:none;border:0}
.etincelle{position:absolute;color:#FFE27A;font-size:20px;opacity:0;animation:etin 1.4s ease-in-out infinite}
@keyframes etin{0%,100%{opacity:0;transform:scale(.3) rotate(0)}50%{opacity:1;transform:scale(1.2) rotate(90deg)}}
#vide{color:#9AA7C2;font-size:13px;padding:8px 2px}
</style>
<div id="rang"></div><div id="scene"><button id="fermer">×</button><div id="eclair"></div>
<div class="ball" id="grosse"></div><img id="poke"><div id="infos"></div></div>
<script>
const CAPTURES = __CAPTURES__, AVENIR = __AVENIR__, COULEURS = __COULEURS__;
let ouvertes = [];
try { ouvertes = JSON.parse(localStorage.getItem("pkm_ouvertes") || "[]"); } catch (e) {}
const memo = id => { if (!ouvertes.includes(id)) ouvertes.push(id);
  try { localStorage.setItem("pkm_ouvertes", JSON.stringify(ouvertes.slice(-500))); } catch (e) {} };
const hauteur = h => {  // agrandit le cadre de l'appli pour l'animation
  try { const f = window.frameElement; f.style.height = h + "px"; f.height = h;
        if (f.parentElement) f.parentElement.style.height = "auto"; } catch (e) {}
};
const types = ts => ts.map(t => `<span class="type" style="background:${COULEURS[t]}">${t}</span>`).join("");

function dessiner() {
  const rang = document.getElementById("rang");
  // aujourd'hui : toutes ; jours d'avant : seulement celles pas encore ouvertes
  const liste = CAPTURES.filter(c => c.aujourdhui || !ouvertes.includes(c.id));
  rang.innerHTML = liste.map((c, i) => {
    const o = ouvertes.includes(c.id);
    return `<div class="case ${o ? "ouverte" : ""}" data-i="${CAPTURES.indexOf(c)}"><div class="fond">
      ${o ? `<img src="${c.image}">${c.shiny ? '<span class="nouv" style="background:#C9A227">✨</span>' : ""}`
          : '<div class="ball"></div>'}</div>${o ? c.nom : c.quand}</div>`;
  }).join("") + AVENIR.map(a => `<div class="case avenir"><div class="fond"><div class="ball"></div></div>${a}</div>`)
    .join("");
  if (!liste.length && !AVENIR.length) rang.innerHTML = '<div id="vide">Aucune capture pour l\\'instant.</div>';
  rang.querySelectorAll(".case[data-i]").forEach(e => e.onclick = () => ouvrir(CAPTURES[e.dataset.i]));
}

function ouvrir(c) {
  const scene = document.getElementById("scene"), ball = document.getElementById("grosse"),
        poke = document.getElementById("poke"), infos = document.getElementById("infos"),
        eclair = document.getElementById("eclair");
  scene.querySelectorAll(".etincelle").forEach(e => e.remove());
  scene.style.display = "block"; hauteur(150 + 438);
  ball.style.display = "block"; ball.className = "ball"; poke.className = ""; infos.className = "";
  poke.removeAttribute("style"); eclair.className = "";
  const deja = ouvertes.includes(c.id);
  poke.onload = () => {  // agrandi 4 à 6 fois en gardant les pixels nets
    const w = poke.naturalWidth, f = Math.max(1, Math.min(6, 260 / w));
    poke.style.width = (w * f) + "px";
  };
  poke.src = c.image;
  infos.innerHTML = `${c.nouvelle ? '<div class="badge">Nouveau dans le Pokédex !</div>' : ""}
    <div class="n">N° ${String(c.num).padStart(3, "0")}${c.legendaire ? " · Légendaire" : ""}</div>
    <div class="nom">${c.nom}</div><div>${types(c.types)}</div>
    <div class="v">${c.version}</div><div class="r">Gagné avec : ${c.raison} · ${c.quand}</div>`;
  const reveler = () => {
    ball.style.display = "none"; poke.classList.add("vu");
    setTimeout(() => { poke.classList.add("couleur"); if (c.shiny) { poke.classList.add("brille"); etincelles(); } }, 50);
    setTimeout(() => infos.classList.add("vu"), deja ? 300 : 1500);
    memo(c.id); dessiner();
  };
  if (deja) { reveler(); poke.classList.add("couleur"); return; }
  ball.classList.add("tremble");
  setTimeout(() => { eclair.className = "flash"; }, 1700);
  setTimeout(reveler, 1900);
}

function etincelles() {
  const scene = document.getElementById("scene");
  for (let i = 0; i < 14; i++) {
    const e = document.createElement("span"); e.className = "etincelle"; e.textContent = i % 3 ? "✦" : "✧";
    e.style.left = (12 + Math.random() * 76) + "%"; e.style.top = (8 + Math.random() * 60) + "%";
    e.style.animationDelay = (Math.random() * 1.4) + "s"; e.style.fontSize = (12 + Math.random() * 16) + "px";
    scene.appendChild(e);
  }
}

document.getElementById("fermer").onclick = () => { document.getElementById("scene").style.display = "none"; hauteur(150); };
dessiner();
</script>"""

POKEDEX = STYLE_COMMUN + """<style>
#grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px;position:relative}
.p{background:#1C2740;border-radius:10px;height:78px;text-align:center;cursor:pointer;position:relative;padding-top:2px}
.p img{width:56px;height:56px}
.p.non img{filter:brightness(0);opacity:.35}
.p .no{font-size:10px;color:#9AA7C2}
.p .compte{position:absolute;top:2px;right:4px;font-size:9px;color:#9AA7C2}
.p.complet{box-shadow:inset 0 0 0 2px #C9A227}
#fiche{display:none;position:absolute;left:0;right:0;z-index:5;background:#141D33;border:1px solid #2A3756;
  border-radius:16px;padding:14px;box-shadow:0 12px 40px rgba(0,0,0,.6)}
#fiche h3{margin:0 0 4px;font-size:20px}#fiche .x{position:absolute;top:8px;right:12px;font-size:22px;color:#9AA7C2;
  cursor:pointer}
#versions{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px;margin-top:12px}
.ver{background:#1C2740;border-radius:10px;padding:6px;text-align:center;font-size:10px;color:#9AA7C2;min-height:110px}
.ver img{width:72px;height:72px;object-fit:contain}
.ver.manque .trou{width:72px;height:72px;margin:0 auto;border-radius:8px;border:2px dashed #2A3756;display:flex;
  align-items:center;justify-content:center;font-size:22px;color:#2A3756}
.ver.sh{box-shadow:inset 0 0 0 1px #C9A227}
</style>
<div id="grille"></div><div id="fiche"></div>
<script>
const DEX = __DEX__, COULEURS = __COULEURS__;
const types = ts => ts.map(t => `<span class="type" style="background:${COULEURS[t]}">${t}</span>`).join("");
const g = document.getElementById("grille"), fiche = document.getElementById("fiche");
g.innerHTML = DEX.map((p, i) => {
  const a = Array.isArray(p.versions), n = a ? p.versions.filter(v => v.image).length : 0, t = a ? p.versions.length : 0;
  return `<div class="p ${a ? "" : "non"} ${a && n === t ? "complet" : ""}" data-i="${i}">
    ${a ? `<span class="compte">${n}/${t}</span>` : ""}<img src="${p.vignette}">
    <div class="no">${String(p.num).padStart(3, "0")}</div></div>`;
}).join("");
g.appendChild(fiche);
g.querySelectorAll(".p").forEach(e => e.onclick = () => {
  const p = DEX[e.dataset.i], a = Array.isArray(p.versions);
  fiche.innerHTML = `<span class="x">×</span><div style="font-size:12px;color:#9AA7C2">N° ${String(p.num).padStart(3, "0")}</div>
    <h3>${a ? p.nom : "???"}</h3>${a ? types(p.types) : ""}
    ${a ? `<div style="font-size:12px;color:#9AA7C2;margin-top:8px">${p.versions.filter(v => v.image).length} version(s) sur
      ${p.versions.length}</div><div id="versions">${p.versions.map(v => v.image
        ? `<div class="ver ${v.shiny ? "sh" : ""}"><img src="${v.image}"><div>${v.titre}</div></div>`
        : `<div class="ver manque"><div class="trou">?</div><div>${v.titre}</div></div>`).join("")}</div>`
      : `<p style="color:#9AA7C2;font-size:13px">Pas encore capturé. ${p.versions} versions à trouver.</p>`}`;
  fiche.style.top = Math.max(0, e.offsetTop - 10) + "px"; fiche.style.display = "block"; ajuster();
  fiche.querySelector(".x").onclick = ev => { ev.stopPropagation(); fiche.style.display = "none"; ajuster(); };
});
// la hauteur du cadre suit la grille (5 colonnes sur téléphone, plus sur ordinateur)
const ajuster = () => {
  const h = Math.max(g.offsetHeight, fiche.style.display === "block" ? fiche.offsetTop + fiche.offsetHeight : 0) + 8;
  try { const f = window.frameElement; f.style.height = h + "px"; f.height = h;
        if (f.parentElement) f.parentElement.style.height = "auto"; } catch (e) {}
};
window.addEventListener("load", ajuster); window.addEventListener("resize", ajuster); setTimeout(ajuster, 300);
</script>"""
