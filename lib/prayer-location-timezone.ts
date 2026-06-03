import {
  fetchPrayerTimes,
  saveLocation,
  type Location,
} from './prayer-times';
import { loadCanonicalPrayerTimezoneForLocation } from './canonical-prayer-snapshot';

export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export async function resolvePrayerLocationTimezone(
  location: Pick<Location, 'latitude' | 'longitude' | 'city' | 'country' | 'timezone'>,
  allowNetwork = false,
): Promise<string> {
  const persisted = location.timezone || await loadCanonicalPrayerTimezoneForLocation(location);
  if (persisted) return persisted;

  if (allowNetwork) {
    try {
      const response = await fetchPrayerTimes(location as Location);
      const timezone = response.meta?.timezone;
      if (timezone) {
        await saveLocation({ ...location, timezone });
        return timezone;
      }
    } catch {
      // The next foreground/widget refresh retries. Until then, callers get a
      // deterministic fallback instead of crashing the UI.
    }
  }

  return deviceTimezone();
}

export async function ensurePrayerLocationTimezone(
  location: Location,
  allowNetwork = true,
): Promise<Location> {
  const timezone = await resolvePrayerLocationTimezone(location, allowNetwork);
  if (timezone === location.timezone) return location;
  const updated = { ...location, timezone };
  await saveLocation(updated);
  return updated;
}
