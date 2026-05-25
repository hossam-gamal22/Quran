// app/settings/notifications-health.tsx
// Phase 10: شاشة فحص شامل لصحة منظومة الإشعارات

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';
import { TranslatedText } from '@/components/ui/TranslatedText';
import { runNotificationSelfTest, type SelfTestReport, type SelfTestStatus } from '@/lib/notification-self-test';
import { runScheduleHealthCheck } from '@/lib/schedule-health-check';
import { forceRescheduleAllFromStorage } from '@/lib/notifications-manager';
import { getTelemetrySummary } from '@/lib/notification-telemetry';
import { uiDateLocale, uiText } from '@/lib/ui-text';

const STATUS_COLORS: Record<SelfTestStatus, string> = {
  pass: '#0d8e62',
  warning: '#c07b10',
  fail: '#c0392b',
  skip: '#7a8694',
};

const STATUS_ICONS: Record<SelfTestStatus, keyof typeof MaterialCommunityIcons.glyphMap> = {
  pass: 'check-circle',
  warning: 'alert-circle',
  fail: 'close-circle',
  skip: 'minus-circle',
};

function statusLabel(status: SelfTestStatus): string {
  const labels: Record<SelfTestStatus, string> = {
    pass: uiText({ ar: 'سليم', en: 'Healthy' }),
    warning: uiText({ ar: 'تحذير', en: 'Warning' }),
    fail: uiText({ ar: 'فشل', en: 'Failed' }),
    skip: uiText({ ar: 'متجاهَل', en: 'Skipped' }),
  };
  return labels[status];
}

