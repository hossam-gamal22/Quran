import { useState } from 'react';

export default function Pricing() {
  const [prices, setPrices] = useState([
    { id: 1, country: 'مصر', code: 'EG', currency: 'EGP', symbol: 'ج.م', monthly: 49, yearly: 399 },
    { id: 2, country: 'السعودية', code: 'SA', currency: 'SAR', symbol: 'ر.س', monthly: 9.99, yearly: 99.99 },
    { id: 3, country: 'الإمارات', code: 'AE', currency: 'AED', symbol: 'د.إ', monthly: 9.99, yearly: 99.99 },
    { id: 4, country: 'أمريكا', code: 'US', currency: 'USD', symbol: '$', monthly: 2.99, yearly: 29.99 },
  ]);

  const [editingId, setEditingId] = useState<number | null>(null);

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
              <li><a href="/pricing" className="block px-4 py-3 bg-emerald-700 rounded-lg">الأسعار</a></li>
              <li><a href="/content" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">المحتوى</a></li>
              <li><a href="/notifications" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">الإشعارات</a></li>
            </ul>
          </nav>
        </aside>

        <main className="flex-1 mr-64 p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">أسعار الاشتراكات</h1>
            <button className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700">
              + إضافة دولة
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">الدولة</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">الكود</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">العملة</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">الشهري</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">السنوي</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {prices.map((price) => (
                  <tr key={price.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-800">{price.country}</td>
                    <td className="px-6 py-4 text-gray-600">{price.code}</td>
                    <td className="px-6 py-4 text-gray-600">{price.currency}</td>
                    <td className="px-6 py-4 text-gray-800 font-medium">{price.monthly} {price.symbol}</td>
                    <td className="px-6 py-4 text-gray-800 font-medium">{price.yearly} {price.symbol}</td>
                    <td className="px-6 py-4">
                      <button className="text-emerald-600 hover:text-emerald-800 ml-3">تعديل</button>
                      <button className="text-red-600 hover:text-red-800">حذف</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
