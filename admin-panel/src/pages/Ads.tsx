import { useState } from 'react';

export default function Ads() {
  const [adsEnabled, setAdsEnabled] = useState(true);
  const [bannerAdCode, setBannerAdCode] = useState('');
  const [interstitialAdCode, setInterstitialAdCode] = useState('');
  const [rewardedAdCode, setRewardedAdCode] = useState('');
  
  // أماكن عرض البانر
  const [showBannerOnHome, setShowBannerOnHome] = useState(true);
  const [showBannerOnQuran, setShowBannerOnQuran] = useState(false);
  const [showBannerOnAzkar, setShowBannerOnAzkar] = useState(true);
  
  // إعدادات الإعلانات البينية
  const [interstitialMode, setInterstitialMode] = useState<'pages' | 'time' | 'session'>('pages');
  const [interstitialFrequency, setInterstitialFrequency] = useState(5);
  const [interstitialTimeInterval, setInterstitialTimeInterval] = useState(3);
  const [interstitialSessionLimit, setInterstitialSessionLimit] = useState(1);
  
  // إعدادات إعلانات المكافآت
  const [rewardedMode, setRewardedMode] = useState<'unlimited' | 'daily_limit'>('unlimited');
  const [rewardedDailyLimit, setRewardedDailyLimit] = useState(5);
  
  // إعدادات إضافية
  const [showAdOnAppOpen, setShowAdOnAppOpen] = useState(false);
  const [delayFirstAd, setDelayFirstAd] = useState(true);
  const [firstAdDelay, setFirstAdDelay] = useState(30);

  const handleSave = () => {
    alert('تم حفظ إعدادات الإعلانات بنجاح!');
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">إعدادات الإعلانات</h1>

      {/* تفعيل/تعطيل الإعلانات */}
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

      {/* أكواد AdMob */}
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

      {/* أماكن عرض البانر */}
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

      {/* إعلان عند فتح التطبيق */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">إعلان عند فتح التطبيق (App Open Ad)</h2>
            <p className="text-gray-500 text-sm">عرض إعلان كامل الشاشة عند كل فتح للتطبيق</p>
          </div>
          <button onClick={() => setShowAdOnAppOpen(!showAdOnAppOpen)}
            className={`px-6 py-3 rounded-lg font-medium ${showAdOnAppOpen ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}>
            {showAdOnAppOpen ? 'مفعّل' : 'معطّل'}
          </button>
        </div>
      </div>

      {/* إعدادات الإعلانات البينية */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">إعدادات الإعلانات البينية (Interstitial)</h2>
        
        {/* اختيار نوع التكرار */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">طريقة عرض الإعلانات</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button onClick={() => setInterstitialMode('pages')}
              className={`p-4 rounded-xl border-2 transition-all text-right ${interstitialMode === 'pages' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <div className="font-medium text-gray-800 mb-1">كل عدد صفحات</div>
              <div className="text-sm text-gray-500">إظهار إعلان بعد عدد معين من الصفحات</div>
            </button>
            <button onClick={() => setInterstitialMode('time')}
              className={`p-4 rounded-xl border-2 transition-all text-right ${interstitialMode === 'time' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <div className="font-medium text-gray-800 mb-1">كل فترة زمنية</div>
              <div className="text-sm text-gray-500">إظهار إعلان كل عدد دقائق</div>
            </button>
            <button onClick={() => setInterstitialMode('session')}
              className={`p-4 rounded-xl border-2 transition-all text-right ${interstitialMode === 'session' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <div className="font-medium text-gray-800 mb-1">لكل جلسة</div>
              <div className="text-sm text-gray-500">عدد محدد من الإعلانات لكل فتح للتطبيق</div>
            </button>
          </div>
        </div>

        {/* إعدادات حسب النوع المختار */}
        {interstitialMode === 'pages' && (
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">عرض إعلان كل:</label>
            <div className="flex items-center gap-3">
              <input type="number" value={interstitialFrequency} onChange={(e) => setInterstitialFrequency(Number(e.target.value))}
                min="1" max="50"
                className="w-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              <span className="text-gray-600">صفحة</span>
            </div>
            <p className="text-gray-500 text-sm mt-2">سيظهر إعلان بعد كل {interstitialFrequency} صفحات يتصفحها المستخدم</p>
          </div>
        )}

        {interstitialMode === 'time' && (
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">عرض إعلان كل:</label>
            <div className="flex items-center gap-3">
              <input type="number" value={interstitialTimeInterval} onChange={(e) => setInterstitialTimeInterval(Number(e.target.value))}
                min="1" max="60"
                className="w-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              <span className="text-gray-600">دقيقة</span>
            </div>
            <p className="text-gray-500 text-sm mt-2">سيظهر إعلان كل {interstitialTimeInterval} دقائق أثناء استخدام التطبيق</p>
          </div>
        )}

        {interstitialMode === 'session' && (
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">الحد الأقصى للإعلانات في كل جلسة:</label>
            <div className="flex items-center gap-3">
              <input type="number" value={interstitialSessionLimit} onChange={(e) => setInterstitialSessionLimit(Number(e.target.value))}
                min="1" max="20"
                className="w-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              <span className="text-gray-600">إعلان لكل فتح للتطبيق</span>
            </div>
            <p className="text-gray-500 text-sm mt-2">سيظهر {interstitialSessionLimit} إعلان كحد أقصى في كل مرة يفتح المستخدم التطبيق</p>
          </div>
        )}

        {/* تأخير أول إعلان */}
        <div className="mt-6 border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium text-gray-800">تأخير أول إعلان</h3>
              <p className="text-gray-500 text-sm">إعطاء المستخدم وقت قبل عرض أول إعلان</p>
            </div>
            <button onClick={() => setDelayFirstAd(!delayFirstAd)}
              className={`px-4 py-2 rounded-lg font-medium ${delayFirstAd ? 'bg-emerald-500 text-white' : 'bg-gray-300 text-gray-700'}`}>
              {delayFirstAd ? 'مفعّل' : 'معطّل'}
            </button>
          </div>
          {delayFirstAd && (
            <div className="flex items-center gap-3">
              <span className="text-gray-600">تأخير أول إعلان بمقدار:</span>
              <input type="number" value={firstAdDelay} onChange={(e) => setFirstAdDelay(Number(e.target.value))}
                min="5" max="300"
                className="w-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              <span className="text-gray-600">ثانية</span>
            </div>
          )}
        </div>
      </div>

      {/* إعدادات إعلانات المكافآت */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">إعدادات إعلانات المكافآت (Rewarded)</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">حد المشاهدة اليومي</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => setRewardedMode('unlimited')}
              className={`p-4 rounded-xl border-2 transition-all text-right ${rewardedMode === 'unlimited' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <div className="font-medium text-gray-800 mb-1">بدون حد</div>
              <div className="text-sm text-gray-500">السماح للمستخدم بمشاهدة إعلانات غير محدودة</div>
            </button>
            <button onClick={() => setRewardedMode('daily_limit')}
              className={`p-4 rounded-xl border-2 transition-all text-right ${rewardedMode === 'daily_limit' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <div className="font-medium text-gray-800 mb-1">حد يومي</div>
              <div className="text-sm text-gray-500">تحديد عدد معين من الإعلانات يومياً</div>
            </button>
          </div>
        </div>

        {rewardedMode === 'daily_limit' && (
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">الحد الأقصى اليومي:</label>
            <div className="flex items-center gap-3">
              <input type="number" value={rewardedDailyLimit} onChange={(e) => setRewardedDailyLimit(Number(e.target.value))}
                min="1" max="50"
                className="w-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              <span className="text-gray-600">إعلان يومياً</span>
            </div>
          </div>
        )}
      </div>

      {/* ملخص الإعدادات */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-blue-800 mb-3">ملخص الإعدادات الحالية</h3>
        <ul className="space-y-2 text-blue-700 text-sm">
          <li>• الإعلانات: <span className="font-medium">{adsEnabled ? 'مفعّلة' : 'معطّلة'}</span></li>
          <li>• إعلان فتح التطبيق: <span className="font-medium">{showAdOnAppOpen ? 'مفعّل' : 'معطّل'}</span></li>
          <li>• الإعلانات البينية: <span className="font-medium">
            {interstitialMode === 'pages' && `كل ${interstitialFrequency} صفحات`}
            {interstitialMode === 'time' && `كل ${interstitialTimeInterval} دقائق`}
            {interstitialMode === 'session' && `${interstitialSessionLimit} إعلان لكل جلسة`}
          </span></li>
          <li>• تأخير أول إعلان: <span className="font-medium">{delayFirstAd ? `${firstAdDelay} ثانية` : 'بدون تأخير'}</span></li>
          <li>• إعلانات المكافآت: <span className="font-medium">{rewardedMode === 'unlimited' ? 'بدون حد' : `${rewardedDailyLimit} يومياً`}</span></li>
        </ul>
      </div>

      <button onClick={handleSave}
        className="w-full bg-emerald-600 text-white py-4 rounded-xl font-medium hover:bg-emerald-700 transition-colors">
        حفظ الإعدادات
      </button>
    </>
  );
}
