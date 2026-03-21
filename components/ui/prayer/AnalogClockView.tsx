// components/ui/prayer/AnalogClockView.tsx
// عرض ساعة تناظرية للعد التنازلي - روح المسلم

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Line, G, Text as SvgText, Path } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { fontBold, fontRegular } from '@/lib/fonts';

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
const { width } = Dimensions.get('window');

interface AnalogClockViewProps {
  prayerTimes: PrayerTimes | null;
  language?: string;
  isDarkMode?: boolean;
  show24Hour?: boolean;
}

const CLOCK_SIZE = Math.min(width * 0.7, 280);
const CENTER = CLOCK_SIZE / 2;
const RADIUS = CLOCK_SIZE / 2 - 16;

const AnalogClockView: React.FC<AnalogClockViewProps> = ({
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
  const [currentTime, setCurrentTime] = useState(new Date());

  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
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
      setCurrentTime(new Date());
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [prayerTimes]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  if (!prayerTimes || !nextPrayer || !timeRemaining) {
    return (
      <View style={[styles.container, { width: CLOCK_SIZE, height: CLOCK_SIZE }]}>
        <MaterialCommunityIcons name="timer-sand" size={40} color={isDarkMode ? '#666' : '#ccc'} />
      </View>
    );
  }

  const hours = currentTime.getHours() % 12;
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();

  const hourAngle = (hours + minutes / 60) * 30; // 360/12 = 30 degrees per hour
  const minuteAngle = (minutes + seconds / 60) * 6; // 360/60 = 6 degrees per minute
  const secondAngle = seconds * 6;

  const prayerName = t(`prayer.${nextPrayer.name}`);
  const prayerIcon = getPrayerIcon(nextPrayer.name);
  const pad = (n: number) => String(n).padStart(2, '0');

  // Hour markers
  const hourMarkers = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const isMain = i % 3 === 0;
    const outerR = RADIUS - 2;
    const innerR = isMain ? RADIUS - 14 : RADIUS - 8;
    return {
      x1: CENTER + Math.cos(angle) * innerR,
      y1: CENTER + Math.sin(angle) * innerR,
      x2: CENTER + Math.cos(angle) * outerR,
      y2: CENTER + Math.sin(angle) * outerR,
      isMain,
    };
  });

  // Clock numerals (always English/Western digits)
  const clockNums = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
  const numberPositions = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const r = RADIUS - 26;
    return {
      x: CENTER + Math.cos(angle) * r,
      y: CENTER + Math.sin(angle) * r + 5,
      text: clockNums[i],
    };
  });

  const handEnd = (angle: number, length: number) => {
    const rad = (angle - 90) * (Math.PI / 180);
    return {
      x: CENTER + Math.cos(rad) * length,
      y: CENTER + Math.sin(rad) * length,
    };
  };

  const hourHand = handEnd(hourAngle, RADIUS * 0.5);
  const minuteHand = handEnd(minuteAngle, RADIUS * 0.72);
  const secondHand = handEnd(secondAngle, RADIUS * 0.78);

  // Prayer time position on clock face
  const [prayerHour, prayerMinute] = nextPrayer.time.split(':').map(Number);
  const prayerHour12 = prayerHour % 12;
  const prayerAngleRad = ((prayerHour12 + prayerMinute / 60) * 30 - 90) * (Math.PI / 180);
  const prayerMarkerR = RADIUS - 6;
  const prayerMarkerX = CENTER + Math.cos(prayerAngleRad) * prayerMarkerR;
  const prayerMarkerY = CENTER + Math.sin(prayerAngleRad) * prayerMarkerR;

  const faceColor = isDarkMode ? '#1a1f2e' : '#fff';
  const borderColor = isDarkMode ? '#3a4050' : '#e0e0e0';
  const textColor = isDarkMode ? '#fff' : '#333';
  const mutedColor = isDarkMode ? '#A8A8AD' : '#8E8E93';
  const accentColor = '#22C55E';

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { width: CLOCK_SIZE, height: CLOCK_SIZE }]}>
        <Svg width={CLOCK_SIZE} height={CLOCK_SIZE}>
          {/* Clock face */}
          <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill={faceColor} stroke={borderColor} strokeWidth={2} />

          {/* Hour markers */}
          {hourMarkers.map((m, i) => (
            <Line
              key={i}
              x1={m.x1}
              y1={m.y1}
              x2={m.x2}
              y2={m.y2}
              stroke={m.isMain ? textColor : mutedColor}
              strokeWidth={m.isMain ? 2.5 : 1.5}
              strokeLinecap="round"
            />
          ))}

          {/* Clock numbers */}
          {numberPositions.map((p, i) => (
            <SvgText
              key={i}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              fontSize={13}
              fontFamily={fontBold()}
              fill={textColor}
            >
              {p.text}
            </SvgText>
          ))}

          {/* Prayer time marker — mosque icon */}
          <Circle cx={prayerMarkerX} cy={prayerMarkerY} r={12} fill={accentColor} opacity={0.18} />
          <Circle cx={prayerMarkerX} cy={prayerMarkerY} r={9} fill={accentColor} opacity={0.3} />
          <SvgText
            x={prayerMarkerX}
            y={prayerMarkerY + 5}
            textAnchor="middle"
            fontSize={13}
            fill="#fff"
          >
            🕌
          </SvgText>

          {/* Hour hand */}
          <Line
            x1={CENTER}
            y1={CENTER}
            x2={hourHand.x}
            y2={hourHand.y}
            stroke={textColor}
            strokeWidth={4}
            strokeLinecap="round"
          />

          {/* Minute hand */}
          <Line
            x1={CENTER}
            y1={CENTER}
            x2={minuteHand.x}
            y2={minuteHand.y}
            stroke={textColor}
            strokeWidth={2.5}
            strokeLinecap="round"
          />

          {/* Second hand */}
          <Line
            x1={CENTER}
            y1={CENTER}
            x2={secondHand.x}
            y2={secondHand.y}
            stroke={accentColor}
            strokeWidth={1.5}
            strokeLinecap="round"
          />

          {/* Center dot */}
          <Circle cx={CENTER} cy={CENTER} r={5} fill={accentColor} />
          <Circle cx={CENTER} cy={CENTER} r={2.5} fill="#fff" />
        </Svg>
      </View>

      {/* Prayer info below clock */}
      <View style={styles.infoContainer}>
        <Animated.View style={[styles.iconRow, pulseStyle, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name={prayerIcon as any} size={22} color={accentColor} />
          <Text style={[styles.prayerName, { color: textColor }]}>{prayerName}</Text>
        </Animated.View>

        <Text style={[styles.countdown, { color: textColor }]}>
          {pad(timeRemaining.hours)}:{pad(timeRemaining.minutes)}:{pad(timeRemaining.seconds)}
        </Text>

        <Text style={[styles.adhanTime, { color: mutedColor }]}>
          {t('prayer.athan')} {formatPrayerTime(nextPrayer.time, show24Hour ?? false)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  infoContainer: {
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prayerName: {
    fontSize: 18,
    fontFamily: fontBold(),
  },
  countdown: {
    fontSize: 28,
    fontFamily: fontBold(),
    letterSpacing: 2,
  },
  adhanTime: {
    fontSize: 13,
    fontFamily: fontRegular(),
  },
});

export default AnalogClockView;
