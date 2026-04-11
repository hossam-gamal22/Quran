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
import { useScaledStyles } from '@/hooks/use-font-scale';
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
import { BlurView } from 'expo-blur';

const BOOKMARK_COLOR_ORDER: BookmarkColor[] = ['yellow', 'red', 'green'];

import { localizeNumber as toArabicNumber } from '@/lib/format-number';

export default function QuranBookmarksScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const colors = useColors();
  const s = useScaledStyles(_s, colors.fs);
  const { isDarkMode, t } = useSettings();

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
        style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
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
                  <Text style={[s.bmGroupTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {t(BOOKMARK_COLOR_LABELS[color])}
                  </Text>
                  <Text style={[s.bmGroupCount, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {t('common.count')} {toArabicNumber(items.length)}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color={colors.icon}
                />
              </TouchableOpacity>

              {expanded && items.map(bm => (
                <TouchableOpacity
                  key={bm.id}
                  style={[s.bmItem, { overflow: 'hidden', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => jumpToPage(bm.page)}
                >
                  {Platform.OS === 'ios' && (
                    <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
                  )}
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
                  <View style={[s.bmItemIcon, { backgroundColor: BOOKMARK_BG_COLORS[color] }]}>
                    <MaterialCommunityIcons name="bookmark" size={18} color={BOOKMARK_COLORS[color]} />
                  </View>
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={[s.bmItemName, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{bm.surahName}</Text>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8 }}>
                      <Text style={[s.bmItemMeta, { color: colors.textLight }]}>
                        {t('quran.ayah')} {toArabicNumber(bm.ayahNumber)}
                      </Text>
                      <Text style={[s.bmItemMeta, { color: colors.textLight }]}>
                        {t('quran.page')} {toArabicNumber(bm.page)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity hitSlop={12} onPress={() => handleRemoveBookmark(bm.id)}>
                    <MaterialCommunityIcons name="close" size={16} color={colors.icon} />
                  </TouchableOpacity>
                  <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={18} color={colors.icon} />
                </TouchableOpacity>
              ))}
            </View>
          );
        })}

        {bookmarks.length === 0 && (
          <View style={s.emptyBm}>
            <MaterialCommunityIcons name="bookmark-outline" size={48} color={colors.icon} />
            <Text style={[s.emptyText, { color: colors.textLight }]}>{t('quran.noBookmarks')}</Text>
            <Text style={[s.emptyHint, { color: colors.muted }]}>
              {t('quran.bookmarkHint')}
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const _s = StyleSheet.create({

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
  bmGroupTitle: { fontSize: FONT_SIZES.lg, fontFamily: fontBold(), lineHeight: 30, includeFontPadding: false },
  bmGroupCount: { fontSize: FONT_SIZES.xs, fontFamily: fontRegular(), lineHeight: 18, includeFontPadding: false },
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
  bmItemName: { fontSize: FONT_SIZES.md, fontFamily: fontSemiBold(), lineHeight: 28, includeFontPadding: false },
  bmItemMeta: {
    fontSize: FONT_SIZES.xs, fontFamily: fontRegular(),
    backgroundColor: 'rgba(120,120,128,0.08)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  emptyBm: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: FONT_SIZES.md, fontFamily: fontMedium(), textAlign: 'center', lineHeight: 28, includeFontPadding: false },
  emptyHint: { fontSize: FONT_SIZES.sm, fontFamily: fontRegular(), textAlign: 'center', lineHeight: 22, includeFontPadding: false },
});
