// admin-panel/src/pages/WelcomeBanner.tsx
// إدارة الرسالة الترحيبية - روح المسلم

import React, { useState, useEffect } from 'react';
import {
  Save,
  Eye,
  EyeOff,
  RefreshCw,
  Megaphone,
  Palette,
  Link,
  Type,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Image,
  Layout,
} from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Styled } from '../components/Styled';

// ========================================
// الأنواع
// ========================================

interface WelcomeBannerData {
  enabled: boolean;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  route: string;
  displayMode: 'text' | 'text_image' | 'image_only';
  backgroundImage: string;
}

const DEFAULT_BANNER: WelcomeBannerData = {
  enabled: true,
  title: 'رمضان مبارك',
  subtitle: 'كل عام وأنتم بخير',
  icon: 'moon-waning-crescent',
  color: '#2f7659',
  route: '/seasonal/ramadan',
  displayMode: 'text',
  backgroundImage: '',
};

const DISPLAY_MODE_OPTIONS = [
  { value: 'text' as const, label: 'نص فقط', description: 'عرض النص والأيقونة فقط', icon: Type },
  { value: 'text_image' as const, label: 'نص + صورة خلفية', description: 'نص مع صورة خلفية', icon: Layout },
  { value: 'image_only' as const, label: 'صورة فقط', description: 'صورة كاملة بدون نص', icon: Image },
];

const ICON_OPTIONS = [
  { value: 'moon-waning-crescent', label: '🌙 هلال' },
  { value: 'star-crescent', label: '☪️ نجمة وهلال' },
  { value: 'mosque', label: '🕌 مسجد' },
  { value: 'book-open-variant', label: '📖 قرآن' },
  { value: 'hands-pray', label: '🤲 دعاء' },
  { value: 'star-four-points', label: '✨ نجمة' },
  { value: 'heart', label: '❤️ قلب' },
  { value: 'party-popper', label: '🎉 احتفال' },
  { value: 'calendar-month', label: '📅 تقويم' },
  { value: 'bell', label: '🔔 جرس' },
  { value: 'gift', label: '🎁 هدية' },
  { value: 'shield-check', label: '🛡️ حماية' },
];

const ROUTE_OPTIONS = [
  { value: '/(tabs)', label: 'الرئيسية' },
  { value: '/(tabs)/quran', label: 'القرآن' },
  { value: '/(tabs)/prayer', label: 'الصلاة' },
  { value: '/(tabs)/tasbih', label: 'التسبيح' },
  { value: '/seasonal/ramadan', label: 'صفحة رمضان' },
  { value: '/azkar/morning', label: 'أذكار الصباح' },
  { value: '/azkar/evening', label: 'أذكار المساء' },
  { value: '/azkar/sleep', label: 'أذكار النوم' },
  { value: '/azkar/wakeup', label: 'أذكار الاستيقاظ' },
  { value: '/names', label: 'أسماء الله الحسنى' },
  { value: '/hajj-umrah', label: 'الحج والعمرة' },
  { value: '/hajj', label: 'مناسك الحج' },
  { value: '/umrah', label: 'مناسك العمرة' },
  { value: '/daily-ayah', label: 'آية اليوم' },
  { value: '/daily-dua', label: 'دعاء اليوم' },
  { value: '/daily-dhikr', label: 'ذكر اليوم' },
  { value: '/hadith-of-day', label: 'حديث اليوم' },
  { value: '/story-of-day', label: 'قصة اليوم' },
  { value: '/hijri', label: 'التقويم الهجري' },
  { value: '/khatma', label: 'ختمة القرآن' },
  { value: '/worship-tracker', label: 'تتبع العبادات' },
  { value: '/ruqya', label: 'الرقية الشرعية' },
  { value: '/seerah', label: 'السيرة النبوية' },
  { value: '/companions', label: 'قصص الصحابة' },
  { value: '/radio', label: 'إذاعة القرآن' },
  { value: '/all-favorites', label: 'المحفوظات' },
  { value: '/subscription', label: 'الاشتراك' },
];

