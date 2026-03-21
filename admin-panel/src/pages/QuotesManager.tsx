// admin-panel/src/pages/QuotesManager.tsx
// إدارة الحكم والأقوال - روح المسلم

import React, { useState, useEffect, useCallback } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Search, Edit2, Trash2, Save, X, Download, RefreshCw, Copy, CopyPlus } from 'lucide-react';

// ========================================
// الأنواع
// ========================================

interface IslamicQuote {
  id: string;
  arabic: string;
  translation: string;
  author: string;
  source?: string;
  category?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface QuotesData {
  version: string;
  lastUpdate: string;
  totalCount: number;
  quotes: IslamicQuote[];
}

// ========================================
// الثوابت
// ========================================

const CATEGORIES = [
  { id: 'companions', name: 'أقوال الصحابة', icon: '⭐', color: 'bg-amber-500' },
  { id: 'scholars', name: 'أقوال العلماء', icon: '📚', color: 'bg-blue-500' },
  { id: 'wisdom', name: 'حكم عربية', icon: '💡', color: 'bg-purple-500' },
  { id: 'prophetic', name: 'حكم نبوية', icon: '🌙', color: 'bg-emerald-500' },
  { id: 'islamic', name: 'حكم إسلامية', icon: '🕌', color: 'bg-teal-500' },
];

// Firebase URL for production
// const FIREBASE_QUOTES_URL = 'https://your-firebase-url.com/quotes.json';

// ========================================
// المكون الرئيسي
// ========================================

const QuotesManager: React.FC = () => {
  const [quotesData, setQuotesData] = useState<QuotesData | null>(null);
  const [quotesList, setQuotesList] = useState<IslamicQuote[]>([]);
  const [filteredList, setFilteredList] = useState<IslamicQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingQuote, setEditingQuote] = useState<IslamicQuote | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  // Form state for add/edit
  const [formData, setFormData] = useState<Partial<IslamicQuote>>({
    arabic: '',
    translation: '',
    author: '',
    source: '',
    category: 'wisdom',
    isActive: true,
  });

