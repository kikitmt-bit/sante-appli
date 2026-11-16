"""Une vraie route dans La Rivière (étape 8 du plan, lot 1) : un fichier GPX devient un circuit normal du jeu (contenu/niveaux/).
    python riviere/outils/gpx.py ma-route.gpx --nom "Le col" --id col-essai                 -> le bilan (longueur, montée, pentes)
    python riviere/outils/gpx.py ma-route.gpx --nom "Le col" --id col-essai --ecrire         -> écrit contenu/niveaux/col-essai.json
        --km 5          la longueur gardée (5 km au plus tant que le monde n'est pas construit par tronçons : lot 3)
        --depuis 6.5    où commence l'extrait (en km depuis le début du GPX) ; sans lui : les --km les plus durs (la plus forte montée)
        --large 6       la largeur de la route (m)
        --rayon 9       le plus petit rayon de virage gardé (m) : un virage plus serré est élargi, sans changer de combien la route tourne
        --relief        demande l'altitude de chaque côté de la route à api.opentopodata.org (gratuit) : talus du côté qui monte, ravin du
                        côté qui descend. ATTENTION : les coordonnées de la route partent chez ce service ; sans --relief, rien ne sort du PC.
Ce qui est gardé : la FORME de la route (virages, longueurs, pentes), à l'échelle 1:1. Jamais une coordonnée, ni le GPX (hors du dépôt,
il peut trahir un domicile). Jamais une route raccourcie : un extrait est un morceau entier, à sa vraie longueur et ses vraies pentes.
Le GPS tremble : le tracé est lissé (--lisse, en m) et l'altitude aussi (--lisse-alt). Tracés gratuits : OpenStreetMap (brouter.de, Komoot,
Strava…) ; citer « © les contributeurs d'OpenStreetMap »."""
import argparse
import json
import math
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
KM_MAX = 5.0          # tant que le monde est construit d'un bloc (le lot 3 : les tronçons)
PAS = 5               # mètres : les petits morceaux dont on fait les pièces
R_TERRE = 6371000.0


def lire_gpx(texte):
    """Les points du fichier : [(lat, lon, alt ou None)], tracé (trkpt) ou itinéraire (rtept)."""
    racine = ET.fromstring(texte)
    pts = []
    for e in racine.iter():
        if e.tag.rsplit("}", 1)[-1] in ("trkpt", "rtept"):
            alt = next((c.text for c in e if c.tag.rsplit("}", 1)[-1] == "ele"), None)
            pts.append((float(e.get("lat")), float(e.get("lon")), float(alt) if alt not in (None, "") else None))
    if len(pts) < 2:
        raise ValueError("Ce fichier ne contient pas de tracé (aucun point trkpt ni rtept).")
    return pts


def projeter(pts):
    """En mètres autour du premier point : x vers l'est, y vers le nord (assez juste sur quelques dizaines de km)."""
    la0, lo0 = math.radians(pts[0][0]), math.radians(pts[0][1])
    return [(R_TERRE * math.cos(la0) * (math.radians(lo) - lo0), R_TERRE * (math.radians(la) - la0)) for la, lo, _ in pts]


def reechantillonner(xy, alt, pas=1.0):
    """Un point tous les `pas` mètres le long du tracé (les points du GPS sont irréguliers)."""
    ox, oy, oa = [xy[0][0]], [xy[0][1]], [alt[0]]
    reste = 0.0
    for i in range(1, len(xy)):
        (x0, y0), (x1, y1) = xy[i - 1], xy[i]
        d = math.hypot(x1 - x0, y1 - y0)
        if d < 1e-6:
            continue
        t = pas - reste
        while t <= d:
            f = t / d
            ox.append(x0 + (x1 - x0) * f); oy.append(y0 + (y1 - y0) * f); oa.append(alt[i - 1] + (alt[i] - alt[i - 1]) * f)
            t += pas
        reste = d - (t - pas)
    return ox, oy, oa


def lisser(v, sigma):
    """Une moyenne en cloche (écart `sigma` points), les bords repliés : le tremblement part, la forme reste."""
    if sigma <= 0:
        return list(v)
    r = int(sigma * 3)
    w = [math.exp(-(k * k) / (2 * sigma * sigma)) for k in range(-r, r + 1)]
    n, o = len(v), []
    for i in range(n):
        s = tot = 0.0
        for k in range(-r, r + 1):
            j = i + k
            if j < 0 or j >= n:
                j = -j if j < 0 else 2 * (n - 1) - j
                j = min(max(j, 0), n - 1)
            s += v[j] * w[k + r]; tot += w[k + r]
        o.append(s / tot)
    return o


