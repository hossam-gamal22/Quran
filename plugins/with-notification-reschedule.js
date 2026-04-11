const {
  withDangerousMod,
  withAndroidManifest,
  withAppBuildGradle,
} = require('expo/config-plugins');
const { resolve, join } = require('path');
const { mkdirSync, writeFileSync, existsSync } = require('fs');

/**
 * Config plugin: Android WorkManager-based notification rescheduling.
 *
 * Problem:
 *   When the user force-stops the app (swipe from recents on many OEMs, or
 *   Settings → Force Stop), Android clears ALL pending AlarmManager entries.
 *   This means expo-notifications' DATE/DAILY/WEEKLY triggers stop firing.
 *
 * Solution:
 *   Register a WorkManager PeriodicWorkRequest (15 min) that calls
 *   expo-notifications' ExpoSchedulingDelegate.setupScheduledNotifications().
 *   WorkManager jobs are persisted in the system's internal database and
 *   survive force-stop — the system's JobScheduler picks them up later and
 *   re-creates all AlarmManager alarms from SharedPreferences storage.
 *
 * Files generated:
 *   - NotificationRescheduleWorker.kt  — Worker that reschedules notifications
 *   - NotificationRescheduleProvider.kt — ContentProvider that registers the
 *     WorkManager job on process start (before Application.onCreate)
 */

const PACKAGE_DIR = 'com/rooh/almuslim/notification';

// ─── Kotlin source files ────────────────────────────────────────────

const WORKER_KT = `package com.rooh.almuslim.notification

import android.app.PendingIntent
import android.content.Context
import android.util.Log
import androidx.core.app.NotificationManagerCompat
import androidx.work.Worker
import androidx.work.WorkerParameters
import expo.modules.notifications.notifications.interfaces.SchedulableNotificationTrigger
import expo.modules.notifications.notifications.model.Notification
import expo.modules.notifications.notifications.presentation.builders.ExpoNotificationBuilder
import expo.modules.notifications.service.delegates.ExpoSchedulingDelegate
import expo.modules.notifications.service.delegates.SharedPreferencesNotificationCategoriesStore
import expo.modules.notifications.service.delegates.SharedPreferencesNotificationsStore
import kotlinx.coroutines.runBlocking
import java.util.Date

/**
 * WorkManager Worker that:
 * 1. Fires any past-due DATE notifications missed while force-stopped (MIUI kills alarms)
 * 2. Re-creates all AlarmManager entries for future notifications
 *
 * Uses DIRECT presentation (ExpoNotificationBuilder + NotificationManagerCompat)
 * instead of NotificationsService.receive() broadcast chain, which MIUI drops.
 */
class NotificationRescheduleWorker(
    context: Context,
    params: WorkerParameters
) : Worker(context, params) {

    override fun doWork(): Result {
        return try {
            val ctx = applicationContext
            val store = SharedPreferencesNotificationsStore(ctx)
            val delegate = ExpoSchedulingDelegate(ctx)
            val allRequests = store.allNotificationRequests
            val now = Date()
            val maxAge = 24 * 60 * 60 * 1000L
            var firedCount = 0

            for (request in allRequests) {
                val trigger = request.trigger
                if (trigger is SchedulableNotificationTrigger) {
                    val nextDate = trigger.nextTriggerDate()
                    if (nextDate == null) {
                        try {
                            val triggerField = trigger.javaClass.getDeclaredField("timestamp")
                            triggerField.isAccessible = true
                            val timestamp = triggerField.getLong(trigger)
                            val age = now.time - timestamp
                            if (age in 0..maxAge) {
                                val notification = Notification(request)
                                val categoriesStore = SharedPreferencesNotificationCategoriesStore(ctx)
                                val builder = ExpoNotificationBuilder(ctx, notification, categoriesStore)
                                val androidNotification = runBlocking { builder.build() }

                                // Force heads-up display on ALL OEMs (MIUI, EMUI, ColorOS, OneUI)
                                val launchPendingIntent = PendingIntent.getActivity(
                                    ctx,
                                    request.identifier.hashCode(),
                                    ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)
                                        ?: android.content.Intent(),
                                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                                )
                                androidNotification.fullScreenIntent = launchPendingIntent
                                androidNotification.category = android.app.Notification.CATEGORY_ALARM

                                NotificationManagerCompat.from(ctx).notify(
                                    request.identifier,
                                    0,
                                    androidNotification
                                )
                                store.removeNotificationRequest(request.identifier)
                                firedCount++
                                Log.i(TAG, "Fired past-due notification: \${request.identifier} (missed by \${age / 1000}s)")
                            }
                        } catch (e: Exception) {
                            Log.w(TAG, "Could not fire past-due \${request.identifier}: \${e.message}")
                        }
                    }
                }
            }

            if (firedCount > 0) {
                Log.i(TAG, "Fired \$firedCount past-due notifications")
            }

            delegate.setupScheduledNotifications()
            Log.i(TAG, "Rescheduled all future notification alarms via WorkManager")
            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to reschedule notifications: \${e.message}")
            Result.retry()
        }
    }

    companion object {
        private const val TAG = "NotifReschedule"
    }
}
`;

