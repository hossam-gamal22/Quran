/**
 * iOS Notification Budget Auditor (Phase 5)
 *
 * iOS فيها حد صارم: 64 إشعار مجدول لكل تطبيق.
 * أي إشعار جديد بعد الحد يُرفض **صامتاً** بدون أي خطأ.
 *
 * هذا الموديول يفحص الحد الفعلي بعد كل عملية جدولة ويسجّل تحذير
 * لو اقتربنا من الحد. كذلك يوفر API لعرض الحالة في صفحة الإعدادات.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const IOS_NOTIFICATION_LIMIT = 64;
const SAFETY_MARGIN = 8; // اعتبر >= 56 إشعار "خطر"
const STORAGE_KEY = '@ios_budget_audit';

export interface IosBudgetAudit {
  scheduled: number;
  limit: number;
  remaining: number;
  status: 'ok' | 'warning' | 'critical';
  byCategory: Record<string, number>;
  auditedAt: string; // ISO
}

/**
 * يفحص العدد الفعلي للإشعارات المجدولة على iOS ويرجع تقرير.
 * Android لا يوجد فيها حد، لذا يرجع status='ok'.
 */
export async function auditIosNotificationBudget(): Promise<IosBudgetAudit> {
  const result: IosBudgetAudit = {
    scheduled: 0,
    limit: IOS_NOTIFICATION_LIMIT,
    remaining: IOS_NOTIFICATION_LIMIT,
    status: 'ok',
    byCategory: {},
    auditedAt: new Date().toISOString(),
  };

  if (Platform.OS !== 'ios') {
    return result;
  }

  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    result.scheduled = all.length;
    result.remaining = Math.max(0, IOS_NOTIFICATION_LIMIT - all.length);

    // تصنيف حسب identifier prefix
    for (const n of all) {
      const id = n.identifier || '';
      const category = inferCategory(id);
      result.byCategory[category] = (result.byCategory[category] || 0) + 1;
    }

    if (all.length >= IOS_NOTIFICATION_LIMIT) {
      result.status = 'critical';
      console.error(
        `🚨 [iOS Budget] تجاوزنا حد iOS! ${all.length}/${IOS_NOTIFICATION_LIMIT} — إشعارات جديدة لن تُجدول`,
      );
    } else if (all.length >= IOS_NOTIFICATION_LIMIT - SAFETY_MARGIN) {
      result.status = 'warning';
      console.warn(
        `⚠️ [iOS Budget] اقتربنا من الحد: ${all.length}/${IOS_NOTIFICATION_LIMIT} — يوصى بتقليل التذكيرات`,
      );
    } else {
      console.log(`✅ [iOS Budget] ${all.length}/${IOS_NOTIFICATION_LIMIT} (${result.remaining} متاح)`);
    }

    // احفظ آخر تدقيق للوصول السريع من واجهة الإعدادات
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    } catch {}
  } catch (e) {
    console.warn('[iOS Budget] فشل الفحص:', e);
  }

  return result;
}

/**
 * يقرأ آخر تدقيق محفوظ بدون استدعاء native (سريع للعرض في UI).
 */
export async function getLastIosBudgetAudit(): Promise<IosBudgetAudit | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as IosBudgetAudit;
  } catch {
    return null;
  }
}

function inferCategory(id: string): string {
  const lower = id.toLowerCase();
  if (lower.includes('prayer') || lower.startsWith('p_')) return 'prayer';
  if (lower.includes('azkar') || lower.includes('morning') || lower.includes('evening')) return 'azkar';
  if (lower.includes('verse') || lower.includes('ayah')) return 'verse';
  if (lower.includes('salawat')) return 'salawat';
  if (lower.includes('tasbih')) return 'tasbih';
  if (lower.includes('istighfar')) return 'istighfar';
  if (lower.includes('kahf')) return 'kahf';
  if (lower.includes('refresh')) return 'refresh';
  if (lower.includes('worship')) return 'worship';
  if (lower.includes('quran')) return 'quran';
  if (lower.includes('custom')) return 'custom';
  return 'other';
}
