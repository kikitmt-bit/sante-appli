"""Contrôle « La Rivière » (riviere/) : un niveau, une région ou un lieu mal écrit se voit ici, avant le jeu.
Deux sortes de contrôles : la lecture des fichiers (toujours), et le moteur lancé pour de vrai, sans navigateur ni dessin
(avec node, présent sur GitHub : la piste, le terrain et tout le décor de chaque niveau sont construits ; passé si node manque)."""
import json
import time
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
OBJETS = {n for d in ("objets", "evenements") for f in (C / d).glob("*.js") for n in re.findall(r"^  (\w+)\(F", f.read_text(encoding="utf-8"), re.M)}  # les recettes : objets/ et evenements/ (Ronflex)
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

    def test_nageurs(self):
        """Les Pokémon qui nagent : chacun a sa vraie taille (celle du Pokédex), une part du corps sous l'eau et une façon de nager connue."""
        nages = set(re.findall(r"(\w+): \{leve:", (R / "moteur" / "monture.js").read_text(encoding="utf-8")))
        n = _page.nageurs()
        nums = [p["num"] for p in n["liste"]]
        self.assertEqual(len(nums), len(set(nums)), "un nageur est cité deux fois")
        self.assertIn(n["defaut"], nums)
        for p in n["liste"]:
            self.assertTrue(p.get("nom"), p)
            self.assertTrue(p.get("taille") and 0.2 <= p["taille"] <= 9, f"{p['nom']} : pas de taille au Pokédex")
            self.assertTrue(0 <= p.get("enfonce", 0.42) <= 0.7, p["nom"])
            self.assertTrue(0.3 <= p.get("part", 1) <= 1, p["nom"])
            self.assertIn(p.get("style", "brasse"), nages, p["nom"])

    def test_trotteurs(self):
        """Les Pokémon qui trottinent au skieur de fond : chacun a sa vraie taille, un rythme de foulée connu, et la monture du contenu existe."""
        t = _page.trotteurs()
        nums = [p["num"] for p in t["liste"]]
        self.assertTrue(nums, "aucun trotteur")
        self.assertEqual(len(nums), len(set(nums)), "un trotteur est cité deux fois")
        self.assertIn(t["defaut"], nums)
        self.assertFalse(set(nums) & {p["num"] for p in _page.nageurs()["liste"]}, "un Pokémon est à la fois nageur et trotteur")
        for p in t["liste"]:
            self.assertTrue(p.get("nom"), p)
            self.assertTrue(p.get("taille") and 0.2 <= p["taille"] <= 9, f"{p['nom']} : pas de taille au Pokédex")
            self.assertIn(p.get("cycles", 1), (1, 2), p["nom"])
            self.assertTrue(0 <= p.get("foulee", 0.05) <= 0.15, p["nom"])
        self.assertIn("MONTURES.trotteur = ", (C / "montures" / "trotteur.js").read_text(encoding="utf-8"))
        for f in ("moteur/monture.js", "moteur/velo.js", "moteur/cycliste.js", "jeu/allure.js", "jeu/seance.js"):  # les rollers ont été retirés (16/11, Kiki)
            self.assertNotIn("patin", (R / f).read_text(encoding="utf-8").replace("Pantin", ""), f)

    def test_cycliste_sprite(self):
        """La planche du dresseur à vélo en sprite (outils/atelier_velo.py) : 4 animations sous 7 angles, rangées comme la fiche le dit."""
        for nom in ("cycliste", "cycliste_seul"):   # le dresseur et son vélo ; le dresseur seul, pour le vélo 3D (atelier_velo.py --seul)
            c = _page.cycliste_sprite(nom)
            self.assertIsNotNone(c, f"contenu/montures/{nom}.png ou .json manque : python riviere/outils/atelier_velo.py")
            f = c["fiche"]
            self.assertEqual({(g["etat"], g["deg"]) for g in f["rangs"]}, {(e, d) for e in ("assis", "danseuse", "ramasse", "arret") for d in (0, 12, 25, 45, 90, 135, 180)})
            png = (C / "montures" / f"{nom}.png").read_bytes()   # la taille de l'image, lue dans l'en-tête du PNG (sans bibliothèque : GitHub n'a pas Pillow)
            self.assertEqual(png[:4], bytes([137, 80, 78, 71]))
            self.assertEqual((int.from_bytes(png[16:20], "big"), int.from_bytes(png[20:24], "big")), (f["w"] * 8, f["h"] * len(f["rangs"])))
            self.assertTrue(set(f["cles"]) >= {"peau", "cas", "ves", "pan"})
        js = (C / "montures" / "cycliste_sprite.js").read_text(encoding="utf-8")
        self.assertIn("MONTURES.cycliste3D = TROIS_D", js)  # le vélo 3D reste disponible (réglage « Ton cycliste »)

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
            toutes, dans_voie = [], set()
            for p in pieces:  # une fourche (étape 7 du plan) : deux voies, de vraies pièces dans chacune, les mêmes longueurs et le même virage au total
                if not p.get("fourche"):
                    toutes.append(p)
                    continue
                self.assertTrue(p.get("calme") and len(p.get("force", [])) >= 3, f"{nom} : une fourche a une voie calme et une voie « force » d'au moins trois pièces")
                self.assertFalse(any(q.get("fourche") or q.get("raccord") for q in p["calme"] + p["force"]), f"{nom} : ni fourche ni raccord dans une fourche")
                self.assertFalse(any(q.get("virage") == "auto" for q in p["calme"]), f"{nom} : pas de virage « auto » dans la voie calme")
                lc, lf = sum(q["long"] for q in p["calme"]), sum(q["long"] for q in p["force"])
                self.assertLess(abs(lc - lf), .25 * lc, f"{nom} : les deux voies d'une fourche ont à peu près la même longueur")
                if not any(q.get("virage") == "auto" for q in p["force"]):
                    self.assertAlmostEqual(sum(q.get("virage", 0) for q in p["calme"]), sum(q.get("virage", 0) for q in p["force"]), delta=.5, msg=f"{nom} : les deux voies tournent d'autant")
                toutes += p["calme"] + p["force"]
                dans_voie.update(id(q) for q in p["force"])
            for p in toutes:
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
                    self.assertTrue(n.get("boucle") or id(p) in dans_voie, f"{nom} : « auto » ne sert que dans une boucle (ou dans la voie « force » d'une fourche)")
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

    def test_note_et_generateur(self):
        """La note d'un circuit (jeu/note.js) : ses poids font 100 ; les habits que le générateur donne aux rives existent dans leur région."""
        note = (R / "jeu" / "note.js").read_text(encoding="utf-8")
        poids = re.search(r"const POIDS_NOTE = \{([^}]*)\}", note).group(1)
        self.assertEqual(sum(int(v) for v in re.findall(r": (\d+)", poids)), 100)
        gen = (R / "jeu" / "generateur.js").read_text(encoding="utf-8")
        for act, biome in (("eau", "kanto"), ("terre", "kanto-routes")):
            habits = re.search(act + r": \[(\[.*?\])\]", gen[gen.index("const HABITS"):]).group(1)
            for rive in set(re.findall(r'"(\w+)"', habits)):
                self.assertIn(rive, region(biome)["rives"], f"habit du générateur ({act}) : rive inconnue")
        self.assertIn("genererCircuit(", _page.generateur({"km": 1}))

    def test_planche(self):
        """La planche (outils/planche.py) s'assemble à partir de ce que rend la note, sans navigateur."""
        sys.path.insert(0, str(R / "outils"))
        try:
            from PIL import Image
        except ImportError:
            self.skipTest("Pillow absent (la planche ne sert que sur le PC de Kiki)")
        import planche
        plan = {"nom": "Essai", "terre": False, "duree": 200, "note": 70,
                "criteres": [{"nom": "Rythme", "note": 80, "phrase": "ok"}, {"nom": "Relief", "note": 30, "phrase": "plat"}],
                "sequences": [{"paysage": "pre et foret", "t0": 0, "t1": 120}, {"paysage": "grotte", "t0": 120, "t1": 230}],
                "reperes": [{"t": 3, "quoi": "bourg-palette"}], "forts": [{"t": 150, "quoi": "grotte"}],
                "vues": [{"t": 60, "quoi": "pré", "sorte": "paysage"}, {"t": 150, "quoi": "grotte", "sorte": "fort"}]}
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "p.png"
            planche.assembler(plan, [Image.new("RGB", (960, 540), "#88AACC")] * 2, f)
            self.assertGreater(Image.open(f).width, 1000)

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

    BILANS = {}   # (16/11) un niveau n'est construit qu'une fois pour tous les tests (le Ventoux entier prend dix secondes)

    def bilan(self, niveau, params=""):
        import page
        if (niveau, params) in self.BILANS:
            return json.loads(self.BILANS[niveau, params])
        t = time.time()
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "controle.js"
            f.write_text(page.controle(niveau, params), encoding="utf-8")
            r = subprocess.run(["node", str(f)], capture_output=True, text=True, encoding="utf-8", timeout=240)
        self.assertEqual(r.returncode, 0, f"{niveau} : le moteur plante\n{r.stderr[-1500:]}")
        lignes = [l for l in r.stdout.splitlines() if l.startswith("BILAN ")]
        self.assertTrue(lignes, f"{niveau} : pas de bilan\n{r.stdout[-500:]}")
        b = json.loads(lignes[-1][6:])
        b["secondes"] = round(time.time() - t, 1)
        self.BILANS[niveau, params] = json.dumps(b)
        return b

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
        """Le circuit d'essai : un croisement, avec un pont au-dessus. C'est un circuit d'eau : depuis le 12/11 (Kiki), un circuit
        d'eau ne devient jamais un chemin, même avec ?surface=terre dans l'adresse (ce réglage ne sert plus)."""
        b = self.bilan("essai")
        self.assertEqual(len(b["croisements"]), 1)
        self.assertTrue(b["croisements"][0]["bon"])
        self.assertGreater(b["ponts"], 30)
        self.assertGreater(b["haut"], 5)
        self.assertGreater(b["rives_serrees"], 20, "l'épingle doit rétrécir ses rives")
        self.assertEqual(self.bilan("essai", "?surface=terre")["surfaces"], ["eau"])

    def test_anciens_niveaux(self):
        """Un ancien fichier de niveau marche toujours : le tour de Bourg Palette fait 2 000 m, à plat."""
        b = self.bilan("kanto-1km")
        self.assertEqual(b["longueur"], 2000)
        self.assertEqual(b["haut"], 0)
        self.assertEqual(b["evenements"], 3)

    def test_notes(self):
        """Chaque circuit du jeu a sa note (étape 4 du plan) : sept critères de 0 à 100, des séquences de paysage qui couvrent le tour."""
        for nom in NIVEAUX:
            n = self.bilan(nom)["note"]
            self.assertEqual(len(n["criteres"]), 7, nom)
            for c in n["criteres"]:
                self.assertTrue(0 <= c["note"] <= 100 and c["phrase"], f"{nom} : {c}")
            self.assertTrue(0 <= n["note"] <= 100, nom)
            if not lis("niveaux", nom + ".json").get("route"):   # (une vraie route peut traverser 20 km de forêt : son paysage est celui du vrai lieu)
                self.assertGreater(len(n["sequences"]), 1, f"{nom} : un seul paysage ?")
            self.assertAlmostEqual(sum(s["t"] for s in n["sequences"]), n["duree"], delta=len(n["sequences"]) + 2, msg=f"{nom} : les séquences ne couvrent pas le tour")

    def test_fourches(self):
        """Les fourches (étape 7 du plan) : la voie « force » rejoint la ligne, à la même hauteur, avec autant de mètres et les MÊMES vrais mètres que la
        voie calme (un seul record par circuit) ; elle a son décor ; un circuit sans fourche n'en porte aucune trace ; le générateur sait en poser une."""
        b = self.bilan("fourche")
        self.assertTrue(b["ok"], b["erreurs"])
        self.assertEqual(len(b["fourches"]), 1)
        f, v = b["fourches"][0], b["voies"][0]
        self.assertLess(f["ecart"], 1, "la voie « force » doit arriver sur la ligne")
        self.assertEqual(b["metres"], b["longueur"] + f["a"] - f["de"], "la voie « force » a autant de mètres que la calme")
        self.assertAlmostEqual(v["calme"], v["force"], delta=.02, msg="les deux voies comptent les mêmes vrais mètres")
        self.assertEqual(v["bouts"], [0, 0], "aux deux bouts, les deux voies sont à la même hauteur")
        self.assertGreater(v["ecart_haut"], 1.5, "la voie « force » a sa chute")
        self.assertGreater(v["poses"], 20, "la voie « force » a son décor")
        self.assertIn("fourche", [x["quoi"] for x in b["note"]["forts"]])
        k = self.bilan("kanto-1km")
        self.assertEqual((k["fourches"], k["voies"], k["metres"]), ([], [], k["longueur"]))
        g = self.generer({"km": 1.5, "avec": {"fourche": True}, "graine": 2, "tirages": 2})
        self.assertNotIn("erreur", g)
        fourches = [p for p in g["niveau"]["pieces"] if p.get("fourche")]
        self.assertEqual(len(fourches), 1, "la case « fourche » en pose une")
        self.assertFalse(any(k in fourches[0] for k in ("long", "virage", "fixe")), "des marques de travail sont restées sur la fourche")
        bilan = self.controle_de(g["niveau"])
        self.assertTrue(bilan["ok"], bilan["erreurs"])
        self.assertEqual(bilan["cassures"], 0)
        self.assertAlmostEqual(bilan["voies"][0]["calme"], bilan["voies"][0]["force"], delta=.02)
        self.assertEqual(bilan["note"]["note"], g["note"]["note"])
        t = self.generer({"activite": "terre", "km": 1.5, "avec": {"fourche": True}, "denivele": 5, "graine": 5, "tirages": 2})
        self.assertTrue(any(p.get("fourche") for p in t["niveau"]["pieces"]))
        self.assertTrue(self.controle_de(t["niveau"])["ok"])

    def test_fourche_impossible(self):
        """Une fourche mal dessinée est refusée avec une phrase claire (elle ne casse jamais le jeu en silence)."""
        import page
        n = lis("niveaux", "fourche.json")
        fourche = next(p for p in n["pieces"] if p.get("fourche"))
        for p in fourche["force"]:
            p["virage"] = 0
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "controle.js"
            f.write_text(page.controle(circuit=n), encoding="utf-8")
            r = subprocess.run(["node", str(f)], capture_output=True, text=True, encoding="utf-8", timeout=120)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("Fourche", r.stderr)

    def generer(self, options):
        import page
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "generateur.js"
            f.write_text(page.generateur(options), encoding="utf-8")
            r = subprocess.run(["node", str(f)], capture_output=True, text=True, encoding="utf-8", timeout=300)
        self.assertEqual(r.returncode, 0, f"le générateur plante\n{r.stderr[-1500:]}")
        return json.loads([l for l in r.stdout.splitlines() if l.startswith("CIRCUIT ")][-1][8:])

    def controle_de(self, circuit):
        import page
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "controle.js"
            f.write_text(page.controle(circuit=circuit), encoding="utf-8")
            r = subprocess.run(["node", str(f)], capture_output=True, text=True, encoding="utf-8", timeout=120)
        self.assertEqual(r.returncode, 0, r.stderr[-1500:])
        return json.loads([l for l in r.stdout.splitlines() if l.startswith("BILAN ")][-1][6:])

    def test_generateur_sans_navigateur(self):
        """Le générateur tourne sans navigateur : mêmes options, même circuit (aucune limite de temps) ; ce qu'il rend tient debout, sol compris ;
        habiller les rives ne fait jamais baisser la note ; le retour d'une boucle est déplié et finit par son raccord."""
        o = {"km": 2, "avec": {"lac": True, "grotte": True, "cascade": True, "pont": True, "village": True}, "denivele": 25, "graine": 4, "tirages": 4}
        a, b = self.generer(o), self.generer(o)
        self.assertNotIn("erreur", a)
        self.assertEqual(json.dumps(a, sort_keys=True), json.dumps(b, sort_keys=True), "deux tirages aux mêmes options doivent donner le même circuit")
        self.assertTrue(a["niveau"]["pieces"][-1].get("raccord"))
        self.assertFalse(any("libre" in p or "fixe" in p for p in a["niveau"]["pieces"]), "des marques de travail sont restées dans le circuit")
        self.assertTrue(a["sol"]["ok"])
        bilan = self.controle_de(a["niveau"])
        self.assertTrue(bilan["ok"], bilan["erreurs"])
        self.assertEqual(bilan["cassures"], 0)
        self.assertEqual(bilan["note"]["note"], a["note"]["note"], "la note du générateur et celle du contrôle doivent être la même")
        nu = self.generer({**o, "habiller": False, "deplier": False, "sol": False})
        self.assertGreaterEqual(a["note"]["note"], nu["note"]["note"])
        terre = self.generer({"activite": "terre", "km": 2, "denivele": 40, "avec": {"village": True, "foret": True, "champs": True}, "graine": 3, "tirages": 4})
        self.assertEqual(terre["niveau"]["discipline"], "terre")
        self.assertTrue(self.controle_de(terre["niveau"])["ok"])

    def test_effets(self):
        """Étape 9 du plan (15/11) : l'eau qui coule, le vent, les forêts en masse et les ombres sont des options. Le circuit de Kiki
        (kanto-1km) n'en a aucune ; ailleurs, les couper rend le monde d'avant, et les forêts s'ajoutent sans déplacer un seul objet posé."""
        self.assertIs(lis("niveaux", "kanto-1km.json").get("effets"), False, "kanto-1km doit rester identique à l'œil : \"effets\": false")
        k, k0 = self.bilan("kanto-1km"), self.bilan("kanto-1km", "effets=0")
        self.assertEqual(k["effets"], [])
        self.assertEqual((k["triangles"], k["poses"], k["masse"], k["objets"]), (k0["triangles"], k0["poses"], 0, k0["objets"]))
        avec, sans, foret = self.bilan("vitrine"), self.bilan("vitrine", "effets=0"), self.bilan("vitrine", "effets=foret")
        self.assertEqual(avec["effets"], ["eau", "vent", "foret", "ombres"])
        self.assertEqual(sans["effets"], [])
        self.assertEqual((avec["objets"], avec["poses"], avec["sprites"]), (sans["objets"], sans["poses"], sans["sprites"]), "les forêts ne doivent déplacer aucun objet posé")
        self.assertEqual(sans["masse"], 0)
        self.assertGreater(avec["masse"], 800, "la vitrine a des rives boisées : une forêt en masse y pousse")
        self.assertLessEqual(avec["masse"], 3200, "le plafond d'arbres de la forêt en masse")
        self.assertEqual(foret["masse"], avec["masse"], "mêmes options, même forêt")
        self.assertGreater(avec["triangles"], sans["triangles"])
        for nom in ("kanto", "kanto-routes"):   # chaque forêt en masse nomme des rives qui existent
            b = region(nom)
            for r in b.get("forets", []):
                self.assertTrue(set(r["sur"]) <= set(b["rives"]), f"{nom} : forêt sur une rive inconnue ({r['sur']})")
                self.assertLess(r["bande"][0], r["bande"][1])

    # Budgets (14/11/2026, mesurés sur ce PC : 0,7 à 1,8 s, 36 000 à 146 000 triangles, page de 1 265 Ko) : environ 1,5 fois l'état
    # actuel. Un dépassement n'est pas une panne, c'est un signal : la page ou la construction a grossi d'un coup (page ×4 et
    # construction ×5 sur la vitrine, en novembre) ; on s'en rend compte avant que la tablette rame.
    BUDGET_TRIANGLES = 220000
    BUDGET_SECONDES = 8
    BUDGET_PAGE_KO = 1900

    def test_budgets(self):
        import page
        for nom in NIVEAUX:
            b = self.bilan(nom)
            km = max(1, b["metres"] / 2000)   # (16/11) une vraie route de 5 km (outils/gpx.py) : le budget d'un circuit de 2 km par tranche de 2 km
            self.assertLess(b["secondes"], self.BUDGET_SECONDES * km, f"{nom} : construction trop lente")
            self.assertLess(b["triangles"], self.BUDGET_TRIANGLES * km, f"{nom} : trop de triangles ({b['triangles']})")
            if b["troncons"]:   # une longue route, construite par tronçons : ce qui compte, c'est ce qu'on voit d'un coup (un kilomètre)
                self.assertLess(b["troncons"]["fenetre"], self.BUDGET_TRIANGLES, f"{nom} : trop de triangles dans un kilomètre ({b['troncons']['fenetre']})")
        ko = len(page.page(niveau=NIVEAUX[0]).encode("utf-8")) // 1024
        self.assertLess(ko, self.BUDGET_PAGE_KO, f"la page pèse {ko} Ko")


