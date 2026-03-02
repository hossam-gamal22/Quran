// data/azkar.ts
// بيانات الأذكار الأساسية - روح المسلم
// الترجمات موجودة في data/translations/azkar.ts

// ========================================
// أنواع البيانات
// ========================================
export interface Zikr {
  id: string;
  category: AzkarCategory;
  textKey: string; // مفتاح الترجمة للنص
  benefitKey?: string; // مفتاح الترجمة للفائدة
  count: number;
  source?: string;
  audioUrl?: string;
}

export type AzkarCategory = 
  | 'morning'
  | 'evening'
  | 'sleep'
  | 'wakeup'
  | 'afterPrayer'
  | 'misc';

// ========================================
// أذكار الصباح
// ========================================
export const morningAzkar: Zikr[] = [
  {
    id: 'morning-1',
    category: 'morning',
    textKey: 'azkar.morning.1.text',
    benefitKey: 'benefit.morning.1',
    count: 1,
    source: 'آية الكرسي - البقرة 255',
  },
  {
    id: 'morning-2',
    category: 'morning',
    textKey: 'azkar.morning.2.text',
    count: 3,
    source: 'سورة الإخلاص',
  },
  {
    id: 'morning-3',
    category: 'morning',
    textKey: 'azkar.morning.3.text',
    count: 3,
    source: 'سورة الفلق',
  },
  {
    id: 'morning-4',
    category: 'morning',
    textKey: 'azkar.morning.4.text',
    count: 3,
    source: 'سورة الناس',
  },
  {
    id: 'morning-5',
    category: 'morning',
    textKey: 'azkar.morning.5.text',
    benefitKey: 'benefit.morning.5',
    count: 1,
    source: 'أبو داود والترمذي',
  },
  {
    id: 'morning-6',
    category: 'morning',
    textKey: 'azkar.morning.6.text',
    benefitKey: 'benefit.morning.6',
    count: 3,
    source: 'أبو داود والترمذي',
  },
  {
    id: 'morning-7',
    category: 'morning',
    textKey: 'azkar.morning.7.text',
    benefitKey: 'benefit.morning.7',
    count: 7,
    source: 'ابن السني',
  },
  {
    id: 'morning-8',
    category: 'morning',
    textKey: 'azkar.morning.8.text',
    benefitKey: 'benefit.morning.8',
    count: 1,
    source: 'البخاري',
  },
  {
    id: 'morning-9',
    category: 'morning',
    textKey: 'azkar.morning.9.text',
    count: 3,
    source: 'مسلم',
  },
  {
    id: 'morning-10',
    category: 'morning',
    textKey: 'azkar.morning.10.text',
    count: 10,
    source: 'مسلم',
  },
  {
    id: 'morning-11',
    category: 'morning',
    textKey: 'azkar.morning.11.text',
    count: 100,
    source: 'البخاري ومسلم',
  },
  {
    id: 'morning-12',
    category: 'morning',
    textKey: 'azkar.morning.12.text',
    count: 100,
    source: 'مسلم',
  },
  {
    id: 'morning-13',
    category: 'morning',
    textKey: 'azkar.morning.13.text',
    count: 3,
    source: 'الترمذي وأحمد',
  },
  {
    id: 'morning-14',
    category: 'morning',
    textKey: 'azkar.morning.14.text',
    count: 3,
    source: 'أبو داود والنسائي',
  },
  {
    id: 'morning-15',
    category: 'morning',
    textKey: 'azkar.morning.15.text',
    count: 10,
    source: 'النسائي وأبو داود',
  },
];

