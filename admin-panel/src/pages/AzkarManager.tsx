// admin-panel/src/pages/AzkarManager.tsx
import React, { useState, useEffect } from 'react';
import { 
  Download, RefreshCw, Play, Square, Search, FileJson
} from 'lucide-react';

// الأنواع
interface Zikr {
  id: number;
  category: string;
  arabic: string;
  transliteration: string;
  translations: Record<string, string>;
  count: number;
  reference: string;
  benefit: string;
  audio: string;
}

interface AzkarData {
  version: string;
  lastUpdate: string;
  totalCount: number;
  azkar: Zikr[];
}

// اللغات المدعومة
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

// ✅ استخدام jsDelivr CDN بدل raw.githubusercontent (يحل مشكلة CORS)
const AZKAR_JSON_URL = 'https://cdn.jsdelivr.net/gh/hossam-gamal22/Quran@main/data/json/azkar.json';

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
  const [notification, setNotification] = useState<{show: boolean; message: string; type: 'success' | 'error'}>({show: false, message: '', type: 'success'});
  const [dataSource, setDataSource] = useState<'github' | 'local'>('github');

  useEffect(() => {
    loadAzkarFromGitHub();
  }, []);

  useEffect(() => {
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
  }, [azkarList, selectedCategory, searchQuery]);

  const loadAzkarFromGitHub = async () => {
    setLoading(true);
    try {
      const response = await fetch(AZKAR_JSON_URL, {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: AzkarData = await response.json();
      setAzkarData(data);
      setAzkarList(data.azkar || []);
      setDataSource('github');
      showNotification(`✅ تم تحميل ${data.azkar?.length || 0} ذكر من GitHub`, 'success');
    } catch (error) {
      console.error('Error loading azkar:', error);
      showNotification('❌ خطأ في تحميل الأذكار - تأكد من الاتصال بالإنترنت', 'error');
    }
    setLoading(false);
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
  };

  const playAudio = (url: string) => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
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
      audioElement.currentTime = 0;
    }
    setPlayingAudio(null);
  };

  const exportToJson = () => {
    const exportData = {
      version: azkarData?.version || "2.0",
      lastUpdate: new Date().toISOString().split('T')[0],
      totalCount: azkarList.length,
      azkar: azkarList
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `azkar_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification(`📥 تم تصدير ${azkarList.length} ذكر`, 'success');
  };

  const viewZikrDetails = (zikr: Zikr) => {
    setSelectedZikr(zikr);
    setShowDetailModal(true);
  };

  const stats = {
    total: azkarList.length,
    withAudio: azkarList.filter(z => z.audio && z.audio.length > 0).length,
    categories: CATEGORIES.length,
    languages: LANGUAGES.length,
    byCategory: CATEGORIES.reduce((acc, cat) => {
      acc[cat.id] = azkarList.filter(z => z.category === cat.id).length;
      return acc;
    }, {} as Record<string, number>)
  };

  const getTranslationCoverage = () => {
    if (azkarList.length === 0) return 0;
    let totalTranslations = 0;
    azkarList.forEach(z => {
      if (z.translations) {
        totalTranslations += Object.keys(z.translations).length;
      }
    });
    return Math.round((totalTranslations / (azkarList.length * LANGUAGES.length)) * 100);
  };

  return (
    <div className="p-6 min-h-screen" dir="rtl">
      {notification.show && (
        <div className={`fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 p-4 rounded-xl shadow-lg z-50 ${
          notification.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
        } text-white font-medium`}>
          {notification.message}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">🕌 إدارة الأذكار والأدعية</h1>
          <p className="text-slate-400 text-sm mt-1">
            📂 مصدر البيانات: <span className="text-emerald-400">{dataSource === 'github' ? 'GitHub (jsDelivr CDN)' : 'Local'}</span>
            {azkarData && <span className="mr-2">| الإصدار: {azkarData.version} | آخر تحديث: {azkarData.lastUpdate}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadAzkarFromGitHub}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث من GitHub
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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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

      <div className="bg-slate-800 rounded-xl p-4 mb-6">
        <h3 className="text-white font-medium mb-3">📊 توزيع الأذكار على الفئات</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CATEGORIES.map(cat => (
            <div 
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? 'all' : cat.id)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                selectedCategory === cat.id 
                  ? `${cat.color} text-white` 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{cat.icon} {cat.name}</span>
                <span className="font-bold">{stats.byCategory[cat.id] || 0}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-700 text-white px-4 py-2 rounded-xl border-none min-w-[200px] focus:ring-2 focus:ring-emerald-500"
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
              placeholder="بحث بالنص العربي أو الإنجليزي أو الرقم..."
              className="w-full bg-slate-700 text-white px-4 py-2 pr-10 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      <div className="mb-4 text-slate-400">
        عرض {filteredList.length} من {azkarList.length} ذكر
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-800 rounded-xl">
          <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
          <p className="text-slate-400">جاري تحميل الأذكار...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <FileJson className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg mb-4">
            {azkarList.length === 0 ? 'لا توجد أذكار - تأكد من الاتصال بالإنترنت' : 'لا توجد نتائج للبحث'}
          </p>
          <button
            onClick={loadAzkarFromGitHub}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-700">
                  <th className="text-right text-white p-3 font-medium w-16">#</th>
                  <th className="text-right text-white p-3 font-medium w-32">الفئة</th>
                  <th className="text-right text-white p-3 font-medium">النص العربي</th>
                  <th className="text-right text-white p-3 font-medium w-20">التكرار</th>
                  <th className="text-right text-white p-3 font-medium w-24">صوت</th>
                  <th className="text-right text-white p-3 font-medium w-24">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((zikr) => {
                  const category = CATEGORIES.find(c => c.id === zikr.category);
                  return (
                    <tr key={zikr.id} className="border-t border-slate-700 hover:bg-slate-700/50 transition-colors">
                      <td className="p-3 text-slate-300 font-mono">{zikr.id}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 ${category?.color || 'bg-slate-600'} text-white rounded text-xs`}>
                          {category?.icon} {category?.name || zikr.category}
                        </span>
                      </td>
                      <td className="p-3">
                        <p className="text-white font-arabic text-base leading-relaxed max-w-xl line-clamp-2" dir="rtl">
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
                          >
                            {playingAudio === zikr.audio ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                        ) : (
                          <span className="text-slate-500 text-sm">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => viewZikrDetails(zikr)}
                          className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Search className="w-4 h-4" />
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

      {showDetailModal && selectedZikr && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900">
              <h2 className="text-lg font-bold text-white">📖 تفاصيل الذكر #{selectedZikr.id}</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="mb-6">
                <h3 className="text-emerald-400 font-medium mb-2">النص العربي</h3>
                <p className="text-white text-xl font-arabic leading-loose bg-slate-900 p-4 rounded-xl" dir="rtl">
                  {selectedZikr.arabic}
                </p>
              </div>

              {selectedZikr.transliteration && (
                <div className="mb-6">
                  <h3 className="text-emerald-400 font-medium mb-2">النطق</h3>
                  <p className="text-slate-300 bg-slate-900 p-4 rounded-xl italic" dir="ltr">
                    {selectedZikr.transliteration}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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

              {selectedZikr.benefit && (
                <div className="mb-6">
                  <h3 className="text-emerald-400 font-medium mb-2">الفائدة</h3>
                  <p className="text-amber-300 bg-slate-900 p-4 rounded-xl" dir="rtl">
                    {selectedZikr.benefit}
                  </p>
                </div>
              )}

              {selectedZikr.audio && (
                <div className="mb-6">
                  <h3 className="text-emerald-400 font-medium mb-2">🔊 الصوت</h3>
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
                    <span className="text-slate-400 text-sm truncate flex-1" dir="ltr">
                      {selectedZikr.audio}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-emerald-400 font-medium mb-3">🌍 الترجمات ({Object.keys(selectedZikr.translations || {}).length} لغة)</h3>
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
    </div>
  );
};

export default AzkarManager;
