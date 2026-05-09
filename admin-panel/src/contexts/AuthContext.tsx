import React, { useState, useEffect, ReactNode } from 'react';
import { AuthContext } from './auth-context';

const SESSION_KEY = 'rooh_admin_session';
const VERIFY_URL = '/api/verify-admin';

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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) {
      setLoading(false);
      return;
    }
    callVerifyAdmin({ mode: 'validate', sessionToken: session })
      .then(({ ok, data }) => {
        if (ok && data?.valid) {
          setAuthenticated(true);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      })
      .catch(() => {
        // Network/offline — trust local session for offline editing
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
      throw new Error('network-error');
    }
    if (result.ok && result.data?.sessionToken) {
      localStorage.setItem(SESSION_KEY, result.data.sessionToken);
      setAuthenticated(true);
      return;
    }
    if (result.status === 401) {
      throw new Error('wrong-password');
    }
    if (result.status === 500 && result.data?.error === 'not-configured') {
      throw new Error('not-configured');
    }
    throw new Error('network-error');
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ authenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
