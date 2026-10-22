package fr.kiki.pokemontre

import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.MonochromaticImage
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.RangedValueComplicationData
import androidx.wear.watchface.complications.data.ShortTextComplicationData
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceUpdateRequester
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import androidx.wear.watchface.complications.datasource.SuspendingComplicationDataSourceService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull

/**
 * Complication « Barre d'effort Pokémon » : jauge = points sur 100 avant la prochaine Poké Ball, texte = nombre de
 * Poké Balls à ouvrir (sinon les points). Un toucher ouvre les objectifs du jour.
 */
class BarreComplication : SuspendingComplicationDataSourceService() {

    override fun getPreviewData(type: ComplicationType): ComplicationData? = donnees(this, type, 63f, 100, 2)

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
        var e = Donnees.lire(this)
        // Données de plus de 10 min : on essaie de les rafraîchir (8 s au plus, sinon on garde les anciennes)
        if (e == null || System.currentTimeMillis() - e.recu > 10 * 60_000) {
            withTimeoutOrNull(8000) { withContext(Dispatchers.IO) { Donnees.telecharger(this@BarreComplication) } }
            e = Donnees.lire(this) ?: e
        }
        return donnees(this, request.complicationType, e?.points ?: 0f, e?.taille ?: 100, e?.balls?.size ?: 0)
    }

    companion object {
        fun rafraichir(ctx: Context) {
            ComplicationDataSourceUpdateRequester.create(ctx, ComponentName(ctx, BarreComplication::class.java))
                .requestUpdateAll()
            BasComplication.rafraichir(ctx)
        }

        private fun texte(t: String) = PlainComplicationText.Builder(t).build()

        fun donnees(ctx: Context, type: ComplicationType, points: Float, taille: Int, balls: Int): ComplicationData? {
            // Un toucher : les objectifs du jour (les Poké Balls s'ouvrent depuis le bas du cadran ou cet écran)
            val tap = PendingIntent.getActivity(ctx, 0, Intent(ctx, ObjectifsActivity::class.java),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            val icone = MonochromaticImage.Builder(Icon.createWithResource(ctx, R.drawable.ic_ball)).build()
            val dit = texte(if (balls > 0) "$balls Poké Ball${if (balls > 1) "s" else ""} à ouvrir"
                            else "${points.toInt()} points sur $taille")
            val valeur = if (balls > 0) "$balls" else "${points.toInt()}"
            return when (type) {
                ComplicationType.RANGED_VALUE ->
                    RangedValueComplicationData.Builder(points.coerceIn(0f, taille.toFloat()), 0f, taille.toFloat(), dit)
                        .setText(texte(valeur))
                        .setTitle(texte(if (balls > 0) "à ouvrir" else "/ $taille"))
                        .setMonochromaticImage(icone).setTapAction(tap).build()
                ComplicationType.SHORT_TEXT ->
                    ShortTextComplicationData.Builder(texte(valeur), dit)
                        .setTitle(texte(if (balls > 0) "Balls" else "pts"))
                        .setMonochromaticImage(icone).setTapAction(tap).build()
                else -> null
            }
        }
    }
}
