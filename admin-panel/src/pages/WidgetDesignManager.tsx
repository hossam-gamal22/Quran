// admin-panel/src/pages/WidgetDesignManager.tsx
// إدارة تصميمات الودجات — روح المسلم

import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Save,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Palette,
  Type,
  Layers,
  Code,
  Eye,
  Download,
  Upload,
  Image,
  Plus,
  Trash2,
} from 'lucide-react';
import { db } from '../firebase';
import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';

// ========================================
// الأنواع
// ========================================

interface TextOverlay {
  id: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  position: 'top' | 'center' | 'bottom';
}

interface WidgetConfig {
  name: string;
  nameAr: string;
  version: string;
  sizes: string[];
  colors: {
    text: string;
    accent: string;
    background: string;
  };
  fonts: {
    title: string;
    body: string;
    numbers: string;
  };
  elements: Record<string, boolean>;
  icon: string;
  refreshInterval: string;
  iconImage?: string;
  textOverlays?: TextOverlay[];
}

interface WidgetDesign {
  id: string;
  config: WidgetConfig;
  iconSvg: string;
  backgroundSvg: string;
  updatedAt: string;
}

const WIDGET_TYPES = [
  { id: 'prayer_times', nameAr: 'مواقيت الصلاة', icon: '🕌' },
  { id: 'verse_of_day', nameAr: 'آية اليوم', icon: '📖' },
  { id: 'dhikr', nameAr: 'الأذكار', icon: '📿' },
  { id: 'tasbih', nameAr: 'التسبيح', icon: '🤲' },
  { id: 'hijri_date', nameAr: 'التاريخ الهجري', icon: '📅' },
  { id: 'countdown', nameAr: 'العد التنازلي', icon: '⏳' },
];

// ========================================
// المكون الرئيسي
// ========================================

