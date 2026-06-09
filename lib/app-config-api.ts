// lib/app-config-api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, collection, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { shouldRefetchContent, markContentFetched } from './content-manifest';
import { logFirestoreError } from './firestore-error';
import { APP_CONFIG } from '../constants/app';

export interface WelcomeBannerConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  titles?: MultiLangText;
  subtitles?: MultiLangText;
  icon: string;
  customIconUrl?: string;
  color: string;
  route: string;
  displayMode?: 'text' | 'text_image' | 'image_only';
  backgroundImage?: string;
  backgroundImageNonAr?: string;
  scheduledFrom?: string;   // ISO date — banner visible from this date
  scheduledUntil?: string;  // ISO date — banner hidden after this date
  showPrayerCountdown?: boolean;
  showIconAnimation?: boolean;
}

export interface MultiLangText {
  ar: string;
  en: string;
  fr?: string;
  de?: string;
  es?: string;
  tr?: string;
  ur?: string;
  id?: string;
  ms?: string;
  hi?: string;
  bn?: string;
  ru?: string;
}

export interface HighlightItemConfig {
  id: string;
  enabled: boolean;          // kept for backward compat
  type?: 'builtin' | 'temp_page';
  tempPageId?: string;
  
  title: string;             // kept for backward compat (Arabic fallback)
  titles?: MultiLangText;
  subtitle?: string;
  subtitles?: MultiLangText;
  
  icon: string;
  color: string;
  route: string;
  routeType?: 'internal' | 'url' | 'html';
  imageUrl?: string;
  htmlContent?: string;
  order: number;
  
  isVisible?: boolean;
  isPinned?: boolean;
  visibleFrom?: string;
  visibleUntil?: string;
  updatedAt?: string;
}

export type IconMode = 'material' | 'ionicons' | 'sf' | 'png';

export interface ConfigurableIcon {
  mode: IconMode;
  name?: string;
  selectedName?: string;
  pngUrl?: string;
  selectedPngUrl?: string;
}

export interface ConfigurableNavItem {
  key: string;
  labelAr: string;
  labelEn?: string;
  icon: ConfigurableIcon;
}

export interface UICustomizationConfig {
  tabBarItems: ConfigurableNavItem[];
  quranSegments: ConfigurableNavItem[];
  prayerTopSegments: ConfigurableNavItem[];
  prayerViewSegments: ConfigurableNavItem[];
  tabBarLayout?: {
    labelFontSize?: number;
    titleVerticalOffset?: number;
    selectedBgOpacity?: number;
  };
}

export interface ShareModalConfig {
  enabled: boolean;
  titleAr: string;
  descriptionAr: string;
  shareMessageAr: string;
  shareUrlFallback: string;
  shareUrlIos?: string;
  shareUrlAndroid?: string;
}

export interface QuranAutoScrollConfig {
  minSeconds: number;
  maxSeconds: number;
}

export interface RemoteAppConfig {
  name: string;
  nameEn: string;
  description: string;
  version: string;
  primaryColor: string;
  maintenanceMode: boolean;
  forceUpdate: boolean;
  minVersion: string;
  contact: {
    email: string;
    website: string;
  };
  downloadLinks: {
    android: string;
    ios: string;
  };
  latestVersion?: string;
  storeUrlIos?: string;
  storeUrlAndroid?: string;
  features: {
    quran: boolean;
    azkar: boolean;
    prayer: boolean;
    qibla: boolean;
    tasbih: boolean;
    names: boolean;
    ruqyah: boolean;
    hijri: boolean;
    showNotificationTroubleshooter?: boolean;
  };
  welcomeBanner?: WelcomeBannerConfig;
  highlights?: HighlightItemConfig[];
  uiCustomization?: UICustomizationConfig;
  shareModal?: ShareModalConfig;
  quranAutoScroll?: QuranAutoScrollConfig;
}