@unittest.skipUnless(shutil.which("node"), "node n'est pas installé ici : le moteur n'est lancé que sur GitHub")
class Troncons(unittest.TestCase):
    """Le monde par tronçons (étape 8 du plan, lot 3 : moteur/troncons.js) : une longue route n'est construite qu'autour de soi."""
    BILANS, bilan = Moteur.BILANS, Moteur.bilan

    def test_longue_route(self):
        """Le Ventoux entier : par tronçons tout seul (plus de 6 km), le même décor quel que soit l'ordre, rien dans l'objet du voisin."""
        b = self.bilan("ventoux")
        self.assertGreater(b["metres"], 20000)
        t = b["troncons"]
        self.assertTrue(t, "une route de plus de 6 km est construite par tronçons")
        self.assertGreater(t["faits"], 50)
        self.assertTrue(t["ordre"], "un tronçon refait à part, dans un autre ordre, doit donner le même décor")
        self.assertEqual(t["chevauchements"], 0, "deux tronçons voisins ont posé des objets l'un dans l'autre")
        self.assertGreater(b["poses"], 3000)

    def test_interrupteur(self):
        """Une route courte reste d'un bloc, sauf si on le demande ; une boucle n'est jamais par tronçons."""
        self.assertIsNone(self.bilan("col-ventoux")["troncons"])
        t = self.bilan("col-ventoux", "?troncons=1")["troncons"]
        self.assertTrue(t and t["ordre"] and t["chevauchements"] == 0)
        self.assertIsNone(self.bilan("kanto-1km", "?troncons=1")["troncons"])
        self.assertIsNone(self.bilan("fourche", "?troncons=1")["troncons"])

    def test_meme_piste(self):
        """Les tronçons ne changent ni la piste ni le sol : seulement la façon de les construire."""
        a, b = self.bilan("col-ventoux"), self.bilan("col-ventoux", "?troncons=1")
        for k in ("longueur", "tourVrai", "haut", "penteMax", "rayonMin", "absurdes", "cassures"):
            self.assertEqual(a[k], b[k], k)


