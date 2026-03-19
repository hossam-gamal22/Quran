// admin-panel/src/pages/HighlightsManager.tsx
// إدارة هايلايتس الصفحة الرئيسية — Enhanced with multilingual, scheduling, pinning, temp pages

import React, { useState, useEffect } from 'react';
import {
  Save,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Upload,
  Link,
  FileCode,
  Smartphone,
  ArrowUp,
  ArrowDown,
  CircleDot,
  Pin,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  Calendar,
  FileText,
} from 'lucide-react';
import { db, storage } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Styled } from '../components/Styled';

const FIRESTORE_DOC = 'config/app-settings';

// --- Types ---

interface MultiLangText {
  ar: string;
  en: string;
  fr?: string;
  de?: string;
  es?: string;
  tr?: string;
  ur?: string;
  id?: string;
  ms?: string;
  hi?: string;
  bn?: string;
  ru?: string;
  [key: string]: string | undefined;
}

interface HighlightItem {
  id: string;
  enabled: boolean;
  type: 'builtin' | 'temp_page';
  tempPageId?: string;

  title: string;
  titles?: MultiLangText;
  subtitle?: string;
  subtitles?: MultiLangText;

  icon: string;
  color: string;
  route: string;
  routeType: 'internal' | 'url' | 'html';
  imageUrl: string;
  htmlContent: string;
  order: number;

  isVisible: boolean;
  isPinned: boolean;
  visibleFrom?: string;
  visibleUntil?: string;
  updatedAt?: string;
}

interface TempPage {
  id: string;
  title?: string;
  name?: string;
  [key: string]: unknown;
}

// --- Constants ---

const LANGUAGES = [
  { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'en', name: 'English', flag: '🇺🇸', rtl: false },
  { code: 'fr', name: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', rtl: false },
  { code: 'es', name: 'Español', flag: '🇪🇸', rtl: false },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷', rtl: false },
  { code: 'ur', name: 'اردو', flag: '🇵🇰', rtl: true },
  { code: 'id', name: 'Indonesia', flag: '🇮🇩', rtl: false },
  { code: 'ms', name: 'Melayu', flag: '🇲🇾', rtl: false },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', rtl: false },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩', rtl: false },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', rtl: false },
];

const PRIMARY_LANGS = LANGUAGES.filter(l => l.code === 'ar' || l.code === 'en');
const OTHER_LANGS = LANGUAGES.filter(l => l.code !== 'ar' && l.code !== 'en');

const EMPTY_MULTILANG: MultiLangText = { ar: '', en: '' };

const EMPTY_HIGHLIGHT: Omit<HighlightItem, 'id' | 'order'> = {
  enabled: true,
  type: 'builtin',
  title: '',
  titles: { ...EMPTY_MULTILANG },
  subtitle: '',
  subtitles: { ...EMPTY_MULTILANG },
  icon: 'star-four-points',
  color: '#2f7659',
  route: '',
  routeType: 'internal',
  imageUrl: '',
  htmlContent: '',
  isVisible: true,
  isPinned: false,
};

const ICON_OPTIONS = [
  { value: 'moon-waning-crescent', label: '🌙 هلال' },
  { value: 'star-crescent', label: '☪️ نجمة وهلال' },
  { value: 'mosque', label: '🕌 مسجد' },
  { value: 'book-open-variant', label: '📖 قرآن' },
  { value: 'hands-pray', label: '🤲 دعاء' },
  { value: 'star-four-points', label: '✨ نجمة' },
  { value: 'heart', label: '❤️ قلب' },
  { value: 'bell', label: '🔔 تنبيه' },
  { value: 'gift', label: '🎁 هدية' },
  { value: 'calendar-month', label: '📅 تقويم' },
  { value: 'play-circle-outline', label: '▶️ تشغيل' },
  { value: 'compass', label: '🧭 بوصلة' },
  { value: 'book-cross', label: '📕 كتاب' },
  { value: 'shield-check', label: '🛡️ رقية' },
  { value: 'weather-sunny', label: '☀️ صباح' },
  { value: 'weather-night', label: '🌃 مساء' },
  { value: 'circle-multiple', label: '📿 تسبيح' },
  { value: 'information', label: 'ℹ️ معلومات' },
];

