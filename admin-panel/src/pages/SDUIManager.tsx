import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import {
  LayoutGrid, Plus, Save, Trash2, GripVertical, Eye, EyeOff,
  ChevronDown, ChevronUp, Settings, Type, Image, BookOpen,
  Clock, Star, Bell, Layers, Sparkles, Minus,
} from 'lucide-react';

type SDUISectionType =
  | 'welcome_banner' | 'quick_actions' | 'highlights_grid' | 'featured_content'
  | 'html_block' | 'prayer_times' | 'daily_ayah' | 'azkar_categories'
  | 'khatma_progress' | 'worship_stats' | 'seasonal_banner' | 'custom_cards'
  | 'image_carousel' | 'announcement' | 'spacer';

interface SDUISection {
  id: string;
  type: SDUISectionType;
  enabled: boolean;
  order: number;
  title?: string;
  subtitle?: string;
  data?: Record<string, unknown>;
  conditions?: Record<string, unknown>;
}

interface SDUIScreenConfig {
  screenId: string;
  title?: string;
  updatedAt: string;
  version: number;
  sections: SDUISection[];
  settings?: {
    refreshable: boolean;
    background?: string;
    headerStyle?: 'default' | 'transparent' | 'hidden';
    animateScroll: boolean;
  };
}

const SECTION_TYPES: { type: SDUISectionType; label: string; icon: React.ReactNode }[] = [
  { type: 'welcome_banner', label: 'بانر ترحيبي', icon: <Star className="w-4 h-4" /> },
  { type: 'quick_actions', label: 'إجراءات سريعة', icon: <LayoutGrid className="w-4 h-4" /> },
  { type: 'highlights_grid', label: 'شبكة المميزات', icon: <Sparkles className="w-4 h-4" /> },
  { type: 'featured_content', label: 'محتوى مميز', icon: <Star className="w-4 h-4" /> },
  { type: 'html_block', label: 'HTML مخصص', icon: <Type className="w-4 h-4" /> },
  { type: 'prayer_times', label: 'أوقات الصلاة', icon: <Clock className="w-4 h-4" /> },
  { type: 'daily_ayah', label: 'آية اليوم', icon: <BookOpen className="w-4 h-4" /> },
  { type: 'azkar_categories', label: 'فئات الأذكار', icon: <Layers className="w-4 h-4" /> },
  { type: 'khatma_progress', label: 'تقدم الختمة', icon: <BookOpen className="w-4 h-4" /> },
  { type: 'worship_stats', label: 'إحصائيات العبادة', icon: <Star className="w-4 h-4" /> },
  { type: 'seasonal_banner', label: 'بانر موسمي', icon: <Bell className="w-4 h-4" /> },
  { type: 'custom_cards', label: 'بطاقات مخصصة', icon: <Image className="w-4 h-4" /> },
  { type: 'image_carousel', label: 'عرض صور', icon: <Image className="w-4 h-4" /> },
  { type: 'announcement', label: 'إعلان', icon: <Bell className="w-4 h-4" /> },
  { type: 'spacer', label: 'مسافة فارغة', icon: <Minus className="w-4 h-4" /> },
];

