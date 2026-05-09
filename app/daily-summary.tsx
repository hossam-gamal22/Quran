// app/daily-summary.tsx
// صفحة ملخص عبادات اليوم — تُفتح من إشعار ملخص العبادة اليومي

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ScreenContainer } from '@/components/screen-container';
import { UniversalHeader, GlassCard } from '@/components/ui';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSettings } from '@/contexts/SettingsContext';
import { useWorship } from '@/contexts/WorshipContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { usePremiumFeature } from '@/hooks/use-premium-feature';
import { guardPremiumFeature } from '@/lib/premium-guard';
import { t } from '@/lib/i18n';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { localizeNumber } from '@/lib/format-number';
import { getTodayListeningMinutes } from '@/lib/listening-tracker';
import type { PrayerStatus } from '@/lib/worship-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACCENT = '#0d8e62';

function getTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ========================================
// مكون كارت الإحصائية
// ========================================
interface StatCardProps {
  icon: string;
  iconColor: string;
  title: string;
  value: string;
  subtitle?: string;
  details?: { label: string; done: boolean }[];
  delay: number;
  colors: any;
  isRTL: boolean;
  isDarkMode: boolean;
  locked?: boolean;
  onLockPress?: () => void;
}

function StatCard({ icon, iconColor, title, value, subtitle, details, delay, colors, isRTL, isDarkMode, locked, onLockPress }: StatCardProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)}>
      <GlassCard style={styles.statCard}>
        {locked && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onLockPress}
            style={{
              ...StyleSheet.absoluteFillObject,
              zIndex: 10,
              backgroundColor: isDarkMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)',
              borderRadius: 16,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MaterialCommunityIcons name="lock" size={28} color={isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)'} />
            <Text style={{ color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)', fontFamily: fontSemiBold(), fontSize: 13, marginTop: 4 }}>
              {t('common.premiumFeature') || 'ميزة مميزة'}
            </Text>
          </TouchableOpacity>
        )}
        <View style={[styles.statHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.statIconContainer, { backgroundColor: `${iconColor}20` }]}>
            <MaterialCommunityIcons name={icon as any} size={24} color={iconColor} />
          </View>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={[styles.statTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', fontFamily: fontSemiBold() }]}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={[styles.statSubtitle, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left', fontFamily: fontRegular() }]}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.statValue, { color: iconColor, fontFamily: fontBold() }]}>
            {value}
          </Text>
        </View>
        {details && details.length > 0 && (
          <View style={styles.detailsContainer}>
            {details.map((item, idx) => (
              <View key={idx} style={[styles.detailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons
                  name={item.done ? 'check-circle' : 'circle-outline'}
                  size={18}
                  color={item.done ? ACCENT : colors.textSecondary}
                />
                <Text style={[styles.detailText, {
                  color: item.done ? colors.text : colors.textSecondary,
                  textAlign: isRTL ? 'right' : 'left',
                  fontFamily: fontRegular(),
                  marginStart: 8,
                }]}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </GlassCard>
    </Animated.View>
  );
}

// ========================================
// المكون الرئيسي
// ========================================
export default function DailySummaryScreen() {
  const router = useRouter();
  const colors = useColors();
  const isRTL = useIsRTL();
  const { isDarkMode } = useSettings();
  const { todayPrayer, todayQuran, todayAzkar } = useWorship();
  const { isPremium } = useSubscription();
  const { isLocked: statsLocked } = usePremiumFeature('advanced_stats');
  const handleStatsLockPress = () => { guardPremiumFeature('advanced_stats', router, isPremium); };

  const [tasbihCount, setTasbihCount] = useState(0);
  const [tasbihTypes, setTasbihTypes] = useState(0);
  const [listeningMinutes, setListeningMinutes] = useState(0);

  useEffect(() => {
    loadTasbihData();
    loadListeningData();
  }, []);

  const loadTasbihData = async () => {
    try {
      const raw = await AsyncStorage.getItem('@tasbih_daily_history');
      if (raw) {
        const history = JSON.parse(raw);
        const todayData = history[getTodayISO()];
        if (todayData && typeof todayData === 'object') {
          const entries = Object.entries(todayData) as [string, number][];
          const total = entries.reduce((sum, [, count]) => sum + count, 0);
          setTasbihCount(total);
          setTasbihTypes(entries.length);
        }
      }
    } catch (e) {
      console.warn('[DailySummary] Error loading tasbih data:', e);
    }
  };

  const loadListeningData = async () => {
    try {
      const minutes = await getTodayListeningMinutes();
      setListeningMinutes(minutes);
    } catch (e) {
      console.warn('[DailySummary] Error loading listening data:', e);
    }
  };

  // Prayer stats
  const prayerNames = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
  const prayerLabels: Record<string, string> = {
    fajr: t('prayer.fajr'),
    dhuhr: t('prayer.dhuhr'),
    asr: t('prayer.asr'),
    maghrib: t('prayer.maghrib'),
    isha: t('prayer.isha'),
  };
  const prayedCount = todayPrayer
    ? prayerNames.filter(p => todayPrayer[p] === 'prayed' || todayPrayer[p] === 'late').length
    : 0;
  const prayerDetails = prayerNames.map(p => ({
    label: prayerLabels[p],
    done: todayPrayer ? (todayPrayer[p] === 'prayed' || todayPrayer[p] === 'late') : false,
  }));

  // Quran pages
  const pagesRead = todayQuran?.pagesRead || 0;

  // Azkar stats
  const azkarItems = [
    { key: 'morning' as const, label: t('azkar.morning') },
    { key: 'evening' as const, label: t('azkar.evening') },
    { key: 'sleep' as const, label: t('azkar.sleep') },
    { key: 'wakeup' as const, label: t('azkar.wakeup') },
  ];
  const azkarDone = todayAzkar
    ? azkarItems.filter(a => todayAzkar[a.key]).length
    : 0;
  const azkarDetails = azkarItems.map(a => ({
    label: a.label,
    done: todayAzkar ? !!todayAzkar[a.key] : false,
  }));

  // Listening time display
  const listeningDisplay = listeningMinutes >= 60
    ? `${localizeNumber(Math.floor(listeningMinutes / 60))} ${t('common.hour')} ${localizeNumber(listeningMinutes % 60)} ${t('common.minute')}`
    : `${localizeNumber(listeningMinutes)} ${t('common.minutes') || 'د'}`;

  return (
    <ScreenContainer>
      <UniversalHeader title={t('worship.dailySummary') || 'ملخص عبادات اليوم'} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Icon */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerIcon}>
          <View style={[styles.headerIconCircle, { backgroundColor: `${ACCENT}20` }]}>
            <MaterialCommunityIcons name="chart-arc" size={48} color={ACCENT} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: fontBold() }]}>
            {t('worship.todaySummary') || 'إنجازات اليوم'}
          </Text>
        </Animated.View>

        {/* الصلاة */}
        <StatCard
          icon="mosque"
          iconColor="#c17f59"
          title={t('tabs.prayer') || 'الصلاة'}
          value={`${localizeNumber(prayedCount)}/${localizeNumber(5)}`}
          subtitle={prayedCount === 5 ? (t('worship.allPrayersDone') || 'ما شاء الله! أتممت جميع الصلوات') : undefined}
          details={prayerDetails}
          delay={100}
          colors={colors}
          isRTL={isRTL}
          isDarkMode={isDarkMode}
        />

        {/* القرآن */}
        <StatCard
          icon="book-open-variant"
          iconColor="#3a7ca5"
          title={t('tabs.quran') || 'القرآن'}
          value={localizeNumber(pagesRead)}
          subtitle={pagesRead > 0 ? (t('worship.pagesRead') || 'صفحات') : (t('worship.noPagesYet') || 'لم تقرأ بعد')}
          delay={200}
          colors={colors}
          isRTL={isRTL}
          isDarkMode={isDarkMode}
          locked={statsLocked}
          onLockPress={handleStatsLockPress}
        />

        {/* الأذكار */}
        <StatCard
          icon="book-open-page-variant"
          iconColor="#0d8e62"
          title={t('tabs.azkar') || 'الأذكار'}
          value={`${localizeNumber(azkarDone)}/${localizeNumber(azkarItems.length)}`}
          details={azkarDetails}
          delay={300}
          colors={colors}
          isRTL={isRTL}
          isDarkMode={isDarkMode}
          locked={statsLocked}
          onLockPress={handleStatsLockPress}
        />

        {/* التسبيح */}
        <StatCard
          icon="counter"
          iconColor="#d4a017"
          title={t('tabs.tasbih') || 'التسبيح'}
          value={localizeNumber(tasbihCount)}
          subtitle={tasbihTypes > 0 ? `${localizeNumber(tasbihTypes)} ${t('worship.types') || 'أنواع'}` : (t('worship.noTasbihYet') || 'لم تسبّح بعد')}
          delay={400}
          colors={colors}
          isRTL={isRTL}
          isDarkMode={isDarkMode}
          locked={statsLocked}
          onLockPress={handleStatsLockPress}
        />

        {/* سماع القرآن */}
        <StatCard
          icon="headphones"
          iconColor="#8b5cf6"
          title={t('worship.quranListening') || 'سماع القرآن'}
          value={listeningDisplay}
          subtitle={listeningMinutes > 0 ? (t('worship.keepListening') || 'استمر في الاستماع') : (t('worship.noListeningYet') || 'لم تستمع بعد')}
          delay={500}
          colors={colors}
          isRTL={isRTL}
          isDarkMode={isDarkMode}
          locked={statsLocked}
          onLockPress={handleStatsLockPress}
        />

        {/* زرار عرض التفاصيل */}
        <Animated.View entering={FadeInDown.delay(600).duration(400)}>
          <TouchableOpacity
            style={[styles.detailsButton, { backgroundColor: ACCENT }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/worship-tracker' as any);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.detailsButtonText, { fontFamily: fontSemiBold() }]}>
              {t('worship.viewDetails') || 'عرض التفاصيل'}
            </Text>
            <MaterialCommunityIcons
              name={isRTL ? 'chevron-left' : 'chevron-right'}
              size={22}
              color="#fff"
            />
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

// ========================================
// الأنماط
// ========================================
const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  headerIcon: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  headerIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    textAlign: 'center',
    lineHeight: 34,
    includeFontPadding: false,
  },
  statCard: {
    marginBottom: 12,
    padding: 16,
  },
  statHeader: {
    alignItems: 'center',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTitle: {
    fontSize: 16,
  },
  statSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  statValue: {
    fontSize: 22,
  },
  detailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
    gap: 8,
  },
  detailRow: {
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    gap: 6,
  },
  detailsButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
