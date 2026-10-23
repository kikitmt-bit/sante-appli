package fr.kiki.pokemontre

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.os.SystemClock
import androidx.health.services.client.HealthServices
import androidx.health.services.client.MeasureCallback
import androidx.health.services.client.data.Availability
import androidx.health.services.client.data.DataPointContainer
import androidx.health.services.client.data.DataType
import androidx.health.services.client.data.DeltaDataType
import org.json.JSONObject
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

/**
 * L'écran Cœur (toucher le cœur du cadran) : le cœur en direct (mesuré par la montre tant que l'écran est ouvert),
 * la courbe des dernières 24 h (moyenne par demi-heure, bande mini / maxi), puis la FC au repos et la VFC des 7 derniers
 * jours et les minutes du jour dans chaque zone. Courbe et historique viennent du site (minute par minute de la montre).
 */
class CoeurActivity : PagesActivity() {
    private var direct: Int? = null
    private val mesure by lazy { HealthServices.getClient(this).measureClient }
    private val rappel = object : MeasureCallback {
        override fun onAvailabilityChanged(dataType: DeltaDataType<*, *>, availability: Availability) {}
        override fun onDataReceived(data: DataPointContainer) {
            data.getData(DataType.HEART_RATE_BPM).lastOrNull()?.value?.let { v ->
                if (v > 25) { direct = v.toInt(); (vue as CoeurView).direct = direct; vue.postInvalidate() }
            }
        }
    }
    private var inscrit = false

    override fun creerVue() = CoeurView(this)

    override fun onResume() {
        super.onResume()
        if (checkSelfPermission(Manifest.permission.BODY_SENSORS) == PackageManager.PERMISSION_GRANTED) mesurer()
        else requestPermissions(arrayOf(Manifest.permission.BODY_SENSORS), 4)
    }

    override fun onPause() {
        super.onPause()
        if (inscrit) { try { mesure.unregisterMeasureCallbackAsync(DataType.HEART_RATE_BPM, rappel) } catch (e: Exception) { }; inscrit = false }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (checkSelfPermission(Manifest.permission.BODY_SENSORS) == PackageManager.PERMISSION_GRANTED) mesurer()
    }

    private fun mesurer() {
        if (inscrit) return
        try { mesure.registerMeasureCallback(DataType.HEART_RATE_BPM, rappel); inscrit = true } catch (e: Exception) { }
    }
}

@SuppressLint("ViewConstructor")
class CoeurView(act: CoeurActivity) : PagesView(act, 2) {
    var direct: Int? = null
    private val rouge = 0xFFFF5A5F.toInt()

    override fun dessinerPage(c: Canvas, n: Int, e: Donnees.Etat) = if (n == 0) courbe(c, e.coeur) else semaine(c, e.coeur)

    /** Un petit cœur qui bat au rythme mesuré. */
    private fun coeurDessin(c: Canvas, x: Float, y: Float, t: Float, bpm: Int) {
        val phase = (SystemClock.uptimeMillis() % (60_000L / max(bpm, 30))).toFloat() / (60_000f / max(bpm, 30))
        val k = 1 + 0.12f * max(0f, sin(phase * Math.PI.toFloat() * 2)).let { it * it }
        val r = t * k
        val path = Path().apply {
            moveTo(x, y + r * 0.9f)
            cubicTo(x - r * 1.6f, y - r * 0.2f, x - r * 0.7f, y - r * 1.3f, x, y - r * 0.45f)
            cubicTo(x + r * 0.7f, y - r * 1.3f, x + r * 1.6f, y - r * 0.2f, x, y + r * 0.9f)
            close()
        }
        p.color = rouge; c.drawPath(path, p)
    }

