import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface AdUnitIds {
  android: string;
  ios: string;
}

interface AdsSettings {
  enabled: boolean;
  // Ad Unit IDs per platform
  bannerAdId: AdUnitIds;
  interstitialAdId: AdUnitIds;
  appOpenAdId: AdUnitIds;
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
};

const DEFAULT_SETTINGS: AdsSettings = {
  enabled: true,
  bannerAdId: { android: '', ios: '' },
  interstitialAdId: { android: '', ios: '' },
  appOpenAdId: { android: '', ios: '' },
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

  const migrateSettings = (data: Record<string, any>): Partial<AdsSettings> => {
    const result: any = { ...data };

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
      result.bannerScreens = { ...DEFAULT_SETTINGS.bannerScreens };
      if (data.showBannerOnHome !== undefined) result.bannerScreens.home = data.showBannerOnHome;
      if (data.showBannerOnQuran !== undefined) result.bannerScreens.quran = data.showBannerOnQuran;
      if (data.showBannerOnAzkar !== undefined) result.bannerScreens.azkar = data.showBannerOnAzkar;
      delete result.showBannerOnHome;
      delete result.showBannerOnQuran;
      delete result.showBannerOnAzkar;
    }

    return result;
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
                className="w-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <span className="text-gray-600">ثانية</span>
            </div>
          )}
        </div>
      </div>

      {/* ملخص الإعدادات */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-blue-800 mb-3">ملخص الإعدادات الحالية</h3>
        <ul className="space-y-2 text-blue-700 text-sm">
          <li>• الإعلانات: <span className="font-medium">{settings.enabled ? 'مفعّلة' : 'معطّلة'}</span></li>
          <li>• إعلان فتح التطبيق: <span className="font-medium">{settings.showAdOnAppOpen ? 'مفعّل' : 'معطّل'}</span></li>
          <li>• البانر: <span className="font-medium">{enabledScreenCount} شاشة مفعّلة</span></li>
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
