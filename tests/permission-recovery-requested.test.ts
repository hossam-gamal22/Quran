import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-notifications', () => ({
  getPermissionsAsync: vi.fn(),
}));

vi.mock('expo-location', () => ({
  getForegroundPermissionsAsync: vi.fn(),
  requestForegroundPermissionsAsync: vi.fn(),
  getCurrentPositionAsync: vi.fn(),
  reverseGeocodeAsync: vi.fn(),
  Accuracy: { Balanced: 3, High: 4 },
}));

describe('Android permission recovery prompting', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    Platform.OS = 'android';
    Platform.Version = 35;
  });

  it('does not surface Android permission issues before the app has requested them', async () => {
    const { getPermissionIssues } = await import('@/lib/permission-recovery');

    const issues = await getPermissionIssues({
      notifications: 'undetermined',
      location: 'undetermined',
      exactAlarm: 'denied',
      batteryOptimization: 'optimized',
      oemAutoStart: 'aggressive',
      manufacturer: 'xiaomi',
      dndAccess: 'denied',
      dndActive: true,
      backgroundRefresh: 'unsupported',
    });

    expect(issues).toEqual([]);
  });

  it('surfaces Android permission issues after the requested permission is refused', async () => {
    const { getPermissionIssues, markPermissionRequested } = await import('@/lib/permission-recovery');

    await markPermissionRequested('notifications');
    await markPermissionRequested('location');

    const issues = await getPermissionIssues({
      notifications: 'denied',
      location: 'denied',
      exactAlarm: 'unsupported',
      batteryOptimization: 'unsupported',
      oemAutoStart: 'standard',
      manufacturer: 'unknown',
      dndAccess: 'unsupported',
      dndActive: false,
      backgroundRefresh: 'unsupported',
    });

    expect(issues.map((issue) => issue.key)).toEqual(['notifications', 'location']);
  });
});
