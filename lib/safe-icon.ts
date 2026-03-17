// lib/safe-icon.ts — Validates MaterialCommunityIcons names against the glyph map
import glyphMap from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json';

const FALLBACK_ICON = 'help-circle-outline';
const validIcons = glyphMap as Record<string, number>;

/**
 * Returns the icon name if valid in MaterialCommunityIcons, otherwise returns a fallback.
 */
export function safeIcon(name: string | undefined | null, fallback: string = FALLBACK_ICON): string {
  if (name && validIcons[name] !== undefined) return name;
  return fallback;
}
