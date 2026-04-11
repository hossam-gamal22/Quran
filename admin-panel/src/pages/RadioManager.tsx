// admin-panel/src/pages/RadioManager.tsx
// إدارة محطات الراديو الإسلامي

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Save, Trash2, Edit2, X, Radio, Play, Pause, Search, Copy, Eye, EyeOff } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';

// ==================== Types ====================
interface AdminRadioStation {
  id: string;
  name: string;
  nameEn?: string;
  streamUrl: string;
  category: RadioCategory;
  country?: string;
  language?: string;
  imageUrl?: string;
  description?: string;
  isActive: boolean;
  isFeatured: boolean;
  order: number;
  addedAt: string;
  updatedAt: string;
}

type RadioCategory =
  | 'quran'
  | 'reciter'
  | 'translation'
  | 'tafsir'
  | 'islamic'
  | 'adhkar'
  | 'seerah'
  | 'hadith'
  | 'ruqyah'
  | 'kids'
  | 'other';

interface RadioConfig {
  enabled: boolean;
  maxStationsPerSource: number;
  cacheTTLMinutes: number;
  featuredStationIds: string[];
  hiddenStationIds: string[];
  defaultCategory: RadioCategory;
  showRadioBrowser: boolean;
  showMp3Quran: boolean;
  updatedAt: string;
  updatedBy: string;
}

// ==================== Constants ====================
const CATEGORIES: { value: RadioCategory; label: string; icon: string }[] = [
  { value: 'quran', label: 'تلاوة القرآن', icon: '📖' },
  { value: 'reciter', label: 'قارئ محدد', icon: '🎙️' },
  { value: 'translation', label: 'ترجمة القرآن', icon: '🌍' },
  { value: 'tafsir', label: 'تفسير القرآن', icon: '📜' },
  { value: 'islamic', label: 'محتوى إسلامي عام', icon: '🕌' },
  { value: 'adhkar', label: 'أدعية وأذكار', icon: '🤲' },
  { value: 'seerah', label: 'سيرة نبوية', icon: '📕' },
  { value: 'hadith', label: 'حديث شريف', icon: '📗' },
  { value: 'ruqyah', label: 'رقية شرعية', icon: '🛡️' },
  { value: 'kids', label: 'إسلامي للأطفال', icon: '👶' },
  { value: 'other', label: 'أخرى', icon: '🎶' },
];

const FIRESTORE_COLLECTION = 'admin_radio_stations';
const FIRESTORE_CONFIG_DOC = 'appConfig/radioConfig';

const EMPTY_STATION: Omit<AdminRadioStation, 'id'> = {
  name: '',
  nameEn: '',
  streamUrl: '',
  category: 'quran',
  country: '',
  language: 'ar',
  imageUrl: '',
  description: '',
  isActive: true,
  isFeatured: false,
  order: 0,
  addedAt: '',
  updatedAt: '',
};

const DEFAULT_CONFIG: RadioConfig = {
  enabled: true,
  maxStationsPerSource: 50,
  cacheTTLMinutes: 60,
  featuredStationIds: [],
  hiddenStationIds: [],
  defaultCategory: 'quran',
  showRadioBrowser: true,
  showMp3Quran: true,
  updatedAt: '',
  updatedBy: '',
};

