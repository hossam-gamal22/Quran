/**
 * Device deduplication utility
 * Multi-layer fingerprinting to ensure one physical device = one unique user.
 *
 * Layer 1: deviceName + deviceBrand + platform (strongest signal)
 * Layer 2: fcmToken (same push token = same device)
 * Layer 3: displayName + platform + country (same person on same platform/country)
 */

export interface DeviceUser {
  id: string;
  platform?: string;
  deviceName?: string;
  deviceBrand?: string;
  displayName?: string;
  country?: string;
  fcmToken?: string;
  lastActive?: unknown;
  createdAt?: unknown;
  placeholder?: boolean;
  [key: string]: unknown;
}

/**
 * Extract a comparable timestamp from Firestore timestamp or string.
 * Returns epoch ms, or 0 if unparseable.
 */
function toEpoch(ts: unknown): number {
  if (!ts) return 0;
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as any).toDate === 'function') {
    return (ts as any).toDate().getTime();
  }
  if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
    return (ts as { seconds: number }).seconds * 1000;
  }
  if (typeof ts === 'string') {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }
  if (ts instanceof Date) return ts.getTime();
  return 0;
}

const GENERIC_NAMES = new Set([
  'unknown device',
  'unknown',
  '',
  // iOS commonly reports these generic names for many different devices, so
  // using them as a fingerprint collapses unrelated iPhone/iPad users together.
  'iphone',
  'ipad',
  'ipod touch',
]);

/**
 * Pick the most recently active user from a group.
 */
function pickMostRecent<T extends DeviceUser>(group: T[]): T {
  if (group.length === 1) return group[0];
  group.sort((a, b) => {
    const aTime = toEpoch(a.lastActive) || toEpoch(a.createdAt);
    const bTime = toEpoch(b.lastActive) || toEpoch(b.createdAt);
    return bTime - aTime;
  });
  return group[0];
}

/**
 * Deduplicate users so that one physical device = one user.
 * Uses multi-layer fingerprinting for robust matching.
 *
 * @returns uniqueUsers — the deduplicated list
 * @returns duplicateCount — how many duplicates were removed
 */
export function deduplicateByDevice<T extends DeviceUser>(users: T[]): {
  uniqueUsers: T[];
  duplicateCount: number;
  /** Maps each visible user's ID → all doc IDs in the same device group */
  groupMap: Map<string, string[]>;
} {
  // Union-Find for merging groups across different fingerprint layers
  const parent = new Map<number, number>();
  function find(i: number): number {
    while (parent.get(i) !== i) {
      const p = parent.get(i)!;
      parent.set(i, parent.get(p)!); // path compression
      i = p;
    }
    return i;
  }
  function union(a: number, b: number) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  // Initialize: each user is its own group
  for (let i = 0; i < users.length; i++) {
    parent.set(i, i);
  }

  // Layer 1: deviceName + deviceBrand + platform
  const deviceNameMap = new Map<string, number>();
  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const name = (u.deviceName || '').trim().toLowerCase();
    const brand = (u.deviceBrand || '').trim().toLowerCase();
    const platform = (u.platform || '').trim().toLowerCase();

    if (!GENERIC_NAMES.has(name)) {
      const key = `device::${platform}::${name}::${brand}`;
      const existing = deviceNameMap.get(key);
      if (existing !== undefined) {
        union(i, existing);
      } else {
        deviceNameMap.set(key, i);
      }
    }
  }

  // Layer 2: fcmToken (same push token = definitely same device)
  const tokenMap = new Map<string, number>();
  for (let i = 0; i < users.length; i++) {
    const token = (users[i].fcmToken || '').trim();
    if (token) {
      const existing = tokenMap.get(token);
      if (existing !== undefined) {
        union(i, existing);
      } else {
        tokenMap.set(token, i);
      }
    }
  }

  // Layer 3: displayName + platform + country (same person, same context)
  const nameCountryMap = new Map<string, number>();
  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const displayName = ((u.displayName || (u as any).name || '') as string).trim();
    const platform = (u.platform || '').trim().toLowerCase();
    const country = ((u.country || '') as string).trim().toUpperCase();

    if (displayName && displayName !== '-' && platform && country) {
      const key = `person::${platform}::${displayName}::${country}`;
      const existing = nameCountryMap.get(key);
      if (existing !== undefined) {
        union(i, existing);
      } else {
        nameCountryMap.set(key, i);
      }
    }
  }

  // Collect groups by root
  const groups = new Map<number, T[]>();
  for (let i = 0; i < users.length; i++) {
    const root = find(i);
    const arr = groups.get(root);
    if (arr) {
      arr.push(users[i]);
    } else {
      groups.set(root, [users[i]]);
    }
  }

  const uniqueUsers: T[] = [];
  const groupMap = new Map<string, string[]>();
  for (const group of groups.values()) {
    const winner = pickMostRecent(group);
    uniqueUsers.push(winner);
    groupMap.set(winner.id, group.map(u => u.id));
  }

  return {
    uniqueUsers,
    duplicateCount: users.length - uniqueUsers.length,
    groupMap,
  };
}
