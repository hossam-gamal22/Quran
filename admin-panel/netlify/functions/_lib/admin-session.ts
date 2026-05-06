// admin-panel/netlify/functions/_lib/admin-session.ts
// Shared helper for verifying admin session tokens issued by verify-admin.ts.
//
// Token format: `${expiresAt}.${nonce}.${hmac_sha256(expiresAt.nonce, ADMIN_SESSION_SECRET)}`
//
// Used by any Netlify function that performs privileged actions on behalf of
// the admin panel (e.g. expo-push, future admin-write proxy, etc.).

import { createHmac, timingSafeEqual } from 'crypto';

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function verifyAdminSessionToken(token: string | undefined | null): {
  valid: boolean;
  reason?: 'missing' | 'malformed' | 'expired' | 'bad-signature' | 'not-configured';
} {
  const secret = (process.env.ADMIN_SESSION_SECRET || '').trim();
  if (!secret || secret.length < 32) {
    return { valid: false, reason: 'not-configured' };
  }
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'missing' };
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, reason: 'malformed' };
  }
  const [expiresAtStr, nonce, signature] = parts;
  const expiresAt = parseInt(expiresAtStr, 10);
  if (!Number.isFinite(expiresAt)) {
    return { valid: false, reason: 'malformed' };
  }
  if (expiresAt < Date.now()) {
    return { valid: false, reason: 'expired' };
  }
  const expected = sign(`${expiresAtStr}.${nonce}`, secret);
  if (!safeEqual(expected, signature)) {
    return { valid: false, reason: 'bad-signature' };
  }
  return { valid: true };
}

/**
 * Extracts a Bearer token from the Authorization header (case-insensitive).
 */
export function extractBearerToken(headers: Record<string, string | undefined>): string | null {
  // Netlify lowercases headers, but be defensive
  const auth =
    headers['authorization'] ||
    headers['Authorization'] ||
    headers['AUTHORIZATION'] ||
    '';
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}
