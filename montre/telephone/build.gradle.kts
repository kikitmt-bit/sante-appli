plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// La petite appli du téléphone : elle envoie les messages reçus sur le téléphone (SMS, WhatsApp, Gmail…) à la montre,
// pour la case du bas du cadran. Même nom de paquet et même signature que l'appli de la montre : c'est ce qui permet à
// Wear OS de les relier (Data Layer). Aucune clé dedans.
android {
    namespace = "fr.kiki.pokemontre"
    compileSdk = 34

    defaultConfig {
        applicationId = "fr.kiki.pokemontre"
        minSdk = 27
        targetSdk = 34
        versionCode = 15
        versionName = "15.0"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("com.google.android.gms:play-services-wearable:18.2.0")
}
