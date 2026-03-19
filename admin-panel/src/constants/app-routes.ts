// admin-panel/src/constants/app-routes.ts
// دليل جميع المسارات (Routes) في تطبيق روح المسلم
// يُستخدم كمرجع موحد في لوحة التحكم

export interface AppRoute {
  path: string;
  label: string;
  category: string;
  description?: string;
  dynamic?: boolean; // has dynamic params like [id]
}

// ==================== التبويبات الرئيسية ====================
export const TAB_ROUTES: AppRoute[] = [
  { path: '/(tabs)', label: 'الرئيسية', category: 'tabs', description: 'الصفحة الرئيسية' },
  { path: '/(tabs)/quran', label: 'القرآن', category: 'tabs', description: 'صفحة القرآن الكريم' },
  { path: '/(tabs)/tasbih', label: 'التسبيح', category: 'tabs', description: 'صفحة التسبيح والعداد' },
  { path: '/(tabs)/prayer', label: 'الصلاة', category: 'tabs', description: 'مواقيت الصلاة' },
  { path: '/(tabs)/settings', label: 'الإعدادات', category: 'tabs', description: 'إعدادات التطبيق' },
];

// ==================== صفحات تبويبات مخفية ====================
export const HIDDEN_TAB_ROUTES: AppRoute[] = [
  { path: '/(tabs)/azkar', label: 'الأذكار', category: 'tabs-hidden', description: 'قائمة فئات الأذكار' },
  { path: '/(tabs)/favorites', label: 'المحفوظات', category: 'tabs-hidden' },
  { path: '/(tabs)/hijri-calendar', label: 'التقويم الهجري', category: 'tabs-hidden' },
  { path: '/(tabs)/khatm', label: 'خطط الختمة', category: 'tabs-hidden' },
  { path: '/(tabs)/notifications-center', label: 'مركز الإشعارات', category: 'tabs-hidden' },
  { path: '/(tabs)/qibla', label: 'القبلة', category: 'tabs-hidden' },
  { path: '/(tabs)/quran-search', label: 'بحث القرآن', category: 'tabs-hidden' },
  { path: '/(tabs)/recitations', label: 'التلاوات', category: 'tabs-hidden' },
  { path: '/(tabs)/tafsir-search', label: 'بحث التفسير', category: 'tabs-hidden' },
  { path: '/(tabs)/wird', label: 'الورد', category: 'tabs-hidden' },
];

// ==================== الأذكار ====================
export const AZKAR_ROUTES: AppRoute[] = [
  { path: '/azkar/morning', label: 'أذكار الصباح', category: 'azkar' },
  { path: '/azkar/evening', label: 'أذكار المساء', category: 'azkar' },
  { path: '/azkar/sleep', label: 'أذكار النوم', category: 'azkar' },
  { path: '/azkar/wakeup', label: 'أذكار الاستيقاظ', category: 'azkar' },
  { path: '/azkar/after_prayer', label: 'أذكار بعد الصلاة', category: 'azkar' },
  { path: '/azkar/[category]', label: 'فئة أذكار (ديناميكي)', category: 'azkar', dynamic: true },
  { path: '/azkar-search', label: 'بحث الأذكار', category: 'azkar' },
  { path: '/azkar-reminder', label: 'تذكير الأذكار', category: 'azkar', description: 'يحول إلى /settings/notifications' },
];

// ==================== القرآن والتفسير ====================
export const QURAN_ROUTES: AppRoute[] = [
  { path: '/surah/[id]', label: 'صفحة سورة (ديناميكي)', category: 'quran', dynamic: true, description: 'مثال: /surah/2 لسورة البقرة' },
  { path: '/surah/2?ayah=255', label: 'آية الكرسي', category: 'quran' },
  { path: '/surah/18', label: 'سورة الكهف', category: 'quran' },
  { path: '/surah/36', label: 'سورة يس', category: 'quran' },
  { path: '/surah/67', label: 'سورة الملك', category: 'quran' },
  { path: '/tafsir/[surah]', label: 'تفسير سورة (ديناميكي)', category: 'quran', dynamic: true },
  { path: '/browse-tafsir', label: 'تصفح التفسير', category: 'quran' },
  { path: '/quran-bookmarks', label: 'إشارات المصحف', category: 'quran' },
  { path: '/daily-ayah', label: 'آية اليوم', category: 'quran' },
];

