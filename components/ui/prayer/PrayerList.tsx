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

import {
  PrayerTimes,
  PrayerName,
  formatPrayerTime,
  getPrayerIcon,
  isPrayerPassed,
  getNextPrayer,
} from '@/lib/prayer-times';
import { useSettings } from '@/contexts/SettingsContext';
import { useIsRTL } from '@/hooks/use-is-rtl';
import type { PrayerStatus } from '@/lib/worship-storage';

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
  onPrayerStatusToggle?: (prayer: PrayerName) => void;
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
  onPrayerStatusToggle?: () => void;
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
  onPrayerStatusToggle,
}) => {
  const { t } = useSettings();

  if (!prayerTimes) {
    return (
      <View style={[styles.container, isDarkMode && styles.containerDark]}>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={40}
            color={isDarkMode ? '#666' : '#ccc'}
          />
          <Text style={[styles.loadingText, isDarkMode && styles.textLight]}>
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
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {prayers.map((prayer, index) => (
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
          onPrayerStatusToggle={onPrayerStatusToggle ? () => onPrayerStatusToggle(prayer.name) : undefined}
        />
      ))}
    </View>
  );
};

const PrayerItem: React.FC<PrayerItemProps> = ({
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
  onPrayerStatusToggle,
}) => {
  const { t } = useSettings();
  const isRTL = useIsRTL();
  const scale = useSharedValue(1);
  const prayerNameLocalized = t(`prayer.${name}`);
  const icon = getPrayerIcon(name);
  const colors = prayerColors[name];
  const accentColor = isDarkMode ? colors.dark : colors.light;
  const activeGreen = '#2f7659';
  const isPrayed = prayerStatus === 'prayed' || prayerStatus === 'late';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
    if (onPrayerStatusToggle && name !== 'sunrise') {
      onPrayerStatusToggle();
    }
  };

  const handleToggle = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleNotification?.(value);
  };

  return (
    <Animated.View entering={FadeInRight.delay(index * 100).duration(400)}>
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handlePress}
        style={[
          styles.prayerItem,
          isDarkMode && styles.prayerItemDark,
          isNext && styles.prayerItemNext,
          isPassed && !isNext && styles.prayerItemPassed,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
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
              isDarkMode && styles.textLight,
              isPassed && !isNext && styles.textPassed,
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

        {/* Leading: Tracking Circle */}
        {name !== 'sunrise' && (
          <TouchableOpacity
            onPress={() => onPrayerStatusToggle?.()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{}}
          >
            <MaterialCommunityIcons
              name={isPrayed ? 'check-circle' : 'checkbox-blank-circle-outline'}
              size={22}
              color={isPrayed ? (isDarkMode ? '#4caf50' : '#2e7d32') : (isDarkMode ? '#555' : '#ccc')}
            />
          </TouchableOpacity>
        )}

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Trailing: Time + Toggle */}
        <View style={[styles.timeContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text
            style={[
              styles.prayerTime,
              isDarkMode && styles.textLight,
              isPassed && !isNext && styles.textPassed,
              isNext && { color: activeGreen },
            ]}
          >
            {formatPrayerTime(time, show24Hour ?? false)}
          </Text>

          {showNotificationToggle && (
            <Switch
              trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#2f7659' }}
              thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
              onValueChange={(val) => handleToggle(val)}
              value={notificationEnabled || false}
            />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: 'rgba(120,120,128,0.12)',
    borderRadius: 20,
    padding: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  containerDark: {
    backgroundColor: 'rgba(120,120,128,0.18)',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontFamily: fontRegular(),
  },
  textLight: {
    color: '#fff',
  },
  prayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(120,120,128,0.1)',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 8,
  },
  prayerItemDark: {
    backgroundColor: 'rgba(120,120,128,0.2)',
  },
  prayerItemNext: {
    backgroundColor: 'rgba(47,118,89,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(47,118,89,0.35)',
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
    color: '#333',
  },
  textPassed: {
    color: '#999',
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
    color: '#333',
  },
  passedIcon: {
  },
});

export default PrayerList;
