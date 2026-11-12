"""Les séances de danse sur le vrai tapis, dans la page Santé (Kiki seul, sans Streamlit).

Le jeu du tapis, sur le PC de Kiki, écrit une séance par fichier dans data/danse/sessions/AAAA-MM-JJ-HHMMSS.json. Affichées en HTML pur,
repliées, pour qu'ouvrir une séance ne recharge jamais la page. Pour le jeu (12/11, Kiki : la mission Mélofée), `fusionner` ajoute au résumé
du jour le temps dansé (`danse_tapis_s`) : chiffres.stats_jour garde le plus grand de la montre et du tapis (jamais compté deux fois).
"""
import datetime as dt
from html import escape

DOSSIER = "data/danse/sessions"
NOTES = ("Parfait", "Super", "Bien", "Juste", "Raté")


def fichiers_periode(liste, debut, fin):
    """Les chemins des séances entre deux dates, d'après la liste du dossier (None : le dossier n'existe pas encore)."""
    chemins = []
    for f in liste or []:
        nom = f.get("name", "")
        try:
            jour = dt.date.fromisoformat(nom[:10])
        except ValueError:
            continue
        if nom.endswith(".json") and debut <= jour <= fin:
            chemins.append(f"{DOSSIER}/{nom}")
    return sorted(chemins)


def fusionner(resumes, lire, debut, fin):
    """Les résumés des jours, avec le temps dansé sur le tapis en plus (danse_tapis_s). Une copie ; une erreur ici ne casse rien."""
    try:
        chemins = fichiers_periode(lire([DOSSIER])[DOSSIER], debut, fin)
        if not chemins:
            return resumes
        out = dict(resumes)
        for s in lire(chemins).values():
            if not s or not s.get("danse_s"):
                continue
            jour = s["debut"][:10]
            r = dict(out.get(jour) or {})
            r["danse_tapis_s"] = (r.get("danse_tapis_s") or 0) + s["danse_s"]
            out[jour] = r
        return out
    except (KeyError, TypeError, ValueError, AttributeError, IndexError) as e:
        print("Danse du tapis non comptée :", type(e).__name__, flush=True)
        return resumes


def _heure(iso):
    return iso[11:16]


def _seconde(iso):
    """Secondes depuis minuit, à l'heure locale écrite dans la séance (la montre aussi est à l'heure locale)."""
    return int(iso[11:13]) * 3600 + int(iso[14:16]) * 60 + int(iso[17:19])


def _ecart(a, b):
    return max(0, (dt.datetime.fromisoformat(b) - dt.datetime.fromisoformat(a)).total_seconds())


def duree(s):
    s = round(s)
    if s >= 3600:
        return f"{s // 3600} h {s % 3600 // 60:02d}"
    return f"{s // 60} min {s % 60:02d}" if s >= 60 else f"{s} s"


def _minutes(s):
    """Une durée courte, pour un titre."""
    m = round(s / 60)
    return f"{m // 60} h {m % 60:02d}" if m >= 60 else f"{max(m, 1)} min"


def _colonne(types, cle, nom):
    """[(secondes depuis minuit, valeur)] d'un type minute par minute du fichier du jour."""
    t = (types or {}).get(cle)
    if not isinstance(t, dict) or nom not in t.get("colonnes", []):
        return []
    i = t["colonnes"].index(nom)
    points = []
    for ligne in t.get("lignes", []):
        try:
            h, m, s = str(ligne[0]).split(":")[:3]
            points.append((int(h) * 3600 + int(m) * 60 + int(float(s)), float(ligne[i])))
        except (ValueError, TypeError, IndexError):
            continue
    return sorted(points)


def _pendant(points, debut, fin):
    """Les minutes de la montre qui touchent cet intervalle (les mesures sont notées au début de chaque minute)."""
    return [p for p in points if debut - 59 <= p[0] < fin]


