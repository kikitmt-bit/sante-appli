# Scènes (onglet Pokémon)

Images pixel art générées par Kiki avec ChatGPT, **dans la conversation de la carte** (même style), format portrait 9:16,
bas de l'image libre (la boîte de dialogue s'y pose), **sans aucun texte**.

## Laboratoire du professeur (cadeau de départ de chaque région) — `labo-chen.webp` (30/10)

```
Same art style as our Kanto map: 16-bit pixel art like Pokémon FireRed/LeafGreen, same palette and pixel size.

Draw the inside of Professor Oak's laboratory in Pallet Town, seen from the front with a slight top-down angle like in the games: wooden floor, bookshelves full of books, a computer, potted plants, a window. In the center, Professor Oak (grey hair, white lab coat, red shirt, brown trousers, kind smile) stands behind a wooden table. On the table, exactly THREE red-and-white Poké Balls, side by side, evenly spaced and clearly visible.

Composition for a phone screen: portrait format 9:16. Professor and table in the middle of the image. Keep the bottom quarter of the image simple (plain floor) because a dialogue box will be placed there.

Strict rules: no text, no letters, no UI, no dialogue box, no frame, no other characters.
```

### Version 2 (29/10) : table VIDE, Claude pose les 3 Poké Balls lui-même
Idée de Kiki : le décor sans les balls, et les balls à part. Les balls = l'image officielle du jeu (PokeAPI
`items/poke-ball.png`, déjà utilisée dans l'onglet), agrandie au même pas de pixel que la scène : identique dans les 9
scènes, vraie transparence (ChatGPT ne sait pas faire un vrai PNG transparent), et Claude peut l'animer librement
(halo, secousse, saut). Plus besoin de cacher une ball dessinée. Chaque région a sa propre mise en scène (pas toujours
le professeur au milieu derrière une table) : il faut seulement un support plat, vide et bien visible, et le bas libre.
Essai d'abord avec Chen. Joindre **2 images** : `labo-chen.webp` (style + taille du personnage ; pas la carte, vue de dessus, sans personnage) puis une illustration officielle du professeur (apparence). Un prompt par professeur (décor de sa ville, support, pose).

```
First image = Professor Oak's lab that you made for my Pokémon-style fitness app: copy ONLY its art style and the size of the character. Second image = official artwork of Professor Oak: use it ONLY for his appearance (face, hair, clothes, colors).
Make a NEW version of this scene, in the exact same art style as the first image, but with a different, more lively composition.

STYLE (identical to the attached image): 16-bit pixel art like Pokémon FireRed/LeafGreen, same pixel size, same dark outlines, same soft shading, same colors, same camera (seen from the front with a slight top-down angle), portrait 9:16 format.

SCENE: Professor Oak's laboratory in Pallet Town, warm morning light coming through the windows (through one window we can see the small peaceful village of Pallet Town with red roofs), tall bookshelves, a computer, a big research machine with small blinking lights, potted plants, a map of the region on the wall.

CHARACTER: Professor Oak (grey hair, white lab coat, red shirt, brown trousers, kind smile), full body visible, standing on the right third of the image, turned towards us, one hand open in a welcoming gesture towards the table.

THE TABLE (very important): a wide wooden table in the left-center of the image, next to the professor, seen clearly from slightly above. Its top must be COMPLETELY EMPTY, flat and uncluttered, with enough free space for three Poké Balls side by side (I will add them myself later). Nothing on the table: no Poké Ball, no object, no paper.

COMPOSITION: the professor and the table in the upper two thirds of the image. The bottom 30% of the image must be plain floor with nothing on it, because a dialogue box will be placed there.

STRICT RULES: NO Poké Ball anywhere in the image. No text, no letters, no numbers, no UI, no dialogue box, no frame or border, no other characters, no Pokémon.
```

### Labos des régions suivantes (une image par région, quand on construira la région)

Joindre **2 images** : `labo-chen.webp` (modèle de style, obligatoire) + une illustration officielle du professeur
(Google Images : « Professor Elm official art »…). Pas besoin de sprites : ChatGPT copie le style de la 1re image et
l'apparence du professeur de la 2e.

```
First image = Professor Oak's lab that you made for this series. Second image = [PROF], only for his/her appearance.
Create the same scene for the next region: it must look like it comes from the exact same game as the first image.
Copy the first image EXACTLY for everything except the content: same 16-bit pixel art style as Pokémon FireRed/LeafGreen, same pixel size, same dark outlines, same soft shading, same colors, same camera, same canvas size and portrait 9:16 format, same composition: the professor in the middle behind a wooden table with exactly THREE red-and-white Poké Balls side by side at the same place and size, bottom quarter plain floor.
Scene: [LAB].
Strict rules: no text, no letters, no UI, no dialogue box, no frame, no other characters, no Pokémon.
```

