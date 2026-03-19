// lib/hijri-date.ts

import { t, tArray, getDateLocale } from '@/lib/i18n';

export interface HijriDate {
  day: number;
  month: number;
  monthName: string;
  monthNameAr: string;
  year: number;
  weekday: string;
  weekdayAr: string;
}

/**
 * Get localized date names using translations system (12 languages)
 */
export function getLocalizedDateNames() {
  const hijriMonths = tArray('calendar.hijriMonths');
  const months = tArray('calendar.months');
  const weekDays = tArray('calendar.weekDays');
  const weekDaysShort = tArray('calendar.weekDaysShort');

  return {
    hijriMonths: hijriMonths.length > 0 ? hijriMonths : HIJRI_MONTHS_AR,
    months: months.length > 0 ? months : GREGORIAN_MONTHS_AR,
    weekDays: weekDays.length > 0 ? weekDays : WEEKDAYS_AR,
    weekDaysShort: weekDaysShort.length > 0 ? weekDaysShort : WEEKDAYS_AR,
  };
}

/**
 * Format a number using locale-appropriate numerals.
 * Uses Intl.NumberFormat for digit script conversion (e.g. ١٢٣ for Arabic)
 * but strips any grouping separators (commas/dots) to avoid "2,026" style years.
 */
function localizeNumber(n: number, _locale?: string): string {
  return String(n);
}

/**
 * Get localized Hijri date (uses current app language)
 */
export function getLocalizedHijriDate(date: Date = new Date()): HijriDate {
  const hijri = gregorianToHijri(date);
  const names = getLocalizedDateNames();
  return {
    ...hijri,
    monthName: names.hijriMonths[hijri.month - 1] || hijri.monthName,
    monthNameAr: HIJRI_MONTHS_AR[hijri.month - 1] || '',
    weekday: names.weekDays[date.getDay()] || hijri.weekday,
    weekdayAr: WEEKDAYS_AR[date.getDay()] || '',
  };
}

/**
 * Get localized full date (uses current app language)
 */
export function getLocalizedFullDate(date: Date = new Date()) {
  const hijri = getLocalizedHijriDate(date);
  const names = getLocalizedDateNames();
  const gregorianMonth = names.months[date.getMonth()] || '';
  
  const locale = getDateLocale();
  return {
    hijri,
    gregorian: {
      day: date.getDate(),
      month: date.getMonth() + 1,
      monthName: gregorianMonth,
      year: date.getFullYear(),
      weekday: names.weekDays[date.getDay()] || '',
    },
    formatted: {
      hijri: `${localizeNumber(hijri.day, locale)} ${hijri.monthName} ${localizeNumber(hijri.year, locale)}`,
      gregorian: `${localizeNumber(date.getDate(), locale)} ${gregorianMonth} ${localizeNumber(date.getFullYear(), locale)}`,
    },
  };
}

export interface IslamicEvent {
  name: string;
  nameAr: string;
  hijriMonth: number;
  hijriDay: number;
  description?: string;
}

// أسماء الأشهر الهجرية
export const HIJRI_MONTHS_AR = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الثاني',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة',
];

export const HIJRI_MONTHS_EN = [
  'Muharram',
  'Safar',
  'Rabi al-Awwal',
  'Rabi al-Thani',
  'Jumada al-Ula',
  'Jumada al-Thani',
  'Rajab',
  'Shaban',
  'Ramadan',
  'Shawwal',
  'Dhul Qadah',
  'Dhul Hijjah',
];

// أيام الأسبوع
export const WEEKDAYS_AR = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

export const WEEKDAYS_EN = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// أسماء الأشهر الميلادية بالعربية (fallback)
const GREGORIAN_MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

