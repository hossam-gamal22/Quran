// app/seasonal/eid.tsx
// صفحة العيد - موعد صلاة العيد، آدابه، تكبيرات العيد، السنن

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Share,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSettings, useTranslation } from '@/contexts/SettingsContext';
import { getLanguage } from '@/lib/i18n';
import { buildShareText } from '@/lib/share-text';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import {
  type EidInfo,
  buildEidInfo,
  applyOfficialOverride,
  subscribeToOfficialEidTime,
  getCurrentHijriYear,
  fetchOfficialEidDate,
} from '@/lib/eid-prayer';
import {
  getStoredLocation,
  getCachedPrayerTimes,
  getTodayDateString,
  type PrayerTimes,
} from '@/lib/prayer-times';

const EID_GREEN = '#0d8e62';

const ADAB_AL_EID = [
  { icon: 'shower', title: 'الاغتسال', description: 'يُسن الاغتسال يوم العيد قبل الخروج للصلاة' },
  { icon: 'tshirt-crew', title: 'لبس أحسن الثياب', description: 'يُستحب لبس أجمل الثياب وأطيبها' },
  { icon: 'food-apple', title: 'الإفطار قبل صلاة عيد الفطر', description: 'يأكل تمرات وتراً قبل الخروج (للفطر فقط)' },
  { icon: 'walk', title: 'الذهاب ماشياً', description: 'كان النبي ﷺ يخرج إلى الصلاة ماشياً' },
  { icon: 'directions-fork', title: 'مخالفة الطريق', description: 'الذهاب من طريق والعودة من طريق آخر' },
  { icon: 'account-group', title: 'التهنئة', description: 'تقبل الله منا ومنكم' },
];

const TAKBEERAT_EID = `اللهُ أَكْبَرُ، اللهُ أَكْبَرُ، اللهُ أَكْبَرُ، لا إِلَهَ إِلَّا اللهُ، واللهُ أَكْبَرُ، اللهُ أَكْبَرُ، وللهِ الحَمْدُ.
اللهُ أَكْبَرُ كَبِيراً، والحَمْدُ للهِ كَثِيراً، وسُبْحَانَ اللهِ بُكْرَةً وَأَصِيلاً.
لا إِلَهَ إِلَّا اللهُ وَحْدَهُ، صَدَقَ وَعْدَهُ، ونَصَرَ عَبْدَهُ، وأَعَزَّ جُنْدَهُ، وهَزَمَ الأَحْزَابَ وَحْدَهُ.
لا إِلَهَ إِلَّا اللهُ، واللهُ أَكْبَرُ، اللهُ أَكْبَرُ، وللهِ الحَمْدُ.`;

const firstParam = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const isDisplayablePrayerTime = (value?: string) => !!value && value !== '--:--';
const getPrayerTimeDisplayParts = (timeString: string, use24Hour: boolean) => {
  if (!timeString || timeString === '--:--') return { time: '--:--' };
  if (use24Hour) return { time: timeString };

  const [rawHours, rawMinutes] = timeString.split(':').map(Number);
  if (!Number.isFinite(rawHours) || !Number.isFinite(rawMinutes)) return { time: timeString };

  const amPm: Record<string, [string, string]> = {
    ar: ['ص', 'م'],
    ur: ['ص', 'م'],
    en: ['AM', 'PM'],
    fr: ['AM', 'PM'],
    de: ['AM', 'PM'],
    es: ['AM', 'PM'],
    tr: ['ÖÖ', 'ÖS'],
    id: ['AM', 'PM'],
    ms: ['AM', 'PM'],
    hi: ['AM', 'PM'],
    bn: ['AM', 'PM'],
    ru: ['AM', 'PM'],
  };
  const [am, pm] = amPm[getLanguage()] || amPm.en;
  return {
    time: `${rawHours % 12 || 12}:${String(rawMinutes).padStart(2, '0')}`,
    period: rawHours >= 12 ? pm : am,
  };
};

