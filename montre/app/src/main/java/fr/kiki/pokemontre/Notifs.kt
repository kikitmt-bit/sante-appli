package fr.kiki.pokemontre

import android.app.Activity
import android.app.Notification
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.widget.Toast
import androidx.wear.remote.interactions.RemoteActivityHelper
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService
import org.json.JSONObject

/**
 * Les notifications de la montre, pour la case libre du cadran : la dernière notification « utile » (un message, un
 * mail, un rappel…) s'y affiche directement pendant 30 min, tant qu'elle n'est pas effacée. Pas les notifications
 * permanentes (musique, séance en cours, chargement…) ni celles de l'appli elle-même.
 * Autorisation à donner une fois (Wear OS n'a pas de réglage pour ça) : dans le shell de Bugjaeger,
 *   cmd notification allow_listener fr.kiki.pokemontre/fr.kiki.pokemontre.Notifs
 * ⚠️ Les notifications du téléphone (SMS, WhatsApp, Gmail…) n'arrivent PAS ici : Wear OS les affiche par son propre
 * circuit, sans passer par le système de notifications de la montre (vu le 28/10 : seuls les appels manqués de la montre
 * arrivaient). Elles viennent donc de la petite appli « Pokémon » du téléphone (module telephone/), qui les envoie à la
 * montre par Bluetooth (Data Layer) : voir DuTelephone plus bas.
 */
class Notifs : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (!utile(sbn)) return
        val e = sbn.notification.extras
        val titre = e.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim().orEmpty()
        val texte = (e.getCharSequence(Notification.EXTRA_BIG_TEXT) ?: e.getCharSequence(Notification.EXTRA_TEXT))?.toString()?.trim().orEmpty()
        if (titre.isEmpty() && texte.isEmpty()) return
        Derniere.cle = sbn.key
        Derniere.ouvrir = sbn.notification.contentIntent
        retenir(this, sbn.key, titre, texte, sbn.packageName, sbn.postTime)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        if (prefs(this).getString("cle", null) == sbn.key) { Derniere.ouvrir = null; oublier(this, sbn.key) }
    }

    private fun utile(sbn: StatusBarNotification): Boolean {
        val n = sbn.notification
        if (sbn.isOngoing || !sbn.isClearable || sbn.packageName == packageName) return false
        if (n.flags and Notification.FLAG_GROUP_SUMMARY != 0) return false
        if (sbn.packageName in setOf("android", "com.android.systemui", "com.google.android.apps.wearable.settings")) return false
        return n.category !in setOf(Notification.CATEGORY_SERVICE, Notification.CATEGORY_PROGRESS, Notification.CATEGORY_TRANSPORT,
            Notification.CATEGORY_SYSTEM, Notification.CATEGORY_STATUS, Notification.CATEGORY_NAVIGATION, Notification.CATEGORY_WORKOUT,
            Notification.CATEGORY_STOPWATCH, Notification.CATEGORY_LOCATION_SHARING)
    }

    /** La notification gardée en mémoire (pour l'ouvrir d'un toucher). */
    object Derniere {
        var cle: String? = null
        var ouvrir: PendingIntent? = null
    }

    companion object {
        fun prefs(ctx: Context) = ctx.getSharedPreferences("notifs", Context.MODE_PRIVATE)

        /** Le dernier message (de la montre ou du téléphone) : il s'affiche dans la case du bas. */
        fun retenir(ctx: Context, cle: String, titre: String, texte: String, appli: String, quand: Long) {
            prefs(ctx).edit().putString("cle", cle).putString("titre", titre).putString("texte", texte)
                .putString("appli", appli).putLong("quand", quand).apply()
            BasComplication.rafraichir(ctx)
        }

        fun oublier(ctx: Context, cle: String) {
            if (prefs(ctx).getString("cle", null) != cle) return
            prefs(ctx).edit().remove("cle").apply()
            BasComplication.rafraichir(ctx)
        }

        /** (titre, texte) de la dernière notification utile des 30 dernières minutes, encore affichée. */
        fun derniere(ctx: Context): Pair<String, String>? {
            val p = prefs(ctx)
            if (p.getString("cle", null) == null) return null
            if (System.currentTimeMillis() - p.getLong("quand", 0) > 30 * 60_000) return null
            return p.getString("titre", "")!! to p.getString("texte", "")!!
        }
    }
}

/**
 * Les messages du téléphone, envoyés par son appli « Pokémon » (même nom de paquet, même signature : c'est ce qui permet
 * à Wear OS de les relier). Chemins : /notif (un message : JSON titre, texte, appli, quand, cle) et /notif/efface (cle).
 */
class DuTelephone : WearableListenerService() {
    override fun onMessageReceived(m: MessageEvent) {
        try {
            val j = JSONObject(String(m.data))
            val cle = "tel|" + j.optString("cle")
            when (m.path) {
                "/notif" -> { Notifs.Derniere.ouvrir = null
                    Notifs.retenir(this, cle, j.optString("titre"), j.optString("texte"), j.optString("appli"), j.optLong("quand")) }
                "/notif/efface" -> Notifs.oublier(this, cle)
            }
        } catch (e: Exception) { }
    }
}

/** Toucher le message dans la case du cadran : ouvre l'appli qui l'a envoyé (sur la montre, si elle y est), et le
 *  message quitte la case (il a été vu). */
class OuvrirNotif : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val p = Notifs.prefs(this)
        val ouvert = try { Notifs.Derniere.ouvrir?.send(); Notifs.Derniere.ouvrir != null } catch (e: Exception) { false }
        if (!ouvert) p.getString("appli", null)?.let { packageManager.getLaunchIntentForPackage(it) }
            ?.let { try { startActivity(it) } catch (e: Exception) { } }
        p.getString("cle", null)?.let { Notifs.oublier(this, it) }
        finish()
    }
}

/** Toucher les pronos dans la case du cadran : le site des pronos s'ouvre sur le téléphone. */
class OuvrirSite : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val i = Intent(Intent.ACTION_VIEW, Uri.parse(BasComplication.SITE_PRONOS)).addCategory(Intent.CATEGORY_BROWSABLE)
        try {
            RemoteActivityHelper(this).startRemoteActivity(i)
            Toast.makeText(this, "Ouvert sur le téléphone", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) { Toast.makeText(this, "Téléphone injoignable", Toast.LENGTH_SHORT).show() }
        finish()
    }
}
