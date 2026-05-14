const { withAndroidManifest, withDangerousMod, withMainApplication } = require('expo/config-plugins');
const { basename, extname, join, resolve } = require('path');
const {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
} = require('fs');

const PACKAGE_DIR = 'com/rooh/almuslim/adhan';
const SERVICE_CLASS = 'com.rooh.almuslim.adhan.AdhanPlaybackService';
const RECEIVER_CLASS = 'com.rooh.almuslim.adhan.FullAdhanAlarmReceiver';
const PACKAGE_CLASS = 'com.rooh.almuslim.adhan.FullAdhanPackage';

const ADHAN_PLAYBACK_SERVICE_KT = `package com.rooh.almuslim.adhan

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.content.BroadcastReceiver
import android.content.IntentFilter
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.PowerManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.rooh.almuslim.R

class AdhanPlaybackService : Service() {
  private var player: MediaPlayer? = null
  private var audioFocusRequest: AudioFocusRequest? = null
  private var wakeLock: PowerManager.WakeLock? = null
  private var noisyReceiverRegistered: Boolean = false
  private var pausedByLossTransient: Boolean = false
  private var originalAlarmVolume: Int = -1
  private var currentPrayerName: String = ""

  // متجاهل ACTION_AUDIO_BECOMING_NOISY عمداً — الأذان لازم يستمر على السبيكر
  // لما المستخدم يشيل السماعات. (الموسيقى عادة تتوقف، لكن الأذان عبادة لها أولوية.)
  private val noisyReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      Log.i(TAG, "تجاهل BECOMING_NOISY — الأذان يكمل على السبيكر")
    }
  }

  private val focusChangeListener = AudioManager.OnAudioFocusChangeListener { change ->
    when (change) {
      AudioManager.AUDIOFOCUS_LOSS -> {
        // بعض التطبيقات تطلب فوكس دائم وهي شغالة في الخلفية. للأذان لا نوقف
        // الخدمة بالكامل؛ نعلّمها كمؤقتة ونكمل/نستأنف عند رجوع الفوكس.
        Log.i(TAG, "AUDIOFOCUS_LOSS — الحفاظ على خدمة الأذان ومحاولة الاستمرار")
        pausedByLossTransient = true
      }
      AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
        // فقد مؤقت (مكالمة، إشعار قصير) → اعمل pause مؤقت
        try {
          player?.let { if (it.isPlaying) { it.pause(); pausedByLossTransient = true } }
        } catch (_: Exception) {}
      }
      AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
        // الأذان لا يُخفض لصوت تطبيق آخر.
        try { player?.setVolume(1f, 1f) } catch (_: Exception) {}
      }
      AudioManager.AUDIOFOCUS_GAIN -> {
        // استرجعنا الفوكس → كمّل
        try {
          player?.setVolume(1f, 1f)
          if (pausedByLossTransient) {
            player?.start()
            pausedByLossTransient = false
          }
        } catch (_: Exception) {}
      }
    }
  }

  override fun onCreate() {
    super.onCreate()
    createPlaybackChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      stopSelfSafely()
      return START_NOT_STICKY
    }

    val soundKey = normalizeSoundKey(intent?.getStringExtra(EXTRA_SOUND_TYPE))
    val prayerName = intent?.getStringExtra(EXTRA_PRAYER_NAME).orEmpty()

    // Idempotency guard: if a second ACTION_PLAY arrives while we're already
    // playing the same sound (e.g. AlarmManager fired and the patched
    // expo-notifications "androidFullAdhan" path fired ~milliseconds apart),
    // skip the second start so we don't restart the MediaPlayer mid-adhan.
    val currentlyPlaying = try { player?.isPlaying == true } catch (_: Exception) { false }
    if (currentlyPlaying) {
      Log.i(TAG, "Already playing adhan — ignoring duplicate ACTION_PLAY for " + soundKey)
      return START_NOT_STICKY
    }

    currentPrayerName = prayerName
    val notification = buildForegroundNotification(prayerName)

    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        startForeground(
          NOTIFICATION_ID,
          notification,
          ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
        )
      } else {
        startForeground(NOTIFICATION_ID, notification)
      }
      playAdhan(soundKey)
    } catch (e: Exception) {
      Log.e(TAG, "Failed to start full adhan playback", e)
      postPlaybackFallbackNotification(prayerName)
      stopSelfSafely()
    }

    return START_NOT_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    stopPlayback()
    super.onDestroy()
  }

  private fun playAdhan(soundKey: String) {
    stopPlayback()

    // 1. اضمن إن حجم Alarm مش zero — لو كان zero ارفعه لـ 60% من الأقصى
    ensureAudibleVolume()

    // 2. خد WakeLock عشان CPU ما ينام أثناء تشغيل الأذان (5 دقائق كحد أقصى)
    acquireWakeLock()

    // 3. سجّل receiver للـ BECOMING_NOISY (هنتجاهله — لكن لازم نسجّله)
    registerNoisyReceiver()

    if (!requestAudioFocus()) {
      Log.w(TAG, "Audio focus was not granted for " + soundKey)
    }

    // Build a fallback chain so that if the preferred adhan file is missing,
    // corrupted, or fails to decode, we degrade gracefully instead of going silent.
    // Order: requested full -> default full (makkah) -> requested short -> default short.
    val fallbackChain = buildFallbackChain(soundKey)
    if (fallbackChain.isEmpty()) {
      Log.e(TAG, "No playable adhan resources found for " + soundKey)
      postPlaybackFallbackNotification(currentPrayerName)
      stopSelfSafely()
      return
    }

    tryPlayFromChain(fallbackChain, 0, soundKey)
  }

  private fun tryPlayFromChain(chain: List<Int>, index: Int, soundKey: String) {
    if (index >= chain.size) {
      Log.e(TAG, "Exhausted all adhan fallback resources for " + soundKey)
      postPlaybackFallbackNotification(currentPrayerName)
      stopSelfSafely()
      return
    }

    val resId = chain[index]
    val nextPlayer = MediaPlayer()
    player = nextPlayer

    try {
      val asset = resources.openRawResourceFd(resId)
      asset.use {
        nextPlayer.setAudioAttributes(audioAttributes())
        nextPlayer.setDataSource(it.fileDescriptor, it.startOffset, it.length)
        nextPlayer.setOnCompletionListener { stopSelfSafely() }
        nextPlayer.setOnErrorListener { _, what, extra ->
          Log.w(TAG, "MediaPlayer error at index=" + index + " what=" + what + " extra=" + extra + " — trying next fallback")
          try { nextPlayer.release() } catch (_: Exception) {}
          player = null
          tryPlayFromChain(chain, index + 1, soundKey)
          true
        }
        nextPlayer.prepare()
        nextPlayer.start()
      }
      Log.i(TAG, "Started adhan playback (chain index=" + index + ") for " + soundKey)
    } catch (e: Exception) {
      Log.w(TAG, "Failed to prepare adhan at chain index=" + index + " — trying next fallback", e)
      try { nextPlayer.release() } catch (_: Exception) {}
      player = null
      tryPlayFromChain(chain, index + 1, soundKey)
    }
  }

  private fun buildFallbackChain(soundKey: String): List<Int> {
    val ids = mutableListOf<Int>()
    val seen = mutableSetOf<Int>()

    fun addIfPresent(name: String) {
      val id = resources.getIdentifier(name, "raw", packageName)
      if (id != 0 && seen.add(id)) ids.add(id)
    }

    // 1. Preferred full adhan (e.g. adhan_full_mishary)
    addIfPresent("adhan_full_" + soundKey)
    // 2. Default full adhan (Makkah)
    addIfPresent("adhan_full_" + DEFAULT_SOUND)
    // 3. Short adhan matching the user's selection (e.g. mishary)
    addIfPresent(soundKey)
    // 4. Default short adhan (Makkah)
    addIfPresent(DEFAULT_SOUND)

    // 5. Last resort — use whatever R.raw.makkah resolves to
    if (ids.isEmpty()) {
      try {
        val rawClass = Class.forName("$packageName.R\\$raw")
        val field = rawClass.getDeclaredField(DEFAULT_SOUND)
        ids.add(field.getInt(null))
      } catch (_: Exception) {
        // Nothing else to try
      }
    }

    return ids
  }

  private fun stopPlayback() {
    player?.let {
      try {
        if (it.isPlaying) it.stop()
      } catch (_: Exception) {
      }
      try {
        it.release()
      } catch (_: Exception) {
      }
    }
    player = null
    pausedByLossTransient = false
    abandonAudioFocus()
    unregisterNoisyReceiver()
    releaseWakeLock()
    restoreOriginalVolume()
  }

  private fun ensureAudibleVolume() {
    try {
      val manager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val current = manager.getStreamVolume(AudioManager.STREAM_ALARM)
      val max = manager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
      if (current == 0 && max > 0) {
        // احفظ الحجم الأصلي عشان نرجعه بعد الأذان
        originalAlarmVolume = current
        val target = (max * 0.6).toInt().coerceAtLeast(1)
        manager.setStreamVolume(AudioManager.STREAM_ALARM, target, 0)
        Log.i(TAG, "حجم Alarm كان zero — رفعته لـ " + target + "/" + max)
      }
    } catch (e: Exception) {
      Log.w(TAG, "ensureAudibleVolume فشل", e)
    }
  }

  private fun restoreOriginalVolume() {
    if (originalAlarmVolume < 0) return
    try {
      val manager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
      manager.setStreamVolume(AudioManager.STREAM_ALARM, originalAlarmVolume, 0)
    } catch (_: Exception) {}
    originalAlarmVolume = -1
  }

  private fun acquireWakeLock() {
    try {
      if (wakeLock?.isHeld == true) return
      val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
      val lock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "RoohAlmuslim:AdhanPlayback")
      lock.setReferenceCounted(false)
      lock.acquire(5 * 60 * 1000L) // 5 دقائق كحد أقصى
      wakeLock = lock
    } catch (e: Exception) {
      Log.w(TAG, "acquireWakeLock فشل", e)
    }
  }

  private fun releaseWakeLock() {
    try {
      wakeLock?.let { if (it.isHeld) it.release() }
    } catch (_: Exception) {}
    wakeLock = null
  }

  private fun registerNoisyReceiver() {
    if (noisyReceiverRegistered) return
    try {
      registerReceiver(noisyReceiver, IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY))
      noisyReceiverRegistered = true
    } catch (e: Exception) {
      Log.w(TAG, "registerNoisyReceiver فشل", e)
    }
  }

  private fun unregisterNoisyReceiver() {
    if (!noisyReceiverRegistered) return
    try { unregisterReceiver(noisyReceiver) } catch (_: Exception) {}
    noisyReceiverRegistered = false
  }

  private fun stopSelfSafely() {
    stopPlayback()
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        stopForeground(STOP_FOREGROUND_REMOVE)
      } else {
        @Suppress("DEPRECATION")
        stopForeground(true)
      }
    } catch (_: Exception) {
    }
    stopSelf()
  }

  private fun buildForegroundNotification(prayerName: String): Notification {
    val stopIntent = Intent(this, AdhanPlaybackService::class.java).apply {
      action = ACTION_STOP
    }
    val stopPendingIntent = android.app.PendingIntent.getService(
      this,
      1702,
      stopIntent,
      android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
    )
    val launchPendingIntent = android.app.PendingIntent.getActivity(
      this,
      1703,
      packageManager.getLaunchIntentForPackage(packageName) ?: Intent(),
      android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
    )

    return NotificationCompat.Builder(this, PLAYBACK_CHANNEL_ID)
      .setSmallIcon(resolveSmallIcon())
      .setContentTitle("Adhan is playing")
      .setContentText(if (prayerName.isNotBlank()) prayerName else "Prayer time")
      .setContentIntent(launchPendingIntent)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setSound(null)
      .addAction(0, "Stop", stopPendingIntent)
      .build()
  }

  private fun postPlaybackFallbackNotification(prayerName: String) {
    try {
      val launchPendingIntent = android.app.PendingIntent.getActivity(
        this,
        1704,
        packageManager.getLaunchIntentForPackage(packageName) ?: Intent(),
        android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
      )
      val text = if (prayerName.isNotBlank()) {
        prayerName + " - تعذر تشغيل صوت الأذان"
      } else {
        "تعذر تشغيل صوت الأذان"
      }
      val notification = NotificationCompat.Builder(this, PLAYBACK_CHANNEL_ID)
        .setSmallIcon(resolveSmallIcon())
        .setContentTitle("حان وقت الصلاة")
        .setContentText(text)
        .setContentIntent(launchPendingIntent)
        .setAutoCancel(true)
        .setCategory(NotificationCompat.CATEGORY_ALARM)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
        .setSound(null)
        .build()
      val manager = getSystemService(NotificationManager::class.java)
      manager.notify(FALLBACK_NOTIFICATION_ID, notification)
    } catch (e: Exception) {
      Log.w(TAG, "Failed to post visual fallback notification", e)
    }
  }

  private fun createPlaybackChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NotificationManager::class.java)
    val channel = NotificationChannel(
      PLAYBACK_CHANNEL_ID,
      "Full adhan playback",
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      setSound(null, null)
      enableVibration(false)
      setShowBadge(false)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }
    manager.createNotificationChannel(channel)
  }

  private fun requestAudioFocus(): Boolean {
    val manager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
        .setAudioAttributes(audioAttributes())
        .setOnAudioFocusChangeListener(focusChangeListener)
        .setWillPauseWhenDucked(false)
        .build()
      audioFocusRequest = request
      manager.requestAudioFocus(request) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    } else {
      @Suppress("DEPRECATION")
      manager.requestAudioFocus(
        focusChangeListener,
        AudioManager.STREAM_ALARM,
        AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
      ) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    }
  }

  private fun abandonAudioFocus() {
    val manager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      audioFocusRequest?.let { manager.abandonAudioFocusRequest(it) }
      audioFocusRequest = null
    } else {
      @Suppress("DEPRECATION")
      manager.abandonAudioFocus(focusChangeListener)
    }
  }

  private fun audioAttributes(): AudioAttributes =
    AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
      .build()

  private fun resolveSmallIcon(): Int {
    val notificationIcon = resources.getIdentifier("notification_icon", "drawable", packageName)
    return if (notificationIcon != 0) notificationIcon else applicationInfo.icon
  }

  private fun normalizeSoundKey(raw: String?): String {
    val cleaned = raw
      ?.lowercase()
      ?.removeSuffix(".mp3")
      ?.removePrefix("adhan_full_")
      ?.replace(Regex("[^a-z0-9_]"), "_")
      ?: DEFAULT_SOUND

    return if (ALLOWED_SOUND_KEYS.contains(cleaned)) cleaned else DEFAULT_SOUND
  }

  companion object {
    const val ACTION_PLAY = "com.rooh.almuslim.adhan.PLAY"
    const val ACTION_STOP = "com.rooh.almuslim.adhan.STOP"
    const val EXTRA_SOUND_TYPE = "soundType"
    const val EXTRA_PRAYER_NAME = "prayerName"

    private const val TAG = "AdhanPlaybackService"
    private const val PLAYBACK_CHANNEL_ID = "adhan_full_playback_v2"
    private const val NOTIFICATION_ID = 7110
    private const val FALLBACK_NOTIFICATION_ID = 7111
    private const val DEFAULT_SOUND = "makkah"

    private val ALLOWED_SOUND_KEYS = setOf(
      "abdulbasit",
      "ajman",
      "alaqsa",
      "ali_mulla",
      "dosari",
      "egypt",
      "haramain",
      "madinah",
      "makkah",
      "mansoor_zahrani",
      "mishary",
      "naqshbandi",
      "sharif",
      "sudais"
    )
  }
}
`;

