import type { SeasonalIconKey } from '@/lib/app-icon-manager';

export const ANDROID_DYNAMIC_ICON_ALIASES = [
  'app_icon_english',
  'ramadan',
  'hajj',
  'mawlid',
  'eid_fitr',
  'eid_adha',
  'dhul_hijjah',
] as const;

export type AndroidDynamicIconAlias = typeof ANDROID_DYNAMIC_ICON_ALIASES[number];

export type AndroidLauncherIconRequest = {
  targetIconName: AndroidDynamicIconAlias | null;
  aliases: readonly AndroidDynamicIconAlias[];
};

export function buildAndroidLauncherIconRequest(key: SeasonalIconKey): AndroidLauncherIconRequest {
  const targetIconName = key === 'default_ar'
    ? null
    : key === 'default_en'
      ? 'app_icon_english'
      : key;

  return {
    targetIconName,
    aliases: ANDROID_DYNAMIC_ICON_ALIASES,
  };
}
