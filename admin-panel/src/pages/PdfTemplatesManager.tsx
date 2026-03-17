// admin-panel/src/pages/PdfTemplatesManager.tsx
// Admin page for managing PDF export templates — custom color themes & uploaded PDFs

import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../firebase';
import { doc, setDoc, collection, getDocs, addDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Upload,
  Palette,
  Eye,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Copy,
  AlertCircle,
  CheckCircle2,
  Link2,
  Replace,
} from 'lucide-react';
import { Styled } from '../components/Styled';

/* ─────────── Types ─────────── */
interface CustomTemplate {
  id: string;
  name: string;
  description: string;
  pageBg: string;
  headerGradFrom: string;
  headerGradTo: string;
  headerBorderColor: string;
  sectionBg: string;
  sectionBorder: string;
  sectionTitleColor: string;
  sectionAltBg: string;
  sectionAltBorder: string;
  sectionAltTitleColor: string;
  duaBg: string;
  duaBorder: string;
  duaTextColor: string;
  bodyTextColor: string;
  accentLineColor: string;
  stepNumBg: string;
  footerBrandColor: string;
  isActive: boolean;
  createdAt: string;
}

interface UploadedPdf {
  id: string;
  name: string;
  description: string;
  url: string;
  storagePath: string;
  pageType: 'seerah' | 'companions' | 'hajj' | 'umrah' | 'general';
  templateId?: string; // links to a specific template (built-in key or custom Firestore ID)
  languages?: string[]; // e.g. ['ar','en','fr'] — empty/undefined means all languages
  uploadedAt: string;
  fileSizeKB: number;
}

const ALL_LANGUAGES = [
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ur', label: 'اردو' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ms', label: 'Bahasa Melayu' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'ru', label: 'Русский' },
];

const FIRESTORE_TEMPLATES = 'pdfTemplates';
const FIRESTORE_UPLOADS = 'pdfUploads';
const STORAGE_PDF_PATH = 'pdf-uploads';

const PAGE_TYPES = [
  { key: 'seerah', label: 'السيرة النبوية' },
  { key: 'companions', label: 'قصص الصحابة' },
  { key: 'hajj', label: 'مناسك الحج' },
  { key: 'umrah', label: 'مناسك العمرة' },
  { key: 'general', label: 'عام' },
];

/* ─── Theme PDF Assignment types ─── */
interface ThemePdfAssignment {
  themeIndex: number;
  pdfUrl: string;
  storagePath: string;
  fileName: string;
  fileSizeKB: number;
  uploadedAt: string;
}

const THEME_NAMES = [
  'كلاسيكي', 'أخضر طبيعي', 'بني كلاسيكي', 'أبيض نقي', 'أزرق', 'أزرق داكن',
  'أزرق غامق', 'رمادي داكن', 'بنفسجي داكن', 'محايد فاتح', 'أسود', 'سماوي فاتح',
  'أخضر فاتح', 'خوخي', 'نعناعي', 'أصفر فاتح', 'لافندر',
];

const THEME_COLORS = [
  '#F5E6D3', '#E8F5E9', '#EFEBE9', '#FFFFFF', '#E3F2FD', '#0D1B2A',
  '#1A2332', '#1E1E1E', '#1A1025', '#F5F5F5', '#000000', '#E3F2FD',
  '#E8F5E9', '#FFF3E0', '#E0F2F1', '#FFFDE7', '#F3E5F5',
];

const FIRESTORE_THEME_PDFS = 'appConfig';
const THEME_PDFS_DOC = 'themePdfAssignments';
const STORAGE_THEME_PDF_PATH = 'theme-pdfs';