const PROVIDER_KT = `package com.rooh.almuslim.notification

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

/**
 * Auto-initialising ContentProvider that registers the periodic WorkManager
 * job. Uses Handler.post to defer registration until after all ContentProviders
 * (including WorkManagerInitializer) have completed onCreate.
 */
class NotificationRescheduleProvider : ContentProvider() {

    override fun onCreate(): Boolean {
        val ctx = context?.applicationContext ?: return false
        // Defer to after all ContentProviders finish (WorkManagerInitializer runs as another provider)
        Handler(Looper.getMainLooper()).post {
            try {
                val workRequest = PeriodicWorkRequestBuilder<NotificationRescheduleWorker>(
                    15, TimeUnit.MINUTES
                ).build()

                WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(
                    WORK_NAME,
                    ExistingPeriodicWorkPolicy.UPDATE,
                    workRequest
                )
                Log.i(TAG, "WorkManager periodic notification reschedule registered")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to register WorkManager job: \${e.message}")
            }
        }
        return true
    }

    // Required no-op overrides
    override fun query(u: Uri, p: Array<out String>?, s: String?, sa: Array<out String>?, so: String?): Cursor? = null
    override fun getType(u: Uri): String? = null
    override fun insert(u: Uri, v: ContentValues?): Uri? = null
    override fun delete(u: Uri, s: String?, sa: Array<out String>?): Int = 0
    override fun update(u: Uri, v: ContentValues?, s: String?, sa: Array<out String>?): Int = 0

    companion object {
        private const val TAG = "NotifReschedule"
        private const val WORK_NAME = "expo_notification_reschedule"
    }
}
`;

const BOOT_RECEIVER_KT = `package com.rooh.almuslim.notification

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationManagerCompat
import expo.modules.notifications.notifications.interfaces.SchedulableNotificationTrigger
import expo.modules.notifications.notifications.model.Notification
import expo.modules.notifications.notifications.presentation.builders.ExpoNotificationBuilder
import expo.modules.notifications.service.delegates.ExpoSchedulingDelegate
import expo.modules.notifications.service.delegates.SharedPreferencesNotificationCategoriesStore
import expo.modules.notifications.service.delegates.SharedPreferencesNotificationsStore
import kotlinx.coroutines.runBlocking
import java.util.Date

/**
 * BroadcastReceiver that immediately reschedules all notification alarms
 * when the device finishes booting. Also fires any past-due notifications
 * that were missed during the reboot window (up to 24h old).
 *
 * Uses DIRECT presentation (ExpoNotificationBuilder + NotificationManagerCompat)
 * instead of NotificationsService.receive() broadcast chain, which MIUI drops.
 */
class BootCompletedReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED &&
            intent.action != "android.intent.action.QUICKBOOT_POWERON" &&
            intent.action != "com.htc.intent.action.QUICKBOOT_POWERON") {
            return
        }

        Log.i(TAG, "Device boot completed — restoring notification alarms")

        try {
            val ctx = context.applicationContext
            val store = SharedPreferencesNotificationsStore(ctx)
            val delegate = ExpoSchedulingDelegate(ctx)
            val allRequests = store.allNotificationRequests
            val now = Date()
            val maxAge = 24 * 60 * 60 * 1000L
            var firedCount = 0

            for (request in allRequests) {
                val trigger = request.trigger
                if (trigger is SchedulableNotificationTrigger) {
                    val nextDate = trigger.nextTriggerDate()
                    if (nextDate == null) {
                        try {
                            val triggerField = trigger.javaClass.getDeclaredField("timestamp")
                            triggerField.isAccessible = true
                            val timestamp = triggerField.getLong(trigger)
                            val age = now.time - timestamp
                            if (age in 0..maxAge) {
                                val notification = Notification(request)
                                val categoriesStore = SharedPreferencesNotificationCategoriesStore(ctx)
                                val builder = ExpoNotificationBuilder(ctx, notification, categoriesStore)
                                val androidNotification = runBlocking { builder.build() }

                                // Force heads-up display on ALL OEMs (MIUI, EMUI, ColorOS, OneUI)
                                val launchPendingIntent = PendingIntent.getActivity(
                                    ctx,
                                    request.identifier.hashCode(),
                                    ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)
                                        ?: android.content.Intent(),
                                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                                )
                                androidNotification.fullScreenIntent = launchPendingIntent
                                androidNotification.category = android.app.Notification.CATEGORY_ALARM

                                NotificationManagerCompat.from(ctx).notify(
                                    request.identifier,
                                    0,
                                    androidNotification
                                )
                                store.removeNotificationRequest(request.identifier)
                                firedCount++
                                Log.i(TAG, "Fired past-due notification after boot: \${request.identifier}")
                            }
                        } catch (e: Exception) {
                            Log.w(TAG, "Could not fire past-due \${request.identifier}: \${e.message}")
                        }
                    }
                }
            }

            if (firedCount > 0) {
                Log.i(TAG, "Fired \$firedCount past-due notifications after boot")
            }

            delegate.setupScheduledNotifications()
            Log.i(TAG, "Successfully restored all notification alarms after boot")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to restore notification alarms after boot: \${e.message}")
        }
    }

    companion object {
        private const val TAG = "BootReceiver"
    }
}
`;

