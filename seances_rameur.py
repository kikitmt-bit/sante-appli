"""Les séances de rameur enregistrées par le téléphone posé sur le siège (pour ceux qui ont coché le rameur dans Mon matériel, sans Streamlit).

data/rameur/seances.json = le résumé de chaque séance (lu par l'appli et par montre.py) ; data/rameur/brut/<séance>.json = les capteurs, pour régler
la détection après coup. Pour le jeu, une séance devient une vraie séance de rameur de la journée (`fusionner`) : points, défis et missions n'ont
aucune règle à part, et une séance que la montre a aussi enregistrée ne compte qu'une fois.
"""
import datetime as dt
import json
import statistics
from html import escape
from zoneinfo import ZoneInfo

import seances_danse as sd

TZ = ZoneInfo("Europe/Paris")
FICHIER = "data/rameur/seances.json"
BRUT = "data/rameur/brut/{}.json"
MIN_COUPS_APPRENTISSAGE = 20  # en dessous, le rapport distance / coups ne veut rien dire


def _date(iso):
    return dt.datetime.fromisoformat(iso.replace("Z", "+00:00"))


def _intervalle(point):
    iv = (sd_contenu(point).get("interval") or {})
    return _date(iv["startTime"]), _date(iv["endTime"])


def sd_contenu(point):
    """Le contenu d'une séance du résumé : {"exercise": {...}}."""
    return point.get("exercise") or {}


def _recouvre(a0, a1, b0, b1):
    """Deux séances sont la même si elles se recouvrent sur plus de la moitié de la plus courte."""
    commun = (min(a1, b1) - max(a0, b0)).total_seconds()
    return commun > 0 and commun > min((a1 - a0).total_seconds(), (b1 - b0).total_seconds()) / 2


def texte_details(s):
    d = s.get("saisi") or {}
    out = []
    if d.get("distance"):
        out.append(f"{round(d['distance'])} m")
    if s.get("cadence"):
        out.append(f"{round(s['cadence'])} coups/min")
    if d.get("watts"):
        out.append(f"{round(d['watts'])} W")
    return out


def point_de(s, montre=None):
    """Une séance du téléphone -> une séance comme celles de la montre, dont elle garde le cœur et les calories si elle l'a vue aussi."""
    debut, fin = _date(s["debut"]).astimezone(dt.timezone.utc), _date(s["fin"]).astimezone(dt.timezone.utc)
    resume = dict(sd_contenu(montre).get("metricsSummary") or {}) if montre else {}
    saisi = s.get("saisi") or {}
    if saisi.get("distance"):
        resume["distanceMillimeters"] = saisi["distance"] * 1000
    if saisi.get("kcal"):
        resume["caloriesKcal"] = saisi["kcal"]
    return {"exercise": {"exerciseType": "ROWING_MACHINE", "displayName": "Rameur", "activeDuration": f"{round(s['duree_s'])}s",
                         "interval": {"startTime": debut.strftime("%Y-%m-%dT%H:%M:%SZ"), "endTime": fin.strftime("%Y-%m-%dT%H:%M:%SZ")},
                         "metricsSummary": resume, "rameur": texte_details(s)}}


def fusionner(resumes, fichier):
    """Les résumés des jours, avec les séances du téléphone en plus. Une copie : les résumés lus restent gardés tels quels en mémoire."""
    seances = (fichier or {}).get("seances") or []
    if not seances:
        return resumes
    out = dict(resumes)
    for s in seances:
        try:
            a0, a1 = _date(s["debut"]), _date(s["fin"])
            jour, duree = str(a0.astimezone(TZ).date()), s["duree_s"]
            if duree <= 0:
                continue
        except (KeyError, ValueError, TypeError, AttributeError):
            continue
        r = dict(out.get(jour) or {})
        garde, montre = [], None
        for p in r.get("exercise") or []:
            try:
                meme = _recouvre(a0, a1, *_intervalle(p))
            except (KeyError, ValueError, TypeError, AttributeError):
                meme = False
            if meme:
                montre = montre or p
            else:
                garde.append(p)
        r["exercise"] = garde + [point_de(s, montre)]
        out[jour] = r
    return out


