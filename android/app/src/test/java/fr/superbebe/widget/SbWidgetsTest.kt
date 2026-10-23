package fr.superbebe.widget

import android.content.Context
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.RemoteViews
import android.widget.ImageView
import android.widget.TextView
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.action.actionParametersOf
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.compose
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.time.ZoneId
import java.time.ZonedDateTime

/**
 * Rendu réel des widgets (Glance, traduit en RemoteViews puis affiché) sur l'ordinateur, avec Robolectric.
 * moteur.json : sortie de sbAndroidAll (moteur embarqué) pour Léo (5 mois) et Zoé (2 ans et demi), le 21 octobre 2026
 * à 10 h, régénérée par npm run build (tools/build-widget.js). Lancement : tools/compiler-apk.sh, qui les passe avant de compiler.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class SbWidgetsTest {
    private val context: Context = ApplicationProvider.getApplicationContext()
    private val fixture = JSONObject(javaClass.classLoader!!.getResource("moteur.json").readText())
    private val paris = ZoneId.of("Europe/Paris")

    @Before
    fun seed() {
        SbStore.saveConfig(context, fixture.getString("config"), null)
        val children = fixture.getJSONArray("children")
        // Comme SbWorker : les tenues de la maison à part, les lignes du widget principal sans elles.
        SbStore.saveHome(context, (0 until children.length()).map { k ->
            val c = children.getJSONObject(k)
            JSONObject().put("id", c.getString("id")).put("name", c.getString("name")).put("place", c.getString("place"))
                .put("check", c.getString("check")).put("maison", c.getJSONObject("maison"))
        })
        SbStore.saveRenders(context, (0 until children.length()).map { k ->
            JSONObject(children.getJSONObject(k).toString()).apply { remove("maison"); put("footer", "Touchez sa nuque, pas ses mains · 9 h") }
        })
        at(10)
    }

    private fun at(hour: Int) {
        SbHomeWidget.clock = { ZonedDateTime.of(2026, 10, 21, hour, 0, 0, 0, paris) }
    }

    private fun render(widget: GlanceAppWidget, height: Int = 170): View = runBlocking {
        widget.compose(context, size = DpSize(250.dp, height.dp)).apply(context, FrameLayout(context))
    }

    private fun texts(view: View): List<String> = when (view) {
        is TextView -> if (view.visibility == View.VISIBLE) listOf(view.text.toString()) else emptyList()
        is ViewGroup -> (0 until view.childCount).flatMap { texts(view.getChildAt(it)) }
        else -> emptyList()
    }

    private fun images(view: View): Int = when (view) {
        is ImageView -> if (view.visibility == View.VISIBLE && view.drawable != null) 1 else 0
        is ViewGroup -> (0 until view.childCount).sumOf { images(view.getChildAt(it)) }
        else -> 0
    }

    private fun now() = System.currentTimeMillis()

    @Test
    fun maisonLeJourAvecUnReleve() {
        SbStore.saveDayRooms(context, mapOf("leo1" to (17.0 to now())))
        val shown = texts(render(SbHomeWidget()))
        assertTrue(shown.toString(), "LÉO · CHEZ VOUS" in shown && "17,0°" in shown && "Sous 20 °C : une couche de plus" in shown)
        assertTrue(shown.toString(), "−" in shown && "+" in shown && "Touchez sa nuque, pas ses mains" in shown)
    }

    @Test
    fun maisonLaNuitSansReleveRecent() {
        at(21)
        SbStore.saveRooms(context, mapOf("leo1" to (22.5 to now() - 20 * 3600 * 1000L)))
        val shown = texts(render(SbHomeWidget()))
        // Relevé de plus de 16 heures : la dernière valeur, la tenue du repère, et comment noter.
        assertTrue(shown.toString(), "LÉO · SA CHAMBRE" in shown && "22,5°" in shown && "≈ 2 TOG" in shown)
        assertTrue(shown.toString(), "Touchez la température pour la noter" in shown)
    }

    @Test
    fun maisonLaNuitAvecUnReleve() {
        at(21)
        SbStore.saveRooms(context, mapOf("leo1" to (22.5 to now())))
        val shown = texts(render(SbHomeWidget()))
        assertTrue(shown.toString(), "22,5°" in shown && "≈ 1 TOG" in shown && "Un peu chaud pour dormir : au-dessus de 20 °C" in shown)
    }

    @Test
    fun maisonAvantLePremierCalcul() {
        SbStore.saveHome(context, emptyList())
        assertEquals(listOf("Ouvrez Superbébé pour préparer le widget Maison."), texts(render(SbHomeWidget())))
    }

    @Test
    fun maisonPetitWidgetSansLePied() {
        SbStore.saveDayRooms(context, mapOf("leo1" to (21.0 to now())))
        val shown = texts(render(SbHomeWidget(), height = 120))
        assertTrue(shown.toString(), "21,0°" in shown && "Bien pour la journée (20 à 22 °C)" in shown)
        assertFalse(shown.toString(), "Touchez sa nuque, pas ses mains" in shown)
    }

    @Test
    fun boutonsDuWidgetMaison() = runBlocking {
        val id = object : GlanceId {}
        val step = { kind: String, delta: String ->
            runBlocking { SbRoomStep().onAction(context, id, actionParametersOf(SbRoomStep.CHILD to "leo1", SbRoomStep.KIND to kind, SbRoomStep.DELTA to delta)) }
        }
        // Sans relevé : on part de 21 °C le jour ; puis de la valeur notée.
        step("jour", "0.5")
        assertEquals(21.5, SbStore.reading(context, "leo1", "jour")!!.value, 0.0)
        step("jour", "-0.5")
        step("jour", "-0.5")
        assertEquals(20.5, SbStore.reading(context, "leo1", "jour")!!.value, 0.0)
        // Toucher la température la note telle quelle, maintenant : un relevé ancien redevient récent.
        SbStore.saveDayRooms(context, mapOf("zoe2" to (19.0 to 1L)))
        SbRoomStep().onAction(context, id, actionParametersOf(SbRoomStep.CHILD to "zoe2", SbRoomStep.KIND to "jour", SbRoomStep.DELTA to "0"))
        val zoe = SbStore.reading(context, "zoe2", "jour")!!
        assertTrue("$zoe", zoe.value == 19.0 && zoe.fresh())
        // Les relevés notés sur le widget reviennent à l'app.
        val all = JSONObject(SbStore.allReadings(context))
        assertEquals(20.5, all.getJSONObject("jour").getJSONObject("leo1").getDouble("value"), 0.0)
    }

    @Test
    fun apercusDansLaListeDesWidgets() {
        // Chaque widget a son aperçu (Android 12 et plus) : les deux ne se confondent plus dans la liste du téléphone.
        val maison = texts(RemoteViews(context.packageName, R.layout.preview_maison).apply(context, FrameLayout(context)))
        assertTrue(maison.toString(), "21,0°" in maison && "Bien pour la journée (20 à 22 °C)" in maison && "−" in maison)
        val principal = texts(RemoteViews(context.packageName, R.layout.preview_widget).apply(context, FrameLayout(context)))
        assertTrue(principal.toString(), "Ce matin 6° → 14°" in principal)
        for ((xml, layout) in listOf(R.xml.superbebe_maison to R.layout.preview_maison, R.xml.superbebe_widget to R.layout.preview_widget)) {
            val parser = context.resources.getXml(xml)
            while (parser.name != "appwidget-provider") parser.next()
            val preview = parser.getAttributeResourceValue("http://schemas.android.com/apk/res/android", "previewLayout", 0)
            assertEquals(layout, preview)
        }
    }

    @Test
    fun widgetPrincipalHuitDessinsSansTroncature() {
        fun withDrawings(count: Int): Int {
            val ids = JSONArray(listOf("body_ml", "pyjama_chaud", "pull", "combi_chaude", "bonnet", "moufles", "chaussons", "chanceliere").take(count))
            val line = JSONObject().put("drawings", ids).put("text", "").put("label", "Tenue")
            SbStore.saveRenders(context, listOf(JSONObject().put("id", "leo1").put("name", "Léo").put("place", "Lyon")
                .put("lines", JSONArray(listOf("Ce matin 2° → 6°", line, "Sac : moufles"))).put("footer", "9 h").put("theme", "froid")))
            return images(render(SbWidget()))
        }
        assertEquals(6, withDrawings(8) - withDrawings(2))
    }
}
