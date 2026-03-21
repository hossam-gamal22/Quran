// components/ui/prayer/LargeWidgetVariants.tsx
// Large prayer widget – matches design/mockups/prayer-clock/mockup-clock-large.svg

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

import {
  PrayerTimes,
  PrayerName,
  getNextPrayer,
  getTimeRemaining,
  formatPrayerTime,
} from '@/lib/prayer-times';
import { fontBold, fontSemiBold } from '@/lib/fonts';
import { t } from '@/lib/i18n';

import { useIsRTL } from '@/hooks/use-is-rtl';
interface LargeWidgetVariantsProps {
  prayerTimes?: PrayerTimes | null;
  isDarkMode?: boolean;
  show24Hour?: boolean;
  iconSource?: any;
}

const PRAYER_KEYS: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

const LargeWidgetVariants: React.FC<LargeWidgetVariantsProps> = ({
  prayerTimes = null,
  isDarkMode = false,
  show24Hour = false,
  iconSource,
}) => {
  const isRTL = useIsRTL();
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [nextPrayer, setNextPrayer] = useState<{
    name: PrayerName;
    time: string;
  } | null>(null);

  useEffect(() => {
    if (!prayerTimes) return;
    const update = () => {
      setNextPrayer(getNextPrayer(prayerTimes));
      setTimeRemaining(getTimeRemaining(prayerTimes));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [prayerTimes]);

  const pad = (n: number) => String(n).padStart(2, '0');
  const nextName = nextPrayer?.name ?? 'fajr';
  const prayerName = t(`prayer.${nextName}`);

  const countdownStr = timeRemaining
    ? `${pad(timeRemaining.hours)}:${pad(timeRemaining.minutes)}:${pad(timeRemaining.seconds)}`
    : '00:47:00';

  const textColor = isDarkMode ? '#e0e0e0' : '#081827';
  const mutedColor = isDarkMode ? '#C8C8CC' : 'rgba(8,24,39,0.6)';

  // Build schedule from prayerTimes
  const schedule = PRAYER_KEYS.map((key) => ({
    key,
    name: t(`prayer.${key}`),
    time: prayerTimes ? prayerTimes[key] : '--:--',
    isNext: key === nextName,
  }));

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Top section: Countdown (left) + Logo (right) */}
      <View style={[styles.topRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {/* Left: Countdown + label */}
        <View style={styles.topLeft}>
          <Text style={[styles.countdown, { color: textColor }]}>{countdownStr}</Text>
          <Text style={[styles.topLabel, { color: mutedColor }]}>
            {t('prayer.remainingTimeForNextPrayer')}
          </Text>
        </View>

        {/* Right: Logo (static) */}
        <View style={[styles.topRight]}>
          <Image
            source={iconSource || require('@/assets/images/icons/icon.png')}
            style={styles.logo}
          />
          <Text style={styles.appName}>{t('common.appName')}</Text>
        </View>
      </View>

      {/* Current prayer bar (green bordered) */}
      <View style={[styles.currentBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {/* Time pill (left) */}
        <View style={[styles.currentTimePill]}>
          <Text style={styles.currentTimeText}>{countdownStr}</Text>
        </View>
        {/* Prayer name (right) */}
        <Text style={[styles.currentPrayerName, { textAlign: isRTL ? 'right' : 'left' }]}>{t('prayer.salahPrefix')} {prayerName}</Text>
      </View>

      {/* Prayer schedule rows */}
      {schedule.map((prayer) => (
        <View key={prayer.key} style={[styles.prayerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Time pill */}
          <View style={[
            styles.timePill,
            prayer.isNext ? styles.timePillActive : styles.timePillInactive,
          ]}>
            <Text style={styles.timePillText}>
              {prayer.time !== '--:--' ? formatPrayerTime(prayer.time, show24Hour) : '--:--'}
            </Text>
          </View>
          {/* Prayer name */}
          <Text style={[styles.prayerNameText, { color: textColor, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('prayer.salahPrefix')} {prayer.name}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.09)',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  containerDark: {
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  topLeft: {
    flex: 1,
  },
  countdown: {
    fontSize: 32,
    fontFamily: fontBold(),
    letterSpacing: 1,
    lineHeight: 40,
  },
  topLabel: {
    fontSize: 9,
    fontFamily: fontSemiBold(),
    marginTop: 2,
  },
  topRight: {
    alignItems: 'center',
  },
  logo: {
    width: 30,
    height: 30,
    borderRadius: 8,
  },
  appName: {
    fontSize: 8,
    fontFamily: fontSemiBold(),
    color: '#22C55E',
    marginTop: 3,
  },
  currentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(8,24,39,0.17)',
    borderWidth: 1,
    borderColor: '#00a651',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  currentTimePill: {
    backgroundColor: '#00a651',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  currentTimeText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: fontBold(),
  },
  currentPrayerName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fontSemiBold(),
    flex: 1,
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 12,
  },
  timePill: {
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 12,
    minWidth: 68,
    alignItems: 'center',
  },
  timePillActive: {
    backgroundColor: 'rgba(15,152,127,0.9)',
  },
  timePillInactive: {
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  timePillText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: fontBold(),
  },
  prayerNameText: {
    fontSize: 16,
    fontFamily: fontSemiBold(),
    flex: 1,
  },
});

export default LargeWidgetVariants;
