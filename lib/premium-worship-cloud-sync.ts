import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';
import { updateAllStats } from '@/lib/worship-storage';

const SCHEMA_VERSION = 1;
const BACKUP_COLLECTION = 'premiumBackups';
const LAST_AUTO_SYNC_KEY = '@premium_worship_cloud_last_sync';

const WORSHIP_KEYS = {
  prayerRecords: 'worship_prayer_records',
  fastingRecords: 'worship_fasting_records',
  quranRecords: 'worship_quran_records',
  azkarRecords: 'worship_azkar_records',
} as const;

const TASBIH_KEYS = {
  progress: 'tasbih_progress',
  settings: 'tasbih_settings',
  dailyStats: 'tasbih_daily_stats',
  customTasbihat: 'custom_tasbihat',
  completedToday: 'tasbih_completed_today',
  typeStats: 'tasbih_type_stats',
  targetOverrides: 'tasbih_target_overrides',
  lastDate: '@tasbih_last_date',
  dailyHistory: '@tasbih_daily_history',
} as const;

const KHATMA_KEYS = {
  khatmas: '@rooh_muslim_khatmas',
  activeKhatma: '@rooh_muslim_active_khatma',
  quranKhatm: '@quran_khatm',
} as const;

type BackupDomain = 'worship' | 'tasbih' | 'khatma';
type JsonMap = Record<string, any>;

export interface PremiumWorshipCloudSyncResult {
  restoredKeys: string[];
  uploaded: boolean;
  skippedReason?: 'not_premium' | 'missing_user' | 'throttled';
}

const parseJson = (value: string | null): any => {
  if (value === null) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const stringifyStorageValue = (value: any): string => (
  typeof value === 'string' ? value : JSON.stringify(value)
);

const readStorageGroup = async (keys: Record<string, string>): Promise<JsonMap> => {
  const entries = await Promise.all(
    Object.entries(keys).map(async ([name, storageKey]) => [name, parseJson(await AsyncStorage.getItem(storageKey))] as const),
  );
  return Object.fromEntries(entries);
};

const writeStorageGroup = async (
  keys: Record<string, string>,
  payload: JsonMap,
  restoredKeys: string[],
): Promise<void> => {
  for (const [name, storageKey] of Object.entries(keys)) {
    const value = payload[name];
    if (value === undefined || value === null) continue;
    const next = stringifyStorageValue(value);
    const current = await AsyncStorage.getItem(storageKey);
    if (current === next) continue;
    await AsyncStorage.setItem(storageKey, next);
    restoredKeys.push(storageKey);
  }
};

const isEmptyObject = (value: any): boolean => (
  !value || (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)
);

const sumNumbers = (value: any): number => {
  if (!value || typeof value !== 'object') return 0;
  return Object.values(value).reduce<number>((sum, item) => {
    if (typeof item === 'number') return sum + item;
    if (item && typeof item === 'object') return sum + sumNumbers(item);
    return sum;
  }, 0);
};

const scorePrayerRecord = (record: any): number => {
  if (!record) return 0;
  return ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].reduce((sum, key) => (
    record[key] && record[key] !== 'none' ? sum + 1 : sum
  ), 0);
};

const scoreFastingRecord = (record: any): number => record?.fasted ? 1 : 0;

const scoreQuranRecord = (record: any): number => (
  (Number(record?.pagesRead) || 0) +
  (Number(record?.khatmaCompletions) || 0) * 604 +
  (Array.isArray(record?.khatmaCompletionIds) ? record.khatmaCompletionIds.length * 604 : 0)
);

const scoreAzkarRecord = (record: any): number => {
  if (!record) return 0;
  const typeCount = ['morning', 'evening', 'sleep', 'wakeup', 'afterPrayer'].filter(key => !!record[key]).length;
  return typeCount + (Number(record.zikrCount) || 0) + (Array.isArray(record.completedZikrIds) ? record.completedZikrIds.length : 0);
};

const mergeDateMap = (
  local: JsonMap | null,
  cloud: JsonMap | null,
  score: (record: any) => number,
): JsonMap => {
  const merged: JsonMap = {};
  const keys = new Set([...Object.keys(cloud || {}), ...Object.keys(local || {})]);
  keys.forEach((key) => {
    const localValue = local?.[key];
    const cloudValue = cloud?.[key];
    if (localValue === undefined) merged[key] = cloudValue;
    else if (cloudValue === undefined) merged[key] = localValue;
    else merged[key] = score(cloudValue) > score(localValue) ? cloudValue : localValue;
  });
  return merged;
};

const mergeNumericMap = (local: JsonMap | null, cloud: JsonMap | null): JsonMap => {
  const merged: JsonMap = {};
  const keys = new Set([...Object.keys(cloud || {}), ...Object.keys(local || {})]);
  keys.forEach((key) => {
    merged[key] = Math.max(Number(local?.[key]) || 0, Number(cloud?.[key]) || 0);
  });
  return merged;
};

const mergeNestedNumericMap = (local: JsonMap | null, cloud: JsonMap | null): JsonMap => {
  const merged: JsonMap = {};
  const keys = new Set([...Object.keys(cloud || {}), ...Object.keys(local || {})]);
  keys.forEach((key) => {
    merged[key] = mergeNumericMap(local?.[key] || {}, cloud?.[key] || {});
  });
  return merged;
};

const mergeArrayById = (local: any[] | null, cloud: any[] | null): any[] => {
  const byId = new Map<string, any>();
  for (const item of cloud || []) {
    const id = item?.id;
    if (id) byId.set(String(id), item);
  }
  for (const item of local || []) {
    const id = item?.id;
    if (id) byId.set(String(id), item);
  }
  return Array.from(byId.values());
};

