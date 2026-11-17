"""L'atelier du cycliste en sprite (16-17/11, Kiki) : dessine la planche du dresseur à vélo de La Rivière, sous 7 angles (de dos, léger et serré
virage pour le jeu, puis 45°, de côté, trois quarts avant, de face pour le film de fin ; l'autre côté = le miroir).
    python riviere/outils/atelier_velo.py                  -> riviere/contenu/montures/cycliste.png et cycliste.json (lus par page.py)
    python riviere/outils/atelier_velo.py --seul           -> cycliste_seul.png et .json : le dresseur sans vélo, calé sur le vélo 3D (le 3e choix du menu)
    python riviere/outils/atelier_velo.py <dossier> [--vite] [--apercu] [--seul]   (--vite : une image sur quatre ; --apercu : une grande image pour regarder)
C'est un squelette en 3D (vélo et dresseur articulés) dessiné pixel par pixel à la taille du sprite, jamais une grande image réduite.
Chaque image est dessinée pixel par pixel à la taille du sprite (pas de réduction d'une grande image) : des volumes simples à trois tons,
un trait sombre de la couleur de chaque matière autour des formes, des pièces fines (rayons, tubes) sans trait. Les couleurs de la planche
sont des couleurs-clés : le jeu les remplace par celles de la carte du dresseur (peau, casquette, veste, pantalon)."""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

W, H = 64, 72          # une case de la planche
PX = 30.0              # pixels par mètre (un pixel = 3,3 cm, la finesse des sprites de Donjon Mystère à leur taille dans le jeu)
CX, CY = 32, 62        # où tombe, dans la case, le point du sol sous le pédalier
EPS = math.radians(24)  # on regarde d'un peu au-dessus, comme les sprites de Donjon Mystère
VUES = [("dos", 0), ("leger", 12), ("trois-quarts", 25), ("d45", 45), ("cote", 90), ("avant", 135), ("face", 180)]   # degrés : 0 = de dos ; le vélo tourne vers la droite de l'écran

# les matières : clair, moyen, ombre, trait (les quatre premières sont repeintes aux couleurs de la carte du dresseur)
MAT = {
    "peau": ["#FFD2A6", "#EFB088", "#C4825E", "#6E3F30"],
    "cas": ["#F2584A", "#D63A30", "#9E2420", "#561214"],
    "ves": ["#5A8CF0", "#3A66D0", "#284698", "#152456"],
    "pan": ["#7FC6A8", "#5BA688", "#3E7E66", "#244A3E"],
    "cadre": ["#FF8A3C", "#E2661E", "#A84414", "#5C240C"],
    "chev": ["#6A4A38", "#4A3226", "#30201A", "#1C1210"],
    "chau": ["#F6F4EE", "#DAD6CC", "#A8A49C", "#4A4850"],
    "pneu": ["#5A5A68", "#3A3A46", "#26242E", "#16141C"],
    "jante": ["#E0E4EA", "#B8BEC8", "#8E94A0", "#4E5460"],
    "garde": ["#F8F6F0", "#E0DDD4", "#B4B0A6", "#5A584E"],
    "panier": ["#EDCB8C", "#D0A462", "#A27A40", "#5E4422"],
    "selle": ["#6A5448", "#4A3A34", "#2E2422", "#181210"],
    "feu": ["#FF8070", "#F04030", "#B02018", "#5C100C"],
}
NOMS = list(MAT)
RVB = {n: [tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) for c in MAT[n]] for n in NOMS}
LUM = np.array([-.45, .7, .55]); LUM = LUM / np.linalg.norm(LUM)   # la lumière : d'en haut à gauche, un peu de face


def v(*a):
    return np.array(a, dtype=float)


