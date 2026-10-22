package fr.kiki.pokemontre

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.os.Bundle
import android.os.SystemClock
import android.view.InputDevice
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import kotlin.math.abs
import kotlin.math.min

/**
 * Les écrans de la montre, en pages qu'on feuillette avec la couronne ou en glissant vers le haut / le bas
 * (glisser vers la droite ferme, comme partout sur la montre). Fond bleu nuit, peu d'infos par page, gros chiffres.
 * - Espace Pokémon (toucher la petite Poké Ball du cadran) : la barre, les balls du jour, le Pokédex.
 * - Espace Santé (toucher le cœur ou les pas) : l'activité du jour, le cœur et la nuit.
 * Les pas, étages, distance et calories sont ceux de la montre, en direct ; le reste vient du site (↻ = tout de suite).
 */
abstract class PagesActivity : Activity() {
    lateinit var vue: PagesView
    abstract fun creerVue(): PagesView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        vue = creerVue()
        setContentView(vue)
        vue.etat = Donnees.lire(this)
        vue.requestFocus()
        // Première fois : les autorisations (pas en direct, agenda pour la case du bas du cadran)
        val manque = listOf(Manifest.permission.ACTIVITY_RECOGNITION, Manifest.permission.READ_CALENDAR)
            .filter { checkSelfPermission(it) != android.content.pm.PackageManager.PERMISSION_GRANTED }
        if (manque.isNotEmpty()) requestPermissions(manque.toTypedArray(), 1) else Direct.demarrer(this)
        // Données de plus de 2 min : on les rafraîchit derrière
        if (System.currentTimeMillis() - (vue.etat?.recu ?: 0) > 120_000) Thread {
            if (Donnees.telecharger(this)) runOnUiThread { vue.etat = Donnees.lire(this); vue.invalidate() }
            BarreComplication.rafraichir(this)
        }.start()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        Direct.demarrer(this)
        BarreComplication.rafraichir(this)
    }
}

class PokemonActivity : PagesActivity() {
    override fun creerVue() = PokemonView(this)
}

class SanteActivity : PagesActivity() {
    override fun creerVue() = SanteView(this).also { if (intent.getIntExtra("page", 0) == 1) it.page = 1 }
}

@SuppressLint("ViewConstructor")
abstract class PagesView(val act: Activity, private val nbPages: Int) : View(act) {
    var etat: Donnees.Etat? = null
    var page = 0
    private var position = 0f  // page affichée, animée vers `page`
    private var y0 = 0f
    private var x0 = 0f
    private var actualise = false
    private var actualiseDepuis = 0L
    protected val p = Paint(Paint.ANTI_ALIAS_FLAG)
    private val t = Paint(Paint.ANTI_ALIAS_FLAG)
    private val gras = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    protected val gris = 0xFF8A93AD.toInt()
    protected val fond = 0xFF0B1020.toInt()
    private val seuil = ViewConfiguration.get(act).scaledTouchSlop * 3f
    protected var S = 450f
    private var vu = 0L

    init { isFocusable = true; isFocusableInTouchMode = true }

    abstract fun dessinerPage(c: Canvas, n: Int, e: Donnees.Etat)
    open fun toucherPage(n: Int, x: Float, y: Float) {}
    /** La page a un bouton ↻ en bas. */
    open fun aActualiser(n: Int) = n == 0

    // ---------- Gestes : glisser haut / bas, couronne ----------
    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(e: MotionEvent): Boolean {
        when (e.action) {
            MotionEvent.ACTION_DOWN -> { y0 = e.y; x0 = e.x }
            MotionEvent.ACTION_UP -> {
                val dy = e.y - y0
                if (abs(dy) > seuil && abs(dy) > abs(e.x - x0)) aller(page + if (dy < 0) 1 else -1)
                else if (abs(dy) < seuil && abs(e.x - x0) < seuil) toucher(e.x, e.y)
            }
        }
        return true
    }

