import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Trash2,
  RefreshCw,
  Smartphone,
  Clock,
  ChevronDown,
  ChevronUp,
  Bug,
  Layers,
  Flame,
  Search,
  Tag,
  Footprints,
} from 'lucide-react';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

// One document per uncaught crash, uploaded by the app on the launch AFTER the
// crash (see app/_layout.tsx → consumeLastCrash + crashLogs upload). Timestamps
// are plain millisecond numbers (Date.now()), not Firestore Timestamps.
interface CrashLog {
  id: string;
  message: string;
  stack: string;
  /** Compact run-up trail (route/audio/memory/appstate) recorded by the app
   *  right before the crash. Joined by " | ", oldest → newest. May be absent on
   *  reports from older app builds. See lib/diagnostics-breadcrumbs in the app. */
  breadcrumbs?: string;
  isFatal: boolean;
  source: string;
  platform: string;
  crashedAt: number | { seconds: number } | null;
  reportedAt: number | { seconds: number } | null;
  appVersion: string;
  userId: string;
}

interface CrashGroup {
  key: string;
  message: string;
  count: number;
  anyFatal: boolean;
  sources: Set<string>;
  platforms: Set<string>;
  appVersions: Set<string>;
  lastSeenMs: number;
  occurrences: CrashLog[];
}

const FETCH_LIMIT = 500;

const toMs = (ts: number | { seconds: number } | null): number => {
  if (ts == null) return 0;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'object' && typeof ts.seconds === 'number') return ts.seconds * 1000;
  return 0;
};

