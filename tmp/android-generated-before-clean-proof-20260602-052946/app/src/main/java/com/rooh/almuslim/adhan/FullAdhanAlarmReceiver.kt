package com.rooh.almuslim.adhan

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class FullAdhanAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val soundKey = intent?.getStringExtra(AdhanPlaybackService.EXTRA_SOUND_TYPE) ?: "makkah"
    val prayerName = intent?.getStringExtra(AdhanPlaybackService.EXTRA_PRAYER_NAME).orEmpty()
    Log.i("FullAdhanReceiver", "Alarm fired for " + soundKey + " (" + prayerName + ")")

    val serviceIntent = Intent(context, AdhanPlaybackService::class.java).apply {
      action = AdhanPlaybackService.ACTION_PLAY
      putExtra(AdhanPlaybackService.EXTRA_SOUND_TYPE, soundKey)
      putExtra(AdhanPlaybackService.EXTRA_PRAYER_NAME, prayerName)
    }

    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(serviceIntent)
      } else {
        context.startService(serviceIntent)
      }
    } catch (e: Exception) {
      Log.e("FullAdhanReceiver", "Failed to start AdhanPlaybackService", e)
    }
  }
}
