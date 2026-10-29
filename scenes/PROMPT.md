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
