// lib/hijri-date.ts

export interface HijriDate {
  day: number;
  month: number;
  monthName: string;
  monthNameAr: string;
  year: number;
  weekday: string;
  weekdayAr: string;
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

// المناسبات الإسلامية
export const ISLAMIC_EVENTS: IslamicEvent[] = [
  { name: 'Islamic New Year', nameAr: 'رأس السنة الهجرية', hijriMonth: 1, hijriDay: 1 },
  { name: 'Ashura', nameAr: 'يوم عاشوراء', hijriMonth: 1, hijriDay: 10 },
  { name: 'Mawlid al-Nabi', nameAr: 'المولد النبوي الشريف', hijriMonth: 3, hijriDay: 12 },
  { name: 'Isra and Miraj', nameAr: 'الإسراء والمعراج', hijriMonth: 7, hijriDay: 27 },
  { name: 'Start of Shaban', nameAr: 'بداية شهر شعبان', hijriMonth: 8, hijriDay: 1 },
  { name: 'Mid-Shaban', nameAr: 'ليلة النصف من شعبان', hijriMonth: 8, hijriDay: 15 },
  { name: 'Start of Ramadan', nameAr: 'بداية شهر رمضان', hijriMonth: 9, hijriDay: 1 },
  { name: 'Laylat al-Qadr', nameAr: 'ليلة القدر', hijriMonth: 9, hijriDay: 27 },
  { name: 'Eid al-Fitr', nameAr: 'عيد الفطر المبارك', hijriMonth: 10, hijriDay: 1 },
  { name: 'Day of Arafah', nameAr: 'يوم عرفة', hijriMonth: 12, hijriDay: 9 },
  { name: 'Eid al-Adha', nameAr: 'عيد الأضحى المبارك', hijriMonth: 12, hijriDay: 10 },
];

/**
 * تحويل التاريخ الميلادي إلى هجري باستخدام خوارزمية دقيقة
 */
export function gregorianToHijri(date: Date = new Date()): HijriDate {
  const gregorianYear = date.getFullYear();
  const gregorianMonth = date.getMonth() + 1;
  const gregorianDay = date.getDate();
  const weekdayIndex = date.getDay();

  // حساب Julian Day Number
  let jd = Math.floor((1461 * (gregorianYear + 4800 + Math.floor((gregorianMonth - 14) / 12))) / 4) +
    Math.floor((367 * (gregorianMonth - 2 - 12 * Math.floor((gregorianMonth - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((gregorianYear + 4900 + Math.floor((gregorianMonth - 14) / 12)) / 100)) / 4) +
    gregorianDay - 32075;

  // تحويل من Julian إلى Hijri
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  
  const hijriMonth = Math.floor((24 * l3) / 709);
  const hijriDay = l3 - Math.floor((709 * hijriMonth) / 24);
  const hijriYear = 30 * n + j - 30;

  return {
    day: hijriDay,
    month: hijriMonth,
    monthName: HIJRI_MONTHS_EN[hijriMonth - 1] || '',
    monthNameAr: HIJRI_MONTHS_AR[hijriMonth - 1] || '',
    year: hijriYear,
    weekday: WEEKDAYS_EN[weekdayIndex],
    weekdayAr: WEEKDAYS_AR[weekdayIndex],
  };
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
  const hijri = gregorianToHijri(date);
  return `${hijri.day} ${hijri.monthNameAr} ${hijri.year}`;
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
    gregorianAr: string;
    gregorianEn: string;
  };
} {
  const hijri = gregorianToHijri(date);
  const weekdayIndex = date.getDay();
  
  const gregorianMonthsAr = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  
  const gregorianMonthsEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return {
    hijri,
    gregorian: {
      day: date.getDate(),
      month: date.getMonth() + 1,
      monthName: gregorianMonthsEn[date.getMonth()],
      year: date.getFullYear(),
      weekday: WEEKDAYS_EN[weekdayIndex],
      weekdayAr: WEEKDAYS_AR[weekdayIndex],
    },
    formatted: {
      hijriAr: `${hijri.day} ${hijri.monthNameAr} ${hijri.year} هـ`,
      hijriEn: `${hijri.day} ${hijri.monthName} ${hijri.year} AH`,
      gregorianAr: `${date.getDate()} ${gregorianMonthsAr[date.getMonth()]} ${date.getFullYear()} م`,
      gregorianEn: `${gregorianMonthsEn[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`,
    },
  };
}

/**
 * الحصول على مناسبات اليوم
 */
export function getTodayEvents(date: Date = new Date()): IslamicEvent[] {
  const hijri = gregorianToHijri(date);
  return ISLAMIC_EVENTS.filter(
    event => event.hijriMonth === hijri.month && event.hijriDay === hijri.day
  );
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

  // نبحث في السنة الحالية والقادمة
  for (let yearOffset = 0; yearOffset <= 1; yearOffset++) {
    const year = hijriToday.year + yearOffset;
    
    for (const event of ISLAMIC_EVENTS) {
      const gregorianDate = hijriToGregorian(year, event.hijriMonth, event.hijriDay);
      const daysUntil = Math.ceil((gregorianDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntil > 0 && daysUntil <= 365) {
        events.push({
          ...event,
          hijriDate: `${event.hijriDay} ${HIJRI_MONTHS_AR[event.hijriMonth - 1]} ${year}`,
          gregorianDate: gregorianDate.toLocaleDateString('ar-EG', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
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
  events: IslamicEvent[];
}> {
  const days: Array<{
    hijriDay: number;
    gregorianDate: Date;
    isToday: boolean;
    events: IslamicEvent[];
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
    
    const events = ISLAMIC_EVENTS.filter(
      e => e.hijriMonth === hijriMonth && e.hijriDay === day
    );
    
    days.push({
      hijriDay: day,
      gregorianDate,
      isToday,
      events,
    });
  }
  
  return days;
}
