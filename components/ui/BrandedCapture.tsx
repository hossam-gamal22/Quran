// components/ui/BrandedCapture.tsx
// غلاف لالتقاط الشاشة مع علامة التطبيق التجارية

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { useColors } from '@/hooks/use-colors';
import { APP_NAME } from '@/constants/app';

export interface BrandedCaptureHandle {
  capture: () => Promise<string>;
}

interface BrandedCaptureProps {
  children: React.ReactNode;
  /** Skip branding (e.g. for Quran pages) */
  excludeBranding?: boolean;
}

export const BrandedCapture = forwardRef<BrandedCaptureHandle, BrandedCaptureProps>(
  ({ children, excludeBranding = false }, ref) => {
    const viewShotRef = useRef<ViewShot>(null);
    const colors = useColors();

    useImperativeHandle(ref, () => ({
      capture: async () => {
        if (!viewShotRef.current) throw new Error('ViewShot ref not ready');
        const uri = await captureRef(viewShotRef, { format: 'png', quality: 1 });
        return uri;
      },
    }));

    if (excludeBranding) {
      return (
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
          {children}
        </ViewShot>
      );
    }

    return (
      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
        <View style={[styles.wrapper, { backgroundColor: colors.primary }]}>
          {/* Content area */}
          <View style={styles.content}>
            {children}
          </View>

          {/* Branded footer */}
          <View style={styles.footer}>
            <View style={styles.logoPill}>
              <Image
                source={require('@/assets/images/App-icon.png')}
                style={styles.logoIcon}
                resizeMode="contain"
              />
              <Text style={styles.logoText}>{APP_NAME}</Text>
            </View>
          </View>
        </View>
      </ViewShot>
    );
  }
);

BrandedCapture.displayName = 'BrandedCapture';

const styles = StyleSheet.create({
  wrapper: {
    padding: 20,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  footer: {
    marginTop: 16,
    alignItems: 'center',
  },
  logoPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  logoIcon: {
    width: 24,
    height: 24,
  },
  logoText: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    color: '#1C1C1E',
  },
});

export default BrandedCapture;
