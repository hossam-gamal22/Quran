import { useState } from 'react';

export default function Settings() {
  const [appName, setAppName] = useState('رُوح المسلم');
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [minVersion, setMinVersion] = useState('1.0.0');

  const handleSave = () => {
    alert('تم حفظ الإعدادات بنجاح!');
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
              <li><a href="/settings" className="block px-4 py-3 bg-emerald-700 rounded-lg">إعدادات التطبيق</a></li>
                  <li><a href="/users" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">👥 المستخدمين</a></li>
              <li><a href="/ads" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">الإعلانات</a></li>
              <li><a href="/pricing" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">الأسعار</a></li>
              <li><a href="/subscriptions" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">الاشتراكات</a></li>
              <li><a href="/content" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">المحتوى</a></li>
              <li><a href="/notifications" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">الإشعارات</a></li>
            </ul>
          </nav>
        </aside>

        <main className="flex-1 mr-64 p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">إعدادات التطبيق</h1>

          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">معلومات التطبيق</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اسم التطبيق</label>
                <input type="text" value={appName} onChange={(e) => setAppName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">رقم الإصدار</label>
                <input type="text" value={appVersion} onChange={(e) => setAppVersion(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">التحكم في التطبيق</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-800">وضع الصيانة</h3>
                  <p className="text-sm text-gray-500">إيقاف التطبيق مؤقتاً للصيانة</p>
                </div>
                <button onClick={() => setMaintenanceMode(!maintenanceMode)}
                  className={`px-6 py-2 rounded-lg font-medium ${maintenanceMode ? 'bg-red-500 text-white' : 'bg-gray-300 text-gray-700'}`}>
                  {maintenanceMode ? 'مفعّل' : 'معطّل'}
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-800">إجبار التحديث</h3>
                  <p className="text-sm text-gray-500">إجبار المستخدمين على تحديث التطبيق</p>
                </div>
                <button onClick={() => setForceUpdate(!forceUpdate)}
                  className={`px-6 py-2 rounded-lg font-medium ${forceUpdate ? 'bg-orange-500 text-white' : 'bg-gray-300 text-gray-700'}`}>
                  {forceUpdate ? 'مفعّل' : 'معطّل'}
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الحد الأدنى للإصدار</label>
                <input type="text" value={minVersion} onChange={(e) => setMinVersion(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
            </div>
          </div>

          <button onClick={handleSave}
            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-medium hover:bg-emerald-700">
            حفظ الإعدادات
          </button>
        </main>
      </div>
    </div>
  );
}