const DEFAULT_UI_CUSTOMIZATION: UICustomizationConfig = {
  tabBarItems: [
    {
      key: 'settings',
      labelAr: 'الإعدادات',
      labelEn: 'Settings',
      icon: { mode: 'sf', name: 'gearshape', selectedName: 'gearshape.fill' },
    },
    {
      key: 'prayer',
      labelAr: 'الصلاة',
      labelEn: 'Prayer',
      icon: { mode: 'sf', name: 'building.columns', selectedName: 'building.columns.fill' },
    },
    {
      key: 'tasbih',
      labelAr: 'تسبيح',
      labelEn: 'Tasbih',
      icon: { mode: 'sf', name: 'hand.raised', selectedName: 'hand.raised.fill' },
    },
    {
      key: 'quran',
      labelAr: 'القرآن',
      labelEn: 'Quran',
      icon: { mode: 'sf', name: 'book', selectedName: 'book.fill' },
    },
    {
      key: 'index',
      labelAr: 'الرئيسية',
      labelEn: 'Home',
      icon: { mode: 'sf', name: 'house', selectedName: 'house.fill' },
    },
  ],
  quranSegments: [
    { key: 'surahs', labelAr: 'السور', labelEn: 'Surahs', icon: { mode: 'material', name: 'book-open-variant' } },
    { key: 'juz', labelAr: 'الأجزاء', labelEn: 'Juz', icon: { mode: 'material', name: 'bookshelf' } },
    { key: 'listen', labelAr: 'استماع', labelEn: 'Listen', icon: { mode: 'material', name: 'headphones' } },
  ],
  prayerTopSegments: [
    { key: 'prayer', labelAr: 'الصلاة', labelEn: 'Prayer', icon: { mode: 'material', name: 'clock-time-four-outline' } },
    { key: 'qibla', labelAr: 'القبلة', labelEn: 'Qibla', icon: { mode: 'material', name: 'compass' } },
  ],
  prayerViewSegments: [
    { key: 'list', labelAr: 'قائمة', labelEn: 'List', icon: { mode: 'material', name: 'format-list-text' } },
    { key: 'clock', labelAr: 'ساعة', labelEn: 'Clock', icon: { mode: 'material', name: 'clock-outline' } },
  ],
  tabBarLayout: {
    labelFontSize: 12,
    titleVerticalOffset: 4,
    selectedBgOpacity: 0.16,
  },
};

// القيم الافتراضية
const DEFAULT_REMOTE_CONFIG: RemoteAppConfig = {
  name: 'رُوح المسلم',
  nameEn: 'Rooh Al-Muslim',
  description: 'تطبيق إسلامي شامل للقرآن والأذكار والصلاة',
  version: '1.2.1',
  primaryColor: '#1B4332',
  maintenanceMode: false,
  forceUpdate: false,
  minVersion: '1.2.0',
  contact: {
    email: 'hossamgamal290@gmail.com',
    website: '',
  },
  downloadLinks: {
    android: 'https://play.google.com/store/apps/details?id=com.rooh.almuslim',
    ios: 'https://apps.apple.com/app/id6761651911',
  },
  storeUrlIos: 'https://apps.apple.com/app/id6761651911',
  storeUrlAndroid: 'https://play.google.com/store/apps/details?id=com.rooh.almuslim',
  features: {
    quran: true,
    azkar: true,
    prayer: true,
    qibla: true,
    tasbih: true,
    names: true,
    ruqyah: true,
    hijri: true,
    showNotificationTroubleshooter: false,
  },
  uiCustomization: DEFAULT_UI_CUSTOMIZATION,
  shareModal: {
    enabled: true,
    titleAr: 'انشر الخير مع روح المسلم',
    descriptionAr: 'كل من شارك هذا التطبيق كان له مثل أجر من انتفع به — اجعله صدقة جارية تعود عليك وعلى من تحب',
    shareMessageAr: 'حمّل تطبيق روح المسلم — صلوات، أذكار، قرآن وأوقات الصلاة',
    shareUrlFallback: 'https://roohmuslim.app',
    shareUrlIos: '',
    shareUrlAndroid: '',
  },
  quranAutoScroll: {
    minSeconds: 10,
    maxSeconds: 120,
  },
};

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function mergeUiCustomization(value: unknown): UICustomizationConfig {
  const ui = isRecord(value) ? value : {};
  return {
    tabBarItems: Array.isArray(ui.tabBarItems) ? ui.tabBarItems : DEFAULT_UI_CUSTOMIZATION.tabBarItems,
    quranSegments: Array.isArray(ui.quranSegments) ? ui.quranSegments : DEFAULT_UI_CUSTOMIZATION.quranSegments,
    prayerTopSegments: Array.isArray(ui.prayerTopSegments) ? ui.prayerTopSegments : DEFAULT_UI_CUSTOMIZATION.prayerTopSegments,
    prayerViewSegments: Array.isArray(ui.prayerViewSegments) ? ui.prayerViewSegments : DEFAULT_UI_CUSTOMIZATION.prayerViewSegments,
    tabBarLayout: {
      ...DEFAULT_UI_CUSTOMIZATION.tabBarLayout,
      ...(isRecord(ui.tabBarLayout) ? ui.tabBarLayout : {}),
    },
  };
}

