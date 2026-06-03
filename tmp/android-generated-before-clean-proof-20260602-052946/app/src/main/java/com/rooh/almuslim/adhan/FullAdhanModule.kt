package com.rooh.almuslim.adhan

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

  @ReactMethod
  fun cancelFullAdhanFrom(startRequestCode: Int, promise: Promise) {
    try {
      val ctx = reactApplicationContext
      val alarmManager = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      } else {
        PendingIntent.FLAG_UPDATE_CURRENT
      }
      val start = startRequestCode.coerceIn(0, MAX_REQUEST_CODES)
      for (i in start until MAX_REQUEST_CODES) {
        val intent = Intent(ctx, FullAdhanAlarmReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(ctx, REQUEST_CODE_BASE + i, intent, flags)
        alarmManager.cancel(pendingIntent)
        pendingIntent.cancel()
      }
      promise.resolve(true)
    } catch (e: Exception) {
      Log.e(TAG, "cancelFullAdhanFrom failed", e)
      promise.reject("ERR_CANCEL_ADHAN_FROM", e)
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