// Islamic Events - from trusted Islamic calendar sources
// Based on lunar Hijri calendar calculations
export interface IslamicEventDetails {
  name: string;
  nameAr: string;
  translationKey?: string;
  descriptionKey?: string;
  hijriMonth: number;
  hijriDay: number;
  hijriDayEnd?: number;
  description?: string;
  descriptionAr?: string;
  type: 'holiday' | 'fasting' | 'special' | 'observance' | 'blessed_period' | 'sunnah_fasting';
  importance: 'major' | 'minor';
}

/**
 * Ayyam al-Bidh — the "White Days" (13th, 14th, 15th of every Hijri month)
 * Sunnah fasting days recommended by the Prophet ﷺ
 */
export function isAyyamAlBidh(hijriDay: number): boolean {
  return hijriDay === 13 || hijriDay === 14 || hijriDay === 15;
}

export function getAyyamAlBidhEvent(): IslamicEventDetails {
  return {
    name: 'Sunnah Fasting (Ayyam al-Bidh)',
    nameAr: 'صيام الأيام البيض',
    translationKey: 'calendar.ayyamAlBidh',
    descriptionKey: 'calendar.ayyamAlBidhDesc',
    hijriMonth: 0, // applies to every month
    hijriDay: 13,
    hijriDayEnd: 15,
    description: 'The 13th, 14th, and 15th of every Hijri month — Sunnah fasting days',
    descriptionAr: 'اليوم ١٣ و١٤ و١٥ من كل شهر هجري — أيام يُستحب صيامها',
    type: 'sunnah_fasting',
    importance: 'minor',
  };
}

