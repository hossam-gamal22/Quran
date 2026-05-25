// Shared helpers for de-duplicating CMS arrays (religious stories, companions)
// whose entries can accidentally appear twice with different ids when an admin
// re-uploads content or seeds re-publish over a manually-added doc.
//
// Dedup key: the entry's display name (title for stories, nameAr for
// companions) after a light Arabic normalization. When two entries collide,
// the one with media (audio or video) wins, then the one with a longer
// transcript, then the existing entry.

// Tashkeel range: U+064B (Fathatan) through U+0652 (Sukun) + U+0670 (Dagger Alif).
const TASHKEEL_RE = /[ً-ْٰ]/g;
// Bidi marks (LTR/RTL) sometimes pasted into titles from rich editors.
const BIDI_MARKS_RE = /[‎‏]/g;

export function normalizeArabicName(value: string | undefined | null): string {
  return (value || '')
    .replace(TASHKEEL_RE, '')
    .replace(BIDI_MARKS_RE, '')
    .replace(/[إأآ]/g, 'ا') // إ أ آ → ا
    .replace(/ى/g, 'ي') // ى → ي
    .replace(/ة/g, 'ه') // ة → ه
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

interface DedupCandidate {
  audioUrl?: string;
  videoUrl?: string;
  transcript?: string;
}

function hasMedia(entry: DedupCandidate): boolean {
  return !!(entry.audioUrl?.trim() || entry.videoUrl?.trim());
}

function transcriptLength(entry: DedupCandidate): number {
  return (entry.transcript || '').length;
}

/**
 * Deduplicate an array of entries by their normalized display name.
 * Preference order when two entries collide:
 *   1. one has media (audio or video) -> wins
 *   2. longer transcript -> wins
 *   3. first seen -> wins (stable order)
 *
 * Returns { deduped, removedIds } so callers can:
 *   - render `deduped` to users
 *   - optionally persist the cleanup by deleting `removedIds` server-side
 */
export function dedupByName<T extends DedupCandidate & { id?: string }>(
  entries: T[],
  getName: (entry: T) => string | undefined
): { deduped: T[]; removedIds: string[] } {
  const byKey = new Map<string, T>();
  const removedIds: string[] = [];

  for (const entry of entries) {
    const key = normalizeArabicName(getName(entry));
    if (!key) {
      // No usable name — keep but don't dedup against others.
      const fallbackKey = `__no_name__:${entry.id || Math.random()}`;
      byKey.set(fallbackKey, entry);
      continue;
    }
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, entry);
      continue;
    }

    const existingHasMedia = hasMedia(existing);
    const candidateHasMedia = hasMedia(entry);
    const existingLen = transcriptLength(existing);
    const candidateLen = transcriptLength(entry);

    let candidateWins = false;
    if (candidateHasMedia && !existingHasMedia) candidateWins = true;
    else if (candidateHasMedia === existingHasMedia && candidateLen > existingLen) candidateWins = true;

    if (candidateWins) {
      if (existing.id) removedIds.push(existing.id);
      byKey.set(key, entry);
    } else {
      if (entry.id) removedIds.push(entry.id);
    }
  }

  return { deduped: Array.from(byKey.values()), removedIds };
}
