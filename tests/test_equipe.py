"""Les défis en équipe (equipe.py) : les pas des deux coéquipiers s'additionnent, peu importe qui les fait."""
import datetime as dt
import unittest

import equipe

JOUR = "2026-11-14"


def resume(pas):
    return {JOUR: {"steps:jour": [{"steps": {"countSum": str(pas)}}]}} if pas is not None else {}


def lecteur(pas, evenements):
    """pas = {joueur: pas du jour ou None}."""
    def lire(chemins):
        out = {}
        for c in chemins:
            if c == equipe.FICHIER:
                out[c] = evenements
                continue
            qui = "kiki" if c.startswith("data/resume") or c == "data/pesees.json" else c.split("/")[2]
            out[c] = resume(pas.get(qui)) if "resume" in c else None
        return out
    return lire


EV = {JOUR: {"nom": "Le Défi Doduo", "pokemon": 84, "cible": 15000, "equipes": [["kiki", "aaa"], ["bbb", "ccc"]]}}


class TestEquipe(unittest.TestCase):
    def test_un_seul_peut_tout_faire(self):
        d = equipe.du_joueur(lecteur({"kiki": 15200, "aaa": 0}, EV), "aaa", dt.date(2026, 11, 14))
        self.assertEqual(len(d), 1)
        self.assertTrue(d[0]["ok"])
        self.assertEqual(d[0]["total"], 15200)

    def test_a_deux(self):
        d = equipe.du_joueur(lecteur({"kiki": 10000, "aaa": 4000, "bbb": 8000, "ccc": 7000}, EV), "kiki", dt.date(2026, 11, 14))[0]
        self.assertFalse(d["ok"])
        self.assertEqual(d["total"], 14000)
        d = equipe.du_joueur(lecteur({"bbb": 8000, "ccc": 7000}, EV), "ccc", dt.date(2026, 11, 14))[0]
        self.assertTrue(d["ok"])
        self.assertEqual(d["mienne"], 1)

    def test_pas_encore_recus(self):
        d = equipe.du_joueur(lecteur({"kiki": 3000}, EV), "kiki", dt.date(2026, 11, 14))[0]
        self.assertIsNone(d["equipes"][0][1]["pas"])
        self.assertEqual(d["total"], 3000)

    def test_rien_avant_le_jour_ni_hors_equipe(self):
        self.assertEqual(equipe.du_joueur(lecteur({}, EV), "kiki", dt.date(2026, 11, 13)), [])
        self.assertEqual(equipe.du_joueur(lecteur({}, EV), "zzz", dt.date(2026, 11, 14)), [])
        self.assertEqual(equipe.du_joueur(lecteur({}, None), "kiki", dt.date(2026, 11, 14)), [])

    def test_lecture_en_panne(self):
        def panne(chemins):
            raise RuntimeError("GitHub")
        self.assertEqual(equipe.du_joueur(panne, "kiki", dt.date(2026, 11, 14)), [])

    def test_ball(self):
        b = equipe.ball({"nom": "Le Défi Doduo", "cible": 15000})
        self.assertEqual((b["cle"], b["ball"]), ("equipe", "super"))
        self.assertIn("15 000", b["raison"])


if __name__ == "__main__":
    unittest.main()
