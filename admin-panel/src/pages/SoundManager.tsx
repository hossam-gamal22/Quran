// admin-panel/src/pages/SoundManager.tsx
// إدارة الأصوات - روح المسلم

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
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
  Download,
} from 'lucide-react';
import { db, storage } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

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

const NOTIFICATION_TYPES: { key: keyof SoundAssignments['notifications']; label: string; icon: string }[] = [
  { key: 'prayer', label: 'إشعار الصلاة', icon: '🕌' },
  { key: 'azkarReminder', label: 'تذكير الأذكار', icon: '📿' },
  { key: 'salawat', label: 'الصلاة على النبي', icon: '☪️' },
  { key: 'general', label: 'إشعارات عامة', icon: '🔔' },
];

const PAGE_EVENT_TYPES: { key: keyof SoundAssignments['pageEvents']; label: string; icon: string }[] = [
  { key: 'tasbihComplete', label: 'إتمام التسبيح', icon: '📿' },
  { key: 'khatmaComplete', label: 'إتمام الختمة', icon: '📖' },
  { key: 'dailyGoalComplete', label: 'إتمام الهدف اليومي', icon: '🎯' },
  { key: 'verseBookmark', label: 'حفظ آية', icon: '🔖' },
];

const FIRESTORE_SOUNDS_COLLECTION = 'sounds';
const FIRESTORE_ASSIGNMENTS_DOC = 'appConfig/soundSettings';
const STORAGE_SOUNDS_PATH = 'sounds';
const ACCEPTED_AUDIO_TYPES = '.mp3,.wav,.ogg';
const MAX_FILE_SIZE_MB = 10;

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

