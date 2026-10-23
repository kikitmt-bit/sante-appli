package fr.kiki.pokemontre

import android.Manifest
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.provider.Settings
import android.util.Log

/**
 * Dès que la montre rallume son Wi-Fi, le débogage via Wi-Fi se rallume aussi (Claude peut alors installer et régler
 * la montre depuis le PC, sans passer par les options pour les développeurs). Ne consomme rien : c'est Android qui
 * prévient l'appli quand un réseau Wi-Fi arrive (inscription au démarrage de l'appli et de la montre).
 * Droit à donner une fois depuis le PC :  adb shell pm grant fr.kiki.pokemontre android.permission.WRITE_SECURE_SETTINGS
 */
object DebogageWifi {
    fun permis(ctx: Context) = ctx.checkSelfPermission(Manifest.permission.WRITE_SECURE_SETTINGS) == PackageManager.PERMISSION_GRANTED

    fun inscrire(ctx: Context) {
        if (!permis(ctx)) return
        try {
            val cm = ctx.getSystemService(ConnectivityManager::class.java)
            val demande = NetworkRequest.Builder().addTransportType(NetworkCapabilities.TRANSPORT_WIFI).build()
            val pi = PendingIntent.getBroadcast(ctx, 9, Intent(ctx, WifiArrive::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE)
            cm.registerNetworkCallback(demande, pi)
        } catch (e: Exception) { }
        activer(ctx)  // si le Wi-Fi est déjà là
    }

    /** Rallume le débogage si le Wi-Fi est connecté ; true si c'est allumé à la fin. */
    fun activer(ctx: Context): Boolean {
        if (!permis(ctx)) { Log.w(TAG, "droit WRITE_SECURE_SETTINGS manquant"); return false }
        return try {
            val cm = ctx.getSystemService(ConnectivityManager::class.java)
            val wifi = cm.allNetworks.any {
                cm.getNetworkCapabilities(it)?.let { c -> c.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) &&
                    c.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) } == true
            }
            val avant = Settings.Global.getInt(ctx.contentResolver, "adb_wifi_enabled", 0)
            if (wifi && avant != 1) Settings.Global.putInt(ctx.contentResolver, "adb_wifi_enabled", 1)
            val apres = Settings.Global.getInt(ctx.contentResolver, "adb_wifi_enabled", 0)
            Log.i(TAG, "wifi=$wifi debogage avant=$avant apres=$apres")
            apres == 1
        } catch (e: Exception) { Log.w(TAG, "échec : $e"); false }
    }

    const val TAG = "DebogageWifi"
}

/** Un réseau Wi-Fi vient d'arriver. */
class WifiArrive : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        // Le Wi-Fi n'est pas toujours prêt tout de suite (et Android peut recouper le débogage pendant la connexion) :
        // on réessaie pendant une vingtaine de secondes
        val fin = goAsync()
        Thread {
            Log.i(DebogageWifi.TAG, "réseau Wi-Fi annoncé")
            for (attente in longArrayOf(0, 2000, 4000, 6000, 8000)) {
                Thread.sleep(attente)
                if (DebogageWifi.activer(ctx) && attente >= 4000) break
            }
            fin.finish()
        }.start()
    }
}
