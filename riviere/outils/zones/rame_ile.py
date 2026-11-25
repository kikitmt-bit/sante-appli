"""Le dessin de « Le tour de l'île » (25/11, étape 15, lot 3a) : deux bras de rivière autour d'une vieille ville ; l'eau d'abord, tout le reste en parallèles exactes.
    python riviere/outils/zones/rame_ile.py   -> riviere/outils/zones/rame-ile.json, puis : python riviere/outils/zone.py rame-ile
Deux eaux : « vieux » (la rivière : l'amont, le vieux bras au nord de l'île, l'aval) et « canal » (au sud), qui en part et y revient. On descend le canal, on remonte le vieux bras.
u : l'écart au fil de l'eau, + = à droite : dehors (sud) pour le canal, l'île pour le vieux bras."""
import json
import math

Y_EAU, Y_QUAI = 2.0, 3.1
EAUX = {
    "vieux": [(-760, -10, 0, 26), (-560, -70, 110, 26), (-400, -40, 60, 25), (-282, -82, 60, 12), (-170, -48, 60, 11), (-111, -80, 0, 9.6), (-52, -112, 70, 25), (9, -95, 0, 13), (70, -78, 70, 11.5), (182, -132, 70, 11.5), (292, -84, 60, 11.5), (348, -62, 0, 10), (404, -40, 60, 24), (560, -84, 110, 27), (760, -30, 0, 27)],
    "canal": [(-400, -40, 0, 13), (-400, 62, 42, 12.5), (-285, 80, 60, 10.5), (-180, 126, 60, 11.5), (-70, 98, 60, 12.5), (22, 144, 70, 12.5), (140, 130, 70, 24), (232, 84, 60, 13), (330, 114, 60, 12.5), (404, 98, 38, 13.5), (404, -40, 0, 15)],
}


def seg(e, i):
    a, b = EAUX[e][i], EAUX[e][i + 1]
    l = math.hypot(b[0] - a[0], b[1] - a[1])
    return a, ((b[0] - a[0]) / l, (b[1] - a[1]) / l), l


def sur(e, i, t, u=0):
    """un point de l'eau e, sur son segment i, à la part t (ou t mètres si t > 1), à u mètres à droite du fil"""
    a, (tx, tz), l = seg(e, i)
    d = t if abs(t) > 1 else l * t
    return (a[0] + tx * d - tz * u, a[1] + tz * d + tx * u)


def coin(e, n, u, u2=None):
    """le coin n de la parallèle à u mètres (u2 : après), avec son arrondi"""
    u2 = u if u2 is None else u2
    _, (ax, az), _ = seg(e, n - 1)
    _, (bx, bz), _ = seg(e, n)
    p = EAUX[e][n]
    A, B = (p[0] - az * u, p[1] + ax * u), (p[0] - bz * u2, p[1] + bx * u2)
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


def courbe(pts, pas=1):
    """la même que courbeZone : la longueur le long de la ligne arrondie"""
    o = [(pts[0][0], pts[0][1])]

    def droit(x, z):
        dx, dz = o[-1]
        k = max(1, round(math.hypot(x - dx, z - dz) / pas))
        for t in range(1, k + 1):
            o.append((dx + (x - dx) * t / k, dz + (z - dz) * t / k))
    for i in range(1, len(pts) - 1):
        A, B, C = pts[i - 1], pts[i], pts[i + 1]
        la, lc = math.hypot(B[0] - A[0], B[1] - A[1]), math.hypot(C[0] - B[0], C[1] - B[1])
        ux, uz, vx, vz = (B[0] - A[0]) / la, (B[1] - A[1]) / la, (C[0] - B[0]) / lc, (C[1] - B[1]) / lc
        th = math.atan2(ux * vz - uz * vx, ux * vx + uz * vz)
        r = B[2] or 4
        if abs(th) < .005:
            droit(B[0], B[1])
            continue
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


COURBES = {e: courbe(p, 2) for e, p in EAUX.items()}


def se(e, i, t):
    """la distance le long de l'eau e du point (segment i, part t)"""
    q = sur(e, i, t)
    P, S = COURBES[e]
    return round(min((math.hypot(p[0] - q[0], p[1] - q[1]), s) for p, s in zip(P, S))[1], 1)


