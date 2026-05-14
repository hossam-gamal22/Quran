const { withDangerousMod } = require('expo/config-plugins');
const { resolve, join } = require('path');
const { readFileSync, writeFileSync, existsSync, rmSync } = require('fs');

/**
 * Config plugin: Patch expo-notifications ExpoSchedulingDelegate.kt
 *
 * Patch A — setAlarmClock():
 *   Replaces setExactAndAllowWhileIdle() with AlarmManager.setAlarmClock().
 *   Android treats setAlarmClock as a real user alarm — it bypasses Doze,
 *   OEM restrictions (MIUI, EMUI, ColorOS), Battery Saver, and Autostart.
 *   This is how Muslim Pro / Azkar / Nusk deliver their alarms.
 *
 * Patch B — Direct notification presentation:
 *   Replaces triggerNotification() to build and post the Android notification
 *   DIRECTLY using ExpoNotificationBuilder + NotificationManagerCompat,
 *   bypassing the 3-broadcast chain (receive → handleNotification → present)
 *   that MIUI drops when the app is force-stopped.
 *
 * Side effects:
 *   - Android shows an alarm-clock icon in the status bar (desirable for prayer app)
 *   - Requires SCHEDULE_EXACT_ALARM (already declared in app.json)
 */

function withAlarmClockScheduling(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const delegatePath = resolve(
        cfg.modRequest.projectRoot,
        'node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/service/delegates/ExpoSchedulingDelegate.kt'
      );

      if (!existsSync(delegatePath)) {
        console.warn('[with-alarm-clock-scheduling] ExpoSchedulingDelegate.kt not found — skipping');
        return cfg;
      }

      let source = readFileSync(delegatePath, 'utf-8');

      // ── 1. Add missing imports ────────────────────────────────────
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
          source = source.replace(
            'import java.io.InvalidClassException',
            `import java.io.InvalidClassException\n${imp.line}`
          );
        }
      }

      // ── 2. Patch A: Replace setupAlarm() with setAlarmClock ───────
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
        console.log('[with-alarm-clock-scheduling] \u2705 Patch A: setupAlarm() \u2192 setAlarmClock() (no guard)');
      } else if (source.includes('setAlarmClock')) {
        if (source.includes('alarmManager.canScheduleExactAlarms()')) {
          const guardedPattern = /private fun setupAlarm[\s\S]*?^  \}/m;
          const newBody = NEW_SETUP_ALARM.slice(2);
          source = source.replace(guardedPattern, newBody);
          console.log('[with-alarm-clock-scheduling] \u2705 Patch A: Removed canScheduleExactAlarms guard');
        } else {
          console.log('[with-alarm-clock-scheduling] Patch A already applied (guardless)');
        }
      } else {
        console.warn('[with-alarm-clock-scheduling] ⚠️ Patch A: setupAlarm() not found');
      }

      // ── 3. Patch B: Replace triggerNotification() with direct presentation
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
      try {
        val categoriesStore = SharedPreferencesNotificationCategoriesStore(context)
        val builder = ExpoNotificationBuilder(context, notification, categoriesStore)
        val androidNotification = runBlocking { builder.build() }

        // Force heads-up display on ALL OEMs (MIUI, EMUI, ColorOS, OneUI).
        // fullScreenIntent is a public mutable field on android.app.Notification.
        // Screen ON → heads-up popup. Screen OFF → wakes screen + heads-up.
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
        Log.w("expo-notifications", "Direct presentation failed for $identifier, falling back to broadcast: \${presentError.message}")
        NotificationsService.receive(context, notification)
      }

      // Reschedule directly (no broadcast)
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
        console.log('[with-alarm-clock-scheduling] ✅ Patch B: triggerNotification() → direct presentation');
      } else if (source.includes('Direct-presented notification')) {
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
          console.log('[with-alarm-clock-scheduling] \u2705 Patch B: Added fullScreenIntent to existing patch');
        } else {
          console.log('[with-alarm-clock-scheduling] Patch B already applied with fullScreenIntent');
        }
      } else {
        console.warn('[with-alarm-clock-scheduling] ⚠️ Patch B: triggerNotification() not found');
      }

      if (source.includes('Direct-presented notification') &&
          !source.includes('AdhanPlaybackService')) {
        source = source.replace(
          '      val notification = Notification(notificationRequest)\\n\\n      // DIRECT PRESENTATION:',
          `      val notification = Notification(notificationRequest)\\n\\n${START_FULL_ADHAN_PLAYBACK}\\n\\n      // DIRECT PRESENTATION:`
        );
        console.log('[with-alarm-clock-scheduling] ✅ Patch C: full adhan foreground playback');
      } else if (source.includes('AdhanPlaybackService')) {
        console.log('[with-alarm-clock-scheduling] Patch C already applied');
      }

      writeFileSync(delegatePath, source, 'utf-8');

      // ── 4. CRITICAL: Remove prebuilt AAR to force source compilation ──
      // expo-notifications ships a prebuilt AAR in local-maven-repo/.
      // The expo-module-gradle-plugin uses it instead of compiling from
      // source, which means our Kotlin patches above get IGNORED.
      // Deleting the AAR forces Gradle to compile from the patched source.
      const notifRoot = resolve(
        cfg.modRequest.projectRoot,
        'node_modules/expo-notifications'
      );
      const localMavenRepo = join(notifRoot, 'local-maven-repo');
      if (existsSync(localMavenRepo)) {
        rmSync(localMavenRepo, { recursive: true, force: true });
        console.log('[with-alarm-clock-scheduling] ✅ Removed prebuilt AAR (local-maven-repo/)');
      }

      // Also strip the publication config from expo-module.config.json
      // so the autolinking system doesn't try to resolve the (now-deleted) AAR.
      const moduleConfigPath = join(notifRoot, 'expo-module.config.json');
      if (existsSync(moduleConfigPath)) {
        try {
          const moduleConfig = JSON.parse(readFileSync(moduleConfigPath, 'utf-8'));
          if (moduleConfig.android && moduleConfig.android.publication) {
            delete moduleConfig.android.publication;
            writeFileSync(moduleConfigPath, JSON.stringify(moduleConfig, null, 2) + '\n', 'utf-8');
            console.log('[with-alarm-clock-scheduling] ✅ Removed publication config from expo-module.config.json');
          }
        } catch (e) {
          console.warn('[with-alarm-clock-scheduling] ⚠️ Could not update expo-module.config.json:', e.message);
        }
      }

      return cfg;
    },
  ]);
}

module.exports = withAlarmClockScheduling;
