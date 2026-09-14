import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AlarmHistoryEntry,
  DEFAULT_SMART_ALARM_CONFIG,
  SmartAlarmConfig,
  SmartAlarmKind,
} from './types';

const CONFIG_KEY = '@smart_alarm_config_v2';
const HISTORY_KEY = '@smart_alarm_history_v1';
const CASCADE_IDS_PREFIX = '@smart_alarm_cascade_ids_';
const HISTORY_MAX = 30;

// In-memory cache — lets non-async callers (prayer-notifications scheduling
// loop) check whether smart alarm is on without an AsyncStorage await per
// prayer iteration.
let _cachedConfig: SmartAlarmConfig | null = null;

export function getCachedSmartAlarmConfig(): SmartAlarmConfig {
  return _cachedConfig ?? DEFAULT_SMART_ALARM_CONFIG;
}

/** Sync convenience for the regular-Fajr suppression check */
export function isSmartFajrAlarmEnabled(): boolean {
  return _cachedConfig?.fajr.enabled === true;
}

export async function loadSmartAlarmConfig(): Promise<SmartAlarmConfig> {
  try {
    const raw = await AsyncStorage.getItem(CONFIG_KEY);
    if (!raw) {
      _cachedConfig = DEFAULT_SMART_ALARM_CONFIG;
      return DEFAULT_SMART_ALARM_CONFIG;
    }
    const parsed = JSON.parse(raw) as Partial<SmartAlarmConfig>;
    const merged: SmartAlarmConfig = {
      ...DEFAULT_SMART_ALARM_CONFIG,
      ...parsed,
      fajr: { ...DEFAULT_SMART_ALARM_CONFIG.fajr, ...(parsed.fajr ?? {}) },
      suhoor: { ...DEFAULT_SMART_ALARM_CONFIG.suhoor, ...(parsed.suhoor ?? {}) },
      version: DEFAULT_SMART_ALARM_CONFIG.version,
    };
    _cachedConfig = merged;
    return merged;
  } catch {
    _cachedConfig = DEFAULT_SMART_ALARM_CONFIG;
    return DEFAULT_SMART_ALARM_CONFIG;
  }
}

export async function saveSmartAlarmConfig(config: SmartAlarmConfig): Promise<void> {
  _cachedConfig = config;
  await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

// ─── Alarm history (last 30 fires) ─────────────────────────────────────────

export async function getAlarmHistory(): Promise<AlarmHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AlarmHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export async function appendAlarmHistory(entry: AlarmHistoryEntry): Promise<void> {
  const list = await getAlarmHistory();
  list.unshift(entry);
  const trimmed = list.slice(0, HISTORY_MAX);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

export async function updateLatestHistory(
  kind: SmartAlarmKind,
  patch: Partial<AlarmHistoryEntry>,
): Promise<void> {
  const list = await getAlarmHistory();
  const idx = list.findIndex((e) => e.kind === kind);
  if (idx < 0) return;
  list[idx] = { ...list[idx], ...patch };
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

// ─── Cascade notification IDs ──────────────────────────────────────────────

function cascadeKey(kind: SmartAlarmKind): string {
  return `${CASCADE_IDS_PREFIX}${kind}`;
}

export async function saveCascadeIds(kind: SmartAlarmKind, ids: string[]): Promise<void> {
  await AsyncStorage.setItem(cascadeKey(kind), JSON.stringify(ids));
}

export async function getCascadeIds(kind: SmartAlarmKind): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(cascadeKey(kind));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export async function clearCascadeIds(kind: SmartAlarmKind): Promise<void> {
  await AsyncStorage.removeItem(cascadeKey(kind));
}
