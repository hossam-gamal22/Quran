/**
 * Favorites Screen — المحفوظات
 * Redesigned with Apple iOS glassmorphism styling and improved contrast
 * حفظ الآيات مع ملاحظات، تصديرها كصور جاهزة للمشاركة
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator, Platform,
  ScrollView, Share, LayoutAnimation, UIManager,
} from 'react-native';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
// @ts-ignore
import { useFocusEffect } from '@react-navigation/native';
import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { getDateLocale } from '@/lib/i18n';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { BackButton } from '@/components/ui';
import { GlassCard } from '@/components/ui/GlassCard';
import { NativeTabs } from '@/components/ui/NativeTabs';
import { getBookmarks, removeBookmark, Bookmark, addBookmark } from '@/lib/storage';
import { getSurahName } from '@/lib/quran-api';
import * as Haptics from 'expo-haptics';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFavoriteAzkar, removeFromFavorites, Zikr } from '@/lib/azkar-api';
import {
  getColoredBookmarks,
  removeColoredBookmark,
  type ColoredBookmark,
  BOOKMARK_COLORS,
  BOOKMARK_COLOR_LABELS,
} from '@/lib/quran-bookmarks';
import {
  getFavorites as getUnifiedFavorites,
  removeFavorite,
  FAVORITE_CATEGORIES,
  type FavoriteItem,
  type FavoriteType,
} from '@/lib/favorites-manager';
import { ALLAH_NAMES, type AllahName } from '@/app/names';

import { useIsRTL } from '@/hooks/use-is-rtl';
// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Image Card Themes ───────────────────────────────────────────────────────
const CARD_THEMES = [
  { id: 'green',   bg: '#1B6B3A', text: '#ffffff', accent: '#A7F3D0', nameKey: 'favorites.themeGreen' as const },
  { id: 'dark',    bg: '#0F172A', text: '#F1F5F9', accent: '#818CF8', nameKey: 'favorites.themeDark' as const },
  { id: 'gold',    bg: '#78350F', text: '#FFFBEB', accent: '#FCD34D', nameKey: 'favorites.themeGold' as const },
  { id: 'blue',    bg: '#1E3A5F', text: '#EFF6FF', accent: '#93C5FD', nameKey: 'favorites.themeBlue' as const },
  { id: 'rose',    bg: '#881337', text: '#FFF1F2', accent: '#FDA4AF', nameKey: 'favorites.themePink' as const },
  { id: 'teal',    bg: '#134E4A', text: '#F0FDFA', accent: '#5EEAD4', nameKey: 'favorites.themeTeal' as const },
];

// ─── Image Export Card (rendered off-screen for capture) ─────────────────────
interface ExportCardProps {
  bookmark: Bookmark;
  theme: typeof CARD_THEMES[0];
  cardRef: React.RefObject<ViewShot>;
  t: (key: string) => string;
}

function ExportCard({ bookmark, theme, cardRef, t }: ExportCardProps) {
  return (
    <ViewShot ref={cardRef} options={{ format: 'png', quality: 1.0 }}>
      <View style={{
        width: 360,
        backgroundColor: theme.bg,
        borderRadius: 20,
        padding: 28,
        alignItems: 'center',
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.08)',
      }}>
        {/* Top ornament */}
        <Text style={{ fontSize: 28, marginBottom: 16, opacity: 0.8 }}>☽</Text>

        {/* Bismillah */}
        <Text style={{
          fontSize: 16, color: theme.accent, fontWeight: '700',
          marginBottom: 18, opacity: 0.9, letterSpacing: 1,
        }}>
          بسم الله الرحمن الرحيم
        </Text>

        {/* Divider */}
        <View style={{ width: 60, height: 2, backgroundColor: theme.accent, opacity: 0.5, marginBottom: 20, borderRadius: 1 }} />

        {/* Arabic text */}
        <Text style={{
          fontSize: 22,
          color: theme.text,
          textAlign: 'center',
          lineHeight: 42,
          fontWeight: '600',
          marginBottom: 20,
          paddingHorizontal: 8,
        }}>
          {bookmark.ayahText}
        </Text>

        {/* Divider */}
        <View style={{ width: 60, height: 2, backgroundColor: theme.accent, opacity: 0.5, marginBottom: 16, borderRadius: 1 }} />

        {/* Source badge */}
        <View style={{
          backgroundColor: theme.accent + '25',
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingVertical: 6,
          borderWidth: 1,
          borderColor: theme.accent + '50',
          marginBottom: 12,
        }}>
          <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 14 }}>
            ﴿ {bookmark.surahName} • {t('favorites.verse')} {bookmark.ayahNumber} ﴾
          </Text>
        </View>

        {/* Note if exists */}
        {bookmark.note ? (
          <Text style={{ color: theme.text, opacity: 0.65, fontSize: 12, textAlign: 'center', marginTop: 8, fontStyle: 'italic' }}>
            "{bookmark.note}"
          </Text>
        ) : null}

        {/* Bottom watermark */}
        <Text style={{ color: theme.accent, opacity: 0.45, fontSize: 10, marginTop: 18 }}>
          القرآن الكريم
        </Text>
      </View>
    </ViewShot>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
