// lib/seasonal-stats.ts
// حساب الإحصائيات والتقدم الموسمي بشكل صحيح

import { getHijriDate, HijriDate } from './hijri-date';

export interface SeasonStats {
  seasonType: string;
  currentDay: number;
  totalDays: number;
  progress: number;
  hijriMonth: number;
  hijriDay: number;
  isActive: boolean;
}

// حساب موسم رمضان الحالي
export function getRamadanStats(): SeasonStats {
  const hijri = getHijriDate();
  const isRamadan = hijri.month === 9; // رمضان هو الشهر التاسع

  return {
    seasonType: 'ramadan',
    currentDay: isRamadan ? hijri.day : 0,
    totalDays: 30, // رمضان 30 يوم دائماً
    progress: isRamadan ? (hijri.day / 30) * 100 : 0,
    hijriMonth: hijri.month,
    hijriDay: hijri.day,
    isActive: isRamadan,
  };
}

// حساب موسم الحج
export function getHajjStats(): SeasonStats {
  const hijri = getHijriDate();
  
  // الحج في شهر ذو الحجة (الشهر 12)
  // الأيام الرئيسية: 8-13 (التروية إلى أيام التشريق)
  const isHajjSeason = hijri.month === 12 && hijri.day >= 1 && hijri.day <= 13;
  const hajjStartDay = 8; // يوم التروية
  const hajjEndDay = 13; // آخر أيام التشريق
  const currentHajjDay = isHajjSeason && hijri.day >= hajjStartDay 
    ? hijri.day - hajjStartDay + 1 
    : 0;

  return {
    seasonType: 'hajj',
    currentDay: currentHajjDay,
    totalDays: 6, // من 8 إلى 13 ذي الحجة
    progress: isHajjSeason ? (currentHajjDay / 6) * 100 : 0,
    hijriMonth: hijri.month,
    hijriDay: hijri.day,
    isActive: isHajjSeason,
  };
}

// حساب موسم عاشوراء
export function getAshouraStats(): SeasonStats {
  const hijri = getHijriDate();
  
  // عاشوراء في اليوم العاشر من محرم
  // لكننا نعتبر الموسم من 1-13 محرم
  const isAshoura = hijri.month === 1;

  return {
    seasonType: 'ashura',
    currentDay: isAshoura ? hijri.day : 0,
    totalDays: 13,
    progress: isAshoura ? (hijri.day / 13) * 100 : 0,
    hijriMonth: hijri.month,
    hijriDay: hijri.day,
    isActive: isAshoura,
  };
}

// حساب موسم المولد النبوي
export function getMawlidStats(): SeasonStats {
  const hijri = getHijriDate();
  
  // المولد النبوي في 12 ربيع الأول (الشهر 3)
  const isMawlidSeason = hijri.month === 3;

  return {
    seasonType: 'mawlid',
    currentDay: isMawlidSeason ? hijri.day : 0,
    totalDays: 30,
    progress: isMawlidSeason ? (hijri.day / 30) * 100 : 0,
    hijriMonth: hijri.month,
    hijriDay: hijri.day,
    isActive: isMawlidSeason,
  };
}

// الحصول على الموسم الفعلي
export function getCurrentActiveSeason(): SeasonStats | null {
  const ramadan = getRamadanStats();
  const hajj = getHajjStats();
  const ashura = getAshouraStats();
  const mawlid = getMawlidStats();

  if (ramadan.isActive) return ramadan;
  if (hajj.isActive) return hajj;
  if (ashura.isActive) return ashura;
  if (mawlid.isActive) return mawlid;

  return null;
}

// الحصول على الموسم القادم
export function getNextUpcomingSeason(): { season: SeasonStats; daysUntil: number } | null {
  const hijri = getHijriDate();
  const currentMonth = hijri.month;
  const currentDay = hijri.day;

  // ترتيب المواسم حسب شهر الهجرة
  const seasons = [
    { month: 1, name: 'ashura', stats: getAshouraStats },
    { month: 3, name: 'mawlid', stats: getMawlidStats },
    { month: 9, name: 'ramadan', stats: getRamadanStats },
    { month: 12, name: 'hajj', stats: getHajjStats },
  ];

  // البحث عن الموسم القادم
  for (const season of seasons) {
    if (season.month > currentMonth || (season.month === currentMonth && season.stats().currentDay === 0)) {
      const stats = season.stats();
      if (!stats.isActive) {
        const daysUntil = calculateDaysUntil(currentMonth, currentDay, season.month, 1);
        return { season: stats, daysUntil };
      }
    }
  }

  // إذا لم نجد موسماً في نفس السنة، العودة للموسم الأول في السنة التالية
  const nextAshura = getAshouraStats();
  const daysUntil = calculateDaysUntil(currentMonth, currentDay, 1, 1, true);
  return { season: nextAshura, daysUntil };
}

// حساب الأيام المتبقية
function calculateDaysUntil(
  fromMonth: number,
  fromDay: number,
  toMonth: number,
  toDay: number,
  nextYear = false
): number {
  const hijriMonthDays = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 30];
  let daysDiff = 0;

  if (!nextYear) {
    if (toMonth > fromMonth) {
      // نفس السنة
      for (let m = fromMonth; m < toMonth; m++) {
        daysDiff += hijriMonthDays[m - 1];
      }
      daysDiff -= fromDay;
      daysDiff += toDay;
    } else if (toMonth === fromMonth) {
      daysDiff = toDay - fromDay;
    }
  } else {
    // السنة القادمة
    for (let m = fromMonth; m <= 12; m++) {
      daysDiff += hijriMonthDays[m - 1];
    }
    daysDiff -= fromDay;
    daysDiff += toDay;
  }

  return Math.max(0, daysDiff);
}

// حساب عدد الأيام المتبقية في موسم معين
export function getRemainingDaysInSeason(season: SeasonStats): number {
  return Math.max(0, season.totalDays - season.currentDay);
}
