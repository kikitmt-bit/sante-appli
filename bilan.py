"""Le bilan santé : autonome, sans IA ni compte Claude, calculé sur place pour chaque joueur à partir de ses vraies données.

Plusieurs « observations » sont calculées (sommeil, coucher, récupération, pas, sport, assis, poids, oxygène, habitudes) en
comparant la journée aux repères de santé et surtout à la propre moyenne du joueur. Chacune a une importance ; on garde les
3 plus fortes, un thème par carte, en évitant ce qui vient d'être dit les jours d'avant : c'est ce qui évite les répétitions.
Rien de notable = pas de carte. Le ton est celui du jeu, les chiffres et les conseils sont vrais ; ce n'est pas un avis médical.
Les Pokémon viennent de Kanto (rien ne dévoile la suite du jeu).

    analyser(stats, periode, debut, fin, aujourd, j_jour) -> {"titre", "phrase", "cartes": [...]}
    conseil_du_jour(stats, aujourd) -> phrase courte pour le récap du matin, ou None
"""
import datetime as dt
import hashlib

import pandas as pd

from chiffres import JOURS, OBJECTIFS, heure, hm, nombre, table

NOMS_JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
PERSONNAGES = {"sommeil": (143, "Ronflex"), "coucher": (39, "Rondoudou"), "recup": (113, "Leveinard"), "pas": (84, "Doduo"),
               "sport": (66, "Machoc"), "assis": (54, "Psykokwak"), "poids": (76, "Grolem"), "oxygene": (113, "Leveinard"),
               "habitude": (65, "Alakazam")}
BON, NEUTRE, ALERTE = "bon", "neutre", "alerte"
SEMAINE_INTENSE = 75  # minutes d'effort intense par semaine : le repère de l'OMS (75 à 150)


def _graine(*morceaux):
    return int(hashlib.sha256("|".join(map(str, morceaux)).encode()).hexdigest()[:8], 16)


def _au_choix(jour, theme, *phrases):
    """Une tournure parmi plusieurs, fixe pour un jour donné : le même fait ne se dit pas toujours pareil."""
    return phrases[_graine(jour, theme) % len(phrases)]


def _carte(theme, force, ton, titre, texte, conseil=None, pousse=False):
    """pousse : le conseil invite à forcer ; il saute si le cœur dit le contraire le même jour."""
    num, qui = PERSONNAGES[theme]
    return {"theme": theme, "force": force, "ton": ton, "num": num, "qui": qui, "titre": titre, "texte": texte, "conseil": conseil, "pousse": pousse}


def _colonne(d, cle):
    return d[cle].dropna() if cle in d else pd.Series(dtype=float)


def _avant(d, jour, cle, n=30):
    """Les valeurs des n jours avant ce jour, sans lui (son repère personnel)."""
    return _colonne(d.loc[jour - dt.timedelta(days=n):jour - dt.timedelta(days=1)], cle)


def _val(d, jour, cle):
    if jour not in d.index or cle not in d:
        return None
    v = d.at[jour, cle]
    return None if pd.isna(v) else float(v)


