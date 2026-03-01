import { useState } from 'react';

export default function Notifications() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sendTo, setSendTo] = useState<'all' | 'inactive' | 'active' | 'free' | 'premium'>('all');
  const [inactiveDays, setInactiveDays] = useState(7);

  const [sentNotifications] = useState([
    { id: 1, title: 'تذكير بصلاة الفجر', body: 'حان وقت صلاة الفجر', date: '2024-03-01', target: 'all', sent: 1250 },
    { id: 2, title: 'وحشتنا!', body: 'مرّت 3 أيام من آخر زيارة', date: '2024-03-01', target: 'inactive', sent: 89 },
    { id: 3, title: 'عرض رمضان', body: 'خصم 50% على الاشتراك', date: '2024-02-28', target: 'free', sent: 430 },
  ]);

  const userStats = {
    total: 5420,
    active: 3200,
    inactive7Days: 650,
    freeUsers: 4100,
    premiumUsers: 1320,
  };

  const handleSendNotification = () => {
    if (title && body) {
      alert(`تم إرسال الإشعار بنجاح!`);
      setTitle('');
      setBody('');
    }
  };

  const getTargetLabel = (target: string) => {
    const labels: Record<string, string> = { all: 'الجميع', inactive: 'غير نشطين', active: 'نشطين', free: 'مجانيين', premium: 'مشتركين' };
    return labels[target] || target;
  };

  const getTargetColor = (target: string) => {
    const colors: Record<string, string> = {
      all: 'bg-blue-100 text-blue-700',
      inactive: 'bg-orange-100 text-orange-700',
      active: 'bg-green-100 text-green-700',
      free: 'bg-gray-100 text-gray-700',
      premium: 'bg-purple-100 text-purple-700',
    };
    return colors[target] || 'bg-gray-100 text-gray-700';
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">إدارة الإشعارات</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-gray-500 text-xs">إجمالي المستخدمين</p>
          <p className="text-2xl font-bold text-gray-800">{userStats.total.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-gray-500 text-xs">نشطين</p>
          <p className="text-2xl font-bold text-green-600">{userStats.active.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-gray-500 text-xs">غير نشطين +7 أيام</p>
          <p className="text-2xl font-bold text-orange-600">{userStats.inactive7Days}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-gray-500 text-xs">المشتركين</p>
          <p className="text-2xl font-bold text-purple-600">{userStats.premiumUsers}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">إرسال إشعار جديد</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">إرسال إلى</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'الجميع', count: userStats.total },
                { value: 'active', label: 'النشطين', count: userStats.active },
                { value: 'inactive', label: 'غير النشطين', count: userStats.inactive7Days },
                { value: 'free', label: 'المجانيين', count: userStats.freeUsers },
                { value: 'premium', label: 'المشتركين', count: userStats.premiumUsers },
              ].map((option) => (
                <button key={option.value} onClick={() => setSendTo(option.value as typeof sendTo)}
                  className={`px-4 py-3 rounded-xl border-2 transition-all ${sendTo === option.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <span className="font-medium text-gray-800 block">{option.label}</span>
                  <span className="text-xs text-gray-500">{option.count.toLocaleString()} مستخدم</span>
                </button>
              ))}
            </div>
          </div>

          {sendTo === 'inactive' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-orange-700 mb-2">المستخدمين الذين لم يفتحوا التطبيق منذ:</label>
              <div className="flex items-center gap-3">
                <input type="number" value={inactiveDays} onChange={(e) => setInactiveDays(Number(e.target.value))}
                  min="1" max="365"
                  className="w-24 px-4 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                <span className="text-orange-700">يوم</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">عنوان الإشعار</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="مثال: وحشتنا!" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">محتوى الإشعار</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-24"
              placeholder="مثال: تعال اقرأ وردك اليومي..." />
          </div>

          <button onClick={handleSendNotification} disabled={!title || !body}
            className={`w-full py-4 rounded-xl font-medium transition-colors ${title && body ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
            إرسال الإشعار الآن
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">سجل الإشعارات المرسلة</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">العنوان</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">المحتوى</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">المستهدفين</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">تم الإرسال</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">التاريخ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sentNotifications.map((notif) => (
              <tr key={notif.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-800 font-medium">{notif.title}</td>
                <td className="px-6 py-4 text-gray-600 text-sm max-w-xs truncate">{notif.body}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTargetColor(notif.target)}`}>
                    {getTargetLabel(notif.target)}
                  </span>
                </td>
                <td className="px-6 py-4 text-emerald-600 font-medium">{notif.sent.toLocaleString()}</td>
                <td className="px-6 py-4 text-gray-500">{notif.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