// ==================== المحتوى اليومي ====================
export const DAILY_ROUTES: AppRoute[] = [
  { path: '/daily-ayah', label: 'آية اليوم', category: 'daily' },
  { path: '/daily-dua', label: 'دعاء اليوم', category: 'daily' },
  { path: '/daily-dhikr', label: 'ذكر اليوم', category: 'daily' },
  { path: '/hadith-of-day', label: 'حديث اليوم', category: 'daily' },
  { path: '/quote-of-day', label: 'اقتباس اليوم', category: 'daily' },
  { path: '/story-of-day', label: 'قصة اليوم', category: 'daily' },
];

// ==================== العبادات ====================
export const WORSHIP_ROUTES: AppRoute[] = [
  { path: '/worship-tracker', label: 'تتبع العبادات', category: 'worship' },
  { path: '/worship-tracker/prayer', label: 'تتبع الصلاة', category: 'worship' },
  { path: '/worship-tracker/quran', label: 'تتبع القرآن', category: 'worship' },
  { path: '/worship-tracker/fasting', label: 'تتبع الصيام', category: 'worship' },
  { path: '/worship-tracker/azkar', label: 'تتبع الأذكار', category: 'worship' },
  { path: '/tasbih-stats', label: 'إحصائيات التسبيح', category: 'worship' },
  { path: '/honor-board', label: 'لوحة الشرف', category: 'worship' },
];

// ==================== الحج والعمرة ====================
export const HAJJ_ROUTES: AppRoute[] = [
  { path: '/hajj-umrah', label: 'الحج والعمرة', category: 'hajj' },
  { path: '/hajj', label: 'مناسك الحج', category: 'hajj' },
  { path: '/umrah', label: 'مناسك العمرة', category: 'hajj' },
];

// ==================== القصص والسيرة ====================
export const STORIES_ROUTES: AppRoute[] = [
  { path: '/seerah', label: 'السيرة النبوية', category: 'stories' },
  { path: '/companions', label: 'قصص الصحابة', category: 'stories' },
];

// ==================== ميزات إسلامية ====================
export const ISLAMIC_ROUTES: AppRoute[] = [
  { path: '/names', label: 'أسماء الله الحسنى', category: 'islamic' },
  { path: '/ruqya', label: 'الرقية الشرعية', category: 'islamic' },
  { path: '/hijri', label: 'التقويم الهجري', category: 'islamic' },
  { path: '/radio', label: 'إذاعة القرآن', category: 'islamic' },
  { path: '/ayat-universe', label: 'آيات الكون', category: 'islamic' },
  { path: '/hadith-sifat', label: 'أحاديث الصفات', category: 'islamic' },
  { path: '/quran-reminder', label: 'تذكير بالقرآن', category: 'islamic' },
];

// ==================== الإعدادات ====================
export const SETTINGS_ROUTES: AppRoute[] = [
  { path: '/settings/display', label: 'إعدادات العرض', category: 'settings' },
  { path: '/settings/language', label: 'اللغة', category: 'settings' },
  { path: '/settings/notifications', label: 'الإشعارات', category: 'settings' },
  { path: '/settings/quran', label: 'إعدادات القرآن', category: 'settings' },
  { path: '/settings/backup', label: 'النسخ الاحتياطي', category: 'settings' },
  { path: '/settings/about', label: 'عن التطبيق', category: 'settings' },
  { path: '/settings/privacy-policy', label: 'سياسة الخصوصية', category: 'settings' },
  { path: '/settings/terms-of-use', label: 'شروط الاستخدام', category: 'settings' },
  { path: '/settings/translations', label: 'الترجمات', category: 'settings' },
  { path: '/settings/photo-backgrounds', label: 'خلفيات الصور', category: 'settings' },
  { path: '/settings/prayer-adjustments', label: 'تعديلات الصلاة', category: 'settings' },
  { path: '/settings/prayer-calculation', label: 'طريقة الحساب', category: 'settings' },
  { path: '/settings/prayer-layout', label: 'تخطيط الصلاة', category: 'settings' },
  { path: '/settings/live-activities', label: 'الأنشطة الحية', category: 'settings' },
  { path: '/settings/worship-tracking', label: 'تتبع العبادات', category: 'settings' },
  { path: '/settings/custom-dhikr', label: 'أذكار مخصصة', category: 'settings' },
];

// ==================== الختمة ====================
export const KHATMA_ROUTES: AppRoute[] = [
  { path: '/khatma', label: 'ختمة القرآن', category: 'khatma' },
  { path: '/khatma/new', label: 'ختمة جديدة', category: 'khatma' },
  { path: '/khatma/wird', label: 'الورد اليومي', category: 'khatma' },
];