class Toile:
    """Une image en cours : pour chaque pixel la matière, le ton, la profondeur, la pièce, et « fin » (une pièce fine n'a pas de trait)."""

    def __init__(self, psi):
        s, c, se, ce = math.sin(psi), math.cos(psi), math.sin(EPS), math.cos(EPS)
        self.r, self.u, self.f = v(s, 0, c), v(c * se, ce, -s * se), v(ce * c, -se, -ce * s)
        self.mat = -np.ones((H, W), int); self.ton = np.zeros((H, W), int); self.prof = np.full((H, W), 1e9)
        self.piece = np.zeros((H, W), int); self.fin = np.zeros((H, W), bool)

    def proj(self, p):
        return CX + PX * float(p @ self.r), CY - PX * float(p @ self.u), float(p @ self.f)

    def monde(self, nx, ny, nz):   # une normale vue par la caméra (x à droite, y en haut, z vers nous) -> dans le repère du vélo
        return nx * self.r + ny * self.u - nz * self.f

    def poser(self, x, y, d, mat, ton, piece, fin=False):
        if 0 <= x < W and 0 <= y < H and d < self.prof[y, x]:
            self.prof[y, x] = d; self.mat[y, x] = NOMS.index(mat); self.ton[y, x] = ton; self.piece[y, x] = piece; self.fin[y, x] = fin

    @staticmethod
    def ton_de(n):
        k = float(n @ LUM)
        return 0 if k > .62 else 1 if k > .12 else 2

    def boule(self, c, r, mat, piece, peindre=None, rx=1.0, ry=1.0):
        """Une boule (rx, ry : aplatie à l'écran). peindre(normale dans le repère du vélo) -> (matière, ton forcé ou None)."""
        sx, sy, d = self.proj(c); R = r * PX
        for y in range(int(sy - R * ry - 1), int(sy + R * ry + 2)):
            for x in range(int(sx - R * rx - 1), int(sx + R * rx + 2)):
                dx, dy = (x + .5 - sx) / (R * rx), (y + .5 - sy) / (R * ry); q = dx * dx + dy * dy
                if q > 1: continue
                nz = math.sqrt(1 - q); n = v(dx, -dy, nz); m, t = mat, None
                if peindre: m, t = peindre(self.monde(dx, -dy, nz))
                self.poser(x, y, d - nz * r, m, self.ton_de(n) if t is None else t, piece)

    def membre(self, a, b, ra, rb, mat, piece, peindre=None):
        """Un membre : un fuseau de a à b (rayons ra et rb). peindre(t le long du membre) -> matière."""
        ax, ay, ad = self.proj(a); bx, by, bd = self.proj(b); Rm = max(ra, rb) * PX
        vx, vy = bx - ax, by - ay; L2 = vx * vx + vy * vy
        for y in range(int(min(ay, by) - Rm - 1), int(max(ay, by) + Rm + 2)):
            for x in range(int(min(ax, bx) - Rm - 1), int(max(ax, bx) + Rm + 2)):
                px, py = x + .5 - ax, y + .5 - ay
                t = 0 if L2 < 1e-9 else min(1, max(0, (px * vx + py * vy) / L2))
                r = (ra + (rb - ra) * t) * PX; ex, ey = px - vx * t, py - vy * t; q = (ex * ex + ey * ey) / (r * r)
                if q > 1: continue
                nz = math.sqrt(1 - q); n = v(ex / r, -ey / r, nz)
                self.poser(x, y, ad + (bd - ad) * t - nz * r / PX, peindre(t) if peindre else mat, self.ton_de(n), piece)

    def trait(self, a, b, mat, ton, piece, gras=1, avance=0.0):
        """Une pièce fine : une ligne d'un pixel (gras = 2 : deux pixels), sans trait autour."""
        ax, ay, ad = self.proj(a); bx, by, bd = self.proj(b)
        n = int(max(abs(bx - ax), abs(by - ay)) * 2) + 1
        for i in range(n + 1):
            t = i / n; x, y = ax + (bx - ax) * t, ay + (by - ay) * t; d = ad + (bd - ad) * t - avance
            self.poser(int(x), int(y), d, mat, ton, piece, True)
            if gras > 1:
                if abs(bx - ax) >= abs(by - ay): self.poser(int(x), int(y) + 1, d, mat, min(3, ton + 1), piece, True)
                else: self.poser(int(x) + 1, int(y), d, mat, min(3, ton + 1), piece, True)

    def face(self, pts, mat, ton, piece, fin=False):
        """Un polygone plein (convexe), d'un seul ton."""
        P = [self.proj(p) for p in pts]
        x0, x1 = int(min(p[0] for p in P)) - 1, int(max(p[0] for p in P)) + 1; y0, y1 = int(min(p[1] for p in P)) - 1, int(max(p[1] for p in P)) + 1
        for k in range(1, len(P) - 1):
            (ax, ay, ad), (bx, by, bd), (cx, cy, cd) = P[0], P[k], P[k + 1]
            det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
            if abs(det) < 1e-9: continue
            for y in range(y0, y1 + 1):
                for x in range(x0, x1 + 1):
                    px, py = x + .5, y + .5
                    l1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / det; l2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / det; l3 = 1 - l1 - l2
                    if l1 < -.01 or l2 < -.01 or l3 < -.01: continue
                    self.poser(x, y, l1 * ad + l2 * bd + l3 * cd, mat, ton, piece, fin)

    def finir(self):
        """Les traits : autour de la silhouette (dans la couleur sombre de la matière voisine) et entre deux pièces dont l'une passe devant l'autre."""
        mat, ton, prof, piece, fin = self.mat, self.ton.copy(), self.prof, self.piece, self.fin
        out_m, out_t = mat.copy(), ton.copy()
        vois = [(0, -1), (0, 1), (-1, 0), (1, 0)]
        for y in range(H):
            for x in range(W):
                if mat[y, x] >= 0:
                    if fin[y, x]: continue
                    for dx, dy in vois:   # une pièce devant celle-ci, juste à côté : celle du fond s'assombrit le long du bord
                        X, Y = x + dx, y + dy
                        if 0 <= X < W and 0 <= Y < H and mat[Y, X] >= 0 and piece[Y, X] != piece[y, x] and not fin[Y, X]:
                            e = prof[y, x] - prof[Y, X]
                            if e > .09: out_t[y, x] = 3; break
                            if e > .035: out_t[y, x] = max(out_t[y, x], 2)
                else:   # un pixel vide collé à une forme : le trait de la silhouette
                    meilleur = None
                    for dx, dy in vois:
                        X, Y = x + dx, y + dy
                        if 0 <= X < W and 0 <= Y < H and mat[Y, X] >= 0 and not fin[Y, X]:
                            if meilleur is None or prof[Y, X] < meilleur[0]: meilleur = (prof[Y, X], mat[Y, X])
                    if meilleur: out_m[y, x] = meilleur[1]; out_t[y, x] = 3
        im = np.zeros((H, W, 4), np.uint8)
        for y in range(H):
            for x in range(W):
                if out_m[y, x] >= 0: im[y, x] = (*RVB[NOMS[out_m[y, x]]][out_t[y, x]], 255)
        return im


