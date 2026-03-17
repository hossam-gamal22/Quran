import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Trash2 } from 'lucide-react';

interface AdUnitIds {
  android: string;
  ios: string;
}

interface AdSlot {
  enabled: boolean;
  adUnitId: AdUnitIds;
  type: 'banner' | 'interstitial';
  label: string;
  screens?: string[];
  position?: 'top' | 'bottom';
}

interface AdsSettings {
  enabled: boolean;
  // Ad Unit IDs per platform
  bannerAdId: AdUnitIds;
  interstitialAdId: AdUnitIds;
  appOpenAdId: AdUnitIds;
  // Named ad slots
  adSlots: Record<string, AdSlot>;
  // Per-screen banner visibility
  bannerScreens: Record<string, boolean>;
  // App Open Ad
  showAdOnAppOpen: boolean;
  // Interstitial settings
  interstitialMode: 'pages' | 'time' | 'session';
  interstitialFrequency: number;
  interstitialTimeInterval: number;
  interstitialSessionLimit: number;
  delayFirstAd: boolean;
  firstAdDelay: number;
  updatedAt: string;
}

// Production Ad Unit IDs
const PROD_IDS = {
  ios: {
    banner: 'ca-app-pub-3645278220050673/9534813157',
    interstitial: 'ca-app-pub-3645278220050673/7064203695',
    appOpen: 'ca-app-pub-3645278220050673/6908649810',
    nativeAdvanced: 'ca-app-pub-3645278220050673/8070163603',
  },
  android: {
    banner: 'ca-app-pub-3645278220050673/6453829605',
    interstitial: 'ca-app-pub-3645278220050673/5882983961',
    appOpen: 'ca-app-pub-3645278220050673/3627880358',
    nativeAdvanced: 'ca-app-pub-3645278220050673/5595568144',
  },
};

// Predefined ad slot definitions
const PREDEFINED_SLOTS: { key: string; label: string; type: 'banner' | 'interstitial' }[] = [
  { key: 'ad_home_banner', label: 'بانر الصفحة الرئيسية', type: 'banner' },
  { key: 'ad_home_interstitial', label: 'إعلان بيني — الرئيسية', type: 'interstitial' },
  { key: 'ad_quran_between_surahs', label: 'بانر بين السور', type: 'banner' },
  { key: 'ad_prayer_times_bottom', label: 'بانر أسفل المواقيت', type: 'banner' },
  { key: 'ad_tasbih_completion', label: 'إعلان بيني — إتمام التسبيح', type: 'interstitial' },
  { key: 'ad_settings_top', label: 'بانر أعلى الإعدادات', type: 'banner' },
  { key: 'ad_section_detail_banner', label: 'بانر تفاصيل الأقسام', type: 'banner' },
];

const SCREEN_LABELS: Record<string, string> = {
  home: 'الصفحة الرئيسية',
  quran: 'صفحة القرآن',
  azkar: 'الأذكار',
  tasbih: 'التسبيح',
  prayer: 'مواقيت الصلاة',
  duas: 'الأدعية',
  names: 'أسماء الله الحسنى',
  ruqya: 'الرقية الشرعية',
  hijri: 'التقويم الهجري',
  surah: 'قراءة السورة',
  tafsir: 'التفسير',
  khatma: 'الختمة',
  worship: 'متتبع العبادات',
  seerah: 'السيرة النبوية',
  companions: 'قصص الصحابة',
  hajj_umrah: 'الحج والعمرة',
  daily_ayah: 'آية اليوم',
  hadith: 'أحاديث',
  ayat_universe: 'آيات كونية',
  hadith_sifat: 'أحاديث صفات',
};

