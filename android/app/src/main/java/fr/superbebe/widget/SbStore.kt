package fr.superbebe.widget

import android.content.Context
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject

/** État local du widget : configuration, dernière météo, réglages personnels et dernier rendu. */
object SbStore {
    const val DEFAULT_BASE_URL = "https://brunocambianica.github.io/baby/"
    private const val ROOM_TTL_MS = 16 * 3600 * 1000L

    data class Render(val place: String, val lines: List<String>, val footer: String, val theme: String)

    private fun prefs(context: Context) = context.getSharedPreferences("superbebe", Context.MODE_PRIVATE)

    fun config(context: Context): String? = prefs(context).getString("config", null)

    fun baseUrl(context: Context): String = prefs(context).getString("base", null) ?: DEFAULT_BASE_URL

    fun saveConfig(context: Context, config: String, baseUrl: String?) {
        val editor = prefs(context).edit().putString("config", config)
        if (!baseUrl.isNullOrBlank()) editor.putString("base", baseUrl)
        editor.apply()
    }

    /** Oublie les réglages (« Effacer mes données » dans l'app) ; true s'il y en avait. */
    fun clearConfig(context: Context): Boolean {
        if (config(context) == null) return false
        prefs(context).edit().remove("config").remove("room").remove("room_at").apply()
        return true
    }

    /** Réglages du widget à reprendre une seule fois dans l'app, au premier lancement. */
    fun takeFirstImport(context: Context): String? {
        val p = prefs(context)
        if (p.getBoolean("app_opened", false)) return null
        p.edit().putBoolean("app_opened", true).apply()
        return config(context)
    }

    /** Une nouvelle version se propose au plus une fois par jour. */
    fun askUpdate(context: Context): Boolean {
        val p = prefs(context)
        val now = System.currentTimeMillis()
        if (now - p.getLong("update_asked_at", 0) < 24 * 3600 * 1000L) return false
        p.edit().putLong("update_asked_at", now).apply()
        return true
    }

    fun forecast(context: Context, key: String): String? {
        val p = prefs(context)
        return if (p.getString("forecast_key", null) == key) p.getString("forecast", null) else null
    }

    fun forecastAt(context: Context): Long = prefs(context).getLong("forecast_at", 0)

    fun saveForecast(context: Context, json: String, key: String) {
        prefs(context).edit()
            .putString("forecast", json)
            .putString("forecast_key", key)
            .putLong("forecast_at", System.currentTimeMillis())
            .apply()
    }

    /** Relevé de la chambre, valable 16 heures (une soirée et une nuit). */
    fun room(context: Context): Double? {
        val p = prefs(context)
        val fresh = System.currentTimeMillis() - p.getLong("room_at", 0) < ROOM_TTL_MS
        return if (fresh) p.getFloat("room", 19f).toDouble() else null
    }

    fun roomAt(context: Context): Long = prefs(context).getLong("room_at", 0)

    fun saveRoom(context: Context, value: Double, at: Long) {
        prefs(context).edit().putFloat("room", value.toFloat()).putLong("room_at", at).apply()
    }

    fun render(context: Context): Render {
        val p = prefs(context)
        val array = runCatching { JSONArray(p.getString("lines", "[]")) }.getOrDefault(JSONArray())
        val lines = (0 until array.length()).map { array.getString(it) }
        return Render(
            place = p.getString("place", null) ?: "Superbébé",
            lines = lines.ifEmpty { listOf("Ouvrez Superbébé pour choisir votre commune.") },
            footer = p.getString("footer", null) ?: "",
            theme = p.getString("theme", null) ?: "nuageux",
        )
    }

    fun saveRender(context: Context, place: String, lines: List<String>, footer: String, theme: String = "nuageux") {
        prefs(context).edit()
            .putString("place", place)
            .putString("lines", JSONArray(lines).toString())
            .putString("footer", footer)
            .putString("theme", theme)
            .apply()
    }
}

/** Configuration produite par l'app web : « SB1. » suivi d'un JSON en base64url. */
object SbConfig {
    data class Place(val name: String, val lat: Double, val lon: Double)

    fun decode(text: String?): Place? {
        val raw = text?.trim() ?: return null
        if (!raw.startsWith("SB1.")) return null
        return runCatching {
            val bytes = Base64.decode(raw.removePrefix("SB1."), Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
            val json = JSONObject(String(bytes, Charsets.UTF_8))
            if (json.optInt("v") != 1) null else Place(json.optString("n", "Superbébé"), json.getDouble("la"), json.getDouble("lo"))
        }.getOrNull()
    }
}
