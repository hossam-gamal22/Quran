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
import { getSurahName } from '@/lib/quran-api';
import { t, getDateLocale } from '@/lib/i18n';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useIsRTL } from '@/hooks/use-is-rtl';
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


export default function KhatmScreen() {
  const colors = useColors();
  const isRTL = useIsRTL();
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
    Alert.alert(t('khatma.delete'), t('khatma.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => { await deleteKhatm(khatmId); loadData(); } },
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
      borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)',
    },
    khatmName: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4 },
    khatmDuration: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 16 },
    progressBarBg: { height: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 5, marginBottom: 10 },
    progressBarFill: { height: 10, borderRadius: 5, backgroundColor: '#fff' },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
    progressPct: { fontSize: 24, fontWeight: '900', color: '#fff' },
    progressDetails: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: isRTL ? 'right' : 'left' },
    viewSurahsBtn: {
      marginTop: 14, backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 16, paddingVertical: 10, alignItems: 'center',
    },
    viewSurahsBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    // Stats row
    statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 16 },
    statCard: {
      flex: 1, backgroundColor: 'rgba(120,120,128,0.12)', borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: colors.border, alignItems: 'center',
    },
    statNum: { fontSize: 26, fontWeight: '900', color: colors.primary },
    statLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
    // Empty state
    emptyCard: {
      margin: 16, backgroundColor: 'rgba(120,120,128,0.12)', borderRadius: 20, padding: 32,
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
    sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.foreground, paddingHorizontal: 16, marginBottom: 8 },
    historyItem: {
      marginHorizontal: 16, marginBottom: 10, backgroundColor: 'rgba(120,120,128,0.12)',
      borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border,
      flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    historyInfo: { flex: 1 },
    historyName: { fontSize: 15, fontWeight: '700', color: colors.foreground, textAlign: isRTL ? 'right' : 'left' },
    historyDates: { fontSize: 12, color: colors.muted, marginTop: 3 },
    completedBadge: {
      backgroundColor: colors.primary + '18', borderRadius: 20,
      paddingHorizontal: 10, paddingVertical: 4,
    },
    completedBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primary },
    deleteBtn: { padding: 6 },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
    modalHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: colors.foreground, textAlign: isRTL ? 'right' : 'left', marginBottom: 16 },
    input: {
      backgroundColor: 'rgba(120,120,128,0.12)', borderWidth: 1, borderColor: colors.border,
      borderRadius: 14, padding: 14, fontSize: 16, color: colors.foreground,
      textAlign: isRTL ? 'right' : 'left', marginBottom: 16,
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
      flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 0.5, borderBottomColor: colors.border, gap: 12,
    },
    surahNum: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    surahNumText: { fontSize: 12, fontWeight: '700' },
    surahName: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.foreground, textAlign: isRTL ? 'right' : 'left' },
    checkCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
    // Celebration overlay
    celebOverlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 999,
    },
    celebCard: {
      backgroundColor: 'rgba(30,30,30,0.95)', borderRadius: 28, padding: 40, alignItems: 'center',
      borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)',
    },
  });

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right', 'bottom']} screenKey="khatma">
      {/* Header */}
      <View style={[s.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowNewModal(true)}>
          <IconSymbol name="plus" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.title}>{t('khatma.title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Stats */}
        <View style={[s.statsRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 16 }]}>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats?.totalCompleted || 0}</Text>
            <Text style={s.statLabel}>{t('khatma.completedKhatmas')}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{current ? stats?.completedSurahs || 0 : 0}</Text>
            <Text style={s.statLabel}>{t('khatma.markAsRead')}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{current ? stats?.progressPercent || 0 : 0}%</Text>
            <Text style={s.statLabel}>{t('khatma.progress')}</Text>
          </View>
        </View>

        {/* Current Khatm */}
        {current ? (
          <View style={s.progressCard}>
            <Text style={[s.khatmName, { textAlign: isRTL ? 'right' : 'left' }]}>{current.name}</Text>
            <Text style={[s.khatmDuration, { textAlign: isRTL ? 'right' : 'left' }]}>⏱ {getDurationText(current.startDate)}</Text>
            <View style={[s.progressBarBg, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[s.progressBarFill, { width: `${stats?.progressPercent || 0}%` as any }]} />
            </View>
            <View style={[s.progressRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[s.progressDetails, { textAlign: isRTL ? 'right' : 'left' }]}>
                {stats?.remainingSurahs} {t('quran.surah')} {t('khatma.pagesRemaining').split(' ')[0]}
              </Text>
              <Text style={s.progressPct}>{stats?.progressPercent}%</Text>
            </View>
            <TouchableOpacity style={s.viewSurahsBtn} onPress={() => setShowSurahsModal(true)}>
              <Text style={s.viewSurahsBtnText}>{t('khatma.updateProgress')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.emptyCard}>
            <Text style={s.emptyEmoji}></Text>
            <Text style={s.emptyTitle}>{t('khatma.newKhatma')}</Text>
            <Text style={s.emptyText}>{t('khatma.khatmaCreatedMsg')}</Text>
            <TouchableOpacity style={s.startBtn} onPress={() => setShowNewModal(true)}>
              <Text style={s.startBtnText}>+ {t('khatma.startKhatma')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* History */}
        {allKhatm.filter(k => k.isCompleted).length > 0 && (
          <>
            <Text style={[s.sectionTitle, { marginTop: 16, textAlign: isRTL ? 'right' : 'left' }]}>{t('khatma.completedKhatmas')}</Text>
            {allKhatm.filter(k => k.isCompleted).map(khatm => (
              <View key={khatm.id} style={[s.historyItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(khatm.id)}>
                  <IconSymbol name="trash" size={18} color={colors.muted} />
                </TouchableOpacity>
                <View style={s.historyInfo}>
                  <Text style={s.historyName}>{khatm.name}</Text>
                  <Text style={[s.historyDates, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {new Date(khatm.startDate).toLocaleDateString(getDateLocale())} — {khatm.endDate ? new Date(khatm.endDate).toLocaleDateString(getDateLocale()) : ''}
                    {'  •  '}{getDurationText(khatm.startDate, khatm.endDate)}
                  </Text>
                </View>
                <View style={s.completedBadge}>
                  <Text style={s.completedBadgeText}>{t('khatma.completed')}</Text>
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
            <Text style={s.modalTitle}>{t('khatma.newKhatma')}</Text>
            <TextInput
              style={s.input}
              placeholder={`${t('khatma.defaultName')} ${new Date().toLocaleDateString(getDateLocale())}`}
              placeholderTextColor={colors.muted}
              value={newKhatmName}
              onChangeText={setNewKhatmName}
              returnKeyType="done"
              onSubmitEditing={handleStartKhatm}
            />
            <TouchableOpacity style={s.confirmBtn} onPress={handleStartKhatm} disabled={loading}>
              <Text style={s.confirmBtnText}>{loading ? t('khatma.creating') : t('khatma.startKhatma')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Surahs Selection Modal */}
      <Modal visible={showSurahsModal} animationType="slide" onRequestClose={() => setShowSurahsModal(false)}>
        <View style={s.surahsModal}>
          <View style={[s.surahsHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity onPress={() => setShowSurahsModal(false)}>
              <IconSymbol name="xmark" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[s.title, { flex: 1 }]}>
              {t('khatma.markAsRead')} ({current?.completedSurahs.length || 0}/114)
            </Text>
          </View>
          <FlatList
            data={Array.from({ length: 114 }, (_, i) => i + 1)}
            keyExtractor={item => item.toString()}
            renderItem={({ item: surahNum }) => {
              const isCompleted = current?.completedSurahs.includes(surahNum) || false;
              return (
                <TouchableOpacity
                  style={[s.surahItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => handleToggleSurah(surahNum)}
                  activeOpacity={0.7}
                >
                  <View style={[s.checkCircle, {
                    borderColor: isCompleted ? colors.primary : colors.border,
                    backgroundColor: isCompleted ? colors.primary : 'transparent',
                  }]}>
                    {isCompleted && <IconSymbol name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={s.surahName}>{getSurahName(surahNum)}</Text>
                  <View style={[s.surahNum, { backgroundColor: isCompleted ? colors.primary + '18' : 'rgba(120,120,128,0.12)', borderWidth: 1, borderColor: colors.border }]}>
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
          <Text style={{ fontSize: 72, marginBottom: 10 }}></Text>
          <Text style={{ fontSize: 22, fontWeight: '900', color: colors.primary, marginBottom: 8 }}>{t('khatma.congratulations')}</Text>
          <Text style={{ fontSize: 16, color: '#555', textAlign: 'center' }}>{t('khatma.khatmaCompleted')}</Text>
          <Text style={{ fontSize: 24, marginTop: 12 }}>{t('khatma.barakAllah')}</Text>
        </View>
      </Animated.View>
    </ScreenContainer>
  );
}
