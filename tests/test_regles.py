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

    def test_le_rameur_vaut_comme_les_autres_sports(self):
        vide = {"pas": 0, "zone": 0, "zone_sport": 0, "etages": 0, "sommeil": 0}
        rameur, muscu, velo = [pokemon.mesures(vide, [seance(t, 20)["exercise"]], DEBUT)["points"]["sport"] for t in ("ROWING_MACHINE", "WEIGHTS", "OUTDOOR_BIKE")]
        self.assertEqual((rameur, muscu, velo), (20, 40, 20))
        avant = pokemon.mesures(vide, [seance("ROWING_MACHINE", 20)["exercise"]], dt.date(2026, 11, 4))["points"]["sport"]
        self.assertEqual(avant, 40)  # les jours passés ne bougent pas

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


class Danse(unittest.TestCase):
    def setUp(self):
        pokemon.REGLAGES["debut"], pokemon.REGLAGES["partie"] = DEBUT, 99
        self.p = pokemon.ident(DEBUT, "", None)

    def test_un_seul_point_par_jour(self):
        traces = [f"{self.p}geste-danse_1_1000", f"{self.p}geste-danse_1_2000"]
        g = pokemon.gestes_du(None, traces, None, DEBUT)[str(DEBUT)]
        self.assertEqual(pokemon.points_gestes(g, DEBUT), 1)

    def test_le_meilleur_score_de_chaque_morceau(self):
        traces = [f"{self.p}danse-zinnia-Beginner_700_1", f"{self.p}danse-zinnia-Beginner_873_2", f"{self.p}danse-red-Hard_500_3"]
        g = pokemon.gestes_du(None, traces, None, DEBUT)
        self.assertEqual(pokemon.meilleurs_scores(g), {"zinnia_Beginner": 873, "red_Hard": 500})
        self.assertEqual(pokemon.points_gestes(g[str(DEBUT)], DEBUT), 0)  # un score seul ne donne aucun point

    def test_le_score_d_un_autre_joueur_est_ignore(self):
        autre = pokemon.ident(DEBUT, "", "aaaaaaaaaaaa")
        self.assertEqual(pokemon.meilleurs_scores(pokemon.gestes_du(None, [f"{autre}danse-red-Hard_500_3"], None, DEBUT)), {})

    def test_les_scores_restent_apres_20_jours(self):
        ancien = {"jours": {str(jour(-40)): {"pompes": 0, "scores": {"red_Hard": 900}}}}
        self.assertEqual(pokemon.meilleurs_scores(pokemon.gestes_du(ancien, [], None, DEBUT)), {"red_Hard": 900})


