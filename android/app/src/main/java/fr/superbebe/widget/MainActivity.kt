package fr.superbebe.widget

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.LinearLayout
import android.window.OnBackInvokedDispatcher
import androidx.core.content.FileProvider
import androidx.core.graphics.ColorUtils
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.max

/**
 * L'app Superbébé sur Android : l'app web en plein écran, sans barre de navigateur, reliée au widget.
 * L'app web transmet ses réglages et les relevés des chambres aux widgets par le pont « SuperbebeAndroid » ;
 * une configuration envoyée depuis Chrome (lien superbebe://config/…) est reprise dans l'app.
 * Un widget touché ouvre l'app sur son enfant (superbebe://enfant/…), le widget Maison sur l'onglet Maison (superbebe://maison/…).
 * Les relevés notés sur le widget Maison reviennent à l'app par le pont (« readings »).
 */
class MainActivity : Activity() {
    private lateinit var web: WebView
    private lateinit var topBar: View
    private lateinit var bottomBar: View
    private lateinit var appUrl: String
    private var pendingLocation: Pair<String, GeolocationPermissions.Callback>? = null

    // Le pont ne répond qu'aux pages de l'app (les autres liens s'ouvrent dans le navigateur).
    @Volatile private var onApp = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val received = configFrom(intent)
        appUrl = "${SbStore.baseUrl(this)}app/"
        val background = Color.parseColor(if (isNight()) "#0B0D11" else "#F2F3F7")
        val sky = Color.parseColor("#3B8CF6")

        WindowCompat.setDecorFitsSystemWindows(window, false)
        @Suppress("DEPRECATION")
        window.statusBarColor = Color.TRANSPARENT
        @Suppress("DEPRECATION")
        window.navigationBarColor = Color.TRANSPARENT
        if (Build.VERSION.SDK_INT >= 29) {
            window.isStatusBarContrastEnforced = false
            window.isNavigationBarContrastEnforced = false
        }

