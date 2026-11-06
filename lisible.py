"""Des chiffres de santé qui parlent (Kiki, 06/11 : « des chiffres bruts, ça ne me sert à rien ») : chaque mesure dit ce que c'est, où on en est et si c'est bien,
en mots simples. Des repères généraux pour comprendre, jamais un avis médical. Pas de Streamlit ici : app.py n'a plus qu'à dessiner."""
import pandas as pd

from chiffres import OBJECTIFS, hm, nombre

JOURS_LONGS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
JOURS_COURTS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."]
VERT, BLEU, ORANGE, ROUGE = "#48C868", "#40A8F8", "#F0A030", "#D83830"
EXPLOIT_PAS = 10000
KCAL_PAIN_AU_CHOCOLAT = 280
METRES_TERRAIN = 100


def _carte(titre, valeur, statut, ton, texte, jauge=None, plus=""):
    return {"titre": titre, "valeur": valeur, "statut": statut, "ton": ton, "texte": texte, "jauge": jauge, "plus": plus}


def coeur_repos(v, moyenne=None):
    statut, ton = ("Très entraîné", "bon") if v < 60 else ("Bien", "bon") if v < 70 else ("Dans la moyenne", "neutre") if v < 85 else ("Plutôt élevé", "alerte")
    plus = ""
    if moyenne and abs(v - moyenne) >= 3:
        plus = f"{abs(v - moyenne):.0f} de {'moins' if v < moyenne else 'plus'} que ta moyenne du mois."
        if v > moyenne:
            plus += " Fatigue, stress, un verre la veille ou un rhume peuvent le faire monter."
    return _carte("Cœur au repos", f"{v:.0f} bpm", statut, ton, "Le nombre de battements par minute quand tu ne fais rien. Plus il est bas, moins ton cœur a besoin de forcer : c'est ce qui baisse quand on s'entraîne.",
                  {"min": 40, "max": 100, "val": v, "zones": [(60, VERT), (70, "#98D060"), (85, ORANGE), (100, ROUGE)]}, plus)


def recuperation(v, moyenne):
    """La variabilité cardiaque ne se compare qu'à soi : on la juge par rapport à sa propre moyenne."""
    if not moyenne:
        return _carte("Récupération", f"{v:.0f} ms", "À suivre", "neutre", "Le petit écart de temps entre deux battements (la « variabilité cardiaque »). Plus il varie, plus ton corps est reposé. Il faut quelques jours de mesures pour te comparer à toi-même.")
    r = v / moyenne
    statut, ton = ("Bien récupéré", "bon") if r >= 1.1 else ("Comme d'habitude", "neutre") if r >= .85 else ("Corps fatigué", "alerte")
    conseil = {"bon": "Bon jour pour une grosse séance.", "neutre": "", "alerte": "Une journée plus douce lui fera du bien : grosse séance, manque de sommeil ou maladie peuvent la faire baisser."}[ton]
    return _carte("Récupération", f"{v:.0f} ms", statut, ton, "Le petit écart de temps entre deux battements (la « variabilité cardiaque »). Plus il varie, plus ton corps est reposé. Ce chiffre ne se compare qu'à toi-même, jamais aux autres.",
                  {"min": moyenne * .6, "max": moyenne * 1.4, "val": v, "zones": [(moyenne * .85, ORANGE), (moyenne * 1.1, BLEU), (moyenne * 1.4, VERT)]}, f"Ta moyenne du mois : {moyenne:.0f} ms. {conseil}".strip())


def oxygene(v, mini=None):
    statut, ton = ("Tout va bien", "bon") if v >= 95 else ("Un peu bas", "neutre") if v >= 92 else ("Bas", "alerte")
    plus = f"Au plus bas de la nuit : {nombre(mini, 1)} %." if mini else ""
    if ton != "bon":
        plus += " Si ça revient souvent, parles-en à un médecin."
    return _carte("Oxygène la nuit", f"{nombre(v, 1)} %", statut, ton, "La part d'oxygène transportée par ton sang pendant que tu dors (la « SpO2 »). Entre 95 et 100 %, c'est normal.",
                  {"min": 88, "max": 100, "val": v, "zones": [(92, ROUGE), (95, ORANGE), (100, VERT)]}, plus.strip())


def respiration(v):
    statut, ton = ("Calme", "bon") if 12 <= v <= 20 else ("Très lente", "neutre") if v < 12 else ("Un peu rapide", "neutre")
    return _carte("Respiration la nuit", f"{nombre(v, 1)} par min", statut, ton, "Le nombre de respirations par minute pendant ton sommeil. Le repère habituel : de 12 à 20. Elle monte souvent quand on tombe malade.",
                  {"min": 8, "max": 26, "val": v, "zones": [(12, ORANGE), (20, VERT), (26, ORANGE)]})


def effort_max(v, maximum=None):
    if not maximum:
        return _carte("Plus haut du cœur", f"{v:.0f} bpm", "", "neutre", "La vitesse la plus haute atteinte par ton cœur. Renseigne ta date de naissance sur ta carte du dresseur pour la comparer à ton maximum.")
    pct = v / maximum * 100
    statut, ton = ("Grosse intensité", "bon") if pct >= 80 else ("Vrai effort", "bon") if pct >= 60 else ("Tranquille", "neutre")
    return _carte("Plus haut du cœur", f"{v:.0f} bpm", statut, ton, f"La vitesse la plus haute atteinte par ton cœur : {pct:.0f} % de ton maximum théorique pour ton âge ({maximum:.0f}).",
                  {"min": 40, "max": max(maximum, v), "val": v, "zones": [(maximum * .6, BLEU), (maximum * .8, VERT), (max(maximum, v), ORANGE)]})


