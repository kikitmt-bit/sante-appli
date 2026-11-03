"""Les règles du jeu, sans réseau ni données : à lancer avant chaque envoi (python -m unittest discover tests), et à chaque envoi sur GitHub."""
import datetime as dt
import sys
import unittest
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import missions  # noqa: E402
import pokemon  # noqa: E402

DEBUT = dt.date(2026, 11, 9)  # un lundi, après le changement de règles du 04/11


def seance(type_, minutes, nom=""):
    return {"exercise": {"exerciseType": type_, "displayName": nom, "activeDuration": f"{minutes * 60}s"}}


def jour(n):
    return DEBUT + dt.timedelta(days=n)


def stats(nb, **valeurs):
    base = {"pas": 3000, "zone": 0, "zone_sport": 0, "km": 2, "etages": 0, "sommeil": 400, "coucher": 1500, "seance_max": 0}
    return pd.DataFrame({jour(k): base | {c: (v[k] if isinstance(v, list) else v) for c, v in valeurs.items()} for k in range(nb)}).T


def partie(nb, gestes=None, resumes=None, **valeurs):
    pokemon.REGLAGES["debut"], pokemon.REGLAGES["partie"] = DEBUT, 99
    return pokemon.jouer(stats(nb, **valeurs), resumes or {}, jour(nb - 1), (), None, None, None, (), gestes or {})


def stats_de(jours_valeurs, defaut=None):
    defaut = defaut or {"pas": 3000, "km": 2, "zone_sport": 0, "seance_max": 0}
    return lambda j: jours_valeurs.get(j, defaut)


class Types(unittest.TestCase):
    def types(self, type_, nom=""):
        m = pokemon.mesures({"pas": 3000, "zone": 0, "zone_sport": 0, "etages": 0, "sommeil": 0}, [seance(type_, 25, nom)["exercise"]], DEBUT)
        return pokemon.origine_barre(m)

    def test_la_muscu_donne_combat_et_acier(self):
        for type_, nom in (("WEIGHTS", ""), ("STRENGTH_TRAINING", ""), ("SPORT", "Muscu")):
            self.assertEqual(self.types(type_, nom)[2], ["Combat", "Acier"])

    def test_les_autres_sports_gardent_leurs_types(self):
        self.assertEqual(self.types("ROWING_MACHINE")[2], ["Eau", "Glace"])
        self.assertEqual(self.types("OUTDOOR_BIKE")[2], ["Vol", "Normal"])
        self.assertIsNone(self.types("SPORT", "Padel")[2])

    def test_le_rameur_compte_toujours_pour_ondine(self):
        m = pokemon.mesures({"pas": 0, "zone": 0, "zone_sport": 0, "etages": 0, "sommeil": 0}, [seance("ROWING", 20)["exercise"]], DEBUT)
        self.assertEqual(m["eau"], 20)
        self.assertEqual(m["force"], 20)

    def test_pompes_et_squats_comptent_pour_les_types(self):
        m = pokemon.mesures({"pas": 3000, "zone": 0, "zone_sport": 0, "etages": 0, "sommeil": 0}, [], DEBUT)
        m["gestes_pts"] = 15
        self.assertEqual(pokemon.origine_barre(m)[2], ["Combat", "Acier"])


class Points(unittest.TestCase):
    def test_le_plafond_change_le_4_novembre(self):
        beaucoup = {"pompes": 500}
        self.assertEqual(pokemon.points_gestes(beaucoup, dt.date(2026, 11, 3)), 25)
        self.assertEqual(pokemon.points_gestes(beaucoup, dt.date(2026, 11, 4)), 40)

    def test_chaque_famille_rapporte_une_fois_par_semaine(self):
        g = {str(jour(k)): {"pompes": 10} for k in range(9)}
        _, etat = partie(3, gestes=g)
        sans = partie(3)[1]["cumul"]
        self.assertEqual(etat["cumul"] - sans, 3 * 5 + 15)  # 10 pompes = 5 points par jour, et +15 une seule fois
        lundi_suivant = partie(8, gestes=g)[1]["cumul"] - partie(8)[1]["cumul"]
        self.assertEqual(lundi_suivant, 8 * 5 + 2 * 15)  # une nouvelle semaine : encore +15

    def test_quatre_jours_d_objectif_une_seule_super_ball(self):
        captures, etat = partie(7, pas=6000)
        ids = [c["id"] for c in captures]
        self.assertEqual(sum(i.endswith("#hebdo") for i in ids), 1)
        self.assertTrue(any(i.startswith(str(jour(3))) and i.endswith("#hebdo") for i in ids))  # le 4e jour
        self.assertEqual(etat["semaine"]["jours_ok"], 7)

    def test_trois_jours_ne_suffisent_pas(self):
        captures, _ = partie(7, pas=[6000, 6000, 6000, 1000, 1000, 1000, 1000])
        self.assertFalse(any(c["id"].endswith("#hebdo") for c in captures))

    def test_quatre_sports_differents_une_super_ball(self):
        g = {str(jour(0)): {"pompes": 10, "tractions": 3, "squats": 20}}
        captures, etat = partie(2, gestes=g, pas=6000)
        self.assertEqual(sorted(etat["semaine"]["familles"]), ["jambes", "marche", "pousser", "tirer"])
        self.assertEqual(sum(c["id"].endswith("#variete") for c in captures), 1)

    def test_la_muscu_compte_comme_objectif_du_jour(self):
        g = {str(jour(k)): {"pompes": 30} for k in range(7)}
        self.assertEqual(partie(7, gestes=g)[1]["semaine"]["jours_ok"], 7)
        g = {str(jour(k)): {"pompes": 28} for k in range(7)}
        self.assertEqual(partie(7, gestes=g)[1]["semaine"]["jours_ok"], 0)

    def test_la_semaine_passee_est_gardee(self):
        _, etat = partie(9, pas=6000)
        self.assertEqual(etat["semaine_passee"]["lundi"], str(DEBUT))
        self.assertEqual(etat["semaine_passee"]["jours"], 7)
        self.assertEqual(etat["semaine"]["jours"], 2)

    def test_meme_partie_memes_captures(self):
        a, _ = partie(40, pas=7000)
        b, _ = partie(40, pas=7000)
        self.assertEqual([(c["id"], c["num"]) for c in a], [(c["id"], c["num"]) for c in b])

    def test_une_capture_figee_ne_change_pas(self):
        a, _ = partie(20, pas=7000)
        fixes = [dict(c) | {"num": 150} for c in a[1:6]]  # (pas le starter : il a besoin de ses évolutions)
        b, _ = pokemon.jouer(stats(20, pas=7000), {}, jour(19), fixes, None, None, None, (), {})
        self.assertEqual({c["id"]: c["num"] for c in b if c["id"] in {x["id"] for x in fixes}}, {c["id"]: 150 for c in fixes})