| Région | [PROF] | [LAB] |
|---|---|---|
| Johto | Professor Elm (brown hair, glasses, white lab coat, green shirt) | Professor Elm's lab in New Bark Town, machines and bookshelves |
| Hoenn | Professor Birch (dark beard, short brown hair, white lab coat over blue shirt, shorts and sandals) | Professor Birch's lab in Littleroot Town, outdoor-research feel |
| Sinnoh | Professor Rowan (old man, white hair and big white mustache, dark suit) | Professor Rowan's lab in Sandgem Town, serious and classic |
| Unys | Professor Juniper (woman, light brown hair in a bun, white lab coat, green skirt) | Professor Juniper's lab in Nuvema Town, modern and bright |
| Kalos | Professor Sycamore (tall man, dark wavy hair, white lab coat over blue shirt) | Professor Sycamore's lab in Lumiose City, elegant French style |
| Alola | Professor Kukui (tanned, white cap, open lab coat, green shorts, sunglasses on cap) | Professor Kukui's beach house lab in Iki Town area, tropical |
| Galar | Professor Magnolia (choisie le 29/10 plutôt que Sonya) (old woman, white hair in a bun, red-orange coat, cane) | Professor Magnolia's house lab in Wedgehurst, British cottage |
| Paldea | Professor Sada (Olim en français ; choisie le 29/10 : wild long brown hair, tribal orange outfit with fur, open lab coat) | Paldea, wild and sunny (à revoir avec le prompt v2) |

Placer ensuite dans `PROFESSEURS` (pokemon_ui.html) : nom de l'image, sa taille, la position des 3 balls et de la
table en pixels (Claude les mesure sur l'image).

## Arènes (scène du badge) — `arene-1.webp` … `arene-9.webp` (9 = la Ligue)

**Joindre l'image du labo** (`labo-chen.webp`) au message : c'est le modèle de style (version renforcée du 30/10).

```
The attached image is Professor Oak's lab that you made for this series. Create the next scene of the SAME series: it must look like it comes from the exact same game as this image.

Copy the attached image EXACTLY for everything except the content: same 16-bit pixel art style as Pokémon FireRed/LeafGreen, same pixel size, same dark outlines, same soft shading, same color saturation, same camera (seen from the front with a slight top-down angle), same perspective of walls and floor, same canvas size and portrait 9:16 format. The character must have the same size, proportions and level of detail as Professor Oak in the attached image.

Scene: the inside of the [GYM].

Character: [LEADER], the Gym Leader, standing in the middle of the image at the same place and height as Professor Oak, facing us, full body visible, proud and confident.

Composition: the leader in the center, nothing in front of him/her (no table). The bottom 40% of the image must be plain floor, with nothing on it, because a dialogue box will be placed there.

Strict rules: no text, no letters, no numbers, no UI, no dialogue box, no frame or border, no other characters, no Pokémon, no badge, no logo.
```

Version complète envoyée pour Pierre : [GYM] = « Pewter City Pokémon Gym. A rocky brown floor, big grey boulders placed on
the left and right sides, rough brown stone walls at the back, a few small rocks and pebbles, warm lighting » ;
[LEADER] = « Brock … arms crossed. Tanned skin, spiky brown hair, eyes always closed (drawn as thin lines), orange
shirt under a green vest, brown trousers ».

| # | [GYM] | [LEADER] |
|---|---|---|
| 1 Argenta | Pewter City Gym, rocky floor, big grey boulders, brown stone walls | Brock, tanned skin, spiky brown hair, eyes always closed, orange shirt and green vest |
| 2 Azuria | Cerulean City Gym, a big blue swimming pool with diving boards, tiled floor | Misty, orange hair in a side ponytail, yellow crop top, red suspenders, blue shorts |
| 3 Carmin | Vermilion City Gym, metal floor, electric barriers, yellow lightning decorations | Lt. Surge, very tall and muscular, spiky blond hair, green military outfit, sunglasses |
| 4 Céladopole | Celadon City Gym, a greenhouse full of flowers, trees and grass | Erika, short black bob hair with a red headband, green and yellow kimono, holding a fan |
| 5 Parmanie | Fuchsia City Gym, dark wooden ninja dojo, invisible walls, purple tones | Koga, ninja outfit in dark purple, mask on the lower face, spiky dark hair |
| 6 Safrania | Saffron City Gym, purple psychic room with glowing teleport tiles | Sabrina, long straight dark green hair, red sleeveless top, white trousers, mysterious calm look |
| 7 Cramois'Île | Cinnabar Island Gym, volcanic room with lava and red rocks | Blaine, bald old man, white mustache, round sunglasses, white lab coat |
| 8 Jadielle | Viridian City Gym, luxurious dark room with marble floor and red carpet | Giovanni, black suit, slicked-back black hair, stern face, a Persian cat Pokémon sitting next to him (enlever « no other characters ») |
| 9 Ligue | the Indigo Plateau Hall of Fame, a grand hall with a glowing machine and golden lights | Blue, Kanto's Champion, spiky light brown hair, black shirt, confident smile |

Scène prévue (à construire avec la première image, Pierre) : fondu dans l'arène, répliques du champion (qui citent
le défi réussi), le vrai badge (PokeAPI `badges/N.png`) en grand qui tourne et brille, « Touche le badge pour le
prendre », il vole dans un étui à 8 cases (étincelles, petit air), puis la Hyper Ball du badge (zoom + flash → 3D,
`ouvrir(c, rejouer, true)`). Rejouable en touchant un badge gagné. Sans image : même scène sur fond sombre.