export const ISLAMIC_EVENTS: IslamicEventDetails[] = [
  {
    name: 'Islamic New Year',
    nameAr: 'رأس السنة الهجرية',
    translationKey: 'calendar.newYear',
    descriptionKey: 'calendar.newYearDesc',
    hijriMonth: 1,
    hijriDay: 1,
    description: 'First day of the Islamic calendar year',
    descriptionAr: 'بداية العام الهجري الجديد',
    type: 'holiday',
    importance: 'major',
  },
  {
    name: 'Day of Ashura',
    nameAr: 'يوم عاشوراء',
    translationKey: 'calendar.ashura',
    descriptionKey: 'calendar.ashuraDesc',
    hijriMonth: 1,
    hijriDay: 10,
    description: 'A significant day in Islamic history. It is recommended to fast on this day',
    descriptionAr: 'يوم من أهم الأيام في التاريخ الإسلامي. يستحب صيام هذا اليوم',
    type: 'fasting',
    importance: 'major',
  },
  {
    name: 'Mawlid al-Nabi (Birthnight of Prophet)',
    nameAr: 'المولد النبوي الشريف',
    translationKey: 'calendar.mawlid',
    descriptionKey: 'calendar.mawlidDesc',
    hijriMonth: 3,
    hijriDay: 12,
    description: 'Celebration of the birth of Prophet Muhammad (PBUH)',
    descriptionAr: 'ذكرى مولد النبي محمد صلى الله عليه وسلم',
    type: 'special',
    importance: 'major',
  },
  {
    name: 'Isra and Miraj',
    nameAr: 'الإسراء والمعراج',
    translationKey: 'calendar.isra',
    descriptionKey: 'calendar.israDesc',
    hijriMonth: 7,
    hijriDay: 27,
    description: 'The night journey and ascension of Prophet Muhammad (PBUH)',
    descriptionAr: 'ذكرى رحلة الإسراء والمعراج للنبي صلى الله عليه وسلم',
    type: 'special',
    importance: 'major',
  },
  {
    name: 'Half of Shaban',
    nameAr: 'ليلة النصف من شعبان',
    translationKey: 'calendar.shaban15',
    descriptionKey: 'calendar.shaban15Desc',
    hijriMonth: 8,
    hijriDay: 15,
    description: 'A blessed night with special spiritual significance',
    descriptionAr: 'ليلة مباركة ذات أهمية روحية خاصة',
    type: 'observance',
    importance: 'minor',
  },
  {
    name: 'First Day of Ramadan',
    nameAr: 'أول رمضان - بداية شهر الصيام',
    translationKey: 'calendar.ramadan',
    descriptionKey: 'calendar.ramadanDesc',
    hijriMonth: 9,
    hijriDay: 1,
    description: 'Beginning of the holy month of fasting',
    descriptionAr: 'بداية شهر رمضان المبارك شهر الصيام',
    type: 'holiday',
    importance: 'major',
  },
  {
    name: 'Battle of Badr',
    nameAr: 'غزوة بدر',
    translationKey: 'calendar.badr',
    descriptionKey: 'calendar.badrDesc',
    hijriMonth: 9,
    hijriDay: 17,
    description: 'The great Battle of Badr, the first major victory in Islam',
    descriptionAr: 'غزوة بدر الكبرى، أول انتصار عظيم في الإسلام',
    type: 'observance',
    importance: 'minor',
  },
  {
    name: 'The Blessed Last Ten Nights',
    nameAr: 'العشر الأواخر المباركة',
    translationKey: 'calendar.lastTenNights',
    descriptionKey: 'calendar.lastTenNightsDesc',
    hijriMonth: 9,
    hijriDay: 21,
    hijriDayEnd: 30,
    description: 'The blessed last ten nights of Ramadan — seek Laylat al-Qadr in all of them',
    descriptionAr: 'العشر الأواخر المباركة من رمضان — تحرّوا ليلة القدر فيها',
    type: 'blessed_period',
    importance: 'major',
  },
  {
    name: 'Eid al-Fitr',
    nameAr: 'عيد الفطر المبارك',
    translationKey: 'calendar.eidAlFitr',
    descriptionKey: 'calendar.eidAlFitrDesc',
    hijriMonth: 10,
    hijriDay: 1,
    description: 'Festival of Breaking the Fast - a joyful celebration after Ramadan',
    descriptionAr: 'عيد الفطر أو عيد الغدير - يأتي بعد شهر رمضان',
    type: 'holiday',
    importance: 'major',
  },
  {
    name: 'Day of Tarwiyah',
    nameAr: 'يوم التروية',
    translationKey: 'calendar.tarwiyah',
    descriptionKey: 'calendar.tarwiyahDesc',
    hijriMonth: 12,
    hijriDay: 8,
    description: 'The eighth day of Dhul-Hijjah, the beginning of the Hajj season',
    descriptionAr: 'اليوم الثامن من ذي الحجة، بداية مناسك الحج',
    type: 'observance',
    importance: 'major',
  },
  {
    name: 'Day of Arafah',
    nameAr: 'يوم عرفة',
    translationKey: 'calendar.arafat',
    descriptionKey: 'calendar.arafatDesc',
    hijriMonth: 12,
    hijriDay: 9,
    description: 'The greatest day of the Hajj. Fasting on this day is highly recommended for those not on Hajj',
    descriptionAr: 'أعظم أيام الحج. يستحب صيام هذا اليوم لغير الحاج',
    type: 'fasting',
    importance: 'major',
  },
  {
    name: 'Eid al-Adha',
    nameAr: 'عيد الأضحى المبارك',
    translationKey: 'calendar.eidAlAdha',
    descriptionKey: 'calendar.eidAlAdhaDesc',
    hijriMonth: 12,
    hijriDay: 10,
    description: 'Festival of Sacrifice - the greatest Islamic holiday',
    descriptionAr: 'عيد الأضحى - أعظم أعياد الإسلام',
    type: 'holiday',
    importance: 'major',
  },
  {
    name: 'Days of Tashreeq',
    nameAr: 'أيام التشريق',
    translationKey: 'calendar.tashreeq',
    descriptionKey: 'calendar.tashreeqDesc',
    hijriMonth: 12,
    hijriDay: 11,
    hijriDayEnd: 13,
    description: 'The three days following Eid al-Adha, days of eating, drinking and remembrance of Allah',
    descriptionAr: 'الأيام الثلاثة بعد عيد الأضحى، أيام أكل وشرب وذكر لله',
    type: 'observance',
    importance: 'minor',
  },
];

