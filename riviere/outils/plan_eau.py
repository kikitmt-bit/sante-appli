"""Un vrai plan d'eau dans La Rivière (18/11, Kiki : le lac d'Allier à Vichy, son vrai parcours de kayak et de paddle) : un tracé sur l'eau et la
carte OpenStreetMap autour deviennent un circuit d'eau du jeu (contenu/niveaux/).
    python riviere/outils/plan_eau.py TRACE.json CARTE.json --id vichy-lac --nom "Le lac d'Allier" [--ecrire]
        TRACE.json   le tracé sur l'eau : {"origine": [lat, lon], "points": [[x, y], ...]}, un point par mètre, en mètres autour de l'origine
                     (x vers l'est, y vers le nord). HORS du dépôt (riviere/outils/cartes/, ignoré par git).
        CARTE.json   la carte OpenStreetMap autour (la réponse d'overpass-api.de, « out geom »), HORS du dépôt elle aussi.
        --large 10   la largeur de la piste (le couloir où l'on rame), en mètres
        --rive-droite promenade --rive-gauche berge   les rives (contenu/biomes/vichy.json) de chaque berge de la rivière, rive droite et
                     rive gauche au sens de l'eau qui coule (le sens des lignes « waterway » de la carte) ; les îles et les plages sont trouvées seules
        --pont "Pont Jacques Chirac"   le grand pont sous lequel on passe (son nom sur la carte)
Ce que fait l'outil :
- la piste : les pièces du jeu tirées du tracé (comme gpx.py : longueurs, virages ; un lac est plat) ;
- le RIVAGE : tous les 10 m, de chaque côté, la largeur d'eau libre entre le bord de la piste et la vraie berge (la terre la plus proche le long
  de la perpendiculaire : la berge d'en face, une île) ; le moteur commence la rive là (moteur/champ.js, RECUL) ;
- les rives de chaque pièce : la berge de la rivière (rive droite, rive gauche), l'île, la plage ;
- les objets à leur vraie place : le pont (pont_route), les pontons (le grand ponton du club : ponton_aviron), le club d'aviron, puis les
  bâtiments et les arbres de la carte (osm.py), repérés PAR RAPPORT AU TRACÉ (mètre, côté, écart) : aucune coordonnée dans le niveau.
Citer « © les contributeurs d'OpenStreetMap » (licence ODbL)."""
import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gpx   # noqa: E402
import osm   # noqa: E402

RACINE = Path(__file__).resolve().parent.parent
PAS_RIVAGE = 10     # m : un relevé du rivage tous les 10 m
RIVAGE_MAX = 300    # m : au-delà, c'est le large (le moteur dessine jusqu'à 320 m)
G = 1.0             # m : la finesse du masque de l'eau


# ---------------------------------------------------------------- la carte de l'eau
def contours(e, proj):
    """Les contours extérieurs et intérieurs (les îles) d'une forme de la carte."""
    if e["type"] == "way":
        g = e.get("geometry") or []
        return ([[proj(p["lat"], p["lon"]) for p in g]] if len(g) >= 3 else []), []
    res = {"outer": [], "inner": []}
    for role in res:
        bouts = [[proj(p["lat"], p["lon"]) for p in m["geometry"]] for m in e.get("members", []) if m.get("role") == role and m.get("geometry")]
        while bouts:
            a = bouts.pop(0)
            colle = True
            while colle and math.dist(a[0], a[-1]) > .5:
                colle = False
                for k, b in enumerate(bouts):
                    if math.dist(a[-1], b[0]) < .5:
                        a += b[1:]; bouts.pop(k); colle = True; break
                    if math.dist(a[-1], b[-1]) < .5:
                        a += b[::-1][1:]; bouts.pop(k); colle = True; break
            if len(a) >= 3:
                res[role].append(a)
    return res["outer"], res["inner"]


