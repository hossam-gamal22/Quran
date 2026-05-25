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

type IconExplanationText = {
  title: string;
  languageMessage: string;
  seasonMessage: string;
  ok: string;
};

const ICON_EXPLANATION_TEXT: Record<Language, IconExplanationText> = {
  ar: {
    title: 'تحديث أيقونة التطبيق',
    languageMessage: 'تم تغيير أيقونة التطبيق لتناسب لغة التطبيق الحالية.',
    seasonMessage: 'تم تغيير أيقونة التطبيق بمناسبة {season} حتى تعكس هذه المناسبة.',
    ok: 'حسناً',
  },
  en: {
    title: 'App Icon Updated',
    languageMessage: 'The app icon was changed to match your current app language.',
    seasonMessage: 'The app icon was changed for {season}, so it reflects this occasion.',
    ok: 'OK',
  },
  fr: {
    title: "Icône de l'app mise à jour",
    languageMessage: "L'icône de l'app a été changée pour correspondre à la langue actuelle.",
    seasonMessage: "L'icône de l'app a été changée pour {season}, afin de refléter cette occasion.",
    ok: "D'accord",
  },
  de: {
    title: 'App-Symbol aktualisiert',
    languageMessage: 'Das App-Symbol wurde an die aktuelle App-Sprache angepasst.',
    seasonMessage: 'Das App-Symbol wurde zu {season} geändert, damit es zu diesem Anlass passt.',
    ok: 'OK',
  },
  es: {
    title: 'Icono actualizado',
    languageMessage: 'El icono de la app se cambió para coincidir con el idioma actual.',
    seasonMessage: 'El icono de la app se cambió por {season}, para reflejar esta ocasión.',
    ok: 'OK',
  },
  tr: {
    title: 'Uygulama simgesi güncellendi',
    languageMessage: 'Uygulama simgesi, mevcut uygulama diline uyacak şekilde değiştirildi.',
    seasonMessage: 'Uygulama simgesi {season} için değiştirildi, böylece bu dönemi yansıtır.',
    ok: 'Tamam',
  },
  ur: {
    title: 'ایپ آئیکن اپ ڈیٹ ہو گیا',
    languageMessage: 'ایپ آئیکن موجودہ ایپ زبان کے مطابق تبدیل کیا گیا ہے۔',
    seasonMessage: 'ایپ آئیکن {season} کی مناسبت سے تبدیل کیا گیا ہے۔',
    ok: 'ٹھیک ہے',
  },
  id: {
    title: 'Ikon aplikasi diperbarui',
    languageMessage: 'Ikon aplikasi diubah agar sesuai dengan bahasa aplikasi saat ini.',
    seasonMessage: 'Ikon aplikasi diubah untuk {season}, agar mencerminkan momen ini.',
    ok: 'OK',
  },
  ms: {
    title: 'Ikon app dikemas kini',
    languageMessage: 'Ikon app ditukar supaya sepadan dengan bahasa app semasa.',
    seasonMessage: 'Ikon app ditukar untuk {season}, supaya mencerminkan peristiwa ini.',
    ok: 'OK',
  },
  hi: {
    title: 'ऐप आइकन अपडेट हुआ',
    languageMessage: 'ऐप आइकन को वर्तमान ऐप भाषा से मिलाने के लिए बदला गया है।',
    seasonMessage: '{season} के अवसर पर ऐप आइकन बदला गया है।',
    ok: 'ठीक है',
  },
  bn: {
    title: 'অ্যাপ আইকন আপডেট হয়েছে',
    languageMessage: 'বর্তমান অ্যাপ ভাষার সাথে মিল রাখতে অ্যাপ আইকন পরিবর্তন করা হয়েছে।',
    seasonMessage: '{season} উপলক্ষে অ্যাপ আইকন পরিবর্তন করা হয়েছে।',
    ok: 'ঠিক আছে',
  },
  ru: {
    title: 'Значок приложения обновлен',
    languageMessage: 'Значок приложения изменен в соответствии с текущим языком приложения.',
    seasonMessage: 'Значок приложения изменен к {season}, чтобы отразить этот период.',
    ok: 'OK',
  },
};

