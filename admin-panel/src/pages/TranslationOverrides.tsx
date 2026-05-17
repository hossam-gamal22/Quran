/**
 * TranslationOverrides — Admin page for live translation overrides.
 *
 * Firestore:
 * - `translationOverrides`: exact Arabic text overrides for auto-translated dynamic content.
 * - `translations/{lang}`: UI key overrides used by `t('some.key')`.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Save,
  X,
  Plus,
  Trash2,
  Edit2,
  Languages,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Globe,
  KeyRound,
  Type,
  Sparkles,
  Info,
  Wand2,
} from 'lucide-react';
import { db } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import {
  LANGUAGES,
  translateToAll,
  type LangCode,
} from '@app-lib/unifiedTranslator';

interface TranslationOverrideDoc {
  id: string;
  sourceText: string;
  overrides: Partial<Record<LangCode, string>>;
  createdAt: string;
  updatedAt: string;
}

interface RemoteTranslationPack {
  strings: Record<string, any>;
  version?: number;
  updatedAt?: string;
}

interface UiOverrideDoc {
  id: string;
  key: string;
  lang: LangCode;
  value: string;
  version: number;
  updatedAt: string;
}

type OverrideMode = 'auto' | 'ui';

const AUTO_COLLECTION = 'translationOverrides';
const UI_COLLECTION = 'translations';

const LANG_FLAGS: Record<string, string> = {
  ar: '🇸🇦', en: '🇺🇸', fr: '🇫🇷', tr: '🇹🇷', ur: '🇵🇰',
  de: '🇩🇪', es: '🇪🇸', hi: '🇮🇳', bn: '🇧🇩', id: '🇮🇩',
  ms: '🇲🇾', ru: '🇷🇺',
};

const UI_KEY_EXAMPLES = [
  'tabs.home',
  'tabs.quran',
  'tabs.azkar',
  'tabs.prayer',
  'tabs.settings',
  'common.save',
  'common.cancel',
  'common.search',
  'settings.language',
  'settings.notifications',
  'quran.translationToOtherLanguages',
  'azkar.translation',
];

function makeDocId(sourceText: string): string {
  let hash = 0;
  const str = sourceText.trim();
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `override_${Math.abs(hash).toString(36)}_${str.length}`;
}

function flattenStrings(input: Record<string, any>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  Object.entries(input || {}).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[path] = value;
      return;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenStrings(value, path));
    }
  });
  return result;
}

function isGeneratedPlaceholderTranslation(value: string): boolean {
  const normalized = value.trim().toLowerCase().replace(/[_-]/g, ' ');
  return /^(virtue|reference|benefit|title|subtitle|label|body)?[a-z]+(?:tasbih|azkar|dua|dhikr|daily|seasonal|prayer|quran|default)\s+default\s+\d+$/.test(normalized);
}

const getLanguageLabel = (code: LangCode) => {
  const lang = LANGUAGES.find(item => item.code === code);
  return `${LANG_FLAGS[code] || '🌍'} ${lang?.name || code}`;
};

const TranslationOverrides: React.FC = () => {
  const [mode, setMode] = useState<OverrideMode>('ui');
  const [autoOverrides, setAutoOverrides] = useState<TranslationOverrideDoc[]>([]);
  const [remotePacks, setRemotePacks] = useState<Record<string, RemoteTranslationPack>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [showForm, setShowForm] = useState(false);
  const [editingAutoId, setEditingAutoId] = useState<string | null>(null);
  const [editingUiId, setEditingUiId] = useState<string | null>(null);
  const [formSourceText, setFormSourceText] = useState('');
  const [formOverrides, setFormOverrides] = useState<Partial<Record<LangCode, string>>>({});
  const [uiKey, setUiKey] = useState('');
  const [uiLang, setUiLang] = useState<LangCode>('en');
  const [uiValue, setUiValue] = useState('');
  const [autoTranslating, setAutoTranslating] = useState(false);

  useEffect(() => {
    setLoading(true);
    let autoReady = false;
    let uiReady = false;

    const markReady = () => {
      if (autoReady && uiReady) setLoading(false);
    };

    const unsubscribeAuto = onSnapshot(
      query(collection(db, AUTO_COLLECTION), orderBy('updatedAt', 'desc')),
      (snapshot) => {
        setAutoOverrides(snapshot.docs.map(d => ({
          id: d.id,
          ...d.data(),
        } as TranslationOverrideDoc)));
        autoReady = true;
        markReady();
      },
      (error) => {
        console.error('Failed to listen to translation overrides:', error);
        autoReady = true;
        markReady();
      },
    );

    const unsubscribeUi = onSnapshot(
      collection(db, UI_COLLECTION),
      (snapshot) => {
        const packs: Record<string, RemoteTranslationPack> = {};
        snapshot.docs.forEach(docSnap => {
          packs[docSnap.id] = docSnap.data() as RemoteTranslationPack;
        });
        setRemotePacks(packs);
        uiReady = true;
        markReady();
      },
      (error) => {
        console.error('Failed to listen to UI translations:', error);
        uiReady = true;
        markReady();
      },
    );

    return () => {
      unsubscribeAuto();
      unsubscribeUi();
    };
  }, []);

  const uiOverrides = useMemo<UiOverrideDoc[]>(() => {
    const items: UiOverrideDoc[] = [];
    Object.entries(remotePacks).forEach(([lang, pack]) => {
      const strings = flattenStrings(pack.strings || {});
      Object.entries(strings).forEach(([key, value]) => {
        items.push({
          id: `${lang}:${key}`,
          key,
          lang: lang as LangCode,
          value,
          version: pack.version || 0,
          updatedAt: pack.updatedAt || '',
        });
      });
    });
    return items.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }, [remotePacks]);

  const filteredAuto = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return autoOverrides;
    return autoOverrides.filter(item => (
      item.sourceText.toLowerCase().includes(q) ||
      Object.values(item.overrides).some(value => value?.toLowerCase().includes(q))
    ));
  }, [autoOverrides, searchQuery]);

  const filteredUi = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return uiOverrides;
    return uiOverrides.filter(item => (
      item.key.toLowerCase().includes(q) ||
      item.value.toLowerCase().includes(q) ||
      item.lang.toLowerCase().includes(q)
    ));
  }, [uiOverrides, searchQuery]);

  const resetForm = () => {
    setShowForm(false);
    setEditingAutoId(null);
    setEditingUiId(null);
    setFormSourceText('');
    setFormOverrides({});
    setUiKey('');
    setUiLang('en');
    setUiValue('');
  };

  const startNew = (nextMode = mode) => {
    resetForm();
    setMode(nextMode);
    setShowForm(true);
  };

  const handleAutoSave = async () => {
    if (!formSourceText.trim()) return;

    const nonEmptyOverrides: Partial<Record<LangCode, string>> = {};
    Object.entries(formOverrides).forEach(([lang, value]) => {
      if (value?.trim()) nonEmptyOverrides[lang as LangCode] = value.trim();
    });
    if (Object.keys(nonEmptyOverrides).length === 0) return;
    if (Object.values(nonEmptyOverrides).some(value => value && isGeneratedPlaceholderTranslation(value))) {
      alert('القيمة تبدو placeholder مولّد وليست ترجمة حقيقية. راجع النص قبل الحفظ.');
      return;
    }

    setSaveStatus('saving');
    try {
      const docId = editingAutoId || makeDocId(formSourceText);
      const now = new Date().toISOString();
      await setDoc(doc(db, AUTO_COLLECTION, docId), {
        sourceText: formSourceText.trim(),
        overrides: nonEmptyOverrides,
        createdAt: editingAutoId
          ? autoOverrides.find(o => o.id === editingAutoId)?.createdAt || now
          : now,
        updatedAt: now,
      });
      setSaveStatus('saved');
      resetForm();
    } catch (err) {
      console.error('Failed to save auto translation override:', err);
      setSaveStatus('error');
    } finally {
      setTimeout(() => setSaveStatus('idle'), 2500);
    }
  };

  const handleUiSave = async () => {
    const key = uiKey.trim();
    const value = uiValue.trim();
    if (!key || !value) return;
    if (isGeneratedPlaceholderTranslation(value)) {
      alert('القيمة تبدو placeholder مولّد وليست ترجمة حقيقية. راجع النص قبل الحفظ.');
      return;
    }

    setSaveStatus('saving');
    try {
      const pack = remotePacks[uiLang] || { strings: {}, version: 0 };
      const now = new Date().toISOString();
      await setDoc(doc(db, UI_COLLECTION, uiLang), {
        strings: {
          ...(pack.strings || {}),
          [key]: value,
        },
        version: (pack.version || 0) + 1,
        updatedAt: now,
      }, { merge: true });
      setSaveStatus('saved');
      resetForm();
    } catch (err) {
      console.error('Failed to save UI translation override:', err);
      setSaveStatus('error');
    } finally {
      setTimeout(() => setSaveStatus('idle'), 2500);
    }
  };

  const handleSave = () => {
    if (mode === 'ui') {
      handleUiSave();
    } else {
      handleAutoSave();
    }
  };

  const handleDeleteAuto = async (id: string) => {
    if (!window.confirm('هل تريد حذف تعديل الترجمة التلقائية؟')) return;
    await deleteDoc(doc(db, AUTO_COLLECTION, id));
  };

  const handleDeleteUi = async (item: UiOverrideDoc) => {
    if (!window.confirm(`هل تريد حذف تعديل "${item.key}" من لغة ${item.lang}؟`)) return;
    const pack = remotePacks[item.lang] || { strings: {}, version: 0 };
    const nextStrings = { ...(pack.strings || {}) };
    delete nextStrings[item.key];
    await setDoc(doc(db, UI_COLLECTION, item.lang), {
      strings: nextStrings,
      version: (pack.version || 0) + 1,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  };

  const handleEditAuto = (item: TranslationOverrideDoc) => {
    resetForm();
    setMode('auto');
    setEditingAutoId(item.id);
    setFormSourceText(item.sourceText);
    setFormOverrides({ ...item.overrides });
    setShowForm(true);
  };

  const handleEditUi = (item: UiOverrideDoc) => {
    resetForm();
    setMode('ui');
    setEditingUiId(item.id);
    setUiKey(item.key);
    setUiLang(item.lang);
    setUiValue(item.value);
    setShowForm(true);
  };

  const handleAutoTranslate = async () => {
    if (!formSourceText.trim()) return;
    setAutoTranslating(true);
    try {
      await translateToAll(
        {
          text: formSourceText.trim(),
          sourceLang: 'ar',
          contentType: 'section',
        },
        (lang, result) => {
          if (result.text && result.source !== 'FAILED') {
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

  const [cleaningPlaceholders, setCleaningPlaceholders] = useState(false);

  const cleanPlaceholderObject = (
    input: Record<string, any>,
  ): { cleaned: Record<string, any>; removed: number } => {
    let removed = 0;
    const cleaned: Record<string, any> = {};
    Object.entries(input || {}).forEach(([key, value]) => {
      if (typeof value === 'string') {
        if (isGeneratedPlaceholderTranslation(value)) {
          removed += 1;
          return;
        }
        cleaned[key] = value;
        return;
      }
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const nested = cleanPlaceholderObject(value);
        removed += nested.removed;
        if (Object.keys(nested.cleaned).length > 0) {
          cleaned[key] = nested.cleaned;
        }
        return;
      }
      cleaned[key] = value;
    });
    return { cleaned, removed };
  };

  const handleCleanPlaceholders = async () => {
    if (cleaningPlaceholders) return;
    const langCodes = LANGUAGES.map(l => l.code);
    const total = langCodes.reduce((sum, code) => {
      const pack = remotePacks[code];
      if (!pack?.strings) return sum;
      return sum + cleanPlaceholderObject(pack.strings).removed;
    }, 0);
    if (total === 0) {
      alert('لا توجد قيم placeholder فاسدة. النظام نظيف ✅');
      return;
    }
    const confirmed = window.confirm(
      `سيتم حذف ${total} قيمة placeholder تلقائية من جميع اللغات.\n` +
      `سيرجع التطبيق للترجمات المدمجة الصحيحة فوراً.\n\n` +
      `هل تريد المتابعة؟`,
    );
    if (!confirmed) return;
    setCleaningPlaceholders(true);
    setSaveStatus('saving');
    try {
      const now = new Date().toISOString();
      for (const lang of langCodes) {
        const pack = remotePacks[lang];
        if (!pack?.strings) continue;
        const { cleaned, removed } = cleanPlaceholderObject(pack.strings);
        if (removed === 0) continue;
        await setDoc(doc(db, UI_COLLECTION, lang), {
          strings: cleaned,
          version: (pack.version || 0) + 1,
          updatedAt: now,
        });
      }
      setSaveStatus('saved');
      alert(`تم حذف ${total} قيمة placeholder ✅\nالتطبيقات ستحدث تلقائياً خلال 5 دقائق.`);
    } catch (err) {
      console.error('Cleanup failed:', err);
      setSaveStatus('error');
      alert(`فشل التنظيف: ${(err as Error).message}`);
    } finally {
      setCleaningPlaceholders(false);
      setTimeout(() => setSaveStatus('idle'), 2500);
    }
  };

  const placeholderCount = useMemo(() => (
    LANGUAGES.reduce((sum, lang) => {
      const pack = remotePacks[lang.code];
      if (!pack?.strings) return sum;
      return sum + cleanPlaceholderObject(pack.strings).removed;
    }, 0)
  ), [remotePacks]);

  const resultCount = mode === 'ui' ? filteredUi.length : filteredAuto.length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Languages className="w-8 h-8 text-accent" />
          <div>
            <h1 className="text-2xl font-bold text-white">الترجمة والتوطين</h1>
            <p className="text-sm text-slate-400">
              تعديلات فعلية من Firebase: مفاتيح الواجهة تتخزن Offline، والترجمات التلقائية تصل Live.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCleanPlaceholders}
            disabled={cleaningPlaceholders || placeholderCount === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
              placeholderCount > 0
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
            title={placeholderCount > 0
              ? `يوجد ${placeholderCount} قيمة placeholder تحتاج تنظيف`
              : 'لا توجد قيم placeholder'}
          >
            {cleaningPlaceholders ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {placeholderCount > 0 ? `تنظيف ${placeholderCount} قيمة فاسدة` : 'تنظيف القيم الفاسدة'}
          </button>
          <button
            onClick={() => startNew()}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة تعديل
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <button
          onClick={() => setMode('ui')}
          className={`text-right rounded-2xl border p-4 transition-colors ${
            mode === 'ui'
              ? 'bg-emerald-500/10 border-accent text-white'
              : 'bg-admin-surface border-admin-border text-slate-300 hover:bg-admin-surface-light'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="w-5 h-5 text-accent" />
            <span className="font-bold">مفاتيح واجهة التطبيق</span>
          </div>
          <p className="text-sm text-slate-400">
            لتعديل نصوص الأزرار، التابات، الإعدادات وأي نص مستخدم بـ t('key') مثل tabs.home.
          </p>
          <span className="inline-flex mt-3 text-xs px-2 py-1 rounded-lg bg-slate-700 text-slate-200">
            {uiOverrides.length} تعديل واجهة
          </span>
        </button>

        <button
          onClick={() => setMode('auto')}
          className={`text-right rounded-2xl border p-4 transition-colors ${
            mode === 'auto'
              ? 'bg-emerald-500/10 border-accent text-white'
              : 'bg-admin-surface border-admin-border text-slate-300 hover:bg-admin-surface-light'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Type className="w-5 h-5 text-accent" />
            <span className="font-bold">نص مترجم تلقائياً</span>
          </div>
          <p className="text-sm text-slate-400">
            لتصحيح ترجمة نص عربي محدد يظهر في محتوى ديناميكي مثل الدعاء اليومي أو الحديث أو الاقتباس.
          </p>
          <span className="inline-flex mt-3 text-xs px-2 py-1 rounded-lg bg-slate-700 text-slate-200">
            {autoOverrides.length} تعديل نص
          </span>
        </button>
      </div>

      <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-slate-300">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
          <div className="text-sm leading-7">
            <b className="text-white">طريقة الاستخدام:</b>
            {' '}لو عايز تغير زر أو عنوان ثابت اختار "مفاتيح واجهة التطبيق" واكتب المفتاح واللغة.
            لو عايز تغير ترجمة نص عربي بعينه اختار "نص مترجم تلقائياً" والصق النص العربي الأصلي كما يظهر بالضبط.
          </div>
        </div>
      </div>

      {showForm && (
        <div className="bg-admin-surface rounded-2xl border border-admin-border p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-white">
                {mode === 'ui'
                  ? editingUiId ? 'تعديل مفتاح واجهة' : 'إضافة مفتاح واجهة'
                  : editingAutoId ? 'تعديل ترجمة نص' : 'إضافة ترجمة نص'}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {mode === 'ui'
                  ? 'التعديل يكتب في translations/{language} ويستخدمه التطبيق في t().'
                  : 'التعديل يكتب في translationOverrides ويستخدمه نظام autoTranslate قبل أي ترجمة تلقائية.'}
              </p>
            </div>
            <button onClick={resetForm} className="p-2 hover:bg-admin-surface-light rounded-lg" title="إغلاق" aria-label="إغلاق">
              <X className="w-5 h-5 text-slate-300" />
            </button>
          </div>

          {mode === 'ui' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">المفتاح داخل التطبيق</label>
                <input
                  value={uiKey}
                  onChange={e => setUiKey(e.target.value)}
                  list="ui-translation-keys"
                  className="w-full bg-admin-bg border border-admin-border rounded-xl px-3 py-3 text-white focus:outline-none focus:border-accent"
                  placeholder="مثال: tabs.home"
                  dir="ltr"
                />
                <datalist id="ui-translation-keys">
                  {UI_KEY_EXAMPLES.map(key => <option key={key} value={key} />)}
                </datalist>
                <div className="flex flex-wrap gap-2 mt-2">
                  {UI_KEY_EXAMPLES.slice(0, 6).map(key => (
                    <button
                      key={key}
                      onClick={() => setUiKey(key)}
                      className="text-xs px-2 py-1 rounded-lg bg-admin-bg border border-admin-border text-slate-300 hover:border-accent"
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">اللغة التي ستتعدل</label>
                <select
                  value={uiLang}
                  onChange={e => setUiLang(e.target.value as LangCode)}
                  className="w-full bg-admin-bg border border-admin-border rounded-xl px-3 py-3 text-white focus:outline-none focus:border-accent"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {getLanguageLabel(lang.code)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">النص الجديد</label>
                <textarea
                  value={uiValue}
                  onChange={e => setUiValue(e.target.value)}
                  rows={4}
                  className="w-full bg-admin-bg border border-admin-border rounded-xl px-3 py-3 text-white focus:outline-none focus:border-accent"
                  placeholder="اكتب النص الذي سيظهر للمستخدمين..."
                  dir={LANGUAGES.find(lang => lang.code === uiLang)?.rtl ? 'rtl' : 'ltr'}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">النص العربي الأصلي كما يظهر في التطبيق</label>
                <textarea
                  value={formSourceText}
                  onChange={e => setFormSourceText(e.target.value)}
                  rows={3}
                  className="w-full bg-admin-bg border border-admin-border rounded-xl px-3 py-3 text-white text-lg leading-relaxed focus:outline-none focus:border-accent"
                  placeholder="الصق النص العربي هنا بالضبط..."
                  dir="rtl"
                />
              </div>
              <button
                onClick={handleAutoTranslate}
                disabled={autoTranslating || !formSourceText.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
              >
                {autoTranslating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                اقتراح ترجمة لكل اللغات
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {LANGUAGES.filter(l => l.code !== 'ar').map(lang => (
                  <div key={lang.code} className="border border-admin-border rounded-xl p-3 bg-admin-bg">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {getLanguageLabel(lang.code)}
                    </label>
                    <textarea
                      value={formOverrides[lang.code as LangCode] || ''}
                      onChange={e => setFormOverrides(prev => ({ ...prev, [lang.code]: e.target.value }))}
                      rows={2}
                      className="w-full bg-admin-surface border border-admin-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
                      placeholder={`ترجمة ${lang.name}...`}
                      dir={lang.rtl ? 'rtl' : 'ltr'}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={handleSave}
              disabled={mode === 'ui'
                ? !uiKey.trim() || !uiValue.trim()
                : !formSourceText.trim() || Object.values(formOverrides).every(value => !value?.trim())}
              className="flex items-center gap-2 px-6 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              حفظ وتطبيق
            </button>
            <button onClick={resetForm} className="px-4 py-2 text-slate-300 hover:bg-admin-surface-light rounded-xl">
              إلغاء
            </button>
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-400 text-sm">
                <CheckCircle className="w-4 h-4" /> تم الحفظ
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" /> فشل الحفظ
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={mode === 'ui' ? 'بحث بالمفتاح أو النص أو اللغة...' : 'بحث في النص العربي أو الترجمات...'}
            className="w-full pr-10 pl-4 py-3 bg-admin-surface border border-admin-border rounded-xl text-white placeholder-admin-muted focus:outline-none focus:border-accent"
            dir="rtl"
          />
        </div>
        <span className="text-sm text-slate-400">{resultCount} نتيجة</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-8 h-8 text-accent animate-spin" />
        </div>
      ) : mode === 'ui' ? (
        filteredUi.length === 0 ? (
          <EmptyState onAdd={() => startNew('ui')} text="لا توجد تعديلات واجهة بعد" />
        ) : (
          <div className="space-y-3">
            {filteredUi.map(item => (
              <div key={item.id} className="bg-admin-surface rounded-2xl border border-admin-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 rounded-lg bg-admin-bg text-xs text-slate-300">{getLanguageLabel(item.lang)}</span>
                      <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-xs text-blue-300">v{item.version}</span>
                    </div>
                    <p className="font-mono text-sm text-emerald-300 break-all" dir="ltr">{item.key}</p>
                    <p className="text-white mt-2" dir={LANGUAGES.find(lang => lang.code === item.lang)?.rtl ? 'rtl' : 'ltr'}>
                      {item.value}
                    </p>
                  </div>
                  <RowActions onEdit={() => handleEditUi(item)} onDelete={() => handleDeleteUi(item)} />
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredAuto.length === 0 ? (
        <EmptyState onAdd={() => startNew('auto')} text="لا توجد تعديلات ترجمة تلقائية بعد" />
      ) : (
        <div className="space-y-3">
          {filteredAuto.map(item => (
            <div key={item.id} className="bg-admin-surface rounded-2xl border border-admin-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium text-white" dir="rtl">{item.sourceText}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {Object.entries(item.overrides).map(([lang, value]) => (
                      <span key={lang} className="px-2 py-1 rounded-lg bg-admin-bg text-xs text-slate-300">
                        {getLanguageLabel(lang as LangCode)}: {value}
                      </span>
                    ))}
                  </div>
                </div>
                <RowActions onEdit={() => handleEditAuto(item)} onDelete={() => handleDeleteAuto(item.id)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <button
        onClick={onEdit}
        className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg"
        title="تعديل"
        aria-label="تعديل"
      >
        <Edit2 className="w-4 h-4" />
      </button>
      <button
        onClick={onDelete}
        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
        title="حذف"
        aria-label="حذف"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function EmptyState({ text, onAdd }: { text: string; onAdd: () => void }) {
  return (
    <div className="text-center py-16 text-slate-400 bg-admin-surface rounded-2xl border border-admin-border">
      <Languages className="w-12 h-12 mx-auto mb-3 opacity-40" />
      <p className="text-lg">{text}</p>
      <button onClick={onAdd} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl">
        <Plus className="w-4 h-4" />
        إضافة أول تعديل
      </button>
    </div>
  );
}

export default TranslationOverrides;
