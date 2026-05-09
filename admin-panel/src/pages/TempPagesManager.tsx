// admin-panel/src/pages/TempPagesManager.tsx
// إدارة الصفحات المؤقتة — تنشأ وتنتهي حسب تاريخ محدد

import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Eye, Clock, CheckCircle, X, Calendar, Globe, Copy,
  ChevronDown, ChevronUp, Link, Layout, Upload,
} from 'lucide-react';
import AutoTranslateField from '../components/AutoTranslateField';
import TranslateButton from '../components/TranslateButton';
import { Styled } from '../components/Styled';
import { db } from '../firebase';
import {
  collection, doc, getDocs, setDoc, deleteDoc, query, orderBy,
} from 'firebase/firestore';

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

interface ContentBlock {
  id: string;
  icon: string;
  text: string;
  translations?: Record<string, string>;
}

interface TempPage {
  id: string;
  title: string;
  titleEn: string;
  titles?: MultiLangText;
  icon: string;
  color: string;
  contentMode?: 'html' | 'blocks';
  htmlContent: string;
  htmlContentEn: string;
  blocks?: ContentBlock[];
  startDate: string;
  endDate: string;
  isPermanent: boolean;
  enabled: boolean;
  notificationSent: boolean;
  createdAt: string;
  updatedAt: string;
  placement?: {
    inHighlights: boolean;
    inNavMenu: boolean;
  };
  customRouteKey?: string;
  autoRemove?: boolean;
  titleTranslations?: Record<string, string>;
}

const COLOR_PRESETS = ['#0f987f', '#1e3a5f', '#6366f1', '#e11d48', '#f59e0b', '#8b5cf6', '#059669', '#1c1c1e'];

const BLOCK_ICON_OPTIONS = [
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
  { value: 'compass', label: '🧭 بوصلة' },
  { value: 'book-cross', label: '📕 كتاب' },
  { value: 'shield-check', label: '🛡️ رقية' },
  { value: 'weather-sunny', label: '☀️ صباح' },
  { value: 'weather-night', label: '🌃 مساء' },
  { value: 'circle-multiple', label: '📿 تسبيح' },
  { value: 'information', label: 'ℹ️ معلومات' },
  { value: 'check-circle', label: '✅ تم' },
  { value: 'alert-circle', label: '⚠️ تنبيه' },
  { value: 'map-marker', label: '📍 موقع' },
];

const getStatus = (page: TempPage): { label: string; color: string } => {
  if (!page.enabled) return { label: 'معطّل', color: 'bg-admin-surface-light' };
  if (page.isPermanent) return { label: 'دائمي', color: 'bg-blue-600' };
  const now = new Date();
  const start = new Date(page.startDate);
  const end = new Date(page.endDate);
  if (now < start) return { label: 'مجدول', color: 'bg-yellow-600' };
  if (now > end) return { label: 'منتهي', color: 'bg-red-600' };
  return { label: 'نشط', color: 'bg-accent-dark' };
};

