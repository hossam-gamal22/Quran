// lib/story-id.ts
// Stable story IDs used as Firestore document keys for social interactions
// (likes / comments / reports). Keep in sync with admin-panel/src/utils/story-id.ts.

export type StorySection = 'prophet' | 'companion' | 'seerah';

const PROPHET_PREFIX = 'prophet_';
const COMPANION_PREFIX = 'companion_';
const SEERAH_PREFIX = 'seerah_';

export const prophetStoryId = (rawId: string): string => `${PROPHET_PREFIX}${rawId}`;
export const companionStoryId = (rawId: string): string => `${COMPANION_PREFIX}${rawId}`;
export const seerahSectionId = (slug: string): string => `${SEERAH_PREFIX}${slug}`;

export const parseStoryId = (storyId: string): { section: StorySection; rawId: string } | null => {
  if (storyId.startsWith(PROPHET_PREFIX)) {
    return { section: 'prophet', rawId: storyId.slice(PROPHET_PREFIX.length) };
  }
  if (storyId.startsWith(COMPANION_PREFIX)) {
    return { section: 'companion', rawId: storyId.slice(COMPANION_PREFIX.length) };
  }
  if (storyId.startsWith(SEERAH_PREFIX)) {
    return { section: 'seerah', rawId: storyId.slice(SEERAH_PREFIX.length) };
  }
  return null;
};

export const seerahSlug = (titleEn: string): string =>
  titleEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
