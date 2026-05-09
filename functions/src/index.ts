import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';

// Expo Access Token for authenticated push API calls
const expoAccessToken = defineSecret('EXPO_ACCESS_TOKEN');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const logger = functions.logger;

/** Expo Push Message structure */
interface ExpoPushMessage {
  to: string;
  title?: string;
  body?: string;
  data?: Record<string, string>;
  sound?: string;
  badge?: number;
  ttl?: number;
  expiration?: number;
  priority?: 'default' | 'normal' | 'high';
  mutableContent?: boolean;
  categoryId?: string;
}

/** Expo API Response */
interface ExpoTicket {
  id: string;
  status: 'ok' | 'error';
  message?: string;
  details?: {
    error?: string;
    errorCode?: string;
  };
}

interface ExpoResponse {
  data: ExpoTicket[];
}

const EXPO_PUSH_APIS = [
  'https://api.expo.dev/v2/push/send',
  'https://exp.host/--/api/v2/push/send',
];

const EXPO_REQUEST_TIMEOUT_MS = 15000;

/**
 * ⚠️ Deprecated and removed in Phase A2 (Security hardening).
 *
 * Push notifications are sent via the Netlify proxy `expo-push.ts`, which is
 * authenticated using an admin session token (HMAC-signed by `verify-admin`).
 *
 * The previous `sendPushNotifications` callable function only checked
 * `context.auth != null`, which was insufficient because:
 *   • Any anonymously-signed Firebase user could invoke it
 *   • The admin panel does NOT use Firebase Auth (it uses Netlify password +
 *     localStorage session token), so the function was unreachable from admin
 *     anyway and existed only as an attack surface.
 *
 * The previous `pushNotificationsTestEndpoint` HTTP endpoint had
 * `Access-Control-Allow-Origin: *` and NO authentication — anyone with the
 * URL could send arbitrary push notifications to any token.
 *
 * Both are removed. If a server-side push path is needed in the future, it
 * MUST verify a custom admin claim (`request.auth.token.admin === true`).
 */

// ==================== Monthly Honor Board Winner Selection ====================

/**
 * Scheduled Cloud Function: runs at 00:05 on the 1st of every month.
 * Selects top winners from the previous month's leaderboard,
 * grants them admin premium, and sends push notifications.
 */
