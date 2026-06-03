package com.rooh.almuslim.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;

import com.reactnativeandroidwidget.RNWidgetProvider;

/**
 * Keeps the native minute refresh chain alive for every placed prayer widget.
 * The chain is re-armed by PrayerWidgetRefreshReceiver after each fire and by
 * SystemEventsReceiver after boot, clock and timezone changes.
 */
public class PrayerAwareWidgetProvider extends RNWidgetProvider {
  @Override
  public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
    super.onUpdate(context, appWidgetManager, appWidgetIds);
    PrayerWidgetRefreshReceiver.Companion.scheduleMinuteFallback(context);
  }

  @Override
  public void onEnabled(Context context) {
    super.onEnabled(context);
    PrayerWidgetRefreshReceiver.Companion.scheduleMinuteFallback(context);
  }
}
