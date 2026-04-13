// app/salati.tsx
// صلاتي - Smart Prayer Tracker with proximity/touch detection
// Counts sujood automatically and calculates rakats

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { t } from '@/lib/i18n';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { GlassCard } from '@/components/ui/GlassCard';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSacredContext } from '@/hooks/use-sacred-context';
import { Spacing } from '@/constants/theme';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { usePrayerTracker } from '@/contexts/WorshipContext';
import { getPrayerRecord, getTodayDate, type PrayerName } from '@/lib/worship-storage';
import { getCachedPrayerTimes } from '@/lib/prayer-times';

import { useSujoodDetector } from '@/hooks/use-sujood-detector';
import {
  PRAYER_CONFIG,
  PRAYER_ORDER,
  calculateRakat,
  isPrayerCompleted,
  type SalatiPrayerType,
} from '@/lib/prayer-tracker';
import SujudIcon from '@/assets/images/sujud.svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACCENT_GREEN = '#0d8e62';

// ---------------------------------------------------------------------------
// View Types
// ---------------------------------------------------------------------------
type ViewState = 'instructions' | 'selection' | 'tracking' | 'completed';

// Prayer times interface
interface PrayerTimesMap {
  fajr?: string;
  dhuhr?: string;
  asr?: string;
  maghrib?: string;
  isha?: string;
}

