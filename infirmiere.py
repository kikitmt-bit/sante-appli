"""Le récap du matin de l'Infirmière Joëlle (Kiki, 06/11) : moqueuse, taquine, passive-agressive, et au courant de ce qui se passe dans le vrai monde : dès qu'un jour va contre
le sport (GTA 6, le lendemain du Super Bowl, le 1er janvier), elle s'en sert. Coquine dans le ton, jamais au-delà : du sous-entendu de comptoir, rien de sexuel.
Comme pour le rival : jamais le poids ; une montre oubliée ne se reproche pas au joueur ; pas de vanne sur le sport si sa montre ne le mesure pas (sport_vu) ; pas de genre dans ses phrases (« Tu as », pas « tu es fatigué »).
Ni points ni règles ici : du texte, choisi d'après la date, pour que deux jours de suite ne se ressemblent pas. {nom} et {bonus} sont remplis par le téléphone.

SORTIES : les dates qui changent d'une année à l'autre, à tenir à jour (une sortie repoussée se corrige ici, et seulement ici)."""
import datetime as dt
import hashlib

from chiffres import hm, nombre

SORTIES = {
    dt.date(2026, 11, 18): "Demain, GTA 6. Tu as préparé tes excuses, ta manette et ton canapé. Moi, j'ai préparé ton dossier. Sors marcher aujourd'hui, parce que demain, je sais déjà.",
    dt.date(2026, 11, 19): "GTA 6 sort aujourd'hui. Treize ans que tu attends ça, et treize ans que tu remets le sport à plus tard. Ton personnage va courir des kilomètres. Toi, tu fais comment ?",
    dt.date(2026, 11, 20): "Alors, cette première nuit à Vice City ? Ça se voit d'ici. Ton personnage a fait plus de pas que toi cette semaine, et lui, il n'existe pas.",
}