# ---------- Les observations d'une journée ----------
def _sommeil(d, jour, nuit):
    v = _val(d, nuit, "sommeil")
    if v is None:
        return []
    h7 = _colonne(d.loc[nuit - dt.timedelta(days=6):nuit], "sommeil")
    courtes, dette = int((h7 < 420).sum()), float((420 - h7).clip(lower=0).sum())
    base = _avant(d, nuit, "sommeil")
    repere = f" (d'habitude {hm(base.median())})" if len(base) >= 7 else ""
    cou = _avant(d, nuit, "coucher")
    plus_tot = f" vers {heure(cou.median() - 30)}" if len(cou) >= 7 else ""
    if v < 360:
        return [_carte("sommeil", 80, ALERTE, f"Nuit courte : {hm(v)}", f"Ronflex n'en revient pas : {hm(v)} de sommeil{repere}. Sous 6 h, l'énergie et la récupération baissent nettement le lendemain.",
                       f"Pas besoin de tout rattraper d'un coup : couche-toi 30 min plus tôt ce soir{plus_tot}, et garde ton heure de lever.")]
    if courtes >= 4 and dette >= 120:
        return [_carte("sommeil", 72, ALERTE, f"{hm(dette)} de sommeil en retard", f"{courtes} nuits sous 7 h sur les 7 dernières. Ronflex a compté : il te manque {hm(dette)} sur la semaine, et ça se sent sur l'énergie comme sur l'envie de bouger.",
                       f"Vise deux nuits complètes d'affilée : c'est plus efficace qu'une grasse matinée isolée.{' Coucher visé :' + plus_tot + '.' if plus_tot else ''}")]
    if v < 420:
        return [_carte("sommeil", 42, NEUTRE, f"Presque : {hm(v)}", f"Il manque {hm(420 - v)} pour atteindre les 7 h{repere}.", f"30 min plus tôt au lit ce soir suffiraient{plus_tot}, et ton bonus shiny est de retour.")]
    serie = 0
    for x in reversed(_colonne(d.loc[:nuit], "sommeil").tolist()):
        if x < 420:
            break
        serie += 1
    if serie >= 5:
        return [_carte("sommeil", 66, BON, f"{serie} nuits de 7 h d'affilée", f"Ronflex est jaloux : {serie} nuits complètes de suite. C'est un des meilleurs leviers pour l'énergie, le cœur et le poids.", "Continue, c'est la régularité qui fait tout.")]
    if len(base) >= 7 and v >= base.median() + 45:
        return [_carte("sommeil", 45, BON, f"Belle nuit : {hm(v)}", f"{hm(v - base.median())} de plus que d'habitude. Tes réserves sont pleines.", "Bon jour pour faire une séance un peu plus intense.", pousse=True)]
    return [_carte("sommeil", 24, BON, f"Nuit complète : {hm(v)}", f"{hm(v)} de sommeil{repere}. Ronflex approuve.")]


def _coucher(d, jour, nuit):
    h14 = _colonne(d.loc[nuit - dt.timedelta(days=13):nuit], "coucher")
    v = _val(d, nuit, "coucher")
    if len(h14) < 7:
        return []
    e = float(h14.std())
    sorties = []
    if e >= 70:
        sorties.append(_carte("coucher", 54, NEUTRE, "Horaires qui font le yoyo", f"Tes couchers varient de {hm(e)} en moyenne sur 14 jours, de {heure(h14.min())} à {heure(h14.max())}. Rondoudou chante, mais à des heures différentes, c'est moins efficace.",
                              "Le plus simple : se lever à la même heure, même après une nuit courte. Le coucher suit tout seul."))
    elif e <= 30 and len(h14) >= 10:
        sorties.append(_carte("coucher", 44, BON, "Des horaires réguliers", f"Coucher vers {heure(h14.median())}, à {hm(e)} près sur 14 jours. Le corps adore ça : il s'endort plus vite et récupère mieux."))
    if v is not None and v >= h14.median() + 75:
        sorties.append(_carte("coucher", 50, NEUTRE, f"Couché à {heure(v)}", f"{hm(v - h14.median())} plus tard que d'habitude ({heure(h14.median())}).", "Ce soir, baisse les écrans et la lumière 30 min avant : c'est le signal que le corps attend."))
    return sorties


def _recup(d, jour, nuit):
    fc, vfc = _val(d, nuit, "fc_repos"), _val(d, nuit, "vfc")
    bf, bv = _avant(d, nuit, "fc_repos"), _avant(d, nuit, "vfc")
    ecart_f = fc - bf.median() if fc is not None and len(bf) >= 7 else None
    ecart_v = (vfc - bv.median()) / bv.median() if vfc is not None and len(bv) >= 7 and bv.median() else None
    mauvais_f, mauvais_v = ecart_f is not None and ecart_f >= 4, ecart_v is not None and ecart_v <= -.2
    if mauvais_f and mauvais_v:
        return [_carte("recup", 86, ALERTE, "Ton corps demande du calme", f"Cœur au repos à {fc:.0f} bpm (+{ecart_f:.0f}) et variabilité en baisse de {-ecart_v * 100:.0f} %. Leveinard voit ça après un manque de sommeil, du stress, de l'alcool, une grosse séance, ou un début de maladie.",
                       "Aujourd'hui, marche plutôt qu'effort intense, et bois bien. Si tu te sens mal, repos complet : les points attendront.")]
    if mauvais_f:
        return [_carte("recup", 68, NEUTRE, f"Cœur au repos un peu haut : {fc:.0f} bpm", f"{ecart_f:.0f} bpm de plus que ta moyenne ({bf.median():.0f}). Souvent le signe d'une récupération pas terminée.", "Si tu te sens fatigué, remplace l'intense du jour par de la marche.")]
    if mauvais_v:
        return [_carte("recup", 62, NEUTRE, "Récupération en retard", f"Ta variabilité cardiaque est {-ecart_v * 100:.0f} % sous ta moyenne ({vfc:.0f} ms contre {bv.median():.0f}).", "Séance légère aujourd'hui, et une vraie nuit ce soir.")]
    if ecart_v is not None and ecart_v >= .15 and (ecart_f is None or ecart_f <= 1):
        return [_carte("recup", 56, BON, "Feu vert de Leveinard", f"Variabilité cardiaque {ecart_v * 100:.0f} % au-dessus de ta moyenne ({vfc:.0f} ms) : tu as bien récupéré.", "C'est un bon jour pour pousser un peu : une séance plus intense passera bien.", pousse=True)]
    longue = _avant(d, nuit, "fc_repos", 90)
    recente = _avant(d, nuit, "fc_repos", 14)
    if len(longue) >= 40 and len(recente) >= 7 and recente.mean() <= longue.mean() - 2:
        return [_carte("recup", 58, BON, "Ton cœur progresse", f"Cœur au repos à {recente.mean():.0f} bpm sur 2 semaines, contre {longue.mean():.0f} sur 3 mois. C'est un des meilleurs signes que le sport paie.")]
    return []