function mergeRemoteConfig(data: unknown): RemoteAppConfig {
  const remote = isRecord(data) ? data : {};
  if (remote.minSupportedVersion && !remote.minVersion) {
    remote.minVersion = remote.minSupportedVersion;
  }

  return {
    ...DEFAULT_REMOTE_CONFIG,
    ...remote,
    contact: {
      ...DEFAULT_REMOTE_CONFIG.contact,
      ...(isRecord(remote.contact) ? remote.contact : {}),
    },
    downloadLinks: {
      ...DEFAULT_REMOTE_CONFIG.downloadLinks,
      ...(isRecord(remote.downloadLinks) ? remote.downloadLinks : {}),
    },
    features: {
      ...DEFAULT_REMOTE_CONFIG.features,
      ...(isRecord(remote.features) ? remote.features : {}),
    },
    uiCustomization: mergeUiCustomization(remote.uiCustomization),
    shareModal: {
      ...DEFAULT_REMOTE_CONFIG.shareModal,
      ...(isRecord(remote.shareModal) ? remote.shareModal : {}),
    },
    quranAutoScroll: {
      ...DEFAULT_REMOTE_CONFIG.quranAutoScroll,
      ...(isRecord(remote.quranAutoScroll) ? remote.quranAutoScroll : {}),
    },
  } as RemoteAppConfig;
}

// جلب الإعدادات من Firebase
export const fetchAppConfig = async (): Promise<RemoteAppConfig> => {
  try {
    console.log('🔄 جاري جلب الإعدادات من Firebase...');

    const docRef = doc(db, 'config', 'app-settings');
    // 8s timeout — Firestore can hang silently when offline / blocked, so we
    // race getDoc against a timer and fall back to cache instead of leaving
    // the splash/UI stuck on isLoading.
    const docSnap = await Promise.race([
      getDoc(docRef),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('app-config-timeout')), 8000)
      ),
    ]);

    if (docSnap.exists()) {
      const data = docSnap.data() as Record<string, any>;
      
      const mergedConfig = mergeRemoteConfig(data);
      
      // حفظ في AsyncStorage للاستخدام offline
      await AsyncStorage.setItem('remote_app_config', JSON.stringify(mergedConfig));
      
      console.log('✅ تم جلب الإعدادات من Firebase بنجاح');
      return mergedConfig;
    } else {
      console.log('⚠️ لا توجد إعدادات في Firebase، استخدام الافتراضية');
    }
  } catch (error) {
    console.log('❌ خطأ في جلب الإعدادات من Firebase:', error);
  }
  
  // محاولة القراءة من Cache
  try {
    const cached = await AsyncStorage.getItem('remote_app_config');
    if (cached) {
      console.log('✅ تم استخدام الإعدادات المحفوظة (Cache)');
      const parsed = JSON.parse(cached);
      return mergeRemoteConfig(parsed);
    }
  } catch (error) {
    console.log('⚠️ فشل قراءة Cache');
  }
  
  return DEFAULT_REMOTE_CONFIG;
};

