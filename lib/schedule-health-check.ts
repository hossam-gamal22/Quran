/**
 * Phase 8: Stale Schedule Detection & Auto-Heal
 * ─────────────────────────────────────────────
 * يكتشف لو الإشعارات اختفت من النظام بعد ما تم جدولتها (سيناريوهات شائعة):
 *
 *  1. **OEM kill**: Xiaomi/Huawei/Oppo قد تمسح alarms المجدولة بعد kill للتطبيق
 *  2. **System restore**: استعادة backup → AsyncStorage يبقى لكن alarms تختفي
 *  3. **Notification permission revoked**: المستخدم سحب الإذن من الإعدادات
 *  4. **App update**: بعض التحديثات تُلغي scheduled notifications
 *  5. **DND or Battery saver kill**: قد توقف الخدمة دون إخطار
 *  6. **Past triggers leak**: notifications تجاوزت وقتها لكن لم تُمسَح من النظام
 *
 * الحل: فحص دوري + auto-heal بدون تدخل المستخدم.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getScheduledNotificationFireMs } from './notification-trigger-time';

const HEALTH_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // كل 6 ساعات
const LAST_HEALTH_CHECK_KEY = '@last_schedule_health_check';
const HEAL_COUNT_KEY = '@schedule_heal_count'; // counter لتشخيص جودة العمل

export interface ScheduleHealthReport {
  totalScheduled: number;
  prayerCount: number;
  azkarCount: number;
  otherCount: number;
  expiredCount: number; // triggers في الماضي ما زالت في القائمة (شذوذ)
  expectedMinPrayer: number;
  expectedMinAzkar: number;
  isHealthy: boolean;
  reasons: string[]; // أسباب عدم الصحة
  needsHeal: boolean;
  healedAt?: string;
  checkedAt: string;
}

/**
 * يحلّل قائمة الإشعارات المجدولة الفعلية ويُقيّم صحتها مقارنة بالإعدادات.
 */