def deux_os(a, cible, l1, l2, pole):
    """Le genou (ou le coude) entre a et la cible, plié du côté de pole."""
    d = cible - a; L = np.linalg.norm(d)
    if L > l1 + l2 - 1e-4: cible = a + d / L * (l1 + l2 - 1e-4); d = cible - a; L = np.linalg.norm(d)
    ax = d / L; x = (L * L + l1 * l1 - l2 * l2) / (2 * L); h = math.sqrt(max(0, l1 * l1 - x * x))
    p = pole - ax * float(pole @ ax); p = p / (np.linalg.norm(p) or 1)
    return a + ax * x + p * h, cible


def rouler(p, phi):   # le vélo penche : il tourne autour de la ligne de ses pneus au sol
    c, s = math.cos(phi), math.sin(phi)
    return v(p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c)


R_ROUE = .31
MOYEU_AR, MOYEU_AV, PEDALIER = v(-.50, .31, 0), v(.52, .31, 0), v(0, .29, 0)


def velo(T, psi, phi, c, tourne, braque=0.0):
    """Le vélo : c = l'angle du pédalier, tourne = l'angle des roues, phi = il penche (danseuse, arrêt)."""
    B = lambda *a: rouler(v(*a), phi)
    de_dos = abs(math.sin(psi)) < .2
    for k, (m, piece) in enumerate(((MOYEU_AR, 10), (MOYEU_AV, 11))):
        pts = [B(m[0] + R_ROUE * math.cos(a), m[1] + R_ROUE * math.sin(a), 0) for a in np.linspace(0, 2 * math.pi, 25)]
        for i in range(24): T.membre(pts[i], pts[i + 1], .038, .038, "pneu", piece)
        if not de_dos:   # la jante et quatre rayons qui tournent (de dos, la roue n'est qu'un trait)
            jante = [B(m[0] + (R_ROUE - .055) * math.cos(a), m[1] + (R_ROUE - .055) * math.sin(a), 0) for a in np.linspace(0, 2 * math.pi, 25)]
            for i in range(24): T.trait(jante[i], jante[i + 1], "jante", 1, piece)
            for j in range(4):
                a = tourne + j * math.pi / 2
                T.trait(B(m[0], m[1], 0), B(m[0] + (R_ROUE - .06) * math.cos(a), m[1] + (R_ROUE - .06) * math.sin(a), 0), "jante", 0 if j % 2 else 2, piece)
        # le garde-boue : un arc blanc au-dessus de la roue
        a0, a1 = (math.radians(15), math.radians(165)) if k == 0 else (math.radians(40), math.radians(150))
        arc = [B(m[0] + (R_ROUE + .045) * math.cos(a), m[1] + (R_ROUE + .045) * math.sin(a), 0) for a in np.linspace(a0, a1, 12)]
        for i in range(11): T.membre(arc[i], arc[i + 1], .022, .022, "garde", 12 + k)
    # le cadre : des tubes de deux pixels
    selle_bas, tete_haut, tete_bas = (-.17, .78, 0), (.37, .88, 0), (.40, .70, 0)
    for a, b in (((0, .29, 0), selle_bas), (selle_bas, tete_haut), ((0, .29, 0), tete_bas), (selle_bas, tuple(MOYEU_AR)), ((0, .29, 0), tuple(MOYEU_AR)), (tete_haut, tete_bas)):
        T.membre(B(*a), B(*b), .022, .022, "cadre", 14)
    T.membre(B(*tete_bas), B(*MOYEU_AV), .02, .02, "cadre", 15)                      # la fourche
    T.membre(B(.37, .88, 0), B(.33, 1.0, 0), .018, .018, "jante", 16)                 # la potence
    T.membre(B(.33, 1.0, -.24), B(.33, 1.0, .24), .018, .018, "jante", 16)            # le guidon
    for s in (-1, 1): T.membre(B(.33, 1.0, s * .19), B(.33, 1.0, s * .26), .026, .026, "selle", 17)   # les poignées
    T.membre(B(-.17, .78, 0), B(-.20, .88, 0), .018, .018, "jante", 18)               # la tige de selle
    T.membre(B(-.34, .905, 0), B(-.10, .895, 0), .062, .035, "selle", 19)              # la selle
    # le porte-bagages et le feu arrière
    for s in (-1, 1): T.trait(B(-.36, .70, s * .07), B(-.74, .68, s * .07), "jante", 1, 20, 2)
    for s in (-1, 1): T.trait(B(-.70, .68, s * .07), B(-.50, .31, s * .04), "jante", 2, 20)
    T.boule(B(-.80, .60, 0), .035, "feu", 21)
    # le panier, devant le guidon : un fond, quatre parois de lattes
    x0, x1, y0, y1, z = .47, .73, .80, 1.0, .16
    T.face([B(x0, y0, -z), B(x1, y0, -z), B(x1, y0, z), B(x0, y0, z)], "panier", 2, 22)
    for (pa, pb), ton in ((((x0, -z), (x0, z)), 1), (((x1, -z), (x1, z)), 0), (((x0, -z), (x1, -z)), 1), (((x0, z), (x1, z)), 1)):
        T.face([B(pa[0], y0, pa[1]), B(pb[0], y0, pb[1]), B(pb[0], y1, pb[1]), B(pa[0], y1, pa[1])], "panier", ton, 22)
    for s in (-1, 1): T.trait(B(x0, y1, s * z), B(x1, y1, s * z), "panier", 0, 22, 1, .01)
    T.trait(B(x0, y1, -z), B(x0, y1, z), "panier", 0, 22, 1, .01)
    # le pédalier : le carter blanc à droite, les manivelles, les pédales
    car = [B(.085 * math.cos(a), .29 + .085 * math.sin(a), .05) for a in np.linspace(0, 2 * math.pi, 13)]
    T.face(car, "garde", 1, 23)
    for s in (-1, 1):
        a = c + (0 if s > 0 else math.pi); p = B(.17 * math.cos(a), .29 + .17 * math.sin(a), s * .08)
        T.trait(B(0, .29, s * .06), p, "jante", 2, 24, 2)
        T.membre(B(p[0] - .045, p[1], s * .09) if False else rouler(v(.17 * math.cos(a) - .045, .29 + .17 * math.sin(a), s * .13), phi), rouler(v(.17 * math.cos(a) + .045, .29 + .17 * math.sin(a), s * .13), phi), .018, .018, "pneu", 25)


