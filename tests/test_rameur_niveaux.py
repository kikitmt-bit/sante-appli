"""Contrôle des niveaux et des biomes du rameur (pseudo-3D) : un niveau est un fichier, donc on le vérifie comme un fichier."""
import json
import unittest
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent / "rameur"


class TestNiveaux(unittest.TestCase):
    def test_chaque_niveau(self):
        niveaux = sorted((RACINE / "niveaux").glob("*.json"))
        self.assertTrue(niveaux)
        for f in niveaux:
            n = json.loads(f.read_text(encoding="utf-8"))
            biome = json.loads((RACINE / "biomes" / f"{n['biome']}.json").read_text(encoding="utf-8"))
            with self.subTest(niveau=f.stem):
                self.assertEqual(n["id"], f.stem)
                self.assertAlmostEqual(abs(sum(s["virage"] for s in n["sections"])), 360, delta=1.5, msg="la boucle doit faire un tour complet")
                self.assertAlmostEqual(sum(s.get("colline", 0) for s in n["sections"]), 0, delta=.01, msg="les collines doivent se compenser")
                self.assertTrue(n["sections"][0].get("nom"), "la première pièce porte un nom")
                noms = {s["nom"] for s in n["sections"] if s.get("nom")}
                for s in n["sections"]:
                    self.assertGreater(s["long"], 0)
                    self.assertGreaterEqual(s["eau"], 4)
                    for r in s["rives"]:
                        self.assertIn(r, biome["rives"], f"rive « {r} » inconnue du biome")
                for p in n.get("reperes", []):
                    self.assertIn(p["section"], noms)
                    self.assertIn(p["sprite"], biome["sprites"])
                for r in biome["regles"]:
                    for nom in r["sprites"]:
                        self.assertIn(nom, biome["sprites"])
                    for nom in (r.get("sections") or []) + r.get("sauf", []):
                        self.assertIn(nom, noms, f"la règle « {r['nom']} » parle d'une section qui n'existe pas : {nom}")

    def test_les_images_du_biome_existent(self):
        for f in (RACINE / "biomes").glob("*.json"):
            for nom, d in json.loads(f.read_text(encoding="utf-8"))["sprites"].items():
                if "img" in d:
                    self.assertTrue((RACINE.parent / "scenes" / "circuit" / d["img"]).exists(), f"image manquante : {d['img']}")

    def test_la_page_s_assemble(self):
        import sys
        sys.path.insert(0, str(RACINE.parent))
        import rameur_page
        page = rameur_page.page({"lien": None})
        for marque in ("__DONNEES__", "__NIVEAU__", "__BIOME__", "__MODULES__"):
            self.assertNotIn(marque, page)
        self.assertIn("const PISTE", page)


if __name__ == "__main__":
    unittest.main()
