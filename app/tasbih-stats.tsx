/**
 * Tasbih Stats Page
 * Standalone page showing tasbih statistics - can be opened directly from home
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { t } from '@/lib/i18n';

import { useIsRTL } from '@/hooks/use-is-rtl';
const GREEN = '#0d8e62';
const DAILY_STATS_KEY = 'tasbih_daily_stats';
const TYPE_STATS_KEY = 'tasbih_type_stats';

function getTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TasbihStatsScreen() {
  const { settings } = useSettings();
  const isRTL = useIsRTL();
  const C = useColors();
  const s = useScaledStyles(_s, C.fs);
  const isDarkMode = settings?.theme === 'dark';

  // Stats data
  const [dailyStats, setDailyStats] = useState<Record<string, number>>({});
  const [typeStats, setTypeStats] = useState<Record<string, Record<string, number>>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [dailyRaw, typeRaw] = await Promise.all([
        AsyncStorage.getItem(DAILY_STATS_KEY),
        AsyncStorage.getItem(TYPE_STATS_KEY),
      ]);

      if (dailyRaw) {
        try {
          setDailyStats(JSON.parse(dailyRaw));
        } catch {}
      }
      if (typeRaw) {
        try {
          setTypeStats(JSON.parse(typeRaw));
        } catch {}
      }
    } catch (err) {
      console.warn('Error loading tasbih stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate stats
  const todayISO = getTodayISO();
  const totalToday = dailyStats[todayISO] || 0;
  const allTimeTotal = Object.values(dailyStats).reduce((a, b) => a + b, 0);
  const daysCount = Object.keys(dailyStats).length || 1;
  const avgPerDay = Math.round(allTimeTotal / daysCount);
  const rounds = Math.floor(totalToday / 33);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const goToTasbih = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.navigate('/(tabs)/tasbih');
  };

  return (
    <BackgroundWrapper
      backgroundKey={settings?.display?.appBackground}
      backgroundUrl={settings?.display?.appBackgroundUrl}
      opacity={settings?.display?.backgroundOpacity ?? 1}
      style={{ flex: 1, backgroundColor: 'transparent' }}
    >
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={[s.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity onPress={goToTasbih} style={s.headerBtn}>
            <MaterialCommunityIcons name="counter" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: C.text }]}>{t('home.tasbihLog')}</Text>
          <TouchableOpacity onPress={handleClose} style={s.headerBtn}>
            <MaterialCommunityIcons name="close" size={22} color={C.text} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <MaterialCommunityIcons name="loading" size={32} color={C.text} />
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Summary cards */}
            <View style={[s.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View
                style={[
                  s.statCard,
                  { overflow: 'hidden' },
                ]}
              >
                {Platform.OS === 'ios' && (
                  <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
                )}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
                <MaterialCommunityIcons name="calendar-today" size={28} color={C.glassText} />
                <Text style={[s.statValue, { color: C.glassText }]}>{totalToday}</Text>
                <Text style={[s.statLabel, { color: C.glassTextLight }]}>{t('tasbih.todaysCount')}</Text>
              </View>
              <View
                style={[
                  s.statCard,
                  { overflow: 'hidden' },
                ]}
              >
                {Platform.OS === 'ios' && (
                  <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
                )}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
                <MaterialCommunityIcons name="sync" size={28} color={C.glassText} />
                <Text style={[s.statValue, { color: C.glassText }]}>{rounds}</Text>
                <Text style={[s.statLabel, { color: C.glassTextLight }]}>{t('tasbih.completedRounds')}</Text>
              </View>
            </View>

            <View style={[s.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View
                style={[
                  s.statCard,
                  { overflow: 'hidden' },
                ]}
              >
                {Platform.OS === 'ios' && (
                  <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
                )}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
                <MaterialCommunityIcons name="sigma" size={28} color={C.glassText} />
                <Text style={[s.statValue, { color: C.glassText }]}>{allTimeTotal}</Text>
                <Text style={[s.statLabel, { color: C.glassTextLight }]}>{t('tasbih.allTimeTotal')}</Text>
              </View>
              <View
                style={[
                  s.statCard,
                  { overflow: 'hidden' },
                ]}
              >
                {Platform.OS === 'ios' && (
                  <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
                )}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
                <MaterialCommunityIcons name="chart-line" size={28} color={C.glassText} />
                <Text style={[s.statValue, { color: C.glassText }]}>{avgPerDay}</Text>
                <Text style={[s.statLabel, { color: C.glassTextLight }]}>{t('tasbih.dailyAverage')}</Text>
              </View>
            </View>

            {/* Today's breakdown by type */}
            {(typeStats[todayISO] || typeStats[new Date().toDateString()]) &&
              Object.keys(typeStats[todayISO] || typeStats[new Date().toDateString()] || {}).length > 0 && (
                <>
                  <Text style={[s.sectionLabel, { color: C.textLight, marginTop: 16, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {t('tasbih.todayBreakdown')}
                  </Text>
                  {Object.entries(typeStats[todayISO] || typeStats[new Date().toDateString()] || {})
                    .sort((a, b) => b[1] - a[1])
                    .map(([text, cnt]) => (
                      <View
                        key={text}
                        style={[
                          s.statsRow,
                          {
                            flexDirection: isRTL ? 'row-reverse' : 'row',
                            overflow: 'hidden',
                          },
                        ]}
                      >
                        {Platform.OS === 'ios' && (
                          <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
                        )}
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
                        <Text style={[s.statsRowVal, { color: C.text }]}>{cnt}</Text>
                        <Text style={[s.statsRowDate, { color: C.glassText, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>
                          {text.length > 30 ? text.slice(0, 28) + '…' : text}
                        </Text>
                      </View>
                    ))}
                </>
              )}

            {/* Last 7 days */}
            <Text style={[s.sectionLabel, { color: C.textLight, marginTop: 16, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('tasbih.last7Days')}</Text>
            {Object.entries(dailyStats).length === 0 ? (
              <View style={[s.emptyState, { overflow: 'hidden' }]}>
                {Platform.OS === 'ios' && (
                  <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
                )}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
                <MaterialCommunityIcons name="chart-bar" size={40} color={C.glassTextLight} style={{ opacity: 0.5 }} />
                <Text style={[s.emptyText, { color: C.glassTextLight }]}>{t('tasbih.noDataYet')}</Text>
                <Text style={[s.emptySubtext, { color: C.glassTextLight }]}>{t('tasbih.startTasbihHint')}</Text>
              </View>
            ) : (
              Object.entries(dailyStats)
                .slice(-7)
                .reverse()
                .map(([date, cnt]) => {
                  const dayTypeStats = typeStats[date];
                  return (
                    <View
                      key={date}
                      style={[
                        s.statsRow,
                        {
                          overflow: 'hidden',
                          flexDirection: 'column',
                          alignItems: 'stretch',
                        },
                      ]}
                    >
                      {Platform.OS === 'ios' && (
                        <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
                      )}
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
                      <View
                        style={{
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={[s.statsRowVal, { color: C.glassText }]}>{cnt} {t('tasbih.dhikrUnit')}</Text>
                        <Text style={[s.statsRowDate, { color: C.glassTextLight }]}>{date}</Text>
                      </View>
                      {dayTypeStats && Object.keys(dayTypeStats).length > 0 && (
                        <View style={{ marginTop: 8, gap: 4 }}>
                          {Object.entries(dayTypeStats)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 3)
                            .map(([text, c]) => (
                              <View
                                key={text}
                                style={{
                                  flexDirection: isRTL ? 'row-reverse' : 'row',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontFamily: fontMedium(),
                                    color: C.glassText,
                                    opacity: 0.8,
                                  }}
                                >
                                  {c}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontFamily: fontRegular(),
                                    color: C.glassTextLight,
                                  }}
                                  numberOfLines={1}
                                >
                                  {text.length > 25 ? text.slice(0, 23) + '…' : text}
                                </Text>
                              </View>
                            ))}
                        </View>
                      )}
                    </View>
                  );
                })
            )}

            {/* Go to Tasbih button */}
            <TouchableOpacity
              onPress={goToTasbih}
              style={[s.goButton, { backgroundColor: GREEN, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="counter" size={20} color="#fff" />
              <Text style={s.goButtonText}>{t('tasbih.openTasbih')}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const _s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fontBold(),
    lineHeight: 34,
    includeFontPadding: false,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 28,
    fontFamily: fontBold(),
    lineHeight: 44,
    includeFontPadding: false,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: fontMedium(),
    textAlign: 'center',
    lineHeight: 20,
    includeFontPadding: false,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: fontSemiBold(),
    marginBottom: 8,
    lineHeight: 24,
    includeFontPadding: false,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  statsRowVal: {
    fontSize: 15,
    fontFamily: fontBold(),
    lineHeight: 26,
    includeFontPadding: false,
  },
  statsRowDate: {
    fontSize: 13,
    fontFamily: fontRegular(),
    lineHeight: 22,
    includeFontPadding: false,
  },
  emptyState: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: fontSemiBold(),
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 28,
    includeFontPadding: false,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: fontRegular(),
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 22,
    includeFontPadding: false,
  },
  goButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
  },
  goButtonText: {
    fontSize: 16,
    fontFamily: fontSemiBold(),
    color: '#fff',
    lineHeight: 28,
    includeFontPadding: false,
  },
});
