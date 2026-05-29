import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('after-prayer azkar tabs', () => {
  it('uses the fixed native segmented control instead of scrollable chips', () => {
    const source = readFileSync('app/azkar/[category].tsx', 'utf8');
    const tabsBlock = source.match(
      /<NativeTabs\s+tabs=\{Object\.keys\(AFTER_PRAYER_TABS\)[\s\S]*?\/>/,
    )?.[0];

    expect(tabsBlock).toBeTruthy();
    expect(tabsBlock).not.toContain('scrollable');
  });
});
