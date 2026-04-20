/**
 * AlKahfReminderSheet — Bottom sheet that appears once when user opens Surah Al-Kahf (18)
 * Lets user choose a custom time for the weekly Friday Al-Kahf reminder notification.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings } from '@/contexts/SettingsContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { t } from '@/lib/i18n';

const KAHF_SHEET_SHOWN_KEY = '@kahf_reminder_sheet_shown';

interface AlKahfReminderSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function AlKahfReminderSheet({ visible, onDismiss }: AlKahfReminderSheetProps) {
  const { updateNotifications, isDarkMode } = useSettings();
  const colors = useColors();
  const isRTL = useIsRTL();

  // Default to 14:00 (2:00 PM) Friday
  const [selectedTime, setSelectedTime] = useState(() => {
    const d = new Date();
    d.setHours(14, 0, 0, 0);
    return d;
  });
  const [showTimePicker, setShowTimePicker] = useState(Platform.OS === 'ios');

  const formatTime = (date: Date): string => {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const formatDisplayTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleConfirm = useCallback(async () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const timeStr = formatTime(selectedTime);
    await updateNotifications({
      kahfReminder: true,
      kahfTime: timeStr,
      notifOverrides: { kahfFriday: true },
    });
    await AsyncStorage.setItem(KAHF_SHEET_SHOWN_KEY, 'true');
    onDismiss();
  }, [selectedTime, updateNotifications, onDismiss]);

  const handleSkip = useCallback(async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem(KAHF_SHEET_SHOWN_KEY, 'true');
    onDismiss();
  }, [onDismiss]);

  const isLight = !isDarkMode;
  const accentColor = '#0f987f';
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleSkip}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleSkip} />
        <View style={styles.sheetContainer}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 50 : 30}
            tint={(isLight ? 'systemThickMaterialLight' : 'systemThickMaterialDark') as any}
            style={styles.blurView}
          >
            <View style={[styles.content, {
              paddingBottom: Math.max(insets.bottom, 16) + 16,
              backgroundColor: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(28,28,30,0.85)',
            }]}>
              {/* Handle bar */}
              <View style={styles.handleBar}>
                <View style={[styles.handle, { backgroundColor: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' }]} />
              </View>

              {/* Icon */}
              <View style={[styles.iconContainer, { backgroundColor: accentColor + '18' }]}>
                <MaterialCommunityIcons name="book-open-page-variant" size={36} color={accentColor} />
              </View>

              {/* Title */}
              <Text style={[styles.title, {
                color: isLight ? '#1a1a2e' : '#fff',
                textAlign: 'center',
                writingDirection: isRTL ? 'rtl' : 'ltr',
              }]}>
                {t('settings.kahfSheetTitle')}
              </Text>

              {/* Subtitle */}
              <Text style={[styles.subtitle, {
                color: isLight ? '#666' : '#aaa',
                textAlign: 'center',
                writingDirection: isRTL ? 'rtl' : 'ltr',
              }]}>
                {t('settings.kahfSheetSubtitle')}
              </Text>

              {/* Time picker */}
              <TouchableOpacity
                style={[styles.timeRow, {
                  backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                }]}
                onPress={() => {
                  if (Platform.OS !== 'ios') setShowTimePicker(true);
                }}
              >
                <MaterialCommunityIcons name="clock-outline" size={20} color={accentColor} />
                <Text style={[styles.timeLabel, { color: isLight ? '#333' : '#ddd' }]}>
                  {t('settings.kahfReminderTime')}
                </Text>
                <Text style={[styles.timeValue, { color: accentColor }]}>
                  {formatDisplayTime(selectedTime)}
                </Text>
              </TouchableOpacity>

              {showTimePicker && (
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  themeVariant={isDarkMode ? 'dark' : 'light'}
                  onChange={(_, date) => {
                    if (Platform.OS !== 'ios') setShowTimePicker(false);
                    if (date) setSelectedTime(date);
                  }}
                />
              )}

              {/* Friday badge */}
              <View style={[styles.fridayBadge, { backgroundColor: accentColor + '15' }]}>
                <MaterialCommunityIcons name="calendar-week" size={16} color={accentColor} />
                <Text style={[styles.fridayText, { color: accentColor }]}>
                  {t('settings.everyFriday')}
                </Text>
              </View>

              {/* Buttons */}
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: accentColor }]}
                onPress={handleConfirm}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="bell-check" size={20} color="#fff" />
                <Text style={styles.confirmText}>{t('settings.kahfSheetConfirm')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipBtn}
                onPress={handleSkip}
                activeOpacity={0.7}
              >
                <Text style={[styles.skipText, { color: isLight ? '#888' : '#777' }]}>
                  {t('settings.kahfSheetSkip')}
                </Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
}

/** Check if the sheet has been shown before */
export async function shouldShowKahfSheet(): Promise<boolean> {
  try {
    const shown = await AsyncStorage.getItem(KAHF_SHEET_SHOWN_KEY);
    return shown !== 'true';
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  blurView: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: 24,
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: fontBold(),
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fontRegular(),
    lineHeight: 22,
    marginBottom: 24,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    marginBottom: 12,
  },
  timeLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: fontMedium(),
  },
  timeValue: {
    fontSize: 16,
    fontFamily: fontSemiBold(),
  },
  fridayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 24,
  },
  fridayText: {
    fontSize: 13,
    fontFamily: fontMedium(),
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fontBold(),
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 14,
    fontFamily: fontMedium(),
  },
});