const TempPagesManager: React.FC = () => {
  const [pages, setPages] = useState<TempPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TempPage | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showExtraLangs, setShowExtraLangs] = useState(false);

  const createEmptyPage = (): TempPage => {
    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 86400000);
    return {
      id: '',
      title: '',
      titleEn: '',
      titles: { ar: '', en: '' },
      icon: 'file-document-outline',
      color: '#0f987f',
      contentMode: 'html',
      htmlContent: '<div dir="rtl" style="font-family: Cairo, sans-serif; padding: 20px; color: #fff;">\n  <h1>عنوان الصفحة</h1>\n  <p>محتوى الصفحة هنا</p>\n</div>',
      htmlContentEn: '<div dir="ltr" style="font-family: sans-serif; padding: 20px; color: #fff;">\n  <h1>Page Title</h1>\n  <p>Page content here</p>\n</div>',
      blocks: [],
      startDate: now.toISOString().slice(0, 16),
      endDate: weekLater.toISOString().slice(0, 16),
      isPermanent: false,
      enabled: true,
      notificationSent: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      placement: { inHighlights: true, inNavMenu: false },
      customRouteKey: '',
      autoRemove: true,
    };
  };

  const loadPages = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'tempPages'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      setPages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TempPage)));
    } catch (error) {
      console.error('Error loading temp pages:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => { loadPages(); }, []);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async () => {
    if (!editing) return;

    // --- Validation ---
    const errors: string[] = [];
    const arTitle = (editing.titles?.ar ?? editing.title ?? '').trim();
    if (!arTitle) errors.push('العنوان (عربي) مطلوب');
    const mode = editing.contentMode || 'html';
    if (mode === 'html') {
      if (!editing.htmlContent?.trim()) errors.push('محتوى HTML (عربي) مطلوب');
    } else {
      if (!editing.blocks?.length) errors.push('يجب إضافة عنصر واحد على الأقل');
      editing.blocks?.forEach((b, i) => {
        if (!b.text?.trim()) errors.push(`العنصر ${i + 1}: النص (عربي) مطلوب`);
      });
    }
    if (!editing.isPermanent) {
      if (!editing.startDate) errors.push('تاريخ البدء مطلوب');
      if (!editing.endDate) errors.push('تاريخ الانتهاء مطلوب');
      if (editing.startDate && editing.endDate && new Date(editing.endDate) <= new Date(editing.startDate)) {
        errors.push('تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء');
      }
    }
    if (errors.length > 0) {
      alert('⚠️ يرجى تصحيح الأخطاء التالية:\n\n' + errors.map((e, i) => `${i + 1}. ${e}`).join('\n'));
      return;
    }

    // Sync backward-compat title fields from titles object
    const syncedEditing = { ...editing };
    if (syncedEditing.titles) {
      syncedEditing.title = syncedEditing.titles.ar || syncedEditing.title;
      syncedEditing.titleEn = syncedEditing.titles.en || syncedEditing.titleEn;
    }
    // Use customRouteKey as doc ID if provided, otherwise fallback
    const id = syncedEditing.id || (syncedEditing.customRouteKey?.trim() ? syncedEditing.customRouteKey.trim() : `tp_${Date.now()}`);
    const entry = { ...syncedEditing, id, updatedAt: new Date().toISOString() };
    if (!syncedEditing.id) entry.createdAt = new Date().toISOString();

    try {
      await setDoc(doc(db, 'tempPages', id), entry);
      await loadPages();
      setShowModal(false);
      setEditing(null);
      setErrorMsg(null);
    } catch (error) {
      console.error('Error saving temp page:', error);
      const msg = '❗ فشل حفظ الصفحة. تأكد من الاتصال بالإنترنت وحاول مرة أخرى.';
      setErrorMsg(msg);
      alert(msg);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الصفحة؟')) return;
    try {
      await deleteDoc(doc(db, 'tempPages', id));
      setPages(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting temp page:', error);
      alert('❗ فشل حذف الصفحة. تأكد من الاتصال بالإنترنت.');
    }
  };

  const handleToggle = async (page: TempPage) => {
    const updated = { ...page, enabled: !page.enabled, updatedAt: new Date().toISOString() };
    try {
      await setDoc(doc(db, 'tempPages', page.id), updated);
      setPages(prev => prev.map(p => p.id === page.id ? updated : p));
    } catch (error) {
      console.error('Error toggling:', error);
      alert('❗ فشل تغيير حالة الصفحة. تأكد من الاتصال بالإنترنت.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {errorMsg && (
        <div className="flex items-center justify-between px-4 py-3 bg-red-900/40 border border-red-700/40 rounded-xl text-red-300 text-sm">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white" aria-label="إغلاق">
            <X size={16} />
          </button>
        </div>
      )}

      {/* الرأس */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">صفحات HTML</h1>
          <p className="text-slate-400 mt-1">إنشاء صفحات HTML مؤقتة أو دائمية تظهر في الأبرز</p>
        </div>
        <button
          onClick={() => { setEditing(createEmptyPage()); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-accent-dark hover:bg-emerald-700 text-white rounded-xl transition-colors"
        >
          <Plus size={18} />
          صفحة جديدة
        </button>
      </div>

      {/* القائمة */}
      {isLoading ? (
        <div className="p-8 text-center text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4" />
          جاري التحميل...
        </div>
      ) : pages.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-admin-surface/50 rounded-xl">
          <Globe size={48} className="mx-auto mb-4 opacity-50" />
          <p>لا توجد صفحات مؤقتة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pages.map(page => {
            const status = getStatus(page);
            return (
              <div key={page.id} className="bg-admin-surface/50 rounded-xl p-4 border border-admin-border/50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Styled className="w-10 h-10 rounded-lg flex items-center justify-center" css={{ backgroundColor: page.color }}>
                      <span className="text-white text-lg">📄</span>
                    </Styled>
                    <div>
                      <h3 className="font-bold text-white">{page.title || 'بدون عنوان'}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full text-white ${status.color}`}>
                          {status.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          (page.contentMode || 'html') === 'blocks'
                            ? 'bg-purple-900/40 text-purple-400 border-purple-700/40'
                            : 'bg-cyan-900/40 text-cyan-400 border-cyan-700/40'
                        }`}>
                          {(page.contentMode || 'html') === 'blocks' ? '📋 بلوكات' : '<> HTML'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(page)}
                    title={page.enabled ? 'تعطيل' : 'تفعيل'}
                    aria-label={page.enabled ? 'تعطيل' : 'تفعيل'}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      page.enabled ? 'bg-accent' : 'bg-admin-surface-light'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                      page.enabled ? 'right-1' : 'left-1'
                    }`} />
                  </button>
                </div>

                <div className="text-slate-400 text-sm space-y-1 mb-3">
                  {page.isPermanent ? (
                    <p className="flex items-center gap-1 text-blue-400">
                      <CheckCircle size={14} />
                      صفحة دائمية
                    </p>
                  ) : (
                    <>
                      <p className="flex items-center gap-1">
                        <Calendar size={14} />
                        يبدأ: {new Date(page.startDate).toLocaleDateString('ar')}
                      </p>
                      <p className="flex items-center gap-1">
                        <Clock size={14} />
                        ينتهي: {new Date(page.endDate).toLocaleDateString('ar')}
                      </p>
                    </>
                  )}
                </div>

                {/* Placement & route badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {page.placement?.inHighlights && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400 border border-amber-700/40">📌 أبرز</span>
                  )}
                  {page.customRouteKey && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/40 text-cyan-400 border border-cyan-700/40">🔗 {page.customRouteKey}</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewHtml(page.htmlContent)}
                    title="معاينة"
                    aria-label="معاينة"
                    className="p-2 bg-admin-surface-light hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => { setEditing({ ...page }); setShowModal(true); }}
                    title="تعديل"
                    aria-label="تعديل"
                    className="p-2 bg-admin-surface-light hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => { setEditing({ ...page, id: '', title: page.title + ' (نسخة)' }); setShowModal(true); }}
                    title="تكرار"
                    aria-label="تكرار"
                    className="p-2 bg-emerald-900/50 hover:bg-emerald-800/50 rounded-lg text-accent-light"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(page.id)}
                    title="حذف"
                    aria-label="حذف"
                    className="p-2 bg-red-900/50 hover:bg-red-800/50 rounded-lg text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* نافذة التعديل/الإضافة */}
      {showModal && editing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-admin-bg rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editing.id ? 'تعديل الصفحة' : 'صفحة جديدة'}
              </h2>
              <button title="إغلاق" aria-label="إغلاق" onClick={() => { setShowModal(false); setEditing(null); }} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* العناوين — عربي وانجليزي */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-1">العنوان (عربي) *</label>
                  <input
                    className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border"
                    value={editing.titles?.ar ?? editing.title}
                    onChange={e => setEditing({ ...editing, title: e.target.value, titles: { ...editing.titles, ar: e.target.value, en: editing.titles?.en ?? editing.titleEn ?? '' } })}
                    placeholder="عنوان الصفحة"
                    aria-label="العنوان (عربي)"
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">Title (English)</label>
                  <input
                    className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border"
                    value={editing.titles?.en ?? editing.titleEn ?? ''}
                    onChange={e => setEditing({ ...editing, titleEn: e.target.value, titles: { ...editing.titles, ar: editing.titles?.ar ?? editing.title ?? '', en: e.target.value } })}
                    placeholder="Page title"
                    aria-label="Title (English)"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* باقي اللغات */}
              <div className="border border-admin-border rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowExtraLangs(!showExtraLangs)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-admin-surface/60 hover:bg-admin-surface text-slate-300 text-sm transition-colors"
                >
                  <span>باقي اللغات ({LANGUAGES.length - 2})</span>
                  {showExtraLangs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showExtraLangs && (
                  <div className="p-4 space-y-3 bg-admin-surface/30">
                    <button
                      type="button"
                      onClick={() => {
                        const arTitle = editing.titles?.ar ?? editing.title ?? '';
                        const filled: MultiLangText = { ar: arTitle, en: editing.titles?.en ?? editing.titleEn ?? '' };
                        LANGUAGES.forEach(l => { if (l.code !== 'ar' && l.code !== 'en') filled[l.code] = arTitle; });
                        setEditing({ ...editing, titles: filled });
                      }}
                      className="text-xs px-3 py-1.5 bg-emerald-900/40 text-accent-light rounded-lg hover:bg-emerald-900/60 border border-emerald-700/40"
                    >
                      نسخ العربي لكل اللغات
                    </button>
                    <TranslateButton
                      sourceText={editing.titles?.ar ?? editing.title ?? ''}
                      sourceLang="ar"
                      contentType="ui"
                      compact
                      onTranslated={(translations) => {
                        setEditing(prev => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            titles: {
                              ...prev.titles,
                              ar: prev.titles?.ar ?? prev.title ?? '',
                              en: translations.en || prev.titles?.en || prev.titleEn || '',
                              ...translations,
                            },
                          };
                        });
                      }}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      {LANGUAGES.filter(l => l.code !== 'ar' && l.code !== 'en').map(lang => (
                        <div key={lang.code}>
                          <label className="text-slate-400 text-xs block mb-1">{lang.flag} {lang.name}</label>
                          <input
                            className="w-full bg-admin-surface text-white rounded-lg px-3 py-1.5 border border-admin-border text-sm"
                            value={editing.titles?.[lang.code] ?? ''}
                            onChange={e => setEditing({ ...editing, titles: { ...editing.titles, ar: editing.titles?.ar ?? editing.title ?? '', en: editing.titles?.en ?? editing.titleEn ?? '', [lang.code]: e.target.value } })}
                            placeholder={lang.name}
                            aria-label={`العنوان (${lang.name})`}
                            dir={lang.rtl ? 'rtl' : 'ltr'}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Auto-translate title */}
              <AutoTranslateField
                label="ترجمة العنوان تلقائياً"
                fieldName="titleTranslations"
                contentType="ui"
                initialValues={{ ar: editing.titles?.ar ?? editing.title, en: editing.titles?.en ?? editing.titleEn ?? '' }}
                onSave={(translations) => {
                  const updatedTitles: MultiLangText = { ar: editing.titles?.ar ?? editing.title ?? '', en: translations.en || editing.titles?.en || editing.titleEn || '' };
                  LANGUAGES.forEach(l => { if ((translations as Record<string, string>)[l.code]) updatedTitles[l.code] = (translations as Record<string, string>)[l.code]; });
                  setEditing({ ...editing, titleEn: translations.en || editing.titleEn, titles: updatedTitles, titleTranslations: translations });
                }}
              />

              {/* اللون */}
              <div>
                <label className="text-slate-300 text-sm block mb-1">اللون</label>
                <div className="flex gap-2">
                  {COLOR_PRESETS.map(c => (
                    <Styled
                      as="button"
                      key={c}
                      onClick={() => setEditing({ ...editing, color: c })}
                      title={c}
                      aria-label={`اختيار اللون ${c}`}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        editing.color === c ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      css={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Placement options */}
              <div className="border border-admin-border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-slate-300 text-sm font-medium mb-1">
                  <Layout size={16} />
                  مكان العرض
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.placement?.inHighlights ?? true}
                    onChange={e => setEditing({
                      ...editing,
                      placement: {
                        inHighlights: e.target.checked,
                        inNavMenu: editing.placement?.inNavMenu ?? false,
                      },
                    })}
                    aria-label="عرض في الأبرز"
                    className="w-4 h-4 rounded bg-admin-surface-light border-admin-border text-accent focus:ring-accent"
                  />
                  <span className="text-slate-300 text-sm">عرض في الأبرز</span>
                </label>
              </div>

              {/* Custom route key */}
              <div>
                <label className="text-slate-300 text-sm block mb-1 flex items-center gap-1.5">
                  <Link size={14} />
                  مفتاح الرابط المباشر (اختياري)
                </label>
                <input
                  className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border font-mono text-sm"
                  value={editing.customRouteKey ?? ''}
                  onChange={e => setEditing({ ...editing, customRouteKey: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })}
                  placeholder="ramadan-2025"
                  aria-label="مفتاح الرابط المباشر"
                  dir="ltr"
                />
                {editing.customRouteKey && (
                  <p className="text-xs text-slate-500 mt-1 font-mono" dir="ltr">
                    rooh-almuslim://temp-page/{editing.customRouteKey}
                  </p>
                )}
              </div>

              {/* نوع الصفحة */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setEditing({ ...editing, isPermanent: !editing.isPermanent })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      editing.isPermanent ? 'bg-blue-500' : 'bg-admin-surface-light'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                      editing.isPermanent ? 'right-1' : 'left-1'
                    }`} />
                  </div>
                  <span className="text-slate-300 text-sm">
                    {editing.isPermanent ? 'صفحة دائمية (بدون تاريخ انتهاء)' : 'صفحة مؤقتة (بتاريخ بداية ونهاية)'}
                  </span>
                </label>
              </div>

              {/* Auto-remove toggle */}
              {!editing.isPermanent && (
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setEditing({ ...editing, autoRemove: !(editing.autoRemove ?? true) })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        (editing.autoRemove ?? true) ? 'bg-accent' : 'bg-admin-surface-light'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                        (editing.autoRemove ?? true) ? 'right-1' : 'left-1'
                      }`} />
                    </div>
                    <span className="text-slate-300 text-sm">إزالة تلقائية بعد الانتهاء</span>
                  </label>
                </div>
              )}

              {/* التواريخ */}
              {!editing.isPermanent && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-1">تاريخ البدء</label>
                  <input
                    type="datetime-local"
                    title="تاريخ البدء"
                    aria-label="تاريخ البدء"
                    className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border"
                    value={editing.startDate}
                    onChange={e => setEditing({ ...editing, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">تاريخ الانتهاء</label>
                  <input
                    type="datetime-local"
                    title="تاريخ الانتهاء"
                    aria-label="تاريخ الانتهاء"
                    className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border"
                    value={editing.endDate}
                    onChange={e => setEditing({ ...editing, endDate: e.target.value })}
                  />
                </div>
              </div>
              )}

              {/* ===== نوع المحتوى: بلوكات أصلية أو HTML ===== */}
              <div className="border border-admin-border rounded-xl p-4 space-y-4">
                <label className="text-slate-300 text-sm font-medium block">نوع المحتوى</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, contentMode: 'blocks' })}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors ${
                      (editing.contentMode || 'html') === 'blocks'
                        ? 'bg-accent-dark text-white'
                        : 'bg-admin-surface-light text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    📋 عناصر أصلية (Native Blocks)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, contentMode: 'html' })}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors ${
                      (editing.contentMode || 'html') === 'html'
                        ? 'bg-accent-dark text-white'
                        : 'bg-admin-surface-light text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {'<>'} HTML مخصص (Custom HTML)
                  </button>
                </div>

                {/* ===== Blocks Editor ===== */}
                {(editing.contentMode || 'html') === 'blocks' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-300 text-sm">العناصر ({editing.blocks?.length || 0})</label>
                      <button
                        type="button"
                        onClick={() => {
                          const newBlock: ContentBlock = {
                            id: `blk_${Date.now()}`,
                            icon: 'star-four-points',
                            text: '',
                            translations: {},
                          };
                          setEditing({ ...editing, blocks: [...(editing.blocks || []), newBlock] });
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-dark/20 text-accent-light rounded-lg text-xs hover:bg-accent-dark/30 transition-colors"
                      >
                        <Plus size={14} />
                        إضافة عنصر
                      </button>
                    </div>

                    {(!editing.blocks || editing.blocks.length === 0) && (
                      <div className="text-center py-6 text-slate-500 text-sm bg-admin-surface/30 rounded-xl">
                        لا توجد عناصر. اضغط &quot;إضافة عنصر&quot; للبدء.
                      </div>
                    )}

                    {editing.blocks?.map((block, idx) => (
                      <div key={block.id} className="bg-admin-surface/40 rounded-xl p-4 border border-admin-border/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-xs font-mono">#{idx + 1}</span>
                          <div className="flex gap-1.5">
                            {idx > 0 && (
                              <button
                                type="button"
                                title="نقل لأعلى"
                                aria-label="نقل لأعلى"
                                onClick={() => {
                                  const arr = [...(editing.blocks || [])];
                                  [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                                  setEditing({ ...editing, blocks: arr });
                                }}
                                className="p-1 text-slate-400 hover:text-white"
                              >
                                <ChevronUp size={14} />
                              </button>
                            )}
                            {idx < (editing.blocks?.length || 0) - 1 && (
                              <button
                                type="button"
                                title="نقل لأسفل"
                                aria-label="نقل لأسفل"
                                onClick={() => {
                                  const arr = [...(editing.blocks || [])];
                                  [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                                  setEditing({ ...editing, blocks: arr });
                                }}
                                className="p-1 text-slate-400 hover:text-white"
                              >
                                <ChevronDown size={14} />
                              </button>
                            )}
                            <button
                              type="button"
                              title="حذف العنصر"
                              aria-label="حذف العنصر"
                              onClick={() => {
                                if (!confirm(`حذف العنصر #${idx + 1}؟`)) return;
                                setEditing({ ...editing, blocks: editing.blocks?.filter((_, i) => i !== idx) });
                              }}
                              className="p-1 text-red-400 hover:text-red-300"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Icon selector */}
                        <div>
                          <label className="text-slate-400 text-xs block mb-1.5">الأيقونة</label>
                          <div className="flex flex-wrap gap-1.5">
                            {BLOCK_ICON_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                title={opt.label}
                                onClick={() => {
                                  const arr = [...(editing.blocks || [])];
                                  arr[idx] = { ...arr[idx], icon: opt.value };
                                  setEditing({ ...editing, blocks: arr });
                                }}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors ${
                                  block.icon === opt.value
                                    ? 'bg-accent-dark text-white ring-2 ring-accent-light'
                                    : 'bg-admin-surface-light text-slate-300 hover:bg-slate-600'
                                }`}
                              >
                                {opt.label.split(' ')[0]}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Text (Arabic) */}
                        <div>
                          <label className="text-slate-400 text-xs block mb-1">النص (عربي) *</label>
                          <textarea
                            className="w-full bg-admin-surface text-white rounded-lg px-3 py-2 border border-admin-border text-sm"
                            rows={2}
                            dir="rtl"
                            placeholder="نص العنصر بالعربية..."
                            value={block.text}
                            onChange={e => {
                              const arr = [...(editing.blocks || [])];
                              arr[idx] = { ...arr[idx], text: e.target.value };
                              setEditing({ ...editing, blocks: arr });
                            }}
                          />
                        </div>

                        {/* Text (English) */}
                        <div>
                          <label className="text-slate-400 text-xs block mb-1">Text (English)</label>
                          <textarea
                            className="w-full bg-admin-surface text-white rounded-lg px-3 py-2 border border-admin-border text-sm"
                            rows={2}
                            dir="ltr"
                            placeholder="English text..."
                            value={block.translations?.en || ''}
                            onChange={e => {
                              const arr = [...(editing.blocks || [])];
                              arr[idx] = { ...arr[idx], translations: { ...arr[idx].translations, en: e.target.value } };
                              setEditing({ ...editing, blocks: arr });
                            }}
                          />
                        </div>

                        {/* Auto-translate block */}
                        <TranslateButton
                          sourceText={block.text}
                          sourceLang="ar"
                          contentType="ui"
                          compact
                          onTranslated={(translations) => {
                            const arr = [...(editing.blocks || [])];
                            arr[idx] = { ...arr[idx], translations: { ...arr[idx].translations, ...translations } };
                            setEditing({ ...editing, blocks: arr });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* ===== HTML Editor (existing) ===== */}
                {(editing.contentMode || 'html') === 'html' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 text-sm block">محتوى HTML (عربي) *</label>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-dark/20 text-accent-light rounded-lg text-xs cursor-pointer hover:bg-accent-dark/30 transition-colors">
                      <Upload size={14} />
                      رفع ملف HTML
                      <input
                        type="file"
                        accept=".html,.htm"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = ev => {
                            const content = ev.target?.result as string;
                            if (content) setEditing({ ...editing, htmlContent: content });
                          };
                          reader.readAsText(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                  <textarea
                    title="محتوى HTML عربي"
                    aria-label="محتوى HTML (عربي)"
                    placeholder="<div dir='rtl'>محتوى HTML هنا</div>"
                    className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border font-mono text-sm"
                    rows={10}
                    dir="ltr"
                    value={editing.htmlContent}
                    onChange={e => setEditing({ ...editing, htmlContent: e.target.value })}
                  />
                  <label className="text-slate-400 text-xs block">معاينة (عربي)</label>
                  <div className="bg-admin-surface rounded-lg border border-admin-border overflow-hidden">
                    <iframe
                      srcDoc={editing.htmlContent}
                      className="w-full h-40"
                      title="preview-ar"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 text-sm block">HTML Content (English)</label>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-dark/20 text-accent-light rounded-lg text-xs cursor-pointer hover:bg-accent-dark/30 transition-colors">
                      <Upload size={14} />
                      Upload HTML
                      <input
                        type="file"
                        accept=".html,.htm"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = ev => {
                            const content = ev.target?.result as string;
                            if (content) setEditing({ ...editing, htmlContentEn: content });
                          };
                          reader.readAsText(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                  <textarea
                    title="HTML Content English"
                    aria-label="HTML Content (English)"
                    placeholder="<div dir='ltr'>HTML content here</div>"
                    className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border font-mono text-sm"
                    rows={10}
                    dir="ltr"
                    value={editing.htmlContentEn || ''}
                    onChange={e => setEditing({ ...editing, htmlContentEn: e.target.value })}
                  />
                  <label className="text-slate-400 text-xs block">Preview (English)</label>
                  <div className="bg-admin-surface rounded-lg border border-admin-border overflow-hidden">
                    <iframe
                      srcDoc={editing.htmlContentEn || ''}
                      className="w-full h-40"
                      title="preview-en"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); setEditing(null); }}
                className="px-4 py-2 bg-admin-surface-light text-slate-300 rounded-xl hover:bg-slate-600 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-accent-dark text-white rounded-xl hover:bg-emerald-700 transition-colors"
              >
                <CheckCircle size={18} />
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة المعاينة */}
      {previewHtml !== null && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-admin-bg rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-admin-border">
              <h3 className="text-white font-bold">معاينة الصفحة</h3>
              <button title="إغلاق" aria-label="إغلاق" onClick={() => setPreviewHtml(null)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <iframe
              srcDoc={previewHtml}
              className="w-full h-[60vh]"
              title="full-preview"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TempPagesManager;
