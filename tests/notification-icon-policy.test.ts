import { describe, expect, it } from 'vitest';
import {
  PRIMARY_NOTIFICATION_ICON_TYPE,
  resolveNotificationIconType,
} from '@/lib/notification-icon-policy';

describe('notification icon policy', () => {
  it('always uses the primary app icon for notification artwork', () => {
    expect(resolveNotificationIconType('mosque')).toBe(PRIMARY_NOTIFICATION_ICON_TYPE);
    expect(resolveNotificationIconType('quran')).toBe(PRIMARY_NOTIFICATION_ICON_TYPE);
    expect(resolveNotificationIconType('reminder')).toBe(PRIMARY_NOTIFICATION_ICON_TYPE);
    expect(resolveNotificationIconType(undefined)).toBe(PRIMARY_NOTIFICATION_ICON_TYPE);
  });
});
