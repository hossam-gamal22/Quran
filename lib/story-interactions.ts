// lib/story-interactions.ts
// Likes + comments + reports + bans for religious stories
// (Prophet stories, Companions, Seerah). Read paths use realtime snapshots
// only when explicitly subscribed — counts and ban status use one-shot reads
// so we don't pay for streaming when the user just scrolls past a card.

import {
  doc,
  collection,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  increment,
  onSnapshot,
  query,
  orderBy,
  limit as fsLimit,
  startAfter,
  getDocs,
  addDoc,
  Timestamp,
  type Unsubscribe,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase-config';
import { getUserId, getDisplayName } from './firebase-user';
import { validateCommentText, MAX_COMMENT_LENGTH } from './profanity-filter';
import type { StorySection } from './story-id';

// ==================== Types ====================

export interface InteractionCounts {
  likeCount: number;
  commentCount: number;
}

export interface StoryComment {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: Timestamp | null;
  hidden: boolean;
  reportCount: number;
  replyCount: number;
}

export interface StoryReply {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: Timestamp | null;
  hidden: boolean;
  reportCount: number;
}

export interface UserBan {
  bannedUntil: Timestamp | null; // null = permanent
  reason: string;
  bannedBy?: string;
  bannedAt: Timestamp | null;
}

export type CommentWriteResult =
  | { ok: true; commentId: string }
  | { ok: false; reason: 'no_display_name' | 'banned' | 'invalid_text' | 'profanity' | 'too_long' | 'too_short' | 'empty' | 'network' };

export type ReplyWriteResult =
  | { ok: true; replyId: string }
  | { ok: false; reason: 'no_display_name' | 'banned' | 'invalid_text' | 'profanity' | 'too_long' | 'too_short' | 'empty' | 'network' };

// ==================== Refs ====================

const interactionDoc = (storyId: string) => doc(db, 'storyInteractions', storyId);
const likesCol = (storyId: string) => collection(db, 'storyInteractions', storyId, 'likes');
const likeDoc = (storyId: string, userId: string) => doc(db, 'storyInteractions', storyId, 'likes', userId);
const commentsCol = (storyId: string) => collection(db, 'storyInteractions', storyId, 'comments');
const commentDoc = (storyId: string, commentId: string) => doc(db, 'storyInteractions', storyId, 'comments', commentId);
const reportDoc = (storyId: string, commentId: string, userId: string) =>
  doc(db, 'storyInteractions', storyId, 'comments', commentId, 'reports', userId);
const repliesCol = (storyId: string, commentId: string) =>
  collection(db, 'storyInteractions', storyId, 'comments', commentId, 'replies');
const replyDoc = (storyId: string, commentId: string, replyId: string) =>
  doc(db, 'storyInteractions', storyId, 'comments', commentId, 'replies', replyId);
const replyReportDoc = (storyId: string, commentId: string, replyId: string, userId: string) =>
  doc(db, 'storyInteractions', storyId, 'comments', commentId, 'replies', replyId, 'reports', userId);
const banDoc = (userId: string) => doc(db, 'userBans', userId);

// ==================== Counts ====================

export const getInteractionCounts = async (storyId: string): Promise<InteractionCounts> => {
  try {
    const snap = await getDoc(interactionDoc(storyId));
    if (!snap.exists()) return { likeCount: 0, commentCount: 0 };
    const data = snap.data();
    return {
      likeCount: Number(data.likeCount || 0),
      commentCount: Number(data.commentCount || 0),
    };
  } catch (err) {
    console.warn('[story-interactions] getInteractionCounts failed:', err);
    return { likeCount: 0, commentCount: 0 };
  }
};

export const subscribeToInteractionCounts = (
  storyId: string,
  callback: (counts: InteractionCounts) => void,
): Unsubscribe => {
  return onSnapshot(
    interactionDoc(storyId),
    (snap) => {
      if (!snap.exists()) {
        callback({ likeCount: 0, commentCount: 0 });
        return;
      }
      const data = snap.data();
      callback({
        likeCount: Number(data.likeCount || 0),
        commentCount: Number(data.commentCount || 0),
      });
    },
    (err) => {
      console.warn('[story-interactions] subscribe counts error:', err);
      callback({ likeCount: 0, commentCount: 0 });
    },
  );
};

// ==================== Likes ====================

export const hasUserLiked = async (storyId: string): Promise<boolean> => {
  try {
    const userId = await getUserId();
    const snap = await getDoc(likeDoc(storyId, userId));
    return snap.exists();
  } catch {
    return false;
  }
};

/**
 * Toggle the current user's like on a story. Optimistic in the caller —
 * this returns the new liked-state after the write succeeds.
 */
export const toggleLike = async (
  storyId: string,
  section: StorySection,
): Promise<{ liked: boolean }> => {
  const userId = await getUserId();
  const ref = likeDoc(storyId, userId);
  const snap = await getDoc(ref);
  const alreadyLiked = snap.exists();

  if (alreadyLiked) {
    await deleteDoc(ref);
    await setDoc(
      interactionDoc(storyId),
      {
        section,
        likeCount: increment(-1),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return { liked: false };
  }

  await setDoc(ref, {
    userId,
    createdAt: serverTimestamp(),
  });
  await setDoc(
    interactionDoc(storyId),
    {
      section,
      likeCount: increment(1),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return { liked: true };
};

// ==================== Bans ====================

export const isUserBanned = async (userId?: string): Promise<UserBan | null> => {
  try {
    const id = userId || (await getUserId());
    const snap = await getDoc(banDoc(id));
    if (!snap.exists()) return null;
    const data = snap.data() as Partial<UserBan>;
    const until = (data.bannedUntil as Timestamp | null) || null;
    // permanent ban: until === null
    // timed ban: check if expired
    if (until && until.toMillis() < Date.now()) return null;
    return {
      bannedUntil: until,
      reason: String(data.reason || ''),
      bannedBy: data.bannedBy,
      bannedAt: (data.bannedAt as Timestamp | null) || null,
    };
  } catch {
    return null;
  }
};

// ==================== Comments ====================

const PAGE_SIZE = 20;

export interface CommentsPage {
  comments: StoryComment[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

const parseComment = (snap: QueryDocumentSnapshot<DocumentData>): StoryComment => {
  const data = snap.data();
  return {
    id: snap.id,
    userId: String(data.userId || ''),
    displayName: String(data.displayName || ''),
    text: String(data.text || ''),
    createdAt: (data.createdAt as Timestamp | null) || null,
    hidden: Boolean(data.hidden),
    reportCount: Number(data.reportCount || 0),
    replyCount: Number(data.replyCount || 0),
  };
};

const parseReply = (snap: QueryDocumentSnapshot<DocumentData>): StoryReply => {
  const data = snap.data();
  return {
    id: snap.id,
    userId: String(data.userId || ''),
    displayName: String(data.displayName || ''),
    text: String(data.text || ''),
    createdAt: (data.createdAt as Timestamp | null) || null,
    hidden: Boolean(data.hidden),
    reportCount: Number(data.reportCount || 0),
  };
};

/** First page of comments — newest first. Use this for the initial load. */
export const fetchFirstCommentsPage = async (storyId: string): Promise<CommentsPage> => {
  try {
    const q = query(commentsCol(storyId), orderBy('createdAt', 'desc'), fsLimit(PAGE_SIZE));
    const snap = await getDocs(q);
    const comments = snap.docs.map(parseComment).filter((c) => !c.hidden);
    return {
      comments,
      lastDoc: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
      hasMore: snap.docs.length === PAGE_SIZE,
    };
  } catch (err) {
    console.warn('[story-interactions] fetchFirstCommentsPage failed:', err);
    return { comments: [], lastDoc: null, hasMore: false };
  }
};

/** Next page using the cursor returned from a previous call. */
export const fetchNextCommentsPage = async (
  storyId: string,
  cursor: QueryDocumentSnapshot<DocumentData>,
): Promise<CommentsPage> => {
  try {
    const q = query(
      commentsCol(storyId),
      orderBy('createdAt', 'desc'),
      startAfter(cursor),
      fsLimit(PAGE_SIZE),
    );
    const snap = await getDocs(q);
    const comments = snap.docs.map(parseComment).filter((c) => !c.hidden);
    return {
      comments,
      lastDoc: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
      hasMore: snap.docs.length === PAGE_SIZE,
    };
  } catch (err) {
    console.warn('[story-interactions] fetchNextCommentsPage failed:', err);
    return { comments: [], lastDoc: null, hasMore: false };
  }
};

/**
 * Subscribe to the first page of comments only — bounded reads.
 * For long threads, use fetchNextCommentsPage on demand instead of widening
 * the subscription window.
 */
export const subscribeToFirstCommentsPage = (
  storyId: string,
  callback: (comments: StoryComment[]) => void,
): Unsubscribe => {
  const q = query(commentsCol(storyId), orderBy('createdAt', 'desc'), fsLimit(PAGE_SIZE));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map(parseComment).filter((c) => !c.hidden));
    },
    (err) => {
      console.warn('[story-interactions] subscribe comments error:', err);
      callback([]);
    },
  );
};

export const addComment = async (
  storyId: string,
  section: StorySection,
  rawText: string,
): Promise<CommentWriteResult> => {
  const displayName = (await getDisplayName())?.trim();
  if (!displayName) return { ok: false, reason: 'no_display_name' };

  const ban = await isUserBanned();
  if (ban) return { ok: false, reason: 'banned' };

  const validation = validateCommentText(rawText);
  if (!validation.valid) {
    return { ok: false, reason: validation.reason || 'invalid_text' };
  }

  try {
    const userId = await getUserId();
    const trimmed = rawText.trim().slice(0, MAX_COMMENT_LENGTH);
    const created = await addDoc(commentsCol(storyId), {
      userId,
      displayName,
      text: trimmed,
      createdAt: serverTimestamp(),
      hidden: false,
      reportCount: 0,
      replyCount: 0,
    });
    await setDoc(
      interactionDoc(storyId),
      {
        section,
        commentCount: increment(1),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return { ok: true, commentId: created.id };
  } catch (err) {
    console.warn('[story-interactions] addComment failed:', err);
    return { ok: false, reason: 'network' };
  }
};

/**
 * Delete the current user's own comment. Admin deletions happen via the
 * admin panel and don't go through this client path.
 */
export const deleteOwnComment = async (
  storyId: string,
  commentId: string,
): Promise<boolean> => {
  try {
    const userId = await getUserId();
    const snap = await getDoc(commentDoc(storyId, commentId));
    if (!snap.exists()) return false;
    if (snap.data().userId !== userId) return false;
    await deleteDoc(commentDoc(storyId, commentId));
    await setDoc(
      interactionDoc(storyId),
      {
        commentCount: increment(-1),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return true;
  } catch (err) {
    console.warn('[story-interactions] deleteOwnComment failed:', err);
    return false;
  }
};

// ==================== Reports ====================

export type ReportReason =
  | 'inappropriate'
  | 'sectarian'
  | 'spam'
  | 'harassment'
  | 'misinformation'
  | 'other';

export const reportComment = async (
  storyId: string,
  commentId: string,
  reason: ReportReason,
): Promise<{ ok: boolean; alreadyReported?: boolean }> => {
  try {
    const userId = await getUserId();
    const ref = reportDoc(storyId, commentId, userId);
    const existing = await getDoc(ref);
    if (existing.exists()) return { ok: true, alreadyReported: true };

    await setDoc(ref, {
      userId,
      reason,
      createdAt: serverTimestamp(),
    });
    // Denormalize: bump reportCount on the comment doc so admin queue can
    // sort cheaply without scanning subcollections.
    await updateDoc(commentDoc(storyId, commentId), {
      reportCount: increment(1),
    });
    return { ok: true };
  } catch (err) {
    console.warn('[story-interactions] reportComment failed:', err);
    return { ok: false };
  }
};

// ==================== Replies ====================

const MAX_REPLIES_PER_FETCH = 50;

/**
 * One-shot fetch of all replies on a comment. Capped at 50 — if a thread
 * grows past that, we'd need pagination, but in practice nested discussions
 * on religious-content cards rarely exceed a handful.
 */
export const fetchReplies = async (
  storyId: string,
  commentId: string,
): Promise<StoryReply[]> => {
  try {
    const q = query(repliesCol(storyId, commentId), orderBy('createdAt', 'asc'), fsLimit(MAX_REPLIES_PER_FETCH));
    const snap = await getDocs(q);
    return snap.docs.map(parseReply).filter((r) => !r.hidden);
  } catch (err) {
    console.warn('[story-interactions] fetchReplies failed:', err);
    return [];
  }
};

export const addReply = async (
  storyId: string,
  commentId: string,
  rawText: string,
): Promise<ReplyWriteResult> => {
  const displayName = (await getDisplayName())?.trim();
  if (!displayName) return { ok: false, reason: 'no_display_name' };

  const ban = await isUserBanned();
  if (ban) return { ok: false, reason: 'banned' };

  const validation = validateCommentText(rawText);
  if (!validation.valid) {
    return { ok: false, reason: validation.reason || 'invalid_text' };
  }

  try {
    const userId = await getUserId();
    const trimmed = rawText.trim().slice(0, MAX_COMMENT_LENGTH);
    const created = await addDoc(repliesCol(storyId, commentId), {
      userId,
      displayName,
      text: trimmed,
      createdAt: serverTimestamp(),
      hidden: false,
      reportCount: 0,
    });
    // Denormalize: bump replyCount on the parent comment so the toggle
    // button can show the count without scanning the subcollection.
    await updateDoc(commentDoc(storyId, commentId), {
      replyCount: increment(1),
    });
    return { ok: true, replyId: created.id };
  } catch (err) {
    console.warn('[story-interactions] addReply failed:', err);
    return { ok: false, reason: 'network' };
  }
};

export const deleteOwnReply = async (
  storyId: string,
  commentId: string,
  replyId: string,
): Promise<boolean> => {
  try {
    const userId = await getUserId();
    const snap = await getDoc(replyDoc(storyId, commentId, replyId));
    if (!snap.exists()) return false;
    if (snap.data().userId !== userId) return false;
    await deleteDoc(replyDoc(storyId, commentId, replyId));
    await updateDoc(commentDoc(storyId, commentId), {
      replyCount: increment(-1),
    });
    return true;
  } catch (err) {
    console.warn('[story-interactions] deleteOwnReply failed:', err);
    return false;
  }
};

export const reportReply = async (
  storyId: string,
  commentId: string,
  replyId: string,
  reason: ReportReason,
): Promise<{ ok: boolean; alreadyReported?: boolean }> => {
  try {
    const userId = await getUserId();
    const ref = replyReportDoc(storyId, commentId, replyId, userId);
    const existing = await getDoc(ref);
    if (existing.exists()) return { ok: true, alreadyReported: true };

    await setDoc(ref, {
      userId,
      reason,
      createdAt: serverTimestamp(),
    });
    await updateDoc(replyDoc(storyId, commentId, replyId), {
      reportCount: increment(1),
    });
    return { ok: true };
  } catch (err) {
    console.warn('[story-interactions] reportReply failed:', err);
    return { ok: false };
  }
};