const COLOR_PRESETS = [
  { value: '#2f7659', label: 'أخضر' },
  { value: '#1e40af', label: 'أزرق' },
  { value: '#7c2d12', label: 'بني' },
  { value: '#5b21b6', label: 'بنفسجي' },
  { value: '#be123c', label: 'أحمر' },
  { value: '#0D9488', label: 'تركواز' },
  { value: '#d97706', label: 'برتقالي' },
  { value: '#8B4513', label: 'بني داكن' },
  { value: '#6d28d9', label: 'موف' },
  { value: '#059669', label: 'أخضر فاتح' },
];

const FIRESTORE_DOC = 'config/app-settings';

// ========================================
// المكون الرئيسي
// ========================================

export default function WelcomeBanner() {
  const [banner, setBanner] = useState<WelcomeBannerData>(DEFAULT_BANNER);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [customRoute, setCustomRoute] = useState('');

  // تحميل البيانات من Firestore
  useEffect(() => {
    const loadBanner = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(db, FIRESTORE_DOC);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.welcomeBanner) {
            setBanner({ ...DEFAULT_BANNER, ...data.welcomeBanner });
            // Check if route is custom
            const isPreset = ROUTE_OPTIONS.some(r => r.value === data.welcomeBanner.route);
            if (!isPreset) {
              setCustomRoute(data.welcomeBanner.route);
            }
          }
        }
      } catch (error) {
        console.error('Error loading banner:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadBanner();
  }, []);

  // حفظ في Firestore
  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const docRef = doc(db, FIRESTORE_DOC);
      const docSnap = await getDoc(docRef);
      const existingData = docSnap.exists() ? docSnap.data() : {};

      await setDoc(docRef, {
        ...existingData,
        welcomeBanner: banner,
      });

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving banner:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const updateBanner = <K extends keyof WelcomeBannerData>(key: K, value: WelcomeBannerData[K]) => {
    setBanner(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
            <Megaphone className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">الرسالة الترحيبية</h1>
            <p className="text-slate-400 text-sm">تحكم في البانر الترحيبي على الصفحة الرئيسية</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
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
          {isSaving ? 'جاري الحفظ...' : saveStatus === 'success' ? 'تم الحفظ!' : saveStatus === 'error' ? 'خطأ!' : 'حفظ التغييرات'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* الإعدادات */}
        <div className="lg:col-span-2 space-y-6">
          {/* تفعيل/إخفاء */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {banner.enabled ? (
                  <Eye className="w-5 h-5 text-emerald-400" />
                ) : (
                  <EyeOff className="w-5 h-5 text-slate-400" />
                )}
                <div>
                  <h3 className="text-white font-semibold">إظهار الرسالة الترحيبية</h3>
                  <p className="text-slate-400 text-sm">عند التعطيل، لن تظهر الرسالة على الصفحة الرئيسية</p>
                </div>
              </div>
              <button
                onClick={() => updateBanner('enabled', !banner.enabled)}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  banner.enabled ? 'bg-emerald-500' : 'bg-slate-600'
                }`}
                aria-label={banner.enabled ? 'تعطيل الرسالة الترحيبية' : 'تفعيل الرسالة الترحيبية'}
                title={banner.enabled ? 'تعطيل الرسالة الترحيبية' : 'تفعيل الرسالة الترحيبية'}
              >
                <div
                  className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                    banner.enabled ? 'right-0.5' : 'right-7'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* نوع العرض */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Layout className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white font-semibold">نوع العرض</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DISPLAY_MODE_OPTIONS.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.value}
                    onClick={() => updateBanner('displayMode', mode.value)}
                    className={`p-4 rounded-xl border text-right transition-all ${
                      banner.displayMode === mode.value
                        ? 'border-emerald-500 bg-emerald-500/20 text-white'
                        : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-2" />
                    <p className="font-medium text-sm">{mode.label}</p>
                    <p className="text-xs opacity-60 mt-1">{mode.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* رابط الصورة */}
          {(banner.displayMode === 'text_image' || banner.displayMode === 'image_only') && (
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <Image className="w-5 h-5 text-emerald-400" />
                <h3 className="text-white font-semibold">صورة الخلفية</h3>
              </div>
              <input
                type="text"
                value={banner.backgroundImage}
                onChange={(e) => updateBanner('backgroundImage', e.target.value)}
                className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none transition-colors font-mono text-sm"
                placeholder="https://example.com/image.jpg"
                aria-label="رابط صورة الخلفية"
                dir="ltr"
              />
              <p className="text-xs text-slate-400 mt-2">أدخل رابط الصورة (يفضل بأبعاد 800×200 أو نسبة 4:1)</p>
              {banner.backgroundImage && (
                <div className="mt-3 rounded-xl overflow-hidden border border-slate-600">
                  <img
                    src={banner.backgroundImage}
                    alt="معاينة الخلفية"
                    className="w-full h-32 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
            </div>
          )}

          {/* النصوص */}
          {banner.displayMode !== 'image_only' && (
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Type className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white font-semibold">النصوص</h3>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">العنوان الرئيسي</label>
              <input
                type="text"
                value={banner.title}
                onChange={(e) => updateBanner('title', e.target.value)}
                className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none transition-colors"
                placeholder="مثال: رمضان مبارك"
                aria-label="العنوان الرئيسي"
                dir="rtl"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">العنوان الفرعي</label>
              <input
                type="text"
                value={banner.subtitle}
                onChange={(e) => updateBanner('subtitle', e.target.value)}
                className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none transition-colors"
                placeholder="مثال: كل عام وأنتم بخير"
                aria-label="العنوان الفرعي"
                dir="rtl"
              />
            </div>
          </div>
          )}

          {/* الأيقونة */}
          {banner.displayMode !== 'image_only' && (
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white font-semibold">الأيقونة</h3>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {ICON_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateBanner('icon', opt.value)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    banner.icon === opt.value
                      ? 'border-emerald-500 bg-emerald-500/20 text-white'
                      : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span className="text-lg">{opt.label.split(' ')[0]}</span>
                  <p className="text-xs mt-1">{opt.label.split(' ').slice(1).join(' ')}</p>
                </button>
              ))}
            </div>
          </div>
          )}

          {/* اللون */}
          {banner.displayMode !== 'image_only' && (
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white font-semibold">لون البانر</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => updateBanner('color', c.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                    banner.color === c.value
                      ? 'border-white ring-2 ring-white/30'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <Styled
                    className="w-5 h-5 rounded-full"
                    css={{ backgroundColor: c.value }}
                  />
                  <span className="text-sm text-slate-300">{c.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <label className="text-sm text-slate-400">لون مخصص:</label>
              <input
                type="color"
                value={banner.color}
                onChange={(e) => updateBanner('color', e.target.value)}
                className="w-10 h-10 rounded-lg border border-slate-600 cursor-pointer"
                aria-label="اختيار لون مخصص"
              />
              <input
                type="text"
                value={banner.color}
                onChange={(e) => updateBanner('color', e.target.value)}
                className="bg-slate-700 text-white rounded-lg px-3 py-2 w-32 border border-slate-600 text-sm font-mono"
                aria-label="كود اللون"
                placeholder="#000000"
                dir="ltr"
              />
            </div>
          </div>
          )}

          {/* الوجهة */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Link className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white font-semibold">عند الضغط على البانر</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ROUTE_OPTIONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => {
                    updateBanner('route', r.value);
                    setCustomRoute('');
                  }}
                  className={`p-3 rounded-xl border text-sm transition-all ${
                    banner.route === r.value && !customRoute
                      ? 'border-emerald-500 bg-emerald-500/20 text-white'
                      : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <label className="block text-sm text-slate-400 mb-2">أو أدخل رابط مخصص</label>
              <input
                type="text"
                value={customRoute}
                onChange={(e) => {
                  setCustomRoute(e.target.value);
                  if (e.target.value) {
                    updateBanner('route', e.target.value);
                  }
                }}
                className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none transition-colors font-mono text-sm"
                placeholder="/custom/route"
                aria-label="رابط مخصص"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* المعاينة */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <h3 className="text-white font-semibold">معاينة البانر</h3>

            {/* Preview — Light */}
            <div className="bg-gray-100 rounded-2xl p-4">
              <p className="text-xs text-gray-500 mb-2 text-center">الوضع الفاتح</p>
              {banner.enabled ? (
                banner.displayMode === 'image_only' && banner.backgroundImage ? (
                  <div className="rounded-2xl overflow-hidden">
                    <img src={banner.backgroundImage} alt="banner" className="w-full h-24 object-cover" />
                  </div>
                ) : banner.displayMode === 'text_image' && banner.backgroundImage ? (
                  <Styled
                    className="rounded-2xl p-5 text-white relative overflow-hidden"
                    css={{ backgroundImage: `url(${banner.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                  >
                    <div className="absolute inset-0 bg-black/40 rounded-2xl" />
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-lg font-bold">{banner.title || 'العنوان'}</p>
                        <p className="text-sm opacity-80">{banner.subtitle || 'العنوان الفرعي'}</p>
                      </div>
                      <div className="text-3xl opacity-80">
                        {ICON_OPTIONS.find(i => i.value === banner.icon)?.label.split(' ')[0] || '🌙'}
                      </div>
                    </div>
                  </Styled>
                ) : (
                  <Styled
                    className="rounded-2xl p-5 text-white"
                    css={{ backgroundColor: `${banner.color}CC` }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold">{banner.title || 'العنوان'}</p>
                        <p className="text-sm opacity-80">{banner.subtitle || 'العنوان الفرعي'}</p>
                      </div>
                      <div className="text-3xl opacity-80">
                        {ICON_OPTIONS.find(i => i.value === banner.icon)?.label.split(' ')[0] || '🌙'}
                      </div>
                    </div>
                  </Styled>
                )
              ) : (
                <div className="rounded-2xl p-5 bg-gray-300 text-gray-500 text-center">
                  <EyeOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">البانر مخفي</p>
                </div>
              )}
            </div>

            {/* Preview — Dark */}
            <div className="bg-slate-950 rounded-2xl p-4">
              <p className="text-xs text-slate-500 mb-2 text-center">الوضع الداكن</p>
              {banner.enabled ? (
                banner.displayMode === 'image_only' && banner.backgroundImage ? (
                  <div className="rounded-2xl overflow-hidden">
                    <img src={banner.backgroundImage} alt="banner" className="w-full h-24 object-cover" />
                  </div>
                ) : banner.displayMode === 'text_image' && banner.backgroundImage ? (
                  <Styled
                    className="rounded-2xl p-5 text-white relative overflow-hidden"
                    css={{ backgroundImage: `url(${banner.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                  >
                    <div className="absolute inset-0 bg-black/40 rounded-2xl" />
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-lg font-bold">{banner.title || 'العنوان'}</p>
                        <p className="text-sm opacity-80">{banner.subtitle || 'العنوان الفرعي'}</p>
                      </div>
                      <div className="text-3xl opacity-80">
                        {ICON_OPTIONS.find(i => i.value === banner.icon)?.label.split(' ')[0] || '🌙'}
                      </div>
                    </div>
                  </Styled>
                ) : (
                  <Styled
                    className="rounded-2xl p-5 text-white"
                    css={{ backgroundColor: `${banner.color}CC` }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold">{banner.title || 'العنوان'}</p>
                        <p className="text-sm opacity-80">{banner.subtitle || 'العنوان الفرعي'}</p>
                      </div>
                      <div className="text-3xl opacity-80">
                        {ICON_OPTIONS.find(i => i.value === banner.icon)?.label.split(' ')[0] || '🌙'}
                      </div>
                    </div>
                  </Styled>
                )
              ) : (
                <div className="rounded-2xl p-5 bg-slate-800 text-slate-500 text-center">
                  <EyeOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">البانر مخفي</p>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
              <h4 className="text-sm font-semibold text-emerald-400 mb-2">ملاحظات</h4>
              <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                <li>التغييرات تظهر فوراً بعد الحفظ</li>
                <li>يتم تحميل الإعدادات عند فتح التطبيق</li>
                <li>الصفحة المحددة تفتح عند الضغط على البانر</li>
                <li>البانر يظهر فقط عند تفعيل الخيار</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
