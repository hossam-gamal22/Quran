import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getLastRead, LastRead } from '@/lib/storage';
import { fetchPrayerTimesByCoords, getNextPrayer, getTimeUntilPrayer, PrayerTimesData } from '@/lib/prayer-api';
import { getPrayerLocation, savePrayerLocation } from '@/lib/storage';
import * as Location from 'expo-location';

const DAILY_VERSES = [
  { arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', translation: 'Indeed, with hardship comes ease.', surah: 'الشرح', ayah: 6 },
  { arabic: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ', translation: 'And whoever relies upon Allah – then He is sufficient for him.', surah: 'الطلاق', ayah: 3 },
  { arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ', translation: 'So remember Me; I will remember you.', surah: 'البقرة', ayah: 152 },
  { arabic: 'وَاللَّهُ يُحِبُّ الصَّابِرِينَ', translation: 'And Allah loves the steadfast.', surah: 'آل عمران', ayah: 146 },
  { arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', translation: 'Indeed, Allah is with the patient.', surah: 'البقرة', ayah: 153 },
  { arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً', translation: 'Our Lord, give us in this world good and in the Hereafter good.', surah: 'البقرة', ayah: 201 },
  { arabic: 'وَقُل رَّبِّ زِدْنِي عِلْمًا', translation: 'And say: My Lord, increase me in knowledge.', surah: 'طه', ayah: 114 },
];

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const [lastRead, setLastReadState] = useState<LastRead | null>(null);
  const [prayerData, setPrayerData] = useState<PrayerTimesData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cityName, setCityName] = useState('مكة المكرمة');
  const [dailyVerse] = useState(() => DAILY_VERSES[new Date().getDate() % DAILY_VERSES.length]);

  const loadData = useCallback(async () => {
    // Load last read
    try {
      const lr = await getLastRead();
      setLastReadState(lr);
    } catch {}

    // Load prayer times
    try {
      let location = await getPrayerLocation();
      
      if (!location && Platform.OS !== 'web') {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
            location = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            await savePrayerLocation(location);
            try {
              const geocode = await Location.reverseGeocodeAsync(loc.coords);
              if (geocode.length > 0) setCityName(geocode[0].city || geocode[0].region || 'مكة المكرمة');
            } catch {}
          }
        } catch {}
      }
      
      if (!location) {
        location = { latitude: 21.3891, longitude: 39.8579 };
      }
      
      if (location) {
        try {
          const data = await fetchPrayerTimesByCoords(location.latitude, location.longitude);
          setPrayerData(data);
        } catch {}
      }
    } catch {}
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 5000); // Max 5 seconds loading
    loadData();
    return () => clearTimeout(timer);
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const nextPrayer = prayerData ? getNextPrayer(prayerData.timings) : null;
  const timeUntil = nextPrayer ? getTimeUntilPrayer(nextPrayer.time) : null;
  const hijriDate = prayerData?.date?.hijri;
  const hijriStr = hijriDate ? `${hijriDate.day} ${hijriDate.month.ar} ${hijriDate.year} هـ` : null;

  const styles = StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { fontSize: 24, color: colors.primary, marginBottom: 16, fontWeight: '600' },
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    bismillah: { fontSize: 28, color: colors.primary, textAlign: 'center', fontWeight: '600' },
    hijriDate: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 4 },
    cityDate: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 2 },
    section: { paddingHorizontal: 20, marginTop: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground, textAlign: 'right', marginBottom: 12 },
    lastReadCard: { backgroundColor: colors.primary, borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    lastReadTitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'right' },
    lastReadSurah: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'right', marginTop: 4 },
    lastReadAyah: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'right', marginTop: 2 },
    continueBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
    continueBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    verseCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, borderLeftColor: colors.gold || '#D4AF37' },
    verseArabic: { fontSize: 22, color: colors.foreground, textAlign: 'right', lineHeight: 42, fontWeight: '500' },
    verseTranslation: { fontSize: 14, color: colors.muted, textAlign: 'left', marginTop: 10, lineHeight: 20, fontStyle: 'italic' },
    verseRef: { fontSize: 12, color: colors.primary, textAlign: 'right', marginTop: 8, fontWeight: '600' },
    prayerCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
    prayerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    nextPrayerName: { fontSize: 22, fontWeight: '700', color: colors.primary },
    nextPrayerTime: { fontSize: 16, color: colors.foreground, marginTop: 2 },
    countdownLabel: { fontSize: 12, color: colors.muted, textAlign: 'right' },
    countdown: { fontSize: 20, fontWeight: '700', color: colors.foreground, textAlign: 'right' },
    quickAccessGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    quickBtn: { flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    quickBtnText: { fontSize: 13, fontWeight: '600', color: colors.foreground, marginTop: 8 },
  });

  if (isLoading) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</Text>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View style={styles.header}>
          <Text style={styles.bismillah}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</Text>
          {hijriStr && <Text style={styles.hijriDate}>{hijriStr}</Text>}
          <Text style={styles.cityDate}>{cityName}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>آخر قراءة</Text>
          <TouchableOpacity
            style={styles.lastReadCard}
            onPress={() => router.push(lastRead ? { pathname: '/surah/[id]', params: { id: lastRead.surahNumber } } : '/(tabs)/quran' as any)}
            activeOpacity={0.85}
          >
            <View style={styles.continueBtn}>
              <Text style={styles.continueBtnText}>{lastRead ? 'متابعة' : 'ابدأ'}</Text>
            </View>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.lastReadTitle}>{lastRead ? 'استمر في القراءة' : 'ابدأ رحلتك مع القرآن'}</Text>
              <Text style={styles.lastReadSurah}>{lastRead?.surahName || 'الفاتحة'}</Text>
              <Text style={styles.lastReadAyah}>{lastRead ? `الآية ${lastRead.ayahNumber}` : '7 آيات'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {nextPrayer && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>أوقات الصلاة</Text>
            <TouchableOpacity style={styles.prayerCard} onPress={() => router.push('/(tabs)/prayer' as any)} activeOpacity={0.85}>
              <View style={styles.prayerRow}>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.countdownLabel}>الوقت المتبقي</Text>
                  <Text style={styles.countdown}>{timeUntil}</Text>
                </View>
                <View>
                  <Text style={styles.nextPrayerName}>{nextPrayer.arabicName}</Text>
                  <Text style={styles.nextPrayerTime}>{nextPrayer.time}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>آية اليوم</Text>
          <View style={styles.verseCard}>
            <Text style={styles.verseArabic}>{dailyVerse.arabic}</Text>
            <Text style={styles.verseTranslation}>{dailyVerse.translation}</Text>
            <Text style={styles.verseRef}>سورة {dailyVerse.surah} - آية {dailyVerse.ayah}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>وصول سريع</Text>
          <View style={styles.quickAccessGrid}>
            <TouchableOpacity style={styles.quickBtn} onPress={() => router.push('/(tabs)/quran' as any)}>
              <IconSymbol name="book.fill" size={28} color={colors.primary} />
              <Text style={styles.quickBtnText}>السور</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={() => router.push('/(tabs)/prayer' as any)}>
              <IconSymbol name="clock.fill" size={28} color={colors.primary} />
              <Text style={styles.quickBtnText}>الصلاة</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={() => router.push('/(tabs)/qibla' as any)}>
              <IconSymbol name="location.north.fill" size={28} color={colors.primary} />
              <Text style={styles.quickBtnText}>القبلة</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={() => router.push('/(tabs)/settings' as any)}>
              <IconSymbol name="gearshape.fill" size={28} color={colors.primary} />
              <Text style={styles.quickBtnText}>الإعدادات</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
