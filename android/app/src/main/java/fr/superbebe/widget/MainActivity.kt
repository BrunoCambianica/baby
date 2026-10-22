package fr.superbebe.widget

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
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
import androidx.core.graphics.ColorUtils
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.max

/**
 * L'app Superbébé sur Android : l'app web en plein écran, sans barre de navigateur, reliée au widget.
 * L'app web transmet ses réglages et le relevé de la chambre au widget par le pont « SuperbebeAndroid » ;
 * une configuration envoyée depuis Chrome (lien superbebe://config/…) est reprise dans l'app.
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
        web.loadUrl(if (config != null) "$appUrl#import=$config" else appUrl)
        registerBack()
        checkForUpdate()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        configFrom(intent)?.let { web.loadUrl("$appUrl#import=$it") }
    }

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
        // Réglages (texte SB1.…, vide après « Effacer mes données ») et relevé de la chambre ({"value":…,"at":…}).
        @JavascriptInterface
        fun sync(config: String, room: String) {
            if (!onApp) return
            val context = this@MainActivity
            var changed = false
            if (config.isEmpty()) {
                changed = SbStore.clearConfig(context)
            } else if (config != SbStore.config(context) && SbConfig.decode(config) != null) {
                SbStore.saveConfig(context, config, null)
                changed = true
            }
            val reading = runCatching { JSONObject(room) }.getOrNull()
            val value = reading?.optDouble("value", Double.NaN) ?: Double.NaN
            val at = reading?.optLong("at") ?: 0L
            if (!value.isNaN() && at > SbStore.roomAt(context)) {
                SbStore.saveRoom(context, value, at)
                changed = true
            }
            if (changed) {
                SbWorker.schedule(context)
                SbWorker.refreshNow(context, replace = true)
            }
        }

        @JavascriptInterface
        fun colors(top: String, bottom: String) {
            val topColor = runCatching { Color.parseColor(top) }.getOrNull() ?: return
            val bottomColor = runCatching { Color.parseColor(bottom) }.getOrNull() ?: return
            runOnUiThread { applyColors(topColor, bottomColor) }
        }

        @JavascriptInterface
        fun widgets(): Int = AppWidgetManager.getInstance(this@MainActivity).getAppWidgetIds(widgetComponent()).size

        // Fenêtre d'Android « Ajouter à l'écran d'accueil » ; false si le lanceur ne la propose pas.
        @JavascriptInterface
        fun addWidget(): Boolean {
            if (!onApp) return false
            val manager = AppWidgetManager.getInstance(this@MainActivity)
            return manager.isRequestPinAppWidgetSupported && manager.requestPinAppWidget(widgetComponent(), null, null)
        }

        @JavascriptInterface
        fun share(text: String): Boolean {
            if (!onApp) return false
            val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text)
            runOnUiThread { startActivity(Intent.createChooser(send, null)) }
            return true
        }

        @JavascriptInterface
        fun version(): String = packageManager.getPackageInfo(packageName, 0).versionName ?: ""
    }

    companion object {
        private const val REQUEST_LOCATION = 1
    }
}
