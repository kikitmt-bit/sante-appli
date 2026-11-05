"""Régis, le rival : détestable, voulu par Kiki (05/11, trois potes de 40 ans). Il croise le joueur 4 fois par région et met le doigt sur ses chiffres
les moins flatteurs de la semaine. Montré au joueur concerné seulement ; jamais le poids. Ni jeu ni points ici : que du texte, calculé sur les derniers jours
(`etat["derniers"]`). Un jour sans pas = montre oubliée : il ne compte pas, on ne se moque pas d'une panne. Pas de vanne sur le sport tant que le joueur n'a
jamais eu une seule minute de sport : sa montre ne les mesure peut-être pas (Kiki, 05/11). Cœur et masse grasse (Kiki, 05/11) : des repères pour rire, pas un diagnostic ;
la masse grasse ne se juge qu'avec l'âge et le sexe du téléphone, sinon seulement sa hausse ; jamais le poids."""
import datetime as dt
import random

import bilan
import chiffres
import regions

JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
ACCROCHES = {
    "rival-k1-route": "Tiens, {nom}. Moi, c'est Régis. Je voulais voir à quoi ressemble quelqu'un qui marche aussi peu.",
    "rival-k2-pont": "Personne ne passe sur ce pont sans que je lui lise ses chiffres. J'ai les tiens. Accroche-toi à la rambarde.",
    "rival-k3-navire": "Je pars en croisière, moi. Toi, c'est un canot de sauvetage qu'il te faudrait. J'ai regardé ta semaine.",
    "rival-k4-victoire": "Tu comptes vraiment aller à la Ligue ? Avec ces chiffres-là ?",
    "rival-j1-mauville": "{nom} ! Tu en as mis, du temps. Ta montre m'a tout raconté.",
    "rival-j2-bois": "Perdu dans les bois ? Normal : à ton rythme, même les Chenipan te doublent.",
    "rival-j3-rosalia": "Ici, on vénère les anciens. Ça tombe bien, je pensais justement à toi.",
    "rival-j4-antre": "Je t'attendais plus tôt. J'ai eu le temps de lire ta semaine : ça n'a pas été long.",
}
SORTIES = ["Allez, file. Je te garde une place, derrière moi.", "Ne me remercie pas. Remercie plutôt ton canapé, il a enfin de la compagnie.",
           "Bon, j'y vais. Moi, j'ai des choses à faire. En marchant.", "Essaie de faire mieux. Enfin, essaie de faire quelque chose."]


def _duree(minutes):
    return f"{int(minutes // 60)} h {int(minutes % 60):02d}"


