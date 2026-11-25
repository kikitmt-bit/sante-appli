# « La Rivière » : mode d'emploi du moteur

Pour quiconque (Kiki, Claude Fable, Claude Opus) ajoute un circuit, un décor, un objet ou une ambiance.
**La règle : on ajoute des fichiers dans `contenu/`, on ne retouche pas `moteur/`.** Si quelque chose est impossible sans toucher au
moteur, c'est une demande à faire à part, pas un contournement.

## Le rangement

```
riviere/
  page.py        assemble tout en UNE page (seances_rameur.page_tablette → ?ecran=rameur&riviere=<niveau>)
  serveur.py     l'essai sur le PC : python riviere/serveur.py (.claude/launch.json : « riviere »), ?niveau=<nom>
  controle.js    le contrôle sans dessin (lancé par tests/test_riviere.py avec node ; dans un navigateur : ?pur=1)
  moteur/        LE CŒUR. Ne connaît ni Pokémon, ni montre, ni séance. L'ordre des fichiers est dans page.py (MOTEUR).
  jeu/           la séance, le menu, les chiffres, le fantôme, le plan, la montre, le banc. Ordre : page.py (JEU).
  contenu/
    niveaux/     un circuit = un fichier .json
    biomes/      une région = un fichier .json (couleurs, sols, rives, palette des objets, règles de décor)
    lieux/       les lieux d'une région, décrits une fois (un village = une liste d'objets)
    objets/      les recettes d'objets : tous les .js du dossier sont ramassés (Object.assign(OBJETS, {…}))
    lointains/   les grands repères au loin (volcan, pics, île) : LOINTAINS.<nom> = (F, o, R, K) => …
    surfaces/, montures/, evenements/   mêmes principes (dossiers à créer au besoin : page.py ramasse leurs .js)
```

**La page porte tous les circuits, toutes les régions et tous les lieux** (`NIVEAUX`, `BIOMES`, `LIEUX_TOUS`) : on change de circuit au menu
sans rien redemander à l'appli. `moteur/depart.js` choisit le circuit joué : un brouillon de l'éditeur, sinon le choix du menu (gardé sur la
machine, `riviere_niveau`), sinon celui que l'appli a servi. Si l'adresse nomme un circuit (`&riviere=<nom>`, `?niveau=`), c'est lui.

> **(24/11, Kiki) Les circuits cités plus bas (`kanto-1km`, `vitrine`, `ville-hauts`, `footing-jadielle`…) n'existent plus** : il reste `vichy-lac` (rameur, par défaut) et le circuit en cours d'essai. Plus aucune
> contrainte « identique à `kanto-1km` ». `tests/circuits/` : quelques circuits figés, pour les tests du moteur seulement.

## Le moteur en une phrase

On ne dirige jamais : tout le monde se déduit d'**une ligne**, la piste, et la position du joueur est un seul nombre, `s`, ses
mètres le long de cette ligne. (Une fourche ajoute une deuxième voie entre deux mètres de cette ligne, de la même longueur : `s` reste
un seul nombre. Voir « Une fourche ».)

| Fichier | Ce qu'il fait | Dessine ? |
|---|---|---|
| `outils.js` | petites fonctions, les options de l'adresse (`PARAMS`) | non |
| `zone.js`, `zone_plan.js` | une ville libre (étape 13) : ses voies, la hauteur de son sol, ce qu'on y pose ; voir « Une ville libre » | non |
| `piste.js` | les pièces du niveau → une ligne en 3D, mètre par mètre (`PISTE`, `at`, `pose`, `pres`, `verifier`) | non |
| `champ.js` | la hauteur et la couleur du sol en tout point, par **vote** des points de piste (`hauteur`, `hSol`, `couleurSol`) | non |
| `forme.js` | les volumes simples (boîte, toit, boule…) dont sont faits les objets | non |
| `decor.js` | pose les lieux puis les règles de la région (`poserDecor`) ; les registres `OBJETS`, `RAYON`, `EVENEMENTS` | pose : non |
| `rendu.js` | la petite image nette agrandie, le contour, le ciel, la brume, les réglages partagés (`COMMUNS`) | oui |
| `effets.js` | les effets du rendu (étape 9 du plan) : le vent dans les feuillages, les ombres portées ; voir « Les effets du rendu » | oui |
| `terrain.js` | les maillages du sol : la grille, et le ruban précis des rives | oui |
| `surfaces.js` | le ruban de la piste (eau, terre, goudron : `SURFACES`), la mer, les ponts | oui |
| `tunnel.js` | les voûtes et les façades des grottes | oui |
| `sprites.js` | les Pokémon et les habitants (sprites), les éclaboussures | oui |
| `monture.js` | ton Pokémon : nage ou course selon la surface, corde dans les virages, sur la terre une vraie trajectoire de cycliste (`ligneRoute`), vrais sauts (`MONTURES`) | oui |
| `camera.js` | suit la pente, se penche dans les virages, accompagne les sauts | oui |
| `depart.js` | quel circuit, quelle région (héritage `"herite"`), les réglages gardés sur la machine, `relancer()` | non |
| `ambiance.js` | l'heure, le temps qu'il fait, l'air du lieu, les particules, la pluie, les halos des lumières | oui |
| `son.js` | très doux (Kiki, 11/11) : un petit bruit à chaque coup, et les cascades (pièces `net` de 2 m au moins) qui s'entendent selon la distance, en fondu lent ; rien dans un tunnel, jamais d'écho | — |

Les cinq premiers ne touchent jamais à three.js : c'est ce qui permet de les contrôler sans navigateur.

## Écrire un circuit

Un fichier `contenu/niveaux/<nom>.json`. Modèle complet et commenté : `essai.json` (le Huit).

```json
{"id": "mon-circuit", "nom": "Mon circuit", "biome": "kanto", "boucle": "gauche", "allure": 1, "elan": 60, "graine": 5,
 "pieces": [
  {"nom": "Départ", "long": 100, "virage": 0, "eau": 12, "g": "pre", "d": "pre", "objets": [{"o": "ligne", "cote": "c", "a": 0}]},
  {"nom": "Épingle", "long": 44, "virage": 180, "eau": 8, "g": "foret", "d": "pre", "monte": 2},
  {"nom": "Retour", "raccord": true, "rayon": 30, "eau": 12, "g": "pre", "d": "pre", "monte": "auto"}
 ]}
```

Une pièce : `long` (mètres de décor), `virage` (degrés, + = à droite), `eau` ou `large` (largeur), `g` et `d` (la sorte de rive de
chaque côté, définie dans la région). Et, au choix :

| Réglage | Effet |
|---|---|
| `monte` | mètres gagnés sur la pièce (négatif : descente). `"auto"` : ce qui manque pour revenir à la hauteur du départ |
| `net` | pente non adoucie : une chute, un tremplin, une cascade. Sans lui, les pentes sont arrondies |
| `surface` | `"eau"` (par défaut), `"terre"`, `"goudron"`. On peut changer en cours de circuit ; `"surface"` à la racine du niveau : pour tout le circuit |
| `pont` | la piste est en l'air : le sol ne la suit pas, un tablier et des piles sont construits, on peut passer dessous |
| `tunnel` | une montagne passe au-dessus (40 m de long au moins, rives « montagne ») |
| `allure` | le décor défile plus ou moins vite ici (1,3 : des rapides). S'ajoute à l'effet automatique de la pente |
| `camera` | `{"haut": 0.8, "recul": 1}` : caméra plus haute, plus loin |
| `lieux`, `objets` | un lieu de la région, des objets posés exactement (`a` : mètres depuis le début de la pièce ; `e` : depuis le bord ; `cote` : g, d, c = sur la piste, portail) ; `"surface": "eau"` sur un objet : il n'existe que sur l'eau |

**Refermer une boucle** : la dernière pièce est `{"raccord": true}`. Le moteur calcule le chemin (virage, ligne droite, virage, de
rayon `rayon`) qui ramène au départ ; aucune autre pièce n'est déformée. (L'ancienne façon, une pièce au virage `"auto"`, marche toujours.)

**Une fourche** (15/11, étape 7 du plan) : la piste se sépare en deux voies qui se rejoignent ; on prend la voie « force » en forçant plus
que sa croisière, sinon la voie calme. Dans la liste des pièces :

```json
{"fourche": "L'île aux rapides", "annonce": "LES RAPIDES", "effort": {"seuil": 1.08, "duree": 5},
 "calme": [{"long": 30, "virage": -35, "eau": 9, "g": "foret", "d": "pre"}, {"long": 30, "virage": 35, …}, {"long": 50, "virage": 0, …}, {"long": 30, "virage": 35, …}, {"long": 30, "virage": -35, …}],
 "force": [{"long": 30, "virage": 35, …}, {"long": 30, "virage": -35, …}, {"long": 50, "virage": 0, "allure": 1.3, …}, {"long": 30, "virage": -35, …}, {"long": 30, "virage": 35, …}]}
```

- **La voie calme fait partie de la ligne**, comme si ses pièces étaient écrites à la suite : sans fourche prise, le circuit est exactement
  celui-là (adversaires, plan, profil, segments, note). **La voie « force »** est une deuxième suite de pièces entre les deux mêmes points.
- **Elle a exactement autant de mètres que la calme** : ses longueurs sont ajustées par le moteur, le moins possible (`resoudreVoie`), pour
  qu'elle arrive au bon endroit. Le plus simple : **les mêmes longueurs que la calme et les virages inverses** (un S d'un côté, son miroir de
  l'autre). Les deux voies tournent d'autant au total (ou une pièce de la voie « force » au virage `"auto"`), et finissent à la même hauteur
  (ou une pièce au `monte: "auto"`). Exemple : la calme descend doucement de 3 m, la voie « force » les perd d'un coup à sa chute.
- **Les deux voies comptent exactement les mêmes vrais mètres** : l'allure du décor de la voie « force » est réglée pour ça (`voies[].allure`,
  entre 0,72 et 1,4, sinon le contrôleur refuse). Un seul record par circuit, et il reste juste ; un segment chronométré vaut pour les deux.
- **Tant que les deux voies se touchent** (une trentaine de mètres après la séparation et avant la jonction : `gA`, `gB`), la voie « force »
  prend la hauteur, la largeur, les rives, l'eau et le revêtement de la calme : les deux rubans sont dans le même plan, sans écume ni marque
  du côté de l'autre voie, et la pointe de l'île sort de l'eau peu à peu. Donc : **ni pente propre, ni grotte, ni pont, ni chute dans ces
  mètres-là** (refusé avec une phrase), et les deux premières et dernières pièces de la calme gardent les rives de la pièce d'avant et d'après.
- Tout le reste est permis dans une voie : rives, surface (un chemin de terre à côté de la route), `allure`, tremplin et chute (`net`), grotte,
  pont, `lieux`, `objets`, `ambiance`. Pas de fourche dans une fourche, pas de raccord, pas de ligne de départ ; une pièce avant, une après.
  Ronflex dans une voie : il y dort, mais ne se réveille que si l'on est sur sa voie.
- **Dans le code** : les mètres de la voie « force » sont rangés à la suite de ceux de la ligne dans tous les tableaux de `PISTE` (indices
  `N`… `M-1`, `PISTE.voies[f].dec + s`). `idx(s)` et `at(s)` suivent **la voie prise** (`VOIES.prise[f]`, celle du joueur) ; pour un autre
  (fantôme, adversaire) ou pour construire : `surVoie(choix, f)`, `surLaVoie(f, …)`. `sLigne(i)` rend le `s` d'un indice (`pres()` peut
  rendre un indice de voie dans `Q.i`). `PISTE.voisin(i, j)` : le mètre à `j` mètres d'un indice, le long de sa voie. `PISTE.VO` (0 hors
  fourche, 2f+1 la calme, 2f+2 la voie « force »), `PISTE.INT` (le côté de l'autre voie), `PISTE.GARDE`. Les rubans (rives, eau, ponts,
  grottes) et le décor sont construits pour la ligne, puis pour chaque voie entre les mêmes `s`. Un objet, un sprite, un événement
  (`tronc`…) connaissent leur voie (`_v`, `vo`).
- **Un circuit sans fourche n'en porte aucune trace** : mêmes tableaux, même décor, même image, même empreinte (contrôlé le 15/11 sur les
  six circuits : signature chiffrée de la piste, du sol et du décor, et maillages construits identiques au bit près).
