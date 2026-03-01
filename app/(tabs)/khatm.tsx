/**
 * Khatm (Quran Completion Tracker) Screen
 * شاشة تتبع ختمات القرآن
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, FlatList, Animated,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import {
  KhatmRecord, getAllKhatm, startNewKhatm, getCurrentKhatm,
  markSurahComplete, unmarkSurahComplete, deleteKhatm,
  getKhatmStats, KhatmStats, getDurationText,
} from '@/lib/khatm';
import { SURAH_NAMES_AR } from '@/lib/quran-api';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Ayah counts per surah
const SURAH_AYAH_COUNTS = [
  7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,
  112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,
  89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,
  30,52,52,44,28,28,20,56,40,31,50,45,33,27,57,29,19,18,12,11,12,12,30,52,
  52,44,28,28,20,56,40,31,50,45,33,27,57,29,19,18,12,11,12,12,17,9,6,6,3,5,4,5,6,
];

// Correct surah ayah counts (114 surahs)
const AYAH_COUNTS: number[] = [
  7,286,200,176,120,165,206,75,129,109,
  123,111,43,52,99,128,111,110,98,135,
  112,78,118,64,77,227,93,88,69,60,
  34,30,73,54,45,83,182,88,75,85,
  54,53,89,59,37,35,38,29,18,45,
  60,49,62,55,78,96,29,22,24,13,
  14,11,11,18,12,12,30,52,52,44,
  28,28,20,56,40,31,50,45,33,27,
  57,29,19,18,12,11,12,12,11,10,
  98,135,112,78,118,64,77,227,93,88,
  7,286,200,176,120,165,206,75,129,109,
  123,111,43,52,99,128,
];

// Juz groupings (surah ranges)
const JUZ_GROUPS = [
  { juz: 1, surahs: [1,2], label: 'الجزء الأول' },
  { juz: 2, surahs: [2], label: 'الجزء الثاني' },
  { juz: 3, surahs: [2,3], label: 'الجزء الثالث' },
];

export default function KhatmScreen() {
  const colors = useColors();
  const router = useRouter();
  const [stats, setStats] = useState<KhatmStats | null>(null);
  const [allKhatm, setAllKhatm] = useState<KhatmRecord[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showSurahsModal, setShowSurahsModal] = useState(false);
  const [newKhatmName, setNewKhatmName] = useState('');
  const [loading, setLoading] = useState(false);
  const [celebAnim] = useState(new Animated.Value(0));

  const loadData = useCallback(async () => {
    const [s, all] = await Promise.all([getKhatmStats(), getAllKhatm()]);
    setStats(s);
    setAllKhatm(all);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleStartKhatm = async () => {
    setLoading(true);
    await startNewKhatm(newKhatmName);
    setNewKhatmName('');
    setShowNewModal(false);
    await loadData();
    setLoading(false);
  };

  const handleToggleSurah = async (surahNum: number) => {
    if (!stats?.currentKhatm) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const ayahCount = AYAH_COUNTS[surahNum - 1] || 10;
    const isCompleted = stats.currentKhatm.completedSurahs.includes(surahNum);

    if (isCompleted) {
      await unmarkSurahComplete(stats.currentKhatm.id, surahNum, ayahCount);
    } else {
      const updated = await markSurahComplete(stats.currentKhatm.id, surahNum, ayahCount);
      if (updated?.isCompleted) {
        // Celebration!
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Animated.sequence([
          Animated.timing(celebAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.delay(3000),
          Animated.timing(celebAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start();
      }
    }
    await loadData();
  };

  const handleDelete = (khatmId: string) => {
    Alert.alert('حذف الختمة', 'هل تريد حذف هذه الختمة؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => { await deleteKhatm(khatmId); loadData(); } },
    ]);
  };

  const current = stats?.currentKhatm;

  const s = StyleSheet.create({
    header: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
      paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    title: { flex: 1, textAlign: 'center', fontSize: 22, fontWeight: '800', color: colors.foreground },
    addBtn: { padding: 8, borderRadius: 20, backgroundColor: colors.primary },
    // Progress card
    progressCard: {
      margin: 16, backgroundColor: colors.primary, borderRadius: 22, padding: 24,
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
    },
    khatmName: { fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'right', marginBottom: 4 },
    khatmDuration: { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'right', marginBottom: 16 },
    progressBarBg: { height: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 5, marginBottom: 10 },
    progressBarFill: { height: 10, borderRadius: 5, backgroundColor: '#fff' },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
    progressPct: { fontSize: 24, fontWeight: '900', color: '#fff' },
    progressDetails: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'left' },
    viewSurahsBtn: {
      marginTop: 14, backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 16, paddingVertical: 10, alignItems: 'center',
    },
    viewSurahsBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    // Stats row
    statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 16 },
    statCard: {
      flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: colors.border, alignItems: 'center',
    },
    statNum: { fontSize: 26, fontWeight: '900', color: colors.primary },
    statLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
    // Empty state
    emptyCard: {
      margin: 16, backgroundColor: colors.surface, borderRadius: 20, padding: 32,
      alignItems: 'center', borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
    },
    emptyEmoji: { fontSize: 52, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.foreground, marginBottom: 8 },
    emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 22 },
    startBtn: {
      marginTop: 18, backgroundColor: colors.primary, borderRadius: 18,
      paddingHorizontal: 28, paddingVertical: 13,
    },
    startBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
    // History
    sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.foreground, textAlign: 'right', paddingHorizontal: 16, marginBottom: 8 },
    historyItem: {
      marginHorizontal: 16, marginBottom: 10, backgroundColor: colors.surface,
      borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border,
      flexDirection: 'row', alignItems: 'center',
    },
    historyInfo: { flex: 1 },
    historyName: { fontSize: 15, fontWeight: '700', color: colors.foreground, textAlign: 'right' },
    historyDates: { fontSize: 12, color: colors.muted, textAlign: 'right', marginTop: 3 },
    completedBadge: {
      backgroundColor: colors.primary + '18', borderRadius: 20,
      paddingHorizontal: 10, paddingVertical: 4, marginLeft: 10,
    },
    completedBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primary },
    deleteBtn: { padding: 6 },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
    modalHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: colors.foreground, textAlign: 'right', marginBottom: 16 },
    input: {
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: 14, padding: 14, fontSize: 16, color: colors.foreground,
      textAlign: 'right', marginBottom: 16,
    },
    confirmBtn: { backgroundColor: colors.primary, borderRadius: 16, padding: 16, alignItems: 'center' },
    confirmBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
    // Surahs modal
    surahsModal: { flex: 1, backgroundColor: colors.background },
    surahsHeader: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    surahItem: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 0.5, borderBottomColor: colors.border,
    },
    surahNum: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
    surahNumText: { fontSize: 12, fontWeight: '700' },
    surahName: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.foreground, textAlign: 'right' },
    checkCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
    // Celebration overlay
    celebOverlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 999,
    },
    celebCard: {
      backgroundColor: '#fff', borderRadius: 28, padding: 40, alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 20,
    },
  });

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowNewModal(true)}>
          <IconSymbol name="plus" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.title}>📖 ختمات القرآن</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Stats */}
        <View style={[s.statsRow, { marginTop: 16 }]}>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats?.totalCompleted || 0}</Text>
            <Text style={s.statLabel}>ختمات مكتملة</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{current ? stats?.completedSurahs || 0 : 0}</Text>
            <Text style={s.statLabel}>سور مقروءة</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{current ? stats?.progressPercent || 0 : 0}%</Text>
            <Text style={s.statLabel}>التقدم</Text>
          </View>
        </View>

        {/* Current Khatm */}
        {current ? (
          <View style={s.progressCard}>
            <Text style={s.khatmName}>{current.name}</Text>
            <Text style={s.khatmDuration}>⏱ {getDurationText(current.startDate)}</Text>
            <View style={s.progressBarBg}>
              <View style={[s.progressBarFill, { width: `${stats?.progressPercent || 0}%` as any }]} />
            </View>
            <View style={s.progressRow}>
              <Text style={s.progressDetails}>
                {stats?.remainingSurahs} سورة متبقية
              </Text>
              <Text style={s.progressPct}>{stats?.progressPercent}%</Text>
            </View>
            <TouchableOpacity style={s.viewSurahsBtn} onPress={() => setShowSurahsModal(true)}>
              <Text style={s.viewSurahsBtnText}>📋 تحديث السور المقروءة</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.emptyCard}>
            <Text style={s.emptyEmoji}>📖</Text>
            <Text style={s.emptyTitle}>ابدأ ختمة جديدة</Text>
            <Text style={s.emptyText}>تتبّع رحلتك في قراءة القرآن الكريم وسجّل ختماتك</Text>
            <TouchableOpacity style={s.startBtn} onPress={() => setShowNewModal(true)}>
              <Text style={s.startBtnText}>+ ابدأ ختمة</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* History */}
        {allKhatm.filter(k => k.isCompleted).length > 0 && (
          <>
            <Text style={[s.sectionTitle, { marginTop: 16 }]}>الختمات المكتملة 🏆</Text>
            {allKhatm.filter(k => k.isCompleted).map(khatm => (
              <View key={khatm.id} style={s.historyItem}>
                <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(khatm.id)}>
                  <IconSymbol name="trash" size={18} color={colors.muted} />
                </TouchableOpacity>
                <View style={s.historyInfo}>
                  <Text style={s.historyName}>{khatm.name}</Text>
                  <Text style={s.historyDates}>
                    {new Date(khatm.startDate).toLocaleDateString('ar-EG')} — {khatm.endDate ? new Date(khatm.endDate).toLocaleDateString('ar-EG') : ''}
                    {'  •  '}{getDurationText(khatm.startDate, khatm.endDate)}
                  </Text>
                </View>
                <View style={s.completedBadge}>
                  <Text style={s.completedBadgeText}>✅ مكتملة</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* New Khatm Modal */}
      <Modal visible={showNewModal} transparent animationType="slide" onRequestClose={() => setShowNewModal(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowNewModal(false)}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>📖 ختمة جديدة</Text>
            <TextInput
              style={s.input}
              placeholder={`ختمة ${new Date().toLocaleDateString('ar-EG')}`}
              placeholderTextColor={colors.muted}
              value={newKhatmName}
              onChangeText={setNewKhatmName}
              returnKeyType="done"
              onSubmitEditing={handleStartKhatm}
            />
            <TouchableOpacity style={s.confirmBtn} onPress={handleStartKhatm} disabled={loading}>
              <Text style={s.confirmBtnText}>{loading ? 'جارٍ الحفظ...' : 'ابدأ الختمة'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Surahs Selection Modal */}
      <Modal visible={showSurahsModal} animationType="slide" onRequestClose={() => setShowSurahsModal(false)}>
        <View style={s.surahsModal}>
          <View style={s.surahsHeader}>
            <TouchableOpacity onPress={() => setShowSurahsModal(false)}>
              <IconSymbol name="xmark" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[s.title, { flex: 1 }]}>
              السور المقروءة ({current?.completedSurahs.length || 0}/114)
            </Text>
          </View>
          <FlatList
            data={Array.from({ length: 114 }, (_, i) => i + 1)}
            keyExtractor={item => item.toString()}
            renderItem={({ item: surahNum }) => {
              const isCompleted = current?.completedSurahs.includes(surahNum) || false;
              return (
                <TouchableOpacity
                  style={s.surahItem}
                  onPress={() => handleToggleSurah(surahNum)}
                  activeOpacity={0.7}
                >
                  <View style={[s.checkCircle, {
                    borderColor: isCompleted ? colors.primary : colors.border,
                    backgroundColor: isCompleted ? colors.primary : 'transparent',
                  }]}>
                    {isCompleted && <IconSymbol name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={s.surahName}>{SURAH_NAMES_AR[surahNum - 1]}</Text>
                  <View style={[s.surahNum, { backgroundColor: isCompleted ? colors.primary + '18' : colors.surface, borderWidth: 1, borderColor: colors.border }]}>
                    <Text style={[s.surahNumText, { color: isCompleted ? colors.primary : colors.muted }]}>{surahNum}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      {/* Celebration Overlay */}
      <Animated.View style={[s.celebOverlay, { opacity: celebAnim, pointerEvents: 'none' }]}>
        <View style={s.celebCard}>
          <Text style={{ fontSize: 72, marginBottom: 10 }}>🎉</Text>
          <Text style={{ fontSize: 22, fontWeight: '900', color: colors.primary, marginBottom: 8 }}>مبروك!</Text>
          <Text style={{ fontSize: 16, color: '#555', textAlign: 'center' }}>أتممت ختمة القرآن الكريم</Text>
          <Text style={{ fontSize: 24, marginTop: 12 }}>بارك الله فيك 🌟</Text>
        </View>
      </Animated.View>
    </ScreenContainer>
  );
}