def sv(v, q):
    o, s = courbe([(p["x"], p["z"], p.get("r", 4)) for p in v["pts"]], 1)
    return round(min((math.hypot(p[0] - q[0], p[1] - q[1]), d) for p, d in zip(o, s))[1], 1)


C, V = "canal", "vieux"
voies = []


def voie(id, nom, pts, **k):
    voies.append(dict({"id": id, "nom": nom}, **k, pts=pts))
    return voies[-1]


# les rues (les premières écrites donnent leur hauteur aux suivantes)
grande = voie("grande", "La Grande Rue", [pt((-322, 16), 3.5), pt((-150, 30), 3.9, 90), pt((20, 16), 3.9, 120), pt((190, 24), 3.6, 120), pt((342, 30), 3.4)], l=5.4, t=2.2, voitures=False)
pontA = voie("pontA", "Le Pont des Tanneurs", [pt(sur("canal", 1, 62, 74), 3.6), pt(sur("canal", 1, 62, 0), 5.5), pt(sur("canal", 1, 62, -38), 3.6, 14), pt((-322, 16))], l=5, t=1.8, voitures=False, arches=1)
pontM = voie("pontM", "Le Pont du Moulin", [pt((-322, 16)), pt(sur("vieux", 2, 76, 34), 3.6, 14), pt(sur("vieux", 2, 76, 0), 5.6), pt(sur("vieux", 2, 76, -34), 3.7), pt(sur("vieux", 2, 76, -90), 3.4)], l=5, t=1.6, voitures=False, arches=1)
pontP = voie("pontP", "Le Pont de Fer", [pt(sur("canal", 6, 26, 80), 3.8), pt(sur("canal", 6, 26, 0), 5.5), pt(sur("canal", 6, 26, -44), 3.5, 20), pt((116, 20.3))], l=5, t=1.8, voitures=False, pont="fer", arches=1)
pontE = voie("pontE", "Le Pont des Platanes", [pt(sur("canal", 8, 30, 80), 3.8), pt(sur("canal", 8, 30, 0), 5.5), pt(sur("canal", 8, 30, -40), 3.4, 14), pt((342, 30))], l=5, t=1.6, voitures=False, arches=1)
passer = voie("passer", "La passerelle", [pt((34, 16.5)), pt(sur("vieux", 7, 52, 36), 3.0, 14), pt(sur("vieux", 7, 52, 0), 5.5), pt(sur("vieux", 7, 52, -34), 3.5), pt(sur("vieux", 7, 52, -60), 3.6)], sol="terre", l=2.4, pont="bois", arches=1)
rueS = voie("rueS", "La rue du Canal", [pt(sur("canal", 1, 62, 30)), pt(coin("canal", 2, 30)), pt(coin("canal", 3, 30), 3.5), pt(coin("canal", 4, 30), 3.5), pt(coin("canal", 5, 30), 3.5), pt(coin("canal", 6, 30)), pt(sur("canal", 6, 26, 30))], l=5.2, t=2, voitures=False)
fleurs = voie("fleurs", "Le quai aux Fleurs", [pt(sur("canal", 2, .34, -17.5), 3.2), pt(coin("canal", 3, -17.5), 3.15), pt(sur("canal", 3, .3, -17.5), 3.2)], l=4.4, t=2, voitures=False)
halage = voie("halage", "Le chemin de halage", [pt(sur(V, 3, .15, -12.5), 3.0), pt(sur(V, 3, .9, -12.5), 2.9, 40), pt(sur(V, 5, .1, -15), 2.9, 40), pt((-60, -136), 2.9, 50), pt(sur(V, 7, 14, -30), 3.2, 24), pt(sur(V, 7, 52, -40))], sol="terre", l=2)
halage2 = voie("halage2", "Le chemin de halage", [pt(sur(V, 7, 52, -40)), pt(sur(V, 8, 22, -27), 3.2, 16), pt(sur(V, 8, .55, -13), 2.95, 30), pt(sur(V, 8, .88, -12), 2.95, 50), pt(sur(V, 9, .2, -13.5), 2.9, 50), pt(sur(V, 10, .2, -13.5), 2.9, 50), pt(sur(V, 11, .6, -15), 2.9)], sol="terre", l=2)
coteau = voie("coteau", "Le chemin des vignes", [pt(sur("vieux", 8, .02, -64), 8.5), pt(sur("vieux", 8, .5, -68), 10.5, 60), pt(sur("vieux", 8, .98, -62), 9)], sol="terre", l=2.6)
# ce qui borde les rues
fleurs["g"], fleurs["d"] = [{"a": 0, "b": sv(fleurs, sur(C, 2, .7, -17.5)), "style": "boutiques"}, {"a": sv(fleurs, sur(C, 3, .14, -17.5)), "b": 999, "style": "boutiques"}, {"style": "haie"}], "rien"
grande["g"] = grande["d"] = "serre"
rueS["g"] = [{"a": sv(rueS, sur("canal", 5, .2, 30)), "b": sv(rueS, sur("canal", 5, .95, 30)), "style": "serre"}, {"style": "maisons"}]
rueS["d"] = "maisons"
for w in (pontA, pontM, pontP, pontE):
    w["g"] = w["d"] = [{"style": "maisons"}]
