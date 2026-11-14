# « La Rivière » : audit du moteur (14/11/2026)

Audit de Claude (Opus 5.5) à la demande de Kiki : **le moteur seulement**, pas le contenu des circuits ni les règles de Poké Fit.
But : donner à Claude Fable 5.2 une vision complète (forces, faiblesses, limites, toutes les améliorations possibles) pour qu'il choisisse
et réalise. Rien n'a été modifié dans le code ; ce fichier est le seul ajout.

Fait sur une copie à jour (`git fetch`, `git status -sb` : à jour avec `origin/main`, commit `b6a0ab9`). Lu : `MOTEUR.md`, l'audit du
11/11 (`AUDIT-MOTEUR.md`), `page.py`, tout `moteur/piste.js`, `champ.js`, `rendu.js`, `decor.js`, `jeu/jeu.js`, `allure.js`, et les en-têtes
et parties clés de tous les autres fichiers. Mesuré sur ce PC (Adreno 685, la même machine que la tablette de Kiki) avec le serveur d'essai.

**À lire avant de travailler** : `riviere/MOTEUR.md` (mode d'emploi) et ce rapport. L'audit du 11/11 décrit l'état d'avant la refonte : ses
étapes 0 à 3 sont faites ; ce rapport le remplace pour l'état actuel.

---

# Partie 1 — Pour Kiki : l'essentiel

## Le verdict en une phrase

**Le moteur a de très bonnes fondations et a énormément grandi en 4 jours, mais il a grandi plus vite que ses filets de sécurité :
avant d'ajouter quoi que ce soit, il faut le consolider (contrôles réparés, construction plus rapide, page plus légère, rangement du code).**
Ensuite, il peut devenir un vrai « Zwift Pokémon » multi-machines, et bien plus.

## Les 5 points forts (à ne surtout pas perdre)

1. **Tout se déduit d'une seule ligne, la piste.** On ne dirige pas : le monde entier (sol, rives, décor, caméra, sons) est calculé depuis
   le tracé. C'est le bon choix pour un jeu de machine de sport, et c'est ce qui rend les circuits faciles à écrire.
2. **Un circuit = un petit fichier, une région = un fichier, un objet = une petite recette.** Le contenu est séparé du cœur. On ajoute
   des choses sans réécrire le moteur. L'éditeur et le générateur utilisent le vrai code de la piste : ce qu'ils montrent est ce qu'on joue.
3. **Aucune image dans le décor : tout est fait par le code**, avec une seule matière, une lumière en paliers et un contour. D'où un style
   cohérent partout, des fichiers minuscules, et des régions qui changent juste par leurs couleurs.
4. **Les vrais chiffres ne trichent jamais, seul le décor triche** (vitesse du décor par pièce, par pente, par machine). C'est une règle
   rare et précieuse : les records restent justes alors que le jeu reste vivant.
5. **Il est rapide à dessiner** : 4 à 8 millièmes de seconde par image sur ta tablette, pour 16 disponibles. Il reste de la place pour
   un décor deux fois plus riche.

## Les 7 faiblesses principales

1. **Les contrôles automatiques sont cassés depuis le 12/11 et personne ne l'a vu.** Sur GitHub, les tests échouent à chaque envoi
   depuis 3 jours (21 envois) : le contrôle qui fait vraiment tourner le moteur plante sur une variable manquante (`LOINTAINS`). Sur ce PC,
   ces tests sont sautés (node n'est pas installé). Toute la refonte du 12 au 14/11 a donc été faite **sans filet**.
2. **Le monde met trop longtemps à se construire.** Mesuré : 2,3 s pour `kanto-1km`, mais **10,8 s pour la Baie de Carmin** (vitrine). Sur
   un téléphone, compter 2 à 3 fois plus. Tout est calculé d'un bloc, au démarrage, sans rien montrer.
3. **La page pèse 1,27 Mo** (4 fois plus que le 11/11), dont 758 Ko de sprites mis dans la page. Elle dépend aussi d'Internet (three.js
   et la police viennent de serveurs extérieurs) : au parc en 4G, chaque ouverture recharge tout, et sans réseau, rien ne s'affiche.
4. **Le code est très dense et tout est mélangé dans un seul espace.** 398 noms globaux partagés par 28 fichiers ; certaines lignes font
   400 à 600 caractères. La règle « le moteur ne connaît pas le jeu » n'est pas tenue : la caméra, le nageur, le vélo et le cycliste
   lisent directement l'état de la séance. Chaque retouche coûte cher à relire (donc en crédits) et risque d'en casser une autre.
5. **Le vélo et le skieur de fond ne sont pas enregistrés.** Seul le rameur écrit sa séance dans Poké Fit. Pour un « Zwift multi-machines »,
   c'est le plus gros manque côté moteur de séance.
6. **Records et fantômes vivent seulement dans le navigateur de chaque appareil.** Effacer les données du navigateur, changer de
   tablette ou passer au téléphone = tout perdu, et impossible de courir contre le fantôme d'un ami.
7. **Une seule voie, une seule entrée.** La piste n'a qu'un chemin (aucun embranchement), le joueur n'envoie qu'un nombre (des gestes ou
   une vitesse). Les capteurs Bluetooth (home trainer) ont été écrits sans appareil et n'ont jamais été essayés. Les coups de la montre
   passent toujours par deux relais publics.

## Ce qu'on peut en faire (la vision)

Sans limite, dans l'ordre logique :
- **Un moteur solide et léger** : contrôles qui tournent vraiment, monde construit en arrière-plan en moins de 2 s, page qui marche hors
  ligne, code rangé. Rien de visible, mais tout le reste en dépend.
- **Un vrai Zwift Pokémon multi-machines** : toutes les séances enregistrées, records et fantômes sur le serveur, fantômes des amis,
  « circuit du jour » identique pour tous avec classement, entraînements dessinés dans le circuit, home trainer qui durcit dans les côtes.
- **Des parcours spectaculaires** : embranchements choisis à l'effort, descentes de rivière avec rapides, vraies chutes, virages relevés
  à vélo, routes de 10 km construites au fur et à mesure, circuits infinis générés pendant qu'on avance, et même **rouler une vraie
  route** importée d'un fichier GPS.
- **Un monde plus vivant, dans le même style** : forêts denses, herbes et arbres dans le vent, ombres, eau qui coule vraiment, reflets,
  sorties de tunnel éblouissantes, Pokémon en groupes qui réagissent à ton effort, lieux iconiques de Kanto (le pont Pépite, la Tour
  Pokémon la nuit, Ronflex qui bloque la Route 12…), une caméra « réalisateur » et un résumé vidéo de ta séance.
- **Un circuit par jour sans dépenser de crédits** : générateur noté sur la qualité (variété, rythme, repères), planche d'images
  automatique, éditeur plus visuel.

Le détail de tout ça, avec les priorités, est dans la Partie 2. **Mon conseil d'ordre** (section 2.8) : consolider d'abord (chantiers 0 à 3),
puis le « Zwift » (chantiers 10-11), puis le spectaculaire (4 à 9), puis la création (12).

---

# Partie 2 — Pour Claude Fable 5.2 : l'audit complet

## 2.1 L'état mesuré (14/11, ce PC = la tablette de Kiki, Adreno 685, image 1024 × 768)

| Mesure | Valeur | Remarque |
|---|---|---|
| Code du moteur et du jeu | ~470 Ko de JS en 28 fichiers + 33 Ko de recettes | 108 Ko le 11/11 |
| Noms globaux au premier niveau | 398 | un seul espace, ordre de chargement imposé par `page.py` |
| Densité | 65 à 148 caractères par ligne en moyenne, max 592 (`editeur.js`), 447 (`seance.js`), 436 (`generateur.js`), 405 (`piste.js`) | |
| Poids de la page assemblée (vitrine) | **1 265 Ko**, dont 758 Ko de sprites en base64 | ~300 Ko le 11/11 |
| Assemblage par `page.py` | 0,9 s (sprites en cache local) | |
| Construction du monde (`__pret`) | **kanto-1km 2,3 s · vitrine 10,8 s** | panneau masqué : un peu pessimiste, mais l'ordre de grandeur est sûr |
| Dont pose du décor (`poserDecor`) | 2,3 s (vitrine) | ~6 appels à `hauteur()` par candidat |
| Coût d'un appel à `hauteur(x, z)` (le vote) | 38 µs | appelé des dizaines de milliers de fois au démarrage |
| Coût d'une image (vitrine, 7 endroits) | **3,8 à 7,9 ms** | budget 16,7 ms : grande marge |
| Triangles à l'écran / appels de dessin | 33 000 à 114 000 / 42 à 100 | |
| Triangles du monde | décor 125 k, terrain 99 k, rives 50 k, piste 25 k, tunnels 5 k, ponts 3 k | |
| Mémoire JS | 57 Mo | |
| three.js | r128 (2021), WebGL2 disponible | aucun `InstancedMesh`, aucun LOD, aucun Worker |
| Tests Python (`tests.test_riviere`) | 6 passent, **3 sautés** ici (pas de node) | |
| **CI GitHub « Tests des règles »** | **échec à chaque envoi depuis le 12/11** (21 échecs, 1 annulé) ; dernier succès le 11/11 | `ReferenceError: LOINTAINS is not defined` dans le contrôle sans dessin |
| Contrôleur de la vitrine (`__verif`) | ok, rayon mini 32 m, pente maxi 3,3 % | |

## 2.2 Les points forts, en détail (ce qu'il faut protéger)

1. **Le rail.** `PISTE` = tableaux par mètre (X, Y, Z, cap, pente, largeur, rives pondérées, tunnel, pont, surface, allure, caméra).
   Tout le reste en dépend par `at(s)`, `pose(s, d)`, `pres(x, z)`. Simple, déterministe, contrôlable sans navigateur.
2. **Le terrain voté** (`champ.js`) : plus de cassures, les épingles serrées marchent (rayon > demi-largeur + 1,5 m), les ponts ne
   votent pas, les cavernes relèvent la montagne. Précalcul des profils de rives (`REL`) : bonne idée.
3. **Le raccord de Dubins** (`cheminRaccord`) : la boucle se referme sans déformer les pièces dessinées. Élégant.
4. **La séparation données / recettes / cœur** et l'héritage de régions (`herite`) : Johto ou une ville = quelques lignes.
5. **Une seule matière solide** (`MAT_MONDE`, attribut `mat` par sommet) : toute l'ambiance (heure, météo, lieu) passe par des réglages
   partagés (`COMMUNS`, `CIEL.U`). Changer l'heure ne touche à aucun objet.
6. **La vitesse du décor dissociée des vrais mètres** (`ALL`, `VR`, `vrai()`, `decorDe()`) : records justes, sensation libre.
7. **Les outils de contrôle** dans la page (`?pur=1`, `__verif`, `__aller`, `__image`, `?vue=haut`, `?banc=1`, `?perf=1`) : excellents
   pour travailler sans Kiki.
8. **La qualité adaptative honnête** (`regler`) : elle essaie, remet si ça ne change rien, remonte quand tout va bien ; plafond à 60 i/s.
9. **Déterminisme** : même graine, même niveau = même monde, même décor (hasard semé). Indispensable pour le générateur et les fantômes.
10. **Le style** : volumes à facettes, couleurs unies, paliers, contour, image divisée par un entier. Kiki l'aime ; il tient en code pur.

## 2.3 Les faiblesses et limites, par domaine

### A. Filets de sécurité (gravité : haute, à traiter en premier)

- **A1. La CI est rouge depuis le 12/11.** Cause : `page.controle()` assemble `PURS` + `recettes()`, or `recettes()` ramasse aussi
  `contenu/lointains/*.js`, qui écrit dans `LOINTAINS`, défini dans `rendu.js` (pas dans `PURS`). Les 3 tests qui lancent le moteur
  (`test_chaque_niveau`, `test_le_huit`, `test_anciens_niveaux`) échouent. Correctif probable : déclarer tous les registres (`OBJETS`,
  `RAYON`, `EVENEMENTS`, `LOINTAINS`, `SURFACES`, `MONTURES`…) dans un module pur (ex. `moteur/registres.js`, premier de `PURS`), ou ne
  pas ramasser `lointains/` dans le contrôle. **Puis vérifier que les 4 circuits passent encore** : rien ne l'a vérifié depuis 3 jours.
- **A2. Personne n'a vu l'échec.** Il faut une alerte visible (badge dans le README, notification, ou un contrôle exécuté par Claude
  avant chaque commit via un hook), sinon ça se reproduira.
- **A3. node absent sur le PC de Kiki** : les contrôles du moteur ne tournent qu'en ligne. Un node portable (installé hors du dépôt) ou un contrôle par le navigateur d'essai (`?pur=1` lu par script) rendrait la vérification locale possible avant l'envoi.
- **A4. Aucun test visuel.** Rien ne compare des images avant/après. L'audit du 11/11 l'avait demandé (20 captures figées). Un
  navigateur sans écran (Playwright, dans la CI) qui ouvre chaque niveau à 10 endroits, compare au pixel près (tolérance) et publie les
  différences, attraperait les régressions de rendu que les tests de données ne voient pas.
- **A5. Aucun budget de performance contrôlé** : temps de construction, triangles, poids de la page peuvent doubler sans alerte (c'est
  arrivé : page ×4, construction ×5 sur la vitrine). Ajouter des seuils dans les tests.

### B. Architecture du code (gravité : haute pour la suite)

- **B1. Un seul espace global, ordre de chargement implicite.** 398 noms, tous visibles de partout. Un nom réutilisé écrase l'autre
  sans erreur (`RAYON` est à la fois le registre des objets dans `decor.js` et une constante locale du ciel dans `rendu.js`, heureusement
  dans une fermeture). Un module qui déplace une déclaration casse le suivant.
- **B2. Le moteur lit l'état du jeu.** `camera.js`, `monture.js`, `sprites.js`, `velo.js`, `cycliste.js` lisent `S`, `MACHINE`,
  `M_COUP`, `BT`, `D.dresseur`, `NAGEURS`… (≈100 références). La promesse de `MOTEUR.md` (« le moteur ne connaît ni Pokémon ni montre
  ni séance ») n'est vraie que pour les 6 modules purs. Conséquence : impossible de réutiliser le moteur pour un autre jeu (Johto en
  vue de côté, ville, autre univers) ou de le tester sans tout le jeu.
