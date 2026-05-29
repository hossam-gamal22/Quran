import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('religious stories inline ads', () => {
  it('does not inject medium rectangle ads inside story details', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/religious-stories.tsx'), 'utf8');
    const inlineAdRenderCount = (source.match(/<InlineMrecAd\b/g) || []).length;

    expect(inlineAdRenderCount).toBe(0);
  });
});