// ─── FullAdhanAlarmReceiver.kt ──────────────────────────────────────────────
// BroadcastReceiver triggered by AlarmManager at exact prayer time.
// Starts the AdhanPlaybackService foreground service so audio plays even
// if the app process was killed by the OS.
const FULL_ADHAN_ALARM_RECEIVER_KT = `package com.rooh.almuslim.adhan

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
`;

// ─── FullAdhanModule.kt ─────────────────────────────────────────────────────
// React Native bridge module. Exposes:
//   - playFullAdhanNow(soundKey, prayerName) — immediate playback (foreground)
//   - scheduleFullAdhan(timestampMs, soundKey, prayerName, requestCode) —
//       AlarmManager.setExactAndAllowWhileIdle wakes us at prayer time even
//       if the app is cold-killed.
//   - cancelAllFullAdhan() — clears pending alarms before rescheduling.
//   - stopFullAdhan() — stops in-progress playback.
const FULL_ADHAN_MODULE_KT = `package com.rooh.almuslim.adhan

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class FullAdhanModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    private const val TAG = "FullAdhanModule"
    private const val MAX_REQUEST_CODES = 64
    // Keep request codes deterministic across app restarts so cancel works.
    private const val REQUEST_CODE_BASE = 9100
  }

  override fun getName(): String = "FullAdhanModule"

  @ReactMethod
  fun playFullAdhanNow(soundKey: String, prayerName: String, promise: Promise) {
    try {
      val ctx = reactApplicationContext
      val intent = Intent(ctx, AdhanPlaybackService::class.java).apply {
        action = AdhanPlaybackService.ACTION_PLAY
        putExtra(AdhanPlaybackService.EXTRA_SOUND_TYPE, soundKey)
        putExtra(AdhanPlaybackService.EXTRA_PRAYER_NAME, prayerName)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        ctx.startForegroundService(intent)
      } else {
        ctx.startService(intent)
      }
      promise.resolve(true)
    } catch (e: Exception) {
      Log.e(TAG, "playFullAdhanNow failed", e)
      promise.reject("ERR_PLAY_ADHAN", e)
    }
  }

  @ReactMethod
  fun stopFullAdhan(promise: Promise) {
    try {
      val ctx = reactApplicationContext
      val intent = Intent(ctx, AdhanPlaybackService::class.java).apply {
        action = AdhanPlaybackService.ACTION_STOP
      }
      ctx.stopService(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      Log.e(TAG, "stopFullAdhan failed", e)
      promise.reject("ERR_STOP_ADHAN", e)
    }
  }

  @ReactMethod
  fun scheduleFullAdhan(
    timestampMs: Double,
    soundKey: String,
    prayerName: String,
    requestCode: Int,
    promise: Promise,
  ) {
    try {
      val ctx = reactApplicationContext
      val alarmManager = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      val triggerAt = timestampMs.toLong()

      if (triggerAt <= System.currentTimeMillis()) {
        Log.w(TAG, "Skipping scheduleFullAdhan — trigger time " + triggerAt + " is in the past")
        promise.resolve(false)
        return
      }

      val intent = Intent(ctx, FullAdhanAlarmReceiver::class.java).apply {
        action = AdhanPlaybackService.ACTION_PLAY
        putExtra(AdhanPlaybackService.EXTRA_SOUND_TYPE, soundKey)
        putExtra(AdhanPlaybackService.EXTRA_PRAYER_NAME, prayerName)
      }

      val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      } else {
        PendingIntent.FLAG_UPDATE_CURRENT
      }

      val pendingIntent = PendingIntent.getBroadcast(
        ctx,
        REQUEST_CODE_BASE + (requestCode % MAX_REQUEST_CODES),
        intent,
        flags
      )

      // Use setExactAndAllowWhileIdle so Doze mode does not delay the alarm.
      // Falls back gracefully on Android < 23.
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          if (alarmManager.canScheduleExactAlarms()) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
          } else {
            Log.w(TAG, "Cannot schedule exact alarms — using setAndAllowWhileIdle (may be delayed up to 15 min)")
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
          }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
        } else {
          alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
        }
        promise.resolve(true)
      } catch (se: SecurityException) {
        Log.w(TAG, "SecurityException scheduling exact alarm — falling back to inexact", se)
        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
        promise.resolve(true)
      }
    } catch (e: Exception) {
      Log.e(TAG, "scheduleFullAdhan failed", e)
      promise.reject("ERR_SCHEDULE_ADHAN", e)
    }
  }

  @ReactMethod
  fun cancelAllFullAdhan(promise: Promise) {
    try {
      val ctx = reactApplicationContext
      val alarmManager = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      } else {
        PendingIntent.FLAG_UPDATE_CURRENT
      }
      for (i in 0 until MAX_REQUEST_CODES) {
        val intent = Intent(ctx, FullAdhanAlarmReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(ctx, REQUEST_CODE_BASE + i, intent, flags)
        alarmManager.cancel(pendingIntent)
        pendingIntent.cancel()
      }
      promise.resolve(true)
    } catch (e: Exception) {
      Log.e(TAG, "cancelAllFullAdhan failed", e)
      promise.reject("ERR_CANCEL_ADHAN", e)
    }
  }

  // ─── Permission helpers (Phase 1.B) ──────────────────────────────────────
  // Used by lib/permission-recovery.ts to detect & resolve permission issues.

  @ReactMethod
  fun canScheduleExactAlarms(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val alarmManager = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        promise.resolve(alarmManager.canScheduleExactAlarms())
      } else {
        // Android < 12: exact alarms always allowed
        promise.resolve(true)
      }
    } catch (e: Exception) {
      Log.w(TAG, "canScheduleExactAlarms failed", e)
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun requestExactAlarmPermission(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        reactApplicationContext.startActivity(intent)
      }
      promise.resolve(true)
    } catch (e: Exception) {
      Log.w(TAG, "requestExactAlarmPermission failed", e)
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun isIgnoringBatteryOptimizations(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        val pm = reactApplicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
        val pkg = reactApplicationContext.packageName
        promise.resolve(pm.isIgnoringBatteryOptimizations(pkg))
      } else {
        promise.resolve(true)
      }
    } catch (e: Exception) {
      Log.w(TAG, "isIgnoringBatteryOptimizations failed", e)
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun requestIgnoreBatteryOptimizations(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        val pkg = reactApplicationContext.packageName
        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
          data = Uri.parse("package:" + pkg)
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        reactApplicationContext.startActivity(intent)
      }
      promise.resolve(true)
    } catch (e: Exception) {
      Log.w(TAG, "requestIgnoreBatteryOptimizations failed", e)
      // Fallback: open the standard battery settings list
      try {
        val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        reactApplicationContext.startActivity(intent)
        promise.resolve(true)
      } catch (e2: Exception) {
        promise.resolve(false)
      }
    }
  }

  // ─── OEM Auto-Start detection (Phase 1.C) ────────────────────────────────
  // Aggressive OEMs (Xiaomi/Huawei/Oppo/Vivo/Honor/Samsung) kill background
  // services even when battery optimization is disabled. Each maintains its
  // own Auto-Start whitelist that the user must enable manually.

  @ReactMethod
  fun getDeviceManufacturer(promise: Promise) {
    try {
      promise.resolve(Build.MANUFACTURER.lowercase())
    } catch (e: Exception) {
      promise.resolve("unknown")
    }
  }

  @ReactMethod
  fun openOemAutoStartSettings(promise: Promise) {
    try {
      val ctx = reactApplicationContext
      val manufacturer = Build.MANUFACTURER.lowercase()
      val candidates = mutableListOf<Intent>()

      when {
        manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco") -> {
          candidates.add(Intent().setComponent(android.content.ComponentName(
            "com.miui.securitycenter",
            "com.miui.permcenter.autostart.AutoStartManagementActivity"
          )))
        }
        manufacturer.contains("oppo") || manufacturer.contains("realme") -> {
          candidates.add(Intent().setComponent(android.content.ComponentName(
            "com.coloros.safecenter",
            "com.coloros.safecenter.permission.startup.StartupAppListActivity"
          )))
          candidates.add(Intent().setComponent(android.content.ComponentName(
            "com.coloros.safecenter",
            "com.coloros.safecenter.startupapp.StartupAppListActivity"
          )))
          candidates.add(Intent().setComponent(android.content.ComponentName(
            "com.oppo.safe",
            "com.oppo.safe.permission.startup.StartupAppListActivity"
          )))
        }
        manufacturer.contains("vivo") || manufacturer.contains("iqoo") -> {
          candidates.add(Intent().setComponent(android.content.ComponentName(
            "com.iqoo.secure",
            "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"
          )))
          candidates.add(Intent().setComponent(android.content.ComponentName(
            "com.vivo.permissionmanager",
            "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"
          )))
        }
        manufacturer.contains("huawei") || manufacturer.contains("honor") -> {
          candidates.add(Intent().setComponent(android.content.ComponentName(
            "com.huawei.systemmanager",
            "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"
          )))
          candidates.add(Intent().setComponent(android.content.ComponentName(
            "com.huawei.systemmanager",
            "com.huawei.systemmanager.optimize.process.ProtectActivity"
          )))
        }
        manufacturer.contains("samsung") -> {
          // Samsung: Device care → Battery → Background usage limits
          candidates.add(Intent().setComponent(android.content.ComponentName(
            "com.samsung.android.lool",
            "com.samsung.android.sm.ui.battery.BatteryActivity"
          )))
        }
        manufacturer.contains("asus") -> {
          candidates.add(Intent().setComponent(android.content.ComponentName(
            "com.asus.mobilemanager",
            "com.asus.mobilemanager.entry.FunctionActivity"
          )))
        }
        // Transsion family (Tecno / Infinix / itel) → HiOS / XOS Phone Master
        // مهيمنة في مصر و الشرق الأوسط — قاتل خلفية شرس عبر Phone Master.
        manufacturer.contains("tecno") ||
        manufacturer.contains("infinix") ||
        manufacturer.contains("itel") ||
        manufacturer.contains("transsion") -> {
          // App Manager (allow background activity)
          candidates.add(Intent().setComponent(android.content.ComponentName(
            "com.transsion.phonemaster",
            "com.transsion.phonemaster.appmanage.AppManagerActivity"
          )))
          // Auto-start whitelist
          candidates.add(Intent().setComponent(android.content.ComponentName(
            "com.transsion.phonemaster",
            "com.cyin.himgr.autostart.AutoStartActivity"
          )))
          // Power saving / battery optimization on HiOS
          candidates.add(Intent().setComponent(android.content.ComponentName(
            "com.transsion.phonemaster",
            "com.cyin.himgr.powermanager.PowerManagerActivity"
          )))
          // App Freezer (HiOS 12+)
          candidates.add(Intent().setComponent(android.content.ComponentName(
            "com.transsion.phonemaster",
            "com.transsion.phonemaster.applocker.activity.AppLockerSetActivity"
          )))
          // Notification permissions on HiOS
          candidates.add(Intent().setComponent(android.content.ComponentName(
            "com.transsion.phonemaster",
            "com.transsion.phonemaster.notification.NotificationManagerActivity"
          )))
        }
        // OnePlus / OxygenOS battery optimization
        manufacturer.contains("oneplus") -> {
          candidates.add(Intent().setComponent(android.content.ComponentName(
            "com.oneplus.security",
            "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity"
          )))
        }
        // Meizu / Flyme OS Security Center
        manufacturer.contains("meizu") -> {
          candidates.add(Intent().setComponent(android.content.ComponentName(
            "com.meizu.safe",
            "com.meizu.safe.security.SHOW_APPSEC"
          )))
          candidates.add(Intent().setComponent(android.content.ComponentName(
            "com.meizu.safe",
            "com.meizu.safe.permission.SmartBGActivity"
          )))
        }
        // Lenovo / Motorola — most use stock Android, but Lenovo ZUI / Moto Battery
        // Optimization screens exist on certain regions.
        manufacturer.contains("lenovo") || manufacturer.contains("motorola") || manufacturer.contains("moto") -> {
          // ZUI background management
          candidates.add(Intent().setComponent(android.content.ComponentName(
            "com.lenovo.security",
            "com.lenovo.security.purebackground.PureBackgroundActivity"
          )))
        }
        // Nubia / ZTE — MyOS
        manufacturer.contains("nubia") || manufacturer.contains("zte") -> {
          candidates.add(Intent().setComponent(android.content.ComponentName(
            "cn.nubia.security2",
            "cn.nubia.security2.appmanage.AppManageActivity"
          )))
        }
        // LeEco / LeTV
        manufacturer.contains("leeco") || manufacturer.contains("letv") -> {
          candidates.add(Intent().setComponent(android.content.ComponentName(
            "com.letv.android.letvsafe",
            "com.letv.android.letvsafe.AutobootManageActivity"
          )))
        }
      }

      // Try each candidate; fall back to general battery optimization settings
      for (intent in candidates) {
        try {
          intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
          ctx.startActivity(intent)
          promise.resolve(true)
          return
        } catch (e: Exception) {
          // Try next candidate
        }
      }

      // Fallback: standard battery optimization settings
      try {
        val fallback = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        ctx.startActivity(fallback)
        promise.resolve(true)
      } catch (e: Exception) {
        Log.w(TAG, "openOemAutoStartSettings: no candidate worked", e)
        promise.resolve(false)
      }
    } catch (e: Exception) {
      Log.w(TAG, "openOemAutoStartSettings failed", e)
      promise.resolve(false)
    }
  }

  // ─── Boot detection (Phase 1.D) ──────────────────────────────────────────
  // BootCompletedReceiver writes a flag to SharedPreferences after device boot.
  // JS reads this flag on app launch and force-reschedules FullAdhan AlarmManager
  // entries (which DON'T survive reboot — only expo-notifications does).

  @ReactMethod
  fun consumeBootPendingReschedule(promise: Promise) {
    try {
      val prefs = reactApplicationContext.getSharedPreferences("rooh_boot_state", android.content.Context.MODE_PRIVATE)
      val pending = prefs.getBoolean("boot_pending_reschedule", false)
      if (pending) {
        prefs.edit().putBoolean("boot_pending_reschedule", false).apply()
      }
      promise.resolve(pending)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  // ─── DND Bypass detection (Phase 4) ──────────────────────────────────────
  // bypassDnd:true في القنوات لا يعمل فعلاً إلا لو المستخدم منح
  // ACCESS_NOTIFICATION_POLICY من إعدادات النظام. بدون هذا الإذن
  // الأذان يُكتم تلقائياً أثناء وضع "عدم الإزعاج".

  @ReactMethod
  fun isDndAccessGranted(promise: Promise) {
    try {
      val nm = reactApplicationContext.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
      promise.resolve(nm.isNotificationPolicyAccessGranted)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun openDndAccessSettings(promise: Promise) {
    try {
      val intent = Intent(android.provider.Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactApplicationContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      Log.w(TAG, "openDndAccessSettings failed", e)
      promise.resolve(false)
    }
  }

  /**
   * يفحص هل وضع "عدم الإزعاج" مفعّل حالياً.
   * يستخدمه الـ banner لتنبيه المستخدم لو الأذان قد لا يُسمع.
   */
  @ReactMethod
  fun isDndCurrentlyActive(promise: Promise) {
    try {
      val nm = reactApplicationContext.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
      val filter = nm.currentInterruptionFilter
      // INTERRUPTION_FILTER_ALL = 1 (no DND)
      // أي قيمة أخرى = DND مفعّل بشكل ما
      promise.resolve(filter != android.app.NotificationManager.INTERRUPTION_FILTER_ALL && filter != 0)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }
}
`;

