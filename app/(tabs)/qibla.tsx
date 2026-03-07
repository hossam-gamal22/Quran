// app/(tabs)/qibla.tsx
// صفحة القبلة - روح المسلم
// آخر تحديث: 2026-03-07
// ✅ Fixed: Kaaba size, stability, 3D effect, compass direction, style switcher

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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Magnetometer } from 'expo-sensors';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { QIBLA_STYLES, AVAILABLE_STYLES } from './qiblaAssets';

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
const KAABA_SIZE = 56; // Fixed large size — always clear & visible
const KAABA_ORBIT_RADIUS = COMPASS_SIZE * 0.30; // orbit inside compass
const THUMBNAIL_SIZE = 52;
const QIBLA_STYLE_KEY = '@qibla_style';

const MECCA_LAT = 21.422487;
const MECCA_LNG = 39.826206;

// ---------------------------------------------------------------------------
// Qibla bearing (Great Circle formula — standard, well-tested)
// ---------------------------------------------------------------------------
const calculateQiblaBearing = (lat: number, lng: number): number => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(lat);
  const lat2 = toRad(MECCA_LAT);
  const dLng = toRad(MECCA_LNG - lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

// Aladhan API fallback
const fetchQiblaFromAladhan = async (
  lat: number,
  lng: number,
): Promise<number | null> => {
  try {
    const res = await fetch(`https://api.aladhan.com/v1/qibla/${lat}/${lng}`);
    if (!res.ok) return null;
    const json = await res.json();
    const dir = json?.data?.direction;
    if (typeof dir === 'number') return dir;
    return null;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Worklet: find shortest rotation path to avoid 360→0 spinning
// ---------------------------------------------------------------------------
function normalizeToTarget(current: number, target: number): number {
  'worklet';
  // Find target equivalent that is closest to current (avoids full 360 spin)
  let diff = target - current;
  // Normalize diff to [-180, 180]
  diff = ((diff + 180) % 360) - 180;
  if (diff < -180) diff += 360;
  return current + diff;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const QiblaScreen = () => {
  const insets = useSafeAreaInsets();
  const [qiblaBearing, setQiblaBearing] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [guidance, setGuidance] = useState('');
  const [currentStyleId, setCurrentStyleId] = useState('style1');
  const isAlignedRef = useRef(false);

  // We track a cumulative heading (not clamped to 0-360) to avoid wrap jitter
  const headingCumulative = useSharedValue(0);
  const lastRawHeading = useRef(0);

  const activeAssets =
    QIBLA_STYLES[currentStyleId as keyof typeof QIBLA_STYLES] ||
    QIBLA_STYLES.style1;

  // Load saved style
  useEffect(() => {
    AsyncStorage.getItem(QIBLA_STYLE_KEY).then((val) => {
      if (val && QIBLA_STYLES[val as keyof typeof QIBLA_STYLES]) {
        setCurrentStyleId(val);
      }
    });
  }, []);

  const handleStyleChange = useCallback((styleId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStyleId(styleId);
    AsyncStorage.setItem(QIBLA_STYLE_KEY, styleId).catch(() => {});
  }, []);

  // ------ Sensors ------
  useEffect(() => {
    let sub: { remove: () => void } | null = null;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('يرجى السماح بإذن الموقع لتحديد اتجاه القبلة');
          return;
        }
        if (!(await Location.hasServicesEnabledAsync())) {
          setErrorMsg(
            'خدمات الموقع معطلة من إعدادات الجهاز. يرجى تفعيلها ثم إعادة المحاولة.',
          );
          return;
        }

        let location: Location.LocationObject;
        try {
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
            maximumAge: 5000,
            timeout: 20000,
          });
        } catch {
          setErrorMsg(
            'تعذر تحديد الموقع. يرجى تفعيل خدمات الموقع من إعدادات الجهاز.',
          );
          return;
        }

        const lat = location.coords.latitude;
        const lng = location.coords.longitude;

        // Get bearing — try API, verify with local, fallback
        const apiBearing = await fetchQiblaFromAladhan(lat, lng);
        const localBearing = calculateQiblaBearing(lat, lng);

        if (typeof apiBearing === 'number') {
          let diff = Math.abs(((apiBearing - localBearing + 540) % 360) - 180);
          setQiblaBearing(diff < 5 ? apiBearing : localBearing);
        } else {
          setQiblaBearing(localBearing);
        }

        if (!(await Magnetometer.isAvailableAsync())) {
          setErrorMsg(
            'مستشعر البوصلة غير متاح على هذا الجهاز. يرجى التجربة على هاتف حقيقي.',
          );
          return;
        }

        Magnetometer.setUpdateInterval(60);

        sub = Magnetometer.addListener((data) => {
          // ---------------------------------------------------------------
          // CORRECT magnetometer → compass heading conversion
          // ---------------------------------------------------------------
          // atan2(y, x) gives radians from +X axis, counter-clockwise positive
          // For compass: 0°=North, 90°=East, clockwise
          //
          // On iOS:
          //   +x = Right, +y = Up (towards top of screen)
          //   North = +y direction → atan2 angle = 90°
          //   Compass heading = (90 - angleDeg + 360) % 360
          //
          // On Android:
          //   Same convention with expo-sensors Magnetometer
          // ---------------------------------------------------------------
          const angleDeg = Math.atan2(data.y, data.x) * (180 / Math.PI);
          const rawHeading = ((90 - angleDeg) % 360 + 360) % 360;

          // --- Cumulative heading to avoid 360/0 boundary spin ---
          // Calculate shortest delta from last raw heading
          let delta = rawHeading - lastRawHeading.current;
          // Normalize delta to [-180, 180]
          if (delta > 180) delta -= 360;
          if (delta < -180) delta += 360;
          lastRawHeading.current = rawHeading;

          // Apply delta to cumulative (this never wraps, so animation is smooth)
          const newCumulative = headingCumulative.value + delta;
          headingCumulative.value = withTiming(newCumulative, {
            duration: 120,
            easing: Easing.out(Easing.quad),
          });
        });
      } catch (err) {
        console.warn('Sensor/Location Error:', err);
        setErrorMsg('فشل في تهيئة أجهزة الاستشعار.');
      }
    })();

    return () => {
      sub?.remove();
    };
  }, []);

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

  // ------ DIAL: rotates opposite to heading so N/S/E/W match real world ------
  const dialAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${-headingCumulative.value}deg` }],
    };
  });

  // ------ POINTER: points toward Qibla relative to user ------
  const pointerAnimatedStyle = useAnimatedStyle(() => {
    const safeBearing =
      typeof qiblaBearing === 'number' && !isNaN(qiblaBearing)
        ? qiblaBearing
        : 0;
    const rotation = safeBearing - headingCumulative.value;

    // Guidance calculation
    let delta = ((safeBearing - headingCumulative.value) % 360 + 360) % 360;
    if (delta > 180) delta -= 360;
    let text: string;
    let aligned = false;
    if (delta > 5) {
      text = 'أدر الهاتف لليمين';
    } else if (delta < -5) {
      text = 'أدر الهاتف لليسار';
    } else {
      text = 'أنت تواجه القبلة ✓';
      aligned = true;
    }
    runOnJS(onGuidanceUpdate)(text, aligned);

    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  }, [qiblaBearing]);

  // ------ KAABA: fixed position on compass pointing to Qibla ------
  // Uses cos/sin to place it at a stable orbit point — NO rotate+translate trick
  const kaabaPositionStyle = useAnimatedStyle(() => {
    const safeBearing =
      typeof qiblaBearing === 'number' && !isNaN(qiblaBearing)
        ? qiblaBearing
        : 0;
    const angleDeg = safeBearing - headingCumulative.value;
    // Convert to radians, -90 because 0deg in CSS = 12 o'clock (top)
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    const tx = Math.cos(angleRad) * KAABA_ORBIT_RADIUS;
    const ty = Math.sin(angleRad) * KAABA_ORBIT_RADIUS;

    return {
      transform: [{ translateX: tx }, { translateY: ty }],
    };
  }, [qiblaBearing]);

  // ------ KAABA 3D: realistic tilt based on angular offset from Qibla ------
  const kaaba3DStyle = useAnimatedStyle(() => {
    const safeBearing =
      typeof qiblaBearing === 'number' && !isNaN(qiblaBearing)
        ? qiblaBearing
        : 0;
    let delta = ((safeBearing - headingCumulative.value) % 360 + 360) % 360;
    if (delta > 180) delta -= 360;

    // Tilt: perspective-based 3D
    const tiltY = interpolate(delta, [-180, 0, 180], [-30, 0, 30]);
    const tiltX = interpolate(Math.abs(delta), [0, 90, 180], [5, 20, 8]);
    const scale = interpolate(Math.abs(delta), [0, 20, 180], [1.2, 1.0, 0.85]);

    return {
      transform: [
        { perspective: 500 },
        { rotateY: `${tiltY}deg` },
        { rotateX: `${tiltX}deg` },
        { scale },
      ],
    };
  }, [qiblaBearing]);

  // ------ Loading / Error ------
  if (!qiblaBearing && !errorMsg) {
    return (
      <View style={styles.centeredLoading}>
        <ActivityIndicator size="large" color="#2f7659" />
        <Text style={styles.loadingText}>جاري تحديد اتجاه القبلة...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.centeredLoading}>
        <Text style={[styles.loadingText, { color: '#FF6B6B' }]}>
          {errorMsg}
        </Text>
      </View>
    );
  }

  const isAligned = guidance.includes('القبلة');

  return (
    <View style={styles.root}>
      {/* -------- Header -------- */}
      <View style={styles.header}>
        <Text style={styles.titleText}>اتجاه القبلة</Text>
        <Text style={styles.subtitleText}>{Math.round(qiblaBearing!)}°</Text>
      </View>

      {/* -------- Compass -------- */}
      <View style={styles.compassArea}>
        <View
          style={{
            width: COMPASS_SIZE,
            height: COMPASS_SIZE,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* DIAL — rotates so N/S/E/W match real world */}
          <Animated.View
            style={[
              {
                width: COMPASS_SIZE,
                height: COMPASS_SIZE,
                position: 'absolute',
              },
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

          {/* KAABA — orbits inside compass via translateX/Y (stable, no jitter) */}
          <Animated.View
            style={[styles.kaabaAnchor, kaabaPositionStyle]}
            pointerEvents="none"
          >
            <Animated.View style={[styles.kaabaBox, kaaba3DStyle]}>
              <SafeSvgRenderer
                asset={require('../../components/qibla/svg/kaaba.svg')}
                width={KAABA_SIZE}
                height={KAABA_SIZE}
                viewBox="0 0 300 300"
                preserveAspectRatio="xMidYMid meet"
              />
            </Animated.View>
          </Animated.View>
        </View>
      </View>

      {/* -------- Guidance -------- */}
      <View style={styles.guidanceContainer}>
        <BlurView
          intensity={30}
          tint="dark"
          style={[styles.guidanceBlur, isAligned && styles.guidanceActive]}
        >
          <Text
            style={[
              styles.guidanceText,
              isAligned && styles.guidanceTextActive,
            ]}
          >
            {guidance}
          </Text>
        </BlurView>
      </View>

      {/* -------- Style Switcher (10 styles) -------- */}
      <View style={styles.styleSwitcherWrap}>
        <BlurView
          intensity={40}
          tint="dark"
          style={styles.styleSwitcherBlur}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.styleSwitcherScroll}
          >
            {AVAILABLE_STYLES.map((styleId) => {
              const isActive = currentStyleId === styleId;
              const assets =
                QIBLA_STYLES[styleId as keyof typeof QIBLA_STYLES];
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
                  <SafeSvgRenderer
                    asset={assets.dial}
                    width={THUMBNAIL_SIZE - 14}
                    height={THUMBNAIL_SIZE - 14}
                  />
                  {isActive && <View style={styles.activeDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </BlurView>
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  titleText: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Cairo-Bold',
  },
  subtitleText: {
    color: '#aaa',
    fontSize: 16,
    fontFamily: 'Cairo-Regular',
    marginTop: 2,
  },
  compassArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Kaaba anchor sits at center of compass, then translateX/Y moves it
  kaabaAnchor: {
    position: 'absolute',
    width: KAABA_SIZE,
    height: KAABA_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kaabaBox: {
    width: KAABA_SIZE,
    height: KAABA_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    // Drop shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  guidanceContainer: {
    alignItems: 'center',
    paddingVertical: 14,
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
    backgroundColor: 'rgba(47, 118, 89, 0.2)',
    shadowColor: '#2f7659',
    shadowOpacity: 0.7,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  guidanceText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Cairo-SemiBold',
    textAlign: 'center',
  },
  guidanceTextActive: {
    color: '#2ECC71',
    textShadowColor: '#2ECC71',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  // Style switcher
  styleSwitcherWrap: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  styleSwitcherBlur: {
    borderRadius: 18,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    overflow: 'hidden',
  },
  styleSwitcherScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  styleThumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  styleThumbnailActive: {
    borderColor: '#2f7659',
    backgroundColor: 'rgba(47,118,89,0.15)',
  },
  activeDot: {
    position: 'absolute',
    bottom: 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2ECC71',
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
    fontFamily: 'Cairo-Regular',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default QiblaScreen;
