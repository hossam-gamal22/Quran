import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('NativeTabs layout contracts', () => {
  it('bounds scrollable chip tabs so horizontal rows cannot stretch vertically', () => {
    const source = readFileSync('components/ui/NativeTabs.tsx', 'utf8');
    const containerStyle = source.match(/container:\s*\{[\s\S]*?\n\s*\},/)?.[0];

    expect(containerStyle).toBeTruthy();
    expect(containerStyle).toContain('height: 48');
    expect(containerStyle).toContain('flexGrow: 0');
    expect(containerStyle).toContain('flexShrink: 0');
  });
});