LEVE = {"v": 0.0}   # la tête relevée (radians), choisie par vue dans image() : de dos comme avant (0), de plus en plus relevée vers la face (.42),
                    # pour voir son visage sous la visière. Chaque angle est un dessin à part : le changement ne se voit pas.


def tete(T, c, regard=0.0, leve=None):
    """La tête : une boule peinte selon l'endroit (casquette dessus, cheveux derrière, oreilles, visage), et la visière."""
    leve = LEVE["v"] if leve is None else leve
    cr, sr, cl, sl = math.cos(regard), math.sin(regard), math.cos(leve), math.sin(leve)

    def peindre(n):
        x, y, z = n[0] * cr + n[2] * sr, n[1], -n[0] * sr + n[2] * cr   # dans le repère de la tête (x = devant)
        x, y = x * cl + y * sl, -x * sl + y * cl                       # la tête relevée
        if y > .95: return "cas", 0                                    # le bouton du dessus
        if y > .4 - .28 * max(0, -x): return ("garde", None) if x > .45 and y < .75 else ("cas", None)   # la casquette (elle descend moins bas derrière), son panneau blanc devant
        if y > .32 - .28 * max(0, -x) and x < .5: return "cas", 2      # le bord de la casquette : une bande d'ombre
        if abs(z) > .88 and -.3 < y < .2 and x > -.35: return "peau", None   # les oreilles
        if x > .5 and -.2 < y < .1 and .16 < abs(z) < .42: return "pneu", 3   # les yeux (de face et de côté)
        if x < .32: return ("chev", None) if y > -.78 else ("peau", None)   # les cheveux sur la nuque, puis le cou
        return "peau", None
    T.boule(c, .19, "peau", 1, peindre)
    for s in (-1, 0, 1):   # trois mèches qui dépassent sur la nuque
        T.membre(c + v(-.13 * cr - s * .09 * -sr, -.10, -.13 * sr + s * .09 * cr), c + v(-.175 * cr - s * .10 * -sr, -.155, -.175 * sr + s * .10 * cr), .04, .014, "chev", 1)
    def d(x, y, z):   # un point de la tête (relevée, tournée) dans le repère du vélo
        x, y = x * cl - y * sl, x * sl + y * cl
        return c + v(x * cr - z * sr, y, x * sr + z * cr)
    T.face([d(.16, .085, -.15), d(.31, .07, -.10), d(.31, .07, .10), d(.16, .085, .15)], "cas", 1, 2)   # la visière, au bord de la casquette, courte : elle ne cache plus les yeux de face
    T.face([d(.16, .07, -.15), d(.31, .055, -.10), d(.31, .055, .10), d(.16, .07, .15)], "cas", 2, 2)


