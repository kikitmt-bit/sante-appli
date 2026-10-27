# Cartes des régions (onglet Pokémon)

Une image par région, toutes dans le même style : pixel art 16 bits façon Pokémon Rouge Feu / Vert Feuille, vue de
dessus, **sans aucun texte** (les noms, le chemin, les badges et le compagnon sont ajoutés par l'appli, en SVG).
Générées par Kiki avec ChatGPT, dans **une seule conversation** pour garder le même style. Kanto : `kanto.webp`
(1448 × 1086, 28/10). Les lieux sont placés en pixels de l'image dans `kanto.py` (`LIEUX`, `CARTE`).

Cartes de référence (Google Images) : Kanto `Kanto town map FireRed LeafGreen`, Johto `Johto town map HeartGold
SoulSilver`, Hoenn `Hoenn town map Emerald`, Sinnoh `Sinnoh town map Platinum`, Unys `Unova town map Black 2 White 2`,
Kalos `Kalos region map X Y`, Alola `Alola region map Ultra Sun Ultra Moon`, Galar `Galar region map Sword Shield`,
Paldea `Paldea region map Scarlet Violet`.

## Message 1 (Kanto, avec la carte officielle jointe)

```
I'm building a Pokémon-themed fitness app. It will show a series of 9 region maps, one per generation: Kanto, Johto, Hoenn, Sinnoh, Unova, Kalos, Alola, Galar, Paldea. We will create them one by one in this conversation, and ALL 9 MUST SHARE EXACTLY THE SAME ART STYLE, so they look like one consistent collection. Today we start with Kanto; it will become the style model for all the others.

Using the attached image as a layout reference, redraw the Kanto region as a beautiful top-down 16-bit pixel art map, in the style of the Pokémon FireRed / LeafGreen overworld. Keep the same coastline, islands, and positions of towns, routes, forests, mountains and caves as the reference.

Style (this exact style will be reused for every region): soft bright colors, lush green grass, sandy dirt paths for routes, blue sea with small white waves, dense forests of round trees, grey-brown rocky mountains, small towns drawn as clusters of colorful roofs, lakes and rivers. Cozy, clean and very readable on a phone screen, like an official Nintendo map.

Strict rules: NO text, NO labels, NO names, NO icons, NO markers, NO characters, NO UI, NO frame or border. Only the map, filling the whole image.

Format: landscape 4:3, high resolution, crisp pixels.

After the image, write a short "style sheet" (palette, pixel size, how towns, routes, forests, mountains, water and caves are drawn) that we will reuse for the next 8 regions.
```

## Régions suivantes (même conversation, 2 images jointes : la carte de Kanto finie + la carte officielle)

```
Next region: Johto. First image = our finished Kanto map: copy its art style EXACTLY (same palette, pixel size, grass, paths, trees, mountains, water, towns), following the style sheet. Second image = the official Johto map: use it only for the layout (coastline, towns, routes, forests, mountains, islands). Same strict rules: no text, no labels, no icons, no characters, no frame. Landscape 4:3, high resolution, crisp pixels.
```
