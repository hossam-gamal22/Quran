// app/(tabs)/qibla.tsx
// صفحة القبلة - روح المسلم
// آخر تحديث: 2026-03-07
// ✅ Uses Location.watchHeadingAsync for correct heading (like Google Qibla Finder)
// ✅ Kaaba is FIXED on screen, compass dial rotates behind it
// ✅ Qibla bearing from Aladhan API

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { useCompassHeading } from '@/hooks/use-compass-heading';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { QIBLA_STYLES, AVAILABLE_STYLES } from '@/lib/qiblaAssets';
// Removed: interstitial ads on qibla style change to reduce user frustration
import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useIsRTL } from '@/hooks/use-is-rtl';

// ---------------------------------------------------------------------------
// SVG Renderer
// ---------------------------------------------------------------------------
const SafeSvgRenderer = ({
  asset,
  width,
  height,
  viewBox,
  preserveAspectRatio,
}: {
  asset: any;
  width: number;
  height: number;
  viewBox?: string;
  preserveAspectRatio?: string;
}) => {
  if (!asset) return null;
  const svgProps: Record<string, any> = { width, height };
  if (viewBox) svgProps.viewBox = viewBox;
  if (preserveAspectRatio) svgProps.preserveAspectRatio = preserveAspectRatio;

  if (typeof asset === 'function') {
    const Svg = asset;
    return <Svg {...svgProps} />;
  }
  if (asset?.default && typeof asset.default === 'function') {
    const Svg = asset.default;
    return <Svg {...svgProps} />;
  }
  return <Image source={asset} style={{ width, height, resizeMode: 'contain' }} />;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(SCREEN_WIDTH * 0.82, 360);
const POINTER_SIZE = COMPASS_SIZE * 0.72;
const KAABA_SIZE = 90;
const THUMBNAIL_SIZE = 62;
const QIBLA_STYLE_KEY = '@qibla_style_v2';

// ---------------------------------------------------------------------------
// Network connectivity check
// ---------------------------------------------------------------------------
const checkConnectivity = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://clients3.google.com/generate_204', {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.status === 204 || res.ok;
  } catch {
    return false;
  }
};