def _dimanche(annee, mois, rang):
    """Le rang-ième dimanche du mois (-1 : le dernier)."""
    if rang < 0:
        suivant = dt.date(annee + mois // 12, mois % 12 + 1, 1)
        j = suivant - dt.timedelta(days=1)
        return j - dt.timedelta(days=(j.weekday() + 1) % 7)
    j = dt.date(annee, mois, 1)
    return j + dt.timedelta(days=(6 - j.weekday()) % 7 + 7 * (rang - 1))


def _jeudi(annee, mois, rang):
    j = dt.date(annee, mois, 1)
    return j + dt.timedelta(days=(3 - j.weekday()) % 7 + 7 * (rang - 1))


def paques(annee):
    """Le dimanche de Pâques (calcul grégorien)."""
    a, b, c = annee % 19, annee // 100, annee % 100
    d, e, f = b // 4, b % 4, (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    mois, jour = (h + l - 7 * m + 114) // 31, (h + l - 7 * m + 114) % 31 + 1
    return dt.date(annee, mois, jour)


FIXES = {
    (1, 1): "Bonne année. Tu sens encore le champagne depuis l'accueil. Ta bonne résolution, c'est moi qui l'ai prise pour toi : aujourd'hui, on marche. Doucement, je sais, ta tête.",
    (1, 6): "Galette des rois aujourd'hui. Une part, c'est environ 6 000 pas. Je dis ça, je ne dis rien. Si tu as la fève, ta couronne ne te dispense de rien.",
    (2, 2): "Chandeleur. Chaque crêpe se paie en pas, et j'ai ta montre. Fais-les sauter tant que tu veux, le seul qui ne saute pas, c'est toi.",
    (2, 14): "Joyeuse Saint-Valentin. Personne ne t'a écrit ? Moi, je pense à toi tous les matins. Enfin, à ton cœur au repos. Il faut bien que quelqu'un s'y intéresse.",
    (4, 1): "J'ai regardé tes chiffres : tu es en pleine forme, tu marches beaucoup, je suis impressionnée. Poisson d'avril.",
    (5, 1): "Fête du Travail. Tu ne travailles pas : tu n'as donc aucune excuse. Le muguet ne pousse pas sur ton canapé.",
    (6, 21): "Fête de la musique. Ce soir, tout le monde danse. Si ta montre ne voit rien bouger, je le saurai, et je le répéterai.",
    (7, 14): "14 Juillet. Des gens défilent au pas depuis ce matin, et eux, ils les font. Regarder le feu d'artifice assis, ça ne compte pas.",
    (8, 15): "15 août. Tout est fermé : plus de courses, plus de prétexte, rien à faire qu'aller marcher. Quelle malchance pour toi.",
    (9, 1): "C'est la rentrée. Les enfants reprennent le chemin de l'école à pied. Prends-en de la graine.",
    (10, 31): "Halloween ce soir. Avec ta tête de ce matin, tu peux économiser le déguisement. Les bonbons, en revanche, je les compte.",
    (11, 1): "Lendemain d'Halloween. Je ne demande pas combien de bonbons tu as volés aux enfants. Je demande juste combien de pas tu vas faire pour les rendre.",
    (11, 11): "Jour férié. Tu vas me dire que c'est un jour de repos. Ils ont défilé, eux. À pied.",
    (12, 24): "Réveillon ce soir. Je ne te demande pas d'être sage, je te demande d'avoir marché avant. Après, je ne réponds plus de rien.",
    (12, 25): "Joyeux Noël. La dinde n'a pas fait ses 5 000 pas, et regarde comment ça a fini pour elle. Je dis ça pour toi.",
    (12, 26): "Encore de la bûche au petit-déjeuner, je le vois d'ici. Le Père Noël a fait le tour du monde en une nuit. Toi, le tour du pâté de maisons, ce serait déjà ça.",
    (12, 31): "Ce soir, tu vas jurer de te mettre au sport. Je note. Je note tous les ans.",
}
LUNDI = ("Lundi. Je sais. Moi aussi. Mais moi, je suis debout depuis 5 h.", "Lundi matin, et ta semaine commence aussi fort que la précédente s'est finie. C'est-à-dire pas fort.", "Une nouvelle semaine toute propre. On va voir combien de temps elle le reste.")
VENDREDI = ("Vendredi. Ce n'est pas une autorisation.", "Vendredi : je sens que ta montre va passer une soirée très calme.", "C'est vendredi, tu as déjà la tête au canapé. Fais au moins le chemin à pied.")
NUIT_BONNE = ("{duree} de sommeil ? Je reprends ton pouls, ça ne te ressemble pas. Shiny <b>{bonus} fois</b> plus fréquents aujourd'hui. Essaie de ne pas tout gâcher.",
              "{duree} de sommeil. Je le note dans ton dossier, pour une fois qu'il y a une bonne nouvelle dedans. Shiny <b>{bonus} fois</b> plus fréquents aujourd'hui.",
              "{duree}, et tu as presque bonne mine. Presque. Allez, je branche tes Pokémon. Shiny <b>{bonus} fois</b> plus fréquents aujourd'hui.")
NUIT_COURTE = ("{duree} de sommeil. Tes cernes sont arrivées à l'accueil avant toi. Pas de bonus shiny aujourd'hui, mon chou.",
               "Seulement {duree} ? Je ne demande pas ce que tu faisais. Enfin si, mais tu ne me le diras pas. Pas de bonus shiny aujourd'hui.",
               "{duree}. Même mes Leveinard dorment plus, et ils sont de garde. Pas de bonus shiny aujourd'hui.",
               "{duree} de sommeil. Je ne dis rien. Je le dis à ton dossier. Pas de bonus shiny aujourd'hui.")
NUIT_INCONNUE = ("Ta nuit n'est pas arrivée. Ta montre a découché ? Je la comprends.", "Aucune nouvelle de ta nuit. Ta montre garde tes secrets, elle. Pas moi.")
HIER_RIEN = ("Hier, ta montre n'a rien envoyé. Tu l'as oubliée sur la table de nuit, ou elle a demandé le divorce ?", "Pas un chiffre pour hier. Ta montre a pris un jour de congé. Toi, je n'ose pas demander.")
HIER_EXPLOIT = ("Bon. Je n'ai rien à redire. Ça m'agace.", "Tu cherches à m'impressionner ? Continue, ça commence à marcher.", "Je vérifie que ce n'est pas la montre de quelqu'un d'autre.")
HIER_BIEN = ("Correct. N'attends pas que je m'emballe.", "Pas mal, pour quelqu'un qui part de si bas.", "C'est bien. Je le dis une fois, ne t'habitue pas.")
HIER_PEU = ("Tu as fait le tour de ton canapé, ou il y avait une deuxième pièce ?", "C'est ça, ta journée ? Mon chariot de soins fait plus de kilomètres.", "Je range ça dans ton dossier, rubrique « à ne montrer à personne ».", "Ton lit t'a manqué à ce point ?")


def _au_choix(jour, cle, liste, joueur=""):
    """Toujours la même phrase pour ce jour et ce joueur, jamais deux fois de suite la même."""
    decalage = int(hashlib.sha256(f"{cle}{joueur}".encode()).hexdigest(), 16) % len(liste)
    return liste[(jour.toordinal() + decalage) % len(liste)]


def evenement(jour):
    """La phrase du jour, s'il se passe quelque chose qui va contre le sport, ou None. Le plus marquant d'abord."""
    if jour in SORTIES:
        return SORTIES[jour]
    bowl = _dimanche(jour.year, 2, 2)  # le Super Bowl : le 2e dimanche de février
    if jour == bowl:
        return ("Super Bowl ce soir, et c'est aussi la Saint-Valentin. Bon courage pour expliquer ça à quelqu'un. Marche avant : cette nuit, tu ne bougeras que pour les ailes de poulet."
                if (jour.month, jour.day) == (2, 14) else "Super Bowl ce soir. Marche avant : cette nuit, tu ne bougeras que pour les ailes de poulet et les chips.")
    if jour == bowl + dt.timedelta(days=1):
        return "Lendemain de Super Bowl. Tu as veillé jusqu'à 4 h pour regarder d'autres gens courir. Les chips ne comptent pas comme un sport, je me suis renseignée."
    p = paques(jour.year)
    if jour == p:
        return "Joyeuses Pâques. Tu as cherché des œufs dans le jardin, c'est ton sport de l'année ? Chaque lapin en chocolat se paie en pas."
    if jour == p + dt.timedelta(days=1):
        return "Lundi de Pâques. Il reste du chocolat, je le sens d'ici. Lapin, ça court vite, normalement. Inspire-toi."
    if jour == _dimanche(jour.year, 3, -1):
        return "On t'a volé une heure de sommeil cette nuit. Tu vas en parler toute la journée, je le sais. Ce n'est pas une excuse."
    if jour == _dimanche(jour.year, 10, -1):
        return "Une heure de plus cette nuit, cadeau. Tu l'as passée à dormir, évidemment, pas à marcher."
    if jour == _jeudi(jour.year, 11, 3):
        return "Beaujolais nouveau ce soir. Goûter avec modération, marcher sans. Je vérifierai les deux."
    if jour == _jeudi(jour.year, 11, 4) + dt.timedelta(days=1):
        return "Black Friday. Tes nouvelles baskets soldées ne marcheront pas toutes seules, j'ai demandé."
    return FIXES.get((jour.month, jour.day))


def recap(jour, sommeil, hier, balls=0, sport_vu=False, joueur=""):
    """Le récap du matin : {"evenement", "nuit", "hier"} ({nom} et {bonus} : remplis par le téléphone)."""
    ev = evenement(jour)
    if not ev and jour.weekday() in (0, 4):
        ev = _au_choix(jour, "semaine", LUNDI if jour.weekday() == 0 else VENDREDI, joueur)
    if sommeil and sommeil >= 420:
        nuit = _au_choix(jour, "nuit+", NUIT_BONNE, joueur)
    elif sommeil:
        nuit = _au_choix(jour, "nuit-", NUIT_COURTE, joueur)
    else:
        nuit = _au_choix(jour, "nuit?", NUIT_INCONNUE, joueur)
    texte_hier = None
    if hier:
        pas, zone = hier.get("pas") or 0, hier.get("zone") or 0
        if not pas and not balls:
            texte_hier = _au_choix(jour, "rien", HIER_RIEN, joueur)
        else:
            faits = [f"<b>{nombre(pas)} pas</b>"] + ([f"{zone} min de sport"] if sport_vu and zone else []) + ([f"{balls} Pokémon attrapé{'s' if balls > 1 else ''}"] if balls else [])
            liste = HIER_EXPLOIT if hier.get("hyper") else HIER_BIEN if pas >= 5000 or zone >= 10 else HIER_PEU
            texte_hier = f"Hier : {', '.join(faits)}. {_au_choix(jour, 'hier', liste, joueur)}"
    return {"evenement": ev, "nuit": nuit.replace("{duree}", hm(sommeil) if sommeil else ""), "hier": texte_hier}
