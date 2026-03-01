// app/(tabs)/_layout.tsx

import React from "react";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme-provider";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BlurView } from "expo-blur";
import { BORDER_RADIUS } from "@/constants/theme";

export default function TabLayout() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 70 + bottomPadding,
          paddingTop: 10,
          paddingBottom: bottomPadding,
          paddingHorizontal: 10,
          backgroundColor: Platform.OS === "ios" ? "transparent" : colors.tabBarBackground,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={isDark ? 60 : 80}
              tint={isDark ? "dark" : "light"}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      {/* الأذكار - Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: "الأذكار",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "text.book.closed.fill" : "text.book.closed"}
              color={color}
              focused={focused}
              primaryColor={colors.primary}
            />
          ),
        }}
      />

      {/* القرآن */}
      <Tabs.Screen
        name="quran"
        options={{
          title: "القرآن",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "book.fill" : "book"}
              color={color}
              focused={focused}
              primaryColor={colors.primary}
            />
          ),
        }}
      />

      {/* الصلاة */}
      <Tabs.Screen
        name="prayer"
        options={{
          title: "الصلاة",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "building.columns.fill" : "building.columns"}
              color={color}
              focused={focused}
              primaryColor={colors.primary}
            />
          ),
        }}
      />

      {/* الإعدادات */}
      <Tabs.Screen
        name="settings"
        options={{
          title: "الإعدادات",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "gearshape.fill" : "gearshape"}
              color={color}
              focused={focused}
              primaryColor={colors.primary}
            />
          ),
        }}
      />

      {/* Hidden screens */}
      <Tabs.Screen name="quran-search" options={{ href: null }} />
      <Tabs.Screen name="recitations" options={{ href: null }} />
      <Tabs.Screen name="tafsir-search" options={{ href: null }} />
      <Tabs.Screen name="favorites" options={{ href: null }} />
      <Tabs.Screen name="daily-ayah" options={{ href: null }} />
      <Tabs.Screen name="wird" options={{ href: null }} />
      <Tabs.Screen name="tasbih" options={{ href: null }} />
      <Tabs.Screen name="khatm" options={{ href: null }} />
      <Tabs.Screen name="hijri-calendar" options={{ href: null }} />
      <Tabs.Screen name="notifications-center" options={{ href: null }} />
      <Tabs.Screen name="qibla" options={{ href: null }} />
    </Tabs>
  );
}

// Tab Icon Component with background when focused
function TabIcon({
  name,
  color,
  focused,
  primaryColor,
}: {
  name: string;
  color: string;
  focused: boolean;
  primaryColor: string;
}) {
  return (
    <IconSymbol
      name={name}
      size={24}
      color={focused ? primaryColor : color}
    />
  );
}
