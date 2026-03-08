import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { BlurView } from 'expo-blur';

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
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function CircularPrayerClock({
  size = 200,
  totalSeconds,
  remainingSeconds,
  prayerLabel = 'الوقت المتبقي على صلاة الفجر',
  useBlur = false,
  onPress,
}: Props) {
  // Circle radius matching mockup proportions (r=76 in 200x200 viewBox)
  const circleRadius = size * 0.38;
  const strokeWidth = 3;

  const container = (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[styles.wrapper, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G x={size / 2} y={size / 2}>
          {/* Shadow circle (4% opacity) */}
          <Circle
            cx={0}
            cy={0}
            r={circleRadius}
            fill={'rgba(8,24,39,0.04)'}
          />

          {/* Green stroke circle */}
          <Circle
            cx={0}
            cy={0}
            r={circleRadius}
            stroke={'#00a651'}
            strokeWidth={strokeWidth}
            fill={'transparent'}
          />
        </G>
      </Svg>

      {/* Content overlay: Logo + countdown + label */}
      <View style={styles.contentContainer} pointerEvents="none">
        {/* Logo */}
        <Image
          source={require('@/assets/images/icon.png')}
          style={[styles.logo, { width: size * 0.18, height: size * 0.18, borderRadius: size * 0.04 }]}
        />

        {/* Countdown timer */}
        <Text style={[styles.timeText, { fontSize: Math.max(18, size * 0.11) }]}>
          {formatHMS(remainingSeconds)}
        </Text>

        {/* Prayer label */}
        <Text style={[styles.labelText, { fontSize: Math.max(8, size * 0.044) }]}>
          {prayerLabel}
        </Text>
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
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  blurWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  contentContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '70%',
    gap: 4,
  },
  logo: {
    marginBottom: 4,
  },
  timeText: {
    color: '#081827',
    fontFamily: 'Cairo-Bold',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  labelText: {
    color: '#081827',
    fontFamily: 'Cairo-SemiBold',
    textAlign: 'center',
    writingDirection: 'rtl',
    opacity: 0.6,
  },
});
