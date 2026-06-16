import { View, type ViewProps, StyleSheet } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import BackgroundWrapper from "@/components/ui/BackgroundWrapper";
import { useSettings } from "@/contexts/SettingsContext";
import { useColors } from "@/hooks/use-colors";
import { DynamicScreenAds } from "@/components/ads/DynamicScreenAds";

export interface ScreenContainerProps extends ViewProps {
  edges?: Edge[];
  useAppBackground?: boolean;
  /** When set, auto-renders admin-configured ads for this screen */
  screenKey?: string;
  /** Pass true on (tabs) screens so bottom ads sit above the tab bar */
  inTabScreen?: boolean;
}

/**
 * ScreenContainer – handles SafeArea + background color via StyleSheet.
 */
export function ScreenContainer({
  children,
  edges = ["top", "left", "right"],
  style,
  useAppBackground = true,
  screenKey,
  inTabScreen,
  ...props
}: ScreenContainerProps) {
  const { settings } = useSettings();
  const colors = useColors();
  const bgKey = settings.display.appBackground;
  const hasBg = useAppBackground;

  const content = (
    <SafeAreaView edges={edges} style={styles.safeArea}>
      <StatusBar style={colors.statusBarStyle} />
      <View style={[styles.inner, style]}>{children}</View>
      {screenKey && <DynamicScreenAds screen={screenKey} position="bottom" inTabScreen={inTabScreen} />}
    </SafeAreaView>
  );

  if (hasBg) {
    return (
      <BackgroundWrapper
        backgroundKey={bgKey}
        backgroundUrl={settings.display.appBackgroundUrl}
        opacity={settings.display.backgroundOpacity ?? 1}
        blurEnabled={settings.display.blurEnabled}
        blurIntensity={settings.display.blurIntensity}
        dimEnabled={settings.display.dimEnabled}
        dimOpacity={(settings.display as any).dimOpacity}
        style={[styles.container]}
        {...props}
      >
        {content}
      </BackgroundWrapper>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} {...props}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
});
