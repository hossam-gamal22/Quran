// lib/api-client.ts
// عميل API للاتصال بلوحة الإدارة - روح المسلم

import AsyncStorage from '@react-native-async-storage/async-storage';

// ========================================
// الأنواع
// ========================================

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// أنواع البيانات من لوحة الإدارة
export interface AdminSection {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  color: string;
  order: number;
  isActive: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAzkar {
  id: string;
  sectionId: string;
  textAr: string;
  textEn?: string;
  count: number;
  source: string;
  sourceType: 'quran' | 'hadith' | 'other';
  reference?: string;
  virtue?: string;
  audio?: string;
  order: number;
  isActive: boolean;
  translations: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDua {
  id: string;
  categoryId: string;
  textAr: string;
  textEn?: string;
  occasion: string;
  source: string;
  translations: Record<string, string>;
  order: number;
  isActive: boolean;
}

export interface AdminSettings {
  adRemovalPrice: number;
  defaultLanguage: string;
  supportedLanguages: string[];
  maintenanceMode: boolean;
  appVersion: string;
  forceUpdate: boolean;
  minSupportedVersion: string;
  announcements: AdminAnnouncement[];
}

export interface AdminAnnouncement {
  id: string;
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  type: 'info' | 'warning' | 'update' | 'promotion';
  isActive: boolean;
  startDate: string;
  endDate: string;
}

export interface AdminSeasonalContent {
  id: string;
  seasonType: string;
  content: any[];
  isActive: boolean;
  year: number;
}

export interface AdminAnalytics {
  totalUsers: number;
  activeUsers: number;
  dailyActiveUsers: number;
  totalSessions: number;
  averageSessionDuration: number;
  topScreens: { screen: string; views: number }[];
  topAzkar: { id: string; name: string; completions: number }[];
  deviceBreakdown: { platform: string; count: number }[];
  languageBreakdown: { language: string; count: number }[];
}

// ========================================
// الإعدادات
// ========================================

const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: 'https://api.rooh-muslim.com/v1', // سيتم تحديثه
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
};

const STORAGE_KEYS = {
  API_CONFIG: 'api_config',
  AUTH_TOKEN: 'auth_token',
  LAST_SYNC: 'last_sync',
  CACHED_DATA: 'cached_api_data',
};

// ========================================
// المتغيرات
// ========================================

let config: ApiConfig = { ...DEFAULT_CONFIG };
let authToken: string | null = null;

// ========================================
// دوال مساعدة
// ========================================

const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

const getTimestamp = (): string => new Date().toISOString();

// ========================================
// إعداد العميل
// ========================================

export const initializeApiClient = async (customConfig?: Partial<ApiConfig>): Promise<void> => {
  try {
    // تحميل الإعدادات المحفوظة
    const savedConfig = await AsyncStorage.getItem(STORAGE_KEYS.API_CONFIG);
    if (savedConfig) {
      config = { ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) };
    }
    
    // تطبيق الإعدادات المخصصة
    if (customConfig) {
      config = { ...config, ...customConfig };
    }
    
    // تحميل التوكن
    authToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch (error) {
    console.error('Error initializing API client:', error);
  }
};

export const setBaseUrl = async (url: string): Promise<void> => {
  config.baseUrl = url;
  await AsyncStorage.setItem(STORAGE_KEYS.API_CONFIG, JSON.stringify(config));
};

export const setAuthToken = async (token: string | null): Promise<void> => {
  authToken = token;
  if (token) {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  }
};

// ========================================
// الطلبات الأساسية
// ========================================

const makeRequest = async <T>(
  endpoint: string,
  options: RequestInit = {},
  attempt: number = 1
): Promise<ApiResponse<T>> => {
  const url = `${config.baseUrl}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);
    
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    
    return {
      success: true,
      data,
      statusCode: response.status,
      timestamp: getTimestamp(),
    };
  } catch (error: any) {
    // إعادة المحاولة
    if (attempt < config.retryAttempts && !error.name?.includes('Abort')) {
      await delay(config.retryDelay * attempt);
      return makeRequest<T>(endpoint, options, attempt + 1);
    }
    
    return {
      success: false,
      error: error.message || 'Unknown error',
      statusCode: 0,
      timestamp: getTimestamp(),
    };
  }
};

// GET request
export const get = <T>(endpoint: string): Promise<ApiResponse<T>> => {
  return makeRequest<T>(endpoint, { method: 'GET' });
};

// POST request
export const post = <T>(endpoint: string, body: any): Promise<ApiResponse<T>> => {
  return makeRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

// PUT request
export const put = <T>(endpoint: string, body: any): Promise<ApiResponse<T>> => {
  return makeRequest<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
};

// DELETE request
export const del = <T>(endpoint: string): Promise<ApiResponse<T>> => {
  return makeRequest<T>(endpoint, { method: 'DELETE' });
};

// ========================================
// API Endpoints - الأقسام
// ========================================

export const getSections = async (): Promise<ApiResponse<AdminSection[]>> => {
  return get<AdminSection[]>('/sections');
};

export const getSection = async (id: string): Promise<ApiResponse<AdminSection>> => {
  return get<AdminSection>(`/sections/${id}`);
};

// ========================================
// API Endpoints - الأذكار
// ========================================

export const getAzkar = async (
  sectionId?: string,
  page: number = 1,
  pageSize: number = 50
): Promise<ApiResponse<PaginatedResponse<AdminAzkar>>> => {
  let endpoint = `/azkar?page=${page}&pageSize=${pageSize}`;
  if (sectionId) {
    endpoint += `&sectionId=${sectionId}`;
  }
  return get<PaginatedResponse<AdminAzkar>>(endpoint);
};

export const getAzkarById = async (id: string): Promise<ApiResponse<AdminAzkar>> => {
  return get<AdminAzkar>(`/azkar/${id}`);
};

export const getAzkarBySection = async (sectionId: string): Promise<ApiResponse<AdminAzkar[]>> => {
  return get<AdminAzkar[]>(`/sections/${sectionId}/azkar`);
};

// ========================================
// API Endpoints - الأدعية
// ========================================

export const getDuas = async (categoryId?: string): Promise<ApiResponse<AdminDua[]>> => {
  let endpoint = '/duas';
  if (categoryId) {
    endpoint += `?categoryId=${categoryId}`;
  }
  return get<AdminDua[]>(endpoint);
};

// ========================================
// API Endpoints - الإعدادات
// ========================================

export const getSettings = async (): Promise<ApiResponse<AdminSettings>> => {
  return get<AdminSettings>('/settings');
};

export const getAnnouncements = async (): Promise<ApiResponse<AdminAnnouncement[]>> => {
  return get<AdminAnnouncement[]>('/announcements/active');
};

// ========================================
// API Endpoints - المحتوى الموسمي
// ========================================

export const getSeasonalContent = async (
  seasonType: string,
  year?: number
): Promise<ApiResponse<AdminSeasonalContent>> => {
  const currentYear = year || new Date().getFullYear();
  return get<AdminSeasonalContent>(`/seasonal/${seasonType}?year=${currentYear}`);
};

// ========================================
// API Endpoints - التحليلات (إرسال)
// ========================================

export const sendAnalytics = async (data: {
  events: any[];
  sessions: any[];
  deviceInfo: any;
}): Promise<ApiResponse<{ received: boolean }>> => {
  return post<{ received: boolean }>('/analytics', data);
};

// ========================================
// API Endpoints - التحقق من التحديثات
// ========================================

export const checkForUpdates = async (
  currentVersion: string
): Promise<ApiResponse<{
  updateAvailable: boolean;
  latestVersion: string;
  forceUpdate: boolean;
  releaseNotes?: string;
}>> => {
  return get(`/app/check-update?version=${currentVersion}`);
};

// ========================================
// المزامنة والتخزين المؤقت
// ========================================

export const syncData = async (): Promise<{
  sections: AdminSection[];
  settings: AdminSettings;
  announcements: AdminAnnouncement[];
}> => {
  const [sectionsRes, settingsRes, announcementsRes] = await Promise.all([
    getSections(),
    getSettings(),
    getAnnouncements(),
  ]);
  
  const data = {
    sections: sectionsRes.data || [],
    settings: settingsRes.data || {} as AdminSettings,
    announcements: announcementsRes.data || [],
  };
  
  // حفظ في التخزين المؤقت
  await AsyncStorage.setItem(STORAGE_KEYS.CACHED_DATA, JSON.stringify(data));
  await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, getTimestamp());
  
  return data;
};

export const getCachedData = async (): Promise<{
  sections: AdminSection[];
  settings: AdminSettings;
  announcements: AdminAnnouncement[];
} | null> => {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_DATA);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error('Error getting cached data:', error);
  }
  return null;
};

export const getLastSyncTime = async (): Promise<string | null> => {
  return AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
};

// ========================================
// تصدير موحد
// ========================================

const ApiClient = {
  // الإعداد
  initialize: initializeApiClient,
  setBaseUrl,
  setAuthToken,
  
  // الطلبات الأساسية
  get,
  post,
  put,
  delete: del,
  
  // الأقسام
  getSections,
  getSection,
  
  // الأذكار
  getAzkar,
  getAzkarById,
  getAzkarBySection,
  
  // الأدعية
  getDuas,
  
  // الإعدادات
  getSettings,
  getAnnouncements,
  
  // المحتوى الموسمي
  getSeasonalContent,
  
  // التحليلات
  sendAnalytics,
  
  // التحديثات
  checkForUpdates,
  
  // المزامنة
  syncData,
  getCachedData,
  getLastSyncTime,
};

export default ApiClient;
