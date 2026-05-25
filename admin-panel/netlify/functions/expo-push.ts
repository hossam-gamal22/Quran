// admin-panel/netlify/functions/expo-push.ts
// Proxy admin → Expo Push API.
//
// SECURITY (Phase A1):
//   • Requires `Authorization: Bearer <admin-session-token>` header
//   • Token is the HMAC-signed session issued by `verify-admin`
//   • CORS restricted to known admin origins (configurable via ADMIN_PANEL_ORIGINS)
//   • Without a valid token the function returns 401 (no Expo call is made)

import type { Handler } from '@netlify/functions';
import { verifyAdminSessionToken, extractBearerToken } from './_lib/admin-session';

const EXPO_PUSH_API = 'https://api.expo.dev/v2/push/send';
const EXPO_RECEIPTS_API = 'https://api.expo.dev/v2/push/getReceipts';

function resolveAllowedOrigin(requestOrigin: string | undefined): string {
  const raw = (process.env.ADMIN_PANEL_ORIGINS || '').trim();
  if (!raw) return ''; // No allow-list configured → no CORS header (same-origin only)
  if (raw === '*') return '*';
  const allowed = raw.split(',').map((o) => o.trim()).filter(Boolean);
  if (requestOrigin && allowed.includes(requestOrigin)) return requestOrigin;
  return allowed[0] || '';
}

function corsHeaders(requestOrigin: string | undefined): Record<string, string> {
  const allow = resolveAllowedOrigin(requestOrigin);
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  };
  if (allow) headers['Access-Control-Allow-Origin'] = allow;
  return headers;
}

const handler: Handler = async (event) => {
  const requestOrigin = (event.headers?.origin || event.headers?.Origin) as string | undefined;
  const cors = corsHeaders(requestOrigin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'method-not-allowed' }),
    };
  }

  // ─── Auth check (NEW in Phase A1) ──────────────────────────────────
  const token = extractBearerToken(event.headers as Record<string, string | undefined>);
  const verdict = verifyAdminSessionToken(token);
  if (!verdict.valid) {
    return {
      statusCode: verdict.reason === 'not-configured' ? 500 : 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: verdict.reason === 'not-configured' ? 'not-configured' : 'unauthorized',
        detail:
          verdict.reason === 'not-configured'
            ? 'ADMIN_SESSION_SECRET is missing or too short'
            : `Admin session ${verdict.reason || 'invalid'}`,
      }),
    };
  }

  // ─── Forward to Expo ───────────────────────────────────────────────
  const expoToken = process.env.EXPO_ACCESS_TOKEN;
  if (!expoToken) {
    return {
      statusCode: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'EXPO_ACCESS_TOKEN not configured' }),
    };
  }

  try {
    const parsedBody = event.body ? JSON.parse(event.body) : [];
    const isReceiptRequest =
      parsedBody &&
      typeof parsedBody === 'object' &&
      !Array.isArray(parsedBody) &&
      parsedBody.action === 'receipts';
    const expoUrl = isReceiptRequest ? EXPO_RECEIPTS_API : EXPO_PUSH_API;
    const expoBody = isReceiptRequest
      ? JSON.stringify({ ids: Array.isArray(parsedBody.ids) ? parsedBody.ids : [] })
      : event.body || '[]';

    const response = await fetch(expoUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${expoToken}`,
      },
      body: expoBody,
    });

    const result = await response.json();

    return {
      statusCode: response.ok ? 200 : response.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error: any) {
    return {
      statusCode: 502,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Failed to reach Expo Push API' }),
    };
  }
};

export { handler };
