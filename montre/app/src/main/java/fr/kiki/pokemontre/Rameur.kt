package fr.kiki.pokemontre

import android.os.Handler
import android.os.HandlerThread
import java.io.OutputStream
import java.net.InetSocketAddress
import java.security.MessageDigest
import javax.net.ssl.SSLSocket
import javax.net.ssl.SSLSocketFactory
import kotlin.math.sqrt

/**
 * Le capteur du jeu « La Rivière » (11/11) : la montre reconnaît chaque coup de rame et l'envoie au jeu de la tablette.
 *
 * Détection (réglée sur l'enregistrement du 10/11 : 256 coups retrouvés sur les 258 du téléphone, aucun en trop) :
 * accéléromètre filtré 0,2-1,5 Hz (Butterworth d'ordre 2, calculé pour 50 mesures/s), axe principal du geste suivi en
 * continu (covariance qui s'oublie en 15 s), un coup = un sommet au-dessus de 0,8 × l'ampleur habituelle, après un passage
 * sous zéro, 1,2 s au moins après le précédent. Tout se fait en direct, mesure par mesure.
 *
 * Envoi : chaque coup part sur deux relais publics (MQTT par TLS, HiveMQ et EMQX ; le jeu écoute les deux et ne garde
 * chaque coup qu'une fois). Le sujet = le même nom que l'ancien lien téléphone → tablette (`seances_rameur.lien`) :
 * impossible à deviner sans la clé, il ne dit rien de Kiki. Les messages ne contiennent que le numéro du coup, sa force
 * relative et le cœur.
 */
class Detecteur(private val ecart: Double = 1.2, private val k: Double = 0.8, private val tau: Double = 15.0) {
    private val sos = arrayOf(
        doubleArrayOf(0.005970418741051477, 0.011940837482102954, 0.005970418741051477, -1.7936524423952442, 0.8199561260632414),
        doubleArrayOf(1.0, -2.0, 1.0, -1.9672388810552122, 0.96800180399168))
    private val z = Array(2) { Array(2) { DoubleArray(3) } }
    private val c = Array(3) { i -> DoubleArray(3) { j -> if (i == j) 1e-3 else 0.0 } }
    private var v = doubleArrayOf(1.0, 0.0, 0.0)
    private var e2 = 0.0; private var arme = false; private var monte = false
    private var prec = 0.0; private var tPrec = 0.0; private var dernier = -1e9; private var n = 0
    var force = 0.0; private set

    /** Une mesure de l'accéléromètre (t en secondes). Rend true si elle termine un coup (sa force relative est dans `force`). */
    fun mesure(t: Double, ax: Float, ay: Float, az: Float): Boolean {
        val x = doubleArrayOf(ax.toDouble(), ay.toDouble(), az.toDouble())
        for (i in 0..1) { val s = sos[i]; for (a in 0..2) {
            val y = s[0] * x[a] + z[i][0][a]
            z[i][0][a] = s[1] * x[a] - s[3] * y + z[i][1][a]; z[i][1][a] = s[2] * x[a] - s[4] * y; x[a] = y } }
        n++
        val al = 0.02 / tau
        for (i in 0..2) for (j in 0..2) c[i][j] = (1 - al) * c[i][j] + al * x[i] * x[j]
        val w = DoubleArray(3) { i -> c[i][0] * v[0] + c[i][1] * v[1] + c[i][2] * v[2] }
        val l = sqrt(w[0] * w[0] + w[1] * w[1] + w[2] * w[2]); if (l > 0) v = doubleArrayOf(w[0] / l, w[1] / l, w[2] / l)
        val p = x[0] * v[0] + x[1] * v[1] + x[2] * v[2]
        e2 = (1 - al) * e2 + al * p * p
        val r = sqrt(e2); val seuil = k * r
        var coup = false
        if (n > 250) {   // 5 s pour que le filtre et l'axe se posent
            if (p < -seuil * 0.5) arme = true
            if (p > prec) monte = true
            else if (monte) {   // on vient de passer un sommet
                monte = false
                if (arme && prec > seuil && prec > 2.0 && tPrec - dernier >= ecart) { coup = true; force = prec / r; dernier = tPrec; arme = false }
            }
        }
        prec = p; tPrec = t
        return coup
    }
}

/** Un relais MQTT 3.1.1 minimal, par TLS : se connecte, publie, garde la connexion (ping), se reconnecte tout seul. Sur son propre fil. */
class Relai(private val hote: String, private val fil: Handler) {
    private var sock: SSLSocket? = null
    private var sortie: OutputStream? = null
    private var dernierEnvoi = 0L
    @Volatile var relie = false; private set

