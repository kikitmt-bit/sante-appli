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
  Objectifs dans `OBJECTIFS` (5 000 pas, 15 min en zone, 7 h de sommeil). Fichiers gardés 2 min (récents) ou 1 h, 🔄.
- `chiffres.py` : tous les calculs, sans Streamlit (`stats_jour`, `charger`, `dossier_coach`…), partagés par l'appli et
  `coach.py`. `coach.md` = consigne du coach (personnalité, profil, règles, plan) : c'est là qu'on l'affine.
- Coach (sans clé API) : tâche programmée Claude « Coach santé du matin » (5 h 57, heure de Paris), qui arrive dans la
  session Claude Code de Kiki (une session neuve n'a pas accès au dépôt privé) : copie à jour de la branche `data`, `python3 coach.py dossier DATA Jour HIER` (consigne + données + 3 analyses
  précédentes), écrit l'analyse, puis `coach.py enregistrer …` → `data/coach/jour/AAAA/AAAA-MM-JJ.json`
  ({periode, debut, fin, ecrit, texte}) ; le lundi aussi `Semaine` (fichier au nom du lundi), le 1er `Mois`
  (`data/coach/mois/AAAA-MM.json`). L'appli affiche en haut l'analyse d'hier (ou de la semaine / du mois précédent)
  et le bouton 📋 (`bouton_copier`, petit composant HTML) pour une analyse poussée dans Claude.
- **Pokémon** (`pokedex.py` noms/types des 151, `versions.json` liste des images, `pokemon.py` règles et `REGLAGES`,
  `ecran_pokemon.py` l'onglet) : `MISSIONS` du jour (cadeau, nuit de 7 h, paliers de pas, marche dehors 20 min,
  10 étages, minutes en zone, vélo, rameur), chacune = une capture avec ses types favoris (80 %), plus un légendaire
  tous les 30 jours de série ; tirage avec une graine = identifiant « jour#mission » (rejouable). Pokédex remis à
  zéro le 19/10 (`REGLAGES["debut"]`).
  Chaque matin, la tâche du coach lance aussi `python3 pokemon.py figer DATA` → `data/pokemon/captures.json` (jours
  passés figés, jamais modifiés). Images dans la branche **`sprites`** du dépôt privé (`paquets/vignettes.json`,
  `paquets/NNN.json` en base64), lues avec le préfixe `sprites:` dans `lire` et gardées sans limite. Animation et
  Pokédex = composants HTML (`components.html`) qui s'agrandissent eux-mêmes (`window.frameElement`) ; les Poké Balls
  ouvertes sont retenues dans le localStorage du téléphone.
- Test local : remplacer `requests.get` par la lecture d'un dossier de faux fichiers, puis `runpy.run_path("app.py")`
  avec des secrets factices dans `.streamlit/secrets.toml` du dossier de test ; captures Playwright (`/opt/pw-browsers`).
