import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Guards the highest-leverage Firestore cost optimization: the `azkar`
// collection (~247 docs) must NOT be re-read on every app open. See
// lib/azkar-api.ts — refreshAzkarFromFirestore is gated by the content
// manifest and the old permanent onSnapshot(collection 'azkar') live listener
// was removed.
describe('azkar Firestore read-cost gate', () => {
  const source = readFileSync('lib/azkar-api.ts', 'utf8');
  const manifest = readFileSync('lib/content-manifest.ts', 'utf8');

  it('does not keep a live onSnapshot on the whole azkar collection', () => {
    // The expensive listener pattern must be gone. (Custom categories may
    // still subscribe — that is a tiny collection, so only assert on `azkar`.)
    expect(source).not.toMatch(/onSnapshot\(\s*collection\(db,\s*['"]azkar['"]\)/);
  });

  it('gates refreshAzkarFromFirestore behind the content manifest', () => {
    expect(source).toContain('shouldRefetchContent');
    expect(source).toContain('markContentFetched');
    // The gate short-circuits the getDocs read when nothing changed.
    expect(source).toMatch(/!\(await shouldRefetchContent\(AZKAR_MANIFEST_KEY\)\)/);
  });

  it('still allows an explicit force refresh (e.g. pull-to-refresh)', () => {
    expect(source).toMatch(/options\?\:\s*\{\s*force\?\:\s*boolean\s*\}/);
    expect(source).toContain('!options?.force');
  });

  it('keeps subscribeToAzkarFromFirestore returning an unsubscribe contract', () => {
    expect(source).toMatch(/subscribeToAzkarFromFirestore\s*=\s*\(\):\s*\(\(\)\s*=>\s*void\)/);
  });

  it('manifest reads only one shared doc and has a safety TTL fallback', () => {
    expect(manifest).toContain("'appConfig', MANIFEST_DOC_ID");
    expect(manifest).toContain('DEFAULT_SAFETY_TTL_MS');
    // Refetch when the version differs OR the safety window elapsed.
    expect(manifest).toMatch(/remoteVersion !== cachedVersion/);
  });
});
