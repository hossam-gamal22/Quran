/**
 * Single source of truth for reading the absolute fire-time (epoch ms) of an
 * already-scheduled notification, regardless of the platform-specific trigger
 * shape returned by `Notifications.getAllScheduledNotificationsAsync()`.
 *
 * Why this exists:
 *   On iOS a DATE trigger is delivered back as a UNCalendarNotificationTrigger —
 *   `{ type: 'calendar', dateComponents: { year, month, day, hour, minute, second } }`
 *   — NOT `{ value }` / `{ date }`. Several call sites historically parsed only the
 *   latter and silently got `null` on iOS, which broke the imminent-adhan protection
 *   guard, the schedule health check, and the maintenance reminder for iOS users.
 */
export function getScheduledNotificationFireMs(trigger: any): number | null {
  if (!trigger || typeof trigger !== 'object') return null;

  // Android (and some expo shapes): absolute epoch ms.
  if (typeof trigger.value === 'number' && Number.isFinite(trigger.value)) {
    return trigger.value;
  }
  if (typeof trigger.timestamp === 'number' && Number.isFinite(trigger.timestamp)) {
    return trigger.timestamp;
  }
  // Direct date payloads (Date | epoch number | parseable string).
  if (trigger.date instanceof Date) {
    const ms = trigger.date.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof trigger.date === 'number' && Number.isFinite(trigger.date)) {
    return trigger.date;
  }
  if (typeof trigger.date === 'string') {
    const ms = new Date(trigger.date).getTime();
    if (Number.isFinite(ms)) return ms;
  }

  // iOS DATE → UNCalendarNotificationTrigger.
  // Apple's DateComponents.month is 1-based; JS Date month is 0-based.
  const dc = trigger.dateComponents;
  if (
    dc && typeof dc === 'object' &&
    typeof dc.year === 'number' && typeof dc.month === 'number' && typeof dc.day === 'number'
  ) {
    const d = new Date(
      dc.year,
      dc.month - 1,
      dc.day,
      typeof dc.hour === 'number' ? dc.hour : 0,
      typeof dc.minute === 'number' ? dc.minute : 0,
      typeof dc.second === 'number' ? dc.second : 0,
      0,
    );
    const ms = d.getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  // Relative (time-interval) trigger — approximate the absolute fire time from now.
  // Only a fallback; iOS uses calendar triggers for our DATE-based notifications.
  if (typeof trigger.seconds === 'number' && Number.isFinite(trigger.seconds)) {
    return Date.now() + trigger.seconds * 1000;
  }

  return null;
}
