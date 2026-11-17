"""Le décor d'une vraie route d'après OpenStreetMap (étape 8 du plan, lot 4), branché sur gpx.py :
    python riviere/outils/gpx.py route.gpx --id col --nom "Le col" --osm carte.json --ecrire
        --osm carte.json   lit la carte autour de la route dans ce fichier ; s'il n'existe pas, la demande d'abord à overpass-api.de
                           (gratuit) et l'y garde. ATTENTION : la demande envoie le rectangle autour de la route : garder ce fichier
                           HORS du dépôt (dépôt public, une route peut trahir un domicile).
Ce que la carte donne, le long de la route : les bâtiments (forme, étages), les forêts, la garrigue, les vignes, les vergers, les prés,
la roche nue, les villages, les arbres isolés et les rangées d'arbres, les piscines, les tours et les antennes.
Chaque chose est repérée PAR RAPPORT À LA ROUTE : à tel mètre, à tant de mètres à gauche ou à droite, tournée de tant par rapport à elle.
Le niveau ne garde donc jamais une coordonnée, et le décor reste à sa place même si le tracé est lissé ou un virage élargi.
Le jeu habille tout à sa façon (Kanto) : une maison réelle devient une maison de Kanto à sa taille et à sa place, une forêt devient le
sous-bois, la roche nue du sommet devient un pierrier… La région de ces routes : contenu/biomes/kanto-reel.json.
Citer « © les contributeurs d'OpenStreetMap » (la carte est sous licence ODbL)."""
import json
import math
import urllib.parse
import urllib.request
from pathlib import Path

R_TERRE = 6371000.0
BANDE = 170          # m : on ne regarde rien au-delà, de chaque côté de la route (la brume est pleine à 400 m, et le décor s'arrête bien avant)
PAS_ZONE = 10        # m : un relevé des zones tous les 10 m
BLOC_MIN = 150       # m : jamais un changement de bord plus court (pas de bords qui clignotent : la règle de rives_de)

# ---------------------------------------------------------------- la demande
def demander(sud, ouest, nord, est):
    """La carte du rectangle (overpass-api.de, gratuit) : ce qui sert au décor, rien d'autre."""
    b = f"({sud:.5f},{ouest:.5f},{nord:.5f},{est:.5f})"
    q = ("[out:json][timeout:180];("
         f'way["building"]{b};way["landuse"]{b};relation["landuse"]{b};way["natural"]{b};relation["natural"]{b};'
         f'way["leisure"~"swimming_pool|park|garden"]{b};way["barrier"="hedge"]{b};node["natural"="tree"]{b};'
         f'node["man_made"~"tower|mast"]{b};way["man_made"~"tower|mast"]{b};way["amenity"="place_of_worship"]{b};'
         f'way["place"]{b};);out geom;')
    req = urllib.request.Request("https://overpass-api.de/api/interpreter", data=urllib.parse.urlencode({"data": q}).encode(),
                                 headers={"User-Agent": "riviere-outil"})
    with urllib.request.urlopen(req, timeout=240) as r:
        return json.load(r)


def carte(fichier, pts):
    """La carte autour de la route : lue dans `fichier`, ou demandée puis gardée là (rectangle de la route + BANDE)."""
    f = Path(fichier)
    if f.exists():
        return json.loads(f.read_text(encoding="utf-8"))
    la = [p[0] for p in pts]; lo = [p[1] for p in pts]
    m_la = (BANDE + 60) / 111320.0; m_lo = m_la / math.cos(math.radians(sum(la) / len(la)))
    d = demander(min(la) - m_la, min(lo) - m_lo, max(la) + m_la, max(lo) + m_lo)
    f.write_text(json.dumps(d), encoding="utf-8")
    return d


# ---------------------------------------------------------------- la géométrie
def projeteur(origine):
    """Les degrés -> des mètres autour du premier point du GPX (le même calcul que gpx.projeter)."""
    la0, lo0 = math.radians(origine[0]), math.radians(origine[1])
    k = R_TERRE * math.cos(la0)
    return lambda lat, lon: (k * (math.radians(lon) - lo0), R_TERRE * (math.radians(lat) - la0))


