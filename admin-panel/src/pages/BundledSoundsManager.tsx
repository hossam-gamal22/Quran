// admin-panel/src/pages/BundledSoundsManager.tsx
// إدارة الأصوات المدمجة في التطبيق - روح المسلم

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Trash2,
  Music,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Package,
  Plus,
  Eye,
  EyeOff,
  Info,
  Terminal,
  Smartphone,
} from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, addDoc } from 'firebase/firestore';

// ==================== Types ====================

interface BundledSound {
  id: string;
  displayName: string;
  category: 'notification' | 'adhan';
  assetPath: string;
  enabled: boolean;
  description?: string;
  order: number;
}

interface UploadedSound {
  id: string;
  fileName: string;
  displayName: string;
  category: 'notification' | 'adhan';
  downloadUrl: string;
  storagePath: string;
  fileSize: number;
  uploadedAt: string;
  status: 'pending' | 'bundled' | 'disabled';
  bundledSoundId?: string;
}

interface SoundConfig {
  bundledSounds: BundledSound[];
  updatedAt: string;
  version: number;
}

// ==================== Constants ====================

const DEFAULT_BUNDLED_SOUNDS: BundledSound[] = [
  // إشعارات
  { id: 'salawat', displayName: 'صلاة على النبي', category: 'notification', assetPath: './assets/sounds/salawat.mp3', enabled: true, order: 2 },
  { id: 'istighfar', displayName: 'استغفار', category: 'notification', assetPath: './assets/sounds/istighfar.mp3', enabled: true, order: 3 },
  { id: 'tasbih', displayName: 'تسبيح', category: 'notification', assetPath: './assets/sounds/tasbih.mp3', enabled: true, order: 4 },
  { id: 'subhanallah', displayName: 'سبحان الله', category: 'notification', assetPath: './assets/sounds/subhanallah.mp3', enabled: true, order: 5 },
  { id: 'alhamdulillah', displayName: 'الحمد لله', category: 'notification', assetPath: './assets/sounds/alhamdulillah.mp3', enabled: true, order: 6 },
  { id: 'morning_adhkar', displayName: 'أذكار الصباح', category: 'notification', assetPath: './assets/sounds/morning_adhkar.mp3', enabled: true, order: 7 },
  { id: 'evening_adhkar', displayName: 'أذكار المساء', category: 'notification', assetPath: './assets/sounds/evening_adhkar.mp3', enabled: true, order: 8 },
  { id: 'notif_after_prayer', displayName: 'بعد الصلاة', category: 'notification', assetPath: './assets/sounds/notif_after_prayer.mp3', enabled: true, order: 9 },
  { id: 'complete', displayName: 'complete', category: 'notification', assetPath: './assets/sounds/notif_daily_summary.mp3', enabled: true, order: 10 },
  { id: 'notif_kahf', displayName: 'تذكير سورة الكهف', category: 'notification', assetPath: './assets/sounds/notif_kahf.mp3', enabled: true, order: 11 },
  { id: 'notif_khatma', displayName: 'تذكير الختمة', category: 'notification', assetPath: './assets/sounds/notif_khatma.mp3', enabled: true, order: 12 },
  { id: 'notif_sleep', displayName: 'أذكار النوم', category: 'notification', assetPath: './assets/sounds/notif_sleep.mp3', enabled: true, order: 13 },
  { id: 'notif_verse', displayName: 'آية يومية', category: 'notification', assetPath: './assets/sounds/notif_verse.mp3', enabled: true, order: 14 },
  { id: 'notif_wakeup', displayName: 'أذكار الاستيقاظ', category: 'notification', assetPath: './assets/sounds/notif_wakeup.mp3', enabled: true, order: 15 },
  // أذان
  { id: 'makkah', displayName: 'أذان مكة المكرمة', category: 'adhan', assetPath: './assets/sounds/makkah.mp3', enabled: true, order: 100 },
  { id: 'madinah', displayName: 'أذان المدينة المنورة', category: 'adhan', assetPath: './assets/sounds/madinah.mp3', enabled: true, order: 101 },
  { id: 'alaqsa', displayName: 'أذان المسجد الأقصى', category: 'adhan', assetPath: './assets/sounds/alaqsa.mp3', enabled: true, order: 102 },
  { id: 'mishary', displayName: 'مشاري العفاسي', category: 'adhan', assetPath: './assets/sounds/mishary.mp3', enabled: true, order: 103 },
  { id: 'abdulbasit', displayName: 'عبد الباسط عبد الصمد', category: 'adhan', assetPath: './assets/sounds/abdulbasit.mp3', enabled: true, order: 104 },
  { id: 'sudais', displayName: 'عبد الرحمن السديس', category: 'adhan', assetPath: './assets/sounds/sudais.mp3', enabled: true, order: 105 },
  { id: 'egypt', displayName: 'أذان مصر', category: 'adhan', assetPath: './assets/sounds/egypt.mp3', enabled: true, order: 106 },
  { id: 'dosari', displayName: 'ياسر الدوسري', category: 'adhan', assetPath: './assets/sounds/dosari.mp3', enabled: true, order: 107 },
  { id: 'ajman', displayName: 'أذان عجمان', category: 'adhan', assetPath: './assets/sounds/ajman.mp3', enabled: true, order: 108 },
  { id: 'ali_mulla', displayName: 'علي الملا', category: 'adhan', assetPath: './assets/sounds/ali_mulla.mp3', enabled: true, order: 109 },
  { id: 'naqshbandi', displayName: 'النقشبندي', category: 'adhan', assetPath: './assets/sounds/naqshbandi.mp3', enabled: true, order: 110 },
  { id: 'sharif', displayName: 'محمد شريف', category: 'adhan', assetPath: './assets/sounds/sharif.mp3', enabled: true, order: 111 },
  { id: 'mansoor_zahrani', displayName: 'منصور الزهراني', category: 'adhan', assetPath: './assets/sounds/mansoor_zahrani.mp3', enabled: true, order: 112 },
  { id: 'haramain', displayName: 'الحرمين', category: 'adhan', assetPath: './assets/sounds/haramain.mp3', enabled: true, order: 113 },
  { id: 'silent', displayName: 'صامت', category: 'adhan', assetPath: './assets/sounds/silent.mp3', enabled: true, order: 114 },
];

