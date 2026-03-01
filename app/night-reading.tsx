/**
 * Night Reading Mode — وضع القراءة الليلي
 * شاشة قراءة مريحة للعينين مع تحكم كامل في الألوان والخط
 * يُفتح من شاشة القرآن عبر زر Night Mode
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Platform, Animated, Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchSurah, SurahDetail, SURAH_NAMES_AR } from '@/lib/quran-api';
import { IconSymbol } from '@/components/ui/icon-symbol';

const { width: W } = Dimensions.get('window');
const NIGHT_PREFS_KEY = '@night_reading_prefs';

// ─── Night Themes ─────────────────────────────────────────────────────────────
const NIGHT_THEMES = [
  { id: 'warm',    bg: '#1C1410', text: '#F5DEB3', accent: '#D4A853', name: 'دافئ' },
  { id: 'cool',    bg: '#0D1117', text: '#E6EDF3', accent: '#58A6FF', name: 'بارد' },
  { id: 'sepia',   bg: '#2C2015', text: '#F4E4C1', accent: '#C9A227', name: 'سيبيا' },
  { id: 'green',   bg: '#0A1F0A', text: '#C8E6C9', accent: '#4CAF50', name: 'أخضر' },
  { id: 'purple',  bg: '#110D1A', text: '#E8D5F5', accent: '#BB86FC', name: 'بنفسجي' },
  { id: 'classic', bg: '#000000', text: '#FFFFFF', accent: '#FFD700', name: 'كلاسيك' },
];

type NightTheme = typeof NIGHT_THEMES[0];

interface NightPrefs {
  themeId: string;
  fontSize: number;
  lineHeight: number;
  brightness: number; // overlay opacity 0-0.5
}

const DEFAULT_PREFS: NightPrefs = {
  themeId: 'warm',
  fontSize: 26,
  lineHeight: 1.8,
  brightness: 0,
};

export default function NightReadingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ surah?: string }>();
  const surahNum = params.surah ? Number(params.surah) : 1;

  const [prefs, setPrefs] = useState<NightPrefs>(DEFAULT_PREFS);
  const [surah, setSurah] = useState<SurahDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const controlsAnim = useRef(new Animated.Value(1)).current;
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>();

  const theme = NIGHT_THEMES.find(t => t.id === prefs.themeId) || NIGHT_THEMES[0];

  // Load prefs
  useEffect(() => {
    AsyncStorage.getItem(NIGHT_PREFS_KEY).then(v => {
      if (v) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(v) });
    });
  }, []);

  // Save prefs
  const savePrefs = useCallback((update: Partial<NightPrefs>) => {
    setPrefs(prev => {
      const next = { ...prev, ...update };
      AsyncStorage.setItem(NIGHT_PREFS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Load surah
  useEffect(() => {
    setLoading(true);
    fetchSurah(surahNum)
      .then(setSurah)
      .catch(() => setSurah(null))
      .finally(() => setLoading(false));
  }, [surahNum]);

  // Auto-hide controls
  const showControlsTemp = useCallback(() => {
    setShowControls(true);
    Animated.timing(controlsAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      Animated.timing(controlsAnim, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
        setShowControls(false);
      });
    }, 4000);
  }, [controlsAnim]);

  useEffect(() => {
    showControlsTemp();
    return () => { if (hideTimeout.current) clearTimeout(hideTimeout.current); };
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      {/* Brightness overlay */}
      {prefs.brightness > 0 && (
        <View style={[styles.brightnessOverlay, { opacity: prefs.brightness }]} pointerEvents="none" />
      )}

      {/* Top Bar */}
      <Animated.View style={[styles.topBar, { backgroundColor: theme.bg + 'EE', opacity: controlsAnim }]}>
        <TouchableOpacity style={styles.topBtn} onPress={() => router.back()}>
          <IconSymbol name="xmark" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: theme.text }]}>
          🌙 {SURAH_NAMES_AR[surahNum - 1] || `سورة ${surahNum}`}
        </Text>
        <TouchableOpacity
          style={[styles.topBtn, { backgroundColor: theme.accent + '30' }]}
          onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowThemePicker(v => !v); }}
        >
          <IconSymbol name="paintbrush.fill" size={18} color={theme.accent} />
        </TouchableOpacity>
      </Animated.View>

      {/* Theme Picker */}
      {showThemePicker && (
        <Animated.View style={[styles.themePicker, { backgroundColor: theme.bg + 'F5', borderColor: theme.accent + '40', opacity: controlsAnim }]}>
          <Text style={[styles.themePickerTitle, { color: theme.accent }]}>اختر الثيم</Text>
          <View style={styles.themeRow}>
            {NIGHT_THEMES.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[styles.themeCircle, { backgroundColor: t.bg, borderColor: prefs.themeId === t.id ? t.accent : 'transparent' }]}
                onPress={() => { savePrefs({ themeId: t.id }); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}
              >
                {prefs.themeId === t.id && <Text style={{ fontSize: 12 }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.themeName, { color: theme.text }]}>{theme.name}</Text>
        </Animated.View>
      )}

      {/* Main content — tappable to show/hide controls */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={showControlsTemp}
      >
        <TouchableOpacity activeOpacity={1} onPress={showControlsTemp}>
          {/* Bismillah */}
          {surahNum !== 9 && (
            <Text style={[styles.bismillah, { color: theme.accent, fontSize: prefs.fontSize - 2 }]}>
              بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
            </Text>
          )}

          {loading ? (
            <Text style={[styles.loadingText, { color: theme.text }]}>جارٍ التحميل...</Text>
          ) : surah ? (
            surah.ayahs.map(ayah => (
              <View key={ayah.number} style={styles.ayahWrap}>
                <Text style={[
                  styles.ayahText,
                  {
                    color: theme.text,
                    fontSize: prefs.fontSize,
                    lineHeight: prefs.fontSize * prefs.lineHeight,
                  }
                ]}>
                  {ayah.text}{' '}
                  <Text style={[styles.ayahNum, { color: theme.accent }]}>
                    ﴿{ayah.numberInSurah}﴾
                  </Text>
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.loadingText, { color: theme.text }]}>تعذر التحميل</Text>
          )}

          <View style={{ height: 120 }} />
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Controls */}
      <Animated.View style={[styles.bottomBar, { backgroundColor: theme.bg + 'F5', borderTopColor: theme.accent + '30', opacity: controlsAnim }]}>
        {/* Font size */}
        <View style={styles.controlGroup}>
          <Text style={[styles.controlLabel, { color: theme.text }]}>الخط</Text>
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={[styles.ctrlBtn, { borderColor: theme.accent + '50' }]}
              onPress={() => { savePrefs({ fontSize: Math.max(18, prefs.fontSize - 2) }); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}
            >
              <Text style={[styles.ctrlBtnText, { color: theme.accent }]}>أ-</Text>
            </TouchableOpacity>
            <Text style={[styles.controlVal, { color: theme.accent }]}>{prefs.fontSize}</Text>
            <TouchableOpacity
              style={[styles.ctrlBtn, { borderColor: theme.accent + '50' }]}
              onPress={() => { savePrefs({ fontSize: Math.min(40, prefs.fontSize + 2) }); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}
            >
              <Text style={[styles.ctrlBtnText, { color: theme.accent }]}>أ+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Line height */}
        <View style={styles.controlGroup}>
          <Text style={[styles.controlLabel, { color: theme.text }]}>التباعد</Text>
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={[styles.ctrlBtn, { borderColor: theme.accent + '50' }]}
              onPress={() => savePrefs({ lineHeight: Math.max(1.4, +(prefs.lineHeight - 0.1).toFixed(1)) })}
            >
              <Text style={[styles.ctrlBtnText, { color: theme.accent }]}>≡-</Text>
            </TouchableOpacity>
            <Text style={[styles.controlVal, { color: theme.accent }]}>{prefs.lineHeight.toFixed(1)}</Text>
            <TouchableOpacity
              style={[styles.ctrlBtn, { borderColor: theme.accent + '50' }]}
              onPress={() => savePrefs({ lineHeight: Math.min(2.8, +(prefs.lineHeight + 0.1).toFixed(1)) })}
            >
              <Text style={[styles.ctrlBtnText, { color: theme.accent }]}>≡+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Brightness */}
        <View style={styles.controlGroup}>
          <Text style={[styles.controlLabel, { color: theme.text }]}>التعتيم</Text>
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={[styles.ctrlBtn, { borderColor: theme.accent + '50' }]}
              onPress={() => savePrefs({ brightness: Math.max(0, +(prefs.brightness - 0.05).toFixed(2)) })}
            >
              <IconSymbol name="sun.max.fill" size={14} color={theme.accent} />
            </TouchableOpacity>
            <Text style={[styles.controlVal, { color: theme.accent }]}>{Math.round(prefs.brightness * 100)}%</Text>
            <TouchableOpacity
              style={[styles.ctrlBtn, { borderColor: theme.accent + '50' }]}
              onPress={() => savePrefs({ brightness: Math.min(0.5, +(prefs.brightness + 0.05).toFixed(2)) })}
            >
              <IconSymbol name="moon.fill" size={14} color={theme.accent} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  brightnessOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 5 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16, paddingBottom: 12,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)',
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
  },
  topBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800' },
  themePicker: {
    position: 'absolute', top: Platform.OS === 'ios' ? 104 : 70, right: 12,
    zIndex: 20, borderRadius: 16, padding: 16, borderWidth: 1,
    alignItems: 'center', minWidth: 200,
  },
  themePickerTitle: { fontSize: 13, fontWeight: '700', marginBottom: 12 },
  themeRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  themeCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  themeName: { fontSize: 12, fontWeight: '600' },
  scrollContent: { paddingTop: Platform.OS === 'ios' ? 100 : 80, paddingHorizontal: 20 },
  bismillah: { textAlign: 'center', fontWeight: '700', marginBottom: 24, marginTop: 8 },
  loadingText: { textAlign: 'center', marginTop: 40, fontSize: 16 },
  ayahWrap: { marginBottom: 12 },
  ayahText: { textAlign: 'right', fontWeight: '400' },
  ayahNum: { fontWeight: '700' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', paddingHorizontal: 12,
    paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    justifyContent: 'space-around', zIndex: 10,
  },
  controlGroup: { alignItems: 'center', gap: 4 },
  controlLabel: { fontSize: 11, fontWeight: '700' },
  controlRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctrlBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  ctrlBtnText: { fontSize: 13, fontWeight: '800' },
  controlVal: { fontSize: 13, fontWeight: '700', minWidth: 28, textAlign: 'center' },
});
