// components/ui/prayer/GlassWidgetPreview.tsx
// Rounded prayer widget – matches design/mockups/prayer-clock/mockup-clock-rounded.svg

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

import {
  PrayerTimes,
  PrayerName,
  getNextPrayer,
  getTimeRemaining,
} from '@/lib/prayer-times';
import { t } from '@/lib/i18n';

interface GlassWidgetPreviewProps {
  prayerTimes?: PrayerTimes | null;
  isDarkMode?: boolean;
}

export const GlassWidgetPreview: React.FC<GlassWidgetPreviewProps> = ({
  prayerTimes = null,
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
  const prayerName = nextPrayer ? t(`prayer.${nextPrayer.name}`) : 'الفجر';

  const countdownStr = timeRemaining
    ? `${pad(timeRemaining.hours)}:${pad(timeRemaining.minutes)}:${pad(timeRemaining.seconds)}`
    : '00:47:00';

  const textColor = isDarkMode ? '#e0e0e0' : '#081827';

  return (
    <View style={styles.wrapper}>
      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        {/* Logo (static) */}
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
        />

        {/* App name (static) */}
        <Text style={styles.appName}>روح المسلم</Text>

        {/* Countdown timer (dynamic) */}
        <Text style={[styles.countdown, { color: textColor }]}>
          {countdownStr}
        </Text>

        {/* Prayer label (dynamic) */}
        <Text style={[styles.label, { color: textColor, opacity: 0.6 }]}>
          الوقت المتبقي على صلاة {prayerName}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: 200,
    height: 200,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  cardDark: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginBottom: 6,
  },
  appName: {
    fontSize: 10,
    fontFamily: 'Cairo-SemiBold',
    color: '#0f987f',
    marginBottom: 8,
  },
  countdown: {
    fontSize: 28,
    fontFamily: 'Cairo-Bold',
    letterSpacing: 1,
    textAlign: 'center',
    lineHeight: 36,
  },
  label: {
    fontSize: 9,
    fontFamily: 'Cairo-SemiBold',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default GlassWidgetPreview;