// ─── FullAdhanPackage.kt ────────────────────────────────────────────────────
// ReactPackage that registers FullAdhanModule with the React Native bridge.
const FULL_ADHAN_PACKAGE_KT = `package com.rooh.almuslim.adhan

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class FullAdhanPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): MutableList<NativeModule> =
    mutableListOf(FullAdhanModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): MutableList<ViewManager<*, *>> =
    mutableListOf()
}
`;

function ensurePermission(manifest, name) {
  if (!manifest.manifest['uses-permission']) {
    manifest.manifest['uses-permission'] = [];
  }

  const exists = manifest.manifest['uses-permission'].some(
    (permission) => permission.$?.['android:name'] === name
  );

  if (!exists) {
    manifest.manifest['uses-permission'].push({
      $: { 'android:name': name },
    });
  }
}

function rawResourceName(filename) {
  const ext = extname(filename).toLowerCase();
  const base = basename(filename, ext)
    .toLowerCase()
    .replace(/\.mp3$/, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '');

  return base.startsWith('adhan_full_') ? base : `adhan_full_${base}`;
}

function withAndroidFullAdhan(config) {
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const srcDir = resolve(projectRoot, 'android/app/src/main/java', PACKAGE_DIR);
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'AdhanPlaybackService.kt'), ADHAN_PLAYBACK_SERVICE_KT, 'utf-8');
      writeFileSync(join(srcDir, 'FullAdhanAlarmReceiver.kt'), FULL_ADHAN_ALARM_RECEIVER_KT, 'utf-8');
      writeFileSync(join(srcDir, 'FullAdhanModule.kt'), FULL_ADHAN_MODULE_KT, 'utf-8');
      writeFileSync(join(srcDir, 'FullAdhanPackage.kt'), FULL_ADHAN_PACKAGE_KT, 'utf-8');

      const fullAdhanDir = resolve(projectRoot, 'assets/sounds/adhan_full');
      const rawDir = resolve(projectRoot, 'android/app/src/main/res/raw');
      mkdirSync(rawDir, { recursive: true });

      if (existsSync(fullAdhanDir)) {
        const copied = readdirSync(fullAdhanDir)
          .filter((file) => ['.mp3', '.wav', '.ogg', '.m4a'].includes(extname(file).toLowerCase()))
          .map((file) => {
            const ext = extname(file).toLowerCase();
            const destName = `${rawResourceName(file)}${ext}`;
            copyFileSync(join(fullAdhanDir, file), join(rawDir, destName));
            return destName;
          });

        if (copied.length > 0) {
          console.log(`[with-android-full-adhan] Copied full adhan raw resources: ${copied.join(', ')}`);
        } else {
          console.warn('[with-android-full-adhan] assets/sounds/adhan_full exists but contains no audio files');
        }
      } else {
        console.warn('[with-android-full-adhan] assets/sounds/adhan_full not found; service will fall back to bundled short adhan files');
      }

      console.log('[with-android-full-adhan] Wrote AdhanPlaybackService.kt, FullAdhanAlarmReceiver.kt, FullAdhanModule.kt, FullAdhanPackage.kt');
      return cfg;
    },
  ]);

  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const app = manifest.manifest?.application?.[0];
    if (!app) return cfg;

    ensurePermission(manifest, 'android.permission.FOREGROUND_SERVICE');
    ensurePermission(manifest, 'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK');
    ensurePermission(manifest, 'android.permission.WAKE_LOCK');
    // Phase 4: bypass DND للأذان (يحتاج موافقة المستخدم في إعدادات النظام)
    ensurePermission(manifest, 'android.permission.ACCESS_NOTIFICATION_POLICY');

    if (!app.service) app.service = [];

    const service = app.service.find((entry) => entry.$?.['android:name'] === SERVICE_CLASS);
    const attrs = {
      'android:name': SERVICE_CLASS,
      'android:exported': 'false',
      'android:foregroundServiceType': 'mediaPlayback',
    };

    if (service) {
      service.$ = { ...service.$, ...attrs };
    } else {
      app.service.push({ $: attrs });
    }

    // Register the AlarmManager BroadcastReceiver that wakes us at prayer time
    // and starts the AdhanPlaybackService — works even when the app is killed.
    if (!app.receiver) app.receiver = [];
    const receiverAttrs = {
      'android:name': RECEIVER_CLASS,
      'android:exported': 'false',
    };
    const existingReceiver = app.receiver.find(
      (entry) => entry.$?.['android:name'] === RECEIVER_CLASS,
    );
    if (existingReceiver) {
      existingReceiver.$ = { ...existingReceiver.$, ...receiverAttrs };
    } else {
      app.receiver.push({ $: receiverAttrs });
    }

    console.log('[with-android-full-adhan] Registered AdhanPlaybackService + FullAdhanAlarmReceiver');
    return cfg;
  });

  // Register FullAdhanPackage in MainApplication.kt so NativeModules.FullAdhanModule
  // is callable from JS. Idempotent — skips if already added.
  config = withMainApplication(config, (cfg) => {
    let src = cfg.modResults.contents;
    const importLine = `import ${PACKAGE_CLASS}`;
    if (!src.includes(importLine)) {
      // Insert the import after the last existing `import` line.
      const importRegex = /(^import [^\n]+\n)(?![\s\S]*^import )/m;
      if (importRegex.test(src)) {
        src = src.replace(importRegex, `$1${importLine}\n`);
      } else {
        // Fallback: prepend.
        src = `${importLine}\n${src}`;
      }
    }

    // Inject `add(FullAdhanPackage())` into the packages.apply { ... } block
    // produced by the Expo template, OR into a return statement of getPackages().
    const addLine = '            add(FullAdhanPackage())';
    if (!src.includes('FullAdhanPackage()')) {
      // Pattern 1a: Modern Expo template — `PackageList(this).packages.apply {`
      // Pattern 1b: Legacy variant — `val packages = PackageList(this).packages.apply {`
      const kotlinApply = /((?:val\s+packages\s*=\s*)?PackageList\(this\)\.packages\s*\.apply\s*\{)/;
      if (kotlinApply.test(src)) {
        src = src.replace(kotlinApply, `$1\n${addLine}`);
      } else {
        // Pattern 2: Generic — append to packages list before closing return.
        const returnPackages = /(return packages)/;
        if (returnPackages.test(src)) {
          src = src.replace(
            returnPackages,
            `packages.add(FullAdhanPackage())\n        $1`,
          );
        } else {
          console.warn(
            '[with-android-full-adhan] Could not auto-register FullAdhanPackage in MainApplication.kt — please add `packages.add(FullAdhanPackage())` manually.',
          );
        }
      }
    }

    cfg.modResults.contents = src;
    console.log('[with-android-full-adhan] Registered FullAdhanPackage in MainApplication.kt');
    return cfg;
  });

  return config;
}

module.exports = withAndroidFullAdhan;
