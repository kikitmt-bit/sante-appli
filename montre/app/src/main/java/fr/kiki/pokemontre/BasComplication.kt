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
 * Complication « case libre » du bas du cadran : une seule info à la fois, seulement des infos utiles (jamais de Pokémon),
 * dans l'ordre choisi par Kiki (28/10) :
 *  1. un rendez-vous de l'agenda qui commence dans les 3 h (toucher = agenda) ;
 *  2. les pronos NFL en retard : matchs pas pronostiqués qui commencent dans moins de 4 h (« 🏈 2 pronos avant
 *     19:00 », toucher = le site sur le téléphone) ;
 *  3. le jour d'une réservation de padel : l'heure et le code (le script du padel les écrit dans l'agenda, « 🎾 Padel ✅
 *     réservé · 🔑 4821 » ; toucher = l'appli padel de la montre) ;
 *  4. le dernier message des 30 dernières minutes (notifications de la montre, et celles du téléphone envoyées par la
 *     petite appli « Pokémon » du téléphone, voir Notifs.kt ; toucher = l'appli du message sur la montre) ;
 *  puis, s'il n'y a rien de tout ça : la nuit la première heure après le réveil, ou un rendez-vous plus tard
 *  (aujourd'hui ou demain) ; sinon la case reste vide. Toutes les heures à l'heure de la montre (pas d'heure de Paris
 *  pendant le voyage au Japon, refusé par Kiki).
 */
class BasComplication : SuspendingComplicationDataSourceService() {

    override fun getPreviewData(type: ComplicationType): ComplicationData? =
        if (type != ComplicationType.LONG_TEXT) null
        else LongTextComplicationData.Builder(texte("📅 18:30 · Padel"), texte("Prochain rendez-vous")).setTitle(texte("agenda")).build()

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
        if (request.complicationType != ComplicationType.LONG_TEXT) return null
        val maintenant = System.currentTimeMillis()
        val agenda = Intent.makeMainSelectorActivity(Intent.ACTION_MAIN, Intent.CATEGORY_APP_CALENDAR)
        val rdvs = rendezVous(this)
        val rdv = rdvs.firstOrNull { !it.padel }
        // 1. Un rendez-vous dans les 3 h
        if (rdv != null && rdv.debut - maintenant < 3 * 3600_000) return message(rdv.ligne(), "agenda", agenda, 4)
        // 2. Les pronos NFL
        val e = Donnees.lire(this)
        ligneProns(e, maintenant)?.let { return message(it, "pronos NFL", Intent(this, OuvrirSite::class.java), 6) }
        // 3. Le padel du jour
        rdvs.firstOrNull { it.padel && it.aujourdhui }?.let { pa ->
            val tap = packageManager.getLaunchIntentForPackage(PADEL) ?: agenda
            return message("🎾 ${pa.heure} Padel" + (pa.code?.let { " · code $it" } ?: ""), "padel", tap, 7)
        }
        // 4. Le dernier message
        Notifs.derniere(this)?.let { (titre, texte) ->
            return message("💬 " + titre.ifEmpty { texte }, if (titre.isEmpty()) "" else texte, Intent(this, OuvrirNotif::class.java), 5)
        }
        if (e != null && Jeu.matin(e)) {
            val (titre, detail) = Jeu.ligneNuit(e)
            return message(titre, detail.replace(" · shiny ×1,5", ""), Intent(this, SanteActivity::class.java).putExtra("page", 1), 3)
        }
        if (rdv != null) return message(rdv.ligne(), "agenda", agenda, 4)
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

        const val PADEL = "fr.kiki.padel.montre"
        const val SITE_PRONOS = "https://badabingnfl.streamlit.app"

        /** Un rendez-vous de l'agenda ; padel = l'événement écrit par le script du padel (« 🎾 Padel … · 🔑 4821 »). */
        data class Rdv(val titre: String, val debut: Long, val heure: String, val aujourdhui: Boolean) {
            val padel get() = titre.startsWith("🎾 Padel")
            val code get() = titre.substringAfter("🔑", "").trim().takeIf { it.isNotEmpty() }
            fun ligne() = "📅 ${if (aujourdhui) heure else "demain $heure"} · $titre"
        }

        /** Les rendez-vous (hors journée entière) des prochaines 24 h, dans l'ordre ; ceux commencés depuis 15 min sont passés. */
        fun rendezVous(ctx: Context): List<Rdv> {
            if (ctx.checkSelfPermission(Manifest.permission.READ_CALENDAR) != PackageManager.PERMISSION_GRANTED) return emptyList()
            val maintenant = System.currentTimeMillis()
            // L'agenda synchronisé sur la montre (fournisseur de Wear OS, les prochaines 24 h)
            val uri = Uri.parse("content://com.google.android.wearable.provider.calendar/instances/when").buildUpon().also {
                ContentUris.appendId(it, maintenant - 30 * 60_000); ContentUris.appendId(it, maintenant + 24 * 3600_000)
            }.build()
            val liste = mutableListOf<Rdv>()
            try {
                ctx.contentResolver.query(uri, arrayOf(CalendarContract.Instances.TITLE, CalendarContract.Instances.BEGIN,
                    CalendarContract.Instances.ALL_DAY), null, null, CalendarContract.Instances.BEGIN + " ASC")?.use { c ->
                    while (c.moveToNext()) {
                        if (c.getInt(2) == 1) continue
                        val debut = Instant.ofEpochMilli(c.getLong(1)).atZone(ZoneId.systemDefault())
                        if (debut.toInstant().toEpochMilli() < maintenant - 15 * 60_000) continue
                        liste += Rdv((c.getString(0) ?: "").trim(), debut.toInstant().toEpochMilli(),
                            "%02d:%02d".format(debut.hour, debut.minute), debut.toLocalDate() == LocalDate.now())
                    }
                }
            } catch (e: Exception) { }
            return liste
        }

        /** « 🏈 2 pronos avant 19:00 » : seulement en retard, les matchs pas encore pronostiqués qui commencent dans
         *  moins de 4 h (choix de Kiki, 29/10) ; sinon null. */
        fun ligneProns(e: Donnees.Etat?, maintenant: Long): String? {
            val restent = e?.pronos?.filter { it > maintenant && it - maintenant <= 4 * 3600_000 }?.sorted() ?: return null
            val premier = restent.firstOrNull() ?: return null
            val d = Instant.ofEpochMilli(premier).atZone(ZoneId.systemDefault())
            val jour = when (d.toLocalDate()) {
                LocalDate.now() -> ""
                LocalDate.now().plusDays(1) -> "demain "
                else -> listOf("lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim.")[d.dayOfWeek.value - 1] + " "
            }
            val n = restent.size
            return "🏈 $n prono${if (n > 1) "s" else ""} avant $jour%02d:%02d".format(d.hour, d.minute)
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
