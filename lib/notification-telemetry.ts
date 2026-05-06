/**
 * Phase 9: Notification Delivery Telemetry
 * ────────────────────────────────────────
 * يتتبع فعلياً وصول الإشعارات وتفاعل المستخدم معها مقارنةً بما تم جدولته.
 * البيانات تُحفظ محلياً (rolling buffer 500 حدث) ثم تُرفع كل 24س لـ Firestore.
 *
 * يُمكّن:
 *   - حساب delivery rate الفعلي (received / scheduled)
 *   - كشف صلوات لا تصل أبداً عند مستخدمين معينين (OEM kill متأخر)
 *   - مقارنة iOS vs Android في نفس الإصدار
 *   - تحديد أكثر فئات الإشعارات تفاعلاً
 *
 * بدون أي PII — فقط: id، type، platform، timestamp، action.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const EVENTS_KEY = '@notif_telemetry_events';
const COUNTERS_KEY = '@notif_telemetry_counters';
const LAST_UPLOAD_KEY = '@notif_telemetry_last_upload';
const MAX_EVENTS = 500;
const UPLOAD_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 ساعة

export type TelemetryEventType =
  | 'scheduled'   // الإشعار تم جدولته
  | 'received'    // النظام سلّم الإشعار للتطبيق (foreground أو heads-up)
  | 'opened'     // المستخدم ضغط على body الإشعار
  | 'action'     // المستخدم ضغط زر action (مثل "نعم صليت")
  | 'dismissed';  // المستخدم سحب الإشعار بدون تفاعل (Android فقط بشكل موثوق)

export interface TelemetryEvent {
  id: string;            // notification identifier
  type: TelemetryEventType;
  category?: string;     // 'prayer' | 'azkar' | 'verse' | ...
  prayer?: string;       // 'fajr' | 'dhuhr' | ... (لو كان نوع صلاة)
  action?: string;       // 'prayed' | 'will_pray' | ...
  ts: number;            // Date.now()
  platform: 'ios' | 'android' | 'web';
}

export interface TelemetryCounters {
  scheduled: number;
  received: number;
  opened: number;
  action: number;
  dismissed: number;
  byCategory: Record<string, { scheduled: number; received: number; opened: number }>;
  // delivery rate حسب نوع الفئة (last 7 days)
  windowStartTs: number;
}

function inferCategory(id: string): string {
  if (!id) return 'other';
  if (id.startsWith('prayer_')) return 'prayer';
  if (id.startsWith('did_you_pray_')) return 'did_you_pray';
  if (id.startsWith('wird_morning')) return 'azkar_morning';
  if (id.startsWith('wird_evening')) return 'azkar_evening';
  if (id.startsWith('wird_sleep')) return 'azkar_sleep';
  if (id.startsWith('wird_wakeup')) return 'azkar_wakeup';
  if (id.startsWith('wird_')) return 'azkar';
  if (id.startsWith('verse') || id.startsWith('daily_verse')) return 'verse';
  if (id.startsWith('salawat')) return 'salawat';
  if (id.startsWith('tasbih')) return 'tasbih';
  if (id.startsWith('istighfar')) return 'istighfar';
  if (id.startsWith('kahf')) return 'kahf';
  if (id.startsWith('quran_reading')) return 'quran';
  if (id.startsWith('worship')) return 'worship';
  if (id.startsWith('custom')) return 'custom';
  return 'other';
}

async function loadEvents(): Promise<TelemetryEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveEvents(events: TelemetryEvent[]): Promise<void> {
  try {
    // احتفظ بآخر MAX_EVENTS فقط
    const trimmed = events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events;
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('[telemetry] saveEvents failed:', e);
  }
}

async function loadCounters(): Promise<TelemetryCounters> {
  try {
    const raw = await AsyncStorage.getItem(COUNTERS_KEY);
    if (!raw) return emptyCounters();
    const parsed = JSON.parse(raw);
    return { ...emptyCounters(), ...parsed };
  } catch {
    return emptyCounters();
  }
}

function emptyCounters(): TelemetryCounters {
  return {
    scheduled: 0,
    received: 0,
    opened: 0,
    action: 0,
    dismissed: 0,
    byCategory: {},
    windowStartTs: Date.now(),
  };
}

async function saveCounters(c: TelemetryCounters): Promise<void> {
  try {
    await AsyncStorage.setItem(COUNTERS_KEY, JSON.stringify(c));
  } catch (e) {
    console.warn('[telemetry] saveCounters failed:', e);
  }
}

/**
 * ينقُص للحفاظ على نافذة 7 أيام فقط (إعادة تعيين دورية).
 */
async function rotateCountersIfNeeded(c: TelemetryCounters): Promise<TelemetryCounters> {
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - c.windowStartTs > SEVEN_DAYS) {
    const fresh = emptyCounters();
    await saveCounters(fresh);
    return fresh;
  }
  return c;
}

/**
 * نقطة الدخول الرئيسية — سجّل حدث.
 * يُستدعى من listeners (received/opened/action) أو من scheduler (scheduled).
 */