def caps(x, y):
    """Le cap à chaque mètre (radians, 0 = nord, + = vers la droite, comme `virage` dans le jeu), sans saut de 360°."""
    c = [math.atan2(x[1] - x[0], y[1] - y[0])]
    for i in range(1, len(x)):
        a = math.atan2(x[i] - x[i - 1], y[i] - y[i - 1])
        d = (a - c[-1] + math.pi) % (2 * math.pi) - math.pi
        c.append(c[-1] + d)
    return c


def elargir(dcap, kmax):
    """Un virage plus serré que le rayon permis est étalé sur ses voisins : la route tourne d'autant, mais plus en douceur."""
    d = list(dcap)
    for _ in range(20000):
        trop = False
        for i, v in enumerate(d):
            if abs(v) > kmax:
                ex = v - math.copysign(kmax, v)
                d[i] -= ex
                g, h = max(i - 1, 0), min(i + 1, len(d) - 1)
                d[g] += ex / 2; d[h] += ex / 2
                trop = True
        if not trop:
            break
    return d


def extrait(alt, n, depuis=None):
    """Où commence le morceau de n mètres : là où on le demande, sinon là où il monte le plus."""
    if len(alt) <= n:
        return 0
    if depuis is not None:
        return max(0, min(int(depuis * 1000), len(alt) - 1 - n))
    return max(range(0, len(alt) - n, 10), key=lambda i: alt[i + n] - alt[i])


def relief(pts_morceau, x, y, cap, pas=50, ecart=35):
    """L'altitude à `ecart` m à gauche et à droite de la route, tous les `pas` m (api.opentopodata.org, gratuit, 100 points par demande).
    Rend [(s, gauche - droite)]. Les coordonnées partent chez ce service : seulement avec --relief."""
    la0, lo0 = pts_morceau
    demandes = []
    for s in range(0, len(x), pas):
        c = cap[s]
        for sens in (-1, 1):   # gauche, puis droite
            px, py = x[s] + sens * ecart * math.cos(c), y[s] - sens * ecart * math.sin(c)
            lat = la0 + math.degrees(py / R_TERRE)
            lon = lo0 + math.degrees(px / (R_TERRE * math.cos(math.radians(la0))))
            demandes.append((s, sens, lat, lon))
    h = {}
    for k in range(0, len(demandes), 100):
        lot = demandes[k:k + 100]
        url = "https://api.opentopodata.org/v1/srtm30m?locations=" + "|".join(f"{d[2]:.6f},{d[3]:.6f}" for d in lot)
        req = urllib.request.Request(url, headers={"User-Agent": "riviere-outil"})
        with urllib.request.urlopen(req, timeout=60) as r:
            res = json.load(r)["results"]
        for d, e in zip(lot, res):
            h[(d[0], d[1])] = e["elevation"]
        time.sleep(1.1)   # une demande par seconde au plus (règle du service)
    return [(s, h[(s, -1)] - h[(s, 1)]) for s in range(0, len(x), pas) if h.get((s, -1)) is not None and h.get((s, 1)) is not None]


# les rives, quand on ne sait rien des côtés : des blocs d'environ 400 m (un changement toutes les 20 à 40 s à vélo, la règle de Kiki)
RIVES_SANS = [("sous_bois", "sous_bois"), ("sous_bois", "bas_cote"), ("bas_cote", "bas_cote"), ("bas_cote", "sous_bois")]