// ========================================
// أذكار المساء
// ========================================
export const eveningAzkar: Zikr[] = [
  {
    id: 'evening-1',
    category: 'evening',
    textKey: 'azkar.evening.1.text',
    benefitKey: 'benefit.evening.1',
    count: 1,
    source: 'آية الكرسي - البقرة 255',
  },
  {
    id: 'evening-2',
    category: 'evening',
    textKey: 'azkar.evening.2.text',
    count: 3,
    source: 'سورة الإخلاص',
  },
  {
    id: 'evening-3',
    category: 'evening',
    textKey: 'azkar.evening.3.text',
    count: 3,
    source: 'سورة الفلق',
  },
  {
    id: 'evening-4',
    category: 'evening',
    textKey: 'azkar.evening.4.text',
    count: 3,
    source: 'سورة الناس',
  },
  {
    id: 'evening-5',
    category: 'evening',
    textKey: 'azkar.evening.5.text',
    count: 1,
    source: 'أبو داود والترمذي',
  },
  {
    id: 'evening-6',
    category: 'evening',
    textKey: 'azkar.evening.6.text',
    count: 3,
    source: 'أبو داود والترمذي',
  },
  {
    id: 'evening-7',
    category: 'evening',
    textKey: 'azkar.evening.7.text',
    count: 7,
    source: 'ابن السني',
  },
  {
    id: 'evening-8',
    category: 'evening',
    textKey: 'azkar.evening.8.text',
    count: 1,
    source: 'البخاري',
  },
  {
    id: 'evening-9',
    category: 'evening',
    textKey: 'azkar.evening.9.text',
    count: 3,
    source: 'مسلم',
  },
  {
    id: 'evening-10',
    category: 'evening',
    textKey: 'azkar.evening.10.text',
    count: 10,
    source: 'مسلم',
  },
  {
    id: 'evening-11',
    category: 'evening',
    textKey: 'azkar.evening.11.text',
    count: 100,
    source: 'البخاري ومسلم',
  },
  {
    id: 'evening-12',
    category: 'evening',
    textKey: 'azkar.evening.12.text',
    count: 100,
    source: 'مسلم',
  },
  {
    id: 'evening-13',
    category: 'evening',
    textKey: 'azkar.evening.13.text',
    count: 3,
    source: 'الترمذي',
  },
  {
    id: 'evening-14',
    category: 'evening',
    textKey: 'azkar.evening.14.text',
    count: 3,
    source: 'أبو داود',
  },
  {
    id: 'evening-15',
    category: 'evening',
    textKey: 'azkar.evening.15.text',
    count: 10,
    source: 'الترمذي',
  },
];

// ========================================
// أذكار النوم
// ========================================
export const sleepAzkar: Zikr[] = [
  {
    id: 'sleep-1',
    category: 'sleep',
    textKey: 'azkar.sleep.1.text',
    benefitKey: 'benefit.sleep.1',
    count: 1,
    source: 'البخاري ومسلم',
  },
  {
    id: 'sleep-2',
    category: 'sleep',
    textKey: 'azkar.sleep.2.text',
    benefitKey: 'benefit.sleep.2',
    count: 1,
    source: 'آية الكرسي',
  },
  {
    id: 'sleep-3',
    category: 'sleep',
    textKey: 'azkar.sleep.3.text',
    count: 3,
    source: 'أبو داود والترمذي',
  },
  {
    id: 'sleep-4',
    category: 'sleep',
    textKey: 'azkar.sleep.4.text',
    count: 33,
    source: 'البخاري ومسلم',
  },
  {
    id: 'sleep-5',
    category: 'sleep',
    textKey: 'azkar.sleep.5.text',
    benefitKey: 'benefit.sleep.3',
    count: 1,
    source: 'البخاري',
  },
  {
    id: 'sleep-6',
    category: 'sleep',
    textKey: 'azkar.sleep.6.text',
    count: 1,
    source: 'أبو داود والترمذي',
  },
  {
    id: 'sleep-7',
    category: 'sleep',
    textKey: 'azkar.sleep.7.text',
    count: 1,
    source: 'الترمذي',
  },
  {
    id: 'sleep-8',
    category: 'sleep',
    textKey: 'azkar.sleep.8.text',
    count: 1,
    source: 'البخاري ومسلم',
  },
];

// ========================================
// أذكار الاستيقاظ
// ========================================
export const wakeupAzkar: Zikr[] = [
  {
    id: 'wakeup-1',
    category: 'wakeup',
    textKey: 'azkar.wakeup.1.text',
    benefitKey: 'benefit.wakeup.1',
    count: 1,
    source: 'البخاري',
  },
  {
    id: 'wakeup-2',
    category: 'wakeup',
    textKey: 'azkar.wakeup.2.text',
    count: 1,
    source: 'مسلم',
  },
  {
    id: 'wakeup-3',
    category: 'wakeup',
    textKey: 'azkar.wakeup.3.text',
    count: 1,
    source: 'البخاري ومسلم',
  },
  {
    id: 'wakeup-4',
    category: 'wakeup',
    textKey: 'azkar.wakeup.4.text',
    count: 1,
    source: 'أبو داود',
  },
  {
    id: 'wakeup-5',
    category: 'wakeup',
    textKey: 'azkar.wakeup.5.text',
    count: 10,
    source: 'مسلم',
  },
];

