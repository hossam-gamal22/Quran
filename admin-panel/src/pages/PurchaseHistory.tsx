import { useState, useEffect, useMemo } from 'react';
import { collection, collectionGroup, getDocs, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import {
  CreditCard,
  Search,
  Download,
  RefreshCw,
  Smartphone,
  Apple,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  Package,
  Filter,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

// ==================== Types ====================

interface PurchaseRecord {
  id: string;
  userId: string;
  userName: string;
  productId: string;
  plan: string;
  orderId: string | null;
  transactionId: string | null;
  purchaseToken: string | null;
  platform: 'android' | 'ios' | string;
  store: string;
  purchasedAt: Date | null;
  expiresAt: string | null;
  userInstallSource: string;
  userCountry: string;
  userLanguage: string;
  userLastActive: Date | null;
  hasName: boolean;
  hasPushToken: boolean;
  isStoreUser: boolean;
  isPlaceholder: boolean;
  linkWarnings: string[];
}

type SortField = 'purchasedAt' | 'userName' | 'plan' | 'platform';
type SortDirection = 'asc' | 'desc';

// ==================== Helpers ====================

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Timestamp) return val.toDate();
  if (typeof (val as any)?.toDate === 'function') return (val as any).toDate();
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function planLabel(plan: string): string {
  switch (plan) {
    case 'monthly': return 'شهري';
    case 'yearly': return 'سنوي';
    case 'lifetime': return 'مدى الحياة';
    default: return plan || '—';
  }
}

function planColor(plan: string): string {
  switch (plan) {
    case 'monthly': return 'bg-blue-500/20 text-blue-400';
    case 'yearly': return 'bg-emerald-500/20 text-emerald-400';
    case 'lifetime': return 'bg-amber-500/20 text-amber-400';
    default: return 'bg-slate-500/20 text-slate-400';
  }
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false; // lifetime or no expiry
  return new Date(expiresAt) < new Date();
}

function maskSensitive(value: string | null): string {
  if (!value) return '—';
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}

function isStoreSource(source: string): boolean {
  return source === 'play_store' || source === 'app_store';
}

type UserDocData = Record<string, any>;
type PurchaseDocEntry = {
  id: string;
  userId: string;
  data: Record<string, any>;
};

function buildPurchaseRecords(
  usersById: Record<string, UserDocData>,
  purchaseDocs: PurchaseDocEntry[]
): PurchaseRecord[] {
  const allPurchases: PurchaseRecord[] = [];

  purchaseDocs.forEach((purchaseDoc) => {
    const userData = usersById[purchaseDoc.userId] || {};
    const data = purchaseDoc.data;
    const userName = (userData.displayName || userData.name || '') as string;
    const userInstallSource = (userData.installSource || '') as string;
    const hasPushToken =
      typeof userData.fcmToken === 'string' &&
      userData.fcmToken.startsWith('ExponentPushToken');
    const nameFromPurchase = (data.userDisplayName || '') as string;
    const displayName = nameFromPurchase || userName;
    const platform = data.platform || data.userPlatform || userData.platform || 'unknown';
    const orderId = data.orderId || data.transactionId || data.purchaseId || null;
    const purchaseToken = data.purchaseToken || data.purchaseTokenAndroid || null;
    const installSource = data.userInstallSource || userInstallSource;
    const warnings: string[] = [];
    if (userData.placeholder) warnings.push('مستخدم placeholder');
    if (!displayName) warnings.push('بدون اسم');
    if (!isStoreSource(installSource)) warnings.push('مصدره ليس متجر رسمي');
    if (!hasPushToken) warnings.push('بدون push token');
    if (!orderId && !purchaseToken) warnings.push('لا يوجد رقم طلب أو purchase token');

    allPurchases.push({
      id: `${purchaseDoc.userId}_${purchaseDoc.id}`,
      userId: purchaseDoc.userId,
      userName: displayName || purchaseDoc.userId.slice(0, 8),
      productId: data.productId || '',
      plan: data.plan || '',
      orderId,
      transactionId: data.transactionId || null,
      purchaseToken,
      platform,
      store: data.store || (platform === 'ios' ? 'app_store' : platform === 'android' ? 'play_store' : 'unknown'),
      purchasedAt: toDate(data.purchasedAt) || toDate(data.transactionDate),
      expiresAt: data.expiresAt || null,
      userInstallSource: installSource || '',
      userCountry: data.userCountry || userData.country || '',
      userLanguage: data.userLanguage || userData.language || '',
      userLastActive: toDate(userData.lastActive),
      hasName: !!displayName,
      hasPushToken,
      isStoreUser: isStoreSource(installSource),
      isPlaceholder: !!userData.placeholder,
      linkWarnings: warnings,
    });
  });

  allPurchases.sort((a, b) => {
    const aTime = a.purchasedAt?.getTime() ?? 0;
    const bTime = b.purchasedAt?.getTime() ?? 0;
    return bTime - aTime;
  });

  return allPurchases;
}

// ==================== Component ====================

export default function PurchaseHistory() {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortField, setSortField] = useState<SortField>('purchasedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // ==================== Data Loading ====================

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const [usersSnap, purchasesSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collectionGroup(db, 'purchases')),
      ]);
      const usersById: Record<string, UserDocData> = {};
      usersSnap.forEach((userDoc) => {
        usersById[userDoc.id] = userDoc.data();
      });
      const purchaseDocs: PurchaseDocEntry[] = purchasesSnap.docs.map((purchaseDoc) => ({
        id: purchaseDoc.id,
        userId: purchaseDoc.ref.parent.parent?.id || '',
        data: purchaseDoc.data(),
      })).filter((purchaseDoc) => !!purchaseDoc.userId);

      setPurchases(buildPurchaseRecords(usersById, purchaseDocs));
    } catch (error) {
      console.error('Error loading purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    let usersReady = false;
    let purchasesReady = false;
    let liveUsersById: Record<string, UserDocData> = {};
    let livePurchaseDocs: PurchaseDocEntry[] = [];

    const applyLiveData = () => {
      if (!usersReady || !purchasesReady) return;
      setPurchases(buildPurchaseRecords(liveUsersById, livePurchaseDocs));
      setLoading(false);
    };

    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      (usersSnap) => {
        const nextUsers: Record<string, UserDocData> = {};
        usersSnap.forEach((userDoc) => {
          nextUsers[userDoc.id] = userDoc.data();
        });
        liveUsersById = nextUsers;
        usersReady = true;
        applyLiveData();
      },
      (error) => {
        console.error('Error listening to purchase users:', error);
        loadPurchases();
      }
    );

    const unsubscribePurchases = onSnapshot(
      collectionGroup(db, 'purchases'),
      (purchasesSnap) => {
        livePurchaseDocs = purchasesSnap.docs.map((purchaseDoc) => ({
          id: purchaseDoc.id,
          userId: purchaseDoc.ref.parent.parent?.id || '',
          data: purchaseDoc.data(),
        })).filter((purchaseDoc) => !!purchaseDoc.userId);
        purchasesReady = true;
        applyLiveData();
      },
      (error) => {
        console.error('Error listening to purchases:', error);
        loadPurchases();
      }
    );

    return () => {
      unsubscribeUsers();
      unsubscribePurchases();
    };
  }, []);

  // ==================== Filtering & Sorting ====================

  const filtered = useMemo(() => {
    const result = purchases.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.orderId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.transactionId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.purchaseToken || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.userCountry || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.productId || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPlan = filterPlan === 'all' || p.plan === filterPlan;
      const matchesPlatform = filterPlatform === 'all' || p.platform === filterPlatform;

      let matchesStatus = true;
      if (filterStatus === 'active') matchesStatus = !isExpired(p.expiresAt);
      if (filterStatus === 'expired') matchesStatus = isExpired(p.expiresAt);

      return matchesSearch && matchesPlan && matchesPlatform && matchesStatus;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'purchasedAt':
          cmp = (a.purchasedAt?.getTime() ?? 0) - (b.purchasedAt?.getTime() ?? 0);
          break;
        case 'userName':
          cmp = a.userName.localeCompare(b.userName, 'ar');
          break;
        case 'plan':
          cmp = a.plan.localeCompare(b.plan);
          break;
        case 'platform':
          cmp = a.platform.localeCompare(b.platform);
          break;
      }
      return sortDirection === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [purchases, searchTerm, filterPlan, filterPlatform, filterStatus, sortField, sortDirection]);

  // ==================== Stats ====================

  const stats = useMemo(() => {
    const total = purchases.length;
    const monthly = purchases.filter((p) => p.plan === 'monthly').length;
    const yearly = purchases.filter((p) => p.plan === 'yearly').length;
    const lifetime = purchases.filter((p) => p.plan === 'lifetime').length;
    const android = purchases.filter((p) => p.platform === 'android').length;
    const ios = purchases.filter((p) => p.platform === 'ios').length;
    const active = purchases.filter((p) => !isExpired(p.expiresAt)).length;
    const expired = purchases.filter((p) => isExpired(p.expiresAt)).length;
    const identified = purchases.filter((p) => p.hasName && p.isStoreUser).length;
    const needsReview = purchases.filter((p) => p.linkWarnings.length > 0).length;
    const searchable = purchases.filter((p) => p.orderId || p.purchaseToken).length;
    const withoutName = purchases.filter((p) => !p.hasName).length;
    return { total, monthly, yearly, lifetime, android, ios, active, expired, identified, needsReview, searchable, withoutName };
  }, [purchases]);

  // ==================== Export ====================

  const handleExportCSV = () => {
    if (filtered.length === 0) return;

    const headers = ['المستخدم', 'معرّف المستخدم', 'الخطة', 'المنصة', 'رقم الطلب', 'معرّف المعاملة', 'توكن الشراء', 'الدولة', 'مصدر التثبيت', 'تاريخ الشراء', 'تاريخ الانتهاء', 'الحالة', 'ملاحظات الربط'];
    const rows = filtered.map((p) => [
      p.userName,
      p.userId,
      planLabel(p.plan),
      p.platform,
      p.orderId || '—',
      p.transactionId || '—',
      maskSensitive(p.purchaseToken),
      p.userCountry || '—',
      p.userInstallSource || '—',
      p.purchasedAt ? p.purchasedAt.toISOString() : '—',
      p.expiresAt || 'مدى الحياة',
      isExpired(p.expiresAt) ? 'منتهي' : 'نشط',
      p.linkWarnings.join(' | ') || 'مرتبط',
    ]);

    const bom = '\uFEFF';
    const csv = bom + [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchase_history_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ==================== Sort Toggle ====================

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'desc' ? (
      <ChevronDown className="w-3 h-3 inline mr-1" />
    ) : (
      <ChevronUp className="w-3 h-3 inline mr-1" />
    );
  };

  // ==================== Render ====================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="w-7 h-7 text-accent" />
          <h1 className="text-2xl font-bold text-white">سجل المشتريات</h1>
          <span className="text-sm text-admin-muted">({purchases.length} عملية)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-admin-surface border border-admin-border rounded-xl text-sm text-slate-300 hover:bg-admin-surface-light transition-colors disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            تصدير CSV
          </button>
          <button
            onClick={loadPurchases}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="إجمالي المشتريات" value={stats.total} icon={<Package className="w-5 h-5" />} color="text-white" />
        <StatCard label="شهري" value={stats.monthly} icon={<Calendar className="w-5 h-5" />} color="text-blue-400" />
        <StatCard label="سنوي" value={stats.yearly} icon={<Calendar className="w-5 h-5" />} color="text-emerald-400" />
        <StatCard label="مدى الحياة" value={stats.lifetime} icon={<CreditCard className="w-5 h-5" />} color="text-amber-400" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Android" value={stats.android} icon={<Smartphone className="w-5 h-5" />} color="text-green-400" />
        <StatCard label="iOS" value={stats.ios} icon={<Apple className="w-5 h-5" />} color="text-slate-300" />
        <StatCard label="نشط" value={stats.active} icon={<CreditCard className="w-5 h-5" />} color="text-emerald-400" />
        <StatCard label="منتهي" value={stats.expired} icon={<CreditCard className="w-5 h-5" />} color="text-red-400" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="مرتبط بمستخدم واضح" value={stats.identified} icon={<CheckCircle className="w-5 h-5" />} color="text-emerald-400" />
        <StatCard label="يحتاج مراجعة" value={stats.needsReview} icon={<AlertTriangle className="w-5 h-5" />} color="text-amber-400" />
        <StatCard label="قابل للبحث برقم طلب/توكن" value={stats.searchable} icon={<Search className="w-5 h-5" />} color="text-blue-400" />
        <StatCard label="بدون اسم" value={stats.withoutName} icon={<User className="w-5 h-5" />} color="text-orange-400" />
      </div>

      {/* Filters */}
      <div className="bg-admin-surface rounded-2xl p-4 border border-admin-border">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
            <input
              type="text"
              placeholder="بحث بالاسم، userId، رقم الطلب، رقم المعاملة، أو purchase token..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 bg-admin-bg border border-admin-border rounded-xl text-white text-sm placeholder-admin-muted focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-admin-muted" />

            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              aria-label="تصفية حسب الخطة"
              className="px-3 py-2.5 bg-admin-bg border border-admin-border rounded-xl text-white text-sm focus:outline-none focus:border-accent"
            >
              <option value="all">كل الخطط</option>
              <option value="monthly">شهري</option>
              <option value="yearly">سنوي</option>
              <option value="lifetime">مدى الحياة</option>
            </select>

            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              aria-label="تصفية حسب المنصة"
              className="px-3 py-2.5 bg-admin-bg border border-admin-border rounded-xl text-white text-sm focus:outline-none focus:border-accent"
            >
              <option value="all">كل المنصات</option>
              <option value="android">Android</option>
              <option value="ios">iOS</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              aria-label="تصفية حسب الحالة"
              className="px-3 py-2.5 bg-admin-bg border border-admin-border rounded-xl text-white text-sm focus:outline-none focus:border-accent"
            >
              <option value="all">كل الحالات</option>
              <option value="active">نشط</option>
              <option value="expired">منتهي</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-admin-surface rounded-2xl border border-admin-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-admin-muted">
            <CreditCard className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-lg">لا توجد مشتريات</p>
            <p className="text-sm mt-1">لم يتم العثور على نتائج مطابقة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-admin-border">
                  <th
                    onClick={() => toggleSort('userName')}
                    className="px-4 py-3 text-right text-xs font-medium text-admin-muted uppercase cursor-pointer hover:text-white transition-colors"
                  >
                    المستخدم <SortIcon field="userName" />
                  </th>
                  <th
                    onClick={() => toggleSort('plan')}
                    className="px-4 py-3 text-right text-xs font-medium text-admin-muted uppercase cursor-pointer hover:text-white transition-colors"
                  >
                    الخطة <SortIcon field="plan" />
                  </th>
                  <th
                    onClick={() => toggleSort('platform')}
                    className="px-4 py-3 text-right text-xs font-medium text-admin-muted uppercase cursor-pointer hover:text-white transition-colors"
                  >
                    المنصة <SortIcon field="platform" />
                  </th>
                  <th
                    onClick={() => toggleSort('purchasedAt')}
                    className="px-4 py-3 text-right text-xs font-medium text-admin-muted uppercase cursor-pointer hover:text-white transition-colors"
                  >
                    تاريخ الشراء <SortIcon field="purchasedAt" />
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-admin-muted uppercase">
                    الربط
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-admin-muted uppercase">
                    الحالة
                  </th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border/50">
                {filtered.map((purchase) => (
                  <PurchaseRow
                    key={purchase.id}
                    purchase={purchase}
                    isExpanded={expandedRow === purchase.id}
                    onToggle={() => setExpandedRow(expandedRow === purchase.id ? null : purchase.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <p className="text-sm text-admin-muted text-center">
          عرض {filtered.length} من {purchases.length} عملية شراء
        </p>
      )}
    </div>
  );
}

// ==================== Sub-Components ====================

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-admin-surface rounded-2xl p-4 border border-admin-border">
      <div className="flex items-center justify-between mb-2">
        <span className={`${color} opacity-60`}>{icon}</span>
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
      </div>
      <p className="text-xs text-admin-muted">{label}</p>
    </div>
  );
}