const SEASON_NAMES: Record<Exclude<SeasonType, 'none'>, Partial<Record<Language, string>>> = {
  ramadan: {
    ar: 'رمضان',
    en: 'Ramadan',
    fr: 'Ramadan',
    de: 'Ramadan',
    es: 'Ramadán',
    tr: 'Ramazan',
    ur: 'رمضان',
    id: 'Ramadhan',
    ms: 'Ramadan',
    hi: 'रमज़ान',
    bn: 'রমজান',
    ru: 'Рамадан',
  },
  hajj: {
    ar: 'موسم الحج',
    en: 'Hajj season',
    fr: 'la saison du Hajj',
    de: 'die Hadsch-Saison',
    es: 'la temporada del Hajj',
    tr: 'Hac mevsimi',
    ur: 'حج کے موسم',
    id: 'musim Haji',
    ms: 'musim Haji',
    hi: 'हज के मौसम',
    bn: 'হজ মৌসুম',
    ru: 'сезону хаджа',
  },
  mawlid: {
    ar: 'ذكرى المولد النبوي',
    en: 'Mawlid an-Nabi',
    fr: 'Mawlid an-Nabi',
    de: 'Mawlid an-Nabi',
    es: 'Mawlid an-Nabi',
    tr: 'Mevlid-i Nebi',
    ur: 'میلاد النبی',
    id: 'Maulid Nabi',
    ms: 'Maulidur Rasul',
    hi: 'मीलाद उन-नबी',
    bn: 'ঈদে মিলাদুন্নবী',
    ru: 'Маулиду ан-Наби',
  },
  eid_fitr: {
    ar: 'عيد الفطر',
    en: 'Eid al-Fitr',
    fr: "l'Aid al-Fitr",
    de: 'Eid al-Fitr',
    es: 'Eid al-Fitr',
    tr: 'Ramazan Bayrami',
    ur: 'عید الفطر',
    id: 'Idul Fitri',
    ms: 'Aidilfitri',
    hi: 'ईद-उल-फ़ित्र',
    bn: 'ঈদুল ফিতর',
    ru: 'Ид аль-Фитру',
  },
  eid_adha: {
    ar: 'عيد الأضحى',
    en: 'Eid al-Adha',
    fr: "l'Aid al-Adha",
    de: 'Eid al-Adha',
    es: 'Eid al-Adha',
    tr: 'Kurban Bayrami',
    ur: 'عید الاضحیٰ',
    id: 'Idul Adha',
    ms: 'Aidiladha',
    hi: 'ईद-उल-अज़हा',
    bn: 'ঈদুল আজহা',
    ru: 'Ид аль-Адхе',
  },
  dhul_hijjah: {
    ar: 'العشر الأوائل من ذي الحجة',
    en: 'the first ten days of Dhul Hijjah',
    fr: 'les dix premiers jours de Dhul Hijjah',
    de: 'die ersten zehn Tage von Dhul-Hidscha',
    es: 'los diez primeros días de Dhul Hijjah',
    tr: "Zilhicce'nin ilk on günü",
    ur: 'ذوالحجہ کے پہلے دس دن',
    id: 'sepuluh hari pertama Dzulhijjah',
    ms: 'sepuluh hari pertama Zulhijjah',
    hi: 'ज़ुल हिज्जा के पहले दस दिन',
    bn: 'যিলহজ্জের প্রথম দশ দিন',
    ru: 'первым десяти дням Зуль-хиджи',
  },
  ashura: {
    ar: 'عاشوراء',
    en: 'Ashura',
    fr: 'Achoura',
    de: 'Aschura',
    es: 'Ashura',
    tr: 'Aşure',
    ur: 'عاشورہ',
    id: 'Asyura',
    ms: 'Asyura',
    hi: 'आशूरा',
    bn: 'আশুরা',
    ru: 'Ашуре',
  },
  muharram: {
    ar: 'بداية العام الهجري',
    en: 'the Hijri new year',
    fr: "le nouvel an de l'Hégire",
    de: 'das islamische Neujahr',
    es: 'el nuevo año hijri',
    tr: 'Hicri yeni yıl',
    ur: 'ہجری نئے سال',
    id: 'tahun baru Hijriah',
    ms: 'tahun baru Hijrah',
    hi: 'हिजरी नए साल',
    bn: 'হিজরি নববর্ষ',
    ru: 'новому году хиджры',
  },
  rajab: {
    ar: 'شهر رجب',
    en: 'Rajab',
    fr: 'Rajab',
    de: 'Radschab',
    es: 'Rajab',
    tr: 'Recep ayı',
    ur: 'رجب',
    id: 'Rajab',
    ms: 'Rejab',
    hi: 'रजब',
    bn: 'রজব',
    ru: 'Раджабу',
  },
  shaban: {
    ar: 'شهر شعبان',
    en: 'Shaban',
    fr: 'Chaabane',
    de: 'Schaban',
    es: 'Shaban',
    tr: 'Şaban ayı',
    ur: 'شعبان',
    id: 'Syaban',
    ms: 'Syaaban',
    hi: 'शाबान',
    bn: 'শাবান',
    ru: 'Шаабану',
  },
};

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