// ─── Plugin implementation ──────────────────────────────────────────

function withNotificationReschedule(config) {
  // 1. Write Kotlin source files into android/app/src/main/java/…
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const srcDir = resolve(
        cfg.modRequest.projectRoot,
        'android/app/src/main/java',
        PACKAGE_DIR
      );
      mkdirSync(srcDir, { recursive: true });

      const workerPath = join(srcDir, 'NotificationRescheduleWorker.kt');
      const providerPath = join(srcDir, 'NotificationRescheduleProvider.kt');
      const bootReceiverPath = join(srcDir, 'BootCompletedReceiver.kt');

      writeFileSync(workerPath, WORKER_KT, 'utf-8');
      writeFileSync(providerPath, PROVIDER_KT, 'utf-8');
      writeFileSync(bootReceiverPath, BOOT_RECEIVER_KT, 'utf-8');

      console.log('[with-notification-reschedule] Wrote Kotlin source files (Worker, Provider, BootReceiver)');
      return cfg;
    },
  ]);

  // 2. Register ContentProvider + BootCompletedReceiver in AndroidManifest.xml
  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const app = manifest.manifest?.application?.[0];
    if (!app) return cfg;

    // Register ContentProvider
    if (!app.provider) app.provider = [];

    const authority = 'com.rooh.almuslim.notification.reschedule';
    const alreadyRegistered = app.provider.some(
      (p) => p.$?.['android:authorities'] === authority
    );

    if (!alreadyRegistered) {
      app.provider.push({
        $: {
          'android:name': 'com.rooh.almuslim.notification.NotificationRescheduleProvider',
          'android:authorities': authority,
          'android:exported': 'false',
        },
      });
      console.log('[with-notification-reschedule] Added ContentProvider to manifest');
    }

    // Register BootCompletedReceiver
    if (!app.receiver) app.receiver = [];

    const receiverName = 'com.rooh.almuslim.notification.BootCompletedReceiver';
    const receiverRegistered = app.receiver.some(
      (r) => r.$?.['android:name'] === receiverName
    );

    if (!receiverRegistered) {
      app.receiver.push({
        $: {
          'android:name': receiverName,
          'android:enabled': 'true',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
              { $: { 'android:name': 'android.intent.action.QUICKBOOT_POWERON' } },
              { $: { 'android:name': 'com.htc.intent.action.QUICKBOOT_POWERON' } },
            ],
          },
        ],
      });
      console.log('[with-notification-reschedule] Added BootCompletedReceiver to manifest');
    }

    return cfg;
  });

  // 3. Ensure WorkManager dependency in app/build.gradle
  config = withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes('work-runtime')) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /dependencies\s*\{/,
        `dependencies {\n    implementation "androidx.work:work-runtime-ktx:2.9.1"`
      );
      console.log('[with-notification-reschedule] Added WorkManager dependency');
    }
    return cfg;
  });

  return config;
}

module.exports = withNotificationReschedule;
