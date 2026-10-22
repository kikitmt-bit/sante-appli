package fr.kiki.pokemontre

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PorterDuff
import android.graphics.PorterDuffColorFilter
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.SweepGradient
import android.graphics.Typeface
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.MotionEvent
import android.view.View
import java.text.NumberFormat
import java.util.Locale
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin
import kotlin.random.Random

/**
 * L'ouverture d'une Poké Ball, dessinée et animée à la main (Canvas) pour l'écran rond de la montre :
 * elle tombe et rebondit, attend qu'on la touche, tremble (4 fois pour une Hyper / Master Ball), « clic », s'ouvre dans
 * un éclair, le Pokémon sort en silhouette blanche puis prend ses couleurs. Nouveau = confettis, shiny = or et
 * étincelles, légendaire = violet. Un toucher : la suivante, ou fermer.
 * Sans Poké Ball à ouvrir : la barre d'effort (points sur 100) et ce qu'il reste à faire.
 */
@SuppressLint("ViewConstructor")
class BallView(ctx: Context, private val fini: () -> Unit) : View(ctx) {

    private enum class Phase { ACCUEIL, CHUTE, ATTENTE, SECOUSSES, CLIC, OUVERTURE, REVELATION, CARTE }

    private var etat: Donnees.Etat? = null
    private val file = ArrayDeque<Donnees.Ball>()
    private var total = 0
    private var ball: Donnees.Ball? = null
    private var image: Bitmap? = null
    private var phase = Phase.ACCUEIL
    private var t0 = SystemClock.uptimeMillis()
    private var dernier = t0
    private var secousse = -1
    private var flash = 0f
    private val particules = ArrayList<Particule>()
    private val vib = ctx.getSystemService(Vibrator::class.java)
    private val fr = NumberFormat.getIntegerInstance(Locale.FRANCE)

