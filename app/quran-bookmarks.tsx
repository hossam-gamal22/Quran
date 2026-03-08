/**
 * Quran Bookmarks Page — الفواصل
 * Full-page view of colored bookmarks (yellow, red, green)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Platform, I18nManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useSettings } from '@/contexts/SettingsContext';
import { FONT_SIZES } from '@/constants/theme';
import {
  getColoredBookmarks,
  removeColoredBookmark,
  type ColoredBookmark,
  type BookmarkColor,
  BOOKMARK_COLORS,
  BOOKMARK_BG_COLORS,
  BOOKMARK_BORDER_COLORS,
  BOOKMARK_COLOR_LABELS,
} from '@/lib/quran-bookmarks';
import { getFirstSurahOnPage } from '@/lib/qcf-page-data';

const BOOKMARK_COLOR_ORDER: BookmarkColor[] = ['yellow', 'red', 'green'];

const toArabicNumber = (n: number): string => {
  const d = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  return String(n).split('').map(c => d[parseInt(c)] || c).join('');
};

export default function QuranBookmarksScreen() {
  const router = useRouter();
  const colors = useColors();
  const { isDarkMode } = useSettings();
  const isLightBg = !isDarkMode;

  const [bookmarks, setBookmarks] = useState<ColoredBookmark[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<BookmarkColor, boolean>>({
    yellow: true, red: true, green: true,
  });

  useEffect(() => {
    getColoredBookmarks().then(setBookmarks);
  }, []);

  const bookmarksByColor = React.useMemo(() => {
    const grouped: Record<BookmarkColor, ColoredBookmark[]> = { yellow: [], red: [], green: [] };
    for (const b of bookmarks) grouped[b.color]?.push(b);
    return grouped;
  }, [bookmarks]);

  const toggleGroup = (color: BookmarkColor) => {
    setExpandedGroups(prev => ({ ...prev, [color]: !prev[color] }));
  };

  const handleRemoveBookmark = useCallback(async (id: string) => {
    const updated = await removeColoredBookmark(id);
    setBookmarks(updated);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const jumpToPage = useCallback((page: number) => {
    const surah = getFirstSurahOnPage(page);
    router.push(`/surah/${surah}?page=${page}`);
  }, [router]);

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' }]}>
        <TouchableOpacity hitSlop={12} onPress={() => router.back()}>
          <MaterialCommunityIcons
            name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'}
            size={26}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>الفواصل</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40, paddingTop: 12 }}>
        {BOOKMARK_COLOR_ORDER.map(color => {
          const items = bookmarksByColor[color] || [];
          const expanded = expandedGroups[color];
          return (
            <View key={color} style={[s.bmGroup, { borderColor: BOOKMARK_BORDER_COLORS[color], backgroundColor: BOOKMARK_BG_COLORS[color] }]}>
              <TouchableOpacity style={s.bmGroupHeader} onPress={() => toggleGroup(color)}>
                <MaterialCommunityIcons name="bookmark" size={24} color={BOOKMARK_COLORS[color]} />
                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <Text style={[s.bmGroupTitle, { color: isLightBg ? '#1a1a2e' : '#fff' }]}>
                    {BOOKMARK_COLOR_LABELS[color]}
                  </Text>
                  <Text style={[s.bmGroupCount, { color: isLightBg ? '#666' : '#aaa' }]}>
                    عدد: {toArabicNumber(items.length)}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color={isLightBg ? '#999' : '#666'}
                />
              </TouchableOpacity>

              {expanded && items.map(bm => (
                <TouchableOpacity
                  key={bm.id}
                  style={[s.bmItem, { backgroundColor: isLightBg ? 'rgba(255,255,255,0.6)' : 'rgba(40,40,44,0.5)' }]}
                  onPress={() => jumpToPage(bm.page)}
                >
                  <View style={[s.bmItemIcon, { backgroundColor: BOOKMARK_BG_COLORS[color] }]}>
                    <MaterialCommunityIcons name="bookmark" size={18} color={BOOKMARK_COLORS[color]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.bmItemName, { color: isLightBg ? '#1a1a2e' : '#fff' }]}>{bm.surahName}</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Text style={[s.bmItemMeta, { color: isLightBg ? '#666' : '#aaa' }]}>
                        آية {toArabicNumber(bm.ayahNumber)}
                      </Text>
                      <Text style={[s.bmItemMeta, { color: isLightBg ? '#666' : '#aaa' }]}>
                        صفحة {toArabicNumber(bm.page)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity hitSlop={12} onPress={() => handleRemoveBookmark(bm.id)}>
                    <MaterialCommunityIcons name="close" size={16} color={isLightBg ? '#999' : '#666'} />
                  </TouchableOpacity>
                  <MaterialCommunityIcons name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'} size={18} color={isLightBg ? '#999' : '#666'} />
                </TouchableOpacity>
              ))}
            </View>
          );
        })}

        {bookmarks.length === 0 && (
          <View style={s.emptyBm}>
            <MaterialCommunityIcons name="bookmark-outline" size={48} color={isLightBg ? '#ccc' : '#555'} />
            <Text style={[s.emptyText, { color: isLightBg ? '#999' : '#666' }]}>لا توجد فواصل بعد</Text>
            <Text style={[s.emptyHint, { color: isLightBg ? '#bbb' : '#555' }]}>
              اضغط مطولاً على أي آية لإضافة فاصل
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontFamily: 'Cairo-Bold',
    textAlign: 'center',
  },
  bmGroup: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bmGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  bmGroupTitle: { fontSize: FONT_SIZES.lg, fontFamily: 'Cairo-Bold' },
  bmGroupCount: { fontSize: FONT_SIZES.xs, fontFamily: 'Cairo-Regular' },
  bmItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 12,
    gap: 10,
  },
  bmItemIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  bmItemName: { fontSize: FONT_SIZES.md, fontFamily: 'Cairo-SemiBold' },
  bmItemMeta: {
    fontSize: FONT_SIZES.xs, fontFamily: 'Cairo-Regular',
    backgroundColor: 'rgba(120,120,128,0.08)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  emptyBm: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: FONT_SIZES.md, fontFamily: 'Cairo-Medium', textAlign: 'center' },
  emptyHint: { fontSize: FONT_SIZES.sm, fontFamily: 'Cairo-Regular', textAlign: 'center' },
});
