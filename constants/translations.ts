// constants/translations.ts
// ترجمات التطبيق - روح المسلم
// آخر تحديث: 2026-03-04
// 12 لغة مدعومة

export type Language = 'ar' | 'en' | 'fr' | 'de' | 'es' | 'tr' | 'ur' | 'id' | 'ms' | 'hi' | 'bn' | 'ru';

export interface TranslationKeys {
  // App
  app: {
    name: string;
    slogan: string;
  };
  
  // Tabs
  tabs: {
    home: string;
    quran: string;
    azkar: string;
    prayer: string;
    tasbih: string;
    more: string;
  };
  
  // Common
  common: {
    loading: string;
    error: string;
    retry: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    search: string;
    share: string;
    copy: string;
    copied: string;
    done: string;
    next: string;
    previous: string;
    close: string;
    confirm: string;
    yes: string;
    no: string;
    ok: string;
    settings: string;
    language: string;
    theme: string;
    notifications: string;
    about: string;
    version: string;
    noData: string;
    seeAll: string;
  };
  
  // Home
  home: {
    welcome: string;
    dailyVerse: string;
    prayerTimes: string;
    quickAccess: string;
    morningAzkar: string;
    eveningAzkar: string;
    sleepAzkar: string;
    wakeupAzkar: string;
  };
  
  // Quran
  quran: {
    title: string;
    surah: string;
    ayah: string;
    juz: string;
    page: string;
    search: string;
    searchPlaceholder: string;
    bookmarks: string;
    lastRead: string;
    continueReading: string;
    noBookmarks: string;
    addBookmark: string;
    removeBookmark: string;
    tafsir: string;
    recitation: string;
    translation: string;
    mushaf: string;
  };
  
  // Azkar
  azkar: {
    title: string;
    morning: string;
    evening: string;
    sleep: string;
    wakeup: string;
    afterPrayer: string;
    quranDuas: string;
    sunnahDuas: string;
    ruqya: string;
    count: string;
    repeat: string;
    completed: string;
    resetCount: string;
    namesOfAllah: string;
    search: string;
    favorites: string;
    noFavorites: string;
  };
  
  // Prayer
  prayer: {
    title: string;
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
    nextPrayer: string;
    timeRemaining: string;
    qibla: string;
    qiblaDirection: string;
    findQibla: string;
    mosque: string;
    athan: string;
    iqama: string;
    settings: string;
    calculationMethod: string;
    notifications: string;
    enableNotifications: string;
    beforePrayer: string;
    minutes: string;
  };
  
  // Tasbih
  tasbih: {
    title: string;
    counter: string;
    reset: string;
    total: string;
    rounds: string;
    target: string;
    vibration: string;
    sound: string;
    selectDhikr: string;
    subhanAllah: string;
    alhamdulillah: string;
    allahuAkbar: string;
    laIlahaIllallah: string;
    astaghfirullah: string;
    subhanAllahWabihamdi: string;
    laHawlaWalaQuwwata: string;
  };
  
  // Khatma
  khatma: {
    title: string;
    newKhatma: string;
    myKhatmas: string;
    progress: string;
    startDate: string;
    endDate: string;
    daily: string;
    weekly: string;
    monthly: string;
    completed: string;
    inProgress: string;
    pages: string;
    pagesPerDay: string;
    reminder: string;
    setReminder: string;
  };
  
  // Settings
  settings: {
    title: string;
    language: string;
    selectLanguage: string;
    theme: string;
    lightMode: string;
    darkMode: string;
    systemMode: string;
    notifications: string;
    prayerNotifications: string;
    azkarNotifications: string;
    dailyVerseNotification: string;
    sound: string;
    vibration: string;
    fontSize: string;
    small: string;
    medium: string;
    large: string;
    xlarge: string;
    about: string;
    rateApp: string;
    shareApp: string;
    contactUs: string;
    privacyPolicy: string;
    termsOfService: string;
  };
  