class Gestes(unittest.TestCase):
    def test_une_correction_negative_s_ajoute_a_la_serie(self):
        pokemon.REGLAGES["partie"] = 99
        p = pokemon.ident(DEBUT, "", None)
        traces = [f"{p}geste-squats_30_1000", f"{p}geste-squats_-2_2000"]
        self.assertEqual(pokemon.gestes_du(None, traces, None, DEBUT)[str(DEBUT)]["squats"], 28)


class Roue(unittest.TestCase):
    def tirages(self, nb=210, ami=None, valeurs=None, gestes=None):
        jours, stat = {}, stats_de(valeurs or {})
        for k in range(nb):
            jours[str(jour(k))] = missions.tirer(jour(k), stat, jours, ami, gestes)
        return [missions.MISSIONS[jours[str(jour(k))]["cle"]] for k in range(nb)]

    def test_toutes_les_familles_tournent(self):
        faites = [m["famille"] for m in self.tirages()]
        for f in missions.FAMILLES:
            self.assertGreaterEqual(faites.count(f) / len(faites), .1, f)

    def test_chaque_semaine_touche_toutes_les_familles_de_force(self):
        faites = [m["famille"] for m in self.tirages()]
        semaines = [faites[k:k + 7] for k in range(0, 203, 7)]
        for f in missions.FORCE:
            rate = sum(f not in s for s in semaines) / len(semaines)
            self.assertLess(rate, .2, f)

    def test_pas_la_meme_force_deux_jours_de_suite(self):
        faites = [m["famille"] for m in self.tirages()]
        for a, b in zip(faites, faites[1:]):
            self.assertFalse(a == b and a in missions.FORCE, (a, b))

    def test_jamais_trois_jours_de_force_de_suite(self):
        faites = [m["famille"] for m in self.tirages()]
        for a, b, c in zip(faites, faites[1:], faites[2:]):
            self.assertFalse(a in missions.FORCE and b in missions.FORCE and c in missions.FORCE, (a, b, c))

    def test_ce_qui_a_ete_fait_compte(self):
        # 7 jours de squats et de vélo : la roue propose autre chose que les jambes
        avant = {jour(-k): {"pas": 3000, "km": 2, "zone_sport": 0, "seance_max": 0, "min_velo": 20} for k in range(1, 8)}
        g = {str(jour(-k)): {"squats": 30} for k in range(1, 8)}
        ligne = missions.tirer(jour(0), stats_de(avant), {}, None, g)
        self.assertNotEqual(missions.MISSIONS[ligne["cle"]]["famille"], "jambes")

    def test_un_ami_n_a_pas_les_missions_de_materiel(self):
        self.assertFalse(any(m.get("materiel") for m in self.tirages(ami="a1b2c3d4e5f6")))

    def test_le_tirage_ne_change_pas(self):
        a = missions.tirer(jour(0), stats_de({}), {})
        self.assertEqual(a, missions.tirer(jour(0), stats_de({}), {}))

    def test_les_nouvelles_missions_se_mesurent(self):
        s = {"min_rameur": 12, "min_danse": 0, "min_velo": 25}
        info = lambda j: {}  # noqa: E731
        stat = lambda j: s  # noqa: E731
        self.assertTrue(missions.reussite("traversee", DEBUT, stat, info))
        self.assertFalse(missions.reussite("danse", DEBUT, stat, info))
        self.assertTrue(missions.reussite("tournee", DEBUT, stat, info))
        self.assertTrue(missions.reussite("pinces", DEBUT, stat, info, {str(DEBUT): {"tractions": 5}}))

    def test_jours_vides_sans_erreur(self):
        self.assertEqual(missions.familles_du({"pas": float("nan"), "zone_sport": None}), set())


if __name__ == "__main__":
    unittest.main()
