/**
 * Phase 1.G — Auto-downgrade للأذان/الأصوات البريميوم
 *
 * عندما يختار المستخدم صوتاً مثبَّتاً عبر "تنزيل الأصوات" (premium feature)
 * ثم ينتهي اشتراكه، الجدولة كانت ستُمرِّر صوتاً غير متاح للنظام → فشل صامت.
 *
 * هذا الموديول يفحص:
 *  1) هل المفتاح المختار من الأصوات المثبَّتة (premium)؟
 *  2) لو نعم، هل المستخدم premium حالياً؟
 *  3) لو لا، يرجع المفتاح الافتراضي (makkah للأذان، default لباقي الأنواع)
 */

import { ADHAN_SOUND_FILES, NOTIFICATION_SOUND_FILES } from '../services/notifications/channels';
import { getCachedInstalledSounds } from './notification-sound-installer';

const DEFAULT_ADHAN_KEY = 'makkah';
const DEFAULT_REMINDER_KEY = 'default';

/**
 * يُرجع true لو المفتاح المعطى لصوت مثبَّت عبر التنزيل (premium-gated).
 */
export function isPremiumSoundKey(soundKey: string | undefined): boolean {
  if (!soundKey) return false;
  // أصوات bundled (مجانية) موجودة في ADHAN_SOUND_FILES أو NOTIFICATION_SOUND_FILES
  if (ADHAN_SOUND_FILES[soundKey] || NOTIFICATION_SOUND_FILES[soundKey]) return false;
  // غير ذلك → نتحقق إن كان من المثبَّتة
  const installed = getCachedInstalledSounds();
  if (!installed) return false;
  return installed.some((s) => s.id === soundKey);
}

/**
 * يفحص اشتراك المستخدم الحالي (lazy import لتجنب circular deps).
 */
async function isUserPremium(): Promise<boolean> {
  try {
    const { getSubscriptionState } = await import('./subscription-manager');
    const state = await getSubscriptionState();
    return !!state.isPremium;
  } catch {
    return false;
  }
}

/**
 * يُرجع المفتاح الفعلي الذي يجب استخدامه. لو premium مطلوب لكن المستخدم
 * ليس بمشترك، يرجع الافتراضي مع تسجيل تحذير.
 *
 * @param requestedKey المفتاح الذي اختاره المستخدم
 * @param category 'adhan' للأذان، 'reminder' لباقي التذكيرات
 */
export async function resolveSoundKeyWithDowngrade(
  requestedKey: string | undefined,
  category: 'adhan' | 'reminder',
): Promise<string> {
  const fallback = category === 'adhan' ? DEFAULT_ADHAN_KEY : DEFAULT_REMINDER_KEY;
  if (!requestedKey || requestedKey === 'default') return fallback;
  if (requestedKey === 'silent') return 'silent';

  // غير premium → استخدمه مباشرة
  if (!isPremiumSoundKey(requestedKey)) return requestedKey;

  // premium → افحص الاشتراك
  const isPremium = await isUserPremium();
  if (isPremium) return requestedKey;

  console.warn(
    `⚠️ [sound-downgrade] صوت "${requestedKey}" يتطلب اشتراكاً منتهياً → الرجوع إلى "${fallback}"`,
  );
  return fallback;
}
