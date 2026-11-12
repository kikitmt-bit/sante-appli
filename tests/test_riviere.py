"""Contrôle « La Rivière » (riviere/) : un niveau, une région ou un lieu mal écrit se voit ici, avant le jeu.
Deux sortes de contrôles : la lecture des fichiers (toujours), et le moteur lancé pour de vrai, sans navigateur ni dessin
(avec node, présent sur GitHub : la piste, le terrain et tout le décor de chaque niveau sont construits ; passé si node manque)."""
import json
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

R = Path(__file__).resolve().parent.parent / "riviere"
C = R / "contenu"
lis = lambda *p: json.loads(C.joinpath(*p).read_text(encoding="utf-8"))
OBJETS = {n for f in (C / "objets").glob("*.js") for n in re.findall(r"^  (\w+)\(F", f.read_text(encoding="utf-8"), re.M)}
SURFACES = set(re.findall(r"^SURFACES\.(\w+) = ", (R / "moteur" / "surfaces.js").read_text(encoding="utf-8"), re.M))
NIVEAUX = sorted(f.stem for f in (C / "niveaux").glob("*.json"))
sys.path.insert(0, str(R))
import page as _page  # noqa: E402
region = lambda nom: _page.region(nom)  # une région avec ce dont elle hérite (comme le jeu)


class Fichiers(unittest.TestCase):
    def test_objets_du_kit(self):
        self.assertIn("maison", OBJETS)
        self.assertIn("arbre", OBJETS)
        self.assertIn("eau", SURFACES)
        self.assertIn("terre", SURFACES)

    def test_regions(self):
        for f in (C / "biomes").glob("*.json"):
            b = region(f.stem)
            for nom, rive in b["rives"].items():
                self.assertIn(rive["paroi"], b["sols"], f"{f.name} : paroi de {nom}")
                for sol, _ in rive["sols"]:
                    self.assertIn(sol, b["sols"], f"{f.name} : sol de {nom}")
                self.assertEqual(rive["profil"], sorted(rive["profil"]), f"{f.name} : le profil de {nom} doit s'éloigner de la piste")
            for r in b["regles"]:
                for o in r["objets"]:
                    self.assertIn(o, OBJETS, f"{f.name} : règle {r['nom']}")
                for s in r["sur"]:
                    self.assertIn(s, b["rives"], f"{f.name} : règle {r['nom']}")
                self.assertLess(r["bande"][0], r["bande"][1])
                self.assertGreater(r["pas"], 0)

    def test_lieux(self):
        for f in (C / "lieux").glob("*.json"):
            for nom, lieu in lis("lieux", f.name).items():
                if nom == "note":
                    continue
                for o in lieu["objets"]:
                    self.assertIn(o["o"], OBJETS, f"{f.name} : {nom}")
                    self.assertLessEqual(o["a"], lieu["long"], f"{f.name} : {nom}, {o['o']} dépasse du lieu")

    def test_niveaux(self):
        for nom in NIVEAUX:
            n = lis("niveaux", nom + ".json")
            b, lieux = region(n["biome"]), lis("lieux", n.get("lieux", n["biome"]) + ".json")
            pieces = n["pieces"]
            if n.get("boucle"):  # une boucle se referme par une pièce « raccord » à la fin (ou, à l'ancienne, par une pièce au virage « auto »)
                autos = sum(1 for p in pieces if p.get("virage") == "auto")
                self.assertTrue(pieces[-1].get("raccord") or autos == 1, f"{nom} : une boucle finit par une pièce « raccord »")
            self.assertEqual(sum(1 for p in pieces[:-1] if p.get("raccord")), 0, f"{nom} : « raccord » ne se met qu'à la fin")
            if n.get("surface"):
                self.assertIn(n["surface"], SURFACES, f"{nom} : surface inconnue")
            for p in pieces:
                large = p.get("large", p.get("eau"))
                for c in (p["g"], p["d"]):
                    self.assertIn(c, b["rives"], f"{nom} : rive inconnue")
                self.assertGreaterEqual(large, 5, f"{nom} : piste trop étroite")
                if p.get("surface"):
                    self.assertIn(p["surface"], SURFACES | set(b.get("eaux", {})), f"{nom} : surface inconnue")
                if isinstance(p.get("tunnel"), str):
                    self.assertIn(p["tunnel"], b.get("grottes", {}), f"{nom} : grotte inconnue")
                if p.get("raccord"):
                    self.assertTrue(n.get("boucle"), f"{nom} : « raccord » ne sert que dans une boucle")
                    continue
                if p.get("virage") == "auto":
                    self.assertTrue(n.get("boucle"), f"{nom} : « auto » ne sert que dans une boucle")
                elif p.get("virage"):  # les rives se rétrécissent toutes seules dans une épingle : il suffit que la piste ne se replie pas sur elle-même
                    rayon = p["long"] / abs(p["virage"] * 3.14159 / 180)
                    self.assertGreater(rayon, large / 2 + 1.5, f"{nom} : virage trop serré ({p.get('nom', '')})")
                if p.get("tunnel"):
                    self.assertGreaterEqual(p["long"], 40, f"{nom} : une pièce à tunnel fait 40 m au moins")
                    self.assertFalse(p.get("pont"), f"{nom} : une pièce ne peut pas être à la fois un pont et un tunnel")
                for L in p.get("lieux", []):
                    self.assertIn(L["lieu"], lieux, f"{nom} : lieu inconnu")
                    self.assertLessEqual(L.get("a", 0) + lieux[L["lieu"]]["long"], p["long"] + 4, f"{nom} : {L['lieu']} dépasse de sa pièce")
                for o in p.get("objets", []):
                    self.assertIn(o["o"], OBJETS, f"{nom} : objet inconnu")

    def test_pas_de_code_avale(self):
        """Une instruction ne doit jamais se retrouver derrière un commentaire de fin de ligne (deux bugs en novembre 2026)."""
        for f in list((R / "moteur").glob("*.js")) + list((R / "jeu").glob("*.js")) + list((C / "objets").glob("*.js")) + [R / "controle.js"]:
            for i, ligne in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
                k = ligne.find("//")
                while k > 0 and ligne[k - 1] == ":":  # une adresse (https://…) n'est pas un commentaire
                    k = ligne.find("//", k + 2)
                if k < 0:
                    continue
                self.assertIsNone(re.search(r";\s*(const|let|if|for|return)\b|\)\s*;\s*\w+[.(]", ligne[k:]), f"{f.name}:{i} : du code derrière un commentaire ?")