- **B3. Le monde est calculé au chargement du script.** `PISTE`, `CASES`, `REL`, `CAV`, `LIBRE`… sont des constantes calculées dès
  l'exécution, à partir de `NIVEAU` global. Changer de circuit = recharger la page (`relancer`). Le générateur contourne en
  ré-exécutant le texte de la piste dans un `new Function(SOURCE_PISTE)` : le même code chargé deux fois, fragile.
- **B4. Densité extrême des lignes et commentaires de fin de ligne.** Cause directe des deux bugs « avalés » (11/11). Le test qui les
  cherche aide, mais la vraie protection est une mise en forme automatique (une instruction par ligne, commentaires au-dessus).
- **B5. Fichiers qui grossissent sans limite** : `cycliste.js` 38 Ko, `editeur.js` 32 Ko, `surfaces.js` 24 Ko, `seance.js` 24 Ko.
- **B6. `MOTEUR.md` est devenu un journal** (dates, retours de Kiki, ce qui a été refusé) plus qu'une référence. Et le CLAUDE.md du
  dépôt répète tout en paragraphes géants : chaque séance de travail relit des dizaines de Ko pour rien (coût en crédits).
- **B7. Aucun schéma des fichiers de contenu.** Les formats (niveau, région, lieu, nageurs) ne sont décrits qu'en prose. Une faute de
  frappe dans un réglage facultatif est ignorée en silence.

