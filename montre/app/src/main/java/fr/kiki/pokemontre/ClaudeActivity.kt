package fr.kiki.pokemontre

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.os.Bundle
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import android.speech.RecognizerIntent
import android.speech.tts.TextToSpeech
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.view.InputDevice
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.min
import kotlin.math.sin

/**
 * Poser une question à Claude depuis la montre, sans clé API : la question part au script Google, qui la dépose dans le
 * dépôt privé montre-claude ; ça déclenche la routine Claude « Claude de la montre » (abonnement de Kiki), qui répond
 * dans la branche claude/montre-reponses du dépôt sante. La montre suit la réponse toutes les 3 s (chrono, étapes,
 * barre de progression), puis affiche la réponse courte, « Plus d'infos » (la longue) et 🔊 pour l'écouter.
 * Rapide = Haiku ; Réfléchi = Opus. Les 10 dernières questions sont gardées sur la montre.
 */
class ClaudeActivity : Activity() {
    lateinit var vue: ClaudeView
    private var tts: TextToSpeech? = null
    private var visible = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        vue = ClaudeView(this)
        setContentView(vue)
        vue.requestFocus()
        tts = TextToSpeech(this) { if (it == TextToSpeech.SUCCESS) tts?.language = Locale.FRANCE }
        if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 2)
        Claude.enAttente(this)?.let { vue.suivre(it.first, it.second, it.third) }  // une question partie avant
    }

    override fun onResume() { super.onResume(); visible = true }
    override fun onPause() { super.onPause(); visible = false }
    override fun onDestroy() { tts?.shutdown(); super.onDestroy() }

    fun dicter() {
        val i = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "fr-FR")
            .putExtra(RecognizerIntent.EXTRA_PROMPT, "Ta question à Claude")
        try { startActivityForResult(i, 1) } catch (e: Exception) { vue.erreur("Dictée indisponible sur cette montre") }
    }

    @Deprecated("API Activity")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        val texte = data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
        if (requestCode == 1 && resultCode == RESULT_OK && !texte.isNullOrBlank()) vue.question(texte)
    }

    fun lire(texte: String) { tts?.speak(texte, TextToSpeech.QUEUE_FLUSH, null, "claude") }
    fun taire() { tts?.stop() }

    /** Réponse arrivée alors qu'on regarde ailleurs : une notification (toucher = la réponse). */
    fun prevenir(court: String) {
        vibre(this, longArrayOf(0, 60, 80, 60))
        if (visible) return
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel("claude", "Réponses de Claude", NotificationManager.IMPORTANCE_HIGH))
        val tap = PendingIntent.getActivity(this, 5, Intent(this, ClaudeActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT), PendingIntent.FLAG_IMMUTABLE)
        nm.notify(7, android.app.Notification.Builder(this, "claude").setSmallIcon(R.drawable.ic_claude)
            .setContentTitle("Claude a répondu").setContentText(court).setContentIntent(tap).setAutoCancel(true).build())
    }

    companion object {
        fun vibre(ctx: Context, motif: LongArray) {
            try { ctx.getSystemService(Vibrator::class.java)?.vibrate(VibrationEffect.createWaveform(motif, -1)) } catch (e: Exception) { }
        }
    }
}

/** Les questions gardées sur la montre (historique, question en cours). */
object Claude {
    private const val PREFS = "claude"
    private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun modele(ctx: Context) = prefs(ctx).getString("modele", "rapide")!!
    fun choisirModele(ctx: Context, m: String) = prefs(ctx).edit().putString("modele", m).apply()

    /** (id, question, envoyée à) d'une question partie il y a moins de 10 min et sans réponse. */
    fun enAttente(ctx: Context): Triple<String, String, Long>? {
        val p = prefs(ctx)
        val id = p.getString("attente_id", null) ?: return null
        val quand = p.getLong("attente_quand", 0)
        if (System.currentTimeMillis() - quand > 10 * 60_000) return null
        return Triple(id, p.getString("attente_q", "")!!, quand)
    }
    fun attendre(ctx: Context, id: String, q: String, quand: Long) =
        prefs(ctx).edit().putString("attente_id", id).putString("attente_q", q).putLong("attente_quand", quand).apply()
    fun finAttente(ctx: Context) = prefs(ctx).edit().remove("attente_id").apply()

