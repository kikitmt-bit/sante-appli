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
        for m in J.MACHINES:
            self.assertEqual(J.options("2026-11-16", m), J.options("2026-11-16", m))
            self.assertNotEqual(J.options("2026-11-16", m)["graine"], J.options("2026-11-17", m)["graine"])
            self.assertNotEqual(J.options("2026-11-16", m, 0)["graine"], J.options("2026-11-16", m, 1)["graine"])

    def test_reglages_varies(self):
        import collections
        import datetime as dt
        jours = [dt.date(2026, 11, 1) + dt.timedelta(days=k) for k in range(60)]
        for m, formes in (("rameur", {"ile", "lac", "retour"}), ("velo", {"velo", "quais"}), ("elliptique", {"pied"})):
            os_ = [J.options(j, m) for j in jours]
            self.assertEqual({o["style"] for o in os_}, formes)
            self.assertEqual({o["activite"] for o in os_}, {"eau" if m == "rameur" else "terre"})
            for quoi in ("sorte", "nature") + (("style",) if len(formes) > 1 else ()):
                c = collections.Counter(o[quoi] for o in os_)
                self.assertGreaterEqual(min(c.values()), 60 / len(c) - 4, f"{m} : {quoi} revient à tour de rôle")
                self.assertFalse(any(a[quoi] == b[quoi] for a, b in zip(os_, os_[1:])), f"{m} : {quoi}, jamais deux jours de suite")
            lo, hi = {"rameur": (1.5, 2.5), "velo": (2.5, 3.5), "elliptique": (.9, 1.5)}[m]
            self.assertTrue(all(lo <= o["km"] <= hi for o in os_))
        self.assertGreater(len({(J.options(j, "velo")["nature"], J.options(j, "rameur")["nature"]) for j in jours}), 5, "les machines sont indépendantes")

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

    def test_classement_par_machine(self):
        jour = {"jour": "2026-11-26", "rameur": {"id": "jour-rameur-2026-11-26", "pieces": [{}]}, "velo": {"id": "jour-velo-2026-11-26", "pieces": [{}]}}
        c = J.classement(jour, {"kiki": {"records": {"a": rec("jour-rameur-2026-11-26", 500), "b": rec("jour-velo-2026-11-26", 400, "velo")}}}, {}, "kiki")
        self.assertEqual((c["rameur"]["rameur"][0]["t"], c["velo"]["velo"][0]["t"]), (500, 400))

    def test_pour_le_jeu(self):
        self.assertIsNone(J.pour_le_jeu(None, {}))
        self.assertIsNone(J.pour_le_jeu({"jour": "2026-11-16"}, {}))
        d = J.pour_le_jeu({"jour": "2026-11-16", "eau": {"id": "jour-eau-2026-11-16", "pieces": [{}]}}, {})
        self.assertEqual([n["id"] for n in d["circuits"]], ["jour-eau-2026-11-16"], "un fichier d'avant le 25/11 se lit encore")
        d = J.pour_le_jeu({"jour": "2026-11-26", **{m: {"id": J.id_du_jour("2026-11-26", m), "pieces": [{}]} for m in J.MACHINES}}, {})
        self.assertEqual([n["id"] for n in d["circuits"]], [f"jour-{m}-2026-11-26" for m in J.MACHINES])

    def test_preparer(self):
        n = J.preparer({"id": "lac-1", "nom": "Le lac Bleu", "pieces": []}, "2026-11-16", "rameur")
        self.assertEqual((n["id"], n["jour"], n["nom"], n["machines"]), ("jour-rameur-2026-11-16", "2026-11-16", "Le lac Bleu", ["rameur"]))


if __name__ == "__main__":
    unittest.main()
