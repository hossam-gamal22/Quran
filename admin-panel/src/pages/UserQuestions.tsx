import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

interface UserQuestion {
  id: string;
  userName?: string;
  userEmail?: string;
  registeredName?: string;
  question: string;
  language: string;
  status: 'pending' | 'reviewed' | 'answered';
  createdAt: string;
  notes?: string;
}

type StatusFilter = 'all' | 'pending' | 'reviewed' | 'answered';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'جديد', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  reviewed: { label: 'تمت المراجعة', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  answered: { label: 'تم الرد', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

export default function UserQuestions() {
  const [questions, setQuestions] = useState<UserQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'userQuestions'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items: UserQuestion[] = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as UserQuestion[];
      setQuestions(items);
      setLoading(false);
    }, (err) => {
      console.error('Error loading user questions:', err);
      setLoading(false);
    });
    return unsub;
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const updateStatus = useCallback(async (id: string, status: UserQuestion['status']) => {
    try {
      await updateDoc(doc(db, 'userQuestions', id), { status });
      showToast('تم تحديث الحالة ✅');
    } catch (e) {
      console.error('Error updating status:', e);
      showToast('خطأ في التحديث ❌');
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
    try {
      await deleteDoc(doc(db, 'userQuestions', id));
      showToast('تم الحذف ✅');
    } catch (e) {
      console.error('Error deleting:', e);
      showToast('خطأ في الحذف ❌');
    }
  }, []);

  const handleReply = useCallback((q: UserQuestion) => {
    if (!q.userEmail) {
      showToast('لا يوجد بريد إلكتروني للمستخدم');
      return;
    }
    const subject = encodeURIComponent('رد على سؤالك في تطبيق روح المسلم');
    const body = encodeURIComponent(`السلام عليكم ${q.userName || ''},\n\nبخصوص سؤالك:\n"${q.question}"\n\n`);
    window.open(`mailto:${q.userEmail}?subject=${subject}&body=${body}`);
    updateStatus(q.id, 'answered');
  }, [updateStatus]);

  const filtered = questions.filter(q => {
    if (filter !== 'all' && q.status !== filter) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return (
        q.question.toLowerCase().includes(s) ||
        (q.userName || '').toLowerCase().includes(s) ||
        (q.userEmail || '').toLowerCase().includes(s)
      );
    }
    return true;
  });

  const counts = {
    all: questions.length,
    pending: questions.filter(q => q.status === 'pending').length,
    reviewed: questions.filter(q => q.status === 'reviewed').length,
    answered: questions.filter(q => q.status === 'answered').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">📩 أسئلة المستخدمين</h1>
        <p className="text-sm text-admin-muted mt-1">
          {questions.length} سؤال • {counts.pending} جديد
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-2">
          {(['all', 'pending', 'reviewed', 'answered'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === s
                  ? 'bg-emerald-500 text-white'
                  : 'bg-admin-surface text-admin-muted hover:text-white'
              }`}
            >
              {s === 'all' ? 'الكل' : STATUS_MAP[s].label} ({counts[s]})
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث..."
          className="flex-1 min-w-[200px] bg-admin-surface rounded-lg px-4 py-2 text-white text-sm border border-admin-border/50 focus:border-emerald-500/50 outline-none"
          dir="rtl"
        />
      </div>

      {/* Questions Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-admin-muted">
          <p className="text-4xl mb-4">📭</p>
          <p>{search ? 'لا توجد نتائج للبحث' : 'لا توجد أسئلة بعد'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(q => (
            <div key={q.id} className="bg-admin-surface rounded-xl p-4 border border-admin-border/50">
              <div className="flex items-start gap-4">
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm leading-relaxed mb-2">{q.question}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-admin-muted">
                    {q.userName && <span>👤 {q.userName}</span>}
                    {q.registeredName && q.registeredName !== q.userName && (
                      <span className="text-xs text-blue-400">🪪 مسجّل: {q.registeredName}</span>
                    )}
                    {q.userEmail && <span>📧 {q.userEmail}</span>}
                    <span>🌐 {q.language}</span>
                    <span>📅 {new Date(q.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_MAP[q.status]?.bg} ${STATUS_MAP[q.status]?.color}`}>
                    {STATUS_MAP[q.status]?.label}
                  </span>

                  <select
                    value={q.status}
                    onChange={e => updateStatus(q.id, e.target.value as UserQuestion['status'])}
                    className="bg-admin-bg text-white text-xs rounded-lg px-2 py-1.5 border border-admin-border/50 outline-none cursor-pointer"
                    aria-label="حالة السؤال"
                  >
                    <option value="pending">جديد</option>
                    <option value="reviewed">تمت المراجعة</option>
                    <option value="answered">تم الرد</option>
                  </select>

                  {q.userEmail && (
                    <button
                      onClick={() => handleReply(q)}
                      className="p-1.5 text-admin-muted hover:text-emerald-400 transition-colors"
                      title="رد بالبريد"
                    >📧</button>
                  )}

                  <button
                    onClick={() => handleDelete(q.id)}
                    className="p-1.5 text-admin-muted hover:text-red-400 transition-colors"
                    title="حذف"
                  >🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-admin-surface text-white px-6 py-3 rounded-xl shadow-2xl border border-admin-border/50 text-sm z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
