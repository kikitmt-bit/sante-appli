# « La Rivière » : le plan (ouvert le 14/11/2026)

Le plan décidé avec Kiki après l'audit du 14/11 (`AUDIT-MOTEUR-2026-11-14.md`). Une étape = une conversation.
Kiki écrit « La Rivière : étape N du plan » (ou « on reprend l'étape N ») : tout ce qu'il faut savoir est ici.

## Pour Claude : quoi faire quand Kiki nomme une étape

1. `git fetch`, puis `git status -sb` : jamais de travail sur une copie en retard.
2. Lire `riviere/MOTEUR.md`, puis dans l'audit seulement les chantiers de l'étape (colonne « Audit » du tableau).
3. Proposer à Kiki un **plan court de l'étape** : ce qu'il verra, le risque, l'effort, la consolidation faite au passage, l'essai qu'on
   lui demandera. **Attendre son accord.** Pas de gros chantier sans feu vert : la 3D lui a déjà coûté beaucoup de crédits.
4. Faire, avec une comparaison avant / après : `python -m unittest tests.test_riviere`, `__verif()`, `?banc=1`, captures aux mêmes endroits.
5. Mettre à jour : ce fichier (état de l'étape, décisions, ce qui reste à essayer), `MOTEUR.md` (un mode d'emploi, pas un journal),
   une ligne dans `CLAUDE.md`, une ligne dans `NOUVEAUTES` (🧪) si Kiki peut l'essayer.
6. On travaille sur `main`. **Commit et envoi seulement quand Kiki le dit.** Après chaque envoi : `gh run list --limit 3`, et dire à
   Kiki si les tests sont verts ou rouges (un échec est passé inaperçu 3 jours, du 12 au 14/11).

Répondre en français, simplement : Kiki n'est pas développeur.

## Ce qui ne change jamais sans que Kiki le demande

- La vraie séance au rameur : menu, tours, record, fantôme, plan, saisie de fin, enregistrement (`pkm_rameur`), calibrage `M_COUP`.
- (24/11, Kiki) **Les circuits sont jetables tant que le jeu n'est pas fini** : tous supprimés sauf `vichy-lac` (le lac d'Allier). Aucune comparaison « identique avant / après » d'un circuit : on ne contrôle que
  celui qu'on fabrique. Les circuits à garder seront faits plus tard. Quatre circuits figés servent seulement aux tests du moteur (`tests/circuits/` : pont, fourche, vraies routes), jamais dans le jeu.
- Les vrais chiffres (distance, temps, allure, cadence, watts) ne trichent jamais ; seul le décor défile plus ou moins vite.
  Une machine sans écran (le skieur de fond) : toujours une estimation vers le bas.
- Aucune image dans le décor : tout par le code, dans le style actuel (volumes à facettes, couleurs unies, lumière en paliers, contour). (18/11 : Kiki peut allumer « Un rendu plus réaliste » dans ⚙ : lumière douce, eau qui reflète, matières à grain ; toujours sans image, et éteint par défaut.)
  Seuls les Pokémon et les habitants sont des sprites.
- Jamais de musique ; le son reste très doux.
- Les règles de Poké Fit (points, balls, missions) : on n'y touche pas, et une séance ne compte jamais deux fois (montre + machine).
- Dépôt PUBLIC : aucune donnée, aucun jeton, aucun identifiant d'ami dans le code. Sprites de Donjon Mystère (CC BY-NC 4.0) lus en ligne,
  jamais copiés, jamais d'usage commercial. Fantômes et classements d'amis : des temps et des traces, jamais le cœur ni la santé.

## Les étapes

État : à faire · en cours · faite. L'ordre est celui conseillé ; Kiki peut le changer.

