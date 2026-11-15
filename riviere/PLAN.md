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
- Le circuit `kanto-1km`, identique à l'œil. Tout nouvel effet de rendu est une option par région ou par niveau, éteinte sur lui.
- Les vrais chiffres (distance, temps, allure, cadence, watts) ne trichent jamais ; seul le décor défile plus ou moins vite.
  Une machine sans écran (le skieur de fond) : toujours une estimation vers le bas.
- Aucune image dans le décor : tout par le code, dans le style actuel (volumes à facettes, couleurs unies, lumière en paliers, contour).
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
| 8 | Route GPS et home trainer | un vrai col, habillé en Kanto, qui durcit dans les côtes | monde construit par tronçons, seulement au-delà de ~5 km | 5.9, 10.6, 2.5 | élevé | 3 à 4 | à faire (voir « En suspens ») |
| 9 | Forêts, vent, ombres, eau qui coule | un effet à la fois | aucune (les instances existent déjà dans three.js r128) | 4 | moyen | 3 à 5 | à faire |
| 10 | Résumé de séance | 20 à 30 s rejouées à la fin | la trace gardée à l'étape 2 | 8.3 | moyen | 2 | **faite le 15/11** (à essayer : un essai « Auto » de 3-4 min, puis « ■ Fin ») |

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
- Étape 8 : le home trainer.
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