def anneaux(e, proj):
    """Les contours fermés d'une forme (un chemin fermé, ou les morceaux « outer » d'une relation recollés bout à bout)."""
    if e["type"] == "way":
        g = e.get("geometry") or []
        return [[proj(p["lat"], p["lon"]) for p in g]] if len(g) >= 4 and g[0] == g[-1] else []
    bouts = [[proj(p["lat"], p["lon"]) for p in m["geometry"]] for m in e.get("members", [])
             if m.get("role") == "outer" and m.get("geometry")]
    out = []
    while bouts:
        a = bouts.pop()
        for _ in range(len(bouts) + 1):
            if a[0] == a[-1] or not bouts:
                break
            for i, b in enumerate(bouts):
                if b[0] == a[-1]: a += b[1:]; bouts.pop(i); break
                if b[-1] == a[-1]: a += b[::-1][1:]; bouts.pop(i); break
            else:
                break
        if len(a) >= 4 and a[0] == a[-1]:
            out.append(a)
    return out


def dedans(x, y, poly):
    c = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]; xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c


def aire(poly):
    return abs(sum(poly[i][0] * poly[i - 1][1] - poly[i - 1][0] * poly[i][1] for i in range(len(poly)))) / 2


def rectangle(poly):
    """Le plus petit rectangle tourné qui contient la forme : (centre x, y, longueur, largeur, angle de la longueur en radians, cap)."""
    pts = poly[:-1]
    best = None
    for i in range(len(pts)):
        (x0, y0), (x1, y1) = pts[i - 1], pts[i]
        a = math.atan2(y1 - y0, x1 - x0)
        c, s = math.cos(a), math.sin(a)
        u = [x * c + y * s for x, y in pts]; v = [-x * s + y * c for x, y in pts]
        A = (max(u) - min(u)) * (max(v) - min(v))
        if best is None or A < best[0]:
            mu, mv = (max(u) + min(u)) / 2, (max(v) + min(v)) / 2
            L, W = max(u) - min(u), max(v) - min(v)
            ang = a if L >= W else a + math.pi / 2
            best = (A, mu * c - mv * s, mu * s + mv * c, max(L, W), min(L, W), ang)
    return best[1:]


