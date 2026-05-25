import { describe, expect, it, vi } from 'vitest';

vi.mock('@/config/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
}));

import { computeAzkarSignature, getAllAzkar, getAzkarByCategory, sortAzkarItems, type Zikr } from '../lib/azkar-api';
import { dedupeAzkarByDisplayedText, removeLowerCountGlobalDuplicateAzkar } from '../lib/azkar-dedupe';

const zikr = (overrides: Partial<Zikr>): Zikr => ({
  id: 1,
  category: '1',
  arabic: 'ذكر',
  transliteration: '',
  translations: {},
  count: 1,
  reference: '',
  benefit: '',
  audio: '',
  ...overrides,
});

describe('azkar api ordering/signature', () => {
  it('sorts by admin sortOrder before falling back to id', () => {
    expect(sortAzkarItems([
      zikr({ id: 30, sortOrder: 3 }),
      zikr({ id: 10, sortOrder: 1 }),
      zikr({ id: 20 }),
      zikr({ id: 15, sortOrder: 1 }),
    ]).map(item => item.id)).toEqual([10, 15, 30, 20]);
  });

  it('includes editable admin fields in the Firestore change signature', () => {
    const base = [zikr({ id: 7, subcategory: 'general', sortOrder: 1, audio: '7.m4a', count: 1 })];

    expect(computeAzkarSignature(base)).not.toBe(computeAzkarSignature([
      zikr({ id: 7, subcategory: 'after_fajr', sortOrder: 1, audio: '7.m4a', count: 1 }),
    ]));
    expect(computeAzkarSignature(base)).not.toBe(computeAzkarSignature([
      zikr({ id: 7, subcategory: 'general', sortOrder: 2, audio: '7.m4a', count: 1 }),
    ]));
    expect(computeAzkarSignature(base)).not.toBe(computeAzkarSignature([
      zikr({ id: 7, subcategory: 'general', sortOrder: 1, audio: 'new.mp3', count: 1 }),
    ]));
    expect(computeAzkarSignature(base)).not.toBe(computeAzkarSignature([
      zikr({ id: 7, subcategory: 'general', sortOrder: 1, audio: '7.m4a', count: 7 }),
    ]));
  });

  it('keeps the higher repeat count when duplicate displayed text appears in one category', () => {
    const items = [
      zikr({
        id: 35,
        category: '1',
        count: 10,
        arabic: 'لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ (عشرَ مرَّات) ، أَوْ (مرَّةً واحدةً عندَ الكَسَلِ).',
      }),
      zikr({
        id: 37,
        category: '1',
        count: 100,
        arabic: 'لاَ إِلَهَ إِلاَّ اللَّهُ، وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ (مائةَ مرَّةٍ إذا أصبحَ).',
      }),
    ];

    expect(dedupeAzkarByDisplayedText(items).map(item => item.id)).toEqual([37]);
  });

  it('removes lower-count duplicate displayed text even across categories', () => {
    const items = [
      zikr({
        id: 36,
        category: '1b',
        count: 10,
        arabic: 'لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ (عشرَ مرَّات) ، أَوْ (مرَّةً واحدةً عندَ الكَسَلِ).',
      }),
      zikr({
        id: 37,
        category: '1',
        count: 100,
        arabic: 'لاَ إِلَهَ إِلاَّ اللَّهُ، وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ (مائةَ مرَّةٍ إذا أصبحَ).',
      }),
    ];

    expect(removeLowerCountGlobalDuplicateAzkar([items[0]], items)).toEqual([]);
    expect(removeLowerCountGlobalDuplicateAzkar([items[1]], items).map(item => item.id)).toEqual([37]);
  });

  it('has no lower-count duplicate displayed text in every bundled category', () => {
    const categoryIds = Array.from(new Set(getAllAzkar().map(item => item.category)));

    for (const category of categoryIds) {
      const items = getAzkarByCategory(category);
      expect(dedupeAzkarByDisplayedText(items)).toHaveLength(items.length);
    }
  });

  it('has no lower-count duplicate displayed text across bundled azkar', () => {
    const items = getAllAzkar();
    expect(removeLowerCountGlobalDuplicateAzkar(items, items)).toHaveLength(items.length);
  });
});
