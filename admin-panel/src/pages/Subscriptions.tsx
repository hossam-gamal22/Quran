import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface SubscriptionConfig {
  enabled: boolean;
  lifetimeEnabled: boolean;
  products: {
    monthly: { android: string; ios: string };
    yearly: { android: string; ios: string };
    lifetime: { android: string; ios: string };
  };
  features: string[];
  trialDays: number;
  showPaywallOnLaunch: boolean;
  paywallFrequency: number;
  seasonalOffer?: {
    enabled: boolean;
    title: string;
    description: string;
    discountPercent: number;
    startDate: string;
    endDate: string;
  };
}

interface AdminGrantEntry {
  userId: string;
  granted: boolean;
  plan: string;
  expiresAt: string | null;
  reason: string;
  grantedAt: string;
}

const DEFAULT_CONFIG: SubscriptionConfig = {
  enabled: false,
  lifetimeEnabled: false,
  products: {
    monthly: { android: 'rooh_muslim_monthly', ios: 'rooh_muslim_monthly' },
    yearly: { android: 'rooh_muslim_yearly', ios: 'rooh_muslim_yearly' },
    lifetime: { android: 'rooh_muslim_lifetime', ios: 'rooh_muslim_lifetime' },
  },
  features: [
    'إزالة جميع الإعلانات',
    'إزالة لوجو البرنامج عند المشاركات',
    'خلفيات إضافية',
    'مساعدتنا في تطوير التطبيق',
  ],
  trialDays: 3,
  showPaywallOnLaunch: false,
  paywallFrequency: 5,
  seasonalOffer: {
    enabled: false,
    title: '',
    description: '',
    discountPercent: 0,
    startDate: '',
    endDate: '',
  },
};

