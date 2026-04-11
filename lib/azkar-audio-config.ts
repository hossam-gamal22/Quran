/**
 * AZKAR AUDIO CONFIGURATION
 * Intro trim settings for categories that have audio introductions to skip.
 * Values are in milliseconds from the start of audio.
 */

/**
 * Map of category IDs to intro trim duration in milliseconds.
 * Audio playback will auto-seek to this position when loading.
 */
export const CATEGORY_INTRO_TRIM_MS: Record<string, number> = {
  // أذكار النوم - اول 3 ثواني
  '2': 3000,
  
  // أذكار الاستيقاظ - اول 3 ثواني
  '3': 3000,
  
  // الأذكار بعد السلام من الصلاة - اول 6 ثواني
  '27': 6000,
  
  // دخول الخلاء - اول 4 ثواني
  '4': 4000,
  
  // قبل الوضوء - اول 3 ثواني
  '6': 3000,
  
  // بعد الوضوء - اول 4 ثواني
  '7': 4000,
  
  // الخروج من المنزل - اول 4 ثواني
  '8': 4000,
  
  // دخول المنزل - اول 4 ثواني
  '9': 4000,
  
  // الذهاب إلى المسجد - اول 4 ثواني
  '10': 4000,
  
  // دعاء الاستفتاح - اول 5 ثواني
  '18': 5000,
};

/**
 * Get the intro trim duration for a category in milliseconds.
 * Returns 0 if no trim is configured.
 */
export function getCategoryTrimMs(categoryId: string): number {
  return CATEGORY_INTRO_TRIM_MS[categoryId] || 0;
}

/**
 * Check if a category has intro trimming configured.
 */
export function hasCategoryTrim(categoryId: string): boolean {
  return categoryId in CATEGORY_INTRO_TRIM_MS;
}