// الحصول على الإعدادات
export const getAppConfig = async (): Promise<RemoteAppConfig> => {
  return await fetchAppConfig();
};

// الحصول على روابط المتاجر من الإعدادات (مع fallback)
export const getStoreUrls = async (): Promise<{ ios: string; android: string }> => {
  const config = await fetchAppConfig();
  return {
    ios: config.storeUrlIos || config.downloadLinks?.ios || '',
    android: config.storeUrlAndroid || config.downloadLinks?.android || '',
  };
};

// Manifest-gated one-shot read of remote app config (replaces a live single-doc
// listener). subscribeToAppConfig and subscribeToHighlights both read the same
// doc, so they share the 'appSettings' manifest key — one admin bump notifies
// both. Returns a no-op unsubscribe.
export const subscribeToAppConfig = (
  onUpdate: (config: RemoteAppConfig) => void,
  onError?: (error: Error) => void
): (() => void) => {
  (async () => {
    try {
      if (!(await shouldRefetchContent('appSettings'))) return;
      const docSnap = await getDoc(doc(db, 'config', 'app-settings'));
      await markContentFetched('appSettings');
      if (!docSnap.exists()) return;
      const data = docSnap.data() as Record<string, any>;
      const mergedConfig = mergeRemoteConfig(data);
      await AsyncStorage.setItem('remote_app_config', JSON.stringify(mergedConfig));
      onUpdate(mergedConfig);
    } catch (error) {
      logFirestoreError('خطأ في تحديثات Firebase', error);
      if (onError) onError(error as Error);
    }
  })();
  return () => {};
};

/**
 * Subscribe to real-time updates for highlights
 * الاشتراك في تحديثات الأبرز في الوقت الفعلي
 */
// Manifest-gated one-shot read of highlights (shares the 'appSettings' key
// with subscribeToAppConfig — both read the same doc). Returns a no-op unsubscribe.
export const subscribeToHighlights = (
  onUpdate: (highlights: HighlightItemConfig[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  (async () => {
    try {
      if (!(await shouldRefetchContent('appSettings'))) return;
      const docSnap = await getDoc(doc(db, 'config', 'app-settings'));
      // markContentFetched is also called by subscribeToAppConfig — harmless
      // duplicate; it just records the current manifest version.
      await markContentFetched('appSettings');
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      const highlights = (data.highlights || []) as HighlightItemConfig[];
      const now = new Date();
      const filtered = highlights.filter(h => {
        const visible = h.isVisible !== undefined ? h.isVisible : h.enabled;
        if (!visible) return false;
        if (h.visibleFrom && new Date(h.visibleFrom) > now) return false;
        if (h.visibleUntil && new Date(h.visibleUntil) < now) return false;
        return true;
      });
      filtered.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return (a.order || 0) - (b.order || 0);
      });
      await AsyncStorage.setItem('@highlights_cache', JSON.stringify(filtered));
      onUpdate(filtered);
    } catch (error) {
      logFirestoreError('خطأ في تحديثات الأبرز', error);
      if (onError) onError(error as Error);
    }
  })();
  return () => {};
};

/**
 * Get localized title from highlight config
 * الحصول على العنوان المترجم
 */
export const getHighlightTitle = (item: HighlightItemConfig, lang: string): string => {
  if (item.titles) {
    return (item.titles as any)[lang] || item.titles.ar || item.title;
  }
  return item.title;
};

/**
 * Get localized subtitle from highlight config  
 */
export const getHighlightSubtitle = (item: HighlightItemConfig, lang: string): string | undefined => {
  if (item.subtitles) {
    return (item.subtitles as any)[lang] || item.subtitles.ar || item.subtitle;
  }
  return item.subtitle;
};

