# Ma santé (appli) — notes pour Claude

Appli Streamlit perso de Kiki (pas développeur, réponses en français, simples). **Dépôt PUBLIC** : code seulement,
jamais de données, de jeton ni de mot de passe ici. Les données et le script de récolte (Apps Script `sante.gs`) sont dans
le dépôt **privé** `kikitmt-bit/sante` (branche `data`, format décrit dans son CLAUDE.md) ; l'appli les lit par l'API
GitHub avec les secrets `GITHUB_TOKEN`, `GITHUB_REPO` (= kikitmt-bit/sante). L'appli est publique sur Streamlit (la seule
appli privée gratuite de Kiki est prise par le padel) : **connexion Google** (27/10, `connexion_google()`, `st.login`,
secrets `[auth]` + `COMPTES` = adresses Gmail autorisées, jamais dans le dépôt ; ⚙️ → Se déconnecter). Tant que `[auth]`
manque, repli sur l'ancien `verrou()` (`APP_PASSWORD`, mémorisé : localStorage + cookie `sante_ok`). Comptes pour
les potes (mode multijoueur Pokémon) : plus tard. On travaille directement sur `main`.

- `app.py` : une seule page qui défile, sans la barre Streamlit du haut ni titre (CSS) ; deux onglets « ❤️ Santé » et
  « Pokémon » (icône = Pikachu de Rubis/Saphir, `pikachu.png`, en CSS) ; sur la même ligne à droite, deux petits boutons
  🔄 (actualiser) et ⚙️ (fenêtre Configuration : données brutes, oublier ce téléphone) dans le conteneur `outils`, posé
  par-dessus la barre des onglets. **Mobile d'abord** : jamais de défilement horizontal (tout passe à la ligne), et rien
  d'utile dans le coin en bas à droite (bouton « Manage app » de Streamlit, ~1 cm) : marge de 64 px en bas des calques. Filtre en haut : Jour / 7 jours
  / Semaine / Mois / Année + date et ◀ ▶. En haut, l'analyse du coach (repliée) et un bouton 📋 qui copie
  le dossier du coach sans l'afficher ; puis Activité, Séances, Sommeil, Cœur, Poids. Les chiffres viennent des **résumés annuels** (`data/resume/AAAA.json`,
  `stats_jour`), donc l'année entière se charge vite ; les fichiers du jour servent aux courbes de la vue Jour.
  Comparaison : 7 jours d'avant (vue Jour) ou période précédente de même longueur. Minutes en zone = officielles de la
  Pixel Watch (portée depuis le 19/10), sinon zone modérée ×1 + intense/pic ×2 (Inspire HR). Pixel Watch en plus :
  étages, dénivelé, SpO2 de la nuit (moyenne, plus basse, courbe).
  Objectifs dans `OBJECTIFS` (5 000 pas, 15 min en zone, 7 h de sommeil). Fichiers gardés 2 min (récents) ou 1 h.
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
  balls et de la table en pixels de l'image), répliques façon GBA, Chen demande le nom au premier passage
  (« Et toi, qui es-tu ? » → carte dresseur), on touche une ball (halos), elle saute, zoom + flash blanc, puis
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
  La **prochaine arène** = **portrait du champion** dans un médaillon à la couleur du type (`chefCarte`, haut du corps
  du sprite PokéRogue, badge à gagner en pastille en haut à droite, comme une notification), à droite de la ville ; halo blanc discret jusqu'au premier toucher
  (`pkm_chef_vu_N`, plus de « ! » rouge) ; le toucher = il s'anime + bulle (son défi) ; toucher ailleurs la ferme.
  **Scène du badge** (`sceneBadge(n, capture, rejouer)`, 30/10) : bandes noires qui s'écartent (entrée de combat),
  fond aux couleurs du type, bandeau « ARÈNE D'ARGENTA », champion animé (`championAnime`, canvas) sur une estrade,
  répliques (`CHAMPIONS` : nom, sprite, 2 répliques ; 9 = Régis, Ligue), le badge (PokeAPI `badges/N.png`, trophée 🏆
  pour la Ligue) tombe et tourne avec des rayons, « Touche le badge », il vole dans l'**étui à badges** (8 cases),
  éclats + petit air (`SON_BADGE`), puis Hyper Ball / Master Ball (flash → `ouvrir(c, rejouer, true)`). Lancée par
  `lancer` pour `badgeN` / `ligue` pas encore ouverts ; rejouée en touchant un badge gagné dans la boîte à badges. Tant qu'il n'y a aucun badge : bouton « 🎬 Aperçu de la
  scène du badge » (Pierre, sans récompense) dans « Comment ça marche ? ».
  Boîte de dialogue commune (`STYLE_DIAL`, `dialogue(v)`, `preparerScene`) au labo et aux arènes.
  **Le dresseur sur la carte** (30/10) : `heros()` en HTML par-dessus le SVG (`POSE` calculé dans `svgKanto`) : il
  marche dans le sens du chemin (`direction`, 4 images de pas toutes les 170 ms, miroir vers la droite), immobile de dos
  devant une arène qu'il attend ; en vol / en mer sur le dos de la `monture` (dernière capture Vol / Eau ; sinon vélo
  `red_bike`, bateau, `red_surf`). **Plus de compagnon** (Kiki, 30/10 : « gadget », bouton de la fiche retiré).
  **Mon dresseur** (31/10, section avant « Comment ça marche ? », `dessinerMonDresseur`) : mini carte dresseur +
  « Modifier » → `editerDresseur` = **Carte Dresseur** façon Rouge Feu (fond bleu rayé, police pixel, NOM / POKÉDEX /
  BADGES / RÉGION, flèches rouges ◀ ▶ : peau, casquette, veste, pantalon ; RETOUR / ▶ OK). Plus d'emoji ni de dégradé
  (Kiki : « ça fait IA ») ; plus de réglage en touchant la carte. `DRESSEUR` = {nom, peau, casquette, veste, pantalon}
  dans le localStorage `pkm_dresseur` (à passer côté serveur avec le multijoueur) ; `feuilleColoree` recolore les
  images de Red (peau 3 tons ; rouge 3 tons : 7 premières lignes = casquette, le reste = veste ; jean = pantalon).
  Couleur des yeux : non (1-2 pixels, invisible). « Kiki obtient le Badge Roche ! ».
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
  - Barre d'effort (100 points, ne se vide jamais) : 1 pt / 100 pas au-delà de 2 000, 2 pts / min en zone, 1 / étage,
    1 / min de séance (≥ 10 min), 2 / min de musculation ou de rameur
    (`est_force` : type ou nom de la séance, depuis le 28/10). Barre pleine = Poké Ball ; ses types = ce qui a le plus rempli la barre du jour hors
    pas (`origine_barre`), sinon tous. Super Ball = 5 000 pas ET 15 min en zone ; Hyper Ball = 10 000 pas, 30 min en
    zone ou séance de 45 min ; Master Ball = 25 jours sur les 30 derniers (5 000 pas ou
    15 min ; fenêtre glissante, rien ne remet à zéro, on recompte après chaque Master Ball ; avant le 27/10 : 30 jours
    d'affilée avec joker) = légendaire. Nuit de 7 h = shiny ×1,5 ce jour-là (pas de ball ; plus de bonus masse grasse).
    Chaque ball spéciale affiche ce qu'il reste à faire. Pas de bouton « tout ouvrir » (choix de Kiki).
  - **Pokédex = une entrée par espèce, normal + shiny** (28/10 : plus les ~14 « versions » des différents jeux, carte
    blanche de Kiki). Jamais de doublon : `tirer` prend une espèce pas encore attrapée (ou son shiny ; quand toutes les
    espèces sont là, il ne sort plus que des shiny). Les anciennes captures gardent leur `fichier` (plus lu).
  - **Voyage dans Kanto** (`kanto.py`, 28/10) : les points de la barre (cumul depuis le 19/10) font avancer de Bourg
    Palette au Plateau Indigo (21 lieux, 9 000 points ≈ 3 mois, choix de Kiki : 3 mois pour toute l'aventure). Chaque
    lieu a ses Pokémon (les 146 non légendaires répartis, chacun dans un seul lieu) : poids 6 ici, 2 lieux traversés,
    1 étape suivante, ×3 si type de la barre ; plus rien de nouveau dans le coin → tout Kanto. Arènes (9 = la Ligue) :
    arrêt jusqu'au défi (7 derniers jours depuis l'arrivée) ou son **plan B** (6 jours sur 7 avec l'objectif : jamais
    bloquant) ; les points continuent de s'accumuler et on repart d'un coup. Badge = Hyper Ball `badgeN` du type du
    champion, espèce nouvelle ; Ligue = Master Ball `ligue` (légendaire). Rejoué chaque fois, rien d'enregistré ;
    chaque capture a son `lieu`. Écran : **carte = image pixel art** `cartes/kanto.webp` (générée par Kiki avec ChatGPT,
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
  - **Parties** (`REGLAGES` `debut` + `partie`) : partie 1 du 19/10 au 26/10 ; **partie 2 depuis le 27/10** (Kiki
    a tout remis à zéro pour régler le jeu ; il recommencera une partie 3 avec ses amis). Recommencer = nouvelle date
    `debut` + `partie` + 1 : rien de l'ancienne partie ne revient (les données santé ne bougent pas).
  - Identifiants `ident(jour, cle)` = « 2026-10-27-p2#poke3 / super / hyper / master1 / badge1 / ligue / chen »
    (partie 1 : sans « -p1 ») = graines (rejouable) ; les captures figées et les balls ouvertes d'une autre partie
    sont ignorées (autre identifiant). « ! » du champion vu : `pkm_chef_vu_<partie>_<N>`. Le calcul de la montre (GitHub Actions, chaque heure) fige **toutes** les captures,
    aujourd'hui compris (27/10 : avant, seulement les jours finis, et une ball ouverte changeait de Pokémon dans la
    journée car le tirage dépend des types de la barre et des balls gagnées plus tard) →
    `data/pokemon/captures_v2.json` (avant le 25/10 : la tâche du coach, `pokemon.py figer DATA`) (l'ancien `captures.json` du prototype n'est plus lu).
  - Écran : barre d'effort (anneau), Poké Balls à ouvrir, voyage, balls spéciales du jour, dernières captures, Pokédex
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
    il y a des balls ; toucher = ouverture, sinon espace Pokémon), `BasComplication` = case libre (LONG_TEXT, **jamais de Pokémon**, choix de Kiki :
    notification utile < 30 min (`Notifs`, autorisation par le shell de Bugjaeger : `cmd notification allow_listener
    fr.kiki.pokemontre/fr.kiki.pokemontre.Notifs`) > rendez-vous dans les 3 h > nuit l'heure après le lever >
    rendez-vous plus tard ; sinon la case reste vide, choix de Kiki),
    `PokemonActivity` (pages : barre, balls du jour, Pokédex) et `SanteActivity` (activité, cœur et nuit), pages à la
    couronne ou en glissant haut/bas, bouton ↻ (récolte immédiate avec `APPLI_CLE`, puis relecture après ~1 min),
    `OuvrirActivity` (ouverture animée ; ball 3D = images du modèle three.js du téléphone, `assets/ball/*.webp`).
    **Direct** (`Direct.kt`) : Health Services passif (pas, étages, distance, calories du jour, sans batterie en plus) ;
    barre = points du site + ce que la montre a compté depuis l'arrivée des dernières données (les minutes en zone
    restent celles du site). Permissions ACTIVITY_RECOGNITION et READ_CALENDAR demandées à la 1re ouverture.
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
  - **À faire plus tard (demandé par Kiki le 22/10)** : brancher la case libre du bas du cadran sur
    1) **les pronos NFL** (appli Bada Bing, dépôt `kikitmt-bit/bada-bing-nfl`, `pronos_data.json`) : « pronos à faire
    avant dim. 19:00 », toucher = ouvrir le site ; 2) **le padel** (dépôt privé `kikitmt-bit/padel_resa`, script Google) :
    le jour d'une réservation « 18:30 Padel · code 4821 », toucher = ouvrir l'appli du padel sur la montre. Questions
    à poser à Kiki : d'où vient le code (mail du club, SMS, son site) et quelle est l'appli du padel sur la montre.
- Test local : remplacer `requests.get` par la lecture d'un dossier de faux fichiers, puis `runpy.run_path("app.py")`
  avec des secrets factices dans `.streamlit/secrets.toml` du dossier de test ; captures Playwright (`/opt/pw-browsers`).
