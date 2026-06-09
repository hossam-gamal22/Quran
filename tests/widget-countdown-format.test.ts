import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import {
  SIN_MINUTE_GAP,
  formatPrayerDurationCompact,
  formatPrayerDurationWithPrefix,
} from '@/lib/widget-format-duration';

describe('widget countdown text contract', () => {
  test('uses the same compact Arabic wording for gallery and real widgets', () => {
    const now = Date.parse('2026-06-01T12:00:00.000Z');
    const target = now + (2 * 3600 + 18 * 60 + 11) * 1000;

    // The ≥1h Arabic format puts SIN_MINUTE_GAP (EN SPACE, U+2002) after «س» —
    // build the expected strings from the constant so an invisible-char drift
    // can't masquerade as a passing assertion.
    expect(formatPrayerDurationCompact(2 * 3600 + 18 * 60 + 11, 'ar')).toBe(`2 س${SIN_MINUTE_GAP}18 د`);
    expect(formatPrayerDurationWithPrefix(target, now, 'ar', 'until')).toBe(`بعد 2 س${SIN_MINUTE_GAP}18 د`);
    expect(formatPrayerDurationWithPrefix(now - 66 * 60 * 1000, now, 'ar', 'since')).toBe(`منذ 1 س${SIN_MINUTE_GAP}6 د`);
  });

  test('does not reintroduce Android HH:MM:SS countdown rendering', () => {
    const root = process.cwd();
    const galleryPreview = readFileSync(join(root, 'components/widgets/previews/index.tsx'), 'utf8');
    const androidSnapshot = readFileSync(join(root, 'components/widgets/android/SnapshotWidget.tsx'), 'utf8');

    expect(galleryPreview).not.toContain("Platform.OS === 'android' && prefix === 'next'");
    expect(galleryPreview).not.toContain('padStart(2');
    expect(androidSnapshot).not.toContain('nativeCountdown');
  });
});