def ranger(texte, lire, ecrire):
    """Ce que le téléphone a laissé (localStorage pkm_rameur) -> les fichiers du dépôt. Rejouable : une séance déjà rangée est simplement remplacée. -> réussi ?"""
    attente = {a["seance"]["id"]: a for a in json.loads(texte)}  # plusieurs copies d'une même séance : la dernière, écrite une seule fois
    seances = (lire(FICHIER) or {}).get("seances") or []
    for a in attente.values():
        s = a["seance"]
        _date(s["debut"])
        if a.get("brut") and not ecrire(BRUT.format(s["id"]), {"id": s["id"], "debut": s["debut"], "colonnes": ["x", "y", "z"], "unite": "cm/s²", "hz": 20, "lignes": a["brut"], "coups": a.get("coups") or []}, "rameur : capteurs"):
            return False
        seances = [x for x in seances if x.get("id") != s["id"]] + [s]
    return ecrire(FICHIER, {"seances": sorted(seances, key=lambda x: x["debut"])}, "rameur : séance")


# ---------- Apprendre le rameur : les chiffres entrés par Kiki servent à deviner ceux qu'il n'entre pas ----------
def _droite(xs, ys):
    """La droite y = a + b x la plus proche ; horizontale si les x ne varient pas ou si plus de vitesse donnait moins de distance."""
    mx, my = statistics.fmean(xs), statistics.fmean(ys)
    var = sum((x - mx) ** 2 for x in xs)
    b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / var if var > 1e-9 else 0.0
    b = max(b, 0.0)
    return my - b * mx, b


def modele(seances):
    """Mètres par coup selon la vitesse du siège : {a, b, n, erreur (%, sur des séances mises de côté), k_watts, k_kcal}. None sans aucune distance entrée."""
    lignes = [s for s in seances if (s.get("saisi") or {}).get("distance") and s.get("coups", 0) >= MIN_COUPS_APPRENTISSAGE and s.get("vitesse")]
    if not lignes:
        return None
    xs, ys = [s["vitesse"] for s in lignes], [s["saisi"]["distance"] / s["coups"] for s in lignes]
    a, b = _droite(xs, ys) if len(lignes) >= 4 else (statistics.fmean(ys), 0.0)
    erreur = None
    if len(lignes) >= 3:  # chaque séance devinée sans elle : la vraie précision, pas celle d'un modèle qui se relit
        ecarts = []
        for i in range(len(lignes)):
            x2, y2 = xs[:i] + xs[i + 1:], ys[:i] + ys[i + 1:]
            a2, b2 = _droite(x2, y2) if len(x2) >= 4 else (statistics.fmean(y2), 0.0)
            ecarts.append(abs(a2 + b2 * xs[i] - ys[i]) / ys[i] * 100)
        erreur = round(statistics.fmean(ecarts), 1)
    watts, kcal = [], []
    for s in lignes:
        d = s["saisi"]
        t = d.get("temps_s") or s.get("duree_s")
        if d.get("watts") and t:
            watts.append(d["watts"] / (d["distance"] / t) ** 3)
        if d.get("kcal"):
            kcal.append(d["kcal"] / d["distance"])
    return {"a": round(a, 3), "b": round(b, 3), "n": len(lignes), "erreur": erreur,
            "k_watts": round(statistics.median(watts), 3) if watts else None, "k_kcal": round(statistics.median(kcal), 4) if kcal else None}


def chiffres_de(s, m):
    """Les chiffres d'une séance : ceux entrés, sinon ceux devinés (estime = True). {distance, watts, kcal, estime}."""
    d = s.get("saisi") or {}
    out = {"distance": d.get("distance"), "watts": d.get("watts"), "kcal": d.get("kcal"), "estime": set()}
    if m and not out["distance"] and s.get("coups", 0) >= MIN_COUPS_APPRENTISSAGE and s.get("vitesse"):
        out["distance"] = s["coups"] * (m["a"] + m["b"] * s["vitesse"])
        out["estime"].add("distance")
    if m and out["distance"]:
        t = d.get("temps_s") or s.get("duree_s")
        if not out["watts"] and m["k_watts"] and t:
            out["watts"] = m["k_watts"] * (out["distance"] / t) ** 3
            out["estime"].add("watts")
        if not out["kcal"] and m["k_kcal"]:
            out["kcal"] = m["k_kcal"] * out["distance"]
            out["estime"].add("kcal")
    return out


