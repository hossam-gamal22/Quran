/**
 * Quran Bookmarks Page — الفواصل
 * Full-page view of colored bookmarks (yellow, red, green)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Platform,
} from 'react-native';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { UniversalHeader } from '@/components/ui';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
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
import { useIsRTL } from '@/hooks/use-is-rtl';

const BOOKMARK_COLOR_ORDER: BookmarkColor[] = ['yellow', 'red', 'green'];

import { localizeNumber as toArabicNumber } from '@/lib/format-number';

export default function QuranBookmarksScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const colors = useColors();
  const { isDarkMode, t } = useSettings();
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
      <UniversalHeader
        style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' }}
      >
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 18, fontFamily: fontBold(), color: colors.text }} numberOfLines={1}>{t('quran.bookmarks')}</Text>
          <SectionInfoButton sectionKey="quran_surahs" />
        </View>
      </UniversalHeader>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40, paddingTop: 12 }}>
        {BOOKMARK_COLOR_ORDER.map(color => {
          const items = bookmarksByColor[color] || [];
          const expanded = expandedGroups[color];
          return (
            <View key={color} style={[s.bmGroup, { borderColor: BOOKMARK_BORDER_COLORS[color], backgroundColor: BOOKMARK_BG_COLORS[color] }]}>
              <TouchableOpacity style={[s.bmGroupHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => toggleGroup(color)}>
                <MaterialCommunityIcons name="bookmark" size={24} color={BOOKMARK_COLORS[color]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.bmGroupTitle, { color: isLightBg ? '#1a1a2e' : '#fff', textAlign: isRTL ? 'right' : 'left' }]}>
                    {t(BOOKMARK_COLOR_LABELS[color])}
                  </Text>
                  <Text style={[s.bmGroupCount, { color: isLightBg ? '#666' : '#aaa', textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('common.count')} {toArabicNumber(items.length)}
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
                  style={[s.bmItem, { backgroundColor: isLightBg ? 'rgba(255,255,255,0.6)' : 'rgba(40,40,44,0.5)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => jumpToPage(bm.page)}
                >
                  <View style={[s.bmItemIcon, { backgroundColor: BOOKMARK_BG_COLORS[color] }]}>
                    <MaterialCommunityIcons name="bookmark" size={18} color={BOOKMARK_COLORS[color]} />
                  </View>
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={[s.bmItemName, { color: isLightBg ? '#1a1a2e' : '#fff', textAlign: isRTL ? 'right' : 'left' }]}>{bm.surahName}</Text>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8 }}>
                      <Text style={[s.bmItemMeta, { color: isLightBg ? '#666' : '#aaa' }]}>
                        {t('quran.ayah')} {toArabicNumber(bm.ayahNumber)}
                      </Text>
                      <Text style={[s.bmItemMeta, { color: isLightBg ? '#666' : '#aaa' }]}>
                        {t('quran.page')} {toArabicNumber(bm.page)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity hitSlop={12} onPress={() => handleRemoveBookmark(bm.id)}>
                    <MaterialCommunityIcons name="close" size={16} color={isLightBg ? '#999' : '#666'} />
                  </TouchableOpacity>
                  <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={18} color={isLightBg ? '#999' : '#666'} />
                </TouchableOpacity>
              ))}
            </View>
          );
        })}

        {bookmarks.length === 0 && (
          <View style={s.emptyBm}>
            <MaterialCommunityIcons name="bookmark-outline" size={48} color={isLightBg ? '#ccc' : '#555'} />
            <Text style={[s.emptyText, { color: isLightBg ? '#999' : '#666' }]}>{t('quran.noBookmarks')}</Text>
            <Text style={[s.emptyHint, { color: isLightBg ? '#bbb' : '#555' }]}>
              {t('quran.bookmarkHint')}
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({

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
    gap: 10,
  },
  bmGroupTitle: { fontSize: FONT_SIZES.lg, fontFamily: fontBold() },
  bmGroupCount: { fontSize: FONT_SIZES.xs, fontFamily: fontRegular() },
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
  bmItemName: { fontSize: FONT_SIZES.md, fontFamily: fontSemiBold() },
  bmItemMeta: {
    fontSize: FONT_SIZES.xs, fontFamily: fontRegular(),
    backgroundColor: 'rgba(120,120,128,0.08)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  emptyBm: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: FONT_SIZES.md, fontFamily: fontMedium(), textAlign: 'center' },
  emptyHint: { fontSize: FONT_SIZES.sm, fontFamily: fontRegular(), textAlign: 'center' },
});
