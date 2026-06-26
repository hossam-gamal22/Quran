// admin-panel/src/pages/CommentsModeration.tsx
// Moderation queue for story comments + ban management.
// Reads from `storyInteractions/{storyId}/comments` via collection-group
// queries so a single page can surface comments across all stories.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Eye,
  EyeOff,
  Filter,
  Flag,
  Heart,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  TrendingUp,
  Users as UsersIcon,
  X,
} from 'lucide-react';
import { db } from '../firebase';
import { RELIGIOUS_STORY_PRESETS } from '../data/religious-story-presets';
import { getDefaultCompanionsContent, getDefaultSeerahContent } from '../data/app-defaults';

// ==================== Types ====================

type SectionFilter = 'all' | 'prophet' | 'companion' | 'seerah';
type TabKey = 'reported' | 'all' | 'banned' | 'likes';

interface InteractionRow {
  storyId: string;
  section?: string;
  likeCount: number;
  commentCount: number;
  updatedAt: Timestamp | null;
}

interface LikerRow {
  userId: string;
  displayName: string;
  email?: string;
  createdAt: Timestamp | null;
}

interface CommentRow {
  storyId: string;
  commentId: string;
  /** Set when this row is a reply living under another comment. */
  parentCommentId?: string;
  kind: 'comment' | 'reply';
  userId: string;
  displayName: string;
  text: string;
  createdAt: Timestamp | null;
  hidden: boolean;
  reportCount: number;
  section?: string;
}

interface BanRow {
  userId: string;
  bannedUntil: Timestamp | null;
  reason: string;
  bannedAt: Timestamp | null;
  bannedBy?: string;
}

interface ReportDetail {
  userId: string;
  reason: string;
  note?: string;
  createdAt: Timestamp | null;
}

type BanDuration = '1d' | '7d' | '30d' | 'permanent';

interface UserProfile {
  displayName: string;
  email?: string;
}

// ==================== Helpers ====================

const SECTION_LABELS: Record<string, string> = {
  prophet: 'قصص الأنبياء',
  companion: 'الصحابة',
  seerah: 'السيرة النبوية',
};

const SECTION_COLORS: Record<string, string> = {
  prophet: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  companion: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  seerah: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
};

// Mirror of the app's report reasons (lib/story-interactions.ts ReportReason).
const REPORT_REASON_LABELS: Record<string, string> = {
  inappropriate: 'محتوى غير لائق',
  sectarian: 'كلام طائفي أو فتنة',
  misinformation: 'معلومات دينية غير صحيحة',
  spam: 'سبام أو إعلان',
  harassment: 'إساءة أو تنمّر',
  other: 'سبب آخر',
};

const STORY_TITLES: Record<string, string> = (() => {
  const titles: Record<string, string> = {};
  RELIGIOUS_STORY_PRESETS.forEach((story) => {
    titles[story.id] = story.title || story.label || story.id;
  });

  getDefaultCompanionsContent().companions.forEach((companion) => {
    titles[`companion_${companion.id}`] = companion.nameAr;
  });

  const seerah = getDefaultSeerahContent();
  seerah.sections.forEach((section) => {
    const slug = section.titleEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    titles[`seerah_${slug}`] = section.title;
  });
  titles['seerah_full-audio'] = 'السيرة النبوية الكاملة';

  return titles;
})();

const getStoryTitle = (storyId: string): string => STORY_TITLES[storyId] || storyId;

const userNameFromData = (data: any): string => (
  String(data?.displayName || data?.name || data?.fullName || data?.userName || data?.email || '').trim()
);

const fetchUserProfiles = async (
  userIds: string[],
  fallbackNames: Record<string, string> = {},
): Promise<Record<string, UserProfile>> => {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!uniqueIds.length) return {};

  const entries = await Promise.all(
    uniqueIds.map(async (userId) => {
      try {
        const snap = await getDoc(doc(db, 'users', userId));
        if (snap.exists()) {
          const data = snap.data() as any;
          const displayName = userNameFromData(data);
          if (displayName) {
            return [userId, { displayName, email: data.email ? String(data.email) : undefined }] as const;
          }
        }
      } catch (err) {
        console.warn('[CommentsModeration] user profile lookup failed:', userId, err);
      }

      const fallback = (fallbackNames[userId] || '').trim();
      return [userId, { displayName: fallback || 'بدون اسم' }] as const;
    }),
  );

  return Object.fromEntries(entries);
};