def _pas(d, jour, nuit):
    v = _val(d, jour, "pas")
    if v is None:
        return []
    obj, base = OBJECTIFS["pas"], _avant(d, jour, "pas")
    serie = 0
    for x in reversed(_colonne(d.loc[:jour], "pas").tolist()):
        if x < obj:
            break
        serie += 1
    if v >= 10000:
        return [_carte("pas", 58, BON, f"{nombre(v)} pas", _au_choix(jour, "pas", f"Doduo est essoufflé : {nombre(v)} pas, soit {v / max(base.median(), 1):.1f} fois ta journée habituelle." if len(base) >= 7 else f"Doduo est essoufflé : {nombre(v)} pas !", f"Hyper Ball méritée : {nombre(v)} pas dans la journée."),
                       "Le lendemain d'une grosse journée, 5 000 pas suffisent : le corps progresse aussi au repos.")]
    if serie >= 3:
        return [_carte("pas", 40 + min(serie, 10) * 3, BON, f"{serie} jours à {nombre(obj)} pas", f"Série en cours : {serie} jours d'affilée au-dessus de {nombre(obj)} pas. La régularité compte plus qu'un gros jour isolé.", "Garde le rythme, même avec une petite marche aujourd'hui.")]
    if v < 2000 and (_val(d, jour - dt.timedelta(days=1), "pas") or 0) < 8000:
        return [_carte("pas", 56, NEUTRE, f"Journée très calme : {nombre(v)} pas", f"Doduo a à peine bougé : {nombre(v)} pas" + (f", alors que ta journée habituelle est à {nombre(base.median())}." if len(base) >= 7 else "."), "Dix minutes de marche après un repas, c'est déjà environ 1 000 pas. Le plus dur, c'est de sortir.")]
    if v < obj:
        return [_carte("pas", 30, NEUTRE, f"{nombre(v)} pas", f"Il manquait {nombre(obj - v)} pas pour l'objectif.", f"Environ {max((obj - v) / 100, 5):.0f} min de marche auraient suffi.")]
    return [_carte("pas", 22, BON, f"Objectif atteint : {nombre(v)} pas", f"{nombre(v)} pas : l'objectif est là.")]