// ==================== Component ====================
const RadioManager: React.FC = () => {
  const [stations, setStations] = useState<AdminRadioStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingStation, setEditingStation] = useState<AdminRadioStation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<RadioCategory | ''>('');
  const [config, setConfig] = useState<RadioConfig>(DEFAULT_CONFIG);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // ==================== Data Loading ====================
  const fetchStations = async (): Promise<AdminRadioStation[]> => {
    const snap = await getDocs(collection(db, FIRESTORE_COLLECTION));
    const items = snap.docs.map(d => ({ ...d.data(), id: d.id } as AdminRadioStation));
    items.sort((a, b) => (a.order || 0) - (b.order || 0));
    return items;
  };

  const fetchConfig = async (): Promise<RadioConfig> => {
    const snap = await getDoc(doc(db, FIRESTORE_CONFIG_DOC));
    if (snap.exists()) return { ...DEFAULT_CONFIG, ...snap.data() };
    return DEFAULT_CONFIG;
  };

  const loadStations = async () => {
    setIsLoading(true);
    try {
      const items = await fetchStations();
      setStations(items);
    } catch (e) {
      console.error('Failed to load stations:', e);
    }
    setIsLoading(false);
  };

  const loadConfig = async () => {
    try {
      const cfg = await fetchConfig();
      setConfig(cfg);
    } catch { /* use defaults */ }
  };

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      try {
        const [stationsData, configData] = await Promise.all([
          fetchStations().catch(() => [] as AdminRadioStation[]),
          fetchConfig().catch(() => DEFAULT_CONFIG),
        ]);
        setStations(stationsData);
        setConfig(configData);
      } catch (e) {
        console.error('Failed to initialize:', e);
      }
      setIsLoading(false);
    };
    void initialize();
  }, []);

  // ==================== CRUD ====================
  const handleSave = async (station: AdminRadioStation) => {
    try {
      const now = new Date().toISOString();
      const id = station.id || `radio_${Date.now()}`;
      const data: AdminRadioStation = {
        ...station,
        id,
        addedAt: station.addedAt || now,
        updatedAt: now,
      };
      await setDoc(doc(db, FIRESTORE_COLLECTION, id), data);
      setSaveMsg('✅ تم حفظ المحطة');
      setIsModalOpen(false);
      setEditingStation(null);
      loadStations();
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e) {
      setSaveMsg(`❌ ${(e as Error).message}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, FIRESTORE_COLLECTION, id));
      setDeleteConfirmId(null);
      loadStations();
    } catch { /* empty */ }
  };

  const handleToggleActive = async (station: AdminRadioStation) => {
    await handleSave({ ...station, isActive: !station.isActive });
  };

  const handleToggleFeatured = async (station: AdminRadioStation) => {
    await handleSave({ ...station, isFeatured: !station.isFeatured });
  };

  const handleSaveConfig = async () => {
    try {
      await setDoc(doc(db, FIRESTORE_CONFIG_DOC), {
        ...config,
        updatedAt: new Date().toISOString(),
      });
      setSaveMsg('✅ تم حفظ الإعدادات');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e) {
      setSaveMsg(`❌ ${(e as Error).message}`);
    }
  };

  // ==================== Audio Preview ====================
  const togglePreview = (url: string) => {
    if (previewUrl === url && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setPreviewUrl(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audio.volume = 0.5;
      audio.play().catch(() => setSaveMsg('❌ تعذر تشغيل البث'));
      audio.onended = () => { setIsPlaying(false); setPreviewUrl(null); };
      audio.onerror = () => { setIsPlaying(false); setPreviewUrl(null); setSaveMsg('❌ خطأ في البث'); };
      audioRef.current = audio;
      setIsPlaying(true);
      setPreviewUrl(url);
    }
  };

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  // ==================== Helpers ====================
  const openEdit = (station?: AdminRadioStation) => {
    setEditingStation(station || { ...EMPTY_STATION, id: `radio_${Date.now()}`, order: stations.length } as AdminRadioStation);
    setIsModalOpen(true);
  };

  const getCategoryLabel = (cat: RadioCategory) => {
    const found = CATEGORIES.find(c => c.value === cat);
    return found ? `${found.icon} ${found.label}` : cat;
  };

  const filtered = stations.filter(s => {
    const matchesSearch = !searchQuery ||
      s.name.includes(searchQuery) ||
      (s.nameEn?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.streamUrl.includes(searchQuery);
    const matchesCat = !filterCategory || s.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  const activeCount = stations.filter(s => s.isActive).length;
  const featuredCount = stations.filter(s => s.isFeatured).length;

  // ==================== Render ====================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Radio className="text-accent-light" size={28} />
            إدارة محطات الراديو
          </h1>
          <p className="text-slate-400 mt-1">
            {stations.length} محطة • {activeCount} نشطة • {featuredCount} مميزة
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsConfigOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-admin-surface-light text-slate-300 rounded-xl hover:bg-slate-600 transition-colors">
            ⚙️ الإعدادات
          </button>
          <button onClick={() => openEdit()} className="flex items-center gap-2 px-4 py-2 bg-accent-dark text-white rounded-xl hover:bg-emerald-700 transition-colors">
            <Plus size={18} /> إضافة محطة
          </button>
        </div>
      </div>

      {saveMsg && <p className={`text-sm ${saveMsg.startsWith('✅') ? 'text-accent-light' : 'text-red-400'}`}>{saveMsg}</p>}

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full bg-admin-surface text-white rounded-xl pr-10 pl-4 py-2.5 border border-admin-border placeholder:text-slate-500"
            dir="rtl"
            placeholder="بحث بالاسم أو الرابط..."
            aria-label="بحث في المحطات"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="bg-admin-surface text-white rounded-xl px-4 py-2.5 border border-admin-border"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value as RadioCategory | '')}
          title="فلتر الفئات"
          aria-label="فلتر الفئات"
        >
          <option value="">كل الفئات</option>
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
          ))}
        </select>
      </div>

      {/* Station List */}
      {isLoading ? (
        <div className="text-center text-slate-400 py-12">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-slate-400 py-12">
          <Radio size={48} className="mx-auto mb-3 opacity-30" />
          <p>{searchQuery || filterCategory ? 'لا توجد نتائج' : 'لا توجد محطات بعد'}</p>
          <p className="text-sm mt-1">أضف محطات يدوياً أو فعّل المصادر الخارجية</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(station => (
            <div
              key={station.id}
              className={`bg-admin-surface/50 rounded-xl p-4 border transition-all ${
                station.isActive ? 'border-admin-border/50' : 'border-red-900/30 opacity-60'
              } ${station.isFeatured ? 'ring-1 ring-emerald-500/30' : ''}`}
            >
              <div className="flex items-center gap-4">
                {/* Preview button */}
                <button
                  onClick={() => togglePreview(station.streamUrl)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    previewUrl === station.streamUrl && isPlaying
                      ? 'bg-accent-dark text-white animate-pulse'
                      : 'bg-admin-surface-light text-slate-300 hover:bg-accent-dark hover:text-white'
                  }`}
                  title="معاينة البث"
                  aria-label={previewUrl === station.streamUrl && isPlaying ? 'إيقاف معاينة البث' : 'معاينة البث'}
                >
                  {previewUrl === station.streamUrl && isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>

                {/* Station info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-bold text-lg truncate" dir="rtl">{station.name}</p>
                    {station.isFeatured && <span className="text-xs bg-accent-dark/20 text-accent-light px-2 py-0.5 rounded-full">مميزة</span>}
                    {!station.isActive && <span className="text-xs bg-red-600/20 text-red-400 px-2 py-0.5 rounded-full">معطلة</span>}
                  </div>
                  {station.nameEn && <p className="text-slate-400 text-sm">{station.nameEn}</p>}
                  <div className="flex gap-3 mt-1 text-slate-500 text-xs">
                    <span>{getCategoryLabel(station.category)}</span>
                    {station.country && <span>🌍 {station.country}</span>}
                    {station.language && <span>🗣️ {station.language}</span>}
                  </div>
                  <p className="text-slate-600 text-xs mt-1 truncate ltr" dir="ltr">{station.streamUrl}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button onClick={() => handleToggleActive(station)} className={`p-2 rounded-lg ${station.isActive ? 'text-accent-light hover:bg-emerald-900/30' : 'text-red-400 hover:bg-red-900/30'}`} title={station.isActive ? 'تعطيل' : 'تفعيل'} aria-label={station.isActive ? 'تعطيل المحطة' : 'تفعيل المحطة'}>
                    {station.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button onClick={() => handleToggleFeatured(station)} className={`p-2 rounded-lg ${station.isFeatured ? 'text-yellow-400 hover:bg-yellow-900/30' : 'text-slate-400 hover:bg-admin-surface-light'}`} title={station.isFeatured ? 'إزالة من المميزة' : 'تمييز'} aria-label={station.isFeatured ? 'إزالة من المميزة' : 'تمييز المحطة'}>
                    ⭐
                  </button>
                  <button onClick={() => openEdit(station)} className="p-2 hover:bg-admin-surface-light rounded-lg text-slate-400 hover:text-white transition-colors" title="تعديل" aria-label="تعديل المحطة"><Edit2 size={16} /></button>
                  <button onClick={() => openEdit({ ...station, id: `radio_${Date.now()}`, name: station.name + ' (نسخة)', order: stations.length })} className="p-2 hover:bg-emerald-900/40 rounded-lg text-accent-light transition-colors" title="تكرار" aria-label="تكرار المحطة"><Copy size={16} /></button>
                  {deleteConfirmId === station.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(station.id)} className="px-2 py-1 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 transition-colors">تأكيد الحذف</button>
                      <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 bg-admin-surface-light text-slate-300 rounded-lg text-xs hover:bg-slate-600 transition-colors">إلغاء</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirmId(station.id)} className="p-2 hover:bg-red-900/50 rounded-lg text-red-400 transition-colors" title="حذف" aria-label="حذف المحطة"><Trash2 size={16} /></button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && editingStation && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-admin-bg rounded-2xl border border-admin-border w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <Radio size={20} className="text-accent-light" />
                {editingStation.addedAt ? 'تعديل المحطة' : 'إضافة محطة جديدة'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white" title="إغلاق" aria-label="إغلاق"><X size={20} /></button>
            </div>

            <div className="space-y-3">
              {/* Name fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-1">الاسم بالعربية *</label>
                  <input className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" dir="rtl" value={editingStation.name} onChange={e => setEditingStation({ ...editingStation, name: e.target.value })} placeholder="إذاعة القرآن الكريم" aria-label="الاسم بالعربية" />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">الاسم بالإنجليزية</label>
                  <input className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" value={editingStation.nameEn || ''} onChange={e => setEditingStation({ ...editingStation, nameEn: e.target.value })} placeholder="Quran Radio" aria-label="الاسم بالإنجليزية" />
                </div>
              </div>

              {/* Stream URL with preview */}
              <div>
                <label className="text-slate-300 text-sm block mb-1">رابط البث المباشر *</label>
                <div className="flex gap-2">
                  <input className="flex-1 bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border font-mono text-sm" dir="ltr" value={editingStation.streamUrl} onChange={e => setEditingStation({ ...editingStation, streamUrl: e.target.value })} placeholder="https://stream.example.com/live" aria-label="رابط البث المباشر" />
                  {editingStation.streamUrl && (
                    <button
                      onClick={() => togglePreview(editingStation.streamUrl)}
                      className={`px-3 py-2 rounded-lg flex items-center gap-1 text-sm ${
                        previewUrl === editingStation.streamUrl && isPlaying
                          ? 'bg-red-600 text-white'
                          : 'bg-accent-dark text-white hover:bg-accent-dark'
                      }`}
                    >
                      {previewUrl === editingStation.streamUrl && isPlaying ? <><Pause size={14} /> إيقاف</> : <><Play size={14} /> تشغيل</>}
                    </button>
                  )}
                </div>
              </div>

              {/* Category & Country */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-1">الفئة *</label>
                  <select className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" value={editingStation.category} onChange={e => setEditingStation({ ...editingStation, category: e.target.value as RadioCategory })} title="الفئة" aria-label="الفئة">
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">البلد</label>
                  <input className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" dir="rtl" value={editingStation.country || ''} onChange={e => setEditingStation({ ...editingStation, country: e.target.value })} placeholder="السعودية" aria-label="البلد" />
                </div>
              </div>

              {/* Language & Image */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-1">اللغة</label>
                  <input className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" value={editingStation.language || ''} onChange={e => setEditingStation({ ...editingStation, language: e.target.value })} placeholder="ar" aria-label="اللغة" />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">رابط الصورة</label>
                  <input className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border font-mono text-sm" dir="ltr" value={editingStation.imageUrl || ''} onChange={e => setEditingStation({ ...editingStation, imageUrl: e.target.value })} placeholder="https://..." aria-label="رابط الصورة" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-slate-300 text-sm block mb-1">الوصف</label>
                <textarea className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" rows={2} dir="rtl" value={editingStation.description || ''} onChange={e => setEditingStation({ ...editingStation, description: e.target.value })} placeholder="وصف مختصر للمحطة" aria-label="الوصف" />
              </div>

              {/* Toggles */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={editingStation.isActive} onChange={e => setEditingStation({ ...editingStation, isActive: e.target.checked })} className="w-4 h-4 accent-emerald-500" />
                  نشطة (ظاهرة في التطبيق)
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={editingStation.isFeatured} onChange={e => setEditingStation({ ...editingStation, isFeatured: e.target.checked })} className="w-4 h-4 accent-yellow-500" />
                  ⭐ مميزة
                </label>
              </div>

              {/* Order */}
              <div>
                <label className="text-slate-300 text-sm block mb-1">الترتيب</label>
                <input type="number" min={0} className="w-32 bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" value={editingStation.order} onChange={e => setEditingStation({ ...editingStation, order: Number(e.target.value) })} placeholder="0" title="الترتيب" aria-label="الترتيب" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleSave(editingStation)}
                disabled={!editingStation.name || !editingStation.streamUrl}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-dark text-white rounded-xl hover:bg-accent-dark disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save size={16} /> حفظ المحطة
              </button>
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 bg-admin-surface-light text-slate-300 rounded-xl hover:bg-admin-surface-light">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setIsConfigOpen(false)}>
          <div className="bg-admin-bg rounded-2xl border border-admin-border w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">⚙️ إعدادات الراديو</h2>
              <button onClick={() => setIsConfigOpen(false)} className="text-slate-400 hover:text-white" title="إغلاق" aria-label="إغلاق"><X size={20} /></button>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input type="checkbox" checked={config.enabled} onChange={e => setConfig({ ...config, enabled: e.target.checked })} className="w-4 h-4 accent-emerald-500" />
                تفعيل ميزة الراديو
              </label>
              <div>
                <label className="text-slate-300 text-sm block mb-1">مدة التخزين المؤقت (بالدقائق)</label>
                <input type="number" min={5} max={1440} className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" value={config.cacheTTLMinutes} onChange={e => setConfig({ ...config, cacheTTLMinutes: Number(e.target.value) })} placeholder="60" title="مدة التخزين المؤقت" aria-label="مدة التخزين المؤقت" />
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">أقصى عدد محطات لكل مصدر</label>
                <input type="number" min={1} max={200} className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" value={config.maxStationsPerSource} onChange={e => setConfig({ ...config, maxStationsPerSource: Number(e.target.value) })} placeholder="50" title="أقصى عدد محطات لكل مصدر" aria-label="أقصى عدد محطات لكل مصدر" />
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">الفئة الافتراضية</label>
                <select className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" value={config.defaultCategory} onChange={e => setConfig({ ...config, defaultCategory: e.target.value as RadioCategory })} title="الفئة الافتراضية" aria-label="الفئة الافتراضية">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input type="checkbox" checked={config.showMp3Quran} onChange={e => setConfig({ ...config, showMp3Quran: e.target.checked })} className="w-4 h-4 accent-emerald-500" />
                عرض محطات MP3Quran
              </label>
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input type="checkbox" checked={config.showRadioBrowser} onChange={e => setConfig({ ...config, showRadioBrowser: e.target.checked })} className="w-4 h-4 accent-emerald-500" />
                عرض محطات RadioBrowser
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handleSaveConfig} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-dark text-white rounded-xl hover:bg-accent-dark">
                <Save size={16} /> حفظ الإعدادات
              </button>
              <button onClick={() => setIsConfigOpen(false)} className="px-4 py-2.5 bg-admin-surface-light text-slate-300 rounded-xl hover:bg-admin-surface-light">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RadioManager;