class Annuler(unittest.TestCase):
    def test_une_serie_annulee_ne_compte_plus(self):
        pokemon.REGLAGES["debut"], pokemon.REGLAGES["partie"] = DEBUT, 99
        p = pokemon.ident(DEBUT, "", None)
        g = pokemon.gestes_du(None, [f"{p}geste-planche_33_1000", f"{p}geste-planche_-33_2000"], None, DEBUT)[str(DEBUT)]
        self.assertEqual(g["planche"], 0)
        self.assertEqual(pokemon.points_gestes(g, DEBUT), 0)

    def test_une_serie_de_pompes_annulee_bien_plus_tard_ne_compte_plus(self):
        h = 60 * 60 * 1000
        self.assertEqual(pokemon.series_de([(0, 10), (h, 10), (9 * h, -10)]), 1)
        self.assertEqual(pokemon.series_de([(0, 10), (h, 10), (2 * h, 10)]), 3)


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

    def test_la_premiere_fois_on_commence_doucement(self):
        stat = stats_de({})
        self.assertEqual(missions.possible("defi", jour(0), stat), 10)
        self.assertEqual(missions.possible("cuisses", jour(0), stat), 20)
        self.assertEqual(missions.possible("pinces", jour(0), stat), 2)
        self.assertIsNone(missions.possible("serie", jour(0), stat))

    def test_la_mission_monte_avec_ce_qui_a_ete_fait(self):
        stat = stats_de({})
        self.assertEqual(missions.possible("defi", jour(0), stat, {str(jour(-3)): {"pompes": 10}}), 15)
        self.assertEqual(missions.possible("defi", jour(0), stat, {str(jour(-3)): {"pompes": 15}}), 20)
        self.assertEqual(missions.possible("defi", jour(0), stat, {str(jour(-3)): {"pompes": 60}}), 20)
        self.assertEqual(missions.possible("serie", jour(0), stat, {str(jour(-3)): {"pompes": 20}}), 3)

    def test_apres_une_longue_pause_on_repart_doucement(self):
        self.assertEqual(missions.possible("defi", jour(0), stats_de({}), {str(jour(-29)): {"pompes": 40}}), 10)

    def test_le_seuil_du_jour_est_celui_qui_est_affiche_et_verifie(self):
        info = lambda j: {"seuil": 10}  # noqa: E731
        stat = stats_de({})
        self.assertTrue(missions.reussite("defi", DEBUT, stat, info, {str(DEBUT): {"pompes": 10}}))
        self.assertFalse(missions.reussite("defi", DEBUT, stat, info, {str(DEBUT): {"pompes": 9}}))

    def test_progresser_rapporte_plus(self):
        self.assertEqual([missions.bonus_de("defi", {"seuil": s}) for s in (10, 15, 20)], [20, 25, 30])
        self.assertEqual([missions.bonus_de("cuisses", {"seuil": s}) for s in (20, 35, 50)], [20, 25, 30])
        self.assertEqual([missions.bonus_de("pinces", {"seuil": s}) for s in (2, 3, 5)], [20, 25, 30])
        self.assertEqual(missions.bonus_de("serie", {"seuil": 3}), 40)
        self.assertEqual(missions.bonus_de("doduo", {}), 30)
        self.assertEqual(missions.bonus_de("zone", {}), missions.BONUS)

    def test_lokhlass_seulement_si_la_distance_est_fiable(self):
        juste = stats_de({}, {"pas": 5000, "km": 3.8})
        douteuse = stats_de({}, {"pas": 5000, "km": 2.85})
        self.assertEqual(missions.possible("voyage", jour(0), juste), 6)
        self.assertIsNone(missions.possible("voyage", jour(0), douteuse))

    def test_tauros_seulement_si_les_seances_sont_enregistrees(self):
        vues = lambda n: {jour(-k): {"seance_max": 15} for k in range(1, n + 1)}  # noqa: E731
        self.assertIsNone(missions.possible("charge", jour(0), stats_de(vues(2))))
        self.assertEqual(missions.possible("charge", jour(0), stats_de(vues(3))), 20)

    def test_jours_vides_sans_erreur(self):
        self.assertEqual(missions.familles_du({"pas": float("nan"), "zone_sport": None}), set())


