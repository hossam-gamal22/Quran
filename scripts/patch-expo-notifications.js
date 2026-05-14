/**
 * postinstall patch for expo-notifications on Android
 *
 * This script runs after every `pnpm install` and applies TWO critical patches
 * to ExpoSchedulingDelegate.kt in node_modules:
 *
 * Patch A — setAlarmClock():
 *   Replaces setExactAndAllowWhileIdle() with AlarmManager.setAlarmClock().
 *   Android treats setAlarmClock as a real user alarm — it bypasses Doze,
 *   MIUI battery restrictions, and all OEM power management, firing exactly
 *   on time. This is how Muslim Pro / Azkar / Nusk deliver their alarms.
 *
 * Patch B — Direct notification presentation:
 *   Replaces triggerNotification() to build and post the Android notification
 *   DIRECTLY via ExpoNotificationBuilder + NotificationManagerCompat, instead
 *   of going through the 3-broadcast chain:
 *     receive() → doWork() → sendBroadcast() → handleNotification() → present() → doWork() → sendBroadcast() → presentNotification()
 *   MIUI drops the second/third sendBroadcast() when the app is force-stopped,
 *   so the notification never appears. By presenting directly in the alarm's
 *   BroadcastReceiver thread (which is already a background thread via goAsync()),
 *   we bypass the entire issue.
 */
const { resolve } = require('path');
const { readFileSync, writeFileSync, existsSync } = require('fs');

const DELEGATE_PATH = resolve(
  __dirname,
  '../node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/service/delegates/ExpoSchedulingDelegate.kt'
);

