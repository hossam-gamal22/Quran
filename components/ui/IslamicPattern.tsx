// components/ui/IslamicPattern.tsx
// زخرفة إسلامية هندسية — مكون مشترك SVG قابل لإعادة الاستخدام

import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, {
  G, Path, Circle, Rect, Polygon,
  Defs, RadialGradient, Stop,
} from 'react-native-svg';

const TILE = 38;
const DEFAULT_STROKE = '#C9A844';
const DEFAULT_BG = '#091E12';

/** 8-pointed star corner ornament */
const StarCorner = ({ x, y, stroke, bg }: { x: number; y: number; stroke: string; bg: string }) => (
  <G transform={`translate(${x},${y})`}>
    <Rect x={-6} y={-6} width={12} height={12} fill={stroke} opacity={0.9} />
    <Rect x={-6} y={-6} width={12} height={12} fill={stroke} opacity={0.9} transform="rotate(45)" />
    <Rect x={-3.5} y={-3.5} width={7} height={7} fill={bg} />
    <Rect x={-2} y={-2} width={4} height={4} fill={stroke} opacity={0.6} transform="rotate(45)" />
  </G>
);

interface IslamicPatternProps {
  w: number;
  h: number;
  /** Stroke/accent color for the pattern. Defaults to gold (#C9A844). */
  strokeColor?: string;
  /** Background fill for star corners. Defaults to dark green (#091E12). */
  bgColor?: string;
  /** Radial glow center color. Defaults to '#1E6040'. */
  glowColor?: string;
  /** Whether to show the radial glow layer. Defaults to true. */
  showGlow?: boolean;
}

/** Full SVG Islamic geometric pattern overlay — absoluteFill, pointerEvents none */
export const IslamicPatternOverlay = ({
  w,
  h,
  strokeColor = DEFAULT_STROKE,
  bgColor = DEFAULT_BG,
  glowColor = '#1E6040',
  showGlow = true,
}: IslamicPatternProps) => {
  const cols = Math.ceil(w / TILE) + 1;
  const rows = Math.ceil(h / TILE) + 1;
  const cx = w / 2;
  const cy = h / 2;

  return (
    <Svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {/* Radial warm center glow */}
      {showGlow && (
        <>
          <Defs>
            <RadialGradient id="ipRg" cx="50%" cy="47%" r="52%">
              <Stop offset="0%" stopColor={glowColor} stopOpacity={0.48} />
              <Stop offset="100%" stopColor={bgColor} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={w} height={h} fill="url(#ipRg)" />
        </>
      )}

      {/* Diamond lattice (tiled) */}
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const tx = c * TILE;
          const ty = r * TILE;
          return (
            <G key={`t${r}_${c}`} transform={`translate(${tx},${ty})`}>
              <Path
                d={`M19 0L${TILE} 19L19 ${TILE}L0 19Z`}
                stroke={strokeColor} strokeWidth={0.38} opacity={0.16} fill="none"
              />
              <Circle cx={19} cy={19} r={1} fill={strokeColor} opacity={0.12} />
              <Circle cx={0} cy={0} r={0.8} fill={strokeColor} opacity={0.09} />
              <Circle cx={TILE} cy={0} r={0.8} fill={strokeColor} opacity={0.09} />
              <Circle cx={0} cy={TILE} r={0.8} fill={strokeColor} opacity={0.09} />
              <Circle cx={TILE} cy={TILE} r={0.8} fill={strokeColor} opacity={0.09} />
            </G>
          );
        })
      )}

      {/* Central mandala */}
      <G transform={`translate(${cx},${cy})`} opacity={0.065}>
        {['0', '30', '45', '90'].map(deg => (
          <Polygon
            key={`hex${deg}`}
            points="0,-86 74,-43 74,43 0,86 -74,43 -74,-43"
            stroke={strokeColor} strokeWidth={0.7} fill="none"
            transform={`rotate(${deg})`}
          />
        ))}
        <Circle r={44} stroke={strokeColor} strokeWidth={0.55} fill="none" />
        <Circle r={66} stroke={strokeColor} strokeWidth={0.45} fill="none" />
        <Circle r={86} stroke={strokeColor} strokeWidth={0.4} fill="none" />
      </G>

      {/* Inner border frame */}
      <Rect
        x={9} y={9} width={w - 18} height={h - 18}
        rx={9} fill="none" stroke={strokeColor} strokeWidth={0.7} opacity={0.3}
      />

      {/* 8-pointed star corners */}
      <StarCorner x={25} y={19} stroke={strokeColor} bg={bgColor} />
      <StarCorner x={w - 25} y={19} stroke={strokeColor} bg={bgColor} />
      <StarCorner x={25} y={h - 19} stroke={strokeColor} bg={bgColor} />
      <StarCorner x={w - 25} y={h - 19} stroke={strokeColor} bg={bgColor} />
    </Svg>
  );
};
