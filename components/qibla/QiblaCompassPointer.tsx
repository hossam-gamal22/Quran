import React from 'react';
import { Svg, G, Path, Circle, Rect, Defs } from 'react-native-svg';

// The pointer is a minimalist Kaaba-inspired arrow, centered for perfect rotation
export const QiblaCompassPointer = ({ size = 90, color = '#00FF7A', glow = false }) => {
  const radius = size / 2;
  // Kaaba-inspired pointer: a geometric arrow with a square base
  // Centered at (radius, radius)
  return (
    <Svg width={size} height={size}>
      <G>
        {/* Glow effect when aligned */}
        {glow && (
          <Circle
            cx={radius}
            cy={radius}
            r={radius * 0.7}
            fill={color}
            opacity={0.18}
          />
        )}
        {/* Pointer body */}
        <Path
          d={`M${radius},${radius - size * 0.38}
              L${radius - size * 0.13},${radius + size * 0.18}
              L${radius},${radius + size * 0.08}
              L${radius + size * 0.13},${radius + size * 0.18}
              Z`}
          fill={color}
          stroke="#FFF"
          strokeWidth={2.5}
          opacity={0.98}
        />
        {/* Kaaba base (minimalist square) */}
        <Rect
          x={radius - size * 0.09}
          y={radius + size * 0.18}
          width={size * 0.18}
          height={size * 0.13}
          rx={size * 0.03}
          fill="#222"
          stroke="#FFF"
          strokeWidth={1.5}
          opacity={0.96}
        />
        {/* SVG filter for glow - not supported in RN, using opacity fallback */}
        {glow && (
          <Circle
            cx={radius}
            cy={radius}
            r={radius * 0.5}
            fill={color}
            opacity={0.12}
          />
        )}
      </G>
    </Svg>
  );
};
