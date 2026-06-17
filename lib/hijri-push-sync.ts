// lib/hijri-push-sync.ts
// Receives admin Hijri override push payloads and updates local/widget caches.

import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  cacheHijriOverrideFromPush,
  removeCachedHijriOverride,
  type HijriOverride,
} from '@/lib/hijri-overrides';
import { invalidateHijriCache, syncHijriSystemOffset } from '@/services/hijriCalendarService';
import { updateSharedData } from '@/lib/widget-data';

const TASK_NAME = 'HIJRI_OVERRIDE_PUSH_SYNC';
const LAST_SYNC_KEY = '@hijri_override_last_push_sync';

type AnyPayload = Record<string, any>;

function unwrapNotificationData(payload: any): AnyPayload {
  if (!payload) return {};
  if ('actionIdentifier' in payload && payload.notification?.request?.content?.data) {
    return payload.notification.request.content.data as AnyPayload;
  }
  if (payload?.request?.content?.data) {
    return payload.request.content.data as AnyPayload;
  }
  if (payload?.data && typeof payload.data === 'object') {
    return payload.data as AnyPayload;
  }
  return payload as AnyPayload;
}

const asNumber = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

const asBool = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true' || value === '1';
  return Boolean(value);
};

function parseHijriPayload(payload: AnyPayload): {
  override: HijriOverride;
  deleted: boolean;
} | null {
  const data = unwrapNotificationData(payload);
  if (data.type !== 'hijri_override_sync') return null;

  const countryCode = typeof data.countryCode === 'string' ? data.countryCode.toUpperCase() : '';
  const hijriYear = asNumber(data.hijriYear);
  const hijriMonth = asNumber(data.hijriMonth);
  const monthLength = asNumber(data.monthLength);
  const hijriStartGregorian = typeof data.hijriStartGregorian === 'string' ? data.hijriStartGregorian : '';

  if (!countryCode || !hijriYear || !hijriMonth || (monthLength !== 29 && monthLength !== 30)) {
    return null;
  }

  return {
    deleted: asBool(data.deleted),
    override: {
      countryCode,
      countryName: typeof data.countryName === 'string' ? data.countryName : countryCode,
      hijriYear,
      hijriMonth,
      monthLength,
      hijriStartGregorian,
      source: typeof data.source === 'string' ? data.source : 'Admin override',
      sourceUrl: typeof data.sourceUrl === 'string' ? data.sourceUrl : '',
      updatedBy: 'admin_push',
      isVerified: data.isVerified === undefined ? true : asBool(data.isVerified),
    },
  };
}

export async function applyHijriOverridePushPayload(payload: any): Promise<boolean> {
  const parsed = parseHijriPayload(payload);
  if (!parsed) return false;

  const { override, deleted } = parsed;
  if (deleted) {
    await removeCachedHijriOverride(override.countryCode, override.hijriYear, override.hijriMonth);
  } else if (override.isVerified && override.hijriStartGregorian) {
    await cacheHijriOverrideFromPush(override);
  }

  await invalidateHijriCache(override.countryCode);
  // Recompute the tabular→authoritative correction so the home date line,
  // prayer tab and calendar grid (synchronous tabular call-sites) reflect the
  // admin's decision the moment the push lands — not just the widget.
  await syncHijriSystemOffset(override.countryCode).catch(() => {});
  await AsyncStorage.setItem(LAST_SYNC_KEY, JSON.stringify({
    countryCode: override.countryCode,
    hijriYear: override.hijriYear,
    hijriMonth: override.hijriMonth,
    deleted,
    syncedAt: new Date().toISOString(),
  }));

  await updateSharedData().catch(() => {});
  return true;
}

try {
  TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.warn('[hijri-push] background task error:', error);
      return;
    }
    await applyHijriOverridePushPayload(data);
  });
} catch {
  // Task can already be defined after hot reload.
}

export async function registerHijriOverridePushTask(): Promise<void> {
  try {
    await Notifications.registerTaskAsync(TASK_NAME);
  } catch (error) {
    if (__DEV__) console.warn('[hijri-push] task registration failed:', error);
  }
}

