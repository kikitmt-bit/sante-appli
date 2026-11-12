"""Défis d'arène à la minute près (Kiki, 12/11) : le défi ne compte que ce qui suit l'arrivée, la carte repart avec les points d'après la victoire."""
import datetime as dt
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import pokemon  # noqa: E402
import regions  # noqa: E402
from region import Voyage  # noqa: E402

JOUR = dt.date(2026, 11, 13)
R = regions.REGIONS[0]
ONDINE = R.arenes[1]


def _journee(pas_min, rame):
    f = {"types": {"steps": {"lignes": [[f"{t // 60:02d}:{t % 60:02d}:00", 60, n] for t, n in pas_min.items()]}}}
    tz = pokemon.chiffres.TZ
    ex = [{"exercise": {"exerciseType": "ROWING_MACHINE", "activeDuration": f"{(b - a) * 60}s", "interval": {
        "startTime": dt.datetime.combine(JOUR, dt.time(a // 60, a % 60), tz).isoformat(),
        "endTime": dt.datetime.combine(JOUR, dt.time(b // 60, b % 60), tz).isoformat()}}} for a, b in rame]
    m = {"pas": sum(pas_min.values()), "zone": 0, "nouveau": True, "obj_pas": 5000}
    eau = sum(b - a for a, b in rame)
    jd = {"pas": m["pas"], "zone": 0, "etages": 0, "eau": eau, "force_min": 0, "seance": eau, "soir": 0, "km": 0, "pompes": 0,
          "tractions": 0, "ok": False, "double": False, "hyper": False}
    return jd, (lambda: pokemon.Journee(f, {"exercise": ex}, JOUR, m, jd, {}))


def _jouer(avant_arene, pas_min, rame, gain=100):
    v = Voyage(R, None, {"rameur"})
    v.debut, v.pos, v.badges, v.cumul = JOUR, R.dist[ONDINE] - avant_arene, {1: JOUR - dt.timedelta(days=3)}, 0
    jd, detail = _journee(pas_min, rame)
    return v, v.avancer(JOUR, jd, gain, detail)


class DefiMinute(unittest.TestCase):
    def test_carte_repart_apres_la_victoire(self):
        # 2 000 pas le matin, 20 min de rameur à midi, 3 000 pas l'après-midi : seuls les points d'après le rameur font avancer la carte
        pas = {t: 2000 / 120 for t in range(480, 600)} | {t: 3000 / 120 for t in range(900, 1020)}
        v, badges = _jouer(1, pas, [(720, 740)])
        self.assertEqual([k for k, _ in badges], [2])
        self.assertAlmostEqual(v.pos - R.dist[ONDINE], 50, delta=1)

    def test_rien_avant_l_arrivee(self):
        pas = {t: 3000 / 120 for t in range(480, 600)} | {t: 3000 / 120 for t in range(900, 1020)}
        v, badges = _jouer(40, pas, [(700, 725)])  # 25 min de rameur, dont une partie avant d'arriver
        self.assertEqual(badges, [])
        self.assertLess(v.etat(JOUR)["defi"]["epreuves"][0][0], 20)

    def test_sans_detail_comme_avant(self):
        v = Voyage(R, None, {"rameur"})
        v.debut, v.pos, v.badges, v.cumul = JOUR, R.dist[ONDINE] - 1, {1: JOUR}, 0
        jd, _ = _journee({600: 5000}, [(700, 725)])
        badges = v.avancer(JOUR, jd, 100)
        self.assertEqual([k for k, _ in badges], [2])
        self.assertEqual(v.pos, R.dist[ONDINE])


if __name__ == "__main__":
    unittest.main()
