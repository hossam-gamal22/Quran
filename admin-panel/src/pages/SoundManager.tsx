// admin-panel/src/pages/SoundManager.tsx
// إدارة الأصوات - روح المسلم

import React, { useState, useEffect, useRef } from 'react';
import {
  Link,
  Play,
  Pause,
  Trash2,
  Music,
  Volume2,
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Search,
  X,
  Plus,
  Upload,
} from 'lucide-react';
import { db, storage } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, addDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// ==================== Types ====================

interface SoundFile {
  id: string;
  name: string;
  category: SoundCategory;
  url: string;
  storagePath: string;
  uploadedAt: string;
  fileSize: number;
  duration?: number;
  isDownloadable?: boolean;
  downloadDescription?: string;
}

type SoundCategory = 'adhan' | 'notification' | 'adhkar' | 'effect';

interface SoundAssignments {
  notifications: {
    prayer: string;
    azkarReminder: string;
    salawat: string;
    general: string;
  };
  pageEvents: {
    tasbihComplete: string;
    khatmaComplete: string;
    dailyGoalComplete: string;
    verseBookmark: string;
  };
  updatedAt?: string;
}

// ==================== Constants ====================

const SOUND_CATEGORIES: { value: SoundCategory; label: string; icon: string }[] = [
  { value: 'adhan', label: 'أذان', icon: '🕌' },
  { value: 'notification', label: 'إشعارات', icon: '🔔' },
  { value: 'adhkar', label: 'أذكار', icon: '📿' },
  { value: 'effect', label: 'مؤثرات', icon: '🎵' },
];

// Phase B10: NOTIFICATION_TYPES removed (was used by deleted notifications tab).
// SoundAssignments.notifications shape is preserved in DEFAULT_ASSIGNMENTS for
// backward compatibility with existing Firestore data, but the UI no longer
// surfaces it. Build-time bundled sounds are configured via BundledSoundsManager.

const PAGE_EVENT_TYPES: { key: keyof SoundAssignments['pageEvents']; label: string; icon: string }[] = [
  { key: 'tasbihComplete', label: 'إتمام التسبيح', icon: '📿' },
  { key: 'khatmaComplete', label: 'إتمام الختمة', icon: '📖' },
  { key: 'dailyGoalComplete', label: 'إتمام الهدف اليومي', icon: '🎯' },
  { key: 'verseBookmark', label: 'حفظ آية', icon: '🔖' },
];

const FIRESTORE_SOUNDS_COLLECTION = 'sounds';
const FIRESTORE_ASSIGNMENTS_DOC = 'appConfig/soundSettings';

const DEFAULT_ASSIGNMENTS: SoundAssignments = {
  notifications: {
    prayer: '',
    azkarReminder: '',
    salawat: '',
    general: '',
  },
  pageEvents: {
    tasbihComplete: '',
    khatmaComplete: '',
    dailyGoalComplete: '',
    verseBookmark: '',
  },
};

// ==================== Bundled Sounds (Built into the app) ====================

interface BundledSound {
  id: string;
  name: string;
  category: 'notification' | 'adhan';
}

const BUNDLED_SOUNDS: BundledSound[] = [
  // إشعارات
  { id: 'general_reminder', name: 'تذكير عام', category: 'notification' },
  { id: 'salawat', name: 'صلاة على النبي', category: 'notification' },
  { id: 'istighfar', name: 'استغفار', category: 'notification' },
  { id: 'tasbih', name: 'تسبيح', category: 'notification' },
  { id: 'subhanallah', name: 'سبحان الله', category: 'notification' },
  { id: 'alhamdulillah', name: 'الحمد لله', category: 'notification' },
  { id: 'morning_adhkar', name: 'أذكار الصباح', category: 'notification' },
  { id: 'evening_adhkar', name: 'أذكار المساء', category: 'notification' },
  // أذان
  { id: 'makkah', name: 'أذان مكة المكرمة', category: 'adhan' },
  { id: 'madinah', name: 'أذان المدينة المنورة', category: 'adhan' },
  { id: 'alaqsa', name: 'أذان المسجد الأقصى', category: 'adhan' },
  { id: 'mishary', name: 'مشاري العفاسي', category: 'adhan' },
  { id: 'abdulbasit', name: 'عبد الباسط عبد الصمد', category: 'adhan' },
  { id: 'sudais', name: 'عبد الرحمن السديس', category: 'adhan' },
  { id: 'egypt', name: 'أذان مصر', category: 'adhan' },
  { id: 'dosari', name: 'ياسر الدوسري', category: 'adhan' },
  { id: 'ajman', name: 'أذان عجمان', category: 'adhan' },
  { id: 'ali_mulla', name: 'علي الملا', category: 'adhan' },
  { id: 'naqshbandi', name: 'النقشبندي', category: 'adhan' },
  { id: 'sharif', name: 'محمد شريف', category: 'adhan' },
  { id: 'mansoor_zahrani', name: 'منصور الزهراني', category: 'adhan' },
  { id: 'haramain', name: 'الحرمين', category: 'adhan' },
  { id: 'silent', name: 'صامت', category: 'adhan' },
];

