# Ma santé (appli) — notes pour Claude

Appli Streamlit perso de Kiki (pas développeur, réponses en français, simples). **Dépôt PUBLIC** : code seulement,
jamais de données, de jeton ni de mot de passe ici. Les données et le script de récolte (Apps Script `sante.gs`) sont dans
le dépôt **privé** `kikitmt-bit/sante` (branche `data`, format décrit dans son CLAUDE.md) ; l'appli les lit par l'API
GitHub avec les secrets `GITHUB_TOKEN`, `GITHUB_REPO` (= kikitmt-bit/sante). L'appli est publique sur Streamlit (la seule
appli privée gratuite de Kiki est prise par le padel) : `verrou()` bloque tout sans `APP_PASSWORD`, mémorisé sur le
téléphone (localStorage + cookie `sante_ok` = empreinte). On travaille directement sur `main`.

- `app.py` : une seule page qui défile, onglets « ❤️ Santé » / « 🎮 Pokémon » (à venir). Filtre en haut : Jour / 7 jours
  / Semaine / Mois / Année + date et ◀ ▶. Sections Activité, Séances, Sommeil, Cœur, Poids, puis « 🧠 Le coach » et les
  données brutes (interrupteur, pour Claude). Les chiffres viennent des **résumés annuels** (`data/resume/AAAA.json`,
  `stats_jour`), donc l'année entière se charge vite ; les fichiers du jour servent aux courbes de la vue Jour.
  Comparaison : 7 jours d'avant (vue Jour) ou période précédente de même longueur. Minutes en zone = zone modérée ×1 +
  intense/pic ×2 (l'Inspire HR ne donne pas les minutes en zone officielles ; ni étages ni SpO2 non plus).
  Objectifs dans `OBJECTIFS` (5 000 pas, 15 min en zone, 7 h de sommeil). Fichiers gardés 2 min (récents) ou 1 h, 🔄.
- Coach : Claude (`claude-opus-5-5`, effort medium, repli serveur `fallbacks="default"`), seulement au clic, réponse
  gardée en mémoire tant que les données ne changent pas (~2 000 jetons envoyés). Secrets `ANTHROPIC_API_KEY`
  (sans lui, simple message) et `COACH_CONTEXTE` (facultatif, remplace le profil par défaut `COACH_CONTEXTE`).
- Test local : remplacer `requests.get` par la lecture d'un dossier de faux fichiers, puis `runpy.run_path("app.py")`
  avec des secrets factices dans `.streamlit/secrets.toml` du dossier de test ; captures Playwright (`/opt/pw-browsers`).