const mergeProgress = (local: any, cloud: any): any => {
  if (!local) return cloud;
  if (!cloud) return local;
  if (local.date !== cloud.date) return local.date > cloud.date ? local : cloud;
  return (Number(cloud.totalCount) || 0) > (Number(local.totalCount) || 0) ? cloud : local;
};

const mergeCompletedToday = (local: any, cloud: any): any => {
  if (!local) return cloud;
  if (!cloud) return local;
  if (local.date !== cloud.date) return local.date > cloud.date ? local : cloud;
  return {
    date: local.date,
    completed: {
      ...(cloud.completed || {}),
      ...(local.completed || {}),
    },
  };
};

const mergeWorshipPayload = (local: JsonMap, cloud: JsonMap): JsonMap => ({
  prayerRecords: mergeDateMap(local.prayerRecords, cloud.prayerRecords, scorePrayerRecord),
  fastingRecords: mergeDateMap(local.fastingRecords, cloud.fastingRecords, scoreFastingRecord),
  quranRecords: mergeDateMap(local.quranRecords, cloud.quranRecords, scoreQuranRecord),
  azkarRecords: mergeDateMap(local.azkarRecords, cloud.azkarRecords, scoreAzkarRecord),
});

const mergeTasbihPayload = (local: JsonMap, cloud: JsonMap): JsonMap => ({
  progress: mergeProgress(local.progress, cloud.progress),
  settings: isEmptyObject(local.settings) ? cloud.settings : local.settings,
  dailyStats: mergeNumericMap(local.dailyStats, cloud.dailyStats),
  customTasbihat: mergeArrayById(local.customTasbihat, cloud.customTasbihat),
  completedToday: mergeCompletedToday(local.completedToday, cloud.completedToday),
  typeStats: mergeNestedNumericMap(local.typeStats, cloud.typeStats),
  targetOverrides: { ...(cloud.targetOverrides || {}), ...(local.targetOverrides || {}) },
  lastDate: local.lastDate || cloud.lastDate,
  dailyHistory: mergeNestedNumericMap(local.dailyHistory, cloud.dailyHistory),
});

const mergeKhatmaPayload = (local: JsonMap, cloud: JsonMap): JsonMap => ({
  khatmas: mergeArrayById(local.khatmas, cloud.khatmas),
  activeKhatma: local.activeKhatma || cloud.activeKhatma,
  quranKhatm: mergeArrayById(local.quranKhatm, cloud.quranKhatm),
});

const domainKeys = (domain: BackupDomain) => {
  if (domain === 'worship') return WORSHIP_KEYS;
  if (domain === 'tasbih') return TASBIH_KEYS;
  return KHATMA_KEYS;
};

const mergeDomainPayload = (domain: BackupDomain, local: JsonMap, cloud: JsonMap): JsonMap => {
  if (domain === 'worship') return mergeWorshipPayload(local, cloud);
  if (domain === 'tasbih') return mergeTasbihPayload(local, cloud);
  return mergeKhatmaPayload(local, cloud);
};

const getBackupRef = (userId: string, domain: BackupDomain) => (
  doc(db, 'users', userId, BACKUP_COLLECTION, domain)
);

const readCloudPayload = async (userId: string, domain: BackupDomain): Promise<JsonMap> => {
  const snap = await getDoc(getBackupRef(userId, domain));
  const data = snap.exists() ? snap.data() : null;
  return (data?.payload && typeof data.payload === 'object') ? data.payload : {};
};

const syncDomain = async (
  userId: string,
  domain: BackupDomain,
  restoredKeys: string[],
): Promise<void> => {
  const keys = domainKeys(domain);
  const [local, cloud] = await Promise.all([
    readStorageGroup(keys),
    readCloudPayload(userId, domain),
  ]);
  const payload = mergeDomainPayload(domain, local, cloud);
  await writeStorageGroup(keys, payload, restoredKeys);
  await setDoc(getBackupRef(userId, domain), {
    schemaVersion: SCHEMA_VERSION,
    payload,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

export const syncPremiumWorshipCloudData = async (
  userId: string | null,
  isPremium: boolean,
  options: { force?: boolean } = {},
): Promise<PremiumWorshipCloudSyncResult> => {
  if (!isPremium) return { restoredKeys: [], uploaded: false, skippedReason: 'not_premium' };
  if (!userId) return { restoredKeys: [], uploaded: false, skippedReason: 'missing_user' };

  if (!options.force) {
    const lastSyncRaw = await AsyncStorage.getItem(LAST_AUTO_SYNC_KEY);
    const lastSync = Number(lastSyncRaw) || 0;
    if (Date.now() - lastSync < 10 * 60 * 1000) {
      return { restoredKeys: [], uploaded: false, skippedReason: 'throttled' };
    }
  }

  const restoredKeys: string[] = [];
  await syncDomain(userId, 'worship', restoredKeys);
  await syncDomain(userId, 'tasbih', restoredKeys);
  await syncDomain(userId, 'khatma', restoredKeys);
  await updateAllStats().catch(() => {});
  await AsyncStorage.setItem(LAST_AUTO_SYNC_KEY, String(Date.now()));

  return { restoredKeys, uploaded: true };
};

export const hasMeaningfulPremiumBackupPayload = (payload: JsonMap): boolean => (
  sumNumbers(payload) > 0 || Object.values(payload).some(value => (
    Array.isArray(value) ? value.length > 0 : value && typeof value === 'object' && Object.keys(value).length > 0
  ))
);