export const selectMonthlyWinners = onSchedule(
  { schedule: '5 0 1 * *', timeZone: 'Asia/Riyadh', secrets: ['EXPO_ACCESS_TOKEN'] },
  async () => {
    try {
      // Calculate previous month key (YYYY-MM-v2 format)
      const now = new Date();
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const monthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-v2`;

      logger.info(`🏆 Selecting winners for month: ${monthKey}`);

      // Fetch rewards config
      const configSnap = await db.doc('config/rewards-settings').get();
      const config = configSnap.data() || {};
      if (config.enabled === false) {
        logger.info('Rewards system is disabled, skipping winner selection');
        return;
      }

      // Check if already processed
      if (config.currentMonth === monthKey) {
        logger.info(`Winners already selected for ${monthKey}, skipping`);
        return;
      }

      const winnersCount = config.winnersCount || 3;
      const rewardDurationDays = config.rewardDurationDays || 30;

      // Query top users for previous month
      const snapshot = await db.collection('users')
        .where('monthlyEngagement.month', '==', monthKey)
        .orderBy('monthlyEngagement.score', 'desc')
        .limit(Math.max(winnersCount * 5, 20))
        .get();

      const winners: Array<{ userId: string; displayName: string; score: number; rewardedAt: string; notified: boolean; premiumExpiresAt: string }> = [];
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + rewardDurationDays);

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const engagement = data.monthlyEngagement;
        const displayName = String(data.displayName || '').trim();
        if (
          winners.length < winnersCount &&
          engagement &&
          engagement.score > 0 &&
          displayName &&
          !data.hiddenFromLeaderboard &&
          !data.placeholder
        ) {
          winners.push({
            userId: docSnap.id,
            displayName,
            score: engagement.score,
            rewardedAt: new Date().toISOString(),
            notified: false,
            premiumExpiresAt: expiresAt.toISOString(),
          });
        }
      });

      if (winners.length === 0) {
        logger.info(`No eligible winners found for ${monthKey}`);
        await db.doc('config/rewards-settings').update({
          currentMonth: monthKey,
          lastProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return;
      }

      // Grant premium to each winner
      const batch = db.batch();
      for (const winner of winners) {
        const userRef = db.doc(`users/${winner.userId}`);
        batch.update(userRef, {
          adminPremium: {
            granted: true,
            grantedBy: 'auto_reward_system',
            grantedAt: new Date().toISOString(),
            expiresAt: expiresAt.toISOString(),
            reason: `فائز في مسابقة الشهر ${monthKey}`,
          },
        });
      }
      await batch.commit();

      // Update rewards config
      const historyEntry = {
        month: monthKey,
        winners,
        selectedAt: new Date().toISOString(),
        selectedBy: 'auto',
      };

      const existingHistory = config.history || [];
      await db.doc('config/rewards-settings').update({
        currentMonth: monthKey,
        currentWinners: winners,
        history: [historyEntry, ...existingHistory.slice(0, 11)],
        lastProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Send push notifications to winners
      const pushMessages: ExpoPushMessage[] = [];
      for (const winner of winners) {
        try {
          const userSnap = await db.doc(`users/${winner.userId}`).get();
          const fcmToken = userSnap.data()?.fcmToken;
          if (fcmToken && fcmToken.startsWith('ExponentPushToken')) {
            pushMessages.push({
              to: fcmToken,
              title: '🏆 مبروك! أنت في لوحة الشرف',
              body: 'حصلت على اشتراك مجاني هذا الشهر مكافأة لك',
              data: { type: 'honor_board_winner' },
              sound: 'default',
              priority: 'high',
            });
            winner.notified = true;
          }
        } catch (err) {
          logger.warn(`Could not get push token for winner ${winner.userId}:`, err);
        }
      }

      if (pushMessages.length > 0) {
        try {
          const winnerToken = expoAccessToken.value();
          const winnerHeaders: Record<string, string> = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          };
          if (winnerToken) {
            winnerHeaders['Authorization'] = `Bearer ${winnerToken}`;
          }
          const response = await fetch(EXPO_PUSH_APIS[0], {
            method: 'POST',
            headers: winnerHeaders,
            body: JSON.stringify(pushMessages),
          });
          if (response.ok) {
            logger.info(`Sent winner notifications to ${pushMessages.length} users`);
          } else {
            logger.warn('Winner notification push failed:', await response.text());
          }
        } catch (pushErr) {
          logger.warn('Winner notification push error:', pushErr);
        }
      }

      logger.info(`🏆 Selected ${winners.length} winners for ${monthKey}`);
    } catch (error) {
      logger.error('❌ selectMonthlyWinners failed:', error);
    }
  }
);

// ==================== Admin Authentication ====================

/**
 * Cloud Function: Verify admin password securely on the server.
 * The password hash is stored in `appConfig/adminAuth` which is now
 * read-restricted by Firestore rules — only this function (running with
 * Admin SDK privileges) can read it.
 *
 * Returns a session token on success. The token is also stored in Firestore
 * so admin panel can verify it on subsequent loads.
 *
 * Input:  { passwordHash: string }  (SHA-256 hex hash, computed in browser)
 * Output: { sessionToken: string } on success
 *         throws 'permission-denied' on wrong password
 *         throws 'failed-precondition' if no admin password is configured
 */
export const verifyAdminPassword = functions.https.onCall(
  async (data: { passwordHash?: string }) => {
    try {
      const submittedHash = (data?.passwordHash || '').trim().toLowerCase();
      if (!submittedHash || submittedHash.length !== 64) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'A valid SHA-256 password hash is required.'
        );
      }

      const snap = await db.doc('appConfig/adminAuth').get();
      if (!snap.exists) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Admin authentication is not configured.'
        );
      }

      const stored = snap.data() as { passwordHash?: string } | undefined;
      const storedHash = (stored?.passwordHash || '').trim().toLowerCase();
      if (!storedHash) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Admin password hash is missing.'
        );
      }

      // Constant-time comparison to mitigate timing attacks
      if (storedHash.length !== submittedHash.length) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Incorrect password.'
        );
      }
      let mismatch = 0;
      for (let i = 0; i < storedHash.length; i++) {
        mismatch |= storedHash.charCodeAt(i) ^ submittedHash.charCodeAt(i);
      }
      if (mismatch !== 0) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Incorrect password.'
        );
      }

      // Generate fresh session token (rotated on every login)
      const sessionToken = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
      await db.doc('appConfig/adminAuth').set(
        {
          sessionToken,
          sessionIssuedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return { sessionToken };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) throw error;
      logger.error('verifyAdminPassword error:', error);
      throw new functions.https.HttpsError('internal', 'Authentication failed.');
    }
  }
);

/**
 * Cloud Function: Validate an existing admin session token.
 * Called by admin panel on page load to confirm the cached token is still valid.
 *
 * Input:  { sessionToken: string }
 * Output: { valid: boolean }
 */
export const validateAdminSession = functions.https.onCall(
  async (data: { sessionToken?: string }) => {
    try {
      const submitted = (data?.sessionToken || '').trim();
      if (!submitted) return { valid: false };

      const snap = await db.doc('appConfig/adminAuth').get();
      if (!snap.exists) return { valid: false };

      const stored = (snap.data() as { sessionToken?: string } | undefined)?.sessionToken || '';
      if (!stored || stored.length !== submitted.length) return { valid: false };

      // Constant-time compare
      let mismatch = 0;
      for (let i = 0; i < stored.length; i++) {
        mismatch |= stored.charCodeAt(i) ^ submitted.charCodeAt(i);
      }
      return { valid: mismatch === 0 };
    } catch (error) {
      logger.error('validateAdminSession error:', error);
      return { valid: false };
    }
  }
);

// ==================== Phase 2: FCM Prayer Push Fallback ====================

/**
 * Helper: send batch of Expo push messages with retry across mirror endpoints.
 */
async function sendExpoBatch(messages: ExpoPushMessage[], token: string): Promise<number> {
  if (messages.length === 0) return 0;
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  for (const endpoint of EXPO_PUSH_APIS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), EXPO_REQUEST_TIMEOUT_MS);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(messages),
        signal: controller.signal as any,
      });
      clearTimeout(timeoutId);
      if (!res.ok) continue;
      const json = (await res.json()) as ExpoResponse;
      const okCount = json.data.filter((t) => t.status === 'ok').length;
      return okCount;
    } catch (e) {
      logger.warn(`[fcm-prayer] endpoint ${endpoint} failed:`, e);
    }
  }
  return 0;
}

/**
 * Map app calculation method ID to adhan lib CalculationParameters.
 */
function buildAdhanParams(methodId: number, asrSchool: number) {
  // Lazy require so cold starts don't load adhan unless this function runs
  const adhan = require('adhan');
  let params;
  switch (methodId) {
    case 1: params = adhan.CalculationMethod.Karachi(); break;
    case 2: params = adhan.CalculationMethod.NorthAmerica(); break;
    case 3: params = adhan.CalculationMethod.MuslimWorldLeague(); break;
    case 4: params = adhan.CalculationMethod.UmmAlQura(); break;
    case 5: params = adhan.CalculationMethod.Egyptian(); break;
    case 8: params = adhan.CalculationMethod.Dubai(); break;
    case 9: params = adhan.CalculationMethod.Kuwait(); break;
    case 10: params = adhan.CalculationMethod.Qatar(); break;
    case 11: params = adhan.CalculationMethod.Singapore(); break;
    case 13: params = adhan.CalculationMethod.Turkey(); break;
    default: params = adhan.CalculationMethod.MuslimWorldLeague();
  }
  params.madhab = asrSchool === 1 ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;
  return params;
}

const PRAYER_NAMES_AR: Record<string, string> = {
  fajr: 'الفجر',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};

/**
 * Scheduled Cloud Function: runs every 15 minutes.
 * For every user with fcmToken + prayerLocation in Firestore:
 *   - compute next prayer using adhan lib
 *   - if prayer falls within next 15 minutes, send Expo push
 *   - mark sent so we don't duplicate within 30 min
 *
 * هذا "حزام أمان" — الجدولة المحلية لا تزال الأساسية، لكن لو فشلت
 * (force-stop, OEM kill, exact alarm denied) المستخدم يستلم push من السيرفر.
 */
export const sendPrayerPushFallback = onSchedule(
  { schedule: '*/15 * * * *', timeZone: 'UTC', secrets: ['EXPO_ACCESS_TOKEN'], memory: '512MiB' },
  async () => {
    const startedAt = Date.now();
    try {
      const token = expoAccessToken.value();
      const settingsSnap = await db.collection('userPrayerSettings').get();
      logger.info(`[fcm-prayer] فحص ${settingsSnap.size} مستخدم`);

      const adhan = require('adhan');
      const now = new Date();
      const messages: ExpoPushMessage[] = [];
      const updates: Promise<unknown>[] = [];

      for (const docSnap of settingsSnap.docs) {
        const uid = docSnap.id;
        const s = docSnap.data();
        if (s.disabled) continue;
        if (typeof s.latitude !== 'number' || typeof s.longitude !== 'number') continue;

        // اقرأ FCM token من users/{uid}
        let fcmToken: string | undefined;
        try {
          const userDoc = await db.doc(`users/${uid}`).get();
          fcmToken = userDoc.data()?.fcmToken;
          // احترم تعطيل الإشعارات من المستخدم
          const notifEnabled = userDoc.data()?.notificationsEnabled !== false;
          if (!notifEnabled) continue;
        } catch { continue; }
        if (!fcmToken || !fcmToken.startsWith('ExponentPushToken')) continue;

        try {
          const coords = new adhan.Coordinates(s.latitude, s.longitude);
          const params = buildAdhanParams(s.calculationMethod || 4, s.asrJuristic || 0);
          const todayPrayers = new adhan.PrayerTimes(coords, now, params);
          const tomorrowPrayers = new adhan.PrayerTimes(
            coords,
            new Date(now.getTime() + 24 * 60 * 60 * 1000),
            params,
          );
          const next = todayPrayers.nextPrayer();
          const nextTime: Date = next === adhan.Prayer.None
            ? tomorrowPrayers.fajr
            : todayPrayers.timeForPrayer(next);
          if (!nextTime) continue;

          const minutesUntil = (nextTime.getTime() - now.getTime()) / 60000;
          // ضمن 15 دقيقة قبل الصلاة بالضبط (نحن نشتغل كل 15 دقيقة → exactly one match)
          if (minutesUntil < 0 || minutesUntil > 15) continue;

          // De-duplication: تجاهل لو أرسلنا نفس الصلاة لنفس المستخدم خلال 30 دقيقة
          const prayerKey = String(next).toLowerCase();
          const dedupeId = `${uid}_${prayerKey}_${nextTime.toISOString().slice(0, 13)}`;
          const dedupeRef = db.doc(`fcmPrayerSent/${dedupeId}`);
          const dedupeSnap = await dedupeRef.get();
          if (dedupeSnap.exists) continue;

          const nameAr = PRAYER_NAMES_AR[prayerKey] ?? prayerKey;
          messages.push({
            to: fcmToken,
            title: `🕌 ${nameAr}`,
            body: `حان الآن وقت صلاة ${nameAr}`,
            sound: 'default',
            priority: 'high',
            data: {
              type: 'prayer_fallback',
              prayer: prayerKey,
              source: 'fcm',
            },
          });

          updates.push(
            dedupeRef.set({
              uid,
              prayer: prayerKey,
              sentAt: admin.firestore.FieldValue.serverTimestamp(),
              expireAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            }),
          );
        } catch (e) {
          logger.warn(`[fcm-prayer] فشل حساب ${uid}:`, e);
        }
      }

      // أرسل في batches من 100
      let sent = 0;
      for (let i = 0; i < messages.length; i += 100) {
        sent += await sendExpoBatch(messages.slice(i, i + 100), token);
      }
      await Promise.allSettled(updates);

      logger.info(`[fcm-prayer] أُرسل ${sent}/${messages.length} push في ${Date.now() - startedAt}ms`);
    } catch (e) {
      logger.error('[fcm-prayer] failed:', e);
    }
  },
);

/**
 * Cleanup function: حذف dedupe records الأقدم من 24 ساعة.
 * يشتغل يومياً عشان firestore ما يمتلئ.
 */
export const cleanupFcmPrayerDedupe = onSchedule(
  { schedule: '0 3 * * *', timeZone: 'UTC' },
  async () => {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const snap = await db
        .collection('fcmPrayerSent')
        .where('expireAt', '<', cutoff)
        .limit(500)
        .get();
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      logger.info(`[fcm-prayer-cleanup] حذف ${snap.size} سجل`);
    } catch (e) {
      logger.error('[fcm-prayer-cleanup] failed:', e);
    }
  },
);