    override fun onGenericMotionEvent(e: MotionEvent): Boolean {
        if (e.action == MotionEvent.ACTION_SCROLL && e.isFromSource(InputDevice.SOURCE_ROTARY_ENCODER)) {
            val v = -e.getAxisValue(MotionEvent.AXIS_SCROLL)
            if (abs(v) > 0.05f && SystemClock.uptimeMillis() - vu > 350) { vu = SystemClock.uptimeMillis(); aller(page + if (v > 0) 1 else -1) }
            return true
        }
        return super.onGenericMotionEvent(e)
    }

    private fun aller(n: Int) { page = n.coerceIn(0, nbPages - 1); invalidate() }

    private fun toucher(x: Float, y: Float) {
        if (aActualiser(page) && y > height * 0.82f && abs(x - width / 2f) < S * 0.16f) { actualiser(); return }
        toucherPage(page, x, y)
    }

    /** ↻ : récolte tout de suite (≈ 1 min), puis relit. */
    private fun actualiser() {
        if (actualise) return
        actualise = true; actualiseDepuis = SystemClock.uptimeMillis(); invalidate()
        Thread {
            val ok = Donnees.actualiser(act)
            act.runOnUiThread {
                actualise = false
                if (ok) etat = Donnees.lire(act)
                BarreComplication.rafraichir(act)
                invalidate()
            }
        }.start()
    }

    // ---------- Dessin ----------
    override fun onDraw(c: Canvas) {
        S = min(width, height).toFloat()
        c.drawColor(fond)
        position += (page - position) * 0.3f
        if (abs(page - position) < 0.01f) position = page.toFloat()
        val e = etat
        for (n in 0 until nbPages) {
            val dy = (n - position) * height
            if (abs(dy) >= height) continue
            c.save(); c.translate(0f, dy)
            if (e == null) texte(c, "Chargement…", width / 2f, S * 0.5f, S * 0.055f, gris, centre = true)
            else {
                dessinerPage(c, n, e)
                if (aActualiser(n)) boutonActualiser(c)
            }
            c.restore()
        }
        // Points de pagination, à droite
        for (n in 0 until nbPages) {
            p.color = if (n == page) Color.WHITE else 0xFF3A4466.toInt()
            c.drawCircle(width - S * 0.045f, height / 2f + (n - (nbPages - 1) / 2f) * S * 0.04f, S * 0.011f, p)
        }
        // Animation de page, ou chiffres en direct : on redessine régulièrement
        if (position != page.toFloat() || actualise) postInvalidateOnAnimation() else postInvalidateDelayed(5000)
    }

    private fun boutonActualiser(c: Canvas) {
        val y = S * 0.9f
        val e = etat
        if (actualise) {
            val s = ((SystemClock.uptimeMillis() - actualiseDepuis) / 1000).toInt()
            texte(c, "↻ actualisation… ${s} s", width / 2f, y, S * 0.04f, 0xFFFFCB05.toInt(), centre = true)
            return
        }
        val min = if (e == null) 0 else ((System.currentTimeMillis() - e.recu) / 60_000).toInt()
        p.color = 0xFF1C2740.toInt()
        c.drawRoundRect(RectF(width / 2f - S * 0.15f, y - S * 0.045f, width / 2f + S * 0.15f, y + S * 0.025f), S * 0.035f, S * 0.035f, p)
        texte(c, "↻  ${if (min < 1) "à jour" else "il y a $min min"}", width / 2f, y, S * 0.036f, 0xFFC9D3EA.toInt(), centre = true)
    }

    // ---------- Petits outils ----------
    fun texte(c: Canvas, s: String, x: Float, y: Float, taille: Float, couleur: Int, enGras: Boolean = false,
              centre: Boolean = false, droite: Boolean = false, largeurMax: Float = 0f) {
        t.typeface = if (enGras) gras else Typeface.DEFAULT
        t.textSize = taille; t.color = couleur
        t.textAlign = if (centre) Paint.Align.CENTER else if (droite) Paint.Align.RIGHT else Paint.Align.LEFT
        if (largeurMax > 0f) { val w = t.measureText(s); if (w > largeurMax) t.textSize = taille * largeurMax / w }
        c.drawText(s, x, y, t)
    }

