// components/ui/islamic-background.tsx

import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Pattern, Rect, Path, Defs } from "react-native-svg";
import { useTheme } from "@/lib/theme-provider";
import { ISLAMIC_PATTERN_OPACITY } from "@/constants/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export function IslamicBackground({ children }: { children: React.ReactNode }) {
  const { colors, isDark } = useTheme();
  const patternOpacity = isDark ? ISLAMIC_PATTERN_OPACITY.dark : ISLAMIC_PATTERN_OPACITY.light;

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <LinearGradient
        colors={[(colors as any).backgroundGradientStart || colors.background, (colors as any).backgroundGradientEnd || colors.surface]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Islamic Pattern Overlay */}
      <View style={[StyleSheet.absoluteFillObject, { opacity: patternOpacity }]}>
        <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
          <Defs>
            <Pattern
              id="islamicPattern"
              x="0"
              y="0"
              width="60"
              height="60"
              patternUnits="userSpaceOnUse"
            >
              {/* Islamic Geometric Pattern */}
              <Path
                d="M30 0 L60 30 L30 60 L0 30 Z"
                fill="none"
                stroke={isDark ? "#FFFFFF" : "#0D7377"}
                strokeWidth="0.5"
              />
              <Path
                d="M30 10 L50 30 L30 50 L10 30 Z"
                fill="none"
                stroke={isDark ? "#FFFFFF" : "#0D7377"}
                strokeWidth="0.5"
              />
              <Path
                d="M30 20 L40 30 L30 40 L20 30 Z"
                fill="none"
                stroke={isDark ? "#FFFFFF" : "#0D7377"}
                strokeWidth="0.5"
              />
              {/* Corner decorations */}
              <Path
                d="M0 0 L15 0 L0 15 Z"
                fill="none"
                stroke={isDark ? "#FFFFFF" : "#0D7377"}
                strokeWidth="0.5"
              />
              <Path
                d="M60 0 L45 0 L60 15 Z"
                fill="none"
                stroke={isDark ? "#FFFFFF" : "#0D7377"}
                strokeWidth="0.5"
              />
              <Path
                d="M0 60 L15 60 L0 45 Z"
                fill="none"
                stroke={isDark ? "#FFFFFF" : "#0D7377"}
                strokeWidth="0.5"
              />
              <Path
                d="M60 60 L45 60 L60 45 Z"
                fill="none"
                stroke={isDark ? "#FFFFFF" : "#0D7377"}
                strokeWidth="0.5"
              />
            </Pattern>
          </Defs>
          <Rect
            x="0"
            y="0"
            width={SCREEN_WIDTH}
            height={SCREEN_HEIGHT}
            fill="url(#islamicPattern)"
          />
        </Svg>
      </View>

      {/* Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
