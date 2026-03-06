// lib/seasonal-content.ts
// إدارة المحتوى الموسمي - روح المسلم

import { getHijriDate, HijriDate } from './hijri-date';

// ========================================
// الأنواع
// ========================================

export type SeasonType = 
  | 'ramadan'      // رمضان
  | 'hajj'         // موسم الحج
  | 'ashura'       // عاشوراء
  | 'mawlid'       // المولد النبوي
  | 'eid_fitr'     // عيد الفطر
  | 'eid_adha'     // عيد الأضحى
  | 'dhul_hijjah'  // العشر الأوائل من ذي الحجة
  | 'muharram'     // شهر محرم
  | 'rajab'        // شهر رجب
  | 'shaban'       // شهر شعبان
  | 'none';        // لا يوجد موسم

export interface SeasonInfo {
  type: SeasonType;
  nameAr: string;
  nameEn: string;
  description: string;
  startDate: { month: number; day: number };
  endDate: { month: number; day: number };
  color: string;
  icon: string;
  isActive: boolean;
  daysRemaining: number;
  currentDay: number;
  totalDays: number;
  specialDays?: SpecialDay[];
}

export interface SpecialDay {
  day: number;
  nameAr: string;
  nameEn: string;
  description: string;
  virtues: string[];
  recommendedActions: string[];
}

export interface SeasonalContent {
  id: string;
  seasonType: SeasonType;
  title: string;
  content: string;
  type: 'dua' | 'zikr' | 'article' | 'tip' | 'hadith' | 'verse';
  day?: number; // يوم محدد من الموسم
  priority: number;
}

export interface DailySeasonalData {
  season: SeasonInfo | null;
  content: SeasonalContent[];
  specialDay: SpecialDay | null;
  greeting: string;
}

// ========================================
// بيانات المواسم
// ========================================

