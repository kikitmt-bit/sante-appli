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

## Le moteur en une phrase

On ne dirige jamais : tout le monde se déduit d'**une ligne**, la piste, et la position du joueur est un seul nombre, `s`, ses
mètres le long de cette ligne.

| Fichier | Ce qu'il fait | Dessine ? |
|---|---|---|
| `outils.js` | petites fonctions, les options de l'adresse (`PARAMS`) | non |
| `piste.js` | les pièces du niveau → une ligne en 3D, mètre par mètre (`PISTE`, `at`, `pose`, `pres`, `verifier`) | non |
| `champ.js` | la hauteur et la couleur du sol en tout point, par **vote** des points de piste (`hauteur`, `hSol`, `couleurSol`) | non |
| `forme.js` | les volumes simples (boîte, toit, boule…) dont sont faits les objets | non |
| `decor.js` | pose les lieux puis les règles de la région (`poserDecor`) ; les registres `OBJETS`, `RAYON`, `EVENEMENTS` | pose : non |
| `rendu.js` | la petite image nette agrandie, le contour, le ciel, la brume, les réglages partagés (`COMMUNS`) | oui |
| `terrain.js` | les maillages du sol : la grille, et le ruban précis des rives | oui |
| `surfaces.js` | le ruban de la piste (eau, terre, goudron : `SURFACES`), la mer, les ponts | oui |
| `tunnel.js` | les voûtes et les façades des grottes | oui |
| `sprites.js` | les Pokémon et les habitants (sprites), les éclaboussures | oui |
| `monture.js` | ton Pokémon : nage ou course selon la surface, corde dans les virages, vrais sauts (`MONTURES`) | oui |
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
- **un 8** (`"boucle": "huit"`) : la dernière pièce au virage `"auto"` annule les virages des autres ; la piste se croise **à niveau** (un carrefour : `CROIX` dans piste.js, aucun marquage dans le carrefour, le passage du dessus dessiné par-dessus, pas de rive ni de décor sur l'autre route). Le contrôleur accepte un croisement à la même hauteur (moins de 0,8 m d'écart) s'il est franc (plus de 25°) ; sinon un pont 4,5 m plus haut.
- **une montagne au milieu d'une boucle** (`"massif": {"haut": 190, "rayon": 0.82, "cratere": true}`) : un volcan dont on fait le tour, cendre en haut, herbe au pied, un cratère qui rougeoie et fume (`MASSIF` dans champ.js, `construireMassif` dans terrain.js).
- des pentes jusqu'à 10 % (le générateur en met jusqu'à 250 m de montée).