eaux = [
    {"id": "vieux", "nom": "Le vieux bras", "y": Y_EAU, "courant": .55, "pts": [dict(pt((x, z), None, r or None), l=l) for x, z, r, l in EAUX[V]],
     "g": [{"a": 0, "b": se(V, 3, .1), "style": "talus", "tal": 4, "genre": "herbe"}, {"a": se(V, 3, .1), "b": se(V, 3, .82), "style": "talus", "tal": 3.2, "genre": "herbe"}, {"a": se(V, 3, .82), "b": se(V, 5, .4), "style": "talus", "tal": 3.2, "genre": "ombre"},
           {"a": se(V, 5, .4), "b": se(V, 7, .2), "style": "talus", "tal": 4, "genre": "nenuphars"}, {"a": se(V, 7, .2), "b": se(V, 8, .9), "style": "talus", "tal": 3.2, "genre": "herbe"}, {"a": se(V, 8, .9), "b": se(V, 10, .2), "style": "talus", "tal": 4, "genre": "roseaux"},
           {"a": se(V, 10, .2), "b": se(V, 11, .9), "style": "talus", "tal": 3.2, "genre": "saules"}, {"a": se(V, 11, .9), "style": "talus", "tal": 4, "genre": "roseaux"}],
     "d": [{"a": se(V, 1, .55), "b": se(V, 3, .02), "style": "quai", "garde": "muret", "bouts": [{"a": se(V, 1, .55), "b": se(V, 2, .5), "genre": "arbres", "prom": 6}, {"a": se(V, 2, .5), "b": se(V, 3, .02), "genre": "jardins"}]},
           {"a": se(V, 3, .02), "b": se(V, 3, .82), "style": "talus", "tal": 4, "genre": "herbe"}, {"a": se(V, 3, .82), "b": se(V, 5, .4), "style": "talus", "tal": 3.2, "genre": "ombre"}, {"a": se(V, 5, .4), "b": se(V, 6, .8), "style": "talus", "tal": 4, "genre": "nenuphars"},
           {"a": se(V, 6, .8), "b": se(V, 8, .1), "style": "talus", "tal": 4, "genre": "nu"}, {"a": se(V, 8, .1), "b": se(V, 8, .9), "style": "talus", "tal": 3.2, "genre": "herbe"}, {"a": se(V, 8, .9), "b": se(V, 10, .2), "style": "talus", "tal": 4, "genre": "roseaux"}, {"a": se(V, 10, .2), "b": 1e5, "style": "talus", "tal": 3.2, "genre": "saules"}]},
    {"id": "canal", "nom": "Le canal", "y": Y_EAU, "courant": .35, "pts": [dict(pt((x, z), None, r or None), l=l) for x, z, r, l in EAUX[C]],
     "g": [{"a": -50, "b": se(C, 9, .56), "style": "quai", "garde": "muret", "bouts": [
         {"a": -50, "b": se(C, 0, .82), "genre": "arbres", "prom": 6}, {"a": se(C, 0, .86), "b": se(C, 2, .3), "genre": "maisons"}, {"a": se(C, 2, .32), "b": se(C, 2, .92), "genre": "fleurs", "prom": 6.4, "garde": "fer"}, {"a": se(C, 2, .92), "b": se(C, 3, .3), "genre": "terrasses", "prom": 6.4, "garde": "fer"},
         {"a": se(C, 3, .34), "b": se(C, 4, .02), "genre": "jardins"}, {"a": se(C, 4, .02), "b": se(C, 4, .96), "genre": "maisons"}, {"a": se(C, 5, .06), "b": se(C, 6, .12), "genre": "arbres", "prom": 7, "garde": "fer", "bateaux": "peniches"},
         {"a": se(C, 6, .4), "b": se(C, 7, .06), "genre": "nu", "garde": "fer", "bateaux": "barques"}, {"a": se(C, 7, .1), "b": se(C, 8, .16), "genre": "arbres", "arbres": "cerisier", "prom": 5.5, "garde": "fer"}, {"a": se(C, 8, .6), "b": se(C, 9, .05), "genre": "arbres", "arbres": "platane", "prom": 6}, {"a": se(C, 9, .05), "b": se(C, 9, .56), "genre": "nu", "garde": "rien"}]},
           {"a": se(C, 9, .56), "b": 1e5, "style": "talus", "tal": 3.2, "genre": "saules"}],
     "d": [{"a": -50, "b": se(C, 9, .6), "style": "quai", "garde": "muret", "bouts": [
         {"a": -50, "b": se(C, 0, .34), "genre": "arbres", "prom": 6}, {"a": se(C, 0, .34), "b": se(C, 0, .9), "genre": "nu"}, {"a": se(C, 1, .06), "b": se(C, 2, .95), "genre": "maisons"}, {"a": se(C, 3, .05), "b": se(C, 4, .0), "genre": "jardins"}, {"a": se(C, 4, .02), "b": se(C, 4, .96), "genre": "maisons"},
         {"a": se(C, 5, .02), "b": se(C, 5, .3), "genre": "nu"}, {"a": se(C, 5, .3), "b": se(C, 6, .12), "genre": "arbres", "prom": 7, "bateaux": "peniches"}, {"a": se(C, 6, .38), "b": se(C, 7, .06), "genre": "maisons"},
         {"a": se(C, 7, .1), "b": se(C, 8, .16), "genre": "arbres", "arbres": "cerisier", "prom": 5.5, "garde": "fer"}, {"a": se(C, 8, .6), "b": se(C, 9, .05), "genre": "arbres", "arbres": "platane", "prom": 6}, {"a": se(C, 9, .05), "b": se(C, 9, .6), "genre": "nu", "garde": "rien"}]},
           {"a": se(C, 9, .6), "b": 1e5, "style": "talus", "tal": 4, "genre": "roseaux"}]},
]


