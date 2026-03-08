import { View, type ViewProps, StyleSheet } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { cn } from "@/lib/utils";
import BackgroundWrapper from "@/components/ui/BackgroundWrapper";
import { useSettings } from "@/contexts/SettingsContext";
import { useColors } from "@/hooks/use-colors";

export interface ScreenContainerProps extends ViewProps {
  edges?: Edge[];
  className?: string;
  containerClassName?: string;
  safeAreaClassName?: string;
  useAppBackground?: boolean;
}

/**
 * ScreenContainer – handles SafeArea + background color.
 * Uses NativeWind classes with StyleSheet fallback to prevent white screens.
 */
export function ScreenContainer({
  children,
  edges = ["top", "left", "right"],
  className,
  containerClassName,
  safeAreaClassName,
  style,
  useAppBackground = true,
  ...props
}: ScreenContainerProps) {
  const { settings, isDarkMode } = useSettings();
  const colors = useColors();
  const bgKey = settings.display.appBackground;
  const hasBg = useAppBackground && bgKey !== 'none';

  const content = (
    <SafeAreaView
      edges={edges}
      className={cn("flex-1", safeAreaClassName)}
      style={styles.safeArea}
    >
      <View className={cn("flex-1", className)} style={[styles.inner, style as any]}>
        {children}
      </View>
    </SafeAreaView>
  );

  if (hasBg) {
    return (
      <BackgroundWrapper
        backgroundKey={bgKey}
        style={[styles.container, { backgroundColor: 'transparent' }]}
        {...props}
      >
        {content}
      </BackgroundWrapper>
    );
  }

  return (
    <View
      className={cn("flex-1", "bg-background", containerClassName)}
      style={[styles.container, { backgroundColor: colors.background }]}
      {...props}
    >
      {content}
    </View>
  );
}

// ─── Fallback styles (used when NativeWind classes don't apply yet) ──────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF8', // light background fallback
  },
  safeArea: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
});
