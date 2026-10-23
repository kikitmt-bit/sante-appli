# Réglages de la montre par ADB

**Depuis le PC (depuis le 23/10, plus besoin de Bugjaeger)** : montre appairée une fois (`adb pair`, code tapé par Kiki).
Ensuite, sur le même Wi-Fi, débogage via Wi-Fi activé sur la montre (il se coupe quand la montre coupe son Wi-Fi) :

```
A=/c/Users/kikit/Android/sdk/platform-tools/adb.exe
P=$($A mdns services | awk '/_adb-tls-connect/{print $NF}' | head -1); $A connect $P
$A -s $P install -r montre/app/build/outputs/apk/debug/app-debug.apk
```
(le port change à chaque réactivation ; le nom mdns peut contenir des espaces, d'où `$NF`).

**Fait le 23/10** : animations à 0,5 ; `Notifs` autorisé ; rôle ASSISTANT donné à `fr.kiki.pokemontre` (avant :
`com.google.android.wearable.assistant`) ; applis désactivées : Google Home (`com.google.android.apps.chromecast.app`),
Photos, YouTube Music, Gmail (`com.google.android.gm`), démos magasin (`...musicweardemo.retailmode`,
`...wearable.retailattractloop`), TalkBack. Gardées : Maps, Wallet. Pas de service de reconnaissance vocale sur la
montre (seule la dictée de Gboard, `WearRemoteInputActivity`).

## Les commandes (aussi tapables dans le shell de Bugjaeger)

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
