/**
 * Tasbih (Digital Counter) Screen
 * شاشة التسبيح الرقمي
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Vibration,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SW } = Dimensions.get('window');

// ─── Adhkar List ─────────────────────────────────────────────────────────────
const ADHKAR = [
  { id: 'subhanallah',  text: 'سُبْحَانَ اللَّهِ',            target: 33,  color: '#1B6B3A', meaning: 'Glory be to Allah' },
  { id: 'alhamdulillah',text: 'الْحَمْدُ لِلَّهِ',            target: 33,  color: '#2563EB', meaning: 'All praise is due to Allah' },
  { id: 'allahuakbar',  text: 'اللَّهُ أَكْبَرُ',             target: 34,  color: '#7C3AED', meaning: 'Allah is the Greatest' },
  { id: 'lailahaillallah', text: 'لَا إِلَهَ إِلَّا اللَّهُ', target: 100, color: '#B45309', meaning: 'There is no god but Allah' },
  { id: 'astaghfirullah', text: 'أَسْتَغْفِرُ اللَّهَ',       target: 100, color: '#DC2626', meaning: 'I seek forgiveness from Allah' },
  { id: 'salawat', text: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',  target: 100, color: '#D97706', meaning: 'O Allah, bless Muhammad' },
  { id: 'hasbunallah', text: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ', target: 100, color: '#059669', meaning: 'Allah is sufficient for us' },
  { id: 'custom', text: 'مخصص', target: 100, color: '#6B7280', meaning: 'Custom dhikr' },
];

const STORAGE_KEY = '@tasbih_counts';

interface TasbihState {
  [id: string]: number;
}

export default function TasbihScreen() {
  const colors = useColors();
  const [counts, setCounts] = useState<TasbihState>({});
  const [selectedId, setSelectedId] = useState('subhanallah');
  const [showSelector, setShowSelector] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const selected = ADHKAR.find(a => a.id === selectedId) || ADHKAR[0];
  const currentCount = counts[selectedId] || 0;
  const progress = Math.min(currentCount / selected.target, 1);
  const rounds = Math.floor(currentCount / selected.target);

  // Load saved counts
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(data => {
      if (data) setCounts(JSON.parse(data));
    });
  }, []);

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const saveCounts = useCallback((newCounts: TasbihState) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newCounts));
  }, []);

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Button tap animation
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }),
    ]).start();

    setCounts(prev => {
      const newCount = (prev[selectedId] || 0) + 1;
      const newCounts = { ...prev, [selectedId]: newCount };
      saveCounts(newCounts);

      // Check if target reached
      if (newCount === selected.target || newCount % selected.target === 0) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        // Celebration animation
        Animated.sequence([
          Animated.timing(celebrationAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(1500),
          Animated.timing(celebrationAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
      }
      return newCounts;
    });
  }, [selectedId, selected, scaleAnim, celebrationAnim, saveCounts]);

  const handleReset = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    setCounts(prev => {
      const newCounts = { ...prev, [selectedId]: 0 };
      saveCounts(newCounts);
      return newCounts;
    });
  }, [selectedId, saveCounts]);

  const handleResetAll = useCallback(() => {
    setCounts({});
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({}));
  }, []);

  // Draw progress circle
  const circleSize = SW * 0.72;
  const strokeWidth = 12;
  const radius = (circleSize - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference - progress * circumference;

  const s = StyleSheet.create({
    header: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
      paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    title: { flex: 1, textAlign: 'center', fontSize: 22, fontWeight: '800', color: colors.foreground },
    iconBtn: { padding: 8, borderRadius: 20, backgroundColor: colors.surface },
    // Circle area
    circleArea: { alignItems: 'center', paddingTop: 24, paddingBottom: 16 },
    svgWrap: { position: 'relative', width: circleSize, height: circleSize },
    // Main count button
    countBtn: {
      position: 'absolute',
      top: strokeWidth + 20, left: strokeWidth + 20,
      right: strokeWidth + 20, bottom: strokeWidth + 20,
      borderRadius: 1000, justifyContent: 'center', alignItems: 'center',
      backgroundColor: selected.color + '12',
      borderWidth: 1, borderColor: selected.color + '25',
    },
    dhikrText: { fontSize: 22, fontWeight: '800', color: selected.color, textAlign: 'center', lineHeight: 36, paddingHorizontal: 16 },
    countNum: { fontSize: 56, fontWeight: '900', color: selected.color, lineHeight: 60 },
    targetText: { fontSize: 14, color: colors.muted, marginTop: 4 },
    roundsBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: selected.color + '15', borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 6, marginTop: 10,
    },
    roundsText: { color: selected.color, fontWeight: '700', fontSize: 14 },
    // Tap button
    tapBtn: {
      width: SW * 0.62, height: SW * 0.62 * 0.28,
      borderRadius: 28, justifyContent: 'center', alignItems: 'center',
      marginHorizontal: 20, marginBottom: 16,
      shadowColor: selected.color, shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35, shadowRadius: 12, elevation: 10,
    },
    tapBtnText: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 1 },
    // Bottom row
    bottomRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 16 },
    resetBtn: {
      flex: 1, paddingVertical: 14, borderRadius: 18,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
    },
    resetBtnText: { fontSize: 15, fontWeight: '700', color: colors.muted },
    changeBtn: {
      flex: 1, paddingVertical: 14, borderRadius: 18,
      backgroundColor: selected.color, alignItems: 'center',
      flexDirection: 'row', justifyContent: 'center', gap: 8,
    },
    changeBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    // Celebration
    celebration: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: selected.color + '20', borderRadius: 1000,
      justifyContent: 'center', alignItems: 'center',
    },
    celebrationText: { fontSize: 36 },
    // Selector sheet
    selectorOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    selectorSheet: {
      backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingBottom: 40,
    },
    selectorHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10 },
    selectorHeader: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    selectorTitle: { fontSize: 18, fontWeight: '800', color: colors.foreground, textAlign: 'right' },
    dhikrItem: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: 0.5, borderBottomColor: colors.border,
    },
    dhikrItemText: { flex: 1, fontSize: 18, color: colors.foreground, textAlign: 'right', fontWeight: '700' },
    dhikrItemSub: { fontSize: 12, color: colors.muted, textAlign: 'right' },
    dhikrColorDot: { width: 12, height: 12, borderRadius: 6, marginLeft: 12 },
    checkmark: { marginLeft: 8 },
    statsRow: {
      flexDirection: 'row', paddingHorizontal: 20, gap: 12,
      marginTop: 4, marginBottom: 8,
    },
    statCard: {
      flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: colors.border, alignItems: 'center',
    },
    statNum: { fontSize: 22, fontWeight: '900', color: selected.color },
    statLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  });

  const totalToday = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={handleResetAll}>
          <IconSymbol name="arrow.counterclockwise" size={20} color={colors.muted} />
        </TouchableOpacity>
        <Text style={s.title}>📿 التسبيح</Text>
        <TouchableOpacity style={s.iconBtn} onPress={() => setShowSelector(true)}>
          <IconSymbol name="list.bullet" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Stats Row */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNum}>{totalToday}</Text>
            <Text style={s.statLabel}>إجمالي اليوم</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{rounds}</Text>
            <Text style={s.statLabel}>عدد الأدوار</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{selected.target - (currentCount % selected.target)}</Text>
            <Text style={s.statLabel}>متبقي للدور</Text>
          </View>
        </View>

        {/* Circle Progress */}
        <View style={s.circleArea}>
          <View style={s.svgWrap}>
            {/* SVG Progress Circle (using View-based arc) */}
            <Animated.View style={[s.countBtn, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={s.dhikrText}>{selected.text}</Text>
              <Text style={s.countNum}>{currentCount}</Text>
              <Text style={s.targetText}>الهدف: {selected.target}</Text>
              {rounds > 0 && (
                <View style={s.roundsBadge}>
                  <Text style={s.roundsText}>🔄 {rounds} × {selected.target}</Text>
                </View>
              )}
              {/* Celebration overlay */}
              <Animated.View style={[s.celebration, { opacity: celebrationAnim }]}>
                <Text style={s.celebrationText}>🎉</Text>
              </Animated.View>
            </Animated.View>
          </View>
        </View>

        {/* Main Tap Button */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
          <TouchableOpacity
            style={[s.tapBtn, { backgroundColor: selected.color }]}
            onPress={handlePress}
            activeOpacity={0.85}
          >
            <Text style={s.tapBtnText}>اضغط للتسبيح</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Bottom Buttons */}
        <View style={s.bottomRow}>
          <TouchableOpacity style={s.resetBtn} onPress={handleReset} activeOpacity={0.7}>
            <IconSymbol name="arrow.counterclockwise" size={18} color={colors.muted} />
            <Text style={s.resetBtnText}>إعادة تعيين</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.changeBtn} onPress={() => setShowSelector(true)} activeOpacity={0.8}>
            <IconSymbol name="square.grid.2x2" size={18} color="#fff" />
            <Text style={s.changeBtnText}>تغيير الذكر</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Dhikr Selector */}
      <Modal visible={showSelector} transparent animationType="slide" onRequestClose={() => setShowSelector(false)}>
        <TouchableOpacity style={s.selectorOverlay} activeOpacity={1} onPress={() => setShowSelector(false)}>
          <View style={s.selectorSheet}>
            <View style={s.selectorHandle} />
            <View style={s.selectorHeader}>
              <Text style={s.selectorTitle}>اختر الذكر</Text>
            </View>
            <ScrollView>
              {ADHKAR.map(dhikr => (
                <TouchableOpacity
                  key={dhikr.id}
                  style={s.dhikrItem}
                  onPress={() => { setSelectedId(dhikr.id); setShowSelector(false); }}
                  activeOpacity={0.7}
                >
                  {selectedId === dhikr.id && (
                    <IconSymbol name="checkmark" size={18} color={dhikr.color} style={s.checkmark} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[s.dhikrItemText, { color: dhikr.color }]}>{dhikr.text}</Text>
                    <Text style={s.dhikrItemSub}>الهدف: {dhikr.target} • {dhikr.meaning}</Text>
                  </View>
                  <View style={[s.dhikrColorDot, { backgroundColor: dhikr.color }]} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>
  );
}
