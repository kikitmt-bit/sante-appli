"""Assemble la page du rameur « La Rivière » : le dossier `riviere/` (page, modules JavaScript, niveau, région, lieux) devient UNE page.
Sans Streamlit. Les sprites des Pokémon (Pokémon Donjon Mystère, PMD SpriteCollab, CC BY-NC 4.0) ne sont jamais dans ce dépôt :
ils sont lus en ligne, dernière version, et glissés dans la page (gardés en mémoire, et dans un dossier temporaire de la machine)."""
import base64
import json
import re
import tempfile
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

RACINE = Path(__file__).resolve().parent
# l'ordre compte : chaque module peut s'appuyer sur ceux d'avant
MODULES = ["outils", "piste", "rendu", "forme", "terrain", "eau", "tunnel", "objets", "decor", "sprites", "jeu", "montre"]
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
    """Tous les Pokémon cités dans un fichier (num, ou nums pour une règle)."""
    if isinstance(o, dict):
        if o.get("o") == "pokemon" and "num" in o:
            trouves.add((o["num"], o.get("anim", "Idle")))
        if o.get("o") == "habitant" and "nom" in o:
            trouves.add(("h", o["nom"]))
        for n in o.get("nums", []) if isinstance(o.get("nums"), list) else []:
            trouves.add((n, "Idle"))
        for v in o.values():
            _pokemon(v, trouves)
    elif isinstance(o, list):
        for v in o:
            _pokemon(v, trouves)


def _js(o):
    return json.dumps(o, ensure_ascii=False).replace("</", "<\\/")


def page(donnees=None, niveau="kanto-1km", cache=None, artifact=False):
    """`donnees` : ce que la page reçoit de l'appli (lien du téléphone, modèle des mètres par coup, progression…)."""
    cache = Path(cache or Path(tempfile.gettempdir()) / "riviere-sprites")
    cache.mkdir(parents=True, exist_ok=True)
    lis = lambda *p: json.loads(RACINE.joinpath(*p).read_text(encoding="utf-8"))
    niv = lis("niveaux", f"{niveau}.json")
    biome, lieux = lis("biomes", f"{niv['biome']}.json"), lis("lieux", f"{niv.get('lieux', niv['biome'])}.json")
    besoins = {(niv.get("nageur", 7), "Walk")}
    for o in (niv, biome, lieux):
        _pokemon(o, besoins)
    lot = {f"{n:04d}/{a}": p for n, a in sorted(b for b in besoins if b[0] != "h") if (p := planche(n, a, cache))}
    lot.update({"h/" + nom: p for h, nom in sorted(b for b in besoins if b[0] == "h") if (p := habitant(nom, cache))})
    js = "\n".join(f"/* ----- {m}.js ----- */\n" + (RACINE / "js" / f"{m}.js").read_text(encoding="utf-8") for m in MODULES)
    html = (RACINE / "index.html").read_text(encoding="utf-8")
    for cle, val in (("__DONNEES__", _js(donnees or {})), ("__NIVEAU__", _js(niv)), ("__BIOME__", _js(biome)), ("__LIEUX__", _js(lieux)), ("__LOT__", _js(lot)), ("__MODULES__", js)):
        html = html.replace(cle, val)
    if artifact:  # une page à publier sur claude.ai : le contenu seul, sans l'enveloppe du document
        tete, corps = re.search(r"<head>(.*?)</head>", html, re.S).group(1), re.search(r"<body>(.*)</body>", html, re.S).group(1)
        html = '<meta name="claude:viewport-fit-sides" content="cover">' + re.sub(r"<meta[^>]*>\s*", "", tete) + corps
    return html


if __name__ == "__main__":  # python riviere/page.py <niveau> <fichier.html> [artifact]
    import sys
    Path(sys.argv[2]).write_text(page(niveau=sys.argv[1], artifact=len(sys.argv) > 3), encoding="utf-8")
