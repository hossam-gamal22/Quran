// components/ui/prayer/EidPrayerCard.tsx
// بطاقة موعد صلاة العيد - تظهر في صفحة الصلاة قبل العيد بـ 3 أيام وحتى ظهر يوم العيد

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useTranslation } from '@/contexts/SettingsContext';
import { getLanguage } from '@/lib/i18n';
import {
  type EidInfo,
  type EidType,
  buildEidInfo,
  applyOfficialOverride,
  subscribeToOfficialEidTime,
  getCurrentHijriYear,
  fetchOfficialEidDate,
  fetchOfficialEidTimeOnce,
  fetchAggregatedEidTimeFromServer,
} from '@/lib/eid-prayer';
import { getStoredLocation, type PrayerTimes } from '@/lib/prayer-times';

const EID_MINT = '#7AE5BC';

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

interface EidPrayerCardProps {
  prayerTimes: PrayerTimes | null;
  show24Hour?: boolean;
}

const EidPrayerCard: React.FC<EidPrayerCardProps> = ({ prayerTimes, show24Hour = false }) => {
  const isRTL = useIsRTL();
  const { t } = useTranslation();
  const router = useRouter();

  const [info, setInfo] = useState<EidInfo | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dateMismatchNote, setDateMismatchNote] = useState<string | null>(null);
  const [refreshNote, setRefreshNote] = useState<{ text: string; tone: 'info' | 'success' } | null>(null);

  // Load country + coordinates once
  useEffect(() => {
    let mounted = true;
    getStoredLocation().then(loc => {
      if (!mounted) return;
      setCountry(loc?.country || null);
      if (loc?.latitude != null && loc?.longitude != null) {
        setCoords({ latitude: loc.latitude, longitude: loc.longitude });
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Build base info from local calculation
  useEffect(() => {
    setInfo(buildEidInfo(prayerTimes));
    // Re-evaluate every 10 minutes to catch the 11am hide threshold
    const id = setInterval(() => setInfo(buildEidInfo(prayerTimes)), 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [prayerTimes]);

  // Subscribe to Firestore overrides
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

  const handleRefreshFromSources = useCallback(async () => {
    if (!info) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setRefreshing(true);
    setDateMismatchNote(null);
    setRefreshNote(null);
    try {
      // Phase 2 chain (in order of preference):
      //   1) Admin Firestore override per-country  — authoritative when present
      //   2) Server aggregator (tRPC eidPrayer.aggregate) — gives sunrise+offset
      //      with server-side caching, avoids client CORS
      //   3) Direct AlAdhan hToG — verifies the Gregorian date locally
      const [adminOverride, serverAgg, officialDate] = await Promise.all([
        fetchOfficialEidTimeOnce(country, info.type, getCurrentHijriYear()),
        fetchAggregatedEidTimeFromServer(info.type, getCurrentHijriYear(), coords ?? undefined),
        fetchOfficialEidDate(info.type, getCurrentHijriYear()),
      ]);

      if (adminOverride) {
        setInfo(current => current ? applyOfficialOverride(current, adminOverride) : current);
        setRefreshNote({ text: t('eidPrayer.refreshOfficialFound'), tone: 'success' });
      } else if (serverAgg?.prayerTime) {
        // Apply the server-computed time but keep `calculated` confidence — it's
        // still an estimate, just one centrally maintained on our server.
        setInfo(current => current ? {
          ...current,
          prayerTime: serverAgg.prayerTime!,
          source: serverAgg.source,
          lastUpdated: serverAgg.fetchedAt,
        } : current);
        setRefreshNote({ text: t('eidPrayer.refreshDateConfirmed'), tone: 'success' });
      } else if (info.confidence !== 'official') {
        setRefreshNote({ text: t('eidPrayer.refreshNoOfficial'), tone: 'info' });
      }

      // Cross-check date — prefer the server's date if returned, otherwise hToG
      const verifiedDateStr = serverAgg?.date;
      const verifiedDate = verifiedDateStr ? new Date(verifiedDateStr) : officialDate;
      if (verifiedDate) {
        const local = new Date(info.date);
        local.setHours(0, 0, 0, 0);
        verifiedDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((verifiedDate.getTime() - local.getTime()) / 86400000);
        if (diffDays !== 0) {
          setDateMismatchNote(t('eidPrayer.dateMismatchNote'));
        }
      }
    } catch {
      // silent — user can retry
    } finally {
      setRefreshing(false);
    }
  }, [info, country, coords, t]);

  if (!info) return null;

  const titleKey: EidType = info.type;
  const title = titleKey === 'fitr' ? t('eidPrayer.fitrTitle') : t('eidPrayer.adhaTitle');

  let countdownLabel: string;
  if (info.isToday) {
    countdownLabel = t('eidPrayer.today');
  } else if (info.daysUntil === 1) {
    countdownLabel = t('eidPrayer.tomorrow');
  } else {
    countdownLabel = t('eidPrayer.afterDays').replace('{n}', String(info.daysUntil));
  }

  const isOfficial = info.confidence === 'official';
  const badgeColor = isOfficial ? EID_MINT : '#d89416';
  const prayerTime = getPrayerTimeDisplayParts(info.prayerTime, show24Hour);

  return (
    <Animated.View entering={FadeInDown.delay(350).duration(500)} style={styles.container}>
      <LinearGradient
        colors={['rgba(12,70,57,0.98)', 'rgba(9,44,38,0.98)', 'rgba(8,32,29,0.98)']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {Platform.OS === 'ios' && (
        <BlurView intensity={34} tint="dark" style={StyleSheet.absoluteFill} />
      )}
      <View style={styles.surfaceOverlay} />
      <View style={styles.accentLine} />

      {/* Header row: icon + title + confidence badge */}
      <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="mosque" size={28} color="#9EF2D0" />
        </View>
        <View style={[styles.titleCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={2}>
            {title}
          </Text>
          <View style={[styles.countdownPill, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="calendar-star" size={13} color={EID_MINT} />
            <Text style={[styles.countdown, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {countdownLabel}
            </Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: isOfficial ? 'rgba(122,229,188,0.14)' : 'rgba(216,148,22,0.16)' }]}>
          <MaterialCommunityIcons
            name={isOfficial ? 'check-decagram' : 'information-outline'}
            size={14}
            color={badgeColor}
          />
          <Text style={[styles.badgeText, { color: badgeColor }]}>
            {isOfficial ? t('eidPrayer.officialBadge') : t('eidPrayer.approxBadge')}
          </Text>
        </View>
      </View>

      {/* Time + meta */}
      <View style={[styles.timePanel, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.timeBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.timeLabel, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('eidPrayer.timeLabel')}
          </Text>
          <View
            style={[
              styles.timeValueRow,
              isRTL && styles.timeValueRowRTL,
              { alignSelf: isRTL ? 'flex-end' : 'flex-start' },
            ]}
          >
            <Text style={styles.timeValue}>{prayerTime.time}</Text>
            {prayerTime.period && <Text style={styles.timePeriod}>{prayerTime.period}</Text>}
          </View>
        </View>

        {info.source && (
          <View style={[styles.sourceBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.timeLabel, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('eidPrayer.sourceLabel')}
            </Text>
            <Text style={[styles.sourceValue, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={2}>
              {info.source}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={[styles.actionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={handleRefreshFromSources}
          disabled={refreshing}
          activeOpacity={0.7}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={EID_MINT} />
          ) : (
            <MaterialCommunityIcons name="refresh" size={16} color={EID_MINT} />
          )}
          <Text style={styles.refreshText} numberOfLines={1}>
            {t('eidPrayer.refreshFromSources')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.detailsBtn}
          onPress={() => router.push({
            pathname: '/seasonal/eid',
            params: {
              prayerTime: info.prayerTime,
              confidence: info.confidence,
              source: info.source || '',
              lastUpdated: info.lastUpdated || '',
            },
          })}
          activeOpacity={0.7}
        >
          <Text style={styles.detailsText}>
            {t('eidPrayer.details')}
          </Text>
          <MaterialCommunityIcons
            name={isRTL ? 'chevron-left' : 'chevron-right'}
            size={18}
            color="rgba(255,255,255,0.72)"
          />
        </TouchableOpacity>
      </View>

      {/* Disclaimer */}
      <View style={[styles.disclaimer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={15} color="rgba(255,255,255,0.68)" />
        <Text style={[styles.disclaimerText, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {t('eidPrayer.disclaimer')}
        </Text>
      </View>

      {dateMismatchNote && (
        <View style={[styles.mismatchNote, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="calendar-alert" size={14} color="#ffc46b" />
          <Text style={[styles.disclaimerText, styles.mismatchText, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {dateMismatchNote}
          </Text>
        </View>
      )}

      {refreshNote && (
        <View
          style={[
            styles.refreshNote,
            refreshNote.tone === 'success' && styles.refreshNoteSuccess,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <MaterialCommunityIcons
            name={refreshNote.tone === 'success' ? 'check-circle-outline' : 'information-outline'}
            size={14}
            color={refreshNote.tone === 'success' ? '#7AE5BC' : 'rgba(255,255,255,0.72)'}
          />
          <Text
            style={[
              styles.disclaimerText,
              { color: refreshNote.tone === 'success' ? '#7AE5BC' : 'rgba(255,255,255,0.78)' },
              { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
            ]}
          >
            {refreshNote.text}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(122,229,188,0.22)',
  },
  surfaceOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  accentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#23C38E',
  },
  headerRow: {
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(122,229,188,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(122,229,188,0.20)',
  },
  titleCol: {
    flex: 1,
    gap: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 25,
    fontFamily: fontBold(),
  },
  countdownPill: {
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(122,229,188,0.13)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(122,229,188,0.24)',
  },
  countdown: {
    color: '#7AE5BC',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fontSemiBold(),
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 30,
    maxWidth: 124,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: fontSemiBold(),
  },
  timePanel: {
    alignItems: 'stretch',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 12,
  },
  timeBox: {
    flex: 0.95,
    justifyContent: 'center',
  },
  sourceBox: {
    flex: 1.15,
    justifyContent: 'center',
  },
  timeLabel: {
    color: 'rgba(255,255,255,0.64)',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fontMedium(),
    marginBottom: 4,
  },
  timeValue: {
    color: '#FFFFFF',
    fontSize: 38,
    lineHeight: 46,
    fontFamily: fontBold(),
    fontVariant: ['tabular-nums'],
  },
  timeValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  timeValueRowRTL: {
    flexDirection: 'row-reverse',
  },
  timePeriod: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 43,
    fontFamily: fontBold(),
  },
  sourceValue: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontFamily: fontSemiBold(),
    lineHeight: 19,
  },
  actionsRow: {
    gap: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  refreshBtn: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(122,229,188,0.36)',
    backgroundColor: 'rgba(122,229,188,0.10)',
  },
  refreshText: {
    color: '#7AE5BC',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: fontSemiBold(),
  },
  detailsBtn: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  detailsText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: fontSemiBold(),
  },
  disclaimer: {
    alignItems: 'flex-start',
    gap: 7,
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  disclaimerText: {
    flex: 1,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontFamily: fontRegular(),
    lineHeight: 18,
  },
  mismatchNote: {
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 8,
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(216,148,22,0.12)',
  },
  mismatchText: {
    color: '#ffc46b',
  },
  refreshNote: {
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 8,
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  refreshNoteSuccess: {
    backgroundColor: 'rgba(122,229,188,0.10)',
  },
});

export default EidPrayerCard;