def _sport(d, jour, nuit):
    z = _colonne(d.loc[jour - dt.timedelta(days=6):jour], "zone_sport")
    sc = _colonne(d.loc[jour - dt.timedelta(days=6):jour], "min_sport")
    if not len(z) and not len(sc):
        return []
    total, seances = float(z.sum()), float(sc.sum())
    v = _val(d, jour, "zone_sport") or 0
    if len(z) >= 4 and total >= SEMAINE_INTENSE:
        return [_carte("sport", 60, BON, f"{hm(total)} d'effort intense en 7 jours", f"Machoc applaudit : tu dépasses le repère de l'OMS ({SEMAINE_INTENSE} min d'effort intense par semaine). Le cœur et le moral en profitent.", "Pense à garder au moins un jour plus calme par semaine.")]
    if len(z) >= 5 and total == 0 and seances == 0:
        return [_carte("sport", 62, NEUTRE, "7 jours sans effort intense", "Machoc s'ennuie : aucune minute en zone intense, aucune séance cette semaine. Pas besoin d'y passer une heure pour que ça compte.", "Commence petit : 10 min de marche rapide ou de rameur qui font monter le cœur, et c'est une Super Ball de plus près.")]
    if v >= 25:
        return [_carte("sport", 54, BON, f"{hm(v)} de vrai sport", f"Machoc valide : {hm(v)} en zone intense, dans la meilleure tranche pour le cœur. Sur 7 jours, tu en es à {hm(total)}.", "Demain, tu peux y aller plus doucement.")]
    if len(z) >= 4 and total > 0:
        reste = SEMAINE_INTENSE - total
        return [_carte("sport", 34, NEUTRE, f"{hm(total)} d'effort intense en 7 jours", f"Le repère de l'OMS est à {SEMAINE_INTENSE} min par semaine : il te manque {hm(reste)}.", f"{max(reste / 3, 10):.0f} min, trois fois dans la semaine, suffiraient.")]
    return []


def _assis(d, jour, nuit, j_jour):
    sed = table((j_jour or {}).get("sedentary-period")) if j_jour else pd.DataFrame()
    if "secondes" in sed and len(sed):
        m = pd.to_numeric(sed["secondes"], errors="coerce") / 60
        long_ = float(m.max())
        if long_ >= 150:
            return [_carte("assis", 46, NEUTRE, f"{hm(long_)} assis d'un coup", f"Psykokwak a mal au dos pour toi : ta plus longue période sans bouger a duré {hm(long_)}, à partir de {sed['heure'][m.idxmax()][:5]}.", "Même deux minutes debout coupent bien la séance. Un appel téléphonique, c'est le bon moment.")]
    return []


def _poids(d, jour, nuit):
    p = _colonne(d.loc[jour - dt.timedelta(days=45):jour], "poids")
    tout = _colonne(d.loc[:jour], "poids")
    if not len(tout):
        return []
    derniere = tout.index[-1]
    attente = (jour - derniere).days
    if attente >= 14:
        return [_carte("poids", 22, NEUTRE, f"Pas de pesée depuis {attente} jours", "Grolem ne pèse pas tous les jours, mais une tendance a besoin de quelques points.", "Une pesée le matin, trois fois par semaine, et les courbes deviennent fiables.")]
    if len(p) < 4 or (p.index[-1] - p.index[0]).days < 14:
        return []
    jours = pd.Series([(x - p.index[0]).days for x in p.index], index=p.index, dtype=float)
    pente = float(jours.cov(p) / jours.var()) * 7 if jours.var() else 0
    duree = (p.index[-1] - p.index[0]).days
    if abs(pente) >= .7:
        return [_carte("poids", 50, NEUTRE, f"Poids : {pente:+.1f} kg par semaine".replace(".", ","), f"La tendance sur {duree} jours va vite. Une pesée seule ne veut rien dire, mais {len(p)} pesées, si. Un rythme d'environ 0,5 kg par semaine est plus facile à tenir.", "Regarde ce qui a changé récemment : repas, sommeil ou activité.")]
    if abs(pente) <= .15:
        return [_carte("poids", 24, BON, f"Poids stable : {nombre(p.iloc[-1], 1)} kg", f"Sur {duree} jours et {len(p)} pesées, la tendance est stable. Grolem respecte.")]
    return [_carte("poids", 32, NEUTRE, f"Poids : {pente:+.1f} kg par semaine".replace(".", ","), f"Tendance calculée sur {len(p)} pesées en {duree} jours : un rythme raisonnable.")]


def _oxygene(d, jour, nuit):
    s, m = _colonne(d.loc[nuit - dt.timedelta(days=6):nuit], "spo2"), _colonne(d.loc[nuit - dt.timedelta(days=6):nuit], "spo2_min")
    if int((s < 93).sum()) >= 3 or int((m < 88).sum()) >= 3:
        return [_carte("oxygene", 84, ALERTE, "Oxygène bas plusieurs nuits", f"Leveinard préfère te le signaler : sur 7 nuits, l'oxygène est descendu bas plusieurs fois (moyenne {nombre(s.mean(), 1)} %, plus bas {nombre(m.min(), 1)} %). Une montre n'est pas un appareil médical, et elle peut se tromper.",
                       "Si ça continue, ou si tu ronfles beaucoup et te réveilles fatigué, parles-en à ton médecin.")]
    return []


