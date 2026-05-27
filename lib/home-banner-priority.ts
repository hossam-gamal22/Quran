import type { WelcomeBannerConfig } from '@/lib/app-config-api';
import type { SeasonType } from '@/lib/seasonal-content';

export type HomeBannerSource = 'welcome' | 'adminSeasonal' | 'autoSeasonal';

export interface HomeBannerSelectionInput {
  welcomeBanner: WelcomeBannerConfig | null;
  adminSeasonalBanner: WelcomeBannerConfig | null;
  autoSeasonalBanner: WelcomeBannerConfig | null;
  currentSeasonType?: SeasonType | null;
  now?: Date;
}

export interface HomeBannerSelection {
  banner: WelcomeBannerConfig;
  source: HomeBannerSource;
}

const EID_SEASON_TYPES = new Set<SeasonType>(['eid_fitr', 'eid_adha']);

function collectBannerText(banner: WelcomeBannerConfig): string {
  const textParts = [
    banner.title,
    banner.subtitle,
    ...Object.values(banner.titles ?? {}),
    ...Object.values(banner.subtitles ?? {}),
  ];

  return textParts
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();
}

function looksLikeSeasonThatEndedBeforeEid(
  banner: WelcomeBannerConfig,
  currentSeasonType?: SeasonType | null,
): boolean {
  const text = collectBannerText(banner);

  if (currentSeasonType === 'eid_adha') {
    return (
      text.includes('ذي الحجة') ||
      text.includes('ذو الحجة') ||
      text.includes('العشر') ||
      text.includes('dhul hijjah') ||
      text.includes('dhu al hijjah') ||
      text.includes('dhu al-hijjah') ||
      text.includes('first ten')
    );
  }

  if (currentSeasonType === 'eid_fitr') {
    return (
      text.includes('رمضان') ||
      text.includes('ramadan')
    );
  }

  return false;
}

export function isWelcomeBannerActive(
  banner: WelcomeBannerConfig | null,
  now: Date = new Date(),
): boolean {
  if (!banner || !banner.enabled) return false;

  if (banner.scheduledFrom) {
    const from = new Date(banner.scheduledFrom);
    if (from > now) return false;
  }

  if (banner.scheduledUntil) {
    const until = new Date(banner.scheduledUntil);
    if (until < now) return false;
  }

  return true;
}

export function selectHomeBanner(input: HomeBannerSelectionInput): HomeBannerSelection | null {
  const now = input.now ?? new Date();
  const seasonalSelection = input.adminSeasonalBanner
    ? { banner: input.adminSeasonalBanner, source: 'adminSeasonal' as const }
    : input.autoSeasonalBanner
      ? { banner: input.autoSeasonalBanner, source: 'autoSeasonal' as const }
      : null;

  if (isWelcomeBannerActive(input.welcomeBanner, now) && input.welcomeBanner) {
    if (
      seasonalSelection &&
      input.currentSeasonType &&
      EID_SEASON_TYPES.has(input.currentSeasonType) &&
      looksLikeSeasonThatEndedBeforeEid(input.welcomeBanner, input.currentSeasonType)
    ) {
      return seasonalSelection;
    }

    return { banner: input.welcomeBanner, source: 'welcome' };
  }

  return seasonalSelection;
}
