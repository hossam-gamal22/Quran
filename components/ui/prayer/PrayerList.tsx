// components/ui/prayer/PrayerList.tsx
// قائمة مواقيت الصلوات الخمس - روح المسلم

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

import {
  PrayerTimes,
  PrayerName,
  formatPrayerTime,
  getPrayerIcon,
  getPrayerTranslationKey,
  isPrayerPassed,
  getNextPrayer,
} from '@/lib/prayer-times';
import { getPrayerWindowState, type PrayerWindowState, type TrackedPrayer } from '@/lib/prayer-availability';
import { useSettings } from '@/contexts/SettingsContext';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import type { PrayerStatus } from '@/lib/worship-storage';

const PENDING_COLOR = '#c07b10';
const PENDING_BG = 'rgba(192,123,16,0.22)';
const MISSED_COLOR = '#ef5350';

interface PrayerListProps {
  prayerTimes: PrayerTimes | null;
  language?: string;
  isDarkMode?: boolean;
  notificationSettings?: Record<PrayerName, boolean>;
  onToggleNotification?: (prayer: PrayerName, enabled: boolean) => void;
  showNotificationToggle?: boolean;
  showSunrise?: boolean;
  show24Hour?: boolean;
  prayerStatuses?: Record<string, PrayerStatus>;
  /**
   * Called when the user long-presses a prayer row. The host opens a modal with
   * the full status options (prayed / late / missed / none). Sunrise and
   * `upcoming` prayers do not invoke the callback (the row is gated client-side).
   */
  onPrayerLongPress?: (prayer: PrayerName, windowState: PrayerWindowState, currentStatus: PrayerStatus) => void;
}

interface PrayerItemProps {
  name: PrayerName;
  time: string;
  isNext: boolean;
  isPassed: boolean;
  isDarkMode: boolean;
  notificationEnabled?: boolean;
  onToggleNotification?: (enabled: boolean) => void;
  showNotificationToggle: boolean;
  show24Hour?: boolean;
  index: number;
  prayerStatus?: PrayerStatus;
  windowState: PrayerWindowState;
  onPrayerLongPress?: (windowState: PrayerWindowState, currentStatus: PrayerStatus) => void;
}

const prayerColors: Record<PrayerName, { light: string; dark: string }> = {
  fajr: { light: '#5c6bc0', dark: '#7986cb' },
  sunrise: { light: '#ffb74d', dark: '#ffa726' },
  dhuhr: { light: '#ffd54f', dark: '#ffca28' },
  asr: { light: '#ff8a65', dark: '#ff7043' },
  maghrib: { light: '#ef5350', dark: '#e53935' },
  isha: { light: '#5c6bc0', dark: '#3f51b5' },
};