def _habitudes(d, jour):
    """Ce que les chiffres du joueur disent de lui, sur 90 jours : le plus intéressant, parce que personne d'autre ne peut le dire."""
    h = d.loc[jour - dt.timedelta(days=89):jour]
    sorties = []
    if "sommeil" in h and "pas" in h:
        x = h[["sommeil", "pas"]].dropna()
        a, b = x[x["sommeil"] >= 420]["pas"], x[x["sommeil"] < 420]["pas"]
        if len(a) >= 8 and len(b) >= 8 and a.mean() >= b.mean() * 1.15:
            sorties.append(_carte("habitude", 58, NEUTRE, "Ton sommeil fait tes pas", f"Alakazam a calculé : après une nuit de 7 h, tu fais {nombre(a.mean())} pas en moyenne, contre {nombre(b.mean())} après une nuit plus courte, soit {(a.mean() / b.mean() - 1) * 100:.0f} % de plus.", "Pour bouger plus, commence peut-être par te coucher plus tôt."))
    if "coucher" in h and "vfc" in h:
        x = h[["coucher", "vfc"]].dropna()
        if len(x) >= 16:
            coupe = x["coucher"].median()
            a, b = x[x["coucher"] <= coupe]["vfc"], x[x["coucher"] > coupe]["vfc"]
            if len(a) >= 8 and len(b) >= 8 and a.mean() >= b.mean() * 1.1:
                sorties.append(_carte("habitude", 56, NEUTRE, "L'heure du coucher compte", f"Alakazam a calculé : couché avant {heure(coupe)}, ta récupération (VFC) est de {a.mean():.0f} ms, contre {b.mean():.0f} ms après.", f"Essaie de passer sous {heure(coupe)} quelques soirs de suite, et regarde."))
    if "pas" in h:
        x = h["pas"].dropna()
        if len(x) >= 42:
            semaine = pd.Series([i.weekday() for i in x.index], index=x.index)
            parjour = x.groupby(semaine).mean()
            demain = (jour + dt.timedelta(days=1)).weekday()
            faible = int(parjour.idxmin())
            autres = x[semaine != faible].mean()
            if parjour[faible] <= autres * .75:
                sorties.append(_carte("habitude", 46, NEUTRE, f"Le {NOMS_JOURS[faible]}, ton point faible", f"Alakazam a calculé : le {NOMS_JOURS[faible]}, tu fais {nombre(parjour[faible])} pas en moyenne, contre {nombre(autres)} les autres jours.", "Prévois ta marche dès aujourd'hui : c'est demain qu'elle rapportera le plus." if faible == demain else f"Prévois une marche le {NOMS_JOURS[faible]} : c'est là qu'elle rapportera le plus."))
    if "zone_sport" in h and "sommeil" in h:
        x = pd.DataFrame({"sport": h["zone_sport"], "nuit": h["sommeil"].shift(-1)}).dropna()
        a, b = x[x["sport"] >= 10]["nuit"], x[x["sport"] < 10]["nuit"]
        if len(a) >= 6 and len(b) >= 6 and a.mean() >= b.mean() + 20:
            sorties.append(_carte("habitude", 54, BON, "Le sport t'aide à dormir", f"Alakazam a calculé : après une journée avec 10 min de sport, tu dors {hm(a.mean())}, contre {hm(b.mean())} sinon.", "Une raison de plus de faire monter le cœur, même peu."))
    # Une habitude ne change pas d'un jour à l'autre : on n'en parle qu'un jour sur 4 au plus, et pas toujours de la même
    if sorties and jour.toordinal() % 4 == 0:
        return sorties[(jour.toordinal() // 4) % max(len(sorties), 3):][:1]
    return []


def _toutes(d, jour, nuit, j_jour=None):
    return (_oxygene(d, jour, nuit) + _recup(d, jour, nuit) + _sommeil(d, jour, nuit) + _coucher(d, jour, nuit)
            + _sport(d, jour, nuit) + _pas(d, jour, nuit) + _assis(d, jour, nuit, j_jour) + _poids(d, jour, nuit) + _habitudes(d, jour))


def _choisir(cartes, jour, deja=frozenset(), n=3):
    """Les n observations les plus fortes, un thème chacune, en mettant de côté ce qui vient d'être dit (sauf les alertes)."""
    notes = []
    for c in cartes:
        note = c["force"] + _graine(jour, c["theme"], c["titre"]) % 9
        if c["theme"] in deja and c["force"] < 80:  # ce qui vient d'être dit s'efface, sauf ce qui est vraiment important
            note -= 30
        notes.append((note, c))
    notes.sort(key=lambda x: -x[0])
    choisies, vus = [], set()
    for note, c in notes:
        if c["theme"] not in vus and note >= 14:
            choisies.append(c)
            vus.add(c["theme"])
        if len(choisies) == n:
            break
    if any(c["theme"] == "recup" and c["ton"] != BON for c in choisies):
        for c in choisies:
            if c["pousse"]:
                c["conseil"] = None
    return choisies


def _themes_recents(d, jour, nuit_de):
    """Ce qui a été dit les 2 jours d'avant."""
    deja = set()
    for k in (1, 2):
        j = jour - dt.timedelta(days=k)
        deja |= {c["theme"] for c in _choisir(_toutes(d, j, nuit_de(j)), j)}
    return frozenset(deja)


def _numerique(stats):
    d = stats.apply(pd.to_numeric, errors="coerce")
    if "coucher" in d:  # un coucher de jour, c'est une sieste : elle fausserait les horaires de nuit
        d["coucher"] = d["coucher"].where((d["coucher"] >= 19 * 60) & (d["coucher"] <= 33 * 60))
    return d


def _phrase(cartes):
    alertes = sum(c["ton"] == ALERTE for c in cartes)
    bons = sum(c["ton"] == BON for c in cartes)
    if alertes:
        return "On lève le pied aujourd'hui, ton corps a des choses à dire."
    if bons >= 2:
        return "Tes Pokémon sont en forme, et toi aussi."
    if bons:
        return "Du bon et de quoi progresser."
    return "Rien de grave : voici ce qui ferait la différence."


def analyser(stats, periode, debut, fin, aujourd, j_jour=None):
    """Le bilan affiché dans l'onglet Santé. j_jour = fichier du jour analysé (détail des périodes assises), facultatif."""
    d = _numerique(stats)
    if periode == "Jour":
        hier = fin == aujourd
        jour = aujourd - dt.timedelta(days=1) if hier else fin
        if jour not in d.index:
            return None
        nuit_de = lambda j: j + dt.timedelta(days=1) if hier and j + dt.timedelta(days=1) in d.index and _val(d, j + dt.timedelta(days=1), "sommeil") is not None else j  # noqa: E731
        cartes = _choisir(_toutes(d, jour, nuit_de(jour), j_jour), jour, _themes_recents(d, jour, lambda j: j))
        titre = "Le bilan d'hier" if hier else f"Le bilan du {JOURS[jour.weekday()]} {jour:%d/%m}"
    else:
        titre = {"7 jours": "Le bilan des 7 jours", "Semaine": "Le bilan de la semaine", "Mois": "Le bilan du mois", "Année": "Le bilan de l'année"}.get(periode, "Le bilan")
        if (fin - debut).days < 2:  # la période vient de commencer : on regarde les 7 derniers jours plutôt que rien
            debut, titre = fin - dt.timedelta(days=6), "Le bilan des 7 derniers jours"
        cartes = _periode(d, debut, fin)
    if not cartes:
        return {"titre": titre, "phrase": "Il me faut encore quelques jours de données pour bien te connaître.", "cartes": []}
    return {"titre": titre, "phrase": _phrase(cartes), "cartes": cartes}


def conseil_du_jour(stats, aujourd):
    """La phrase utile du récap du matin (Infirmière Joëlle) : le conseil le plus important, ou None. Sans répéter les jours d'avant."""
    d = _numerique(stats)
    jour = aujourd - dt.timedelta(days=1)
    if jour not in d.index:
        return None
    nuit = aujourd if _val(d, aujourd, "sommeil") is not None else jour
    cartes = _choisir(_toutes(d, jour, nuit), jour, _themes_recents(d, jour, lambda j: j), 1)
    return next((c["conseil"] for c in cartes if c.get("conseil")), None)


# ---------- Le bilan d'une période ----------
def _periode(d, debut, fin):
    p = d.loc[debut:fin]
    n = len(p)
    if n < 3:
        return []
    avant = d.loc[debut - dt.timedelta(days=n):debut - dt.timedelta(days=1)]
    cartes = []
    if "sommeil" in p and p["sommeil"].notna().sum() >= 3:
        s = p["sommeil"].dropna()
        ok, ref = int((s >= 420).sum()), avant["sommeil"].mean() if "sommeil" in avant else None
        evol = f" ({hm(abs(s.mean() - ref))} de {'plus' if s.mean() > ref else 'moins'} que la période d'avant)" if ref == ref and ref and abs(s.mean() - ref) >= 10 else ""
        ton = BON if ok >= len(s) * .7 else ALERTE if s.mean() < 360 else NEUTRE
        cartes.append(_carte("sommeil", 66 if ton != NEUTRE else 50, ton, f"{hm(s.mean())} par nuit", f"Ronflex a compté {ok} nuits de 7 h sur {len(s)}{evol}.", None if ton == BON else "Vise une nuit complète de plus par semaine, puis encore une."))
    if "coucher" in p and p["coucher"].notna().sum() >= 5:
        c = p["coucher"].dropna()
        if c.std() >= 70:
            cartes.append(_carte("coucher", 52, NEUTRE, "Couchers irréguliers", f"Entre {heure(c.min())} et {heure(c.max())}, à {hm(c.std())} près en moyenne.", "Une heure de lever fixe est le moyen le plus simple de régulariser."))
    if "pas" in p and p["pas"].notna().sum() >= 3:
        v = p["pas"].dropna()
        ok, ref = int((v >= OBJECTIFS["pas"]).sum()), avant["pas"].mean() if "pas" in avant else None
        evol = f", {abs(v.mean() / ref - 1) * 100:.0f} % de {'plus' if v.mean() > ref else 'moins'} que la période d'avant" if ref == ref and ref and abs(v.mean() / ref - 1) >= .08 else ""
        mei = v.idxmax()
        cartes.append(_carte("pas", 60 if ok >= len(v) * .7 or evol else 44, BON if ok >= len(v) * .6 else NEUTRE, f"{nombre(v.mean())} pas par jour", f"Doduo a tenu l'objectif {ok} jours sur {len(v)}{evol}. Meilleur jour : {JOURS[mei.weekday()]} {mei:%d/%m}, {nombre(v.max())} pas.", None if ok >= len(v) * .6 else "Mieux vaut 5 000 pas tous les jours que 12 000 une fois."))
    z = p["zone_sport"].dropna() if "zone_sport" in p else pd.Series(dtype=float)
    if len(z) >= 3:
        hebdo = z.sum() / len(z) * 7
        cartes.append(_carte("sport", 64, BON if hebdo >= SEMAINE_INTENSE else NEUTRE, f"{hm(hebdo)} d'effort intense par semaine", f"Machoc compare au repère de l'OMS, {SEMAINE_INTENSE} min par semaine.", None if hebdo >= SEMAINE_INTENSE else f"Il manque {hm(SEMAINE_INTENSE - hebdo)} par semaine : 2 ou 3 petites séances suffisent."))
    if "fc_repos" in p and p["fc_repos"].notna().sum() >= 3 and "fc_repos" in avant and avant["fc_repos"].notna().sum() >= 3:
        e = p["fc_repos"].mean() - avant["fc_repos"].mean()
        if abs(e) >= 2:
            cartes.append(_carte("recup", 56, BON if e < 0 else NEUTRE, f"Cœur au repos : {p['fc_repos'].mean():.0f} bpm", f"{abs(e):.0f} bpm de {'moins' if e < 0 else 'plus'} que la période d'avant. {'Leveinard aime ça : le cœur devient plus efficace.' if e < 0 else 'Fatigue, stress ou sommeil, à surveiller.'}"))
    q = _colonne(d.loc[debut:fin], "poids")
    if len(q) >= 3 and (q.index[-1] - q.index[0]).days >= 7:
        cartes.append(_carte("poids", 40, NEUTRE, f"Poids : {q.iloc[-1] - q.iloc[0]:+.1f} kg".replace(".", ","), f"De {nombre(q.iloc[0], 1)} à {nombre(q.iloc[-1], 1)} kg en {len(q)} pesées. Grolem regarde la tendance, jamais une seule pesée."))
    cartes += _oxygene(d, fin, fin) + _habitudes(d, fin)
    return _choisir(cartes, fin, n=4)