// ==================== المواسم ====================
export const SEASONAL_ROUTES: AppRoute[] = [
  { path: '/seasonal', label: 'المحتوى الموسمي', category: 'seasonal' },
  { path: '/seasonal/ramadan', label: 'صفحة رمضان', category: 'seasonal' },
  { path: '/seasonal/hajj', label: 'صفحة الحج', category: 'seasonal' },
  { path: '/seasonal/mawlid', label: 'صفحة المولد', category: 'seasonal' },
  { path: '/seasonal/ashura', label: 'صفحة عاشوراء', category: 'seasonal' },
];

// ==================== صفحات أخرى ====================
export const OTHER_ROUTES: AppRoute[] = [
  { path: '/all-favorites', label: 'جميع المحفوظات', category: 'other' },
  { path: '/subscription', label: 'الاشتراك', category: 'other' },
  { path: '/widget-settings', label: 'إعدادات الودجات', category: 'other' },
  { path: '/widgets-gallery', label: 'معرض الودجات', category: 'other' },
  { path: '/webview', label: 'صفحة ويب', category: 'other' },
  { path: '/night-reading', label: 'قراءة الليل', category: 'other', description: 'يحول إلى /(tabs)/quran' },
  { path: '/temp-page/[id]', label: 'صفحة مؤقتة (ديناميكي)', category: 'other', dynamic: true },
  { path: '/sdui/[screenId]', label: 'صفحة SDUI (ديناميكي)', category: 'other', dynamic: true },
];

// ==================== Onboarding ====================
export const ONBOARDING_ROUTES: AppRoute[] = [
  { path: '/onboarding', label: 'التأهيل', category: 'onboarding' },
  { path: '/onboarding/welcome', label: 'الترحيب', category: 'onboarding' },
  { path: '/onboarding/language', label: 'اختيار اللغة', category: 'onboarding' },
  { path: '/onboarding/location', label: 'الموقع', category: 'onboarding' },
  { path: '/onboarding/notifications', label: 'الإشعارات', category: 'onboarding' },
  { path: '/onboarding/complete', label: 'اكتمال', category: 'onboarding' },
];

// ==================== جميع المسارات ====================
export const ALL_ROUTES: AppRoute[] = [
  ...TAB_ROUTES,
  ...HIDDEN_TAB_ROUTES,
  ...AZKAR_ROUTES,
  ...QURAN_ROUTES,
  ...DAILY_ROUTES,
  ...WORSHIP_ROUTES,
  ...HAJJ_ROUTES,
  ...STORIES_ROUTES,
  ...ISLAMIC_ROUTES,
  ...SETTINGS_ROUTES,
  ...KHATMA_ROUTES,
  ...SEASONAL_ROUTES,
  ...OTHER_ROUTES,
  ...ONBOARDING_ROUTES,
];

// ==================== Route Options for Pickers ====================
// مسارات صالحة للاستخدام في اختيار الروابط (بدون الديناميكية)
export const ROUTE_PICKER_OPTIONS = ALL_ROUTES
  .filter(r => !r.dynamic)
  .map(r => ({ value: r.path, label: r.label }));

// ==================== Route Categories ====================
export const ROUTE_CATEGORIES = [
  { id: 'tabs', label: 'التبويبات الرئيسية', icon: '🏠', routes: TAB_ROUTES },
  { id: 'azkar', label: 'الأذكار', icon: '📿', routes: AZKAR_ROUTES.filter(r => !r.dynamic) },
  { id: 'quran', label: 'القرآن والتفسير', icon: '📖', routes: QURAN_ROUTES.filter(r => !r.dynamic) },
  { id: 'daily', label: 'المحتوى اليومي', icon: '🌅', routes: DAILY_ROUTES },
  { id: 'worship', label: 'العبادات', icon: '🕌', routes: WORSHIP_ROUTES },
  { id: 'hajj', label: 'الحج والعمرة', icon: '🕋', routes: HAJJ_ROUTES },
  { id: 'stories', label: 'القصص والسيرة', icon: '📚', routes: STORIES_ROUTES },
  { id: 'islamic', label: 'ميزات إسلامية', icon: '☪️', routes: ISLAMIC_ROUTES },
  { id: 'khatma', label: 'الختمة', icon: '📗', routes: KHATMA_ROUTES },
  { id: 'seasonal', label: 'المواسم', icon: '🌙', routes: SEASONAL_ROUTES },
  { id: 'settings', label: 'الإعدادات', icon: '⚙️', routes: SETTINGS_ROUTES },
  { id: 'other', label: 'أخرى', icon: '📄', routes: OTHER_ROUTES.filter(r => !r.dynamic) },
];
