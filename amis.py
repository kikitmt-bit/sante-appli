"""Jouer à plusieurs (1re version, 02/11) : ce que chaque joueur voit des autres, et le suivi des amis pour Kiki.

Visible par les autres joueurs : pseudo et couleurs du dresseur, région, place sur la carte, lieu, badges, Pokédex (espèces
attrapées et ouvertes), shiny, légendaires, rares, starter, 3 dernières captures, nouvelles (belles captures, badges, lieux atteints), meilleurs scores de la danse au doigt,
points d'effort et séries de muscu de la semaine (la course de la semaine, 06/11).
**Jamais** : pas, sommeil, cardio, poids.
Le pseudo et les couleurs viennent du téléphone de chacun (localStorage pkm_dresseur : seulement ces 5 champs, jamais la
date de naissance, la taille ni le sexe) et sont publiés dans data/dresseurs/<id>.json (id = « kiki » ou celui de l'ami).
"""
import datetime as dt
import html
import json

import chiffres
import missions
import regions
import pokemon
from pokedex import LEGENDAIRES

KIKI = "kiki"
DRESSEURS = "data/dresseurs/{}.json"
# les couleurs possibles de la carte du dresseur (mêmes noms que COULEURS_* de pokemon_ui.html)
PEAUX = {"Très claire", "Claire", "Mate", "Foncée", "Très foncée"}
TISSUS = {"Rouge", "Bleu", "Vert", "Jaune", "Orange", "Rose", "Violet", "Noir", "Blanc"}
PANTALONS = {"Jean", "Noir", "Gris", "Beige", "Kaki", "Bordeaux", "Blanc"}
DEFAUT = {"nom": "", "peau": "Claire", "casquette": "Rouge", "veste": "Rouge", "pantalon": "Jean"}


def dresseur_du_telephone(texte):
    """Le pseudo, les couleurs et le matériel coché (et rien d'autre) de la carte du dresseur gardée sur le téléphone ; None si rien de réglé."""
    try:
        d = json.loads(texte or "")
    except (TypeError, ValueError):
        return None
    if not isinstance(d, dict) or not str(d.get("nom") or "").strip():
        return None
    nom = " ".join(str(d["nom"]).split())[:16]
    ok = lambda k, permis: d.get(k) if d.get(k) in permis else DEFAUT[k]  # noqa: E731
    sortie = {"nom": nom, "peau": ok("peau", PEAUX), "casquette": ok("casquette", TISSUS), "veste": ok("veste", TISSUS),
              "pantalon": ok("pantalon", PANTALONS)}
    if isinstance(d.get("materiel"), list):  # pas de liste : rien de coché encore (missions.materiel_de décide)
        sortie["materiel"] = [m for m in missions.MATERIELS if m in d["materiel"]]
    return sortie


def _quand(jour, aujourd):
    d = dt.date.fromisoformat(jour)
    if d == aujourd:
        return "aujourd'hui"
    return "hier" if d == aujourd - dt.timedelta(days=1) else f"{chiffres.JOURS[d.weekday()]} {jour[8:]}/{jour[5:7]}"


def nouvelles(vues, v, frise, aujourd):
    """Ce qui mérite d'être raconté aux autres (14 derniers jours, 12 au plus, le plus récent d'abord) : badges, légendaires,
    shiny, starter reçu du Professeur et son évolution, nouveau rare, lieux atteints. Pas les captures ordinaires : elles noieraient le reste."""
    out, vus = [], set()
    for c in sorted(vues, key=lambda c: c["jour"]):
        num, nouveau = c["num"], c["num"] not in vus
        vus.add(num)
        quoi = ("evo" if "#evo" in c["id"] else "starter" if c["id"].endswith(("#chen", "#orme")) else "legendaire" if nouveau and num in LEGENDAIRES else "shiny" if c.get("shiny")
                else "rare" if nouveau and num in regions.RARES and "#badge" not in c["id"] else None)
        if quoi:
            out.append({"quoi": quoi, "jour": c["jour"], "num": num, "shiny": bool(c.get("shiny"))})
    arenes = [l["arene"] for l in v["lieux"] if l["arene"]]
    out += [{"quoi": "badge", "jour": j, "n": int(k), "champion": arenes[int(k) - 1]["champion"], "image": arenes[int(k) - 1]["image"]} for k, j in v["badges"].items()]
    for f in frise:
        # le lieu le plus loin de la journée seulement : pas trois lignes pour une seule grosse journée
        out += [{"quoi": "lieu", "jour": f["jour"], "lieu": l["nom"]} for l in v["lieux"]
                if f["p0"] < l["dist"] <= f["p1"] and "(retour)" not in l["nom"]][-1:]
    limite, ordre = str(aujourd - dt.timedelta(days=14)), ["badge", "legendaire", "shiny", "evo", "starter", "rare", "lieu"]
    out = [n for n in out if n["jour"] >= limite]
    out.sort(key=lambda n: ordre.index(n["quoi"]))
    out.sort(key=lambda n: n["jour"], reverse=True)
    return [n | {"quand": _quand(n["jour"], aujourd)} for n in out[:12]]


