// lib/app-icon-manager.ts
// Manages dynamic app icon switching based on active language and Islamic season.
// NOTE: expo-dynamic-app-icon is only available in EAS dev/production builds, NOT Expo Go.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import Constants from 'expo-constants';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { isRTL, getLanguage } from '@/lib/i18n';
import type { Language } from '@/constants/translations';
import type { SeasonType } from '@/lib/seasonal-content';

// True when running inside Expo Go (no compiled native modules).
// SDK 54: `Constants.appOwnership` is deprecated and may be null even in Expo Go,
// so we also check `executionEnvironment === 'storeClient'` (the modern signal).
const IS_EXPO_GO =
  Constants.appOwnership === 'expo' ||
  (Constants as any).executionEnvironment === 'storeClient';

const ICON_STORAGE_KEY = '@app_icon_variant';
const ICON_VERSION_KEY = '@app_icon_version';
const ENGLISH_ICON = 'app_icon_english';

// ─── Types ──────────────────────────────────────────────

export type SeasonalIconKey =
  | 'default_ar'
  | 'default_en'
  | 'ramadan'
  | 'hajj'
  | 'mawlid'
  | 'eid_fitr'
  | 'eid_adha'
  | 'dhul_hijjah';

export type IconMode = 'auto' | 'manual' | 'language_only';

export type LocalizedText = Partial<Record<Language, string>>;

export interface AppIconsConfig {
  version: number;
  alertEnabled: boolean;
  // Legacy AR/EN fields (kept for backward compat).
  alertTitle: string;
  alertMessage: string;
  alertTitleEn: string;
  alertMessageEn: string;
  // New per-language maps (override legacy when present).
  alertTitleI18n?: LocalizedText;
  alertMessageI18n?: LocalizedText;
  // Seasonal icon control.
  mode?: IconMode;
  manualIcon?: SeasonalIconKey | null;
  seasonalMap?: Partial<Record<Exclude<SeasonType, 'none'>, SeasonalIconKey>>;
  enabledSeasons?: Exclude<SeasonType, 'none'>[];
  updatedAt?: string;
}

// ─── Defaults ───────────────────────────────────────────

export const DEFAULT_SEASONAL_MAP: Record<Exclude<SeasonType, 'none'>, SeasonalIconKey> = {
  ramadan: 'ramadan',
  hajj: 'hajj',
  mawlid: 'mawlid',
  eid_fitr: 'eid_fitr',
  eid_adha: 'eid_adha',
  dhul_hijjah: 'dhul_hijjah',
  // Months without dedicated icons fall back to language default.
  ashura: 'default_ar',
  muharram: 'default_ar',
  rajab: 'default_ar',
  shaban: 'default_ar',
};

export const DEFAULT_ENABLED_SEASONS: Exclude<SeasonType, 'none'>[] = [
  'ramadan',
  'hajj',
  'mawlid',
  'eid_fitr',
  'eid_adha',
  'dhul_hijjah',
];

// Priority order for overlapping seasons (most specific event wins).
const SEASON_PRIORITY: Exclude<SeasonType, 'none'>[] = [
  'eid_fitr',
  'eid_adha',
  'mawlid',
  'ashura',
  'ramadan',
  'hajj',
  'dhul_hijjah',
  'muharram',
  'rajab',
  'shaban',
];

// ─── Native module loader (graceful fallback in Expo Go) ──

interface DynamicIconModule {
  setAppIcon?: (name: string | null) => string | false;
  getAppIcon?: () => string;
}

// Probe the underlying native module via expo-modules-core BEFORE requiring the
// JS wrapper. `requireOptionalNativeModule` returns null without throwing or
// logging to LogBox when the native module isn't linked — which is exactly the
// case in Expo Go and any build where the config plugin isn't compiled in.
let nativeIconModuleAvailable: boolean | null = null;
function isNativeIconModuleAvailable(): boolean {
  if (nativeIconModuleAvailable !== null) return nativeIconModuleAvailable;
  try {
    // Dynamic require to avoid pulling expo-modules-core into web bundles.
    const core = require('expo-modules-core');
    const probe = core?.requireOptionalNativeModule?.('ExpoDynamicAppIcon');
    nativeIconModuleAvailable = !!probe;
  } catch {
    nativeIconModuleAvailable = false;
  }
  return nativeIconModuleAvailable;
}

function loadIconModule(): DynamicIconModule | null {
  if (IS_EXPO_GO) return null;
  // Only require the wrapper package if the native module is actually present.
  // Otherwise the wrapper's top-level requireNativeModule() call would log an
  // Uncaught Error to LogBox before our try/catch can intercept it.
  if (!isNativeIconModuleAvailable()) return null;
  try {
    const mod = require('expo-dynamic-app-icon') as DynamicIconModule;
    if (!mod || typeof mod.setAppIcon !== 'function' || typeof mod.getAppIcon !== 'function') {
      return null;
    }
    return mod;
  } catch {
    if (__DEV__) console.log('📱 expo-dynamic-app-icon not available — skipping');
    return null;
  }
}

/**
 * Translate our internal seasonal key into the native icon identifier
 * registered in app.json plugins (expo-dynamic-app-icon).
 */
function toNativeIconName(key: SeasonalIconKey): string | null {
  switch (key) {
    case 'default_ar':
      return null; // null restores the primary bundled icon
    case 'default_en':
      return ENGLISH_ICON;
    default:
      return key; // ramadan / hajj / mawlid / eid_* / dhul_hijjah
  }
}

/**
 * Resolve which icon should be active given current config, season, and language.
 * Priority: manual override → seasonal auto → language default.
 */