// Phase B10: 'notifications' tab removed.
// Reason: iOS/Android only play notification sounds that are bundled into
// the app binary at build time. Uploading a sound and assigning it from
// the admin panel cannot affect device notification sounds — that pipeline
// is handled by the build-time `BundledSoundsManager` instead.
// In-app sound playback (azkar reciter, adhan preview) still uses uploaded
// sounds via the 'events' tab below.
type ActiveTab = 'library' | 'events';

// ==================== Component ====================

export default function SoundManager() {
  const [sounds, setSounds] = useState<SoundFile[]>([]);
  const [assignments, setAssignments] = useState<SoundAssignments>(DEFAULT_ASSIGNMENTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<ActiveTab>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<SoundCategory | 'all'>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [newSoundUrl, setNewSoundUrl] = useState('');
  const [newSoundName, setNewSoundName] = useState('');
  const [newSoundCategory, setNewSoundCategory] = useState<SoundCategory>('notification');
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ==================== Load Data ====================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [soundsSnap, assignmentsSnap] = await Promise.all([
        getDocs(collection(db, FIRESTORE_SOUNDS_COLLECTION)),
        getDoc(doc(db, FIRESTORE_ASSIGNMENTS_DOC)),
      ]);

      const loadedSounds: SoundFile[] = soundsSnap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as SoundFile[];
      setSounds(loadedSounds);

      if (assignmentsSnap.exists()) {
        const data = assignmentsSnap.data() as Partial<SoundAssignments>;
        setAssignments({
          notifications: { ...DEFAULT_ASSIGNMENTS.notifications, ...data.notifications },
          pageEvents: { ...DEFAULT_ASSIGNMENTS.pageEvents, ...data.pageEvents },
        });
      }
    } catch (err) {
      console.error('Error loading sound data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== Add Sound by URL ====================

  const handleAddByUrl = async () => {
    const url = newSoundUrl.trim();
    if (!url) return;

    // Basic URL validation
    try { new URL(url); } catch {
      alert('الرابط غير صالح — يجب أن يبدأ بـ https://');
      return;
    }

    setIsUploading(true);
    try {
      const soundDoc: Omit<SoundFile, 'id'> = {
        name: newSoundName.trim() || url.split('/').pop()?.replace(/\.[^.]+$/, '') || 'صوت جديد',
        category: newSoundCategory,
        url,
        storagePath: '',
        uploadedAt: new Date().toISOString(),
        fileSize: 0,
      };

      const docRef = await addDoc(collection(db, FIRESTORE_SOUNDS_COLLECTION), soundDoc);
      setSounds(prev => [...prev, { id: docRef.id, ...soundDoc }]);
      setNewSoundUrl('');
      setNewSoundName('');
    } catch (err: any) {
      console.error('Error adding sound:', err);
      alert('حدث خطأ أثناء الإضافة — تحقق من الاتصال');
    } finally {
      setIsUploading(false);
    }
  };

  // ==================== Upload from Device ====================

  const handleFilePick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so re-picking same file works
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      alert('الملف يجب أن يكون صوتي (MP3, WAV, OGG, M4A...)');
      return;
    }
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB matches storage rules
    if (file.size > MAX_SIZE) {
      alert(`حجم الملف كبير جداً (${(file.size / 1024 / 1024).toFixed(1)}MB) — الحد الأقصى 10MB`);
      return;
    }

    setIsUploading(true);
    setUploadProgress('جاري الرفع...');
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `uploads/sounds/${newSoundCategory}/${Date.now()}_${safeName}`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, file, { contentType: file.type });
      const url = await getDownloadURL(fileRef);

      const baseName = newSoundName.trim() || file.name.replace(/\.[^.]+$/, '');
      const soundDoc: Omit<SoundFile, 'id'> = {
        name: baseName,
        category: newSoundCategory,
        url,
        storagePath: path,
        uploadedAt: new Date().toISOString(),
        fileSize: file.size,
      };
      const docRef = await addDoc(collection(db, FIRESTORE_SOUNDS_COLLECTION), soundDoc);
      setSounds(prev => [...prev, { id: docRef.id, ...soundDoc }]);
      setNewSoundName('');
      setUploadProgress('✅ تم الرفع بنجاح');
      setTimeout(() => setUploadProgress(null), 2000);
    } catch (err: any) {
      console.error('Error uploading sound:', err);
      alert('فشل الرفع — تحقق من صلاحيات Firebase Storage أو الاتصال\n\n' + (err?.message || ''));
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
    }
  };

  // ==================== Delete ====================

  const handleDelete = async (sound: SoundFile) => {
    try {
      // Remove from Firestore
      await deleteDoc(doc(db, FIRESTORE_SOUNDS_COLLECTION, sound.id));

      // If file was uploaded to Storage, also delete the blob (best-effort)
      if (sound.storagePath) {
        try {
          await deleteObject(storageRef(storage, sound.storagePath));
        } catch (storageErr) {
          console.warn('Could not delete storage file (may not exist):', storageErr);
        }
      }

      // Clear any assignments referencing this sound
      setAssignments(prev => {
        const updated = { ...prev };
        for (const key of Object.keys(updated.notifications) as (keyof SoundAssignments['notifications'])[]) {
          if (updated.notifications[key] === sound.id) updated.notifications[key] = '';
        }
        for (const key of Object.keys(updated.pageEvents) as (keyof SoundAssignments['pageEvents'])[]) {
          if (updated.pageEvents[key] === sound.id) updated.pageEvents[key] = '';
        }
        return updated;
      });

      setSounds(prev => prev.filter(s => s.id !== sound.id));

      if (playingId === sound.id) {
        stopAudio();
      }
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Error deleting sound:', err);
      alert('حدث خطأ أثناء حذف الملف');
    }
  };

  // ==================== Audio Playback ====================

  const togglePlay = (sound: SoundFile) => {
    if (playingId === sound.id) {
      stopAudio();
    } else {
      stopAudio();
      const audio = new Audio(sound.url);
      audio.onended = () => setPlayingId(null);
      audio.play();
      audioRef.current = audio;
      setPlayingId(sound.id);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingId(null);
  };

  // ==================== Update Sound ====================

  const updateSoundCategory = async (soundId: string, category: SoundCategory) => {
    try {
      await setDoc(doc(db, FIRESTORE_SOUNDS_COLLECTION, soundId), { category }, { merge: true });
      setSounds(prev => prev.map(s => s.id === soundId ? { ...s, category } : s));
    } catch (err) {
      console.error('Error updating sound category:', err);
    }
  };

  const saveEditedName = async (soundId: string) => {
    if (!editingNameValue.trim()) return;
    try {
      await setDoc(doc(db, FIRESTORE_SOUNDS_COLLECTION, soundId), { name: editingNameValue.trim() }, { merge: true });
      setSounds(prev => prev.map(s => s.id === soundId ? { ...s, name: editingNameValue.trim() } : s));
      setEditingNameId(null);
      setEditingNameValue('');
    } catch (err) {
      console.error('Error updating sound name:', err);
    }
  };

  // ==================== Save Assignments ====================

  const handleSaveAssignments = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      // CRITICAL: use merge:true so we don't wipe out bundledSounds[]
      // (managed by BundledSoundsManager) or any other fields in the doc.
      await setDoc(doc(db, FIRESTORE_ASSIGNMENTS_DOC), {
        notifications: assignments.notifications,
        pageEvents: assignments.pageEvents,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Error saving assignments:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== Filtering ====================

  const filteredSounds = sounds.filter(s => {
    const matchesSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getSoundName = (soundId: string): string => {
    return sounds.find(s => s.id === soundId)?.name || 'غير محدد';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  // ==================== Render ====================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-accent-light animate-spin" />
      </div>
    );
  }

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { key: 'library', label: 'مكتبة الأصوات', icon: <Music className="w-4 h-4" /> },
    { key: 'events', label: 'أصوات داخل التطبيق', icon: <Music className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
            <Volume2 className="w-6 h-6 text-accent-light" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">إدارة الأصوات</h1>
            <p className="text-slate-400 text-sm">رفع وتعيين الأصوات للإشعارات والأحداث</p>
          </div>
        </div>

        {activeTab === 'events' && (
          <button
            onClick={handleSaveAssignments}
            disabled={isSaving}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${
              saveStatus === 'success'
                ? 'bg-green-500 text-white'
                : saveStatus === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-accent hover:bg-accent-dark text-white'
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
            {isSaving ? 'جاري الحفظ...' : saveStatus === 'success' ? 'تم الحفظ!' : saveStatus === 'error' ? 'خطأ!' : 'حفظ التعيينات'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-accent text-white'
                : 'bg-admin-surface text-slate-300 hover:bg-admin-surface-light border border-admin-border'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ==================== Sound Library ==================== */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          {/* Add by URL */}
          <div className="bg-admin-surface rounded-2xl p-4 border border-admin-border space-y-3">
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
              <select
                value={newSoundCategory}
                onChange={(e) => setNewSoundCategory(e.target.value as SoundCategory)}
                className="bg-admin-surface-light text-white px-3 py-2.5 rounded-xl border border-admin-border text-sm focus:border-accent focus:outline-none"
                aria-label="فئة الصوت"
              >
                {SOUND_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                ))}
              </select>
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
              <button
                onClick={handleFilePick}
                disabled={isUploading}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all disabled:opacity-50"
                title="ارفع ملف صوتي مباشرة من جهازك (حتى 10MB)"
              >
                <Upload className="w-5 h-5" />
                رفع من الجهاز
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
                aria-label="اختيار ملف صوتي"
              />
            </div>
            {uploadProgress && (
              <p className="text-accent-light text-sm font-medium">{uploadProgress}</p>
            )}
            <p className="text-slate-500 text-xs">الصق رابط مباشر لملف MP3 أو ارفع ملف صوتي من جهازك (MP3, WAV, OGG, M4A — حتى 10MB)</p>
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

          {/* Search + Filter Bar */}
          <div className="bg-admin-surface rounded-2xl p-4 border border-admin-border flex flex-wrap items-center gap-4">

            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث عن صوت..."
                aria-label="بحث في الأصوات"
                className="w-full bg-admin-surface-light text-white pr-10 pl-4 py-2.5 rounded-xl border border-admin-border text-sm focus:border-accent focus:outline-none"
                dir="rtl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  aria-label="مسح البحث"
                  title="مسح البحث"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as SoundCategory | 'all')}
              className="bg-admin-surface-light text-white px-4 py-2.5 rounded-xl border border-admin-border text-sm focus:border-accent focus:outline-none"
              aria-label="فلتر فئة الأصوات"
            >
              <option value="all">جميع الفئات</option>
              {SOUND_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
              ))}
            </select>

            <div className="text-sm text-slate-400">
              {filteredSounds.length} صوت
            </div>
          </div>

          {/* Uploaded Sound Grid */}
          {filteredSounds.length === 0 ? (
            <div className="bg-admin-surface rounded-2xl p-8 border border-admin-border text-center">
              <Music className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">لا توجد أصوات مرفوعة</p>
              <p className="text-slate-500 text-sm mt-1">أضف أصوات مخصصة عبر الرابط بالأعلى</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSounds.map(sound => (
                <div
                  key={sound.id}
                  className="bg-admin-surface rounded-2xl border border-admin-border p-4 hover:border-admin-border transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      {editingNameId === sound.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingNameValue}
                            onChange={(e) => setEditingNameValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEditedName(sound.id)}
                            className="bg-admin-surface-light text-white px-3 py-1.5 rounded-lg border border-admin-border text-sm w-full focus:border-accent focus:outline-none"
                            dir="rtl"
                            autoFocus
                            aria-label="اسم الصوت"
                            placeholder="ادخل اسم الصوت"
                          />
                          <button
                            onClick={() => saveEditedName(sound.id)}
                            className="text-accent-light hover:text-emerald-300 flex-shrink-0"
                            aria-label="حفظ الاسم"
                            title="حفظ الاسم"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => { setEditingNameId(null); setEditingNameValue(''); }}
                            className="text-slate-400 hover:text-white flex-shrink-0"
                            aria-label="إلغاء التعديل"
                            title="إلغاء التعديل"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingNameId(sound.id); setEditingNameValue(sound.name); }}
                          className="text-white font-medium text-sm truncate block w-full text-right hover:text-accent-light transition-colors"
                          title="انقر للتعديل"
                        >
                          {sound.name}
                        </button>
                      )}
                    </div>

                    {/* Play/Stop Button */}
                    <button
                      onClick={() => togglePlay(sound)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mr-2 transition-all ${
                        playingId === sound.id
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          : 'bg-accent/20 text-accent-light hover:bg-accent/30'
                      }`}
                      aria-label={playingId === sound.id ? 'إيقاف الصوت' : 'تشغيل الصوت'}
                      title={playingId === sound.id ? 'إيقاف' : 'تشغيل'}
                    >
                      {playingId === sound.id ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Category Dropdown */}
                  <div className="mb-3">
                    <select
                      value={sound.category}
                      onChange={(e) => updateSoundCategory(sound.id, e.target.value as SoundCategory)}
                      className="w-full bg-admin-surface-light text-white px-3 py-2 rounded-lg border border-admin-border text-sm focus:border-accent focus:outline-none"
                      aria-label="فئة الصوت"
                    >
                      {SOUND_CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Info Row */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{formatFileSize(sound.fileSize)}</span>
                    <span>{formatDate(sound.uploadedAt)}</span>
                  </div>

                  {/* Delete */}
                  <div className="mt-3 pt-3 border-t border-admin-border">
                    {deleteConfirmId === sound.id ? (
                      <div className="flex items-center justify-between">
                        <span className="text-red-400 text-xs">هل أنت متأكد؟</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(sound)}
                            className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 transition-colors"
                          >
                            حذف
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-3 py-1 bg-admin-surface-light text-slate-300 rounded-lg text-xs hover:bg-admin-surface-light transition-colors"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(sound.id)}
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== Page Sound Assignment ==================== */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="bg-admin-surface rounded-2xl p-4 border border-admin-border">
            <p className="text-sm text-slate-400">
              اختر الأصوات التي تُشغّل عند أحداث معينة داخل التطبيق.
            </p>
          </div>

          <div className="space-y-3">
            {PAGE_EVENT_TYPES.map(type => {
              const selectedSoundId = assignments.pageEvents[type.key];
              const selectedSound = sounds.find(s => s.id === selectedSoundId);

              return (
                <div
                  key={type.key}
                  className="bg-admin-surface rounded-2xl border border-admin-border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-admin-surface-light rounded-xl flex items-center justify-center text-xl">
                      {type.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium">{type.label}</p>
                      {selectedSound && (
                        <p className="text-xs text-slate-500 mt-0.5">{selectedSound.name}</p>
                      )}
                    </div>

                    <select
                      value={selectedSoundId}
                      onChange={(e) =>
                        setAssignments(prev => ({
                          ...prev,
                          pageEvents: { ...prev.pageEvents, [type.key]: e.target.value },
                        }))
                      }
                      className="bg-admin-surface-light text-white px-4 py-2 rounded-xl border border-admin-border text-sm focus:border-accent focus:outline-none min-w-[200px]"
                      aria-label={`صوت ${type.label}`}
                    >
                      <option value="">— غير محدد —</option>
                      <optgroup label="🔔 إشعارات مدمجة">
                        {BUNDLED_SOUNDS.filter(s => s.category === 'notification').map(s => (
                          <option key={`bundled-${s.id}`} value={s.id}>{s.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="🎵 مؤثرات مدمجة">
                        {BUNDLED_SOUNDS.filter(s => s.category === 'adhan').map(s => (
                          <option key={`bundled-${s.id}`} value={s.id}>{s.name}</option>
                        ))}
                      </optgroup>
                      {sounds.length > 0 && (
                        <optgroup label="📤 أصوات مرفوعة">
                          {sounds.map(s => (
                            <option key={s.id} value={s.id}>
                              {SOUND_CATEGORIES.find(c => c.value === s.category)?.icon} {s.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>

                    {selectedSound && (
                      <button
                        onClick={() => togglePlay(selectedSound)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                          playingId === selectedSound.id
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-accent/20 text-accent-light'
                        }`}
                        aria-label={playingId === selectedSound.id ? 'إيقاف المعاينة' : 'معاينة الصوت'}
                        title={playingId === selectedSound.id ? 'إيقاف' : 'معاينة'}
                      >
                        {playingId === selectedSound.id ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
