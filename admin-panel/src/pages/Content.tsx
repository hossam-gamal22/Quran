import { useState } from 'react';

export default function Content() {
  const [ayahEnabled, setAyahEnabled] = useState(true);
  const [ayahText, setAyahText] = useState('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
  const [ayahSource, setAyahSource] = useState('سورة الفاتحة - آية 1');

  const [hadithEnabled, setHadithEnabled] = useState(true);
  const [hadithText, setHadithText] = useState('إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى');
  const [hadithSource, setHadithSource] = useState('متفق عليه');

  const [tipEnabled, setTipEnabled] = useState(true);
  const [tipText, setTipText] = useState('حافظ على صلاة الفجر في وقتها');

  const [popupDelay, setPopupDelay] = useState(2);
  const [notificationTime, setNotificationTime] = useState('08:00');
  const [showOncePerDay, setShowOncePerDay] = useState(true);

  const handleSave = () => {
    alert('تم حفظ المحتوى بنجاح!');
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">إدارة المحتوى اليومي</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-4">إعدادات العرض العامة</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-blue-700 mb-2">تأخير ظهور الـ Popup (ثواني)</label>
            <input type="number" value={popupDelay} onChange={(e) => setPopupDelay(Number(e.target.value))}
              min="0" max="10"
              className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-700 mb-2">وقت الإشعار اليومي</label>
            <input type="time" value={notificationTime} onChange={(e) => setNotificationTime(e.target.value)}
              className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="flex items-center">
            <label className="flex items-center gap-3 cursor-pointer mt-6">
              <input type="checkbox" checked={showOncePerDay} onChange={(e) => setShowOncePerDay(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded" />
              <span className="text-blue-700">إظهار مرة واحدة يومياً فقط</span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">آية اليوم</h2>
          <button onClick={() => setAyahEnabled(!ayahEnabled)}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${ayahEnabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}>
            {ayahEnabled ? 'مفعّل' : 'معطّل'}
          </button>
        </div>
        {ayahEnabled && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نص الآية</label>
              <textarea value={ayahText} onChange={(e) => setAyahText(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-24 text-right text-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">المصدر</label>
              <input type="text" value={ayahSource} onChange={(e) => setAyahSource(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">حديث اليوم</h2>
          <button onClick={() => setHadithEnabled(!hadithEnabled)}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${hadithEnabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}>
            {hadithEnabled ? 'مفعّل' : 'معطّل'}
          </button>
        </div>
        {hadithEnabled && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نص الحديث</label>
              <textarea value={hadithText} onChange={(e) => setHadithText(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-24 text-right text-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">المصدر</label>
              <input type="text" value={hadithSource} onChange={(e) => setHadithSource(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">نصيحة اليوم</h2>
          <button onClick={() => setTipEnabled(!tipEnabled)}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${tipEnabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}>
            {tipEnabled ? 'مفعّل' : 'معطّل'}
          </button>
        </div>
        {tipEnabled && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نص النصيحة</label>
            <textarea value={tipText} onChange={(e) => setTipText(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-24 text-right text-lg" />
          </div>
        )}
      </div>

      <button onClick={handleSave}
        className="w-full bg-emerald-600 text-white py-4 rounded-xl font-medium hover:bg-emerald-700 transition-colors">
        حفظ جميع الإعدادات
      </button>
    </>
  );
}
