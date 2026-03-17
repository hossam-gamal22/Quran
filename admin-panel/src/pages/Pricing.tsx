import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface PriceEntry {
  country: string;
  code: string;
  currency: string;
  symbol: string;
  monthly: number;
  yearly: number;
  lifetime: number;
}

const DEFAULT_PRICES: PriceEntry[] = [
  // الخليج
  { country: 'مصر', code: 'EG', currency: 'EGP', symbol: 'ج.م', monthly: 49, yearly: 399, lifetime: 999 },
  { country: 'السعودية', code: 'SA', currency: 'SAR', symbol: 'ر.س', monthly: 9.99, yearly: 99.99, lifetime: 249 },
  { country: 'الإمارات', code: 'AE', currency: 'AED', symbol: 'د.إ', monthly: 9.99, yearly: 99.99, lifetime: 249 },
  { country: 'الكويت', code: 'KW', currency: 'KWD', symbol: 'د.ك', monthly: 0.79, yearly: 7.99, lifetime: 19.99 },
  { country: 'البحرين', code: 'BH', currency: 'BHD', symbol: 'د.ب', monthly: 0.99, yearly: 9.99, lifetime: 24.99 },
  { country: 'قطر', code: 'QA', currency: 'QAR', symbol: 'ر.ق', monthly: 9.99, yearly: 99.99, lifetime: 249 },
  { country: 'عُمان', code: 'OM', currency: 'OMR', symbol: 'ر.ع', monthly: 0.99, yearly: 9.99, lifetime: 24.99 },
  // الشام والعراق
  { country: 'الأردن', code: 'JO', currency: 'JOD', symbol: 'د.أ', monthly: 0.99, yearly: 9.99, lifetime: 24.99 },
  { country: 'العراق', code: 'IQ', currency: 'IQD', symbol: 'د.ع', monthly: 3500, yearly: 35000, lifetime: 85000 },
  // شمال أفريقيا
  { country: 'المغرب', code: 'MA', currency: 'MAD', symbol: 'د.م', monthly: 19.99, yearly: 199, lifetime: 499 },
  { country: 'الجزائر', code: 'DZ', currency: 'DZD', symbol: 'د.ج', monthly: 349, yearly: 3499, lifetime: 8999 },
  { country: 'تونس', code: 'TN', currency: 'TND', symbol: 'د.ت', monthly: 6.99, yearly: 69.99, lifetime: 169 },
  { country: 'ليبيا', code: 'LY', currency: 'LYD', symbol: 'د.ل', monthly: 12.99, yearly: 129, lifetime: 329 },
  { country: 'السودان', code: 'SD', currency: 'SDG', symbol: 'ج.س', monthly: 1500, yearly: 14999, lifetime: 39999 },
  { country: 'اليمن', code: 'YE', currency: 'YER', symbol: 'ر.ي', monthly: 599, yearly: 5999, lifetime: 14999 },
  // جنوب آسيا
  { country: 'باكستان', code: 'PK', currency: 'PKR', symbol: '₨', monthly: 599, yearly: 5999, lifetime: 14999 },
  { country: 'بنغلاديش', code: 'BD', currency: 'BDT', symbol: '৳', monthly: 249, yearly: 2499, lifetime: 5999 },
  // جنوب شرق آسيا
  { country: 'ماليزيا', code: 'MY', currency: 'MYR', symbol: 'RM', monthly: 9.99, yearly: 99.99, lifetime: 249 },
  { country: 'إندونيسيا', code: 'ID', currency: 'IDR', symbol: 'Rp', monthly: 39000, yearly: 389000, lifetime: 999000 },
  // تركيا
  { country: 'تركيا', code: 'TR', currency: 'TRY', symbol: '₺', monthly: 69.99, yearly: 699, lifetime: 1799 },
  // أوروبا
  { country: 'بريطانيا', code: 'GB', currency: 'GBP', symbol: '£', monthly: 1.99, yearly: 19.99, lifetime: 49.99 },
  { country: 'فرنسا', code: 'FR', currency: 'EUR', symbol: '€', monthly: 2.49, yearly: 24.99, lifetime: 59.99 },
  { country: 'ألمانيا', code: 'DE', currency: 'EUR', symbol: '€', monthly: 2.49, yearly: 24.99, lifetime: 59.99 },
  // أمريكا
  { country: 'أمريكا', code: 'US', currency: 'USD', symbol: '$', monthly: 2.99, yearly: 29.99, lifetime: 69.99 },
];

