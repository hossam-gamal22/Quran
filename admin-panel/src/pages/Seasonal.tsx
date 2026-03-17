// admin-panel/src/pages/Seasonal.tsx
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
  Loader2,
  RefreshCw,
  Check,
  X,
  Bell,
  Target,
  Zap,
  Award
} from 'lucide-react';
import { collection, doc, getDocs, setDoc, deleteDoc, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import AutoTranslateField from '../components/AutoTranslateField';
import { Styled } from '../components/Styled';

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
  startDate: string;
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
  translations?: Record<string, string>;
  stats: {
    views: number;
    interactions: number;
    shares: number;
  };
  createdAt: string;
  updatedAt: string;
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

const APP_SCREENS = [
  { value: 'home', label: 'الرئيسية' },
  { value: 'azkar', label: 'الأذكار' },
  { value: 'quran', label: 'القرآن' },
  { value: 'prayer', label: 'الصلاة' },
  { value: 'qibla', label: 'القبلة' },
  { value: 'dua', label: 'الأدعية' },
];

// ==================== البيانات التجريبية ====================

const INITIAL_CONTENT: SeasonalContent[] = [
  {
    id: '1',
    seasonType: 'ramadan',
    contentType: 'greeting',
    titleAr: 'رمضان كريم',
    titleEn: 'Ramadan Kareem',
    contentAr: 'أهلاً بك في شهر الخير والبركة',
    contentEn: 'Welcome to the month of goodness',
    icon: '🌙',
    backgroundColor: '#1a1a2e',
    textColor: '#ffffff',
    accentColor: '#ffd700',
    startDate: '9-1',
    endDate: '9-30',
    isHijriDate: true,
    priority: 1,
    isActive: true,
    stats: { views: 25000, interactions: 15000, shares: 3500 },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-28T00:00:00Z'
  },
  {
    id: '2',
    seasonType: 'friday',
    contentType: 'azkar',
    titleAr: 'أذكار يوم الجمعة',
    titleEn: 'Friday Azkar',
    contentAr: 'أكثر من الصلاة على النبي ﷺ',
    contentEn: 'Increase prayers upon the Prophet ﷺ',
    icon: '🕌',
    backgroundColor: '#006400',
    textColor: '#ffffff',
    accentColor: '#90EE90',
    startDate: 'friday',
    endDate: 'friday',
    isHijriDate: false,
    priority: 1,
    isActive: true,
    stats: { views: 35000, interactions: 28000, shares: 8000 },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-28T00:00:00Z'
  }
];

// ==================== المكون الرئيسي ====================

const Seasonal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'content' | 'analytics'>('content');
  const [contents, setContents] = useState<SeasonalContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<SeasonType | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingContent, setEditingContent] = useState<SeasonalContent | null>(null);
  const [modalTab, setModalTab] = useState<'content' | 'design' | 'schedule' | 'action'>('content');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'seasonalContent'), orderBy('priority', 'asc'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setContents(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SeasonalContent)));
      } else {
        setContents(INITIAL_CONTENT);
      }
    } catch (error) {
      console.error('Error loading seasonal content:', error);
      setContents(INITIAL_CONTENT);
    }
    setIsLoading(false);
  };

  const filteredContents = selectedSeason === 'all' 
    ? contents 
    : contents.filter(c => c.seasonType === selectedSeason);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const content of contents) {
        await setDoc(doc(db, 'seasonalContent', content.id), {
          ...content,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error saving seasonal content:', error);
    }
    setIsSaving(false);
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
      deleteDoc(doc(db, 'seasonalContent', id)).catch(console.error);
    }
  };

  const handleToggleActive = (id: string) => {
    setContents(prev => prev.map(c => 
      c.id === id ? { ...c, isActive: !c.isActive } : c
    ));
  };

  const handleSaveContent = () => {
    if (!editingContent) return;
    
    const id = editingContent.id || Date.now().toString();
    const entry = { ...editingContent, id, updatedAt: new Date().toISOString() };
    
    if (editingContent.id) {
      setContents(prev => prev.map(c => 
        c.id === editingContent.id ? entry : c
      ));
    } else {
      setContents(prev => [...prev, entry]);
    }
    
    setDoc(doc(db, 'seasonalContent', id), entry).catch(console.error);
    setShowModal(false);
    setEditingContent(null);
  };

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
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="w-7 h-7 text-emerald-600" />
            إدارة المحتوى الموسمي
          </h1>
          <p className="text-gray-500 mt-1">إدارة المحتوى الخاص بالمناسبات الإسلامية</p>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setActiveTab('content')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            activeTab === 'content' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          المحتوى الموسمي
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            activeTab === 'analytics' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Target className="w-4 h-4" />
          التحليلات
        </button>
      </div>

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div>
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value as SeasonType | 'all')}
              aria-label="فلترة حسب الموسم"
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">جميع المواسم</option>
              {SEASON_TYPES.map(s => (
                <option key={s.value} value={s.value}>{s.icon} {s.labelAr}</option>
              ))}
            </select>
            <button
              onClick={handleAddContent}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4" />
              إضافة محتوى
            </button>
          </div>

          {/* Content List */}
          <div className="grid gap-4">
            {filteredContents.map(content => {
              const season = SEASON_TYPES.find(s => s.value === content.seasonType);
              const contentType = CONTENT_TYPES.find(c => c.value === content.contentType);
              
              return (
                <div
                  key={content.id}
                  className={`bg-white rounded-xl shadow-sm border overflow-hidden ${!content.isActive ? 'opacity-60' : ''}`}
                >
                  <div className="flex">
                    {/* Preview */}
                    <Styled
                      className="w-48 p-4 flex flex-col items-center justify-center text-center"
                      css={{ backgroundColor: content.backgroundColor, color: content.textColor }}
                    >
                      <span className="text-4xl mb-2">{content.icon}</span>
                      <Styled as="p" className="text-sm font-bold" css={{ color: content.textColor }}>{content.titleAr}</Styled>
                    </Styled>
                    
                    {/* Details */}
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
                            <span className={`px-2 py-1 text-xs rounded-full ${content.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                              {content.isActive ? 'نشط' : 'غير نشط'}
                            </span>
                          </div>
                          <h3 className="font-bold text-gray-800">{content.titleAr}</h3>
                          <p className="text-sm text-gray-500 mt-1">{content.contentAr}</p>
                        </div>
                        
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditContent(content)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                            aria-label="تعديل"
                            title="تعديل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditContent({ ...content, id: `sc_${Date.now()}`, titleAr: content.titleAr + ' (نسخة)' })}
                            className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg"
                            aria-label="تكرار"
                            title="تكرار"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(content.id)}
                            className={`p-2 rounded-lg ${content.isActive ? 'text-amber-500 hover:bg-amber-50' : 'text-green-500 hover:bg-green-50'}`}
                            aria-label={content.isActive ? 'إخفاء' : 'تفعيل'}
                            title={content.isActive ? 'إخفاء' : 'تفعيل'}
                          >
                            {content.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDeleteContent(content.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            aria-label="حذف"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Stats */}
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
                          <Clock className="w-4 h-4" />
                          <span>{content.isHijriDate ? 'هجري' : 'ميلادي'}: {content.startDate}</span>
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

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            أفضل المحتوى أداءً
          </h3>
          <div className="space-y-3">
            {[...contents]
              .sort((a, b) => b.stats.views - a.stats.views)
              .map((content, i) => (
                <div key={content.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'
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
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && editingContent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingContent.id ? 'تعديل المحتوى' : 'إضافة محتوى جديد'}
              </h2>
              <button
                onClick={() => { setShowModal(false); setEditingContent(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="إغلاق"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex gap-2 p-4 border-b">
              {[
                { id: 'content', label: 'المحتوى' },
                { id: 'design', label: 'التصميم' },
                { id: 'schedule', label: 'الجدولة' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setModalTab(tab.id as typeof modalTab)}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    modalTab === tab.id ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {/* Content Tab */}
              {modalTab === 'content' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الموسم</label>
                      <select
                        value={editingContent.seasonType}
                        onChange={(e) => setEditingContent({ ...editingContent, seasonType: e.target.value as SeasonType })}
                        aria-label="الموسم"
                        className="w-full px-3 py-2 border rounded-lg"
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
                        aria-label="نوع المحتوى"
                        className="w-full px-3 py-2 border rounded-lg"
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
                      aria-label="العنوان بالعربي"
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="أدخل العنوان"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">العنوان (إنجليزي)</label>
                    <input
                      type="text"
                      value={editingContent.titleEn}
                      onChange={(e) => setEditingContent({ ...editingContent, titleEn: e.target.value })}
                      aria-label="العنوان بالإنجليزي"
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Enter title"
                      dir="ltr"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">المحتوى (عربي)</label>
                    <textarea
                      value={editingContent.contentAr}
                      onChange={(e) => setEditingContent({ ...editingContent, contentAr: e.target.value })}
                      rows={3}
                      aria-label="المحتوى بالعربي"
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="أدخل المحتوى بالعربي..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">المحتوى (إنجليزي)</label>
                    <textarea
                      value={editingContent.contentEn}
                      onChange={(e) => setEditingContent({ ...editingContent, contentEn: e.target.value })}
                      rows={3}
                      aria-label="المحتوى بالإنجليزي"
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Enter content..."
                      dir="ltr"
                    />
                  </div>

                  {/* Auto-translate seasonal content */}
                  <AutoTranslateField
                    label="ترجمة تلقائية للمحتوى"
                    fieldName="translations"
                    contentType="ui"
                    arabicText={editingContent.contentAr}
                    initialValues={{ ar: editingContent.contentAr, en: editingContent.contentEn }}
                    onSave={(translations: Record<string, string>) => {
                      setEditingContent({
                        ...editingContent,
                        contentEn: translations.en || editingContent.contentEn,
                        translations,
                      });
                    }}
                  />
                </div>
              )}

              {/* Design Tab */}
              {modalTab === 'design' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الأيقونة</label>
                    <input
                      type="text"
                      value={editingContent.icon}
                      onChange={(e) => setEditingContent({ ...editingContent, icon: e.target.value })}
                      aria-label="الأيقونة"
                      className="w-full px-3 py-2 border rounded-lg text-2xl text-center"
                      placeholder="🌙"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">لون الخلفية</label>
                      <input
                        type="color"
                        value={editingContent.backgroundColor}
                        onChange={(e) => setEditingContent({ ...editingContent, backgroundColor: e.target.value })}
                        aria-label="لون الخلفية"
                        className="w-full h-10 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">لون النص</label>
                      <input
                        type="color"
                        value={editingContent.textColor}
                        onChange={(e) => setEditingContent({ ...editingContent, textColor: e.target.value })}
                        aria-label="لون النص"
                        className="w-full h-10 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">اللون المميز</label>
                      <input
                        type="color"
                        value={editingContent.accentColor}
                        onChange={(e) => setEditingContent({ ...editingContent, accentColor: e.target.value })}
                        aria-label="اللون المميز"
                        className="w-full h-10 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                  
                  {/* Preview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">معاينة</label>
                    <Styled
                      className="p-6 rounded-xl text-center"
                      css={{ backgroundColor: editingContent.backgroundColor, color: editingContent.textColor }}
                    >
                      <span className="text-5xl mb-3 block">{editingContent.icon}</span>
                      <h3 className="text-xl font-bold mb-2">{editingContent.titleAr || 'العنوان'}</h3>
                      <p className="opacity-90">{editingContent.contentAr || 'المحتوى...'}</p>
                    </Styled>
                  </div>
                </div>
              )}

              {/* Schedule Tab */}
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البداية</label>
                      <input
                        type="text"
                        value={editingContent.startDate}
                        onChange={(e) => setEditingContent({ ...editingContent, startDate: e.target.value })}
                        aria-label="تاريخ البداية"
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="9-1 أو friday"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ النهاية</label>
                      <input
                        type="text"
                        value={editingContent.endDate}
                        onChange={(e) => setEditingContent({ ...editingContent, endDate: e.target.value })}
                        aria-label="تاريخ النهاية"
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="9-30 أو friday"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الأولوية</label>
                    <input
                      type="number"
                      value={editingContent.priority}
                      onChange={(e) => setEditingContent({ ...editingContent, priority: parseInt(e.target.value) })}
                      min={1}
                      max={100}
                      aria-label="الأولوية"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingContent.isActive}
                      onChange={(e) => setEditingContent({ ...editingContent, isActive: e.target.checked })}
                      aria-label="نشط"
                      className="w-5 h-5 text-emerald-600 rounded"
                    />
                    <span>نشط</span>
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
    </div>
  );
};

export default Seasonal;
