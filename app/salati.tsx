// app/salati.tsx
// صلاتي - Smart Prayer Tracker with proximity/touch detection
// Counts sujood automatically and calculates rakats

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  Dimensions,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
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
} from 'react-native-reanimated';

import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { t } from '@/lib/i18n';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { GlassCard } from '@/components/ui/GlassCard';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSacredContext } from '@/hooks/use-sacred-context';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { usePrayerTracker } from '@/contexts/WorshipContext';
import { getPrayerRecord, getTodayDate, type PrayerName } from '@/lib/worship-storage';
import { getCachedPrayerTimes } from '@/lib/prayer-times';
import * as Notifications from 'expo-notifications';
import { getReminderChannelId } from '@/services/notifications/channels';
import { resolveNotificationSound } from '@/lib/resolve-notification-sound';

import { useSujoodDetector } from '@/hooks/use-sujood-detector';
import {
  PRAYER_CONFIG,
  TEMPORARY_PRAYER_MAX_RAKATS,
  TEMPORARY_PRAYER_MIN_RAKATS,
  TEMPORARY_PRAYER_PRESETS,
  calculateRakat,
  isPrayerCompleted,
  type SalatiPrayerType,
  type TemporaryPrayerPreset,
  type TemporaryPrayerPresetKey,
} from '@/lib/prayer-tracker';
import SujudIcon from '@/assets/images/sujud.svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACCENT_GREEN = '#0d8e62';

// ---------------------------------------------------------------------------
// View Types
// ---------------------------------------------------------------------------
type ViewState = 'instructions' | 'selection' | 'tracking' | 'completed';

type SalatiPrayerSelection =
  | { kind: 'required'; prayer: SalatiPrayerType }
  | {
      kind: 'temporary';
      name: string;
      rakats: number;
      icon: string;
      iconColor: string;
    };

interface TrackingPrayerInfo {
  nameAr: string;
  rakats: number;
  icon: string;
  iconColor: string;
}

const TEMPORARY_PRAYER_PRESET_TRANSLATION_KEYS: Record<TemporaryPrayerPresetKey, string> = {
  qiyam: 'smartTracker.otherPrayerQiyam',
  witr: 'smartTracker.otherPrayerWitr',
  duha: 'smartTracker.otherPrayerDuha',
  nafl: 'smartTracker.otherPrayerNafl',
};

const DEFAULT_TEMPORARY_PRAYER_PRESET = TEMPORARY_PRAYER_PRESETS[0];

// Prayer times interface
interface PrayerTimesMap {
  fajr?: string;
  dhuhr?: string;
  asr?: string;
  maghrib?: string;
  isha?: string;
}

import {
  getPrayerWindowState,
  getSuggestedStatus,
  parseTimeToMinutes,
} from '@/lib/prayer-availability';

/**
 * Returns true when no prayer times are available (offline + no cached times).
 * In this case we allow the user to manually pick & start any prayer.
 */
const hasNoPrayerTimes = (prayerTimes: PrayerTimesMap): boolean =>
  parseTimeToMinutes(prayerTimes.fajr) === null;

/**
 * Check if a prayer is available for tracking (wraps the shared smart-window helper).
 */
const isPrayerAvailable = (
  prayer: SalatiPrayerType,
  prayerTimes: PrayerTimesMap,
  _nowMinutes: number
): boolean => {
  // Offline / no cached times: allow all prayers so the feature still works.
  if (hasNoPrayerTimes(prayerTimes)) return true;
  // Need at least the prayer's own time and Fajr to compute the window correctly.
  if (parseTimeToMinutes(prayerTimes.fajr) === null) return false;
  if (parseTimeToMinutes(prayerTimes[prayer]) === null) return false;
  const state = getPrayerWindowState(prayer, prayerTimes);
  return state === 'onTime' || state === 'lateOnly' || state === 'expired';
};

/**
 * Determine the prayer status (`prayed` if on time, `late` otherwise) using the
 * shared window helper.
 */
