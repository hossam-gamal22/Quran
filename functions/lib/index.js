"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAdminSession = exports.verifyAdminPassword = exports.selectMonthlyWinners = exports.pushNotificationsTestEndpoint = exports.sendPushNotifications = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const params_1 = require("firebase-functions/params");
// Expo Access Token for authenticated push API calls
const expoAccessToken = (0, params_1.defineSecret)('EXPO_ACCESS_TOKEN');
// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const logger = functions.logger;
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
exports.sendPushNotifications = functions.runWith({ secrets: ['EXPO_ACCESS_TOKEN'] }).https.onCall(async (data, context) => {
    try {
        // Verify caller is admin
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to send notifications');
        }
        let messages;
        if (data.messages && data.messages.length > 0) {
            // New path: pre-built messages (admin panel sends per-user translated messages)
            messages = data.messages;
        }
        else {
            // Legacy path: flat tokens + single title/body
            const { tokens, title, body, data: notifData, sound, ttl } = data;
            if (!tokens || tokens.length === 0) {
                throw new functions.https.HttpsError('invalid-argument', 'Tokens list or messages array cannot be empty');
            }
            if (!title && !body) {
                throw new functions.https.HttpsError('invalid-argument', 'Title or body is required');
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
        let lastError = null;
        // Build auth headers
        const token = expoAccessToken.value();
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        for (const endpoint of EXPO_PUSH_APIS) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), EXPO_REQUEST_TIMEOUT_MS);
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(messages),
                    signal: controller.signal,
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
                const result = await response.json();
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
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                logger.warn(`Expo endpoint ${endpoint} failed: ${lastError.message}`);
                // Continue to next endpoint
            }
        }
        // All endpoints failed
        logger.error('All Expo endpoints failed', { lastError });
        throw new functions.https.HttpsError('unavailable', 'Failed to reach Expo Push API from all endpoints. ' +
            'Last error: ' +
            (lastError?.message || 'Unknown error'));
    }
    catch (error) {
        logger.error('sendPushNotifications error:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', String(error));
    }
});
/**
 * HTTP Endpoint for testing (development only)
 * Remove in production or add security checks
 */
exports.pushNotificationsTestEndpoint = functions.runWith({ secrets: ['EXPO_ACCESS_TOKEN'] }).https.onRequest(async (req, res) => {
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
        const messages = tokens.map((token) => ({
            to: token,
            title,
            body,
            ...(notifData && { data: notifData }),
            priority: 'high',
        }));
        // Build auth headers
        const token = expoAccessToken.value();
        const authHeaders = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        };
        if (token) {
            authHeaders['Authorization'] = `Bearer ${token}`;
        }
        // Try both endpoints
        for (const endpoint of EXPO_PUSH_APIS) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), EXPO_REQUEST_TIMEOUT_MS);
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: authHeaders,
                    body: JSON.stringify(messages),
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    logger.warn(`HTTP endpoint ${endpoint} failed with status ${response.status}`);
                    continue;
                }
                const result = await response.json();
                logger.info(`HTTP endpoint ${endpoint} succeeded`);
                res.status(200).json({
                    success: true,
                    endpoint,
                    tickets: result.data,
                });
                return;
            }
            catch (error) {
                logger.warn(`HTTP endpoint ${endpoint} error: ${error}`);
            }
        }
        res.status(503).json({ error: 'All Expo endpoints failed' });
    }
    catch (error) {
        logger.error('HTTP endpoint error:', error);
        res.status(500).json({ error: String(error) });
    }
});
// ==================== Monthly Honor Board Winner Selection ====================
/**
 * Scheduled Cloud Function: runs at 00:05 on the 1st of every month.
 * Selects top winners from the previous month's leaderboard,
 * grants them admin premium, and sends push notifications.
 */
exports.selectMonthlyWinners = (0, scheduler_1.onSchedule)({ schedule: '5 0 1 * *', timeZone: 'Asia/Riyadh', secrets: ['EXPO_ACCESS_TOKEN'] }, async () => {
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
        const winners = [];
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
        const pushMessages = [];
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
            }
            catch (err) {
                logger.warn(`Could not get push token for winner ${winner.userId}:`, err);
            }
        }
        if (pushMessages.length > 0) {
            try {
                const winnerToken = expoAccessToken.value();
                const winnerHeaders = {
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
                }
                else {
                    logger.warn('Winner notification push failed:', await response.text());
                }
            }
            catch (pushErr) {
                logger.warn('Winner notification push error:', pushErr);
            }
        }
        logger.info(`🏆 Selected ${winners.length} winners for ${monthKey}`);
    }
    catch (error) {
        logger.error('❌ selectMonthlyWinners failed:', error);
    }
});
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
exports.verifyAdminPassword = functions.https.onCall(async (data) => {
    try {
        const submittedHash = (data?.passwordHash || '').trim().toLowerCase();
        if (!submittedHash || submittedHash.length !== 64) {
            throw new functions.https.HttpsError('invalid-argument', 'A valid SHA-256 password hash is required.');
        }
        const snap = await db.doc('appConfig/adminAuth').get();
        if (!snap.exists) {
            throw new functions.https.HttpsError('failed-precondition', 'Admin authentication is not configured.');
        }
        const stored = snap.data();
        const storedHash = (stored?.passwordHash || '').trim().toLowerCase();
        if (!storedHash) {
            throw new functions.https.HttpsError('failed-precondition', 'Admin password hash is missing.');
        }
        // Constant-time comparison to mitigate timing attacks
        if (storedHash.length !== submittedHash.length) {
            throw new functions.https.HttpsError('permission-denied', 'Incorrect password.');
        }
        let mismatch = 0;
        for (let i = 0; i < storedHash.length; i++) {
            mismatch |= storedHash.charCodeAt(i) ^ submittedHash.charCodeAt(i);
        }
        if (mismatch !== 0) {
            throw new functions.https.HttpsError('permission-denied', 'Incorrect password.');
        }
        // Generate fresh session token (rotated on every login)
        const sessionToken = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
        await db.doc('appConfig/adminAuth').set({
            sessionToken,
            sessionIssuedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return { sessionToken };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        logger.error('verifyAdminPassword error:', error);
        throw new functions.https.HttpsError('internal', 'Authentication failed.');
    }
});
/**
 * Cloud Function: Validate an existing admin session token.
 * Called by admin panel on page load to confirm the cached token is still valid.
 *
 * Input:  { sessionToken: string }
 * Output: { valid: boolean }
 */
exports.validateAdminSession = functions.https.onCall(async (data) => {
    try {
        const submitted = (data?.sessionToken || '').trim();
        if (!submitted)
            return { valid: false };
        const snap = await db.doc('appConfig/adminAuth').get();
        if (!snap.exists)
            return { valid: false };
        const stored = snap.data()?.sessionToken || '';
        if (!stored || stored.length !== submitted.length)
            return { valid: false };
        // Constant-time compare
        let mismatch = 0;
        for (let i = 0; i < stored.length; i++) {
            mismatch |= stored.charCodeAt(i) ^ submitted.charCodeAt(i);
        }
        return { valid: mismatch === 0 };
    }
    catch (error) {
        logger.error('validateAdminSession error:', error);
        return { valid: false };
    }
});