const FIRESTORE_CONFIG_DOC = 'appConfig/soundSettings';
const FIRESTORE_UPLOADED_COLLECTION = 'uploadedSounds';

type CategoryFilter = 'all' | 'notification' | 'adhan';
type ActiveTab = 'bundled' | 'pending' | 'instructions';

function mergeBundledSoundDefaults(existingSounds: BundledSound[] = []): BundledSound[] {
  const defaultIds = new Set(DEFAULT_BUNDLED_SOUNDS.map(sound => sound.id));
  const normalizedExistingSounds = existingSounds.map(sound =>
    sound.id === 'notif_daily_summary'
      ? { ...sound, id: 'complete', displayName: sound.displayName === 'الملخص اليومي' ? 'complete' : sound.displayName }
      : sound
  );
  const existingById = new Map(normalizedExistingSounds.map(sound => [sound.id, sound]));
  const mergedDefaults = DEFAULT_BUNDLED_SOUNDS.map(defaultSound => ({
    ...defaultSound,
    ...existingById.get(defaultSound.id),
    assetPath: defaultSound.assetPath,
    category: defaultSound.category,
    order: existingById.get(defaultSound.id)?.order ?? defaultSound.order,
  }));
  const customSounds = normalizedExistingSounds.filter(sound => !defaultIds.has(sound.id));

  return [...mergedDefaults, ...customSounds].sort((a, b) => a.order - b.order);
}

// ==================== Component ====================

