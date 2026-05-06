/**
 * Phase 10: End-to-End Notification Self-Test
 * ───────────────────────────────────────────
 * يفحص كل المنظومة في 8 خطوات ويُرجع نتائج مفصّلة لعرضها في Health Dashboard.
 * كل خطوة مستقلة → فشل واحدة لا يمنع الباقي.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { checkAllPermissions } from './permission-recovery';
import { inspectScheduleHealth } from './schedule-health-check';
import { getTelemetrySummary } from './notification-telemetry';
import { auditIosNotificationBudget } from './ios-notification-budget';
import { getPrayerLocation } from './storage';

export type SelfTestStatus = 'pass' | 'warning' | 'fail' | 'skip';

export interface SelfTestStep {
  id: string;
  label: string;
  status: SelfTestStatus;
  details: string;
  fixHint?: string;
}

export interface SelfTestReport {
  ranAt: string;
  overallStatus: SelfTestStatus;
  steps: SelfTestStep[];
  passCount: number;
  warnCount: number;
  failCount: number;
}

/**
 * يشغّل كل الفحوصات بالتوازي قدر الإمكان.
 */
export async function runNotificationSelfTest(): Promise<SelfTestReport> {
  const steps: SelfTestStep[] = [];

  // ─── 1. إذن الإشعارات ─────────────────────
  try {
    const perms = await checkAllPermissions();
    if (perms.notifications === 'granted') {
      steps.push({
        id: 'permission',
        label: 'إذن الإشعارات',
        status: 'pass',
        details: 'مفعّل من النظام',
      });
    } else {
      steps.push({
        id: 'permission',
        label: 'إذن الإشعارات',
        status: 'fail',
        details: `الحالة: ${perms.notifications}`,
        fixHint: 'افتح إعدادات النظام وفعّل الإشعارات للتطبيق',
      });
    }
  } catch (e: any) {
    steps.push({
      id: 'permission',
      label: 'إذن الإشعارات',
      status: 'fail',
      details: `خطأ: ${e?.message || e}`,
    });
  }

  // ─── 2. الموقع ─────────────────────────────
  try {
    const loc = await getPrayerLocation();
    if (loc?.latitude && loc?.longitude) {
      steps.push({
        id: 'location',
        label: 'الموقع لحساب أوقات الصلاة',
        status: 'pass',
        details: `${loc.city || 'محدد'} (${loc.latitude.toFixed(2)}, ${loc.longitude.toFixed(2)})`,
      });
    } else {
      steps.push({
        id: 'location',
        label: 'الموقع لحساب أوقات الصلاة',
        status: 'warning',
        details: 'غير محدد — سيُستخدم fallback لمكة',
        fixHint: 'افتح صفحة الصلاة واسمح بالموقع',
      });
    }
  } catch (e: any) {
    steps.push({
      id: 'location',
      label: 'الموقع لحساب أوقات الصلاة',
      status: 'warning',
      details: `${e?.message || e}`,
    });
  }

  // ─── 3. أذونات Android المتقدمة (Exact Alarm + Battery) ─────────
  if (Platform.OS === 'android') {
    try {
      const perms = await checkAllPermissions();
      const issues: string[] = [];
      if (perms.exactAlarm === 'denied') issues.push('Exact Alarm');
      if (perms.batteryOptimization === 'optimized') issues.push('استثناء البطارية');
      if (perms.oemAutoStart === 'aggressive') issues.push('Auto-Start (OEM)');

      if (issues.length === 0) {
        steps.push({
          id: 'android_perms',
          label: 'أذونات Android المتقدمة',
          status: 'pass',
          details: 'كل الأذونات المهمة مفعّلة',
        });
      } else {
        steps.push({
          id: 'android_perms',
          label: 'أذونات Android المتقدمة',
          status: 'warning',
          details: `تحقق من: ${issues.join('، ')}`,
          fixHint: 'افتح إعدادات النظام وتأكد من تفعيل هذه الأذونات',
        });
      }
    } catch {
      steps.push({
        id: 'android_perms',
        label: 'أذونات Android المتقدمة',
        status: 'skip',
        details: 'تعذّر الفحص',
      });
    }
  } else {
    // iOS: Background Refresh
    try {
      const perms = await checkAllPermissions();
      if (perms.backgroundRefresh === 'granted') {
        steps.push({
          id: 'ios_bg',
          label: 'Background App Refresh',
          status: 'pass',
          details: 'مفعّل',
        });
      } else {
        steps.push({
          id: 'ios_bg',
          label: 'Background App Refresh',
          status: 'warning',
          details: 'غير مفعّل — قد يقلل دقة المواعيد',
          fixHint: 'الإعدادات → عام → تحديث التطبيقات في الخلفية',
        });
      }
    } catch {}
  }

  // ─── 4. صحة الجدول الفعلي ─────────────────
  try {
    const health = await inspectScheduleHealth();
    if (health.isHealthy) {
      steps.push({
        id: 'schedule',
        label: 'الإشعارات المجدولة',
        status: 'pass',
        details: `${health.totalScheduled} إشعار (${health.prayerCount} صلاة، ${health.azkarCount} أذكار)`,
      });
    } else {
      steps.push({
        id: 'schedule',
        label: 'الإشعارات المجدولة',
        status: health.needsHeal ? 'fail' : 'warning',
        details: health.reasons.join(' | '),
        fixHint: health.needsHeal ? 'اضغط "إعادة الجدولة الفورية"' : undefined,
      });
    }
  } catch (e: any) {
    steps.push({
      id: 'schedule',
      label: 'الإشعارات المجدولة',
      status: 'fail',
      details: `${e?.message || e}`,
    });
  }

  // ─── 5. iOS Budget (64 limit) ──────────────
  if (Platform.OS === 'ios') {
    try {
      const audit = await auditIosNotificationBudget();
      const status: SelfTestStatus =
        audit.status === 'ok' ? 'pass' : audit.status === 'warning' ? 'warning' : 'fail';
      steps.push({
        id: 'ios_budget',
        label: 'حصة iOS (64 إشعار كحد أقصى)',
        status,
        details: `${audit.scheduled}/${audit.limit} مستخدمة (${audit.remaining} متبقية)`,
        fixHint: status === 'fail' ? 'قلّل عدد فئات الإشعارات أو الأيام' : undefined,
      });
    } catch {
      steps.push({
        id: 'ios_budget',
        label: 'حصة iOS',
        status: 'skip',
        details: 'تعذّر الفحص',
      });
    }
  }

  // ─── 6. معدل وصول الإشعارات (Telemetry) ────
  try {
    const summary = await getTelemetrySummary();
    if (summary.counters.scheduled === 0) {
      steps.push({
        id: 'telemetry',
        label: 'معدل وصول الإشعارات',
        status: 'skip',
        details: 'لا توجد بيانات بعد (يحتاج وقت للتجميع)',
      });
    } else {
      const status: SelfTestStatus =
        summary.health === 'good' ? 'pass' : summary.health === 'warning' ? 'warning' : 'fail';
      const prayerRate = summary.deliveryRates['prayer'];
      const detail = prayerRate
        ? `معدل وصول الصلاة: ${Math.round(prayerRate.rate * 100)}% (${prayerRate.received}/${prayerRate.scheduled})`
        : `${summary.counters.received} وصلت من ${summary.counters.scheduled} مجدولة`;
      steps.push({
        id: 'telemetry',
        label: 'معدل وصول الإشعارات',
        status,
        details: detail,
        fixHint: summary.warnings[0],
      });
    }
  } catch (e: any) {
    steps.push({
      id: 'telemetry',
      label: 'معدل وصول الإشعارات',
      status: 'skip',
      details: `${e?.message || e}`,
    });
  }

  // ─── 7. Firebase user (للـ FCM fallback) ───
  try {
    const uid = await AsyncStorage.getItem('@user_id');
    if (uid) {
      steps.push({
        id: 'fcm',
        label: 'تسجيل FCM (نسخة احتياطية)',
        status: 'pass',
        details: `مُسجَّل (uid: ${uid.slice(0, 8)}…)`,
      });
    } else {
      steps.push({
        id: 'fcm',
        label: 'تسجيل FCM',
        status: 'warning',
        details: 'لم يتم التسجيل بعد',
      });
    }
  } catch {
    steps.push({
      id: 'fcm',
      label: 'تسجيل FCM',
      status: 'skip',
      details: 'تعذّر الفحص',
    });
  }

  // ─── 8. Test notification (instant) ────────
  try {
    const id = `selftest_${Date.now()}`;
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title: '🩺 اختبار صحة الإشعارات',
        body: 'لو وصلتك هذه الرسالة، النظام يعمل بشكل سليم ✓',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
      },
    });
    steps.push({
      id: 'test_send',
      label: 'إرسال إشعار تجريبي',
      status: 'pass',
      details: 'سيصلك خلال ثانيتين — لو لم يصل، تحقق من الأذونات',
    });
  } catch (e: any) {
    steps.push({
      id: 'test_send',
      label: 'إرسال إشعار تجريبي',
      status: 'fail',
      details: `فشل: ${e?.message || e}`,
    });
  }

  const passCount = steps.filter((s) => s.status === 'pass').length;
  const warnCount = steps.filter((s) => s.status === 'warning').length;
  const failCount = steps.filter((s) => s.status === 'fail').length;

  const overallStatus: SelfTestStatus =
    failCount > 0 ? 'fail' : warnCount > 0 ? 'warning' : 'pass';

  return {
    ranAt: new Date().toISOString(),
    overallStatus,
    steps,
    passCount,
    warnCount,
    failCount,
  };
}
