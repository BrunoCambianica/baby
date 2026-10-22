package fr.superbebe.widget

import android.content.Context
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject

/** État local des widgets : configuration, dernière météo, relevés des chambres, enfant de chaque widget et derniers rendus. */
object SbStore {
    const val DEFAULT_BASE_URL = "https://brunocambianica.github.io/baby/"
    private const val ROOM_TTL_MS = 16 * 3600 * 1000L

    /** Ligne du widget : un texte, ou une rangée de dessins (identifiants de engine/drawings.js) suivie d'un texte. */
    data class Line(val text: String, val drawings: List<String> = emptyList(), val label: String = text)

    /** Rendu d'un enfant (`id` vide : message sans enfant, par exemple avant tout réglage). */
    data class Render(
        val id: String,
        val name: String,
        val place: String,
        val lines: List<Line>,
        val footer: String,
        val theme: String = "nuageux",
    ) {
        companion object {
            fun message(place: String, text: String, footer: String = "") = Render("", "", place, listOf(Line(text)), footer)
        }
    }

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
        prefs(context).edit().remove("config").remove("room").remove("room_at").remove("rooms").remove("reminder_on").apply()
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

    /** Relevé unique des versions à un seul enfant (valable 16 heures), repris pour le premier enfant. */
    fun room(context: Context): Double? {
        val p = prefs(context)
        val fresh = System.currentTimeMillis() - p.getLong("room_at", 0) < ROOM_TTL_MS
        return if (fresh) p.getFloat("room", 19f).toDouble() else null
    }

    private fun roomReadings(context: Context): JSONObject =
        runCatching { JSONObject(prefs(context).getString("rooms", "{}") ?: "{}") }.getOrDefault(JSONObject())

    /** Relevés des chambres encore valables (16 heures : une soirée et une nuit), par enfant : { identifiant: degrés }. */
    fun rooms(context: Context): JSONObject {
        val all = roomReadings(context)
        val fresh = JSONObject()
        val now = System.currentTimeMillis()
        for (id in all.keys()) {
            val reading = all.optJSONObject(id) ?: continue
            if (now - reading.optLong("at") < ROOM_TTL_MS) fresh.put(id, reading.optDouble("value"))
        }
        return fresh
    }

    /** Garde, pour chaque enfant, le relevé le plus récent ; true si l'un d'eux a changé. */
    fun saveRooms(context: Context, readings: Map<String, Pair<Double, Long>>): Boolean {
        val all = roomReadings(context)
        var changed = false
        for ((id, reading) in readings) {
            val (value, at) = reading
            if (value.isNaN() || at <= (all.optJSONObject(id)?.optLong("at") ?: 0L)) continue
            all.put(id, JSONObject().put("value", value).put("at", at))
            changed = true
        }
        if (changed) prefs(context).edit().putString("rooms", all.toString()).apply()
        return changed
    }

    /** Rappel du soir : activé dans l'app, à l'heure choisie (« 20:00 »), au plus une fois par jour. */
    data class Reminder(val on: Boolean, val at: String, val sentFor: String?)

    fun reminder(context: Context): Reminder {
        val p = prefs(context)
        return Reminder(p.getBoolean("reminder_on", false), p.getString("reminder_at", null) ?: "20:00", p.getString("reminder_sent", null))
    }

    fun saveReminder(context: Context, on: Boolean, at: String) {
        prefs(context).edit().putBoolean("reminder_on", on).putString("reminder_at", at).apply()
    }

    fun markReminderSent(context: Context, day: String) {
        prefs(context).edit().putString("reminder_sent", day).apply()
    }

    /** Enfant affiché par un widget (le premier enfant si rien n'a été choisi). */
    fun widgetChild(context: Context, widgetId: Int): String? = prefs(context).getString("widget_$widgetId", null)

    fun setWidgetChild(context: Context, widgetId: Int, childId: String) {
        prefs(context).edit().putString("widget_$widgetId", childId).apply()
    }

    fun forgetWidgets(context: Context, widgetIds: IntArray) {
        val editor = prefs(context).edit()
        for (id in widgetIds) editor.remove("widget_$id")
        editor.apply()
    }

    private fun lines(array: JSONArray): List<Line> = (0 until array.length()).map { i ->
        val item = array.opt(i)
        if (item is JSONObject) {
            val ids = item.optJSONArray("drawings") ?: JSONArray()
            Line(item.optString("text"), (0 until ids.length()).map { ids.getString(it) }, item.optString("label"))
        } else {
            Line(item?.toString() ?: "")
        }
    }

    /** Rendu de l'enfant demandé ; à défaut celui du premier enfant, ou le dernier message. */
    fun render(context: Context, childId: String?): Render {
        val array = runCatching { JSONArray(prefs(context).getString("renders", "[]")) }.getOrDefault(JSONArray())
        val renders = (0 until array.length()).mapNotNull { array.optJSONObject(it) }.map { r ->
            Render(
                id = r.optString("id"),
                name = r.optString("name"),
                place = r.optString("place").ifEmpty { "Superbébé" },
                lines = lines(r.optJSONArray("lines") ?: JSONArray()),
                footer = r.optString("footer"),
                theme = r.optString("theme").ifEmpty { "nuageux" },
            )
        }
        return renders.firstOrNull { it.id == childId } ?: renders.firstOrNull()
            ?: Render.message("Superbébé", "Ouvrez Superbébé pour choisir votre commune.")
    }

    /** `lines` de chaque rendu : textes, ou objets { drawings, text, label } renvoyés par le moteur pour la tenue en dessins. */
    fun saveRenders(context: Context, renders: List<JSONObject>) {
        prefs(context).edit().putString("renders", JSONArray(renders).toString()).apply()
    }

    fun saveMessage(context: Context, place: String, text: String, footer: String = "") {
        saveRenders(context, listOf(JSONObject().put("place", place).put("lines", JSONArray(listOf(text))).put("footer", footer)))
    }
}

/** Configuration produite par l'app web : « SB1. » suivi d'un JSON en base64url (v1 : un enfant ; v2 : plusieurs, liste k). */
object SbConfig {
    data class Child(val id: String, val name: String)

    data class Place(val name: String, val lat: Double, val lon: Double, val children: List<Child>)

    fun decode(text: String?): Place? {
        val raw = text?.trim() ?: return null
        if (!raw.startsWith("SB1.")) return null
        return runCatching {
            val bytes = Base64.decode(raw.removePrefix("SB1."), Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
            val json = JSONObject(String(bytes, Charsets.UTF_8))
            val children = when (json.optInt("v")) {
                1 -> listOf(Child("", ""))
                2 -> json.optJSONArray("k")?.let { k ->
                    (0 until k.length()).mapNotNull { k.optJSONObject(it) }.map { Child(it.optString("id"), it.optString("p")) }
                }.orEmpty()
                else -> emptyList()
            }
            if (children.isEmpty()) null else Place(json.optString("n", "Superbébé"), json.getDouble("la"), json.getDouble("lo"), children)
        }.getOrNull()
    }
}
