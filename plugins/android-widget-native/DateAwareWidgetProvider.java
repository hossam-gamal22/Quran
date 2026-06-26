package com.rooh.almuslim.widget;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.reactnativeandroidwidget.RNWidgetProvider;

import java.util.Calendar;

/**
 * Base class for date-keyed widgets (day / month / hijri, home-screen + keyguard).
 * They render live from the JS task (LiveDateWidget reads new Date()), so the
 * displayed day/month would otherwise only roll over on the 30-min
 * updatePeriodMillis tick. This arms a self-contained exact alarm at the next
 * local midnight that re-broadcasts APPWIDGET_UPDATE to THIS provider, so the
 * date flips right at midnight even while the app is closed — fully offline
 * (pure-math Hijri in LiveDateWidget, no network). The alarm re-arms on every
 * onUpdate (so each midnight fire schedules the following one) and
 * SystemEventsReceiver re-broadcasts after boot / clock / timezone changes.
 *
 * Mirrors the AlarmManager pattern in PrayerWidgetRefreshReceiver.scheduleTransition
 * and the self-targeted ACTION_APPWIDGET_UPDATE broadcast in its broadcastUpdates;
 * kept self-contained (one PendingIntent per provider class, keyed by class name)
 * so no shared DATE_PROVIDERS registry is needed.
 */
public class DateAwareWidgetProvider extends RNWidgetProvider {
  private static final String TAG = "DateAwareWidget";

  @Override
  public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
    super.onUpdate(context, appWidgetManager, appWidgetIds);
    scheduleMidnightRefresh(context);
  }

  @Override
  public void onEnabled(Context context) {
    super.onEnabled(context);
    scheduleMidnightRefresh(context);
  }

  private void scheduleMidnightRefresh(Context context) {
    Context appContext = context.getApplicationContext();
    try {
      AppWidgetManager manager = AppWidgetManager.getInstance(appContext);
      ComponentName component = new ComponentName(appContext, getClass());
      int[] ids = manager.getAppWidgetIds(component);
      if (ids == null || ids.length == 0) return;

      Calendar midnight = Calendar.getInstance();
      midnight.add(Calendar.DAY_OF_YEAR, 1);
      midnight.set(Calendar.HOUR_OF_DAY, 0);
      midnight.set(Calendar.MINUTE, 0);
      midnight.set(Calendar.SECOND, 5);
      midnight.set(Calendar.MILLISECOND, 0);
      long triggerAtMs = midnight.getTimeInMillis();

      Intent intent = new Intent(appContext, getClass());
      intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
      intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
      int requestCode = getClass().getName().hashCode();
      PendingIntent pendingIntent = PendingIntent.getBroadcast(
        appContext,
        requestCode,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
      );

      AlarmManager alarmManager = (AlarmManager) appContext.getSystemService(Context.ALARM_SERVICE);
      if (alarmManager == null) return;
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent);
      } else {
        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent);
      }
      Log.i(TAG, "Scheduled midnight refresh for " + getClass().getSimpleName() + " at=" + triggerAtMs);
    } catch (Exception e) {
      Log.e(TAG, "Failed to schedule midnight refresh", e);
    }
  }
}
