package fr.kiki.pokemontre

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import java.text.NumberFormat
import java.time.LocalDate
import java.time.LocalTime
import java.util.Locale
import kotlin.math.ceil
import kotlin.math.max

/** Les petites phrases du cadran et de l'écran des objectifs, calculées à partir des données du site. */
object Jeu {
    private val fr = NumberFormat.getIntegerInstance(Locale.FRANCE)
    fun nombre(n: Int): String = fr.format(n)
    fun duree(min: Int) = "${min / 60} h ${"%02d".format(min % 60)}"

    /** Ce qu'il reste à faire pour remplir la barre (en pas, en minutes en zone, en minutes de sport). */
    fun resteBarre(e: Donnees.Etat): Triple<Int, Int, Int> {
        val reste = max(e.taille - e.points, 0f)
        return Triple(ceil(reste.toDouble()).toInt() * 100, ceil(reste / 2.0).toInt(), ceil(reste.toDouble()).toInt())
    }

    /** Pendant l'heure qui suit le réveil (la nuit de ce matin est connue). */
    fun matin(e: Donnees.Etat): Boolean {
        val lever = e.nuit?.lever ?: return false
        if (e.jour != LocalDate.now().toString()) return false
        val (h, m) = lever.split(":").map { it.toInt() }
        val maintenant = LocalTime.now().let { it.hour * 60 + it.minute }
        return maintenant in (h * 60 + m)..(h * 60 + m + 60)
    }

    /** La nuit : (titre, détail). */
    fun ligneNuit(e: Donnees.Etat): Pair<String, String> {
        val n = e.nuit!!
        val ok = n.duree >= (e.objectifs?.nuitMin ?: 420)
        val heures = if (n.coucher != null && n.lever != null) "${n.coucher} → ${n.lever}" else ""
        return "☾ Nuit ${duree(n.duree)}${if (ok) "  ✓" else ""}" to (heures + if (ok) " · shiny ×1,5" else "")
    }

    /** Le prochain objectif le plus proche : (titre, détail). */
    fun ligneJour(e: Donnees.Etat): Pair<String, String> {
        val o = e.objectifs
        val pts = "${e.points.toInt()}/${e.taille} pts"
        if (o == null) return "⚡ Barre $pts" to ""
        if (!o.superOk) {
            val zone = o.zone.toFloat() / o.objZone
            val pas = o.pas.toFloat() / o.objPas
            val titre = if (o.zone < o.objZone && (o.pas >= o.objPas || zone >= pas)) "▲ ${o.zone}/${o.objZone} min en zone"
                        else "▲ ${nombre(o.pas)}/${nombre(o.objPas)} pas"
            return titre to "Super Ball · $pts"
        }
        if (!o.hyperOk) {
            val choix = listOf(
                o.pas.toFloat() / o.exploitPas to "▲ ${nombre(o.pas)}/${nombre(o.exploitPas)} pas",
                o.zone.toFloat() / o.exploitZone to "▲ ${o.zone}/${o.exploitZone} min en zone",
                o.seance.toFloat() / o.exploitSeance to "▲ séance ${o.seance}/${o.exploitSeance} min",
            ).maxBy { it.first }
            return choix.second to "Hyper Ball · $pts"
        }
        val (pas, zone, _) = resteBarre(e)
        return "⚡ encore ${nombre(pas)} pas" to "ou $zone min en zone · $pts"
    }
}

/** La Poké Ball 3D du téléphone, photographiée sous tous les angles (assets/ball) : 24 images du tour, 10 de l'ouverture. */
class Ball3D private constructor(val type: String, val tour: List<Bitmap>, val ouvre: List<Bitmap>) {
    companion object {
        private var cache: Ball3D? = null
        /** Diamètre de la ball dans les images (448 px de côté). */
        const val DIAMETRE = 190f

        fun charger(ctx: Context, type: String): Ball3D? {
            cache?.let { if (it.type == type) return it }
            return try {
                val lire = { nom: String -> ctx.assets.open("ball/$nom.webp").use { BitmapFactory.decodeStream(it) } }
                Ball3D(type, (0 until 24).map { lire("${type}_tour_$it") }, (0 until 10).map { lire("${type}_ouvre_$it") })
                    .also { cache = it }
            } catch (e: Exception) { null }
        }

        /** Une seule image (pour la complication), sans tout charger. */
        fun face(ctx: Context, type: String): Bitmap? = try {
            ctx.assets.open("ball/${type}_tour_0.webp").use { BitmapFactory.decodeStream(it) }
        } catch (e: Exception) { null }
    }
}