function patch() {
  if (!existsSync(DELEGATE_PATH)) {
    console.warn('[patch-expo-notifications] ExpoSchedulingDelegate.kt not found — skipping');
    return;
  }

  let source = readFileSync(DELEGATE_PATH, 'utf-8');
  let patched = false;

  // ────────────────────────────────────────────────────────────────
  // Patch A: Add required imports
  // ────────────────────────────────────────────────────────────────
  const IMPORTS_TO_ADD = [
    { check: 'AlarmManager.AlarmClockInfo',    line: 'import android.app.AlarmManager.AlarmClockInfo' },
    { check: 'kotlinx.coroutines.runBlocking', line: 'import kotlinx.coroutines.runBlocking' },
    { check: 'NotificationManagerCompat',      line: 'import androidx.core.app.NotificationManagerCompat' },
    { check: 'ExpoNotificationBuilder',        line: 'import expo.modules.notifications.notifications.presentation.builders.ExpoNotificationBuilder' },
    { check: 'SharedPreferencesNotificationCategoriesStore', line: 'import expo.modules.notifications.service.delegates.SharedPreferencesNotificationCategoriesStore' },
    { check: 'java.util.Date',                 line: 'import java.util.Date' },
  ];

  for (const imp of IMPORTS_TO_ADD) {
    if (!source.includes(imp.check)) {
      // Insert after the last existing import line
      source = source.replace(
        'import java.io.InvalidClassException',
        `import java.io.InvalidClassException\n${imp.line}`
      );
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Patch A: Replace setupAlarm() with setAlarmClock version
  // ────────────────────────────────────────────────────────────────
  const OLD_SETUP_ALARM = `  private fun setupAlarm(triggerAtMillis: Long, operation: PendingIntent) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()) {
      AlarmManagerCompat.setExactAndAllowWhileIdle(
        alarmManager,
        AlarmManager.RTC_WAKEUP,
        triggerAtMillis,
        operation
      )
    } else {
      AlarmManagerCompat.setAndAllowWhileIdle(
        alarmManager,
        AlarmManager.RTC_WAKEUP,
        triggerAtMillis,
        operation
      )
    }
  }`;

  const NEW_SETUP_ALARM = `  private fun setupAlarm(triggerAtMillis: Long, operation: PendingIntent) {
    // Always try setAlarmClock first — bypasses Doze and ALL OEM battery
    // restrictions (MIUI, EMUI, ColorOS, OneUI). canScheduleExactAlarms()
    // falsely returns false on some MIUI builds despite USE_EXACT_ALARM.
    try {
      val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
      val showIntent = PendingIntent.getActivity(
        context,
        0,
        launchIntent ?: android.content.Intent(),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      val clockInfo = AlarmClockInfo(triggerAtMillis, showIntent)
      alarmManager.setAlarmClock(clockInfo, operation)
    } catch (e: SecurityException) {
      Log.w("expo-notifications", "setAlarmClock failed, falling back: \${e.message}")
      AlarmManagerCompat.setAndAllowWhileIdle(
        alarmManager,
        AlarmManager.RTC_WAKEUP,
        triggerAtMillis,
        operation
      )
    }
  }`;

  if (source.includes('setExactAndAllowWhileIdle')) {
    source = source.replace(OLD_SETUP_ALARM, NEW_SETUP_ALARM);
    console.log('[patch-expo-notifications] \u2705 Patch A: setupAlarm() \u2192 setAlarmClock() (no guard)');
    patched = true;
  } else if (source.includes('setAlarmClock')) {
    // Also update existing setAlarmClock patch to remove canScheduleExactAlarms guard
    if (source.includes('alarmManager.canScheduleExactAlarms()')) {
      const guardedPattern = /private fun setupAlarm[\s\S]*?^  \}/m;
      const newBody = NEW_SETUP_ALARM.slice(2); // trim leading whitespace
      source = source.replace(guardedPattern, newBody);
      console.log('[patch-expo-notifications] \u2705 Patch A: Removed canScheduleExactAlarms guard');
      patched = true;
    } else {
      console.log('[patch-expo-notifications] Patch A already applied (guardless) \u2014 skipping');
    }
  } else {
    console.warn('[patch-expo-notifications] ⚠️ Patch A: setupAlarm() signature not found');
  }

  // ────────────────────────────────────────────────────────────────
  // Patch B: Replace triggerNotification() with direct presentation
  // ────────────────────────────────────────────────────────────────
  const START_FULL_ADHAN_PLAYBACK = `      val contentData = notificationRequest.content.body
      val shouldPlayFullAdhan = contentData?.let {
        val notifType = it.optString("type")
        (notifType == "prayer" || notifType == "full_adhan") && it.optString("androidFullAdhan") == "true"
      } ?: false
      if (shouldPlayFullAdhan) {
        try {
          val serviceIntent = android.content.Intent().setClassName(
            context.packageName,
            "com.rooh.almuslim.adhan.AdhanPlaybackService"
          ).apply {
            action = "com.rooh.almuslim.adhan.PLAY"
            putExtra("soundType", contentData?.optString("soundType", "makkah") ?: "makkah")
            putExtra("prayerName", notificationRequest.content.title ?: contentData?.optString("prayer", "") ?: "")
          }
          androidx.core.content.ContextCompat.startForegroundService(context, serviceIntent)
          Log.i("expo-notifications", "Started full adhan playback service for: $identifier")
        } catch (adhanError: Exception) {
          Log.w("expo-notifications", "Could not start full adhan playback for $identifier: \${adhanError.message}")
        }
      }`;

  const OLD_TRIGGER = `  override fun triggerNotification(identifier: String) {
    try {
      val notificationRequest: NotificationRequest = store.getNotificationRequest(identifier)!!
      NotificationsService.receive(context, Notification(notificationRequest))
      NotificationsService.schedule(context, notificationRequest)
    } catch (e: ClassNotFoundException) {
      Log.e("expo-notifications", "An exception occurred while triggering notification " + identifier + ", removing. " + e.message)
      e.printStackTrace()
      NotificationsService.removeScheduledNotification(context, identifier)
    } catch (e: InvalidClassException) {
      Log.e("expo-notifications", "An exception occurred while triggering notification " + identifier + ", removing. " + e.message)
      e.printStackTrace()
      NotificationsService.removeScheduledNotification(context, identifier)
    } catch (e: NullPointerException) {
      Log.e("expo-notifications", "An exception occurred while triggering notification " + identifier + ", removing. " + e.message)
      e.printStackTrace()
      NotificationsService.removeScheduledNotification(context, identifier)
    }
  }`;

  const NEW_TRIGGER = `  override fun triggerNotification(identifier: String) {
    try {
      val notificationRequest: NotificationRequest = store.getNotificationRequest(identifier)!!
      val notification = Notification(notificationRequest)

${START_FULL_ADHAN_PLAYBACK}

      // DIRECT PRESENTATION: Build and post the Android notification immediately
      // without going through the multi-broadcast chain (receive → doWork →
      // sendBroadcast → handleNotification → present → doWork → sendBroadcast).
      // MIUI/EMUI drop the second sendBroadcast() when the app was force-stopped.
      // By presenting directly here (inside the alarm's BroadcastReceiver thread),
      // the notification is guaranteed to appear.
      try {
        val categoriesStore = SharedPreferencesNotificationCategoriesStore(context)
        val builder = ExpoNotificationBuilder(context, notification, categoriesStore)
        val androidNotification = runBlocking { builder.build() }

        // Force heads-up display on ALL OEMs (MIUI, EMUI, ColorOS, OneUI).
        // fullScreenIntent is a public mutable field on android.app.Notification.
        // Screen ON → heads-up popup. Screen OFF → wakes screen + heads-up.
        // This is how Muslim Pro, Athan, and Google Clock bypass OEM suppression.
        val launchPendingIntent = PendingIntent.getActivity(
          context,
          identifier.hashCode(),
          context.packageManager.getLaunchIntentForPackage(context.packageName)
            ?: android.content.Intent(),
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        androidNotification.fullScreenIntent = launchPendingIntent
        androidNotification.category = android.app.Notification.CATEGORY_ALARM

        NotificationManagerCompat.from(context).notify(
          notificationRequest.identifier,
          0,
          androidNotification
        )
        Log.i("expo-notifications", "Direct-presented notification with fullScreenIntent: $identifier")
      } catch (presentError: Exception) {
        // Fallback: try the original broadcast chain as last resort
        Log.w("expo-notifications", "Direct presentation failed for $identifier, falling back to broadcast: \${presentError.message}")
        NotificationsService.receive(context, notification)
      }

      // Reschedule for next occurrence (for repeating triggers)
      // Call scheduleNotification directly instead of NotificationsService.schedule()
      // to avoid another broadcast dispatch
      try {
        scheduleNotification(notificationRequest)
      } catch (scheduleError: Exception) {
        Log.w("expo-notifications", "Could not reschedule $identifier: \${scheduleError.message}")
      }
    } catch (e: ClassNotFoundException) {
      Log.e("expo-notifications", "An exception occurred while triggering notification " + identifier + ", removing. " + e.message)
      e.printStackTrace()
      store.removeNotificationRequest(identifier)
    } catch (e: InvalidClassException) {
      Log.e("expo-notifications", "An exception occurred while triggering notification " + identifier + ", removing. " + e.message)
      e.printStackTrace()
      store.removeNotificationRequest(identifier)
    } catch (e: NullPointerException) {
      Log.e("expo-notifications", "An exception occurred while triggering notification " + identifier + ", removing. " + e.message)
      e.printStackTrace()
      store.removeNotificationRequest(identifier)
    }
  }`;

  if (source.includes('NotificationsService.receive(context, Notification(notificationRequest))') &&
      source.includes('NotificationsService.schedule(context, notificationRequest)')) {
    source = source.replace(OLD_TRIGGER, NEW_TRIGGER);
    console.log('[patch-expo-notifications] ✅ Patch B: triggerNotification() → direct presentation');
    patched = true;
  } else if (source.includes('Direct-presented notification')) {
    // Also update existing patch to add fullScreenIntent if missing
    if (!source.includes('fullScreenIntent')) {
      source = source.replace(
        /val androidNotification = runBlocking \{ builder\.build\(\) \}\s*NotificationManagerCompat\.from\(context\)\.notify\(/,
        `val androidNotification = runBlocking { builder.build() }

        val launchPendingIntent = PendingIntent.getActivity(
          context,
          identifier.hashCode(),
          context.packageManager.getLaunchIntentForPackage(context.packageName)
            ?: android.content.Intent(),
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        androidNotification.fullScreenIntent = launchPendingIntent
        androidNotification.category = android.app.Notification.CATEGORY_ALARM

        NotificationManagerCompat.from(context).notify(`
      );
      console.log('[patch-expo-notifications] \u2705 Patch B: Added fullScreenIntent to existing patch');
      patched = true;
    } else {
      console.log('[patch-expo-notifications] Patch B already applied with fullScreenIntent \u2014 skipping');
    }
  } else {
    console.warn('[patch-expo-notifications] ⚠️ Patch B: triggerNotification() signature not found');
  }

  if (source.includes('Direct-presented notification') &&
      !source.includes('AdhanPlaybackService')) {
    source = source.replace(
      '      val notification = Notification(notificationRequest)\\n\\n      // DIRECT PRESENTATION:',
      `      val notification = Notification(notificationRequest)\\n\\n${START_FULL_ADHAN_PLAYBACK}\\n\\n      // DIRECT PRESENTATION:`
    );
    console.log('[patch-expo-notifications] ✅ Patch C: full adhan foreground playback');
    patched = true;
  } else if (source.includes('AdhanPlaybackService')) {
    console.log('[patch-expo-notifications] Patch C already applied — skipping');
  }

  if (patched) {
    writeFileSync(DELEGATE_PATH, source, 'utf-8');
    console.log('[patch-expo-notifications] ✅ All patches written to ExpoSchedulingDelegate.kt');
  }
}

patch();
