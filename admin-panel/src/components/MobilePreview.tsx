// admin-panel/src/components/MobilePreview.tsx
// معاينة تقريبية للتطبيق مع بعض بيانات Firebase.
// لا تشغل تطبيق React Native الحقيقي، لكنها تساعد في فحص شكل المحتوى بسرعة.

import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  X,
  RotateCcw,
  RefreshCw,
  Loader2,
  Home,
  BookOpen,
  RotateCw,
  Landmark,
  Settings,
  Moon,
  Search,
  Star,
  Zap,
  CalendarDays,
  Radio,
  Heart,
  Shield,
  Compass,
  ChevronDown,
  Clock3,
  Crown,
} from 'lucide-react';
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
    const appSettingsDoc = await getDoc(doc(db, 'config', 'app-settings'));
    if (appSettingsDoc.exists()) results.welcomeBanner = appSettingsDoc.data()?.welcomeBanner ?? null;
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

// ==================== Theme Helpers ====================
type ThemeMode = 'light' | 'dark';
type IconComponent = React.FC<{ className?: string; style?: React.CSSProperties }>;

const APP_GREEN = '#0d8e62';

const themeClass = {
  dark: {
    bg: 'bg-[#0b1421]',
    panel: 'bg-white/[0.08] border-white/[0.14]',
    panelSoft: 'bg-white/[0.06] border-white/[0.10]',
    text: 'text-white',
    sub: 'text-slate-400',
    tab: 'bg-[rgba(16,22,33,0.96)] border-white/[0.08]',
    divider: 'border-white/[0.08]',
  },
  light: {
    bg: 'bg-[#f7f8f5]',
    panel: 'bg-white/85 border-black/[0.10]',
    panelSoft: 'bg-black/[0.035] border-black/[0.08]',
    text: 'text-[#1f2933]',
    sub: 'text-slate-500',
    tab: 'bg-white/95 border-black/[0.08]',
    divider: 'border-black/[0.08]',
  },
} satisfies Record<ThemeMode, Record<string, string>>;

const txt = (t: ThemeMode) => themeClass[t].text;
const sec = (t: ThemeMode) => themeClass[t].sub;

const DEFAULT_HIGHLIGHTS = [
  { id: 'hijri-date', name: 'التاريخ الهجري', icon: CalendarDays, color: '#0D9488', enabled: true, order: 0 },
  { id: 'radio', name: 'إذاعة القرآن', icon: Radio, color: '#22C55E', enabled: true, order: 1 },
  { id: 'azkar-adhkar', name: 'ذكر اليوم', icon: Moon, color: '#8B5CF6', enabled: true, order: 2 },
  { id: 'daily-dua', name: 'دعاء اليوم', icon: Heart, color: '#c17f59', enabled: true, order: 3 },
  { id: 'daily-ayah', name: 'آية اليوم', icon: BookOpen, color: '#3a7ca5', enabled: true, order: 4 },
  { id: 'next-prayer', name: 'الصلاة القادمة', icon: Landmark, color: '#0d8e62', enabled: true, order: 6 },
];

const DEFAULT_QUICK_ACCESS = [
  { id: 'qibla', nameAr: 'القبلة', icon: Compass, color: '#5856D6', enabled: true, order: 0 },
  { id: 'favorites', nameAr: 'المحفوظات', icon: Heart, color: '#FF6B6B', enabled: true, order: 1 },
  { id: 'ayat_kursi', nameAr: 'آية الكرسي', icon: Shield, color: '#DAA520', enabled: true, order: 2 },
  { id: 'surah_kahf', nameAr: 'سورة الكهف', icon: BookOpen, color: '#3a7ca5', enabled: true, order: 3 },
  { id: 'names', nameAr: 'أسماء الله الحسنى', icon: Star, color: '#c17f59', enabled: true, order: 6 },
  { id: 'tasbih', nameAr: 'التسبيح', icon: RotateCw, color: '#2f7659', enabled: true, order: 7 },
  { id: 'radio', nameAr: 'إذاعة القرآن', icon: Radio, color: '#22C55E', enabled: true, order: 13 },
];

