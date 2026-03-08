// components/ui/prayer/CountdownTimer.tsx
// مؤقت العد التنازلي الدائري - روح المسلم

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  useAnimatedStyle,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  PrayerTimes,
  PrayerName,
  getNextPrayer,
  getTimeRemaining,
  formatTime12h,
  getPrayerIcon,
} from '@/lib/prayer-times';
import { t } from '@/lib/i18n';

const { width } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ========================================
// الأنواع
// ========================================

interface CountdownTimerProps {
  prayerTimes: PrayerTimes | null;
  size?: number;
  strokeWidth?: number;
  language?: string;
  isDarkMode?: boolean;
  primaryColor?: string;
  secondaryColor?: string;
  variant?: 'classic' | 'creative';
}

// ========================================
// المكون الرئيسي
// ========================================

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  prayerTimes,
  size = width * 0.6,
  strokeWidth = 12,
  language = 'ar',
  isDarkMode = false,
  primaryColor = '#2f7659',
  secondaryColor = '#4ade80',
  variant = 'creative',
}) => {
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
  } | null>(null);
  const [nextPrayer, setNextPrayer] = useState<{
    name: PrayerName;
    time: string;
  } | null>(null);
  const [totalDuration, setTotalDuration] = useState<number>(0);

  // حساب أبعاد الدائرة
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // القيم المتحركة
  const progress = useSharedValue(0);
  const pulseOpacity = useSharedValue(1);
  const secondsRotation = useSharedValue(0);

  // أنيميشن النبض
  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  // تحديث العد التنازلي
  useEffect(() => {
    if (!prayerTimes) return;

    const updateCountdown = () => {
      const next = getNextPrayer(prayerTimes);
      setNextPrayer(next);

      const remaining = getTimeRemaining(prayerTimes);
      setTimeRemaining(remaining);

      if (remaining) {
        // حساب المدة الكلية (أول مرة فقط)
        if (totalDuration === 0 || next?.name !== nextPrayer?.name) {
          setTotalDuration(remaining.totalSeconds);
        }

        // حساب نسبة التقدم
        const progressValue = totalDuration > 0
          ? 1 - (remaining.totalSeconds / totalDuration)
          : 0;
        
        progress.value = withTiming(progressValue, {
          duration: 500,
          easing: Easing.linear,
        });

        // تدوير عقرب الثواني
        secondsRotation.value = (remaining.seconds / 60) * 360;
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [prayerTimes, totalDuration]);

  // خصائص الدائرة المتحركة
  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  // نمط النبض
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // نمط عقرب الثواني
  const secondsHandStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -1.5 },
      { translateY: -radius * 0.3 },
      { rotate: `${secondsRotation.value}deg` },
    ],
  }));

  // حالة التحميل
  if (!prayerTimes || !nextPrayer || !timeRemaining) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons
            name="timer-sand"
            size={50}
            color={isDarkMode ? '#666' : '#ccc'}
          />
        </View>
      </View>
    );
  }

  const prayerNameLocalized = t(`prayer.${nextPrayer.name}`);
  const prayerIcon = getPrayerIcon(nextPrayer.name);

  const formatHMS = (t: typeof timeRemaining) => {
    if (!t) return '00:00:00';
    const h = String(t.hours).padStart(2, '0');
    const m = String(t.minutes).padStart(2, '0');
    const s = String(t.seconds).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* الدائرة الخلفية */}
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={primaryColor} />
            <Stop offset="100%" stopColor={secondaryColor} />
          </LinearGradient>
        </Defs>

        {/* الدائرة الخلفية */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={isDarkMode ? '#333' : '#e0e0e0'}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* دائرة التقدم */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedCircleProps}
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>

      {/* المحتوى الداخلي */}
      <View style={styles.innerContent}>
        {variant === 'creative' ? (
          <>
            <Animated.View style={[styles.iconContainer, pulseStyle]}>
              <MaterialCommunityIcons
                name={prayerIcon as any}
                size={36}
                color={primaryColor}
              />
            </Animated.View>

            <Text style={[styles.prayerNameCreative, isDarkMode && styles.textLight]}>
              {prayerNameLocalized}
            </Text>

            <Text style={[styles.bigTime, isDarkMode && styles.textLight]}>
              {formatHMS(timeRemaining)}
            </Text>

            <Text style={[styles.subtitle, isDarkMode && styles.textMuted]}>باقي على الأذان</Text>

            <Text style={[styles.adhanTimeCreative, isDarkMode && styles.textMuted]}>
              {formatTime12h(nextPrayer.time)}
            </Text>
          </>
        ) : (
          <>
            {/* أيقونة الصلاة */}
            <Animated.View style={[styles.iconContainer, pulseStyle]}>
              <MaterialCommunityIcons
                name={prayerIcon as any}
                size={32}
                color={primaryColor}
              />
            </Animated.View>

            {/* اسم الصلاة */}
            <Text style={[styles.prayerName, isDarkMode && styles.textLight]}>
              {prayerNameLocalized}
            </Text>

            {/* الوقت المتبقي */}
            <View style={styles.timeContainer}>
              <TimeDigit value={timeRemaining.hours} label="س" isDarkMode={isDarkMode} />
              <Text style={[styles.timeSeparator, isDarkMode && styles.textLight]}>:</Text>
              <TimeDigit value={timeRemaining.minutes} label="د" isDarkMode={isDarkMode} />
              <Text style={[styles.timeSeparator, isDarkMode && styles.textLight]}>:</Text>
              <TimeDigit value={timeRemaining.seconds} label="ث" isDarkMode={isDarkMode} />
            </View>

            {/* وقت الأذان */}
            <Text style={[styles.adhanTime, isDarkMode && styles.textMuted]}>
              {formatTime12h(nextPrayer.time)}
            </Text>
          </>
        )}
      </View>

      {/* عقرب الثواني */}
      <Animated.View
        style={[
          styles.secondsHand,
          secondsHandStyle,
          { backgroundColor: secondaryColor },
        ]}
      />

      {/* النقطة المركزية */}
      <View style={[styles.centerDot, { backgroundColor: primaryColor }]} />
    </View>
  );
};