    fun titre(c: Canvas, s: String) = texte(c, s, width / 2f, S * 0.17f, S * 0.058f, Color.WHITE, enGras = true, centre = true)

    fun jauge(c: Canvas, x: Float, y: Float, l: Float, part: Float, couleur: Int, ok: Boolean = false) {
        val h = S * 0.018f
        p.color = 0xFF222A40.toInt(); c.drawRoundRect(RectF(x, y, x + l, y + h), h / 2, h / 2, p)
        val w = l * part.coerceIn(0f, 1f)
        if (w > 0.5f) { p.color = if (ok) 0xFF4CD3A0.toInt() else couleur; c.drawRoundRect(RectF(x, y, x + w, y + h), h / 2, h / 2, p) }
    }

    /** Un chiffre en gros avec sa légende dessous. */
    fun chiffre(c: Canvas, valeur: String, legende: String, x: Float, y: Float, couleur: Int, gros: Boolean = true) {
        texte(c, valeur, x, y, S * if (gros) 0.085f else 0.068f, couleur, enGras = gros, centre = true, largeurMax = S * 0.36f)
        texte(c, legende, x, y + S * 0.055f, S * 0.037f, gris, centre = true, largeurMax = S * 0.36f)
    }
}

// =====================================================================================================================
// ESPACE POKÉMON
// =====================================================================================================================
@SuppressLint("ViewConstructor")
class PokemonView(act: Activity) : PagesView(act, 3) {
    private val vignettes = HashMap<String, Bitmap?>()

    override fun dessinerPage(c: Canvas, n: Int, e: Donnees.Etat) = when (n) {
        0 -> barre(c, e)
        1 -> ballsDuJour(c, e)
        else -> pokedex(c, e)
    }

    override fun toucherPage(n: Int, x: Float, y: Float) {
        val e = etat ?: return
        if (n == 0 && e.balls.isNotEmpty() && y > S * 0.25f && y < S * 0.8f) act.startActivity(Intent(act, OuvrirActivity::class.java))
        if (n == 2) {
            // Une vignette : on revoit l'ouverture
            val i = case(x, y) ?: return
            e.dernieres.getOrNull(i)?.let { act.startActivity(Intent(act, OuvrirActivity::class.java).putExtra("revoir", it.id)) }
        }
    }

