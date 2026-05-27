import React, { useState, useEffect, ReactNode } from 'react';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { AuthContext } from './auth-context';
import { auth } from '../firebase';

const SESSION_KEY = 'rooh_admin_session';
const USE_DIRECT_NETLIFY_FUNCTIONS =
  import.meta.env.PROD ||
  (import.meta.env.VITE_NETLIFY_FUNCTIONS_DIRECT as string | undefined) === 'true';
const VERIFY_URL = USE_DIRECT_NETLIFY_FUNCTIONS
  ? '/.netlify/functions/verify-admin'
  : '/api/verify-admin';
const LOCAL_DEV_SESSION_PREFIX = 'local-dev-session:';

function isLocalDevAuthEnabled(): boolean {
  return Boolean(
    (import.meta.env.DEV || USE_DIRECT_NETLIFY_FUNCTIONS) &&
    typeof window !== 'undefined' &&
    ['127.0.0.1', 'localhost'].includes(window.location.hostname)
  );
}

function issueLocalDevSession(): string {
  return `${LOCAL_DEV_SESSION_PREFIX}${Date.now()}`;
}

function isLocalDevSession(session: string | null): boolean {
  return Boolean(isLocalDevAuthEnabled() && session?.startsWith(LOCAL_DEV_SESSION_PREFIX));
}

async function verifyLocalDevPassword(passwordHash: string): Promise<boolean> {
  const expected = ((import.meta.env.VITE_LOCAL_ADMIN_PASSWORD_HASH as string | undefined) || '').trim().toLowerCase();
  if (!expected) return true;
  return expected === passwordHash;
}

async function hashPassword(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface VerifyAdminResponse {
  valid?: boolean;
  sessionToken?: string;
  firebaseCustomToken?: string;
  expiresInHours?: number;
  error?: string;
  detail?: string;
}

async function callVerifyAdmin(payload: object): Promise<{ ok: boolean; data: VerifyAdminResponse | null; status: number }> {
  const res = await fetch(VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let data: VerifyAdminResponse | null = null;
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }
  return { ok: res.ok, data, status: res.status };
}

async function signInFirebaseAdmin(customToken?: string | null): Promise<void> {
  if (!customToken) {
    if (import.meta.env.PROD) {
      throw new Error('firebase-admin-token-missing');
    }
    return;
  }
  await signInWithCustomToken(auth, customToken);
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) {
      setLoading(false);
      return;
    }
    if (isLocalDevSession(session)) {
      setAuthenticated(true);
      setLoading(false);
      return;
    }
    callVerifyAdmin({ mode: 'validate', sessionToken: session })
      .then(async ({ ok, data }) => {
        if (ok && data?.valid) {
          await signInFirebaseAdmin(data.firebaseCustomToken);
          setAuthenticated(true);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      })
      .catch((error) => {
        if ((error as Error)?.message === 'firebase-admin-token-missing') {
          localStorage.removeItem(SESSION_KEY);
          setAuthenticated(false);
          return;
        }
        // Network/offline — trust local session for read-only/offline viewing.
        // Firestore/Storage admin writes still require Firebase admin auth.
        setAuthenticated(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (password: string) => {
    const passwordHash = await hashPassword(password);
    let result: { ok: boolean; data: VerifyAdminResponse | null; status: number };
    try {
      result = await callVerifyAdmin({ mode: 'login', passwordHash });
    } catch {
      if (isLocalDevAuthEnabled() && await verifyLocalDevPassword(passwordHash)) {
        localStorage.setItem(SESSION_KEY, issueLocalDevSession());
        setAuthenticated(true);
        return;
      }
      throw new Error('network-error');
    }
    if (result.ok && result.data?.sessionToken) {
      await signInFirebaseAdmin(result.data.firebaseCustomToken);
      localStorage.setItem(SESSION_KEY, result.data.sessionToken);
      setAuthenticated(true);
      return;
    }
    if (result.status === 404 && isLocalDevAuthEnabled() && await verifyLocalDevPassword(passwordHash)) {
      localStorage.setItem(SESSION_KEY, issueLocalDevSession());
      setAuthenticated(true);
      return;
    }
    if (result.status === 401) {
      throw new Error('wrong-password');
    }
    if (
      result.status === 500 &&
      result.data?.error === 'not-configured' &&
      isLocalDevAuthEnabled() &&
      await verifyLocalDevPassword(passwordHash)
    ) {
      localStorage.setItem(SESSION_KEY, issueLocalDevSession());
      setAuthenticated(true);
      return;
    }
    if (result.status === 500 && result.data?.error === 'not-configured') {
      throw new Error('not-configured');
    }
    throw new Error('network-error');
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    signOut(auth).catch(() => {});
    setAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ authenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