const determinePrayerStatus = (
  prayer: SalatiPrayerType,
  prayerTimes: PrayerTimesMap,
  _nowMinutes: number
): 'prayed' | 'late' => {
  // Without prayer times we can't decide late vs on-time → treat as on-time.
  if (hasNoPrayerTimes(prayerTimes)) return 'prayed';
  const state = getPrayerWindowState(prayer, prayerTimes);
  const suggested = getSuggestedStatus(state);
  return suggested === 'prayed' ? 'prayed' : 'late';
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function SalatiScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useSettings();
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
  const [selectedPrayer, setSelectedPrayer] = useState<SalatiPrayerSelection | null>(null);
  const [timeValidationError, setTimeValidationError] = useState<string | null>(null);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimesMap>({});
  const [showTemporaryPrayerModal, setShowTemporaryPrayerModal] = useState(false);
  const [temporaryPrayerName, setTemporaryPrayerName] = useState(DEFAULT_TEMPORARY_PRAYER_PRESET.nameAr);
  const [temporaryPrayerRakats, setTemporaryPrayerRakats] = useState(String(DEFAULT_TEMPORARY_PRAYER_PRESET.rakats));
  const [selectedTemporaryPreset, setSelectedTemporaryPreset] = useState<TemporaryPrayerPresetKey | null>(DEFAULT_TEMPORARY_PRAYER_PRESET.key);

  // Sujood detector hook
  const detector = useSujoodDetector();

  const getTemporaryPrayerPresetName = useCallback((preset: TemporaryPrayerPreset) => {
    return t(TEMPORARY_PRAYER_PRESET_TRANSLATION_KEYS[preset.key]);
  }, []);

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
    // Date guard: if todayPrayer is from a different day, ignore its statuses
    const today = getTodayDate();
    const isCurrentDay = todayPrayer?.date === today;

    // Check if prayer is already completed in worship tracker
    const prayerStatus = isCurrentDay ? todayPrayer?.[prayer as keyof typeof todayPrayer] : undefined;
    const isAlreadyCompleted = prayerStatus === 'prayed' || prayerStatus === 'late';
    
    if (isAlreadyCompleted) {
      return { isAvailable: false, willBeLate: false, isCompleted: true };
    }
    
    const isAvailable = isPrayerAvailable(prayer, prayerTimes, nowMinutes);
    const status = isAvailable ? determinePrayerStatus(prayer, prayerTimes, nowMinutes) : null;
    return { isAvailable, willBeLate: status === 'late', isCompleted: false };
  }, [prayerTimes, nowMinutes, todayPrayer]);

  // Computed values
  const selectedRequiredPrayer = selectedPrayer?.kind === 'required' ? selectedPrayer.prayer : null;
  const temporaryRakatsNumber = Number.parseInt(temporaryPrayerRakats, 10);
  const isTemporaryPrayerValid =
    temporaryPrayerName.trim().length > 0 &&
    Number.isFinite(temporaryRakatsNumber) &&
    temporaryRakatsNumber >= TEMPORARY_PRAYER_MIN_RAKATS &&
    temporaryRakatsNumber <= TEMPORARY_PRAYER_MAX_RAKATS;
  const prayerInfo: TrackingPrayerInfo | null = useMemo(() => {
    if (!selectedPrayer) return null;
    if (selectedPrayer.kind === 'required') {
      return PRAYER_CONFIG[selectedPrayer.prayer];
    }
    return {
      nameAr: selectedPrayer.name,
      rakats: selectedPrayer.rakats,
      icon: selectedPrayer.icon,
      iconColor: selectedPrayer.iconColor,
    };
  }, [selectedPrayer]);
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
      
      // Required prayers keep the existing worship tracking + notification behavior.
      if (selectedPrayer?.kind === 'required') {
        const prayerKey = selectedPrayer.prayer;
        const now = new Date();
        const currentNowMinutes = (now.getHours() * 60) + now.getMinutes();
        const status = determinePrayerStatus(prayerKey, prayerTimes, currentNowMinutes);
        const selectedPrayerTime = prayerTimes[prayerKey];
        updatePrayerWithTime(prayerKey as PrayerName, status, selectedPrayerTime).catch((error) => {
          console.error('[Salati] Prayer save failed:', error);
        });

        // Send immediate "أتممت صلاتك" notification + cancel today's scheduled "هل صليت؟"
        (async () => {
          try {
            const channelId = getReminderChannelId('general_reminder');
            await Notifications.scheduleNotificationAsync({
              content: {
                title: t('notifications.prayerAccepted'),
                body: t('notifications.prayerAcceptedBody'),
                sound: resolveNotificationSound('general_reminder', true),
                data: { type: 'prayer_completed', prayer: prayerKey },
                ...(Platform.OS === 'android' && { priority: Notifications.AndroidNotificationPriority.HIGH }),
                ...(Platform.OS === 'android' && { channelId }),
                ...(Platform.OS === 'ios' && { interruptionLevel: 'timeSensitive' as const }),
              },
              trigger: null,
            });
            // Cancel today's did_you_pray notification (date-based identifier)
            try {
              const td = new Date();
              const ds = `${td.getFullYear()}${String(td.getMonth() + 1).padStart(2, '0')}${String(td.getDate()).padStart(2, '0')}`;
              await Notifications.cancelScheduledNotificationAsync(`did_you_pray_${prayerKey}_${ds}`);
            } catch {}
          } catch (e) {
            console.warn('[Salati] Failed to send completion notification:', e);
          }
        })();
      }
      
      // Haptic success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [isCompleted, currentView, selectedPrayer, prayerTimes, updatePrayerWithTime]);

  // Handlers
  const handleStartPrayer = useCallback(() => {
    setCurrentView('selection');
  }, []);

  const handleSelectPrayer = useCallback((prayer: SalatiPrayerType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeValidationError(null);
    setSelectedPrayer({ kind: 'required', prayer });
  }, []);

  const handleOpenTemporaryPrayerModal = useCallback(() => {
    setTimeValidationError(null);
    if (!selectedPrayer || selectedPrayer.kind !== 'temporary') {
      setSelectedTemporaryPreset(DEFAULT_TEMPORARY_PRAYER_PRESET.key);
      setTemporaryPrayerName(getTemporaryPrayerPresetName(DEFAULT_TEMPORARY_PRAYER_PRESET));
      setTemporaryPrayerRakats(String(DEFAULT_TEMPORARY_PRAYER_PRESET.rakats));
    }
    setShowTemporaryPrayerModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [getTemporaryPrayerPresetName, selectedPrayer]);

  const handleSelectTemporaryPreset = useCallback((preset: TemporaryPrayerPreset) => {
    setSelectedTemporaryPreset(preset.key);
    setTemporaryPrayerName(getTemporaryPrayerPresetName(preset));
    setTemporaryPrayerRakats(String(preset.rakats));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [getTemporaryPrayerPresetName]);

  const handleUseCustomTemporaryPrayer = useCallback(() => {
    setSelectedTemporaryPreset(null);
    setTemporaryPrayerName('');
    setTemporaryPrayerRakats(String(DEFAULT_TEMPORARY_PRAYER_PRESET.rakats));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleTemporaryPrayerNameChange = useCallback((name: string) => {
    setTemporaryPrayerName(name);
    setSelectedTemporaryPreset(null);
  }, []);

  const handleTemporaryRakatsChange = useCallback((value: string) => {
    setTemporaryPrayerRakats(value.replace(/[^0-9]/g, ''));
  }, []);

  const adjustTemporaryRakats = useCallback((delta: number) => {
    const current = Number.parseInt(temporaryPrayerRakats, 10);
    const next = Math.min(
      TEMPORARY_PRAYER_MAX_RAKATS,
      Math.max(TEMPORARY_PRAYER_MIN_RAKATS, (Number.isFinite(current) ? current : DEFAULT_TEMPORARY_PRAYER_PRESET.rakats) + delta)
    );
    setTemporaryPrayerRakats(String(next));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [temporaryPrayerRakats]);

  const handleChooseTemporaryPrayer = useCallback(() => {
    if (!isTemporaryPrayerValid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const preset = selectedTemporaryPreset
      ? TEMPORARY_PRAYER_PRESETS.find((item) => item.key === selectedTemporaryPreset)
      : null;

    setSelectedPrayer({
      kind: 'temporary',
      name: temporaryPrayerName.trim(),
      rakats: temporaryRakatsNumber,
      icon: preset?.icon || 'star-crescent',
      iconColor: preset?.iconColor || ACCENT_GREEN,
    });
    setShowTemporaryPrayerModal(false);
    setTimeValidationError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [isTemporaryPrayerValid, selectedTemporaryPreset, temporaryPrayerName, temporaryRakatsNumber]);

  const handleBeginTracking = useCallback(async () => {
    if (!selectedPrayer) return;

    if (selectedPrayer.kind === 'required') {
      const now = new Date();
      const nowMinutes = (now.getHours() * 60) + now.getMinutes();

      // Check if prayer is available using smart logic
      const isAvailable = isPrayerAvailable(selectedPrayer.prayer, prayerTimes, nowMinutes);

      if (!isAvailable) {
        setTimeValidationError(t('smartTracker.prayerNotYet'));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
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

      <ScrollView
        contentContainerStyle={styles.instructionsScrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
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

        {/* Steps */}
        <View style={styles.instructionsList}>
          {/* Step 1 */}
          <View style={[styles.stepCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
            <View style={[styles.stepRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.stepNumber, { backgroundColor: ACCENT_GREEN }]}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('smartTracker.step1Title')}
                </Text>
                <Text style={[styles.stepDesc, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('smartTracker.step1Desc')}
                </Text>
              </View>
            </View>
          </View>

          {/* Step 2 */}
          <View style={[styles.stepCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
            <View style={[styles.stepRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.stepNumber, { backgroundColor: ACCENT_GREEN }]}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('smartTracker.step2Title')}
                </Text>
                <Text style={[styles.stepDesc, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('smartTracker.step2Desc')}
                </Text>
              </View>
            </View>
          </View>

          {/* Step 3 */}
          <View style={[styles.stepCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
            <View style={[styles.stepRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.stepNumber, { backgroundColor: ACCENT_GREEN }]}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('smartTracker.step3Title')}
                </Text>
                <Text style={[styles.stepDesc, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('smartTracker.step3Desc')}
                </Text>
              </View>
            </View>
          </View>

          {/* Tip */}
          <View style={[styles.tipCard, { backgroundColor: isDarkMode ? 'rgba(13, 142, 98, 0.12)' : 'rgba(13, 142, 98, 0.08)' }]}>
            <View style={[styles.stepRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={22} color={ACCENT_GREEN} />
              <View style={styles.stepContent}>
                <Text style={[styles.tipText, { color: ACCENT_GREEN, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('smartTracker.tipDesc')}
                </Text>
              </View>
            </View>
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
      </ScrollView>
    </Animated.View>
  );

  const renderSelection = () => (
    <Animated.View
      entering={FadeInDown.duration(400)}
      exiting={FadeOut.duration(200)}
      style={styles.selectionContainer}
    >
    <ScrollView
      contentContainerStyle={styles.selectionScrollContent}
      showsVerticalScrollIndicator={false}
      bounces={true}
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
            const isSelected = selectedRequiredPrayer === prayer;
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
                    <MaterialCommunityIcons name="circle-outline" size={12} color={ACCENT_GREEN} />
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
            const isSelected = selectedRequiredPrayer === prayer;
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
                    <MaterialCommunityIcons name="circle-outline" size={12} color={ACCENT_GREEN} />
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

        {/* Third row: Isha, Other Prayer */}
        <View style={[styles.prayerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {(['isha'] as SalatiPrayerType[]).map((prayer) => {
            const info = PRAYER_CONFIG[prayer];
            const isSelected = selectedRequiredPrayer === prayer;
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
                    <MaterialCommunityIcons name="circle-outline" size={12} color={ACCENT_GREEN} />
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

          <TouchableOpacity
            style={[
              styles.prayerCard,
              {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f2f2f7',
                borderColor: isDarkMode ? 'transparent' : 'rgba(0,0,0,0.06)',
              },
              selectedPrayer?.kind === 'temporary' && styles.prayerCardSelected,
            ]}
            onPress={handleOpenTemporaryPrayerModal}
            activeOpacity={0.7}
          >
            <View style={styles.rakatBadge}>
              <MaterialCommunityIcons
                name={selectedPrayer?.kind === 'temporary' ? 'check-circle' : 'plus-circle-outline'}
                size={14}
                color={ACCENT_GREEN}
              />
            </View>

            <View
              style={[
                styles.prayerIconCircle,
                { backgroundColor: `${selectedPrayer?.kind === 'temporary' ? selectedPrayer.iconColor : ACCENT_GREEN}20` },
              ]}
            >
              <MaterialCommunityIcons
                name={(selectedPrayer?.kind === 'temporary' ? selectedPrayer.icon : 'plus-circle-outline') as any}
                size={32}
                color={selectedPrayer?.kind === 'temporary' ? selectedPrayer.iconColor : ACCENT_GREEN}
              />
            </View>
            <Text
              style={[
                styles.prayerCardText,
                { color: selectedPrayer?.kind === 'temporary' ? ACCENT_GREEN : colors.text },
              ]}
              numberOfLines={2}
            >
              {selectedPrayer?.kind === 'temporary' ? selectedPrayer.name : t('smartTracker.otherPrayer')}
            </Text>
            <Text style={[styles.otherPrayerHint, { color: colors.textLight }]} numberOfLines={1}>
              {selectedPrayer?.kind === 'temporary'
                ? `${selectedPrayer.rakats} ${t('smartTracker.rakats')}`
                : t('smartTracker.otherPrayerHint')}
            </Text>
          </TouchableOpacity>
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
    </ScrollView>
    </Animated.View>
  );

  const renderTemporaryPrayerModal = () => (
    <Modal
      visible={showTemporaryPrayerModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowTemporaryPrayerModal(false)}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowTemporaryPrayerModal(false)} />
        <View
          style={[
            styles.modalSheet,
            {
              backgroundColor: isDarkMode ? 'rgba(30,30,32,0.96)' : 'rgba(255,255,255,0.98)',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
              paddingBottom: Math.max(insets.bottom, 16) + 16,
            },
          ]}
        >
          <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.modalTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('smartTracker.otherPrayer')}
            </Text>
            <TouchableOpacity
              onPress={() => setShowTemporaryPrayerModal(false)}
              style={[styles.modalCloseButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
            >
              <MaterialCommunityIcons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.modalSectionLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('smartTracker.otherPrayerPresets')}
          </Text>
          <View style={[styles.presetGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {TEMPORARY_PRAYER_PRESETS.map((preset) => {
              const isPresetSelected = selectedTemporaryPreset === preset.key;
              return (
                <TouchableOpacity
                  key={preset.key}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : '#f2f2f7',
                      borderColor: isPresetSelected ? ACCENT_GREEN : isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    },
                  ]}
                  onPress={() => handleSelectTemporaryPreset(preset)}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons name={preset.icon as any} size={22} color={preset.iconColor} />
                  <Text
                    style={[styles.presetChipText, { color: isPresetSelected ? ACCENT_GREEN : colors.text }]}
                    numberOfLines={1}
                  >
                    {getTemporaryPrayerPresetName(preset)}
                  </Text>
                  <Text style={[styles.presetChipMeta, { color: colors.textLight }]}>
                    {preset.rakats} {t('smartTracker.rakats')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.customPrayerButton,
              {
                backgroundColor: isDarkMode ? 'rgba(13, 142, 98, 0.12)' : 'rgba(13, 142, 98, 0.08)',
                borderColor: selectedTemporaryPreset === null ? ACCENT_GREEN : 'rgba(13, 142, 98, 0.18)',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
            onPress={handleUseCustomTemporaryPrayer}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={24} color={ACCENT_GREEN} />
            <View style={[styles.customPrayerTextWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.customPrayerTitle, { color: ACCENT_GREEN, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('smartTracker.otherPrayerCustom')}
              </Text>
              <Text style={[styles.customPrayerHint, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('smartTracker.otherPrayerCustomHint')}
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={[styles.inputLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('smartTracker.otherPrayerName')}
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(120,120,128,0.14)',
                color: colors.text,
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
            value={temporaryPrayerName}
            onChangeText={handleTemporaryPrayerNameChange}
            placeholder={t('smartTracker.otherPrayerNamePlaceholder')}
            placeholderTextColor={colors.textLight}
            maxLength={32}
          />

          <Text style={[styles.inputLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('smartTracker.otherPrayerRakats')}
          </Text>
          <View style={[styles.stepperRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              onPress={() => adjustTemporaryRakats(1)}
              style={[styles.stepperButton, { backgroundColor: 'rgba(13, 142, 98, 0.14)' }]}
            >
              <MaterialCommunityIcons name="plus" size={22} color={ACCENT_GREEN} />
            </TouchableOpacity>
            <TextInput
              style={[
                styles.stepperInput,
                {
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(120,120,128,0.14)',
                  color: colors.text,
                },
              ]}
              value={temporaryPrayerRakats}
              onChangeText={handleTemporaryRakatsChange}
              keyboardType="number-pad"
              placeholder={String(DEFAULT_TEMPORARY_PRAYER_PRESET.rakats)}
              placeholderTextColor={colors.textLight}
              textAlign="center"
              maxLength={2}
            />
            <TouchableOpacity
              onPress={() => adjustTemporaryRakats(-1)}
              style={[styles.stepperButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}
            >
              <MaterialCommunityIcons name="minus" size={22} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.rangeHint, { color: isTemporaryPrayerValid ? colors.textLight : '#ef5350', textAlign: isRTL ? 'right' : 'left' }]}>
            {t('smartTracker.otherPrayerRange', {
              min: TEMPORARY_PRAYER_MIN_RAKATS,
              max: TEMPORARY_PRAYER_MAX_RAKATS,
            })}
          </Text>

          <TouchableOpacity
            style={[styles.modalPrimaryButton, !isTemporaryPrayerValid && styles.primaryButtonDisabled]}
            onPress={handleChooseTemporaryPrayer}
            disabled={!isTemporaryPrayerValid}
          >
            <Text style={styles.primaryButtonText}>
              {t('smartTracker.choosePrayer')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
        {selectedPrayer?.kind === 'temporary'
          ? t('smartTracker.otherPrayerCompleted')
          : t('smartTracker.completed')}
      </Text>

      {/* Verse */}
      {selectedPrayer?.kind !== 'temporary' && (
        <GlassCard style={styles.verseCard}>
          <Text style={[styles.verseText, { color: colors.text }]}>
            {t('smartTracker.completedVerse')}
          </Text>
          <Text style={[styles.verseRef, { color: colors.textLight }]}>
            {t('smartTracker.completedRef')}
          </Text>
        </GlassCard>
      )}

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
        {renderTemporaryPrayerModal()}
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
  },
  instructionsScrollContent: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 32,
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
    zIndex: 10,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: ACCENT_GREEN,
  },
  title: {
    fontSize: 28,
    fontFamily: fontBold(),
    textAlign: 'center',
    marginBottom: 24,
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
    gap: 12,
    marginBottom: 28,
  },
  stepCard: {
    borderRadius: 14,
    padding: 14,
  },
  stepRow: {
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 14,
    fontFamily: fontBold(),
    color: '#fff',
    includeFontPadding: false,
  },
  stepContent: {
    flex: 1,
    gap: 4,
  },
  stepTitle: {
    fontSize: 16,
    fontFamily: fontBold(),
    includeFontPadding: false,
  },
  stepDesc: {
    fontSize: 14,
    fontFamily: fontRegular(),
    lineHeight: 22,
    includeFontPadding: false,
  },
  tipCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(13, 142, 98, 0.2)',
  },
  tipText: {
    fontSize: 14,
    fontFamily: fontRegular(),
    lineHeight: 22,
    includeFontPadding: false,
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
  },
  selectionScrollContent: {
    alignItems: 'center',
    paddingBottom: 32,
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
    textAlign: 'center',
    includeFontPadding: false,
  },
  otherPrayerHint: {
    fontSize: 11,
    fontFamily: fontMedium(),
    marginTop: -4,
    textAlign: 'center',
    includeFontPadding: false,
  },
  selectionErrorText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: fontMedium(),
    lineHeight: 22,
    includeFontPadding: false,
  },

  // Temporary Prayer Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: fontBold(),
    includeFontPadding: false,
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSectionLabel: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
    marginBottom: 10,
    includeFontPadding: false,
  },
  presetGrid: {
    width: '100%',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 16,
  },
  presetChip: {
    width: '48%',
    minHeight: 86,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  presetChipText: {
    fontSize: 14,
    fontFamily: fontSemiBold(),
    textAlign: 'center',
    includeFontPadding: false,
  },
  presetChipMeta: {
    fontSize: 12,
    fontFamily: fontRegular(),
    includeFontPadding: false,
  },
  customPrayerButton: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  customPrayerTextWrap: {
    flex: 1,
    gap: 3,
  },
  customPrayerTitle: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
    includeFontPadding: false,
  },
  customPrayerHint: {
    fontSize: 12,
    fontFamily: fontRegular(),
    includeFontPadding: false,
  },
  inputLabel: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
    marginBottom: 8,
    includeFontPadding: false,
  },
  textInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: fontMedium(),
    marginBottom: 14,
    includeFontPadding: false,
  },
  stepperRow: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  stepperButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperInput: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    fontSize: 18,
    fontFamily: fontBold(),
    includeFontPadding: false,
  },
  rangeHint: {
    fontSize: 12,
    fontFamily: fontRegular(),
    marginBottom: 16,
    includeFontPadding: false,
  },
  modalPrimaryButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT_GREEN,
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderRadius: 14,
    width: '100%',
    gap: 8,
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
