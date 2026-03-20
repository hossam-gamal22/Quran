// components/ui/SplashVideoOverlay.tsx
// Plays a language-specific splash video:
//   - On first launch (fresh install)
//   - When app is reopened after 30+ minutes in background
// Arabic users see Splash-ar.mp4, others see splash.mp4

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  Platform,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { fontSemiBold } from '@/lib/fonts';
import { isRTL, getLanguage } from '@/lib/i18n';

const { width, height } = Dimensions.get('window');

const FIRST_LAUNCH_KEY = '@app_launched_ever';
const LAST_BACKGROUND_KEY = '@app_last_background_time';
const ABSENCE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

// Video sources — require at module level for bundler
const VIDEO_AR = require('@/assets/videos/Splash-ar.mp4');
const VIDEO_EN = require('@/assets/videos/splash.mp4');

export function SplashVideoOverlay() {
  const [visible, setVisible] = useState(false);
  const [checkDone, setCheckDone] = useState(false);
  const videoRef = useRef<Video>(null);

  // Show video on first launch OR after 30+ minutes of absence
  useEffect(() => {
    const checkShouldShow = async () => {
      try {
        const [launchedEver, lastBgTime] = await Promise.all([
          AsyncStorage.getItem(FIRST_LAUNCH_KEY),
          AsyncStorage.getItem(LAST_BACKGROUND_KEY),
        ]);

        const isFirstLaunch = !launchedEver;
        const longAbsence = lastBgTime
          ? Date.now() - parseInt(lastBgTime, 10) > ABSENCE_THRESHOLD_MS
          : false;

        if (isFirstLaunch || longAbsence) {
          setVisible(true);
        }
      } catch {
        // On error, don't show video — safe fallback
      }
      setCheckDone(true);
    };
    checkShouldShow();
  }, []);

  const dismiss = useCallback(async () => {
    try {
      await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');
    } catch {}
    // Stop video before hiding
    try {
      await videoRef.current?.stopAsync();
    } catch {}
    setVisible(false);
  }, []);

  const handlePlaybackStatus = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded && status.didJustFinish) {
      dismiss();
    }
  }, [dismiss]);

  // Don't render anything until check completes, or if already seen
  if (!checkDone || !visible) return null;

  const lang = getLanguage();
  const videoSource = isRTL(lang) ? VIDEO_AR : VIDEO_EN;
  const skipLabel = isRTL(lang) ? 'تخطي' : 'Skip';

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(400)}
      style={styles.overlay}
    >
      <Video
        ref={videoRef}
        source={videoSource}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isMuted={false}
        isLooping={false}
        onPlaybackStatusUpdate={handlePlaybackStatus}
        style={styles.video}
      />

      {/* Skip button */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={dismiss}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.skipText}>{skipLabel}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: '#0a0a0a',
  },
  video: {
    width,
    height,
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  skipText: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: fontSemiBold(),
  },
});
