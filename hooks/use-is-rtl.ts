import { isRTL } from '@/lib/i18n';

/**
 * هوك للتحقق من اتجاه RTL بناءً على لغة التطبيق المختارة
 * يقرأ من isRTL() في lib/i18n.ts الذي يتحقق من currentLanguage
 * لا يعتمد على I18nManager.isRTL لأنه يعكس لغة الجهاز وليس التطبيق
 */
export function useIsRTL(): boolean {
  return isRTL();
}
