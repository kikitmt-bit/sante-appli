"""Le rival : un par région (Kiki, 05/11), le vrai rival de la génération, avec sa personnalité des jeux ; toujours moqueur (trois potes de 40 ans). Il croise le joueur 4 fois
par région et met le doigt sur ses chiffres les moins flatteurs de la semaine. Montré au joueur concerné seulement ; jamais le poids. Ni jeu ni points ici : que du texte,
calculé sur les derniers jours (`etat["derniers"]`). Un jour sans pas = montre oubliée : il ne compte pas, on ne se moque pas d'une panne. Pas de vanne sur le sport tant que
le joueur n'a jamais eu une seule minute de sport : sa montre ne les mesure peut-être pas (Kiki, 05/11). Cœur et masse grasse (Kiki, 05/11) : des repères pour rire, pas un
diagnostic ; la masse grasse ne se juge qu'avec l'âge et le sexe du téléphone, sinon seulement sa hausse ; jamais le poids.
Régis (Kanto) : le moqueur de base. Silver (Johto) : roux, sombre, agressif, ne pense qu'à la puissance et à la victoire, ne plaisante jamais ; a volé son Pokémon chez Orme ;
fils de Giovanni, dit seulement à la dernière rencontre. Une région sans voix ici n'a pas encore été construite (Flora, à Hoenn : amicale, moquerie gentille)."""
import datetime as dt
import random

import bilan
import chiffres
import regions

JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
VOIX = {
    "k": {
        "nom": "Régis",
        "accroches": {
            "rival-k1-route": "Tiens, {nom}. Moi, c'est Régis. Je voulais voir à quoi ressemble quelqu'un qui marche aussi peu.",
            "rival-k2-pont": "Personne ne passe sur ce pont sans que je lui lise ses chiffres. J'ai les tiens. Accroche-toi à la rambarde.",
            "rival-k3-navire": "Je pars en croisière, moi. Toi, c'est un canot de sauvetage qu'il te faudrait. J'ai regardé ta semaine.",
            "rival-k4-victoire": "Tu comptes vraiment aller à la Ligue ? Avec ces chiffres-là ?",
        },
        "sorties": ["Allez, file. Je te garde une place, derrière moi.", "Ne me remercie pas. Remercie plutôt ton canapé, il a enfin de la compagnie.",
                    "Bon, j'y vais. Moi, j'ai des choses à faire. En marchant.", "Essaie de faire mieux. Enfin, essaie de faire quelque chose."],
        "vante": "Moi, ma journée de repos, c'est {lui} pas.",
        "textes": {
            "pire": ["{Jour} : {pas} pas. Même ton facteur en fait plus rien que pour aller à ta boîte aux lettres.", "{pas} pas, {jour}. Tu t'es levé, au moins, ou c'est ta montre qui est tombée du lit ?"],
            "moyenne": ["{moy} pas par jour en moyenne. Mon Ronflex fait mieux en dormant.", "{moy} pas de moyenne. Tu marches, ou tu fais juste le tour du canapé ?"],
            "baisse": ["{baisse} % de pas en moins que la semaine d'avant. Continue, tu finiras bien par atteindre zéro.", "La semaine d'avant, tu marchais {baisse} % de plus. C'était le bon temps, hein, papy ?"],
            "sport0": ["Zéro minute de sport en {n} jours. Même pas par accident. Chapeau.", "{n} jours, zéro minute de sport. Ton cœur doit se demander si tu es encore là."],
            "sport": ["{sport} minutes de sport en {n} jours. C'était quoi, courir après le bus ?", "{sans} jours sans une seule minute de sport sur {n}. Et les autres jours, tu as couru après quoi, le bus ?"],
            "sommeil": ["{nuit} de sommeil en moyenne. Et après, tu t'étonnes d'avoir cette tête.", "Ta nuit la plus courte : {courte}. Je ne te dis pas comme ça se voit."],
            "coeur": ["{fc} battements par minute au repos. Au repos ! Ton cœur a 70 ans, et il aimerait bien s'asseoir.", "{fc} au repos. J'ai vu des grands-pères plus détendus en montant un escalier."],
            "vfc": ["Récupération : {vfc} ms. Sur ta montre, tu as un cœur de 70 ans. Tu veux que je t'aide à traverser ?"],
            "gras": ["{gras} % de masse grasse. Tu stockes pour l'hiver, ou tu comptes hiberner avec Ronflex ?", "{gras} % de masse grasse d'après ta balance. Elle a dû te dire ça avec tact. Pas moi."],
            "hausse": ["+{hausse} point de masse grasse en deux semaines. Enfin quelque chose qui progresse chez toi."],
            "muscu": ["Zéro pompe, zéro traction, zéro squat de la semaine. Tes bras, ils servent à porter la télécommande ?"],
            "fort": ["{moy} pas de moyenne, bravo. Tu fuis quelqu'un, ou c'est que personne ne t'attend à la maison ?", "{moy} pas par jour. Pas mal, pour ton âge."],
        },
    },
    "j": {
        "nom": "Silver",
        "accroches": {
            "rival-j1-mauville": "Toi, {nom}. Je m'appelle Silver. Mon Pokémon, je l'ai pris chez Orme sans demander. Le tien, tu ne le mérites pas. J'ai vu ta semaine.",
            "rival-j2-bois": "Tu traînes dans les bois ? Ici, les faibles se perdent. Et personne ne vient les chercher.",
            "rival-j3-rosalia": "Les gens d'ici prient les anciens. Moi, je ne crois qu'à la puissance. Et toi, tu n'en as aucune.",
            "rival-j4-antre": ["Tu arrives encore à marcher jusqu'ici ? J'ai lu ta semaine.",
                               "Giovanni, le chef de la Team Rocket, c'est mon père. Il a perdu une fois, et il a tout abandonné. Je ne serai jamais comme lui. Ni comme toi."],
        },
        "sorties": ["Dégage. Tu me fais perdre mon temps.", "La prochaine fois, montre-moi au moins quelque chose.",
                    "Ne te retourne pas. Personne ne t'attend.", "Reviens quand tu auras de la force. Donc, ne reviens pas."],
        "vante": "Moi, les jours où je me repose, c'est {lui} pas. Et je déteste me reposer.",
        "textes": {
            "pire": ["{Jour} : {pas} pas. Même pas assez pour qu'on te remarque.", "{pas} pas, {jour}. Un Pokémon sauvage aurait pitié de toi. Pas moi."],
            "moyenne": ["{moy} pas par jour. C'est ça, ta force ? Je déteste perdre mon temps.", "{moy} pas de moyenne. Les gens comme toi restent en bas. Et c'est très bien."],
            "baisse": ["{baisse} % de pas en moins qu'avant. Tu recules. Les faibles reculent toujours.", "{baisse} % de moins en une semaine. Tu abandonnes déjà ? Je m'en doutais."],
            "sport0": ["Zéro minute de sport en {n} jours. Aucune volonté. C'est tout ce que je vois.", "{n} jours sans une minute de sport. Et tu crois que tu vas me battre ?"],
            "sport": ["{sport} minutes de sport en {n} jours. Mes Pokémon en font plus avant de se réveiller.", "{sans} jours sans sport sur {n}. La puissance ne vient pas toute seule. Mais ça, tu ne le sauras jamais."],
            "sommeil": ["{nuit} de sommeil en moyenne. Même dormir, tu le fais mal.", "Ta nuit la plus courte : {courte}. Tu tiens à peine debout. Reste à terre."],
            "coeur": ["{fc} battements par minute au repos. Ton cœur a 70 ans. Il a compris avant toi que c'était fini.", "{fc} au repos. Ton cœur s'affole sans rien faire. Pathétique."],
            "vfc": ["Récupération : {vfc} ms. Un cœur de 70 ans. Tu n'iras nulle part avec ça."],
            "gras": ["{gras} % de masse grasse. Tu t'entraînes à quoi, à stocker ?", "{gras} % de masse grasse. Et tu oses te dire dresseur."],
            "hausse": ["+{hausse} point de masse grasse en deux semaines. Voilà enfin quelque chose qui grandit chez toi. Minable."],
            "muscu": ["Zéro pompe, zéro traction, zéro squat. Tes bras ne te servent à rien. Comme le reste."],
            "fort": ["{moy} pas de moyenne. Et alors ? Ça ne changera rien. Je te battrai.", "{moy} pas par jour. Tu crois que ça m'impressionne ?"],
        },
    },
}


def voix(image):
    """La voix du rival de cette image : la lettre de région de son nom (rival-k1-…, rival-j1-…)."""
    return VOIX[image.split("-")[1][0]]


def _duree(minutes):
    return f"{int(minutes // 60)} h {int(minutes % 60):02d}"


