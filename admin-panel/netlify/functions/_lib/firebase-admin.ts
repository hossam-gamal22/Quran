// admin-panel/netlify/functions/_lib/firebase-admin.ts
// Minimal Firestore REST client — bypasses firebase-admin entirely to keep the
// Netlify function bundle small and dep-free. Auths with a service-account JWT.
//
// Env vars (same as before):
//   FIREBASE_PROJECT_ID
//   FIREBASE_CLIENT_EMAIL
//   FIREBASE_PRIVATE_KEY (with literal "\n" preserved)
// Or alternatively:
//   FIREBASE_SERVICE_ACCOUNT_JSON

import { createSign } from 'node:crypto';

interface ServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string }
  | { mapValue: { fields: Record<string, FirestoreValue> } }
  | { arrayValue: { values?: FirestoreValue[] } };

export interface FirestoreDoc {
  id: string;
  data: Record<string, any>;
  exists: boolean;
}

export const SERVER_TIMESTAMP = Symbol.for('firestore/serverTimestamp');

function parseServiceAccount(): ServiceAccount {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (raw) {
    const decoded = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    if (parsed.project_id && parsed.client_email && parsed.private_key) {
      return {
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: String(parsed.private_key).replace(/\\n/g, '\n'),
      };
    }
  }
  const projectId = (process.env.FIREBASE_PROJECT_ID || '').trim();
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').trim().replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin credentials missing. Set FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY, or FIREBASE_SERVICE_ACCOUNT_JSON.'
    );
  }
  return { projectId, clientEmail, privateKey };
}

