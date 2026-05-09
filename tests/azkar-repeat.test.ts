import { describe, expect, it } from 'vitest';
import {
  expandAudioTracksForRepeat,
  getEffectiveZikrRepeatCount,
  inferTrailingRepeatCount,
} from '../lib/azkar-repeat';

describe('azkar repeat helpers', () => {
  it('prefers explicit count values above one', () => {
    expect(getEffectiveZikrRepeatCount({
      count: 3,
      arabic: 'ذكر (سبع مرات).',
    })).toBe(3);
  });

  it('infers seven from a final repeat instruction when bundled count is one', () => {
    expect(getEffectiveZikrRepeatCount({
      count: 1,
      arabic: 'حَسْبِيَ اللَّهُ لاَ إِلَهَ إِلاَّ هُوَ (سَبْعَ مَرّاتٍ).',
    })).toBe(7);
  });

  it('does not infer incidental numbers from non-repeat prose', () => {
    expect(inferTrailingRepeatCount(
      'صَلَّى عَلَيْهِ سَبْعُونَ أَلْفَ مَلَكٍ حَتَّى يُمْسِيَ.',
    )).toBeNull();
  });

  it('expands audio tracks with repeat metadata and only counts the last part', () => {
    const tracks = expandAudioTracksForRepeat(
      [
        { id: 'ayah-1', title: 'Ayah 1' },
        { id: 'ayah-2', title: 'Ayah 2' },
      ],
      { zikrId: 17, baseIndex: 2, repeatCount: 7 },
    );

    expect(tracks).toHaveLength(14);
    expect(tracks[0]).toMatchObject({
      zikrId: 17,
      baseIndex: 2,
      repeatIndex: 1,
      repeatTotal: 7,
      repeatPartIndex: 1,
      repeatPartTotal: 2,
      countsForRepeat: false,
    });
    expect(tracks[1]).toMatchObject({
      repeatIndex: 1,
      repeatPartIndex: 2,
      countsForRepeat: true,
    });
    expect(tracks[2]).toMatchObject({
      repeatIndex: 2,
      repeatPartIndex: 1,
      countsForRepeat: false,
    });
  });
});
