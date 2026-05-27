import { describe, expect, it } from 'vitest';
import {
  ANDROID_DYNAMIC_ICON_ALIASES,
  buildAndroidLauncherIconRequest,
} from '@/lib/android-launcher-icon-request';

describe('android launcher icon request', () => {
  it('passes every dynamic alias when switching to a seasonal icon', () => {
    const request = buildAndroidLauncherIconRequest('ramadan');

    expect(request.targetIconName).toBe('ramadan');
    expect(request.aliases).toEqual([
      'app_icon_english',
      'ramadan',
      'hajj',
      'mawlid',
      'eid_fitr',
      'eid_adha',
      'dhul_hijjah',
    ]);
  });

  it('uses the primary launcher for the Arabic default while still cleaning aliases', () => {
    const request = buildAndroidLauncherIconRequest('default_ar');

    expect(request.targetIconName).toBeNull();
    expect(request.aliases).toEqual(ANDROID_DYNAMIC_ICON_ALIASES);
  });

  it('maps the English default to the bundled English launcher alias', () => {
    const request = buildAndroidLauncherIconRequest('default_en');

    expect(request.targetIconName).toBe('app_icon_english');
    expect(request.aliases).toEqual(ANDROID_DYNAMIC_ICON_ALIASES);
  });
});