/**
 * تحويل التاريخ الميلادي إلى هجري
 * الخوارزمية: حساب رقم يوليان ثم التحويل إلى التقويم الهجري الجدولي
 */
export function gregorianToHijri(date: Date = new Date()): HijriDate {
  const g = date.getFullYear();
  const m = date.getMonth() + 1;
  const gd = date.getDate();
  const wd = date.getDay();

  // الخطوة 1: تحويل الميلادي إلى رقم يوليان (Julian Day Number)
  const a = Math.floor((14 - m) / 12);
  const y = g + 4800 - a;
  const mo = m + 12 * a - 3;
  const julianDay =
    gd +
    Math.floor((153 * mo + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;

  // الخطوة 2: تحويل رقم يوليان إلى هجري (خوارزمية التقويم الهجري الجدولي)
  const l = julianDay - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 =
    l2 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;

  let hijriYear = 30 * n + j - 30;
  let hijriMonth = Math.floor((24 * (l3 - 1)) / 709);
  let hijriDay = l3 - Math.floor((709 * hijriMonth) / 24);

  // الخطوة 3: تصحيح تجاوز عدد أيام الشهر
  // الخوارزمية الجدولية قد تنتج يوم 31 لشهر أقصاه 30 أو 29
  const maxDays = getHijriMonthDays(hijriYear, hijriMonth);
  if (hijriDay > maxDays) {
    hijriDay = hijriDay - maxDays;
    hijriMonth += 1;
    if (hijriMonth > 12) {
      hijriMonth = 1;
      hijriYear += 1;
    }
  }

  return {
    day: hijriDay,
    month: hijriMonth,
    monthName: HIJRI_MONTHS_EN[hijriMonth - 1] || '',
    monthNameAr: HIJRI_MONTHS_AR[hijriMonth - 1] || '',
    year: hijriYear,
    weekday: WEEKDAYS_EN[wd],
    weekdayAr: WEEKDAYS_AR[wd],
  };
}

/**
 * دالة مساعدة - نفس gregorianToHijri
 */
export function getHijriDate(date: Date = new Date()): HijriDate {
  return gregorianToHijri(date);
}

/**
 * دالة مساعدة - نفس gregorianToHijri (alias آخر)
 */
export function getHijriDateObject(date: Date = new Date()): HijriDate {
  return gregorianToHijri(date);
}

/**
 * تحويل التاريخ الهجري إلى ميلادي
 */
export function hijriToGregorian(hijriYear: number, hijriMonth: number, hijriDay: number): Date {
  // حساب Julian Day من التاريخ الهجري
  const jd = Math.floor((11 * hijriYear + 3) / 30) +
    354 * hijriYear +
    30 * hijriMonth -
    Math.floor((hijriMonth - 1) / 2) +
    hijriDay + 1948440 - 385;

  // تحويل من Julian إلى Gregorian
  const l = jd + 68569;
  const n = Math.floor((4 * l) / 146097);
  const l2 = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l2 + 1)) / 1461001);
  const l3 = l2 - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l3) / 2447);
  const day = l3 - Math.floor((2447 * j) / 80);
  const l4 = Math.floor(j / 11);
  const month = j + 2 - 12 * l4;
  const year = 100 * (n - 49) + i + l4;

  return new Date(year, month - 1, day);
}

/**
 * الحصول على التاريخ الهجري المنسق
 */
export function getFormattedHijriDate(date: Date = new Date()): string {
  const hijri = getLocalizedHijriDate(date);
  const locale = getDateLocale();
  const ahSuffix = t('calendar.ahSuffix') || 'هـ';
  return `${localizeNumber(hijri.day, locale)} ${hijri.monthName} ${localizeNumber(hijri.year, locale)} ${ahSuffix}`;
}

/**
 * الحصول على التاريخ الكامل (هجري وميلادي)
 */