class Repere:
    """La route (un point par mètre, en mètres) : pour un point du monde, son mètre le long de la route et son écart (+ = à droite)."""
    CASE = 25

    def __init__(self, x, y):
        self.x, self.y, self.n = x, y, len(x)
        self.cap = []
        for i in range(self.n):
            a, b = max(0, i - 3), min(self.n - 1, i + 3)
            self.cap.append(math.atan2(x[b] - x[a], y[b] - y[a]))   # 0 = nord, + = vers la droite (comme gpx.caps)
        self.grille = {}
        for i in range(0, self.n, 2):
            self.grille.setdefault((int(x[i] // self.CASE), int(y[i] // self.CASE)), []).append(i)

    def ou(self, px, py, portee=BANDE + 40):
        """(s, écart) du point le plus proche de la route, ou None s'il est plus loin que `portee`."""
        ci, cj, r = int(px // self.CASE), int(py // self.CASE), int(portee // self.CASE) + 1
        best, bi = portee * portee, None
        for i in range(ci - r, ci + r + 1):
            for j in range(cj - r, cj + r + 1):
                for k in self.grille.get((i, j), ()):
                    d = (self.x[k] - px) ** 2 + (self.y[k] - py) ** 2
                    if d < best:
                        best, bi = d, k
        if bi is None:
            return None
        for k in range(max(0, bi - 2), min(self.n, bi + 3)):   # affiner au mètre près
            d = (self.x[k] - px) ** 2 + (self.y[k] - py) ** 2
            if d <= best:
                best, bi = d, k
        c = self.cap[bi]
        ecart = (px - self.x[bi]) * math.cos(c) - (py - self.y[bi]) * math.sin(c)   # + = à droite
        return bi, ecart

    def point(self, s, ecart):
        """Le point du monde à `ecart` m à droite (− : à gauche) du mètre s."""
        s = max(0, min(self.n - 1, int(round(s))))
        c = self.cap[s]
        return self.x[s] + ecart * math.cos(c), self.y[s] - ecart * math.sin(c)


# ---------------------------------------------------------------- ce qui est quoi
ZONES = {   # tag OSM -> la sorte de terrain (l'ordre compte : la plus petite forme qui contient le point gagne)
    ("landuse", "forest"): "foret", ("natural", "wood"): "foret",
    ("natural", "scrub"): "garrigue", ("natural", "heath"): "garrigue",
    ("landuse", "vineyard"): "vignes", ("landuse", "orchard"): "verger",
    ("landuse", "meadow"): "pre", ("landuse", "grass"): "pre", ("natural", "grassland"): "pre", ("landuse", "farmland"): "pre",
    ("landuse", "allotments"): "pre",
    ("natural", "scree"): "roche", ("natural", "bare_rock"): "roche", ("natural", "shingle"): "roche",
    ("landuse", "residential"): "village", ("landuse", "retail"): "village", ("landuse", "commercial"): "village",
    ("natural", "water"): "eau",
}
# la sorte de terrain près de la route (et au loin) -> le bord de la route dans le jeu (contenu/biomes/kanto-reel.json)
BORD = {"foret": "sous_bois", "garrigue": "garrigue", "vignes": "vignes", "verger": "verger", "pre": "pre", "roche": "pierrier",
        "village": "village", None: "bas_cote", "eau": "bas_cote"}
AVEC_BOIS = {"garrigue", "vignes", "verger", "pre"}   # ces bords ont un double « _bois » : la forêt derrière, au loin


def zone_de(tags):
    for k in ("landuse", "natural"):
        z = ZONES.get((k, tags.get(k)))
        if z:
            return z
    return None


def lire(osm, proj, rep):
    """La carte -> des listes en mètres autour de la route : zones, bâtiments, arbres, rangées, piscines, tours."""
    zones, bats, arbres, rangees, piscines, tours, cultes = [], [], [], [], [], [], []
    for e in osm.get("elements", []):
        t = e.get("tags") or {}
        if e["type"] == "node":
            p = proj(e["lat"], e["lon"])
            if t.get("natural") == "tree":
                arbres.append(p)
            elif t.get("man_made") in ("tower", "mast"):
                tours.append((p, t))
            continue
        if t.get("natural") == "tree_row" or t.get("barrier") == "hedge":
            g = [proj(q["lat"], q["lon"]) for q in e.get("geometry") or []]
            if len(g) >= 2:
                rangees.append((g, "haie" if t.get("barrier") == "hedge" else "arbres"))
            continue
        for a in anneaux(e, proj):
            xs = [p[0] for p in a]; ys = [p[1] for p in a]
            boite = (min(xs), min(ys), max(xs), max(ys))
            if t.get("man_made") in ("tower", "mast"):   # avant les bâtiments : une tour est souvent aussi un « bâtiment » sur la carte
                tours.append((((boite[0] + boite[2]) / 2, (boite[1] + boite[3]) / 2), t))
            elif t.get("building") and e["type"] == "way":
                bats.append((a, t))
            elif t.get("leisure") == "swimming_pool":
                piscines.append(a)
            elif t.get("amenity") == "place_of_worship":
                cultes.append(a)
            else:
                z = zone_de(t)
                if z:
                    zones.append((z, a, boite, aire(a)))
    zones.sort(key=lambda z: z[3])   # la plus petite d'abord : un pré dans une forêt est un pré
    return {"zones": zones, "bats": bats, "arbres": arbres, "rangees": rangees, "piscines": piscines, "tours": tours, "cultes": cultes}


def zone_en(C, x, y):
    for z, a, b, _ in C["zones"]:
        if b[0] <= x <= b[2] and b[1] <= y <= b[3] and dedans(x, y, a):
            return z
    return None


# ---------------------------------------------------------------- les bords de la route
def bords(C, rep, centres):
    """Le bord de chaque côté, tous les PAS_ZONE m : la sorte de terrain la plus présente près de la route (8 à 50 m), et s'il y a
    de la forêt au loin (75 à 150 m). Un village : une zone habitée, ou au moins 4 bâtiments à moins de 40 m d'un point à 20 m du bord."""
    n = rep.n
    res = {-1: [], 1: []}
    grille = {}
    for cx, cy in centres:
        grille.setdefault((int(cx // 40), int(cy // 40)), []).append((cx, cy))
    def voisins(px, py):
        i, j = int(px // 40), int(py // 40)
        return sum(1 for a in range(i - 1, i + 2) for b in range(j - 1, j + 2) for cx, cy in grille.get((a, b), ())
                   if math.hypot(cx - px, cy - py) < 40)
    for s in range(0, n, PAS_ZONE):
        for sg in (-1, 1):
            pres = [zone_en(C, *rep.point(s, sg * e)) for e in (10, 22, 38)]
            loin = [zone_en(C, *rep.point(s, sg * e)) for e in (75, 110, 150)]
            px, py = rep.point(s, sg * 20)
            if voisins(px, py) >= 4 and "roche" not in pres:   # (au sommet, les bâtiments restent posés sur le pierrier)
                pres = [z if z == "village" else "village" for z in pres]
            compte = {}
            for z in pres:
                compte[z] = compte.get(z, 0) + 1
            pz = max(compte, key=lambda z: (compte[z], z is not None))
            bois = sum(1 for z in loin if z == "foret") >= 2
            res[sg].append((pz, bois))
    return res


TROU_MAX = 3000      # m : là où la carte ne dit rien, on garde ce qu'on voyait juste avant, sur 3 km au plus (une carte a des trous)


def boucher(seq):
    """Les trous de la carte (aucune zone connue) prennent la dernière sorte vue avant (sinon la première vue après), sur TROU_MAX au plus."""
    out, der, age = list(seq), None, 0
    for i, v in enumerate(out):
        if v[0] is None:
            age += PAS_ZONE
            if der is not None and age <= TROU_MAX:
                out[i] = der
        else:
            der, age = v, 0
    premier = next((v for v in out if v[0] is not None), None)
    for i, v in enumerate(out):
        if v[0] is not None or i * PAS_ZONE > TROU_MAX:
            break
        out[i] = premier or v
    return out


def lisser_bords(seq):
    """Une fenêtre de 90 m (la majorité), puis aucun bloc de moins de BLOC_MIN : il prend le bord de son voisin le plus long."""
    k = 4
    lisse = []
    for i in range(len(seq)):
        f = seq[max(0, i - k):i + k + 1]
        c = {}
        for v in f:
            c[v] = c.get(v, 0) + 1
        lisse.append(max(c, key=lambda v: (c[v], v == seq[i])))
    blocs = []
    for v in lisse:
        if blocs and blocs[-1][0] == v:
            blocs[-1][1] += 1
        else:
            blocs.append([v, 1])
    court = BLOC_MIN // PAS_ZONE
    change = True
    while change and len(blocs) > 1:
        change = False
        i = min(range(len(blocs)), key=lambda j: blocs[j][1])
        if blocs[i][1] >= court:
            break
        voisins = [j for j in (i - 1, i + 1) if 0 <= j < len(blocs)]
        j = max(voisins, key=lambda j: blocs[j][1])
        blocs[j][1] += blocs[i][1]; blocs.pop(i)
        k2 = 0   # recoller deux voisins devenus pareils
        while k2 < len(blocs) - 1:
            if blocs[k2][0] == blocs[k2 + 1][0]:
                blocs[k2][1] += blocs.pop(k2 + 1)[1]
            else:
                k2 += 1
        change = True
    out = []
    for v, m in blocs:
        out += [v] * m
    return out


def nom_bord(v):
    z, bois = v
    b = BORD.get(z, "bas_cote")
    return b + "_bois" if bois and z in AVEC_BOIS else b


# ---------------------------------------------------------------- les objets
def h01(*v):
    """Un hasard fixe, tiré de la place (toujours le même décor pour la même carte)."""
    x = math.sin(sum((i + 1) * 12.9898 * a for i, a in enumerate(v)) + 78.233) * 43758.5453
    return x - math.floor(x)


def angle_route(ang_long, cap):
    """L'angle de la longueur d'un bâtiment par rapport à la route, ramené entre −45° et +45° (la façade toujours vers la route),
    et s'il faut échanger longueur et profondeur. Dans le jeu, un objet est posé face à la route, sa longueur le long d'elle."""
    route = math.pi / 2 - cap                      # la direction de la route, en angle mathématique (depuis l'est, sens inverse des aiguilles)
    d = math.degrees(ang_long - route)
    d = (d + 90) % 180 - 90                        # la longueur est une droite : modulo 180°
    if d > 45:
        return d - 90, True
    if d < -45:
        return d + 90, True
    return d, False


def batiments(C, rep, largeur, poses=None):
    """Chaque bâtiment réel proche de la route -> un objet du jeu à sa place, à sa taille, tourné comme lui.
    Les plus grands d'abord ; un bâtiment qui chevaucherait un autre déjà posé est laissé (les maisons collées d'un vieux centre)."""
    w = largeur / 2
    cand = []
    for a, t in C["bats"]:
        A = aire(a)
        if A < 22:   # cabanes, abris : rien
            continue
        cx, cy, L, W, ang = rectangle(a)
        q = rep.ou(cx, cy, 130)
        if not q:
            continue
        s, ecart = q
        e = abs(ecart) - w
        if e < 2:
            continue
        cand.append((A, a, t, cx, cy, L, W, ang, s, ecart))
    cand.sort(key=lambda c: -c[0])
    culte = lambda cx, cy: any(dedans(cx, cy, p) for p in C["cultes"])
    poses, out = poses if poses is not None else [], []
    for A, a, t, cx, cy, L, W, ang, s, ecart in cand:
        b = t.get("building")
        niveaux = None
        try:
            niveaux = int(float(t.get("building:levels"))) if t.get("building:levels") else None
        except ValueError:
            pass
        if not niveaux and t.get("height"):
            try:
                niveaux = max(1, round(float(t["height"].split()[0]) / 3))
            except ValueError:
                pass
        if b in ("church", "chapel", "cathedral") or culte(cx, cy):
            o = {"o": "chapelle", "l": round(min(max(L, 7), 26)), "p": round(min(max(W, 5), 14))}
        elif b in ("warehouse", "industrial", "farm_auxiliary", "barn", "hangar") or (A > 320 and (niveaux or 1) <= 2):
            o = {"o": "entrepot", "l": round(min(max(L, 10), 36)), "p": round(min(max(W, 7), 18))}
        elif (niveaux or 0) >= 3 or b in ("apartments", "hotel"):
            o = {"o": "immeuble", "l": round(min(max(L, 8), 24)), "p": round(min(max(W, 7), 16)), "etages": min(niveaux or 3, 7)}
        elif b in ("retail", "commercial", "shop", "supermarket") and A < 320:
            o = {"o": "magasin"}
        else:
            o = {"o": "maison", "varie": True, "l": round(min(max(L, 6), 15)), "p": round(min(max(W, 5), 11))}
            if niveaux:
                o["etage"] = niveaux >= 2
        l, p = o.get("l", 8.4), o.get("p", 6)
        tourne, _ = angle_route(ang, rep.cap[s])   # la façade vers la route : la longueur le long d'elle, tourné de ±45° au plus
        r = math.hypot(l, p) / 2
        if any(math.hypot(cx - x, cy - y) < (r + rr) * .78 for x, y, rr in poses):
            continue
        e = abs(ecart) - w
        if e < p / 2 + 1.5:   # jamais sur la route (un virage élargi peut la rapprocher) : poussé dehors
            e = p / 2 + 1.5
        poses.append((cx, cy, r))
        o.update({"s": s, "cote": "d" if ecart > 0 else "g", "e": round(e)})   # (au mètre et au degré près : le niveau reste léger)
        if abs(tourne) >= 3:
            o["tourne"] = round(tourne)
        if r * .85 > 6:   # la place qu'il prend, si elle dépasse celle d'une maison ordinaire (les règles ne posent rien dedans)
            o["r"] = round(r * .85)
        out.append(o)
    return out, poses


def petits(C, rep, largeur, poses, tours=False):
    """Arbres isolés, rangées d'arbres et haies, piscines ; ou (tours=True, avant les bâtiments : elles passent devant) les tours et les antennes."""
    w, out = largeur / 2, []
    libre = lambda x, y, r: all(math.hypot(x - a, y - b) > r + rr for a, b, rr in poses)
    def poser(x, y, o, portee, r):
        q = rep.ou(x, y, portee)
        if not q:
            return
        s, ecart = q
        e = abs(ecart) - w
        if e < 1.5 or not libre(x, y, r):
            return
        poses.append((x, y, r))
        o.update({"s": s, "cote": "d" if ecart > 0 else "g", "e": round(e)})
        out.append(o)
    for (x, y), t in (C["tours"] if tours else []):
        haut = 0
        try:
            haut = float((t.get("height") or "0").split()[0])
        except ValueError:
            pass
        if t.get("tower:type") == "lighting":   # les mâts d'éclairage d'un stade : rien
            continue
        mat = t.get("man_made") == "mast"
        o = {"o": "tour_relais", "haut_t": round(haut or (45 if not mat else 18))}
        if mat:
            o["mat"] = True
        poser(x, y, o, 160, 4 if not mat else 1.5)
    if tours:
        return out
    for x, y in C["arbres"]:
        poser(x, y, {"o": "arbre"}, 90, 1.8)
    for g, sorte in C["rangees"]:
        pas = 7.0 if sorte == "arbres" else 2.6
        for i in range(1, len(g)):
            (x0, y0), (x1, y1) = g[i - 1], g[i]
            d = math.hypot(x1 - x0, y1 - y0)
            for k in range(int(d // pas) + 1):
                f = k * pas / d if d else 0
                x, y = x0 + (x1 - x0) * f, y0 + (y1 - y0) * f
                poser(x, y, {"o": "arbre" if sorte == "arbres" else "buisson"}, 70 if sorte == "arbres" else 35, 1.6 if sorte == "arbres" else .8)
    for a in C["piscines"]:
        if aire(a) < 8:
            continue
        cx, cy, L, W, ang = rectangle(a)
        q = rep.ou(cx, cy, 60)
        if not q:
            continue
        tourne, _ = angle_route(ang, rep.cap[q[0]])
        poser(cx, cy, {"o": "piscine", "l": round(min(max(L, 4), 16)), "p": round(min(max(W, 2.5), 8)), "tourne": round(tourne)}, 60, 0)
    return out


# ---------------------------------------------------------------- tout ensemble
def habiller(pieces, x, y, origine, osm, largeur=6.0, decalage=0):
    """Pose sur les pièces du niveau : les bords (g, d) et les objets d'après la carte. `x`, `y` : la route du morceau gardé, un point par
    mètre, en mètres autour du premier point du GPX (origine = ce premier point, lat et lon). Rend un petit bilan."""
    proj = projeteur(origine)
    rep = Repere(x, y)
    C = lire(osm, proj, rep)
    poses = []
    hauts = petits(C, rep, largeur, poses, tours=True)
    bats, poses = batiments(C, rep, largeur, poses)
    reste = hauts + petits(C, rep, largeur, poses)
    centres = [rectangle(a)[:2] for a, t in C["bats"] if aire(a) >= 22]
    B = bords(C, rep, centres)
    g = lisser_bords(boucher(B[-1])); d = lisser_bords(boucher(B[1]))
    # les bords de chaque pièce : ceux de son milieu
    t = 0
    for p in pieces:
        k = min(len(g) - 1, int((t + p["long"] / 2) // PAS_ZONE))
        p["g"], p["d"] = nom_bord(g[k]), nom_bord(d[k])
        t += p["long"]
    # les objets : dans la pièce qui contient leur mètre
    debuts, t = [], 0
    for p in pieces:
        debuts.append(t); t += p["long"]
    for o in bats + reste:
        s = o.pop("s")
        i = max(0, min(len(pieces) - 1, next((k for k in range(len(pieces) - 1, -1, -1) if debuts[k] <= s), 0)))
        o["a"] = round(s - debuts[i])
        pieces[i].setdefault("objets", []).append(o)
    sortes = {}
    for o in bats + reste:
        sortes[o["o"]] = sortes.get(o["o"], 0) + 1
    bords_vus = {}
    for p in pieces:
        for c in (p["g"], p["d"]):
            bords_vus[c] = bords_vus.get(c, 0) + p["long"]
    return {"objets": sortes, "bords": {k: round(v / 1000, 2) for k, v in sorted(bords_vus.items(), key=lambda kv: -kv[1])},
            "batiments_carte": len(C["bats"]), "zones_carte": len(C["zones"])}
