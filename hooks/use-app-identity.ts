import { useSettings } from '@/contexts/SettingsContext';
import { isRTL } from '@/lib/i18n';

/**
 * هوك لتحديد هوية التطبيق (الاسم والشعار) بناءً على لغة التطبيق الحالية
 * يعرض "Rooh Al Muslim" للغات الأجنبية و"روح المسلم" للغة العربية
 */
export function useAppIdentity() {
  const { settings } = useSettings();
  const isArabic = isRTL(settings?.language);

  return {
    appName: isArabic ? 'روح المسلم' : 'Rooh Al Muslim',
    logoSource: isArabic 
      ? require('@/assets/images/icons/App-icon.png') 
      : require('@/assets/images/icons/App-icon_en.png'),
    splashLogoSource: isArabic 
      ? require('@/assets/images/icons/splash-icon.png')
      : require('@/assets/images/icons/splash-icon_en.png'),
    iconSource: isArabic
      ? require('@/assets/images/icons/icon.png')
      : require('@/assets/images/icons/icon_en.png'),
    isArabic,
  };
}
