import { useState } from 'react';

export default function Dashboard() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [adsEnabled, setAdsEnabled] = useState(true);

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">لوحة التحكم</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-gray-500 text-sm">المشتركين</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">0</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-gray-500 text-sm">الأرباح</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">$0</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-gray-500 text-sm">الإعلانات</p>
          <p className={`text-3xl font-bold mt-1 ${adsEnabled ? 'text-green-600' : 'text-red-600'}`}>
            {adsEnabled ? 'مفعّلة' : 'معطّلة'}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-gray-500 text-sm">حالة التطبيق</p>
          <p className={`text-3xl font-bold mt-1 ${maintenanceMode ? 'text-red-600' : 'text-green-600'}`}>
            {maintenanceMode ? 'صيانة' : 'يعمل'}
          </p>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">إجراءات سريعة</h2>
        <div className="flex gap-4">
          <button onClick={() => setMaintenanceMode(!maintenanceMode)}
            className={`px-6 py-3 rounded-lg ${maintenanceMode ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {maintenanceMode ? 'إلغاء الصيانة' : 'تفعيل الصيانة'}
          </button>
          <button onClick={() => setAdsEnabled(!adsEnabled)}
            className={`px-6 py-3 rounded-lg ${adsEnabled ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
            {adsEnabled ? 'تعطيل الإعلانات' : 'تفعيل الإعلانات'}
          </button>
        </div>
      </div>
    </>
  );
}
