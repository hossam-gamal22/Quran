/**
 * ContentManager — Admin page for managing all CMS content.
 * Supports Hajj, Umrah, Seerah, and Companions content editing.
 * All content stored in Firestore `appContent` collection.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Save, Plus, Trash2, Edit2, ChevronDown, ChevronUp,
  BookOpen, Mountain, Footprints, Users, RefreshCw,
  GripVertical, AlertCircle, CheckCircle, Calendar, Star,
  Upload, X,
} from 'lucide-react';
import { db, storage } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { convertToPng } from '../utils/imageUpload';

// ─── Types (mirror lib/content-api.ts) ──────────────────────────────────

interface CMSStep {
  text: string;
}

interface CMSDua {
  arabic: string;
  note?: string;
}

interface CMSRitualSection {
  title: string;
  titleTranslations?: Record<string, string>;
  icon: string;
  iconUrl?: string;
  iconStoragePath?: string;
  description: string;
  steps: CMSStep[];
  duas: CMSDua[];
}

interface CMSDuaEntry {
  arabic: string;
  reference?: string;
  occasion: string;
}

interface CMSDuaRitualGroup {
  title: string;
  icon: string;
  duas: CMSDuaEntry[];
}

interface HajjUmrahContent {
  umrahSections: CMSRitualSection[];
  hajjSections: CMSRitualSection[];
  duasByRitual: CMSDuaRitualGroup[];
  updatedAt?: string;
}

interface CMSSeerahSection {
  title: string;
  titleEn: string;
  titleTranslations?: Record<string, string>;
  icon: string;
  iconUrl?: string;
  iconStoragePath?: string;
  paragraphs: string[];
}

interface SeerahContent {
  sections: CMSSeerahSection[];
  updatedAt?: string;
}

interface CMSCompanion {
  id: string;
  nameAr: string;
  nameEn: string;
  nameTranslations?: Record<string, string>;
  category: string;
  brief: string;
  story: string[];
  virtues: string[];
  icon?: string;
  iconUrl?: string;
  iconStoragePath?: string;
}

interface CompanionsContent {
  companions: CMSCompanion[];
  categories: { key: string; title: string; icon: string }[];
  updatedAt?: string;
}

// ─── Seasonal CMS types ────────────────────────────────────────────────

interface CMSSeasonalDua {
  id: string;
  titleKey: string;
  arabic: string;
  translation: string;
}

interface CMSSeasonalChecklist {
  id: string;
  icon: string;
  labelKey: string;
  color: string;
}

interface SeasonalPageContent {
  duas: CMSSeasonalDua[];
  checklist: CMSSeasonalChecklist[];
  updatedAt?: string;
}

type SeasonalPageKey = 'ramadan' | 'hajj' | 'mawlid' | 'ashura';

const SEASONAL_PAGES: { key: SeasonalPageKey; label: string }[] = [
  { key: 'ramadan', label: 'رمضان' },
  { key: 'hajj', label: 'الحج' },
  { key: 'mawlid', label: 'المولد النبوي' },
  { key: 'ashura', label: 'عاشوراء' },
];

// ─── Seasons Metadata types ────────────────────────────────────────────

interface AdminSpecialDay {
  day: number;
  nameAr: string;
  nameEn: string;
  description: string;
  virtues: string[];
  recommendedActions: string[];
}

interface AdminSeasonMeta {
  type: string;
  nameAr: string;
  nameEn: string;
  description: string;
  startDate: { month: number; day: number };
  endDate: { month: number; day: number };
  color: string;
  icon: string;
  specialDays?: AdminSpecialDay[];
  greetings?: string[];
}

interface SeasonsMetadata {
  seasons: Record<string, AdminSeasonMeta>;
  updatedAt?: string;
}

const SEASON_KEYS: { key: string; label: string }[] = [
  { key: 'ramadan', label: 'رمضان' },
  { key: 'hajj', label: 'موسم الحج' },
  { key: 'dhul_hijjah', label: 'العشر الأوائل' },
  { key: 'ashura', label: 'عاشوراء' },
  { key: 'mawlid', label: 'المولد النبوي' },
  { key: 'eid_fitr', label: 'عيد الفطر' },
  { key: 'eid_adha', label: 'عيد الأضحى' },
  { key: 'muharram', label: 'محرم' },
  { key: 'rajab', label: 'رجب' },
  { key: 'shaban', label: 'شعبان' },
];

// ─── Tab types ─────────────────────────────────────────────────────────

type ContentTab = 'hajj' | 'umrah' | 'duas' | 'seerah' | 'companions' | 'seasonal' | 'seasons';

const TABS: { key: ContentTab; label: string; icon: React.ElementType }[] = [
  { key: 'hajj', label: 'مناسك الحج', icon: Mountain },
  { key: 'umrah', label: 'مناسك العمرة', icon: Footprints },
  { key: 'duas', label: 'الأدعية', icon: BookOpen },
  { key: 'seerah', label: 'السيرة النبوية', icon: BookOpen },
  { key: 'companions', label: 'الصحابة', icon: Users },
  { key: 'seasonal', label: 'المواسم', icon: Calendar },
  { key: 'seasons', label: 'بيانات المواسم', icon: Star },
];

// ─── Icon Upload Helper Component ──────────────────────────────────────

const CONTENT_ICON_STORAGE_PATH = 'content-icons';
const MAX_ICON_SIZE_MB = 5;

function IconUploadField({
  iconUrl,
  iconStoragePath,
  onUpload,
  onRemove,
  label,
}: {
  iconUrl?: string;
  iconStoragePath?: string;
  onUpload: (url: string, storagePath: string) => void;
  onRemove: () => void;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_ICON_SIZE_MB * 1024 * 1024) {
      alert(`حجم الملف أكبر من ${MAX_ICON_SIZE_MB} MB`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('يجب اختيار ملف صورة');
      return;
    }

    setUploading(true);
    try {
      const pngBlob = await convertToPng(file);
      const isSvg = file.type === 'image/svg+xml';
      const ext = isSvg ? 'svg' : 'png';
      const fileName = `icon_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^.]+$/, '')}.${ext}`;
      const storagePath = `${CONTENT_ICON_STORAGE_PATH}/${fileName}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, pngBlob, { contentType: isSvg ? 'image/svg+xml' : 'image/png' });
      const url = await getDownloadURL(storageRef);
      onUpload(url, storagePath);
    } catch (err) {
      alert(`خطأ في رفع الصورة: ${(err as Error).message}`);
    }
    setUploading(false);
    if (e.target) e.target.value = '';
  };

  const handleRemove = async () => {
    if (!confirm('هل تريد إزالة الأيقونة؟')) return;
    if (iconStoragePath) {
      try {
        await deleteObject(ref(storage, iconStoragePath));
      } catch {
        // Storage file may not exist
      }
    }
    onRemove();
  };

  return (
    <div>
      <label className="text-xs text-slate-400 mb-1 block">{label || 'صورة الأيقونة'}</label>
      {iconUrl ? (
        <div className="flex items-center gap-2">
          <img src={iconUrl} alt="icon" className="w-10 h-10 rounded-lg object-cover border border-slate-600" />
          <button onClick={handleRemove} className="text-xs text-red-400 hover:text-red-300" title="إزالة الأيقونة" aria-label="إزالة الأيقونة">
            <X size={14} />
          </button>
          <button onClick={() => fileRef.current?.click()} className="text-xs text-emerald-400 hover:text-emerald-300">تغيير</button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-50"
        >
          {uploading ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />}
          {uploading ? 'جاري الرفع...' : 'رفع صورة'}
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" title="اختيار ملف صورة" />
    </div>
  );
}

// ─── Ritual Section Editor ─────────────────────────────────────────────

function RitualSectionEditor({
  section,
  index,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  section: CMSRitualSection;
  index: number;
  onUpdate: (updated: CMSRitualSection) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const updateField = (field: keyof CMSRitualSection, value: string) => {
    onUpdate({ ...section, [field]: value });
  };

  const addStep = () => {
    onUpdate({ ...section, steps: [...section.steps, { text: '' }] });
  };

  const updateStep = (i: number, text: string) => {
    const steps = [...section.steps];
    steps[i] = { text };
    onUpdate({ ...section, steps });
  };

  const removeStep = (i: number) => {
    onUpdate({ ...section, steps: section.steps.filter((_, idx) => idx !== i) });
  };

  const addDua = () => {
    onUpdate({ ...section, duas: [...section.duas, { arabic: '', note: '' }] });
  };

  const updateDua = (i: number, field: keyof CMSDua, value: string) => {
    const duas = [...section.duas];
    duas[i] = { ...duas[i], [field]: value };
    onUpdate({ ...section, duas });
  };

  const removeDua = (i: number) => {
    onUpdate({ ...section, duas: section.duas.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="border border-slate-700 rounded-lg mb-3 overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-slate-800 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={isFirst}
            className="p-1 hover:bg-slate-700 rounded disabled:opacity-30"
            title="تحريك لأعلى"
            aria-label="تحريك لأعلى"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={isLast}
            className="p-1 hover:bg-slate-700 rounded disabled:opacity-30"
            title="تحريك لأسفل"
            aria-label="تحريك لأسفل"
          >
            <ChevronDown size={14} />
          </button>
        </div>
        <GripVertical size={16} className="text-slate-500" />
        <span className="text-sm font-medium text-slate-300 flex-1">
          {index + 1}. {section.title || 'قسم جديد'}
        </span>
        <span className="text-xs text-slate-500">
          {section.steps.length} خطوة • {section.duas.length} دعاء
        </span>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 hover:bg-red-900/30 rounded" title="حذف القسم">
          <Trash2 size={14} className="text-red-400" />
        </button>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {expanded && (
        <div className="p-4 space-y-4 bg-slate-900/50">
          {/* Basic fields */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">العنوان</label>
              <input
                value={section.title}
                onChange={(e) => updateField('title', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-right"
                dir="rtl"
                title="العنوان"
                aria-label="العنوان"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">الأيقونة (MaterialCommunityIcons)</label>
              <input
                value={section.icon}
                onChange={(e) => updateField('icon', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                placeholder="e.g. mosque, walk, tent"
                aria-label="الأيقونة"
              />
            </div>
            <IconUploadField
              iconUrl={section.iconUrl}
              iconStoragePath={section.iconStoragePath}
              onUpload={(url, path) => onUpdate({ ...section, iconUrl: url, iconStoragePath: path })}
              onRemove={() => onUpdate({ ...section, iconUrl: undefined, iconStoragePath: undefined })}
            />
          </div>
          {/* Title translations */}
          {section.titleTranslations && Object.keys(section.titleTranslations).length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(section.titleTranslations).map(([lang, val]) => (
                <div key={lang}>
                  <label className="text-xs text-slate-500 mb-0.5 block">{lang}</label>
                  <input
                    value={val}
                    onChange={(e) => onUpdate({ ...section, titleTranslations: { ...section.titleTranslations, [lang]: e.target.value } })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                    title={`ترجمة ${lang}`}
                    aria-label={`ترجمة ${lang}`}
                  />
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => {
              const langs: Record<string, string> = { ...(section.titleTranslations || {}) };
              ['en','fr','tr','ur','id','de','es','bn','ms','ru'].forEach(l => { if (!langs[l]) langs[l] = ''; });
              onUpdate({ ...section, titleTranslations: langs });
            }}
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            {section.titleTranslations ? '+ تعديل الترجمات' : '+ إضافة ترجمات العنوان'}
          </button>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">الوصف</label>
            <textarea
              value={section.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-right min-h-[60px]"
              dir="rtl"
              title="الوصف"
              aria-label="الوصف"
              placeholder="وصف القسم"
            />
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <button onClick={addStep} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
                <Plus size={14} /> إضافة خطوة
              </button>
              <span className="text-xs text-slate-400 font-medium">الخطوات ({section.steps.length})</span>
            </div>
            {section.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2 mb-2">
                <span className="text-xs text-slate-500 mt-2 w-5 text-center">{i + 1}</span>
                <textarea
                  value={step.text}
                  onChange={(e) => updateStep(i, e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-right text-sm min-h-[40px]"
                  dir="rtl"
                  title="نص الخطوة"
                  aria-label="نص الخطوة"
                  placeholder="أدخل نص الخطوة"
                />
                <button onClick={() => removeStep(i)} className="p-1 mt-1 hover:bg-red-900/30 rounded" title="حذف الخطوة">
                  <Trash2 size={12} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>

          {/* Duas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <button onClick={addDua} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
                <Plus size={14} /> إضافة دعاء
              </button>
              <span className="text-xs text-slate-400 font-medium">الأدعية ({section.duas.length})</span>
            </div>
            {section.duas.map((dua, i) => (
              <div key={i} className="border border-slate-700 rounded p-3 mb-2 bg-slate-800/50">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <textarea
                      value={dua.arabic}
                      onChange={(e) => updateDua(i, 'arabic', e.target.value)}
                      placeholder="نص الدعاء بالعربية"
                      className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-right text-sm min-h-[50px]"
                      dir="rtl"
                      aria-label="نص الدعاء"
                    />
                    <input
                      value={dua.note || ''}
                      onChange={(e) => updateDua(i, 'note', e.target.value)}
                      placeholder="ملاحظة (اختياري)"
                      className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-right text-sm"
                      dir="rtl"
                      aria-label="ملاحظة"
                    />
                  </div>
                  <button onClick={() => removeDua(i)} className="p-1 hover:bg-red-900/30 rounded" title="حذف الدعاء">
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dua Group Editor (for DUAS_BY_RITUAL tab) ─────────────────────────

function DuaGroupEditor({
  group,
  index,
  onUpdate,
  onDelete,
}: {
  group: CMSDuaRitualGroup;
  index: number;
  onUpdate: (updated: CMSDuaRitualGroup) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const addDua = () => {
    onUpdate({ ...group, duas: [...group.duas, { arabic: '', reference: '', occasion: '' }] });
  };

  const updateDua = (i: number, field: keyof CMSDuaEntry, value: string) => {
    const duas = [...group.duas];
    duas[i] = { ...duas[i], [field]: value };
    onUpdate({ ...group, duas });
  };

  const removeDua = (i: number) => {
    onUpdate({ ...group, duas: group.duas.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="border border-slate-700 rounded-lg mb-3 overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-slate-800 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <span className="text-sm font-medium text-slate-300 flex-1">
          {index + 1}. {group.title || 'مجموعة جديدة'}
        </span>
        <span className="text-xs text-slate-500">{group.duas.length} دعاء</span>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 hover:bg-red-900/30 rounded" title="حذف المجموعة">
          <Trash2 size={14} className="text-red-400" />
        </button>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {expanded && (
        <div className="p-4 space-y-4 bg-slate-900/50">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">عنوان المجموعة</label>
              <input
                value={group.title}
                onChange={(e) => onUpdate({ ...group, title: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-right"
                dir="rtl"
                title="عنوان المجموعة"
                aria-label="عنوان المجموعة"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">الأيقونة</label>
              <input
                value={group.icon}
                onChange={(e) => onUpdate({ ...group, icon: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                title="أيقونة المجموعة"
                aria-label="أيقونة المجموعة"
                placeholder="e.g. mosque, walk"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <button onClick={addDua} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
                <Plus size={14} /> إضافة دعاء
              </button>
              <span className="text-xs text-slate-400 font-medium">الأدعية ({group.duas.length})</span>
            </div>
            {group.duas.map((dua, i) => (
              <div key={i} className="border border-slate-700 rounded p-3 mb-2 bg-slate-800/50">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <textarea
                      value={dua.arabic}
                      onChange={(e) => updateDua(i, 'arabic', e.target.value)}
                      placeholder="نص الدعاء"
                      className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-right text-sm min-h-[50px]"
                      dir="rtl"
                      aria-label="نص الدعاء"
                    />
                    <input
                      value={dua.occasion}
                      onChange={(e) => updateDua(i, 'occasion', e.target.value)}
                      placeholder="المناسبة"
                      className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-right text-sm"
                      dir="rtl"
                      aria-label="المناسبة"
                    />
                    <input
                      value={dua.reference || ''}
                      onChange={(e) => updateDua(i, 'reference', e.target.value)}
                      placeholder="المرجع (اختياري)"
                      className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-right text-sm"
                      dir="rtl"
                      aria-label="المرجع"
                    />
                  </div>
                  <button onClick={() => removeDua(i)} className="p-1 hover:bg-red-900/30 rounded" title="حذف الدعاء">
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Seerah Section Editor ─────────────────────────────────────────────

function SeerahSectionEditor({
  section,
  index,
  onUpdate,
  onDelete,
}: {
  section: CMSSeerahSection;
  index: number;
  onUpdate: (updated: CMSSeerahSection) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const addParagraph = () => {
    onUpdate({ ...section, paragraphs: [...section.paragraphs, ''] });
  };

  const updateParagraph = (i: number, text: string) => {
    const paragraphs = [...section.paragraphs];
    paragraphs[i] = text;
    onUpdate({ ...section, paragraphs });
  };

  const removeParagraph = (i: number) => {
    onUpdate({ ...section, paragraphs: section.paragraphs.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="border border-slate-700 rounded-lg mb-3 overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-slate-800 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <span className="text-sm font-medium text-slate-300 flex-1">
          {index + 1}. {section.title || 'قسم جديد'}
        </span>
        <span className="text-xs text-slate-500">{section.paragraphs.length} فقرة</span>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 hover:bg-red-900/30 rounded" title="حذف القسم">
          <Trash2 size={14} className="text-red-400" />
        </button>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {expanded && (
        <div className="p-4 space-y-4 bg-slate-900/50">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">العنوان (عربي)</label>
              <input
                value={section.title}
                onChange={(e) => onUpdate({ ...section, title: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-right"
                dir="rtl"
                title="عنوان القسم"
                aria-label="عنوان القسم"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">العنوان (إنجليزي)</label>
              <input
                value={section.titleEn}
                onChange={(e) => onUpdate({ ...section, titleEn: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                title="العنوان بالإنجليزية"
                aria-label="العنوان بالإنجليزية"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">الأيقونة</label>
              <input
                value={section.icon}
                onChange={(e) => onUpdate({ ...section, icon: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                title="أيقونة القسم"
                aria-label="أيقونة القسم"
              />
            </div>
            <IconUploadField
              iconUrl={section.iconUrl}
              iconStoragePath={section.iconStoragePath}
              onUpload={(url, path) => onUpdate({ ...section, iconUrl: url, iconStoragePath: path })}
              onRemove={() => onUpdate({ ...section, iconUrl: undefined, iconStoragePath: undefined })}
            />
          </div>
          {/* Title translations */}
          {section.titleTranslations && Object.keys(section.titleTranslations).length > 0 && (
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(section.titleTranslations).map(([lang, val]) => (
                <div key={lang}>
                  <label className="text-xs text-slate-500 mb-0.5 block">{lang}</label>
                  <input
                    value={val}
                    onChange={(e) => onUpdate({ ...section, titleTranslations: { ...section.titleTranslations, [lang]: e.target.value } })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                    title={`ترجمة ${lang}`}
                    aria-label={`ترجمة ${lang}`}
                  />
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => {
              const langs: Record<string, string> = { ...(section.titleTranslations || {}) };
              ['fr','tr','ur','id','de','es','bn','ms','ru'].forEach(l => { if (!langs[l]) langs[l] = ''; });
              onUpdate({ ...section, titleTranslations: langs });
            }}
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            {section.titleTranslations ? '+ تعديل الترجمات' : '+ إضافة ترجمات العنوان'}
          </button>

          <div>
            <div className="flex items-center justify-between mb-2">
              <button onClick={addParagraph} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
                <Plus size={14} /> إضافة فقرة
              </button>
              <span className="text-xs text-slate-400 font-medium">الفقرات ({section.paragraphs.length})</span>
            </div>
            {section.paragraphs.map((p, i) => (
              <div key={i} className="flex items-start gap-2 mb-2">
                <span className="text-xs text-slate-500 mt-2 w-5 text-center">{i + 1}</span>
                <textarea
                  value={p}
                  onChange={(e) => updateParagraph(i, e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-right text-sm min-h-[80px]"
                  dir="rtl"
                  title="نص الفقرة"
                  aria-label="نص الفقرة"
                  placeholder="أدخل نص الفقرة"
                />
                <button onClick={() => removeParagraph(i)} className="p-1 mt-1 hover:bg-red-900/30 rounded" title="حذف الفقرة">
                  <Trash2 size={12} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Companion Editor ───────────────────────────────────────────────────

function CompanionEditor({
  companion,
  index,
  categories,
  onUpdate,
  onDelete,
}: {
  companion: CMSCompanion;
  index: number;
  categories: { key: string; title: string }[];
  onUpdate: (updated: CMSCompanion) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const addVirtue = () => {
    onUpdate({ ...companion, virtues: [...companion.virtues, ''] });
  };

  const updateVirtue = (i: number, text: string) => {
    const virtues = [...companion.virtues];
    virtues[i] = text;
    onUpdate({ ...companion, virtues });
  };

  const removeVirtue = (i: number) => {
    onUpdate({ ...companion, virtues: companion.virtues.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="border border-slate-700 rounded-lg mb-3 overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-slate-800 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <span className="text-sm font-medium text-slate-300 flex-1">
          {index + 1}. {companion.nameAr || 'صحابي جديد'}
        </span>
        <span className="text-xs text-slate-500">{companion.category}</span>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 hover:bg-red-900/30 rounded" title="حذف">
          <Trash2 size={14} className="text-red-400" />
        </button>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {expanded && (
        <div className="p-4 space-y-3 bg-slate-900/50">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">الاسم (عربي)</label>
              <input
                value={companion.nameAr}
                onChange={(e) => onUpdate({ ...companion, nameAr: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-right"
                dir="rtl"
                title="اسم الصحابي"
                aria-label="اسم الصحابي"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">الاسم (إنجليزي)</label>
              <input
                value={companion.nameEn}
                onChange={(e) => onUpdate({ ...companion, nameEn: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                dir="ltr"
                title="الاسم بالإنجليزيةجليزية"
                aria-label="الاسم بالإنجليزية"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">التصنيف</label>
              <select
                value={companion.category}
                onChange={(e) => onUpdate({ ...companion, category: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                title="اختر التصنيف"
                aria-label="التصنيف"
              >
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>{c.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">الوصف المختصر</label>
              <input
                value={companion.brief}
                onChange={(e) => onUpdate({ ...companion, brief: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-right"
                dir="rtl"
                title="وصف مختصر"
                aria-label="الوصف المختصر"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">الأيقونة</label>
              <input
                value={companion.icon || ''}
                onChange={(e) => onUpdate({ ...companion, icon: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                title="أيقونة الصحابي"
                aria-label="أيقونة الصحابي"
              />
            </div>
            <IconUploadField
              iconUrl={companion.iconUrl}
              iconStoragePath={companion.iconStoragePath}
              onUpload={(url, path) => onUpdate({ ...companion, iconUrl: url, iconStoragePath: path })}
              onRemove={() => onUpdate({ ...companion, iconUrl: undefined, iconStoragePath: undefined })}
            />
          </div>
          {/* Name translations */}
          {companion.nameTranslations && Object.keys(companion.nameTranslations).length > 0 && (
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(companion.nameTranslations).map(([lang, val]) => (
                <div key={lang}>
                  <label className="text-xs text-slate-500 mb-0.5 block">{lang}</label>
                  <input
                    value={val}
                    onChange={(e) => onUpdate({ ...companion, nameTranslations: { ...companion.nameTranslations, [lang]: e.target.value } })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                    title={`ترجمة الاسم ${lang}`}
                    aria-label={`ترجمة الاسم ${lang}`}
                  />
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => {
              const langs: Record<string, string> = { ...(companion.nameTranslations || {}) };
              ['fr','tr','ur','id','de','es','bn','ms','ru'].forEach(l => { if (!langs[l]) langs[l] = ''; });
              onUpdate({ ...companion, nameTranslations: langs });
            }}
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            {companion.nameTranslations ? '+ تعديل ترجمات الاسم' : '+ إضافة ترجمات الاسم'}
          </button>
          <div>
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => onUpdate({ ...companion, story: [...companion.story, ''] })} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
                <Plus size={14} /> إضافة فقرة
              </button>
              <span className="text-xs text-slate-400 font-medium">القصة ({companion.story.length} فقرة)</span>
            </div>
            {companion.story.map((paragraph, i) => (
              <div key={i} className="flex items-start gap-2 mb-2">
                <span className="text-xs text-slate-500 mt-2 w-5 text-center">{i + 1}</span>
                <textarea
                  value={paragraph}
                  onChange={(e) => {
                    const newStory = [...companion.story];
                    newStory[i] = e.target.value;
                    onUpdate({ ...companion, story: newStory });
                  }}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-right text-sm min-h-[80px]"
                  dir="rtl"
                  title="فقرة من القصة"
                  aria-label="فقرة من القصة"
                  placeholder="أدخل فقرة"
                />
                <button onClick={() => onUpdate({ ...companion, story: companion.story.filter((_, idx) => idx !== i) })} className="p-1 mt-1 hover:bg-red-900/30 rounded" title="حذف الفقرة">
                  <Trash2 size={12} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <button onClick={addVirtue} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
                <Plus size={14} /> إضافة منقبة
              </button>
              <span className="text-xs text-slate-400 font-medium">المناقب ({companion.virtues.length})</span>
            </div>
            {companion.virtues.map((v, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  value={v}
                  onChange={(e) => updateVirtue(i, e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-right text-sm"
                  dir="rtl"
                  title="نص المنقبة"
                  aria-label="نص المنقبة"
                />
                <button onClick={() => removeVirtue(i)} className="p-1 hover:bg-red-900/30 rounded" title="حذف المنقبة">
                  <Trash2 size={12} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ContentManager ────────────────────────────────────────────────

export default function ContentManager() {
  const [activeTab, setActiveTab] = useState<ContentTab>('hajj');
  const [hajjUmrah, setHajjUmrah] = useState<HajjUmrahContent | null>(null);
  const [seerah, setSeerah] = useState<SeerahContent | null>(null);
  const [companions, setCompanions] = useState<CompanionsContent | null>(null);
  const [seasonal, setSeasonal] = useState<Record<SeasonalPageKey, SeasonalPageContent | null>>({
    ramadan: null, hajj: null, mawlid: null, ashura: null,
  });
  const [activeSeasonalPage, setActiveSeasonalPage] = useState<SeasonalPageKey>('ramadan');
  const [seasonsMeta, setSeasonsMeta] = useState<SeasonsMetadata | null>(null);
  const [activeSeasonKey, setActiveSeasonKey] = useState<string>('ramadan');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load all content on mount
  useEffect(() => {
    loadAllContent();
  }, []);

  const loadAllContent = async () => {
    setLoading(true);
    try {
      const [hajjDoc, seerahDoc, companionsDoc, seasonsMetaDoc, ...seasonalDocs] = await Promise.all([
        getDoc(doc(db, 'appContent', 'hajjUmrahContent')),
        getDoc(doc(db, 'appContent', 'seerahContent')),
        getDoc(doc(db, 'appContent', 'companionsContent')),
        getDoc(doc(db, 'appContent', 'seasonsMetadata')),
        ...SEASONAL_PAGES.map(p => getDoc(doc(db, 'appContent', `seasonalContent/${p.key}`))),
      ]);

      if (hajjDoc.exists()) setHajjUmrah(hajjDoc.data() as HajjUmrahContent);
      if (seerahDoc.exists()) setSeerah(seerahDoc.data() as SeerahContent);
      if (companionsDoc.exists()) setCompanions(companionsDoc.data() as CompanionsContent);
      if (seasonsMetaDoc.exists()) setSeasonsMeta(seasonsMetaDoc.data() as SeasonsMetadata);

      const seasonalData: Record<SeasonalPageKey, SeasonalPageContent | null> = {
        ramadan: null, hajj: null, mawlid: null, ashura: null,
      };
      SEASONAL_PAGES.forEach((p, i) => {
        if (seasonalDocs[i].exists()) {
          seasonalData[p.key] = seasonalDocs[i].data() as SeasonalPageContent;
        }
      });
      setSeasonal(seasonalData);
    } catch (err) {
      console.error('Failed to load CMS content:', err);
      setStatus({ type: 'error', message: 'فشل تحميل المحتوى' });
    } finally {
      setLoading(false);
    }
  };

  // Save handlers
  const saveHajjUmrah = useCallback(async () => {
    if (!hajjUmrah) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'appContent', 'hajjUmrahContent'), {
        ...hajjUmrah,
        updatedAt: new Date().toISOString(),
      });
      setStatus({ type: 'success', message: 'تم حفظ محتوى الحج والعمرة' });
    } catch (err) {
      console.error('Save error:', err);
      setStatus({ type: 'error', message: 'فشل حفظ المحتوى' });
    } finally {
      setSaving(false);
    }
  }, [hajjUmrah]);

  const saveSeerah = useCallback(async () => {
    if (!seerah) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'appContent', 'seerahContent'), {
        ...seerah,
        updatedAt: new Date().toISOString(),
      });
      setStatus({ type: 'success', message: 'تم حفظ السيرة النبوية' });
    } catch (err) {
      console.error('Save error:', err);
      setStatus({ type: 'error', message: 'فشل حفظ المحتوى' });
    } finally {
      setSaving(false);
    }
  }, [seerah]);

  const saveCompanions = useCallback(async () => {
    if (!companions) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'appContent', 'companionsContent'), {
        ...companions,
        updatedAt: new Date().toISOString(),
      });
      setStatus({ type: 'success', message: 'تم حفظ قصص الصحابة' });
    } catch (err) {
      console.error('Save error:', err);
      setStatus({ type: 'error', message: 'فشل حفظ المحتوى' });
    } finally {
      setSaving(false);
    }
  }, [companions]);

  const saveSeasonal = useCallback(async () => {
    const data = seasonal[activeSeasonalPage];
    if (!data) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'appContent', `seasonalContent/${activeSeasonalPage}`), {
        ...data,
        updatedAt: new Date().toISOString(),
      });
      setStatus({ type: 'success', message: `تم حفظ محتوى ${SEASONAL_PAGES.find(p => p.key === activeSeasonalPage)?.label}` });
    } catch (err) {
      console.error('Save error:', err);
      setStatus({ type: 'error', message: 'فشل حفظ المحتوى' });
    } finally {
      setSaving(false);
    }
  }, [seasonal, activeSeasonalPage]);

  const saveSeasonsMeta = useCallback(async () => {
    if (!seasonsMeta) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'appContent', 'seasonsMetadata'), {
        ...seasonsMeta,
        updatedAt: new Date().toISOString(),
      });
      setStatus({ type: 'success', message: 'تم حفظ بيانات المواسم' });
    } catch (err) {
      console.error('Save error:', err);
      setStatus({ type: 'error', message: 'فشل حفظ المحتوى' });
    } finally {
      setSaving(false);
    }
  }, [seasonsMeta]);

  const handleSave = () => {
    if (activeTab === 'hajj' || activeTab === 'umrah' || activeTab === 'duas') saveHajjUmrah();
    else if (activeTab === 'seerah') saveSeerah();
    else if (activeTab === 'companions') saveCompanions();
    else if (activeTab === 'seasonal') saveSeasonal();
    else if (activeTab === 'seasons') saveSeasonsMeta();
  };

  // Section manipulation helpers for HajjUmrah
  const updateHajjSection = (idx: number, updated: CMSRitualSection) => {
    if (!hajjUmrah) return;
    const sections = [...hajjUmrah.hajjSections];
    sections[idx] = updated;
    setHajjUmrah({ ...hajjUmrah, hajjSections: sections });
  };

  const updateUmrahSection = (idx: number, updated: CMSRitualSection) => {
    if (!hajjUmrah) return;
    const sections = [...hajjUmrah.umrahSections];
    sections[idx] = updated;
    setHajjUmrah({ ...hajjUmrah, umrahSections: sections });
  };

  const updateDuaGroup = (idx: number, updated: CMSDuaRitualGroup) => {
    if (!hajjUmrah) return;
    const groups = [...hajjUmrah.duasByRitual];
    groups[idx] = updated;
    setHajjUmrah({ ...hajjUmrah, duasByRitual: groups });
  };

  const moveSection = (type: 'hajj' | 'umrah' | 'duas', idx: number, dir: -1 | 1) => {
    if (!hajjUmrah) return;
    const key = type === 'hajj' ? 'hajjSections' : type === 'umrah' ? 'umrahSections' : 'duasByRitual';
    const arr = [...(hajjUmrah[key] as unknown[])];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setHajjUmrah({ ...hajjUmrah, [key]: arr });
  };

  // Auto-clear status
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Helper to initialize content with defaults
  const initHajjUmrah = () => {
    setHajjUmrah({
      umrahSections: [],
      hajjSections: [],
      duasByRitual: [],
    });
  };

  const initSeerah = () => {
    setSeerah({ sections: [] });
  };

  const initCompanions = () => {
    setCompanions({
      companions: [],
      categories: [
        { key: 'ashara', title: 'العشرة المبشرون بالجنة', icon: 'star-crescent' },
        { key: 'muhajirun', title: 'المهاجرون', icon: 'road-variant' },
        { key: 'ansar', title: 'الأنصار', icon: 'home-heart' },
        { key: 'mothers', title: 'أمهات المؤمنين', icon: 'heart-multiple' },
      ],
    });
  };

  const initSeasonal = (page: SeasonalPageKey) => {
    setSeasonal(prev => ({
      ...prev,
      [page]: { duas: [], checklist: [] },
    }));
  };

  const updateSeasonalDua = (duaIdx: number, updated: CMSSeasonalDua) => {
    const data = seasonal[activeSeasonalPage];
    if (!data) return;
    const duas = [...data.duas];
    duas[duaIdx] = updated;
    setSeasonal(prev => ({ ...prev, [activeSeasonalPage]: { ...data, duas } }));
  };

  const updateSeasonalChecklist = (idx: number, updated: CMSSeasonalChecklist) => {
    const data = seasonal[activeSeasonalPage];
    if (!data) return;
    const checklist = [...data.checklist];
    checklist[idx] = updated;
    setSeasonal(prev => ({ ...prev, [activeSeasonalPage]: { ...data, checklist } }));
  };

  const initSeasonsMeta = () => {
    const seasons: Record<string, AdminSeasonMeta> = {};
    SEASON_KEYS.forEach(s => {
      seasons[s.key] = {
        type: s.key, nameAr: s.label, nameEn: '',
        description: '', startDate: { month: 1, day: 1 }, endDate: { month: 1, day: 30 },
        color: '#2f7659', icon: 'calendar', greetings: [],
      };
    });
    setSeasonsMeta({ seasons });
  };

  const updateSeasonMeta = (key: string, field: string, value: unknown) => {
    if (!seasonsMeta) return;
    setSeasonsMeta({
      ...seasonsMeta,
      seasons: {
        ...seasonsMeta.seasons,
        [key]: { ...seasonsMeta.seasons[key], [field]: value },
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="animate-spin text-emerald-400" size={24} />
        <span className="text-slate-400 mr-2">جاري التحميل...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة المحتوى</h1>
          <p className="text-sm text-slate-400 mt-1">تعديل محتوى الحج والعمرة والسيرة والصحابة</p>
        </div>
        <div className="flex items-center gap-3">
          {status && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${status.type === 'success' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
              {status.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {status.message}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            حفظ
          </button>
          <button
            onClick={loadAllContent}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm"
            title="إعادة تحميل"
            aria-label="إعادة تحميل"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-800 rounded-lg p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === tab.key
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Hajj sections tab */}
      {activeTab === 'hajj' && (
        <div>
          {!hajjUmrah ? (
            <EmptyState label="الحج والعمرة" onInit={initHajjUmrah} />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">مناسك الحج ({hajjUmrah.hajjSections.length} قسم)</h2>
                <button
                  onClick={() => setHajjUmrah({
                    ...hajjUmrah,
                    hajjSections: [...hajjUmrah.hajjSections, { title: '', icon: 'mosque', description: '', steps: [], duas: [] }],
                  })}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-600/30"
                >
                  <Plus size={14} /> إضافة قسم
                </button>
              </div>
              {hajjUmrah.hajjSections.map((section, i) => (
                <RitualSectionEditor
                  key={i}
                  section={section}
                  index={i}
                  onUpdate={(updated) => updateHajjSection(i, updated)}
                  onDelete={() => setHajjUmrah({
                    ...hajjUmrah,
                    hajjSections: hajjUmrah.hajjSections.filter((_, idx) => idx !== i),
                  })}
                  onMoveUp={() => moveSection('hajj', i, -1)}
                  onMoveDown={() => moveSection('hajj', i, 1)}
                  isFirst={i === 0}
                  isLast={i === hajjUmrah.hajjSections.length - 1}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Umrah sections tab */}
      {activeTab === 'umrah' && (
        <div>
          {!hajjUmrah ? (
            <EmptyState label="الحج والعمرة" onInit={initHajjUmrah} />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">مناسك العمرة ({hajjUmrah.umrahSections.length} قسم)</h2>
                <button
                  onClick={() => setHajjUmrah({
                    ...hajjUmrah,
                    umrahSections: [...hajjUmrah.umrahSections, { title: '', icon: 'mosque', description: '', steps: [], duas: [] }],
                  })}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-600/30"
                >
                  <Plus size={14} /> إضافة قسم
                </button>
              </div>
              {hajjUmrah.umrahSections.map((section, i) => (
                <RitualSectionEditor
                  key={i}
                  section={section}
                  index={i}
                  onUpdate={(updated) => updateUmrahSection(i, updated)}
                  onDelete={() => setHajjUmrah({
                    ...hajjUmrah,
                    umrahSections: hajjUmrah.umrahSections.filter((_, idx) => idx !== i),
                  })}
                  onMoveUp={() => moveSection('umrah', i, -1)}
                  onMoveDown={() => moveSection('umrah', i, 1)}
                  isFirst={i === 0}
                  isLast={i === hajjUmrah.umrahSections.length - 1}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Duas tab */}
      {activeTab === 'duas' && (
        <div>
          {!hajjUmrah ? (
            <EmptyState label="الحج والعمرة" onInit={initHajjUmrah} />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">مجموعات الأدعية ({hajjUmrah.duasByRitual.length} مجموعة)</h2>
                <button
                  onClick={() => setHajjUmrah({
                    ...hajjUmrah,
                    duasByRitual: [...hajjUmrah.duasByRitual, { title: '', icon: 'hands-pray', duas: [] }],
                  })}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-600/30"
                >
                  <Plus size={14} /> إضافة مجموعة
                </button>
              </div>
              {hajjUmrah.duasByRitual.map((group, i) => (
                <DuaGroupEditor
                  key={i}
                  group={group}
                  index={i}
                  onUpdate={(updated) => updateDuaGroup(i, updated)}
                  onDelete={() => setHajjUmrah({
                    ...hajjUmrah,
                    duasByRitual: hajjUmrah.duasByRitual.filter((_, idx) => idx !== i),
                  })}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Seerah tab */}
      {activeTab === 'seerah' && (
        <div>
          {!seerah ? (
            <EmptyState label="السيرة النبوية" onInit={initSeerah} />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">أقسام السيرة ({seerah.sections.length} قسم)</h2>
                <button
                  onClick={() => setSeerah({
                    ...seerah,
                    sections: [...seerah.sections, { title: '', titleEn: '', icon: 'book-open-variant', paragraphs: [] }],
                  })}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-600/30"
                >
                  <Plus size={14} /> إضافة قسم
                </button>
              </div>
              {seerah.sections.map((section, i) => (
                <SeerahSectionEditor
                  key={i}
                  section={section}
                  index={i}
                  onUpdate={(updated) => {
                    const sections = [...seerah.sections];
                    sections[i] = updated;
                    setSeerah({ ...seerah, sections });
                  }}
                  onDelete={() => setSeerah({
                    ...seerah,
                    sections: seerah.sections.filter((_, idx) => idx !== i),
                  })}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Companions tab */}
      {activeTab === 'companions' && (
        <div>
          {!companions ? (
            <EmptyState label="الصحابة" onInit={initCompanions} />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">الصحابة ({companions.companions.length} صحابي)</h2>
                <button
                  onClick={() => setCompanions({
                    ...companions,
                    companions: [...companions.companions, {
                      id: `companion-${Date.now()}`, nameAr: '', nameEn: '', category: companions.categories[0]?.key || 'ashara',
                      brief: '', story: [], virtues: [],
                    }],
                  })}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-600/30"
                >
                  <Plus size={14} /> إضافة صحابي
                </button>
              </div>
              {companions.companions.map((comp, i) => (
                <CompanionEditor
                  key={i}
                  companion={comp}
                  index={i}
                  categories={companions.categories}
                  onUpdate={(updated) => {
                    const comps = [...companions.companions];
                    comps[i] = updated;
                    setCompanions({ ...companions, companions: comps });
                  }}
                  onDelete={() => setCompanions({
                    ...companions,
                    companions: companions.companions.filter((_, idx) => idx !== i),
                  })}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Seasonal tab */}
      {activeTab === 'seasonal' && (
        <div>
          <div className="flex gap-2 mb-4">
            {SEASONAL_PAGES.map(p => (
              <button
                key={p.key}
                onClick={() => setActiveSeasonalPage(p.key)}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  activeSeasonalPage === p.key
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {!seasonal[activeSeasonalPage] ? (
            <EmptyState label={SEASONAL_PAGES.find(p => p.key === activeSeasonalPage)?.label || 'الموسم'} onInit={() => initSeasonal(activeSeasonalPage)} />
          ) : (
            <>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-semibold text-white">الأدعية ({seasonal[activeSeasonalPage]!.duas.length})</h3>
                  <button
                    onClick={() => {
                      const data = seasonal[activeSeasonalPage]!;
                      setSeasonal(prev => ({
                        ...prev,
                        [activeSeasonalPage]: {
                          ...data,
                          duas: [...data.duas, { id: `dua-${Date.now()}`, titleKey: '', arabic: '', translation: '' }],
                        },
                      }));
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-600/30"
                  >
                    <Plus size={14} /> إضافة دعاء
                  </button>
                </div>
                {seasonal[activeSeasonalPage]!.duas.map((dua, i) => (
                  <div key={i} className="border border-slate-700 rounded-lg mb-2 p-3 bg-slate-900/50">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input value={dua.id} onChange={(e) => updateSeasonalDua(i, { ...dua, id: e.target.value })} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm" placeholder="المعرّف" title="معرف الدعاء" aria-label="معرف الدعاء" />
                      <input value={dua.titleKey} onChange={(e) => updateSeasonalDua(i, { ...dua, titleKey: e.target.value })} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm" placeholder="مفتاح العنوان" title="مفتاح العنوان" aria-label="مفتاح العنوان" />
                    </div>
                    <textarea value={dua.arabic} onChange={(e) => updateSeasonalDua(i, { ...dua, arabic: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm text-right mb-2 min-h-[60px]" dir="rtl" placeholder="النص العربي" title="النص العربي" aria-label="النص العربي" />
                    <div className="flex items-center gap-2">
                      <input value={dua.translation} onChange={(e) => updateSeasonalDua(i, { ...dua, translation: e.target.value })} className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm" placeholder="الترجمة" title="الترجمة" aria-label="الترجمة" />
                      <button onClick={() => { const data = seasonal[activeSeasonalPage]!; setSeasonal(prev => ({ ...prev, [activeSeasonalPage]: { ...data, duas: data.duas.filter((_, idx) => idx !== i) } })); }} className="p-1 hover:bg-red-900/30 rounded" title="حذف الدعاء">
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-semibold text-white">قائمة المهام ({seasonal[activeSeasonalPage]!.checklist.length})</h3>
                  <button
                    onClick={() => {
                      const data = seasonal[activeSeasonalPage]!;
                      setSeasonal(prev => ({
                        ...prev,
                        [activeSeasonalPage]: {
                          ...data,
                          checklist: [...data.checklist, { id: `item-${Date.now()}`, icon: 'check', labelKey: '', color: '#2f7659' }],
                        },
                      }));
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-600/30"
                  >
                    <Plus size={14} /> إضافة عنصر
                  </button>
                </div>
                {seasonal[activeSeasonalPage]!.checklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input value={item.id} onChange={(e) => updateSeasonalChecklist(i, { ...item, id: e.target.value })} className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm" placeholder="id" title="معرف العنصر" aria-label="معرف العنصر" />
                    <input value={item.icon} onChange={(e) => updateSeasonalChecklist(i, { ...item, icon: e.target.value })} className="w-28 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm" placeholder="أيقونة" title="أيقونة العنصر" aria-label="أيقونة العنصر" />
                    <input value={item.labelKey} onChange={(e) => updateSeasonalChecklist(i, { ...item, labelKey: e.target.value })} className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm" placeholder="مفتاح النص" title="مفتاح النص" aria-label="مفتاح النص" />
                    <input type="color" value={item.color} onChange={(e) => updateSeasonalChecklist(i, { ...item, color: e.target.value })} className="w-8 h-8 rounded cursor-pointer" title="لون العنصر" aria-label="لون العنصر" />
                    <button onClick={() => { const data = seasonal[activeSeasonalPage]!; setSeasonal(prev => ({ ...prev, [activeSeasonalPage]: { ...data, checklist: data.checklist.filter((_, idx) => idx !== i) } })); }} className="p-1 hover:bg-red-900/30 rounded" title="حذف العنصر">
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Seasons Metadata tab */}
      {activeTab === 'seasons' && (
        <div>
          {!seasonsMeta ? (
            <EmptyState label="بيانات المواسم" onInit={initSeasonsMeta} />
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                {SEASON_KEYS.map(s => (
                  <button
                    key={s.key}
                    onClick={() => setActiveSeasonKey(s.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      activeSeasonKey === s.key
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {seasonsMeta.seasons[activeSeasonKey] && (() => {
                const season = seasonsMeta.seasons[activeSeasonKey];
                return (
                  <div className="space-y-4">
                    {/* Basic info */}
                    <div className="border border-slate-700 rounded-lg p-4 bg-slate-900/50">
                      <h3 className="text-sm font-semibold text-slate-300 mb-3">المعلومات الأساسية</h3>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">الاسم بالعربية</label>
                          <input value={season.nameAr} onChange={e => updateSeasonMeta(activeSeasonKey, 'nameAr', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm text-right" dir="rtl" title="الاسم بالعربية" aria-label="الاسم بالعربية" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">الاسم بالإنجليزية</label>
                          <input value={season.nameEn} onChange={e => updateSeasonMeta(activeSeasonKey, 'nameEn', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm" title="الاسم بالإنجليزية" aria-label="الاسم بالإنجليزية" />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="text-xs text-slate-500 block mb-1">الوصف</label>
                        <textarea value={season.description} onChange={e => updateSeasonMeta(activeSeasonKey, 'description', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm text-right min-h-[50px]" dir="rtl" title="الوصف" aria-label="وصف الموسم" placeholder="وصف الموسم" />
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">شهر البداية</label>
                          <input type="number" min={1} max={12} value={season.startDate.month} onChange={e => updateSeasonMeta(activeSeasonKey, 'startDate', { ...season.startDate, month: +e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm" title="شهر البداية" aria-label="شهر البداية" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">يوم البداية</label>
                          <input type="number" min={1} max={30} value={season.startDate.day} onChange={e => updateSeasonMeta(activeSeasonKey, 'startDate', { ...season.startDate, day: +e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm" title="يوم البداية" aria-label="يوم البداية" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">شهر النهاية</label>
                          <input type="number" min={1} max={12} value={season.endDate.month} onChange={e => updateSeasonMeta(activeSeasonKey, 'endDate', { ...season.endDate, month: +e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm" title="شهر النهاية" aria-label="شهر النهاية" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">يوم النهاية</label>
                          <input type="number" min={1} max={30} value={season.endDate.day} onChange={e => updateSeasonMeta(activeSeasonKey, 'endDate', { ...season.endDate, day: +e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm" title="يوم النهاية" aria-label="يوم النهاية" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">الأيقونة</label>
                          <input value={season.icon} onChange={e => updateSeasonMeta(activeSeasonKey, 'icon', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm" title="اسم الأيقونة" aria-label="اسم الأيقونة" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">اللون</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={season.color} onChange={e => updateSeasonMeta(activeSeasonKey, 'color', e.target.value)} className="w-8 h-8 rounded cursor-pointer" title="لون الموسم" aria-label="لون الموسم" />
                            <input value={season.color} onChange={e => updateSeasonMeta(activeSeasonKey, 'color', e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm" title="كود اللون" aria-label="كود اللون" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Special Days */}
                    <div className="border border-slate-700 rounded-lg p-4 bg-slate-900/50">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-300">الأيام المميزة ({season.specialDays?.length || 0})</h3>
                        <button
                          onClick={() => {
                            const days = [...(season.specialDays || []), { day: 1, nameAr: '', nameEn: '', description: '', virtues: [], recommendedActions: [] }];
                            updateSeasonMeta(activeSeasonKey, 'specialDays', days);
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-emerald-600/20 text-emerald-400 rounded text-xs hover:bg-emerald-600/30"
                        >
                          <Plus size={12} /> إضافة
                        </button>
                      </div>
                      {(season.specialDays || []).map((sd, si) => (
                        <div key={si} className="border border-slate-600 rounded-lg p-3 mb-2 bg-slate-800/50">
                          <div className="grid grid-cols-4 gap-2 mb-2">
                            <input type="number" value={sd.day} min={1} max={30} onChange={e => { const days = [...(season.specialDays || [])]; days[si] = { ...sd, day: +e.target.value }; updateSeasonMeta(activeSeasonKey, 'specialDays', days); }} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm" placeholder="اليوم" title="رقم اليوم" aria-label="رقم اليوم" />
                            <input value={sd.nameAr} onChange={e => { const days = [...(season.specialDays || [])]; days[si] = { ...sd, nameAr: e.target.value }; updateSeasonMeta(activeSeasonKey, 'specialDays', days); }} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm text-right" dir="rtl" placeholder="الاسم بالعربية" title="الاسم بالعربية" aria-label="الاسم بالعربية" />
                            <input value={sd.nameEn} onChange={e => { const days = [...(season.specialDays || [])]; days[si] = { ...sd, nameEn: e.target.value }; updateSeasonMeta(activeSeasonKey, 'specialDays', days); }} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm" placeholder="الاسم بالإنجليزية" title="الاسم بالإنجليزية" aria-label="الاسم بالإنجليزية" />
                            <button onClick={() => { const days = (season.specialDays || []).filter((_, idx) => idx !== si); updateSeasonMeta(activeSeasonKey, 'specialDays', days); }} className="p-1 hover:bg-red-900/30 rounded self-center justify-self-center" title="حذف اليوم">
                              <Trash2 size={14} className="text-red-400" />
                            </button>
                          </div>
                          <textarea value={sd.description} onChange={e => { const days = [...(season.specialDays || [])]; days[si] = { ...sd, description: e.target.value }; updateSeasonMeta(activeSeasonKey, 'specialDays', days); }} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm text-right mb-2 min-h-[40px]" dir="rtl" placeholder="الوصف" title="الوصف" aria-label="وصف اليوم" />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-xs text-slate-500 block mb-1">الفضائل</span>
                              {sd.virtues.map((v, vi) => (
                                <div key={vi} className="flex gap-1 mb-1">
                                  <input value={v} onChange={e => { const days = [...(season.specialDays || [])]; const virtues = [...sd.virtues]; virtues[vi] = e.target.value; days[si] = { ...sd, virtues }; updateSeasonMeta(activeSeasonKey, 'specialDays', days); }} className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-white text-xs text-right" dir="rtl" title="نص الفضيلة" aria-label="نص الفضيلة" />
                                  <button onClick={() => { const days = [...(season.specialDays || [])]; days[si] = { ...sd, virtues: sd.virtues.filter((_, idx) => idx !== vi) }; updateSeasonMeta(activeSeasonKey, 'specialDays', days); }} className="p-0.5 hover:bg-red-900/30 rounded" title="حذف"><Trash2 size={10} className="text-red-400" /></button>
                                </div>
                              ))}
                              <button onClick={() => { const days = [...(season.specialDays || [])]; days[si] = { ...sd, virtues: [...sd.virtues, ''] }; updateSeasonMeta(activeSeasonKey, 'specialDays', days); }} className="text-emerald-400 text-xs hover:text-emerald-300">+ فضيلة</button>
                            </div>
                            <div>
                              <span className="text-xs text-slate-500 block mb-1">الأعمال المستحبة</span>
                              {sd.recommendedActions.map((a, ai) => (
                                <div key={ai} className="flex gap-1 mb-1">
                                  <input value={a} onChange={e => { const days = [...(season.specialDays || [])]; const actions = [...sd.recommendedActions]; actions[ai] = e.target.value; days[si] = { ...sd, recommendedActions: actions }; updateSeasonMeta(activeSeasonKey, 'specialDays', days); }} className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-white text-xs text-right" dir="rtl" title="نص العمل" aria-label="نص العمل" />
                                  <button onClick={() => { const days = [...(season.specialDays || [])]; days[si] = { ...sd, recommendedActions: sd.recommendedActions.filter((_, idx) => idx !== ai) }; updateSeasonMeta(activeSeasonKey, 'specialDays', days); }} className="p-0.5 hover:bg-red-900/30 rounded" title="حذف"><Trash2 size={10} className="text-red-400" /></button>
                                </div>
                              ))}
                              <button onClick={() => { const days = [...(season.specialDays || [])]; days[si] = { ...sd, recommendedActions: [...sd.recommendedActions, ''] }; updateSeasonMeta(activeSeasonKey, 'specialDays', days); }} className="text-emerald-400 text-xs hover:text-emerald-300">+ عمل</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Greetings */}
                    <div className="border border-slate-700 rounded-lg p-4 bg-slate-900/50">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-300">التحيات الموسمية ({season.greetings?.length || 0})</h3>
                        <button
                          onClick={() => updateSeasonMeta(activeSeasonKey, 'greetings', [...(season.greetings || []), ''])}
                          className="flex items-center gap-1 px-2 py-1 bg-emerald-600/20 text-emerald-400 rounded text-xs hover:bg-emerald-600/30"
                        >
                          <Plus size={12} /> إضافة
                        </button>
                      </div>
                      {(season.greetings || []).map((g, gi) => (
                        <div key={gi} className="flex items-center gap-2 mb-2">
                          <input value={g} onChange={e => { const greetings = [...(season.greetings || [])]; greetings[gi] = e.target.value; updateSeasonMeta(activeSeasonKey, 'greetings', greetings); }} className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm text-right" dir="rtl" title="نص التحية" aria-label="نص التحية" />
                          <button onClick={() => updateSeasonMeta(activeSeasonKey, 'greetings', (season.greetings || []).filter((_, idx) => idx !== gi))} className="p-1 hover:bg-red-900/30 rounded" title="حذف التحية">
                            <Trash2 size={14} className="text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── EmptyState component ───────────────────────────────────────────────

function EmptyState({ label, onInit }: { label: string; onInit: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Edit2 size={32} className="text-slate-600 mb-3" />
      <p className="text-slate-400 mb-4">لا يوجد محتوى {label} في قاعدة البيانات بعد</p>
      <button
        onClick={onInit}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white text-sm"
      >
        <Plus size={16} /> إنشاء محتوى فارغ
      </button>
      <p className="text-xs text-slate-500 mt-3">
        يمكنك أيضاً تشغيل سكربت البذر لتحميل المحتوى الحالي من التطبيق
      </p>
    </div>
  );
}
