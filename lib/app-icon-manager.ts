// lib/app-icon-manager.ts
// Manages dynamic app icon switching based on active language
// NOTE: expo-dynamic-app-icon is only available in EAS dev/production builds, NOT Expo Go.
// Install it before building: pnpm add expo-dynamic-app-icon
// Then add the plugin config to app.json.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { isRTL, getLanguage } from '@/lib/i18n';
import type { Language } from '@/constants/translations';

const ICON_STORAGE_KEY = '@app_icon_variant';
const ICON_VERSION_KEY = '@app_icon_version';
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

/**
 * Check Firestore for app icon updates.
 * If a new version is detected and alerting is enabled,
 * show a native alert to the user.
 * Called once during app startup.
 */
export async function checkForIconUpdate(): Promise<void> {
  try {
    const snap = await getDoc(doc(db, 'appConfig', 'appIcons'));
    if (!snap.exists()) return;

    const data = snap.data() as {
      version: number;
      alertEnabled: boolean;
      alertTitle: string;
      alertMessage: string;
      alertTitleEn: string;
      alertMessageEn: string;
    };

    if (!data.alertEnabled || !data.version) return;

    // Compare with last acknowledged version
    const savedVersion = await AsyncStorage.getItem(ICON_VERSION_KEY);
    const lastVersion = savedVersion ? parseInt(savedVersion, 10) : 0;

    if (data.version <= lastVersion) return;

    // Determine language for alert text
    const lang = getLanguage();
    const useArabic = isRTL(lang as Language);
    const title = useArabic ? data.alertTitle : (data.alertTitleEn || data.alertTitle);
    const message = useArabic ? data.alertMessage : (data.alertMessageEn || data.alertMessage);

    Alert.alert(title, message, [
      {
        text: useArabic ? 'حسناً' : 'OK',
        onPress: async () => {
          await AsyncStorage.setItem(ICON_VERSION_KEY, String(data.version));
        },
      },
    ]);
  } catch (e) {
    if (__DEV__) console.log('📱 Icon update check failed:', e);
  }
}