def mesures(seance, types):
    """Le cœur, les calories et les pas de la montre pendant une séance, et le cœur pendant les seuls morceaux."""
    d, f = _seconde(seance["debut"]), _seconde(seance["fin"])
    if f < d:  # passée minuit : la suite est dans le fichier du lendemain
        f = 86400
    coeur = _pendant(_colonne(types, "heart-rate", "beatsPerMinuteAvg"), d, f)
    plus_haut = _pendant(_colonne(types, "heart-rate", "beatsPerMinuteMax"), d, f)
    en_danse = [v for m in seance["morceaux"] for _, v in _pendant(coeur, _seconde(m["debut"]), _seconde(m["fin"]))]
    return {
        "coeur": coeur,
        "moyenne": round(sum(en_danse) / len(en_danse)) if en_danse else None,
        "max": round(max(v for _, v in plus_haut)) if plus_haut else None,
        "kcal": round(sum(v for _, v in _pendant(_colonne(types, "active-energy-burned", "kcalSum"), d, f))),
        "pas": round(sum(v for _, v in _pendant(_colonne(types, "steps", "countSum"), d, f))),
    }


def totaux(seances):
    compte = {n: sum(m["compte"].get(n, 0) for s in seances for m in s["morceaux"]) for n in NOTES}
    return {"danse_s": sum(s["danse_s"] for s in seances), "repos_s": sum(s["repos_s"] for s in seances), "seances": len(seances),
            "morceaux": sum(len(s["morceaux"]) for s in seances), "compte": compte}


def _pluriel(n, mot):
    return f"{n} {mot}{'x' if mot == 'morceau' and n > 1 else 's' if n > 1 else ''}"


def titre(seances):
    t = totaux(seances)
    return f"Danse · {_minutes(t['danse_s'])} · {_pluriel(t['morceaux'], 'morceau')}"


def _tuile(libelle, valeur, detail=""):
    return f'<div class="tile"><div class="l">{libelle}</div><div class="v">{valeur}</div><div class="s">{detail}</div></div>'


def _frise(seance):
    d = []
    for i, m in enumerate(seance["morceaux"]):
        if i:
            d.append(f'<i class="r" style="flex-grow:{_ecart(seance["morceaux"][i - 1]["fin"], m["debut"]):.0f}"></i>')
        d.append(f'<i class="d" style="flex-grow:{_ecart(m["debut"], m["fin"]):.0f}"></i>')
    return f'<div class="dz-frise">{"".join(d)}</div>'


def courbe(seance, m):
    """Morceaux en bandes, repos en vide, cœur par-dessus. Une image, pour ne pas recharger la page en l'ouvrant."""
    L, H, g, b, h = 360, 170, 30, 20, 16  # petit repère : sur un téléphone, l'image garde presque sa taille et les chiffres se lisent
    d, f = _seconde(seance["debut"]), _seconde(seance["fin"])
    f = f if f > d else 86400
    x = lambda s: g + (min(max(s, d), f) - d) / max(f - d, 1) * (L - g - 6)  # noqa: E731
    bandes = "".join(
        f'<rect x="{x(_seconde(z["debut"])):.1f}" y="{h}" width="{max(x(_seconde(z["fin"])) - x(_seconde(z["debut"])), 1):.1f}" height="{H - h - b}" fill="#D83830" fill-opacity=".2"><title>{escape(z["titre"])}</title></rect>'
        f'<text x="{x(_seconde(z["debut"])) + 3:.1f}" y="{h - 4}" class="dz-t">{i}</text>'
        for i, z in enumerate(seance["morceaux"], 1))
    points, trait, axe = [(s + 30, v) for s, v in m["coeur"]], "", ""
    if points:
        bas, haut = min(v for _, v in points) - 8, max(v for _, v in points) + 8
        y = lambda v: H - b - (v - bas) / max(haut - bas, 1) * (H - h - b)  # noqa: E731
        trait = f'<polyline fill="none" stroke="#B02820" stroke-width="2.5" stroke-linejoin="round" points="{" ".join(f"{x(s):.1f},{y(v):.1f}" for s, v in points)}"/>'
        for v in (round(bas + 8), round(haut - 8)):
            axe += f'<line x1="{g}" x2="{L - 6}" y1="{y(v):.1f}" y2="{y(v):.1f}" stroke="#B8B8A0" stroke-dasharray="3 5"/><text x="{g - 5}" y="{y(v) + 5:.1f}" text-anchor="end" class="dz-t">{v}</text>'
    temps = f'<text x="{g}" y="{H - 4}" class="dz-t">{_heure(seance["debut"])}</text><text x="{L - 6}" y="{H - 4}" text-anchor="end" class="dz-t">{_heure(seance["fin"])}</text>'
    return f'<svg class="dz-svg" viewBox="0 0 {L} {H}" role="img" aria-label="Séance et cœur">{bandes}{axe}{trait}{temps}</svg>'


