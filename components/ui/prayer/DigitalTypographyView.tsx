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

import {
  PrayerTimes,
  PrayerName,
  getNextPrayer,
  getTimeRemaining,
  formatTime12h,
  getPrayerIcon,
} from '@/lib/prayer-times';
import { t } from '@/lib/i18n';

interface DigitalTypographyViewProps {
  prayerTimes: PrayerTimes | null;
  language?: string;
  isDarkMode?: boolean;
}

const DigitalTypographyView: React.FC<DigitalTypographyViewProps> = ({
  prayerTimes,
  language = 'ar',
  isDarkMode = false,
}) => {
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
  const mutedColor = isDarkMode ? '#666' : '#aaa';
  const accentColor = '#2f7659';

  return (
    <View style={styles.wrapper}>
      {/* Header: icon + next prayer label */}
      <Animated.View entering={FadeIn.duration(500)} style={styles.headerRow}>
        <MaterialCommunityIcons name={prayerIcon as any} size={20} color={accentColor} />
        <Text style={[styles.prayerLabel, { color: mutedColor }]}>الصلاة القادمة</Text>
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
      <View style={styles.adhanRow}>
        <MaterialCommunityIcons name="mosque" size={16} color={accentColor} />
        <Text style={[styles.adhanText, { color: mutedColor }]}>
          الأذان {formatTime12h(nextPrayer.time)}
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
    gap: 6,
    marginBottom: 4,
  },
  prayerLabel: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
  },
  prayerName: {
    fontSize: 28,
    fontFamily: 'Cairo-Bold',
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
    gap: 6,
  },
  adhanText: {
    fontSize: 14,
    fontFamily: 'Cairo-Medium',
  },
});

export default DigitalTypographyView;