    private fun barre(c: Canvas, e: Donnees.Etat) {
        titre(c, if (e.balls.isNotEmpty()) "Poké Balls gagnées !" else "Prochaine Poké Ball")
        val cx = width / 2f
        val cy = S * 0.43f
        val r = S * 0.17f
        if (e.balls.isNotEmpty()) {
            BasComplication.image(act, e.balls.first().ball, e.balls.size)?.let { b ->
                c.drawBitmap(b, null, RectF(cx - r * 1.2f, cy - r * 1.2f, cx + r * 1.2f, cy + r * 1.2f), Paint(Paint.FILTER_BITMAP_FLAG))
            }
            texte(c, "Touche pour ${if (e.balls.size > 1) "les" else "l'"}ouvrir", cx, S * 0.71f, S * 0.05f, 0xFFFFCB05.toInt(), true, centre = true)
            return
        }
        val pts = Direct.points(act, e)
        val bonus = Direct.bonus(act, e)
        p.style = Paint.Style.STROKE; p.strokeWidth = S * 0.035f; p.strokeCap = Paint.Cap.ROUND
        p.color = 0xFF222A40.toInt(); c.drawCircle(cx, cy, r, p)
        p.color = 0xFFFFCB05.toInt()
        c.drawArc(RectF(cx - r, cy - r, cx + r, cy + r), -90f, 360f * (pts / e.taille).coerceIn(0f, 1f), false, p)
        p.style = Paint.Style.FILL
        texte(c, if (pts >= e.taille) "100" else "${pts.toInt()}", cx, cy + S * 0.035f, S * 0.11f, Color.WHITE, true, centre = true)
        texte(c, "/ ${e.taille}", cx, cy + S * 0.09f, S * 0.04f, gris, centre = true)
        if (pts >= e.taille) {
            texte(c, "Ball gagnée ! Elle arrive…", cx, S * 0.7f, S * 0.045f, 0xFFFFCB05.toInt(), true, centre = true)
        } else {
            val reste = (e.taille - pts).coerceAtLeast(0f)
            texte(c, "encore ${Jeu.nombre(Math.ceil(reste.toDouble()).toInt() * 100)} pas", cx, S * 0.7f, S * 0.048f, 0xFFDDDDDD.toInt(), centre = true)
            texte(c, "ou ${Math.ceil(reste / 2.0).toInt()} min en zone · ${Math.ceil(reste.toDouble()).toInt()} min de sport",
                  cx, S * 0.76f, S * 0.038f, gris, centre = true, largeurMax = S * 0.7f)
        }
        if (bonus >= 0.5f) texte(c, "dont +${bonus.toInt()} en direct", cx, S * 0.815f, S * 0.034f, 0xFF7FD4FF.toInt(), centre = true)
    }

    private fun ballsDuJour(c: Canvas, e: Donnees.Etat) {
        titre(c, "Balls du jour")
        val o = e.objectifs ?: return texte(c, "(en attente du site)", width / 2f, S * 0.5f, S * 0.045f, gris, centre = true)
        val g = S * 0.19f
        val l = S * 0.62f
        val fs = S * 0.044f
        var y = S * 0.29f
        val pas = Direct.lire(act)?.pas?.toInt()?.coerceAtLeast(o.pas) ?: o.pas
        // Super Ball : les deux le même jour
        texte(c, "Super${if (o.superOk) " ✓" else ""}", g, y, fs, 0xFF7FB0FF.toInt(), true)
        texte(c, "${Jeu.nombre(pas)} pas · ${o.zone} min", g + l, y, fs * 0.82f, gris, droite = true)
        val m = S * 0.02f
        jauge(c, g, y + S * 0.02f, l / 2 - m / 2, pas.toFloat() / o.objPas, 0xFF7FB0FF.toInt(), o.superOk || pas >= o.objPas)
        jauge(c, g + l / 2 + m / 2, y + S * 0.02f, l / 2 - m / 2, o.zone.toFloat() / o.objZone, 0xFF7FB0FF.toInt(), o.superOk || o.zone >= o.objZone)
        y += S * 0.13f
        // Hyper Ball : un des trois (le plus avancé)
        val meilleur = listOf(
            pas.toFloat() / o.exploitPas to "${Jeu.nombre(pas)}/${Jeu.nombre(o.exploitPas)} pas",
            o.zone.toFloat() / o.exploitZone to "${o.zone}/${o.exploitZone} min zone",
            o.seance.toFloat() / o.exploitSeance to "séance ${o.seance}/${o.exploitSeance} min",
        ).maxBy { it.first }
        texte(c, "Hyper${if (o.hyperOk) " ✓" else ""}", g, y, fs, 0xFFFFE27A.toInt(), true)
        texte(c, meilleur.second, g + l, y, fs * 0.82f, gris, droite = true)
        jauge(c, g, y + S * 0.02f, l, meilleur.first, 0xFFFFE27A.toInt(), o.hyperOk)
        y += S * 0.13f
        // Master Ball : la série
        texte(c, "Master", g, y, fs, 0xFFC79BFF.toInt(), true)
        texte(c, "série ${o.serie}/${o.serieLegendaire}${if (o.joker) " · joker dispo" else ""}", g + l, y, fs * 0.82f, gris, droite = true)
        jauge(c, g, y + S * 0.02f, l, (o.serie % o.serieLegendaire).toFloat() / o.serieLegendaire, 0xFFC79BFF.toInt())
        y += S * 0.13f
        // La bonne nuit
        val nuit = e.nuit
        if (nuit != null) {
            val ok = nuit.duree >= o.nuitMin
            texte(c, "☾ Nuit ${Jeu.duree(nuit.duree)}", g, y, fs, 0xFFB9C6FF.toInt(), true)
            texte(c, if (ok) "shiny ×1,5 ✓" else "${Jeu.duree(o.nuitMin)} pour le bonus", g + l, y, fs * 0.82f,
                  if (ok) 0xFF4CD3A0.toInt() else gris, droite = true)
        }
    }

    private fun case(x: Float, y: Float): Int? {
        val cote = S * 0.2f
        val gauche = width / 2f - cote * 1.5f - S * 0.02f
        val haut = S * 0.28f
        val col = ((x - gauche) / (cote + S * 0.02f)).toInt()
        val lig = ((y - haut) / (cote + S * 0.06f)).toInt()
        if (x < gauche || y < haut || col !in 0..2 || lig !in 0..1) return null
        return lig * 3 + col
    }

    private fun pokedex(c: Canvas, e: Donnees.Etat) {
        titre(c, "Pokédex  ${e.especes} / ${e.totalEspeces}")
        jauge(c, S * 0.25f, S * 0.2f, S * 0.5f, e.especes.toFloat() / e.totalEspeces, 0xFFFF5A5F.toInt())
        val cote = S * 0.2f
        val gauche = width / 2f - cote * 1.5f - S * 0.02f
        val haut = S * 0.28f
        e.dernieres.take(6).forEachIndexed { i, b ->
            val x = gauche + (i % 3) * (cote + S * 0.02f)
            val y = haut + (i / 3) * (cote + S * 0.06f)
            p.color = 0xFF1C2740.toInt(); c.drawRoundRect(RectF(x, y, x + cote, y + cote), S * 0.03f, S * 0.03f, p)
            val img = vignettes.getOrPut(b.id) { b.bitmap()?.let { BallView.rogne(it) } }
            if (img != null) {
                val f = min(cote * 0.75f / img.width, cote * 0.75f / img.height)
                val w = img.width * f; val h = img.height * f
                c.drawBitmap(img, null, RectF(x + (cote - w) / 2, y + (cote - h) / 2 - S * 0.01f, x + (cote + w) / 2, y + (cote + h) / 2 - S * 0.01f),
                             Paint().apply { isFilterBitmap = false })
            }
            if (b.shiny) texte(c, "✨", x + cote - S * 0.035f, y + S * 0.045f, S * 0.035f, Color.WHITE, centre = true)
            texte(c, b.nom, x + cote / 2, y + cote + S * 0.04f, S * 0.034f, 0xFFDDDDDD.toInt(), centre = true, largeurMax = cote)
        }
        if (e.dernieres.isEmpty()) texte(c, "Ouvre ta première Poké Ball !", width / 2f, S * 0.5f, S * 0.045f, gris, centre = true)
        else texte(c, "toucher : revoir l'ouverture", width / 2f, S * 0.86f, S * 0.036f, gris, centre = true)
    }
}

// =====================================================================================================================
// ESPACE SANTÉ
// =====================================================================================================================
@SuppressLint("ViewConstructor")
class SanteView(act: Activity) : PagesView(act, 2) {