export async function inspectScheduleHealth(): Promise<ScheduleHealthReport> {
  const reasons: string[] = [];
  const now = Date.now();

  // 1. اقرأ الإعدادات لمعرفة المتوقّع
  let n: any = null;
  try {
    const raw = await AsyncStorage.getItem('app_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      n = parsed?.notifications;
    }
  } catch (e) {
    reasons.push('فشل قراءة الإعدادات');
  }

  if (!n?.enabled) {
    return {
      totalScheduled: 0,
      prayerCount: 0,
      azkarCount: 0,
      otherCount: 0,
      expiredCount: 0,
      expectedMinPrayer: 0,
      expectedMinAzkar: 0,
      isHealthy: true,
      reasons: ['الإشعارات معطّلة من المستخدم — لا حاجة للفحص'],
      needsHeal: false,
      checkedAt: new Date().toISOString(),
    };
  }

  // 2. تحقّق من إذن النظام
  try {
    const perms = await Notifications.getPermissionsAsync();
    if (perms.status !== 'granted') {
      reasons.push('إذن الإشعارات مسحوب من المستخدم');
      return {
        totalScheduled: 0,
        prayerCount: 0,
        azkarCount: 0,
        otherCount: 0,
        expiredCount: 0,
        expectedMinPrayer: 5,
        expectedMinAzkar: 0,
        isHealthy: false,
        reasons,
        needsHeal: false, // الـ heal مش هيفيد لو الإذن مفقود
        checkedAt: new Date().toISOString(),
      };
    }
  } catch {}

  // 3. اقرأ المجدول فعلياً من النظام
  let scheduled: Notifications.NotificationRequest[] = [];
  try {
    scheduled = await Notifications.getAllScheduledNotificationsAsync();
  } catch (e) {
    reasons.push('تعذّر قراءة قائمة المجدول من النظام');
  }

  // 4. صنّف
  const prayerCount = scheduled.filter((s) => s.identifier.startsWith('prayer_')).length;
  const azkarCount = scheduled.filter(
    (s) =>
      s.identifier.startsWith('wird_') ||
      s.identifier.startsWith('azkar_'),
  ).length;
  const otherCount = scheduled.length - prayerCount - azkarCount;

  // 5. فحص triggers في الماضي
  let expiredCount = 0;
  for (const s of scheduled) {
    const trig: any = s.trigger;
    const dateMs = getScheduledNotificationFireMs(trig);
    if (typeof dateMs === 'number' && dateMs < now) expiredCount++;
  }

  // 6. توقّع الحد الأدنى
  const expectedMinPrayer = n.prayerTimes ? 5 : 0;
  const expectedMinAzkar =
    (n.morningAzkar ? 1 : 0) +
    (n.eveningAzkar ? 1 : 0) +
    (n.sleepAzkar ? 1 : 0) +
    (n.wakeupAzkar ? 1 : 0);

  if (n.prayerTimes && prayerCount === 0) reasons.push('لا توجد إشعارات صلاة مجدولة رغم تفعيلها');
  if (expectedMinAzkar > 0 && azkarCount === 0) reasons.push('لا توجد إشعارات أذكار مجدولة رغم تفعيلها');
  if (expiredCount > 5) reasons.push(`${expiredCount} إشعار متجاوز وقته (تسرّب)`);

  const isHealthy = reasons.length === 0;
  const needsHeal =
    !isHealthy &&
    (prayerCount === 0 || azkarCount === 0 || expiredCount > 5);

  return {
    totalScheduled: scheduled.length,
    prayerCount,
    azkarCount,
    otherCount,
    expiredCount,
    expectedMinPrayer,
    expectedMinAzkar,
    isHealthy,
    reasons,
    needsHeal,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * شغّل الفحص + auto-heal لو محتاج، مع throttle 6 ساعات.
 * يُستدعى من app/_layout.tsx عند foreground resume وعند cold-start.
 */
export async function runScheduleHealthCheck(opts?: { force?: boolean }): Promise<ScheduleHealthReport | null> {
  try {
    if (!opts?.force) {
      const last = await AsyncStorage.getItem(LAST_HEALTH_CHECK_KEY);
      const lastTs = last ? parseInt(last, 10) : 0;
      if (Date.now() - lastTs < HEALTH_CHECK_INTERVAL_MS) {
        return null; // throttled
      }
    }

    const report = await inspectScheduleHealth();
    await AsyncStorage.setItem(LAST_HEALTH_CHECK_KEY, String(Date.now()));

    if (__DEV__) {
      console.log(
        `🩺 [schedule-health] total=${report.totalScheduled} prayer=${report.prayerCount} azkar=${report.azkarCount} expired=${report.expiredCount} healthy=${report.isHealthy}`,
      );
    }

    if (report.needsHeal) {
      console.warn(`🔧 [schedule-health] heal triggered: ${report.reasons.join(' | ')}`);
      // Lazy import لتجنّب circular dep
      const { forceRescheduleAllFromStorage } = await import('./notifications-manager');
      try {
        await forceRescheduleAllFromStorage();

        // عدّاد heals لتشخيص — لو زاد فالنظام عنده مشكلة مزمنة
        const c = await AsyncStorage.getItem(HEAL_COUNT_KEY);
        const next = (c ? parseInt(c, 10) : 0) + 1;
        await AsyncStorage.setItem(HEAL_COUNT_KEY, String(next));

        report.healedAt = new Date().toISOString();
        if (__DEV__) console.log(`✅ [schedule-health] heal #${next} succeeded`);
      } catch (healErr) {
        console.error('❌ [schedule-health] heal فشل:', healErr);
      }

      // Cleanup expired triggers (Android فقط — iOS يمسحها تلقائياً)
      if (Platform.OS === 'android' && report.expiredCount > 0) {
        await cleanupExpiredNotifications();
      }
    }

    return report;
  } catch (e) {
    console.warn('[schedule-health] فشل الفحص:', e);
    return null;
  }
}

/**
 * يمسح الإشعارات اللي trigger date تبعها في الماضي (تسرّبت في القائمة).
 */
async function cleanupExpiredNotifications(): Promise<number> {
  let cleaned = 0;
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    const now = Date.now();
    for (const s of all) {
      const trig: any = s.trigger;
      const dateMs = trig?.value ?? trig?.date ?? trig?.timestamp ?? null;
      if (typeof dateMs === 'number' && dateMs < now) {
        try {
          await Notifications.cancelScheduledNotificationAsync(s.identifier);
          cleaned++;
        } catch {}
      }
    }
    if (cleaned > 0) console.log(`🧹 [schedule-health] cleaned ${cleaned} expired notifications`);
  } catch (e) {
    console.warn('[schedule-health] cleanup فشل:', e);
  }
  return cleaned;
}

/**
 * للأدمن/التشخيص: عدد مرات الـ heal منذ التثبيت.
 */
export async function getHealCount(): Promise<number> {
  try {
    const c = await AsyncStorage.getItem(HEAL_COUNT_KEY);
    return c ? parseInt(c, 10) || 0 : 0;
  } catch {
    return 0;
  }
}