export default function Subscriptions() {
  const [config, setConfig] = useState<SubscriptionConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Grant subscription
  const [grantUserId, setGrantUserId] = useState('');
  const [grantPlan, setGrantPlan] = useState<string>('yearly');
  const [grantExpiry, setGrantExpiry] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [grantingUser, setGrantingUser] = useState(false);
  const [grantedUsers, setGrantedUsers] = useState<AdminGrantEntry[]>([]);

  useEffect(() => {
    loadConfig();
    loadGrantedUsers();
  }, []);

  const loadConfig = async () => {
    try {
      const docRef = doc(db, 'config', 'subscription-settings');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setConfig({ ...DEFAULT_CONFIG, ...snap.data() as SubscriptionConfig });
      }
    } catch (error) {
      console.error('Error loading subscription config:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGrantedUsers = async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const granted: AdminGrantEntry[] = [];
      usersSnap.forEach((userDoc) => {
        const data = userDoc.data();
        if (data.adminPremium?.granted) {
          granted.push({
            userId: userDoc.id,
            granted: true,
            plan: data.adminPremium.plan || 'yearly',
            expiresAt: data.adminPremium.expiresAt || null,
            reason: data.adminPremium.reason || '',
            grantedAt: data.adminPremium.grantedAt || '',
          });
        }
      });
      setGrantedUsers(granted);
    } catch (error) {
      console.error('Error loading granted users:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await setDoc(doc(db, 'config', 'subscription-settings'), config);
      setMessage('✅ تم حفظ الإعدادات بنجاح');
    } catch (error) {
      setMessage('❌ حدث خطأ أثناء الحفظ');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleGrantSubscription = async () => {
    if (!grantUserId.trim()) {
      setMessage('❌ يرجى إدخال معرّف المستخدم');
      return;
    }
    setGrantingUser(true);
    setMessage('');
    try {
      const userRef = doc(db, 'users', grantUserId.trim());
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        setMessage('❌ المستخدم غير موجود');
        setGrantingUser(false);
        return;
      }
      await updateDoc(userRef, {
        adminPremium: {
          granted: true,
          plan: grantPlan,
          grantedBy: 'admin',
          grantedAt: new Date().toISOString(),
          expiresAt: grantExpiry || null,
          reason: grantReason || 'منحة من الإدارة',
        },
      });
      setMessage(`✅ تم منح الاشتراك للمستخدم ${grantUserId}`);
      setGrantUserId('');
      setGrantReason('');
      setGrantExpiry('');
      loadGrantedUsers();
    } catch (error) {
      setMessage('❌ حدث خطأ أثناء منح الاشتراك');
      console.error(error);
    } finally {
      setGrantingUser(false);
    }
  };

  const handleRevokeSubscription = async (userId: string) => {
    if (!confirm(`هل تريد إلغاء اشتراك المستخدم ${userId}؟`)) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        adminPremium: { granted: false },
      });
      setMessage(`✅ تم إلغاء اشتراك ${userId}`);
      loadGrantedUsers();
    } catch (error) {
      setMessage('❌ حدث خطأ أثناء إلغاء الاشتراك');
      console.error(error);
    }
  };

  const updateProduct = (plan: 'monthly' | 'yearly' | 'lifetime', platform: 'android' | 'ios', value: string) => {
    setConfig(prev => ({
      ...prev,
      products: {
        ...prev.products,
        [plan]: { ...prev.products[plan], [platform]: value },
      },
    }));
  };

  const updateFeature = (index: number, value: string) => {
    setConfig(prev => {
      const features = [...prev.features];
      features[index] = value;
      return { ...prev, features };
    });
  };

  const addFeature = () => {
    setConfig(prev => ({ ...prev, features: [...prev.features, ''] }));
  };

  const removeFeature = (index: number) => {
    setConfig(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const offer = config.seasonalOffer || DEFAULT_CONFIG.seasonalOffer!;

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">إدارة الاشتراكات والعروض</h1>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      {/* Master Toggle */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">تفعيل نظام الاشتراكات</h2>
            <p className="text-gray-500 text-sm">تفعيل/إيقاف عمليات الشراء داخل التطبيق</p>
          </div>
          <button onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
            aria-label="تفعيل نظام الاشتراكات"
            title="تفعيل نظام الاشتراكات"
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${config.enabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}>
            {config.enabled ? 'مفعّل' : 'معطّل'}
          </button>
        </div>
      </div>

      {/* Lifetime Toggle */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">اشتراك مدى الحياة</h2>
            <p className="text-gray-500 text-sm">إظهار/إخفاء خيار الاشتراك مدى الحياة في التطبيق</p>
          </div>
          <button onClick={() => setConfig(prev => ({ ...prev, lifetimeEnabled: !prev.lifetimeEnabled }))}
            aria-label="تفعيل اشتراك مدى الحياة"
            title="تفعيل اشتراك مدى الحياة"
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${config.lifetimeEnabled ? 'bg-amber-500 text-white' : 'bg-gray-300 text-gray-700'}`}>
            {config.lifetimeEnabled ? 'مفعّل' : 'معطّل'}
          </button>
        </div>
      </div>

      {/* Product IDs */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">معرّفات المنتجات (Store IDs)</h2>
        {(['monthly', 'yearly', 'lifetime'] as const).map((plan) => (
          <div key={plan} className="mb-4">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              {plan === 'monthly' ? 'شهري' : plan === 'yearly' ? 'سنوي' : 'مدى الحياة'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Android</label>
                <input type="text" value={config.products[plan].android}
                  onChange={(e) => updateProduct(plan, 'android', e.target.value)}
                  placeholder="Android Product ID"
                  aria-label={`Android ${plan} product ID`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500">iOS</label>
                <input type="text" value={config.products[plan].ios}
                  onChange={(e) => updateProduct(plan, 'ios', e.target.value)}
                  placeholder="iOS Product ID"
                  aria-label={`iOS ${plan} product ID`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">مزايا الاشتراك</h2>
        {config.features.map((feature, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input type="text" value={feature} onChange={(e) => updateFeature(i, e.target.value)}
              placeholder="اسم الميزة"
              aria-label="اسم الميزة"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" dir="rtl" />
            <button onClick={() => removeFeature(i)} className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm">حذف</button>
          </div>
        ))}
        <button onClick={addFeature} className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
          + إضافة ميزة
        </button>
      </div>

      {/* Paywall Settings */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">إعدادات الباي وول</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">مدة التجربة (أيام)</label>
            <input type="number" value={config.trialDays}
              onChange={(e) => setConfig(prev => ({ ...prev, trialDays: Number(e.target.value) }))}
              placeholder="3"
              aria-label="مدة التجربة"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">عرض عند الفتح</label>
            <button onClick={() => setConfig(prev => ({ ...prev, showPaywallOnLaunch: !prev.showPaywallOnLaunch }))}
              aria-label="عرض عند الفتح"
              title="عرض عند الفتح"
              className={`w-full py-2 rounded-lg font-medium ${config.showPaywallOnLaunch ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
              {config.showPaywallOnLaunch ? 'مفعّل' : 'معطّل'}
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">تكرار العرض (كل N فتحة)</label>
            <input type="number" value={config.paywallFrequency}
              onChange={(e) => setConfig(prev => ({ ...prev, paywallFrequency: Number(e.target.value) }))}
              placeholder="5"
              aria-label="تكرار العرض"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
        </div>
      </div>

      {/* Seasonal Offer */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">العروض الموسمية</h2>
            <p className="text-gray-500 text-sm">خصومات على الاشتراكات</p>
          </div>
          <button onClick={() => setConfig(prev => ({
            ...prev,
            seasonalOffer: { ...offer, enabled: !offer.enabled },
          }))}
            aria-label="تفعيل العروض الموسمية"
            title="تفعيل العروض الموسمية"
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${offer.enabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}>
            {offer.enabled ? 'مفعّل' : 'تفعيل'}
          </button>
        </div>

        {offer.enabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">عنوان العرض</label>
              <input type="text" value={offer.title}
                onChange={(e) => setConfig(prev => ({ ...prev, seasonalOffer: { ...offer, title: e.target.value } }))}
                placeholder="عنوان العرض"
                aria-label="عنوان العرض"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نسبة الخصم %</label>
              <input type="number" value={offer.discountPercent}
                onChange={(e) => setConfig(prev => ({ ...prev, seasonalOffer: { ...offer, discountPercent: Number(e.target.value) } }))}
                placeholder="0"
                aria-label="نسبة الخصم"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">وصف العرض</label>
              <input type="text" value={offer.description}
                onChange={(e) => setConfig(prev => ({ ...prev, seasonalOffer: { ...offer, description: e.target.value } }))}
                placeholder="وصف العرض"
                aria-label="وصف العرض"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ البداية</label>
              <input type="date" value={offer.startDate}
                onChange={(e) => setConfig(prev => ({ ...prev, seasonalOffer: { ...offer, startDate: e.target.value } }))}
                aria-label="تاريخ البداية"
                title="تاريخ البداية"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ النهاية</label>
              <input type="date" value={offer.endDate}
                onChange={(e) => setConfig(prev => ({ ...prev, seasonalOffer: { ...offer, endDate: e.target.value } }))}
                aria-label="تاريخ النهاية"
                title="تاريخ النهاية"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
          </div>
        )}
      </div>

      {/* Save Config Button */}
      <button onClick={handleSave} disabled={saving}
        className="w-full bg-emerald-600 text-white py-4 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 mb-8">
        {saving ? 'جارٍ الحفظ...' : 'حفظ جميع الإعدادات'}
      </button>

      {/* ===== Grant Subscription Section ===== */}
      <div className="border-t border-gray-200 pt-8 mt-4">
        <h2 className="text-xl font-bold text-gray-800 mb-6">منح اشتراك لمستخدم</h2>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">معرّف المستخدم (User ID)</label>
              <input type="text" value={grantUserId} onChange={(e) => setGrantUserId(e.target.value)}
                placeholder="user_xxxxxxxxx"
                aria-label="معرّف المستخدم"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نوع الاشتراك</label>
              <select value={grantPlan} onChange={(e) => setGrantPlan(e.target.value)}
                aria-label="نوع الاشتراك"
                title="نوع الاشتراك"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                <option value="monthly">شهري</option>
                <option value="yearly">سنوي</option>
                <option value="lifetime">مدى الحياة</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ الانتهاء (اختياري)</label>
              <input type="date" value={grantExpiry} onChange={(e) => setGrantExpiry(e.target.value)}
                aria-label="تاريخ الانتهاء"
                title="تاريخ الانتهاء"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              <p className="text-xs text-gray-400 mt-1">اتركه فارغاً لاشتراك بدون تاريخ انتهاء</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">السبب (اختياري)</label>
              <input type="text" value={grantReason} onChange={(e) => setGrantReason(e.target.value)}
                placeholder="منحة من الإدارة"
                aria-label="سبب المنح"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" dir="rtl" />
            </div>
          </div>
          <button onClick={handleGrantSubscription} disabled={grantingUser}
            className="w-full bg-amber-500 text-white py-3 rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50">
            {grantingUser ? 'جارٍ المنح...' : '👑 منح الاشتراك'}
          </button>
        </div>

        {/* Granted Users List */}
        {grantedUsers.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">المستخدمون الممنوحون ({grantedUsers.length})</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">المستخدم</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">الباقة</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">تاريخ المنح</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">ينتهي</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">السبب</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {grantedUsers.map((user) => (
                  <tr key={user.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-800 font-mono" dir="ltr">{user.userId.slice(0, 20)}...</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {user.plan === 'monthly' ? 'شهري' : user.plan === 'yearly' ? 'سنوي' : 'مدى الحياة'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {user.grantedAt ? new Date(user.grantedAt).toLocaleDateString('ar-EG') : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {user.expiresAt ? new Date(user.expiresAt).toLocaleDateString('ar-EG') : 'بدون انتهاء'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.reason || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleRevokeSubscription(user.userId)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                        aria-label="إلغاء الاشتراك"
                        title="إلغاء الاشتراك">إلغاء</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
