"""Les règles du jeu, sans réseau ni données : à lancer avant chaque envoi (python -m unittest discover tests), et à chaque envoi sur GitHub."""
import datetime as dt
import json
import sys
import unittest
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import bilan  # noqa: E402
import chiffres  # noqa: E402
import johto  # noqa: E402
import kanto  # noqa: E402
import missions  # noqa: E402
import pokemon  # noqa: E402
import region as region_  # noqa: E402
import seances_danse  # noqa: E402
import seances_rameur  # noqa: E402

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

    def test_le_sport_pratique_passe_avant_les_minutes_de_sport(self):
        jour_ = {"pas": 3000, "zone": 20, "zone_sport": 30, "etages": 0, "sommeil": 0}
        for type_, attendu in (("ROWING_MACHINE", ["Eau", "Glace"]), ("OUTDOOR_BIKE", ["Vol", "Normal"]), ("WEIGHTS", ["Combat", "Acier"])):
            m = pokemon.mesures(jour_, [seance(type_, 20)["exercise"]], DEBUT)
            self.assertEqual(pokemon.origine_barre(m)[2], attendu)
            self.assertEqual(pokemon.exploit(m)[2], attendu)  # l'Hyper Ball des 25 min de sport aussi

    def test_un_sport_sans_type_garde_ceux_des_minutes_de_sport(self):
        zone = ["Feu", "Électrik", "Combat", "Dragon"]
        m = pokemon.mesures({"pas": 3000, "zone": 20, "zone_sport": 30, "etages": 0, "sommeil": 0}, [seance("SPORT", 60, "Padel")["exercise"]], DEBUT)
        self.assertEqual(pokemon.origine_barre(m)[2], zone)
        self.assertEqual(pokemon.exploit(m)[2], None)  # une séance de 45 min sans type : tous les types, comme avant
        m = pokemon.mesures({"pas": 3000, "zone": 20, "zone_sport": 30, "etages": 0, "sommeil": 0}, [], DEBUT)
        self.assertEqual(pokemon.origine_barre(m)[2], zone)
        self.assertEqual(pokemon.exploit(m)[2], zone)

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

    def test_le_materiel_coche_ouvre_les_missions(self):
        stat = stats_de({jour(-k): {"pas": 3000, "km": 2, "zone_sport": 0, "seance_max": 25} for k in range(1, 29)})
        vues = {c: missions.tirer(jour(n), stat, {}, "a1b2c3d4e5f6", None, {"rameur", "velo"})["cle"] for n, c in enumerate(range(150))}
        self.assertIn("traversee", vues.values())
        self.assertIn("tournee", vues.values())
        self.assertNotIn("danse", vues.values())
        self.assertNotIn("pinces", vues.values())

    def test_une_montre_sans_seances_n_a_pas_les_missions_de_seance(self):
        stat = stats_de({})
        vues = {missions.tirer(jour(n), stat, {}, "a1b2c3d4e5f6", None, {"rameur", "velo", "tapis", "barre"})["cle"] for n in range(150)}
        self.assertFalse(vues & {"traversee", "tournee", "danse"})
        self.assertIn("pinces", vues)  # compter ses tractions ne dépend pas de la montre

    def test_kiki_a_tout_tant_qu_il_n_a_rien_decoche(self):
        self.assertEqual(missions.materiel_de(None), set(missions.MATERIELS))
        self.assertEqual(missions.materiel_de({"materiel": ["rameur"]}), {"rameur"})
        self.assertEqual(missions.materiel_de(None, "a1b2"), set())
        self.assertEqual(missions.materiel_de({"materiel": []}), set())

    def test_le_velo_se_valide_en_temps_ou_en_distance(self):
        info = lambda j: {"cle": "tournee"}  # noqa: E731
        fait = lambda s: missions.reussite("tournee", DEBUT, stats_de({DEBUT: s}), info)  # noqa: E731
        self.assertTrue(fait({"min_velo": 20, "km_velo": 0}))
        self.assertTrue(fait({"min_velo": 12, "km_velo": 6}))
        self.assertFalse(fait({"min_velo": 12, "km_velo": 3}))

    def test_la_carte_publie_le_materiel_et_rien_d_autre(self):
        import amis
        d = amis.dresseur_du_telephone('{"nom": "Ash", "naissance": "1990-01-01", "materiel": ["rameur", "piscine"]}')
        self.assertEqual(d["materiel"], ["rameur"])
        self.assertNotIn("naissance", d)
        self.assertNotIn("materiel", amis.dresseur_du_telephone('{"nom": "Ash"}'))

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