// ─── Auth ──────────────────────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return cachedToken.token;
  }
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claims = {
    iss: sa.clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const data = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(data);
  const signature = signer.sign(sa.privateKey).toString('base64url');
  const jwt = `${data}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google token exchange failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, expiresAt: now + json.expires_in };
  return cachedToken.token;
}

// ─── Value (de)serialization ───────────────────────────────────────────

function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === SERVER_TIMESTAMP) {
    // serverTimestamp can't be expressed in plain document values — for our
    // use case (one-shot writes) we substitute current ISO string.
    return { timestampValue: new Date().toISOString() };
  }
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === 'object') {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function fromFirestoreValue(value: FirestoreValue | undefined): any {
  if (!value) return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return new Date(value.timestampValue);
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in value) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value.mapValue.fields || {})) {
      out[k] = fromFirestoreValue(v);
    }
    return out;
  }
  return undefined;
}

function fromFirestoreDoc(doc: { name?: string; fields?: Record<string, FirestoreValue> } | null | undefined, fallbackId = ''): FirestoreDoc {
  if (!doc || !doc.name) return { id: fallbackId, data: {}, exists: false };
  const id = doc.name.split('/').pop() || fallbackId;
  const data: Record<string, any> = {};
  for (const [k, v] of Object.entries(doc.fields || {})) {
    data[k] = fromFirestoreValue(v);
  }
  return { id, data, exists: true };
}

// ─── Client ────────────────────────────────────────────────────────────

export interface FirestoreClient {
  projectId: string;
  listCollection(path: string): Promise<FirestoreDoc[]>;
  getDoc(collectionPath: string, docId: string): Promise<FirestoreDoc>;
  batchGetDocs(collectionPath: string, docIds: string[]): Promise<FirestoreDoc[]>;
  setDoc(collectionPath: string, docId: string, data: Record<string, any>): Promise<void>;
  createDoc(collectionPath: string, data: Record<string, any>): Promise<string>;
  batchWrite(writes: Array<{ collectionPath: string; docId: string; data: Record<string, any> }>): Promise<void>;
}

let cachedClient: FirestoreClient | null = null;

export function getDb(): FirestoreClient {
  if (cachedClient) return cachedClient;
  const sa = parseServiceAccount();

  const baseUrl = `https://firestore.googleapis.com/v1/projects/${sa.projectId}/databases/(default)/documents`;

  async function authHeader(): Promise<Record<string, string>> {
    const token = await getAccessToken(sa);
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  cachedClient = {
    projectId: sa.projectId,

    async listCollection(path: string): Promise<FirestoreDoc[]> {
      const headers = await authHeader();
      const docs: FirestoreDoc[] = [];
      let pageToken: string | undefined;
      do {
        const url = new URL(`${baseUrl}/${path}`);
        url.searchParams.set('pageSize', '300');
        if (pageToken) url.searchParams.set('pageToken', pageToken);
        const res = await fetch(url.toString(), { headers });
        if (!res.ok) {
          if (res.status === 404) break; // empty collection
          throw new Error(`Firestore list failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
        }
        const json = (await res.json()) as { documents?: any[]; nextPageToken?: string };
        for (const doc of json.documents || []) {
          docs.push(fromFirestoreDoc(doc));
        }
        pageToken = json.nextPageToken;
      } while (pageToken);
      return docs;
    },

    async getDoc(collectionPath: string, docId: string): Promise<FirestoreDoc> {
      const headers = await authHeader();
      const res = await fetch(`${baseUrl}/${collectionPath}/${encodeURIComponent(docId)}`, { headers });
      if (res.status === 404) return { id: docId, data: {}, exists: false };
      if (!res.ok) throw new Error(`Firestore getDoc failed (${res.status})`);
      return fromFirestoreDoc(await res.json(), docId);
    },

    async batchGetDocs(collectionPath: string, docIds: string[]): Promise<FirestoreDoc[]> {
      if (docIds.length === 0) return [];
      const headers = await authHeader();
      const documents = docIds.map((id) =>
        `projects/${sa.projectId}/databases/(default)/documents/${collectionPath}/${id}`
      );
      // batchGet supports up to ~1000 docs per call; we chunk at 100 to stay well within limits
      const out: FirestoreDoc[] = new Array(docIds.length).fill(null).map((_, i) => ({
        id: docIds[i], data: {}, exists: false,
      }));
      const indexByName = new Map<string, number>();
      documents.forEach((name, i) => indexByName.set(name, i));

      const CHUNK = 100;
      for (let i = 0; i < documents.length; i += CHUNK) {
        const slice = documents.slice(i, i + CHUNK);
        const res = await fetch(`https://firestore.googleapis.com/v1/projects/${sa.projectId}/databases/(default)/documents:batchGet`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ documents: slice }),
        });
        if (!res.ok) throw new Error(`Firestore batchGet failed (${res.status})`);
        // Response is streaming JSON-array of objects with `found` or `missing`
        const text = await res.text();
        // batchGet returns a JSON array
        const parsed = JSON.parse(text) as Array<{ found?: any; missing?: string }>;
        for (const entry of parsed) {
          if (entry.found) {
            const idx = indexByName.get(entry.found.name);
            if (idx !== undefined) out[idx] = fromFirestoreDoc(entry.found);
          }
          // missing entries leave the placeholder (exists: false)
        }
      }
      return out;
    },

    async setDoc(collectionPath: string, docId: string, data: Record<string, any>): Promise<void> {
      const headers = await authHeader();
      const fields: Record<string, FirestoreValue> = {};
      for (const [k, v] of Object.entries(data)) fields[k] = toFirestoreValue(v);
      const url = `${baseUrl}/${collectionPath}/${encodeURIComponent(docId)}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields }),
      });
      if (!res.ok) throw new Error(`Firestore setDoc failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    },

    async createDoc(collectionPath: string, data: Record<string, any>): Promise<string> {
      const headers = await authHeader();
      const fields: Record<string, FirestoreValue> = {};
      for (const [k, v] of Object.entries(data)) fields[k] = toFirestoreValue(v);
      const res = await fetch(`${baseUrl}/${collectionPath}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fields }),
      });
      if (!res.ok) throw new Error(`Firestore createDoc failed (${res.status})`);
      const json = (await res.json()) as { name?: string };
      return (json.name || '').split('/').pop() || '';
    },

    async batchWrite(writes): Promise<void> {
      if (writes.length === 0) return;
      const headers = await authHeader();
      // BatchWrite supports up to 500 ops
      const CHUNK = 400;
      for (let i = 0; i < writes.length; i += CHUNK) {
        const slice = writes.slice(i, i + CHUNK);
        const body = {
          writes: slice.map((w) => ({
            update: {
              name: `projects/${sa.projectId}/databases/(default)/documents/${w.collectionPath}/${w.docId}`,
              fields: Object.fromEntries(
                Object.entries(w.data).map(([k, v]) => [k, toFirestoreValue(v)])
              ),
            },
          })),
        };
        const res = await fetch(`https://firestore.googleapis.com/v1/projects/${sa.projectId}/databases/(default)/documents:batchWrite`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Firestore batchWrite failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
      }
    },
  };

  return cachedClient;
}