// ========================================
// مكون رقم الوقت
// ========================================

interface TimeDigitProps {
  value: number;
  label: string;
  isDarkMode: boolean;
}

const TimeDigit: React.FC<TimeDigitProps> = ({ value, label, isDarkMode }) => {
  return (
    <View style={styles.digitContainer}>
      <Text style={[styles.digitValue, isDarkMode && styles.textLight]}>
        {String(value).padStart(2, '0')}
      </Text>
      <Text style={[styles.digitLabel, isDarkMode && styles.textMuted]}>
        {label}
      </Text>
    </View>
  );
};

// ========================================
// الأنماط
// ========================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  svg: {
    position: 'absolute',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  prayerName: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: '#333',
    marginBottom: 4,
  },
  prayerNameCreative: {
    fontSize: 22,
    fontFamily: 'Cairo-Bold',
    color: '#e6fff6',
    marginBottom: 6,
  },
  bigTime: {
    fontSize: 56,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 6,
  },
  adhanTimeCreative: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 8,
  },
  textLight: {
    color: '#fff',
  },
  textMuted: {
    color: '#999',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSeparator: {
    fontSize: 28,
    fontFamily: 'Cairo-Bold',
    color: '#333',
    marginHorizontal: 2,
  },
  digitContainer: {
    alignItems: 'center',
    minWidth: 40,
  },
  digitValue: {
    fontSize: 28,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  digitLabel: {
    fontSize: 10,
    fontFamily: 'Cairo-Regular',
    color: '#666',
    marginTop: -4,
  },
  adhanTime: {
    fontSize: 14,
    fontFamily: 'Cairo-Medium',
    color: '#666',
    marginTop: 8,
  },
  secondsHand: {
    position: 'absolute',
    width: 3,
    height: '15%',
    borderRadius: 1.5,
  },
  centerDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default CountdownTimer;
