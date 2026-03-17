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
import { fontBold, fontMedium, fontRegular } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { useOnboarding } from '@/contexts/OnboardingContext';
import { isRTL as checkIsRTL } from '@/lib/i18n';
import { tOnboarding, tOnboardingStep } from '@/constants/onboarding-translations';

// ========================================
// المكون الرئيسي
// ========================================

export default function LocationScreen() {
  const isRTL = checkIsRTL();
  const { preferences, updatePreferences, goToNextStep, goToPreviousStep, skipOnboarding } = useOnboarding();
  
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
          tOnboarding('locationPermission'),
          tOnboarding('locationPermissionDesc'),
          [{ text: tOnboarding('ok'), style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Error requesting location:', error);
      Alert.alert(tOnboarding('error'), tOnboarding('locationError'));
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
        city: reverseGeocode?.city || reverseGeocode?.subregion || tOnboarding('unknown'),
        country: reverseGeocode?.country || tOnboarding('unknown'),
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
      Alert.alert(tOnboarding('error'), tOnboarding('gpsError'));
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
      
      <View style={[styles.gradient, { backgroundColor: '#1a1a2e' }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(500)} style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <MaterialCommunityIcons name={isRTL ? 'arrow-right' : 'arrow-left'} size={28} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.stepText}>{tOnboardingStep(4, 5)}</Text>
              <Text style={styles.headerTitle}>{tOnboarding('location')}</Text>
            </View>
            <TouchableOpacity style={styles.skipBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); skipOnboarding(); }}>
              <Text style={styles.skipBtnText}>{tOnboarding('skip')}</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBg, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
              <View
                style={styles.iconGradient}
              >
                <MaterialCommunityIcons
                  name={locationGranted ? 'map-marker-check' : 'map-marker-alert'}
                  size={60}
                  color="#fff"
                />
              </View>
            </Animated.View>

            {/* العنوان والوصف */}
            <Animated.Text entering={FadeInDown.delay(300).duration(500)} style={styles.title}>
              {locationGranted ? tOnboarding('locationDetected') : tOnboarding('detectLocation')}
            </Animated.Text>

            <Animated.Text entering={FadeInDown.delay(400).duration(500)} style={styles.description}>
              {locationGranted
                ? tOnboarding('locationDetectedDesc')
                : tOnboarding('locationRequestDesc')}
            </Animated.Text>

            {/* معلومات الموقع */}
            {locationInfo && (
              <Animated.View entering={FadeIn.delay(500).duration(500)} style={styles.locationCard}>
                <View style={[styles.locationRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <MaterialCommunityIcons name="city" size={24} color="#2f7659" />
                  <Text style={styles.locationText}>{locationInfo.city}</Text>
                </View>
                <View style={[styles.locationRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
                      <Text style={styles.enableButtonText}>{tOnboarding('enableLocation')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* ملاحظة */}
            <Animated.View entering={FadeInDown.delay(600).duration(500)} style={[styles.noteContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="shield-check" size={20} color="#2f7659" />
              <Text style={styles.noteText}>
                {tOnboarding('privacyNote')}
              </Text>
            </Animated.View>
          </View>

          {/* الأزرار */}
          <SafeAreaView edges={['bottom']} style={styles.bottomContainer}>
            <Animated.View entering={FadeInDown.delay(700).duration(500)}>
              {!locationGranted && (
                <TouchableOpacity style={styles.skipButton} onPress={handleSkipLocation}>
                  <Text style={styles.skipButtonText}>{tOnboarding('skipStep')}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.continueButton, !locationGranted && styles.continueButtonDisabled]}
                onPress={handleContinue}
                activeOpacity={0.8}
              >
                <View
                  style={[styles.continueButtonGradient, { backgroundColor: locationGranted ? 'rgba(47,118,89,0.85)' : 'rgba(102,102,102,0.85)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                >
                  <Text style={styles.continueButtonText}>
                    {locationGranted ? tOnboarding('continue') : tOnboarding('continueWithoutLocation')}
                  </Text>
                  <MaterialCommunityIcons name={isRTL ? 'arrow-left' : 'arrow-right'} size={24} color="#fff" />
                </View>
              </TouchableOpacity>

              {/* مؤشر الصفحات */}
              <View style={[styles.pageIndicator, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={[styles.dot, styles.dotActive]} />
                <View style={styles.dot} />
              </View>
            </Animated.View>
          </SafeAreaView>
        </SafeAreaView>
      </View>
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
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.6)',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: fontBold(),
    color: '#fff',
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipBtnText: {
    fontSize: 15,
    fontFamily: fontMedium(),
    color: 'rgba(255,255,255,0.7)',
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    backgroundColor: '#2f7659',
  },
  title: {
    fontSize: 26,
    fontFamily: fontBold(),
    color: '#fff',
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    fontFamily: fontRegular(),
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
    fontFamily: fontMedium(),
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
    fontFamily: fontBold(),
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
    fontFamily: fontRegular(),
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
    fontFamily: fontMedium(),
    color: 'rgba(255,255,255,0.6)',
  },
  continueButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
  },
  continueButtonDisabled: {
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
    fontFamily: fontBold(),
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
