import { useState, useEffect } from 'react';
import { collection, doc, getDocs, setDoc, deleteDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { fetchActiveDevices, invalidateActiveDevicesCache, type ActiveDeviceStats } from '../utils/user-query';

type TimestampLike = Timestamp | { toDate: () => Date } | { seconds: number; nanoseconds?: number } | string | Date | null | undefined;
type UserPlan = 'free' | 'monthly' | 'yearly' | 'lifetime';

const toMillis = (value: TimestampLike): number => {
  if (!value) return 0;
  if (typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    try { return (value as { toDate: () => Date }).toDate().getTime(); } catch { return 0; }
  }
  if (typeof value === 'object' && 'seconds' in value) {
    return ((value as { seconds: number }).seconds || 0) * 1000;
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : 0;
  }
  return 0;
};

/** ISO 3166-1 alpha-2 → Arabic country name */
const COUNTRY_NAMES: Record<string, string> = {
  EG: 'مصر', SA: 'السعودية', AE: 'الإمارات', KW: 'الكويت', QA: 'قطر',
  BH: 'البحرين', OM: 'عُمان', IQ: 'العراق', JO: 'الأردن', PS: 'فلسطين',
  LB: 'لبنان', SY: 'سوريا', YE: 'اليمن', LY: 'ليبيا', TN: 'تونس',
  DZ: 'الجزائر', MA: 'المغرب', SD: 'السودان', MR: 'موريتانيا', SO: 'الصومال',
  DJ: 'جيبوتي', KM: 'جزر القمر',
  TR: 'تركيا', IR: 'إيران', PK: 'باكستان', AF: 'أفغانستان', BD: 'بنغلاديش',
  IN: 'الهند', ID: 'إندونيسيا', MY: 'ماليزيا', SG: 'سنغافورة',
  GB: 'بريطانيا', US: 'أمريكا', CA: 'كندا', AU: 'أستراليا', NZ: 'نيوزيلندا',
  FR: 'فرنسا', DE: 'ألمانيا', ES: 'إسبانيا', IT: 'إيطاليا', NL: 'هولندا',
  BE: 'بلجيكا', SE: 'السويد', NO: 'النرويج', DK: 'الدنمارك', CH: 'سويسرا',
  AT: 'النمسا', PT: 'البرتغال', GR: 'اليونان', PL: 'بولندا', RO: 'رومانيا',
  RU: 'روسيا', UA: 'أوكرانيا', BR: 'البرازيل', MX: 'المكسيك', AR: 'الأرجنتين',
  NG: 'نيجيريا', KE: 'كينيا', ZA: 'جنوب أفريقيا', GH: 'غانا', TZ: 'تنزانيا',
  CN: 'الصين', JP: 'اليابان', KR: 'كوريا الجنوبية', TH: 'تايلاند', PH: 'الفلبين',
};

const getCountryDisplay = (code: string): string => {
  if (!code) return '-';
  return COUNTRY_NAMES[code.toUpperCase()] || code;
};

// Helper function to format Firestore Timestamp or string dates
const formatDate = (date: unknown): string => {
  if (!date) return '-';
  
  // If it's a Firestore Timestamp
  if (date && typeof date === 'object' && 'toDate' in date && typeof (date as Timestamp).toDate === 'function') {
    try {
      return (date as Timestamp).toDate().toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  }
  
  // If it's an object with seconds/nanoseconds (raw Timestamp shape)
  if (date && typeof date === 'object' && 'seconds' in date) {
    try {
      const timestamp = date as { seconds: number; nanoseconds: number };
      return new Date(timestamp.seconds * 1000).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  }
  
  // If it's already a string
  if (typeof date === 'string') return date;
  
  // If it's a Date object
  if (date instanceof Date) return date.toLocaleDateString('ar-EG');
  
  return '-';
};

interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  country: string;
  countrySource?: 'gps' | 'device_locale' | 'admin' | '';
  countryName?: string;
  locationCity?: string;
  locationLatitude?: number;
  locationLongitude?: number;
  locationUpdatedAt?: unknown;
  plan: UserPlan;
  planSource?: 'purchase' | 'admin' | 'manual' | 'none';
  status: 'active' | 'inactive' | 'banned';
  adsEnabled: boolean;
  fcmToken?: string;
  registrationDate: unknown;
  lastActive: unknown;
  totalSpent: number;
  currency: string;
}

interface PurchasePlanInfo {
  plan: UserPlan;
  source: User['planSource'];
}

const normalizePlan = (value: unknown): UserPlan | null => {
  if (value === 'monthly' || value === 'yearly' || value === 'lifetime') return value;
  return null;
};

const isFutureOrLifetime = (plan: UserPlan, expiresAt: unknown): boolean => {
  if (plan === 'lifetime') return true;
  const expiryMs = toMillis(expiresAt as TimestampLike);
  return expiryMs > Date.now();
};

const getUserPlanFromDoc = (data: Record<string, unknown>): PurchasePlanInfo => {
  const adminPremium = data.adminPremium as { granted?: boolean; plan?: string; expiresAt?: unknown } | undefined;
  const adminPlan = normalizePlan(adminPremium?.plan);
  if (adminPremium?.granted && adminPlan && isFutureOrLifetime(adminPlan, adminPremium.expiresAt)) {
    return { plan: adminPlan, source: 'admin' };
  }

  const manualPlan = normalizePlan(data.plan);
  if (manualPlan) return { plan: manualPlan, source: 'manual' };

  return { plan: 'free', source: 'none' };
};

const getLatestPurchasePlan = async (userId: string): Promise<PurchasePlanInfo | null> => {
  try {
    const purchasesSnap = await getDocs(collection(db, 'users', userId, 'purchases'));
    let bestPlan: UserPlan | null = null;
    let bestPurchasedAtMs = -1;

    purchasesSnap.forEach((purchaseDoc) => {
      const data = purchaseDoc.data();
      const plan = normalizePlan(data.plan);
      if (!plan || !isFutureOrLifetime(plan, data.expiresAt)) return;
      const purchasedAtMs = toMillis(data.purchasedAt as TimestampLike) || toMillis(data.createdAt as TimestampLike);
      if (purchasedAtMs > bestPurchasedAtMs) {
        bestPlan = plan;
        bestPurchasedAtMs = purchasedAtMs;
      }
    });

    return bestPlan ? { plan: bestPlan, source: 'purchase' } : null;
  } catch {
    return null;
  }
};

const EMPTY_DEVICE_STATS: ActiveDeviceStats = {
  total: 0,
  withTokens: 0,
  firestoreUsers: 0,
  storeRegistered: 0,
  storeActive: 0,
  storeDaily: 0,
  namedUsers: 0,
  unnamedUsers: 0,
  withoutTokens: 0,
  storeIos: 0,
  storeAndroid: 0,
  ios: 0,
  android: 0,
  active: 0,
  daily: 0,
  byLanguage: {},
  byCountry: {},
  storeByLanguage: {},
  storeByCountry: {},
  retentionRate: 0,
  monthlyAzkar: 0,
  monthlyQuran: 0,
  monthlyPrayers: 0,
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [deviceStats, setDeviceStats] = useState<ActiveDeviceStats>(EMPTY_DEVICE_STATS);
  const [deviceGroupMap, setDeviceGroupMap] = useState<Map<string, string[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // SSOT: user counters match Dashboard/Analytics/Notifications.
      const { storeUsers, stats, groupMap } = await fetchActiveDevices(true);
      setDeviceStats(stats);
      setDeviceGroupMap(groupMap);

      const rawUsers: User[] = await Promise.all(storeUsers
        .map(async u => {
          const basePlan = getUserPlanFromDoc(u as Record<string, unknown>);
          const purchasePlan = basePlan.source === 'none' || basePlan.source === 'manual'
            ? await getLatestPurchasePlan(u.id)
            : null;
          const resolvedPlan = purchasePlan || basePlan;

          return ({
          ...u,
          id: u.id,
          name: (u.displayName || u.name || '') as string,
          plan: resolvedPlan.plan,
          planSource: resolvedPlan.source,
          adsEnabled: (u as Partial<User>).adsEnabled ?? false,
          totalSpent: (u as Partial<User>).totalSpent ?? 0,
          currency: (u as Partial<User>).currency ?? 'USD',
          } as unknown as User);
        }));

      // Sort by registration date (oldest first) and assign display number
      rawUsers.sort((a, b) => toMillis(a.registrationDate as TimestampLike) - toMillis(b.registrationDate as TimestampLike));
      rawUsers.forEach((u, i) => { (u as User & { displayNumber?: number }).displayNumber = i + 1; });
      setUsers(rawUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = !q
      || (user.name || '').toLowerCase().includes(q)
      || (user.email || '').toLowerCase().includes(q)
      || (user.phone || '').toLowerCase().includes(q)
      || user.id.toLowerCase().includes(q);
    // Treat missing/empty plan as 'free' (matches stats logic + reality:
    // most app users never wrote a plan field, they're free by default).
    const userPlan = user.plan || 'free';
    const matchesPlan = filterPlan === 'all' || userPlan === filterPlan;
    // Same for status — missing status counts as 'active' since the app
    // doesn't write a status field for new users.
    const userStatus = user.status || 'active';
    const matchesStatus = filterStatus === 'all' || userStatus === filterStatus;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const stats = {
    total: deviceStats.storeRegistered,
    active: deviceStats.storeActive,
    daily: deviceStats.storeDaily,
    named: deviceStats.namedUsers,
    unnamed: deviceStats.unnamedUsers,
    withTokens: deviceStats.withTokens,
    withoutTokens: deviceStats.withoutTokens,
  };
  const planCounts = {
    free: users.filter(u => (u.plan || 'free') === 'free').length,
    monthly: users.filter(u => u.plan === 'monthly').length,
    yearly: users.filter(u => u.plan === 'yearly').length,
    lifetime: users.filter(u => u.plan === 'lifetime').length,
  };
  const statusCounts = {
    active: users.filter(u => (u.status || 'active') === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
    banned: users.filter(u => u.status === 'banned').length,
  };

  const handleEditUser = (user: User) => {
    setSelectedUser({ ...user });
    setShowModal(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const { id, ...data } = selectedUser;
      const originalUser = users.find(u => u.id === id);
      const countryChanged = originalUser && originalUser.country !== data.country;
      const { planSource: _planSource, displayNumber: _displayNumber, ...persistableData } = data as typeof data & {
        planSource?: User['planSource'];
        displayNumber?: number;
      };
      await setDoc(doc(db, 'users', id), { ...persistableData, displayName: data.name, ...(countryChanged ? { countrySource: 'admin' } : {}) }, { merge: true });
      setUsers(users.map(u => u.id === selectedUser.id
        ? { ...selectedUser, ...(countryChanged ? { countrySource: 'admin' as const } : {}) }
        : u
      ));
      setShowModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = (userId: string) => {
    setUserToDelete(userId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      // Delete all docs in the same device group (not just the visible one)
      const groupIds = deviceGroupMap.get(userToDelete) || [userToDelete];
      await Promise.all(groupIds.map(id => deleteDoc(doc(db, 'users', id))));
      invalidateActiveDevicesCache();
      setUsers(users.filter(u => u.id !== userToDelete));
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  const handleDeleteAllUsers = async () => {
    setDeletingAll(true);
    try {
      // Delete in batches of 500 (Firestore limit)
      const batchSize = 500;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = users.slice(i, i + batchSize);
        chunk.forEach(user => {
          batch.delete(doc(db, 'users', user.id));
        });
        await batch.commit();
      }
      invalidateActiveDevicesCache();
      setUsers([]);
      setShowDeleteAllConfirm(false);
      setDeleteAllConfirmText('');
    } catch (error) {
      console.error('Error deleting all users:', error);
      alert('حدث خطأ أثناء الحذف');
    } finally {
      setDeletingAll(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      active: 'bg-green-500/20 text-green-400',
      inactive: 'bg-yellow-500/20 text-yellow-400',
      banned: 'bg-red-500/20 text-red-400',
    };
    const labels: Record<string, string> = { active: 'نشط', inactive: 'غير نشط', banned: 'محظور' };
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${badges[status] || badges.active}`}>{labels[status] || 'نشط'}</span>;
  };

  const getPlanBadge = (user: User) => {
    const labels: Record<UserPlan, string> = {
      free: 'مجاني',
      monthly: 'شهري',
      yearly: 'سنوي',
      lifetime: 'Lifetime',
    };
    const classes: Record<UserPlan, string> = {
      free: 'bg-slate-500/15 text-slate-300 border-slate-500/20',
      monthly: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
      yearly: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
      lifetime: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    };
    const sourceLabels: Record<NonNullable<User['planSource']>, string> = {
      purchase: 'شراء',
      admin: 'منحة',
      manual: 'يدوي',
      none: '',
    };
    const plan = user.plan || 'free';
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs border ${classes[plan]}`}>
        {labels[plan]}
        {user.planSource && user.planSource !== 'none' && (
          <span className="opacity-70">({sourceLabels[user.planSource]})</span>
        )}
      </span>
    );
  };

  const getCountrySourceLabel = (user: User): { label: string; className: string; title: string } => {
    const gpsVerified = user.countrySource === 'gps' && Boolean(user.locationUpdatedAt || user.locationLatitude);
    if (gpsVerified) {
      return {
        label: 'GPS مؤكد',
        className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
        title: 'تم تحديد الدولة من موقع الصلاة/GPS الحقيقي',
      };
    }
    if (user.countrySource === 'gps') {
      return {
        label: 'GPS قديم',
        className: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
        title: 'تم تحديدها بإصدار قديم بدون بيانات تحقق كافية، وستتحدث عند فتح الموقع مرة أخرى',
      };
    }
    if (user.countrySource === 'admin') {
      return {
        label: 'تعديل يدوي',
        className: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
        title: 'تم تعديل الدولة يدوياً من لوحة التحكم',
      };
    }
    if (user.country) {
      return {
        label: 'غير مؤكد',
        className: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
        title: 'مصدر الدولة هو إقليم/لغة الجهاز وليس GPS',
      };
    }
    return {
      label: 'غير محدد',
      className: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
      title: 'لم يتم تحديد دولة بعد',
    };
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full" /></div>;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">إدارة المستخدمين</h1>
        <div className="flex gap-3">
          {users.length > 0 && (
            <button 
              onClick={() => setShowDeleteAllConfirm(true)} 
              aria-label="حذف جميع المستخدمين" 
              title="حذف الكل" 
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              حذف الكل ({users.length})
            </button>
          )}
          <button onClick={loadUsers} aria-label="تحديث قائمة المستخدمين" title="تحديث" className="bg-accent-dark text-white px-4 py-2 rounded-lg hover:bg-accent-dark">تحديث</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <div className="bg-admin-surface rounded-xl p-4 border border-admin-border text-center">
          <p className="text-slate-400 text-sm">مسجلون من المتاجر</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-admin-surface rounded-xl p-4 border border-admin-border text-center">
          <p className="text-slate-400 text-sm">نشطون 7 أيام</p>
          <p className="text-2xl font-bold text-green-400">{stats.active}</p>
        </div>
        <div className="bg-admin-surface rounded-xl p-4 border border-admin-border text-center">
          <p className="text-slate-400 text-sm">اليوم</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.daily}</p>
        </div>
        <div className="bg-admin-surface rounded-xl p-4 border border-admin-border text-center">
          <p className="text-slate-400 text-sm">قابلون للإشعارات</p>
          <p className="text-2xl font-bold text-cyan-400">{stats.withTokens}</p>
        </div>
        <div className="bg-admin-surface rounded-xl p-4 border border-admin-border text-center">
          <p className="text-slate-400 text-sm">بدون توكن</p>
          <p className="text-2xl font-bold text-slate-300">{stats.withoutTokens}</p>
        </div>
        <div className="bg-admin-surface rounded-xl p-4 border border-admin-border text-center">
          <p className="text-slate-400 text-sm">لديهم اسم</p>
          <p className="text-2xl font-bold text-purple-400">{stats.named}</p>
        </div>
        <div className="bg-admin-surface rounded-xl p-4 border border-admin-border text-center">
          <p className="text-slate-400 text-sm">بدون اسم</p>
          <p className="text-2xl font-bold text-amber-400">{stats.unnamed}</p>
        </div>
      </div>

      <div className="bg-admin-surface rounded-xl p-6 border border-admin-border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="text" placeholder="بحث بالاسم أو الإيميل أو الهاتف..."
            aria-label="بحث المستخدمين"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 bg-admin-surface-light border border-admin-border rounded-lg focus:ring-2 focus:ring-accent outline-none text-white placeholder-slate-400" />
          <select title="فلتر الباقة" aria-label="فلتر الباقة" value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
            className="px-4 py-3 bg-admin-surface-light border border-admin-border rounded-lg focus:ring-2 focus:ring-accent outline-none text-white">
            <option value="all">كل الباقات</option>
            <option value="free">مجاني ({planCounts.free})</option>
            <option value="monthly">شهري ({planCounts.monthly})</option>
            <option value="yearly">سنوي ({planCounts.yearly})</option>
            <option value="lifetime">Lifetime ({planCounts.lifetime})</option>
          </select>
          <select title="فلتر الحالة" aria-label="فلتر الحالة" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-3 bg-admin-surface-light border border-admin-border rounded-lg focus:ring-2 focus:ring-accent outline-none text-white">
            <option value="all">كل الحالات</option>
            <option value="active">نشط ({statusCounts.active})</option>
            <option value="inactive">غير نشط ({statusCounts.inactive})</option>
            <option value="banned">محظور ({statusCounts.banned})</option>
          </select>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="bg-admin-surface rounded-xl border border-admin-border p-12 text-center">
          <p className="text-slate-300 text-lg">لا يوجد مستخدمين مسجلين بعد</p>
          <p className="text-slate-500 text-sm mt-2">سيظهر المستخدمون هنا عند تسجيلهم في التطبيق</p>
        </div>
      ) : (
        <div className="bg-admin-surface rounded-xl border border-admin-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-admin-surface-light/50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">المستخدم</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">الدولة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">الباقة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">الحالة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">آخر نشاط</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-admin-surface-light/30">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{user.name || 'بدون اسم'}</p>
                      {!user.name && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/20">
                          غير ظاهر في الاسم
                        </span>
                      )}
                      {!user.fcmToken?.startsWith('ExponentPushToken') && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-300 border border-slate-500/20">
                          بدون توكن
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-mono text-accent-light">user_{(user as User & { displayNumber?: number }).displayNumber}</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(user.id); alert('تم نسخ المعرّف'); }}
                        title={user.id}
                        className="text-xs text-slate-500 hover:text-accent-light font-mono truncate max-w-[140px]"
                      >
                        {user.id.slice(0, 16)}... 📋
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-300">
                    {(() => {
                      const source = getCountrySourceLabel(user);
                      const gpsVerified = user.countrySource === 'gps' && Boolean(user.locationUpdatedAt || user.locationLatitude);
                      return (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span>{getCountryDisplay(user.country)}</span>
                            <span title={source.title} className={`text-[11px] px-2 py-0.5 rounded-full border ${source.className}`}>
                              {source.label}
                            </span>
                          </div>
                          {gpsVerified && user.locationCity && (
                            <div className="text-xs text-slate-500">
                              {user.locationCity}{user.countryName ? `، ${user.countryName}` : ''}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-4">{getPlanBadge(user)}</td>
                  <td className="px-4 py-4">{getStatusBadge(user.status || 'active')}</td>
                  <td className="px-4 py-4 text-sm text-slate-400">{formatDate(user.lastActive)}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleEditUser(user)} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg">تعديل</button>
                      <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && users.length > 0 && (
            <div className="text-center py-12 text-slate-500">لا يوجد مستخدمين مطابقين للبحث</div>
          )}
        </div>
      )}

      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-admin-surface rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-admin-border">
            <div className="p-6 border-b border-admin-border flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">تعديل بيانات المستخدم</h2>
              <button onClick={() => setShowModal(false)} aria-label="إغلاق" title="إغلاق" className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">الاسم</label>
                  <input type="text" value={selectedUser.name || ''}
                    onChange={e => setSelectedUser({ ...selectedUser, name: e.target.value })}
                    aria-label="الاسم" placeholder="اسم المستخدم"
                    className="w-full px-4 py-3 bg-admin-surface-light border border-admin-border rounded-lg text-white placeholder-slate-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">البريد الإلكتروني</label>
                  <input type="email" value={selectedUser.email || ''}
                    onChange={e => setSelectedUser({ ...selectedUser, email: e.target.value })}
                    aria-label="البريد الإلكتروني" placeholder="البريد الإلكتروني"
                    className="w-full px-4 py-3 bg-admin-surface-light border border-admin-border rounded-lg text-white placeholder-slate-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">الهاتف</label>
                  <input type="tel" value={selectedUser.phone || ''}
                    onChange={e => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                    aria-label="الهاتف" placeholder="رقم الهاتف"
                    className="w-full px-4 py-3 bg-admin-surface-light border border-admin-border rounded-lg text-white placeholder-slate-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">الدولة</label>
                  <select value={selectedUser.country || ''}
                    onChange={e => setSelectedUser({ ...selectedUser, country: e.target.value })}
                    aria-label="الدولة"
                    className="w-full px-4 py-3 bg-admin-surface-light border border-admin-border rounded-lg text-white">
                    <option value="">غير محدد</option>
                    {Object.entries(COUNTRY_NAMES).map(([code, name]) => (
                      <option key={code} value={code}>{name} ({code})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">الباقة</label>
                  <select value={selectedUser.plan || 'free'}
                    onChange={e => setSelectedUser({ ...selectedUser, plan: e.target.value as User['plan'], planSource: 'manual' })}
                    aria-label="الباقة"
                    className="w-full px-4 py-3 bg-admin-surface-light border border-admin-border rounded-lg text-white">
                    <option value="free">مجاني</option>
                    <option value="monthly">شهري</option>
                    <option value="yearly">سنوي</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">الحالة</label>
                  <select value={selectedUser.status || 'active'}
                    onChange={e => setSelectedUser({ ...selectedUser, status: e.target.value as User['status'] })}
                    aria-label="الحالة"
                    className="w-full px-4 py-3 bg-admin-surface-light border border-admin-border rounded-lg text-white">
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                    <option value="banned">محظور</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-admin-surface-light/50 rounded-lg">
                <span className="font-medium text-slate-300">الإعلانات</span>
                <button onClick={() => setSelectedUser({ ...selectedUser, adsEnabled: !selectedUser.adsEnabled })}
                  aria-label="تبديل حالة الإعلانات" title="تبديل حالة الإعلانات"
                  className={`px-4 py-2 rounded-lg ${selectedUser.adsEnabled ? 'bg-yellow-500/20 text-yellow-400' : 'bg-admin-surface-light text-slate-400'}`}>
                  {selectedUser.adsEnabled ? 'مفعّلة' : 'معطّلة'}
                </button>
              </div>
            </div>
            <div className="p-6 border-t border-admin-border flex gap-3">
              <button onClick={handleSaveUser} disabled={saving}
                className="flex-1 bg-accent-dark text-white py-3 rounded-lg font-medium hover:bg-accent-dark disabled:opacity-50">
                {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
              </button>
              <button onClick={() => setShowModal(false)} className="px-6 py-3 border border-admin-border text-slate-300 rounded-lg hover:bg-admin-surface-light">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-admin-surface rounded-2xl p-6 w-full max-w-md border border-admin-border">
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-2">تأكيد الحذف</h3>
              <p className="text-slate-400 mb-6">هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.</p>
              <div className="flex gap-3">
                <button onClick={confirmDelete} className="flex-1 bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700">نعم، احذف</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 border border-admin-border text-slate-300 py-3 rounded-lg hover:bg-admin-surface-light">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-admin-surface rounded-2xl p-6 w-full max-w-md border border-red-500/50">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">تحذير! حذف جميع المستخدمين</h3>
              <p className="text-slate-400 mb-2">سيتم حذف <span className="text-red-400 font-bold">{users.length}</span> مستخدم بشكل نهائي.</p>
              <p className="text-red-400 text-sm mb-3">هذا الإجراء لا يمكن التراجع عنه!</p>
              <div className="mb-4 text-right">
                <label className="block text-xs text-slate-400 mb-1">
                  للتأكيد، اكتب: <span className="font-mono text-red-300">حذف الكل</span>
                </label>
                <input
                  type="text"
                  value={deleteAllConfirmText}
                  onChange={e => setDeleteAllConfirmText(e.target.value)}
                  placeholder="حذف الكل"
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-border rounded-lg text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
                  dir="rtl"
                  aria-label="تأكيد الحذف"
                />
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleDeleteAllUsers} 
                  disabled={deletingAll || deleteAllConfirmText.trim() !== 'حذف الكل'}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingAll ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      جارٍ الحذف...
                    </span>
                  ) : 'نعم، احذف الكل'}
                </button>
                <button 
                  onClick={() => { setShowDeleteAllConfirm(false); setDeleteAllConfirmText(''); }} 
                  disabled={deletingAll}
                  className="flex-1 border border-admin-border text-slate-300 py-3 rounded-lg hover:bg-admin-surface-light disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