export default function Pricing() {
  const [prices, setPrices] = useState<PriceEntry[]>(DEFAULT_PRICES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<PriceEntry | null>(null);

  useEffect(() => {
    loadPrices();
  }, []);

  const loadPrices = async () => {
    try {
      const snap = await getDoc(doc(db, 'config', 'pricing'));
      if (snap.exists()) {
        const data = snap.data();
        if (data.prices) setPrices(data.prices);
      }
    } catch (error) {
      console.error('Error loading prices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await setDoc(doc(db, 'config', 'pricing'), { prices, updatedAt: new Date().toISOString() });
      setMessage('✅ تم حفظ الأسعار بنجاح');
    } catch (error) {
      setMessage('❌ حدث خطأ أثناء الحفظ');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (index: number) => {
    setEditIndex(index);
    setEditForm({ ...prices[index] });
  };

  const saveEdit = () => {
    if (editIndex === null || !editForm) return;
    const updated = [...prices];
    updated[editIndex] = editForm;
    setPrices(updated);
    setEditIndex(null);
    setEditForm(null);
  };

  const addCountry = () => {
    setPrices(prev => [...prev, { country: '', code: '', currency: '', symbol: '', monthly: 0, yearly: 0, lifetime: 0 }]);
    startEdit(prices.length);
  };

  const deletePrice = (index: number) => {
    setPrices(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">أسعار الاشتراكات</h1>
        <button onClick={addCountry} className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700">
          + إضافة دولة
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">الدولة</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">الكود</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">العملة</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">الشهري</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">السنوي</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">مدى الحياة</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {prices.map((price, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {editIndex === index && editForm ? (
                  <>
                    <td className="px-6 py-4"><input type="text" title="الدولة" aria-label="الدولة" placeholder="الدولة" value={editForm.country} onChange={e => setEditForm({ ...editForm, country: e.target.value })} className="w-full px-2 py-1 border rounded" /></td>
                    <td className="px-6 py-4"><input type="text" title="الكود" aria-label="كود الدولة" placeholder="الكود" value={editForm.code} onChange={e => setEditForm({ ...editForm, code: e.target.value })} className="w-20 px-2 py-1 border rounded" /></td>
                    <td className="px-6 py-4"><input type="text" title="العملة" aria-label="العملة" placeholder="العملة" value={editForm.currency} onChange={e => setEditForm({ ...editForm, currency: e.target.value })} className="w-20 px-2 py-1 border rounded" /></td>
                    <td className="px-6 py-4"><input type="number" title="الشهري" aria-label="السعر الشهري" value={editForm.monthly} onChange={e => setEditForm({ ...editForm, monthly: Number(e.target.value) })} className="w-20 px-2 py-1 border rounded" /></td>
                    <td className="px-6 py-4"><input type="number" title="السنوي" aria-label="السعر السنوي" value={editForm.yearly} onChange={e => setEditForm({ ...editForm, yearly: Number(e.target.value) })} className="w-20 px-2 py-1 border rounded" /></td>
                    <td className="px-6 py-4"><input type="number" title="مدى الحياة" aria-label="سعر مدى الحياة" value={editForm.lifetime} onChange={e => setEditForm({ ...editForm, lifetime: Number(e.target.value) })} className="w-20 px-2 py-1 border rounded" /></td>
                    <td className="px-6 py-4">
                      <button onClick={saveEdit} className="text-green-600 hover:text-green-800 ml-3" aria-label="حفظ التعديلات" title="حفظ التعديلات">حفظ</button>
                      <button onClick={() => { setEditIndex(null); setEditForm(null); }} className="text-gray-600 hover:text-gray-800" aria-label="إلغاء التعديل" title="إلغاء التعديل">إلغاء</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 text-gray-800">{price.country}</td>
                    <td className="px-6 py-4 text-gray-600">{price.code}</td>
                    <td className="px-6 py-4 text-gray-600">{price.currency}</td>
                    <td className="px-6 py-4 text-gray-800 font-medium">{price.monthly} {price.symbol}</td>
                    <td className="px-6 py-4 text-gray-800 font-medium">{price.yearly} {price.symbol}</td>
                    <td className="px-6 py-4 text-gray-800 font-medium">{price.lifetime} {price.symbol}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => startEdit(index)} className="text-emerald-600 hover:text-emerald-800 ml-3" aria-label="تعديل السعر" title="تعديل السعر">تعديل</button>
                      <button onClick={() => deletePrice(index)} className="text-red-600 hover:text-red-800" aria-label="حذف السعر" title="حذف السعر">حذف</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full bg-emerald-600 text-white py-4 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50">
        {saving ? 'جارٍ الحفظ...' : 'حفظ الأسعار'}
      </button>
    </>
  );
}
