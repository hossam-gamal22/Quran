// lib/prewarm-daily-ayah.ts
// Warms up everything the "Verse of the Day" screen needs so the first entry
// is instant: resolves today's verse, loads its per-page QCF Mushaf font, and
// preloads the bundled background image. Designed to run once, lazily, after
// the app is idle — never blocking startup.

import { Platform } from 'react-native';

let prewarmStarted = false;

/**
 * Idempotent, fire-and-forget warmup for the daily ayah screen.
 * Safe to call multiple times — only the first call does work.
 *
 * The theme is resolved internally from the cached snapshot so callers don't
 * need to thread it through, and so the correct light/dark QCF font variant is
 * cached.
 */
export function prewarmDailyAyah(): void {
  if (prewarmStarted) return;
  prewarmStarted = true;

  // Defer off the critical path; failures are swallowed (warmup is best-effort).
  setTimeout(() => {
    (async () => {
      try {
        // Match the screen's current theme so the right QCF font variant warms.
        let darkMode = false;
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { getCachedThemeSnapshot } = require('@/contexts/SettingsContext');
          darkMode = getCachedThemeSnapshot()?.isDarkMode === true;
        } catch {}

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { resolveDailyVerse } = require('@/lib/seasonal-ayah');
        const { ayah } = await resolveDailyVerse();
        if (!ayah?.surah || !ayah?.ayah) return;

        // 1. QCF Mushaf font for the verse's page — the main source of the
        //    "first-open" lag, since it's otherwise loaded lazily on entry.
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { getVerseQcfData } = require('@/lib/qcf-page-data');
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { loadPageFont } = require('@/lib/qcf-font-loader');
          const data = getVerseQcfData(ayah.surah, ayah.ayah);
          if (data?.page) {
            await loadPageFont(data.page, darkMode).catch(() => {});
          }
        } catch {}

        // 2. Background image — today's bundled nature PNG (same deterministic
        //    index the screen uses) so it's decoded before the user arrives.
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { Asset } = require('expo-asset');
          const backgrounds: number[] = [
            require('@/assets/images/daily-ayah-bg/nature1.png'),
            require('@/assets/images/daily-ayah-bg/nature2.png'),
            require('@/assets/images/daily-ayah-bg/nature3.png'),
            require('@/assets/images/daily-ayah-bg/nature4.png'),
            require('@/assets/images/daily-ayah-bg/nature5.png'),
            require('@/assets/images/daily-ayah-bg/nature6.png'),
            require('@/assets/images/daily-ayah-bg/nature7.png'),
            require('@/assets/images/daily-ayah-bg/nature8.png'),
            require('@/assets/images/daily-ayah-bg/nature9.png'),
            require('@/assets/images/daily-ayah-bg/nature10.png'),
            require('@/assets/images/daily-ayah-bg/nature11.png'),
          ];
          const today = new Date();
          const startOfYear = new Date(today.getFullYear(), 0, 0);
          const dayOfYear = Math.floor(
            (today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24),
          );
          const idx = ((dayOfYear % backgrounds.length) + backgrounds.length) % backgrounds.length;
          await Asset.fromModule(backgrounds[idx]).downloadAsync().catch(() => {});
        } catch {}
      } catch {
        // Warmup is best-effort; ignore all failures.
      }
    })();
  }, Platform.OS === 'ios' ? 2500 : 3500);
}
