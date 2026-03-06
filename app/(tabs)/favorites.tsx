/**
 * Favorites Screen — المفضلة
 * Redesigned with Apple iOS glassmorphism styling and improved contrast
 * حفظ الآيات مع ملاحظات، تصديرها كصور جاهزة للمشاركة
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator, Platform,
  ScrollView, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSettings } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { GlassCard, GlassSegmentedControl } from '@/components/ui/GlassCard';
import { getBookmarks, removeBookmark, Bookmark, addBookmark } from '@/lib/storage';
import { SURAH_NAMES_AR } from '@/lib/quran-api';
import * as Haptics from 'expo-haptics';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { getFavoriteAzkar, removeFromFavorites, Zikr } from '@/lib/azkar-api';

// ─── Image Card Themes ───────────────────────────────────────────────────────
const CARD_THEMES = [
  { id: 'green',   bg: '#1B6B3A', text: '#ffffff', accent: '#A7F3D0', name: 'أخضر كلاسيك' },
  { id: 'dark',    bg: '#0F172A', text: '#F1F5F9', accent: '#818CF8', name: 'ليلي داكن' },
  { id: 'gold',    bg: '#78350F', text: '#FFFBEB', accent: '#FCD34D', name: 'ذهبي ملكي' },
  { id: 'blue',    bg: '#1E3A5F', text: '#EFF6FF', accent: '#93C5FD', name: 'أزرق سماوي' },
  { id: 'rose',    bg: '#881337', text: '#FFF1F2', accent: '#FDA4AF', name: 'وردي راقي' },
  { id: 'teal',    bg: '#134E4A', text: '#F0FDFA', accent: '#5EEAD4', name: 'فيروزي' },
];

// ─── Image Export Card (rendered off-screen for capture) ─────────────────────
interface ExportCardProps {
  bookmark: Bookmark;
  theme: typeof CARD_THEMES[0];
  cardRef: React.RefObject<ViewShot>;
}

function ExportCard({ bookmark, theme, cardRef }: ExportCardProps) {
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
            ﴿ {bookmark.surahName} • آية {bookmark.ayahNumber} ﴾
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
export default function FavoritesScreen() {
  const { isDarkMode, settings, t } = useSettings();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'quran' | 'azkar'>('quran');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [azkarFavorites, setAzkarFavorites] = useState<Zikr[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(CARD_THEMES[0]);
  const [exporting, setExporting] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'surah'>('date');
  const cardRef = useRef<ViewShot>(null);

  // Colors based on dark mode for better contrast
  const colors = {
    primary: '#2f7659',
    foreground: isDarkMode ? '#FFFFFF' : '#1C1C1E',
    muted: isDarkMode ? '#A1A1AA' : '#6B7280',
    background: isDarkMode ? '#11151c' : '#f5f5f5',
    card: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)',
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
    accent: isDarkMode ? '#4ADE80' : '#2f7659',
  };

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    const bms = await getBookmarks();
    setBookmarks(bms);
    const favAzkar = await getFavoriteAzkar();
    setAzkarFavorites(favAzkar);
    setLoading(false);
  }, []);

  useEffect(() => { loadBookmarks(); }, [loadBookmarks]);

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
      'حذف من المفضلة',
      `هل تريد حذف آية "${bookmark.surahName}" من المفضلة؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف', style: 'destructive',
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
          'تصدير الآية',
          'اختر طريقة التصدير:',
          [
            {
              text: '💾 حفظ في الاستوديو',
              onPress: async () => {
                if (status === 'granted') {
                  await MediaLibrary.saveToLibraryAsync(uri);
                  if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert('✅ تم الحفظ', 'تم حفظ الصورة في معرض الصور');
                } else {
                  Alert.alert('خطأ', 'يلزم إذن الوصول لمعرض الصور');
                }
              },
            },
            canShare ? {
              text: '📤 مشاركة',
              onPress: async () => {
                await Sharing.shareAsync(uri, {
                  mimeType: 'image/png',
                  dialogTitle: `آية من ${selectedBookmark.surahName}`,
                });
              },
            } : null,
            { text: 'إلغاء', style: 'cancel' },
          ].filter(Boolean) as any[]
        );
      } else {
        // Web: share text
        await Share.share({
          message: `${selectedBookmark.ayahText}\n\n﴿ ${selectedBookmark.surahName} • آية ${selectedBookmark.ayahNumber} ﴾\n\nالقرآن الكريم`,
        });
      }
    } catch (e) {
      Alert.alert('خطأ', 'تعذر تصدير الصورة. حاول مرة أخرى.');
    } finally {
      setExporting(false);
    }
  }, [selectedBookmark, cardRef]);

  // Share as text
  const handleShareText = useCallback(async (bookmark: Bookmark) => {
    await Share.share({
      message: `${bookmark.ayahText}\n\n﴿ ${bookmark.surahName} • آية ${bookmark.ayahNumber} ﴾\n\nالقرآن الكريم 🕌`,
      title: `آية من ${bookmark.surahName}`,
    });
  }, []);

  // Remove azkar from favorites
  const handleRemoveAzkar = useCallback((zikr: Zikr) => {
    Alert.alert(
      'إزالة من المفضلة',
      'هل تريد إزالة هذا الذكر من المفضلة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إزالة', style: 'destructive',
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
      message: `${zikr.arabic}\n\n📿 ${zikr.reference}\n\nعدد التكرار: ${zikr.count}`,
    });
  }, []);

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
      fontFamily: 'Cairo-Bold',
      color: colors.foreground,
    },
    // Sort/stats bar
    statsBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    countBadge: {
      backgroundColor: colors.accent + '20',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 5,
      marginLeft: 10,
    },
    countText: {
      fontSize: 13,
      fontFamily: 'Cairo-Bold',
      color: colors.accent,
    },
    sortBtns: {
      flexDirection: 'row',
      gap: 6,
      marginRight: 10,
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
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 0.5,
      borderColor: colors.cardBorder,
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
      backgroundColor: colors.accent + '20',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    surahBadgeText: {
      fontSize: 13,
      fontFamily: 'Cairo-Bold',
      color: colors.accent,
    },
    dateText: {
      flex: 1,
      fontSize: 12,
      fontFamily: 'Cairo-Regular',
      color: colors.muted,
      textAlign: 'left',
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
      textAlign: 'right',
      lineHeight: 42,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    noteBox: {
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: colors.accent + '12',
      borderRadius: 12,
      padding: 12,
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
    },
    noteText: {
      fontSize: 13,
      fontFamily: 'Cairo-Regular',
      color: colors.muted,
      textAlign: 'right',
    },
    // Actions bar
    actionsBar: {
      flexDirection: 'row',
      borderTopWidth: 0.5,
      borderTopColor: colors.cardBorder,
    },
    actionBtn: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
    },
    actionDivider: {
      width: 0.5,
      backgroundColor: colors.cardBorder,
    },
    actionText: {
      fontSize: 13,
      fontFamily: 'Cairo-SemiBold',
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
      fontFamily: 'Cairo-Bold',
      color: colors.foreground,
      marginBottom: 10,
    },
    emptyText: {
      fontSize: 15,
      fontFamily: 'Cairo-Regular',
      color: colors.muted,
      textAlign: 'center',
      lineHeight: 26,
    },
    // Tab bar
    tabBar: {
      paddingHorizontal: 16,
      paddingTop: 8,
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
      backgroundColor: colors.card,
      borderWidth: 0.5,
      borderColor: colors.cardBorder,
      borderBottomWidth: 0,
      overflow: 'hidden',
      padding: 16,
    },
    azkarText: {
      fontSize: 20,
      fontFamily: 'Amiri-Regular',
      color: colors.foreground,
      textAlign: 'right',
      lineHeight: 40,
      marginBottom: 12,
    },
    azkarMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    azkarRef: {
      fontSize: 13,
      fontFamily: 'Cairo-Regular',
      color: colors.muted,
      flex: 1,
      textAlign: 'right',
    },
    azkarCount: {
      fontSize: 12,
      fontFamily: 'Cairo-Bold',
      color: colors.accent,
      backgroundColor: colors.accent + '18',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
      marginLeft: 8,
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
      fontFamily: 'Cairo-Bold',
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
      fontFamily: 'Cairo-SemiBold',
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
      fontFamily: 'Cairo-Bold',
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
      fontFamily: 'Cairo-Bold',
      color: colors.foreground,
      textAlign: 'right',
      marginBottom: 12,
    },
    noteInput: {
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 16,
      fontSize: 16,
      fontFamily: 'Cairo-Regular',
      color: colors.foreground,
      textAlign: 'right',
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
      fontFamily: 'Cairo-Bold',
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
          <View style={s.cardHeader}>
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => handleDelete(item)}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.muted} />
            </TouchableOpacity>
            <Text style={s.dateText}>
              {new Date(item.createdAt).toLocaleDateString('ar-EG')}
            </Text>
            <TouchableOpacity 
              style={s.surahBadge}
              onPress={() => navigateToAyah(item)}
            >
              <Text style={s.surahBadgeText}>{item.surahName} • {item.ayahNumber}</Text>
            </TouchableOpacity>
          </View>

          {/* Ayah Text */}
          <Text style={s.ayahText}>{item.ayahText}</Text>

          {/* Note */}
          {item.note ? (
            <View style={s.noteBox}>
              <Text style={s.noteText}>📝 {item.note}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        {/* Actions - outside TouchableOpacity to prevent gesture conflicts */}
        <View style={s.actionsBar}>
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => navigateToAyah(item)}
          >
            <MaterialCommunityIcons name="book-open-page-variant-outline" size={18} color={colors.accent} />
            <Text style={[s.actionText, { color: colors.accent }]}>فتح</Text>
          </TouchableOpacity>
          <View style={s.actionDivider} />
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => { setSelectedBookmark(item); setShowExportModal(true); }}
          >
            <MaterialCommunityIcons name="image-outline" size={18} color={colors.accent} />
            <Text style={[s.actionText, { color: colors.accent }]}>صورة</Text>
          </TouchableOpacity>
          <View style={s.actionDivider} />
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => handleShareText(item)}
          >
            <MaterialCommunityIcons name="share-variant-outline" size={18} color={colors.accent} />
            <Text style={[s.actionText, { color: colors.accent }]}>مشاركة</Text>
          </TouchableOpacity>
          <View style={s.actionDivider} />
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => {
              setEditingBookmark(item);
              setNoteText(item.note || '');
              setShowNoteModal(true);
            }}
          >
            <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.accent} />
            <Text style={[s.actionText, { color: colors.accent }]}>ملاحظة</Text>
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
        <Text style={s.azkarText}>{item.arabic}</Text>
        <View style={s.azkarMeta}>
          <Text style={s.azkarCount}>×{item.count}</Text>
          <Text style={s.azkarRef}>{item.reference}</Text>
        </View>
      </TouchableOpacity>
      <View style={[s.actionsBar, { marginHorizontal: 16, marginTop: -8, marginBottom: 8, borderRadius: 0, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, backgroundColor: colors.card, borderWidth: 0.5, borderColor: colors.cardBorder, borderTopWidth: 0 }]}>
        <TouchableOpacity style={s.actionBtn} onPress={() => navigateToAzkar(item)}>
          <MaterialCommunityIcons name="book-open-page-variant-outline" size={18} color={colors.accent} />
          <Text style={[s.actionText, { color: colors.accent }]}>فتح</Text>
        </TouchableOpacity>
        <View style={s.actionDivider} />
        <TouchableOpacity style={s.actionBtn} onPress={() => handleShareAzkar(item)}>
          <MaterialCommunityIcons name="share-variant-outline" size={18} color={colors.accent} />
          <Text style={[s.actionText, { color: colors.accent }]}>مشاركة</Text>
        </TouchableOpacity>
        <View style={s.actionDivider} />
        <TouchableOpacity style={s.actionBtn} onPress={() => handleRemoveAzkar(item)}>
          <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" />
          <Text style={[s.actionText, { color: '#EF4444' }]}>إزالة</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      backgroundUrl={settings.display.appBackgroundUrl}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeIn.duration(400)} style={s.header}>
          <View style={{ width: 36 }} />
          <Text style={s.title}>⭐ المفضلة</Text>
          <View style={{ width: 36 }} />
        </Animated.View>

        {/* Tab Switcher */}
        <View style={s.tabBar}>
          <GlassSegmentedControl
            segments={[
              { key: 'quran', label: `📖 القرآن (${bookmarks.length})` },
              { key: 'azkar', label: `📿 الأذكار (${azkarFavorites.length})` },
            ]}
            selected={activeTab}
            onSelect={(key) => setActiveTab(key as 'quran' | 'azkar')}
          />
        </View>

        {activeTab === 'quran' && bookmarks.length > 0 && (
          <View style={s.statsBar}>
            <View style={s.flex1} />
            <View style={s.sortBtns}>
              <GlassSegmentedControl
                segments={[
                  { key: 'date', label: '📅 التاريخ' },
                  { key: 'surah', label: '📖 السورة' },
                ]}
                selected={sortBy}
                onSelect={(key) => setSortBy(key as 'date' | 'surah')}
              />
            </View>
            <View style={s.countBadge}>
              <Text style={s.countText}>{bookmarks.length} آية</Text>
            </View>
          </View>
        )}

        {/* List */}
        {loading ? (
          <View style={s.emptyWrap}>
            <ActivityIndicator size="large" color={colors.accent} />
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
                <Text style={s.emptyEmoji}>📖</Text>
                <Text style={s.emptyTitle}>لا توجد آيات محفوظة</Text>
                <Text style={s.emptyText}>
                  افتح أي سورة واضغط مطولاً على الآية لحفظها هنا
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={azkarFavorites}
            keyExtractor={item => String(item.id)}
            renderItem={renderAzkarItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <Text style={s.emptyEmoji}>📿</Text>
                <Text style={s.emptyTitle}>لا توجد أذكار محفوظة</Text>
                <Text style={s.emptyText}>
                  افتح أي ذكر واضغط على أيقونة القلب لحفظه هنا
                </Text>
              </View>
            }
          />
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

            <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
              <View style={s.modalCard}>
              <Text style={s.modalTitle}>🖼️ تصدير الآية كصورة</Text>

              {/* Theme Selector */}
              <Text style={s.themeName}>اختر التصميم</Text>
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
              <Text style={s.themeName}>{selectedTheme.name}</Text>

              {/* Preview */}
              {selectedBookmark && (
                <View style={s.previewWrap}>
                  <ExportCard
                    bookmark={selectedBookmark}
                    theme={selectedTheme}
                    cardRef={cardRef}
                  />
                </View>
              )}

              {/* Export buttons */}
              <View style={s.exportActions}>
                <TouchableOpacity
                  style={[s.exportBtn, { backgroundColor: '#1B6B3A' }]}
                  onPress={handleExportImage}
                  disabled={exporting}
                >
                  {exporting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <>
                        <MaterialCommunityIcons name="image-outline" size={18} color="#fff" />
                        <Text style={s.exportBtnText}>حفظ صورة</Text>
                      </>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.exportBtn, { backgroundColor: '#2563EB' }]}
                  onPress={() => selectedBookmark && handleShareText(selectedBookmark)}
                >
                  <MaterialCommunityIcons name="share-variant-outline" size={18} color="#fff" />
                  <Text style={s.exportBtnText}>مشاركة نص</Text>
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
            <Text style={s.noteTitle}>📝 إضافة ملاحظة</Text>
            {editingBookmark && (
              <Text style={{ color: colors.accent, textAlign: 'right', fontSize: 14, marginBottom: 10, fontFamily: 'Cairo-Bold' }}>
                {editingBookmark.surahName} • آية {editingBookmark.ayahNumber}
              </Text>
            )}
            <TextInput
              style={s.noteInput}
              placeholder="أضف ملاحظتك هنا..."
              placeholderTextColor={colors.muted}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              returnKeyType="done"
            />
            <TouchableOpacity style={s.noteSaveBtn} onPress={handleSaveNote}>
              <Text style={s.noteSaveBtnText}>حفظ الملاحظة</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}
