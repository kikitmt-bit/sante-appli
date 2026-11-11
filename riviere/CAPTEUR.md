# Le capteur de « La Rivière » : la montre, pas le téléphone

Décidé par Kiki le 10/11/2026 : quand ce moteur sera branché à de vraies séances, **les coups viendront de la Pixel
Watch**, plus du téléphone sous le siège. Ne pas brancher l'ancien lien téléphone → tablette (`rameur.js`, PeerJS)
sur ce moteur, sauf en secours.

## Pourquoi c'est possible (analyse du 10/11)
- Rameur, 10 min, montre et téléphone en même temps : la montre retrouve 256 des 258 coups du téléphone (3 en trop,
  ~0,1 s d'écart), le même compte minute par minute. Méthode : accéléromètre filtré 0,2-1,5 Hz, axe principal, un
  pic tous les 1,4 s au plus.
- La force d'un coup se lit mal au poignet (corrélation 0,4 avec la vitesse du siège) : la distance s'apprend séance
  par séance sur ce qu'affiche le rameur (même principe que `seances_rameur.modele`).
- Elliptique, 10 min : un tour net par pic (0,3-2,5 Hz, régularité 2 %), 53 à 59 tours/min ; l'allure se lit surtout
  dans l'ampleur du geste (×1,5). Mains sur les poignées mobiles obligatoires. Meilleurs tours et classements
  **séparés par machine**.

## Fait le 11/11 : une première version qui marche, sans Bluetooth
Pour pouvoir jouer tout de suite, la montre envoie ses coups **par Internet** (Wi-Fi de la maison, ou le téléphone) :
- montre v19, appli « Capteurs », Rameur, ● Enregistrer : en plus du fichier CSV, `Rameur.kt` (`Detecteur` : filtre
  0,2-1,5 Hz en direct, axe principal suivi en continu, un sommet au-dessus de 0,8 × l'ampleur habituelle et de 2 m/s²,
  1,2 s au moins entre deux ; rejoué sur l'enregistrement du 10/11 : 256 coups retrouvés sur 258, aucun en trop) ;
- chaque coup part sur **deux relais MQTT publics** (broker.hivemq.com et broker.emqx.io, TLS, `Relai`), état toutes
  les 5 s (cœur compris) ; sujet `pokefit/rameur/<seances_rameur.lien>` ; messages : numéro du coup, force relative, cœur ;
- le jeu (`riviere/js/montre.js`) écoute les deux relais par WebSocket, garde chaque coup une fois, coupe « Auto » et
  avance ; « MONTRE RELIÉE · ♥ » en bas à droite. Essai du 11/11 : 6 coups envoyés, 6 reçus, ~20 ms par relais.
- Essai sur le PC sans Streamlit : `python riviere/serveur.py` (le lien est calculé avec `montre/secret.properties`).
Le Bluetooth direct ci-dessous reste le but (rien à ouvrir sur la montre, pas d'Internet) ; cette version sert à jouer.

## Critère n° 1 : rien à faire (Kiki, 10/11)
Kiki ne veut rien connecter : idéalement il lance le jeu sur la tablette et la montre se relie toute seule, en
arrière-plan, **sans ouvrir d'appli sur la montre**. Le plan qui y répond :
- **la tablette = un PC Windows sur ARM** (Xiaomi Book S 12.4, Bluetooth Qualcomm, le PC de Kiki) : le jeu reste
  dans Chrome ; **un petit programme invisible démarre avec Windows** (Python + `bleak`, à vérifier sur ARM64), se
  relie tout seul en Bluetooth à la montre dès qu'elle est à portée et passe les coups à la page par une connexion
  locale (`ws://localhost:<port>`, Chrome peut demander une seule fois l'accès au réseau local, puis s'en souvient).
  Chrome seul ne suffit pas : il impose de choisir l'appareil Bluetooth à chaque séance ;
- **la montre émet en permanence un signal Bluetooth très discret** (un service toujours prêt, capteurs éteints) ;
  quand la tablette s'y relie, la montre allume ses capteurs et envoie les coups ; quand le jeu se ferme, tout
  s'éteint ;
- **jamais relié pour rien (Kiki, 10/11 : la montre est toujours à portée dans l'appartement, et sa batterie est
  faible)** : le programme du PC ne se relie à la montre **que quand la page du jeu est ouverte** (la page lui ouvre
  sa connexion locale), et la lâche dès qu'elle se ferme ; capteurs de la montre allumés seulement pendant ce temps.
  Hors du jeu, la montre ne fait qu'émettre son petit signal, au rythme le plus lent (mode basse consommation) ;
  **mesurer son coût sur 24 h avant d'aller plus loin** ; s'il se voit, repli sur le toucher du cadran ;
- à vérifier avant de construire : que la Pixel Watch puisse émettre ce signal (BLE en mode périphérique), que
  Wear OS laisse ce service vivre sans le couper, et ce qu'il coûte en batterie par jour.
Replis, du plus simple au moins simple : un toucher sur le cadran de la montre (complication « Rameur ») ; un
toucher « Relier la montre » sur la tablette (Chrome seul, sans appli).

## Le chemin des coups (à choisir au branchement)
1. **Bluetooth direct montre → PC (à essayer en premier)** : la montre se déclare comme petit appareil Bluetooth
   (BLE, comme une ceinture cardio) et envoie chaque coup au programme du PC (voir plus haut), qui le passe à la page.
   Aucun réseau, latence la plus faible.
   À vérifier d'abord : la Pixel Watch accepte-t-elle d'être un appareil BLE (publicité + service GATT) ?
2. Repli : montre → téléphone en Bluetooth (Data Layer, appli `telephone`) → tablette par le lien PeerJS actuel.
3. Mode nomade (elliptique du parc) : montre → téléphone, le jeu tourne sur le téléphone.

Point de départ côté montre : appli « Capteurs » (`montre/…/Capteurs.kt`, service `Enregistreur`), qui enregistre
déjà accéléromètre, gyroscope et cœur à 50 mesures/s : il reste la détection des coups sur la montre et l'envoi.
