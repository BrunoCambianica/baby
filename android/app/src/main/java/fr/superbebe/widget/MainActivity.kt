package fr.superbebe.widget

import android.app.Activity
import android.content.Intent
import android.graphics.Typeface
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.text.InputType
import android.util.TypedValue
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale
import kotlin.math.roundToInt

/**
 * Écran du widget Android : reçoit la configuration de l'app web (lien superbebe://config/…),
 * permet de noter la température de la chambre et signale les nouvelles versions.
 */
class MainActivity : Activity() {
    private lateinit var status: TextView
    private lateinit var roomValue: TextView
    private lateinit var update: Button
    private var room = 19.0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        room = SbStore.room(this) ?: SbStore.lastRoom(this)
        setContentView(buildUi())
        handleIntent(intent)
        refreshStatus()
        checkForUpdate()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
        refreshStatus()
    }

    private fun handleIntent(intent: Intent?) {
        val uri = intent?.data ?: return
        if (uri.scheme != "superbebe" || uri.host != "config") return
        uri.lastPathSegment?.let { saveConfig(it, uri.getQueryParameter("base")) }
    }

    private fun saveConfig(text: String, base: String?) {
        val place = SbConfig.decode(text)
        if (place == null) {
            toast("Configuration non reconnue : recopiez-la depuis l'app.")
            return
        }
        SbStore.saveConfig(this, text.trim(), base)
        SbWorker.schedule(this)
        SbWorker.refreshNow(this, replace = true)
        toast("Configuration enregistrée pour ${place.name}.")
        refreshStatus()
    }

    private fun refreshStatus() {
        val place = SbConfig.decode(SbStore.config(this))
        status.text = if (place == null) {
            "Pas encore configuré. Dans l'app Superbébé : Réglages, Ajouter le widget, Android, « Envoyer à l'app »."
        } else {
            "Widget prêt pour ${place.name}. Pour le poser : appui long sur l'écran d'accueil, Widgets, Superbébé."
        }
        roomValue.text = String.format(Locale.FRANCE, "%.1f °C", room)
    }

    private fun changeRoom(delta: Double) {
        room = (((room + delta) * 2).roundToInt() / 2.0).coerceIn(10.0, 35.0)
        roomValue.text = String.format(Locale.FRANCE, "%.1f °C", room)
    }

    // Compare la version installée à celle publiée sur le site ; propose l'APK si elle est plus récente.
    private fun checkForUpdate() {
        val base = SbStore.baseUrl(this)
        Thread {
            val latest = runCatching {
                val connection = URL("${base}dist/android-version.json").openConnection() as HttpURLConnection
                connection.connectTimeout = 10_000
                connection.readTimeout = 10_000
                try {
                    JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
                } finally {
                    connection.disconnect()
                }
            }.getOrNull() ?: return@Thread
            val info = packageManager.getPackageInfo(packageName, 0)
            val installed = if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else @Suppress("DEPRECATION") info.versionCode.toLong()
            if (latest.optLong("versionCode") > installed) {
                runOnUiThread {
                    update.text = "Installer la version ${latest.optString("versionName")}"
                    update.visibility = View.VISIBLE
                    update.setOnClickListener {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("${base}dist/${latest.optString("apk", "superbebe-android.apk")}")))
                    }
                }
            }
        }.start()
    }

    private fun buildUi(): View {
        val column = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val pad = dp(20)
            setPadding(pad, pad, pad, pad)
        }
        column.addView(text("Superbébé", 28f, bold = true))
        status = text("", 16f)
        column.addView(status)
        update = button("") {}.apply { visibility = View.GONE }
        column.addView(update)

        column.addView(section("Ce soir, chambre de bébé"))
        roomValue = text("", 26f, bold = true).apply { setPadding(dp(16), 0, dp(16), 0) }
        column.addView(row(button("−") { changeRoom(-0.5) }, roomValue, button("+") { changeRoom(0.5) }))
        column.addView(button("Enregistrer pour ce soir") {
            SbStore.saveRoom(this, room)
            SbWorker.refreshNow(this, replace = true)
            toast("Relevé enregistré : le widget se met à jour.")
        })

        column.addView(section("Widget"))
        column.addView(button("Actualiser maintenant") {
            SbWorker.refreshNow(this, replace = true)
            toast("Actualisation en cours.")
        })
        column.addView(button("Ouvrir l'app Superbébé") {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("${SbStore.baseUrl(this)}app/")))
        })

        column.addView(section("Configuration collée à la main"))
        val input = EditText(this).apply {
            hint = "SB1.…"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
            isSingleLine = true
        }
        column.addView(input, LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT))
        column.addView(button("Enregistrer la configuration") { saveConfig(input.text.toString(), null) })

        column.addView(text(
            "Repères officiels relayés, suggestions pratiques : ce n'est pas un avis médical. Urgence : 15 ou 112.",
            13f,
        ).apply { setPadding(0, dp(24), 0, 0) })

        return ScrollView(this).apply { addView(column) }
    }

    private fun dp(value: Int) =
        TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).roundToInt()

    private fun text(value: String, sizeSp: Float, bold: Boolean = false) = TextView(this).apply {
        text = value
        setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
        if (bold) setTypeface(typeface, Typeface.BOLD)
        setPadding(0, dp(4), 0, dp(4))
    }

    private fun section(title: String) = text(title, 18f, bold = true).apply { setPadding(0, dp(24), 0, dp(8)) }

    private fun button(label: String, onClick: () -> Unit) = Button(this).apply {
        text = label
        isAllCaps = false
        setOnClickListener { onClick() }
    }

    private fun row(vararg views: View) = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        views.forEach { view ->
            val weight = if (view is Button) 1f else 0f
            addView(view, LinearLayout.LayoutParams(if (weight > 0) 0 else WRAP_CONTENT, WRAP_CONTENT, weight))
        }
    }

    private fun toast(message: String) = Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
}