export const PrayerList: React.FC<PrayerListProps> = ({
  prayerTimes,
  language = 'ar',
  isDarkMode = false,
  notificationSettings = {
    fajr: true,
    sunrise: false,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true,
  },
  onToggleNotification,
  showNotificationToggle = false,
  showSunrise = true,
  show24Hour = false,
  prayerStatuses,
  onPrayerLongPress,
}) => {
  const { t } = useSettings();
  const themeColors = useColors();
  const styles = useScaledStyles(_styles, themeColors.fs);

  if (!prayerTimes) {
    return (
      <View style={[styles.container]}>
        {Platform.OS === 'ios' && (
          <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={40}
            color={themeColors.textLight}
          />
            <Text style={[styles.loadingText, { color: themeColors.textLight }]}>
            {t('common.loading')}
          </Text>
        </View>
      </View>
    );
  }

  const nextPrayer = getNextPrayer(prayerTimes);
  const prayers: { name: PrayerName; time: string }[] = [
    { name: 'fajr', time: prayerTimes.fajr },
    ...(showSunrise ? [{ name: 'sunrise' as PrayerName, time: prayerTimes.sunrise }] : []),
    { name: 'dhuhr', time: prayerTimes.dhuhr },
    { name: 'asr', time: prayerTimes.asr },
    { name: 'maghrib', time: prayerTimes.maghrib },
    { name: 'isha', time: prayerTimes.isha },
  ];

  return (
    <View style={[styles.container]}>
      {Platform.OS === 'ios' && (
        <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
      {prayers.map((prayer, index) => {
        const windowState: PrayerWindowState = prayer.name === 'sunrise'
          ? 'onTime'
          : getPrayerWindowState(prayer.name as TrackedPrayer, {
              fajr: prayerTimes.fajr,
              dhuhr: prayerTimes.dhuhr,
              asr: prayerTimes.asr,
              maghrib: prayerTimes.maghrib,
              isha: prayerTimes.isha,
            });
        return (
          <PrayerItem
            key={prayer.name}
            name={prayer.name}
            time={prayer.time}
            isNext={nextPrayer?.name === prayer.name}
            isPassed={isPrayerPassed(prayer.time)}
            isDarkMode={isDarkMode}
            notificationEnabled={notificationSettings[prayer.name]}
            onToggleNotification={
              onToggleNotification
                ? (enabled) => onToggleNotification(prayer.name, enabled)
                : undefined
            }
            showNotificationToggle={showNotificationToggle}
            show24Hour={show24Hour}
            index={index}
            prayerStatus={prayerStatuses?.[prayer.name]}
            windowState={windowState}
            onPrayerLongPress={onPrayerLongPress ? (ws, current) => onPrayerLongPress(prayer.name, ws, current) : undefined}
          />
        );
      })}
    </View>
  );
};

const PrayerItem: React.FC<PrayerItemProps> = React.memo(({
  name,
  time,
  isNext,
  isPassed,
  isDarkMode,
  notificationEnabled,
  onToggleNotification,
  showNotificationToggle,
  show24Hour = false,
  index,
  prayerStatus,
  windowState,
  onPrayerLongPress,
}) => {
  const { t } = useSettings();
  const isRTL = useIsRTL();
  const themeColors = useColors();
  const styles = useScaledStyles(_styles, themeColors.fs);
  const scale = useSharedValue(1);
  const prayerNameLocalized = t(getPrayerTranslationKey(name));
  const icon = getPrayerIcon(name);
  const colors = prayerColors[name];
  const accentColor = isDarkMode ? colors.dark : colors.light;
  const activeGreen = '#0d8e62';
  const isPrayed = prayerStatus === 'prayed' || prayerStatus === 'late';
  const isMissed = prayerStatus === 'missed';

  // The row only opens the status modal via long-press when the prayer is in a
  // trackable window (onTime / lateOnly / expired). Upcoming prayers and sunrise
  // are not trackable. The small circle icon is a *visual indicator only*.
  const isTrackable = name !== 'sunrise' && (windowState === 'onTime' || windowState === 'lateOnly' || windowState === 'expired');

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    // Tap is a no-op (visual feedback only). Tracking happens via long-press.
    Haptics.selectionAsync();
    scale.value = withSpring(0.97, {}, () => {
      scale.value = withSpring(1);
    });
  };

  const handleLongPress = () => {
    if (!isTrackable) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
    onPrayerLongPress?.(windowState, (prayerStatus ?? 'none') as PrayerStatus);
  };

  const handleToggle = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleNotification?.(value);
  };

  // Tracking circle visuals
  let circleIcon: 'check-circle' | 'close-circle' | 'clock-outline' | 'checkbox-blank-circle-outline' = 'checkbox-blank-circle-outline';
  let circleColor: string = themeColors.textLight;
  if (isPrayed) {
    circleIcon = 'check-circle';
    circleColor = isDarkMode ? '#0d8e62' : '#2e7d32';
  } else if (isMissed) {
    circleIcon = 'close-circle';
    circleColor = MISSED_COLOR;
  } else if (name !== 'sunrise' && windowState === 'upcoming') {
    circleIcon = 'clock-outline';
    circleColor = PENDING_COLOR;
  }

  return (
    <Animated.View entering={FadeInRight.delay(index * 100).duration(400)}>
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={350}
        style={[
          styles.prayerItem,
          isNext && styles.prayerItemNext,
          isPassed && !isNext && styles.prayerItemPassed,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        {Platform.OS === 'ios' && (
          <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: isNext ? activeGreen : `${accentColor}30` },
          ]}
        >
          <MaterialCommunityIcons
            name={icon as any}
            size={24}
            color={isNext ? '#fff' : accentColor}
          />
        </View>

        {/* Leading: Prayer Name */}
        <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text
            style={[
              styles.prayerName,
              { color: themeColors.text },
              isPassed && !isNext && { color: themeColors.textLight },
              isNext && { color: activeGreen },
              { textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {prayerNameLocalized}
          </Text>
          {isNext && (
            <View style={[styles.nextBadge, { backgroundColor: activeGreen, alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={styles.nextBadgeText}>
                {t('prayer.nextPrayer')}
              </Text>
            </View>
          )}
        </View>

        {/* Status indicator (visual only — tracking happens via long-press on the row) */}
        {name !== 'sunrise' && (
          <View
            pointerEvents="none"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{}}
          >
            <MaterialCommunityIcons
              name={circleIcon}
              size={22}
              color={circleColor}
            />
          </View>
        )}

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Trailing: Time + Toggle */}
        <View style={[styles.timeContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text
            style={[
              styles.prayerTime,
              { color: themeColors.text },
              isPassed && !isNext && { color: themeColors.textLight },
              isNext && { color: activeGreen },
            ]}
          >
            {formatPrayerTime(time, show24Hour ?? false)}
          </Text>

          {showNotificationToggle && (
            <Switch
              trackColor={{ false: themeColors.border, true: '#0d8e62' }}
              thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              ios_backgroundColor={themeColors.border}
              onValueChange={(val) => handleToggle(val)}
              value={notificationEnabled || false}
            />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
    </Animated.View>
  );
});

const _styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 20,
    padding: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fontRegular(),
  },
  prayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 8,
  },
  prayerItemNext: {
    backgroundColor: 'rgba(6,79,47,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(6,79,47,0.35)',
  },
  prayerItemPassed: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayerInfo: {
  },
  prayerName: {
    fontSize: 17,
    fontFamily: fontSemiBold(),
  },
  nextBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  nextBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontFamily: fontMedium(),
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prayerTime: {
    fontSize: 18,
    fontFamily: fontBold(),
  },
  passedIcon: {
  },
});

export default PrayerList;
