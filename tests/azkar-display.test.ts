import { describe, expect, it } from 'vitest';
import { getAzkarDisplayParts } from '../lib/azkar-display';

describe('azkar display helper', () => {
  it('returns one canonical text value for reading and listening surfaces', () => {
    const zikr = {
      id: 17,
      arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\nحَسْبِيَ اللَّهُ لاَ إِلَهَ إِلاَّ هُوَ (سَبْعَ مَرّاتٍ).',
    };

    const readingText = getAzkarDisplayParts(zikr).text;
    const listeningText = getAzkarDisplayParts(zikr).text;

    expect(readingText).toBe(listeningText);
    expect(readingText).toBe('حَسْبِيَ اللَّهُ لاَ إِلَهَ إِلاَّ هُوَ (سَبْعَ مَرّاتٍ).');
  });

  it('strips Quran verse brackets consistently', () => {
    expect(getAzkarDisplayParts({
      id: 49,
      arabic: '﴿اللَّهُ لا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ﴾',
    }).text).toBe('اللَّهُ لا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ');
  });
});
