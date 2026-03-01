import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, DarkColors, Spacing, Typography } from '../../constants/theme';

// ============================================
// مكون أيقونة التاب
// ============================================

interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  label: string;
  color: string;
  darkMode: boolean;
}

const TabIcon = ({ name, focused, label, color, darkMode }: TabIconProps) => {
  const currentColors = darkMode ? DarkColors : Colors;
  
  return (
    <View style={styles.tabIconContainer}>
      <View style={[
        styles.tabIconWrapper,
        focused && { backgroundColor: currentColors.primary + '15' }
      ]}>
        <Ionicons 
          name={focused ? name : `${name}-outline` as keyof typeof Ionicons.glyphMap} 
          size={24} 
          color={focused ? currentColors.primary : currentColors.textLight} 
        />
      </View>
      <Text style={[
        styles.tabLabel,
        { color: focused ? currentColors.primary : currentColors.textLight }
      ]}>
        {label}
      </Text>
    </View>
  );
};

// ============================================
// المكون الرئيسي
// ============================================

export default function TabsLayout() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('app_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setDarkMode(parsed.darkMode ?? false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const currentColors = darkMode ? DarkColors : Colors;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: currentColors.surface,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 85 : 70,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 10,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: currentColors.primary,
        tabBarInactiveTintColor: currentColors.textLight,
      }}
    >
      {/* تاب الأذكار */}
      <Tabs.Screen
        name="azkar"
        options={{
          title: 'الأذكار',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon 
              name="leaf" 
              focused={focused} 
              label="الأذكار" 
              color={color}
              darkMode={darkMode}
            />
          ),
        }}
      />

      {/* تاب القرآن */}
      <Tabs.Screen
        name="quran"
        options={{
          title: 'القرآن',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon 
              name="book" 
              focused={focused} 
              label="القرآن الكريم" 
              color={color}
              darkMode={darkMode}
            />
          ),
        }}
      />

      {/* تاب الصلاة */}
      <Tabs.Screen
        name="prayer"
        options={{
          title: 'الصلاة',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon 
              name="time" 
              focused={focused} 
              label="الصلاة" 
              color={color}
              darkMode={darkMode}
            />
          ),
        }}
      />

      {/* تاب الإعدادات */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'الإعدادات',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon 
              name="settings" 
              focused={focused} 
              label="الإعدادات" 
              color={color}
              darkMode={darkMode}
            />
          ),
        }}
      />

      {/* الصفحة الرئيسية - مخفية من التابز لكن موجودة */}
      <Tabs.Screen
        name="index"
        options={{
          href: null, // إخفاء من التابز
        }}
      />

      {/* صفحة المزيد - مخفية */}
      <Tabs.Screen
        name="more"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

// ============================================
// الأنماط
// ============================================

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 5,
  },
  tabIconWrapper: {
    padding: 8,
    borderRadius: 12,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});
