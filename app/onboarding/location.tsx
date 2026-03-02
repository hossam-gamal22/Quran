// app/onboarding/location.tsx
// شاشة إعداد الموقع - روح المسلم

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useOnboarding } from '@/contexts/OnboardingContext';

// ========================================
// المكون الرئيسي
// ========================================

export default function LocationScreen() {
  const { preferences, updatePreferences, goToNextStep, goToPreviousStep } = useOnboarding();
  
  const [isLoading, setIsLoading] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [locationInfo, setLocationInfo] = useState<{
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  } | null>(null);

  useEffect(() => {
    checkExistingPermission();
  }, []);

  const checkExistingPermission = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') {
      setLocationGranted(true);
      await fetchLocation();
    }
  };

  const requestLocationPermission = async () => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        setLocationGranted(true);
        await fetchLocation();
      } else {
        Alert.alert(
          'صلاحية الموقع',
          'نحتاج صلاحية الموقع لعرض أوقات الصلاة بدقة. يمكنك تفعيلها من إعدادات الجهاز.',
          [{ text: 'حسناً', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Error requesting location:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء طلب صلاحية الموقع');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLocation = async () => {
    try {
      setIsLoading(true);
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      
      // الحصول على اسم المدينة والدولة
      const [reverseGeocode] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      const info = {
        latitude,
        longitude,
        city: reverseGeocode?.city || reverseGeocode?.subregion || 'غير معروف',
        country: reverseGeocode?.country || 'غير معروف',
      };

      setLocationInfo(info);
      updatePreferences({
        locationEnabled: true,
        latitude,
        longitude,
        city: info.city,
        country: info.country,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error fetching location:', error);
      Alert.alert('خطأ', 'تعذر الحصول على موقعك. تأكد من تفعيل GPS.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipLocation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updatePreferences({ locationEnabled: false });
    goToNextStep();
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    goToNextStep();
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    goToPreviousStep();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <MaterialCommunityIcons name="arrow-right" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.stepText}>الخطوة 2 من 4</Text>
              <Text style={styles.headerTitle}>الموقع الجغرافي</Text>
            </View>
            <View style={styles.headerPlaceholder} />
          </Animated.View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBg}>
              <Animated.View 
                entering={FadeInDown.delay(200).duration(600)}
                style={[styles.progressFill, { width: '50%' }]} 
              />
            </View>
          </View>

          {/* المحتوى */}
          <View style={styles.content}>
            {/* الأيقونة */}
            <Animated.View entering={FadeIn.delay(200).duration(600)} style={styles.iconContainer}>
              <LinearGradient
                colors={locationGranted ? ['#2f7659', '#1d5a3a'] : ['#3a7ca5', '#2a5a7a']}
                style={styles.iconGradient}
              >
                <MaterialCommunityIcons
                  name={locationGranted ? 'map-marker-check' : 'map-marker-question'}
                  size={60}
                  color="#fff"
                />
              </LinearGradient>
            </Animated.View>

            {/* العنوان والوصف */}
            <Animated.Text entering={FadeInDown.delay(300).duration(500)} style={styles.title}>
              {locationGranted ? 'تم تحديد موقعك' : 'تحديد الموقع'}
            </Animated.Text>

            <Animated.Text entering={FadeInDown.delay(400).duration(500)} style={styles.description}>
              {locationGranted
                ? 'سيتم استخدام موقعك لعرض أوقات الصلاة واتجاه القبلة بدقة.'
                : 'نحتاج موقعك لعرض أوقات الصلاة الدقيقة واتجاه القبلة. لن نشارك موقعك مع أي طرف.'}
            </Animated.Text>

            {/* معلومات الموقع */}
            {locationInfo && (
              <Animated.View entering={FadeIn.delay(500).duration(500)} style={styles.locationCard}>
                <View style={styles.locationRow}>
                  <MaterialCommunityIcons name="city" size={24} color="#2f7659" />
                  <Text style={styles.locationText}>{locationInfo.city}</Text>
                </View>
                <View style={styles.locationRow}>
                  <MaterialCommunityIcons name="flag" size={24} color="#2f7659" />
                  <Text style={styles.locationText}>{locationInfo.country}</Text>
                </View>
              </Animated.View>
            )}

            {/* زر تفعيل الموقع */}
            {!locationGranted && (
              <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.enableButtonContainer}>
                <TouchableOpacity
                  style={styles.enableButton}
                  onPress={requestLocationPermission}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#fff" />
                      <Text style={styles.enableButtonText}>تفعيل الموقع</Text>
                    </>
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* ملاحظة */}
            <Animated.View entering={FadeInDown.delay(600).duration(500)} style={styles.noteContainer}>
              <MaterialCommunityIcons name="shield-check" size={20} color="#2f7659" />
              <Text style={styles.noteText}>
                خصوصيتك مهمة لنا. موقعك يُستخدم فقط داخل التطبيق.
              </Text>
            </Animated.View>
          </View>

          {/* الأزرار */}
          <SafeAreaView edges={['bottom']} style={styles.bottomContainer}>
            <Animated.View entering={FadeInDown.delay(700).duration(500)}>
              {!locationGranted && (
                <TouchableOpacity style={styles.skipButton} onPress={handleSkipLocation}>
                  <Text style={styles.skipButtonText}>تخطي هذه الخطوة</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.continueButton, !locationGranted && styles.continueButtonDisabled]}
                onPress={handleContinue}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={locationGranted ? ['#2f7659', '#1d5a3a'] : ['#666', '#444']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.continueButtonGradient}
                >
                  <Text style={styles.continueButtonText}>
                    {locationGranted ? 'متابعة' : 'متابعة بدون موقع'}
                  </Text>
                  <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>

              {/* مؤشر الصفحات */}
              <View style={styles.pageIndicator}>
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={[styles.dot, styles.dotActive]} />
                <View style={styles.dot} />
              </View>
            </Animated.View>
          </SafeAreaView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

// ========================================
// الأنماط
// ========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  stepText: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: 'rgba(255,255,255,0.6)',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },
  headerPlaceholder: {
    width: 44,
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginTop: 8,
  },
  progressBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2f7659',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    fontFamily: 'Cairo-Regular',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 26,
    marginTop: 12,
    paddingHorizontal: 10,
  },
  locationCard: {
    backgroundColor: 'rgba(47,118,89,0.2)',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    width: '100%',
    gap: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationText: {
    fontSize: 17,
    fontFamily: 'Cairo-Medium',
    color: '#fff',
  },
  enableButtonContainer: {
    marginTop: 32,
    width: '100%',
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3a7ca5',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
  },
  enableButtonText: {
    fontSize: 17,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(47,118,89,0.15)',
    borderRadius: 12,
    padding: 14,
    marginTop: 24,
    gap: 10,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    color: 'rgba(255,255,255,0.7)',
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  skipButtonText: {
    fontSize: 15,
    fontFamily: 'Cairo-Medium',
    color: 'rgba(255,255,255,0.6)',
  },
  continueButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#2f7659',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  continueButtonDisabled: {
    shadowColor: '#333',
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  continueButtonText: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#2f7659',
  },
});