export default function BundledSoundsManager() {
  const [config, setConfig] = useState<SoundConfig | null>(null);
  const [uploadedSounds, setUploadedSounds] = useState<UploadedSound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<ActiveTab>('bundled');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newSoundUrl, setNewSoundUrl] = useState('');
  const [newSoundName, setNewSoundName] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ==================== Load Data ====================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [configSnap, uploadedSnap] = await Promise.all([
        getDoc(doc(db, FIRESTORE_CONFIG_DOC)),
        getDocs(collection(db, FIRESTORE_UPLOADED_COLLECTION)),
      ]);

      if (configSnap.exists() && configSnap.data()?.bundledSounds?.length) {
        const existingConfig = configSnap.data() as SoundConfig;
        const repairedConfig: SoundConfig = {
          ...existingConfig,
          bundledSounds: mergeBundledSoundDefaults(existingConfig.bundledSounds),
          updatedAt: existingConfig.updatedAt || new Date().toISOString(),
          version: existingConfig.version || 1,
        };

        if (repairedConfig.bundledSounds.length !== existingConfig.bundledSounds.length) {
          await setDoc(doc(db, FIRESTORE_CONFIG_DOC), repairedConfig, { merge: true });
        }

        setConfig(repairedConfig);
      } else {
        // Initialize/repair with defaults (doc may exist without bundledSounds)
        const defaultConfig: SoundConfig = {
          bundledSounds: mergeBundledSoundDefaults(),
          updatedAt: new Date().toISOString(),
          version: 1,
        };
        await setDoc(doc(db, FIRESTORE_CONFIG_DOC), defaultConfig, { merge: true });
        setConfig(defaultConfig);
      }

      const uploaded: UploadedSound[] = uploadedSnap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as UploadedSound[];
      setUploadedSounds(uploaded);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== Save Config ====================

  const saveConfig = async (newConfig: SoundConfig) => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const updated = {
        ...newConfig,
        updatedAt: new Date().toISOString(),
        version: (newConfig.version || 0) + 1,
      };
      await setDoc(doc(db, FIRESTORE_CONFIG_DOC), updated, { merge: true });
      setConfig(updated);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Error saving config:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== Toggle Sound ====================

  const toggleSound = (soundId: string) => {
    if (!config) return;
    const newSounds = config.bundledSounds.map(s =>
      s.id === soundId ? { ...s, enabled: !s.enabled } : s
    );
    saveConfig({ ...config, bundledSounds: newSounds });
  };

  // ==================== Update Display Name ====================

  const updateDisplayName = (soundId: string, newName: string) => {
    if (!config) return;
    const newSounds = config.bundledSounds.map(s =>
      s.id === soundId ? { ...s, displayName: newName } : s
    );
    saveConfig({ ...config, bundledSounds: newSounds });
    setEditingId(null);
    setEditingName('');
  };

  // ==================== Add New Sound by URL ====================

  const handleAddByUrl = async () => {
    const url = newSoundUrl.trim();
    if (!url) return;

    try { new URL(url); } catch {
      alert('الرابط غير صالح — يجب أن يبدأ بـ https://');
      return;
    }

    const category = categoryFilter === 'all' ? 'notification' : categoryFilter;

    setIsUploading(true);
    try {
      const uploadedDoc: Omit<UploadedSound, 'id'> = {
        fileName: url.split('/').pop() || 'sound.mp3',
        displayName: newSoundName.trim() || url.split('/').pop()?.replace(/\.[^.]+$/, '')?.replace(/_/g, ' ') || 'صوت جديد',
        category,
        downloadUrl: url,
        storagePath: '',
        fileSize: 0,
        uploadedAt: new Date().toISOString(),
        status: 'pending',
      };

      const docRef = await addDoc(collection(db, FIRESTORE_UPLOADED_COLLECTION), uploadedDoc);
      setUploadedSounds(prev => [...prev, { id: docRef.id, ...uploadedDoc }]);
      setNewSoundUrl('');
      setNewSoundName('');
    } catch (err: any) {
      console.error('Error adding sound:', err);
      alert('فشل إضافة الصوت — تحقق من الاتصال وحاول مرة أخرى');
    } finally {
      setIsUploading(false);
    }
  };

  // ==================== Delete Uploaded Sound ====================

  const deleteUploadedSound = async (sound: UploadedSound) => {
    try {
      await deleteDoc(doc(db, FIRESTORE_UPLOADED_COLLECTION, sound.id));
      setUploadedSounds(prev => prev.filter(s => s.id !== sound.id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Error deleting:', err);
      alert('فشل حذف الملف');
    }
  };

  // ==================== Play/Pause ====================

  const togglePlay = (id: string, url?: string) => {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (url) {
        audioRef.current = new Audio(url);
        audioRef.current.play();
        audioRef.current.onended = () => setPlayingId(null);
        setPlayingId(id);
      }
    }
  };

  // ==================== Filter Sounds ====================

  const filteredBundled = config?.bundledSounds.filter(s =>
    categoryFilter === 'all' || s.category === categoryFilter
  ).sort((a, b) => a.order - b.order) || [];

  const filteredUploaded = uploadedSounds.filter(s =>
    categoryFilter === 'all' || s.category === categoryFilter
  );

  const pendingCount = uploadedSounds.filter(s => s.status === 'pending').length;

  // ==================== Render ====================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-accent-light animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
            <Music className="w-6 h-6 text-accent-light" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">أصوات الإشعارات</h1>
            <p className="text-slate-400 text-sm">إدارة الأصوات المدمجة في التطبيق</p>
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/40 rounded-xl">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 text-sm font-medium">
              {pendingCount} صوت في انتظار التضمين في البناء القادم
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-admin-border pb-3">
        {[
          { key: 'bundled', label: 'الأصوات المدمجة', icon: Package, count: filteredBundled.length },
          { key: 'pending', label: 'في الانتظار', icon: Clock, count: pendingCount },
          { key: 'instructions', label: 'تعليمات البناء', icon: Terminal },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as ActiveTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-accent text-white'
                : 'text-slate-400 hover:text-white hover:bg-admin-surface-light'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.key ? 'bg-white/20' : 'bg-admin-surface-light'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Category Filter */}
      <div className="flex gap-2">
        {[
          { value: 'all', label: 'الكل', icon: '🎵' },
          { value: 'notification', label: 'إشعارات', icon: '🔔' },
          { value: 'adhan', label: 'أذان', icon: '🕌' },
        ].map(cat => (
          <button
            key={cat.value}
            onClick={() => setCategoryFilter(cat.value as CategoryFilter)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              categoryFilter === cat.value
                ? 'bg-admin-surface-light text-white border border-admin-border'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Bundled Sounds Tab */}
      {activeTab === 'bundled' && (
        <div className="bg-admin-surface rounded-2xl border border-admin-border overflow-hidden">
          <div className="p-4 border-b border-admin-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-accent-light" />
              <span className="text-white font-medium">الأصوات المدمجة حالياً</span>
            </div>
            <span className="text-xs text-slate-500">
              {filteredBundled.filter(s => s.enabled).length} مفعّل من {filteredBundled.length}
            </span>
          </div>

          <div className="divide-y divide-slate-700">
            {filteredBundled.map(sound => (
              <div
                key={sound.id}
                className={`p-4 flex items-center gap-4 transition-colors ${
                  sound.enabled ? '' : 'opacity-50'
                }`}
              >
                {/* Category Icon */}
                <div className="w-10 h-10 rounded-lg bg-admin-surface-light flex items-center justify-center text-lg">
                  {sound.category === 'adhan' ? '🕌' : '🔔'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {editingId === sound.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        className="flex-1 bg-admin-surface-light text-white rounded px-3 py-1 text-sm border border-admin-border focus:border-accent focus:outline-none"
                        onKeyDown={e => {
                          if (e.key === 'Enter') updateDisplayName(sound.id, editingName);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        placeholder="اسم الصوت"
                        aria-label="اسم الصوت"
                      />
                      <button
                        onClick={() => updateDisplayName(sound.id, editingName)}
                        className="p-1 text-accent-light hover:bg-accent/20 rounded"
                        title="حفظ"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(sound.id);
                        setEditingName(sound.displayName);
                      }}
                      className="text-white font-medium text-right hover:text-accent-light transition-colors"
                    >
                      {sound.displayName}
                    </button>
                  )}
                  <p className="text-xs text-slate-500 truncate mt-1" dir="ltr">
                    {sound.id}.mp3
                  </p>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-1 px-2 py-1 bg-accent/20 rounded-lg">
                  <CheckCircle className="w-3 h-3 text-accent-light" />
                  <span className="text-xs text-accent-light">مدمج</span>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => toggleSound(sound.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    sound.enabled
                      ? 'text-accent-light bg-accent/20 hover:bg-accent/30'
                      : 'text-slate-500 bg-admin-surface-light hover:bg-slate-600'
                  }`}
                  title={sound.enabled ? 'تعطيل' : 'تفعيل'}
                >
                  {sound.enabled ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>
            ))}
          </div>

          {/* Save Status */}
          {(saveStatus !== 'idle' || isSaving) && (
            <div className={`p-3 flex items-center justify-center gap-2 ${
              saveStatus === 'success' ? 'bg-accent/20 text-accent-light' : 'bg-red-500/20 text-red-400'
            }`}>
              {saveStatus === 'success' ? (
                <><CheckCircle className="w-4 h-4" /> تم الحفظ</>
              ) : (
                <><AlertTriangle className="w-4 h-4" /> خطأ في الحفظ</>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pending Sounds Tab */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {/* Upload Button */}
          <div className="bg-admin-surface rounded-2xl border border-admin-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-accent-light" />
                <span className="text-white font-medium">إضافة صوت جديد برابط</span>
              </div>
              <span className="text-xs text-slate-500">
                سيكون متاحاً في البناء القادم
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={newSoundUrl}
                onChange={(e) => setNewSoundUrl(e.target.value)}
                placeholder="رابط الصوت (https://...)"
                className="flex-1 min-w-[250px] bg-admin-surface-light text-white px-4 py-2.5 rounded-xl border border-admin-border text-sm focus:border-accent focus:outline-none"
                dir="ltr"
              />
              <input
                type="text"
                value={newSoundName}
                onChange={(e) => setNewSoundName(e.target.value)}
                placeholder="اسم الصوت (اختياري)"
                className="min-w-[180px] bg-admin-surface-light text-white px-4 py-2.5 rounded-xl border border-admin-border text-sm focus:border-accent focus:outline-none"
                dir="rtl"
              />
              <button
                onClick={handleAddByUrl}
                disabled={isUploading || !newSoundUrl.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl font-medium transition-all disabled:opacity-50"
              >
                {isUploading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                {isUploading ? 'جاري الإضافة...' : 'إضافة'}
              </button>
            </div>
            <p className="text-slate-500 text-xs mt-2">الصق رابط مباشر لملف MP3 من أي CDN أو موقع استضافة</p>
            <details className="mt-2">
              <summary className="text-xs text-accent-light cursor-pointer hover:underline">🌐 مواقع مجانية لرفع الملفات الصوتية</summary>
              <ul className="mt-2 text-xs text-slate-400 space-y-1 pr-4 list-disc">
                <li><strong>Cloudinary</strong> — cloudinary.com — 25 جيجا مجاناً، رابط مباشر</li>
                <li><strong>Catbox.moe</strong> — catbox.moe — 200 ميجا للملف، بدون تسجيل</li>
                <li><strong>Internet Archive</strong> — archive.org — مساحة غير محدودة</li>
                <li><strong>GitHub Releases</strong> — github.com — ارفع كـ Release asset (حتى 2 جيجا)</li>
                <li><strong>Google Drive</strong> — انسخ الرابط واستبدل: <code className="bg-admin-surface-light px-1 rounded" dir="ltr">https://drive.google.com/uc?export=download&id=FILE_ID</code></li>
              </ul>
            </details>
          </div>

          {/* Pending List */}
          {filteredUploaded.length > 0 ? (
            <div className="bg-admin-surface rounded-2xl border border-admin-border overflow-hidden">
              <div className="p-4 border-b border-admin-border flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <span className="text-white font-medium">الأصوات في الانتظار</span>
              </div>

              <div className="divide-y divide-slate-700">
                {filteredUploaded.map(sound => (
                  <div key={sound.id} className="p-4 flex items-center gap-4">
                    {/* Category Icon */}
                    <div className="w-10 h-10 rounded-lg bg-admin-surface-light flex items-center justify-center text-lg">
                      {sound.category === 'adhan' ? '🕌' : '🔔'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium">{sound.displayName}</p>
                      <p className="text-xs text-slate-500">
                        {(sound.fileSize / 1024).toFixed(1)} KB • {new Date(sound.uploadedAt).toLocaleDateString('ar-EG')}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 rounded-lg">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span className="text-xs text-amber-400">في الانتظار</span>
                    </div>

                    {/* Play */}
                    <button
                      onClick={() => togglePlay(sound.id, sound.downloadUrl)}
                      className="p-2 rounded-lg bg-admin-surface-light text-slate-300 hover:text-white hover:bg-admin-surface-light transition-colors"
                    >
                      {playingId === sound.id ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>

                    {/* Delete */}
                    {deleteConfirmId === sound.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteUploadedSound(sound)}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600"
                        >
                          تأكيد
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-1 bg-admin-surface-light text-white text-sm rounded-lg hover:bg-admin-muted"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(sound.id)}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-admin-surface rounded-2xl border border-admin-border p-12 text-center">
              <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">لا توجد أصوات في الانتظار</p>
              <p className="text-slate-500 text-sm mt-1">
                ارفع أصوات جديدة وستظهر هنا
              </p>
            </div>
          )}
        </div>
      )}

      {/* Instructions Tab */}
      {activeTab === 'instructions' && (
        <div className="space-y-4">
          {/* Info Card */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <Info className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-blue-400 font-semibold mb-2">كيف يعمل نظام الأصوات؟</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  أصوات الإشعارات على Android يجب أن تكون مدمجة في التطبيق وقت البناء.
                  عند رفع صوت جديد، يُخزَّن في Firebase ويُضاف تلقائياً في البناء القادم.
                </p>
              </div>
            </div>
          </div>

          {/* Build Script Card */}
          <div className="bg-admin-surface rounded-2xl border border-admin-border overflow-hidden">
            <div className="p-4 border-b border-admin-border flex items-center gap-2">
              <Terminal className="w-5 h-5 text-accent-light" />
              <span className="text-white font-medium">أمر تحميل الأصوات قبل البناء</span>
            </div>
            <div className="p-4">
              <div className="bg-admin-bg rounded-lg p-4 font-mono text-sm" dir="ltr">
                <code className="text-accent-light">pnpm run sync-sounds</code>
              </div>
              <p className="text-slate-400 text-sm mt-3">
                يقوم هذا الأمر بتحميل جميع الأصوات المعلقة من Firebase وإضافتها لملف app.json تلقائياً.
              </p>
            </div>
          </div>

          {/* Build Steps */}
          <div className="bg-admin-surface rounded-2xl border border-admin-border p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-accent-light" />
              خطوات إضافة أصوات جديدة
            </h3>
            <ol className="space-y-4 text-slate-300 text-sm">
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-accent/20 text-accent-light rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                <span>ارفع الصوت من تاب "في الانتظار" في هذه الصفحة</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-accent/20 text-accent-light rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                <span>شغّل <code className="bg-admin-surface-light px-2 py-0.5 rounded text-accent-light">pnpm run sync-sounds</code> في المشروع</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-accent/20 text-accent-light rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                <span>ابنِ التطبيق بـ <code className="bg-admin-surface-light px-2 py-0.5 rounded text-accent-light">eas build</code></span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-accent/20 text-accent-light rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                <span>الأصوات الجديدة ستكون متاحة للمستخدمين في النسخة الجديدة</span>
              </li>
            </ol>
          </div>

          {/* Pending Summary */}
          {pendingCount > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-6 h-6 text-amber-400" />
                <span className="text-amber-400 font-semibold">
                  {pendingCount} صوت في الانتظار
                </span>
              </div>
              <ul className="text-slate-300 text-sm space-y-1">
                {uploadedSounds.filter(s => s.status === 'pending').map(s => (
                  <li key={s.id} className="flex items-center gap-2">
                    <span className="text-slate-500">•</span>
                    {s.displayName}
                    <span className="text-xs text-slate-500">({s.category === 'adhan' ? 'أذان' : 'إشعارات'})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
