import { afterEach, describe, expect, it } from 'vitest';
import {
  detectArabicSeasonalBannerKey,
  getArabicSeasonalBannerCopy,
  normalizeArabicSeasonalBannerCopies,
  resetArabicSeasonalBannerCopyOverrides,
  setArabicSeasonalBannerCopyOverrides,
} from '@/lib/seasonal-banner-copy';
import { applySeasonsMetadataOverrides, getCurrentSeason, getSeasonalGreeting } from '@/lib/seasonal-content';

describe('seasonal banner copy', () => {
  afterEach(() => {
    resetArabicSeasonalBannerCopyOverrides();
  });

  it('uses the unified Eid al-Adha wording shown on the home banner', () => {
    expect(getArabicSeasonalBannerCopy('eid_adha')).toEqual({
      title: 'عيد الأضحى المبارك',
      subtitle: 'تقبل الله منا ومنكم صالح الأعمال',
    });
  });

  it('does not provide copy for unknown season keys', () => {
    expect(getArabicSeasonalBannerCopy('unknown')).toBeNull();
  });

  it('keeps Eid al-Adha greeting stable across app launches', () => {
    expect(getSeasonalGreeting('eid_adha')).toBe('تقبل الله منا ومنكم صالح الأعمال');
    expect(getSeasonalGreeting('eid_adha')).toBe('تقبل الله منا ومنكم صالح الأعمال');
  });

  it('detects old Eid al-Adha banner text and maps it to the unified copy', () => {
    expect(detectArabicSeasonalBannerKey('عيد الأضحى المبارك كل عام وأنتم بخير')).toBe('eid_adha');
    expect(getArabicSeasonalBannerCopy(detectArabicSeasonalBannerKey('عيد أضحى مبارك'))?.subtitle)
      .toBe('تقبل الله منا ومنكم صالح الأعمال');
  });

  it('normalizes Firebase metadata overrides before greetings are used', () => {
    applySeasonsMetadataOverrides({
      eid_adha: {
        nameAr: 'عيد الأضحى المبارك',
        description: 'عيد الحج والتكبير وأيام التشريق',
        greetings: ['عيد أضحى مبارك', 'تقبل الله طاعتكم', 'كل عام وأنتم بخير'],
      },
    });

    expect(getSeasonalGreeting('eid_adha')).toBe('تقبل الله منا ومنكم صالح الأعمال');
  });

  it('uses Firebase seasonal banner copy overrides when they are loaded', () => {
    setArabicSeasonalBannerCopyOverrides({
      eid_adha: {
        title: 'نص عيد جديد',
        subtitle: 'نص موحد من الأدمن',
      },
    });

    expect(getArabicSeasonalBannerCopy('eid_adha')).toEqual({
      title: 'نص عيد جديد',
      subtitle: 'نص موحد من الأدمن',
    });
  });

  it('normalizes partial Firebase copy with local fallback values', () => {
    const normalized = normalizeArabicSeasonalBannerCopies({
      eid_adha: { subtitle: 'تعديل من الأدمن' },
      unknown: { title: 'x', subtitle: 'y' },
    });

    expect(normalized).toEqual({
      eid_adha: {
        title: 'عيد الأضحى المبارك',
        subtitle: 'تعديل من الأدمن',
      },
    });
  });

  it('keeps Dhul Hijjah banner active through day 9, then switches to Eid al-Adha on day 10', () => {
    expect(getCurrentSeason({ year: 1447, month: 12, day: 9 })?.type).toBe('dhul_hijjah');
    expect(getCurrentSeason({ year: 1447, month: 12, day: 10 })?.type).toBe('eid_adha');
  });
});
