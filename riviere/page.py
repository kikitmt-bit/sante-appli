"""Assemble la page de « La Rivière » : le dossier `riviere/` (page, moteur, jeu, contenu) devient UNE page.
Sans Streamlit. Les sprites des Pokémon (Pokémon Donjon Mystère, PMD SpriteCollab, CC BY-NC 4.0) ne sont jamais dans ce dépôt :
ils sont lus en ligne, dernière version, et glissés dans la page (gardés en mémoire, et dans un dossier temporaire de la machine).

Le rangement (voir MOTEUR.md) :
  moteur/   le cœur : il ne connaît ni Pokémon, ni montre, ni séance. L'ordre de MOTEUR compte.
  contenu/  ce qu'on ajoute sans toucher au cœur : niveaux/, biomes/ (régions), lieux/ (des fichiers de données),
            et objets/, surfaces/, montures/, evenements/ (des recettes : tous les .js de ces dossiers sont ramassés).
  jeu/      la séance, le menu, l'affichage, le fantôme, la montre. L'ordre de JEU compte."""
import base64
import json
import re
import tempfile
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

RACINE = Path(__file__).resolve().parent
MOTEUR = ["depart", "outils", "piste", "champ", "rendu", "forme", "terrain", "surfaces", "tunnel", "decor", "sprites", "velo", "cycliste", "monture", "camera", "son", "ambiance"]
RECETTES = ["objets", "surfaces", "montures", "evenements", "lointains"]
JEU = ["allure", "jeu", "montre", "capteurs", "seance", "fantome", "rivaux", "parcours", "generateur", "editeur", "banc"]
PURS = ["depart", "outils", "piste", "champ", "forme", "decor"]  # les modules du moteur qui ne dessinent rien : ils se contrôlent sans navigateur (tests/test_riviere.py)
PMD = "https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite/"
GENS = "https://raw.githubusercontent.com/pret/pokefirered/ce6406d8c2eaf46d543c8a2606de0c3cb1951982/graphics/object_events/pics/people/"  # les habitants : sprites de Rouge Feu
try:  # les tailles officielles des Pokémon (m), pour les afficher à leur échelle
    import sys
    sys.path.insert(0, str(RACINE.parent))
    from pokedex import TAILLES
except Exception:
    TAILLES = {}
_LOT = {}


def _lire(url, cache):
    f = cache / re.sub(r"[^A-Za-z0-9.]+", "_", url.split("/", 5)[-1])[-120:]
    if not f.exists():
        f.write_bytes(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=20).read())
    return f.read_bytes()


def planche(num, anim, cache):
    """Une planche d'animation d'un Pokémon : l'image et la taille de ses cases. None si elle ne se charge pas (le Pokémon ne s'affiche pas)."""
    cle = f"{num:04d}/{anim}"
    if cle not in _LOT:
        try:
            blocs = {a.findtext("Name"): a for a in ET.fromstring(_lire(f"{PMD}{num:04d}/AnimData.xml", cache)).iter("Anim")}
            a = blocs[anim]
            if a.find("CopyOf") is not None:
                a = blocs[a.findtext("CopyOf")]
            png = _lire(f"{PMD}{num:04d}/{a.findtext('Name')}-Anim.png", cache)
            _LOT[cle] = {"png": "data:image/png;base64," + base64.b64encode(png).decode(), "fw": int(a.findtext("FrameWidth")), "fh": int(a.findtext("FrameHeight")),
                         "dur": [int(d.text) for d in a.iter("Duration")], "m": TAILLES.get(num)}
        except Exception:  # hors ligne, sprite retiré… : le jeu tourne sans ce Pokémon
            return None
    return _LOT[cle]


def habitant(nom, cache):
    """Un habitant : la planche de Rouge Feu (16 × 32 par image, la première de face). Son fond est déjà transparent."""
    cle = "h/" + nom
    if cle not in _LOT:
        try:
            _LOT[cle] = {"png": "data:image/png;base64," + base64.b64encode(_lire(GENS + nom + ".png", cache)).decode(), "fw": 16, "fh": 32, "dur": [9999]}
        except Exception:
            return None
    return _LOT[cle]


def _pokemon(o, trouves):
    """Tous les Pokémon cités dans un fichier (num, nums pour une règle, rivaux d'une région)."""
    if isinstance(o, dict):
        if o.get("o") == "pokemon" and "num" in o:
            trouves.add((o["num"], o.get("anim") or ("Walk" if o.get("bouge") else "Idle")))
        if o.get("o") == "habitant" and "nom" in o:
            trouves.add(("h", o["nom"]))
        for n in o.get("nums", []) if isinstance(o.get("nums"), list) else []:
            trouves.add((n, "Walk" if (o.get("reglages") or {}).get("bouge") else "Idle"))
        for liste in (o.get("rivaux") or {}).values() if isinstance(o.get("rivaux"), dict) else []:
            for n in liste:
                trouves.add((n, "Walk"))
        for v in o.values():
            _pokemon(v, trouves)
    elif isinstance(o, list):
        for v in o:
            _pokemon(v, trouves)


def _js(o):
    return json.dumps(o, ensure_ascii=False).replace("</", "<\\/")


def _module(dossier, nom):
    return f"/* ----- {dossier}/{nom}.js ----- */\n" + (RACINE / dossier / f"{nom}.js").read_text(encoding="utf-8")


def recettes():
    """Le code du contenu : tous les .js des dossiers de recettes, dans l'ordre des noms."""
    return "\n".join(_module(f"contenu/{d}", f.stem) for d in RECETTES for f in sorted((RACINE / "contenu" / d).glob("*.js")))


