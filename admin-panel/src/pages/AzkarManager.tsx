// admin-panel/src/pages/AzkarManager.tsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Download, RefreshCw, Play, Square, 
  Upload, Search, ChevronDown, ChevronUp, ExternalLink,
  CheckCircle, Volume2, FileAudio
} from 'lucide-react';
import { db, storage } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// الأنواع
interface Translation {
  text: string;
  source: string;
  verified: boolean;
}

interface Zikr {
  id?: string;
  numericId: number;
  hisnNumber: number;
  category: string;
  arabic: string;
  transliteration: string;
  translations: Record<string, Translation>;
  count: number;
  reference: string;
  benefit: string;
  audio: string;
  audioSource: string;
}

// اللغات المدعومة
const LANGUAGES = [
  { code: 'ar', name: 'العربية', dir: 'rtl', flag: '🇸🇦' },
  { code: 'en', name: 'English', dir: 'ltr', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', dir: 'ltr', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', dir: 'ltr', flag: '🇩🇪' },
  { code: 'hi', name: 'हिन्दी', dir: 'ltr', flag: '🇮🇳' },
  { code: 'id', name: 'Indonesia', dir: 'ltr', flag: '🇮🇩' },
  { code: 'ms', name: 'Melayu', dir: 'ltr', flag: '🇲🇾' },
  { code: 'tr', name: 'Türkçe', dir: 'ltr', flag: '🇹🇷' },
  { code: 'ur', name: 'اردو', dir: 'rtl', flag: '🇵🇰' },
  { code: 'bn', name: 'বাংলা', dir: 'ltr', flag: '🇧🇩' },
  { code: 'es', name: 'Español', dir: 'ltr', flag: '🇪🇸' },
  { code: 'ru', name: 'Русский', dir: 'ltr', flag: '🇷🇺' },
];

// الفئات
const CATEGORIES = [
  { id: 'morning', name: 'أذكار الصباح', icon: '🌅', color: 'bg-amber-500' },
  { id: 'evening', name: 'أذكار المساء', icon: '🌆', color: 'bg-purple-500' },
  { id: 'sleep', name: 'أذكار النوم', icon: '🌙', color: 'bg-blue-500' },
  { id: 'wakeup', name: 'أذكار الاستيقاظ', icon: '☀️', color: 'bg-emerald-500' },
  { id: 'after_prayer', name: 'أذكار بعد الصلاة', icon: '🕌', color: 'bg-pink-500' },
  { id: 'quran_duas', name: 'أدعية من القرآن', icon: '📖', color: 'bg-teal-500' },
  { id: 'sunnah_duas', name: 'أدعية من السنة', icon: '⭐', color: 'bg-orange-500' },
  { id: 'ruqya', name: 'الرقية الشرعية', icon: '🛡️', color: 'bg-indigo-500' },
];

