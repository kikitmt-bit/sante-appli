"""Les défis en équipe (Kiki, 13/11 ; le premier : « Le Défi Doduo » du samedi 14/11/2026).

Une journée où deux joueurs additionnent leurs pas : peu importe qui les fait, il n'y a pas de minimum par personne. Réussi
avant minuit = une Super Ball pour chacun des deux (comptée côté serveur, comme toutes les balls). Ce jour-là seulement, les
joueurs du défi voient les pas du jour de chacun (Kiki : c'est fait pour se chambrer dans le groupe).

Les dates et les équipes sont dans la branche data (`data/evenements.json`, jamais d'identifiant dans ce dépôt public) :
    {"2026-11-14": {"nom": "Le Défi Doduo", "pokemon": 84, "cible": 15000, "equipes": [["kiki", "<id>"], ["<id>", "<id>"]]}}
"""
import datetime as dt

import chiffres
import pesees

FICHIER = "data/evenements.json"
KIKI = "kiki"  # comme amis.KIKI (amis importe pokemon : pas d'import ici)


def _dossier(ident):
    return "" if ident == KIKI else chiffres.dossier_ami(ident)


def pas_du_jour(racine, ident, jour):
    """Les pas d'un joueur ce jour-là, lus comme dans son propre jeu (avec ses pas corrigés à la main). None : pas encore de données."""
    d = _dossier(ident)
    res, pes = f"{d}data/resume/{jour.year}.json", d + pesees.FICHIER
    f = racine([res, pes])
    resumes = pesees.fusionner(f.get(res) or {}, f.get(pes))
    pas = chiffres.stats_jour(resumes.get(str(jour))).get("pas")
    return None if pas is None or pas != pas else round(pas)


def du_joueur(racine, ident, aujourd):
    """Les défis en équipe de ce joueur jusqu'à aujourd'hui : [{jour, nom, pokemon, cible, equipes: [[{id, pas}]], mienne, total, ok}].
    Une erreur de lecture = aucun défi (le jeu ne plante jamais pour ça)."""
    try:
        tous = racine([FICHIER]).get(FICHIER) or {}
    except Exception:  # noqa: BLE001
        return []
    out = []
    for jour_txt, e in sorted(tous.items()):
        try:
            jour = dt.date.fromisoformat(jour_txt)
            equipes = [list(eq) for eq in e["equipes"]]
            cible = int(e["cible"])
        except (KeyError, TypeError, ValueError):
            continue
        mienne = next((i for i, eq in enumerate(equipes) if ident in eq), None)
        if jour > aujourd or mienne is None:
            continue
        try:
            lues = [[{"id": j, "pas": pas_du_jour(racine, j, jour)} for j in eq] for eq in equipes]
        except Exception:  # noqa: BLE001
            continue
        total = sum(p["pas"] or 0 for p in lues[mienne])
        out.append({"jour": jour_txt, "nom": e.get("nom") or "Défi en équipe", "pokemon": e.get("pokemon"), "cible": cible,
                    "equipes": lues, "mienne": mienne, "total": total, "ok": total >= cible})
    return out


def ball(defi):
    """La ball due ce jour-là si l'équipe a réussi (une Super Ball, en plus de celle de l'objectif double)."""
    return {"cle": "equipe", "ball": "super", "types": None,
            "raison": f"🤝 {defi['nom']} : {chiffres_fr(defi['cible'])} pas en équipe"}


def chiffres_fr(n):
    return f"{n:,}".replace(",", " ")