def resume(captures, etat, ouvertes, aujourd):
    """Ce que les autres voient d'une partie : seulement le jeu (captures ouvertes = son Pokédex). Une ball de plus de 14 jours
    compte comme ouverte, comme sur le téléphone (la liste partagée ne garde que 20 jours : sinon le Pokédex rétrécirait)."""
    limite = str(aujourd - dt.timedelta(days=14))
    vues = [c for c in captures if (c["id"] in ouvertes or c["jour"] < limite) and not c.get("rate")]
    especes = sorted({c["num"] for c in vues})
    premieres = {}
    for c in vues:
        premieres[c["num"]] = min(c["jour"], premieres.get(c["num"], c["jour"]))
    lundi = str(aujourd - dt.timedelta(days=aujourd.weekday()))
    shiny = sorted({c["num"] for c in vues if c.get("shiny")})
    v, st_ = etat["voyage"], etat.get("starter")
    starter = None
    if st_:
        ligne, niv = st_["ligne"], st_["niveau"]
        starter = {"num": ligne[2 if niv >= 36 else 1 if niv >= 16 else 0], "niveau": niv}
    dernieres = sorted(vues, key=lambda c: (c["jour"], str(c.get("c") or "")), reverse=True)[:3]
    arenes = [l["arene"] for l in v["lieux"] if l["arene"]]
    de_la_semaine = [d for d in etat.get("derniers") or () if d["jour"] >= lundi]
    return {"pos": v["pos"], "ici": v["ici"], "lieu": v["lieux"][v["ici"]]["nom"], "region": v["carte"]["region"], "carte": v["carte"]["image"],
            "badges": sorted(int(k) for k in v["badges"]), "especes": especes, "shiny": shiny,
            "legendaires": sum(n in LEGENDAIRES for n in especes), "starter": starter,
            "dernieres": [{"num": c["num"], "shiny": bool(c.get("shiny")), "jour": c["jour"]} for c in dernieres],
            "lundi": lundi, "semaine": sum(j >= lundi for j in premieres.values()), "rares": sum(n in regions.RARES for n in especes),
            "badges_img": [arenes[int(k) - 1]["image"] for k in sorted(v["badges"], key=int) if arenes[int(k) - 1]["image"]],
            "points": (etat.get("semaine") or {}).get("points", 0), "points_passee": (etat.get("semaine_passee") or {}).get("points"),
            "muscu": {k: sum(d.get(k, 0) for d in de_la_semaine) for k in ("pompes", "squats", "tractions")}, "nouvelles": nouvelles(vues, v, etat["frise"], aujourd), "danse": etat.get("danse") or {}}


def partie(lire_depot, ident, debut, aujourd):
    """La partie d'un joueur (Kiki : ident = KIKI), calculée comme sur son téléphone, résumée pour les autres."""
    ami = None if ident == KIKI else ident
    lire = chiffres.chez(lire_depot, chiffres.dossier_ami(ami) if ami else "")
    joueur = {"id": ami, "debut": debut} if ami else None
    captures, etat = pokemon.charger_jeu(lire, aujourd, joueur)
    ouvertes = (lire([pokemon.OUVERTES])[pokemon.OUVERTES] or {}).get("ouvertes", {})
    return resume(captures, etat, set(ouvertes), aujourd)


def joueurs(registre):
    """Tous les joueurs : Kiki, puis les amis inscrits (data/joueurs.json) -> {id: date de début ou None}."""
    out = {KIKI: None}
    for ident, info in sorted((registre or {}).items()):
        try:
            out[ident] = dt.date.fromisoformat(info["debut"])
        except (KeyError, TypeError, ValueError):
            continue
    return out


def public(ident, dresseur, jeu, moi):
    """Une ligne de la liste des joueurs envoyée au téléphone (pseudo échappé : il est tapé par chacun)."""
    d = {**DEFAUT, **(dresseur or {})}
    nom = html.escape(d["nom"]) or ("Kiki" if ident == KIKI else "Dresseur")
    return {"id": ident, "moi": moi, "nom": nom, "couleurs": {k: d[k] for k in ("peau", "casquette", "veste", "pantalon")}, **jeu}


# ---------- Suivi des amis (Kiki seul, ⚙️) : la récolte a-t-elle marché ? ----------
def suivi(lire_depot, ident, debut, aujourd):
    """Pour Kiki : dernière récolte, erreurs de Google, jours avec des données (14 derniers jours), sans rien enregistrer."""
    lire = chiffres.chez(lire_depot, chiffres.dossier_ami(ident))
    jours = [aujourd - dt.timedelta(days=i) for i in range(13, -1, -1) if aujourd - dt.timedelta(days=i) >= debut - dt.timedelta(days=14)]
    fichiers = lire([f"data/jour/{j.year}/{j}.json" for j in jours])
    resumes = {}
    for y in sorted({j.year for j in jours}):
        resumes.update(lire([f"data/resume/{y}.json"])[f"data/resume/{y}.json"] or {})
    derniere, erreurs, lignes = None, {}, []
    for j in jours:
        f = fichiers.get(f"data/jour/{j.year}/{j}.json") or {}
        if f.get("recupere") and (not derniere or f["recupere"] > derniere):
            derniere = f["recupere"]
        for typ, msg in (f.get("erreurs") or {}).items():
            texte = str(msg)
            for cle in ('"message": "', "message: "):
                if cle in texte:
                    texte = texte.split(cle, 1)[1].split('"', 1)[0]
                    break
            erreurs.setdefault(texte[:160], set()).add(typ)
        s = chiffres.stats_jour(resumes.get(str(j)))
        lignes.append({"jour": j, "pas": s.get("pas"), "zone_sport": s.get("zone_sport"), "sommeil": s.get("sommeil"),
                       "types": len((f.get("types") or {}))})
    return {"derniere": derniere, "erreurs": {m: sorted(t) for m, t in erreurs.items()}, "jours": lignes}