export async function recordTelemetryEvent(
  type: TelemetryEventType,
  id: string,
  meta?: { category?: string; prayer?: string; action?: string },
): Promise<void> {
  try {
    const category = meta?.category || inferCategory(id);
    const event: TelemetryEvent = {
      id,
      type,
      category,
      prayer: meta?.prayer,
      action: meta?.action,
      ts: Date.now(),
      platform: Platform.OS as 'ios' | 'android' | 'web',
    };

    // أحداث rolling buffer
    const events = await loadEvents();
    events.push(event);
    await saveEvents(events);

    // عدّادات (لتقارير أسرع)
    let counters = await loadCounters();
    counters = await rotateCountersIfNeeded(counters);
    counters[type] = (counters[type] || 0) + 1;
    if (!counters.byCategory[category]) {
      counters.byCategory[category] = { scheduled: 0, received: 0, opened: 0 };
    }
    if (type === 'scheduled') counters.byCategory[category].scheduled++;
    if (type === 'received') counters.byCategory[category].received++;
    if (type === 'opened') counters.byCategory[category].opened++;
    await saveCounters(counters);
  } catch (e) {
    if (__DEV__) console.warn('[telemetry] recordEvent failed:', e);
  }
}

/**
 * احسب delivery rate لكل فئة على مدى نافذة الـ7 أيام.
 */
export async function computeDeliveryRates(): Promise<Record<string, { rate: number; scheduled: number; received: number }>> {
  const c = await loadCounters();
  const out: Record<string, { rate: number; scheduled: number; received: number }> = {};
  for (const [cat, stats] of Object.entries(c.byCategory)) {
    const rate = stats.scheduled > 0 ? Math.min(1, stats.received / stats.scheduled) : 0;
    out[cat] = {
      rate: Math.round(rate * 1000) / 1000, // 3 decimals
      scheduled: stats.scheduled,
      received: stats.received,
    };
  }
  return out;
}

/**
 * تقرير شامل للعرض في dashboard التشخيصي.
 */
export async function getTelemetrySummary(): Promise<{
  counters: TelemetryCounters;
  deliveryRates: Record<string, { rate: number; scheduled: number; received: number }>;
  recentEvents: TelemetryEvent[];
  health: 'good' | 'warning' | 'critical';
  warnings: string[];
}> {
  const counters = await loadCounters();
  const deliveryRates = await computeDeliveryRates();
  const events = await loadEvents();
  const recentEvents = events.slice(-50).reverse();

  const warnings: string[] = [];
  // فحوصات ذكية:
  // - لو الصلاة scheduled كثير لكن received نسبة منخفضة → OEM kill
  const prayerStats = deliveryRates['prayer'];
  if (prayerStats && prayerStats.scheduled >= 5 && prayerStats.rate < 0.5) {
    warnings.push(`معدل وصول الصلاة منخفض: ${Math.round(prayerStats.rate * 100)}%`);
  }
  // - لو received بدون أي opened → الإشعارات تظهر لكن المستخدم لا يتفاعل
  if (counters.received >= 20 && counters.opened === 0) {
    warnings.push('20+ إشعار وصلت بدون أي تفاعل');
  }

  const health: 'good' | 'warning' | 'critical' =
    warnings.length === 0 ? 'good' : warnings.length >= 2 ? 'critical' : 'warning';

  return { counters, deliveryRates, recentEvents, health, warnings };
}

/**
 * ارفع التقرير لـ Firestore (كل 24 ساعة).
 * بدون PII — فقط counters + delivery rates + platform.
 */
export async function maybeUploadTelemetry(): Promise<boolean> {
  try {
    const last = await AsyncStorage.getItem(LAST_UPLOAD_KEY);
    const lastTs = last ? parseInt(last, 10) : 0;
    if (Date.now() - lastTs < UPLOAD_INTERVAL_MS) return false; // throttled

    const summary = await getTelemetrySummary();
    if (summary.counters.scheduled === 0 && summary.counters.received === 0) return false; // nothing to report

    const uid = await AsyncStorage.getItem('@user_id');
    if (!uid) return false;

    // Lazy imports عشان نتجنب cold-start cost
    const { getFirestore, doc, setDoc } = await import('firebase/firestore');
    const { getApp } = await import('firebase/app');
    const db = getFirestore(getApp());

    await setDoc(
      doc(db, 'notificationTelemetry', uid),
      {
        uid,
        platform: Platform.OS,
        counters: {
          scheduled: summary.counters.scheduled,
          received: summary.counters.received,
          opened: summary.counters.opened,
          action: summary.counters.action,
          dismissed: summary.counters.dismissed,
        },
        deliveryRates: summary.deliveryRates,
        health: summary.health,
        warnings: summary.warnings,
        windowStartTs: summary.counters.windowStartTs,
        uploadedAt: Date.now(),
      },
      { merge: true },
    );

    await AsyncStorage.setItem(LAST_UPLOAD_KEY, String(Date.now()));
    if (__DEV__) console.log('📤 [telemetry] رُفع التقرير لـ Firestore');
    return true;
  } catch (e) {
    if (__DEV__) console.warn('[telemetry] upload failed:', e);
    return false;
  }
}

/**
 * مسح كل بيانات التتبع — للأدوات التشخيصية أو إعادة الضبط.
 */
export async function clearTelemetry(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([EVENTS_KEY, COUNTERS_KEY, LAST_UPLOAD_KEY]);
  } catch {}
}
