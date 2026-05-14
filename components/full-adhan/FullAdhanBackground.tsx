// components/full-adhan/FullAdhanBackground.tsx
// Full Adhan screen wrapper using the app-wide configurable background system.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';

interface FullAdhanBackgroundProps {
  children: React.ReactNode;
}

export const FullAdhanBackground: React.FC<FullAdhanBackgroundProps> = ({ children }) => {
  return (
    <BackgroundWrapper style={styles.root}>
      <View style={styles.readabilityOverlay} pointerEvents="none" />
      {children}
    </BackgroundWrapper>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  readabilityOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
});

export default FullAdhanBackground;