### C. Construction du monde (gravité : haute sur téléphone)

- **C1. Tout sur le fil principal, d'un bloc.** Terrain, rives, piste, ponts, tunnels, décor, lointain, sprites : 10,8 s sur la vitrine
  avant la première image. Rien n'est montré pendant ce temps (sauf « chargement »).
- **C2. Le vote est cher et répété.** 38 µs par appel ; `poserDecor` appelle `hauteur()` jusqu'à 6 fois par candidat (position, rive à
  3 m, 4 pour la pente), et la grille du terrain l'appelle des dizaines de milliers de fois. Aucun cache des hauteurs.
- **C3. Rien n'est gardé d'une ouverture à l'autre.** Même circuit, même graine, même moteur = même monde ; il est pourtant recalculé
  à chaque fois.
- **C4. Tout le monde en mémoire en permanence.** Bien pour 2 km ; au-delà de 4-5 km ou pour un parcours infini, il faudra construire
  par tronçons devant soi et libérer derrière.
- **C5. Quelques calculs en N²** (sans gravité aujourd'hui) : croisements de `verifier()` (N²/4 segments), ponts qui enjambent
  (`enjambe` : pour chaque mètre de pont, tous les mètres de piste). À 10 km (N = 10 000) : ~25 millions de tests au chargement.

### D. Poids, réseau, hors ligne (gravité : haute au parc)

- **D1. 1,27 Mo par ouverture.** Les planches des 17 nageurs + tous les Pokémon de tous les circuits + tous les circuits/régions/lieux
  sont mis dans la page à chaque fois, même pour un seul circuit joué.
- **D2. Dépendances extérieures au démarrage** : three.js (cdnjs, repli jsDelivr) et la police Jersey 15 (Google Fonts). Sans réseau
  ou réseau lent : pas de jeu. Aucun service worker, aucun cache applicatif.
- **D3. Sprites lus sur `master` de PMD SpriteCollab** (choix de Kiki : suivre les mises à jour). Risque : une planche renommée,
  recadrée ou retirée change le jeu sans prévenir (le repli existe, mais aucune alerte). Les habitants, eux, sont figés sur un commit.

### E. Rendu (gravité : moyenne ; la marge est grande)

- **E1. three.js r128** : pas de `BatchedMesh`, instanciation peu utilisée, shaders en GLSL 1. Ça marche, mais les meilleures
  techniques de densité (instances, LOD, culling fin) sont plus simples en version récente.
- **E2. Pas d'instanciation ni de niveaux de détail.** Le décor est fondu par tronçons de 48 m (bon pour les appels de dessin) mais
  chaque arbre lointain coûte autant qu'un proche. Le décor est le premier poste de triangles.
- **E3. Pas d'ombres portées** (sauf ombres dessinées sous le vélo et les sprites). Les objets « flottent » un peu, surtout à midi.
- **E4. Le contour ne voit que la profondeur** (`POST`) : aucun trait sur les arêtes intérieures (un toit sur un mur proche, deux
  volumes collés). Un contour par normales + profondeur donnerait l'aspect « jeu dessiné » plus net.
- **E5. L'eau est un plan plat en travers**, sans courant réel (les rapides sont une pente + une allure), sans transparence ni fond
  visible, sans reflet du décor (seulement des reflets simulés).
- **E6. Horizon faible** : rien n'est dessiné au-delà de 420 m (`camera.far`) sauf l'anneau du ciel (montagnes peintes) et les repères
  `lointain` à 1 400 m. Entre les deux, un vide masqué par la brume.
- **E7. Lumière** : soleil en paliers par normale + 6 lumières ponctuelles au plus, choisies à chaque image ; pas d'occlusion ambiante
  (les coins, le pied des murs, l'intérieur des tunnels n'assombrissent pas), pas d'éclairage de bord (rim light) pour détacher les
  silhouettes du fond.
- **E8. Pokémon en billboards à 8 directions** : très bien pour le style ; mais aucune ombre, aucune interaction avec l'eau pour ceux
  des rives, et 1 texture par Pokémon (pas d'atlas).

### F. La piste (gravité : moyenne, ce sont surtout des plafonds)

- **F1. Une seule voie.** Aucun embranchement, aucun raccourci, aucune boucle optionnelle. Le format ne réserve rien pour un graphe.
- **F2. Courbure en marches.** X/Z sont intégrés avec la courbure brute de chaque pièce ; seule la courbure *lue* (`COURB`) est lissée.
  Entre une ligne droite et un virage, la courbure saute (pas de clothoïde) : sensible à vélo et dans la caméra, invisible sur l'eau.
- **F3. Pas de dévers.** La piste est toujours horizontale en travers (route et eau). Un virage relevé à vélo, une rivière qui
  s'incline dans un méandre, une vague qui penche : impossible.
- **F4. Échantillonnage au mètre, pièces à largeur constante** (fondues sur ±10 m). Suffisant aujourd'hui ; un goulet, une piste qui
  « respire » (lac → gorge) se fait en empilant des pièces.
- **F5. La hauteur de toute la piste est décalée pour que le point le plus bas soit à 0** (`Y -= bas`) : ajouter une descente au bout
  d'un circuit déplace tout le reste en hauteur (sans effet visible aujourd'hui, mais piège pour des repères posés en altitude absolue).
- **F6. Une seule surface en travers** : on ne peut pas avoir une berge praticable à côté de l'eau, une route le long du quai, une piste
  cyclable sur un pont au-dessus de la rivière jouée par un autre circuit.
- **F7. Parcours ouvert = fondu au blanc et retour au début** : pas de vraie arrivée scénarisée, pas d'enchaînement de parcours.

### G. Le terrain (gravité : moyenne)

- **G1. Le terrain ne peut pas être « sculpté ».** Il se déduit seulement de la piste + un `massif` au centre + des collines au loin.
  Impossible de poser une vallée, un plateau, deux volcans, un lac hors piste, une falaise loin de l'eau.
- **G2. Le monde est une île de ~260 m autour de la piste** : au-delà, mer ou collines génériques. Pas de vraies chaînes de montagnes
  en relief entre 400 m et l'horizon.
- **G3. `pres()` = le point de piste le plus proche** : au milieu entre deux bouts de piste (un 8, deux rives d'un lac), la rive et la
  couleur basculent d'un côté à l'autre (le vote adoucit la hauteur, pas les sortes de rive).

### H. Le décor (gravité : moyenne)

- **H1. Pose par densité le long de la piste seulement** (règles : bande de distance, pas, probabilité). Pas de composition :
  clairières, bosquets serrés, alignements, hameaux, champs cultivés, haies qui suivent les parcelles.
- **H2. Vocabulaire de formes limité** (`Forme` : boîte, toit, cylindre, boule, caillou, dôme, fuseau…). Pas de bâtiment modulaire
  paramétrique (étages, fenêtres, toits variés générés par règles) : chaque maison est une recette écrite à la main.
- **H3. Le décor est immobile** (sauf moulin, cascade, panache, particules) : pas de vent dans les arbres ni les herbes, pas de drapeaux,
  de linge, de fumée de cheminée.
- **H4. Les Pokémon du décor ont peu de comportements** (vol, ronde, nage, saut, saut de joie au passage). Pas de groupes, de vols
  d'oiseaux, de réactions à l'effort, de rencontres scénarisées.
- **H5. Lieux posés en ligne** (`a` le long de la rive, `e` depuis le bord) : un village ne peut pas s'étendre en profondeur
  (deuxième rangée de maisons, place, rue perpendiculaire).

### I. Entrées, machines, capteurs (gravité : haute pour le « Zwift »)

- **I1. Les séances de vélo et de skieur de fond ne sont pas enregistrées** (`enregistre: false`) : elles ne comptent nulle part.
- **I2. Bluetooth (FTMS, puissance, cadence, cardio) écrit sans appareil** : jamais essayé ; aucun simulateur de trames en continu
  (seulement `__trames()` ponctuel). Pas de mode ERG (puissance imposée), pas de calibrage, pas de reconnexion automatique testée.
- **I3. Les coups de la montre passent par deux relais MQTT publics** (inchangé depuis l'audit du 11/11) : n'importe qui abonné à tout
  le relais voit passer les coups et le cœur (sans identité) et pourrait en injecter.
- **I4. Une seule grandeur d'entrée** (gestes *ou* vitesse/puissance) ; pas de fusion (cadence de la montre + puissance du capteur),
  pas d'entrée « effort » utilisable comme commande (choisir une voie, déclencher un sprint).
- **I5. Physique propre au vélo seulement** (`physique` : watts → vitesse). Le rameur et le skieur sont des gestes × mètres fixes ; pas
  de modèle de traînée (rameur) ni de lien force → vitesse.

### J. Données de jeu (gravité : haute pour le « Zwift »)

- **J1. Records et fantômes en `localStorage` uniquement**, par appareil et par machine. Fragile, non partagé, non sauvegardé.
- **J2. Aucune donnée de séance riche gardée** : la trace du fantôme (toutes les 0,1 s) n'est conservée que pour le record ; pas d'historique
  des tours par circuit, pas de courbes (cadence, cœur, puissance) par tour côté serveur.
- **J3. Pas de notion de « circuit officiel » versionné** : si un circuit change (une pièce modifiée), son record reste comparé à
  l'ancien tracé (la clé contient la distance, pas une empreinte du tracé).

### K. Outils de création (gravité : moyenne)

- **K1. Pas de planche d'images ni de « partition »** pour La Rivière (le pseudo-3D avait `?planche=1`) : Claude ne peut pas juger la
  variété d'un circuit sans le parcourir.
- **K2. Le générateur tire au hasard puis jette** (jusqu'à 12 s) et garde « le plus ramassé » : il ne note pas la *qualité* (rythme des
  changements de paysage, contrastes, repères, effort).
- **K3. L'éditeur garde les brouillons dans le navigateur** ; « Écrire dans le jeu » ne marche que sur le serveur d'essai du PC.

## 2.4 Bugs et fragilités relevés (non corrigés)

| # | Où | Quoi | Gravité |
|---|---|---|---|
| 1 | `page.py` `controle()` + `contenu/lointains/kanto.js` | `LOINTAINS` non défini dans le contrôle sans dessin : CI rouge depuis le commit `1777222` (12/11) | **haute** |
| 2 | `.github/workflows/tests.yml` | échecs non signalés à Kiki ni à Claude | haute |
| 3 | `jeu/allure.js` | `enregistre: false` pour vélo et skieur de fond : séances perdues | haute (produit) |
| 4 | `moteur/decor.js` `poserDecor` | jusqu'à 6 votes de terrain par candidat (2,3 s sur la vitrine) | moyenne |
| 5 | `moteur/piste.js` | `enjambe` et `verifier` en O(N²) | faible aujourd'hui |
| 6 | `moteur/piste.js` | courbure intégrée en marches (pas de clothoïde) | faible (vélo, caméra) |
| 7 | `moteur/piste.js` | `Y -= bas` : la hauteur absolue dépend du point le plus bas de tout le tracé | latente |
| 8 | `jeu/jeu.js` `CLE_RECORD` | la clé du record ne change pas si le tracé change à distance égale | moyenne |
| 9 | `jeu/montre.js` | relais MQTT publics (lecture et injection possibles) | à ne pas garder |
| 10 | `index.html` | three.js et police chargés sur le réseau à chaque ouverture, aucun repli hors ligne | haute au parc |
| 11 | `page.py` | toutes les planches de tous les circuits mises dans chaque page | moyenne |
| 12 | `moteur/*` | ~100 lectures de l'état du jeu depuis le moteur (`S`, `MACHINE`, `BT`…) | moyenne (architecture) |
| 13 | `jeu/generateur.js` | `new Function(SOURCE_PISTE)` : deuxième exécution du code de la piste dans une portée bricolée | faible |

## 2.5 Les axes d'amélioration : tous les chantiers possibles

Chaque chantier : **but**, **contenu**, **pourquoi**, effort (S = une séance, M = 2-3, L = 4+), risque. Les idées marquées ★ sont celles
que je juge à plus forte valeur pour Kiki.

### Chantier 0 — Réparer et blinder les filets (S, risque nul) ★★★

1. Corriger le contrôle sans dessin (registres déclarés dans un module pur), relancer la CI, vérifier les 4 circuits.
2. Rendre l'échec visible : badge de statut, et/ou hook Claude Code qui lance `python -m unittest tests.test_riviere` (avec node
   portable) avant chaque commit touchant `riviere/`.
3. Installer un node portable hors dépôt pour que les contrôles tournent sur ce PC.
4. Tests visuels : Playwright dans la CI, chaque niveau à ~10 endroits figés (`?s=…&fige=1&h=432`), comparaison avec des images de
   référence (tolérance), artefact des différences. Mise à jour volontaire des références.
5. Budgets contrôlés : temps de construction (sans dessin, en node), triangles par niveau, poids de la page, nombre de globales.

### Chantier 1 — Ranger le code sans changer le jeu (M, risque moyen) ★★

1. **Modules explicites** : soit des modules ES (`import/export`, `page.py` assemble en un seul script par un petit lieur maison, ou
   `<script type="module">` en ligne), soit au minimum un espace par module (`Moteur.piste`, `Moteur.champ`…). Plus aucun nom implicite.
2. **Une interface moteur ↔ jeu** : le jeu donne au moteur, à chaque image, un objet `Etat` explicite (`s`, vitesse de décor,
   phase du geste, effort 0-1, en l'air, pause, monture, tenue…), et le moteur ne lit rien d'autre. Les montures et la caméra deviennent
   des « plugins » qui reçoivent cet état.
3. **Monde reconstructible** : `construireMonde(niveau, biome, options)` → objet `Monde` (piste, champ, décor, maillages) avec
   `detruire()`. Changer de circuit sans recharger ; le générateur et l'éditeur appellent la même fonction (fin du `new Function`).
4. **Mise en forme automatique** (Prettier ou équivalent, largeur 120-140) + interdiction du code derrière un commentaire de fin de
   ligne. Découper `cycliste.js`, `editeur.js`, `surfaces.js`, `seance.js` par responsabilité.
5. **Types sans compilation** : JSDoc + `// @ts-check`, vérifiés par `tsc --noEmit` dans la CI. Attrape les noms mal écrits.
6. **Schémas JSON** des niveaux, régions, lieux, nageurs ; validés par les tests, par l'éditeur (erreurs en direct) et par `page.py`.
   Un champ inconnu = un avertissement.
7. **Documentation** : `MOTEUR.md` devient une référence (prises, formats, règles de dessin, outils) ; l'historique et les retours de
   Kiki vont dans un `JOURNAL.md` à part. Le paragraphe du CLAUDE.md sur La Rivière se réduit à 10 lignes qui renvoient à `MOTEUR.md`.

### Chantier 2 — Un monde construit vite (M, risque moyen) ★★★

1. **Travailleur en arrière-plan (Web Worker)** : piste, champ, terrain, rives et pose du décor sont déjà sans three.js (modules purs) :
   ils peuvent tourner dans un Worker qui renvoie des tableaux bruts (positions, couleurs, matières) transférés sans copie. Le fil
   principal reste fluide et affiche le menu (vitrine du cycliste) pendant la construction.
2. **Cache des hauteurs** : une grille de hauteurs précalculée (pas de 1 à 2 m près de la piste) puis interpolée ; le vote n'est fait
   qu'une fois par point de grille. Gain attendu ×5 à ×20 sur `poserDecor` et le terrain.
3. **Cache du monde construit** dans IndexedDB, clé = empreinte (niveau + région + lieux + version du moteur + graine). Deuxième
   ouverture : quelques centaines de ms.
4. **Construction progressive** : d'abord les 300 m autour du départ, puis le reste ; la séance peut commencer avant la fin.
5. **Tronçons (streaming)** : construire 600 m devant, libérer 200 m derrière. Prérequis des parcours longs (10 km et plus), des
   parcours A→B réels (GPX) et du circuit infini.
6. Remplacer les deux boucles en N² par la grille `CASES` déjà existante.

### Chantier 3 — Léger et hors ligne (S à M, risque faible) ★★★

1. **Ne mettre dans la page que ce que le circuit choisi utilise** + le nageur choisi ; les autres planches à la demande (déjà prévu
   en ligne par `sprites.js`) ou dans un fichier à part mis en cache.
2. **Atlas de sprites** (une image par circuit) en WebP : moins de poids, une seule texture.
3. **three.js et la police servis avec la page** (MIT et OFL : compatibles avec un dépôt public) ou mis en cache par un service worker.
4. **Mode « parc » hors ligne** : service worker (si le cadre Streamlit le permet ; sinon une page autonome installable « PWA » sur le
   téléphone), séance gardée localement et envoyée au retour du réseau.
5. Alerte quand une planche de PMD SpriteCollab change ou disparaît (empreinte gardée par `page.py`).

### Chantier 4 — Le rendu, plus beau dans le même style (M à L, risque faible) ★★

Toujours faits par le code, toujours en paliers, jamais une image de décor :
1. **Passer à three.js récent** (r16x/r17x) : `InstancedMesh`/`BatchedMesh`, meilleurs outils de culling. Une demi-journée de recalage.
2. **Instances + niveaux de détail** : arbres, rochers, herbes, barrières en instances ; au-delà de 60-80 m, arbre simplifié, au-delà
   de 150 m, **forêt en masse** (une nappe bosselée couleur feuillage, idée du 11/11 pas encore faite). Décor ×3 à ×4 au même coût.
3. **Vent** : arbres, herbes, roseaux, drapeaux qui ondulent dans le vertex shader (force selon la météo et la vitesse de décor).
4. **Ombres stylisées** : une carte d'ombre du soleil en basse résolution, appliquée en paliers durs (deux tons), seulement près de la
   caméra ; ou ombres de contact projetées. Les objets se posent enfin au sol.
5. **Contour par normales + profondeur** (arêtes intérieures), épaisseur selon la distance.
6. **Occlusion ambiante cuite dans les couleurs des sommets** (coins, pied des murs, dessous des toits, fond des gorges) : gratuit à
   l'affichage, gros gain de relief.
7. **L'eau** : courant réel le long de `s` (flowmap : l'écume et les reflets défilent à la vitesse de l'eau, plus vite dans les rapides),
   bords transparents avec fond visible près des rives, reflets stylisés du ciel et des rives (copie inversée en paliers), vagues
   stationnaires dans les rapides, caustiques au fond des grottes de source.
8. **Lumière** : éclairage de bord (rim light) sur la monture et les Pokémon, éblouissement à la sortie d'un tunnel (exposition qui
   s'adapte), rayons de soleil en sous-bois, phares/lanternes qui éclairent la route la nuit.
9. **Horizon** : trois anneaux de vrais reliefs en volumes (400 m, 900 m, 1 500 m) générés par la région, en parallaxe ; les repères
   `lointain` s'y insèrent. Fini le vide entre la brume et le ciel.
10. **Étalonnage par région** (une table de couleurs par région et par heure) et option de **palette imposée** (réduction des couleurs
    + tramage) pour une cohérence pixel art absolue entre monde et sprites.
11. **Particules sur la carte graphique** (pluie, neige, pollen, embruns) : 10× plus de particules au même coût.

### Chantier 5 — La piste, sans plafond (M à L, risque élevé sur le cœur) ★★

1. **Embranchements** : la piste devient un graphe de tronçons (format : `"fourche": {"haut": [...], "bas": [...], "rejoint": "<nom>"}`).
   Choix **à l'effort** : au-dessus de sa croisière à l'entrée de la fourche, on prend la voie spectaculaire (tremplin, voie du haut),
   sinon l'autre ; longueurs égales en vrais mètres (records justes). Le seul « volant » honnête d'une machine de sport.
2. **Clothoïdes** : courbure qui varie linéairement entre deux pièces (option par pièce, défaut activé pour la terre).
3. **Dévers** : la route s'incline dans les virages (vélo), la rivière se penche dans un méandre ; la caméra et la monture suivent.
4. **Largeur et profil en travers continus** : goulets, élargissements, chenal central plus profond, berges praticables.
5. **Surfaces multiples en travers** : rivière + chemin de halage ; quai + route ; un circuit de vélo peut longer la rivière du rameur.
6. **Eau en mouvement réel** : rapides avec marches, toboggans, tourbillons, et une vraie **descente de rivière** (parcours A→B long),
   la Cascade (remontée) restant la clé des boucles.
7. **Arrivées scénarisées** pour les parcours ouverts (arche, foule, ralenti), et **parcours enchaînés** (Route 1 → Jadielle → Route 2).
8. **Circuit infini** : le générateur produit des pièces au fur et à mesure (avec les tronçons du chantier 2) ; graine du jour.
9. **Import GPX** ★ : rouler une vraie route (son tracé et son profil d'altitude ramenés à l'échelle), habillée par une région Pokémon.
   Avec le home trainer qui reçoit la pente : une vraie montée d'un col, en Kanto.

### Chantier 6 — Le terrain qu'on sculpte (M, risque moyen)

1. **Couche de sculpture** dans le niveau : `"relief": [{"o": "colline", "x": …, "z": …, "r": 120, "h": 40}, {"o": "vallee"…},
   {"o": "plateau"…}, {"o": "lac"…}]`, ajoutée au vote (positions en mètres du plan ou relatives à un mètre de piste).
2. **Plusieurs massifs**, volcans, falaises lointaines, rivières affluentes qui rejoignent la piste, cascades lointaines.
3. **Zones de région** : une région par secteur (la côte, puis la forêt, puis la montagne) avec transitions douces.
4. **Lever l'ambiguïté de `pres()`** : vote aussi des sortes de rive (pas seulement de la hauteur) au milieu de deux tronçons.

### Chantier 7 — Le décor vivant (M à L, risque faible) ★★

1. **Grammaire de composition** : bosquets, clairières, haies, champs en parcelles, vergers, hameaux générés (maisons + jardins +
   chemins + barrières), places de village en profondeur (lieux en 2D, pas seulement le long de la rive).
2. **Bâtiments paramétriques** : un générateur de maisons (largeur, étages, toit, fenêtres, couleurs de la région) au lieu d'une recette
   par maison. Johto (toits japonais), ville moderne, port = des jeux de paramètres.
3. **Animations de décor** : fumée des cheminées, linge, drapeaux, girouettes, bateaux qui tanguent, roues à aubes, feux de camp.
4. **Pokémon en groupes et en comportements** : vols d'oiseaux (boids), bancs de Magicarpe qui sautent ensemble, troupeaux de Tauros
   qui courent le long de la route, Pokémon qui suivent le joueur quelques secondes, qui applaudissent quand il sprinte (lien à l'effort),
   rares qui n'apparaissent que certains jours ou certaines heures (la nuit : Fantominus près de la Tour Pokémon).
5. **Rencontres scénarisées** (événements du niveau) : Ronflex qui bloque la route et se réveille quand on accélère, Léviator qui
   jaillit dans le lac, Électhor qui passe dans l'orage, le Pokémon fétiche d'un champion au bord de son arène.
6. **Lieux iconiques de Kanto en modules** : pont Pépite d'Azuria, Céladopole, Lavanville et sa tour, Parmanie et sa plage, Centrale,
   Îles Écume (glace), Cramois'Île (volcan), Plateau Indigo (arrivée). Chacun utilisable par l'éditeur et le générateur.
7. **Collisions de décor plus fines** que le cercle `RAYON` (rectangles orientés pour les maisons).

### Chantier 8 — Caméra et mise en scène (S à M, risque faible) ★

1. **Caméra « réalisateur »** : plans par pièce (rails de caméra : travelling latéral sur un pont, plan large au passage d'un repère,
   plongée sur un lac, contre-plongée sous une cascade), toujours revenant au plan de jeu en douceur ; réglable (« sobre » / « cinéma »).
2. **Ralenti** au sommet d'un saut, à un record, au passage de la ligne (le temps affiché, lui, reste vrai).
3. **Résumé de séance** ★ : le jeu enregistre les « moments » (saut, record, sprint, rencontre) et rejoue 20-30 s à la fin, avec la
   caméra réalisateur. Partageable en image (mode photo).
4. **Mode photo** : pause, caméra libre, filtres de l'heure, capture.
5. **Vue écran partagé** pour deux machines côte à côte (rameur + vélo dans la même pièce).

### Chantier 9 — Le son, toujours doux (S, risque nul)

Kiki veut très peu de son et **jamais de musique** : tout reste optionnel, coupé par défaut sauf l'existant.
1. Ambiances de lieu très douces, au choix : sous-bois (oiseaux), port (mouettes, cordages), ville, plage (ressac), grotte (gouttes).
2. Cris des Pokémon quand on passe près d'eux (une fois, très bas).
3. Son spatial (panoramique gauche/droite) pour les cascades et les Pokémon.
4. Indices sonores d'effort pour ceux qui ne regardent pas l'écran (fourche qui arrive, segment qui commence).

### Chantier 10 — Entrées, machines, capteurs (M, risque moyen) ★★★

1. **Une couche « sources » unique** : chaque source (montre MQTT, Bluetooth FTMS/CSC/CP/HR, clavier, auto, **rejeu d'une séance
   enregistrée**) produit les mêmes événements (geste, vitesse, puissance, cadence, cœur). Le jeu ne sait pas d'où ça vient.
2. **Fusion** : cadence de la montre + puissance du capteur ; cœur de la ceinture si présente, sinon de la montre.
3. **Simulateur de capteurs** pour tester sans appareil : un faux home trainer FTMS (en page, ou via une appli de simulation BLE sur
   le téléphone) qui envoie des trames continues, reçoit la pente et la renvoie en résistance simulée.
4. **Remplacer les relais publics** : relais privé (un petit Worker Cloudflare/Deno en WebSocket avec jeton), ou liaison directe
   montre → téléphone → page (Data Layer puis WebRTC, comme le lien PeerJS d'avant), ou Bluetooth direct (`CAPTEUR.md`).
5. **Modèles physiques par machine** : rameur (facteur de traînée, force → vitesse), skieur (amplitude → vitesse, calibrage par séance),
   vélo (déjà là) ; toujours estimés vers le bas quand la machine n'affiche rien (règle de Kiki).
6. **Home trainer** : mode simulation (pente, déjà écrit), mode ERG (puissance imposée par la pièce : « 30 s à 250 W »), calibrage,
   reconnexion automatique, choix de la difficulté au menu.
7. **L'effort comme commande** : sprint (dépasser sa croisière de X % pendant Y s) qui déclenche un effet, choisit une voie, rattrape
   un rival ; zones cardiaques qui changent l'ambiance (plus de vent, de particules en zone haute).

### Chantier 11 — Le « Zwift Pokémon » (M à L, risque moyen) ★★★

1. **Toutes les séances enregistrées** (vélo, skieur de fond, home trainer) dans Poké Fit, sans double compte avec la montre (comme le
   rameur : `seances_rameur.fusionner`), avec la machine en étiquette.
2. **Records, fantômes et historique côté serveur** (branche `data` du dépôt privé, par joueur, par circuit, par machine), le
   `localStorage` ne servant plus que de cache. Empreinte du tracé dans la clé (un circuit modifié = nouveau classement).
3. **Fantômes des amis** : le meilleur tour de chaque ami nage ou roule à côté de toi (asynchrone : personne n'a besoin d'être là).
4. **Le circuit du jour** ★ : une graine par date, le même circuit généré pour tous, classement du jour dans la page Dresseur.
5. **Classements par circuit et par machine**, segments chronométrés partagés (« roi de la côte »), défis de la semaine.
6. **Entraînements dessinés dans le circuit** : chaque pièce porte un effort conseillé (récupération sur le lac, 30 s vite dans les
   rapides) sans jamais afficher un programme ; ou un mode « séance guidée » choisi au menu.
7. **Plus tard : temps réel** à plusieurs (WebRTC, quelques joueurs), chacun sur sa machine, un seul circuit.
8. **Lien avec Poké Fit** (à décider avec Kiki, sans double compte) : Pokémon « vus » sur le parcours inscrits dans un carnet,
   compagnon qui évolue aux kilomètres (déjà fait pour le rameur, à étendre), rival de la région comme adversaire.

### Chantier 12 — Créer un circuit par jour sans crédits (M, risque faible) ★★

1. **Planche et partition** (proposées le 11/11) : une page qui photographie le circuit tous les 50 m et une frise qui montre, pièce par
   pièce, le paysage, la lumière, l'ouverture, le relief : un circuit monotone se voit avant d'être joué. Utilisable par Claude.
2. **Générateur noté** : il tire, construit, puis **note** (changement de paysage toutes les 20-40 s, contrastes entre voisins, un repère
   par tour, variété des événements, effort équilibré) et garde le meilleur, pas seulement le plus ramassé.
3. **Survol** : une prévisualisation qui parcourt le circuit en 30 s accéléré.
4. **Éditeur plus visuel** : poser les pièces à la souris sur le plan, glisser les objets, frise des pièces, annuler/rétablir.
5. **Enregistrer un circuit dans le jeu depuis l'appli** (pas seulement sur le PC) : via l'appli et son jeton GitHub, dans la branche data.
6. **Bibliothèque de modules étiquetés** (ouvert/fermé, clair/sombre, ville/nature, calme/spectaculaire) que l'éditeur et le générateur
   partagent, et qui grandit d'un fichier à la fois.

### Chantier 13 — Écrans et appareils (S à L)

1. **Téléphone en portrait** pour le skieur de fond au parc : cadrage propre, chiffres en bas, image plus haute.
2. **Télévision** : envoi de la page sur un grand écran (Cast, câble HDMI depuis la tablette), mise en page « salon ».
3. **Lunettes XR / WebXR** : la caméra devient la tête ; idéal sur un rameur (on regarde droit devant), à étudier pour le confort.
4. **Mode basse consommation** pour les jours chauds (30 i/s, image plus petite, pas de contour) et indicateur de batterie.

### Chantier 14 — Sécurité, droits, vie privée (S)

1. Relais privé (voir 10.4).
2. **Écran des crédits** dans le jeu : artistes de PMD SpriteCollab (CC BY-NC 4.0, attribution obligatoire), pret/pokefirered,
   three.js, police. Rappel : jamais d'usage commercial.
3. Aucune donnée de santé dans la page au-delà du nécessaire (aujourd'hui : cœur en direct seulement) ; garder cette règle avec les
   fantômes d'amis (temps et trace, jamais le cœur d'un autre).

## 2.6 Ce que je ne recommande pas

- **Changer de moteur** (Godot, Unity, Babylon) : on perdrait la page unique, la légèreté et la lisibilité pour Claude ; ce qui est
  difficile ici (rail, terrain voté, génération) n'existe dans aucun moteur. Monter de version three.js suffit.
- **Revenir à des images dans le décor** (ChatGPT, tuiles) : refusé par Kiki et contraire à la force n° 3.
- **Ajouter de la musique** : refusé par Kiki.
- **Gros chantier 3D lancé sans demande explicite** : Kiki a dit que la 3D lui coûte trop de crédits (10/11) ; chaque chantier ci-dessus
  doit être proposé et accepté un par un.

## 2.7 Les limites de cet audit

- Pas mesuré : le téléphone, une vraie séance avec la montre ou un capteur Bluetooth, la page dans le cadre Streamlit.
- Les temps de construction ont été pris avec le panneau de navigateur masqué (peut ralentir) : à confirmer avec `?banc=1` en vrai.
- Je n'ai pas lu ligne à ligne `cycliste.js`, `velo.js`, `editeur.js`, `seance.js`, `surfaces.js`, `tunnel.js`, `ambiance.js` (en-têtes et
  structure seulement) : des bugs de détail peuvent s'y cacher.

## 2.8 Ordre conseillé

| Ordre | Chantier | Pourquoi maintenant | Effort |
|---|---|---|---|
| 1 | **0 — Filets** (CI réparée, alerte, node local, tests visuels, budgets) | tout le reste en dépend ; la CI est rouge | S |
| 2 | **2 — Construction rapide** (cache des hauteurs, Worker, cache du monde) | 10,8 s sur la tablette, pire au téléphone | M |
| 3 | **3 — Léger et hors ligne** | le parc en 4G | S-M |
| 4 | **1 — Rangement** (modules, interface moteur ↔ jeu, schémas, doc courte) | chaque séance de travail coûtera moins cher ensuite | M |
| 5 | **10 + 11 (début)** — séances de toutes les machines enregistrées, records et fantômes sur le serveur, sources unifiées, relais privé | le cœur du « Zwift multi-machines » | M |
| 6 | **12 (planche, partition, générateur noté)** | le but de Kiki : un circuit par jour sans crédits | M |
| 7 | **4 (instances, forêt en masse, vent, ombres, horizon)** et **7 (composition, comportements)** | le monde dense et vivant | M-L |
| 8 | **5 (embranchements à l'effort, dévers, clothoïdes, tronçons, GPX)** | le spectaculaire et les longues routes | L |
| 9 | **8, 9, 11 (fantômes d'amis, circuit du jour), 13, 14** | finition et social | selon |

Règle pour chaque chantier : **une version avant/après comparée** (tests visuels + `__verif` + `?banc=1`), `kanto-1km` toujours identique à
l'œil tant que Kiki ne demande pas de le changer, et la vraie séance au rameur jamais cassée (menu, tours, record, fantôme, saisie,
`pkm_rameur`, `M_COUP`).

## 2.9 Le message à donner à Fable (proposition)

> Lis `riviere/MOTEUR.md` puis `riviere/AUDIT-MOTEUR-2026-11-14.md`. Vérifie que la copie est à jour (`git fetch`, `git status -sb`).
> Commence par le chantier 0 (la CI est rouge depuis le 12/11 : `LOINTAINS` manquant dans le contrôle sans dessin). Pour chaque
> chantier suivant, propose-moi d'abord un plan court (ce que je verrai, le risque, l'effort), attends mon accord, puis fais-le avec
> une comparaison avant/après. Ne touche pas aux règles de Poké Fit. Le circuit `kanto-1km` et la vraie séance au rameur ne doivent
> jamais changer sans que je le demande.
