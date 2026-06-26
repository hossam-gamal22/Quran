// lib/comment-notifications.ts
// Cross-user "someone replied to your comment" notifications, surfaced in-app
// on the recipient's next app open. Backed by a public Firestore collection —
// during the anonymous-auth outage the recipient is matched by device userId,
// not Firebase Auth uid (content is already public comment text anyway).

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit as fsLimit,
  getDocs,
  getCountFromServer,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase-config';

// Notifications expire after this window — `expiresAt` backs a Firestore TTL
// policy (console → Firestore → TTL on `commentNotifications.expiresAt`) so the
// collection doesn't grow unbounded per user.
const NOTIFICATION_TTL_DAYS = 90;

export type CommentNotificationType = 'reply' | 'like';

export interface ReplyNotification {
  id: string;
  type: CommentNotificationType;
  toUserId: string;
  fromName: string;
  storyId: string;
  storyTitle: string;
  commentId: string;
  replyText: string;
  createdAt: Timestamp | null;
  read: boolean;
}

const col = () => collection(db, 'commentNotifications');

/**
 * Write a comment notification for the comment author. `type` is 'reply' when
 * someone replied, or 'like' when someone liked the comment. `text` is a
 * context snippet (the reply text, or the liked comment's text).
 */
export const createCommentNotification = async (data: {
  type: CommentNotificationType;
  toUserId: string;
  fromName: string;
  storyId: string;
  storyTitle: string;
  commentId: string;
  text: string;
}): Promise<void> => {
  if (!data.toUserId) return;
  try {
    await addDoc(col(), {
      type: data.type,
      toUserId: data.toUserId,
      fromName: (data.fromName || '').slice(0, 80),
      storyId: data.storyId,
      storyTitle: (data.storyTitle || '').slice(0, 120),
      commentId: data.commentId,
      replyText: (data.text || '').slice(0, 200),
      createdAt: serverTimestamp(),
      read: false,
      expiresAt: Timestamp.fromMillis(Date.now() + NOTIFICATION_TTL_DAYS * 24 * 60 * 60 * 1000),
    });
  } catch (err) {
    console.warn('[comment-notifications] create failed:', err);
  }
};

/** Thin wrapper for the reply case (keeps the addReply call site stable). */
export const createReplyNotification = (data: {
  toUserId: string;
  fromName: string;
  storyId: string;
  storyTitle: string;
  commentId: string;
  replyText: string;
}): Promise<void> =>
  createCommentNotification({
    type: 'reply',
    toUserId: data.toUserId,
    fromName: data.fromName,
    storyId: data.storyId,
    storyTitle: data.storyTitle,
    commentId: data.commentId,
    text: data.replyText,
  });

const parse = (snap: QueryDocumentSnapshot<DocumentData>): ReplyNotification => {
  const d = snap.data();
  return {
    id: snap.id,
    type: d.type === 'like' ? 'like' : 'reply',
    toUserId: String(d.toUserId || ''),
    fromName: String(d.fromName || ''),
    storyId: String(d.storyId || ''),
    storyTitle: String(d.storyTitle || ''),
    commentId: String(d.commentId || ''),
    replyText: String(d.replyText || ''),
    createdAt: (d.createdAt as Timestamp | null) || null,
    read: Boolean(d.read),
  };
};

/**
 * Recent reply-notifications for this device user (read + unread), newest
 * first. Backs the notifications-bell list. Ordered server-side so the newest
 * docs are always inside the limit window — without `orderBy`, Firestore
 * returns docs in document-ID order and new replies silently fall outside the
 * fetched page once the user has more than `max` notifications.
 * Requires the composite index (toUserId ASC, createdAt DESC).
 */
export const fetchRecentReplyNotifications = async (
  myUserId: string,
  max = 40,
): Promise<ReplyNotification[]> => {
  if (!myUserId) return [];
  try {
    const q = query(
      col(),
      where('toUserId', '==', myUserId),
      orderBy('createdAt', 'desc'),
      fsLimit(max),
    );
    const snap = await getDocs(q);
    return snap.docs.map(parse);
  } catch (err) {
    console.warn('[comment-notifications] fetchRecent failed:', err);
    return [];
  }
};

/**
 * Count of unread reply-notifications — drives the bell badge. Uses a
 * server-side aggregate so the count is exact regardless of how many
 * notifications exist (equality-only filters merge single-field indexes; no
 * composite index needed).
 */
export const countUnreadReplyNotifications = async (myUserId: string): Promise<number> => {
  if (!myUserId) return 0;
  try {
    const q = query(col(), where('toUserId', '==', myUserId), where('read', '==', false));
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch (err) {
    console.warn('[comment-notifications] unread count failed:', err);
    return 0;
  }
};

/** Mark the given notifications as read (best-effort, fire-and-forget safe). */
export const markReplyNotificationsRead = async (ids: string[]): Promise<void> => {
  await Promise.all(
    ids.map((id) =>
      updateDoc(doc(db, 'commentNotifications', id), { read: true }).catch(() => {}),
    ),
  );
};
