// components/ui/glass-card.tsx

import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/lib/theme-provider";
import { BORDER_RADIUS } from "@/constants/theme";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: "default" | "solid" | "outline";
  borderRadius?: "sm" | "md" | "lg" | "xl";
  padding?: number;
  disabled?: boolean;
}

export function GlassCard({
  children,
  style,
  onPress,
  variant = "default",
  borderRadius = "lg",
  padding = 16,
  disabled = false,
}: GlassCardProps) {
  const { colors, isDark } = useTheme();
  const radius = BORDER_RADIUS[borderRadius];

  const getBackgroundStyle = (): ViewStyle => {
    switch (variant) {
      case "solid":
        return {
          backgroundColor: colors.primary,
        };
      case "outline":
        return {
          backgroundColor: "transparent",
          borderWidth: 1.5,
          borderColor: colors.surfaceBorder,
        };
      default:
        return {
          backgroundColor: colors.surfaceGlass,
          borderWidth: 1,
          borderColor: colors.surfaceBorder,
        };
    }
  };

  const cardStyle: ViewStyle = {
    borderRadius: radius,
    padding,
    overflow: "hidden",
    ...getBackgroundStyle(),
  };

  const content = (
    <View style={[styles.innerContent, { borderRadius: radius }]}>
      {children}
    </View>
  );

  // Use BlurView for glass effect on iOS, fallback for Android/Web
  const renderCard = () => {
    if (Platform.OS === "ios" && variant === "default") {
      return (
        <BlurView
          intensity={isDark ? 20 : 40}
          tint={isDark ? "dark" : "light"}
          style={[cardStyle, style]}
        >
          {content}
        </BlurView>
      );
    }

    return <View style={[cardStyle, style]}>{content}</View>;
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        disabled={disabled}
        style={styles.touchable}
      >
        {renderCard()}
      </TouchableOpacity>
    );
  }

  return renderCard();
}

// Variant for list items
interface GlassListItemProps {
  children: React.ReactNode;
  onPress?: () => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
}

export function GlassListItem({
  children,
  onPress,
  leftIcon,
  rightIcon,
  style,
}: GlassListItemProps) {
  const { colors } = useTheme();

  return (
    <GlassCard
      onPress={onPress}
      padding={14}
      borderRadius="lg"
      style={[styles.listItem, style]}
    >
      <View style={styles.listItemContent}>
        {rightIcon && <View style={styles.listItemIcon}>{rightIcon}</View>}
        <View style={styles.listItemText}>{children}</View>
        {leftIcon && <View style={styles.listItemIcon}>{leftIcon}</View>}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  touchable: {
    width: "100%",
  },
  innerContent: {
    // Content styling
  },
  listItem: {
    marginVertical: 4,
  },
  listItemContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  listItemText: {
    flex: 1,
    alignItems: "flex-end",
  },
  listItemIcon: {
    marginLeft: 12,
  },
});