class PreludeEtFilet(unittest.TestCase):
    """Le plan du 05/11 : Kanto en prélude, Pokémon étalés sur tout le jeu, jamais bloqué sur une carte."""

    def test_les_tailles_des_regions(self):
        self.assertEqual(kanto.REGION.dist[-1], 2000)
        self.assertEqual(johto.REGION.dist[-1], 2500)
        self.assertEqual(len(kanto.REGION.especes), 74)
        self.assertEqual(len(johto.REGION.especes), 113)

    def test_un_pokemon_garde_ne_sort_pas_a_kanto(self):
        self.assertEqual(len(kanto.REPORTES), 72)
        self.assertFalse(set(kanto.REPORTES) & kanto.REGION.especes)
        self.assertEqual(set(kanto.REPORTES) | kanto.REGION.especes | {144, 145, 146, 150, 151}, set(range(1, 152)))
        vus = {n for lieu in kanto.REGION.lieux for n in lieu["pokemon"]}
        self.assertFalse(set(kanto.REPORTES) & vus)

    def test_johto_a_ses_pokemon_de_kanto(self):
        pour_johto = region_.numeros(kanto.POUR_PLUS_TARD["Johto"])
        self.assertEqual(len(pour_johto), 19)
        self.assertLessEqual(set(pour_johto), johto.REGION.especes)

    def test_chaque_lieu_a_des_pokemon(self):
        for r in (kanto.REGION, johto.REGION):
            for lieu in r.lieux[1:]:
                self.assertGreaterEqual(len(lieu["pokemon"]), 2, lieu["nom"])

    def test_chaque_joueur_a_sa_liste_de_kanto(self):
        a, b = kanto.variante("4-kiki"), kanto.variante("4-abc")
        self.assertEqual(a, kanto.variante("4-kiki"))  # toujours la même pour lui
        self.assertNotEqual(a, b)
        for liste in (a, b):
            tous = {n for x in liste for n in x}
            self.assertEqual(len(tous), 74)
            self.assertEqual(len(tous & kanto.REGION.especes), 74 - kanto.NB_SURPRISES)
            self.assertFalse(tous & set(range(1, 10)))  # jamais les starters
            for lieu, x in zip(kanto.REGION.lieux[1:], liste[1:]):
                self.assertGreaterEqual(len(x), 2, lieu["nom"])

    def test_jamais_un_pokemon_d_une_generation_future(self):
        for graine in range(200):
            self.assertLessEqual(max(n for x in kanto.variante(f"essai{graine}") for n in x), 151)
        self.assertLessEqual(max(johto.REGION.especes), 251)

    def test_un_pokemon_absent_de_kanto_revient_ensuite(self):
        v = region_.Voyage(kanto.REGION, "4-kiki")
        retires = kanto.REGION.especes - v.especes()
        self.assertEqual(len(retires), kanto.NB_SURPRISES)
        pokemon.REGLAGES["debut"], pokemon.REGLAGES["partie"] = DEBUT, 4
        g = {str(jour(k)): {"pompes": 80, "tractions": 25, "squats": 0, "series": 0} for k in range(300)}
        s = stats(300, pas=14000, zone_sport=40, zone=40, km=9, etages=45, sommeil=430)
        _, e = pokemon.jouer(s, {}, jour(299), (), None, None, None, (), g)
        quand = str(dt.date.fromisoformat(e["voyage"]["badges"][9]) + dt.timedelta(days=2))
        g[quand]["appel"] = 1
        captures, _ = pokemon.jouer(s, {}, jour(299), (), None, None, None, (), g)
        vus = {c["num"] for c in captures if not c.get("rate")}
        self.assertLessEqual(retires, vus)
        pokemon.REGLAGES["partie"] = 99

    def test_le_diplome_de_kanto_suit_la_liste_du_joueur(self):
        pokemon.REGLAGES["debut"], pokemon.REGLAGES["partie"] = DEBUT, 99
        g = {str(jour(k)): {"pompes": 80, "tractions": 25, "squats": 0, "series": 0} for k in range(120)}
        captures, _ = pokemon.jouer(stats(120, pas=14000, zone_sport=40, zone=40, km=9, etages=45, sommeil=430), {}, jour(119), (), None, None, None, (), g)
        self.assertTrue([c for c in captures if c["id"].endswith("#diplome") and c["num"] == 151])

    def test_la_forme_finale_arrive_avant_la_fin_de_la_carte(self):
        for r in (kanto.REGION, johto.REGION):
            self.assertLess(35 * pokemon.pts_niveau(r), r.dist[-1])
            self.assertEqual(pokemon.niveau(r.dist[-1], r) >= 36, True)

    def test_le_vainqueur_de_la_ligue_a_la_forme_finale_du_starter(self):
        for pas in (2500, 4000, 8000):
            captures, e = partie(300, pas=pas)
            self.assertIn(9, e["voyage"]["badges"], pas)
            ligue = e["voyage"]["badges"][9]
            evo2 = [c for c in captures if c["id"].endswith("#evo2")]
            self.assertTrue(evo2, pas)
            self.assertLessEqual(evo2[0]["jour"], ligue, pas)

    def test_le_champion_laisse_passer_apres_3_jours_actifs(self):
        v = region_.Voyage(kanto.REGION)
        j = {"pas": 2500, "zone": 0, "etages": 0, "eau": 0, "force_min": 0, "seance": 0, "soir": 0, "km": 1, "pompes": 0, "tractions": 0, "ok": False, "double": False, "hyper": False}
        arene = kanto.REGION.dist[kanto.REGION.arenes[0]]
        for k in range(3):
            self.assertEqual(v.badges, {})
            badges = v.avancer(jour(k), j, arene + k)
        self.assertEqual([b[0] for b in badges], [1])

    def test_un_jour_sans_activite_ne_compte_pas_pour_le_champion(self):
        v = region_.Voyage(kanto.REGION)
        j = {"pas": 500, "zone": 0, "etages": 0, "eau": 0, "force_min": 0, "seance": 0, "soir": 0, "km": 0, "pompes": 0, "tractions": 0, "ok": False, "double": False, "hyper": False}
        arene = kanto.REGION.dist[kanto.REGION.arenes[0]]
        for k in range(10):
            v.avancer(jour(k), j, arene + k)
        self.assertEqual(v.badges, {})

    def test_le_velo_arrive_au_30e_jour_seulement_si_on_est_en_retard(self):
        self.assertIsNone(partie(29, pas=2500)[1]["voyage"]["velo"])
        self.assertEqual(partie(31, pas=2500)[1]["voyage"]["velo"], str(jour(29)))
        self.assertIsNone(partie(31, pas=14000, zone_sport=30, zone=30, km=9)[1]["voyage"]["velo"])

    def test_le_velo_ne_donne_aucune_ball_en_plus(self):
        captures, e = partie(60, pas=2500)
        self.assertIsNotNone(e["voyage"]["velo"])
        self.assertGreater(e["voyage"]["pos"], e["cumul"])  # la carte avance plus vite que les points
        barre = sum(c["id"].split("#")[1].startswith("poke") for c in captures)
        self.assertEqual(barre, int(e["cumul"] // 100))  # les Poké Balls suivent les vrais points

    def test_la_relance_arrive_apres_5_jours_sans_objectif(self):
        self.assertIsNone(partie(5, pas=3000)[1]["relance"])
        rel = partie(6, pas=3000)[1]["relance"]
        self.assertEqual(rel["cible"], 3600)
        self.assertFalse(rel["fait"])

    def test_la_relance_reussie_donne_une_ball_et_compte(self):
        captures, e = partie(7, pas=[3000] * 6 + [3700])
        self.assertEqual(sum(c["id"].endswith("#reprise") for c in captures), 1)
        self.assertEqual(e["serie"], 1)
        self.assertTrue(e["relance"]["fait"])

    def test_la_relance_ne_revient_pas_avant_14_jours(self):
        captures, _ = partie(60, pas=3000, zone_sport=[0] * 60)
        self.assertEqual(sum(c["id"].endswith("#reprise") for c in captures), 0)
        pas = [3000] * 6 + [3700] + [3000] * 53
        captures, _ = partie(60, pas=pas)
        jours = [c["jour"] for c in captures if c["id"].endswith("#reprise")]
        self.assertEqual(len(jours), 1)

    def test_une_montre_oubliee_ne_declenche_pas_la_relance(self):
        self.assertIsNone(partie(12, pas=0)[1]["relance"])
        self.assertIsNone(partie(12, pas=[3000] * 4 + [0] * 8)[1]["relance"])


class Bilan(unittest.TestCase):
    """Le bilan santé nomme la grosse séance de la veille, et s'en sert pour expliquer la récupération (Kiki, 05/11)."""

    def stats(self, sport=86, vfc=28, fc=65):
        lignes = {jour(k): {"pas": 3000, "zone_sport": 0, "seance_max": 0, "min_sport": 0, "fc_repos": 62, "vfc": 45, "sommeil": 450, "coucher": 1400} for k in range(40)}
        lignes[jour(38)] |= {"zone_sport": sport, "seance_max": 89, "min_sport": 89, "pas": 4900}
        lignes[jour(39)] |= {"fc_repos": fc, "vfc": vfc}
        return pd.DataFrame(lignes).T

    def cartes(self, **k):
        b = bilan.analyser(self.stats(**k), "Jour", jour(39), jour(39), jour(39))
        return {c["theme"]: c for c in b["cartes"]}, b["phrase"]

    def test_la_grosse_seance_de_la_veille_est_nommee(self):
        c, _ = self.cartes()
        self.assertIn("Grosse séance", c["sport"]["titre"])
        self.assertIn("plus grosse journée", c["sport"]["texte"])

    def test_la_recuperation_est_reliee_a_la_seance(self):
        c, phrase = self.cartes()
        self.assertEqual(c["recup"]["ton"], "neutre")
        self.assertIn("séance", c["recup"]["titre"])
        self.assertNotIn("lève le pied", phrase)

    def test_sans_seance_l_alerte_reste(self):
        c, phrase = self.cartes(sport=0, fc=67)
        self.assertEqual(c["recup"]["ton"], "alerte")
        self.assertEqual(c["recup"]["titre"], "Ton corps demande du calme")
        self.assertIn("lève le pied", phrase)


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

    def test_chaque_champion_confie_son_pokemon(self):
        """Kiki, 05/11 : le Pokémon du champion vient avec le badge, jamais d'une ball ordinaire de sa région."""
        captures, e = self.partie_complete()
        for r in (kanto.REGION, johto.REGION):
            self.assertEqual(len(r.champions), 8)
            for k, i in enumerate(r.arenes[:-1], 1):
                num = r.lieux[i]["arene"]["pokemon"]
                donne = [c for c in captures if c["num"] == num and not c.get("rate")]
                self.assertTrue(donne, (r.nom, num))
                self.assertTrue(donne[0]["id"].endswith(f"#badge{k}"), (r.nom, num, donne[0]["id"]))
            self.assertLessEqual(max(r.champions), 251)

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
        self.assertLessEqual(len(e["voyage"]["badges"]), 1)  # les cartes sont courtes : un très grand sportif peut battre le premier champion dès le premier jour
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


class Rival(unittest.TestCase):
    def jours(self, nb, **v):
        base = {"pas": 8000, "zone": 20, "sommeil": 450, "pompes": 10, "tractions": 0, "squats": 0}
        return [base | {"jour": str(jour(k))} | v for k in range(nb)]

    def dit(self, derniers):
        import rival
        return " ".join(rival.repliques(derniers, jour(30), "rival-k1-route"))

    def test_il_lui_faut_quelques_jours(self):
        import rival
        self.assertIsNone(rival.repliques(self.jours(2), jour(30), "rival-k1-route"))

    def test_il_prend_le_pire_chiffre(self):
        d = self.jours(7, zone=0)
        self.assertIn("Zéro minute de sport", self.dit(d))
        d = self.jours(7)
        d[3]["pas"] = 900
        self.assertIn("900 pas", self.dit(d))

    def test_une_montre_oubliee_ne_compte_pas(self):
        d = self.jours(7)
        d[3]["pas"] = 0
        self.assertNotIn(" 0 pas", self.dit(d))

    def test_un_sommeil_inconnu_n_est_pas_moque(self):
        self.assertNotIn("sommeil", self.dit(self.jours(7, sommeil=0, zone=0, pas=2000)))

    def test_il_trouve_toujours_quelque_chose(self):
        self.assertGreaterEqual(len(self.dit(self.jours(7, pas=20000, zone=60))), 40)

    def test_pas_de_vanne_sur_le_sport_sans_historique(self):
        import rival
        d = self.jours(7, zone=0, pas=9000)
        self.assertNotIn("sport", " ".join(rival.repliques(d, jour(30), "rival-k1-route", False)))
        self.assertIn("sport", " ".join(rival.repliques(d, jour(30), "rival-k1-route", True)))

    def test_le_sport_vu_vient_de_tout_l_historique(self):
        self.assertFalse(partie(5, zone_sport=0)[1]["sport_vu"])
        self.assertTrue(partie(5, zone_sport=[12, 0, 0, 0, 0])[1]["sport_vu"])

    def test_le_coeur_de_70_ans(self):
        self.assertIn("70 ans", self.dit(self.jours(7, fc_repos=78)))
        self.assertNotIn("70 ans", self.dit(self.jours(7, fc_repos=58, vfc=50)))

    def test_la_masse_grasse(self):
        import rival
        d = self.jours(7, gras=30.0)
        self.assertIn("masse grasse", " ".join(rival.repliques(d, jour(30), "rival-k1-route", True, 24)))
        self.assertNotIn("masse grasse", " ".join(rival.repliques(d, jour(30), "rival-k1-route", True, None)))  # sans âge ni sexe : pas de jugement
        for k, x in enumerate(d):
            x["gras"] = 20 + k / 3
        self.assertIn("masse grasse", " ".join(rival.repliques(d, jour(30), "rival-k1-route", True, None)))  # sa hausse, oui

    def test_silver_a_sa_voix_a_johto(self):
        import rival
        for image in ("rival-j1-mauville", "rival-j2-bois", "rival-j3-rosalia", "rival-j4-antre"):
            for d in (self.jours(7, zone=0, pas=2000, sommeil=300), self.jours(7, pas=20000, zone=60), self.jours(7, fc_repos=78, vfc=20, zone=10, gras=30.0)):
                t = " ".join(rival.repliques(d, jour(30), image, True, 24))
                self.assertNotIn("Régis", t)
                self.assertNotIn("{", t.replace("{nom}", ""))  # {nom} : remplacé par le téléphone
                self.assertEqual(rival.voix(image)["nom"], "Silver")
        self.assertEqual(rival.voix("rival-k1-route")["nom"], "Régis")
        giovanni = [i for i in rival.VOIX["j"]["accroches"] if "Giovanni" in str(rival.VOIX["j"]["accroches"][i])]
        self.assertEqual(giovanni, ["rival-j4-antre"])  # dit seulement à la dernière rencontre

    def test_tous_les_rivaux_ont_tous_leurs_textes(self):
        import rival
        for v in rival.VOIX.values():
            self.assertEqual(set(v["textes"]), set(rival.VOIX["k"]["textes"]))

    def test_remise_a_zero_vaut_pour_les_amis(self):
        avant = pokemon.REGLAGES["debut"]
        try:
            pokemon.REGLAGES["debut"] = jour(5)
            ancien = {"id": "abc", "debut": jour(0)}
            self.assertEqual(pokemon.debut_de(ancien), jour(5))
            self.assertEqual(pokemon.debut_de({"id": "abc", "debut": jour(8)}), jour(8))
            self.assertEqual(pokemon.debut_de(None), jour(5))
            stats = pd.DataFrame({jour(k): {"pas": 8000} for k in range(7)}).T
            captures, _ = pokemon.jouer(stats, {}, jour(6), joueur=ancien)
            self.assertTrue(captures and all(c["jour"] >= str(jour(5)) for c in captures))
        finally:
            pokemon.REGLAGES["debut"] = avant

    def test_partie_pas_encore_commencee(self):
        avant = pokemon.REGLAGES["debut"]
        try:
            pokemon.REGLAGES["debut"] = jour(5)
            captures, etat = pokemon.jouer(pd.DataFrame(), {}, jour(2))
            self.assertEqual(captures, [])
            self.assertEqual(etat["mesures"]["pas"], 0)
            self.assertEqual(etat["mesures"]["sommeil"], 0)
        finally:
            pokemon.REGLAGES["debut"] = avant

    def test_le_classement_ne_montre_que_le_jeu(self):
        import amis
        stats = pd.DataFrame({jour(k): {"pas": 9000 + k, "sommeil": 400} for k in range(9)}).T
        gestes = {str(jour(7)): {"pompes": 12}, str(jour(1)): {"pompes": 50}}  # la semaine d'avant ne compte pas
        captures, etat = pokemon.jouer(stats, {}, jour(8), joueur={"id": "abc", "debut": jour(0)}, gestes=gestes)
        r = amis.resume(captures, etat, {c["id"] for c in captures}, jour(8))
        self.assertEqual(r["muscu"], {"pompes": 12, "squats": 0, "tractions": 0})
        self.assertGreater(r["points"], 0)
        self.assertGreater(r["points_passee"], r["points"])
        texte = str(r)
        for secret in ("sommeil", "fc_repos", "vfc", "gras", "'pas'", "9007"):
            self.assertNotIn(secret, texte)

    def test_chaque_region_a_quatre_rencontres(self):
        import regions
        for r in regions.REGIONS:
            self.assertEqual(len(r.rival), 4)
            self.assertLessEqual(set(r.rival), {l["nom"] for l in r.lieux})


class TestSeancesDanse(unittest.TestCase):
    MORCEAU = {"debut": "2026-11-06T12:10:00+01:00", "fin": "2026-11-06T12:13:00+01:00", "titre": "A <b>", "difficulte": "Easy", "niveau": 5, "pct": 80.5,
               "compte": {"Parfait": 3, "Raté": 1}}
    SEANCE = {"debut": "2026-11-06T12:10:00+01:00", "fin": "2026-11-06T12:18:00+01:00", "danse_s": 360, "repos_s": 120, "morceaux": [
        MORCEAU, MORCEAU | {"debut": "2026-11-06T12:15:00+01:00", "fin": "2026-11-06T12:18:00+01:00"}]}
    TYPES = {"heart-rate": {"colonnes": ["heure", "secondes", "beatsPerMinuteAvg", "beatsPerMinuteMax"], "lignes": [
        ["12:00:00", 60, 70, 75], ["12:11:00", 60, 120, 130], ["12:13:30", 60, 100, 105], ["12:16:00", 60, 140, 150], ["12:30:00", 60, 80, 85]]},
        "active-energy-burned": {"colonnes": ["heure", "secondes", "kcalSum"], "lignes": [["12:11:00", 60, 5.0], ["12:30:00", 60, 9.0]]}}

    def test_fichiers_de_la_periode(self):
        liste = [{"name": "2026-11-05-120000.json"}, {"name": "2026-11-06-120000.json"}, {"name": "2026-11-07-120000.json"}, {"name": "lisezmoi.txt"}]
        self.assertEqual(seances_danse.fichiers_periode(liste, dt.date(2026, 11, 6), dt.date(2026, 11, 6)), ["data/danse/sessions/2026-11-06-120000.json"])
        self.assertEqual(seances_danse.fichiers_periode(None, dt.date(2026, 11, 6), dt.date(2026, 11, 6)), [])

    def test_le_coeur_de_la_seance_seulement(self):
        m = seances_danse.mesures(self.SEANCE, self.TYPES)
        self.assertEqual(m["max"], 150)  # ni avant ni après la séance
        self.assertEqual(m["moyenne"], 130)  # le repos de 12:13:30 ne compte pas en dansant
        self.assertEqual(m["kcal"], 5)

    def test_plusieurs_seances_repliees_une_seule_ouverte(self):
        une = seances_danse.html_jour([self.SEANCE], self.TYPES)
        deux = seances_danse.html_jour([self.SEANCE, self.SEANCE], self.TYPES)
        self.assertIn("<details class=\"dz-seance\" open>", une)
        self.assertNotIn(" open>", deux)
        self.assertIn("A &lt;b&gt;", une)  # un titre n'écrit jamais de HTML
        self.assertNotIn(chr(10), une)  # sinon le Markdown de Streamlit couperait le bloc

    def test_sans_mesures_de_la_montre(self):
        self.assertIn("quand ta montre aura synchronisé", seances_danse.html_jour([self.SEANCE], {}))

    def test_titre_et_periode(self):
        self.assertEqual(seances_danse.titre([self.SEANCE]), "💃 Danse : 6 min · 1 séance · 2 morceaux")
        self.assertIn("06/11", seances_danse.html_periode([self.SEANCE], dt.date(2026, 11, 1), dt.date(2026, 11, 7)))
        self.assertIn("11/2026", seances_danse.html_periode([self.SEANCE], dt.date(2026, 1, 1), dt.date(2026, 12, 31)))


class TestRameur(unittest.TestCase):
    """Une séance du téléphone sur le siège est une vraie séance de rameur, une seule fois, et ses chiffres apprennent à l'appli."""
    S = {"id": "2026-11-20-180000", "debut": "2026-11-20T18:00:00+01:00", "fin": "2026-11-20T18:20:00+01:00", "duree_s": 1200, "coups": 480, "cadence": 24, "course_cm": 60, "vitesse": 1.0,
         "par_min": {"cad": [24] * 20}, "saisi": {"distance": 4000, "temps_s": 1200, "watts": None, "kcal": None}}
    JOUR = dt.date(2026, 11, 20)

    def montre(self, debut, fin, type_="ROWING_MACHINE"):
        return {"exercise": {"exerciseType": type_, "activeDuration": "1000s", "interval": {"startTime": debut, "endTime": fin},
                             "metricsSummary": {"averageHeartRateBeatsPerMinute": 140}}}

    def exos(self, resumes):
        return [seances_rameur.sd_contenu(p) for p in resumes[str(self.JOUR)]["exercise"]]

    def test_compte_comme_une_seance_de_rameur(self):
        r = seances_rameur.fusionner({}, {"seances": [self.S]})
        s = chiffres.stats_jour(r[str(self.JOUR)])
        self.assertEqual(s["min_rameur"], 20)
        m = pokemon.mesures({"pas": 0, "zone": 0, "zone_sport": 0, "etages": 0, "sommeil": 0}, self.exos(r), self.JOUR)
        self.assertEqual(m["eau"], 20)  # Ondine
        self.assertEqual(m["points"]["sport"], 20)  # comme le rameur de la montre
        self.assertEqual(pokemon.sport_principal(m)[2], ["Eau", "Glace"])

    def test_la_montre_ne_compte_pas_une_deuxieme_fois(self):
        resumes = {str(self.JOUR): {"exercise": [self.montre("2026-11-20T17:01:00Z", "2026-11-20T17:19:00Z")]}}
        r = seances_rameur.fusionner(resumes, {"seances": [self.S]})
        self.assertEqual(chiffres.stats_jour(r[str(self.JOUR)])["min_rameur"], 20)
        self.assertEqual(self.exos(r)[0]["metricsSummary"]["averageHeartRateBeatsPerMinute"], 140)  # son cœur est gardé
        self.assertEqual(len(resumes[str(self.JOUR)]["exercise"]), 1)  # les résumés gardés en mémoire ne changent pas

    def test_une_autre_seance_du_jour_reste(self):
        r = seances_rameur.fusionner({str(self.JOUR): {"exercise": [self.montre("2026-11-20T08:00:00Z", "2026-11-20T09:00:00Z", "RUNNING")]}}, {"seances": [self.S]})
        self.assertEqual(len(self.exos(r)), 2)

    def test_sans_seance_rien_ne_change(self):
        resumes = {"2026-11-20": {"steps": 1}}
        self.assertIs(seances_rameur.fusionner(resumes, None), resumes)

    def test_une_seance_abimee_ne_casse_rien(self):
        self.assertEqual(seances_rameur.fusionner({"a": {}}, {"seances": [{"id": "x"}, {"debut": "n'importe quoi", "fin": "", "duree_s": 3}]}), {"a": {}})

    def test_ranger_est_rejouable(self):
        depot = {}
        ecrire = lambda p, o, m: depot.__setitem__(p, o) or True  # noqa: E731
        texte = json.dumps([{"seance": self.S, "brut": "1,2,3;4,5,6", "coups": [[1, 2, 3, 4, 5]]}])
        for _ in range(2):
            self.assertTrue(seances_rameur.ranger(texte, depot.get, ecrire))
        self.assertEqual(len(depot[seances_rameur.FICHIER]["seances"]), 1)
        self.assertEqual(depot["data/rameur/brut/2026-11-20-180000.json"]["lignes"], "1,2,3;4,5,6")

    def test_si_github_refuse_rien_n_est_oublie(self):
        self.assertFalse(seances_rameur.ranger(json.dumps([{"seance": self.S}]), lambda p: None, lambda p, o, m: False))

    def seance(self, coups, vitesse, distance, **saisi):
        return {"debut": "2026-11-20T18:00:00+01:00", "duree_s": 1200, "coups": coups, "vitesse": vitesse, "saisi": {"distance": distance, **saisi}}

    def test_le_modele_apprend_la_vitesse(self):
        vraies = [self.seance(400, v, 400 * (5 + 3 * v)) for v in (.8, 1.0, 1.2, 1.4, 1.6)]
        m = seances_rameur.modele(vraies)
        self.assertAlmostEqual(m["a"], 5, 2)
        self.assertAlmostEqual(m["b"], 3, 2)
        self.assertEqual(m["erreur"], 0)
        c = seances_rameur.chiffres_de({"coups": 100, "vitesse": 1, "duree_s": 300}, m)
        self.assertAlmostEqual(c["distance"], 800, 0)
        self.assertEqual(c["estime"], {"distance"})

    def test_ce_qui_est_entre_passe_avant_ce_qui_est_devine(self):
        m = {"a": 8, "b": 0, "n": 1, "erreur": None, "k_watts": None, "k_kcal": None}
        self.assertEqual(seances_rameur.chiffres_de(self.S, m)["distance"], 4000)

    def test_sans_distance_rien_a_apprendre(self):
        self.assertIsNone(seances_rameur.modele([self.seance(400, 1, None)]))
        self.assertIsNone(seances_rameur.modele([self.seance(5, 1, 100)]))  # trop peu de coups

    def test_page_sante(self):
        une = seances_rameur.html_jour([self.S], {}, None)
        self.assertNotIn(chr(10), une)  # sinon le Markdown de Streamlit couperait le bloc
        self.assertIn("4 000 m", une)
        self.assertEqual(seances_rameur.titre([self.S]), "🚣 Rameur : 20 min · 1 séance · 4 000 m")
        self.assertIn("20/11", seances_rameur.html_periode([self.S], dt.date(2026, 11, 16), dt.date(2026, 11, 22), None))
        self.assertEqual(chiffres.seance(seances_rameur.sd_contenu(seances_rameur.point_de(self.S)))["details"][1:], ["4000 m", "24 coups/min"])


if __name__ == "__main__":
    unittest.main()
