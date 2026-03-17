// components/ui/prayer/PrayerCard.tsx
// كارت الصلاة القادمة مع العد التنازلي - روح المسلم

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

import {
  PrayerTimes,
  PrayerName,
  getNextPrayer,
  getTimeRemaining,
  formatPrayerTime,
  getPrayerIcon,
} from '@/lib/prayer-times';
import { useSettings } from '@/contexts/SettingsContext';
import { useIsRTL } from '@/hooks/use-is-rtl';

const { width } = Dimensions.get('window');

interface PrayerCardProps {
  prayerTimes: PrayerTimes | null;
  hijriDate?: string;
  location?: string;
  language?: string;
  isDarkMode?: boolean;
  show24Hour?: boolean;
}

export const PrayerCard: React.FC<PrayerCardProps> = ({
  prayerTimes,
  hijriDate,
  location,
  language = 'ar',
  isDarkMode = false,
  show24Hour = false,
}) => {
  const { t } = useSettings();
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

  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.5);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    if (!prayerTimes) return;

    const updateCountdown = () => {
      const next = getNextPrayer(prayerTimes);
      setNextPrayer(next);
      const remaining = getTimeRemaining(prayerTimes);
      setTimeRemaining(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [prayerTimes]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  if (!prayerTimes || !nextPrayer) {
    return (
      <View style={styles.container}>
        <BlurView intensity={isDarkMode ? 40 : 60} style={styles.blurContainer}>
          <View style={styles.loadingContainer}>
            <MaterialCommunityIcons
              name="loading"
              size={40}
              color={isDarkMode ? '#fff' : '#2f7659'}
            />
            <Text style={[styles.loadingText, isDarkMode && styles.textLight]}>
              {t('common.loading')}
            </Text>
          </View>
        </BlurView>
      </View>
    );
  }

  const prayerNameLocalized = t(`prayer.${nextPrayer.name}`);
  const prayerIcon = getPrayerIcon(nextPrayer.name);

  return (
    <View style={styles.container}>
      <View
        style={[styles.gradient, { backgroundColor: isDarkMode 
          ? 'rgba(30,30,30,0.85)' 
          : 'rgba(47,118,89,0.85)'
        }]}
      >
        <Animated.View style={[styles.glowEffect, glowAnimatedStyle]}>
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.03)' }]}
          />
        </Animated.View>

        <View style={styles.content}>
          <View style={styles.mainContent}>
            {hijriDate && (
              <View style={[styles.dateContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons name="moon-waning-crescent" size={16} color="#fff" />
                <Text style={styles.dateText}>{hijriDate}</Text>
              </View>
            )}

            <Text style={styles.nextLabel}>
              {t('prayer.nextPrayer')}
            </Text>

            <View style={[styles.prayerInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons
                name={prayerIcon as any}
                size={50}
                color="#fff"
              />
              <View style={styles.prayerDetails}>
                <Text style={styles.prayerName}>{prayerNameLocalized}</Text>
                <Text style={styles.prayerTime}>
                  {formatPrayerTime(nextPrayer.time, show24Hour)}
                </Text>
              </View>
            </View>

            {timeRemaining && (
              <View style={styles.countdownContainer}>
                <Text style={styles.remainingLabel}>
                  {t('prayer.timeRemaining')}
                </Text>
                <Animated.View style={[styles.countdown, pulseAnimatedStyle]}>
                  <CountdownDigit value={timeRemaining.hours} label={t('countdown.hourLabel')} />
                  <Text style={styles.countdownSeparator}>:</Text>
                  <CountdownDigit value={timeRemaining.minutes} label={t('countdown.minuteLabel')} />
                  <Text style={styles.countdownSeparator}>:</Text>
                  <CountdownDigit value={timeRemaining.seconds} label={t('countdown.secondLabel')} />
                </Animated.View>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

interface CountdownDigitProps {
  value: number;
  label: string;
}

const CountdownDigit: React.FC<CountdownDigitProps> = ({ value, label }) => {
  return (
    <View style={styles.digitContainer}>
      <Text style={styles.digitValue}>
        {String(value).padStart(2, '0')}
      </Text>
      <Text style={styles.digitLabel}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  gradient: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  glowEffect: {
    ...StyleSheet.absoluteFillObject,
  },
  blurContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 16,
    color: '#333',
    fontFamily: fontRegular(),
  },
  textLight: {
    color: '#fff',
  },
  content: {
    padding: 20,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 15,
  },
  dateText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: fontMedium(),
  },
  mainContent: {
    alignItems: 'center',
  },
  nextLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: fontRegular(),
    marginBottom: 10,
  },
  prayerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 20,
  },
  prayerDetails: {
    alignItems: 'flex-start',
  },
  prayerName: {
    fontSize: 28,
    color: '#fff',
    fontFamily: fontBold(),
  },
  prayerTime: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: fontSemiBold(),
  },
  countdownContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 20,
    width: '100%',
  },
  remainingLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: fontRegular(),
    marginBottom: 8,
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownSeparator: {
    fontSize: 32,
    color: '#fff',
    fontFamily: fontBold(),
    marginHorizontal: 5,
  },
  digitContainer: {
    alignItems: 'center',
    minWidth: 50,
  },
  digitValue: {
    fontSize: 36,
    color: '#fff',
    fontFamily: fontBold(),
  },
  digitLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: fontRegular(),
    marginTop: -5,
  },
});

export default PrayerCard;