const WidgetDesignManager: React.FC = () => {
  const [widgets, setWidgets] = useState<WidgetDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'icon' | 'background' | 'iconImage'>('config');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadWidgets();
  }, []);

  const loadWidgets = async () => {
    try {
      setLoading(true);
      const loaded: WidgetDesign[] = [];

      for (const wt of WIDGET_TYPES) {
        const docSnap = await getDoc(doc(db, 'widgetDesigns', wt.id));
        if (docSnap.exists()) {
          loaded.push({ id: wt.id, ...docSnap.data() } as WidgetDesign);
        } else {
          // Provide empty defaults if not yet in Firestore
          loaded.push({
            id: wt.id,
            config: {
              name: wt.id.replace(/_/g, ' '),
              nameAr: wt.nameAr,
              version: '1.0',
              sizes: ['small', 'medium'],
              colors: { text: '#081827', accent: '#0f987f', background: '#FFFFFF' },
              fonts: { title: 'Cairo-Bold', body: 'Cairo-Regular', numbers: 'Cairo-SemiBold' },
              elements: {},
              icon: '',
              refreshInterval: 'daily',
            },
            iconSvg: '',
            backgroundSvg: '',
            updatedAt: '',
          });
        }
      }

      setWidgets(loaded);
    } catch (error) {
      console.error('Error loading widget designs:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveWidget = async (widget: WidgetDesign) => {
    try {
      setSaving(true);
      const payload = {
        config: widget.config,
        iconSvg: widget.iconSvg,
        backgroundSvg: widget.backgroundSvg,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'widgetDesigns', widget.id), payload);
      setSaveStatus(`تم حفظ ${widget.config.nameAr}`);
      setTimeout(() => setSaveStatus(null), 3000);
      await loadWidgets();
    } catch (error) {
      console.error('Error saving widget:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateWidget = (id: string, updates: Partial<WidgetDesign>) => {
    setWidgets(prev => prev.map(w =>
      w.id === id ? { ...w, ...updates } : w
    ));
  };

  const getConfigValue = (config: WidgetConfig, path: string): string => {
    const parts = path.split('.');
    if (parts.length === 2) {
      return (config[parts[0] as keyof WidgetConfig] as Record<string, string>)?.[parts[1]] || '';
    }
    return String((config as unknown as Record<string, unknown>)[path] || '');
  };

  const updateConfig = (id: string, field: string, value: string) => {
    setWidgets(prev => prev.map(w => {
      if (w.id !== id) return w;
      const config = { ...w.config };

      // Handle nested fields like "colors.accent"
      const parts = field.split('.');
      if (parts.length === 2) {
        const [parent, child] = parts;
        (config as unknown as Record<string, Record<string, string>>)[parent] = {
          ...(config as unknown as Record<string, Record<string, string>>)[parent],
          [child]: value,
        };
      } else {
        (config as unknown as Record<string, string>)[field] = value;
      }

      return { ...w, config };
    }));
  };

  const handleImportSvg = (widgetId: string, type: 'icon' | 'background') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.svg';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        if (type === 'icon') {
          updateWidget(widgetId, { iconSvg: content });
        } else {
          updateWidget(widgetId, { backgroundSvg: content });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleExportSvg = (svg: string, filename: string) => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportIconImage = (widgetId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > 500 * 1024) {
        alert('حجم الصورة يجب ألا يزيد عن 500 كيلوبايت');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        updateConfig(widgetId, 'iconImage', dataUrl);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const addTextOverlay = (widgetId: string) => {
    setWidgets(prev => prev.map(w => {
      if (w.id !== widgetId) return w;
      const overlays = w.config.textOverlays || [];
      return {
        ...w,
        config: {
          ...w.config,
          textOverlays: [
            ...overlays,
            {
              id: Date.now().toString(),
              text: 'نص جديد',
              fontFamily: 'Cairo-Bold',
              fontSize: 16,
              color: w.config.colors.text,
              position: 'center' as const,
            },
          ],
        },
      };
    }));
  };

  const updateTextOverlay = (widgetId: string, overlayId: string, updates: Partial<TextOverlay>) => {
    setWidgets(prev => prev.map(w => {
      if (w.id !== widgetId) return w;
      return {
        ...w,
        config: {
          ...w.config,
          textOverlays: (w.config.textOverlays || []).map(o =>
            o.id === overlayId ? { ...o, ...updates } : o
          ),
        },
      };
    }));
  };

  const removeTextOverlay = (widgetId: string, overlayId: string) => {
    setWidgets(prev => prev.map(w => {
      if (w.id !== widgetId) return w;
      return {
        ...w,
        config: {
          ...w.config,
          textOverlays: (w.config.textOverlays || []).filter(o => o.id !== overlayId),
        },
      };
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Smartphone className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              إدارة تصميمات الودجات
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              تعديل SVG، الألوان، الخطوط، وإعدادات كل ودجت
            </p>
          </div>
        </div>

        <button
          onClick={loadWidgets}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title="تحديث"
          aria-label="تحديث"
        >
          <RefreshCw className="w-4 h-4" />
          <span>تحديث</span>
        </button>
      </div>

      {/* Save status */}
      {saveStatus && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-emerald-700 dark:text-emerald-300 text-sm">
          ✓ {saveStatus}
        </div>
      )}

      {/* Widget cards */}
      <div className="space-y-4">
        {widgets.map((widget) => {
          const meta = WIDGET_TYPES.find(w => w.id === widget.id);
          const isExpanded = expandedId === widget.id;

          return (
            <div
              key={widget.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Widget header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : widget.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                title={meta?.nameAr}
                aria-label={`${isExpanded ? 'طي' : 'فتح'} ${meta?.nameAr}`}
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{meta?.icon}</span>
                  <div className="text-right">
                    <h3 className="font-bold text-gray-900 dark:text-white">{widget.config.nameAr}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      v{widget.config.version} · {widget.config.sizes.join(', ')}
                      {widget.updatedAt && ` · آخر تعديل: ${new Date(widget.updatedAt).toLocaleDateString('ar')}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Color preview dots */}
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: widget.config.colors.accent }} />
                    <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: widget.config.colors.text }} />
                    <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: widget.config.colors.background }} />
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700">
                  {/* Tabs */}
                  <div className="flex border-b border-gray-200 dark:border-gray-700">
                    {[
                      { key: 'config' as const, label: 'الإعدادات', icon: Layers },
                      { key: 'iconImage' as const, label: 'صورة أيقونة', icon: Image },
                      { key: 'icon' as const, label: 'أيقونة SVG', icon: Code },
                      { key: 'background' as const, label: 'خلفية SVG', icon: Palette },
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                          activeTab === tab.key
                            ? 'text-emerald-600 border-b-2 border-emerald-500'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                        title={tab.label}
                        aria-label={tab.label}
                      >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Config tab */}
                    {activeTab === 'config' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Names */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            الاسم (عربي)
                          </label>
                          <input
                            value={widget.config.nameAr}
                            onChange={e => updateConfig(widget.id, 'nameAr', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            placeholder="الاسم بالعربي"
                            aria-label="الاسم (عربي)"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Name (EN)
                          </label>
                          <input
                            value={widget.config.name}
                            onChange={e => updateConfig(widget.id, 'name', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            dir="ltr"
                            placeholder="Name in English"
                            aria-label="Name (EN)"
                          />
                        </div>

                        {/* Colors */}
                        <div className="md:col-span-2">
                          <div className="flex items-center gap-2 mb-2">
                            <Palette className="w-4 h-4 text-gray-500" />
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">الألوان</label>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { key: 'colors.accent', label: 'اللون الأساسي' },
                              { key: 'colors.text', label: 'لون النص' },
                              { key: 'colors.background', label: 'لون الخلفية' },
                            ].map(c => (
                              <div key={c.key} className="space-y-1">
                                <label className="text-xs text-gray-500 dark:text-gray-400">{c.label}</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={getConfigValue(widget.config, c.key)}
                                    onChange={e => updateConfig(widget.id, c.key, e.target.value)}
                                    className="w-8 h-8 rounded border-0 cursor-pointer"
                                    title={c.label}
                                    aria-label={c.label}
                                  />
                                  <input
                                    value={getConfigValue(widget.config, c.key)}
                                    onChange={e => updateConfig(widget.id, c.key, e.target.value)}
                                    className="flex-1 px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-mono"
                                    dir="ltr"
                                    placeholder="#000000"
                                    aria-label={`قيمة ${c.label}`}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Fonts */}
                        <div className="md:col-span-2">
                          <div className="flex items-center gap-2 mb-2">
                            <Type className="w-4 h-4 text-gray-500" />
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">الخطوط</label>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { key: 'fonts.title', label: 'العنوان' },
                              { key: 'fonts.body', label: 'الجسم' },
                              { key: 'fonts.numbers', label: 'الأرقام' },
                            ].map(f => (
                              <div key={f.key} className="space-y-1">
                                <label className="text-xs text-gray-500 dark:text-gray-400">{f.label}</label>
                                <input
                                  value={getConfigValue(widget.config, f.key)}
                                  onChange={e => updateConfig(widget.id, f.key, e.target.value)}
                                  className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                  dir="ltr"
                                  placeholder="Cairo-Bold"
                                  aria-label={f.label}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Version & Refresh */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">الإصدار</label>
                          <input
                            value={widget.config.version}
                            onChange={e => updateConfig(widget.id, 'version', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            dir="ltr"
                            placeholder="1.0"
                            aria-label="الإصدار"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">تحديث كل</label>
                          <select
                            value={widget.config.refreshInterval}
                            onChange={e => updateConfig(widget.id, 'refreshInterval', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            title="فترة التحديث"
                            aria-label="تحديث كل"
                          >
                            <option value="manual">يدوي</option>
                            <option value="daily">يومي</option>
                            <option value="per_prayer">كل صلاة</option>
                            <option value="hourly">كل ساعة</option>
                          </select>
                        </div>

                        {/* Text Overlays */}
                        <div className="md:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Type className="w-4 h-4 text-gray-500" />
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">نصوص مخصصة على الودجت</label>
                            </div>
                            <button
                              onClick={() => addTextOverlay(widget.id)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                              title="إضافة نص"
                              aria-label="إضافة نص"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              إضافة نص
                            </button>
                          </div>

                          {(widget.config.textOverlays || []).length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">لا توجد نصوص مخصصة. اضغط "إضافة نص" لإضافة نص يظهر على الودجت.</p>
                          )}

                          <div className="space-y-3">
                            {(widget.config.textOverlays || []).map((overlay) => (
                              <div key={overlay.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-2 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">نص مخصص</span>
                                  <button
                                    onClick={() => removeTextOverlay(widget.id, overlay.id)}
                                    className="p-1 text-red-400 hover:text-red-600 transition-colors"
                                    title="حذف"
                                    aria-label="حذف نص مخصص"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <input
                                  value={overlay.text}
                                  onChange={e => updateTextOverlay(widget.id, overlay.id, { text: e.target.value })}
                                  className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                  placeholder="النص المراد عرضه"
                                  aria-label="نص العرض"
                                />
                                <div className="grid grid-cols-4 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-xs text-gray-400">الخط</label>
                                    <input
                                      value={overlay.fontFamily}
                                      onChange={e => updateTextOverlay(widget.id, overlay.id, { fontFamily: e.target.value })}
                                      className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs"
                                      dir="ltr"
                                      placeholder="Cairo-Bold"
                                      aria-label="الخط"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs text-gray-400">الحجم</label>
                                    <input
                                      type="number"
                                      value={overlay.fontSize}
                                      onChange={e => updateTextOverlay(widget.id, overlay.id, { fontSize: Number(e.target.value) })}
                                      className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs"
                                      dir="ltr"
                                      title="حجم الخط"
                                      aria-label="حجم الخط"
                                      placeholder="14"
                                      min={8}
                                      max={72}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs text-gray-400">اللون</label>
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="color"
                                        value={overlay.color}
                                        onChange={e => updateTextOverlay(widget.id, overlay.id, { color: e.target.value })}
                                        className="w-6 h-6 rounded border-0 cursor-pointer"
                                        title="لون النص"
                                        aria-label="لون النص"
                                      />
                                      <input
                                        value={overlay.color}
                                        onChange={e => updateTextOverlay(widget.id, overlay.id, { color: e.target.value })}
                                        className="flex-1 px-1 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-mono"
                                        dir="ltr"
                                        title="قيمة اللون"
                                        aria-label="قيمة لون النص"
                                        placeholder="#000000"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs text-gray-400">الموضع</label>
                                    <select
                                      value={overlay.position}
                                      onChange={e => updateTextOverlay(widget.id, overlay.id, { position: e.target.value as 'top' | 'center' | 'bottom' })}
                                      className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs"
                                      title="موضع النص"
                                      aria-label="موضع النص"
                                    >
                                      <option value="top">أعلى</option>
                                      <option value="center">وسط</option>
                                      <option value="bottom">أسفل</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Icon Image tab */}
                    {activeTab === 'iconImage' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">صورة أيقونة الودجت (PNG/JPG)</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleImportIconImage(widget.id)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg text-xs hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                              title="رفع صورة"
                              aria-label="رفع صورة"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              رفع صورة
                            </button>
                            {widget.config.iconImage && (
                              <button
                                onClick={() => updateConfig(widget.id, 'iconImage', '')}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-xs hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                title="حذف الصورة"
                                aria-label="حذف الصورة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                حذف
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-center gap-3">
                          <span className="text-xs text-gray-500">معاينة الأيقونة</span>
                          <div className="w-32 h-32 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 overflow-hidden">
                            {widget.config.iconImage ? (
                              <img src={widget.config.iconImage} alt="Widget icon" className="w-full h-full object-contain p-2" />
                            ) : (
                              <div className="text-center">
                                <Image className="w-10 h-10 text-gray-300 mx-auto mb-1" />
                                <span className="text-xs text-gray-400">لا توجد صورة</span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 text-center">PNG أو JPG — حد أقصى 500 كيلوبايت<br />يُستخدم كأيقونة للودجت بدلاً من SVG</p>
                        </div>
                      </div>
                    )}

                    {/* Icon SVG tab */}
                    {activeTab === 'icon' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">أيقونة الودجت (SVG)</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleImportSvg(widget.id, 'icon')}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg text-xs hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                              title="استيراد أيقونة SVG"
                              aria-label="استيراد أيقونة SVG"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              استيراد
                            </button>
                            <button
                              onClick={() => handleExportSvg(widget.iconSvg, `${widget.id}_icon.svg`)}
                              disabled={!widget.iconSvg}
                              className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors"
                              title="تصدير أيقونة SVG"
                              aria-label="تصدير أيقونة SVG"
                            >
                              <Download className="w-3.5 h-3.5" />
                              تصدير
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Preview */}
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-xs text-gray-500">معاينة</span>
                            <div className="w-24 h-24 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-600">
                              {widget.iconSvg ? (
                                <div dangerouslySetInnerHTML={{ __html: widget.iconSvg }} className="w-16 h-16 [&>svg]:w-full [&>svg]:h-full" />
                              ) : (
                                <Eye className="w-8 h-8 text-gray-300" />
                              )}
                            </div>
                          </div>

                          {/* Editor */}
                          <div>
                            <textarea
                              value={widget.iconSvg}
                              onChange={e => updateWidget(widget.id, { iconSvg: e.target.value })}
                              className="w-full h-48 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-xs font-mono resize-none"
                              dir="ltr"
                              placeholder="<svg ...>...</svg>"
                              aria-label="أيقونة SVG"
                              spellCheck={false}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Background SVG tab */}
                    {activeTab === 'background' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">خلفية الودجت (SVG)</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleImportSvg(widget.id, 'background')}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg text-xs hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                              title="استيراد خلفية SVG"
                              aria-label="استيراد خلفية SVG"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              استيراد
                            </button>
                            <button
                              onClick={() => handleExportSvg(widget.backgroundSvg, `${widget.id}_background.svg`)}
                              disabled={!widget.backgroundSvg}
                              className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors"
                              title="تصدير خلفية SVG"
                              aria-label="تصدير خلفية SVG"
                            >
                              <Download className="w-3.5 h-3.5" />
                              تصدير
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {/* Preview */}
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-xs text-gray-500">معاينة</span>
                            <div className="w-full max-w-md h-32 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-600 overflow-hidden">
                              {widget.backgroundSvg ? (
                                <div dangerouslySetInnerHTML={{ __html: widget.backgroundSvg }} className="w-full h-full [&>svg]:w-full [&>svg]:h-full" />
                              ) : (
                                <Eye className="w-8 h-8 text-gray-300" />
                              )}
                            </div>
                          </div>

                          {/* Editor */}
                          <textarea
                            value={widget.backgroundSvg}
                            onChange={e => updateWidget(widget.id, { backgroundSvg: e.target.value })}
                            className="w-full h-56 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-xs font-mono resize-none"
                            dir="ltr"
                            placeholder="<svg ...>...</svg>"
                            aria-label="خلفية SVG"
                            spellCheck={false}
                          />
                        </div>
                      </div>
                    )}

                    {/* Save button */}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => saveWidget(widget)}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                        title="حفظ التغييرات"
                        aria-label="حفظ التغييرات"
                      >
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <input ref={fileInputRef} type="file" accept=".svg" className="hidden" title="رفع ملف SVG" aria-label="رفع ملف SVG" />
    </div>
  );
};

export default WidgetDesignManager;
