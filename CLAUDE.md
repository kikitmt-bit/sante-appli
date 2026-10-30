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
  **Décors de capture (30/10, 1er : hautes herbes)** : `FONDS` (image `scenes/fond-*.webp`, centre du rond de sol
  `ovale`, `rayon`, `vent`) et `LIEU_FOND` (lieu de la capture → fond ; légendaires exclus pour l'instant). Dans
  `ouvrir` : classe `habitat`, décor pleine hauteur centré (+ copie floue sur les côtés) qui apparaît en **mosaïque**
  (`mosaique` : gros pixels qui s'affinent, transition GBA, valable pour tous les fonds), zoom arrière, oiseau au loin,
  feuilles et pollen au vent (`ventAnime`). **Ball** : la ball 3D habituelle (toute son animation) rendue en **gros pixels** (`Ball3D(…, pixel)` :
  `setPixelRatio(.2)`, sans antialiasing, `image-rendering: pixelated`, moins brillante) ; Kiki 30/10 : la ball 2D en
  sprite était « horrible », la 3D lisse jurait avec le décor. Repli sans three.js : `BallPixel` (sprite du jeu `IC[c.ball]` agrandi : quarts de tour pendant
  la chute, écrasement à l'atterrissage (`ecrase`), secousses autour du point d'appui, bouton qui s'allume, couvercle
  (moitié haute du sprite) qui s'ouvre sur une lumière + faisceau, puis flash et silhouette du Pokémon ; Kiki 30/10 : la ball 3D lisse jurait avec le décor) qui tombe
  sur le rond (ombre `ombre-ball`), le Pokémon se pose sur le rond (`--py`) avec ombre et lueur au sol ; **pas de rayons
  qui tournent** dans un décor (« ringard »). Refusé par Kiki : les hautes herbes qui s'écartent (« bas de gamme », pas
  déclinable). Aperçu : « Comment ça marche ? » → « Tester les captures » (`apercuCapture`, `apercu: true`, jamais gardé).
  Les 10 autres fonds et les 5 des légendaires sont dans le cerveau (`projets/sante/captures/`).
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
    **Pesée** (29/10, Kiki oublie de se peser) : `REGLAGES` `pesee_avant` = 12 h (heure locale de la balance,
    `pesees_du_jour` lit les points bruts `weight` / `body-fat` des résumés) ; chaque pesée du matin = **+10 points
    d'effort** (`bonus_pesee`, une par jour ; plus de Poké Ball : « trop bien comme cadeau ») ; objectif affiché 3 / semaine.
    **Mission du jour** (29/10, `missions.py`, 6e tuile `carteMission`) : une mission par jour (dès le 30/10) choisie sur
    les lacunes des 14 derniers jours (la moins réussie, pas deux fois de suite si une autre est presque aussi faible) :
    matinée active 2 000 pas avant 13 h (lun-ven), coucher avant 0 h 30 (soirs dim-jeu, vérifié le lendemain matin),
    10 min en zone, séance de 10 min ; pas d'étages ni de pauses toutes les 2 h (appartement, télétravail : refusés
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
    **Plus de vue d'ensemble ni de défilement libre** (29/10, Kiki : la carte se découvre au fur et à mesure) : toujours
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
  - **Parties** (`REGLAGES` `debut` + `partie`) : partie 1 du 19/10 au 26/10 ; **partie 3 depuis le 27/10** (Kiki
    a tout remis à zéro pour régler le jeu, la 2 n'a duré que quelques heures ; nouvelle partie avec ses amis plus tard). Recommencer = nouvelle date
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
- Test local : remplacer `requests.get` par la lecture d'un dossier de faux fichiers, puis `runpy.run_path("app.py")`
  avec des secrets factices dans `.streamlit/secrets.toml` du dossier de test ; captures Playwright (`/opt/pw-browsers`).
