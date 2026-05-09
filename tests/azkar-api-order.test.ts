import { describe, expect, it, vi } from 'vitest';

vi.mock('@/config/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
}));

import { computeAzkarSignature, sortAzkarItems, type Zikr } from '../lib/azkar-api';

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
});
