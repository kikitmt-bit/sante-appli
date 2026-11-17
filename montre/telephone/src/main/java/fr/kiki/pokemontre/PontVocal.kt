package fr.kiki.pokemontre

import android.os.PowerManager
import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.ConnectException
import java.net.InetSocketAddress
import java.net.Socket
import java.util.concurrent.TimeUnit

/**
 * « Claude direct » : le pont entre la montre et Claude, sur le téléphone. La montre envoie sa phrase par Bluetooth
 * (message /vocal/q : {id, q, nouveau}) ; on la donne au relais qui tourne dans Termux sur ce téléphone
 * (montre/relais/relais.py --local, port 8793 du téléphone lui-même) et chaque ligne de sa réponse repart à la montre
 * (/vocal/r, avec l'id de la question et un numéro d'ordre n). Rien ne sort du téléphone à part l'échange de Claude
 * Code avec Anthropic. Le téléphone est tenu éveillé le temps de la réponse.
 */
class PontVocal : WearableListenerService() {
    override fun onMessageReceived(ev: MessageEvent) {
        if (ev.path != "/vocal/q") return
        val d = try { JSONObject(String(ev.data, Charsets.UTF_8)) } catch (e: Exception) { return }
        val id = d.optInt("id")
        val messages = Wearable.getMessageClient(this)
        var n = 0
        fun rendre(o: JSONObject) {
            o.put("id", id).put("n", n++)
            try { Tasks.await(messages.sendMessage(ev.sourceNodeId, "/vocal/r", o.toString().toByteArray()), 10, TimeUnit.SECONDS) } catch (e: Exception) { }
        }
        val eveil = getSystemService(PowerManager::class.java).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "pokemontre:vocal")
        eveil.acquire(120_000)
        try {
            Socket().use { s ->
                s.connect(InetSocketAddress("127.0.0.1", PORT), 2000)
                s.tcpNoDelay = true
                s.soTimeout = 100_000
                d.remove("id")
                s.getOutputStream().apply { write((d.toString() + "\n").toByteArray()); flush() }
                val r = BufferedReader(InputStreamReader(s.getInputStream(), Charsets.UTF_8))
                var fini = false
                while (true) {
                    val l = r.readLine() ?: break
                    if (l.isBlank()) continue
                    val o = JSONObject(l)
                    if (o.has("fin") || o.has("erreur") || o.has("ok")) fini = true
                    rendre(o)
                }
                if (!fini) rendre(JSONObject().put("erreur", "Réponse coupée"))
            }
        } catch (e: ConnectException) {
            rendre(JSONObject().put("erreur", "Claude n'est pas lancé sur le téléphone"))
        } catch (e: Exception) {
            rendre(JSONObject().put("erreur", "Téléphone : " + e.javaClass.simpleName))
        } finally {
            if (eveil.isHeld) eveil.release()
        }
    }

    companion object { const val PORT = 8793 }
}
