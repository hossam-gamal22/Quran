// constants/quran-themes.ts
// ألوان ثيمات القرآن — مطابقة لتطبيق Skoon
// كل ثيم يحتوي على: لون النص الرئيسي، لون الخلفية، لون ثانوي (أرقام الآيات)، لون التمييز

import { isColorLight, getContrastTextColor, getContrastPalette } from '@/lib/contrast-helper';

export interface QuranTheme {
  primary: string;       // لون نص القرآن
  background: string;    // لون خلفية الصفحة
  secondary: string;     // لون أرقام الآيات / عناصر الزينة
  highlight: string;     // لون التمييز
  // Extended fields (optional, backward-compatible)
  id?: string;           // Unique ID for admin reference
  name?: Record<string, string>; // Multilingual names { ar: '...', en: '...', ... }
  iconUrl?: string;      // Firebase Storage icon URL
  iconStoragePath?: string; // Storage path for icon deletion
  order?: number;        // Display order
}

// 17 ثيم من تطبيق Skoon
let QURAN_THEMES: QuranTheme[] = [
  // 0 — كلاسيك (الافتراضي) ✓ contrast OK
  { primary: '#1A1000', background: '#FFF8F0', secondary: '#6B4E2A', highlight: '#FFC936' },
  // 1 — أخضر طبيعي ✓ contrast OK
  { primary: '#1A2410', background: '#FEFAE0', secondary: '#3D4A22', highlight: '#BC6B25' },
  // 2 — بني عتيق — darkened primary for better contrast
  { primary: '#5C3010', background: '#FFFCE7', secondary: '#8A6C00', highlight: '#FFF49D' },
  // 3 — أبيض نقي ✓ perfect contrast
  { primary: '#000000', background: '#FFFFFF', secondary: '#2B2B2B', highlight: '#59D8FF' },
  // 4 — أزرق — darkened blue for better contrast (was #4C76BA)
  { primary: '#1B4F8A', background: '#FFFFFF', secondary: '#004A99', highlight: '#59D8FF' },
  // 5 — داكن كحلي ✓ contrast OK
  { primary: '#FFFFFF', background: '#22303C', secondary: '#4EAAFF', highlight: '#78C0FF' },
  // 6 — داكن أزرق — lightened primary & secondary for visibility
  { primary: '#D8CAB5', background: '#213440', secondary: '#C4A840', highlight: '#FFF49D' },
  // 7 — رمادي داكن — darkened background for better contrast
  { primary: '#FFFFFF', background: '#4A4A4A', secondary: '#FFD090', highlight: '#FFF49D' },
  // 8 — داكن بنفسجي — lightened primary for visibility
  { primary: '#FFE0C0', background: '#3A383B', secondary: '#FFC060', highlight: '#FFF49D' },
  // 9 — فاتح محايد ✓ contrast OK
  { primary: '#000000', background: '#F3F6F4', secondary: '#161514', highlight: '#78C0FF' },
  // 10 — أسود ✓ contrast OK
  { primary: '#FFFFFF', background: '#1A1A1A', secondary: '#E0E0E0', highlight: '#78C0FF' },
  // 11 — سماوي فاتح ✓ contrast OK
  { primary: '#000000', background: '#E7F7FE', secondary: '#0A1418', highlight: '#78C0FF' },
  // 12 — أخضر فاتح ✓ contrast OK
  { primary: '#000000', background: '#F4FDD3', secondary: '#1C1D17', highlight: '#78C0FF' },
  // 13 — خوخي ✓ contrast OK
  { primary: '#000000', background: '#FEEED4', secondary: '#2C2010', highlight: '#FFF49D' },
  // 14 — نعناعي ✓ contrast OK
  { primary: '#000000', background: '#D2F4CF', secondary: '#152214', highlight: '#78C0FF' },
  // 15 — أصفر فاتح ✓ contrast OK
  { primary: '#000000', background: '#FEFADF', secondary: '#1C1A0E', highlight: '#78C0FF' },
  // 16 — لافندر ✓ contrast OK
  { primary: '#000000', background: '#EAF0FE', secondary: '#141822', highlight: '#78C0FF' },
];

export { QURAN_THEMES };

/** Override themes with admin-managed data from Firestore */
export function setQuranThemes(themes: QuranTheme[]) {
  if (themes.length > 0) QURAN_THEMES = themes;
}

/** Get the total number of available themes (may change after admin edits) */
export function getThemeCount(): number {
  return QURAN_THEMES.length;
}

/** Get safe theme index — clamp to valid range if theme was deleted */
export function getSafeThemeIndex(index: number): number {
  if (index >= 0 && index < QURAN_THEMES.length) return index;
  return 0;
}

export const DEFAULT_THEME_INDEX = 0;

// هل الثيم لون خلفية فاتح؟
export function isThemeLight(index: number): boolean {
  const bg = QURAN_THEMES[index]?.background ?? '#FFF8F0';
  return isColorLight(bg);
}

// Re-export contrast utilities for convenience
export { isColorLight, getContrastTextColor, getContrastPalette } from '@/lib/contrast-helper';

// ثيمات معينة تحتفظ بلون زخرفة الأورنمنت الأصلي (بدون tintColor)
export const ORNAMENT_NO_TINT_INDICES = [0, 1, 2, 6, 13, 15];

// ألوان ذهبية لأرقام الآيات واسم السورة
export const AYAH_MARKER_GOLD = '#C9A94E';       // ذهبي دافئ للخلفيات الفاتحة
export const AYAH_MARKER_GOLD_DARK = '#D4AF37';   // ذهبي أكثر سطوعاً للخلفيات الداكنة

/** الحصول على اللون الذهبي المناسب حسب سطوع الخلفية */
export function getGoldenColor(themeIndex: number): string {
  return isThemeLight(themeIndex) ? AYAH_MARKER_GOLD : AYAH_MARKER_GOLD_DARK;
}