# (17/11, Kiki : un 3e choix, le vélo 3D avec ce dresseur en pixels) --seul : le dresseur sans vélo, calé sur le vélo 3D (moteur/velo.js) :
# son pédalier (-.02, .30), ses pédales à 13,5 cm du cadre, ses poignées (.35, .99, ±.26), le bassin sur sa selle (cycliste.js : ASSISE) ;
# à l'arrêt, le vélo 3D penche à droite (+z, .12 rad) et sa pédale gauche remonte devant : le pied droit à terre.
SEUL = {"v": False}
GEO = {"pb": (0, .29), "pz": .13, "main": (.33, 1.03, .235), "assis": (0, 0), "arret_cote": -1}
GEO_SEUL = {"pb": (-.02, .30), "pz": .135, "main": (.35, 1.02, .26), "assis": (-.045, .035), "arret_cote": 1}


def cycliste(T, phi, c, etat):
    """Le dresseur : etat = assis, danseuse, ramasse ou arret. Ses pieds sont sur les pédales, ses mains sur le guidon."""
    B = lambda *a: rouler(v(*a), phi)
    G = GEO_SEUL if SEUL["v"] else GEO
    sc, cc = math.sin(c), math.cos(c)
    if etat == "assis":
        bassin, epaules, crane, large = v(-.19, 1.0, .012 * sc), v(.10, 1.40, .012 * sc), v(.17, 1.66, 0), 0
    elif etat == "danseuse":   # debout sur les pédales : le corps au-dessus du pédalier, il passe d'un côté à l'autre pendant que le vélo penche de l'autre
        haut = .035 * abs(sc)
        bassin, epaules, crane, large = v(-.02, 1.10 + haut, -.06 * cc), v(.24, 1.46 + haut, -.035 * cc), v(.32, 1.71 + haut, -.02 * cc), 0
    elif etat == "ramasse":    # en descente : le dos à plat, les coudes pliés, pédales à plat
        bassin, epaules, crane, large = v(-.24, 1.02, 0), v(.13, 1.27, 0), v(.26, 1.47, 0), 1
    else:                       # à l'arrêt : descendu de la selle, un pied par terre (le gauche ; sur le vélo 3D, le droit)
        q = -G["arret_cote"]
        bassin, epaules, crane, large = v(-.10, .98, -.07 * q), v(.07, 1.41, -.05 * q), v(.12, 1.67, -.04 * q), 0
    if etat in ("assis", "ramasse"):   # assis sur la selle du vélo dessiné (ou du vélo 3D, un peu plus haute et plus en arrière)
        d = v(G["assis"][0], G["assis"][1], 0); bassin, epaules, crane = bassin + d, epaules + d, crane + d
    # les jambes
    for s in (-1, 1):
        a = c + (0 if s > 0 else math.pi); ped = B(G["pb"][0] + .17 * math.cos(a), G["pb"][1] + .17 * math.sin(a), s * G["pz"])
        hanche = bassin + v(0, -.03, s * .09)
        if etat == "arret" and s == G["arret_cote"]: cheville, pointe = v(.0, .09, .33 * s), v(.14, .045, .36 * s)       # le pied à terre
        else: cheville = ped + v(-.07, .085, 0); pointe = ped + v(.085, .035, 0)
        genou, cheville = deux_os(hanche, cheville, .43, .42, v(1, .25, s * (.28 if etat != "danseuse" else .12)))
        T.membre(hanche, genou, .09, .072, "pan", 30 + s)
        T.membre(genou, cheville, .066, .05, "pan", 32 + s)
        T.membre(cheville + v(-.04, -.035, 0), pointe + v(.01, 0, 0), .052, .046, "chau", 34 + s)
    # le bassin et le dos (la veste), le col
    T.membre(bassin + v(.01, -.01, -.085), bassin + v(.01, -.01, .085), .098, .098, "pan", 40)
    T.membre(bassin + (epaules - bassin) * .22, epaules + v(-.03, -.05, 0), .13, .15, "ves", 41)
    for s in (-1, 1): T.boule(epaules + v(-.02, -.02, s * .165), .082, "ves", 41)
    T.membre(epaules + v(.0, .03, 0), crane + v(-.03, -.15, 0), .058, .058, "peau", 42)
    # les bras : la manche jusqu'au coude, l'avant-bras nu, la main sur la poignée
    for s in (-1, 1):
        epaule = epaules + v(-.01, -.015, s * .185); main = B(G["main"][0], G["main"][1], s * G["main"][2])
        coude, main = deux_os(epaule, main, .27, .26, v(-.6, -.8, s * .45) if large else v(-.3, -.6, s * 1.0))
        T.membre(epaule, coude, .062, .052, "ves", 43 + s)
        T.membre(coude, main, .046, .04, "peau", 45 + s)
        T.boule(main, .05, "peau", 47 + s)
    tete(T, crane)


