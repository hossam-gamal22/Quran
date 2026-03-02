// admin-panel/src/pages/Notifications.tsx
// إدارة الإشعارات - روح المسلم

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Users,
  Filter,
  Search,
  Calendar,
  Globe,
  Smartphone,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Copy,
  Save,
  X,
  ChevronDown,
  Target,
  Repeat,
  Volume2,
  Image,
  Link,
  BarChart3,
  TrendingUp,
  Zap,
} from 'lucide-react';

// ========================================
// الأنواع
// ========================================

type NotificationType = 'push' | 'scheduled' | 'reminder' | 'promotional';
type NotificationStatus = 'draft' | 'scheduled' | 'sent' | 'failed';
type TargetAudience = 'all' | 'ios' | 'android' | 'active' | 'inactive' | 'custom';
type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly';

interface PushNotification {
  id: string;
  type: NotificationType;
  status: NotificationStatus;
  
  // المحتوى
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  
  // الوسائط
  imageUrl?: string;
  actionUrl?: string;
  actionType?: 'screen' | 'url' | 'none';
  
  // الاستهداف
  targetAudience: TargetAudience;
  targetLanguages?: string[];
  targetCountries?: string[];
  
  // الجدولة
  scheduledAt?: string;
  repeatType: RepeatType;
  repeatEndDate?: string;
  
  // الإحصائيات
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  
  // التواريخ
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
}

interface ScheduledReminder {
  id: string;
  name: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  time: string; // HH:mm
  isActive: boolean;
  repeatDays: number[]; // 0-6 (الأحد - السبت)
  sound: string;
}

// ========================================
// البيانات الافتراضية
// ========================================

const NOTIFICATION_TYPES: { value: NotificationType; label: string; icon: any; color: string }[] = [
  { value: 'push', label: 'إشعار فوري', icon: Zap, color: '#3b82f6' },
  { value: 'scheduled', label: 'مجدول', icon: Calendar, color: '#f59e0b' },
  { value: 'reminder', label: 'تذكير', icon: Bell, color: '#2f7659' },
  { value: 'promotional', label: 'ترويجي', icon: Target, color: '#8b5cf6' },
];

const TARGET_OPTIONS: { value: TargetAudience; label: string }[] = [
  { value: 'all', label: 'جميع المستخدمين' },
  { value: 'ios', label: 'مستخدمي iOS فقط' },
  { value: 'android', label: 'مستخدمي Android فقط' },
  { value: 'active', label: 'المستخدمين النشطين' },
  { value: 'inactive', label: 'المستخدمين غير النشطين' },
  { value: 'custom', label: 'استهداف مخصص' },
];

const APP_SCREENS = [
  { value: '/', label: 'الصفحة الرئيسية' },
  { value: '/azkar/morning', label: 'أذكار الصباح' },
  { value: '/azkar/evening', label: 'أذكار المساء' },
  { value: '/quran', label: 'القرآن الكريم' },
  { value: '/prayer', label: 'أوقات الصلاة' },
  { value: '/tasbih', label: 'التسبيح' },
  { value: '/khatma', label: 'الختمة' },
  { value: '/worship-tracker', label: 'تتبع العبادات' },
  { value: '/seasonal/ramadan', label: 'رمضان' },
];

const PRESET_REMINDERS = [
  { id: 'morning', name: 'أذكار الصباح', time: '06:00', titleAr: 'أذكار الصباح 🌅', bodyAr: 'حان وقت أذكار الصباح' },
  { id: 'evening', name: 'أذكار المساء', time: '17:00', titleAr: 'أذكار المساء 🌙', bodyAr: 'حان وقت أذكار المساء' },
  { id: 'friday', name: 'سورة الكهف', time: '10:00', titleAr: 'الجمعة المباركة 📖', bodyAr: 'لا تنسَ قراءة سورة الكهف' },
  { id: 'quran', name: 'ورد القرآن', time: '20:00', titleAr: 'ورد القرآن اليومي 📚', bodyAr: 'حان وقت قراءة وردك اليومي' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'الأحد' },
  { value: 1, label: 'الإثنين' },
  { value: 2, label: 'الثلاثاء' },
  { value: 3, label: 'الأربعاء' },
  { value: 4, label: 'الخميس' },
  { value: 5, label: 'الجمعة' },
  { value: 6, label: 'السبت' },
];

