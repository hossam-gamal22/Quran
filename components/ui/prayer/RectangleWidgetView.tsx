// components/ui/prayer/RectangleWidgetView.tsx
// Rectangle prayer widget – matches design/mockups/prayer-clock/mockup-clock-rectangle.svg

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  PrayerTimes,
  PrayerName,
  getNextPrayer,
  getTimeRemaining,
} from '@/lib/prayer-times';
import { t } from '@/lib/i18n';

interface RectangleWidgetViewProps {
  prayerTimes: PrayerTimes | null;
  language?: string;
  isDarkMode?: boolean;
}

const RectangleWidgetView: React.FC<RectangleWidgetViewProps> = ({
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

  if (!prayerTimes || !nextPrayer || !timeRemaining) {
    return (
      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="timer-sand" size={40} color={isDarkMode ? '#666' : '#ccc'} />
        </View>
      </View>
    );
  }

  const prayerName = t(`prayer.${nextPrayer.name}`);
  const pad = (n: number) => String(n).padStart(2, '0');

  const bgColor = isDarkMode ? 'rgba(30,30,32,0.09)' : 'rgba(0,0,0,0.09)';
  const countdownColor = isDarkMode ? '#e0e0e0' : '#081827';
  const labelColor = isDarkMode ? '#aaa' : '#081827';
  const greenColor = '#0f987f';

  return (
    <View style={styles.wrapper}>
      <View style={[styles.card, { backgroundColor: bgColor }]}>
        <View style={styles.mainRow}>
          {/* Left side: Countdown + prayer label */}
          <View style={styles.leftSection}>
            <Text style={[styles.countdownText, { color: countdownColor }]}>
              {pad(timeRemaining.hours)}:{pad(timeRemaining.minutes)}:{pad(timeRemaining.seconds)}
            </Text>
            <Text style={[styles.prayerLabel, { color: labelColor }]}>
              الوقت المتبقي على صلاة {prayerName}
            </Text>
          </View>

          {/* Right side: App logo + app name (static) */}
          <View style={styles.rightSection}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logo}
            />
            <Text style={[styles.appName, { color: greenColor }]}>روح المسلم</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  card: {
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
    minHeight: 150,
    justifyContent: 'center',
  },
  cardDark: {
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  countdownText: {
    fontSize: 42,
    fontFamily: 'Cairo-Bold',
    letterSpacing: 2,
    lineHeight: 52,
  },
  prayerLabel: {
    fontSize: 12,
    fontFamily: 'Cairo-SemiBold',
    marginTop: 4,
  },
  rightSection: {
    alignItems: 'center',
    marginLeft: 16,
    gap: 6,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  appName: {
    fontSize: 11,
    fontFamily: 'Cairo-SemiBold',
  },
});

export default RectangleWidgetView;
