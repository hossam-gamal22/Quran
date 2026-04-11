// components/ui/TabSwipeWrapper.tsx
// Wraps a tab screen's content with a horizontal swipe gesture
// that navigates to adjacent bottom tabs

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useTabSwipeGesture } from '@/hooks/use-tab-swipe';
import { useIsRTL } from '@/hooks/use-is-rtl';

// LTR: Home → Quran → Tasbih → Prayer → Settings
const LTR_ORDER = ['index', 'quran', 'tasbih', 'prayer', 'settings'];
// RTL: Settings → Prayer → Tasbih → Quran → Home
const RTL_ORDER = ['settings', 'prayer', 'tasbih', 'quran', 'index'];

interface TabSwipeWrapperProps {
  tabName: string;
  children: React.ReactNode;
}

export function TabSwipeWrapper({ tabName, children }: TabSwipeWrapperProps) {
  const isRTL = useIsRTL();
  const tabOrder = isRTL ? RTL_ORDER : LTR_ORDER;
  const gesture = useTabSwipeGesture(tabName, tabOrder);

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>
        {children}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
