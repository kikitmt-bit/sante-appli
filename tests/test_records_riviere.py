"""Les records de « La Rivière » gardés sur le serveur (étape 2 du plan, 14/11) : seances_rameur.garder_records et ranger."""
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import seances_rameur as sr  # noqa: E402


class Depot:
    """Un faux dépôt : chemin -> objet ; compte les écritures."""
    def __init__(self, fichiers=None, panne=False):
        self.f, self.ecrits, self.panne = dict(fichiers or {}), [], panne

    def lire(self, p):
        return json.loads(json.dumps(self.f.get(p))) if p in self.f else None

    def ecrire(self, p, o, msg):
        if self.panne:
            return False
        self.f[p] = json.loads(json.dumps(o))
        self.ecrits.append(p)
        return True


CLE = "kanto-1km_2000m_abc123"
TRACE = [0, 0, 1.0, 3.1, 2.0, 6.0, 100.4, 2000]


def seance(id_, debut="2026-11-14T10:00:00+01:00", records=None, machine=None):
    s = {"id": id_, "debut": debut, "fin": debut, "duree_s": 600, "coups": 200, "jeu": {"mode": "riviere"}}
    if machine:
        s["machine"] = machine
    return {"seance": s, **({"records": records} if records else {})}


class TestRecords(unittest.TestCase):
    def test_premier_record_garde_avec_sa_trace(self):
        d = Depot()
        self.assertTrue(sr.garder_records([({CLE: {"machine": "rameur", "niveau": "kanto-1km", "tour": {"t": 100.44, "pts": TRACE}}}, "2026-11-14")], d.lire, d.ecrire))
        r = d.f[sr.RECORDS]["records"][CLE]
        self.assertEqual(r["tour"], {"t": 100.4, "jour": "2026-11-14", "pts": TRACE})
        self.assertEqual((r["machine"], r["niveau"]), ("rameur", "kanto-1km"))

    def test_voies_des_fourches_gardees(self):
        """Les voies prises aux fourches pendant le tour (étape 7 du plan) sont gardées avec la trace : le fantôme les reprend. Sans trace : rien."""
        d = Depot()
        sr.garder_records([({CLE: {"tour": {"t": 100.0, "pts": TRACE, "v": [1, 0, 7]}}}, "2026-11-15")], d.lire, d.ecrire)
        self.assertEqual(d.f[sr.RECORDS]["records"][CLE]["tour"]["v"], [1, 0, 1])
        sr.garder_records([({CLE: {"tour": {"t": 99.0, "v": [1]}}}, "2026-11-15")], d.lire, d.ecrire)
        self.assertNotIn("v", d.f[sr.RECORDS]["records"][CLE]["tour"])
        sr.garder_records([({CLE: {"tour": {"t": 98.0, "pts": TRACE, "v": "x"}}}, "2026-11-15")], d.lire, d.ecrire)
        self.assertNotIn("v", d.f[sr.RECORDS]["records"][CLE]["tour"])

    def test_jamais_un_temps_moins_bon(self):
        d = Depot({sr.RECORDS: {"records": {CLE: {"tour": {"t": 90.0, "jour": "2026-11-10", "pts": TRACE}}}}})
        self.assertTrue(sr.garder_records([({CLE: {"tour": {"t": 95.0, "pts": [0, 0, 95, 2000]}}}, "2026-11-14")], d.lire, d.ecrire))
        self.assertEqual(d.ecrits, [])  # rien n'a changé : rien n'est écrit
        self.assertEqual(d.f[sr.RECORDS]["records"][CLE]["tour"]["t"], 90.0)

    def test_meilleur_temps_remplace(self):
        d = Depot({sr.RECORDS: {"records": {CLE: {"tour": {"t": 90.0, "jour": "2026-11-10", "pts": TRACE}, "segments": {"Pont": 20.0}}}}})
        sr.garder_records([({CLE: {"tour": {"t": 88.0}, "segments": {"Pont": 21.0, "Lac": 30.0}}}, "2026-11-14")], d.lire, d.ecrire)
        r = d.f[sr.RECORDS]["records"][CLE]
        self.assertEqual(r["tour"], {"t": 88.0, "jour": "2026-11-14"})  # sans trace envoyée : pas de vieux fantôme d'un autre temps
        self.assertEqual(r["segments"], {"Pont": 20.0, "Lac": 30.0})  # chaque segment garde son meilleur

    def test_mal_forme_ignore(self):
        d = Depot()
        envoi = {"../hack": {"tour": {"t": 50}}, CLE: {"tour": {"t": "vite", "pts": "x"}, "segments": {"S": -3, "": 10}}, "ok_1": {"tour": {"t": 60, "pts": [1, 2, 3]}}}
        self.assertTrue(sr.garder_records([(envoi, "2026-11-14"), ("pas un dict", "2026-11-14")], d.lire, d.ecrire))
        self.assertEqual(d.f[sr.RECORDS]["records"], {"ok_1": {"tour": {"t": 60, "jour": "2026-11-14"}}})  # trace impaire refusée, temps gardé

    def test_ranger_seance_et_records(self):
        d = Depot()
        texte = json.dumps([seance("a", records={CLE: {"tour": {"t": 99.0, "pts": TRACE}}}), seance("b", "2026-11-15T09:00:00+01:00", records={CLE: {"tour": {"t": 97.0}}})])
        self.assertTrue(sr.ranger(texte, d.lire, d.ecrire))
        self.assertEqual([s["id"] for s in d.f[sr.FICHIER]["seances"]], ["a", "b"])
        self.assertNotIn("records", d.f[sr.FICHIER]["seances"][0])  # la trace ne va jamais dans le fichier des séances
        self.assertEqual(d.f[sr.RECORDS]["records"][CLE]["tour"]["t"], 97.0)
        self.assertEqual(d.f[sr.RECORDS]["records"][CLE]["tour"]["jour"], "2026-11-15")

    def test_ranger_rejouable(self):
        d = Depot()
        texte = json.dumps([seance("a", records={CLE: {"tour": {"t": 99.0, "pts": TRACE}}})])
        sr.ranger(texte, d.lire, d.ecrire)
        n = len(d.ecrits)
        self.assertTrue(sr.ranger(texte, d.lire, d.ecrire))
        self.assertEqual(d.ecrits[n:], [sr.FICHIER])  # la séance est réécrite (comme avant), les records non : rien de mieux
        self.assertEqual(len(d.f[sr.FICHIER]["seances"]), 1)

    def test_ranger_sans_records_ne_touche_pas_au_fichier(self):
        d = Depot()
        self.assertTrue(sr.ranger(json.dumps([seance("a", machine="elliptique")]), d.lire, d.ecrire))
        self.assertNotIn(sr.RECORDS, d.f)

    def test_echec_d_ecriture_signale(self):
        d = Depot(panne=True)
        self.assertFalse(sr.ranger(json.dumps([seance("a", records={CLE: {"tour": {"t": 99.0}}})]), d.lire, d.ecrire))

    def test_page_recoit_les_records(self):
        self.assertEqual(sr.records_pour_le_jeu(None), {})
        self.assertEqual(sr.records_pour_le_jeu({"records": {CLE: {"tour": {"t": 1}}}}), {CLE: {"tour": {"t": 1}}})


if __name__ == "__main__":
    unittest.main()
