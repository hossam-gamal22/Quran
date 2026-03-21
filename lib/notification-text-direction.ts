/**
 * RTL/LTR directional marks for notification text.
 *
 * Mobile platforms auto-detect text direction from the first "strong" character.
 * Emojis & numbers are directionally neutral, so a title like "🌙 الفجر" may
 * render LTR on some devices. Prepending an invisible Unicode directional mark
 * forces the OS to use the correct alignment.
 */
import { isRTL } from './i18n';

const RLM = '\u200F'; // Right-to-Left Mark
const LRM = '\u200E'; // Left-to-Right Mark

/** Prepend the correct directional mark for notification title/body text. */
export function dirText(text: string): string {
  return isRTL() ? `${RLM}${text}` : `${LRM}${text}`;
}