const SECTION_FALLBACKS: Record<string, { title: string; icon: IconComponent; color: string; items: string[] }> = {
  cat_azkar: { title: 'الأذكار', icon: Moon, color: '#8B5CF6', items: ['أذكار الصباح', 'أذكار المساء', 'أذكار النوم', 'بعد الصلاة'] },
  cat_stories: { title: 'القصص', icon: BookOpen, color: '#3a7ca5', items: ['السيرة', 'الصحابة', 'قصة اليوم', 'آيات الكون'] },
  cat_hajj: { title: 'مناسك الحج والعمرة', icon: Landmark, color: '#0D9488', items: ['الحج', 'العمرة', 'أدعية الطواف', 'أدعية السعي'] },
  cat_quran: { title: 'سور وآيات قرآنية', icon: BookOpen, color: '#4CAF50', items: ['سورة الكهف', 'سورة يس', 'سورة الملك', 'آية الكرسي'] },
  cat_duas: { title: 'أدعية وأحاديث', icon: Heart, color: '#c17f59', items: ['دعاء اليوم', 'حديث اليوم', 'أدعية مشهورة', 'دعاء قرآني'] },
  cat_worship: { title: 'عبادات', icon: Landmark, color: '#0d8e62', items: ['تتبع الصلاة', 'تتبع القرآن', 'الصيام', 'لوحة الشرف'] },
  cat_tasbih: { title: 'تسبيح واستغفار', icon: RotateCw, color: '#2f7659', items: ['التسبيح', 'الاستغفار', 'الصلاة على النبي', 'إحصائيات'] },
  cat_marifat: { title: 'معرفة الله', icon: Star, color: '#6366F1', items: ['أسماء الله الحسنى', 'أحاديث الصفات', 'التفسير', 'تدبر'] },
};

const SECTION_ORDER = ['cat_azkar', 'cat_stories', 'cat_hajj', 'cat_quran', 'cat_duas', 'cat_worship', 'cat_tasbih', 'cat_marifat'];