export function getFullDate(date: Date = new Date()): {
  hijri: HijriDate;
  gregorian: {
    day: number;
    month: number;
    monthName: string;
    year: number;
    weekday: string;
    weekdayAr: string;
  };
  formatted: {
    hijriAr: string;
    hijriEn: string;
    hijri: string;
    gregorianAr: string;
    gregorianEn: string;
    gregorian: string;
  };
} {
  const hijri = gregorianToHijri(date);
  const weekdayIndex = date.getDay();
  const names = getLocalizedDateNames();
  const locale = getDateLocale();
  const localizedHijri = getLocalizedHijriDate(date);
  const ahSuffix = t('calendar.ahSuffix') || 'هـ';

  return {
    hijri,
    gregorian: {
      day: date.getDate(),
      month: date.getMonth() + 1,
      monthName: names.months[date.getMonth()] || '',
      year: date.getFullYear(),
      weekday: names.weekDays[weekdayIndex] || WEEKDAYS_EN[weekdayIndex],
      weekdayAr: WEEKDAYS_AR[weekdayIndex],
    },
    formatted: {
      hijriAr: `${hijri.day} ${HIJRI_MONTHS_AR[hijri.month - 1]} ${hijri.year} هـ`,
      hijriEn: `${hijri.day} ${HIJRI_MONTHS_EN[hijri.month - 1]} ${hijri.year} AH`,
      hijri: `${localizeNumber(localizedHijri.day, locale)} ${localizedHijri.monthName} ${localizeNumber(localizedHijri.year, locale)} ${ahSuffix}`,
      gregorianAr: `${date.getDate()} ${GREGORIAN_MONTHS_AR[date.getMonth()]} ${date.getFullYear()} م`,
      gregorianEn: `${names.months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`,
      gregorian: `${localizeNumber(date.getDate(), locale)} ${names.months[date.getMonth()] || ''} ${localizeNumber(date.getFullYear(), locale)}`,
    },
  };
}



/**
 * الحصول على مناسبات اليوم (including Ayyam al-Bidh)
 */
export function getTodayEvents(date: Date = new Date()): IslamicEventDetails[] {
  const hijri = gregorianToHijri(date);
  const events: IslamicEventDetails[] = ISLAMIC_EVENTS.filter(event => {
    if (event.hijriMonth !== hijri.month) return false;
    if (event.hijriDayEnd) {
      return hijri.day >= event.hijriDay && hijri.day <= event.hijriDayEnd;
    }
    return event.hijriDay === hijri.day;
  });

  // Add Ayyam al-Bidh if it's 13th, 14th, or 15th
  if (isAyyamAlBidh(hijri.day)) {
    events.push(getAyyamAlBidhEvent());
  }

  return events;
}

/**
 * الحصول على المناسبات القادمة
 */
export function getUpcomingEvents(count: number = 5): Array<IslamicEvent & { 
  hijriDate: string; 
  gregorianDate: string;
  daysUntil: number;
}> {
  const today = new Date();
  const hijriToday = gregorianToHijri(today);
  const events: Array<IslamicEvent & { hijriDate: string; gregorianDate: string; daysUntil: number }> = [];
  const names = getLocalizedDateNames();

  // نبحث في السنة الحالية والقادمة
  for (let yearOffset = 0; yearOffset <= 1; yearOffset++) {
    const year = hijriToday.year + yearOffset;
    
    for (const event of ISLAMIC_EVENTS) {
      const gregorianDate = hijriToGregorian(year, event.hijriMonth, event.hijriDay);
      const daysUntil = Math.ceil((gregorianDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntil > 0 && daysUntil <= 365) {
        events.push({
          ...event,
          hijriDate: `${event.hijriDay} ${names.hijriMonths[event.hijriMonth - 1] || HIJRI_MONTHS_AR[event.hijriMonth - 1]} ${year}`,
          gregorianDate: `${gregorianDate.getDate()} ${names.months[gregorianDate.getMonth()] || ''} ${gregorianDate.getFullYear()}`,
          daysUntil,
        });
      }
    }
  }

  // ترتيب حسب القرب وإرجاع العدد المطلوب
  return events
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, count);
}