    fun historique(ctx: Context): List<JSONObject> = try {
        val a = JSONArray(prefs(ctx).getString("historique", "[]"))
        (0 until a.length()).map { a.getJSONObject(it) }
    } catch (e: Exception) { emptyList() }

    fun garder(ctx: Context, r: JSONObject) {
        val h = (listOf(r) + historique(ctx).filter { it.optString("id") != r.optString("id") }).take(10)
        prefs(ctx).edit().putString("historique", JSONArray(h).toString()).apply()
    }
}

@SuppressLint("ViewConstructor")
class ClaudeView(private val act: ClaudeActivity) : View(act) {
    private enum class Etat { ACCUEIL, QUESTION, ATTENTE, REPONSE, LONG, HISTORIQUE, ERREUR }

    private var etat = Etat.ACCUEIL
    private var texteQuestion = ""
    private var id: String? = null
    private var envoi = 0L          // heure d'envoi (ms, horloge murale)
    private var etape = "Envoi…"
    private var debutReflexion = 0L
    private var reponse: JSONObject? = null
    private var message = ""
    private var defile = 0f
    private var hauteurLong = 0f
    private var y0 = 0f
    private var x0 = 0f
    private var dernierY = 0f
    private var bouge = false
    private val zones = mutableListOf<Pair<RectF, () -> Unit>>()

    private val orange = 0xFFD97757.toInt()
    private val fond = 0xFF14110F.toInt()
    private val gris = 0xFF9C948C.toInt()
    private val p = Paint(Paint.ANTI_ALIAS_FLAG)
    private val t = TextPaint(Paint.ANTI_ALIAS_FLAG)
    private val gras = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    private var S = 450f

    init { isFocusable = true; isFocusableInTouchMode = true }

    // ---------- Les étapes ----------
    fun question(q: String) { texteQuestion = q; etat = Etat.QUESTION; invalidate() }

    fun erreur(m: String) { message = m; etat = Etat.ERREUR; invalidate() }

    private fun envoyer() {
        val q = texteQuestion
        val modele = Claude.modele(act)
        envoi = System.currentTimeMillis(); etape = "Envoi de la question…"; debutReflexion = 0; etat = Etat.ATTENTE; invalidate()
        Thread {
            val n = Donnees.claudePoser(q, modele)
            act.runOnUiThread {
                if (n == null) erreur("La question n'est pas partie (réseau ?)")
                else { Claude.attendre(act, n, q, envoi); suivre(n, q, envoi) }
            }
        }.start()
    }

    /** Suit la réponse toutes les 3 s (aussi pour une question partie avant d'ouvrir l'écran). */
    fun suivre(n: String, q: String, depuis: Long) {
        id = n; texteQuestion = q; envoi = depuis; etat = Etat.ATTENTE
        etape = "Claude démarre…"; invalidate()
        Thread {
            while (id == n && System.currentTimeMillis() - envoi < 6 * 60_000) {
                val r = Donnees.claudeSuivre(n)
                val statut = r?.optString("statut")
                if (statut == "fini") {
                    act.runOnUiThread {
                        if (id != n) return@runOnUiThread
                        Claude.finAttente(act); Claude.garder(act, r)
                        reponse = r; etat = Etat.REPONSE; id = null; invalidate()
                        act.prevenir(r.optString("court"))
                    }
                    return@Thread
                }
                act.runOnUiThread {
                    if (statut == "en_cours" && debutReflexion == 0L) { debutReflexion = System.currentTimeMillis(); ClaudeActivity.vibre(act, longArrayOf(0, 25)) }
                    etape = when (statut) { "en_cours" -> "Claude réfléchit…"; null -> "Réseau lent…"; else -> "Claude démarre…" }
                }
                Thread.sleep(3000)
            }
            act.runOnUiThread { if (id == n) { id = null; Claude.finAttente(act); erreur("Pas de réponse au bout de 6 min. Réessaie.") } }
        }.start()
    }