def pour_ecran(fichier, aujourd):
    """Ce que l'onglet Muscu doit savoir : le modèle, pour proposer une estimation à la fin d'une séance, et le temps ramé aujourd'hui."""
    seances = (fichier or {}).get("seances") or []
    du_jour = [s for s in seances if s["debut"][:10] == str(aujourd)]
    return {"modele": modele(seances), "minutes": round(sum(s.get("duree_s", 0) for s in du_jour) / 60), "nb": len(seances)}


# ---------- La page Santé ----------
def de_la_periode(fichier, debut, fin):
    return sorted((s for s in (fichier or {}).get("seances") or [] if debut <= dt.date.fromisoformat(s["debut"][:10]) <= fin), key=lambda s: s["debut"])


def _metres(v, estime=False):
    return f"{'≈ ' if estime else ''}{round(v):,}".replace(",", " ") + " m"


def _approx(cle, c, unite):
    return f"{'≈ ' if cle in c['estime'] else ''}{round(c[cle])} {unite}"


def _total_distance(seances, m):
    cs = [chiffres_de(s, m) for s in seances]
    return sum(c["distance"] or 0 for c in cs), any("distance" in c["estime"] for c in cs)


def titre(seances, m=None):
    temps = sum(s["duree_s"] for s in seances)
    d, estime = _total_distance(seances, m)
    return f"🚣 Rameur : {sd._minutes(temps)} · {sd._pluriel(len(seances), 'séance')}" + (f" · {_metres(d, estime)}" if d else "")


def _moyenne(seances, cle):
    """Moyenne pondérée par les coups (une séance de 2 min ne pèse pas autant qu'une de 40)."""
    lignes = [(s[cle], s.get("coups", 0)) for s in seances if s.get(cle) and s.get("coups")]
    total = sum(c for _, c in lignes)
    return sum(v * c for v, c in lignes) / total if total else None


def _coeur(s, types):
    d, f = sd._seconde(s["debut"]), sd._seconde(s["fin"])
    f = f if f > d else 86400
    coeur = sd._pendant(sd._colonne(types, "heart-rate", "beatsPerMinuteAvg"), d, f)
    haut = sd._pendant(sd._colonne(types, "heart-rate", "beatsPerMinuteMax"), d, f)
    return coeur, (round(statistics.fmean(v for _, v in coeur)) if coeur else None), (round(max(v for _, v in haut)) if haut else None)


def courbe(s, coeur):
    """La cadence minute par minute en barres, le cœur de la montre par-dessus."""
    L, H, g, b, h = 360, 170, 30, 20, 12
    cad = ((s.get("par_min") or {}).get("cad") or [])
    if not cad and not coeur:
        return ""
    d, f = sd._seconde(s["debut"]), sd._seconde(s["fin"])
    f = f if f > d else 86400
    larg = (L - g - 6)
    barres, trait, axe = "", "", ""
    if cad:
        plus = max(max(cad), 1)
        pas = larg / len(cad)
        barres = "".join(f'<rect x="{g + i * pas:.1f}" y="{H - b - c / plus * (H - h - b) * .8:.1f}" width="{max(pas - 1, 1):.1f}" height="{c / plus * (H - h - b) * .8:.1f}" fill="#D83830" fill-opacity=".25"/>' for i, c in enumerate(cad))
    if coeur:
        bas, haut = min(v for _, v in coeur) - 8, max(v for _, v in coeur) + 8
        x = lambda t: g + (min(max(t + 30, d), f) - d) / max(f - d, 1) * larg  # noqa: E731
        y = lambda v: H - b - (v - bas) / max(haut - bas, 1) * (H - h - b)  # noqa: E731
        trait = f'<polyline fill="none" stroke="#B02820" stroke-width="2.5" stroke-linejoin="round" points="{" ".join(f"{x(t):.1f},{y(v):.1f}" for t, v in coeur)}"/>'
        for v in (round(bas + 8), round(haut - 8)):
            axe += f'<text x="{g - 5}" y="{y(v) + 5:.1f}" text-anchor="end" class="dz-t">{v}</text>'
    temps = f'<text x="{g}" y="{H - 4}" class="dz-t">{sd._heure(s["debut"])}</text><text x="{L - 6}" y="{H - 4}" text-anchor="end" class="dz-t">{sd._heure(s["fin"])}</text>'
    return f'<svg class="dz-svg" viewBox="0 0 {L} {H}" role="img" aria-label="Cadence et cœur">{barres}{axe}{trait}{temps}</svg>'


