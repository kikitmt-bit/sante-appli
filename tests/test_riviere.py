"""Contrôle les fichiers du rameur « La Rivière » (riviere/) : un niveau, une région ou un lieu mal écrit se voit ici, avant le jeu."""
import json
import re
import unittest
from pathlib import Path

R = Path(__file__).resolve().parent.parent / "riviere"
lis = lambda *p: json.loads(R.joinpath(*p).read_text(encoding="utf-8"))
OBJETS = set(re.findall(r"^  (\w+)\(F", (R / "js" / "objets.js").read_text(encoding="utf-8"), re.M))


class Riviere(unittest.TestCase):
    def test_objets_du_kit(self):
        self.assertIn("maison", OBJETS)
        self.assertIn("arbre", OBJETS)

    def test_regions(self):
        for f in (R / "biomes").glob("*.json"):
            b = lis("biomes", f.name)
            for nom, rive in b["rives"].items():
                self.assertIn(rive["paroi"], b["sols"], f"{f.name} : paroi de {nom}")
                for sol, _ in rive["sols"]:
                    self.assertIn(sol, b["sols"], f"{f.name} : sol de {nom}")
                self.assertEqual(rive["profil"], sorted(rive["profil"]), f"{f.name} : le profil de {nom} doit s'éloigner de l'eau")
            for r in b["regles"]:
                for o in r["objets"]:
                    self.assertIn(o, OBJETS, f"{f.name} : règle {r['nom']}")
                for s in r["sur"]:
                    self.assertIn(s, b["rives"], f"{f.name} : règle {r['nom']}")
                self.assertLess(r["bande"][0], r["bande"][1])
                self.assertGreater(r["pas"], 0)

    def test_lieux(self):
        for f in (R / "lieux").glob("*.json"):
            for nom, lieu in lis("lieux", f.name).items():
                if nom == "note":
                    continue
                for o in lieu["objets"]:
                    self.assertIn(o["o"], OBJETS, f"{f.name} : {nom}")
                    self.assertLessEqual(o["a"], lieu["long"], f"{f.name} : {nom}, {o['o']} dépasse du lieu")

    def test_niveaux(self):
        for f in (R / "niveaux").glob("*.json"):
            n = lis("niveaux", f.name)
            b, lieux = lis("biomes", n["biome"] + ".json"), lis("lieux", n.get("lieux", n["biome"]) + ".json")
            if n.get("boucle"):
                self.assertEqual(sum(1 for p in n["pieces"] if p.get("virage") == "auto"), 1, f"{f.name} : une boucle a une pièce au virage « auto »")
            for p in n["pieces"]:
                for c in (p["g"], p["d"]):
                    self.assertIn(c, b["rives"], f"{f.name} : rive inconnue")
                self.assertGreaterEqual(p["eau"], 6, f"{f.name} : rivière trop étroite")
                # jamais un virage plus serré que ce que les rives supportent (le ruban des rives fait 13,5 m)
                if p.get("virage") == "auto":
                    self.assertTrue(n.get("boucle"), f"{f.name} : « auto » ne sert que dans une boucle")
                elif p.get("virage"):
                    rayon = p["long"] / abs(p["virage"] * 3.14159 / 180)
                    self.assertGreater(rayon, p["eau"] / 2 + 18, f"{f.name} : virage trop serré ({p.get('nom', '')})")
                if p.get("tunnel"):
                    self.assertGreaterEqual(p["long"], 40, f"{f.name} : une pièce à tunnel fait 40 m au moins")
                for L in p.get("lieux", []):
                    self.assertIn(L["lieu"], lieux, f"{f.name} : lieu inconnu")
                    self.assertLessEqual(L.get("a", 0) + lieux[L["lieu"]]["long"], p["long"] + 4, f"{f.name} : {L['lieu']} dépasse de sa pièce")
                for o in p.get("objets", []):
                    self.assertIn(o["o"], OBJETS, f"{f.name} : objet inconnu")


if __name__ == "__main__":
    unittest.main()