const DEFAULT_SETTINGS: AdsSettings = {
  enabled: true,
  bannerAdId: { android: PROD_IDS.android.banner, ios: PROD_IDS.ios.banner },
  interstitialAdId: { android: PROD_IDS.android.interstitial, ios: PROD_IDS.ios.interstitial },
  appOpenAdId: { android: PROD_IDS.android.appOpen, ios: PROD_IDS.ios.appOpen },
  adSlots: Object.fromEntries(
    PREDEFINED_SLOTS.map(s => [s.key, {
      enabled: false,
      adUnitId: {
        android: s.type === 'banner' ? PROD_IDS.android.banner : PROD_IDS.android.interstitial,
        ios: s.type === 'banner' ? PROD_IDS.ios.banner : PROD_IDS.ios.interstitial,
      },
      type: s.type,
      label: s.label,
    }])
  ),
  bannerScreens: {
    home: true,
    quran: false,
    azkar: true,
    tasbih: false,
    prayer: false,
    duas: false,
    names: false,
    ruqya: false,
    hijri: false,
    surah: false,
    tafsir: false,
    khatma: false,
    worship: false,
    seerah: true,
    companions: true,
    hajj_umrah: true,
    daily_ayah: true,
    hadith: true,
    ayat_universe: true,
    hadith_sifat: true,
  },
  showAdOnAppOpen: false,
  interstitialMode: 'pages',
  interstitialFrequency: 5,
  interstitialTimeInterval: 3,
  interstitialSessionLimit: 2,
  delayFirstAd: true,
  firstAdDelay: 30,
  updatedAt: new Date().toISOString(),
};

