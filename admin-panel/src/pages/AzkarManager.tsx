// admin-panel/src/pages/AzkarManager.tsx
// إدارة الأذكار - روح المسلم
// آخر تحديث: 2026-03-04

import React, { useState, useEffect, useRef } from 'react';
import { Download, RefreshCw, Play, Square, Search, FileJson, X, Upload, Edit2, Save, Plus, Trash2, Music, Volume2, VolumeX, Copy } from 'lucide-react';
import AutoTranslateField from '../components/AutoTranslateField';
import TranslateButton from '../components/TranslateButton';
import { db, storage } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// ========================================
// الأنواع
// ========================================

interface Zikr {
  id: number;
  category: string;
  subcategory?: string;
  arabic: string;
  transliteration: string;
  translations: Record<string, string>;
  count: number;
  reference: string;
  benefit: string | Record<string, string>;
  audio: string;
}

interface AzkarData {
  version: string;
  lastUpdate: string;
  totalCount: number;
  azkar: Zikr[];
}

// ========================================
// الثوابت
// ========================================

const LANGUAGES = [
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'id', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'ms', name: 'Melayu', flag: '🇲🇾' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'ur', name: 'اردو', flag: '🇵🇰' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

const CATEGORIES = [
  { id: 'morning', name: 'أذكار الصباح', icon: '🌅', color: 'bg-amber-500' },
  { id: 'evening', name: 'أذكار المساء', icon: '🌆', color: 'bg-purple-500' },
  { id: 'sleep', name: 'أذكار النوم', icon: '🌙', color: 'bg-blue-500' },
  { id: 'wakeup', name: 'أذكار الاستيقاظ', icon: '☀️', color: 'bg-emerald-500' },
  { id: 'after_prayer', name: 'أذكار بعد الصلاة', icon: '🕌', color: 'bg-pink-500' },
  { id: 'quran_duas', name: 'أدعية من القرآن', icon: '📖', color: 'bg-teal-500' },
  { id: 'sunnah_duas', name: 'أدعية من السنة', icon: '⭐', color: 'bg-orange-500' },
  { id: 'ruqya', name: 'الرقية الشرعية', icon: '🛡️', color: 'bg-indigo-500' },
  { id: 'eating', name: 'أذكار الطعام', icon: '🍽️', color: 'bg-lime-500' },
  { id: 'mosque', name: 'أذكار المسجد', icon: '🕌', color: 'bg-cyan-500' },
  { id: 'house', name: 'أذكار المنزل', icon: '🏠', color: 'bg-stone-500' },
  { id: 'travel', name: 'أذكار السفر', icon: '✈️', color: 'bg-sky-500' },
  { id: 'emotions', name: 'أذكار المشاعر', icon: '💚', color: 'bg-rose-500' },
  { id: 'wudu', name: 'أذكار الوضوء', icon: '💧', color: 'bg-blue-400' },
  { id: 'nature', name: 'أذكار الطبيعة', icon: '🌿', color: 'bg-green-500' },
  { id: 'fasting', name: 'أذكار الصيام', icon: '🌙', color: 'bg-violet-500' },
  { id: 'protection', name: 'أذكار الحماية', icon: '🔒', color: 'bg-red-500' },
  { id: 'prayerSupplications', name: 'أدعية الصلاة', icon: '🤲', color: 'bg-emerald-600' },
  { id: 'salawat', name: 'الصلاة على النبي', icon: '☪️', color: 'bg-green-600' },
  { id: 'istighfar', name: 'الاستغفار', icon: '🤲', color: 'bg-teal-600' },
  { id: 'ayat_kursi', name: 'آية الكرسي', icon: '📜', color: 'bg-yellow-600' },
];

const SUBCATEGORIES: Record<string, { id: string; name: string }[]> = {
  after_prayer: [
    { id: 'general', name: 'عامة' },
    { id: 'after_fajr', name: 'بعد الفجر' },
    { id: 'after_fajr_maghrib', name: 'بعد الفجر والمغرب' },
  ],
};

const STORAGE_AUDIO_PATH = 'adhkar-audio';
const MAX_AUDIO_SIZE_MB = 15;

// ✅ استخدام raw.githubusercontent لتجنب مشكلة jsDelivr cache
const AZKAR_JSON_URL = 'https://raw.githubusercontent.com/hossam-gamal22/Quran/main/data/json/azkar.json';

// ========================================
// المكون الرئيسي
// ========================================

const AzkarManager: React.FC = () => {
  const [azkarData, setAzkarData] = useState<AzkarData | null>(null);
  const [azkarList, setAzkarList] = useState<Zikr[]>([]);
  const [filteredList, setFilteredList] = useState<Zikr[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [selectedZikr, setSelectedZikr] = useState<Zikr | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingZikr, setEditingZikr] = useState<Zikr | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dataSource, setDataSource] = useState<'github' | 'firestore'>('github');
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'audio'>('list');
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  // ========================================
  // تحميل البيانات
  // ========================================

  useEffect(() => {
    loadAzkarFromGitHub();
  }, []);

  useEffect(() => {
    filterAzkar();
  }, [azkarList, selectedCategory, searchQuery]);

  const filterAzkar = () => {
    let filtered = [...azkarList];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(z => z.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(z =>
        z.arabic?.includes(searchQuery) ||
        z.transliteration?.toLowerCase().includes(query) ||
        z.id?.toString() === query ||
        z.translations?.en?.toLowerCase().includes(query)
      );
    }

    setFilteredList(filtered);
  };

  const loadAzkarFromGitHub = async () => {
    setLoading(true);

    try {
      // إضافة timestamp لتجنب الـ cache
      const url = `${AZKAR_JSON_URL}?t=${Date.now()}`;

      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: AzkarData = await response.json();

      setAzkarData(data);
      setAzkarList(data.azkar || []);
      showNotification(`✅ تم تحميل ${data.azkar?.length || 0} ذكر بنجاح`, 'success');

    } catch (error) {
      console.error('Error loading azkar:', error);
      showNotification('❌ خطأ في تحميل الأذكار', 'error');
    }

    setLoading(false);
  };

  // ========================================
  // الدوال المساعدة
  // ========================================

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
  };

  const playAudio = (url: string) => {
    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(url);
    audio.onended = () => setPlayingAudio(null);
    audio.onerror = () => {
      showNotification('❌ خطأ في تشغيل الصوت', 'error');
      setPlayingAudio(null);
    };
    audio.play();
    setAudioElement(audio);
    setPlayingAudio(url);
  };

  const stopAudio = () => {
    if (audioElement) {
      audioElement.pause();
    }
    setPlayingAudio(null);
  };

  const exportToJson = () => {
    const exportData = {
      version: azkarData?.version || '2.0',
      lastUpdate: new Date().toISOString().split('T')[0],
      totalCount: azkarList.length,
      azkar: azkarList,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `azkar_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification(`📥 تم تصدير ${azkarList.length} ذكر`, 'success');
  };

  // ========================================
  // Firestore CRUD
  // ========================================

  const loadFromFirestore = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'azkar'));
      if (snap.empty) {
        showNotification('لا توجد بيانات في Firestore — استخدم "رفع إلى Firestore" أولاً', 'error');
        setLoading(false);
        return;
      }
      const items = snap.docs.map(d => d.data() as Zikr);
      items.sort((a, b) => a.id - b.id);
      setAzkarList(items);
      setAzkarData({ version: 'firestore', lastUpdate: new Date().toISOString().split('T')[0], totalCount: items.length, azkar: items });
      setDataSource('firestore');
      showNotification(`✅ تم تحميل ${items.length} ذكر من Firestore`, 'success');
    } catch (e) {
      showNotification(`❌ ${(e as Error).message}`, 'error');
    }
    setLoading(false);
  };

  const syncToFirestore = async () => {
    if (!azkarList.length) return;
    if (!confirm(`رفع ${azkarList.length} ذكر إلى Firestore؟ سيتم استبدال البيانات الموجودة.`)) return;
    setIsSyncing(true);
    try {
      const batchSize = 400;
      for (let i = 0; i < azkarList.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = azkarList.slice(i, i + batchSize);
        for (const zikr of chunk) {
          batch.set(doc(db, 'azkar', String(zikr.id)), zikr);
        }
        await batch.commit();
      }
      showNotification(`✅ تم رفع ${azkarList.length} ذكر إلى Firestore`, 'success');
    } catch (e) {
      showNotification(`❌ ${(e as Error).message}`, 'error');
    }
    setIsSyncing(false);
  };

  const saveZikr = async (zikr: Zikr) => {
    try {
      await setDoc(doc(db, 'azkar', String(zikr.id)), zikr);
      setAzkarList(prev => {
        const idx = prev.findIndex(z => z.id === zikr.id);
        if (idx >= 0) return prev.map(z => z.id === zikr.id ? zikr : z);
        return [...prev, zikr].sort((a, b) => a.id - b.id);
      });
      setShowEditModal(false);
      setEditingZikr(null);
      showNotification('✅ تم حفظ الذكر', 'success');
    } catch (e) {
      showNotification(`❌ ${(e as Error).message}`, 'error');
    }
  };

  const deleteZikr = async (id: number) => {
    if (!confirm('هل تريد حذف هذا الذكر؟')) return;
    try {
      await deleteDoc(doc(db, 'azkar', String(id)));
      setAzkarList(prev => prev.filter(z => z.id !== id));
      showNotification('✅ تم حذف الذكر', 'success');
    } catch (e) {
      showNotification(`❌ ${(e as Error).message}`, 'error');
    }
  };

  const openEditZikr = (zikr?: Zikr) => {
    setEditingZikr(zikr || {
      id: Math.max(0, ...azkarList.map(z => z.id)) + 1,
      category: selectedCategory === 'all' ? 'morning' : selectedCategory,
      arabic: '', transliteration: '', translations: {}, count: 1, reference: '', benefit: '', audio: '',
    });
    setShowEditModal(true);
  };

  // ========================================
  // إدارة الصوت
  // ========================================

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>, zikrId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AUDIO_SIZE_MB * 1024 * 1024) {
      showNotification(`❌ حجم الملف أكبر من ${MAX_AUDIO_SIZE_MB} MB`, 'error');
      return;
    }

    if (!file.type.startsWith('audio/')) {
      showNotification('❌ يجب اختيار ملف صوتي', 'error');
      return;
    }

    setIsUploadingAudio(true);
    try {
      const fileName = `zikr_${zikrId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const storageRef = ref(storage, `${STORAGE_AUDIO_PATH}/${fileName}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // Update the zikr
      const updatedZikr = azkarList.find(z => z.id === zikrId);
      if (updatedZikr) {
        const updated = { ...updatedZikr, audio: url };
        await setDoc(doc(db, 'azkar', String(zikrId)), updated);
        setAzkarList(prev => prev.map(z => z.id === zikrId ? updated : z));
      }

      if (editingZikr && editingZikr.id === zikrId) {
        setEditingZikr({ ...editingZikr, audio: url });
      }

      showNotification('✅ تم رفع الصوت بنجاح', 'success');
    } catch (err) {
      showNotification(`❌ خطأ في رفع الصوت: ${(err as Error).message}`, 'error');
    }
    setIsUploadingAudio(false);
    if (e.target) e.target.value = '';
  };

  const removeAudio = async (zikrId: number) => {
    if (!confirm('هل تريد إزالة الصوت من هذا الذكر؟')) return;
    try {
      const zikr = azkarList.find(z => z.id === zikrId);
      if (!zikr) return;

      // Try to delete from Storage if it's a Firebase URL
      if (zikr.audio?.includes('firebasestorage')) {
        try {
          const audioRef = ref(storage, zikr.audio);
          await deleteObject(audioRef);
        } catch { /* ignore if not found */ }
      }

      const updated = { ...zikr, audio: '' };
      await setDoc(doc(db, 'azkar', String(zikrId)), updated);
      setAzkarList(prev => prev.map(z => z.id === zikrId ? updated : z));

      if (editingZikr && editingZikr.id === zikrId) {
        setEditingZikr({ ...editingZikr, audio: '' });
      }

      showNotification('✅ تم إزالة الصوت', 'success');
    } catch (err) {
      showNotification(`❌ ${(err as Error).message}`, 'error');
    }
  };

  const bulkUpdateAudio = async (category: string, audioBaseUrl: string) => {
    const filtered = azkarList.filter(z => z.category === category && !z.audio);
    if (filtered.length === 0) {
      showNotification('لا توجد أذكار بدون صوت في هذه الفئة', 'error');
      return;
    }
    if (!confirm(`تعيين رابط صوت لـ ${filtered.length} ذكر في هذه الفئة؟`)) return;

    try {
      const batch = writeBatch(db);
      const updated: Zikr[] = [];
      filtered.forEach((z, i) => {
        const audioUrl = `${audioBaseUrl}/${z.id}.mp3`;
        const u = { ...z, audio: audioUrl };
        batch.set(doc(db, 'azkar', String(z.id)), u);
        updated.push(u);
      });
      await batch.commit();
      setAzkarList(prev => {
        const map = new Map(updated.map(u => [u.id, u]));
        return prev.map(z => map.get(z.id) || z);
      });
      showNotification(`✅ تم تعيين الصوت لـ ${updated.length} ذكر`, 'success');
    } catch (err) {
      showNotification(`❌ ${(err as Error).message}`, 'error');
    }
  };

  // ========================================
  // الإحصائيات
  // ========================================

  const stats = {
    total: azkarList.length,
    withAudio: azkarList.filter(z => z.audio).length,
    categories: CATEGORIES.length,
    languages: LANGUAGES.length,
    byCategory: CATEGORIES.reduce((acc, cat) => {
      acc[cat.id] = azkarList.filter(z => z.category === cat.id).length;
      return acc;
    }, {} as Record<string, number>),
  };

  const getTranslationCoverage = () => {
    if (azkarList.length === 0) return 0;
    let total = 0;
    azkarList.forEach(z => {
      if (z.translations) {
        total += Object.keys(z.translations).length;
      }
    });
    return Math.round((total / (azkarList.length * LANGUAGES.length)) * 100);
  };

  // ========================================
  // الواجهة
  // ========================================

  return (
    <div className="space-y-6" dir="rtl">
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 p-4 rounded-xl shadow-lg z-50 ${
          notification.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
        } text-white font-medium`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة الأذكار والأدعية</h1>
          <p className="text-slate-400 text-sm mt-1">
            {azkarData && (
              <span>الإصدار: {azkarData.version} | آخر تحديث: {azkarData.lastUpdate} | المصدر: {dataSource === 'firestore' ? 'Firestore' : 'GitHub'}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => openEditZikr()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة ذكر
          </button>
          <button
            onClick={syncToFirestore}
            disabled={isSyncing || azkarList.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl disabled:opacity-50 transition-colors"
          >
            <Upload className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            رفع إلى Firestore
          </button>
          <button
            onClick={loadFromFirestore}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            تحميل من Firestore
          </button>
          <button
            onClick={loadAzkarFromGitHub}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
          <button
            onClick={exportToJson}
            disabled={azkarList.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            تصدير
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl text-white">
          <p className="text-sm opacity-80">إجمالي الأذكار</p>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-xl text-white">
          <p className="text-sm opacity-80">مع صوت</p>
          <p className="text-3xl font-bold">{stats.withAudio}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl text-white">
          <p className="text-sm opacity-80">الفئات</p>
          <p className="text-3xl font-bold">{stats.categories}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-4 rounded-xl text-white">
          <p className="text-sm opacity-80">اللغات</p>
          <p className="text-3xl font-bold">{stats.languages}</p>
        </div>
        <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-4 rounded-xl text-white">
          <p className="text-sm opacity-80">تغطية الترجمة</p>
          <p className="text-3xl font-bold">{getTranslationCoverage()}%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
            activeTab === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <Search className="w-4 h-4" />
          قائمة الأذكار
        </button>
        <button
          onClick={() => setActiveTab('audio')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
            activeTab === 'audio' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <Music className="w-4 h-4" />
          إدارة الصوتيات ({stats.withAudio}/{stats.total})
        </button>
      </div>

      {/* ======= AUDIO TAB ======= */}
      {activeTab === 'audio' && (
        <div className="space-y-6">
          {/* Audio Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl">
              <p className="text-emerald-400 text-sm">مع صوت</p>
              <p className="text-2xl font-bold text-white">{stats.withAudio}</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
              <p className="text-red-400 text-sm">بدون صوت</p>
              <p className="text-2xl font-bold text-white">{stats.total - stats.withAudio}</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl">
              <p className="text-blue-400 text-sm">نسبة التغطية</p>
              <p className="text-2xl font-bold text-white">{stats.total ? Math.round((stats.withAudio / stats.total) * 100) : 0}%</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl">
              <p className="text-amber-400 text-sm">الفئات</p>
              <p className="text-2xl font-bold text-white">{CATEGORIES.length}</p>
            </div>
          </div>

          {/* Audio by Category */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-white font-medium mb-4">الصوتيات حسب الفئة</h3>
            <div className="space-y-3">
              {CATEGORIES.map(cat => {
                const catAzkar = azkarList.filter(z => z.category === cat.id);
                const withAudio = catAzkar.filter(z => z.audio);
                const percentage = catAzkar.length ? Math.round((withAudio.length / catAzkar.length) * 100) : 0;
                return (
                  <div key={cat.id} className="bg-slate-900/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white">{cat.icon} {cat.name}</span>
                      <span className="text-slate-400 text-sm">{withAudio.length}/{catAzkar.length} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className={`${cat.color} h-2 rounded-full transition-all`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audio List - show azkar with audio for management */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="text-white font-medium">الأذكار الصوتية</h3>
              <div className="flex gap-2">
                  <select
                  className="bg-slate-700 text-white rounded-lg px-3 py-1.5 text-sm border border-slate-600"
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  aria-label="فلتر الفئة"
                  title="فلتر الفئة"
                >
                  <option value="all">كل الفئات</option>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="divide-y divide-slate-700/50 max-h-[600px] overflow-y-auto">
              {filteredList.map(zikr => (
                <div key={zikr.id} className="p-3 hover:bg-slate-700/20 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm leading-relaxed line-clamp-2">{zikr.arabic}</p>
                      <p className="text-slate-500 text-xs mt-1">#{zikr.id} • {CATEGORIES.find(c => c.id === zikr.category)?.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {zikr.audio ? (
                        <>
                          <button
                            onClick={() => playingAudio === zikr.audio ? stopAudio() : playAudio(zikr.audio)}
                            className={`p-2 rounded-lg transition-colors ${
                              playingAudio === zikr.audio ? 'bg-red-500 text-white' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            }`}
                            aria-label={playingAudio === zikr.audio ? 'إيقاف' : 'تشغيل'}
                            title={playingAudio === zikr.audio ? 'إيقاف' : 'تشغيل'}
                          >
                            {playingAudio === zikr.audio ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => removeAudio(zikr.id)}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                            aria-label="إزالة الصوت"
                            title="إزالة الصوت"
                          >
                            <VolumeX className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <label className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors cursor-pointer" title="رفع صوت" aria-label="رفع صوت">
                          <Volume2 className="w-4 h-4" />
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            aria-label="رفع ملف صوتي"
                            title="رفع ملف صوتي"
                            onChange={e => handleAudioUpload(e, zikr.id)}
                            disabled={isUploadingAudio}
                          />
                        </label>
                      )}
                      <button
                        onClick={() => openEditZikr(zikr)}
                        className="p-2 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors"
                        aria-label="تعديل"
                        title="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'list' && (<>
      {/* Category Filter */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <h3 className="text-white font-medium mb-3">توزيع الأذكار على الفئات</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`p-3 rounded-lg transition-all ${
              selectedCategory === 'all'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>📿 الكل</span>
              <span className="font-bold">{stats.total}</span>
            </div>
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? 'all' : cat.id)}
              className={`p-3 rounded-lg transition-all ${
                selectedCategory === cat.id
                  ? `${cat.color} text-white`
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{cat.icon} {cat.name}</span>
                <span className="font-bold">{stats.byCategory[cat.id] || 0}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          aria-label="بحث في الأذكار"
          placeholder="بحث بالنص العربي أو الإنجليزي..."
          className="w-full bg-slate-800/50 text-white px-4 py-3 pr-10 rounded-xl border border-slate-700/50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {/* Results Count */}
      <div className="text-slate-400">
        عرض {filteredList.length} من {azkarList.length} ذكر
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
          <p className="text-slate-400">جاري تحميل الأذكار...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-slate-800/50 rounded-xl p-12 text-center border border-slate-700/50">
          <FileJson className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg mb-4">
            {azkarList.length === 0 ? 'لا توجد أذكار' : 'لا توجد نتائج'}
          </p>
          <button
            onClick={loadAzkarFromGitHub}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors"
          >
            إعادة التحميل
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-700/50">
                  <th className="text-right text-white p-3 font-medium w-16">#</th>
                  <th className="text-right text-white p-3 font-medium w-32">الفئة</th>
                  <th className="text-right text-white p-3 font-medium">النص العربي</th>
                  <th className="text-right text-white p-3 font-medium w-20">التكرار</th>
                  <th className="text-right text-white p-3 font-medium w-24">صوت</th>
                  <th className="text-right text-white p-3 font-medium w-24">تفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map(zikr => {
                  const category = CATEGORIES.find(c => c.id === zikr.category);
                  return (
                    <tr key={zikr.id} className="border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="p-3 text-slate-300 font-mono">{zikr.id}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 ${category?.color || 'bg-slate-600'} text-white rounded text-xs`}>
                          {category?.icon} {category?.name || zikr.category}
                        </span>
                      </td>
                      <td className="p-3">
                        <p className="text-white text-base leading-relaxed max-w-xl line-clamp-2">
                          {zikr.arabic}
                        </p>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-slate-600 text-white rounded text-sm">
                          {zikr.count}x
                        </span>
                      </td>
                      <td className="p-3">
                        {zikr.audio ? (
                          <button
                            onClick={() => playingAudio === zikr.audio ? stopAudio() : playAudio(zikr.audio)}
                            className={`p-2 rounded-lg transition-colors ${
                              playingAudio === zikr.audio
                                ? 'bg-red-500 text-white'
                                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            }`}
                            aria-label={playingAudio === zikr.audio ? 'إيقاف' : 'تشغيل'}
                            title={playingAudio === zikr.audio ? 'إيقاف' : 'تشغيل'}
                          >
                            {playingAudio === zikr.audio ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setSelectedZikr(zikr);
                              setShowDetailModal(true);
                            }}
                            className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                            aria-label="عرض"
                            title="عرض"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditZikr(zikr)}
                            className="p-2 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors"
                            aria-label="تعديل"
                            title="تعديل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditZikr({ ...zikr, id: Math.max(0, ...azkarList.map(z => z.id)) + 1, arabic: zikr.arabic + ' (نسخة)' })}
                            className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors"
                            aria-label="تكرار"
                            title="تكرار"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteZikr(zikr.id)}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                            aria-label="حذف"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>)}

      {/* Detail Modal */}
      {showDetailModal && selectedZikr && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-slate-700">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">تفاصيل الذكر #{selectedZikr.id}</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-white" aria-label="إغلاق" title="إغلاق">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] space-y-6">
              {/* Arabic Text */}
              <div>
                <h3 className="text-emerald-400 font-medium mb-2">النص العربي</h3>
                <p className="text-white text-xl leading-loose bg-slate-900 p-4 rounded-xl">
                  {selectedZikr.arabic}
                </p>
              </div>

              {/* Transliteration */}
              {selectedZikr.transliteration && (
                <div>
                  <h3 className="text-emerald-400 font-medium mb-2">النطق</h3>
                  <p className="text-slate-300 bg-slate-900 p-4 rounded-xl italic" dir="ltr">
                    {selectedZikr.transliteration}
                  </p>
                </div>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 p-3 rounded-xl">
                  <p className="text-slate-400 text-sm">الفئة</p>
                  <p className="text-white">{CATEGORIES.find(c => c.id === selectedZikr.category)?.name}</p>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl">
                  <p className="text-slate-400 text-sm">التكرار</p>
                  <p className="text-white">{selectedZikr.count} مرة</p>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl">
                  <p className="text-slate-400 text-sm">المصدر</p>
                  <p className="text-white text-sm">{selectedZikr.reference || '—'}</p>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl">
                  <p className="text-slate-400 text-sm">صوت</p>
                  <p className="text-white">{selectedZikr.audio ? '✅ متوفر' : '❌ غير متوفر'}</p>
                </div>
              </div>

              {/* Benefit */}
              {selectedZikr.benefit && (
                <div>
                  <h3 className="text-emerald-400 font-medium mb-2">الفائدة</h3>
                  <p className="text-amber-300 bg-slate-900 p-4 rounded-xl">
                    {typeof selectedZikr.benefit === 'string' ? selectedZikr.benefit : selectedZikr.benefit?.ar || ''}
                  </p>
                </div>
              )}

              {/* Audio */}
              {selectedZikr.audio && (
                <div>
                  <h3 className="text-emerald-400 font-medium mb-2">الصوت</h3>
                  <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-xl">
                    <button
                      onClick={() => playingAudio === selectedZikr.audio ? stopAudio() : playAudio(selectedZikr.audio)}
                      className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                        playingAudio === selectedZikr.audio
                          ? 'bg-red-500 text-white'
                          : 'bg-emerald-500 text-white hover:bg-emerald-600'
                      }`}
                    >
                      {playingAudio === selectedZikr.audio ? '⏹️ إيقاف' : '▶️ تشغيل'}
                    </button>
                  </div>
                </div>
              )}

              {/* Translations */}
              <div>
                <h3 className="text-emerald-400 font-medium mb-3">
                  الترجمات ({Object.keys(selectedZikr.translations || {}).length} لغة)
                </h3>
                <div className="space-y-3">
                  {LANGUAGES.map(lang => {
                    const translation = selectedZikr.translations?.[lang.code];
                    if (!translation) return null;
                    return (
                      <div key={lang.code} className="bg-slate-900 p-4 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{lang.flag}</span>
                          <span className="text-slate-400 font-medium">{lang.name}</span>
                        </div>
                        <p className="text-slate-300" dir={lang.code === 'ar' || lang.code === 'ur' ? 'rtl' : 'ltr'}>
                          {translation}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingZikr && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">
                {azkarList.find(z => z.id === editingZikr.id) ? 'تعديل ذكر' : 'إضافة ذكر جديد'}
              </h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white" aria-label="إغلاق" title="إغلاق"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-300 text-sm block mb-1">النص العربي *</label>
                <textarea className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" rows={3} dir="rtl" value={editingZikr.arabic} onChange={e => setEditingZikr({ ...editingZikr, arabic: e.target.value })} aria-label="النص العربي" placeholder="نص الذكر بالعربية" />
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">النطق</label>
                <input className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" value={editingZikr.transliteration} onChange={e => setEditingZikr({ ...editingZikr, transliteration: e.target.value })} aria-label="النطق" placeholder="Transliteration" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-1">الفئة</label>
                  <select className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" aria-label="الفئة" title="الفئة" value={editingZikr.category} onChange={e => setEditingZikr({ ...editingZikr, category: e.target.value, subcategory: undefined })}>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {SUBCATEGORIES[editingZikr.category] && (
                  <div>
                    <label className="text-slate-300 text-sm block mb-1">الفئة الفرعية</label>
                    <select className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" aria-label="الفئة الفرعية" title="الفئة الفرعية" value={editingZikr.subcategory || 'general'} onChange={e => setEditingZikr({ ...editingZikr, subcategory: e.target.value })}>
                      {SUBCATEGORIES[editingZikr.category].map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-slate-300 text-sm block mb-1">العدد</label>
                  <input type="number" min={1} className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" aria-label="العدد" placeholder="العدد" value={editingZikr.count} onChange={e => setEditingZikr({ ...editingZikr, count: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">المرجع</label>
                  <input className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" dir="rtl" value={editingZikr.reference} onChange={e => setEditingZikr({ ...editingZikr, reference: e.target.value })} aria-label="المرجع" placeholder="صحيح البخاري" />
                </div>
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">الفائدة</label>
                <textarea className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" rows={2} dir="rtl" value={typeof editingZikr.benefit === 'string' ? editingZikr.benefit : (editingZikr.benefit?.ar || '')} onChange={e => setEditingZikr({ ...editingZikr, benefit: e.target.value })} aria-label="الفائدة" placeholder="فائدة الذكر" />
              </div>

              {/* Translate benefit to all languages */}
              <TranslateButton
                sourceText={typeof editingZikr.benefit === 'string' ? editingZikr.benefit : (editingZikr.benefit?.ar || '')}
                sourceLang="ar"
                contentType="adhkar"
                compact
                label="🌐 ترجمة الفائدة"
                onTranslated={(translations) => setEditingZikr({ ...editingZikr, benefit: translations })}
              />
              {/* Audio Section */}
              <div>
                <label className="text-slate-300 text-sm block mb-2">الصوت</label>
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 space-y-3">
                  {editingZikr.audio ? (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => playingAudio === editingZikr.audio ? stopAudio() : playAudio(editingZikr.audio)}
                        className={`p-2 rounded-lg transition-colors ${
                          playingAudio === editingZikr.audio ? 'bg-red-500 text-white' : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                        aria-label={playingAudio === editingZikr.audio ? 'إيقاف' : 'تشغيل'}
                        title={playingAudio === editingZikr.audio ? 'إيقاف' : 'تشغيل'}
                      >
                        {playingAudio === editingZikr.audio ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <input
                        className="flex-1 bg-slate-900 text-white rounded-lg px-3 py-1.5 border border-slate-600 font-mono text-xs"
                        value={editingZikr.audio}
                        onChange={e => setEditingZikr({ ...editingZikr, audio: e.target.value })}
                        aria-label="رابط الصوت"
                        placeholder="رابط الصوت"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingZikr({ ...editingZikr, audio: '' })}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                        aria-label="إزالة الصوت"
                        title="إزالة الصوت"
                      >
                        <VolumeX className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">لا يوجد صوت</p>
                  )}
                  <div className="flex gap-2">
                    <label className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg cursor-pointer hover:bg-blue-600/30 transition-colors text-sm">
                      <Upload className="w-3.5 h-3.5" />
                      رفع ملف صوتي
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        title="رفع ملف صوتي"
                        onChange={e => handleAudioUpload(e, editingZikr.id)}
                        disabled={isUploadingAudio}
                      />
                    </label>
                    {isUploadingAudio && <span className="text-amber-400 text-sm animate-pulse">جاري الرفع...</span>}
                  </div>
                </div>
              </div>

              {/* Translation fields */}
              <div>
                <label className="text-slate-300 text-sm block mb-2">الترجمات</label>

                {/* Auto-translate */}
                <AutoTranslateField
                  label="ترجمة تلقائية"
                  fieldName="translations"
                  contentType="adhkar"
                  arabicText={editingZikr.arabic}
                  initialValues={editingZikr.translations}
                  onSave={(translations) => setEditingZikr({ ...editingZikr, translations: { ...editingZikr.translations, ...translations } })}
                />

                <div className="grid grid-cols-2 gap-3 mt-4">
                  {LANGUAGES.filter(l => l.code !== 'ar').map(lang => (
                    <div key={lang.code}>
                      <label className="text-slate-400 text-xs block mb-1">{lang.flag} {lang.name}</label>
                      <textarea className="w-full bg-slate-800 text-white rounded-lg px-3 py-1.5 border border-slate-700 text-sm" rows={2} dir={lang.code === 'ur' ? 'rtl' : 'ltr'} value={editingZikr.translations?.[lang.code] || ''} onChange={e => setEditingZikr({ ...editingZikr, translations: { ...editingZikr.translations, [lang.code]: e.target.value } })} aria-label={`ترجمة ${lang.name}`} placeholder={lang.name} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => saveZikr(editingZikr)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">
                <Save className="w-4 h-4" /> حفظ
              </button>
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2.5 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AzkarManager;
