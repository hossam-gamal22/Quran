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
  Zap,
  RefreshCw,
  Smartphone,
  Globe,
  Copy,
  ChevronDown,
  ChevronUp,
  Languages,
} from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  getDoc,
  setDoc,
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
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  NotificationTranslations,
  UserStats
} from '../services/pushNotifications';
import TranslateButton from '../components/TranslateButton';

// ========================================
// الأنواع
// ========================================

type NotificationStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
type TargetAudience = 'all' | 'ios' | 'android' | 'active' | 'inactive' | 'single_user';

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
  sentCount?: number;
  deliveredCount?: number;
  openedCount?: number;
  clickedCount?: number;
  perLanguage?: { [lang: string]: number };
  createdAt: Timestamp | string;
  sentAt?: Timestamp | string;
}

interface ScheduledReminder {
  id: string;
  name: string;
  emoji: string;
  category: string;
  titleAr: string;
  bodyAr: string;
  titleEn: string;
  bodyEn: string;
  time: string;
  isActive: boolean;
  repeatDays: number[];
  hasScheduling: boolean;
  note?: string;
}

// Notification text overrides stored in Firestore
interface NotificationTextOverrides {
  [typeId: string]: {
    title: { [lang: string]: string };
    body: { [lang: string]: string };
    updatedAt?: string;
  };
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
  { value: 'single_user', label: 'مستخدم محدد', icon: '👤' },
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
  { value: '/religious-stories', label: 'قصص دينية' },
  { value: '/radio', label: 'إذاعة القرآن' },
  { value: '/hadith-of-day', label: 'حديث اليوم' },
  { value: '/worship-tracker', label: 'تتبع العبادات' },
  { value: '/subscription', label: 'الاشتراك' },
];

// === جميع أنواع الإشعارات مع النصوص الحقيقية من التطبيق ===
const ALL_NOTIFICATION_TYPES = [
  // --- 📿 الأذكار ---
  { id: 'morning', category: 'azkar', name: 'أذكار الصباح', emoji: '🌅', time: '06:00',
    titleAr: 'نور صباحك بالذكر 🌅', bodyAr: 'حان الآن وقت أذكار الصباح.. حصن يومك بذكر الله.',
    titleEn: 'Morning Wird', bodyEn: 'Time for morning adhkar — start your day with Allah.',
    hasScheduling: true, firestoreCategory: 'morningAzkar' },
  { id: 'evening', category: 'azkar', name: 'أذكار المساء', emoji: '🌙', time: '17:45',
    titleAr: 'هدوء المساء بذكر الله 🌙', bodyAr: 'وقت أذكار المساء.. اطمئن بذكر خالقك قبل غروب يومك.',
    titleEn: 'Evening Wird', bodyEn: 'Time for evening adhkar — find peace before sunset.',
    hasScheduling: true, firestoreCategory: 'eveningAzkar' },
  { id: 'sleep', category: 'azkar', name: 'أذكار النوم', emoji: '😴', time: '22:00',
    titleAr: 'في أمان الله 😴', bodyAr: 'لا تنسَ أذكار النوم.. لتنم في حفظ الله ورعايته.',
    titleEn: 'Sleep Azkar', bodyEn: 'Don\'t forget sleep adhkar — sleep under Allah\'s protection.',
    hasScheduling: true, firestoreCategory: 'sleepAzkar' },
  { id: 'wakeup', category: 'azkar', name: 'أذكار الاستيقاظ', emoji: '☀️', time: '10:00',
    titleAr: 'الحمد لله الذي أحيانا ☀️', bodyAr: 'أذكار الاستيقاظ.. ابدأ يومك بالحمد لتنال البركة.',
    titleEn: 'Wakeup Azkar', bodyEn: 'Start your day with praise and gratitude.',
    hasScheduling: true, firestoreCategory: 'wakeupAzkar' },
  { id: 'after_prayer', category: 'azkar', name: 'أذكار بعد الصلاة', emoji: '✨', time: '',
    titleAr: 'أتممت صلاتك.. فلا تفرّط في أجرها ✨', bodyAr: 'لا تنسَ أذكار ما بعد الصلاة لتكتمل طاعتك.',
    titleEn: 'After Prayer Azkar', bodyEn: 'Don\'t forget post-prayer adhkar.',
    hasScheduling: false, note: 'يظهر تلقائياً بعد 5 دقائق من كل صلاة' },
  // --- 🕌 مواقيت الصلاة ---
  { id: 'prayer_fajr', category: 'prayer', name: 'صلاة الفجر', emoji: '🌙', time: '',
    titleAr: 'الفجر.. نورٌ في قلبك 🌙', bodyAr: 'حي على الصلاة.. الفجر مطلع السكينة.',
    titleEn: 'Fajr Prayer', bodyEn: 'Time for Fajr prayer — the dawn of tranquility.',
    hasScheduling: false, note: 'يتم جدولتها تلقائياً حسب مواقيت الصلاة' },
  { id: 'prayer_sunrise', category: 'prayer', name: 'الشروق', emoji: '🌅', time: '',
    titleAr: 'أشرقت الأرض بنور ربها 🌅', bodyAr: 'وقت الشروق.. ابدأ سعيك مستعيناً بالله.',
    titleEn: 'Sunrise', bodyEn: 'Sunrise time — start your efforts trusting in Allah.',
    hasScheduling: false, note: 'يتم جدولتها تلقائياً حسب مواقيت الصلاة' },
  { id: 'prayer_dhuhr', category: 'prayer', name: 'صلاة الظهر', emoji: '☀️', time: '',
    titleAr: 'الظهر.. استراحة المؤمن ☀️', bodyAr: 'حان وقت صلاة الظهر.. جدد طاقتك بالوقوف بين يدي الله.',
    titleEn: 'Dhuhr Prayer', bodyEn: 'Time for Dhuhr prayer — renew your energy.',
    hasScheduling: false, note: 'يتم جدولتها تلقائياً حسب مواقيت الصلاة' },
  { id: 'prayer_asr', category: 'prayer', name: 'صلاة العصر', emoji: '🌤️', time: '',
    titleAr: 'العصر.. الصلاة الوسطى 🌤️', bodyAr: 'حان وقت صلاة العصر.. حافظ عليها لتنال عظيم الأجر.',
    titleEn: 'Asr Prayer', bodyEn: 'Time for Asr prayer — the middle prayer.',
    hasScheduling: false, note: 'يتم جدولتها تلقائياً حسب مواقيت الصلاة' },
  { id: 'prayer_maghrib', category: 'prayer', name: 'صلاة المغرب', emoji: '🌇', time: '',
    titleAr: 'المغرب.. ختام النهار الطاهر 🌇', bodyAr: 'حان وقت صلاة المغرب.. بارك الله في يومك.',
    titleEn: 'Maghrib Prayer', bodyEn: 'Time for Maghrib prayer — blessed evening.',
    hasScheduling: false, note: 'يتم جدولتها تلقائياً حسب مواقيت الصلاة' },
  { id: 'prayer_isha', category: 'prayer', name: 'صلاة العشاء', emoji: '✨', time: '',
    titleAr: 'العشاء.. سكنٌ وطمأنينة ✨', bodyAr: 'حان وقت صلاة العشاء.. اختم يومك بصلاة تريح قلبك.',
    titleEn: 'Isha Prayer', bodyEn: 'Time for Isha prayer — end your day in peace.',
    hasScheduling: false, note: 'يتم جدولتها تلقائياً حسب مواقيت الصلاة' },
  // --- 📖 القرآن ---
  { id: 'daily_ayah', category: 'quran', name: 'آية اليوم', emoji: '📖', time: '13:30',
    titleAr: 'رسالة الله إليك اليوم 📖', bodyAr: '(يتم إضافة نص الآية تلقائياً)',
    titleEn: 'Verse of the Day', bodyEn: '(Verse text added automatically)',
    hasScheduling: true, firestoreCategory: 'dailyVerse', note: 'نص الآية يُضاف تلقائياً أسفل العنوان' },
  { id: 'friday', category: 'quran', name: 'سورة الكهف', emoji: '🕯️', time: '14:00',
    titleAr: 'نورٌ ما بين الجمعتين 🕯️', bodyAr: 'لا تنسَ قراءة سورة الكهف اليوم.. نورٌ وبركة ليومك.',
    titleEn: 'Friday — Surah Al-Kahf', bodyEn: 'Don\'t forget to read Surah Al-Kahf today.',
    hasScheduling: true, firestoreCategory: 'kahfFriday' },
  { id: 'quran', category: 'quran', name: 'ورد القرآن', emoji: '📚', time: '20:00',
    titleAr: 'وقت وردك القرآني 📖', bodyAr: 'القليل الدائم خيرٌ من الكثير المنقطع.. ابدأ وردك الآن.',
    titleEn: 'Quran Reading', bodyEn: 'Time for your daily Quran reading.',
    hasScheduling: true, firestoreCategory: 'quranReading' },
  // --- hand-heart تسبيح وصلاة ---
  { id: 'salawat', category: 'dhikr', name: 'الصلاة على النبي', emoji: '💚', time: '17:00',
    titleAr: 'صلِّ على الحبيب ﷺ 💚', bodyAr: '"إن الله وملائكته يصلون على النبي".. عطر لسانك الآن.',
    titleEn: 'Salawat', bodyEn: 'Time to send blessings upon the Prophet ﷺ.',
    hasScheduling: true, firestoreCategory: 'salawat' },
  { id: 'tasbih', category: 'dhikr', name: 'التسبيح', emoji: '📿', time: '21:00',
    titleAr: 'سبّح ليرتاح قلبك 📿', bodyAr: '"سبحان الله وبحمده".. غراس الجنة تناديك.',
    titleEn: 'Tasbih Reminder', bodyEn: 'SubhanAllah wa bihamdihi — seeds of Paradise await.',
    hasScheduling: true, firestoreCategory: 'tasbih' },
  { id: 'istighfar', category: 'dhikr', name: 'الاستغفار', emoji: 'hand-heart', time: '19:00',
    titleAr: 'استغفر.. يفتح الله لك الأبواب ✨', bodyAr: 'أستغفر الله العظيم وأتوب إليه.. طهّر صحيفتك الآن.',
    titleEn: 'Istighfar', bodyEn: 'Astaghfirullah — purify your record now.',
    hasScheduling: true, firestoreCategory: 'istighfar' },
  // --- 📊 العبادات ---
  { id: 'worship_daily', category: 'worship', name: 'ملخص العبادات اليومي', emoji: '📊', time: '23:00',
    titleAr: 'إنجازك الروحاني اليوم 📊', bodyAr: 'راجع جدول عباداتك اليوم.. خطوة بخطوة نحو الجنة.',
    titleEn: 'Daily Worship Summary', bodyEn: 'Review your daily worship — step by step to Jannah.',
    hasScheduling: false, note: 'يظهر يومياً في الوقت المحدد من المستخدم' },
  { id: 'worship_weekly', category: 'worship', name: 'التقرير الأسبوعي', emoji: '📈', time: '',
    titleAr: 'حصاد الأسبوع 📈', bodyAr: 'اطلع على تقريرك الأسبوعي.. استمر في التطور.',
    titleEn: 'Weekly Worship Report', bodyEn: 'Review your weekly worship statistics.',
    hasScheduling: false, note: 'يظهر كل جمعة' },
];

