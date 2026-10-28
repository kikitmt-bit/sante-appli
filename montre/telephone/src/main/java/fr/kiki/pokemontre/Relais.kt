package fr.kiki.pokemontre

import android.app.Activity
import android.app.Notification
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wearable.Wearable
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Les messages du téléphone vers la montre : chaque notification « qui compte » (message, mail, appel manqué, rappel…)
 * part à la montre par Bluetooth (Wearable MessageClient, chemin /notif), et son effacement aussi (/notif/efface) ; la
 * montre l'affiche 30 min dans la case du bas du cadran (DuTelephone dans l'appli de la montre).
 * Mêmes règles que la montre : pas les notifications permanentes (musique, GPS, téléchargement…), pas les silencieuses,
 * pas celles que le téléphone garde pour lui (« local only », qui n'iraient pas non plus sur la montre).
 */
class Relais : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (!utile(sbn)) return
        val e = sbn.notification.extras
        val titre = e.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim().orEmpty()
        val texte = (e.getCharSequence(Notification.EXTRA_BIG_TEXT) ?: e.getCharSequence(Notification.EXTRA_TEXT))?.toString()?.trim().orEmpty()
        if (titre.isEmpty() && texte.isEmpty()) return
        envoyer("/notif", JSONObject().put("cle", sbn.key).put("titre", titre.take(120)).put("texte", texte.take(300))
            .put("appli", sbn.packageName).put("quand", sbn.postTime))
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        envoyer("/notif/efface", JSONObject().put("cle", sbn.key))
    }

    private fun utile(sbn: StatusBarNotification): Boolean {
        val n = sbn.notification
        if (sbn.isOngoing || !sbn.isClearable || sbn.packageName == packageName) return false
        if (n.flags and (Notification.FLAG_GROUP_SUMMARY or Notification.FLAG_LOCAL_ONLY) != 0) return false
        if (sbn.packageName in setOf("android", "com.android.systemui", "com.google.android.gms", "com.android.vending",
                "com.google.android.apps.wearables.maestro.companion", "com.google.android.wearable.app")) return false
        if (n.category in setOf(Notification.CATEGORY_SERVICE, Notification.CATEGORY_PROGRESS, Notification.CATEGORY_TRANSPORT,
                Notification.CATEGORY_SYSTEM, Notification.CATEGORY_STATUS, Notification.CATEGORY_NAVIGATION,
                Notification.CATEGORY_WORKOUT, Notification.CATEGORY_STOPWATCH, Notification.CATEGORY_LOCATION_SHARING,
                Notification.CATEGORY_PROMO, Notification.CATEGORY_RECOMMENDATION)) return false
        // Les notifications silencieuses (promotions, infos en vrac) ne valent pas la case du cadran
        val r = Ranking()
        return !currentRanking.getRanking(sbn.key, r) || r.importance >= NotificationManager.IMPORTANCE_DEFAULT
    }

    /** Envoie à la montre (toutes les montres reliées), hors du fil principal. */
    private fun envoyer(chemin: String, j: JSONObject) {
        val ctx = applicationContext
        Thread {
            try {
                val noeuds = Tasks.await(Wearable.getNodeClient(ctx).connectedNodes, 10, TimeUnit.SECONDS)
                for (n in noeuds) Tasks.await(Wearable.getMessageClient(ctx).sendMessage(n.id, chemin, j.toString().toByteArray()), 10, TimeUnit.SECONDS)
            } catch (e: Exception) { }
        }.start()
    }
}

/** L'écran de l'appli : l'accès aux notifications est-il donné ? (sinon, le bouton mène au bon réglage) */
class Accueil : Activity() {
    private lateinit var etat: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val m = (24 * resources.displayMetrics.density).toInt()
        etat = TextView(this).apply { textSize = 18f; setTextColor(Color.WHITE); gravity = Gravity.CENTER }
        val bouton = Button(this).apply {
            text = "Ouvrir le réglage « Accès aux notifications »"
            setOnClickListener { startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)) }
        }
        setContentView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; setPadding(m, m, m, m); setBackgroundColor(0xFF14110F.toInt())
            addView(etat); addView(bouton, LinearLayout.LayoutParams(-1, -2).apply { topMargin = m })
        })
    }

    override fun onResume() {
        super.onResume()
        val ok = getSystemService(NotificationManager::class.java)
            .isNotificationListenerAccessGranted(ComponentName(this, Relais::class.java))
        etat.text = if (ok) "✅ C'est bon : les messages du téléphone s'affichent dans la case du bas de la montre.\n\nTu peux fermer cette appli."
                    else "Pour que tes messages s'affichent sur le cadran de la montre, autorise « Pokémon (montre) » dans l'accès aux notifications."
    }
}