export default function EidScreen() {
  const colors = useColors();
  const { isDarkMode, settings } = useSettings();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const router = useRouter();
  const routeParams = useLocalSearchParams<{
    prayerTime?: string;
    confidence?: string;
    source?: string;
    lastUpdated?: string;
  }>();
  const insets = useSafeAreaInsets();
  const routePrayerTime = firstParam(routeParams.prayerTime);
  const routeConfidence = firstParam(routeParams.confidence);
  const routeSource = firstParam(routeParams.source);
  const routeLastUpdated = firstParam(routeParams.lastUpdated);

  const [info, setInfo] = useState<EidInfo | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dateMismatchNote, setDateMismatchNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load prayer times + country + build base info
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [loc, prayerTimes] = await Promise.all([
          getStoredLocation(),
          getCachedPrayerTimes(
            getTodayDateString(),
            settings.prayer.calculationMethod,
            settings.prayer.asrJuristic
          ),
        ]);
        if (!mounted) return;
        setCountry(loc?.country || null);
        const baseInfo = buildEidInfo(prayerTimes as PrayerTimes | null);
        setInfo(baseInfo && isDisplayablePrayerTime(routePrayerTime)
          ? {
              ...baseInfo,
              prayerTime: routePrayerTime!,
              confidence: routeConfidence === 'official' ? 'official' : baseInfo.confidence,
              source: routeSource || baseInfo.source,
              lastUpdated: routeLastUpdated || baseInfo.lastUpdated,
            }
          : baseInfo
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [
    settings.prayer.calculationMethod,
    settings.prayer.asrJuristic,
    routePrayerTime,
    routeConfidence,
    routeSource,
    routeLastUpdated,
  ]);

  // Firestore override subscription
  useEffect(() => {
    if (!info || !country) return;
    const unsubscribe = subscribeToOfficialEidTime(
      country,
      info.type,
      getCurrentHijriYear(),
      (override) => {
        setInfo(current => current ? applyOfficialOverride(current, override) : current);
      }
    );
    return unsubscribe;
  }, [info?.type, country]);

  const handleRefresh = useCallback(async () => {
    if (!info) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setRefreshing(true);
    setDateMismatchNote(null);
    try {
      const officialDate = await fetchOfficialEidDate(info.type, getCurrentHijriYear());
      if (officialDate) {
        const local = new Date(info.date);
        local.setHours(0, 0, 0, 0);
        officialDate.setHours(0, 0, 0, 0);
        if (Math.round((officialDate.getTime() - local.getTime()) / 86400000) !== 0) {
          setDateMismatchNote(t('eidPrayer.dateMismatchNote'));
        }
      }
    } finally {
      setRefreshing(false);
    }
  }, [info, t]);

  const shareTakbeer = useCallback(async () => {
    try {
      await Share.share({ message: buildShareText(TAKBEERAT_EID) });
    } catch {}
  }, []);

  const countdown = useMemo(() => {
    if (!info) return '';
    if (info.isToday) return t('eidPrayer.today');
    if (info.daysUntil === 1) return t('eidPrayer.tomorrow');
    return t('eidPrayer.afterDays').replace('{n}', String(info.daysUntil));
  }, [info, t]);

  const title = info?.type === 'fitr' ? t('eidPrayer.fitrTitle') : t('eidPrayer.adhaTitle');
  const isOfficial = info?.confidence === 'official';
  const heroPrayerTime = info ? getPrayerTimeDisplayParts(info.prayerTime, settings.prayer.show24Hour) : null;

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />

        {/* Header */}
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons
              name={isRTL ? 'chevron-right' : 'chevron-left'}
              size={28}
              color={colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={2}>
            {info ? title : t('eidPrayer.pageTitle')}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={{ paddingVertical: 60 }}>
              <ActivityIndicator color={EID_GREEN} />
            </View>
          ) : !info ? (
            <Animated.View entering={FadeIn} style={styles.noEidCard}>
              <MaterialCommunityIcons name="calendar-clock" size={48} color={colors.textLight} />
              <Text style={[styles.noEidTitle, { color: colors.text }]}>
                {t('eidPrayer.noUpcomingTitle')}
              </Text>
              <Text style={[styles.noEidText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('eidPrayer.noUpcomingText')}
              </Text>
            </Animated.View>
          ) : (
            <>
              {/* Hero countdown card */}
              <Animated.View entering={FadeInDown.duration(500)} style={styles.heroCard}>
                {Platform.OS === 'ios' && (
                  <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
                )}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(13,142,98,0.12)' }]} />

                <MaterialCommunityIcons name="mosque" size={48} color={EID_GREEN} />
                <Text style={[styles.heroCountdown, { color: EID_GREEN }]}>{countdown}</Text>
                <View style={[styles.heroTimeRow, isRTL && styles.heroTimeRowRTL]}>
                  <Text style={[styles.heroTime, { color: colors.text }]}>{heroPrayerTime?.time}</Text>
                  {heroPrayerTime?.period && (
                    <Text style={[styles.heroTimePeriod, { color: colors.text }]}>{heroPrayerTime.period}</Text>
                  )}
                </View>

                <View style={[styles.heroBadge, { backgroundColor: isOfficial ? 'rgba(13,142,98,0.18)' : 'rgba(192,123,16,0.18)' }]}>
                  <MaterialCommunityIcons
                    name={isOfficial ? 'check-decagram' : 'information-outline'}
                    size={14}
                    color={isOfficial ? EID_GREEN : '#c07b10'}
                  />
                  <Text style={[styles.heroBadgeText, { color: isOfficial ? EID_GREEN : '#c07b10' }]}>
                    {isOfficial ? t('eidPrayer.officialBadge') : t('eidPrayer.approxBadge')}
                  </Text>
                </View>

                {info.source && (
                  <Text style={[styles.heroSource, { color: colors.textLight, textAlign: 'center' }]} numberOfLines={2}>
                    {t('eidPrayer.sourceLabel')}: {info.source}
                  </Text>
                )}

                <TouchableOpacity
                  style={[styles.refreshBtn, { borderColor: EID_GREEN }]}
                  onPress={handleRefresh}
                  disabled={refreshing}
                  activeOpacity={0.7}
                >
                  {refreshing ? (
                    <ActivityIndicator size="small" color={EID_GREEN} />
                  ) : (
                    <MaterialCommunityIcons name="refresh" size={16} color={EID_GREEN} />
                  )}
                  <Text style={[styles.refreshText, { color: EID_GREEN }]}>
                    {t('eidPrayer.refreshFromSources')}
                  </Text>
                </TouchableOpacity>

                {dateMismatchNote && (
                  <Text style={[styles.mismatchInline, { textAlign: 'center' }]}>
                    {dateMismatchNote}
                  </Text>
                )}

                <Text style={[styles.heroDisclaimer, { color: colors.textLight, textAlign: 'center' }]}>
                  {t('eidPrayer.disclaimer')}
                </Text>
              </Animated.View>

              {/* Adab al-Eid */}
              <Animated.View entering={FadeInDown.delay(100).duration(500)}>
                <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: 'rtl' }]}>
                  {t('eidPrayer.adabSection')}
                </Text>
                {ADAB_AL_EID.map((item, idx) => {
                  if (item.title === 'الإفطار قبل صلاة عيد الفطر' && info.type !== 'fitr') return null;
                  return (
                    <Animated.View
                      key={item.title}
                      entering={FadeInDown.delay(150 + idx * 40).duration(400)}
                      style={[styles.adabCard, { backgroundColor: colors.card, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    >
                      <View style={[styles.adabIcon, { backgroundColor: 'rgba(13,142,98,0.12)' }]}>
                        <MaterialCommunityIcons name={item.icon as any} size={22} color={EID_GREEN} />
                      </View>
                      <View style={[styles.adabText, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                        <Text style={[styles.adabTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: 'rtl' }]}>
                          {item.title}
                        </Text>
                        <Text style={[styles.adabDesc, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: 'rtl' }]}>
                          {item.description}
                        </Text>
                      </View>
                    </Animated.View>
                  );
                })}
              </Animated.View>

              {/* Takbeerat */}
              <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                <View style={[styles.takbeerHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: 'rtl', flex: 1, marginBottom: 0 }]}>
                    {t('eidPrayer.takbeerSection')}
                  </Text>
                  <TouchableOpacity onPress={shareTakbeer} style={styles.shareBtn}>
                    <MaterialCommunityIcons name="share-variant" size={20} color={EID_GREEN} />
                  </TouchableOpacity>
                </View>
                <View style={[styles.takbeerCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.takbeerText, { color: colors.text, writingDirection: 'rtl' }]}>
                    {TAKBEERAT_EID}
                  </Text>
                </View>
              </Animated.View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: fontBold(), textAlign: 'center' },

  noEidCard: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 12,
  },
  noEidTitle: { fontSize: 16, fontFamily: fontSemiBold(), textAlign: 'center' },
  noEidText: { fontSize: 13, fontFamily: fontRegular(), lineHeight: 20 },

  heroCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 0.5,
    borderColor: 'rgba(13,142,98,0.25)',
    gap: 10,
  },
  heroCountdown: { fontSize: 16, fontFamily: fontSemiBold(), marginTop: 8 },
  heroTimeRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10 },
  heroTimeRowRTL: { flexDirection: 'row-reverse' },
  heroTime: { fontSize: 44, lineHeight: 54, fontFamily: fontBold(), letterSpacing: 1, fontVariant: ['tabular-nums'] },
  heroTimePeriod: { fontSize: 38, lineHeight: 50, fontFamily: fontBold() },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  heroBadgeText: { fontSize: 12, fontFamily: fontSemiBold() },
  heroSource: { fontSize: 12, fontFamily: fontRegular() },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  refreshText: { fontSize: 13, fontFamily: fontSemiBold() },
  mismatchInline: { color: '#c07b10', fontSize: 12, fontFamily: fontMedium(), marginTop: 4 },
  heroDisclaimer: { fontSize: 11, fontFamily: fontRegular(), lineHeight: 16, marginTop: 6, paddingHorizontal: 8 },

  sectionTitle: { fontSize: 16, fontFamily: fontBold(), marginBottom: 12 },

  adabCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    gap: 12,
  },
  adabIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  adabText: { flex: 1, gap: 2 },
  adabTitle: { fontSize: 14, fontFamily: fontSemiBold() },
  adabDesc: { fontSize: 12, fontFamily: fontRegular(), lineHeight: 18 },

  takbeerHeader: { alignItems: 'center', marginTop: 12, marginBottom: 12, gap: 8 },
  shareBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(13,142,98,0.10)',
  },
  takbeerCard: { borderRadius: 14, padding: 18 },
  takbeerText: { fontSize: 16, lineHeight: 32, fontFamily: fontMedium(), textAlign: 'center' },
});