// ========================================
// Server-Driven UI (SDUI) API
// واجهة المستخدم الديناميكية
// ========================================

import type { 
  SDUIScreenConfig, 
  SDUISection,
  SDUIConfigResponse 
} from './sdui/types';

// Cache key for SDUI configs
const SDUI_CACHE_KEY = 'sdui_screen_configs';

/**
 * Fetch SDUI configuration for a specific screen
 * جلب إعدادات الشاشة الديناميكية
 */
export const fetchSDUIScreenConfig = async (
  screenId: string
): Promise<SDUIScreenConfig | null> => {
  try {
    console.log(`🔄 جاري جلب إعدادات SDUI للشاشة: ${screenId}...`);
    
    const docRef = doc(db, 'sdui_screens', screenId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as SDUIScreenConfig;
      
      // Save to cache
      const cacheKey = `${SDUI_CACHE_KEY}_${screenId}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
      
      console.log(`✅ تم جلب إعدادات SDUI للشاشة: ${screenId}`);
      return data;
    } else {
      console.log(`⚠️ لا توجد إعدادات SDUI للشاشة: ${screenId}`);
    }
  } catch (error) {
    console.log(`❌ خطأ في جلب إعدادات SDUI للشاشة ${screenId}:`, error);
  }
  
  // Try cache
  try {
    const cacheKey = `${SDUI_CACHE_KEY}_${screenId}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      console.log(`✅ تم استخدام إعدادات SDUI المحفوظة للشاشة: ${screenId}`);
      return JSON.parse(cached);
    }
  } catch (error) {
    console.log(`⚠️ فشل قراءة Cache لـ SDUI ${screenId}`);
  }
  
  return null;
};

/**
 * Fetch all SDUI screen configurations
 * جلب جميع إعدادات الشاشات الديناميكية
 */
export const fetchAllSDUIConfigs = async (): Promise<Record<string, SDUIScreenConfig>> => {
  try {
    console.log('🔄 جاري جلب جميع إعدادات SDUI...');
    
    const screensRef = collection(db, 'sdui_screens');
    const querySnapshot = await getDocs(screensRef);
    
    const configs: Record<string, SDUIScreenConfig> = {};
    querySnapshot.forEach((doc) => {
      configs[doc.id] = {
        screenId: doc.id,
        ...doc.data(),
      } as SDUIScreenConfig;
    });
    
    // Save all to cache
    await AsyncStorage.setItem(SDUI_CACHE_KEY, JSON.stringify(configs));
    
    console.log(`✅ تم جلب ${Object.keys(configs).length} إعدادات شاشة SDUI`);
    return configs;
  } catch (error) {
    console.log('❌ خطأ في جلب جميع إعدادات SDUI:', error);
  }
  
  // Try cache
  try {
    const cached = await AsyncStorage.getItem(SDUI_CACHE_KEY);
    if (cached) {
      console.log('✅ تم استخدام إعدادات SDUI المحفوظة');
      return JSON.parse(cached);
    }
  } catch (error) {
    console.log('⚠️ فشل قراءة Cache لـ SDUI');
  }
  
  return {};
};

/**
 * Subscribe to real-time updates for a specific SDUI screen
 * الاشتراك في تحديثات الشاشة الديناميكية في الوقت الفعلي
 */
export const subscribeToSDUIScreen = (
  screenId: string,
  onUpdate: (config: SDUIScreenConfig) => void,
  onError?: (error: Error) => void
): (() => void) => {
  const docRef = doc(db, 'sdui_screens', screenId);
  
  const unsubscribe = onSnapshot(
    docRef,
    async (docSnap) => {
      if (docSnap.exists()) {
        const data = {
          screenId: docSnap.id,
          ...docSnap.data(),
        } as SDUIScreenConfig;
        
        // Save to cache
        const cacheKey = `${SDUI_CACHE_KEY}_${screenId}`;
        await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
        
        console.log(`🔄 تم تحديث SDUI للشاشة: ${screenId} (Real-time)`);
        onUpdate(data);
      }
    },
    (error) => {
      logFirestoreError(`خطأ في الاشتراك بـ SDUI ${screenId}`, error);
      if (onError) onError(error);
    }
  );
  
  return unsubscribe;
};

