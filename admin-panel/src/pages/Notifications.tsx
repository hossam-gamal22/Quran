import { useState } from 'react';

export default function Notifications() {
  // إشعار جديد
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sendTo, setSendTo] = useState<'all' | 'inactive' | 'active' | 'free' | 'premium'>('all');
  
  // إعدادات المستخدمين غير النشطين
  const [inactiveDays, setInactiveDays] = useState(7);
  const [autoInactiveEnabled, setAutoInactiveEnabled] = useState(false);
  const [autoInactiveTitle, setAutoInactiveTitle] = useState('وحشتنا! 💚');
  const [autoInactiveBody, setAutoInactiveBody] = useState('مرّ وقت من آخر زيارة، تعال اقرأ وردك اليومي');
  const [autoInactiveDays, setAutoInactiveDays] = useState(3);

  // إشعارات مجدولة للمستخدمين غير النشطين
  const [scheduledInactiveNotifications, setScheduledInactiveNotifications] = useState([
    { id: 1, days: 3, title: 'وحشتنا! 💚', body: 'مرّت 3 أيام، تعال اقرأ وردك', enabled: true },
    { id: 2, days: 7, title: 'أسبوع بدونك! 📖', body: 'القرآن ينتظرك، عُد إلينا', enabled: true },
    { id: 3, days: 14, title: 'اشتقنالك كتير! 🤲', body: 'مرّ أسبوعين، لا تنسى أذكارك', enabled: false },
    { id: 4, days: 30, title: 'شهر كامل! 😢', body: 'نتمنى رؤيتك قريباً', enabled: false },
  ]);

  // سجل الإشعارات المرسلة
  const [sentNotifications, setSentNotifications] = useState([
    { id: 1, title: 'تذكير بصلاة الفجر', body: 'حان وقت صلاة الفجر', date: '2024-03-01', target: 'all', sent: 1250 },
    { id: 2, title: 'وحشتنا!', body: 'مرّت 3 أيام من آخر زيارة', date: '2024-03-01', target: 'inactive', sent: 89 },
    { id: 3, title: 'عرض رمضان', body: 'خصم 50% على الاشتراك', date: '2024-02-28', target: 'free', sent: 430 },
  ]);

  // إحصائيات المستخدمين
  const userStats = {
    total: 5420,
    active: 3200,
    inactive3Days: 890,
    inactive7Days: 650,
    inactive14Days: 420,
    inactive30Days: 260,
    freeUsers: 4100,
    premiumUsers: 1320,
  };

  const handleSendNotification = () => {
    if (title && body) {
      const newNotification = {
        id: Date.now(),
        title,
        body,
        date: new Date().toISOString().split('T')[0],
        target: sendTo,
        sent: sendTo === 'all' ? userStats.total : 
              sendTo === 'inactive' ? userStats.inactive7Days :
              sendTo === 'active' ? userStats.active :
              sendTo === 'free' ? userStats.freeUsers : userStats.premiumUsers
      };
      setSentNotifications([newNotification, ...sentNotifications]);
      setTitle('');
      setBody('');
      alert(`تم إرسال الإشعار بنجاح إلى ${newNotification.sent} مستخدم!`);
    }
  };

  const toggleScheduledNotification = (id: number) => {
    setScheduledInactiveNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, enabled: !n.enabled } : n)
    );
  };

  const handleSaveAutoSettings = () => {
    alert('تم حفظ إعدادات الإشعارات التلقائية!');
  };

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  };

  const getTargetLabel = (target: string) => {
    switch (target) {
      case 'all': return 'الجميع';
      case 'inactive': return 'غير نشطين';
      case 'active': return 'نشطين';
      case 'free': return 'مجانيين';
      case 'premium': return 'مشتركين';
      default: return target;
    }
  };

  const getTargetColor = (target: string) => {
    switch (target) {
      case 'all': return 'bg-blue-100 text-blue-700';
      case 'inactive': return 'bg-orange-100 text-orange-700';
      case 'active': return 'bg-green-100 text-green-700';
      case 'free': return 'bg-gray-100 text-gray-700';
      case 'premium': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
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
              <li><a href="/content" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">المحتوى</a></li>
              <li><a href="/notifications" className="block px-4 py-3 bg-emerald-700 rounded-lg">الإشعارات</a></li>
            </ul>
          </nav>
        </aside>

        <main className="flex-1 mr-64 p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">إدارة الإشعارات</h1>

          {/* إحصائيات المستخدمين */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-gray-500 text-xs">إجمالي المستخدمين</p>
              <p className="text-2xl font-bold text-gray-800">{userStats.total.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-gray-500 text-xs">نشطين (آخر 3 أيام)</p>
              <p className="text-2xl font-bold text-green-600">{userStats.active.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-gray-500 text-xs">غير نشطين +7 أيام</p>
              <p className="text-2xl font-bold text-orange-600">{userStats.inactive7Days}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-gray-500 text-xs">غير نشطين +30 يوم</p>
              <p className="text-2xl font-bold text-red-600">{userStats.inactive30Days}</p>
            </div>
          </div>

          {/* إرسال إشعار جديد */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">📤 إرسال إشعار جديد</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">إرسال إلى</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'الجميع', icon: '👥', count: userStats.total },
                    { value: 'active', label: 'النشطين', icon: '✅', count: userStats.active },
                    { value: 'inactive', label: 'غير النشطين', icon: '😴', count: userStats.inactive7Days },
                    { value: 'free', label: 'المجانيين', icon: '🆓', count: userStats.freeUsers },
                    { value: 'premium', label: 'المشتركين', icon: '⭐', count: userStats.premiumUsers },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSendTo(option.value as any)}
                      className={`px-4 py-3 rounded-xl border-2 transition-all ${
                        sendTo === option.value 
                          ? 'border-emerald-500 bg-emerald-50' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <span className="text-xl block mb-1">{option.icon}</span>
                      <span className="font-medium text-gray-800 block">{option.label}</span>
                      <span className="text-xs text-gray-500">{option.count.toLocaleString()} مستخدم</span>
                    </button>
                  ))}
                </div>
              </div>

              {sendTo === 'inactive' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-orange-700 mb-2">
                    المستخدمين الذين لم يفتحوا التطبيق منذ:
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={inactiveDays}
                      onChange={(e) => setInactiveDays(Number(e.target.value))}
                      min="1"
                      max="365"
                      className="w-24 px-4 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                    <span className="text-orange-700">يوم</span>
                    <span className="text-orange-600 text-sm">
                      (حوالي {inactiveDays <= 3 ? userStats.inactive3Days : inactiveDays <= 7 ? userStats.inactive7Days : inactiveDays <= 14 ? userStats.inactive14Days : userStats.inactive30Days} مستخدم)
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">عنوان الإشعار</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="مثال: وحشتنا! 💚"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">محتوى الإشعار</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-24"
                  placeholder="مثال: تعال اقرأ وردك اليومي..."
                />
              </div>

              {/* معاينة الإشعار */}
              {(title || body) && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">📱 معاينة:</p>
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 max-w-sm">
                    <div className="bg-white rounded-xl p-4 shadow-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                          <span className="text-white text-lg">🕌</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <p className="font-bold text-gray-800">{title || 'عنوان الإشعار'}</p>
                            <span className="text-xs text-gray-400">الآن</span>
                          </div>
                          <p className="text-gray-600 text-sm mt-1">{body || 'محتوى الإشعار...'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleSendNotification}
                disabled={!title || !body}
                className={`w-full py-4 rounded-xl font-medium transition-colors ${
                  title && body 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                📤 إرسال الإشعار الآن
              </button>
            </div>
          </div>

          {/* إشعارات تلقائية للمستخدمين غير النشطين */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🔄</span>
                <div>
                  <h2 className="text-lg font-semibold text-orange-800">إشعارات تلقائية لاستعادة المستخدمين</h2>
                  <p className="text-orange-600 text-sm">إرسال إشعارات أوتوماتيكية للمستخدمين غير النشطين</p>
                </div>
              </div>
              <button
                onClick={() => setAutoInactiveEnabled(!autoInactiveEnabled)}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  autoInactiveEnabled ? 'bg-orange-500 text-white' : 'bg-gray-300 text-gray-700'
                }`}
              >
                {autoInactiveEnabled ? '✓ مفعّل' : 'تفعيل'}
              </button>
            </div>

            {autoInactiveEnabled && (
              <>
                <div className="space-y-4 mb-6">
                  {scheduledInactiveNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`bg-white rounded-xl p-4 border-2 transition-all ${
                        notification.enabled ? 'border-orange-300' : 'border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            notification.enabled ? 'bg-orange-100' : 'bg-gray-100'
                          }`}>
                            <span className="font-bold text-orange-600">{notification.days}d</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{notification.title}</p>
                            <p className="text-sm text-gray-500">{notification.body}</p>
                            <p className="text-xs text-orange-600 mt-1">
                              يُرسل بعد {notification.days} أيام من عدم النشاط
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleScheduledNotification(notification.id)}
                          className={`px-4 py-2 rounded-lg font-medium text-sm ${
                            notification.enabled 
                              ? 'bg-orange-500 text-white' 
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {notification.enabled ? 'مفعّل' : 'معطّل'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* إضافة إشعار مخصص */}
                <div className="bg-white rounded-xl p-4 border-2 border-dashed border-orange-300">
                  <h3 className="font-medium text-gray-800 mb-4">➕ إضافة إشعار مخصص</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">بعد (أيام)</label>
                      <input
                        type="number"
                        value={autoInactiveDays}
                        onChange={(e) => setAutoInactiveDays(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">العنوان</label>
                      <input
                        type="text"
                        value={autoInactiveTitle}
                        onChange={(e) => setAutoInactiveTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">المحتوى</label>
                      <input
                        type="text"
                        value={autoInactiveBody}
                        onChange={(e) => setAutoInactiveBody(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <button className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg font-medium text-sm hover:bg-orange-600">
                        + إضافة
                      </button>
                    </div>
                  </div>
                </div>

                {/* معاينة زجاجية */}
                <div className="mt-6">
                  <p className="text-sm font-medium text-orange-700 mb-3">📱 معاينة الإشعار التلقائي:</p>
                  <div className="bg-gradient-to-br from-orange-400 via-amber-500 to-orange-600 rounded-xl p-8 max-w-sm mx-auto">
                    <div style={glassStyle} className="rounded-2xl p-6 text-white text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                        <span className="text-3xl">💚</span>
                      </div>
                      <p className="text-xl font-bold mb-2">{autoInactiveTitle}</p>
                      <p className="text-lg opacity-90 mb-4">{autoInactiveBody}</p>
                      <button className="px-8 py-2 rounded-full font-medium" style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.3)' }}>
                        افتح التطبيق ✨
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveAutoSettings}
                  className="w-full mt-6 bg-orange-500 text-white py-3 rounded-xl font-medium hover:bg-orange-600"
                >
                  💾 حفظ إعدادات الإشعارات التلقائية
                </button>
              </>
            )}
          </div>

          {/* سجل الإشعارات */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">📋 سجل الإشعارات المرسلة</h2>
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
        </main>
      </div>
    </div>
  );
}
