// admin-panel/src/pages/QuranThemesManager.tsx
// إدارة ثيمات القرآن — إضافة / تعديل / حذف / ترتيب

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Save, Plus, Trash2, Palette, Upload, ChevronUp, ChevronDown,
  X, Image as ImageIcon, GripVertical,
} from 'lucide-react';
import { db, storage } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { convertToPng } from '../utils/imageUpload';
import { Styled } from '../components/Styled';
import TranslateButton from '../components/TranslateButton';

// ─── Types ──────────────────────────────────────────────────
interface QuranTheme {
  primary: string;
  background: string;
  secondary: string;
  highlight: string;
  id?: string;
  name?: Record<string, string>;
  iconUrl?: string;
  iconStoragePath?: string;
  order?: number;
}

type ColorField = 'primary' | 'background' | 'secondary' | 'highlight';

const COLOR_FIELDS: { key: ColorField; label: string }[] = [
  { key: 'primary', label: 'لون النص الرئيسي' },
  { key: 'background', label: 'لون الخلفية' },
  { key: 'secondary', label: 'لون ثانوي' },
  { key: 'highlight', label: 'لون التحديد' },
];

const SUPPORTED_LANGUAGES = [
  { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'en', name: 'English', flag: '🇬🇧', rtl: false },
  { code: 'fr', name: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷', rtl: false },
  { code: 'ur', name: 'اردو', flag: '🇵🇰', rtl: true },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩', rtl: false },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩', rtl: false },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', rtl: false },
  { code: 'es', name: 'Español', flag: '🇪🇸', rtl: false },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', rtl: false },
  { code: 'fa', name: 'فارسی', flag: '🇮🇷', rtl: true },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾', rtl: false },
] as const;

// ─── Defaults ───────────────────────────────────────────────
const DEFAULT_NAMES: Record<string, string>[] = [
  { ar: 'كلاسيكي', en: 'Classic' },
  { ar: 'أخضر طبيعي', en: 'Natural Green' },
  { ar: 'بني كلاسيكي', en: 'Classic Brown' },
  { ar: 'أبيض نقي', en: 'Pure White' },
  { ar: 'أزرق', en: 'Blue' },
  { ar: 'أزرق داكن', en: 'Dark Blue' },
  { ar: 'أزرق غامق', en: 'Deep Blue' },
  { ar: 'رمادي داكن', en: 'Dark Gray' },
  { ar: 'بنفسجي داكن', en: 'Dark Purple' },
  { ar: 'محايد فاتح', en: 'Light Neutral' },
  { ar: 'أسود', en: 'Black' },
  { ar: 'سماوي فاتح', en: 'Light Sky' },
  { ar: 'أخضر فاتح', en: 'Light Green' },
  { ar: 'خوخي', en: 'Peach' },
  { ar: 'نعناعي', en: 'Mint' },
  { ar: 'أصفر فاتح', en: 'Light Yellow' },
  { ar: 'لافندر', en: 'Lavender' },
];

// ⚠️ CRITICAL: These colors MUST match the contrast-tuned QURAN_THEMES in constants/quran-themes.ts
const DEFAULT_THEMES: QuranTheme[] = [
  { primary: '#1A1000', background: '#FFF8F0', secondary: '#6B4E2A', highlight: '#FFC936' }, // 0 — كلاسيك
  { primary: '#1A2410', background: '#FEFAE0', secondary: '#3D4A22', highlight: '#BC6B25' }, // 1 — أخضر طبيعي
  { primary: '#5C3010', background: '#FFFCE7', secondary: '#8A6C00', highlight: '#FFF49D' }, // 2 — بني عتيق
  { primary: '#000000', background: '#FFFFFF', secondary: '#2B2B2B', highlight: '#59D8FF' }, // 3 — أبيض نقي
  { primary: '#1B4F8A', background: '#FFFFFF', secondary: '#004A99', highlight: '#59D8FF' }, // 4 — أزرق
  { primary: '#FFFFFF', background: '#22303C', secondary: '#4EAAFF', highlight: '#78C0FF' }, // 5 — أزرق داكن
  { primary: '#D8CAB5', background: '#213440', secondary: '#C4A840', highlight: '#FFF49D' }, // 6 — أزرق غامق
  { primary: '#FFFFFF', background: '#4A4A4A', secondary: '#FFD090', highlight: '#FFF49D' }, // 7 — رمادي داكن
  { primary: '#FFE0C0', background: '#3A383B', secondary: '#FFC060', highlight: '#FFF49D' }, // 8 — بنفسجي داكن
  { primary: '#000000', background: '#F3F6F4', secondary: '#161514', highlight: '#78C0FF' }, // 9 — محايد فاتح
  { primary: '#FFFFFF', background: '#1A1A1A', secondary: '#E0E0E0', highlight: '#78C0FF' }, // 10 — أسود
  { primary: '#000000', background: '#E7F7FE', secondary: '#0A1418', highlight: '#78C0FF' }, // 11 — سماوي فاتح
  { primary: '#000000', background: '#F4FDD3', secondary: '#1C1D17', highlight: '#78C0FF' }, // 12 — أخضر فاتح
  { primary: '#000000', background: '#FEEED4', secondary: '#2C2010', highlight: '#FFF49D' }, // 13 — خوخي
  { primary: '#000000', background: '#D2F4CF', secondary: '#152214', highlight: '#78C0FF' }, // 14 — نعناعي
  { primary: '#000000', background: '#FEFADF', secondary: '#1C1A0E', highlight: '#78C0FF' }, // 15 — أصفر فاتح
  { primary: '#000000', background: '#EAF0FE', secondary: '#141822', highlight: '#78C0FF' }, // 16 — لافندر
].map((t, i) => ({
  ...t,
  id: `default_${i}`,
  name: DEFAULT_NAMES[i],
  order: i,
}));

