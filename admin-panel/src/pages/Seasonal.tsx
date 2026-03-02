// admin-panel/src/pages/Seasonal.tsx
// صفحة إدارة المحتوى الموسمي

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Save,
  Moon,
  Sun,
  Star,
  Gift,
  Heart,
  BookOpen,
  Clock,
  Users,
  Eye,
  EyeOff,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Sunrise,
  Sunset,
  CloudMoon,
  Loader2,
  RefreshCw,
  Download,
  Upload,
  Check,
  X,
  Image,
  Type,
  Palette,
  Bell,
  Target,
  Zap,
  Award,
  Crown
} from 'lucide-react';

// ==================== الأنواع ====================

type SeasonType = 'ramadan' | 'eid_fitr' | 'eid_adha' | 'hajj' | 'mawlid' | 'ashura' | 'isra_miraj' | 'friday' | 'custom';
type ContentType = 'greeting' | 'azkar' | 'dua' | 'reminder' | 'challenge' | 'fact' | 'quote';

interface SeasonalContent {
  id: string;
  seasonType: SeasonType;
  contentType: ContentType;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  icon: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  backgroundImage?: string;
  startDate: string; // ISO date or Hijri pattern
  endDate: string;
  isHijriDate: boolean;
  priority: number;
  isActive: boolean;
  showTime?: {
    enabled: boolean;
    startHour: number;
    endHour: number;
  };
  targetScreen?: string;
  actionButton?: {
    textAr: string;
    textEn: string;
    action: string;
  };
  stats: {
    views: number;
    interactions: number;
    shares: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface SeasonConfig {
  id: string;
  type: SeasonType;
  nameAr: string;
  nameEn: string;
  icon: string;
  defaultColors: {
    background: string;
    text: string;
    accent: string;
  };
  hijriMonth?: number;
  hijriDay?: number;
  duration?: number; // days
  isRecurring: boolean;
  features: string[];
}

interface DailyContent {
  id: string;
  seasonId: string;
  dayNumber: number;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  additionalContent?: {
    type: 'ayah' | 'hadith' | 'dua' | 'fact';
    textAr: string;
    textEn: string;
    source?: string;
  };
  challenge?: {
    titleAr: string;
    titleEn: string;
    targetCount: number;
    rewardPoints: number;
  };
}

// ==================== الثوابت ====================

const SEASON_TYPES: { value: SeasonType; labelAr: string; labelEn: string; icon: string }[] = [
  { value: 'ramadan', labelAr: 'رمضان', labelEn: 'Ramadan', icon: '🌙' },
  { value: 'eid_fitr', labelAr: 'عيد الفطر', labelEn: 'Eid al-Fitr', icon: '🎉' },
  { value: 'eid_adha', labelAr: 'عيد الأضحى', labelEn: 'Eid al-Adha', icon: '🐑' },
  { value: 'hajj', labelAr: 'موسم الحج', labelEn: 'Hajj Season', icon: '🕋' },
  { value: 'mawlid', labelAr: 'المولد النبوي', labelEn: 'Mawlid', icon: '✨' },
  { value: 'ashura', labelAr: 'عاشوراء', labelEn: 'Ashura', icon: '📿' },
  { value: 'isra_miraj', labelAr: 'الإسراء والمعراج', labelEn: 'Isra and Miraj', icon: '🌟' },
  { value: 'friday', labelAr: 'يوم الجمعة', labelEn: 'Friday', icon: '🕌' },
  { value: 'custom', labelAr: 'مخصص', labelEn: 'Custom', icon: '⚙️' },
];

const CONTENT_TYPES: { value: ContentType; labelAr: string; icon: string }[] = [
  { value: 'greeting', labelAr: 'تحية', icon: '👋' },
  { value: 'azkar', labelAr: 'أذكار', icon: '📿' },
  { value: 'dua', labelAr: 'دعاء', icon: '🤲' },
  { value: 'reminder', labelAr: 'تذكير', icon: '🔔' },
  { value: 'challenge', labelAr: 'تحدي', icon: '🎯' },
  { value: 'fact', labelAr: 'معلومة', icon: '💡' },
  { value: 'quote', labelAr: 'اقتباس', icon: '💬' },
];

const SEASON_CONFIGS: SeasonConfig[] = [
  {
    id: 'ramadan',
    type: 'ramadan',
    nameAr: 'شهر رمضان المبارك',
    nameEn: 'Holy Month of Ramadan',
    icon: '🌙',
    defaultColors: { background: '#1a1a2e', text: '#ffffff', accent: '#ffd700' },
    hijriMonth: 9,
    hijriDay: 1,
    duration: 30,
    isRecurring: true,
    features: ['daily_azkar', 'iftar_reminder', 'suhoor_reminder', 'quran_khatma', 'taraweeh_counter', 'charity_tracker']
  },
  {
    id: 'eid_fitr',
    type: 'eid_fitr',
    nameAr: 'عيد الفطر المبارك',
    nameEn: 'Blessed Eid al-Fitr',
    icon: '🎉',
    defaultColors: { background: '#2d5016', text: '#ffffff', accent: '#90EE90' },
    hijriMonth: 10,
    hijriDay: 1,
    duration: 3,
    isRecurring: true,
    features: ['eid_takbeer', 'greetings', 'eid_prayer_reminder']
  },
  {
    id: 'hajj',
    type: 'hajj',
    nameAr: 'موسم الحج',
    nameEn: 'Hajj Season',
    icon: '🕋',
    defaultColors: { background: '#1a1a1a', text: '#ffffff', accent: '#c9a227' },
    hijriMonth: 12,
    hijriDay: 1,
    duration: 13,
    isRecurring: true,
    features: ['hajj_guide', 'dhul_hijjah_fasting', 'takbeer', 'udhiyah_reminder']
  },
];

const APP_SCREENS = [
  { value: 'home', label: 'الرئيسية' },
  { value: 'azkar', label: 'الأذكار' },
  { value: 'quran', label: 'القرآن' },
  { value: 'prayer', label: 'الصلاة' },
  { value: 'qibla', label: 'القبلة' },
  { value: 'dua', label: 'الأدعية' },
  { value: 'tasbih', label: 'التسبيح' },
  { value: 'tracker', label: 'متتبع العبادات' },
];

// ==================== البيانات التجريبية ====================

const INITIAL_CONTENT: SeasonalContent[] = [
  {
    id: '1',
    seasonType: 'ramadan',
    contentType: 'greeting',
    titleAr: 'رمضان كريم',
    titleEn: 'Ramadan Kareem',
    contentAr: 'أهلاً بك في شهر الخير والبركة، شهر رمضان المبارك. اللهم بلغنا رمضان وأعنا على صيامه وقيامه.',
    contentEn: 'Welcome to the month of goodness and blessings, the holy month of Ramadan. May Allah help us fast and pray during it.',
    icon: '🌙',
    backgroundColor: '#1a1a2e',
    textColor: '#ffffff',
    accentColor: '#ffd700',
    backgroundImage: 'https://example.com/ramadan-bg.jpg',
    startDate: '9-1', // Hijri: 1st of Ramadan
    endDate: '9-30',
    isHijriDate: true,
    priority: 1,
    isActive: true,
    showTime: { enabled: true, startHour: 0, endHour: 24 },
    targetScreen: 'home',
    actionButton: { textAr: 'ابدأ ورد القرآن', textEn: 'Start Quran Reading', action: 'quran' },
    stats: { views: 25000, interactions: 15000, shares: 3500 },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-28T00:00:00Z'
  },
  {
    id: '2',
    seasonType: 'ramadan',
    contentType: 'reminder',
    titleAr: 'وقت الإفطار',
    titleEn: 'Iftar Time',
    contentAr: 'حان وقت الإفطار، اللهم لك صمت وعلى رزقك أفطرت.',
    contentEn: 'It is time for Iftar. O Allah, for You I fasted and with Your provision I break my fast.',
    icon: '🍽️',
    backgroundColor: '#ff6b35',
    textColor: '#ffffff',
    accentColor: '#ffd700',
    startDate: '9-1',
    endDate: '9-30',
    isHijriDate: true,
    priority: 2,
    isActive: true,
    showTime: { enabled: true, startHour: 17, endHour: 20 },
    stats: { views: 18000, interactions: 12000, shares: 2000 },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-28T00:00:00Z'
  },
  {
    id: '3',
    seasonType: 'friday',
    contentType: 'azkar',
    titleAr: 'أذكار يوم الجمعة',
    titleEn: 'Friday Azkar',
    contentAr: 'اللهم صلِّ وسلم على نبينا محمد ﷺ. أكثر من الصلاة على النبي في هذا اليوم المبارك.',
    contentEn: 'O Allah, send blessings upon our Prophet Muhammad ﷺ. Increase your prayers upon the Prophet on this blessed day.',
    icon: '🕌',
    backgroundColor: '#006400',
    textColor: '#ffffff',
    accentColor: '#90EE90',
    startDate: 'friday',
    endDate: 'friday',
    isHijriDate: false,
    priority: 1,
    isActive: true,
    showTime: { enabled: true, startHour: 6, endHour: 18 },
    targetScreen: 'azkar',
    stats: { views: 35000, interactions: 28000, shares: 8000 },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-28T00:00:00Z'
  }
];

const RAMADAN_DAILY_CONTENT: DailyContent[] = [
  {
    id: 'r1',
    seasonId: 'ramadan',
    dayNumber: 1,
    titleAr: 'اليوم الأول - باب الريان',
    titleEn: 'Day 1 - The Gate of Rayyan',
    contentAr: 'مرحباً بك في أول أيام رمضان! في الجنة باب يُقال له الريان، يدخل منه الصائمون.',
    contentEn: 'Welcome to the first day of Ramadan! In Paradise, there is a gate called Al-Rayyan through which the fasting people will enter.',
    additionalContent: {
      type: 'hadith',
      textAr: 'إن في الجنة باباً يُقال له الريان، يدخل منه الصائمون يوم القيامة، لا يدخل منه أحد غيرهم',
      textEn: 'In Paradise there is a gate called Al-Rayyan, through which those who fast will enter on the Day of Resurrection, and no one else will enter through it.',
      source: 'صحيح البخاري'
    },
    challenge: {
      titleAr: 'أكمل قراءة جزء من القرآن',
      titleEn: 'Complete reading one Juz of Quran',
      targetCount: 1,
      rewardPoints: 100
    }
  },
  {
    id: 'r2',
    seasonId: 'ramadan',
    dayNumber: 2,
    titleAr: 'اليوم الثاني - شهر الصبر',
    titleEn: 'Day 2 - Month of Patience',
    contentAr: 'رمضان شهر الصبر، والصبر ثوابه الجنة. استمر في صيامك واحتسب الأجر عند الله.',
    contentEn: 'Ramadan is the month of patience, and the reward for patience is Paradise. Continue your fasting and seek reward from Allah.',
    additionalContent: {
      type: 'ayah',
      textAr: 'إِنَّمَا يُوَفَّى الصَّابِرُونَ أَجْرَهُم بِغَيْرِ حِسَابٍ',
      textEn: 'Indeed, the patient will be given their reward without account.',
      source: 'سورة الزمر - الآية 10'
    },
    challenge: {
      titleAr: 'صلِّ التراويح كاملة',
      titleEn: 'Pray full Taraweeh',
      targetCount: 1,
      rewardPoints: 150
    }
  }
];

// ==================== المكون الرئيسي ====================

const SeasonalPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'content' | 'seasons' | 'daily' | 'analytics'>('content');
  const [contents, setContents] = useState<SeasonalContent[]>([]);
  const [dailyContents, setDailyContents] = useState<DailyContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<SeasonType | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [editingContent, setEditingContent] = useState<SeasonalContent | null>(null);
  const [editingDaily, setEditingDaily] = useState<DailyContent | null>(null);
  const [modalTab, setModalTab] = useState<'content' | 'design' | 'schedule' | 'action'>('content');
  const [expandedSeasons, setExpandedSeasons] = useState<string[]>(['ramadan']);

  // تحميل البيانات
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    // محاكاة API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setContents(INITIAL_CONTENT);
    setDailyContents(RAMADAN_DAILY_CONTENT);
    setIsLoading(false);
  };

