// lib/app-icon-manager.ts
// Manages dynamic app icon switching based on active language and Islamic season.
// NOTE: expo-dynamic-app-icon is only available in EAS dev/production builds, NOT Expo Go.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, AppState, type AppStateStatus, Platform } from 'react-native';
import Constants from 'expo-constants';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { isRTL, getLanguage } from '@/lib/i18n';
import type { Language } from '@/constants/translations';
import type { SeasonType } from '@/lib/seasonal-content';
import { getHijriDate } from '@/lib/hijri-date';
import { buildAndroidLauncherIconRequest } from '@/lib/android-launcher-icon-request';
import { RoohLauncherIcon } from '@/modules/rooh-launcher-icon';

// True when running inside Expo Go (no compiled native modules).
// SDK 54: `Constants.appOwnership` is deprecated and may be null even in Expo Go,
// so we also check `executionEnvironment === 'storeClient'` (the modern signal).
const IS_EXPO_GO =
  Constants.appOwnership === 'expo' ||
  (Constants as any).executionEnvironment === 'storeClient';

const ICON_STORAGE_KEY = '@app_icon_variant';
const ICON_VERSION_KEY = '@app_icon_version';
const ICON_PENDING_KEY = '@app_icon_pending';
// The icon variant we last *announced* to the user. Distinct from
// ICON_STORAGE_KEY (the variant we last *applied/armed*): the announcement must
// fire only when the visible icon verifiably changed, never merely when we
// intended a change.
const ICON_ANNOUNCED_KEY = '@app_icon_announced';
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
  | 'hijri_new_year';

// Icon keys that have been retired from the bundle but may still live in stored
// Firestore configs (`appConfig/appIcons`) or persisted state (`@app_icon_variant`).
// They are normalized to their replacement so old data never resolves to a
// missing native icon. `dhul_hijjah` was merged into the single `hajj` icon for
// the first 9 days of Dhul-Hijjah.
const LEGACY_ICON_ALIASES: Record<string, SeasonalIconKey> = {
  dhul_hijjah: 'hajj',
};

export function normalizeIconKey(key: string | null | undefined): SeasonalIconKey {
  if (!key) return 'default_ar';
  return (LEGACY_ICON_ALIASES[key] ?? key) as SeasonalIconKey;
}

export type IconMode = 'auto' | 'manual' | 'language_only';

export type LocalizedText = Partial<Record<Language, string>>;
export type SeasonalLocalizedText = Partial<Record<Exclude<SeasonType, 'none'>, LocalizedText>>;

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
  // Optional per-season alert text. Falls back to generic alert text.
  seasonalAlertTitleI18n?: SeasonalLocalizedText;
  seasonalAlertMessageI18n?: SeasonalLocalizedText;
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
  // Days 1–9 of Dhul-Hijjah show the single Hajj icon. The `dhul_hijjah` season
  // wins the priority over `hajj` for days 1–9 (see SEASON_PRIORITY), so we map
  // BOTH period-seasons to the same `hajj` asset — making the first-9-days icon
  // deterministic regardless of which season resolves. Day 10 flips to the sheep
  // (eid_adha) automatically via its higher priority. The standalone
  // `dhul_hijjah` icon asset is intentionally no longer referenced.
  dhul_hijjah: 'hajj',
  hijri_new_year: 'hijri_new_year',
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
  'hijri_new_year',
];

export const DEFAULT_SEASONAL_ALERT_TITLES: SeasonalLocalizedText = {
  ramadan: {
    ar: 'رمضان مبارك',
    en: 'Ramadan Mubarak',
  },
  hajj: {
    ar: 'موسم حج مبارك',
    en: 'Blessed Hajj Season',
  },
  dhul_hijjah: {
    ar: 'أيام مباركة',
    en: 'Blessed Days',
  },
  eid_fitr: {
    ar: 'عيد فطر مبارك',
    en: 'Eid al-Fitr Mubarak',
  },
  eid_adha: {
    ar: 'عيد أضحى مبارك',
    en: 'Eid al-Adha Mubarak',
  },
  mawlid: {
    ar: 'ذكرى المولد النبوي',
    en: 'Mawlid Reminder',
  },
  hijri_new_year: {
    ar: 'عام هجري جديد',
    en: 'Hijri New Year',
  },
  ashura: {
    ar: 'يوم عاشوراء',
    en: 'Day of Ashura',
  },
  muharram: {
    ar: 'عام هجري مبارك',
    en: 'Blessed Hijri Year',
  },
  rajab: {
    ar: 'شهر رجب',
    en: 'Rajab',
  },
  shaban: {
    ar: 'شعبان مبارك',
    en: 'Blessed Shaban',
  },
};

