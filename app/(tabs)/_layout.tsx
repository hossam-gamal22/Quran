// app/(tabs)/_layout.tsx
// تخطيط التابات السفلية مع زرار التسبيح في المنتصف
// آخر تحديث: 2026-03-04

import React from 'react';
import { View, Text, StyleSheet, Platform, Pressable, Dimensions } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '@/contexts/SettingsContext';

const { width } = Dimensions.get('window');

// ========================================
// الثوابت
// ========================================

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 85 : 70;
const TASBIH_BUTTON_SIZE = 60;
const ACTIVE_COLOR = '#2f7659';
const INACTIVE_COLOR_LIGHT = '#999';
const INACTIVE_COLOR_DARK = '#666';

// ========================================
// أيقونة التاب المخصصة
// ========================================

interface TabIconProps {
  name: string;
  color: string;
  focused: boolean;
  label: string;
}

const TabIcon: React.FC<TabIconProps> = ({ name, color, focused, label }) => {
  const scale = useSharedValue(1);
  
  React.useEffect(() => {
    if (focused) {
      scale.value = withSpring(1.1, { damping: 15, stiffness: 150 });
    } else {
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
    }
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.tabIconContainer}>
      <Animated.View style={[styles.iconWrapper, animatedStyle]}>
        {focused && <View style={styles.activeIndicator} />}
        <MaterialCommunityIcons
          name={name as any}
          size={focused ? 26 : 24}
          color={color}
        />
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          { color },
          focused && styles.tabLabelActive,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

// ========================================
// زرار التسبيح المركزي
// ========================================

const TasbihButton: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const router = useRouter();
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    scale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    
    rotation.value = withSequence(
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );

    router.push('/tasbih');
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` }
    ],
  }));

  return (
    <View style={styles.tasbihButtonContainer}>
      <Pressable onPress={handlePress}>
        <Animated.View style={animatedStyle}>
          <LinearGradient
            colors={['#2f7659', '#1d4d3a']}
            style={styles.tasbihButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.tasbihButtonInner}>
              <MaterialCommunityIcons
                name="hand-heart"
                size={28}
                color="#fff"
              />
            </View>
          </LinearGradient>
          <View style={styles.tasbihButtonGlow} />
        </Animated.View>
      </Pressable>
      <Text style={[styles.tasbihLabel, isDarkMode && styles.tasbihLabelDark]}>
        تسبيح
      </Text>
    </View>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function TabsLayout() {
  const { isDarkMode } = useSettings();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: ACTIVE_COLOR,
          tabBarInactiveTintColor: isDarkMode ? INACTIVE_COLOR_DARK : INACTIVE_COLOR_LIGHT,
          tabBarStyle: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: TAB_BAR_HEIGHT,
            backgroundColor: isDarkMode ? 'rgba(17,21,28,0.95)' : 'rgba(255,255,255,0.95)',
            borderTopWidth: 0,
            elevation: 0,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            paddingBottom: Platform.OS === 'ios' ? 20 : 10,
            paddingTop: 10,
          },
          tabBarLabelStyle: {
            fontFamily: 'Cairo-Medium',
            fontSize: 11,
            marginTop: 4,
          },
        }}
      >
        {/* الأذكار */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'الأذكار',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="book-open-page-variant" color={color} focused={focused} label="الأذكار" />
            ),
            tabBarLabel: () => null,
          }}
        />

        {/* القرآن */}
        <Tabs.Screen
          name="quran"
          options={{
            title: 'القرآن',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="book-open-variant" color={color} focused={focused} label="القرآن" />
            ),
            tabBarLabel: () => null,
          }}
        />

        {/* placeholder للتسبيح */}
        <Tabs.Screen
          name="tasbih-placeholder"
          options={{
            title: '',
            tabBarIcon: () => <View style={{ width: TASBIH_BUTTON_SIZE }} />,
            tabBarLabel: () => null,
          }}
          listeners={{
            tabPress: (e) => e.preventDefault(),
          }}
        />

        {/* الصلاة */}
        <Tabs.Screen
          name="prayer"
          options={{
            title: 'الصلاة',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="mosque" color={color} focused={focused} label="الصلاة" />
            ),
            tabBarLabel: () => null,
          }}
        />

        {/* المزيد */}
        <Tabs.Screen
          name="more"
          options={{
            title: 'المزيد',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="dots-horizontal" color={color} focused={focused} label="المزيد" />
            ),
            tabBarLabel: () => null,
          }}
        />

        {/* إخفاء الشاشات الأخرى */}
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="qibla" options={{ href: null }} />
        <Tabs.Screen name="favorites" options={{ href: null }} />
        <Tabs.Screen name="khatm" options={{ href: null }} />
        <Tabs.Screen name="wird" options={{ href: null }} />
        <Tabs.Screen name="tasbih" options={{ href: null }} />
        <Tabs.Screen name="quran-search" options={{ href: null }} />
        <Tabs.Screen name="recitations" options={{ href: null }} />
        <Tabs.Screen name="tafsir-search" options={{ href: null }} />
        <Tabs.Screen name="daily-ayah" options={{ href: null }} />
        <Tabs.Screen name="hijri-calendar" options={{ href: null }} />
        <Tabs.Screen name="notifications-center" options={{ href: null }} />
        <Tabs.Screen name="azkar" options={{ href: null }} />
      </Tabs>

      {/* زرار التسبيح — box-none lets sibling tab-bar touches pass through */}
      <View style={styles.tasbihButtonWrapper} pointerEvents="box-none">
        <TasbihButton isDarkMode={isDarkMode} />
      </View>
    </View>
  );
}

// ========================================
// الأنماط
// ========================================

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACTIVE_COLOR,
  },
  tabLabel: {
    fontFamily: 'Cairo-Medium',
    fontSize: 11,
    marginTop: 4,
  },
  tabLabelActive: {
    fontFamily: 'Cairo-Bold',
  },
  tasbihButtonWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 35 : 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  tasbihButtonContainer: {
    alignItems: 'center',
  },
  tasbihButton: {
    width: TASBIH_BUTTON_SIZE,
    height: TASBIH_BUTTON_SIZE,
    borderRadius: TASBIH_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2f7659',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  tasbihButtonInner: {
    width: TASBIH_BUTTON_SIZE - 8,
    height: TASBIH_BUTTON_SIZE - 8,
    borderRadius: (TASBIH_BUTTON_SIZE - 8) / 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tasbihButtonGlow: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: (TASBIH_BUTTON_SIZE + 10) / 2,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(47,118,89,0.3)',
  },
  tasbihLabel: {
    fontFamily: 'Cairo-Medium',
    fontSize: 11,
    marginTop: 6,
    color: '#2f7659',
  },
  tasbihLabelDark: {
    color: '#4ade80',
  },
});
