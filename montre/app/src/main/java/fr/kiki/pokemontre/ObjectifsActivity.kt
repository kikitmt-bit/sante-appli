package fr.kiki.pokemontre

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.os.Bundle
import android.view.MotionEvent
import android.view.View
import kotlin.math.min

/** Les objectifs du jour (ouvert en touchant l'anneau du cadran) : la barre, puis les Super, Hyper et Master Balls. */
class ObjectifsActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val vue = ObjectifsView(this) { finish() }
        setContentView(vue)
        vue.etat = Donnees.lire(this)
        Thread {
            if (Donnees.telecharger(this)) runOnUiThread { vue.etat = Donnees.lire(this); vue.invalidate() }
            BarreComplication.rafraichir(this)
        }.start()
    }
}

@SuppressLint("ViewConstructor")
class ObjectifsView(ctx: Context, private val fini: () -> Unit) : View(ctx) {
    var etat: Donnees.Etat? = null
    private val p = Paint(Paint.ANTI_ALIAS_FLAG)
    private val t = Paint(Paint.ANTI_ALIAS_FLAG)
    private val gras = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)

    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(e: MotionEvent): Boolean {
        if (e.action == MotionEvent.ACTION_UP) {
            // Des Poké Balls à ouvrir : un toucher sur la ligne du bas les ouvre
            if ((etat?.balls?.size ?: 0) > 0 && e.y > height * 0.8f)
                context.startActivity(Intent(context, OuvrirActivity::class.java))
            fini()
        }
        return true
    }

    private fun texte(c: Canvas, s: String, x: Float, y: Float, taille: Float, couleur: Int, enGras: Boolean = false,
                      align: Paint.Align = Paint.Align.LEFT) {
        t.textSize = taille; t.color = couleur; t.typeface = if (enGras) gras else Typeface.DEFAULT; t.textAlign = align
        c.drawText(s, x, y, t)
    }

    /** Une jauge (fond sombre, part remplie). */
    private fun jauge(c: Canvas, x: Float, y: Float, l: Float, h: Float, part: Float, couleur: Int, ok: Boolean = false) {
        p.color = 0xFF222A40.toInt(); c.drawRoundRect(RectF(x, y, x + l, y + h), h / 2, h / 2, p)
        val w = l * part.coerceIn(0f, 1f)
        if (w > 0.5f) { p.color = if (ok) 0xFF4CD3A0.toInt() else couleur; c.drawRoundRect(RectF(x, y, x + w, y + h), h / 2, h / 2, p) }
    }

    override fun onDraw(c: Canvas) {
        val S = min(width, height).toFloat()
        c.drawColor(0xFF0B1020.toInt())
        val e = etat
        texte(c, "Objectifs du jour", width / 2f, S * 0.17f, S * 0.058f, Color.WHITE, true, Paint.Align.CENTER)
        if (e == null) { texte(c, "Chargement…", width / 2f, S * 0.5f, S * 0.05f, 0xFF8A93AD.toInt(), false, Paint.Align.CENTER); return }
        val o = e.objectifs
        val g = S * 0.2f
        val d = S * 0.8f
        val l = d - g
        val pas = S * 0.118f
        var y = S * 0.27f
        val gris = 0xFF8A93AD.toInt()
        val fs = S * 0.042f
        val jh = S * 0.016f

        // La barre d'effort
        val (rPas, rZone, _) = Jeu.resteBarre(e)
        texte(c, "⚡ Barre ${e.points.toInt()}/${e.taille}", g, y, fs, 0xFFFFCB05.toInt(), true)
        texte(c, "${Jeu.nombre(rPas)} pas · $rZone min", d, y, fs * 0.9f, gris, align = Paint.Align.RIGHT)
        jauge(c, g, y + S * 0.018f, l, jh, e.points / e.taille, 0xFFFFCB05.toInt())
        y += pas
        if (o != null) {
            // Super Ball : les deux à la fois
            texte(c, "Super Ball${if (o.superOk) "  ✓" else ""}", g, y, fs, 0xFF7FB0FF.toInt(), true)
            texte(c, "${Jeu.nombre(o.pas)} pas · ${o.zone} min", d, y, fs * 0.9f, gris, align = Paint.Align.RIGHT)
            val m = S * 0.02f
            jauge(c, g, y + S * 0.018f, l / 2 - m / 2, jh, o.pas.toFloat() / o.objPas, 0xFF7FB0FF.toInt(), o.superOk || o.pas >= o.objPas)
            jauge(c, g + l / 2 + m / 2, y + S * 0.018f, l / 2 - m / 2, jh, o.zone.toFloat() / o.objZone, 0xFF7FB0FF.toInt(),
                  o.superOk || o.zone >= o.objZone)
            y += pas
            // Hyper Ball : un des trois exploits (on montre le plus avancé)
            val meilleur = listOf(
                o.pas.toFloat() / o.exploitPas to "${Jeu.nombre(o.pas)}/${Jeu.nombre(o.exploitPas)} pas",
                o.zone.toFloat() / o.exploitZone to "${o.zone}/${o.exploitZone} min zone",
                o.seance.toFloat() / o.exploitSeance to "séance ${o.seance}/${o.exploitSeance} min",
            ).maxBy { it.first }
            texte(c, "Hyper Ball${if (o.hyperOk) "  ✓" else ""}", g, y, fs, 0xFFFFE27A.toInt(), true)
            texte(c, meilleur.second, d, y, fs * 0.9f, gris, align = Paint.Align.RIGHT)
            jauge(c, g, y + S * 0.018f, l, jh, meilleur.first, 0xFFFFE27A.toInt(), o.hyperOk)
            y += pas
            // Master Ball : la série
            texte(c, "Master Ball", g, y, fs, 0xFFC79BFF.toInt(), true)
            texte(c, "série ${o.serie}/${o.serieLegendaire}${if (o.joker) " · 🃏" else ""}", d, y, fs * 0.9f, gris, align = Paint.Align.RIGHT)
            jauge(c, g, y + S * 0.018f, l, jh, (o.serie % o.serieLegendaire).toFloat() / o.serieLegendaire, 0xFFC79BFF.toInt())
            y += pas
        }
        // La nuit, ou les balls à ouvrir
        val n = e.balls.size
        if (n > 0) texte(c, "Touche ici : $n Poké Ball${if (n > 1) "s" else ""} à ouvrir", width / 2f, S * 0.86f, fs,
                         0xFFFFCB05.toInt(), true, Paint.Align.CENTER)
        else if (e.nuit != null) {
            val (titre, detail) = Jeu.ligneNuit(e)
            texte(c, titre, width / 2f, y + S * 0.01f, fs, 0xFFB9C6FF.toInt(), false, Paint.Align.CENTER)
            texte(c, detail, width / 2f, y + S * 0.065f, fs * 0.85f, 0xFF7884A8.toInt(), false, Paint.Align.CENTER)
        }
    }
}