const inferSection = (storyId: string, fallback?: string): string => {
  if (fallback) return fallback;
  if (storyId.startsWith('prophet')) return 'prophet';
  if (storyId.startsWith('companion')) return 'companion';
  if (storyId.startsWith('seerah')) return 'seerah';
  return 'other';
};

const formatDate = (ts: Timestamp | null): string => {
  if (!ts) return '—';
  try {
    return ts.toDate().toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const durationToMs = (d: BanDuration): number | null => {
  if (d === 'permanent') return null;
  const day = 24 * 60 * 60 * 1000;
  if (d === '1d') return day;
  if (d === '7d') return 7 * day;
  if (d === '30d') return 30 * day;
  return null;
};

// ==================== Page ====================

const CommentsModeration: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('reported');
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>('all');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [bans, setBans] = useState<BanRow[]>([]);
  const [interactions, setInteractions] = useState<InteractionRow[]>([]);
  const [likersModalStoryId, setLikersModalStoryId] = useState<string | null>(null);
  const [likers, setLikers] = useState<LikerRow[]>([]);
  const [likersLoading, setLikersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banModalUserId, setBanModalUserId] = useState<string | null>(null);
  const [reportsModalRow, setReportsModalRow] = useState<CommentRow | null>(null);
  const [reports, setReports] = useState<ReportDetail[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // ---------- Data loaders ----------

  const loadComments = useCallback(async (mode: 'reported' | 'all') => {
    setLoading(true);
    setError(null);
    try {
      // collectionGroup query requires a composite index on (reportCount desc, createdAt desc)
      // for comments. Replies use a separate collectionGroup. We fire both in
      // parallel and merge — replies show inline as a different "kind" badge.
      const commentsCg = collectionGroup(db, 'comments');
      const repliesCg = collectionGroup(db, 'replies');

      const runQuery = async (cg: ReturnType<typeof collectionGroup>) => {
        try {
          const q = mode === 'reported'
            ? query(cg, where('reportCount', '>', 0), orderBy('reportCount', 'desc'), limit(100))
            : query(cg, orderBy('createdAt', 'desc'), limit(100));
          return await getDocs(q);
        } catch (err) {
          console.warn('[CommentsModeration] indexed query failed, falling back:', err);
          return await getDocs(query(cg, limit(200)));
        }
      };

      const [commentsSnap, repliesSnap] = await Promise.all([
        runQuery(commentsCg),
        runQuery(repliesCg),
      ]);

      const rows: CommentRow[] = [];

      commentsSnap.forEach((d) => {
        const data = d.data() as any;
        // Path: storyInteractions/{storyId}/comments/{commentId}
        const storyId = d.ref.parent.parent?.id || '';
        if (!storyId) return;
        if (mode === 'reported' && !Number(data.reportCount || 0)) return;
        rows.push({
          storyId,
          commentId: d.id,
          kind: 'comment',
          userId: String(data.userId || ''),
          displayName: String(data.displayName || ''),
          text: String(data.text || ''),
          createdAt: (data.createdAt as Timestamp | null) || null,
          hidden: Boolean(data.hidden),
          reportCount: Number(data.reportCount || 0),
          section: data.section,
        });
      });

      repliesSnap.forEach((d) => {
        const data = d.data() as any;
        // Path: storyInteractions/{storyId}/comments/{commentId}/replies/{replyId}
        const parentCommentRef = d.ref.parent.parent;
        const storyRef = parentCommentRef?.parent.parent;
        const storyId = storyRef?.id || '';
        const parentCommentId = parentCommentRef?.id || '';
        if (!storyId || !parentCommentId) return;
        if (mode === 'reported' && !Number(data.reportCount || 0)) return;
        rows.push({
          storyId,
          commentId: d.id,
          parentCommentId,
          kind: 'reply',
          userId: String(data.userId || ''),
          displayName: String(data.displayName || ''),
          text: String(data.text || ''),
          createdAt: (data.createdAt as Timestamp | null) || null,
          hidden: Boolean(data.hidden),
          reportCount: Number(data.reportCount || 0),
        });
      });

      rows.sort((a, b) => {
        if (mode === 'reported') {
          if (a.reportCount !== b.reportCount) return b.reportCount - a.reportCount;
        }
        const am = a.createdAt?.toMillis?.() || 0;
        const bm = b.createdAt?.toMillis?.() || 0;
        return bm - am;
      });

      const fallbackNames = Object.fromEntries(rows.map((row) => [row.userId, row.displayName]));
      const profiles = await fetchUserProfiles(rows.map((row) => row.userId), fallbackNames);
      setComments(rows.map((row) => ({
        ...row,
        displayName: profiles[row.userId]?.displayName || row.displayName || 'بدون اسم',
      })));
    } catch (err: any) {
      console.error('[CommentsModeration] loadComments error:', err);
      setError(err?.message || 'تعذّر تحميل التعليقات');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(query(collection(db, 'userBans'), limit(200)));
      const rows: BanRow[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        rows.push({
          userId: d.id,
          bannedUntil: (data.bannedUntil as Timestamp | null) || null,
          reason: String(data.reason || ''),
          bannedAt: (data.bannedAt as Timestamp | null) || null,
          bannedBy: data.bannedBy,
        });
      });
      rows.sort((a, b) => (b.bannedAt?.toMillis?.() || 0) - (a.bannedAt?.toMillis?.() || 0));
      setBans(rows);
    } catch (err: any) {
      console.error('[CommentsModeration] loadBans error:', err);
      setError(err?.message || 'تعذّر تحميل قائمة الحظر');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInteractions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Single-field index on likeCount is auto-created by Firestore.
      // Fall back to unsorted scan if anything blocks the indexed query.
      let snap;
      try {
        snap = await getDocs(
          query(collection(db, 'storyInteractions'), orderBy('likeCount', 'desc'), limit(200)),
        );
      } catch (err) {
        console.warn('[CommentsModeration] interactions indexed query failed:', err);
        snap = await getDocs(query(collection(db, 'storyInteractions'), limit(200)));
      }
      const rows: InteractionRow[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        rows.push({
          storyId: d.id,
          section: data.section,
          likeCount: Number(data.likeCount || 0),
          commentCount: Number(data.commentCount || 0),
          updatedAt: (data.updatedAt as Timestamp | null) || null,
        });
      });
      rows.sort((a, b) => b.likeCount - a.likeCount);
      setInteractions(rows);
    } catch (err: any) {
      console.error('[CommentsModeration] loadInteractions error:', err);
      setError(err?.message || 'تعذّر تحميل بيانات التفاعل');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLikers = useCallback(async (storyId: string) => {
    setLikersLoading(true);
    setLikers([]);
    try {
      const snap = await getDocs(
        query(collection(db, 'storyInteractions', storyId, 'likes'), limit(200)),
      );
      const rows: LikerRow[] = [];
      const fallbackNames: Record<string, string> = {};
      snap.forEach((d) => {
        const data = d.data() as any;
        const fallbackName = userNameFromData(data);
        if (fallbackName) fallbackNames[d.id] = fallbackName;
        rows.push({
          userId: d.id,
          displayName: fallbackName || '',
          email: data.email ? String(data.email) : undefined,
          createdAt: (data.createdAt as Timestamp | null) || null,
        });
      });
      rows.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      const profiles = await fetchUserProfiles(rows.map((row) => row.userId), fallbackNames);
      setLikers(rows.map((row) => ({
        ...row,
        displayName: profiles[row.userId]?.displayName || row.displayName || 'بدون اسم',
        email: profiles[row.userId]?.email || row.email,
      })));
    } catch (err) {
      console.error('[CommentsModeration] loadLikers error:', err);
    } finally {
      setLikersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'reported') loadComments('reported');
    else if (tab === 'all') loadComments('all');
    else if (tab === 'likes') loadInteractions();
    else loadBans();
  }, [tab, loadComments, loadBans, loadInteractions]);

  useEffect(() => {
    if (likersModalStoryId) loadLikers(likersModalStoryId);
  }, [likersModalStoryId, loadLikers]);

  const loadReports = useCallback(async (row: CommentRow) => {
    setReportsLoading(true);
    setReports([]);
    try {
      const reportsCol =
        row.kind === 'reply' && row.parentCommentId
          ? collection(
              db,
              'storyInteractions', row.storyId,
              'comments', row.parentCommentId,
              'replies', row.commentId,
              'reports',
            )
          : collection(db, 'storyInteractions', row.storyId, 'comments', row.commentId, 'reports');
      const snap = await getDocs(query(reportsCol, limit(100)));
      const rows: ReportDetail[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        rows.push({
          userId: String(data.userId || d.id),
          reason: String(data.reason || 'other'),
          note: data.note ? String(data.note) : undefined,
          createdAt: (data.createdAt as Timestamp | null) || null,
        });
      });
      rows.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setReports(rows);
    } catch (err) {
      console.error('[CommentsModeration] loadReports error:', err);
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (reportsModalRow) loadReports(reportsModalRow);
  }, [reportsModalRow, loadReports]);

  // ---------- Actions ----------

  const docRefForRow = (row: CommentRow) =>
    row.kind === 'reply' && row.parentCommentId
      ? doc(
          db,
          'storyInteractions', row.storyId,
          'comments', row.parentCommentId,
          'replies', row.commentId,
        )
      : doc(db, 'storyInteractions', row.storyId, 'comments', row.commentId);

  const hideComment = useCallback(async (row: CommentRow) => {
    try {
      await updateDoc(docRefForRow(row), { hidden: !row.hidden });
      setComments((prev) =>
        prev.map((c) =>
          c.commentId === row.commentId && c.storyId === row.storyId
            ? { ...c, hidden: !c.hidden }
            : c,
        ),
      );
    } catch (err) {
      console.error('hideComment failed:', err);
      alert('تعذّر تعديل حالة التعليق');
    }
  }, []);

  const deleteComment = useCallback(async (row: CommentRow) => {
    const label = row.kind === 'reply' ? 'الردّ' : 'التعليق';
    if (!confirm(`حذف ${label} الخاص بـ "${row.displayName}" نهائياً؟`)) return;
    try {
      await deleteDoc(docRefForRow(row));
      // Decrement parent replyCount when removing a reply
      if (row.kind === 'reply' && row.parentCommentId) {
        try {
          await updateDoc(
            doc(db, 'storyInteractions', row.storyId, 'comments', row.parentCommentId),
            { replyCount: increment(-1) },
          );
        } catch {}
      }
      setComments((prev) => prev.filter((c) => !(c.commentId === row.commentId && c.storyId === row.storyId)));
    } catch (err) {
      console.error('deleteComment failed:', err);
      alert('تعذّر الحذف');
    }
  }, []);

  const banUser = useCallback(async (userId: string, duration: BanDuration, reason: string) => {
    try {
      const ms = durationToMs(duration);
      const bannedUntil =
        ms === null ? null : Timestamp.fromMillis(Date.now() + ms);
      await setDoc(doc(db, 'userBans', userId), {
        userId,
        bannedUntil,
        reason: reason || (duration === 'permanent' ? 'حظر دائم' : `حظر مؤقت (${duration})`),
        bannedAt: serverTimestamp(),
        bannedBy: 'admin',
      });
      // Side-effect: hide from honor board / leaderboard so a banned user
      // can't win rewards. isEligibleForLeaderboard() checks this flag.
      await setDoc(
        doc(db, 'users', userId),
        { hiddenFromLeaderboard: true, hiddenReason: 'banned', updatedAt: serverTimestamp() },
        { merge: true },
      );
      setBanModalUserId(null);
      alert('تم حظر المستخدم وإخفاؤه من لوحة الشرف');
      if (tab === 'banned') loadBans();
    } catch (err) {
      console.error('banUser failed:', err);
      alert('تعذّر حظر المستخدم');
    }
  }, [tab, loadBans]);

  const liftBan = useCallback(async (userId: string) => {
    if (!confirm(`رفع الحظر عن المستخدم؟`)) return;
    try {
      await deleteDoc(doc(db, 'userBans', userId));
      // Re-allow on leaderboard only if we were the ones who hid them.
      // (Don't override an admin manual hide for some other reason.)
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists() && snap.data()?.hiddenReason === 'banned') {
        await updateDoc(userRef, {
          hiddenFromLeaderboard: false,
          hiddenReason: null,
          updatedAt: serverTimestamp(),
        });
      }
      setBans((prev) => prev.filter((b) => b.userId !== userId));
    } catch (err) {
      console.error('liftBan failed:', err);
      alert('تعذّر رفع الحظر');
    }
  }, []);

  // ---------- Filtering ----------

  const filteredComments = useMemo(() => {
    return comments.filter((c) => {
      const section = inferSection(c.storyId, c.section);
      if (sectionFilter !== 'all' && section !== sectionFilter) return false;
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        const storyTitle = getStoryTitle(c.storyId).toLowerCase();
        if (
          !c.displayName.toLowerCase().includes(q) &&
          !c.text.toLowerCase().includes(q) &&
          !storyTitle.includes(q) &&
          !c.storyId.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [comments, sectionFilter, searchText]);

  // ---------- Render ----------

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-accent" />
            إشراف التفاعلات
          </h1>
          <p className="text-admin-muted text-sm mt-1">
            مراجعة التعليقات المُبلَّغ عنها، إحصائيات الإعجابات، وإدارة المستخدمين.
          </p>
        </div>
        <button
          onClick={() => {
            if (tab === 'banned') loadBans();
            else if (tab === 'likes') loadInteractions();
            else loadComments(tab === 'reported' ? 'reported' : 'all');
          }}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-admin-surface hover:bg-admin-surface/70 text-white rounded-xl text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-admin-border overflow-x-auto">
        <TabButton active={tab === 'reported'} onClick={() => setTab('reported')} icon={<Flag className="w-4 h-4" />}>
          المُبلَّغ عنها
        </TabButton>
        <TabButton active={tab === 'all'} onClick={() => setTab('all')} icon={<MessageSquare className="w-4 h-4" />}>
          كل التعليقات
        </TabButton>
        <TabButton active={tab === 'likes'} onClick={() => setTab('likes')} icon={<Heart className="w-4 h-4" />}>
          الإعجابات
        </TabButton>
        <TabButton active={tab === 'banned'} onClick={() => setTab('banned')} icon={<Ban className="w-4 h-4" />}>
          المحظورون
        </TabButton>
      </div>

      {/* Filters — only on comment tabs */}
      {(tab === 'reported' || tab === 'all') && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-admin-surface rounded-xl px-3 py-2 flex-1 min-w-[220px] border border-admin-border">
            <Search className="w-4 h-4 text-admin-muted" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="بحث بالاسم أو نص التعليق أو معرّف القصة..."
              className="bg-transparent text-white text-sm flex-1 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 bg-admin-surface rounded-xl px-3 py-2 border border-admin-border">
            <Filter className="w-4 h-4 text-admin-muted" />
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value as SectionFilter)}
              className="bg-transparent text-white text-sm outline-none cursor-pointer"
            >
              <option value="all">كل الأقسام</option>
              <option value="prophet">قصص الأنبياء</option>
              <option value="companion">الصحابة</option>
              <option value="seerah">السيرة النبوية</option>
            </select>
          </div>
          <div className="text-admin-muted text-sm">
            {filteredComments.length} تعليق
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/40 text-red-300 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Content */}
      {(tab === 'reported' || tab === 'all') && (
        <CommentsList
          comments={filteredComments}
          loading={loading}
          onHide={hideComment}
          onDelete={deleteComment}
          onBan={(userId) => setBanModalUserId(userId)}
          onViewReports={(row) => setReportsModalRow(row)}
        />
      )}
      {tab === 'likes' && (
        <LikesList
          interactions={interactions}
          loading={loading}
          onOpenLikers={setLikersModalStoryId}
        />
      )}
      {tab === 'banned' && (
        <BansList bans={bans} loading={loading} onLift={liftBan} />
      )}

      {/* Ban modal */}
      {banModalUserId && (
        <BanModal
          userId={banModalUserId}
          onClose={() => setBanModalUserId(null)}
          onConfirm={banUser}
        />
      )}

      {/* Reports modal */}
      {reportsModalRow && (
        <ReportsModal
          row={reportsModalRow}
          reports={reports}
          loading={reportsLoading}
          onClose={() => {
            setReportsModalRow(null);
            setReports([]);
          }}
        />
      )}

      {/* Likers modal */}
      {likersModalStoryId && (
        <LikersModal
          storyId={likersModalStoryId}
          likers={likers}
          loading={likersLoading}
          onClose={() => {
            setLikersModalStoryId(null);
            setLikers([]);
          }}
        />
      )}
    </div>
  );
};

// ==================== Sub-components ====================

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ active, onClick, icon, children }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all text-sm whitespace-nowrap ${
      active
        ? 'border-accent text-white font-semibold'
        : 'border-transparent text-admin-muted hover:text-white'
    }`}
  >
    {icon}
    {children}
  </button>
);

const CommentsList: React.FC<{
  comments: CommentRow[];
  loading: boolean;
  onHide: (row: CommentRow) => void;
  onDelete: (row: CommentRow) => void;
  onBan: (userId: string) => void;
  onViewReports: (row: CommentRow) => void;
}> = ({ comments, loading, onHide, onDelete, onBan, onViewReports }) => {
  if (loading && !comments.length) {
    return (
      <div className="text-center py-12 text-admin-muted">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
        جاري التحميل...
      </div>
    );
  }
  if (!comments.length) {
    return (
      <div className="text-center py-12 text-admin-muted bg-admin-surface rounded-xl">
        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
        لا توجد تعليقات
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {comments.map((c) => {
        const section = inferSection(c.storyId, c.section);
        const sectionLabel = SECTION_LABELS[section] || 'أخرى';
        const storyTitle = getStoryTitle(c.storyId);
        return (
          <div
            key={`${c.storyId}::${c.commentId}`}
            className={`bg-admin-surface rounded-xl p-4 border ${
              c.reportCount > 0 ? 'border-red-500/40' : 'border-admin-border'
            } ${c.hidden ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-bold text-white">{c.displayName || 'بدون اسم'}</span>
                {c.kind === 'reply' && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1">
                    ↳ ردّ
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-md border ${SECTION_COLORS[section] || 'bg-admin-bg text-admin-muted border-admin-border'}`}>
                  {sectionLabel}
                </span>
                <span className="text-sm text-white/90">{storyTitle}</span>
                <code className="text-xs text-admin-muted">{c.storyId}</code>
                {c.kind === 'reply' && c.parentCommentId && (
                  <code className="text-xs text-admin-muted">
                    على: {c.parentCommentId.slice(0, 8)}…
                  </code>
                )}
                {c.reportCount > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1">
                    <Flag className="w-3 h-3" />
                    {c.reportCount} إبلاغ
                  </span>
                )}
                {c.hidden && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <EyeOff className="w-3 h-3" />
                    مخفي
                  </span>
                )}
              </div>
              <span className="text-xs text-admin-muted">{formatDate(c.createdAt)}</span>
            </div>

            <p className="text-white text-sm leading-relaxed whitespace-pre-wrap mb-3">{c.text}</p>

            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-xs text-admin-muted bg-admin-bg px-2 py-1 rounded">
                user: {c.userId}
              </code>
              <div className="flex-1" />
              {c.reportCount > 0 && (
                <button
                  onClick={() => onViewReports(c)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-300 rounded-lg text-xs border border-red-500/40 transition-colors"
                >
                  <Flag className="w-3.5 h-3.5" />
                  عرض البلاغات
                </button>
              )}
              <button
                onClick={() => onHide(c)}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs border border-amber-500/40 transition-colors"
              >
                {c.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {c.hidden ? 'إظهار' : 'إخفاء'}
              </button>
              <button
                onClick={() => onDelete(c)}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs border border-red-500/40 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف
              </button>
              <button
                onClick={() => onBan(c.userId)}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-xs border border-purple-500/40 transition-colors"
              >
                <Ban className="w-3.5 h-3.5" />
                حظر المستخدم
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const BansList: React.FC<{
  bans: BanRow[];
  loading: boolean;
  onLift: (userId: string) => void;
}> = ({ bans, loading, onLift }) => {
  if (loading && !bans.length) {
    return (
      <div className="text-center py-12 text-admin-muted">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
        جاري التحميل...
      </div>
    );
  }
  if (!bans.length) {
    return (
      <div className="text-center py-12 text-admin-muted bg-admin-surface rounded-xl">
        <UsersIcon className="w-10 h-10 mx-auto mb-2 text-admin-muted" />
        لا يوجد مستخدمون محظورون
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {bans.map((b) => {
        const isPermanent = !b.bannedUntil;
        const expired = b.bannedUntil ? b.bannedUntil.toMillis() < Date.now() : false;
        return (
          <div key={b.userId} className={`bg-admin-surface rounded-xl p-4 border ${expired ? 'border-admin-border opacity-60' : 'border-red-500/40'}`}>
            <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
              <div className="flex items-center gap-3 flex-wrap">
                <code className="text-white font-mono text-sm">{b.userId}</code>
                <span className={`text-xs px-2 py-0.5 rounded-md border ${
                  isPermanent
                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : expired
                      ? 'bg-admin-bg text-admin-muted border-admin-border'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {isPermanent ? 'حظر دائم' : expired ? 'منتهي' : `حتى ${formatDate(b.bannedUntil)}`}
                </span>
              </div>
              <button
                onClick={() => onLift(b.userId)}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-xs border border-emerald-500/40 transition-colors"
              >
                <ShieldOff className="w-3.5 h-3.5" />
                رفع الحظر
              </button>
            </div>
            <p className="text-admin-muted text-sm">السبب: {b.reason || '—'}</p>
            <p className="text-admin-muted text-xs mt-1">حُظر في: {formatDate(b.bannedAt)}</p>
          </div>
        );
      })}
    </div>
  );
};

