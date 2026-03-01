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

// Daily verses (static for offline use) - expanded list
const DAILY_VERSES = [
  { arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', translation: 'Indeed, with hardship comes ease.', surah: 'الشرح', ayah: 6 },
  { arabic: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ', translation: 'And whoever relies upon Allah – then He is sufficient for him.', surah: 'الطلاق', ayah: 3 },
  { arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ', translation: 'So remember Me; I will remember you.', surah: 'البقرة', ayah: 152 },
  { arabic: 'وَاللَّهُ يُحِبُّ الصَّابِرِينَ', translation: 'And Allah loves the steadfast.', surah: 'آل عمران', ayah: 146 },
  { arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', translation: 'Indeed, Allah is with the patient.', surah: 'البقرة', ayah: 153 },
  { arabic: 'وَلَا تَيْأَسُوا مِن رَّوْحِ اللَّهِ', translation: 'And do not despair of relief from Allah.', surah: 'يوسف', ayah: 87 },
  { arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً', translation: 'Our Lord, give us in this world good and in the Hereafter good.', surah: 'البقرة', ayah: 201 },
  { arabic: 'وَقُل رَّبِّ زِدْنِي عِلْمًا', translation: 'And say: My Lord, increase me in knowledge.', surah: 'طه', ayah: 114 },
  { arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ', translation: 'Allah is sufficient for us, and He is the best trustee.', surah: 'آل عمران', ayah: 173 },
  { arabic: 'وَاصْبِرْ وَمَا صَبْرُكَ إِلَّا بِاللَّهِ', translation: 'And be patient, and your patience is not but through Allah.', surah: 'النحل', ayah: 127 },
  { arabic: 'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ', translation: 'And He is with you wherever you are.', surah: 'الحديد', ayah: 4 },
  { arabic: 'وَأَنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ', translation: 'Allah does not waste the reward of those who do good.', surah: 'التوبة', ayah: 120 },
  { arabic: 'إِنَّ اللَّهَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ', translation: 'Indeed, Allah is over all things competent.', surah: 'البقرة', ayah: 20 },
  { arabic: 'وَبَشِّرِ الصَّابِرِينَ', translation: 'And give good tidings to the patient.', surah: 'البقرة', ayah: 155 },
];

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const [lastRead, setLastReadState] = useState<LastRead | null>(null);
  const [prayerData, setPrayerData] = useState<PrayerTimesData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cityName, setCityName] = useState('');
  const [dailyVerse] = useState(() => {
    const dayIndex = new Date().getDate() % DAILY_VERSES.length;
    return DAILY_VERSES[dayIndex];
  });

  const loadData = useCallback(async () => {
    // Load last read with error handling
    try {
      const lr = await getLastRead();
      setLastReadState(lr);
    } catch (e) {
      // Error loading last read - continue without it
    }

    // Load prayer times with timeout and error handling
    try {
      let location = await getPrayerLocation();
      
      // Try to get location if not saved
      if (!location && Platform.OS !== 'web') {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            // Add timeout for location request (5 seconds)
            const locationPromise = Location.getCurrentPositionAsync({ 
              accuracy: Location.Accuracy.Low 
            });
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Location timeout')), 5000)
            );
            
            try {
              const loc = await Promise.race([locationPromise, timeoutPromise]) as Location.LocationObject;
              location = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
              await savePrayerLocation(location);
              
              // Try to get city name
              try {
                const geocode = await Location.reverseGeocodeAsync({ 
                  latitude: loc.coords.latitude, 
                  longitude: loc.coords.longitude 
                });
                if (geocode.length > 0) {
                  setCityName(geocode[0].city || geocode[0].region || '');
                }
              } catch {
                // Geocode failed - continue without city name
              }
            } catch {
              // Location fetch failed - will use default
            }
          }
        } catch {
          // Permission request failed - will use default
        }
      }
      
      // Use default location (Mecca) if still no location
      if (!location) {
        location = { latitude: 21.3891, longitude: 39.8579 };
        setCityName('مكة المكرمة');
      }
      
      if (location) {
        if (location.city) setCityName(location.city);
        
        // Fetch prayer times with timeout (8 seconds)
        try {
          const fetchPromise = fetchPrayerTimesByCoords(location.latitude, location.longitude);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Prayer API timeout')), 8000)
          );
          
          const data = await Promise.race([fetchPromise, timeoutPromise]) as PrayerTimesData;
          setPrayerData(data);
        } catch {
          // Prayer API failed - app will still work without prayer data
        }
      }
    } catch {
      // Location/Prayer error - app will still work
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const nextPrayer = prayerData ? getNextPrayer(prayerData.timings) : null;
  const timeUntil = nextPrayer ? getTimeUntilPrayer(nextPrayer.time) : null;

  const hijriDate = prayerData?.date?.hijri;
  const hijriStr = hijriDate
    ? `${hijriDate.day} ${hijriDate.month.ar} ${hijriDate.year} هـ`
    : null;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    loadingText: {
      fontSize: 28,
      color: colors.primary,
      marginBottom: 16,
      fontWeight: '600',
    },
    loadingSubtext: {
      fontSize: 14,
      color: colors.muted,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },
    bismillah: {
      fontSize: 28,
      color: colors.primary,
      textAlign: 'center',
      fontWeight: '600',
      marginTop: 4,
    },
    hijriDate: {
      fontSize: 13,
      color: colors.muted,
      textAlign: 'center',
      marginTop: 4,
    },
    cityDate: {
      fontSize: 12,
      color: colors.muted,
      textAlign: 'center',
      marginTop: 2,
    },
    section: {
      paddingHorizontal: 20,
      marginTop: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.foreground,
      textAlign: 'right',
      marginBottom: 12,
    },
    lastReadCard: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    lastReadTitle: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.8)',
      textAlign: 'right',
    },
    lastReadSurah: {
      fontSize: 20,
      fontWeight: '700',
      color: '#fff',
      textAlign: 'right',
      marginTop: 4,
    },
    lastReadAyah: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.8)',
      textAlign: 'right',
      marginTop: 2,
    },
    continueBtn: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    continueBtnText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '600',
    },
    verseCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
      borderLeftColor: colors.gold,
    },
    verseArabic: {
      fontSize: 22,
      color: colors.foreground,
      textAlign: 'right',
      lineHeight: 42,
      fontWeight: '500',
    },
    verseTranslation: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'left',
      marginTop: 10,
      lineHeight: 20,
      fontStyle: 'italic',
    },
    verseRef: {
      fontSize: 12,
      color: colors.primary,
      textAlign: 'right',
      marginTop: 8,
      fontWeight: '600',
    },
    prayerCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    prayerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    nextPrayerName: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.primary,
    },
    nextPrayerTime: {
      fontSize: 16,
      color: colors.foreground,
      marginTop: 2,
    },
    countdownLabel: {
      fontSize: 12,
      color: colors.muted,
      textAlign: 'right',
    },
    countdown: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.foreground,
      textAlign: 'right',
    },
    quickAccessGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    quickBtn: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.foreground,
      marginTop: 8,
    },
  });

  // Show loading only on first load, not during refresh
  if (isLoading && !refreshing) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</Text>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingSubtext}>جارٍ التحميل...</Text>
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.bismillah}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</Text>
          {hijriStr && <Text style={styles.hijriDate}>{hijriStr}</Text>}
          {cityName ? <Text style={styles.cityDate}>{cityName}</Text> : null}
        </View>

        {/* Last Read */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>آخر قراءة</Text>
          {lastRead ? (
            <TouchableOpacity
              style={styles.lastReadCard}
              onPress={() => router.push({ pathname: '/surah/[id]' as any, params: { id: lastRead.surahNumber } })}
              activeOpacity={0.85}
            >
              <View style={styles.continueBtn}>
                <Text style={styles.continueBtnText}>متابعة</Text>
              </View>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.lastReadTitle}>استمر في القراءة</Text>
                <Text style={styles.lastReadSurah}>{lastRead.surahName}</Text>
                <Text style={styles.lastReadAyah}>الآية {lastRead.ayahNumber}</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.lastReadCard}
              onPress={() => router.push('/(tabs)/quran' as any)}
              activeOpacity={0.85}
            >
              <View style={styles.continueBtn}>
                <Text style={styles.continueBtnText}>ابدأ</Text>
              </View>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.lastReadTitle}>ابدأ رحلتك مع القرآن</Text>
                <Text style={styles.lastReadSurah}>الفاتحة</Text>
                <Text style={styles.lastReadAyah}>7 آيات</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Prayer Times - Only show if data is available */}
        {nextPrayer && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>أوقات الصلاة</Text>
            <TouchableOpacity
              style={styles.prayerCard}
              onPress={() => router.push('/(tabs)/prayer' as any)}
              activeOpacity={0.85}
            >
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

        {/* Daily Verse */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>آية اليوم</Text>
          <View style={styles.verseCard}>
            <Text style={styles.verseArabic}>{dailyVerse.arabic}</Text>
            <Text style={styles.verseTranslation}>{dailyVerse.translation}</Text>
            <Text style={styles.verseRef}>سورة {dailyVerse.surah} - آية {dailyVerse.ayah}</Text>
          </View>
        </View>

        {/* Quick Access */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>وصول سريع</Text>
          <View style={styles.quickAccessGrid}>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => router.push('/(tabs)/quran' as any)}
              activeOpacity={0.7}
            >
              <IconSymbol name="book.fill" size={28} color={colors.primary} />
              <Text style={styles.quickBtnText}>السور</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => router.push({ pathname: '/(tabs)/quran' as any, params: { tab: 'juz' } })}
              activeOpacity={0.7}
            >
              <IconSymbol name="list.bullet" size={28} color={colors.primary} />
              <Text style={styles.quickBtnText}>الأجزاء</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => router.push({ pathname: '/(tabs)/quran' as any, params: { tab: 'search' } })}
              activeOpacity={0.7}
            >
              <IconSymbol name="magnifyingglass" size={28} color={colors.primary} />
              <Text style={styles.quickBtnText}>البحث</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => router.push({ pathname: '/(tabs)/quran' as any, params: { tab: 'bookmarks' } })}
              activeOpacity={0.7}
            >
              <IconSymbol name="bookmark.fill" size={28} color={colors.gold} />
              <Text style={styles.quickBtnText}>المفضلة</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => router.push('/(tabs)/prayer' as any)}
              activeOpacity={0.7}
            >
              <IconSymbol name="clock.fill" size={28} color={colors.primary} />
              <Text style={styles.quickBtnText}>الصلاة</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => router.push('/(tabs)/qibla' as any)}
              activeOpacity={0.7}
            >
              <IconSymbol name="location.north.fill" size={28} color={colors.primary} />
              <Text style={styles.quickBtnText}>القبلة</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