// Prayer order for determining "next prayer"
const PRAYER_ORDER_LIST: SalatiPrayerType[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

const parseTimeToMinutes = (timeValue?: string): number | null => {
  if (!timeValue) return null;
  const normalized = timeValue.trim();

  // Supports 24h format HH:mm
  const hhmmMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmmMatch) {
    const hours = Number(hhmmMatch[1]);
    const minutes = Number(hhmmMatch[2]);
    if (Number.isFinite(hours) && Number.isFinite(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return (hours * 60) + minutes;
    }
  }

  // Supports locale strings with AM/PM as fallback
  const date = new Date(`1970-01-01 ${normalized}`);
  if (!Number.isNaN(date.getTime())) {
    return (date.getHours() * 60) + date.getMinutes();
  }

  return null;
};

/**
 * Check if a prayer is available for tracking
 * - Before Fajr: Isha available (still in window), other prayers available as qada, but NOT Fajr (hasn't started yet)
 * - After Fajr starts: Each prayer available once its time has started
 */
const isPrayerAvailable = (
  prayer: SalatiPrayerType,
  prayerTimes: PrayerTimesMap,
  nowMinutes: number
): boolean => {
  const fajrMinutes = parseTimeToMinutes(prayerTimes.fajr);
  const prayerMinutes = parseTimeToMinutes(prayerTimes[prayer]);

  // If we don't have prayer times data, allow all (fallback)
  if (fajrMinutes === null || prayerMinutes === null) {
    return true;
  }

  // Before Fajr time (midnight to Fajr):
  if (nowMinutes < fajrMinutes) {
    // Fajr is NOT available yet - today's Fajr hasn't started
    if (prayer === 'fajr') {
      return false;
    }
    // All other prayers available (Isha still in window, others as qada from yesterday)
    return true;
  }

  // After Fajr: Prayer is available if its time has started
  return nowMinutes >= prayerMinutes;
};

/**
 * Determine the prayer status based on timing
 * - If within the prayer's window (before next prayer): "prayed" (on time)
 * - If past the next prayer's start time: "late"
 */
const determinePrayerStatus = (
  prayer: SalatiPrayerType,
  prayerTimes: PrayerTimesMap,
  nowMinutes: number
): 'prayed' | 'late' => {
  const prayerIndex = PRAYER_ORDER_LIST.indexOf(prayer);
  const nextPrayerKey = PRAYER_ORDER_LIST[prayerIndex + 1]; // undefined for isha

  const prayerMinutes = parseTimeToMinutes(prayerTimes[prayer]);
  const fajrMinutes = parseTimeToMinutes(prayerTimes.fajr);

  // If we don't have data, assume on time
  if (prayerMinutes === null) {
    return 'prayed';
  }

  // Before Fajr time (midnight to Fajr): Anything tracked is considered "late" (qada)
  // EXCEPT if we're tracking a prayer from tonight (isha)
  if (fajrMinutes !== null && nowMinutes < fajrMinutes) {
    // If tracking isha before fajr, it's still the isha window
    if (prayer === 'isha') {
      return 'prayed'; // Isha window extends until Fajr
    }
    // Other prayers tracked before Fajr are qada (late)
    return 'late';
  }

  // For Isha: window extends until next day's Fajr (so always on time if after isha)
  if (prayer === 'isha') {
    const ishaMinutes = parseTimeToMinutes(prayerTimes.isha);
    if (ishaMinutes !== null && nowMinutes >= ishaMinutes) {
      return 'prayed';
    }
    // Before isha time but after fajr? Shouldn't happen normally
    return 'late';
  }

  // For other prayers: check if before next prayer's time
  if (nextPrayerKey) {
    const nextMinutes = parseTimeToMinutes(prayerTimes[nextPrayerKey]);
    if (nextMinutes !== null && nowMinutes < nextMinutes) {
      return 'prayed'; // Within the prayer's window
    }
  }

  return 'late'; // Past the prayer's window
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function SalatiScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode, settings } = useSettings();
  const isRTL = useIsRTL();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);

  // Block ads during prayer
  useSacredContext('prayer_time');
  
  // Keep screen awake during tracking
  useKeepAwake();

  // Worship tracker integration
  const { updatePrayerWithTime, todayPrayer, refreshTodayRecords } = usePrayerTracker();

  // Refresh prayer data when screen gains focus (daily reset)
  useFocusEffect(
    useCallback(() => {
      refreshTodayRecords();
    }, [refreshTodayRecords])
  );

  // State
  const [currentView, setCurrentView] = useState<ViewState>('instructions');
  const [selectedPrayer, setSelectedPrayer] = useState<SalatiPrayerType | null>(null);
  const [timeValidationError, setTimeValidationError] = useState<string | null>(null);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimesMap>({});

  // Sujood detector hook
  const detector = useSujoodDetector();

  // Load prayer times on mount
  useEffect(() => {
    const loadPrayerTimes = async () => {
      const today = getTodayDate();
      
      // Try worship tracker first
      let times: PrayerTimesMap = todayPrayer?.scheduledTimes || {};
      
      // Fallback to prayer record
      if (!times.fajr) {
        const record = await getPrayerRecord(today);
        if (record?.scheduledTimes) {
          times = { ...times, ...record.scheduledTimes };
        }
      }
      
      // Fallback to cached prayer times
      if (!times.fajr) {
        const cached = await getCachedPrayerTimes(today);
        if (cached) {
          times = {
            fajr: cached.fajr,
            dhuhr: cached.dhuhr,
            asr: cached.asr,
            maghrib: cached.maghrib,
            isha: cached.isha,
          };
        }
      }
      
      setPrayerTimes(times);
    };
    
    loadPrayerTimes();
  }, [todayPrayer]);

  // Current time in minutes (updates when selection view is shown)
  const [nowMinutes, setNowMinutes] = useState(() => {
    const now = new Date();
    return (now.getHours() * 60) + now.getMinutes();
  });

  // Update nowMinutes when entering selection view
  useEffect(() => {
    if (currentView === 'selection') {
      const now = new Date();
      setNowMinutes((now.getHours() * 60) + now.getMinutes());
      
      // Update every minute while on selection screen
      const interval = setInterval(() => {
        const now = new Date();
        setNowMinutes((now.getHours() * 60) + now.getMinutes());
      }, 60000);
      
      return () => clearInterval(interval);
    }
  }, [currentView]);

  // Helper to check prayer availability for UI
  const getPrayerAvailability = useCallback((prayer: SalatiPrayerType) => {
    // Check if prayer is already completed in worship tracker
    const prayerStatus = todayPrayer?.[prayer as keyof typeof todayPrayer];
    const isAlreadyCompleted = prayerStatus === 'prayed' || prayerStatus === 'late';
    
    if (isAlreadyCompleted) {
      return { isAvailable: false, willBeLate: false, isCompleted: true };
    }
    
    const isAvailable = isPrayerAvailable(prayer, prayerTimes, nowMinutes);
    const status = isAvailable ? determinePrayerStatus(prayer, prayerTimes, nowMinutes) : null;
    return { isAvailable, willBeLate: status === 'late', isCompleted: false };
  }, [prayerTimes, nowMinutes, todayPrayer]);

  // Computed values
  const prayerInfo = selectedPrayer ? PRAYER_CONFIG[selectedPrayer] : null;
  const currentRakat = calculateRakat(detector.sujoodCount);
  const isCompleted = prayerInfo ? isPrayerCompleted(detector.sujoodCount, prayerInfo.rakats) : false;

  // Animation for counter
  const counterScale = useSharedValue(1);
  const counterAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: counterScale.value }],
  }));

  // Animate counter on sujood
  useEffect(() => {
    if (detector.sujoodCount > 0) {
      counterScale.value = withSequence(
        withSpring(1.15, { damping: 8, stiffness: 400 }),
        withSpring(1, { damping: 12, stiffness: 200 })
      );
    }
  }, [detector.sujoodCount]);

  // Check for completion
  useEffect(() => {
    if (isCompleted && currentView === 'tracking') {
      // Stop detector and show completion
      detector.stop();
      setCurrentView('completed');
      
      // Mark prayer as completed in worship tracker with smart status
      if (selectedPrayer) {
        const now = new Date();
        const currentNowMinutes = (now.getHours() * 60) + now.getMinutes();
        const status = determinePrayerStatus(selectedPrayer, prayerTimes, currentNowMinutes);
        const selectedPrayerTime = prayerTimes[selectedPrayer];
        updatePrayerWithTime(selectedPrayer as PrayerName, status, selectedPrayerTime).catch(() => {});
      }
      
      // Haptic success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [isCompleted, currentView, selectedPrayer, prayerTimes]);

  // Handlers
  const handleStartPrayer = useCallback(() => {
    setCurrentView('selection');
  }, []);

  const handleSelectPrayer = useCallback((prayer: SalatiPrayerType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeValidationError(null);
    setSelectedPrayer(prayer);
  }, []);

  const handleBeginTracking = useCallback(async () => {
    if (!selectedPrayer) return;

    const now = new Date();
    const nowMinutes = (now.getHours() * 60) + now.getMinutes();

    // Check if prayer is available using smart logic
    const isAvailable = isPrayerAvailable(selectedPrayer, prayerTimes, nowMinutes);
    
    if (!isAvailable) {
      setTimeValidationError(t('smartTracker.prayerNotYet'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setTimeValidationError(null);
    detector.reset();
    detector.start();
    setCurrentView('tracking');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [selectedPrayer, prayerTimes, detector]);

  const handleTouchCount = useCallback(() => {
    if (currentView !== 'tracking') return;
    detector.manualTap();
  }, [currentView, detector]);

  const handleReset = useCallback(() => {
    detector.reset();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [detector]);

  const handleFinish = useCallback(() => {
    detector.stop();
    detector.reset();
    setSelectedPrayer(null);
    setCurrentView('instructions');
    router.back();
  }, [detector, router]);

  const handleBack = useCallback(() => {
    if (currentView === 'tracking') {
      detector.stop();
      setCurrentView('selection');
    } else if (currentView === 'selection') {
      setCurrentView('instructions');
    } else if (currentView === 'completed') {
      handleFinish();
    } else {
      router.back();
    }
  }, [currentView, detector, router, handleFinish]);

  // ---------------------------------------------------------------------------
  // Render Functions
  // ---------------------------------------------------------------------------

  const renderInstructions = () => (
    <Animated.View
      entering={FadeInDown.duration(400)}
      exiting={FadeOut.duration(200)}
      style={styles.instructionsContainer}
    >
      {/* Back button */}
      <TouchableOpacity
        style={[styles.backButton, { [isRTL ? 'left' : 'right']: 20 }]}
        onPress={() => router.back()}
      >
        <MaterialCommunityIcons
          name={isRTL ? 'chevron-left' : 'chevron-right'}
          size={28}
          color={colors.text}
        />
      </TouchableOpacity>

      {/* Icon */}
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, { backgroundColor: 'rgba(13, 142, 98, 0.15)' }]}>
          <SujudIcon
            width={80}
            height={80}
            fill={ACCENT_GREEN}
          />
        </View>
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: colors.text }]}>
        {t('smartTracker.title')}
      </Text>

      {/* Subtitle */}
      <Text style={[styles.subtitle, { color: colors.textLight }]}>
        {t('smartTracker.placementDesc')}
      </Text>

      {/* Instructions */}
      <View style={styles.instructionsList}>
        <View style={[styles.instructionItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.bulletPoint} />
          <Text style={[styles.instructionText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('smartTracker.howItWorksDesc')}
          </Text>
        </View>

        <View style={[styles.instructionItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.bulletPoint} />
          <Text style={[styles.instructionText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('smartTracker.touchModeDesc')}
          </Text>
        </View>
      </View>

      {/* Start Button */}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleStartPrayer}
      >
        <MaterialCommunityIcons
          name={isRTL ? 'arrow-left' : 'arrow-right'}
          size={22}
          color="#fff"
          style={{ marginHorizontal: 8 }}
        />
        <Text style={styles.primaryButtonText}>
          {t('smartTracker.startPrayer')}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderSelection = () => (
    <Animated.View
      entering={FadeInDown.duration(400)}
      exiting={FadeOut.duration(200)}
      style={styles.selectionContainer}
    >
      {/* Back button */}
      <TouchableOpacity
        style={[styles.backButton, { [isRTL ? 'left' : 'right']: 20 }]}
        onPress={handleBack}
      >
        <MaterialCommunityIcons
          name={isRTL ? 'chevron-left' : 'chevron-right'}
          size={28}
          color={colors.text}
        />
      </TouchableOpacity>

      {/* Title */}
      <Text style={[styles.title, { color: colors.text, marginTop: 60 }]}>
        {t('smartTracker.title')}
      </Text>

      <Text style={[styles.subtitle, { color: colors.textLight }]}>
        {t('smartTracker.subtitle')}
      </Text>

      {/* Prayer Grid */}
      <View style={styles.prayerGrid}>
        {/* First row: Fajr, Dhuhr */}
        <View style={[styles.prayerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {(['fajr', 'dhuhr'] as SalatiPrayerType[]).map((prayer) => {
            const info = PRAYER_CONFIG[prayer];
            const isSelected = selectedPrayer === prayer;
            const { isAvailable, willBeLate, isCompleted } = getPrayerAvailability(prayer);
            return (
              <TouchableOpacity
                key={prayer}
                style={[
                  styles.prayerCard,
                  { 
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f2f2f7',
                    borderColor: isDarkMode ? 'transparent' : 'rgba(0,0,0,0.06)',
                  },
                  isSelected && styles.prayerCardSelected,
                  isCompleted && styles.prayerCardCompleted,
                  !isAvailable && !isCompleted && styles.prayerCardDisabled,
                ]}
                onPress={() => isAvailable && handleSelectPrayer(prayer)}
                disabled={!isAvailable}
                activeOpacity={isAvailable ? 0.7 : 1}
              >
                {/* Status indicator */}
                <View style={styles.rakatBadge}>
                  {isCompleted ? (
                    <MaterialCommunityIcons name="check-circle" size={14} color={ACCENT_GREEN} />
                  ) : !isAvailable ? (
                    <MaterialCommunityIcons name="clock-outline" size={12} color={colors.textLight} />
                  ) : willBeLate ? (
                    <MaterialCommunityIcons name="clock-alert-outline" size={12} color="#FFA500" />
                  ) : (
                    <MaterialCommunityIcons name="check-circle-outline" size={12} color={ACCENT_GREEN} />
                  )}
                </View>
                
                <View style={[styles.prayerIconCircle, { backgroundColor: `${info.iconColor}20`, opacity: isCompleted ? 0.6 : isAvailable ? 1 : 0.4 }]}>
                  <MaterialCommunityIcons
                    name={info.icon as any}
                    size={32}
                    color={info.iconColor}
                  />
                </View>
                <Text style={[
                  styles.prayerCardText,
                  { color: isCompleted ? ACCENT_GREEN : isSelected ? ACCENT_GREEN : isAvailable ? colors.text : colors.textLight },
                  !isAvailable && !isCompleted && { opacity: 0.5 },
                ]}>
                  {info.nameAr}
                </Text>
                {isCompleted ? (
                  <Text style={styles.completedIndicator}>{t('smartTracker.done')}</Text>
                ) : willBeLate && isAvailable ? (
                  <Text style={styles.lateIndicator}>{t('smartTracker.willBeLate')}</Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Second row: Asr, Maghrib */}
        <View style={[styles.prayerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {(['asr', 'maghrib'] as SalatiPrayerType[]).map((prayer) => {
            const info = PRAYER_CONFIG[prayer];
            const isSelected = selectedPrayer === prayer;
            const { isAvailable, willBeLate, isCompleted } = getPrayerAvailability(prayer);
            return (
              <TouchableOpacity
                key={prayer}
                style={[
                  styles.prayerCard,
                  { 
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f2f2f7',
                    borderColor: isDarkMode ? 'transparent' : 'rgba(0,0,0,0.06)',
                  },
                  isSelected && styles.prayerCardSelected,
                  isCompleted && styles.prayerCardCompleted,
                  !isAvailable && !isCompleted && styles.prayerCardDisabled,
                ]}
                onPress={() => isAvailable && handleSelectPrayer(prayer)}
                disabled={!isAvailable}
                activeOpacity={isAvailable ? 0.7 : 1}
              >
                {/* Status indicator */}
                <View style={styles.rakatBadge}>
                  {isCompleted ? (
                    <MaterialCommunityIcons name="check-circle" size={14} color={ACCENT_GREEN} />
                  ) : !isAvailable ? (
                    <MaterialCommunityIcons name="clock-outline" size={12} color={colors.textLight} />
                  ) : willBeLate ? (
                    <MaterialCommunityIcons name="clock-alert-outline" size={12} color="#FFA500" />
                  ) : (
                    <MaterialCommunityIcons name="check-circle-outline" size={12} color={ACCENT_GREEN} />
                  )}
                </View>
                
                <View style={[styles.prayerIconCircle, { backgroundColor: `${info.iconColor}20`, opacity: isCompleted ? 0.6 : isAvailable ? 1 : 0.4 }]}>
                  <MaterialCommunityIcons
                    name={info.icon as any}
                    size={32}
                    color={info.iconColor}
                  />
                </View>
                <Text style={[
                  styles.prayerCardText,
                  { color: isCompleted ? ACCENT_GREEN : isSelected ? ACCENT_GREEN : isAvailable ? colors.text : colors.textLight },
                  !isAvailable && !isCompleted && { opacity: 0.5 },
                ]}>
                  {info.nameAr}
                </Text>
                {isCompleted ? (
                  <Text style={styles.completedIndicator}>{t('smartTracker.done')}</Text>
                ) : willBeLate && isAvailable ? (
                  <Text style={styles.lateIndicator}>{t('smartTracker.willBeLate')}</Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Third row: Isha (centered) */}
        <View style={styles.prayerRowCenter}>
          {(['isha'] as SalatiPrayerType[]).map((prayer) => {
            const info = PRAYER_CONFIG[prayer];
            const isSelected = selectedPrayer === prayer;
            const { isAvailable, willBeLate, isCompleted } = getPrayerAvailability(prayer);
            return (
              <TouchableOpacity
                key={prayer}
                style={[
                  styles.prayerCard,
                  { 
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f2f2f7',
                    borderColor: isDarkMode ? 'transparent' : 'rgba(0,0,0,0.06)',
                  },
                  isSelected && styles.prayerCardSelected,
                  isCompleted && styles.prayerCardCompleted,
                  !isAvailable && !isCompleted && styles.prayerCardDisabled,
                ]}
                onPress={() => isAvailable && handleSelectPrayer(prayer)}
                disabled={!isAvailable}
                activeOpacity={isAvailable ? 0.7 : 1}
              >
                {/* Status indicator */}
                <View style={styles.rakatBadge}>
                  {isCompleted ? (
                    <MaterialCommunityIcons name="check-circle" size={14} color={ACCENT_GREEN} />
                  ) : !isAvailable ? (
                    <MaterialCommunityIcons name="clock-outline" size={12} color={colors.textLight} />
                  ) : willBeLate ? (
                    <MaterialCommunityIcons name="clock-alert-outline" size={12} color="#FFA500" />
                  ) : (
                    <MaterialCommunityIcons name="check-circle-outline" size={12} color={ACCENT_GREEN} />
                  )}
                </View>
                
                <View style={[styles.prayerIconCircle, { backgroundColor: `${info.iconColor}20`, opacity: isCompleted ? 0.6 : isAvailable ? 1 : 0.4 }]}>
                  <MaterialCommunityIcons
                    name={info.icon as any}
                    size={32}
                    color={info.iconColor}
                  />
                </View>
                <Text style={[
                  styles.prayerCardText,
                  { color: isCompleted ? ACCENT_GREEN : isSelected ? ACCENT_GREEN : isAvailable ? colors.text : colors.textLight },
                  !isAvailable && !isCompleted && { opacity: 0.5 },
                ]}>
                  {info.nameAr}
                </Text>
                {isCompleted ? (
                  <Text style={styles.completedIndicator}>{t('smartTracker.done')}</Text>
                ) : willBeLate && isAvailable ? (
                  <Text style={styles.lateIndicator}>{t('smartTracker.willBeLate')}</Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Start Button */}
      <TouchableOpacity
        style={[styles.primaryButton, styles.selectionStartButton, !selectedPrayer && styles.primaryButtonDisabled]}
        onPress={handleBeginTracking}
        disabled={!selectedPrayer}
      >
        <MaterialCommunityIcons
          name="play"
          size={22}
          color="#fff"
          style={{ marginHorizontal: 8 }}
        />
        <Text style={styles.primaryButtonText}>
          {t('smartTracker.start')}
        </Text>
      </TouchableOpacity>

      {!!timeValidationError && (
        <Text style={[styles.selectionErrorText, { color: '#ef5350', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {timeValidationError}
        </Text>
      )}
    </Animated.View>
  );

  const renderTracking = () => (
    <Pressable
      style={styles.trackingContainer}
      onPress={handleTouchCount}
    >
      <Animated.View
        entering={FadeIn.duration(300)}
        style={styles.trackingContent}
      >
        {/* Back/Reset header */}
        <View style={[styles.trackingHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleBack}
          >
            <MaterialCommunityIcons
              name={isRTL ? 'chevron-left' : 'chevron-right'}
              size={28}
              color={colors.text}
            />
          </TouchableOpacity>
          
          <View style={[styles.headerTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <SujudIcon width={24} height={24} fill={ACCENT_GREEN} />
            <Text style={[styles.trackingPrayerName, { color: colors.text }]}>
              {prayerInfo?.nameAr}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleReset}
          >
            <MaterialCommunityIcons
              name="refresh"
              size={24}
              color={colors.textLight}
            />
          </TouchableOpacity>
        </View>

        {/* Main counter */}
        <Animated.View style={[styles.counterContainer, counterAnimatedStyle]}>
          <View style={styles.counterCircle}>
            <Text style={styles.counterNumber}>
              {currentRakat}
            </Text>
            <Text style={styles.counterLabel}>
              {t('smartTracker.currentRakat')}
            </Text>
          </View>
        </Animated.View>

        {/* Sujood count */}
        <View style={styles.sujoodInfo}>
          <Text style={[styles.sujoodLabel, { color: colors.textLight }]}>
            {t('smartTracker.sujudCount')}
          </Text>
          <Text style={[styles.sujoodCount, { color: colors.text }]}>
            {detector.sujoodCount} / {(prayerInfo?.rakats || 0) * 2}
          </Text>
        </View>

        {/* Sensor status */}
        <View style={styles.sensorStatus}>
          {detector.isAvailable && detector.isListening ? (
            <View style={[styles.statusBadge, { backgroundColor: isDarkMode ? 'rgba(13, 142, 98, 0.15)' : 'rgba(13, 142, 98, 0.12)' }]}>
              <View style={[styles.statusDot, { backgroundColor: ACCENT_GREEN }]} />
              <Text style={[styles.statusText, { color: ACCENT_GREEN }]}>
                {detector.inCooldown
                  ? t('smartTracker.cooldownActive')
                  : detector.sensorMode === 'proximity'
                    ? t('smartTracker.proximityActive')
                    : t('smartTracker.motionSensorActive')}
              </Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: isDarkMode ? 'rgba(255, 165, 0, 0.15)' : 'rgba(255, 165, 0, 0.12)' }]}>
              <MaterialCommunityIcons name="gesture-tap" size={18} color="#FFA500" />
              <Text style={[styles.statusText, { color: '#E59400' }]}>
                {t('smartTracker.touchToCount')}
              </Text>
            </View>
          )}
        </View>

        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)' }]}>
            <View 
              style={[
                styles.progressFill,
                { width: `${(detector.sujoodCount / ((prayerInfo?.rakats || 1) * 2)) * 100}%` }
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textLight }]}>
            {currentRakat} / {prayerInfo?.rakats} {t('smartTracker.rakats')}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );

  const renderCompleted = () => (
    <Animated.View
      entering={FadeIn.duration(500)}
      style={styles.completedContainer}
    >
      {/* Success icon */}
      <View style={styles.successIconContainer}>
        <MaterialCommunityIcons
          name="check-circle"
          size={80}
          color={ACCENT_GREEN}
        />
      </View>

      {/* Title */}
      <Text style={[styles.completedTitle, { color: colors.text }]}>
        {t('smartTracker.completed')}
      </Text>

      {/* Verse */}
      <GlassCard style={styles.verseCard}>
        <Text style={[styles.verseText, { color: colors.text }]}>
          {t('smartTracker.completedVerse')}
        </Text>
        <Text style={[styles.verseRef, { color: colors.textLight }]}>
          {t('smartTracker.completedRef')}
        </Text>
      </GlassCard>

      {/* Finish Button */}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleFinish}
      >
        <Text style={styles.primaryButtonText}>
          {t('smartTracker.alhamdulillah')}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  // ---------------------------------------------------------------------------
  // Main Render
  // ---------------------------------------------------------------------------
  return (
    <BackgroundWrapper>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {currentView === 'instructions' && renderInstructions()}
        {currentView === 'selection' && renderSelection()}
        {currentView === 'tracking' && renderTracking()}
        {currentView === 'completed' && renderCompleted()}
      </View>
    </BackgroundWrapper>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const _styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Instructions View
  instructionsContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: ACCENT_GREEN,
  },
  title: {
    fontSize: 28,
    fontFamily: fontBold(),
    textAlign: 'center',
    marginBottom: 12,
    includeFontPadding: false,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fontRegular(),
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 16,
    includeFontPadding: false,
  },
  instructionsList: {
    width: '100%',
    gap: 16,
    marginBottom: 40,
  },
  instructionItem: {
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 8,
  },
  bulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT_GREEN,
    marginTop: 8,
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: fontRegular(),
    lineHeight: 24,
    includeFontPadding: false,
  },
  primaryButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT_GREEN,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    gap: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 18,
    fontFamily: fontBold(),
    color: '#fff',
    includeFontPadding: false,
  },

  // Selection View
  selectionContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  prayerGrid: {
    width: '100%',
    paddingTop: 20,
    gap: 16,
  },
  prayerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  prayerRowCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  selectionStartButton: {
    marginTop: 32,
    marginBottom: 8,
  },
  prayerCard: {
    width: (SCREEN_WIDTH - 60) / 2,
    aspectRatio: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    // Light mode shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  prayerCardSelected: {
    borderWidth: 2,
    borderColor: ACCENT_GREEN,
    backgroundColor: 'rgba(13, 142, 98, 0.1)',
  },
  prayerCardDisabled: {
    opacity: 0.5,
  },
  prayerCardCompleted: {
    backgroundColor: 'rgba(13, 142, 98, 0.08)',
    borderColor: ACCENT_GREEN,
    borderWidth: 1,
  },
  completedIndicator: {
    fontSize: 11,
    fontFamily: fontSemiBold(),
    color: ACCENT_GREEN,
    marginTop: -4,
    includeFontPadding: false,
  },
  lateIndicator: {
    fontSize: 10,
    fontFamily: fontMedium(),
    color: '#FFA500',
    marginTop: -4,
    includeFontPadding: false,
  },
  rakatBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  prayerIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayerCardText: {
    fontSize: 16,
    fontFamily: fontSemiBold(),
    includeFontPadding: false,
  },
  selectionErrorText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: fontMedium(),
    lineHeight: 22,
    includeFontPadding: false,
  },

  // Tracking View
  trackingContainer: {
    flex: 1,
  },
  trackingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  trackingHeader: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackingPrayerName: {
    fontSize: 20,
    fontFamily: fontBold(),
    includeFontPadding: false,
  },
  counterContainer: {
    marginBottom: 32,
  },
  counterCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: ACCENT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT_GREEN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  counterNumber: {
    fontSize: 72,
    fontFamily: fontBold(),
    color: '#fff',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  counterLabel: {
    fontSize: 18,
    fontFamily: fontSemiBold(),
    color: 'rgba(255,255,255,0.9)',
    marginTop: -4,
    includeFontPadding: false,
  },
  sujoodInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  sujoodLabel: {
    fontSize: 16,
    fontFamily: fontRegular(),
    marginBottom: 6,
    includeFontPadding: false,
  },
  sujoodCount: {
    fontSize: 28,
    fontFamily: fontBold(),
    includeFontPadding: false,
  },
  sensorStatus: {
    marginBottom: 40,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
    includeFontPadding: false,
  },
  progressContainer: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  progressTrack: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ACCENT_GREEN,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 16,
    fontFamily: fontSemiBold(),
    includeFontPadding: false,
  },
  // touchHint removed - redundant with sensorStatus

  // Completed View
  completedContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 24,
  },
  completedTitle: {
    fontSize: 32,
    fontFamily: fontBold(),
    textAlign: 'center',
    marginBottom: 32,
    includeFontPadding: false,
  },
  verseCard: {
    padding: 24,
    marginBottom: 40,
    width: '100%',
    maxWidth: 340,
  },
  verseText: {
    fontSize: 18,
    fontFamily: fontMedium(),
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 12,
    includeFontPadding: false,
  },
  verseRef: {
    fontSize: 14,
    fontFamily: fontRegular(),
    textAlign: 'center',
    includeFontPadding: false,
  },
});