const LikesList: React.FC<{
  interactions: InteractionRow[];
  loading: boolean;
  onOpenLikers: (storyId: string) => void;
}> = ({ interactions, loading, onOpenLikers }) => {
  if (loading && !interactions.length) {
    return (
      <div className="text-center py-12 text-admin-muted">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
        جاري التحميل...
      </div>
    );
  }
  if (!interactions.length) {
    return (
      <div className="text-center py-12 text-admin-muted bg-admin-surface rounded-xl">
        <Heart className="w-10 h-10 mx-auto mb-2 text-admin-muted" />
        لا توجد تفاعلات بعد
      </div>
    );
  }

  const totals = interactions.reduce(
    (acc, r) => {
      acc.likes += r.likeCount;
      acc.comments += r.commentCount;
      return acc;
    },
    { likes: 0, comments: 0 },
  );

  return (
    <div className="space-y-3">
      {/* Totals row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-admin-surface rounded-xl p-4 border border-admin-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
            <Heart className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-admin-muted text-xs">إجمالي الإعجابات</p>
            <p className="text-white text-xl font-bold">{totals.likes.toLocaleString('ar-EG')}</p>
          </div>
        </div>
        <div className="bg-admin-surface rounded-xl p-4 border border-admin-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-admin-muted text-xs">إجمالي التعليقات</p>
            <p className="text-white text-xl font-bold">{totals.comments.toLocaleString('ar-EG')}</p>
          </div>
        </div>
        <div className="bg-admin-surface rounded-xl p-4 border border-admin-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-admin-muted text-xs">قصص تفاعَل معها</p>
            <p className="text-white text-xl font-bold">
              {interactions.filter((i) => i.likeCount > 0 || i.commentCount > 0).length}
            </p>
          </div>
        </div>
      </div>

      <div className="text-admin-muted text-xs mt-2 mb-1">القصص مرتبة حسب عدد الإعجابات (الأكثر أولاً)</div>

      {/* Per-story list */}
      {interactions.map((r) => {
        const section = inferSection(r.storyId, r.section);
        const sectionLabel = SECTION_LABELS[section] || 'أخرى';
        const hasInteractions = r.likeCount > 0 || r.commentCount > 0;
        const storyTitle = getStoryTitle(r.storyId);
        return (
          <div
            key={r.storyId}
            className={`bg-admin-surface rounded-xl p-4 border border-admin-border ${
              hasInteractions ? '' : 'opacity-60'
            }`}
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
                <span className={`text-xs px-2 py-0.5 rounded-md border ${SECTION_COLORS[section] || 'bg-admin-bg text-admin-muted border-admin-border'}`}>
                  {sectionLabel}
                </span>
                <span className="text-sm text-white font-semibold truncate">{storyTitle}</span>
                <code className="text-xs text-admin-muted truncate">{r.storyId}</code>
                <span className="text-xs text-admin-muted">{formatDate(r.updatedAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenLikers(r.storyId)}
                  disabled={r.likeCount === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-300 rounded-lg text-sm border border-red-500/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="عرض من أعجب"
                >
                  <Heart className="w-4 h-4" />
                  {r.likeCount.toLocaleString('ar-EG')}
                </button>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 text-emerald-300 rounded-lg text-sm border border-emerald-500/40">
                  <MessageSquare className="w-4 h-4" />
                  {r.commentCount.toLocaleString('ar-EG')}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const LikersModal: React.FC<{
  storyId: string;
  likers: LikerRow[];
  loading: boolean;
  onClose: () => void;
}> = ({ storyId, likers, loading, onClose }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
    <div
      className="bg-admin-surface rounded-2xl p-6 max-w-lg w-full border border-admin-border max-h-[85vh] flex flex-col"
      onClick={(e) => e.stopPropagation()}
      dir="rtl"
    >
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-400" />
          من أعجب بهذه القصة
        </h2>
        <button onClick={onClose} className="text-admin-muted hover:text-white" title="إغلاق">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-admin-bg p-3 rounded-lg mb-3 flex-shrink-0 border border-admin-border">
        <p className="text-sm text-white font-semibold truncate">{getStoryTitle(storyId)}</p>
        <code className="text-xs text-admin-muted truncate block mt-1">{storyId}</code>
      </div>

      {loading ? (
        <div className="text-center py-8 text-admin-muted">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
          جاري التحميل...
        </div>
      ) : likers.length === 0 ? (
        <div className="text-center py-8 text-admin-muted">لا يوجد إعجابات بعد</div>
      ) : (
        <>
          <p className="text-admin-muted text-xs mb-2 flex-shrink-0">
            {likers.length.toLocaleString('ar-EG')} مستخدم — مرتب من الأحدث
          </p>
          <div className="space-y-2 overflow-y-auto flex-1 -mx-1 px-1">
            {likers.map((l) => (
              <div
                key={l.userId}
                className="bg-admin-bg rounded-lg px-3 py-2 border border-admin-border flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white font-semibold truncate">{l.displayName || 'بدون اسم'}</p>
                  <code className="text-xs text-admin-muted font-mono truncate block">{l.userId}</code>
                </div>
                <span className="text-xs text-admin-muted whitespace-nowrap">{formatDate(l.createdAt)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  </div>
);

const BanModal: React.FC<{
  userId: string;
  onClose: () => void;
  onConfirm: (userId: string, duration: BanDuration, reason: string) => void;
}> = ({ userId, onClose, onConfirm }) => {
  const [duration, setDuration] = useState<BanDuration>('7d');
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-admin-surface rounded-2xl p-6 max-w-md w-full border border-admin-border"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Ban className="w-5 h-5 text-red-400" />
            حظر مستخدم
          </h2>
          <button onClick={onClose} className="text-admin-muted hover:text-white" title="إغلاق">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-admin-muted text-xs mb-1 block">معرّف المستخدم</label>
            <code className="block text-white text-xs bg-admin-bg p-2 rounded-lg break-all">{userId}</code>
          </div>

          <div>
            <label className="text-admin-muted text-xs mb-2 block">مدة الحظر</label>
            <div className="grid grid-cols-4 gap-2">
              {(['1d', '7d', '30d', 'permanent'] as BanDuration[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`px-3 py-2 rounded-lg text-xs border transition-colors ${
                    duration === d
                      ? 'bg-accent text-white border-accent'
                      : 'bg-admin-bg text-admin-muted border-admin-border hover:text-white'
                  }`}
                >
                  {d === 'permanent' ? 'دائم' : d === '1d' ? 'يوم' : d === '7d' ? '7 أيام' : '30 يوم'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-admin-muted text-xs mb-1 block">السبب (اختياري)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: تعليقات طائفية متكررة"
              rows={3}
              className="w-full bg-admin-bg text-white text-sm rounded-lg p-3 border border-admin-border outline-none focus:border-accent"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-admin-bg text-admin-muted hover:text-white rounded-xl text-sm border border-admin-border transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={() => onConfirm(userId, duration, reason)}
              className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Ban className="w-4 h-4" />
              تنفيذ الحظر
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReportsModal: React.FC<{
  row: CommentRow;
  reports: ReportDetail[];
  loading: boolean;
  onClose: () => void;
}> = ({ row, reports, loading, onClose }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
    <div
      className="bg-admin-surface rounded-2xl p-6 max-w-lg w-full border border-admin-border max-h-[85vh] flex flex-col"
      onClick={(e) => e.stopPropagation()}
      dir="rtl"
    >
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Flag className="w-5 h-5 text-red-400" />
          بلاغات {row.kind === 'reply' ? 'الردّ' : 'التعليق'}
        </h2>
        <button onClick={onClose} className="text-admin-muted hover:text-white" title="إغلاق">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-admin-bg p-3 rounded-lg mb-3 flex-shrink-0 border border-admin-border">
        <p className="text-sm text-white font-semibold">{row.displayName || 'بدون اسم'}</p>
        <p className="text-xs text-admin-muted mt-1 whitespace-pre-wrap line-clamp-3">{row.text}</p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-admin-muted">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
          جاري التحميل...
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-8 text-admin-muted">لا توجد تفاصيل بلاغات</div>
      ) : (
        <>
          <p className="text-admin-muted text-xs mb-2 flex-shrink-0">
            {reports.length.toLocaleString('ar-EG')} بلاغ — مرتب من الأحدث
          </p>
          <div className="space-y-2 overflow-y-auto flex-1 -mx-1 px-1">
            {reports.map((r, idx) => (
              <div
                key={`${r.userId}-${idx}`}
                className="bg-admin-bg rounded-lg px-3 py-2.5 border border-admin-border"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-500/40">
                    {REPORT_REASON_LABELS[r.reason] || r.reason}
                  </span>
                  <span className="text-xs text-admin-muted whitespace-nowrap">{formatDate(r.createdAt)}</span>
                </div>
                {r.note && (
                  <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed mt-1.5 bg-admin-surface rounded-md p-2 border border-admin-border">
                    “{r.note}”
                  </p>
                )}
                <code className="text-[11px] text-admin-muted font-mono block mt-1.5 truncate">
                  من: {r.userId}
                </code>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  </div>
);

export default CommentsModeration;