const SEASONS_DATA: Record<SeasonType, Omit<SeasonInfo, 'isActive' | 'daysRemaining' | 'currentDay' | 'totalDays'>> = {
  ramadan: {
    type: 'ramadan',
    nameAr: 'رمضان المبارك',
    nameEn: 'Ramadan',
    description: 'شهر الصيام والقيام وتلاوة القرآن',
    startDate: { month: 9, day: 1 },
    endDate: { month: 9, day: 30 },
    color: '#2f7659',
    icon: 'moon-waning-crescent',
    specialDays: [
      {
        day: 1,
        nameAr: 'أول رمضان',
        nameEn: 'First of Ramadan',
        description: 'بداية شهر الخير والبركة',
        virtues: ['تُفتح أبواب الجنة', 'تُغلق أبواب النار', 'تُصفد الشياطين'],
        recommendedActions: ['تبييت النية للصيام', 'صلاة التراويح', 'قراءة القرآن'],
      },
      {
        day: 15,
        nameAr: 'منتصف رمضان',
        nameEn: 'Mid Ramadan',
        description: 'منتصف الشهر الكريم',
        virtues: ['استمرار الأجر المضاعف'],
        recommendedActions: ['المحافظة على الصيام', 'الإكثار من الذكر'],
      },
      {
        day: 21,
        nameAr: 'بداية العشر الأواخر',
        nameEn: 'Last Ten Nights Begin',
        description: 'أفضل ليالي السنة',
        virtues: ['فيها ليلة القدر', 'العتق من النار'],
        recommendedActions: ['الاعتكاف', 'قيام الليل', 'الإكثار من الدعاء'],
      },
      {
        day: 27,
        nameAr: 'ليلة السابع والعشرين',
        nameEn: 'Night of 27th',
        description: 'أرجى ليالي القدر',
        virtues: ['خير من ألف شهر', 'تنزل الملائكة'],
        recommendedActions: ['إحياء الليلة بالعبادة', 'الدعاء: اللهم إنك عفو تحب العفو فاعف عني'],
      },
    ],
  },
  hajj: {
    type: 'hajj',
    nameAr: 'موسم الحج',
    nameEn: 'Hajj Season',
    description: 'الركن الخامس من أركان الإسلام',
    startDate: { month: 12, day: 8 },
    endDate: { month: 12, day: 13 },
    color: '#8B4513',
    icon: 'star-crescent',
    specialDays: [
      {
        day: 8,
        nameAr: 'يوم التروية',
        nameEn: 'Day of Tarwiyah',
        description: 'اليوم الثامن من ذي الحجة',
        virtues: ['بداية مناسك الحج'],
        recommendedActions: ['الإحرام من مكة', 'التوجه إلى منى'],
      },
      {
        day: 9,
        nameAr: 'يوم عرفة',
        nameEn: 'Day of Arafah',
        description: 'أعظم أيام السنة',
        virtues: ['يكفر سنتين', 'أكثر يوم يعتق الله فيه من النار'],
        recommendedActions: ['صيام عرفة لغير الحاج', 'الإكثار من الدعاء', 'التلبية'],
      },
      {
        day: 10,
        nameAr: 'يوم النحر (عيد الأضحى)',
        nameEn: 'Day of Sacrifice (Eid)',
        description: 'أعظم الأيام عند الله',
        virtues: ['أفضل أيام السنة'],
        recommendedActions: ['صلاة العيد', 'ذبح الأضحية', 'التكبير'],
      },
    ],
  },
  dhul_hijjah: {
    type: 'dhul_hijjah',
    nameAr: 'العشر الأوائل من ذي الحجة',
    nameEn: 'First Ten Days of Dhul Hijjah',
    description: 'أفضل أيام الدنيا',
    startDate: { month: 12, day: 1 },
    endDate: { month: 12, day: 10 },
    color: '#DAA520',
    icon: 'star-crescent',
    specialDays: [
      {
        day: 9,
        nameAr: 'يوم عرفة',
        nameEn: 'Day of Arafah',
        description: 'أفضل يوم طلعت فيه الشمس',
        virtues: ['صيامه يكفر سنة ماضية وسنة قادمة'],
        recommendedActions: ['الصيام', 'الدعاء', 'الذكر'],
      },
    ],
  },
  ashura: {
    type: 'ashura',
    nameAr: 'يوم عاشوراء',
    nameEn: 'Day of Ashura',
    description: 'اليوم العاشر من محرم',
    startDate: { month: 1, day: 9 },
    endDate: { month: 1, day: 10 },
    color: '#4A4A4A',
    icon: 'calendar-star',
    specialDays: [
      {
        day: 9,
        nameAr: 'تاسوعاء',
        nameEn: 'Tasua',
        description: 'اليوم التاسع من محرم',
        virtues: ['صيامه مستحب مع عاشوراء'],
        recommendedActions: ['الصيام'],
      },
      {
        day: 10,
        nameAr: 'عاشوراء',
        nameEn: 'Ashura',
        description: 'نجّى الله موسى وقومه',
        virtues: ['صيامه يكفر سنة ماضية'],
        recommendedActions: ['الصيام', 'التوسعة على العيال'],
      },
    ],
  },
  mawlid: {
    type: 'mawlid',
    nameAr: 'ذكرى المولد النبوي',
    nameEn: 'Prophet\'s Birthday',
    description: 'ذكرى مولد خير البشر ﷺ',
    startDate: { month: 3, day: 12 },
    endDate: { month: 3, day: 12 },
    color: '#2E8B57',
    icon: 'star-four-points',
  },
  eid_fitr: {
    type: 'eid_fitr',
    nameAr: 'عيد الفطر المبارك',
    nameEn: 'Eid al-Fitr',
    description: 'عيد الفطر بعد رمضان',
    startDate: { month: 10, day: 1 },
    endDate: { month: 10, day: 3 },
    color: '#FFD700',
    icon: 'party-popper',
  },
  eid_adha: {
    type: 'eid_adha',
    nameAr: 'عيد الأضحى المبارك',
    nameEn: 'Eid al-Adha',
    description: 'عيد الأضحى المبارك',
    startDate: { month: 12, day: 10 },
    endDate: { month: 12, day: 13 },
    color: '#CD853F',
    icon: 'sheep',
  },
  muharram: {
    type: 'muharram',
    nameAr: 'شهر محرم',
    nameEn: 'Muharram',
    description: 'أول شهور السنة الهجرية',
    startDate: { month: 1, day: 1 },
    endDate: { month: 1, day: 30 },
    color: '#696969',
    icon: 'calendar-month',
  },
  rajab: {
    type: 'rajab',
    nameAr: 'شهر رجب',
    nameEn: 'Rajab',
    description: 'من الأشهر الحرم',
    startDate: { month: 7, day: 1 },
    endDate: { month: 7, day: 30 },
    color: '#4169E1',
    icon: 'calendar-month',
  },
  shaban: {
    type: 'shaban',
    nameAr: 'شهر شعبان',
    nameEn: 'Shaban',
    description: 'شهر ترفع فيه الأعمال',
    startDate: { month: 8, day: 1 },
    endDate: { month: 8, day: 30 },
    color: '#9370DB',
    icon: 'calendar-month',
    specialDays: [
      {
        day: 15,
        nameAr: 'ليلة النصف من شعبان',
        nameEn: 'Mid-Shaban Night',
        description: 'ليلة يطلع الله فيها على خلقه',
        virtues: ['ليلة مباركة'],
        recommendedActions: ['قيام الليل', 'الدعاء', 'الاستغفار'],
      },
    ],
  },
  none: {
    type: 'none',
    nameAr: '',
    nameEn: '',
    description: '',
    startDate: { month: 0, day: 0 },
    endDate: { month: 0, day: 0 },
    color: '#666666',
    icon: 'calendar',
  },
};

