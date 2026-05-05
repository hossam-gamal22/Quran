import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GlassCard } from '@/components/ui/GlassCard';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
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
  getLiveActivityStatus,
  getLastLiveActivityError,
  isLiveActivityBridgeAvailable,
  type LiveActivityStatus,
} from '@/lib/live-activities';
import { refreshLiveActivityIfEnabled, getLastRefreshResult } from '@/lib/live-activity-sync';
import Constants from 'expo-constants';

export default function LiveActivitiesSettingsScreen() {
  const { isDarkMode, t } = useSettings();
  const isRTL = useIsRTL();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const [enabled, setEnabled] = useState(false);
  const [style, setStyle] = useState<LiveActivityStyle>('prayer_times');
  const [status, setStatus] = useState<LiveActivityStatus>('enabled');
  const [diagOpen, setDiagOpen] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      setStatus('not_ios');
      return;
    }
    const s = await getLiveActivityStatus();
    setStatus(s);
  }, []);

  useEffect(() => {
    getLiveActivitySettings().then(s => {
      setEnabled(s.enabled);
      setStyle(s.style);
    });
    refreshStatus();
  }, [refreshStatus]);

  // Re-check status whenever the screen is focused (user may have toggled it in iOS Settings)
  useFocusEffect(useCallback(() => { refreshStatus(); }, [refreshStatus]));

  const handleToggle = async (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEnabled(val);
    await saveLiveActivitySettings({ enabled: val, style });
    if (!val) {
      await endLiveActivity();
    } else {
      // Start immediately using cached prayer times so user sees it on lock screen
      const ok = await refreshLiveActivityIfEnabled();
      await refreshStatus();
      if (!ok) {
        const result = getLastRefreshResult();
        const nativeErr = getLastLiveActivityError();
        const detail = nativeErr || result.reason || 'unknown';
        Alert.alert(
          'تعذّر تشغيل النشاط الحي',
          `السبب: ${detail}\n\nافتح لوحة التشخيص أدناه للتفاصيل.`,
          [{ text: 'حسناً' }]
        );
        setDiagOpen(true);
      }
    }
  };

  const handleStyleChange = async (s: LiveActivityStyle) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStyle(s);
    await saveLiveActivitySettings({ enabled, style: s });
    if (enabled) {
      // Re-render the active activity with the new style
      await refreshLiveActivityIfEnabled();
    }
  };

  const STYLE_ICONS: Record<string, string> = {
    prayer_times: 'clock-outline',
    prayer_times_sunrise: 'weather-sunset-up',
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
              <Text style={[styles.toggleLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('liveActivities.enable')}
              </Text>
              <Switch
                value={enabled}
                onValueChange={handleToggle}
                trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
              />
            </View>
            <Text style={[styles.description, { color: colors.muted, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('liveActivities.description')}
            </Text>
            {status !== 'enabled' && Platform.OS === 'ios' && (
              <View style={styles.notEnabledBlock}>
                <Text style={[styles.notEnabledText, { color: '#ef5350', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {status === 'bridge_missing'
                    ? 'هذه الميزة تتطلب تحديث التطبيق من App Store. النسخة الحالية لا تحتوي على المكون الأصلي للأنشطة الحية.'
                    : t('liveActivities.notEnabled')}
                </Text>
                {status === 'system_disabled' && (
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      Linking.openSettings().catch(() => {});
                    }}
                    activeOpacity={0.8}
                    style={styles.openSettingsBtn}
                  >
                    <MaterialCommunityIcons name="cog-outline" size={18} color="#fff" />
                    <Text style={styles.openSettingsBtnLabel}>{t('liveActivities.openSettings')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Diagnostics — collapsible (DEV builds only) */}
            {Platform.OS === 'ios' && __DEV__ && (
              <View style={{ marginTop: 14 }}>
                <TouchableOpacity
                  onPress={() => { setDiagOpen(v => !v); refreshStatus(); }}
                  activeOpacity={0.7}
                  style={[styles.diagToggle, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                >
                  <MaterialCommunityIcons
                    name={diagOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.muted}
                  />
                  <Text style={[styles.diagToggleLabel, { color: colors.muted }]}>
                    تشخيص
                  </Text>
                </TouchableOpacity>
                {diagOpen && (
                  <View style={styles.diagBox}>
                    <Text style={[styles.diagLine, { color: colors.text }]}>
                      Bridge: <Text style={{ color: isLiveActivityBridgeAvailable() ? '#4ade80' : '#ef5350' }}>
                        {isLiveActivityBridgeAvailable() ? 'loaded' : 'missing'}
                      </Text>
                    </Text>
                    <Text style={[styles.diagLine, { color: colors.text }]}>
                      Status: <Text style={{ color: status === 'enabled' ? '#4ade80' : '#ef5350' }}>{status}</Text>
                    </Text>
                    <Text style={[styles.diagLine, { color: colors.text }]}>
                      Build: {Constants.expoConfig?.ios?.buildNumber ?? '?'} ({Constants.expoConfig?.version ?? '?'})
                    </Text>
                    {!!getLastLiveActivityError() && (
                      <Text style={[styles.diagLine, { color: '#ef5350' }]} numberOfLines={4}>
                        Last error: {getLastLiveActivityError()}
                      </Text>
                    )}
                    {!!lastTestResult && (
                      <Text style={[styles.diagLine, { color: colors.muted }]} numberOfLines={4}>
                        Test: {lastTestResult}
                      </Text>
                    )}
                    <TouchableOpacity
                      onPress={async () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        const ok = await startLiveActivity({
                          nextPrayerName: 'Asr',
                          nextPrayerNameAr: 'العصر',
                          nextPrayerTime: '15:30',
                          timeRemainingMinutes: 30,
                          allPrayers: [
                            { name: 'Fajr', nameAr: 'الفجر', time: '04:30', passed: true },
                            { name: 'Dhuhr', nameAr: 'الظهر', time: '12:00', passed: true },
                            { name: 'Asr', nameAr: 'العصر', time: '15:30', passed: false },
                            { name: 'Maghrib', nameAr: 'المغرب', time: '18:00', passed: false },
                            { name: 'Isha', nameAr: 'العشاء', time: '19:30', passed: false },
                          ],
                          hijriDate: '15 رمضان 1447',
                          style,
                        });
                        const err = getLastLiveActivityError();
                        setLastTestResult(ok ? 'OK' : (err ?? 'failed'));
                        await refreshStatus();
                        if (!ok) {
                          Alert.alert(
                            'فشل اختبار النشاط الحي',
                            `الخطأ من النظام:\n\n${err ?? 'سبب غير معروف'}`,
                            [{ text: 'حسناً' }]
                          );
                        } else {
                          Alert.alert(
                            'تم تشغيل النشاط الحي',
                            'تحقق الآن من شاشة القفل أو Dynamic Island.',
                            [{ text: 'حسناً' }]
                          );
                        }
                      }}
                      activeOpacity={0.8}
                      style={[styles.openSettingsBtn, { marginTop: 10 }]}
                    >
                      <MaterialCommunityIcons name="play-circle-outline" size={18} color="#fff" />
                      <Text style={styles.openSettingsBtnLabel}>اختبار النشاط الآن</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </GlassCard>

          {/* Style picker */}
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('liveActivities.styleTitle')}</Text>
          {LIVE_ACTIVITY_STYLES.map((s) => {
            const isActive = style === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => handleStyleChange(s.id)}
                activeOpacity={0.7}
                style={{ marginBottom: 8 }}
              >
                <GlassCard style={[styles.styleCard, isActive && { borderColor: '#0d8e62', borderWidth: 2 }]}>
                  <View style={[styles.styleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.styleIcon, { backgroundColor: isActive ? 'rgba(34,197,94,0.22)' : 'rgba(34, 197, 94, 0.12)' }]}>
                      <MaterialCommunityIcons
                        name={(STYLE_ICONS[s.id] || 'clock-outline') as any}
                        size={24}
                        color={isActive ? '#0d8e62' : colors.text}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.styleName, { color: isActive ? '#0d8e62' : colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                        {s.nameAr}
                      </Text>
                      <Text style={[styles.styleDesc, { color: colors.muted, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                        {s.descAr}
                      </Text>
                    </View>
                    {isActive && (
                      <MaterialCommunityIcons name="check-circle" size={22} color="#0d8e62" />
                    )}
                  </View>
                </GlassCard>
              </TouchableOpacity>
            );
          })}

          {/* Preview */}
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr', marginTop: 16 }]}>{t('liveActivities.preview')}</Text>
          <GlassCard style={styles.previewCard}>
            <View style={styles.previewContent}>
              <View style={[styles.previewHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons name="mosque" size={20} color="#0d8e62" />
                <Text style={[styles.previewAppName, { color: colors.text }]}>{t('common.appName')}</Text>
              </View>
              <Text style={[styles.previewPrayer, { color: colors.text }]}>{t('liveActivities.previewNextPrayer')}</Text>
              <Text style={[styles.previewTime, { color: '#0d8e62' }]}>{localizeNumber('02:30:15')}</Text>
              {style === 'prayer_times_sunrise' && (
                <Text style={[styles.previewExtra, { color: colors.muted }]}>{t('liveActivities.previewSunrise')}</Text>
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
                    <Text style={[styles.previewTimeVal, { color: i === 3 ? '#0d8e62' : colors.text }]}>
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

const _styles = StyleSheet.create({
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
  notEnabledBlock: {
    marginTop: 8,
    gap: 10,
  },
  notEnabledText: {
    fontSize: 13,
    fontFamily: fontRegular(),
    lineHeight: 20,
  },
  openSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d8e62',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 8,
    alignSelf: 'flex-start',
  },
  openSettingsBtnLabel: {
    color: '#fff',
    fontFamily: fontSemiBold(),
    fontSize: 14,
  },
  diagToggle: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  diagToggleLabel: {
    fontSize: 12,
    fontFamily: fontSemiBold(),
  },
  diagBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 4,
  },
  diagLine: {
    fontSize: 12,
    fontFamily: fontRegular(),
    lineHeight: 18,
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
