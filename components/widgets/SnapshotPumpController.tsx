// components/widgets/SnapshotPumpController.tsx
//
// Bridges SettingsContext + SubscriptionContext + AppState into the snapshot
// pump (lib/widgets/pump.ts). Mounted once inside the providers tree in
// app/_layout.tsx; renders nothing.
//
// Triggers a debounced pump:
//   - On Android WIDGET_ADDED after the app foregrounds.
//   - On app foreground (AppState 'active') when the data signature is fresh.
//
// Ordinary in-app widget setting changes are handled by updateWidgetData(),
// which writes shared data, regenerates the placed widget snapshots, and
// reloads native widgets in one foreground-priority path.
//
// Implements C5 (hash-based skip) + C8 (incremental, observable). The pump
// itself short-circuits if nothing changed.

import React from 'react';
import { Appearance, AppState, InteractionManager, type AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings } from '@/contexts/SettingsContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { setPumpContext, pumpThemesFromCurrentState } from '@/lib/widgets/pump';
import { resolveWidgetTheme, pruneSnapshotsToActiveState, RESOLVED_WIDGET_THEMES } from '@/lib/widgets/snapshot';
import { reloadWidgetsFromCache } from '@/lib/widget-data-bridge';
import { getLanguage } from '@/lib/i18n';
import type { SharedWidgetData } from '@/lib/widget-data';

/** Set by the Android task handler when WIDGET_ADDED fires (it can't pump from
 *  the headless context). The next foreground pump reads & clears this flag and
 *  forces a fresh run even when the hash matches. */
const PUMP_PENDING_KEY = '@widget_pump_pending';

/** Build a coarse "data signature" from the AsyncStorage shared widget data. */
async function readDataSignature(): Promise<{
  prayerSignature: string;
  verseSignature: string;
  dhikrSignature: string;
  azkarSignature: string;
  sharedData?: SharedWidgetData;
}> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const raw = await AsyncStorage.getItem('widget_shared_data');
    if (!raw) return { prayerSignature: '', verseSignature: '', dhikrSignature: '', azkarSignature: '' };
    const data = JSON.parse(raw) as SharedWidgetData;
    const prayerSig = `${data?.prayer?.nextPrayer ?? ''}-${data?.prayer?.nextPrayerAtEpochMs ?? data?.prayer?.nextPrayerTime ?? ''}-${Math.floor((data?.prayer?.timeRemainingMinutes ?? 0) / 5)}`;
    const verseSig = `${data?.verse?.surahName ?? ''}:${data?.verse?.numberInSurah ?? ''}`;
    const dhikrSig = `${data?.dhikr?.category ?? ''}:${data?.dhikr?.count ?? ''}`;
    const azkarSig = `${data?.azkar?.randomZikr?.id ?? ''}`;
    return {
      prayerSignature: prayerSig,
      verseSignature: verseSig,
      dhikrSignature: dhikrSig,
      azkarSignature: azkarSig,
      sharedData: data,
    };
  } catch {
    return { prayerSignature: '', verseSignature: '', dhikrSignature: '', azkarSignature: '' };
  }
}

/** Resolve the widget language the snapshot pump should bake in: explicit ar/en
 *  override wins; 'auto' (or unset) follows the app language. Mirrors the
 *  resolution in updateWidgetData so the foreground pump and the data bridge
 *  agree on the baked language. */
function resolveWidgetLang(widgetLanguage: string | undefined, appLang: string): 'ar' | 'en' {
  if (widgetLanguage === 'ar') return 'ar';
  if (widgetLanguage === 'en') return 'en';
  return appLang === 'ar' || appLang === 'ur' ? 'ar' : 'en';
}

export function SnapshotPumpController() {
  const { settings } = useSettings();
  const { isPremium } = useSubscription();
  const display = settings?.display ?? {};

  // Stable string of the inputs that drive the snapshot hash. Updating this
  // triggers the effect below.
  const stableKey = JSON.stringify({
    lang: getLanguage(),
    wlang: display.widgetLanguage,
    isPremium,
    theme: display.widgetTheme,
    numerals: display.widgetNumerals,
    cal: display.widgetCalendar,
    dc: display.widgetDayCalendar,
    mc: display.widgetMonthCalendar,
    fv: display.widgetFontVariant,
    df: display.widgetDateFormat,
  });

  /** Active-theme-first pump:
   *  1. Render the user's resolved theme synchronously (~5 s) so any placed
   *     widget can find its PNG immediately, then reload the OS widgets.
   *  2. After it resolves, do platform-specific background work:
   *     - iOS keeps every theme baked so the native "Edit Widget" picker can
   *       switch a widget's appearance while the app is closed.
   *     - Android (single-state) prunes any leftover other-theme / other-language
   *       artifacts so the on-disk footprint stays ~1×. */
  const runActiveThenBackgroundPump = React.useCallback(async (force: boolean) => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    const active = resolveWidgetTheme(display.widgetTheme, Appearance.getColorScheme());
    try {
      await pumpThemesFromCurrentState([active], { force, debounceMs: 0 });
      // After the active-theme PNG lands on disk, notify the OS to re-render
      // all placed widgets. Without this call the home-screen widget won't pick
      // up the fresh snapshot even though the file changed on disk.
      await reloadWidgetsFromCache();
    } catch {}
    InteractionManager.runAfterInteractions(() => {
      (async () => {
        try {
          if (Platform.OS === 'ios') {
            const rest = RESOLVED_WIDGET_THEMES.filter((t) => t !== active);
            if (rest.length > 0) await pumpThemesFromCurrentState(rest, { force, debounceMs: 0 });
          } else {
            await pruneSnapshotsToActiveState(active, resolveWidgetLang(display.widgetLanguage, getLanguage()));
          }
        } catch {}
      })();
    });
  }, [display]);

  // Pump on settings / premium change.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const sigs = await readDataSignature();
      if (cancelled) return;
      setPumpContext({
        language: resolveWidgetLang(display.widgetLanguage, getLanguage()),
        isPremium,
        display,
        ...sigs,
      });
      // Native widgets only — skip silently elsewhere.
      if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
      // Honor a pending flag set by Android WIDGET_ADDED (the headless task
      // handler can't mount SnapshotHost itself).
      let pending = false;
      try {
        const flag = await AsyncStorage.getItem(PUMP_PENDING_KEY);
        if (flag === 'true') {
          pending = true;
          await AsyncStorage.removeItem(PUMP_PENDING_KEY);
        }
      } catch {}
      if (pending) {
        runActiveThenBackgroundPump(true).catch(() => {});
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableKey]);

  // Pump on app foreground.
  React.useEffect(() => {
    const onChange = async (state: AppStateStatus) => {
      if (state !== 'active') return;
      const sigs = await readDataSignature();
      setPumpContext({
        language: resolveWidgetLang(display.widgetLanguage, getLanguage()),
        isPremium,
        display,
        ...sigs,
      });
      if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
      let pending = false;
      try {
        const flag = await AsyncStorage.getItem(PUMP_PENDING_KEY);
        if (flag === 'true') {
          pending = true;
          await AsyncStorage.removeItem(PUMP_PENDING_KEY);
        }
      } catch {}
      runActiveThenBackgroundPump(pending).catch(() => {});
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremium, stableKey, runActiveThenBackgroundPump]);

  return null;
}