def _carte(s, types, m, ouverte):
    c = chiffres_de(s, m)
    coeur, moyenne, haut = _coeur(s, types)
    tete = [sd.duree(s["duree_s"])]
    if c["distance"]:
        tete.append(_metres(c["distance"], "distance" in c["estime"]))
    if moyenne:
        tete.append(f"♥ {moyenne} bpm")
    infos = []
    if s.get("coups"):
        infos.append(f"{s['coups']} coups · {round(s.get('cadence') or 0)} coups/min")
    if s.get("course_cm"):
        infos.append(f"course ≈ {round(s['course_cm'])} cm")
    if c["watts"]:
        infos.append(_approx("watts", c, "W"))
    if c["kcal"]:
        infos.append(_approx("kcal", c, "kcal"))
    if haut:
        infos.append(f"cœur max {haut} bpm")
    manque = "" if coeur else '<p class="dz-note">Ton cœur s\'affichera ici quand ta montre aura synchronisé cette séance.</p>'
    corps = f'{courbe(s, coeur)}{manque}<p class="dz-note">{escape(" · ".join(infos))}</p>'
    return (f'<details class="dz-seance"{" open" if ouverte else ""}><summary><span class="dz-quand">{sd._heure(s["debut"])} → {sd._heure(s["fin"])}</span>'
            f'<span>{escape(" · ".join(tete))}</span></summary>{corps}</details>')


def _tuiles(seances, m):
    temps = sum(s["duree_s"] for s in seances)
    d, estime = _total_distance(seances, m)
    coups = sum(s.get("coups") or 0 for s in seances)
    cadence, course = _moyenne(seances, "cadence"), _moyenne(seances, "course_cm")
    cases = [sd._tuile("Temps ramé", sd.duree(temps), sd._pluriel(len(seances), "séance"))]
    if d:
        cases.append(sd._tuile("Distance", _metres(d, estime), "devinée d'après tes coups" if estime else "lue sur le rameur"))
    if coups:
        par_coup = f"{str(round(d / coups, 1)).replace('.', ',')} m par coup" if d else ""
        cases.append(sd._tuile("Coups", f"{coups:,}".replace(",", " "), par_coup))
    if cadence:
        cases.append(sd._tuile("Cadence", f"{round(cadence)} /min", f"course ≈ {round(course)} cm" if course else ""))
    return f'<div class="tiles">{"".join(cases)}</div>'


def _note_precision(m):
    if not m:
        return '<p class="dz-note">Entre la distance du rameur à la fin de tes séances : c\'est comme ça que l\'appli apprend.</p>'
    if m["erreur"] is None:
        return f'<p class="dz-note">L\'appli apprend ton rameur : {sd._pluriel(m["n"], "séance")} avec la distance. Sa précision s\'affichera dès 3 séances.</p>'
    fin = " Tu peux ne plus rien entrer." if m["erreur"] <= 3 and m["n"] >= 8 else ""
    return f'<p class="dz-note">L\'appli devine la distance à {str(m["erreur"]).replace(".", ",")} % près ({sd._pluriel(m["n"], "séance")}).{fin}</p>'


def html_jour(seances, types, m):
    corps = "".join(_carte(s, types, m, len(seances) == 1) for s in reversed(seances))
    return f'<div class="dz">{_tuiles(seances, m)}{corps}{_note_precision(m)}</div>'


def html_periode(seances, debut, fin, m):
    longue = (fin - debut).days > 62
    groupes = {}
    for s in seances:
        cle = s["debut"][:7] if longue else s["debut"][:10]
        groupes[cle] = groupes.get(cle, 0) + s["duree_s"]
    plus = max(groupes.values()) or 1
    lignes = "".join(
        f'<div class="dz-jour"><span class="dz-date">{f"{cle[5:7]}/{cle[:4]}" if longue else f"{cle[8:10]}/{cle[5:7]}"}</span>'
        f'<span class="dz-barre"><i style="width:{v / plus * 100:.0f}%"></i></span><span class="dz-val">{sd._minutes(v)}</span></div>'
        for cle, v in sorted(groupes.items()))
    return f'<div class="dz">{_tuiles(seances, m)}{lignes}{_note_precision(m)}</div>'


STYLE = sd.STYLE.replace("bloc_danse", "bloc_rameur")