    // ---------- Toucher, couronne ----------
    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(e: MotionEvent): Boolean {
        when (e.action) {
            MotionEvent.ACTION_DOWN -> { y0 = e.y; x0 = e.x; dernierY = e.y; bouge = false }
            MotionEvent.ACTION_MOVE -> {
                if (abs(e.y - y0) > 12) bouge = true
                if (etat == Etat.LONG || etat == Etat.HISTORIQUE) { defiler(dernierY - e.y); dernierY = e.y }
            }
            MotionEvent.ACTION_UP -> if (!bouge) zones.firstOrNull { it.first.contains(e.x, e.y) }?.second?.invoke()
        }
        return true
    }

    override fun onGenericMotionEvent(e: MotionEvent): Boolean {
        if (e.action == MotionEvent.ACTION_SCROLL && e.isFromSource(InputDevice.SOURCE_ROTARY_ENCODER)) {
            defiler(-e.getAxisValue(MotionEvent.AXIS_SCROLL) * S * 0.12f); return true
        }
        return super.onGenericMotionEvent(e)
    }

    private fun defiler(d: Float) { defile = (defile + d).coerceIn(0f, maxOf(0f, hauteurLong - S * 0.55f)); invalidate() }

    // ---------- Dessin ----------
    override fun onDraw(c: Canvas) {
        S = min(width, height).toFloat()
        c.drawColor(fond)
        zones.clear()
        when (etat) {
            Etat.ACCUEIL -> accueil(c)
            Etat.QUESTION -> pageQuestion(c)
            Etat.ATTENTE -> attente(c)
            Etat.REPONSE -> pageReponse(c)
            Etat.LONG -> pageLong(c)
            Etat.HISTORIQUE -> pageHistorique(c)
            Etat.ERREUR -> {
                texteCentre(c, message, S * 0.42f, S * 0.05f, Color.WHITE, S * 0.7f)
                bouton(c, "Réessayer", width / 2f, S * 0.66f, S * 0.4f, orange) { etat = if (texteQuestion.isEmpty()) Etat.ACCUEIL else Etat.QUESTION }
            }
        }
        if (etat == Etat.ATTENTE) postInvalidateOnAnimation()
    }

    private fun etoile(c: Canvas, x: Float, y: Float, r: Float, couleur: Int, tour: Float = 0f) {
        p.color = couleur
        val path = Path()
        for (i in 0 until 16) {
            val a = (i * PI / 8 + tour).toFloat()
            val rr = if (i % 2 == 0) r else r * 0.32f
            val px = x + cos(a) * rr; val py = y + sin(a) * rr
            if (i == 0) path.moveTo(px, py) else path.lineTo(px, py)
        }
        path.close(); c.drawPath(path, p)
    }

    private fun texteCentre(c: Canvas, s: String, y: Float, taille: Float, couleur: Int, largeur: Float, enGras: Boolean = false,
                            lignesMax: Int = 6): Float {
        t.textSize = taille; t.color = couleur; t.typeface = if (enGras) gras else Typeface.DEFAULT
        val l = StaticLayout.Builder.obtain(s, 0, s.length, t, largeur.toInt()).setAlignment(Layout.Alignment.ALIGN_CENTER)
            .setMaxLines(lignesMax).setEllipsize(android.text.TextUtils.TruncateAt.END).build()
        c.save(); c.translate(width / 2f - largeur / 2, y); l.draw(c); c.restore()
        return l.height.toFloat()
    }

    private fun bouton(c: Canvas, s: String, x: Float, y: Float, l: Float, couleur: Int, plein: Boolean = true, action: () -> Unit) {
        val h = S * 0.11f
        val r = RectF(x - l / 2, y - h / 2, x + l / 2, y + h / 2)
        p.color = if (plein) couleur else 0xFF2A2420.toInt()
        c.drawRoundRect(r, h / 2, h / 2, p)
        t.textSize = S * 0.045f; t.typeface = gras; t.color = if (plein) Color.WHITE else couleur; t.textAlign = Paint.Align.CENTER
        c.drawText(s, x, y + S * 0.016f, t); t.textAlign = Paint.Align.LEFT
        zones += RectF(r.left - 8, r.top - 8, r.right + 8, r.bottom + 8) to action
    }

