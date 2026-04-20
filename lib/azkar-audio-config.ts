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
  // Audio files have been trimmed — no intro silence remains.
  // All previous trims removed to prevent skipping actual content.
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