def _candidats(semaine, avant, sport_vu=True, gras_haut=None, gras=()):
    """[(à quel point c'est peu flatteur, clé, clé du texte, valeurs du texte)], à partir de la semaine écoulée."""
    n, nb = len(semaine), chiffres.nombre
    pas = [j["pas"] for j in semaine]
    moy, pire = sum(pas) / n, min(semaine, key=lambda j: j["pas"])
    jour = JOURS[dt.date.fromisoformat(pire["jour"]).weekday()]
    out = []
    if pire["pas"] < 5000:
        out.append((1 - pire["pas"] / 5000, "pire", "pire", {"Jour": jour.capitalize(), "jour": jour, "pas": nb(pire["pas"])}))
    if moy < 7000:
        out.append(((7000 - moy) / 7000, "moyenne", "moyenne", {"moy": nb(moy)}))
    if len(avant) >= 3:
        ancien = sum(j["pas"] for j in avant) / len(avant)
        if ancien and moy < ancien * .9:
            baisse = round((1 - moy / ancien) * 100)
            out.append((baisse / 40, "baisse", "baisse", {"baisse": baisse}))
    sport, sans = sum(j["zone"] for j in semaine), sum(not j["zone"] for j in semaine)
    if not sport_vu:
        pass
    elif sport == 0:
        out.append((.9, "sport", "sport0", {"n": n}))
    elif sport < 50:
        out.append((1 - sport / 50, "sport", "sport", {"sport": nb(sport), "sans": sans, "n": n}))
    nuits = [j["sommeil"] for j in semaine if j["sommeil"]]
    if len(nuits) >= 3 and sum(nuits) / len(nuits) < 420:
        m = sum(nuits) / len(nuits)
        out.append(((420 - m) / 120, "sommeil", "sommeil", {"nuit": _duree(m), "courte": _duree(min(nuits))}))
    repos = [j["fc_repos"] for j in semaine if j.get("fc_repos")]
    if len(repos) >= 3 and sum(repos) / len(repos) >= 70:
        fc = sum(repos) / len(repos)
        out.append((min((fc - 66) / 16, 1), "coeur", "coeur", {"fc": nb(fc)}))
    vfc = [j["vfc"] for j in semaine if j.get("vfc")]
    if len(vfc) >= 3 and sum(vfc) / len(vfc) <= 28:
        v = sum(vfc) / len(vfc)
        out.append((min((32 - v) / 16, 1), "vfc", "vfc", {"vfc": nb(v)}))
    if gras:
        recent = sum(gras[-3:]) / len(gras[-3:])
        txt = str(round(recent, 1)).replace(".", ",")
        if gras_haut and recent > gras_haut:
            out.append((min((recent - gras_haut) / 8 + .3, 1), "gras", "gras", {"gras": txt}))
        if len(gras) >= 3 and gras[-1] - gras[0] >= 1:
            hausse = str(round(gras[-1] - gras[0], 1)).replace(".", ",")
            out.append((min((gras[-1] - gras[0]) / 3 + .2, 1), "gras", "hausse", {"hausse": hausse}))
    if not sum(j["pompes"] + j["tractions"] + j["squats"] for j in semaine):
        out.append((.4, "muscu", "muscu", {}))
    if not out or max(c[0] for c in out) < .05:
        out.append((.05, "fort", "fort", {"moy": nb(moy)}))
    return out


def repliques(derniers, aujourd, image, sport_vu=True, gras_haut=None):
    """Ce que le rival dit pour cette rencontre : [accroche(s), 2 piques, vantardise, sortie], ou None s'il manque des jours pour se moquer."""
    jours = [j for j in derniers if j["jour"] < str(aujourd) and j["pas"] > 0]
    semaine, avant = jours[-7:], jours[-14:-7]
    if len(semaine) < 3:
        return None
    v = voix(image)
    rng = random.Random(f"{aujourd}#{image}")
    gras = [j["gras"] for j in jours[-14:] if j.get("gras")]
    pires, vus = [], set()
    for c in sorted(_candidats(semaine, avant, sport_vu, gras_haut, gras), key=lambda c: -c[0]):
        if c[1] not in vus and len(pires) < 2:
            vus.add(c[1])
            pires.append(c)
    lui = max(max(j["pas"] for j in semaine) * 1.1, 6000)
    accroche = v["accroches"][image]
    accroche = accroche if isinstance(accroche, list) else [accroche]
    return [*accroche, *[rng.choice(v["textes"][c[2]]).format(**c[3]) for c in pires], v["vante"].format(lui=chiffres.nombre(round(lui, -2))), rng.choice(v["sorties"])]


def pour_ecran(etat, aujourd, profil=None):
    """Les rencontres de la région en cours, avec leur texte, pour le téléphone."""
    r = regions.REGIONS[etat["region"]["index"]]
    dist = {l["nom"]: d for l, d in zip(r.lieux, r.dist)}
    rep = bilan.repere_gras((profil or {}).get("age"), (profil or {}).get("sexe"))
    return [{"image": image, "nom": voix(image)["nom"], "dist": dist[lieu], "lieu": lieu, "lignes": repliques(etat.get("derniers") or [], aujourd, image, etat.get("sport_vu", False), rep[1] if rep else None)} for lieu, image in r.rival.items()]
