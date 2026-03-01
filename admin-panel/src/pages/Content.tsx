import { useState } from 'react';

export default function Content() {
  // آية اليوم
  const [ayahEnabled, setAyahEnabled] = useState(true);
  const [ayahText, setAyahText] = useState('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
  const [ayahSource, setAyahSource] = useState('سورة الفاتحة - آية 1');
  const [ayahShowAsPopup, setAyahShowAsPopup] = useState(true);
  const [ayahShowAsNotification, setAyahShowAsNotification] = useState(false);

  // حديث اليوم
  const [hadithEnabled, setHadithEnabled] = useState(true);
  const [hadithText, setHadithText] = useState('إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى');
  const [hadithSource, setHadithSource] = useState('متفق عليه');
  const [hadithShowAsPopup, setHadithShowAsPopup] = useState(false);
  const [hadithShowAsNotification, setHadithShowAsNotification] = useState(true);

  // نصيحة اليوم
  const [tipEnabled, setTipEnabled] = useState(true);
  const [tipText, setTipText] = useState('حافظ على صلاة الفجر في وقتها');
  const [tipShowAsPopup, setTipShowAsPopup] = useState(false);
  const [tipShowAsNotification, setTipShowAsNotification] = useState(false);

  // إعدادات عامة
  const [popupDelay, setPopupDelay] = useState(2);
  const [notificationTime, setNotificationTime] = useState('08:00');
  const [showOncePerDay, setShowOncePerDay] = useState(true);

  const handleSave = () => {
    alert('تم حفظ المحتوى بنجاح! سيظهر للمستخدمين حسب الإعدادات.');
  };

  // Glass style
  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
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
              <li><a href="/ads" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">الإعلانات</a></li>
              <li><a href="/pricing" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">الأسعار</a></li>
              <li><a href="/subscriptions" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">الاشتراكات</a></li>
              <li><a href="/content" className="block px-4 py-3 bg-emerald-700 rounded-lg">المحتوى</a></li>
              <li><a href="/notifications" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">الإشعارات</a></li>
            </ul>
          </nav>
        </aside>

        <main className="flex-1 mr-64 p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">إدارة المحتوى اليومي</h1>

          {/* إعدادات عامة */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-blue-800 mb-4">⚙️ إعدادات العرض العامة</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">تأخير ظهور الـ Popup (ثواني)</label>
                <input
                  type="number"
                  value={popupDelay}
                  onChange={(e) => setPopupDelay(Number(e.target.value))}
                  min="0"
                  max="10"
                  className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">وقت الإشعار اليومي</label>
                <input
                  type="time"
                  value={notificationTime}
                  onChange={(e) => setNotificationTime(e.target.value)}
                  className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer mt-6">
                  <input
                    type="checkbox"
                    checked={showOncePerDay}
                    onChange={(e) => setShowOncePerDay(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <span className="text-blue-700">إظهار مرة واحدة يومياً فقط</span>
                </label>
              </div>
            </div>
          </div>

          {/* آية اليوم */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">📖 آية اليوم</h2>
              <button
                onClick={() => setAyahEnabled(!ayahEnabled)}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${ayahEnabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}
              >
                {ayahEnabled ? '✓ مفعّل' : 'معطّل'}
              </button>
            </div>
            
            {ayahEnabled && (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">نص الآية</label>
                    <textarea
                      value={ayahText}
                      onChange={(e) => setAyahText(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-24 text-right text-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">المصدر</label>
                    <input
                      type="text"
                      value={ayahSource}
                      onChange={(e) => setAyahSource(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-3">طريقة العرض:</p>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={ayahShowAsPopup} onChange={(e) => setAyahShowAsPopup(e.target.checked)} className="w-5 h-5 text-emerald-600 rounded" />
                      <span className="text-gray-700">🪟 Popup</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={ayahShowAsNotification} onChange={(e) => setAyahShowAsNotification(e.target.checked)} className="w-5 h-5 text-emerald-600 rounded" />
                      <span className="text-gray-700">🔔 إشعار Push</span>
                    </label>
                  </div>
                </div>

                {/* معاينة زجاجية */}
                {ayahShowAsPopup && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">📱 معاينة الـ Popup:</p>
                    <div className="bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 rounded-xl p-8 max-w-sm mx-auto">
                      <div style={glassStyle} className="rounded-2xl p-6 text-white text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                          <span className="text-3xl">📖</span>
                        </div>
                        <p className="text-xl font-bold mb-3">آية اليوم</p>
                        <p className="text-lg leading-relaxed mb-3 font-arabic">{ayahText}</p>
                        <p className="text-sm opacity-80">{ayahSource}</p>
                        <button className="mt-5 px-8 py-2 rounded-full font-medium transition-all" style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.3)' }}>
                          حسناً ✨
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* حديث اليوم */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">📜 حديث اليوم</h2>
              <button
                onClick={() => setHadithEnabled(!hadithEnabled)}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${hadithEnabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}
              >
                {hadithEnabled ? '✓ مفعّل' : 'معطّل'}
              </button>
            </div>

            {hadithEnabled && (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">نص الحديث</label>
                    <textarea
                      value={hadithText}
                      onChange={(e) => setHadithText(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-24 text-right text-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">المصدر</label>
                    <input
                      type="text"
                      value={hadithSource}
                      onChange={(e) => setHadithSource(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-3">طريقة العرض:</p>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={hadithShowAsPopup} onChange={(e) => setHadithShowAsPopup(e.target.checked)} className="w-5 h-5 text-amber-600 rounded" />
                      <span className="text-gray-700">🪟 Popup</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={hadithShowAsNotification} onChange={(e) => setHadithShowAsNotification(e.target.checked)} className="w-5 h-5 text-amber-600 rounded" />
                      <span className="text-gray-700">🔔 إشعار Push</span>
                    </label>
                  </div>
                </div>

                {/* معاينة زجاجية */}
                {hadithShowAsPopup && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">📱 معاينة الـ Popup:</p>
                    <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 rounded-xl p-8 max-w-sm mx-auto">
                      <div style={glassStyle} className="rounded-2xl p-6 text-white text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                          <span className="text-3xl">📜</span>
                        </div>
                        <p className="text-xl font-bold mb-3">حديث اليوم</p>
                        <p className="text-lg leading-relaxed mb-3">{hadithText}</p>
                        <p className="text-sm opacity-80">{hadithSource}</p>
                        <button className="mt-5 px-8 py-2 rounded-full font-medium transition-all" style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.3)' }}>
                          حسناً ✨
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* نصيحة اليوم */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">💡 نصيحة اليوم</h2>
              <button
                onClick={() => setTipEnabled(!tipEnabled)}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${tipEnabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}
              >
                {tipEnabled ? '✓ مفعّل' : 'معطّل'}
              </button>
            </div>

            {tipEnabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نص النصيحة</label>
                  <textarea
                    value={tipText}
                    onChange={(e) => setTipText(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-24 text-right text-lg"
                  />
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-3">طريقة العرض:</p>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={tipShowAsPopup} onChange={(e) => setTipShowAsPopup(e.target.checked)} className="w-5 h-5 text-blue-600 rounded" />
                      <span className="text-gray-700">🪟 Popup</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={tipShowAsNotification} onChange={(e) => setTipShowAsNotification(e.target.checked)} className="w-5 h-5 text-blue-600 rounded" />
                      <span className="text-gray-700">🔔 إشعار Push</span>
                    </label>
                  </div>
                </div>

                {/* معاينة زجاجية */}
                {tipShowAsPopup && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">📱 معاينة الـ Popup:</p>
                    <div className="bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 rounded-xl p-8 max-w-sm mx-auto">
                      <div style={glassStyle} className="rounded-2xl p-6 text-white text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                          <span className="text-3xl">💡</span>
                        </div>
                        <p className="text-xl font-bold mb-3">نصيحة اليوم</p>
                        <p className="text-lg leading-relaxed mb-3">{tipText}</p>
                        <button className="mt-5 px-8 py-2 rounded-full font-medium transition-all" style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.3)' }}>
                          حسناً ✨
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ملاحظة */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚡</span>
              <div>
                <h3 className="font-medium text-yellow-800">كيف يعمل؟</h3>
                <ul className="text-yellow-700 text-sm mt-1 space-y-1">
                  <li>• <strong>Popup:</strong> يظهر للمستخدم عند فتح التطبيق بتصميم زجاجي أنيق</li>
                  <li>• <strong>إشعار Push:</strong> يُرسل للمستخدم في الوقت المحدد</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-medium hover:bg-emerald-700 transition-colors"
          >
            💾 حفظ جميع الإعدادات
          </button>
        </main>
      </div>
    </div>
  );
}