    override fun dessinerPage(c: Canvas, n: Int, e: Donnees.Etat) = if (n == 0) activite(c, e) else coeurEtNuit(c, e)

    private fun activite(c: Canvas, e: Donnees.Etat) {
        titre(c, "Aujourd'hui")
        val s = e.sante
        val d = Direct.lire(act)
        val o = e.objectifs
        val g = width / 2f - S * 0.19f
        val dr = width / 2f + S * 0.19f
        val pas = maxOf(d?.pas?.toInt() ?: 0, s?.pas ?: 0)
        chiffre(c, Jeu.nombre(pas), "pas / ${Jeu.nombre(o?.objPas ?: 5000)}", g, S * 0.33f, 0xFF7FD4FF.toInt())
        chiffre(c, "${s?.zone ?: 0}", "min en zone / ${o?.objZone ?: 15}", dr, S * 0.33f, 0xFFFF9E5A.toInt())
        val km = d?.metres?.takeIf { it > 0 }?.div(1000) ?: s?.km
        val kcal = d?.kcal?.takeIf { it > 0 }?.toInt() ?: s?.kcal
        chiffre(c, km?.let { "%.1f km".format(it).replace('.', ',') } ?: "—", "distance", g, S * 0.53f, 0xFFDDDDDD.toInt(), false)
        chiffre(c, kcal?.let { Jeu.nombre(it) } ?: "—", "kcal", dr, S * 0.53f, 0xFFDDDDDD.toInt(), false)
        val etages = d?.etages?.toInt()?.takeIf { it > 0 } ?: s?.etages
        chiffre(c, etages?.toString() ?: "0", "étages", g, S * 0.7f, 0xFFDDDDDD.toInt(), false)
        val sport = s?.minSport ?: 0
        chiffre(c, if (sport > 0) "$sport min" else "—", s?.sport?.let { "séance · $it" } ?: "séance", dr, S * 0.7f, 0xFFDDDDDD.toInt(), false)
    }