        topBar = View(this)
        bottomBar = View(this)
        web = WebView(this).apply {
            setBackgroundColor(background)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.setGeolocationEnabled(true)
            webViewClient = AppClient()
            webChromeClient = AppChrome()
            addJavascriptInterface(Bridge(), "SuperbebeAndroid")
        }
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(background)
            addView(topBar, LinearLayout.LayoutParams(MATCH_PARENT, 0))
            addView(web, LinearLayout.LayoutParams(MATCH_PARENT, 0, 1f))
            addView(bottomBar, LinearLayout.LayoutParams(MATCH_PARENT, 0))
        }
        // Place réservée aux barres du système (et au clavier), aux couleurs de l'écran affiché.
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            val keyboard = insets.getInsets(WindowInsetsCompat.Type.ime())
            topBar.layoutParams = topBar.layoutParams.apply { height = bars.top }
            bottomBar.layoutParams = bottomBar.layoutParams.apply { height = max(bars.bottom, keyboard.bottom) }
            view.setPadding(bars.left, 0, bars.right, 0)
            WindowInsetsCompat.CONSUMED
        }
        setContentView(root)
        applyColors(sky, background)

        // Au premier lancement, l'app reprend les réglages déjà donnés au widget (ancienne app du widget).
        val first = SbStore.takeFirstImport(this)
        val config = received ?: first
        val query = listOfNotNull(childFrom(intent)?.let { "enfant=${Uri.encode(it)}" }, if (fromHomeWidget(intent)) "onglet=maison" else null)
        val child = if (query.isEmpty()) "" else query.joinToString("&", prefix = "?")
        web.loadUrl(if (config != null) "$appUrl$child#import=$config" else "$appUrl$child")
        registerBack()
        checkForUpdate()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val config = configFrom(intent)
        if (config != null) {
            web.loadUrl("$appUrl#import=$config")
            return
        }
        childFrom(intent)?.let { web.evaluateJavascript("window.sbChoisirEnfant && window.sbChoisirEnfant(${JSONObject.quote(it)})", null) }
        if (fromHomeWidget(intent)) web.evaluateJavascript("window.sbOnglet && window.sbOnglet('maison')", null)
    }

    // Enfant du widget touché : superbebe://enfant/identifiant, ou superbebe://maison/identifiant pour le widget Maison
    // (vide pour un seul enfant sans identifiant).
    private fun childFrom(intent: Intent?): String? {
        val uri = intent?.data ?: return null
        if (uri.scheme != "superbebe" || (uri.host != "enfant" && uri.host != "maison")) return null
        return uri.lastPathSegment?.takeIf { it.isNotBlank() }
    }

    private fun fromHomeWidget(intent: Intent?): Boolean = intent?.data?.let { it.scheme == "superbebe" && it.host == "maison" } == true

    override fun onResume() {
        super.onResume()
        web.onResume()
        // Au retour dans l'app (widget touché, widget posé…), l'app web se met à jour comme un onglet redevenu visible.
        web.evaluateJavascript("document.dispatchEvent(new Event('visibilitychange'))", null)
    }

    override fun onPause() {
        web.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        (web.parent as? ViewGroup)?.removeView(web)
        web.destroy()
        super.onDestroy()
    }

    // Configuration reçue de l'app web ouverte dans Chrome : superbebe://config/SB1.…?base=…
    private fun configFrom(intent: Intent?): String? {
        val uri = intent?.data ?: return null
        if (uri.scheme != "superbebe" || uri.host != "config") return null
        val config = uri.lastPathSegment?.trim() ?: return null
        if (SbConfig.decode(config) == null) return null
        SbStore.saveConfig(this, config, uri.getQueryParameter("base"))
        SbWorker.schedule(this)
        SbWorker.refreshNow(this, replace = true)
        return config
    }

    private fun isNight() =
        (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES

    private fun applyColors(top: Int, bottom: Int) {
        topBar.setBackgroundColor(top)
        bottomBar.setBackgroundColor(bottom)
        val controller = WindowCompat.getInsetsController(window, window.decorView)
        controller.isAppearanceLightStatusBars = ColorUtils.calculateLuminance(top) > 0.5
        controller.isAppearanceLightNavigationBars = ColorUtils.calculateLuminance(bottom) > 0.5
    }

    // Retour : page précédente de l'app (réglages, widget…), sinon fermeture.
    private fun registerBack() {
        if (Build.VERSION.SDK_INT >= 33) {
            onBackInvokedDispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT) { goBack() }
        }
    }

    // Seulement avant Android 13 : ensuite, le retour passe par registerBack().
    @SuppressLint("GestureBackNavigation")
    @Deprecated("Android 13 et plus passent par registerBack()")
    override fun onBackPressed() = goBack()

    private fun goBack() {
        if (web.canGoBack()) web.goBack() else finish()
    }

    private fun openOutside(uri: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE))
        } catch (e: ActivityNotFoundException) {
            // Aucune app pour ce lien : on reste dans Superbébé.
        }
    }

    private fun widgetComponent() = ComponentName(this, SbWidgetReceiver::class.java)

    private fun homeWidgetComponent() = ComponentName(this, SbHomeWidgetReceiver::class.java)

    // Compare la version installée à celle publiée sur le site ; propose l'APK s'il est plus récent, au plus une fois par jour.
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
            if (latest.optLong("versionCode") <= installed || !SbStore.askUpdate(this)) return@Thread
            val apk = Uri.parse("${base}dist/${latest.optString("apk", "superbebe-android.apk")}")
            runOnUiThread {
                if (isFinishing || isDestroyed) return@runOnUiThread
                AlertDialog.Builder(this)
                    .setTitle("Nouvelle version de l'app")
                    .setMessage("La version ${latest.optString("versionName")} est prête. Téléchargez-la, puis installez-la par-dessus : vos réglages sont gardés.")
                    .setPositiveButton("Télécharger") { _, _ -> openOutside(apk) }
                    .setNegativeButton("Plus tard", null)
                    .show()
            }
        }.start()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_NOTIFICATIONS) {
            SbReminder.schedule(this)
            web.evaluateJavascript("document.dispatchEvent(new Event('visibilitychange'))", null)
            return
        }
        if (requestCode != REQUEST_LOCATION) return
        val granted = grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED
        pendingLocation?.let { (origin, callback) -> callback.invoke(origin, granted, false) }
        pendingLocation = null
    }

    private inner class AppClient : WebViewClient() {
        // Les pages de l'app restent dans l'app ; sources, téléchargements et autres liens s'ouvrent à côté.
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            if (request.url.toString().startsWith(appUrl)) return false
            openOutside(request.url)
            return true
        }

        override fun onPageStarted(view: WebView, url: String, favicon: Bitmap?) {
            onApp = url.startsWith(appUrl)
        }

        override fun doUpdateVisitedHistory(view: WebView, url: String, isReload: Boolean) {
            onApp = url.startsWith(appUrl)
        }
    }

    // « Ma position » dans le choix de la commune : position approximative, demandée au moment voulu.
    private inner class AppChrome : WebChromeClient() {
        override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
            if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                callback.invoke(origin, true, false)
            } else {
                pendingLocation = origin to callback
                requestPermissions(arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION), REQUEST_LOCATION)
            }
        }
    }

    /** Appelé par l'app web, sur le fil d'exécution du WebView (pas celui de l'interface). */
    private inner class Bridge {
        // Réglages (texte SB1.…, vide après « Effacer mes données ») et relevés des chambres :
        // {"identifiant": {"value":…,"at":…}, …}, ou {"value":…,"at":…} pour le premier enfant (versions à un seul enfant).
        @JavascriptInterface
        fun sync(config: String, rooms: String) {
            if (!onApp) return
            val context = this@MainActivity
            var changed = false
            if (config.isEmpty()) {
                changed = SbStore.clearConfig(context)
            } else if (config != SbStore.config(context) && SbConfig.decode(config) != null) {
                SbStore.saveConfig(context, config, null)
                changed = true
            }
            val json = runCatching { JSONObject(rooms) }.getOrNull()
            val readings = mutableMapOf<String, Pair<Double, Long>>()
            if (json?.has("value") == true) {
                SbConfig.decode(SbStore.config(context))?.children?.firstOrNull()?.let {
                    readings[it.id] = json.optDouble("value", Double.NaN) to json.optLong("at")
                }
            } else if (json != null) {
                for (id in json.keys()) {
                    val reading = json.optJSONObject(id) ?: continue
                    readings[id] = reading.optDouble("value", Double.NaN) to reading.optLong("at")
                }
            }
            if (SbStore.saveRooms(context, readings)) changed = true
            if (changed) {
                SbWorker.schedule(context)
                SbWorker.refreshNow(context, replace = true)
            }
        }

        // Relevés de la journée (pièce de vie) et de la nuit, de la 0.13 : {"jour": {"identifiant": {"value":…,"at":…}}, "nuit": {…}}.
        @JavascriptInterface
        fun syncReadings(json: String) {
            if (!onApp) return
            val context = this@MainActivity
            val all = runCatching { JSONObject(json) }.getOrNull() ?: return
            fun readings(kind: String): Map<String, Pair<Double, Long>> {
                val group = all.optJSONObject(kind) ?: return emptyMap()
                return group.keys().asSequence().mapNotNull { id ->
                    group.optJSONObject(id)?.let { id to (it.optDouble("value", Double.NaN) to it.optLong("at")) }
                }.toMap()
            }
            val day = SbStore.saveDayRooms(context, readings("jour"))
            val night = SbStore.saveRooms(context, readings("nuit"))
            if (day || night) SbWorker.refreshNow(context, replace = true)
        }

        // Relevés gardés par les widgets, ceux notés sur le widget Maison compris : l'app reprend les plus récents.
        @JavascriptInterface
        fun readings(): String = if (onApp) SbStore.allReadings(this@MainActivity) else "{}"

        @JavascriptInterface
        fun colors(top: String, bottom: String) {
            val topColor = runCatching { Color.parseColor(top) }.getOrNull() ?: return
            val bottomColor = runCatching { Color.parseColor(bottom) }.getOrNull() ?: return
            runOnUiThread { applyColors(topColor, bottomColor) }
        }

        @JavascriptInterface
        fun widgets(): Int = AppWidgetManager.getInstance(this@MainActivity).getAppWidgetIds(widgetComponent()).size

        @JavascriptInterface
        fun homeWidgets(): Int = AppWidgetManager.getInstance(this@MainActivity).getAppWidgetIds(homeWidgetComponent()).size

        // Widget Maison d'un enfant, posé comme le widget principal (SbPinReceiver y attache l'enfant).
        @JavascriptInterface
        fun addHomeWidget(childId: String): Boolean {
            if (!onApp) return false
            val context = this@MainActivity
            val manager = AppWidgetManager.getInstance(context)
            if (!manager.isRequestPinAppWidgetSupported) return false
            val answer = Intent(context, SbPinReceiver::class.java).putExtra(SbPinReceiver.EXTRA_CHILD, childId)
            val callback = PendingIntent.getBroadcast(
                context, "maison:$childId".hashCode(), answer, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
            )
            return manager.requestPinAppWidget(homeWidgetComponent(), null, callback)
        }

        // Widgets posés par enfant : {"identifiant": nombre} ; un widget sans enfant choisi compte pour le premier.
        @JavascriptInterface
        fun widgetChildren(): String {
            val context = this@MainActivity
            val first = SbConfig.decode(SbStore.config(context))?.children?.firstOrNull()?.id ?: ""
            val counts = JSONObject()
            for (id in AppWidgetManager.getInstance(context).getAppWidgetIds(widgetComponent())) {
                val child = SbStore.widgetChild(context, id) ?: first
                counts.put(child, counts.optInt(child) + 1)
            }
            return counts.toString()
        }

        // Fenêtre d'Android « Ajouter à l'écran d'accueil » ; false si le lanceur ne la propose pas.
        @JavascriptInterface
        fun addWidget(): Boolean {
            if (!onApp) return false
            val manager = AppWidgetManager.getInstance(this@MainActivity)
            return manager.isRequestPinAppWidgetSupported && manager.requestPinAppWidget(widgetComponent(), null, null)
        }

        // Widget d'un enfant : Android renvoie le numéro du widget posé à SbPinReceiver, qui y attache l'enfant.
        @JavascriptInterface
        fun addChildWidget(childId: String): Boolean {
            if (!onApp) return false
            val context = this@MainActivity
            val manager = AppWidgetManager.getInstance(context)
            if (!manager.isRequestPinAppWidgetSupported) return false
            val answer = Intent(context, SbPinReceiver::class.java).putExtra(SbPinReceiver.EXTRA_CHILD, childId)
            val callback = PendingIntent.getBroadcast(
                context, childId.hashCode(), answer, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
            )
            return manager.requestPinAppWidget(widgetComponent(), null, callback)
        }

        @JavascriptInterface
        fun share(text: String): Boolean {
            if (!onApp) return false
            val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text)
            runOnUiThread { startActivity(Intent.createChooser(send, null)) }
            return true
        }

        // Fiche du jour : l'image (PNG en base64) et le texte avec le lien, vers la messagerie choisie.
        @JavascriptInterface
        fun shareImage(base64: String, text: String): Boolean {
            if (!onApp) return false
            val context = this@MainActivity
            val uri = runCatching {
                val dir = File(cacheDir, "fiches").apply { mkdirs() }
                val file = File(dir, "fiche-du-jour.png")
                file.writeBytes(android.util.Base64.decode(base64, android.util.Base64.DEFAULT))
                FileProvider.getUriForFile(context, "fr.superbebe.widget.fichiers", file)
            }.getOrNull() ?: return false
            val send = Intent(Intent.ACTION_SEND)
                .setType("image/png")
                .putExtra(Intent.EXTRA_STREAM, uri)
                .putExtra(Intent.EXTRA_TEXT, text)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            runOnUiThread { startActivity(Intent.createChooser(send, null)) }
            return true
        }

        // Rappel du soir, activé ou coupé dans l'app ; Android 13 et plus demandent d'abord l'autorisation.
        // Renvoie l'état : « on », « off », « refuse » (notifications refusées) ou « demande » (fenêtre d'Android ouverte).
        @JavascriptInterface
        fun reminder(on: Boolean, at: String): String {
            if (!onApp) return SbReminder.state(this@MainActivity)
            val context = this@MainActivity
            SbStore.saveReminder(context, on, if (Regex("^\\d{2}:\\d{2}$").matches(at)) at else "20:00")
            SbReminder.schedule(context)
            if (on && !SbReminder.allowed(context)) {
                runOnUiThread { requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQUEST_NOTIFICATIONS) }
                return "demande"
            }
            return SbReminder.state(context)
        }

        @JavascriptInterface
        fun reminderState(): String = SbReminder.state(this@MainActivity)

        @JavascriptInterface
        fun version(): String = packageManager.getPackageInfo(packageName, 0).versionName ?: ""
    }

    companion object {
        private const val REQUEST_LOCATION = 1
        private const val REQUEST_NOTIFICATIONS = 2
    }
}