@unittest.skipUnless(shutil.which("node"), "node n'est pas installé ici : le moteur n'est lancé que sur GitHub")
class Moteur(unittest.TestCase):
    """Le moteur, lancé pour de vrai sur chaque niveau (sans dessin) : la piste se referme, le sol n'a ni trou ni cassure, le décor est posé."""

    def bilan(self, niveau, params=""):
        import page
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "controle.js"
            f.write_text(page.controle(niveau, params), encoding="utf-8")
            r = subprocess.run(["node", str(f)], capture_output=True, text=True, encoding="utf-8", timeout=120)
        self.assertEqual(r.returncode, 0, f"{niveau} : le moteur plante\n{r.stderr[-1500:]}")
        lignes = [l for l in r.stdout.splitlines() if l.startswith("BILAN ")]
        self.assertTrue(lignes, f"{niveau} : pas de bilan\n{r.stdout[-500:]}")
        return json.loads(lignes[-1][6:])

    def test_chaque_niveau(self):
        for nom in NIVEAUX:
            b = self.bilan(nom)
            self.assertTrue(b["ok"], f"{nom} : {b['erreurs']}")
            self.assertEqual(b["absurdes"], 0, f"{nom} : des hauteurs de sol absurdes")
            self.assertEqual(b["cassures"], 0, f"{nom} : des cassures dans le sol (la pire : {b['pire']} m)")
            self.assertGreater(b["poses"], 100, f"{nom} : presque aucun décor posé")
            self.assertGreater(b["triangles"], 5000, f"{nom} : décor vide")
            if lis("niveaux", nom + ".json").get("boucle"):
                self.assertLess(b["fermeture"], 3, f"{nom} : la boucle se referme mal")

    def test_le_huit(self):
        """Le circuit d'essai : un croisement, avec un pont au-dessus ; il se joue aussi sur la terre."""
        b = self.bilan("essai")
        self.assertEqual(len(b["croisements"]), 1)
        self.assertTrue(b["croisements"][0]["bon"])
        self.assertGreater(b["ponts"], 30)
        self.assertGreater(b["haut"], 5)
        self.assertGreater(b["rives_serrees"], 20, "l'épingle doit rétrécir ses rives")
        self.assertEqual(self.bilan("essai", "?surface=terre")["surfaces"], ["terre"])

    def test_anciens_niveaux(self):
        """Un ancien fichier de niveau marche toujours : le tour de Bourg Palette fait 2 000 m, à plat."""
        b = self.bilan("kanto-1km")
        self.assertEqual(b["longueur"], 2000)
        self.assertEqual(b["haut"], 0)
        self.assertEqual(b["evenements"], 3)


if __name__ == "__main__":
    unittest.main()