    private fun choixModele(c: Canvas, y: Float) {
        val m = Claude.modele(act)
        bouton(c, "⚡ Rapide", width / 2f - S * 0.17f, y, S * 0.31f, orange, m == "rapide") { Claude.choisirModele(act, "rapide"); invalidate() }
        bouton(c, "🧠 Réfléchi", width / 2f + S * 0.17f, y, S * 0.31f, orange, m == "reflechi") { Claude.choisirModele(act, "reflechi"); invalidate() }
    }

    private fun accueil(c: Canvas) {
        etoile(c, width / 2f, S * 0.17f, S * 0.05f, orange)
        texteCentre(c, "Demande à Claude", S * 0.24f, S * 0.05f, Color.WHITE, S * 0.7f, true)
        // Le gros bouton micro
        val cx = width / 2f; val cy = S * 0.47f; val r = S * 0.13f
        p.color = orange; c.drawCircle(cx, cy, r, p)
        p.color = Color.WHITE
        c.drawRoundRect(RectF(cx - r * 0.18f, cy - r * 0.45f, cx + r * 0.18f, cy + r * 0.15f), r * 0.18f, r * 0.18f, p)
        p.style = Paint.Style.STROKE; p.strokeWidth = r * 0.08f
        c.drawArc(RectF(cx - r * 0.33f, cy - r * 0.2f, cx + r * 0.33f, cy + r * 0.32f), 0f, 180f, false, p)
        c.drawLine(cx, cy + r * 0.32f, cx, cy + r * 0.48f, p)
        p.style = Paint.Style.FILL
        zones += RectF(cx - r * 1.3f, cy - r * 1.3f, cx + r * 1.3f, cy + r * 1.3f) to { act.dicter() }
        choixModele(c, S * 0.72f)
        if (Claude.historique(act).isNotEmpty())
            bouton(c, "Dernières questions", width / 2f, S * 0.86f, S * 0.5f, orange, false) { defile = 0f; etat = Etat.HISTORIQUE; invalidate() }
    }

    private fun pageQuestion(c: Canvas) {
        texteCentre(c, "Ta question", S * 0.12f, S * 0.04f, gris, S * 0.6f)
        texteCentre(c, "« $texteQuestion »", S * 0.2f, S * 0.052f, Color.WHITE, S * 0.72f, false, 5)
        choixModele(c, S * 0.62f)
        bouton(c, "Envoyer", width / 2f + S * 0.15f, S * 0.78f, S * 0.32f, orange) { envoyer() }
        bouton(c, "↺ Redire", width / 2f - S * 0.18f, S * 0.78f, S * 0.27f, orange, false) { act.dicter() }
    }

    /** L'attente : étoile qui tourne, chrono, étape, barre de progression (jamais figée, jamais tout à fait pleine). */
    private fun attente(c: Canvas) {
        val ms = System.currentTimeMillis() - envoi
        val s = ms / 1000
        val tour = (SystemClock.uptimeMillis() % 4000) / 4000f * 2 * PI.toFloat()
        etoile(c, width / 2f, S * 0.3f, S * (0.085f + 0.01f * sin(tour * 3)), orange, tour)
        texteCentre(c, etape, S * 0.43f, S * 0.055f, Color.WHITE, S * 0.75f, true)
        texteCentre(c, "${s / 60}:${"%02d".format(s % 60)}", S * 0.51f, S * 0.08f, orange, S * 0.5f, true)
        // Progression estimée (mesuré le 22/10) : GitHub + démarrage ~25 s (jusqu'à 70 %), puis Claude répond en ~6 s
        // (rapide) ou ~12 s (réfléchi) (jusqu'à 97 %) ; la barre avance toujours, sans jamais être pleine avant la réponse
        val reflechi = Claude.modele(act) == "reflechi"
        val part = if (debutReflexion == 0L) 0.7f * (1 - exp(-ms / 14_000.0).toFloat())
                   else 0.7f + 0.27f * (1 - exp(-(System.currentTimeMillis() - debutReflexion) / (if (reflechi) 8_000.0 else 4_000.0)).toFloat())
        val l = S * 0.6f; val x = width / 2f - l / 2; val y = S * 0.66f; val h = S * 0.022f
        p.color = 0xFF2A2420.toInt(); c.drawRoundRect(RectF(x, y, x + l, y + h), h / 2, h / 2, p)
        p.color = orange; c.drawRoundRect(RectF(x, y, x + l * part, y + h), h / 2, h / 2, p)
        texteCentre(c, "« $texteQuestion »", S * 0.73f, S * 0.036f, gris, S * 0.62f, false, 2)
    }

