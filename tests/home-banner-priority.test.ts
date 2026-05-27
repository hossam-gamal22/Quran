import { describe, expect, it } from 'vitest';
import { selectHomeBanner } from '@/lib/home-banner-priority';
import type { WelcomeBannerConfig } from '@/lib/app-config-api';

const dhulHijjahWelcomeBanner: WelcomeBannerConfig = {
  enabled: true,
  title: 'العشر المباركة من ذي الحجة',
  subtitle: 'أيام فاضلة للذكر والتكبير والعمل الصالح',
  icon: 'star-crescent',
  color: '#DAA520',
  route: '/seasonal/hajj',
  displayMode: 'text',
  scheduledFrom: '2026-05-18T00:00',
  scheduledUntil: '2026-05-28T00:00',
};

const eidAdhaBanner: WelcomeBannerConfig = {
  enabled: true,
  title: 'عيد الأضحى المبارك',
  subtitle: 'تقبل الله منا ومنكم صالح الأعمال',
  icon: 'sheep',
  color: '#CD853F',
  route: '/seasonal/hajj',
  displayMode: 'text',
};

describe('home banner priority', () => {
  it('lets Eid al-Adha replace an active Dhul Hijjah welcome banner on Eid day', () => {
    const selected = selectHomeBanner({
      welcomeBanner: dhulHijjahWelcomeBanner,
      adminSeasonalBanner: null,
      autoSeasonalBanner: eidAdhaBanner,
      currentSeasonType: 'eid_adha',
      now: new Date('2026-05-27T09:00:00+04:00'),
    });

    expect(selected?.banner.title).toBe('عيد الأضحى المبارك');
    expect(selected?.source).toBe('autoSeasonal');
  });

  it('keeps a normal active welcome banner ahead of seasonal fallbacks', () => {
    const selected = selectHomeBanner({
      welcomeBanner: {
        ...dhulHijjahWelcomeBanner,
        title: 'تنبيه مهم',
        subtitle: 'رسالة خاصة من الإدارة',
      },
      adminSeasonalBanner: null,
      autoSeasonalBanner: eidAdhaBanner,
      currentSeasonType: 'eid_adha',
      now: new Date('2026-05-27T09:00:00+04:00'),
    });

    expect(selected?.banner.title).toBe('تنبيه مهم');
    expect(selected?.source).toBe('welcome');
  });
});