**Le vélo** (`moteur/velo.js`, la monture `cycliste`, demandée par la machine vélo : `monture` dans `MACHINES`) : un vrai vélo en volumes (cadre rouge, roues à cinq bâtons et jante claire, garde-boue avant et arrière, feu arrière, carter de chaîne blanc, pédalier, guidon qui braque, phare allumé la nuit, panier plein en lattes blanches ; **refait le 14/11**, Kiki : « les pneus rentrent dans le cadre, c'est un peu fouillis » : plus rien ne se traverse (la tête de fourche au-dessus du pneu avant, fourche et haubans de chaque côté du pneu : `LARGE`, `PNEU`), plus de fines pièces qui scintillent (rayons, chaîne, panier ajouré) ; ce que cycliste.js attend n'a pas bougé : pédalier en (-.02, .3), selle, poignées, fond du panier, pivot de l'avant en x = .43) et, depuis le 12/11 au soir, **ton dresseur dessus** (voir plus bas), ton Pokémon dans le panier. Roues et pédales selon la vitesse, petit braquet dans les côtes, roue libre en descente rapide (il se ramasse), danseuse au-dessus de 5,5 % (le vélo bascule à chaque coup de pédale), inclinaison réelle dans les virages (vitesse et courbe), cabrage au saut et amorti à la réception, vibrations sur les pavés, penché à l'arrêt. Au sol : ombre tramée (`OMBRE_U`), trace du pneu et poussière sur un chemin. À vélo, la caméra se met de trois-quarts arrière (1,05 m à droite, un peu plus haute, plus près qu'à la nage). Sans capteur de cadence, la cadence affichée est celle des pédales. L'elliptique garde le Pokémon qui court (ou le cycliste, au choix du menu).

**Le cycliste** (`moteur/cycliste.js`, 12/11, Kiki : « un Pokémon sur un vélo, ça ne va pas ; un vrai effet waouh ») : ton dresseur en volumes, dans le style du monde (couleurs unies, lumière en paliers, contour), proportions de jeu Pokémon (grosse tête, casquette blanche devant frappée d'une Poké Ball, veste à col blanc, sac à dos jaune à Poké Ball et sac de couchage roulé, pantalon à revers, baskets à semelle blanche, gants). **Aux couleurs de ta carte du dresseur** (`D.dresseur` = peau, casquette, veste, pantalon, donnés par l'appli ; mêmes palettes que `pokemon_ui.html`, `TENUES` ; le sac devient bleu si la veste est jaune ou orange ; `?tenue=Mate,Bleu,Vert,Noir` pour essayer). 18 volumes, ~4 400 triangles avec le vélo. **Articulé** : chaque membre est un volume rigide (`membre`), posé à chaque image par cinématique inverse à deux os (`deuxOs`) dans le repère du vélo : pieds sur les pédales (la cheville joue), mains aux poignées (qui braquent), bassin qui roule à chaque coup. Il vit : danseuse dans les côtes (debout, au-dessus du guidon, contre la bascule du vélo), ramassé en descente rapide (pédales mises à plat par velo.js), regard dans le virage et tête plus droite que le vélo, soulevé au saut et amorti à la réception, sac qui tressaute (un ressort) ; **à l'arrêt** il glisse de la selle, pose le pied droit à terre (le vélo penche à droite, la pédale gauche remonte prête à repartir) et regarde tour à tour son Pokémon et la caméra. **Ton Pokémon dans le panier** (`animerPanier`, le sprite du nageur à 40 cm) : il regarde la route, se retourne vers toi de temps en temps et à l'arrêt, saute de joie à fond de train et à chaque tour. **La vitrine** (`VITRINE` dans camera.js) : au menu, la caméra tourne lentement autour de vous deux (de trois-quarts face à profil ; sur une tablette, plus loin et à gauche du panneau) ; au départ, elle glisse derrière lui en 2 à 3 s, en tournant autour. `?vitrine=1` la garde pendant la course (pour regarder le cycliste de près). **Le fantôme à vélo** (`copierCycliste`) : une copie translucide du vélo et du cycliste, qui reprend ta pose, son Pokémon dans son panier. Refusés avant : le Pokémon assis sur la selle (Kiki).

**Le dresseur à facettes, avec sa garde-robe** (`moteur/cycliste.js`, 14/11, Kiki : « on arrête le style pixel, le même style low poly que le vélo ; un personnage évolutif, auquel on pourra changer les vêtements, les accessoires » ; prime sur ce qui est dit plus haut de la casquette, du sac et de la tenue) : le rendu en pixels (`pixel.js`, le menu « En pixels / En volumes », `riviere_dresseur_rendu`, `?dresseur=`) est **retiré**. Le dresseur est fait de volumes à facettes (une couleur par facette, comme le vélo et les arbres : `fuseau` et `boule3` à plat par défaut, `anneaux` pour un tronc ou un membre qui s'affine, `meche` pour une pyramide à 4 pans). Il a du caractère : grands yeux en amande avec reflet, sourcils, joues roses, petit nez, sourire, frange en mèches et pointes rabattues vers l'arrière (on le voit surtout de dos), mains fermées sur les poignées avec le pouce. **Assis SUR la selle** : `ASSISE` = 1,035 (le dessus de la selle est à 0,955 ; avant, le bassin à 1,0 enfonçait les fesses dans la selle), aussi quand il se ramasse en descente. **La garde-robe** : `CORPS` = le corps nu, toujours le même ; `GARDE_ROBE` = emplacement → habit → ce qu'il dessine sur chaque membre (`torse`, `tete`, `dos`, `bras`, `avantBras`, `cuisse`, `tibia`, `pied`, `patin` ; mêmes repères que le corps) et ce qu'il `cache` du corps (sinon les facettes du corps passeraient au travers : `tronc`, `bassin`, `cuisse`, `tibia`, `pied` ; `dessus` = le haut des cheveux sous un chapeau). **Tenue de base** (`TENUE_BASE`) : cheveux `pointes`, haut `tshirt` (couleur de la veste, col, bords des manches et bande à la couleur d'accent), bas `pantalon` (ceinture, revers), chaussures `baskets` (couleur d'accent, semelle blanche, chaussette), poignets `bracelets` ; sans casquette ni sac. Déjà dans la garde-robe : `short`, `casquette` et `sac` (ceux de la première version). Couleur d'accent = la casquette de ta carte (blanc si elle est de la couleur du haut). Ajouter un habit = une entrée dans `GARDE_ROBE` ; le porter : `D.dresseur.habits` (une liste de noms, `sans-<emplacement>` pour l'enlever ; pas encore envoyé par l'appli) ou `?habits=casquette,sac,short` pour essayer. Le fantôme (copie du groupe) et les rollers suivent tout seuls.

Exemples : `terre-volcan.json` (« Le tour du volcan ») et `terre-huit.json` (« Le Huit de Jadielle »).

## Créer un circuit sans écrire de fichier : l'éditeur et le générateur

Au menu : Circuit → « Créer ou modifier un circuit » (`jeu/editeur.js`). Plan vu du ciel et profil redessinés à chaque retouche par le vrai
code de la piste, contrôleur en direct, pièces à régler au curseur, modules tout faits à ajouter, objets à poser, repères lointains.
« Essayer » joue le brouillon, « Garder » le range sur la machine (`riviere_circuits`, il apparaît au menu), « Exporter » donne son texte
(à donner à Claude pour qu'il devienne un fichier du jeu) ; sur le serveur d'essai du PC, « Écrire dans le jeu » crée le fichier.
Onglet « Générer » (`jeu/generateur.js`, `genererCircuit`) : longueur, relief, boucle ou A→B, eau ou terre, et des cases (port, village, lac,
sous-bois, marais, plage, cascade, grotte, pont sur un ravin). Il assemble des **modules** (`MODULES`), fait construire chaque tirage par le
moteur, jette ceux qui ne tiennent pas debout et garde le plus ramassé. Même graine, mêmes cases : même circuit. Ajouter un module = une entrée.

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
Un objet qui fait réagir la monture : `Object.assign(EVENEMENTS, {tronc: "saut"})` (`"saut"` ou `"plongee"`).

## Ajouter une région (un autre style)

**Le plus court : hériter.** `{"nom": "Johto", "herite": "kanto", "palette": {"feuilles": [...]}, "regles_plus": [...]}` : elle ne redit que ce
qui change (couleurs, arbres, règles en plus ; `regles` à la place de celles du parent). Une ville moderne sans Pokémon : une région qui hérite,
des rives `quai` et `ville`, des objets `immeuble`, `entrepot`, `lampadaire`, et ses propres recettes. Sinon, tout écrire :
un fichier `contenu/biomes/<nom>.json` (couleurs du ciel, de l'eau, des sols ; `rives` : un profil de hauteurs par sorte de rive ;
`palette` des objets ; `regles` de pose ; `terres` : les couleurs de la terre et du goudron), un `contenu/lieux/<nom>.json`, et les
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
- **Le skieur de fond** (12/11, Kiki : son appareil du parc n'est pas un elliptique, les pieds restent à plat, mouvement de ski de fond) : la clé
  reste `elliptique` (sujet de la montre, records), seul le nom affiché change (`nom`, `montre` = le nom sur la montre). Au menu, « Ce que tu
  vois » : **à vélo** (par défaut depuis le 14/11, Kiki : c'est avec le vélo qu'il s'en sert d'abord ; monture `cycliste`), **en rollers** (monture `patineur` : ton dresseur de cycliste.js sans le vélo, `animerPatineur`, poussées en V
  synchronisées sur la cadence, ton Pokémon court à côté : `animerCompagnon`), ton Pokémon qui court (l'ancienne vue), ou à vélo.
  **Vitesse vue** (`VISUEL`, `kmhVus`, `allureVue` dans allure.js) en rollers et à vélo : 15 km/h de décor à l'allure habituelle (55 tours/min),
  20 à +25 %, 25 à +50 %, 30 au plus ; une vraie côte freine jusqu'à ~5-6 km/h (`1 - pente × 6`, au moins 0,38), une descente lance.
  Les chiffres affichés restent les vrais. Records et fantômes à part par vue (`CLE_MACHINE`).
- **Plein écran** (jeu.js, `PLEIN`) : demandé au premier toucher (dans l'appli : la page de l'appli entière), petit bouton sous « Son » pour
  en sortir ou y revenir ; sorti une fois, il ne revient plus tout seul pendant la visite (`riviere_plein_non`, sessionStorage).
- **Annuler une séance** : à la fin d'une vraie séance au rameur, « ✕ Annuler la séance » en haut (deux touchers) ; au menu, « Annuler la
  séance interrompue ». Une machine qui n'enregistre pas (skieur de fond) n'écrit plus de séance interrompue (`riviere_encours`, avec `machine`).
- **Capteur Bluetooth** (`jeu/capteurs.js`, Chrome ou Edge) : home trainer, vélo, rameur ou elliptique connecté (FTMS), capteur de puissance,
  de cadence, ceinture cardio. Un home trainer pilotable reçoit la pente du circuit (`BT.difficulte`, 50 %). **Écrit sans appareil** : la
  lecture des trames se contrôle par `window.__trames()`, à essayer sur un vrai home trainer.

## Les ambiances (ambiance.js, 12/11)

Tout passe par `COMMUNS` (uTeinte, uNuit, uPluie, uNeige, uSombre, la brume) et `CIEL.U` (dégradé, soleil, lune, étoiles, nuages, couverture,
éclairs) : aucun matériau ne connaît l'heure. Les matières d'un sommet (`F.matiere(n)`) : 3 fenêtre (éclairée la nuit), 7 lampe, 4 lumineux
(cristal, lave), 5 chute d'eau, 6 eau calme ; `K.lumiere(F, x, y, z, couleur, taille, toujours)` = un halo tramé, et les six lumières les plus proches éclairent vraiment ce qui les entoure (`lumieresProches`). Chaque vitre (matière 3) tire son sort : allumée entière ou éteinte, de plus en plus au crépuscule. Les étoiles sont fixes, d'éclat varié, leur nombre propre à chaque niveau (`"etoiles": 1.5` dans un niveau pour plus). Un repère lointain peut fumer : `K.panache({y, haut, large, vent, duree})`. Une région peut redéfinir `heures`,
`ambiances`, `particules`. Essai : `window.__ambiance("nuit", "pluie")`, ou `?heure=nuit&meteo=orage`.

## Le jeu

Adversaires (`jeu/rivaux.js`, menu) : trois Pokémon de la région (`rivaux`) à allure fixe, réglée sur ton record ; classement sous le tour.
Segments, profil d'altitude (dès 1,5 m de relief) et arrivée d'un parcours de A à B : `jeu/parcours.js`. Puissance affichée quand il y en a une.

## Vérifier sans Kiki

| Outil | Ce qu'il dit |
|---|---|
| `python -m unittest tests.test_riviere` | les fichiers sont cohérents ; avec node (sur GitHub), le moteur construit chaque niveau |
| `?pur=1&niveau=<nom>` (serveur d'essai) | le même bilan, dans la page : erreurs, croisements, décor posé, cassures du sol |
| `window.__verif()` | le contrôleur du niveau chargé |
| `?s=120&fige=1`, `__aller(s)`, `__image()` | se placer à un endroit, redessiner tout de suite (pour une capture) |
| `?vue=haut`, `?vue=gauche`, `?vue=droite` | le plan vu du ciel, une rive de face |
| `?perf=1` | taille de l'image, images par seconde, triangles |
| `?banc=1` | le banc de mesure : un tour tout seul, puis le verdict de la machine |
| `?surface=terre`, `?machine=elliptique`, `?machine=velo`, `?eco=1` | le circuit sur la terre, une autre machine, 30 images par seconde |
| `?vitrine=1`, `?tenue=Peau,Casquette,Veste,Pantalon`, `?habits=casquette,sac,short` | à vélo : la caméra tourne autour du cycliste ; une autre tenue (noms de la carte du dresseur) ; des habits de la garde-robe |
| `?heure=nuit&meteo=pluie`, `__ambiance(h, m)` | une ambiance |
| `?nageur=131`, `changerNageur(130)` | un autre Pokémon dans l'eau (ceux de `contenu/nageurs.json`), à sa vraie taille |
| `__generer({km, relief, avec})`, `__trames()` | le générateur ; la lecture des trames Bluetooth |
| `?cadre=1` (serveur d'essai) | la page dans un cadre, comme dans l'appli |

Dans l'appli, ces options se mettent dans l'adresse : `?ecran=rameur&riviere=essai&banc=1`.
Le panneau de navigateur de l'appli Claude n'anime pas une page masquée : pour faire avancer le jeu, appeler `boucle(t)` soi-même
avec des temps qui avancent de 16,7 ms.

## Ce qu'il ne faut pas casser

- La vraie séance : menu, tours, record, fantôme, plan, saisie de fin, enregistrement (`pkm_rameur`), calibrage `M_COUP`.
- Un ancien fichier de niveau doit toujours marcher (`kanto-1km`, `bourg-palette` : contrôlés).
- Une instruction par ligne quand c'est possible, et **jamais de code derrière un commentaire de fin de ligne** (contrôlé).
- Dépôt public : aucune donnée, aucun jeton. Les sprites sont lus en ligne (CC BY-NC), jamais copiés ici.
