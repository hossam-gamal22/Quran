// lib/seasonal-theme-helper.ts
// ألوان تطبيقية مشتركة للصفحات الموسمية - روح المسلم
// يوفر ألوان متسقة بناءً على isDarkMode بدلاً من الألوان المكتوبة يدوياً

import { getContrastPalette } from '@/lib/contrast-helper';

/**
 * Get a full themed color set for seasonal pages.
 * Use this instead of hardcoding '#333', '#666', '#999', '#fff', '#1a1a2e' etc.
 */
export function getSeasonalPageColors(isDarkMode: boolean) {
  const bg = isDarkMode ? '#11151c' : '#f5f5f5';
  const palette = getContrastPalette(bg);

  return {
    // Backgrounds
    background: bg,
    cardBg: isDarkMode ? '#1a1a2e' : '#fff',
    tipBg: isDarkMode ? '#2a2a1e' : '#fff8e1',
    highlightBg: isDarkMode ? '#2a2a3e' : '#f0fff4',

    // Text
    text: palette.text,
    textSecondary: isDarkMode ? '#ccc' : '#666',
    textMuted: isDarkMode ? '#999' : '#999',
    textOnAccent: '#fff',

    // Borders
    border: isDarkMode ? '#2a2a3e' : '#f0f0f0',
    borderLight: isDarkMode ? 'rgba(255,255,255,0.08)' : '#eee',

    // Overlays
    modalBg: isDarkMode ? '#1a1a2e' : '#fff',

    // State
    isLight: !isDarkMode,
    isDark: isDarkMode,
  };
}