// Fallback route for favorites without a saved route
function getFallbackRoute(item: FavoriteItem): string | null {
  // For types with saved dynamic content, pass the favorite ID so the page can load the exact saved item
  switch (item.type) {
    case 'dhikr': {
      const dhikrId = item.id.replace(/^dhikr_/, '');
      return `/daily-dhikr?dhikrId=${dhikrId}`;
    }
    case 'dua':
      return `/daily-dua?favId=${encodeURIComponent(item.id)}`;
    case 'hadith':
      return `/hadith-of-day?favId=${encodeURIComponent(item.id)}`;
    case 'quote':
      return `/quote-of-day?favId=${encodeURIComponent(item.id)}`;
    case 'ayah':
      return '/daily-ayah';
    case 'hadith_sifat':
      return '/hadith-sifat';
    case 'companion':
      return '/companions';
    default:
      return null;
  }
}

export default function FavoritesScreen() {
  const { isDarkMode, settings, t } = useSettings();
  const isRTL = useIsRTL();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'quran' | 'bookmarks' | 'azkar' | 'other'>('quran');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [azkarFavorites, setAzkarFavorites] = useState<Zikr[]>([]);
  const [coloredBookmarks, setColoredBookmarks] = useState<ColoredBookmark[]>([]);
  const [namesFavorites, setNamesFavorites] = useState<AllahName[]>([]);
  const [otherFavorites, setOtherFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(CARD_THEMES[0]);
  const [exporting, setExporting] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'surah'>('date');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const cardRef = useRef<ViewShot>(null!);

  const colors = useColors();
  // Local overrides for glass card and accent that differ from hook values
  const cardBg = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)';
  const cardBorder = isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)';
  const accent = isDarkMode ? '#4ADE80' : '#2f7659';

  const toggleSection = useCallback((key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(250, 'easeInEaseOut', 'opacity'));
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    const bms = await getBookmarks();
    setBookmarks(bms);
    const favAzkar = await getFavoriteAzkar();
    setAzkarFavorites(favAzkar);
    const colored = await getColoredBookmarks();
    setColoredBookmarks(colored);
    // Load names favorites
    try {
      const savedIds = await AsyncStorage.getItem('allah_names_favorites');
      if (savedIds) {
        const ids: number[] = JSON.parse(savedIds);
        setNamesFavorites(ALLAH_NAMES.filter(n => ids.includes(n.id)));
      } else {
        setNamesFavorites([]);
      }
    } catch { setNamesFavorites([]); }
    // Load unified (other) favorites
    const others = await getUnifiedFavorites();
    setOtherFavorites(others);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadBookmarks(); }, [loadBookmarks]));

  const sortedBookmarks = [...bookmarks].sort((a, b) =>
    sortBy === 'date' ? b.createdAt - a.createdAt : a.surahNumber - b.surahNumber
  );

  // Navigate to Quran ayah
  const navigateToAyah = useCallback((bookmark: Bookmark) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/surah/${bookmark.surahNumber}?ayah=${bookmark.ayahNumber}`);
  }, [router]);

  // Navigate to Azkar category
  const navigateToAzkar = useCallback((zikr: Zikr) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/azkar/${zikr.category}`);
  }, [router]);

  // Delete bookmark
  const handleDelete = useCallback((bookmark: Bookmark) => {
    Alert.alert(
      t('favorites.deleteConfirm'),
      `${bookmark.surahName} - ${t('favorites.verse')} ${bookmark.ayahNumber}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'), style: 'destructive',
          onPress: async () => {
            await removeBookmark(bookmark.id);
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            loadBookmarks();
          },
        },
      ]
    );
  }, [loadBookmarks]);

  // Save note
  const handleSaveNote = useCallback(async () => {
    if (!editingBookmark) return;
    const updated: Bookmark = { ...editingBookmark, note: noteText.trim() };
    // Remove old and re-add with note
    await removeBookmark(editingBookmark.id);
    await addBookmark({
      surahNumber: updated.surahNumber,
      ayahNumber: updated.ayahNumber,
      surahName: updated.surahName,
      ayahText: updated.ayahText,
      note: updated.note,
    });
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowNoteModal(false);
    loadBookmarks();
  }, [editingBookmark, noteText, loadBookmarks]);

  // Export as image
  const handleExportImage = useCallback(async () => {
    if (!cardRef.current || !selectedBookmark) return;
    setExporting(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1.0 });

      const canShare = await Sharing.isAvailableAsync();

      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        // Ask permission for media library
        const { status } = await MediaLibrary.requestPermissionsAsync();

        Alert.alert(
          t('favorites.exportVerse'),
          t('favorites.chooseDesign'),
          [
            {
              text: t('favorites.exportImage'),
              onPress: async () => {
                if (status === 'granted') {
                  await MediaLibrary.saveToLibraryAsync(uri);
                  if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert('✅', t('favorites.saved'));
                } else {
                  Alert.alert(t('common.error'), t('favorites.exportFailed'));
                }
              },
            },
            canShare ? {
              text: t('common.share'),
              onPress: async () => {
                await Sharing.shareAsync(uri, {
                  mimeType: 'image/png',
                  dialogTitle: `${t('favorites.verseFrom')} ${selectedBookmark.surahName}`,
                });
              },
            } : null,
            { text: t('common.cancel'), style: 'cancel' },
          ].filter(Boolean) as any[]
        );
      } else {
        // Web: share text
        await Share.share({
          message: `${selectedBookmark.ayahText}\n\n﴿ ${selectedBookmark.surahName} • ${t('favorites.verse')} ${selectedBookmark.ayahNumber} ﴾\n\n${t('common.appName')}`,
        });
      }
    } catch (e) {
      Alert.alert(t('common.error'), t('favorites.exportFailed'));
    } finally {
      setExporting(false);
    }
  }, [selectedBookmark, cardRef]);

  // Share as text
  const handleShareText = useCallback(async (bookmark: Bookmark) => {
    await Share.share({
      message: `${bookmark.ayahText}\n\n﴿ ${bookmark.surahName} • ${t('favorites.verse')} ${bookmark.ayahNumber} ﴾\n\n${t('common.appName')} 🕌`,
      title: `${t('favorites.verseFrom')} ${bookmark.surahName}`,
    });
  }, [t]);

  // Remove azkar from favorites
  const handleRemoveAzkar = useCallback((zikr: Zikr) => {
    Alert.alert(
      t('favorites.removeFromFavoritesConfirm'),
      '',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'), style: 'destructive',
          onPress: async () => {
            await removeFromFavorites(zikr.id);
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            loadBookmarks();
          },
        },
      ]
    );
  }, [loadBookmarks]);

  // Share azkar as text
  const handleShareAzkar = useCallback(async (zikr: Zikr) => {
    await Share.share({
      message: `${zikr.arabic}\n\n📿 ${zikr.reference}\n\n${t('favorites.repeatCount')}: ${zikr.count}`,
    });
  }, [t]);

  // Styles with proper glassmorphism and improved contrast
  const s = StyleSheet.create({
    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
    },
    title: {
      flex: 1,
      textAlign: 'center',
      fontSize: 22,
      fontFamily: fontBold(),
      color: colors.foreground,
    },
    // Sort/stats bar
    statsBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 10,
    },
    countBadge: {
      backgroundColor: accent + '20',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    countText: {
      fontSize: 13,
      fontFamily: fontBold(),
      color: accent,
    },
    sortBtns: {
      flexDirection: 'row',
      gap: 8,
    },
    flex1: { flex: 1 },
    // Bookmark card with glassmorphism
    card: {
      marginHorizontal: 16,
      marginVertical: 8,
      borderRadius: 20,
      overflow: 'hidden',
    },
    cardInner: {
      backgroundColor: cardBg,
      borderRadius: 20,
      borderWidth: 0.5,
      borderColor: cardBorder,
      overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 10,
      gap: 10,
    },
    surahBadge: {
      backgroundColor: accent + '20',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    surahBadgeText: {
      fontSize: 13,
      fontFamily: fontBold(),
      color: accent,
    },
    dateText: {
      flex: 1,
      fontSize: 12,
      fontFamily: fontRegular(),
      color: colors.muted,
    },
    iconBtn: {
      padding: 6,
      borderRadius: 12,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    },
    ayahText: {
      fontSize: 20,
      fontFamily: 'Amiri-Regular',
      color: colors.foreground,
      lineHeight: 42,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    noteBox: {
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: accent + '12',
      borderRadius: 12,
      padding: 12,
      borderStartWidth: 3,
      borderStartColor: accent,
    },
    noteText: {
      fontSize: 13,
      fontFamily: fontRegular(),
      color: colors.muted,
    },
    // Actions bar
    actionsBar: {
      flexDirection: 'row',
      borderTopWidth: 0.5,
      borderTopColor: cardBorder,
    },
    actionBtn: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    actionDivider: {
      width: 0.5,
      backgroundColor: cardBorder,
    },
    actionText: {
      fontSize: 13,
      fontFamily: fontSemiBold(),
    },
    // Empty state
    emptyWrap: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 80,
      paddingHorizontal: 32,
    },
    emptyEmoji: {
      fontSize: 64,
      marginBottom: 20,
    },
    emptyTitle: {
      fontSize: 20,
      fontFamily: fontBold(),
      color: colors.foreground,
      marginBottom: 10,
    },
    emptyText: {
      fontSize: 15,
      fontFamily: fontRegular(),
      color: colors.muted,
      textAlign: 'center',
      lineHeight: 26,
    },
    // Tab bar
    tabBar: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    // Azkar card with glassmorphism
    azkarCard: {
      marginHorizontal: 16,
      marginTop: 8,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      backgroundColor: cardBg,
      borderWidth: 0.5,
      borderColor: cardBorder,
      borderBottomWidth: 0,
      overflow: 'hidden',
      padding: 16,
    },
    azkarText: {
      fontSize: 20,
      fontFamily: 'Amiri-Regular',
      color: colors.foreground,
      lineHeight: 40,
      marginBottom: 12,
    },
    azkarMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    azkarRef: {
      fontSize: 13,
      fontFamily: fontRegular(),
      color: colors.muted,
      flex: 1,
    },
    azkarCount: {
      fontSize: 12,
      fontFamily: fontBold(),
      color: accent,
      backgroundColor: accent + '18',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    // Export modal
    modalWrap: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.85)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalClose: {
      position: 'absolute',
      top: 50,
      right: 20,
      zIndex: 10,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 20,
      padding: 10,
    },
    modalCard: {
      width: '100%',
      backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 24,
      padding: 20,
      maxHeight: '90%',
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: fontBold(),
      color: colors.foreground,
      textAlign: 'center',
      marginBottom: 16,
    },
    // Theme selector
    themesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      justifyContent: 'center',
      marginBottom: 16,
    },
    themeBtn: {
      width: 50,
      height: 50,
      borderRadius: 25,
      borderWidth: 3,
      justifyContent: 'center',
      alignItems: 'center',
    },
    themeName: {
      fontSize: 13,
      fontFamily: fontSemiBold(),
      color: colors.muted,
      textAlign: 'center',
      marginBottom: 12,
    },
    // Preview card
    previewWrap: {
      alignItems: 'center',
      marginBottom: 16,
    },
    // Export actions
    exportActions: {
      flexDirection: 'row',
      gap: 12,
    },
    exportBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    exportBtnText: {
      fontSize: 15,
      fontFamily: fontBold(),
      color: '#fff',
    },
    // Note modal
    noteModalCard: {
      backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 24,
      paddingBottom: 40,
    },
    noteHandle: {
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
      alignSelf: 'center',
      marginBottom: 16,
    },
    noteTitle: {
      fontSize: 18,
      fontFamily: fontBold(),
      color: colors.foreground,
      marginBottom: 12,
    },
    noteInput: {
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      borderWidth: 1,
      borderColor: cardBorder,
      borderRadius: 16,
      padding: 16,
      fontSize: 16,
      fontFamily: fontRegular(),
      color: colors.foreground,
      textAlign: isRTL ? 'right' : 'left',
      minHeight: 100,
      marginBottom: 16,
    },
    noteSaveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
    },
    noteSaveBtnText: {
      color: '#fff',
      fontFamily: fontBold(),
      fontSize: 16,
    },
  });

  const renderBookmark = ({ item, index }: { item: Bookmark; index: number }) => (
    <Animated.View 
      entering={FadeInDown.delay(index * 50).duration(400)}
      style={s.card}
    >
      <BlurView
        intensity={Platform.OS === 'ios' ? 60 : 30}
        tint={isDarkMode ? 'dark' : 'light'}
        style={{ borderRadius: 20, overflow: 'hidden' }}
      >
        <TouchableOpacity 
          style={s.cardInner} 
          activeOpacity={0.7}
          onPress={() => navigateToAyah(item)}
        >
          {/* Header */}
          <View style={[s.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => handleDelete(item)}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.muted} />
            </TouchableOpacity>
            <Text style={[s.dateText, { textAlign: isRTL ? 'right' : 'left' }]}>
              {new Date(item.createdAt).toLocaleDateString(getDateLocale())}
            </Text>
            <TouchableOpacity 
              style={s.surahBadge}
              onPress={() => navigateToAyah(item)}
            >
              <Text style={s.surahBadgeText}>{item.surahName} • {item.ayahNumber}</Text>
            </TouchableOpacity>
          </View>

          {/* Ayah Text */}
          <Text style={[s.ayahText, { textAlign: isRTL ? 'right' : 'left' }]}>{item.ayahText}</Text>

          {/* Note */}
          {item.note ? (
            <View style={s.noteBox}>
              <Text style={[s.noteText, { textAlign: isRTL ? 'right' : 'left' }]}>{item.note}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        {/* Actions - outside TouchableOpacity to prevent gesture conflicts */}
        <View style={[s.actionsBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={[s.actionBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => navigateToAyah(item)}
          >
            <MaterialCommunityIcons name="book-open-page-variant-outline" size={18} color={accent} />
            <Text style={[s.actionText, { color: accent }]}>{t('common.open')}</Text>
          </TouchableOpacity>
          <View style={s.actionDivider} />
          <TouchableOpacity
            style={[s.actionBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => { setSelectedBookmark(item); setShowExportModal(true); }}
          >
            <MaterialCommunityIcons name="image-outline" size={18} color={accent} />
            <Text style={[s.actionText, { color: accent }]}>{t('favorites.image')}</Text>
          </TouchableOpacity>
          <View style={s.actionDivider} />
          <TouchableOpacity
            style={[s.actionBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => handleShareText(item)}
          >
            <MaterialCommunityIcons name="share-variant-outline" size={18} color={accent} />
            <Text style={[s.actionText, { color: accent }]}>{t('common.share')}</Text>
          </TouchableOpacity>
          <View style={s.actionDivider} />
          <TouchableOpacity
            style={[s.actionBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => {
              setEditingBookmark(item);
              setNoteText(item.note || '');
              setShowNoteModal(true);
            }}
          >
            <MaterialCommunityIcons name="pencil-outline" size={18} color={accent} />
            <Text style={[s.actionText, { color: accent }]}>{t('favorites.note')}</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Animated.View>
  );

  const renderAzkarItem = ({ item, index }: { item: Zikr; index: number }) => (
    <Animated.View 
      entering={FadeInDown.delay(index * 50).duration(400)}
    >
      <TouchableOpacity 
        style={s.azkarCard}
        activeOpacity={0.7}
        onPress={() => navigateToAzkar(item)}
      >
        <Text style={[s.azkarText, { textAlign: isRTL ? 'right' : 'left' }]}>{item.arabic}</Text>
        <View style={[s.azkarMeta, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={s.azkarCount}>×{item.count}</Text>
          <Text style={[s.azkarRef, { textAlign: isRTL ? 'right' : 'left' }]}>{item.reference}</Text>
        </View>
      </TouchableOpacity>
      <View style={[s.actionsBar, { marginHorizontal: 16, marginTop: -8, marginBottom: 8, borderRadius: 0, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, backgroundColor: cardBg, borderWidth: 0.5, borderColor: cardBorder, borderTopWidth: 0, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity style={[s.actionBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => navigateToAzkar(item)}>
          <MaterialCommunityIcons name="book-open-page-variant-outline" size={18} color={accent} />
          <Text style={[s.actionText, { color: accent }]}>{t('common.open')}</Text>
        </TouchableOpacity>
        <View style={s.actionDivider} />
        <TouchableOpacity style={[s.actionBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => handleShareAzkar(item)}>
          <MaterialCommunityIcons name="share-variant-outline" size={18} color={accent} />
          <Text style={[s.actionText, { color: accent }]}>{t('common.share')}</Text>
        </TouchableOpacity>
        <View style={s.actionDivider} />
        <TouchableOpacity style={[s.actionBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => handleRemoveAzkar(item)}>
          <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" />
          <Text style={[s.actionText, { color: '#EF4444' }]}>{t('common.remove')}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      backgroundUrl={settings.display.appBackgroundUrl}
      opacity={settings.display.backgroundOpacity ?? 1}
      style={{ flex: 1, backgroundColor: settings.display.appBackground !== 'none' ? 'transparent' : colors.background }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeIn.duration(400)} style={[s.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <BackButton />
          <Text style={s.title}>{t('favorites.title')}</Text>
          <View style={{ width: 34 }} />
        </Animated.View>

        {/* Tab Switcher */}
        <View style={s.tabBar}>
          <NativeTabs
            tabs={[
              { key: 'quran', label: `${t('favorites.quran')} (${bookmarks.length})` },
              { key: 'bookmarks', label: `${t('favorites.bookmarks')} (${coloredBookmarks.length})` },
              { key: 'azkar', label: `${t('favorites.azkar')} (${azkarFavorites.length})` },
              { key: 'other', label: `${t('favorites.other')} (${otherFavorites.length + namesFavorites.length})` },
            ]}
            selected={activeTab}
            onSelect={(key) => setActiveTab(key as typeof activeTab)}
            indicatorColor="#2f7659"
          />
        </View>

        {activeTab === 'quran' && bookmarks.length > 0 && (
          <View style={[s.statsBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={s.flex1} />
            <View style={s.sortBtns}>
              <NativeTabs
                tabs={[
                  { key: 'date', label: t('favorites.sortByDate') },
                  { key: 'surah', label: t('favorites.sortBySurah') },
                ]}
                selected={sortBy}
                onSelect={(key) => setSortBy(key as 'date' | 'surah')}
                indicatorColor="#2f7659"
              />
            </View>
            <View style={s.countBadge}>
              <Text style={s.countText}>{bookmarks.length} {t('favorites.verse')}</Text>
            </View>
          </View>
        )}

        {/* List */}
        {loading ? (
          <View style={s.emptyWrap}>
            <ActivityIndicator size="large" color={accent} />
          </View>
        ) : activeTab === 'quran' ? (
          <FlatList
            data={sortedBookmarks}
            keyExtractor={item => item.id}
            renderItem={renderBookmark}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <MaterialCommunityIcons name="book-open-variant" size={52} color={colors.muted} style={{ marginBottom: 20 }} />
                <Text style={s.emptyTitle}>{t('favorites.noQuranFavorites')}</Text>
                <Text style={s.emptyText}>
                  {t('favorites.addQuranHint')}
                </Text>
              </View>
            }
          />
        ) : activeTab === 'bookmarks' ? (
          <FlatList
            data={coloredBookmarks}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 4, paddingHorizontal: 16 }}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay(index * 40).duration(300)}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/surah/${item.surahNumber}?ayah=${item.ayahNumber}`);
                  }}
                  onLongPress={() => {
                    Alert.alert(
                      t('favorites.deleteBookmarkConfirm'),
                      `${item.surahName} - ${t('favorites.verse')} ${item.ayahNumber}`,
                      [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: t('common.delete'), style: 'destructive',
                          onPress: async () => {
                            await removeColoredBookmark(item.id);
                            const updated = await getColoredBookmarks();
                            setColoredBookmarks(updated);
                          },
                        },
                      ]
                    );
                  }}
                  style={{
                    backgroundColor: cardBg,
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 8,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: 10,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: cardBorder,
                    borderLeftWidth: isRTL ? 0 : 4,
                    borderLeftColor: isRTL ? undefined : BOOKMARK_COLORS[item.color],
                    borderRightWidth: isRTL ? 4 : 0,
                    borderRightColor: isRTL ? BOOKMARK_COLORS[item.color] : undefined,
                  }}
                >
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={{ fontFamily: fontSemiBold(), fontSize: 15, color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }}>
                      {item.surahName} - {t('favorites.verse')} {item.ayahNumber}
                    </Text>
                    <Text style={{ fontFamily: fontRegular(), fontSize: 12, color: colors.muted, marginTop: 2 }}>
                      {t('common.page')} {item.page} • {t(BOOKMARK_COLOR_LABELS[item.color])}
                    </Text>
                  </View>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: BOOKMARK_COLORS[item.color] }} />
                </TouchableOpacity>
              </Animated.View>
            )}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <MaterialCommunityIcons name="bookmark-outline" size={52} color={colors.muted} style={{ marginBottom: 20 }} />
                <Text style={s.emptyTitle}>{t('favorites.noBookmarks')}</Text>
                <Text style={s.emptyText}>
                  {t('favorites.addBookmarkHint')}
                </Text>
              </View>
            }
          />
        ) : activeTab === 'azkar' ? (
          <FlatList
            data={azkarFavorites}
            keyExtractor={item => String(item.id)}
            renderItem={renderAzkarItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <MaterialCommunityIcons name="hands-pray" size={52} color={colors.muted} style={{ marginBottom: 20 }} />
                <Text style={s.emptyTitle}>{t('favorites.noAzkarFavorites')}</Text>
                <Text style={s.emptyText}>
                  {t('favorites.addAzkarHint')}
                </Text>
              </View>
            }
          />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 4, paddingHorizontal: 16 }}
          >
            {/* أسماء الله الحسنى المحفوظة */}
            {namesFavorites.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => toggleSection('names')}
                  style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: collapsedSections.has('names') ? 0 : 10 }}
                >
                  <MaterialCommunityIcons
                    name={collapsedSections.has('names') ? (isRTL ? 'chevron-right' : 'chevron-left') : 'chevron-down'}
                    size={22}
                    color={colors.muted}
                  />
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: fontBold(), fontSize: 16, color: colors.foreground }}>
                      {t('favorites.namesOfAllah')} ({namesFavorites.length})
                    </Text>
                    <MaterialCommunityIcons name="star-crescent" size={20} color={accent} />
                  </View>
                </TouchableOpacity>
                {!collapsedSections.has('names') && namesFavorites.map((item, idx) => (
                  <Animated.View key={String(item.id)} entering={FadeInDown.delay(idx * 40).duration(300)}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => router.push('/names' as any)}
                      style={{
                        backgroundColor: cardBg,
                        borderRadius: 14,
                        padding: 16,
                        marginBottom: 8,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: cardBorder,
                        alignItems: isRTL ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <Text style={{ fontFamily: fontBold(), fontSize: 22, color: accent, textAlign: isRTL ? 'right' : 'left' }}>
                        {item.name}
                      </Text>
                      <Text style={{ fontFamily: fontRegular(), fontSize: 14, color: colors.foreground, textAlign: isRTL ? 'right' : 'left', marginTop: 4 }}>
                        {item.meaning}
                      </Text>
                      {item.evidence && (
                        <Text style={{ fontFamily: fontRegular(), fontSize: 12, color: colors.muted, textAlign: isRTL ? 'right' : 'left', marginTop: 4 }}>
                          {item.evidence}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            )}
            {otherFavorites.length === 0 && namesFavorites.length === 0 ? (
              <View style={s.emptyWrap}>
                <MaterialCommunityIcons name="heart-outline" size={52} color={colors.muted} style={{ marginBottom: 20 }} />
                <Text style={s.emptyTitle}>{t('favorites.noOtherFavorites')}</Text>
                <Text style={s.emptyText}>
                  {t('favorites.addOtherHint')}
                </Text>
              </View>
            ) : null}
            {otherFavorites.length > 0 && (
              FAVORITE_CATEGORIES
                .filter(cat => otherFavorites.some(f => cat.types.includes(f.type)))
                .map(cat => {
                  const items = otherFavorites.filter(f => cat.types.includes(f.type));
                  const isCollapsed = collapsedSections.has(cat.key);
                  return (
                    <View key={cat.key} style={{ marginBottom: 20 }}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => toggleSection(cat.key)}
                        style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: isCollapsed ? 0 : 10 }}
                      >
                        <MaterialCommunityIcons
                          name={isCollapsed ? (isRTL ? 'chevron-right' : 'chevron-left') : 'chevron-down'}
                          size={22}
                          color={colors.muted}
                        />
                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontFamily: fontBold(), fontSize: 16, color: colors.foreground }}>
                            {t(cat.labelKey)} ({items.length})
                          </Text>
                          <MaterialCommunityIcons name={cat.icon as any} size={20} color={accent} />
                        </View>
                      </TouchableOpacity>
                      {!isCollapsed && items.map((item, idx) => (
                        <Animated.View key={`${item.type}_${item.id}`} entering={FadeInDown.delay(idx * 30).duration(300)}>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onLongPress={() => {
                              Alert.alert(t('common.delete'), t('favorites.removeFromFavoritesConfirm'), [
                                { text: t('common.cancel'), style: 'cancel' },
                                {
                                  text: t('common.delete'), style: 'destructive',
                                  onPress: async () => {
                                    await removeFavorite(item.id, item.type);
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    loadBookmarks();
                                  },
                                },
                              ]);
                            }}
                            onPress={() => {
                              const route = item.route || getFallbackRoute(item);
                              if (route) router.push(route as any);
                            }}
                            style={{
                              backgroundColor: cardBg,
                              borderRadius: 14,
                              padding: 14,
                              marginBottom: 8,
                              borderWidth: StyleSheet.hairlineWidth,
                              borderColor: cardBorder,
                              alignItems: isRTL ? 'flex-end' : 'flex-start',
                            }}
                          >
                            <Text style={{ fontFamily: 'Amiri-Regular', fontSize: 18, color: colors.foreground, textAlign: isRTL ? 'right' : 'left', lineHeight: 32 }}>
                              {item.arabic}
                            </Text>
                            {item.reference && (
                              <Text style={{ fontFamily: fontRegular(), fontSize: 12, color: accent, marginTop: 6, textAlign: isRTL ? 'right' : 'left' }}>
                                {item.reference}
                              </Text>
                            )}
                          </TouchableOpacity>
                        </Animated.View>
                      ))}
                    </View>
                  );
                })
            )}
          </ScrollView>
        )}

        {/* ── Export as Image Modal ── */}
        <Modal
          visible={showExportModal && !!selectedBookmark}
          transparent
          animationType="fade"
          onRequestClose={() => setShowExportModal(false)}
        >
          <View style={s.modalWrap}>
            <TouchableOpacity style={s.modalClose} onPress={() => setShowExportModal(false)}>
              <MaterialCommunityIcons name="close" size={20} color="#fff" />
            </TouchableOpacity>

            <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 60 }}>
              <View style={s.modalCard}>
              <Text style={s.modalTitle}>{t('favorites.exportImage')}</Text>

              {/* Theme Selector */}
              <Text style={s.themeName}>{t('favorites.chooseDesign')}</Text>
              <View style={s.themesRow}>
                {CARD_THEMES.map(theme => (
                  <TouchableOpacity
                    key={theme.id}
                    style={[
                      s.themeBtn,
                      { backgroundColor: theme.bg, borderColor: selectedTheme.id === theme.id ? '#fff' : 'transparent' },
                    ]}
                    onPress={() => setSelectedTheme(theme)}
                  >
                    {selectedTheme.id === theme.id && (
                      <Text style={{ fontSize: 16, color: '#fff' }}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.themeName}>{t(selectedTheme.nameKey)}</Text>

              {/* Preview */}
              {selectedBookmark && (
                <View style={s.previewWrap}>
                  <ExportCard
                    bookmark={selectedBookmark}
                    theme={selectedTheme}
                    cardRef={cardRef}
                    t={t}
                  />
                </View>
              )}

              {/* Export buttons */}
              <View style={s.exportActions}>
                <TouchableOpacity
                  style={[s.exportBtn, { backgroundColor: '#1B6B3A', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={handleExportImage}
                  disabled={exporting}
                >
                  {exporting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <>
                        <MaterialCommunityIcons name="image-outline" size={18} color="#fff" />
                        <Text style={s.exportBtnText}>{t('favorites.exportImage')}</Text>
                      </>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.exportBtn, { backgroundColor: '#2563EB', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => selectedBookmark && handleShareText(selectedBookmark)}
                >
                  <MaterialCommunityIcons name="share-variant-outline" size={18} color="#fff" />
                  <Text style={s.exportBtnText}>{t('favorites.shareText')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Note Modal ── */}
      <Modal
        visible={showNoteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNoteModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowNoteModal(false)}
        >
          <View style={s.noteModalCard}>
            <View style={s.noteHandle} />
            <Text style={[s.noteTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('favorites.addNote')}</Text>
            {editingBookmark && (
              <Text style={{ color: accent, textAlign: isRTL ? 'right' : 'left', fontSize: 14, marginBottom: 10, fontFamily: fontBold() }}>
                {editingBookmark.surahName} • {t('favorites.verse')} {editingBookmark.ayahNumber}
              </Text>
            )}
            <TextInput
              style={s.noteInput}
              placeholder={t('favorites.notePlaceholder')}
              placeholderTextColor={colors.muted}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              returnKeyType="done"
            />
            <TouchableOpacity style={s.noteSaveBtn} onPress={handleSaveNote}>
              <Text style={s.noteSaveBtnText}>{t('favorites.saveNote')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}
