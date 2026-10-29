import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Adresse du script Google et clé du jeu : dans montre/secret.properties (jamais sur GitHub)
val secret = Properties().apply {
    val f = rootProject.file("secret.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

android {
    namespace = "fr.kiki.pokemontre"
    compileSdk = 34

    defaultConfig {
        applicationId = "fr.kiki.pokemontre"
        minSdk = 30
        targetSdk = 34
        versionCode = 16
        versionName = "16.0"
        buildConfigField("String", "SCRIPT_URL", "\"${secret.getProperty("SCRIPT_URL", "")}\"")
        buildConfigField("String", "JEU_CLE", "\"${secret.getProperty("JEU_CLE", "")}\"")
        buildConfigField("String", "APPLI_CLE", "\"${secret.getProperty("APPLI_CLE", "")}\"")
    }
    buildFeatures { buildConfig = true }
    buildTypes {
        release { isMinifyEnabled = false; signingConfig = signingConfigs.getByName("debug") }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.work:work-runtime-ktx:2.9.1")
    implementation("androidx.wear.watchface:watchface-complications-data-source-ktx:1.2.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("androidx.health:health-services-client:1.1.0")
    implementation("androidx.wear.tiles:tiles:1.4.1")
    implementation("androidx.wear.protolayout:protolayout:1.2.1")
    implementation("androidx.wear.protolayout:protolayout-material:1.2.1")
    implementation("com.google.guava:guava:33.3.1-android")
    // Messages du téléphone (Data Layer) et ouverture du site des pronos sur le téléphone
    implementation("com.google.android.gms:play-services-wearable:18.2.0")
    implementation("androidx.wear:wear-remote-interactions:1.0.0")
}
