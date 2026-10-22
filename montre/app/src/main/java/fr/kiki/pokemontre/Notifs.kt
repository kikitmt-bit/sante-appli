package fr.kiki.pokemontre

import android.app.Activity
import android.app.Notification
import android.app.PendingIntent
import android.content.Context
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * Les notifications de la montre, pour la case libre du cadran : la dernière notification « utile » (un message, un
 * mail, un rappel…) s'y affiche directement pendant 30 min, tant qu'elle n'est pas effacée. Pas les notifications
 * permanentes (musique, séance en cours, chargement…) ni celles de l'appli elle-même.
 * Autorisation à donner une fois (Wear OS n'a pas de réglage pour ça) : dans le shell de Bugjaeger,
 *   cmd notification allow_listener fr.kiki.pokemontre/fr.kiki.pokemontre.Notifs
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
        prefs(this).edit().putString("cle", sbn.key).putString("titre", titre).putString("texte", texte)
            .putString("appli", sbn.packageName).putLong("quand", sbn.postTime).apply()
        BasComplication.rafraichir(this)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        if (prefs(this).getString("cle", null) == sbn.key) {
            prefs(this).edit().remove("cle").apply()
            Derniere.ouvrir = null
            BasComplication.rafraichir(this)
        }
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

        /** (titre, texte) de la dernière notification utile des 30 dernières minutes, encore affichée. */
        fun derniere(ctx: Context): Pair<String, String>? {
            val p = prefs(ctx)
            if (p.getString("cle", null) == null) return null
            if (System.currentTimeMillis() - p.getLong("quand", 0) > 30 * 60_000) return null
            return p.getString("titre", "")!! to p.getString("texte", "")!!
        }
    }
}

/** Toucher la notification dans la case du cadran : ouvre l'appli qui l'a envoyée (si on l'a encore en mémoire). */
class OuvrirNotif : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try { Notifs.Derniere.ouvrir?.send() } catch (e: Exception) { }
        finish()
    }
}
