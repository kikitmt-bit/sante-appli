# Ma santé (appli) — notes pour Claude

Appli Streamlit perso de Kiki (pas développeur, réponses en français, simples). **Dépôt PUBLIC** : code seulement,
jamais de données, de jeton ni de mot de passe ici. Les données et le script de récolte (Apps Script `sante.gs`) sont dans
le dépôt **privé** `kikitmt-bit/sante` (branche `data`, format décrit dans son CLAUDE.md) ; l'appli les lit par l'API
GitHub avec les secrets `GITHUB_TOKEN`, `GITHUB_REPO` (= kikitmt-bit/sante). L'appli est publique sur Streamlit (la seule
appli privée gratuite de Kiki est prise par le padel) : **connexion Google** (27/10, `connexion_google()`, `st.login`,
secrets `[auth]` + `COMPTES` = adresses Gmail autorisées, jamais dans le dépôt ; ⚙️ → Se déconnecter). Tant que `[auth]`
manque, repli sur l'ancien `verrou()` (`APP_PASSWORD`, mémorisé : localStorage + cookie `sante_ok`). On travaille
directement sur `main`.
**Retours de Kiki du 05/11 au soir, faits le 06/11** : phrases des champions variées (`CONFIE` : favori, préféré, le plus fort…) ; dresseur à vélo sur la carte repéré par `data-feuille` (l'image repeinte n'a plus « red_bike » dans son adresse : il était deux fois trop petit) ; défi gagné aux pompes : `partagerConfirme` attend que le serveur ait noté la série avant de recharger, puis « X prépare ton badge… » et nouvel essai toutes les 5 s (4 au plus, `pkm_badge_auto` = {essai, t}) ; l'entrée du champion (`sceneEntree`) passe avant vélo, rival et histoires au chargement ; **plus de sexe des Pokémon** (résultat, fiche ; `FEMELLES` reste dans pokedex.py, inutilisé) ; silhouette de l'ouverture : même liste d'effets `filter` avant et après (Safari restait sur la silhouette blanche à lueur dorée : shiny « tout doré » de Berta) ; fin de région : plus de défilé des Pokémon ni de dresseur + starter collés (mauvaises proportions), restent le panorama en musique et la vue au coucher du soleil. **Son sur iPhone (06/11)** : rien sur Safari, tout sur Chrome (Berta) : `audio()` met `navigator.audioSession.type = "playback"` (sinon le bouton silencieux coupe Web Audio) et le son est préparé au premier toucher de la page ; à vérifier sur son iPhone.
**Comptes des amis** (02/11) : adresses Gmail ajoutées à `COMPTES` ; secret `PROPRIETAIRE` = l'adresse de Kiki (sans lui :
la seule adresse de `COMPTES`, et s'il y en a plusieurs, personne n'est Kiki : ses données ne sortent jamais).
`identifiant_ami()` : `AMI` = None pour Kiki, sinon 12 chiffres hexa (sha256 de l'adresse), `PREFIXE` = `data/joueurs/<id>/`
ajouté par `lire()` à **tout** chemin : un ami lit les mêmes fichiers que Kiki, dans son dossier. `data/joueurs.json` =
{id: {debut}} (écrit par le script). Pas encore dedans : `accueil_ami()` (ce qui est lu, qui peut le voir, lien signé
« Relier ma montre » vers `?quoi=relier` du script). `JOUEUR` = {id, debut} passé à `ecran_pokemon.afficher` →
`pokemon.charger_jeu` / `jouer` : sa partie commence le jour où il relie sa montre, cadeau du Professeur compris, et son
id entre dans l'identifiant des balls, donc dans la graine (`ident(jour, cle, ami)`, autres tirages que Kiki ; ceux de
Kiki n'ont pas bougé). **La clé `JEU_CLE` ne va jamais chez un ami** (elle ouvre aussi la montre, l'agenda et Claude de
Kiki) : signature `ouvrir:<id>` qui ne sert qu'à noter ses balls. Pas de coach pour un ami (profil et abonnement de Kiki).
⚙️ : Kiki voit qui est relié ; un ami peut tout supprimer (`quoi=delier`). `montre.py` : `calculer_amis` (mission + captures
figées de chacun ; dépôt public : ni identifiant ni erreur dans le journal), pas de `montre.json` pour eux. **Récolte d'un
ami à l'ouverture de l'appli** (`demander_recolte(ouverture=1)`, une fois par session), au bouton 🔄, et une fois par jour
sinon ; détails et quotas : CLAUDE.md du dépôt privé. **Jouer à plusieurs, 1re version (02/11, carte blanche de Kiki)** : `amis.py`. Chaque téléphone publie le pseudo et les 4 couleurs
de sa carte du dresseur (et rien d'autre de `pkm_dresseur`) dans `data/dresseurs/<kiki|id>.json` (`publier_dresseur`, `ecrire_depot` : l'appli écrit
avec son jeton GitHub, une fois par visite, seulement si ça a changé). `les_joueurs` calcule la partie de chaque joueur côté serveur (`amis.partie` =
`pokemon.charger_jeu` dans son dossier, gardée 10 min ; un joueur en panne est absent) et n'envoie que le jeu (`amis.resume` : position, lieu, badges,
espèces ouvertes, shiny, légendaires, starter, 3 dernières captures ; **jamais** pas, sommeil, cœur, poids) dans `D.joueurs` (soi = `moi`).
Carte : `amisSurCarte` (les autres dresseurs à leurs couleurs, `data-d` lu par `colorerDresseur`) ; **au même endroit** (tout le monde part de Bourg
Palette) : regroupés, côte à côte (toi au milieu, puis droite, gauche…), une seule étiquette par groupe avec les pseudos dans l'ordre, chacun à la couleur de sa casquette, sur la carte comme dans le classement (Kiki, 05/11).
Onglet Dresseur : « Les dresseurs » (`dessinerAmis`, classement badges → espèces → shiny → avancée ; toi avec tes chiffres en direct ; toucher un ami =
Pokédex comparé + ce qu'il a et pas toi + ses dernières captures ; ce que les autres voient est dit sur `accueil_ami`, plus dans cet onglet : Kiki, 03/11). ⚙️ (Kiki) :
« 🔧 Suivi des amis » (`suivi_amis`, `amis.suivi` : dernière récolte, erreurs de Google par message, pas / sport / sommeil des 14 derniers jours).
**Se tirer la bourre (03/11, Kiki)** : classement au nombre d'espèces, puis shiny (même rang si égalité sur les deux) ; chaque ligne : `Kanto · lieu` (`CARTE["region"]`), Pokédex · Shiny · Badges même à 0, écart avec toi, `+N cette semaine` (espèces nouvelles depuis lundi, jour où la ball a été gagnée) ; plus rien sur les amis dans Aventure (Kiki, 03/11 : moche, tout est dans Dresseur) ; **Les nouvelles** (`amis.nouvelles`, 14 jours, 12 par joueur, 10 affichées) : starter (« a obtenu X auprès du Professeur Chen »), badges, légendaires, shiny, évolution du starter, nouveau rare, lieux atteints, jamais les captures ordinaires. Une ball de plus de 14 jours compte comme ouverte aussi ici (liste partagée = 20 jours). Pas encore : bouton « Voir son Pokédex » complet, cadeau du lundi, objectifs adaptés à chacun, dresseurs en vol / surf sur la carte (toujours à pied), `Mon matériel`.
**Plusieurs régions, Johto construit (04/11, carte blanche de Kiki sur les lieux et l'ordre).** `region.py` : `Region` et `Voyage` (règles communes), `kanto.py` et `johto.py` : les données, `regions.py` : la liste. `pokemon.jouer` : le téléphone laisse `…#geste-appel_1_<ms>` à la fin de l'appel du professeur (gardé dans gestes.json) ; la région suivante commence le lendemain à minuit : `cumul` à 0, sac vide, nouvelle `frise`, `carnet` à zéro (donc `poke1` revient : les identifiants restent uniques par le jour), cadeau `orme`. **Avant de toucher à ce moteur : comparer une partie avant / après** (rejeu de profils, 0 différence le 04/11, 32 parties). Rattrapage en région 2 : 25 % d'un Pokémon manquant des régions d'avant, à coup sûr après 8 balls sans (`rattrapage`, Kiki 29/10), et toujours avant le sac. Les légendaires manqués d'une région ne se rattrapent pas (après-jeu). **Johto** : 21 lieux, Ferme avant Rosalia et Jasmine (5e, `Badge Minéral`, image 14) avant Chuck (6e, image 13) pour suivre la carte ; sanctuaires Raikou (Rosalia), Lugia (Tourb'Îles), Entei (Mont Creuset), Suicune (Lac Colère), 5 jours d'exploit ; Ho-Oh à la Ligue, Celebi au diplôme (94 autres). Défis variés, pas de pompes partout (Kiki) : seuls Chuck, Koga et Aldo en acceptent. **Le jour et la nuit** (nouveauté de la région, `MOMENTS`, `moments_du_jour`) : 2 000 pas le matin ou après 20 h rendent ses Pokémon 3 fois plus fréquents ce jour-là (`pas_matin`, `pas_soir` de missions.json). **Écran** : `REG`, `EN_JOHTO`, `CADEAU` en haut du script ; `CHAMPIONS_KANTO/JOHTO`, `CONSEIL_…`, `DUELS` choisis par région ; fonds `j…`, salles `jarene1-8`, `laboOrme`. `ecran_pokemon` n'envoie au téléphone que les Pokémon des régions ouvertes (plus ce qu'un ami en avance a attrapé), la suite reste une surprise. **Passage** (`scenePassage`, `sceneVoyageRegion`, `PASSAGES`, décidé avec Kiki : `PASSAGE-REGIONS.md` du cerveau) : Carnet (lignes cachées si la montre ne les mesure pas, `D.carnet`), générique, dernier plan, appel ; le lendemain : aube, route, première vue, titre, labo. Bandeau « Ton téléphone sonne… » tant que l'appel n'est pas joué. **Aperçus** : 🧪 → La fin de Kanto, L'arrivée à Johto, Voir Johto (`?essais=1&johto=1`, `pokemon.apercu_region`, aucune capture, rien d'enregistré). **Images** : 64 images dans `scenes/` et `cartes/johto.webp` ; personnages détourés par Claude (contour sombre puis GrabCut d'OpenCV, fenêtre par personnage), salles vidées par recopie en miroir ligne par ligne. Texte de chaque image ChatGPT : cerveau (`COMBATS-JOHTO-PROMPTS.md`). **Pas encore** : la durée de Johto réglée sur le vrai rythme (après 4 semaines de vrai jeu), la montre, le professeur de la page Santé (reste Chen), les animations de l'orage et de la neige sur les décors de combat.
**Le début du jeu et le vélo en images (05/11, Kiki)** : `demarrerAventure` -> `sceneDebut` (chambre sans lumière au sol ni tapis, à la demande de Kiki ; village, le dresseur à ses couleurs remonte le chemin ; « Attends ! » au bord des hautes herbes, ✕ saute jusqu'au labo) -> labo -> starter -> `scenePokedex` (après le cadeau `chen` seulement, écran mesuré sur l'image : vrais pas du jour, barre d'effort). `sceneVelo` : `velo-chen.webp` / `velo-orme.webp`. Essais : 🧪. 36 autres images de scènes (sanctuaires, histoire, entrées d'arène, anniversaire) : cerveau, `projets/sante/scenes-plus/`, pas encore branchées. **Le rival, un par région (Kiki, 05/11 ; `rival.py`, `VOIX`, `sceneRival`, `Region.rival` : 4 lieux par région, une fois chacun, `pkm_rival_<partie>_<image>`)** : le vrai rival de la génération avec sa personnalité des jeux : Régis à Kanto, Silver à Johto (sombre, ne plaisante jamais, Giovanni dit à la dernière rencontre), Flora à prévoir à Hoenn (amicale, moquerie gentille) ; une pose différente à chaque image pour les suivants. Moqueur, voulu par Kiki (trois potes de 40 ans) : met le doigt sur les 2 chiffres les moins flatteurs de la semaine (`etat["derniers"]`), montrés au seul joueur concerné ; jamais le poids ; une montre oubliée ne compte pas ; il lui faut 3 jours ; pas de vanne sur le sport sans une première minute dans tout l'historique (`sport_vu`) ; cœur (repos ≥ 70, récupération ≤ 28 ms : « cœur de 70 ans », pour rire) et masse grasse (au-dessus du repère si âge et sexe sont sur le téléphone, sinon seulement sa hausse) demandés par Kiki. Ce ton ne vaut que pour lui.
**Le Pokémon du champion (05/11, Kiki)** : chaque arène a son Pokémon (`arene(…, pokemon=)`, `Region.champions`), confié avec le badge (ball `badgeN`, capture `champion`, « Pierre te confie son Onix ! »), jamais dans une ball ordinaire de sa région (`reserves`), absent des Pokémon du lieu sur la carte ; déjà attrapé avant = l'ancien tirage du type du champion. Kanto : Onix, Stari, Voltorbe, Empiflor, Smogo, Abra, Caninos, Rhinocorne ; Johto : Hoothoot, Insécateur, Écrémeuh, Feuforêve, Steelix, Kapoera, Marcacrin, Hyporoi. Avant : 2 balls à Argenta vidaient les Pokémon Roche, Auguste n'avait aucun Pokémon Feu. Rejeu des 3 parties : 0 différence (captures figées). **Scène** (Kiki, 05/11 : on découvre le Pokémon en le voyant ; essai d'une scène dans la salle avec le champion présent refusé : « pas beau », le Pokémon doit être en grand au centre, à la place du champion) : au badge, il ne se présente plus (sa 1re réplique est dite à l'arrivée, `sceneEntree` ; Kiki 06/11) ; après l'étui, le champion dit sa phrase (`CONFIE`, une par champion, « je te confie mon Pokémon fétiche », jamais son nom), puis l'ouverture habituelle de l'**Honor Ball** (`typeBall`, blanche, bande et anneau rouges, `TEINTES.honor`) dans l'arène vide, sans toucher ni secousses, le Pokémon en grand au centre avec son cri, et seulement alors « Pierre te confie son Onix ! » (`champDe`) ; fiche : « Confié par Pierre ». Côté serveur la ball reste `hyper` (montre inchangée). Essai : 🧪 → Les arènes.
**Les petites scènes (05/11, idées validées par Kiki)** : `sceneRecit` (image, répliques, ✕). `sceneEntree` (champion de dos, `entree-*.webp`, une arrivée écrite pour chacun d'après son image : `ENTREES`, Kiki 06/11, puis de face, `pkm_entree_<partie>_<n>`, à la fin du voyage qui arrive à l'arène ; Ligue : reste de dos) ; `sceneSanctuaire` (`SANCT_TEXTE`, `sanct-*.webp`, avant la ball d'un légendaire de sanctuaire, de la Ligue ou du diplôme ; pas par chance) ; `HISTOIRES` (3 par région, à l'arrivée au lieu, une fois, la dernière seulement si plusieurs ; rien à gagner) ; `sceneAnniversaire`. Une par visite, après le vélo et le rival. Essais dans 🧪.
**Plan de l'audit du 03/11 (validé par Kiki, en ligne le 04/11 ; rapport complet : dépôt privé kiki-cerveau, `projets/sante/AUDIT-2026-11-03.html`, jamais ici : il contient ses données de santé)** : la marche faisait tout le jeu (8 000 pas sans sport : Ligue en 132 j ; muscu presque chaque jour et 2 500 pas : 417 j). **Roue cachée** (`missions.tirer`, `familles_du`, `FAMILLES` : marche, cardio, pousser, tirer, jambes) : mission tirée dans la famille la moins travaillée sur 7 jours, jamais la même famille de force que la veille, jamais 3 jours de force de suite. Le programme « jambes le lundi, bras le mardi » de Kiki, invisible. Missions ajoutées (`materiel` : Kiki seul pour l'instant) : Scarabrute 5 tractions, Otaria 10 min de rameur, Mélofée 10 min de tapis de danse, Roucoups 20 min de vélo (`stats_jour` : `min_rameur`, `min_velo`, `min_danse` ; le type exact du tapis de danse sur la montre reste à vérifier : on cherche DANC ou « danse »). **Depuis le 04/11 (`equitable`)** : plafond muscu 40 points par jour (25 avant), 15 points de muscu = l'objectif du jour (`objectif_gestes`), première fois de la semaine pour chaque famille = +15 (`bonus_famille`), 4 familles = Super Ball `variete`, 4 jours d'objectif = Super Ball `hebdo`. Pompes et squats comptent pour les types (`gestes_pts`), bug corrigé : la muscu donne bien Combat et Acier. **Bilan de la semaine** (`sceneSemaine`, dimanche dès 18 h ou première visite d'après, coupable avec le récap du matin) et ligne « Ta semaine » dans Tes bonus. **Objectifs du jour remontés** (la ligne « Aujourd'hui » de l'audit les répétait : retirée, Kiki, 04/11) : carte, à ouvrir, barre, objectifs du jour, prochains objectifs, dernières captures. Rameur et tapis de danse : plus dans Muscu (Kiki, 04/11 : c'est la montre qui les compte), tuiles dans Santé les jours concernés. **Écran de fin de série** : la série part tout de suite (`garder`, seule la correction part ensuite) ; « Le téléphone a mal compté ? » lève la limite de correction. **Solidité** : GitHub en panne = dernières données connues, ou `ecran_panne` (`lire_depot`, `Panne`) ; récolte à l'ouverture en tâche de fond, 5 s d'attente au plus, puis bouton « Nouvelles données » (`lancer_recolte`, `suivi_recolte`) : jamais de rechargement tout seul (ball ou série en cours) ; bouton retour d'Android géré (`relierRetour`). **Outils cachés** : Tester Kanto, version de détection, apprentissage et envoi des séries avec `?essais=1` dans l'adresse, Kiki seul (`D.essais`). **Tests** : `python -m unittest discover tests` (`tests/test_regles.py`, aussi à chaque envoi sur GitHub). À faire au lancement (seulement quand Kiki le demande, date à venir) : remettre à zéro les records du téléphone (pkm_entr, trop de séries de test fausses), nouvelle partie (`REGLAGES` `debut` + `partie`, aussi pour les amis : l'identifiant de leurs balls change) puis retirer les anciennes règles datées. Plan du premier mois et d'avant le jour 90 : voir le rapport.
**Calibrage (03/11, Kiki seul : ⚙️ → 📊, `calibrage.py` + `ecran_calibrage.py`)** : par joueur et par jour, recalculé depuis les données brutes (survit à un reset) : pas, sport, séances, gestes, points par source, Super / Hyper et par quel chemin, mission, balls sorties. Taux par joueur, joueurs par jour, ratés de peu (≥ 80 % du seuil), missions, CSV. Aujourd'hui et les jours sans données ne comptent pas. Avant un reset : bouton « Garder une copie » (`data/calibrage/partie-N-date.json` : seules les balls sorties ne se recalculent pas). À lire aussi par Claude pour le bilan (`calibrage.journal`, dépôt privé). Dates possibles à partir du 01/11 (règle du sport différente avant).
**Nouveautés en rouge dans 🧪 (Kiki, 06/11)** : **à chaque modification testable, ajouter une ligne à `NOUVEAUTES`** (date, sélecteur des boutons dans `#tests`, ce qui a changé) : ces boutons sont rouges jusqu'au premier toucher (`pkm_neuf_<date>_<sélecteur>_<n>`), 7 jours au plus, et le titre de 🧪 dit combien il en reste.
**Tests et aperçus : Kiki seul (`D.kiki`, 03/11)** : 🧪 Tester Kanto et l'aperçu de la scène du badge ne s'affichent pas pour les amis, le reste du jeu doit rester une surprise. Toute nouvelle scène d'essai va derrière `D.kiki`.
**L'entraînement (03/11, idée de Kiki, `entrainement`, bouton « ▶ Série » à côté de chaque compteur, essais dans 🧪)** : le téléphone compte, dans l'appli, sans rien installer. Pompes : téléphone au sol en paysage, toucher avec le nez (au moins 0,7 s entre deux). Squats : téléphone tenu devant soi en paysage, bras fléchis, capteur, à son rythme. Tractions : téléphone en poche, capteur + voix, presque pas d'écran (Kiki), fin automatique quand on lâche la barre (`impact`) ou après 12 s sans traction ; le bouton « maintiens » retire les 5 s d'avant (sortir le téléphone comptait des tractions). Pompes et squats = **écran de combat** plein écran (`combat` : **ton starter de dos** à sa forme du moment, ses attaques selon son type `ATTAQUES`, adversaire, PV, K.O. puis adversaire suivant ; validé par Kiki : « c'est ce genre de truc que je cherche pour le jeu, pour les boss d'arène »). Décors : **un par lieu, les 20 de Kanto faits le 03/11** (Kiki), `DECORS_COMBAT` {lieu: image, e, c (milieu des ronds de sol, mesuré sur chaque image), te, tc (taille des Pokémon)}, `scenes/combat-<lieu>.webp`, consigne dans `scenes/PROMPT.md` ; lieu sans décor = image de capture du lieu, ronds dessinés ; essais dans 🧪. **Disposition (retours de Kiki, Pixel 7 Pro)** : l'image 3:2 entière, jamais coupée (`.monde`), et une colonne à droite en paysage, dessous en portrait (`.panneau` : PV de l'adversaire juste à côté de lui, « Terminer » discret sous les PV, à maintenir pour les pompes car le nez peut le toucher, compteur, objectif, starter et niveau ; **rien sous le starter** : 64 px libres en bas pour le bouton Manage App de Streamlit). Barre de texte = le récit du combat (attaques, K.O., « Que doit faire Salamèche ? »). **Pas de rythme imposé aux squats** (Kiki : chacun le sien, ni bip ni « Descends / Remonte »). **Squats depuis la v7** : écart entre la vitesse de descente et celle de remontée (`balance` 1,15), sinon « Pas assez bas » : 1er enregistrement de Kiki (`data/calibrage/mouvements/`, 03/11, un seul téléphone) : vrais squats 1,53 à 2,51, petits mouvements 0,59 à 0,96. Abandonnés : distance estimée (un squat lent et profond refusé) et vitesse minimale. Le décalage du capteur ne s'apprend que téléphone calme (v8) : sinon, rien n'est compté au début d'une série. Rejoué sur la série mélangée de Kiki : 8 vrais sur 8, 10 petits refusés sur 10. `capteurMouvement` : pesanteur retirée, vitesse verticale qui s'oublie vite, une vitesse dans un sens puis dans l'autre (retours de Kiki du 03/11 : squats lents non vus par l'ancienne méthode), sensibilité par mouvement ; bouton « Envoyer cette série à Claude » (Kiki seul, `data/calibrage/mouvements/serie-*.json` : capteurs bruts + chaque REP / PEU avec sa descente et sa vitesse) pour régler `s1`, `s2`, `descente`, `vitesse`, `impact` ; chaque série de Kiki est aussi gardée toute seule et part au prochain chargement. `VERSION_DETECTION` affichée à l'écran : à changer à chaque réglage (le téléphone peut garder l'ancienne page), avec mesures/s et plus grand trou. Le 03/11, au combat : grands mouvements non vus au début, puis petits comptés : reproduit en rejouant ses mesures avec moins de mesures ou des à-coups (fausse piste : le vrai bug était l'apprentissage du décalage du capteur, voir v8 ; 44 mesures/s en combat). Gardés : capteurs démarrés une fois le décor prêt, calcul à la moyenne de deux mesures, pas de voix pendant les squats. Flash et secousse remis (v9, Kiki). **La planche (03/11, Kiki : sur l'honneur, option seulement, jamais une mission ni un défi)** : `ENTR.planche`, `chrono`, **la devinette** (`devinette`) : « C'est qui ce Pokémon ? » : silhouette sur le petit rond (placement de l'adversaire), révélée au bout de 6 s avec son nom et son cri, puis la suivante ; image entière et colonne comme au combat ; toucher l'écran = fin. **Ne jamais poser de Pokémon ailleurs que sur les deux ronds du décor** : essais refusés par Kiki : La Pile (empilés sur une planche dessinée, kitsch), Les Spectateurs (tailles ridicules, posés sur les fleurs et les arbres) ; 30 s puis +5, repos 45 s ; trace `geste-planche_<secondes>`, 1 point / 10 s (`bonus_planche`), dans la limite des 25 par jour. Pas de shiny. **Le Coup d'Boule (pompes, 03/11, idée de Kiki, Punch-Out)** : `boule` dans `combat` : l'adversaire remplit l'écran, le nez frappe (étoile à l'endroit du toucher), anneau de PV, compteur géant, starter de face dans un coin, « Plus que 3 ! » à la voix. Tout se lit bras tendus. **Le combat d'arène (03/11, idée de Kiki, `DUELS`, `duelEnCours`, essais « Arène : … » dans 🧪)** : arrivé chez un champion qui accepte les pompes (Pierre, Koga, Giovanni, Aldo, Agatha), le Coup d'Boule se joue dans sa salle (image vide ; la Ligue n'en a pas : haut de la salle), contre ses vrais Pokémon, le champion n'est plus qu'un petit rond à son portrait en haut à droite, au-dessus du compteur (`.champ`, Kiki, 05/11 : le personnage à gauche ne servait à rien) ; l'écran de réglage de la série vise ce qu'il reste pour le battre ; ses PV = les pompes de son défi réparties entre ses Pokémon, déduits des pompes déjà faites : rien à garder, repris d'une série à l'autre. Dernier K.O. = fin de la série, le badge vient toujours du défi : défi gagné au téléphone (`defiGagne`) = « J'ai fini » annonce le badge, recharge avec `?frais=1` (relit les fichiers sans attendre le cache) et la scène se lance seule (`pkm_badge_auto`) ; sinon bouton « Recevoir mon badge » sur la carte du défi. Pas de shiny pendant ce combat. Kiki : très bonne idée d'avoir une animation par boss, mais **pas des pompes partout, à varier selon le champion** (Pierre oui ; Ondine non, « la fille de l'eau, c'est pas la force » : défi changé, combat à inventer plus tard). **Adversaires et shiny du combat (03/11, idée de Kiki)** : `adversaireDuLieu` (lieux atteints seulement, 8/10 le lieu actuel, rares moins souvent, jamais son starter ni un légendaire ; visuel, n'attrape rien). `shinyDuJour` : 1 chance sur 30 par jour, tirée sur la date, 2 × l'objectif (20 PV au moins), reste jusqu'à minuit, ses PV se gardent d'une série à l'autre (pompes et squats, `pkm_shiny` sur le téléphone) ; battu = trace `geste-combatshiny`, +1 jour sur la barre de Shiny Ball (`jouer`). Seules les répétitions faites au combat comptent. Pas encore pour les tractions (voix à prévoir). **Apprentissage (`apprentissage`, Kiki seul, bouton sur l'écran de réglage de la série)** : guidé à la voix, enregistre les capteurs bruts à ~30 mesures par seconde, avec les phases (vrais squats, rapides, tout petits, téléphone bougé) ; recharge l'appli, qui range dans `data/calibrage/mouvements/` (branche data) : à relire pour régler. Squats : `separe` = l'accélération sans pesanteur du téléphone (`acceleration`), car l'inclinaison passait pour un mouvement (1 cm comptait, à tout réglage). Veille bloquée dans ce mode (`allume` : wakeLock de la page haute, du cadre, sinon vidéo muette), plein écran et paysage si possible (Android). Sport d'abord : objectif = mission ou dernière série + 1, repos de 90 s, correction du compte à la fin. Chaque série = une trace `geste-` (missions, défis, points). **Pompes et squats : plus de boutons pour entrer un score** (Kiki, 03/11), seulement +1 / −1 en fin de série, 5 d'écart au plus (`CORRECTION_MAX`) ; les tractions gardent leurs boutons et une correction libre tant que leur détection n'est pas réglée. `pkm_entr` (téléphone) : dernière série, record, sensibilité.
**Équité entre les montres (03/11, carte blanche de Kiki, à partir du 04/11 : `pokemon.equitable`)** : Kiki = Pixel Watch (tout) ; Berta = Apple Santé sur iPhone (pas, distance, étages, calories, cœur toutes les 5 min, ni minutes de sport, ni séances, ni sommeil) ; Matt = Galaxy Watch par Google Fit et Health Connect, mal configurée, à revoir avec lui (surtout les pas). **Le sport estimé par le cœur** quand Google ne donne pas les minutes (`missions.sport_coeur`, `avec_coeur`, gardé dans missions.json : relevés ≥ 132 bpm × écart entre relevés, 5 min au plus ; à 1 min près du chiffre officiel de Kiki sur 14 jours). **Refusé par Kiki : bouton « j'ai fait 10 min de sport » sur l'honneur.** **La marche n'est plus une séance** (`est_marche` : Google Fit détecte 173 min de « marche » pour 3 757 pas, et ses pas comptent déjà). **Les étages ne donnent plus de points** (certaines montres ne les comptent pas ; ils restent une voie chez Pierre et Agatha). Les minutes à 100 pas/min ne sont pas fiables sur iPhone (pas livrés par paquets). Pesée du matin : +10, 3 par semaine au plus (30 points, dès le 04/11). **Mais le jeu se calibre d'abord sur Kiki (03/11, sa décision : « je l'ai fait pour moi », refaire du rameur et varier les activités) : les données partielles des amis ne doivent pas gâcher son expérience ; pour eux, certains objectifs seront faciles, d'autres pas, tant pis. Nuit de 7 h inchangée.**
**Missions refaites (03/11, avec Kiki, `missions.py`, à partir du 04/11 : `NOUVELLES`)** : 12 missions avec un Pokémon (`num`), 20 à 40 points (`bonus`), une petite phrase : Doduo 3 000 pas en 60 min d'affilée (`max60`), Triopikeur 1 000 pas dans 3 heures (`h1000`), Nosferapti 2 000 pas après 20 h, Lokhlass 6 km, Dodrio 12 000 pas (week-end), Spectrum (son toi d'il y a 7 jours, 4 000 au moins), Rattata (moyenne + 20 %), Mackogneur 20 pompes, Tygnon 3 × 10 pompes à 30 min d'écart (`series_de`), Kangourex 50 squats (nouveau bouton), Ponyta 15 min en jaune, Tauros une séance de 20 min. **Tirage au hasard** (`tirer`, propre à chaque joueur), jamais une des 5 derniers jours ; **sans changement de mission** (Kiki : on pourrait retomber sur une mission déjà faite ; à revoir après le test). `possible` n'offre que ce que la montre mesure : Spectrum et Rattata = 14 jours de données, Lokhlass = distance fiable (`DISTANCE_FIABLE`, 0,65 m par pas au moins), Ponyta = zones, Tauros = 3 séances de 10 min sur 28 jours (`SEANCES_VUES`). **Refusé par Kiki (04/11) : faire compter moins les pas du quotidien** (ça ferait fuir les gros marcheurs). Écarté après rejeu des vraies journées (04/11) : Super Ball par la muscu (presque aucun effet). À refaire après 4 semaines de vrai jeu. Jamais de sommeil ni d'horaires de bureau, jamais de gainage (Kiki) ni d'étages. Les 4 anciennes (`ancienne`) restent pour rejouer les jours d'avant à l'identique : à retirer avec le reset. **Paliers (04/11, Kiki : 30 pompes pour une première fois, c'est trop ; `PALIERS`)** : Mackogneur 10 → 15 → 20 pompes, Kangourex 20 → 35 → 50 squats, Scarabrute 2 → 3 → 5 tractions : le premier palier au-dessus de la meilleure journée des 28 derniers jours (`meilleure_journee`), donc retour au début après une longue pause ; Tygnon seulement après 20 pompes en un jour (`TYGNON_APRES`). Points selon le palier (`PALIER_BONUS`, `bonus_de`) : 20, 25, 30 ; Tygnon 40 : la première fois reste bien payée, et progresser rapporte plus.
**Kanto en prélude, Pokémon étalés sur tout le jeu (05/11, Kiki ; prime sur les passages plus anciens de ces notes : tailles de carte, plans B, Pokémon de Kanto, niveaux du starter).** But : Kanto = un prélude, 2 mois au plus, pour découvrir vite qu'il y a d'autres régions ; une région ne dure presque jamais plus de 3 mois ; les favoris de la génération 1 se gagnent sur toute l'aventure. Kanto : carte de 2 000 points, 74 sauvages + starter + légendaires ; les 72 autres sont dans `kanto.POUR_PLUS_TARD` (région -> Pokémon, vérifiés sur les vrais jeux : liste complète et scripts dans le cerveau, `projets/sante/disponibilite-pokemon/`, source Bulbapedia, CC BY-NC-SA, à créditer) : **à placer en construisant chaque région**. Johto : carte de 2 500 points, 113 sauvages dont 19 de Kanto. Plans B ÷ 2. Barre de 100 points inchangée : le rythme de gain des balls ne bouge pas. Mew et Celebi restent les diplômes de leur liste. **Le champion laisse passer** après `arene_max` jours actifs à son arène (3 à Kanto, 4 à Johto ; jour actif = 2 000 pas, `region.JOUR_ACTIF`). **Le vélo** (joker du joueur en retard, automatique, sans choix : il faudrait l'enregistrer côté serveur et personne n'a intérêt à refuser) : `Voyage.avancer`, au 30e jour d'une région, en retard sur une carte faite en 60 jours : chaque jour actif compte double sur la carte, 45 points au moins ; `Voyage.bonus` compte ces points ; aucune ball en plus ; scène `sceneVelo` (image neuve à faire sur ChatGPT quand Kiki aura du crédit), `red_bike` aux couleurs du dresseur sur les routes. **Le starter** : `pokemon.pts_niveau(region)` = un 36e de la carte, niveau calculé avec `Voyage.bonus` : forme finale garantie avant la fin de la carte (la position ne dépasse jamais points + bonus) ; nouveau starter à chaque région. **La relance** (idée de Kiki) : 5 jours de suite sans objectif du jour (montre oubliée et jour en cours ne comptent pas) = pendant 7 jours un objectif réduit, moyenne de ses pas + 20 %, entre 2 000 et 5 000, ou 5 min de sport ; réussi : le jour compte, Poké Ball `reprise` ; une fois tous les 14 jours au plus. L'Infirmière Joëlle le dit au récap du matin, sans reproche (`G.relance`), carte « Objectif de reprise ». **Refusé par Kiki : une ball pour 2 000 pas** (trop facile). **Mon matériel (05/11, Kiki)** : carte du dresseur, rameur, tapis, vélo, barre de traction (`missions.MATERIELS`), publiés avec le pseudo et les couleurs (`amis.dresseur_du_telephone`, `data/dresseurs/`), lus par `montre.py` pour tirer la mission du lendemain. Rien de réglé : tout pour Kiki (l'appli est faite pour lui, il corrige au besoin le type d'une séance dans Google Health), rien pour un ami. Chez un ami, rameur, tapis et vélo demandent aussi que sa montre donne ses séances. Défis : une voie sans son matériel n'est plus montrée (`DEFI_MATERIEL`, eau et tractions) ; toutes restent valables. Vélo : 20 min ou 6 km (`VELO_KM`), `km_velo` seulement si la montre donne la distance (pas toujours en extérieur). **Chaque joueur a sa liste de Kanto** (`kanto.variante`, `SURPRISES`, `NB_SURPRISES` = 6, tirés sur son identifiant et la partie, `Voyage.pokemon`) : 6 Pokémon de plus parmi ceux gardés, jamais les starters, et 6 de moins, qui reviennent ensuite (rattrapage de Johto). But : ne pas finir Kanto avec exactement le même Pokédex. **Fidélité aux jeux à peu près seulement (Kiki, 05/11) : on peut s'arranger avec les lieux ; une seule règle absolue, jamais un Pokémon d'une génération future** (test). Starter : tirage laissé au hasard, jamais truqué (Kiki). Tirages truqués seulement en dernier recours : à faire en construisant les régions de la fin, pour un Pokémon manquant dont c'est la dernière région (liste dans le cerveau). **Génération (Kiki, 05/11 ; changé le 06/11)** : « Génération N » à la capture et sur la fiche **dès le premier Pokémon, Génération 1 comprise** (`genDe` ; Kiki a changé d'avis : avant, seulement après un Pokémon d'une 2e génération). Pastilles Gén. dans le Pokédex (`filtreGens`, une ou plusieurs, Toutes) seulement dès qu'on a 2 générations ; une pastille par génération attrapée. Essais dans 🧪 : Recevoir le vélo, Récap de relance. Plan, simulations par profil et risques (arènes qui pèsent moins, peu de Pokémon pour les joueurs peu actifs) : cerveau, `projets/sante/PLAN-ETALEMENT-POKEMON.md`. À refaire après 4 semaines de vrai jeu.
**Calibrage du jeu (audit du 02/11, carte blanche de Kiki, partie 4)** : simulations sur 6 profils, chaque réglage testé
(simulateur non gardé dans le dépôt ; à refaire : profils de joueurs + `pokemon.jouer`). Le jeu doit favoriser celui qui
s'implique et le sport, jamais celui qui traîne ; **ces règles priment sur les passages plus anciens ci-dessous** :
- **Captures** : seulement dans les lieux atteints, jamais à venir (`tirer`, `part_lieu` = 80 % lieu actuel, sinon rattrapage).
  Pokédex impossible à finir avant le Plateau Indigo. Plus de garde-fou ni de pioche dans tout Kanto.
- **Plus rien de nouveau** : `sac` = 3 balls attendent le lieu suivant, les autres = **chasse aux shiny** (`chasser` : 3 %,
  +3 % par raté ; raté = capture `rate` : le Pokémon s'enfuit, hors Pokédex et hors montre).
- **Arène** : dès le lendemain de l'arrivée (`defi_grise`), Super / Hyper / mission retenues et grisées, Poké Balls sans rien
  de nouveau en attente sans chasse ; victoire = tout se débloque dans la journée, le champion rend `rend` = 3 derniers jours,
  le reste est perdu. **Défis refaits le 02/11 (Kiki)** : un exploit par champion, à son thème, faisable vite, cumulé ou meilleure journée depuis
  l'arrivée (`kanto.DEFIS`) ; **jamais de sommeil ni d'heure de coucher** (amis infirmiers de nuit) ; une autre voie (pompes, tractions) quand il
  faut du matériel ou un escalier (`_o`, `voies`) : Pierre 35 étages en une journée (03/11 : cumulés, ils venaient tout seuls, 11 par jour chez Kiki ; 40 pour Agatha) / 30 pompes, Ondine 20 min de rameur ou de natation / 5 km en une journée (03/11, Kiki : la fille de l'eau, pas la force), Major Bob 15 min de sport
  en un jour, Erika 8 000 pas en un jour, Koga 2 000 pas après 20 h (`pas_soir` de missions.json) / 60 pompes, Morgane une séance de 20 min, Auguste 30 min de sport en
  un jour, Giovanni 20 min de muscu / 80 pompes / 25 tractions ; **Ligue = 5 épreuves dans l'ordre qu'on veut** (`epreuves` : Olga, Aldo, Agatha, Peter, Régis). Plan B plus
  long pour tous (6, 6, 7, 7, 7, 8, 8, 9, 10 jours), jour d'exploit = 2, **journée à 3 000 pas = 0,5** (`kanto.PAS_PETIT`, 03/11 : à 4 000 pas sans sport, on restait bloqué à vie chez Pierre ; simulation sans sport ni pompes, Ligue en 143 jours à 9 000 pas, 237 à 5 000, 361 à 4 000, 478 à 3 000 ; à 2 500 pas, seuls les pompes ou les étages font passer Pierre).
- **Pompes et tractions** (02/11, Kiki) : la montre ne les compte pas. Boutons (onglet Muscu, `blocGestes` sur la mission et la carte du défi) : déclaratif. Chaque toucher = une trace `…#geste-pompes_10_<heure>` dans la liste partagée,
  recopiée par montre.py dans `data/pokemon/gestes.json` (`pokemon.gestes_du`) ; donnent aussi des points (`bonus_pompe`, `bonus_traction`, `bonus_gestes_max` = 25 / jour). Points et défi serveur à la prochaine actualisation.
- **Légendaires** : `kanto.SANCTUAIRES` (Électhor, Artikodin, Sulfura : 5 jours d'exploit depuis qu'on l'a atteint, jamais
  bloquant, marque sur la carte), Mewtwo = Ligue, Mew = diplôme (146 autres), toute petite chance d'un oiseau par ball
  (`legende_chance` 0,1 / 0,25 / 0,5 %, tirée une fois par ball, une par région : environ 3 parties sur 10). Sanctuaire dont on a
  déjà le légendaire = Shiny Ball. Liés à la carte, pas au calendrier (sinon le retard s'accumule d'une région à l'autre).
- **Shiny Ball** (nouvelle, or + étoiles) : 25 jours sur 30 (à la place de la Master Ball) : shiny garanti parmi les déjà
  attrapés, jamais un légendaire, s'ouvre même pendant un défi.
- **Hyper Ball donne aussi la Super Ball** (`super_ok`) ; `pas_offerts` = 1 000 ; **Kanto = 7 000 points**, Route 1 à 100.
- **Ouverture** : 4 secousses pas toujours rares (1 ball ordinaire sur 4, `hachage`) ; légendaire de sanctuaire / Ligue /
  diplôme : `presage` (assombri, tremblement, silhouette, cri du dépôt PokeAPI/cries) ; raté de chasse (`enfuite`). **Légendaire
  par chance** (retour de Kiki, 02/11) : aucun indice avant l'ouverture, ouvert dans le décor du lieu actuel, puis `pensee` : boîtes de
  dialogue et fondu vers son sanctuaire (le Pokémon posé sur le rond de ce décor), fondu retour, résultat.
- Labo : plus de rond autour des balls, leur lumière est un `drop-shadow` de l'image (elle suit le saut).
- **Fin de région** : après la Ligue, plus de sac : tout sert à finir Kanto (manquants, puis chasse) ; mot de Chen ; région
  suivante = sac vide, barre à 0 (à faire avec Johto, comme le 25 % de rattrapage).
- Une ball qui attend n'est pas une capture : elle garde le jour où elle a été gagnée (identifiant, graine), `c` = moment où
  elle sort. Tests dans « 🧪 Tester Kanto » (cartes grisées, sac et chasse, légendaire surprise, Shiny Ball, ball ratée).
  Simulation à ce rythme, sans viser le champion / en le visant : Kiki 142 / ~103 jours pour la Ligue, sportif 77 / ~72, très
  sportif 46, débutant 375 / ~243 (point faible : objectifs adaptés à chacun à faire avant d'inviter les amis).
  Montre : pas encore à jour (Shiny Ball montrée en Master Ball, ratés masqués).
**La ball en pixels, validée par Kiki (02/11)** : `Ball3D` = un vrai volume dessiné comme un sprite (aplats, contour sombre, plus de reflet : Kiki, 02/11), `PIXEL_BALL` points de diamètre ; plus de ball lisse. Les petites balls (à ouvrir, route) = le sprite du jeu, comme le reste de la page (`spriteBall`, Kiki, 05/11) ; `imageBall` et `ballSVG` seulement pour l'ouverture sans three.js.
**Les Pokémon en pixels (02/11, Kiki)** : capture, silhouette de légendaire, fiche et évolution = sprites du jeu (`IMG.grand` : Émeraude jusqu'au 386, puis Platine, Noir et Blanc, images de base ; normal et shiny, vérifiés fichier par fichier) ; à la capture, recadré (`rogne`), agrandi sans lissage, pieds sur le rond (`--pkw`, `--pky`). Plus de grande illustration à l'écran (`IMG.hd` = repli de l'évolution seulement).
**La fiche du Pokédex = la carte de TON Pokémon (`fiche`, 02/11, Kiki : « où le trouver » ne sert à rien une fois attrapé)** : date, ball, lieu, nature (`NATURES`), taille et poids individuels (±15 %, `hasard`, tirés de l'identifiant de la capture : toujours les mêmes pour lui), catégorie et description ; onglets Normal / Shiny seulement si on a les deux. Tout est stocké dans `pokedex.py` (`FEMELLES`, `TAILLES`, `POIDS`, `CATEGORIES`, `DESCRIPTIONS`, à compléter à chaque région), plus aucun appel en ligne. **`DESCRIPTIONS` = nos propres textes, à écrire pour TOUS les Pokémon du jeu au fil des régions (151 faits ; Kiki, 02/11)** : le clin d'œil au sport doit rester drôle, de bon goût ou bien trouvé, jamais ringard, et pas dans chaque texte ; pas de « il / elle » si on peut l'éviter ; jamais les textes des jeux Pokémon, protégés, dans ce dépôt public. Plus de sexe (Kiki, 06/11 : « ça ne sert à rien »).
**Portraits** (`cadreTete`, 05/11, Kiki) : les yeux et le nez au centre du rond : `VISAGES` = milieu et largeur du visage de chaque champion, mesurés sur son image (les règles automatiques se trompaient : mèches, lunettes, moustaches) ; **tout nouveau champion est à mesurer ici**, sans mesure : cadrage automatique par la peau, moins précis. **Évolution** (`sceneEvolution`, `lumieresEvo`) : noir, lumières qui convergent, silhouettes qui s'échangent de plus en plus vite, silence, éclair, nouvelle forme dans un ciel à bandes ; sprites du jeu, pas de rayons. **Le badge qui se range** : l'arène s'efface (`voile-etui`), étui vu de dessus, à plat, couleurs de l'appli, placé entre le haut et la bulle.
**Direction artistique : une GBA moderne, partout (02/11, Kiki, d'après l'écran de combat)** : une seule police **Jersey 15** (`font-size-adjust` pour rester lisible, jamais de faux gras : le gras se dit en couleur) ;
**boîtes crème** `#F8F8E8` à bord `#484838`, coins `12px 5px`, ombre dure `3px 3px 0` ; encre `#383828`, secondaire `#686850`, accent `#C03028` / `#B05010` ; barres : PV vert `#48C868`, EXP bleue `#40A8F8`, objectif atteint or `#F8C838` ; boutons rouges `#D83830` avec ▶ ;
fond bleu nuit rayé `#22315A`. Thème : bloc « LA DIRECTION ARTISTIQUE » de `pokemon_ui.html`, `THEME` dans `STYLE_FICHE`, premier bloc de style de `app.py`. Toute nouvelle carte suit ça, sans fioritures : simple, clair, lisible.
**Interface (02/11, carte blanche de Kiki) : l'appli est le jeu, plus de séparation Santé / Pokémon.** Barre du haut `.nav-jeu`
(HTML écrit par `app.py`, clics écoutés par `relierNav` dans le jeu, aucun rechargement) : **Aventure** (son starter, Pikachu avant ; carte, à ouvrir,
barre, objectifs du jour, prochains objectifs, 4 dernières captures ; pastille = balls à ouvrir), **Pokédex** (icône dessinée), **Muscu** (Mackogneur), **Dresseur** (son visage, à ses
couleurs ; Mon dresseur, place des amis et du classement, Comment ça marche, tests), **Santé** (Leveinard ; l'**écran de combat** du haut est retiré le 05/11, carte blanche de Kiki : mêmes chiffres dans Aventure et dans les rubriques ; la page s'ouvre sur le bilan ; ce qui suit, pour mémoire : pas / sport (`zone_sport`, les mêmes minutes que le jeu : Kiki, 03/11, « En zone » de Google le perdait, gardé seulement en tuile « Zones Google ») / sommeil en barres de PV
à la façon GBA ; analyse signée du **professeur de la région** `PROFESSEUR`, portrait pris dans son labo ; rubriques, graphiques ; **illustrés par des Pokémon de Kanto, gifs showdown** : Doduo pas, Ponyta zone,
Ronflex sommeil, Tauros activité, Rondoudou sommeil, Leveinard cœur, Grolem poids, Kadabra coach ; `fermerBulles` : les bulles de graphique se
ferment en défilant, en touchant ailleurs et en changeant d'onglet). Ordre des onglets (Kiki, 03/11) : Aventure, Muscu, Santé, Pokédex, Dresseur. `st.container(key="page_jeu" / "page_sante")`, l'une repliée
par `body.page-sante` (height 0 et pas display:none : largeur des graphiques, jeu qui tourne). Page de démarrage : Aventure.
**Objectifs** : défi, mission, Super et Hyper en grand ; Shiny, Nuit, Pesée, Sanctuaire, Chasse dans la liste « Tes bonus » (`.suivi`, même dessin que « Tes prochains objectifs », les petites tuiles déplaisaient à Kiki, 03/11), toucher = détail sous la ligne.
**Onglet Muscu (03/11, carte blanche de Kiki : pompes, squats, tractions, planche étaient cachés derrière une petite tuile)** : `dessinerMuscu` ; **annuler (Kiki, 04/11)** : « Annuler ma dernière série » sur la carte et « C'était un essai : ne pas compter » en fin de série, au deuxième toucher (`confirmerDeuxFois`, `annulerSerie` : une trace négative, le record d'avant revient) ; le capteur des squats se règle pendant le décompte de 8 s (`avance`, v12). 4 grandes cartes (Pokémon, compte du jour, record, ▶ Lancer → `entrainement`). **Tractions : −1, +1, +5 seulement, boutons rouges comme ▶ Lancer** (Kiki, 04/11 : la détection marchait mal, plus lancée nulle part ; son code reste dans `entrainement`, inutilisé), points du jour sur 25, étiquette Mission / Arène.
**La danse au doigt (04/11, carte blanche de Kiki : un clin d'œil, « un petit truc fun »)** : `danse.js` (inclus dans `pokemon_ui.html` par `ecran_pokemon.py`, marque `/*__DANSE_JS__*/`), `danse()`, carte `exo-danse` dans Muscu, pour tous les joueurs. **1 point d'effort par jour, pour le premier morceau fini** (`bonus_danse`, trace `geste-danse` ; Kiki, 04/11) ; **classement** par morceau et par difficulté, à la fin et depuis le menu (`dessinerClassement` ; trace `danse-<morceau>-<difficulté>_<millièmes>_<moment>` à chaque record, gardée dans `gestes.json` → `scores`, `pokemon.meilleurs_scores`, `amis.resume` → `danse` ; les scores des autres arrivent à l'actualisation) ; l'écran de fin donne envie d'un vrai tapis. 4 morceaux, 4 difficultés (`DANSE_NIVEAUX`), 3 vitesses, flèches tenues, 2 doigts au plus en même temps, comme les 2 pieds sur un tapis (aucun morceau n'en demande plus), réglage du son (`reglerSon` : bip sans repère visuel, médiane des écarts ; `pkm_danse` sur le téléphone : calage, niveau, vitesse, records), correction proposée en fin de partie. Combat (idée de Kiki, 04/11 ; `DANSE_CHANSONS`) : chaque musique a son dresseur (Sbire Skull, Nikolaï, Zinnia, Red), ses 3 Pokémon, K.O. à 65 % des points (`DANSE_VICTOIRE`), son décor `scenes/combat-danse-<cle>.webp` (ChatGPT, ronds mesurés) et son effet animé (`danseEffet` : **ce qui doit bouger n'est jamais dans l'image**, Kiki : la pluie figée, c'est moche). Bonus à part de l'aventure : ces Pokémon n'entrent pas dans le Pokédex et aucune région n'est nommée. **Droits** : musiques originales (Game Freak), pas du pack « The Pokémon Minipack » de Starmen91, sans autorisation de redistribuer : dépôt privé, branche `danse` (`danse/<cle>.mp3`, `.sm`), **jamais ce dépôt public** ; `danse.py` les lit et les sert aux seules personnes connectées par des `st.audio` cachés (`st-key-danse`), dont le téléphone prend l'adresse. Accord de Kiki, en petit cercle ; à revoir si l'appli s'ouvre plus largement. Essai sur tapis USB (Gamepad API, Chrome, hors de l'appli) : `Bureau\essai-danse\essai-danse.html`, sur les morceaux StepMania de Kiki, qui ne quittent jamais son PC ; le tapis n'est pas encore branché au jeu.
**Carte** : loupe en bas à droite (`carte-zoom`, toute la carte / retour au dresseur, à la demande).
**Pokédex** (`dessinerDex`) : **un seul, sans total ni silhouette** (seules les captures, surprise voulue par Kiki : à la fin de
Kanto on doit croire le jeu fini, **aucun texte ne parle de la suite**) ; appareil rouge avec écran (dernière capture, nombre d'espèces),
rang (`RANGS`) qui donne un but sans dévoiler le total, shiny / légendaires / types, cartes aux couleurs du type ; filtres : tous,
shiny, légendaires, types (repliés), tri récents / n° ; pas de filtre par lieu. `REGIONS` : boutons de région à partir de la 2e.
**Texte façon jeu** : police **Jersey 15** (Pixelify gardée pour les grands titres, trop peu lisible en petit) ; `dialogue.dire`
pose toute la phrase avec ses lettres cachées puis les dévoile : plus de mot qui change de ligne en cours d'écriture.
**Page Santé (02/11, carte blanche de Kiki : de vraies stats, agréables à regarder)** : rubriques en cartes colorées (`st-key-rub_*`) ; tuiles avec tendance en couleur (`SENS` : vert si c'est mieux) et
mini-courbe des 3 dernières semaines (`mini_courbe`) ; `carte_nuit` (Pierre Lune → Pierre Soleil, phases en bande) ; `carte_pouls` (chiffre et repère, plus de cœur qui bat : Kiki, kitsch) ; `curiosite_denivele` (en Onix), `poids_en_pokemon` (poids officiels) ;
statut façon combat dans le bilan (EN FORME, CORRECT, À MÉNAGER), observations en bulles ; graphiques `_style`. Écran de combat et rubriques sur le même fond uni, **pas de trait de couleur** sur les boîtes (Kiki, 02/11 : pas beau) ; une seule tuile poids, masse grasse, IMC, évolution et poids en Pokémon (`une-tuile`) ; légende du sommeil sur une ligne au-dessus du graphique (`leg-sommeil`). **Jamais le même Pokémon à côté** : écran de combat Doduo, Ponyta, Ronflex ; rubriques (image fixe, sans cadre) Tauros, Rondoudou, Leveinard, Grolem ; coach Kadabra ;
bilan Soporifik, Hypnomade, Mélodelfe, Rattata, Machoc, Psykokwak, Ramoloss, Mackogneur, Alakazam. Toutes les mesures restent affichées.
**Bilan santé autonome (`bilan.py`, 02/11, pour tous les joueurs, sans IA ni compte Claude)** : règles calculées sur les vraies
données : observations par thème (sommeil, coucher, récup, pas, sport, assis, poids, oxygène, habitudes personnelles sur 90 jours),
comparées aux repères et à la moyenne du joueur ; 3 cartes au plus (4 pour une période), un thème chacune, ce qui vient d'être dit
s'efface (`_choisir`) sauf l'important, habitudes un jour sur 4, un conseil qui pousse saute si le cœur dit le contraire ; un
Pokémon par thème. Affiché dans Santé (`carte_bilan`), l'ancien coach Claude reste en plus pour Kiki seul. Une journée à 25 min d'effort intense ou plus est nommée (« Grosse séance », jamais noyée dans le total sur 7 jours) ; une récupération moins bonne la nuit d'après est reliée à cette séance, sans alerte (Kiki, 05/11). La montre ne dit pas quel sport c'était (son paddle = « Sport ») : on dit « séance ». À affiner ici, pas dans une IA.
**Profil du joueur (date de naissance, taille, sexe, carte du dresseur, facultatifs)** : **gardés sur le téléphone seulement** (localStorage
`pkm_dresseur`), relus à l'ouverture par `streamlit_js_eval` (`bilan.lire_profil`), jamais écrits sur un serveur (autre téléphone = à ressaisir).
Servent au bilan : IMC (repère neutre, alerte seulement si perte de poids sous 18,5), maximum cardiaque théorique (Tanaka, ou Gulati pour
les femmes), repères de masse grasse (Gallagher 2000), équilibre à 65 ans, tuile IMC. Ils ne changent pas les objectifs du jeu.
**Le starter, vrai objectif (02/11, idée de Kiki)** : un niveau tous les 195 points d'effort (`pokemon.niveau`, part du niveau 1), évolue aux niveaux 16 et 36, sans autre condition
(`evolutions`, 2 925 et 6 825 points : la 2e toujours avant la fin de la carte, à 7 000) ; ses évolutions ne sortent plus des balls (`reserves`), capture `#evo1/2`, ball `evo`, jamais montrée
à la montre, scène `sceneEvolution`, carte `dessinerStarter` dans Dresseur seulement (niveau et points jusqu'au suivant, « Monte au niveau N ! » le jour où il en gagne un, `niveauDuJour` ; plus jamais sur Aventure, Kiki, 04/11 ; **l'évolution reste une surprise** : ni silhouette ni compte à rebours, Kiki, 03/11), icône d'Aventure = sa forme du moment. Dans une autre région : icône = starter de cette région.
**Shiny Ball d'anniversaire** (voulue par Kiki : 2e exception au « jamais de Pokémon offert », une par an, `pokemon.jours_anniversaire`) : l'appli voit
que c'est le bon jour (profil du téléphone), la ball existe aussitôt, et le téléphone laisse `<jour>…#demande-anniv` dans la liste partagée
(`ouvertes.json`, sans changer le script) pour que montre.py la fige. La date exacte n'est donc connue du dépôt que par ce jour-là.
**Le coach Claude (crédits Claude) est retiré de l'écran pour l'instant** (Kiki, 02/11 : volet et bouton 📋 ; `coach()` reste prête, à remettre pour Kiki seul, `if not AMI`) ; il reste le bilan autonome, signé du professeur.
**Tes prochains objectifs** (`prochainsObjectifs`, sous les objectifs du jour) : les 3 buts les plus proches parmi ce qui existe déjà (champion, lieu, rang, sanctuaire, Shiny Ball), aucune règle en plus ; jamais l'évolution (une surprise). Poké Ball de la barre et Shiny Ball des objectifs **en pixels** comme la Super et l'Hyper Ball (`IC.sball` = la Poké Ball du jeu recolorée en or + étoile, dans le code).
**Récap du matin** (`sceneCentre`, `D.matin`) : première visite du jour, 3 bulles au plus de l'Infirmière Joëlle : la nuit, hier
(`etat["hier"]`), puis le défi du champion ou `bilan.conseil_du_jour` ; la machine de soin seulement après une bonne nuit ;
coupable dans Dresseur (`pkm_recap_non`).
**Feuille de route du jeu** (01/11 : multijoueur, ratés de capture, stats du dresseur en coches, talents de Ligue, une
nouveauté par région, ~2 ans) : `FEUILLE_DE_ROUTE.md`, à lire avant de toucher au jeu.

- `app.py` : une seule page qui défile, sans la barre Streamlit du haut ni titre (CSS) ; la barre d'onglets est décrite plus
  haut (Interface) ; conteneur `outils` caché, ses boutons touchés depuis le bas de Dresseur : **« ⚙️ Paramètres »** (fenêtre Configuration : données brutes, oublier ce téléphone)
  ; **« 🔄 Synchroniser »** (le « 🔄 » de ces notes) : un seul bouton, toujours en bas à gauche (`bouton_synchroniser`, Kiki, 05/11), un point quand de nouvelles données attendent. Le récap du matin se règle sur la carte du dresseur. **Récolte à chaque ouverture, pour tout le monde** (Kiki, 03/11 ; `recolte_ouverture` : une par session, 5 min au moins entre deux par joueur, 30 s d'attente au plus). **Mobile d'abord** : jamais de défilement horizontal (tout passe à la ligne), et rien
  d'utile dans le coin en bas à droite (bouton « Manage app » de Streamlit, ~1 cm) : marge de 64 px en bas des calques. Filtre en haut : Jour / 7 jours
  / Semaine / Mois / Année + date et ◀ ▶. En haut, l'analyse du coach (repliée) et un bouton 📋 qui copie
  le dossier du coach sans l'afficher ; puis Activité, Séances, Sommeil, Cœur, Poids. Les chiffres viennent des **résumés annuels** (`data/resume/AAAA.json`,
  `stats_jour`), donc l'année entière se charge vite ; les fichiers du jour servent aux courbes de la vue Jour.
  Comparaison : 7 jours d'avant (vue Jour) ou période précédente de même longueur. Minutes en zone = officielles de la
  Pixel Watch (portée depuis le 19/10 ; ses minutes cardio / pic sont DÉJÀ doublées par Google : ne pas les redoubler,
  bug corrigé le 01/11), sinon zone modérée ×1 + intense/pic ×2 (Inspire HR). `zone_sport` = minutes en zone intense
  ou maximum (jaune / rouge, dès 132 bpm chez Kiki = 60 % de la réserve cardiaque), une fois chacune : c'est ce que
  compte le jeu depuis le 01/11. Pixel Watch en plus :
  étages, dénivelé, SpO2 de la nuit (moyenne, plus basse, courbe).
  Objectifs dans `OBJECTIFS` (5 000 pas, 10 min de sport, 7 h de sommeil). Fichiers gardés 2 min (récents) ou 1 h.
  🔄 (Santé et Pokémon) = `actualiser()` : appelle le script Google (secrets `SCRIPT_URL`, `SCRIPT_CLE`, Application Web
  `doGet` de sante.gs) pour une récolte immédiate, puis relit tout sauf les images.
- `chiffres.py` : tous les calculs, sans Streamlit (`stats_jour`, `charger`, `dossier_coach`…), partagés par l'appli et
  `coach.py`. `coach.md` = consigne du coach (personnalité, profil, règles, plan) : c'est là qu'on l'affine.
- Coach (sans clé API) : **à la demande seulement** depuis le 25/10 (avant : tous les matins, trop de quota).
  Tâche Claude « Coach santé (à la demande) » `trig_013PzeBgAHBJa7AqZ7i18G2R` (sans horaire : seulement une date en 2099),
  qui arrive dans la session Claude Code de Kiki (une session neuve n'a pas accès au dépôt privé). Bouton 🧠 « Demander
  l'analyse au coach » / « Refaire l'analyse » dans le volet du coach (`bouton_demander`) : POST sur l'adresse du
  déclencheur API de la tâche (secrets Streamlit `COACH_URL` + `COACH_TOKEN`, jeton créé par Kiki sur
  claude.ai/code/routines), avec un texte qui donne PÉRIODE et DATE (la consigne de la tâche ne se modifie que depuis
  sa propre conversation : les précisions passent par ce texte). La tâche : copie à jour de la branche `data`,
  `python3 coach.py dossier DATA PÉRIODE DATE` (consigne + données + 3 analyses précédentes), écrit l'analyse, puis
  `coach.py enregistrer …` → `data/coach/jour/AAAA/AAAA-MM-JJ.json` ({periode, debut, fin, ecrit, texte}) ; Semaine
  (fichier au nom du lundi), Mois (`data/coach/mois/AAAA-MM.json`). L'appli affiche en haut l'analyse d'hier (ou de la
  semaine / du mois précédent)
  et le bouton 📋 (`bouton_copier`, petit composant HTML) pour une analyse poussée dans Claude. Le dossier contient aussi
  `details_jour` (répartition des pas, périodes assises, cardio et SpO2 heure par heure), `tendances` (90 jours :
  durée de nuit → activité, heure de coucher → récupération, jour de la semaine, lendemain d'une grosse journée,
  30 j / 90 j) et le **carnet** du coach (`data/coach/memoire.json`, réécrit chaque matin : `coach.py carnet DATA f.md`).
  Phase de calibrage : on affine `coach.md` au fil des retours de Kiki.
- **Pokémon v3** (28/10, plus un prototype : **jamais de Pokémon offert**, tout se gagne en faisant du sport ; seule
  exception, voulue par Kiki le 29/10 : le premier jour, Poké Ball `chen` « 🎁 Cadeau du Professeur Chen » = un des 3
  starters au hasard, `pokemon.STARTERS`, ou un tirage normal si on les a déjà ; pas de choix à enregistrer).
  Son ouverture passe par la **scène du laboratoire** (`lancer` → `intro`) : **image ChatGPT** `scenes/labo-chen.webp`
  (essayée en sprites le 30/10, jugée laide par Kiki : on garde ChatGPT pour les labos, une image par région, consigne
  dans `scenes/PROMPT.md`), Chen derrière une table avec 3 Poké Balls (`PROFESSEURS` : image, taille, position des
  balls et de la table en pixels de l'image), répliques façon GBA (il ne demande plus le nom), on touche une ball (halos), elle saute, zoom + flash blanc, puis
  l'ouverture en 3D **sans 2e toucher** (`ouvrir(c, rejouer, direct)`). Texte : espace insécable avant ! ? : ; et
  `text-wrap: pretty` (jamais une ponctuation ou un mot seul en dernière ligne, demande de Kiki). Bouton « 🎬 Revoir
  l'accueil » dans « Comment ça marche ? ».
  **Arènes en sprites, sans ChatGPT (choix de Kiki le 30/10 : ChatGPT bloque après 2-3 images par jour)** :
  champions des 9 générations = **PokéRogue** (`pagefaultgames/pokerogue-assets`, `images/trainer/<nom>.png` + `.json`
  = planche + liste d'images d'animation, version figée par son commit dans `ROGUE`), complété par **smogon/sprites**
  (`trainers/` gen 1-7 : Sacha en 7 tenues, capitaines d'Alola, quelques professeurs) ; Sacha sur la carte = images de
  Red de **pret/pokefirered** (`graphics/object_events/pics/people/red_normal|red_bike|red_surf.png`, commit figé dans
  `SACHA`).
  **Arènes sur la carte** (31/10, demande de Kiki : badges invisibles avant) : chaque arène a sa **médaille** (`medaille`,
  SVG) : à gagner = rond sombre, liseré blanc en pointillés, badge en couleur ; gagné = médaille d'or qui brille + éclat.
  La **prochaine arène** = **portrait du champion** dans un médaillon à la couleur du type (`chefCarte`, **tête et buste**
  recadrés tout seuls sur la 1re image du sprite PokéRogue : `championAnime(…, portrait)` / `trouverCadre`, badge à gagner en pastille en haut à droite, comme une notification), à droite de la ville ; halo blanc discret jusqu'au premier toucher
  (`pkm_chef_vu_N`, plus de « ! » rouge) ; le toucher = il s'anime + bulle (son défi) ; toucher ailleurs la ferme.
  **Scène du badge** (`sceneBadge(n, capture, rejouer)`, 30/10) : bandes noires qui s'écartent (entrée de combat),
  fond aux couleurs du type, bandeau « ARÈNE D'ARGENTA », champion animé (`championAnime`, canvas) sur une estrade,
  répliques (`CHAMPIONS` : nom, sprite, 2 répliques ; 9 = Régis, Ligue), le badge (PokeAPI `badges/N.png`, trophée 🏆
  pour la Ligue) tombe et tourne avec des rayons, « Touche le badge », il vole dans l'**étui à badges** (8 cases),
  éclats + petit air (`SON_BADGE`), puis Hyper Ball / Master Ball (flash → `ouvrir(c, rejouer, true)`). Lancée par
  `lancer` pour `badgeN` / `ligue` pas encore ouverts ; rejouée en touchant un badge gagné dans la boîte à badges. Tant qu'il n'y a aucun badge : bouton « 🎬 Aperçu de la
  scène du badge » (Pierre, sans récompense) dans « Comment ça marche ? ».
  **Scène du badge v2 (29/10, Kiki : « tout fait amateur »)** : noir → titre de l'arène au centre (trait lumineux) qui
  monte → décor = la ville sur la carte de la région, floue et sombre, en travelling ; particules selon le type (`AIRS` :
  poussière Roche, bulles Eau, étincelles Électrik, pétales Plante…, `airAnime`) ; champion en silhouette puis projecteur ;
  dialogue ; révélation : roulement de timbales + énergie qui converge, éclair, onde de choc, secousse, le badge arrive en
  tournant ; nom du badge en lettres d'or ; on le touche → **étui en cuir** (couvercle qui s'ouvre, velours bleu, 8
  alvéoles) où il vole ; fanfare. **Badge propre** (`badgePropre` : liseré blanc effacé par remplissage depuis les bords
  jusqu'au contour noir, agrandi ×4 en EPX, tranche dorée) et **en relief** (`badge3D` : face + 22 couches de tranche +
  dos, en 3D CSS ; jamais de `mix-blend-mode`/`filter` sur un parent : ça aplatit la 3D). Sons (`EPIQUE`, `salle()` =
  réverbération) : cuivres, timbales, cymbales, tintements, fanfare originale. Sur la carte, le champion ne s'anime
  **jamais** (il sortirait du médaillon) et sa bulle donne un **indice** (`CHAMPIONS[n].indice`), pas le défi.
  **Badges (29/10)** : un badge gagné qui attend (`badgeN` / `ligue` pas ouvert, `estBadge`) s'affiche en haut de
  « à ouvrir » comme le **badge doré qui tourne** (`.badge-attente`, pas une Hyper Ball) + **bandeau doré** en haut de
  l'onglet (passe avant celui du voyage) ; toucher = `sceneBadge`. Arrivé à une arène : carte **« Défi de l'arène »**
  (`carteDefi`, portrait animé du champion, jauge + plan B) en tête des balls spéciales ; à la fin du voyage qui y arrive,
  le champion se présente tout seul (bulle = sa 1re réplique + le défi). **Mode test** (« Comment ça marche ? » →
  « Tester les arènes » : arriver chez Pierre, gagner le Badge Roche ; `TEST`, faux état en mémoire, captures `test#…`
  jamais gardées ni partagées, « Quitter le test » remet tout).
  Boîte de dialogue commune (`STYLE_DIAL`, `dialogue(v)`, `preparerScene`) au labo et aux arènes.
  **Le dresseur sur la carte** (30/10) : `heros()` en HTML par-dessus le SVG (`POSE` calculé dans `svgKanto`) : il
  marche dans le sens du chemin (`direction`, 4 images de pas toutes les 170 ms, miroir vers la droite), immobile de dos
  devant une arène qu'il attend ; en vol / en mer sur le dos de la `monture` (dernière capture Vol / Eau ; sinon vélo
  `red_bike`, bateau, `red_surf`). **Plus de compagnon** (Kiki, 30/10 : « gadget », bouton de la fiche retiré).
  **Premier lancement d'une partie** (27/10, demande de Kiki ; à terme = premier passage d'un compte) : tant que le
  cadeau `chen` n'est pas ouvert, l'onglet ouvre tout seul l'**accueil** = `editerDresseur(true)` en plein écran
  (titre « POKÉMON SPORT », carte « NOUVEAU DRESSEUR », pseudo obligatoire, vide si `DRESSEUR.partie` ≠ partie en
  cours, un seul bouton rouge « COMMENCER L'AVENTURE ») → scène du labo → ouverture 3D du starter → l'onglet.
  **Mon dresseur** (31/10, section avant « Comment ça marche ? », `dessinerMonDresseur`) : mini carte dresseur +
  « Modifier » → `editerDresseur` = **Carte Dresseur** façon Rouge Feu (fond bleu rayé, police pixel, NOM / POKÉDEX /
  BADGES / RÉGION, flèches rouges ◀ ▶ : peau, casquette, veste, pantalon ; RETOUR / ▶ OK). Plus d'emoji ni de dégradé
  (Kiki : « ça fait IA ») ; plus de réglage en touchant la carte. `DRESSEUR` = {nom, peau, casquette, veste, pantalon}
  dans le localStorage `pkm_dresseur` (à passer côté serveur avec le multijoueur) ; `feuilleColoree` recolore les
  images de Red (peau 3 tons ; rouge 3 tons : 7 premières lignes = casquette, le reste = veste ; jean = pantalon).
  Couleur des yeux : non (1-2 pixels, invisible). « Kiki obtient le Badge Roche ! ».
  **Champions dessinés dans leur arène (30/10, essai validé sur Pierre)** : `CHAMPIONS[n].arene` = image ChatGPT de la
  salle avec le champion (`scenes/arene-argenta.webp`) + le champion seul détouré par Claude (`arene-argenta-pierre.webp`,
  posé pile par-dessus : x, y, pw, ph en pixels de l'image), `tete` = carré de la tête (médaillon de la carte et carte du
  défi, `portraitChamp`), `torches`. Scène du badge en mode `salle-mode` : salle sombre et champion en silhouette, torches
  qui s'allument une à une (`EPIQUE.torche`), la salle s'éclaire, caméra qui s'approche (`camera(1.12)`), poussière du
  type ; le champion reste **immobile** (Kiki, 30/10 : la respiration faisait voir les pixels du dessin d'origine) et
  pas de petite ligne « Champion … · type … » sous le titre (il le dit lui-même) ; à la révélation tout s'assombrit. Sans
  `arene` : l'ancien sprite PokéRogue. À faire pour chaque arène : image ChatGPT → détourer le champion (contour sombre,
  remplissage depuis les bords, comparé au rendu) → mesurer torches / tête.
  **Décors de capture (30/10, 1er : hautes herbes ; idée de Kiki)** : `FONDS` (image `scenes/fond-*.webp`, centre du
  rond de sol `ovale`, `rayon`, `vent`) et `LIEU_FOND` (lieu de la capture → fond ; légendaires exclus pour l'instant).
  **Deux mondes** : jusqu'à l'ouverture, on est « dans l'appli » = l'animation habituelle (fond sombre, **ball 3D lisse**,
  chute, secousses, clic, lueur) ; quand la ball s'ouvre, sa lumière envahit l'écran (`blanc-jeu`) et nous transporte
  « dans le jeu » : classe `dehors`, le décor pixel art apparaît en **mosaïque** depuis le blanc (`mosaique(…, "#fff")`),
  la caméra recule (`ouvert`), oiseau, feuilles et pollen au vent (`ventAnime`), et le Pokémon se matérialise sur le
  rond (`--py`) avec ombre et lueur au sol, sans rayons qui tournent. Essais refusés par Kiki le 30/10 : herbes qui
  s'écartent (« bas de gamme »), ball 2D en sprite (« horrible »), ball 3D pixelisée (« décevant ») ; `BallPixel` et
  `Ball3D(…, pixel)` restent dans le code, inutilisés. Aperçu : « Comment ça marche ? » → « Tester les captures »
  (`apercuCapture`, `apercu: true`, jamais gardé). Les 10 autres fonds et les 5 des légendaires sont dans le cerveau
  (`projets/sante/captures/`).
  **Champion sur la carte** : **pose fixe** (première image), il ne bouge qu'au toucher (`championAnime(…, fixe)` →
  `jouer()`). **Tuile de l'arène** seulement **une fois arrivé** (avant : le
  champion sur la carte suffit), avec le badge, le défi et les jauges.
  **Montre : rien à mettre à jour pendant que le jeu évolue (choix de Kiki, 29/10)** : on la mettra à jour une seule
  fois, quand le jeu sera fini et testé (à reprendre alors : scène d'accueil du professeur, voyage et carte,
  vols et surf, Pokédex normal + shiny, Master Ball 25/30). D'ici là, elle montre le cadeau comme une Poké Ball normale.
  `pokedex.py` noms/types des 151, `pokemon.py` règles (`REGLAGES`, `BALLS`, `SOURCES`, `SPORTS`), `kanto.py` le
  voyage, `ecran_pokemon.py` prépare les données, `pokemon_ui.html` = tout l'onglet (un seul composant). Audit du 27/10
  (experts sport / mode de vie / jeu / ergonomie) : prochaines étapes = Johto (Gen 2, avant que Kanto soit fini, sinon
  il ne sort plus que des shiny), saisons/thèmes du mois, peut-être un compagnon qui évolue. Kiki peut fournir des
  images de carte (pixel art, HD-2D) si besoin. **Régions suivantes (décidé le 29/10)** : même système jusqu'à la
  Gen 9 (Johto, Hoenn, Sinnoh, Unys, Kalos, Alola, Galar, Paldea), une région après la Ligue de la précédente, à
  construire quand Kiki aura joué quelques semaines (régler la durée sur son vrai rythme), avant la fin de Kanto.
  Garde-fou choisi par Kiki (aléatoire, « ça reste un jeu Pokémon ») : chaque ball a **25 % de chances** de donner un
  Pokémon manquant des régions précédentes, tant qu'il en reste, et **après 8 balls de suite sans, la suivante en donne
  un à coup sûr** ; les Master Balls donnent d'abord les légendaires manquants des régions précédentes. Pas d'obligation de choisir entre finir le Pokédex et avancer.
  - **Kanto branché en entier (01/11, carte blanche de Kiki : « que le jeu soit fini et propre jusqu'à la fin de Kanto »)** :
    les 32 images ChatGPT du 30/10 (cerveau `projets/sante/arenes/v2/`, `captures/`, `ecrans/`) sont dans `scenes/` en webp.
    **Décors de capture** (`FONDS`, `fondDe(c)`) : 11 fonds de lieu (`LIEU_FOND`, un par lieu de `kanto.LIEUX`), 5 sanctuaires
    des légendaires (`LEG_FOND`, Master Balls et Ligue), le labo sans les balls pour le starter (`labo`), et pour chaque badge
    l'**arène vidée de son champion** (`arene1`…`arene8` = `arene-<ville>-vide.webp`, Pokémon posé là où était le champion ;
    champion effacé par Claude : recopie décalée du décor + recalage de la lumière ligne par ligne, tatami de Koga recopié en
    motif, plateau de Morgane lissé ; la Ligue n'a pas de version vide, l'emblème doré au sol est trop complexe). Chaque fond a
    `ovale` (centre du rond de sol, pixels), `rayon`, `ombre` (r,g,b), `jet` (éclats) et `air` = couches de particules de
    `ambiance()` (vent, lucioles, poussière, reflets, embruns, pétales, étincelles, brume, orbes, braises, neige, bulles, oiseaux).
    **Arènes v2** : les 9 champions dessinés dans leur salle (`CHAMPIONS[n].arene`, détourés par GrabCut d'OpenCV), `tete` =
    carré de la tête (carte, défi), `torches` = lumières qui s'allument une à une (`feu` = couleur r,g,b, `taille` en %).
    **Ligue** (`sceneBadge(9)`) : les 4 salles du **Conseil 4** (`CONSEIL` : Olga, Aldo, Agatha, Peter, 2 répliques chacun,
    fondu au noir entre les salles), puis Régis, puis le **Panthéon** (`scenePantheon` : 6 socles `SOCLES`, l'équipe =
    starter + Pokémon des badges + plus belles captures, `equipePantheon`), puis la Master Ball.
    **Centre Pokémon de nuit** (`sceneCentre`) : Infirmière Joëlle, la machine s'allume emplacement par emplacement
    (`ALVEOLES`), petit air de soin original ; tout seul une fois par jour après une nuit ≥ `R.nuit` (localStorage
    `pkm_centre_vu`), et en touchant la carte « Bonne nuit ».
    **Accueil** (`demarrerAventure`) : **écran titre** (`ecranTitre`, `titre-kanto.webp`, « POKÉMON SPORT · Édition Kanto »,
    oiseaux, « Touche l'écran ») -> carte du nouveau dresseur posée dessus (`editerDresseur(true, {surTitre})`) -> labo.
    **Labo v3** : `labo-chen.webp` = scène des professeurs du 30/10 avec les 3 balls posées par Claude (ball validée par
    Kiki), `labo-chen-vide.webp` sous la ball qui saute ; la caméra s'approche de Chen et de la table pendant le choix
    (`ZOOM_LABO`, idée de Kiki).
    **Bulle de dialogue de hauteur fixe** (demande de Kiki) : `dialogue(v).prevoir([[texte, qui], …])` mesure toutes les
    répliques de la scène et la boîte prend la hauteur de la plus longue (jamais elle ne rapetisse).
    **🧪 Tester Kanto** (tout en bas de l'onglet, `dessinerTests`) : accueil complet, labo, les 9 scènes de badge (+ la
    capture dans l'arène), tous les décors, Centre Pokémon, Panthéon, test de la carte (aperçus `apercu: true`, rien
    d'enregistré ; pendant l'aperçu de l'accueil, le pseudo n'est pas gardé, `DRESSEUR_ESSAI`).
    **Retours de Kiki du 01/11 (soir), faits** : labo = image VIDE (`labo-chen-vide.webp`) + 3 vraies balls transparentes
    (`scenes/pokeball-labo.png`, la ball validée ×3 lissée) posées par le code, ombre sous chacune ; la ball choisie saute
    sans « carré » (avant : un morceau d'image découpé), plus de zoom pendant le choix, image qui remplit tout l'écran (plus
    de bande marron en bas) ; le starter apparaît SUR la table (fond `labo` : ovale = dessus de la table, taille 1).
    Taille du Pokémon à l'ouverture = `rayon` du rond × 1,1 × `taille` du fond (`--pw`), pieds au milieu du rond (avant :
    250 px fixes, trop gros). **Résultat = boîte de dialogue GBA** en bas (`montrerCarte`, classe `carte jeu` :
    SHINY / LÉGENDAIRE, « Tu as attrapé X ! », types, nature ; rien d'autre, le reste se découvre dans le Pokédex (Kiki, 05/11 : ni compteur, ni « nouveau », ni bouton vers la fiche) ; boutons pixel ▶ OK / ▶ SUIVANTE) à la place de la
    grande fiche et du bouton « Génial ! » (Kiki : « fait IA »). Titre en haut = provenance (`titreBall` : « Hyper Ball de
    Pierre », « Poké Ball · Forêt de Jade », « Cadeau du Professeur Chen »…). Têtes des champions : même cadrage pour tous
    (carré de 130 px calé sur le haut de la tête et centré sur le visage : tête, cou, haut du torse ; `portraitChamp` =
    `<img>` dans un cadre qui coupe). Badges : EPX ×4 puis 2 agrandissements lissés avec contour net (plus d'escaliers).
    Master Ball 3D : texture 2048 px, « M » plus petit et bordé, bosses roses sans cible. Écran titre sans « Édition Kanto »
    (à remettre si un jour chaque région a son écran titre). Carte dresseur : le dresseur remplit sa case.
    **Retours du 01/11 (nuit), faits** : **portraits des champions cadrés TOUT SEULS** (`cadreTete`, au chargement de
    l'image détourée, pour toutes les régions à venir : silhouette mesurée, largeur de la tête à 20 % de la hauteur × 1,45,
    bornée entre 50 et 57 % de la hauteur, collée au sommet du crâne ; plus de `tete` à la main ; il faut que l'image
    soit servie avec CORS, ce que fait raw.githubusercontent.com ; sinon cadrage simple). Le Pokémon se pose sur le rond
    (`left: var(--ox)`) et le décor glisse pour amener le rond au milieu de l'écran sans laisser de vide (starter centré
    sur la table). Pokémon des arènes ×1,3 (`taille`). Panthéon : le socle le plus proche passe devant (`z-index` = y),
    plus de noms sur les plaques (trop petites) : l'équipe est dite dans la boîte de dialogue. **Étui à badges refait**
    (cuir grainé, coins et fermoir en or, Poké Ball gaufrée, revers de satin « LIGUE POKÉMON · KANTO », velours et
    8 logements cerclés d'or avec la silhouette du badge à gagner et son nom, reflet qui passe quand le badge est posé),
    remonté au-dessus de la boîte de dialogue.
  - **Replay de la journée sur la carte** (01/11, demande de Kiki) : la carte est **toujours en haut** de l'onglet (puis
    à ouvrir, barre, objectifs…) ; plus de tuile d'arène au-dessus de la carte (doublon de « Défi de l'arène ») ni de
    bandeau « Ton dresseur a avancé » (sauf badge). Chaque capture a `c` = points cumulés au moment où elle a été gagnée
    (poke k = k × 100 ; Super / Hyper = vrai moment, `pokemon.chronologie` minute par minute dans les fichiers du jour
    d'aujourd'hui et d'hier, ramené au total du jour, `moment` ; badges et Master = fin du jour ; figé avec la capture) ;
    `etat["frise"]` = par jour c0→c1 (points) et p0→p1 (carte ; pendant un défi la carte ne bouge pas). Le bouton ▶
    rejoue depuis `pkm_c_vu_<partie>` (points ; repli : ancienne `pkm_pos_vu_` convertie) : 3 à 9 s selon les points,
    puce « sam. 31/10 · +340 pts », panneau du nouveau lieu en haut de la carte façon GBA (`panneauLieu`, le dresseur s'arrête 1,2 s ; 03/11, décidé par Claude à la demande de Kiki), chaque ball sort au-dessus du dresseur à son moment (Super / Hyper plus grosses avec
    leur nom) puis file vers « à ouvrir » (`sortirBall`) ; d'ici là elles sont `EN_ROUTE` (pas dans « à ouvrir », qui
    montre « N Poké Balls t'attendent sur ta route » → lance le replay). Toucher la carte pendant le replay = la fin.
  - **Minutes de sport** (01/11, Kiki) : le jeu ne compte plus les minutes en zone (la zone modérée, verte, se déclenche
    en marchant ou assis en soirée : 323 min le 31/10, 13 balls en deux jours) mais `zone_sport` (jaune / rouge) :
    `zone_points` = 5 pts / min, objectif 10 min, exploit 25 min ; Major Bob = 3 jours avec 10 min, Auguste = 60 min
    en 7 jours, mission « zone » = 10 min de sport. Avant `zone_depuis` (01/11) : l'ancien calcul à l'identique
    (`ancien_zone`, cardio comptée 4 fois) pour que captures et carte ne bougent pas. Les balls gagnées les 31/10 et
    01/11 avec l'ancien calcul sont gardées (Kiki : reset prévu quand Kanto sera calibré).
  - Barre d'effort (100 points, ne se vide jamais) : 1 pt / 100 pas au-delà de 2 000, 5 pts / min de sport, 1 / étage,
    1 / min de séance (≥ 10 min), 2 / min de musculation
    (`compte_double`, depuis le 28/10 ; le rameur aussi jusqu'au 04/11, puis 1 / min, ses minutes de sport le récompensant déjà : Kiki, 04/11 ; il reste de la force pour les défis, `est_force`). Barre pleine = Poké Ball ; ses types = ce qui a le plus rempli la barre du jour hors
    pas (`origine_barre`), sinon tous. Super Ball = 5 000 pas ET 10 min de sport ; Hyper Ball = 10 000 pas, 25 min de
    sport ou séance de 45 min ; Master Ball = 25 jours sur les 30 derniers (5 000 pas ou
    10 min de sport ; fenêtre glissante, rien ne remet à zéro, on recompte après chaque Master Ball ; avant le 27/10 : 30 jours
    d'affilée avec joker) = légendaire. Nuit de 7 h = shiny ×1,5 ce jour-là (pas de ball ; plus de bonus masse grasse).
    Chaque ball spéciale affiche ce qu'il reste à faire. Pas de bouton « tout ouvrir » (choix de Kiki).
    **Pesée** (29/10, Kiki oublie de se peser) : `REGLAGES` `pesee_avant` = 12 h (heure locale de la balance,
    `pesees_du_jour` lit les points bruts `weight` / `body-fat` des résumés) ; chaque pesée du matin = **+10 points
    d'effort** (`bonus_pesee`, une par jour ; plus de Poké Ball : « trop bien comme cadeau ») ; objectif affiché 3 / semaine.
    **Mission du jour** (29/10, `missions.py`, 6e tuile `carteMission`) : une mission par jour (dès le 30/10) choisie sur
    les lacunes des 14 derniers jours (la moins réussie, pas deux fois de suite si une autre est presque aussi faible) :
    matinée active 2 000 pas avant 13 h (lun-ven), coucher avant 0 h 30 (soirs dim-jeu, vérifié le lendemain matin),
    10 min de sport (jaune, depuis le 01/11), séance de 10 min ; pas d'étages ni de pauses toutes les 2 h (appartement, télétravail : refusés
    par Kiki). Choisie et gardée par le calcul de chaque heure (`montre.py` → `data/pokemon/missions.json`, avec les
    pas d'avant 13 h lus dans les fichiers du jour) ; réussie = **+25 points d'effort**. Bonus (`bonus_du_jour`)
    comptés le jour où on les sait (coucher : le lendemain), affichés en puces dorées sous la barre. Carte « Pesée de la semaine »
    (`cartePesee`, demi-largeur et compacte, la moins importante : 7 petits ronds L→D) dans les balls spéciales, avec la dernière pesée comparée à 2-4 Pokémon en icônes seules (×2, nom au survol) (`POIDS` de
    pokedex.py = poids officiels PokeAPI, `comparerPokemon`, graine = la date). Pour des stats fiables : ≥ 3 / semaine.
  - **Pokédex = une entrée par espèce, normal + shiny** (28/10 : plus les ~14 « versions » des différents jeux, carte
    blanche de Kiki). Jamais de doublon : `tirer` prend une espèce pas encore attrapée (ou son shiny ; quand toutes les
    espèces sont là, il ne sort plus que des shiny). Les anciennes captures gardent leur `fichier` (plus lu).
  - **Voyage dans Kanto** (`kanto.py`, 28/10) : les points de la barre (cumul depuis le 19/10) font avancer de Bourg
    Palette au Plateau Indigo (21 lieux, 9 000 points ≈ 3 mois, choix de Kiki : 3 mois pour toute l'aventure). Chaque
    lieu a ses Pokémon (les 146 non légendaires répartis, chacun dans un seul lieu) : poids 6 ici, 2 lieux traversés,
    1 étape suivante, ×3 si type de la barre ; plus rien de nouveau dans le coin → tout Kanto. Arènes (9 = la Ligue) :
    arrêt jusqu'au défi (7 derniers jours depuis l'arrivée) ou son **plan B** (6 jours sur 7 avec l'objectif : jamais
    bloquant) ; **pendant le défi la carte ne bouge plus** (29/10, choix de Kiki) : les points du défi et ceux qui dépassaient l'arène à l'arrivée sont perdus pour le voyage (pas pour les balls) ; après le badge on repart de l'arène (`Voyage.cumul` : seul le gain du jour s'ajoute). Badge = Hyper Ball `badgeN` du type du
    champion, espèce nouvelle ; Ligue = Master Ball `ligue` (légendaire). Rejoué chaque fois, rien d'enregistré ;
    chaque capture a son `lieu`. **Carte v2 (29/10)** : nouvelle Kanto de Kiki (Plateau Indigo, volcan de Cramois'Île,
    Piste cyclable sur pilotis ; lieux et `VIA` replacés, mêmes lieux, mêmes points, donc rien de perdu) ; 2 bouts de
    route peints par Claude avec des morceaux de la carte (Route 3 Argenta → village du Mont Sélénite avec pont ;
    ponton Céladopole → Piste cyclable). Les 9 cartes des régions sont dans le cerveau (`projets/sante/cartes/`).
    **Zoom** (`CARTE["zoom"]`, 2 pour Kanto, à régler par région) : `carte-vue` (fenêtre qui défile) sur `carte-wrap`
    (zoom × plus large), centrée sur le dresseur ; coordonnées en `LARG` = 370 × zoom (`echelle(z)` recalcule
    `LIEUX`/`TRACE`) donc traits et noms gardent leur taille (×1,25 quand zoomé) ; tailles en % divisées par `--z` ;
    **Pas de défilement libre, vue d'ensemble seulement par la loupe depuis le 02/11** (29/10, Kiki : la carte se découvre au fur et à mesure) : par défaut
    zoomée et centrée sur le dresseur (`overflow:hidden`). Bulle du champion posée dans `.carte-cadre` en pixels de
    l'écran (au-dessus du médaillon, sinon dessous) : jamais coupée.
    Mode **`grotte`** (Mont Sélénite → Azuria ; idée de Kiki, 29/10) : tirets, et le dresseur est vu dans une **boule de
    cristal** (`.boule`, cadre doré) qui avance sur le trait : dedans, une grotte en pixel art dessinée par le code
    (`GROTTE`, bande de 192 px qui boucle : rochers, stalactites, sol, cristaux qui scintillent, lumière de torche,
    `grotteAnimee` fait défiler toutes les `canvas.cave` dans le sens de la marche) et Sacha qui marche de profil.
    Vol au-dessus de la mer sans Pokémon Vol = l'**Océane** (S.S. Anne de Rouge Feu, `NAVIRE`, pret/pokefirered
    `pics/misc/ss_anne.png`, retournée vers la droite) ; avant : l'icône du Passe Bateau.
    **Voyage depuis la dernière visite** (29/10) : si le dresseur a avancé d'au moins `SEUIL_VOYAGE` = 25 pts (ou
    atteint un nouveau lieu) depuis le dernier voyage **regardé** (localStorage `pkm_pos_vu_<partie>`, 0 la toute 1re
    fois, mis à jour seulement quand on le regarde : les petits bouts s'additionnent), bandeau en haut de l'onglet
    (`#bandeau-voyage`, « Ton dresseur a avancé ! », le toucher descend à la carte) et carte assombrie avec un bouton ▶
    (`.carte-attente`, « Voir ton voyage ») ; le dresseur attend à l'ancienne place. Au toucher (`lancerVoyage`), il
    parcourt le chemin gagné en 1,4 à 4,5 s ; sous le seuil, il est déjà à sa place sans rien proposer
    (`voyagerDepuis` : `trajet(p0, p)` redessine le bout rouge dans `#chemin-anim`, `poseA(p)` = position, sens, mode ;
    le dresseur = `.heros-ancre`, ses éléments `.suit` suivent ; refait seulement quand le mode ou le sens change), la
    carte le suit (sauf si on la touche) ; attend que la carte soit à l'écran (cadre Streamlit : `frameElement`).
    Plus de dessin du trait rouge depuis Bourg Palette à chaque ouverture (`pk-trace` retiré).
    Écran : **carte = image pixel art** `cartes/kanto.webp` (générée par Kiki avec ChatGPT,
    même style et même prompt pour toutes les régions : `cartes/PROMPT.md` ; servie par raw.githubusercontent.com de
    ce dépôt ; lieux en pixels de l'image dans `kanto.LIEUX`, ramenés à 370 de large dans l'écran ; pas une carte
    fidèle de Kanto, choix assumé : jolie et cohérente) avec par-dessus en SVG : chemin qui **suit les routes de
    l'image** (`kanto.VIA` = points de passage par étape, en pixels ; parcouru = rouge bordé de blanc, la suite = petits
    points sombres ; position = fraction des points le long du tracé ; pour ne pas repasser par une route déjà faite,
    `kanto.MODES` : « vol » = arc en tirets, « surf » = tirets en mer ; **un seul Pokémon visible sur la carte** (Kiki, 30/10),
    idée de Kiki, même nombre de points : seul le dessin change ; `monture` : c'est un Pokémon de la collection qui
    porte (Vol pour voler, Eau en mer : la dernière capture du type ; personne :
    vélo sur la terre, bateau ⛵ pour un vol au-dessus de la mer, Lokhlass sauvage en mer), sans choix ni tirage truqué, et « 🪽 En vol : X t'emmène jusqu'à… » sous la carte avant
    l'étape), toucher un lieu = anneau blanc qui pulse + nom
    en jaune, et ses Pokémon dans le panneau collé sous la carte (+ quand on repart), ★ sur un lieu complété. Ordre
    (choix de Kiki, 29/10) : tuile de l'arène (compacte) au-dessus de la carte, carte, Pokémon du lieu, boîte à badges ;
    sans Pokémon : une Poké Ball (pas d'image de Sacha dans PokeAPI).
    Dernières captures : les 8 dernières. Pokémon **rares** ⭐
    (`kanto.RARES`, poids ÷ 3). Choix voulu (29/10, carte blanche de Kiki : « ça reste une appli de sport ») : chemin fixe, pas de
    « rester ici » ni de carrefours (il faudrait enregistrer ces choix côté script Google, car ils changent les tirages).
  - **Parties** (`REGLAGES` `debut` + `partie`) : partie 1 du 19/10 au 26/10 ; partie 3 du 27/10 au 01/11 ; **partie 4 depuis
    le 02/11** (règles de l'audit ; Kiki repartira encore de zéro quand le jeu sera fini). Recommencer = nouvelle date
    `debut` + `partie` + 1 : rien de l'ancienne partie ne revient (les données santé ne bougent pas).
  - Identifiants `ident(jour, cle)` = « 2026-10-27-p2#poke3 / super / hyper / master1 / badge1 / ligue / chen »
    (partie 1 : sans « -p1 ») = graines (rejouable) ; les captures figées et les balls ouvertes d'une autre partie
    sont ignorées (autre identifiant). « ! » du champion vu : `pkm_chef_vu_<partie>_<N>`. Le calcul de la montre (GitHub Actions, chaque heure) fige **toutes** les captures,
    aujourd'hui compris (27/10 : avant, seulement les jours finis, et une ball ouverte changeait de Pokémon dans la
    journée car le tirage dépend des types de la barre et des balls gagnées plus tard) →
    `data/pokemon/captures_v2.json` (avant le 25/10 : la tâche du coach, `pokemon.py figer DATA`) (l'ancien `captures.json` du prototype n'est plus lu).
  - Écran (ordre du 29/10, logique « ce qui t'attend → ton compteur → quoi faire → ton aventure → ta collection ») :
    bandeaux (badge, voyage), Poké Balls à ouvrir (masqué si vide), barre d'effort, « Tes objectifs du jour » (défi de
    l'arène pleine largeur, mission, Super, Hyper, Master, Bonne nuit, Pesée), voyage, dernières captures, Pokédex
    (filtres dont « 📍 lieu actuel », types, recherche, fiche en feuille qui monte du bas : grande illustration,
    normal / shiny animés, lieux).
    Ouverture = calque plein écran dans la page parente : Poké Ball **3D** (three.js 0.160 UMD depuis jsDelivr, repli SVG
    sinon) qui tombe, attend qu'on la touche, secousses (4 si rare), clic, lueur selon la rareté, ouverture, faisceau,
    silhouette puis couleurs (grande illustration officielle) ; nouveau = confettis + fanfare, shiny = or + étincelles, légendaire = violet. Sons
    synthétisés (WebAudio, bouton 🔊), vibrations. Les Poké Balls ouvertes sont dans le localStorage
    (`pkm2_ouvertes`, celles de plus de 14 jours comptent ouvertes) et le Pokédex ne montre que les ouvertes.
  - **Images : dépôt public `PokeAPI/sprites`** (28/10), lues directement sur raw.githubusercontent.com (CORS ouvert,
    rien n'est copié dans ce dépôt) : `pokemon/N.png` (petite, Pokédex, carte), `other/showdown/N.gif` (animée,
    1 011 premiers), `other/official-artwork/N.png` (HD, ouverture et fiche), `shiny/` pour chacune, `badges/N.png`
    (1-8 = Kanto, 9-16 = Johto…). Il y a aussi toutes les générations, les icônes, les objets ; pas de cartes.
    **Icônes du jeu à la place des émojis** (31/10, `IC`, `ico(cle, taille)` : tailles `pt` 18 px, normale 24, `g` 32 ;
    jamais la classe `p`, prise par les cartes du Pokédex ; `STYLE_ICO` aussi dans la page parente ; `icoType`,
    `raisonHTML`) : objets (`items/` : Poké/Super/Hyper/Master/Honor Ball, Morceau d'Étoile = rare, Bicyclette, Passe
    Bateau, Poké Radar, Télé Apprentissage = « Revoir »), PokéRogue (`ROGUE_UI` : scintillement `ui/shiny.png` avec
    lueur dorée = shiny, `items/map.png` = lieu et voyage), rubans (`ribbons/generation-iii/` : Effort = barre, Champion =
    Ligue), Ronflex (`pokemon/versions/generation-vii/icons/143.png`, Bonne nuit), badges, et icônes des types
    (`types/generation-ix/scarlet-violet/small/N.png`, `TYPE_ID`) dans toutes les pastilles de type ; `COUL` = le fond
    exact de ces icônes (l'icône se fond dans la pastille) ; filtres de type en couleurs pleines, les autres s'effacent
    quand un type est choisi ; les 18 types = grille de 3 lignes × 6 tuiles égales (icône au-dessus du nom). `ZOOM` :
    agrandit les images qui ont beaucoup de marge (balls, Morceau d'Étoile…) pour que toutes les icônes paraissent de même taille. Restent en émojis : les activités de sport (👟 🔥 🪜…, ce sont des choses de la vraie vie), ✅, 🔊 et ✕.
    La `raison` des balls garde son émoji pour la montre ; l'onglet le remplace par l'icône (`raisonHTML`).
    Petites images sans leurs bords vides (`rogne`, classe `rogne`). La montre reçoit la petite image recadrée en
    base64 (`montre.image`, Pillow). L'ancienne branche `sprites` du dépôt privé n'est plus lue.
  - **Balls ouvertes partagées** (montre + téléphone) : `data/pokemon/ouvertes.json` (branche data, 20 derniers jours),
    écrit seulement par le script Google (`doGet ?quoi=ouvrir&ids=…&ou=…`, clé `JEU_CLE`). Le téléphone l'a dans
    `D.ouvertes` (+ son localStorage) et envoie chaque ouverture (`partager`), et au chargement celles qu'il a en plus
    (migration, envois ratés). Sans les secrets `SCRIPT_URL` + `JEU_CLE` : localStorage seul, comme avant.
- **Montre (Pixel Watch 1, Wear OS 5.1)** : projet Android `montre/` (Kotlin, compilé en ligne de commande : JDK 17,
  SDK et Gradle dans `C:\Users\kikit\Android`, pas d'émulateur possible sur ce PC ARM ; `montre/secret.properties` =
  SCRIPT_URL + JEU_CLE, jamais sur GitHub). Kiki installe les APK avec **Bugjaeger** depuis son téléphone (lien servi
  par le PC sur le Wi-Fi de la maison, jamais en ligne : la clé est dans l'APK).
  - `montre.py` calcule `data/pokemon/montre.json` (barre, balls pas encore ouvertes + image, `derniere`, `objectifs`
    avec les règles de `pokemon.REGLAGES` : la montre suit seule quand les règles changent, `nuit` coucher/lever) par
    GitHub Actions (`.github/workflows/montre.yml`, secret `SANTE_TOKEN`, rien de privé dans le journal), lancé par le
    script Google après chaque récolte (`calculerMontre`, `MONTRE_TOKEN`) + chaque heure. Lu par `doGet ?quoi=montre`.
  - Module `app` (appli « Pokémon ») : `BarreComplication` (RANGED_VALUE : points en direct, image de la ball 3D quand
    il y a des balls ; toucher = ouverture, sinon espace Pokémon), `BasComplication` = case libre (LONG_TEXT, **jamais de Pokémon** ; ordre de Kiki, v15 du 28/10 :
    rendez-vous dans les 3 h > pronos NFL pas faits, dès 48 h avant le 1er coup d'envoi concerné (`pronos.manque` de
    montre.json, lu par montre.py dans `kikitmt-bit/bada-bing-nfl` avec `SANTE_TOKEN` ; toucher = site sur le téléphone,
    `OuvrirSite` / RemoteActivityHelper) > padel du jour (événement « 🎾 Padel … · 🔑 code » que le script du padel écrit
    dans l'agenda ; toucher = appli `fr.kiki.padel.montre`) > dernier message < 30 min > nuit l'heure après le lever >
    rendez-vous plus tard ; sinon vide ; heures locales de la montre, **pas d'heure de Paris au Japon**, refusé par Kiki).
    **Messages** : ceux du téléphone ne passent PAS par les notifications de la montre (Wear OS les affiche par son propre
    circuit : `Notifs` ne voyait que les appels manqués de la montre). D'où le module **`telephone`** (appli « Pokémon
    (montre) » du téléphone, même paquet et même signature de débogage du PC : `Relais` lit les notifications du téléphone
    et les envoie par Data Layer, chemins `/notif` et `/notif/efface`, reçus par `DuTelephone` sur la montre) ; Kiki
    installe son APK sur le téléphone et autorise « Accès aux notifications ». `Notifs` (montre) reste pour les
    notifications de la montre elle-même (autorisation par ADB : `cmd notification allow_listener
    fr.kiki.pokemontre/fr.kiki.pokemontre.Notifs`). Toucher un message = son appli sur la montre s'il y en a une, et il
    quitte la case.
    `PokemonActivity` (pages : barre, balls du jour, Pokédex) et `SanteActivity` (activité, cœur et nuit), pages à la
    couronne ou en glissant haut/bas, bouton ↻ (récolte immédiate avec `APPLI_CLE`, puis relecture après ~1 min),
    `OuvrirActivity` (ouverture animée ; ball 3D = images du modèle three.js du téléphone, `assets/ball/*.webp`).
    **Direct** (`Direct.kt`) : Health Services passif (pas, étages, distance, calories du jour, sans batterie en plus) ;
    barre (v15) = points du site + différence entre les pas / étages de la montre et ceux du site quand la montre est en
    avance (mêmes règles : 1 pt / 100 pas au-delà de `pas_offerts`, 1 / étage) ; les minutes en zone et les séances restent
    celles du site. Avant la v15, la montre repartait de son compteur à chaque arrivée des données du site (en retard) :
    des pas étaient perdus, d'où la barre en retard. Permissions ACTIVITY_RECOGNITION et READ_CALENDAR demandées à la 1re ouverture.
  - **v8 (23/10)** : `CoeurActivity` (toucher le cœur du cadran ; cœur en direct par `MeasureClient`, courbe 24 h par
    demi-heure, repos et VFC 7 jours, zones du jour : bloc `coeur` de montre.py, lu dans `data/jour/` d'hier et
    d'aujourd'hui) ; les pas ouvrent toujours `SanteActivity`. Tuiles `TuilePokemon`, `TuileSante`, `TuileClaude`
    (`Tuiles.kt`, protolayout 1.2.1 / tiles 1.4.1, rafraîchies avec les complications). `ClaudeActivity` répond à
    ASSIST / VOICE_COMMAND pour remplacer l'Assistant (rôle donné par ADB). Commandes ADB : `montre/ADB.md`.
  - **ADB depuis le PC** (23/10) : montre appairée, accès par `adb connect 192.168.0.28:5555` (mode tcpip, survit aux
    coupures du Wi-Fi, perdu au redémarrage). Claude installe les APK et règle la montre lui-même : voir `montre/ADB.md`.
  - Module `cadran` (« Pokémon Sport », Watch Face Format 2, sans code) : `res/raw/watchface.xml`, vérifié par
    `wff-validator.jar` et `memory-footprint.jar` (Google, dans `C:\Users\kikit\Android\wff`). Fond noir, heure
    batterie en 4 barres en haut, date + météo, heure blanche, ligne cardio / pas (`Launch` vers `SanteActivity`) /
    petite ball au trait « 48% » (slot 1), case libre en bas (slot 2) ; veille : heure fine. Pas d'anneau (trop voyant).
    Balls à ouvrir : la Poké Ball 3D + « ×5 » ; le cadran le sait par `RANGED_VALUE_MAX` = 1000, et la valeur dit quelle ball (1 Poké,
    2 Super, 3 Hyper, 4 Master : images `ball_*.png` du cadran, v11) ; un cadran WFF ne reçoit pas l'image d'une
    complication RANGED_VALUE (v15 : la condition
    `[COMPLICATION.SMALL_IMAGE] != null` n'était jamais vraie sur la montre, on voyait « ×5% » et la ball au trait).
  - **Claude sur la montre (sans clé API)** : **appui long sur le bouton** (rôle Assistant ; plus d'étoile sur le cadran
    depuis le 23/10) ou appli « Claude » de la liste -> `ClaudeActivity` (le micro écoute dès l'ouverture, aussi quand
    l'écran était resté ouvert : `onNewIntent`. Pas de reconnaissance vocale sur la montre, donc écran de dictée de
    Gboard, qui n'allume son micro tout seul que pour des applis de Google (`auto_start_voice_app_whitelist`, fixé par
    Google) : le service d'accessibilité `AutoMicro` touche le micro (0,5 ; 0,78 de l'écran) 1,3 s après (plus tôt : « je n'ai pas compris »), sauf s'il écoute déjà, quand l'écran Claude vient
    d'ouvrir la dictée ; Kiki doit l'activer dans Paramètres → Accessibilité ; fin de phrase = envoi direct, sans écran de vérification ;
    **modèle choisi tout seul** (23/10, plus de bouton) : chrono + étapes + barre de progression, puis la réponse sur une seule page qui défile (23/10 : plus de page intermédiaire ni de lecture à voix haute) : question, **image** (`wiki` = titre de l'article Wikipédia en français -> photo du résumé de l'article, ou `image` = adresse trouvée sur le web ; téléchargée par la montre, gardée dans `files/claude_img/`), l'essentiel en gras (`court`), la suite (`long`, sans répéter `court`), sources, et tout en bas « Nouvelle question » / « Réponses précédentes » ; toucher la notification « Claude a répondu » = la réponse (`voir_reponse`), pas le micro ; 10 dernières questions). Trajet : script Google
    `doGet ?quoi=claude` dépose `questions/<id>.json` dans le dépôt privé **kikitmt-bit/montre-claude** (jeton
    `MONTRE_TOKEN`) -> un envoi (push) sur ce dépôt déclenche la **routine** « Claude de la montre »
    (tri + rapide = `trig_01CDDaAsBb4aRCETbEVxYYqC` Haiku, questions difficiles = `trig_01R2Q6xWVFJVPzCsAaLPVUZ8` Opus ;
    les deux partent à chaque question ; Haiku la lit, répond aux simples et confie les autres à Opus (`outil.py confier`,
    statut `pour_opus`), qui attendait déjà (`prendre reflechi` attend jusqu'à 90 s, prend la question si Haiku ne l'a
    pas prise en 45 s) : pas de délai en plus ; tout le git est dans `montre-claude/outil.py`
    `prendre <mode>` / `confier <id>` / `rendre <fichier> <modèle>` : essai du 23/10, 28 s (Haiku, « capitale de
    l'Australie ») et 34 s (Opus, « courir à jeun ou le soir ? »), dont ~20-25 s de GitHub + démarrage,
    c'est le plancher ; `persist_session` essayé : questions perdues, ne pas remettre) -> réponse dans
    `reponses/<id>.json` de la branche `claude/montre-reponses` du dépôt sante -> `?quoi=claude&id=` la relit.
    Seuls les **push** déclenchent (pas la création de branche) et le filtre des déclencheurs est ignoré :
    d'où un dépôt à part où rien d'autre n'est poussé. Routine d'essai `trig_01DytNizq4c4NDSt9Xhn3oMU` en pause
    (déclencheur sur tous les push de sante : ne JAMAIS la réactiver ; à supprimer sur claude.ai/code/routines).
    **Actions (v14, 28/10)** : Haiku reconnaît une demande de modification d'un projet (`confier <id> action`, `type: action`) ;
    Opus (dépôts kiki-cerveau, photobooth, bada-bing-nfl/nba, padel_resa, sante-appli, hail_mary montés) fait le travail,
    pousse sur `main`, note le JOURNAL du cerveau, et envoie ses étapes (`outil.py etape <id> "…"`) : la montre affiche
    « Claude y travaille : … » et attend 25 min au lieu de 6 (essai du 28/10 : sorcière du photobooth en 2 min).
    **% d'utilisation** : illisible depuis une routine (il faudrait le jeton de connexion : refusé). À la place, chaque
    réponse porte `semaine` (questions/actions depuis lundi, par compte) affiché en bas de l'accueil, et une question
    que personne ne prend en 50 s fait afficher « Compte B à sa limite ? » + **« Demander au compte A »** : même question
    avec `&compte=A` -> dépôt `montre-claude-a` -> routines du compte A (réponse `compte: "A"`, « · compte A » en pied).
    **v15 (28/10, compte A)** : écran d'attente inchangé mais chaque chose à sa place (étape en 2 lignes au plus, coupée
    par « … ») ; l'écran reste allumé **120 s** après le dernier geste ou l'envoi (`ClaudeActivity.ALLUME`), puis veille
    normale ; `SuiviClaude` (service au premier plan + verrou du processeur) empêche Android de geler l'appli écran
    éteint, la montre continue de suivre la réponse et **vibre** à l'arrivée (canal de notification `claude_reponse`).
  - Pronos NFL et padel dans la case du bas : faits en v15 (voir `BasComplication` plus haut). v16 : pronos seulement
    en retard (matchs pas pronostiqués qui commencent dans moins de 4 h).
  - **v16 de Claude (29/10, compte A, plan dans le cerveau `projets/montre/MAJ-V16.md`)** :
    **Opus réveillé seulement si besoin** : seule la routine Haiku part à chaque question ; `outil.py confier` pousse
    `reveil/<id>.json` dans `montre-claude-opus` (B) / `montre-claude-a-opus` (A), dont les push lancent la routine Opus
    (`prendre reflechi` attend 40 s au plus). Compte A : déclencheurs **push** créés par l'API (`create_webhook_trigger`,
    `hook_type: app`, `scope_id`), plus de tickets (`reveil.yml` retiré). **« Continuer »** : la question part avec les
    3 derniers échanges (`suite` = [{q, r}], gardés dans `fil` de chaque réponse). **« Annuler l'action »** : `rendre`
    note tout seul les commits envoyés (`annuler` = [{depot, commit, titre}]) ; le bouton envoie `type: annuler` + `cible`
    → Haiku confie, Opus lance `outil.py annuler <id>` (git revert, push sur main, ligne au JOURNAL). **Ordres** :
    `Ordres.kt` reconnaît sur la montre, sans Claude, minuteur / réveil / heure / date / pas du jour (réponse « la montre,
    sans Claude ») ; une réponse de Claude peut porter `montre` = {type: minuteur|alarme|rappel|agenda} exécuté à
    l'arrivée (`fait` = « ✓ Rappel 18:35 » ; minuteur et alarme = horloge de Wear OS, `AlarmClock` ; rappel = alarme
    exacte + notification `Rappel` ; agenda = script Google `?quoi=agenda`, la montre ne peut pas écrire dans son agenda).
    **Contexte** joint à chaque question (`contexte` : heure, fuseau, ville + coordonnées de la dernière position connue,
    prochain rendez-vous, batterie ; pour une question de météo, la prévision Open-Meteo récupérée par la montre, car le
    réseau des routines bloque api.open-meteo.com). **Données santé** : `outil.py sante [jours]` (chiffres.py, branche
    data en lecture seule). Tout part dans `&x=` (JSON) de `?quoi=claude` (`enPlus` dans sante.gs). Essais sans parler :
    `run-as fr.kiki.pokemontre` écrit `files/essai.txt` (« A: » = compte A ; « continuer: … » ; « annuler »), puis
    ouvrir `ClaudeActivity`.
  - **v17 (31/10, choix de Kiki) : bascule de compte automatique**, plus de bouton « Demander au compte A » : les questions
    partent au **dernier compte qui a répondu** (`compte_defaut`, B au départ) ; si aucune routine ne prend la question en
    50 s (presque toujours la limite d'utilisation), la montre la renvoie toute seule à l'autre compte (une seule fois),
    avec `contexte.remplace` = l'ancien id : `outil.py` marque l'ancienne question `abandonne` (pas de réponse en double).
    Le compte qui répond devient le compte par défaut. Accueil : « 12 questions cette semaine · compte A ».
- Test local : remplacer `requests.get` par la lecture d'un dossier de faux fichiers, puis `runpy.run_path("app.py")`
  avec des secrets factices dans `.streamlit/secrets.toml` du dossier de test ; captures Playwright (`/opt/pw-browsers`).
