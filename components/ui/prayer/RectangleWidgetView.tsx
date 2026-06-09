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
  getPrayerTranslationKey,
} from '@/lib/prayer-times';
import { fontBold, fontSemiBold } from '@/lib/fonts';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { t } from '@/lib/i18n';

import { useIsRTL } from '@/hooks/use-is-rtl';
interface RectangleWidgetViewProps {
  prayerTimes: PrayerTimes | null;
  language?: string;
  isDarkMode?: boolean;
  iconSource?: any;
  timezone?: string;
}

const RectangleWidgetView: React.FC<RectangleWidgetViewProps> = ({
  prayerTimes,
  language = 'ar',
  isDarkMode = false,
  iconSource,
  timezone,
}) => {
  const isRTL = useIsRTL();
  const { fs } = useColors();
  const styles = useScaledStyles(_styles, fs);
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
      setNextPrayer(getNextPrayer(prayerTimes, { timezone }));
      setTimeRemaining(getTimeRemaining(prayerTimes, { timezone }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [prayerTimes, timezone]);

  if (!prayerTimes || !nextPrayer || !timeRemaining) {
    return (
      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="timer-sand" size={40} color={isDarkMode ? '#666' : '#ccc'} />
        </View>
      </View>
    );
  }

  const prayerName = t(getPrayerTranslationKey(nextPrayer.name));
  const pad = (n: number) => String(n).padStart(2, '0');

  const bgColor = isDarkMode ? 'rgba(30,30,32,0.09)' : 'rgba(0,0,0,0.09)';
  const countdownColor = isDarkMode ? '#e0e0e0' : '#081827';
  const labelColor = isDarkMode ? '#aaa' : '#081827';
  const greenColor = '#0d8e62';

  return (
    <View style={styles.wrapper}>
      <View style={[styles.card, { backgroundColor: bgColor }]}>
        <View style={[styles.mainRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Countdown + prayer label - on the right in RTL */}
          <View style={[styles.countdownSection, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.countdownText, { color: countdownColor, textAlign: isRTL ? 'right' : 'left' }]}>
              {pad(timeRemaining.hours)}:{pad(timeRemaining.minutes)}:{pad(timeRemaining.seconds)}
            </Text>
            <Text style={[styles.prayerLabel, { color: labelColor, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('prayer.remainingTimeFor')} {prayerName}
            </Text>
          </View>

          {/* Logo side - on the left in RTL */}
          <View style={[styles.logoSection]}>
            <View style={styles.logoWrap}>
              <Image
                source={iconSource || require('@/assets/images/icons/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text
              style={[styles.appName, { color: greenColor }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {t('common.appName')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const _styles = StyleSheet.create({
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
    gap: 16,
  },
  logoSection: {
    alignItems: 'center',
    gap: 8,
    // Reserve a fixed slot for the logo so Android's flex layout doesn't
    // collapse it when the countdown row gets long (e.g. 04:22:11 + letterSpacing).
    width: 64,
    flexShrink: 0,
  },
  countdownSection: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  countdownText: {
    fontSize: 42,
    fontFamily: fontBold(),
    letterSpacing: 2,
    lineHeight: 52,
  },
  prayerLabel: {
    fontSize: 12,
    fontFamily: fontSemiBold(),
    marginTop: 4,
  },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  logo: {
    width: 48,
    height: 48,
  },
  appName: {
    fontSize: 11,
    fontFamily: fontSemiBold(),
  },
});

export default RectangleWidgetView;
