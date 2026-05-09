import { beforeEach, describe, expect, it, vi } from 'vitest';

const fsMock = vi.hoisted(() => {
  const files = new Map<string, number>();
  return {
    files,
    getInfoAsync: vi.fn(async (path: string) => ({
      exists: files.has(path),
      size: files.get(path) || 0,
    })),
    makeDirectoryAsync: vi.fn(async () => undefined),
    downloadAsync: vi.fn(async (url: string, path: string) => {
      files.set(path, 1024);
      return { status: 200, uri: path };
    }),
    deleteAsync: vi.fn(async (path: string) => {
      files.delete(path);
    }),
  };
});

vi.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  getInfoAsync: fsMock.getInfoAsync,
  makeDirectoryAsync: fsMock.makeDirectoryAsync,
  downloadAsync: fsMock.downloadAsync,
  deleteAsync: fsMock.deleteAsync,
}));

import {
  GITHUB_BASE,
  clearAzkarCache,
  getAzkarAudioUri,
  isAzkarCached,
  isCacheableAzkarAudio,
} from '../lib/azkar-audio-cache';

describe('azkar audio cache', () => {
  beforeEach(async () => {
    fsMock.files.clear();
    fsMock.getInfoAsync.mockClear();
    fsMock.makeDirectoryAsync.mockClear();
    fsMock.downloadAsync.mockClear();
    fsMock.deleteAsync.mockClear();
    await clearAzkarCache();
  });

  it('caches bundled filename audio under its local filename', async () => {
    const uri = await getAzkarAudioUri('17.m4a');

    expect(uri).toBe('file:///docs/azkar_audio/17.m4a');
    expect(fsMock.downloadAsync).toHaveBeenCalledWith(`${GITHUB_BASE}17.m4a`, uri);
    expect(await isAzkarCached('17.m4a')).toBe(true);
  });

  it('caches Firebase/HTTP URLs under a safe hashed filename for offline replay', async () => {
    const remoteUrl = 'https://firebasestorage.googleapis.com/v0/b/app/o/zikr_17.mp3?alt=media';
    const uri = await getAzkarAudioUri(remoteUrl);

    expect(uri).toMatch(/^file:\/\/\/docs\/azkar_audio\/remote_[a-z0-9]+\.mp3$/);
    expect(fsMock.downloadAsync).toHaveBeenCalledWith(remoteUrl, uri);
    expect(await isAzkarCached(remoteUrl)).toBe(true);
  });

  it('does not try to cache Quran markers or native file URIs', () => {
    expect(isCacheableAzkarAudio('quran:1:1-7')).toBe(false);
    expect(isCacheableAzkarAudio('file:///tmp/zikr.m4a')).toBe(false);
    expect(isCacheableAzkarAudio('https://example.com/zikr.m4a')).toBe(true);
  });
});
