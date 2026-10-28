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
import androidx.wear.watchface.complications.data.SmallImage
import androidx.wear.watchface.complications.data.SmallImageType
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceUpdateRequester
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import androidx.wear.watchface.complications.datasource.SuspendingComplicationDataSourceService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull

/**
 * Complication « Barre d'effort Pokémon » : jauge = points sur 100 avant la prochaine Poké Ball, texte = nombre de
 * Poké Balls à ouvrir (sinon les points), plus l'image de la Poké Ball 3D quand il y en a. Les points comptent les pas
 * et étages en direct de la montre. Un toucher ouvre les Poké Balls, sinon l'espace Pokémon.
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
        val pts = e?.let { Direct.points(this, it) } ?: 0f  // avec les pas et étages en direct de la montre
        return donnees(this, request.complicationType, pts, e?.taille ?: 100, e?.balls?.size ?: 0, e?.balls?.firstOrNull()?.ball)
    }

    companion object {
        fun rafraichir(ctx: Context) {
            ComplicationDataSourceUpdateRequester.create(ctx, ComponentName(ctx, BarreComplication::class.java))
                .requestUpdateAll()
            BasComplication.rafraichir(ctx)
            Tuiles.rafraichir(ctx)
        }

        private fun texte(t: String) = PlainComplicationText.Builder(t).build()

        fun donnees(ctx: Context, type: ComplicationType, points: Float, taille: Int, balls: Int,
                    typeBall: String? = null): ComplicationData? {
            // Un toucher : les Poké Balls à ouvrir s'il y en a, sinon l'espace Pokémon
            val tap = PendingIntent.getActivity(ctx, 0,
                Intent(ctx, if (balls > 0) OuvrirActivity::class.java else PokemonActivity::class.java),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            // Des balls : l'image de la Poké Ball 3D (le cadran l'affiche à la place de la petite ball au trait)
            val image = if (balls > 0) BasComplication.image(ctx, typeBall ?: "poke", 0)?.let {
                SmallImage.Builder(Icon.createWithBitmap(it), SmallImageType.ICON).build() } else null
            val icone = MonochromaticImage.Builder(Icon.createWithResource(ctx, R.drawable.ic_ball)).build()
            val dit = texte(if (balls > 0) "$balls Poké Ball${if (balls > 1) "s" else ""} à ouvrir"
                            else "${points.toInt()} points sur $taille")
            val valeur = if (balls > 0) "×$balls" else "${minOf(points, taille.toFloat()).toInt()}"
            return when (type) {
                ComplicationType.RANGED_VALUE ->
                    // Des balls : maximum à 1000, c'est ce que le cadran regarde pour montrer la Poké Ball 3D (sa condition
                    // sur l'image, [COMPLICATION.SMALL_IMAGE] != null, n'était jamais vraie sur la montre : « ×5% »)
                    (if (balls > 0) RangedValueComplicationData.Builder(1000f, 0f, 1000f, dit)
                     else RangedValueComplicationData.Builder(points.coerceIn(0f, taille.toFloat()), 0f, taille.toFloat(), dit))
                        .setText(texte(valeur))
                        .setTitle(texte(if (balls > 0) "à ouvrir" else "/$taille"))
                        .setMonochromaticImage(icone).setTapAction(tap)
                        .apply { image?.let { setSmallImage(it) } }.build()
                ComplicationType.SHORT_TEXT ->
                    ShortTextComplicationData.Builder(texte(valeur), dit)
                        .setTitle(texte(if (balls > 0) "Balls" else "pts"))
                        .setMonochromaticImage(icone).setTapAction(tap).build()
                else -> null
            }
        }
    }
}