class Eau:
    """Le masque de l'eau (un pixel par mètre) : les étendues d'eau de la carte, moins les îles (pontons=True : les pontons comptent comme de la
    terre ; pas pour le rivage : un ponton flotte devant la berge, il ne la remplace pas)."""
    def __init__(self, carte, proj, boite, pontons=False):
        self.x0, self.y0, self.x1, self.y1 = boite
        nx, ny = int((self.x1 - self.x0) / G) + 1, int((self.y1 - self.y0) / G) + 1
        im = Image.new("L", (nx, ny), 0)
        dr = ImageDraw.Draw(im)
        px = lambda p: ((p[0] - self.x0) / G, (self.y1 - p[1]) / G)
        self.iles, self.plages, self.rivieres = [], [], []
        for e in carte["elements"]:
            t = e.get("tags") or {}
            if e["type"] not in ("way", "relation"):
                continue
            if t.get("natural") == "water" or t.get("waterway") == "riverbank":
                ext, inte = contours(e, proj)
                for r in ext:
                    dr.polygon([px(p) for p in r], fill=255)
                self.iles += inte
            elif t.get("place") in ("islet", "island"):
                self.iles += contours(e, proj)[0]
            elif t.get("natural") == "beach":
                self.plages += contours(e, proj)[0]
            elif t.get("waterway") == "river" and e.get("geometry"):
                self.rivieres.append([proj(p["lat"], p["lon"]) for p in e["geometry"]])
        for r in self.iles:
            dr.polygon([px(p) for p in r], fill=0)
        for e in carte["elements"] if pontons else []:
            if (e.get("tags") or {}).get("man_made") == "pier" and e.get("geometry"):
                q = [px(proj(p["lat"], p["lon"])) for p in e["geometry"]]
                dr.line(q, fill=0, width=3)
                if len(q) > 3 and q[0] == q[-1]:
                    dr.polygon(q, fill=0)
        self.m = np.array(im) > 0

    def eau(self, x, y):
        i, j = int(round((self.y1 - y) / G)), int(round((x - self.x0) / G))
        return 0 <= i < self.m.shape[0] and 0 <= j < self.m.shape[1] and bool(self.m[i, j])

    def pres_de(self, polys, x, y, d):
        return any(osm.dedans(x, y, p) or min(math.hypot(x - a, y - b) for a, b in p) < d for p in polys
                   if min(q[0] for q in p) - d <= x <= max(q[0] for q in p) + d and min(q[1] for q in p) - d <= y <= max(q[1] for q in p) + d)

    def rive_de_la_riviere(self, x, y):
        """+1 si le point est sur la rive droite de la rivière (au sens où l'eau coule), -1 sur la rive gauche."""
        best = None
        for L in self.rivieres:
            for k in range(len(L) - 1):
                (ax, ay), (bx, by) = L[k], L[k + 1]
                dx, dy = bx - ax, by - ay
                n = dx * dx + dy * dy or 1
                u = max(0, min(1, ((x - ax) * dx + (y - ay) * dy) / n))
                d = math.hypot(x - ax - u * dx, y - ay - u * dy)
                if best is None or d < best[0]:
                    best = (d, dx, dy, x - ax, y - ay)
        _, dx, dy, vx, vy = best
        return 1 if dx * vy - dy * vx < 0 else -1   # à droite du sens de l'eau


# ---------------------------------------------------------------- le tracé -> les pièces
def caps_de(x, y):
    return gpx.caps(x, y)


