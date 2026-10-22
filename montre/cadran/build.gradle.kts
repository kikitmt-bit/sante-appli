// Le cadran Pokémon (Watch Face Format) : un APK sans code, rien que des ressources. Les données Pokémon viennent de
// l'appli « Pokémon » (module app) par ses complications, à garder installée.
plugins {
    id("com.android.application")
}

android {
    namespace = "fr.kiki.pokemontre.cadran"
    compileSdk = 34

    defaultConfig {
        applicationId = "fr.kiki.pokemontre.cadran"
        minSdk = 34
        targetSdk = 34
        versionCode = 6
        versionName = "6.0"
    }
    buildTypes {
        release { isMinifyEnabled = false; signingConfig = signingConfigs.getByName("debug") }
    }
}
