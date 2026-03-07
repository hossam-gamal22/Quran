import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSettings } from '@/contexts/SettingsContext';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { Colors, DarkColors, Spacing, BorderRadius, Shadows, Typography, GlassStyles } from '../../constants/theme';
import { APP_CONFIG } from '../../constants/app';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { Share } from 'react-native';
import { copyToClipboard } from '../../lib/share-service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COMPASS_SIZE = SCREEN_WIDTH * 0.75;

// إحداثيات الكعبة المشرفة
const KAABA_LATITUDE = 21.4225;
const KAABA_LONGITUDE = 39.8262;

// ============================================
// المكون الرئيسي
// ============================================

export default function QiblaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useSettings();

  // High-contrast colors for accessibility on this screen
  const CONTRAST_WHITE = '#FFFFFF';
  const CONTRAST_LIGHT = '#E0E0E0';
  const ICON_COLOR = isDarkMode ? CONTRAST_WHITE : Colors.text;
  const TEXT_COLOR = isDarkMode ? CONTRAST_WHITE : Colors.text;
  const MUTED_COLOR = isDarkMode ? CONTRAST_LIGHT : Colors.textSecondary;
  
  // الحالات
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number; city?: string } | null>(null);
  const [qiblaDirection, setQiblaDirection] = useState(0);
  const [compassHeading, setCompassHeading] = useState(0);
  const [accuracy, setAccuracy] = useState<'low' | 'medium' | 'high'>('low');
  const [showShareModal, setShowShareModal] = useState(false);
  const THEMES = [
    { key: 'modern', label: 'عصري' },
    { key: 'classic', label: 'كلاسيكي' },
    { key: 'minimal', label: 'بسيط' },
  ] as const;

  const [theme, setTheme] = useState<typeof THEMES[number]['key']>('modern');
  
  // الأنيميشن
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const qiblaRotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ============================================
  // حساب اتجاه القبلة
  // ============================================

  const calculateQiblaDirection = (latitude: number, longitude: number): number => {
    const lat1 = (latitude * Math.PI) / 180;
    const lat2 = (KAABA_LATITUDE * Math.PI) / 180;
    const lonDiff = ((KAABA_LONGITUDE - longitude) * Math.PI) / 180;

    const y = Math.sin(lonDiff);
    const x = Math.cos(lat1) * Math.tan(lat2) - Math.sin(lat1) * Math.cos(lonDiff);

    let qibla = (Math.atan2(y, x) * 180) / Math.PI;
    qibla = (qibla + 360) % 360;

    return qibla;
  };

  const calculateDistance = (latitude: number, longitude: number): number => {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const lat1 = (latitude * Math.PI) / 180;
    const lat2 = (KAABA_LATITUDE * Math.PI) / 180;
    const dLat = lat2 - lat1;
    const dLon = ((KAABA_LONGITUDE - longitude) * Math.PI) / 180;

    const a = Math.sin(dLat / 2) ** 2 + 
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // ============================================
  // تحميل البيانات
  // ============================================

  // Initialize location + magnetometer only when this screen is focused (mounted/visible)
  useFocusEffect(
    useCallback(() => {
      let magnetometerSubscription: any;
      let active = true;

      const initializeQibla = async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            if (!active) return;
            Alert.alert('خطأ', 'يرجى السماح بالوصول إلى الموقع لتحديد اتجاه القبلة');
            setLoading(false);
            return;
          }
          if (!active) return;
          setHasPermission(true);

          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          if (!active) return;
          const { latitude, longitude } = loc.coords;
          setLocation({ latitude, longitude, city: 'موقعك' });

          const qibla = calculateQiblaDirection(latitude, longitude);
          setQiblaDirection(qibla);

          setLoading(false);
          startPulseAnimation();

          // resolve city asynchronously
          Location.reverseGeocodeAsync({ latitude, longitude })
            .then((result) => {
              if (!active) return;
              const [address] = result;
              const city = address?.city || address?.region || 'موقعك';
              setLocation({ latitude, longitude, city });
            })
            .catch(() => {});

          const isAvailable = await Magnetometer.isAvailableAsync();
          if (!active) return;
          if (isAvailable) {
            Magnetometer.setUpdateInterval(100);
            magnetometerSubscription = Magnetometer.addListener((data) => {
              if (!active) return;
              let heading = Math.atan2(data.y, data.x) * (180 / Math.PI);
              heading = (heading + 360) % 360;
              setCompassHeading(heading);

              const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
              if (magnitude > 45) {
                setAccuracy('high');
              } else if (magnitude > 25) {
                setAccuracy('medium');
              } else {
                setAccuracy('low');
              }
            });
          } else {
            Alert.alert('تنبيه', 'البوصلة غير متوفرة على هذا الجهاز');
          }
        } catch (error) {
          console.error('Error initializing qibla:', error);
          if (active) {
            Alert.alert('خطأ', 'حدث خطأ أثناء تحديد اتجاه القبلة');
            setLoading(false);
          }
        }
      };

      initializeQibla();

      return () => {
        active = false;
        if (magnetometerSubscription) {
          magnetometerSubscription.remove();
        }
      };
    }, [])
  );

  // تحديث الأنيميشن عند تغير اتجاه البوصلة
  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: -compassHeading,
      duration: 100,
      useNativeDriver: true,
    }).start();

    Animated.timing(qiblaRotateAnim, {
      toValue: qiblaDirection - compassHeading,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [compassHeading, qiblaDirection]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // ============================================
  // المشاركة
  // ============================================

  const formatQiblaForShare = () => {
    if (!location) return '';
    
    const distance = calculateDistance(location.latitude, location.longitude);
    
    let shareText = `🕋 اتجاه القبلة\n\n`;
    shareText += `📍 الموقع: ${location.city}\n`;
    shareText += `🧭 الاتجاه: ${Math.round(qiblaDirection)}°\n`;
    shareText += `📏 المسافة إلى الكعبة: ${Math.round(distance)} كم\n\n`;
    shareText += `${APP_CONFIG.getShareSignature()}`;
    
    return shareText;
  };

  const handleShare = async () => {
    try {
      const shareText = formatQiblaForShare();
      await Share.share({ message: shareText });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCopy = async () => {
    const shareText = formatQiblaForShare();
    await copyToClipboard(shareText);
    Alert.alert('تم النسخ', 'تم نسخ معلومات القبلة');
  };

  // ============================================
  // حساب ما إذا كان المستخدم يواجه القبلة
  // ============================================

  const qiblaOffset = Math.abs(((qiblaDirection - compassHeading + 180) % 360) - 180);
  const isFacingQibla = qiblaOffset < 5;
  const isCloseToQibla = qiblaOffset < 15;

  // ============================================
  // العرض
  // ============================================

  if (loading) {
    return (
      <BackgroundWrapper backgroundKey={isDarkMode ? 'dynamic' : 'none'} style={[styles.loadingContainer, isDarkMode && styles.loadingContainerDark]}>
        <Ionicons name="compass-outline" size={48} color={Colors.primary} />
        <Text style={styles.loadingText}>جاري تحديد اتجاه القبلة...</Text>
      </BackgroundWrapper>
    );
  }

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [-360, 360],
    outputRange: ['-360deg', '360deg'],
  });

  const qiblaRotateInterpolate = qiblaRotateAnim.interpolate({
    inputRange: [-360, 360],
    outputRange: ['-360deg', '360deg'],
  });

  return (
    <BackgroundWrapper
      backgroundKey={isDarkMode ? 'dynamic' : 'none'}
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      {/* الهيدر */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color={ICON_COLOR} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: TEXT_COLOR }]}>اتجاه القبلة</Text>
        
        <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
          <Ionicons name="share-outline" size={24} color={ICON_COLOR} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* معلومات الموقع */}
        <BlurView intensity={60} tint={isDarkMode ? 'dark' : 'light'} style={[styles.locationCard, isDarkMode ? GlassStyles.cardDark : GlassStyles.card]}>
          <Ionicons name="location" size={20} color={Colors.primary} />
          <Text style={[styles.locationText, { color: TEXT_COLOR }]}>{location?.city || 'موقعك'}</Text>
          {location && (
            <Text style={[styles.distanceText, { color: MUTED_COLOR }]}>
              {Math.round(calculateDistance(location.latitude, location.longitude))} كم من الكعبة
            </Text>
          )}
        </BlurView>

        {/* البوصلة */}
        {/* اختيار نمط العرض للبوصلة */}
        <View style={styles.themeCarousel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {THEMES.map((t) => (
              <TouchableOpacity
                key={t.key}
                onPress={() => setTheme(t.key)}
                style={[
                  styles.themeItem,
                  theme === t.key && styles.themeItemActive,
                ]}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.themePreviewCircle,
                    t.key === 'modern' && styles.modernPreview,
                    t.key === 'classic' && styles.classicPreview,
                    t.key === 'minimal' && styles.minimalPreview,
                    theme === t.key && styles.themePreviewActive,
                    // ensure visible border on dark backgrounds
                    isDarkMode ? { borderColor: CONTRAST_WHITE } : {},
                    theme === t.key && (isDarkMode ? { borderColor: CONTRAST_WHITE, borderWidth: 2 } : {}),
                  ]}
                />
                <Text style={[styles.themeLabel, { color: isDarkMode ? CONTRAST_LIGHT : Colors.textSecondary }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={styles.compassContainer}>
          {/* خلفية البوصلة */}
          <Animated.View 
            style={[
              styles.compassBackground,
              theme === 'modern' && styles.modernBackground,
              theme === 'classic' && styles.classicBackground,
              theme === 'minimal' && styles.minimalBackground,
              { transform: [{ rotate: rotateInterpolate }] },
            ]}
          >
            {/* علامات الاتجاهات */}
            <View style={styles.directionMarkers}>
              <Text style={[styles.directionText, styles.northText, { color: isDarkMode ? CONTRAST_WHITE : Colors.textSecondary }]}>ش</Text>
              <Text style={[styles.directionText, styles.eastText, { color: isDarkMode ? CONTRAST_WHITE : Colors.textSecondary }]}>شر</Text>
              <Text style={[styles.directionText, styles.southText, { color: isDarkMode ? CONTRAST_WHITE : Colors.textSecondary }]}>ج</Text>
              <Text style={[styles.directionText, styles.westText, { color: isDarkMode ? CONTRAST_WHITE : Colors.textSecondary }]}>غ</Text>
            </View>
            
            {/* الدوائر */}
            <View style={[styles.compassCircle, theme === 'modern' && styles.modernCircle, isDarkMode ? { borderColor: CONTRAST_WHITE } : {}]} />
            <View style={[
              styles.compassCircle,
              { width: COMPASS_SIZE * 0.7, height: COMPASS_SIZE * 0.7 },
              theme === 'classic' && styles.classicInnerCircle,
              isDarkMode ? { borderColor: CONTRAST_WHITE } : {},
            ]} />
            <View style={[
              styles.compassCircle,
              { width: COMPASS_SIZE * 0.4, height: COMPASS_SIZE * 0.4 },
              theme === 'minimal' && styles.minimalInnerCircle,
              isDarkMode ? { borderColor: CONTRAST_WHITE } : {},
            ]} />
          </Animated.View>

          {/* سهم القبلة */}
          <Animated.View 
            style={[
              styles.qiblaArrowContainer,
              { 
                transform: [
                  { rotate: qiblaRotateInterpolate },
                  { scale: pulseAnim }
                ] 
              }
            ]}
          >
            <View style={[
              styles.qiblaArrow,
              isFacingQibla && styles.qiblaArrowActive,
              isCloseToQibla && !isFacingQibla && styles.qiblaArrowClose,
            ]}>
              <Ionicons
                name="caret-up"
                size={60}
                color={Colors.primary}
              />
            </View>
            
            {/* أيقونة الكعبة */}
            <View style={styles.kaabaIcon}>
              <Text style={styles.kaabaEmoji}>🕋</Text>
            </View>
          </Animated.View>

          {/* مؤشر الاتجاه الثابت */}
          <View style={styles.fixedIndicator}>
            <Ionicons name="navigate" size={24} color={Colors.primary} />
          </View>
        </View>

        {/* معلومات الاتجاه */}
        <View style={[
          styles.directionCard,
          isFacingQibla && styles.directionCardSuccess,
        ]}>
          {isFacingQibla ? (
            <>
              <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
              <Text style={styles.directionCardTitle}>أنت تواجه القبلة!</Text>
            </>
          ) : (
            <>
              <Text style={[styles.directionDegree, { color: isDarkMode ? TEXT_COLOR : Colors.primary }]}>{Math.round(qiblaDirection)}°</Text>
              <Text style={[styles.directionCardText, { color: isDarkMode ? MUTED_COLOR : Colors.textSecondary }]}>
                {qiblaOffset < 90 
                  ? `أدر ${Math.round(qiblaOffset)}° ${qiblaDirection > compassHeading ? 'يميناً' : 'يساراً'}`
                  : `القبلة خلفك، أدر ${Math.round(180 - qiblaOffset)}°`
                }
              </Text>
            </>
          )}
        </View>

        {/* دقة البوصلة */}
        <View style={styles.accuracyCard}>
          <Text style={[styles.accuracyLabel, { color: MUTED_COLOR }]}>دقة البوصلة:</Text>
          <View style={styles.accuracyIndicator}>
            <View style={[styles.accuracyDot, accuracy !== 'low' && styles.accuracyDotActive]} />
            <View style={[styles.accuracyDot, accuracy === 'high' && styles.accuracyDotActive]} />
            <View style={[styles.accuracyDot, accuracy === 'high' && styles.accuracyDotActive]} />
          </View>
          <Text style={[styles.accuracyText, { color: MUTED_COLOR }]}> 
            {accuracy === 'high' ? 'ممتازة' : accuracy === 'medium' ? 'جيدة' : 'ضعيفة'}
          </Text>
        </View>

        {accuracy === 'low' && (
          <View style={[styles.calibrationTip, isDarkMode ? { backgroundColor: 'rgba(255,255,255,0.06)' } : {}]}>
            <Ionicons name="information-circle" size={20} color={MUTED_COLOR} />
            <Text style={[styles.calibrationText, { color: MUTED_COLOR }]}>حرّك هاتفك بشكل رقم 8 لمعايرة البوصلة</Text>
          </View>
        )}

        {/* أزرار الإجراءات */}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionButton, isDarkMode ? GlassStyles.buttonDark : {}]} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color={Colors.primary} />
            <Text style={[styles.actionButtonText, { color: TEXT_COLOR }]}>مشاركة</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, isDarkMode ? GlassStyles.buttonDark : {}]} onPress={handleCopy}>
            <Ionicons name="copy-outline" size={22} color={Colors.secondary} />
            <Text style={[styles.actionButtonText, { color: TEXT_COLOR }]}>نسخ</Text>
          </TouchableOpacity>
        </View>
      </View>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

