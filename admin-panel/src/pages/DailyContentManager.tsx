// admin-panel/src/pages/DailyContentManager.tsx
// إدارة المحتوى اليومي — تحكم الأدمن في آية/حديث/حكمة/دعاء اليوم

import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, MessageCircle, Lightbulb, HandMetal, Save, ToggleLeft, ToggleRight, RefreshCw, Eye, Pencil,
} from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import AutoTranslateField from '../components/AutoTranslateField';
import TranslateButton from '../components/TranslateButton';
import { DAILY_AYAHS } from '@app-data/daily-ayahs';
import { getHadithOfTheDay } from '@app-data/daily-hadiths';
import { getQuoteOfTheDay } from '@app-data/quotes';
import { getDuaOfTheDay } from '@app-data/daily-duas';

type ContentTab = 'ayah' | 'hadith' | 'quote' | 'dua';

interface DailyOverride {
  override: boolean;
  date?: string;
  [key: string]: unknown;
}

interface AyahOverride extends DailyOverride {
  surah: number;
  ayah: number;
  text: string;
  surahName: string;
}

interface HadithOverride extends DailyOverride {
  arabic: string;
  translation: string;
  narrator: string;
  source: string;
}

interface QuoteOverride extends DailyOverride {
  arabic: string;
  translation: string;
  author: string;
  source: string;
  evidenceArabic?: string;
  evidenceTranslation?: string;
  quranRef?: {
    surah?: number;
    ayah?: number;
  };
}

interface DuaOverride extends DailyOverride {
  arabic: string;
  translation: string;
  reference: string;
}

const TABS: { id: ContentTab; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
  { id: 'ayah', label: 'آية اليوم', icon: BookOpen },
  { id: 'hadith', label: 'حديث اليوم', icon: MessageCircle },
  { id: 'quote', label: 'حكمة اليوم', icon: Lightbulb },
  { id: 'dua', label: 'دعاء اليوم', icon: HandMetal },
];

const getDefaultData = (tab: ContentTab): DailyOverride => {
  switch (tab) {
    case 'ayah': return { override: false, date: '', surah: 1, ayah: 1, text: '', surahName: '' };
    case 'hadith': return { override: false, date: '', arabic: '', translation: '', narrator: '', source: '' };
    case 'quote': return { override: false, date: '', arabic: '', translation: '', author: '', source: '', evidenceArabic: '', evidenceTranslation: '' };
    case 'dua': return { override: false, date: '', arabic: '', translation: '', reference: '' };
  }
};

const getTodayStr = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const isOverrideActiveToday = (data: DailyOverride): boolean => {
  return !!data.override && (!data.date || data.date === getTodayStr());
};

const getDailyAyahScreenDefault = () => {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  return DAILY_AYAHS[dayOfYear % DAILY_AYAHS.length];
};

/** Compute today's system default content for a given tab */
const getTodayDefault = (tab: ContentTab): Record<string, string | number> => {
  switch (tab) {
    case 'ayah': {
      const a = getDailyAyahScreenDefault();
      return { text: a.arabic, surahName: a.ref, surah: a.surah, ayah: a.ayah };
    }
    case 'hadith': {
      const h = getHadithOfTheDay();
      return { arabic: h.arabic, translation: h.translation, narrator: h.narrator, source: h.source };
    }
    case 'quote': {
      const q = getQuoteOfTheDay();
      return { arabic: q.arabic, translation: q.translation, author: q.author, source: q.source || '', evidenceArabic: q.evidenceArabic || '', evidenceTranslation: q.evidenceTranslation || '' };
    }
    case 'dua': {
      const d = getDuaOfTheDay();
      return { arabic: d.arabic, translation: d.translation, reference: d.reference };
    }
  }
};

