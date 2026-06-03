import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('story detail inline ads', () => {
  it.each([
    ['religious stories', 'app/religious-stories.tsx'],
    ['companions', 'app/companions.tsx'],
  ])('does not inject medium rectangle ads inside %s details', (_label, filePath) => {
    const source = readFileSync(resolve(process.cwd(), filePath), 'utf8');
    const inlineAdRenderCount = (source.match(/<InlineMrecAd\b/g) || []).length;

    expect(inlineAdRenderCount).toBe(0);
  });
});
