# Pokémon Sport — feuille de route (décidée avec Kiki le 01/11/2026)

Rien de tout ça n'est construit : ce sont les idées validées, à faire dans l'ordre qu'on choisira.

## Durée

- 9 000 points d'effort par région (comme Kanto) : ~3 mois en jouant normalement, ~2 mois à fond.
- 9 régions = **~2 ans** d'aventure (voulu par Kiki : « un truc vraiment peaufiné »).
- Contre la lassitude : **9 petits jeux qui se suivent**, chacun avec sa nouveauté (plus bas).

## Raretés et captures

- Toujours **une seule déclinaison : le shiny** (refusé : finitions façon cartes TCG, holo, full art…, « trop copier le
  système de cartes »).
- Toujours **jamais de doublon**.
- Raretés actuelles : communs, rares ⭐ (`kanto.RARES`, ÷ 3), légendaires (Master Balls seulement), shiny par-dessus.
- **Ratés** : une ball peut rater (« Oh non ! Le Pokémon s'est libéré ! », la ball éclate). Au départ 1 fois sur 10 avec
  une Poké Ball, moins avec les meilleures balls, jamais avec une Master Ball ; les rares et légendaires sont plus durs.
  Le Pokémon raté n'est pas perdu (il reste dans les tirages).
- **Rare venu d'ailleurs** : petite chance qu'un rare ⭐ pas encore attrapé sorte hors de son lieu (stat Flair).

## Stats du dresseur

- **Chaque badge = +1 case dans la stat de son choix** (choix du joueur : des styles différents entre amis, personne
  plus fort que l'autre).
- 4 stats × 18 cases = 72 = les 72 badges des 9 régions : tout au maximum à la fin = **Maître Pokémon**.
- Gains forts au début, plus petits ensuite (le 1er badge doit se sentir, sans être surpuissant après 3 badges).

| Stat | Effet | Départ | Au maximum |
|---|---|---|---|
| 🎯 Lancer | ratés moins fréquents | 1 sur 10 | 1 sur 100 |
| ✨ Chance | shiny | 1 sur 33 | 1 sur 10 |
| 🔍 Flair | rare venu d'ailleurs | 1 sur 50 | 1 sur 8 |
| 🧲 Affinité | Pokémon du type du sport du jour | ×3 | ×8 |

(Refusé : « Pistage », retrouver les Pokémon enfuis.)

- **Affichage en coches, jamais en pourcentage** (choix de Kiki : plus gratifiant) : barre de 18 cases par stat sur la
  Carte Dresseur, style pixel Rouge Feu ; un **rang** toutes les 6 cases (Débutant → Confirmé → Expert → Maître).
  Après la scène du badge : « Kiki se sent plus habile ! » / « LANCER augmente ! », la case s'allume avec un son, puis
  on choisit la stat. « Comment ça marche ? » dit ce que fait chaque stat, sans chiffre.
- **Chaque Ligue = un talent permanent, pas un chiffre**. Kanto : **Seconde chance** (une fois par semaine, une ball
  qui rate se relance toute seule). Les autres talents s'inventent en arrivant dans chaque région.

## Une nouveauté par région

| Région | Nouveauté | Lien avec le sport |
|---|---|---|
| Kanto | la base : voyage, arènes, shiny | — |
| Johto | jour et nuit : Pokémon du matin / du soir selon l'heure où on a bougé | varier les moments |
| Hoenn | vraie météo (Open-Meteo) : pluie = Eau, soleil = Feu | sortir sous la pluie |
| Sinnoh | fossiles déterrés avec les séances de force (tractions, pompes, rameur) | la muscu |
| Unys | saisons réelles : la région change chaque mois | l'été : paddle, kayak |
| Kalos | safari photo : approcher des Pokémon en marchant longtemps sans s'arrêter | l'endurance |
| Alola | épreuves à la place des arènes (nuit complète, sport nouveau…) | casser la routine |
| Galar | raids entre amis : un Pokémon géant à battre ensemble en une semaine | le coopératif |
| Paldea | monde ouvert : choisir sa route parmi plusieurs chemins | la liberté |

Chaque nouveauté se construit en arrivant dans la région. Entre deux : thème du mois (octobre Spectre, décembre Glace,
été Eau), week-ends spéciaux, objectifs qui suivent la forme de chacun. Après-jeu : retour à Kanto après Johto
(champions plus durs, comme Or / Argent), Pokédex shiny.

## Jouer avec les amis

- **Comptes** : adresses Gmail dans `COMPTES` (connexion Google déjà en place), un joueur par adresse.
- **Données santé** : comme le padel (`padel_resa`) : bouton « Relier ma montre », Google Health API par OAuth (Fitbit,
  Pixel Watch ; Samsung, Garmin, Xiaomi par Health Connect sur Android). **iPhone / Apple Watch impossible.** Jetons
  dans les réglages privés du script Google ; données par joueur dans le dépôt privé (`data/joueurs/<pseudo>/`).
- **Visible par les amis** : nombre de Pokémon et de shiny, Pokédex comparé, ville, badges, stats du dresseur,
  dernières captures, avatar sur la carte quand on est dans la même région, fil « Max a capturé Ronflex ✨ ».
  **Jamais visible** : pas, sommeil, poids, cardio. Texte clair pour les amis + bouton « supprimer mes données ».
- **Cadeau du lundi** : pas seulement au premier (toujours le même) : Poké Ball pour tous ceux qui ont tenu leur
  semaine + petit plus pour la plus belle prise de la semaine (la chance décide, pas les pas). Plus tard : défis de
  groupe.
- **Équilibrage, deux étages** :
  - commun (fait avancer, comparé entre amis) : pas, minutes en zone, séances, que toutes les montres mesurent ;
    objectifs calés sur chacun (sa moyenne des dernières semaines, comme un handicap au golf) ; plafond de balls par jour ;
  - perso : « Mon matériel » dans Mon dresseur (rameur, barre de traction, vélo, balance, paddle…), les missions du jour
    sont tirées dans ce qu'on a ; une « habitude » au choix (pesée, coucher, étirements…), même valeur pour tous.
- Tout ce qui est écrit pour Kiki seul (coach, missions, calcul de la montre) devra tourner pour chaque joueur : c'est le
  plus gros du travail.
- Commencer avec 2-3 amis sur Android quelques semaines avant d'en inviter d'autres.
