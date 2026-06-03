package com.rooh.almuslim.adhan

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
        nextPlayer.setOnPreparedListener {
          try {
            it.start()
            Log.i(TAG, "Started adhan playback (chain index=" + index + ") for " + soundKey)
          } catch (e: Exception) {
            Log.w(TAG, "Failed to start prepared adhan at chain index=" + index + " — trying next fallback", e)
            try { it.release() } catch (_: Exception) {}
            if (player === it) player = null
            tryPlayFromChain(chain, index + 1, soundKey)
          }
        }
        nextPlayer.setOnCompletionListener { stopSelfSafely() }
        nextPlayer.setOnErrorListener { _, what, extra ->
          Log.w(TAG, "MediaPlayer error at index=" + index + " what=" + what + " extra=" + extra + " — trying next fallback")
          try { nextPlayer.release() } catch (_: Exception) {}
          player = null
          tryPlayFromChain(chain, index + 1, soundKey)
          true
        }
        nextPlayer.prepareAsync()
      }
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
        val rawClass = Class.forName("$packageName.R\$raw")
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