// ========================================
// المكون الرئيسي
// ========================================

const NotificationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'push' | 'scheduled' | 'reminders' | 'history'>('push');
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [reminders, setReminders] = useState<ScheduledReminder[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PushNotification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // نموذج الإشعار
  const emptyNotification: PushNotification = {
    id: '',
    type: 'push',
    status: 'draft',
    titleAr: '',
    titleEn: '',
    bodyAr: '',
    bodyEn: '',
    targetAudience: 'all',
    repeatType: 'none',
    sentCount: 0,
    deliveredCount: 0,
    openedCount: 0,
    clickedCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const [formData, setFormData] = useState<PushNotification>(emptyNotification);

  // تحميل البيانات
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    // بيانات تجريبية
    setNotifications([
      {
        id: '1',
        type: 'push',
        status: 'sent',
        titleAr: 'لا تنسَ أذكار الصباح ☀️',
        titleEn: "Don't forget morning Azkar",
        bodyAr: 'ابدأ يومك بذكر الله',
        bodyEn: 'Start your day with remembrance of Allah',
        targetAudience: 'all',
        repeatType: 'none',
        sentCount: 15000,
        deliveredCount: 14500,
        openedCount: 8500,
        clickedCount: 3200,
        createdAt: '2026-03-01T08:00:00Z',
        updatedAt: '2026-03-01T08:00:00Z',
        sentAt: '2026-03-01T08:00:00Z',
      },
      {
        id: '2',
        type: 'scheduled',
        status: 'scheduled',
        titleAr: 'تحديث جديد 🎉',
        titleEn: 'New Update',
        bodyAr: 'اكتشف المميزات الجديدة في التطبيق',
        bodyEn: 'Discover new features in the app',
        targetAudience: 'all',
        scheduledAt: '2026-03-05T10:00:00Z',
        repeatType: 'none',
        sentCount: 0,
        deliveredCount: 0,
        openedCount: 0,
        clickedCount: 0,
        createdAt: '2026-03-02T00:00:00Z',
        updatedAt: '2026-03-02T00:00:00Z',
      },
    ]);

    setReminders(
      PRESET_REMINDERS.map(r => ({
        id: r.id,
        name: r.name,
        titleAr: r.titleAr,
        titleEn: r.titleAr,
        bodyAr: r.bodyAr,
        bodyEn: r.bodyAr,
        time: r.time,
        isActive: true,
        repeatDays: [0, 1, 2, 3, 4, 5, 6],
        sound: 'default',
      }))
    );

    setIsLoading(false);
  };

  // إرسال إشعار
  const handleSendNow = async () => {
    if (!formData.titleAr || !formData.bodyAr) return;

    setIsSending(true);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newNotification: PushNotification = {
      ...formData,
      id: `notif_${Date.now()}`,
      status: 'sent',
      sentAt: new Date().toISOString(),
      sentCount: 15000, // محاكاة
      deliveredCount: 14500,
    };

    setNotifications(prev => [newNotification, ...prev]);
    setIsSending(false);
    setIsModalOpen(false);
    setFormData(emptyNotification);
  };

  // جدولة إشعار
  const handleSchedule = async () => {
    if (!formData.titleAr || !formData.bodyAr || !formData.scheduledAt) return;

    const newNotification: PushNotification = {
      ...formData,
      id: `notif_${Date.now()}`,
      status: 'scheduled',
      type: 'scheduled',
    };

    setNotifications(prev => [newNotification, ...prev]);
    setIsModalOpen(false);
    setFormData(emptyNotification);
  };

  // حذف إشعار
  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الإشعار؟')) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  // تفعيل/تعطيل تذكير
  const handleToggleReminder = (id: string) => {
    setReminders(prev =>
      prev.map(r => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  };

  // حساب نسبة الفتح
  const getOpenRate = (n: PushNotification): string => {
    if (n.deliveredCount === 0) return '0%';
    return `${((n.openedCount / n.deliveredCount) * 100).toFixed(1)}%`;
  };

  // حساب نسبة النقر
  const getClickRate = (n: PushNotification): string => {
    if (n.openedCount === 0) return '0%';
    return `${((n.clickedCount / n.openedCount) * 100).toFixed(1)}%`;
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">إدارة الإشعارات</h1>
          <p className="text-gray-400 mt-1">إرسال إشعارات وتذكيرات للمستخدمين</p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setFormData(emptyNotification);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={18} />
          <span>إشعار جديد</span>
        </button>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Send size={20} className="text-blue-500" />
            </div>
            <div>
              <div className="text-gray-400 text-sm">إجمالي المرسل</div>
              <div className="text-xl font-bold">
                {notifications.filter(n => n.status === 'sent').length}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Clock size={20} className="text-yellow-500" />
            </div>
            <div>
              <div className="text-gray-400 text-sm">المجدولة</div>
              <div className="text-xl font-bold">
                {notifications.filter(n => n.status === 'scheduled').length}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Eye size={20} className="text-green-500" />
            </div>
            <div>
              <div className="text-gray-400 text-sm">متوسط الفتح</div>
              <div className="text-xl font-bold">58.6%</div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Target size={20} className="text-purple-500" />
            </div>
            <div>
              <div className="text-gray-400 text-sm">متوسط النقر</div>
              <div className="text-xl font-bold">37.6%</div>
            </div>
          </div>
        </div>
      </div>

      {/* التبويبات */}
      <div className="flex gap-2 mb-6 border-b border-gray-700 pb-4">
        {[
          { id: 'push', label: 'إشعارات فورية', icon: Zap },
          { id: 'scheduled', label: 'مجدولة', icon: Calendar },
          { id: 'reminders', label: 'التذكيرات', icon: Bell },
          { id: 'history', label: 'السجل', icon: Clock },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* المحتوى */}
      {activeTab === 'reminders' ? (
        // قائمة التذكيرات
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reminders.map(reminder => (
            <div
              key={reminder.id}
              className={`bg-gray-800 rounded-xl p-4 border transition-all ${
                reminder.isActive ? 'border-green-500/50' : 'border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Bell size={20} className="text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-bold">{reminder.name}</h3>
                    <p className="text-gray-400 text-sm">{reminder.time}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleReminder(reminder.id)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    reminder.isActive ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                      reminder.isActive ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3 mb-3">
                <p className="text-sm font-bold">{reminder.titleAr}</p>
                <p className="text-gray-400 text-sm">{reminder.bodyAr}</p>
              </div>
              <div className="flex gap-1 flex-wrap">
                {DAYS_OF_WEEK.map(day => (
                  <span
                    key={day.value}
                    className={`px-2 py-1 rounded text-xs ${
                      reminder.repeatDays.includes(day.value)
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-gray-700 text-gray-500'
                    }`}
                  >
                    {day.label.slice(0, 1)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // قائمة الإشعارات
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">
              <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-4" />
              جاري التحميل...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Bell size={48} className="mx-auto mb-4 opacity-50" />
              <p>لا توجد إشعارات</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {notifications
                .filter(n => {
                  if (activeTab === 'push') return n.status === 'sent' && n.type === 'push';
                  if (activeTab === 'scheduled') return n.status === 'scheduled';
                  if (activeTab === 'history') return n.status === 'sent';
                  return true;
                })
                .map(notification => (
                  <div
                    key={notification.id}
                    className="p-4 hover:bg-gray-700/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              notification.status === 'sent'
                                ? 'bg-green-500/20 text-green-500'
                                : notification.status === 'scheduled'
                                ? 'bg-yellow-500/20 text-yellow-500'
                                : 'bg-gray-500/20 text-gray-500'
                            }`}
                          >
                            {notification.status === 'sent' ? 'مرسل' : 'مجدول'}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {TARGET_OPTIONS.find(t => t.value === notification.targetAudience)?.label}
                          </span>
                        </div>
                        <h3 className="font-bold mb-1">{notification.titleAr}</h3>
                        <p className="text-gray-400 text-sm">{notification.bodyAr}</p>

                        {notification.status === 'sent' && (
                          <div className="flex gap-4 mt-3 text-sm">
                            <span className="text-gray-400">
                              أُرسل: <span className="text-white">{notification.sentCount.toLocaleString()}</span>
                            </span>
                            <span className="text-gray-400">
                              وصل: <span className="text-white">{notification.deliveredCount.toLocaleString()}</span>
                            </span>
                            <span className="text-gray-400">
                              فتح: <span className="text-green-500">{getOpenRate(notification)}</span>
                            </span>
                            <span className="text-gray-400">
                              نقر: <span className="text-blue-500">{getClickRate(notification)}</span>
                            </span>
                          </div>
                        )}

                        {notification.status === 'scheduled' && notification.scheduledAt && (
                          <div className="flex items-center gap-2 mt-3 text-sm text-yellow-500">
                            <Calendar size={14} />
                            <span>
                              مجدول في: {new Date(notification.scheduledAt).toLocaleString('ar-EG')}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {notification.status === 'scheduled' && (
                          <button
                            onClick={() => {
                              setEditingItem(notification);
                              setFormData(notification);
                              setIsModalOpen(true);
                            }}
                            className="p-2 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-yellow-500"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="p-2 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* نافذة إنشاء إشعار */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold">
                {editingItem ? 'تعديل الإشعار' : 'إشعار جديد'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
              {/* العنوان */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">العنوان (عربي) *</label>
                  <input
                    type="text"
                    value={formData.titleAr}
                    onChange={e => setFormData({ ...formData, titleAr: e.target.value })}
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="عنوان الإشعار"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">العنوان (إنجليزي)</label>
                  <input
                    type="text"
                    value={formData.titleEn}
                    onChange={e => setFormData({ ...formData, titleEn: e.target.value })}
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Notification title"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* المحتوى */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">المحتوى (عربي) *</label>
                  <textarea
                    value={formData.bodyAr}
                    onChange={e => setFormData({ ...formData, bodyAr: e.target.value })}
                    rows={3}
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none resize-none"
                    placeholder="نص الإشعار"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">المحتوى (إنجليزي)</label>
                  <textarea
                    value={formData.bodyEn}
                    onChange={e => setFormData({ ...formData, bodyEn: e.target.value })}
                    rows={3}
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none resize-none"
                    placeholder="Notification body"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* الاستهداف */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">الجمهور المستهدف</label>
                <select
                  value={formData.targetAudience}
                  onChange={e => setFormData({ ...formData, targetAudience: e.target.value as TargetAudience })}
                  className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                >
                  {TARGET_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* الإجراء */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">الإجراء عند النقر</label>
                  <select
                    value={formData.actionType || 'none'}
                    onChange={e => setFormData({ ...formData, actionType: e.target.value as any })}
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    <option value="none">بدون إجراء</option>
                    <option value="screen">فتح صفحة</option>
                    <option value="url">فتح رابط</option>
                  </select>
                </div>
                {formData.actionType === 'screen' && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">الصفحة</label>
                    <select
                      value={formData.actionUrl || ''}
                      onChange={e => setFormData({ ...formData, actionUrl: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                    >
                      <option value="">اختر صفحة</option>
                      {APP_SCREENS.map(screen => (
                        <option key={screen.value} value={screen.value}>{screen.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                {formData.actionType === 'url' && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">الرابط</label>
                    <input
                      type="url"
                      value={formData.actionUrl || ''}
                      onChange={e => setFormData({ ...formData, actionUrl: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                      placeholder="https://..."
                      dir="ltr"
                    />
                  </div>
                )}
              </div>

              {/* الجدولة */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">جدولة الإرسال (اختياري)</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledAt ? formData.scheduledAt.slice(0, 16) : ''}
                    onChange={e => setFormData({ ...formData, scheduledAt: e.target.value ? `${e.target.value}:00Z` : undefined })}
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">صورة (اختياري)</label>
                  <input
                    type="url"
                    value={formData.imageUrl || ''}
                    onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="https://..."
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                إلغاء
              </button>
              {formData.scheduledAt ? (
                <button
                  onClick={handleSchedule}
                  disabled={!formData.titleAr || !formData.bodyAr}
                  className="flex items-center gap-2 px-6 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 rounded-lg transition-colors"
                >
                  <Calendar size={18} />
                  <span>جدولة</span>
                </button>
              ) : (
                <button
                  onClick={handleSendNow}
                  disabled={!formData.titleAr || !formData.bodyAr || isSending}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg transition-colors"
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>جاري الإرسال...</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>إرسال الآن</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
