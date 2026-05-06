package tv.taptrivia.firestick

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat

class KeepAliveService : Service() {

  private var wakeLock: PowerManager.WakeLock? = null

  override fun onCreate() {
    super.onCreate()
    startForeground(NOTIFICATION_ID, buildNotification())
    acquireWakeLock()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (wakeLock?.isHeld != true) acquireWakeLock()
    return START_STICKY
  }

  override fun onDestroy() {
    releaseWakeLock()
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onTaskRemoved(rootIntent: Intent?) {
    val restart = Intent(applicationContext, MainActivity::class.java)
    restart.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    startActivity(restart)
    super.onTaskRemoved(rootIntent)
  }

  private fun buildNotification(): Notification {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      if (nm.getNotificationChannel(CHANNEL_ID) == null) {
        val channel = NotificationChannel(
          CHANNEL_ID,
          "TapTrivia",
          NotificationManager.IMPORTANCE_MIN
        ).apply {
          description = "Keeps the TapTrivia display running"
          setShowBadge(false)
        }
        nm.createNotificationChannel(channel)
      }
    }

    val launchIntent = Intent(this, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
    }
    val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    else
      PendingIntent.FLAG_UPDATE_CURRENT
    val pending = PendingIntent.getActivity(this, 0, launchIntent, pendingFlags)

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("TapTrivia is running")
      .setContentText("Display stays on for live trivia")
      .setSmallIcon(android.R.drawable.stat_notify_sync)
      .setContentIntent(pending)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_MIN)
      .build()
  }

  private fun acquireWakeLock() {
    val pm = getSystemService(POWER_SERVICE) as PowerManager
    val lock = pm.newWakeLock(
      PowerManager.PARTIAL_WAKE_LOCK,
      "TapTrivia:KeepAliveServiceWakeLock"
    )
    lock.setReferenceCounted(false)
    lock.acquire()
    wakeLock = lock
  }

  private fun releaseWakeLock() {
    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
  }

  companion object {
    private const val CHANNEL_ID = "taptrivia_keepalive"
    private const val NOTIFICATION_ID = 1001
  }
}
