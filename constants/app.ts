// constants/app.ts
// ثوابت التطبيق الأساسية - تُستخدم في كل مكان

import { isRTL, getLanguage } from '@/lib/i18n';

/** Returns localized app name based on current language */
const getLocalizedName = () => isRTL() ? 'رُوح المسلم' : 'Rooh Al-Muslim';

export const APP_CONFIG = {
  // اسم التطبيق
  name: 'رُوح المسلم',
  nameEn: 'Rooh Al-Muslim',
  
  // الوصف
  description: 'تطبيق إسلامي شامل للقرآن والأذكار والصلاة',
  
  // الإصدار
  version: '1.0.0',
  buildNumber: '1',
  
  // معلومات التواصل
  contact: {
    email: 'hossamgamal290@gmail.com',
    website: '',
    playStore: '',
    appStore: '',
  },
  
  // روابط التحميل (تُضاف بعد النشر)
  downloadLinks: {
    android: '',
    ios: '',
  },
  
  // التوقيع للمشاركة (language-aware)
  getShareSignature: () => {
    const name = getLocalizedName();
    const label = isRTL() ? 'تطبيق' : 'App';
    return `\n\n📱 ${label} ${name}`;
  },
  
  // رابط التحميل للمشاركة (language-aware)
  getShareWithDownload: () => {
    const name = getLocalizedName();
    const label = isRTL() ? 'تطبيق' : 'App';
    let signature = `\n\n📱 ${label} ${name}`;
    if (APP_CONFIG.downloadLinks.android) {
      const downloadLabel = isRTL() ? 'حمّل التطبيق:' : 'Download:';
      signature += `\n📥 ${downloadLabel} ${APP_CONFIG.downloadLinks.android}`;
    }
    return signature;
  },
};

// Dynamic app name export (call as function for language-aware result)
export const APP_NAME = APP_CONFIG.name;
export const getAppName = getLocalizedName;
export const APP_NAME_EN = APP_CONFIG.nameEn;
export const CONTACT_EMAIL = APP_CONFIG.contact.email;
