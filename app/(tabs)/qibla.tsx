import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../../constants/theme';
import { APP_CONFIG } from '../../constants/app';
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
  
  // الحالات
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number; city?: string } | null>(null);
  const [qiblaDirection, setQiblaDirection] = useState(0);
  const [compassHeading, setCompassHeading] = useState(0);
  const [accuracy, setAccuracy] = useState<'low' | 'medium' | 'high'>('low');
  const [showShareModal, setShowShareModal] = useState(false);
  
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

  useEffect(() => {
    let magnetometerSubscription: any;

    const initializeQibla = async () => {
      try {
        // طلب إذن الموقع
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('خطأ', 'يرجى السماح بالوصول إلى الموقع لتحديد اتجاه القبلة');
          setLoading(false);
          return;
        }
        setHasPermission(true);

        // الحصول على الموقع
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const { latitude, longitude } = loc.coords;

        // الحصول على اسم المدينة
        const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
        const city = address?.city || address?.region || 'موقعك';

        setLocation({ latitude, longitude, city });

        // حساب اتجاه القبلة
        const qibla = calculateQiblaDirection(latitude, longitude);
        setQiblaDirection(qibla);

        // الاشتراك في بوصلة المغناطيسية
        const isAvailable = await Magnetometer.isAvailableAsync();
        if (isAvailable) {
          Magnetometer.setUpdateInterval(100);
          
          magnetometerSubscription = Magnetometer.addListener((data) => {
            let heading = Math.atan2(data.y, data.x) * (180 / Math.PI);
            heading = (heading + 360) % 360;
            
            setCompassHeading(heading);
            
            // تحديث دقة البوصلة
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

        setLoading(false);
        startPulseAnimation();

      } catch (error) {
        console.error('Error initializing qibla:', error);
        Alert.alert('خطأ', 'حدث خطأ أثناء تحديد اتجاه القبلة');
        setLoading(false);
      }
    };

    initializeQibla();

    return () => {
      if (magnetometerSubscription) {
        magnetometerSubscription.remove();
      }
    };
  }, []);

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
      <View style={styles.loadingContainer}>
        <Ionicons name="compass-outline" size={48} color={Colors.primary} />
        <Text style={styles.loadingText}>جاري تحديد اتجاه القبلة...</Text>
      </View>
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
    <View style={styles.container}>
      {/* الهيدر */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>اتجاه القبلة</Text>
        
        <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
          <Ionicons name="share-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* معلومات الموقع */}
        <View style={styles.locationCard}>
          <Ionicons name="location" size={20} color={Colors.primary} />
          <Text style={styles.locationText}>{location?.city || 'موقعك'}</Text>
          {location && (
            <Text style={styles.distanceText}>
              {Math.round(calculateDistance(location.latitude, location.longitude))} كم من الكعبة
            </Text>
          )}
        </View>

        {/* البوصلة */}
        <View style={styles.compassContainer}>
          {/* خلفية البوصلة */}
          <Animated.View 
            style={[
              styles.compassBackground,
              { transform: [{ rotate: rotateInterpolate }] }
            ]}
          >
            {/* علامات الاتجاهات */}
            <View style={styles.directionMarkers}>
              <Text style={[styles.directionText, styles.northText]}>ش</Text>
              <Text style={[styles.directionText, styles.eastText]}>شر</Text>
              <Text style={[styles.directionText, styles.southText]}>ج</Text>
              <Text style={[styles.directionText, styles.westText]}>غ</Text>
            </View>
            
            {/* الدوائر */}
            <View style={styles.compassCircle} />
            <View style={[styles.compassCircle, { width: COMPASS_SIZE * 0.7, height: COMPASS_SIZE * 0.7 }]} />
            <View style={[styles.compassCircle, { width: COMPASS_SIZE * 0.4, height: COMPASS_SIZE * 0.4 }]} />
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
                color={isFacingQibla ? Colors.success : isCloseToQibla ? Colors.warning : Colors.primary} 
              />
            </View>
            
            {/* أيقونة الكعبة */}
            <View style={styles.kaabaIcon}>
              <Text style={styles.kaabaEmoji}>🕋</Text>
            </View>
          </Animated.View>

          {/* مؤشر الاتجاه الثابت */}
          <View style={styles.fixedIndicator}>
            <Ionicons name="navigate" size={24} color={Colors.error} />
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
              <Text style={styles.directionDegree}>{Math.round(qiblaDirection)}°</Text>
              <Text style={styles.directionCardText}>
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
          <Text style={styles.accuracyLabel}>دقة البوصلة:</Text>
          <View style={styles.accuracyIndicator}>
            <View style={[styles.accuracyDot, accuracy !== 'low' && styles.accuracyDotActive]} />
            <View style={[styles.accuracyDot, accuracy === 'high' && styles.accuracyDotActive]} />
            <View style={[styles.accuracyDot, accuracy === 'high' && styles.accuracyDotActive]} />
          </View>
          <Text style={styles.accuracyText}>
            {accuracy === 'high' ? 'ممتازة' : accuracy === 'medium' ? 'جيدة' : 'ضعيفة'}
          </Text>
        </View>

        {accuracy === 'low' && (
          <View style={styles.calibrationTip}>
            <Ionicons name="information-circle" size={20} color={Colors.warning} />
            <Text style={styles.calibrationText}>
              حرّك هاتفك بشكل رقم 8 لمعايرة البوصلة
            </Text>
          </View>
        )}

        {/* أزرار الإجراءات */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color={Colors.primary} />
            <Text style={styles.actionButtonText}>مشاركة</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
            <Ionicons name="copy-outline" size={22} color={Colors.secondary} />
            <Text style={styles.actionButtonText}>نسخ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
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
    paddingTop: Spacing.xl + 20,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
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
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.sm,
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
    color: Colors.error,
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
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xl,
    alignItems: 'center',
    minWidth: 200,
    ...Shadows.sm,
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
    backgroundColor: Colors.warning + '10',
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
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  actionButtonText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
});