const formatDate = (ts: number | { seconds: number } | null): string => {
  const ms = toMs(ts);
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Color a breadcrumb chip by its type prefix (e.g. "memory:warning" → red).
// Memory/error stand out because they most often precede a native/OOM kill.
const crumbTone = (crumb: string): string => {
  const type = crumb.split(':')[0];
  switch (type) {
    case 'memory': return 'bg-red-500/20 text-red-300';
    case 'error': return 'bg-orange-500/20 text-orange-300';
    case 'audio': return 'bg-violet-500/20 text-violet-300';
    case 'nav': return 'bg-sky-500/20 text-sky-300';
    case 'appstate': return 'bg-amber-500/20 text-amber-300';
    case 'deeplink': return 'bg-emerald-500/20 text-emerald-300';
    default: return 'bg-gray-700 text-gray-300';
  }
};

const platformIcon = (p: string): string => {
  if (p === 'ios') return '🍎';
  if (p === 'android') return '🤖';
  return '🌐';
};

const CrashLogs: React.FC = () => {
  const [logs, setLogs] = useState<CrashLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'ios' | 'android'>('all');
  const [fatalOnly, setFatalOnly] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'crashLogs'), orderBy('reportedAt', 'desc'), limit(FETCH_LIMIT));
      const snap = await getDocs(q);
      const items: CrashLog[] = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as CrashLog[];
      setLogs(items);
    } catch (error) {
      console.error('Error loading crash logs:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (platformFilter !== 'all' && l.platform !== platformFilter) return false;
      if (fatalOnly && !l.isFatal) return false;
      if (term && !(`${l.message} ${l.stack} ${l.source} ${l.breadcrumbs ?? ''}`.toLowerCase().includes(term))) return false;
      return true;
    });
  }, [logs, search, platformFilter, fatalOnly]);

  const groups = useMemo<CrashGroup[]>(() => {
    const map = new Map<string, CrashGroup>();
    for (const l of filtered) {
      const key = (l.message || '(no message)').trim();
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          message: key,
          count: 0,
          anyFatal: false,
          sources: new Set(),
          platforms: new Set(),
          appVersions: new Set(),
          lastSeenMs: 0,
          occurrences: [],
        };
        map.set(key, g);
      }
      g.count += 1;
      g.anyFatal = g.anyFatal || !!l.isFatal;
      if (l.source) g.sources.add(l.source);
      if (l.platform) g.platforms.add(l.platform);
      if (l.appVersion) g.appVersions.add(l.appVersion);
      g.lastSeenMs = Math.max(g.lastSeenMs, toMs(l.reportedAt), toMs(l.crashedAt));
      g.occurrences.push(l);
    }
    return Array.from(map.values()).sort((a, b) => b.lastSeenMs - a.lastSeenMs);
  }, [filtered]);

  const stats = useMemo(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return {
      total: logs.length,
      unique: new Set(logs.map((l) => (l.message || '').trim())).size,
      fatal: logs.filter((l) => l.isFatal).length,
      last24h: logs.filter((l) => toMs(l.reportedAt) >= dayAgo).length,
    };
  }, [logs]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const deleteOne = async (id: string) => {
    setBusy(id);
    try {
      await deleteDoc(doc(db, 'crashLogs', id));
      setLogs((prev) => prev.filter((l) => l.id !== id));
    } catch (error) {
      console.error('Error deleting crash log:', error);
    }
    setBusy(null);
  };

  const deleteGroup = async (g: CrashGroup) => {
    if (!confirm(`حذف كل (${g.count}) تقارير هذا الكراش؟`)) return;
    setBusy(g.key);
    try {
      // Firestore batches cap at 500 ops; group sizes are well under that.
      const batch = writeBatch(db);
      for (const occ of g.occurrences) batch.delete(doc(db, 'crashLogs', occ.id));
      await batch.commit();
      const ids = new Set(g.occurrences.map((o) => o.id));
      setLogs((prev) => prev.filter((l) => !ids.has(l.id)));
    } catch (error) {
      console.error('Error deleting crash group:', error);
    }
    setBusy(null);
  };

  const pruneOlderThan = async (days: number) => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const old = logs.filter((l) => toMs(l.reportedAt) < cutoff);
    if (old.length === 0) {
      alert(`لا توجد تقارير أقدم من ${days} يوم.`);
      return;
    }
    if (!confirm(`حذف ${old.length} تقرير أقدم من ${days} يوم؟`)) return;
    setBusy('__prune__');
    try {
      // Chunk into batches of 450 to stay under the 500-op limit.
      for (let i = 0; i < old.length; i += 450) {
        const batch = writeBatch(db);
        for (const l of old.slice(i, i + 450)) batch.delete(doc(db, 'crashLogs', l.id));
        await batch.commit();
      }
      const ids = new Set(old.map((l) => l.id));
      setLogs((prev) => prev.filter((l) => !ids.has(l.id)));
    } catch (error) {
      console.error('Error pruning crash logs:', error);
    }
    setBusy(null);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-7 h-7 text-red-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">سجل الأعطال (Crash Logs)</h1>
            <p className="text-gray-400 text-sm">تقارير الأعطال غير الملتقطة من أجهزة المستخدمين</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => pruneOlderThan(30)}
            disabled={busy === '__prune__'}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white text-sm"
            title="حذف التقارير الأقدم من 30 يوم"
          >
            <Trash2 className={`w-4 h-4 ${busy === '__prune__' ? 'animate-pulse' : ''}`} />
            تنظيف &gt; 30 يوم
          </button>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Bug className="w-5 h-5" />} label="إجمالي التقارير" value={stats.total} tone="text-sky-400" />
        <StatCard icon={<Layers className="w-5 h-5" />} label="أعطال فريدة" value={stats.unique} tone="text-violet-400" />
        <StatCard icon={<Flame className="w-5 h-5" />} label="Fatal" value={stats.fatal} tone="text-red-400" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="آخر 24 ساعة" value={stats.last24h} tone="text-amber-400" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في الرسالة / الـ stack / المصدر…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pr-9 pl-3 text-white text-sm focus:border-emerald-500 outline-none"
          />
        </div>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value as 'all' | 'ios' | 'android')}
          title="تصفية حسب المنصة"
          className="bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white text-sm outline-none focus:border-emerald-500"
        >
          <option value="all">كل المنصات</option>
          <option value="android">🤖 Android</option>
          <option value="ios">🍎 iOS</option>
        </select>
        <button
          onClick={() => setFatalOnly((v) => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border ${
            fatalOnly
              ? 'bg-red-500/20 border-red-500/50 text-red-300'
              : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <Flame className="w-4 h-4" />
          Fatal فقط
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">لا توجد أعطال 🎉</p>
          <p className="text-sm mt-1">لم يُسجَّل أي كراش مطابق للفلاتر الحالية.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const isOpen = expanded.has(g.key);
            return (
              <div key={g.key} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <button onClick={() => toggle(g.key)} className="flex-1 text-right min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {g.anyFatal && (
                          <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 text-[11px] font-bold">FATAL</span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 text-[11px] font-bold">×{g.count}</span>
                        <code className="text-white text-sm font-mono break-words whitespace-pre-wrap">{g.message}</code>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(g.lastSeenMs)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Smartphone className="w-3 h-3" />
                          {Array.from(g.platforms).map((p) => `${platformIcon(p)} ${p}`).join('، ') || '—'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {Array.from(g.sources).join('، ') || '—'}
                        </span>
                        {g.appVersions.size > 0 && (
                          <span className="text-gray-400">v{Array.from(g.appVersions).join(', v')}</span>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => deleteGroup(g)}
                        disabled={busy === g.key}
                        className="text-gray-500 hover:text-red-400 transition-colors p-1"
                        title="حذف كل تقارير هذا الكراش"
                      >
                        <Trash2 className={`w-4 h-4 ${busy === g.key ? 'animate-pulse' : ''}`} />
                      </button>
                      <button onClick={() => toggle(g.key)} className="text-gray-500 hover:text-white p-1" title="تفاصيل">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-700 bg-gray-900/40 p-4 space-y-4">
                    {g.occurrences
                      .slice()
                      .sort((a, b) => toMs(b.reportedAt) - toMs(a.reportedAt))
                      .slice(0, 20)
                      .map((occ) => (
                        <div key={occ.id} className="border border-gray-800 rounded-lg p-3 bg-gray-900/60">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                              <span>{platformIcon(occ.platform)} {occ.platform || '—'}</span>
                              <span>{occ.appVersion ? `v${occ.appVersion}` : '—'}</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(occ.reportedAt)}</span>
                              {occ.userId && <span className="font-mono opacity-70">uid: {occ.userId.slice(0, 10)}…</span>}
                            </div>
                            <button
                              onClick={() => deleteOne(occ.id)}
                              disabled={busy === occ.id}
                              className="text-gray-600 hover:text-red-400 p-1"
                              title="حذف هذا التقرير"
                            >
                              <Trash2 className={`w-3.5 h-3.5 ${busy === occ.id ? 'animate-pulse' : ''}`} />
                            </button>
                          </div>
                          {/* Run-up trail: the screens/audio/memory events right
                              before the crash. The single most useful field for
                              attributing intermittent native closures. */}
                          {occ.breadcrumbs && (
                            <div className="mb-2">
                              <div className="flex items-center gap-1.5 text-[11px] text-emerald-300/80 mb-1">
                                <Footprints className="w-3.5 h-3.5" />
                                <span>المسار قبل العطل (آخر الأحداث ← لحظة العطل)</span>
                              </div>
                              <div className="flex items-center gap-1 flex-wrap bg-black/30 rounded-md p-2">
                                {occ.breadcrumbs.split(' | ').map((crumb, i, arr) => (
                                  <React.Fragment key={i}>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${crumbTone(crumb)}`}>
                                      {crumb}
                                    </span>
                                    {i < arr.length - 1 && <span className="text-gray-600 text-[10px]">←</span>}
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                          )}
                          {occ.stack ? (
                            <pre className="text-[11px] text-gray-400 font-mono whitespace-pre-wrap break-words max-h-64 overflow-auto bg-black/30 rounded-md p-2">
                              {occ.stack}
                            </pre>
                          ) : (
                            <p className="text-xs text-gray-600 italic">لا يوجد stack trace</p>
                          )}
                        </div>
                      ))}
                    {g.occurrences.length > 20 && (
                      <p className="text-xs text-gray-600 text-center">…وعرض أحدث 20 من أصل {g.occurrences.length}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number; tone: string }> = ({
  icon,
  label,
  value,
  tone,
}) => (
  <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-3">
    <div className={`${tone}`}>{icon}</div>
    <div>
      <p className="text-2xl font-bold text-white leading-none">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  </div>
);

export default CrashLogs;