def resume_coeur(repos, recup):
    """Une phrase pour tout dire, d'après les deux cartes qui comptent."""
    morceaux = []
    if repos:
        morceaux.append({"bon": "Ton cœur est en forme", "neutre": "Ton cœur est dans la moyenne", "alerte": "Ton cœur bat un peu vite au repos"}[repos["ton"]])
    if recup and recup["statut"] != "À suivre":
        morceaux.append({"bon": "ton corps a bien récupéré", "neutre": "ta récupération est normale", "alerte": "ton corps a besoin de souffler"}[recup["ton"]])
    return " et ".join(morceaux) + "." if morceaux else ""


def _pas(stats):
    return pd.to_numeric(stats["pas"], errors="coerce").dropna() if "pas" in stats else pd.Series(dtype=float)


def _serie(jours_ok):
    """La plus longue suite de True."""
    meilleure = courante = 0
    for ok in jours_ok:
        courante = courante + 1 if ok else 0
        meilleure = max(meilleure, courante)
    return meilleure


def _terrains(km):
    n = round(km * 1000 / METRES_TERRAIN)
    return f"{nombre(km, 1)} km : l'équivalent de {n} terrains de foot mis bout à bout." if n >= 2 else ""


def faits_journee(stats, jour, aujourd, meilleure_heure=None):
    """Ce qu'il faut retenir d'une journée, comparée à ses propres habitudes : [textes], 3 au plus."""
    avant = stats.loc[jour - pd.Timedelta(days=28):jour - pd.Timedelta(days=1)]
    ligne = stats.loc[jour].to_dict() if jour in stats.index else {}
    faits, pas, moy = [], ligne.get("pas"), _pas(avant).mean()
    if pas == pas and pas is not None and moy == moy:
        ecart = round(pas - moy, -2)
        if jour == aujourd:
            faits.append(f"Déjà <b>{nombre(pas)} pas</b>. Une journée normale, pour toi, c'est {nombre(round(moy, -2))} pas.")
        elif abs(ecart) >= 200:
            faits.append(f"<b>{nombre(abs(ecart))} pas de {'plus' if ecart > 0 else 'moins'}</b> que ta journée habituelle ({nombre(round(moy, -2))} pas).")
        else:
            faits.append(f"Une journée dans tes habitudes : environ {nombre(round(moy, -2))} pas.")
    if meilleure_heure:
        faits.append(f"Ton moment le plus actif : <b>{meilleure_heure[0]}</b>, avec {nombre(meilleure_heure[1])} pas.")
    km = ligne.get("km")
    if km == km and km:
        t = _terrains(float(km))
        if t:
            faits.append(t)
    return faits[:3]


def faits_periode(df):
    """Ce qu'il faut retenir d'une période : [textes]."""
    faits, pas = [], _pas(df)
    if pas.empty:
        return faits
    meilleur = pas.idxmax()
    faits.append(f"Ton meilleur jour : <b>{JOURS_COURTS[meilleur.weekday()]} {meilleur:%d/%m}</b>, avec {nombre(pas.max())} pas.")
    sport = pd.to_numeric(df["zone_sport"], errors="coerce").reindex(pas.index).fillna(0) if "zone_sport" in df else pd.Series(0, index=pas.index)
    ok = (pas >= OBJECTIFS["pas"]) | (sport >= OBJECTIFS["zone_sport"])
    faits.append(f"Objectif atteint <b>{ok.sum()} jours sur {len(ok)}</b>" + (f", dont {_serie(ok)} de suite au mieux." if _serie(ok) >= 2 else "."))
    if len(pas) >= 14:
        par_jour = pas.groupby([j.weekday() for j in pas.index]).mean()
        faits.append(f"Ton jour le plus actif : le <b>{JOURS_LONGS[par_jour.idxmax()]}</b> ; le plus calme : le {JOURS_LONGS[par_jour.idxmin()]}.")
    km = pd.to_numeric(df["km"], errors="coerce").sum() if "km" in df else 0
    if km >= 1:
        faits.append(f"{nombre(km, 1)} km au total.")
    return faits[:4]


def calories(total, actives):
    """Le total, et ce que veulent dire les calories « actives », en clair. -> (titre chiffré, explication)."""
    if not total and not actives:
        return None
    texte = "Tout ce que ton corps a dépensé, même au repos : respirer, digérer, penser."
    if actives:
        n = round(actives / KCAL_PAIN_AU_CHOCOLAT, 1)
        texte = f"<b>{nombre(actives)} kcal rien qu'en bougeant</b>" + (f", soit environ {nombre(n, 1)} pain{'s' if n >= 2 else ''} au chocolat" if n >= .5 else "") + ". Le reste, ton corps le dépense tout seul : respirer, digérer, penser."
    return (f"{nombre(total)} kcal" if total else f"{nombre(actives)} kcal"), texte
