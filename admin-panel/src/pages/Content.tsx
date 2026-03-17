// admin-panel/src/pages/Content.tsx
// إدارة المحتوى - الأذكار، الآيات، الأحاديث - روح المسلم

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  Eye,
  EyeOff,
  Copy,
  Save,
  X,
  ChevronDown,
  BookOpen,
  Star,
  MessageCircle,
  Hash,
  Globe,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  Download,
  MoreVertical,
  GripVertical,
  Volume2,
  type LucideIcon,
} from 'lucide-react';
import { collection, doc, getDocs, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import AutoTranslateField from '../components/AutoTranslateField';

// ========================================
// الأنواع
// ========================================

type ContentType = 'azkar' | 'ayah' | 'hadith' | 'dua';
type SourceType = 'quran' | 'bukhari' | 'muslim' | 'tirmidhi' | 'abu_dawud' | 'nasai' | 'ibn_majah' | 'other';

interface ContentItem {
  id: string;
  type: ContentType;
  
  // المحتوى الأساسي
  textAr: string;
  textEn?: string;
  
  // التفاصيل
  titleAr?: string;
  titleEn?: string;
  category: string;
  subcategory?: string;
  
  // المصدر
  source: SourceType;
  sourceDetail?: string;
  reference?: string;
  
  // للأذكار
  count?: number;
  virtue?: string;
  
  // للآيات
  surahNumber?: number;
  surahName?: string;
  ayahNumber?: number;
  
  // الترجمات
  translations: Record<string, string>;
  
  // الصوت
  audioUrl?: string;
  
  // الإعدادات
  isActive: boolean;
  isFeatured: boolean;
  order: number;
  tags: string[];
  
  // الإحصائيات
  viewCount: number;
  shareCount: number;
  
  // التواريخ
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  color: string;
  itemCount: number;
}

// ========================================
// البيانات الافتراضية
// ========================================

const CONTENT_TYPES: { value: ContentType; label: string; icon: LucideIcon; color: string }[] = [
  { value: 'azkar', label: 'أذكار', icon: Star, color: '#2f7659' },
  { value: 'ayah', label: 'آيات', icon: BookOpen, color: '#3b82f6' },
  { value: 'hadith', label: 'أحاديث', icon: MessageCircle, color: '#f59e0b' },
  { value: 'dua', label: 'أدعية', icon: Star, color: '#8b5cf6' },
];

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: 'quran', label: 'القرآن الكريم' },
  { value: 'bukhari', label: 'صحيح البخاري' },
  { value: 'muslim', label: 'صحيح مسلم' },
  { value: 'tirmidhi', label: 'سنن الترمذي' },
  { value: 'abu_dawud', label: 'سنن أبي داود' },
  { value: 'nasai', label: 'سنن النسائي' },
  { value: 'ibn_majah', label: 'سنن ابن ماجه' },
  { value: 'other', label: 'مصدر آخر' },
];

const CATEGORIES: Category[] = [
  { id: 'morning', nameAr: 'أذكار الصباح', nameEn: 'Morning Azkar', icon: 'sun', color: '#f5a623', itemCount: 33 },
  { id: 'evening', nameAr: 'أذكار المساء', nameEn: 'Evening Azkar', icon: 'moon', color: '#5d4e8c', itemCount: 33 },
  { id: 'sleep', nameAr: 'أذكار النوم', nameEn: 'Sleep Azkar', icon: 'bed', color: '#3a7ca5', itemCount: 15 },
  { id: 'wake', nameAr: 'أذكار الاستيقاظ', nameEn: 'Wake Up Azkar', icon: 'sunrise', color: '#c17f59', itemCount: 10 },
  { id: 'prayer', nameAr: 'أذكار بعد الصلاة', nameEn: 'After Prayer', icon: 'mosque', color: '#2f7659', itemCount: 20 },
  { id: 'quran_duas', nameAr: 'أدعية قرآنية', nameEn: 'Quran Duas', icon: 'book', color: '#3b82f6', itemCount: 40 },
  { id: 'sunnah_duas', nameAr: 'أدعية من السنة', nameEn: 'Sunnah Duas', icon: 'book-open', color: '#2f7659', itemCount: 50 },
  { id: 'misc', nameAr: 'متنوعة', nameEn: 'Miscellaneous', icon: 'grid', color: '#6b7280', itemCount: 100 },
];

