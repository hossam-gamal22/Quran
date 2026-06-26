// admin-panel/src/utils/app-icon-audit.ts
// Append-only audit trail for app-icon changes. Writes to the top-level
// `appIconAuditLog` collection (see firestore.rules). Fire-and-forget — a
// logging hiccup must never block the admin's actual save (mirrors the
// content-version.ts philosophy).

import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  limit as fsLimit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

const COLLECTION = 'appIconAuditLog';

export type IconAuditAction =
  | 'manual_switch' // instant manual override applied
  | 'schedule_add' // a scheduled override created
  | 'schedule_remove' // a scheduled override deleted
  | 'schedule_toggle' // enabled/disabled a schedule
  | 'clear_override' // removed all manual/scheduled overrides
  | 'revert_default' // reset to language default
  | 'mode_change' // auto / manual / language_only
  | 'season_map' // changed a season→icon mapping or enabled/disabled a season
  | 'library_toggle' // enabled/disabled an icon in the library
  | 'publish' // saved + bumped version (announce)
  | 'save'; // saved without announce

export interface IconAuditEntry {
  action: IconAuditAction;
  from?: string | null;
  to?: string | null;
  mode?: string | null;
  announce?: boolean;
  detail?: string;
}

export interface IconAuditRecord extends IconAuditEntry {
  id: string;
  by: string;
  at: Date | null;
  automatic: boolean;
}

/** Append an audit entry. Never throws. */
export async function logIconAudit(entry: IconAuditEntry): Promise<void> {
  try {
    await addDoc(collection(db, COLLECTION), {
      ...entry,
      from: entry.from ?? null,
      to: entry.to ?? null,
      mode: entry.mode ?? null,
      announce: entry.announce ?? false,
      detail: entry.detail ?? '',
      by: auth.currentUser?.uid ? `admin:${auth.currentUser.uid}` : 'admin',
      automatic: false, // every admin-panel action is manual by definition
      at: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[app-icon-audit] log failed', err);
  }
}

/** Subscribe to the newest audit entries (default 50), newest first. */
export function subscribeIconAudit(
  onUpdate: (records: IconAuditRecord[]) => void,
  max = 50
): () => void {
  const q = query(collection(db, COLLECTION), orderBy('at', 'desc'), fsLimit(max));
  return onSnapshot(
    q,
    (snap) => {
      const records: IconAuditRecord[] = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        const at = data.at instanceof Timestamp ? data.at.toDate() : null;
        return {
          id: d.id,
          action: data.action as IconAuditAction,
          from: (data.from as string) ?? null,
          to: (data.to as string) ?? null,
          mode: (data.mode as string) ?? null,
          announce: Boolean(data.announce),
          detail: (data.detail as string) ?? '',
          by: (data.by as string) ?? 'admin',
          automatic: Boolean(data.automatic),
          at,
        };
      });
      onUpdate(records);
    },
    (err) => console.warn('[app-icon-audit] subscribe failed', err)
  );
}
