// components/ui/prayer/PrayerCard.tsx
// كارت الصلاة القادمة مع العد التنازلي - روح المسلم

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  formatTime12h,
  getPrayerNameAr,
  getPrayerIcon,
} from '@/lib/prayer-times';
import { t } from '@/lib/i18n';

const { width } = Dimensions.get('window');

// ========================================
// الأنواع
// ========================================

interface PrayerCardProps {
  prayerTimes: PrayerTimes | null;
  hijriDate?: string;
  location?: string;
  language?: string;
  isDarkMode?: boolean;
}

// ========================================
// المكون الرئيسي
// ========================================

export const PrayerCard: React.FC<PrayerCardProps> = ({
  prayerTimes,
  hijriDate,
  location,
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

  // أنيميشن النبض
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.5);

  useEffect(() => {
    // أنيميشن النبض للوقت
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // أنيميشن التوهج
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  // تحديث العد التنازلي كل ثانية
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

  // حالة التحميل
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
              {t('ui.message.loading', language)}
            </Text>
          </View>
        </BlurView>
      </View>
    );
  }

  const prayerNameAr = getPrayerNameAr(nextPrayer.name);
  const prayerNameLocalized = t(`ui.prayer.${nextPrayer.name}`, language);
  const prayerIcon = getPrayerIcon(nextPrayer.name);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDarkMode 
          ? ['#1a2a3a', '#0d1520'] 
          : ['#2f7659', '#1e5a3f']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* تأثير التوهج */}
        <Animated.View style={[styles.glowEffect, glowAnimatedStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.1)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* المحتوى */}
        <View style={styles.content}>
          {/* الصف العلوي: التاريخ والموقع */}
          <View style={styles.topRow}>
            {hijriDate && (
              <View style={styles.dateContainer}>
                <MaterialCommunityIcons name="calendar-islamic" size={16} color="#fff" />
                <Text style={styles.dateText}>{hijriDate}</Text>
              </View>
            )}
            {location && (
              <View style={styles.locationContainer}>
                <MaterialCommunityIcons name="map-marker" size={16} color="#fff" />
                <Text style={styles.locationText}>{location}</Text>
              </View>
            )}
          </View>

          {/* الصلاة القادمة */}
          <View style={styles.mainContent}>
            <Text style={styles.nextLabel}>
              {t('ui.prayer.nextPrayer', language)}
            </Text>

            <View style={styles.prayerInfo}>
              <MaterialCommunityIcons
                name={prayerIcon as any}
                size={50}
                color="#fff"
              />
              <View style={styles.prayerDetails}>
                <Text style={styles.prayerName}>{prayerNameLocalized}</Text>
                <Text style={styles.prayerTime}>
                  {formatTime12h(nextPrayer.time)}
                </Text>
              </View>
            </View>

            {/* العد التنازلي */}
            {timeRemaining && (
              <View style={styles.countdownContainer}>
                <Text style={styles.remainingLabel}>
                  {t('ui.prayer.timeRemaining', language)}
                </Text>
                <Animated.View style={[styles.countdown, pulseAnimatedStyle]}>
                  <CountdownDigit value={timeRemaining.hours} label="س" />
                  <Text style={styles.countdownSeparator}>:</Text>
                  <CountdownDigit value={timeRemaining.minutes} label="د" />
                  <Text style={styles.countdownSeparator}>:</Text>
                  <CountdownDigit value={timeRemaining.seconds} label="ث" />
                </Animated.View>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

// ========================================
// مكون رقم العد التنازلي
// ========================================

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

// ========================================
// الأنماط
// ========================================

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
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
    fontFamily: 'Cairo-Regular',
  },
  textLight: {
    color: '#fff',
  },
  content: {
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dateText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Cairo-Medium',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  locationText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Cairo-Medium',
  },
  mainContent: {
    alignItems: 'center',
  },
  nextLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Cairo-Regular',
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
    fontFamily: 'Cairo-Bold',
  },
  prayerTime: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Cairo-SemiBold',
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
    fontFamily: 'Cairo-Regular',
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
    fontFamily: 'Cairo-Bold',
    marginHorizontal: 5,
  },
  digitContainer: {
    alignItems: 'center',
    minWidth: 50,
  },
  digitValue: {
    fontSize: 36,
    color: '#fff',
    fontFamily: 'Cairo-Bold',
  },
  digitLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Cairo-Regular',
    marginTop: -5,
  },
});

export default PrayerCard;
