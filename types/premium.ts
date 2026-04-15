// types/premium.ts
// أنواع نظام البريميوم وبوابة الميزات

/** مفاتيح الميزات القابلة للتحكم */
export type PremiumFeatureKey =
  | 'ad_removal'
  | 'exclusive_themes'
  | 'sound_downloads'
  | 'cloud_backup'
  | 'advanced_stats'
  | 'custom_backgrounds'
  | 'multiple_khatma'
  | 'premium_widgets'
  | 'widget_themes';

/** إعدادات ميزة واحدة */
export interface FeatureGateEntry {
  /** هل هذه الميزة للبريميوم فقط؟ */
  premiumOnly: boolean;
}

/** إعدادات كل الميزات — من Firestore config/feature-gating */
export type FeatureGatingConfig = Record<PremiumFeatureKey, FeatureGateEntry>;

/** بيانات منح البريميوم يدوياً من الأدمن */
export interface AdminGrantedPremium {
  granted: boolean;
  grantedBy: string;
  grantedAt: string;
  expiresAt: string | null;
  reason?: string;
  plan?: 'monthly' | 'yearly' | 'lifetime';
}

/** إعدادات العروض الموسمية */
export interface SeasonalOffer {
  enabled: boolean;
  title: string;
  description: string;
  discountPercent: number;
  startDate: string;
  endDate: string;
}

/** مصدر البريميوم */
export type PremiumSource = 'iap' | 'admin' | null;
