// app/(tabs)/_layout.tsx
// تخطيط التابات السفلية - روح المسلم

import React from 'react';
import { View, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useSettings } from '@/contexts/SettingsContext';

const { width } = Dimensions.get('window');

// ========================================
// الثوابت
// ========================================

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 85 : 70;
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
// شريط التابات المخصص
// ========================================

const CustomTabBar = ({ state, descriptors, navigation, isDarkMode }: any) => {
  return (
    <View style={[styles.tabBarContainer, isDarkMode && styles.tabBarContainerDark]}>
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={isDarkMode ? 40 : 80}
          tint={isDarkMode ? 'dark' : 'light'}
          style={styles.blurView}
        >
          <TabBarContent
            state={state}
            descriptors={descriptors}
            navigation={navigation}
            isDarkMode={isDarkMode}
          />
        </BlurView>
      ) : (
        <View style={[styles.androidTabBar, isDarkMode && styles.androidTabBarDark]}>
          <TabBarContent
            state={state}
            descriptors={descriptors}
            navigation={navigation}
            isDarkMode={isDarkMode}
          />
        </View>
      )}
    </View>
  );
};

const TabBarContent = ({ state, descriptors, navigation, isDarkMode }: any) => {
  return (
    <View style={styles.tabBarContent}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const color = isFocused
          ? ACTIVE_COLOR
          : isDarkMode
          ? INACTIVE_COLOR_DARK
          : INACTIVE_COLOR_LIGHT;

        return (
          <View key={route.key} style={styles.tabItem}>
            <Animated.View>
              {options.tabBarIcon?.({
                focused: isFocused,
                color,
                size: 24,
              })}
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function TabsLayout() {
  const { isDarkMode } = useSettings();

  return (
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
      {/* الصفحة الرئيسية (الأذكار) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'الأذكار',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="hand-heart"
              color={color}
              focused={focused}
              label="الأذكار"
            />
          ),
          tabBarLabel: () => null,
        }}
      />

      {/* القرآن الكريم */}
      <Tabs.Screen
        name="quran"
        options={{
          title: 'القرآن',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="book-open-variant"
              color={color}
              focused={focused}
              label="القرآن"
            />
          ),
          tabBarLabel: () => null,
        }}
      />

      {/* أوقات الصلاة */}
      <Tabs.Screen
        name="prayer"
        options={{
          title: 'الصلاة',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="mosque"
              color={color}
              focused={focused}
              label="الصلاة"
            />
          ),
          tabBarLabel: () => null,
        }}
      />

      {/* القبلة */}
      <Tabs.Screen
        name="qibla"
        options={{
          title: 'القبلة',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="compass"
              color={color}
              focused={focused}
              label="القبلة"
            />
          ),
          tabBarLabel: () => null,
        }}
      />

      {/* الإعدادات */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'الإعدادات',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="cog"
              color={color}
              focused={focused}
              label="الإعدادات"
            />
          ),
          tabBarLabel: () => null,
        }}
      />
    </Tabs>
  );
}

// ========================================
// الأنماط
// ========================================

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: TAB_BAR_HEIGHT,
  },
  tabBarContainerDark: {},
  blurView: {
    flex: 1,
    overflow: 'hidden',
  },
  androidTabBar: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  androidTabBarDark: {
    backgroundColor: 'rgba(17,21,28,0.98)',
  },
  tabBarContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    paddingBottom: Platform.OS === 'ios' ? 15 : 5,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
});
