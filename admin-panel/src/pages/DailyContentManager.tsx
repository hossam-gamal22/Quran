// admin-panel/src/pages/DailyContentManager.tsx
// إدارة المحتوى اليومي — تحكم الأدمن في آية/حديث/حكمة/فيديو اليوم

import React, { useState, useEffect } from 'react';
import {
  BookOpen, MessageCircle, Lightbulb, Film, Save, ToggleLeft, ToggleRight, RefreshCw,
} from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import AutoTranslateField from '../components/AutoTranslateField';

type ContentTab = 'ayah' | 'hadith' | 'quote' | 'story';

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
}

interface StoryOverride extends DailyOverride {
  ayahText: string;
  surahName: string;
  videoUrls: string[];
}

const TABS: { id: ContentTab; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
  { id: 'ayah', label: 'آية اليوم', icon: BookOpen },
  { id: 'hadith', label: 'حديث اليوم', icon: MessageCircle },
  { id: 'quote', label: 'حكمة اليوم', icon: Lightbulb },
  { id: 'story', label: 'فيديو اليوم', icon: Film },
];

const getDefaultData = (tab: ContentTab): DailyOverride => {
  switch (tab) {
    case 'ayah': return { override: false, date: '', surah: 1, ayah: 1, text: '', surahName: '' };
    case 'hadith': return { override: false, date: '', arabic: '', translation: '', narrator: '', source: '' };
    case 'quote': return { override: false, date: '', arabic: '', translation: '', author: '', source: '' };
    case 'story': return { override: false, date: '', ayahText: '', surahName: '', videoUrls: [] };
  }
};

const DailyContentManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ContentTab>('ayah');
  const [data, setData] = useState<DailyOverride>(getDefaultData('ayah'));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

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
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
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
                <input type="number" min={1} max={114} className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" value={d.surah || ''} onChange={e => updateField('surah', Number(e.target.value))} placeholder="رقم السورة" aria-label="رقم السورة" />
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">رقم الآية</label>
                <input type="number" min={1} className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" value={d.ayah || ''} onChange={e => updateField('ayah', Number(e.target.value))} placeholder="رقم الآية" aria-label="رقم الآية" />
              </div>
            </div>
            <div>
              <label className="text-slate-300 text-sm block mb-1">نص الآية</label>
              <textarea className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" rows={3} value={d.text || ''} onChange={e => updateField('text', e.target.value)} placeholder="نص الآية بالعربية" dir="rtl" aria-label="نص الآية" />
            </div>
            <div>
              <label className="text-slate-300 text-sm block mb-1">اسم السورة</label>
              <input className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" value={d.surahName || ''} onChange={e => updateField('surahName', e.target.value)} placeholder="مثال: البقرة" dir="rtl" aria-label="اسم السورة" />
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
              <textarea className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" rows={3} value={d.arabic || ''} onChange={e => updateField('arabic', e.target.value)} placeholder="نص الحديث بالعربية" dir="rtl" aria-label="نص الحديث" />
            </div>
            <div>
              <label className="text-slate-300 text-sm block mb-1">الترجمة</label>
              <textarea className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" rows={2} value={d.translation || ''} onChange={e => updateField('translation', e.target.value)} placeholder="Translation" aria-label="ترجمة الحديث" />
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 text-sm block mb-1">الراوي</label>
                <input className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" value={d.narrator || ''} onChange={e => updateField('narrator', e.target.value)} placeholder="مثال: أبو هريرة" dir="rtl" aria-label="الراوي" />
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">المصدر</label>
                <input className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" value={d.source || ''} onChange={e => updateField('source', e.target.value)} placeholder="مثال: صحيح البخاري" dir="rtl" aria-label="المصدر" />
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
              <label className="text-slate-300 text-sm block mb-1">النص (عربي)</label>
              <textarea className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" rows={3} value={d.arabic || ''} onChange={e => updateField('arabic', e.target.value)} placeholder="نص الحكمة بالعربية" dir="rtl" aria-label="نص الحكمة" />
            </div>
            <div>
              <label className="text-slate-300 text-sm block mb-1">الترجمة</label>
              <textarea className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" rows={2} value={d.translation || ''} onChange={e => updateField('translation', e.target.value)} placeholder="Translation" aria-label="ترجمة الحكمة" />
            </div>
            {/* Auto-translate quote */}
            <AutoTranslateField
              label="ترجمة تلقائية للحكمة"
              fieldName="translations"
              contentType="ui"
              arabicText={d.arabic}
              initialValues={d.translations as Record<string, string>}
              onSave={(translations) => updateField('translations', translations)}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 text-sm block mb-1">المؤلف / القائل</label>
                <input className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" value={d.author || ''} onChange={e => updateField('author', e.target.value)} placeholder="مثال: الإمام الشافعي" dir="rtl" aria-label="المؤلف" />
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">المصدر</label>
                <input className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" value={d.source || ''} onChange={e => updateField('source', e.target.value)} placeholder="اختياري" dir="rtl" aria-label="المصدر" />
              </div>
            </div>
          </div>
        );
      }
      case 'story': {
        const d = data as StoryOverride;
        return (
          <div className="space-y-4">
            <div>
              <label className="text-slate-300 text-sm block mb-1">نص الآية (للستوري)</label>
              <textarea className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" rows={3} value={d.ayahText || ''} onChange={e => updateField('ayahText', e.target.value)} placeholder="نص الآية بالعربية" dir="rtl" aria-label="نص الآية للستوري" />
            </div>
            <div>
              <label className="text-slate-300 text-sm block mb-1">اسم السورة</label>
              <input className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" value={d.surahName || ''} onChange={e => updateField('surahName', e.target.value)} placeholder="مثال: البقرة" dir="rtl" aria-label="اسم السورة" />
            </div>
            <div>
              <label className="text-slate-300 text-sm block mb-1">روابط الفيديو (فاصل: سطر جديد)</label>
              <textarea className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700 font-mono text-sm" rows={4} value={(d.videoUrls || []).join('\n')} onChange={e => updateField('videoUrls', e.target.value.split('\n').filter(Boolean))} placeholder="URL per line" aria-label="روابط الفيديو" />
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
          <p className="text-slate-400 mt-1">تحكم يدوي في آية/حديث/حكمة/فيديو اليوم — أو اتركها للاختيار التلقائي</p>
        </div>
      </div>

      {/* التبويبات */}
      <div className="flex gap-2 border-b border-slate-700 pb-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === tab.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* المحتوى */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        {/* Toggle Override */}
        <div className="flex items-center justify-between mb-6 p-4 bg-slate-700/50 rounded-lg">
          <div>
            <h3 className="text-white font-bold">تفعيل التحكم اليدوي</h3>
            <p className="text-slate-400 text-sm">
              {data.override ? 'المحتوى اليدوي مفعّل — سيظهر للمستخدمين' : 'المحتوى التلقائي — يتم اختياره تلقائياً'}
            </p>
          </div>
          <button onClick={toggleOverride} className="text-emerald-400 hover:text-emerald-300" aria-label={data.override ? 'إيقاف التحكم اليدوي' : 'تفعيل التحكم اليدوي'} title="تبديل التحكم اليدوي">
            {data.override ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
          </button>
        </div>

        {/* تاريخ محدد */}
        <div className="mb-6">
          <label className="text-slate-300 text-sm block mb-1">تاريخ محدد (اختياري — اتركه فارغاً ليكون مفعلاً دائماً)</label>
          <input
            type="date"
            className="bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700"
            value={data.date || ''}
            onChange={e => updateField('date', e.target.value)}
            title="تاريخ التفعيل"
            aria-label="تاريخ التفعيل"
          />
        </div>

        {/* الحقول */}
        {renderFields()}

        {/* أزرار */}
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white rounded-xl transition-all"
          >
            <Save size={18} />
            {isSaving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
          <button
            onClick={() => { setData(getDefaultData(activeTab)); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600"
          >
            <RefreshCw size={18} />
            إعادة تعيين
          </button>
          {saveMessage && (
            <p className={`text-sm ${saveMessage.startsWith('✅') ? 'text-emerald-400' : 'text-red-400'}`}>
              {saveMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyContentManager;
