// data/duas.ts
// بيانات الأدعية الأساسية - روح المسلم
// الترجمات موجودة في data/translations/duas.ts

// ========================================
// أنواع البيانات
// ========================================
export interface Dua {
  id: string;
  category: DuaCategory;
  textKey: string; // مفتاح الترجمة للنص
  referenceKey: string; // مفتاح الترجمة للمصدر
  audioUrl?: string;
}

export type DuaCategory = 
  | 'quran'
  | 'sunnah'
  | 'misc';

// ========================================
// أدعية من القرآن الكريم
// ========================================
export const quranDuas: Dua[] = [
  {
    id: 'quran-1',
    category: 'quran',
    textKey: 'dua.quran.1.text',
    referenceKey: 'dua.quran.1.reference',
  },
  {
    id: 'quran-2',
    category: 'quran',
    textKey: 'dua.quran.2.text',
    referenceKey: 'dua.quran.2.reference',
  },
  {
    id: 'quran-3',
    category: 'quran',
    textKey: 'dua.quran.3.text',
    referenceKey: 'dua.quran.3.reference',
  },
  {
    id: 'quran-4',
    category: 'quran',
    textKey: 'dua.quran.4.text',
    referenceKey: 'dua.quran.4.reference',
  },
  {
    id: 'quran-5',
    category: 'quran',
    textKey: 'dua.quran.5.text',
    referenceKey: 'dua.quran.5.reference',
  },
  {
    id: 'quran-6',
    category: 'quran',
    textKey: 'dua.quran.6.text',
    referenceKey: 'dua.quran.6.reference',
  },
  {
    id: 'quran-7',
    category: 'quran',
    textKey: 'dua.quran.7.text',
    referenceKey: 'dua.quran.7.reference',
  },
  {
    id: 'quran-8',
    category: 'quran',
    textKey: 'dua.quran.8.text',
    referenceKey: 'dua.quran.8.reference',
  },
  {
    id: 'quran-9',
    category: 'quran',
    textKey: 'dua.quran.9.text',
    referenceKey: 'dua.quran.9.reference',
  },
  {
    id: 'quran-10',
    category: 'quran',
    textKey: 'dua.quran.10.text',
    referenceKey: 'dua.quran.10.reference',
  },
  {
    id: 'quran-11',
    category: 'quran',
    textKey: 'dua.quran.11.text',
    referenceKey: 'dua.quran.11.reference',
  },
  {
    id: 'quran-12',
    category: 'quran',
    textKey: 'dua.quran.12.text',
    referenceKey: 'dua.quran.12.reference',
  },
  {
    id: 'quran-13',
    category: 'quran',
    textKey: 'dua.quran.13.text',
    referenceKey: 'dua.quran.13.reference',
  },
  {
    id: 'quran-14',
    category: 'quran',
    textKey: 'dua.quran.14.text',
    referenceKey: 'dua.quran.14.reference',
  },
  {
    id: 'quran-15',
    category: 'quran',
    textKey: 'dua.quran.15.text',
    referenceKey: 'dua.quran.15.reference',
  },
];

