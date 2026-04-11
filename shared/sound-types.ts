// shared/sound-types.ts
// أنواع نظام الأصوات المشتركة - روح المسلم

/**
 * صوت مدمج في التطبيق (موجود في app.json)
 */
export interface BundledSound {
  /** معرف فريد (اسم الملف بدون الامتداد) */
  id: string;
  /** الاسم المعروض للمستخدم */
  displayName: string;
  /** تصنيف الصوت */
  category: 'notification' | 'adhan';
  /** مسار الملف في assets */
  assetPath: string;
  /** هل الصوت مفعّل للاستخدام */
  enabled: boolean;
  /** وصف اختياري */
  description?: string;
  /** ترتيب العرض */
  order: number;
}

/**
 * صوت مرفوع من الأدمن (في انتظار التضمين في البناء القادم)
 */
export interface UploadedSound {
  /** معرف Firestore */
  id: string;
  /** الاسم الأصلي للملف */
  fileName: string;
  /** الاسم المعروض */
  displayName: string;
  /** تصنيف الصوت */
  category: 'notification' | 'adhan';
  /** رابط التحميل من Firebase Storage */
  downloadUrl: string;
  /** مسار التخزين في Firebase */
  storagePath: string;
  /** حجم الملف بالبايت */
  fileSize: number;
  /** تاريخ الرفع */
  uploadedAt: string;
  /** حالة الصوت */
  status: 'pending' | 'bundled' | 'disabled';
  /** معرف الصوت المدمج (بعد التضمين في البناء) */
  bundledSoundId?: string;
}

/**
 * إعدادات الأصوات المخزنة في Firestore
 */
export interface SoundConfig {
  /** الأصوات المدمجة وإعداداتها */
  bundledSounds: BundledSound[];
  /** آخر تحديث */
  updatedAt: string;
  /** إصدار الإعدادات */
  version: number;
}

/**
 * الأصوات المدمجة الافتراضية
 */
export const DEFAULT_BUNDLED_SOUNDS: BundledSound[] = [
  // إشعارات
  { id: 'general_reminder', displayName: 'تذكير عام', category: 'notification', assetPath: './assets/sounds/general_reminder.mp3', enabled: true, order: 1 },
  { id: 'salawat', displayName: 'صلاة على النبي', category: 'notification', assetPath: './assets/sounds/salawat.mp3', enabled: true, order: 2 },
  { id: 'istighfar', displayName: 'استغفار', category: 'notification', assetPath: './assets/sounds/istighfar.mp3', enabled: true, order: 3 },
  { id: 'tasbih', displayName: 'تسبيح', category: 'notification', assetPath: './assets/sounds/tasbih.mp3', enabled: true, order: 4 },
  { id: 'subhanallah', displayName: 'سبحان الله', category: 'notification', assetPath: './assets/sounds/subhanallah.mp3', enabled: true, order: 5 },
  { id: 'alhamdulillah', displayName: 'الحمد لله', category: 'notification', assetPath: './assets/sounds/alhamdulillah.mp3', enabled: true, order: 6 },
  { id: 'morning_adhkar', displayName: 'أذكار الصباح', category: 'notification', assetPath: './assets/sounds/morning_adhkar.mp3', enabled: true, order: 7 },
  { id: 'evening_adhkar', displayName: 'أذكار المساء', category: 'notification', assetPath: './assets/sounds/evening_adhkar.mp3', enabled: true, order: 8 },
  
  // أذان
  { id: 'makkah', displayName: 'أذان مكة المكرمة', category: 'adhan', assetPath: './assets/sounds/makkah.mp3', enabled: true, order: 10 },
  { id: 'madinah', displayName: 'أذان المدينة المنورة', category: 'adhan', assetPath: './assets/sounds/madinah.mp3', enabled: true, order: 11 },
  { id: 'alaqsa', displayName: 'أذان المسجد الأقصى', category: 'adhan', assetPath: './assets/sounds/alaqsa.mp3', enabled: true, order: 12 },
  { id: 'mishary', displayName: 'مشاري العفاسي', category: 'adhan', assetPath: './assets/sounds/mishary.mp3', enabled: true, order: 13 },
  { id: 'abdulbasit', displayName: 'عبد الباسط عبد الصمد', category: 'adhan', assetPath: './assets/sounds/abdulbasit.mp3', enabled: true, order: 14 },
  { id: 'sudais', displayName: 'عبد الرحمن السديس', category: 'adhan', assetPath: './assets/sounds/sudais.mp3', enabled: true, order: 15 },
  { id: 'egypt', displayName: 'أذان مصر', category: 'adhan', assetPath: './assets/sounds/egypt.mp3', enabled: true, order: 16 },
  { id: 'dosari', displayName: 'ياسر الدوسري', category: 'adhan', assetPath: './assets/sounds/dosari.mp3', enabled: true, order: 17 },
  { id: 'ajman', displayName: 'أذان عجمان', category: 'adhan', assetPath: './assets/sounds/ajman.mp3', enabled: true, order: 18 },
  { id: 'ali_mulla', displayName: 'علي الملا', category: 'adhan', assetPath: './assets/sounds/ali_mulla.mp3', enabled: true, order: 19 },
  { id: 'naqshbandi', displayName: 'النقشبندي', category: 'adhan', assetPath: './assets/sounds/naqshbandi.mp3', enabled: true, order: 20 },
  { id: 'sharif', displayName: 'محمد شريف', category: 'adhan', assetPath: './assets/sounds/sharif.mp3', enabled: true, order: 21 },
  { id: 'mansoor_zahrani', displayName: 'منصور الزهراني', category: 'adhan', assetPath: './assets/sounds/mansoor_zahrani.mp3', enabled: true, order: 22 },
  { id: 'haramain', displayName: 'الحرمين', category: 'adhan', assetPath: './assets/sounds/haramain.mp3', enabled: true, order: 23 },
  { id: 'silent', displayName: 'صامت', category: 'adhan', assetPath: './assets/sounds/silent.mp3', enabled: true, order: 24 },
];

/**
 * Firestore paths
 */
export const FIRESTORE_PATHS = {
  SOUND_CONFIG: 'appConfig/soundSettings',
  UPLOADED_SOUNDS: 'uploadedSounds',
};