function getIconExplanationText(lang: Language): IconExplanationText {
  return ICON_EXPLANATION_TEXT[lang] ?? ICON_EXPLANATION_TEXT.en;
}

function getSeasonName(seasonType: Exclude<SeasonType, 'none'>, lang: Language): string {
  const names = SEASON_NAMES[seasonType];
  return names?.[lang] || (isRTL(lang) ? names?.ar : names?.en) || seasonType;
}

function buildIconChangeExplanation(
  key: SeasonalIconKey,
  lang: Language,
  seasonType: Exclude<SeasonType, 'none'> | null
): { title: string; message: string; ok: string } {
  const text = getIconExplanationText(lang);
  const usesSeasonalIcon = key !== 'default_ar' && key !== 'default_en';
  const seasonName = usesSeasonalIcon && seasonType ? getSeasonName(seasonType, lang) : null;
  const message = seasonName
    ? text.seasonMessage.replace('{season}', seasonName)
    : text.languageMessage;

  return {
    title: text.title,
    message,
    ok: text.ok,
  };
}

async function isIconAlreadyActive(key: SeasonalIconKey): Promise<boolean> {
  const stored = await AsyncStorage.getItem(ICON_STORAGE_KEY);
  if (stored === key) return true;

  const mod = loadIconModule();
  if (!mod?.getAppIcon) return true;

  try {
    const nativeCurrent = mod.getAppIcon();
    const expectedNative = toNativeIconName(key) ?? 'DEFAULT';
    if (nativeCurrent === expectedNative) {
      await AsyncStorage.setItem(ICON_STORAGE_KEY, key);
      return true;
    }
  } catch (e) {
    if (__DEV__) console.log('📱 getAppIcon failed while checking active icon:', e);
    return true;
  }

  return false;
}

let iconChangeAlertInFlight: Promise<void> | null = null;

async function setIconWithExplanation(
  key: SeasonalIconKey,
  language: Language,
  seasonType: Exclude<SeasonType, 'none'> | null,
  versionToMark?: number
): Promise<void> {
  if (await isIconAlreadyActive(key)) return;

  if (iconChangeAlertInFlight) {
    await iconChangeAlertInFlight;
    return;
  }

  const explanation = buildIconChangeExplanation(key, language, seasonType);
  iconChangeAlertInFlight = new Promise<void>((resolve) => {
    Alert.alert(
      explanation.title,
      explanation.message,
      [
        {
          text: explanation.ok,
          onPress: async () => {
            await setSeasonalIcon(key);
            if (versionToMark) {
              await AsyncStorage.setItem(ICON_VERSION_KEY, String(versionToMark));
            }
            resolve();
          },
        },
      ],
      { cancelable: false }
    );
  }).finally(() => {
    iconChangeAlertInFlight = null;
  });

  await iconChangeAlertInFlight;
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
  const langDefault: SeasonalIconKey = language === 'ar' ? 'default_ar' : 'default_en';

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
 */
export async function syncAppIconOnStartup(
  language: Language,
  currentSeason: SeasonType | null = null,
  forceConfigRefresh = false
): Promise<void> {
  const config = await loadAppIconsConfig(forceConfigRefresh);
  const target = resolveActiveIcon(config, currentSeason, language);
  const seasonalType = currentSeason && currentSeason !== 'none'
    ? (currentSeason as Exclude<SeasonType, 'none'>)
    : null;
  await setIconWithExplanation(target, language, seasonalType, config?.version);
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
    const { getCurrentSeason } = await import('@/lib/seasonal-content');
    const currentSeason = getCurrentSeason()?.type ?? null;
    const seasonalType = currentSeason && currentSeason !== 'none'
      ? (currentSeason as Exclude<SeasonType, 'none'>)
      : null;
    const targetIcon = resolveActiveIcon(data, seasonalType, lang);
    if (!(await isIconAlreadyActive(targetIcon))) {
      await setIconWithExplanation(targetIcon, lang, seasonalType, data.version);
      return;
    }

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
