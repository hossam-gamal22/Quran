import { afterEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { secureStorage } = vi.hoisted(() => ({
  secureStorage: new Map<string, string>(),
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn((key: string) => Promise.resolve(secureStorage.get(key) ?? null)),
  setItemAsync: vi.fn((key: string, value: string) => {
    secureStorage.set(key, value);
    return Promise.resolve();
  }),
}));

import {
  gatherBackupData,
  restoreBackupData,
  type BackupData,
} from '../lib/backup-utils';

const USER_INFO_KEY = 'manus-runtime-user-info';
const QA_CHAT_HISTORY_KEY = '@qa_assistant_chat_history';
const QA_CHAT_CONVERSATIONS_KEY = '@qa_assistant_conversations';

afterEach(async () => {
  await AsyncStorage.clear();
  secureStorage.clear();
});

describe('backup-utils', () => {
  it('gathers restorable data while excluding device-specific keys', async () => {
    await AsyncStorage.setItem('app_settings', JSON.stringify({ language: 'ar' }));
    await AsyncStorage.setItem('worship_quran_records', JSON.stringify({ '2026-05-01': { pagesRead: 34 } }));
    await AsyncStorage.setItem(QA_CHAT_HISTORY_KEY, JSON.stringify([{ id: 'm1', role: 'user', text: 'سؤال' }]));
    await AsyncStorage.setItem(QA_CHAT_CONVERSATIONS_KEY, JSON.stringify([{ id: 'c1', preview: 'سؤال', messages: [] }]));
    await AsyncStorage.setItem('@fcm_token', 'device-token');
    await AsyncStorage.setItem('last_backup_date', '2026-05-12T00:00:00.000Z');
    secureStorage.set(USER_INFO_KEY, JSON.stringify({ openId: 'user-1' }));

    const backup = await gatherBackupData();

    expect(backup.version).toBe('2.0');
    expect(backup.data.app_settings).toEqual({ language: 'ar' });
    expect(backup.data.worship_quran_records).toEqual({ '2026-05-01': { pagesRead: 34 } });
    expect(backup.data[QA_CHAT_HISTORY_KEY]).toEqual([{ id: 'm1', role: 'user', text: 'سؤال' }]);
    expect(backup.data[QA_CHAT_CONVERSATIONS_KEY]).toEqual([{ id: 'c1', preview: 'سؤال', messages: [] }]);
    expect(backup.data).not.toHaveProperty('@fcm_token');
    expect(backup.data).not.toHaveProperty('last_backup_date');
    expect(backup.secureData?.[USER_INFO_KEY]).toBe(JSON.stringify({ openId: 'user-1' }));
  });

  it('restores v2 backups as the source of truth while preserving excluded local keys', async () => {
    await AsyncStorage.setItem('app_settings', JSON.stringify({ language: 'en' }));
    await AsyncStorage.setItem('stale_key', 'old-value');
    await AsyncStorage.setItem('@fcm_token', 'current-device-token');

    const backup: BackupData = {
      version: '2.0',
      createdAt: '2026-05-12T00:00:00.000Z',
      device: 'ios',
      data: {
        app_settings: { language: 'ar' },
        worship_quran_records: { '2026-05-01': { pagesRead: 34 } },
        [QA_CHAT_HISTORY_KEY]: [{ id: 'm2', role: 'assistant', text: 'إجابة' }],
        '@fcm_token': 'old-device-token',
      },
      secureData: {
        [USER_INFO_KEY]: JSON.stringify({ openId: 'restored-user' }),
      },
    };

    const result = await restoreBackupData(backup);

    expect(result.failed).toBe(0);
    expect(result.restored).toBe(4);
    await expect(AsyncStorage.getItem('app_settings')).resolves.toBe(JSON.stringify({ language: 'ar' }));
    await expect(AsyncStorage.getItem('worship_quran_records')).resolves.toBe(JSON.stringify({ '2026-05-01': { pagesRead: 34 } }));
    await expect(AsyncStorage.getItem(QA_CHAT_HISTORY_KEY)).resolves.toBe(JSON.stringify([{ id: 'm2', role: 'assistant', text: 'إجابة' }]));
    await expect(AsyncStorage.getItem('stale_key')).resolves.toBeNull();
    await expect(AsyncStorage.getItem('@fcm_token')).resolves.toBe('current-device-token');
    expect(secureStorage.get(USER_INFO_KEY)).toBe(JSON.stringify({ openId: 'restored-user' }));
  });
});
