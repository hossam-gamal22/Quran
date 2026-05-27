// admin-panel/netlify/functions/verify-admin.ts
// Verifies admin password against ADMIN_PASSWORD_HASH env var (SHA-256 hex).
// Issues an HMAC-signed session token that the client stores in localStorage
// and presents on subsequent loads.
//
// Required Netlify environment variables:
//   ADMIN_PASSWORD_HASH    — SHA-256 hex of the admin password
//   ADMIN_SESSION_SECRET   — random ≥32-char string used to sign session tokens
//
// Optional:
//   ADMIN_SESSION_TTL_HOURS — default 24

import type { Handler } from '@netlify/functions';
import { createHmac, timingSafeEqual } from 'crypto';
import { createFirebaseAdminCustomToken } from './_lib/firebase-admin';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

function issueToken(secret: string, ttlMs: number): string {
  const expiresAt = Date.now() + ttlMs;
  const nonce = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const payload = `${expiresAt}.${nonce}`;
  const signature = sign(payload, secret);
  return `${payload}.${signature}`;
}

function verifyToken(token: string, secret: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [expiresAtStr, nonce, signature] = parts;
  const expiresAt = parseInt(expiresAtStr, 10);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  const expected = sign(`${expiresAtStr}.${nonce}`, secret);
  return safeEqual(expected, signature);
}

function issueFirebaseCustomToken(): string | null {
  try {
    return createFirebaseAdminCustomToken();
  } catch (error) {
    console.error('Failed to issue Firebase admin custom token:', error);
    return null;
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'method-not-allowed' }) };
  }

  const adminHash = (process.env.ADMIN_PASSWORD_HASH || '').trim().toLowerCase();
  const secret = (process.env.ADMIN_SESSION_SECRET || '').trim();
  const ttlHours = parseInt(process.env.ADMIN_SESSION_TTL_HOURS || '24', 10);
  const ttlMs = (Number.isFinite(ttlHours) && ttlHours > 0 ? ttlHours : 24) * 60 * 60 * 1000;

  if (!adminHash || adminHash.length !== 64) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'not-configured', detail: 'ADMIN_PASSWORD_HASH missing or invalid' }),
    };
  }
  if (!secret || secret.length < 32) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'not-configured', detail: 'ADMIN_SESSION_SECRET missing or too short' }),
    };
  }

  let body: { mode?: string; passwordHash?: string; sessionToken?: string };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'invalid-json' }) };
  }

  const mode = body.mode || 'login';

  if (mode === 'validate') {
    const token = (body.sessionToken || '').trim();
    if (!token) {
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ valid: false }) };
    }
    const valid = verifyToken(token, secret);
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        valid,
        ...(valid ? { firebaseCustomToken: issueFirebaseCustomToken() } : {}),
      }),
    };
  }

  // Default: login
  const submittedHash = (body.passwordHash || '').trim().toLowerCase();
  if (!submittedHash || submittedHash.length !== 64) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'invalid-hash' }) };
  }

  if (!safeEqual(adminHash, submittedHash)) {
    // Generic delay to mitigate timing/throughput attacks
    await new Promise((r) => setTimeout(r, 250));
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'wrong-password' }) };
  }

  const sessionToken = issueToken(secret, ttlMs);
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      sessionToken,
      firebaseCustomToken: issueFirebaseCustomToken(),
      expiresInHours: ttlHours,
    }),
  };
};
