import { I18nManager } from 'react-native';

/**
 * هوك للتحقق من اتجاه RTL بناءً على I18nManager
 * يتم ضبط I18nManager.forceRTL عند بدء التطبيق وعند تغيير اللغة
 * في lib/i18n.ts و contexts/SettingsContext.tsx
 */
export function useIsRTL(): boolean {
  return I18nManager.isRTL;
}