const AzkarManager: React.FC = () => {
  const [azkarList, setAzkarList] = useState<Zikr[]>([]);
  const [filteredList, setFilteredList] = useState<Zikr[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [notification, setNotification] = useState<{show: boolean; message: string; type: 'success' | 'error'}>({show: false, message: '', type: 'success'});

  // تحميل البيانات
  useEffect(() => {
    loadAzkar();
  }, []);

  // فلترة
  useEffect(() => {
    let filtered = [...azkarList];
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(z => z.category === selectedCategory);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(z =>
        z.arabic?.includes(query) ||
        z.transliteration?.toLowerCase().includes(query) ||
        z.hisnNumber?.toString() === query
      );
    }
    setFilteredList(filtered);
  }, [azkarList, selectedCategory, searchQuery]);

  const loadAzkar = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'azkar'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Zikr));
      setAzkarList(data.sort((a, b) => a.numericId - b.numericId));
      showNotification(`تم تحميل ${data.length} ذكر`, 'success');
    } catch (error) {
      console.error('Error loading azkar:', error);
      showNotification('خطأ في تحميل الأذكار', 'error');
    }
    setLoading(false);
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
  };

  // تشغيل الصوت
  const playAudio = (url: string) => {
    if (audioElement) audioElement.pause();
    const audio = new Audio(url);
    audio.onended = () => setPlayingAudio(null);
    audio.onerror = () => {
      showNotification('خطأ في تشغيل الصوت', 'error');
      setPlayingAudio(null);
    };
    audio.play();
    setAudioElement(audio);
    setPlayingAudio(url);
  };

  const stopAudio = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    setPlayingAudio(null);
  };

  // تصدير JSON
  const exportToJson = () => {
    const exportData = {
      version: "2.0",
      lastUpdate: new Date().toISOString().split('T')[0],
      totalCount: azkarList.length,
      azkar: azkarList
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `azkar_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showNotification(`تم تصدير ${azkarList.length} ذكر`, 'success');
  };

  // استيراد JSON
  const handleImport = async () => {
    try {
      const data = JSON.parse(importJson);
      if (!data.azkar || !Array.isArray(data.azkar)) {
        showNotification('صيغة JSON غير صحيحة', 'error');
        return;
      }

      const batch = writeBatch(db);
      let count = 0;

      for (const zikr of data.azkar) {
        const docRef = doc(collection(db, 'azkar'));
        
        // تحويل الترجمات
        const translations: Record<string, Translation> = {};
        if (zikr.translations) {
          Object.entries(zikr.translations).forEach(([lang, value]) => {
            if (typeof value === 'string') {
              translations[lang] = { text: value, source: 'Imported', verified: false };
            } else if (typeof value === 'object' && value !== null) {
              translations[lang] = {
                text: (value as any).text || (value as any) || '',
                source: (value as any).source || 'Imported',
                verified: (value as any).verified || false
              };
            }
          });
        }

        batch.set(docRef, {
          numericId: zikr.id || count + 1,
          hisnNumber: zikr.hisnNumber || 0,
          category: zikr.category || 'morning',
          arabic: zikr.arabic || '',
          transliteration: zikr.transliteration || '',
          translations,
          count: zikr.count || 1,
          reference: zikr.reference || '',
          benefit: zikr.benefit || '',
          audio: zikr.audio || '',
          audioSource: zikr.audioSource || 'Archive.org',
          createdAt: new Date(),
        });
        count++;
      }

      await batch.commit();
      showNotification(`تم استيراد ${count} ذكر بنجاح`, 'success');
      setShowImportModal(false);
      setImportJson('');
      loadAzkar();
    } catch (error) {
      console.error('Import error:', error);
      showNotification('خطأ في الاستيراد - تأكد من صحة JSON', 'error');
    }
  };

  // حذف ذكر
  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      await deleteDoc(doc(db, 'azkar', id));
      showNotification('تم الحذف', 'success');
      loadAzkar();
    } catch (error) {
      showNotification('خطأ في الحذف', 'error');
    }
  };

  // الإحصائيات
  const stats = {
    total: azkarList.length,
    withAudio: azkarList.filter(z => z.audio).length,
    byCategory: CATEGORIES.reduce((acc, cat) => {
      acc[cat.id] = azkarList.filter(z => z.category === cat.id).length;
      return acc;
    }, {} as Record<string, number>)
  };

  return (
    <div className="p-6" dir="rtl">
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 p-4 rounded-xl shadow-lg z-50 ${
          notification.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
        } text-white`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-white">🕌 إدارة الأذكار والأدعية</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl"
          >
            <Upload className="w-4 h-4" />
            استيراد
          </button>
          <button
            onClick={exportToJson}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl"
          >
            <Download className="w-4 h-4" />
            تصدير
          </button>
          <button
            onClick={loadAzkar}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-500 p-4 rounded-xl text-white">
          <p className="text-sm opacity-80">إجمالي الأذكار</p>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-emerald-500 p-4 rounded-xl text-white">
          <p className="text-sm opacity-80">مع صوت</p>
          <p className="text-3xl font-bold">{stats.withAudio}</p>
        </div>
        <div className="bg-purple-500 p-4 rounded-xl text-white">
          <p className="text-sm opacity-80">الفئات</p>
          <p className="text-3xl font-bold">{CATEGORIES.length}</p>
        </div>
        <div className="bg-amber-500 p-4 rounded-xl text-white">
          <p className="text-sm opacity-80">اللغات</p>
          <p className="text-3xl font-bold">{LANGUAGES.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-700 text-white px-4 py-2 rounded-xl border-none min-w-[200px]"
        >
          <option value="all">جميع الفئات ({stats.total})</option>
          {CATEGORIES.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.name} ({stats.byCategory[cat.id] || 0})
            </option>
          ))}
        </select>
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث..."
              className="w-full bg-slate-700 text-white px-4 py-2 pr-10 rounded-xl border-none"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <p className="text-slate-400 text-lg mb-4">
            {azkarList.length === 0 ? 'لا توجد أذكار - قم باستيراد ملف JSON' : 'لا توجد نتائج'}
          </p>
          {azkarList.length === 0 && (
            <button
              onClick={() => setShowImportModal(true)}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
            >
              استيراد الأذكار
            </button>
          )}
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-700">
                  <th className="text-right text-white p-3 font-medium">#</th>
                  <th className="text-right text-white p-3 font-medium">حصن</th>
                  <th className="text-right text-white p-3 font-medium">الفئة</th>
                  <th className="text-right text-white p-3 font-medium">النص العربي</th>
                  <th className="text-right text-white p-3 font-medium">صوت</th>
                  <th className="text-right text-white p-3 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((zikr) => {
                  const category = CATEGORIES.find(c => c.id === zikr.category);
                  return (
                    <tr key={zikr.id} className="border-t border-slate-700 hover:bg-slate-700/50">
                      <td className="p-3 text-slate-300">{zikr.numericId}</td>
                      <td className="p-3">
                        {zikr.hisnNumber > 0 ? (
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">
                            {zikr.hisnNumber}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 ${category?.color || 'bg-slate-600'} text-white rounded text-sm`}>
                          {category?.icon} {category?.name || zikr.category}
                        </span>
                      </td>
                      <td className="p-3">
                        <p className="text-white font-arabic text-lg max-w-md truncate" dir="rtl">
                          {zikr.arabic}
                        </p>
                      </td>
                      <td className="p-3">
                        {zikr.audio ? (
                          <button
                            onClick={() => playingAudio === zikr.audio ? stopAudio() : playAudio(zikr.audio)}
                            className={`p-2 rounded-lg ${
                              playingAudio === zikr.audio 
                                ? 'bg-red-500 text-white' 
                                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            }`}
                          >
                            {playingAudio === zikr.audio ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleDelete(zikr.id!)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">📥 استيراد الأذكار من JSON</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <p className="text-slate-400 text-sm mb-4">
                الصق محتوى ملف azkar.json هنا (يجب أن يحتوي على مصفوفة "azkar")
              </p>
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='{"azkar": [...]}'
                className="w-full h-64 bg-slate-700 text-white p-4 rounded-xl font-mono text-sm resize-none"
                dir="ltr"
              />
            </div>
            <div className="p-4 border-t border-slate-700 flex gap-2 justify-end">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl"
              >
                إلغاء
              </button>
              <button
                onClick={handleImport}
                disabled={!importJson.trim()}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl disabled:opacity-50"
              >
                استيراد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AzkarManager;