export default function NotificationsHealthScreen() {
  const colors = useColors();
  const isRTL = useIsRTL();
  const [report, setReport] = useState<SelfTestReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [healing, setHealing] = useState(false);
  const [telemetry, setTelemetry] = useState<Awaited<ReturnType<typeof getTelemetrySummary>> | null>(null);

  const runTest = useCallback(async () => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const [r, t] = await Promise.all([
        runNotificationSelfTest(),
        getTelemetrySummary(),
      ]);
      setReport(r);
      setTelemetry(t);
      // Haptic حسب النتيجة
      if (r.overallStatus === 'pass') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else if (r.overallStatus === 'fail') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      }
    } catch (e) {
      console.warn('Self-test error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const heal = useCallback(async () => {
    setHealing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      await forceRescheduleAllFromStorage();
      await runScheduleHealthCheck({ force: true });
      // أعد تشغيل الفحص بعد الـ heal
      await runTest();
    } catch (e) {
      console.warn('Heal error:', e);
    } finally {
      setHealing(false);
    }
  }, [runTest]);

  // Run on mount
  useEffect(() => {
    runTest();
  }, [runTest]);

  const headerColor =
    report?.overallStatus === 'pass'
      ? STATUS_COLORS.pass
      : report?.overallStatus === 'warning'
      ? STATUS_COLORS.warning
      : report?.overallStatus === 'fail'
      ? STATUS_COLORS.fail
      : colors.textLight;

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <StatusBar style="auto" />
        <UniversalHeader title={uiText({ ar: 'صحة الإشعارات', en: 'Notification Health' })} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={runTest} tintColor={colors.primary} />}
        >
          {/* Overall status hero */}
          {report && (
            <Animated.View entering={FadeIn.duration(300)} style={[styles.hero, { backgroundColor: colors.card }]}>
              <View style={[styles.heroIconWrap, { backgroundColor: headerColor + '20' }]}>
                <MaterialCommunityIcons
                  name={report.overallStatus === 'pass' ? 'shield-check' : report.overallStatus === 'fail' ? 'shield-alert' : 'shield-half-full'}
                  size={48}
                  color={headerColor}
                />
              </View>
              <Text style={[styles.heroTitle, { color: colors.text }]}>
                {report.overallStatus === 'pass'
                  ? uiText({ ar: 'النظام يعمل بشكل سليم', en: 'System is healthy' })
                  : report.overallStatus === 'warning'
                  ? uiText({ ar: 'هناك تحذيرات', en: 'Warnings found' })
                  : uiText({ ar: 'يحتاج إصلاح', en: 'Needs repair' })}
              </Text>
              <View style={styles.heroStats}>
                <Text style={[styles.heroStat, { color: STATUS_COLORS.pass }]}>{report.passCount} ✓</Text>
                <Text style={[styles.heroStat, { color: STATUS_COLORS.warning }]}>{report.warnCount} ⚠</Text>
                <Text style={[styles.heroStat, { color: STATUS_COLORS.fail }]}>{report.failCount} ✗</Text>
              </View>
            </Animated.View>
          )}

          {loading && !report && (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loaderText, { color: colors.textLight }]}>
                {uiText({ ar: 'يتم فحص النظام...', en: 'Checking the system...' })}
              </Text>
            </View>
          )}

          {/* Action buttons */}
          {report && (
            <View style={[styles.actions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={runTest}
                disabled={loading}
              >
                <MaterialCommunityIcons name="refresh" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>{uiText({ ar: 'إعادة الفحص', en: 'Recheck' })}</Text>
              </TouchableOpacity>

              {(report.failCount > 0 || report.warnCount > 0) && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: STATUS_COLORS.warning }]}
                  onPress={heal}
                  disabled={healing}
                >
                  {healing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <MaterialCommunityIcons name="auto-fix" size={18} color="#fff" />
                  )}
                  <Text style={styles.actionBtnText}>{uiText({ ar: 'إصلاح فوري', en: 'Repair now' })}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Steps list */}
          {report?.steps.map((step, idx) => (
            <Animated.View
              key={step.id}
              entering={FadeInDown.delay(idx * 60).duration(280)}
              style={[styles.stepCard, { backgroundColor: colors.card }]}
            >
              <View style={[styles.stepRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons
                  name={STATUS_ICONS[step.status]}
                  size={26}
                  color={STATUS_COLORS[step.status]}
                />
                <View style={[styles.stepInfo, { marginHorizontal: 12 }]}>
                  <View style={[styles.stepHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TranslatedText from="ar" style={[styles.stepLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                      {step.label}
                    </TranslatedText>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[step.status] + '20' }]}>
                      <Text style={[styles.statusBadgeText, { color: STATUS_COLORS[step.status] }]}>
                        {statusLabel(step.status)}
                      </Text>
                    </View>
                  </View>
                  <TranslatedText from="ar" style={[styles.stepDetails, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
                    {step.details}
                  </TranslatedText>
                  {step.fixHint && (
                    <View style={[styles.hintBox, { backgroundColor: STATUS_COLORS[step.status] + '12' }]}>
                      <MaterialCommunityIcons name="lightbulb-outline" size={14} color={STATUS_COLORS[step.status]} />
                      <TranslatedText from="ar" style={[styles.hintText, { color: STATUS_COLORS[step.status], textAlign: isRTL ? 'right' : 'left' }]}>
                        {step.fixHint}
                      </TranslatedText>
                    </View>
                  )}
                </View>
              </View>
            </Animated.View>
          ))}

          {/* Telemetry summary */}
          {telemetry && telemetry.counters.scheduled > 0 && (
            <Animated.View
              entering={FadeInDown.delay(report ? report.steps.length * 60 : 0).duration(280)}
              style={[styles.telemetryCard, { backgroundColor: colors.card }]}
            >
              <Text style={[styles.telemetryTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                {uiText({ ar: 'إحصائيات آخر 7 أيام', en: 'Last 7 days stats' })}
              </Text>
              <View style={[styles.telemetryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TelStat label={uiText({ ar: 'مجدولة', en: 'Scheduled' })} value={telemetry.counters.scheduled} color={colors.primary} />
                <TelStat label={uiText({ ar: 'وصلت', en: 'Received' })} value={telemetry.counters.received} color={STATUS_COLORS.pass} />
                <TelStat label={uiText({ ar: 'فُتحت', en: 'Opened' })} value={telemetry.counters.opened} color={STATUS_COLORS.warning} />
              </View>
              {Object.keys(telemetry.deliveryRates).length > 0 && (
                <View style={styles.ratesList}>
                  {Object.entries(telemetry.deliveryRates).slice(0, 5).map(([cat, rate]) => (
                    <View key={cat} style={[styles.rateRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[styles.rateLabel, { color: colors.textLight }]}>{cat}</Text>
                      <Text style={[styles.rateValue, { color: rate.rate >= 0.7 ? STATUS_COLORS.pass : rate.rate >= 0.4 ? STATUS_COLORS.warning : STATUS_COLORS.fail }]}>
                        {Math.round(rate.rate * 100)}% ({rate.received}/{rate.scheduled})
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>
          )}

          {report && (
            <Text style={[styles.timestamp, { color: colors.textLight }]}>
              {uiText({ ar: 'آخر فحص', en: 'Last check' })}: {new Date(report.ranAt).toLocaleString(uiDateLocale())}
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

function TelStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.telStat}>
      <Text style={[styles.telStatValue, { color }]}>{value}</Text>
      <Text style={styles.telStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  hero: {
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: { fontFamily: fontBold(), fontSize: 18, marginBottom: 12 },
  heroStats: { flexDirection: 'row', gap: 24 },
  heroStat: { fontFamily: fontSemiBold(), fontSize: 15 },
  loaderWrap: { padding: 60, alignItems: 'center' },
  loaderText: { fontFamily: fontMedium(), fontSize: 14, marginTop: 12 },
  actions: { gap: 10, marginBottom: 16 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: { fontFamily: fontSemiBold(), fontSize: 14, color: '#fff' },
  stepCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  stepRow: { alignItems: 'flex-start' },
  stepInfo: { flex: 1 },
  stepHeader: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  stepLabel: { fontFamily: fontSemiBold(), fontSize: 15, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusBadgeText: { fontFamily: fontMedium(), fontSize: 11 },
  stepDetails: { fontFamily: fontRegular(), fontSize: 13, lineHeight: 19 },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  hintText: { fontFamily: fontMedium(), fontSize: 12, flex: 1 },
  telemetryCard: {
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
  },
  telemetryTitle: { fontFamily: fontBold(), fontSize: 15, marginBottom: 12 },
  telemetryRow: { justifyContent: 'space-around', marginBottom: 12 },
  telStat: { alignItems: 'center' },
  telStatValue: { fontFamily: fontBold(), fontSize: 22 },
  telStatLabel: { fontFamily: fontMedium(), fontSize: 12, color: '#7a8694', marginTop: 2 },
  ratesList: { gap: 6 },
  rateRow: { justifyContent: 'space-between', paddingVertical: 4 },
  rateLabel: { fontFamily: fontMedium(), fontSize: 12 },
  rateValue: { fontFamily: fontSemiBold(), fontSize: 12 },
  timestamp: { fontFamily: fontRegular(), fontSize: 11, textAlign: 'center', marginTop: 16 },
});
