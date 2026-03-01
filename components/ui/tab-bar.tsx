// components/ui/tab-bar.tsx

import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme-provider";
import { BORDER_RADIUS } from "@/constants/theme";
import { IconSymbol } from "./icon-symbol";

interface TabItem {
  name: string;
  label: string;
  icon: string;
  iconFocused: string;
}

const TABS: TabItem[] = [
  {
    name: "settings",
    label: "الإعدادات",
    icon: "gearshape",
    iconFocused: "gearshape.fill",
  },
  {
    name: "prayer",
    label: "الصلاة",
    icon: "building.columns",
    iconFocused: "building.columns.fill",
  },
  {
    name: "quran",
    label: "القرآن",
    icon: "book",
    iconFocused: "book.fill",
  },
  {
    name: "index",
    label: "الأذكار",
    icon: "text.book.closed",
    iconFocused: "text.book.closed.fill",
  },
];

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const getTabIndex = (routeName: string): number => {
    return TABS.findIndex((tab) => tab.name === routeName);
  };

  const renderContent = () => (
    <View style={styles.tabContainer}>
      {TABS.map((tab, index) => {
        const currentRoute = state.routes[state.index]?.name;
        const isFocused = currentRoute === tab.name;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: tab.name,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(tab.name);
          }
        };

        return (
          <TouchableOpacity
            key={tab.name}
            onPress={onPress}
            style={styles.tabButton}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.tabIconContainer,
                isFocused && {
                  backgroundColor: colors.primary,
                },
              ]}
            >
              <IconSymbol
                name={isFocused ? tab.iconFocused : tab.icon}
                size={22}
                color={isFocused ? "#FFFFFF" : colors.tabBarInactive}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isFocused ? colors.tabBarActive : colors.tabBarInactive,
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (Platform.OS === "ios") {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <BlurView
          intensity={isDark ? 50 : 80}
          tint={isDark ? "dark" : "light"}
          style={[
            styles.blurContainer,
            {
              borderTopColor: colors.border,
            },
          ]}
        >
          {renderContent()}
        </BlurView>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom,
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
      ]}
    >
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  blurContainer: {
    borderTopWidth: 0.5,
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  tabIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
});