    private fun courbe(c: Canvas, k: JSONObject?) {
        val derniere = k?.optJSONObject("derniere")
        val bpm = direct ?: derniere?.optInt("bpm")
        // Le chiffre du moment
        val cx = width / 2f
        coeurDessin(c, cx - S * 0.13f, S * 0.2f, S * 0.035f, bpm ?: 60)
        texte(c, bpm?.toString() ?: "--", cx + S * 0.03f, S * 0.245f, S * 0.12f, Color.WHITE, true, centre = true)
        texte(c, if (direct != null) "en direct" else derniere?.let { "à ${it.optString("heure")}" } ?: "", cx, S * 0.3f,
              S * 0.036f, if (direct != null) rouge else gris, centre = true)
        if (direct != null) postInvalidateOnAnimation()
        // La courbe des 24 dernières heures
        val serie = k?.optJSONArray("serie")
        if (k == null || serie == null || serie.length() < 2) {
            texte(c, "Pas encore de courbe", cx, S * 0.55f, S * 0.042f, gris, centre = true); return
        }
        val pts = (0 until serie.length()).map { serie.getJSONArray(it) }
        val bas = pts.minOf { it.getInt(2) }.coerceAtMost(55)
        val haut = pts.maxOf { it.getInt(3) }.coerceAtLeast(110)
        val g = S * 0.15f; val d = S * 0.85f; val y0 = S * 0.38f; val y1 = S * 0.7f
        val x = { i: Int -> g + (d - g) * i / 48f }
        val y = { v: Int -> y1 - (y1 - y0) * (v - bas) / (haut - bas).toFloat() }
        // repères : 60, 100, 140
        for (v in listOf(60, 100, 140)) if (v in bas..haut) {
            p.color = 0xFF1E2640.toInt(); c.drawRect(g, y(v) - 1, d, y(v) + 1, p)
            texte(c, "$v", g - S * 0.012f, y(v) + S * 0.012f, S * 0.03f, 0xFF5D6888.toInt(), droite = true)
        }
        // bande mini / maxi
        val bande = Path()
        pts.forEachIndexed { i, a -> if (i == 0) bande.moveTo(x(a.getInt(0)), y(a.getInt(3))) else bande.lineTo(x(a.getInt(0)), y(a.getInt(3))) }
        pts.reversed().forEach { a -> bande.lineTo(x(a.getInt(0)), y(a.getInt(2))) }
        bande.close()
        p.color = BallView.alpha(rouge, 0.22f); c.drawPath(bande, p)
        // moyenne
        val ligne = Path()
        pts.forEachIndexed { i, a -> if (i == 0) ligne.moveTo(x(a.getInt(0)), y(a.getInt(1))) else ligne.lineTo(x(a.getInt(0)), y(a.getInt(1))) }
        p.style = Paint.Style.STROKE; p.strokeWidth = S * 0.008f; p.strokeJoin = Paint.Join.ROUND; p.color = rouge
        c.drawPath(ligne, p); p.style = Paint.Style.FILL
        // heures en bas
        val debut = k.optString("debut", "")
        val h0 = debut.substringBefore(":").toIntOrNull()
        if (h0 != null) for (i in listOf(0, 16, 32, 48)) {
            texte(c, "${(h0 + i / 2) % 24}h", x(i), y1 + S * 0.045f, S * 0.03f, 0xFF5D6888.toInt(), centre = true)
        }
        val repos = k.opt("repos").takeIf { it is Number }?.toString()
        val maxi = k.opt("max").takeIf { it is Number }?.toString()
        texte(c, "repos ${repos ?: "—"}   ·   maxi ${maxi ?: "—"}", cx, S * 0.82f, S * 0.04f, 0xFFC9D3EA.toInt(), centre = true)
    }

    private fun semaine(c: Canvas, k: JSONObject?) {
        titre(c, "7 derniers jours")
        val sem = k?.optJSONArray("semaine")
        if (k == null || sem == null || sem.length() == 0) { texte(c, "Pas encore de données", width / 2f, S * 0.5f, S * 0.042f, gris, centre = true); return }
        val jours = (0 until sem.length()).map { sem.getJSONObject(it) }
        val repos = jours.map { if (it.isNull("repos")) null else it.optInt("repos") }
        val vals = repos.filterNotNull()
        texte(c, "FC au repos", S * 0.2f, S * 0.27f, S * 0.04f, rouge, true)
        if (vals.isNotEmpty()) {
            val lo = vals.min() - 3; val hi = vals.max() + 2
            val l = S * 0.6f; val w = l / 7f
            jours.forEachIndexed { i, j ->
                val x = S * 0.2f + i * w
                val v = repos[i]
                if (v != null) {
                    val h = S * 0.12f * (v - lo) / max(hi - lo, 1).toFloat() + S * 0.02f
                    p.color = if (i == 6) rouge else BallView.alpha(rouge, 0.55f)
                    c.drawRoundRect(RectF(x + w * 0.18f, S * 0.45f - h, x + w * 0.82f, S * 0.45f), S * 0.01f, S * 0.01f, p)
                    texte(c, "$v", x + w / 2, S * 0.43f - h, S * 0.028f, 0xFFC9D3EA.toInt(), centre = true)
                }
                texte(c, j.optString("jour"), x + w / 2, S * 0.49f, S * 0.03f, gris, centre = true)
            }
        }
        val vfc = jours.mapNotNull { if (it.isNull("vfc")) null else it.optInt("vfc") }
        if (vfc.isNotEmpty())
            texte(c, "VFC  ${vfc.last()} ms  (moy. 7 j : ${vfc.average().toInt()})", width / 2f, S * 0.57f, S * 0.04f, 0xFFDDDDDD.toInt(), centre = true)
        // Les zones du jour
        val z = k.optJSONObject("zones")
        texte(c, "Zones aujourd'hui", S * 0.2f, S * 0.66f, S * 0.04f, 0xFFFF9E5A.toInt(), true)
        val zones = listOf("graisses" to ("Brûle-graisses" to 0xFFFFCB05.toInt()), "cardio" to ("Cardio" to 0xFFFF9E5A.toInt()),
                           "pic" to ("Pic" to rouge))
        val total = max(zones.sumOf { z?.optInt(it.first) ?: 0 }, 1)
        zones.forEachIndexed { i, (cle, info) ->
            val y = S * 0.72f + i * S * 0.055f
            val m = z?.optInt(cle) ?: 0
            texte(c, info.first, S * 0.2f, y, S * 0.034f, 0xFFC9D3EA.toInt())
            jauge(c, S * 0.47f, y - S * 0.018f, S * 0.22f, m / total.toFloat(), info.second)
            texte(c, "$m min", S * 0.8f, y, S * 0.034f, 0xFFC9D3EA.toInt(), droite = true)
        }
    }
}
