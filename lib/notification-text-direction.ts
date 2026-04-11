/**
 * RTL/LTR directional control for notification text.
 *
 * iOS renders notification banners following the DEVICE system language,
 * ignoring the app's language setting. A simple RLM mark only hints at
 * direction — iOS can still override it.
 *
 * Solution: Use Unicode bidi embedding characters to FORCE paragraph-level
 * direction regardless of system locale:
 * - RLE (Right-to-Left Embedding) + PDF (Pop Directional Formatting)
 * - LRE (Left-to-Right Embedding) + PDF
 *
 * Additionally prepend RLM/LRM as a first-strong-character hint for
 * Android which respects it more reliably.
 */
import { isRTL } from './i18n';

const RLM = '\u200F'; // Right-to-Left Mark
const LRM = '\u200E'; // Left-to-Right Mark
const RLE = '\u202B'; // Right-to-Left Embedding
const LRE = '\u202A'; // Left-to-Right Embedding
const PDF = '\u202C'; // Pop Directional Formatting

/** Wrap text with Unicode bidi embedding to force correct direction. */
export function dirText(text: string): string {
  if (isRTL()) {
    return `${RLM}${RLE}${text}${PDF}`;
  }
  return `${LRM}${LRE}${text}${PDF}`;
}
