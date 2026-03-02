// data/ruqya.ts
// بيانات الرقية الشرعية الأساسية - روح المسلم
// الترجمات موجودة في data/translations/ruqya.ts

// ========================================
// أنواع البيانات
// ========================================
export interface Ruqya {
  id: string;
  category: RuqyaCategory;
  textKey: string; // مفتاح الترجمة للنص
  nameKey: string; // مفتاح الترجمة للاسم
  benefitKey?: string; // مفتاح الترجمة للفائدة
  referenceKey?: string; // مفتاح الترجمة للمصدر
  count: number;
  audioUrl?: string;
}

export type RuqyaCategory = 
  | 'quran'
  | 'sunnah';

// ========================================
// الرقية من القرآن الكريم
// ========================================
export const quranRuqya: Ruqya[] = [
  {
    id: 'quran-1',
    category: 'quran',
    textKey: 'ruqya.quran.1.text',
    nameKey: 'ruqya.quran.1.name',
    benefitKey: 'ruqya.quran.1.benefit',
    count: 7,
  },
  {
    id: 'quran-2',
    category: 'quran',
    textKey: 'ruqya.quran.2.text',
    nameKey: 'ruqya.quran.2.name',
    benefitKey: 'ruqya.quran.2.benefit',
    count: 1,
  },
  {
    id: 'quran-3',
    category: 'quran',
    textKey: 'ruqya.quran.3.text',
    nameKey: 'ruqya.quran.3.name',
    benefitKey: 'ruqya.quran.3.benefit',
    count: 3,
  },
  {
    id: 'quran-4',
    category: 'quran',
    textKey: 'ruqya.quran.4.text',
    nameKey: 'ruqya.quran.4.name',
    benefitKey: 'ruqya.quran.4.benefit',
    count: 3,
  },
  {
    id: 'quran-5',
    category: 'quran',
    textKey: 'ruqya.quran.5.text',
    nameKey: 'ruqya.quran.5.name',
    benefitKey: 'ruqya.quran.5.benefit',
    count: 3,
  },
];

// ========================================
// الرقية من السنة النبوية
// ========================================
export const sunnahRuqya: Ruqya[] = [
  {
    id: 'sunnah-1',
    category: 'sunnah',
    textKey: 'ruqya.sunnah.1.text',
    nameKey: 'ruqya.sunnah.1.name',
    referenceKey: 'ruqya.sunnah.1.reference',
    count: 3,
  },
  {
    id: 'sunnah-2',
    category: 'sunnah',
    textKey: 'ruqya.sunnah.2.text',
    nameKey: 'ruqya.sunnah.2.name',
    referenceKey: 'ruqya.sunnah.2.reference',
    count: 3,
  },
  {
    id: 'sunnah-3',
    category: 'sunnah',
    textKey: 'ruqya.sunnah.3.text',
    nameKey: 'ruqya.sunnah.3.name',
    referenceKey: 'ruqya.sunnah.3.reference',
    count: 3,
  },
  {
    id: 'sunnah-4',
    category: 'sunnah',
    textKey: 'ruqya.sunnah.4.text',
    nameKey: 'ruqya.sunnah.4.name',
    referenceKey: 'ruqya.sunnah.4.reference',
    count: 7,
  },
  {
    id: 'sunnah-5',
    category: 'sunnah',
    textKey: 'ruqya.sunnah.5.text',
    nameKey: 'ruqya.sunnah.5.name',
    referenceKey: 'ruqya.sunnah.5.reference',
    count: 7,
  },
];

// ========================================
// تصدير جميع الرقية
// ========================================
export const allRuqya: Ruqya[] = [
  ...quranRuqya,
  ...sunnahRuqya,
];

// ========================================
// دوال مساعدة
// ========================================
export const getRuqyaByCategory = (category: RuqyaCategory): Ruqya[] => {
  return allRuqya.filter(ruqya => ruqya.category === category);
};

export const getRuqyaById = (id: string): Ruqya | undefined => {
  return allRuqya.find(ruqya => ruqya.id === id);
};

export const getCategoryCount = (category: RuqyaCategory): number => {
  return getRuqyaByCategory(category).length;
};

export const getTotalRuqyaCount = (): number => {
  return allRuqya.length;
};

// ========================================
// إحصائيات الرقية
// ========================================
export const ruqyaStats = {
  quran: quranRuqya.length,
  sunnah: sunnahRuqya.length,
  total: allRuqya.length,
};

export default allRuqya;
