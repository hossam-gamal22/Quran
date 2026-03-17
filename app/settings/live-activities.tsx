import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GlassCard } from '@/components/ui/GlassCard';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { UniversalHeader } from '@/components/ui';
import { localizeNumber } from '@/lib/format-number';
import {
  LiveActivityStyle,
  LIVE_ACTIVITY_STYLES,
  getLiveActivitySettings,
  saveLiveActivitySettings,
  startLiveActivity,
  endLiveActivity,
  areActivitiesEnabled,
} from '@/lib/live-activities';

export default function LiveActivitiesSettingsScreen() {
  const { isDarkMode, t } = useSettings();
  const isRTL = useIsRTL();
  const colors = useColors();
  const [enabled, setEnabled] = useState(false);
  const [style, setStyle] = useState<LiveActivityStyle>('prayer_times');
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    getLiveActivitySettings().then(s => {
      setEnabled(s.enabled);
      setStyle(s.style);
    });
    if (Platform.OS === 'ios') {
      areActivitiesEnabled().then(setSupported);
    }
  }, []);

  const handleToggle = async (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEnabled(val);
    await saveLiveActivitySettings({ enabled: val, style });
    if (!val) {
      await endLiveActivity();
    }
  };

  const handleStyleChange = async (s: LiveActivityStyle) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStyle(s);
    await saveLiveActivitySettings({ enabled, style: s });
  };

  const STYLE_ICONS: Record<string, string> = {
    prayer_times: 'clock-outline',
    prayer_times_sunrise: 'weather-sunset-up',
    prayer_with_dua: 'hands-pray',
    prayer_with_ayah: 'book-open-variant',
  };

  return (
    <BackgroundWrapper>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <UniversalHeader title={t('liveActivities.title')} />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Toggle */}
          <GlassCard style={styles.card}>
            <View style={[styles.toggleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.toggleLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('liveActivities.enable')}
              </Text>
              <Switch
                value={enabled}
                onValueChange={handleToggle}
                trackColor={{ false: '#767577', true: '#22C55E' }}
                thumbColor="#fff"
              />
            </View>
            <Text style={[styles.description, { color: colors.muted, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('liveActivities.description')}
            </Text>
            {!supported && Platform.OS === 'ios' && (
              <Text style={[styles.compatibility, { color: '#ef5350', textAlign: isRTL ? 'right' : 'left' }]}>
                {t('liveActivities.notSupported')}
              </Text>
            )}
          </GlassCard>

          {/* Style picker */}
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{t('liveActivities.styleTitle')}</Text>
          {LIVE_ACTIVITY_STYLES.map((s) => {
            const isActive = style === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => handleStyleChange(s.id)}
                activeOpacity={0.7}
                style={{ marginBottom: 8 }}
              >
                <GlassCard style={[styles.styleCard, isActive && { borderColor: '#22C55E', borderWidth: 2 }]}>
                  <View style={[styles.styleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.styleIcon, { backgroundColor: isActive ? 'rgba(34,197,94,0.15)' : 'rgba(120,120,128,0.12)' }]}>
                      <MaterialCommunityIcons
                        name={(STYLE_ICONS[s.id] || 'clock-outline') as any}
                        size={24}
                        color={isActive ? '#22C55E' : colors.text}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.styleName, { color: isActive ? '#22C55E' : colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                        {s.nameAr}
                      </Text>
                      <Text style={[styles.styleDesc, { color: colors.muted, textAlign: isRTL ? 'right' : 'left' }]}>
                        {s.descAr}
                      </Text>
                    </View>
                    {isActive && (
                      <MaterialCommunityIcons name="check-circle" size={22} color="#22C55E" />
                    )}
                  </View>
                </GlassCard>
              </TouchableOpacity>
            );
          })}

          {/* Preview */}
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', marginTop: 16 }]}>{t('liveActivities.preview')}</Text>
          <GlassCard style={styles.previewCard}>
            <View style={styles.previewContent}>
              <View style={[styles.previewHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons name="mosque" size={20} color="#22C55E" />
                <Text style={[styles.previewAppName, { color: colors.text }]}>{t('common.appName')}</Text>
              </View>
              <Text style={[styles.previewPrayer, { color: colors.text }]}>{t('liveActivities.previewNextPrayer')}</Text>
              <Text style={[styles.previewTime, { color: '#22C55E' }]}>{localizeNumber('02:30:15')}</Text>
              {style === 'prayer_times_sunrise' && (
                <Text style={[styles.previewExtra, { color: colors.muted }]}>{t('liveActivities.previewSunrise')}</Text>
              )}
              {style === 'prayer_with_dua' && (
                <Text style={[styles.previewExtra, { color: colors.muted }]}>اللهم اجعلني من المتقين</Text>
              )}
              {style === 'prayer_with_ayah' && (
                <Text style={[styles.previewExtra, { color: colors.muted }]}>﴿إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا﴾</Text>
              )}
              <View style={[styles.previewTimesRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {[
                  { key: 'fajr', time: localizeNumber('04:30') },
                  { key: 'dhuhr', time: localizeNumber('12:15') },
                  { key: 'asr', time: localizeNumber('15:45') },
                  { key: 'maghrib', time: localizeNumber('18:20') },
                  { key: 'isha', time: localizeNumber('19:50') },
                ].map((p, i) => (
                  <View key={p.key} style={styles.previewTimeItem}>
                    <Text style={[styles.previewTimeLabel, { color: colors.muted }]}>{t(`prayer.${p.key}`)}</Text>
                    <Text style={[styles.previewTimeVal, { color: i === 3 ? '#22C55E' : colors.text }]}>
                      {p.time}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </GlassCard>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  card: { padding: 20, marginBottom: 16 },
  toggleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  toggleLabel: {
    fontSize: 17,
    fontFamily: fontSemiBold(),
    flex: 1,
  },
  description: {
    fontSize: 14,
    fontFamily: fontRegular(),
    lineHeight: 22,
    marginBottom: 8,
  },
  compatibility: {
    fontSize: 12,
    fontFamily: fontRegular(),
    lineHeight: 18,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontBold(),
    marginBottom: 12,
    marginTop: 8,
  },
  styleCard: { padding: 14 },
  styleRow: {
    alignItems: 'center',
    gap: 12,
  },
  styleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  styleName: { fontSize: 15, fontFamily: fontSemiBold() },
  styleDesc: { fontSize: 12, fontFamily: fontRegular(), marginTop: 2 },
  previewCard: { padding: 20 },
  previewContent: { alignItems: 'center', gap: 8 },
  previewHeader: { alignItems: 'center', gap: 8 },
  previewAppName: { fontSize: 14, fontFamily: fontSemiBold() },
  previewPrayer: { fontSize: 16, fontFamily: fontSemiBold(), textAlign: 'center' },
  previewTime: { fontSize: 32, fontFamily: fontBold() },
  previewExtra: { fontSize: 13, fontFamily: fontRegular(), textAlign: 'center', marginTop: 4 },
  previewTimesRow: {
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  previewTimeItem: { alignItems: 'center', gap: 2 },
  previewTimeLabel: { fontSize: 10, fontFamily: fontRegular() },
  previewTimeVal: { fontSize: 12, fontFamily: fontSemiBold() },
});