def poly(*L, r=4):
    return [dict(pt(p), r=r) for p in L]


place_pts = [sur(C, 6, .42, -6.6), sur(C, 6, .98, -6.6), sur(C, 6, .98, -31), sur(C, 6, .42, -31)]
places = [{"nom": "La place du Marché", "y": 3.15, "pts": [dict(pt(p), r=1) for p in place_pts], "boutiques": [1, 2, 3]}]
pc = (sum(p[0] for p in place_pts) / 4, sum(p[1] for p in place_pts) / 4)
nature = [
    {"genre": "foret", "nom": "Le bois d'amont", "esp": "hetre", "pts": poly((-800, -60), (-560, -120), (-470, -110), (-480, -62), (-560, -90), (-780, -32))},
    {"genre": "foret", "nom": "Le bois d'amont", "esp": "hetre", "pts": poly((-800, 60), (-560, 10), (-470, 10), (-450, 110), (-600, 110))},
    {"genre": "foret", "nom": "Le bois d'aval", "esp": "bouleau", "pts": poly((470, -150), (780, -110), (780, -50), (560, -104), (470, -72))},
    {"genre": "foret", "nom": "Le bois d'aval", "esp": "bouleau", "pts": poly((470, -40), (560, -60), (780, -8), (780, 60), (470, 60))},
    {"genre": "foret", "nom": "Le petit bois", "esp": "hetre", "pts": poly(sur(V, 3, .84, 5), sur(V, 4, .2, 5), sur(V, 5, .4, 5), sur(V, 5, .3, 46), sur(V, 3, .84, 40))},
    {"genre": "foret", "nom": "Le petit bois", "esp": "hetre", "pts": poly(sur(V, 3, .86, -5), sur(V, 4, .3, -5), sur(V, 5, .4, -5), sur(V, 5, .2, -54), sur(V, 3, .86, -54))},
    {"genre": "potagers", "nom": "Les potagers", "cote": 0, "pts": poly(sur(V, 3, .16, 8.6), sur(V, 3, .76, 8.6), sur(V, 3, .76, 42), sur(V, 3, .2, 42))},
    {"genre": "pre", "nom": "Le pré du halage", "pts": poly(sur(V, 3, .1, -15), sur(V, 3, .95, -15), sur(V, 3, .95, -74), sur(V, 3, .1, -74))},
    {"genre": "champ", "culture": "vignes", "nom": "Les vignes", "cote": 0, "pts": poly(sur(V, 8, .34, -16), sur(V, 8, .94, -14.5), sur(V, 8, .94, -60), sur(V, 8, .1, -60), sur(V, 8, .1, -40))},
    {"genre": "verger", "nom": "Le verger", "esp": "pommier", "cote": 0, "pts": poly(sur(V, 8, .1, 9), sur(V, 8, .92, 9), sur(V, 8, .92, 44), sur(V, 8, .1, 44))},
    {"genre": "pre", "nom": "La prairie humide", "pts": poly(sur(V, 9, .1, -16), sur(V, 10, .1, -16), sur(V, 10, .1, -74), sur(V, 9, .1, -74))},
    {"genre": "pre", "nom": "La pointe", "pts": poly(sur(V, 9, .2, 12), sur(V, 10, .3, 12), (290, -40), (200, -50))},
]