export const DEFAULT_SEASONAL_ALERT_MESSAGES: SeasonalLocalizedText = {
  ramadan: {
    ar: 'تم تحديث أيقونة التطبيق بمناسبة رمضان. كل عام وأنتم بخير، وتقبل الله منا ومنكم الصيام والقيام.',
    en: 'The app icon has been updated for Ramadan. Ramadan Mubarak, and may Allah accept your fasting and prayers.',
  },
  hajj: {
    ar: 'تم تحديث أيقونة التطبيق بمناسبة موسم الحج. تقبل الله من الحجاج حجهم، ومنكم صالح الأعمال.',
    en: 'The app icon has been updated for Hajj season. May Allah accept the pilgrims Hajj and your good deeds.',
  },
  dhul_hijjah: {
    ar: 'تم تحديث أيقونة التطبيق بمناسبة العشر الأوائل من ذي الحجة. أكثروا فيها من الذكر والعمل الصالح.',
    en: 'The app icon has been updated for the first ten days of Dhul Hijjah. May these blessed days be filled with remembrance and good deeds.',
  },
  eid_fitr: {
    ar: 'تم تحديث أيقونة التطبيق بمناسبة عيد الفطر. كل عام وأنتم بخير، وتقبل الله منا ومنكم.',
    en: 'The app icon has been updated for Eid al-Fitr. Eid Mubarak, and may Allah accept from us and from you.',
  },
  eid_adha: {
    ar: 'تم تحديث أيقونة التطبيق بمناسبة عيد الأضحى. كل عام وأنتم بخير، وتقبل الله طاعتكم.',
    en: 'The app icon has been updated for Eid al-Adha. Eid Mubarak, and may Allah accept your worship.',
  },
  mawlid: {
    ar: 'تم تحديث أيقونة التطبيق بمناسبة ذكرى المولد النبوي. اللهم صل وسلم وبارك على نبينا محمد.',
    en: 'The app icon has been updated for the Mawlid reminder. Peace and blessings be upon Prophet Muhammad.',
  },
  hijri_new_year: {
    ar: 'تم تحديث أيقونة التطبيق بمناسبة العام الهجري الجديد. نسأل الله أن يجعله عام خير وبركة.',
    en: 'The app icon has been updated for the new Hijri year. May Allah make it a year of goodness and blessings.',
  },
  ashura: {
    ar: 'تم تحديث أيقونة التطبيق بمناسبة عاشوراء. تقبل الله صيامكم وصالح أعمالكم.',
    en: 'The app icon has been updated for Ashura. May Allah accept your fasting and good deeds.',
  },
  muharram: {
    ar: 'تم تحديث أيقونة التطبيق بمناسبة بداية العام الهجري. نسأل الله أن يجعله عام خير وبركة.',
    en: 'The app icon has been updated for the Hijri new year. May Allah make it a year of goodness and blessings.',
  },
  rajab: {
    ar: 'تم تحديث أيقونة التطبيق بمناسبة شهر رجب، أحد الأشهر الحرم. نسأل الله أن يبارك لنا فيه.',
    en: 'The app icon has been updated for Rajab, one of the sacred months. May Allah bless it for us.',
  },
  shaban: {
    ar: 'تم تحديث أيقونة التطبيق بمناسبة شهر شعبان. اللهم بارك لنا فيه وبلغنا رمضان.',
    en: 'The app icon has been updated for Shaban. May Allah bless it for us and let us reach Ramadan.',
  },
};

