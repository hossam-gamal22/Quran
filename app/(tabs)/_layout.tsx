import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 62 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          marginTop: 2,
        },
      }}
    >
      {/* ── Core ─────────────────────────────────── */}
      <Tabs.Screen
        name="index"
        options={{
          title: "الرئيسية",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="quran"
        options={{
          title: "القرآن",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="book.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="quran-search"
        options={{
          title: "البحث",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="magnifyingglass" color={color} />,
        }}
      />

      {/* ── Features ─────────────────────────────── */}
      <Tabs.Screen
        name="recitations"
        options={{
          title: "التلاوات",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="headphones" color={color} />,
        }}
      />
      <Tabs.Screen
        name="tafsir-search"
        options={{
          title: "التفسير",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="text.book.closed.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "المفضلة",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="star.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="daily-ayah"
        options={{
          title: "آية اليوم",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="sparkles" color={color} />,
        }}
      />

      {/* ── Worship ──────────────────────────────── */}
      <Tabs.Screen
        name="wird"
        options={{
          title: "الورد",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="scroll.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasbih"
        options={{
          title: "التسبيح",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="circle.grid.3x3.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="khatm"
        options={{
          title: "الختمة",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="checkmark.seal.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="hijri-calendar"
        options={{
          title: "التقويم",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="calendar" color={color} />,
        }}
      />

      {/* ── Notifications ─────────────────────────── */}
      <Tabs.Screen
        name="notifications-center"
        options={{
          title: "الإشعارات",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="bell.fill" color={color} />,
        }}
      />

      {/* ── Prayer & Direction ────────────────────── */}
      <Tabs.Screen
        name="prayer"
        options={{
          title: "الصلاة",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="clock.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="qibla"
        options={{
          title: "القبلة",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="location.north.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "الإعدادات",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
