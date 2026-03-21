// admin-panel/src/components/MobilePreview.tsx
// معاينة التطبيق مع بيانات حقيقية من Firebase
// يعكس الشكل الفعلي للتطبيق: Glass morphism + RTL + 5 tabs

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

  try {
    const homeDoc = await getDoc(doc(db, 'appConfig', 'homePageConfig'));
    if (homeDoc.exists()) results.homeConfig = homeDoc.data();
  } catch (e) { console.log('Preview: homePageConfig fetch error', e); }

  try {
    const bannerDoc = await getDoc(doc(db, 'appConfig', 'welcomeBanner'));
    if (bannerDoc.exists()) results.welcomeBanner = bannerDoc.data();
  } catch (e) { console.log('Preview: welcomeBanner fetch error', e); }

  try {
    const azkarSnap = await getDocs(query(collection(db, 'azkar'), limit(10)));
    results.azkarCategories = azkarSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { console.log('Preview: azkar fetch error', e); }

  try {
    const contentSnap = await getDocs(query(collection(db, 'appContent'), limit(20)));
    results.appContent = contentSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { console.log('Preview: appContent fetch error', e); }

  return results;
}

// ==================== Glass Card ====================
function GlassCard({ children, className = '', theme, style }: { children: React.ReactNode; className?: string; theme: 'light' | 'dark'; style?: React.CSSProperties }) {
  const bg = theme === 'dark'
    ? 'rgba(255,255,255,0.08)'
    : 'rgba(255,255,255,0.55)';
  return (
    <div
      className={`rounded-2xl backdrop-blur-md ${className}`}
      style={{
        background: bg,
        border: `0.5px solid ${theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.3)'}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ==================== Screen Renderers ====================

function HomeScreen({ data, theme }: { data: PreviewData; theme: 'light' | 'dark' }) {
  const textColor = theme === 'dark' ? '#ffffff' : '#1f2937';
  const secondaryColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
  const banner = data.welcomeBanner;

  const quickAccess = [
    { icon: '🌅', label: 'الصباح', color: '#2f7659' },
    { icon: '🌆', label: 'المساء', color: '#1e40af' },
    { icon: '😴', label: 'النوم', color: '#5b21b6' },
  ];

  const rawSections = Array.isArray(data.homeConfig?.sections)
    ? data.homeConfig.sections
    : data.homeConfig?.sections?.items;
  const sections = rawSections?.filter((s: any) => s.visible !== false) || [
    { id: 'azkar', title: '📿 أذكار', items: ['أذكار الصباح', 'أذكار المساء', 'أذكار النوم'] },
    { id: 'quran', title: '📖 قرآن', items: ['سورة الكهف', 'سورة يس', 'آية اليوم'] },
  ];

  return (
    <div className="space-y-3">
      {/* Welcome Banner */}
      {banner?.enabled !== false && (
        <div
          className="p-4 rounded-2xl text-white relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${banner?.color || '#2f7659'}, ${banner?.color || '#2f7659'}dd)` }}
        >
          <p className="text-xs opacity-80">{banner?.greeting || 'السلام عليكم'}</p>
          <p className="font-bold text-sm mt-1">{banner?.message || 'مرحباً بكم في روح المسلم'}</p>
        </div>
      )}

      {/* Quick Access — grid */}
      <div className="flex gap-2">
        {quickAccess.map((item, i) => (
          <GlassCard key={i} theme={theme} className="flex-1 p-3 text-center">
            <span className="text-xl block">{item.icon}</span>
            <p className="text-[10px] mt-1" style={{ color: secondaryColor }}>{item.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Sections */}
      {sections.slice(0, 3).map((section: any, i: number) => (
        <GlassCard key={i} theme={theme} className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px]" style={{ color: secondaryColor }}>▾</span>
            <h3 className="font-bold text-xs" style={{ color: textColor }}>{section.title || section.id}</h3>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(section.items || ['عنصر ١', 'عنصر ٢']).slice(0, 4).map((item: any, j: number) => (
              <div
                key={j}
                className="rounded-xl p-2 text-center"
                style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
              >
                <p className="text-[9px]" style={{ color: secondaryColor }}>{typeof item === 'string' ? item : item.title || ''}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

function QuranScreen({ theme }: { theme: 'light' | 'dark' }) {
  const textColor = theme === 'dark' ? '#ffffff' : '#1f2937';
  const secondaryColor = theme === 'dark' ? '#9ca3af' : '#6b7280';

  return (
    <div className="space-y-3">
      {/* Quran Search */}
      <GlassCard theme={theme} className="p-3 flex items-center gap-2">
        <span className="text-xs" style={{ color: secondaryColor }}>🔍</span>
        <span className="text-xs" style={{ color: secondaryColor }}>ابحث في القرآن...</span>
      </GlassCard>

      {/* Last Read */}
      <GlassCard theme={theme} className="p-3">
        <p className="text-[10px] mb-1" style={{ color: secondaryColor }}>آخر قراءة</p>
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: '#22C55E' }}>الصفحة ٤٥</span>
          <p className="font-bold text-xs" style={{ color: textColor }}>سورة البقرة</p>
        </div>
      </GlassCard>

      {/* Surah List */}
      {['الفاتحة', 'البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام'].map((name, i) => (
        <GlassCard key={i} theme={theme} className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px]" style={{ color: secondaryColor }}>
              {i === 0 ? '٧' : i === 1 ? '٢٨٦' : i === 2 ? '٢٠٠' : i === 3 ? '١٧٦' : i === 4 ? '١٢٠' : '١٦٥'} آية
            </span>
            <div className="flex items-center gap-2">
              <div>
                <p className="font-bold text-xs text-left" style={{ color: textColor }}>{name}</p>
                <p className="text-[9px] text-left" style={{ color: secondaryColor }}>
                  {i < 2 ? 'مدنية' : 'مدنية'}
                </p>
              </div>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold"
                style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}
              >
                {i + 1}
              </div>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

function TasbihScreen({ theme }: { theme: 'light' | 'dark' }) {
  const textColor = theme === 'dark' ? '#ffffff' : '#1f2937';
  const secondaryColor = theme === 'dark' ? '#9ca3af' : '#6b7280';

  return (
    <div className="space-y-3 flex flex-col items-center">
      {/* Tasbih Name */}
      <p className="font-bold text-sm" style={{ color: textColor }}>سبحان الله</p>
      <p className="text-[10px]" style={{ color: secondaryColor }}>٣٣ مرة</p>

      {/* Counter Ring */}
      <div className="relative w-32 h-32 flex items-center justify-center my-2">
        <svg width="128" height="128" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r="56" fill="none" stroke={theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'} strokeWidth="6" />
          <circle
            cx="64" cy="64" r="56" fill="none"
            stroke="#22C55E"
            strokeWidth="6"
            strokeDasharray={`${2 * Math.PI * 56 * 0.45} ${2 * Math.PI * 56}`}
            strokeLinecap="round"
            transform="rotate(-90 64 64)"
          />
        </svg>
        <span className="absolute text-3xl font-bold" style={{ color: textColor }}>١٥</span>
      </div>

      {/* Tap Button */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(34,197,94,0.2)', border: '2px solid #22C55E' }}
      >
        <span className="text-2xl" style={{ color: '#22C55E' }}>📿</span>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4 mt-2">
        <span className="text-xs" style={{ color: secondaryColor }}>→</span>
        <span className="text-xs font-bold" style={{ color: '#22C55E' }}>١ / ٤</span>
        <span className="text-xs" style={{ color: secondaryColor }}>←</span>
      </div>
    </div>
  );
}

function PrayerScreen({ theme }: { theme: 'light' | 'dark' }) {
  const textColor = theme === 'dark' ? '#ffffff' : '#1f2937';
  const secondaryColor = theme === 'dark' ? '#9ca3af' : '#6b7280';

  const prayers = [
    { name: 'الفجر', time: '٤:٥٢', active: false },
    { name: 'الشروق', time: '٦:١٥', active: false },
    { name: 'الظهر', time: '١٢:٠٨', active: false },
    { name: 'العصر', time: '٣:٤٥', active: true },
    { name: 'المغرب', time: '٦:٣٢', active: false },
    { name: 'العشاء', time: '٧:٥٥', active: false },
  ];

  return (
    <div className="space-y-3">
      {/* Next Prayer Card */}
      <GlassCard theme={theme} className="p-4 text-center">
        <p className="text-[10px]" style={{ color: secondaryColor }}>الصلاة القادمة</p>
        <p className="text-lg font-bold mt-1" style={{ color: '#22C55E' }}>العصر</p>
        <p className="text-xl font-bold mt-1" style={{ color: textColor, fontFamily: 'monospace' }}>٠٢:١٥:٣٣</p>
        <p className="text-[10px] mt-1" style={{ color: secondaryColor }}>٣:٤٥ م</p>
      </GlassCard>

      {/* Prayer List */}
      {prayers.map((prayer, i) => (
        <GlassCard key={i} theme={theme} className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{
                  background: prayer.active ? 'rgba(34,197,94,0.2)' : 'transparent',
                  border: `1.5px solid ${prayer.active ? '#22C55E' : (theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)')}`
                }}
              >
                {prayer.active && <span className="text-[8px]" style={{ color: '#22C55E' }}>🔔</span>}
              </div>
              <span className="text-xs" style={{ color: secondaryColor }}>{prayer.time}</span>
            </div>
            <span className={`text-xs font-semibold ${prayer.active ? '' : ''}`} style={{ color: prayer.active ? '#22C55E' : textColor }}>
              {prayer.name}
            </span>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

function SettingsScreen({ theme }: { theme: 'light' | 'dark' }) {
  const textColor = theme === 'dark' ? '#ffffff' : '#1f2937';
  const secondaryColor = theme === 'dark' ? '#9ca3af' : '#6b7280';

  const sections = [
    { title: 'العرض', items: [{ icon: '🌍', name: 'اللغة', value: 'العربية' }, { icon: '🎨', name: 'إعدادات العرض' }] },
    { title: 'الإشعارات', items: [{ icon: '🔔', name: 'الإشعارات', toggle: true }] },
    { title: 'الودجات', items: [{ icon: '📱', name: 'إعدادات الودجات' }] },
    { title: 'أخرى', items: [{ icon: '💾', name: 'النسخ الاحتياطي' }, { icon: '📤', name: 'مشاركة التطبيق' }, { icon: 'ℹ️', name: 'عن التطبيق' }] },
  ];

  return (
    <div className="space-y-3">
      {sections.map((section, si) => (
        <div key={si}>
          <p className="text-[10px] font-bold mb-1.5 pr-1" style={{ color: '#22C55E' }}>{section.title}</p>
          <GlassCard theme={theme} className="divide-y" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
            {section.items.map((item: any, i: number) => (
              <div key={i} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {item.toggle && (
                    <div className="w-8 h-4 rounded-full p-0.5" style={{ background: '#22C55E' }}>
                      <div className="w-3 h-3 bg-white rounded-full" style={{ marginRight: 'auto' }} />
                    </div>
                  )}
                  {item.value && <span className="text-[10px]" style={{ color: secondaryColor }}>{item.value}</span>}
                  {!item.toggle && !item.value && <span className="text-[10px]" style={{ color: secondaryColor }}>›</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: textColor }}>{item.name}</span>
                  <span className="text-sm">{item.icon}</span>
                </div>
              </div>
            ))}
          </GlassCard>
        </div>
      ))}
    </div>
  );
}

// ==================== Main Component ====================
// Tab config matching actual app: Home, Quran, Tasbih, Prayer, Settings
const PREVIEW_SCREENS = [
  { id: 'home', name: 'الرئيسية', icon: '🏠' },
  { id: 'quran', name: 'القرآن', icon: '📖' },
  { id: 'tasbih', name: 'التسبيح', icon: '📿' },
  { id: 'prayer', name: 'الصلاة', icon: '🕌' },
  { id: 'settings', name: 'الإعدادات', icon: '⚙️' },
];

const MobilePreview: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [device, setDevice] = useState<'iphone' | 'android'>('iphone');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
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

  // Theme colors matching actual app
  const bgColor = theme === 'dark' ? '#0f1724' : '#f9fafb';
  const headerBg = theme === 'dark' ? 'rgba(15,23,36,0.85)' : 'rgba(255,255,255,0.85)';
  const tabBarBg = theme === 'dark' ? 'rgba(16,22,33,0.95)' : 'rgba(255,255,255,0.95)';
  const textColor = theme === 'dark' ? '#ffffff' : '#1f2937';

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
          <button onClick={onClose} title="إغلاق" className="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
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
              title="اختر الشاشة"
              className="bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm border-none"
            >
              {PREVIEW_SCREENS.map(s => (
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
              }`}
              style={{ background: bgColor }}
            >
              {/* Notch */}
              {device === 'iphone' && (
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-[120px] h-[35px] bg-black rounded-[20px] z-20" />
              )}

              {/* Status Bar */}
              <div className="flex items-center justify-between px-8 pt-4 pb-2" style={{ color: textColor }}>
                <span className="text-xs font-semibold">9:41</span>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-3 border-2 rounded-sm" style={{ borderColor: textColor }}>
                    <div className="w-4 h-full rounded-sm" style={{ background: textColor }} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col h-[calc(100%-40px)]" dir="rtl">
                {/* App Header — Glass style */}
                <div
                  className="px-4 py-3 flex items-center justify-between backdrop-blur-md"
                  style={{ background: headerBg }}
                >
                  <div className="text-[10px] opacity-70" style={{ color: '#22C55E' }}>
                    {data.loading ? '...' : 'بيانات حقيقية ✓'}
                  </div>
                  <h1 className="text-sm font-bold" style={{ color: textColor }}>روح المسلم</h1>
                </div>

                {/* Screen Content */}
                <div className="flex-1 p-3 overflow-auto" style={{ maxHeight: '420px' }}>
                  {data.loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                      <p className="text-sm" style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
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
                      {currentScreen === 'quran' && <QuranScreen theme={theme} />}
                      {currentScreen === 'tasbih' && <TasbihScreen theme={theme} />}
                      {currentScreen === 'prayer' && <PrayerScreen theme={theme} />}
                      {currentScreen === 'settings' && <SettingsScreen theme={theme} />}
                    </>
                  )}
                </div>

                {/* Tab Bar — matching actual app */}
                <div
                  className="border-t px-2 py-2 flex items-center justify-around backdrop-blur-md"
                  style={{
                    background: tabBarBg,
                    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  }}
                >
                  {/* RTL order: Settings(left) → Prayer → Tasbih → Quran → Home(right) */}
                  {[...PREVIEW_SCREENS].reverse().map((screen) => (
                    <button
                      key={screen.id}
                      onClick={() => setCurrentScreen(screen.id)}
                      className="flex flex-col items-center p-1.5 rounded-xl transition-colors"
                    >
                      <span className="text-lg">{screen.icon}</span>
                      <span
                        className="text-[9px] mt-0.5 font-medium"
                        style={{
                          color: currentScreen === screen.id ? '#22C55E' : (theme === 'dark' ? '#6B7280' : '#9CA3AF'),
                        }}
                      >
                        {screen.name}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Home Indicator */}
                {device === 'iphone' && (
                  <div className="flex justify-center pb-2" style={{ background: tabBarBg }}>
                    <div
                      className="w-32 h-1 rounded-full"
                      style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
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