class Regions(unittest.TestCase):
    """Le passage de Kanto à Johto : la nouvelle région commence le lendemain de l'appel accepté, sac vide et barre à zéro."""

    gardees = {}

    def partie_complete(self, nb=400, appel_apres=True):
        """Un joueur très sportif : la Ligue de Kanto bien avant la fin, puis l'appel 2 jours après. Le jeu est long à rejouer : gardé pour tous les tests."""
        cle = (nb, appel_apres)
        if cle not in self.gardees:
            g = {str(jour(k)): {"pompes": 80, "tractions": 25, "squats": 0, "series": 0} for k in range(nb)}
            s = stats(nb, pas=14000, zone_sport=40, zone=40, km=9, etages=45, sommeil=430)
            quand = None
            if appel_apres:
                _, e = pokemon.jouer(s, {}, jour(nb - 1), (), None, None, None, (), g)
                quand = dt.date.fromisoformat(e["voyage"]["badges"][9]) + dt.timedelta(days=2)
                g[str(quand)]["appel"] = 1
            self.gardees[cle] = (*pokemon.jouer(s, {}, jour(nb - 1), (), None, None, None, (), g), quand, s, g)
        captures, e, self.jour_appel, self.s, self.g = self.gardees[cle]
        return captures, e

    def test_sans_appel_on_reste_dans_l_ancienne_region(self):
        captures, e = self.partie_complete(appel_apres=False)
        self.assertEqual(e["region"]["nom"], "Kanto")
        self.assertEqual(e["region"]["suivante"], "Johto")
        self.assertFalse(any(c["num"] > 151 for c in captures))

    def test_l_appel_ouvre_la_region_le_lendemain(self):
        captures, e = self.partie_complete()
        self.assertEqual(e["region"]["nom"], "Johto")
        demain = str(self.jour_appel + dt.timedelta(days=1))
        self.assertEqual(e["region"]["debut"], demain)
        cadeau = [c for c in captures if c["id"].endswith("#orme")]
        self.assertEqual(len(cadeau), 1)
        self.assertEqual(cadeau[0]["jour"], demain)
        self.assertIn(cadeau[0]["num"], (152, 155, 158))
        self.assertFalse([c for c in captures if c["num"] > 151 and c["jour"] < demain])
        self.assertEqual(e["voyage"]["carte"]["region"], "Johto")

    def test_la_nouvelle_region_repart_de_zero(self):
        self.partie_complete()
        demain = self.jour_appel + dt.timedelta(days=1)
        _, e = pokemon.jouer(self.s, {}, demain, (), None, None, None, (), self.g)
        self.assertEqual(e["region"]["nom"], "Johto")
        self.assertLess(e["cumul"], 500)  # les points d'une seule journée
        self.assertLess(e["voyage"]["pos"], 500)
        self.assertEqual(e["voyage"]["badges"], {})
        self.assertEqual([f["jour"] for f in e["frise"]], [str(demain)])

    def test_l_appel_ne_change_rien_avant_le_lendemain(self):
        self.partie_complete()
        _, e = pokemon.jouer(self.s, {}, self.jour_appel, (), None, None, None, (), self.g)
        self.assertEqual(e["region"]["nom"], "Kanto")
        self.assertTrue(e["region"]["depart"])

    def test_johto_va_jusqu_au_bout(self):
        captures, e = self.partie_complete()
        self.assertEqual(e["region"]["nom"], "Johto")
        self.assertIn(9, e["voyage"]["badges"])
        nums = {c["num"] for c in captures if not c.get("rate")}
        self.assertIn(250, nums)  # Ho-Oh, à la Ligue
        self.assertEqual({243, 244, 245, 249} - nums, set())  # les sanctuaires
        self.assertIn(251, nums)  # Celebi, le diplôme
        self.assertIn(151, nums)  # Mew : le diplôme de Kanto
        self.assertEqual(sum(c["id"].endswith("#ligue") for c in captures), 2)

    def test_le_starter_de_johto_evolue(self):
        captures, e = self.partie_complete()
        ligne = e["starter"]["ligne"]
        self.assertEqual(ligne[0] in (152, 155, 158), True)
        self.assertEqual({ligne[1], ligne[2]} - {c["num"] for c in captures}, set())

    def test_chaque_id_de_ball_est_unique(self):
        captures, _ = self.partie_complete()
        ids = [c["id"] for c in captures]
        self.assertEqual(len(ids), len(set(ids)))

    def test_le_rattrapage_donne_ce_qui_manque_a_kanto(self):
        captures, _ = self.partie_complete()
        self.assertTrue(all(c["num"] <= 151 for c in captures if c.get("rattrapage")))

    def test_le_jour_et_la_nuit(self):
        self.assertEqual(pokemon.moments_du_jour({"pas_matin": 2500, "pas_soir": 100}), ["matin"])
        self.assertEqual(pokemon.moments_du_jour({"pas_matin": 2500, "pas_soir": 2000}), ["matin", "soir"])
        self.assertEqual(pokemon.moments_du_jour(None), [])
        # un Pokémon du moment sort plus souvent, à poids égaux
        ici = [163, 161]
        favori = sum(pokemon.tirer(f"g{k}", set(), ici, [], moment={163: 3})["num"] == 163 for k in range(600))
        normal = sum(pokemon.tirer(f"g{k}", set(), ici, [])["num"] == 163 for k in range(600))
        self.assertGreater(favori, normal + 100)

    def test_chaque_pokemon_a_sa_fiche(self):
        from pokedex import CATEGORIES, DESCRIPTIONS, FEMELLES, POIDS, POKEMON, TAILLES
        for table in (CATEGORIES, DESCRIPTIONS, FEMELLES, POIDS, TAILLES):
            self.assertEqual(set(table) & set(POKEMON), set(POKEMON))


    def test_la_trace_d_appel_est_lue_et_gardee(self):
        pokemon.REGLAGES["debut"], pokemon.REGLAGES["partie"] = DEBUT, 99
        p = pokemon.ident(DEBUT, "", None)
        g = pokemon.gestes_du(None, [f"{p}geste-appel_1_1000"], None, DEBUT)
        self.assertEqual(g[str(DEBUT)]["appel"], 1)
        self.assertEqual(pokemon.gestes_du({"jours": g}, [], None, jour(40))[str(DEBUT)]["appel"], 1)


if __name__ == "__main__":
    unittest.main()
