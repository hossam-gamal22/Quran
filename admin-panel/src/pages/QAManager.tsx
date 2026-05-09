import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// ==================== Types ====================
interface QAQuestion {
  id: string;
  question: Record<string, string>;
  answer: Record<string, string>;
  order: number;
  isVisible: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface QACategory {
  id: string;
  name: Record<string, string>;
  icon: string;
  order: number;
  isVisible: boolean;
  questions: QAQuestion[];
}

interface QAContent {
  categories: QACategory[];
  lastUpdated?: string;
  version?: number;
}

type LangCode = 'ar' | 'en' | 'fr' | 'de' | 'tr' | 'es' | 'ur' | 'id' | 'ms' | 'hi' | 'bn' | 'ru';

const LANGS: { code: LangCode; name: string; rtl?: boolean }[] = [
  { code: 'ar', name: 'العربية', rtl: true },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'es', name: 'Español' },
  { code: 'ur', name: 'اردو', rtl: true },
  { code: 'id', name: 'Indonesia' },
  { code: 'ms', name: 'Melayu' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'ru', name: 'Русский' },
];

const genId = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// ==================== Component ====================
export default function QAManager() {
  const [data, setData] = useState<QAContent>({ categories: [], version: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeLang, setActiveLang] = useState<LangCode>('ar');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<{ catId: string; question: QAQuestion } | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [toast, setToast] = useState('');

  // ========== Load ==========
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const snap = await getDoc(doc(db, 'qaContent', 'main'));
      if (snap.exists()) {
        setData(snap.data() as QAContent);
      }
    } catch (e) {
      console.error('Error loading QA data:', e);
    } finally {
      setLoading(false);
    }
  };

  // ========== Save ==========
  const saveData = useCallback(async (newData: QAContent) => {
    setSaving(true);
    try {
      const toSave = {
        ...newData,
        lastUpdated: new Date().toISOString(),
        version: (newData.version || 0) + 1,
      };
      await setDoc(doc(db, 'qaContent', 'main'), toSave);
      setData(toSave);
      showToast('تم الحفظ بنجاح ✅');
    } catch (e) {
      console.error('Error saving:', e);
      showToast('خطأ في الحفظ ❌');
    } finally {
      setSaving(false);
    }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // ========== Category CRUD ==========
  const addCategory = () => {
    if (!newCatName.trim()) return;
    const newCat: QACategory = {
      id: genId(),
      name: { ar: newCatName.trim() },
      icon: 'help-circle',
      order: data.categories.length,
      isVisible: true,
      questions: [],
    };
    const updated = { ...data, categories: [...data.categories, newCat] };
    setData(updated);
    saveData(updated);
    setNewCatName('');
  };

  const toggleCatVisibility = (catId: string) => {
    const updated = {
      ...data,
      categories: data.categories.map(c =>
        c.id === catId ? { ...c, isVisible: !c.isVisible } : c
      ),
    };
    setData(updated);
    saveData(updated);
  };

  const deleteCat = (catId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القسم وجميع أسئلته؟')) return;
    const updated = {
      ...data,
      categories: data.categories.filter(c => c.id !== catId),
    };
    setData(updated);
    saveData(updated);
  };

  const moveCat = (catId: string, dir: -1 | 1) => {
    const cats = [...data.categories].sort((a, b) => a.order - b.order);
    const idx = cats.findIndex(c => c.id === catId);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= cats.length) return;
    [cats[idx], cats[newIdx]] = [cats[newIdx], cats[idx]];
    const reordered = cats.map((c, i) => ({ ...c, order: i }));
    const updated = { ...data, categories: reordered };
    setData(updated);
    saveData(updated);
  };

  const saveCatName = (catId: string, lang: LangCode, value: string) => {
    const updated = {
      ...data,
      categories: data.categories.map(c =>
        c.id === catId ? { ...c, name: { ...c.name, [lang]: value } } : c
      ),
    };
    setData(updated);
  };

  const commitCatEdit = () => {
    setEditingCatId(null);
    saveData(data);
  };

  // ========== Question CRUD ==========
  const addQuestion = (catId: string) => {
    const newQ: QAQuestion = {
      id: genId(),
      question: { ar: '' },
      answer: { ar: '' },
      order: (data.categories.find(c => c.id === catId)?.questions.length || 0),
      isVisible: true,
      createdAt: new Date().toISOString(),
    };
    setEditingQuestion({ catId, question: newQ });
  };

  const saveQuestion = (catId: string, question: QAQuestion) => {
    const updated = {
      ...data,
      categories: data.categories.map(c => {
        if (c.id !== catId) return c;
        const existing = c.questions.findIndex(q => q.id === question.id);
        const updatedQ = { ...question, updatedAt: new Date().toISOString() };
        const questions = existing >= 0
          ? c.questions.map(q => q.id === question.id ? updatedQ : q)
          : [...c.questions, updatedQ];
        return { ...c, questions };
      }),
    };
    setData(updated);
    saveData(updated);
    setEditingQuestion(null);
  };

  const toggleQuestionVisibility = (catId: string, qId: string) => {
    const updated = {
      ...data,
      categories: data.categories.map(c => {
        if (c.id !== catId) return c;
        return {
          ...c,
          questions: c.questions.map(q =>
            q.id === qId ? { ...q, isVisible: !q.isVisible } : q
          ),
        };
      }),
    };
    setData(updated);
    saveData(updated);
  };

  const deleteQuestion = (catId: string, qId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
    const updated = {
      ...data,
      categories: data.categories.map(c => {
        if (c.id !== catId) return c;
        return { ...c, questions: c.questions.filter(q => q.id !== qId) };
      }),
    };
    setData(updated);
    saveData(updated);
  };

  // ========== Render ==========
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const sortedCats = [...data.categories].sort((a, b) => a.order - b.order);

  return (
    <div className="max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">❓ إدارة سؤال وجواب</h1>
          <p className="text-sm text-admin-muted mt-1">
            {data.categories.length} قسم • {data.categories.reduce((s, c) => s + c.questions.length, 0)} سؤال
          </p>
        </div>
        {saving && (
          <span className="text-sm text-emerald-400 animate-pulse">جاري الحفظ...</span>
        )}
      </div>

      {/* Language Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {LANGS.map(l => (
          <button
            key={l.code}
            onClick={() => setActiveLang(l.code)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeLang === l.code
                ? 'bg-emerald-500 text-white'
                : 'bg-admin-surface text-admin-muted hover:text-white'
            }`}
          >
            {l.name}
          </button>
        ))}
      </div>

      {/* Add Category */}
      <div className="bg-admin-surface rounded-xl p-4 mb-6 flex gap-3 items-center">
        <input
          value={newCatName}
          onChange={e => setNewCatName(e.target.value)}
          placeholder="اسم القسم الجديد (بالعربية)"
          className="flex-1 bg-admin-bg rounded-lg px-4 py-2.5 text-white text-sm border border-admin-border/50 focus:border-emerald-500/50 outline-none"
          dir="rtl"
          onKeyDown={e => e.key === 'Enter' && addCategory()}
        />
        <button
          onClick={addCategory}
          disabled={!newCatName.trim()}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + إضافة قسم
        </button>
      </div>

      {/* Categories List */}
      <div className="space-y-3">
        {sortedCats.map((cat, catIdx) => (
          <div key={cat.id} className="bg-admin-surface rounded-xl border border-admin-border/50 overflow-hidden">
            {/* Category Header */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex gap-1">
                <button
                  onClick={() => moveCat(cat.id, -1)}
                  disabled={catIdx === 0}
                  className="p-1 text-admin-muted hover:text-white disabled:opacity-20 transition-colors"
                  title="لأعلى"
                >▲</button>
                <button
                  onClick={() => moveCat(cat.id, 1)}
                  disabled={catIdx === sortedCats.length - 1}
                  className="p-1 text-admin-muted hover:text-white disabled:opacity-20 transition-colors"
                  title="لأسفل"
                >▼</button>
              </div>

              <div
                onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                className="flex-1 text-right cursor-pointer"
              >
                <span className={`font-semibold ${cat.isVisible ? 'text-white' : 'text-admin-muted line-through'}`}>
                  {editingCatId === cat.id ? (
                    <input
                      value={cat.name[activeLang] || ''}
                      onChange={e => saveCatName(cat.id, activeLang, e.target.value)}
                      onBlur={commitCatEdit}
                      onKeyDown={e => e.key === 'Enter' && commitCatEdit()}
                      className="bg-admin-bg rounded px-2 py-1 text-white text-sm border border-emerald-500/50 outline-none w-64"
                      dir={LANGS.find(l => l.code === activeLang)?.rtl ? 'rtl' : 'ltr'}
                      autoFocus
                      aria-label="اسم القسم"
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    cat.name[activeLang] || cat.name['ar'] || '(بدون اسم)'
                  )}
                </span>
                <span className="text-xs text-admin-muted mr-2">
                  ({cat.questions.length} سؤال)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingCatId(editingCatId === cat.id ? null : cat.id)}
                  className="p-1.5 text-admin-muted hover:text-blue-400 transition-colors"
                  title="تعديل الاسم"
                >✏️</button>
                <button
                  onClick={() => toggleCatVisibility(cat.id)}
                  className="p-1.5 transition-colors"
                  title={cat.isVisible ? 'إخفاء' : 'إظهار'}
                >
                  {cat.isVisible ? '👁️' : '🚫'}
                </button>
                <button
                  onClick={() => deleteCat(cat.id)}
                  className="p-1.5 text-admin-muted hover:text-red-400 transition-colors"
                  title="حذف"
                >🗑️</button>
                <span className="text-admin-muted text-xs cursor-pointer" onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}>
                  {expandedCat === cat.id ? '▲' : '▼'}
                </span>
              </div>
            </div>

            {/* Questions List */}
            {expandedCat === cat.id && (
              <div className="border-t border-admin-border/50 p-4 space-y-2">
                {cat.questions
                  .sort((a, b) => a.order - b.order)
                  .map(q => (
                    <div
                      key={q.id}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        q.isVisible ? 'bg-admin-bg' : 'bg-admin-bg/50 opacity-60'
                      }`}
                    >
                      <div className="flex-1 text-sm text-white truncate" dir={LANGS.find(l => l.code === activeLang)?.rtl ? 'rtl' : 'ltr'}>
                        {q.question[activeLang] || q.question['ar'] || '(بدون نص)'}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setEditingQuestion({ catId: cat.id, question: { ...q } })}
                          className="p-1 text-admin-muted hover:text-blue-400 text-xs"
                          title="تعديل"
                        >✏️</button>
                        <button
                          onClick={() => toggleQuestionVisibility(cat.id, q.id)}
                          className="p-1 text-xs"
                          title={q.isVisible ? 'إخفاء' : 'إظهار'}
                        >{q.isVisible ? '👁️' : '🚫'}</button>
                        <button
                          onClick={() => deleteQuestion(cat.id, q.id)}
                          className="p-1 text-admin-muted hover:text-red-400 text-xs"
                          title="حذف"
                        >🗑️</button>
                      </div>
                    </div>
                  ))}

                <button
                  onClick={() => addQuestion(cat.id)}
                  className="w-full py-2.5 border-2 border-dashed border-admin-border/50 hover:border-emerald-500/50 rounded-lg text-sm text-admin-muted hover:text-emerald-400 transition-colors"
                >
                  + إضافة سؤال جديد
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {sortedCats.length === 0 && (
        <div className="text-center py-20 text-admin-muted">
          <p className="text-4xl mb-4">❓</p>
          <p>لا توجد أقسام بعد. أضف قسمًا للبدء.</p>
        </div>
      )}

      {/* Question Edit Modal */}
      {editingQuestion && (
        <QuestionEditModal
          catId={editingQuestion.catId}
          question={editingQuestion.question}
          activeLang={activeLang}
          onSave={saveQuestion}
          onClose={() => setEditingQuestion(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-admin-surface text-white px-6 py-3 rounded-xl shadow-2xl border border-admin-border/50 text-sm z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}

// ==================== Question Edit Modal ====================
function QuestionEditModal({
  catId,
  question,
  activeLang,
  onSave,
  onClose,
}: {
  catId: string;
  question: QAQuestion;
  activeLang: LangCode;
  onSave: (catId: string, q: QAQuestion) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState<QAQuestion>(question);
  const [lang, setLang] = useState<LangCode>(activeLang);

  const isRTL = LANGS.find(l => l.code === lang)?.rtl;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-admin-surface rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
        dir="rtl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-white mb-4">
          {question.createdAt && !question.updatedAt ? 'سؤال جديد' : 'تعديل السؤال'}
        </h3>

        {/* Lang tabs */}
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`px-2.5 py-1 rounded text-xs transition-all ${
                lang === l.code
                  ? 'bg-emerald-500 text-white'
                  : 'bg-admin-bg text-admin-muted hover:text-white'
              }`}
            >
              {l.name}
            </button>
          ))}
        </div>

        {/* Question */}
        <div className="mb-4">
          <label className="text-sm text-admin-muted mb-1.5 block">السؤال ({LANGS.find(l => l.code === lang)?.name})</label>
          <textarea
            value={q.question[lang] || ''}
            onChange={e => setQ({ ...q, question: { ...q.question, [lang]: e.target.value } })}
            className="w-full bg-admin-bg rounded-lg px-4 py-3 text-white text-sm border border-admin-border/50 focus:border-emerald-500/50 outline-none resize-none h-24"
            dir={isRTL ? 'rtl' : 'ltr'}
            placeholder="اكتب السؤال هنا..."
          />
        </div>

        {/* Answer */}
        <div className="mb-6">
          <label className="text-sm text-admin-muted mb-1.5 block">الجواب ({LANGS.find(l => l.code === lang)?.name})</label>
          <textarea
            value={q.answer[lang] || ''}
            onChange={e => setQ({ ...q, answer: { ...q.answer, [lang]: e.target.value } })}
            className="w-full bg-admin-bg rounded-lg px-4 py-3 text-white text-sm border border-admin-border/50 focus:border-emerald-500/50 outline-none resize-none h-40"
            dir={isRTL ? 'rtl' : 'ltr'}
            placeholder="اكتب الجواب هنا..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-admin-bg text-admin-muted hover:text-white rounded-lg text-sm transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={() => onSave(catId, q)}
            disabled={!q.question['ar']?.trim()}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
          >
            حفظ السؤال
          </button>
        </div>
      </div>
    </div>
  );
}
