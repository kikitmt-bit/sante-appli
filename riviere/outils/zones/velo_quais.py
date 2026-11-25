"""Le dessin de « La boucle des Quais » (25/11, étape 15, lot 2) : la rivière d'abord, puis tout ce qui la longe, en parallèles exactes.
    python riviere/outils/zones/velo_quais.py   -> riviere/outils/zones/velo-quais.json, puis : python riviere/outils/zone.py velo-quais"""
import json
import math
import statistics
from pathlib import Path
Y_EAU, Y_QUAI = 2.0, 3.9
R = [(-1000, 24, 0, 30), (-860, -40, 120, 30), (-620, 30, 120, 30), (-400, -60, 130, 28), (-190, 10, 130, 24), (60, -20, 170, 24), (330, 40, 150, 24), (560, -60, 0, 26)]
NOM = dict(A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7)


def seg(i):
    a, b = R[i], R[i + 1]
    l = math.hypot(b[0] - a[0], b[1] - a[1])
    return a, ((b[0] - a[0]) / l, (b[1] - a[1]) / l), l


def sur(n, t, u):
    """un point sur le segment n ("DE"), à la part t, à u mètres à droite du fil (sud)"""
    a, (tx, tz), l = seg(NOM[n[0]])
    return (a[0] + tx * l * t - tz * u, a[1] + tz * l * t + tx * u)


def coin(n, u, u2=None):
    """le coin de la parallèle à u mètres (u2 : après), avec son arrondi"""
    i = NOM[n]
    u2 = u if u2 is None else u2
    _, (ax, az), _ = seg(i - 1)
    _, (bx, bz), _ = seg(i)
    p = R[i]
    A = (p[0] - az * u, p[1] + ax * u)
    B = (p[0] - bz * u2, p[1] + bx * u2)
    den = ax * bz - az * bx
    t = ((B[0] - A[0]) * bz - (B[1] - A[1]) * bx) / den
    th = math.atan2(ax * bz - az * bx, ax * bx + az * bz)
    return (A[0] + ax * t, A[1] + az * t, p[2] - u * (1 if th > 0 else -1))


def pt(q, y=None, r=None):
    o = {"x": round(q[0], 2), "z": round(q[1], 2)}
    rr = r if r is not None else (q[2] if len(q) > 2 else None)
    if rr:
        o["r"] = round(rr, 2)
    if y is not None:
        o["y"] = y
    return o


