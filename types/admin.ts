// types/admin.ts

// إعدادات التطبيق
export interface AppSettings {
  appName: string;
  appVersion: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  forceUpdate: boolean;
  minVersion: string;
}

// إعدادات الإعلانات
export interface AdUnitIds {
  android: string;
  ios: string;
}

export interface AdSettings {
  enabled: boolean;
  bannerAdId: AdUnitIds;
  interstitialAdId: AdUnitIds;
  appOpenAdId: AdUnitIds;
  bannerScreens: Record<string, boolean>;
  showAdOnAppOpen: boolean;
  showAdOnQiblaStyleChange: boolean;
  interstitialMode: 'pages' | 'time' | 'session';
  interstitialFrequency: number;
  interstitialTimeInterval: number;
  interstitialSessionLimit: number;
  delayFirstAd: boolean;
  firstAdDelay: number;
  updatedAt?: string;
}

// أسعار الاشتراكات حسب البلد
export interface CountryPricing {
  countryCode: string;
  countryName: string;
  currency: string;
  currencySymbol: string;
  monthlyPrice: number;
  yearlyPrice: number;
  isActive: boolean;
}

// المحتوى الديناميكي (آية اليوم، إعلانات، نصائح)
export interface DynamicContent {
  id: string;
  type: 'ayah' | 'hadith' | 'tip' | 'announcement' | 'banner';
  title: string;
  titleAr: string;
  content: string;
  contentAr: string;
  imageUrl?: string;
  linkUrl?: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  priority: number;
  targetScreen?: string;
}

// الإشعارات
export interface PushNotification {
  id: string;
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
  imageUrl?: string;
  scheduledTime: string;
  repeat: 'once' | 'daily' | 'weekly';
  isActive: boolean;
  sentCount: number;
  targetAudience: 'all' | 'premium' | 'free';
}

// القراء
export interface ReciterConfig {
  id: string;
  name: string;
  nameAr: string;
  photoUrl: string;
  audioBaseUrl: string;
  isActive: boolean;
  isPremium: boolean;
  sortOrder: number;
}

// المستخدم المشترك
export interface Subscriber {
  id: string;
  odPaymentId: string;
  email: string;
  phone?: string;
  country: string;
  subscriptionType: 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  isActive: boolean;
  amount: number;
  currency: string;
}

// إحصائيات
export interface AppStats {
  totalUsers: number;
  activeUsers: number;
  premiumUsers: number;
  totalRevenue: number;
  todayRevenue: number;
  topCountries: { country: string; count: number }[];
}

// إعدادات الأدمن
export interface AdminUser {
  uid: string;
  email: string;
  role: 'super_admin' | 'admin' | 'editor';
  lastLogin: string;
}