def rivage(E, x, y, cap, large):
    """Tous les PAS_RIVAGE m, de chaque côté : la largeur d'eau libre entre le bord de la piste et la terre (berge, île, ponton)."""
    n = len(x)
    out = {"g": [], "d": []}
    for s in range(0, n + PAS_RIVAGE, PAS_RIVAGE):
        i = min(s, n - 1)
        c = cap[i]
        for cote, sg in (("g", -1), ("d", 1)):
            nx, ny = sg * math.cos(c), -sg * math.sin(c)
            r = RIVAGE_MAX
            for d in range(int(large / 2), int(large / 2) + RIVAGE_MAX):
                if not E.eau(x[i] + nx * d, y[i] + ny * d):
                    r = d - large / 2; break
            out[cote].append(max(0.0, r))
    for cote in out:   # un relevé isolé (un ponton, un pieu) ne fait pas une berge : le médian de trois, puis un peu de douceur
        v = out[cote]
        m = [sorted(v[max(0, k - 1):k + 2])[len(v[max(0, k - 1):k + 2]) // 2] for k in range(len(v))]
        out[cote] = [round((m[max(0, k - 1)] + 2 * m[k] + m[min(len(m) - 1, k + 1)]) / 4) for k in range(len(m))]   # (au mètre : le niveau reste léger)
    return out


def rives_en(E, x, y, cap, large, R, droite, gauche):
    """La sorte de rive de chaque côté, tous les 5 m : l'île, la plage, sinon la berge de la rivière (rive droite ou gauche)."""
    n = len(x)
    out = []
    for s in range(0, n, 5):
        c, k = cap[s], min(len(R["g"]) - 1, s // PAS_RIVAGE)
        paire = []
        for cote, sg in (("g", -1), ("d", 1)):
            d = large / 2 + R[cote][k] + 4
            px, py = x[s] + sg * math.cos(c) * d, y[s] - sg * math.sin(c) * d
            if E.pres_de(E.iles, px, py, 6):
                paire.append("berge_ile")
            elif E.pres_de(E.plages, px, py, 12):
                paire.append("plage_lac")
            else:
                paire.append(droite if E.rive_de_la_riviere(px, py) > 0 else gauche)
        out.append(tuple(paire))
    return out


def pieces_de(x, y, large, rives):
    """Les pièces du jeu : des morceaux de 5 m réunis tant que le virage reste régulier et que les rives ne changent pas (lac plat)."""
    cap = caps_de(x, y)
    n = (len(x) - 1) // 5 * 5
    rmin = large / 2 + 2.5
    dcap = gpx.elargir([cap[i + 1] - cap[i] for i in range(n)], 1 / rmin)
    pieces, cur = [], None
    for k in range(0, n, 5):
        dc, rv = sum(dcap[k:k + 5]), rives[min(len(rives) - 1, k // 5)]
        if cur and cur["n"] * 5 < 60 and cur["r"] == rv and abs(dc / 5 - cur["c"] / (cur["n"] * 5)) < .0025:
            cur["n"] += 1; cur["c"] += dc
        else:
            cur = {"n": 1, "c": dc, "r": rv}; pieces.append(cur)
    out = [{"long": p["n"] * 5, "virage": round(math.degrees(p["c"]), 2), "eau": large, "g": p["r"][0], "d": p["r"][1]} for p in pieces]
    out[-1]["virage"] = round(out[-1]["virage"] + math.degrees(sum(dcap)) - sum(q["virage"] for q in out), 2)
    return out, n


def ecart_moteur(pieces, x, y):
    """Le tracé que le moteur va dessiner (le même calcul que piste.js, mètre par mètre) comparé au vrai : le plus grand écart, en mètres."""
    cap0 = caps_de(x, y)[0]
    h, X, Y, err = cap0, x[0], y[0], 0.0
    s = 0
    for p in pieces:
        k = math.radians(p["virage"]) / p["long"]
        for _ in range(p["long"]):
            h += k / 2; X += math.sin(h); Y += math.cos(h); h += k / 2; s += 1
            if s < len(x):
                err = max(err, math.hypot(X - x[s], Y - y[s]))
    return err


# ---------------------------------------------------------------- les objets
def poser(pieces, s, objet):
    t = 0
    for p in pieces:
        if t <= s < t + p["long"] or p is pieces[-1]:
            objet["a"] = round(s - t); p.setdefault("objets", []).append(objet); return
        t += p["long"]


def croisement(x, y, A, B):
    """Où le tracé passe sous le segment AB (un pont) : (s, point) ou None."""
    for i in range(len(x) - 1):
        p, r = (x[i], y[i]), (x[i + 1] - x[i], y[i + 1] - y[i])
        q, t = A, (B[0] - A[0], B[1] - A[1])
        den = r[0] * t[1] - r[1] * t[0]
        if abs(den) < 1e-9:
            continue
        u = ((q[0] - p[0]) * t[1] - (q[1] - p[1]) * t[0]) / den
        v = ((q[0] - p[0]) * r[1] - (q[1] - p[1]) * r[0]) / den
        if 0 <= u <= 1 and 0 <= v <= 1:
            return i + u, (p[0] + u * r[0], p[1] + u * r[1])
    return None


def tourne_de(ang_axe, cap, cote):
    """L'angle (degrés) dont tourner un objet pour que sa longueur suive l'axe ang_axe (azimut, radians), au mètre de cap `cap`, du côté donné."""
    alpha = math.degrees(ang_axe - cap)
    t = (180 - alpha) if cote in ("d", "c") else -alpha
    return round((t + 180) % 360 - 180, 1)


def habiller(pieces, x, y, cap, proj, carte, E, R, large, nom_pont):
    rep = osm.Repere(x, y)
    w, n, bilan = large / 2, len(x), {}
    def compte(k):
        bilan[k] = bilan.get(k, 0) + 1
    club = None
    for e in carte["elements"]:
        t = e.get("tags") or {}
        if e["type"] == "way" and t.get("building") and t.get("sport") == "rowing" and e.get("geometry"):
            club = (e["id"], [proj(p["lat"], p["lon"]) for p in e["geometry"]])
    # le pont
    for e in carte["elements"]:
        t = e.get("tags") or {}
        if e["type"] == "way" and t.get("name") == nom_pont and t.get("bridge") and e.get("geometry"):
            g = [proj(p["lat"], p["lon"]) for p in e["geometry"]]
            A, B = g[0], g[-1]
            c = croisement(x, y, A, B)
            if not c:
                continue
            s, (px, py) = c
            si = int(s)
            axe = math.atan2(B[0] - A[0], B[1] - A[1])
            L, dA = math.dist(A, B), math.dist(A, (px, py))
            poser(pieces, s, {"o": "pont_route", "cote": "c", "tourne": tourne_de(axe, cap[si], "c"), "debut": round(-dA, 1), "fin": round(L - dA, 1),
                              "large": float(t.get("width", 11)) if str(t.get("width", "")).replace(".", "").isdigit() else 11, "hauteur": 8.5})
            compte("pont_route")
    # les pontons : celui du club (le grand), les autres
    for e in carte["elements"]:
        t = e.get("tags") or {}
        if t.get("man_made") != "pier" or not e.get("geometry"):
            continue
        g = [proj(p["lat"], p["lon"]) for p in e["geometry"]]
        ferme = len(g) > 3 and math.dist(g[0], g[-1]) < .5
        if ferme:
            cx, cy, L, W, ang = osm.rectangle(g)[:5]
            axe = math.pi / 2 - ang
        else:
            cx, cy = sum(p[0] for p in g) / len(g), sum(p[1] for p in g) / len(g)
            L, W = sum(math.dist(g[k], g[k + 1]) for k in range(len(g) - 1)), 2.4
            axe = math.atan2(g[-1][0] - g[0][0], g[-1][1] - g[0][1])
        q = rep.ou(cx, cy, 60)
        if not q or rep.au_bout(q[0]) or L < 4:
            continue
        s, ecart = q
        cote = "d" if ecart > 0 else "g"
        du_club = club and min(math.dist((cx, cy), p) for p in club[1]) < 60
        o = {"o": "ponton_aviron" if du_club else "ponton", "cote": cote, "e": round(abs(ecart) - w, 1), "flotte": True,
             "tourne": tourne_de(axe, cap[s], cote), "long": round(min(L, 70), 1)}
        if du_club:
            o["large"] = round(min(max(W, 3), 6), 1)
        # un ponton flotte : sa partie perpendiculaire à la berge est tout entière sur l'eau, devant la berge (la carte le pose souvent à cheval)
        tr = math.radians(o["tourne"])
        prof = abs(math.sin(tr)) * o["long"] + abs(math.cos(tr)) * o.get("large", 2.2)
        rk = R[cote][min(len(R[cote]) - 1, s // PAS_RIVAGE)]
        o["e"] = round(min(o["e"], rk - prof / 2 + .3), 1)
        if o["e"] - prof / 2 < -w + 1:   # jamais en travers du couloir où l'on rame
            continue
        poser(pieces, s, o)
        compte(o["o"])
    # le club d'aviron
    poses = []
    if club:
        cx, cy, L, W, ang = osm.rectangle(club[1])[:5]
        q = rep.ou(cx, cy, 120)
        if q:
            s, ecart = q
            tourne, echange = osm.angle_route(ang, cap[s])
            if echange:
                L, W = W, L
            o = {"o": "club_aviron", "cote": "d" if ecart > 0 else "g", "e": round(abs(ecart) - w), "l": round(max(L, 20)), "p": round(max(W, 9))}
            if abs(tourne) >= 3:
                o["tourne"] = round(tourne)
            poser(pieces, s, o)
            poses.append((cx, cy, math.hypot(L, W) / 2))
            compte("club_aviron")
    # les bâtiments et les arbres de la carte (osm.py), sans le club (déjà posé)
    C = osm.lire({"elements": [e for e in carte["elements"] if not (club and e.get("id") == club[0])]}, proj, rep)
    hauts = osm.petits(C, rep, large, poses, tours=True)
    bats, poses = osm.batiments(C, rep, large, poses)
    reste = hauts + osm.petits(C, rep, large, poses)
    for o in bats + reste:
        if o["o"] == "boite_lettres":   # pas de boîte aux lettres au bord d'un lac
            continue
        s = o.pop("s")
        k = min(len(R["g"]) - 1, s // PAS_RIVAGE)
        if o["e"] < R[o["cote"]][k] + 1:   # jamais dans l'eau (une erreur de la carte, une maison sur pilotis…)
            continue
        poser(pieces, s, o)
        compte(o["o"])
    # le ponton du départ : de la berge jusqu'au couloir, là où l'on part
    r0 = R["d"][0]
    if r0 > 3:
        Lp = min(r0 + 1, 16)
        poser(pieces, 4, {"o": "ponton", "cote": "d", "e": round(r0 - Lp / 2 + .5, 1), "flotte": True, "tourne": 90, "long": round(Lp, 1)})
    poser(pieces, 8, {"o": "ligne", "cote": "c", "eau": large})
    return bilan


def nommer(pieces, x, y, E, R, large):
    """Le nom de chaque bout (le titre en haut de l'écran) : ce qu'on longe."""
    t, avant = 0, None
    for p in pieces:
        noms = {o["o"] for o in p.get("objets", [])}
        k = min(len(R["g"]) - 1, int((t + p["long"] / 2) // PAS_RIVAGE))
        pres = p["g"] if R["g"][k] < R["d"][k] else p["d"]   # la berge qu'on longe : la plus proche
        r = {"berge_ile": "L'île", "plage_lac": "La plage", "promenade": "La rive de Vichy", "berge": "La rive de Bellerive"}.get(pres)
        nom = ("Le départ" if t == 0 else "Le pont" if "pont_route" in noms else "Le club d'aviron" if "club_aviron" in noms
               else r)
        if nom and nom != avant:
            p["nom"] = nom
            avant = nom
        t += p["long"]


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("trace")
    ap.add_argument("carte")
    ap.add_argument("--id", default="plan-eau")
    ap.add_argument("--nom", default="Un vrai plan d'eau")
    ap.add_argument("--large", type=float, default=10.0)
    ap.add_argument("--rive-droite", default="promenade")
    ap.add_argument("--rive-gauche", default="berge")
    ap.add_argument("--pont", default="Pont Jacques Chirac")
    ap.add_argument("--graine", type=int, default=7)
    ap.add_argument("--ecrire", action="store_true")
    o = ap.parse_args()
    T = json.loads(Path(o.trace).read_text(encoding="utf-8"))
    carte = json.loads(Path(o.carte).read_text(encoding="utf-8"))
    proj = osm.projeteur(T["origine"])
    pts = T["points"]
    x, y = [p[0] for p in pts], [p[1] for p in pts]
    cap = caps_de(x, y)
    boite = (min(x) - RIVAGE_MAX - 60, min(y) - RIVAGE_MAX - 60, max(x) + RIVAGE_MAX + 60, max(y) + RIVAGE_MAX + 60)
    E = Eau(carte, proj, boite)
    R = rivage(E, x, y, cap, o.large)
    rives = rives_en(E, x, y, cap, o.large, R, o.rive_droite, o.rive_gauche)
    pieces, n = pieces_de(x, y, o.large, rives)
    err = ecart_moteur(pieces, x, y)
    bilan = habiller(pieces, x, y, cap, proj, carte, E, R, o.large, o.pont)
    nommer(pieces, x, y, E, R, o.large)
    print(f"{len(pieces)} pièces, {n} m ; le tracé du moteur s'écarte du vrai de {err:.1f} m au plus")
    print("Rivage (m d'eau libre) : à gauche de", min(R["g"]), "à", max(R["g"]), "; à droite de", min(R["d"]), "à", max(R["d"]))
    print("Objets :", ", ".join(f"{k} {v}" for k, v in bilan.items()))
    print("Rives :", ", ".join(sorted({f"{p['g']}/{p['d']}" for p in pieces})))
    if o.ecrire:
        niv = {"id": o.id, "nom": o.nom, "discipline": "eau", "biome": "vichy", "lieux": "kanto", "graine": o.graine, "nageur": 7,
               "allure": 1, "allurePente": False, "loin": "terres", "osm": True,
               "route": {"km": round(n / 1000, 2), "denivele": 0, "pente": 0, "source": "OpenStreetMap"},
               "note": (f"Un vrai plan d'eau (riviere/outils/plan_eau.py) : {n / 1000:.2f} km à l'échelle 1:1. Seule la forme est gardée, aucune "
                        "coordonnée : le tracé, le rivage (l'eau libre de chaque côté, tous les 10 m) et les objets sont repérés par rapport à la piste. "
                        "© les contributeurs d'OpenStreetMap, licence ODbL."),
               "rivage": {"pas": PAS_RIVAGE, "g": R["g"], "d": R["d"]},
               "pieces": pieces}
        lignes = json.dumps({k: v for k, v in niv.items() if k not in ("pieces", "rivage")}, ensure_ascii=False, indent=1)[:-2]
        lignes += ',\n "rivage": ' + json.dumps(niv["rivage"], ensure_ascii=False)
        lignes += ',\n "pieces": [\n' + ",\n".join("  " + json.dumps(p, ensure_ascii=False) for p in pieces) + "\n ]\n}\n"
        f = RACINE / "contenu" / "niveaux" / f"{o.id}.json"
        f.write_text(lignes, encoding="utf-8")
        print("Écrit :", f)
