import type { Zikr } from '@/lib/azkar-api';

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

function normalizeDuplicateText(value: string): string {
  return value
    .replace(ARABIC_DIACRITICS, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[\(\[][^()[\]]{1,160}[\)\]]/g, '')
    .replace(/(?:^|\s)(?:او|أو)(?=\s|$)/g, ' ')
    .replace(/[.,،؛:!?؟]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function duplicateKey(zikr: Zikr): string {
  return normalizeDuplicateText(zikr.arabic || '');
}

function categoryDuplicateKey(zikr: Zikr): string {
  return `${zikr.category}|||${duplicateKey(zikr)}`;
}

function repeatCount(zikr: Zikr): number {
  const parsed = Math.trunc(Number(zikr.count || 1));
  return Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
}

export function dedupeAzkarByDisplayedText(items: Zikr[]): Zikr[] {
  const chosenByKey = new Map<string, Zikr>();

  for (const item of items) {
    const key = categoryDuplicateKey(item);
    const text = key.split('|||')[1];
    if (!text) {
      chosenByKey.set(`${key}|||${item.id}`, item);
      continue;
    }

    const existing = chosenByKey.get(key);
    if (!existing) {
      chosenByKey.set(key, item);
      continue;
    }

    const existingCount = repeatCount(existing);
    const itemCount = repeatCount(item);
    if (itemCount > existingCount || (itemCount === existingCount && item.id < existing.id)) {
      chosenByKey.set(key, item);
    }
  }

  return Array.from(chosenByKey.values());
}

export function removeLowerCountGlobalDuplicateAzkar(items: Zikr[], allItems: Zikr[]): Zikr[] {
  const maxCountByText = new Map<string, number>();

  for (const item of allItems) {
    const key = duplicateKey(item);
    if (!key) continue;
    maxCountByText.set(key, Math.max(maxCountByText.get(key) || 0, repeatCount(item)));
  }

  return items.filter((item) => {
    const key = duplicateKey(item);
    if (!key) return true;
    return repeatCount(item) >= (maxCountByText.get(key) || 0);
  });
}
