import { useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  country: string;
  plan: 'free' | 'monthly' | 'yearly' | 'lifetime';
  status: 'active' | 'inactive' | 'banned' | 'pending';
  adsEnabled: boolean;
  registrationDate: string;
  lastActive: string;
  totalSpent: number;
  currency: string;
  devices: number;
  notifications: boolean;
  language: string;
  theme: 'light' | 'dark' | 'auto';
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      email: 'ahmed@example.com',
      name: 'أحمد محمد',
      phone: '+201234567890',
      country: 'مصر',
      plan: 'yearly',
      status: 'active',
      adsEnabled: false,
      registrationDate: '2024-01-15',
      lastActive: '2024-03-01',
      totalSpent: 399,
      currency: 'EGP',
      devices: 2,
      notifications: true,
      language: 'ar',
      theme: 'dark'
    },
    {
      id: '2',
      email: 'omar@example.com',
      name: 'عمر السعيد',
      phone: '+966512345678',
      country: 'السعودية',
      plan: 'monthly',
      status: 'active',
      adsEnabled: true,
      registrationDate: '2024-02-20',
      lastActive: '2024-02-28',
      totalSpent: 29.97,
      currency: 'SAR',
      devices: 1,
      notifications: true,
      language: 'ar',
      theme: 'light'
    },
    {
      id: '3',
      email: 'sara@example.com',
      name: 'سارة أحمد',
      phone: '+971501234567',
      country: 'الإمارات',
      plan: 'lifetime',
      status: 'active',
      adsEnabled: false,
      registrationDate: '2024-01-10',
      lastActive: '2024-03-01',
      totalSpent: 299,
      currency: 'AED',
      devices: 3,
      notifications: false,
      language: 'ar',
      theme: 'auto'
    },
    {
      id: '4',
      email: 'fatima@example.com',
      name: 'فاطمة علي',
      phone: '+201098765432',
      country: 'مصر',
      plan: 'free',
      status: 'inactive',
      adsEnabled: true,
      registrationDate: '2024-02-01',
      lastActive: '2024-02-10',
      totalSpent: 0,
      currency: 'EGP',
      devices: 1,
      notifications: true,
      language: 'ar',
      theme: 'light'
    },
    {
      id: '5',
      email: 'khalid@example.com',
      name: 'خالد العتيبي',
      phone: '+966598765432',
      country: 'السعودية',
      plan: 'yearly',
      status: 'banned',
      adsEnabled: false,
      registrationDate: '2023-12-01',
      lastActive: '2024-01-15',
      totalSpent: 149.99,
      currency: 'SAR',
      devices: 1,
      notifications: false,
      language: 'ar',
      theme: 'dark'
    }
  ]);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.includes(searchTerm) || 
                         user.email.includes(searchTerm) || 
                         user.phone.includes(searchTerm);
    const matchesPlan = filterPlan === 'all' || user.plan === filterPlan;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    const matchesCountry = filterCountry === 'all' || user.country === filterCountry;
    return matchesSearch && matchesPlan && matchesStatus && matchesCountry;
  });

  const countries = [...new Set(users.map(u => u.country))];

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
    banned: users.filter(u => u.status === 'banned').length,
    free: users.filter(u => u.plan === 'free').length,
    premium: users.filter(u => u.plan !== 'free').length,
    lifetime: users.filter(u => u.plan === 'lifetime').length
  };

  const handleEditUser = (user: User) => {
    setSelectedUser({ ...user });
    setShowModal(true);
  };

  const handleSaveUser = () => {
    if (selectedUser) {
      setUsers(users.map(u => u.id === selectedUser.id ? selectedUser : u));
      setShowModal(false);
      setSelectedUser(null);
      alert('تم حفظ التعديلات بنجاح!');
    }
  };

  const handleDeleteUser = (userId: string) => {
    setUserToDelete(userId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      setUsers(users.filter(u => u.id !== userToDelete));
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      alert('تم حذف المستخدم بنجاح!');
    }
  };

  const handleBulkAction = () => {
    if (selectedUsers.length === 0) {
      alert('اختر مستخدمين أولاً!');
      return;
    }

    switch (bulkAction) {
      case 'ban':
        setUsers(users.map(u => selectedUsers.includes(u.id) ? { ...u, status: 'banned' as const } : u));
        alert(`تم حظر ${selectedUsers.length} مستخدم`);
        break;
      case 'activate':
        setUsers(users.map(u => selectedUsers.includes(u.id) ? { ...u, status: 'active' as const } : u));
        alert(`تم تفعيل ${selectedUsers.length} مستخدم`);
        break;
      case 'enableAds':
        setUsers(users.map(u => selectedUsers.includes(u.id) ? { ...u, adsEnabled: true } : u));
        alert(`تم تفعيل الإعلانات لـ ${selectedUsers.length} مستخدم`);
        break;
      case 'disableAds':
        setUsers(users.map(u => selectedUsers.includes(u.id) ? { ...u, adsEnabled: false } : u));
        alert(`تم تعطيل الإعلانات لـ ${selectedUsers.length} مستخدم`);
        break;
      case 'upgradePremium':
        setUsers(users.map(u => selectedUsers.includes(u.id) ? { ...u, plan: 'yearly' as const, adsEnabled: false } : u));
        alert(`تم ترقية ${selectedUsers.length} مستخدم للباقة السنوية`);
        break;
      case 'delete':
        setUsers(users.filter(u => !selectedUsers.includes(u.id)));
        alert(`تم حذف ${selectedUsers.length} مستخدم`);
        break;
    }
    setSelectedUsers([]);
    setBulkAction('');
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  const getPlanBadge = (plan: string) => {
    const badges: Record<string, string> = {
      free: 'bg-gray-100 text-gray-700',
      monthly: 'bg-blue-100 text-blue-700',
      yearly: 'bg-purple-100 text-purple-700',
      lifetime: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white'
    };
    const labels: Record<string, string> = {
      free: 'مجاني',
      monthly: 'شهري',
      yearly: 'سنوي',
      lifetime: '♾️ Lifetime'
    };
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${badges[plan]}`}>{labels[plan]}</span>;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-yellow-100 text-yellow-700',
      banned: 'bg-red-100 text-red-700',
      pending: 'bg-blue-100 text-blue-700'
    };
    const labels: Record<string, string> = {
      active: 'نشط',
      inactive: 'غير نشط',
      banned: 'محظور',
      pending: 'معلق'
    };
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${badges[status]}`}>{labels[status]}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-emerald-950 text-white min-h-screen fixed right-0">
          <div className="p-6 border-b border-emerald-800">
            <h1 className="text-xl font-bold">🕌 رُوح المسلم</h1>
            <p className="text-emerald-300 text-sm mt-1">لوحة التحكم</p>
          </div>
          <nav className="p-4">
            <ul className="space-y-2">
              <li><a href="/" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">لوحة التحكم</a></li>
              <li><a href="/subscriptions" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">الاشتراكات</a></li>
                            <li><a href="/users" className="block px-4 py-3 bg-emerald-700 rounded-lg">👥 المستخدمين</a></li>
              <li><a href="/ads" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">الإعلانات</a></li>
              <li><a href="/content" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">المحتوى</a></li>
              <li><a href="/notifications" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">الإشعارات</a></li>
              <li><a href="/settings" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">الإعدادات</a></li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 mr-64 p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">👥 إدارة المستخدمين</h1>
            <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
              + إضافة مستخدم
            </button>
          </div>

          {/* Stats */}
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

          {/* Filters & Search */}
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="🔍 بحث بالاسم أو الإيميل أو الهاتف..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <select
                value={filterPlan}
                onChange={e => setFilterPlan(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="all">كل الباقات</option>
                <option value="free">مجاني</option>
                <option value="monthly">شهري</option>
                <option value="yearly">سنوي</option>
                <option value="lifetime">Lifetime</option>
              </select>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="all">كل الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
                <option value="banned">محظور</option>
              </select>
              <select
                value={filterCountry}
                onChange={e => setFilterCountry(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="all">كل الدول</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-center justify-between">
              <span className="text-emerald-800 font-medium">
                تم اختيار {selectedUsers.length} مستخدم
              </span>
              <div className="flex gap-3">
                <select
                  value={bulkAction}
                  onChange={e => setBulkAction(e.target.value)}
                  className="px-4 py-2 border border-emerald-300 rounded-lg bg-white"
                >
                  <option value="">اختر إجراء...</option>
                  <option value="activate">✅ تفعيل</option>
                  <option value="ban">🚫 حظر</option>
                  <option value="enableAds">📢 تفعيل الإعلانات</option>
                  <option value="disableAds">🔇 تعطيل الإعلانات</option>
                  <option value="upgradePremium">⬆️ ترقية لسنوي</option>
                  <option value="delete">🗑️ حذف</option>
                </select>
                <button
                  onClick={handleBulkAction}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
                >
                  تنفيذ
                </button>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                      onChange={selectAllUsers}
                      className="w-4 h-4 rounded"
                    />
                  </th>
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
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="w-4 h-4 rounded"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-800">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <p className="text-xs text-gray-400">{user.phone}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{user.country}</td>
                    <td className="px-4 py-4">{getPlanBadge(user.plan)}</td>
                    <td className="px-4 py-4">{getStatusBadge(user.status)}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${user.adsEnabled ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                        {user.adsEnabled ? '📢 مفعّلة' : '🔇 معطّلة'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">{user.lastActive}</td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="تعديل"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="حذف"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                لا يوجد مستخدمين مطابقين للبحث
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Edit Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-800">تعديل بيانات المستخدم</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الاسم</label>
                  <input
                    type="text"
                    value={selectedUser.name}
                    onChange={e => setSelectedUser({ ...selectedUser, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={selectedUser.email}
                    onChange={e => setSelectedUser({ ...selectedUser, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الهاتف</label>
                  <input
                    type="tel"
                    value={selectedUser.phone}
                    onChange={e => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الدولة</label>
                  <input
                    type="text"
                    value={selectedUser.country}
                    onChange={e => setSelectedUser({ ...selectedUser, country: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Plan & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الباقة</label>
                  <select
                    value={selectedUser.plan}
                    onChange={e => setSelectedUser({ ...selectedUser, plan: e.target.value as User['plan'] })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                  >
                    <option value="free">مجاني</option>
                    <option value="monthly">شهري</option>
                    <option value="yearly">سنوي</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
                  <select
                    value={selectedUser.status}
                    onChange={e => setSelectedUser({ ...selectedUser, status: e.target.value as User['status'] })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                    <option value="banned">محظور</option>
                    <option value="pending">معلق</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">الإعلانات</span>
                  <button
                    onClick={() => setSelectedUser({ ...selectedUser, adsEnabled: !selectedUser.adsEnabled })}
                    className={`px-4 py-2 rounded-lg ${selectedUser.adsEnabled ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-600'}`}
                  >
                    {selectedUser.adsEnabled ? '📢 مفعّلة' : '🔇 معطّلة'}
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">الإشعارات</span>
                  <button
                    onClick={() => setSelectedUser({ ...selectedUser, notifications: !selectedUser.notifications })}
                    className={`px-4 py-2 rounded-lg ${selectedUser.notifications ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}
                  >
                    {selectedUser.notifications ? '🔔 مفعّلة' : '🔕 معطّلة'}
                  </button>
                </div>
              </div>

              {/* Theme & Language */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الثيم</label>
                  <select
                    value={selectedUser.theme}
                    onChange={e => setSelectedUser({ ...selectedUser, theme: e.target.value as User['theme'] })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                  >
                    <option value="light">فاتح</option>
                    <option value="dark">داكن</option>
                    <option value="auto">تلقائي</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">عدد الأجهزة</label>
                  <input
                    type="number"
                    value={selectedUser.devices}
                    onChange={e => setSelectedUser({ ...selectedUser, devices: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                    min="1"
                  />
                </div>
              </div>

              {/* Info Display */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-3">معلومات إضافية</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">تاريخ التسجيل:</span>
                    <span className="text-gray-800 mr-2">{selectedUser.registrationDate}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">آخر نشاط:</span>
                    <span className="text-gray-800 mr-2">{selectedUser.lastActive}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">إجمالي المدفوعات:</span>
                    <span className="text-gray-800 mr-2">{selectedUser.totalSpent} {selectedUser.currency}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
              <button
                onClick={handleSaveUser}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700"
              >
                💾 حفظ التعديلات
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" style={glassStyle}>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">تأكيد الحذف</h3>
              <p className="text-gray-600 mb-6">هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.</p>
              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700"
                >
                  نعم، احذف
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 border border-gray-200 py-3 rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