def demi(e, i, t):
    """la demi-largeur de l'eau e, sur son segment i, à la part t (la même règle que zone.js : elle passe d'un point à l'autre en douceur, mesurée le long de la courbe)"""
    s, P = se(e, i, t), EAUX[e]
    som = [0] + [se_coin(e, k) for k in range(1, len(P) - 1)] + [COURBES[e][1][-1]]
    j = 0
    while j < len(P) - 2 and s > som[j + 1]:
        j += 1
    u = max(0, min(1, (s - som[j]) / (som[j + 1] - som[j])))
    u = u * u * (3 - 2 * u)
    return (P[j][3] + (P[j + 1][3] - P[j][3]) * u) / 2


def se_coin(e, k):
    p, (Q, S) = EAUX[e][k], COURBES[e]
    return min((math.hypot(q[0] - p[0], q[1] - p[1]), s) for q, s in zip(Q, S))[1]


def berge(e, i, t, cote, recul, o, **k):
    """un objet sur une berge (cote : +1 à droite du fil, -1 à gauche), à recul mètres du bord, tourné vers l'eau"""
    t = t if abs(t) <= 1 else t / seg(e, i)[2]
    q, (_, (tx, tz), _) = sur(e, i, t, cote * (demi(e, i, t) + recul)), seg(e, i)
    return dict({"o": o, "x": round(q[0], 2), "z": round(q[1], 2), "lacet": round(math.atan2(cote * tz, -cote * tx), 3), "eau0": Y_EAU}, **k)


def eau_(e, i, t, u, o, travers=False, **k):
    """un objet sur l'eau : son axe z dans le sens du fil ; travers : x en travers, pareil, mais à l'envers"""
    q, (_, (tx, tz), _) = sur(e, i, t, u), seg(e, i)
    return dict({"o": o, "x": round(q[0], 2), "z": round(q[1], 2), "lacet": round(math.atan2(tx, tz), 3), "eau0": Y_EAU}, **k)


