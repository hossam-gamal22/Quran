export const PRIMARY_NOTIFICATION_ICON_TYPE = 'app_primary';

/**
 * Notification icons MUST stay on the default app branding at all times — they
 * are deliberately decoupled from the seasonal *launcher* icon (Hajj, Eid sheep,
 * Hijri new year, …). A seasonal app icon changes the home-screen launcher only;
 * notifications always show `app_primary` (the bundled `icon.png` / the Android
 * `notification_icon` drawable). Do NOT make this depend on the active season or
 * on the resolved launcher icon variant — that coupling is exactly the bug we
 * removed. The argument is accepted for call-site compatibility but ignored.
 */
export function resolveNotificationIconType(_requestedIconType?: string): string {
  return PRIMARY_NOTIFICATION_ICON_TYPE;
}
