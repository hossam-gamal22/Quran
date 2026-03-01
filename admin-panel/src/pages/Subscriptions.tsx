import { useState } from 'react';

export default function Subscriptions() {
  const [subscribers] = useState([
    { id: 1, email: 'ahmed@gmail.com', country: 'مصر', plan: 'سنوي', amount: 399, currency: 'EGP', date: '2024-02-15', status: 'active' },
    { id: 2, email: 'omar@gmail.com', country: 'السعودية', plan: 'شهري', amount: 9.99, currency: 'SAR', date: '2024-03-01', status: 'active' },
    { id: 3, email: 'sara@gmail.com', country: 'الإمارات', plan: 'Lifetime', amount: 299, currency: 'AED', date: '2024-01-10', status: 'active' },
  ]);

  const [offerEnabled, setOfferEnabled] = useState(false);
  const [offerTitle, setOfferTitle] = useState('عرض رمضان المبارك');
  const [offerDescription, setOfferDescription] = useState('خصم 50% على الاشتراك السنوي');
  const [discountPercent, setDiscountPercent] = useState(50);
  const [offerStartDate, setOfferStartDate] = useState('2024-03-10');
  const [offerEndDate, setOfferEndDate] = useState('2024-04-10');

  const handleSave = () => {
    alert('تم حفظ جميع الإعدادات بنجاح!');
  };

  const totalRevenue = subscribers.filter(s => s.status === 'active').reduce((sum, s) => sum + s.amount, 0);
  const activeCount = subscribers.filter(s => s.status === 'active').length;
  const lifetimeCount = subscribers.filter(s => s.plan === 'Lifetime').length;

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">إدارة الاشتراكات والعروض</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-gray-500 text-sm">إجمالي المشتركين</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{subscribers.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-gray-500 text-sm">النشطين</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-gray-500 text-sm">Lifetime</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{lifetimeCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-gray-500 text-sm">الإيرادات</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">${totalRevenue}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">العروض الموسمية</h2>
            <p className="text-gray-500 text-sm">خصومات على الاشتراكات</p>
          </div>
          <button onClick={() => setOfferEnabled(!offerEnabled)}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${offerEnabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}>
            {offerEnabled ? 'مفعّل' : 'تفعيل'}
          </button>
        </div>

        {offerEnabled && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">عنوان العرض</label>
                <input type="text" value={offerTitle} onChange={(e) => setOfferTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نسبة الخصم %</label>
                <input type="number" value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">وصف العرض</label>
                <input type="text" value={offerDescription} onChange={(e) => setOfferDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ البداية</label>
                <input type="date" value={offerStartDate} onChange={(e) => setOfferStartDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ النهاية</label>
                <input type="date" value={offerEndDate} onChange={(e) => setOfferEndDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">قائمة المشتركين</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">البريد</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">الدولة</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">الخطة</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">المبلغ</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">التاريخ</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {subscribers.map((sub) => (
              <tr key={sub.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-800">{sub.email}</td>
                <td className="px-6 py-4 text-gray-600">{sub.country}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${sub.plan === 'Lifetime' ? 'bg-purple-100 text-purple-700' : sub.plan === 'سنوي' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                    {sub.plan}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-800 font-medium">{sub.amount} {sub.currency}</td>
                <td className="px-6 py-4 text-gray-500">{sub.date}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {sub.status === 'active' ? 'نشط' : 'منتهي'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={handleSave} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-medium hover:bg-emerald-700">
        حفظ جميع الإعدادات
      </button>
    </>
  );
}