    private fun coeurEtNuit(c: Canvas, e: Donnees.Etat) {
        titre(c, "Cœur et nuit")
        val s = e.sante
        val g = width / 2f - S * 0.19f
        val dr = width / 2f + S * 0.19f
        chiffre(c, s?.fcRepos?.toString() ?: "—", "FC au repos", g, S * 0.33f, 0xFFFF5A5F.toInt())
        chiffre(c, s?.vfc?.toString() ?: "—", "VFC (ms)", dr, S * 0.33f, 0xFFDDDDDD.toInt())
        val n = e.nuit
        if (n == null) { texte(c, "Pas encore de nuit", width / 2f, S * 0.56f, S * 0.045f, gris, centre = true); return }
        texte(c, "☾ ${Jeu.duree(n.duree)}", width / 2f, S * 0.55f, S * 0.075f, 0xFFB9C6FF.toInt(), true, centre = true)
        val heures = if (n.coucher != null && n.lever != null) "${n.coucher} → ${n.lever}" else ""
        texte(c, heures + (n.profond?.let { " · profond ${Jeu.duree(it)}" } ?: ""), width / 2f, S * 0.61f, S * 0.038f, gris, centre = true,
              largeurMax = S * 0.75f)
        // Les phases, en une barre
        val phases = listOf(n.profond to 0xFF3E5BD8.toInt(), n.leger to 0xFF6B8CFF.toInt(), n.paradoxal to 0xFFB39DFF.toInt(),
                            n.eveil to 0xFFFF9E80.toInt())
        val total = phases.sumOf { it.first ?: 0 }.toFloat()
        if (total > 0) {
            var x = S * 0.2f
            val l = S * 0.6f
            val y = S * 0.65f
            c.save()
            val h = S * 0.03f
            val clip = android.graphics.Path().apply { addRoundRect(RectF(x, y, x + l, y + h), h / 2, h / 2, android.graphics.Path.Direction.CW) }
            c.clipPath(clip)
            for ((m, couleur) in phases) {
                val w = l * (m ?: 0) / total
                p.color = couleur; c.drawRect(x, y, x + w, y + h, p); x += w
            }
            c.restore()
        }
        s?.spo2?.let { texte(c, "SpO2 de la nuit $it %", width / 2f, S * 0.78f, S * 0.038f, gris, centre = true) }
    }
}
