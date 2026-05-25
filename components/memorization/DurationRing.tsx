// components/memorization/DurationRing.tsx
// حلقة دائرية عامة لعرض قيمة (مدة، عدد آيات، …) مع شريط تقدم بأسلوب ساعة الصلاة.

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/use-colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface DurationRingProps {
  /** القيمة الرئيسية المعروضة في الوسط (نص أو رقم) */
  value: number | string;
  topLabel?: string;
  bottomLabel?: string;
  size?: number;
  strokeWidth?: number;
  /** نسبة التقدم 0..1 (مثلاً remaining/initial). الافتراضي 1. */
  progress?: number;
  /** لون القوس النشط (افتراضي colors.text) */
  arcColor?: string;
}

export const DurationRing: React.FC<DurationRingProps> = ({
  value,
  topLabel,
  bottomLabel,
  size = 132,
  strokeWidth = 8,
  progress = 1,
  arcColor,
}) => {
  const colors = useColors();

  const ratio = Math.max(0, Math.min(1, progress));

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // الجزء الفارغ (gap) في الأسفل لإعطاء الإحساس بالقوس المفتوح كما في النموذج
  const gap = circumference * 0.08;
  const maxArc = circumference - gap;

  // أنيميشن خفيف: يبدأ من صفر ويملأ القوس عند التركيب أو تغيّر القيمة.
  const animatedRatio = useSharedValue(0);
  useEffect(() => {
    animatedRatio.value = 0;
    animatedRatio.value = withTiming(ratio, {
      duration: 850,
      easing: Easing.out(Easing.cubic),
    });
  }, [ratio, animatedRatio]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDasharray: [maxArc * animatedRatio.value, circumference] as any,
  }));

  // ابدأ القوس من أعلى يسار قليلًا (مماثل لنموذج Dhuhr)
  const rotation = -125;

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* خلفية القوس */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        {/* القوس النشط */}
        {ratio > 0 && (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={arcColor ?? colors.text}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            animatedProps={animatedProps}
            transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>

      <View style={styles.center} pointerEvents="none">
        {!!topLabel && (
          <Text
            style={[
              styles.topLabel,
              { color: colors.textLight, fontSize: size * 0.1 },
            ]}
            numberOfLines={1}
          >
            {topLabel}
          </Text>
        )}
        <Text
          style={[
            styles.value,
            { color: colors.text, fontSize: size * 0.34 },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
        {!!bottomLabel && (
          <Text
            style={[
              styles.bottomLabel,
              { color: colors.textLight, fontSize: size * 0.1 },
            ]}
            numberOfLines={1}
          >
            {bottomLabel}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topLabel: {
    fontFamily: 'Rubik-Regular',
    marginBottom: 2,
  },
  value: {
    fontFamily: 'Rubik-Bold',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  bottomLabel: {
    fontFamily: 'Rubik-Regular',
    marginTop: 2,
  },
});

export default DurationRing;
