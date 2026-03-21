// components/ui/prayer/DigitalTypographyView.tsx
// عرض رقمي بخط ديجيتال للعد التنازلي - روح المسلم

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { fontBold, fontMedium, fontRegular } from '@/lib/fonts';

import {
  PrayerTimes,
  PrayerName,
  getNextPrayer,
  getTimeRemaining,
  formatPrayerTime,
  getPrayerIcon,
} from '@/lib/prayer-times';
import { t } from '@/lib/i18n';

import { useIsRTL } from '@/hooks/use-is-rtl';
interface DigitalTypographyViewProps {
  prayerTimes: PrayerTimes | null;
  language?: string;
  isDarkMode?: boolean;
  show24Hour?: boolean;
}

const DigitalTypographyView: React.FC<DigitalTypographyViewProps> = ({
  prayerTimes,
  language = 'ar',
  isDarkMode = false,
  show24Hour = false,
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

  const colonOpacity = useSharedValue(1);

  useEffect(() => {
    colonOpacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

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

  const colonStyle = useAnimatedStyle(() => ({
    opacity: colonOpacity.value,
  }));

  if (!prayerTimes || !nextPrayer || !timeRemaining) {
    return (
      <View style={styles.container}>
        <MaterialCommunityIcons name="timer-sand" size={40} color={isDarkMode ? '#666' : '#ccc'} />
      </View>
    );
  }

  const prayerName = t(`prayer.${nextPrayer.name}`);
  const prayerIcon = getPrayerIcon(nextPrayer.name);
  const pad = (n: number) => String(n).padStart(2, '0');

  const textColor = isDarkMode ? '#fff' : '#1a1a2e';
  const mutedColor = isDarkMode ? '#A8A8AD' : '#8E8E93';
  const accentColor = '#22C55E';

  return (
    <View style={styles.wrapper}>
      {/* Header: icon + next prayer label */}
      <Animated.View entering={FadeIn.duration(500)} style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <MaterialCommunityIcons name={prayerIcon as any} size={20} color={accentColor} />
        <Text style={[styles.prayerLabel, { color: mutedColor }]}>{t('prayer.nextPrayerLabel')}</Text>
      </Animated.View>

      {/* Prayer name */}
      <Text style={[styles.prayerName, { color: textColor }]}>{prayerName}</Text>

      {/* Large digital countdown with Orbitron font */}
      <View style={styles.digitalRow}>
        <Text style={[styles.bigDigit, { color: textColor }]}>{pad(timeRemaining.hours)}</Text>
        <Animated.View style={colonStyle}>
          <Text style={[styles.bigColon, { color: accentColor }]}>:</Text>
        </Animated.View>
        <Text style={[styles.bigDigit, { color: textColor }]}>{pad(timeRemaining.minutes)}</Text>
        <Animated.View style={colonStyle}>
          <Text style={[styles.bigColon, { color: accentColor }]}>:</Text>
        </Animated.View>
        <Text style={[styles.bigDigit, { color: textColor }]}>{pad(timeRemaining.seconds)}</Text>
      </View>

      {/* Adhan time */}
      <View style={[styles.adhanRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <MaterialCommunityIcons name="mosque" size={16} color={accentColor} />
        <Text style={[styles.adhanText, { color: mutedColor }]}>
          {t('prayer.athan')} {formatPrayerTime(nextPrayer.time, show24Hour ?? false)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  prayerLabel: {
    fontSize: 14,
    fontFamily: fontRegular(),
  },
  prayerName: {
    fontSize: 28,
    fontFamily: fontBold(),
    marginBottom: 20,
  },
  digitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  bigDigit: {
    fontSize: 56,
    fontFamily: 'Orbitron-Bold',
    lineHeight: 64,
    minWidth: 80,
    textAlign: 'center',
  },
  bigColon: {
    fontSize: 48,
    fontFamily: 'Orbitron-Bold',
    lineHeight: 60,
    marginHorizontal: 2,
  },
  adhanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adhanText: {
    fontSize: 14,
    fontFamily: fontMedium(),
  },
});

export default DigitalTypographyView;
