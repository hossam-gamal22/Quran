/**
 * TranslationOverrides — Admin page for managing translation overrides.
 * Admins can search for any Arabic text, see auto-translations per language,
 * correct them, and save overrides to Firestore.
 *
 * Firestore collection: `translationOverrides`
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Save, X, Plus, Trash2, Edit2, Languages, ChevronDown,
  ChevronUp, CheckCircle, AlertCircle, RefreshCw, Globe,
} from 'lucide-react';
import { db } from '../firebase';
import {
  collection, getDocs, doc, setDoc, deleteDoc, query, orderBy,
} from 'firebase/firestore';
import {
  LANGUAGES,
  translateToAll,
  type LangCode,
} from '@app-lib/unifiedTranslator';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TranslationOverrideDoc {
  id: string;
  sourceText: string;
  overrides: Partial<Record<LangCode, string>>;
  screen?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COLLECTION_NAME = 'translationOverrides';

const LANG_FLAGS: Record<string, string> = {
  ar: '🇸🇦', en: '🇺🇸', fr: '🇫🇷', tr: '🇹🇷', ur: '🇵🇰',
  de: '🇩🇪', es: '🇪🇸', hi: '🇮🇳', bn: '🇧🇩', id: '🇮🇩',
  ms: '🇲🇾', ru: '🇷🇺',
};

const SCREEN_OPTIONS = [
  'all', 'hajj', 'umrah', 'seerah', 'companions', 'mawlid',
  'ashura', 'ramadan', 'seasonal', 'azkar', 'prayer', 'quran', 'other',
];

/** Generate a stable Firestore doc ID from source text */
function makeDocId(sourceText: string): string {
  // Use a simple hash of the text for the document ID
  let hash = 0;
  const str = sourceText.trim();
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `override_${Math.abs(hash).toString(36)}_${str.length}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

const TranslationOverrides: React.FC = () => {
  const [overrides, setOverrides] = useState<TranslationOverrideDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScreen, setFilterScreen] = useState('all');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // New/Edit form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formSourceText, setFormSourceText] = useState('');
  const [formScreen, setFormScreen] = useState('other');
  const [formOverrides, setFormOverrides] = useState<Partial<Record<LangCode, string>>>({});
  const [autoTranslating, setAutoTranslating] = useState(false);
  const [autoTranslateProgress, setAutoTranslateProgress] = useState<Partial<Record<LangCode, string>>>({});

  // Expanded rows
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // ─── Load from Firestore ─────────────────────────────────────────────────

  useEffect(() => {
    loadOverrides();
  }, []);

  const loadOverrides = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      const items: TranslationOverrideDoc[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      } as TranslationOverrideDoc));
      setOverrides(items);
    } catch (err) {
      console.error('Failed to load overrides:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Filtered list ───────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return overrides.filter(item => {
      if (filterScreen !== 'all' && item.screen !== filterScreen) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchSource = item.sourceText.toLowerCase().includes(q);
        const matchOverride = Object.values(item.overrides).some(v =>
          v?.toLowerCase().includes(q)
        );
        return matchSource || matchOverride;
      }
      return true;
    });
  }, [overrides, searchQuery, filterScreen]);

  // ─── Save override ───────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!formSourceText.trim()) return;

    const nonEmptyOverrides: Partial<Record<LangCode, string>> = {};
    for (const [lang, val] of Object.entries(formOverrides)) {
      if (val?.trim()) {
        nonEmptyOverrides[lang as LangCode] = val.trim();
      }
    }

    if (Object.keys(nonEmptyOverrides).length === 0) return;

    setSaveStatus('saving');
    try {
      const docId = editingId || makeDocId(formSourceText);
      const now = new Date().toISOString();

      const docData: Omit<TranslationOverrideDoc, 'id'> = {
        sourceText: formSourceText.trim(),
        overrides: nonEmptyOverrides,
        screen: formScreen,
        createdAt: editingId
          ? overrides.find(o => o.id === editingId)?.createdAt || now
          : now,
        updatedAt: now,
      };

      await setDoc(doc(db, COLLECTION_NAME, docId), docData);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);

      resetForm();
      await loadOverrides();
    } catch (err) {
      console.error('Failed to save override:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // ─── Delete override ─────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل تريد حذف هذا التعديل؟ سيتم استخدام الترجمة التلقائية بدلاً منه.')) return;

    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
      await loadOverrides();
    } catch (err) {
      console.error('Failed to delete override:', err);
    }
  };

  // ─── Edit existing override ──────────────────────────────────────────────

  const handleEdit = (item: TranslationOverrideDoc) => {
    setEditingId(item.id);
    setFormSourceText(item.sourceText);
    setFormScreen(item.screen || 'other');
    setFormOverrides({ ...item.overrides });
    setShowForm(true);
    setAutoTranslateProgress({});
  };

  // ─── Auto-translate ──────────────────────────────────────────────────────

  const handleAutoTranslate = async () => {
    if (!formSourceText.trim()) return;

    setAutoTranslating(true);
    setAutoTranslateProgress({});

    try {
      await translateToAll(
        {
          text: formSourceText.trim(),
          sourceLang: 'ar',
          contentType: 'section',
        },
        (lang, result) => {
          if (result.text && result.source !== 'FAILED') {
            setAutoTranslateProgress(prev => ({
              ...prev,
              [lang]: result.text,
            }));
            // Only fill if not already set by admin
            setFormOverrides(prev => ({
              ...prev,
              [lang]: prev[lang] || result.text,
            }));
          }
        },
      );
    } catch (err) {
      console.error('Auto-translate failed:', err);
    } finally {
      setAutoTranslating(false);
    }
  };

  // ─── Reset form ──────────────────────────────────────────────────────────

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormSourceText('');
    setFormScreen('other');
    setFormOverrides({});
    setAutoTranslateProgress({});
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Languages className="w-8 h-8 text-emerald-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">إدارة الترجمات</h1>
            <p className="text-sm text-gray-500">
              تعديل الترجمات التلقائية — التعديلات تُطبق فوراً على جميع المستخدمين
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {overrides.length} تعديل
          </span>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة تعديل جديد
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {editingId ? 'تعديل الترجمة' : 'إضافة تعديل ترجمة جديد'}
            </h2>
            <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded" title="إغلاق" aria-label="إغلاق">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Source text input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              النص العربي الأصلي
            </label>
            <textarea
              value={formSourceText}
              onChange={e => setFormSourceText(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg p-3 text-right text-lg leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="أدخل النص العربي المراد تعديل ترجمته..."
              aria-label="النص العربي الأصلي"
              dir="rtl"
            />
          </div>

          {/* Screen selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الصفحة
            </label>
            <select
              value={formScreen}
              onChange={e => setFormScreen(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500"
              title="الصفحة"
              aria-label="الصفحة"
            >
              {SCREEN_OPTIONS.filter(s => s !== 'all').map(screen => (
                <option key={screen} value={screen}>{screen}</option>
              ))}
            </select>
          </div>

          {/* Auto-translate button */}
          <div className="mb-4">
            <button
              onClick={handleAutoTranslate}
              disabled={autoTranslating || !formSourceText.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {autoTranslating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
              ترجمة تلقائية لجميع اللغات
            </button>
            {autoTranslating && (
              <p className="text-sm text-blue-600 mt-1">جاري الترجمة التلقائية...</p>
            )}
          </div>

          {/* Language fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {LANGUAGES.filter(l => l.code !== 'ar').map(lang => (
              <div key={lang.code} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">
                    {LANG_FLAGS[lang.code]} {lang.name} ({lang.code})
                  </label>
                  {autoTranslateProgress[lang.code as LangCode] && !formOverrides[lang.code as LangCode] && (
                    <span className="text-xs text-blue-500">ترجمة تلقائية</span>
                  )}
                  {formOverrides[lang.code as LangCode] && (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  )}
                </div>
                <textarea
                  value={formOverrides[lang.code as LangCode] || ''}
                  onChange={e => setFormOverrides(prev => ({
                    ...prev,
                    [lang.code]: e.target.value,
                  }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded p-2 text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder={`ترجمة ${lang.name}...`}
                  aria-label={`ترجمة ${lang.name}`}
                  dir={lang.rtl ? 'rtl' : 'ltr'}
                />
              </div>
            ))}
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={!formSourceText.trim() || Object.values(formOverrides).every(v => !v?.trim())}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              {editingId ? 'تحديث' : 'حفظ'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-600 text-sm">
                <CheckCircle className="w-4 h-4" /> تم الحفظ
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" /> فشل الحفظ
              </span>
            )}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث في النصوص والترجمات..."
            aria-label="بحث في النصوص والترجمات"
            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            dir="rtl"
          />
        </div>
        <select
          value={filterScreen}
          onChange={e => setFilterScreen(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500"
          title="تصفية حسب الصفحة"
          aria-label="تصفية حسب الصفحة"
        >
          <option value="all">جميع الصفحات</option>
          {SCREEN_OPTIONS.filter(s => s !== 'all').map(screen => (
            <option key={screen} value={screen}>{screen}</option>
          ))}
        </select>
        <button
          onClick={loadOverrides}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          title="تحديث"
          aria-label="تحديث"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-500 mb-2">
        {filtered.length} نتيجة {searchQuery && `للبحث "${searchQuery}"`}
      </div>

      {/* Overrides List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchQuery ? 'لا توجد نتائج' : 'لا توجد تعديلات بعد — أضف أول تعديل ترجمة'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Row header */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {expandedRow === item.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-medium text-gray-900 truncate" dir="rtl">
                      {item.sourceText}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {item.screen || 'other'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {Object.keys(item.overrides).length} لغة
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(item.updatedAt).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 mr-3">
                  <button
                    onClick={e => { e.stopPropagation(); handleEdit(item); }}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="تعديل"
                    aria-label="تعديل"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(item.id); }}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                    title="حذف"
                    aria-label="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded translations */}
              {expandedRow === item.id && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {LANGUAGES.filter(l => l.code !== 'ar').map(lang => {
                      const value = item.overrides[lang.code as LangCode];
                      return (
                        <div
                          key={lang.code}
                          className={`rounded-lg p-2 border ${
                            value
                              ? 'border-emerald-200 bg-emerald-50'
                              : 'border-gray-200 bg-white opacity-50'
                          }`}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-xs">{LANG_FLAGS[lang.code]}</span>
                            <span className="text-xs font-medium text-gray-600">
                              {lang.name}
                            </span>
                            {value && <CheckCircle className="w-3 h-3 text-emerald-500 mr-auto" />}
                          </div>
                          <p
                            className="text-sm text-gray-800"
                            dir={lang.rtl ? 'rtl' : 'ltr'}
                          >
                            {value || '—'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TranslationOverrides;
