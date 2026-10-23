# Réglages de la montre par ADB (shell de Bugjaeger)

Toutes ces commandes se tapent dans le **shell de Bugjaeger** (montre connectée en débogage), une ligne à la fois.
Rien n'est définitif : chaque réglage a sa commande pour revenir en arrière.

## 1. Montre plus réactive : animations deux fois plus courtes

```
settings put global window_animation_scale 0.5
settings put global transition_animation_scale 0.5
settings put global animator_duration_scale 0.5
```

Effet immédiat. Pour revenir comme avant : les mêmes lignes avec `1` à la place de `0.5`.
(`0` supprime complètement les animations : encore plus vif, mais un peu sec.)

## 2. Plus de batterie : désactiver les applis jamais utilisées

D'abord, la liste des applis de la montre (à copier-coller à Claude, qui dira lesquelles on peut couper sans risque) :

```
pm list packages | sort
```

Puis, pour chaque appli à couper :

```
pm disable-user --user 0 NOM.DE.L.APPLI
```

Pour la remettre : `pm enable NOM.DE.L.APPLI`. Ne jamais couper : Fitbit, Google Play Services, Wear OS, le clavier,
les réglages, ni `fr.kiki.pokemontre` / `fr.kiki.pokemontre.cadran`.

## 3. Les messages dans la case du bas du cadran

```
cmd notification allow_listener fr.kiki.pokemontre/fr.kiki.pokemontre.Notifs
```

Pour retirer : `cmd notification disallow_listener fr.kiki.pokemontre/fr.kiki.pokemontre.Notifs`.

## 4. Claude à la place de l'Assistant (appui long sur le bouton)

D'abord, noter l'assistant actuel (pour pouvoir le remettre) :

```
cmd role get-role-holders android.app.role.ASSISTANT
```

Puis donner le rôle à Claude :

```
cmd role add-role-holder android.app.role.ASSISTANT fr.kiki.pokemontre
```

Ensuite, appui long sur le bouton : l'écran Claude doit s'ouvrir, micro qui écoute. Sur la montre, vérifier aussi
Paramètres → Gestes (ou Boutons) → appui long : choisir « Assistant numérique » s'il y a le choix.

Pour remettre l'Assistant de Google : `cmd role add-role-holder android.app.role.ASSISTANT <le nom noté plus haut>`
(souvent `com.google.android.googlequicksearchbox`).
