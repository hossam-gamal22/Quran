/**
 * Single source of truth for all day-of-week names.
 * Index 0 = Sunday … 6 = Saturday (matches JS Date.getDay()).
 */

/** Full day names — used everywhere except tight calendar headers. */
export const DAY_NAMES: Record<string, string[]> = {
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  fr: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
  tr: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  es: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  ur: ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'],
  id: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
  ms: ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'],
  hi: ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'],
  bn: ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'],
  ru: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
};

/** Short (2-letter) day names — ONLY for calendar header rows where space is tight. */
export const DAY_NAMES_SHORT: Record<string, string[]> = {
  ar: ['أح', 'اث', 'ثل', 'أر', 'خم', 'جم', 'سب'],
  en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  fr: ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'],
  de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  tr: ['Pa', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'],
  es: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'],
  ur: ['ات', 'پی', 'من', 'بد', 'جم', 'جم', 'ہف'],
  id: ['Mi', 'Se', 'Se', 'Ra', 'Ka', 'Ju', 'Sa'],
  ms: ['Ah', 'Is', 'Se', 'Ra', 'Kh', 'Ju', 'Sa'],
  hi: ['रवि', 'सोम', 'मं', 'बु', 'गु', 'शु', 'शनि'],
  bn: ['র', 'সো', 'ম', 'বু', 'বৃ', 'শু', 'শ'],
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
};

/** Get full day names for a language code, falling back to Arabic then English. */
export const getDayNames = (lang: string): string[] =>
  DAY_NAMES[lang] ?? DAY_NAMES.ar;

/** Get short day names for a language code, falling back to Arabic then English. */
export const getDayNamesShort = (lang: string): string[] =>
  DAY_NAMES_SHORT[lang] ?? DAY_NAMES_SHORT.ar;
