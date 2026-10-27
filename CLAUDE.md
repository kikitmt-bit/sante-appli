# Ma santé (appli) — notes pour Claude

Appli Streamlit perso de Kiki (pas développeur, réponses en français, simples). **Dépôt PUBLIC** : code seulement,
jamais de données, de jeton ni de mot de passe ici. Les données et le script de récolte (Apps Script `sante.gs`) sont dans
le dépôt **privé** `kikitmt-bit/sante` (branche `data`, format décrit dans son CLAUDE.md) ; l'appli les lit par l'API
GitHub avec les secrets `GITHUB_TOKEN`, `GITHUB_REPO` (= kikitmt-bit/sante). L'appli est publique sur Streamlit (la seule
appli privée gratuite de Kiki est prise par le padel) : `verrou()` bloque tout sans `APP_PASSWORD`, mémorisé sur le
téléphone (localStorage + cookie `sante_ok` = empreinte). On travaille directement sur `main`.

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
- **Pokémon v2** (22/10, plus un prototype : **jamais de Pokémon offert**, tout se gagne en faisant du sport).
  `pokedex.py` noms/types des 151, `versions.json` liste des images, `pokemon.py` règles (`REGLAGES`, `BALLS`,
  `SOURCES`, `SPORTS`), `ecran_pokemon.py` prépare les données, `pokemon_ui.html` = tout l'onglet (un seul composant).
  - Barre d'effort (100 points, ne se vide jamais) : 1 pt / 100 pas au-delà de 2 000, 2 pts / min en zone, 1 / étage,
    1 / min de séance (≥ 10 min). Barre pleine = Poké Ball ; ses types = ce qui a le plus rempli la barre du jour hors
    pas (`origine_barre`), sinon tous. Super Ball = 5 000 pas ET 15 min en zone ; Hyper Ball = 10 000 pas, 30 min en
    zone ou séance de 45 min ; Master Ball = 30 jours de série (5 000 pas ou 15 min, joker hebdo) = légendaire.
    Nuit de 7 h = shiny ×1,5 ce jour-là (pas de ball). Jamais de doublon.
  - Identifiants « jour#poke3 / super / hyper / master30 » = graines (rejouable). Règles v2 rejouées depuis le 19/10
    avec les vraies données. Le calcul de la montre (GitHub Actions, chaque heure) fige **toutes** les captures,
    aujourd'hui compris (27/10 : avant, seulement les jours finis, et une ball ouverte changeait de Pokémon dans la
    journée car le tirage dépend des types de la barre et des balls gagnées plus tard) →
    `data/pokemon/captures_v2.json` (avant le 25/10 : la tâche du coach, `pokemon.py figer DATA`) (l'ancien `captures.json` du prototype n'est plus lu).
  - Écran : barre d'effort (anneau), Poké Balls à ouvrir, balls spéciales du jour, dernières captures, Pokédex (filtres,
    types, recherche, fiche en feuille qui monte du bas avec versions manquantes et « Où le trouver »).
    Ouverture = calque plein écran dans la page parente : Poké Ball **3D** (three.js 0.160 UMD depuis jsDelivr, repli SVG
    sinon) qui tombe, attend qu'on la touche, secousses (4 si rare), clic, lueur selon la rareté, ouverture, faisceau,
    silhouette puis couleurs ; nouveau = confettis + fanfare, shiny = or + étincelles, légendaire = violet. Sons
    synthétisés (WebAudio, bouton 🔊), vibrations. Les Poké Balls ouvertes sont dans le localStorage
    (`pkm2_ouvertes`, celles de plus de 14 jours comptent ouvertes) et le Pokédex ne montre que les ouvertes.
  - Images sans leurs bords transparents (`rogne`, `rognerImages`) : X/Y, Soleil/Lune… ont de grandes marges.
  - Images dans la branche **`sprites`** du dépôt privé (`paquets/vignettes.json`, `paquets/NNN.json` en base64),
    lues avec le préfixe `sprites:` dans `lire` et gardées sans limite.
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
