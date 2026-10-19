"""Analyse du coach du matin (lancée chaque jour par une tâche programmée Claude), à partir d'une copie locale de la
branche « data » du dépôt privé.

    python3 coach.py dossier     DOSSIER_DATA PERIODE AAAA-MM-JJ             -> affiche consigne + données
    python3 coach.py enregistrer DOSSIER_DATA PERIODE AAAA-MM-JJ analyse.md  -> range l'analyse dans data/coach/…

PERIODE = Jour, Semaine ou Mois ; la date peut être n'importe quel jour de la période.
"""
import datetime as dt
import json
import sys
from pathlib import Path

import chiffres


def lecteur(dossier):
    def lire(chemins):
        return {c: json.loads((Path(dossier) / c).read_text(encoding="utf-8")) if (Path(dossier) / c).exists() else None
                for c in chemins}
    return lire


def main(action, dossier, periode, date, fichier=None):
    ref, lire = dt.date.fromisoformat(date), lecteur(dossier)
    aujourd = dt.datetime.now(chiffres.TZ).date()
    if action == "dossier":
        d = chiffres.charger(lire, periode, ref, aujourd)
        print(chiffres.dossier_coach(d, chiffres.analyses_precedentes(lire, d["fin"]) if periode == "Jour" else ()))
    elif action == "enregistrer":
        debut, fin = chiffres.bornes(periode, ref)
        chemin = Path(dossier) / chiffres.chemin_analyse(periode, debut)
        chemin.parent.mkdir(parents=True, exist_ok=True)
        chemin.write_text(json.dumps({"periode": periode, "debut": str(debut), "fin": str(fin),
                                      "ecrit": dt.datetime.now(chiffres.TZ).isoformat(timespec="minutes"),
                                      "texte": Path(fichier).read_text(encoding="utf-8").strip()},
                                     ensure_ascii=False, indent=1), encoding="utf-8")
        print(chemin)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main(*sys.argv[1:])
