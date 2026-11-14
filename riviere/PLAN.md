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
| 2 | Records et fantômes sur le serveur | le record suit Kiki de la tablette au téléphone | une empreinte du tracé dans la clé du record | 11.2 | faible | 1 à 2 | à faire |
| 3 | Fantômes des amis, classement par circuit | le meilleur tour d'un ami nage à côté de soi | aucune de plus | 11.3, 11.5 | moyen | 1 | à faire (voir « En suspens ») |
| 4 | Générateur noté | une planche d'images et une note par circuit | le générateur tourne sans navigateur | 12.1, 12.2 | faible | 2 | à faire |
| 5 | Circuit du jour | chaque matin le même circuit pour tous et son classement, fabriqué par GitHub sans crédits | l'étape 4 | 11.4 | faible | 1 | à faire |
| 6 | Ronflex et premiers lieux de Kanto | Ronflex bloque la route et se réveille quand on accélère | la brique « effort » (forcer plus que sa croisière) | 7.5, 7.6, 10.7 | faible | 1 à 2 par lot | à faire |
| 7 | Embranchements à l'effort | une fourche : la voie spectaculaire si on force | les captures de référence de l'étape 0 | 5.1 | **élevé** (le cœur) | 3 à 4 | à faire |
| 8 | Route GPS et home trainer | un vrai col, habillé en Kanto, qui durcit dans les côtes | monde construit par tronçons, seulement au-delà de ~5 km | 5.9, 10.6, 2.5 | élevé | 3 à 4 | à faire (voir « En suspens ») |
| 9 | Forêts, vent, ombres, eau qui coule | un effet à la fois | aucune (les instances existent déjà dans three.js r128) | 4 | moyen | 3 à 5 | à faire |
| 10 | Résumé de séance | 20 à 30 s rejouées à la fin | la trace gardée à l'étape 2 | 8.3 | moyen | 2 | à faire |

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

- **Les amis ne peuvent pas jouer aujourd'hui** : le jeu avance grâce à l'appli « Capteurs » de la Pixel Watch de Kiki. Sans un moyen
  pour eux (le téléphone comme capteur, ou un capteur Bluetooth), l'étape 3 et le classement du jour n'ont que Kiki dedans. Chantier à
  part, à décider avant l'étape 3.
- **Le home trainer** : le Bluetooth (`jeu/capteurs.js`) a été écrit sans appareil. L'étape 8 n'a de sens qu'avec un vrai home trainer
  sous la main ; sinon elle passe en dernier.

## Ce dont Kiki aura besoin de faire

- Étape 0 : son accord pour installer node sur ce PC, hors du dépôt.
- Étape 1 : une vraie séance de skieur de fond, puis vérifier qu'elle apparaît une seule fois dans Santé.
- Étape 2 : ouvrir le jeu sur la tablette puis sur le téléphone, et voir le même record.
- Étape 8 : le home trainer.
- Jamais essayés à ce jour : le téléphone, un vrai capteur Bluetooth, la page dans l'appli.

## Repères dans le code (pour ne pas les rechercher)

- **Séances** : `jeu/seance.js` écrit la séance dans le localStorage `pkm_rameur`, la page de l'appli se recharge, `app.py`
  (`envoyer_rameur`) la passe à `seances_rameur.ranger` → `data/rameur/seances.json` (branche data). `seances_rameur.fusionner` en fait
  une séance de la journée et remplace celle de la montre qu'elle recouvre. Depuis l'étape 1 : les trois machines, même format (`machine`),
  le skieur de fond et le vélo dans `data/machines/seances.json` (`seances_rameur.AUTRES`) ; détails dans `MOTEUR.md`.
- **Records, fantômes, segments** : seulement dans le navigateur (`CLE_RECORD` de `jeu/jeu.js`, `CLE_FANTOME` de `jeu/fantome.js`,
  `CLE_SEGMENTS` de `jeu/parcours.js`). La clé contient le nom et la distance du circuit, pas son tracé.
- **Écrire sur le serveur** : `app.ecrire_depot` (le jeton GitHub de l'appli), comme pour `data/dresseurs/`.
- **Générateur** : `genererCircuit` dans `jeu/generateur.js`. Sa recherche est bornée en temps (12 s) : à vérifier qu'elle donne le
  même circuit sur deux machines de vitesses différentes avant d'en faire un circuit du jour.
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
