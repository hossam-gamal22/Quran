import { describe, expect, it, vi } from 'vitest';

vi.mock('@/config/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  onSnapshot: vi.fn(),
}));

import {
  mergeCompanionsForDisplay,
  normalizeReligiousStoriesForDisplay,
  type CMSCompanion,
  type CMSReligiousStory,
} from '../lib/content-api';

const story = (overrides: Partial<CMSReligiousStory>): CMSReligiousStory => ({
  id: 'story',
  title: 'قصة',
  audioUrl: '',
  transcript: '',
  ...overrides,
});

const companion = (overrides: Partial<CMSCompanion>): CMSCompanion => ({
  id: 'companion',
  nameAr: 'صحابي',
  nameEn: 'Companion',
  category: 'ashara',
  brief: '',
  story: [],
  virtues: [],
  ...overrides,
});

describe('CMS content admin ordering', () => {
  it('keeps religious stories in the admin panel array order', () => {
    const result = normalizeReligiousStoriesForDisplay([
      story({ id: 'prophet-adam', title: 'قصة آدم عليه السلام', order: 1 }),
      story({ id: 'religious-ashab-al-ukhdood', title: 'قصة أصحاب الأخدود', order: 1 }),
      story({ id: 'prophet-nuh', title: 'قصة نوح عليه السلام', order: 2 }),
    ]);

    expect(result.slice(0, 3).map((item) => item.id)).toEqual([
      'prophet-adam',
      'religious-ashab-al-ukhdood',
      'prophet-nuh',
    ]);
  });

  it('keeps companions in the admin panel array order while preserving bundled fallbacks', () => {
    const defaults = [
      companion({ id: 'abu-bakr', nameAr: 'أبو بكر الصديق' }),
      companion({ id: 'umar', nameAr: 'عمر بن الخطاب' }),
      companion({ id: 'uthman', nameAr: 'عثمان بن عفان' }),
    ];

    const result = mergeCompanionsForDisplay(
      [
        companion({ id: 'umar', nameAr: 'عمر بن الخطاب', brief: 'من لوحة التحكم' }),
        companion({ id: 'abu-bakr', nameAr: 'أبو بكر الصديق', brief: 'من لوحة التحكم' }),
      ],
      defaults
    );

    expect(result.map((item) => item.id)).toEqual(['umar', 'abu-bakr', 'uthman']);
    expect(result[0].brief).toBe('من لوحة التحكم');
  });
});
