// lib/paywall-trigger.ts
// منطق عرض البايوول التلقائي بناءً على إعدادات الأدمن

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SubscriptionConfig } from '@/lib/subscription-manager';

const PAYWALL_OPENS_KEY = '@paywall_app_opens';
const PAYWALL_LAST_SHOWN_KEY = '@paywall_last_shown';

/**
 * Increment app-open counter for paywall frequency tracking.
 * Returns the new count.
 */
export async function incrementPaywallOpenCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(PAYWALL_OPENS_KEY);
    const count = (raw ? parseInt(raw, 10) : 0) + 1;
    await AsyncStorage.setItem(PAYWALL_OPENS_KEY, String(count));
    return count;
  } catch {
    return 0;
  }
}

/**
 * Determines whether the paywall should be auto-presented.
 * Rules:
 *  1. config.enabled must be true
 *  2. config.showPaywallOnLaunch must be true
 *  3. User must NOT be premium
 *  4. Current open count must be a multiple of config.paywallFrequency
 *  5. At least 60s since last auto-display (prevent rapid re-shows)
 */
export async function shouldShowPaywall(
  config: SubscriptionConfig,
  isPremium: boolean,
): Promise<boolean> {
  if (!config.enabled || !config.showPaywallOnLaunch || isPremium) return false;

  const frequency = config.paywallFrequency || 5;
  try {
    const raw = await AsyncStorage.getItem(PAYWALL_OPENS_KEY);
    const count = raw ? parseInt(raw, 10) : 0;
    if (count <= 0 || count % frequency !== 0) return false;

    // Throttle: at least 60s between auto-displays
    const lastShown = await AsyncStorage.getItem(PAYWALL_LAST_SHOWN_KEY);
    if (lastShown) {
      const elapsed = Date.now() - parseInt(lastShown, 10);
      if (elapsed < 60_000) return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Record that the paywall was just auto-shown (for throttle).
 */
export async function markPaywallShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(PAYWALL_LAST_SHOWN_KEY, String(Date.now()));
  } catch {}
}

/**
 * Reset counter (e.g. after a successful purchase).
 */
export async function resetPaywallCounter(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([PAYWALL_OPENS_KEY, PAYWALL_LAST_SHOWN_KEY]);
  } catch {}
}