  // فلترة المحتوى حسب الموسم
  const filteredContents = selectedSeason === 'all' 
    ? contents 
    : contents.filter(c => c.seasonType === selectedSeason);

  // وظائف CRUD
  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    alert('تم حفظ التغييرات بنجاح!');
  };

  const handleAddContent = () => {
    setEditingContent({
      id: '',
      seasonType: 'ramadan',
      contentType: 'greeting',
      titleAr: '',
      titleEn: '',
      contentAr: '',
      contentEn: '',
      icon: '🌙',
      backgroundColor: '#1a1a2e',
      textColor: '#ffffff',
      accentColor: '#ffd700',
      startDate: '',
      endDate: '',
      isHijriDate: true,
      priority: 1,
      isActive: true,
      stats: { views: 0, interactions: 0, shares: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setShowModal(true);
  };

  const handleEditContent = (content: SeasonalContent) => {
    setEditingContent({ ...content });
    setShowModal(true);
  };

  const handleDeleteContent = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المحتوى؟')) {
      setContents(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleToggleActive = (id: string) => {
    setContents(prev => prev.map(c => 
      c.id === id ? { ...c, isActive: !c.isActive } : c
    ));
  };

  const handleSaveContent = () => {
    if (!editingContent) return;
    
    if (editingContent.id) {
      setContents(prev => prev.map(c => 
        c.id === editingContent.id ? { ...editingContent, updatedAt: new Date().toISOString() } : c
      ));
    } else {
      setContents(prev => [...prev, { ...editingContent, id: Date.now().toString() }]);
    }
    setShowModal(false);
    setEditingContent(null);
  };

  const handleDuplicateContent = (content: SeasonalContent) => {
    const newContent = {
      ...content,
      id: Date.now().toString(),
      titleAr: content.titleAr + ' (نسخة)',
      titleEn: content.titleEn + ' (Copy)',
      isActive: false,
      stats: { views: 0, interactions: 0, shares: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setContents(prev => [...prev, newContent]);
  };

  // Daily Content handlers
  const handleAddDailyContent = (seasonId: string) => {
    const existingDays = dailyContents.filter(d => d.seasonId === seasonId);
    setEditingDaily({
      id: '',
      seasonId,
      dayNumber: existingDays.length + 1,
      titleAr: '',
      titleEn: '',
      contentAr: '',
      contentEn: ''
    });
    setShowDailyModal(true);
  };

  const handleSaveDailyContent = () => {
    if (!editingDaily) return;
    
    if (editingDaily.id) {
      setDailyContents(prev => prev.map(d => 
        d.id === editingDaily.id ? editingDaily : d
      ));
    } else {
      setDailyContents(prev => [...prev, { ...editingDaily, id: Date.now().toString() }]);
    }
    setShowDailyModal(false);
    setEditingDaily(null);
  };

  const toggleSeasonExpand = (seasonId: string) => {
    setExpandedSeasons(prev => 
      prev.includes(seasonId) 
        ? prev.filter(s => s !== seasonId)
        : [...prev, seasonId]
    );
  };

  // حساب الإحصائيات
  const totalViews = contents.reduce((sum, c) => sum + c.stats.views, 0);
  const totalInteractions = contents.reduce((sum, c) => sum + c.stats.interactions, 0);
  const avgEngagement = totalViews > 0 ? ((totalInteractions / totalViews) * 100).toFixed(1) : '0';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <span className="mr-2 text-gray-600">جاري تحميل المحتوى الموسمي...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      {/* الرأس */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="w-7 h-7 text-emerald-600" />
            إدارة المحتوى الموسمي
          </h1>
          <p className="text-gray-500 mt-1">إدارة المحتوى الخاص بالمناسبات والمواسم الإسلامية</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ الكل
          </button>
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي المحتوى</p>
              <p className="text-xl font-bold text-gray-800">{contents.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Eye className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">المشاهدات</p>
              <p className="text-xl font-bold text-gray-800">{totalViews.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">التفاعلات</p>
              <p className="text-xl font-bold text-gray-800">{totalInteractions.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">نسبة التفاعل</p>
              <p className="text-xl font-bold text-gray-800">{avgEngagement}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* التبويبات */}
      <div className="flex gap-2 mb-6 border-b pb-2">
        {[
          { id: 'content', label: 'المحتوى الموسمي', icon: Sparkles },
          { id: 'seasons', label: 'إعدادات المواسم', icon: Calendar },
          { id: 'daily', label: 'المحتوى اليومي', icon: Sun },
          { id: 'analytics', label: 'التحليلات', icon: Target },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-emerald-100 text-emerald-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* تبويب المحتوى الموسمي */}
      {activeTab === 'content' && (
        <div>
          {/* شريط الأدوات */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value as SeasonType | 'all')}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">جميع المواسم</option>
                {SEASON_TYPES.map(s => (
                  <option key={s.value} value={s.value}>{s.icon} {s.labelAr}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAddContent}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4" />
              إضافة محتوى
            </button>
          </div>

          {/* قائمة المحتوى */}
          <div className="grid gap-4">
            {filteredContents.map(content => {
              const season = SEASON_TYPES.find(s => s.value === content.seasonType);
              const contentType = CONTENT_TYPES.find(c => c.value === content.contentType);
              
              return (
                <div
                  key={content.id}
                  className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
                    !content.isActive ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex">
                    {/* معاينة */}
                    <div
                      className="w-48 p-4 flex flex-col items-center justify-center text-center"
                      style={{
                        backgroundColor: content.backgroundColor,
                        color: content.textColor
                      }}
                    >
                      <span className="text-4xl mb-2">{content.icon}</span>
                      <p className="text-sm font-bold">{content.titleAr}</p>
                    </div>
                    
                    {/* التفاصيل */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700">
                              {season?.icon} {season?.labelAr}
                            </span>
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                              {contentType?.icon} {contentType?.labelAr}
                            </span>
                            {content.isActive ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                                نشط
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                                غير نشط
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-gray-800">{content.titleAr}</h3>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{content.contentAr}</p>
                        </div>
                        
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDuplicateContent(content)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                            title="نسخ"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditContent(content)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                            title="تعديل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(content.id)}
                            className={`p-2 rounded-lg ${
                              content.isActive 
                                ? 'text-amber-500 hover:bg-amber-50' 
                                : 'text-green-500 hover:bg-green-50'
                            }`}
                            title={content.isActive ? 'تعطيل' : 'تفعيل'}
                          >
                            {content.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDeleteContent(content.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* الإحصائيات */}
                      <div className="flex items-center gap-6 mt-4 pt-4 border-t">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Eye className="w-4 h-4" />
                          <span>{content.stats.views.toLocaleString()} مشاهدة</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Target className="w-4 h-4" />
                          <span>{content.stats.interactions.toLocaleString()} تفاعل</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Users className="w-4 h-4" />
                          <span>{content.stats.shares.toLocaleString()} مشاركة</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>{content.isHijriDate ? 'تاريخ هجري' : 'تاريخ ميلادي'}: {content.startDate} - {content.endDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* تبويب إعدادات المواسم */}
      {activeTab === 'seasons' && (
        <div className="space-y-4">
          {SEASON_CONFIGS.map(season => (
            <div key={season.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSeasonExpand(season.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{season.icon}</span>
                    <div>
                      <h3 className="font-bold text-gray-800">{season.nameAr}</h3>
                      <p className="text-sm text-gray-500">{season.nameEn}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                      {season.features.slice(0, 3).map((feature, i) => (
                        <span key={i} className="px-2 py-1 text-xs bg-gray-100 rounded-full">
                          {feature.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {season.features.length > 3 && (
                        <span className="px-2 py-1 text-xs bg-gray-100 rounded-full">
                          +{season.features.length - 3}
                        </span>
                      )}
                    </div>
                    {expandedSeasons.includes(season.id) ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </div>
              </div>
              
              {expandedSeasons.includes(season.id) && (
                <div className="p-4 border-t bg-gray-50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">الشهر الهجري</label>
                      <input
                        type="number"
                        value={season.hijriMonth || ''}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="رقم الشهر"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">اليوم</label>
                      <input
                        type="number"
                        value={season.hijriDay || ''}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="رقم اليوم"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">المدة (أيام)</label>
                      <input
                        type="number"
                        value={season.duration || ''}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="عدد الأيام"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">متكرر سنوياً</label>
                      <div className="flex items-center mt-2">
                        <input
                          type="checkbox"
                          checked={season.isRecurring}
                          className="w-5 h-5 text-emerald-600 rounded"
                        />
                        <span className="mr-2 text-sm">نعم</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">الألوان الافتراضية</label>
                    <div className="flex gap-4">
                      <div>
                        <span className="text-xs text-gray-500">الخلفية</span>
                        <div className="flex items-center gap-2 mt-1">
                          <div
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: season.defaultColors.background }}
                          />
                          <input
                            type="text"
                            value={season.defaultColors.background}
                            className="w-24 px-2 py-1 text-sm border rounded"
                          />
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">النص</span>
                        <div className="flex items-center gap-2 mt-1">
                          <div
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: season.defaultColors.text }}
                          />
                          <input
                            type="text"
                            value={season.defaultColors.text}
                            className="w-24 px-2 py-1 text-sm border rounded"
                          />
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">اللون المميز</span>
                        <div className="flex items-center gap-2 mt-1">
                          <div
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: season.defaultColors.accent }}
                          />
                          <input
                            type="text"
                            value={season.defaultColors.accent}
                            className="w-24 px-2 py-1 text-sm border rounded"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm text-gray-600 mb-2">الميزات المفعلة</label>
                    <div className="flex flex-wrap gap-2">
                      {season.features.map((feature, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          {feature.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleAddDailyContent(season.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      إضافة محتوى يومي
                    </button>
                    <button
                      onClick={handleAddContent}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                      <Plus className="w-4 h-4" />
                      إضافة محتوى موسمي
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* تبويب المحتوى اليومي */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {SEASON_CONFIGS.filter(s => s.duration && s.duration > 1).map(season => {
            const seasonDailyContent = dailyContents.filter(d => d.seasonId === season.id);
            
            return (
              <div key={season.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-gradient-to-l from-emerald-50 to-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{season.icon}</span>
                      <div>
                        <h3 className="font-bold text-gray-800">{season.nameAr}</h3>
                        <p className="text-sm text-gray-500">
                          {seasonDailyContent.length} / {season.duration} يوم
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddDailyContent(season.id)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
                    >
                      <Plus className="w-4 h-4" />
                      إضافة يوم
                    </button>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${(seasonDailyContent.length / (season.duration || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                  {Array.from({ length: season.duration || 0 }, (_, i) => i + 1).map(dayNum => {
                    const dayContent = seasonDailyContent.find(d => d.dayNumber === dayNum);
                    
                    return (
                      <div
                        key={dayNum}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          dayContent 
                            ? 'border-emerald-500 bg-emerald-50 hover:bg-emerald-100' 
                            : 'border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                        }`}
                        onClick={() => {
                          if (dayContent) {
                            setEditingDaily(dayContent);
                            setShowDailyModal(true);
                          } else {
                            setEditingDaily({
                              id: '',
                              seasonId: season.id,
                              dayNumber: dayNum,
                              titleAr: `اليوم ${dayNum}`,
                              titleEn: `Day ${dayNum}`,
                              contentAr: '',
                              contentEn: ''
                            });
                            setShowDailyModal(true);
                          }
                        }}
                      >
                        <div className="text-center">
                          <div className={`text-lg font-bold ${dayContent ? 'text-emerald-700' : 'text-gray-400'}`}>
                            {dayNum}
                          </div>
                          {dayContent ? (
                            <>
                              <p className="text-xs text-emerald-600 mt-1 line-clamp-1">{dayContent.titleAr}</p>
                              {dayContent.challenge && (
                                <div className="mt-1">
                                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                                    🎯 تحدي
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <Plus className="w-4 h-4 mx-auto mt-1 text-gray-400" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* تبويب التحليلات */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* أفضل المحتوى */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              أفضل المحتوى أداءً
            </h3>
            <div className="space-y-3">
              {[...contents]
                .sort((a, b) => b.stats.views - a.stats.views)
                .slice(0, 5)
                .map((content, i) => (
                  <div key={content.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      i === 0 ? 'bg-amber-100 text-amber-700' :
                      i === 1 ? 'bg-gray-200 text-gray-700' :
                      i === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {i + 1}
                    </div>
                    <span className="text-2xl">{content.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{content.titleAr}</p>
                      <p className="text-sm text-gray-500">
                        {SEASON_TYPES.find(s => s.value === content.seasonType)?.labelAr}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-800">{content.stats.views.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">مشاهدة</p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-emerald-600">
                        {((content.stats.interactions / content.stats.views) * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500">تفاعل</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* إحصائيات المواسم */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              إحصائيات المواسم
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {SEASON_TYPES.filter(s => s.value !== 'custom').map(season => {
                const seasonContent = contents.filter(c => c.seasonType === season.value);
                const seasonViews = seasonContent.reduce((sum, c) => sum + c.stats.views, 0);
                
                return (
                  <div key={season.value} className="p-4 bg-gray-50 rounded-lg text-center">
                    <span className="text-3xl">{season.icon}</span>
                    <p className="font-medium text-gray-800 mt-2">{season.labelAr}</p>
                    <p className="text-sm text-gray-500">{seasonContent.length} محتوى</p>
                    <p className="text-lg font-bold text-emerald-600 mt-1">
                      {seasonViews.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">مشاهدة</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* مودال إضافة/تعديل المحتوى */}
      {showModal && editingContent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingContent.id ? 'تعديل المحتوى' : 'إضافة محتوى جديد'}
              </h2>
              <button
                onClick={() => { setShowModal(false); setEditingContent(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* تبويبات المودال */}
            <div className="flex gap-2 p-4 border-b">
              {[
                { id: 'content', label: 'المحتوى', icon: Type },
                { id: 'design', label: 'التصميم', icon: Palette },
                { id: 'schedule', label: 'الجدولة', icon: Clock },
                { id: 'action', label: 'الإجراء', icon: Target },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setModalTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    modalTab === tab.id
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {/* تبويب المحتوى */}
              {modalTab === 'content' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الموسم</label>
                      <select
                        value={editingContent.seasonType}
                        onChange={(e) => setEditingContent({ ...editingContent, seasonType: e.target.value as SeasonType })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                      >
                        {SEASON_TYPES.map(s => (
                          <option key={s.value} value={s.value}>{s.icon} {s.labelAr}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">نوع المحتوى</label>
                      <select
                        value={editingContent.contentType}
                        onChange={(e) => setEditingContent({ ...editingContent, contentType: e.target.value as ContentType })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                      >
                        {CONTENT_TYPES.map(c => (
                          <option key={c.value} value={c.value}>{c.icon} {c.labelAr}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">العنوان (عربي)</label>
                    <input
                      type="text"
                      value={editingContent.titleAr}
                      onChange={(e) => setEditingContent({ ...editingContent, titleAr: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="أدخل العنوان بالعربية"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">العنوان (إنجليزي)</label>
                    <input
                      type="text"
                      value={editingContent.titleEn}
                      onChange={(e) => setEditingContent({ ...editingContent, titleEn: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="Enter title in English"
                      dir="ltr"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">المحتوى (عربي)</label>
                    <textarea
                      value={editingContent.contentAr}
                      onChange={(e) => setEditingContent({ ...editingContent, contentAr: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="أدخل المحتوى بالعربية"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">المحتوى (إنجليزي)</label>
                    <textarea
                      value={editingContent.contentEn}
                      onChange={(e) => setEditingContent({ ...editingContent, contentEn: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="Enter content in English"
                      dir="ltr"
                    />
                  </div>
                </div>
              )}

              {/* تبويب التصميم */}
              {modalTab === 'design' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الأيقونة</label>
                    <input
                      type="text"
                      value={editingContent.icon}
                      onChange={(e) => setEditingContent({ ...editingContent, icon: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-2xl text-center"
                      placeholder="🌙"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">لون الخلفية</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={editingContent.backgroundColor}
                          onChange={(e) => setEditingContent({ ...editingContent, backgroundColor: e.target.value })}
                          className="w-12 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={editingContent.backgroundColor}
                          onChange={(e) => setEditingContent({ ...editingContent, backgroundColor: e.target.value })}
                          className="flex-1 px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">لون النص</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={editingContent.textColor}
                          onChange={(e) => setEditingContent({ ...editingContent, textColor: e.target.value })}
                          className="w-12 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={editingContent.textColor}
                          onChange={(e) => setEditingContent({ ...editingContent, textColor: e.target.value })}
                          className="flex-1 px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">اللون المميز</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={editingContent.accentColor}
                          onChange={(e) => setEditingContent({ ...editingContent, accentColor: e.target.value })}
                          className="w-12 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={editingContent.accentColor}
                          onChange={(e) => setEditingContent({ ...editingContent, accentColor: e.target.value })}
                          className="flex-1 px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">صورة الخلفية (اختياري)</label>
                    <input
                      type="text"
                      value={editingContent.backgroundImage || ''}
                      onChange={(e) => setEditingContent({ ...editingContent, backgroundImage: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="https://example.com/image.jpg"
                      dir="ltr"
                    />
                  </div>
                  
                  {/* معاينة */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">معاينة</label>
                    <div
                      className="p-6 rounded-xl text-center"
                      style={{
                        backgroundColor: editingContent.backgroundColor,
                        color: editingContent.textColor,
                        backgroundImage: editingContent.backgroundImage ? `url(${editingContent.backgroundImage})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      <span className="text-5xl mb-3 block">{editingContent.icon}</span>
                      <h3 className="text-xl font-bold mb-2">{editingContent.titleAr || 'العنوان'}</h3>
                      <p className="opacity-90">{editingContent.contentAr || 'المحتوى...'}</p>
                      {editingContent.actionButton && (
                        <button
                          className="mt-4 px-6 py-2 rounded-lg font-medium"
                          style={{ backgroundColor: editingContent.accentColor, color: editingContent.backgroundColor }}
                        >
                          {editingContent.actionButton.textAr || 'زر الإجراء'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* تبويب الجدولة */}
              {modalTab === 'schedule' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingContent.isHijriDate}
                        onChange={(e) => setEditingContent({ ...editingContent, isHijriDate: e.target.checked })}
                        className="w-5 h-5 text-emerald-600 rounded"
                      />
                      <span>استخدام التاريخ الهجري</span>
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        تاريخ البداية {editingContent.isHijriDate ? '(شهر-يوم)' : ''}
                      </label>
                      <input
                        type="text"
                        value={editingContent.startDate}
                        onChange={(e) => setEditingContent({ ...editingContent, startDate: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                        placeholder={editingContent.isHijriDate ? '9-1' : 'friday'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        تاريخ النهاية {editingContent.isHijriDate ? '(شهر-يوم)' : ''}
                      </label>
                      <input
                        type="text"
                        value={editingContent.endDate}
                        onChange={(e) => setEditingContent({ ...editingContent, endDate: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                        placeholder={editingContent.isHijriDate ? '9-30' : 'friday'}
                      />
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        checked={editingContent.showTime?.enabled || false}
                        onChange={(e) => setEditingContent({
                          ...editingContent,
                          showTime: { 
                            enabled: e.target.checked, 
                            startHour: editingContent.showTime?.startHour || 0,
                            endHour: editingContent.showTime?.endHour || 24
                          }
                        })}
                        className="w-5 h-5 text-emerald-600 rounded"
                      />
                      <span className="font-medium">تحديد وقت العرض</span>
                    </div>
                    
                    {editingContent.showTime?.enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">من الساعة</label>
                          <select
                            value={editingContent.showTime.startHour}
                            onChange={(e) => setEditingContent({
                              ...editingContent,
                              showTime: { ...editingContent.showTime!, startHour: parseInt(e.target.value) }
                            })}
                            className="w-full px-3 py-2 border rounded-lg"
                          >
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i}>{i}:00</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">إلى الساعة</label>
                          <select
                            value={editingContent.showTime.endHour}
                            onChange={(e) => setEditingContent({
                              ...editingContent,
                              showTime: { ...editingContent.showTime!, endHour: parseInt(e.target.value) }
                            })}
                            className="w-full px-3 py-2 border rounded-lg"
                          >
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i + 1} value={i + 1}>{i + 1}:00</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الأولوية</label>
                    <input
                      type="number"
                      value={editingContent.priority}
                      onChange={(e) => setEditingContent({ ...editingContent, priority: parseInt(e.target.value) })}
                      min={1}
                      max={100}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">الأرقام الأقل = أولوية أعلى</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingContent.isActive}
                      onChange={(e) => setEditingContent({ ...editingContent, isActive: e.target.checked })}
                      className="w-5 h-5 text-emerald-600 rounded"
                    />
                    <span>نشط</span>
                  </div>
                </div>
              )}

              {/* تبويب الإجراء */}
              {modalTab === 'action' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الشاشة المستهدفة</label>
                    <select
                      value={editingContent.targetScreen || ''}
                      onChange={(e) => setEditingContent({ ...editingContent, targetScreen: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">بدون توجيه</option>
                      {APP_SCREENS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-3">زر الإجراء (اختياري)</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">نص الزر (عربي)</label>
                        <input
                          type="text"
                          value={editingContent.actionButton?.textAr || ''}
                          onChange={(e) => setEditingContent({
                            ...editingContent,
                            actionButton: {
                              textAr: e.target.value,
                              textEn: editingContent.actionButton?.textEn || '',
                              action: editingContent.actionButton?.action || ''
                            }
                          })}
                          className="w-full px-3 py-2 border rounded-lg"
                          placeholder="ابدأ الآن"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">نص الزر (إنجليزي)</label>
                        <input
                          type="text"
                          value={editingContent.actionButton?.textEn || ''}
                          onChange={(e) => setEditingContent({
                            ...editingContent,
                            actionButton: {
                              textAr: editingContent.actionButton?.textAr || '',
                              textEn: e.target.value,
                              action: editingContent.actionButton?.action || ''
                            }
                          })}
                          className="w-full px-3 py-2 border rounded-lg"
                          placeholder="Start Now"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">الإجراء</label>
                        <select
                          value={editingContent.actionButton?.action || ''}
                          onChange={(e) => setEditingContent({
                            ...editingContent,
                            actionButton: {
                              textAr: editingContent.actionButton?.textAr || '',
                              textEn: editingContent.actionButton?.textEn || '',
                              action: e.target.value
                            }
                          })}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="">اختر الإجراء</option>
                          {APP_SCREENS.map(s => (
                            <option key={s.value} value={s.value}>الانتقال إلى {s.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => { setShowModal(false); setEditingContent(null); }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveContent}
                className="px-4 py-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال المحتوى اليومي */}
      {showDailyModal && editingDaily && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingDaily.id ? 'تعديل محتوى اليوم' : 'إضافة محتوى يومي'}
                <span className="text-emerald-600 mr-2">- اليوم {editingDaily.dayNumber}</span>
              </h2>
              <button
                onClick={() => { setShowDailyModal(false); setEditingDaily(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[70vh] space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان (عربي)</label>
                <input
                  type="text"
                  value={editingDaily.titleAr}
                  onChange={(e) => setEditingDaily({ ...editingDaily, titleAr: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="اليوم الأول - ..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان (إنجليزي)</label>
                <input
                  type="text"
                  value={editingDaily.titleEn}
                  onChange={(e) => setEditingDaily({ ...editingDaily, titleEn: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Day 1 - ..."
                  dir="ltr"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المحتوى (عربي)</label>
                <textarea
                  value={editingDaily.contentAr}
                  onChange={(e) => setEditingDaily({ ...editingDaily, contentAr: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المحتوى (إنجليزي)</label>
                <textarea
                  value={editingDaily.contentEn}
                  onChange={(e) => setEditingDaily({ ...editingDaily, contentEn: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  dir="ltr"
                />
              </div>
              
              {/* محتوى إضافي */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-3">محتوى إضافي (آية / حديث / دعاء)</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">النوع</label>
                    <select
                      value={editingDaily.additionalContent?.type || ''}
                      onChange={(e) => setEditingDaily({
                        ...editingDaily,
                        additionalContent: e.target.value ? {
                          type: e.target.value as any,
                          textAr: editingDaily.additionalContent?.textAr || '',
                          textEn: editingDaily.additionalContent?.textEn || '',
                          source: editingDaily.additionalContent?.source || ''
                        } : undefined
                      })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">بدون محتوى إضافي</option>
                      <option value="ayah">آية قرآنية</option>
                      <option value="hadith">حديث نبوي</option>
                      <option value="dua">دعاء</option>
                      <option value="fact">معلومة</option>
                    </select>
                  </div>
                  
                  {editingDaily.additionalContent && (
                    <>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">النص (عربي)</label>
                        <textarea
                          value={editingDaily.additionalContent.textAr}
                          onChange={(e) => setEditingDaily({
                            ...editingDaily,
                            additionalContent: { ...editingDaily.additionalContent!, textAr: e.target.value }
                          })}
                          rows={2}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">النص (إنجليزي)</label>
                        <textarea
                          value={editingDaily.additionalContent.textEn}
                          onChange={(e) => setEditingDaily({
                            ...editingDaily,
                            additionalContent: { ...editingDaily.additionalContent!, textEn: e.target.value }
                          })}
                          rows={2}
                          className="w-full px-3 py-2 border rounded-lg"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">المصدر</label>
                        <input
                          type="text"
                          value={editingDaily.additionalContent.source || ''}
                          onChange={(e) => setEditingDaily({
                            ...editingDaily,
                            additionalContent: { ...editingDaily.additionalContent!, source: e.target.value }
                          })}
                          className="w-full px-3 py-2 border rounded-lg"
                          placeholder="سورة البقرة - الآية 255"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* تحدي اليوم */}
              <div className="p-4 bg-amber-50 rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-600" />
                  تحدي اليوم (اختياري)
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">عنوان التحدي (عربي)</label>
                    <input
                      type="text"
                      value={editingDaily.challenge?.titleAr || ''}
                      onChange={(e) => setEditingDaily({
                        ...editingDaily,
                        challenge: {
                          titleAr: e.target.value,
                          titleEn: editingDaily.challenge?.titleEn || '',
                          targetCount: editingDaily.challenge?.targetCount || 1,
                          rewardPoints: editingDaily.challenge?.rewardPoints || 100
                        }
                      })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="اقرأ جزء من القرآن"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">عنوان التحدي (إنجليزي)</label>
                    <input
                      type="text"
                      value={editingDaily.challenge?.titleEn || ''}
                      onChange={(e) => setEditingDaily({
                        ...editingDaily,
                        challenge: {
                          titleAr: editingDaily.challenge?.titleAr || '',
                          titleEn: e.target.value,
                          targetCount: editingDaily.challenge?.targetCount || 1,
                          rewardPoints: editingDaily.challenge?.rewardPoints || 100
                        }
                      })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Read one Juz of Quran"
                      dir="ltr"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">الهدف (عدد)</label>
                      <input
                        type="number"
                        value={editingDaily.challenge?.targetCount || 1}
                        onChange={(e) => setEditingDaily({
                          ...editingDaily,
                          challenge: {
                            ...editingDaily.challenge!,
                            targetCount: parseInt(e.target.value)
                          }
                        })}
                        min={1}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">النقاط</label>
                      <input
                        type="number"
                        value={editingDaily.challenge?.rewardPoints || 100}
                        onChange={(e) => setEditingDaily({
                          ...editingDaily,
                          challenge: {
                            ...editingDaily.challenge!,
                            rewardPoints: parseInt(e.target.value)
                          }
                        })}
                        min={0}
                        step={10}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => { setShowDailyModal(false); setEditingDaily(null); }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveDailyContent}
                className="px-4 py-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeasonalPage;
