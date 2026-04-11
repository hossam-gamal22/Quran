/**
 * Notification Icons — أيقونات الإشعارات
 *
 * Maps iconType strings (used in notification data) to bundled icon assets.
 * On iOS, resolves them to local file URIs for use as notification attachments.
 * On Android, icons are handled natively via the with-notification-icons plugin.
 */

import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import type { NotificationContentAttachmentIos } from 'expo-notifications';

// ─── Icon Type → Asset Map ───────────────────────────────────────────────────
const NOTIFICATION_ICON_MAP: Record<string, number> = {
  morning: require('../assets/images/notification-icons/notif_icon_morning.png'),
  evening: require('../assets/images/notification-icons/notif_icon_evening.png'),
  moon: require('../assets/images/notification-icons/notif_icon_moon.png'),
  mosque: require('../assets/images/notification-icons/notif_icon_mosque.png'),
  prayer_beads: require('../assets/images/notification-icons/notif_icon_prayer_beads.png'),
  quran: require('../assets/images/notification-icons/notif_icon_quran.png'),
  reminder: require('../assets/images/notification-icons/notif_icon_reminder.png'),
};

// Cache resolved local URIs so we don't re-download every time
const _uriCache: Record<string, string> = {};

/**
 * Pre-download all notification icon assets so they're available as local
 * file URIs when notifications fire (even offline).
 * Call once during app initialization.
 */
export async function ensureNotificationIconsCached(): Promise<void> {
  if (Platform.OS !== 'ios') return; // Android uses native drawables

  const entries = Object.entries(NOTIFICATION_ICON_MAP);
  await Promise.allSettled(
    entries.map(async ([key, module]) => {
      try {
        const asset = Asset.fromModule(module);
        await asset.downloadAsync();
        if (asset.localUri) {
          _uriCache[key] = asset.localUri;
        }
      } catch (e) {
        console.warn(`[notification-icons] Failed to cache icon "${key}":`, e);
      }
    })
  );
  console.log(`[notification-icons] Cached ${Object.keys(_uriCache).length}/${entries.length} icons`);
}

/**
 * Get local file URI for a notification icon type.
 * Returns null if the icon isn't found or isn't cached yet.
 */
async function getIconLocalUri(iconType: string): Promise<string | null> {
  // Return from cache if available
  if (_uriCache[iconType]) return _uriCache[iconType];

  const module = NOTIFICATION_ICON_MAP[iconType];
  if (!module) return null;

  try {
    const asset = Asset.fromModule(module);
    await asset.downloadAsync();
    if (asset.localUri) {
      _uriCache[iconType] = asset.localUri;
      return asset.localUri;
    }
  } catch {}
  return null;
}

/**
 * Build iOS notification attachments for the given iconType.
 * Returns undefined on Android (handled natively) or if icon resolution fails.
 */
export async function getNotificationIconAttachment(
  iconType?: string
): Promise<NotificationContentAttachmentIos[] | undefined> {
  if (Platform.OS !== 'ios' || !iconType) return undefined;

  const localUri = await getIconLocalUri(iconType);
  if (!localUri) return undefined;

  return [
    {
      identifier: `notif_icon_${iconType}`,
      url: localUri,
      type: 'public.png',
    },
  ];
}
