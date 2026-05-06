package tv.taptrivia.firestick

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.view.WindowManager
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
}
