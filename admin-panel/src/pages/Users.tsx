import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  country: string;
  plan: 'free' | 'monthly' | 'yearly' | 'lifetime';
  status: 'active' | 'inactive' | 'banned';
  adsEnabled: boolean;
  registrationDate: string;
  lastActive: string;
  totalSpent: number;
  currency: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const loaded: User[] = [];
      snap.forEach(docSnap => {
        loaded.push({ id: docSnap.id, ...docSnap.data() } as User);
      });
      setUsers(loaded);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.name || '').includes(searchTerm) || (user.email || '').includes(searchTerm) || (user.phone || '').includes(searchTerm);
    const matchesPlan = filterPlan === 'all' || user.plan === filterPlan;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
    banned: users.filter(u => u.status === 'banned').length,
    free: users.filter(u => u.plan === 'free' || !u.plan).length,
    premium: users.filter(u => u.plan && u.plan !== 'free').length,
    lifetime: users.filter(u => u.plan === 'lifetime').length,
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
      await setDoc(doc(db, 'users', id), data, { merge: true });
      setUsers(users.map(u => u.id === selectedUser.id ? selectedUser : u));
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
      await deleteDoc(doc(db, 'users', userToDelete));
      setUsers(users.filter(u => u.id !== userToDelete));
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  const getPlanBadge = (plan: string) => {
    const badges: Record<string, string> = {
      free: 'bg-gray-100 text-gray-700',
      monthly: 'bg-blue-100 text-blue-700',
      yearly: 'bg-purple-100 text-purple-700',
      lifetime: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white',
    };
    const labels: Record<string, string> = { free: 'مجاني', monthly: 'شهري', yearly: 'سنوي', lifetime: 'Lifetime' };
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${badges[plan] || badges.free}`}>{labels[plan] || 'مجاني'}</span>;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-yellow-100 text-yellow-700',
      banned: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = { active: 'نشط', inactive: 'غير نشط', banned: 'محظور' };
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${badges[status] || badges.active}`}>{labels[status] || 'نشط'}</span>;
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">إدارة المستخدمين</h1>
        <button onClick={loadUsers} aria-label="تحديث قائمة المستخدمين" title="تحديث" className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">تحديث</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-gray-500 text-sm">الإجمالي</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-gray-500 text-sm">نشط</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-gray-500 text-sm">غير نشط</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.inactive}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-gray-500 text-sm">محظور</p>
          <p className="text-2xl font-bold text-red-600">{stats.banned}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-gray-500 text-sm">مجاني</p>
          <p className="text-2xl font-bold text-gray-600">{stats.free}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-gray-500 text-sm">مدفوع</p>
          <p className="text-2xl font-bold text-purple-600">{stats.premium}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-gray-500 text-sm">Lifetime</p>
          <p className="text-2xl font-bold text-amber-600">{stats.lifetime}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="text" placeholder="بحث بالاسم أو الإيميل أو الهاتف..."
            aria-label="بحث المستخدمين"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
          <select title="فلتر الباقة" aria-label="فلتر الباقة" value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
            <option value="all">كل الباقات</option>
            <option value="free">مجاني</option>
            <option value="monthly">شهري</option>
            <option value="yearly">سنوي</option>
            <option value="lifetime">Lifetime</option>
          </select>
          <select title="فلتر الحالة" aria-label="فلتر الحالة" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="banned">محظور</option>
          </select>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-500 text-lg">لا يوجد مستخدمين مسجلين بعد</p>
          <p className="text-gray-400 text-sm mt-2">سيظهر المستخدمون هنا عند تسجيلهم في التطبيق</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">المستخدم</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الدولة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الباقة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الإعلانات</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">آخر نشاط</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <p className="font-medium text-gray-800">{user.name || '-'}</p>
                    <p className="text-sm text-gray-500">{user.email || '-'}</p>
                    <p className="text-xs text-gray-400">{user.phone || '-'}</p>
                  </td>
                  <td className="px-4 py-4 text-gray-600">{user.country || '-'}</td>
                  <td className="px-4 py-4">{getPlanBadge(user.plan || 'free')}</td>
                  <td className="px-4 py-4">{getStatusBadge(user.status || 'active')}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${user.adsEnabled ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                      {user.adsEnabled ? 'مفعّلة' : 'معطّلة'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">{user.lastActive || '-'}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleEditUser(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">تعديل</button>
                      <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && users.length > 0 && (
            <div className="text-center py-12 text-gray-500">لا يوجد مستخدمين مطابقين للبحث</div>
          )}
        </div>
      )}

      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">تعديل بيانات المستخدم</h2>
              <button onClick={() => setShowModal(false)} aria-label="إغلاق" title="إغلاق" className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الاسم</label>
                  <input type="text" value={selectedUser.name || ''}
                    onChange={e => setSelectedUser({ ...selectedUser, name: e.target.value })}
                    aria-label="الاسم" placeholder="اسم المستخدم"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                  <input type="email" value={selectedUser.email || ''}
                    onChange={e => setSelectedUser({ ...selectedUser, email: e.target.value })}
                    aria-label="البريد الإلكتروني" placeholder="البريد الإلكتروني"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الهاتف</label>
                  <input type="tel" value={selectedUser.phone || ''}
                    onChange={e => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                    aria-label="الهاتف" placeholder="رقم الهاتف"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الدولة</label>
                  <input type="text" value={selectedUser.country || ''}
                    onChange={e => setSelectedUser({ ...selectedUser, country: e.target.value })}
                    aria-label="الدولة" placeholder="الدولة"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الباقة</label>
                  <select value={selectedUser.plan || 'free'}
                    onChange={e => setSelectedUser({ ...selectedUser, plan: e.target.value as User['plan'] })}
                    aria-label="الباقة"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg">
                    <option value="free">مجاني</option>
                    <option value="monthly">شهري</option>
                    <option value="yearly">سنوي</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
                  <select value={selectedUser.status || 'active'}
                    onChange={e => setSelectedUser({ ...selectedUser, status: e.target.value as User['status'] })}
                    aria-label="الحالة"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg">
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                    <option value="banned">محظور</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">الإعلانات</span>
                <button onClick={() => setSelectedUser({ ...selectedUser, adsEnabled: !selectedUser.adsEnabled })}
                  aria-label="تبديل حالة الإعلانات" title="تبديل حالة الإعلانات"
                  className={`px-4 py-2 rounded-lg ${selectedUser.adsEnabled ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-600'}`}>
                  {selectedUser.adsEnabled ? 'مفعّلة' : 'معطّلة'}
                </button>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button onClick={handleSaveUser} disabled={saving}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50">
                {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
              </button>
              <button onClick={() => setShowModal(false)} className="px-6 py-3 border border-gray-200 rounded-lg hover:bg-gray-50">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-2">تأكيد الحذف</h3>
              <p className="text-gray-600 mb-6">هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.</p>
              <div className="flex gap-3">
                <button onClick={confirmDelete} className="flex-1 bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700">نعم، احذف</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 border border-gray-200 py-3 rounded-lg hover:bg-gray-50">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