  // ========================================
  // تحميل البيانات
  // ========================================

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'quotes')), (snap) => {
      const loaded: IslamicQuote[] = [];
      snap.forEach(d => {
        const data = d.data();
        loaded.push({
          id: d.id,
          arabic: data.arabic || '',
          translation: data.translation || '',
          author: data.author || '',
          source: data.source || '',
          category: data.category || 'wisdom',
          isActive: data.isActive !== false,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : (data.updatedAt || new Date().toISOString()),
        });
      });
      loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setQuotesList(loaded);
      setQuotesData({
        version: '1.0.0',
        lastUpdate: new Date().toISOString(),
        totalCount: loaded.length,
        quotes: loaded,
      });
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  useEffect(() => {
    filterQuotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotesList, selectedCategory, searchQuery]);

  const filterQuotes = useCallback(() => {
    let filtered = [...quotesList];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(q => q.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q =>
        q.arabic.toLowerCase().includes(query) ||
        q.translation.toLowerCase().includes(query) ||
        q.author.toLowerCase().includes(query)
      );
    }

    setFilteredList(filtered);
  }, [quotesList, selectedCategory, searchQuery]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
  };

  // ========================================
  // إدارة الأقوال
  // ========================================

  const handleAddQuote = () => {
    setFormData({
      arabic: '',
      translation: '',
      author: '',
      source: '',
      category: 'wisdom',
      isActive: true,
    });
    setEditingQuote(null);
    setShowAddModal(true);
  };

  const handleEditQuote = (quote: IslamicQuote) => {
    setFormData({ ...quote });
    setEditingQuote(quote);
    setShowAddModal(true);
  };

  const handleSaveQuote = async () => {
    if (!formData.arabic || !formData.translation || !formData.author) {
      showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    try {
      if (editingQuote && editingQuote.id) {
        // Update existing quote in Firestore
        await setDoc(doc(db, 'quotes', editingQuote.id), {
          arabic: formData.arabic,
          translation: formData.translation,
          author: formData.author,
          source: formData.source || '',
          category: formData.category || 'wisdom',
          isActive: formData.isActive !== false,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        showNotification('تم تحديث القول بنجاح', 'success');
      } else {
        // Add new quote to Firestore
        const newId = `quote_${Date.now()}`;
        await setDoc(doc(db, 'quotes', newId), {
          arabic: formData.arabic,
          translation: formData.translation,
          author: formData.author,
          source: formData.source || '',
          category: formData.category || 'wisdom',
          isActive: formData.isActive !== false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showNotification('تم إضافة القول بنجاح', 'success');
      }
      setShowAddModal(false);
    } catch (e) {
      console.error('Error saving quote:', e);
      showNotification('فشل في حفظ القول', 'error');
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القول؟')) return;

    try {
      await deleteDoc(doc(db, 'quotes', quoteId));
      showNotification('تم حذف القول بنجاح', 'success');
    } catch (e) {
      console.error('Error deleting quote:', e);
      showNotification('فشل في حذف القول', 'error');
    }
  };

  const handleToggleActive = async (quoteId: string) => {
    const quote = quotesList.find(q => q.id === quoteId);
    if (!quote) return;
    try {
      await setDoc(doc(db, 'quotes', quoteId), { isActive: !quote.isActive, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.error('Error toggling quote:', e);
    }
  };

  const handleExportQuotes = () => {
    const data = JSON.stringify(quotesData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quotes.json';
    a.click();
    URL.revokeObjectURL(url);
    showNotification('تم تصدير الأقوال بنجاح', 'success');
  };

  const handleCopyQuote = (quote: IslamicQuote) => {
    const text = `${quote.arabic}\n\n${quote.translation}\n\n— ${quote.author}`;
    navigator.clipboard.writeText(text);
    showNotification('تم نسخ القول', 'success');
  };

  // ========================================
  // العرض
  // ========================================

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* الإشعارات */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white font-medium animate-fade-in`}>
          {notification.message}
        </div>
      )}

      {/* العنوان والإحصائيات */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إدارة الحكم والأقوال</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">إضافة وتعديل وحذف الأقوال والحكم الإسلامية — بيانات حية من Firestore</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportQuotes}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            >
              <Download className="w-4 h-4" />
              تصدير JSON
            </button>
            <button
              onClick={handleAddQuote}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              إضافة قول جديد
            </button>
          </div>
        </div>

        {/* الإحصائيات */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 text-sm">إجمالي الأقوال</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{quotesList.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 text-sm">الأقوال النشطة</p>
            <p className="text-2xl font-bold text-green-500">{quotesList.filter(q => q.isActive).length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 text-sm">الفئات</p>
            <p className="text-2xl font-bold text-blue-500">{CATEGORIES.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 text-sm">آخر تحديث</p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {quotesData?.lastUpdate ? new Date(quotesData.lastUpdate).toLocaleDateString('ar-SA') : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* الفلاتر */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* البحث */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="بحث في الأقوال..."
              aria-label="بحث في الأقوال"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            />
          </div>

          {/* الفئات */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              الكل
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <span>{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* قائمة الأقوال */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 dark:text-gray-400">لا توجد أقوال</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredList.map(quote => (
              <div
                key={quote.id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  !quote.isActive ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2" dir="rtl">
                      {quote.arabic}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                      {quote.translation}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <span className="font-medium">المؤلف:</span>
                        {quote.author}
                      </span>
                      {quote.category && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                          {CATEGORIES.find(c => c.id === quote.category)?.name || quote.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyQuote(quote)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      aria-label="نسخ النص"
                      title="نسخ النص"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditQuote({ ...quote, id: '', arabic: quote.arabic + ' (نسخة)' })}
                      className="p-2 text-emerald-500 hover:text-emerald-600 transition-colors"
                      aria-label="تكرار"
                      title="تكرار"
                    >
                      <CopyPlus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditQuote(quote)}
                      className="p-2 text-blue-500 hover:text-blue-600 transition-colors"
                      aria-label="تعديل"
                      title="تعديل"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuote(quote.id)}
                      className="p-2 text-red-500 hover:text-red-600 transition-colors"
                      aria-label="حذف"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quote.isActive}
                        onChange={() => handleToggleActive(quote.id)}
                        className="sr-only peer"
                        aria-label="تفعيل/إلغاء تفعيل"
                        title="تفعيل/إلغاء تفعيل"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-green-500"></div>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal إضافة/تعديل */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingQuote ? 'تعديل القول' : 'إضافة قول جديد'}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="إغلاق"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* النص العربي */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  النص العربي <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.arabic || ''}
                  onChange={(e) => setFormData({ ...formData, arabic: e.target.value })}
                  rows={3}
                  dir="rtl"
                  aria-label="النص العربي"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                  placeholder="أدخل النص العربي للقول..."
                />
              </div>

              {/* الترجمة */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الترجمة الإنجليزية <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.translation || ''}
                  onChange={(e) => setFormData({ ...formData, translation: e.target.value })}
                  rows={3}
                  aria-label="الترجمة الإنجليزية"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                  placeholder="Enter the English translation..."
                />
              </div>

              {/* المؤلف */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  المؤلف/القائل <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.author || ''}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  dir="rtl"
                  aria-label="المؤلف/القائل"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                  placeholder="مثال: الإمام الشافعي"
                />
              </div>

              {/* المصدر */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  المصدر (اختياري)
                </label>
                <input
                  type="text"
                  value={formData.source || ''}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  dir="rtl"
                  aria-label="المصدر"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                  placeholder="مثال: ديوان الإمام الشافعي"
                />
              </div>

              {/* الفئة */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الفئة
                </label>
                <select
                  value={formData.category || 'wisdom'}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                  aria-label="الفئة"
                  title="اختر الفئة"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* نشط */}
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive ?? true}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="sr-only peer"
                    aria-label="تفعيل/إلغاء تفعيل القول"
                    title="تفعيل/إلغاء تفعيل القول"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-500"></div>
                </label>
                <span className="text-sm text-gray-700 dark:text-gray-300">نشط</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveQuote}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Save className="w-4 h-4" />
                {editingQuote ? 'حفظ التغييرات' : 'إضافة القول'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotesManager;
