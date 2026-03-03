// admin-panel/src/pages/Notifications.tsx
// إدارة الإشعارات - روح المسلم
// آخر تحديث: 2026-03-03

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Users,
  Calendar,
  CheckCircle,
  AlertCircle,
  Eye,
  X,
  Target,
  Zap,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { sendPushNotification, getUserStats } from '../services/pushNotifications';

// ========================================
// الأنواع
// ========================================

type NotificationStatus = 'draft' | 'scheduled' | 'sent' | 'failed';
type TargetAudience = 'all' | 'ios' | 'android' | 'active' | 'inactive';

interface PushNotification {
  id: string;
  status: NotificationStatus;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  imageUrl?: string;
  actionUrl?: string;
  targetAudience: TargetAudience;
  scheduledAt?: string;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  createdAt: Timestamp | string;
  sentAt?: Timestamp | string;
}

interface ScheduledReminder {
  id: string;
  name: string;
  titleAr: string;
  bodyAr: string;
  time: string;
  isActive: boolean;
  repeatDays: number[];
}

interface UserStatsData {
  total: number;
  withToken: number;
  ios: number;
  android: number;
  active: number;
}

// ========================================
// الثوابت
// ========================================

const TARGET_OPTIONS: { value: TargetAudience; label: string; icon: string }[] = [
  { value: 'all', label: 'جميع المستخدمين', icon: '👥' },
  { value: 'ios', label: 'مستخدمي iOS', icon: '🍎' },
  { value: 'android', label: 'مستخدمي Android', icon: '🤖' },
  { value: 'active', label: 'النشطين (آخر 7 أيام)', icon: '🟢' },
  { value: 'inactive', label: 'غير النشطين', icon: '🔴' },
];

const APP_SCREENS = [
  { value: '/', label: 'الصفحة الرئيسية' },
  { value: '/azkar/morning', label: 'أذكار الصباح' },
  { value: '/azkar/evening', label: 'أذكار المساء' },
  { value: '/quran', label: 'القرآن الكريم' },
  { value: '/prayer', label: 'أوقات الصلاة' },
  { value: '/tasbih', label: 'التسبيح' },
  { value: '/khatma', label: 'الختمة' },
];

const PRESET_REMINDERS = [
  { id: 'morning', name: 'أذكار الصباح', time: '06:00', titleAr: 'أذكار الصباح 🌅', bodyAr: 'حان وقت أذكار الصباح' },
  { id: 'evening', name: 'أذكار المساء', time: '17:00', titleAr: 'أذكار المساء 🌙', bodyAr: 'حان وقت أذكار المساء' },
  { id: 'friday', name: 'سورة الكهف', time: '10:00', titleAr: 'الجمعة المباركة 📖', bodyAr: 'لا تنسَ قراءة سورة الكهف' },
  { id: 'quran', name: 'ورد القرآن', time: '20:00', titleAr: 'ورد القرآن اليومي 📚', bodyAr: 'حان وقت قراءة وردك اليومي' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'أحد' },
  { value: 1, label: 'إثنين' },
  { value: 2, label: 'ثلاثاء' },
  { value: 3, label: 'أربعاء' },
  { value: 4, label: 'خميس' },
  { value: 5, label: 'جمعة' },
  { value: 6, label: 'سبت' },
];

// ========================================
// المكون الرئيسي
// ========================================