def _lignes_morceaux(seance):
    lignes = []
    for i, z in enumerate(seance["morceaux"]):
        if i:
            lignes.append(f'<div class="dz-repos">Repos · {duree(_ecart(seance["morceaux"][i - 1]["fin"], z["debut"]))}</div>')
        notes = " · ".join(f"{n} {z['compte'][n]}" for n in NOTES if z["compte"].get(n))
        arret = " · arrêté" if z.get("abandonne") else ""
        lignes.append(f'<div class="dz-morceau"><div class="dz-haut"><b>{i + 1}. {escape(z["titre"])}</b><b>{str(z["pct"]).replace(".", ",")} %</b></div>'
                      f'<div class="dz-bas">{escape(z["difficulte"])} {z["niveau"]} · {_heure(z["debut"])} · {duree(_ecart(z["debut"], z["fin"]))}{arret}<br>{notes}</div></div>')
    return "".join(lignes)


def _carte_seance(seance, types, ouverte):
    m = mesures(seance, types)
    coeur = f" · ♥ {m['moyenne']} bpm" if m["moyenne"] else ""
    tete = (f'<summary><span class="dz-quand">{_heure(seance["debut"])} → {_heure(seance["fin"])}</span>'
            f'<span>{duree(seance["danse_s"])} dansées · {_pluriel(len(seance["morceaux"]), "morceau")}{coeur}</span>{_frise(seance)}</summary>')
    sante = [f"Repos {duree(seance['repos_s'])}"]
    if m["max"]:
        sante.append(f"cœur max {m['max']} bpm")
    if m["kcal"]:
        sante.append(f"{m['kcal']} kcal")
    if m["pas"]:
        sante.append(f"{m['pas']} pas à la montre")
    manque = "" if m["coeur"] else '<p class="dz-note">Ton cœur s\'affichera ici quand ta montre aura synchronisé cette séance.</p>'
    return (f'<details class="dz-seance"{" open" if ouverte else ""}>{tete}{courbe(seance, m)}{manque}'
            f'<p class="dz-note">{" · ".join(sante)}</p>{_lignes_morceaux(seance)}</details>')


def html_jour(seances, types):
    """Un jour : les totaux, puis chaque séance repliée, sauf s'il n'y en a qu'une."""
    t = totaux(seances)
    mes = [mesures(s, types) for s in seances]
    moyennes = [x["moyenne"] for x in mes if x["moyenne"]]
    maxi = [x["max"] for x in mes if x["max"]]
    cases = [_tuile("Temps dansé", duree(t["danse_s"]), f"{_pluriel(t['seances'], 'séance')} · {_pluriel(t['morceaux'], 'morceau')}"),
             _tuile("Repos", duree(t["repos_s"]), "entre les morceaux")]
    if moyennes:
        cases.append(_tuile("Cœur en dansant", f"{round(sum(moyennes) / len(moyennes))} bpm", f"max {max(maxi)} bpm" if maxi else ""))
    kcal = sum(x["kcal"] for x in mes)
    if kcal:
        cases.append(_tuile("Calories actives", f"{kcal} kcal", "pendant les séances, montre"))
    cases.append(_tuile("Notes parfaites", str(t["compte"]["Parfait"]), f"{t['compte']['Raté']} ratées"))
    corps = "".join(_carte_seance(s, types, len(seances) == 1) for s in reversed(seances))
    return f'<div class="dz"><div class="tiles">{"".join(cases)}</div>{corps}</div>'