// ============================================
// الأنماط
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainerDark: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DarkColors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  containerDark: {
    backgroundColor: DarkColors.background,
  },
  loadingText: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(120,120,128,0.12)',
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(120,120,128,0.12)',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  locationText: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  distanceText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginLeft: 'auto',
  },
  compassContainer: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    marginTop: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassBackground: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  compassCircle: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    borderRadius: COMPASS_SIZE / 2,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'absolute',
  },
  directionMarkers: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    position: 'absolute',
  },
  directionText: {
    position: 'absolute',
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  northText: {
    top: 10,
    left: COMPASS_SIZE / 2 - 10,
    color: Colors.textSecondary,
  },
  eastText: {
    right: 10,
    top: COMPASS_SIZE / 2 - 12,
  },
  southText: {
    bottom: 10,
    left: COMPASS_SIZE / 2 - 8,
  },
  westText: {
    left: 10,
    top: COMPASS_SIZE / 2 - 12,
  },
  qiblaArrowContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qiblaArrow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qiblaArrowActive: {
    // تأثير عند مواجهة القبلة
  },
  qiblaArrowClose: {
    // تأثير عند الاقتراب
  },
  kaabaIcon: {
    marginTop: -10,
  },
  kaabaEmoji: {
    fontSize: 40,
  },
  fixedIndicator: {
    position: 'absolute',
    top: 0,
  },
  directionCard: {
    backgroundColor: 'rgba(120,120,128,0.12)',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xl,
    alignItems: 'center',
    minWidth: 200,
  },
  directionCardSuccess: {
    backgroundColor: Colors.success + '10',
    borderColor: Colors.success,
    borderWidth: 2,
  },
  directionCardTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    color: Colors.success,
    marginTop: Spacing.sm,
  },
  directionDegree: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.primary,
  },
  directionCardText: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  accuracyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  accuracyLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  accuracyIndicator: {
    flexDirection: 'row',
    gap: 4,
  },
  accuracyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  accuracyDotActive: {
    backgroundColor: Colors.success,
  },
  accuracyText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  calibrationTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.textSecondary + '08',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  calibrationText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.xl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(120,120,128,0.12)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  actionButtonText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  /* Theme carousel */
  themeCarousel: {
    width: '100%',
    marginTop: Spacing.md,
    paddingVertical: 6,
  },
  themeItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginRight: 8,
  },
  themeItemActive: {
    // subtle scale or highlight could be added
  },
  themePreviewCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xs,
  },
  themePreviewActive: {
    borderWidth: 2,
    transform: [{ scale: 1.05 }],
  },
  themeLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },

  modernPreview: {
    backgroundColor: Colors.primary + '22',
    borderColor: Colors.primary,
  },
  classicPreview: {
    backgroundColor: Colors.textSecondary + '10',
    borderStyle: 'dashed',
  },
  minimalPreview: {
    backgroundColor: 'transparent',
    borderColor: Colors.border,
  },

  modernBackground: {
    // intentionally no visible debug border to avoid rotating green box
  },
  classicBackground: {
    // subtle classic background (no bright borders)
  },
  minimalBackground: {
    // minimal background - no border
  },

  modernCircle: {
    // use subtle ring that follows theme border color
    borderColor: Colors.border,
    borderWidth: 1.2,
  },
  classicInnerCircle: {
    borderColor: Colors.textSecondary,
    borderStyle: 'dashed',
  },
  minimalInnerCircle: {
    borderColor: Colors.border,
  },
});
