/**
 * Favorites Screen — المفضلة
 * حفظ الآيات مع ملاحظات، تصديرها كصور جاهزة للمشاركة
 * يستخدم: react-native-view-shot + expo-sharing + expo-media-library
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator, Platform,
  ScrollView, Animated, Share,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getBookmarks, removeBookmark, Bookmark, addBookmark } from '@/lib/storage';
import { SURAH_NAMES_AR } from '@/lib/quran-api';
import * as Haptics from 'expo-haptics';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';

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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
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
  const colors = useColors();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
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
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    const bms = await getBookmarks();
    setBookmarks(bms);
    setLoading(false);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  useEffect(() => { loadBookmarks(); }, [loadBookmarks]);

  const sortedBookmarks = [...bookmarks].sort((a, b) =>
    sortBy === 'date' ? b.createdAt - a.createdAt : a.surahNumber - b.surahNumber
  );

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

  const s = StyleSheet.create({
    header: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    title: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800', color: colors.foreground },
    iconBtn: { padding: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    // Sort/stats bar
    statsBar: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingVertical: 10, backgroundColor: colors.surface,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    countBadge: {
      backgroundColor: colors.primary + '18', borderRadius: 12,
      paddingHorizontal: 10, paddingVertical: 4, marginLeft: 10,
    },
    countText: { fontSize: 12, fontWeight: '700', color: colors.primary },
    sortBtns: { flexDirection: 'row', gap: 6, marginRight: 10 },
    sortBtn: {
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    sortBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    sortBtnText: { fontSize: 11, fontWeight: '700', color: colors.muted },
    sortBtnTextActive: { color: '#fff' },
    flex1: { flex: 1 },
    // Bookmark card
    card: {
      marginHorizontal: 12, marginVertical: 6, borderRadius: 16,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
      paddingTop: 12, paddingBottom: 8,
    },
    surahBadge: {
      backgroundColor: colors.primary + '15', borderRadius: 20,
      paddingHorizontal: 10, paddingVertical: 4,
    },
    surahBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primary },
    dateText: { flex: 1, fontSize: 11, color: colors.muted, textAlign: 'left', marginRight: 8 },
    ayahText: {
      fontSize: 18, color: colors.foreground, textAlign: 'right',
      lineHeight: 36, paddingHorizontal: 14, paddingBottom: 10,
    },
    noteBox: {
      marginHorizontal: 14, marginBottom: 10, backgroundColor: colors.primary + '08',
      borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: colors.primary,
    },
    noteText: { fontSize: 12, color: colors.muted, textAlign: 'right', fontStyle: 'italic' },
    // Actions bar
    actionsBar: {
      flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: colors.border,
    },
    actionBtn: {
      flex: 1, paddingVertical: 10, alignItems: 'center', flexDirection: 'row',
      justifyContent: 'center', gap: 4,
    },
    actionDivider: { width: 0.5, backgroundColor: colors.border },
    actionText: { fontSize: 12, fontWeight: '600' },
    // Empty state
    emptyWrap: { flex: 1, alignItems: 'center', paddingTop: 80 },
    emptyEmoji: { fontSize: 60, marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.foreground, marginBottom: 8 },
    emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },
    // Export modal
    modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 16 },
    modalClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 10 },
    modalCard: {
      width: '100%', backgroundColor: colors.background, borderRadius: 24,
      padding: 20, maxHeight: '90%',
    },
    modalTitle: { fontSize: 17, fontWeight: '800', color: colors.foreground, textAlign: 'center', marginBottom: 16 },
    // Theme selector
    themesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 },
    themeBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
    themeName: { fontSize: 11, color: colors.muted, textAlign: 'center', marginBottom: 8 },
    // Preview card (inside modal)
    previewWrap: { alignItems: 'center', marginBottom: 16 },
    // Export actions
    exportActions: { flexDirection: 'row', gap: 10 },
    exportBtn: {
      flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center',
      flexDirection: 'row', justifyContent: 'center', gap: 8,
    },
    exportBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    // Note modal
    noteModalCard: {
      backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      padding: 24, paddingBottom: 40,
    },
    noteHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
    noteTitle: { fontSize: 17, fontWeight: '800', color: colors.foreground, textAlign: 'right', marginBottom: 12 },
    noteInput: {
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: 14, padding: 14, fontSize: 15, color: colors.foreground,
      textAlign: 'right', minHeight: 80, marginBottom: 14,
    },
    noteSaveBtn: { backgroundColor: colors.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
    noteSaveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  });

  const renderBookmark = ({ item, index }: { item: Bookmark; index: number }) => (
    <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
      {/* Header */}
      <View style={s.cardHeader}>
        <TouchableOpacity
          style={s.iconBtn}
          onPress={() => handleDelete(item)}
        >
          <IconSymbol name="trash" size={14} color={colors.muted} />
        </TouchableOpacity>
        <Text style={s.dateText}>
          {new Date(item.createdAt).toLocaleDateString('ar-EG')}
        </Text>
        <View style={s.surahBadge}>
          <Text style={s.surahBadgeText}>{item.surahName} • {item.ayahNumber}</Text>
        </View>
      </View>

      {/* Ayah Text */}
      <Text style={s.ayahText}>{item.ayahText}</Text>

      {/* Note */}
      {item.note ? (
        <View style={s.noteBox}>
          <Text style={s.noteText}>📝 {item.note}</Text>
        </View>
      ) : null}

      {/* Actions */}
      <View style={s.actionsBar}>
        <TouchableOpacity
          style={s.actionBtn}
          onPress={() => { setSelectedBookmark(item); setShowExportModal(true); }}
        >
          <IconSymbol name="photo" size={14} color={colors.primary} />
          <Text style={[s.actionText, { color: colors.primary }]}>صورة</Text>
        </TouchableOpacity>
        <View style={s.actionDivider} />
        <TouchableOpacity
          style={s.actionBtn}
          onPress={() => handleShareText(item)}
        >
          <IconSymbol name="square.and.arrow.up" size={14} color={colors.primary} />
          <Text style={[s.actionText, { color: colors.primary }]}>مشاركة</Text>
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
          <IconSymbol name="pencil" size={14} color={colors.primary} />
          <Text style={[s.actionText, { color: colors.primary }]}>ملاحظة</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ width: 36 }} />
        <Text style={s.title}>⭐ المفضلة</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Stats & Sort Bar */}
      <View style={s.statsBar}>
        <View style={s.flex1} />
        <View style={s.sortBtns}>
          <TouchableOpacity
            style={[s.sortBtn, sortBy === 'date' && s.sortBtnActive]}
            onPress={() => setSortBy('date')}
          >
            <Text style={[s.sortBtnText, sortBy === 'date' && s.sortBtnTextActive]}>📅 التاريخ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.sortBtn, sortBy === 'surah' && s.sortBtnActive]}
            onPress={() => setSortBy('surah')}
          >
            <Text style={[s.sortBtnText, sortBy === 'surah' && s.sortBtnTextActive]}>📖 السورة</Text>
          </TouchableOpacity>
        </View>
        <View style={s.countBadge}>
          <Text style={s.countText}>{bookmarks.length} آية</Text>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={sortedBookmarks}
          keyExtractor={item => item.id}
          renderItem={renderBookmark}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30, paddingTop: 4 }}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={s.emptyEmoji}>⭐</Text>
              <Text style={s.emptyTitle}>لا توجد آيات محفوظة</Text>
              <Text style={s.emptyText}>
                افتح أي سورة وامسح مطولاً على الآية لحفظها هنا
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
            <IconSymbol name="xmark" size={18} color="#fff" />
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
                        <IconSymbol name="photo" size={18} color="#fff" />
                        <Text style={s.exportBtnText}>حفظ صورة</Text>
                      </>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.exportBtn, { backgroundColor: '#2563EB' }]}
                  onPress={() => selectedBookmark && handleShareText(selectedBookmark)}
                >
                  <IconSymbol name="square.and.arrow.up" size={18} color="#fff" />
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
              <Text style={{ color: colors.primary, textAlign: 'right', fontSize: 13, marginBottom: 8, fontWeight: '700' }}>
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
    </ScreenContainer>
  );
}
