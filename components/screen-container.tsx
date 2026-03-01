import { View, type ViewProps, StyleSheet } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { cn } from "@/lib/utils";

export interface ScreenContainerProps extends ViewProps {
  edges?: Edge[];
  className?: string;
  containerClassName?: string;
  safeAreaClassName?: string;
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
  ...props
}: ScreenContainerProps) {
  return (
    <View
      className={cn("flex-1", "bg-background", containerClassName)}
      style={styles.container}
      {...props}
    >
      <SafeAreaView
        edges={edges}
        className={cn("flex-1", safeAreaClassName)}
        style={styles.safeArea}
      >
        <View className={cn("flex-1", className)} style={[styles.inner, style as any]}>
          {children}
        </View>
      </SafeAreaView>
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
