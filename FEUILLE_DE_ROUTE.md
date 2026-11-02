# Pokémon Sport — feuille de route (décidée avec Kiki le 01/11/2026)

Rien de tout ça n'est construit : ce sont les idées validées, à faire dans l'ordre qu'on choisira.

## Durée

- 7 000 points d'effort par région (comme Kanto, audit du 02/11) : ~3 à 5 mois en jouant normalement, ~2 mois à fond,
  arrêts aux arènes compris.
- 9 régions = **~2 ans** d'aventure (voulu par Kiki : « un truc vraiment peaufiné »).
- Contre la lassitude : **9 petits jeux qui se suivent**, chacun avec sa nouveauté (plus bas).

## Raretés et captures

- Toujours **une seule déclinaison : le shiny** (refusé : finitions façon cartes TCG, holo, full art…, « trop copier le
  système de cartes »).
- Toujours **jamais de doublon**.
- Raretés actuelles : communs, rares ⭐ (`kanto.RARES`, ÷ 3), légendaires (sanctuaires, Ligue, diplôme, toute petite chance
  par ball), shiny par-dessus. Shiny Ball = un shiny garanti (construit le 02/11).
- **Ratés** : une ball peut rater (« Oh non ! Le Pokémon s'est libéré ! », la ball éclate). Au départ 1 fois sur 10 avec
  une Poké Ball, moins avec les meilleures balls, jamais avec une Master Ball ; les rares et légendaires sont plus durs.
  Le Pokémon raté n'est pas perdu (il reste dans les tirages).
- **Rare un peu plus fréquent** (stat Flair) : plus de chances d'un rare ⭐ **des lieux déjà atteints** (jamais d'un lieu à
  venir, règle du 02/11).

## Légendaires des régions suivantes

Chaque région : ~5 grands légendaires (sanctuaires sur la carte, trophée de la Ligue, diplôme du Pokédex complet) ; les
autres légendaires (Ultra-Chimères d'Alola…) = rares ⭐ à un endroit précis. Liés à la carte, jamais au calendrier : sinon le
retard s'accumule (38 Master Balls au plus en 2 ans pour 100 légendaires ou plus). À chaque région : sac vide, barre à 0.

## Stats du dresseur

- **Chaque badge = +1 case dans la stat de son choix** (choix du joueur : des styles différents entre amis, personne
  plus fort que l'autre).
- 4 stats × 18 cases = 72 = les 72 badges des 9 régions : tout au maximum à la fin = **Maître Pokémon**.
- Gains forts au début, plus petits ensuite (le 1er badge doit se sentir, sans être surpuissant après 3 badges).

| Stat | Effet | Départ | Au maximum |
|---|---|---|---|
| 🎯 Lancer | ratés moins fréquents | 1 sur 10 | 1 sur 100 |
| ✨ Chance | shiny | 1 sur 33 | 1 sur 10 |
| 🔍 Flair | rares ⭐ des lieux atteints plus fréquents | ÷ 3 | ÷ 1,5 |
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
  dans les réglages privés du script Google ; données par joueur dans le dépôt privé (`data/joueurs/<id>/`).
  **Construit le 02/11** (comptes, liaison, récolte, partie à part, suppression) : voir CLAUDE.md ; le reste de cette
  rubrique reste à faire.
- **Visible par les amis** : nombre de Pokémon et de shiny, Pokédex comparé, ville, badges, stats du dresseur,
  dernières captures, avatar sur la carte quand on est dans la même région, fil « Max a capturé Ronflex ✨ ».
  **1re version le 02/11** (carte, classement, Pokédex comparé : voir CLAUDE.md) ; reste le fil et les stats du dresseur.
  **Jamais visible** : pas, sommeil, poids, cardio. Texte clair pour les amis + bouton « supprimer mes données ».
- **Cadeau du lundi** : pas seulement au premier (toujours le même) : Poké Ball pour tous ceux qui ont tenu leur
  semaine + petit plus pour la plus belle prise de la semaine (la chance décide, pas les pas). Plus tard : défis de
  groupe.
- **Équilibrage, deux étages** :
  - commun (fait avancer, comparé entre amis) : pas, minutes en zone, séances, que toutes les montres mesurent ;
    objectifs calés sur chacun (sa moyenne des dernières semaines, comme un handicap au golf) ; plafond de balls par jour ;
  - perso : « Mon matériel » dans Mon dresseur (rameur, barre de traction, vélo, balance, paddle…), les missions du jour
    sont tirées dans ce qu'on a ; une « habitude » au choix (pesée, coucher, étirements…), même valeur pour tous.
- Missions et captures figées tournent déjà pour chaque joueur (02/11). Restent pour Kiki seul : le coach et la montre.
- Commencer avec 2-3 amis sur Android quelques semaines avant d'en inviter d'autres.