export default function Ads() {
  const [settings, setSettings] = useState<AdsSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'config', 'ads-settings');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Migrate old format to new format
        const migrated = migrateSettings(data);
        setSettings({ ...DEFAULT_SETTINGS, ...migrated } as AdsSettings);
      }
    } catch (error) {
      console.error('Error loading ads settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const migrateSettings = (data: Record<string, unknown>): Partial<AdsSettings> => {
    const result: Record<string, unknown> = { ...data };

    // Migrate old single ad codes to per-platform format
    if (data.bannerAdCode && !data.bannerAdId) {
      result.bannerAdId = { android: data.bannerAdCode, ios: data.bannerAdCode };
      delete result.bannerAdCode;
    }
    if (data.interstitialAdCode && !data.interstitialAdId) {
      result.interstitialAdId = { android: data.interstitialAdCode, ios: data.interstitialAdCode };
      delete result.interstitialAdCode;
    }

    // Migrate old flat boolean screens to bannerScreens object
    if (!data.bannerScreens) {
      const bannerScreens = { ...DEFAULT_SETTINGS.bannerScreens };
      if (data.showBannerOnHome !== undefined) bannerScreens.home = data.showBannerOnHome as boolean;
      if (data.showBannerOnQuran !== undefined) bannerScreens.quran = data.showBannerOnQuran as boolean;
      if (data.showBannerOnAzkar !== undefined) bannerScreens.azkar = data.showBannerOnAzkar as boolean;
      result.bannerScreens = bannerScreens;
      delete result.showBannerOnHome;
      delete result.showBannerOnQuran;
      delete result.showBannerOnAzkar;
    }

    return result as Partial<AdsSettings>;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const docRef = doc(db, 'config', 'ads-settings');
      const updatedSettings = { ...settings, updatedAt: new Date().toISOString() };
      await setDoc(docRef, updatedSettings);
      setSettings(updatedSettings);
      setMessage('تم حفظ إعدادات الإعلانات بنجاح!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving ads settings:', error);
      setMessage('خطأ في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const updateBannerScreen = (screen: string, value: boolean) => {
    setSettings({
      ...settings,
      bannerScreens: { ...settings.bannerScreens, [screen]: value },
    });
  };

  const updateAdId = (type: 'bannerAdId' | 'interstitialAdId' | 'appOpenAdId', platform: 'android' | 'ios', value: string) => {
    setSettings({
      ...settings,
      [type]: { ...settings[type], [platform]: value },
    });
  };

  // === Ad Slot management ===
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newSlotKey, setNewSlotKey] = useState('');
  const [newSlotLabel, setNewSlotLabel] = useState('');
  const [newSlotType, setNewSlotType] = useState<'banner' | 'interstitial'>('banner');
  const [newSlotScreens, setNewSlotScreens] = useState<string[]>([]);
  const [newSlotPosition, setNewSlotPosition] = useState<'top' | 'bottom'>('bottom');

  const updateSlot = (key: string, field: string, value: string | boolean) => {
    const slots = { ...(settings.adSlots || {}) };
    if (!slots[key]) return;
    if (field === 'enabled') {
      slots[key] = { ...slots[key], enabled: value };
    } else if (field === 'type') {
      slots[key] = { ...slots[key], type: value };
    } else if (field === 'label') {
      slots[key] = { ...slots[key], label: value };
    } else if (field === 'position') {
      slots[key] = { ...slots[key], position: value };
    } else if (field === 'adUnitId.android') {
      slots[key] = { ...slots[key], adUnitId: { ...slots[key].adUnitId, android: value } };
    } else if (field === 'adUnitId.ios') {
      slots[key] = { ...slots[key], adUnitId: { ...slots[key].adUnitId, ios: value } };
    }
    setSettings({ ...settings, adSlots: slots });
  };

  const toggleSlotScreen = (slotKey: string, screen: string) => {
    const slots = { ...(settings.adSlots || {}) };
    if (!slots[slotKey]) return;
    const current = slots[slotKey].screens || [];
    const updated = current.includes(screen) ? current.filter(s => s !== screen) : [...current, screen];
    slots[slotKey] = { ...slots[slotKey], screens: updated };
    setSettings({ ...settings, adSlots: slots });
  };

  const addCustomSlot = () => {
    const key = newSlotKey.trim().replace(/\s+/g, '_').toLowerCase();
    if (!key || !newSlotLabel.trim()) return;
    const slots = { ...(settings.adSlots || {}) };
    if (slots[key]) {
      setMessage('يوجد موضع بنفس المعرّف');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    slots[key] = {
      enabled: false,
      adUnitId: {
        android: newSlotType === 'banner' ? PROD_IDS.android.banner : PROD_IDS.android.interstitial,
        ios: newSlotType === 'banner' ? PROD_IDS.ios.banner : PROD_IDS.ios.interstitial,
      },
      type: newSlotType,
      label: newSlotLabel.trim(),
      screens: newSlotScreens,
      position: newSlotPosition,
    };
    setSettings({ ...settings, adSlots: slots });
    setNewSlotKey('');
    setNewSlotLabel('');
    setNewSlotType('banner');
    setNewSlotScreens([]);
    setNewSlotPosition('bottom');
    setShowAddSlot(false);
  };

  const removeSlot = (key: string) => {
    const slots = { ...(settings.adSlots || {}) };
    delete slots[key];
    setSettings({ ...settings, adSlots: slots });
  };

  const enabledScreenCount = Object.values(settings.bannerScreens).filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري تحميل الإعدادات...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">إعدادات الإعلانات</h1>
        {message && (
          <div className={`px-4 py-2 rounded-lg ${message.includes('بنجاح') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}
      </div>

      {/* تفعيل/تعطيل الإعلانات */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">تفعيل الإعلانات</h2>
            <p className="text-gray-500 text-sm">تشغيل أو إيقاف جميع الإعلانات في التطبيق</p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
            className={`px-6 py-3 rounded-lg font-medium ${settings.enabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}
          >
            {settings.enabled ? 'مفعّلة' : 'معطّلة'}
          </button>
        </div>
      </div>

      {/* أكواد AdMob - Banner */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">أكواد Google AdMob</h2>

        {/* Banner Ad */}
        <div className="mb-6 border border-gray-100 rounded-xl p-5">
          <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            Banner Ad Unit IDs
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">🤖 Android</label>
              <input
                type="text"
                value={settings.bannerAdId.android}
                onChange={(e) => updateAdId('bannerAdId', 'android', e.target.value)}
                placeholder="ca-app-pub-xxxxxxxx/xxxxxxxxxx"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">🍎 iOS</label>
              <input
                type="text"
                value={settings.bannerAdId.ios}
                onChange={(e) => updateAdId('bannerAdId', 'ios', e.target.value)}
                placeholder="ca-app-pub-xxxxxxxx/xxxxxxxxxx"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono"
                dir="ltr"
              />
            </div>
          </div>
          <p className="text-gray-400 text-xs mt-2">إعلان البانر الذي يظهر أسفل الشاشات</p>
        </div>

        {/* Interstitial Ad */}
        <div className="mb-6 border border-gray-100 rounded-xl p-5">
          <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            Interstitial Ad Unit IDs
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">🤖 Android</label>
              <input
                type="text"
                value={settings.interstitialAdId.android}
                onChange={(e) => updateAdId('interstitialAdId', 'android', e.target.value)}
                placeholder="ca-app-pub-xxxxxxxx/xxxxxxxxxx"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">🍎 iOS</label>
              <input
                type="text"
                value={settings.interstitialAdId.ios}
                onChange={(e) => updateAdId('interstitialAdId', 'ios', e.target.value)}
                placeholder="ca-app-pub-xxxxxxxx/xxxxxxxxxx"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono"
                dir="ltr"
              />
            </div>
          </div>
          <p className="text-gray-400 text-xs mt-2">إعلان ملء الشاشة (يمكن تخطيه)</p>
        </div>

        {/* App Open Ad */}
        <div className="border border-gray-100 rounded-xl p-5">
          <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            App Open Ad Unit IDs
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">🤖 Android</label>
              <input
                type="text"
                value={settings.appOpenAdId.android}
                onChange={(e) => updateAdId('appOpenAdId', 'android', e.target.value)}
                placeholder="ca-app-pub-xxxxxxxx/xxxxxxxxxx"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">🍎 iOS</label>
              <input
                type="text"
                value={settings.appOpenAdId.ios}
                onChange={(e) => updateAdId('appOpenAdId', 'ios', e.target.value)}
                placeholder="ca-app-pub-xxxxxxxx/xxxxxxxxxx"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono"
                dir="ltr"
              />
            </div>
          </div>
          <p className="text-gray-400 text-xs mt-2">إعلان عند فتح التطبيق</p>
        </div>
      </div>

      {/* أماكن عرض البانر */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">أماكن عرض البانر</h2>
            <p className="text-gray-500 text-sm">اختر الشاشات التي سيظهر فيها إعلان البانر ({enabledScreenCount} شاشات مفعّلة)</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(SCREEN_LABELS).map(([key, label]) => (
            <label key={key} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
              settings.bannerScreens[key] ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
            }`}>
              <input
                type="checkbox"
                checked={settings.bannerScreens[key] ?? false}
                onChange={(e) => updateBannerScreen(key, e.target.checked)}
                className="w-5 h-5 text-emerald-600 rounded"
              />
              <span className="text-gray-700 text-sm font-medium">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* إعلان عند فتح التطبيق */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">إعلان عند فتح التطبيق</h2>
            <p className="text-gray-500 text-sm">عرض إعلان (يمكن تخطيه) عند كل فتح للتطبيق</p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, showAdOnAppOpen: !settings.showAdOnAppOpen })}
            className={`px-6 py-3 rounded-lg font-medium ${settings.showAdOnAppOpen ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}
          >
            {settings.showAdOnAppOpen ? 'مفعّل' : 'معطّل'}
          </button>
        </div>
      </div>

      {/* إعدادات الإعلانات البينية */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">إعدادات الإعلانات البينية (Interstitial)</h2>
        <p className="text-gray-500 text-sm mb-4">إعلانات ملء الشاشة التي يمكن للمستخدم تخطيها</p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">طريقة عرض الإعلانات</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setSettings({ ...settings, interstitialMode: 'pages' })}
              className={`p-4 rounded-xl border-2 transition-all text-right ${settings.interstitialMode === 'pages' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <div className="font-medium text-gray-800 mb-1">كل عدد صفحات</div>
              <div className="text-sm text-gray-500">إظهار إعلان بعد عدد معين من الصفحات</div>
            </button>
            <button
              onClick={() => setSettings({ ...settings, interstitialMode: 'time' })}
              className={`p-4 rounded-xl border-2 transition-all text-right ${settings.interstitialMode === 'time' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <div className="font-medium text-gray-800 mb-1">كل فترة زمنية</div>
              <div className="text-sm text-gray-500">إظهار إعلان كل عدد دقائق</div>
            </button>
            <button
              onClick={() => setSettings({ ...settings, interstitialMode: 'session' })}
              className={`p-4 rounded-xl border-2 transition-all text-right ${settings.interstitialMode === 'session' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <div className="font-medium text-gray-800 mb-1">لكل جلسة</div>
              <div className="text-sm text-gray-500">عدد محدد من الإعلانات لكل فتح للتطبيق</div>
            </button>
          </div>
        </div>

        {settings.interstitialMode === 'pages' && (
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">عرض إعلان كل:</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={settings.interstitialFrequency}
                onChange={(e) => setSettings({ ...settings, interstitialFrequency: Number(e.target.value) })}
                min="1"
                max="50"
                aria-label="عدد الصفحات بين الإعلانات"
                className="w-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <span className="text-gray-600">صفحة</span>
            </div>
            <p className="text-gray-500 text-sm mt-2">سيظهر إعلان بعد كل {settings.interstitialFrequency} صفحات يتصفحها المستخدم</p>
          </div>
        )}

        {settings.interstitialMode === 'time' && (
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">عرض إعلان كل:</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={settings.interstitialTimeInterval}
                onChange={(e) => setSettings({ ...settings, interstitialTimeInterval: Number(e.target.value) })}
                min="1"
                max="60"
                aria-label="الفاصل الزمني بالدقائق"
                className="w-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <span className="text-gray-600">دقيقة</span>
            </div>
            <p className="text-gray-500 text-sm mt-2">سيظهر إعلان كل {settings.interstitialTimeInterval} دقائق أثناء استخدام التطبيق</p>
          </div>
        )}

        {settings.interstitialMode === 'session' && (
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">الحد الأقصى للإعلانات في كل جلسة:</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={settings.interstitialSessionLimit}
                onChange={(e) => setSettings({ ...settings, interstitialSessionLimit: Number(e.target.value) })}
                min="1"
                max="20"
                aria-label="الحد الأقصى للإعلانات لكل جلسة"
                className="w-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <span className="text-gray-600">إعلان لكل فتح للتطبيق</span>
            </div>
            <p className="text-gray-500 text-sm mt-2">سيظهر {settings.interstitialSessionLimit} إعلان كحد أقصى في كل مرة يفتح المستخدم التطبيق</p>
          </div>
        )}

        {/* تأخير أول إعلان */}
        <div className="mt-6 border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium text-gray-800">تأخير أول إعلان</h3>
              <p className="text-gray-500 text-sm">إعطاء المستخدم وقت قبل عرض أول إعلان</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, delayFirstAd: !settings.delayFirstAd })}
              className={`px-4 py-2 rounded-lg font-medium ${settings.delayFirstAd ? 'bg-emerald-500 text-white' : 'bg-gray-300 text-gray-700'}`}
            >
              {settings.delayFirstAd ? 'مفعّل' : 'معطّل'}
            </button>
          </div>
          {settings.delayFirstAd && (
            <div className="flex items-center gap-3">
              <span className="text-gray-600">تأخير أول إعلان بمقدار:</span>
              <input
                type="number"
                value={settings.firstAdDelay}
                onChange={(e) => setSettings({ ...settings, firstAdDelay: Number(e.target.value) })}
                min="5"
                max="300"
                aria-label="تأخير أول إعلان بالثواني"
                className="w-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <span className="text-gray-600">ثانية</span>
            </div>
          )}
        </div>
      </div>

      {/* مواضع الإعلانات (Ad Slots) */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">مواضع الإعلانات</h2>
            <p className="text-gray-500 text-sm">تحكم في كل موضع إعلاني بشكل مستقل — يمكنك إضافة مواضع جديدة لأي صفحة</p>
          </div>
          <button
            onClick={() => setShowAddSlot(!showAddSlot)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            إضافة موضع
          </button>
        </div>

        {/* Add new slot form */}
        {showAddSlot && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-5">
            <h3 className="font-medium text-emerald-800 mb-3">إضافة موضع إعلاني جديد</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">المعرّف (key)</label>
                <input
                  type="text"
                  value={newSlotKey}
                  onChange={(e) => setNewSlotKey(e.target.value)}
                  placeholder="ad_page_name"
                  aria-label="معرّف الموضع الإعلاني"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">الاسم (بالعربية)</label>
                <input
                  type="text"
                  value={newSlotLabel}
                  onChange={(e) => setNewSlotLabel(e.target.value)}
                  placeholder="بانر الصفحة"
                  aria-label="اسم الموضع الإعلاني"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">النوع</label>
                <select
                  value={newSlotType}
                  onChange={(e) => setNewSlotType(e.target.value as 'banner' | 'interstitial')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  aria-label="نوع الإعلان"
                  title="نوع الإعلان"
                >
                  <option value="banner">Banner</option>
                  <option value="interstitial">Interstitial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">الموقع</label>
                <select
                  value={newSlotPosition}
                  onChange={(e) => setNewSlotPosition(e.target.value as 'top' | 'bottom')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  aria-label="موقع الإعلان"
                  title="موقع الإعلان"
                >
                  <option value="top">أعلى الصفحة</option>
                  <option value="bottom">أسفل الصفحة</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-2">الصفحات المستهدفة (اختياري — اترك فارغاً للربط اليدوي)</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SCREEN_LABELS).map(([sKey, sLabel]) => (
                  <button
                    key={sKey}
                    onClick={() => setNewSlotScreens(prev => prev.includes(sKey) ? prev.filter(s => s !== sKey) : [...prev, sKey])}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${newSlotScreens.includes(sKey) ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-600 border-gray-300 hover:border-emerald-400'}`}
                  >
                    {sLabel}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={addCustomSlot}
                disabled={!newSlotKey.trim() || !newSlotLabel.trim()}
                className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
              >
                إضافة
              </button>
              <button
                onClick={() => setShowAddSlot(false)}
                className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Slot list */}
        <div className="space-y-4">
          {Object.entries(settings.adSlots || {}).map(([key, slot]) => {
            const isPredefined = PREDEFINED_SLOTS.some(s => s.key === key);
            return (
              <div key={key} className={`border rounded-xl p-5 transition-colors ${slot.enabled ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateSlot(key, 'enabled', !slot.enabled)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${slot.enabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}
                    >
                      {slot.enabled ? 'مفعّل' : 'معطّل'}
                    </button>
                    <div>
                      <div className="font-medium text-gray-800 flex items-center gap-2">
                        {slot.label}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${slot.type === 'banner' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {slot.type}
                        </span>
                        {slot.position && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {slot.position === 'top' ? '⬆ أعلى' : '⬇ أسفل'}
                          </span>
                        )}
                        {slot.screens && slot.screens.length > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            {slot.screens.length} صفحة
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 font-mono">{key}</span>
                    </div>
                  </div>
                  {!isPredefined && (
                    <button
                      onClick={() => removeSlot(key)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="حذف الموضع"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {slot.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">🤖 Android Ad Unit ID</label>
                      <input
                        type="text"
                        value={slot.adUnitId.android}
                        onChange={(e) => updateSlot(key, 'adUnitId.android', e.target.value)}
                        placeholder="ca-app-pub-xxx/yyy"
                        aria-label="Android Ad Unit ID"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-mono"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">🍎 iOS Ad Unit ID</label>
                      <input
                        type="text"
                        value={slot.adUnitId.ios}
                        onChange={(e) => updateSlot(key, 'adUnitId.ios', e.target.value)}
                        placeholder="ca-app-pub-xxx/yyy"
                        aria-label="iOS Ad Unit ID"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-mono"
                        dir="ltr"
                      />
                    </div>
                    <div className="md:col-span-2 flex gap-3 items-center flex-wrap">
                      <label className="text-xs font-medium text-gray-500">النوع:</label>
                      <select
                        value={slot.type}
                        onChange={(e) => updateSlot(key, 'type', e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                        aria-label="نوع الإعلان"
                        title="نوع الإعلان"
                      >
                        <option value="banner">Banner</option>
                        <option value="interstitial">Interstitial</option>
                      </select>
                      <label className="text-xs font-medium text-gray-500">الموقع:</label>
                      <select
                        value={slot.position || 'bottom'}
                        onChange={(e) => updateSlot(key, 'position', e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                        aria-label="موقع الإعلان"
                        title="موقع الإعلان"
                      >
                        <option value="top">أعلى الصفحة</option>
                        <option value="bottom">أسفل الصفحة</option>
                      </select>
                      {!isPredefined && (
                        <>
                          <label className="text-xs font-medium text-gray-500 mr-3">الاسم:</label>
                          <input
                            type="text"
                            value={slot.label}
                            onChange={(e) => updateSlot(key, 'label', e.target.value)}
                            placeholder="اسم الموضع"
                            aria-label="اسم الموضع"
                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                            title="اسم الموضع"
                          />
                        </>
                      )}
                    </div>
                    {/* Screen targeting */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-2">الصفحات المستهدفة (تلقائي بدون كود):</label>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(SCREEN_LABELS).map(([sKey, sLabel]) => (
                          <button
                            key={sKey}
                            onClick={() => toggleSlotScreen(key, sKey)}
                            className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${(slot.screens || []).includes(sKey) ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-400'}`}
                          >
                            {sLabel}
                          </button>
                        ))}
                      </div>
                      {(!slot.screens || slot.screens.length === 0) && (
                        <p className="text-xs text-amber-600 mt-1">⚠ لم يتم تحديد صفحات — سيحتاج ربط يدوي في الكود</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-gray-400 text-xs mt-4">⚠️ الموضع المعطّل أو بدون Ad Unit ID لن يظهر أي شيء — صفر مساحة فارغة</p>
      </div>

      {/* ملخص الإعدادات */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-blue-800 mb-3">ملخص الإعدادات الحالية</h3>
        <ul className="space-y-2 text-blue-700 text-sm">
          <li>• الإعلانات: <span className="font-medium">{settings.enabled ? 'مفعّلة' : 'معطّلة'}</span></li>
          <li>• إعلان فتح التطبيق: <span className="font-medium">{settings.showAdOnAppOpen ? 'مفعّل' : 'معطّل'}</span></li>
          <li>• البانر: <span className="font-medium">{enabledScreenCount} شاشة مفعّلة</span></li>
          <li>• مواضع إعلانية: <span className="font-medium">{Object.values(settings.adSlots || {}).filter(s => s.enabled).length} مفعّل من {Object.keys(settings.adSlots || {}).length}</span></li>
          <li>• الإعلانات البينية: <span className="font-medium">
            {settings.interstitialMode === 'pages' && `كل ${settings.interstitialFrequency} صفحات`}
            {settings.interstitialMode === 'time' && `كل ${settings.interstitialTimeInterval} دقائق`}
            {settings.interstitialMode === 'session' && `${settings.interstitialSessionLimit} إعلان لكل جلسة`}
          </span></li>
          <li>• تأخير أول إعلان: <span className="font-medium">{settings.delayFirstAd ? `${settings.firstAdDelay} ثانية` : 'بدون تأخير'}</span></li>
          <li>• جميع الإعلانات يمكن تخطيها</li>
        </ul>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-4 rounded-xl font-medium text-lg transition-colors ${saving ? 'bg-gray-400 text-gray-200 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
      >
        {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
      </button>

      <p className="text-center text-gray-500 text-sm mt-4">
        ⚡ التغييرات تنعكس في التطبيق عند فتحه مرة جديدة &bull; آخر تحديث: {new Date(settings.updatedAt).toLocaleString('ar-EG')}
      </p>
    </>
  );
}