// ========================================
// دوال التحقق من الموسم
// ========================================

/**
 * حساب عدد الأيام بين تاريخين هجريين
 */
const daysBetween = (
  date1: { month: number; day: number },
  date2: { month: number; day: number }
): number => {
  // تقريب بسيط - كل شهر 30 يوم
  const days1 = (date1.month - 1) * 30 + date1.day;
  const days2 = (date2.month - 1) * 30 + date2.day;
  return days2 - days1;
};

/**
 * التحقق مما إذا كان التاريخ ضمن نطاق معين
 */
const isDateInRange = (
  current: { month: number; day: number },
  start: { month: number; day: number },
  end: { month: number; day: number }
): boolean => {
  const currentDays = (current.month - 1) * 30 + current.day;
  const startDays = (start.month - 1) * 30 + start.day;
  const endDays = (end.month - 1) * 30 + end.day;

  // التعامل مع النطاق الذي يمتد عبر نهاية السنة
  if (startDays > endDays) {
    return currentDays >= startDays || currentDays <= endDays;
  }

  return currentDays >= startDays && currentDays <= endDays;
};

/**
 * الحصول على الموسم الحالي
 */
export const getCurrentSeason = (hijriDate?: HijriDate): SeasonInfo | null => {
  const date = hijriDate || getHijriDate();
  const current = { month: date.month, day: date.day };

  // البحث عن الموسم النشط
  for (const [key, seasonData] of Object.entries(SEASONS_DATA)) {
    if (key === 'none') continue;

    if (isDateInRange(current, seasonData.startDate, seasonData.endDate)) {
      const totalDays = daysBetween(seasonData.startDate, seasonData.endDate) + 1;
      const currentDay = daysBetween(seasonData.startDate, current) + 1;

      return {
        ...seasonData,
        isActive: true,
        daysRemaining: totalDays - currentDay,
        currentDay,
        totalDays,
      };
    }
  }

  return null;
};

/**
 * الحصول على الموسم القادم
 */
export const getUpcomingSeason = (hijriDate?: HijriDate): SeasonInfo & { daysUntil: number } | null => {
  const date = hijriDate || getHijriDate();
  const current = { month: date.month, day: date.day };
  const currentDays = (current.month - 1) * 30 + current.day;

  let nearestSeason: (SeasonInfo & { daysUntil: number }) | null = null;
  let minDays = Infinity;

  for (const [key, seasonData] of Object.entries(SEASONS_DATA)) {
    if (key === 'none') continue;

    const startDays = (seasonData.startDate.month - 1) * 30 + seasonData.startDate.day;
    let daysUntil = startDays - currentDays;

    // إذا كان الموسم قد مر، احسب للسنة القادمة
    if (daysUntil < 0) {
      daysUntil += 354; // السنة الهجرية تقريباً
    }

    // تجاهل الموسم الحالي
    if (daysUntil === 0) continue;

    if (daysUntil < minDays) {
      minDays = daysUntil;
      const totalDays = daysBetween(seasonData.startDate, seasonData.endDate) + 1;

      nearestSeason = {
        ...seasonData,
        isActive: false,
        daysRemaining: 0,
        currentDay: 0,
        totalDays,
        daysUntil,
      };
    }
  }

  return nearestSeason;
};

/**
 * الحصول على اليوم المميز الحالي
 */
export const getCurrentSpecialDay = (season: SeasonInfo | null): SpecialDay | null => {
  if (!season || !season.specialDays) return null;

  return season.specialDays.find(day => day.day === season.currentDay) || null;
};

/**
 * الحصول على جميع المواسم
 */
export const getAllSeasons = (): SeasonInfo[] => {
  const hijriDate = getHijriDate();

  return Object.entries(SEASONS_DATA)
    .filter(([key]) => key !== 'none')
    .map(([_, seasonData]) => {
      const current = { month: hijriDate.month, day: hijriDate.day };
      const isActive = isDateInRange(current, seasonData.startDate, seasonData.endDate);
      const totalDays = daysBetween(seasonData.startDate, seasonData.endDate) + 1;
      const currentDay = isActive ? daysBetween(seasonData.startDate, current) + 1 : 0;

      return {
        ...seasonData,
        isActive,
        daysRemaining: isActive ? totalDays - currentDay : 0,
        currentDay,
        totalDays,
      };
    });
};

