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
exports.pushNotificationsTestEndpoint = exports.sendPushNotifications = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
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
exports.sendPushNotifications = functions.https.onCall(async (data, context) => {
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
exports.pushNotificationsTestEndpoint = functions.https.onRequest(async (req, res) => {
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
