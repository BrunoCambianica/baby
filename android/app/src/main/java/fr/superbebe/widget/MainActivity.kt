package fr.superbebe.widget

import android.app.Activity
import android.content.Intent
import android.graphics.Typeface
import android.net.Uri
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
import java.util.Locale
import kotlin.math.roundToInt

/**
 * Écran du widget Android : reçoit la configuration de l'app web (lien superbebe://config/…),
 * permet de noter la température de la chambre et de dire si la tenue allait.
 */
class MainActivity : Activity() {
    private lateinit var status: TextView
    private lateinit var roomValue: TextView
    private var room = 19.0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        room = SbStore.room(this) ?: SbStore.lastRoom(this)
        setContentView(buildUi())
        handleIntent(intent)
        refreshStatus()
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
            toast("Configuration non reconnue : recopiez-la depuis l'app web.")
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
            "Pas encore configuré. Dans l'app web, ouvrez « Widget et installation », puis « Envoyer ma configuration au widget Android »."
        } else {
            "Widget configuré pour ${place.name}. Ajoutez-le : appui long sur l'écran d'accueil, Widgets, Superbébé."
        }
        roomValue.text = String.format(Locale.FRANCE, "%.1f °C", room)
    }

    private fun changeRoom(delta: Double) {
        room = ((room + delta) * 2).roundToInt() / 2.0
        room = room.coerceIn(10.0, 35.0)
        roomValue.text = String.format(Locale.FRANCE, "%.1f °C", room)
    }

    private fun buildUi(): View {
        val column = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val pad = dp(20)
            setPadding(pad, pad, pad, pad)
        }
        column.addView(text("Superbébé", 26f, bold = true))
        status = text("", 16f)
        column.addView(status)

        column.addView(section("Ce soir, température de la chambre"))
        roomValue = text("", 24f, bold = true).apply { setPadding(dp(16), 0, dp(16), 0) }
        column.addView(row(button("−") { changeRoom(-0.5) }, roomValue, button("+") { changeRoom(0.5) }))
        column.addView(button("Enregistrer pour ce soir") {
            SbStore.saveRoom(this, room)
            SbWorker.refreshNow(this, replace = true)
            toast("Relevé enregistré.")
        })

        column.addView(section("Avec la dernière tenue, bébé avait…"))
        column.addView(row(
            button("Trop chaud") { feedback(-1, "les prochaines tenues seront un peu plus légères") },
            button("Bien") { feedback(0, "merci") },
            button("Trop froid") { feedback(1, "les prochaines tenues seront un peu plus chaudes") },
        ))

        column.addView(section("Widget"))
        column.addView(button("Actualiser le widget") {
            SbWorker.refreshNow(this, replace = true)
            toast("Actualisation en cours.")
        })
        column.addView(button("Ouvrir l'app complète") {
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
            "Superbébé relaie des repères officiels et propose des suggestions pratiques : ce n'est pas un avis médical. Urgence : 15 ou 112.",
            13f,
        ).apply { setPadding(0, dp(24), 0, 0) })

        return ScrollView(this).apply { addView(column) }
    }

    private fun feedback(delta: Int, message: String) {
        SbStore.addFeedback(this, delta)
        SbWorker.refreshNow(this, replace = true)
        toast("Noté : $message.")
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
