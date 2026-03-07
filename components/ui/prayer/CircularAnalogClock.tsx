import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Line, G } from 'react-native-svg';

interface CircularAnalogClockProps {
  size?: number;
  timeLabel?: string; // display the next prayer time inside
  percent?: number; // optional percent to show hand position (0..1)
}

const CircularAnalogClock: React.FC<CircularAnalogClockProps> = ({ size = 120, timeLabel = '04:12', percent = 0.25 }) => {
  const radius = size / 2;
  const cx = radius;
  const cy = radius;

  // compute angle for minute/second style minimalistic hand based on percent
  const angle = useMemo(() => 360 * percent - 90, [percent]);
  const rad = (angle * Math.PI) / 180;
  const handLength = radius * 0.72;
  const hx = cx + Math.cos(rad) * handLength;
  const hy = cy + Math.sin(rad) * handLength;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G>
          <Circle cx={cx} cy={cy} r={radius} fill={'rgba(0,0,0,0.12)'} />
          <Circle cx={cx} cy={cy} r={radius - 6} fill={'rgba(255,255,255,0.02)'} stroke={'rgba(255,255,255,0.25)'} strokeWidth={0.5} />
          {/* minute/remaining hand */}
          <Line x1={cx} y1={cy} x2={hx} y2={hy} stroke={'#ffffff'} strokeWidth={3} strokeLinecap="round" opacity={0.95} />
          {/* small central pivot */}
          <Circle cx={cx} cy={cy} r={4} fill={'#ffffff'} />
        </G>
      </Svg>
      <View style={styles.innerLabel} pointerEvents="none">
        <Text style={styles.timeText}>{timeLabel}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  innerLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Cairo-ExtraLight',
  },
});

export default CircularAnalogClock;