// Priority order for overlapping seasons (most specific event wins).
// NOTE: keep this identical to SEASON_PRIORITY in lib/seasonal-content.ts.
const SEASON_PRIORITY: Exclude<SeasonType, 'none'>[] = [
  'eid_fitr',
  'eid_adha',
  'mawlid',
  'ashura',
  'ramadan',
  'dhul_hijjah',
  'hajj',
  // Short, specific Hijri-new-year window (1–3 Muharram) must out-prioritize the
  // month-wide `muharram` season (which maps to the default icon).
  'hijri_new_year',
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

async function isIconAlreadyActive(key: SeasonalIconKey): Promise<boolean> {
  const stored = await AsyncStorage.getItem(ICON_STORAGE_KEY);
  if (stored !== key) return false;

  // Android: AsyncStorage is the source of truth (the native helper has no
  // reliable "current alias" introspection — we set it ourselves on toggle).
  if (Platform.OS === 'android') return true;

  // iOS: verify against the live native state in case the user reset it via
  // system settings or a previous switch silently failed.
  const mod = loadIconModule();
  if (!mod?.getAppIcon) return true;
  try {
    const nativeCurrent = mod.getAppIcon();
    const expectedNative = toNativeIconName(key) ?? 'DEFAULT';
    return nativeCurrent === expectedNative;
  } catch {
    return true;
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
      return key; // ramadan / hajj / mawlid / eid_* / hijri_new_year
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
  const langDefault: SeasonalIconKey = language === 'ar' ? 'default_ar' : 'default_en';

  if (mode === 'language_only') return langDefault;

  if (mode === 'manual' && config?.manualIcon) {
    return normalizeIconKey(config.manualIcon);
  }

  // Auto mode: use season if active and enabled.
  if (mode === 'auto' && currentSeason && currentSeason !== 'none') {
    const enabled = config?.enabledSeasons ?? DEFAULT_ENABLED_SEASONS;
    if (enabled.includes(currentSeason as Exclude<SeasonType, 'none'>)) {
      const map = { ...DEFAULT_SEASONAL_MAP, ...(config?.seasonalMap ?? {}) };
      const mapped = normalizeIconKey(map[currentSeason as Exclude<SeasonType, 'none'>]);
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

// ─── Core switch ────────────────────────────────────────

/**
 * Perform the native icon switch immediately.
 *
 * killAppOnAndroid:
 *   - false (default): toggles activity-aliases with DONT_KILL_APP — smooth in
 *     the current session but OEM launchers (MIUI, EMUI, One UI) often cache
 *     the icon and won't refresh until reboot. Suitable when we want to update
 *     AsyncStorage state without disturbing the user.
 *   - true: omits DONT_KILL_APP — Android terminates the process after the
 *     alias toggle, forcing the launcher to re-query on next launch. Required
 *     for OEM launchers to actually pick up the new icon. Caller MUST ensure
 *     the app is in background, otherwise it'll kill an active user session.
 */
async function applyAppIconNow(
  key: SeasonalIconKey,
  killAppOnAndroid: boolean
): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(ICON_STORAGE_KEY);

    if (Platform.OS === 'android') {
      const request = buildAndroidLauncherIconRequest(key);
      if (RoohLauncherIcon?.setLauncherIcon) {
        try {
          const result = RoohLauncherIcon.setLauncherIcon(
            request.targetIconName,
            request.aliases,
            killAppOnAndroid
          );
          if (result !== false) {
            await AsyncStorage.setItem(ICON_STORAGE_KEY, key);
            await AsyncStorage.removeItem(ICON_PENDING_KEY);
            if (__DEV__) {
              console.log(
                `📱 Android launcher icon → ${key} (killApp=${killAppOnAndroid})`
              );
            }
            return;
          }
        } catch (e) {
          if (__DEV__) console.log('📱 Android launcher icon toggle failed:', e);
        }
      }
    } else if (stored === key) {
      return; // iOS: nothing to do
    }

    // iOS path (and Android fallback if RoohLauncherIcon is unavailable).
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
      await AsyncStorage.removeItem(ICON_PENDING_KEY);
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
      await AsyncStorage.removeItem(ICON_PENDING_KEY);
      if (__DEV__) console.log(`📱 App icon switched to: ${key}`);
    }
  } catch (e) {
    if (__DEV__) console.log('📱 applyAppIconNow failed:', e);
  }
}

// ─── Android AppState deferral ─────────────────────────
//
// On Android with OEM launchers (MIUI, EMUI, One UI), the only reliable way to
// make the launcher pick up the new icon is to kill the app process after the
// alias toggle (so the launcher re-queries on next launch). We can't kill while
// the user is actively in the app, so we register a one-shot AppState listener
// that performs the toggle the moment the app goes to background or inactive.
//
// In the same session we coalesce: the last requested key wins, and we never
// register more than one listener.

let pendingDeferredKey: SeasonalIconKey | null = null;
let deferredListenerSub: { remove: () => void } | null = null;

function scheduleAndroidDeferredSwitch(key: SeasonalIconKey): void {
  pendingDeferredKey = key;
  // Persist so we can recover on the next cold start if the AppState event
  // never fires (process gets force-killed by user / OOM / OEM cleanup).
  void AsyncStorage.setItem(ICON_PENDING_KEY, key);

  if (deferredListenerSub) return; // already armed

  const handler = (state: AppStateStatus) => {
    if (state !== 'background' && state !== 'inactive') return;
    const sub = deferredListenerSub;
    deferredListenerSub = null;
    sub?.remove();
    const target = pendingDeferredKey;
    pendingDeferredKey = null;
    if (!target) return;
    // Fire-and-forget — process is about to die anyway.
    void applyAppIconNow(target, /* killApp */ true);
  };
  deferredListenerSub = AppState.addEventListener('change', handler);
}

/**
 * Public entry point used by SettingsContext and SeasonalContext.
 *
 * Foreground-safe:
 *   - iOS: applies immediately (iOS will show its own system confirmation dialog).
 *   - Android: applies the AsyncStorage normalization immediately (alias state)
 *     and arms a deferred kill-toggle that fires when the app goes to background.
 *     This guarantees OEM launchers refresh on next launch without killing the
 *     user's current session.
 */
export async function setSeasonalIcon(rawKey: SeasonalIconKey): Promise<void> {
  const key = normalizeIconKey(rawKey);
  if (await isIconAlreadyActive(key)) {
    // Clear any stale pending switch from a prior session.
    if (Platform.OS === 'android') {
      pendingDeferredKey = null;
      await AsyncStorage.removeItem(ICON_PENDING_KEY);
    }
    return;
  }

  if (Platform.OS === 'android') {
    // 1) Toggle aliases without killing — keeps AsyncStorage in sync and
    //    handles the (rare) launcher that picks up changes live.
    await applyAppIconNow(key, /* killApp */ false);
    // 2) Arm a deferred kill-toggle for OEM launchers that cache.
    scheduleAndroidDeferredSwitch(key);
    return;
  }

  // iOS: single immediate switch (system dialog appears).
  await applyAppIconNow(key, /* killApp */ false);
}

/**
 * Background-task entry point. Must NOT be called from foreground — it kills
 * the app process on Android. Safe because the OS only invokes background
 * tasks while the app is suspended.
 */
export async function setSeasonalIconForBackgroundTask(
  rawKey: SeasonalIconKey
): Promise<void> {
  const key = normalizeIconKey(rawKey);
  if (await isIconAlreadyActive(key)) return;
  await applyAppIconNow(key, /* killApp */ Platform.OS === 'android');
}

/**
 * Legacy: switch icon based purely on language. Still used by SettingsContext
 * when the user changes language.
 */
export async function switchAppIcon(language: Language): Promise<void> {
  try {
    const { getCurrentSeason } = await import('@/lib/seasonal-content');
    await syncAppIconOnStartup(language, getCurrentSeason()?.type ?? null, true);
  } catch {
    const target: SeasonalIconKey = language === 'ar' ? 'default_ar' : 'default_en';
    await setSeasonalIcon(target);
  }
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
 *
 * On Android, if a previous session armed a deferred kill-toggle that never
 * fired (e.g. user force-killed the app), we drain it here before the new
 * resolution — preventing two switches in a row.
 */
export async function syncAppIconOnStartup(
  language: Language,
  currentSeason: SeasonType | null = null,
  forceConfigRefresh = false
): Promise<void> {
  const config = await loadAppIconsConfig(forceConfigRefresh);
  const target = resolveActiveIcon(config, currentSeason, language);
  await setSeasonalIcon(target);
  // NOTE: the version key is owned exclusively by checkForIconUpdate(). The sync
  // path must NOT write it — doing so races the announcement check at startup and
  // can silently swallow (or duplicate) the "icon updated" alert.
}

/**
 * Background-task variant of the startup sync. Resolves the desired icon and
 * applies it immediately (killing the process on Android). The OS invokes this
 * only while the app is suspended, so killing is safe.
 */
export async function syncAppIconForBackgroundTask(
  language: Language,
  currentSeason: SeasonType | null = null
): Promise<void> {
  const config = await loadAppIconsConfig(true);
  const target = resolveActiveIcon(config, currentSeason, language);
  await setSeasonalIconForBackgroundTask(target);
  // Version key is owned exclusively by checkForIconUpdate() — see note there.
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

function pickSeasonalLocalizedText(
  i18nMap: SeasonalLocalizedText | undefined,
  seasonType: Exclude<SeasonType, 'none'> | null,
  lang: Language
): string | undefined {
  if (!i18nMap || !seasonType) return undefined;
  const texts = i18nMap[seasonType];
  if (!texts) return undefined;

  const direct = texts[lang];
  if (direct && direct.trim()) return direct;

  const primaryFallback = isRTL(lang) ? texts.ar : texts.en;
  if (primaryFallback && primaryFallback.trim()) return primaryFallback;

  const secondaryFallback = isRTL(lang) ? texts.en : texts.ar;
  if (secondaryFallback && secondaryFallback.trim()) return secondaryFallback;

  return undefined;
}

/**
 * Check Firestore for app icon updates pushed from the admin panel.
 * Shows a single localized alert (admin-driven announcement) and applies the
 * resolved icon. Idempotent across launches via ICON_VERSION_KEY.
 */
export async function checkForIconUpdate(): Promise<void> {
  try {
    const data = await loadAppIconsConfig(true); // bypass cache so we see latest version
    if (!data || !data.alertEnabled || !data.version) return;

    const savedVersionRaw = await AsyncStorage.getItem(ICON_VERSION_KEY);

    const lang = getLanguage() as Language;
    const { getCurrentSeason } = await import('@/lib/seasonal-content');
    const currentSeason = getCurrentSeason()?.type ?? null;
    const seasonalType = currentSeason && currentSeason !== 'none'
      ? (currentSeason as Exclude<SeasonType, 'none'>)
      : null;
    const targetIcon = resolveActiveIcon(data, seasonalType, lang);

    // Apply the resolved icon first (setSeasonalIcon no-ops if already active),
    // then verify it actually landed before deciding whether to announce.
    await setSeasonalIcon(targetIcon);

    // Fresh install (or cleared storage): baseline silently. Nothing was
    // "updated" — the user is seeing this build for the first time — so we record
    // the version + the active variant without showing the update alert.
    if (savedVersionRaw === null) {
      await AsyncStorage.setItem(ICON_VERSION_KEY, String(data.version));
      await AsyncStorage.setItem(ICON_ANNOUNCED_KEY, targetIcon);
      return;
    }

    const lastVersion = parseInt(savedVersionRaw, 10) || 0;

    // Record the version UNCONDITIONALLY and up front. The announcement must be
    // strictly once-per-version: even if the icon is already correct, the user
    // dismisses the alert without tapping OK, or the native switch silently
    // fails, we must never re-prompt for the same version on the next launch.
    await AsyncStorage.setItem(ICON_VERSION_KEY, String(data.version));

    // Only consider announcing when the admin actually pushed a newer version.
    if (data.version <= lastVersion) return;

    // VERIFIED-CHANGE GATE. Announce only when the target icon is genuinely the
    // active one now — on iOS this checks live native state, on Android it checks
    // the alias state we own. In Expo Go / when the native module is missing the
    // switch is a no-op, so this is false and we never show a false "updated".
    const verifiedActive = await isIconAlreadyActive(targetIcon);
    if (!verifiedActive) return;

    // And only when the visible icon differs from what we last announced. This
    // prevents re-announcing a version bump that doesn't change the user's icon.
    const lastAnnounced = (await AsyncStorage.getItem(ICON_ANNOUNCED_KEY)) as SeasonalIconKey | null;
    const announcedBaseline: SeasonalIconKey = lastAnnounced ?? 'default_ar';
    if (announcedBaseline === targetIcon) return;

    // From here we will announce: record the announced variant so this exact
    // visible icon is never announced twice.
    await AsyncStorage.setItem(ICON_ANNOUNCED_KEY, targetIcon);

    const usesSeasonalIcon = targetIcon !== 'default_ar' && targetIcon !== 'default_en';
    const seasonalTitle = usesSeasonalIcon
      ? pickSeasonalLocalizedText(
          { ...DEFAULT_SEASONAL_ALERT_TITLES, ...(data.seasonalAlertTitleI18n ?? {}) },
          seasonalType,
          lang
        )
      : undefined;
    const seasonalMessage = usesSeasonalIcon
      ? pickSeasonalLocalizedText(
          { ...DEFAULT_SEASONAL_ALERT_MESSAGES, ...(data.seasonalAlertMessageI18n ?? {}) },
          seasonalType,
          lang
        )
      : undefined;
    const title = seasonalTitle || pickLocalizedText(data.alertTitleI18n, data.alertTitle, data.alertTitleEn, lang);
    const message = seasonalMessage || pickLocalizedText(data.alertMessageI18n, data.alertMessage, data.alertMessageEn, lang);
    const okLabel = isRTL(lang) ? 'حسناً' : 'OK';

    // Version already persisted above — the button is purely an acknowledgement.
    Alert.alert(title, message, [{ text: okLabel }]);
  } catch (e) {
    if (__DEV__) console.log('📱 Icon update check failed:', e);
  }
}