/**
 * حساب عدد أيام شهر هجري معين
 */
export function getHijriMonthDays(year: number, month: number): number {
  // الأشهر الفردية 30 يوم والزوجية 29 يوم
  // ماعدا ذو الحجة في السنة الكبيسة 30 يوم
  if (month % 2 === 1) return 30;
  if (month === 12 && isHijriLeapYear(year)) return 30;
  return 29;
}

/**
 * هل السنة الهجرية كبيسة
 */
export function isHijriLeapYear(year: number): boolean {
  return [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29].includes(year % 30);
}

/**
 * الحصول على أيام شهر هجري كامل مع التواريخ الميلادية
 */
export function getHijriMonthCalendar(hijriYear: number, hijriMonth: number): Array<{
  hijriDay: number;
  gregorianDate: Date;
  isToday: boolean;
  events: IslamicEventDetails[];
}> {
  const days: Array<{
    hijriDay: number;
    gregorianDate: Date;
    isToday: boolean;
    events: IslamicEventDetails[];
  }> = [];
  
  const daysInMonth = getHijriMonthDays(hijriYear, hijriMonth);
  const today = new Date();
  const todayHijri = gregorianToHijri(today);
  
  for (let day = 1; day <= daysInMonth; day++) {
    const gregorianDate = hijriToGregorian(hijriYear, hijriMonth, day);
    const isToday = 
      todayHijri.year === hijriYear && 
      todayHijri.month === hijriMonth && 
      todayHijri.day === day;
    
    const events: IslamicEventDetails[] = ISLAMIC_EVENTS.filter(e => {
      if (e.hijriMonth !== hijriMonth) return false;
      if (e.hijriDayEnd) {
        return day >= e.hijriDay && day <= e.hijriDayEnd;
      }
      return e.hijriDay === day;
    });

    // Add Ayyam al-Bidh
    if (isAyyamAlBidh(day)) {
      events.push(getAyyamAlBidhEvent());
    }
    
    days.push({
      hijriDay: day,
      gregorianDate,
      isToday,
      events,
    });
  }
  
  return days;
}

// ============================================
// Hijri Offset System
// ============================================

const HIJRI_OFFSET_STORAGE_KEY = '@hijri_date_offset';

/**
 * Get the stored Hijri offset (±1-2 days for moon sighting differences)
 */
export async function getHijriOffset(): Promise<number> {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const val = await AsyncStorage.getItem(HIJRI_OFFSET_STORAGE_KEY);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * Save the Hijri offset
 */
export async function setHijriOffset(offset: number): Promise<void> {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem(HIJRI_OFFSET_STORAGE_KEY, String(offset));
  } catch {}
}

/**
 * Convert Gregorian date to Hijri with offset applied
 */
export function gregorianToHijriWithOffset(date: Date, offset: number): HijriDate {
  const adjusted = new Date(date);
  if (offset !== 0) {
    adjusted.setDate(adjusted.getDate() + offset);
  }
  return gregorianToHijri(adjusted);
}

/**
 * Get all events for a specific Hijri day (including Ayyam al-Bidh)
 */
export function getEventsForHijriDay(
  hijriMonth: number,
  hijriDay: number,
  events: IslamicEventDetails[] = ISLAMIC_EVENTS,
): IslamicEventDetails[] {
  const matched = events.filter(e => {
    if (e.hijriMonth !== hijriMonth) return false;
    if (e.hijriDayEnd) {
      return hijriDay >= e.hijriDay && hijriDay <= e.hijriDayEnd;
    }
    return e.hijriDay === hijriDay;
  });

  if (isAyyamAlBidh(hijriDay)) {
    matched.push(getAyyamAlBidhEvent());
  }

  return matched;
}