def _lis(*p):
    return json.loads(RACINE.joinpath("contenu", *p).read_text(encoding="utf-8"))


def _dossier(nom):
    return {f.stem: _lis(nom, f.name) for f in sorted((RACINE / "contenu" / nom).glob("*.json"))}


def _fusion(a, b):
    if not isinstance(a, dict) or not isinstance(b, dict):
        return a if b is None else b
    return {**a, **{k: _fusion(a.get(k), v) for k, v in b.items()}}


def region(nom, biomes=None, vus=()):
    """Une région, avec ce qu'elle hérite d'une autre ("herite": "kanto") : la même règle que moteur/depart.js."""
    biomes = biomes or _dossier("biomes")
    b = biomes[nom]
    if not b.get("herite"):
        return b
    if nom in vus:
        raise ValueError(f"La région {nom} hérite d'elle-même.")
    parent = region(b["herite"], biomes, vus + (nom,))
    o = _fusion(parent, b)
    o["regles"] = b["regles"] if "regles" in b else parent.get("regles", []) + b.get("regles_plus", [])
    return o


def fichiers(niveau):
    """Le niveau, sa région (héritage fait) et ses lieux."""
    niv = _lis("niveaux", f"{niveau}.json")
    biome = region(niv["biome"])
    return niv, biome, _lis("lieux", f"{niv.get('lieux') or biome.get('lieux') or niv['biome']}.json")


def tout():
    """Tous les circuits, toutes les régions, tous les lieux : la page les porte tous, on change de circuit sans rien redemander."""
    niveaux = _dossier("niveaux")
    for nom, n in niveaux.items():
        n.setdefault("id", nom)
    return niveaux, _dossier("biomes"), _dossier("lieux")


def donnees_js(donnees, niveaux, biomes, lieux, lot, servi):
    return (f"const D = {_js(donnees or {})}, NIVEAUX = {_js(niveaux)}, BIOMES = {_js(biomes)}, LIEUX_TOUS = {_js(lieux)}, LOT = {_js(lot)}, "
            f"NIVEAU_SERVI = {_js(servi)}, TAILLES_PKM = {_js({str(k): v for k, v in TAILLES.items()})};")


def source_piste():
    """Le code de la piste, en texte : l'éditeur et le générateur le relancent sur un brouillon, sans recharger la page (le même code que le jeu)."""
    return "const SOURCE_PISTE = " + _js("\n".join(_module("moteur", m) for m in ("outils", "piste"))) + ";"


def page(donnees=None, niveau="kanto-1km", cache=None, artifact=False):
    """`donnees` : ce que la page reçoit de l'appli (lien de la montre, mètres par coup, dernière séance, machine…)."""
    cache = Path(cache or Path(tempfile.gettempdir()) / "riviere-sprites")
    cache.mkdir(parents=True, exist_ok=True)
    niveaux, biomes, lieux = tout()
    if niveau not in niveaux:
        niveau = "kanto-1km"
    besoins = {(n.get("nageur", 7), "Walk") for n in niveaux.values()}
    for o in (niveaux, biomes, lieux):
        _pokemon(o, besoins)
    lot = {f"{n:04d}/{a}": p for n, a in sorted(b for b in besoins if b[0] != "h") if (p := planche(n, a, cache))}
    lot.update({"h/" + nom: p for h, nom in sorted(b for b in besoins if b[0] == "h") if (p := habitant(nom, cache))})
    js = "\n".join([_module("moteur", m) for m in MOTEUR] + [recettes()] + [source_piste()] + [_module("jeu", m) for m in JEU])
    html = (RACINE / "index.html").read_text(encoding="utf-8")
    for cle, val in (("__DONNEES__", donnees_js(donnees, niveaux, biomes, lieux, lot, niveau)), ("__MODULES__", js)):
        html = html.replace(cle, val)
    if artifact:  # une page à publier sur claude.ai : le contenu seul, sans l'enveloppe du document
        tete, corps = re.search(r"<head>(.*?)</head>", html, re.S).group(1), re.search(r"<body>(.*)</body>", html, re.S).group(1)
        html = '<meta name="claude:viewport-fit-sides" content="cover">' + re.sub(r"<meta[^>]*>\s*", "", tete) + corps
    return html


def controle(niveau="kanto-1km", params=""):
    """Un programme JavaScript SANS navigateur ni dessin : il construit la piste, le champ et pose tout le décor d'un niveau, puis écrit
    ce qu'il a trouvé (une ligne de JSON). Lancé par les contrôles automatiques avec node : un niveau cassé ou une instruction avalée se voit."""
    niv, biome, lieux = fichiers(niveau)
    niv.setdefault("id", niveau)
    avant = ('"use strict";\nvar window = globalThis, location = {search: ' + json.dumps(params) + '}, navigator = {}, '
             'document = {getElementById: () => null, createElement: () => ({getContext: () => null}), addEventListener() {}};\n')
    apres = (RACINE / "controle.js").read_text(encoding="utf-8")
    sans = {k: v for k, v in biome.items() if k not in ("herite", "regles_plus")}
    return avant + donnees_js({"force": True}, {niveau: niv}, {niv["biome"]: sans}, {niv.get("lieux") or biome.get("lieux") or niv["biome"]: lieux}, {}, niveau) + "\n" + "\n".join(_module("moteur", m) for m in PURS) + "\n" + recettes() + "\n" + apres


if __name__ == "__main__":  # python riviere/page.py <niveau> <fichier.html> [artifact]
    import sys
    Path(sys.argv[2]).write_text(page(niveau=sys.argv[1], artifact=len(sys.argv) > 3), encoding="utf-8")