const REMINDER_CATEGORIES = [
  { id: 'azkar', name: 'الأذكار', emoji: '📿' },
  { id: 'prayer', name: 'مواقيت الصلاة', emoji: '🕌' },
  { id: 'quran', name: 'القرآن', emoji: '📖' },
  { id: 'dhikr', name: 'تسبيح وصلاة', emoji: 'hand-heart' },
  { id: 'worship', name: 'العبادات', emoji: '📊' },
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

// Mapping from admin reminder IDs → Firestore notificationDefaults category keys
const REMINDER_TO_CATEGORY: Record<string, string> = {
  morning: 'morningAzkar',
  evening: 'eveningAzkar',
  sleep: 'sleepAzkar',
  wakeup: 'wakeupAzkar',
  friday: 'kahfFriday',
  quran: 'quranReading',
  daily_ayah: 'dailyVerse',
  salawat: 'salawat',
  tasbih: 'tasbih',
  istighfar: 'istighfar',
};

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
  const [activeTab, setActiveTab] = useState<'push' | 'scheduled' | 'reminders' | 'history'>('push');
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
  const [reminderSaving, setReminderSaving] = useState(false);
  const [notificationTexts, setNotificationTexts] = useState<NotificationTextOverrides>({});
  const [editingTextType, setEditingTextType] = useState<string | null>(null);
  const [editingTexts, setEditingTexts] = useState<NotificationTranslations>({});
  const [textSaveResult, setTextSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // نموذج الإشعار - يدعم 12 لغة
  const emptyTranslations: NotificationTranslations = {
    ar: { title: '', body: '' },
    en: { title: '', body: '' },
  };

  const [translations, setTranslations] = useState<NotificationTranslations>(emptyTranslations);
  const [targetAudience, setTargetAudience] = useState<TargetAudience>('all');
  const [targetLanguages, setTargetLanguages] = useState<string[]>([]);
  const [targetCountries, setTargetCountries] = useState<string[]>([]);
  const [targetUserId, setTargetUserId] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

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
      
      // 3. تحميل إعدادات التذكيرات من Firestore (appConfig/notificationDefaults)
      //    + تحميل النصوص المخصصة من Firestore (appConfig/notificationTexts)
      try {
        const [defaultsSnap, textsSnap] = await Promise.all([
          getDoc(doc(db, 'appConfig', 'notificationDefaults')),
          getDoc(doc(db, 'appConfig', 'notificationTexts')),
        ]);
        const defaultsData = defaultsSnap.exists() ? defaultsSnap.data() : {};
        const textsData = (textsSnap.exists() ? textsSnap.data() : {}) as NotificationTextOverrides;
        setNotificationTexts(textsData);

        setReminders(
          ALL_NOTIFICATION_TYPES.map(r => {
            const categoryKey = r.firestoreCategory;
            const legacyDailyAyahConfig = r.id === 'daily_ayah' ? defaultsData.dailyAyah : null;
            const adminConfig = categoryKey ? (defaultsData[categoryKey] || legacyDailyAyahConfig) : null;
            const textOverride = textsData[r.id];
            return {
              id: r.id,
              name: r.name,
              emoji: r.emoji,
              category: r.category,
              titleAr: textOverride?.title?.ar || r.titleAr,
              bodyAr: textOverride?.body?.ar || r.bodyAr,
              titleEn: textOverride?.title?.en || r.titleEn,
              bodyEn: textOverride?.body?.en || r.bodyEn,
              time: adminConfig?.times?.[0] || r.time,
              isActive: adminConfig?.enabled ?? true,
              repeatDays: adminConfig?.days ?? (r.id === 'friday' ? [5] : [0, 1, 2, 3, 4, 5, 6]),
              hasScheduling: r.hasScheduling,
              note: r.note,
            };
          })
        );
      } catch (err) {
        console.error('Error loading reminder/text settings from Firestore:', err);
        // Fall back to hardcoded defaults
        setReminders(
          ALL_NOTIFICATION_TYPES.map(r => ({
            id: r.id,
            name: r.name,
            emoji: r.emoji,
            category: r.category,
            titleAr: r.titleAr,
            bodyAr: r.bodyAr,
            titleEn: r.titleEn,
            bodyEn: r.bodyEn,
            time: r.time,
            isActive: true,
            repeatDays: r.id === 'friday' ? [5] : [0, 1, 2, 3, 4, 5, 6],
            hasScheduling: r.hasScheduling,
            note: r.note,
          }))
        );
      }

      // 4. تحميل الصفحات المؤقتة
      try {
        const tpSnapshot = await getDocs(collection(db, 'tempPages'));
        setTempPages(tpSnapshot.docs.map(d => ({ id: d.id, title: (d.data() as { title?: string }).title || d.id })));
      } catch {
        // Optional temp pages collection may not exist yet.
      }
      
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
    return Object.values(translations).filter(t => t?.title && t?.body).length;
  };

  // ========================================
  // إرسال الإشعارات
  // ========================================

  const handleSendNow = async () => {
    if (!translations.ar?.title || !translations.ar?.body) {
      setSendResult({ success: false, message: 'يرجى ملء العنوان والمحتوى بالعربي على الأقل' });
      return;
    }

    if (targetAudience === 'single_user' && !targetUserId) {
      setSendResult({ success: false, message: 'يرجى إدخال معرّف المستخدم' });
      return;
    }

    // ⚠️ Mass-send confirmation: protect against accidental broadcasts.
    if (targetAudience !== 'single_user') {
      const audience = targetLanguages.length > 0
        ? `لغات: ${targetLanguages.join('، ')}`
        : targetCountries.length > 0
          ? `دول: ${targetCountries.join('، ')}`
          : 'جميع المستخدمين';
      const estimated = userStats?.withTokens ?? '؟';
      const ok = confirm(
        `⚠️ تأكيد الإرسال الجماعي\n\n` +
        `الجمهور: ${audience}\n` +
        `العدد المتوقع: ~${estimated} مستخدم\n` +
        `العنوان: "${translations.ar.title}"\n\n` +
        `هل تريد المتابعة؟`
      );
      if (!ok) return;
      const second = prompt(
        `للتأكيد النهائي اكتب: إرسال`
      );
      if (second?.trim() !== 'إرسال') {
        setSendResult({ success: false, message: 'تم إلغاء الإرسال' });
        return;
      }
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const result = await sendPushNotification({
        translations,
        targetAudience,
        targetLanguages: targetLanguages.length > 0 ? targetLanguages : undefined,
        targetCountries: targetCountries.length > 0 ? targetCountries : undefined,
        targetUserId: targetAudience === 'single_user' ? targetUserId : undefined,
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

    if (targetAudience === 'single_user' && !targetUserId.trim()) {
      setSendResult({ success: false, message: 'يرجى إدخال معرّف المستخدم قبل جدولة إشعار لمستخدم محدد' });
      return;
    }

    try {
      const scheduledDate = new Date(scheduledAt);
      if (Number.isNaN(scheduledDate.getTime())) {
        setSendResult({ success: false, message: 'وقت الجدولة غير صحيح' });
        return;
      }

      const scheduleDoc: Record<string, any> = {
        translations,
        targetAudience,
        scheduledAt: scheduledDate.toISOString(),
        scheduledAtLocal: scheduledAt,
        scheduledTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        status: 'scheduled',
        sentCount: 0,
        deliveredCount: 0,
        openedCount: 0,
        clickedCount: 0,
        createdAt: serverTimestamp(),
      };
      if (targetLanguages.length > 0) scheduleDoc.targetLanguages = targetLanguages;
      if (targetCountries.length > 0) scheduleDoc.targetCountries = targetCountries;
      if (targetAudience === 'single_user') scheduleDoc.targetUserId = targetUserId;
      if (actionUrl) scheduleDoc.actionUrl = actionUrl;
      if (imageUrl) scheduleDoc.imageUrl = imageUrl;
      await addDoc(collection(db, 'notifications'), scheduleDoc);

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

  // ========================================
  // حفظ التذكيرات في Firestore
  // ========================================

  const saveRemindersToFirestore = async (updatedReminders: ScheduledReminder[]) => {
    setReminderSaving(true);
    try {
      const updates: Record<string, any> = {};
      for (const reminder of updatedReminders) {
        const categoryKey = REMINDER_TO_CATEGORY[reminder.id];
        if (!categoryKey) continue;
        if (!reminder.hasScheduling) continue;
        updates[categoryKey] = {
          enabled: reminder.isActive,
          times: [reminder.time],
          days: reminder.repeatDays,
        };
      }
      // Bump configVersion so the app knows to clear user overrides and apply new defaults
      const currentDoc = await getDoc(doc(db, 'appConfig', 'notificationDefaults'));
      const currentVersion = currentDoc.exists() ? (currentDoc.data()?.configVersion ?? 0) : 0;
      updates.configVersion = currentVersion + 1;
      await setDoc(doc(db, 'appConfig', 'notificationDefaults'), updates, { merge: true });
      console.log(`✅ Reminder settings saved to Firestore (configVersion: ${updates.configVersion})`);
    } catch (err) {
      console.error('❌ Error saving reminder settings:', err);
    } finally {
      setReminderSaving(false);
    }
  };

  // ========================================
  // حفظ نصوص الإشعارات في Firestore
  // ========================================

  const saveNotificationTexts = async (typeId: string, texts: NotificationTranslations) => {
    setReminderSaving(true);
    try {
      const titleMap: Record<string, string> = {};
      const bodyMap: Record<string, string> = {};
      Object.entries(texts).forEach(([lang, t]) => {
        if (t?.title) titleMap[lang] = t.title;
        if (t?.body) bodyMap[lang] = t.body;
      });
      await setDoc(doc(db, 'appConfig', 'notificationTexts'), {
        [typeId]: {
          title: titleMap,
          body: bodyMap,
          updatedAt: new Date().toISOString(),
        }
      }, { merge: true });

      // Update local state
      setNotificationTexts(prev => ({
        ...prev,
        [typeId]: { title: titleMap, body: bodyMap, updatedAt: new Date().toISOString() },
      }));

      // Update the reminder in the list
      setReminders(prev => prev.map(r => {
        if (r.id !== typeId) return r;
        return {
          ...r,
          titleAr: titleMap.ar || r.titleAr,
          bodyAr: bodyMap.ar || r.bodyAr,
          titleEn: titleMap.en || r.titleEn,
          bodyEn: bodyMap.en || r.bodyEn,
        };
      }));

      setTextSaveResult({ success: true, message: '✅ تم حفظ النصوص بنجاح' });
      setTimeout(() => setTextSaveResult(null), 2000);
      console.log(`✅ Notification texts saved for ${typeId}`);
    } catch (err) {
      console.error('❌ Error saving notification texts:', err);
      setTextSaveResult({ success: false, message: '❌ فشل حفظ النصوص' });
    } finally {
      setReminderSaving(false);
    }
  };

  const handleSaveInlineText = async (id: string, field: 'titleAr' | 'bodyAr', value: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    // Debounced save happens when user clicks save or switches away
  };

  const handleOpenTextEditor = (typeId: string) => {
    const reminder = reminders.find(r => r.id === typeId);
    const existing = notificationTexts[typeId];
    const initial: NotificationTranslations = {
      ar: { title: existing?.title?.ar || reminder?.titleAr || '', body: existing?.body?.ar || reminder?.bodyAr || '' },
      en: { title: existing?.title?.en || reminder?.titleEn || '', body: existing?.body?.en || reminder?.bodyEn || '' },
    };
    // Fill other languages from existing overrides
    SUPPORTED_LANGUAGES.forEach(lang => {
      if (lang.code !== 'ar' && lang.code !== 'en' && existing?.title?.[lang.code]) {
        initial[lang.code as SupportedLanguage] = {
          title: existing.title[lang.code] || '',
          body: existing.body?.[lang.code] || '',
        };
      }
    });
    setEditingTexts(initial);
    setEditingTextType(typeId);
  };

  const toggleCategory = (catId: string) => {
    setCollapsedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const handleToggleReminder = async (id: string) => {
    const updated = reminders.map(r => (r.id === id ? { ...r, isActive: !r.isActive } : r));
    setReminders(updated);
    await saveRemindersToFirestore(updated);
  };

  const handleReminderTimeChange = async (id: string, time: string) => {
    const updated = reminders.map(r => (r.id === id ? { ...r, time } : r));
    setReminders(updated);
    await saveRemindersToFirestore(updated);
  };

  const handleReminderDayToggle = async (id: string, day: number) => {
    const updated = reminders.map(r => {
      if (r.id !== id) return r;
      const days = r.repeatDays.includes(day)
        ? r.repeatDays.filter(d => d !== day)
        : [...r.repeatDays, day].sort((a, b) => a - b);
      // Prevent empty days array — at least one day must be selected
      if (days.length === 0) return r;
      return { ...r, repeatDays: days };
    });
    setReminders(updated);
    await saveRemindersToFirestore(updated);
  };

  const resetForm = () => {
    setTranslations(emptyTranslations);
    setTargetAudience('all');
    setTargetLanguages([]);
    setTargetCountries([]);
    setTargetUserId('');
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

  const getAcceptedCount = (n: PushNotification): number => {
    const delivered = Number(n.deliveredCount);
    if (Number.isFinite(delivered) && delivered > 0) return delivered;

    const sent = Number(n.sentCount);
    return Number.isFinite(sent) && sent > 0 ? sent : 0;
  };

  const getOpenRate = (n: PushNotification): string => {
    const acceptedCount = getAcceptedCount(n);
    const openedCount = Number(n.openedCount);
    if (!acceptedCount || !Number.isFinite(openedCount)) return '0%';
    return `${((openedCount / acceptedCount) * 100).toFixed(1)}%`;
  };

  const getStatusMeta = (status: NotificationStatus) => {
    if (status === 'sent') return { label: '✅ مرسل', className: 'bg-accent/20 text-accent-light' };
    if (status === 'scheduled') return { label: '⏰ مجدول', className: 'bg-amber-500/20 text-amber-400' };
    if (status === 'sending') return { label: 'جاري الإرسال', className: 'bg-blue-500/20 text-blue-300' };
    if (status === 'failed') return { label: '❌ فشل', className: 'bg-red-500/20 text-red-400' };
    return { label: 'مسودة', className: 'bg-admin-muted/20 text-slate-400' };
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
            className="flex items-center gap-2 px-4 py-2 bg-admin-surface-light hover:bg-admin-surface-light rounded-xl text-white transition-colors"
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
            className="flex items-center gap-2 bg-accent-dark hover:bg-accent-dark px-4 py-2 rounded-xl text-white transition-colors"
          >
            <Plus size={18} />
            إشعار جديد
          </button>
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-admin-surface/50 rounded-xl p-4 border border-admin-border/50">
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
        <div className="bg-admin-surface/50 rounded-xl p-4 border border-admin-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/20 rounded-lg">
              <Smartphone size={20} className="text-accent-light" />
            </div>
            <div>
              <div className="text-slate-400 text-sm">لديهم توكن</div>
              <div className="text-xl font-bold text-white">{userStats.withTokens}</div>
            </div>
          </div>
        </div>
        <div className="bg-admin-surface/50 rounded-xl p-4 border border-admin-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-admin-muted/20 rounded-lg">
              <span className="text-lg">🍎</span>
            </div>
            <div>
              <div className="text-slate-400 text-sm">iOS</div>
              <div className="text-xl font-bold text-white">{userStats.ios}</div>
            </div>
          </div>
        </div>
        <div className="bg-admin-surface/50 rounded-xl p-4 border border-admin-border/50">
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
        <div className="bg-admin-surface/50 rounded-xl p-4 border border-admin-border/50">
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
        <div className="bg-admin-surface/50 rounded-xl p-4 border border-admin-border/50">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400 text-sm">المعالج التلقائي</span>
          </div>
          <p className="text-xl font-bold text-accent-light">نشط</p>
          <p className="text-xs text-slate-500 mt-1">فحص كل 60 ثانية</p>
        </div>
      </div>

      {/* توزيع اللغات */}
      {Object.keys(userStats.byLanguage || {}).length > 0 && (
        <div className="bg-admin-surface/50 rounded-xl p-4 border border-admin-border/50">
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
                    className="flex items-center gap-2 bg-admin-surface-light/50 px-3 py-2 rounded-lg"
                  >
                    <span>{langInfo?.flag || '🌐'}</span>
                    <span className="text-slate-300">{langInfo?.name || lang}</span>
                    <span className="text-accent-light font-bold">{count}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* التبويبات */}
      <div className="flex gap-2 border-b border-admin-border pb-4">
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
                ? 'bg-accent-dark text-white'
                : 'text-slate-400 hover:text-white hover:bg-admin-surface'
            }`}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* المحتوى */}
      {activeTab === 'reminders' ? (
        <div className="space-y-4">
          {/* Saving indicator */}
          {reminderSaving && (
            <div className="flex items-center gap-2 text-accent-light text-sm">
              <div className="animate-spin w-4 h-4 border-2 border-accent border-t-transparent rounded-full" />
              جاري الحفظ...
            </div>
          )}
          {textSaveResult && (
            <div className={`p-3 rounded-xl text-sm ${
              textSaveResult.success ? 'bg-accent/20 text-accent-light' : 'bg-red-500/20 text-red-400'
            }`}>
              {textSaveResult.message}
            </div>
          )}

          <p className="text-slate-400 text-sm">
            جميع أنواع الإشعارات في التطبيق ({ALL_NOTIFICATION_TYPES.length} نوع) — يمكنك تعديل النصوص وإعدادات الجدولة
          </p>

          {REMINDER_CATEGORIES.map(cat => {
            const catReminders = reminders.filter(r => r.category === cat.id);
            const isCollapsed = collapsedCategories[cat.id];
            return (
              <div key={cat.id} className="bg-admin-surface/30 rounded-xl border border-admin-border/50 overflow-hidden">
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-admin-surface-light/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{cat.emoji}</span>
                    <h3 className="text-white font-bold text-lg">{cat.name}</h3>
                    <span className="text-slate-500 text-sm">({catReminders.length})</span>
                  </div>
                  {isCollapsed
                    ? <ChevronDown size={20} className="text-slate-400" />
                    : <ChevronUp size={20} className="text-slate-400" />
                  }
                </button>

                {/* Category items */}
                {!isCollapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 pt-0">
                    {catReminders.map(reminder => (
                      <div
                        key={reminder.id}
                        className={`bg-admin-surface/50 rounded-xl p-4 border transition-all ${
                          reminder.isActive ? 'border-accent/30' : 'border-admin-border/50 opacity-60'
                        }`}
                      >
                        {/* Header: emoji + name + toggle */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{reminder.emoji}</span>
                            <h4 className="font-bold text-white text-sm">{reminder.name}</h4>
                          </div>
                          {reminder.hasScheduling && (
                            <button
                              onClick={() => handleToggleReminder(reminder.id)}
                              title={reminder.isActive ? 'تعطيل' : 'تفعيل'}
                              aria-label={reminder.isActive ? 'تعطيل التذكير' : 'تفعيل التذكير'}
                              className={`relative w-10 h-5 rounded-full transition-colors ${
                                reminder.isActive ? 'bg-accent' : 'bg-admin-surface-light'
                              }`}
                            >
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                                reminder.isActive ? 'right-0.5' : 'left-0.5'
                              }`} />
                            </button>
                          )}
                        </div>

                        {/* Editable title */}
                        <div className="space-y-2 mb-3">
                          <input
                            type="text"
                            value={reminder.titleAr}
                            onChange={e => handleSaveInlineText(reminder.id, 'titleAr', e.target.value)}
                            className="w-full bg-admin-surface-light/50 text-white text-sm rounded-lg px-3 py-2 border border-admin-border/30 focus:outline-none focus:border-accent/50"
                            placeholder="عنوان الإشعار"
                            dir="rtl"
                          />
                          <textarea
                            value={reminder.bodyAr}
                            onChange={e => handleSaveInlineText(reminder.id, 'bodyAr', e.target.value)}
                            rows={2}
                            className="w-full bg-admin-surface-light/50 text-slate-300 text-sm rounded-lg px-3 py-2 border border-admin-border/30 focus:outline-none focus:border-accent/50 resize-none"
                            placeholder="نص الإشعار"
                            dir="rtl"
                          />
                        </div>

                        {/* Note (if no scheduling) */}
                        {reminder.note && (
                          <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                            <AlertCircle size={12} />
                            {reminder.note}
                          </p>
                        )}

                        {/* Scheduling controls (time + days) */}
                        {reminder.hasScheduling && (
                          <div className="space-y-2 mb-3">
                            <input
                              type="time"
                              value={reminder.time}
                              onChange={e => handleReminderTimeChange(reminder.id, e.target.value)}
                              aria-label={`وقت ${reminder.name}`}
                              className="bg-admin-surface-light/50 text-accent-light text-sm rounded-lg px-3 py-1.5 border border-admin-border/30 focus:outline-none focus:border-accent/50"
                            />
                            <div className="flex gap-1 flex-wrap">
                              {DAYS_OF_WEEK.map(day => (
                                <button
                                  key={day.value}
                                  type="button"
                                  onClick={() => handleReminderDayToggle(reminder.id, day.value)}
                                  className={`px-2 py-0.5 rounded text-xs cursor-pointer transition-colors ${
                                    reminder.repeatDays.includes(day.value)
                                      ? 'bg-accent/20 text-accent-light hover:bg-accent/30'
                                      : 'bg-admin-surface-light text-slate-500 hover:bg-admin-surface-light/80'
                                  }`}
                                >
                                  {day.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenTextEditor(reminder.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg text-xs transition-colors"
                          >
                            <Languages size={14} />
                            تعديل الترجمات ({Object.keys(notificationTexts[reminder.id]?.title || {}).length || 2})
                          </button>
                          <button
                            onClick={async () => {
                              const texts: NotificationTranslations = {
                                ar: { title: reminder.titleAr, body: reminder.bodyAr },
                                en: { title: reminder.titleEn, body: reminder.bodyEn },
                              };
                              // Preserve existing other-language overrides
                              const existing = notificationTexts[reminder.id];
                              if (existing) {
                                SUPPORTED_LANGUAGES.forEach(lang => {
                                  if (lang.code !== 'ar' && lang.code !== 'en' && existing.title?.[lang.code]) {
                                    texts[lang.code as SupportedLanguage] = {
                                      title: existing.title[lang.code],
                                      body: existing.body?.[lang.code] || '',
                                    };
                                  }
                                });
                              }
                              await saveNotificationTexts(reminder.id, texts);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/20 hover:bg-accent/30 text-accent-light rounded-lg text-xs transition-colors"
                          >
                            <CheckCircle size={14} />
                            حفظ النص
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <p className="text-slate-500 text-xs mt-2 text-center">
            التغييرات تُحفظ في Firestore وتنعكس على أجهزة المستخدمين عند فتح التطبيق
          </p>
        </div>

      ) : (
        <>
          {activeTab === 'scheduled' && (
            <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20 mb-4 text-sm text-emerald-200">
              الإشعارات المجدولة يتم إرسالها من Cloud Function كل دقيقة تقريباً، حتى لو لوحة التحكم مقفولة.
            </div>
          )}
        <div className="bg-admin-surface/50 rounded-xl border border-admin-border/50 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">
              <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4" />
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
                  <div key={notification.id} className="p-4 hover:bg-admin-surface-light/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {(() => {
                            const meta = getStatusMeta(notification.status);
                            return (
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${meta.className}`}
                          >
                            {meta.label}
                          </span>
                            );
                          })()}
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

                        {notification.status === 'scheduled' && notification.scheduledAt && (
                          <div className="text-xs text-amber-300 mt-2">
                            موعد الإرسال: {formatDate(notification.scheduledAt)}
                          </div>
                        )}

                        {notification.status === 'sent' && (
                          <div className="flex gap-4 mt-3 text-sm flex-wrap">
                            <span className="text-slate-400">
                              أُرسل: <span className="text-white font-medium">{notification.sentCount?.toLocaleString() || 0}</span>
                            </span>
                            <span className="text-slate-400">
                              قُبل: <span className="text-white font-medium">{getAcceptedCount(notification).toLocaleString()}</span>
                            </span>
                            <span className="text-slate-400">
                              فتح: <span className="text-accent-light font-medium">{getOpenRate(notification)}</span>
                            </span>
                          </div>
                        )}

                        {/* توزيع حسب اللغة */}
                        {notification.perLanguage && Object.keys(notification.perLanguage).length > 0 && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {Object.entries(notification.perLanguage).map(([lang, count]) => {
                              const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === lang);
                              return (
                                <span key={lang} className="text-xs bg-admin-surface-light/50 px-2 py-1 rounded">
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
                        className="p-2 hover:bg-admin-surface-light rounded-lg transition-colors text-slate-400 hover:text-red-400"
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

      {/* نافذة تعديل ترجمات الإشعار */}
      {editingTextType && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-admin-surface rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-admin-border">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-admin-border">
              <div>
                <h2 className="text-xl font-bold text-white">
                  تعديل ترجمات: {reminders.find(r => r.id === editingTextType)?.emoji}{' '}
                  {reminders.find(r => r.id === editingTextType)?.name}
                </h2>
                <p className="text-slate-400 text-sm">تعديل عنوان ونص الإشعار بـ 12 لغة</p>
              </div>
              <button
                onClick={() => setEditingTextType(null)}
                title="إغلاق"
                aria-label="إغلاق"
                className="p-2 hover:bg-admin-surface-light rounded-lg transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[65vh] space-y-4">
              {/* Arabic + English (primary) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-admin-surface-light/30 rounded-xl p-4 border border-accent/30">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🇸🇦</span>
                    <span className="font-bold text-white">العربية (أساسي) *</span>
                  </div>
                  <input
                    type="text"
                    value={editingTexts.ar?.title || ''}
                    onChange={e => setEditingTexts(prev => ({
                      ...prev, ar: { ...prev.ar, title: e.target.value, body: prev.ar?.body || '' }
                    }))}
                    className="w-full bg-admin-surface-light rounded-xl px-4 py-3 mb-3 focus:ring-2 focus:ring-accent outline-none text-white"
                    placeholder="العنوان"
                    dir="rtl"
                  />
                  <textarea
                    value={editingTexts.ar?.body || ''}
                    onChange={e => setEditingTexts(prev => ({
                      ...prev, ar: { ...prev.ar, title: prev.ar?.title || '', body: e.target.value }
                    }))}
                    rows={2}
                    className="w-full bg-admin-surface-light rounded-xl px-4 py-3 focus:ring-2 focus:ring-accent outline-none resize-none text-white"
                    placeholder="النص"
                    dir="rtl"
                  />
                </div>
                <div className="bg-admin-surface-light/30 rounded-xl p-4 border border-admin-border/50">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🇺🇸</span>
                    <span className="font-bold text-white">English</span>
                  </div>
                  <input
                    type="text"
                    value={editingTexts.en?.title || ''}
                    onChange={e => setEditingTexts(prev => ({
                      ...prev, en: { ...prev.en, title: e.target.value, body: prev.en?.body || '' }
                    }))}
                    className="w-full bg-admin-surface-light rounded-xl px-4 py-3 mb-3 focus:ring-2 focus:ring-accent outline-none text-white"
                    placeholder="Title"
                    dir="ltr"
                  />
                  <textarea
                    value={editingTexts.en?.body || ''}
                    onChange={e => setEditingTexts(prev => ({
                      ...prev, en: { ...prev.en, title: prev.en?.title || '', body: e.target.value }
                    }))}
                    rows={2}
                    className="w-full bg-admin-surface-light rounded-xl px-4 py-3 focus:ring-2 focus:ring-accent outline-none resize-none text-white"
                    placeholder="Body"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Copy Arabic to all */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (!editingTexts.ar?.title || !editingTexts.ar?.body) return;
                      const updated = { ...editingTexts };
                      SUPPORTED_LANGUAGES.forEach(lang => {
                        if (lang.code !== 'ar') {
                          updated[lang.code as SupportedLanguage] = {
                            title: editingTexts.ar?.title || '',
                            body: editingTexts.ar?.body || '',
                          };
                        }
                      });
                      setEditingTexts(updated);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-admin-surface-light hover:bg-admin-surface-light rounded-xl text-slate-300 transition-colors text-sm"
                  >
                    <Copy size={14} />
                    نسخ العربي لكل اللغات
                  </button>
                  <TranslateButton
                    sourceText={editingTexts.ar?.title || ''}
                    sourceLang="ar"
                    contentType="notification"
                    compact
                    onTranslated={(t) => {
                      const updated = { ...editingTexts };
                      Object.entries(t).forEach(([code, text]) => {
                        const lang = code as SupportedLanguage;
                        if (lang !== 'ar') {
                          updated[lang] = { ...updated[lang], title: text, body: updated[lang]?.body || '' };
                        }
                      });
                      setEditingTexts(updated);
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Globe size={14} className="text-purple-400" />
                  <span className="text-slate-400">
                    {Object.values(editingTexts).filter(t => t?.title && t?.body).length} / 12 لغة
                  </span>
                </div>
              </div>

              {/* Other languages */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SUPPORTED_LANGUAGES
                  .filter(lang => lang.code !== 'ar' && lang.code !== 'en')
                  .map(lang => (
                    <div key={lang.code} className="bg-admin-surface-light/30 rounded-xl p-3 border border-admin-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <span>{lang.flag}</span>
                        <span className="font-medium text-white text-sm">{lang.name}</span>
                        {editingTexts[lang.code as SupportedLanguage]?.title && editingTexts[lang.code as SupportedLanguage]?.body && (
                          <CheckCircle size={12} className="text-accent-light" />
                        )}
                      </div>
                      <input
                        type="text"
                        value={editingTexts[lang.code as SupportedLanguage]?.title || ''}
                        onChange={e => setEditingTexts(prev => ({
                          ...prev,
                          [lang.code]: { ...prev[lang.code as SupportedLanguage], title: e.target.value, body: prev[lang.code as SupportedLanguage]?.body || '' }
                        }))}
                        className="w-full bg-admin-surface-light rounded-lg px-3 py-2 mb-2 text-sm focus:ring-2 focus:ring-accent outline-none text-white"
                        placeholder="العنوان"
                        dir={lang.rtl ? 'rtl' : 'ltr'}
                      />
                      <textarea
                        value={editingTexts[lang.code as SupportedLanguage]?.body || ''}
                        onChange={e => setEditingTexts(prev => ({
                          ...prev,
                          [lang.code]: { ...prev[lang.code as SupportedLanguage], title: prev[lang.code as SupportedLanguage]?.title || '', body: e.target.value }
                        }))}
                        rows={2}
                        className="w-full bg-admin-surface-light rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none resize-none text-white"
                        placeholder="النص"
                        dir={lang.rtl ? 'rtl' : 'ltr'}
                      />
                    </div>
                  ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center gap-3 p-4 border-t border-admin-border">
              <div className="text-sm text-slate-400">
                {Object.values(editingTexts).filter(t => t?.title && t?.body).length} لغة مملوءة
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingTextType(null)}
                  className="px-6 py-2 bg-admin-surface-light hover:bg-admin-surface-light rounded-xl transition-colors text-white"
                >
                  إلغاء
                </button>
                <button
                  onClick={async () => {
                    if (editingTextType) {
                      await saveNotificationTexts(editingTextType, editingTexts);
                      setEditingTextType(null);
                    }
                  }}
                  disabled={!editingTexts.ar?.title || !editingTexts.ar?.body}
                  className="flex items-center gap-2 px-6 py-2 bg-accent-dark hover:bg-accent-dark disabled:bg-admin-surface-light rounded-xl transition-colors text-white"
                >
                  <CheckCircle size={18} />
                  حفظ الترجمات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تعديل ترجمات الإشعار */}
      {editingTextType && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-admin-surface rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-admin-border">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-admin-border">
              <div>
                <h2 className="text-xl font-bold text-white">
                  تعديل ترجمات: {reminders.find(r => r.id === editingTextType)?.emoji}{' '}
                  {reminders.find(r => r.id === editingTextType)?.name}
                </h2>
                <p className="text-slate-400 text-sm">تعديل عنوان ونص الإشعار بـ 12 لغة</p>
              </div>
              <button
                onClick={() => setEditingTextType(null)}
                title="إغلاق"
                aria-label="إغلاق"
                className="p-2 hover:bg-admin-surface-light rounded-lg transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[65vh] space-y-4">
              {/* Arabic + English (primary) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-admin-surface-light/30 rounded-xl p-4 border border-accent/30">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🇸🇦</span>
                    <span className="font-bold text-white">العربية (أساسي) *</span>
                  </div>
                  <input
                    type="text"
                    value={editingTexts.ar?.title || ''}
                    onChange={e => setEditingTexts(prev => ({
                      ...prev, ar: { ...prev.ar, title: e.target.value, body: prev.ar?.body || '' }
                    }))}
                    className="w-full bg-admin-surface-light rounded-xl px-4 py-3 mb-3 focus:ring-2 focus:ring-accent outline-none text-white"
                    placeholder="العنوان"
                    dir="rtl"
                  />
                  <textarea
                    value={editingTexts.ar?.body || ''}
                    onChange={e => setEditingTexts(prev => ({
                      ...prev, ar: { ...prev.ar, title: prev.ar?.title || '', body: e.target.value }
                    }))}
                    rows={2}
                    className="w-full bg-admin-surface-light rounded-xl px-4 py-3 focus:ring-2 focus:ring-accent outline-none resize-none text-white"
                    placeholder="النص"
                    dir="rtl"
                  />
                </div>
                <div className="bg-admin-surface-light/30 rounded-xl p-4 border border-admin-border/50">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🇺🇸</span>
                    <span className="font-bold text-white">English</span>
                  </div>
                  <input
                    type="text"
                    value={editingTexts.en?.title || ''}
                    onChange={e => setEditingTexts(prev => ({
                      ...prev, en: { ...prev.en, title: e.target.value, body: prev.en?.body || '' }
                    }))}
                    className="w-full bg-admin-surface-light rounded-xl px-4 py-3 mb-3 focus:ring-2 focus:ring-accent outline-none text-white"
                    placeholder="Title"
                    dir="ltr"
                  />
                  <textarea
                    value={editingTexts.en?.body || ''}
                    onChange={e => setEditingTexts(prev => ({
                      ...prev, en: { ...prev.en, title: prev.en?.title || '', body: e.target.value }
                    }))}
                    rows={2}
                    className="w-full bg-admin-surface-light rounded-xl px-4 py-3 focus:ring-2 focus:ring-accent outline-none resize-none text-white"
                    placeholder="Body"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Copy Arabic to all */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (!editingTexts.ar?.title || !editingTexts.ar?.body) return;
                      const updated = { ...editingTexts };
                      SUPPORTED_LANGUAGES.forEach(lang => {
                        if (lang.code !== 'ar') {
                          updated[lang.code as SupportedLanguage] = {
                            title: editingTexts.ar?.title || '',
                            body: editingTexts.ar?.body || '',
                          };
                        }
                      });
                      setEditingTexts(updated);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-admin-surface-light hover:bg-admin-surface-light rounded-xl text-slate-300 transition-colors text-sm"
                  >
                    <Copy size={14} />
                    نسخ العربي لكل اللغات
                  </button>
                  <TranslateButton
                    sourceText={editingTexts.ar?.title || ''}
                    sourceLang="ar"
                    contentType="notification"
                    compact
                    onTranslated={(t) => {
                      const updated = { ...editingTexts };
                      Object.entries(t).forEach(([code, text]) => {
                        const lang = code as SupportedLanguage;
                        if (lang !== 'ar') {
                          updated[lang] = { ...updated[lang], title: text, body: updated[lang]?.body || '' };
                        }
                      });
                      setEditingTexts(updated);
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Globe size={14} className="text-purple-400" />
                  <span className="text-slate-400">
                    {Object.values(editingTexts).filter(t => t?.title && t?.body).length} / 12 لغة
                  </span>
                </div>
              </div>

              {/* Other languages */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SUPPORTED_LANGUAGES
                  .filter(lang => lang.code !== 'ar' && lang.code !== 'en')
                  .map(lang => (
                    <div key={lang.code} className="bg-admin-surface-light/30 rounded-xl p-3 border border-admin-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <span>{lang.flag}</span>
                        <span className="font-medium text-white text-sm">{lang.name}</span>
                        {editingTexts[lang.code as SupportedLanguage]?.title && editingTexts[lang.code as SupportedLanguage]?.body && (
                          <CheckCircle size={12} className="text-accent-light" />
                        )}
                      </div>
                      <input
                        type="text"
                        value={editingTexts[lang.code as SupportedLanguage]?.title || ''}
                        onChange={e => setEditingTexts(prev => ({
                          ...prev,
                          [lang.code]: { ...prev[lang.code as SupportedLanguage], title: e.target.value, body: prev[lang.code as SupportedLanguage]?.body || '' }
                        }))}
                        className="w-full bg-admin-surface-light rounded-lg px-3 py-2 mb-2 text-sm focus:ring-2 focus:ring-accent outline-none text-white"
                        placeholder="العنوان"
                        dir={lang.rtl ? 'rtl' : 'ltr'}
                      />
                      <textarea
                        value={editingTexts[lang.code as SupportedLanguage]?.body || ''}
                        onChange={e => setEditingTexts(prev => ({
                          ...prev,
                          [lang.code]: { ...prev[lang.code as SupportedLanguage], title: prev[lang.code as SupportedLanguage]?.title || '', body: e.target.value }
                        }))}
                        rows={2}
                        className="w-full bg-admin-surface-light rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none resize-none text-white"
                        placeholder="النص"
                        dir={lang.rtl ? 'rtl' : 'ltr'}
                      />
                    </div>
                  ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center gap-3 p-4 border-t border-admin-border">
              <div className="text-sm text-slate-400">
                {Object.values(editingTexts).filter(t => t?.title && t?.body).length} لغة مملوءة
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingTextType(null)}
                  className="px-6 py-2 bg-admin-surface-light hover:bg-admin-surface-light rounded-xl transition-colors text-white"
                >
                  إلغاء
                </button>
                <button
                  onClick={async () => {
                    if (editingTextType) {
                      await saveNotificationTexts(editingTextType, editingTexts);
                      setEditingTextType(null);
                    }
                  }}
                  disabled={!editingTexts.ar?.title || !editingTexts.ar?.body}
                  className="flex items-center gap-2 px-6 py-2 bg-accent-dark hover:bg-accent-dark disabled:bg-admin-surface-light rounded-xl transition-colors text-white"
                >
                  <CheckCircle size={18} />
                  حفظ الترجمات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إنشاء إشعار */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-admin-surface rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-admin-border">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-admin-border">
              <div>
                <h2 className="text-xl font-bold text-white">إشعار جديد</h2>
                <p className="text-slate-400 text-sm">يدعم 12 لغة - كل مستخدم يستلم الإشعار بلغته</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                title="إغلاق"
                aria-label="إغلاق"
                className="p-2 hover:bg-admin-surface-light rounded-lg transition-colors text-slate-400"
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
                    ? 'bg-accent/20 text-accent-light border border-accent/50' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/50'
                }`}>
                  {sendResult.success ? <CheckCircle size={20} className="mt-0.5" /> : <AlertCircle size={20} className="mt-0.5" />}
                  <div className="whitespace-pre-line">{sendResult.message}</div>
                </div>
              )}

              {/* اختيار نموذج جاهز */}
              <div className="bg-admin-surface-light/30 rounded-xl p-4 border border-admin-border/50">
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
                          ? 'bg-accent/20 border-accent text-accent-light'
                          : 'bg-admin-surface-light/50 border-admin-border text-slate-300 hover:border-slate-500'
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
                <div className="bg-admin-surface-light/30 rounded-xl p-4 border border-accent/30">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🇸🇦</span>
                    <span className="font-bold text-white">العربية (أساسي) *</span>
                  </div>
                  <input
                    type="text"
                    value={translations.ar?.title || ''}
                    onChange={e => updateTranslation('ar', 'title', e.target.value)}
                    className="w-full bg-admin-surface-light rounded-xl px-4 py-3 mb-3 focus:ring-2 focus:ring-accent outline-none text-white"
                    placeholder="العنوان"
                    aria-label="عنوان الإشعار بالعربية"
                  />
                  <textarea
                    value={translations.ar?.body || ''}
                    onChange={e => updateTranslation('ar', 'body', e.target.value)}
                    rows={2}
                    className="w-full bg-admin-surface-light rounded-xl px-4 py-3 focus:ring-2 focus:ring-accent outline-none resize-none text-white"
                    placeholder="المحتوى"
                    aria-label="محتوى الإشعار بالعربية"
                  />
                </div>

                {/* الإنجليزي */}
                <div className="bg-admin-surface-light/30 rounded-xl p-4 border border-admin-border/50">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🇺🇸</span>
                    <span className="font-bold text-white">English</span>
                  </div>
                  <input
                    type="text"
                    value={translations.en?.title || ''}
                    onChange={e => updateTranslation('en', 'title', e.target.value)}
                    className="w-full bg-admin-surface-light rounded-xl px-4 py-3 mb-3 focus:ring-2 focus:ring-accent outline-none text-white"
                    placeholder="Title"
                    aria-label="Notification title in English"
                    dir="ltr"
                  />
                  <textarea
                    value={translations.en?.body || ''}
                    onChange={e => updateTranslation('en', 'body', e.target.value)}
                    rows={2}
                    className="w-full bg-admin-surface-light rounded-xl px-4 py-3 focus:ring-2 focus:ring-accent outline-none resize-none text-white"
                    placeholder="Body"
                    aria-label="Notification body in English"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* زر نسخ العربي لكل اللغات */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyFromArabic}
                    className="flex items-center gap-2 px-4 py-2 bg-admin-surface-light hover:bg-admin-surface-light rounded-xl text-slate-300 transition-colors"
                  >
                    <Copy size={16} />
                    نسخ العربي لكل اللغات
                  </button>
                  <TranslateButton
                    sourceText={translations.ar?.title || ''}
                    sourceLang="ar"
                    contentType="notification"
                    compact
                    onTranslated={(t) => {
                      const updated = { ...translations };
                      Object.entries(t).forEach(([code, text]) => {
                        const lang = code as SupportedLanguage;
                        if (lang !== 'ar') {
                          updated[lang] = { ...updated[lang], title: text, body: updated[lang]?.body || '' };
                        }
                      });
                      setTranslations(updated);
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Globe size={16} className="text-purple-400" />
                  <span className="text-slate-400">
                    {getFilledLanguagesCount()} / 12 لغة مملوءة
                  </span>
                </div>
              </div>

              {/* باقي اللغات (قابل للطي) */}
              <div className="border border-admin-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedLanguages(!expandedLanguages)}
                  className="w-full flex items-center justify-between p-4 bg-admin-surface-light/30 hover:bg-admin-surface-light/50 transition-colors"
                >
                  <span className="text-white font-medium flex items-center gap-2">
                    <Languages size={18} />
                    باقي اللغات (10 لغات)
                  </span>
                  {expandedLanguages ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                </button>
                
                {expandedLanguages && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-admin-surface/50">
                    {SUPPORTED_LANGUAGES
                      .filter(lang => lang.code !== 'ar' && lang.code !== 'en')
                      .map(lang => (
                        <div key={lang.code} className="bg-admin-surface-light/30 rounded-xl p-3 border border-admin-border/50">
                          <div className="flex items-center gap-2 mb-2">
                            <span>{lang.flag}</span>
                            <span className="font-medium text-white text-sm">{lang.name}</span>
                            {translations[lang.code]?.title && translations[lang.code]?.body && (
                              <CheckCircle size={14} className="text-accent-light" />
                            )}
                          </div>
                          <input
                            type="text"
                            value={translations[lang.code]?.title || ''}
                            onChange={e => updateTranslation(lang.code, 'title', e.target.value)}
                            className="w-full bg-admin-surface-light rounded-lg px-3 py-2 mb-2 text-sm focus:ring-2 focus:ring-accent outline-none text-white"
                            placeholder="العنوان"
                            aria-label={`عنوان الإشعار ب${lang.name}`}
                            dir={lang.rtl ? 'rtl' : 'ltr'}
                          />
                          <textarea
                            value={translations[lang.code]?.body || ''}
                            onChange={e => updateTranslation(lang.code, 'body', e.target.value)}
                            rows={2}
                            className="w-full bg-admin-surface-light rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none resize-none text-white"
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
                          ? 'bg-accent/20 border-accent text-accent-light'
                          : 'bg-admin-surface-light/50 border-admin-border text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span className="text-lg ml-2">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>

                {targetAudience === 'single_user' && (
                  <div className="mt-3">
                    <label className="block text-sm text-slate-400 mb-2">معرّف المستخدم (User ID)</label>
                    <input
                      type="text"
                      placeholder="انسخ المعرّف من صفحة المستخدمين"
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value.trim())}
                      dir="ltr"
                      className="w-full bg-admin-surface-light rounded-xl px-4 py-3 focus:ring-2 focus:ring-accent outline-none text-white font-mono text-sm"
                    />
                  </div>
                )}
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
                            ? 'bg-accent/20 border-accent text-accent-light'
                            : 'bg-admin-surface-light/50 border-admin-border text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        {lang.flag} {lang.name}
                      </button>
                    );
                  })}
                </div>
                {targetLanguages.length > 0 && (
                  <p className="text-xs text-accent-light mt-2">
                    سيتم الإرسال فقط للمستخدمين الذين لغة تطبيقهم: {targetLanguages.map(l => SUPPORTED_LANGUAGES.find(s => s.code === l)?.name).join('، ')}
                  </p>
                )}
              </div>

              {/* تصفية حسب الدولة */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">تصفية حسب الدولة (اختياري)</label>
                <p className="text-xs text-slate-500 mb-2">اترك الكل فارغ للإرسال لجميع الدول</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { code: 'SA', flag: '🇸🇦', name: 'السعودية' },
                    { code: 'EG', flag: '🇪🇬', name: 'مصر' },
                    { code: 'AE', flag: '🇦🇪', name: 'الإمارات' },
                    { code: 'MA', flag: '🇲🇦', name: 'المغرب' },
                    { code: 'DZ', flag: '🇩🇿', name: 'الجزائر' },
                    { code: 'TN', flag: '🇹🇳', name: 'تونس' },
                    { code: 'IQ', flag: '🇮🇶', name: 'العراق' },
                    { code: 'SY', flag: '🇸🇾', name: 'سوريا' },
                    { code: 'JO', flag: '🇯🇴', name: 'الأردن' },
                    { code: 'KW', flag: '🇰🇼', name: 'الكويت' },
                    { code: 'QA', flag: '🇶🇦', name: 'قطر' },
                    { code: 'OM', flag: '🇴🇲', name: 'عُمان' },
                    { code: 'YE', flag: '🇾🇪', name: 'اليمن' },
                    { code: 'LB', flag: '🇱🇧', name: 'لبنان' },
                    { code: 'BH', flag: '🇧🇭', name: 'البحرين' },
                    { code: 'ID', flag: '🇮🇩', name: 'إندونيسيا' },
                    { code: 'PK', flag: '🇵🇰', name: 'باكستان' },
                    { code: 'TR', flag: '🇹🇷', name: 'تركيا' },
                    { code: 'IN', flag: '🇮🇳', name: 'الهند' },
                    { code: 'BD', flag: '🇧🇩', name: 'بنغلاديش' },
                    { code: 'MY', flag: '🇲🇾', name: 'ماليزيا' },
                    { code: 'GB', flag: '🇬🇧', name: 'بريطانيا' },
                    { code: 'US', flag: '🇺🇸', name: 'أمريكا' },
                    { code: 'DE', flag: '🇩🇪', name: 'ألمانيا' },
                    { code: 'FR', flag: '🇫🇷', name: 'فرنسا' },
                    { code: 'RU', flag: '🇷🇺', name: 'روسيا' },
                    { code: 'SG', flag: '🇸🇬', name: 'سنغافورة' },
                  ].map(country => {
                    const isSelected = targetCountries.includes(country.code);
                    return (
                      <button
                        key={country.code}
                        onClick={() => setTargetCountries(prev =>
                          isSelected ? prev.filter(c => c !== country.code) : [...prev, country.code]
                        )}
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                          isSelected
                            ? 'bg-accent/20 border-accent text-accent-light'
                            : 'bg-admin-surface-light/50 border-admin-border text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        {country.flag} {country.name}
                      </button>
                    );
                  })}
                </div>
                {targetCountries.length > 0 && (
                  <p className="text-xs text-accent-light mt-2">
                    سيتم الإرسال حسب بلد موقع الصلاة أو تعديل الأدمن أو تصحيح تعارض التوقيت في: {targetCountries.join('، ')}
                  </p>
                )}
              </div>

              {/* الإجراء */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">فتح صفحة عند النقر (اختياري)</label>
                <select
                  value={actionUrl.startsWith('/') && !APP_SCREENS.some(s => s.value === actionUrl) && !tempPages.some(tp => `/temp-page/${tp.id}` === actionUrl) ? '__custom__' : actionUrl}
                  onChange={e => {
                    if (e.target.value === '__custom__') {
                      setActionUrl('/');
                    } else {
                      setActionUrl(e.target.value);
                    }
                  }}
                  title="فتح صفحة عند النقر"
                  aria-label="فتح صفحة عند النقر"
                  className="w-full bg-admin-surface-light rounded-xl px-4 py-3 focus:ring-2 focus:ring-accent outline-none text-white"
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
                  <option value="__custom__">✏️ رابط مخصص...</option>
                </select>
                {(actionUrl.startsWith('/') && !APP_SCREENS.some(s => s.value === actionUrl) && !tempPages.some(tp => `/temp-page/${tp.id}` === actionUrl)) && (
                  <input
                    type="text"
                    value={actionUrl}
                    onChange={e => {
                      let val = e.target.value;
                      if (val && !val.startsWith('/')) val = '/' + val;
                      setActionUrl(val);
                    }}
                    placeholder="/surah/2?ayah=255"
                    dir="ltr"
                    className="w-full mt-2 bg-admin-surface-light rounded-xl px-4 py-3 focus:ring-2 focus:ring-accent outline-none text-white font-mono text-sm"
                    title="أدخل رابط الصفحة"
                    aria-label="أدخل رابط الصفحة"
                  />
                )}
              </div>

              {/* الجدولة والصورة */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">جدولة الإرسال (اختياري)</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                    className="w-full bg-admin-surface-light rounded-xl px-4 py-3 focus:ring-2 focus:ring-accent outline-none text-white"
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
                    className="w-full bg-admin-surface-light rounded-xl px-4 py-3 focus:ring-2 focus:ring-accent outline-none text-white"
                    placeholder="https://..."
                    aria-label="رابط الصورة"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center gap-3 p-4 border-t border-admin-border">
              <div className="text-sm text-slate-400">
                سيتم الإرسال إلى ~{userStats.withTokens} مستخدم ({getFilledLanguagesCount()} لغة)
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 bg-admin-surface-light hover:bg-admin-surface-light rounded-xl transition-colors text-white"
                >
                  إلغاء
                </button>
                {scheduledAt ? (
                  <button
                    onClick={handleSchedule}
                    disabled={!translations.ar?.title || !translations.ar?.body}
                    className="flex items-center gap-2 px-6 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-admin-surface-light rounded-xl transition-colors text-white"
                  >
                    <Calendar size={18} />
                    جدولة
                  </button>
                ) : (
                  <button
                    onClick={handleSendNow}
                    disabled={!translations.ar?.title || !translations.ar?.body || isSending}
                    className="flex items-center gap-2 px-6 py-2 bg-accent-dark hover:bg-accent-dark disabled:bg-admin-surface-light rounded-xl transition-colors text-white"
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
