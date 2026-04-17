// lib/deep-link-handler.ts
// Reads a pending deep link written by iOS AppIntents (Control Center / Spotlight)
// to App Group UserDefaults and navigates accordingly.

import { NativeModules, Platform } from 'react-native';
import type { Router } from 'expo-router';
import { parseDeepLink } from '@/lib/deep-linking';

/**
 * Read a pending deep link from App Group UserDefaults (written by an AppIntent),
 * clear it, and navigate to the target route.
 *
 * Safe to call on Android (no-ops) and when the native module is unavailable.
 */
export async function consumePendingDeepLink(router: Router): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;

  try {
    const { WidgetReloadModule } = NativeModules;
    if (!WidgetReloadModule?.readPendingDeepLink) return false;

    const url: string | null = await WidgetReloadModule.readPendingDeepLink();
    if (!url) return false;

    const route = parseDeepLink(url);
    if (!route) return false;

    if (__DEV__) console.log('🔗 Consuming pending deep link:', url, '→', route);

    // Small delay to ensure navigation container is fully mounted
    setTimeout(() => {
      // Tab routes: use navigate() so it doesn't push a duplicate
      if (
        route.startsWith('/(tabs)/') ||
        route === '/prayer' ||
        route === '/tasbih' ||
        route === '/qibla' ||
        route === '/quran'
      ) {
        const tabRoute = route.startsWith('/(tabs)/') ? route : `/(tabs)${route}`;
        router.navigate(tabRoute as any);
      } else {
        router.push(route as any);
      }
    }, 500);

    return true;
  } catch (e) {
    if (__DEV__) console.warn('Failed to consume pending deep link:', e);
    return false;
  }
}
