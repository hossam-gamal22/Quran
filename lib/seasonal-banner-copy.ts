import type { SeasonType } from './seasonal-content';

export interface SeasonalBannerCopy {
  title?: string;
  subtitle: string;
}

export type ArabicSeasonalBannerCopyMap = Partial<Record<SeasonType, SeasonalBannerCopy>>;

const ARABIC_SEASONAL_BANNER_COPY: Partial<Record<SeasonType, SeasonalBannerCopy>> = {
  ramadan: {
    title: 'رمضان المبارك',
    subtitle: 'شهر الصيام والقيام وتلاوة القرآن',
  },
  hajj: {
    title: 'موسم الحج',
    subtitle: 'الركن الخامس من أركان الإسلام',
  },
  dhul_hijjah: {
    title: 'العشر الأوائل من ذي الحجة',
    subtitle: 'أفضل أيام الدنيا — فأكثروا من العمل الصالح',
  },
  mawlid: {
    title: 'ذكرى المولد النبوي',
    subtitle: 'صلوا على النبي ﷺ',
  },
  ashura: {
    title: 'عاشوراء',
    subtitle: 'صيامه يكفر سنة ماضية',
  },
  eid_fitr: {
    title: 'عيد الفطر المبارك',
    subtitle: 'كل عام وأنتم بخير — تقبل الله طاعتكم',
  },
  eid_adha: {
    title: 'عيد الأضحى المبارك',
    subtitle: 'تقبل الله منا ومنكم صالح الأعمال',
  },
  muharram: {
    title: 'شهر محرم',
    subtitle: 'أول شهور السنة الهجرية',
  },
  rajab: {
    title: 'شهر رجب',
    subtitle: 'من الأشهر الحرم — أعظِم فيه الطاعة',
  },
  shaban: {
    title: 'شهر شعبان',
    subtitle: 'اللهم بلِّغنا رمضان',
  },
};

let remoteArabicSeasonalBannerCopy: ArabicSeasonalBannerCopyMap = {};

export const ARABIC_SEASONAL_BANNER_COPY_KEYS = Object.keys(
  ARABIC_SEASONAL_BANNER_COPY,
) as SeasonType[];

export function normalizeArabicSeasonalBannerCopies(
  input?: Record<string, Partial<SeasonalBannerCopy> | null> | null,
): ArabicSeasonalBannerCopyMap {
  const normalized: ArabicSeasonalBannerCopyMap = {};
  if (!input) return normalized;

  for (const [seasonKey, rawCopy] of Object.entries(input)) {
    const fallback = ARABIC_SEASONAL_BANNER_COPY[seasonKey as SeasonType];
    if (!fallback || !rawCopy) continue;

    const title = typeof rawCopy.title === 'string' && rawCopy.title.trim()
      ? rawCopy.title.trim()
      : fallback.title;
    const subtitle = typeof rawCopy.subtitle === 'string' && rawCopy.subtitle.trim()
      ? rawCopy.subtitle.trim()
      : fallback.subtitle;

    normalized[seasonKey as SeasonType] = {
      title,
      subtitle,
    };
  }

  return normalized;
}

export function setArabicSeasonalBannerCopyOverrides(
  overrides?: Record<string, Partial<SeasonalBannerCopy> | null> | null,
): void {
  remoteArabicSeasonalBannerCopy = normalizeArabicSeasonalBannerCopies(overrides);
}

export function resetArabicSeasonalBannerCopyOverrides(): void {
  remoteArabicSeasonalBannerCopy = {};
}

export function getAllArabicSeasonalBannerCopies(
  overrides?: Record<string, Partial<SeasonalBannerCopy> | null> | null,
): Record<string, SeasonalBannerCopy> {
  const normalizedOverrides = normalizeArabicSeasonalBannerCopies(overrides);
  const merged: Record<string, SeasonalBannerCopy> = {};

  for (const seasonKey of ARABIC_SEASONAL_BANNER_COPY_KEYS) {
    const fallback = ARABIC_SEASONAL_BANNER_COPY[seasonKey];
    if (!fallback) continue;
    merged[seasonKey] = normalizedOverrides[seasonKey] || remoteArabicSeasonalBannerCopy[seasonKey] || fallback;
  }

  return merged;
}

export function getArabicSeasonalBannerCopy(
  seasonType?: SeasonType | string | null,
): SeasonalBannerCopy | null {
  if (!seasonType) return null;
  return remoteArabicSeasonalBannerCopy[seasonType as SeasonType]
    ?? ARABIC_SEASONAL_BANNER_COPY[seasonType as SeasonType]
    ?? null;
}

export function detectArabicSeasonalBannerKey(
  text?: string | null,
): SeasonType | null {
  if (!text) return null;

  if (text.includes('عيد الأضحى') || text.includes('أضحى')) return 'eid_adha';
  if (text.includes('عيد الفطر')) return 'eid_fitr';
  if (text.includes('العشر') || text.includes('ذي الحجة') || text.includes('ذو الحجة')) return 'dhul_hijjah';
  if (text.includes('رمضان')) return 'ramadan';
  if (text.includes('موسم الحج')) return 'hajj';
  if (text.includes('المولد')) return 'mawlid';
  if (text.includes('عاشوراء')) return 'ashura';
  if (text.includes('محرم')) return 'muharram';
  if (text.includes('رجب')) return 'rajab';
  if (text.includes('شعبان')) return 'shaban';

  return null;
}
