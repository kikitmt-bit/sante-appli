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
import androidx.wear.watchface.complications.data.NoDataComplicationData
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceUpdateRequester
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import androidx.wear.watchface.complications.datasource.SuspendingComplicationDataSourceService
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * Complication « case libre » du bas du cadran : un message à la fois, seulement des infos utiles (rien de Pokémon) :
 *  1. la dernière notification utile (message, mail, rappel…) des 30 dernières minutes, affichée directement
 *     (toucher = l'appli qui l'a envoyée) ;
 *  2. un rendez-vous de l'agenda qui commence dans les 3 h (toucher = agenda) ;
 *  3. la première heure après le réveil : la nuit (toucher = Santé, page de la nuit) ;
 *  4. un rendez-vous plus tard (aujourd'hui ou demain) ;
 *  sinon rien : la case reste vide.
 * À venir (noté dans CLAUDE.md) : les pronos NFL et le padel.
 */
class BasComplication : SuspendingComplicationDataSourceService() {

    override fun getPreviewData(type: ComplicationType): ComplicationData? =
        if (type != ComplicationType.LONG_TEXT) null
        else LongTextComplicationData.Builder(texte("📅 18:30 · Padel"), texte("Prochain rendez-vous")).setTitle(texte("agenda")).build()

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
        if (request.complicationType != ComplicationType.LONG_TEXT) return null
        Notifs.derniere(this)?.let { (titre, texte) ->
            return message("💬 " + titre.ifEmpty { texte }, if (titre.isEmpty()) "" else texte, Intent(this, OuvrirNotif::class.java), 5)
        }
        val agenda = Intent.makeMainSelectorActivity(Intent.ACTION_MAIN, Intent.CATEGORY_APP_CALENDAR)
        val rdv = rendezVous(this)
        if (rdv != null && rdv.third - System.currentTimeMillis() < 3 * 3600_000) return message(rdv.first, rdv.second, agenda, 4)
        val e = Donnees.lire(this)
        if (e != null && Jeu.matin(e)) {
            val (titre, detail) = Jeu.ligneNuit(e)
            return message(titre, detail.replace(" · shiny ×1,5", ""), Intent(this, SanteActivity::class.java).putExtra("page", 1), 3)
        }
        if (rdv != null) return message(rdv.first, rdv.second, agenda, 4)
        return NoDataComplicationData()  // rien d'utile : la case reste vide (choix de Kiki)
    }

    private fun message(titre: String, detail: String, intent: Intent, code: Int): ComplicationData =
        LongTextComplicationData.Builder(texte(titre), texte("$titre. $detail"))
            .setTitle(texte(detail.ifEmpty { " " }))
            .setTapAction(PendingIntent.getActivity(this, code, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            .build()

    companion object {
        private fun texte(t: String) = PlainComplicationText.Builder(t).build()

        /** Les objectifs santé du jour : pas (en direct de la montre) et minutes en zone. */
        fun objectifs(ctx: Context, e: Donnees.Etat?): Pair<String, String> {
            val o = e?.objectifs
            val objPas = o?.objPas ?: 5000
            val objZone = o?.objZone ?: 15
            val pas = maxOf(Direct.lire(ctx)?.pas?.toInt() ?: 0, e?.sante?.pas ?: 0)
            val zone = e?.sante?.zone ?: 0
            if (pas >= objPas && zone >= objZone) return "Objectifs du jour atteints ✓" to "${Jeu.nombre(pas)} pas · $zone min en zone"
            val p = if (pas >= objPas) "👟 ${Jeu.nombre(pas)} pas ✓" else "👟 ${Jeu.nombre(pas)} / ${Jeu.nombre(objPas)}"
            val z = if (zone >= objZone) "🔥 $zone min ✓" else "🔥 $zone / $objZone min"
            return "$p · $z" to "objectifs du jour"
        }

        /** Le prochain rendez-vous (hors journée entière) des prochaines 24 h : (titre, détail, début en ms). */
        fun rendezVous(ctx: Context): Triple<String, String, Long>? {
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
                        return@use Triple("📅 $quand · ${c.getString(0) ?: ""}", "agenda", debut.toInstant().toEpochMilli())
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
