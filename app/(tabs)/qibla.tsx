// app/(tabs)/qibla.tsx
// صفحة القبلة - روح المسلم
// آخر تحديث: 2026-03-07

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
  withSpring,
  withTiming,
  interpolate,
  Easing,
  runOnJS,
  useDerivedValue,
  SharedValue,
} from 'react-native-reanimated';
import { QIBLA_STYLES, AVAILABLE_STYLES } from './qiblaAssets';

// ---------------------------------------------------------------------------
// SVG Renderer – handles Metro bundling SVGs as components or image sources
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
const POINTER_SCALE = 0.75; // pointer is 75% of compass
const POINTER_SIZE = COMPASS_SIZE * POINTER_SCALE;
const KAABA_SIZE = COMPASS_SIZE * 0.18; // Big Kaaba inside compass
const KAABA_ORBIT_RADIUS = COMPASS_SIZE * 0.32; // orbit inside compass circle
const THUMBNAIL_SIZE = 52;
const QIBLA_STYLE_KEY = '@qibla_style';

const MECCA_LAT = 21.422487;
const MECCA_LNG = 39.826206;

// ---------------------------------------------------------------------------
// Accurate Qibla bearing calculation (Great Circle)
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

// Aladhan API for authoritative qibla bearing
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
// Helper: shortest angular distance for smooth rotation across 0/360 boundary
// ---------------------------------------------------------------------------
function shortestAngleDeg(from: number, to: number): number {
  'worklet';
  let diff = ((to - from + 540) % 360) - 180;
  return from + diff;
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

  // Smooth heading using shared values (avoiding 360→0 wrap-around jitter)
  const rawHeading = useSharedValue(0);
  const smoothHeading = useSharedValue(0);
  const prevHeading = useSharedValue(0);

  const activeAssets =
    QIBLA_STYLES[currentStyleId as keyof typeof QIBLA_STYLES] ||
    QIBLA_STYLES.style1;

  // ------ Load saved style preference ------
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

  // ------ Sensors init ------
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

        // Fetch from API first, fallback to local calculation
        const apiBearing = await fetchQiblaFromAladhan(lat, lng);
        const localBearing = calculateQiblaBearing(lat, lng);

        if (typeof apiBearing === 'number') {
          // Verify API result is reasonable (within 5° of local calc)
          const diff = Math.abs(
            ((apiBearing - localBearing + 540) % 360) - 180,
          );
          if (diff < 5) {
            setQiblaBearing(apiBearing);
          } else {
            // API result seems off, use local
            console.warn(
              `Aladhan bearing ${apiBearing} differs from local ${localBearing} by ${diff}°, using local`,
            );
            setQiblaBearing(localBearing);
          }
        } else {
          setQiblaBearing(localBearing);
        }

        if (!(await Magnetometer.isAvailableAsync())) {
          setErrorMsg(
            'مستشعر البوصلة غير متاح على هذا الجهاز. يرجى التجربة على هاتف حقيقي.',
          );
          return;
        }

        Magnetometer.setUpdateInterval(60); // ~16fps for smooth compass

        sub = Magnetometer.addListener((data) => {
          // Correct heading calculation from magnetometer data
          // atan2(y, x) gives angle from positive x-axis
          // We need angle from North (positive y-axis) clockwise
          let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);

          // Convert from math angle to compass heading:
          // Math: 0=East, 90=North, counter-clockwise positive
          // Compass: 0=North, 90=East, clockwise positive
          // heading = (90 - angle + 360) % 360
          let compassHeading = (90 - angle + 360) % 360;

          // On iOS, the magnetometer already returns data oriented to screen
          // On Android, we may need to adjust
          if (Platform.OS === 'android') {
            // Android magnetometer: x points right, y points up
            // heading = atan2(y, x) adjusted for North
            compassHeading = (90 - angle + 360) % 360;
          }

          compassHeading = Math.round(compassHeading);

          // Use shortest angle interpolation to avoid 360→0 jumps
          const target = shortestAngleDeg(prevHeading.value, compassHeading);
          prevHeading.value = target;
          smoothHeading.value = withTiming(target, {
            duration: 150,
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

  // ------ Guidance callback ------
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

  // ------ DIAL rotation: rotates the whole compass dial opposite to heading ------
  // When user faces North, dial shows N at top. The dial rotates = -heading
  const dialAnimatedStyle = useAnimatedStyle(() => {
    const rotation = -smoothHeading.value;
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  // ------ POINTER rotation: points toward Qibla bearing on the dial ------
  // The pointer rotates relative to the user = qiblaBearing - heading
  const pointerAnimatedStyle = useAnimatedStyle(() => {
    const safeBearing =
      typeof qiblaBearing === 'number' && !isNaN(qiblaBearing)
        ? qiblaBearing
        : 0;
    const rotation = safeBearing - smoothHeading.value;

    // Guidance
    let delta = ((safeBearing - smoothHeading.value) % 360 + 360) % 360;
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

  // ------ Kaaba: orbits around compass center, points to Qibla direction ------
  // Kaaba position rotates with the pointer direction
  const kaabaOrbitStyle = useAnimatedStyle(() => {
    const safeBearing =
      typeof qiblaBearing === 'number' && !isNaN(qiblaBearing)
        ? qiblaBearing
        : 0;
    const rotation = safeBearing - smoothHeading.value;
    // Convert to radians for positioning
    // -90 because CSS rotation 0deg = top (12 o'clock)
    const rad = ((rotation - 90) * Math.PI) / 180;
    const x = Math.cos(rad) * KAABA_ORBIT_RADIUS;
    const y = Math.sin(rad) * KAABA_ORBIT_RADIUS;

    return {
      transform: [{ translateX: x }, { translateY: y }],
    };
  }, [qiblaBearing]);

  // ------ 3D Kaaba tilt effect: tilts based on how far user is from facing Qibla ------
  const kaaba3DStyle = useAnimatedStyle(() => {
    const safeBearing =
      typeof qiblaBearing === 'number' && !isNaN(qiblaBearing)
        ? qiblaBearing
        : 0;
    let delta = ((safeBearing - smoothHeading.value) % 360 + 360) % 360;
    if (delta > 180) delta -= 360;

    // Tilt intensity: more tilt when Qibla is to the side
    const tiltY = interpolate(delta, [-180, 0, 180], [-25, 0, 25]);
    const tiltX = interpolate(
      Math.abs(delta),
      [0, 90, 180],
      [0, 15, 5],
    );
    // Scale: slightly larger when aligned
    const scale = interpolate(Math.abs(delta), [0, 30, 180], [1.15, 1.0, 0.9]);

    return {
      transform: [
        { perspective: 600 },
        { rotateY: `${tiltY}deg` },
        { rotateX: `${tiltX}deg` },
        { scale },
      ],
    };
  }, [qiblaBearing]);

  // ------ Loading / Error states ------
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
      {/* -------- Top Header -------- */}
      <View style={styles.header}>
        <Text style={styles.titleText}>اتجاه القبلة</Text>
        <Text style={styles.subtitleText}>{Math.round(qiblaBearing!)}°</Text>
      </View>

      {/* -------- Compass Area -------- */}
      <View style={styles.compassArea}>
        <View
          style={{
            width: COMPASS_SIZE,
            height: COMPASS_SIZE,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Compass Dial — rotates with heading so N always points actual north */}
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

          {/* Pointer — rotates to point toward Qibla */}
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              styles.pointerCenter,
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

          {/* Kaaba — orbits inside compass, has 3D parallax effect */}
          <Animated.View
            style={[styles.kaabaOrbitWrapper, kaabaOrbitStyle]}
            pointerEvents="none"
          >
            <Animated.View style={[styles.kaabaMarker, kaaba3DStyle]}>
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

      {/* -------- Guidance Text -------- */}
      <View style={styles.guidanceContainer}>
        <BlurView
          intensity={30}
          tint="dark"
          style={[
            styles.guidanceBlur,
            isAligned && styles.guidanceActive,
          ]}
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

      {/* -------- Style Switcher (10 compass styles) -------- */}
      <View style={styles.styleSwitcherContainer}>
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
            {AVAILABLE_STYLES.map((styleId, index) => {
              const isActive = currentStyleId === styleId;
              const styleAssets =
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
                    asset={styleAssets.dial}
                    width={THUMBNAIL_SIZE - 12}
                    height={THUMBNAIL_SIZE - 12}
                  />
                  {isActive && <View style={styles.thumbnailDot} />}
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
  // ---- Header ----
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
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
  // ---- Compass ----
  compassArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointerCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  kaabaOrbitWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    // Center of compass — translateX/Y shift from center
    width: KAABA_SIZE,
    height: KAABA_SIZE,
  },
  kaabaMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: KAABA_SIZE,
    height: KAABA_SIZE,
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  // ---- Guidance ----
  guidanceContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  guidanceBlur: {
    borderRadius: 18,
    paddingHorizontal: 32,
    paddingVertical: 14,
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
  // ---- Style Switcher ----
  styleSwitcherContainer: {
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
    paddingHorizontal: 12,
    gap: 8,
    minHeight: THUMBNAIL_SIZE + 8,
  },
  styleThumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  styleThumbnailActive: {
    borderColor: '#2f7659',
    backgroundColor: 'rgba(47, 118, 89, 0.15)',
    shadowColor: '#2f7659',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  thumbnailDot: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2ECC71',
  },
  // ---- Loading / Error ----
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