mur = dict(libre=True, muraille=True, dur=True, voir=True)
objets = [
    # la pointe de l'île, le moulin, le barrage
    berge(C, 0, .52, 1, 4.05, "moulin_eau", r=5.5, l=11, p=8, **dict(mur, vu=22)),
    eau_(V, 1, .7, 0, "deversoir", long=27, r=2, voir=True, vu=70, libre=True, flotte=True, dessus=True),
    dict(berge(C, 0, .3, -1, 2.2, "fanal", r=1.2, libre=True, dur=True, voir=True, vu=24)),
    berge(C, 0, .62, -1, 1.8, "banc", r=.8, voir=True),
    # le canal des Tanneurs
    eau_(C, 1, 90, 0, "linge_canal", long=10.2, haut=5.9, voir=True, libre=True, flotte=True, dessus=True),
    eau_(C, 2, 40, 0, "linge_canal", long=10.6, haut=5.2, voir=True, libre=True, flotte=True, dessus=True),
    # le passage sous les maisons, le lavoir
    eau_(C, 4, 46, 0, "passage_maisons", long=16, large=12.4, voute=3.6, voir=True, vu=14, libre=True, flotte=True, dessus=True),
    berge(C, 5, .17, 1, 2.8, "lavoir", r=4.6, l=9, p=4.6, **mur),
    # la place du Marché
    {"o": "fontaine", "x": round(pc[0], 2), "z": round(pc[1], 2), "r": 2.2, "voir": True, "vu": 30},
    berge(C, 6, .6, -1, 1.6, "etal", r=1.2, libre=True, voir=True), berge(C, 6, .72, -1, 1.6, "etal", r=1.2, libre=True, voir=True), berge(C, 6, .86, -1, 1.7, "terrasse", r=1.05, libre=True, voir=True), berge(C, 6, .5, -1, .02, "escalier_eau", r=1.6, **mur),
    # l'allée des Cerisiers : le kiosque ; l'église au milieu de l'île
    berge(C, 7, .5, -1, 17, "kiosque", r=4.1, dur=True, voir=True, vu=30),
    {"o": "clocher", "x": -44, "z": 60, "lacet": .1, "r": 9, "dur": True},
    # l'écluse et la base nautique
    berge(C, 9, .34, 1, .3, "porte_ecluse", r=4, **dict(mur, vu=20)), berge(C, 9, .5, 1, 12, "maison_pente", l=8.6, p=6.4, varie=True, dos=True, r=5.5, voir=True),
    berge(C, 9, .36, -1, 9.5, "base_nautique", r=7, l=11, p=7, dur=True, voir=True, vu=26), berge(C, 9, .3, -1, -.2, "ponton_bois", long=3.4, r=.9, libre=True, flotte=True, voir=True), berge(C, 9, .43, -1, -.2, "ponton_bois", long=3.4, r=.9, libre=True, flotte=True, voir=True), eau_(C, 9, .365, -4.7, "canoe", r=.5, l=1.5, p=4.2, libre=True, flotte=True),
    # les roseaux : les cabanes des pêcheurs
    berge(V, 9, .3, -1, .6, "carrelet", r=2.2, **dict(mur, vu=20)), berge(V, 9, .74, 1, .6, "carrelet", r=2.2, **dict(mur, vu=20)), berge(V, 9, .52, -1, 1.2, "ponton_bois", long=3, r=.9, libre=True, flotte=True, voir=True),
    # les vignes, le verger
    berge(V, 8, .5, 1, 1.4, "banc", r=.8, voir=True), berge(V, 8, .3, 1, .8, "ponton_bois", long=3, r=.9, libre=True, flotte=True, voir=True), berge(V, 8, .34, 1, -1.5, "barque", l=1.5, p=4.2, r=1, libre=True, flotte=True, voir=True),
    berge(V, 9, .12, 1, 1.2, "carrelet", r=2.2, **dict(mur, vu=20)), berge(V, 9, .9, -1, .8, "ponton_bois", long=3, r=.9, libre=True, flotte=True, voir=True), berge(V, 9, .93, -1, -1.3, "canoe", l=4.2, p=1.5, r=1, libre=True, flotte=True),
    # la pointe d'aval : la maison du passeur, en face de qui sort du canal
    berge(V, 12, .06, -1, 7, "maison_pente", l=8.6, p=6.4, varie=True, r=5.5, dur=True, voir=True, vu=60), berge(V, 12, .07, -1, .6, "ponton_bois", long=5, r=.9, libre=True, flotte=True, voir=True, vu=40), berge(V, 12, .085, -1, -1.6, "barque", l=4.2, p=1.5, r=1, libre=True, flotte=True),
    # la guinguette
    berge(V, 7, 20, 1, 3.2, "guinguette", long=15, r=7, **dict(mur, vu=22)), berge(V, 7, 38, 1, 1.6, "guirlande", long=11, r=.4, libre=True, voir=True), berge(V, 6, .72, 1, 2, "guirlande", long=12, r=.4, libre=True), berge(V, 7, 36, 1, -1.4, "barque", l=4.2, p=1.5, r=1, libre=True, flotte=True), berge(V, 7, 31.5, 1, -1.4, "canoe", l=4.2, p=1.5, r=1, libre=True, flotte=True),
    # l'étang, les potagers
    eau_(V, 5, .8, 7, "barque", l=1.5, p=4.2, r=1, libre=True, flotte=True, voir=True), berge(V, 6, .5, -1, .8, "ponton_bois", long=4, r=.9, libre=True, flotte=True, voir=True),
    berge(V, 6, .2, 1, .8, "ponton_bois", long=4.4, r=.9, libre=True, flotte=True, voir=True), berge(V, 6, .24, 1, 4.4, "cabane_jardin", l=2.8, p=2.4, r=1.8, dur=True, voir=True),
    berge(V, 3, .34, 1, 3.6, "cabane_jardin", l=2.8, p=2.4, r=1.8, dur=True, voir=True), berge(V, 3, .6, 1, 3.8, "cabane_jardin", l=2.8, p=2.4, r=1.8, dur=True, voir=True), berge(V, 3, .72, 1, .9, "ponton_bois", long=2.6, r=.9, libre=True, flotte=True, voir=True), berge(V, 3, .77, 1, -1.3, "barque", l=4.2, p=1.5, r=1, libre=True, flotte=True), berge(V, 3, .5, 1, .9, "ponton_bois", long=2.6, r=.9, libre=True, flotte=True, voir=True), berge(V, 3, .3, 1, 4.5, "table_bois", r=1.3, voir=True), berge(V, 3, .66, -1, 2.4, "banc", r=.8, voir=True),
]
for q in objets:   # ce qui est au bout d'un ponton, au bord de la rivière
    if q["o"] == "ponton_bois":
        q["eau0"] = Y_EAU