function SDUIManager() {
  const sectionIdRef = React.useRef(0);
  const [screens, setScreens] = useState<SDUIScreenConfig[]>([]);
  const [selectedScreen, setSelectedScreen] = useState<SDUIScreenConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);

  const loadScreens = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, 'sdui_screens'));
      const items = snap.docs.map(d => d.data() as SDUIScreenConfig);
      items.sort((a, b) => a.screenId.localeCompare(b.screenId));
      setScreens(items);
      if (items.length > 0) setSelectedScreen(prev => prev || items[0]);
    } catch (err) {
      console.error('Failed to load SDUI screens:', err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const snap = await getDocs(collection(db, 'sdui_screens'));
        const items = snap.docs.map(d => d.data() as SDUIScreenConfig);
        items.sort((a, b) => a.screenId.localeCompare(b.screenId));
        setScreens(items);
        if (items.length > 0) setSelectedScreen(items[0]);
      } catch (err) {
        console.error('Failed to load SDUI screens:', err);
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const saveScreen = async (screen: SDUIScreenConfig) => {
    setIsSaving(true);
    try {
      const updated = { ...screen, updatedAt: new Date().toISOString(), version: (screen.version || 0) + 1 };
      await setDoc(doc(db, 'sdui_screens', screen.screenId), updated);
      setSelectedScreen(updated);
      await loadScreens();
      alert('تم الحفظ بنجاح');
    } catch (err) {
      console.error('Failed to save:', err);
      alert('فشل الحفظ');
    }
    setIsSaving(false);
  };

  const deleteScreen = async (screenId: string) => {
    if (!confirm(`حذف الشاشة "${screenId}"؟`)) return;
    try {
      await deleteDoc(doc(db, 'sdui_screens', screenId));
      setSelectedScreen(null);
      await loadScreens();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const createScreen = () => {
    const id = prompt('معرف الشاشة (مثال: home, prayer, azkar):');
    if (!id) return;
    const newScreen: SDUIScreenConfig = {
      screenId: id,
      title: id,
      updatedAt: new Date().toISOString(),
      version: 1,
      sections: [],
      settings: { refreshable: true, animateScroll: true, headerStyle: 'default' },
    };
    setSelectedScreen(newScreen);
    setScreens(prev => [...prev, newScreen]);
  };

  const addSection = (type: SDUISectionType) => {
    if (!selectedScreen) return;
    const newSection: SDUISection = {
      id: `${type}_${sectionIdRef.current++}`,
      type,
      enabled: true,
      order: selectedScreen.sections.length,
      title: SECTION_TYPES.find(s => s.type === type)?.label || type,
    };
    setSelectedScreen({ ...selectedScreen, sections: [...selectedScreen.sections, newSection] });
    setShowAddSection(false);
  };

  const removeSection = (sectionId: string) => {
    if (!selectedScreen) return;
    setSelectedScreen({ ...selectedScreen, sections: selectedScreen.sections.filter(s => s.id !== sectionId) });
  };

  const toggleSection = (sectionId: string) => {
    if (!selectedScreen) return;
    setSelectedScreen({
      ...selectedScreen,
      sections: selectedScreen.sections.map(s => s.id === sectionId ? { ...s, enabled: !s.enabled } : s),
    });
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    if (!selectedScreen) return;
    const sections = [...selectedScreen.sections];
    const idx = sections.findIndex(s => s.id === sectionId);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sections.length) return;
    [sections[idx], sections[newIdx]] = [sections[newIdx], sections[idx]];
    sections.forEach((s, i) => { s.order = i; });
    setSelectedScreen({ ...selectedScreen, sections });
  };

  const updateSectionField = (sectionId: string, field: string, value: unknown) => {
    if (!selectedScreen) return;
    setSelectedScreen({
      ...selectedScreen,
      sections: selectedScreen.sections.map(s => s.id === sectionId ? { ...s, [field]: value } : s),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl font-bold text-white">مدير واجهات SDUI</h1>
        </div>
        <button onClick={createScreen} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> شاشة جديدة
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3 space-y-2">
          <h3 className="text-slate-400 text-sm font-semibold mb-3">الشاشات</h3>
          {screens.map(screen => (
            <button key={screen.screenId} onClick={() => setSelectedScreen(screen)} className={`w-full text-right px-4 py-3 rounded-xl border transition-all ${selectedScreen?.screenId === screen.screenId ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600'}`}>
              <div className="font-semibold">{screen.title || screen.screenId}</div>
              <div className="text-xs text-slate-500">{screen.sections.length} أقسام • v{screen.version}</div>
            </button>
          ))}
          {screens.length === 0 && <p className="text-slate-500 text-sm text-center py-8">لا توجد شاشات بعد</p>}
        </div>

        <div className="col-span-9">
          {selectedScreen ? (
            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input className="bg-slate-900 text-white rounded-lg px-3 py-1.5 border border-slate-700 text-sm w-48" value={selectedScreen.title || ''} onChange={e => setSelectedScreen({ ...selectedScreen, title: e.target.value })} placeholder="عنوان الشاشة" aria-label="عنوان الشاشة" />
                  <span className="text-slate-500 text-xs">ID: {selectedScreen.screenId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => saveScreen(selectedScreen)} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                    <Save className="w-4 h-4" /> {isSaving ? 'جاري...' : 'حفظ'}
                  </button>
                  <button onClick={() => deleteScreen(selectedScreen.screenId)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg" aria-label="حذف الشاشة" title="حذف الشاشة">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="w-4 h-4 text-slate-400" />
                  <h3 className="text-white font-semibold text-sm">إعدادات الشاشة</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <label className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer">
                    <input type="checkbox" checked={selectedScreen.settings?.refreshable ?? true} onChange={e => setSelectedScreen({ ...selectedScreen, settings: { ...selectedScreen.settings!, refreshable: e.target.checked } })} className="accent-emerald-500" />
                    قابلة للتحديث
                  </label>
                  <label className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer">
                    <input type="checkbox" checked={selectedScreen.settings?.animateScroll ?? true} onChange={e => setSelectedScreen({ ...selectedScreen, settings: { ...selectedScreen.settings!, animateScroll: e.target.checked } })} className="accent-emerald-500" />
                    تحريك التمرير
                  </label>
                  <select className="bg-slate-900 text-white rounded-lg px-3 py-1.5 border border-slate-700 text-sm" aria-label="نمط الرأس" title="نمط الرأس" value={selectedScreen.settings?.headerStyle || 'default'} onChange={e => setSelectedScreen({ ...selectedScreen, settings: { ...selectedScreen.settings!, headerStyle: e.target.value as 'default' | 'transparent' | 'hidden' } })}>
                    <option value="default">رأس عادي</option>
                    <option value="transparent">شفاف</option>
                    <option value="hidden">مخفي</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold">الأقسام ({selectedScreen.sections.length})</h3>
                  <button onClick={() => setShowAddSection(!showAddSection)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-sm">
                    <Plus className="w-3.5 h-3.5" /> إضافة قسم
                  </button>
                </div>

                {showAddSection && (
                  <div className="bg-slate-800/80 rounded-xl border border-slate-700 p-4 grid grid-cols-3 gap-2">
                    {SECTION_TYPES.map(st => (
                      <button key={st.type} onClick={() => addSection(st.type)} className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-emerald-600/20 hover:text-emerald-400 text-sm transition-all">
                        {st.icon} {st.label}
                      </button>
                    ))}
                  </div>
                )}

                {selectedScreen.sections.sort((a, b) => a.order - b.order).map((section, idx) => (
                  <div key={section.id} className={`bg-slate-800/50 rounded-xl border ${section.enabled ? 'border-slate-700' : 'border-slate-800 opacity-60'} overflow-hidden`}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <GripVertical className="w-4 h-4 text-slate-600" />
                      <div className="flex-1 flex items-center gap-2">
                        {SECTION_TYPES.find(s => s.type === section.type)?.icon}
                        <span className="text-white font-medium text-sm">{section.title || section.type}</span>
                        <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded">{section.type}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveSection(section.id, 'up')} disabled={idx === 0} className="p-1 text-slate-400 hover:text-white disabled:opacity-30" aria-label="لأعلى" title="لأعلى"><ChevronUp className="w-4 h-4" /></button>
                        <button onClick={() => moveSection(section.id, 'down')} disabled={idx === selectedScreen.sections.length - 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-30" aria-label="لأسفل" title="لأسفل"><ChevronDown className="w-4 h-4" /></button>
                        <button onClick={() => toggleSection(section.id)} className="p-1" aria-label={section.enabled ? 'إخفاء' : 'إظهار'} title={section.enabled ? 'إخفاء' : 'إظهار'}>
                          {section.enabled ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                        </button>
                        <button onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)} className="p-1 text-slate-400 hover:text-white" aria-label="تعديل" title="تعديل"><Settings className="w-4 h-4" /></button>
                        <button onClick={() => removeSection(section.id)} className="p-1 text-red-400 hover:text-red-300" aria-label="حذف" title="حذف"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>

                    {expandedSection === section.id && (
                      <div className="border-t border-slate-700 px-4 py-3 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-slate-400 text-xs block mb-1">العنوان</label>
                            <input className="w-full bg-slate-900 text-white rounded-lg px-3 py-1.5 border border-slate-700 text-sm" value={section.title || ''} onChange={e => updateSectionField(section.id, 'title', e.target.value)} placeholder="عنوان القسم" aria-label="عنوان القسم" dir="rtl" />
                          </div>
                          <div>
                            <label className="text-slate-400 text-xs block mb-1">عنوان فرعي</label>
                            <input className="w-full bg-slate-900 text-white rounded-lg px-3 py-1.5 border border-slate-700 text-sm" value={section.subtitle || ''} onChange={e => updateSectionField(section.id, 'subtitle', e.target.value)} placeholder="اختياري" aria-label="عنوان فرعي" dir="rtl" />
                          </div>
                        </div>
                        <div>
                          <label className="text-slate-400 text-xs block mb-1">بيانات القسم (JSON)</label>
                          <textarea className="w-full bg-slate-900 text-white rounded-lg px-3 py-1.5 border border-slate-700 text-sm font-mono" rows={4} aria-label="بيانات القسم" title="بيانات القسم" placeholder="{}‏" value={JSON.stringify(section.data || {}, null, 2)} onChange={e => { try { updateSectionField(section.id, 'data', JSON.parse(e.target.value)); } catch { /* skip */ } }} dir="ltr" />
                        </div>
                        <div>
                          <label className="text-slate-400 text-xs block mb-1">شروط العرض (JSON)</label>
                          <textarea className="w-full bg-slate-900 text-white rounded-lg px-3 py-1.5 border border-slate-700 text-sm font-mono" rows={3} aria-label="شروط العرض" title="شروط العرض" placeholder="{}‏" value={JSON.stringify(section.conditions || {}, null, 2)} onChange={e => { try { updateSectionField(section.id, 'conditions', JSON.parse(e.target.value)); } catch { /* skip */ } }} dir="ltr" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {selectedScreen.sections.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <Layers className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p>لا توجد أقسام. اضغط &quot;إضافة قسم&quot; للبدء.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500">
              <LayoutGrid className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p>اختر شاشة من القائمة أو أنشئ واحدة جديدة</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SDUIManager;