    private fun lg(n0: Int): ByteArray { var n = n0; val o = ArrayList<Byte>()
        do { var d = n % 128; n /= 128; if (n > 0) d = d or 128; o.add(d.toByte()) } while (n > 0); return o.toByteArray() }
    private fun chaine(s: String): ByteArray { val b = s.toByteArray(); return byteArrayOf((b.size shr 8).toByte(), b.size.toByte()) + b }
    private fun paquet(type: Int, corps: ByteArray) = byteArrayOf(type.toByte()) + lg(corps.size) + corps

    private fun ouvrir(): Boolean {
        if (sock?.isConnected == true && sortie != null) return true
        fermer()
        return try {
            val brut = java.net.Socket().apply { connect(InetSocketAddress(hote, 8883), 6000); soTimeout = 6000 }
            val s = (SSLSocketFactory.getDefault() as SSLSocketFactory).createSocket(brut, hote, 8883, true) as SSLSocket
            s.sslParameters = s.sslParameters.apply { serverNames = listOf(javax.net.ssl.SNIHostName(hote)) }   // le nom du serveur, que HiveMQ exige
            s.startHandshake()
            val o = s.outputStream
            o.write(paquet(0x10, chaine("MQTT") + byteArrayOf(4, 2, 0, 60) + chaine("pokefit-montre-" + (System.nanoTime() % 1_000_000_000))))
            o.flush()
            val r = ByteArray(4); var lu = 0; while (lu < 4) { val k = s.inputStream.read(r, lu, 4 - lu); if (k < 0) throw Exception("fermé"); lu += k }
            if (r[0] != 0x20.toByte() || r[3] != 0.toByte()) throw Exception("refusé")
            sock = s; sortie = o; relie = true; dernierEnvoi = System.currentTimeMillis(); true
        } catch (x: Exception) { fermer(); false }
    }

    fun publier(sujet: String, msg: String) = fil.post {
        repeat(2) { if (ouvrir()) try {
            sortie!!.write(paquet(0x30, chaine(sujet) + msg.toByteArray())); sortie!!.flush(); dernierEnvoi = System.currentTimeMillis(); return@post
        } catch (x: Exception) { fermer() } }
    }

    /** À appeler de temps en temps : garde la connexion vivante (le relais coupe après 90 s sans rien). */
    fun entretenir() = fil.post {
        if (relie && System.currentTimeMillis() - dernierEnvoi > 30_000) try { sortie!!.write(byteArrayOf(0xC0.toByte(), 0)); sortie!!.flush(); dernierEnvoi = System.currentTimeMillis() } catch (x: Exception) { fermer() }
    }

    fun fermer() { relie = false; try { sortie?.write(byteArrayOf(0xE0.toByte(), 0)) } catch (x: Exception) { }; try { sock?.close() } catch (x: Exception) { }; sock = null; sortie = null }
}

/** Le lien entre la montre et le jeu : détecte les coups, les envoie, et envoie l'état toutes les 5 s (« la montre est là »). */
class LienJeu(private val machine: String) {
    private val fil = HandlerThread("relais").apply { start() }
    private val h = Handler(fil.looper)
    private val relais = listOf("broker.hivemq.com", "broker.emqx.io").map { Relai(it, h) }
    private val sujet = "pokefit/rameur/" + MessageDigest.getInstance("SHA-256")
        .digest("rameur|${BuildConfig.JEU_CLE}|kiki".toByteArray()).joinToString("") { "%02x".format(it) }.take(20)
    val detecteur = Detecteur()
    @Volatile var coups = 0; private set
    @Volatile var coeur = 0
    val relie get() = relais.any { it.relie }
    private val tic = object : Runnable { override fun run() { etat(); relais.forEach { it.entretenir() }; h.postDelayed(this, 5000) } }

    init { h.post(tic) }

    private fun envoyer(m: String) = relais.forEach { it.publier(sujet, m) }
    private fun etat() = envoyer("""{"k":"etat","m":"$machine","n":$coups,"h":$coeur,"t":${System.currentTimeMillis()}}""")

    /** Une mesure de l'accéléromètre ; t en ms (heure murale). */
    fun mesure(t: Long, ax: Float, ay: Float, az: Float) {
        if (detecteur.mesure(t / 1000.0, ax, ay, az)) {
            coups++
            envoyer("""{"k":"coup","m":"$machine","n":$coups,"f":${"%.2f".format(java.util.Locale.US, detecteur.force)},"h":$coeur,"t":$t}""")
        }
    }

    fun fin() { envoyer("""{"k":"fin","m":"$machine","n":$coups}"""); h.postDelayed({ relais.forEach { it.fermer() }; fil.quitSafely() }, 1500) }
}
