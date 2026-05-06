package tv.taptrivia.firestick

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action ?: return
    if (action != Intent.ACTION_BOOT_COMPLETED &&
        action != "android.intent.action.QUICKBOOT_POWERON" &&
        action != "com.htc.intent.action.QUICKBOOT_POWERON") {
      return
    }
    val launch = Intent(context, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    context.startActivity(launch)
  }
}