// ========================================
// أدعية من السنة النبوية
// ========================================
export const sunnahDuas: Dua[] = [
  {
    id: 'sunnah-1',
    category: 'sunnah',
    textKey: 'dua.sunnah.1.text',
    referenceKey: 'dua.sunnah.1.reference',
  },
  {
    id: 'sunnah-2',
    category: 'sunnah',
    textKey: 'dua.sunnah.2.text',
    referenceKey: 'dua.sunnah.2.reference',
  },
  {
    id: 'sunnah-3',
    category: 'sunnah',
    textKey: 'dua.sunnah.3.text',
    referenceKey: 'dua.sunnah.3.reference',
  },
  {
    id: 'sunnah-4',
    category: 'sunnah',
    textKey: 'dua.sunnah.4.text',
    referenceKey: 'dua.sunnah.4.reference',
  },
  {
    id: 'sunnah-5',
    category: 'sunnah',
    textKey: 'dua.sunnah.5.text',
    referenceKey: 'dua.sunnah.5.reference',
  },
  {
    id: 'sunnah-6',
    category: 'sunnah',
    textKey: 'dua.sunnah.6.text',
    referenceKey: 'dua.sunnah.6.reference',
  },
  {
    id: 'sunnah-7',
    category: 'sunnah',
    textKey: 'dua.sunnah.7.text',
    referenceKey: 'dua.sunnah.7.reference',
  },
  {
    id: 'sunnah-8',
    category: 'sunnah',
    textKey: 'dua.sunnah.8.text',
    referenceKey: 'dua.sunnah.8.reference',
  },
  {
    id: 'sunnah-9',
    category: 'sunnah',
    textKey: 'dua.sunnah.9.text',
    referenceKey: 'dua.sunnah.9.reference',
  },
  {
    id: 'sunnah-10',
    category: 'sunnah',
    textKey: 'dua.sunnah.10.text',
    referenceKey: 'dua.sunnah.10.reference',
  },
  {
    id: 'sunnah-11',
    category: 'sunnah',
    textKey: 'dua.sunnah.11.text',
    referenceKey: 'dua.sunnah.11.reference',
  },
  {
    id: 'sunnah-12',
    category: 'sunnah',
    textKey: 'dua.sunnah.12.text',
    referenceKey: 'dua.sunnah.12.reference',
  },
  {
    id: 'sunnah-13',
    category: 'sunnah',
    textKey: 'dua.sunnah.13.text',
    referenceKey: 'dua.sunnah.13.reference',
  },
  {
    id: 'sunnah-14',
    category: 'sunnah',
    textKey: 'dua.sunnah.14.text',
    referenceKey: 'dua.sunnah.14.reference',
  },
  {
    id: 'sunnah-15',
    category: 'sunnah',
    textKey: 'dua.sunnah.15.text',
    referenceKey: 'dua.sunnah.15.reference',
  },
];

// ========================================
// أدعية متنوعة
// ========================================
export const miscDuas: Dua[] = [
  {
    id: 'misc-1',
    category: 'misc',
    textKey: 'dua.misc.1.text',
    referenceKey: 'dua.misc.1.reference',
  },
  {
    id: 'misc-2',
    category: 'misc',
    textKey: 'dua.misc.2.text',
    referenceKey: 'dua.misc.2.reference',
  },
  {
    id: 'misc-3',
    category: 'misc',
    textKey: 'dua.misc.3.text',
    referenceKey: 'dua.misc.3.reference',
  },
  {
    id: 'misc-4',
    category: 'misc',
    textKey: 'dua.misc.4.text',
    referenceKey: 'dua.misc.4.reference',
  },
  {
    id: 'misc-5',
    category: 'misc',
    textKey: 'dua.misc.5.text',
    referenceKey: 'dua.misc.5.reference',
  },
  {
    id: 'misc-6',
    category: 'misc',
    textKey: 'dua.misc.6.text',
    referenceKey: 'dua.misc.6.reference',
  },
  {
    id: 'misc-7',
    category: 'misc',
    textKey: 'dua.misc.7.text',
    referenceKey: 'dua.misc.7.reference',
  },
  {
    id: 'misc-8',
    category: 'misc',
    textKey: 'dua.misc.8.text',
    referenceKey: 'dua.misc.8.reference',
  },
];

// ========================================
// تصدير جميع الأدعية
// ========================================
export const allDuas: Dua[] = [
  ...quranDuas,
  ...sunnahDuas,
  ...miscDuas,
];

// ========================================
// دوال مساعدة
// ========================================
export const getDuasByCategory = (category: DuaCategory): Dua[] => {
  return allDuas.filter(dua => dua.category === category);
};

export const getDuaById = (id: string): Dua | undefined => {
  return allDuas.find(dua => dua.id === id);
};

export const getCategoryCount = (category: DuaCategory): number => {
  return getDuasByCategory(category).length;
};

export const getTotalDuasCount = (): number => {
  return allDuas.length;
};

// ========================================
// إحصائيات الأدعية
// ========================================
export const duasStats = {
  quran: quranDuas.length,
  sunnah: sunnahDuas.length,
  misc: miscDuas.length,
  total: allDuas.length,
};

export default allDuas;
