import React from 'react';
import { Svg, Circle, G, Text } from 'react-native-svg';
import { useColorScheme } from 'react-native';

// Amiri font must be loaded in the app for this to work
const directions = [
  { label: 'N', angle: 0 },
  { label: 'E', angle: 90 },
  { label: 'S', angle: 180 },
  { label: 'W', angle: 270 },
  { label: 'NE', angle: 45 },
  { label: 'SE', angle: 135 },
  { label: 'SW', angle: 225 },
  { label: 'NW', angle: 315 },
];

export const QiblaCompassDial = ({ size = 260 }) => {
  const colorScheme = useColorScheme();
  const dialColor = colorScheme === 'dark' ? '#181C20' : '#F7F7F7';
  const textColor = '#FFF';
  const secondaryText = '#E5E5E5';
  const radius = size / 2;
  const fontSize = size * 0.11;

  return (
    <Svg width={size} height={size}>
      {/* Outer frosted glass circle */}
      <Circle
        cx={radius}
        cy={radius}
        r={radius - 2}
        fill={dialColor}
        opacity={0.85}
      />
      {/* Direction markers */}
      <G>
        {directions.map(({ label, angle }, i) => {
          const isPrimary = label.length === 1;
          const r = radius * 0.8;
          const theta = (angle - 90) * (Math.PI / 180);
          const x = radius + r * Math.cos(theta);
          const y = radius + r * Math.sin(theta);
          return (
            <Text
              key={label}
              x={x}
              y={y + fontSize / 3}
              fontSize={isPrimary ? fontSize : fontSize * 0.7}
              fontFamily="Amiri"
              fontWeight={isPrimary ? 'bold' : 'normal'}
              fill={isPrimary ? textColor : secondaryText}
              textAnchor="middle"
              alignmentBaseline="middle"
              opacity={0.96}
            >
              {label}
            </Text>
          );
        })}
      </G>
      {/* Minimalist tick marks */}
      <G>
        {[...Array(60)].map((_, i) => {
          const angle = (i * 6 - 90) * (Math.PI / 180);
          const inner = radius * 0.88;
          const outer = radius * 0.96;
          const x1 = radius + inner * Math.cos(angle);
          const y1 = radius + inner * Math.sin(angle);
          const x2 = radius + outer * Math.cos(angle);
          const y2 = radius + outer * Math.sin(angle);
          return (
            <Svg.Line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={i % 5 === 0 ? textColor : secondaryText}
              strokeWidth={i % 5 === 0 ? 2 : 1}
              opacity={i % 5 === 0 ? 0.9 : 0.5}
              strokeLinecap="round"
            />
          );
        })}
      </G>
    </Svg>
  );
};