| # | Étape | Ce que Kiki verra | Consolidation indispensable (et seulement celle-là) | Audit | Risque | Séances | État |
|---|---|---|---|---|---|---|---|
| 0 | Filets | Claude dit après chaque envoi si GitHub est vert ; les tests du moteur tournent aussi sur ce PC ; des captures de référence | c'est elle | 0.2, 0.3, 0.4 | nul | ½ | **faite le 14/11** (voir le journal) |
| 1 | Toutes les machines enregistrées | une séance de skieur de fond ou de vélo apparaît dans Poké Fit, comme le rameur | un seul format de séance pour toutes les machines | 11.1 | faible | 1 à 2 | **faite le 14/11** (à essayer : une vraie séance au parc) |
| 2 | Records et fantômes sur le serveur | le record suit Kiki de la tablette au téléphone | une empreinte du tracé dans la clé du record | 11.2 | faible | 1 à 2 | **faite le 14/11** (à essayer : tablette puis téléphone) |
| 3 | Fantômes des amis, classement par circuit | le meilleur tour d'un ami nage à côté de soi | aucune de plus | 11.3, 11.5 | moyen | 1 | **mise de côté le 14/11** (Kiki joue seul ; à reprendre dès qu'il parle d'amis ou de multijoueur) |
| 4 | Générateur noté | une planche d'images et une note par circuit | le générateur tourne sans navigateur | 12.1, 12.2 | faible | 2 | **faite le 15/11** (à essayer : dire si le classement colle, en regardant les planches) |
| 5 | Circuit du jour | chaque matin le même circuit pour tous et son classement, fabriqué par GitHub sans crédits | l'étape 4 | 11.4 | faible | 1 | **faite le 15/11** (à essayer : le menu de la tablette demain matin) |
| 6 | Ronflex et premiers lieux de Kanto | Ronflex bloque la route et se réveille quand on accélère | la brique « effort » (forcer plus que sa croisière) | 7.5, 7.6, 10.7 | faible | 1 à 2 par lot | **Ronflex et l'effort faits le 15/11** (lieux de Kanto : lot suivant) |
| 7 | Embranchements à l'effort | une fourche : la voie spectaculaire si on force | les captures de référence de l'étape 0 | 5.1 | **élevé** (le cœur) | 3 à 4 | **faite le 15/11** (à essayer : « L'île aux rapides » au rameur, forcer à l'annonce) |
| 8 | Route GPS et home trainer | un vrai col, habillé en Kanto, qui durcit dans les côtes | monde construit par tronçons, seulement au-delà de ~5 km | 5.9, 10.6, 2.5 | élevé | 3 à 4 | **lots 1, 2 et 3 faits le 16/11** (une vraie route, le home trainer sans appareil, le monde par tronçons : « Le Ventoux en entier », 21,6 km) ; **lot 4 fait le 17/11** (le décor d'après OpenStreetMap : Bédoin, les vignes, la forêt, le pierrier du sommet, sur « Le Ventoux en entier ») |
| 9 | Forêts, vent, ombres, eau qui coule | un effet à la fois | aucune (les instances existent déjà dans three.js r128) | 4 | moyen | 3 à 5 | **faite le 15/11** (à essayer : la vitrine sur la tablette, Réglages → Ambiance → Les effets : Avec puis Sans ; le banc `?banc=1` dans les deux cas) |
| 10 | Résumé de séance | 20 à 30 s rejouées à la fin | la trace gardée à l'étape 2 | 8.3 | moyen | 2 | **faite le 15/11** (à essayer : un essai « Auto » de 3-4 min, puis « ■ Fin ») |
| 11 | Thèmes : un rendu plus réaliste | le choix entre le thème Pokémon actuel et un thème plus immersif ; d'abord le style « entre les deux » : lumière, eau, matières plus réalistes sur le décor de Kanto | éteint = monde d'avant (shaders identiques) | — | moyen | par lot | **lot 1 fait le 18/11** (trois interrupteurs dans ⚙ : la lumière, l'eau, les matières ; à essayer sur la tablette, Vichy et kanto-1km) ; plus tard : vrais arbres et maisons, puis l'avatar du thème réaliste (pas un sprite Pokémon : à décider avec Kiki) |

| 12 | Plus de défauts : la fabrication refaite | des circuits neufs, sans chemin impossible | le contrôleur de défauts, l'inspection image par image, le bouton ⚑ | — | moyen | 2 à 3 | **faite en grande partie le 24/11** (Kiki : ne pas corriger les anciens circuits, réparer la fabrication et repartir de zéro) : villes dessinées d'abord (`ville-place`), objets vraiment au sol, rives sans trait, `eau-lac`, inspection, ⚑ Signaler. Reste : une ville avec du relief et une fourche, d'autres plans de ville, un circuit neuf pour le vélo, retirer les anciens circuits quand Kiki le dit |
| 13 | La ville libre (la fondation commune) | des rues courbes, en diagonale, qui montent et descendent ; des quartiers en pente | le plan devient une ZONE posée dans le monde (plus tout le niveau), avec sa propre hauteur de sol, raccordée au terrain ; rues = courbes quelconques, sol peint d'après la distance aux rues (aucune jointure possible), parcelles le long des courbes | — | **élevé** (le cœur) | 2 à 3 | **lot 1 fait et validé par Kiki le 24/11** (la fondation, circuit d'essai « Le quartier des Hauts » ; voir le journal) ; **lot 2 sauté (24/11, Kiki : 669 m ont suffi)** ; **lot 3, le générateur : fait et publié le 24/11 ; validé par Kiki après un premier essai rapide (« les villes sont très agréables, c'est vraiment une très bonne idée »)** (voir le journal ; brief juste sous le tableau) |
| 14 | Ville ET nature | un circuit à moitié en ville : on sort par une vraie rue (dernières maisons, jardins, chemin, lisière), un tour de forêt, on revient | l'étape 13 ; la liste fermée des sorties de ville | — | moyen | 1 à 2 | **lot 1 fait le 24/11** (circuit d'essai « La ville et le bois », `ville-bois` ; publié et validé par Kiki le 24/11) ; **lot 2 fait le 24/11** : le générateur (« Tout en ville / Moitié-moitié / Surtout la nature »), refait le soir même et **validé par Kiki après un premier essai rapide : étape 14 terminée** |
| 15 | La même ville pour tous | à vélo, on roule sur la chaussée ; au rameur, une ville longée ou vue en contrebas, avec ses quais, ses lampadaires, ses voitures | l'étape 13 ; une ville vue de loin allégée ; retirer l'ancien système de rues | — | moyen | 2 | **lot 1, première moitié (1a) faite le 24/11** : circuit d'essai « La boucle des Cerisiers » (`velo-cerisiers`, machine vélo), **validée par Kiki sur la tablette le 24/11** ; 1b, le générateur à vélo, validé le 25/11 ; **lot 2a, l'eau dans une ville, fait le 25/11** (circuit d'essai « La boucle des Quais », `velo-quais`, **validé par Kiki sur la tablette le 25/11 : « globalement, c'est très bien »**) ; **2b, le générateur « Au bord de l'eau », fait et publié le 25/11 (`6c7614c`), essayé par Kiki : « ça a l'air d'être ok », aucun ⚑** ; **lot 3a (le rameur) fait le 25/11** : circuit d'essai « Le tour de l'île » (`rame-ile`), vu par Kiki : « globalement, c'est très bien » ; **3b-1, le générateur « Autour d'une île », fait le 25/11, avis de Kiki attendu** |
| 16 | La diversité | des villes qui ne se ressemblent pas (vieille ville, bourg de montagne, port, quartier d'immeubles), Ronflex et fourches en ville, des moments à voir ; le circuit du jour sur ce système | les étapes 13 à 15 | — | faible | par lots | proposée le 24/11 |
| 17 | Le ménage | seulement de bons circuits au menu | accord de Kiki sur chacun | — | nul | ½ | proposée le 24/11 |

### Étape 15 : la même ville pour tous (idées de Kiki du 24/11 ; plan du lot 1 accepté le 24/11 : 1a un circuit d'essai fait main, arrêt pour l'avis de Kiki, puis 1b le générateur)

**L'esprit (Kiki)** : « Je demande un niveau : des montées, des descentes, que ça tourne un peu ; c'est toi qui gères un niveau cohérent, beau, harmonieux : une ville, une sortie de ville, un parc, une forêt, le retour. » Le travail
fait à pied est très bien ; on l'ADAPTE au vélo, puis au rameur. **Kiki joue à pied au marcheur elliptique ; sa vue « À vélo » ne sert qu'à tester plus vite** (donc rien ne change pour le marcheur elliptique, dans les deux vues).

**Ce que Kiki veut à vélo** : en ville, la plupart du temps sur la route ; très rarement, un raccourci d'une vingtaine de mètres sur le trottoir, pour une raison qu'on voit (sens interdit, route bouchée) ; les petits chemins de forêt
très étroits sont parfaits ; de grands chemins de terre accessibles aux voitures ; le parc ; sur certains grands axes ou au bord de l'eau, des **pistes cyclables** séparées de la route par une bande d'herbe, de décorations, de fleurs.
Jamais que de grandes routes à voitures.

**Proposition (à confirmer)** : lot 1 = la route (voie de droite, vrais virages), le chemin étroit, le grand chemin, la petite route de campagne, le parc, la piste cyclable d'avenue, le raccourci rare sur le trottoir ; lot 2 = l'eau dans
une ville (berge, quai, pont, piste cyclable au bord de l'eau), qui sert aussi au rameur ; lot 3 = le rameur. Liste fermée des passages d'une voie à l'autre, chacun justifié par ce qu'on voit (`zoneControle`). À 20-25 km/h, les règles
changent : un événement au moins tous les ~130 m (et non 45), un paysage tous les 200 à 350 m, des virages plus larges. Longueur : boucles de 3 à 4 km d'abord, faites plusieurs fois (à 22 km/h, ~10 min le tour) ; plus long demanderait de
construire la zone par tronçons (`moteur/troncons.js` ne sait pas le faire pour une zone). Réglages : longueur, décor, relief, et « ça tourne » (tranquille, sinueux). Pour la machine vélo seulement.

### Étape 15, lot 3 : le rameur (le brief, plan accepté par Kiki le 25/11 ; 3a fait le 25/11, voir juste dessous)

**Avis de Kiki sur la tablette (25/11 : « globalement, c'est très bien, c'est une belle diversité, beaucoup plus vivant »)** ; ses retours faits le jour même : l'escalier qui ne menait nulle part, l'herbe en pente et le personnage enfoncé au pied du pont, les surfaces qui se chevauchaient sur les façades et sous les balcons (détecteur `outils/chevauchements.py`), les jointures des cinq ponts.
**3a, fait le 25/11** : « Le tour de l'île », 1 910 m, ~9 min : le canal des Tanneurs (maisons à pans de bois les pieds dans l'eau, linge tendu), le quai aux Fleurs, les jardins, le passage sous les maisons, le port et
ses péniches, la place du Marché, l'allée des Cerisiers, l'écluse et la base nautique, la pointe et ses saules (première jonction), les roseaux et les cabanes de pêcheurs, les vignes, la passerelle et la guinguette, l'étang, le petit bois, les potagers, le Pont du Moulin,
le barrage et le moulin (seconde jonction). Les 5 points du moteur sont faits (MOTEUR.md, « Ramer dans une zone ») ; la jonction, éprouvée en premier, est sans couture. Aucun circuit retiré : la page est passée de 2 452 à 2 417 Ko (les lignes de commentaire n'y sont plus).
**3b-1, fait et publié le 25/11 (`9c5dd47`) ; premier essai très rapide de Kiki : « ça avait l'air OK »** : le générateur « Autour d'une île » (`jeu/iles.js`, 25 sortes de paysages ; mode d'emploi : MOTEUR.md, « Les circuits au rameur tirés au sort »). **Contrôles** : 72 tirages sur 72 sans défaut, 3 à 6 s de calcul ;
quatre tirages regardés de bout en bout (bourg 1,5 km, pavillons 2 km, immeubles 2,5 km, nature 2 km), de jour, et le soir avec `reel=1` ; aucun triangle de sol au-dessus de l'eau ; `chevauchements.py` : rien de plus que sur `rame-ile` ; banc dans Chrome : 60 images/s, 393 000 triangles au plus ;
prêt en 10 à 13 s ; page 2 490 Ko sur 2 500 ; 44 tests verts (un ajouté). Aucun autre circuit touché. **Pas essayé** : la tablette, une vraie séance. **Vu, pas touché** : le soir avec `reel=1`, face au soleil, le reflet du soleil fait de grosses taches claires près du nageur (l'effet « eau » du rendu réaliste, partout pareil).
**Ensuite, décidé par Kiki le 25/11 : finir le mode rameur à fond d'abord (3b-2, puis 3c). Le circuit du jour passera aux nouveaux générateurs APRÈS** (voir « En suspens »).
**3b-2, fait et publié le 25/11 (`b0a93ad`) ; « Sur une rivière » n'est plus au menu ; vu par Kiki le 25/11 : « c'est sympa, belle diversité, on ne s'ennuie pas, il y a bien de décors » (validé, aucun ⚑ signalé)** : les formes « Sur un lac » et « Aller-retour », et « Surprise » (`jeu/lacs.js` ; mode d'emploi : MOTEUR.md,
« Un lac, un aller-retour, tirés au sort »). **Contrôles** : 72 tirages sur 72 sans défaut par forme (contrôle complet : sol, décor, boucle fermée), 3,5 à 5 s de calcul, 13 s au pire ; l'île : 72 tirages identiques au caractère près ; quatre circuits regardés de bout en bout de jour
(lac bourg 1,5 km, lac nature 2,5 km, aller-retour immeubles 2 km, aller-retour nature 1,5 km), puis le soir et la nuit avec `reel=1` ; aucun triangle de sol au-dessus de l'eau ; `chevauchements.py` : rien de plus ; banc dans Chrome : 56 à 59 images/s (l'île le même jour : 58 à 59) ; prêt en 7 à 14 s (un lac de 3 km : 14 s) ;
page 2 490 → 2 319 Ko (le moteur n'y est plus en double ; éditeur, générateurs du rameur et du vélo essayés dans le navigateur, et dans un cadre comme dans l'appli). **Corrigé en regardant** : le lac trop large et vide (resserré, plus d'îlots, voiliers et nénuphars au large), la plage qui n'allait pas jusqu'à l'eau,
les Pokémon serrés sur les pointes d'îlot, le milieu vide de la rivière large. **Limites** : sur un grand lac en pleine nature, quelques bouts restent ouverts d'un côté (la vue sur le large) ; le grand lac de 3 km est un peu moins fluide (56 images/s). **Pas essayé** : la tablette, une vraie séance.
**À essayer par Kiki** : générer un lac et un aller-retour, un tour en « Auto » de chacun ; dire si c'est varié, si l'eau semble vide par endroits, si c'est fluide. **Ensuite : 3c, l'effort.**
**3c, l'effort au rameur : MIS DE CÔTÉ par Kiki (25/11 : « on verra plus tard, c'est pas la priorité »)**, pas à reproposer. Ses raisons : Ronflex sur l'eau n'a pas de sens, et ça marchait mal au rameur ; une patte d'oie qui part d'un côté ou de l'autre selon l'effort
« ne sert à rien » et marchait mal ; **l'effort est limité au rameur** : Kiki est à 24 coups/min en moyenne et ne monte qu'à 25, 26 au plus : le curseur ne bougeait pas. Si on y revient : jamais un seuil en % de la cadence (8 % = 26 coups, son maximum) ; et une zone n'a aucune fourche aujourd'hui.
**Le brief de 3b-2 (fait), les formes « lac » et « aller-retour » (demandé par Kiki le 25/11)**
- **Ce que Kiki verra** : Rameur → Créer un circuit → Générer → « Où tu rames » : Autour d'une île, Sur un lac, Aller-retour. Mêmes réglages. **lac** : on longe les rives d'un lac par ses criques et ses îlots (village, pontons, roselière, plage, base nautique) ; **aller-retour** : une rive, le tour d'un îlot, l'autre rive.
- **Piège principal** : une eau large est VIDE (constaté en 3a à 25 m). Toujours une rive ou un îlot à 6-12 m du parcours, un événement tous les 70 m, un paysage de 175 m au plus ; le grand large seulement comme vue, jamais comme chemin.
- **Moteur, à éprouver en premier (petit essai avant le générateur)** : rien à ajouter sans doute. Un parcours décalé du fil existe (`{v, cote: "m", decale}` de `cheminDeZone`) ; un îlot = le trou entre deux eaux qui se touchent (`reunir` de zone.js), donc un demi-tour = deux petits bras autour d'un îlot (virage de 11 m de rayon au moins) ; un lac =
  plusieurs eaux larges réunies. À vérifier : `eauEn` et la nappe (`construireEauxUnies`, trame de 2 m) sur une grande surface, le temps de préparation, et que `parcoursRame` garde son sens loin d'un bord (lui ajouter « jamais plus de ~14 m sans rive ni îlot d'un côté »).
- **À reprendre** : `jeu/iles.js` (`brasIle`, la boîte à outils `g`, `PAYSAGES_ILE`, les ponts, le miroir) ; ajouter une `forme*` et les paysages propres au lac (crique, plage, îlot, phare, village au bord du lac), pas un autre système. La forme se tire sur la graine de départ si « au hasard ».
- **La place dans la page d'abord** (2 490 Ko sur 2 500) : la page porte le moteur en double (`SOURCE_PISTE`, `SOURCE_PLAN`, `SOURCE_CHAMP` de page.py : ~220 Ko de texte que l'éditeur relance). Dans la page, les reprendre dans le texte du script lui-même (repères « /* ----- moteur/zone.js ----- */ ») ; avec node, garder les chaînes.
  Contrôle : mêmes tirages au caractère près, éditeur et générateurs essayés. Retirer l'ancien générateur du rameur ne rendrait que ~4 Ko : inutile pour la place ; le retirer seulement si Kiki le dit.
- **Pièges vus en 3b-1** : près d'une jonction, l'autre eau peut être plus proche que le bord (`loinEau` dans `g.berge`) ; toujours remettre l'ambiance à `null` (`ambs`) ; un paysage n'accède qu'à `g` et `c` ; `marge: 70` et des bouts de rivière courts pour préparer en 10-13 s ; arbres et champs à 3 m du bord, sinon on ne les voit pas derrière le talus.
- **Fini quand** : ~70 tirages sans défaut par forme, quelques secondes chacun, page sous 2 500 Ko, 60 images/s au banc ; deux tirages par forme regardés de bout en bout, de jour, et le soir avec `reel=1` ; tests verts (un de plus) ; PLAN, MOTEUR et CLAUDE à jour. `ile` (mêmes tirages au caractère près), le vélo, le marcheur
  elliptique, `vichy-lac` et `rame-ile` ne changent pas. Commit et envoi seulement quand Kiki le dit. Arrêt pour son avis, puis **3c, l'effort**.

**Le brief de 3b, le générateur du rameur (proposé à Kiki le 25/11 après son avis sur 3a, en deux temps ; accepté le 25/11)**
- **3b-1, la forme « île »** (celle qu'il vient de valider) : Rameur → Créer un circuit → Générer → « Autour d'une île ». Réglages : longueur (1,5 à 3 km), ville ou nature, calme ou sinueux, genre de ville. Il faut que deux tirages ne se ressemblent pas :
  l'ordre et le choix des paysages, la part de ville, la largeur de l'eau, les ponts, le village ou les champs autour. Arrêt pour l'avis de Kiki. **3b-2** ensuite : les formes `lac` et `retour`, puis le retrait de l'ancien générateur du rameur (son accord d'abord).
- **Comment** : `jeu/iles.js`, sur le modèle de `jeu/quais.js` (la rivière d'abord, `sur(s, u)`, tout en parallèles) et d'après `outils/zones/rame_ile.py` : une eau principale, un bras qui part et revient d'équerre (coin de 70 à 110°), la largeur doublée aux deux
  jonctions, les bouts de berge tirés par familles de paysages (une liste par ambiance, jamais deux fois de suite le même), les repères posés par `berge` et `eau_` (à récrire en JavaScript). `zone_rame.js` à ajouter à `SOURCE_PLAN` (page.py) pour contrôler les tirages.
- **Pièges vus en 3a** : le départ doit tomber sur une vraie droite (sinon la boucle se referme mal : le refuser au tirage, `PISTE.fermeture` < 0,05 m) ; un pont ou une rue seulement sur un bout droit, d'équerre, et rien d'autre ne croise sa rampe sur 33 m ; le bord dessiné d'un talus
  est ~1 m au large de l'eau qu'on voit ; un pont passe à 3,4 m de l'eau ; le sol est le plus long à préparer (7 s sur 10). Toujours : `chevauchements.py`, et aucun triangle de sol au-dessus de l'eau (contrôle à faire sur quelques tirages).
- **Fini quand** : ~70 tirages sans défaut, quelques secondes chacun, page sous 2 500 Ko (2 429 le 25/11), 60 images/s au banc ; quatre tirages différents regardés de bout en bout, de jour et le soir avec `reel=1` (le réglage de la tablette de Kiki). Le vélo, le marcheur elliptique,
  `vichy-lac` et `rame-ile` ne changent pas.


**La demande de Kiki** : « ce qu'on a fait avec la course et le vélo, cette création de circuit, cette cohérence, cette diversité, il faut réussir à le transposer pour le rameur ». Donc un vrai générateur du rameur, pas seulement passer
sous les ponts. Aujourd'hui le rameur a l'ancien générateur (`MODULES`, `act: "eau"`, de generateur.js : forêt, roche, plage bout à bout, sans lieu ni logique) et `vichy-lac` (à ne pas toucher).

**Constaté le 25/11** (la rivière de `velo-quais` vue à 1,95 m au-dessus de l'eau) : quais, façades, péniches et arches se voient très bien ; **une rivière de 25 m en pleine campagne est vide**. Donc **une eau étroite (9 à 16 m le plus souvent), des
choses tout près**, qui ne s'ouvre que pour un lac ou un port. À son rythme (9 m par coup, 24 coups/min, allure 1) : ~13 km/h ; un paysage toutes les 30 à 40 s (110 à 150 m), un événement tous les ~70 m ; 2 km = 9 à 10 min.

**Trois formes qui bouclent pour de vrai** : `ile` (deux bras autour d'une vieille ville, comme à Strasbourg), `lac` (îles, criques, pontons, village), `retour` (une rive, le tour d'un îlot, l'autre rive). **Paysages** : canal entre les maisons,
quais bas, port de péniches, ponts bas, jardin qui descend à l'eau, lavoir, moulin et sa roue ; guinguette, base nautique, écluse qu'on longe, bras étroit sous les saules, roseaux, vignes, petit souterrain de canal, étang.

- **3a, un circuit d'essai fait main** : le tour d'une île, ~2 km, machine rameur, dessin écrit par un script de `outils/zones/` (modèle : `velo_quais.py`), puis `outils/zone.py`. Arrêt pour l'avis de Kiki.
- **3b, le générateur** : Rameur → Créer un circuit → Générer : longueur, part de ville et de nature, calme ou sinueux, genre de ville, forme (ou au hasard). Modèle : `jeu/quais.js` (la rivière d'abord, tout le reste en parallèles exactes), façon
  tirée sur la graine de départ, ~70 tirages sans défaut, quelques secondes.
- **3c, l'effort** : choisir son bras en forçant (`jeu/fourches.js` existe), rapides ou passe à canoë le long d'un barrage (descente seulement). 3a et 3b sont plats : une eau réaliste ne monte pas.

**Le moteur, ce qui manque** : 1) deux bras qui se rejoignent dans `"eaux"` (aujourd'hui une seule rivière par zone est éprouvée : `eauEn`, `solBerge`, mur du quai coupé sur la trame) : **le risque principal, à éprouver en premier** ;
2) une piste posée sur l'eau dans une zone : hauteur = `eaux[k].y` et non `ZONE.sol` (piste.js, `if (ZONE) … Y[i] = ZONE.sol`), surface `eau` (liquide, nageur, sillage), sans dessiner deux eaux (`construireEaux` et la surface de la piste) ; 3) un
contrôle du rameur (pendant de `parcoursVelo`, réservé au vélo) : rester dans l'eau, largeur libre, rien de dur près du parcours, passer entre les piles et sous les tabliers (tirant d'air), jamais 70 m sans événement ; 4) le quai : 0,7 à 1,2 m au-dessus
de l'eau en général (1,6 à 2,25 dans `quais.js`), sinon on ne voit que des murs ; alterner mur d'un côté, ouvert de l'autre ; 5) la caméra du nageur sous un pont bas et dans un souterrain (`camera.js` : déjà abaissée dans une grotte).
Tout derrière un drapeau (`machines: ["rameur"]`, `eaux`) : **le vélo, le marcheur elliptique et `vichy-lac` ne bougent pas**. Prévoir la place d'un deuxième rameur (fantôme, adversaires).

**Poids** : page 2 452 Ko sur 2 500 ; si ça coince, retirer « La boucle des Quais » (28 Ko), dit à Kiki ; l'ancien générateur du rameur partira plus tard, après son avis sur 3b. **À lire** : MOTEUR.md « L'eau dans une ville » et « Les circuits au bord de
l'eau tirés au sort ». **Pièges déjà rencontrés** : `eauEn` trop lent s'il n'est pas rangé par carrés ; coutures des parapets ; ponts et rues de travers sur un bout droit de rivière seulement ; normaliser CRLF avant un remplacement par script ; les
tests complets durent ~5 min (node portable dans le PATH, `PYTHONUTF8=1`). **Méthode** : regarder tous les 18 à 22 m, ponts et raccords de près, de nuit ; banc dans Chrome (60 images/s) ; commit et envoi seulement quand Kiki le dit.

### Étape 13, lot 3 : le générateur de villes libres (le brief, décidé avec Kiki le 24/11)

**Décidé** : le lot 2 (un grand circuit de 1,6 km fait main) est sauté, il ne prouverait rien de plus ; on passe au générateur, qui reprend les pièces utiles du lot 2. Modèle conseillé :
Opus, effort élevé (extra seulement si les premières villes ne font pas assez vrai). L'étape 14 (ville et nature) vient après : la sortie de ville sera une pièce de plus du générateur.

**Ce que Kiki verra** : Marcheur elliptique → Créer un circuit → Générer → « À pied » : des villes comme « Le quartier des Hauts » (rues courbes, diagonales, montées, carrefours, placette), à la
longueur demandée, toutes différentes. Aujourd'hui « À pied » fait encore les villes plates à angles droits (`tirerVille` de `jeu/villes.js`). Réglages : longueur, dénivelé (plat à ~25 m), graine.

**À faire**
1. `jeu/generateur.js` : `essayerNiveau` (et `solNiveau`) ne chargent SOURCE_PLAN que pour `niveau.plan` : le faire aussi pour `niveau.zone`. `circuitVille` (ligne ~220) et `genererVille` sont l'entrée.
   `editeur.js` ~302 (le message « Voici ton circuit » : pas de note pour une ville), les tuiles de « À pied » (`CASES_GEN.pied`), le dénivelé. `page.generateur` (page.py) doit porter zone.js et villes.js.
2. `jeu/villes.js` : tirer un RÉSEAU de rues qui ait l'air d'un vrai quartier (une boucle irrégulière de rues courbes, des rues traversantes et des diagonales à l'intérieur, des impasses vers
   l'extérieur, une rue commerçante et une placette en bas, une colline), les hauteurs, puis le parcours avec `cheminDeZone` → `niveauDeZone` (déjà écrits et essayés). Varier vraiment : taille
   des îlots, caractère (bourg serré, quartier pavillonnaire, rue d'immeubles), côté où l'on court, changements de trottoir, sens de la boucle. Même graine = même ville partout.
3. Les pièces du lot 2, utilisées par le tirage : une **ruelle** entre deux murs (voie `sol: "paves"`, style « mur » : pas encore dessiné dans `remplirZone`), un **escalier** (des marches ;
   `PENTE_MAX` à assouplir pour lui seul), un **belvédère** (une place en haut, un garde-corps, la vue), un **jardin** (voies `sol: "sable"`, le code existe, jamais vu sur un circuit).
4. Contrôles : une ville qui a un défaut (`zoneControle`) est jetée et une autre est tirée. Vérifier ~20 villes par le calcul (longueurs 0,7 / 1,2 / 1,6 / 2,2 km, plates et pentues), en regarder
   **trois image par image** (`inspecter.py` ; écrire la ville dans `contenu/niveaux/` le temps de l'inspecter, puis l'enlever) avant de les donner à Kiki. Le temps de tirage : quelques secondes.
5. Tests : `Villes.test_une_ville`, `test_le_trottoir_qui_devie`, `test_une_porte_fermee` portent sur l'ancien tirage plat : les adapter. `ville-place` (validé par Kiki) ne bouge pas.

**Les pièges déjà rencontrés** : le départ doit être sur un bout droit (sinon « trop arrondi »), un croisement aussi (8 m droits de chaque côté), 20 m au moins entre deux croisements, une traversée à
moins de 28° de biais, `r` ≥ 8 m pour une rue dont on suit le trottoir ; `courbeZone` et `piecesDuChemin` lèvent une erreur claire (la ville est jetée) ; hauteurs toutes ≥ 0 ; jamais de motif au sol
qui se raccorde (trottoir uni), jamais d'arbre sans tronc près du chemin (`arbre_rue`), jamais d'objet grossier (Kiki). Plafond de la page : 2 460 Ko (2 412 le 24/11), zone.js et zone_plan.js y sont
deux fois (copie pour le générateur).

**Le filet** : `empreintes.py ref` avant de commencer, `compare` à la fin (déjà pris le 24/11 : 12 circuits) ; `fentes.py` ; `python -m unittest discover tests` (197 verts) ; `outils/zone.py ville-hauts` doit
rendre le même niveau. **Essai demandé à Kiki** : générer deux ou trois villes, en courir une ; dire si ça fait vrai et si c'est varié. Demander s'il garde la règle de 45 m et le dénivelé.

**FAIT et publié le 24/11 (plan accepté).** Ce qui suit est la conception, pour mémoire.
Fait ce jour-là : lot 1 publié (`3321cc0`, GitHub vert), ses deux ⚑ lus (ombre du parc au mètre 898, quadrillage et arbre au mètre 175 des Hauts : déjà corrigés), empreintes des 12 circuits identiques.
Dit à Kiki : `ville-place` ne bouge pas, « À pied » ne tirera plus de villes plates ; long = lourd, mesurer, alléger, au pire limiter la longueur ; un des quatre lieux qui ne fait pas bien est laissé de côté.

La conception retenue (à suivre, sauf meilleure idée) :
- **Le réseau** : une trame de carrefours déformée (4 à 6 lignes par sens, mailles de 70 à 120 m, bruit doux, rotation), une déformation par caractère : bourg (anneaux et rayons, rues étroites, maisons
  serrées, nouveau style « serre »), pavillons (grandes courbes), immeubles (presque droit, large, `residences`), coteau (rues le long des courbes de niveau). Chaque ligne = une voie. Entre deux carrefours
  Pi → A → B → Pi+1, A = Pi + tangente × 0,36 L (la tangente d'un carrefour = la direction de ses voisins ± un peu) : droit 9-10 m de chaque côté du carrefour, une courbe ou un S entre les deux ;
  r = la place disponible / tan(th / 2), entre 14 et 90 ; angle entre deux rues 62 à 118°, sinon tirage jeté avant tout calcul lourd.
- **Le parcours = le bord d'un groupe de mailles** : on part d'une maille, on en ajoute au hasard (groupe sans trou ni point de pincement) jusqu'à la longueur ; des centaines d'essais ne coûtent rien ; on
  garde le meilleur (longueur, lieux traversés, virages variés), puis on met toute la trame à l'échelle pour la longueur exacte. Une **ruelle, un escalier ou une allée de jardin coupe une maille en
  deux** d'une rue à l'autre (milieux de deux côtés) : elle entre alors dans le parcours comme n'importe quelle rue.
- **Gardé** : les rues du parcours et celles de l'intérieur ; vers l'extérieur, des amorces de 45 à 75 m ; quelques-unes enlevées au hasard (carrefours en T). À chaque coin, une des deux rues continue
  (jamais deux rues qui finissent ensemble : un L serait mal dessiné). Les voies du parcours écrites en premier (hauteurs). Côté de la rue : le même tout le tour, avec une ou deux traversées droites.
- **Les hauteurs** : un champ lisse (une colline), `y` aux carrefours ; pente moyenne d'une rue 6,5 % au plus (le lissage la multiplie par 1,5) : l'amplitude est bornée par la longueur.
- **Placette** : à un coin du parcours, 26 à 34 m, coupée en diagonale (droite libre, r 12), des boutiques sur ses deux autres côtés (une « voie » factice de h = 0 pour FILES) ; rue commerçante à côté
  (`boutiques` à 14 m au moins des carrefours).
- **Ruelle** : `sol: "paves"`, style « mur » à dessiner (murs de 2,2 m, pans de 3,2 m au plus). **Escalier** : ruelle avec un tronçon à 25 % (marches en boîtes sur la rampe, rampe au milieu, `PENTE_MAX`
  levé là seulement). **Belvédère** : place à mi-hauteur côté intérieur, garde-corps, aucun arbre ni maison devant sur 45 m (la ville vue d'en haut). **Jardin** : maille sans maisons, haies, `portail_parc`,
  `kiosque`, allées `sable` courbes.
- **Le code** : `tirerVille` (plate, 9 Ko) à retirer de villes.js (`ville-place.json` est déjà un fichier ; l'essai des villes plates se fait dessus) ; `circuitVille` et `essayerNiveau` pour `niveau.zone` ;
  `ED.msg` : pas de note pour `zone` ; éditeur : texte de la tuile « À pied » et puces de relief (Plat, Vallonné, Ça grimpe). Cribles bon marché avant `zoneControle` (longue ville : plusieurs secondes).

**Retours de Kiki sur « Le tour de la place et du parc » (24/11, sur la tablette) : validé.** Transitions rue → parc → place, virages, caméra, largeur du trottoir : très bien ; 60 images/s
tout du long. **À changer : les lignes droites sont trop longues** (on avance très doucement, ~1,8 m de décor par seconde au trot : 200 m de boulevard = presque 2 min). Règle pour les
étapes 13 et 14 : à pied, jamais plus de ~45 m (25 s) sans qu'il se passe quelque chose (une courbe, un coin, une traversée, une placette, un passage, une pente, un changement de côté
de rue, un commerce, un Pokémon), sans zigzags artificiels ; le contrôle et le générateur doivent le mesurer. Une ombre d'arbre bizarre signalée : le rond vert sous l'arbre débordait sur
l'allée (corrigé dans `Forme.ombre`). Le signalement lui-même n'était pas encore arrivé dans le dépôt à la lecture (page pas rechargée, ou à vérifier).

Pourquoi cet ordre s'écarte un peu de celui de Kiki : le circuit du jour vient après le générateur noté (sans note, un circuit
quelconque chaque jour) ; Ronflex vient avant les embranchements (même brique « effort », bien moins risqué pour la mettre au point).

Non retenus, car indispensables à aucune étape : le rangement du code (chantier 1), la page plus légère et le hors ligne (chantier 3),
le changement de version de three.js.

## Quel modèle pour quelle étape (conseil du 14/11)

Prix publics au 03/11/2026 : Fable 5.2 coûte 2 fois Opus 5.5 et 4 fois Sonnet 5.5 (l'abonnement de Kiki peut compter autrement).
La règle : **Fable** quand on touche au cœur (`moteur/`) ou qu'il faut inventer quelque chose ; **Opus** quand on ajoute autour
(séances, serveur, contenu) ; **Sonnet** pour le mécanique. Si Opus échoue deux fois sur le même point, passer à Fable plutôt qu'insister.

| # | Étape | Modèle | Effort | Pourquoi |
|---|---|---|---|---|
| 0 | Filets | Sonnet | moyen | installation, captures, vérifications : rien à inventer |
| 1 | Toutes les machines enregistrées | Opus | élevé | touche à Poké Fit (double compte) : une erreur fausserait les points |
| 2 | Records et fantômes sur le serveur | Opus | élevé | des données gardées sur le serveur : à ne pas abîmer |
| 3 | Fantômes des amis, classement | Opus | moyen | suite directe de l'étape 2 |
| 4 | Générateur noté | Fable, puis Opus | élevé, puis moyen | décider ce qu'est un « bon » circuit est de la conception ; la planche et le reste : Opus |
| 5 | Circuit du jour | Opus | moyen | une tâche GitHub et un classement |
| 6 | Ronflex et lieux de Kanto | Opus | moyen | du contenu, dans `contenu/` ; Fable seulement pour la brique « effort » si elle coince |
| 7 | Embranchements | **Fable** | élevé | la piste elle-même : le chantier le plus risqué du plan |
| 8 | Route GPS et home trainer | Fable (tronçons), Opus (import GPS, Bluetooth) | élevé, puis moyen | les tronçons touchent au cœur, le reste non |
| 9 | Forêts, vent, ombres, eau | **Fable** | élevé | du rendu fin, là où le résultat « amateur » a déjà déçu Kiki |
| 10 | Résumé de séance | Opus | moyen | rejouer une trace avec une caméra |

L'effort : **moyen** par défaut, **élevé** quand une erreur coûte cher (points de Poké Fit, données du serveur, cœur du moteur).
Jamais « max », et « très élevé » seulement si « élevé » a échoué sur un point précis : au-dessus d'« élevé », le gain est irrégulier
et la dépense monte vite. Monter l'effort d'un cran avant de changer de modèle.

## En suspens (à décider avec Kiki)

- **Le circuit du jour sur les nouveaux générateurs : fait le 25/11 (« vas-y, passe au circuit du jour »), publié le 25/11** : trois circuits indépendants chaque jour, un pour le rameur (île, lac ou aller-retour), un pour le vélo (ville et campagne, ou au bord de l'eau), un pour le marcheur elliptique (à pied) ;
  `riviere/jour.py`, `riviere/outils/circuit_du_jour.py` ; mode d'emploi : MOTEUR.md, « Le circuit du jour ». **La tâche GitHub partait 9 à 11 h en retard** (11 h à 14 h UTC au lieu de 2 h 20) : le circuit du jour n'arrivait qu'à midi passé ; elle écrit désormais celui du jour ET du lendemain, et ne refait jamais un jour déjà écrit.
  **Contrôles** : 30 jours de suite, 90 circuits sur 90 du premier coup (contrôle complet : sol, décor), 25 s par jour, 100 à 200 Ko ; menu et essai des trois machines dans Chrome sans erreur. **Essai de Kiki** : le matin, choisir la carte ☀️ de sa machine. L'ancien générateur du rameur (`MODULES`, `act: "eau"`) ne sert plus à rien : à retirer avec son accord.

- **Étape 3 mise de côté (14/11, Kiki)** : il est seul à jouer. Dès qu'il parle de multijoueur ou d'amis qui veulent jouer, le lui rappeler
  et la faire (plan court déjà proposé : option « Les amis » au choix du fantôme, fantômes aux couleurs de leur carte avec pseudo, classement
  par circuit et par segment sous le nom du circuit, faux ami sur le serveur d'essai). On passe à l'étape 4.
- **Les amis ne peuvent pas jouer aujourd'hui** : le jeu avance grâce à l'appli « Capteurs » de la Pixel Watch de Kiki. Sans un moyen
  pour eux (le téléphone comme capteur, ou un capteur Bluetooth), l'étape 3 et le classement du jour n'ont que Kiki dedans. Chantier à
  part, à décider avant l'étape 3.
- **Le home trainer** : le Bluetooth (`jeu/capteurs.js`) a été écrit sans appareil. L'étape 8 n'a de sens qu'avec un vrai home trainer
  sous la main ; sinon elle passe en dernier.
- **Routes réelles : chantier à part, rien de lancé (15/11, Kiki : « très intéressé par la possibilité de refaire des routes réelles »)**.
  Idée : rouler une vraie route (20 km et plus), tracé et relief à l'échelle 1:1, habillée en Kanto d'après ce qu'on voit vraiment le long.
  - **Le tracé** : un fichier GPX (Strava, Komoot, une sortie de Kiki) ou une route choisie sur une carte. Plutôt OpenStreetMap et ses
    calculateurs d'itinéraire vélo (gratuits) que Google Maps (compte Cloud, carte bancaire, payant au-delà d'un quota : contre la règle
    « gratuit seulement »). Altitude : sources gratuites. Un outil le change en niveau normal (`contenu/niveaux/`) : lisser le tracé et
    l'altitude (le GPS tremble), élargir les virages trop serrés (rayon > demi-largeur + 1,5 m), pont ou croisement à niveau si la route
    repasse sur elle-même. **Aucune coordonnée dans le niveau** (seulement des formes : dépôt public, la route peut trahir le domicile) ;
    le GPX jamais dans ce dépôt.
  - **Prérequis** : les tronçons (construire devant, effacer derrière) dès ~5 km, donc la partie risquée de l'étape 8 (Fable). Sans eux :
    un extrait de 5 km au plus (recommandé pour une 1re version : les 5 km les plus durs, vraies pentes, aller simple, arche au sommet).
    **Jamais raccourcir une route** (les pentes seraient fausses).
  - **Le décor « tous les 50 m »** (idée de Kiki) : 400 points pour 20 km, à chacun on note ce qu'on voit à gauche et à droite, de près et
    au loin, dans une liste fixe (maisons, immeubles, commerces, église ; forêt, haie, bosquet, arbres isolés ; champ, prairie, barrières,
    vaches = Écrémeuh ou Tauros ; rivière, lac, pont, mur, talus, rien) ; le jeu pose les objets de Kanto qui vont avec, transitions douces.
    Fidèle « à peu près » : on reconnaît l'enchaînement de la route, pas chaque maison. Village = Centre Pokémon et Boutique.
  - **Sources du décor, dans l'ordre conseillé** : 1) OpenStreetMap (gratuit, automatique, presque sans crédits : bâtiments, forêts,
    champs, prés, eau, parfois haies et clôtures ; citer « © les contributeurs d'OpenStreetMap ») pour la base ; 2) Mapillary (photos de
    rue libres, accès officiel prévu pour ça, couverture moindre que Google) ou **une vidéo de la route filmée par Kiki** (téléphone sur le
    guidon ou le pare-brise : ses images, le plus fidèle) pour les détails. Analyser 400 à 800 images coûte des crédits, une fois par route.
  - **Écartés** : Street View (les conditions de Google interdisent de récupérer ses images en masse et d'en tirer des données ou du décor ;
    en faire du décor 3D donnerait des façades étirées, refusé par Kiki depuis le Circuit de la Baie) ; les tuiles 3D photoréalistes de
    Google (payantes, lourdes pour la tablette, style photo qui jure avec le pixel art).
  - **Pente** : avec un home trainer, il reçoit la pente, réglage « Dureté des pentes » 0-100 % (50 % par défaut) ; sans, la côte ralentit
    seulement le décor, chiffres vrais. Un classement et un fantôme par route.

- **Envoyé sur GitHub le 15/11** : étapes 2 et 4 et la note de l'étape 3, ensemble
  (puis `gh run list --limit 3`).

## Ce dont Kiki aura besoin de faire

- Étape 0 : son accord pour installer node sur ce PC, hors du dépôt.
- Étape 1 : une vraie séance de skieur de fond, puis vérifier qu'elle apparaît une seule fois dans Santé.
- Étape 2 : ouvrir le jeu sur la tablette puis sur le téléphone, et voir le même record.
- Étape 7 : au rameur, le circuit « L'île aux rapides » : forcer quand « FOURCHE ! » s'affiche (les rapides et la chute), puis un tour sans
  forcer (le bras tranquille) ; dire si la séparation est propre et si « 8 % plus vite pendant 5 s » est trop dur ou trop facile.
- Étape 8 : sur la tablette, au vélo, « Le Ventoux, la forêt » : l'ouvrir (combien de secondes de chargement ?), un essai « Auto » de quelques minutes, puis le banc
  (`&banc=1`) ; dire si le col se sent (bornes, pente, arche). Puis, s'il en a un, le home trainer : le relier, une vraie séance, régler la dureté. Et s'il veut
  une autre route : un GPX (Strava, Komoot, ou un lien brouter.de), donné à Claude, jamais dans le dépôt.
- Étape 8, lot 3 : sur la tablette, au vélo, « Le Ventoux en entier » : combien de secondes avant le menu ; quelques minutes en « Auto » : dire si ça
  saccade par moments (surtout dans les lacets) et si quelque chose apparaît d'un coup au loin ; `&perf=1` puis `__troncons()` si Claude le demande.
- Étape 9 : sur la tablette, « La Baie de Carmin » (la vitrine) une minute avec les effets, puis sans (Réglages → Ambiance → Les effets) ; dire, effet par
  effet (l'eau qui coule, le vent, les forêts au loin, les ombres), si c'est mieux ou si ça fait « amateur » : chacun se retire seul. Puis le banc
  (`&banc=1` dans l'adresse) avec et sans, et donner les deux chiffres à Claude.
- Étape 10 : une séance d'essai (« Essayer sans montre », Auto, 3-4 min, sur le Huit ou « L'île aux rapides » en forçant à une annonce), « ■ Fin », regarder
  le film ; dire si c'est trop long ou trop court et quels plans plaisent ; puis une vraie séance.
- Jamais essayés à ce jour : le téléphone, un vrai capteur Bluetooth, la page dans l'appli.

## Repères dans le code (pour ne pas les rechercher)

- **Séances** : `jeu/seance.js` écrit la séance dans le localStorage `pkm_rameur`, la page de l'appli se recharge, `app.py`
  (`envoyer_rameur`) la passe à `seances_rameur.ranger` → `data/rameur/seances.json` (branche data). `seances_rameur.fusionner` en fait
  une séance de la journée et remplace celle de la montre qu'elle recouvre. Depuis l'étape 1 : les trois machines, même format (`machine`),
  le skieur de fond et le vélo dans `data/machines/seances.json` (`seances_rameur.AUTRES`) ; détails dans `MOTEUR.md`.
- **Records, fantômes, segments** : sur le serveur depuis l'étape 2 (`data/riviere/records.json` du joueur, `seances_rameur.garder_records`),
  copie dans le navigateur ; tout passe par `jeu/records.js` (`CLE_CIRCUIT` avec l'empreinte du tracé, `SERVEUR`, `recordsAEnvoyer`). Mode d'emploi : `MOTEUR.md`.
- **Écrire sur le serveur** : `app.ecrire_depot` (le jeton GitHub de l'appli), comme pour `data/dresseurs/`.
- **Générateur** : `genererCircuit` dans `jeu/generateur.js`. Depuis l'étape 4, sa recherche compte ses tirages (plus de limite de temps) :
  mêmes options, même circuit, dans le navigateur comme avec node (vérifié le 15/11). Sans navigateur : `page.generateur(options)`,
  `python riviere/outils/generer.py` (`--notes`, `--ecrire <nom>`). Pour le circuit du jour (étape 5) : monter `--tirages` (GitHub a le temps).
- **Note d'un circuit** : `noterCircuit` dans `jeu/note.js` (tables `FAMILLES`, `POIDS_NOTE`, `RYTHME` en tête du fichier) ; elle rend aussi les
  séquences de paysage (`sequences`), les repères et les moments forts avec leur instant, que dessine la planche.
- **Planche** : `python riviere/outils/planche.py [circuit…]` → `riviere/outils/planches/<nom>.png` (hors dépôt). Pour l'étape 5 : la faire sur le circuit du jour.
- **Fourches** (étape 7) : le tracé dans `moteur/piste.js` (`resoudreVoie`, `voies`, `VOIES`, `surVoie`, `idx`, `at`), le choix dans
  `jeu/fourches.js`, les modules `fourche` et `fourche_t` de `jeu/generateur.js`, le circuit d'essai `contenu/niveaux/fourche.json`.
  Mode d'emploi : `MOTEUR.md`, « Une fourche ». Réglages : `effort` dans la fourche du niveau (`seuil`, `duree`), `DECIDE` et la zone dans fourches.js.
- **Résumé de séance** (étape 10) : `jeu/film.js` (trajet `FILM.t/s/d/v`, moments `filmEvenement`, choix `filmChoisir`, plans `filmCadrer`) ;
  branché dans `boucle` de jeu.js (`filmNoter`, `filmAvance`) et au bouton « ■ Fin » de seance.js. Essai sans ramer : `__filmEssai(minutes)`.
- **Effets du rendu** (étape 9) : l'interrupteur `EFFETS` dans `moteur/depart.js` ; le vent et les ombres dans `moteur/effets.js` (`VENT_VS`, `PORTEE_FS`,
  `construireOmbres`, `effetsMaj`) et `Forme.vent` ; le courant dans `moteur/surfaces.js` (`courantEau`, `EAU_COURANT`) ; les forêts à la fin de `poserDecor`
  (`"forets"` de la région, recette `arbre_masse`) ; les crans de qualité dans `regler` de jeu.js ; le réglage du menu dans seance.js (`data-x`).
  Mode d'emploi : `MOTEUR.md`, « Les effets du rendu ». Vérifier « sans effets = comme avant » : `test_effets`, `captures.py compare --niveau kanto-1km`.
- **Vraies routes** (étape 8) : `outils/gpx.py` (GPX → niveau), `borne_km` et `arche_arrivee` dans `contenu/objets/kanto-routes.js`, `VU_LOIN` (outils.js)
  pour le sol des grandes routes (terrain.js) et le contrôle du sol (note.js) ; le home trainer dans `jeu/capteurs.js` (`brancher`, `perdu`, `penteTrainer`,
  `fauxHomeTrainer`). Mode d'emploi : `MOTEUR.md`, « Une vraie route ».
- **Tronçons** (étape 8, lot 3) : `moteur/troncons.js` (`TR`, `trSol`, `trBande`, `trDecor`, `trVoir`, `tronconsMaj`, `tronconsDemarrer`) ; l'interrupteur `TRONCONS` à la fin
  de la piste (piste.js) ; ce qu'il partage avec le monde d'un bloc : `poserDecorPas(Z)`, `zoneTroncon`, `kMonde` (decor.js), `fabriqueRives`, `celluleSol`, `sommetSol`
  (terrain.js), `fabriquePiste` (surfaces.js), `ombrePour` (effets.js), `refaireHalos` (ambiance.js), `ajouterPublic` (sprites.js) ; le contrôle : `decorParTroncons` (controle.js).
  Mode d'emploi : `MOTEUR.md`, « Les longues routes ». Le GPX du Ventoux n'est pas dans le dépôt (à redemander à brouter.de : Bédoin → sommet, profil vélo de route).
- **Tests** : `.github/workflows/tests.yml` (« Tests des règles », à chaque envoi). Sur ce PC, node manque : 3 tests du moteur sont sautés.
  `gh` marche ici.

## État de départ (14/11/2026, commit `4488410`)

- Tests sur ce PC : 6 passent, 3 sautés (node absent). Tests sur GitHub : verts.
- Rien du plan n'est commencé.

## Journal des étapes

(Une ou deux lignes par étape finie : la date, ce qui a été fait, ce qui reste à essayer.)

- **Étape 0 — Filets (14/11/2026, Sonnet).** Node 26 portable (ARM64) dans `C:\Users\kikit\Android\node-v26.13.1-win-arm64`, hors dépôt, **pas dans le PATH
  de Windows** : avant les tests, `export PATH="/c/Users/kikit/Android/node-v26.13.1-win-arm64:$PATH"` (Git Bash), puis `python -m unittest tests.test_riviere` :
  10 tests, les 3 du moteur ne sont plus sautés. Nouveau test `test_budgets` : par circuit, construction < 8 s (mesuré 0,7 à 1,8 s),
  < 220 000 triangles (mesuré 36 000 à 146 000), page < 1 900 Ko (mesuré 1 265 Ko). Un dépassement = un signal, pas forcément une panne.
  **Captures de référence** : `python riviere/outils/captures.py ref` (10 endroits par circuit, Chrome sans fenêtre, 960×540, `?fige=1&h=432`), puis après
  une modification `python riviere/outils/captures.py compare` (liste les images changées, écrit les différences dans `riviere/outils/captures/diff/`).
  Images gardées sur ce PC seulement (`.gitignore`). Lent (pas de carte graphique en mode sans fenêtre : de l'ordre de 20 min pour les 6 circuits) ;
  `--niveau <nom>` pour un seul. `?fige=1` fige aussi le temps des animations (`T` dans `jeu.js`) : seul changement du jeu, sans effet hors `fige`.
  Alerte : après chaque envoi, `gh run list --limit 3` et dire à Kiki vert ou rouge (déjà dans la marche à suivre).
- **Étape 1 — Toutes les machines enregistrées (14/11/2026, Opus).** Décidé avec Kiki : aucune règle nouvelle. Skieur de fond = séance
  `ELLIPTICAL` de Poké Fit (Psy, Spectre, Fée ; 1 point par minute dès 10 min), sans pavé de fin, distance estimée vers le bas gardée à part
  (`estime`, affichée avec ≈, jamais comptée ni apprise). Vélo = `BIKING_STATIONARY` (Vol, Normal, mission Roucoups, km du vélo), gardé
  seulement si un vrai capteur Bluetooth a donné la vitesse. Le rameur reste dans son fichier, les autres dans `data/machines/seances.json` :
  son apprentissage, Carapuce, la mission Otaria et sa carte de Santé ne les voient jamais. Tests : 7 de plus dans `tests/test_regles.py`
  (`TestMachines`), 155 au total, tous verts ; essayé dans le navigateur (fin de séance des trois machines, séance passée par `ranger` et
  `fusionner`). Captures de référence pas refaites : rien du dessin n'a changé. **Reste à essayer par Kiki** : une vraie séance de skieur de
  fond au parc, le jeu ouvert depuis l'appli, puis la voir une seule fois dans Santé. Vélo : pas essayable sans home trainer.
- **Étape 2 — Records et fantômes sur le serveur (14/11/2026, Opus).** Le meilleur tour, son fantôme (allégé à un point par seconde) et les records
  de segments partent avec une séance enregistrée (`records` à côté de `seance` dans `pkm_rameur`) et sont rangés dans `data/riviere/records.json`
  du joueur (`seances_rameur.garder_records` : jamais un temps moins bon) ; l'appli les redonne au jeu (`D.records`), qui prend le meilleur du serveur
  et de la machine (`jeu/records.js`). Clé = machine, circuit, mètres du tour et **empreinte du tracé construit** (`kanto-1km` : `1tlda7a`). Décidé
  avec Kiki : les anciens records de la tablette (des essais) ne sont pas repris, ils repartent de zéro. Tests : `tests/test_records_riviere.py`
  (9), 164 au total, tous verts ; essayé dans le navigateur (record, fantôme et segment venus du serveur, menu « Ton record (5:00,0) », séance
  enregistrée avec sa trace, ~3 Ko). Serveur d'essai : `?records=1`. Captures de référence pas refaites : rien du dessin n'a changé.
  **Reste à essayer par Kiki** : une vraie séance sur la tablette, puis le jeu ouvert sur le téléphone avec le même record et le même fantôme.
- **Étape 4 — Générateur noté, première moitié (15/11/2026, Fable).** **La note** (`jeu/note.js`, sur 100, sept critères avec leur raison en clair) :
  rythme 30 (part du tour passée dans un paysage vu depuis plus de 45 s ; la règle de Kiki : un changement toutes les 20 à 40 s), variété 20,
  contrastes 10, repères 15, moments forts 15, relief 5, lignes droites 5. Elle ne lit que la piste construite : aucun dessin. Elle s'affiche
  dans l'éditeur (une ligne sous le plan avec le point faible, le détail dans l'onglet « Générer ») et pour tout circuit. Notes du 15/11 :
  essai (le Huit) 89, bourg-palette 84, terre-volcan 81, vitrine 74 (son retour : 2 min 32 de ligne droite dans les prés), terre-huit 63,
  kanto-1km 59 (un changement toutes les 1 min 07). **Kiki, 15/11 : pas encore essayé, « je pense que ça va coller »** : classement accepté de confiance ; s'il ne colle pas à l'usage, régler les tables.
  **Le générateur** garde le mieux noté de 8 tirages valables au lieu du plus ramassé, et fait trois choses de plus : il **habille les rives**
  des bouts ordinaires pour que la note monte (`habiller`, `HABITS` : prés, lisières, forêt, falaise, gorges, dunes ; même tirage : 60 → 78),
  il **déplie le retour** (`deplierRetour` : le raccord de 300 à 500 m devient des pièces d'une centaine de mètres, habillées elles aussi),
  et il **contrôle le sol** du circuit retenu (`solNiveau`, le même balayage que les tests : `scannerSol`), avec repli sur le suivant.
  **Sans navigateur** : `python riviere/outils/generer.py` ; même circuit que dans le navigateur (empreinte comparée, eau et terre).
  Constats : des marches dans le sol existaient déjà dans les circuits générés et personne ne les voyait ; sur la terre avec beaucoup de
  dénivelé (120 m, col et volcan), presque tous les tirages en ont : le générateur le dit (« son sol a une marche ») et `--ecrire` refuse.
  Les corriger demanderait de toucher au cœur (`champ.js`) : pas fait. Le cœur (`moteur/`) n'a pas été touché, `kanto-1km` non plus ;
  captures de référence pas refaites (rien du dessin n'a changé). Tests : 3 de plus (167, tous verts). Durée dans le navigateur : 2 à 3 s
  pour 2 km, une douzaine de secondes pour 4 km très sinueux. Pas de ligne dans 🧪 (rien à y toucher : c'est dans l'éditeur de La Rivière).
  **Reste pour finir l'étape (Opus)** : la planche (une quinzaine d'images le long du circuit) et sa frise, dessinée depuis `sequences`.
  **Reste à essayer par Kiki** : dire si le classement des 6 circuits lui paraît juste ; générer 3 ou 4 circuits et les essayer.
- **Étape 4 — Générateur noté, fin (15/11/2026, Opus).** **La planche** (`riviere/outils/planche.py`) : une image par circuit, dans
  `riviere/outils/planches/` (hors dépôt) : le nom, la note et ses sept critères (en vert, orange ou rouge), jusqu'à 16 vues prises dans
  Chrome sans fenêtre (une au milieu de chaque paysage, une juste avant chaque moment fort, en cadre rouge, avec l'instant du tour ; chiffres
  et boutons du jeu cachés), puis la frise du tour : chaque paysage en couleur à sa vraie durée (deux couleurs quand les rives diffèrent),
  les repères au-dessus, les moments forts dessous, une légende. Tout vient de `noterCircuit` : rien d'inventé. ~2 min par circuit. Un circuit
  du générateur : `generer.py … --ecrire <nom>` puis `planche.py <nom>`. Test : `test_planche` (assemblage sans navigateur). Le jeu n'a pas
  changé (ni moteur, ni `kanto-1km`, ni séance). **Reste à essayer par Kiki** : regarder les 6 planches et dire si le classement lui paraît juste.
- **Étape 5 — Circuit du jour (15/11/2026, Opus, enchaînée avec la 6 à la demande de Kiki, sans plan court).** `riviere/jour.py` (réglages tirés de la date,
  classement), `riviere/outils/circuit_du_jour.py` (générateur noté, 24 tirages, contrôle complet, 4 essais ; ~1 min pour les deux), tâche GitHub
  `circuit-du-jour.yml` (3 h 20 et 4 h 50, `SANTE_TOKEN`) → `data/riviere/jour/AAAA-MM-JJ.json` (branche data, dépôt privé). L'appli le lit (celui de
  la veille tant qu'il manque), calcule le classement depuis les records de chaque joueur (étape 2) et le donne au jeu (`D.jour`) : en tête du menu,
  sa note, le classement de ta machine. Décidé par Claude : pas de classement dans la page Dresseur (Kiki joue seul ; le menu suffit), pas de planche
  sur GitHub (rien ne la regarderait). Tests : `tests/test_circuit_du_jour.py` (5). Essayé : le circuit du 15/11 tiré sur ce PC (eau 74/100, terre
  68/100), le menu et le classement au serveur d'essai (`?jour=1`). **Pas encore essayé** : la tâche sur GitHub (lancer « Circuit du jour » à la main
  une première fois dans l'onglet Actions, ou attendre la nuit), le menu dans l'appli. **À essayer par Kiki** : ouvrir La Rivière le matin, choisir
  « ☀️ Circuit du jour », faire une vraie séance, voir son temps au classement à la visite suivante.
- **Étape 6 — Ronflex et la brique « effort », premier lot (15/11/2026, Opus).** `jeu/effort.js` (croisière qui s'ajuste, `demanderEffort`), `jeu/rencontres.js`
  et `contenu/evenements/ronflex.js` : Ronflex dort sur la route ; forcer 8 % au-dessus de sa croisière pendant 5 s le réveille (il saute, s'en va sur la
  rive, saute de joie), sinon on rebondit sur son ventre. Posé dans le Huit (`essai`), `terre-huit`, case du générateur, et dans le circuit du jour un jour
  sur deux. `kanto-1km` inchangé (aucun objet ajouté ; seules deux fonctions vides tournent). Essayé dans le navigateur (réveil en forçant, rebond à
  l'allure habituelle, rendormi derrière soi). **Reste du lot suivant** : les lieux iconiques de Kanto (Lavanville et sa tour, pont Pépite, Parmanie…)
  en modules. **À essayer par Kiki** : le Huit au rameur, accélérer quand « RONFLEX ! » s'affiche ; dire si 8 % pendant 5 s est trop dur ou trop facile
  (réglage : `seuil` et `duree` dans rencontres.js).
- **Étape 7 — Embranchements à l'effort (15/11/2026, Fable ; carte blanche de Kiki pour les deux lots, faits d'un trait).** Décidé : la piste reste
  une ligne ; une fourche (`{"fourche", "calme", "force"}` dans un niveau) ajoute une deuxième voie entre deux mètres de cette ligne. La voie calme
  EST la ligne ; la voie « force » a exactement autant de mètres (ses longueurs sont ajustées par le moteur) et compte exactement les mêmes vrais
  mètres : la position reste un seul nombre, un seul record par circuit. Ses mètres sont rangés à la suite de ceux de la ligne dans les tableaux de
  `PISTE` ; `idx(s)` et `at(s)` suivent la voie prise (`VOIES`, `surVoie`). Tant que les deux eaux se touchent (~35 m aux deux bouts), la voie
  « force » copie la hauteur, la largeur, les rives et l'eau de la calme ; la pointe de l'île sort de l'eau peu à peu. **Le jeu** (`jeu/fourches.js`) :
  « FOURCHE ! », la distance et une jauge ~28 s avant ; 8 % plus vite que sa croisière pendant 5 s = la voie « force », sinon la calme, sans rien
  perdre ; choix arrêté 26 m avant, oublié 45 m après. Le fantôme garde et reprend ses voies (aussi sur le serveur : `v`), les adversaires restent
  sur la calme, le plan montre les deux voies, le sillage ne se dessine que sur sa voie. **Autour** : circuit d'essai « L'île aux rapides »
  (`fourche.json`, 1 004 m : bras tranquille ou rapides, tremplin et chute de 3 m, puis plage, falaise, Cascade, lac, sous-bois ; note 53) ; modules
  `fourche` (eau) et `fourche_t` (route ou chemin de terre à bosses) du générateur, case dans l'éditeur (la fourche s'y voit, se nomme, se retire ;
  ses pièces se retouchent par le texte), deux jours sur cinq dans le circuit du jour, la note compte une fourche comme repère et moment fort.
  **Le filet** : avant / après sur les 6 anciens circuits : signature chiffrée de la piste, du sol, des rives libres et du décor identique ; tous les
  maillages construits identiques au bit près (terrain, rives, eau ou route, ponts, grottes, décor) ; images au hasard figé identiques sur les
  circuits d'eau (moins de 0,1 % de pixels), bruit du cycliste et des particules sur les deux circuits de route (mesuré : le même code pris deux fois
  diffère d'autant). Empreintes des tracés inchangées (records gardés) ; le générateur rend les mêmes circuits qu'avant sans la case « fourche ».
  Tests : 176, tous verts (4 de plus : `test_fourches`, `test_fourche_impossible`, les voies gardées avec un record, la fréquence du jour).
  Essayé dans le navigateur : les deux voies de près et de haut, la jonction, deux tours simulés (un en forçant, un sans : annonce, jauge, voie
  prise, chute, retour, fantôme sur sa voie), l'éditeur, un circuit de route généré avec sa fourche. Captures de référence refaites le 15/11
  avant le chantier (elles dataient d'avant Ronflex). Pas de ligne dans 🧪 (c'est dans La Rivière). **Limites connues** : une seule voie « force »
  par fourche, pas de fourche dans une fourche ni sur la ligne de départ ; un pont d'une voie n'est pas rallongé tout seul au-dessus de la piste ;
  dans l'éditeur, les pièces d'une fourche ne se règlent pas au curseur ; « Auto » de l'essai ne force jamais (pour voir la voie « force » :
  toucher l'écran plus vite, ou `?voie=1`) ; aucun panneau dans le décor n'annonce la fourche (seulement l'écran). **Pas encore essayé** : la
  tablette, une vraie séance, le circuit du jour avec fourche sur GitHub. **À essayer par Kiki** : « L'île aux rapides » au rameur, un tour en
  forçant à l'annonce, un tour sans ; dire si la séparation est propre et si 8 % pendant 5 s est le bon réglage (`effort` dans la fourche du
  niveau). **Aussi dans la copie de travail, d'une autre conversation du 15/11, pas de cette étape** : la correction de `code_a_jour` dans `app.py`
  et la note « Routes réelles » ci-dessus.
- **Étape 10 — Résumé de séance (15/11/2026, Opus ; étapes 8 et 9 laissées pour plus tard par Kiki).** Plan court accepté tel quel (film
  automatique à « ■ Fin », « Passer »). `jeu/film.js` : pendant la séance, le trajet en mémoire toutes les 0,2 s (temps, mètre de décor, vrais
  mètres, voies prises), l'heure des coups, et les moments signalés (`filmEvenement` : tour avec son temps et « record », Ronflex réveillé,
  « BOING ! », fourche prise) ; le reste se retrouve dans le trajet (sauts = pièces `net` d'au moins 1,5 m de chute, entrées de tunnel, nouveaux
  paysages par le titre des pièces, plus gros effort = les 4 s les plus rapides, s'il dépasse la moyenne de 12 %). `filmChoisir` : jusqu'à 5
  moments par score (record 100, Ronflex 80, fourche 70, saut 60-80, meilleur tour 55, BOING 50, effort 40, tunnel 25, paysage 10), jamais
  deux fois le même endroit, sans chevauchement, remis dans l'ordre, ~5 s chacun. Plans (`filmCadrer`, après `cadrer`) : `face` (devant,
  regarde en arrière : un tour), `cote` (travelling au-dessus de l'eau, au bord), `haut` (plongée : une fourche), `fixe` (posée au bord après le
  moment : le pied d'une chute, Ronflex debout sur sa rive, visé à mi-chemin), `jeu` (la caméra normale : un tunnel) ; deux plans de suite jamais
  pareils ; dans un tunnel, pas de plongée ni de hauteur de colline. Ralenti ×0,35 au sommet d'un saut (les animations aussi). Noir entre deux
  plans, bandes de cinéma, titre du moment, puis 4 s : « TA SÉANCE », temps, mètres, tours. À la fin, tout est remis comme avant (position, voies,
  Ronflex, fourches, monture, caméra) : « Reprendre » marche, et « 🎬 Revoir le film » dans les deux résumés (la saisie déjà tapée est gardée).
  Fantôme et adversaires cachés pendant le film. Rien n'est enregistré ni envoyé ; une séance récupérée n'a pas de film ; pas de film sous 10 s
  de trajet, ni avec `?fige=1` ou au banc. **Corrigé au passage** : Ronflex se réveillait avec l'heure de la demande d'effort (5 s plus tôt au
  moins), donc il sautait toute son animation et apparaissait directement sur la rive (`reveiller(r, T)` dans rencontres.js). Essayé dans le
  navigateur (boucle du jeu avancée à la main : le panneau était caché) : Huit (saut de la cascade, tunnel, Ronflex), « L'île aux rapides »
  (fourche vue d'en haut sur les rapides), `terre-huit` à vélo ; Passer, Revoir, Reprendre ; 176 tests verts. **Pas encore vu** : la fluidité
  réelle (le panneau de Claude ne l'a pas montrée), la tablette, une vraie séance. Pas de ligne dans 🧪 (c'est dans La Rivière).
  **Envoyé sur GitHub le 15/11** (commit `0ed36ff`, avec l'étape 7 et la correction de `code_a_jour`) : tests verts.
- **Étape 9 — Forêts, vent, ombres, eau qui coule (15/11/2026, Fable ; plan court accepté, les 4 lots faits d'affilée à la demande de Kiki).**
  Quatre effets du rendu, **chacun une option** (`EFFETS` dans `moteur/depart.js`) : allumés partout, sauf sur `kanto-1km` (`"effets": false`),
  au menu (Réglages → Ambiance → « Les effets » : Avec / Sans, gardé sur l'appareil) et dans l'adresse (`?effets=0`, `1`, `eau,vent,foret,ombres`).
  **L'eau qui coule** : chaque mètre connaît son courant (`courantEau` : ~0,6 m/s dans le sens de la course, plus vite où la rivière se resserre et
  dans les pentes de plus de 2 %, vers soi autour d'une remontée, nul sur un lac ou la mer) ; les reflets dérivent avec lui, des filets clairs là où
  ça file, des flocons d'écume en aval d'une chute. **Le vent** : `F.vent(force, y0, y1)` dans les recettes (arbre, arbre lointain, buisson, roseaux,
  palmier, forêt en masse) ; rafales qui traversent le monde, force selon le temps qu'il fait, par crans de 1/10 s. **Les forêts en masse** :
  `"forets"` dans les deux régions ; au-delà des arbres posés un à un, une trame d'arbres réduits à leur silhouette jusqu'à 165 m du bord (forêt
  profonde, bois par taches derrière les prés et les villages, plateau des falaises, fond du ravin) : 800 à 3 200 arbres, 15 000 à 48 000 triangles
  de plus, 0,03 à 0,2 s de construction ; le décor posé un à un ne bouge pas d'un objet. **Les ombres portées** : une carte de profondeur du soleil
  (2 048 points, 160 m autour de la caméra), deux tons, bord net, jusqu'à ~70 m ; elles suivent l'heure, s'effacent la nuit, par temps couvert, sous
  la pluie ; terrain, rives, décor, forêt et ponts en portent, tout le monde solide, l'eau et les routes en reçoivent, **jamais l'intérieur des
  grottes** ; la carte n'est refaite que 10 fois par seconde au plus. Si la machine peine : les ombres puis la forêt partent en premier (`regler`).
  **Le filet** : sans effets, les 7 circuits sont ceux d'avant au bit près (piste, sol, tous les maillages du décor, comparés au commit `0ad90d7`) ;
  `kanto-1km` : 10 captures sur 10 identiques aux références ; nouveau test `test_effets` (177 tests en tout, tous verts sur ce PC) ; budgets tenus (172 000
  triangles de décor au plus, pour 220 000). Coût à l'affichage sur ce PC (vitrine, 1 024 × 768) : ~6 ms par image sans, ~7,5 ms avec (mesures
  bruitées dans le panneau de Claude ; une carte d'ombres : ~3,6 ms, une image sur six). Captures de référence des six autres circuits refaites
  (leur image a changé). **Au passage** : l'outil de captures choisit un port libre (le 8791, fixe, était pris par un autre programme : l'outil
  attendait pour rien). Pas de ligne dans 🧪 (c'est dans La Rivière). **Limites connues** : les Pokémon et les habitants (des sprites) ne prennent
  pas l'ombre ; ta monture garde son ombre dessinée ; changer le réglage « Les effets » refait le monde (rechargement) ; l'eau d'un lac garde ses
  reflets d'avant ; le sens du courant est un choix de mise en scène (une boucle ne peut pas couler partout dans le même sens).
  **Pas encore vu** : la fluidité réelle et le vent en mouvement (le panneau de Claude ne les montre pas), la tablette, une vraie séance.
  **À essayer par Kiki** : la vitrine sur la tablette, une minute avec les effets puis sans ; dire, effet par effet, si c'est mieux ou « amateur »
  (chacun se retire seul : `"effets": {"ombres": false}` dans la région) ; le banc (`&banc=1`) avec et sans, et donner les deux chiffres.
- **Étape 8 — Route GPS et home trainer, lots 1 et 2 (16/11/2026, Opus ; plan court accepté tel quel).** **Lot 1, une vraie route** : `outils/gpx.py` change un
  GPX en niveau normal de la terre, à l'échelle 1:1 (forme seulement, aucune coordonnée, GPX hors du dépôt), 5 km au plus, les plus durs par défaut ;
  virages trop serrés élargis (9 m), tracé et altitude lissés, rives par le relief réel en option (`--relief`, opentopodata), bornes kilométriques de col,
  arche « SOMMET », kilomètre le plus dur en segment, `allurePente: false` (5 000 m de route = 5 000 vrais mètres). Circuit : « Le Ventoux, la forêt »
  (`col-ventoux`, les 5 km les plus durs depuis Bédoin, +488 m, 9,8 %, tracé OpenStreetMap par brouter.de). **Au passage, dans le cœur** (petit, nécessaire) :
  le sol n'est plus calculé ni dessiné à plus de 440 m de la piste (`VU_LOIN`, il ne se voit jamais : sur une route de 5 km le rectangle autour fait
  2,4 × 4,2 km) ; mailles lointaines plus grandes au-delà de 3 km de piste ; le contrôle du sol ne regardait que des hauteurs sous 200 m et tout le
  rectangle (535 000 « hauteurs absurdes », 610 « marches » à 1,6 km de la route) : il ne regarde plus que ce qui se voit. Résultat : 0 marche, 0 hauteur
  absurde. **Lot 2, le home trainer sans appareil** : branchement commun vrai / faux, rebranchement automatique, commandes en file, pente lissée sur 8 m
  par crans de 0,1 % une fois par seconde au plus, descentes à moitié, réglage « Dureté des pentes » au menu du vélo, **faux home trainer** (menu ou
  `?faux_trainer=220`), qui ne compte jamais. **Le filet** : 178 tests verts (1 de plus : `VraieRoute`) ; `kanto-1km` : 10 captures sur 10 identiques ;
  la vitrine et `terre-volcan` diffèrent des références, mais autant avec l'ancien `terrain.js` : ces écarts existaient déjà dans la copie de travail (étape 9),
  pas de ce lot. Essayé dans Chrome sans fenêtre : la route, les bornes, l'arche, le faux home trainer de bout en bout. **Limites** : 1,25 million de triangles
  et ~13 s de construction sans carte graphique (à mesurer sur la tablette ; le téléphone risque de peiner : c'est le lot 3) ; le décor des rives ne suit pas
  la vraie route (lot 4 : OpenStreetMap) ; la note d'un circuit ne convient pas à une vraie route (21/100) ; l'arrivée repart du début. **Pas encore
  essayé** : la tablette, un vrai home trainer, la page dans l'appli. Pas de ligne dans 🧪 (c'est dans La Rivière).
- **Hors plan — la diversité du décor (17/11/2026, Opus ; carte blanche de Kiki, sans plan court).** Bordures rouges et blanches seulement sur une boucle tout en
  goudron ; embranchements route → chemin (la route continue) ; la ville (rues, carrefours, rond-points, boutiques, voitures, feux, maisons toutes
  différentes) ; essences d'arbres par bosquets ; ports tirés au hasard ; échangeur qui repasse au-dessus de sa route ; raretés du ciel (avion, montgolfière,
  Roucool, oiseau légendaire, étoiles filantes). Mode d'emploi : `MOTEUR.md`, « La ville, les embranchements, la variété, les raretés ». Le cœur touché à
  deux endroits (`EMPRISE`/`JONCTIONS` de decor.js, `BORDURES` de surfaces.js). kanto-1km identique (captures). Le tour du volcan : ses deux chemins de terre
  partent maintenant en tournant (tracé un peu changé, records de ce circuit à zéro). Plafond de poids de la page passé de 1 900 à 1 980 Ko.
  **À essayer par Kiki** : « Céladopole, la ville et les bois » au vélo ; `?rare=avion` ; le circuit du jour sur la terre (rond-point et échangeur au tirage).
  **Pas encore** : un vrai grand huit (plusieurs étages qui s'entrecroisent : possible à la main, pas au générateur), les lieux de Kanto, la vitrine (port fait main).
- **Étape 8 — lot 3, le monde par tronçons (16/11/2026, Fable ; plan court accepté, lot 4 confié par Kiki à une autre conversation Opus).**
  **Ce que Kiki verra** : « Le Ventoux en entier » (`ventoux`, depuis Bédoin : 21,6 km, +1 595 m, 7,4 %), au menu du vélo et du skieur de fond ; le jeu
  s'ouvre en ~1 s, le monde se construit autour de soi et s'efface derrière. « Le Ventoux, la forêt » (5 km) reste tel quel, d'un bloc.
  **Comment** : `moteur/troncons.js` (carrés de sol de 60 m, tronçons de 48 m pour les rives, la route et le décor ; voulus à moins de 470 m de la caméra,
  effacés au-delà de 560 m ; constructions qui rendent la main toutes les 1 à 2 ms, un cinquième du temps de l'image ; ce qui manque à moins de 150 m est fait
  d'un coup). Seulement pour un parcours ouvert sans fourche de plus de 6 km (`TRONCONS`, `"troncons"` dans le niveau, `?troncons=1|0`). Décor toujours le même
  quel que soit l'ordre (hasard par tronçon ; les impairs attendent leurs voisins pairs). L'outil GPX accepte 60 km (`--km`, 5 par défaut).
  **Dans le cœur, pour partager le code sans rien changer aux circuits existants** : `poserDecor` passe par `poserDecorPas(Z)` (une function* : sans Z, tout le
  circuit, comme avant) ; `construireRives`, `construirePiste`, `construireTerrain` passent par `fabriqueRives`, `fabriquePiste`, `celluleSol` / `sommetSol` ;
  `construireDecor` par `mailleEtiquette` / `mailleAnimee` ; `construireSprites` par `ajouterPublic`. **Au passage** : le contrôle des croisements (`verifier`)
  ne compare plus un bout de piste qu'à ses voisins (55 millions de comparaisons pour 21 km, sinon) : même résultat, même ordre. (L'autre calcul en N² de l'audit,
  les ponts qui enjambent, ne coûte rien sans pont : laissé tel quel.)
  **Le filet** : signature de la piste, du sol et du décor **identique sur les 8 circuits existants** (avant / après, sans navigateur) ; `kanto-1km` : 10 captures
  sur 10 identiques aux références (0,01 à 0,4 %) ; les 8 circuits comparés image par image avant / après : seulement du bruit (Pokémon animés, pixels isolés) ;
  182 tests verts (4 de plus : `Troncons` × 3, `VraieRoute.test_longueur`) ; un niveau n'est plus construit qu'une fois pour tous les tests (`BILANS`).
  **Mesuré** (Chrome sans carte graphique, ce PC) : le Ventoux entier prêt en ~1 s (2 s avec `?s=`, tout le disque d'un coup) ; le col de 5 km : 0,7 s par
  tronçons contre 10,8 s d'un bloc ; en route à 43 et 61 km/h : rien en attente, jamais besoin de forcer, 4 à 7 ms au pire par image pour construire (à budget
  de 3 ms), ~230 000 à 290 000 triangles et ~350 maillages en mémoire, mémoire stable (65 à 80 Mo). Essayés : l'arrivée au sommet et le retour au départ, le
  film de fin (ses plans sautent ailleurs sur la route), `__aller`. **Limites** : pas de Ronflex sur une route par tronçons ; `?vue=haut` ne montre que les
  alentours de sa caméra ; le décor d'une route par tronçons n'est pas, arbre pour arbre, celui de la même route d'un bloc (mêmes règles, autres tirages) ; le
  sommet du Ventoux est boisé comme le bas (c'est le lot 4) ; la note d'un circuit ne dit rien d'une vraie route (8/100).
  **Pas encore essayé** : la tablette, le téléphone, la fluidité réelle à 60 images/s (le Chrome sans fenêtre tourne à 6 images/s), un vrai home trainer.
  **À réunir avec le lot 4** : il a travaillé sur `col-ventoux` ; `outils/gpx.py` a changé des deux côtés (ici : seulement la limite de longueur) ; une fois réuni,
  rejouer l'outil sur le Ventoux entier (`--km 60 --id ventoux --nom "Le Ventoux en entier"`). Pas de ligne dans 🧪 (c'est dans La Rivière).
- **Étape 8 — lot 4, le décor d'après OpenStreetMap (17/11/2026, Opus ; plan court accepté ; l'autre conversation à qui Kiki l'avait confié le 16/11
  n'a rien laissé dans le dépôt : refait ici).** **Ce que Kiki verra** : « Le Ventoux en entier » (`ventoux`, toujours caché du menu : `&riviere=ventoux&force=1`)
  habillé d'après la vraie carte : Bédoin au départ (266 maisons à leur place, leur taille et leur angle, l'église, les piscines), les vignes et les vergers,
  la forêt jusqu'au Chalet Reynard, le pierrier blanc du sommet, l'émetteur et la chapelle Sainte-Croix en haut ; au menu, « Tracé et décor d'après
  OpenStreetMap · © les contributeurs d'OpenStreetMap ». **Comment** : `outils/osm.py`, branché sur `gpx.py --osm carte.json` (la carte demandée une fois
  à overpass-api.de puis gardée dans ce fichier, HORS du dépôt) ; chaque chose repérée par rapport à la route (mètre, côté, écart, angle), donc jamais une
  coordonnée ; région `contenu/biomes/kanto-reel.json` (hérite de kanto-routes : bords village, vignes, verger, pré, garrigue, pierrier, et leurs doubles
  « _bois » quand la carte voit la forêt au loin) ; recettes `contenu/objets/kanto-reel.js` (chapelle, piscine, tour-relais et antenne, rangs de vigne).
  Mode d'emploi : `MOTEUR.md`, « Le décor d'après la carte ». **Le cœur n'est pas touché** (rien dans `moteur/`). **Le filet** : 185 tests verts (1 de plus :
  `VraieRoute.test_osm`, côté, écart, angle, forêt, aucune coordonnée) ; `kanto-1km` : 10 captures sur 10 identiques ; le tracé du Ventoux identique au
  mètre près (609 pièces, même GPX qu'au lot 3 : record et fantôme gardés) ; triangles d'un kilomètre sous le budget. Plafond de poids de la page passé de
  2 010 à 2 050 Ko (+47 Ko : 480 objets réels et la région). **Limites** : la carte a des trous (km 3 à 5 et 12 à 16 du Ventoux : on garde ce qu'on
  voyait avant, sur 3 km au plus) ; les maisons collées d'un vieux centre sont éclaircies (jamais deux objets l'un dans l'autre) ; pas de rues qui partent
  (les routes de la carte ne sont pas encore lues) ; le décor au loin est choisi par blocs de 150 m, pas arbre par arbre. Les références de captures de
  `col-ventoux` (comme essai, terre-huit, terre-volcan, vitrine) datent d'avant les bordures du 17/11 : à refaire (`captures.py ref`).
  **Pas encore essayé** : la tablette (fluidité dans Bédoin), une vraie séance. **À essayer par Kiki** : grimper le Ventoux entier au vélo, dire s'il reconnaît
  la montée (village, vignes, forêt, sommet pelé) ; et s'il le veut au menu (aujourd'hui caché).
  **Retours de Kiki (18/11, « clairement vers ça qu'on doit arriver »), faits** : la maison sur la route au premier virage (35 maisons de Bédoin,
  derrière la ligne de départ, s'entassaient au mètre 0 : `au_bout`) et aucun bâtiment sur la route (ses quatre coins, toit compris, à 1 m du bord, même
  tourné : `dehors`, sinon écarté) ; plus d'herbe kaki d'un seul côté (la garrigue garde l'herbe de Kanto) ; plus de boîtes aux lettres au hasard : une
  seulement devant une vraie maison proche ; les pommes qui flottaient à côté du feuillage rentrées dedans (`pommier`) ; les bornes kilométriques tournées
  vers qui arrive (`"face": "arrivant"`), plus grandes, texte net (`K.etiquette(…, res)`, 80 pixels par mètre ; le reste inchangé à 28) ; le cycliste assis
  SUR la selle (vélo en pixels : selle plus basse et plus courte, `atelier_velo.py` ; vélo 3D : le dresseur en pixels devant la selle, `devant: .5`,
  et un peu plus haut) ; assis dans les côtes, en danseuse seulement dès 10 % (jusqu'à 8,5 %), dans les trois modes.
  **Puis (18/11)** : les traits noirs sur l'herbe au loin (dans tous les circuits) : c'était le contour, déclenché par la petite marche entre le ruban des
  rives et la grille du sol ; un saut de profondeur ne fait plus un contour que s'il est franc par rapport à la pente de la surface elle-même (`POST` de
  rendu.js) ; les contours des arbres et des maisons restent ; kanto-1km : jusqu'à 4 % de pixels changés (des contours au pied du feuillage), identique à l'œil.
  Les vignes refaites (`vignes` de kanto-reel.js) : terre ocre entre les rangs, ceps sur leur pied, touffes rondes, fil de fer, piquets.
- **Hors étapes — trotteurs et vélo en sprite (16-17/11/2026, Fable).** Demande de Kiki, en deux lots. **Lot 1 fait** : rollers retirés ; au skieur de fond,
  ton Pokémon trottine de dos à sa vraie taille (`contenu/trotteurs.json`, `contenu/montures/trotteur.js` : une monture du contenu, trois lignes d'accroche dans le
  cœur), décor à 6,5 km/h, trot calé sur les tours de jambes, un record par discipline. Liste provisoire (Pikachu, Caninos, Ponyta) : Kiki choisit ses trois sur la
  planche claude.ai/artifact/D6K5xVakUEcE9hDZkRRU9H. **Lot 2 : la planche seulement** (claude.ai/artifact/Va67c6gZi7qyUhDToja6VT, atelier dans
  `outils/planches/atelier/`, hors dépôt) : **rien à brancher avant l'accord de Kiki**. Contrôles : 183 tests ; kanto-1km, bourg-palette, fourche et les deux
  Ventoux identiques aux références ; essai et terre-huit comparés au code d'avant : moins de 0,4 % d'écart (les Pokémon qui bougent). **À refaire** : les
  références de `captures.py` pour essai, terre-huit, terre-volcan et vitrine (elles datent d'avant le 16/11). **Pas encore essayé** : la tablette, une vraie
  séance au skieur de fond (le calage du trot sur les tours de la montre), la fluidité (le panneau de Claude tourne à 1 image/s).
- **Hors étapes — le vélo en sprite et les sprites qui suivent la caméra (17/11/2026, Opus).** Planche du cycliste validée par Kiki après retouches (pas de vue
  de profil en jeu : le vélo penche dans les virages ; hanches ; plus de bande blanche), puis 7 angles pour le film de fin (`outils/atelier_velo.py`, dans le dépôt),
  branchée par défaut à vélo (`contenu/montures/cycliste_sprite.js`, le 3D au menu « Ton cycliste »). Tous les sprites (nageurs, trotteurs, fantômes) prennent
  l'image vue de la caméra quand elle n'est plus derrière (`contenu/montures/directions.js`). **Pas encore essayé** : la tablette, une vraie séance à vélo.
- **Hors étapes — retours de Kiki du 17/11 (Opus).** Circuit du jour du 16/11 bugué (une descente posée en biais sur la montée, 1 à 2 m plus haut) :
  `verifier()` refuse les passages qui se recouvrent sans carrefour franc et à plat ni pont ; 8 jours refabriqués, tous valables. Barrières et glissières qui
  suivent la pente ; ombre du vélo simple ; roues du sprite sur le sol ; 3e choix « Vélo 3D, dresseur en pixels » (`atelier_velo.py --seul`). Pas de fichier du
  17/11 dans le dépôt privé (la tâche de la nuit n'a pas tourné).
- **Étape 13 — La ville libre, lot 1 (24/11/2026, Opus ; plan en 3 lots accepté, lot 1 d'abord, arrêt pour l'avis de Kiki).** **Ce que Kiki verra** : au menu du marcheur
  elliptique, « Le quartier des Hauts » (`ville-hauts`, 669 m de décor, ~9 min le tour, +12 m) : une rue commerçante courbe, une rue qui serpente en montant, une longue courbe en
  haut, une avenue en diagonale qui redescend, une placette pavée qu'on traverse ; maisons à soubassement et marches ; rien de vide pendant plus de 31 m. **Comment** : `MOTEUR.md`,
  « Une ville libre ». Deux choix en plus du plan : la caméra ne suit la pente qu'à 40 % dans une zone (sinon la pente ne se voyait pas), et une sous-couche grise sous le sol.
  **Le filet** : empreinte chiffrée (piste, sol, décor) des 11 circuits existants identique avant / après ; `ville-place` identique à l'image (au bruit près) ; 197 tests verts (5 de
  plus : `VilleLibre`) ; chaque arête du sol contrôlée (58 points posés en plein milieu d'une arête droite au bord de la placette, d'où la sous-couche ; aucune fente). Poids de la
  page : 2 412 Ko, plafond passé de 2 360 à 2 460. Temps de construction : 2,2 s (2,3 s pour `ville-place`), jamais plus de 0,14 s d'un coup. Inspecté tous les 10 m, de nuit, essayé
  dans le navigateur. **Pas encore** : la tablette (fluidité), une vraie séance. **À essayer par Kiki** : un tour ; dire si les courbes, les coins, les pentes et la caméra dans les
  pentes vont, et si c'est fluide. Son ⚑ du matin n'est jamais arrivé : le trajet marche hors ligne, l'envoi ne se fait qu'à l'ouverture suivante du jeu **dans l'appli** (à
  vérifier avec lui). Pas de ligne dans 🧪 (c'est dans La Rivière). Au passage, dans la même copie : la correction de l'ombre des arbres (`Forme.ombre`) et les notes du matin. **Envoyé sur GitHub le 24/11** (`25f0527`), tests verts.
  **Avis de Kiki sur la tablette (24/11) : « globalement très bien, des pentes très réalistes, de vrais carrefours, de vrais changements de direction, tout le reste est très très bien ».**
  Ses trois points, corrigés le jour même : le raccord du quadrillage dans les virages et avec les allées des maisons (trottoir uni, sans dalles, la même matière pour les allées) ; un
  gros arbre qui semblait flotter (pommiers dont le feuillage descend au sol, tronc caché par une haie, silhouettes de forêt sans tronc plantées trop près : `arbre_rue`, silhouettes à plus
  de 40 m). Au passage : un ⚑ part tout de suite (avant : à l'ouverture suivante du jeu), essayé dans un vrai Streamlit (0,5 s, partie pas rechargée). Les 11 autres circuits identiques
  (empreintes ; le shader et le sol de `ville-place` aussi). **Le lot 1 est donc validé ; suite : le lot 3 (le lot 2 est sauté, Kiki).** Outils gardés dans le dépôt : `empreintes.py`, `fentes.py`.
- **Étape 13 — La ville libre, lot 3, le générateur (24/11/2026, Opus ; plan accepté).** **Ce que Kiki verra** : Marcheur elliptique → Créer un circuit → Générer → « À pied, en ville » : longueur,
  relief, genre de ville ; une ville différente à chaque fois, avec sa placette, son jardin, ses ruelles, un escalier et un belvédère quand ça monte. **Comment** : `MOTEUR.md`, « Les villes tirées au
  sort ». Le vieux tirage à angles droits est retiré (`ville-place` est un fichier, inchangé). **Le filet** : 24 villes (0,7 à 2,2 km, plates et pentues) contrôlées en entier, aucun défaut, et
  36 autres tirées sans un échec (contrôle du tirage seul) ; trois regardées tous les 10 m (immeubles 1,6 km pentu, bourg plat 1,2 km, pavillons 0,7 km) et une quatrième (coteau) tous les 15 m ;
  empreintes des 12 circuits identiques ; page 2 471 Ko (plafond 2 500), 201 tests verts. Au passage : au menu du marcheur elliptique, la longueur d'un tour et sa durée sont celles de tes jambes (avant : celles du décor,
  40 % de trop). **Corrigé en regardant** : murs arrière aveugles, ruelles trop droites, herbe qui dépassait des marches, lierre trop gros, départ dans une ruelle. **Pas essayé** : la tablette, une
  vraie séance. **À essayer par Kiki** : deux ou trois villes, en courir une ; dire si ça fait vrai, si c'est varié, s'il garde la règle de 45 m et les reliefs. **Reste possible** : « ça grimpe » ne
  dépasse guère 10 à 12 m sur 0,5 km (borné par la pente des rues) ; changer de trottoir en cours de route ; des voitures qui roulent.
  **Avis de Kiki (24/11, essai rapide) : « beaucoup mieux, les villes sont très agréables », les presque-lignes-droites passent bien grâce aux légers virages et à l'habillage varié.** Il a compris
  « 7 ou 8 villes, et plusieurs parcours dans chacune » et trouve ça bien (cohérence du décor) : ce n'est pas le cas (chaque tirage = une ville neuve) ;
  **l'idée de villes fixes à plusieurs parcours est abandonnée (Kiki, 24/11).** Ses deux ⚑ de 11 h 57 et 11 h 58 (Les Hauts, mètres 193 et 315) : le quadrillage, déjà corrigé.
- **Étape 14 — Ville et nature, lot 1 (24/11/2026, Opus ; plan en 2 lots accepté, lot 1 d'abord, arrêt pour l'avis de Kiki).** **Ce que Kiki verra** : au menu du marcheur elliptique, « La ville et le
  bois » (`ville-bois`, 1 102 m de décor, 740 m de jambes, ~10 min le tour, +16 m) : rue commerçante et place de la Fontaine, rue de l'École dont les maisons s'arrêtent (verger à gauche, jardins ouvriers à
  droite), la rue finit, entrée du chemin ; prés, bois (300 m, clairière, mare, croisements de sentiers), vue sur la ville, retour entre deux haies. **Comment** : `MOTEUR.md`, « La nature autour d'une ville ».
  **Choix** : un chemin est une voie de la zone (aucun raccord avec les anciennes rives). **Contrôles** : aucun défaut, jamais plus de 38 m sans événement, pente 7 % au plus ; regardé tous les 10 à 20 m, de
  côté et de nuit ; essai joué dans Chrome sur ce PC : 60 images/s partout, 230 000 triangles au pire (en ville ; 160 000 dans le bois), prêt en 4 s ; page 2 209 Ko ; 199 tests verts. **Fait avec** : les
  anciens circuits supprimés (Kiki), le vélo n'a donc plus de circuit (le menu propose d'en créer un). **Pas essayé** : la tablette, une vraie séance. **À essayer par Kiki** : un tour ; dire si la sortie de
  ville fait vraie, si la forêt est belle de près, si c'est fluide.
  **Avis de Kiki sur la tablette (24/11) : « globalement très très bien ».** La place qu'on coupe au lieu de suivre le trottoir : « une très très bonne idée, réaliste, ça varie » (à garder dans le générateur) ; le
  tas de bois aussi. Ses trois ⚑, corrigés le jour même : les bandes d'un passage piéton de biais débordaient sur le trottoir (chaque bande est parallèle à sa rue et s'arrête avant la bordure ; toutes les villes) ;
  une clôture finit toujours par un poteau (`fin`) ; on voyait à travers le tas de bois (un cœur sombre). Au passage : plus de Pokémon planté dans une clôture. **Le lot 1 est validé ; suite : le lot 2.**
- **Étape 14 — Ville et nature, lot 2, le générateur (24/11/2026, Opus).** **Ce que Kiki verra** : Marcheur elliptique → Créer un circuit → Générer → « À pied », réglage **Le décor** : Tout en ville, Moitié-moitié
  (choisi d'office), Surtout la nature. **Comment** : `jeu/nature.js`, `MOTEUR.md`, « Les villes tirées au sort, avec leur nature ». **Contrôles** : une cinquantaine de tirages, 0,75 à 2,25 km de décor, plats et
  pentus, les quatre genres : tout ce qui est rendu est sans défaut (contrôle entier), en 2 à 17 s ; les petites boucles (0,5 km de jambes) échouent une fois sur dix environ, l'éditeur essaie alors tout seul une autre graine ;
  quatre regardés tous les 18 à 20 m (bourg plat, bourg pentu, immeubles, coteau au plan) ; 294 000 triangles au pire (2,25 km d'immeubles), prêt en 7 à 8 s pour le plus long (2 à 5 s en général) ; essayé dans l'éditeur du
  jeu (générer, essayer) ; 200 tests verts ; page 2 232 Ko. **Pas essayé** : la tablette. **À essayer par Kiki** : deux ou trois « Moitié-moitié », une « Surtout la nature ». La placette coupée en diagonale
  n'est pas dans toutes les villes (un tirage sur trois environ).
  **Retour de Kiki (24/11, à vélo, « Surtout la nature », « Ça grimpe ») : long à générer, et « une boucle dans les bois assez monotone ».** À vélo, « 1 km » = 3,5 km de décor (je n'avais essayé que 2,25). **Refait le soir
  même** : le chemin n'est plus un cercle (grandes boucles, bouts calmes) ; un ou deux **hameaux** au-delà de 640 m de chemin (on arrive d'équerre face à une chapelle, on repart par le bout de la rue) ; un paysage nouveau
  tous les 70 à 130 m (bois par essences, clairière, rond de pierres, blé, tournesols, lavande, vignes, lande, étang, verger, prés) et des repères (chapelle, ferme, éolienne, vieux chêne, rochers, ruches) ; la placette
  est désormais dans la plupart des villes. **Vitesse** : 4 à 7 s pour son cas, dans le navigateur (contrôle par étapes, croisements et aires rangés par cases) ; le plus long met ~9 s à se construire ; à vélo, 1 km au plus (3,7 km de décor).
  **Un vrai bug trouvé** : un angle presque nul ne tournait pas, le cap dérivait et le parcours finissait à côté de son trottoir (villes jetées pour rien) : corrigé dans `piecesDuChemin`. Le plan de l'éditeur est une carte
  (bois, champs, rues, parcours en orange, noms qui ne se recouvrent plus). 31 tirages de suite sans échec, 200 tests verts, 60 images/s sur ce PC. **Publié le 24/11.**
  **Avis de Kiki (24/11, premier test rapide) : « ça avait l'air très bien, chemins bien, assez varié, rapide à générer, fluide, 60 images/s ». Étape 14 terminée ; suite proposée : étape 15, lot 1 (le vélo sur la chaussée).**
- **Étape 15 — Le vélo, lot 1a, le circuit d'essai (24/11/2026, Opus ; plan accepté : 1a d'abord, 1b = le générateur après l'avis de Kiki).** **Ce que Kiki verra** : Vélo → « La boucle des Cerisiers »
  (`velo-cerisiers`, 3 049 m, +38 m, ~8 min) : l'avenue des Cerisiers et sa piste cyclable derrière une bande fleurie, la rue du Marché, une rue barrée (Machoc au chantier, 22 m de trottoir), le parc du Lavoir, la
  sortie de Jadielle, la route des Prés (vergers, blé, tournesols, vignes), le chemin des Blés (carrossable, herbe au milieu), le sentier du Grand Bois, la route de la Combe, la rue de la Gare. **Comment** : `MOTEUR.md`,
  « La ville à vélo ». **Contrôles** : aucun défaut, jamais plus de 101 m sans événement, 6,8 % au plus ; regardé tous les 20 m, les virages tous les 3 à 5 m, de nuit aussi ; un tour au banc dans Chrome sur ce PC :
  59,6 images/s, 290 000 triangles au pire, prêt en 7,7 s ; essai « Auto » joué (on reste à droite, aucun à-coup) ; page 2 365 Ko. Deux tests adaptés (largeur d'une piste de zone, budget de triangles à vélo), un ajouté.
  `ville-bois` regardé : inchangé. **Pas essayé** : la tablette, un vrai home trainer, un vrai tour complet à la main. **Pas fait** : le générateur (1b), des voitures qui roulent.
  **À essayer par Kiki** : un tour (« Essayer » → « Auto ») ; dire si la route fait vraie, si les virages sont bons à cette vitesse, si la piste cyclable et le raccourci plaisent, si c'est fluide ; ⚑ pour le reste.
  **Avis de Kiki (24/11, sur la tablette, en 60 images/s avec une petite baisse passagère, beaucoup d'onglets ouverts : à surveiller) : « globalement très bien », « une très belle diversité de décors, d'ambiances, de routes, de
  pistes cyclables, de chemins, de parcs, de prairies », virages et vitesse « impeccables », la rue barrée « très sympa ».** Corrigés le jour même : la pancarte au vélo devant la rue barrée est retirée (**elle gâchait la
  surprise : on ne dit pas où aller, on le découvre**) ; un logo de vélo peint débordait sur la route (son ⚑ du mètre 19) : il tient en entier sur la piste ou il est décalé ; un passant ne se tient plus sur la bordure.
  **Lot 1a validé ; suite : 1b, le générateur.**
  **À garder en tête (Kiki, 24/11 ; rien à faire maintenant, ne rien casser de ce qui marche) : pouvoir rouler à DEUX LIGNES à vélo.** Se faire doubler de temps en temps (pour donner envie d'accélérer et de suivre celui qui
  double), puis, avec un mode réseau, rouler côte à côte avec un pote. Place mesurée sur ce circuit : voie de droite 3,1 à 3,5 m, piste cyclable 2,4 m, allée du parc 3,2 m, chemin carrossable 3,6 m (une trace chacun), route de
  campagne 4,6 m (celui qui double passe sur l'autre moitié), trottoir de la rue barrée 3 m : deux cyclistes (90 cm d'écart) y tiennent ; le sentier du bois (1,5 m), non : à la file. Pour 1b : le générateur garde la largeur libre
  de chaque bout (`rouler à deux : oui / non`) et ne pose rien de dur à moins de 1,4 m du parcours là où c'est oui. Le moteur sait déjà décaler un cycliste (`pose(s, d)`, les adversaires de `jeu/rivaux.js`).
- **Étape 15 — Le vélo, lot 1b, le générateur (24/11/2026, Opus ; plan accepté par Kiki : « Oui, vas-y »).** **Ce que Kiki verra** : Vélo → Créer un circuit → Générer → « Ville et campagne » (choisi d'office ; « Sur la route » = l'ancien
  générateur) : longueur 1,5 à 4 km, décor (surtout la ville, moitié-moitié, surtout la campagne), relief, « Ça tourne » (tranquille, sinueux), genre de ville. Voie de droite, piste cyclable d'avenue (deux circuits sur trois), parc, placette,
  commerces ; rue barrée un circuit sur trois, jamais annoncée ; petites routes, chemins carrossables, sentiers, hameaux. **Comment** : `jeu/velo_villes.js`, `MOTEUR.md`, « Les circuits à vélo tirés au sort ». **Contrôles** : 108 circuits
  de suite (toutes les longueurs, décors, reliefs, genres), tous sans défaut au contrôle entier, aucun échec, 2 s en général, 14 s au pire ; rien ne se passe pendant 86 m au plus, pente 10 % au plus, jusqu'à 40 m de dénivelé ; cinq regardés
  tous les 25 à 30 m et leurs raccords de près ; joué dans Chrome sur ce PC (générer, Essayer, Auto) ; les villes du marcheur elliptique sont les mêmes au caractère près. **Fluidité** (banc, ce PC) : 58,8 images/s sur 3 km
  moitié-moitié, 59,9 sur 1,5 km de campagne, 57,7 au pire (4 km d'immeubles) ; « La boucle des Cerisiers », même jour : 59 ; prêt en 4 à 12 s ; page 2 412 Ko. **Corrigé en regardant** : le goudron qui finissait en rond sur un chemin (coupe
  nette), étangs cachés par les bosses, champs mal alignés dans les virages, bois absents des sentiers très tordus, panneau devant l'entrée d'un sentier, rues trop pareilles. **Limites** : moins de 1,4 m de place à deux au chantier,
  aux portails des parcs et à l'entrée d'un sentier (à la file) ; un circuit ne se retouche pas pièce par pièce ; pas de voitures qui roulent. **Pas essayé** : la tablette, un vrai home trainer. **À essayer par Kiki** : deux ou
  trois « Moitié-moitié » et une « Surtout la campagne » qui grimpe ; dire si c'est varié, si ça fait vrai, si c'est fluide ; ⚑ pour le reste.
  **Avis de Kiki (25/11, sur la tablette) : « les zones sont diversifiées », « dans l'ensemble c'est très très bien », « le reste est vraiment excellent ».** Un seul ⚑ (velo-337009, mètre 1 412, la sortie d'un hameau) : la route qui se
  rétrécit faisait bizarre (la chaussée gonflait, puis se pinçait, le trottoir s'enroulait autour). Corrigé dans le moteur le jour même, pour tous les raccords bout à bout, donc aussi « La boucle des Cerisiers » et les circuits déjà gardés.
- **Étape 15 — L'eau dans une ville, lot 2a, le circuit d'essai (25/11/2026, Opus ; plan accepté par Kiki : « Oui, vas-y » ; 2a d'abord, 2b = le générateur après son avis).** **Ce que Kiki verra** : Vélo → « La boucle des Quais »
  (`velo-quais`, 2 566 m, +15 m, ~6 min) : le quai des Lilas (muret, péniches, l'autre rive et ses platanes), le Pont-Vieux, la vieille rue et la place du Lavoir, la rue du Port qui retombe sur l'eau, la piste cyclable des quais sous les
  platanes, le pied du Pont-Neuf, le chemin de halage au ras de l'eau (joncs, saules, ponton, maison de l'éclusier), le pont du Moulin, une petite route (blé, tournesols, vignes, chapelle), le bois de la Garenne, la rive nord, l'entrée de Rivebelle.
  **Comment** : `MOTEUR.md`, « L'eau dans une ville ». **Contrôles** : aucun défaut, jamais plus de 51 m sans événement, 8 % au plus ; regardé tous les 18 m (72 vues), les raccords et les ponts de près, de l'eau, d'en haut, sous les arches et
  de nuit ; un tour au banc dans Chrome sur ce PC : 60 images/s, aucune en retard, 273 000 triangles au plus ; prêt en 11 s (Cerisiers : 7) ; « Auto » essayé au départ ; page 2 486 Ko (plafond 2 500). 204 tests verts (un ajouté).
  **Corrigé en regardant** : passants plantés sur un parapet, Pokémon les pieds dans l'eau, bout du mur de quai déchiqueté, remblai du pont de campagne (des quarts de cône de pierre), coutures blanches des parapets, plateau en escalier sur la
  traversée, une tache grise dans un talus raide, la construction (24 s au premier jet : l'eau est désormais rangée par carrés de 4 m). **Laissé de côté** : passer à vélo sous un pont. **Limites** : le dé du pont du Moulin passe près de la
  caméra dans le virage ; il reste 14 Ko de marge dans la page : **avant 2b, retirer « La boucle des Cerisiers » (que le générateur remplace) ou relever le plafond, à demander à Kiki.** **Pas essayé** : la tablette, un tour entier à la main.
  **À essayer par Kiki** : un tour en « Auto » sur la tablette ; dire si la rivière fait vraie, si les ponts et les quais plaisent, si c'est fluide ; ⚑ pour le reste.
  **Avis de Kiki (25/11, sur la tablette, le soir, rendu réaliste et dresseur en 3D) : « globalement, c'est très bien ».** Trois remarques, « rien d'important », corrigées le jour même : **« ça scintille sous les balcons »** (les fenêtres du
  rez-de-chaussée des immeubles étaient exactement dans leur mur : tous les immeubles, à pied aussi) ; **les saules et leurs « pics qui dépassent »** (inchangés depuis le 17/11 : des cônes dont la base sortait de la couronne ; refaits en
  rideaux de feuilles partout ; et à vélo, un saule ne pousse plus qu'au bord de l'eau : il y en avait le long des champs) ; **la traversée peinte à l'entrée de la piste cyclable** (retirée : une piste qui part d'une rue commence pile au
  trottoir ; seule une piste qui coupe une rue, au Pont-Neuf, garde sa traversée). Contrôle de surfaces confondues passé sur vingt objets. **Lot 2a validé ; suite : 2b, le générateur.**
- **Étape 15 — L'eau dans une ville, lot 2b, le générateur (25/11/2026, Opus ; plan accepté par Kiki : « Oui, vas-y », retrait de « La boucle des Cerisiers » compris).** **Ce que Kiki verra** : Vélo → Créer un circuit → Générer → « Au bord
  de l'eau » (mêmes réglages : longueur 1,5 à 4 km, décor, relief, ça tourne, genre de ville) ; trois façons de longer la rivière (les deux rives, une seule, d'un pont à l'autre), promenades qui changent de visage (platanes, bouquinistes,
  fleurs, terrasses), ponts de pierre, de bois et de fer, piste cyclable ou rue du quai, vieille rue et placette, chemin de halage, puis la campagne. **Comment** : `MOTEUR.md`, « Les circuits au bord de l'eau tirés au sort ».
  **Contrôles** : 72 tirages sur 72 sans défaut (3 s en général, 9,6 s au pire ; les trois façons à parts égales) ; cinq circuits regardés tous les 22 m, ponts vus de l'eau, un de nuit, un au crépuscule ; au banc dans Chrome sur ce PC : 59 à
  60 images/s, 265 000 à 286 000 triangles ; prêt en 8,6 à 11,7 s (objectif 10 s pas tenu sur 3 km ; « La boucle des Quais » : 11 → 10,2 s) ; page 2 452 Ko (plafond 2 500). 205 tests verts (un ajouté). Les Cerisiers sont sortis du
  jeu (dessin gardé dans `tests/circuits/`). **Limites** : certains réglages étroits (1,5 km presque tout en nature) demandent parfois de relancer, l'éditeur le fait seul. **Pas essayé** : la tablette, un tour entier à la main.
  **À essayer par Kiki** : générer deux ou trois circuits, en rouler un ou deux ; dire si c'est varié, réaliste et fluide.