/**
 * Subscribe to all SDUI screen updates
 * الاشتراك في تحديثات جميع الشاشات الديناميكية
 */
export const subscribeToAllSDUIScreens = (
  onUpdate: (configs: Record<string, SDUIScreenConfig>) => void,
  onError?: (error: Error) => void
): (() => void) => {
  const screensRef = collection(db, 'sdui_screens');
  
  const unsubscribe = onSnapshot(
    screensRef,
    async (querySnapshot) => {
      const configs: Record<string, SDUIScreenConfig> = {};
      querySnapshot.forEach((doc) => {
        configs[doc.id] = {
          screenId: doc.id,
          ...doc.data(),
        } as SDUIScreenConfig;
      });
      
      // Save all to cache
      await AsyncStorage.setItem(SDUI_CACHE_KEY, JSON.stringify(configs));
      
      console.log(`🔄 تم تحديث ${Object.keys(configs).length} شاشة SDUI (Real-time)`);
      onUpdate(configs);
    },
    (error) => {
      logFirestoreError('خطأ في الاشتراك بجميع شاشات SDUI', error);
      if (onError) onError(error);
    }
  );
  
  return unsubscribe;
};

/**
 * Clear SDUI cache
 * مسح ذاكرة التخزين المؤقت لـ SDUI
 */
export const clearSDUICache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const sduiKeys = keys.filter(key => key.startsWith(SDUI_CACHE_KEY));
    await AsyncStorage.multiRemove(sduiKeys);
    console.log('✅ تم مسح ذاكرة SDUI');
  } catch (error) {
    console.error('❌ خطأ في مسح ذاكرة SDUI:', error);
  }
};

// ========================================
// Home Page Config API
// إعدادات الصفحة الرئيسية
// ========================================

const HOME_PAGE_CONFIG_CACHE_KEY = 'home_page_config';

export interface HomeHighlightItem {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  order: number;
  builtIn: boolean;
}

export interface HomeSectionItem {
  id: string;
  name: string;
  titleAr: string;
  titleEn: string;
  enabled: boolean;
  order: number;
}

export interface DailyContentConfig {
  storyMode: 'auto' | 'manual';
  storyVerse: { surah: number; ayah: number } | null;
  storyCustomText: string;
  verseMode: 'auto' | 'manual';
  verse: { surah: number; ayah: number } | null;
  verseCustomText: string;
}

export interface HomeThemeConfig {
  primary: string;
  accent: string;
  background: string;
  cardBackground: string;
  textPrimary: string;
  textSecondary: string;
  headerGradientStart: string;
  headerGradientEnd: string;
  backgroundImageUrl: string;
  appIconUrl: string;
}

export interface QuickAccessItem {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  color: string;
  enabled: boolean;
  order: number;
  route?: string;
}

export interface HomePageConfig {
  highlights: { items: HomeHighlightItem[] };
  sections: { items: HomeSectionItem[] };
  quickAccess?: { items: QuickAccessItem[] };
  dailyContent: DailyContentConfig;
  theme: HomeThemeConfig;
  updatedAt?: string;
}

/**
 * Fetch home page configuration from Firestore
 * جلب إعدادات الصفحة الرئيسية
 */
