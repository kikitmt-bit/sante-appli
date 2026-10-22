# Ma santé (appli) — notes pour Claude

Appli Streamlit perso de Kiki (pas développeur, réponses en français, simples). **Dépôt PUBLIC** : code seulement,
jamais de données, de jeton ni de mot de passe ici. Les données et le script de récolte (Apps Script `sante.gs`) sont dans
le dépôt **privé** `kikitmt-bit/sante` (branche `data`, format décrit dans son CLAUDE.md) ; l'appli les lit par l'API
GitHub avec les secrets `GITHUB_TOKEN`, `GITHUB_REPO` (= kikitmt-bit/sante). L'appli est publique sur Streamlit (la seule
appli privée gratuite de Kiki est prise par le padel) : `verrou()` bloque tout sans `APP_PASSWORD`, mémorisé sur le
téléphone (localStorage + cookie `sante_ok` = empreinte). On travaille directement sur `main`.

- `app.py` : une seule page qui défile, sans la barre Streamlit du haut ni titre (CSS) ; onglets « ❤️ Santé »,
  « 🎮 Pokémon » (à venir), « ⚙️ Configuration » (données brutes, oublier ce téléphone). Filtre en haut : Jour / 7 jours
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
- Coach (sans clé API) : tâche programmée Claude « Coach santé du matin » (5 h 57, heure de Paris), qui arrive dans la
  session Claude Code de Kiki (une session neuve n'a pas accès au dépôt privé) : copie à jour de la branche `data`, `python3 coach.py dossier DATA Jour HIER` (consigne + données + 3 analyses
  précédentes), écrit l'analyse, puis `coach.py enregistrer …` → `data/coach/jour/AAAA/AAAA-MM-JJ.json`
  ({periode, debut, fin, ecrit, texte}) ; le lundi aussi `Semaine` (fichier au nom du lundi), le 1er `Mois`
  (`data/coach/mois/AAAA-MM.json`). L'appli affiche en haut l'analyse d'hier (ou de la semaine / du mois précédent)
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
    avec les vraies données. Chaque matin, la tâche du coach lance `python3 pokemon.py figer DATA` →
    `data/pokemon/captures_v2.json` (l'ancien `captures.json` du prototype n'est plus lu).
  - Écran : barre d'effort (anneau), Poké Balls à ouvrir, balls spéciales du jour, dernières captures, Pokédex (filtres,
    types, recherche, fiche en feuille qui monte du bas avec versions manquantes et « Où le trouver »).
    Ouverture = calque plein écran dans la page parente : Poké Ball **3D** (three.js 0.160 UMD depuis jsDelivr, repli SVG
    sinon) qui tombe, attend qu'on la touche, secousses (4 si rare), clic, lueur selon la rareté, ouverture, faisceau,
    silhouette puis couleurs ; nouveau = confettis + fanfare, shiny = or + étincelles, légendaire = violet. Sons
    synthétisés (WebAudio, bouton 🔊), vibrations. Les Poké Balls ouvertes sont dans le localStorage
    (`pkm2_ouvertes`, celles de plus de 14 jours comptent ouvertes) et le Pokédex ne montre que les ouvertes.
  - Images dans la branche **`sprites`** du dépôt privé (`paquets/vignettes.json`, `paquets/NNN.json` en base64),
    lues avec le préfixe `sprites:` dans `lire` et gardées sans limite.
  - Idée en attente : cadran de la Pixel Watch avec la barre d'effort et l'ouverture des balls (projet Wear OS à part).
- Test local : remplacer `requests.get` par la lecture d'un dossier de faux fichiers, puis `runpy.run_path("app.py")`
  avec des secrets factices dans `.streamlit/secrets.toml` du dossier de test ; captures Playwright (`/opt/pw-browsers`).
