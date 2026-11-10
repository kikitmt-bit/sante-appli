"""Assemble la page du rameur (pseudo-3D) : le dossier `rameur/` (page, modules JavaScript, niveau, biome) devient UNE page,
car Streamlit n'affiche qu'un seul document. Sans Streamlit : sert aussi au serveur d'essai et au script de vérification."""
import json
from pathlib import Path

RACINE = Path(__file__).with_name("rameur")
# l'ordre compte : chaque module peut s'appuyer sur ceux d'avant
MODULES = ["outils", "piste", "decor", "rendu", "sprites", "fantome", "hud", "son", "menu", "course", "liaison", "verif", "main"]


def _json(chemin):
    return json.dumps(json.loads(Path(chemin).read_text(encoding="utf-8")), ensure_ascii=False).replace("</", "<\\/")


def page(donnees, niveau="baie"):
    """`donnees` : ce que la page reçoit de l'appli (lien du téléphone, modèle des mètres par coup, progression…)."""
    niv = json.loads((RACINE / "niveaux" / f"{niveau}.json").read_text(encoding="utf-8"))
    html = (RACINE / "index.html").read_text(encoding="utf-8")
    js = "\n".join(f"/* ----- {m}.js ----- */\n" + (RACINE / "js" / f"{m}.js").read_text(encoding="utf-8") for m in MODULES)
    return (html.replace("__DONNEES__", json.dumps(donnees, ensure_ascii=False).replace("</", "<\\/"))
                .replace("__NIVEAU__", _json(RACINE / "niveaux" / f"{niveau}.json"))
                .replace("__BIOME__", _json(RACINE / "biomes" / f"{niv['biome']}.json"))
                .replace("__MODULES__", js))