const getManualPreviewData = (tab: ContentTab, data: DailyOverride): Record<string, string | number> => {
  switch (tab) {
    case 'ayah': {
      const d = data as AyahOverride;
      return { text: d.text || '', surahName: d.surahName || '', surah: d.surah || '', ayah: d.ayah || '' };
    }
    case 'hadith': {
      const d = data as HadithOverride;
      return { arabic: d.arabic || '', translation: d.translation || '', narrator: d.narrator || '', source: d.source || '' };
    }
    case 'quote': {
      const d = data as QuoteOverride;
      return { arabic: d.arabic || '', translation: d.translation || '', author: d.author || '', source: d.source || '', evidenceArabic: d.evidenceArabic || '', evidenceTranslation: d.evidenceTranslation || '' };
    }
    case 'dua': {
      const d = data as DuaOverride;
      return { arabic: d.arabic || '', translation: d.translation || '', reference: d.reference || '' };
    }
  }
};

/** Field labels for display */
const FIELD_LABELS: Record<string, string> = {
  text: 'النص', arabic: 'النص العربي', translation: 'الترجمة', surahName: 'السورة',
  surah: 'رقم السورة', ayah: 'رقم الآية', narrator: 'الراوي', source: 'المصدر',
  author: 'الحكمة', reference: 'المرجع', evidenceArabic: 'الشاهد', evidenceTranslation: 'ترجمة الشاهد',
  quranRef: 'مرجع القرآن',
};