def courbe(pts, pas=2):
    """la même que courbeZone : la longueur le long de la ligne arrondie"""
    o = [(pts[0][0], pts[0][1])]
    def droit(x, z):
        dx, dz = o[-1]
        l = math.hypot(x - dx, z - dz)
        k = max(1, round(l / pas))
        for t in range(1, k + 1):
            o.append((dx + (x - dx) * t / k, dz + (z - dz) * t / k))
    for i in range(1, len(pts) - 1):
        A, B, C = pts[i - 1], pts[i], pts[i + 1]
        la, lc = math.hypot(B[0] - A[0], B[1] - A[1]), math.hypot(C[0] - B[0], C[1] - B[1])
        ux, uz, vx, vz = (B[0] - A[0]) / la, (B[1] - A[1]) / la, (C[0] - B[0]) / lc, (C[1] - B[1]) / lc
        th = math.atan2(ux * vz - uz * vx, ux * vx + uz * vz)
        r = B[2]
        d = r * math.tan(abs(th) / 2)
        droit(B[0] - ux * d, B[1] - uz * d)
        sg = 1 if th > 0 else -1
        x0, z0 = o[-1]
        cx, cz = x0 - uz * r * sg, z0 + ux * r * sg
        a0 = math.atan2(z0 - cz, x0 - cx)
        k = max(2, round(r * abs(th) / pas))
        for t in range(1, k + 1):
            o.append((cx + math.cos(a0 + th * t / k) * r, cz + math.sin(a0 + th * t / k) * r))
    droit(pts[-1][0], pts[-1][1])
    s = [0]
    for a, b in zip(o, o[1:]):
        s.append(s[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    return o, s


PO, PS = courbe(R)


def s_eau(q):
    """la distance le long de l'eau du point le plus proche de q"""
    return round(min((math.hypot(p[0] - q[0], p[1] - q[1]), s) for p, s in zip(PO, PS))[1], 1)


def s_voie(v, q):
    o, s = courbe([(p["x"], p["z"], p.get("r", 4)) for p in v["pts"]], 1)
    return round(min((math.hypot(p[0] - q[0], p[1] - q[1]), d) for p, d in zip(o, s))[1], 1)


voies = []
def voie(id, nom, pts, **k):
    voies.append(dict({"id": id, "nom": nom}, **k, pts=pts))
    return voies[-1]


TP, TV, TN, TM = .17, .55, .45, .5   # la part des segments où sont la rue du Port, le Pont-Vieux, le Pont-Neuf, le pont du Moulin
PORT = sur("FG", TP, 0)
quaiS = voie("quaiS", "Le quai des Tanneurs", [pt(sur("GH", .50, 26), 4.4), pt(coin("G", 26), Y_QUAI), pt(coin("F", 26)), pt(coin("E", 26)), pt(sur("DE", .66, 26), Y_QUAI, 60), pt((sur("DE", .66, 26)[0] - 80, sur("DE", .66, 26)[1] + 26), 4.4, 60), pt((sur("DE", .66, 26)[0] - 150, sur("DE", .66, 26)[1] + 90), 6)], l=6.2, voitures=False)
quaiN = voie("quaiN", "Le quai des Lilas", [pt(sur("DE", .72, -18.3), 3.75), pt(coin("E", -18.3), Y_QUAI), pt(coin("F", -18.3), Y_QUAI), pt(coin("G", -18.3), Y_QUAI), pt(sur("GH", .40, -24), 4.2), ], l=6.2, t=2.4, voitures=False)
vieux = voie("vieux", "Le Pont-Vieux", [pt(sur("FG", TV, -165), 8), pt(sur("FG", TV, 0), 4.85), pt(sur("FG", TV, 165), 6.4)], l=6.2, t=2.2, voitures=False, arches=3)
neuf = voie("neuf", "Le Pont-Neuf", [pt(sur("EF", TN, 26)), pt(sur("EF", TN, 0), 4.7), pt(sur("EF", TN, -165), 8)], l=6.2, t=2.2, voitures=False, arches=3)
tan = voie("tanneurs", "La vieille rue", [pt(sur("FG", .93, 92), 5.2), pt(sur("FG", .30, 88), None, 120), pt(sur("FG", .02, 84), None, 90), pt(sur("EF", .74, 100), 5.6, 80), pt(sur("EF", .40, 128), 6.6)], l=5.4, t=2.4, voitures=False)
port = voie("port", "La rue du Port", [pt(sur("FG", TP, 130), 6.2), pt(sur("FG", TP, 26))], l=5.4, t=2.4, voitures=False)
dec = 5.4 / 4   # la voie de droite de la rue du Port : la piste cyclable part dans son prolongement
_, (fx, fz), _ = seg(NOM["F"])
def dec_port(u):
    q = sur("FG", TP, u)
    return (q[0] + fx * dec, q[1] + fz * dec)
pisteQ = voie("pisteQ", "La piste des quais", [pt(dec_port(26)), pt(dec_port(17.8), Y_QUAI, 5.5), pt(coin("F", 17.8), Y_QUAI), pt(coin("E", 17.8), Y_QUAI), pt(sur("DE", .62, 17.8), 3.8)], sol="cyclable", l=2.6)
moulin = voie("moulin", "La route du Moulin", [pt(sur("BC", TM, 130), 5), pt(sur("BC", TM, 0), 4.95), pt(sur("BC", TM, -75), 5.6, 60), pt((-684, -190), 9.6, 60), pt((-600, -282), 13.6, 60), pt((-372, -246), 14.6, 80), pt((-262, -312), 15)], l=4.6, t=0, arches=3, bout=1.9)
halage = voie("halage", "Le chemin de halage", [pt(sur("DE", .62, 17.8)), pt(sur("DE", .42, 17.8), 3.05, 60), pt(coin("D", 19.4), 2.9), pt(sur("CD", .62, 19.4), 2.9, 60), pt(sur("CD", .30, 30), 3.1, 60), pt(coin("C", 20.2), 2.9, 90), pt(sur("BC", .74, 20.2), 2.9, 90), pt(sur("BC", TM, 20.2))], sol="terre", l=2.4)
mx, mz = 228 / math.hypot(228, 36), 36 / math.hypot(228, 36)
N0 = (-600 + .72 * 228, -282 + .72 * 36)
def eq(d):
    return (N0[0] - mz * d, N0[1] + mx * d)
bois = voie("bois", "Le chemin de la Garenne", [pt(N0), pt(eq(38), 13.4, 26), pt((-410, -176), 11, 24), pt((-470, -120), 7.2, 26), pt(sur("CD", .64, -24), 3.4, 14), pt(coin("D", -19.6), 3.1), pt(sur("DE", .40, -18.3), 3.3)], sol="terre", l=3.6, traces=True)
rivage = voie("rivage", "La route du Rivage", [pt(sur("DE", .40, -18.3)), pt(sur("DE", .72, -18.3))], l=4.6, t=0)
# ce qui borde les rues
quaiS["d"] = "rien"
quaiN["d"] = "rien"
q = lambda v, p: s_voie(v, p)
quaiS["g"] = [{"a": 0, "b": q(quaiS, sur("FG", .86, 26)), "style": "maisons"}, {"a": q(quaiS, sur("FG", .50, 26)), "b": q(quaiS, sur("FG", .24, 26)), "style": "boutiques"}, {"a": q(quaiS, sur("FG", TP - .05, 26)), "b": q(quaiS, sur("EF", .62, 26)), "style": "serre"}, {"a": q(quaiS, sur("EF", .40, 26)), "b": q(quaiS, sur("EF", .10, 26)), "style": "residences"}, {"a": q(quaiS, sur("DE", .66, 26)) - 10, "b": 9999, "style": "maisons"}, {"style": "serre"}]
quaiN["g"] = [{"a": 0, "b": 16, "style": "cloture"}, {"a": 16, "b": q(quaiN, sur("DE", .98, -20)), "style": "maisons"}, {"a": q(quaiN, sur("EF", .10, -20)), "b": q(quaiN, sur("EF", .36, -20)), "style": "serre"}, {"a": q(quaiN, sur("EF", .54, -20)), "b": q(quaiN, sur("EF", .88, -20)), "style": "residences"}, {"a": q(quaiN, sur("FG", .10, -20)), "b": q(quaiN, sur("FG", .42, -20)), "style": "boutiques"}, {"style": "serre"}]
vieux["g"] = vieux["d"] = [{"style": "serre"}]
neuf["g"] = neuf["d"] = [{"style": "maisons"}]
sa, sb = q(tan, sur("FG", .50, 88)), q(tan, sur("FG", .39, 88))   # la placette, au sud de la vieille rue
tan["g"] = [{"a": sa - 1, "b": sb + 1, "style": "rien"}, {"style": "serre"}]
tan["d"] = [{"a": q(tan, sur("FG", .48, 88)), "b": q(tan, sur("FG", .25, 88)), "style": "boutiques"}, {"style": "serre"}]
port["g"] = port["d"] = "serre"
moulin["g"] = [{"a": 8, "b": 100, "style": "cloture"}, {"a": 470, "b": 560, "style": "cloture"}, {"style": "rien"}]
moulin["d"] = [{"a": 8, "b": 92, "style": "cloture"}, {"style": "rien"}]
halage["g"] = [{"a": 6, "b": 66, "style": "cloture"}, {"a": 250, "b": 330, "style": "cloture"}, {"style": "rien"}]
rivage["g"] = [{"a": 8, "b": 70, "style": "cloture"}]

# l'eau
eau = {"id": "riviere", "nom": "La rivière", "y": Y_EAU, "pts": [dict(pt((x, z), None, r or None), l=l) for x, z, r, l in R],
       "d": [{"a": s_eau(sur("DE", .64, 0)), "b": s_eau(sur("GH", .30, 0)), "style": "quai", "prom": 8, "ea": 2.5, "garde": "fer", "arbres": "platane"}],
       "g": [{"a": s_eau(sur("DE", .63, 0)), "b": s_eau(sur("GH", .34, 0)), "style": "quai", "pierre": .9, "garde": "muret"}]}


def rect(n, t0, t1, u0, u1, r=.01):
    return [dict(pt(sur(n, t, u)), r=r) for t, u in ((t0, u0), (t1, u0), (t1, u1), (t0, u1))]


def poly(*L, r=6):
    return [dict(pt(p), r=r) for p in L]


nature = [
    # les deux bouts de la rivière, dans les bois
    {"genre": "foret", "nom": "Le bois d'amont", "esp": "hetre", "pts": poly((-1230, -60), (-1000, -150), (-880, -190), (-800, -100), (-826, -44), (-810, 40), (-790, 110), (-900, 190), (-1230, 190))},
    {"genre": "foret", "nom": "Le bois d'aval", "esp": "bouleau", "pts": poly((470, -190), (690, -190), (690, 130), (470, 130), (452, 60), (440, -60))},
    # la rive sud, le long du halage
    {"genre": "pre", "nom": "Les prés du halage", "pts": poly((-742, 24), (-640, 64), (-560, 46), (-540, 130), (-720, 150))},
    {"genre": "verger", "nom": "Le verger du halage", "esp": "pommier", "cote": 0, "pts": poly((-520, 34), (-420, -12), (-400, 70), (-500, 110))},
    {"genre": "pre", "nom": "La prairie", "pts": poly((-404, -8), (-300, 18), (-250, 120), (-390, 100))},
    {"genre": "foret", "nom": "Les saules", "esp": "hetre", "pts": poly((-640, 62), (-548, 44), (-528, 112), (-620, 130))},
    # la rive nord, les champs de la route du Moulin
    {"genre": "champ", "culture": "ble", "nom": "Les blés", "cote": 0, "pts": poly((-712, -70), (-570, -104), (-570, -262), (-600, -274), (-682, -186))},
    {"genre": "champ", "culture": "tournesols", "nom": "Les tournesols", "cote": 0, "pts": poly((-722, -104), (-688, -192), (-608, -290), (-640, -370), (-790, -240))},
    {"genre": "champ", "culture": "vignes", "nom": "Les vignes", "cote": 0, "pts": poly((-592, -285), (-452, -263), (-445, -340), (-590, -352))},
    {"genre": "foret", "nom": "Le bois de la Garenne", "esp": "chene", "pts": poly((-562, -262), (-390, -236), (-330, -190), (-350, -120), (-420, -96), (-470, -84), (-560, -60))},
    {"genre": "pre", "nom": "Le pré du rivage", "pts": poly((-372, -110), (-240, -54), (-250, -120), (-330, -160))},
]
place_pts = [sur("FG", .50, 88 + 2.7 + 2.4), sur("FG", .39, 88 + 2.7 + 2.4), sur("FG", .39, 88 + 31), sur("FG", .50, 88 + 31)]
places = [{"nom": "La place du Lavoir", "y": 5.0, "pts": [dict(pt(p), r=1) for p in place_pts], "boutiques": [1, 2, 3]}]
pc = (statistics.mean(p[0] for p in place_pts), statistics.mean(p[1] for p in place_pts))


def le_long(n, t, u, o, vers=None, **k):
    """un objet sur le segment n ; vers : +1 regarde la rivière depuis le sud, -1 depuis le nord, ou un angle"""
    q_ = sur(n, t, u)
    _, (tx, tz), _ = seg(NOM[n[0]])
    nx, nz = (tz, -tx) if (vers or 0) > 0 else (-tz, tx)
    return dict({"o": o, "x": round(q_[0], 2), "z": round(q_[1], 2), "lacet": round(math.atan2(nx, nz), 3)}, **k)


objets = [
    {"o": "fontaine", "x": round(pc[0], 2), "z": round(pc[1], 2), "r": 2.2, "voir": True},
    # la maison de l'éclusier, sa table, son ponton
    le_long("CD", .30, 43, "maison_pente", 1, l=8.6, p=6.4, varie=True, voir=True, dos=True),
    le_long("CD", .37, 35.5, "table_bois", 1, r=1.3, voir=True),
    le_long("CD", .28, 13.4, "ponton_bois", 1, eau0=Y_EAU, long=5, r=.9, libre=True, flotte=True, voir=True, vu=18),
    le_long("CD", .285, 12.0, "habitant", 1, nom="youngster", r=.3, libre=True, flotte=True, dy=.65),
    le_long("CD", .282, 10.2, "barque", 1, l=4.2, p=1.5, libre=True, flotte=True),
    le_long("BC", .92, 25.5, "banc", 1, r=.8, voir=True),
    le_long("DE", .30, 22.4, "borne_bois", 1, r=.2, voir=True),
    le_long("CD", .80, 26, "stere", 1, r=1.4, voir=True),
    # la rive nord
    le_long("CD", .80, -13.2, "ponton_bois", -1, eau0=Y_EAU, long=4.6, r=.9, libre=True, flotte=True, voir=True, vu=18),
    le_long("CD", .80, -28, "banc", -1, r=.8, voir=True),
    le_long("DE", .22, -27, "meule", -1, r=1.6, voir=True),
    le_long("DE", .64, -25.2, "panneau_ville", 0, texte="RIVEBELLE", r=.9, voir=True),
    {"o": "chapelle", "x": -522, "z": -318, "lacet": -.12, "l": 9, "p": 6, "r": 6, "voir": True, "vu": 46},
    {"o": "eolienne", "x": -800, "z": -380, "lacet": .6, "r": 3},
    {"o": "arbre_bois", "x": -724, "z": -104, "lacet": 0, "r": .9, "ech": 1.6, "esp": "chene", "couronne": 4.5, "voir": True, "bois": True, "vu": 14},
    {"o": "meule", "x": -668, "z": -196, "lacet": 1, "r": 1.6, "voir": True, "vu": 12},
    {"o": "ruche", "x": -560, "z": -288, "lacet": 0, "r": .4, "voir": True, "vu": 9},
    {"o": "ruche", "x": -558, "z": -288.5, "lacet": 0, "r": .4},
]
objets[12]["lacet"] = round(math.atan2(-seg(NOM["D"])[1][0], -seg(NOM["D"])[1][1]), 3)
# des habitants et des Pokémon au bord de l'eau, en ville
for n, t, u, o, k in [("EF", .70, 14.2, "habitant", {"nom": "beauty"}), ("EF", .22, 14.4, "habitant", {"nom": "gentleman"}), ("FG", .42, -15, "habitant", {"nom": "lass"}), ("DE", .92, 14.2, "pokemon", {"num": 54}), ("FG", .30, 14.2, "habitant", {"nom": "picnicker"}), ("EF", .80, -14.2, "pokemon", {"num": 52}), ("BC", .86, 24.4, "pokemon", {"num": 79}), ("CD", .52, 25.8, "pokemon", {"num": 43}), ("DE", .12, 23.6, "pokemon", {"num": 61}), ("DE", .55, -26, "pokemon", {"num": 128})]:
    objets.append(le_long(n, t, u, o, 1 if u > 0 else -1, r=.4, voir=True, **k))

etapes = [
    {"v": "quaiN", "cote": "v", "de": 0, "a": 3, "nom": "Le quai des Lilas", "r": 30, "noms": {}},
    {"v": "vieux", "cote": "v", "de": 0, "a": 2, "nom": "Le Pont-Vieux", "r": 5},
    {"v": "tanneurs", "cote": "v", "de": 0, "a": 2, "nom": "La vieille rue", "r": 5},
    {"v": "port", "cote": "v", "de": 0, "a": 1, "nom": "La rue du Port", "r": 5},
    {"v": "pisteQ", "cote": "m", "de": 0, "a": 4, "nom": "La piste des quais", "r": 30},
    {"v": "halage", "cote": "m", "de": 0, "a": 7, "nom": "Le chemin de halage", "r": 30},
    {"v": "moulin", "cote": "v", "decale": 1.3, "de": 0, "a": 5, "nom": "Le pont du Moulin", "r": 6, "noms": {"2": "La route du Moulin", "3": "Les blés"}},
    {"v": "bois", "cote": "v", "decale": .95, "de": 0, "a": 6, "nom": "Le bois de la Garenne", "r": 6, "ambs": {"1": "bois", "4": None}, "noms": {"4": "La rive nord"}},
    {"v": "rivage", "cote": "v", "decale": .95, "de": 0, "a": 1, "nom": "La route du Rivage", "r": 30},
    {"v": "rivage", "de": 0, "a": 1, "s0": 26, "s1": 50, "u0": .95, "u1": 1.55, "r": 30},
]
d = {"id": "velo-quais", "nom": "La boucle des Quais", "graine": 27, "sorte": "velo", "machines": ["velo"], "allure": 1, "elan": 50,
     "note": "(25/11, étape 15, lot 2) le circuit d'essai au bord de l'eau : quais, ponts, piste cyclable, chemin de halage. python riviere/outils/zone.py velo-quais en fait le niveau.",
     "sauvages": {"eau": {"nums": [7, 54, 118, 60, 129, 79]}, "foret": {"nums": [10, 13, 25, 43, 46]}, "verger": {"nums": [16, 39, 133]}, "pre": {"nums": [128, 77]}},
     "depart": [1, .25], "etapes": etapes,
     "zone": {"velo": True, "rc": 6, "marge": 82, "voies": voies, "eaux": [eau], "places": places, "nature": nature, "objets": objets}}
f = "riviere/outils/zones/velo-quais.json"
open(f, "w", encoding="utf-8", newline="\n").write(json.dumps(d, ensure_ascii=False, indent=1) + "\n")
print("écrit", f)