const DEFAULT_NEW_TEMPLATE: Omit<CustomTemplate, 'id' | 'createdAt'> = {
  name: '',
  description: '',
  pageBg: '#0a1f1a',
  headerGradFrom: '#052e23',
  headerGradTo: '#0f987f',
  headerBorderColor: 'rgba(201,168,76,0.4)',
  sectionBg: 'rgba(15,152,127,0.12)',
  sectionBorder: 'rgba(15,152,127,0.25)',
  sectionTitleColor: '#4eecc4',
  sectionAltBg: 'rgba(201,168,76,0.1)',
  sectionAltBorder: 'rgba(201,168,76,0.25)',
  sectionAltTitleColor: '#e8c66a',
  duaBg: 'rgba(201,168,76,0.08)',
  duaBorder: '#c9a84c',
  duaTextColor: '#f0ece0',
  bodyTextColor: 'rgba(232,240,237,0.85)',
  accentLineColor: '#c9a84c',
  stepNumBg: '#0f987f',
  footerBrandColor: '#ffffff',
  isActive: true,
};

/* ─────────── Component ─────────── */
export default function PdfTemplatesManager() {
  const [templates, setTemplates] = useState<CustomTemplate[]>([]);
  const [uploads, setUploads] = useState<UploadedPdf[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'templates' | 'uploads' | 'themepdfs'>('templates');
  const [editingTemplate, setEditingTemplate] = useState<CustomTemplate | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState(DEFAULT_NEW_TEMPLATE);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [expandedUpload, setExpandedUpload] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [themePdfAssignments, setThemePdfAssignments] = useState<Record<number, ThemePdfAssignment>>({});
  const [uploadingThemePdf, setUploadingThemePdf] = useState<number | null>(null);
  const themeFileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  /* ─── Load data ─── */
  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tSnap, uSnap, tpSnap] = await Promise.all([
        getDocs(collection(db, FIRESTORE_TEMPLATES)),
        getDocs(collection(db, FIRESTORE_UPLOADS)),
        getDoc(doc(db, FIRESTORE_THEME_PDFS, THEME_PDFS_DOC)),
      ]);
      setTemplates(tSnap.docs.map(d => ({ id: d.id, ...d.data() } as CustomTemplate)));
      setUploads(uSnap.docs.map(d => ({ id: d.id, ...d.data() } as UploadedPdf)));
      if (tpSnap.exists()) {
        const data = tpSnap.data();
        setThemePdfAssignments(data.assignments || {});
      }
    } catch (err) {
      console.error('Error loading PDF data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /* ─── Template CRUD ─── */
  const handleSaveTemplate = async (t: Omit<CustomTemplate, 'id' | 'createdAt'>, existingId?: string) => {
    setIsSaving(true);
    try {
      if (existingId) {
        await setDoc(doc(db, FIRESTORE_TEMPLATES, existingId), t, { merge: true });
      } else {
        await addDoc(collection(db, FIRESTORE_TEMPLATES), { ...t, createdAt: new Date().toISOString() });
      }
      setSaveStatus('success');
      setShowNewForm(false);
      setEditingTemplate(null);
      setNewTemplate(DEFAULT_NEW_TEMPLATE);
      await loadData();
    } catch (err) {
      console.error('Error saving template:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('هل تريد حذف هذا القالب؟')) return;
    try {
      await deleteDoc(doc(db, FIRESTORE_TEMPLATES, id));
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error deleting template:', err);
    }
  };

  const handleToggleActive = async (t: CustomTemplate) => {
    await setDoc(doc(db, FIRESTORE_TEMPLATES, t.id), { isActive: !t.isActive }, { merge: true });
    setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, isActive: !x.isActive } : x));
  };

  /* ─── PDF Upload ─── */
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>, pageType: string) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.includes('pdf')) {
      alert('يرجى اختيار ملف PDF');
      return;
    }
    setUploadingPdf(true);
    try {
      const storagePath = `${STORAGE_PDF_PATH}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await addDoc(collection(db, FIRESTORE_UPLOADS), {
        name: file.name.replace('.pdf', ''),
        description: '',
        url,
        storagePath,
        pageType,
        uploadedAt: new Date().toISOString(),
        fileSizeKB: Math.round(file.size / 1024),
      });
      await loadData();
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Error uploading PDF:', err);
      setSaveStatus('error');
    } finally {
      setUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteUpload = async (u: UploadedPdf) => {
    if (!confirm(`هل تريد حذف "${u.name}"؟`)) return;
    try {
      await deleteObject(ref(storage, u.storagePath));
      await deleteDoc(doc(db, FIRESTORE_UPLOADS, u.id));
      setUploads(prev => prev.filter(x => x.id !== u.id));
    } catch (err) {
      console.error('Error deleting upload:', err);
    }
  };

  const handleUpdateUploadMeta = async (id: string, data: Partial<UploadedPdf>) => {
    await setDoc(doc(db, FIRESTORE_UPLOADS, id), data, { merge: true });
    setUploads(prev => prev.map(x => x.id === id ? { ...x, ...data } : x));
  };

  /* ─── Theme PDF Assignment ─── */
  const handleThemePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>, themeIndex: number) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.includes('pdf')) {
      alert('يرجى اختيار ملف PDF');
      return;
    }
    setUploadingThemePdf(themeIndex);
    try {
      // Delete old PDF from storage if exists
      const existing = themePdfAssignments[themeIndex];
      if (existing?.storagePath) {
        try {
          await deleteObject(ref(storage, existing.storagePath));
        } catch {
          // Old file may already be deleted
        }
      }

      // Upload new PDF
      const storagePath = `${STORAGE_THEME_PDF_PATH}/${themeIndex}_${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const pdfUrl = await getDownloadURL(storageRef);

      const assignment: ThemePdfAssignment = {
        themeIndex,
        pdfUrl,
        storagePath,
        fileName: file.name,
        fileSizeKB: Math.round(file.size / 1024),
        uploadedAt: new Date().toISOString(),
      };

      const updated = { ...themePdfAssignments, [themeIndex]: assignment };
      await setDoc(doc(db, FIRESTORE_THEME_PDFS, THEME_PDFS_DOC), {
        assignments: updated,
        updatedAt: new Date().toISOString(),
      });
      setThemePdfAssignments(updated);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Error uploading theme PDF:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setUploadingThemePdf(null);
      const inputRef = themeFileInputRefs.current[themeIndex];
      if (inputRef) inputRef.value = '';
    }
  };

  const handleDeleteThemePdf = async (themeIndex: number) => {
    const assignment = themePdfAssignments[themeIndex];
    if (!assignment) return;
    if (!confirm(`هل تريد حذف PDF النمط "${THEME_NAMES[themeIndex]}"؟`)) return;

    try {
      // Delete from storage
      try {
        await deleteObject(ref(storage, assignment.storagePath));
      } catch {
        // File may already be deleted
      }

      // Remove from assignments
      const updated = { ...themePdfAssignments };
      delete updated[themeIndex];
      await setDoc(doc(db, FIRESTORE_THEME_PDFS, THEME_PDFS_DOC), {
        assignments: updated,
        updatedAt: new Date().toISOString(),
      });
      setThemePdfAssignments(updated);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Error deleting theme PDF:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  /* ─── Color picker helper ─── */
  const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div className="flex items-center gap-2">
      <div className="relative">
        <input
          type="color"
          title={label}
          aria-label={label}
          value={value.startsWith('rgba') || value.startsWith('#') ? (value.startsWith('#') ? value : '#000000') : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-slate-600"
        />
      </div>
      <div className="flex-1">
        <label className="text-xs text-slate-400 block">{label}</label>
        <input
          type="text"
          title={label}
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-700 text-white text-xs px-2 py-1 rounded border border-slate-600 focus:border-emerald-500 outline-none"
          dir="ltr"
        />
      </div>
    </div>
  );

  /* ─── Mini live preview ─── */
  const MiniPreview = ({ t }: { t: Omit<CustomTemplate, 'id' | 'createdAt'> }) => (
    <Styled className="rounded-lg overflow-hidden border border-slate-600 w-full max-w-[200px]" css={{ background: t.pageBg }}>
      {/* Header */}
      <Styled className="py-3 px-3 text-center" css={{ background: `linear-gradient(135deg, ${t.headerGradFrom}, ${t.headerGradTo})`, borderBottom: `2px solid ${t.headerBorderColor}` }}>
        <div className="text-white text-[10px] font-bold">مناسك الحج</div>
        <Styled className="w-8 h-[2px] mx-auto mt-1 rounded" css={{ background: t.accentLineColor }} />
      </Styled>
      {/* Sections */}
      <div className="p-2 space-y-1.5">
        <Styled className="rounded p-1.5" css={{ background: t.sectionBg, border: `1px solid ${t.sectionBorder}` }}>
          <Styled className="text-[7px] font-bold text-center mb-0.5" css={{ color: t.sectionTitleColor }}>١. الإحرام</Styled>
          <Styled className="h-[3px] rounded w-[80%]" css={{ background: t.bodyTextColor, opacity: 0.5 }} />
          <Styled className="h-[3px] rounded w-[60%] mt-0.5" css={{ background: t.bodyTextColor, opacity: 0.3 }} />
          <Styled className="mt-1 rounded p-1" css={{ background: t.duaBg, borderRight: `2px solid ${t.duaBorder}` }}>
            <Styled className="text-[6px]" css={{ color: t.duaTextColor }}>﴿ ربنا تقبل منا ﴾</Styled>
          </Styled>
        </Styled>
        <Styled className="rounded p-1.5" css={{ background: t.sectionAltBg, border: `1px solid ${t.sectionAltBorder}` }}>
          <Styled className="text-[7px] font-bold text-center mb-0.5" css={{ color: t.sectionAltTitleColor }}>٢. الطواف</Styled>
          <Styled className="h-[3px] rounded w-[85%]" css={{ background: t.bodyTextColor, opacity: 0.5 }} />
          <Styled className="h-[3px] rounded w-[55%] mt-0.5" css={{ background: t.bodyTextColor, opacity: 0.3 }} />
        </Styled>
      </div>
    </Styled>
  );

  /* ─── Template Form ─── */
  const TemplateForm = ({ data, onSave, onCancel, existingId }: {
    data: Omit<CustomTemplate, 'id' | 'createdAt'>;
    onSave: (d: Omit<CustomTemplate, 'id' | 'createdAt'>) => void;
    onCancel: () => void;
    existingId?: string;
  }) => {
    const [form, setForm] = useState(data);
    const update = (key: string, val: string | boolean) => setForm(prev => ({ ...prev, [key]: val }));

    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-6">
        {/* Name & Description */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-300 block mb-1">اسم القالب</label>
            <input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              aria-label="اسم القالب"
              placeholder="مثال: ذهبي فاخر"
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-slate-300 block mb-1">الوصف</label>
            <input
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              aria-label="الوصف"
              placeholder="وصف مختصر للقالب"
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>

        <div className="flex gap-6">
          {/* Color Controls */}
          <div className="flex-1 space-y-4">
            {/* Page Background */}
            <div>
              <h4 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-1">
                <Palette className="w-4 h-4" /> خلفية الصفحة
              </h4>
              <ColorField label="لون الخلفية" value={form.pageBg} onChange={(v) => update('pageBg', v)} />
            </div>

            {/* Header */}
            <div>
              <h4 className="text-sm font-semibold text-emerald-400 mb-2">الرأس (Header)</h4>
              <div className="grid grid-cols-2 gap-2">
                <ColorField label="تدرج - من" value={form.headerGradFrom} onChange={(v) => update('headerGradFrom', v)} />
                <ColorField label="تدرج - إلى" value={form.headerGradTo} onChange={(v) => update('headerGradTo', v)} />
                <ColorField label="حد الرأس" value={form.headerBorderColor} onChange={(v) => update('headerBorderColor', v)} />
                <ColorField label="خط التزيين" value={form.accentLineColor} onChange={(v) => update('accentLineColor', v)} />
              </div>
            </div>

            {/* Sections */}
            <div>
              <h4 className="text-sm font-semibold text-emerald-400 mb-2">الأقسام (الفردية)</h4>
              <div className="grid grid-cols-2 gap-2">
                <ColorField label="خلفية القسم" value={form.sectionBg} onChange={(v) => update('sectionBg', v)} />
                <ColorField label="حد القسم" value={form.sectionBorder} onChange={(v) => update('sectionBorder', v)} />
                <ColorField label="عنوان القسم" value={form.sectionTitleColor} onChange={(v) => update('sectionTitleColor', v)} />
                <ColorField label="أرقام الخطوات" value={form.stepNumBg} onChange={(v) => update('stepNumBg', v)} />
              </div>
            </div>

            {/* Alt sections */}
            <div>
              <h4 className="text-sm font-semibold text-emerald-400 mb-2">الأقسام (الزوجية)</h4>
              <div className="grid grid-cols-2 gap-2">
                <ColorField label="خلفية بديلة" value={form.sectionAltBg} onChange={(v) => update('sectionAltBg', v)} />
                <ColorField label="حد بديل" value={form.sectionAltBorder} onChange={(v) => update('sectionAltBorder', v)} />
                <ColorField label="عنوان بديل" value={form.sectionAltTitleColor} onChange={(v) => update('sectionAltTitleColor', v)} />
              </div>
            </div>

            {/* Dua & Text */}
            <div>
              <h4 className="text-sm font-semibold text-emerald-400 mb-2">الأدعية والنصوص</h4>
              <div className="grid grid-cols-2 gap-2">
                <ColorField label="خلفية الدعاء" value={form.duaBg} onChange={(v) => update('duaBg', v)} />
                <ColorField label="حد الدعاء" value={form.duaBorder} onChange={(v) => update('duaBorder', v)} />
                <ColorField label="نص الدعاء" value={form.duaTextColor} onChange={(v) => update('duaTextColor', v)} />
                <ColorField label="نص عام" value={form.bodyTextColor} onChange={(v) => update('bodyTextColor', v)} />
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="flex-shrink-0">
            <h4 className="text-sm font-semibold text-slate-300 mb-2 text-center">معاينة مباشرة</h4>
            <MiniPreview t={form} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t border-slate-700">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors">
            إلغاء
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.name.trim() || isSaving}
            className="px-6 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'جارٍ الحفظ...' : existingId ? 'تحديث' : 'إضافة'}
          </button>
        </div>
      </div>
    );
  };

  /* ─────────── Render ─────────── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">إدارة قوالب PDF</h1>
            <p className="text-slate-400 text-sm">إنشاء ثيمات جديدة أو رفع ملفات PDF جاهزة</p>
          </div>
        </div>

        {saveStatus === 'success' && (
          <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg">
            <CheckCircle2 className="w-4 h-4" /> تم الحفظ بنجاح
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="flex items-center gap-2 bg-red-500/20 text-red-400 px-4 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4" /> حدث خطأ
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'templates' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Palette className="w-4 h-4" /> قوالب الألوان ({templates.length})
        </button>
        <button
          onClick={() => setActiveTab('uploads')}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'uploads' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Upload className="w-4 h-4" /> ملفات PDF مرفوعة ({uploads.length})
        </button>
        <button
          onClick={() => setActiveTab('themepdfs')}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'themepdfs' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Link2 className="w-4 h-4" /> ربط PDF بالأنماط ({Object.keys(themePdfAssignments).length}/{THEME_NAMES.length})
        </button>
      </div>

      {/* ═══════════════ Tab: Color Templates ═══════════════ */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          {/* Add new */}
          {!showNewForm && !editingTemplate && (
            <button
              onClick={() => setShowNewForm(true)}
              className="w-full py-4 border-2 border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-emerald-400 hover:border-emerald-500 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> إضافة قالب جديد
            </button>
          )}

          {showNewForm && (
            <TemplateForm
              data={newTemplate}
              onSave={(d) => handleSaveTemplate(d)}
              onCancel={() => { setShowNewForm(false); setNewTemplate(DEFAULT_NEW_TEMPLATE); }}
            />
          )}

          {editingTemplate && (
            <TemplateForm
              data={editingTemplate}
              existingId={editingTemplate.id}
              onSave={(d) => handleSaveTemplate(d, editingTemplate.id)}
              onCancel={() => setEditingTemplate(null)}
            />
          )}

          {/* Built-in templates info */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-300 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium">القوالب المدمجة</span>
            </div>
            <p className="text-xs text-slate-400">
              يوجد ٣ قوالب مدمجة في التطبيق (زمردي، ملكي، كلاسيكي). القوالب المخصصة التي تضيفها هنا ستظهر كخيارات إضافية للمستخدم عند التصدير.
            </p>
          </div>

          {/* Existing custom templates */}
          <div className="grid gap-4">
            {templates.map(t => (
              <div key={t.id} className="bg-slate-800 rounded-xl p-5 border border-slate-700 flex items-start gap-5">
                <MiniPreview t={t} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-white">{t.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-600 text-slate-400'}`}>
                      {t.isActive ? 'مفعّل' : 'معطّل'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mb-3">{t.description || 'بدون وصف'}</p>
                  <div className="flex items-center gap-5 text-xs text-slate-500">
                    <span>تاريخ الإنشاء: {new Date(t.createdAt).toLocaleDateString('ar-EG')}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => handleToggleActive(t)} className={`p-2 rounded-lg transition-colors ${t.isActive ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`} title={t.isActive ? 'تعطيل' : 'تفعيل'} aria-label={t.isActive ? 'تعطيل القالب' : 'تفعيل القالب'}>
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingTemplate(t)} className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-blue-500/20 hover:text-blue-400 transition-colors" title="تعديل" aria-label="تعديل القالب">
                    <Palette className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteTemplate(t.id)} className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-red-500/20 hover:text-red-400 transition-colors" title="حذف القالب" aria-label="حذف القالب">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {templates.length === 0 && !showNewForm && (
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>لا توجد قوالب مخصصة بعد</p>
                <p className="text-xs mt-1">اضغط "إضافة قالب جديد" لإنشاء أول قالب</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ Tab: Uploaded PDFs ═══════════════ */}
      {activeTab === 'uploads' && (
        <div className="space-y-4">
          {/* Upload area */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-400" /> رفع ملف PDF جاهز
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              ارفع ملف PDF مصمم جاهز ليُعرض كبديل للتصدير التلقائي. يمكنك تحديد الصفحة التي يخص بها الملف.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PAGE_TYPES.map(pt => (
                <label
                  key={pt.key}
                  className="flex items-center gap-3 p-4 bg-slate-700 rounded-xl border border-slate-600 hover:border-emerald-500 cursor-pointer transition-colors group"
                >
                  <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <Upload className="w-5 h-5 text-slate-300 group-hover:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-white block">{pt.label}</span>
                    <span className="text-xs text-slate-400">اضغط لرفع PDF</span>
                  </div>
                  <input
                    type="file"
                    accept="application/pdf"
                    title={`رفع PDF - ${pt.label}`}
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => handlePdfUpload(e, pt.key)}
                    disabled={uploadingPdf}
                  />
                </label>
              ))}
            </div>
            {uploadingPdf && (
              <div className="mt-4 flex items-center gap-2 text-emerald-400 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin" /> جارٍ رفع الملف...
              </div>
            )}
          </div>

          {/* Uploaded files list */}
          <div className="space-y-3">
            {uploads.map(u => (
              <div key={u.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium truncate">{u.name}</h4>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span className="bg-slate-700 px-2 py-0.5 rounded">
                        {PAGE_TYPES.find(p => p.key === u.pageType)?.label || u.pageType}
                      </span>
                      {u.templateId && (
                        <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                          🎨 {u.templateId === 'emerald' ? 'زمردي' : u.templateId === 'royal' ? 'ملكي' : u.templateId === 'classic' ? 'كلاسيكي' : templates.find(t => t.id === u.templateId)?.name || u.templateId}
                        </span>
                      )}
                      {u.languages && u.languages.length > 0 ? (
                        <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                          🌐 {u.languages.join(', ')}
                        </span>
                      ) : (
                        <span className="bg-slate-600/50 text-slate-300 px-2 py-0.5 rounded">
                          🌐 جميع اللغات
                        </span>
                      )}
                      <span>{u.fileSizeKB} KB</span>
                      <span>{new Date(u.uploadedAt).toLocaleDateString('ar-EG')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setExpandedUpload(expandedUpload === u.id ? null : u.id)} className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors" title={expandedUpload === u.id ? 'طي التفاصيل' : 'عرض التفاصيل'} aria-label={expandedUpload === u.id ? 'طي التفاصيل' : 'عرض التفاصيل'}>
                      {expandedUpload === u.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <a href={u.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors" title="تنزيل الملف" aria-label="تنزيل الملف">
                      <Download className="w-4 h-4" />
                    </a>
                    <button onClick={() => handleDeleteUpload(u)} className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-red-500/20 hover:text-red-400 transition-colors" title="حذف الملف" aria-label="حذف الملف">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded edit */}
                {expandedUpload === u.id && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-700 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">اسم العرض</label>
                        <input
                          value={u.name}
                          title="اسم العرض"
                          aria-label="اسم العرض"
                          onChange={(e) => handleUpdateUploadMeta(u.id, { name: e.target.value })}
                          className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-emerald-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">الوصف</label>
                        <input
                          value={u.description}
                          aria-label="الوصف"
                          onChange={(e) => handleUpdateUploadMeta(u.id, { description: e.target.value })}
                          placeholder="وصف الملف"
                          className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">الصفحة</label>
                        <select
                          title="نوع الصفحة"
                          aria-label="نوع الصفحة"
                          value={u.pageType}
                          onChange={(e) => handleUpdateUploadMeta(u.id, { pageType: e.target.value as UploadedPdf['pageType'] })}
                          className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-emerald-500 outline-none"
                        >
                          {PAGE_TYPES.map(pt => <option key={pt.key} value={pt.key}>{pt.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">ربط بنمط PDF</label>
                        <select
                          title="النمط المرتبط"
                          aria-label="النمط المرتبط"
                          value={u.templateId || ''}
                          onChange={(e) => handleUpdateUploadMeta(u.id, { templateId: e.target.value || undefined })}
                          className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-emerald-500 outline-none"
                        >
                          <option value="">— بدون ربط (عام) —</option>
                          <option value="emerald">زمردي (مدمج)</option>
                          <option value="royal">ملكي (مدمج)</option>
                          <option value="classic">كلاسيكي (مدمج)</option>
                          {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                    </div>
                    {/* Language assignment */}
                    <div>
                      <label className="text-xs text-slate-400 block mb-2">اللغات المستهدفة</label>
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={() => handleUpdateUploadMeta(u.id, { languages: [] })}
                          className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                            !u.languages || u.languages.length === 0
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          جميع اللغات
                        </button>
                        <button
                          onClick={() => handleUpdateUploadMeta(u.id, { languages: u.languages && u.languages.length > 0 ? u.languages : ['ar'] })}
                          className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                            u.languages && u.languages.length > 0
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          لغات محددة
                        </button>
                      </div>
                      {u.languages && u.languages.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {ALL_LANGUAGES.map(lang => {
                            const isSelected = u.languages?.includes(lang.code) ?? false;
                            return (
                              <button
                                key={lang.code}
                                onClick={() => {
                                  const current = u.languages || [];
                                  const next = isSelected
                                    ? current.filter(c => c !== lang.code)
                                    : [...current, lang.code];
                                  handleUpdateUploadMeta(u.id, { languages: next.length > 0 ? next : [] });
                                }}
                                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                                  isSelected
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                    : 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500'
                                }`}
                              >
                                {lang.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { navigator.clipboard.writeText(u.url); }}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" /> نسخ الرابط
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {uploads.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Upload className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>لا توجد ملفات مرفوعة بعد</p>
                <p className="text-xs mt-1">ارفع ملف PDF جاهز من قسم الرفع أعلاه</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ Tab: Theme PDF Assignment ═══════════════ */}
      {activeTab === 'themepdfs' && (
        <div className="space-y-4">
          {/* Info */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-300 mb-2">
              <Link2 className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium">ربط ملفات PDF بأنماط القرآن</span>
            </div>
            <p className="text-xs text-slate-400">
              اختر نمط القراءة ثم ارفع ملف PDF مخصص له. عند اختيار المستخدم لهذا النمط، سيتم عرض ملف PDF المرتبط به. عند استبدال PDF، يتم حذف الملف القديم تلقائياً.
            </p>
          </div>

          {/* Theme grid */}
          <div className="grid gap-3">
            {THEME_NAMES.map((themeName, idx) => {
              const assignment = themePdfAssignments[idx];
              const isUploading = uploadingThemePdf === idx;
              return (
                <div key={idx} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                  <div className="flex items-center gap-4">
                    {/* Theme color swatch */}
                    <Styled
                      className="w-12 h-12 rounded-xl border-2 border-slate-600 flex-shrink-0 flex items-center justify-center text-xs font-bold"
                      css={{ backgroundColor: THEME_COLORS[idx], color: idx >= 5 && idx <= 8 || idx === 10 ? '#fff' : '#333' }}
                    >
                      {idx + 1}
                    </Styled>

                    {/* Theme name & status */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium">{themeName}</h4>
                      {assignment ? (
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> مرتبط
                          </span>
                          <span className="truncate max-w-[200px]">{assignment.fileName}</span>
                          <span>{assignment.fileSizeKB} KB</span>
                          <span>{new Date(assignment.uploadedAt).toLocaleDateString('ar-EG')}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 mt-1 block">لا يوجد PDF مرتبط</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isUploading ? (
                        <div className="flex items-center gap-2 text-emerald-400 text-sm">
                          <RefreshCw className="w-4 h-4 animate-spin" /> جارٍ الرفع...
                        </div>
                      ) : (
                        <>
                          <label className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                            assignment
                              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                              : 'bg-emerald-600 text-white hover:bg-emerald-500'
                          }`}>
                            {assignment ? (
                              <><Replace className="w-4 h-4" /> استبدال</>
                            ) : (
                              <><Upload className="w-4 h-4" /> رفع PDF</>
                            )}
                            <input
                              type="file"
                              accept="application/pdf"
                              title={`رفع PDF للنمط ${themeName}`}
                              className="hidden"
                              ref={(el) => { themeFileInputRefs.current[idx] = el; }}
                              onChange={(e) => handleThemePdfUpload(e, idx)}
                            />
                          </label>
                          {assignment && (
                            <>
                              <a
                                href={assignment.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors"
                                title="تنزيل PDF النمط"
                                aria-label="تنزيل PDF النمط"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => { navigator.clipboard.writeText(assignment.pdfUrl); }}
                                className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-blue-500/20 hover:text-blue-400 transition-colors"
                                title="نسخ الرابط"
                                aria-label="نسخ الرابط"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteThemePdf(idx)}
                                className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                title="حذف PDF النمط"
                                aria-label="حذف PDF النمط"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats summary */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 flex items-center justify-between">
            <span className="text-sm text-slate-400">
              الأنماط المرتبطة: <span className="text-emerald-400 font-bold">{Object.keys(themePdfAssignments).length}</span> من <span className="text-white">{THEME_NAMES.length}</span>
            </span>
            {Object.keys(themePdfAssignments).length > 0 && (
              <span className="text-xs text-slate-500">
                إجمالي الحجم: {Object.values(themePdfAssignments).reduce((sum, a) => sum + a.fileSizeKB, 0)} KB
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
