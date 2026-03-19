// admin-panel/src/pages/AppContentManager.tsx
// إدارة محتوى التطبيق - الأيقونات والعناوين والأسماء بجميع اللغات

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Save, X, Eye, Upload, Download, Edit2, Globe, Image, Copy,
  Type, Filter, ChevronDown, CheckCircle, AlertCircle, RefreshCw,
  Smartphone,
} from 'lucide-react';
import AutoTranslateField from '../components/AutoTranslateField';
import { db, storage } from '../firebase';
import {
  collection, getDocs, doc, setDoc, updateDoc, deleteDoc,
  query, orderBy, writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// ========================================
// Types
// ========================================

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
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', rtl: false },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾', rtl: false },
] as const;

type LangCode = typeof SUPPORTED_LANGUAGES[number]['code'];

interface AppContentItem {
  id: string;
  key: string;
  type: 'text' | 'icon';
  screen: string;
  translations: Record<string, string>;
  iconUrl?: string;
  updatedAt: Date;
}

// Default app content items
const DEFAULT_CONTENT_ITEMS: Omit<AppContentItem, 'id' | 'updatedAt'>[] = [
  // Tab names
  { key: 'tab_home', type: 'text', screen: 'tabs', translations: { ar: 'الأذكار', en: 'Azkar', fr: 'Azkar', tr: 'Zikirler', ur: 'اذکار', id: 'Dzikir', bn: 'যিকির', de: 'Dhikr', es: 'Dhikr', ru: 'Зикр', fa: 'اذکار', ms: 'Zikir' } },
  { key: 'tab_quran', type: 'text', screen: 'tabs', translations: { ar: 'القرآن', en: 'Quran', fr: 'Coran', tr: 'Kuran', ur: 'قرآن', id: 'Al-Quran', bn: 'কুরআন', de: 'Quran', es: 'Corán', ru: 'Коран', fa: 'قرآن', ms: 'Al-Quran' } },
  { key: 'tab_prayer', type: 'text', screen: 'tabs', translations: { ar: 'الصلاة', en: 'Prayer', fr: 'Prière', tr: 'Namaz', ur: 'نماز', id: 'Shalat', bn: 'সালাত', de: 'Gebet', es: 'Oración', ru: 'Молитва', fa: 'نماز', ms: 'Solat' } },
  { key: 'tab_tasbih', type: 'text', screen: 'tabs', translations: { ar: 'التسبيح', en: 'Tasbih', fr: 'Tasbih', tr: 'Tespih', ur: 'تسبیح', id: 'Tasbih', bn: 'তাসবিহ', de: 'Tasbih', es: 'Tasbih', ru: 'Тасбих', fa: 'تسبیح', ms: 'Tasbih' } },
  { key: 'tab_settings', type: 'text', screen: 'tabs', translations: { ar: 'الإعدادات', en: 'Settings', fr: 'Paramètres', tr: 'Ayarlar', ur: 'ترتیبات', id: 'Pengaturan', bn: 'সেটিংস', de: 'Einstellungen', es: 'Ajustes', ru: 'Настройки', fa: 'تنظیمات', ms: 'Tetapan' } },

  // Home screen
  { key: 'home_title', type: 'text', screen: 'home', translations: { ar: 'روح المسلم', en: 'Muslim Soul', fr: "L'Âme du Musulman", tr: 'Müslümanın Ruhu', ur: 'روح المسلم', id: 'Jiwa Muslim', bn: 'মুসলিম আত্মা', de: 'Muslimische Seele', es: 'Alma Musulmana', ru: 'Душа мусульманина', fa: 'روح مسلمان', ms: 'Jiwa Muslim' } },
  { key: 'home_morning_azkar', type: 'text', screen: 'home', translations: { ar: 'أذكار الصباح', en: 'Morning Adhkar', fr: 'Invocations du matin', tr: 'Sabah Zikirleri', ur: 'صبح کے اذکار', id: 'Dzikir Pagi', bn: 'সকালের যিকির', de: 'Morgen-Dhikr', es: 'Adhkar de la mañana', ru: 'Утренние зикры', fa: 'اذکار صبح', ms: 'Zikir Pagi' } },
  { key: 'home_evening_azkar', type: 'text', screen: 'home', translations: { ar: 'أذكار المساء', en: 'Evening Adhkar', fr: 'Invocations du soir', tr: 'Akşam Zikirleri', ur: 'شام کے اذکار', id: 'Dzikir Petang', bn: 'সন্ধ্যার যিকির', de: 'Abend-Dhikr', es: 'Adhkar de la noche', ru: 'Вечерние зикры', fa: 'اذکار شب', ms: 'Zikir Petang' } },

  // Quran screen
  { key: 'quran_surahs', type: 'text', screen: 'quran', translations: { ar: 'السور', en: 'Surahs', fr: 'Sourates', tr: 'Sureler', ur: 'سورتیں', id: 'Surah', bn: 'সূরা', de: 'Suren', es: 'Suras', ru: 'Суры', fa: 'سوره‌ها', ms: 'Surah' } },
  { key: 'quran_juz', type: 'text', screen: 'quran', translations: { ar: 'الأجزاء', en: 'Juz', fr: 'Juz', tr: 'Cüzler', ur: 'پارے', id: 'Juz', bn: 'জুয', de: 'Juz', es: 'Juz', ru: 'Джуз', fa: 'جزء', ms: 'Juzuk' } },
  { key: 'quran_listen', type: 'text', screen: 'quran', translations: { ar: 'استماع', en: 'Listen', fr: 'Écouter', tr: 'Dinle', ur: 'سنیں', id: 'Dengar', bn: 'শুনুন', de: 'Hören', es: 'Escuchar', ru: 'Слушать', fa: 'گوش دادن', ms: 'Dengar' } },

  // Prayer screen  
  { key: 'prayer_title', type: 'text', screen: 'prayer', translations: { ar: 'مواقيت الصلاة', en: 'Prayer Times', fr: 'Heures de prière', tr: 'Namaz Vakitleri', ur: 'نماز کے اوقات', id: 'Waktu Shalat', bn: 'নামাজের সময়', de: 'Gebetszeiten', es: 'Horarios de oración', ru: 'Время молитвы', fa: 'اوقات نماز', ms: 'Waktu Solat' } },
  { key: 'prayer_qibla', type: 'text', screen: 'prayer', translations: { ar: 'القبلة', en: 'Qibla', fr: 'Qibla', tr: 'Kıble', ur: 'قبلہ', id: 'Kiblat', bn: 'কিবলা', de: 'Qibla', es: 'Qibla', ru: 'Кибла', fa: 'قبله', ms: 'Kiblat' } },
];

