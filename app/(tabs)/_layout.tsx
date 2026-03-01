// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

type TabIconProps = {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
};

function TabIcon({ name, label, focused }: TabIconProps) {
  return (
    <View style={styles.tabItem}>
      <Ionicons
        name={name}
        size={24}
        color={focused ? Colors.primary : Colors.textMuted}
      />
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? Colors.primary : Colors.textMuted },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="today-outline" label="اليوم" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="prayers"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="moon-outline" label="الصلاة" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="quran"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="book-outline" label="القرآن" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="azkar"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="heart-outline" label="أذكار" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="qibla"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="compass-outline" label="القبلة" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 0,
    elevation: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    height: 70,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