function PurchaseRow({
  purchase,
  isExpanded,
  onToggle,
}: {
  purchase: PurchaseRecord;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const expired = isExpired(purchase.expiresAt);

  return (
    <>
      <tr
        onClick={onToggle}
        className="hover:bg-admin-surface-light/50 cursor-pointer transition-colors"
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-admin-muted" />
            <div>
              <p className="text-sm text-white font-medium">{purchase.userName}</p>
              <p className="text-xs text-admin-muted font-mono">{purchase.userId.slice(0, 12)}...</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${planColor(purchase.plan)}`}>
            {planLabel(purchase.plan)}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-sm text-slate-300">
            {purchase.platform === 'ios' ? (
              <Apple className="w-4 h-4" />
            ) : (
              <Smartphone className="w-4 h-4 text-green-400" />
            )}
            {purchase.platform === 'ios' ? 'iOS' : 'Android'}
          </div>
        </td>
        <td className="px-4 py-3">
          <p className="text-sm text-slate-300">{formatDate(purchase.purchasedAt)}</p>
        </td>
        <td className="px-4 py-3">
          {purchase.linkWarnings.length === 0 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400">
              <CheckCircle className="w-3 h-3" />
              مرتبط
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              مراجعة
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          {expired ? (
            <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/20 text-red-400">
              منتهي
            </span>
          ) : (
            <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400">
              نشط
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-admin-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-admin-muted" />
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={7} className="px-4 py-3 bg-admin-bg/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <DetailItem label="معرّف المستخدم" value={purchase.userId} mono />
              <DetailItem label="معرّف المنتج" value={purchase.productId || '—'} mono />
              <DetailItem label="رقم الطلب / Order ID" value={purchase.orderId || '—'} mono />
              <DetailItem label="معرّف المعاملة" value={purchase.transactionId || '—'} mono />
              <DetailItem label="Purchase token" value={maskSensitive(purchase.purchaseToken)} mono />
              <DetailItem label="المتجر" value={purchase.store || '—'} />
              <DetailItem label="تاريخ الشراء" value={formatDate(purchase.purchasedAt)} />
              <DetailItem
                label="تاريخ الانتهاء"
                value={purchase.expiresAt ? new Date(purchase.expiresAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : 'مدى الحياة'}
              />
              <DetailItem label="المنصة" value={purchase.platform} />
              <DetailItem label="مصدر التثبيت" value={purchase.userInstallSource || '—'} />
              <DetailItem label="الدولة / اللغة" value={`${purchase.userCountry || '—'} / ${purchase.userLanguage || '—'}`} />
              <DetailItem label="آخر نشاط للمستخدم" value={formatDate(purchase.userLastActive)} />
              <DetailItem label="Push token" value={purchase.hasPushToken ? 'موجود' : 'غير موجود'} />
              <DetailItem label="تشخيص الربط" value={purchase.linkWarnings.join('، ') || 'مرتبط بمستخدم واضح'} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DetailItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-admin-muted mb-1">{label}</p>
      <p className={`text-slate-300 ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</p>
    </div>
  );
}