// ========================================
// Component
// ========================================

const AppContentManager: React.FC = () => {
  const [items, setItems] = useState<AppContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScreen, setFilterScreen] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'text' | 'icon'>('all');
  const [editingItem, setEditingItem] = useState<AppContentItem | null>(null);
  const [previewLang, setPreviewLang] = useState<LangCode>('ar');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Load items from Firestore
  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'appContent'), orderBy('key'));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Initialize with defaults
        const batch = writeBatch(db);
        const defaultItems: AppContentItem[] = DEFAULT_CONTENT_ITEMS.map((item, i) => ({
          ...item,
          id: `content_${i}`,
          updatedAt: new Date(),
        }));
        defaultItems.forEach(item => {
          batch.set(doc(db, 'appContent', item.id), item);
        });
        await batch.commit();
        setItems(defaultItems);
      } else {
        setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppContentItem)));
      }
    } catch (error) {
      console.error('Error loading app content:', error);
    }
    setLoading(false);
  };

  // Screen options for filter
  const screenOptions = useMemo(() => {
    const screens = new Set(items.map(i => i.screen));
    return ['all', ...Array.from(screens)];
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !searchQuery || 
        item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        Object.values(item.translations).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesScreen = filterScreen === 'all' || item.screen === filterScreen;
      const matchesType = filterType === 'all' || item.type === filterType;
      return matchesSearch && matchesScreen && matchesType;
    });
  }, [items, searchQuery, filterScreen, filterType]);

  // Save item
  const saveItem = async (item: AppContentItem) => {
    setSaveStatus('saving');
    try {
      await setDoc(doc(db, 'appContent', item.id), {
        ...item,
        updatedAt: new Date(),
      });
      setItems(prev => prev.map(i => i.id === item.id ? { ...item, updatedAt: new Date() } : i));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving item:', error);
      setSaveStatus('error');
    }
  };

  // Upload icon
  const handleIconUpload = async (file: File, item: AppContentItem) => {
    try {
      const storageRef = ref(storage, `app-content/icons/${item.key}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const updated = { ...item, iconUrl: url };
      setEditingItem(updated);
      await saveItem(updated);
    } catch (error) {
      console.error('Error uploading icon:', error);
    }
  };

  // Export all content as JSON
  const exportContent = () => {
    const data = JSON.stringify(items, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'app-content.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import content from JSON
  const importContent = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as AppContentItem[];
      const batch = writeBatch(db);
      data.forEach(item => {
        batch.set(doc(db, 'appContent', item.id), { ...item, updatedAt: new Date() });
      });
      await batch.commit();
      await loadItems();
    } catch (error) {
      console.error('Error importing content:', error);
    }
  };

  // ========================================
  // Edit Modal
  // ========================================
  const EditModal = () => {
    if (!editingItem) return null;
    const [localItem, setLocalItem] = useState<AppContentItem>(editingItem);

    const updateTranslation = (lang: LangCode, value: string) => {
      setLocalItem(prev => ({
        ...prev,
        translations: { ...prev.translations, [lang]: value },
      }));
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
        <div className="bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-700">
          {/* Header */}
          <div className="p-6 border-b border-slate-700 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">تعديل: {localItem.key}</h3>
              <p className="text-sm text-slate-400 mt-1">الشاشة: {localItem.screen} | النوع: {localItem.type}</p>
            </div>
            <button onClick={() => setEditingItem(null)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400" aria-label="إغلاق" title="إغلاق">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex">
            {/* Translations */}
            <div className="flex-1 p-6 overflow-y-auto max-h-[70vh]">
              <h4 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4" /> الترجمات (12 لغة)
              </h4>

              {/* Auto-translate */}
              <AutoTranslateField
                label="ترجمة تلقائية"
                fieldName="translations"
                contentType="ui"
                initialValues={localItem.translations}
                onSave={(translations) => {
                  Object.entries(translations).forEach(([code, text]) => {
                    if (text) updateTranslation(code as LangCode, text);
                  });
                }}
              />

              <div className="space-y-3 mt-4">
                {SUPPORTED_LANGUAGES.map(lang => (
                  <div key={lang.code} className="flex items-center gap-3">
                    <span className="text-lg w-8">{lang.flag}</span>
                    <span className="text-xs text-slate-400 w-16">{lang.code.toUpperCase()}</span>
                    <input
                      type="text"
                      value={localItem.translations[lang.code] || ''}
                      onChange={(e) => updateTranslation(lang.code, e.target.value)}
                      dir={lang.rtl ? 'rtl' : 'ltr'}
                      className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                      placeholder={`${lang.name}...`}
                    />
                  </div>
                ))}
              </div>

              {/* Icon Upload (if type is icon) */}
              {localItem.type === 'icon' && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <Image className="w-4 h-4" /> الأيقونة
                  </h4>
                  <div className="flex items-center gap-4">
                    {localItem.iconUrl && (
                      <img src={localItem.iconUrl} alt="Icon" className="w-12 h-12 rounded-lg bg-slate-700 p-1" />
                    )}
                    <label className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white cursor-pointer transition">
                      <Upload className="w-4 h-4 inline mr-2" />
                      رفع أيقونة
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleIconUpload(file, localItem);
                        }}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Live Preview */}
            <div className="w-72 bg-slate-900 border-l border-slate-700 p-6">
              <h4 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <Eye className="w-4 h-4" /> معاينة حية
              </h4>
              
              {/* Language selector for preview */}
              <div className="flex flex-wrap gap-1 mb-4">
                {SUPPORTED_LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setPreviewLang(lang.code)}
                    className={`text-lg p-1 rounded ${previewLang === lang.code ? 'bg-emerald-600/30 ring-1 ring-emerald-500' : 'hover:bg-slate-700'}`}
                    title={lang.name}
                  >
                    {lang.flag}
                  </button>
                ))}
              </div>

              {/* Mock phone preview */}
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 min-h-[200px]">
                <div className="bg-slate-700/50 rounded-xl p-3 mb-3">
                  {localItem.iconUrl && (
                    <img src={localItem.iconUrl} alt="" className="w-8 h-8 mx-auto mb-2" />
                  )}
                  <p className={`text-center text-white font-medium ${SUPPORTED_LANGUAGES.find(l => l.code === previewLang)?.rtl ? 'text-right' : 'text-left'}`}
                     dir={SUPPORTED_LANGUAGES.find(l => l.code === previewLang)?.rtl ? 'rtl' : 'ltr'}>
                    {localItem.translations[previewLang] || `[${previewLang}]`}
                  </p>
                </div>
                <p className="text-xs text-slate-500 text-center">
                  {SUPPORTED_LANGUAGES.find(l => l.code === previewLang)?.name}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {saveStatus === 'saved' && (
                <span className="text-emerald-400 text-sm flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> تم الحفظ
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-red-400 text-sm flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> خطأ في الحفظ
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white transition"
              >
                إلغاء
              </button>
              <button
                onClick={() => saveItem(localItem)}
                disabled={saveStatus === 'saving'}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm text-white font-medium transition disabled:opacity-50"
              >
                {saveStatus === 'saving' ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ========================================
  // Main Render
  // ========================================
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة محتوى التطبيق</h1>
          <p className="text-slate-400 mt-1">
            تخصيص الأيقونات والعناوين وأسماء الصفحات بـ 12 لغة
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadItems}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition"
            title="تحديث"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <label className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white cursor-pointer flex items-center gap-2 transition">
            <Upload className="w-4 h-4" /> استيراد
            <input type="file" accept=".json" className="hidden" onChange={importContent} />
          </label>
          <button
            onClick={exportContent}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white flex items-center gap-2 transition"
          >
            <Download className="w-4 h-4" /> تصدير
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالمفتاح أو النص..."
            aria-label="بحث في المحتوى"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
          />
        </div>
        <select
          value={filterScreen}
          onChange={(e) => setFilterScreen(e.target.value)}
          aria-label="فلتر الشاشة"
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-emerald-500 outline-none"
        >
          {screenOptions.map(s => (
            <option key={s} value={s}>{s === 'all' ? 'جميع الشاشات' : s}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as 'all' | 'text' | 'icon')}
          aria-label="فلتر النوع"
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-emerald-500 outline-none"
        >
          <option value="all">الكل</option>
          <option value="text">نصوص</option>
          <option value="icon">أيقونات</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-2xl font-bold text-white">{items.length}</p>
          <p className="text-sm text-slate-400">إجمالي العناصر</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-2xl font-bold text-emerald-400">{items.filter(i => i.type === 'text').length}</p>
          <p className="text-sm text-slate-400">نصوص</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-2xl font-bold text-blue-400">{items.filter(i => i.type === 'icon').length}</p>
          <p className="text-sm text-slate-400">أيقونات</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-2xl font-bold text-amber-400">{new Set(items.map(i => i.screen)).size}</p>
          <p className="text-sm text-slate-400">شاشات</p>
        </div>
      </div>

      {/* Content Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-right text-xs font-medium text-slate-400 p-4">المفتاح</th>
                <th className="text-right text-xs font-medium text-slate-400 p-4">النوع</th>
                <th className="text-right text-xs font-medium text-slate-400 p-4">الشاشة</th>
                <th className="text-right text-xs font-medium text-slate-400 p-4">العربية</th>
                <th className="text-right text-xs font-medium text-slate-400 p-4">English</th>
                <th className="text-right text-xs font-medium text-slate-400 p-4">الترجمات</th>
                <th className="text-right text-xs font-medium text-slate-400 p-4">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                const translatedCount = Object.values(item.translations).filter(t => t && t.length > 0).length;
                return (
                  <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                    <td className="p-4">
                      <code className="text-xs text-emerald-400 bg-slate-700 px-2 py-1 rounded">{item.key}</code>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${item.type === 'text' ? 'bg-emerald-600/20 text-emerald-400' : 'bg-blue-600/20 text-blue-400'}`}>
                        {item.type === 'text' ? <Type className="w-3 h-3 inline mr-1" /> : <Image className="w-3 h-3 inline mr-1" />}
                        {item.type}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-300">{item.screen}</td>
                    <td className="p-4 text-sm text-white font-arabic" dir="rtl">{item.translations.ar || '—'}</td>
                    <td className="p-4 text-sm text-slate-300">{item.translations.en || '—'}</td>
                    <td className="p-4">
                      <span className={`text-xs font-medium ${translatedCount >= 12 ? 'text-emerald-400' : translatedCount >= 6 ? 'text-amber-400' : 'text-red-400'}`}>
                        {translatedCount}/12
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-2 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-white transition"
                        aria-label="تعديل"
                        title="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingItem({ ...item, id: `custom_${Date.now()}`, translations: { ...item.translations, ar: (item.translations.ar || '') + ' (نسخة)' } })}
                        className="p-2 hover:bg-emerald-600/30 rounded-lg text-emerald-400 hover:text-emerald-300 transition"
                        title="تكرار"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>لا توجد نتائج</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <EditModal />
    </div>
  );
};

export default AppContentManager;