    private val p = Paint(Paint.ANTI_ALIAS_FLAG)
    private val pixels = Paint().apply { isFilterBitmap = false }
    private val blanc = Paint().apply { isFilterBitmap = false; colorFilter = PorterDuffColorFilter(Color.WHITE, PorterDuff.Mode.SRC_ATOP) }
    private val texte = Paint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.CENTER; color = Color.WHITE }
    private val gras = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)

    private class Particule(var x: Float, var y: Float, var vx: Float, var vy: Float, var vie: Float, val duree: Float,
                            val couleur: Int, val taille: Float, val confetti: Boolean, var angle: Float, val gravite: Float)

    /** Nouvelles données : la file des Poké Balls à ouvrir (on ne touche pas à celle en cours). */
    fun majEtat(e: Donnees.Etat?) {
        etat = e
        val deja = file.map { it.id }.toSet() + listOfNotNull(ball?.id)
        val nouvelles = e?.balls.orEmpty().filter { it.id !in deja }
        file.addAll(nouvelles)
        total += nouvelles.size
        if (phase == Phase.ACCUEIL && file.isNotEmpty()) suivante()
        invalidate()
    }

    private fun suivante() {
        val b = file.removeFirstOrNull()
        ball = b
        image = b?.bitmap()?.let { rogne(it) }
        particules.clear()
        secousse = -1
        aller(if (b == null) Phase.ACCUEIL else Phase.CHUTE)
    }

    private fun aller(ph: Phase) { phase = ph; t0 = SystemClock.uptimeMillis() }

    // ---------- Toucher ----------
    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(e: MotionEvent): Boolean {
        if (e.action != MotionEvent.ACTION_UP) return true
        when (phase) {
            Phase.ACCUEIL -> fini()
            Phase.ATTENTE -> { aller(Phase.SECOUSSES); secousse = -1 }
            Phase.CARTE -> if (file.isEmpty()) fini() else suivante()
            else -> {}
        }
        return true
    }

    private fun vibre(vararg ms: Long) {
        try {
            if (ms.size == 1) vib?.vibrate(VibrationEffect.createOneShot(ms[0], VibrationEffect.DEFAULT_AMPLITUDE))
            else vib?.vibrate(VibrationEffect.createWaveform(longArrayOf(0) + ms, -1))
        } catch (e: Exception) { }
    }

    // ---------- Couleurs selon la rareté ----------
    private val rare get() = ball?.let { it.legendaire || it.shiny || it.ball == "hyper" || it.ball == "master" } ?: false
    private fun teinte(): Int = ball?.let {
        when { it.legendaire -> 0xFFFF8CE6.toInt(); it.shiny -> 0xFFFFD75A.toInt(); it.nouvelle -> 0xFF7FE8FF.toInt()
               else -> 0xFFDDE6FF.toInt() }
    } ?: Color.WHITE
    private fun couleursFx(): IntArray = ball?.let {
        when {
            it.legendaire -> intArrayOf(0xFFFF8CE6.toInt(), 0xFFB57BFF.toInt(), 0xFF7FD4FF.toInt(), Color.WHITE)
            it.shiny -> intArrayOf(0xFFFFE27A.toInt(), 0xFFFFCB05.toInt(), Color.WHITE)
            it.nouvelle -> intArrayOf(0xFFFF5D5D.toInt(), 0xFFFFCB05.toInt(), 0xFF4CD3A0.toInt(), 0xFF6B8CFF.toInt(), 0xFFB57BFF.toInt())
            else -> intArrayOf(Color.WHITE, 0xFFC9D3EA.toInt())
        }
    } ?: intArrayOf(Color.WHITE)

    private fun jet(x: Float, y: Float, n: Int, couleurs: IntArray, vitesse: Float, taille: Float, vie: Float,
                    gravite: Float, confetti: Boolean = false) {
        repeat(n) {
            val a = Random.nextFloat() * 2 * PI.toFloat()
            val v = vitesse * (0.35f + Random.nextFloat() * 0.65f)
            particules += Particule(x, y, cos(a) * v, sin(a) * v - (if (confetti) vitesse * .5f else 0f),
                vie * (0.6f + Random.nextFloat() * 0.4f), vie, couleurs[Random.nextInt(couleurs.size)],
                taille * (0.5f + Random.nextFloat() * 0.7f), confetti, Random.nextFloat() * 360, gravite)
        }
    }

    // ---------- Dessin ----------
    override fun onDraw(c: Canvas) {
        val now = SystemClock.uptimeMillis()
        val dt = min((now - dernier) / 1000f, 0.05f)
        dernier = now
        val el = (now - t0).toFloat()
        val S = min(width, height).toFloat()
        val cx = width / 2f
        val cy = height / 2f
        val R = S * 0.2f

        fond(c, S, cx, cy, el)
        anneau(c, S, cx, cy)

        when (phase) {
            Phase.ACCUEIL -> accueil(c, S, cx, cy)
            Phase.CHUTE -> {
                val q = min(el / 900f, 1f)
                val y = -(cy + R * 2) * (1 - rebond(q))
                pokeBall(c, cx, cy + y - S * 0.04f, R, (1 - q) * -540f, 0f, 0f)
                haut(c, S, cx)
                if (q >= 1f) { vibre(25); aller(Phase.ATTENTE) }
            }
            Phase.ATTENTE -> {
                val rot = sin(el / 260f) * 4f
                pokeBall(c, cx, cy - S * 0.04f, R, rot, 0f, (sin(el / 300f) + 1) / 2 * 0.6f)
                haut(c, S, cx)
                val a = ((sin(el / 380f) + 1) / 2 * 0.5f + 0.5f)
                ecrire(c, "Touche la ${nomBall()} !", cx, cy + S * 0.31f, S * 0.068f, true, (a * 255).toInt())
                ecrire(c, ball?.raison.orEmpty(), cx, cy + S * 0.385f, S * 0.042f, false, 170, S * 0.72f)
            }
            Phase.SECOUSSES -> {
                val n = if (rare) 4 else 3
                val cycle = 750f
                val i = (el / cycle).toInt()
                val q = (el % cycle) / cycle
                if (i != secousse && i < n) { secousse = i; vibre(45) }
                val rot = if (q < 0.6f) sin(q / 0.6f * 2 * PI.toFloat() * 2) * 22f * (1 - q / 0.6f * 0.4f) else 0f
                val dx = if (q < 0.6f) sin(q / 0.6f * 2 * PI.toFloat() * 2) * R * 0.12f else 0f
                val lueur = if (q >= 0.6f) sin((q - 0.6f) / 0.4f * PI.toFloat()) else 0f
                pokeBall(c, cx + dx, cy - S * 0.04f, R, rot, 0f, lueur, 0xFFFF3030.toInt())
                haut(c, S, cx)
                if (i >= n) {
                    aller(Phase.CLIC); vibre(15, 40, 15)
                    jet(cx, cy - S * 0.04f, 14, intArrayOf(0xFFFFE27A.toInt(), Color.WHITE), S * 0.5f, S * 0.02f, 0.8f, 0f)
                }
            }
            Phase.CLIC -> {
                val q = min(el / 700f, 1f)
                pokeBall(c, cx, cy - S * 0.04f, R * (1 + q * 0.06f), (Random.nextFloat() - .5f) * 6f * q, 0f, q * 1.2f, teinte())
                haut(c, S, cx)
                if (q >= 1f) { aller(Phase.OUVERTURE); vibre(70) }
            }
            Phase.OUVERTURE -> {
                val q = min(el / 450f, 1f)
                pokeBall(c, cx, cy - S * 0.04f, R * 1.06f, 0f, retour(q), 1.2f, teinte())
                haut(c, S, cx)
                if (q >= 1f) {
                    flash = 1f
                    ball?.let { Donnees.ouvrir(context, it.id) }
                    jet(cx, cy - S * 0.08f, 40, couleursFx(), S * 0.9f, S * 0.025f, 1.2f, S * 0.05f)
                    aller(Phase.REVELATION)
                }
            }
            Phase.REVELATION, Phase.CARTE -> revelation(c, S, cx, cy, el)
        }

        particulesEtFlash(c, dt)
        postInvalidateOnAnimation()
    }

    private fun nomBall() = when (ball?.ball) { "super" -> "Super Ball"; "hyper" -> "Hyper Ball"; "master" -> "Master Ball"
                                                 else -> "Poké Ball" }

    /** En haut : le nom de la Poké Ball et « 1 / 3 ». */
    private fun haut(c: Canvas, S: Float, cx: Float) {
        ecrire(c, nomBall(), cx, S * 0.15f, S * 0.05f, true, 220)
        if (total > 1) ecrire(c, "${total - file.size} / $total", cx, S * 0.205f, S * 0.04f, false, 150)
    }

    private fun revelation(c: Canvas, S: Float, cx: Float, cy: Float, el: Float) {
        val b = ball ?: return
        val img = image
        // La Poké Ball s'en va vers le bas en rapetissant
        if (phase == Phase.REVELATION && el < 450f) {
            val q = el / 450f
            p.alpha = 255
            pokeBall(c, cx, cy - S * 0.04f + q * S * 0.35f, rayon(S) * 1.06f * (1 - q * 0.6f), 0f, 1f, 1f, teinte(), (1 - q))
        }
        // Le Pokémon : silhouette blanche qui grandit, puis ses couleurs
        val grandit = if (phase == Phase.CARTE) 1f else retour(min(el / 650f, 1f))
        val couleur = if (phase == Phase.CARTE) 1f else ((el - 650f) / 500f).coerceIn(0f, 1f)
        val danse = if (phase == Phase.CARTE) sin(el / 420f) * S * 0.012f else 0f
        val py = cy - S * 0.07f + danse
        // Halo
        val halo = S * 0.33f * grandit
        if (halo > 1f) {
            p.shader = RadialGradient(cx, py, halo, intArrayOf(alpha(teinte(), 0.55f), alpha(teinte(), 0f)), null, Shader.TileMode.CLAMP)
            c.drawCircle(cx, py, halo, p); p.shader = null
        }
        if (img != null && grandit > 0.01f) {
            val cote = S * 0.5f
            val f = min(cote / img.width, cote / img.height) * grandit
            val w = img.width * f
            val h = img.height * f
            val dst = RectF(cx - w / 2, py - h / 2, cx + w / 2, py + h / 2)
            pixels.alpha = (couleur * 255).toInt()
            c.drawBitmap(img, null, dst, pixels)
            blanc.alpha = ((1 - couleur) * 255).toInt()
            if (blanc.alpha > 0) c.drawBitmap(img, null, dst, blanc)
        }
        if (phase == Phase.REVELATION) {
            if (couleur >= 1f) {
                // Les effets selon la rareté, puis la carte
                if (b.legendaire) jet(cx, py, 70, couleursFx(), S * 1.1f, S * 0.025f, 2f, S * 0.02f)
                else if (b.shiny) jet(cx, py, 55, couleursFx(), S * 0.8f, S * 0.028f, 1.8f, 0f)
                if (b.nouvelle && !b.legendaire) jet(cx, py - S * 0.1f, 90, couleursFx(), S * 1.1f, S * 0.03f, 2.4f, S * 0.5f, true)
                vibre(*(if (b.nouvelle || b.shiny || b.legendaire) longArrayOf(40, 60, 80) else longArrayOf(30)))
                aller(Phase.CARTE)
            }
            return
        }
        // La carte : badge, nom, numéro et types, ce qu'un toucher fera
        val badge = when { b.legendaire -> "👑 LÉGENDAIRE"; b.shiny -> "✨ SHINY"; b.nouvelle -> "NOUVEAU !"; else -> "NOUVELLE VERSION" }
        val fondBadge = when { b.legendaire -> 0xFFB57BFF.toInt(); b.shiny -> 0xFFC9A227.toInt(); b.nouvelle -> 0xFFE8484B.toInt()
                               else -> 0xFF2F6FD6.toInt() }
        pastille(c, badge, cx, S * 0.15f, S * 0.048f, fondBadge)
        if (b.shiny && b.nouvelle && !b.legendaire) ecrire(c, "Nouveau Pokémon !", cx, S * 0.225f, S * 0.04f, true, 230)
        ecrire(c, b.nom, cx, S * 0.76f, S * 0.095f, true, 255, S * 0.8f)
        ecrire(c, "N° ${"%03d".format(b.num)} · ${b.types.joinToString(" / ")}", cx, S * 0.825f, S * 0.045f, false, 200, S * 0.7f)
        val suite = if (file.isEmpty()) "Touche pour fermer" else "Touche : la suivante (${file.size})"
        ecrire(c, suite, cx, S * 0.89f, S * 0.04f, false, (((sin(el / 380f) + 1) / 2 * 0.4f + 0.45f) * 255).toInt())
    }

    private fun rayon(S: Float) = S * 0.2f

    /** Sans Poké Ball à ouvrir : les points et ce qu'il reste à faire. */
    private fun accueil(c: Canvas, S: Float, cx: Float, cy: Float) {
        val e = etat
        pokeBall(c, cx, cy - S * 0.24f, S * 0.07f, 0f, 0f, 0f)
        if (e == null) {
            ecrire(c, "Chargement…", cx, cy + S * 0.04f, S * 0.07f, true, 230)
            ecrire(c, "(il faut du réseau)", cx, cy + S * 0.12f, S * 0.045f, false, 150)
            return
        }
        val reste = max(e.taille - e.points, 0f)
        ecrire(c, "${e.points.toInt()}", cx, cy + S * 0.06f, S * 0.2f, true, 255)
        ecrire(c, "/ ${e.taille} points", cx, cy + S * 0.13f, S * 0.05f, false, 170)
        ecrire(c, "Prochaine Poké Ball : encore", cx, cy + S * 0.22f, S * 0.042f, false, 190)
        val pas = fr.format(Math.ceil(reste.toDouble()).toInt() * 100)
        ecrire(c, "$pas pas ou ${Math.ceil(reste / 2.0).toInt()} min en zone", cx, cy + S * 0.28f, S * 0.045f, true, 230, S * 0.78f)
        ecrire(c, "Aucune Poké Ball à ouvrir", cx, cy - S * 0.13f, S * 0.045f, false, 160)
    }

    /** Fond : bleu nuit, rayons qui tournent (couleur de la rareté) une fois le Pokémon sorti. */
    private fun fond(c: Canvas, S: Float, cx: Float, cy: Float, el: Float) {
        p.shader = RadialGradient(cx, cy * 0.85f, S * 0.75f, intArrayOf(0xFF26365C.toInt(), 0xFF070B16.toInt()), null, Shader.TileMode.CLAMP)
        c.drawRect(0f, 0f, width.toFloat(), height.toFloat(), p)
        p.shader = null
        if (phase == Phase.REVELATION || phase == Phase.CARTE) {
            val a = if (phase == Phase.CARTE) 1f else min(el / 600f, 1f)
            c.save()
            c.rotate(SystemClock.uptimeMillis() / 60f % 360, cx, cy - S * 0.07f)
            p.color = alpha(teinte(), 0.10f * a)
            val rayon = S * 0.9f
            for (i in 0 until 12) {
                val a0 = (i * 30.0) * PI / 180
                val a1 = a0 + 12 * PI / 180
                val path = Path().apply {
                    moveTo(cx, cy - S * 0.07f)
                    lineTo(cx + (cos(a0) * rayon).toFloat(), cy - S * 0.07f + (sin(a0) * rayon).toFloat())
                    lineTo(cx + (cos(a1) * rayon).toFloat(), cy - S * 0.07f + (sin(a1) * rayon).toFloat())
                    close()
                }
                c.drawPath(path, p)
            }
            c.restore()
        }
    }

    /** La barre d'effort tout autour de l'écran (jaune -> rouge). */
    private fun anneau(c: Canvas, S: Float, cx: Float, cy: Float) {
        val e = etat ?: return
        val ep = S * 0.028f
        val r = S / 2 - ep / 2 - S * 0.012f
        val zone = RectF(cx - r, cy - r, cx + r, cy + r)
        p.style = Paint.Style.STROKE; p.strokeWidth = ep; p.strokeCap = Paint.Cap.ROUND
        p.color = 0x26FFFFFF
        c.drawArc(zone, 0f, 360f, false, p)
        val part = (e.points / e.taille).coerceIn(0f, 1f) * 360f
        if (part > 0.5f) {
            p.shader = SweepGradient(cx, cy, intArrayOf(0xFFFFCB05.toInt(), 0xFFFF4B4B.toInt(), 0xFFFFCB05.toInt()), null)
            c.save(); c.rotate(-90f, cx, cy)
            c.drawArc(zone, 0f, part, false, p)
            c.restore(); p.shader = null
        }
        p.style = Paint.Style.FILL
    }

    /**
     * Une Poké Ball (poke / super / hyper / master), centre (x, y), rayon R, tournée de rot degrés.
     * ouverture 0..1 : la moitié du haut se soulève ; lueur : le bouton brille (couleur) ; opacite pour la faire partir.
     */
    private fun pokeBall(c: Canvas, x: Float, y: Float, R: Float, rot: Float, ouverture: Float, lueur: Float,
                         couleurLueur: Int = Color.WHITE, opacite: Float = 1f) {
        val type = ball?.ball ?: "poke"
        val alphaG = (opacite * 255).toInt().coerceIn(0, 255)
        // Ombre au sol
        p.shader = RadialGradient(x, y + R * 1.12f, R, intArrayOf(alpha(Color.BLACK, 0.45f * opacite), 0), null, Shader.TileMode.CLAMP)
        c.save(); c.scale(1f, 0.22f, x, y + R * 1.12f); c.drawCircle(x, y + R * 1.12f, R, p); c.restore()
        p.shader = null

        c.saveLayerAlpha(x - R * 2, y - R * 3, x + R * 2, y + R * 2, alphaG)
        c.translate(x, y)
        c.rotate(rot)
        val cercle = RectF(-R, -R, R, R)
        val bande = R * 0.09f

        // Intérieur lumineux quand elle s'ouvre
        if (ouverture > 0f) {
            p.shader = RadialGradient(0f, 0f, R * 1.4f, intArrayOf(alpha(Color.WHITE, ouverture), alpha(couleurLueur, 0.6f * ouverture), 0),
                floatArrayOf(0f, 0.4f, 1f), Shader.TileMode.CLAMP)
            c.drawCircle(0f, -R * 0.2f, R * 1.4f, p); p.shader = null
        }

        // Moitié du bas : blanche
        val bas = Path().apply { moveTo(-R, 0f); arcTo(cercle, 180f, -180f); close() }
        c.save(); c.clipPath(bas)
        p.color = 0xFFF4F4F4.toInt(); c.drawCircle(0f, 0f, R, p)
        ombrage(c, R)
        p.color = 0xFF1E1E22.toInt(); c.drawRect(-R, 0f, R, bande, p)
        c.restore()

        // Moitié du haut : couleur et motif de la ball, soulevée par l'ouverture (charnière à l'arrière)
        c.save()
        c.translate(0f, -ouverture * R * 0.55f)
        c.rotate(-ouverture * 18f, -R, 0f)
        val hautP = Path().apply { moveTo(-R, 0f); arcTo(cercle, 180f, 180f); close() }
        c.save(); c.clipPath(hautP)
        motif(c, type, R)
        ombrage(c, R)
        p.color = 0xFF1E1E22.toInt(); c.drawRect(-R, -bande, R, 0f, p)
        c.restore()
        p.style = Paint.Style.STROKE; p.strokeWidth = R * 0.05f; p.color = 0xFF1E1E22.toInt()
        c.drawArc(cercle, 180f, 180f, false, p)
        p.style = Paint.Style.FILL
        c.restore()

        // Contour du bas
        p.style = Paint.Style.STROKE; p.strokeWidth = R * 0.05f; p.color = 0xFF1E1E22.toInt()
        c.drawArc(cercle, 0f, 180f, false, p)
        p.style = Paint.Style.FILL

        // Le bouton
        val by = -ouverture * R * 0.3f
        p.color = 0xFF1E1E22.toInt(); c.drawCircle(0f, by, R * 0.3f, p)
        p.color = 0xFFF4F4F4.toInt(); c.drawCircle(0f, by, R * 0.2f, p)
        if (lueur > 0f) {
            p.shader = RadialGradient(0f, by, R * 0.55f, intArrayOf(alpha(couleurLueur, min(lueur, 1f)), alpha(couleurLueur, 0f)), null, Shader.TileMode.CLAMP)
            c.drawCircle(0f, by, R * 0.55f, p); p.shader = null
            p.color = alpha(Color.WHITE, min(lueur, 1f) * 0.8f); c.drawCircle(0f, by, R * 0.16f, p)
        }
        p.style = Paint.Style.STROKE; p.strokeWidth = R * 0.03f; p.color = 0xFFBBBBBB.toInt()
        c.drawCircle(0f, by, R * 0.13f, p)
        p.style = Paint.Style.FILL
        c.restore()
    }

    private fun motif(c: Canvas, type: String, R: Float) {
        when (type) {
            "super" -> {
                p.color = 0xFF2F6FD6.toInt(); c.drawCircle(0f, 0f, R, p)
                p.color = 0xFFE8484B.toInt()
                for (s in listOf(-1f, 1f)) {
                    c.save(); c.rotate(s * 38f, s * R * 0.55f, -R * 0.62f)
                    c.drawRoundRect(RectF(s * R * 0.55f - R * 0.42f, -R * 0.74f, s * R * 0.55f + R * 0.42f, -R * 0.5f), R * 0.12f, R * 0.12f, p)
                    c.restore()
                }
            }
            "hyper" -> {
                p.color = 0xFF2A2A2E.toInt(); c.drawCircle(0f, 0f, R, p)
                p.color = 0xFFFFCB05.toInt()
                c.drawRect(-R * 0.62f, -R, -R * 0.38f, 0f, p)
                c.drawRect(R * 0.38f, -R, R * 0.62f, 0f, p)
            }
            "master" -> {
                p.color = 0xFF7B3FBF.toInt(); c.drawCircle(0f, 0f, R, p)
                p.color = 0xFFE84FA0.toInt()
                c.drawCircle(-R * 0.58f, -R * 0.52f, R * 0.2f, p)
                c.drawCircle(R * 0.58f, -R * 0.52f, R * 0.2f, p)
                texte.typeface = gras; texte.textSize = R * 0.42f; texte.color = Color.WHITE; texte.alpha = 255
                c.drawText("M", 0f, -R * 0.38f, texte)
            }
            else -> { p.color = 0xFFEE1515.toInt(); c.drawCircle(0f, 0f, R, p) }
        }
    }

    /** Relief : reflet en haut à gauche, bord plus sombre. */
    private fun ombrage(c: Canvas, R: Float) {
        p.shader = RadialGradient(-R * 0.35f, -R * 0.45f, R * 1.5f, intArrayOf(0x55FFFFFF, 0x00FFFFFF, 0x50000000),
            floatArrayOf(0f, 0.45f, 1f), Shader.TileMode.CLAMP)
        c.drawCircle(0f, 0f, R, p); p.shader = null
        p.color = 0x80FFFFFF.toInt()
        c.save(); c.rotate(-30f, -R * 0.45f, -R * 0.55f)
        c.drawOval(RectF(-R * 0.62f, -R * 0.66f, -R * 0.28f, -R * 0.46f), p)
        c.restore()
    }

    private fun particulesEtFlash(c: Canvas, dt: Float) {
        val it = particules.iterator()
        while (it.hasNext()) {
            val q = it.next()
            q.vie -= dt
            if (q.vie <= 0) { it.remove(); continue }
            q.vy += q.gravite * dt
            q.x += q.vx * dt; q.y += q.vy * dt
            q.vx *= 0.985f; q.vy *= 0.985f; q.angle += 360 * dt
            p.color = alpha(q.couleur, min(q.vie / q.duree * 1.5f, 1f))
            if (q.confetti) {
                c.save(); c.rotate(q.angle, q.x, q.y)
                c.drawRect(q.x - q.taille / 2, q.y - q.taille / 4, q.x + q.taille / 2, q.y + q.taille / 4, p)
                c.restore()
            } else etoile(c, q.x, q.y, q.taille)
        }
        if (flash > 0f) {
            p.color = alpha(Color.WHITE, flash)
            c.drawRect(0f, 0f, width.toFloat(), height.toFloat(), p)
            flash = max(flash - dt * 2.2f, 0f)
        }
    }

    /** Petite étoile à 4 branches. */
    private fun etoile(c: Canvas, x: Float, y: Float, t: Float) {
        val path = Path().apply {
            moveTo(x, y - t); quadTo(x, y, x + t, y); quadTo(x, y, x, y + t); quadTo(x, y, x - t, y); quadTo(x, y, x, y - t); close()
        }
        c.drawPath(path, p)
    }

    private fun pastille(c: Canvas, s: String, x: Float, y: Float, taille: Float, fondCouleur: Int) {
        texte.typeface = gras; texte.textSize = taille
        val w = texte.measureText(s) + taille * 1.4f
        p.color = fondCouleur
        c.drawRoundRect(RectF(x - w / 2, y - taille * 1.05f, x + w / 2, y + taille * 0.45f), taille, taille, p)
        texte.color = Color.WHITE; texte.alpha = 255
        c.drawText(s, x, y, texte)
    }

    private fun ecrire(c: Canvas, s: String, x: Float, y: Float, taille: Float, enGras: Boolean, a: Int, largeurMax: Float = 0f) {
        if (s.isEmpty()) return
        texte.typeface = if (enGras) gras else Typeface.DEFAULT
        texte.textSize = taille
        if (largeurMax > 0f) { val w = texte.measureText(s); if (w > largeurMax) texte.textSize = taille * largeurMax / w }
        texte.color = Color.WHITE; texte.alpha = a.coerceIn(0, 255)
        c.drawText(s, x, y, texte)
    }

    companion object {
        fun alpha(couleur: Int, a: Float): Int = (couleur and 0x00FFFFFF) or ((a.coerceIn(0f, 1f) * 255).toInt() shl 24)

        /** Rebond à l'arrivée (0..1). */
        fun rebond(t: Float): Float {
            val n = 7.5625f; val d = 2.75f
            return when {
                t < 1 / d -> n * t * t
                t < 2 / d -> { val u = t - 1.5f / d; n * u * u + 0.75f }
                t < 2.5 / d -> { val u = t - 2.25f / d; n * u * u + 0.9375f }
                else -> { val u = t - 2.625f / d; n * u * u + 0.984375f }
            }
        }

        /** Dépasse un peu puis revient (0..1). */
        fun retour(t: Float): Float { val s = 1.70158f; val u = t - 1; return 1 + (s + 1) * u.pow(3) + s * u.pow(2) }

        /** L'image sans ses bords transparents (les images récentes en ont beaucoup). */
        fun rogne(b: Bitmap): Bitmap {
            val w = b.width; val h = b.height
            val px = IntArray(w * h); b.getPixels(px, 0, w, 0, 0, w, h)
            var x0 = w; var y0 = h; var x1 = -1; var y1 = -1
            for (y in 0 until h) for (x in 0 until w) if ((px[y * w + x] ushr 24) > 8) {
                if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
            }
            return if (x1 < 0) b else Bitmap.createBitmap(b, x0, y0, x1 - x0 + 1, y1 - y0 + 1)
        }
    }
}
