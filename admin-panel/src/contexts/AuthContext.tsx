import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const SESSION_KEY = 'rooh_admin_session';
const FIRESTORE_DOC = 'appConfig/adminAuth';

interface AuthContextValue {
  authenticated: boolean;
  loading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function hashPassword(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check localStorage session on mount
  useEffect(() => {
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      // Verify session is still valid (hash matches Firestore)
      getDoc(doc(db, FIRESTORE_DOC))
        .then(snap => {
          if (snap.exists() && snap.data().sessionToken === session) {
            setAuthenticated(true);
          } else {
            localStorage.removeItem(SESSION_KEY);
          }
        })
        .catch(() => {
          // Offline — trust local session
          setAuthenticated(true);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (password: string) => {
    const hash = await hashPassword(password);
    const snap = await getDoc(doc(db, FIRESTORE_DOC));

    if (!snap.exists() || snap.data().passwordHash !== hash) {
      throw new Error('wrong-password');
    }

    // Rotate session token on each login
    const sessionToken = crypto.randomUUID();
    await setDoc(doc(db, FIRESTORE_DOC), { sessionToken }, { merge: true });
    localStorage.setItem(SESSION_KEY, sessionToken);
    setAuthenticated(true);
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

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