// ========================================
// التحيات الموسمية
// ========================================

const SEASONAL_GREETINGS: Record<SeasonType, string[]> = {
  ramadan: [
    'رمضان كريم! 🌙',
    'مبارك عليكم الشهر',
    'أعاده الله علينا وعليكم باليمن والبركات',
    'شهر مبارك وصيام مقبول',
  ],
  hajj: [
    'حج مبرور وسعي مشكور',
    'تقبل الله طاعتكم',
    'لبيك اللهم لبيك',
  ],
  dhul_hijjah: [
    'أيام مباركة',
    'أكثروا من العمل الصالح في هذه الأيام',
    'العمل الصالح فيها أحب إلى الله',
  ],
  ashura: [
    'صيام مقبول',
    'تقبل الله صيامكم',
  ],
  mawlid: [
    'ذكرى مولد خير الأنام ﷺ',
    'اللهم صلِّ وسلم على نبينا محمد',
  ],
  eid_fitr: [
    'عيد مبارك! 🎉',
    'تقبل الله منا ومنكم',
    'كل عام وأنتم بخير',
    'عيد سعيد',
  ],
  eid_adha: [
    'عيد أضحى مبارك! 🐑',
    'تقبل الله منا ومنكم صالح الأعمال',
    'كل عام وأنتم بخير',
  ],
  muharram: [
    'عام هجري جديد مبارك',
    'كل عام وأنتم بخير',
  ],
  rajab: [
    'اللهم بارك لنا في رجب وشعبان وبلغنا رمضان',
  ],
  shaban: [
    'اللهم بارك لنا في شعبان وبلغنا رمضان',
  ],
  none: [''],
};

/**
 * الحصول على تحية موسمية عشوائية
 */
export const getSeasonalGreeting = (seasonType: SeasonType): string => {
  const greetings = SEASONAL_GREETINGS[seasonType];
  if (!greetings || greetings.length === 0) return '';

  const randomIndex = Math.floor(Math.random() * greetings.length);
  return greetings[randomIndex];
};

// ========================================
// البيانات اليومية
// ========================================

/**
 * الحصول على البيانات الموسمية لليوم
 */
export const getDailySeasonalData = (): DailySeasonalData => {
  const season = getCurrentSeason();
  const specialDay = getCurrentSpecialDay(season);
  const greeting = season ? getSeasonalGreeting(season.type) : '';

  return {
    season,
    content: [], // سيتم ملؤها من ملفات البيانات
    specialDay,
    greeting,
  };
};

// ========================================
// دوال مساعدة
// ========================================

/**
 * الحصول على لون الموسم
 */
export const getSeasonColor = (seasonType: SeasonType): string => {
  return SEASONS_DATA[seasonType]?.color || '#666666';
};

/**
 * الحصول على أيقونة الموسم
 */
export const getSeasonIcon = (seasonType: SeasonType): string => {
  return SEASONS_DATA[seasonType]?.icon || 'calendar';
};

/**
 * التحقق مما إذا كنا في موسم معين
 */
export const isInSeason = (seasonType: SeasonType): boolean => {
  const currentSeason = getCurrentSeason();
  return currentSeason?.type === seasonType;
};

/**
 * الحصول على نسبة التقدم في الموسم
 */
export const getSeasonProgress = (season: SeasonInfo): number => {
  if (!season.isActive || season.totalDays === 0) return 0;
  return (season.currentDay / season.totalDays) * 100;
};

/**
 * الحصول على معلومات موسم محدد
 */
export const getSeasonInfo = (seasonType: SeasonType): SeasonInfo | null => {
  const seasonData = SEASONS_DATA[seasonType];
  if (!seasonData || seasonType === 'none') return null;

  const hijriDate = getHijriDate();
  const current = { month: hijriDate.month, day: hijriDate.day };
  const isActive = isDateInRange(current, seasonData.startDate, seasonData.endDate);
  const totalDays = daysBetween(seasonData.startDate, seasonData.endDate) + 1;
  const currentDay = isActive ? daysBetween(seasonData.startDate, current) + 1 : 0;

  return {
    ...seasonData,
    isActive,
    daysRemaining: isActive ? totalDays - currentDay : 0,
    currentDay,
    totalDays,
  };
};

// ========================================
// التصدير الافتراضي
// ========================================

export default {
  getCurrentSeason,
  getUpcomingSeason,
  getCurrentSpecialDay,
  getAllSeasons,
  getSeasonalGreeting,
  getDailySeasonalData,
  getSeasonColor,
  getSeasonIcon,
  isInSeason,
  getSeasonProgress,
  getSeasonInfo,
};
