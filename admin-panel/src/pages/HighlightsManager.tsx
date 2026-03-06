// admin-panel/src/pages/HighlightsManager.tsx
// إدارة هايلايتس الصفحة الرئيسية

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
} from 'lucide-react';
import { db, storage } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const FIRESTORE_DOC = 'config/app-settings';

interface HighlightItem {
  id: string;
  enabled: boolean;
  title: string;
  icon: string;
  color: string;
  route: string;
  routeType: 'internal' | 'url' | 'html';
  imageUrl: string;
  htmlContent: string;
  order: number;
}

const EMPTY_HIGHLIGHT: Omit<HighlightItem, 'id' | 'order'> = {
  enabled: true,
  title: '',
  icon: 'star-four-points',
  color: '#2f7659',
  route: '',
  routeType: 'internal',
  imageUrl: '',
  htmlContent: '',
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
  { value: '/(tabs)/daily-ayah', label: 'آية اليوم' },
  { value: '/azkar/morning', label: 'أذكار الصباح' },
  { value: '/azkar/evening', label: 'أذكار المساء' },
  { value: '/hijri', label: 'التقويم الهجري' },
  { value: '/names', label: 'أسماء الله' },
  { value: '/tasbih', label: 'التسبيح' },
  { value: '/story-of-day', label: 'ستوري اليوم' },
  { value: '/worship-tracker', label: 'تتبع العبادات' },
  { value: '/hajj-umrah', label: 'الحج والعمرة' },
  { value: '/ruqya', label: 'الرقية الشرعية' },
  { value: '/night-reading', label: 'أذكار النوم' },
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

export default function HighlightsManager() {
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const docRef = doc(db, FIRESTORE_DOC);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.highlights && Array.isArray(data.highlights)) {
            setHighlights(data.highlights.map((h: any, i: number) => ({
              ...EMPTY_HIGHLIGHT,
              ...h,
              id: h.id || `hl-${Date.now()}-${i}`,
              order: h.order ?? i,
            })));
          }
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
      const sorted = [...highlights].sort((a, b) => a.order - b.order);
      await setDoc(docRef, { ...existing, highlights: sorted });
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

  const updateHighlight = (id: string, key: keyof HighlightItem, value: any) => {
    setHighlights(prev => prev.map(h => h.id === id ? { ...h, [key]: value } : h));
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
          الهايلايتس المُضافة من هنا تظهر <strong className="text-emerald-400">قبل</strong> الهايلايتس الافتراضية (التاريخ الهجري، الأذكار، آية اليوم...). يمكنك إضافة روابط داخلية، روابط خارجية، أو محتوى HTML يُعرض داخل التطبيق.
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
            <div
              key={item.id}
              className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden"
            >
              {/* Collapsed row */}
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-700/50 transition-colors"
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              >
                <div className="flex flex-col gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); moveHighlight(item.id, 'up'); }}
                    disabled={index === 0}
                    className="text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveHighlight(item.id, 'down'); }}
                    disabled={index === sorted.length - 1}
                    className="text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Preview circle */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg flex-shrink-0 border-2"
                  style={{
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
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{item.title || 'بدون عنوان'}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {item.routeType === 'internal' ? `📱 ${item.route || 'غير محدد'}` :
                     item.routeType === 'url' ? `🔗 ${item.route || 'غير محدد'}` :
                     '📄 محتوى HTML'}
                  </p>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); updateHighlight(item.id, 'enabled', !item.enabled); }}
                  className="flex-shrink-0"
                >
                  {item.enabled ? (
                    <Eye className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-slate-500" />
                  )}
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); removeHighlight(item.id); }}
                  className="flex-shrink-0 text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>

                <GripVertical className="w-5 h-5 text-slate-600 flex-shrink-0" />
              </div>

              {/* Expanded form */}
              {expandedId === item.id && (
                <div className="border-t border-slate-700 p-6 space-y-5">
                  {/* العنوان */}
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">العنوان</label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateHighlight(item.id, 'title', e.target.value)}
                      className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none"
                      placeholder="مثال: عروض رمضان"
                      dir="rtl"
                    />
                  </div>

                  {/* نوع التوجيه */}
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
                            onClick={() => updateHighlight(item.id, 'routeType', opt.value)}
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

                  {/* التوجيه */}
                  {item.routeType === 'internal' && (
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">الصفحة</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                        {ROUTE_OPTIONS.map(r => (
                          <button
                            key={r.value}
                            onClick={() => updateHighlight(item.id, 'route', r.value)}
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
                        onChange={(e) => updateHighlight(item.id, 'route', e.target.value)}
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
                        onChange={(e) => updateHighlight(item.id, 'route', e.target.value)}
                        className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none font-mono text-sm"
                        placeholder="https://example.com"
                        dir="ltr"
                      />
                    </div>
                  )}

                  {item.routeType === 'html' && (
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">محتوى HTML (يُعرض داخل التطبيق)</label>
                      <textarea
                        value={item.htmlContent}
                        onChange={(e) => updateHighlight(item.id, 'htmlContent', e.target.value)}
                        className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none font-mono text-sm h-40 resize-y"
                        placeholder="<h1>عنوان</h1><p>محتوى...</p>"
                        dir="ltr"
                      />
                    </div>
                  )}

                  {/* الأيقونة */}
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">الأيقونة</label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                      {ICON_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => updateHighlight(item.id, 'icon', opt.value)}
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

                    {/* Upload custom icon */}
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
                            if (file) handleIconUpload(item.id, file);
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
                            onClick={() => updateHighlight(item.id, 'imageUrl', '')}
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
                          onClick={() => updateHighlight(item.id, 'color', c.value)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all ${
                            item.color === c.value
                              ? 'border-white ring-2 ring-white/30'
                              : 'border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.value }} />
                          <span className="text-slate-300">{c.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={item.color}
                        onChange={(e) => updateHighlight(item.id, 'color', e.target.value)}
                        className="w-8 h-8 rounded-lg border border-slate-600 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={item.color}
                        onChange={(e) => updateHighlight(item.id, 'color', e.target.value)}
                        className="bg-slate-700 text-white rounded-lg px-3 py-1.5 w-28 border border-slate-600 text-sm font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      {sorted.filter(h => h.enabled).length > 0 && (
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-white font-semibold mb-4">معاينة الهايلايتس</h3>
          <div className="bg-slate-900 rounded-2xl p-6">
            <div className="flex gap-5 overflow-x-auto pb-2" dir="rtl">
              {sorted.filter(h => h.enabled).map(h => (
                <div key={h.id} className="flex flex-col items-center gap-2 flex-shrink-0" style={{ width: 70 }}>
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl border-[3px]"
                    style={{
                      backgroundColor: h.imageUrl ? 'transparent' : h.color,
                      borderColor: h.color,
                      backgroundImage: h.imageUrl ? `url(${h.imageUrl})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {!h.imageUrl && (ICON_OPTIONS.find(i => i.value === h.icon)?.label.split(' ')[0] || '✨')}
                  </div>
                  <span className="text-slate-300 text-[11px] text-center leading-tight truncate w-full">
                    {h.title || 'بدون عنوان'}
                  </span>
                </div>
              ))}
              {/* Built-in previews */}
              {['📅 الهجري', '🤲 أذكار', '📖 آية', '▶️ ستوري', '🕌 صلاة'].map((label, i) => (
                <div key={`builtin-${i}`} className="flex flex-col items-center gap-2 flex-shrink-0 opacity-40" style={{ width: 70 }}>
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
