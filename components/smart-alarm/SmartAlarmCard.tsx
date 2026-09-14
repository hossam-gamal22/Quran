import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { fontMedium, fontSemiBold } from '@/lib/fonts';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { uiText } from '@/lib/ui-text';
import { useSmartAlarm } from '@/contexts/SmartAlarmContext';

export function SmartAlarmCard() {
  const colors = useColors();
  const isRTL = useIsRTL();
  const router = useRouter();
  const { config } = useSmartAlarm();

  const isDarkMode = (colors as any).isDarkMode as boolean;
  const isAnyEnabled = config.fajr.enabled || config.suhoor.enabled;

  const onOpen = () => {
    // Open notifications settings with the Salah category auto-expanded so
    // the user lands directly on the Fajr/smart-alarm controls.
    router.push({ pathname: '/settings/notifications', params: { expand: 'prayer' } } as any);
  };

  const title = uiText({ ar: 'منبه الفجر الذكي', en: 'Smart Fajr Alarm' });
  const subtitle = isAnyEnabled
    ? uiText({
        ar: 'مفعّل — تأكد أن الإشعارات مسموح بها',
        en: 'Enabled — make sure notifications are allowed',
      })
    : uiText({
        ar: 'لا تنام عن صلاة الفجر — فعّل المنبه الذكي',
        en: "Don't miss Fajr — enable smart wake-up",
      });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onOpen}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {Platform.OS === 'ios' && (
        <BlurView
          intensity={80}
          tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' },
        ]}
      />

      <View style={[styles.content, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '22' }]}>
          <MaterialCommunityIcons name="weather-night" size={26} color={colors.primary} />
        </View>

        <View style={[styles.textCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text
            style={[
              styles.title,
              { color: colors.glassText, textAlign: isRTL ? 'right' : 'left' },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.glassTextLight, textAlign: isRTL ? 'right' : 'left' },
            ]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>

        </View>

        <MaterialCommunityIcons
          name={isRTL ? 'chevron-left' : 'chevron-right'}
          size={22}
          color={colors.glassTextLight}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 18,
    overflow: 'hidden',
  },
  content: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
  },
  subtitle: {
    fontSize: 12,
    fontFamily: fontMedium(),
  },
});