    private fun pageReponse(c: Canvas) {
        val r = reponse ?: return
        etoile(c, width / 2f, S * 0.1f, S * 0.03f, orange)
        texteCentre(c, r.optString("q"), S * 0.14f, S * 0.034f, gris, S * 0.6f, false, 2)
        texteCentre(c, r.optString("court"), S * 0.27f, S * 0.054f, Color.WHITE, S * 0.76f, false, 5)
        bouton(c, "🔊", width / 2f - S * 0.22f, S * 0.72f, S * 0.16f, orange, false) { act.lire(r.optString("court")) }
        bouton(c, "Plus d'infos", width / 2f + S * 0.08f, S * 0.72f, S * 0.36f, orange) { defile = 0f; etat = Etat.LONG; invalidate() }
        bouton(c, "Nouvelle question", width / 2f, S * 0.86f, S * 0.5f, orange, false) { act.taire(); texteQuestion = ""; etat = Etat.ACCUEIL; invalidate() }
    }

    private fun pageLong(c: Canvas) {
        val r = reponse ?: return
        val sources = (0 until (r.optJSONArray("sources")?.length() ?: 0)).joinToString(", ") { r.getJSONArray("sources").getString(it) }
        val texte = r.optString("long") + (if (sources.isNotEmpty()) "\n\nSources : $sources" else "") + "\n\n(${r.optString("modele")})"
        t.textSize = S * 0.047f; t.color = Color.WHITE; t.typeface = Typeface.DEFAULT
        val largeur = (S * 0.74f).toInt()
        val l = StaticLayout.Builder.obtain(texte, 0, texte.length, t, largeur).setAlignment(Layout.Alignment.ALIGN_NORMAL).build()
        hauteurLong = l.height + S * 0.3f
        c.save(); c.clipRect(0f, S * 0.12f, width.toFloat(), S * 0.8f)
        c.translate(width / 2f - largeur / 2, S * 0.14f - defile); l.draw(c); c.restore()
        bouton(c, "🔊", width / 2f - S * 0.12f, S * 0.88f, S * 0.18f, orange, false) { act.lire(r.optString("long")) }
        bouton(c, "Retour", width / 2f + S * 0.1f, S * 0.88f, S * 0.22f, orange) { act.taire(); etat = Etat.REPONSE; invalidate() }
    }

    private fun pageHistorique(c: Canvas) {
        texteCentre(c, "Dernières questions", S * 0.1f, S * 0.045f, Color.WHITE, S * 0.7f, true)
        var y = S * 0.2f - defile
        val h = Claude.historique(act)
        c.save(); c.clipRect(0f, S * 0.17f, width.toFloat(), S * 0.82f)
        for (r in h) {
            val haut = y
            val hq = texteCentre(c, r.optString("q"), y, S * 0.04f, orange, S * 0.7f, false, 2)
            val hc = texteCentre(c, r.optString("court"), y + hq + S * 0.01f, S * 0.036f, gris, S * 0.7f, false, 2)
            zones += RectF(0f, maxOf(haut, S * 0.17f), width.toFloat(), minOf(y + hq + hc, S * 0.82f)) to { reponse = r; etat = Etat.REPONSE; invalidate() }
            y += hq + hc + S * 0.05f
        }
        c.restore()
        hauteurLong = y + defile
        bouton(c, "Retour", width / 2f, S * 0.89f, S * 0.3f, orange) { etat = Etat.ACCUEIL; invalidate() }
    }
}