### Mises en scène des 9 labos (v2, 29/10 : à varier, demande de Kiki)
Professeur = petit sprite de jeu (≈ 1/4 de la hauteur, proportions chibi) ; l'illustration Poképédia ne sert qu'aux
vêtements et couleurs (sinon il sort en illustration d'anime, trop grand : essai Chen du 29/10). Support plat, vide,
jamais deux fois le même ; bas de l'image libre.

| Région | Lieu, lumière | Professeur | Support des 3 balls |
|---|---|---|---|
| Kanto | labo de Bourg Palette, matin | debout à droite, main tendue | long comptoir de labo blanc à tiroirs |
| Johto | labo d'Orme à Bourg Geon, couveuses à œufs, machines | assis sur un tabouret à roulettes, à gauche | plateau d'un chariot de labo en métal |
| Hoenn | lisière de forêt, Route 101, plein soleil | un genou à terre, sa sacoche à côté | grosse souche d'arbre plate |
| Sinnoh | rive du Lac Vérité, brume du matin | debout au centre, mains dans le dos, sérieux | grand rocher plat, sa mallette posée à côté |
| Unys | labo moderne et lumineux de Renouet | appuyée au comptoir, à gauche, fait coucou | comptoir blanc moderne |
| Kalos | terrasse de café à Illumis, Tour Prismatique au fond, fin de journée | assis sur une chaise de café, à droite | petite table ronde de café |
| Alola | plage devant sa maison-labo, midi tropical | à gauche, poing levé, plein d'énergie | table de pique-nique en bois flotté |
| Galar | jardin du cottage de Brasswick, après-midi doré | debout avec sa canne, à droite | muret de pierre plat couvert de mousse |
| Paldea | camp de recherche au bord du grand cratère, coucher de soleil | accroupie sur un rocher, à gauche | grande dalle de pierre ancienne |

### Prompts v2 des labos, gen 1 à 9 (29/10)
Modèle commun : joindre la carte de la région (style + couleurs), une nouvelle conversation ChatGPT par région.
`[CHARACTER]` = à compléter par Kiki. Décors, poses et supports : tableau « Mises en scène » ci-dessus.
Texte complet des 9 prompts : conversation du 29/10 (compte B) ; même structure que celui de Kanto :
STYLE (carte jointe) / SCENE / CHARACTER (petit sprite chibi, 1/4 de la hauteur) + Pose / SUPPORT vide / COMPOSITION
(bas 30 % libre) / STRICT RULES (pas de texte, pas de ball, pas de créature).

## Décors du combat de l'entraînement (03/11) : `combat-<lieu>.webp`, **un par lieu** (choix de Kiki), à inscrire avec la place de ses ronds dans `DECORS_COMBAT` de pokemon_ui.html

Images **paysage 3:2** (1536 x 1024), deux ronds de sol vides toujours aux mêmes places : c'est ce qui pose chaque Pokémon au bon endroit, quel que soit le décor.
Joindre une image de combat de Pokémon Rouge Feu / Vert Feuille si possible (style). Changer seulement `[PLACE]`. ChatGPT bloque après 2 ou 3 images par jour : pas de hâte.

```
16-bit pixel art like the battle backgrounds of Pokémon FireRed/LeafGreen on Game Boy Advance: same pixel size, same dark outlines, same soft shading, rich colors.

Draw an empty Pokémon battle scene, seen from a slight top-down angle, in this place: [PLACE].

Composition, very important, landscape format 3:2:
- A flat oval patch of ground, clearly visible, centered at 72% of the width and 45% of the height (it is the far platform, about 28% of the image width).
- A second, larger flat oval patch of ground, clearly visible, centered at 27% of the width and 68% of the height (the near platform, about 34% of the image width).
- Both ovals are empty, flat, and lit evenly. Nothing stands on them or overlaps them.
- The whole bottom 15% of the image is plain, simple ground. The top 20% is simple background.
- Keep the decoration at the edges and in the background, so the two ovals stay very readable.

Strict rules: no text, no letters, no numbers, no UI, no health bars, no dialogue box, no frame, no Pokémon, no creature, no person, no Poké Ball.
```

`[PLACE]` : le lieu de la carte, décrit avec ses détails reconnaissables. Kanto : les 20 lieux sont faits (03/11). ChatGPT fait les ronds plus grands que demandé, sans gêne : la place se mesure sur chaque image. Préciser le sol du lieu dans chaque prompt, et « no writing » pour les bâtiments.

**Le sol (03/11, Kiki)** : ChatGPT recopiait partout un rond de sable bordé d'herbe. À ajouter à chaque prompt : `Important: there is NO sand and NO border unless this place has some. The two ovals are simply slightly lighter, worn patches of the same ground as this place, with soft natural edges. The bottom strip of the image is also the same ground. The ovals stay at the same positions and sizes, clearly visible but natural.` Bon exemple : `combat-foret-de-jade.webp`.

### Les 19 autres lieux de Kanto (dans la même conversation ChatGPT : `Same composition and strict rules as before, new place: …`)

- `combat-route-1.webp`, Route 1 : a quiet country path between Pallet Town and the next city, tall grass patches, small rocky ledges, trees on both sides
- `combat-jadielle.webp`, Jadielle : Viridian City, a calm green town: a small pond, trees, houses with green roofs, a Pokémon Center with a red roof and a closed gym in the distance
- `combat-foret-de-jade.webp`, Forêt de Jade : Viridian Forest, a dense and slightly dark forest: huge trees, tall grass, soft rays of light through the leaves
- `combat-argenta.webp`, Argenta : Pewter City, a town of grey stone at the foot of the mountains: rocky ground, a stone gym, a museum in the distance, mountains behind
- `combat-route-3.webp`, Route 3 : a dry rocky hillside: boulders, small ledges, sparse grass, the dark entrance of a mountain cave far away
- `combat-mont-selenite.webp`, Mont Sélénite : inside Mt. Moon, a dark cave: rough rock walls, glowing pale moon crystals, a few fossils in the walls, soft blue light
- `combat-azuria.webp`, Azuria : Cerulean City, a bright town of blue roofs crossed by clear water: a small river, a footbridge, a gym with a pool roof in the distance
- `combat-route-5.webp`, Route 5 et Cave Taupiqueur : a country road bordered by hedges, with mole holes and mounds of earth in the ground, and the entrance of Diglett's Cave in a hillside
- `combat-carmin-sur-mer.webp`, Carmin-sur-Mer : Vermilion City, a harbor at the end of the afternoon: wooden docks, the sea, a big white cruise ship moored, harbor cranes, a warm orange sky
- `combat-grotte-centrale.webp`, Grotte et Centrale : the outskirts of an abandoned power plant at the foot of a rocky cliff: old pylons, rusty pipes, cables, small yellow electric sparks, a cave entrance in the cliff
- `combat-lavanville.webp`, Lavanville : Lavender Town at dusk: a quiet village under a purple sky and light mist, small sad houses, and in the distance a very tall dark tower
- `combat-celadopole.webp`, Céladopole : Celadon City, a large colorful city: flower beds and hedges, a huge department store, a gym surrounded by flowers in the distance, sunny sky
- `combat-piste-cyclable.webp`, Piste cyclable : a long paved bike road built on stilts above the sea: guard rails, sea on both sides, blue sky, small islands in the distance
- `combat-parmanie-safari.webp`, Parmanie et Parc Safari : the Safari Zone near Fuchsia City: wild savanna with tall golden grass, wooden fences, exotic trees, a small pond, warm sunlight
- `combat-safrania.webp`, Safrania : Saffron City, a big modern metropolis: paved square, grey and gold skyscrapers, a very tall office tower in the center of the background
- `combat-iles-ecume.webp`, Îles Écume : the Seafoam Islands: an icy sea cave open to the sky, blue ice and snow on the ground, frozen rocks, dark water in the background
- `combat-cramoisile.webp`, Cramois'Île : Cinnabar Island: dark volcanic ground, a smoking volcano in the background, the sea on the horizon, a few glowing lava cracks at the edges
- `combat-route-victoire.webp`, Route Victoire : inside Victory Road, a huge rocky cave: massive boulders, stone walls, a few torches on the walls, dramatic warm light
- `combat-plateau-indigo.webp`, Plateau Indigo : Indigo Plateau at sunset: a grand stone esplanade, a majestic league building with golden decorations and blank banners, mountains around, a glorious orange sky
