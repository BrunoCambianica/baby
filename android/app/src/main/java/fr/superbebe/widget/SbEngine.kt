package fr.superbebe.widget

import android.content.Context
import androidx.concurrent.futures.await
import androidx.javascriptengine.JavaScriptSandbox
import org.json.JSONObject

/**
 * Exécute le moteur de règles JavaScript (le même que l'app web et le widget iPhone)
 * dans le bac à sable JavaScript d'Android, sans WebView visible ni accès réseau.
 */
object SbEngine {
    class Unsupported : Exception("JavaScriptSandbox indisponible sur ce téléphone")

    /** Rendu de tous les enfants de la configuration (fonction sbAndroidAll de android/entry.js). */
    suspend fun compute(
        context: Context,
        forecast: String,
        config: String,
        state: JSONObject,
        date: String,
        time: String,
    ): JSONObject {
        if (!JavaScriptSandbox.isSupported()) throw Unsupported()
        val code = context.assets.open("superbebe-android.js").bufferedReader().use { it.readText() }
        val call = "$code\nsbAndroidAll($forecast, ${JSONObject.quote(config)}, $state, ${JSONObject.quote(date)}, ${JSONObject.quote(time)});"
        val sandbox = JavaScriptSandbox.createConnectedInstanceAsync(context).await()
        return sandbox.use { sb ->
            sb.createIsolate().use { isolate -> JSONObject(isolate.evaluateJavaScriptAsync(call).await()) }
        }
    }
}