// ========================================
// أذكار بعد الصلاة
// ========================================
export const afterPrayerAzkar: Zikr[] = [
  {
    id: 'afterPrayer-1',
    category: 'afterPrayer',
    textKey: 'azkar.afterPrayer.1.text',
    count: 3,
    source: 'مسلم',
  },
  {
    id: 'afterPrayer-2',
    category: 'afterPrayer',
    textKey: 'azkar.afterPrayer.2.text',
    benefitKey: 'benefit.afterPrayer.1',
    count: 1,
    source: 'البخاري ومسلم',
  },
  {
    id: 'afterPrayer-3',
    category: 'afterPrayer',
    textKey: 'azkar.afterPrayer.3.text',
    benefitKey: 'benefit.afterPrayer.2',
    count: 1,
    source: 'مسلم',
  },
  {
    id: 'afterPrayer-4',
    category: 'afterPrayer',
    textKey: 'azkar.afterPrayer.4.text',
    count: 33,
    source: 'مسلم',
  },
  {
    id: 'afterPrayer-5',
    category: 'afterPrayer',
    textKey: 'azkar.afterPrayer.5.text',
    benefitKey: 'benefit.afterPrayer.3',
    count: 1,
    source: 'آية الكرسي',
  },
  {
    id: 'afterPrayer-6',
    category: 'afterPrayer',
    textKey: 'azkar.afterPrayer.6.text',
    count: 10,
    source: 'الترمذي',
  },
  {
    id: 'afterPrayer-7',
    category: 'afterPrayer',
    textKey: 'azkar.afterPrayer.7.text',
    count: 1,
    source: 'أبو داود والنسائي',
  },
];

// ========================================
// أذكار متنوعة
// ========================================
export const miscAzkar: Zikr[] = [
  {
    id: 'misc-1',
    category: 'misc',
    textKey: 'azkar.misc.1.text',
    benefitKey: 'benefit.misc.1',
    count: 1,
    source: 'الترمذي',
  },
  {
    id: 'misc-2',
    category: 'misc',
    textKey: 'azkar.misc.2.text',
    benefitKey: 'benefit.misc.2',
    count: 1,
    source: 'أحمد والترمذي',
  },
  {
    id: 'misc-3',
    category: 'misc',
    textKey: 'azkar.misc.3.text',
    count: 1,
    source: 'البخاري ومسلم',
  },
  {
    id: 'misc-4',
    category: 'misc',
    textKey: 'azkar.misc.4.text',
    count: 1,
    source: 'مسلم',
  },
  {
    id: 'misc-5',
    category: 'misc',
    textKey: 'azkar.misc.5.text',
    count: 1,
    source: 'الترمذي',
  },
];

// ========================================
// تصدير جميع الأذكار
// ========================================
export const allAzkar: Zikr[] = [
  ...morningAzkar,
  ...eveningAzkar,
  ...sleepAzkar,
  ...wakeupAzkar,
  ...afterPrayerAzkar,
  ...miscAzkar,
];

// ========================================
// دوال مساعدة
// ========================================
export const getAzkarByCategory = (category: AzkarCategory): Zikr[] => {
  return allAzkar.filter(zikr => zikr.category === category);
};

export const getZikrById = (id: string): Zikr | undefined => {
  return allAzkar.find(zikr => zikr.id === id);
};

export const getCategoryCount = (category: AzkarCategory): number => {
  return getAzkarByCategory(category).length;
};

export const getTotalAzkarCount = (): number => {
  return allAzkar.length;
};

// ========================================
// إحصائيات الأذكار
// ========================================
export const azkarStats = {
  morning: morningAzkar.length,
  evening: eveningAzkar.length,
  sleep: sleepAzkar.length,
  wakeup: wakeupAzkar.length,
  afterPrayer: afterPrayerAzkar.length,
  misc: miscAzkar.length,
  total: allAzkar.length,
};

export default allAzkar;
