package tv.taptrivia.firestick

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebView
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  private var wakeLock: PowerManager.WakeLock? = null

  override fun getMainComponentName(): String = "TapTriviaTV"

  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.AppTheme)
    super.onCreate(savedInstanceState)

    applyKeepAliveFlags()
    acquireWakeLock()
    startKeepAliveService()
  }

  override fun onResume() {
    super.onResume()
    applyKeepAliveFlags()
    if (wakeLock?.isHeld != true) acquireWakeLock()
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) applyKeepAliveFlags()
  }

  override fun onDestroy() {
    releaseWakeLock()
    super.onDestroy()
  }

  private fun applyKeepAliveFlags() {
    window.addFlags(
      WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
        WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
    )
  }

  private fun acquireWakeLock() {
    val pm = getSystemService(POWER_SERVICE) as PowerManager
    val lock = pm.newWakeLock(
      PowerManager.PARTIAL_WAKE_LOCK,
      "TapTrivia:MainActivityWakeLock"
    )
    lock.setReferenceCounted(false)
    lock.acquire()
    wakeLock = lock
  }

  private fun releaseWakeLock() {
    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
  }

  private fun startKeepAliveService() {
    val intent = Intent(this, KeepAliveService::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      startForegroundService(intent)
    } else {
      startService(intent)
    }
  }

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  // Bridge native remote keys → WebView JS. The Amazon WebView swallows
  // dpad/select keys so they never reach JS keydown listeners. Catch them at
  // the activity level and dispatch synthetic KeyboardEvents into the page.
  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    if (event.action == KeyEvent.ACTION_DOWN) {
      val keyName = when (event.keyCode) {
        KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_BUTTON_A -> "Enter"
        KeyEvent.KEYCODE_DPAD_UP -> "ArrowUp"
        KeyEvent.KEYCODE_DPAD_DOWN -> "ArrowDown"
        KeyEvent.KEYCODE_DPAD_LEFT -> "ArrowLeft"
        KeyEvent.KEYCODE_DPAD_RIGHT -> "ArrowRight"
        else -> null
      }
      if (keyName != null) {
        val webView = findWebView(window.decorView)
        if (webView != null) {
          val js = """(function(){var e=new KeyboardEvent('keydown',{key:'$keyName',code:'$keyName',keyCode:${event.keyCode},which:${event.keyCode},bubbles:true});var t=document.activeElement||document.body;t.dispatchEvent(e);window.dispatchEvent(e);})();"""
          webView.evaluateJavascript(js, null)
          // For Enter/select on dpad-center: also click any focused button
          if (keyName == "Enter") {
            webView.evaluateJavascript(
              "(function(){var a=document.activeElement;if(a&&a.tagName==='BUTTON'){a.click();}var o=document.querySelector('.tt-pi-overlay');if(o){var g=document.getElementById('tt-pi-got-it');g&&g.click();}})();",
              null
            )
          }
          // Don't return true — let the system continue to handle (so other handlers still get it)
        }
      }
    }
    return super.dispatchKeyEvent(event)
  }

  private fun findWebView(view: View): WebView? {
    if (view is WebView) return view
    if (view is ViewGroup) {
      for (i in 0 until view.childCount) {
        val found = findWebView(view.getChildAt(i))
        if (found != null) return found
      }
    }
    return null
  }
}
