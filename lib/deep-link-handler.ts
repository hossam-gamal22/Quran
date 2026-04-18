// lib/deep-link-handler.ts
// Bridges iOS AppIntents (Control Center / Spotlight / Siri) to in-app navigation.
//
// Three entry points exist and are all needed for different lifecycle states:
//  1. consumePendingDeepLink(router) — reads App Group UserDefaults the intent
//     wrote before launching. Used for cold start and for warm starts where
//     AppState flips to 'active'.
//  2. subscribeToDeepLinks(router) — `Linking.addEventListener('url')`. Needed
//     for the foreground case: app already open, user pulls Spotlight, taps
//     a shortcut. AppState doesn't change (already 'active'), so (1) never
//     fires. Without this listener the tap would be silently dropped.
//  3. expo-router's built-in scheme resolution (from app.json:scheme) handles
//     the initial URL passed to the app process. We don't duplicate that here.
//
// URL-based 300 ms dedup: if the same URL arrives via both the Linking event
// and AppState→'active' within one event burst, we navigate once. The window
// is tight enough that a user tapping the same shortcut twice intentionally
// (>300 ms apart) still navigates both times.

import { Linking, NativeModules, Platform } from 'react-native';
import type { Router } from 'expo-router';
import { parseDeepLink } from '@/lib/deep-linking';

const DEDUP_WINDOW_MS = 300;
let lastHandledUrl: string | null = null;
let lastHandledAt = 0;

function shouldSkipDuplicate(url: string): boolean {
  const now = Date.now();
  if (url === lastHandledUrl && now - lastHandledAt < DEDUP_WINDOW_MS) {
    return true;
  }
  lastHandledUrl = url;
  lastHandledAt = now;
  return false;
}

function navigateToRoute(router: Router, route: string) {
  const [pathOnly, queryString] = route.split('?');
  const query = queryString ? `?${queryString}` : '';

  // Qibla is a sub-tab inside Prayer, not a standalone route. Redirect both the
  // legacy `/qibla` path and any explicit prayer+qibla combination to the
  // Prayer tab so its `?tab=qibla` handler selects the correct sub-tab.
  if (pathOnly === '/qibla' || pathOnly === '/(tabs)/qibla') {
    router.navigate(`/(tabs)/prayer?tab=qibla` as any);
    return;
  }

  // Use `navigate` everywhere: it's idempotent for tab routes and avoids
  // duplicate-push issues for stack routes if expo-router already navigated.
  const isTab =
    pathOnly.startsWith('/(tabs)/') ||
    pathOnly === '/prayer' ||
    pathOnly === '/tasbih' ||
    pathOnly === '/quran';
  const target = isTab && !pathOnly.startsWith('/(tabs)/') ? `/(tabs)${pathOnly}` : pathOnly;
  router.navigate(`${target}${query}` as any);
}

function handleUrl(router: Router, url: string) {
  if (shouldSkipDuplicate(url)) {
    if (__DEV__) console.log('🔗 Deep link deduped:', url);
    return;
  }
  const route = parseDeepLink(url);
  if (!route) return;
  if (__DEV__) console.log('🔗 Deep link →', url, '→', route);
  navigateToRoute(router, route);
}

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

    if (shouldSkipDuplicate(url)) {
      if (__DEV__) console.log('🔗 Pending deep link deduped:', url);
      return false;
    }

    const route = parseDeepLink(url);
    if (!route) return false;

    if (__DEV__) console.log('🔗 Consuming pending deep link:', url, '→', route);

    navigateToRoute(router, route);
    return true;
  } catch (e) {
    if (__DEV__) console.warn('Failed to consume pending deep link:', e);
    return false;
  }
}

/**
 * Subscribe to warm/foreground URL events. Required for the case where the
 * app is already in the foreground when the user taps a Spotlight shortcut —
 * AppState doesn't change, so `consumePendingDeepLink` is never invoked.
 *
 * Returns an unsubscribe function. Safe on all platforms.
 */
export function subscribeToDeepLinks(router: Router): () => void {
  const sub = Linking.addEventListener('url', ({ url }) => {
    if (!url) return;
    handleUrl(router, url);
  });
  return () => sub.remove();
}
