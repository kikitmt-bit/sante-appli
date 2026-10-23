package fr.kiki.pokemontre

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Context
import android.graphics.Path
import android.media.AudioManager
import android.os.Handler
import android.os.Looper
import android.view.accessibility.AccessibilityEvent

/**
 * Sur la montre, l'écran de dictée de Gboard n'allume pas le micro tout seul (sauf pour quelques applis de Google,
 * liste fixée par Google) : ce service d'accessibilité touche le gros bouton micro à la place de Kiki, une seule
 * fois, et seulement quand c'est l'écran Claude qui vient d'ouvrir la dictée (moins de 6 s). Il n'écoute que Gboard.
 * À activer une fois sur la montre : Paramètres → Accessibilité → « Micro automatique (Claude) ».
 */
class AutoMicro : AccessibilityService() {
    private val main = Handler(Looper.getMainLooper())

    override fun onAccessibilityEvent(e: AccessibilityEvent) {
        if (e.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        if (!demande(this)) return
        oublier(this)
        // Le bouton micro est au milieu, vers le bas (192, 300 sur l'écran de 384). Touché trop tôt (pendant
        // « Initialisation »), Gboard répond « Je n'ai pas compris » : on attend que l'écran soit prêt, et on ne touche
        // pas si le micro écoute déjà (sinon on l'arrêterait)
        main.postDelayed({ if (!microOccupe()) toucher(0.5f, 0.78f) }, DELAI)
    }

    private fun microOccupe() = try {
        getSystemService(AudioManager::class.java).activeRecordingConfigurations.isNotEmpty()
    } catch (e: Exception) { false }

    private fun toucher(fx: Float, fy: Float) {
        val m = resources.displayMetrics
        val p = Path().apply { moveTo(m.widthPixels * fx, m.heightPixels * fy) }
        dispatchGesture(GestureDescription.Builder().addStroke(GestureDescription.StrokeDescription(p, 0, 60)).build(), null, null)
    }

    override fun onInterrupt() {}

    companion object {
        const val DELAI = 1300L
        private fun prefs(ctx: Context) = ctx.getSharedPreferences("automicro", Context.MODE_PRIVATE)
        /** L'écran Claude ouvre la dictée de Gboard : le prochain écran de Gboard aura son micro touché. */
        fun prevoir(ctx: Context) = prefs(ctx).edit().putLong("quand", System.currentTimeMillis()).commit()
        fun demande(ctx: Context) = System.currentTimeMillis() - prefs(ctx).getLong("quand", 0) < 6000
        fun oublier(ctx: Context) = prefs(ctx).edit().remove("quand").apply()
    }
}
