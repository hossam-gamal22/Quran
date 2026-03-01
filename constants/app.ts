// constants/app.ts
// ثوابت التطبيق الأساسية - تُستخدم في كل مكان

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
  
  // التوقيع للمشاركة
  getShareSignature: () => `\n\n📱 تطبيق ${APP_CONFIG.name}`,
  
  // رابط التحميل للمشاركة
  getShareWithDownload: () => {
    let signature = `\n\n📱 تطبيق ${APP_CONFIG.name}`;
    if (APP_CONFIG.downloadLinks.android) {
      signature += `\n📥 حمّل التطبيق: ${APP_CONFIG.downloadLinks.android}`;
    }
    return signature;
  },
};

// تصدير الاسم مباشرة للاستخدام السريع
export const APP_NAME = APP_CONFIG.name;
export const APP_NAME_EN = APP_CONFIG.nameEn;
export const CONTACT_EMAIL = APP_CONFIG.contact.email;
