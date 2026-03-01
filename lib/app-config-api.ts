// lib/app-config-api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG } from '../constants/app';

const API_BASE_URL = 'YOUR_ADMIN_PANEL_API_URL'; // ← ضع رابط API الخاص بك

export interface RemoteAppConfig {
  name: string;
  nameEn: string;
  description: string;
  version: string;
  logoUrl: string;
  primaryColor: string;
  contact: {
    email: string;
    website: string;
  };
  downloadLinks: {
    android: string;
    ios: string;
  };
}

// جلب الإعدادات من السيرفر
export const fetchAppConfig = async (): Promise<RemoteAppConfig | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/app-config`);
    if (!response.ok) throw new Error('Failed to fetch config');
    
    const data = await response.json();
    
    // حفظ في AsyncStorage للاستخدام offline
    await AsyncStorage.setItem('remote_app_config', JSON.stringify(data));
    
    return data;
  } catch (error) {
    console.error('Error fetching app config:', error);
    
    // في حالة الخطأ، استخدم النسخة المحفوظة
    const cached = await AsyncStorage.getItem('remote_app_config');
    if (cached) return JSON.parse(cached);
    
    return null;
  }
};

// الحصول على الإعدادات (من السيرفر أو الثوابت)
export const getAppConfig = async () => {
  const remote = await fetchAppConfig();
  
  return {
    name: remote?.name || APP_CONFIG.name,
    nameEn: remote?.nameEn || APP_CONFIG.nameEn,
    description: remote?.description || APP_CONFIG.description,
    version: remote?.version || APP_CONFIG.version,
    contact: remote?.contact || APP_CONFIG.contact,
    downloadLinks: remote?.downloadLinks || APP_CONFIG.downloadLinks,
  };
};
