// admin-panel/src/utils/content-version.ts
// Bumps a content type's version in `appConfig/contentManifest` so the mobile
// app knows to re-fetch that collection. Without a bump the app serves its
// local cache and skips the (potentially hundreds of docs) read entirely.
//
// Call this once after any successful write/delete to a managed collection,
// e.g. `await bumpContentVersion('azkar')` after saving adhkar.
//
// Fire-and-forget friendly: failures are swallowed so a manifest hiccup never
// blocks the admin's save. The app's 24h safety TTL covers a missed bump.

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const MANIFEST_DOC_ID = 'contentManifest';

export async function bumpContentVersion(key: string): Promise<void> {
  try {
    await setDoc(
      doc(db, 'appConfig', MANIFEST_DOC_ID),
      { [key]: Date.now(), updatedAt: serverTimestamp() },
      { merge: true },
    );
  } catch (err) {
    console.warn('[content-version] bump failed for', key, err);
  }
}
