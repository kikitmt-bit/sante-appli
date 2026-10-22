package fr.kiki.pokemontre

import android.app.Application
import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

/** Au démarrage : la récolte toutes les 15 min (le plus court permis par Android), même sans ouvrir l'appli. */
class App : Application() {
    override fun onCreate() {
        super.onCreate()
        val travail = PeriodicWorkRequestBuilder<Recolte>(15, TimeUnit.MINUTES)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork("recolte", ExistingPeriodicWorkPolicy.KEEP, travail)
        Direct.demarrer(this)  // pas et étages en direct (si la permission est donnée)
    }
}

/** Va chercher la barre et les Poké Balls, puis met à jour la complication du cadran. */
class Recolte(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        val ok = withContext(Dispatchers.IO) { Donnees.telecharger(applicationContext) }
        BarreComplication.rafraichir(applicationContext)
        return if (ok) Result.success() else Result.retry()
    }
}
