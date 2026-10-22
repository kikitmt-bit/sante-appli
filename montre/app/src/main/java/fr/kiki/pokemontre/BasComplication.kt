package fr.kiki.pokemontre

import android.Manifest
import android.app.PendingIntent
import android.content.ComponentName
import android.content.ContentUris
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.net.Uri
import android.provider.CalendarContract
import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.LongTextComplicationData
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceUpdateRequester
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import androidx.wear.watchface.complications.datasource.SuspendingComplicationDataSourceService
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId

/**
 * Complication « case libre » du bas du cadran : un message à la fois, le plus utile du moment.
 *  1. la première heure après le réveil : la nuit (toucher = Santé, page de la nuit) ;
 *  2. un rendez-vous de l'agenda de la montre dans les prochaines 24 h (toucher = agenda) ;
 *  3. sinon le Pokémon, une heure sur deux : le défi du jour le plus proche, ou la dernière nouveauté du Pokédex
 *     (toucher = espace Pokémon).
 * À venir (noté dans CLAUDE.md) : les pronos NFL et le padel.
 */
class BasComplication : SuspendingComplicationDataSourceService() {

    override fun getPreviewData(type: ComplicationType): ComplicationData? =
        if (type != ComplicationType.LONG_TEXT) null
        else LongTextComplicationData.Builder(texte("📅 18:30 · Padel"), texte("Prochain rendez-vous")).setTitle(texte("agenda")).build()

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
        if (request.complicationType != ComplicationType.LONG_TEXT) return null
        val e = Donnees.lire(this)
        if (e != null && Jeu.matin(e)) {
            val (titre, detail) = Jeu.ligneNuit(e)
            return message(titre, detail, Intent(this, SanteActivity::class.java).putExtra("page", 1), 3)
        }
        rendezVous(this)?.let { (titre, detail) ->
            return message(titre, detail, Intent.makeMainSelectorActivity(Intent.ACTION_MAIN, Intent.CATEGORY_APP_CALENDAR), 4)
        }
        if (e == null) return message("Pokémon", "en attente des données", Intent(this, PokemonActivity::class.java), 2)
        val nouveaute = e.dernieres.firstOrNull { it.nouvelle && it.jour >= LocalDate.now().minusDays(1).toString() }
        val (titre, detail) = if (nouveaute != null && LocalTime.now().hour % 2 == 1)
            "${if (nouveaute.jour == LocalDate.now().toString()) "Aujourd'hui" else "Hier"} : ${nouveaute.nom}" to "rejoint ton Pokédex"
        else Jeu.ligneJour(e)
        return message(titre, detail, Intent(this, PokemonActivity::class.java), 2)
    }

    private fun message(titre: String, detail: String, intent: Intent, code: Int): ComplicationData =
        LongTextComplicationData.Builder(texte(titre), texte("$titre. $detail"))
            .setTitle(texte(detail.ifEmpty { " " }))
            .setTapAction(PendingIntent.getActivity(this, code, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            .build()

    companion object {
        private fun texte(t: String) = PlainComplicationText.Builder(t).build()

        /** Le prochain rendez-vous (hors journée entière) des prochaines 24 h : (titre, détail). */
        fun rendezVous(ctx: Context): Pair<String, String>? {
            if (ctx.checkSelfPermission(Manifest.permission.READ_CALENDAR) != PackageManager.PERMISSION_GRANTED) return null
            val maintenant = System.currentTimeMillis()
            // L'agenda synchronisé sur la montre (fournisseur de Wear OS, les prochaines 24 h)
            val uri = Uri.parse("content://com.google.android.wearable.provider.calendar/instances/when").buildUpon().also {
                ContentUris.appendId(it, maintenant - 30 * 60_000); ContentUris.appendId(it, maintenant + 24 * 3600_000)
            }.build()
            return try {
                ctx.contentResolver.query(uri, arrayOf(CalendarContract.Instances.TITLE, CalendarContract.Instances.BEGIN,
                    CalendarContract.Instances.ALL_DAY), null, null, CalendarContract.Instances.BEGIN + " ASC")?.use { c ->
                    while (c.moveToNext()) {
                        if (c.getInt(2) == 1) continue
                        val debut = Instant.ofEpochMilli(c.getLong(1)).atZone(ZoneId.systemDefault())
                        if (debut.toInstant().toEpochMilli() < maintenant - 15 * 60_000) continue
                        val heure = "%02d:%02d".format(debut.hour, debut.minute)
                        val quand = if (debut.toLocalDate() == LocalDate.now()) heure else "demain $heure"
                        return@use "📅 $quand · ${c.getString(0) ?: ""}" to "agenda"
                    }
                    null
                }
            } catch (e: Exception) { null }
        }

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
            if (n > 0) {
                val p = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFFFCB05.toInt() }
                val r = S * 0.17f
                c.drawCircle(S - r - 2, r + 2, r, p)
                p.color = 0xFF3A2A00.toInt(); p.textSize = r * 1.3f; p.typeface = Typeface.DEFAULT_BOLD; p.textAlign = Paint.Align.CENTER
                c.drawText(if (n > 9) "9+" else "$n", S - r - 2, r + 2 + r * 0.45f, p)
            }
            return b
        }

        fun rafraichir(ctx: Context) {
            ComplicationDataSourceUpdateRequester.create(ctx, ComponentName(ctx, BasComplication::class.java)).requestUpdateAll()
        }
    }
}
