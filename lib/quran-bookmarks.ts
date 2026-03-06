import AsyncStorage from '@react-native-async-storage/async-storage';

const BOOKMARKS_KEY = 'quran_colored_bookmarks';

export type BookmarkColor = 'yellow' | 'red' | 'green';

export interface ColoredBookmark {
  id: string;
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  page: number;
  color: BookmarkColor;
  createdAt: number;
}

export const BOOKMARK_COLORS: Record<BookmarkColor, string> = {
  yellow: '#F5C518',
  red: '#FF6B6B',
  green: '#4CAF50',
};

export const BOOKMARK_BG_COLORS: Record<BookmarkColor, string> = {
  yellow: 'rgba(245, 197, 24, 0.22)',
  red: 'rgba(255, 107, 107, 0.22)',
  green: 'rgba(76, 175, 80, 0.22)',
};

export const BOOKMARK_BORDER_COLORS: Record<BookmarkColor, string> = {
  yellow: 'rgba(245, 197, 24, 0.45)',
  red: 'rgba(255, 107, 107, 0.45)',
  green: 'rgba(76, 175, 80, 0.45)',
};

export const BOOKMARK_COLOR_LABELS: Record<BookmarkColor, string> = {
  yellow: 'الفواصل الصفراء',
  red: 'الفواصل الحمراء',
  green: 'الفواصل الخضراء',
};

export async function getColoredBookmarks(): Promise<ColoredBookmark[]> {
  try {
    const raw = await AsyncStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addColoredBookmark(
  surahNumber: number,
  ayahNumber: number,
  surahName: string,
  page: number,
  color: BookmarkColor,
): Promise<ColoredBookmark[]> {
  const bookmarks = await getColoredBookmarks();
  const id = `${surahNumber}_${ayahNumber}`;
  const filtered = bookmarks.filter(b => b.id !== id);
  filtered.push({
    id, surahNumber, ayahNumber, surahName, page, color,
    createdAt: Date.now(),
  });
  await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(filtered));
  return filtered;
}

export async function removeColoredBookmark(id: string): Promise<ColoredBookmark[]> {
  const bookmarks = await getColoredBookmarks();
  const filtered = bookmarks.filter(b => b.id !== id);
  await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(filtered));
  return filtered;
}

export function buildBookmarkMap(bookmarks: ColoredBookmark[]): Record<string, BookmarkColor> {
  const map: Record<string, BookmarkColor> = {};
  for (const b of bookmarks) {
    map[`${b.surahNumber}:${b.ayahNumber}`] = b.color;
  }
  return map;
}
