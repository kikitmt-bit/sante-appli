# « La Rivière » : contre-expertise du moteur (11/11/2026)

Rapport de Claude (Fable 5.2), à la demande de Kiki. **Rien n'a été modifié dans le projet** : ce fichier est le seul ajout, sans commit.
Copie vérifiée à jour (`git fetch`, `git status -sb`) avant de commencer.

**Suite donnée (11/11 au soir, avec l'accord de Kiki)** : les étapes 0, 1, 2 et 3 du plan sont faites (voir `MOTEUR.md` et CLAUDE.md). Ce rapport décrit l'état du moteur AVANT ces travaux.

---

## 1. Mon verdict en quelques lignes

**On garde ce moteur, on ne repart pas de zéro.** Il est petit (108 Ko de code, 14 fichiers), rapide, et ses bonnes idées sont les
bonnes pour dix ans : un niveau = un fichier, une région = un fichier, tout le décor fait par le code, tout déduit de la ligne de la piste.

Mais **trois pièces du cœur sont à refaire**, et c'est bien un travail de fond :
1. la piste doit devenir une vraie ligne en 3D (aujourd'hui elle est à plat) ;
2. le terrain doit être calculé autrement (aujourd'hui il « copie » le point de piste le plus proche, ce qui casse dès qu'on serre un virage, qu'on monte ou qu'on se croise) ;
3. le moteur et le jeu doivent être séparés (aujourd'hui, rameur, eau, montre et Pokémon sont mélangés partout).

L'audit d'Opus a **vu juste sur presque tous ses constats**, mais il se trompe sur la cause de l'ennui, il oublie plusieurs choses
importantes (le son, le téléphone, des bugs), et son ordre de travail n'est pas le meilleur.

### Mes 5 points principaux

1. **Le circuit est ennuyeux d'abord à cause du dessin du niveau, pas du moteur.** Mesuré : ses virages ont des rayons de 132 à 630 m,
   alors que le moteur accepte déjà 23 m. On utilise un sixième de ce qui est permis. Lever la limite est utile, mais ce n'est pas elle qui endort.
2. **Le terrain est le vrai point faible.** Il a déjà 380 cassures (des murs jusqu'à 13 m de haut), cachées loin de l'eau. Avec des
   virages serrés, des côtes ou des croisements, elles viendraient au bord de la piste. Il faut changer la méthode, pas la rafistoler.
3. **Quand on ne dirige pas, le plaisir vient du rythme** : un décor qui accélère dans les descentes (sans toucher aux vrais chiffres),
   une caméra mise en scène, de vrais sauts, et **du son** (il n'y en a aucun aujourd'hui, et personne ne l'a relevé).
4. **Ce PC est ta tablette**, donc j'ai pu la mesurer : une image coûte environ 10 millièmes de seconde sur 16 disponibles. Elle tient
   60 images/s avec un tiers de marge. Le téléphone reste à mesurer, et j'y ai trouvé 4 problèmes sûrs avant même d'essayer.
5. **Le partage Fable / Opus est bon dans l'idée**, à une condition : que le cœur offre des « prises » sous forme de dossiers de
   fichiers (objets, modules, événements, ambiances) et des contrôles automatiques. Sans ça, n'importe quel modèle retouchera le cœur.

---

## 2. Ce que j'ai fait

- Lu une fois tout `riviere/` (code, niveaux, région, lieux), `CAPTEUR.md`, `tests/test_riviere.py`, et le branchement dans `app.py` et `seances_rameur.py`.
- Lancé le serveur d'essai et mesuré sur ce PC, qui est le Xiaomi Book S (Snapdragon 8cx Gen 2, Adreno 685, écran 2560 × 1600 à 60 Hz).
- Pris des captures à 8 endroits du circuit, en paysage, en téléphone portrait et en téléphone paysage.

**Limite de mes mesures** : le panneau de navigateur de l'appli Claude bride l'affichage à 30 images/s quand il est masqué. Je n'ai donc
pas pu compter les images par seconde « en vrai ». J'ai mesuré à la place **le coût réel de chaque image**, ce qui est plus fiable.
Je n'ai pas pu essayer : le téléphone, une vraie séance avec la montre, ni la page dans l'appli Streamlit.

### Les chiffres (tablette, image de 960 × 720)

| Mesure | Résultat |
|---|---|
| Coût d'une image | 8,4 à 11,3 ms selon l'endroit (budget à 60 images/s : 16,7 ms) |
| Ce que coûtent les triangles | environ 2,5 ms pour 100 000 triangles |
| Triangles à l'écran | 42 000 (mer) à 157 000 (Route 1) |
| Triangles du monde entier | 354 000 : décor 171 000, terrain 107 000, rives 49 000, eau 24 000 |
| Ce que coûte chaque partie | eau 1,9 ms, décor 1,8 ms, terrain 1,5 ms, rives 1,2 ms, contour 0,9 ms, Pokémon 0,5 ms |
| Calculs du jeu (hors dessin) | 0,3 ms : négligeable |
| Construction du monde | 1,2 s |
| Poids de la page | 300 Ko, dont 171 Ko de sprites et 108 Ko de code |
| Mémoire | 50 Mo |

En plein écran sur la tablette (1152 × 720), compte environ 11 à 12 ms : ça passe, avec de la marge pour **doubler** le décor, pas plus,
sans changer de technique.

---

## 3. L'audit d'Opus, point par point

### Ce qu'il a juste (vérifié dans le code)

| Constat d'Opus | Mon avis |
|---|---|
| La piste n'a pas d'altitude, l'eau est à zéro partout | **Juste.** Aucune côte ni descente possible aujourd'hui. |
| Une seule surface, l'eau | **Juste.** Les rives partent de 0,8 m sous l'eau, le nageur est enfoncé, le sillage est dessiné par l'eau elle-même. |
| Les sauts sont faux | **Juste.** Seul le Pokémon monte, la caméra ne bouge pas. |
| Soleil fixe, ciel peint une fois, rien au-delà de 420 m | **Juste.** |
| Hautes herbes figées, pas de vraie ombre | **Juste.** |
| Chaque Pokémon a sa propre image en mémoire et son propre objet | **Juste** (84 Pokémon, 84 images, 84 objets). Coût mesuré aujourd'hui : faible (0,5 ms). Ça ne gênera qu'avec beaucoup plus de Pokémon. |
| Le joueur est toujours au centre, une seule entrée (des coups) | **Juste**, mais pas grave (voir plus bas). |
| Moteur et jeu mélangés, lignes très denses | **Juste.** |
| Ne pas changer de style maintenant | **D'accord.** |

### Ce qu'il a faux ou exagéré

- **« Les virages serrés sont interdits. »** C'est vrai en dessous de 23 m de rayon, mais **le circuit actuel ne descend jamais sous
  132 m**. La limite du moteur n'est pas la cause de la monotonie. On peut dessiner dès aujourd'hui des épingles et des S cinq fois plus serrés.
- **« Aucun croisement possible. »** Exagéré. Le tunnel fait déjà du « dessus / dessous » : la montagne passe au-dessus de la rivière.
  Un pont, c'est la même astuce à l'envers. Ce qui manque, c'est l'altitude et un terrain qui sache ignorer un pont.
- **La cause des virages interdits.** Ce n'est pas vraiment « le point le plus proche ». C'est le ruban des rives : il fait 13,5 m de
  large, et à l'intérieur d'un virage serré il se replie sur lui-même. D'où la règle « rayon > demi-largeur + 18 m ». Ça se corrige proprement.
- **« La couche lointaine (volcan) est un chantier. »** Surestimé. Le ciel a déjà sa propre passe de dessin avec sa propre caméra :
  y ajouter un volcan est simple. De même le soleil est déjà un réglage partagé, donc facile à faire bouger.

### Ce qu'il a sous-estimé

- **Le terrain.** Il le cite, mais ne dit pas qu'il est **déjà cassé** : 380 marches de plus de 2,50 m entre deux points voisins,
  jusqu'à 13 m, là où deux bouts du circuit se font face. On ne les voit pas parce qu'elles sont à plus de 100 m de l'eau, dans la brume.
- **Une rivière en boucle ne peut pas descendre.** Si elle descend, il faut qu'elle remonte quelque part. Il faut une réponse de jeu
  (voir mes idées : la Cascade), sinon les descentes de rivière n'existent que sur des parcours d'un point à un autre.
- **La séparation moteur / jeu et les surfaces.** C'est le plus gros morceau, plus gros que l'altitude.

### Ce qu'il a oublié

1. **Le son.** Il n'y en a pas du tout dans ce moteur. Pour un jeu où l'on ne dirige pas, c'est la moitié de la sensation de vitesse.
2. **Le rythme.** Rien sur la façon de rendre un parcours amusant sans volant : c'est pourtant ta priorité.
3. **Le téléphone.** Rien sur l'écran à 120 images/s, le mode portrait, la veille, la chaleur.
4. **Les bugs** (liste complète en annexe). Les plus importants :
   - **La qualité s'effondre pour rien.** Si l'écran est bridé à 30 images/s (économie d'énergie), le jeu croit que la machine peine :
     il descend l'image à 432 pixels et rapproche la brume à 180 m, **et ne remonte jamais**. Je l'ai vu se produire pendant mes essais.
   - **Les coups perdus ne sont pas rattrapés.** Chaque coup de la montre porte son numéro. Si un message se perd, le jeu pourrait
     voir le trou et rattraper. Il ne le fait pas : ce coup et ses 9 mètres sont perdus.
   - **En portrait, l'image est écrasée** de 23 %, et la moitié de l'écran est du ciel.
   - **L'écran peut s'éteindre** : la demande « reste allumé » n'est faite qu'une fois, et se perd dès qu'on quitte la page un instant.
5. **Les contrôles automatiques ne lancent jamais le jeu.** Ils lisent les fichiers, c'est tout. Le bug du 11/11 (un commentaire qui
   avalait deux instructions) ne pouvait pas être vu. C'est déjà arrivé deux fois : ça reviendra tant que rien ne le surveille.
6. **La fermeture de la boucle déforme le dessin.** Pour refermer le circuit, le calcul a allongé le lac de 28 % et raccourci la
   Route 1 de 12 %. Avec des épingles et des chicanes, ce sera pire : il faut une pièce de raccord calculée, qui laisse les autres intactes.
7. **Les relais publics.** Les coups et le cœur passent par deux serveurs publics. Le nom du canal est secret, mais quelqu'un qui écoute
   tout le serveur peut les voir (sans savoir à qui ils sont) et pourrait même envoyer de faux coups. Sans gravité aujourd'hui, à ne pas
   garder des années. Le Bluetooth direct de `CAPTEUR.md` reste le bon but.
8. **Un chargement inutile.** Pour ouvrir La Rivière, l'appli calcule toute ta partie Poké Fit et lit ta carte de dresseur, alors que
   ce moteur ne s'en sert pas. En 4G au parc, c'est du temps perdu à chaque ouverture et à chaque enregistrement.

---

## 4. Faut-il repartir sur une autre base ?

**Non.** J'ai regardé quatre pistes :

| Piste | Ce qu'on gagnerait | Ce qu'on perdrait | Avis |
|---|---|---|---|
| Un vrai moteur de jeu (Godot, Unity, Babylon) | des outils tout faits (éditeur, physique) | la page unique assemblée par `page.py`, la légèreté (Godot : 30 Mo à charger en 4G), la facilité pour Claude de tout lire | **Non.** Ce qui est difficile chez nous (piste, terrain, modules) n'existe dans aucun moteur. |
| Une version récente de three.js | quelques outils pour dessiner beaucoup d'objets | une demi-journée de réglages, les couleurs à recaler | **Pas maintenant.** Rien ne nous bloque avec la version actuelle. À revoir à l'étape « densité », et seulement si ça aide. |
| Une autre forme de rendu (pseudo-3D, voxels) | rien | le style qui te plaît | **Non.** Déjà essayé et rejeté. |
| Le terrain d'abord, la piste creusée ensuite | des paysages plus libres | des niveaux lourds à écrire, un générateur difficile | **Non.** Comme on ne dirige pas, tout ce qu'on voit est près de la piste : partir de la piste reste le bon choix. |

Ce qu'on garde tel quel : les formats de fichiers, le kit d'objets, l'eau, le style, la séance, la montre, le fantôme, le plan.

---

## 5. Mon architecture pour les années à venir

### L'idée centrale : le jeu est un rail

On ne dirige jamais. Le monde entier se déduit donc d'**une seule ligne**, et la position du joueur est un seul nombre : sa distance
le long de la ligne. C'est déjà le principe du moteur, et il est bon. Il faut seulement que cette ligne soit plus riche.

### Les six briques

**1. La piste : une ligne en 3D.** À chaque mètre : la position, **la hauteur**, la direction, la pente, la largeur, la surface,
l'étage (au sol, sur un pont, dans un tunnel), les rives, et la vitesse du décor à cet endroit. Dans un fichier de niveau, une pièce
reçoit de nouveaux réglages facultatifs : `monte` (mètres de montée), `surface`, `pont`, `allure`, `camera`. **Un ancien fichier, qui
ne les a pas, donne exactement le même circuit qu'aujourd'hui.**

**2. Le terrain : un vote au lieu d'une copie.** Aujourd'hui, chaque point du sol copie le point de piste le plus proche. Demain, tous
les points de piste voisins « votent » pour la hauteur du sol, les plus proches comptant le plus. Conséquences : plus de cassures,
les virages serrés fonctionnent, les côtes aussi, et un pont ne vote pas pour le sol, donc on peut passer dessous. Les rives nettes
(bord de l'eau, quais, falaises) restent dessinées par le ruban actuel, qui se rétrécit tout seul à l'intérieur d'une épingle au lieu
de se replier. Nouvelle règle de dessin : rayon > demi-largeur de la piste + 1 m, au lieu de + 18 m.

**3. Les surfaces.** Eau, terre, goudron, herbe, pont de bois, aqueduc (de l'eau sur un pont). Une surface = une façon de dessiner le
ruban de la piste, son bord, ses éclaboussures ou sa poussière, et son bruit. Une surface = un fichier.

**4. Les montures.** Nageur, coureur, plus tard vélo. Une monture = quel dessin, à quelle hauteur (enfoncé dans l'eau ou posé sur le
sol), quelle trace derrière, comment elle saute. Bonne nouvelle : le même Pokémon qui « marche de dos » sert déjà de nageur ; sur la
terre, il court, sans rien dessiner de plus.

**5. Les capteurs.** Le jeu ne doit plus connaître « des coups de 9 m ». Il reçoit soit des **impulsions** (un coup de rame, un tour
d'elliptique : tant de mètres chacun), soit une **vitesse continue** (home trainer). Une petite fiche par machine : son unité, son
calibrage, ses records à part. La pente de la piste pourra repartir vers le home trainer.

**6. Le contenu, par dossiers.** C'est ce qui rend l'ajout simple, et ce qui protège le cœur :

```
riviere/
  moteur/      piste, terrain, surfaces, rendu, caméra, décor, événements, son   ← le cœur, ne connaît ni Pokémon ni montre
  jeu/         séance, menu, affichage, fantôme, plan, capteurs, enregistrement  ← le jeu
  contenu/
    niveaux/   un circuit = un fichier (une liste de modules)
    modules/   un module = un fichier (gorges, port, épingle, rapides…)
    regions/   une région = un fichier (couleurs, rives, règles de décor)
    lieux/     un lieu = décrit une fois
    objets/    un objet = un fichier (une petite recette)
    evenements/, surfaces/, montures/, ambiances/
```

`page.py` ramasse tout ce qu'il trouve dans ces dossiers. **Ajouter un module, un objet ou un événement = déposer un fichier.**

### Un module, concrètement

Un module est un petit morceau de circuit prêt à poser : une ou plusieurs pièces, avec leur relief, leurs rives, leur décor, leurs
événements, et des **étiquettes** : ouvert ou fermé, clair ou sombre, ville ou nature, calme ou spectaculaire. Un niveau devient une
liste courte : « ligne droite du port, épingle, gorges, cascade, lac, forêt dense… ». Les étiquettes servent à contrôler tout seul
que deux modules voisins contrastent.

### L'éditeur et le générateur

Les deux se branchent sur les mêmes fichiers, sans rien ajouter au cœur :
- **L'éditeur** : une page avec le circuit vu du ciel (la vue existe déjà), où l'on ajoute, déplace et règle des modules, avec le
  jeu qui se reconstruit en direct (1,2 s aujourd'hui). Il produit le fichier du niveau.
- **Le générateur** : une graine, il tire des modules en respectant les contrastes, referme la boucle avec la pièce de raccord, puis
  passe le contrôleur (pas de croisement au même étage, pentes et rayons corrects). S'il échoue, il retire.

---

## 6. Rendre un circuit amusant quand on ne dirige pas

Ta règle « paysage qui change toutes les 20 à 40 secondes » donne, à ton allure, **un module tous les 80 à 170 vrais mètres**, soit
15 à 20 séquences différentes par tour de 2 km. Le circuit actuel en a 10, qui se ressemblent presque toutes (5 de mes 6 captures
montrent la même image : eau bleue, rives vertes, arbres).

Les outils, du plus efficace au moins efficace :

1. **Le décor qui change de vitesse.** Chaque pièce a sa propre « allure » : le décor file 1,5 fois plus vite dans une descente ou
   des rapides, ralentit dans une côte ou sur un lac. **Les vrais chiffres ne bougent pas**, et un tour fait toujours le même nombre
   de vrais mètres, donc les records restent justes. C'est ta règle « seul le décor triche », appliquée morceau par morceau.
2. **La caméra mise en scène.** Elle s'incline dans les virages, descend au ras de l'eau dans les gorges, s'élève au-dessus d'un lac,
   suit vraiment un saut, se tourne un instant vers un repère (le volcan). Aujourd'hui elle est fixe.
3. **Le son.** L'eau qui file plus aigu quand on accélère, le vent, l'éclaboussure calée sur chaque coup, l'écho d'une grotte, et une
   musique qui s'étoffe avec la cadence.
4. **La trajectoire.** Le Pokémon prend la corde dans les virages et se penche, au lieu de rester au milieu. C'est un simple calcul, mais ça donne vie.
5. **Les passages forts.** Vrai saut d'un tremplin, chute d'une cascade, sortie de tunnel éblouissante, passage sous un pont puis
   dessus, gouttes sur l'écran dans les rapides.
6. **Le resserrement.** Une piste étroite entre deux parois donne une impression de vitesse bien plus forte qu'un lac. Alterner.
7. **L'effort comme seule commande.** Des zones de sprint (une porte, puis 100 m où dépasser son rythme de croisière déclenche un
   effet et une étoile), un Pokémon « lièvre » à suivre, un rival à tenir.
8. **Les surprises du jour.** Un Pokémon rare qui n'apparaît que certains jours, à un endroit qui change : une raison de regarder.

---

## 7. Mes idées en plus

1. **La Cascade, pour boucler une rivière qui descend.** Dans Pokémon, la capacité Cascade sert à *remonter* une chute d'eau. Le
   circuit descend en rapides pendant 1 800 m, puis ton Pokémon remonte une grande cascade en quelques secondes, dans une gerbe d'eau.
   C'est spectaculaire, fidèle à l'univers, et ça résout le problème de la boucle. Sur terre : un télésiège, un ascenseur de grotte.
2. **L'embranchement à l'effort.** À une fourche, si tu arrives au-dessus de ton rythme de croisière, tu prends le tremplin et la
   voie du haut ; sinon la voie du bas. Les deux font la même longueur. C'est le seul « volant » honnête d'une machine de sport.
3. **La séance a un arc.** L'heure du jour avance avec la séance : on part le matin, on finit au coucher du soleil après 30 minutes.
   Chaque tour a donc sa lumière, sans rien dessiner de plus. Au parc, on peut aussi prendre la vraie météo.
4. **La forêt en masse.** Au-delà de 40 m, remplacer les arbres un par un par une grande nappe bosselée couleur feuillage. Le décor
   paraît beaucoup plus dense pour beaucoup moins cher : le décor est le plus gros poste du monde (171 000 triangles sur 354 000), et
   les règles de la région posent des arbres jusqu'à 100 m de l'eau (la part exacte des arbres lointains reste à mesurer).
5. **Le circuit est la séance.** Chaque module porte un effort conseillé : les rapides = 30 secondes vite, le lac = on récupère.
   Dessiner un circuit, c'est dessiner un entraînement, sans jamais afficher un programme.
6. **Les fantômes des amis.** L'appli a déjà des amis et une course de la semaine. Le meilleur tour de chacun pourrait nager à côté
   de toi, sans que personne ne soit là en même temps.
7. **La planche et la partition.** Deux contrôles pour que Claude vérifie un circuit sans toi : une planche d'images prises tous les
   50 m, et une « partition » qui montre module par module si le paysage contraste assez. Un circuit monotone se verrait avant que tu rames.
8. **Un grain de pixel régulier.** L'image de 720 pixels est agrandie 2,2 fois sur ta tablette : certains pixels font 2 points de
   large, d'autres 3, ce qui fait frétiller les bords. À 800 pixels (exactement la moitié de l'écran), tous les pixels sont égaux. C'est gratuit.

---

## 8. Les performances sur tes deux écrans

**Tablette** : mesurée, voir le tableau. 60 images/s tenues, un tiers de marge.

**Téléphone** : je ne peux pas le mesurer d'ici. Ce que je sais par le code :

| Problème | Conséquence | Remède |
|---|---|---|
| Ton Pixel affiche jusqu'à 120 images/s, et le jeu dessine autant qu'on lui en demande | deux fois plus de travail, de chaleur et de batterie, pour rien | plafonner à 60, avec un mode « éco » à 30 pour les jours chauds |
| La qualité s'effondre si l'écran est bridé à 30 | image grossière et brume à 180 m pour toute la séance | mesurer le coût de l'image au lieu de compter les images, et savoir remonter |
| Le portrait est écrasé et mal cadré | image déformée | soit un vrai cadrage portrait, soit un message « tourne ton téléphone » |
| L'écran peut s'éteindre | séance coupée | redemander « reste allumé » à chaque retour sur la page, avec le plan B qui existe déjà dans Poké Fit |

**Le vrai risque du parc n'est pas le dessin, c'est le chemin des coups.** Sans Wi-Fi, la montre passe par le téléphone pour
atteindre Internet, puis les coups reviennent au téléphone. Ce détour peut ajouter du retard ou grouper les messages. **À essayer tôt**,
avant de construire quoi que ce soit pour l'elliptique.

**Pour le long terme** : tout le monde est construit et gardé en mémoire d'un coup. Pour un circuit de 2 km, c'est très bien. Au-delà
de 4 à 5 km, ou pour un parcours sans fin, il faudra construire le monde par tronçons devant soi et l'effacer derrière.

**Ce que je propose en premier** : un banc de mesure (`?banc=1`). Le jeu fait un tour tout seul et affiche trois chiffres à la fin.
Tu le lances une fois sur la tablette, une fois sur le téléphone, et on sait enfin où on en est.

---

## 9. La direction artistique : mon avis

**Le style est bon, et tu as raison de l'aimer.** Couleurs unies, lumière en paliers, contour sombre, tout fait par le code : c'est
cohérent, lisible, et ça ne ressemble pas à un jeu amateur. L'eau est la plus belle chose de l'écran. L'affichage des chiffres est propre.

Ce qui affaiblit l'image aujourd'hui, par ordre d'importance :
1. **Tout est plat et vert.** Des rives d'un mètre de haut, aucune silhouette à l'horizon, 90 % de vert et de bleu. Ce n'est pas un
   problème de style, c'est un manque de relief et de palette. L'altitude, les régions aux couleurs franches et les repères lointains le règlent.
2. **Deux grains de pixel.** Le Pokémon a de gros pixels, le monde des pixels trois fois plus fins (depuis ta demande d'une image
   moins pixelisée). Ça ne choque pas, mais ça se voit. À surveiller, pas à corriger d'urgence.
3. **La lumière ne raconte rien.** Toujours midi, toujours beau. L'heure du jour changera plus l'image que n'importe quel décor.

**Paper Mario, Yoshi en diorama** : le style actuel est déjà un diorama, et les Pokémon y sont déjà des figurines plates tournées vers
toi. On peut pousser dans ce sens plus tard (décors « en carton découpé », toujours faits par le code) sans rien jeter. **Je
déconseille de changer maintenant** : le style n'est pas ce qui manque au jeu.

---

## 10. Mon plan, du plus important au moins important

Une « séance » = une conversation de travail comme celles que tu as déjà eues.

| | Étape | Ce que ça permet | Risque | Ce que tu pourras essayer | Qui |
|---|---|---|---|---|---|
| **0** | **Filets de sécurité** : banc de mesure, un contrôle automatique qui lance vraiment le jeu, correction des bugs trouvés (qualité, 120 images/s, coups perdus, veille, portrait) | savoir où on en est sur les deux écrans, ne plus casser sans le voir | faible | le banc sur la tablette et le téléphone ; une séance au rameur plus fiable | Fable ou Opus |
| **0 bis** | *(facultatif, une heure)* **un circuit d'essai sinueux avec le moteur d'aujourd'hui** : épingles à 25 m, S, resserrements | vérifier que les virages changent bien la sensation, avant d'investir | nul | ramer dessus | Opus |
| **1** | **Le cœur** : piste en 3D, terrain par vote, virages serrés, ponts et croisements, pièce de raccord | côtes, descentes, épingles, le circuit en 8 | **le plus élevé** : le circuit actuel doit rester pareil à l'œil (contrôlé par des captures avant / après à 20 endroits) | un petit circuit « montagnes russes » : épingle, chicane, côte, descente, pont au-dessus de soi | **Fable** |
| **2** | **Surfaces, montures, capteurs, séparation moteur / jeu** | la terre ferme, l'elliptique, le rangement par dossiers | moyen : la vraie séance au rameur ne doit pas casser | un circuit de terre où ton Pokémon court ; l'elliptique au parc | **Fable** (la détection des tours sur la montre est un travail à part) |
| **3** | **Le rythme** : allure par pièce, caméra, vrais sauts, événements décrits dans des fichiers, **le son** | la sensation de vitesse, les passages forts | faible | le circuit d'essai, vivant | Fable pour les prises dans le cœur, Opus pour le contenu et le son |
| **4** | **La bibliothèque de modules et le premier vrai circuit varié**, avec la planche et la partition | ta priorité : la variété | faible | un vrai circuit de 2 km à 15 ou 20 séquences | **Opus** |
| **5** | **La densité** : objets répétés à bas coût, forêt en masse, Pokémon regroupés ; monde construit par tronçons | un décor 3 à 4 fois plus dense, des circuits longs | moyen | le même circuit, beaucoup plus habillé, au même nombre d'images/s | Fable pour la technique, Opus pour l'habillage |
| **6** | **Les ambiances** : ciel vivant, heure du jour, météo, volcan au loin, vent dans les herbes | l'image qui change, les tours qui ne se ressemblent pas | faible | une séance du matin au coucher du soleil | **Opus** |
| **7** | **L'éditeur, puis le générateur** | faire des circuits sans Claude, des circuits au hasard | faible | dessiner un circuit toi-même | **Opus** |
| **8** | Home trainer (pente envoyée à la machine), fantômes des amis, embranchements à l'effort, Bluetooth direct | la suite | à voir | | selon le sujet |

### Le partage te paraît-il juste ?

**Oui dans l'ensemble, avec trois retouches :**
- Je prendrais aussi **la technique de la densité** (étape 5) et **les prises du rythme** (étape 3), parce qu'elles touchent au cœur.
- L'étape 0 et le son peuvent très bien aller à Opus.
- Le partage ne tient que si le cœur est livré avec **son mode d'emploi** (`riviere/MOTEUR.md` : ce qu'on a le droit d'ajouter et
  où) et **ses contrôles automatiques**. C'est ça qui protège le cœur, pas le nom du modèle. Je les écrirais à la fin de l'étape 2.

### Là où je change l'ordre d'Opus

- Il met l'éditeur en 3e : je le mets en 7e. Un éditeur fait trop tôt est à refaire à chaque changement de format. La planche
  d'images et la partition rendent le même service bien avant, pour presque rien.
- Il met les capteurs en 6e : je les mets en 2e. C'est un petit travail, et ton elliptique en dépend.
- Il n'a ni étape 0, ni étape « rythme » : ce sont pour moi les deux qui comptent le plus après le cœur.

---

## 11. Les questions où j'ai besoin de tes choix

1. **Par quoi veux-tu commencer ?** Les filets de sécurité et le circuit sinueux d'essai (peu coûteux, tu juges vite), ou directement le cœur ?
2. **La rivière qui remonte** : acceptes-tu qu'une rivière en boucle remonte par une Cascade, comme dans les jeux ? Sinon, les
   descentes de rivière seront des parcours d'un point à un autre, et les boucles à relief seront surtout terrestres.
3. **Le décor qui change de vitesse selon la pièce** : est-ce bien dans l'esprit de ta règle absolue ? (Les chiffres restent vrais,
   un tour garde sa vraie longueur.)
4. **L'elliptique** : téléphone en paysage ou en portrait ? Et comme la machine du parc n'affiche rien, quelle « vraie distance » :
   une convention fixe (tant de mètres par tour de pédale) te convient-elle ?
5. **Le son** : en veux-tu, ou rames-tu avec ta propre musique ? (Bruitages seuls, bruitages et musique, rien.)
6. **Dessiner les circuits** : veux-tu le faire toi-même un jour (éditeur plus tôt), ou les décrire à Claude te suffit (éditeur tard) ?

---
---

# Annexe technique

## A. Bugs et fragilités trouvés (aucun corrigé)

| # | Où | Quoi | Gravité |
|---|---|---|---|
| 1 | `js/jeu.js:61` | La baisse de qualité se fie aux images/s. Un affichage plafonné à 30 (économie d'énergie, onglet bridé) déclenche toute la descente : image 432 px, brume 180 m. Sens unique, jamais de remontée. Observé pendant l'audit (`HAUT` = 432, `uB1` = 180,8). | haute sur téléphone |
| 2 | `js/jeu.js:47` | Aucune limite d'images/s : `requestAnimationFrame` suit l'écran (120 Hz sur un Pixel 7 Pro). | haute sur téléphone |
| 3 | `js/montre.js:42-45` | Un trou dans les numéros de coups (`m.n` saute) ne produit qu'un coup. Les messages « état » portent aussi `n` et pourraient resynchroniser. `bilanDe` (`seance.js:60`) garde `nb × M_COUP`, donc les coups perdus le restent. | moyenne |
| 4 | `js/rendu.js:75` | `asp` borné à 0,6 : un écran portrait de 0,46 reçoit une image de rapport 0,6 étirée (écrasement mesuré : 0,77). | moyenne |
| 5 | `js/jeu.js:69` | `wakeLock` demandé une seule fois (`veille`), jamais redemandé après `visibilitychange`, échec silencieux si le cadre ne l'autorise pas, sans plan B. À vérifier dans le cadre Streamlit. | moyenne |
| 6 | `js/terrain.js:8-19` | Terrain non continu : 380 écarts de plus de 2,5 m entre voisins à 3 m (sur 90 000), jusqu'à 12,9 m (mètres 551 et 749 de la piste, à 130 m de l'eau), dont 21 dus à un changement de branche. | cachée aujourd'hui |
| 7 | `js/piste.js:13-22` | `fermer` : longueurs modifiées de −12 % à +28 % (Route 1 : 170 → 149 ; lac : 200 → 256). Puis arrondi pièce par pièce : `LONG` = 1 999 pour un tour annoncé à 2 000. | faible |
| 8 | `js/montre.js:28` | Le niveau de service du message est lu dans `tampon[0]` **après** que `tampon` a été remplacé par le reste. Sans effet tant que l'abonnement est au niveau 0. | latente |
| 9 | `js/montre.js:42` | Après une séance de moins de 50 coups, les premiers coups d'une nouvelle séance sur la montre sont ignorés jusqu'au prochain message « état » (5 s au plus). | faible |
| 10 | `js/sprites.js:22` | `pl.tex.clone()` par Pokémon : en r128, chaque copie est envoyée à part à la carte graphique. | faible aujourd'hui |
| 11 | `js/rendu.js:7` | Agrandissement non entier (720 → 1 600 : × 2,22) avec `image-rendering: pixelated` : pixels inégaux. | finition |
| 12 | `tests/test_riviere.py` | Aucun contrôle ne lance le code. Rien ne détecte une instruction avalée par un commentaire de fin de ligne. | haute pour la suite |
| 13 | `app.py:999-1004` | `pokemon.charger_jeu` et la lecture de la carte du dresseur sont faits avant d'ouvrir La Rivière, qui ne s'en sert pas. | lenteur en 4G |
| 14 | `js/montre.js:5` | Relais publics : un abonnement général au relais voit les messages (cœur compris, sans identité) et peut publier sur le sujet. | à ne pas garder |
| 15 | `js/jeu.js:54` | `S.vn` (vitesse ramenée entre 0 et 1,2) est réglée sur des vitesses de rameur. À sortir dans la fiche de la machine. | à prévoir |

Sur le point 12 : les lignes très longues terminées par un commentaire sont la cause directe des deux bugs « avalés ». Remède
proposé : une instruction par ligne et les commentaires sur leur propre ligne (mise en forme automatique), plus un contrôle qui ouvre
la page dans un navigateur sans écran et compte ce qui a été posé (objets par sorte, Pokémon, événements) contre des minimums.

## B. Vérifications de l'audit d'Opus dans le code

- Altitude : `piste.js:24-32`, `H` reçoit `h`, le cap. `at()` rend `{x, z, h, w}`. Eau : `eau.js:50`, `pos.push(…, 0, …)`.
- Sauts : `sprites.js:38-40`, `bond` ne s'applique qu'à `nageur.m.position.y`. Caméra : `jeu.js:35`, hauteur fixe 1,95.
- Soleil : `rendu.js:14`, constante, mais passée en `uSoleil` : animable sans rien changer d'autre. Les couleurs sont dans les
  sommets : une teinte d'heure du jour se fait par un réglage partagé de plus, à côté de `uSombre`.
- Ciel : `rendu.js:45-60`, texture peinte une fois. Il a déjà sa scène et sa caméra (`CIEL.scene`, `CIEL.cam`, `far` 4 000) : la
  couche lointaine a sa place toute trouvée.
- Virages : la limite vient de `STATIONS` (`terrain.js:6`, jusqu'à 13,5 m) dans `construireRives` : à l'intérieur d'un virage de
  rayon R, la station à e mètres est à R − w − e du centre, négatif si R < w + 13,5. `decor.js:45` contourne déjà le même problème.
- Rayons réels du niveau : 630, 171, 266, 132, 248, 331, 210, 411, 175, 175 m. Limite du contrôle : 22 à 35 m.
- Croisements : `terrain.js:38-39` traite déjà « dessus d'un tunnel » (`GK` = 2) à part. Un pont est le cas symétrique : ses points de
  piste doivent être exclus de `pres`, et son tablier dessiné à part.

## C. Détail de l'architecture proposée

**Piste.** Tableaux par mètre : `X, Y, Z, CAP, PENTE, W, SURF, ETAGE, PG, PD, ALLURE`, plus la correspondance entre mètres de décor
et vrais mètres (somme de 1 / allure). `at(s)` et `pose(s, d)` gardent leur forme et rendent `y` en plus. Pièce de raccord : deux
arcs calculés entre la fin et le début, la hauteur ramenée à celle du départ ; « auto » reste accepté pour les anciens fichiers. Les
embranchements sont réservés dans le format (tronçons reliés) mais pas construits tout de suite.

**Terrain par vote.** Pour un point (x, z) : les points de piste dans un rayon donné (la grille `CASES` existe déjà), chacun avec un
poids qui chute très vite avec la distance au bord. Près de la piste, le résultat est presque celui d'aujourd'hui (le plus proche
domine) ; loin, c'est une moyenne douce. Hauteur votée = hauteur de la piste à ce point + profil de sa rive. Les points « pont » ne
votent pas ; les points « tunnel » votent avec le profil de la montagne. Le ruban des rives borne chaque station à la distance libre
réelle, au lieu de se replier.

**Contrat de non-régression pour `kanto-1km`.** 20 captures figées (`?s=…&fige=1`) avant et après chaque étape du cœur, comparées
par script ; les longueurs de `__piste()` identiques ; une séance d'essai automatique qui donne les mêmes tours.

**Densité.** Les objets répétés (arbres, rochers, herbes) dessinés par copies au lieu d'être fondus dans de gros blocs ; trois
niveaux de détail selon la distance ; une seule image regroupant tous les Pokémon. Budget visé sur la tablette : 12 ms par image.

## D. Ce que je n'ai pas vérifié

- Le nombre d'images par seconde réel sur l'écran de la tablette (le panneau d'essai était bridé) ; le coût par image, lui, est mesuré.
- Le téléphone, sous toutes ses formes.
- La page dans l'appli Streamlit (veille, rechargement après enregistrement).
- Le plafonnement à 30 images/s en économie d'énergie sur Android : c'est mon souvenir du comportement de Chrome, à confirmer sur ton téléphone.
- Le retard des coups quand la montre passe par le téléphone pour atteindre Internet.
