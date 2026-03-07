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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { QIBLA_STYLES } from './qiblaAssets';

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
const COMPASS_SIZE = Math.min(SCREEN_WIDTH * 0.8, 350);
// Proportional pointer: designer artboards 260 (dial) vs 90 (pointer)
const POINTER_SCALE = 180 / 260; // much larger pointer
const POINTER_SIZE = COMPASS_SIZE * POINTER_SCALE;
const KAABA_SIZE = COMPASS_SIZE * 0.22; // much larger Kaaba
const THUMBNAIL_SIZE = 54;
const KAABA_MARGIN = 12; // distance from compass perimeter

const MECCA_LAT = 21.422487;
const MECCA_LNG = 39.826206;

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

// Optional: fetch Qibla bearing from Aladhan API as a fallback/verification
const fetchQiblaFromAladhan = async (lat: number, lng: number): Promise<number | null> => {
  try {
    const res = await fetch(`https://api.aladhan.com/v1/qibla/${lat}/${lng}`);
    if (!res.ok) return null;
    const json = await res.json();
    // Aladhan returns { data: { direction: <degrees> } }
    const dir = json?.data?.direction;
    if (typeof dir === 'number') return dir;
    return null;
  } catch (e) {
    console.warn('Aladhan Qibla fetch failed', e);
    return null;
  }
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const QiblaScreen = () => {
  const insets = useSafeAreaInsets();
  const [qiblaBearing, setQiblaBearing] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [guidance, setGuidance] = useState('');
  // For style switcher
  const [currentStyleId, setCurrentStyleId] = useState('style1');
  const isAlignedRef = useRef(false);
  const heading = useSharedValue(0);

  const activeAssets = QIBLA_STYLES[currentStyleId as keyof typeof QIBLA_STYLES];

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
          setErrorMsg('خدمات الموقع معطلة من إعدادات الجهاز. يرجى تفعيلها ثم إعادة المحاولة.');
          return;
        }

        let location: Location.LocationObject;
        try {
          // request highest accuracy available for best bearing calculation
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
            maximumAge: 5000,
            timeout: 20000,
          });
        } catch (e) {
          console.warn('getCurrentPositionAsync failed', e);
          setErrorMsg('تعذر تحديد الموقع. يرجى تفعيل خدمات الموقع من إعدادات الجهاز.');
          return;
        }

        // Try Aladhan API for an authoritative qibla bearing, fall back to local calc
        (async () => {
          const lat = location.coords.latitude;
          const lng = location.coords.longitude;
          const apiBearing = await fetchQiblaFromAladhan(lat, lng);
          if (typeof apiBearing === 'number') {
            setQiblaBearing(apiBearing);
          } else {
            setQiblaBearing(calculateQiblaBearing(lat, lng));
          }
        })();

        if (!(await Magnetometer.isAvailableAsync())) {
          setErrorMsg('مستشعر البوصلة غير متاح على هذا الجهاز. يرجى التجربة على هاتف حقيقي.');
          return;
        }

        Magnetometer.setUpdateInterval(100);
        sub = Magnetometer.addListener((data) => {
          let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
          if (angle < 0) angle += 360;
          const h = Math.round((angle + 90) % 360);
          heading.value = withSpring(h, { damping: 20, stiffness: 100 });
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

  // ------ Guidance callback (called from UI thread via runOnJS) ------
  const onGuidanceUpdate = useCallback((text: string, aligned: boolean) => {
    setGuidance(text);
    if (aligned && !isAlignedRef.current) {
      isAlignedRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else if (!aligned) {
      isAlignedRef.current = false;
    }
  }, []);


  // ------ Animated rotation for the pointer wrapper ------
  const pointerAnimatedStyle = useAnimatedStyle(() => {
    const safeBearing =
      typeof qiblaBearing === 'number' && !isNaN(qiblaBearing) ? qiblaBearing : 0;
    const safeHeading =
      typeof heading.value === 'number' && !isNaN(heading.value) ? heading.value : 0;

    const rotation = safeBearing - safeHeading;

    // Guidance (sent to JS thread)
    let delta = ((safeBearing - safeHeading) % 360 + 360) % 360;
    if (delta > 180) delta -= 360;
    let text: string;
    let aligned = false;
    if (delta > 3) text = 'أدر الهاتف لليمين';
    else if (delta < -3) text = 'أدر الهاتف لليسار';
    else {
      text = 'أنت تواجه القبلة';
      aligned = true;
    }
    runOnJS(onGuidanceUpdate)(text, aligned);

    return { transform: [{ rotate: `${isNaN(rotation) ? 0 : rotation}deg` }] };
  }, [qiblaBearing]);

  // ------ 3D Kaaba Parallax Effect ------
  const kaaba3DAnimatedStyle = useAnimatedStyle(() => {
    // Simulate a 3D tilt based on heading (for demo: rotateX/rotateY based on heading)
    // Smoother, more realistic effect
    const tiltX = Math.sin((heading.value * Math.PI) / 180) * 10; // -10 to +10 deg
    const tiltY = Math.cos((heading.value * Math.PI) / 180) * 10; // -10 to +10 deg
    return {
      transform: [
        { perspective: 800 },
        { rotateX: `${tiltX}deg` },
        { rotateY: `${tiltY}deg` },
      ],
    };
  });

    // ------ Kaaba marker position: place outside compass perimeter pointing to bearing
    const kaabaPositionAnimatedStyle = useAnimatedStyle(() => {
      const safeBearing =
        typeof qiblaBearing === 'number' && !isNaN(qiblaBearing) ? qiblaBearing : 0;
      const safeHeading =
        typeof heading.value === 'number' && !isNaN(heading.value) ? heading.value : 0;

      const rotation = safeBearing - safeHeading;
      const radius = COMPASS_SIZE / 2 + KAABA_MARGIN + KAABA_SIZE / 2;

      return {
        transform: [
          { rotate: `${isNaN(rotation) ? 0 : rotation}deg` },
          { translateY: -radius },
          { rotate: `${isNaN(rotation) ? 0 : -rotation}deg` },
        ],
      };
    }, [qiblaBearing]);

  // ------ Loading / Error states ------
  if (!qiblaBearing && !errorMsg) {
    return (
      <View style={styles.centeredLoading}>
        <ActivityIndicator size="large" color="#1ED760" />
        <Text style={styles.loadingText}>جاري تحديد اتجاه القبلة...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.centeredLoading}>
        <Text style={[styles.loadingText, { color: '#FF6B6B' }]}>{errorMsg}</Text>
      </View>
    );
  }

  const isAligned = guidance === 'أنت تواجه القبلة';

  // ------ Main layout: strict Flexbox Column ------
  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top, // Only safe area, no extra gap
          // ensure any bottom controls (color pickers / thumbnails) sit above nav
          paddingBottom: insets.bottom + 12,
        },
      ]}
    >
      {/* -------- Top Header -------- */}
      <View style={styles.header}>
        <Text style={styles.titleText}>اتجاه القبلة</Text>
        <Text style={styles.subtitleText}>{Math.round(qiblaBearing!)}°</Text>
      </View>

      {/* -------- Middle: Compass -------- */}
      <View style={styles.compassArea}>
        <View style={{ width: COMPASS_SIZE, height: COMPASS_SIZE }}>
          {/* Compass Dial */}
          <SafeSvgRenderer
            asset={activeAssets.dial}
            width={COMPASS_SIZE}
            height={COMPASS_SIZE}
          />

          {/* Pointer — enlarged for clarity */}
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
              width={POINTER_SIZE * 1.22} // 22% larger
              height={POINTER_SIZE * 1.22}
              viewBox="0 0 300 300"
              preserveAspectRatio="xMidYMid meet"
            />
          </Animated.View>

          {/* Kaaba marker — positioned outside compass using animated polar transform */}
          <Animated.View
            style={[StyleSheet.absoluteFillObject, styles.pointerCenter]}
            pointerEvents="none"
          >
            <Animated.View
              style={[kaabaPositionAnimatedStyle, kaaba3DAnimatedStyle, styles.kaabaMarker]}
            >
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
          style={[styles.guidanceBlur, isAligned && styles.guidanceActive]}
        >
          <Text style={[styles.guidanceText, isAligned && styles.guidanceTextActive]}>
            {guidance}
          </Text>
        </BlurView>
      </View>

      {/* Bottom style switcher removed per request */}
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
    paddingTop: 0,
    paddingBottom: 8,
  },
  titleText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitleText: {
    color: '#aaa',
    fontSize: 16,
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
  kaabaMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: KAABA_SIZE,
    height: KAABA_SIZE,
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
    backgroundColor: 'rgba(30, 215, 96, 0.15)',
    shadowColor: '#1ED760',
    shadowOpacity: 0.7,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  guidanceText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  guidanceTextActive: {
    color: '#1ED760',
    textShadowColor: '#1ED760',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    fontWeight: 'bold',
  },
  // ---- Style Switcher ----
  styleSwitcherBlur: {
    marginHorizontal: 0,
    marginTop: 0,
    borderRadius: 18,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center',
    overflow: 'hidden',
  },
  styleSwitcherScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    minHeight: 54,
  },
  styleThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  styleThumbnailActive: {
    borderColor: '#1ED760',
    backgroundColor: 'rgba(30,215,96,0.10)',
    shadowColor: '#1ED760',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  // ---- Loading / Error ----
  centeredLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontFamily: 'Amiri',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default QiblaScreen;
