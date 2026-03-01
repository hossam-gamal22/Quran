import { useState } from 'react';

export default function Subscriptions() {
  const [subscribers, setSubscribers] = useState([
    { id: 1, email: 'ahmed@gmail.com', country: 'مصر', plan: 'سنوي', amount: 399, currency: 'EGP', date: '2024-02-15', status: 'active' },
    { id: 2, email: 'omar@gmail.com', country: 'السعودية', plan: 'شهري', amount: 9.99, currency: 'SAR', date: '2024-03-01', status: 'active' },
    { id: 3, email: 'sara@gmail.com', country: 'الإمارات', plan: 'Lifetime', amount: 299, currency: 'AED', date: '2024-01-10', status: 'active' },
  ]);

  // إعدادات العرض الموسمي
  const [offerEnabled, setOfferEnabled] = useState(false);
  const [offerTitle, setOfferTitle] = useState('عرض رمضان المبارك 🌙');
  const [offerDescription, setOfferDescription] = useState('خصم 50% على الاشتراك السنوي');
  const [discountPercent, setDiscountPercent] = useState(50);
  const [offerStartDate, setOfferStartDate] = useState('2024-03-10');
  const [offerEndDate, setOfferEndDate] = useState('2024-04-10');
  const [bannerType, setBannerType] = useState<'color' | 'image'>('color');
  const [offerBannerColor, setOfferBannerColor] = useState('#059669');
  const [bannerImage, setBannerImage] = useState('');

  // إعدادات Lifetime
  const [lifetimeEnabled, setLifetimeEnabled] = useState(false);
  const [lifetimeType, setLifetimeType] = useState<'paid' | 'free'>('paid');
  const [lifetimePrice, setLifetimePrice] = useState(499);
  const [lifetimeStartDate, setLifetimeStartDate] = useState('2024-12-01');
  const [lifetimeEndDate, setLifetimeEndDate] = useState('2024-12-31');
  const [lifetimeTitle, setLifetimeTitle] = useState('عرض العمر! 🎁');
  const [lifetimeDescription, setLifetimeDescription] = useState('اشتراك مدى الحياة بدون إعلانات');
  const [lifetimeColor, setLifetimeColor] = useState('#8b5cf6');
  const [lifetimeIcon, setLifetimeIcon] = useState('♾️');

  // قوالب ألوان Lifetime
  const lifetimeColorPresets = [
    { name: 'بنفسجي', color: '#8b5cf6', gradient: 'from-purple-500 via-pink-500 to-rose-500' },
    { name: 'ذهبي', color: '#f59e0b', gradient: 'from-amber-400 via-yellow-500 to-orange-500' },
    { name: 'أخضر', color: '#10b981', gradient: 'from-emerald-400 via-teal-500 to-cyan-500' },
    { name: 'أزرق', color: '#3b82f6', gradient: 'from-blue-400 via-indigo-500 to-purple-500' },
    { name: 'أحمر', color: '#ef4444', gradient: 'from-red-400 via-rose-500 to-pink-500' },
    { name: 'برتقالي', color: '#f97316', gradient: 'from-orange-400 via-amber-500 to-yellow-500' },
  ];

  // أيقونات Lifetime
  const lifetimeIcons = ['♾️', '👑', '💎', '🏆', '⭐', '🎁', '🔥', '💫', '✨', '🌟'];

  // قوالب العروض الموسمية
  const offerTemplates = [
    { name: 'عرض رمضان', title: 'عرض رمضان المبارك 🌙', description: 'خصم 50% على الاشتراك السنوي', discount: 50, color: '#059669' },
    { name: 'عرض العيد', title: 'عرض عيد الفطر 🎉', description: 'خصم 40% بمناسبة العيد', discount: 40, color: '#7c3aed' },
    { name: 'الجمعة البيضاء', title: 'الجمعة البيضاء 🛍️', description: 'أكبر خصم في السنة 60%', discount: 60, color: '#1f2937' },
  ];

  const applyTemplate = (template: typeof offerTemplates[0]) => {
    setOfferTitle(template.title);
    setOfferDescription(template.description);
    setDiscountPercent(template.discount);
    setOfferBannerColor(template.color);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setBannerImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    alert('تم حفظ جميع الإعدادات بنجاح!');
  };

  const getGradientStyle = (color: string) => {
    const preset = lifetimeColorPresets.find(p => p.color === color);
    if (preset) {
      return `linear-gradient(135deg, ${color}dd, ${color}, ${color}bb)`;
    }
    return `linear-gradient(135deg, ${color}dd, ${color}, ${color}bb)`;
  };

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  };

  const totalRevenue = subscribers.filter(s => s.status === 'active').reduce((sum, s) => sum + s.amount, 0);
  const activeCount = subscribers.filter(s => s.status === 'active').length;
  const lifetimeCount = subscribers.filter(s => s.plan === 'Lifetime').length;

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
              <li><a href="/subscriptions" className="block px-4 py-3 bg-emerald-700 rounded-lg">الاشتراكات</a></li>
              <li><a href="/content" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">المحتوى</a></li>
              <li><a href="/notifications" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">الإشعارات</a></li>
            </ul>
          </nav>
        </aside>

        <main className="flex-1 mr-64 p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">إدارة الاشتراكات والعروض</h1>

          {/* إحصائيات */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
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
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-gray-500 text-sm">العروض</p>
              <p className={`text-2xl font-bold mt-1 ${offerEnabled || lifetimeEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                {offerEnabled || lifetimeEnabled ? 'مفعّلة' : 'معطّلة'}
              </p>
            </div>
          </div>

          {/* ===================== قسم Lifetime ===================== */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">♾️</span>
                <div>
                  <h2 className="text-lg font-semibold text-purple-800">عرض Lifetime (مدى الحياة)</h2>
                  <p className="text-purple-600 text-sm">اشتراك دائم بدون إعلانات - لمرة واحدة فقط</p>
                </div>
              </div>
              <button
                onClick={() => setLifetimeEnabled(!lifetimeEnabled)}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${lifetimeEnabled ? 'bg-purple-600 text-white' : 'bg-gray-300 text-gray-700'}`}
              >
                {lifetimeEnabled ? '✓ مفعّل' : 'تفعيل'}
              </button>
            </div>

            {lifetimeEnabled && (
              <>
                {/* نوع العرض */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-purple-700 mb-3">نوع عرض Lifetime</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setLifetimeType('paid')}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${lifetimeType === 'paid' ? 'border-purple-500 bg-purple-100' : 'border-gray-200 bg-white'}`}
                    >
                      <span className="text-2xl block mb-2">💰</span>
                      <span className="font-medium text-gray-800">مدفوع</span>
                      <p className="text-sm text-gray-500 mt-1">مبلغ لمرة واحدة</p>
                    </button>
                    <button
                      onClick={() => setLifetimeType('free')}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${lifetimeType === 'free' ? 'border-purple-500 bg-purple-100' : 'border-gray-200 bg-white'}`}
                    >
                      <span className="text-2xl block mb-2">🎁</span>
                      <span className="font-medium text-gray-800">مجاني</span>
                      <p className="text-sm text-gray-500 mt-1">هدية لفترة محدودة</p>
                    </button>
                  </div>
                </div>

                {/* اختيار اللون */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-purple-700 mb-3">🎨 لون العرض</label>
                  <div className="flex flex-wrap gap-3 mb-3">
                    {lifetimeColorPresets.map((preset) => (
                      <button
                        key={preset.color}
                        onClick={() => setLifetimeColor(preset.color)}
                        className={`w-12 h-12 rounded-xl transition-all ${lifetimeColor === preset.color ? 'ring-4 ring-offset-2 ring-purple-400 scale-110' : ''}`}
                        style={{ background: `linear-gradient(135deg, ${preset.color}dd, ${preset.color})` }}
                        title={preset.name}
                      />
                    ))}
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={lifetimeColor}
                        onChange={(e) => setLifetimeColor(e.target.value)}
                        className="w-12 h-12 rounded-xl cursor-pointer border-2 border-gray-300"
                        title="لون مخصص"
                      />
                      <span className="text-sm text-gray-500">مخصص</span>
                    </div>
                  </div>
                </div>

                {/* اختيار الأيقونة */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-purple-700 mb-3">✨ أيقونة العرض</label>
                  <div className="flex flex-wrap gap-2">
                    {lifetimeIcons.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setLifetimeIcon(icon)}
                        className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all ${
                          lifetimeIcon === icon 
                            ? 'ring-4 ring-offset-2 ring-purple-400 scale-110' 
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                        style={lifetimeIcon === icon ? { background: `${lifetimeColor}30` } : {}}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-purple-700 mb-2">عنوان العرض</label>
                    <input
                      type="text"
                      value={lifetimeTitle}
                      onChange={(e) => setLifetimeTitle(e.target.value)}
                      className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  {lifetimeType === 'paid' && (
                    <div>
                      <label className="block text-sm font-medium text-purple-700 mb-2">السعر (بعملة البلد)</label>
                      <input
                        type="number"
                        value={lifetimePrice}
                        onChange={(e) => setLifetimePrice(Number(e.target.value))}
                        className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-purple-700 mb-2">وصف العرض</label>
                    <input
                      type="text"
                      value={lifetimeDescription}
                      onChange={(e) => setLifetimeDescription(e.target.value)}
                      className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-700 mb-2">تاريخ البداية</label>
                    <input
                      type="date"
                      value={lifetimeStartDate}
                      onChange={(e) => setLifetimeStartDate(e.target.value)}
                      className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-700 mb-2">تاريخ النهاية</label>
                    <input
                      type="date"
                      value={lifetimeEndDate}
                      onChange={(e) => setLifetimeEndDate(e.target.value)}
                      className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>

                {/* معاينة Lifetime زجاجية */}
                <div>
                  <p className="text-sm font-medium text-purple-700 mb-3">📱 معاينة في التطبيق:</p>
                  <div 
                    className="rounded-xl p-8 max-w-md mx-auto"
                    style={{ background: getGradientStyle(lifetimeColor) }}
                  >
                    <div style={glassStyle} className="rounded-2xl p-6 text-white text-center">
                      <div 
                        className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.2)' }}
                      >
                        <span className="text-4xl">{lifetimeIcon}</span>
                      </div>
                      <p className="text-2xl font-bold mb-2">{lifetimeTitle}</p>
                      <p className="text-lg opacity-90 mb-4">{lifetimeDescription}</p>
                      
                      {lifetimeType === 'paid' ? (
                        <div className="mb-4">
                          <span className="text-4xl font-bold">{lifetimePrice}</span>
                          <span className="text-lg mr-1">ج.م</span>
                          <p className="text-sm opacity-75 mt-1">دفعة واحدة - للأبد</p>
                        </div>
                      ) : (
                        <div className="mb-4 px-4 py-2 rounded-full inline-block" style={{ background: 'rgba(255,255,255,0.2)' }}>
                          <span className="text-2xl font-bold">مجاناً! 🎉</span>
                        </div>
                      )}

                      <div className="space-y-2 text-sm opacity-90 mb-4">
                        <p>✓ بدون إعلانات للأبد</p>
                        <p>✓ جميع المميزات المدفوعة</p>
                        <p>✓ دعم فني أولوية</p>
                      </div>

                      <button 
                        className="w-full py-3 rounded-xl font-bold text-lg transition-all"
                        style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.3)' }}
                      >
                        {lifetimeType === 'paid' ? 'اشترك الآن ✨' : 'احصل عليه مجاناً 🎁'}
                      </button>

                      <p className="text-xs opacity-60 mt-3">
                        العرض ساري حتى {lifetimeEndDate}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ===================== قسم العروض الموسمية ===================== */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎁</span>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">العروض الموسمية</h2>
                  <p className="text-gray-500 text-sm">خصومات على الاشتراكات الشهرية والسنوية</p>
                </div>
              </div>
              <button
                onClick={() => setOfferEnabled(!offerEnabled)}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${offerEnabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}
              >
                {offerEnabled ? '✓ مفعّل' : 'تفعيل'}
              </button>
            </div>

            {offerEnabled && (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">قوالب جاهزة</label>
                  <div className="flex flex-wrap gap-2">
                    {offerTemplates.map((template, index) => (
                      <button
                        key={index}
                        onClick={() => applyTemplate(template)}
                        className="px-4 py-2 rounded-lg text-sm font-medium"
                        style={{ backgroundColor: template.color + '20', color: template.color, border: `1px solid ${template.color}` }}
                      >
                        {template.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">عنوان العرض</label>
                    <input
                      type="text"
                      value={offerTitle}
                      onChange={(e) => setOfferTitle(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">نسبة الخصم %</label>
                    <input
                      type="number"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">وصف العرض</label>
                    <input
                      type="text"
                      value={offerDescription}
                      onChange={(e) => setOfferDescription(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ البداية</label>
                    <input
                      type="date"
                      value={offerStartDate}
                      onChange={(e) => setOfferStartDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ النهاية</label>
                    <input
                      type="date"
                      value={offerEndDate}
                      onChange={(e) => setOfferEndDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* نوع البانر */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">خلفية البانر</label>
                  <div className="flex gap-4 mb-4">
                    <button
                      onClick={() => setBannerType('color')}
                      className={`px-6 py-3 rounded-lg font-medium ${bannerType === 'color' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                      🎨 لون
                    </button>
                    <button
                      onClick={() => setBannerType('image')}
                      className={`px-6 py-3 rounded-lg font-medium ${bannerType === 'image' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                      🖼️ صورة
                    </button>
                  </div>

                  {bannerType === 'color' ? (
                    <div className="flex items-center gap-4">
                      <input type="color" value={offerBannerColor} onChange={(e) => setOfferBannerColor(e.target.value)} className="w-16 h-12 rounded cursor-pointer" />
                      <span className="text-gray-500">{offerBannerColor}</span>
                    </div>
                  ) : (
                    <label className="block">
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-500">
                        {bannerImage ? (
                          <img src={bannerImage} alt="Banner" className="max-h-32 mx-auto rounded-lg" />
                        ) : (
                          <>
                            <div className="text-4xl mb-2">📁</div>
                            <p className="text-gray-500">اضغط لرفع صورة</p>
                          </>
                        )}
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </div>
                    </label>
                  )}
                </div>

                {/* معاينة زجاجية */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">📱 معاينة في التطبيق:</p>
                  <div 
                    className="rounded-xl p-8 max-w-md mx-auto"
                    style={{
                      background: bannerType === 'color' 
                        ? `linear-gradient(135deg, ${offerBannerColor}dd, ${offerBannerColor}, ${offerBannerColor}bb)` 
                        : `url(${bannerImage}) center/cover`,
                    }}
                  >
                    <div style={glassStyle} className="rounded-2xl p-6 text-white text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                        <span className="text-3xl">🎁</span>
                      </div>
                      <p className="text-2xl font-bold mb-2">{offerTitle}</p>
                      <p className="text-lg opacity-90 mb-4">{offerDescription}</p>
                      <div className="inline-block px-6 py-2 rounded-full font-bold text-xl" style={{ background: 'rgba(255,255,255,0.25)' }}>
                        خصم {discountPercent}%
                      </div>
                      <p className="text-sm opacity-75 mt-4">حتى {offerEndDate}</p>
                      <button className="mt-4 w-full py-3 rounded-xl font-bold" style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}>
                        استفد من العرض ✨
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* قائمة المشتركين */}
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
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        sub.plan === 'Lifetime' ? 'bg-purple-100 text-purple-700' : 
                        sub.plan === 'سنوي' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}>
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
            💾 حفظ جميع الإعدادات
          </button>
        </main>
      </div>
    </div>
  );
}
