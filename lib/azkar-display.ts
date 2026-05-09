import { stripAzkarBrackets, stripBasmalaPrefix, stripVerseNumbers } from '@/lib/basmala-utils';
import { hasQuranRefs } from '@/lib/azkar-quran-refs';

const KNOWN_QURAN_AZKAR_IDS = new Set([48, 481, 482, 49]);

export interface AzkarDisplaySource {
  id: number;
  arabic?: string | null;
}

export interface AzkarDisplayParts {
  text: string;
  hadBasmala: boolean;
  useQcf: boolean;
  isQuranText: boolean;
  useFallbackQuranFont: boolean;
}

export function getAzkarDisplayParts(zikr: AzkarDisplaySource): AzkarDisplayParts {
  const arabic = zikr.arabic || '';
  const useQcf = hasQuranRefs(zikr.id);
  const hasVerseBrackets = arabic.includes('﴿') || arabic.includes('﴾');
  const isQuranText = useQcf || KNOWN_QURAN_AZKAR_IDS.has(zikr.id) || hasVerseBrackets;
  const { stripped, hadBasmala } = stripBasmalaPrefix(arabic);
  const rawDisplay = hadBasmala ? stripped : arabic;
  const cleanedDisplay = stripAzkarBrackets(rawDisplay);

  return {
    text: isQuranText ? stripVerseNumbers(cleanedDisplay) : cleanedDisplay,
    hadBasmala,
    useQcf,
    isQuranText,
    useFallbackQuranFont: !useQcf && isQuranText,
  };
}
