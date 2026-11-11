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
    surfaces/, montures/, evenements/   mêmes principes (dossiers à créer au besoin : page.py ramasse leurs .js)
```

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

Un fichier `contenu/biomes/<nom>.json` (couleurs du ciel, de l'eau, des sols ; `rives` : un profil de hauteurs par sorte de rive ;
`palette` des objets ; `regles` de pose ; `terres` : les couleurs de la terre et du goudron), un `contenu/lieux/<nom>.json`, et les
objets propres à la région dans `contenu/objets/<nom>.js`. Les niveaux choisissent leur région : `"biome": "johto"`.

## Ajouter une surface, une monture, une machine

- **Surface** : `SURFACES.sable = {materiau, liquide: false, monture: "coureur", poussiere: "#E8D69C"}` (voir `matRoute` dans `surfaces.js`).
- **Monture** : `MONTURES.velo = {enfonce: 0, foulee: 0}` ; une surface choisit sa monture.
- **Machine de sport** : `jeu/allure.js`, `MACHINES` (vrais mètres par geste, allure du décor, records à part). `?machine=elliptique`.

## Les prises pour les ambiances (pas encore utilisées)

`COMMUNS.uTeinte` (une teinte sur tout le monde : l'heure du jour), `COMMUNS.uBrume`, `uB0`, `uB1` (la brume), `uSombre`,
`MAT_MONDE.uniforms.uSoleil` (la direction du soleil), `CIEL.scene` (la passe du ciel, avec sa caméra : la place d'un volcan lointain).

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
| `?surface=terre`, `?machine=elliptique`, `?eco=1` | le circuit sur la terre, une autre machine, 30 images par seconde |

Dans l'appli, ces options se mettent dans l'adresse : `?ecran=rameur&riviere=essai&banc=1`.
Le panneau de navigateur de l'appli Claude n'anime pas une page masquée : pour faire avancer le jeu, appeler `boucle(t)` soi-même
avec des temps qui avancent de 16,7 ms.

## Ce qu'il ne faut pas casser

- La vraie séance : menu, tours, record, fantôme, plan, saisie de fin, enregistrement (`pkm_rameur`), calibrage `M_COUP`.
- Un ancien fichier de niveau doit toujours marcher (`kanto-1km`, `bourg-palette` : contrôlés).
- Une instruction par ligne quand c'est possible, et **jamais de code derrière un commentaire de fin de ligne** (contrôlé).
- Dépôt public : aucune donnée, aucun jeton. Les sprites sont lus en ligne (CC BY-NC), jamais copiés ici.