class VraieRoute(unittest.TestCase):
    """L'outil des vraies routes (outils/gpx.py, étape 8 du plan) : la forme gardée à l'échelle 1:1, jamais une coordonnée."""

    def gpx(self, n=1400):
        # une route inventée : une ligne droite, une épingle très serrée, une montée de 8 %, autour d'un point quelconque
        import math
        pts, la, lo, alt = [], 45.0, 6.0, 800.0
        for k in range(n):
            if k < 400:
                x, y = 0.0, k * 1.0
            elif k < 430:
                a = (k - 400) / 30 * math.pi
                x, y = 4 - 4 * math.cos(a), 400 + 4 * math.sin(a)
            else:
                x, y = 8.0, 400 - (k - 430) * 1.0
            pts.append(f'<trkpt lat="{la + y / 111195:.7f}" lon="{lo + x / (111195 * math.cos(math.radians(la))):.7f}"><ele>{alt + .08 * k:.2f}</ele></trkpt>')
        return '<gpx><trk><trkseg>' + "".join(pts) + '</trkseg></trk></gpx>'

    def test_forme(self):
        sys.path.insert(0, str(R / "outils"))
        import gpx
        pts = gpx.lire_gpx(self.gpx())
        pieces, b = gpx.construire(pts, km=1.2, large=6, rayon=9)
        self.assertEqual(sum(p["long"] for p in pieces), b["long"])
        self.assertAlmostEqual(sum(p["monte"] for p in pieces), b["denivele"], delta=1)
        self.assertAlmostEqual(b["pente"], 8, delta=.6)
        for p in pieces:   # l'épingle de 4 m de rayon est élargie : jamais plus serré que 9 m
            self.assertLessEqual(abs(p["virage"]) / 57.2958 / p["long"], 1 / 9 + 1e-3)
        self.assertAlmostEqual(sum(p["virage"] for p in pieces), 180, delta=8)   # vers le nord puis par l'est : un demi-tour à droite (+ = à droite, comme dans le jeu)
        gpx.habiller(pieces, dict(b, large=6))
        n = gpx.niveau(pieces, b, "route-test", "Essai")
        texte = json.dumps(n)
        self.assertNotIn("45.0", texte); self.assertNotIn('"lat"', texte); self.assertNotIn('"lon"', texte)
        self.assertIs(n["allurePente"], False)
        self.assertTrue(any(o["o"] == "arche_arrivee" for p in pieces for o in p.get("objets", [])))

    def test_longueur(self):
        """Depuis les tronçons (lot 3), une route n'est plus limitée à 5 km : 60 au plus."""
        sys.path.insert(0, str(R / "outils"))
        import gpx
        pts = gpx.lire_gpx(self.gpx(9000))
        pieces, b = gpx.construire(pts, km=8, large=6, rayon=9)
        self.assertEqual(b["long"], 8000)
        with self.assertRaises(ValueError):
            gpx.construire(pts, km=61)


if __name__ == "__main__":
    unittest.main()