def html_periode(seances, debut, fin):
    """Plusieurs jours : les totaux et une ligne par jour (par mois sur une longue période). Le détail se lit en choisissant le jour."""
    t = totaux(seances)
    longue = (fin - debut).days > 62
    groupes = {}
    for s in seances:
        cle = s["debut"][:7] if longue else s["debut"][:10]
        g = groupes.setdefault(cle, {"danse": 0, "seances": 0, "morceaux": 0})
        g["danse"] += s["danse_s"]
        g["seances"] += 1
        g["morceaux"] += len(s["morceaux"])
    plus = max(g["danse"] for g in groupes.values()) or 1
    lignes = "".join(
        f'<div class="dz-jour"><span class="dz-date">{f"{cle[5:7]}/{cle[:4]}" if longue else f"{cle[8:10]}/{cle[5:7]}"}</span>'
        f'<span class="dz-barre"><i style="width:{g["danse"] / plus * 100:.0f}%"></i></span><span class="dz-val">{_minutes(g["danse"])}</span></div>'
        for cle, g in sorted(groupes.items()))
    cases = [_tuile("Temps dansé", duree(t["danse_s"]), f"{_pluriel(t['seances'], 'séance')} · {_pluriel(t['morceaux'], 'morceau')}"),
             _tuile("Repos", duree(t["repos_s"]), "entre les morceaux"),
             _tuile("Notes parfaites", str(t["compte"]["Parfait"]), f"{t['compte']['Raté']} ratées")]
    return f'<div class="dz"><div class="tiles">{"".join(cases)}</div>{lignes}<p class="dz-note">Choisis un jour pour voir ses séances et ton cœur.</p></div>'


STYLE = """<style>
.st-key-bloc_danse [data-testid="stExpander"]>details{background:#F8F8E8 !important;border:3px solid #484838 !important;border-radius:12px 5px 12px 5px !important;box-shadow:3px 3px 0 rgba(10,15,35,.45)}
.st-key-bloc_danse [data-testid="stExpander"]>details>summary{background:#F8F8E8 !important}
.st-key-bloc_danse summary,.st-key-bloc_danse summary p,.st-key-bloc_danse summary span{color:#383828 !important}
.dz{color:#383828}
.dz .tiles{grid-template-columns:1fr 1fr;gap:6px;margin:0 0 8px}
.dz .tile{background:#fff !important;border:2px solid #C8C8B0 !important;box-shadow:none !important;padding:5px 8px !important;border-radius:8px 3px !important}
.dz .tile .v{font-size:1.2rem !important}.dz .tile .l,.dz .tile .s{font-size:.78rem !important}
.dz-seance{background:#fff;border:2px solid #484838;border-radius:8px 3px;padding:8px 10px;margin:8px 0}
.dz-seance summary{cursor:pointer;display:block;list-style:none;line-height:1.3;position:relative}
.dz-seance summary::-webkit-details-marker{display:none}
.dz-seance summary::after{content:"▶";position:absolute;top:0;right:0;color:#D83830;font-size:.8em}
.dz-seance[open] summary::after{content:"▼"}
.dz-quand{display:block;color:#C03028;padding-right:18px}
.dz-frise{display:flex;height:12px;margin-top:6px;border:2px solid #484838;border-radius:3px;overflow:hidden;background:#D8D8C8}
.dz-frise i{display:block;min-width:2px}.dz-frise .d{background:#D83830}.dz-frise .r{background:#D8D8C8}
.dz-svg{display:block;width:100%;height:auto;margin-top:8px}
.dz-t{font-size:15px;fill:#686850}
.dz-note{font-size:.88rem;color:#686850;margin:6px 0 !important;line-height:1.25 !important}
.dz-morceau{border-top:1px solid #C8C8B0;padding:5px 0;line-height:1.25}
.dz-haut{display:flex;justify-content:space-between;gap:8px;overflow-wrap:anywhere}
.dz-haut b{font-weight:400;color:#383828}.dz-haut b:last-child{white-space:nowrap;color:#C03028}
.dz-bas{font-size:.86rem;color:#686850}
.dz-repos{font-size:.86rem;color:#686850;border-top:1px solid #C8C8B0;padding:3px 0;background:#F0F0DC;padding-left:6px}
.dz-jour{display:grid;grid-template-columns:62px 1fr 72px;gap:8px;align-items:center;padding:3px 0}
.dz-date,.dz-val{white-space:nowrap}.dz-val{text-align:right;color:#C03028}
.dz-barre{height:12px;border:2px solid #484838;border-radius:3px;background:#fff;overflow:hidden}
.dz-barre i{display:block;height:100%;background:#D83830}
</style>"""
