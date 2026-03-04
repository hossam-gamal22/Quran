// lib/remote-config.ts
import { initializeApp, getApps } from 'firebase/app';
import { 
  getRemoteConfig, 
  fetchAndActivate, 
  getValue,
  RemoteConfig
} from 'firebase/remote-config';

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAojqduIulMDaUVTjtrtL2tIE5q_NwOH1A",
  authDomain: "rooh-almuslim.firebaseapp.com",
  projectId: "rooh-almuslim",
  storageBucket: "rooh-almuslim.firebasestorage.app",
  messagingSenderId: "328160076358",
  appId: "1:328160076358:web:fe5ec8e8b07355f1c06047"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let remoteConfig: RemoteConfig | null = null;

// ==================== Types ====================

export interface AppConfig {
  // App Settings
  app_version: string;
  min_supported_version: string;
  force_update: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
  
  // Features
  ads_enabled: boolean;
  premium_enabled: boolean;
  notifications_enabled: boolean;
  
  // Content
  daily_ayah_enabled: boolean;
  seasonal_content_enabled: boolean;
  
  // URLs
  privacy_policy_url: string;
  terms_url: string;
  support_email: string;
  
  // Themes
  default_theme: 'light' | 'dark' | 'system';
  available_themes: string[];
  
  // Prayer Settings
  default_calculation_method: number;
  default_madhab: string;

  // Branding (admin-replaceable)
  app_logo_url: string;
}

// ==================== Default Values ====================

const DEFAULT_CONFIG: AppConfig = {
  app_version: '1.0.0',
  min_supported_version: '1.0.0',
  force_update: false,
  maintenance_mode: false,
  maintenance_message: '',
  
  ads_enabled: true,
  premium_enabled: true,
  notifications_enabled: true,
  
  daily_ayah_enabled: true,
  seasonal_content_enabled: true,
  
  privacy_policy_url: 'https://rooh-almuslim.com/privacy',
  terms_url: 'https://rooh-almuslim.com/terms',
  support_email: 'support@rooh-almuslim.com',
  
  default_theme: 'system',
  available_themes: ['light', 'dark', 'emerald', 'blue', 'purple'],
  
  default_calculation_method: 4, // Umm Al-Qura
  default_madhab: 'shafi',

  app_logo_url: '',
};

// ==================== Initialize Remote Config ====================

export const initRemoteConfig = async (): Promise<void> => {
  try {
    // Remote Config is only available on native platforms
    if (typeof window !== 'undefined' && 'navigator' in window) {
      // Web platform - use defaults
      console.log('Remote Config: Using default values (web platform)');
      return;
    }
    
    remoteConfig = getRemoteConfig(app);
    
    // Set minimum fetch interval (12 hours in production, 0 for development)
    remoteConfig.settings.minimumFetchIntervalMillis = __DEV__ ? 0 : 43200000;
    
    // Set default values
    remoteConfig.defaultConfig = DEFAULT_CONFIG as any;
    
    // Fetch and activate
    await fetchAndActivate(remoteConfig);
    console.log('Remote Config: Fetched and activated successfully');
  } catch (error) {
    console.error('Remote Config: Error initializing', error);
  }
};

// ==================== Get Config Values ====================

export const getConfigValue = <K extends keyof AppConfig>(
  key: K
): AppConfig[K] => {
  if (!remoteConfig) {
    return DEFAULT_CONFIG[key];
  }
  
  try {
    const value = getValue(remoteConfig, key);
    
    // Parse based on type
    if (typeof DEFAULT_CONFIG[key] === 'boolean') {
      return value.asBoolean() as AppConfig[K];
    }
    if (typeof DEFAULT_CONFIG[key] === 'number') {
      return value.asNumber() as AppConfig[K];
    }
    if (Array.isArray(DEFAULT_CONFIG[key])) {
      try {
        return JSON.parse(value.asString()) as AppConfig[K];
      } catch {
        return DEFAULT_CONFIG[key];
      }
    }
    return value.asString() as AppConfig[K];
  } catch {
    return DEFAULT_CONFIG[key];
  }
};

// ==================== Get All Config ====================

export const getAllConfig = (): AppConfig => {
  return {
    app_version: getConfigValue('app_version'),
    min_supported_version: getConfigValue('min_supported_version'),
    force_update: getConfigValue('force_update'),
    maintenance_mode: getConfigValue('maintenance_mode'),
    maintenance_message: getConfigValue('maintenance_message'),
    
    ads_enabled: getConfigValue('ads_enabled'),
    premium_enabled: getConfigValue('premium_enabled'),
    notifications_enabled: getConfigValue('notifications_enabled'),
    
    daily_ayah_enabled: getConfigValue('daily_ayah_enabled'),
    seasonal_content_enabled: getConfigValue('seasonal_content_enabled'),
    
    privacy_policy_url: getConfigValue('privacy_policy_url'),
    terms_url: getConfigValue('terms_url'),
    support_email: getConfigValue('support_email'),
    
    default_theme: getConfigValue('default_theme'),
    available_themes: getConfigValue('available_themes'),
    
    default_calculation_method: getConfigValue('default_calculation_method'),
    default_madhab: getConfigValue('default_madhab'),

    app_logo_url: getConfigValue('app_logo_url'),
  };
};

// ==================== Check App Version ====================

export const checkAppVersion = (currentVersion: string): {
  needsUpdate: boolean;
  forceUpdate: boolean;
  message?: string;
} => {
  const minVersion = getConfigValue('min_supported_version');
  const forceUpdate = getConfigValue('force_update');
  
  const compareVersions = (v1: string, v2: string): number => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }
    return 0;
  };
  
  const needsUpdate = compareVersions(currentVersion, minVersion) < 0;
  
  return {
    needsUpdate,
    forceUpdate: needsUpdate && forceUpdate,
    message: needsUpdate ? 'يتوفر تحديث جديد للتطبيق' : undefined,
  };
};

// ==================== Check Maintenance Mode ====================

export const checkMaintenanceMode = (): {
  isInMaintenance: boolean;
  message: string;
} => {
  return {
    isInMaintenance: getConfigValue('maintenance_mode'),
    message: getConfigValue('maintenance_message'),
  };
};

export { DEFAULT_CONFIG };
