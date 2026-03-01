import { useState } from 'react';

export default function Ads() {
  const [adsEnabled, setAdsEnabled] = useState(true);
  const [bannerAdCode, setBannerAdCode] = useState('');
  const [interstitialAdCode, setInterstitialAdCode] = useState('');
  const [rewardedAdCode, setRewardedAdCode] = useState('');
  const [showBannerOnHome, setShowBannerOnHome] = useState(true);
  const [showBannerOnQuran, setShowBannerOnQuran] = useState(false);
  const [showBannerOnAzkar, setShowBannerOnAzkar] = useState(true);
  const [interstitialFrequency, setInterstitialFrequency] = useState(5);

  const handleSave = () => {
    alert('تم حفظ إعدادات الإعلانات بنجاح!');
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">إعدادات الإعلانات</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">تفعيل الإعلانات</h2>
            <p className="text-gray-500 text-sm">تشغيل أو إيقاف جميع الإعلانات في التطبيق</p>
          </div>
          <button onClick={() => setAdsEnabled(!adsEnabled)}
            className={`px-6 py-3 rounded-lg font-medium ${adsEnabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}>
            {adsEnabled ? 'مفعّلة' : 'معطّلة'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">أكواد Google AdMob</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Banner Ad Unit ID</label>
            <input type="text" value={bannerAdCode} onChange={(e) => setBannerAdCode(e.target.value)}
              placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Interstitial Ad Unit ID</label>
            <input type="text" value={interstitialAdCode} onChange={(e) => setInterstitialAdCode(e.target.value)}
              placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rewarded Ad Unit ID</label>
            <input type="text" value={rewardedAdCode} onChange={(e) => setRewardedAdCode(e.target.value)}
              placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">أماكن عرض البانر</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={showBannerOnHome} onChange={(e) => setShowBannerOnHome(e.target.checked)}
              className="w-5 h-5 text-emerald-600 rounded" />
            <span className="text-gray-700">الصفحة الرئيسية</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={showBannerOnQuran} onChange={(e) => setShowBannerOnQuran(e.target.checked)}
              className="w-5 h-5 text-emerald-600 rounded" />
            <span className="text-gray-700">صفحة القرآن</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={showBannerOnAzkar} onChange={(e) => setShowBannerOnAzkar(e.target.checked)}
              className="w-5 h-5 text-emerald-600 rounded" />
            <span className="text-gray-700">صفحة الأذكار</span>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">تكرار الإعلانات البينية</h2>
        <div className="flex items-center gap-4">
          <input type="number" value={interstitialFrequency} onChange={(e) => setInterstitialFrequency(Number(e.target.value))}
            min="1" max="20"
            className="w-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
          <span className="text-gray-600">إظهار إعلان كل {interstitialFrequency} صفحات</span>
        </div>
      </div>

      <button onClick={handleSave}
        className="w-full bg-emerald-600 text-white py-4 rounded-xl font-medium hover:bg-emerald-700 transition-colors">
        حفظ الإعدادات
      </button>
    </>
  );
}
