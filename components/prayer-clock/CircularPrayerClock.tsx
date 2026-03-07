import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, I18nManager, TouchableOpacity } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import Animated, { useSharedValue, useDerivedValue, useAnimatedProps, withTiming } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

const AnimatedCircle = Animated.createAnimatedComponent(Circle as any);

type Props = {
  size?: number;
  totalSeconds: number; // total interval between prayers
  remainingSeconds: number; // seconds remaining until next prayer
  prayerLabel?: string; // Arabic label like 'الوقت المتبقي على صلاة الفجر'
  useBlur?: boolean;
  onPress?: () => void;
};

function formatHMS(secInput: number) {
  const sec = Math.max(0, Math.floor(secInput));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function CircularPrayerClock({
  size = 200,
  totalSeconds,
  remainingSeconds,
  prayerLabel = 'الوقت المتبقي على الصلاة',
  useBlur = false,
  onPress,
}: Props) {
  const radius = (size / 2) - 10; // leave padding for stroke
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;

  const progress = useMemo(() => {
    if (!totalSeconds || totalSeconds <= 0) return 0;
    return Math.max(0, Math.min(1, remainingSeconds / totalSeconds));
  }, [remainingSeconds, totalSeconds]);

  const progressShared = useSharedValue(progress);
  // animate on progress change
  progressShared.value = withTiming(progress, { duration: 400 });

  const animatedProps = useAnimatedProps(() => {
    const offset = circumference * (1 - progressShared.value);
    return {
      strokeDashoffset: offset,
    } as any;
  });

  const container = (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[styles.wrapper, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G x={size / 2} y={size / 2}>
          {/* background circle */}
          <Circle
            cx={0}
            cy={0}
            r={radius}
            stroke={'rgba(0,0,0,0.06)'}
            strokeWidth={strokeWidth}
            fill={'transparent'}
          />

          {/* static ring (track) */}
          <Circle
            cx={0}
            cy={0}
            r={radius}
            stroke={'#e6f3ea'}
            strokeWidth={strokeWidth}
            fill={'transparent'}
          />

          {/* animated progress ring */}
          <AnimatedCircle
            cx={0}
            cy={0}
            r={radius}
            stroke={'#00a651'}
            strokeWidth={strokeWidth}
            strokeLinecap={'round'}
            fill={'transparent'}
            strokeDasharray={`${circumference} ${circumference}`}
            animatedProps={animatedProps}
            rotation={'-90'}
            originX={0}
            originY={0}
          />

          {/* Embedded logo paths (extracted from provided SVG) */}
          <G x={-20} y={-radius + 12} scale={0.9}>
            <Path d="M100.16,74.76c-.51.51-1.37.73-1.89.21l-13.47-13.47c-4.02-4.06-4.14-10.53-.42-14.72,3.75-4.22,10.14-4.88,14.73-1.33,4.54-3.53,10.89-2.91,14.64,1.23s3.72,10.61-.25,14.73l-13.34,13.34Z" fill="#f0ba68" />
            <Path d="M103.86,49.59h-.13c-3,0-5.43,2.43-5.43,5.43s2.43,5.43,5.43,5.43c1.6,0,3.03-.69,4.02-1.78-.84,3.78-4.21,6.61-8.25,6.61-4.66,0-8.45-3.78-8.45-8.45s3.78-8.45,8.45-8.45c1.59,0,3.09.44,4.36,1.21h0Z" fill="#da8040" />
          </G>
        </G>
      </Svg>

      {/* Text overlay */}
      <View style={styles.textContainer} pointerEvents="none">
        <Text style={[styles.timeText, { fontSize: Math.max(18, size * 0.11) }]}>{formatHMS(remainingSeconds)}</Text>
        <Text style={[styles.labelText, { fontSize: Math.max(10, size * 0.06) }]}>{prayerLabel}</Text>
      </View>
    </TouchableOpacity>
  );

  if (useBlur) {
    return (
      <BlurView intensity={40} tint="default" style={[styles.blurWrap, { width: size, height: size, borderRadius: size / 2 }]}>
        {container}
      </BlurView>
    );
  }

  return container;
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 200,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  blurWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
  },
  timeText: {
    color: '#041a22',
    fontFamily: 'Amiri',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  labelText: {
    color: '#476066',
    marginTop: 6,
    fontFamily: 'Cairo',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
