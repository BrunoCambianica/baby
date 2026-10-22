package fr.superbebe.widget

import android.content.Context
import androidx.glance.appwidget.updateAll
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime
import java.util.Locale
import java.util.concurrent.TimeUnit

/** Récupère la météo, calcule les lignes de chaque enfant et redessine les widgets (toutes les 30 minutes). */
class SbWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val c = applicationContext
        val config = SbStore.config(c)
        val place = SbConfig.decode(config)
        if (config == null || place == null) {
            SbStore.saveMessage(c, "Superbébé", "Ouvrez Superbébé pour choisir votre commune.")
            SbWidget().updateAll(c)
            return Result.success()
        }

        val key = "${place.lat},${place.lon}"
        var offline = false
        try {
            val json = withContext(Dispatchers.IO) { httpGet(forecastUrl(place.lat, place.lon)) }
            SbStore.saveForecast(c, json, key)
        } catch (e: IOException) {
            offline = true
        }
        val forecast = SbStore.forecast(c, key)
        if (forecast == null) {
            SbStore.saveMessage(c, place.name, "Météo indisponible. Vérifiez la connexion.")
            SbWidget().updateAll(c)
            return Result.success()
        }

        val now = ZonedDateTime.now(PARIS)
        val updated = Instant.ofEpochMilli(SbStore.forecastAt(c)).atZone(PARIS)
        val footer = (if (offline) "Hors ligne · " else "") +
            String.format(Locale.FRANCE, "Mis à jour à %02d h %02d · Open-Meteo", updated.hour, updated.minute)
        val state = JSONObject().put("rooms", SbStore.rooms(c)).put("room", SbStore.room(c) ?: JSONObject.NULL)
        try {
            val out = SbEngine.compute(
                c, forecast, config, state,
                now.toLocalDate().toString(),
                String.format(Locale.ROOT, "%02d:%02d", now.hour, now.minute),
            )
            if (out.has("error")) throw IllegalStateException("configuration invalide")
            val children = out.getJSONArray("children")
            SbStore.saveRenders(c, (0 until children.length()).map { children.getJSONObject(it).put("footer", footer) })
        } catch (e: SbEngine.Unsupported) {
            SbStore.saveMessage(
                c, place.name,
                "Ce téléphone ne permet pas le calcul : mettez à jour « Android System WebView » dans le Play Store.",
            )
        } catch (e: Exception) {
            SbStore.saveMessage(c, place.name, "Calcul impossible pour le moment. ${e.message ?: ""}".trim(), footer)
        }
        SbWidget().updateAll(c)
        return Result.success()
    }

    companion object {
        private val PARIS: ZoneId = ZoneId.of("Europe/Paris")
        private const val PERIODIC = "superbebe-periodique"
        private const val NOW = "superbebe-maintenant"

        // Doit rester identique à forecastUrl() dans engine/adapter.js.
        fun forecastUrl(lat: Double, lon: Double): String =
            "https://api.open-meteo.com/v1/forecast" +
                String.format(Locale.ROOT, "?latitude=%.4f&longitude=%.4f", lat, lon) +
                "&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,wind_gusts_10m,uv_index,weather_code" +
                "&daily=sunrise,sunset,temperature_2m_max,temperature_2m_mean,precipitation_sum,uv_index_max" +
                "&timezone=Europe%2FParis&forecast_days=16"

        private fun httpGet(url: String): String {
            val connection = URL(url).openConnection() as HttpURLConnection
            connection.connectTimeout = 15_000
            connection.readTimeout = 20_000
            try {
                if (connection.responseCode != HttpURLConnection.HTTP_OK) throw IOException("HTTP ${connection.responseCode}")
                return connection.inputStream.bufferedReader().use { it.readText() }
            } finally {
                connection.disconnect()
            }
        }

        fun schedule(context: Context) {
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                PERIODIC,
                ExistingPeriodicWorkPolicy.UPDATE,
                PeriodicWorkRequestBuilder<SbWorker>(30, TimeUnit.MINUTES).build(),
            )
        }

        fun refreshNow(context: Context, replace: Boolean = false) {
            WorkManager.getInstance(context).enqueueUniqueWork(
                NOW,
                if (replace) ExistingWorkPolicy.REPLACE else ExistingWorkPolicy.KEEP,
                OneTimeWorkRequestBuilder<SbWorker>().build(),
            )
        }
    }
}
