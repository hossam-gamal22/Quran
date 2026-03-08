// lib/app-config-api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { APP_CONFIG } from '../constants/app';

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAojqduIulMDaUVTjtrtL2tIE5q_NwOH1A",
  authDomain: "rooh-almuslim.firebaseapp.com",
  projectId: "rooh-almuslim",
  storageBucket: "rooh-almuslim.firebasestorage.app",
  messagingSenderId: "328160076358",
  appId: "1:328160076358:web:fe5ec8e8b07355f1c06047"
};

// Initialize Firebase (مرة واحدة فقط)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export interface WelcomeBannerConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  route: string;
  displayMode?: 'text' | 'text_image' | 'image_only';
  backgroundImage?: string;
}

export interface HighlightItemConfig {
  id: string;
  enabled: boolean;
  title: string;
  icon: string;
  color: string;
  route: string;
  routeType: 'internal' | 'url' | 'html';
  imageUrl?: string;
  htmlContent?: string;
  order: number;
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
  features: {
    quran: boolean;
    azkar: boolean;
    prayer: boolean;
    qibla: boolean;
    tasbih: boolean;
    names: boolean;
    ruqyah: boolean;
    hijri: boolean;
  };
  welcomeBanner?: WelcomeBannerConfig;
  highlights?: HighlightItemConfig[];
  uiCustomization?: UICustomizationConfig;
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
  version: '1.0.0',
  primaryColor: '#1B4332',
  maintenanceMode: false,
  forceUpdate: false,
  minVersion: '1.0.0',
  contact: {
    email: 'hossamgamal290@gmail.com',
    website: '',
  },
  downloadLinks: {
    android: '',
    ios: '',
  },
  features: {
    quran: true,
    azkar: true,
    prayer: true,
    qibla: true,
    tasbih: true,
    names: true,
    ruqyah: true,
    hijri: true,
  },
  uiCustomization: DEFAULT_UI_CUSTOMIZATION,
};

// جلب الإعدادات من Firebase
export const fetchAppConfig = async (): Promise<RemoteAppConfig> => {
  try {
    console.log('🔄 جاري جلب الإعدادات من Firebase...');
    
    const docRef = doc(db, 'config', 'app-settings');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as RemoteAppConfig;
      
      // حفظ في AsyncStorage للاستخدام offline
      await AsyncStorage.setItem('remote_app_config', JSON.stringify(data));
      
      console.log('✅ تم جلب الإعدادات من Firebase بنجاح');
      return { ...DEFAULT_REMOTE_CONFIG, ...data };
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
      return { ...DEFAULT_REMOTE_CONFIG, ...JSON.parse(cached) };
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

// اشتراك في التحديثات المباشرة من Firebase
export const subscribeToAppConfig = (
  onUpdate: (config: RemoteAppConfig) => void,
  onError?: (error: Error) => void
): (() => void) => {
  const docRef = doc(db, 'config', 'app-settings');
  
  const unsubscribe = onSnapshot(
    docRef,
    async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as RemoteAppConfig;
        const mergedConfig = { ...DEFAULT_REMOTE_CONFIG, ...data };
        
        // حفظ في AsyncStorage للاستخدام offline
        await AsyncStorage.setItem('remote_app_config', JSON.stringify(mergedConfig));
        
        console.log('🔄 تم تحديث الإعدادات من Firebase (Real-time)');
        onUpdate(mergedConfig);
      }
    },
    (error) => {
      console.error('❌ خطأ في الاشتراك بتحديثات Firebase:', error);
      if (onError) onError(error);
    }
  );
  
  return unsubscribe;
};

// ========================================
// واجهة وAPI الخلفيات الديناميكية
// ========================================

export interface DynamicBackground {
  id: string;
  name: string;
  thumbnailUrl: string;
  fullUrl: string;
  enabled: boolean;
  order: number;
  textColor?: 'white' | 'black';
  createdAt?: string;
}

// جلب الخلفيات الديناميكية من Firebase
export const fetchDynamicBackgrounds = async (): Promise<DynamicBackground[]> => {
  try {
    console.log('🔄 جاري جلب الخلفيات الديناميكية...');
    
    const backgroundsRef = collection(db, 'backgrounds');
    const q = query(
      backgroundsRef,
      where('enabled', '==', true),
      orderBy('order', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    const backgrounds: DynamicBackground[] = [];
    querySnapshot.forEach((doc) => {
      backgrounds.push({
        id: doc.id,
        ...doc.data(),
      } as DynamicBackground);
    });
    
    // حفظ في AsyncStorage للاستخدام offline
    await AsyncStorage.setItem('dynamic_backgrounds', JSON.stringify(backgrounds));
    
    console.log(`✅ تم جلب ${backgrounds.length} خلفية ديناميكية`);
    return backgrounds;
  } catch (error) {
    console.log('❌ خطأ في جلب الخلفيات:', error);
  }
  
  // محاولة القراءة من Cache
  try {
    const cached = await AsyncStorage.getItem('dynamic_backgrounds');
    if (cached) {
      console.log('✅ تم استخدام الخلفيات المحفوظة (Cache)');
      return JSON.parse(cached);
    }
  } catch (error) {
    console.log('⚠️ فشل قراءة Cache للخلفيات');
  }
  
  return [];
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
      console.error(`❌ خطأ في الاشتراك بـ SDUI ${screenId}:`, error);
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
      console.error('❌ خطأ في الاشتراك بجميع شاشات SDUI:', error);
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

export interface HomePageConfig {
  highlights: { items: HomeHighlightItem[] };
  sections: { items: HomeSectionItem[] };
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
export const subscribeToHomePageConfig = (
  onUpdate: (config: HomePageConfig) => void,
  onError?: (error: Error) => void
): (() => void) => {
  const docRef = doc(db, 'appConfig', 'homePageConfig');

  const unsubscribe = onSnapshot(
    docRef,
    async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as HomePageConfig;

        await AsyncStorage.setItem(HOME_PAGE_CONFIG_CACHE_KEY, JSON.stringify(data));

        console.log('🔄 تم تحديث إعدادات الصفحة الرئيسية (Real-time)');
        onUpdate(data);
      }
    },
    (error) => {
      console.error('❌ خطأ في الاشتراك بتحديثات الصفحة الرئيسية:', error);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
};
