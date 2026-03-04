// components/ui/prayer/PrayerList.tsx
// قائمة مواقيت الصلوات الخمس - روح المسلم

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
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
  formatTime12h,
  getPrayerIcon,
  isPrayerPassed,
  getNextPrayer,
} from '@/lib/prayer-times';
import { useSettings } from '@/contexts/SettingsContext';

interface PrayerListProps {
  prayerTimes: PrayerTimes | null;
  language?: string;
  isDarkMode?: boolean;
  notificationSettings?: Record<PrayerName, boolean>;
  onToggleNotification?: (prayer: PrayerName, enabled: boolean) => void;
  showNotificationToggle?: boolean;
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
  index: number;
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
    { name: 'sunrise', time: prayerTimes.sunrise },
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
          index={index}
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
  index,
}) => {
  const { t } = useSettings();
  const scale = useSharedValue(1);
  const prayerNameLocalized = t(`prayer.${name}`);
  const icon = getPrayerIcon(name);
  const colors = prayerColors[name];
  const accentColor = isDarkMode ? colors.dark : colors.light;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
  };

  const handleToggle = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleNotification?.(value);
  };

  return (
    <Animated.View
      entering={FadeInRight.delay(index * 100).duration(400)}
      style={animatedStyle}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handlePress}
        style={[
          styles.prayerItem,
          isDarkMode && styles.prayerItemDark,
          isNext && styles.prayerItemNext,
          isNext && { borderColor: accentColor },
          isPassed && !isNext && styles.prayerItemPassed,
        ]}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: isNext ? accentColor : `${accentColor}30` },
          ]}
        >
          <MaterialCommunityIcons
            name={icon as any}
            size={24}
            color={isNext ? '#fff' : accentColor}
          />
        </View>

        <View style={styles.prayerInfo}>
          <Text
            style={[
              styles.prayerName,
              isDarkMode && styles.textLight,
              isPassed && !isNext && styles.textPassed,
              isNext && { color: accentColor },
            ]}
          >
            {prayerNameLocalized}
          </Text>
          {isNext && (
            <View style={[styles.nextBadge, { backgroundColor: accentColor }]}>
              <Text style={styles.nextBadgeText}>
                {t('prayer.nextPrayer')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.timeContainer}>
          <Text
            style={[
              styles.prayerTime,
              isDarkMode && styles.textLight,
              isPassed && !isNext && styles.textPassed,
              isNext && { color: accentColor },
            ]}
          >
            {formatTime12h(time)}
          </Text>

          {showNotificationToggle && name !== 'sunrise' && (
            <Switch
              value={notificationEnabled}
              onValueChange={handleToggle}
              trackColor={{ false: '#767577', true: `${accentColor}80` }}
              thumbColor={notificationEnabled ? accentColor : '#f4f3f4'}
              style={styles.switch}
            />
          )}

          {isPassed && !isNext && (
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color={isDarkMode ? '#4caf50' : '#2e7d32'}
              style={styles.passedIcon}
            />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  containerDark: {
    backgroundColor: '#1a1a2e',
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
    fontFamily: 'Cairo-Regular',
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
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  prayerItemDark: {
    backgroundColor: '#252540',
  },
  prayerItemNext: {
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
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
    marginRight: 12,
  },
  prayerInfo: {
    flex: 1,
  },
  prayerName: {
    fontSize: 17,
    fontFamily: 'Cairo-SemiBold',
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
    fontFamily: 'Cairo-Medium',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prayerTime: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  passedIcon: {
    marginLeft: 4,
  },
});

export default PrayerList;