/** Preview box showing today's default content */
const CurrentLivePreview: React.FC<{ tab: ContentTab; data: DailyOverride; onEditCurrent: () => void; isManualActive: boolean }> = ({ tab, data, onEditCurrent, isManualActive }) => {
  const defaults = useMemo(() => getTodayDefault(tab), [tab]);
  const previewData = useMemo(
    () => (isManualActive ? getManualPreviewData(tab, data) : defaults),
    [data, defaults, isManualActive, tab],
  );

  return (
    <div className={`rounded-xl border p-4 mb-6 ${isManualActive ? 'border-amber-500/40 bg-amber-900/10' : 'border-emerald-500/40 bg-emerald-900/10'}`}>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onEditCurrent}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-accent-dark/80 hover:bg-accent-dark text-white rounded-lg transition-all"
        >
          <Pencil size={14} />
          تعديل المحتوى الحالي
        </button>
        <div className="flex items-center gap-2">
          <Eye size={16} className={isManualActive ? 'text-amber-400' : 'text-emerald-400'} />
          <span className={`text-sm font-bold ${isManualActive ? 'text-amber-400' : 'text-emerald-400'}`}>
            {isManualActive ? '🟡 المحتوى الحالي للمستخدمين (تحكم يدوي)' : '🟢 المحتوى الحالي للمستخدمين (الافتراضي التلقائي)'}
          </span>
        </div>
      </div>
      <div className="space-y-2" dir="rtl">
        {Object.entries(previewData).map(([key, value]) => (
          <div key={key} className="flex gap-2">
            <span className="text-slate-500 text-sm min-w-[80px]">{FIELD_LABELS[key] || key}:</span>
            <span className={`text-sm text-slate-200 ${key === 'arabic' || key === 'text' ? 'font-semibold' : ''}`}>
              {String(value).length > 120 ? String(value).slice(0, 120) + '...' : String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const DailyContentManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ContentTab>('ayah');
  const [data, setData] = useState<DailyOverride>(getDefaultData('ayah'));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const isManualActive = isOverrideActiveToday(data);

  /** Copy today's system defaults into the override form fields */
  const handleEditCurrent = () => {
    const defaults = getTodayDefault(activeTab);
    const quranRef = activeTab === 'quote' ? getQuoteOfTheDay().quranRef : undefined;
    setData(prev => ({ ...prev, ...defaults, ...(quranRef ? { quranRef } : {}), override: true }));
  };

  const loadData = async (tab: ContentTab) => {
    setIsLoading(true);
    try {
      const snap = await getDoc(doc(db, 'dailyContent', tab));
      if (snap.exists()) {
        setData(snap.data() as DailyOverride);
      } else {
        setData(getDefaultData(tab));
      }
    } catch {
      setData(getDefaultData(tab));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData(activeTab);
  }, [activeTab]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      await setDoc(doc(db, 'dailyContent', activeTab), { ...data, updatedAt: new Date().toISOString() });
      setSaveMessage('✅ تم الحفظ بنجاح');
    } catch (error) {
      setSaveMessage(`❌ خطأ: ${(error as Error).message}`);
    }
    setIsSaving(false);
  };

  const toggleOverride = () => {
    setData(prev => ({ ...prev, override: !prev.override }));
  };

  const updateField = (field: string, value: unknown) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const renderFields = () => {
    if (isLoading) {
      return (
        <div className="p-8 text-center text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4" />
          جاري التحميل...
        </div>
      );
    }

    switch (activeTab) {
      case 'ayah': {
        const d = data as AyahOverride;
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 text-sm block mb-1">رقم السورة</label>
                <input type="number" min={1} max={114} className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" value={d.surah || ''} onChange={e => updateField('surah', Number(e.target.value))} placeholder="رقم السورة" aria-label="رقم السورة" />
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">رقم الآية</label>
                <input type="number" min={1} className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" value={d.ayah || ''} onChange={e => updateField('ayah', Number(e.target.value))} placeholder="رقم الآية" aria-label="رقم الآية" />
              </div>
            </div>
            <div>
              <label className="text-slate-300 text-sm block mb-1">نص الآية</label>
              <textarea className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" rows={3} value={d.text || ''} onChange={e => updateField('text', e.target.value)} placeholder="نص الآية بالعربية" dir="rtl" aria-label="نص الآية" />
            </div>
            <div>
              <label className="text-slate-300 text-sm block mb-1">اسم السورة</label>
              <input className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" value={d.surahName || ''} onChange={e => updateField('surahName', e.target.value)} placeholder="مثال: البقرة" dir="rtl" aria-label="اسم السورة" />
            </div>
          </div>
        );
      }
      case 'hadith': {
        const d = data as HadithOverride;
        return (
          <div className="space-y-4">
            <div>
              <label className="text-slate-300 text-sm block mb-1">نص الحديث (عربي)</label>
              <textarea className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" rows={3} value={d.arabic || ''} onChange={e => updateField('arabic', e.target.value)} placeholder="نص الحديث بالعربية" dir="rtl" aria-label="نص الحديث" />
            </div>
            <div>
              <label className="text-slate-300 text-sm block mb-1">الترجمة</label>
              <textarea className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" rows={2} value={d.translation || ''} onChange={e => updateField('translation', e.target.value)} placeholder="Translation" aria-label="ترجمة الحديث" />
            </div>
            {/* Auto-translate hadith */}
            <AutoTranslateField
              label="ترجمة تلقائية للحديث"
              fieldName="translations"
              contentType="hadith"
              arabicText={d.arabic}
              initialValues={d.translations as Record<string, string>}
              onSave={(translations) => updateField('translations', translations)}
            />
            <TranslateButton
              sourceText={d.arabic || ''}
              sourceLang="ar"
              contentType="hadith"
              compact
              label="🌐 ترجمة سريعة"
              onTranslated={(translations) => updateField('translations', { ...(d.translations as Record<string, string>), ...translations })}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 text-sm block mb-1">الراوي</label>
                <input className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" value={d.narrator || ''} onChange={e => updateField('narrator', e.target.value)} placeholder="مثال: أبو هريرة" dir="rtl" aria-label="الراوي" />
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">المصدر</label>
                <input className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" value={d.source || ''} onChange={e => updateField('source', e.target.value)} placeholder="مثال: صحيح البخاري" dir="rtl" aria-label="المصدر" />
              </div>
            </div>
          </div>
        );
      }
      case 'quote': {
        const d = data as QuoteOverride;
        return (
          <div className="space-y-4">
            <div>
              <label className="text-slate-300 text-sm block mb-1">القصة / الموقف (عربي)</label>
              <textarea className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" rows={3} value={d.arabic || ''} onChange={e => updateField('arabic', e.target.value)} placeholder="احكِ الموقف الذي ظهرت فيه الحكمة" dir="rtl" aria-label="القصة أو الموقف" />
            </div>
            <div>
              <label className="text-slate-300 text-sm block mb-1">الترجمة</label>
              <textarea className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" rows={2} value={d.translation || ''} onChange={e => updateField('translation', e.target.value)} placeholder="Translation" aria-label="ترجمة القصة" />
            </div>
            <AutoTranslateField
              label="ترجمة تلقائية للقصة"
              fieldName="translations"
              contentType="ui"
              arabicText={d.arabic}
              initialValues={d.translations as Record<string, string>}
              onSave={(translations) => updateField('translations', translations)}
            />
            <TranslateButton
              sourceText={d.arabic || ''}
              sourceLang="ar"
              contentType="ui"
              compact
              label="🌐 ترجمة سريعة"
              onTranslated={(translations) => updateField('translations', { ...(d.translations as Record<string, string>), ...translations })}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 text-sm block mb-1">الحكمة المختصرة</label>
                <input className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" value={d.author || ''} onChange={e => updateField('author', e.target.value)} placeholder="مثال: الحكمة: خذ بالأسباب" dir="rtl" aria-label="الحكمة المختصرة" />
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">مرجع الشاهد</label>
                <input className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" value={d.source || ''} onChange={e => updateField('source', e.target.value)} placeholder="مثال: التوبة: 40 أو البخاري" dir="rtl" aria-label="مرجع الشاهد" />
              </div>
            </div>
            <div>
              <label className="text-slate-300 text-sm block mb-1">مرجع الآية لفونت القرآن (اختياري)</label>
              <p className="text-slate-500 text-xs mb-2">املأه فقط إذا كان الشاهد آية قرآنية؛ هذا يضمن عرض الشاهد بفونت QCF في التطبيق.</p>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  min={1}
                  max={114}
                  className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border"
                  value={d.quranRef?.surah || ''}
                  onChange={e => updateField('quranRef', { ...(d.quranRef || {}), surah: e.target.value ? Number(e.target.value) : 0 })}
                  placeholder="رقم السورة"
                  aria-label="رقم سورة الشاهد"
                />
                <input
                  type="number"
                  min={1}
                  className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border"
                  value={d.quranRef?.ayah || ''}
                  onChange={e => updateField('quranRef', { ...(d.quranRef || {}), ayah: e.target.value ? Number(e.target.value) : 0 })}
                  placeholder="رقم الآية"
                  aria-label="رقم آية الشاهد"
                />
              </div>
            </div>
            <div>
              <label className="text-slate-300 text-sm block mb-1">الشاهد (آية/حديث/دعاء)</label>
              <textarea className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" rows={2} value={d.evidenceArabic || ''} onChange={e => updateField('evidenceArabic', e.target.value)} placeholder="نص الشاهد بالعربية" dir="rtl" aria-label="الشاهد" />
            </div>
            <div>
              <label className="text-slate-300 text-sm block mb-1">ترجمة الشاهد</label>
              <textarea className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" rows={2} value={d.evidenceTranslation || ''} onChange={e => updateField('evidenceTranslation', e.target.value)} placeholder="Evidence translation" aria-label="ترجمة الشاهد" />
            </div>
          </div>
        );
      }
      case 'dua': {
        const d = data as DuaOverride;
        return (
          <div className="space-y-4">
            <div>
              <label className="text-slate-300 text-sm block mb-1">نص الدعاء (عربي)</label>
              <textarea className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" rows={3} value={d.arabic || ''} onChange={e => updateField('arabic', e.target.value)} placeholder="نص الدعاء بالعربية" dir="rtl" aria-label="نص الدعاء" />
            </div>
            <div>
              <label className="text-slate-300 text-sm block mb-1">الترجمة</label>
              <textarea className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" rows={2} value={d.translation || ''} onChange={e => updateField('translation', e.target.value)} placeholder="Translation" aria-label="ترجمة الدعاء" />
            </div>
            <div>
              <label className="text-slate-300 text-sm block mb-1">المرجع / المصدر</label>
              <input className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" value={d.reference || ''} onChange={e => updateField('reference', e.target.value)} placeholder="مثال: حصن المسلم" dir="rtl" aria-label="المرجع" />
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">المحتوى اليومي</h1>
          <p className="text-slate-400 mt-1">شاهد المحتوى الحالي للمستخدمين، وتحكم يدوياً في آية/حديث/حكمة/دعاء اليوم</p>
        </div>
      </div>

      {/* التبويبات */}
      <div className="flex gap-2 border-b border-admin-border pb-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === tab.id ? 'bg-accent-dark text-white' : 'text-slate-400 hover:text-white hover:bg-admin-surface'
            }`}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* المحتوى */}
      <div className="bg-admin-surface/50 rounded-xl p-6 border border-admin-border/50">
        {/* Toggle Override */}
        <div className="flex items-center justify-between mb-6 p-4 bg-admin-surface-light/50 rounded-lg">
          <div>
            <h3 className="text-white font-bold">تفعيل التحكم اليدوي</h3>
            <p className="text-slate-400 text-sm">
              {data.override
                ? (isManualActive ? 'المحتوى اليدوي مفعّل — يظهر للمستخدمين الآن' : 'المحتوى اليدوي محفوظ، لكنه غير فعّال لتاريخ اليوم')
                : 'المحتوى التلقائي — يتم اختياره تلقائياً'}
            </p>
          </div>
          <button onClick={toggleOverride} className="text-accent-light hover:text-emerald-300" aria-label={data.override ? 'إيقاف التحكم اليدوي' : 'تفعيل التحكم اليدوي'} title="تبديل التحكم اليدوي">
            {data.override ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
          </button>
        </div>

        {/* تاريخ محدد */}
        <div className="mb-6">
          <label className="text-slate-300 text-sm block mb-1">تاريخ محدد (اختياري — اتركه فارغاً ليكون مفعلاً دائماً)</label>
          <input
            type="date"
            className="bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border"
            value={data.date || ''}
            onChange={e => updateField('date', e.target.value)}
            title="تاريخ التفعيل"
            aria-label="تاريخ التفعيل"
          />
        </div>

        {/* المحتوى الحالي للمستخدمين */}
        <CurrentLivePreview
          tab={activeTab}
          data={data}
          onEditCurrent={handleEditCurrent}
          isManualActive={isManualActive}
        />

        {/* حقول التحكم اليدوي */}
        {data.override && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-900/10 p-4 mb-4">
            <div className="flex items-center gap-2 mb-1" dir="rtl">
              <Pencil size={16} className="text-amber-400" />
              <span className="text-amber-400 text-sm font-bold">
                {isManualActive ? 'تحكم يدوي — هذا المحتوى يظهر للمستخدمين بدلاً من الافتراضي' : 'تحكم يدوي محفوظ — لن يظهر للمستخدمين إلا في التاريخ المحدد'}
              </span>
            </div>
          </div>
        )}

        {/* الحقول */}
        {renderFields()}

        {/* أزرار */}
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent-dark hover:bg-accent-dark disabled:bg-admin-surface-light text-white rounded-xl transition-all"
          >
            <Save size={18} />
            {isSaving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
          <button
            onClick={() => { setData(getDefaultData(activeTab)); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-admin-surface-light text-slate-300 rounded-xl hover:bg-admin-surface-light"
          >
            <RefreshCw size={18} />
            إعادة تعيين
          </button>
          {saveMessage && (
            <p className={`text-sm ${saveMessage.startsWith('✅') ? 'text-accent-light' : 'text-red-400'}`}>
              {saveMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyContentManager;