export const fetchHomePageConfig = async (): Promise<HomePageConfig | null> => {
  try {
    console.log('🔄 جاري جلب إعدادات الصفحة الرئيسية...');

    const docRef = doc(db, 'appConfig', 'homePageConfig');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as HomePageConfig;

      // Cache locally
      await AsyncStorage.setItem(HOME_PAGE_CONFIG_CACHE_KEY, JSON.stringify(data));

      console.log('✅ تم جلب إعدادات الصفحة الرئيسية');
      return data;
    } else {
      console.log('⚠️ لا توجد إعدادات للصفحة الرئيسية في Firebase');
    }
  } catch (error) {
    console.log('❌ خطأ في جلب إعدادات الصفحة الرئيسية:', error);
  }

  // Try cache
  try {
    const cached = await AsyncStorage.getItem(HOME_PAGE_CONFIG_CACHE_KEY);
    if (cached) {
      console.log('✅ تم استخدام إعدادات الصفحة الرئيسية المحفوظة');
      return JSON.parse(cached);
    }
  } catch (error) {
    console.log('⚠️ فشل قراءة Cache للصفحة الرئيسية');
  }

  return null;
};

/**
 * Subscribe to real-time updates for home page config
 * الاشتراك في تحديثات إعدادات الصفحة الرئيسية
 */
// Manifest-gated one-shot read of home page config. Returns a no-op unsubscribe.
export const subscribeToHomePageConfig = (
  onUpdate: (config: HomePageConfig) => void,
  onError?: (error: Error) => void
): (() => void) => {
  (async () => {
    try {
      if (!(await shouldRefetchContent('homePageConfig'))) return;
      const docSnap = await getDoc(doc(db, 'appConfig', 'homePageConfig'));
      await markContentFetched('homePageConfig');
      if (!docSnap.exists()) return;
      const data = docSnap.data() as HomePageConfig;
      await AsyncStorage.setItem(HOME_PAGE_CONFIG_CACHE_KEY, JSON.stringify(data));
      onUpdate(data);
    } catch (error) {
      logFirestoreError('خطأ في تحديثات الصفحة الرئيسية', error);
      if (onError) onError(error as Error);
    }
  })();
  return () => {};
};

// ==================== الصفحات المؤقتة ====================

export interface TempPageBlock {
  id: string;
  icon: string;
  text: string;
  translations?: Record<string, string>;
}

export interface TempPageCtaButton {
  enabled: boolean;
  label: string;
  labelEn?: string;
  labels?: Record<string, string>;
  route: string;
  color?: string;
}

export interface TempPage {
  id: string;
  title: string;
  titleEn?: string;
  titles?: Record<string, string>;
  icon: string;
  color: string;
  contentMode?: 'html' | 'blocks';
  htmlContent: string;
  htmlContentEn?: string;
  blocks?: TempPageBlock[];
  startDate: string;
  endDate: string;
  isPermanent?: boolean;
  enabled: boolean;
  ctaButton?: TempPageCtaButton;
}

/**
 * جلب الصفحات المؤقتة النشطة حالياً
 */
export const fetchActiveTempPages = async (): Promise<TempPage[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'tempPages'));
    const now = new Date();
    const active: TempPage[] = [];

    snapshot.forEach(doc => {
      const data = doc.data() as TempPage;
      if (!data.enabled) return;
      if (data.isPermanent) {
        active.push({ ...data, id: doc.id });
      } else {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        if (now >= start && now <= end) {
          active.push({ ...data, id: doc.id });
        }
      }
    });

    await AsyncStorage.setItem('@temp_pages_cache', JSON.stringify(active));
    return active;
  } catch (error) {
    logFirestoreError('Error fetching temp pages', error);
    const cached = await AsyncStorage.getItem('@temp_pages_cache');
    if (cached) {
      try {
        return JSON.parse(cached) as TempPage[];
      } catch {
        return [];
      }
    }
    return [];
  }
};

/**
 * جلب صفحة مؤقتة بالمعرف
 */
export const fetchTempPageById = async (id: string): Promise<TempPage | null> => {
  try {
    const docRef = doc(db, 'tempPages', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { ...snap.data(), id: snap.id } as TempPage;
  } catch (error) {
    logFirestoreError('Error fetching temp page', error);
    return null;
  }
};