const ROUTE_OPTIONS = [
  { value: '/(tabs)', label: 'الرئيسية' },
  { value: '/(tabs)/quran', label: 'القرآن' },
  { value: '/(tabs)/prayer', label: 'الصلاة' },
  { value: '/(tabs)/tasbih', label: 'التسبيح' },
  { value: '/(tabs)/settings', label: 'الإعدادات' },
  { value: '/daily-ayah', label: 'آية اليوم' },
  { value: '/daily-dua', label: 'دعاء اليوم' },
  { value: '/daily-dhikr', label: 'ذكر اليوم' },
  { value: '/azkar/morning', label: 'أذكار الصباح' },
  { value: '/azkar/evening', label: 'أذكار المساء' },
  { value: '/azkar/sleep', label: 'أذكار النوم' },
  { value: '/azkar/wakeup', label: 'أذكار الاستيقاظ' },
  { value: '/azkar/after_prayer', label: 'أذكار بعد الصلاة' },
  { value: '/hijri', label: 'التقويم الهجري' },
  { value: '/names', label: 'أسماء الله الحسنى' },
  { value: '/story-of-day', label: 'قصة اليوم' },
  { value: '/worship-tracker', label: 'تتبع العبادات' },
  { value: '/hajj-umrah', label: 'الحج والعمرة' },
  { value: '/hajj', label: 'مناسك الحج' },
  { value: '/umrah', label: 'مناسك العمرة' },
  { value: '/ruqya', label: 'الرقية الشرعية' },
  { value: '/companions', label: 'قصص الصحابة' },
  { value: '/seerah', label: 'السيرة النبوية' },
  { value: '/radio', label: 'إذاعة القرآن' },
  { value: '/hadith-of-day', label: 'حديث اليوم' },
  { value: '/quote-of-day', label: 'اقتباس اليوم' },
  { value: '/quran-bookmarks', label: 'إشارات المصحف' },
  { value: '/all-favorites', label: 'المحفوظات' },
  { value: '/subscription', label: 'الاشتراك' },
];

const COLOR_PRESETS = [
  { value: '#2f7659', label: 'أخضر' },
  { value: '#1e40af', label: 'أزرق' },
  { value: '#be123c', label: 'أحمر' },
  { value: '#5b21b6', label: 'بنفسجي' },
  { value: '#7c2d12', label: 'بني' },
  { value: '#0D9488', label: 'تركوازي' },
  { value: '#DAA520', label: 'ذهبي' },
  { value: '#e91e63', label: 'وردي' },
];

// --- Helpers ---

function migrateHighlight(h: Partial<HighlightItem>, index: number): HighlightItem {
  const titlesEn = h.titles?.en ?? '';
  return {
    ...EMPTY_HIGHLIGHT,
    ...h,
    id: h.id || `hl-${Date.now()}-${index}`,
    order: h.order ?? index,
    type: h.type || 'builtin',
    isVisible: h.isVisible ?? h.enabled ?? true,
    isPinned: h.isPinned ?? false,
    titles: h.titles || { ar: h.title || '', en: titlesEn },
    subtitles: h.subtitles || { ar: h.subtitle || '', en: '' },
    title: h.title || h.titles?.ar || '',
    subtitle: h.subtitle || h.subtitles?.ar || '',
  };
}

function prepareForSave(items: HighlightItem[]): HighlightItem[] {
  const now = new Date().toISOString();
  return items
    .sort((a, b) => a.order - b.order)
    .map(h => ({
      ...h,
      title: h.titles?.ar || h.title || '',
      subtitle: h.subtitles?.ar || h.subtitle || '',
      enabled: h.isVisible,
      updatedAt: now,
    }));
}

function isCurrentlyVisible(item: HighlightItem): boolean {
  if (!item.isVisible) return false;
  const now = new Date();
  if (item.visibleFrom && new Date(item.visibleFrom) > now) return false;
  if (item.visibleUntil && new Date(item.visibleUntil) < now) return false;
  return true;
}