def image(vue, etat, k, n=8):
    psi = math.radians(vue)
    LEVE["v"] = .42 * min(1, max(0, (vue - 45) / 135))
    T = Toile(psi)
    if etat == "assis": c, phi, tourne = -k * 2 * math.pi / n, 0, -k * math.pi / 8
    elif etat == "danseuse": c = -k * 2 * math.pi / n; phi, tourne = math.radians(7) * math.cos(c), -k * math.pi / 8
    elif etat == "ramasse": c, phi, tourne = 0, 0, -k * math.pi / 8
    elif SEUL["v"]: c, phi, tourne = -math.pi / 2 - 1, .12, 0   # le vélo 3D à l'arrêt : il penche à droite, sa pédale gauche remonte devant (velo.js)
    else: c, phi, tourne = math.radians(-35), math.radians(-7), 0
    if not SEUL["v"]: velo(T, psi, phi, c, tourne)
    cycliste(T, phi, c, etat)
    ancres = {"panier": T.proj(rouler(v(.60, .83, 0), phi)), "porte": T.proj(rouler(v(-.55, .70, 0), phi))}
    return T.finir(), {a: [round(p[0], 1), round(p[1], 1)] for a, p in ancres.items()}


ETATS = [("assis", 8), ("danseuse", 8), ("ramasse", 4), ("arret", 1)]