const NotificationsPage: React.FC = () => {
  // الحالات
  const [activeTab, setActiveTab] = useState<'push' | 'scheduled' | 'reminders' | 'history'>('push');
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [reminders, setReminders] = useState<ScheduledReminder[]>([]);
  const [userStats, setUserStats] = useState<UserStatsData>({ total: 0, withToken: 0, ios: 0, android: 0, active: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PushNotification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // نموذج الإشعار
  const emptyNotification: Omit<PushNotification, 'id' | 'createdAt'> = {
    status: 'draft',
    titleAr: '',
    titleEn: '',
    bodyAr: '',
    bodyEn: '',
    targetAudience: 'all',
    sentCount: 0,
    deliveredCount: 0,
    openedCount: 0,
    clickedCount: 0,
  };

  const [formData, setFormData] = useState(emptyNotification);

  // ========================================
  // تحميل البيانات
  // ========================================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    
    try {
      // 1. تحميل الإشعارات من Firebase
      const notificationsRef = collection(db, 'notifications');
      const notificationsQuery = query(notificationsRef, orderBy('createdAt', 'desc'));
      const notificationsSnapshot = await getDocs(notificationsQuery);
      
      const loadedNotifications: PushNotification[] = notificationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as PushNotification));
      
      setNotifications(loadedNotifications);
      
      // 2. تحميل إحصائيات المستخدمين
      const stats = await getUserStats();
      setUserStats(stats);
      
      // 3. التذكيرات الافتراضية
      setReminders(
        PRESET_REMINDERS.map(r => ({
          id: r.id,
          name: r.name,
          titleAr: r.titleAr,
          bodyAr: r.bodyAr,
          time: r.time,
          isActive: true,
          repeatDays: [0, 1, 2, 3, 4, 5, 6],
        }))
      );
      
    } catch (error) {
      console.error('Error loading data:', error);
    }
    
    setIsLoading(false);
  };

  // ========================================
  // إرسال الإشعارات
  // ========================================

  const handleSendNow = async () => {
    if (!formData.titleAr || !formData.bodyAr) {
      setSendResult({ success: false, message: 'يرجى ملء العنوان والمحتوى' });
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      // إرسال الإشعار الفعلي
      const result = await sendPushNotification({
        titleAr: formData.titleAr,
        titleEn: formData.titleEn,
        bodyAr: formData.bodyAr,
        bodyEn: formData.bodyEn,
        targetAudience: formData.targetAudience,
        actionUrl: formData.actionUrl,
        imageUrl: formData.imageUrl,
      });

      if (result.success) {
        // حفظ في Firebase
        const newNotification = await addDoc(collection(db, 'notifications'), {
          ...formData,
          status: 'sent',
          sentCount: result.sentCount,
          deliveredCount: result.sentCount,
          sentAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });

        // تحديث القائمة
        setNotifications(prev => [{
          id: newNotification.id,
          ...formData,
          status: 'sent',
          sentCount: result.sentCount,
          deliveredCount: result.sentCount,
          createdAt: new Date().toISOString(),
          sentAt: new Date().toISOString(),
        }, ...prev]);

        setSendResult({ 
          success: true, 
          message: `✅ تم إرسال الإشعار بنجاح إلى ${result.sentCount} مستخدم` 
        });
        
        // إغلاق النافذة بعد ثانيتين
        setTimeout(() => {
          setIsModalOpen(false);
          setFormData(emptyNotification);
          setSendResult(null);
        }, 2000);
        
      } else {
        setSendResult({ 
          success: false, 
          message: `❌ فشل الإرسال: ${result.errors[0] || 'خطأ غير معروف'}` 
        });
      }

    } catch (error) {
      setSendResult({ 
        success: false, 
        message: `❌ خطأ: ${(error as Error).message}` 
      });
    }

    setIsSending(false);
  };

  const handleSchedule = async () => {
    if (!formData.titleAr || !formData.bodyAr || !formData.scheduledAt) {
      setSendResult({ success: false, message: 'يرجى ملء جميع الحقول المطلوبة' });
      return;
    }

    try {
      const newNotification = await addDoc(collection(db, 'notifications'), {
        ...formData,
        status: 'scheduled',
        createdAt: serverTimestamp(),
      });

      setNotifications(prev => [{
        id: newNotification.id,
        ...formData,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
      }, ...prev]);

      setIsModalOpen(false);
      setFormData(emptyNotification);
      
    } catch (error) {
      setSendResult({ success: false, message: `❌ خطأ: ${(error as Error).message}` });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الإشعار؟')) return;
    
    try {
      await deleteDoc(doc(db, 'notifications', id));
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleToggleReminder = (id: string) => {
    setReminders(prev =>
      prev.map(r => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  };

  // ========================================
  // دوال المساعدة
  // ========================================

  const getOpenRate = (n: PushNotification): string => {
    if (n.deliveredCount === 0) return '0%';
    return `${((n.openedCount / n.deliveredCount) * 100).toFixed(1)}%`;
  };

  const formatDate = (date: Timestamp | string | undefined): string => {
    if (!date) return '';
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleString('ar-EG');
    }
    return new Date(date).toLocaleString('ar-EG');
  };

  // ========================================
  // الواجهة
  // ========================================

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة الإشعارات</h1>
          <p className="text-slate-400 mt-1">إرسال إشعارات وتذكيرات للمستخدمين</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              setFormData(emptyNotification);
              setSendResult(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl text-white transition-colors"
          >
            <Plus size={18} />
            إشعار جديد
          </button>
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users size={20} className="text-blue-400" />
            </div>
            <div>
              <div className="text-slate-400 text-sm">إجمالي المستخدمين</div>
              <div className="text-xl font-bold text-white">{userStats.total}</div>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Smartphone size={20} className="text-emerald-400" />
            </div>
            <div>
              <div className="text-slate-400 text-sm">لديهم توكن</div>
              <div className="text-xl font-bold text-white">{userStats.withToken}</div>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-500/20 rounded-lg">
              <span className="text-lg">🍎</span>
            </div>
            <div>
              <div className="text-slate-400 text-sm">iOS</div>
              <div className="text-xl font-bold text-white">{userStats.ios}</div>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <span className="text-lg">🤖</span>
            </div>
            <div>
              <div className="text-slate-400 text-sm">Android</div>
              <div className="text-xl font-bold text-white">{userStats.android}</div>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Target size={20} className="text-amber-400" />
            </div>
            <div>
              <div className="text-slate-400 text-sm">نشطين</div>
              <div className="text-xl font-bold text-white">{userStats.active}</div>
            </div>
          </div>
        </div>
      </div>

      {/* التبويبات */}
      <div className="flex gap-2 border-b border-slate-700 pb-4">
        {[
          { id: 'push', label: 'إشعارات فورية', icon: Zap },
          { id: 'scheduled', label: 'مجدولة', icon: Calendar },
          { id: 'reminders', label: 'التذكيرات', icon: Bell },
          { id: 'history', label: 'السجل', icon: Clock },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* المحتوى */}
      {activeTab === 'reminders' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reminders.map(reminder => (
            <div
              key={reminder.id}
              className={`bg-slate-800/50 rounded-xl p-4 border transition-all ${
                reminder.isActive ? 'border-emerald-500/50' : 'border-slate-700/50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Bell size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{reminder.name}</h3>
                    <p className="text-slate-400 text-sm">{reminder.time}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleReminder(reminder.id)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    reminder.isActive ? 'bg-emerald-500' : 'bg-slate-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                      reminder.isActive ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 mb-3">
                <p className="text-sm font-bold text-white">{reminder.titleAr}</p>
                <p className="text-slate-400 text-sm">{reminder.bodyAr}</p>
              </div>
              <div className="flex gap-1 flex-wrap">
                {DAYS_OF_WEEK.map(day => (
                  <span
                    key={day.value}
                    className={`px-2 py-1 rounded text-xs ${
                      reminder.repeatDays.includes(day.value)
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-700 text-slate-500'
                    }`}
                  >
                    {day.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">
              <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
              جاري التحميل...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Bell size={48} className="mx-auto mb-4 opacity-50" />
              <p>لا توجد إشعارات</p>
              <p className="text-sm mt-2">اضغط "إشعار جديد" لإرسال أول إشعار</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {notifications
                .filter(n => {
                  if (activeTab === 'push') return n.status === 'sent';
                  if (activeTab === 'scheduled') return n.status === 'scheduled';
                  if (activeTab === 'history') return true;
                  return true;
                })
                .map(notification => (
                  <div key={notification.id} className="p-4 hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              notification.status === 'sent'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : notification.status === 'scheduled'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-slate-500/20 text-slate-400'
                            }`}
                          >
                            {notification.status === 'sent' ? '✅ مرسل' : '⏰ مجدول'}
                          </span>
                          <span className="text-slate-500 text-xs">
                            {TARGET_OPTIONS.find(t => t.value === notification.targetAudience)?.icon}{' '}
                            {TARGET_OPTIONS.find(t => t.value === notification.targetAudience)?.label}
                          </span>
                        </div>
                        <h3 className="font-bold text-white mb-1">{notification.titleAr}</h3>
                        <p className="text-slate-400 text-sm">{notification.bodyAr}</p>

                        {notification.status === 'sent' && (
                          <div className="flex gap-4 mt-3 text-sm">
                            <span className="text-slate-400">
                              أُرسل: <span className="text-white font-medium">{notification.sentCount.toLocaleString()}</span>
                            </span>
                            <span className="text-slate-400">
                              وصل: <span className="text-white font-medium">{notification.deliveredCount.toLocaleString()}</span>
                            </span>
                            <span className="text-slate-400">
                              فتح: <span className="text-emerald-400 font-medium">{getOpenRate(notification)}</span>
                            </span>
                          </div>
                        )}

                        {notification.sentAt && (
                          <div className="text-xs text-slate-500 mt-2">
                            {formatDate(notification.sentAt)}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
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
          <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-700">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">
                {editingItem ? 'تعديل الإشعار' : 'إشعار جديد'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
              {/* رسالة النتيجة */}
              {sendResult && (
                <div className={`p-4 rounded-xl flex items-center gap-2 ${
                  sendResult.success 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/50'
                }`}>
                  {sendResult.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                  {sendResult.message}
                </div>
              )}

              {/* العنوان */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">العنوان (عربي) *</label>
                  <input
                    type="text"
                    value={formData.titleAr}
                    onChange={e => setFormData({ ...formData, titleAr: e.target.value })}
                    className="w-full bg-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none text-white"
                    placeholder="عنوان الإشعار"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">العنوان (إنجليزي)</label>
                  <input
                    type="text"
                    value={formData.titleEn}
                    onChange={e => setFormData({ ...formData, titleEn: e.target.value })}
                    className="w-full bg-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none text-white"
                    placeholder="Notification title"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* المحتوى */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">المحتوى (عربي) *</label>
                  <textarea
                    value={formData.bodyAr}
                    onChange={e => setFormData({ ...formData, bodyAr: e.target.value })}
                    rows={3}
                    className="w-full bg-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-white"
                    placeholder="نص الإشعار"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">المحتوى (إنجليزي)</label>
                  <textarea
                    value={formData.bodyEn}
                    onChange={e => setFormData({ ...formData, bodyEn: e.target.value })}
                    rows={3}
                    className="w-full bg-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-white"
                    placeholder="Notification body"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* الاستهداف */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">الجمهور المستهدف</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {TARGET_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFormData({ ...formData, targetAudience: opt.value })}
                      className={`p-3 rounded-xl border transition-all text-right ${
                        formData.targetAudience === opt.value
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span className="text-lg ml-2">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* الإجراء */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">فتح صفحة عند النقر (اختياري)</label>
                <select
                  value={formData.actionUrl || ''}
                  onChange={e => setFormData({ ...formData, actionUrl: e.target.value })}
                  className="w-full bg-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none text-white"
                >
                  <option value="">بدون إجراء</option>
                  {APP_SCREENS.map(screen => (
                    <option key={screen.value} value={screen.value}>{screen.label}</option>
                  ))}
                </select>
              </div>

              {/* الجدولة */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">جدولة الإرسال (اختياري)</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledAt || ''}
                    onChange={e => setFormData({ ...formData, scheduledAt: e.target.value })}
                    className="w-full bg-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">صورة (اختياري)</label>
                  <input
                    type="url"
                    value={formData.imageUrl || ''}
                    onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full bg-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none text-white"
                    placeholder="https://..."
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center gap-3 p-4 border-t border-slate-700">
              <div className="text-sm text-slate-400">
                سيتم الإرسال إلى ~{userStats.withToken} مستخدم
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors text-white"
                >
                  إلغاء
                </button>
                {formData.scheduledAt ? (
                  <button
                    onClick={handleSchedule}
                    disabled={!formData.titleAr || !formData.bodyAr}
                    className="flex items-center gap-2 px-6 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 rounded-xl transition-colors text-white"
                  >
                    <Calendar size={18} />
                    جدولة
                  </button>
                ) : (
                  <button
                    onClick={handleSendNow}
                    disabled={!formData.titleAr || !formData.bodyAr || isSending}
                    className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 rounded-xl transition-colors text-white"
                  >
                    {isSending ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        إرسال الآن
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