def rives_de(pieces, cotes):
    """Les rives de chaque pièce. Avec le relief : talus du côté qui monte, ravin de l'autre, dès 7 m d'écart sur 70 m ; sinon des bois
    et des bas-côtés par blocs. Jamais un changement de moins de 150 m (pas de rives qui clignotent)."""
    s, choix = 0, []
    for p in pieces:
        mi = s + p["long"] / 2
        g, d = RIVES_SANS[int(mi // 400) % len(RIVES_SANS)]
        if cotes:
            diff = min(cotes, key=lambda c: abs(c[0] - mi))[1]
            if diff > 7:
                g, d = "talus", "ravin"
            elif diff < -7:
                g, d = "ravin", "talus"
        choix.append([g, d, s, p["long"]])
        s += p["long"]
    # les blocs trop courts prennent les rives de leur voisin d'avant
    i = 0
    while i < len(choix):
        j = i
        while j + 1 < len(choix) and choix[j + 1][:2] == choix[i][:2]:
            j += 1
        if i > 0 and sum(c[3] for c in choix[i:j + 1]) < 150:
            for c in choix[i:j + 1]:
                c[0], c[1] = choix[i - 1][0], choix[i - 1][1]
        i = j + 1
    for p, c in zip(pieces, choix):
        p["g"], p["d"] = c[0], c[1]


def construire(pts, km=KM_MAX, depuis=None, large=6.0, rayon=9.0, lisse=6.0, lisse_alt=25.0, cotes_fn=None):
    """Le cœur de l'outil : les points du GPX -> la liste des pièces (et un bilan)."""
    if km > KM_MAX + 1e-9:
        raise ValueError(f"{km} km : au-delà de {KM_MAX:g} km, il faudra le monde construit par tronçons (lot 3 de l'étape 8).")
    if any(p[2] is None for p in pts):
        raise ValueError("Ce GPX n'a pas d'altitude sur tous ses points (balise <ele>) : impossible d'avoir les vraies pentes.")
    xy = projeter(pts)
    x, y, a = reechantillonner(xy, [p[2] for p in pts])
    x, y, a = lisser(x, lisse), lisser(y, lisse), lisser(a, lisse_alt)
    n = int(min(km * 1000, len(x) - 1)) // PAS * PAS
    if n < 200:
        raise ValueError("Route trop courte (200 m au moins).")
    i0 = extrait(a, n, depuis)
    x, y, a = x[i0:i0 + n + 1], y[i0:i0 + n + 1], a[i0:i0 + n + 1]
    cap = caps(x, y)
    rmin = max(rayon, large / 2 + 1.5 + 0.5)   # la règle du moteur : rayon > demi-largeur + 1,5 m
    dcap = elargir([cap[i + 1] - cap[i] for i in range(n)], 1 / rmin)
    # des morceaux de 5 m, puis des pièces : on prolonge une pièce tant que son virage et sa pente restent réguliers
    morceaux = [(sum(dcap[k:k + PAS]), a[k + PAS] - a[k]) for k in range(0, n, PAS)]
    pieces, cur = [], None
    for dc, dz in morceaux:
        k, g = dc / PAS, dz / PAS
        if cur and cur["n"] * PAS < 120 and abs(k - cur["c"] / (cur["n"] * PAS)) < 0.006 and abs(g - cur["z"] / (cur["n"] * PAS)) < 0.015:
            cur["n"] += 1; cur["c"] += dc; cur["z"] += dz
        else:
            cur = {"n": 1, "c": dc, "z": dz}; pieces.append(cur)
    out, montee, pente_max = [], 0.0, 0.0
    for p in pieces:
        long_ = p["n"] * PAS
        q = {"long": long_, "virage": round(math.degrees(p["c"]), 2), "large": large, "monte": round(p["z"], 2)}
        out.append(q)
        montee += max(0.0, p["z"]); pente_max = max(pente_max, abs(p["z"]) / long_)
    # les pièces arrondies : ce qui manque est rendu à la dernière, pour que le virage total et la montée totale soient justes
    out[-1]["virage"] = round(out[-1]["virage"] + math.degrees(sum(dcap)) - sum(q["virage"] for q in out), 2)
    out[-1]["monte"] = round(out[-1]["monte"] + (a[-1] - a[0]) - sum(q["monte"] for q in out), 2)
    cotes = cotes_fn(x, y, cap, i0) if cotes_fn else None
    rives_de(out, cotes)
    # la pente de chaque kilomètre, et le plus dur
    kms = [(k, (a[min(k + 1000, n)] - a[k]) / (min(k + 1000, n) - k)) for k in range(0, n, 1000) if min(k + 1000, n) - k >= 300]
    plus_dur = max(range(0, max(1, n - 1000) + 1, 10), key=lambda k: a[min(k + 1000, n)] - a[k])
    return out, {"long": n, "debut_km": round(i0 / 1000, 2), "montee": round(montee), "denivele": round(a[-1] - a[0]),
                 "pente": round((a[-1] - a[0]) / n * 100, 1), "pente_max": round(pente_max * 100, 1), "kms": kms, "plus_dur": plus_dur,
                 "rmin": rmin}


def habiller(pieces, bilan):
    """Ce qui fait une montée de col : la ligne au départ, une borne à chaque kilomètre (« SOMMET 3 KM · 9 % », comme les vraies),
    le kilomètre le plus dur chronométré à part, l'arche d'arrivée au sommet."""
    n = bilan["long"]
    def poser(s, objet):
        t = 0
        for p in pieces:
            if t <= s < t + p["long"]:
                objet["a"] = round(s - t, 1); p.setdefault("objets", []).append(objet); return
            t += p["long"]
    poser(6, {"o": "ligne", "cote": "c", "eau": bilan["large"]})
    poser(max(30, n - 14), {"o": "arche_arrivee", "cote": "c", "tourne": 90, "large": bilan["large"], "texte": "SOMMET"})
    for k, pente in bilan["kms"]:
        reste = (n - k) / 1000
        if k > 0 and reste >= 0.5:
            poser(k, {"o": "borne_km", "cote": "d", "e": 1.4, "texte": f"{reste:.0f} KM".replace(".0", ""), "pente": round(pente * 100)})
    # le kilomètre le plus dur : un segment (les pièces qui le couvrent)
    t = 0
    for p in pieces:
        if t + p["long"] > bilan["plus_dur"] and t < bilan["plus_dur"] + 1000:
            p["segment"] = "Le kilomètre le plus dur"
        t += p["long"]
    # des noms de pièce tous les kilomètres (le titre de l'écran)
    t, prochain = 0, 0
    for p in pieces:
        if t >= prochain:
            p["nom"] = "Le départ" if t == 0 else f"Km {t // 1000 + 1}"
            prochain = (t // 1000 + 1) * 1000
        t += p["long"]


def niveau(pieces, bilan, ident, nom, graine=11, source=""):
    return {"id": ident, "nom": nom, "discipline": "terre", "biome": "kanto-routes", "lieux": "kanto", "graine": graine, "nageur": 7,
            "allure": 1, "allurePente": False, "surface": "goudron",   # à l'échelle 1:1 : un mètre de route = un vrai mètre, côte ou pas
            "route": {"km": round(bilan["long"] / 1000, 2), "denivele": bilan["denivele"], "pente": bilan["pente"], "source": source},
            "note": (f"Une vraie route (riviere/outils/gpx.py, étape 8 du plan) : {bilan['long'] / 1000:.1f} km à l'échelle 1:1, "
                     f"{bilan['denivele']} m de montée, {bilan['pente']} % de moyenne. Seule la forme est gardée, aucune coordonnée. "
                     "Tracé : © les contributeurs d'OpenStreetMap."),
            "pieces": pieces}


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("gpx")
    ap.add_argument("--nom", default="Une vraie route")
    ap.add_argument("--id", default="route-essai")
    ap.add_argument("--km", type=float, default=KM_MAX)
    ap.add_argument("--depuis", type=float)
    ap.add_argument("--large", type=float, default=6.0)
    ap.add_argument("--rayon", type=float, default=9.0)
    ap.add_argument("--lisse", type=float, default=6.0)
    ap.add_argument("--lisse-alt", type=float, default=25.0)
    ap.add_argument("--relief", action="store_true")
    ap.add_argument("--graine", type=int, default=11)
    ap.add_argument("--source", default="OpenStreetMap")
    ap.add_argument("--ecrire", action="store_true")
    o = ap.parse_args()
    pts = lire_gpx(Path(o.gpx).read_text(encoding="utf-8"))
    def cotes_fn(x, y, cap, i0):
        # x, y : déjà relatifs au premier point du GPX ; on remet l'origine pour les coordonnées envoyées
        return relief((pts[0][0], pts[0][1]), x, y, cap)

    pieces, b = construire(pts, o.km, o.depuis, o.large, o.rayon, o.lisse, o.lisse_alt, cotes_fn if o.relief else None)
    b["large"] = o.large
    habiller(pieces, b)
    print(f"{len(pieces)} pièces, {b['long']} m (depuis le km {b['debut_km']} du GPX), {b['denivele']:+} m, {b['pente']} % de moyenne, "
          f"{b['pente_max']} % au plus sur une pièce ; virages élargis à {b['rmin']:g} m de rayon au moins")
    print("Par kilomètre : " + ", ".join(f"{k // 1000 + 1}e {p * 100:.1f} %" for k, p in b["kms"]))
    print("Rives : " + ", ".join(sorted({f"{p['g']}/{p['d']}" for p in pieces})))
    if o.ecrire:
        f = RACINE / "contenu" / "niveaux" / f"{o.id}.json"
        n = niveau(pieces, b, o.id, o.nom, o.graine, o.source)
        texte = json.dumps(n, ensure_ascii=False, indent=1)
        # une pièce par ligne : le fichier se relit
        lignes = json.dumps({k: v for k, v in n.items() if k != "pieces"}, ensure_ascii=False, indent=1)[:-2]
        lignes += ',\n "pieces": [\n' + ",\n".join("  " + json.dumps(p, ensure_ascii=False) for p in pieces) + "\n ]\n}\n"
        f.write_text(lignes, encoding="utf-8")
        print("Écrit :", f)