type ActiveTab = 'library' | 'notifications' | 'events' | 'downloadable';

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

  // ==================== Upload ====================

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          alert(`الملف ${file.name} أكبر من ${MAX_FILE_SIZE_MB}MB`);
          continue;
        }

        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${STORAGE_SOUNDS_PATH}/${timestamp}_${safeName}`;
        const storageRef = ref(storage, storagePath);

        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        const soundDoc: Omit<SoundFile, 'id'> = {
          name: file.name.replace(/\.[^.]+$/, ''),
          category: 'notification',
          url,
          storagePath,
          uploadedAt: new Date().toISOString(),
          fileSize: file.size,
        };

        const docRef = await addDoc(collection(db, FIRESTORE_SOUNDS_COLLECTION), soundDoc);
        setSounds(prev => [...prev, { id: docRef.id, ...soundDoc }]);
      }
    } catch (err) {
      console.error('Error uploading sound:', err);
      alert('حدث خطأ أثناء رفع الملف');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ==================== Delete ====================

  const handleDelete = async (sound: SoundFile) => {
    try {
      // Remove from Storage
      const storageRef = ref(storage, sound.storagePath);
      await deleteObject(storageRef).catch(() => {
        // File may already be deleted from storage
      });

      // Remove from Firestore
      await deleteDoc(doc(db, FIRESTORE_SOUNDS_COLLECTION, sound.id));

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

  // ==================== Toggle Downloadable ====================

  const toggleDownloadable = async (soundId: string, currentValue: boolean) => {
    try {
      await setDoc(doc(db, FIRESTORE_SOUNDS_COLLECTION, soundId), { isDownloadable: !currentValue }, { merge: true });
      setSounds(prev => prev.map(s => s.id === soundId ? { ...s, isDownloadable: !currentValue } : s));
    } catch (err) {
      console.error('Error updating downloadable status:', err);
    }
  };

  const updateDownloadDescription = async (soundId: string, description: string) => {
    try {
      await setDoc(doc(db, FIRESTORE_SOUNDS_COLLECTION, soundId), { downloadDescription: description }, { merge: true });
      setSounds(prev => prev.map(s => s.id === soundId ? { ...s, downloadDescription: description } : s));
    } catch (err) {
      console.error('Error updating download description:', err);
    }
  };

  // ==================== Save Assignments ====================

  const handleSaveAssignments = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await setDoc(doc(db, FIRESTORE_ASSIGNMENTS_DOC), {
        ...assignments,
        updatedAt: new Date().toISOString(),
      });
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
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { key: 'library', label: 'مكتبة الأصوات', icon: <Music className="w-4 h-4" /> },
    { key: 'notifications', label: 'أصوات الإشعارات', icon: <Volume2 className="w-4 h-4" /> },
    { key: 'events', label: 'أصوات الأحداث', icon: <Music className="w-4 h-4" /> },
    { key: 'downloadable', label: 'أصوات قابلة للتحميل', icon: <Download className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
            <Volume2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">إدارة الأصوات</h1>
            <p className="text-slate-400 text-sm">رفع وتعيين الأصوات للإشعارات والأحداث</p>
          </div>
        </div>

        {(activeTab === 'notifications' || activeTab === 'events') && (
          <button
            onClick={handleSaveAssignments}
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
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
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
          {/* Upload + Filter Bar */}
          <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 flex flex-wrap items-center gap-4">
            {/* Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-all disabled:opacity-50"
            >
              {isUploading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
              {isUploading ? 'جاري الرفع...' : 'رفع صوت'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_AUDIO_TYPES}
              multiple
              onChange={handleUpload}
              className="hidden"
              aria-label="اختر ملفات صوتية لتحميلها"
            />

            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث عن صوت..."
                aria-label="بحث في الأصوات"
                className="w-full bg-slate-700 text-white pr-10 pl-4 py-2.5 rounded-xl border border-slate-600 text-sm focus:border-emerald-500 focus:outline-none"
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
              className="bg-slate-700 text-white px-4 py-2.5 rounded-xl border border-slate-600 text-sm focus:border-emerald-500 focus:outline-none"
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

          {/* Sound Grid */}
          {filteredSounds.length === 0 ? (
            <div className="bg-slate-800 rounded-2xl p-12 border border-slate-700 text-center">
              <Music className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">لا توجد أصوات</p>
              <p className="text-slate-500 text-sm mt-1">ابدأ برفع ملفات صوتية</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSounds.map(sound => (
                <div
                  key={sound.id}
                  className="bg-slate-800 rounded-2xl border border-slate-700 p-4 hover:border-slate-600 transition-all"
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
                            className="bg-slate-700 text-white px-3 py-1.5 rounded-lg border border-slate-600 text-sm w-full focus:border-emerald-500 focus:outline-none"
                            dir="rtl"
                            autoFocus
                            aria-label="اسم الصوت"
                            placeholder="ادخل اسم الصوت"
                          />
                          <button
                            onClick={() => saveEditedName(sound.id)}
                            className="text-emerald-400 hover:text-emerald-300 flex-shrink-0"
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
                          className="text-white font-medium text-sm truncate block w-full text-right hover:text-emerald-400 transition-colors"
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
                          : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
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
                      className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 text-sm focus:border-emerald-500 focus:outline-none"
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
                  <div className="mt-3 pt-3 border-t border-slate-700">
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
                            className="px-3 py-1 bg-slate-700 text-slate-300 rounded-lg text-xs hover:bg-slate-600 transition-colors"
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

      {/* ==================== Notification Sound Assignment ==================== */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
            <p className="text-sm text-slate-400">
              اختر الصوت المناسب لكل نوع من الإشعارات. سيتم تطبيق التغييرات على جميع مستخدمي التطبيق.
            </p>
          </div>

          <div className="space-y-3">
            {NOTIFICATION_TYPES.map(type => {
              const selectedSoundId = assignments.notifications[type.key];
              const selectedSound = sounds.find(s => s.id === selectedSoundId);

              return (
                <div
                  key={type.key}
                  className="bg-slate-800 rounded-2xl border border-slate-700 p-4"
                >
                  <div className="flex items-center gap-4">
                    {/* Icon / Label */}
                    <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center text-xl">
                      {type.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium">{type.label}</p>
                      {selectedSound && (
                        <p className="text-xs text-slate-500 mt-0.5">{selectedSound.name}</p>
                      )}
                    </div>

                    {/* Dropdown */}
                    <select
                      value={selectedSoundId}
                      onChange={(e) =>
                        setAssignments(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, [type.key]: e.target.value },
                        }))
                      }
                      className="bg-slate-700 text-white px-4 py-2 rounded-xl border border-slate-600 text-sm focus:border-emerald-500 focus:outline-none min-w-[200px]"
                      aria-label={`صوت ${type.label}`}
                    >
                      <option value="">— غير محدد —</option>
                      {sounds.map(s => (
                        <option key={s.id} value={s.id}>
                          {SOUND_CATEGORIES.find(c => c.value === s.category)?.icon} {s.name}
                        </option>
                      ))}
                    </select>

                    {/* Preview */}
                    {selectedSound && (
                      <button
                        onClick={() => togglePlay(selectedSound)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                          playingId === selectedSound.id
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-emerald-500/20 text-emerald-400'
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

      {/* ==================== Page Sound Assignment ==================== */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
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
                  className="bg-slate-800 rounded-2xl border border-slate-700 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center text-xl">
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
                      className="bg-slate-700 text-white px-4 py-2 rounded-xl border border-slate-600 text-sm focus:border-emerald-500 focus:outline-none min-w-[200px]"
                      aria-label={`صوت ${type.label}`}
                    >
                      <option value="">— غير محدد —</option>
                      {sounds.map(s => (
                        <option key={s.id} value={s.id}>
                          {SOUND_CATEGORIES.find(c => c.value === s.category)?.icon} {s.name}
                        </option>
                      ))}
                    </select>

                    {selectedSound && (
                      <button
                        onClick={() => togglePlay(selectedSound)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                          playingId === selectedSound.id
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-emerald-500/20 text-emerald-400'
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

      {/* ==================== Downloadable Sounds ==================== */}
      {activeTab === 'downloadable' && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
            <p className="text-sm text-slate-400">
              حدد الأصوات القابلة للتحميل من قبل المستخدمين. سيظهر للمستخدم إعلان قبل تحميل كل صوت.
            </p>
          </div>

          {/* All sounds with downloadable toggle */}
          <div className="space-y-3">
            {sounds.length === 0 ? (
              <div className="bg-slate-800 rounded-2xl p-12 border border-slate-700 text-center">
                <Music className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">لا توجد أصوات</p>
                <p className="text-slate-500 text-sm mt-1">ارفع أصواتاً من تبويب "مكتبة الأصوات" أولاً</p>
              </div>
            ) : (
              <>
                <div className="text-sm text-slate-400 mb-2">
                  {sounds.filter(s => s.isDownloadable).length} من {sounds.length} صوت متاح للتحميل
                </div>
                {sounds.map(sound => (
                  <div
                    key={sound.id}
                    className={`bg-slate-800 rounded-2xl border p-4 transition-all ${
                      sound.isDownloadable ? 'border-emerald-500/50' : 'border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Toggle */}
                      <button
                        onClick={() => toggleDownloadable(sound.id, !!sound.isDownloadable)}
                        className={`w-12 h-7 rounded-full flex items-center transition-all flex-shrink-0 ${
                          sound.isDownloadable ? 'bg-emerald-500 justify-end' : 'bg-slate-600 justify-start'
                        }`}
                        title={sound.isDownloadable ? 'إلغاء التحميل' : 'تفعيل التحميل'}
                        aria-label={sound.isDownloadable ? 'إلغاء التحميل' : 'تفعيل التحميل'}
                      >
                        <div className="w-5 h-5 bg-white rounded-full mx-1 shadow-sm" />
                      </button>

                      {/* Icon */}
                      <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                        {SOUND_CATEGORIES.find(c => c.value === sound.category)?.icon || '🎵'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{sound.name}</p>
                        <p className="text-xs text-slate-500">
                          {SOUND_CATEGORIES.find(c => c.value === sound.category)?.label} — {formatFileSize(sound.fileSize)}
                        </p>
                      </div>

                      {/* Preview */}
                      <button
                        onClick={() => togglePlay(sound)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                          playingId === sound.id
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                        title="تشغيل"
                        aria-label={playingId === sound.id ? 'إيقاف الصوت' : 'تشغيل الصوت'}
                      >
                        {playingId === sound.id ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Description field (only when downloadable) */}
                    {sound.isDownloadable && (
                      <div className="mt-3 pt-3 border-t border-slate-700">
                        <input
                          type="text"
                          value={sound.downloadDescription || ''}
                          onChange={(e) => updateDownloadDescription(sound.id, e.target.value)}
                          placeholder="وصف للمستخدم (مثال: أذان بصوت الشيخ مشاري راشد)"
                          aria-label="وصف الصوت القابل للتحميل"
                          className="w-full bg-slate-700 text-white px-4 py-2 rounded-xl border border-slate-600 text-sm focus:border-emerald-500 focus:outline-none"
                          dir="rtl"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