function normalizeEnabled<T extends { enabled?: boolean; order?: number }>(items: T[] | undefined, fallback: T[]): T[] {
  const source = items?.length ? items : fallback;
  return [...source]
    .filter((item) => item.enabled !== false)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

function getLucideIcon(iconName?: string): IconComponent {
  const key = (iconName || '').toLowerCase();
  if (key.includes('compass')) return Compass;
  if (key.includes('heart')) return Heart;
  if (key.includes('shield')) return Shield;
  if (key.includes('book')) return BookOpen;
  if (key.includes('radio')) return Radio;
  if (key.includes('counter') || key.includes('repeat')) return RotateCw;
  if (key.includes('calendar')) return CalendarDays;
  if (key.includes('mosque') || key.includes('hajj') || key.includes('star-crescent')) return Landmark;
  if (key.includes('star')) return Star;
  return Moon;
}

function GlassCard({ children, className = '', theme }: { children: React.ReactNode; className?: string; theme: ThemeMode }) {
  return (
    <div
      className={`rounded-2xl backdrop-blur-md border-[0.5px] ${
        theme === 'dark' ? themeClass.dark.panel : themeClass.light.panel
      } ${className}`}
    >
      {children}
    </div>
  );
}

// ==================== Screen Renderers ====================

function AppIconGlyph({ icon: Icon, color, size = 20 }: { icon: IconComponent; color: string; size?: number }) {
  return <Icon className="shrink-0" style={{ width: size, height: size, color }} />;
}

function SectionHeader({ title, icon, color, theme }: { title: string; icon: IconComponent; color: string; theme: ThemeMode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <ChevronDown className={`w-3.5 h-3.5 ${sec(theme)}`} />
      <div className="flex items-center gap-2">
        <h3 className={`text-[15px] font-bold leading-none ${txt(theme)}`}>{title}</h3>
        <AppIconGlyph icon={icon} color={color} size={18} />
      </div>
    </div>
  );
}

function HomeScreen({ data, theme }: { data: PreviewData; theme: ThemeMode }) {
  const banner = data.welcomeBanner;
  const bannerColor = banner?.color || '#2f7659';
  const bannerTitle = banner?.title || banner?.titles?.ar || 'السلام عليكم';
  const bannerSubtitle = banner?.subtitle || banner?.subtitles?.ar || banner?.message || 'مرحباً بكم في روح المسلم';

  const quickAccessItems = normalizeEnabled<any>(data.homeConfig?.quickAccess?.items, DEFAULT_QUICK_ACCESS)
    .slice(0, 8)
    .map((item) => ({
      ...item,
      nameAr: item.nameAr || item.name || 'عنصر',
      icon: getLucideIcon(item.icon),
      color: item.color || APP_GREEN,
    }));

  const highlights = normalizeEnabled<any>(data.homeConfig?.highlights?.items, DEFAULT_HIGHLIGHTS)
    .slice(0, 6)
    .map((item) => ({
      ...item,
      name: item.name || DEFAULT_HIGHLIGHTS.find(h => h.id === item.id)?.name || 'عنصر',
      icon: DEFAULT_HIGHLIGHTS.find(h => h.id === item.id)?.icon || getLucideIcon(item.icon),
      color: DEFAULT_HIGHLIGHTS.find(h => h.id === item.id)?.color || APP_GREEN,
    }));

  const rawSections = normalizeEnabled<any>(data.homeConfig?.sections?.items, []);
  const sectionIds = rawSections.length
    ? rawSections.map((section) => section.id).filter((id) => SECTION_ORDER.includes(id))
    : SECTION_ORDER;
  const sections = sectionIds.slice(0, 4).map((id) => {
    const saved = rawSections.find((section) => section.id === id);
    const fallback = SECTION_FALLBACKS[id];
    const azkarItems = id === 'cat_azkar'
      ? data.azkarCategories
        .map((category) => category.nameAr || category.titleAr || category.name || category.title)
        .filter(Boolean)
        .slice(0, 4)
      : [];
    return {
      ...fallback,
      id,
      title: saved?.titleAr || saved?.name || fallback.title,
      items: Array.isArray(saved?.items) && saved.items.length
        ? saved.items.map((item: any) => item.titleAr || item.nameAr || item.title || item.name || item).slice(0, 4)
        : azkarItems.length ? azkarItems : fallback.items,
    };
  });

  return (
    <div className="space-y-4 pb-5">
      {banner?.enabled !== false && (
        <div
          className="rounded-[20px] p-4 text-white relative overflow-hidden shadow-lg"
          style={{ background: `linear-gradient(135deg, ${bannerColor}, ${bannerColor}d9)` }}
        >
          <div className="flex items-center justify-between gap-3">
            <Moon className="w-8 h-8 opacity-80" />
            <div className="text-right min-w-0">
              <p className="font-bold text-[18px] leading-7 truncate">{bannerTitle}</p>
              <p className="text-[13px] leading-5 opacity-90 line-clamp-2">{bannerSubtitle}</p>
            </div>
          </div>
        </div>
      )}

      <div className={`text-center text-[12px] font-semibold ${sec(theme)}`}>
        الإثنين ٢٤ ذو القعدة ١٤٤٧ هـ <span className="opacity-50 px-1">|</span> ١١ مايو ٢٠٢٦
      </div>

      <GlassCard theme={theme} className="px-3 py-3">
        <SectionHeader title="أبرز اليوم" icon={Star} color="#c07b10" theme={theme} />
        <div className="flex gap-2 overflow-hidden">
          {highlights.slice(0, 4).map((item) => (
            <div key={item.id} className={`min-w-[74px] rounded-[18px] border p-2 text-center ${themeClass[theme].panelSoft}`}>
              <div className="mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${item.color}24` }}>
                <AppIconGlyph icon={item.icon} color={item.color} size={19} />
              </div>
              <p className={`text-[10px] leading-4 ${txt(theme)} line-clamp-2`}>{item.name}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      <div>
        <SectionHeader title="الوصول السريع" icon={Zap} color="#5856D6" theme={theme} />
        <div className="flex gap-2.5 overflow-hidden -mx-1 px-1">
          {quickAccessItems.slice(0, 4).map((item) => (
            <div key={item.id} className="w-[72px] shrink-0 text-center">
              <div className={`mx-auto mb-1.5 flex h-12 w-12 items-center justify-center rounded-full border ${themeClass[theme].panel}`} style={{ borderColor: `${item.color}35` }}>
                <AppIconGlyph icon={item.icon} color={item.color} size={24} />
              </div>
              <p className={`text-[11px] leading-4 ${txt(theme)} line-clamp-2`}>{item.nameAr}</p>
            </div>
          ))}
          <div className="w-[72px] shrink-0 text-center">
            <div className="mx-auto mb-1.5 flex h-12 w-12 items-center justify-center rounded-full bg-[#0d8e62]">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <p className={`text-[11px] leading-4 ${txt(theme)}`}>تخصيص</p>
          </div>
        </div>
      </div>

      {sections.map((section) => (
        <GlassCard key={section.id} theme={theme} className="p-3">
          <SectionHeader title={section.title} icon={section.icon} color={section.color} theme={theme} />
          <div className="grid grid-cols-2 gap-2">
            {section.items.slice(0, 4).map((item: string) => (
              <div key={item} className={`min-h-[74px] rounded-[18px] border p-3 text-center ${themeClass[theme].panelSoft}`}>
                <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${section.color}20` }}>
                  <AppIconGlyph icon={section.icon} color={section.color} size={18} />
                </div>
                <p className={`text-[11px] leading-4 ${txt(theme)} line-clamp-2`}>{item}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

function QuranScreen({ theme }: { theme: ThemeMode }) {
  return (
    <div className="space-y-3 pb-5">
      <div className={`rounded-2xl border px-3 py-2 flex items-center gap-2 ${themeClass[theme].panel}`}>
        <Search className={`w-4 h-4 ${sec(theme)}`} />
        <span className={`text-xs ${sec(theme)}`}>ابحث في القرآن...</span>
      </div>

      <div className="rounded-[22px] p-4 text-white" style={{ background: 'linear-gradient(135deg, #0f766e, #14532d)' }}>
        <p className="text-[11px] opacity-80">آخر قراءة</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] opacity-85">الصفحة ٤٥</span>
          <p className="text-base font-bold">سورة البقرة</p>
        </div>
      </div>

      {['الفاتحة', 'البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام'].map((name, i) => (
        <GlassCard key={name} theme={theme} className="p-3">
          <div className="flex items-center justify-between">
            <span className={`text-[11px] ${sec(theme)}`}>{[7, 286, 200, 176, 120, 165][i]} آية</span>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className={`font-bold text-sm ${txt(theme)}`}>{name}</p>
                <p className={`text-[10px] ${sec(theme)}`}>مدنية</p>
              </div>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold bg-emerald-500/15 text-emerald-500">
                {i + 1}
              </div>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

function TasbihScreen({ theme }: { theme: ThemeMode }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-5 pb-8">
      <div className="text-center">
        <p className={`font-bold text-xl ${txt(theme)}`}>سبحان الله</p>
        <p className={`text-xs mt-1 ${sec(theme)}`}>٣٣ مرة</p>
      </div>

      <div className="relative w-44 h-44 flex items-center justify-center">
        <svg width="176" height="176" viewBox="0 0 176 176">
          <circle cx="88" cy="88" r="76" fill="none" stroke={theme === 'dark' ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)'} strokeWidth="8" />
          <circle cx="88" cy="88" r="76" fill="none" stroke={APP_GREEN} strokeWidth="8" strokeDasharray={`${2 * Math.PI * 76 * 0.45} ${2 * Math.PI * 76}`} strokeLinecap="round" transform="rotate(-90 88 88)" />
        </svg>
        <span className={`absolute text-5xl font-bold ${txt(theme)}`}>١٥</span>
      </div>

      <button className="w-24 h-24 rounded-full flex items-center justify-center bg-emerald-500/20 border-2 border-emerald-500 shadow-lg shadow-emerald-900/20">
        <RotateCw className="w-10 h-10 text-emerald-500" />
      </button>
    </div>
  );
}

function PrayerScreen({ theme }: { theme: ThemeMode }) {
  const prayers = [
    { name: 'الفجر', time: '٤:٥٢', active: false },
    { name: 'الشروق', time: '٦:١٥', active: false },
    { name: 'الظهر', time: '١٢:٠٨', active: false },
    { name: 'العصر', time: '٣:٤٥', active: true },
    { name: 'المغرب', time: '٦:٣٢', active: false },
    { name: 'العشاء', time: '٧:٥٥', active: false },
  ];

  return (
    <div className="space-y-3 pb-5">
      <div className="rounded-[24px] p-5 text-white text-center" style={{ background: 'linear-gradient(135deg, #123d33, #2d6a4f)' }}>
        <p className="text-xs opacity-80">الصلاة القادمة</p>
        <p className="text-2xl font-bold mt-1">العصر</p>
        <p className="text-3xl font-bold mt-2 text-[#D4AF37] tracking-widest">٠٢:١٥</p>
        <p className="text-xs opacity-80 mt-1">٣:٤٥ م</p>
      </div>

      {prayers.map((prayer) => (
        <GlassCard key={prayer.name} theme={theme} className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock3 className={`w-4 h-4 ${prayer.active ? 'text-emerald-500' : sec(theme)}`} />
              <span className={`text-xs ${sec(theme)}`}>{prayer.time}</span>
            </div>
            <span className={`text-sm font-semibold ${prayer.active ? 'text-emerald-500' : txt(theme)}`}>{prayer.name}</span>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

function SettingsScreen({ theme }: { theme: ThemeMode }) {
  const sections = [
    { title: 'العرض', items: [{ icon: Settings, name: 'إعدادات العرض', value: 'داكن' }, { icon: BookOpen, name: 'إعدادات القرآن' }] },
    { title: 'الإشعارات', items: [{ icon: Moon, name: 'الإشعارات', toggle: true }] },
    { title: 'الاشتراك', items: [{ icon: Crown, name: 'روح المسلم بريميوم' }] },
    { title: 'أخرى', items: [{ icon: Smartphone, name: 'الودجات' }, { icon: Heart, name: 'مشاركة التطبيق' }] },
  ];

  return (
    <div className="space-y-4 pb-5">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="text-[12px] font-bold mb-2 pr-1 text-emerald-500">{section.title}</p>
          <GlassCard theme={theme} className={`divide-y ${themeClass[theme].divider}`}>
            {section.items.map((item: any) => {
              const Icon = item.icon;
              return (
                <div key={item.name} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.toggle && (
                      <div className="w-9 h-5 rounded-full p-0.5 bg-emerald-500">
                        <div className="w-4 h-4 bg-white rounded-full mr-auto" />
                      </div>
                    )}
                    {item.value && <span className={`text-[11px] ${sec(theme)}`}>{item.value}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${txt(theme)}`}>{item.name}</span>
                    <Icon className={`w-4 h-4 ${sec(theme)}`} />
                  </div>
                </div>
              );
            })}
          </GlassCard>
        </div>
      ))}
    </div>
  );
}

// ==================== Main Component ====================
const PREVIEW_SCREENS: { id: string; name: string; icon: IconComponent }[] = [
  { id: 'home', name: 'الرئيسية', icon: Home },
  { id: 'quran', name: 'القرآن', icon: BookOpen },
  { id: 'tasbih', name: 'التسبيح', icon: RotateCw },
  { id: 'prayer', name: 'الصلاة', icon: Landmark },
  { id: 'settings', name: 'الإعدادات', icon: Settings },
];

const MobilePreview: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [device, setDevice] = useState<'iphone' | 'android'>('iphone');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [currentScreen, setCurrentScreen] = useState('home');
  const [rotation, setRotation] = useState(0);
  const deviceRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (deviceRef.current) {
      deviceRef.current.style.transform = `rotate(${rotation}deg)`;
    }
  }, [rotation]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-3xl w-full max-w-6xl max-h-[95vh] overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="w-6 h-6 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">معاينة التطبيق</h2>
            <span className="text-xs bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full">قريبة من التطبيق</span>
          </div>
          <button type="button" onClick={onClose} title="إغلاق" className="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-slate-700 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">الجهاز:</span>
            <div className="flex bg-slate-700 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setDevice('iphone')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  device === 'iphone' ? 'bg-slate-600 text-white' : 'text-slate-400'
                }`}
              >
                iPhone
              </button>
              <button
                type="button"
                onClick={() => setDevice('android')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  device === 'android' ? 'bg-slate-600 text-white' : 'text-slate-400'
                }`}
              >
                Android
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">الوضع:</span>
            <div className="flex bg-slate-700 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  theme === 'light' ? 'bg-slate-600 text-white' : 'text-slate-400'
                }`}
              >
                فاتح
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  theme === 'dark' ? 'bg-slate-600 text-white' : 'text-slate-400'
                }`}
              >
                داكن
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
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setRotation(r => r + 90)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            تدوير
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={data.loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm disabled:opacity-50"
          >
            {data.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            تحديث البيانات
          </button>
        </div>

        {/* Preview Area */}
        <div className="p-6 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 min-h-[640px] max-h-[calc(95vh-190px)] overflow-auto">
          <div
            ref={deviceRef}
            className={`relative transition-transform duration-500 ${
              device === 'iphone'
                ? 'w-[360px] h-[740px] rounded-[58px]'
                : 'w-[344px] h-[720px] rounded-[34px]'
            } bg-black p-3 shadow-2xl shadow-black/60`}
          >
            <div
              className={`w-full h-full overflow-hidden ${
                device === 'iphone' ? 'rounded-[40px]' : 'rounded-[24px]'
              } ${theme === 'dark' ? 'bg-[#0b1421]' : 'bg-[#f7f8f5]'}`}
            >
              {/* Notch */}
              {device === 'iphone' && (
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-[126px] h-[36px] bg-black rounded-[22px] z-20" />
              )}

              {/* Status Bar */}
              <div className={`flex items-center justify-between px-9 pt-4 pb-2 ${txt(theme)}`}>
                <span className="text-[13px] font-bold">9:41</span>
                <div className="flex items-center gap-1">
                  <div className={`w-6 h-3 border-2 rounded-sm ${theme === 'dark' ? 'border-white' : 'border-gray-800'}`}>
                    <div className={`w-4 h-full rounded-sm ${theme === 'dark' ? 'bg-white' : 'bg-gray-800'}`} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col h-[calc(100%-40px)] min-h-0" dir="rtl">
                {/* App Header — Glass style */}
                <div
                  className={`px-5 py-4 flex items-center justify-between backdrop-blur-md border-b ${
                    theme === 'dark' ? 'bg-[rgba(11,20,33,0.86)] border-white/[0.06]' : 'bg-white/[0.84] border-black/[0.06]'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-emerald-500">
                    {data.loading ? '...' : 'Firebase جزئي ✓'}
                  </div>
                  <h1 className={`text-[17px] font-extrabold ${txt(theme)}`}>روح المسلم</h1>
                </div>

                {/* Screen Content */}
                <div className="flex-1 min-h-0 p-4 overflow-auto">
                  {data.loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                      <p className={`text-sm ${sec(theme)}`}>
                        جاري تحميل البيانات من Firebase...
                      </p>
                    </div>
                  ) : data.error ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <p className="text-red-400 text-sm text-center">{data.error}</p>
                      <button type="button" onClick={loadData} className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm">
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
                  className={`border-t px-2 py-2 flex items-center justify-around backdrop-blur-md ${
                    theme === 'dark'
                      ? 'bg-[rgba(16,22,33,0.95)] border-white/[0.08]'
                      : 'bg-white/95 border-black/[0.08]'
                  }`}
                >
                  {/* RTL order: Settings(left) → Prayer → Tasbih → Quran → Home(right) */}
                  {[...PREVIEW_SCREENS].reverse().map((screen) => (
                    (() => {
                      const TabIcon = screen.icon;
                      const isActive = currentScreen === screen.id;
                      return (
                    <button
                      type="button"
                      key={screen.id}
                      onClick={() => setCurrentScreen(screen.id)}
                      className="flex w-[58px] flex-col items-center p-1.5 rounded-xl transition-colors"
                    >
                      <TabIcon
                        className="w-5 h-5"
                        style={{ color: isActive ? APP_GREEN : theme === 'dark' ? '#6b7280' : '#9ca3af' }}
                      />
                      <span
                        className={`text-[9px] mt-0.5 font-medium ${
                          isActive
                            ? 'text-emerald-500'
                            : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                        }`}
                      >
                        {screen.name}
                      </span>
                    </button>
                      );
                    })()
                  ))}
                </div>

                {/* Home Indicator */}
                {device === 'iphone' && (
                  <div className={`flex justify-center pb-2 ${
                    theme === 'dark' ? 'bg-[rgba(16,22,33,0.95)]' : 'bg-white/95'
                  }`}>
                    <div
                      className={`w-32 h-1 rounded-full ${
                        theme === 'dark' ? 'bg-white/20' : 'bg-black/15'
                      }`}
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
            {data.loading ? 'جاري التحميل...' : data.error ? 'خطأ في التحميل' : 'بيانات Firebase جزئية ✓'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobilePreview;
