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
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-emerald-950 text-white min-h-screen fixed right-0">
          <div className="p-6 border-b border-emerald-800">
            <h1 className="text-xl font-bold">🕌 رُوح المسلم</h1>
            <p className="text-emerald-300 text-sm mt-1">لوحة التحكم</p>
          </div>
          <nav className="p-4">
            <ul className="space-y-2">
              <li><a href="/" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">لوحة التحكم</a></li>
              <li><a href="/settings" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">إعدادات التطبيق</a></li>
                  <li><a href="/users" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">👥 المستخدمين</a></li>
              <li><a href="/ads" className="block px-4 py-3 bg-emerald-700 rounded-lg">الإعلانات</a></li>
              <li><a href="/pricing" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">الأسعار</a></li>
              <li><a href="/subscriptions" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">الاشتراكات</a></li>
              <li><a href="/content" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">المحتوى</a></li>
              <li><a href="/notifications" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">الإشعارات</a></li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 mr-64 p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">إعدادات الإعلانات</h1>

          {/* Toggle Ads */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">تفعيل الإعلانات</h2>
                <p className="text-gray-500 text-sm">تشغيل أو إيقاف جميع الإعلانات في التطبيق</p>
              </div>
              <button
                onClick={() => setAdsEnabled(!adsEnabled)}
                className={`px-6 py-3 rounded-lg font-medium ${adsEnabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}
              >
                {adsEnabled ? 'مفعّلة' : 'معطّلة'}
              </button>
            </div>
          </div>

          {/* Google AdMob Codes */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">أكواد Google AdMob</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Banner Ad Unit ID</label>
                <input
                  type="text"
                  value={bannerAdCode}
                  onChange={(e) => setBannerAdCode(e.target.value)}
                  placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <p className="text-gray-400 text-xs mt-1">مثال: ca-app-pub-3940256099942544/6300978111</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Interstitial Ad Unit ID</label>
                <input
                  type="text"
                  value={interstitialAdCode}
                  onChange={(e) => setInterstitialAdCode(e.target.value)}
                  placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <p className="text-gray-400 text-xs mt-1">إعلان بين الصفحات (Interstitial)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rewarded Ad Unit ID</label>
                <input
                  type="text"
                  value={rewardedAdCode}
                  onChange={(e) => setRewardedAdCode(e.target.value)}
                  placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <p className="text-gray-400 text-xs mt-1">إعلان المكافآت (للمستخدم مقابل ميزة)</p>
              </div>
            </div>
          </div>

          {/* Banner Placement */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">أماكن عرض البانر</h2>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBannerOnHome}
                  onChange={(e) => setShowBannerOnHome(e.target.checked)}
                  className="w-5 h-5 text-emerald-600 rounded"
                />
                <span className="text-gray-700">الصفحة الرئيسية</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBannerOnQuran}
                  onChange={(e) => setShowBannerOnQuran(e.target.checked)}
                  className="w-5 h-5 text-emerald-600 rounded"
                />
                <span className="text-gray-700">صفحة القرآن</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBannerOnAzkar}
                  onChange={(e) => setShowBannerOnAzkar(e.target.checked)}
                  className="w-5 h-5 text-emerald-600 rounded"
                />
                <span className="text-gray-700">صفحة الأذكار</span>
              </label>
            </div>
          </div>

          {/* Interstitial Frequency */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">تكرار الإعلانات البينية</h2>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={interstitialFrequency}
                onChange={(e) => setInterstitialFrequency(Number(e.target.value))}
                min="1"
                max="20"
                className="w-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <span className="text-gray-600">إظهار إعلان كل {interstitialFrequency} صفحات</span>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-medium hover:bg-emerald-700 transition-colors"
          >
            حفظ الإعدادات
          </button>
        </main>
      </div>
    </div>
  );
}