function generateId(): string {
  return `theme_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getThemeName(theme: QuranTheme): string {
  return theme.name?.ar || theme.name?.en || `ثيم #${theme.order ?? 0}`;
}

// ─── Component ──────────────────────────────────────────────
const QuranThemesManager: React.FC = () => {
  const [themes, setThemes] = useState<QuranTheme[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [iconUploading, setIconUploading] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);

  // ─── Load ─────────────────────────────────────────────────
  const loadThemes = useCallback(async () => {
    setIsLoading(true);
    try {
      const snap = await getDoc(doc(db, 'appConfig', 'quranThemes'));
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.themes) && data.themes.length > 0) {
          // Ensure every theme has an id & order
          const loaded: QuranTheme[] = data.themes.map((t: QuranTheme, i: number) => ({
            ...t,
            id: t.id || `migrated_${i}`,
            order: t.order ?? i,
          }));
          loaded.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setThemes(loaded);
          setIsLoading(false);
          return;
        }
      }
    } catch { /* fall through to defaults */ }
    setThemes(DEFAULT_THEMES);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadThemes(); }, [loadThemes]);

  // ─── Save ─────────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMsg('');
    try {
      const ordered = themes.map((t, i) => ({ ...t, order: i }));
      await setDoc(doc(db, 'appConfig', 'quranThemes'), {
        themes: ordered,
        updatedAt: new Date().toISOString(),
      });
      setSaveMsg('✅ تم الحفظ');
      setThemes(ordered);
    } catch (e) {
      setSaveMsg(`❌ ${(e as Error).message}`);
    }
    setIsSaving(false);
  };

  // ─── Color editing ────────────────────────────────────────
  const updateColor = (field: ColorField, value: string) => {
    setThemes(prev => prev.map((t, i) => i === selectedIdx ? { ...t, [field]: value } : t));
  };

  // ─── Name editing ─────────────────────────────────────────
  const updateName = (langCode: string, value: string) => {
    setThemes(prev => prev.map((t, i) =>
      i === selectedIdx ? { ...t, name: { ...t.name, [langCode]: value } } : t
    ));
  };

  // ─── Icon upload ──────────────────────────────────────────
  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !themes[selectedIdx]) return;
    setIconUploading(true);
    try {
      const theme = themes[selectedIdx];
      // Delete old icon if exists
      if (theme.iconStoragePath) {
        try { await deleteObject(ref(storage, theme.iconStoragePath)); } catch { /* ok */ }
      }
      const pngBlob = await convertToPng(file);
      const isSvg = file.type === 'image/svg+xml';
      const ext = isSvg ? 'svg' : 'png';
      const storagePath = `theme-icons/${theme.id}.${ext}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, pngBlob, { contentType: isSvg ? 'image/svg+xml' : 'image/png' });
      const iconUrl = await getDownloadURL(storageRef);
      setThemes(prev => prev.map((t, i) =>
        i === selectedIdx ? { ...t, iconUrl, iconStoragePath: storagePath } : t
      ));
    } catch (err) {
      alert(`خطأ في رفع الأيقونة: ${(err as Error).message}`);
    }
    setIconUploading(false);
    if (iconInputRef.current) iconInputRef.current.value = '';
  };

  const removeIcon = async () => {
    const theme = themes[selectedIdx];
    if (!theme) return;
    if (theme.iconStoragePath) {
      try { await deleteObject(ref(storage, theme.iconStoragePath)); } catch { /* ok */ }
    }
    setThemes(prev => prev.map((t, i) =>
      i === selectedIdx ? { ...t, iconUrl: undefined, iconStoragePath: undefined } : t
    ));
  };

  // ─── Add theme ────────────────────────────────────────────
  const addTheme = (newTheme: QuranTheme) => {
    const withOrder = { ...newTheme, order: themes.length };
    setThemes(prev => [...prev, withOrder]);
    setSelectedIdx(themes.length);
    setShowAddModal(false);
  };

  // ─── Delete theme ─────────────────────────────────────────
  const deleteTheme = async () => {
    if (themes.length <= 1) return;
    const theme = themes[selectedIdx];
    // Clean up Storage
    if (theme.iconStoragePath) {
      try { await deleteObject(ref(storage, theme.iconStoragePath)); } catch { /* ok */ }
    }
    setThemes(prev => prev.filter((_, i) => i !== selectedIdx));
    setSelectedIdx(prev => Math.min(prev, themes.length - 2));
    setShowDeleteConfirm(false);
  };

  // ─── Reorder ──────────────────────────────────────────────
  const moveTheme = (dir: -1 | 1) => {
    const newIdx = selectedIdx + dir;
    if (newIdx < 0 || newIdx >= themes.length) return;
    setThemes(prev => {
      const arr = [...prev];
      [arr[selectedIdx], arr[newIdx]] = [arr[newIdx], arr[selectedIdx]];
      return arr;
    });
    setSelectedIdx(newIdx);
  };

  const selected = themes[selectedIdx];

  return (
    <div className="space-y-6">
      {/* ─── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">ثيمات القرآن</h1>
          <p className="text-slate-400 mt-1">إضافة وتعديل وحذف وترتيب ثيمات قراءة القرآن ({themes.length} ثيم)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            <Plus size={16} /> إضافة ثيم
          </button>
          <button onClick={handleSave} disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-accent-dark text-white rounded-xl hover:bg-accent-dark disabled:bg-admin-surface-light">
            <Save size={16} /> {isSaving ? 'حفظ...' : 'حفظ الكل'}
          </button>
        </div>
      </div>
      {saveMsg && <p className={`text-sm ${saveMsg.startsWith('✅') ? 'text-accent-light' : 'text-red-400'}`}>{saveMsg}</p>}

      {isLoading ? (
        <div className="text-center text-slate-400 py-12">جاري التحميل...</div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* ─── Theme List (left sidebar) ──────────────── */}
          <div className="col-span-4 space-y-2 max-h-[75vh] overflow-y-auto pr-1">
            {themes.map((t, i) => (
              <button
                key={t.id || i}
                onClick={() => setSelectedIdx(i)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-right ${
                  i === selectedIdx
                    ? 'bg-accent-dark/20 border border-accent'
                    : 'bg-admin-surface/50 border border-admin-border/50 hover:bg-admin-surface-light/50'
                }`}
              >
                <GripVertical size={14} className="text-slate-600 shrink-0" />
                {/* Color dots */}
                <div className="flex gap-1 shrink-0">
                  {(['background', 'primary', 'secondary', 'highlight'] as const).map(k => (
                    <Styled key={k} className="w-4 h-4 rounded-full border border-admin-border"
                      css={{ backgroundColor: t[k] }} />
                  ))}
                </div>
                {/* Icon thumbnail */}
                {t.iconUrl && (
                  <img src={t.iconUrl} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
                )}
                <span className="text-white text-sm flex-1 truncate">{getThemeName(t)}</span>
                <span className="text-slate-500 text-xs shrink-0">#{i}</span>
              </button>
            ))}
          </div>

          {/* ─── Editor + Preview (right panel) ─────────── */}
          {selected && (
            <div className="col-span-8 space-y-6">
              {/* Action bar */}
              <div className="flex items-center gap-2 justify-end">
                <button onClick={() => moveTheme(-1)} disabled={selectedIdx === 0}
                  className="p-2 bg-admin-surface-light text-slate-300 rounded-lg hover:bg-admin-surface-light disabled:opacity-30"
                  aria-label="تحريك لأعلى" title="تحريك لأعلى">
                  <ChevronUp size={16} />
                </button>
                <button onClick={() => moveTheme(1)} disabled={selectedIdx === themes.length - 1}
                  className="p-2 bg-admin-surface-light text-slate-300 rounded-lg hover:bg-admin-surface-light disabled:opacity-30"
                  aria-label="تحريك لأسفل" title="تحريك لأسفل">
                  <ChevronDown size={16} />
                </button>
                <button onClick={() => setShowDeleteConfirm(true)} disabled={themes.length <= 1}
                  className="flex items-center gap-2 px-3 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 disabled:opacity-30"
                  aria-label="حذف الثيم" title="حذف الثيم">
                  <Trash2 size={16} /> حذف
                </button>
              </div>

              {/* Live Preview */}
              <Styled className="rounded-xl overflow-hidden border border-admin-border"
                css={{ backgroundColor: selected.background }}>
                <div className="p-6 text-center space-y-3">
                  <Styled as="p" css={{ color: selected.primary, fontSize: 24, fontFamily: 'serif' }}>
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </Styled>
                  <Styled as="p" css={{ color: selected.secondary, fontSize: 14 }}>
                    ﴿ ١ ﴾ الفاتحة
                  </Styled>
                  <Styled className="inline-block px-4 py-1 rounded-full"
                    css={{ backgroundColor: selected.highlight + '33' }}>
                    <Styled as="span" css={{ color: selected.highlight, fontSize: 12 }}>محدد</Styled>
                  </Styled>
                </div>
              </Styled>

              {/* Color Editors */}
              <div className="grid grid-cols-2 gap-4">
                {COLOR_FIELDS.map(({ key, label }) => (
                  <div key={key} className="bg-admin-surface/50 p-4 rounded-xl border border-admin-border/50">
                    <label className="text-slate-300 text-sm block mb-2">{label}</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={selected[key]}
                        onChange={e => updateColor(key, e.target.value)}
                        aria-label={label}
                        className="w-10 h-10 rounded cursor-pointer" />
                      <input type="text" value={selected[key]}
                        onChange={e => updateColor(key, e.target.value)}
                        aria-label={`${label} (hex)`}
                        placeholder="#000000"
                        className="flex-1 bg-admin-surface text-white rounded-lg px-3 py-2 border border-admin-border font-mono text-sm" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Icon Upload */}
              <div className="bg-admin-surface/50 p-4 rounded-xl border border-admin-border/50">
                <label className="text-slate-300 text-sm block mb-3">
                  <ImageIcon size={14} className="inline mr-1" /> أيقونة الثيم
                </label>
                <div className="flex items-center gap-4">
                  {selected.iconUrl ? (
                    <div className="relative">
                      <img src={selected.iconUrl} alt="" className="w-16 h-16 rounded-lg object-cover border border-admin-border" />
                      <button onClick={removeIcon}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-0.5"
                        aria-label="إزالة الأيقونة" title="إزالة الأيقونة">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-admin-border flex items-center justify-center text-slate-500">
                      <ImageIcon size={20} />
                    </div>
                  )}
                  <button onClick={() => iconInputRef.current?.click()} disabled={iconUploading}
                    className="flex items-center gap-2 px-4 py-2 bg-admin-surface-light text-slate-300 rounded-lg hover:bg-admin-surface-light disabled:opacity-50">
                    <Upload size={14} /> {iconUploading ? 'جاري الرفع...' : 'رفع أيقونة'}
                  </button>
                  <input ref={iconInputRef} type="file" accept="image/*"
                    onChange={handleIconUpload} className="hidden"
                    aria-label="رفع أيقونة الثيم" />
                </div>
              </div>

              {/* Multilingual Names */}
              <div className="bg-admin-surface/50 p-4 rounded-xl border border-admin-border/50">
                <label className="text-slate-300 text-sm block mb-2">
                  <Palette size={14} className="inline mr-1" /> أسماء الثيم
                </label>
                <div className="mb-3">
                  <TranslateButton
                    sourceText={selected.name?.ar || selected.name?.en || ''}
                    sourceLang={selected.name?.ar ? 'ar' : 'en'}
                    contentType="ui"
                    compact
                    onTranslated={(translations) => {
                      Object.entries(translations).forEach(([code, text]) => {
                        updateName(code, text);
                      });
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <div key={lang.code} className="flex items-center gap-2">
                      <span className="text-lg shrink-0">{lang.flag}</span>
                      <input
                        type="text"
                        value={selected.name?.[lang.code] || ''}
                        onChange={e => updateName(lang.code, e.target.value)}
                        placeholder={lang.name}
                        aria-label={`اسم الثيم بـ${lang.name}`}
                        dir={lang.rtl ? 'rtl' : 'ltr'}
                        className="flex-1 bg-admin-surface text-white rounded-lg px-3 py-1.5 border border-admin-border text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Add Theme Modal ───────────────────────────────── */}
      {showAddModal && <AddThemeModal onAdd={addTheme} onClose={() => setShowAddModal(false)} />}

      {/* ─── Delete Confirm ────────────────────────────────── */}
      {showDeleteConfirm && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-admin-surface rounded-2xl p-6 max-w-md w-full mx-4 space-y-4"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white">حذف الثيم</h2>
            <p className="text-slate-300">
              هل تريد حذف ثيم "{getThemeName(selected)}"؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <p className="text-amber-400 text-sm">
              ⚠️ المستخدمون الذين يستخدمون هذا الثيم سيتم تلقائياً إعادتهم للثيم الأول.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-admin-surface-light text-slate-300 rounded-xl hover:bg-admin-surface-light">
                إلغاء
              </button>
              <button onClick={deleteTheme}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700">
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Add Theme Modal ────────────────────────────────────────
function AddThemeModal({ onAdd, onClose }: { onAdd: (t: QuranTheme) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<QuranTheme>({
    primary: '#2C1810',
    background: '#F5E6D3',
    secondary: '#8B7355',
    highlight: '#D4AF37',
    id: generateId(),
    name: { ar: '', en: '' },
  });

  const setColor = (key: ColorField, val: string) => setDraft(d => ({ ...d, [key]: val }));
  const setName = (lang: string, val: string) => setDraft(d => ({ ...d, name: { ...d.name, [lang]: val } }));

  const canSubmit = draft.name?.ar?.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-admin-surface rounded-2xl p-6 max-w-2xl w-full mx-4 space-y-5 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">إضافة ثيم جديد</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="إغلاق" title="إغلاق"><X size={20} /></button>
        </div>

        {/* Preview */}
        <Styled className="rounded-xl overflow-hidden border border-admin-border"
          css={{ backgroundColor: draft.background }}>
          <div className="p-4 text-center space-y-2">
            <Styled as="p" css={{ color: draft.primary, fontSize: 20, fontFamily: 'serif' }}>
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </Styled>
            <Styled as="p" css={{ color: draft.secondary, fontSize: 12 }}>﴿ ١ ﴾ الفاتحة</Styled>
            <Styled className="inline-block px-3 py-0.5 rounded-full"
              css={{ backgroundColor: draft.highlight + '33' }}>
              <Styled as="span" css={{ color: draft.highlight, fontSize: 11 }}>محدد</Styled>
            </Styled>
          </div>
        </Styled>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-3">
          {COLOR_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label className="text-slate-400 text-xs mb-1 block">{label}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={draft[key]} onChange={e => setColor(key, e.target.value)}
                  aria-label={label}
                  className="w-8 h-8 rounded cursor-pointer" />
                <input type="text" value={draft[key]} onChange={e => setColor(key, e.target.value)}
                  aria-label={`${label} (hex)`}
                  placeholder="#000000"
                  className="flex-1 bg-admin-bg text-white rounded-lg px-2 py-1.5 border border-admin-border font-mono text-xs" />
              </div>
            </div>
          ))}
        </div>

        {/* Names */}
        <div>
          <label className="text-slate-300 text-sm block mb-2">الأسماء</label>
          <div className="grid grid-cols-2 gap-2">
            {SUPPORTED_LANGUAGES.slice(0, 4).map(lang => (
              <div key={lang.code} className="flex items-center gap-2">
                <span className="text-sm">{lang.flag}</span>
                <input type="text" value={draft.name?.[lang.code] || ''}
                  onChange={e => setName(lang.code, e.target.value)}
                  placeholder={lang.name} dir={lang.rtl ? 'rtl' : 'ltr'}
                  aria-label={`اسم الثيم بـ${lang.name}`}
                  className="flex-1 bg-admin-bg text-white rounded-lg px-2 py-1.5 border border-admin-border text-sm" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-admin-surface-light text-slate-300 rounded-xl hover:bg-admin-surface-light">
            إلغاء
          </button>
          <button onClick={() => onAdd(draft)} disabled={!canSubmit}
            className="px-6 py-2 bg-accent-dark text-white rounded-xl hover:bg-accent-dark disabled:bg-admin-surface-light disabled:cursor-not-allowed">
            إضافة
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuranThemesManager;