def _candidats(semaine, avant, sport_vu=True, gras_haut=None, gras=()):
    """[(à quel point c'est peu flatteur, clé, textes possibles)], à partir de la semaine écoulée."""
    n, nb = len(semaine), chiffres.nombre
    pas = [j["pas"] for j in semaine]
    moy, pire = sum(pas) / n, min(semaine, key=lambda j: j["pas"])
    jour = JOURS[dt.date.fromisoformat(pire["jour"]).weekday()]
    out = []
    if pire["pas"] < 5000:
        out.append((1 - pire["pas"] / 5000, "pire", [f"{jour.capitalize()} : {nb(pire['pas'])} pas. Même ton facteur en fait plus rien que pour aller à ta boîte aux lettres.",
                                                     f"{nb(pire['pas'])} pas, {jour}. Tu t'es levé, au moins, ou c'est ta montre qui est tombée du lit ?"]))
    if moy < 7000:
        out.append(((7000 - moy) / 7000, "moyenne", [f"{nb(moy)} pas par jour en moyenne. Mon Ronflex fait mieux en dormant.",
                                                     f"{nb(moy)} pas de moyenne. Tu marches, ou tu fais juste le tour du canapé ?"]))
    if len(avant) >= 3:
        ancien = sum(j["pas"] for j in avant) / len(avant)
        if ancien and moy < ancien * .9:
            baisse = round((1 - moy / ancien) * 100)
            out.append((baisse / 40, "baisse", [f"{baisse} % de pas en moins que la semaine d'avant. Continue, tu finiras bien par atteindre zéro.",
                                                f"La semaine d'avant, tu marchais {baisse} % de plus. C'était le bon temps, hein, papy ?"]))
    sport, sans = sum(j["zone"] for j in semaine), sum(not j["zone"] for j in semaine)
    if not sport_vu:
        pass
    elif sport == 0:
        out.append((.9, "sport", [f"Zéro minute de sport en {n} jours. Même pas par accident. Chapeau.", f"{n} jours, zéro minute de sport. Ton cœur doit se demander si tu es encore là."]))
    elif sport < 50:
        out.append((1 - sport / 50, "sport", [f"{nb(sport)} minutes de sport en {n} jours. C'était quoi, courir après le bus ?",
                                              f"{sans} jours sans une seule minute de sport sur {n}. Et les autres jours, tu as couru après quoi, le bus ?"]))
    nuits = [j["sommeil"] for j in semaine if j["sommeil"]]
    if len(nuits) >= 3 and sum(nuits) / len(nuits) < 420:
        m = sum(nuits) / len(nuits)
        out.append(((420 - m) / 120, "sommeil", [f"{_duree(m)} de sommeil en moyenne. Et après, tu t'étonnes d'avoir cette tête.",
                                                 f"Ta nuit la plus courte : {_duree(min(nuits))}. Je ne te dis pas comme ça se voit."]))
    repos = [j["fc_repos"] for j in semaine if j.get("fc_repos")]
    if len(repos) >= 3 and sum(repos) / len(repos) >= 70:
        fc = sum(repos) / len(repos)
        out.append((min((fc - 66) / 16, 1), "coeur", [f"{nb(fc)} battements par minute au repos. Au repos ! Ton cœur a 70 ans, et il aimerait bien s'asseoir.",
                                                      f"{nb(fc)} au repos. J'ai vu des grands-pères plus détendus en montant un escalier."]))
    vfc = [j["vfc"] for j in semaine if j.get("vfc")]
    if len(vfc) >= 3 and sum(vfc) / len(vfc) <= 28:
        v = sum(vfc) / len(vfc)
        out.append((min((32 - v) / 16, 1), "vfc", [f"Récupération : {nb(v)} ms. Sur ta montre, tu as un cœur de 70 ans. Tu veux que je t'aide à traverser ?"]))
    if gras:
        recent = sum(gras[-3:]) / len(gras[-3:])
        txt = str(round(recent, 1)).replace(".", ",")
        if gras_haut and recent > gras_haut:
            out.append((min((recent - gras_haut) / 8 + .3, 1), "gras", [f"{txt} % de masse grasse. Tu stockes pour l'hiver, ou tu comptes hiberner avec Ronflex ?",
                                                                       f"{txt} % de masse grasse d'après ta balance. Elle a dû te dire ça avec tact. Pas moi."]))
        if len(gras) >= 3 and gras[-1] - gras[0] >= 1:
            hausse = str(round(gras[-1] - gras[0], 1)).replace(".", ",")
            out.append((min((gras[-1] - gras[0]) / 3 + .2, 1), "gras", [f"+{hausse} point de masse grasse en deux semaines. Enfin quelque chose qui progresse chez toi."]))
    if not sum(j["pompes"] + j["tractions"] + j["squats"] for j in semaine):
        out.append((.4, "muscu", ["Zéro pompe, zéro traction, zéro squat de la semaine. Tes bras, ils servent à porter la télécommande ?"]))
    if not out or max(c[0] for c in out) < .05:
        out.append((.05, "fort", [f"{nb(moy)} pas de moyenne, bravo. Tu fuis quelqu'un, ou c'est que personne ne t'attend à la maison ?", f"{nb(moy)} pas par jour. Pas mal, pour ton âge."]))
    return out


def repliques(derniers, aujourd, image, sport_vu=True, gras_haut=None):
    """Ce que Régis dit pour cette rencontre : [accroche, 2 piques, vantardise, sortie], ou None s'il manque des jours pour se moquer."""
    jours = [j for j in derniers if j["jour"] < str(aujourd) and j["pas"] > 0]
    semaine, avant = jours[-7:], jours[-14:-7]
    if len(semaine) < 3:
        return None
    rng = random.Random(f"{aujourd}#{image}")
    gras = [j["gras"] for j in jours[-14:] if j.get("gras")]
    pires, vus = [], set()
    for c in sorted(_candidats(semaine, avant, sport_vu, gras_haut, gras), key=lambda c: -c[0]):
        if c[1] not in vus and len(pires) < 2:
            vus.add(c[1])
            pires.append(c)
    lui = max(max(j["pas"] for j in semaine) * 1.1, 6000)
    return [ACCROCHES[image], *[rng.choice(c[2]) for c in pires], f"Moi, ma journée de repos, c'est {chiffres.nombre(round(lui, -2))} pas.", rng.choice(SORTIES)]


def pour_ecran(etat, aujourd, profil=None):
    """Les rencontres de la région en cours, avec leur texte, pour le téléphone."""
    r = regions.REGIONS[etat["region"]["index"]]
    dist = {l["nom"]: d for l, d in zip(r.lieux, r.dist)}
    rep = bilan.repere_gras((profil or {}).get("age"), (profil or {}).get("sexe"))
    return [{"image": image, "dist": dist[lieu], "lieu": lieu, "lignes": repliques(etat.get("derniers") or [], aujourd, image, etat.get("sport_vu", False), rep[1] if rep else None)} for lieu, image in r.rival.items()]
