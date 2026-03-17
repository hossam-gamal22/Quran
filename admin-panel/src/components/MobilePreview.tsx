// admin-panel/src/components/MobilePreview.tsx
// معاينة التطبيق مع بيانات حقيقية من Firebase

import React, { useState, useEffect } from 'react';
import { Smartphone, X, RotateCcw, RefreshCw, Loader2 } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, collection, getDocs, query, limit } from 'firebase/firestore';

// ==================== Types ====================
interface PreviewData {
  homeConfig: any;
  azkarCategories: any[];
  appContent: any[];
  welcomeBanner: any;
  loading: boolean;
  error: string | null;
}

// ==================== Data Fetching ====================
async function fetchPreviewData(): Promise<Omit<PreviewData, 'loading' | 'error'>> {
  const results: Omit<PreviewData, 'loading' | 'error'> = {
    homeConfig: null,
    azkarCategories: [],
    appContent: [],
    welcomeBanner: null,
  };

  // Fetch home page config
  try {
    const homeDoc = await getDoc(doc(db, 'appConfig', 'homePageConfig'));
    if (homeDoc.exists()) results.homeConfig = homeDoc.data();
  } catch (e) { console.log('Preview: homePageConfig fetch error', e); }

  // Fetch welcome banner
  try {
    const bannerDoc = await getDoc(doc(db, 'appConfig', 'welcomeBanner'));
    if (bannerDoc.exists()) results.welcomeBanner = bannerDoc.data();
  } catch (e) { console.log('Preview: welcomeBanner fetch error', e); }

  // Fetch azkar categories
  try {
    const azkarSnap = await getDocs(query(collection(db, 'azkar'), limit(10)));
    results.azkarCategories = azkarSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { console.log('Preview: azkar fetch error', e); }

  // Fetch app content items
  try {
    const contentSnap = await getDocs(query(collection(db, 'appContent'), limit(20)));
    results.appContent = contentSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { console.log('Preview: appContent fetch error', e); }

  return results;
}

// ==================== Screen Renderers ====================

function HomeScreen({ data, theme }: { data: PreviewData; theme: 'light' | 'dark' }) {
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-800';
  const cardBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const secondaryText = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  const banner = data.welcomeBanner;
  const homeConfig = data.homeConfig;

  return (
    <div className="space-y-4">
      {/* Welcome Banner */}
      {banner?.enabled !== false && (
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 rounded-2xl text-white">
          <p className="text-sm opacity-90">{banner?.greeting || 'السلام عليكم'}</p>
          <p className="font-bold mt-1">{banner?.message || 'مرحباً بكم في روح المسلم'}</p>
        </div>
      )}

      {/* Quick Access */}
      <div className="grid grid-cols-3 gap-2">
        {(homeConfig?.quickAccess || [
          { icon: '🌅', label: 'الصباح' },
          { icon: '🌆', label: 'المساء' },
          { icon: '😴', label: 'النوم' },
        ]).slice(0, 6).map((item: any, i: number) => (
          <div key={i} className={`${cardBg} p-3 rounded-xl text-center shadow-sm`}>
            <span className="text-2xl">{item.icon || '📿'}</span>
            <p className={`text-xs mt-1 ${secondaryText}`}>{item.label || item.title || ''}</p>
          </div>
        ))}
      </div>

      {/* Sections from homeConfig */}
      {homeConfig?.sections?.filter((s: any) => s.visible !== false).slice(0, 3).map((section: any, i: number) => (
        <div key={i} className={`${cardBg} p-4 rounded-xl shadow-sm`}>
          <h3 className={`font-bold mb-2 ${textColor}`}>{section.title || section.id}</h3>
          <p className={`text-sm ${secondaryText}`}>{section.subtitle || 'محتوى القسم'}</p>
        </div>
      )) || (
        <div className={`${cardBg} p-4 rounded-xl shadow-sm`}>
          <h3 className={`font-bold mb-2 ${textColor}`}>لم يتم تحميل الأقسام</h3>
          <p className={`text-sm ${secondaryText}`}>اضغط تحديث لتحميل البيانات</p>
        </div>
      )}
    </div>
  );
}

function AzkarScreen({ data, theme }: { data: PreviewData; theme: 'light' | 'dark' }) {
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-800';
  const cardBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const secondaryText = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  const categories = data.azkarCategories.length > 0
    ? data.azkarCategories
    : [
      { id: '1', name: 'أذكار الصباح', count: 27 },
      { id: '2', name: 'أذكار المساء', count: 24 },
      { id: '3', name: 'أذكار النوم', count: 15 },
    ];

  return (
    <div className="space-y-3">
      <h2 className={`font-bold text-lg ${textColor}`}>الأذكار</h2>
      {categories.slice(0, 5).map((cat: any, i: number) => (
        <div key={cat.id || i} className={`${cardBg} p-4 rounded-xl shadow-sm`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-semibold ${textColor}`}>{cat.name || cat.title || cat.category || `ذكر ${i + 1}`}</p>
              {cat.count && <p className={`text-xs ${secondaryText}`}>{cat.count} ذكر</p>}
            </div>
            <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <span className="text-emerald-500 text-sm">📿</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ContentScreen({ data, theme }: { data: PreviewData; theme: 'light' | 'dark' }) {
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-800';
  const cardBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const secondaryText = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  const items = data.appContent.length > 0
    ? data.appContent
    : [
      { id: '1', title_ar: 'آية اليوم', icon: '📖' },
      { id: '2', title_ar: 'حديث اليوم', icon: '📜' },
      { id: '3', title_ar: 'حكمة اليوم', icon: '💡' },
    ];

  return (
    <div className="space-y-3">
      <h2 className={`font-bold text-lg ${textColor}`}>المحتوى</h2>
      {items.slice(0, 8).map((item: any, i: number) => (
        <div key={item.id || i} className={`${cardBg} p-3 rounded-xl shadow-sm flex items-center gap-3`}>
          {item.iconUrl ? (
            <img src={item.iconUrl} className="w-10 h-10 rounded-lg object-cover" alt="" />
          ) : (
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center text-lg">
              {item.icon || '📄'}
            </div>
          )}
          <div>
            <p className={`font-semibold text-sm ${textColor}`}>{item.title_ar || item.title || item.label || ''}</p>
            {item.subtitle_ar && <p className={`text-xs ${secondaryText}`}>{item.subtitle_ar}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function PrayerScreen({ theme }: { theme: 'light' | 'dark' }) {
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-800';
  const cardBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const secondaryText = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="space-y-3">
      <h2 className={`font-bold text-lg ${textColor}`}>مواقيت الصلاة</h2>
      <div className={`${cardBg} p-4 rounded-xl shadow-sm text-center`}>
        <p className={`text-sm ${secondaryText}`}>الصلاة القادمة</p>
        <p className="text-3xl font-bold text-emerald-500 mt-2">المغرب</p>
        <p className={`text-sm ${secondaryText} mt-1`}>يُحسب بناءً على موقعك</p>
      </div>
      {['الفجر', 'الشروق', 'الظهر', 'العصر', 'المغرب', 'العشاء'].map((prayer, i) => (
        <div key={i} className={`${cardBg} p-3 rounded-xl shadow-sm flex items-center justify-between`}>
          <span className={textColor}>{prayer}</span>
          <span className={secondaryText}>--:--</span>
        </div>
      ))}
    </div>
  );
}

function SettingsScreen({ theme }: { theme: 'light' | 'dark' }) {
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-800';
  const cardBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white';

  const items = [
    { icon: '🌙', name: 'الوضع الداكن', toggle: true },
    { icon: '🔔', name: 'الإشعارات', toggle: true },
    { icon: '🌍', name: 'اللغة', value: 'العربية' },
    { icon: '⭐', name: 'قيّم التطبيق' },
    { icon: '📤', name: 'مشاركة التطبيق' },
    { icon: '👑', name: 'الاشتراك' },
  ];

  return (
    <div className="space-y-3">
      <h2 className={`font-bold text-lg ${textColor}`}>الإعدادات</h2>
      {items.map((item, i) => (
        <div key={i} className={`${cardBg} p-3 rounded-xl shadow-sm flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <span className="text-xl">{item.icon}</span>
            <span className={textColor}>{item.name}</span>
          </div>
          {item.toggle && (
            <div className="w-12 h-6 bg-emerald-500 rounded-full p-1">
              <div className="w-4 h-4 bg-white rounded-full mr-auto" />
            </div>
          )}
          {item.value && <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{item.value}</span>}
        </div>
      ))}
    </div>
  );
}

// ==================== Main Component ====================
const MobilePreview: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [device, setDevice] = useState<'iphone' | 'android'>('iphone');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currentScreen, setCurrentScreen] = useState('home');
  const [rotation, setRotation] = useState(0);
  const [data, setData] = useState<PreviewData>({
    homeConfig: null,
    azkarCategories: [],
    appContent: [],
    welcomeBanner: null,
    loading: true,
    error: null,
  });

  const loadData = async () => {
    setData(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await fetchPreviewData();
      setData({ ...result, loading: false, error: null });
    } catch (e: unknown) {
      setData(prev => ({ ...prev, loading: false, error: e instanceof Error ? e.message : 'فشل التحميل' }));
    }
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const screens = [
    { id: 'home', name: 'الرئيسية', icon: '🏠' },
    { id: 'azkar', name: 'الأذكار', icon: '📿' },
    { id: 'content', name: 'المحتوى', icon: '📄' },
    { id: 'prayer', name: 'الصلاة', icon: '🕌' },
    { id: 'settings', name: 'الإعدادات', icon: '⚙️' },
  ];

  const bgColor = theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50';
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-800';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-3xl w-full max-w-5xl max-h-[95vh] overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="w-6 h-6 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">معاينة التطبيق</h2>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">بيانات حقيقية</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-slate-700 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">الجهاز:</span>
            <div className="flex bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setDevice('iphone')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  device === 'iphone' ? 'bg-slate-600 text-white' : 'text-slate-400'
                }`}
              >
                 iPhone
              </button>
              <button
                onClick={() => setDevice('android')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  device === 'android' ? 'bg-slate-600 text-white' : 'text-slate-400'
                }`}
              >
                🤖 Android
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">الوضع:</span>
            <div className="flex bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setTheme('light')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  theme === 'light' ? 'bg-slate-600 text-white' : 'text-slate-400'
                }`}
              >
                ☀️ فاتح
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  theme === 'dark' ? 'bg-slate-600 text-white' : 'text-slate-400'
                }`}
              >
                🌙 داكن
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">الشاشة:</span>
            <select
              value={currentScreen}
              onChange={(e) => setCurrentScreen(e.target.value)}
              className="bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm border-none"
            >
              {screens.map(s => (
                <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setRotation(r => r + 90)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            تدوير
          </button>

          <button
            onClick={loadData}
            disabled={data.loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm disabled:opacity-50"
          >
            {data.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            تحديث البيانات
          </button>
        </div>

        {/* Preview Area */}
        <div className="p-8 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 min-h-[600px]">
          <div
            className={`relative transition-transform duration-500 ${
              device === 'iphone' 
                ? 'w-[300px] h-[620px] rounded-[50px]' 
                : 'w-[290px] h-[600px] rounded-[30px]'
            } bg-black p-3 shadow-2xl`}
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <div 
              className={`w-full h-full overflow-hidden ${
                device === 'iphone' ? 'rounded-[40px]' : 'rounded-[24px]'
              } ${bgColor}`}
            >
              {device === 'iphone' && (
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-[120px] h-[35px] bg-black rounded-[20px] z-20" />
              )}

              {/* Status Bar */}
              <div className={`flex items-center justify-between px-8 pt-4 pb-2 ${textColor}`}>
                <span className="text-xs font-semibold">9:41</span>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-3 border-2 border-current rounded-sm">
                    <div className="w-4 h-full bg-current rounded-sm" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col h-full" dir="rtl">
                {/* App Header */}
                <div className="bg-emerald-600 px-4 py-4 flex items-center justify-between">
                  <h1 className="text-white text-lg font-bold">روح المسلم</h1>
                  <div className="text-white/80 text-xs">
                    {data.loading ? '...' : 'بيانات حقيقية ✓'}
                  </div>
                </div>

                {/* Screen Content */}
                <div className={`flex-1 p-4 overflow-auto ${bgColor}`} style={{ maxHeight: '400px' }}>
                  {data.loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        جاري تحميل البيانات من Firebase...
                      </p>
                    </div>
                  ) : data.error ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <p className="text-red-400 text-sm text-center">{data.error}</p>
                      <button onClick={loadData} className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm">
                        إعادة المحاولة
                      </button>
                    </div>
                  ) : (
                    <>
                      {currentScreen === 'home' && <HomeScreen data={data} theme={theme} />}
                      {currentScreen === 'azkar' && <AzkarScreen data={data} theme={theme} />}
                      {currentScreen === 'content' && <ContentScreen data={data} theme={theme} />}
                      {currentScreen === 'prayer' && <PrayerScreen theme={theme} />}
                      {currentScreen === 'settings' && <SettingsScreen theme={theme} />}
                    </>
                  )}
                </div>

                {/* Tab Bar */}
                <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t px-2 py-2 flex items-center justify-around`}>
                  {screens.map((screen) => (
                    <button
                      key={screen.id}
                      onClick={() => setCurrentScreen(screen.id)}
                      className={`flex flex-col items-center p-2 rounded-xl transition-colors ${
                        currentScreen === screen.id 
                          ? 'text-emerald-500' 
                          : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      <span className="text-xl">{screen.icon}</span>
                      <span className="text-[10px] mt-1">{screen.name}</span>
                    </button>
                  ))}
                </div>

                {/* Home Indicator */}
                {device === 'iphone' && (
                  <div className="flex justify-center pb-2">
                    <div className={`w-32 h-1 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'} rounded-full`} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-700 flex items-center justify-between text-sm">
          <div className="text-slate-400">
            {device === 'iphone' ? 'iPhone 14 Pro' : 'Samsung Galaxy S23'} • {theme === 'light' ? 'الوضع الفاتح' : 'الوضع الداكن'}
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className={`w-2 h-2 ${data.loading ? 'bg-yellow-500' : data.error ? 'bg-red-500' : 'bg-emerald-500'} rounded-full animate-pulse`} />
            {data.loading ? 'جاري التحميل...' : data.error ? 'خطأ في التحميل' : 'بيانات Firebase حقيقية ✓'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobilePreview;