const SUPPORTED_LANGUAGES = [
  { code: 'ar', name: 'العربية' },
  { code: 'en', name: 'English' },
  { code: 'ur', name: 'اردو' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'ms', name: 'Melayu' },
  { code: 'fa', name: 'فارسی' },
  { code: 'ps', name: 'پښتو' },
  { code: 'es', name: 'Español' },
];

// ========================================
// المكون الرئيسي
// ========================================

const ContentPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ContentType>('azkar');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ContentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // حالة النموذج
  const emptyItem: ContentItem = {
    id: '',
    type: 'azkar',
    textAr: '',
    category: '',
    source: 'other',
    translations: {},
    isActive: true,
    isFeatured: false,
    order: 0,
    tags: [],
    viewCount: 0,
    shareCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const [formData, setFormData] = useState<ContentItem>(emptyItem);
  const [activeFormTab, setActiveFormTab] = useState<'content' | 'translations' | 'settings'>('content');

  // تحميل البيانات
  useEffect(() => {
    loadContent();
  }, [activeTab]);

  // فلترة البيانات
  useEffect(() => {
    let filtered = items;
    
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.textAr.includes(searchQuery) ||
        item.titleAr?.includes(searchQuery) ||
        item.textEn?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    setFilteredItems(filtered);
  }, [items, searchQuery, selectedCategory]);

  const loadContent = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'content'), where('type', '==', activeTab));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ContentItem));
      data.sort((a, b) => (a.order || 0) - (b.order || 0));
      setItems(data);
    } catch (error) {
      console.error('Error loading content:', error);
      setItems([]);
    }
    setIsLoading(false);
  };

  // فتح نافذة الإضافة
  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ ...emptyItem, id: `content_${Date.now()}`, type: activeTab });
    setActiveFormTab('content');
    setIsModalOpen(true);
  };

  // فتح نافذة التعديل
  const handleEdit = (item: ContentItem) => {
    setEditingItem(item);
    setFormData({ ...item });
    setActiveFormTab('content');
    setIsModalOpen(true);
  };

  // حفظ
  const handleSave = async () => {
    const updatedItem = { ...formData, updatedAt: new Date().toISOString() };
    
    try {
      await setDoc(doc(db, 'content', updatedItem.id), updatedItem);
      await loadContent();
    } catch (error) {
      console.error('Error saving content:', error);
    }
    setIsModalOpen(false);
  };

  // حذف
  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا العنصر؟')) {
      try {
        await deleteDoc(doc(db, 'content', id));
        await loadContent();
      } catch (error) {
        console.error('Error deleting content:', error);
      }
    }
  };

  // تفعيل/تعطيل
  const handleToggleActive = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    try {
      await setDoc(doc(db, 'content', id), { ...item, isActive: !item.isActive, updatedAt: new Date().toISOString() });
      await loadContent();
    } catch (error) {
      console.error('Error toggling content:', error);
    }
  };

  // نسخ
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: إظهار رسالة نجاح
  };

  // تصدير
  const handleExport = () => {
    const data = JSON.stringify(items, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">إدارة المحتوى</h1>
          <p className="text-gray-400 mt-1">إضافة وتعديل الأذكار والآيات والأحاديث</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
          >
            <Download size={18} />
            <span>تصدير</span>
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={18} />
            <span>إضافة جديد</span>
          </button>
        </div>
      </div>

      {/* التبويبات */}
      <div className="flex gap-2 mb-6 border-b border-gray-700 pb-4">
        {CONTENT_TYPES.map(type => (
          <button
            key={type.value}
            onClick={() => setActiveTab(type.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === type.value
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <type.icon size={18} style={{ color: activeTab === type.value ? type.color : undefined }} />
            <span>{type.label}</span>
            <span className="bg-gray-600 px-2 py-0.5 rounded text-xs">
              {items.length}
            </span>
          </button>
        ))}
      </div>

      {/* البحث والفلترة */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="بحث في المحتوى..."
            aria-label="بحث في المحتوى"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pr-10 pl-4 py-3 focus:border-green-500 outline-none"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          aria-label="فلترة حسب القسم"
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-green-500 outline-none min-w-[200px]"
        >
          <option value="all">جميع الأقسام</option>
          {CATEGORIES.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.nameAr}</option>
          ))}
        </select>
      </div>

      {/* الإحصائيات السريعة */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">إجمالي العناصر</div>
          <div className="text-2xl font-bold mt-1">{items.length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">النشطة</div>
          <div className="text-2xl font-bold mt-1 text-green-500">
            {items.filter(i => i.isActive).length}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">المميزة</div>
          <div className="text-2xl font-bold mt-1 text-yellow-500">
            {items.filter(i => i.isFeatured).length}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">إجمالي المشاهدات</div>
          <div className="text-2xl font-bold mt-1 text-blue-500">
            {items.reduce((sum, i) => sum + i.viewCount, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* قائمة المحتوى */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 p-4 bg-gray-700/50 text-sm text-gray-400 font-medium">
          <div className="col-span-1">#</div>
          <div className="col-span-5">المحتوى</div>
          <div className="col-span-2">القسم</div>
          <div className="col-span-1">العدد</div>
          <div className="col-span-1">المشاهدات</div>
          <div className="col-span-1">الحالة</div>
          <div className="col-span-1">إجراءات</div>
        </div>

        {/* Items */}
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-4" />
            جاري التحميل...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
            <p>لا يوجد محتوى</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredItems.map((item, index) => (
              <div
                key={item.id}
                className={`grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-700/30 transition-colors ${
                  !item.isActive ? 'opacity-50' : ''
                }`}
              >
                <div className="col-span-1 text-gray-400">
                  {index + 1}
                </div>
                <div className="col-span-5">
                  <p className="text-white line-clamp-2 leading-relaxed">{item.textAr}</p>
                  {item.titleAr && (
                    <p className="text-gray-400 text-sm mt-1">{item.titleAr}</p>
                  )}
                  {item.isFeatured && (
                    <span className="inline-flex items-center gap-1 text-yellow-500 text-xs mt-2">
                      <Star size={12} fill="currentColor" />
                      مميز
                    </span>
                  )}
                </div>
                <div className="col-span-2">
                  <span className="px-2 py-1 bg-gray-700 rounded text-sm">
                    {CATEGORIES.find(c => c.id === item.category)?.nameAr || item.category}
                  </span>
                </div>
                <div className="col-span-1 text-center">
                  {item.count || '-'}
                </div>
                <div className="col-span-1 text-gray-400">
                  {item.viewCount.toLocaleString()}
                </div>
                <div className="col-span-1">
                  <button
                    onClick={() => handleToggleActive(item.id)}
                    className={`p-1 rounded ${item.isActive ? 'text-green-500' : 'text-gray-500'}`}
                    aria-label={item.isActive ? 'إخفاء' : 'تفعيل'}
                    title={item.isActive ? 'إخفاء' : 'تفعيل'}
                  >
                    {item.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
                <div className="col-span-1 flex gap-1">
                  <button
                    onClick={() => handleCopy(item.textAr)}
                    className="p-2 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white"
                    title="نسخ"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-2 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-yellow-500"
                    title="تعديل"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-red-500"
                    title="حذف"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* نافذة الإضافة/التعديل */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold">
                {editingItem ? 'تعديل المحتوى' : 'إضافة محتوى جديد'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="إغلاق"
                title="إغلاق"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-700">
              {([
                { id: 'content' as const, label: 'المحتوى' },
                { id: 'translations' as const, label: 'الترجمات' },
                { id: 'settings' as const, label: 'الإعدادات' },
              ]).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFormTab(tab.id)}
                  className={`px-6 py-3 transition-colors ${
                    activeFormTab === tab.id
                      ? 'bg-gray-700 text-white border-b-2 border-green-500'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* تاب المحتوى */}
              {activeFormTab === 'content' && (
                <div className="space-y-4">
                  {/* النص العربي */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">النص العربي *</label>
                    <textarea
                      value={formData.textAr}
                      onChange={e => setFormData({ ...formData, textAr: e.target.value })}
                      rows={4}
                      className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none resize-none text-lg leading-relaxed"
                      aria-label="النص العربي"
                      placeholder="أدخل النص العربي..."
                      dir="rtl"
                    />
                  </div>

                  {/* العنوان */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">العنوان (عربي)</label>
                      <input
                        type="text"
                        value={formData.titleAr || ''}
                        onChange={e => setFormData({ ...formData, titleAr: e.target.value })}
                        className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                        placeholder="عنوان اختياري"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">العنوان (إنجليزي)</label>
                      <input
                        type="text"
                        value={formData.titleEn || ''}
                        onChange={e => setFormData({ ...formData, titleEn: e.target.value })}
                        className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                        placeholder="Optional title"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* القسم والمصدر */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">القسم *</label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        aria-label="القسم"
                        className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                      >
                        <option value="">اختر القسم</option>
                        {CATEGORIES.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.nameAr}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">المصدر</label>
                      <select
                        value={formData.source}
                        onChange={e => setFormData({ ...formData, source: e.target.value as SourceType })}
                        aria-label="المصدر"
                        className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                      >
                        {SOURCE_TYPES.map(src => (
                          <option key={src.value} value={src.value}>{src.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* تفاصيل المصدر */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">تفاصيل المصدر</label>
                    <input
                      type="text"
                      value={formData.sourceDetail || ''}
                      onChange={e => setFormData({ ...formData, sourceDetail: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                      placeholder="مثال: رواه البخاري ومسلم"
                    />
                  </div>

                  {/* العدد والفضل (للأذكار) */}
                  {formData.type === 'azkar' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">عدد التكرار</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.count || 1}
                          onChange={e => setFormData({ ...formData, count: parseInt(e.target.value) || 1 })}
                          aria-label="عدد التكرار"
                          className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">رابط الصوت (اختياري)</label>
                        <input
                          type="url"
                          value={formData.audioUrl || ''}
                          onChange={e => setFormData({ ...formData, audioUrl: e.target.value })}
                          className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                          placeholder="https://..."
                          dir="ltr"
                        />
                      </div>
                    </div>
                  )}

                  {/* الفضل */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">الفضل / الفائدة</label>
                    <textarea
                      value={formData.virtue || ''}
                      onChange={e => setFormData({ ...formData, virtue: e.target.value })}
                      rows={2}
                      className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none resize-none"
                      aria-label="الفضل / الفائدة"
                      placeholder="فضل هذا الذكر أو الدعاء..."
                    />
                  </div>
                </div>
              )}

              {/* تاب الترجمات */}
              {activeFormTab === 'translations' && (
                <div className="space-y-4">
                  <p className="text-gray-400 text-sm mb-4">
                    أضف ترجمات للمحتوى بلغات مختلفة
                  </p>

                  {/* Auto-translate */}
                  <AutoTranslateField
                    label="ترجمة تلقائية"
                    fieldName="translations"
                    contentType={formData.type === 'ayah' ? 'quran' : formData.type === 'hadith' ? 'hadith' : 'adhkar'}
                    arabicText={formData.arabic}
                    initialValues={formData.translations}
                    onSave={(translations) => setFormData({
                      ...formData,
                      translations: { ...formData.translations, ...translations },
                    })}
                  />
                  
                  {SUPPORTED_LANGUAGES.filter(lang => lang.code !== 'ar').map(lang => (
                    <div key={lang.code}>
                      <label className="block text-sm text-gray-400 mb-2">
                        {lang.name} ({lang.code})
                      </label>
                      <textarea
                        value={formData.translations[lang.code] || ''}
                        onChange={e => setFormData({
                          ...formData,
                          translations: {
                            ...formData.translations,
                            [lang.code]: e.target.value,
                          },
                        })}
                        rows={2}
                        className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none resize-none"
                        aria-label={`ترجمة ${lang.name}`}
                        placeholder={`الترجمة بـ ${lang.name}...`}
                        dir={['ur', 'fa', 'ps'].includes(lang.code) ? 'rtl' : 'ltr'}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* تاب الإعدادات */}
              {activeFormTab === 'settings' && (
                <div className="space-y-4">
                  {/* الترتيب */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">الترتيب</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.order}
                      onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                      aria-label="الترتيب"
                      className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>

                  {/* الوسوم */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">الوسوم (مفصولة بفاصلة)</label>
                    <input
                      type="text"
                      value={formData.tags.join(', ')}
                      onChange={e => setFormData({
                        ...formData,
                        tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean),
                      })}
                      aria-label="الوسوم"
                      className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                      placeholder="صباح، يومي، مهم"
                    />
                  </div>

                  {/* الخيارات */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-5 h-5 rounded"
                      />
                      <div>
                        <span className="text-white">نشط</span>
                        <p className="text-gray-400 text-sm">يظهر للمستخدمين في التطبيق</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isFeatured}
                        onChange={e => setFormData({ ...formData, isFeatured: e.target.checked })}
                        className="w-5 h-5 rounded"
                      />
                      <div>
                        <span className="text-white">مميز</span>
                        <p className="text-gray-400 text-sm">يظهر في قسم المميزات</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.textAr || !formData.category}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <Save size={18} />
                <span>حفظ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentPage;
