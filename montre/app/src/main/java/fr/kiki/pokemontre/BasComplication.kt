package fr.kiki.pokemontre

import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.graphics.drawable.Icon
import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.LongTextComplicationData
import androidx.wear.watchface.complications.data.MonochromaticImage
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.SmallImage
import androidx.wear.watchface.complications.data.SmallImageType
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceUpdateRequester
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import androidx.wear.watchface.complications.datasource.SuspendingComplicationDataSourceService

/**
 * Complication « Pokémon : ligne du bas » (texte long), pour le bas du cadran :
 * - des Poké Balls à ouvrir : la Poké Ball (image 3D) avec leur nombre ; un toucher lance l'ouverture ;
 * - l'heure qui suit le réveil : la nuit (durée, horaires, bonus shiny) ;
 * - sinon : l'objectif le plus proche (Super Ball, puis Hyper Ball, puis la barre).
 * Un toucher (sans ball) ouvre les objectifs du jour.
 */
class BasComplication : SuspendingComplicationDataSourceService() {

    override fun getPreviewData(type: ComplicationType): ComplicationData? =
        if (type != ComplicationType.LONG_TEXT) null
        else LongTextComplicationData.Builder(texte("▲ 10/15 min en zone"), texte("Objectif du jour"))
            .setTitle(texte("Super Ball · 49/100 pts")).build()

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
        if (request.complicationType != ComplicationType.LONG_TEXT) return null
        val e = Donnees.lire(this) ?: return LongTextComplicationData.Builder(texte("Pokémon"), texte("Pokémon"))
            .setTitle(texte("en attente des données")).setTapAction(tap(this, false)).build()
        val n = e.balls.size
        if (n > 0) {
            val dit = texte("$n Poké Ball${if (n > 1) "s" else ""} à ouvrir")
            val b = LongTextComplicationData.Builder(texte(" "), dit).setTapAction(tap(this, true))
                .setMonochromaticImage(MonochromaticImage.Builder(Icon.createWithResource(this, R.drawable.ic_ball)).build())
            image(this, e.balls.first().ball, n)?.let {
                b.setSmallImage(SmallImage.Builder(Icon.createWithBitmap(it), SmallImageType.ICON).build())
            }
            return b.build()
        }
        val (titre, detail) = if (Jeu.matin(e)) Jeu.ligneNuit(e) else Jeu.ligneJour(e)
        return LongTextComplicationData.Builder(texte(titre), texte("$titre. $detail"))
            .setTitle(texte(detail.ifEmpty { " " })).setTapAction(tap(this, false)).build()
    }

    companion object {
        private fun texte(t: String) = PlainComplicationText.Builder(t).build()

        private fun tap(ctx: Context, ouvrir: Boolean): PendingIntent = PendingIntent.getActivity(
            ctx, if (ouvrir) 1 else 2, Intent(ctx, if (ouvrir) OuvrirActivity::class.java else ObjectifsActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)

        /** La Poké Ball 3D avec une pastille jaune et le nombre de balls. */
        fun image(ctx: Context, type: String, n: Int): Bitmap? {
            val face = Ball3D.face(ctx, type) ?: return null
            val S = 160
            val b = Bitmap.createBitmap(S, S, Bitmap.Config.ARGB_8888)
            val c = Canvas(b)
            val t = 448f * (S * 0.78f / Ball3D.DIAMETRE)
            val cx = S * 0.44f
            val cy = S * 0.56f
            c.drawBitmap(face, null, RectF(cx - t / 2, cy - t / 2, cx + t / 2, cy + t / 2), Paint(Paint.FILTER_BITMAP_FLAG))
            val p = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFFFCB05.toInt() }
            val r = S * 0.17f
            c.drawCircle(S - r - 2, r + 2, r, p)
            p.color = 0xFF3A2A00.toInt(); p.textSize = r * 1.3f; p.typeface = Typeface.DEFAULT_BOLD; p.textAlign = Paint.Align.CENTER
            c.drawText(if (n > 9) "9+" else "$n", S - r - 2, r + 2 + r * 0.45f, p)
            return b
        }

        fun rafraichir(ctx: Context) {
            ComplicationDataSourceUpdateRequester.create(ctx, ComponentName(ctx, BasComplication::class.java)).requestUpdateAll()
        }
    }
}
