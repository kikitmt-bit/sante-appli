"""Le circuit du jour de « La Rivière » (étape 5 du plan) : réglages tirés de la date, classement tiré des records des joueurs."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "riviere"))
import jour as J  # noqa: E402


def rec(niveau, t, machine="rameur"):
    return {"machine": machine, "niveau": niveau, "tour": {"t": t, "jour": "2026-11-16"}}


class CircuitDuJour(unittest.TestCase):
    def test_meme_jour_memes_reglages(self):
        self.assertEqual(J.options("2026-11-16", "eau"), J.options("2026-11-16", "eau"))
        self.assertNotEqual(J.options("2026-11-16", "eau")["graine"], J.options("2026-11-17", "eau")["graine"])
        self.assertNotEqual(J.options("2026-11-16", "eau", 0)["graine"], J.options("2026-11-16", "eau", 1)["graine"])

    def test_reglages_raisonnables(self):
        import datetime as dt
        ronflex = fourche = 0
        for k in range(60):
            j = dt.date(2026, 11, 1) + dt.timedelta(days=k)
            e, t = J.options(j, "eau"), J.options(j, "terre")
            self.assertTrue(1.8 <= e["km"] <= 2.3 and 3.2 <= t["km"] <= 4.0)
            self.assertEqual(t["activite"], "terre")
            self.assertGreaterEqual(len(e["avec"]), 2)
            ronflex += "ronflex" in e["avec"]
            fourche += "fourche" in e["avec"]
            self.assertFalse("fourche" in t["avec"] and t["forme"] == "huit", "jamais de fourche dans un 8")
        self.assertTrue(15 < ronflex < 45, "Ronflex : environ un jour sur deux")
        self.assertTrue(12 < fourche < 36, "une fourche : environ deux jours sur cinq")

    def test_classement(self):
        jour = {"jour": "2026-11-16", "eau": {"id": "jour-eau-2026-11-16", "pieces": [{}]}, "terre": {"id": "jour-terre-2026-11-16", "pieces": [{}]}}
        records = {
            "kiki": {"records": {"a": rec("jour-eau-2026-11-16", 600.0), "b": rec("kanto-1km", 400.0), "c": rec("jour-terre-2026-11-16", 700, "velo")}},
            "ami1": {"records": {"x": rec("jour-eau-2026-11-16", 580.2), "y": rec("jour-eau-2026-11-15", 100.0)}},
            "ami2": {"records": {"z": {"machine": "rameur", "niveau": "jour-eau-2026-11-16", "tour": {"t": "mal formé"}}}},
            "ami3": None,
        }
        c = J.classement(jour, records, {"kiki": {"nom": "Kiki", "casquette": "Rouge"}, "ami1": {"nom": "<Tom>"}}, "kiki")
        self.assertEqual([(l["nom"], l["t"], l["moi"]) for l in c["eau"]["rameur"]], [("<Tom>", 580.2, False), ("Kiki", 600.0, True)])
        self.assertEqual([l["t"] for l in c["terre"]["velo"]], [700])
        self.assertNotIn("terre", J.classement({"eau": jour["eau"]}, records, {}, "kiki"))

    def test_pour_le_jeu(self):
        self.assertIsNone(J.pour_le_jeu(None, {}))
        self.assertIsNone(J.pour_le_jeu({"jour": "2026-11-16"}, {}))
        d = J.pour_le_jeu({"jour": "2026-11-16", "eau": {"id": "jour-eau-2026-11-16", "pieces": [{}]}}, {})
        self.assertEqual([n["id"] for n in d["circuits"]], ["jour-eau-2026-11-16"])

    def test_preparer(self):
        n = J.preparer({"id": "perso-1", "nom": "Circuit n° 1", "pieces": []}, "2026-11-16", "eau", 77)
        self.assertEqual((n["id"], n["jour"], n["note"]), ("jour-eau-2026-11-16", "2026-11-16", 77))
        self.assertTrue(n["nom"].startswith("Circuit du jour · lun. 16/11"))


if __name__ == "__main__":
    unittest.main()
