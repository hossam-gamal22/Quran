// admin-panel/src/pages/Notifications.tsx
// إدارة الإشعارات - روح المسلم
// آخر تحديث: 2026-03-04
// محدث لدعم 12 لغة

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Plus,
  Trash2,
  Clock,
  Users,
  Calendar,
  CheckCircle,
  AlertCircle,
  X,
  Target,
  Zap,
  RefreshCw,
  Smartphone,
  Globe,
  Copy,
  ChevronDown,
  ChevronUp,
  Languages,
  UserX,
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
import { 
  sendPushNotification, 
  getUserStats, 
  getInactiveUserCount,
  sendReengagementNotification,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  NotificationTranslations,
  UserStats
} from '../services/pushNotifications';
import AutoTranslateField from '../components/AutoTranslateField';

// ========================================
// الأنواع
// ========================================

type NotificationStatus = 'draft' | 'scheduled' | 'sent' | 'failed';
type TargetAudience = 'all' | 'ios' | 'android' | 'active' | 'inactive';

interface PushNotification {
  id: string;
  status: NotificationStatus;
  translations: NotificationTranslations;
  // للتوافق مع البيانات القديمة
  titleAr?: string;
  titleEn?: string;
  bodyAr?: string;
  bodyEn?: string;
  imageUrl?: string;
  actionUrl?: string;
  targetAudience: TargetAudience;
  scheduledAt?: string;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  perLanguage?: { [lang: string]: number };
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
  { value: '/azkar/sleep', label: 'أذكار النوم' },
  { value: '/azkar/wakeup', label: 'أذكار الاستيقاظ' },
  { value: '/azkar/after_prayer', label: 'أذكار بعد الصلاة' },
  { value: '/(tabs)/quran', label: 'القرآن الكريم' },
  { value: '/(tabs)/prayer', label: 'أوقات الصلاة' },
  { value: '/(tabs)/tasbih', label: 'التسبيح' },
  { value: '/daily-ayah', label: 'آية اليوم' },
  { value: '/daily-dua', label: 'دعاء اليوم' },
  { value: '/daily-dhikr', label: 'ذكر اليوم' },
  { value: '/hijri', label: 'التقويم الهجري' },
  { value: '/names', label: 'أسماء الله الحسنى' },
  { value: '/hajj-umrah', label: 'الحج والعمرة' },
  { value: '/ruqya', label: 'الرقية الشرعية' },
  { value: '/companions', label: 'قصص الصحابة' },
  { value: '/seerah', label: 'السيرة النبوية' },
  { value: '/radio', label: 'إذاعة القرآن' },
  { value: '/hadith-of-day', label: 'حديث اليوم' },
  { value: '/worship-tracker', label: 'تتبع العبادات' },
  { value: '/subscription', label: 'الاشتراك' },
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

// ترجمات جاهزة للإشعارات الشائعة
const PRESET_NOTIFICATIONS: { 
  id: string; 
  name: string; 
  translations: NotificationTranslations 
}[] = [
  {
    id: 'morning_azkar',
    name: 'أذكار الصباح',
    translations: {
      ar: { title: 'أذكار الصباح 🌅', body: 'حان وقت أذكار الصباح، ابدأ يومك بذكر الله' },
      en: { title: 'Morning Adhkar 🌅', body: 'Time for morning remembrance, start your day with Allah' },
      fr: { title: 'Adhkar du matin 🌅', body: 'C\'est l\'heure des invocations du matin' },
      de: { title: 'Morgen-Adhkar 🌅', body: 'Zeit für die Morgen-Erinnerungen' },
      es: { title: 'Adhkar de la mañana 🌅', body: 'Es hora de los recuerdos matutinos' },
      tr: { title: 'Sabah Ezkarları 🌅', body: 'Sabah zikirlerinin vakti geldi' },
      ur: { title: 'صبح کے اذکار 🌅', body: 'صبح کے اذکار کا وقت ہو گیا' },
      id: { title: 'Dzikir Pagi 🌅', body: 'Waktunya dzikir pagi' },
      ms: { title: 'Zikir Pagi 🌅', body: 'Masa untuk zikir pagi' },
      hi: { title: 'सुबह के अज़कार 🌅', body: 'सुबह की याद का समय' },
      bn: { title: 'সকালের আযকার 🌅', body: 'সকালের যিকিরের সময়' },
      ru: { title: 'Утренние азкары 🌅', body: 'Время утренних поминаний' },
    }
  },
  {
    id: 'evening_azkar',
    name: 'أذكار المساء',
    translations: {
      ar: { title: 'أذكار المساء 🌙', body: 'حان وقت أذكار المساء، اختم يومك بذكر الله' },
      en: { title: 'Evening Adhkar 🌙', body: 'Time for evening remembrance' },
      fr: { title: 'Adhkar du soir 🌙', body: 'C\'est l\'heure des invocations du soir' },
      de: { title: 'Abend-Adhkar 🌙', body: 'Zeit für die Abend-Erinnerungen' },
      es: { title: 'Adhkar de la tarde 🌙', body: 'Es hora de los recuerdos vespertinos' },
      tr: { title: 'Akşam Ezkarları 🌙', body: 'Akşam zikirlerinin vakti geldi' },
      ur: { title: 'شام کے اذکار 🌙', body: 'شام کے اذکار کا وقت ہو گیا' },
      id: { title: 'Dzikir Petang 🌙', body: 'Waktunya dzikir petang' },
      ms: { title: 'Zikir Petang 🌙', body: 'Masa untuk zikir petang' },
      hi: { title: 'शाम के अज़कार 🌙', body: 'शाम की याद का समय' },
      bn: { title: 'সন্ধ্যার আযকার 🌙', body: 'সন্ধ্যার যিকিরের সময়' },
      ru: { title: 'Вечерние азкары 🌙', body: 'Время вечерних поминаний' },
    }
  },
  {
    id: 'friday_kahf',
    name: 'سورة الكهف (الجمعة)',
    translations: {
      ar: { title: 'الجمعة المباركة 📖', body: 'لا تنسَ قراءة سورة الكهف' },
      en: { title: 'Blessed Friday 📖', body: 'Don\'t forget to read Surah Al-Kahf' },
      fr: { title: 'Vendredi béni 📖', body: 'N\'oubliez pas de lire Sourate Al-Kahf' },
      de: { title: 'Gesegneter Freitag 📖', body: 'Vergiss nicht, Surah Al-Kahf zu lesen' },
      es: { title: 'Viernes bendito 📖', body: 'No olvides leer Sura Al-Kahf' },
      tr: { title: 'Mübarek Cuma 📖', body: 'Kehf Suresi\'ni okumayı unutma' },
      ur: { title: 'مبارک جمعہ 📖', body: 'سورۃ الکہف پڑھنا نہ بھولیں' },
      id: { title: 'Jumat Berkah 📖', body: 'Jangan lupa membaca Surah Al-Kahfi' },
      ms: { title: 'Jumaat Berkat 📖', body: 'Jangan lupa baca Surah Al-Kahfi' },
      hi: { title: 'जुम्मा मुबारक 📖', body: 'सूरह अल-कहफ पढ़ना न भूलें' },
      bn: { title: 'জুমা মোবারক 📖', body: 'সূরা আল-কাহফ পড়তে ভুলবেন না' },
      ru: { title: 'Благословенная пятница 📖', body: 'Не забудьте прочитать суру Аль-Кахф' },
    }
  },
  {
    id: 'new_update',
    name: 'تحديث جديد',
    translations: {
      ar: { title: 'تحديث جديد 🎉', body: 'تم إضافة ميزات جديدة! قم بتحديث التطبيق الآن' },
      en: { title: 'New Update 🎉', body: 'New features added! Update the app now' },
      fr: { title: 'Nouvelle mise à jour 🎉', body: 'Nouvelles fonctionnalités ajoutées!' },
      de: { title: 'Neues Update 🎉', body: 'Neue Funktionen hinzugefügt!' },
      es: { title: 'Nueva actualización 🎉', body: '¡Nuevas funciones añadidas!' },
      tr: { title: 'Yeni Güncelleme 🎉', body: 'Yeni özellikler eklendi!' },
      ur: { title: 'نئی اپ ڈیٹ 🎉', body: 'نئی خصوصیات شامل کی گئیں!' },
      id: { title: 'Update Baru 🎉', body: 'Fitur baru ditambahkan!' },
      ms: { title: 'Kemaskini Baru 🎉', body: 'Ciri baru ditambah!' },
      hi: { title: 'नया अपडेट 🎉', body: 'नई सुविधाएं जोड़ी गईं!' },
      bn: { title: 'নতুন আপডেট 🎉', body: 'নতুন বৈশিষ্ট্য যোগ করা হয়েছে!' },
      ru: { title: 'Новое обновление 🎉', body: 'Добавлены новые функции!' },
    }
  },
];

// ========================================
// المكون الرئيسي
// ========================================

const NotificationsPage: React.FC = () => {
  // الحالات
  const [activeTab, setActiveTab] = useState<'push' | 'scheduled' | 'reminders' | 'history' | 'reengagement'>('push');
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [reminders, setReminders] = useState<ScheduledReminder[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({ 
    total: 0, withTokens: 0, ios: 0, android: 0, active: 0, byLanguage: {} 
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [expandedLanguages, setExpandedLanguages] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [tempPages, setTempPages] = useState<{ id: string; title: string }[]>([]);
  const [autoProcessLog, setAutoProcessLog] = useState<string[]>([]);

  // نموذج الإشعار - يدعم 12 لغة
  const emptyTranslations: NotificationTranslations = {
    ar: { title: '', body: '' },
    en: { title: '', body: '' },
  };

  const [translations, setTranslations] = useState<NotificationTranslations>(emptyTranslations);
  const [targetAudience, setTargetAudience] = useState<TargetAudience>('all');
  const [targetLanguages, setTargetLanguages] = useState<string[]>([]);
  const [actionUrl, setActionUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  // ========================================
  // تحميل البيانات
  // ========================================

  useEffect(() => {
    loadData();
  }, []);

  // ========================================
  // معالج الإشعارات المجدولة تلقائياً
  // Auto-process scheduled notifications
  // ========================================
  useEffect(() => {
    const processScheduled = async () => {
      try {
        const snapshot = await getDocs(
          query(collection(db, 'notifications'), orderBy('createdAt', 'desc'))
        );
        
        const now = new Date();
        
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data() as PushNotification;
          if (data.status !== 'scheduled' || !data.scheduledAt) continue;
          
          const scheduledTime = new Date(data.scheduledAt);
          if (scheduledTime > now) continue;
          
          // Time to send!
          console.log(`⏰ Auto-sending scheduled notification: ${docSnap.id}`);
          setAutoProcessLog(prev => [...prev.slice(-9), `⏰ ${new Date().toLocaleTimeString('ar')} — جاري إرسال إشعار مجدول...`]);
          
          try {
            const result = await sendPushNotification({
              translations: data.translations || {},
              targetAudience: data.targetAudience || 'all',
              targetLanguages: (data as PushNotification & { targetLanguages?: string[] }).targetLanguages,
              actionUrl: data.actionUrl,
              imageUrl: data.imageUrl,
            });
            
            // Update status in Firestore
            const { updateDoc } = await import('firebase/firestore');
            await updateDoc(doc(db, 'notifications', docSnap.id), {
              status: 'sent',
              sentAt: new Date().toISOString(),
              sentCount: result.sentCount,
              perLanguage: result.perLanguage,
            });
            
            setAutoProcessLog(prev => [...prev.slice(-9), `✅ ${new Date().toLocaleTimeString('ar')} — تم إرسال ${result.sentCount} إشعار`]);
            
            // Reload data to reflect changes
            loadData();
          } catch (sendError) {
            console.error('Auto-send failed:', sendError);
            setAutoProcessLog(prev => [...prev.slice(-9), `❌ ${new Date().toLocaleTimeString('ar')} — فشل الإرسال: ${(sendError as Error).message}`]);
          }
        }
      } catch (error) {
        console.error('Auto-process check failed:', error);
      }
    };

    // Run immediately on mount, then every 60 seconds
    processScheduled();
    const interval = setInterval(processScheduled, 60_000);
    
    return () => clearInterval(interval);
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

      // 4. تحميل الصفحات المؤقتة
      try {
        const tpSnapshot = await getDocs(collection(db, 'tempPages'));
        setTempPages(tpSnapshot.docs.map(d => ({ id: d.id, title: (d.data() as { title?: string }).title || d.id })));
      } catch {}
      
    } catch (error) {
      console.error('Error loading data:', error);
    }
    
    setIsLoading(false);
  };

  // ========================================
  // دوال الترجمة
  // ========================================

  const updateTranslation = (lang: SupportedLanguage, field: 'title' | 'body', value: string) => {
    setTranslations(prev => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [field]: value,
      }
    }));
  };

  const copyFromArabic = () => {
    if (!translations.ar?.title || !translations.ar?.body) {
      alert('يرجى ملء العربي أولاً');
      return;
    }
    
    const newTranslations = { ...translations };
    SUPPORTED_LANGUAGES.forEach(lang => {
      if (lang.code !== 'ar') {
        newTranslations[lang.code] = {
          title: translations.ar?.title || '',
          body: translations.ar?.body || '',
        };
      }
    });
    setTranslations(newTranslations);
  };

  const applyPreset = (presetId: string) => {
    const preset = PRESET_NOTIFICATIONS.find(p => p.id === presetId);
    if (preset) {
      setTranslations(preset.translations);
      setSelectedPreset(presetId);
    }
  };

  const getFilledLanguagesCount = (): number => {
    return Object.entries(translations).filter(([_, t]) => t?.title && t?.body).length;
  };

  // ========================================
  // إرسال الإشعارات
  // ========================================

  const handleSendNow = async () => {
    if (!translations.ar?.title || !translations.ar?.body) {
      setSendResult({ success: false, message: 'يرجى ملء العنوان والمحتوى بالعربي على الأقل' });
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const result = await sendPushNotification({
        translations,
        targetAudience,
        targetLanguages: targetLanguages.length > 0 ? targetLanguages : undefined,
        actionUrl: actionUrl || undefined,
        imageUrl: imageUrl || undefined,
      });

      if (result.success) {
        // بناء رسالة تفصيلية
        let detailMsg = `✅ تم إرسال الإشعار بنجاح إلى ${result.sentCount} مستخدم`;
        if (Object.keys(result.perLanguage).length > 0) {
          const langDetails = Object.entries(result.perLanguage)
            .map(([lang, count]) => {
              const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === lang);
              return `${langInfo?.flag || ''} ${count}`;
            })
            .join(' | ');
          detailMsg += `\n📊 التوزيع: ${langDetails}`;
        }
        
        setSendResult({ success: true, message: detailMsg });
        
        // إعادة تحميل البيانات
        await loadData();
        
        // إغلاق النافذة بعد ثانيتين
        setTimeout(() => {
          setIsModalOpen(false);
          resetForm();
          setSendResult(null);
        }, 3000);
        
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
    if (!translations.ar?.title || !translations.ar?.body || !scheduledAt) {
      setSendResult({ success: false, message: 'يرجى ملء جميع الحقول المطلوبة' });
      return;
    }

    try {
      await addDoc(collection(db, 'notifications'), {
        translations,
        targetAudience,
        targetLanguages: targetLanguages.length > 0 ? targetLanguages : undefined,
        actionUrl,
        imageUrl,
        scheduledAt,
        status: 'scheduled',
        sentCount: 0,
        deliveredCount: 0,
        openedCount: 0,
        clickedCount: 0,
        createdAt: serverTimestamp(),
      });

      await loadData();
      setIsModalOpen(false);
      resetForm();
      
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

  const resetForm = () => {
    setTranslations(emptyTranslations);
    setTargetAudience('all');
    setTargetLanguages([]);
    setActionUrl('');
    setImageUrl('');
    setScheduledAt('');
    setSelectedPreset('');
    setExpandedLanguages(false);
  };

  // ========================================
  // دوال المساعدة
  // ========================================

  const getNotificationTitle = (n: PushNotification): string => {
    if (n.translations?.ar?.title) return n.translations.ar.title;
    if (n.titleAr) return n.titleAr;
    return 'بدون عنوان';
  };

  const getNotificationBody = (n: PushNotification): string => {
    if (n.translations?.ar?.body) return n.translations.ar.body;
    if (n.bodyAr) return n.bodyAr;
    return '';
  };

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
          <p className="text-slate-400 mt-1">إرسال إشعارات مترجمة لـ 12 لغة</p>
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
              resetForm();
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
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
              <div className="text-xl font-bold text-white">{userStats.withTokens}</div>
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
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Globe size={20} className="text-purple-400" />
            </div>
            <div>
              <div className="text-slate-400 text-sm">اللغات النشطة</div>
              <div className="text-xl font-bold text-white">
                {Object.keys(userStats.byLanguage || {}).length}
              </div>
            </div>
          </div>
        </div>
        {/* Auto-processor status */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400 text-sm">المعالج التلقائي</span>
          </div>
          <p className="text-xl font-bold text-emerald-400">نشط</p>
          <p className="text-xs text-slate-500 mt-1">فحص كل 60 ثانية</p>
        </div>
      </div>

      {/* توزيع اللغات */}
      {Object.keys(userStats.byLanguage || {}).length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <Languages size={18} />
            توزيع المستخدمين حسب اللغة
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(userStats.byLanguage || {})
              .sort((a, b) => b[1] - a[1])
              .map(([lang, count]) => {
                const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === lang);
                return (
                  <div 
                    key={lang}
                    className="flex items-center gap-2 bg-slate-700/50 px-3 py-2 rounded-lg"
                  >
                    <span>{langInfo?.flag || '🌐'}</span>
                    <span className="text-slate-300">{langInfo?.name || lang}</span>
                    <span className="text-emerald-400 font-bold">{count}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* التبويبات */}
      <div className="flex gap-2 border-b border-slate-700 pb-4">
        {[
          { id: 'push', label: 'إشعارات فورية', icon: Zap },
          { id: 'scheduled', label: 'مجدولة', icon: Calendar },
          { id: 'reminders', label: 'التذكيرات', icon: Bell },
          { id: 'reengagement', label: 'إعادة التفاعل', icon: UserX },
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
                  title={reminder.isActive ? 'تعطيل التذكير' : 'تفعيل التذكير'}
                  aria-label={reminder.isActive ? 'تعطيل التذكير' : 'تفعيل التذكير'}
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
      ) : activeTab === 'reengagement' ? (
        <ReengagementTab />
      ) : (
        <>
          {/* سجل المعالجة التلقائية */}
          {activeTab === 'scheduled' && autoProcessLog.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 mb-4">
              <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <RefreshCw size={14} className="text-emerald-400 animate-spin" />
                سجل المعالجة التلقائية
              </h4>
              <div className="space-y-1 text-sm font-mono">
                {autoProcessLog.map((log, i) => (
                  <div key={i} className="text-slate-400">{log}</div>
                ))}
              </div>
            </div>
          )}
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
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
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
                          {/* عدد اللغات */}
                          {notification.translations && (
                            <span className="text-purple-400 text-xs flex items-center gap-1">
                              <Globe size={12} />
                              {Object.keys(notification.translations).length} لغة
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-white mb-1">{getNotificationTitle(notification)}</h3>
                        <p className="text-slate-400 text-sm">{getNotificationBody(notification)}</p>

                        {notification.status === 'sent' && (
                          <div className="flex gap-4 mt-3 text-sm flex-wrap">
                            <span className="text-slate-400">
                              أُرسل: <span className="text-white font-medium">{notification.sentCount?.toLocaleString() || 0}</span>
                            </span>
                            <span className="text-slate-400">
                              وصل: <span className="text-white font-medium">{notification.deliveredCount?.toLocaleString() || 0}</span>
                            </span>
                            <span className="text-slate-400">
                              فتح: <span className="text-emerald-400 font-medium">{getOpenRate(notification)}</span>
                            </span>
                          </div>
                        )}

                        {/* توزيع حسب اللغة */}
                        {notification.perLanguage && Object.keys(notification.perLanguage).length > 0 && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {Object.entries(notification.perLanguage).map(([lang, count]) => {
                              const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === lang);
                              return (
                                <span key={lang} className="text-xs bg-slate-700/50 px-2 py-1 rounded">
                                  {langInfo?.flag} {count}
                                </span>
                              );
                            })}
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
                        title="حذف الإشعار"
                        aria-label="حذف الإشعار"
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
        </>
      )}

      {/* نافذة إنشاء إشعار */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-700">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div>
                <h2 className="text-xl font-bold text-white">إشعار جديد</h2>
                <p className="text-slate-400 text-sm">يدعم 12 لغة - كل مستخدم يستلم الإشعار بلغته</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                title="إغلاق"
                aria-label="إغلاق"
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[65vh] space-y-4">
              {/* رسالة النتيجة */}
              {sendResult && (
                <div className={`p-4 rounded-xl flex items-start gap-2 ${
                  sendResult.success 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/50'
                }`}>
                  {sendResult.success ? <CheckCircle size={20} className="mt-0.5" /> : <AlertCircle size={20} className="mt-0.5" />}
                  <div className="whitespace-pre-line">{sendResult.message}</div>
                </div>
              )}

              {/* اختيار نموذج جاهز */}
              <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
                <label className="block text-sm text-slate-400 mb-2">
                  اختر نموذج جاهز (اختياري) - يملأ جميع اللغات تلقائياً
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {PRESET_NOTIFICATIONS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset.id)}
                      className={`p-3 rounded-xl border text-sm transition-all ${
                        selectedPreset === preset.id
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* اللغات الرئيسية (عربي + إنجليزي) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* العربي */}
                <div className="bg-slate-700/30 rounded-xl p-4 border border-emerald-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🇸🇦</span>
                    <span className="font-bold text-white">العربية (أساسي) *</span>
                  </div>
                  <input
                    type="text"
                    value={translations.ar?.title || ''}
                    onChange={e => updateTranslation('ar', 'title', e.target.value)}
                    className="w-full bg-slate-700 rounded-xl px-4 py-3 mb-3 focus:ring-2 focus:ring-emerald-500 outline-none text-white"
                    placeholder="العنوان"
                    aria-label="عنوان الإشعار بالعربية"
                  />
                  <textarea
                    value={translations.ar?.body || ''}
                    onChange={e => updateTranslation('ar', 'body', e.target.value)}
                    rows={2}
                    className="w-full bg-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-white"
                    placeholder="المحتوى"
                    aria-label="محتوى الإشعار بالعربية"
                  />
                </div>

                {/* الإنجليزي */}
                <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🇺🇸</span>
                    <span className="font-bold text-white">English</span>
                  </div>
                  <input
                    type="text"
                    value={translations.en?.title || ''}
                    onChange={e => updateTranslation('en', 'title', e.target.value)}
                    className="w-full bg-slate-700 rounded-xl px-4 py-3 mb-3 focus:ring-2 focus:ring-emerald-500 outline-none text-white"
                    placeholder="Title"
                    aria-label="Notification title in English"
                    dir="ltr"
                  />
                  <textarea
                    value={translations.en?.body || ''}
                    onChange={e => updateTranslation('en', 'body', e.target.value)}
                    rows={2}
                    className="w-full bg-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-white"
                    placeholder="Body"
                    aria-label="Notification body in English"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* زر نسخ العربي لكل اللغات */}
              <div className="flex items-center justify-between">
                <button
                  onClick={copyFromArabic}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-300 transition-colors"
                >
                  <Copy size={16} />
                  نسخ العربي لكل اللغات
                </button>
                <div className="flex items-center gap-2 text-sm">
                  <Globe size={16} className="text-purple-400" />
                  <span className="text-slate-400">
                    {getFilledLanguagesCount()} / 12 لغة مملوءة
                  </span>
                </div>
              </div>

              {/* باقي اللغات (قابل للطي) */}
              <div className="border border-slate-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedLanguages(!expandedLanguages)}
                  className="w-full flex items-center justify-between p-4 bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                >
                  <span className="text-white font-medium flex items-center gap-2">
                    <Languages size={18} />
                    باقي اللغات (10 لغات)
                  </span>
                  {expandedLanguages ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                </button>
                
                {expandedLanguages && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800/50">
                    {SUPPORTED_LANGUAGES
                      .filter(lang => lang.code !== 'ar' && lang.code !== 'en')
                      .map(lang => (
                        <div key={lang.code} className="bg-slate-700/30 rounded-xl p-3 border border-slate-600/50">
                          <div className="flex items-center gap-2 mb-2">
                            <span>{lang.flag}</span>
                            <span className="font-medium text-white text-sm">{lang.name}</span>
                            {translations[lang.code]?.title && translations[lang.code]?.body && (
                              <CheckCircle size={14} className="text-emerald-400" />
                            )}
                          </div>
                          <input
                            type="text"
                            value={translations[lang.code]?.title || ''}
                            onChange={e => updateTranslation(lang.code, 'title', e.target.value)}
                            className="w-full bg-slate-700 rounded-lg px-3 py-2 mb-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-white"
                            placeholder="العنوان"
                            aria-label={`عنوان الإشعار ب${lang.name}`}
                            dir={lang.rtl ? 'rtl' : 'ltr'}
                          />
                          <textarea
                            value={translations[lang.code]?.body || ''}
                            onChange={e => updateTranslation(lang.code, 'body', e.target.value)}
                            rows={2}
                            className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-white"
                            placeholder="المحتوى"
                            aria-label={`محتوى الإشعار ب${lang.name}`}
                            dir={lang.rtl ? 'rtl' : 'ltr'}
                          />
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* الاستهداف */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">الجمهور المستهدف</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {TARGET_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setTargetAudience(opt.value)}
                      className={`p-3 rounded-xl border transition-all text-right ${
                        targetAudience === opt.value
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

              {/* تصفية حسب اللغة */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">تصفية حسب لغة التطبيق (اختياري)</label>
                <p className="text-xs text-slate-500 mb-2">اترك الكل فارغ للإرسال لجميع اللغات</p>
                <div className="flex flex-wrap gap-2">
                  {SUPPORTED_LANGUAGES.map(lang => {
                    const isSelected = targetLanguages.includes(lang.code);
                    return (
                      <button
                        key={lang.code}
                        onClick={() => setTargetLanguages(prev =>
                          isSelected ? prev.filter(l => l !== lang.code) : [...prev, lang.code]
                        )}
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                            : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        {lang.flag} {lang.name}
                      </button>
                    );
                  })}
                </div>
                {targetLanguages.length > 0 && (
                  <p className="text-xs text-emerald-400 mt-2">
                    سيتم الإرسال فقط للمستخدمين الذين لغة تطبيقهم: {targetLanguages.map(l => SUPPORTED_LANGUAGES.find(s => s.code === l)?.name).join('، ')}
                  </p>
                )}
              </div>

              {/* الإجراء */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">فتح صفحة عند النقر (اختياري)</label>
                <select
                  value={actionUrl}
                  onChange={e => setActionUrl(e.target.value)}
                  title="فتح صفحة عند النقر"
                  aria-label="فتح صفحة عند النقر"
                  className="w-full bg-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none text-white"
                >
                  <option value="">بدون إجراء</option>
                  {APP_SCREENS.map(screen => (
                    <option key={screen.value} value={screen.value}>{screen.label}</option>
                  ))}
                  {tempPages.length > 0 && (
                    <optgroup label="📄 صفحات مؤقتة">
                      {tempPages.map(tp => (
                        <option key={tp.id} value={`/temp-page/${tp.id}`}>📄 {tp.title}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* الجدولة والصورة */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">جدولة الإرسال (اختياري)</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                    className="w-full bg-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none text-white"
                    title="جدولة الإرسال"
                    aria-label="جدولة الإرسال"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">صورة (اختياري)</label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    className="w-full bg-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none text-white"
                    placeholder="https://..."
                    aria-label="رابط الصورة"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center gap-3 p-4 border-t border-slate-700">
              <div className="text-sm text-slate-400">
                سيتم الإرسال إلى ~{userStats.withTokens} مستخدم ({getFilledLanguagesCount()} لغة)
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors text-white"
                >
                  إلغاء
                </button>
                {scheduledAt ? (
                  <button
                    onClick={handleSchedule}
                    disabled={!translations.ar?.title || !translations.ar?.body}
                    className="flex items-center gap-2 px-6 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 rounded-xl transition-colors text-white"
                  >
                    <Calendar size={18} />
                    جدولة
                  </button>
                ) : (
                  <button
                    onClick={handleSendNow}
                    disabled={!translations.ar?.title || !translations.ar?.body || isSending}
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

// ==================== إعادة التفاعل ====================

const DEFAULT_REENGAGEMENT: NotificationTranslations = {
  ar: { title: 'اشتقنالك! 💚', body: 'حان الوقت لتعود لأذكارك وعباداتك' },
  en: { title: 'We miss you! 💚', body: "It's time to return to your daily adhkar" },
  fr: { title: 'Tu nous manques ! 💚', body: 'Il est temps de revenir à vos adhkar quotidiens' },
  de: { title: 'Du fehlst uns! 💚', body: 'Es ist Zeit, zu deinen täglichen Adhkar zurückzukehren' },
  es: { title: '¡Te extrañamos! 💚', body: 'Es hora de volver a tus adhkar diarios' },
  tr: { title: 'Seni özledik! 💚', body: 'Günlük zikirlerine dönme zamanı' },
  ur: { title: 'ہم آپ کو یاد کرتے ہیں! 💚', body: 'آپ کے روزانہ اذکار پر واپس آنے کا وقت آ گیا ہے' },
  id: { title: 'Kami merindukanmu! 💚', body: 'Saatnya kembali ke dzikir harianmu' },
  ms: { title: 'Kami rindu anda! 💚', body: 'Masa untuk kembali ke zikir harian anda' },
  hi: { title: 'हम आपको याद करते हैं! 💚', body: 'अपने दैनिक अज़कार पर लौटने का समय आ गया है' },
  bn: { title: 'আমরা আপনাকে মিস করি! 💚', body: 'আপনার দৈনিক আযকারে ফিরে আসার সময় হয়েছে' },
  ru: { title: 'Мы скучаем! 💚', body: 'Пора вернуться к ежедневным азкарам' },
};

const THRESHOLD_OPTIONS = [7, 14, 30, 60, 90];

const ReengagementTab: React.FC = () => {
  const [inactiveDays, setInactiveDays] = useState(30);
  const [customDays, setCustomDays] = useState('');
  const [translations, setTranslations] = useState<NotificationTranslations>(DEFAULT_REENGAGEMENT);
  const [inactiveCount, setInactiveCount] = useState<number | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [autoSend, setAutoSend] = useState(false);
  const [autoSendIntervalDays, setAutoSendIntervalDays] = useState(7);
  const [lastAutoSentAt, setLastAutoSentAt] = useState<string | null>(null);
  const [lastSentCount, setLastSentCount] = useState<number | null>(null);
  const [savingAutoSend, setSavingAutoSend] = useState(false);

  // Fetch inactive count when threshold changes
  useEffect(() => {
    let cancelled = false;
    setLoadingCount(true);
    getInactiveUserCount(inactiveDays).then(count => {
      if (!cancelled) {
        setInactiveCount(count);
        setLoadingCount(false);
      }
    });
    return () => { cancelled = true; };
  }, [inactiveDays]);

  // Load saved settings from Firestore
  useEffect(() => {
    const load = async () => {
      try {
        const { getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'appConfig', 'reengagementSettings'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.inactiveDays) setInactiveDays(data.inactiveDays);
          if (data.translations) setTranslations(data.translations);
          if (data.autoSend !== undefined) setAutoSend(data.autoSend);
          if (data.autoSendIntervalDays) setAutoSendIntervalDays(data.autoSendIntervalDays);
          if (data.lastAutoSentAt) setLastAutoSentAt(data.lastAutoSentAt);
          if (data.lastSentCount !== undefined) setLastSentCount(data.lastSentCount);

          // Auto-send check: if enabled and interval has elapsed, trigger send
          if (data.autoSend && data.autoSendIntervalDays && data.translations) {
            const lastSent = data.lastAutoSentAt ? new Date(data.lastAutoSentAt).getTime() : 0;
            const intervalMs = (data.autoSendIntervalDays || 7) * 24 * 60 * 60 * 1000;
            if (Date.now() - lastSent >= intervalMs) {
              // Trigger auto-send
              try {
                const result = await sendReengagementNotification({
                  translations: data.translations,
                  inactiveDays: data.inactiveDays || 30,
                  actionUrl: '/',
                });
                const now = new Date().toISOString();
                const { setDoc: setDocAutoFn } = await import('firebase/firestore');
                await setDocAutoFn(doc(db, 'appConfig', 'reengagementSettings'), {
                  lastAutoSentAt: now,
                  lastSentAt: now,
                  lastSentCount: result.sentCount,
                }, { merge: true });
                setLastAutoSentAt(now);
                setLastSentCount(result.sentCount);
                setSendResult(`✅ تم الإرسال التلقائي — ${result.sentCount} مستخدم`);
              } catch {}
            }
          }
        }
      } catch {}
    };
    load();
  }, []);

  const handleSend = async () => {
    setIsSending(true);
    setSendResult(null);
    try {
      const result = await sendReengagementNotification({
        translations,
        inactiveDays,
        actionUrl: '/',
      });

      const now = new Date().toISOString();
      // Save settings for future
      const { setDoc: setDocFn } = await import('firebase/firestore');
      await setDocFn(doc(db, 'appConfig', 'reengagementSettings'), {
        inactiveDays,
        translations,
        lastSentAt: now,
        lastAutoSentAt: now,
        lastSentCount: result.sentCount,
      }, { merge: true });

      setLastAutoSentAt(now);
      setLastSentCount(result.sentCount);

      setSendResult(
        result.success
          ? `✅ تم الإرسال بنجاح — ${result.sentCount} مستخدم`
          : `❌ فشل الإرسال: ${result.errors[0] || 'خطأ غير معروف'}`
      );
    } catch (error) {
      setSendResult(`❌ خطأ: ${(error as Error).message}`);
    }
    setIsSending(false);
  };

  const handleSaveAutoSend = async () => {
    setSavingAutoSend(true);
    try {
      const { setDoc: setDocFn } = await import('firebase/firestore');
      await setDocFn(doc(db, 'appConfig', 'reengagementSettings'), {
        autoSend,
        autoSendIntervalDays,
        inactiveDays,
        translations,
      }, { merge: true });
      setSendResult(autoSend ? '✅ تم تفعيل الإرسال التلقائي' : '✅ تم إيقاف الإرسال التلقائي');
    } catch (error) {
      setSendResult(`❌ خطأ: ${(error as Error).message}`);
    }
    setSavingAutoSend(false);
  };

  const handleCustomDays = () => {
    const num = parseInt(customDays, 10);
    if (num >= 1 && num <= 365) {
      setInactiveDays(num);
      setCustomDays('');
    }
  };

  const updateTranslation = (lang: SupportedLanguage, field: 'title' | 'body', value: string) => {
    setTranslations(prev => ({
      ...prev,
      [lang]: { ...prev[lang], [field]: value },
    }));
  };

  return (
    <div className="space-y-6">
      {/* عتبة عدم النشاط */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <UserX size={20} className="text-orange-400" />
          عتبة عدم النشاط
        </h3>
        <div className="flex gap-2 flex-wrap items-center">
          {THRESHOLD_OPTIONS.map(days => (
            <button
              key={days}
              onClick={() => setInactiveDays(days)}
              className={`px-4 py-2 rounded-lg transition-all ${
                inactiveDays === days && !customDays
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {days} يوم
            </button>
          ))}
          {/* Custom threshold input */}
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              max={365}
              value={customDays}
              onChange={e => setCustomDays(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCustomDays()}
              placeholder="مخصص"
              aria-label="عدد أيام مخصص لعتبة عدم النشاط"
              className="w-20 bg-slate-700 text-white rounded-lg px-3 py-2 text-sm text-center placeholder-slate-500"
            />
            <button
              onClick={handleCustomDays}
              disabled={!customDays}
              className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white text-sm transition-all"
            >
              ✓
            </button>
          </div>
          {!THRESHOLD_OPTIONS.includes(inactiveDays) && (
            <span className="px-4 py-2 rounded-lg bg-emerald-600 text-white">
              {inactiveDays} يوم
            </span>
          )}
        </div>
        <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
          <p className="text-slate-300">
            {loadingCount ? (
              <span className="animate-pulse">جاري العد...</span>
            ) : (
              <>
                <span className="text-emerald-400 font-bold text-lg">{inactiveCount ?? 0}</span>
                {' '}مستخدم غير نشط منذ {inactiveDays} يوم
              </>
            )}
          </p>
        </div>
      </div>

      {/* الإرسال التلقائي */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <RefreshCw size={20} className="text-purple-400" />
          الإرسال التلقائي
        </h3>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white font-medium">تفعيل الإرسال التلقائي</p>
            <p className="text-slate-400 text-sm">إرسال إشعارات تلقائية للمستخدمين غير النشطين بشكل دوري</p>
          </div>
          <button
            onClick={() => setAutoSend(!autoSend)}
            title={autoSend ? 'إيقاف الإرسال التلقائي' : 'تفعيل الإرسال التلقائي'}
            aria-label={autoSend ? 'إيقاف الإرسال التلقائي' : 'تفعيل الإرسال التلقائي'}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              autoSend ? 'bg-emerald-600' : 'bg-slate-600'
            }`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
              autoSend ? 'right-0.5' : 'left-0.5'
            }`} />
          </button>
        </div>

        {autoSend && (
          <div className="space-y-3 pt-3 border-t border-slate-700/50">
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-slate-400" />
              <span className="text-slate-300 text-sm">التكرار كل:</span>
              <div className="flex gap-2">
                {[3, 7, 14, 30].map(d => (
                  <button
                    key={d}
                    onClick={() => setAutoSendIntervalDays(d)}
                    className={`px-3 py-1 rounded-lg text-sm transition-all ${
                      autoSendIntervalDays === d
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {d} أيام
                  </button>
                ))}
              </div>
            </div>

            {lastAutoSentAt && (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <CheckCircle size={14} className="text-emerald-400" />
                آخر إرسال: {new Date(lastAutoSentAt).toLocaleDateString('ar-EG', { 
                  year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
                {lastSentCount !== null && (
                  <span className="text-emerald-400">({lastSentCount} مستخدم)</span>
                )}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleSaveAutoSend}
          disabled={savingAutoSend}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white rounded-lg text-sm transition-all"
        >
          {savingAutoSend ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <CheckCircle size={14} />
          )}
          {savingAutoSend ? 'جاري الحفظ...' : 'حفظ إعدادات الإرسال التلقائي'}
        </button>
      </div>

      {/* قوالب الرسائل */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <Languages size={20} className="text-blue-400" />
          قوالب الرسائل (12 لغة)
        </h3>

        {/* Auto-translate notification body */}
        <div className="mb-6">
          <AutoTranslateField
            label="ترجمة نص الإشعار تلقائياً"
            fieldName="notificationBody"
            contentType="notification"
            initialValues={Object.fromEntries(
              SUPPORTED_LANGUAGES.map(l => [l.code, translations[l.code as SupportedLanguage]?.body || ''])
            )}
            onSave={(result) => {
              Object.entries(result).forEach(([code, text]) => {
                if (text) updateTranslation(code as SupportedLanguage, 'body', text);
              });
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SUPPORTED_LANGUAGES.map(lang => (
            <div key={lang.code} className="bg-slate-700/50 rounded-lg p-3">
              <p className="text-slate-400 text-sm mb-2">{lang.name}</p>
              <input
                className="w-full bg-slate-600/50 text-white rounded px-3 py-1.5 text-sm mb-2"
                placeholder="العنوان"
                aria-label={`عنوان إشعار إعادة التفاعل ب${lang.name}`}
                value={translations[lang.code as SupportedLanguage]?.title || ''}
                onChange={e => updateTranslation(lang.code as SupportedLanguage, 'title', e.target.value)}
              />
              <input
                className="w-full bg-slate-600/50 text-white rounded px-3 py-1.5 text-sm"
                placeholder="النص"
                aria-label={`نص إشعار إعادة التفاعل ب${lang.name}`}
                value={translations[lang.code as SupportedLanguage]?.body || ''}
                onChange={e => updateTranslation(lang.code as SupportedLanguage, 'body', e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* زر الإرسال */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSend}
          disabled={isSending || !inactiveCount}
          className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 text-white rounded-xl transition-all"
        >
          <Send size={18} />
          {isSending ? 'جاري الإرسال...' : 'إرسال إشعار إعادة التفاعل'}
        </button>
        {sendResult && (
          <p className={`text-sm ${sendResult.startsWith('✅') ? 'text-emerald-400' : 'text-red-400'}`}>
            {sendResult}
          </p>
        )}
      </div>
    </div>
  );
};