- Exemple : `contenu/niveaux/fourche.json` (« L'île aux rapides »). Le jeu : `jeu/fourches.js`, voir « Le jeu ».

**Les règles de dessin**, vérifiées par le contrôleur :
- rayon d'un virage > demi-largeur de la piste + 1,5 m (les rives se rétrécissent toutes seules à l'intérieur d'une épingle) ;
- pente adoucie de 30 % au plus ; au-delà, c'est une chute : `net` ;
- la piste ne se croise que si le passage du haut est un `pont` (ou celui du bas un `tunnel`), avec 4,5 m d'écart au moins ;
- la somme des `monte` d'une boucle vaut zéro (ou une pièce `"auto"`).

**Les vrais chiffres ne trichent jamais.** `long` compte des mètres de décor. Le décor défile `allure` fois plus vite que le joueur
n'avance : allure du niveau × allure de la pièce × effet de la pente (ça file en descente, ça peine en côte) × allure de la machine.
La distance, le temps, la cadence et l'allure affichés sont ceux de la machine ; un tour fait toujours le même nombre de vrais mètres.

**Nouveau (12/11)** :

| Réglage | Effet |
|---|---|
| `tunnel` | `true` (roche) ou le nom d'une grotte de la région : `"cristal"`, `"calcaire"`, `"terre"` (galerie de mine), `"glace"`. Deux familles (12/11) : un **tunnel** (roche, mine) est un ouvrage maçonné ; une **caverne** (parois brutes : calcaire, cristal, glace) s'ouvre derrière son entrée en grandes salles (gabarit `CAV` de champ.js, `ampleur` dans la fiche de la grotte), parois à facettes, rives de roche, colonnes |
| `pont` | `true` (pierre), `"bois"`, `"arches"` (grandes arches dorées, lampes) ; avec `"ravin": 10` le sol se creuse dessous et une rivière coule au fond |
| `surface` | aussi les autres eaux de la région : `"marais"`, `"source"` (elle luit), `"lagon"`, `"abysse"`. Les couleurs se fondent d'une eau à l'autre sur ~100 m (`couleursEau`, une seule matière d'eau pour toute la piste) : jamais de trait |
| rive `lac` | (12/11) l'eau s'étend jusqu'à ~45 m de chaque côté (la rive passe sous l'eau, l'eau du large la remplace, mêmes couleurs : `couleursEau`), puis une plage, des roseaux, des arbres ; on y fait un vrai tour (rayon ≥ demi-largeur + 1,5 m, comme partout). Objet `ilot` (`"cote": "c"`, `"e"` : sa distance au milieu, `"r"` : sa taille) ; arbres et Pokémon dessus avec `"haut": 0.9` |
| `pont` au-dessus de la piste | (12/11) le moteur l'allonge tout seul pour que ses culées restent à W + 9 m de l'eau qu'il enjambe |
| saut utile | une impasse : tremplin court `net` (+0,6 m) puis chute `net` (−5,5 m sur 3 m) ; l'objet `barrage` (`"cote": "c"` à la crête, `"chute"`) dessine les tours, la passerelle des vannes et les bajoyers. Exemple : vitrine, « Le barrage » |
| `ambiance` | l'air du lieu : `"sous-bois"`, `"marais"`, `"plage"`, `"volcan"`, `"sommet"` (teinte, brume, particules) |
| `segment` | un nom : ce bout est chronométré à part, avec son record (plusieurs pièces qui se suivent, même nom = un segment) |

À la racine du niveau : `"heure"` (`jour`, `aube`, `matin`, `soir`, `crepuscule`, `nuit`, un nombre, `reelle`, `cycle` + `heure_depart` + `jour_min`),
`"meteo"` (`beau`, `nuages`, `pluie`, `orage`, `brume`, `neige`, `vent`, `variable`), `"lointain": [{"o": "volcan", "cap": 20, "taille": .6}]`
(cap en degrés, 0 = droit devant au départ). Le menu peut imposer l'heure et le temps (gardés sur la machine). Sur un objet : `"flotte": true`
(sur l'eau contre la rive : bateau, ponton ; `e` négatif), `"bouge"` pour un Pokémon (`vol`, `ronde`, `nage`, `saut` : sprites.js).
Modèle complet : `contenu/niveaux/vitrine.json` (la Baie de Carmin).

## Deux activités, deux sortes de circuits : l'eau et la terre (12/11)

Kiki : un circuit de vélo n'est pas « la rivière sans l'eau ». Chaque circuit est de l'une ou de l'autre :
- **eau** (par défaut) : le rameur, sur une rivière ; région `kanto`, rives au-dessus de l'eau, eaux de couleur, roseaux, Pokémon d'eau, la mer au loin.
- **terre** (`"discipline": "terre"`, ou une surface `terre` / `goudron` / `paves`) : vélo et elliptique ; région `kanto-routes` (elle hérite des couleurs de Kanto) : la route est **posée sur le sol** (rives à 3 cm au-dessus d'elle), aucune mer (`ILE` faux : des collines au loin), aucune règle d'eau. Rives : `bas_cote`, `champ`, `sous_bois`, `trottoir` (rue, maisons, réverbères), `talus` (la montagne qui monte), `ravin` (le vide sous la route, glissières), `cendres` ; plus `montagne` pour un tunnel. Revêtements : `terre`, `goudron`, `paves`.

La machine choisie au menu dit l'activité (rameur → eau ; vélo, elliptique → terre) : le menu ne propose que les circuits de cette activité, et chaque activité garde son circuit (`riviere_niveau_eau` / `riviere_niveau_terre`). Un circuit d'eau ne se change jamais en chemin (l'ancien `riviere_surface` et `?surface=` ne servent plus).

Possibilités propres à la terre :
- **un 8** (`"boucle": "huit"`) : la dernière pièce au virage `"auto"` annule les virages des autres ; la piste se croise **à niveau** (un carrefour : `CROIX` dans piste.js, aucun marquage dans le carrefour, le passage du dessus dessiné par-dessus, pas de rive ni de décor sur l'autre route). Le contrôleur accepte un croisement à la même hauteur (moins de 0,8 m d'écart) s'il est franc (plus de 25°) ; sinon un pont 4,5 m plus haut. **(17/11, Kiki)** Le carrefour doit aussi rester à plat (moins de 40 cm d'écart) sur toute la zone où les deux routes se recouvrent, et deux passages qui se recouvrent sans se croiser franchement sont refusés (`verifier`, « se recouvrent ») : le circuit du jour du 16/11 avait une grande descente posée en biais sur la montée du début, 1 à 2 m plus haut, avec des trous. Le générateur tire alors un autre circuit.
- **une montagne au milieu d'une boucle** (`"massif": {"haut": 190, "rayon": 0.82, "cratere": true}`) : un volcan dont on fait le tour, cendre en haut, herbe au pied, un cratère qui rougeoie et fume (`MASSIF` dans champ.js, `construireMassif` dans terrain.js).
- des pentes jusqu'à 10 % (le générateur en met jusqu'à 250 m de montée).

**Le vélo** (`moteur/velo.js`, la monture `cycliste`, demandée par la machine vélo : `monture` dans `MACHINES`) : un vrai vélo en volumes (cadre rouge, roues à cinq bâtons et jante claire, garde-boue avant et arrière, feu arrière, carter de chaîne blanc, pédalier, guidon qui braque, phare allumé la nuit, panier plein en lattes blanches ; **refait le 14/11**, Kiki : « les pneus rentrent dans le cadre, c'est un peu fouillis » : plus rien ne se traverse (la tête de fourche au-dessus du pneu avant, fourche et haubans de chaque côté du pneu : `LARGE`, `PNEU`), plus de fines pièces qui scintillent (rayons, chaîne, panier ajouré) ; ce que cycliste.js attend n'a pas bougé : pédalier en (-.02, .3), selle, poignées, fond du panier, pivot de l'avant en x = .43) et, depuis le 12/11 au soir, **ton dresseur dessus** (voir plus bas), ton Pokémon dans le panier. Roues et pédales selon la vitesse, petit braquet dans les côtes, roue libre en descente rapide (il se ramasse), danseuse au-dessus de 5,5 % (le vélo bascule à chaque coup de pédale), inclinaison réelle dans les virages (vitesse et courbe), cabrage au saut et amorti à la réception, vibrations sur les pavés, penché à l'arrêt. Au sol : ombre tramée (`OMBRE_U`), trace du pneu et poussière sur un chemin. À vélo, la caméra se met de trois-quarts arrière (1,05 m à droite, un peu plus haute, plus près qu'à la nage). Sans capteur de cadence, la cadence affichée est celle des pédales. L'elliptique garde le Pokémon qui court (ou le cycliste, au choix du menu).

**Le cycliste** (`moteur/cycliste.js`, 12/11, Kiki : « un Pokémon sur un vélo, ça ne va pas ; un vrai effet waouh ») : ton dresseur en volumes, dans le style du monde (couleurs unies, lumière en paliers, contour), proportions de jeu Pokémon (grosse tête, casquette blanche devant frappée d'une Poké Ball, veste à col blanc, sac à dos jaune à Poké Ball et sac de couchage roulé, pantalon à revers, baskets à semelle blanche, gants). **Aux couleurs de ta carte du dresseur** (`D.dresseur` = peau, casquette, veste, pantalon, donnés par l'appli ; mêmes palettes que `pokemon_ui.html`, `TENUES` ; le sac devient bleu si la veste est jaune ou orange ; `?tenue=Mate,Bleu,Vert,Noir` pour essayer). 18 volumes, ~4 400 triangles avec le vélo. **Articulé** : chaque membre est un volume rigide (`membre`), posé à chaque image par cinématique inverse à deux os (`deuxOs`) dans le repère du vélo : pieds sur les pédales (la cheville joue), mains aux poignées (qui braquent), bassin qui roule à chaque coup. Il vit : danseuse dans les côtes (debout, au-dessus du guidon, contre la bascule du vélo), ramassé en descente rapide (pédales mises à plat par velo.js), regard dans le virage et tête plus droite que le vélo, soulevé au saut et amorti à la réception, sac qui tressaute (un ressort) ; **à l'arrêt** il glisse de la selle, pose le pied droit à terre (le vélo penche à droite, la pédale gauche remonte prête à repartir) et regarde tour à tour son Pokémon et la caméra. **Ton Pokémon dans le panier** (`animerPanier`, le sprite du nageur à 40 cm) : il regarde la route, se retourne vers toi de temps en temps et à l'arrêt, saute de joie à fond de train et à chaque tour. **La vitrine** (`VITRINE` dans camera.js) : au menu, la caméra tourne lentement autour de vous deux (de trois-quarts face à profil ; sur une tablette, plus loin et à gauche du panneau) ; au départ, elle glisse derrière lui en 2 à 3 s, en tournant autour. `?vitrine=1` la garde pendant la course (pour regarder le cycliste de près). **Le fantôme à vélo** (`copierCycliste`) : une copie translucide du vélo et du cycliste, qui reprend ta pose, son Pokémon dans son panier. Refusés avant : le Pokémon assis sur la selle (Kiki).

**Le dresseur à facettes, avec sa garde-robe** (`moteur/cycliste.js`, 14/11, Kiki : « on arrête le style pixel, le même style low poly que le vélo ; un personnage évolutif, auquel on pourra changer les vêtements, les accessoires » ; prime sur ce qui est dit plus haut de la casquette, du sac et de la tenue) : le rendu en pixels (`pixel.js`, le menu « En pixels / En volumes », `riviere_dresseur_rendu`, `?dresseur=`) est **retiré**. Le dresseur est fait de volumes à facettes (une couleur par facette, comme le vélo et les arbres : `fuseau` et `boule3` à plat par défaut, `anneaux` pour un tronc ou un membre qui s'affine, `meche` pour une pyramide à 4 pans). Il a du caractère : grands yeux en amande avec reflet, sourcils, joues roses, petit nez, sourire, frange en mèches et pointes rabattues vers l'arrière (on le voit surtout de dos), mains fermées sur les poignées avec le pouce. **Assis SUR la selle** : `ASSISE` = 1,035 (le dessus de la selle est à 0,955 ; avant, le bassin à 1,0 enfonçait les fesses dans la selle), aussi quand il se ramasse en descente. **La garde-robe** : `CORPS` = le corps nu, toujours le même ; `GARDE_ROBE` = emplacement → habit → ce qu'il dessine sur chaque membre (`torse`, `tete`, `dos`, `bras`, `avantBras`, `cuisse`, `tibia`, `pied`, `patin` ; mêmes repères que le corps) et ce qu'il `cache` du corps (sinon les facettes du corps passeraient au travers : `tronc`, `bassin`, `cuisse`, `tibia`, `pied` ; `dessus` = le haut des cheveux sous un chapeau). **Tenue de base** (`TENUE_BASE`) : cheveux `pointes`, haut `tshirt` (couleur de la veste, col, bords des manches et bande à la couleur d'accent), bas `pantalon` (ceinture, revers), chaussures `baskets` (couleur d'accent, semelle blanche, chaussette), poignets `bracelets` ; sans casquette ni sac. Déjà dans la garde-robe : `short`, `casquette` et `sac` (ceux de la première version). Couleur d'accent = la casquette de ta carte (blanc si elle est de la couleur du haut). Ajouter un habit = une entrée dans `GARDE_ROBE` ; le porter : `D.dresseur.habits` (une liste de noms, `sans-<emplacement>` pour l'enlever ; pas encore envoyé par l'appli) ou `?habits=casquette,sac,short` pour essayer. Le fantôme (copie du groupe) et les rollers suivent tout seuls.

Exemples : `terre-ville.json` (« Céladopole, la ville et les bois ») et `col-ventoux.json` (« Le Ventoux, la forêt »). (`terre-volcan` et `terre-huit` ont été retirés le 17/11.)

## Créer un circuit sans écrire de fichier : l'éditeur et le générateur
**L'écran de l'éditeur a été refait le 17/11 (Kiki : « une usine à gaz »)** : un accueil (« Générer » : longueur, virages, relief, forme en boutons,
ce qu'on veut y voir en tuiles, un gros bouton ; « Le dessiner » : de zéro, son brouillon, ou la copie d'un circuit du jeu ; « Mes circuits »), puis
l'atelier (le plan en grand ; toucher le plan ou le profil choisit une pièce ; seulement l'essentiel de la pièce, « + Ajouter une pièce », le reste
replié ; « ▶ Essayer » en grand en haut ; « Garder sans l'essayer » en petit en bas). L'activité est celle de la machine du menu. Ce qui suit
décrit les possibilités, toutes encore là.
**Générer, retours du 17/11 au soir (Kiki)** : la longueur au curseur, par crans (`PAS_KM` : 1 à 8 km pour une boucle ou un 8, jusqu'à 50 km de A à
B, construits au fil de la route) ; l'effort suit la longueur (`effortDe` : complet jusqu'à 4 km, 3 tirages jusqu'à 8, au-delà 1 ou 2 tirages sans
habiller les rives ni contrôler tout le sol : 2 min 15 sinon pour 20 km) ; **jamais d'échec sec** (`genererSouple`) : en cas d'échec, le 8 devient
une boucle, un cran de virages en moins, puis les éléments les plus durs sont retirés un à un, et on dit ce qui a changé ; au-delà de 6 km de A à B,
pas de fourche (elle empêche la construction par tronçons). Dans le générateur : la forme « ouvert » suffit (`boucle: false` déduit) ; **un 8 ne
raccourcit jamais une pièce courte** (rampes d'un pont, 18 m : la fermeture du 8 les faisait passer sous 20 m, d'où « pas de circuit trouvé » ; elles
sont `fixe`, et le restent dans le circuit gardé) ; **de A à B, le cap reste à moins de 75° de celui du départ** et sans épingle (le col monte sans
lacet) : la route ne repasse jamais sur elle-même (20 et 50 km trouvés du premier tirage) ; **plus de longues lignes droites tirées à la règle**
(`onduler` : un bout libre de plus de 140 m presque droit devient deux virages doux opposés ; le retour déplié fait des S doux) : la plus longue
portion presque droite passe de 200-540 m à 0-150 m, notes égales.

Au menu : Circuit → « Créer ou modifier un circuit » (`jeu/editeur.js`). Plan vu du ciel et profil redessinés à chaque retouche par le vrai
code de la piste, contrôleur en direct, pièces à régler au curseur, modules tout faits à ajouter, objets à poser, repères lointains.
« Essayer » joue le brouillon, « Garder » le range sur la machine (`riviere_circuits`, il apparaît au menu), « Exporter » donne son texte
(à donner à Claude pour qu'il devienne un fichier du jeu) ; sur le serveur d'essai du PC, « Écrire dans le jeu » crée le fichier.
Onglet « Générer » (`jeu/generateur.js`, `genererCircuit`) : longueur, relief, boucle ou A→B, eau ou terre, et des cases (port, village, lac,
sous-bois, marais, plage, cascade, grotte, pont sur un ravin, Ronflex, **une fourche** : modules `fourche` (une île, le bras tranquille ou
les rapides et leur chute) et `fourche_t` (la route ou un chemin de terre à bosses)). Il assemble des **modules** (`MODULES`), fait construire chaque tirage par le
moteur, jette ceux qui ne tiennent pas debout et garde **le mieux noté** (15/11, étape 4 du plan). Mêmes options, même circuit, sur toutes les
machines : la recherche compte ses tirages (`tirages` : 8 valables par défaut), jamais le temps. Ajouter un module = une entrée.

**La note d'un circuit** (`jeu/note.js`, `noterCircuit(P, niveau, biome, tourVrai)`) : sur 100, elle juge la construction, pas la beauté.
| Critère | Poids | Ce qu'il mesure |
|---|---|---|
| Rythme | 30 | la part du tour passée dans un paysage qu'on voit depuis plus de 45 s (Kiki : un changement toutes les 20 à 40 s à son allure) |
| Variété | 20 | le nombre de paysages différents, aucun qui écrase les autres |
| Contrastes | 10 | la force des changements : ouvert ou fermé, clair ou sombre, ville ou nature |
| Repères | 15 | village, grotte, pont, lac, phare, cascade… et les repères au loin ; pas de long trou entre deux |
| Moments forts | 15 | saut, chute, remontée, rapides, pont, grotte, sprint chronométré ; répartis sur le tour |
| Relief | 5 | du dénivelé, sans côte interminable (90 s sur l'eau, 5 min à vélo) |
| Lignes droites | 5 | la part du tour passée tout droit depuis plus de 30 s |

Un « paysage » = des pièces qui se suivent et se ressemblent : familles des deux rives (`FAMILLES` : une rive inconnue est devinée d'après son
profil), ouverture (parois, arbres, largeur), lumière (grotte, sous-bois), ville, eau, pont. Temps comptés à 3,3 m/s sur l'eau et 5,5 m/s sur
la terre (`RYTHME`). Elle rend la note, chaque critère avec sa phrase, et `sequences`, `reperes`, `forts` (pour une frise). Régler la note =
les tables en tête du fichier. L'éditeur l'affiche à chaque retouche (sous le plan, et en détail dans l'onglet « Générer »).

**Ce que le générateur fait d'un tirage qui tient debout** : `deplierRetour` (le raccord d'une boucle, souvent 300 à 500 m d'un seul paysage,
devient de vraies pièces d'une centaine de mètres ; un petit raccord referme la boucle), `habiller` (les rives des bouts ordinaires sont
rechoisies une à une dans `HABITS` tant que la note monte : les rives ne changent pas le tracé, on renote seulement), puis, pour les mieux
notés, `solNiveau` (le sol construit par le vrai `champ.js` et parcouru par `scannerSol`, le même balayage que les tests : un tirage dont le sol
a une marche est écarté, après un essai sans falaises). Si aucun des 5 premiers n'a un sol propre, il rend le mieux noté avec `sol.ok` faux,
et l'éditeur le dit. Options d'essai : `habiller: false`, `deplier: false`, `sol: false`.

**Sans navigateur** (`page.generateur(options)`, `page.controle(circuit=…)`, avec node) :
`python riviere/outils/generer.py --km 2 --avec lac,grotte,pont --graine 3` (bilan et note), `--json` (le texte du circuit), `--ecrire <nom>`
(le range dans `contenu/niveaux/`, seulement si le contrôle complet du moteur ne trouve aucun défaut), `--notes [circuit]` (la note des
circuits du jeu, du mieux au moins bien noté). Le circuit obtenu est le même que dans le navigateur avec les mêmes options.
Pour **le voir** sans le parcourir : `python riviere/outils/planche.py <nom>` (voir « Vérifier sans Kiki »).

## Une vraie route (16/11, étape 8 du plan, lots 1 à 3)

**Un fichier GPX devient un circuit normal** (`outils/gpx.py`) : tracé et pentes à l'échelle 1:1, sur la terre (vélo, marcheur elliptique).
`python riviere/outils/gpx.py route.gpx --id col-essai --nom "Le col" [--relief] --ecrire` (bilan sans `--ecrire`).
- **Ce qui est gardé : la forme** (longueurs, virages, montées), jamais une coordonnée ; le GPX reste hors du dépôt (il peut trahir un domicile).
  `--relief` demande l'altitude de chaque côté de la route à api.opentopodata.org (les coordonnées partent chez ce service : seulement si on le
  veut) : talus du côté qui monte, ravin de l'autre, dès 7 m d'écart sur 70 m ; sinon des bois et des bas-côtés par blocs de ~400 m.
- **Jamais raccourcie** : `--km 5` si on ne dit rien, 60 au plus (`--km 60` = tout le GPX) ; sans `--depuis`, l'outil prend les `--km` les
  plus durs. Au-delà de 6 km, le jeu construit le monde par tronçons (plus bas) : la longueur ne coûte plus rien au chargement. Le GPS tremble : tracé lissé (`--lisse` 6 m), altitude lissée (`--lisse-alt`, 25 m ; 35 pour un relief SRTM).
  Un virage plus serré que `--rayon` (9 m) est étalé sur ses voisins : la route tourne d'autant, plus en douceur.
- **Le niveau** : pièces de 5 à 120 m (tant que virage et pente restent réguliers), `"allurePente": false` (un mètre de route = un vrai mètre,
  côte ou pas : `TOUR_VRAI` = la vraie longueur ; au marcheur elliptique, la côte freine quand même le décor : `allureVue` lit alors `PENTE`),
  `"route"` (km, dénivelé, pente), la ligne au départ, une **borne à chaque kilomètre** (`borne_km` : « SOMMET 3 KM », la pente du kilomètre
  qui vient, tête verte, jaune, rouge ou noire dès 10 %), le kilomètre le plus dur en segment, l'**arche d'arrivée** (`arche_arrivee`,
  « SOMMET »). Un parcours ouvert : l'arrivée annonce le temps, puis on repart du début (comme avant).
- Exemple : `contenu/niveaux/col-ventoux.json` (« Le Ventoux, la forêt » : 5 km, +488 m, 9,8 % de moyenne ; tracé © les contributeurs
  d'OpenStreetMap, par brouter.de). Sa note est basse (21) : elle juge un circuit inventé (rythme, repères), pas une vraie route.
- **Le moteur, pour les grandes routes** : les carreaux du sol à plus de `VU_LOIN` (440 m, outils.js) de toute la piste ne sont ni calculés ni
  dessinés (terrain.js) ; au-delà de 3 km de piste, les carreaux à plus de 160 m ont des mailles quatre fois plus grandes. Le contrôle du sol
  (`scannerSol`) ne regarde que ce qu'on peut voir et accepte des hauteurs jusqu'au point haut de la piste + 200 m. Budgets des tests : ceux
  d'un circuit de 2 km, par tranche de 2 km. **Poids mesuré** (5 km) : ~1,25 million de triangles en tout (sol 515 000, décor 484 000),
  13 s de construction dans Chrome sans carte graphique (4,5 s pour kanto-1km) : à mesurer sur la tablette ; le téléphone risque de peiner.

### Le décor d'après la carte (`outils/osm.py`, 17/11, lot 4)

`python riviere/outils/gpx.py route.gpx --id col --nom "Le col" --km 60 --osm carte.json --ecrire` : la route, et son décor d'après OpenStreetMap.
- **La carte** : si `carte.json` n'existe pas, l'outil demande à overpass-api.de (gratuit) le rectangle autour de la route et l'y garde. Ce fichier
  contient des coordonnées : **toujours HORS du dépôt** (avec le GPX). Le niveau, lui, n'en a aucune.
- **Repérer par rapport à la route** (`Repere`) : pour chaque chose, le mètre de la route le plus proche, le côté, l'écart au bord, et l'angle par rapport
  à la route (`angle_route` : façade vers la route, ±45° au plus). Le tracé peut être lissé et un virage élargi : le décor suit.
- **Les bords** (`bords`, `boucher`, `lisser_bords`) : tous les 10 m, de chaque côté, la sorte de terrain la plus présente à 10, 22 et 38 m (forêt,
  garrigue, vignes, verger, pré, roche, village), et la forêt au loin (75 à 150 m) ; village = une zone habitée ou 4 bâtiments à moins de 40 m (jamais
  sur la roche) ; un trou de la carte prend ce qu'on voyait avant (3 km au plus) ; jamais un bloc de moins de 150 m. Correspondance : `BORD`
  (forêt → `sous_bois`, roche → `pierrier`…), « _bois » en plus si la forêt est derrière.
- **Les objets, posés exactement par le niveau** : bâtiments (`batiments` : maison à sa taille, `varie` pour les couleurs ; entrepôt si grand et bas ;
  immeuble dès 3 étages ; boutique ; chapelle pour une église ; les plus grands d'abord, jamais l'un dans l'autre, jamais sur la route), arbres isolés,
  rangées d'arbres et haies, piscines, tours et antennes (avant les bâtiments). Au mètre et au degré près (le niveau reste léger).
- **La région** `kanto-reel` (hérite de kanto-routes) : les bords de la carte et leurs règles (`regles_plus` : rangs de vigne, cerisiers et pommiers,
  buissons de garrigue, cailloux du pierrier, Pokémon de chaque bord) ; aucune maison ni rue au hasard : les maisons sont celles de la carte.
  Les essences : plus de pins, pas de cerisier rose en forêt (`"cerisier": 0` : les listes héritées se complètent).
- **Les recettes** (`contenu/objets/kanto-reel.js`) : `chapelle`, `piscine`, `tour_relais` (`mat: true` : une antenne seule), `vignes` (une parcelle :
  terre ocre, 6 rangs perpendiculaires à la route, ceps, touffes rondes, fil de fer, piquets ; `simple: true` au loin : quatre touffes par rang).
- Le menu cite « © les contributeurs d'OpenStreetMap » pour tout circuit qui a `"route"` (`"osm": true` : tracé et décor).
- Jamais rien au bout de la route (`au_bout` : ce qui est derrière le départ ou après l'arrivée), jamais un bâtiment sur la route (`dehors` : ses coins
  à 1 m du bord, toit compris, sinon écarté de la route, 8 m au plus). Une boîte aux lettres seulement devant une vraie maison proche.
- Les bornes de col (`borne_km`) : `"face": "arrivant"` (lisibles en arrivant), texte à 80 pixels par mètre (`K.etiquette(F, texte, x, y, z, l, h, res)`,
  28 par défaut).
- Exemple : `ventoux` (« Le Ventoux en entier », caché du menu). Comparer : `outils/captures.py compare --niveau ventoux`.

### Les longues routes : le monde par tronçons (`moteur/troncons.js`, 16/11, lot 3)

Un circuit de 2 km est construit d'un bloc au chargement. Une route de 20 km ne peut pas l'être (une minute de calcul, des millions de
triangles) : elle est construite **autour de soi**, et effacée derrière. La piste, elle, est toujours calculée en entier (elle est légère).
- **Quand** : `TRONCONS` (piste.js) = un parcours ouvert, sans fourche, de plus de 6 km ; ou `"troncons": true` dans le niveau (`false` pour
  l'interdire) ; ou `?troncons=1` / `?troncons=0` dans l'adresse, pour comparer. **Jamais une boucle ni un circuit à fourche** : ceux-là
  restent d'un bloc, comme toujours (mêmes fonctions : `construireTerrain`, `construireRives`, `construirePiste`, `construireDecor`).
- **Quoi** : trois sortes de tâches. « s » : un carré de sol de 60 m, sur un quadrillage fixe du monde (`trSol`, le même calcul que le
  terrain d'un bloc : `celluleSol`, `sommetSol` de terrain.js) ; « b » : 48 m de piste, ses rives et son ruban (`fabriqueRives`,
  `fabriquePiste`) ; « d » : le décor des mêmes 48 m (`poserDecorPas(Z)` de decor.js : les mêmes règles, limitées au tronçon `Z`).
  Les ponts, les tunnels, le lointain restent construits d'un bloc.
- **Où** : tout ce qui est à moins de 470 m de la caméra (la brume est pleine à 400 m : on ne voit rien arriver), effacé au-delà de 560 m.
  Si la machine peine et que le jeu réduit la vue (`porter`), ces rayons suivent. `?rayon=700` : un autre rayon (pour une vue du ciel).
- **Sans à-coup** : chaque construction est une `function*` qui rend la main toutes les 1 à 2 ms (`yield`) ; `tronconsMaj()` (appelée par
  `boucle` après la caméra) n'y passe qu'un cinquième du temps de l'image (3 ms à 60 images/s, 12 ms au menu, davantage si quelque chose
  manque là où l'on voit). Seul ce qui manque à moins de 150 m est fait d'un coup : un départ, l'arrivée qui ramène au début, un plan du
  film, `__aller(s)`. `tronconsMaj(true)` finit tout (c'est ce que fait `__image()`).
- **Toujours le même monde** : le sol vient du champ (une fonction du lieu) ; le décor d'un tronçon a son propre hasard (la graine du
  niveau et son numéro : `zoneTroncon`). Pour que deux voisins ne posent rien l'un dans l'autre, les tronçons pairs se décorent seuls,
  les impairs attendent leurs deux voisins et évitent ce qu'ils ont posé. Refait dans un autre ordre, un tronçon est identique (contrôlé).
  Le décor d'une route par tronçons n'est donc pas, arbre pour arbre, celui de la même route construite d'un bloc : mêmes règles, autres tirages.
- **Ce qui suit les tronçons** : les ombres portées (`ombrePour`), les forêts en masse (leur part du plafond d'arbres : celle d'un circuit de
  2 km), les lueurs (`refaireHalos`), les Pokémon et les habitants (`ajouterPublic`, `retirerPublic`), les bornes et leurs textes.
  **Pas encore** : les rencontres (Ronflex) sur une route par tronçons ; `?vue=haut` ne montre que ce qui est construit autour de sa caméra.
- **Mesuré** (16/11, Chrome sans carte graphique, ce PC) : « Le Ventoux en entier » (21,6 km) est prêt en ~1 s (le reste du disque pendant le
  menu, ~1,5 s de calcul en tout) ; « Le Ventoux, la forêt » (5 km) : 0,7 s par tronçons, 10,8 s d'un bloc. En route : 4 à 7 ms au pire par
  image pour construire, ~230 000 triangles et ~350 maillages en mémoire, stables. `window.__troncons()` : tâches faites, en attente,
  effacées, triangles, pire image, `retard` (le nombre de fois où il a fallu forcer).
- **Le contrôle sans dessin** (`controle.js`, `decorParTroncons`) pose le décor comme le jeu, sur un kilomètre sur cinq : `troncons` dans le
  bilan (`faits`, `fenetre` = les triangles du kilomètre le plus chargé, `ordre`, `chevauchements`). Tests : `Troncons` dans `tests/test_riviere.py`.
- Exemple : `contenu/niveaux/ventoux.json` (« Le Ventoux en entier », depuis Bédoin : 21,6 km, +1 595 m, 7,4 % ; même tracé que la forêt).

**Le home trainer** (`jeu/capteurs.js`) : `brancher(app)` s'abonne à tout ce que l'appareil sait dire (vrai ou faux) ; un appareil qui décroche
est rebranché tout seul (`perdu` : 6 essais en ~40 s, « HOME TRAINER DÉCROCHÉ… », puis « RELIÉ ») ; les commandes passent l'une après l'autre
(`ecrireCtrl`). **La pente envoyée** (`penteTrainer`) : la moyenne des 8 mètres qui viennent × la **dureté des pentes** (menu vélo, Réglages →
Capteur Bluetooth : 0, 25, 50, 75, 100 %, gardée `riviere_difficulte`, 50 % par défaut), descentes à moitié, entre −8 et +20 %, par crans de
0,1 %, au plus une fois par seconde. La vitesse du jeu suit la vraie pente (la physique), seule la résistance dépend de la dureté.
**Le faux home trainer** (`fauxHomeTrainer`, bouton du menu ou `?faux_trainer=220` = ses watts) : une mesure par seconde, il reçoit la pente,
pousse plus fort en côte, `window.__faux` (commandes reçues, `couper()`, `refuse`). **Une séance faite avec lui ne compte jamais**
(`vitesseCapteur` : `BT.faux`). Vérifié avec lui (16/11) : pente juste à 50 et 100 %, séance non gardable, rebranchement, abandon après 6 refus.
**Jamais essayé avec un vrai home trainer.**

## Un vrai plan d'eau : le lac d'Allier à Vichy (18/11, Kiki)

Kiki fait du vrai kayak et du paddle sur le lac d'Allier : il veut ramer chez lui sur le même parcours, **le plus fidèle possible**.
`python riviere/outils/plan_eau.py TRACE.json CARTE.json --id vichy-lac --nom "Le lac d'Allier, Vichy" --ecrire`
- **Le tracé** (`TRACE.json` : origine + un point par mètre, en mètres) et **la carte** (`CARTE.json`, la réponse d'Overpass) restent HORS du dépôt
  (`riviere/outils/cartes/`, ignoré par git, avec les scripts qui ont tracé le parcours : `vichy-trace/`). Le niveau n'a aucune coordonnée.
- **Le parcours de Kiki** (sa carte annotée du 18/11) : départ du petit ponton de la rive de Bellerive, juste en amont du pont ; on longe cette rive
  à ~25 m de la berge jusqu'au coude ; le tour de la petite île (la 2e du coude, dans le sens des aiguilles d'une montre) ; retour par le petit chenal
  entre la grande île et la rive est, puis la rive de Vichy (le club d'aviron et son grand ponton, la plage des Célestins) ; **arrivée sous le pont
  Jacques Chirac**. 4,0 km, parcours ouvert. La Rotonde est en aval du pont : hors du parcours.
- **Le moteur et les grands lacs** : `"rivage": {"pas": 10, "g": [...], "d": [...]}` dans le niveau = tous les 10 m, de chaque côté, la largeur d'eau
  libre entre le bord de la piste et la vraie berge (jusqu'à 300 m : la berge d'en face, une île). `champ.js` (`RECUL`, `hRive`) : la rive (son
  profil, ses sols) commence là, devant c'est le fond du lac (`FOND_LAC`) ; au loin, l'eau tant qu'on est sur le lac, sinon la ville presque plate ;
  plus de points pour les profils (`NE`, `E_MAX`). `decor.js` : les bandes des règles se comptent depuis la vraie berge (les objets posés par le
  niveau gardent leur écart vrai, depuis la piste). `surfaces.js` : l'eau du large à 3,5 cm sous la piste (sinon un trait sombre le long du couloir).
  `piste.js` : sur un grand lac, la piste peut recroiser son propre passage (le tour d'une île) : un croisement sur la même eau est accepté.
  **Sans `"rivage"`, rien ne change** (tout est derrière `RECUL`, qui vaut `null`).
- **La région** `vichy` (hérite de Kanto) : rives `promenade` (perré de pierre, l'allée des promeneurs et des cyclistes, grands arbres en
  alignement, réverbères, bancs, pelouses), `berge` (herbe, saules au bord de l'eau, l'allée en retrait), `berge_ile`, `plage_lac` (sable,
  parasols). L'outil choisit : une île, une plage (trouvées sur la carte), sinon la rive droite (`--rive-droite`, Vichy : promenade) ou la rive
  gauche (`--rive-gauche`, Bellerive : berge) au sens de l'eau qui coule.
- **Les repères** (`contenu/objets/vichy.js`, premier jet en volumes simples, à refaire d'après les photos de Kiki) : `pont_route` (le grand
  pont : tablier, trottoirs, garde-corps, réverbères, piles hors du couloir ; `debut`, `fin` le long de son axe depuis le point où l'on passe
  dessous), `club_aviron` (hangar à bateaux, étage vitré, bandeau bleu, mât), `ponton_aviron` (le grand ponton flottant et ses skiffs),
  `skiffs`, `parasol`, `transat`. Les pontons de la carte flottent toujours devant la berge (la carte les pose souvent à cheval).
- **Contrôles** : `?pur=1&niveau=vichy-lac` (aucune erreur ; un croisement accepté au tour de l'île) ; le tracé du moteur s'écarte du vrai de
  2,7 m au plus (l'outil le dit).

## Ajouter un objet

Un fichier `.js` dans `contenu/objets/` (ou une recette de plus dans `kanto.js`) :

```js
Object.assign(RAYON, {banc: .8});                    // la place qu'il prend, pour que rien ne se chevauche
Object.assign(OBJETS, {
  banc(F, o, R, K) {                                 // F : la Forme où dessiner, déjà placée et tournée ; o : ses réglages ; R : le hasard du niveau
    F.boite(0, .35, 0, 1.6, .12, .5, PAL.tronc[1]);  // x = le long de la piste, y = vers le haut, z = vers la piste
  },
});
```

Les couleurs viennent de la palette de la région (`PAL`), jamais écrites en dur : c'est ce qui permettra à Johto d'avoir ses arbres
rouges avec les mêmes recettes. **Aucune image dans le décor.** Les règles de pose par densité sont dans la région (`regles`) ; `plat` dans une règle : la rive, à 3 m du bord, ne dépasse pas cette hauteur (les roseaux ne poussent jamais au pied d'une paroi). Refusés par Kiki (11/11) : les hautes herbes en pyramides, les fleurs en cubes.
Un feuillage qui plie au vent : `F.vent(force, y0, y1)` avant ses formes (il ne bouge pas à la hauteur `y0`, de `force` mètres à la hauteur
`y1`), `F.vent()` après ; voir « Les effets du rendu ».
Un objet qui fait réagir la monture : `Object.assign(EVENEMENTS, {tronc: "saut"})` (`"saut"` ou `"plongee"`).

## La ville, les embranchements, la variété, les raretés (17/11, carte blanche de Kiki : « énormément de diversité »)

Tout le dessin est dans `contenu/objets/kanto-ville.js` ; deux petites accroches dans le cœur (`decor.js` : `EMPRISE`, `JONCTIONS` ; `surfaces.js` : `BORDURES`, `VIB`).
- **Les bords d'une route** : les bordures rouges et blanches seulement sur un circuit **en boucle et tout en goudron** (Kiki), et jamais le long d'une rive
  `"urbain": true` (trottoir, quai, ville) ; sinon la ligne blanche de rive d'une route ordinaire ; pas de ligne du milieu sur une route de moins de 5,2 m.
  Un niveau peut l'imposer : `"bordures": "vibreurs"` ou `"ligne"`. (Sur la terre, l'attribut `aEc.x` du ruban porte « vibreurs ici » : `VIB`.)
- **La place d'un objet étendu** : `EMPRISE[nom] = o => [[x, z, r], …]` (son repère) ; rien d'autre n'est posé dans ces ronds, et une règle ne pose
  l'objet que si tous ses ronds sont libres. Les rues, carrefours, rond-points et routes qui continuent s'en servent.
- **La trajectoire sur la terre** (`ligneRoute` de monture.js, 17/11, Kiki : « comme un vrai cycliste sur route fermée ») : calculée une fois, mètre
  par mètre, en tirant la ligne vers le plus court par lissages de 24, 12, 6 puis 3 m : on élargit avant un virage, on coupe à la corde, on ressort large,
  et on coupe un rond-point au lieu d'en faire tout l'extérieur ; sur le droit, elle flâne doucement d'un côté à l'autre. Marges : 0,9 m à droite,
  1,7 m à gauche (ton Pokémon court à côté). Sur l'eau et sur l'autre voie d'une fourche : la corde d'avant (`trajectoire`).
- **Les embranchements** (Kiki : « une autoroute ne devient pas d'un coup un chemin de terre ») : `"jonctions"` de la région (`{objet, routes, chemins}`,
  kanto-routes : goudron et pavés → terre). Là où la ligne passe d'une route à un chemin, la route **continue tout droit** puis tourne et s'en va
  (`route_suite` : lignes, poteaux, un poteau indicateur à deux flèches), et c'est le chemin qui part. Seulement si le chemin tourne d'au moins 18° dans
  ses 40 premiers mètres (sinon les deux se recouvriraient) : **dessiner un chemin de terre qui part en tournant** (le générateur le fait : `sousbois_t`).
- **La ville** : `rue` (une rue qui part de la route entre les maisons : chaussée, trottoirs, passage piéton, ligne d'arrêt, maisons et boutiques tournées
  vers elle, réverbères, voitures garées, une façade qui la ferme au bout ; `"ville": false` : une route de campagne bordée d'arbres ; `"chemin": true` :
  un chemin de terre), `carrefour` (`"cote": "c"` : une rue de chaque côté, `"cotes": "g"|"d"`, passages piétons sur la route, feux), `rond_point`
  (posé au milieu du virage d'un rond-point : anneau, île à haie et fontaine, Poké Ball de pierre, arbre ou cerisier, la branche d'en face et souvent
  celle de droite ; `r` : le rayon de la piste). Un rond-point se dessine en trois pièces (`rondPoint` du générateur : +45°, −90° de rayon 12 m, +45°, rayons
  liés pour que l'île soit sur l'axe). Objets : `magasin` (vitrine, store rayé, enseigne), `arret_bus`, `banc`, `voiture`, `feu`, `fontaine`, `poteau_indicateur`.
  Règles de kanto-routes : des rues tous les ~46 m sur les trottoirs, un chemin ou une petite route qui part dans la campagne, fermes, arrêts de bus.
- **Jamais deux maisons pareilles** : `"varie": true` (maison, immeuble) : couleurs, étage, taille tirés de leur place (`hv`), sans toucher au hasard du niveau.
- **Les essences d'arbres** : `"especes"` de la région (`{bosquet, melange, liste}`) ; par cases de 60 m une essence domine (bouleau, pommier, cerisier en
  fleurs, pin parasol, arbre roux, saule au bord de l'eau), les trois quarts des arbres de la case la prennent ; la forêt du fond prend leurs couleurs.
  Aucun tirage dans le hasard du niveau : le reste du décor ne bouge pas. `"decor": "classique"` dans un niveau : rien de tout ça (kanto-1km, identique).
- **Les ports** du générateur sont tirés au hasard (bateaux, voiliers, pontons, entrepôts, immeubles, boutiques, phare ou non, Pokémon) : plus jamais le même.
- **L'échangeur** (`echangeur_t`, case « un échangeur ») : la route fait une boucle de 270° en montant de 7 à 9 m et repasse au-dessus d'elle-même sur un
  pont (la verticalité ; même principe pour un circuit à la main : boucle, pont, croisement à 4,5 m au moins).
- **Les raretés du ciel** (`jeu/raretes.js`) : un avion de ligne et ses traînées (~1 fois tous les 10 vrais km), une montgolfière (16 km, de jour, sans
  pluie), une volée de Roucool (4 km), un oiseau légendaire (Artikodin, Électhor ou Sulfura, 35 km), des étoiles filantes la nuit (1,2 km). Seulement en
  avançant, une à la fois, dans `CIEL.loin` (le ciel lointain), entre 3 et 8° au-dessus de l'horizon : plus haut, les compteurs les cachent.
  Essai : `?rare=avion` (montgolfiere, etoile, roucool, legendaire), `window.__rare("avion")`.
- **Le goudron posé sur le sol** (17/11, Kiki : le rond-point « complètement buggé », des plaques grises unies) : la chaussée d'une rue, l'anneau d'un
  rond-point, la route qui continue sont peints avec **le matériau de la piste** (`Forme.sol(nom, x, y, z, s, u)`, `bandeSol(…, surf)`) : le même grain
  que la route, sans marque (`aBord` = 99), loin de l'ombre de ta monture ; jamais une couleur unie à côté du ruban.
- **Un chemin de terre qui part** (`cheminFondu`, 17/11, Kiki : « aucun fondu, c'est abrupt ») : peint comme le bas-côté d'une route, la terre du sol
  en deux tons au milieu, qui se fond dans ce qu'il y a autour sur ~2 m de chaque côté (bord irrégulier) et s'efface dans l'herbe sur ses 12 derniers mètres.
- **Sous un arbre** : son ombre sur l'herbe, jamais un carré de couleur (le cerisier avait un carré rose : retiré).
- Exemple : `contenu/niveaux/terre-ville.json` (« Céladopole, la ville et les bois » : rue, carrefour, deux rond-points, sous-bois, échangeur).

## Le footing : des parcours à pied (18/11, Kiki : « vu que c'est à pied, ça pourrait être des parcours totalement différents »)

Au marcheur elliptique, ton Pokémon trottine : il n'a pas à suivre les routes des voitures. Un parcours de footing passe sur le **trottoir
d'une rue**, traverse une **place**, prend une **ruelle**, monte un **escalier**, coupe par un **parc**, suit un **sentier en forêt**, un
**chemin entre les champs**, longe une **petite route de campagne**, franchit une **passerelle**. Tout est fait de pièces ordinaires :

- **Le revêtement `marches`** (surfaces.js, mode 3) : un escalier de pierre dessiné sur la pente (une marche tous les 36 cm de décor,
  l'ombre de la contremarche, le nez clair, un bord de pierre). Une pièce `{"surface": "marches", "long": 22, "monte": 5.5, "large": 3}`
  (25 %, sous les 30 % permis), entre deux paliers pavés de 10 à 12 m. Couleurs : `terres.marches` de la région.
- **La rue à côté du trottoir** (18/11, 2e version, Kiki : « une vraie route, un trottoir de chaque côté, et on court sur le trottoir ») :
  la piste est **le trottoir** (revêtement `trottoir` : des dalles claires, mode 4 de la route, joints qui s'effacent au loin), 2,6 m de large ;
  la rive `rue` porte une **bande** (`"bande": "rue"` dans la région ; `construireBandes` de surfaces.js) : un ruban qui suit la piste
  exactement, dessiné comme elle, net : la bordure de pierre (22 cm), son flanc, le caniveau, la chaussée de 6 m (ligne du milieu,
  un passage piéton tous les 97 m), l'autre caniveau, l'autre bordure, le trottoir d'en face (coupe : `BANDE_RUE`, u = la distance au
  bord de la piste). Le terrain passe 18 cm dessous. Plus aucune couleur du terrain pour la ville (c'étaient elles, peintes sommet par
  sommet, qui faisaient l'aliasing, les traits et les « textures qui se mélangent »). **Règle** : un virage qui a la rue à l'intérieur
  garde un rayon de 15 m au moins. Là où l'on quitte la rue (un passage, un parc), **elle continue tout droit** : objet `rue_continue`
  (`"cote": "g", "a": <fin de la pièce>, "e": 0, "long": 40` ; `"sens": -1` : elle venait de là), peint avec la même bande
  (`Forme.sol("rue_bande", …)`), ses maisons d'en face, une façade qui ferme la vue.
- **Les rives du footing** (`kanto-routes.json`, règles à la fin de la liste : le décor des autres circuits ne bouge pas) :
  `rue` (la bande, les voitures garées des deux côtés, les arbres d'alignement et les réverbères du trottoir d'en face, ses haies, les
  maisons d'en face à ~16 m), `facades` (notre côté : un réverbère au bord du trottoir tous les ~19 m, une haie basse coupée par les
  portillons, boîtes aux lettres, massifs, un arbre, les maisons derrière leur jardin à ~3,5 m ; les haies et les réverbères sont posés
  avant les maisons, sinon la place d'une maison, un grand rond, les refusait), `venelle` (un passage entre deux maisons tournées de
  côté, des murets entre elles, un Miaouss perché dessus), `place` (le bord d'une place : la place elle-même est la piste, `large` 12,
  en pavés ; terrasses de café, boutiques, réverbères), `parc` (allée des bancs : un banc tous les ~13 m, réverbères, massifs,
  poubelles, grands arbres, une mare, des Pokémon), `campagne`, `escalier`, et celles d'avant (`sous_bois`, `champ`, `bas_cote`).
  Objets du footing : `contenu/objets/kanto-footing.js` (`haie`, `muret`, `massif`, `poubelle`, `terrasse`, `kiosque`,
  `portail_parc` posé sur la piste avec son nom, `rue_continue`).
- **La caméra du trotteur** (`MONTURES.trotteur.camera` : `recul` .6, `haut` .62, `suit` 1 ; monture.js → `CAM.fr/fh/fl` → camera.js) :
  40 % plus près, plus basse, juste dans son axe (avant, au milieu de la piste : sur un trottoir, il était petit et décalé ; Kiki :
  « il est vraiment petit à l'écran »). Il court au milieu de sa piste, 55 cm de marge de chaque côté (`ligneRoute` : la marge de 1,7 m
  à gauche n'est que pour le vélo).
- **Quitter la rue sans la casser** (19/11, Kiki : « le trottoir doit rester un trottoir tout droit ; mon personnage, lui, décide d'aller à droite
  entre les deux maisons ») : là où la piste quitte une rue en tournant, la bande s'arrête 6 m avant le coin, droite (`construireBandes` : elle ne
  suit plus le début du virage), et `rue_continue` (ancrée au même endroit, dans l'axe de la rue : `ancreRue`) prolonge **la chaussée, ses deux
  trottoirs et notre trottoir, intact, dès le coin**, en chevauchant le bout de la bande. La piste qui tourne passe dessous : sa première pièce est
  en revêtement `trottoir` (une petite entrée dallée qui s'arrondit vers le passage). Rien n'est posé sur ce trottoir ni sur cette rue (emprise),
  et des maisons la bordent des deux côtés, jamais sur le chemin pris. **Le sol peint par un objet** : `SOL_PLAT[nom] = (o, s) => polygone` (decor.js) ;
  le ruban des rives (terrain.js) passe 25 cm sous ce polygone (sinon, un peu plus haute, l'herbe d'une rive voisine recouvrait la rue).
- **Aucune maison sur une piste** (decor.js, `touchePiste`, décor neuf seulement) : un bâtiment posé par une règle (`BATIMENTS` : maison, immeuble, magasin…)
  regarde huit points du bord de sa place ; aucun ne doit être à moins d'un mètre d'une piste, la sienne comprise. Avant, seul son centre
  comptait : dans un coin, un mur tombait sur le trottoir. (Refusé, la recette tourne à blanc : le hasard du reste du décor ne bouge pas.)
- **Les voitures garées** (19/11, Kiki : « au milieu de la route ») : de notre côté, contre la bordure ; en face, à cheval sur le trottoir
  (`"bordure": 1` dans les réglages de `voiture` : les roues de ce côté montées sur les 12 cm de la bordure, la voiture un peu penchée).
- **Le trou bleu des fourches sur la terre** (19/11, Kiki) : près de la pointe, chaque voie ne dessinait son bord intérieur que jusqu'à sa largeur
  libre, et la grille du sol, enfoncée pour laisser passer le ruban, laissait voir le ciel dans la fente du milieu (sur l'eau, l'eau la cache).
  `raccordFourches` (terrain.js) pose un ruban d'herbe d'un bord à l'autre, juste sous les rives ; la pointe ne s'enfonce plus sur la terre.
- **Le garage** (18/11, après le 1er essai de Kiki : « 4 roues carrées, c'est très très moche ») : `voiture` (kanto-ville.js, `dessinerVoiture`,
  `GARAGE`) a cinq modèles dessinés par leur profil de côté : citadine, berline, break (barres de toit), camionnette du Poké Mart (son nom
  des deux côtés), coupé sport (aileron) ; bas de caisse puis habitacle plus étroit, vitres et montants, pare-brise, roues rondes dans leurs
  passages, pare-chocs, plaques, phares (allumés la nuit), feux, poignées, rétroviseurs, un toit blanc une fois sur quatre. Modèle et couleur
  tirés de sa place (`hv`) ; `"modele": "sport"` pour l'imposer. Garées : le long de chaque bordure, dans le sens de la circulation
  (`"tourne": 180` en face), moins nombreuses. **Une voiture qui roule** : `voiture_roule` (`"cote": "g", "e": 0` au début d'une rue,
  `long` : ses mètres) passe au milieu de la chaussée à 30 km/h, dans un sens ou dans l'autre, deux fois sur cinq par cycle de 70 s, chaque
  rue à son rythme, un autre modèle à chaque passage. Le moteur a pour ça une petite prise : `VIVANTS` (decor.js), des fonctions appelées
  à chaque image avec le temps des animations.
- **Travaillés le même jour** (décor neuf seulement ; `"decor": "classique"`, kanto-1km, garde ceux d'avant) : l'immeuble (`immeubleNeuf` :
  rez-de-chaussée et entrée vitrée sous un auvent, fenêtres à cadre et appui, balcons, chaînes d'angle, bandeaux, corniche, parapet),
  le banc (lattes, dossier penché, pieds de fonte), la boîte aux lettres (toit rond, fente, drapeau).
- **Les ombres sur les murs** (rendu.js, tous les circuits) : seules les faces tournées vers le ciel reçoivent les ombres portées. Un mur,
  vu par le soleil de biais, se faisait des dents de scie sous son toit (Kiki : « le haut des maisons, l'ombre, c'est dégueulasse »).
- **Étroit** : un trottoir fait 2,6 m, un passage 2,2 m, un sentier 2,2 m. Les tests acceptent 2 m pour un circuit `"machines": ["elliptique"]`.
- **`"machines": ["elliptique"]`** à la racine du niveau : il n'est proposé qu'à ces machines (menu, `pourMachine` de depart.js ; un vélo dans un
  escalier, non). Sans ce champ : toutes les machines de son activité, comme avant.
- **La longueur** : au trot, le décor défile une fois et demie plus vite que tes vrais mètres (`MACHINE.allure` ≈ 1,5 : 6,5 km/h vus pour
  4,3 km/h aux jambes). Un tour de 2 km de vrais mètres = ~3 km de décor.
- **Le circuit** : `contenu/niveaux/footing-jadielle.json`, « Le footing de Jadielle », refait le 18/11 (1 728 m de décor, un tour
  ≈ 15 min au trot, une boucle à droite de ~660 × 360 m dont les virages ont été calculés pour qu'elle se referme par 70 m de rue :
  plus aucune longue ligne droite) : la rue des Lilas sur le trottoir, le coin de la boulangerie, la rue du Moulin, le passage des Chats
  entre deux maisons (segment), le portail du parc des Roucool, l'allée des bancs, la roseraie, le kiosque, **la fourche « Le raccourci
  de la butte »** (à l'effort : par la butte boisée, sinon le tour de la mare), **Ronflex qui fait la sieste** sur l'allée, la place du
  Marché et ses terrasses, la rue du Marché, l'escalier de la butte (segment), le belvédère, le sentier des bois et sa clairière
  (segment), la descente, la passerelle, les jardins ouvriers, l'avenue des Tilleuls, le coin de l'école. Allure du niveau 1,08.
  Pour retoucher le tracé sans casser la fermeture : changer une pièce, puis recalculer les virages (une tortue et un petit calcul de
  moindres carrés : ils visent la fin du tour 60 m avant la ligne, au cap du départ, en bougeant chaque virage le moins possible).
- **Le générateur** (`style: "pied"`, à l'écran « Générer » du marcheur elliptique : « Où tu cours : À pied / Sur la route ») : les modules
  `rue_p`, `ruelle_p`, `place_p`, `escalier_p` (monte ou descend), `parc_p`, `sentier_p`, `chemin_p`, `bordroute_p`, `passerelle_p` ; ils se suivent
  par quartiers, comme une vraie sortie (`listeFooting` : la ville, l'escalier, le parc, la forêt, les champs, la passerelle, la ville), chaque
  quartier s'allongeant jusqu'à la longueur voulue (la nature plus que la ville) ; cases : la ville, un escalier, un parc, un sentier, les
  champs, une passerelle ; relief : plat, vallonné (15 m), ça grimpe (35 m), 8 % au plus ; pas de 8 ; la longueur demandée est celle de tes
  jambes (`kmDecor` de l'éditeur), 5 km au plus en boucle. Les rives n'y sont jamais rhabillées (habiller() mettrait des champs en ville).
  `python riviere/outils/generer.py` : `"style": "pied"` dans les options (page.generateur).

**Le décor ne tombe plus sur un autre bout de la route** (18/11, Kiki : « les routes se croisent, les immeubles sont au milieu de la route »,
sur un circuit généré) : une « rue qui part » (52 m, ses maisons, la façade du bout) posée à l'intérieur d'une épingle traversait l'autre
branche ; seule la place des autres objets était regardée. `surAutreRoute` (decor.js) : un objet, ou un rond de son emprise, qui empiète sur
un bout de piste à plus de 25 m de lui (le long de la piste) n'est pas posé ; sa recette tourne quand même à blanc, pour que le hasard du
reste du décor ne bouge pas. Un pont ou une grotte bien au-dessus ou au-dessous ne compte pas. Le contrôle dit combien (`ecartes`) : 0 sur
les circuits du jeu, 1 au Ventoux (un objet qui était sur la route).

## Une ville dessinée : le plan d'abord, le parcours ensuite (24/11, Kiki : « le trottoir d'un coup dévie, change de texture, c'est trop bizarre »)

Partout ailleurs, le monde se déduit de la piste. En ville, c'était la cause de tout : la piste ÉTAIT le trottoir, donc il tournait avec elle.
Ici l'inverse : **`"plan"` dans un niveau décrit une ville** (rues droites, îlots, trottoirs, place, parc) et la piste n'est qu'un chemin invisible
posé dessus (surface `libre` : elle ne dessine que l'ombre du coureur). Le sol ne change donc jamais parce que l'on tourne.

| Fichier | Rôle |
|---|---|
| `moteur/plan.js` (pur) | `PLAN` : carrefours, passages, plateaux, allées déduits du plan ; `PLAN.nature(x, z)` = le sol en un point (trottoir, passage, allee, place, pelouse, jardin, chaussee, etang) ; `remplirPlan` pose maisons, boutiques, résidences, marché, bancs… chacun dans sa parcelle ; **`planControle`** refuse ce qu'aucun piéton ne ferait |
| `moteur/plan_dessin.js` | le sol en couches (chaussée, plateaux, îlots, allées, peinture), les pelouses, l'étang, la circulation (seulement dans les rues que le parcours ne traverse pas) |
| `jeu/villes.js` | `tirerVille`, `genererVille` : une ville et son parcours tirés d'une graine, à la longueur demandée (0,9 à 1,9 km de décor) |

- **Un niveau sur plan** : région `kanto-plan`, `"surface": "libre"`, `"machines": ["elliptique"]`, des pièces aux longueurs exactes (droites et arcs : `piecesDuChemin`) ; ses
  rives ne servent à rien (`"plan"`). `"peuple"` : les passants et les Pokémon à charger avec la page.
- **Ce qui est refusé** (`planControle`, dans le générateur, les tests et `controle.js`) : marcher ailleurs que sur un trottoir, un passage, une allée ou une place ; passer d'un sol à
  un autre hors de la liste fermée `PASSAGES_PERMIS` ; entrer dans le parc autrement qu'à angle droit ; un objet solide à moins de 75 cm du chemin ; deux objets l'un dans l'autre ; un
  bâtiment sur la chaussée. Ajouter un module = l'ajouter au plan, jamais tordre la piste.
- À plat pour l'instant (aucun relief), rues à angle droit seulement ; le parc a ses allées courbes. Le générateur « À pied » ne fait plus que ça (les anciens modules `_p` ne servent plus).
- La caméra du trotteur ne regarde jamais à plus de 12° de son Pokémon (camera.js) : un coin de rue tourne à 90° en 5 m.
- Loin du parcours, les petits objets ne sont pas posés et les arbres sont des silhouettes : 60 000 à 250 000 triangles à l'image, 7 à 14 ms sur le PC de Kiki.

## Une ville libre : des rues courbes, en diagonale, en pente (24/11, étape 13 du plan, lot 1)

La ville dessinée (au-dessus) est plate, à angles droits, et prend tout le circuit. Ici, **`"zone"` dans un niveau décrit des VOIES**, chacune une courbe quelconque à la
hauteur qu'on veut, et le sol se déduit de la distance à chacune : chaussée, trottoir, pavés, allée, jardin. Rien n'est assemblé, donc **aucune jointure ne peut s'ouvrir**.

| Fichier | Rôle |
|---|---|
| `moteur/zone.js` (pur, avant la piste) | `ZONE` : les voies (droites et arcs), leurs croisements, la hauteur du sol (`ZONE.sol`, votée par les voies voisines : une rue est plate en travers), les distances (`ZONE.champs` → `D.f` bordure, `D.t` bord du trottoir, `D.p` pavés, `D.a` sable) |
| `moteur/zone_plan.js` (pur, après la piste) | `planDeZone` : `PLAN` avec les mêmes réponses que plan.js (champ, terrain, décor, formes ne voient pas la différence) ; les passages piétons (où le parcours traverse, et à chaque branche d'un carrefour), les plateaux ; `remplirZone` pose boutiques, maisons, clôtures, voitures, jardins le long des courbes ; `zoneControle` |
| `moteur/zone_dessin.js` | le sol d'un seul tenant : une trame de triangles (4 m, 1 m près des rues, 50 cm aux coins) coupée exactement où une distance change de signe ; la bordure suit sa rue ; **le trottoir est uni, sans dalles** (un enrobé clair sans direction, `ZONE_TROTTOIR`, le même pour les allées des maisons : aucun raccord dans un virage ; Kiki, 24/11) ; la peinture posée dessus |
| `contenu/objets/kanto-zone.js` | `maison_pente`, `magasin_pente`, `immeuble_pente` : le seuil à la hauteur du sol devant la façade, un soubassement de pierre, les marches qu'il faut ; `arbre_rue` : la même essence sur un tronc plus haut, qu'on voit au-dessus d'une haie (les silhouettes `arbre_masse`, sans tronc, jamais à moins de 40 m du chemin) |
| `jeu/villes.js` | `cheminDeZone`, `recalerZone`, `niveauDeZone` : un parcours posé sur les voies (tel trottoir de telle rue, puis telle autre ; on tourne au coin, jamais ailleurs) |
| `outils/zone.py` | `python riviere/outils/zone.py ville-hauts` : le dessin (`outils/zones/ville-hauts.json`) → le niveau, son contrôle, son plan vu du ciel avec courbes de niveau et pentes du parcours (hors dépôt) |

- **Dessiner une ville** = un fichier dans `outils/zones/` : `voies` (`pts` arrondis par `r`, quelques hauteurs `y` ; `l` chaussée, `t` trottoirs de 3 m ; `sol` "paves" pour une ruelle,
  "sable" pour une allée ; `g`, `d` : "maisons", "boutiques", "residences", "rien", ou par bouts), `places`, `objets` (repères), `etapes` du parcours, `depart`. Une rue qui en croise une
  autre prend sa hauteur toute seule. **Ne jamais retoucher le niveau à la main** (un test compare) : changer le dessin, relancer l'outil.
- **Ce qui est refusé** (`zoneControle`) : tout ce que refuse une ville dessinée, plus une traversée en biais (> 28°) ou trop longue, une pente de plus de 11 %, et **plus de 45 m (25 s) sans
  qu'il se passe quelque chose** (`evenementsZone` : virage, changement de sol, carrefour, cassure de pente, boutique, passant, Pokémon, repère).
- **La piste** prend la hauteur de la zone (piste.js, `if (ZONE)`), et le terrain du monde la rejoint à son bord (champ.js). `SUR_PLAN` = l'une ou l'autre ville.
- **La caméra** ne suit la pente qu'à 40 % dans une zone (`PENTE_VUE`, camera.js) : la rue monte ou plonge devant soi ; ailleurs, rien ne change.
- Coût : 205 000 triangles au plus à l'image (297 000 pour `ville-place`), prête en ~2 s.
- **Pas encore** (étapes 14 à 16) : voitures qui roulent, Ronflex et fourches en ville, sortir de la ville.

### Les villes tirées au sort (24/11, étape 13, lot 3 : `jeu/villes.js`)

Marcheur elliptique → Créer un circuit → Générer → « À pied, en ville » : longueur (0,5 à 1,5 km de jambes, 0,75 à 2,25 km de décor), relief (plat, vallonné, ça grimpe), genre (surprise, vieux
bourg, pavillons, immeubles, sur un coteau). Sans navigateur : `python riviere/outils/generer.py --activite terre --style pied --km 1.5 --denivele 12 --graine 7`. Mêmes options, même ville partout.

- **Le tirage** (`tirerVille`) : une trame de carrefours déformée (`trameVille`), chaque ligne est une rue ; quelques mailles sont coupées en deux par une ruelle, un escalier, une allée de jardin ou
  une rue en biais ; **le parcours est le bord d'un groupe de mailles** (`groupeVille` : le bon nombre de mètres, le plus de lieux, les coins les plus variés), donc toujours une boucle de vraies rues.
  Les rues : droites de chaque côté d'un carrefour, une courbe ou un S entre deux ; hauteurs : un versant et une bosse, bornés par la rue la plus raide ; une placette (à un coin, en bas, traversée
  en diagonale, boutiques sur ses deux autres côtés), la rue commerçante autour, un belvédère en haut (du côté où l'on court, là où ça descend). `SORTES_VILLE` = le caractère de chaque genre.
- **Ce qui ne se case pas lève une erreur** (angle, place, longueur) : le tirage est jeté sans rien calculer de lourd ; seules les villes qui tiennent passent `zoneControle` (~0,6 s). De 1 à 5 s en
  général, 15 s au pire. Dans la page, par lots de 8 (`k0`, `tranche`, `{suite}`) : rien ne se fige. Si rien ne tient : une autre graine, puis un autre genre, puis à plat (et c'est dit).
- **Nouveau dans une zone** : `marches: {a, b}` d'une ruelle (un escalier à 25 %, de vraies contremarches de 16 cm ; `PENTE_MARCHES`, permis là seulement), style « serre » (maisons serrées) et
  « mur » (`mur_ruelle` : mur à chaperon, lierre, portes, lanternes), `boutiques` et `garde` d'une place (façades, garde-corps), `jardins` (portails, bancs, kiosque, bosquets), `vues` (rien de haut
  devant un belvédère) ; un coin où l'on traverse deux rues de suite fait deux passages piétons ; des fenêtres au dos et au bout des bâtiments (`dos`, `pignon`). Tout cela est éteint sur `ville-hauts`.
- **Une longue ville reste légère** (`NIVEAU.sorte` : les villes tirées seulement) : le sol fin ne se voit qu'à moins de 135 m (au-delà un ruban par rue, 30 cm plus bas), les petits objets à 110 m,
  les clôtures à 130 m, un immeuble lointain devient sa silhouette (`immeuble_loin`). `LOIN`, `voirLoin` de rendu.js, `VU_DE` de decor.js. Au pire 300 000 triangles à l'image (835 000 avant),
  comme `ville-place` ; prête en 2 à 4 s, 5,5 s pour 2,2 km d'immeubles.
- Une ville ne se retouche pas pièce par pièce (le parcours quitterait le trottoir) : l'éditeur montre ce qu'on y traverse, on en génère une autre, on l'essaie, on la garde.

### La nature autour d'une ville (24/11, étape 14, lot 1)

Un chemin de terre est une voie comme une autre (`"sol": "terre"`, 2,1 m) : la même zone, le même sol, donc aucun raccord entre la ville et les bois.

- **Le dessin** : `nature: [{genre, nom, pts, cote?, esp?}]` dans la zone (`ZONE.aireEn` dit où l'on est, la dernière écrite l'emporte) : `foret` (troncs hauts à moins de 42 m du chemin, silhouettes
  `masse_bois` au-delà, sous-bois jusqu'à 15 m), `clairiere`, `pre` (bottes de foin, Pokémon de `sauvages.pre`), `verger` (rangs le long du côté `cote`), `potagers` (carrés et cabanes). `sauvages` du niveau =
  les Pokémon par genre. Styles d'un bord de chemin : `cloture`, `haie`, `rien` ; `cloture` marche aussi le long d'une rue. `marge` de la zone : 82 m, pour que le bois se ferme.
- **Les sorties de ville, une liste fermée** (`sortieZone`) : 1. la rue finit et le chemin part dans le **prolongement de son trottoir** (le 1er point du chemin = le bout de la rue décalé de l / 2 + 1,5 m) ;
  2. le chemin **arrive sur un trottoir à angle droit** (25° près). Le reste est refusé. L'étape d'un chemin : `cote: "m"` ; `ambs: {point: "bois"}` = l'air du lieu (région `kanto-plan`, `ambiances`).
- **Le sol** (`zone_dessin.js`) : le chemin est posé sur l'herbe et s'effiloche dans le shader (matière 10 : aucun trait) ; herbe de pré, sol de bois par aire ; hors des chemins, le sol est bosselé (`bosse`).
- **Les objets** : `contenu/objets/kanto-bois.js` (`arbre_bois`, `fougere`, `cloture_bois`, `entree_chemin`, `carre_potager`, `cabane_jardin`, `stere`, `table_bois`, `abreuvoir`…).
- **Léger** : `"sorte"` dans le dessin (ici `"bois"`) allume les distances de vue des longues villes ; un arbre du bois se simplifie à 95 m (`arbre_bois_loin`), le sous-bois disparaît à 55 m.
- Fabriquer : `python riviere/outils/zone.py ville-bois` depuis `outils/zones/ville-bois.json` (jamais le niveau à la main ; un test compare).

### Les villes tirées au sort, avec leur nature (24/11, étape 14, lot 2 : `jeu/nature.js`)

`nature` (0, .5 ou .7 : la part du tour hors de la ville) dans les options de `tirerVille` ; sans navigateur : `python riviere/outils/generer.py --activite terre --style pied --km 1.5 --nature .5 --denivele 12 --graine 7`.

- **La ville est tirée comme toujours** (une boucle de rues plus longue que ce qu'on en suivra : `cible`), puis `portesNature` choisit **deux portes** sur son bord : sorte 1 = une rue d'un coin qui sort de la ville
  (son amorce, 72 à 88 m : les maisons s'arrêtent à 34 m du bout, clôtures, verger ou potagers ; le chemin continue son trottoir) ; sorte 2 = le milieu d'une rue (le chemin part d'équerre, entre deux haies). De l'une à
  l'autre on suit les rues ; les rues du reste du bord existent, avec des amorces courtes. De préférence des portes qui laissent un coin à placette (Kiki aime qu'on coupe par la place).
- **Les hameaux** (`natureEntiere`) : au-delà de 640 m de chemin, un hameau ; au-delà de 1,5 km, deux. Un hameau = une rue de ~120 m, une entrée de sorte 2 en son milieu (une chapelle en face), une sortie de sorte 1 à son bout.
- **Chaque chemin** (`cheminNature`) : un arc dont la flèche est réglée par dichotomie pour faire la longueur voulue, déformé par de grandes boucles, vif par endroits et calme ailleurs ; à 30 m au moins des rues, à 22 m
  de lui-même, 16 essais. Pentes 6 % au plus (`kY`). Les paysages se suivent (`L0`) : un bois (essence `esp` de l'aire), autre chose (`champ` + `culture`, `lande`, `etang`, `verger`, `pre`), un bois d'une autre essence… ;
  `sac` = ce qui a déjà servi dans le tour. Un repère par paysage ouvert. `poser` refuse ce qui touche un autre objet ou le chemin ; là où rien ne se passe, un objet est ajouté.
- **À vélo** (marcheur elliptique), le décor défile trois fois plus : la longueur proposée s'arrête à 3,7 km de décor (`kmMax`).
- Le reste est celui d'une ville tirée : ce qui ne se case pas lève une erreur, seul ce qui passe `zoneControle` est rendu.

### La ville à vélo (24/11, étape 15, lot 1a)

La même zone, mais on roule sur la chaussée : `"velo": true` dans la zone, `"machines": ["velo"]`, `"allure": 1` (la vraie distance). Tout est derrière ce drapeau : une zone à pied n'en voit rien.

- **Les voies en plus** : `t: 0` = une route de campagne (ni trottoir ni bordure, un accotement de terre) ; `piste: {b, l}` = une avenue, de chaque côté une bande plantée de `b` mètres puis une piste cyclable de `l` mètres
  (`esp` : l'essence de ses arbres) ; `traces: true` = un chemin carrossable ; `rc` de la zone = l'arrondi des coins (6 m) ; `bateaux: [{v, s0, s1, raison: "travaux" | "portail"}]` = la chaussée monte au niveau du trottoir ;
  `vides` = pas de voiture garée là. Une rue et une route bout à bout : la bordure s'efface sur 16 m. Pas de plateau aux carrefours ; `ZONE.creux` dit de combien la chaussée est basse, la piste la suit en douceur.
- **Les étapes du parcours** (`cheminDeZone`) : `cote: "v"` la voie de droite (`decale` sinon un quart de la chaussée), `"p"` la piste cyclable, `"m"` le milieu ; `{v, de, a, s0, s1, u0, u1}` glisse d'un côté à l'autre.
  Virages : r 8 à 10 à gauche, 5 à 6 à droite ; une piste cyclable se prend et se quitte en tournant à droite à un carrefour (elle s'y évase).
- **Ce qui est refusé** (`parcoursVelo`) : rouler à gauche (hors carrefours), passer sur un trottoir sans bateau, plus de 36 m de trottoir pour des travaux (10 sinon), entrer sur la piste cyclable ailleurs qu'à un carrefour,
  quitter une route pour un chemin autrement que d'équerre ou bout à bout, plus de 130 m sans événement (`VIDE_VELO`).
- **Les objets** : `contenu/objets/kanto-velo.js` (`plate_bande`, `barriere_chantier`, `cone_chantier`, `tranchee`, `tas_paves`, `panneau_route` : travaux, barree, deviation, cyclable, sens ; `panneau_ville`, `borne_bois`).
- Fabriquer : `python riviere/outils/zone.py velo-cerisiers` (jamais le niveau à la main). La caméra ne regarde jamais à plus de 11° du cycliste.

### Les circuits à vélo tirés au sort (24/11, étape 15, lot 1b : `jeu/velo_villes.js`)

Vélo → Créer un circuit → Générer → « Ville et campagne » : longueur (1,5 à 4 km, la vraie distance), décor (`nature` .34, .5, .75 : la part de campagne), relief, « Ça tourne » (`sinueux` 0 ou 1), genre de ville. Sans navigateur :
`python riviere/outils/generer.py --activite terre --style velo --km 3 --nature .5 --denivele 15 --sinueux --graine 7`. Mêmes options, même circuit partout.

- **La ville** est celle de `tirerVille` (`o.velo`, `VE` dans villes.js ; sans ce drapeau, rien ne change et aucun tirage ne bouge) : des îlots plus grands, des parcs et une rue en biais (jamais de ruelle ni d'escalier), une placette qu'on
  longe, des commerces sur deux rues du parcours, un style de façades par bout de rue. `avenueVelo` : une rue du tour prise ET quittée en tournant à droite devient l'avenue et sa piste cyclable (deux circuits sur trois).
  `travauxVelo`, `rueBarree` : un bout de rue tout droit, un circuit sur trois environ, **jamais annoncée** (ni dans le bilan, ni par un panneau qui dit où passer).
- **La campagne** (`campagneVelo`) : d'une porte de la ville à l'autre, des **files** de morceaux (`filesVelo`, par exemple `"rhr|cs|r"`) : `r` petite route, `h` hameau, `c` chemin carrossable, `s` sentier (`VELO_SORTES`). Dans une file,
  deux morceaux se suivent **bout à bout**, au milieu d'un bout droit ; d'une file à l'autre on **tourne d'équerre** à un croisement, et la voie la plus importante continue de l'autre côté (`suite`, ~110 m). Un arc porte les croisements,
  sa flèche est réglée par dichotomie pour la longueur. Un grand tournant se fait en plusieurs fois (`tourner`). Un paysage tous les 120 à 190 m, un repère par paysage ouvert.
- **Rouler à deux** (pas encore joué) : `deux` sur chaque voie (faux sur un sentier), rien de dur à moins de 1,4 m du parcours là où c'est vrai.
- **Deux voies bout à bout n'en font qu'une** (25/11, ⚑ de Kiki : « quand la route se rétrécit, c'est assez bizarre » ; zone.js, toutes les zones à vélo) : la plus étroite part de la largeur de l'autre et s'affine en 30 m (12 m sur la
  terre : `evase`, `AFFINE`, `demi`), la chaussée ne gonfle jamais (`paires` : réunies sans arrondi), le trottoir d'une rue qui devient une route s'arrête en biais à son bout (`finT`).
- **Dans le moteur, à vélo seulement** : `net` (là où le goudron finit et où la terre continue, une coupe droite), un étang est posé sur un sol à plat (`aplat`). `files` dans un niveau = un circuit à vélo tiré au sort : il est allégé
  (bâtiments jusqu'à 92 m du parcours, bois des îlots plus clair, `PETITS_VELO`, ombres des feuillages redessinées 5 fois par seconde).
- **Les réglages qui comptent** : portes à moins de .46 × la campagne (`portesNature(…, velo)`), croisements entre 46° et 132° avant redressement, rayons `r` de `VELO_SORTES`, pente 5,4 % (6,6 % si ça grimpe).

### L'eau dans une ville (25/11, étape 15, lot 2a)

Une rivière se décrit dans la zone comme une voie : `"eaux": [{id, nom, y (la hauteur de l'eau), pts: [{x, z, r, l (la largeur ici)}], g, d}]`. `g`, `d` = ses berges (d : à droite du fil de l'eau) par bouts
`{a, b, style, …}` : `"quai"` (un mur droit ; `prom` la promenade sablée, `ea` où sont ses arbres, `pierre` la largeur de la pierre du bord, `garde` "fer" | "muret" | "rien", `arbres` l'essence ou "rien", `bateaux: false`) ;
tout le reste est un talus. Sans `eaux`, rien ne change nulle part.

- **Le sol** (zone.js, `solBerge`) : un quai garde sa hauteur jusqu'au mur ; un talus descend jusqu'à 35 cm sous l'eau, sans jamais toucher une voie (plate en travers) ; entre les deux, le mur sort de terre sur 22 m. `ZONE.eauEn(x, z)` →
  `W` : `e` la distance au bord (négative : dans l'eau), `k`, `s`, `u`, `y`, `q` (1 = quai) ; `ZONE.enEau(v, s, u)` un point de l'eau. Dans `champs` : `D.w` (le bord), `D.o` (le bord d'un tablier), `D.m` (la pierre du bord d'un quai).
- **Le dessin** (zone_dessin.js) : la trame est coupée exactement au bord de l'eau, et le mur du quai part de cette coupe même (matière 16) ; `construireEaux` pose l'eau, un ruban avec la matière de l'eau du rameur, sous les ponts et un peu
  sous les berges : c'est le sol qui la coupe. Aucun trou possible.
- **Un pont** : une voie qui passe au-dessus de l'eau, sans rien dire de plus (`v.ponts`, trouvés tout seuls). Là, le sol est le tablier ; l'eau continue dessous, entière. `pont: "bois"` ou pierre (`arches`, `bout` : ce que le parapet
  dépasse sur la rive). On passe dessous par l'eau (le rameur, lot 3) ; **jamais à vélo** : une seule hauteur de sol par endroit.
- **`sol: "cyclable"`** : une piste cyclable à elle seule (2,6 m). Elle touche une rue : la chaussée monte au niveau du trottoir et la traversée est peinte, toute seule. Elle suit un chemin de terre bout à bout (halage). Passages refusés :
  entrer sur la piste ailleurs, la quitter pour un chemin autrement que bout à bout, rouler dans l'eau, un objet dans l'eau (sauf `flotte`).
- **L'habillage** (`habillerEaux`, zone_plan.js) : ponts, garde-corps, platanes, bancs et réverbères de la promenade, péniches et barques, échelles ; sur un talus joncs par nappes, nénuphars, saules. `sauvages.eau.nums` = les Pokémon qui
  vont et viennent dans la rivière (`bouge: {"type": "va"}`). Objets : `contenu/objets/kanto-eau.js`.
- **Le circuit d'essai** « La boucle des Quais » (`velo-quais`) : `python riviere/outils/zones/velo_quais.py` (la rivière d'abord, tout le reste en parallèles exactes) écrit le dessin, puis `python riviere/outils/zone.py velo-quais`.
- **Pour le rameur (lot 3)** : la rivière a déjà son tracé, sa largeur et sa hauteur ; l'eau passe sous les trois ponts avec la place qu'il faut. Reste à y poser une piste (sa hauteur = `eaux[k].y`, pas `ZONE.sol`) et à ne pas dessiner deux eaux.

## Moins de défauts à la source (24/11)

- **Les objets posés au sol** (decor.js, `PIED_OBJET`, `assiseDe`) : le sol est regardé sous tout le pied de l'objet, plus seulement sous son milieu. Une règle ne pose pas un objet mal
  assis ni dont le pied dépasse sur l'eau ; un objet posé par le niveau descend jusqu'au sol. Le contrôle refuse un objet qui flotte encore de plus de 15 cm (circuits non cachés).
- **D'une rive à l'autre** (champ.js, `poidsSol`) : le dessus du sol est d'une rive OU de l'autre, par taches ; une paroi prend la couleur de la rive qui la fait monter (plus de berge
  verte au-dessus, jaune ou brune au-dessous). `"decor": "classique"` garde l'ancien mélange.
- **Le bord des ombres** (effets.js, `ombreEn`) : seize lectures de la carte au lieu de quatre, un bord lisse et net ; plus de dents de scie quand le soleil est rasant (+1 ms par image sur le PC de Kiki).
- **Étais de mine** en travers de la galerie (ils étaient plantés dans l'axe, au milieu de l'eau) ; écume des rapides en traits fins ; ailes de pont en pierre.
- **Inspecter** : `python riviere/outils/inspecter.py <circuit> --pas 10` = une image tous les 10 m, en planches (hors dépôt). **À regarder avant de donner un circuit à Kiki.**
- **⚑ Signaler** (jeu/signaler.js) : en course, un toucher garde le circuit, le mètre et l'image ; l'appli les range tout de suite dans `data/riviere/signalements/<date>.json` (dépôt privé ;
  un bouton caché d'app.py, dans un fragment : la partie n'est pas rechargée), sinon au chargement suivant. À relire quand Kiki dit « regarde mes signalements ».

## Ajouter une région (un autre style)

**Le plus court : hériter.** `{"nom": "Johto", "herite": "kanto", "palette": {"feuilles": [...]}, "regles_plus": [...]}` : elle ne redit que ce
qui change (couleurs, arbres, règles en plus ; `regles` à la place de celles du parent). Une ville moderne sans Pokémon : une région qui hérite,
des rives `quai` et `ville`, des objets `immeuble`, `entrepot`, `lampadaire`, et ses propres recettes. Sinon, tout écrire :
un fichier `contenu/biomes/<nom>.json` (couleurs du ciel, de l'eau, des sols ; `rives` : un profil de hauteurs par sorte de rive ;
`palette` des objets ; `regles` de pose ; `forets` : les forêts en masse, voir « Les effets du rendu » ; `terres` : les couleurs de la terre et du goudron), un `contenu/lieux/<nom>.json`, et les
objets propres à la région dans `contenu/objets/<nom>.js`. Les niveaux choisissent leur région : `"biome": "johto"`.

## Ajouter une surface, une monture, une machine

(12/11) `paves` : une rue pavée à bordure de pierre (mode 2 de `matRoute`). Les couleurs des revêtements d'une région : `terres` dans sa fiche.

- **Surface** : `SURFACES.sable = {materiau, liquide: false, monture: "coureur", poussiere: "#E8D69C"}` (voir `matRoute` dans `surfaces.js`).
- **Monture** : `MONTURES.velo = {enfonce: 0, foulee: 0}` ; une surface choisit sa monture.
- **Les nageurs** (14/11, Kiki : « plus immersif », chaque Pokémon à sa vraie taille) : `contenu/nageurs.json` = la liste des Pokémon qui
  peuvent nager (17, choisis par Kiki sur la planche claude.ai/artifact/AeSgitR57qjcJZ1vSQEwUs) : `num`, `nom`, `enfonce` (la part du corps
  sous l'eau), `style` (`NAGES` de monture.js : `glisse`, `brasse`, `ondule`), `part` (un serpent : sa taille officielle est sa longueur,
  son sprite dressé n'en montre que 0,6). **La taille n'est pas dans la fiche : c'est celle du Pokédex** (`pokedex.TAILLES`, ajoutée par
  `page.nageurs()`). Ajouter un nageur = une ligne (page.py met sa planche dans la page). Choix au menu du rameur (« Ton Pokémon »,
  `riviere_nageur`, changé tout de suite : `changerNageur`), `?nageur=131` pour essayer. Sur la terre : le Pokémon du circuit, comme avant.
  - `sprites.js` : `Nageur` (un `Pantin` à deux matériaux : au-dessus de l'eau tel quel avec un liseré d'écume à la surface ; dessous,
    bleuté, effacé avec la profondeur, ondulant, dessiné sans contrôle de profondeur), `GABARIT` (`f` : le recul de la caméra, taille^0,42,
    de 0,76 à 1,85 ; `hw` : la demi-largeur du corps à la ligne d'eau, lue sur le sprite), gouttes de plusieurs tailles (`gerbe(…, large, nb)`).
  - `monture.js` : `nager` : la nage suit **les coups de rame** (`S.phi` de jeu.js : 0 = le coup part, 1 = le suivant est attendu) : il
    s'élance, sort un peu de l'eau, roule d'un bord sur l'autre, s'étire, son animation fait un cycle par coup ; sans coup depuis
    1,7 période, elle tourne au ralenti. Embruns continus à fond.
  - `surfaces.js` : le sillage à la largeur du corps (`uCorps` : demi-largeur, élan du coup) : eau brassée, deux bras en pointillés
    d'écume accrochés à l'eau, frange claire, col autour du corps, vague poussée devant à chaque coup, ronds des coups à sa taille.
  - `camera.js` : recul, hauteur et point visé multipliés par `GABARIT.f` (filtre de 0,9 s) ; sous une voûte, jamais plus haut que 2,9 m.
  - Le fantôme a la taille et l'enfoncement du nageur (`fantomeOublier` quand on en change). Les adversaires : inchangés.
- **Machine de sport** : `jeu/allure.js`, `MACHINES` (vrais mètres par geste, allure du décor, records à part). `?machine=elliptique`, `?machine=velo`.
  Une machine `continu` reçoit une vitesse ; `physique` : des watts deviennent une vitesse (poids, pente, air) et le décor ne triche plus avec la pente.
- **Le marcheur elliptique** (12/11, Kiki : son appareil du parc n'est pas un elliptique, les pieds restent à plat, mouvement de ski de fond) : la clé
  reste `elliptique` (sujet de la montre, records), seul le nom affiché change (`nom`, `montre` = le nom sur la montre). Au menu, « Ce que tu
  vois » : **ton Pokémon trottine** (par défaut depuis le 16/11, monture `trotteur`, voir ci-dessous) ou **à vélo** (monture `cycliste`) ;
  `?monture=cycliste` pour essayer. Les rollers (12/11) ont été retirés le 16/11 (Kiki : « ridicule »), l'ancienne vue « il court » aussi :
  qui les avait choisis voit le trot.
  **Vitesse vue** (`VISUEL`, `VU`, `kmhVus`, `allureVue` dans allure.js) : le décor défile à l'allure de ce qu'on voit, pas à tes vrais mètres
  par seconde. À vélo : 15 km/h à l'allure habituelle (55 tours/min), 20 à +25 %, 25 à +50 %, 30 au plus. Au trot : 6,5 km/h à l'allure
  habituelle, 8 à +25 %, 10 au plus (Kiki : un footing léger, 6-7 km/h à l'œil, surtout pas une course). Une vraie côte freine (`1 - pente × 6`,
  au moins 0,38), une descente lance (× 1,5 à vélo, × 1,25 au trot). Les chiffres affichés restent les vrais. **Un record par discipline**
  (Kiki, 16/11 : un circuit peut servir à plusieurs disciplines, jamais un temps de trot comparé à un temps de vélo) : `CLE_MACHINE` =
  `elliptique-trotteur` ou `elliptique-cycliste`, et les vrais mètres d'un tour (`TOUR_M`) diffèrent, donc la clé du circuit aussi.
- **Les trotteurs** (16/11, Kiki : comme les nageurs du rameur, sur la terre) : `contenu/trotteurs.json` = les Pokémon terrestres qui
  trottinent au marcheur elliptique, vus de dos, en sprites de Donjon Mystère : `num`, `nom`, `cycles` (cycles de marche par tour de jambes de la
  machine : 1 = foulées posées, 2 = foulées vives, pour un petit), `foulee` (le petit rebond de chaque foulée, pour un Pokémon d'un mètre).
  **La taille n'est pas dans la fiche : c'est celle du Pokédex** (`page.trotteurs()`). Ajouter un trotteur = une ligne (page.py met sa
  planche de marche dans la page). Choix au menu du marcheur elliptique (« Ton Pokémon », `riviere_trotteur`, changé tout de suite :
  `changerTrotteur`), `?trotteur=25` pour essayer. **Liste provisoire** (Pikachu, Caninos, Ponyta) : Kiki choisit ses trois sur la planche
  claude.ai/artifact/D6K5xVakUEcE9hDZkRRU9H (8 candidats ; Évoli, Rattata et Tauros ont 7 images de marche, les trois proposés 4).
  - `contenu/montures/trotteur.js` (une monture du CONTENU, pas du cœur) : `MONTURES.trotteur = {animer: trotter, trace: Infinity}`.
    `trotter` : **le trot suit tes gestes** : un tour de jambes = `cycles` cycles de marche, recalés en douceur sur chaque geste reçu
    (`TROT.corr`) ; sans geste, il ralentit puis finit sa foulée et se pose. Petit rebond, corps penché dans le virage, un peu de poussière à
    chaque foulée (`poussiereTrot`), ombre à sa largeur (par la hauteur dite à `OMBRE_U` : surfaces.js n'est pas retouché). La taille vient du
    corps sur la première image (`corpsTrotteur`) : la planche d'une marche qui bondit est plus haute que son Pokémon.
  - Les accroches dans le cœur (trois lignes) : `monture.js` appelle `mt.animer` si la monture en a une (après avoir choisi la rangée du
    virage) et lit `mt.trace` (les mètres entre deux poussières) ; `sprites.js` : `changerNageur` passe la main à `changerTrotteur` quand
    `trotteurActif()`. La caméra s'adapte par `GABARIT.f`, comme pour un nageur ; le fantôme a sa taille.
  - Sur l'eau (une pièce d'eau dans un circuit de terre), le trotteur redevient un Pokémon ordinaire : il n'a pas de fiche de nageur.
  - **Retours de Kiki du 18/11 (Caninos), faits** : les **adversaires sont à leur vraie taille** comme lui (`hauteurVraie` de rivaux.js : Pokédex
    et corps de la première image ; avant, la taille du dessin × 1,25 : Caninos adversaire 1,2 m, le sien 0,73 m) ; **l'ombre est sous ses pattes**
    (avant : une ellipse un peu derrière lui, côté caméra, « il flotte à 20 cm ») : `OMBRE_U.uOmbre.z` = 2 + sa taille, surfaces.js la centre un
    peu devant lui, son dos en cache la moitié, on n'en voit qu'un liseré collé aux pattes ; **il ne dérape plus dans les virages** : penché de
    2° au plus (7° avant), de trois quarts seulement dans un vrai lacet (`orienterPantin(…, .06)`, rayon < 17 m) et la caméra se penche trois
    fois moins (`MONTURES.trotteur.roulis` = 0,3, lu par monture.js → `CAM.roulisF`) ; **une côte ne le freine presque plus** (`VU.cote`,
    `VU.min` d'allure.js : au trot, −16 % à 10 % de pente, −18 % au plus ; avant, −60 % : « en footing, on garde son allure, ça consomme juste plus »).
- **Les sprites qui suivent la caméra** (17/11, Kiki : le film de fin montre ton personnage de face, de côté, d'en haut) :
  `contenu/montures/directions.js`. Un sprite est une image plate : on choisit l'image d'après l'angle entre la direction où va le personnage
  et celle d'où regarde la caméra (`angleVue` : 0 = de dos, positif = vers la droite de l'écran, ±π = de face ; `rangeeVue` = la rangée de
  Donjon Mystère, 0 = face, 2 = droite, 4 = dos, 6 = gauche). `orienterPantin(N, s, d)` : tant que la caméra est derrière (moins de 30°, le
  jeu), la règle d'avant, identique au pixel près (de dos, rangée 3 ou 5 dans un virage serré) ; sinon l'angle de la caméra. Appelée pour
  ton Pokémon (nageur, coureur, trotteur : monture.js, trotteur.js) et pour son fantôme (fantome.js). Les sprites ont 8 angles : quand la
  caméra tourne autour de toi, l'image change par crans de 45°, comme dans les jeux en sprites.
- **Le cycliste en sprite** (17/11, Kiki : « une vraie planche de sprites dessinée avec soin » ; vue par défaut au vélo et au marcheur elliptique
  « À vélo »). La planche : `contenu/montures/cycliste.png` + `cycliste.json`, notre propre dessin, faite par `outils/atelier_velo.py`
  (`python riviere/outils/atelier_velo.py`, ~5 min ; `<dossier> --apercu` pour une grande image ; `--vite` : une image sur quatre). L'atelier
  dessine un squelette 3D (vélo et dresseur articulés : pieds sur les pédales, mains au guidon) pixel par pixel à 30 pixels par mètre, trois
  tons et un trait sombre par matière, sous 7 angles (0 = de dos, 12 et 25 = les virages du jeu, 45, 90 = de côté, 135, 180 = de face ;
  l'autre côté = le miroir, jamais pour 0 et 180 : le carter est à droite) et 4 animations : il pédale (8 images), en danseuse (8),
  roue libre ramassé (4 : les rayons tournent), pied à terre (1). La tête se relève vers la face (`LEVE` : de dos comme avant) pour que
  la visière ne cache pas le visage. Couleurs-clés (`cles` de la fiche) repeintes aux couleurs de la carte du dresseur dans la page
  (`cycTons`, les tables `TENUES` de cycliste.js ; le vélo prend la couleur de la casquette ; `?tenue=` pour essayer). `page.cycliste_sprite()`
  glisse la planche dans la page (`CYCLISTE_SPRITE`, ~180 Ko ; pas dans le contrôle sans navigateur).
  - `contenu/montures/cycliste_sprite.js` : `MONTURES.cycliste` = le sprite (`pedalerSprite`) ou le vélo 3D (`MONTURES.cycliste3D`), au
    choix du menu (« Ton cycliste : En sprite / En 3D », `riviere_cycliste`, tout de suite, sans recharger : `CYC.choisir` ; `?cycliste=3d`).
    `pedalerSprite` : les règles du vélo 3D (velo.js) : pédales au rythme de la machine (`MACHINE.tourVu`, petit braquet en côte),
    `VELO.cadence` tenue à jour (jeu.js l'affiche sans capteur), danseuse au-delà de 5,5 % de montée, ramassé en roue libre dans une
    descente rapide, pied à terre après 0,5 s d'arrêt et au menu ; il penche dans le virage comme un vrai vélo (`atan(v² × courbe / g) × 1,5`,
    filtré) et la bascule s'efface vue de côté (× cosinus de l'angle de la caméra). Ombre et trace du pneu (`OMBRE_U`, comme le vélo 3D),
    poussière de la roue arrière (`trace` de la monture). Ton Pokémon (celui du circuit) court à côté, à sa vraie taille, un peu devant à ta
    gauche, saute de joie à chaque tour. Le fantôme : le même cycliste en transparence, 1,8 m à droite (`fantomeCyclisteSprite`).
  - **Trois façons de voir ton cycliste** (17/11, Kiki) : menu « Ton cycliste » (`riviere_cycliste`, `?cycliste=sprite|mixte|3d`, `CYC.choisir`,
    tout de suite) : **Tout en pixels** (par défaut), **Vélo 3D, dresseur en pixels** (`mixte` : le vélo 3D de velo.js avec son panier et
    ton Pokémon dedans, et ton dresseur en pixels dessus : planche `cycliste_seul.png` + `.json`, `atelier_velo.py --seul`, le dresseur sans
    vélo, calé sur le vélo 3D : son pédalier (-.02, .30), ses pédales à 13,5 cm, ses poignées, sa selle ; à l'arrêt il penche à droite
    comme le vélo 3D et pose le pied droit), **Tout en 3D** (le dresseur à facettes). En `mixte`, velo.js appelle `cyclisteSurVelo` à la
    place du dresseur à facettes : l'image du pédalier suit `VELO.pedale` (image = (pédale + π/2) / 45°), la bascule suit `VELO.incl`, et
    l'image est avancée de 38 cm vers la caméra (`devant`) : devant le cadre et la selle, derrière le panier ; le fantôme : `fantomeCyclisteSurVelo`.
  - **Les roues sur le sol** (17/11, Kiki : elles rentraient dans le sol) : vu d'un peu au-dessus, la roue la plus proche descend sous le
    point d'appui ; chaque rangée de la planche connaît son plus bas pixel (`pl.bas`) et l'image est relevée d'autant (`leve`).
  - Accroches dans le cœur : `monture.js` appelle `mt.animer` avant de demander le Pokémon (le cycliste s'anime même sans lui) ;
    `camera.js` : la vitrine du menu tourne aussi autour du cycliste en sprite (`vitrine(dt, S, ancre)`), sans le décalage de côté du vélo
    3D ; `cacherVelo` cache aussi le sprite (redéfini dans cycliste_sprite.js). Records : les mêmes qu'en 3D (même machine, même vue).
- **Plein écran** (jeu.js, `PLEIN`) : demandé au premier toucher (dans l'appli : la page de l'appli entière), petit bouton sous « Son » pour
  en sortir ou y revenir ; sorti une fois, il ne revient plus tout seul pendant la visite (`riviere_plein_non`, sessionStorage).
- **Annuler une séance** : à la fin d'une vraie séance, « ✕ Annuler la séance » en haut (deux touchers) ; au menu, « Annuler la
  séance interrompue » (`riviere_encours`, avec `machine` : seule la machine du moment la propose).
- **Les séances enregistrées, toutes machines** (14/11, étape 1 du plan) : `jeu/seance.js`, `garder` écrit dans `pkm_rameur` une séance au même
  format pour les trois machines, avec `machine` ; l'appli l'envoie (`seances_rameur.ranger`) : le rameur dans `data/rameur/seances.json`,
  les autres dans `data/machines/seances.json`. Côté machine (`MACHINES` d'allure.js) : `enregistre` (les trois), `saisie` (le pavé de fin :
  le rameur seul), `capteurRequis` (le vélo : gardé seulement si un vrai capteur Bluetooth a fait avancer la séance, `S.capteurVu`, posé par
  `vitesseCapteur` en vraie séance ; sinon la fin dit pourquoi rien n'est gardé). Distances : `saisi.distance` (lue sur le rameur), `capteur.distance`
  (vélo) comptent ; `estime.distance` (marcheur elliptique, l'estimation vers le bas) s'affiche avec ≈ et ne compte jamais. Pour Poké Fit
  (`seances_rameur.MACHINES`) : rameur = `ROWING_MACHINE`, marcheur elliptique = `ELLIPTICAL`, vélo = `BIKING_STATIONARY`, chacune avec les règles
  de ce type ; une séance de la montre recouverte à plus de 50 % est remplacée (cœur et calories gardés). Le menu montre la dernière séance de
  sa machine (`D.dernieres`). Ajouter une machine : une ligne dans chacun des deux `MACHINES`.
- **Capteur Bluetooth** (`jeu/capteurs.js`, Chrome ou Edge) : home trainer, vélo, rameur ou elliptique connecté (FTMS), capteur de puissance,
  de cadence, ceinture cardio. Un home trainer pilotable reçoit la pente du circuit (voir « Une vraie route », le home trainer). **Écrit sans
  appareil** : la lecture des trames se contrôle par `window.__trames()`, tout le chemin par le faux home trainer ; à essayer sur un vrai.

- **L'ombre de la monture** (`surfaces.js`, `OMBRE_U` ; 17/11, Kiki : l'ombre tramée et la trace du pneu, « complexe et moche ») : une ellipse
  simple à deux tons nets (vélo : 0,95 × 0,26 m ; un Pokémon : 0,55 × 0,42 m), plus petite et plus pâle quand on saute ; plus de trace du pneu.
- **Ce qui suit le sol** (`contenu/objets/kanto.js` : `solLocal`, `lisseEnPente` ; 17/11, Kiki : dans les côtes, les barrières s'enfonçaient
  puis flottaient) : la barrière blanche et la glissière posent chaque poteau sur le sol à sa place et leurs lisses suivent la pente d'un
  poteau à l'autre. Un nouvel objet long (clôture, muret) fait de même.

## Les ambiances (ambiance.js, 12/11)

Tout passe par `COMMUNS` (uTeinte, uNuit, uPluie, uNeige, uSombre, la brume) et `CIEL.U` (dégradé, soleil, lune, étoiles, nuages, couverture,
éclairs) : aucun matériau ne connaît l'heure. Les matières d'un sommet (`F.matiere(n)`) : 3 fenêtre (éclairée la nuit), 7 lampe, 4 lumineux
(cristal, lave), 5 chute d'eau, 6 eau calme ; `K.lumiere(F, x, y, z, couleur, taille, toujours)` = un halo tramé, et les six lumières les plus proches éclairent vraiment ce qui les entoure (`lumieresProches`). Chaque vitre (matière 3) tire son sort : allumée entière ou éteinte, de plus en plus au crépuscule. Les étoiles sont fixes, d'éclat varié, leur nombre propre à chaque niveau (`"etoiles": 1.5` dans un niveau pour plus). Un repère lointain peut fumer : `K.panache({y, haut, large, vent, duree})`. Une région peut redéfinir `heures`,
`ambiances`, `particules`. Essai : `window.__ambiance("nuit", "pluie")`, ou `?heure=nuit&meteo=orage`.

## Les effets du rendu (15/11, étape 9 du plan)

Quatre effets, **chacun une option** : `EFFETS.eau`, `.vent`, `.foret`, `.ombres` (`depart.js`). Allumés partout, sauf là où quelqu'un dit non,
dans cet ordre : la région (`"effets": false`, ou `{"ombres": false}`), le circuit (de même : **`kanto-1km` dit `false`**, il reste identique
à l'œil), le choix du menu (Réglages, Ambiance, « Les effets » : Avec / Sans, gardé sur l'appareil, `riviere_effets`), l'adresse (`?effets=0`,
`?effets=1` : tous, même sur un circuit qui dit non, `?effets=eau,vent`). **Éteint, un effet n'ajoute pas une ligne aux shaders ni un triangle
au monde** : le monde sans effets est celui d'avant, au bit près (vérifié le 15/11 sur les 7 circuits).

- **L'eau qui coule** (`surfaces.js` : `courantEau`, `EAU_COURANT`). Chaque mètre de la piste connaît son courant (`aFlot` : vitesse le long
  de la piste, remous, calme). L'eau descend la rivière avec toi (~0,6 m/s), plus vite là où elle se resserre ; elle dévale les pentes de plus
  de 2 % ; autour d'une remontée (la Cascade), elle vient vers toi ; un lac ou la mer n'ont pas de courant. Les reflets naissent, dérivent
  avec le courant et s'éteignent (deux couches décalées d'une demi-vie) ; là où ça file, des filets clairs ; en aval d'une chute ou de
  rapides, des flocons d'écume qui s'en vont sur une cinquantaine de mètres. Rien à écrire dans un niveau.
- **Le vent** (`effets.js`, `forme.js`). Une recette dit ce qui plie : `F.vent(force, y0, y1)`. Arbres, buissons, roseaux, palmiers et la
  forêt en masse le font. Les rafales traversent le monde dans le sens du vent (`VENT_DIR`, le même que celui des feuilles et de la pluie) ;
  leur force suit le temps qu'il fait (`uVf` : 0,8 par beau temps, 2 par grand vent ou orage). Le temps du vent avance par crans de 1/10 s :
  le feuillage bouge comme un sprite animé.
- **Les forêts en masse** (`decor.js`, après les règles). `"forets"` dans la région : `[{sur, bande, maille, bosquets, objet, pres}]`. Sur les
  rives nommées, entre `bande[0]` et `bande[1]` mètres du bord, une trame de `maille` mètres d'arbres réduits à leur silhouette (`arbre_masse` :
  15 triangles, 30 à moins de `pres` = 62 m) ; `bosquets` (de 0 à 1) : seulement par taches, avec des clairières. Elles ont leur propre hasard
  et passent après tout le reste : **le décor posé un à un ne bouge pas d'un objet**. Plafond : `forets_max` arbres (3 200), éclairci partout
  pareil s'il est dépassé. Rangées par carrés de 64 m (maillages « foret », `MONDE.foret`, `MONDE.masse`). Poids : 15 000 à 48 000 triangles
  de plus par circuit, 0,03 à 0,2 s de construction.
- **Les ombres portées** (`effets.js`). Le soleil « photographie » le monde autour de la caméra (carte de profondeur de 2 048 points pour
  160 m de côté) ; `ombreEn(point, normale, distance)` dans les shaders dit si un point est caché du soleil. Deux tons, bord net, jusqu'à
  ~70 m de la caméra. Portent une ombre : terrain, rives, décor, forêt, ponts. En reçoivent : tout le monde solide (`MAT_MONDE`), l'eau (qui
  fonce et brille moins), les routes. **Les grottes n'en reçoivent pas** (`MAT_ABRI` pour les voûtes et le décor posé dans une grotte, `aAbri`
  sur la piste) : elles gardent leur lumière. Elles suivent l'heure, s'effacent la nuit, sous un ciel couvert, la pluie, la brume. La carte
  n'est refaite que si la caméra a avancé d'un cran de 10 m, si le soleil a tourné, ou quand le vent bouge les feuillages (10 fois par seconde
  au plus). La monture garde son ombre dessinée (elle bouge à chaque image).

Si la machine peine (`regler`, jeu.js), les effets partent en premier : les ombres, puis la forêt en masse, puis seulement la finesse et la
vue ; ils reviennent quand tout va bien. Coût mesuré le 15/11 sur ce PC (image de 1 024 × 768, vitrine) : environ 6 ms par image sans,
7,5 ms avec (mesures bruitées dans le panneau de Claude : le vrai verdict est `?banc=1` sur la tablette, avec puis sans).
Essais : `?effets=0`, `?effets=ombres`, `?meteo=vent`, `?heure=soir` (ombres longues), `OMBRES.images` (cartes refaites), `MONDE.masse`.

## Le rendu plus réaliste (18/11, Kiki : « mi-pixel, mi un peu plus réaliste », à essayer)

Trois interrupteurs, **éteints par défaut**, chacun à part : `REEL.lumiere`, `REEL.reflets`, `REEL.matieres` (`depart.js`). Le décor reste celui
de Kanto (mêmes objets, mêmes Pokémon) ; seule la façon de le peindre change. Menu : ⚙ Réglages → « Un rendu plus réaliste », pour chacun
« Comme avant » / « Plus réaliste » (gardé sur l'appareil : `riviere_reel` = `"lumiere,reflets,matieres"` ; changer recharge la page, les
shaders se font au départ). Adresse, qui passe devant : `?reel=1` (tous), `?reel=0`, `?reel=lumiere,reflets`. Ils valent pour tous les
circuits, `kanto-1km` compris (c'est Kiki qui choisit). **Éteints, ils n'ajoutent rien aux shaders** : le monde est celui d'avant (contrôlé le
18/11 sur kanto-1km, vichy-lac, terre-ville, col-ventoux et vitrine : mêmes shaders, commentaires à part).

- **La lumière** (`LUMIERE_GLSL` de rendu.js : `lumiere(normale, ombre)`). **Sur le sol** (matières 0 et 1) : plus de paliers, une lumière
  douce, un ciel bleuté qui éclaire d'en haut (les faces à l'ombre bleuissent) et un soleil chaud. **Sur les objets** (matière 2 et plus :
  arbres, buissons, maisons, toits) : leurs paliers restent, un peu plus marqués (×1,2 autour de 0,8), bleutés côté ombre et chauds côté
  soleil (18/11, Kiki : en lumière douce, les arbres devenaient « une boule un peu en 3D avec une ombre », fades ; leurs faces nettes sont
  leur charme). Une face à plat au soleil reçoit la même lumière qu'avant (~1) : la route,
  qui n'a pas d'éclairage, ne jure pas avec l'herbe. Les ombres portées ont un bord flou (`ombreEn` de effets.js : les quatre lectures trois
  points de carte plus loin, ~23 cm). Le ciel : dégradé sans bandes, un halo large autour du soleil. La petite image finale (`POST`) : contour
  plus léger, couleurs un peu plus riches et contrastées, bords de l'image un peu plus sombres. Les pixels restent : c'est le « mi-pixel ».
- **L'eau** (`EAU_REEL`, `EAU_SOLEIL` de surfaces.js). Elle reflète le ciel (les couleurs du ciel de l'heure : `CIEL.U`), de plus en plus quand
  on la regarde de loin (Fresnel) ; des vaguelettes la rident (une normale qui ondule : sinus et bruit doux, jamais par carrés, qui faisaient
  des traînées en éventail vus de près) ; le soleil y scintille (pas la nuit, pas par temps couvert) ; le long d'une vraie berge (écume de
  rive) elle fonce, comme le reflet des rives ; sous une voûte, ni ciel ni soleil (`aAbri`, posé aussi quand seul cet interrupteur est allumé :
  `ABRI_PISTE`). L'écume, le sillage, les ronds et les reflets d'avant se posent par-dessus.
- **Les matières** (`MATIERES_GLSL` de rendu.js, `BRUIT_GLSL` : un bruit doux). Sur les sols naturels (matière 0) : des taches du plus frais
  au plus sec (jusqu'au loin : plus d'herbe uniforme), des touffes et un grain par carrés de 17 cm de près ; les parois : la roche par bancs ;
  les pavés : usés par endroits ; les routes et chemins (`ROUTE_FS`) : des taches et du grain. Aucune image : tout est calculé.

Coût mesuré le 18/11 sur ce PC (Adreno, image de 1 280 × 800, médiane de trois endroits) : vichy-lac 8,3 → 10,3 ms, kanto-1km 7,4 → 7,8 ms,
col-ventoux 8,1 → 9,0 ms avec les trois (chacun seul : à peine mesurable, mesures bruitées). Si la machine peine, `regler` (jeu.js) coupe
d'abord les ombres et la forêt, comme avant ; ces trois-là ne se coupent pas tout seuls.

## Le jeu

Adversaires (`jeu/rivaux.js`, menu) : trois Pokémon de la région (`rivaux`) à allure fixe, réglée sur ton record ; classement sous le tour.
Segments, profil d'altitude (dès 1,5 m de relief) et arrivée d'un parcours de A à B : `jeu/parcours.js`. Puissance affichée quand il y en a une.

**Records, fantôme et records de segments sur le serveur** (`jeu/records.js`, 14/11, étape 2 du plan) : ils suivent le joueur d'un appareil à l'autre.
- **La clé d'un circuit** (`CLE_CIRCUIT`) = machine (`CLE_MACHINE`, rien pour le rameur), circuit (`NIVEAU.id`), vrais mètres d'un tour, et
  l'**empreinte du tracé** (`EMPREINTE` : un hachage de la piste construite, un point tous les 10 m arrondi au mètre, plus sa longueur et `TOUR_M`).
  Tracé modifié (un virage, une longueur, un changement de `piste.js`) = autre circuit, classement à zéro ; changer le décor ou la région ne change rien.
  Les clés de la machine en découlent : `riviere_<clé>_record`, `_fantome`, `_segments`.
- **Lecture** : l'appli donne `D.records` (tout `data/riviere/records.json` du joueur, `seances_rameur.records_pour_le_jeu`) ; le jeu prend le meilleur
  du serveur et de la machine (record, fantôme, chaque segment). Le localStorage n'est qu'une copie.
- **Envoi** : à l'enregistrement d'une vraie séance (`garder` de seance.js), `recordsAEnvoyer()` joint ce qui bat le serveur (`records` à côté de
  `seance` dans `pkm_rameur`) ; la trace du fantôme est allégée à un point par seconde (`alleger`, ~3 Ko pour 5 min). Côté serveur,
  `seances_rameur.ranger` range la séance puis `garder_records` : jamais un temps moins bon, ce qui est mal formé est ignoré, rien d'écrit si rien
  n'a changé. Un essai ne fait jamais de record ; une séance annulée n'envoie rien (le record reste sur la machine et part avec la suivante).
- Format : `{"records": {clé: {"machine", "niveau", "tour": {"t", "jour", "pts": [temps, mètres de décor depuis la ligne, …]}, "segments": {nom: t}}}}`.

**Le circuit du jour** (15/11, étape 5 du plan ; `riviere/jour.py`) : chaque matin le même circuit pour tout le monde, un pour l'eau, un pour la terre.
- **Fabriqué par GitHub, sans crédits** : `.github/workflows/circuit-du-jour.yml` (3 h 20 et 4 h 50, heure de Paris ; secret `SANTE_TOKEN`) lance
  `riviere/outils/circuit_du_jour.py github` : le générateur noté (24 tirages valables), contrôlé comme `generer.py --ecrire` (sol, décor), 4 essais au
  plus, écrit dans `data/riviere/jour/AAAA-MM-JJ.json` (branche data du dépôt privé) = `{jour, fait, eau: niveau, terre: niveau}`. Les réglages
  (longueur, virages, dénivelé, cases, heure, temps, Ronflex un jour sur deux) viennent de la date seule (`jour.options`) : même jour, même circuit.
  Un niveau du jour : `id` = `jour-eau-AAAA-MM-JJ`, `nom` = « Circuit du jour · lun. 16/11 », `jour`, `note` (sa note sur 100).
- **Dans l'appli** (`app.py`, `?ecran=rameur`) : celui du jour, sinon celui de la veille ; `D.jour` = `{jour, circuits, classement}` ; `page.py` ajoute
  les circuits à `NIVEAUX`. Au menu, il est en tête (fond jaune, ☀️) ; choisi, il montre sa note et **le classement du jour** de ta machine (`classementDuJour`
  de seance.js) : le meilleur tour de chaque joueur, pris dans ses records du serveur (`jour.classement`, par machine ; pseudo de la carte du dresseur,
  jamais rien d'autre). Rien de neuf à envoyer : un record du circuit du jour part avec la séance enregistrée, comme ailleurs. Choisi la veille, le
  circuit du jour d'hier devient celui d'aujourd'hui (`duJour` de depart.js).
- Essai sur le PC : `python riviere/outils/circuit_du_jour.py --sortie riviere/outils/jour-essai.json` (~1 min), puis le serveur d'essai `?jour=1`.

**Les fourches** (`jeu/fourches.js`, 15/11, étape 7 du plan) : environ 28 s avant la séparation (à ton allure), « FOURCHE ! », la distance
restante et une jauge bleue (la brique « effort » : `seuil` 1,08 et `duree` 5 s par défaut, réglables dans la fourche du niveau). Pleine :
`VOIES.prise[f] = 1`, l'annonce de la fourche (« LES RAPIDES ! »), et tu prends la voie « force ». Sinon la voie calme, sans rien perdre :
rien ne ralentit jamais, et les vrais chiffres sont les mêmes. Le choix est arrêté 26 m avant la séparation (`DECIDE` : la caméra regarde
déjà plus loin) et oublié 45 m après la jonction. Une seule demande d'effort à la fois (Ronflex ou une fourche : la première arrivée).
**Le fantôme** garde les voies de son tour (`v` à côté de `pts`, aussi sur le serveur : `seances_rameur.garder_records`) et les reprend ;
les adversaires prennent toujours la voie calme ; le plan montre la voie « force » en jaune pâle ; le sillage, les ronds des coups et
l'ombre ne se dessinent que sur ta voie (`uVoie`). L'empreinte du tracé (`EMPREINTE`) compte aussi la voie « force ».
Le circuit du jour a une fourche deux jours sur cinq (`jour.options`, jamais dans un 8).

**Le résumé de séance** (`jeu/film.js`, 15/11, étape 10 du plan) : à « ■ Fin », avant le résumé (essai) ou la saisie (vraie séance), un film de
20 à 30 s rejoue 3 à 5 moments dans le vrai décor, puis tes chiffres ; « Passer » à tout moment, « 🎬 Revoir le film » dans le résumé.
- **Ce qui est gardé** (en mémoire seulement, jamais envoyé) : le trajet toutes les 0,2 s (`filmNoter` dans `boucle` : temps, `S.s`, `S.dist`, voies
  prises), l'heure des coups, et les moments signalés par `filmEvenement({type, …})` : `tour` (jeu.js), `ronflex` et `boing` (rencontres.js),
  `fourche` (fourches.js). Un nouveau moment = un `filmEvenement` là où il arrive + une ligne dans `filmChoisir` (score, plan, titre).
- **Retrouvé dans le trajet** : sauts (pièce `net` avec 1,5 m de chute au moins), entrées de tunnel, nouveaux paysages (titre des pièces), plus gros effort.
- **Rejouer** : `filmAvance` remplace l'avance de la séance (`S.s` lu dans le trajet, voies posées, coups rejoués, Ronflex remis comme il était) ;
  `filmCadrer` remplace la caméra après `cadrer` : plans `face`, `cote`, `haut`, `fixe`, `jeu`. Ralenti au sommet d'un saut (`FILM.rate`, passé aux
  animations). À la fin, `filmFinir` remet tout comme avant le film, puis appelle la suite.
- Essai sans ramer : `window.__filmEssai(minutes)` (fausse séance à allure régulière, voie calme), `filmPlan(k)` pour sauter à un plan.

**Ronflex et la brique « effort »** (15/11, étape 6 du plan) :
- **L'effort** (`jeu/effort.js`) : ta croisière = ta vitesse habituelle de la séance (de vrais m/s ; au départ, l'allure habituelle de la machine, puis
  la tienne, sur ~1 min 30) ; `EFFORT.ratio` = ta vitesse des 2-3 dernières secondes ÷ ta croisière. `demanderEffort({seuil: 1.08, duree: 5, reussi})` :
  une jauge qui se remplit au-dessus du seuil, se vide trois fois plus lentement en dessous ; la croisière ne bouge pas pendant un effort demandé.
  Jamais de cadence imposée : on se compare à soi. Prévue aussi pour les embranchements (étape 7).
- **Ronflex** (`contenu/evenements/ronflex.js`, `jeu/rencontres.js`) : `{"o": "ronflex", "cote": "c", "a": 80}` (sur l'eau, `"haut": -0.35`). Il dort au
  milieu de la piste (sprite `Sleep`, ×0,7). ~25 s avant lui (à ton allure), « RONFLEX ! » et une jauge : 8 % plus vite que ta croisière, 5 s en tout.
  Réussi : il saute (`Hop`), marche jusqu'à la rive (`Walk`), saute de joie quand tu passes ; raté : « BOING ! », tu rebondis sur son ventre (l'événement
  `saut` de monture.js, retiré quand il est réveillé). Derrière toi, il se rendort à sa place (au tour suivant, tout recommence). Rien ne ralentit le
  joueur ; avec `?s=` ou `?fige=1`, rien n'est demandé. Générateur : case « Ronflex » (modules `ronflex`, `ronflex_t`). Dans les circuits : le Huit
  (`essai`, avant la grotte ; `terre-huit`, retiré le 17/11, l'avait aussi). Une nouvelle rencontre = une recette qui remplit `RENCONTRES` + sa logique dans rencontres.js.

## Le menu et le chargement (17/11, carte blanche de Kiki : « tout sur une page, ludique, sans chargement inutile »)
- **Le menu s'ouvre tout de suite, sans le monde** (`jeu/menu.js`) : rien n'est dessiné derrière (`body.au-menu`, la boucle ne dessine pas tant que
  `MENU.ouvert`). Le monde du circuit choisi se construit derrière, invisible (`jeu/jeu.js` : `batirMonde`, `CHANTIER` : `part` de 0 à 1, `pret`,
  `etapes` = [part, ms] de chaque étape, `bloc` = le plus long moment sans rendre la main) ; le bouton « Commencer » se remplit au fur et à mesure,
  la carte du circuit choisi a sa petite barre. Toucher « Commencer » avant la fin : ça part dès que c'est prêt (`CHANTIER.depart`). Ce qui touche
  au monde (changer de Pokémon, d'adversaires, de cycliste) passe par `quandMonde(f)`. Les vues de contrôle (`?s=`, `?fige=1`, `?vue=`, `?banc=1`)
  attendent le monde derrière l'écran de chargement, comme avant.
- **Le terrain et le décor rendent la main toutes les 40 ms** (`construireTerrain(cede)`, `construireDecor(cede)` ; `poserDecorPas` cède aussi sans
  tronçon, entre deux règles) : le menu ne se fige jamais longtemps. Le résultat est identique au bit près (seul le moment du calcul change ;
  `poserDecor` va toujours jusqu'au bout d'un coup).
- **Un seul écran** : en haut la machine et ⚙ (capteur Bluetooth, dureté des pentes, son) ; à gauche les circuits de la machine, chacun avec son tracé
  vu du ciel (rivière en bleu, route en sable, tunnels en gris, damier de la ligne ou départ vert / arrivée rouge), sa distance, circuit ou parcours,
  son dénivelé et ton record ; à droite le circuit choisi en grand (tracé, distance, forme, dénivelé, durée à ton allure, profil d'altitude, lieux
  « au programme », record, classement du jour), trois vignettes qui ouvrent chacune une feuille (l'ambiance, ton compagnon, la course : fantôme et
  adversaires), puis « Commencer » et « Essayer sans montre ». Au téléphone (et sur une tablette en portrait), les circuits défilent de côté.
- **Les tracés des autres circuits** sortent du vrai code de la piste (`essayerNiveau`), sans construire leur monde (20 à 120 ms chacun), et sont
  gardés sur la machine (`riviere_traces`, avec une signature des pièces : un circuit retouché est recalculé).
- **L'ambiance en vignettes** : chaque heure et chaque temps est un petit ciel en pixels peint aux couleurs du jeu (`peindreCiel`, d'après `HEURES`
  et `METEOS` d'ambiance.js), avec une ligne d'aide (« Celle du circuit · prévue : le soir », « Variable · change toutes les 3 min ») ; pas de grand
  aperçu au-dessus (17/11, Kiki : il répétait la vignette touchée). Les effets du rendu (avec / sans, pour un très vieil ordinateur) sont dans ⚙.
- **Retouches du 17/11 (soir, Kiki)** : le titre est **Poké Swift** (plusieurs sports) ; l'elliptique s'appelle **Marcheur elliptique** à l'écran
  (clé `elliptique` inchangée) ; plus de « au programme » ; « Créer un circuit » est au niveau de « Commencer », même hauteur (grille `creer depart`).
- **Un brouillon essayé** : « Essayer » de l'éditeur recharge la page avec le brouillon et part tout de suite en essai (`riviere_essai_go`) ; à la fin
  de l'essai et au menu, « Ce circuit te plaît ? » : son nom, « 💾 Le garder » (`garderBrouillon` : rejoint tes circuits et devient le circuit
  choisi ; un circuit déjà gardé qu'on retouchait est remplacé), « ✏️ Le retoucher » (retour à l'atelier).
- Choisir un autre circuit ou une autre machine recharge la page avec lui (le menu revient aussitôt, le monde se reconstruit derrière).
- **Les circuits du menu** (17/11, Kiki : un ou deux par sport) : eau = `kanto-1km` et `vitrine` ; terre = `terre-ville` et `col-ventoux` ; plus le
  circuit du jour de chacun. `essai`, `fourche` et `ventoux` sont **cachés** (`"cache": true` : ils servent aux contrôles du moteur ; on les ouvre à
  l'adresse, `&riviere=essai`) ; un circuit caché n'est jamais choisi par défaut. Les circuits faits à l'essai dans l'éditeur ont été effacés une fois
  (`riviere_menu_v2`) ; ceux qu'on garde ensuite apparaissent au menu avec ✏️.

## Vérifier sans Kiki

| Outil | Ce qu'il dit |
|---|---|
| `python -m unittest tests.test_riviere` | les fichiers sont cohérents ; avec node, le moteur construit chaque niveau, le note, et le générateur est lancé (même circuit deux fois, sol propre) |
| `?pur=1&niveau=<nom>` (serveur d'essai) | le même bilan, dans la page : erreurs, croisements, décor posé, cassures du sol |
| `window.__verif()` | le contrôleur du niveau chargé |
| `?s=120&fige=1`, `__aller(s)`, `__image()` | se placer à un endroit, redessiner tout de suite (pour une capture) |
| `?vue=haut`, `?vue=gauche`, `?vue=droite`, `?vue=dessus&alt=60` | le plan vu du ciel, une rive de face, le ciel juste au-dessus de soi (un carrefour, un rond-point) |
| `?perf=1` | en plus des images par seconde (toujours affichées en jeu, sous ⛶ : vert = 58 et plus sans image de plus de 25 ms, orange, rouge sous 45 ; « pire » = l'image la plus lente de la seconde) : taille de l'image, triangles, objets |
| `?troncons=1`, `?troncons=0`, `?rayon=700`, `__troncons()`, `tronconsMaj(true)` | un parcours ouvert construit par tronçons (ou d'un bloc), un autre rayon, l'état des tronçons, tout finir tout de suite |
| `?banc=1` | le banc de mesure : un tour tout seul, puis le verdict de la machine |
| `?surface=terre`, `?machine=elliptique`, `?machine=velo`, `?eco=1` | le circuit sur la terre, une autre machine, 30 images par seconde |
| `?vitrine=1`, `?tenue=Peau,Casquette,Veste,Pantalon`, `?habits=casquette,sac,short` | à vélo : la caméra tourne autour du cycliste ; une autre tenue (noms de la carte du dresseur) ; des habits de la garde-robe |
| `?heure=nuit&meteo=pluie`, `__ambiance(h, m)` | une ambiance |
| `?effets=0`, `?effets=1`, `?effets=eau,vent,foret,ombres` | les effets du rendu : aucun, tous (même sur un circuit qui dit non), seulement ceux-là |
| `?voie=1`, `?voie=0` | dans une fourche : toujours la voie « force » (pour la regarder, avec `?s=` et `?fige=1`), toujours la calme ; sans rien : c'est l'effort qui choisit |
| `?nageur=131`, `changerNageur(130)` | un autre Pokémon dans l'eau (ceux de `contenu/nageurs.json`), à sa vraie taille |
| `__generer({km, relief, avec})`, `__trames()` | le générateur ; la lecture des trames Bluetooth |
| `python riviere/outils/generer.py --notes` | la note de chaque circuit du jeu et ses raisons ; sans `--notes` : génère un circuit sans navigateur |
| `python riviere/outils/planche.py [circuit…]` | **la planche** d'un circuit (une image dans `riviere/outils/planches/`, hors dépôt) : sa note et ses 7 critères, une vue au milieu de chaque paysage et juste avant chaque moment fort (cadre rouge), la frise du tour (paysages à leur durée, repères dessus, moments forts dessous) ; tout vient de `noterCircuit`. ~2 min par circuit. Un circuit tiré par le générateur : `generer.py … --ecrire <nom>` puis `planche.py <nom>` |
| `?cadre=1` (serveur d'essai) | la page dans un cadre, comme dans l'appli |
| `?jour=1` (serveur d'essai) | le circuit du jour de `riviere/outils/jour-essai.json` (`circuit_du_jour.py --sortie …`), avec un faux ami au classement ; `python riviere/outils/circuit_du_jour.py --jour AAAA-MM-JJ` = le bilan d'un jour |
| `?records=1` (serveur d'essai) | la page reçoit les records de `riviere/outils/records-essai.json` (comme ceux du serveur ; fichier gardé sur ce PC) ; `EMPREINTE`, `CLE_CIRCUIT`, `recordsAEnvoyer()` |

Dans l'appli, ces options se mettent dans l'adresse : `?ecran=rameur&riviere=essai&banc=1`.
Le panneau de navigateur de l'appli Claude n'anime pas une page masquée : pour faire avancer le jeu, appeler `boucle(t)` soi-même
avec des temps qui avancent de 16,7 ms.

## Ce qu'il ne faut pas casser

- La vraie séance : menu, tours, record, fantôme, plan, saisie de fin, enregistrement (`pkm_rameur`), calibrage `M_COUP`.
- Un ancien fichier de niveau doit toujours marcher (`kanto-1km`, `bourg-palette` : contrôlés).
- Un circuit sans fourche reste identique au mètre et à l'image près : tout ce qui touche aux fourches est derrière `PISTE.NF`, `PISTE.INT`
  ou `PISTE.VO` (qui valent zéro sans fourche). Après une retouche du cœur : `python riviere/outils/captures.py compare` (les Pokémon, les particules et le cycliste à l'arrêt bougent d'une
  prise à l'autre : jusqu'à ~1 % de pixels isolés n'est pas un défaut ; un pan de décor qui change en est un).
- **Les tronçons ne concernent que les longues routes ouvertes** (`TRONCONS`) : une boucle, un circuit à fourche, un circuit court restent
  construits d'un bloc, par les mêmes fonctions qu'avant. Ce qui est partagé (`poserDecorPas`, `fabriqueRives`, `fabriquePiste`, `celluleSol`)
  doit donner le même monde d'un bloc : signature de la piste, du sol et du décor inchangée sur les 8 circuits (16/11), images comparées.
- **Les effets du rendu restent des options** (`EFFETS`) : tout ce qu'ils ajoutent est derrière `EFFETS.<nom>`, et `kanto-1km` n'en a aucun.
  Sans effets, le monde est celui d'avant au bit près (contrôlé : `test_effets` ; images : `captures.py compare --niveau kanto-1km`).
- Une instruction par ligne quand c'est possible, et **jamais de code derrière un commentaire de fin de ligne** (contrôlé).
- Dépôt public : aucune donnée, aucun jeton. Les sprites sont lus en ligne (CC BY-NC), jamais copiés ici.