export function resolveActiveIcon(
  config: AppIconsConfig | null,
  currentSeason: SeasonType | null,
  language: Language
): SeasonalIconKey {
  const mode: IconMode = config?.mode ?? 'auto';
  const langDefault: SeasonalIconKey = isRTL(language) ? 'default_ar' : 'default_en';

  if (mode === 'language_only') return langDefault;

  if (mode === 'manual' && config?.manualIcon) {
    return config.manualIcon;
  }

  // Auto mode: use season if active and enabled.
  if (mode === 'auto' && currentSeason && currentSeason !== 'none') {
    const enabled = config?.enabledSeasons ?? DEFAULT_ENABLED_SEASONS;
    if (enabled.includes(currentSeason as Exclude<SeasonType, 'none'>)) {
      const map = { ...DEFAULT_SEASONAL_MAP, ...(config?.seasonalMap ?? {}) };
      const mapped = map[currentSeason as Exclude<SeasonType, 'none'>];
      if (mapped && mapped !== 'default_ar' && mapped !== 'default_en') {
        return mapped;
      }
    }
  }

  return langDefault;
}

/** Choose the highest-priority active season when multiple overlap. */
export function pickPrioritySeason(activeSeasons: SeasonType[]): SeasonType | null {
  for (const candidate of SEASON_PRIORITY) {
    if (activeSeasons.includes(candidate)) return candidate;
  }
  return null;
}

/**
 * Apply a seasonal icon. Skips the native call (and the iOS system dialog)
 * if the desired icon is already active.
 */
export async function setSeasonalIcon(key: SeasonalIconKey): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(ICON_STORAGE_KEY);
    if (stored === key) return; // nothing to do

    const mod = loadIconModule();
    if (!mod?.setAppIcon || !mod.getAppIcon) return;

    const nativeName = toNativeIconName(key);

    let nativeCurrent: string | undefined;
    try {
      nativeCurrent = mod.getAppIcon();
    } catch (e) {
      if (__DEV__) console.log('📱 getAppIcon failed (native module missing):', e);
      return;
    }

    const expectedNative = nativeName ?? 'DEFAULT';
    if (nativeCurrent === expectedNative) {
      await AsyncStorage.setItem(ICON_STORAGE_KEY, key);
      return;
    }

    let result: string | false;
    try {
      result = mod.setAppIcon(nativeName);
    } catch (e) {
      if (__DEV__) console.log('📱 setAppIcon failed (native module missing):', e);
      return;
    }

    if (result !== false) {
      await AsyncStorage.setItem(ICON_STORAGE_KEY, key);
      if (__DEV__) console.log(`📱 App icon switched to: ${key}`);
    }
  } catch (e) {
    if (__DEV__) console.log('📱 setSeasonalIcon failed:', e);
  }
}

/**
 * Legacy: switch icon based purely on language. Still used by SettingsContext
 * when the user changes language. Internally now delegates to setSeasonalIcon.
 */
export async function switchAppIcon(language: Language): Promise<void> {
  const target: SeasonalIconKey = isRTL(language) ? 'default_ar' : 'default_en';
  await setSeasonalIcon(target);
}

// ─── Firestore config loader ────────────────────────────

let cachedConfig: AppIconsConfig | null = null;

export async function loadAppIconsConfig(force = false): Promise<AppIconsConfig | null> {
  if (cachedConfig && !force) return cachedConfig;
  try {
    const snap = await getDoc(doc(db, 'appConfig', 'appIcons'));
    if (!snap.exists()) return null;
    cachedConfig = snap.data() as AppIconsConfig;
    return cachedConfig;
  } catch (e) {
    if (__DEV__) console.log('📱 loadAppIconsConfig failed:', e);
    return null;
  }
}

/**
 * Sync the app icon on startup.
 * Reads remote config, current season, and language to pick the right icon.
 */
export async function syncAppIconOnStartup(
  language: Language,
  currentSeason: SeasonType | null = null
): Promise<void> {
  const config = await loadAppIconsConfig();
  const target = resolveActiveIcon(config, currentSeason, language);
  await setSeasonalIcon(target);
}

// ─── Update notification (multilingual) ─────────────────

function pickLocalizedText(
  i18nMap: LocalizedText | undefined,
  legacyAr: string,
  legacyEn: string,
  lang: Language
): string {
  if (i18nMap) {
    const direct = i18nMap[lang];
    if (direct && direct.trim()) return direct;
    if (i18nMap.ar && i18nMap.ar.trim()) return i18nMap.ar;
    if (i18nMap.en && i18nMap.en.trim()) return i18nMap.en;
  }
  return isRTL(lang) ? legacyAr : (legacyEn || legacyAr);
}

/**
 * Check Firestore for app icon updates.
 * If a new version is detected and alerting is enabled, show a localized alert.
 */
export async function checkForIconUpdate(): Promise<void> {
  try {
    const data = await loadAppIconsConfig(true); // bypass cache so we see latest version
    if (!data || !data.alertEnabled || !data.version) return;

    const savedVersion = await AsyncStorage.getItem(ICON_VERSION_KEY);
    const lastVersion = savedVersion ? parseInt(savedVersion, 10) : 0;
    if (data.version <= lastVersion) return;

    const lang = getLanguage() as Language;
    const title = pickLocalizedText(data.alertTitleI18n, data.alertTitle, data.alertTitleEn, lang);
    const message = pickLocalizedText(data.alertMessageI18n, data.alertMessage, data.alertMessageEn, lang);
    const okLabel = isRTL(lang) ? 'حسناً' : 'OK';

    Alert.alert(title, message, [
      {
        text: okLabel,
        onPress: async () => {
          await AsyncStorage.setItem(ICON_VERSION_KEY, String(data.version));
        },
      },
    ]);
  } catch (e) {
    if (__DEV__) console.log('📱 Icon update check failed:', e);
  }
}