if __name__ == "__main__":
    args = [x for x in sys.argv[1:] if not x.startswith("--")]
    sortie = Path(args[0]) if args else Path(__file__).resolve().parent.parent / "contenu" / "montures"
    sortie.mkdir(parents=True, exist_ok=True)
    vite = "--vite" in sys.argv
    SEUL["v"] = "--seul" in sys.argv; fichier = "cycliste_seul" if SEUL["v"] else "cycliste"   # --seul : le dresseur sans vélo, pour le vélo 3D
    rangs, lignes = [], []
    for etat, n in ETATS:
        for nom, deg in VUES:
            cases, ancres = [], []
            for k in range(n):
                if vite and k % 4 and n > 1: cases.append(np.zeros((H, W, 4), np.uint8)); ancres.append({}); continue
                im, a = image(deg, etat, k, n); cases.append(im); ancres.append(a)
            rangs.append({"etat": etat, "vue": nom, "deg": deg, "images": n, "ancres": ancres}); lignes.append(cases)
    planche = np.zeros((H * len(lignes), W * 8, 4), np.uint8)
    for j, cases in enumerate(lignes):
        for i, im in enumerate(cases): planche[j * H:(j + 1) * H, i * W:(i + 1) * W] = im
    Image.fromarray(planche).save(sortie / f"{fichier}.png", optimize=True)
    (sortie / f"{fichier}.json").write_text(json.dumps({"w": W, "h": H, "px": PX, "cx": CX, "cy": CY, "rangs": rangs, "cles": {n: MAT[n] for n in ("peau", "cas", "ves", "pan", "cadre", "chev")}}, ensure_ascii=False), encoding="utf-8")
    if "--apercu" in sys.argv:
        apercu = Image.new("RGBA", (W * 8, H * len(lignes)), (108, 191, 94, 255)); apercu.alpha_composite(Image.fromarray(planche))
        apercu.resize((W * 8 * 3, H * len(lignes) * 3), Image.NEAREST).save(sortie / "apercu.png")
    print(len(lignes), "rangées,", planche.shape)
