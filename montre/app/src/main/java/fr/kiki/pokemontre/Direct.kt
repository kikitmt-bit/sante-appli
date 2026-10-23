package fr.kiki.pokemontre

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.health.services.client.HealthServices
import androidx.health.services.client.PassiveListenerService
import androidx.health.services.client.data.DataPointContainer
import androidx.health.services.client.data.DataType
import androidx.health.services.client.data.PassiveListenerConfig
import java.time.LocalDate
import kotlin.math.max

/**
 * Les chiffres en direct de la montre (pas, étages, distance, calories du jour), par Health Services en mode passif :
 * les capteurs tournent de toute façon, la montre nous les donne par paquets, sans dépense de batterie en plus.
 * Ils font avancer la barre Pokémon sans attendre le site : on ajoute ce qui a été fait depuis l'arrivée des
 * dernières données du site (jamais plus, pour ne pas compter deux fois). Les minutes en zone viennent du site.
 */
object Direct {
    private const val PREFS = "direct"
    data class Chiffres(val pas: Long, val etages: Double, val metres: Double, val kcal: Double)

    private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private fun aujourdhui() = LocalDate.now().toString()

    fun permis(ctx: Context) = ctx.checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED

    /** S'inscrit auprès de la montre (à chaque démarrage de l'appli : sans effet si c'est déjà fait). */
    fun demarrer(ctx: Context) {
        if (!permis(ctx)) return
        val config = PassiveListenerConfig.builder()
            .setDataTypes(setOf(DataType.STEPS_DAILY, DataType.FLOORS_DAILY, DataType.DISTANCE_DAILY, DataType.CALORIES_DAILY))
            .build()
        try {
            HealthServices.getClient(ctx).passiveMonitoringClient.setPassiveListenerServiceAsync(Passif::class.java, config)
        } catch (e: Exception) { }
    }

    /** Les chiffres d'aujourd'hui (null s'ils sont d'un autre jour ou pas encore arrivés). */
    fun lire(ctx: Context): Chiffres? {
        val p = prefs(ctx)
        if (p.getString("jour", null) != aujourdhui()) return null
        return Chiffres(p.getLong("pas", 0), p.getFloat("etages", 0f).toDouble(), p.getFloat("metres", 0f).toDouble(),
                        p.getFloat("kcal", 0f).toDouble())
    }

    fun enregistrer(ctx: Context, pas: Long?, etages: Double?, metres: Double?, kcal: Double?) {
        val p = prefs(ctx)
        val e = p.edit()
        if (p.getString("jour", null) != aujourdhui()) e.putString("jour", aujourdhui()).putLong("pas", 0).putFloat("etages", 0f)
            .putFloat("metres", 0f).putFloat("kcal", 0f)
        pas?.let { e.putLong("pas", it) }
        etages?.let { e.putFloat("etages", it.toFloat()) }
        metres?.let { e.putFloat("metres", it.toFloat()) }
        kcal?.let { e.putFloat("kcal", it.toFloat()) }
        e.apply()
        // La complication suit (au plus une fois par minute)
        if (System.currentTimeMillis() - p.getLong("maj_compl", 0) > 60_000) {
            p.edit().putLong("maj_compl", System.currentTimeMillis()).apply()
            BarreComplication.rafraichir(ctx)
        }
    }

    /** Les données du site viennent d'arriver : on note où en était la montre (le direct repart de là). */
    fun nouvelleBase(ctx: Context) {
        val c = lire(ctx)
        prefs(ctx).edit().putString("base_jour", aujourdhui()).putLong("base_pas", c?.pas ?: 0)
            .putFloat("base_etages", (c?.etages ?: 0.0).toFloat()).apply()
    }

    /** Les points gagnés depuis l'arrivée des dernières données du site (pas au-delà des 2 000 du jour, étages). */
    fun bonus(ctx: Context, e: Donnees.Etat): Float {
        val c = lire(ctx) ?: return 0f
        val p = prefs(ctx)
        val offerts = 2000.0
        val f = { pas: Double -> max(pas - offerts, 0.0) / 100 }
        if (e.jour != aujourdhui() || p.getString("base_jour", null) != aujourdhui()) {
            // Les données du site sont d'hier (peu après minuit) : tout ce que la montre a compté aujourd'hui
            return (f(c.pas.toDouble()) + c.etages).toFloat()
        }
        val serveur = (e.sante?.pas ?: e.pas).toDouble()
        val dPas = max(c.pas - p.getLong("base_pas", c.pas), 0L).toDouble()
        val dEtages = max(c.etages - p.getFloat("base_etages", c.etages.toFloat()), 0.0)
        return (f(serveur + dPas) - f(serveur) + dEtages).toFloat()
    }

    /** Les points de la barre en direct. */
    fun points(ctx: Context, e: Donnees.Etat): Float = e.points + bonus(ctx, e)
}

/** Reçoit les chiffres de la montre (Health Services). */
class Passif : PassiveListenerService() {
    override fun onNewDataPointsReceived(dataPoints: DataPointContainer) {
        Direct.enregistrer(
            this,
            dataPoints.getData(DataType.STEPS_DAILY).lastOrNull()?.value,
            dataPoints.getData(DataType.FLOORS_DAILY).lastOrNull()?.value,
            dataPoints.getData(DataType.DISTANCE_DAILY).lastOrNull()?.value,
            dataPoints.getData(DataType.CALORIES_DAILY).lastOrNull()?.value,
        )
    }
}

/** Après un redémarrage de la montre : se réinscrire. */
class Demarrage : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) { Direct.demarrer(ctx); DebogageWifi.inscrire(ctx) }
    }
}
