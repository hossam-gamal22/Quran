// lib/app-icon-manager.ts
// Manages dynamic app icon switching based on active language
// NOTE: expo-dynamic-app-icon is only available in EAS dev/production builds, NOT Expo Go.
// Install it before building: pnpm add expo-dynamic-app-icon
// Then add the plugin config to app.json.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isRTL } from '@/lib/i18n';
import type { Language } from '@/constants/translations';

const ICON_STORAGE_KEY = '@app_icon_variant';
const ENGLISH_ICON = 'AppIconEnglish';
const DEFAULT_ICON = 'DEFAULT'; // Arabic (primary icon)

/**
 * Switch the device home screen app icon based on the active language.
 * Arabic/RTL → default (Arabic) icon
 * All other languages → English icon
 * 
 * Only triggers the native switch if the icon variant actually changed,
 * to avoid unnecessary iOS "App icon changed" system dialogs.
 * 
 * This is a no-op in Expo Go since the native module isn't available.
 */
export async function switchAppIcon(language: Language): Promise<void> {
  try {
    const targetIcon = isRTL(language) ? DEFAULT_ICON : ENGLISH_ICON;
    const currentIcon = await AsyncStorage.getItem(ICON_STORAGE_KEY);

    // Skip if already set to the correct icon
    if (currentIcon === targetIcon) return;

    // Dynamically load - only works in EAS builds, not Expo Go
    let setAppIcon: ((name: string) => string | false) | undefined;
    let getAppIcon: (() => string) | undefined;
    try {
      const mod = require('expo-dynamic-app-icon');
      setAppIcon = mod.setAppIcon;
      getAppIcon = mod.getAppIcon;
    } catch {
      if (__DEV__) console.log('📱 expo-dynamic-app-icon not available (Expo Go) — skipping icon switch');
      return;
    }

    if (!setAppIcon || !getAppIcon) return;

    // Double-check against native state
    const nativeIcon = getAppIcon();
    if (nativeIcon === targetIcon) {
      await AsyncStorage.setItem(ICON_STORAGE_KEY, targetIcon);
      return;
    }

    const result = setAppIcon(targetIcon === DEFAULT_ICON ? 'DEFAULT' : targetIcon);
    if (result !== false) {
      await AsyncStorage.setItem(ICON_STORAGE_KEY, targetIcon);
      if (__DEV__) console.log(`📱 App icon switched to: ${targetIcon}`);
    }
  } catch (e) {
    if (__DEV__) console.log('📱 App icon switch failed:', e);
  }
}

/**
 * Sync the app icon on startup to match the saved language.
 * Called once during app initialization.
 */
export async function syncAppIconOnStartup(language: Language): Promise<void> {
  await switchAppIcon(language);
}