etapes = [
    {"v": C, "cote": "m", "de": 0, "a": 10, "nom": "La pointe de l'île", "r": 13, "noms": {"1": "Le canal des Tanneurs", "2": "Le quai aux Fleurs", "3": "Les jardins", "4": "Le passage sous les maisons", "5": "Le port", "6": "La place du Marché", "7": "L'allée des Cerisiers", "8": "Le Pont des Platanes", "9": "L'écluse"}},
    {"v": V, "cote": "m", "de": 12, "a": 2, "nom": "Le bras des Saules", "r": 13, "noms": {"10": "Les roseaux", "9": "Les vignes", "8": "La guinguette", "7": "L'étang aux nénuphars", "5": "Le petit bois", "4": "Les potagers", "3": "Le Pont du Moulin"}, "ambs": {"11": None, "5": "bois", "4": None}},
]
d = {"id": "rame-ile", "nom": "Le tour de l'île", "graine": 31, "sorte": "rame", "machines": ["rameur"], "allure": 1, "elan": 60,
     "note": "(25/11, étape 15, lot 3a) le circuit d'essai du rameur dans une zone : deux bras de rivière autour d'une île. python riviere/outils/zone.py rame-ile en fait le niveau.",
     "sauvages": {"eau": {"nums": [7, 54, 118, 60, 129, 79, 116]}, "foret": {"nums": [10, 13, 25, 43, 46]}, "verger": {"nums": [16, 39, 133]}, "pre": {"nums": [128, 77]}, "potagers": {"nums": [43, 69, 133]}},
     "depart": [1, .34], "etapes": etapes,
     "zone": {"rame": True, "rc": 6, "marge": 82, "voies": voies, "eaux": eaux, "places": places, "nature": nature, "objets": objets}}
f = "riviere/outils/zones/rame-ile.json"
open(f, "w", encoding="utf-8", newline="\n").write(json.dumps(d, ensure_ascii=False, indent=1) + "\n")
print("écrit", f)