  // Calendar
  calendar: {
    title: string;
    hijriCalendar: string;
    today: string;
    months: string[];
    weekDays: string[];
    events: string;
    ramadan: string;
    hajj: string;
    eid: string;
  };
  
  // Messages
  messages: {
    success: string;
    error: string;
    networkError: string;
    savedSuccessfully: string;
    deletedSuccessfully: string;
    copiedToClipboard: string;
    sharedSuccessfully: string;
    locationRequired: string;
    notificationPermission: string;
    updateAvailable: string;
  };
}

// ==================== العربية ====================
const ar: TranslationKeys = {
  app: {
    name: 'روح المسلم',
    slogan: 'رفيقك الإيماني',
  },
  tabs: {
    home: 'الرئيسية',
    quran: 'القرآن',
    azkar: 'الأذكار',
    prayer: 'الصلاة',
    tasbih: 'التسبيح',
    more: 'المزيد',
  },
  common: {
    loading: 'جاري التحميل...',
    error: 'حدث خطأ',
    retry: 'إعادة المحاولة',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    add: 'إضافة',
    search: 'بحث',
    share: 'مشاركة',
    copy: 'نسخ',
    copied: 'تم النسخ',
    done: 'تم',
    next: 'التالي',
    previous: 'السابق',
    close: 'إغلاق',
    confirm: 'تأكيد',
    yes: 'نعم',
    no: 'لا',
    ok: 'حسناً',
    settings: 'الإعدادات',
    language: 'اللغة',
    theme: 'المظهر',
    notifications: 'الإشعارات',
    about: 'حول التطبيق',
    version: 'الإصدار',
    noData: 'لا توجد بيانات',
    seeAll: 'عرض الكل',
  },
  home: {
    welcome: 'أهلاً بك',
    dailyVerse: 'آية اليوم',
    prayerTimes: 'أوقات الصلاة',
    quickAccess: 'وصول سريع',
    morningAzkar: 'أذكار الصباح',
    eveningAzkar: 'أذكار المساء',
    sleepAzkar: 'أذكار النوم',
    wakeupAzkar: 'أذكار الاستيقاظ',
  },
  quran: {
    title: 'القرآن الكريم',
    surah: 'سورة',
    ayah: 'آية',
    juz: 'جزء',
    page: 'صفحة',
    search: 'بحث في القرآن',
    searchPlaceholder: 'ابحث عن آية أو سورة...',
    bookmarks: 'الإشارات المرجعية',
    lastRead: 'آخر قراءة',
    continueReading: 'متابعة القراءة',
    noBookmarks: 'لا توجد إشارات مرجعية',
    addBookmark: 'إضافة إشارة',
    removeBookmark: 'إزالة الإشارة',
    tafsir: 'التفسير',
    recitation: 'التلاوة',
    translation: 'الترجمة',
    mushaf: 'المصحف',
  },
  azkar: {
    title: 'الأذكار والأدعية',
    morning: 'أذكار الصباح',
    evening: 'أذكار المساء',
    sleep: 'أذكار النوم',
    wakeup: 'أذكار الاستيقاظ',
    afterPrayer: 'أذكار بعد الصلاة',
    quranDuas: 'أدعية من القرآن',
    sunnahDuas: 'أدعية من السنة',
    ruqya: 'الرقية الشرعية',
    count: 'العدد',
    repeat: 'التكرار',
    completed: 'مكتمل',
    resetCount: 'إعادة العداد',
    namesOfAllah: 'أسماء الله الحسنى',
    search: 'بحث في الأذكار',
    favorites: 'المفضلة',
    noFavorites: 'لا توجد أذكار مفضلة',
  },
  prayer: {
    title: 'أوقات الصلاة',
    fajr: 'الفجر',
    sunrise: 'الشروق',
    dhuhr: 'الظهر',
    asr: 'العصر',
    maghrib: 'المغرب',
    isha: 'العشاء',
    nextPrayer: 'الصلاة القادمة',
    timeRemaining: 'الوقت المتبقي',
    qibla: 'القبلة',
    qiblaDirection: 'اتجاه القبلة',
    findQibla: 'تحديد القبلة',
    mosque: 'المسجد',
    athan: 'الأذان',
    iqama: 'الإقامة',
    settings: 'إعدادات الصلاة',
    calculationMethod: 'طريقة الحساب',
    notifications: 'إشعارات الصلاة',
    enableNotifications: 'تفعيل الإشعارات',
    beforePrayer: 'قبل الصلاة',
    minutes: 'دقائق',
  },
  tasbih: {
    title: 'المسبحة',
    counter: 'العداد',
    reset: 'إعادة تعيين',
    total: 'المجموع',
    rounds: 'الجولات',
    target: 'الهدف',
    vibration: 'الاهتزاز',
    sound: 'الصوت',
    selectDhikr: 'اختر الذكر',
    subhanAllah: 'سبحان الله',
    alhamdulillah: 'الحمد لله',
    allahuAkbar: 'الله أكبر',
    laIlahaIllallah: 'لا إله إلا الله',
    astaghfirullah: 'أستغفر الله',
    subhanAllahWabihamdi: 'سبحان الله وبحمده',
    laHawlaWalaQuwwata: 'لا حول ولا قوة إلا بالله',
  },
  khatma: {
    title: 'الختمة',
    newKhatma: 'ختمة جديدة',
    myKhatmas: 'ختماتي',
    progress: 'التقدم',
    startDate: 'تاريخ البداية',
    endDate: 'تاريخ الانتهاء',
    daily: 'يومي',
    weekly: 'أسبوعي',
    monthly: 'شهري',
    completed: 'مكتملة',
    inProgress: 'قيد التنفيذ',
    pages: 'صفحات',
    pagesPerDay: 'صفحات يومياً',
    reminder: 'تذكير',
    setReminder: 'تعيين تذكير',
  },
  settings: {
    title: 'الإعدادات',
    language: 'اللغة',
    selectLanguage: 'اختر اللغة',
    theme: 'المظهر',
    lightMode: 'فاتح',
    darkMode: 'داكن',
    systemMode: 'تلقائي',
    notifications: 'الإشعارات',
    prayerNotifications: 'إشعارات الصلاة',
    azkarNotifications: 'إشعارات الأذكار',
    dailyVerseNotification: 'آية اليوم',
    sound: 'الصوت',
    vibration: 'الاهتزاز',
    fontSize: 'حجم الخط',
    small: 'صغير',
    medium: 'متوسط',
    large: 'كبير',
    xlarge: 'كبير جداً',
    about: 'حول التطبيق',
    rateApp: 'قيّم التطبيق',
    shareApp: 'شارك التطبيق',
    contactUs: 'تواصل معنا',
    privacyPolicy: 'سياسة الخصوصية',
    termsOfService: 'شروط الاستخدام',
  },
  calendar: {
    title: 'التقويم',
    hijriCalendar: 'التقويم الهجري',
    today: 'اليوم',
    months: ['محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'],
    weekDays: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    events: 'المناسبات',
    ramadan: 'رمضان',
    hajj: 'الحج',
    eid: 'العيد',
  },
  messages: {
    success: 'تم بنجاح',
    error: 'حدث خطأ',
    networkError: 'خطأ في الاتصال',
    savedSuccessfully: 'تم الحفظ بنجاح',
    deletedSuccessfully: 'تم الحذف بنجاح',
    copiedToClipboard: 'تم النسخ',
    sharedSuccessfully: 'تم المشاركة',
    locationRequired: 'يرجى تفعيل الموقع',
    notificationPermission: 'يرجى السماح بالإشعارات',
    updateAvailable:<span class="cursor">█</span>