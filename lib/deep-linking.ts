// lib/deep-linking.ts
// Deep Linking configuration for widget → app navigation
// URL Scheme: rooh-almuslim://

import { Platform } from 'react-native';
import { t } from '@/lib/i18n';

// ========================================
// Constants
// ========================================

export const URL_SCHEME = 'rooh-almuslim';

/**
 * All registered deep link routes.
 * Widget taps use these to navigate directly to the target screen.
 */
export const DEEP_LINK_ROUTES = {
  // Widget deep links
  dailyAyah: `${URL_SCHEME}://daily-ayah`,
  hijri: `${URL_SCHEME}://hijri`,
  azkarMorning: `${URL_SCHEME}://azkar/1`,
  azkarEvening: `${URL_SCHEME}://azkar/1b`,
  azkarSleep: `${URL_SCHEME}://azkar/2`,
  azkarWakeup: `${URL_SCHEME}://azkar/3`,
  azkarAfterPrayer: `${URL_SCHEME}://azkar/27`,
  prayer: `${URL_SCHEME}://prayer`,
  // Qibla is not a standalone tab — it's a sub-tab inside Prayer.
  // Use query string so the Prayer screen selects the qibla view on mount.
  qibla: `${URL_SCHEME}://prayer?tab=qibla`,
  quran: `${URL_SCHEME}://quran`,
  quranBookmarks: `${URL_SCHEME}://quran-bookmarks`,
  moreAzkar: `${URL_SCHEME}://more-azkar`,

  // In-app navigation
  widgetsGallery: `${URL_SCHEME}://widgets-gallery`,
  widgetSettings: `${URL_SCHEME}://widget-settings`,
  tasbih: `${URL_SCHEME}://tasbih`,
  names: `${URL_SCHEME}://names`,
  ruqya: `${URL_SCHEME}://ruqya`,
} as const;

// ========================================
// Expo Router linking configuration
// ========================================

/**
 * Linking configuration for expo-router.
 * Expo Router auto-maps file paths to URLs, so `rooh-almuslim://daily-ayah`
 * resolves to `app/daily-ayah.tsx` automatically.
 *
 * Tab group `(tabs)` is transparent — routes inside it are accessible
 * directly without the group prefix.
 *
 * This config is passed to the root layout's <Stack> via the linking prop
 * or handled by expo-router's built-in scheme resolution from app.json.
 */
export const LINKING_CONFIG = {
  prefixes: [`${URL_SCHEME}://`],
  config: {
    screens: {
      '(tabs)': {
        screens: {
          prayer: 'prayer',
          tasbih: 'tasbih',
          quran: 'quran',
          'hijri-calendar': 'hijri-calendar',
        },
      },
      'daily-ayah': 'daily-ayah',
      hijri: 'hijri',
      'azkar/[category]': 'azkar/:category',
      'quran-bookmarks': 'quran-bookmarks',
      'more-azkar': 'more-azkar',
      'widget-settings': 'widget-settings',
      'widgets-gallery': 'widgets-gallery',
      names: 'names',
      ruqya: 'ruqya',
    },
  },
};

// ========================================
// Helpers
// ========================================

/**
 * Build a deep link URL for a given route path.
 */
export function buildDeepLink(path: string): string {
  // Strip leading slash
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${URL_SCHEME}://${cleanPath}`;
}

/**
 * Parse a deep link URL into a route path.
 * Preserves query string and hash so that downstream consumers
 * (e.g. screens reading `useLocalSearchParams`) receive their params.
 */
export function parseDeepLink(url: string): string | null {
  const prefix = `${URL_SCHEME}://`;
  if (!url.startsWith(prefix)) return null;
  return '/' + url.slice(prefix.length);
}

/**
 * Platform-specific instructions for adding a widget to the home screen.
 */
export function getAddWidgetInstructions(): string {
  if (Platform.OS === 'ios') {
    return [
      t('widgets.widgetStep1'),
      t('widgets.widgetStep2Ios'),
      t('widgets.widgetStep3'),
      t('widgets.widgetStep4Ios'),
      t('widgets.widgetStep5Ios'),
    ].join('\n');
  }
  return [
    t('widgets.widgetStep1'),
    t('widgets.widgetStep2Android'),
    t('widgets.widgetStep3'),
    t('widgets.widgetStep4Android'),
  ].join('\n');
}
