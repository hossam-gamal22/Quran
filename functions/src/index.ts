import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';

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
 * Cloud Function: Send push notifications via Expo
 * Called by admin panel instead of calling Expo directly
 * Operates from server, bypassing browser CORS restrictions
 *
 * Accepts either:
 *   { messages: ExpoPushMessage[] }  — pre-built per-user messages (multi-language)
 *   { tokens, title, body, ... }     — flat payload (single language, legacy)
 */
export const sendPushNotifications = functions.https.onCall(
  async (data: {
    messages?: ExpoPushMessage[];
    tokens?: string[];
    title?: string;
    body?: string;
    data?: Record<string, string>;
    sound?: string;
    ttl?: number;
  }, context) => {
    try {
      // Verify caller is admin
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User must be authenticated to send notifications'
        );
      }

      let messages: ExpoPushMessage[];

      if (data.messages && data.messages.length > 0) {
        // New path: pre-built messages (admin panel sends per-user translated messages)
        messages = data.messages;
      } else {
        // Legacy path: flat tokens + single title/body
        const { tokens, title, body, data: notifData, sound, ttl } = data;

        if (!tokens || tokens.length === 0) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Tokens list or messages array cannot be empty'
          );
        }

        if (!title && !body) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Title or body is required'
          );
        }

        messages = tokens.map((token) => ({
          to: token,
          title,
          body,
          ...(notifData && { data: notifData }),
          ...(sound && { sound }),
          ...(ttl && { ttl }),
          priority: 'high',
        }));
      }

      logger.info(`Sending ${messages.length} push notifications`);

      // Send via Expo with failover
      let lastError: Error | null = null;

      for (const endpoint of EXPO_PUSH_APIS) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), EXPO_REQUEST_TIMEOUT_MS);

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
            signal: controller.signal as any,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            logger.warn(`Expo endpoint ${endpoint} returned HTTP ${response.status}`, {
              errorText,
            });
            lastError = new Error(`HTTP ${response.status}`);
            continue; // Try next endpoint
          }

          const result = await response.json() as ExpoResponse;
          logger.info(`Successfully sent via ${endpoint}`, {
            messageCount: messages.length,
            successCount: result.data.filter((t) => t.status === 'ok').length,
          });

          return {
            success: true,
            endpoint,
            sentCount: messages.length,
            tickets: result.data,
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          logger.warn(`Expo endpoint ${endpoint} failed: ${lastError.message}`);
          // Continue to next endpoint
        }
      }

      // All endpoints failed
      logger.error('All Expo endpoints failed', { lastError });
      throw new functions.https.HttpsError(
        'unavailable',
        'Failed to reach Expo Push API from all endpoints. ' +
          'Last error: ' +
          (lastError?.message || 'Unknown error')
      );
    } catch (error) {
      logger.error('sendPushNotifications error:', error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError('internal', String(error));
    }
  }
);

/**
 * HTTP Endpoint for testing (development only)
 * Remove in production or add security checks
 */
export const pushNotificationsTestEndpoint = functions.https.onRequest(
  async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    try {
      const { tokens, title, body, data: notifData } = req.body;

      if (!tokens || tokens.length === 0) {
        res.status(400).json({ error: 'Tokens list cannot be empty' });
        return;
      }

      if (!title && !body) {
        res.status(400).json({ error: 'Title or body is required' });
        return;
      }

      logger.info(`[HTTP] Sending test notifications to ${tokens.length} tokens`);

      const messages: ExpoPushMessage[] = tokens.map((token: string) => ({
        to: token,
        title,
        body,
        ...(notifData && { data: notifData }),
        priority: 'high',
      }));

      // Try both endpoints
      for (const endpoint of EXPO_PUSH_APIS) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), EXPO_REQUEST_TIMEOUT_MS);

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
            signal: controller.signal as any,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            logger.warn(`HTTP endpoint ${endpoint} failed with status ${response.status}`);
            continue;
          }

          const result = await response.json() as ExpoResponse;
          logger.info(`HTTP endpoint ${endpoint} succeeded`);
          res.status(200).json({
            success: true,
            endpoint,
            tickets: result.data,
          });
          return;
        } catch (error) {
          logger.warn(`HTTP endpoint ${endpoint} error: ${error}`);
        }
      }

      res.status(503).json({ error: 'All Expo endpoints failed' });
    } catch (error) {
      logger.error('HTTP endpoint error:', error);
      res.status(500).json({ error: String(error) });
    }
  }
);

// ==================== Monthly Honor Board Winner Selection ====================

/**
 * Scheduled Cloud Function: runs at 00:05 on the 1st of every month.
 * Selects top winners from the previous month's leaderboard,
 * grants them admin premium, and sends push notifications.
 */
export const selectMonthlyWinners = onSchedule(
  { schedule: '5 0 1 * *', timeZone: 'Asia/Riyadh' },
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
        .limit(winnersCount)
        .get();

      const winners: Array<{ userId: string; displayName: string; score: number; rewardedAt: string; notified: boolean; premiumExpiresAt: string }> = [];
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + rewardDurationDays);

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const engagement = data.monthlyEngagement;
        if (engagement && engagement.score > 0) {
          winners.push({
            userId: docSnap.id,
            displayName: data.displayName || docSnap.id.slice(0, 8),
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
          const response = await fetch(EXPO_PUSH_APIS[0], {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
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
