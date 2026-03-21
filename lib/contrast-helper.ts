// lib/contrast-helper.ts
// نظام التباين التلقائي - روح المسلم
// يحدد لون النص المناسب بناءً على لون/سطوع الخلفية

/**
 * Parse a color string (hex, rgb, rgba) into RGB values
 */
export function parseColor(color: string): { r: number; g: number; b: number } | null {
  // Handle hex colors (#RGB, #RRGGBB, #RRGGBBAA)
  const hexMatch = color.match(/^#([0-9A-Fa-f]{3,8})$/);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16),
    };
  }

  // Handle rgb/rgba
  const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }

  // Named colors
  const namedColors: Record<string, { r: number; g: number; b: number }> = {
    white: { r: 255, g: 255, b: 255 },
    black: { r: 0, g: 0, b: 0 },
    red: { r: 255, g: 0, b: 0 },
    green: { r: 0, g: 128, b: 0 },
    blue: { r: 0, g: 0, b: 255 },
    transparent: { r: 0, g: 0, b: 0 },
  };

  return namedColors[color.toLowerCase()] ?? null;
}

/**
 * Calculate relative luminance (WCAG 2.0)
 * Returns a value between 0 (darkest) and 1 (lightest)
 */
export function getLuminance(color: string): number {
  const parsed = parseColor(color);
  if (!parsed) return 0.5; // Default to mid-range if unparseable

  const { r, g, b } = parsed;
  // NTSC luminance formula (widely used, same as existing isThemeLight)
  return (r * 299 + g * 587 + b * 114) / 1000 / 255;
}

/**
 * Determine if a background color is "light" (text should be dark)
 */
export function isColorLight(color: string): boolean {
  return getLuminance(color) > 0.5;
}

/**
 * Get the appropriate text color for a given background color
 * Returns white for dark backgrounds, dark color for light backgrounds
 */
export function getContrastTextColor(
  backgroundColor: string,
  options?: {
    lightText?: string;   // Color to use on dark backgrounds (default: '#FFFFFF')
    darkText?: string;    // Color to use on light backgrounds (default: '#1C1C1E')
  }
): string {
  const { lightText = '#FFFFFF', darkText = '#1C1C1E' } = options ?? {};
  return isColorLight(backgroundColor) ? darkText : lightText;
}

/**
 * Get secondary (muted) text color based on background brightness
 */
export function getContrastSecondaryColor(backgroundColor: string): string {
  return isColorLight(backgroundColor)
    ? 'rgba(0, 0, 0, 0.6)'
    : 'rgba(255, 255, 255, 0.7)';
}

/**
 * Get border color based on background brightness
 */
export function getContrastBorderColor(backgroundColor: string): string {
  return isColorLight(backgroundColor)
    ? 'rgba(0, 0, 0, 0.1)'
    : 'rgba(255, 255, 255, 0.12)';
}

/**
 * Get a full contrast-aware color palette for a given background
 */
export function getContrastPalette(backgroundColor: string) {
  const light = isColorLight(backgroundColor);
  return {
    text: light ? '#1C1C1E' : '#FFFFFF',
    textSecondary: light ? '#3A3A3C' : '#EBEBF5',
    textMuted: light ? '#8E8E93' : 'rgba(255,255,255,0.85)',
    icon: light ? '#3A3A3C' : '#FFFFFF',
    iconMuted: light ? '#8E8E93' : 'rgba(255,255,255,0.7)',
    border: light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)',
    divider: light ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)',
    overlay: light ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
    cardBg: light ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.08)',
    isLight: light,
  };
}

/**
 * Get WCAG contrast ratio between two colors
 * Ratio >= 4.5 = AA compliance for normal text
 * Ratio >= 7.0 = AAA compliance
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if text/bg combination meets WCAG AA (4.5:1 for normal text)
 */
export function meetsContrastAA(textColor: string, bgColor: string): boolean {
  return getContrastRatio(textColor, bgColor) >= 4.5;
}

/**
 * Blend a color with a black dim overlay at given opacity.
 * Simulates: image color visible through rgba(0,0,0,dimOpacity) overlay.
 * Higher dimOpacity → darker effective color.
 */
export function blendWithDimOverlay(color: string, dimOpacity: number): string {
  const parsed = parseColor(color);
  if (!parsed) return '#808080';
  // blending: result = image * (1 - dimOpacity) + black * dimOpacity
  const factor = 1 - dimOpacity;
  const r = Math.round(parsed.r * factor);
  const g = Math.round(parsed.g * factor);
  const b = Math.round(parsed.b * factor);
  return `rgb(${r},${g},${b})`;
}