function getPreviewSorted(items: HighlightItem[]): HighlightItem[] {
  const visible = items.filter(isCurrentlyVisible);
  const pinned = visible.filter(h => h.isPinned).sort((a, b) => a.order - b.order);
  const unpinned = visible.filter(h => !h.isPinned).sort((a, b) => a.order - b.order);
  return [...pinned, ...unpinned];
}

// --- Multilingual Input Component ---

function MultiLangInput({
  label,
  values,
  onChange,
  required,
}: {
  label: string;
  values: MultiLangText;
  onChange: (vals: MultiLangText) => void;
  required?: boolean;
}) {
  const [showOthers, setShowOthers] = useState(false);

  const updateLang = (code: string, text: string) => {
    onChange({ ...values, [code]: text });
  };

  const copyArabicToAll = () => {
    const arText = values.ar || '';
    const updated = { ...values };
    LANGUAGES.forEach(l => {
      if (l.code !== 'ar') updated[l.code] = arText;
    });
    onChange(updated);
  };

  return (
    <div>
      <label className="block text-sm text-slate-400 mb-2">{label}</label>

      {/* Primary: Arabic & English */}
      <div className="space-y-2 mb-2">
        {PRIMARY_LANGS.map(lang => (
          <div key={lang.code} className="flex items-center gap-2">
            <span className="text-lg flex-shrink-0 w-8 text-center">{lang.flag}</span>
            <input
              type="text"
              value={values[lang.code] || ''}
              onChange={(e) => updateLang(lang.code, e.target.value)}
              className="flex-1 bg-slate-700 text-white rounded-xl px-4 py-2.5 border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm"
              placeholder={`${lang.name}${lang.code === 'ar' && required ? ' (مطلوب)' : ''}`}
              dir={lang.rtl ? 'rtl' : 'ltr'}
            />
          </div>
        ))}
      </div>

      {/* Copy Arabic to all */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={copyArabicToAll}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-emerald-400 rounded-lg border border-slate-600 transition-colors"
        >
          <Copy className="w-3 h-3" />
          🌐 نسخ العربي لكل اللغات
        </button>
      </div>

      {/* Other languages expandable */}
      <button
        onClick={() => setShowOthers(!showOthers)}
        className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors mb-2"
      >
        {showOthers ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        باقي اللغات ({OTHER_LANGS.length})
      </button>

      {showOthers && (
        <div className="space-y-2 border border-slate-700 rounded-xl p-3 bg-slate-800/50">
          {OTHER_LANGS.map(lang => (
            <div key={lang.code} className="flex items-center gap-2">
              <span className="text-lg flex-shrink-0 w-8 text-center">{lang.flag}</span>
              <span className="text-xs text-slate-500 w-16 flex-shrink-0">{lang.name}</span>
              <input
                type="text"
                value={values[lang.code] || ''}
                onChange={(e) => updateLang(lang.code, e.target.value)}
                className="flex-1 bg-slate-700 text-white rounded-lg px-3 py-2 border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm"
                placeholder={lang.name}
                dir={lang.rtl ? 'rtl' : 'ltr'}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main Component ---

export default function HighlightsManager() {
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [tempPages, setTempPages] = useState<TempPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Load highlights + temp pages on mount
  useEffect(() => {
    const load = async () => {
      try {
        const docRef = doc(db, FIRESTORE_DOC);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.highlights && Array.isArray(data.highlights)) {
            setHighlights(data.highlights.map(migrateHighlight));
          }
        }

        try {
          const tpQuery = query(collection(db, 'tempPages'), orderBy('title'));
          const tpSnap = await getDocs(tpQuery);
          const pages: TempPage[] = [];
          tpSnap.forEach(d => pages.push({ id: d.id, ...d.data() }));
          setTempPages(pages);
        } catch {
          console.log('No tempPages collection found');
        }
      } catch (err) {
        console.error('Error loading highlights:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const docRef = doc(db, FIRESTORE_DOC);
      const snap = await getDoc(docRef);
      const existing = snap.exists() ? snap.data() : {};
      const prepared = prepareForSave(highlights);
      await setDoc(docRef, { ...existing, highlights: prepared });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Error saving highlights:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const addHighlight = () => {
    const newId = `hl-${Date.now()}`;
    const newItem: HighlightItem = {
      ...EMPTY_HIGHLIGHT,
      titles: { ar: '', en: '' },
      subtitles: { ar: '', en: '' },
      id: newId,
      order: highlights.length,
    };
    setHighlights(prev => [...prev, newItem]);
    setExpandedId(newId);
  };

  const removeHighlight = (id: string) => {
    setHighlights(prev => prev.filter(h => h.id !== id).map((h, i) => ({ ...h, order: i })));
    if (expandedId === id) setExpandedId(null);
  };

  const updateHighlight = (id: string, key: keyof HighlightItem, value: HighlightItem[keyof HighlightItem]) => {
    setHighlights(prev => prev.map(h => h.id === id ? { ...h, [key]: value } : h));
  };

  const updateTitles = (id: string, titles: MultiLangText) => {
    setHighlights(prev => prev.map(h =>
      h.id === id ? { ...h, titles, title: titles.ar } : h
    ));
  };

  const updateSubtitles = (id: string, subtitles: MultiLangText) => {
    setHighlights(prev => prev.map(h =>
      h.id === id ? { ...h, subtitles, subtitle: subtitles.ar } : h
    ));
  };

  const moveHighlight = (id: string, direction: 'up' | 'down') => {
    setHighlights(prev => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex(h => h.id === id);
      if (direction === 'up' && idx > 0) {
        const temp = sorted[idx].order;
        sorted[idx].order = sorted[idx - 1].order;
        sorted[idx - 1].order = temp;
      } else if (direction === 'down' && idx < sorted.length - 1) {
        const temp = sorted[idx].order;
        sorted[idx].order = sorted[idx + 1].order;
        sorted[idx + 1].order = temp;
      }
      return [...sorted];
    });
  };

  const handleIconUpload = async (id: string, file: File) => {
    setUploadingId(id);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const storageRef = ref(storage, `highlights/icons/${id}.${ext}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      updateHighlight(id, 'imageUrl', url);
    } catch (err) {
      console.error('Error uploading icon:', err);
    } finally {
      setUploadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  const sorted = [...highlights].sort((a, b) => a.order - b.order);
  const previewItems = getPreviewSorted(highlights);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
            <CircleDot className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">إدارة الهايلايتس</h1>
            <p className="text-slate-400 text-sm">أضف وتحكم في الهايلايتس على الصفحة الرئيسية</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={addHighlight}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors"
          >
            <Plus className="w-5 h-5" />
            إضافة هايلايت
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${
              saveStatus === 'success'
                ? 'bg-green-500 text-white'
                : saveStatus === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSaving ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : saveStatus === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : saveStatus === 'error' ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {isSaving ? 'جاري الحفظ...' : saveStatus === 'success' ? 'تم الحفظ!' : saveStatus === 'error' ? 'خطأ!' : 'حفظ'}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
        <p className="text-sm text-slate-400">
          الهايلايتس المُضافة من هنا تظهر <strong className="text-emerald-400">قبل</strong> الهايلايتس الافتراضية (التاريخ الهجري، الأذكار، آية اليوم...). يمكنك إضافة روابط داخلية، روابط خارجية، أو محتوى HTML يُعرض داخل التطبيق. العناصر المثبتة تظهر دائماً في المقدمة.
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-slate-800 rounded-2xl p-12 border border-slate-700 text-center">
          <CircleDot className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">لا توجد هايلايتس مخصصة حالياً</p>
          <p className="text-slate-500 text-sm mt-1">اضغط "إضافة هايلايت" لإنشاء واحد جديد</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((item, index) => (
            <HighlightRow
              key={item.id}
              item={item}
              index={index}
              total={sorted.length}
              isExpanded={expandedId === item.id}
              tempPages={tempPages}
              uploadingId={uploadingId}
              onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
              onUpdate={updateHighlight}
              onUpdateTitles={updateTitles}
              onUpdateSubtitles={updateSubtitles}
              onMove={moveHighlight}
              onRemove={removeHighlight}
              onIconUpload={handleIconUpload}
            />
          ))}
        </div>
      )}

      {/* Enhanced Preview */}
      {previewItems.length > 0 && (
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-white font-semibold mb-4">معاينة الهايلايتس (كما ستظهر في التطبيق)</h3>
          <div className="bg-slate-900 rounded-2xl p-6">
            <div className="flex gap-5 overflow-x-auto pb-4" dir="rtl">
              {previewItems.map(h => (
                <div key={h.id} className="flex flex-col items-center gap-2 flex-shrink-0 relative w-[70px]">
                  {h.isPinned && (
                    <div className="absolute -top-2 -right-1 z-10">
                      <Pin className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    </div>
                  )}
                  <Styled
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl border-[3px]"
                    css={{
                      backgroundColor: h.imageUrl ? 'transparent' : h.color,
                      borderColor: h.color,
                      backgroundImage: h.imageUrl ? `url(${h.imageUrl})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {!h.imageUrl && (ICON_OPTIONS.find(i => i.value === h.icon)?.label.split(' ')[0] || '✨')}
                  </Styled>
                  <span className="text-slate-300 text-[11px] text-center leading-tight truncate w-full">
                    {h.titles?.ar || h.title || 'بدون عنوان'}
                  </span>
                  {(h.visibleFrom || h.visibleUntil) && (
                    <span className="absolute -bottom-4 text-[9px] text-amber-400 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      مجدول
                    </span>
                  )}
                </div>
              ))}
              {['📅 الهجري', '🤲 أذكار', '📖 آية', '▶️ ستوري', '🕌 صلاة'].map((label, i) => (
                <div key={`builtin-${i}`} className="flex flex-col items-center gap-2 flex-shrink-0 opacity-40 w-[70px]">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl border-[3px] border-slate-600 bg-slate-700">
                    {label.split(' ')[0]}
                  </div>
                  <span className="text-slate-500 text-[11px] text-center">{label.split(' ')[1]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Highlight Row Component ---

function HighlightRow({
  item,
  index,
  total,
  isExpanded,
  tempPages,
  uploadingId,
  onToggleExpand,
  onUpdate,
  onUpdateTitles,
  onUpdateSubtitles,
  onMove,
  onRemove,
  onIconUpload,
}: {
  item: HighlightItem;
  index: number;
  total: number;
  isExpanded: boolean;
  tempPages: TempPage[];
  uploadingId: string | null;
  onToggleExpand: () => void;
  onUpdate: (id: string, key: keyof HighlightItem, value: HighlightItem[keyof HighlightItem]) => void;
  onUpdateTitles: (id: string, titles: MultiLangText) => void;
  onUpdateSubtitles: (id: string, subtitles: MultiLangText) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onRemove: (id: string) => void;
  onIconUpload: (id: string, file: File) => void;
}) {
  const [scheduleEnabled, setScheduleEnabled] = useState(!!item.visibleFrom || !!item.visibleUntil);

  const handleScheduleToggle = (enabled: boolean) => {
    setScheduleEnabled(enabled);
    if (!enabled) {
      onUpdate(item.id, 'visibleFrom', undefined);
      onUpdate(item.id, 'visibleUntil', undefined);
    }
  };

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      {/* Collapsed row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-700/50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex flex-col gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onMove(item.id, 'up'); }}
            disabled={index === 0}
            className="text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
            aria-label="Move highlight up"
            title="Move highlight up"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMove(item.id, 'down'); }}
            disabled={index === total - 1}
            className="text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
            aria-label="Move highlight down"
            title="Move highlight down"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>

        {/* Preview circle */}
        <Styled
          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg flex-shrink-0 border-2"
          css={{
            backgroundColor: item.imageUrl ? 'transparent' : item.color,
            borderColor: item.color,
            backgroundImage: item.imageUrl ? `url(${item.imageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {!item.imageUrl && (
            ICON_OPTIONS.find(i => i.value === item.icon)?.label.split(' ')[0] || '✨'
          )}
        </Styled>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white font-medium truncate">{item.titles?.ar || item.title || 'بدون عنوان'}</p>
            {item.isPinned && <Pin className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
            {item.type === 'temp_page' && (
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded flex-shrink-0">صفحة مؤقتة</span>
            )}
          </div>
          <p className="text-xs text-slate-400 truncate">
            {item.type === 'temp_page'
              ? `📄 صفحة مؤقتة${item.tempPageId ? ` (${item.tempPageId})` : ''}`
              : item.routeType === 'internal' ? `📱 ${item.route || 'غير محدد'}` :
                item.routeType === 'url' ? `🔗 ${item.route || 'غير محدد'}` :
                '📄 محتوى HTML'}
            {(item.visibleFrom || item.visibleUntil) && ' • ⏰ مجدول'}
          </p>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onUpdate(item.id, 'isVisible', !item.isVisible); }}
          className="flex-shrink-0"
          aria-label="Toggle highlight visibility"
          title="Toggle highlight visibility"
        >
          {item.isVisible ? (
            <Eye className="w-5 h-5 text-emerald-400" />
          ) : (
            <EyeOff className="w-5 h-5 text-slate-500" />
          )}
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
          className="flex-shrink-0 text-red-400 hover:text-red-300 transition-colors"
          aria-label="Delete highlight"
          title="Delete highlight"
        >
          <Trash2 className="w-5 h-5" />
        </button>

        <GripVertical className="w-5 h-5 text-slate-600 flex-shrink-0" />
      </div>

      {/* Expanded form */}
      {isExpanded && (
        <div className="border-t border-slate-700 p-6 space-y-5">
          {/* نوع الهايلايت */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">نوع الهايلايت</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onUpdate(item.id, 'type', 'builtin')}
                className={`p-3 rounded-xl border text-sm flex items-center gap-2 transition-all ${
                  item.type === 'builtin'
                    ? 'border-emerald-500 bg-emerald-500/20 text-white'
                    : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                قسم موجود في التطبيق
              </button>
              <button
                onClick={() => onUpdate(item.id, 'type', 'temp_page')}
                className={`p-3 rounded-xl border text-sm flex items-center gap-2 transition-all ${
                  item.type === 'temp_page'
                    ? 'border-blue-500 bg-blue-500/20 text-white'
                    : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                <FileText className="w-4 h-4" />
                صفحة مؤقتة
              </button>
            </div>
          </div>

          {/* Temp Page selector */}
          {item.type === 'temp_page' && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">اختر الصفحة المؤقتة</label>
              {tempPages.length === 0 ? (
                <p className="text-sm text-slate-500 bg-slate-700 rounded-xl p-3">
                  لا توجد صفحات مؤقتة. أنشئ صفحة من قسم "الصفحات المؤقتة" أولاً.
                </p>
              ) : (
                <select
                  value={item.tempPageId || ''}
                  onChange={(e) => onUpdate(item.id, 'tempPageId', e.target.value)}
                  className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none"
                  dir="rtl"
                  aria-label="Select temporary page"
                >
                  <option value="">— اختر صفحة —</option>
                  {tempPages.map(tp => (
                    <option key={tp.id} value={tp.id}>
                      {tp.title || tp.name || tp.id}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* العناوين — multilingual */}
          <MultiLangInput
            label="العنوان"
            values={item.titles || { ar: item.title || '', en: '' }}
            onChange={(vals) => onUpdateTitles(item.id, vals)}
            required
          />

          {/* العنوان الفرعي — multilingual */}
          <MultiLangInput
            label="العنوان الفرعي (اختياري)"
            values={item.subtitles || { ar: item.subtitle || '', en: '' }}
            onChange={(vals) => onUpdateSubtitles(item.id, vals)}
          />

          {/* Visibility & Pinned toggles */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.isVisible ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                  <span className="text-sm text-white">مرئي</span>
                </div>
                <button
                  onClick={() => onUpdate(item.id, 'isVisible', !item.isVisible)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    item.isVisible ? 'bg-emerald-500' : 'bg-slate-600'
                  }`}
                  aria-label="Toggle visibility"
                  title="Toggle visibility"
                  {...{role: 'switch', 'aria-checked': String(item.isVisible)}}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    item.isVisible ? 'right-0.5' : 'right-[22px]'
                  }`} />
                </button>
              </div>
            </div>

            <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pin className={`w-4 h-4 ${item.isPinned ? 'text-amber-400 fill-amber-400' : 'text-slate-500'}`} />
                  <span className="text-sm text-white">تثبيت في المقدمة</span>
                </div>
                <button
                  onClick={() => onUpdate(item.id, 'isPinned', !item.isPinned)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    item.isPinned ? 'bg-amber-500' : 'bg-slate-600'
                  }`}
                  aria-label="Toggle pin to top"
                  title="Toggle pin to top"
                  {...{role: 'switch', 'aria-checked': String(item.isPinned)}}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    item.isPinned ? 'right-0.5' : 'right-[22px]'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Visibility Schedule */}
          <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-white">جدولة الظهور</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleScheduleToggle(false)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                    !scheduleEnabled
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500'
                      : 'bg-slate-700 text-slate-400 border border-slate-600 hover:border-slate-500'
                  }`}
                >
                  دائماً مرئي
                </button>
                <button
                  onClick={() => handleScheduleToggle(true)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                    scheduleEnabled
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500'
                      : 'bg-slate-700 text-slate-400 border border-slate-600 hover:border-slate-500'
                  }`}
                >
                  جدولة المدة
                </button>
              </div>
            </div>

            {scheduleEnabled && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">يظهر من</label>
                  <input
                    type="datetime-local"
                    value={item.visibleFrom || ''}
                    onChange={(e) => onUpdate(item.id, 'visibleFrom', e.target.value || undefined)}
                    className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 border border-slate-600 focus:border-amber-500 focus:outline-none text-sm"
                    dir="ltr"
                    aria-label="Visible from date and time"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">يختفي في</label>
                  <input
                    type="datetime-local"
                    value={item.visibleUntil || ''}
                    onChange={(e) => onUpdate(item.id, 'visibleUntil', e.target.value || undefined)}
                    className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 border border-slate-600 focus:border-amber-500 focus:outline-none text-sm"
                    dir="ltr"
                    aria-label="Visible until date and time"
                  />
                </div>
              </div>
            )}
          </div>

          {/* نوع التوجيه — only for builtin */}
          {item.type === 'builtin' && (
            <>
              <div>
                <label className="block text-sm text-slate-400 mb-2">نوع التوجيه</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'internal' as const, label: 'صفحة داخلية', icon: Smartphone },
                    { value: 'url' as const, label: 'رابط خارجي', icon: Link },
                    { value: 'html' as const, label: 'محتوى HTML', icon: FileCode },
                  ].map(opt => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => onUpdate(item.id, 'routeType', opt.value)}
                        className={`p-3 rounded-xl border text-sm flex items-center gap-2 transition-all ${
                          item.routeType === opt.value
                            ? 'border-emerald-500 bg-emerald-500/20 text-white'
                            : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {item.routeType === 'internal' && (
                <div>
                  <label className="block text-sm text-slate-400 mb-2">الصفحة</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                    {ROUTE_OPTIONS.map(r => (
                      <button
                        key={r.value}
                        onClick={() => onUpdate(item.id, 'route', r.value)}
                        className={`p-2 rounded-lg border text-xs transition-all ${
                          item.route === r.value
                            ? 'border-emerald-500 bg-emerald-500/20 text-white'
                            : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={item.route}
                    onChange={(e) => onUpdate(item.id, 'route', e.target.value)}
                    className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none font-mono text-sm"
                    placeholder="/custom/route"
                    dir="ltr"
                  />
                </div>
              )}

              {item.routeType === 'url' && (
                <div>
                  <label className="block text-sm text-slate-400 mb-2">الرابط الخارجي</label>
                  <input
                    type="text"
                    value={item.route}
                    onChange={(e) => onUpdate(item.id, 'route', e.target.value)}
                    className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none font-mono text-sm"
                    placeholder="https://example.com"
                    dir="ltr"
                  />
                </div>
              )}

              {item.routeType === 'html' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-slate-400">محتوى HTML (يُعرض داخل التطبيق)</label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          const el = document.getElementById(`html-preview-${item.id}`);
                          if (el) el.classList.toggle('hidden');
                        }}
                        className="text-xs px-2 py-1 rounded bg-slate-600 text-slate-300 hover:bg-slate-500"
                      >
                        معاينة ↕
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={item.htmlContent}
                    onChange={(e) => onUpdate(item.id, 'htmlContent', e.target.value)}
                    className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none font-mono text-sm h-40 resize-y"
                    placeholder="<h1>عنوان</h1><p>محتوى...</p>"
                    dir="ltr"
                    aria-label="HTML content for highlight page"
                  />
                  <div
                    id={`html-preview-${item.id}`}
                    className="mt-2 border border-slate-600 rounded-xl overflow-hidden hidden"
                  >
                    <div className="text-xs bg-slate-700 px-3 py-1 text-slate-400 border-b border-slate-600">معاينة</div>
                    <iframe
                      srcDoc={`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{font-family:sans-serif;padding:16px;color:#e2e8f0;background:#1e293b;direction:rtl}img{max-width:100%}h1,h2,h3{color:#34d399}</style></head><body>${item.htmlContent || ''}</body></html>`}
                      className="w-full h-64 bg-slate-800"
                      sandbox="allow-same-origin"
                      title="معاينة HTML"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* الأيقونة */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">الأيقونة</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
              {ICON_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onUpdate(item.id, 'icon', opt.value)}
                  className={`p-2 rounded-lg border text-center text-xs transition-all ${
                    item.icon === opt.value
                      ? 'border-emerald-500 bg-emerald-500/20 text-white'
                      : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span className="text-lg block">{opt.label.split(' ')[0]}</span>
                  <span>{opt.label.split(' ').slice(1).join(' ')}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-3">
              <label className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl cursor-pointer border border-slate-600 transition-colors text-sm">
                <Upload className="w-4 h-4" />
                رفع أيقونة مخصصة
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onIconUpload(item.id, file);
                  }}
                />
              </label>
              {uploadingId === item.id && (
                <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
              )}
              {item.imageUrl && (
                <div className="flex items-center gap-2">
                  <img src={item.imageUrl} alt="icon" className="w-8 h-8 rounded-full object-cover border border-slate-600" />
                  <button
                    onClick={() => onUpdate(item.id, 'imageUrl', '')}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    إزالة
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* اللون */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">اللون</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c.value}
                  onClick={() => onUpdate(item.id, 'color', c.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all ${
                    item.color === c.value
                      ? 'border-white ring-2 ring-white/30'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <Styled className="w-4 h-4 rounded-full" css={{ backgroundColor: c.value }} />
                  <span className="text-slate-300">{c.label}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={item.color}
                onChange={(e) => onUpdate(item.id, 'color', e.target.value)}
                className="w-8 h-8 rounded-lg border border-slate-600 cursor-pointer"
                aria-label="Choose highlight color"
              />
              <input
                type="text"
                value={item.color}
                onChange={(e) => onUpdate(item.id, 'color', e.target.value)}
                className="bg-slate-700 text-white rounded-lg px-3 py-1.5 w-28 border border-slate-600 text-sm font-mono"
                dir="ltr"
                aria-label="Highlight color hex value"
                placeholder="#000000"
              />
            </div>
          </div>

          {/* Updated timestamp */}
          {item.updatedAt && (
            <p className="text-xs text-slate-500">
              آخر تحديث: {new Date(item.updatedAt).toLocaleString('ar-EG')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