// ---------------------------------------------------------------------------
// Fetch Qibla bearing from UmmahAPI
// GET https://ummahapi.com/api/qibla?lat={lat}&lng={lng}
// Returns { success, data: { qibla_direction, ... } }
// ---------------------------------------------------------------------------
const fetchQiblaDirection = async (
  lat: number,
  lng: number,
): Promise<number | null> => {
  try {
    const res = await fetch(
      `https://ummahapi.com/api/qibla?lat=${lat}&lng=${lng}`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    const dir = json?.data?.qibla_direction;
    if (typeof dir === 'number' && !isNaN(dir)) return dir;
    return null;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Fallback: AlAdhan Qibla API
// GET https://api.aladhan.com/v1/qibla/{latitude}/{longitude}
// Returns { data: { direction } }
// ---------------------------------------------------------------------------
const fetchQiblaFromAladhan = async (
  lat: number,
  lng: number,
): Promise<number | null> => {
  try {
    const res = await fetch(
      `https://api.aladhan.com/v1/qibla/${lat}/${lng}`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    const dir = json?.data?.direction;
    if (typeof dir === 'number' && !isNaN(dir)) return dir;
    return null;
  } catch {
    return null;
  }
};

// Local great-circle fallback (only used if both APIs fail)
const calculateQiblaBearingLocal = (lat: number, lng: number): number => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const MECCA_LAT = 21.422487;
  const MECCA_LNG = 39.826206;
  const lat1 = toRad(lat);
  const lat2 = toRad(MECCA_LAT);
  const dLng = toRad(MECCA_LNG - lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const QiblaScreen = () => {
  const insets = useSafeAreaInsets();
  const { settings, t, isDarkMode } = useSettings();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  const [qiblaBearing, setQiblaBearing] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [guidance, setGuidance] = useState('');
  const [currentStyleId, setCurrentStyleId] = useState('style10');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const isAlignedRef = useRef(false);
  const styleSwitcherRef = useRef<ScrollView>(null);

  // High-frequency compass heading (Magnetometer + Accelerometer @ 60Hz)
  const { headingCumulative, accuracy: compassAccuracy } = useCompassHeading();

  const activeAssets =
    QIBLA_STYLES[currentStyleId as keyof typeof QIBLA_STYLES] ||
    QIBLA_STYLES.style1;
  
  const hasScrolledRef = useRef(false);

  // Load saved style
  useEffect(() => {
    AsyncStorage.getItem(QIBLA_STYLE_KEY).then((val) => {
      if (val && QIBLA_STYLES[val as keyof typeof QIBLA_STYLES]) {
        setCurrentStyleId(val);
      }
    });
  }, []);

  // Scroll to end when ScrollView layout is ready (RTL behavior - start from right)
  const handleScrollViewLayout = useCallback(() => {
    if (!hasScrolledRef.current && styleSwitcherRef.current) {
      styleSwitcherRef.current.scrollToEnd({ animated: false });
      hasScrolledRef.current = true;
    }
  }, []);

  const handleStyleChange = useCallback(async (styleId: string) => {
    if (styleId === currentStyleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStyleId(styleId);
    AsyncStorage.setItem(QIBLA_STYLE_KEY, styleId).catch(() => {});
  }, [currentStyleId]);

  // ------ Location + Qibla Bearing ------
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // 1. Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (mounted) setErrorMsg(t('qibla.permissionRequired') || 'Permission required to determine Qibla direction');
          return;
        }
        if (!(await Location.hasServicesEnabledAsync())) {
          if (mounted)
            setErrorMsg(
              t('qibla.servicesDisabled') || 'Location services disabled. Please enable them and try again.'
            );
          return;
        }

        // 2. Get current position
        let position: Location.LocationObject;
        try {
          position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
        } catch {
          if (mounted)
            setErrorMsg(
              t('qibla.locationFailed') || 'Could not determine location. Please enable location services.'
            );
          return;
        }

        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (mounted) setUserCoords({ lat, lng });

        // 3. Get Qibla bearing: try APIs first, fall back to local calculation
        let bearing: number | null = null;
        const online = await checkConnectivity();
        if (online) {
          bearing = await fetchQiblaDirection(lat, lng);
          if (bearing == null) bearing = await fetchQiblaFromAladhan(lat, lng);
        }
        if (mounted) {
          setQiblaBearing(bearing ?? calculateQiblaBearingLocal(lat, lng));
        }

        // Heading is now handled by useCompassHeading hook (60Hz Magnetometer+Accelerometer)
      } catch (err) {
        console.warn('Qibla init error:', err);
        if (mounted) setErrorMsg(t('qibla.sensorFailed') || 'Failed to initialize sensors.');
      }
    })();

    return () => {
      mounted = false;
    };
  }, [retryKey]);

  // ------ Guidance ------
  const onGuidanceUpdate = useCallback(
    (text: string, aligned: boolean) => {
      setGuidance(text);
      if (aligned && !isAlignedRef.current) {
        isAlignedRef.current = true;
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
      } else if (!aligned) {
        isAlignedRef.current = false;
      }
    },
    [],
  );

  // =====================================================================
  // HOW IT WORKS:
  //
  // - The KAABA is FIXED at the top of the screen — it never moves.
  //   It serves as the target reference point.
  //
  // - The COMPASS DIAL rotates = -(heading). So N/S/E/W labels on the
  //   dial SVG always face their real-world directions.
  //
  // - The POINTER rotates = qiblaBearing - heading. When the pointer
  //   arrow aligns upward toward the fixed Kaaba icon, the user is
  //   facing Qibla.
  // =====================================================================

  // DIAL: rotates opposite to heading
  const dialAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${-headingCumulative.value}deg` }],
    };
  });

  // Pre-compute translated guidance strings outside the worklet
  const guidanceAligned = t('qibla.aligned') || 'You are facing Qibla ✓';
  const guidanceTurnRight = t('qibla.turnRight') || 'Turn Right';
  const guidanceTurnLeft = t('qibla.turnLeft') || 'Turn Left';

  // POINTER: rotates to point toward Qibla
  const pointerAnimatedStyle = useAnimatedStyle(() => {
    const safeBearing =
      typeof qiblaBearing === 'number' && !isNaN(qiblaBearing)
        ? qiblaBearing
        : 0;
    const rotation = safeBearing - headingCumulative.value;

    // Calculate guidance
    let delta = ((safeBearing - headingCumulative.value) % 360 + 360) % 360;
    if (delta > 180) delta -= 360;
    let text: string;
    let aligned = false;
    if (delta > 5) {
      text = guidanceTurnRight;
    } else if (delta < -5) {
      text = guidanceTurnLeft;
    } else {
      text = guidanceAligned;
      aligned = true;
    }
    runOnJS(onGuidanceUpdate)(text, aligned);

    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  }, [qiblaBearing, guidanceAligned, guidanceTurnRight, guidanceTurnLeft]);

  // ------ Loading / Error / Offline ------
  const bgProps = {
    backgroundKey: settings.display.appBackground,
    backgroundUrl: settings.display.appBackgroundUrl,
    opacity: settings.display.backgroundOpacity ?? 1,
    style: { flex: 1 } as const,
  };

  if (!qiblaBearing && !errorMsg) {
    return (
      <BackgroundWrapper {...bgProps}>
      <View style={styles.centeredLoading}>
        <ActivityIndicator size="large" color="#0d8e62" />
        <Text style={[styles.loadingText, { color: colors.text }]}>{t('qibla.findingDirection') || 'Finding Qibla Direction...'}</Text>
      </View>
      </BackgroundWrapper>
    );
  }

  if (errorMsg) {
    return (
      <BackgroundWrapper {...bgProps}>
      <View style={styles.centeredLoading}>
        <MaterialCommunityIcons name="alert-circle-outline" size={56} color="#FF6B6B" />
        <Text style={[styles.loadingText, { color: '#FF6B6B', marginTop: 16 }]}>{errorMsg}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => {
            setErrorMsg(null);
            setQiblaBearing(null);
            setRetryKey((k) => k + 1);
          }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="refresh" size={20} color="#fff" />
          <Text style={styles.retryText}>{t('common.retry') || 'Retry'}</Text>
        </TouchableOpacity>
      </View>
      </BackgroundWrapper>
    );
  }

  const isAligned = guidance === guidanceAligned;

  return (
    <BackgroundWrapper {...bgProps}>
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.scrollContainer, { paddingBottom: Math.max(insets.bottom, 16) + 60 }]}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {/* 1. Guidance text */}
      <View style={styles.guidanceContainer}>
        <BlurView
          intensity={80}
          tint={"systemThickMaterialDark" as any}
          style={[styles.guidanceBlur, isAligned && styles.guidanceActive]}
        >
          <Text
            style={[styles.guidanceText, isAligned && styles.guidanceTextActive]}
          >
            {guidance}
          </Text>
        </BlurView>
      </View>

      {/* Calibration banner — shown when compass accuracy is low */}
      {compassAccuracy === 'low' && (
        <View style={styles.calibrationBanner}>
          <MaterialCommunityIcons name="compass-off" size={16} color="#FFA726" />
          <Text style={styles.calibrationText}>
            {t('qibla.calibrate') || 'حرّك هاتفك بشكل ∞ لمعايرة البوصلة'}
          </Text>
        </View>
      )}

      {/* 2. Style Switcher */}
      <View style={styles.styleSwitcherWrap}>
        <BlurView 
          intensity={isDarkMode ? 20 : 60} 
          tint={isDarkMode ? 'systemThickMaterialDark' : 'systemChromeMaterialLight'} 
          style={[styles.styleSwitcherBlur, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.7)' }]}
        >
          {/* Thumbnails container with border */}
          <View style={[styles.thumbnailsContainer, { borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}>
            <ScrollView
              ref={styleSwitcherRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.styleSwitcherScroll}
              onContentSizeChange={handleScrollViewLayout}
            >
            {AVAILABLE_STYLES.map((styleId) => {
              const isActive = currentStyleId === styleId;
              const assets =
                QIBLA_STYLES[styleId as keyof typeof QIBLA_STYLES];
              const thumbDialSize = THUMBNAIL_SIZE - 10;
              const thumbPointerSize = thumbDialSize * 0.65;
              const thumbKaabaSize = thumbDialSize * 0.35;
              return (
                <TouchableOpacity
                  key={styleId}
                  onPress={() => handleStyleChange(styleId)}
                  activeOpacity={0.7}
                  style={[
                    styles.styleThumbnail,
                    isActive && styles.styleThumbnailActive,
                  ]}
                >
                  <View style={{ width: thumbDialSize, height: thumbDialSize, alignItems: 'center', justifyContent: 'center' }}>
                    {/* Dial background */}
                    <View style={{ position: 'absolute', width: thumbDialSize, height: thumbDialSize }}>
                      <SafeSvgRenderer
                        asset={assets.dial}
                        width={thumbDialSize}
                        height={thumbDialSize}
                      />
                    </View>
                    {/* Pointer overlay */}
                    <SafeSvgRenderer
                      asset={assets.pointer}
                      width={thumbPointerSize}
                      height={thumbPointerSize}
                      viewBox="0 0 300 300"
                      preserveAspectRatio="xMidYMid meet"
                    />
                    {/* Kaaba at top */}
                    <View style={{ position: 'absolute', top: -2, alignItems: 'center' }}>
                      <SafeSvgRenderer
                        asset={assets.kaaba}
                        width={thumbKaabaSize}
                        height={thumbKaabaSize}
                        viewBox="0 0 300 300"
                        preserveAspectRatio="xMidYMid meet"
                      />
                    </View>
                  </View>
                  {isActive && <View style={styles.activeDot} />}
                </TouchableOpacity>
              );
            })}
            </ScrollView>
          </View>
          {/* Swipe hint */}
          <View style={styles.swipeHintContainer}>
            <MaterialCommunityIcons name="gesture-swipe-horizontal" size={16} color={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'} />
            <Text style={[styles.swipeHintText, { color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>
              {t('qibla.swipeToChange') || 'اسحب للتبديل بين الأنماط'}
            </Text>
          </View>
        </BlurView>
      </View>

      {/* 3. Kaaba + Compass */}
      <View style={styles.compassArea}>
        {/* KAABA — static, fixed above compass */}
        <View style={styles.fixedKaabaContainer}>
          <SafeSvgRenderer
            asset={activeAssets.kaaba}
            width={KAABA_SIZE}
            height={KAABA_SIZE}
            viewBox="0 0 300 300"
            preserveAspectRatio="xMidYMid meet"
          />
        </View>

        <View
          style={{
            width: COMPASS_SIZE,
            height: COMPASS_SIZE,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* DIAL — rotates with heading so N/S/E/W match real world */}
          <Animated.View
            style={[
              { width: COMPASS_SIZE, height: COMPASS_SIZE, position: 'absolute' },
              dialAnimatedStyle,
            ]}
          >
            <SafeSvgRenderer
              asset={activeAssets.dial}
              width={COMPASS_SIZE}
              height={COMPASS_SIZE}
            />
          </Animated.View>

          {/* POINTER — rotates to point toward Qibla */}
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              styles.centered,
              pointerAnimatedStyle,
            ]}
            pointerEvents="none"
          >
            <SafeSvgRenderer
              asset={activeAssets.pointer}
              width={POINTER_SIZE}
              height={POINTER_SIZE}
              viewBox="0 0 300 300"
              preserveAspectRatio="xMidYMid meet"
            />
          </Animated.View>
        </View>
      </View>

      {/* 4. Title + degree + coordinates at the bottom */}
      <View style={styles.header}>
        <Text style={[styles.titleText, { color: colors.text }]}>{t('tabs.qibla') || 'Qibla Direction'}</Text>
        <Text style={[styles.subtitleText, { color: colors.muted }]}>{Math.round(qiblaBearing!)}°</Text>
        {userCoords && (
          <Text style={[styles.coordsText, { color: colors.muted }]}>
            {userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)}
          </Text>
        )}
      </View>
    </ScrollView>
    </BackgroundWrapper>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const _styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 2,
  },
  titleText: {
    color: '#fff',
    fontSize: 22,
    fontFamily: fontBold(),
  },
  subtitleText: {
    color: '#A3A3A3',
    fontSize: 16,
    fontFamily: fontRegular(),
    marginTop: 2,
  },
  coordsText: {
    color: '#8E8E93',
    fontSize: 12,
    fontFamily: fontRegular(),
    marginTop: 2,
  },
  compassArea: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Kaaba is FIXED above the compass — never rotates
  fixedKaabaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -KAABA_SIZE * 0.35,
    zIndex: 10,
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  guidanceContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  guidanceBlur: {
    borderRadius: 18,
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    overflow: 'hidden',
  },
  guidanceActive: {
    backgroundColor: 'rgba(6, 79, 47, 0.2)',
    shadowColor: '#0d8e62',
    shadowOpacity: 0.7,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  guidanceText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: fontSemiBold(),
    textAlign: 'center',
  },
  guidanceTextActive: {
    color: '#2ECC71',
    textShadowColor: '#2ECC71',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  calibrationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginHorizontal: 24,
    marginBottom: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 167, 38, 0.15)',
  },
  calibrationText: {
    color: '#FFA726',
    fontSize: 13,
    fontFamily: fontRegular(),
    textAlign: 'center',
  },
  styleSwitcherWrap: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  styleSwitcherBlur: {
    borderRadius: 18,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  styleSwitcherScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 8,
  },
  thumbnailsContainer: {
    borderWidth: 1,
    borderRadius: 14,
    marginHorizontal: 4,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  styleThumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 16,
    backgroundColor: 'rgba(200,200,200,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  styleThumbnailActive: {
    borderColor: '#0d8e62',
    backgroundColor: 'rgba(13,142,98,0.25)',
  },
  activeDot: {
    position: 'absolute',
    bottom: 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2ECC71',
  },
  swipeHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 6,
    paddingBottom: 4,
  },
  swipeHintText: {
    fontSize: 12,
    fontFamily: fontRegular(),
  },
  centeredLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    minHeight: 300,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontFamily: fontRegular(),
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0d8e62',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fontSemiBold(),
  },
});

export default QiblaScreen;
