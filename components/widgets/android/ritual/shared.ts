// components/widgets/android/ritual/shared.ts
// Design tokens for the new "Ritual" prayer widget family.
// Glass-style aesthetic mirroring the iOS .ultraThinMaterial look on Android
// via translucent dark backgrounds (Android cannot do real blur in widgets).

export const RITUAL = {
  // Translucent dark "glass" — lets system wallpaper bleed through subtly
  glassBg: '#B3000000' as const, // ~70% black
  glassBgStrong: '#CC000000' as const, // ~80% black for headings
  glassBorder: '#33FFFFFF' as const, // 20% white hairline
  // Pure white text + muted variants
  text: '#FFFFFF' as const,
  textMuted: '#B3FFFFFF' as const, // 70% white
  textFaint: '#80FFFFFF' as const, // 50% white
  // Dividers
  divider: '#1AFFFFFF' as const, // 10% white
  // Highlight pill (current prayer row)
  highlightBg: '#26FFFFFF' as const, // 15% white
  // Radius
  radius: 28,
  radiusInner: 18,
} as const;

/** Localized short prayer name for the "next prayer" headline (no kashida applied here — caller decides). */
export function prayerLabel(name: string, isArabic: boolean): string {
  if (isArabic) return name;
  // Map Arabic → Latin for non-Arabic UI
  const map: Record<string, string> = {
    'الفجر': 'Fajr',
    'الشروق': 'Sunrise',
    'الظهر': 'Dhuhr',
    'العصر': 'Asr',
    'المغرب': 'Maghrib',
    'العشاء': 'Isha',
  };
  return map[name] ?? name;
}

/** Pick a glyph for a prayer (sun for daytime, moon for night, sunrise icon, etc.) */
export function prayerGlyph(prayerKey: string): string {
  const k = (prayerKey || '').toLowerCase();
  if (k.includes('fajr') || k === 'الفجر') return '🌄';
  if (k.includes('sun') || k.includes('shuruq') || k === 'الشروق') return '☀️';
  if (k.includes('dhuhr') || k.includes('zuhr') || k === 'الظهر') return '☀️';
  if (k.includes('asr') || k === 'العصر') return '⛅';
  if (k.includes('maghrib') || k === 'المغرب') return '🌅';
  if (k.includes('isha') || k === 'العشاء') return '🌙';
  return '🕌';
}

/** Convert "1h 23m" countdown to a localized "in 1h 23m" / "بعد ١س ٢٣د" string. */
export function formatCountdown(remaining: string, isArabic: boolean): string {
  if (!remaining) return isArabic ? 'الآن' : 'now';
  if (isArabic) {
    // Convert latin numerals to Arabic-Indic if any leak through (we keep western per workspace rule)
    // workspace standard: keep Western numerals — just prepend "بعد"
    return `بعد ${remaining}`;
  }
  return `in ${remaining}`;
}
