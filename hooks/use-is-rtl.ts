import { useSettings } from '@/contexts/SettingsContext';
import { isRTL } from '@/lib/i18n';

/**
 * هوك للتحقق من اتجاه RTL بناءً على لغة التطبيق
 * بديل لـ I18nManager.isRTL اللي مش بيشتغل صح في Expo Go
 */
export function useIsRTL(): boolean {
  const { settings } = useSettings();
  return isRTL(settings?.language);
}
