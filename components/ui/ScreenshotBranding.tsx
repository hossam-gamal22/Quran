// components/ui/ScreenshotBranding.tsx
// يكتشف السكرين شوت ويحفظ نسخة branded تلقائياً في الجاليري

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Image, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import ViewShot, { captureRef, captureScreen } from 'react-native-view-shot';
import * as ScreenCapture from 'expo-screen-capture';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useAppIdentity } from '@/hooks/use-app-identity';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { fontBold } from '@/lib/fonts';

const BRANDING_HEIGHT = 60;
const LOGO_SIZE = 36;
const SCREEN = Dimensions.get('window');

export function ScreenshotBranding() {
  const { isPremium } = useSubscription();
  const { isDarkMode } = useSettings();
  const { logoSource } = useAppIdentity();
  const isRTL = useIsRTL();
  const viewShotRef = useRef<ViewShot>(null);
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const isProcessing = useRef(false);
  const imageLoadResolve = useRef<(() => void) | null>(null);

  const handleScreenshot = useCallback(async () => {
    if (isPremium || isProcessing.current) return;
    isProcessing.current = true;

    try {
      console.log('📸 Screenshot detected');

      // 1. Permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('📸 Permission denied');
        isProcessing.current = false;
        return;
      }

      // 2. Capture current screen
      const screenUri = await captureScreen({
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      console.log('📸 Screen captured');

      // 3. Set URI and wait for Image onLoad
      await new Promise<void>((resolve) => {
        imageLoadResolve.current = resolve;
        setScreenshotUri(screenUri);
        // Fallback timeout in case onLoad never fires
        setTimeout(() => {
          if (imageLoadResolve.current === resolve) {
            console.log('📸 Image load timeout — proceeding');
            resolve();
          }
        }, 3000);
      });

      // 4. Extra time for layout
      await new Promise(r => setTimeout(r, 500));

      // 5. Capture branded view
      if (!viewShotRef.current) {
        console.log('📸 ViewShot ref missing');
        setScreenshotUri(null);
        isProcessing.current = false;
        return;
      }

      console.log('📸 Capturing branded view...');
      const brandedUri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      console.log('📸 Branded capture done');

      // 6. Save to gallery
      const asset = await MediaLibrary.createAssetAsync(brandedUri);
      try {
        const album = await MediaLibrary.getAlbumAsync('روح المسلم');
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        } else {
          await MediaLibrary.createAlbumAsync('روح المسلم', asset, false);
        }
      } catch {}

      console.log('📸 Saved to gallery ✅');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // 7. Cleanup
      try {
        await FileSystem.deleteAsync(screenUri, { idempotent: true });
        await FileSystem.deleteAsync(brandedUri, { idempotent: true });
      } catch {}

      setScreenshotUri(null);
    } catch (error) {
      console.warn('📸 Screenshot branding failed:', error);
      setScreenshotUri(null);
    } finally {
      isProcessing.current = false;
    }
  }, [isPremium]);

  // Listen for screenshots
  useEffect(() => {
    if (isPremium) return;

    let subscription: { remove: () => void } | null = null;

    const setup = async () => {
      try {
        subscription = ScreenCapture.addScreenshotListener(() => {
          console.log('📸 Listener fired');
          handleScreenshot();
        });
        console.log('📸 Screenshot listener registered');
      } catch (error) {
        console.warn('📸 Listener setup failed:', error);
      }
    };

    setup();

    return () => {
      subscription?.remove();
    };
  }, [handleScreenshot, isPremium]);

  if (isPremium) return null;

  const bgColor = isDarkMode ? '#1a1a2e' : '#FFFFFF';
  const accentColor = '#0f987f';

  return (
    <>
      <View style={styles.offScreen} pointerEvents="none">
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', quality: 1 }}
          style={[
            styles.captureContainer,
            {
              width: SCREEN.width,
              height: SCREEN.height + BRANDING_HEIGHT,
              backgroundColor: bgColor,
            },
          ]}
        >
          {/* Screenshot image — uses screen point dimensions */}
          {screenshotUri ? (
            <Image
              source={{ uri: screenshotUri }}
              style={{ width: SCREEN.width, height: SCREEN.height }}
              resizeMode="cover"
              onLoad={() => {
                console.log('📸 Image loaded');
                imageLoadResolve.current?.();
                imageLoadResolve.current = null;
              }}
            />
          ) : (
            <View style={{ width: SCREEN.width, height: SCREEN.height }} />
          )}

          {/* Branding footer */}
          <View style={[styles.brandingBar, { backgroundColor: bgColor, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Image
              source={logoSource}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.brandText, { color: accentColor }]}>
              رُوح المسلم
            </Text>
          </View>
        </ViewShot>
      </View>

    </>
  );
}

const styles = StyleSheet.create({
  offScreen: {
    position: 'absolute',
    left: -9999,
    top: 0,
    opacity: 1,
  },
  captureContainer: {
    overflow: 'hidden',
  },
  brandingBar: {
    height: BRANDING_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 8,
  },
  brandText: {
    fontSize: 18,
    fontFamily: fontBold(),
    includeFontPadding: false,
  },
});
