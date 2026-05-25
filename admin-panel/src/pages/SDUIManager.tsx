import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, collection, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';
import {
  LayoutGrid, Plus, Save, Trash2, GripVertical, Eye, EyeOff,
  ChevronDown, ChevronUp, Settings, Type, Minus, Layers, ExternalLink,
  Smartphone, Code2,
} from 'lucide-react';

type SDUISectionType = 'html_block' | 'spacer';

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
  { type: 'html_block', label: 'HTML مخصص', icon: <Type className="w-4 h-4" /> },
  { type: 'spacer', label: 'مسافة فارغة', icon: <Minus className="w-4 h-4" /> },
];

const sortScreens = (items: SDUIScreenConfig[]) =>
  [...items].sort((a, b) => a.screenId.localeCompare(b.screenId));

const getAppRoute = (screenId: string) => `/sdui/${screenId}`;

function SectionPreview({ section }: { section: SDUISection }) {
  if (!section.enabled) return null;
  if (section.type === 'spacer') {
    const height = typeof section.data?.height === 'number' ? section.data.height : 16;
    return <div className="rounded-lg border border-dashed border-slate-600 text-slate-500 text-xs flex items-center justify-center" style={{ height: Math.min(Math.max(height, 12), 80) }}>مسافة {height}px</div>;
  }

  const html = typeof section.data?.html === 'string' ? section.data.html : '';
  return (
    <div className="rounded-xl border border-admin-border bg-white text-slate-900 p-3 text-sm leading-7 overflow-hidden">
      {section.title && <div className="font-semibold mb-1">{section.title}</div>}
      {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <div className="text-slate-400">اكتب HTML في بيانات القسم ليظهر هنا</div>}
    </div>
  );
}

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
      const items = sortScreens(snap.docs.map(d => d.data() as SDUIScreenConfig));
      setScreens(items);
      if (items.length > 0) setSelectedScreen(prev => prev || items[0]);
    } catch (err) {
      console.error('Failed to load SDUI screens:', err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'sdui_screens'), (snap) => {
      const items = sortScreens(snap.docs.map(d => d.data() as SDUIScreenConfig));
      setScreens(items);
      setSelectedScreen((prev) => {
        if (!prev) return items[0] || null;
        return items.find((item) => item.screenId === prev.screenId) || items[0] || null;
      });
      setIsLoading(false);
    }, (err) => {
      console.error('Failed to load SDUI screens:', err);
      setIsLoading(false);
    });

    return unsubscribe;
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
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-6 h-6 text-accent-light" />
          <div>
            <h1 className="text-2xl font-bold text-white">مدير واجهات SDUI</h1>
            <p className="text-sm text-slate-400 mt-1">صفحات ديناميكية يقرأها التطبيق من Firestore وتظهر عند فتح مسارها داخل التطبيق.</p>
          </div>
        </div>
        <button onClick={createScreen} className="flex items-center gap-2 px-4 py-2.5 bg-accent-dark text-white rounded-xl hover:bg-accent-dark">
          <Plus className="w-4 h-4" /> شاشة جديدة
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-admin-border bg-admin-surface/60 p-4">
          <div className="flex items-center gap-2 text-white font-semibold mb-2">
            <Smartphone className="w-4 h-4 text-accent-light" />
            أين تظهر؟
          </div>
          <p className="text-sm text-slate-400 leading-7">
            لا تظهر تلقائيا في الرئيسية. تظهر عندما يفتح المستخدم رابط الشاشة مثل <code className="text-emerald-300 ltr:inline-block" dir="ltr">/sdui/ramadan-offer</code> أو عندما تربطها من بانر، وصول سريع، إشعار، أو رابط داخلي.
          </p>
        </div>
        <div className="rounded-2xl border border-admin-border bg-admin-surface/60 p-4">
          <div className="flex items-center gap-2 text-white font-semibold mb-2">
            <Code2 className="w-4 h-4 text-accent-light" />
            ما المدعوم الآن؟
          </div>
          <p className="text-sm text-slate-400 leading-7">
            التطبيق يدعم حاليا نوعين فقط: HTML مخصص، ومسافة فارغة. أي نوع آخر سيظهر كقسم غير متاح داخل التطبيق.
          </p>
        </div>
        <div className="rounded-2xl border border-admin-border bg-admin-surface/60 p-4">
          <div className="flex items-center gap-2 text-white font-semibold mb-2">
            <ExternalLink className="w-4 h-4 text-accent-light" />
            هل يتحدث لحظيا؟
          </div>
          <p className="text-sm text-slate-400 leading-7">
            نعم، route التطبيق يستخدم اشتراك مباشر على مستند الشاشة. التعديل يصل للمستخدمين الموجودين على نفس شاشة SDUI، ومعه كاش محلي للفتح لاحقا.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3 space-y-2">
          <h3 className="text-slate-400 text-sm font-semibold mb-3">الشاشات</h3>
          {screens.map(screen => (
            <button key={screen.screenId} onClick={() => setSelectedScreen(screen)} className={`w-full text-right px-4 py-3 rounded-xl border transition-all ${selectedScreen?.screenId === screen.screenId ? 'bg-accent-dark/20 border-accent text-accent-light' : 'bg-admin-surface/50 border-admin-border text-slate-300 hover:border-admin-border'}`}>
              <div className="font-semibold">{screen.title || screen.screenId}</div>
              <div className="text-xs text-slate-500">{screen.sections.length} أقسام • v{screen.version}</div>
            </button>
          ))}
          {screens.length === 0 && <p className="text-slate-500 text-sm text-center py-8">لا توجد شاشات بعد</p>}
        </div>

        <div className="col-span-9">
          {selectedScreen ? (
            <div className="space-y-4">
              <div className="bg-admin-surface/50 rounded-2xl border border-admin-border p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input className="bg-admin-bg text-white rounded-lg px-3 py-1.5 border border-admin-border text-sm w-48" value={selectedScreen.title || ''} onChange={e => setSelectedScreen({ ...selectedScreen, title: e.target.value })} placeholder="عنوان الشاشة" aria-label="عنوان الشاشة" />
                  <span className="text-slate-500 text-xs">ID: {selectedScreen.screenId}</span>
                  <span className="text-slate-500 text-xs" dir="ltr">{getAppRoute(selectedScreen.screenId)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigator.clipboard?.writeText(getAppRoute(selectedScreen.screenId))}
                    className="flex items-center gap-2 px-3 py-2 bg-admin-bg text-slate-300 rounded-xl hover:text-white text-sm"
                  >
                    نسخ المسار
                  </button>
                  <button onClick={() => saveScreen(selectedScreen)} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-accent-dark text-white rounded-xl hover:bg-accent-dark disabled:opacity-50">
                    <Save className="w-4 h-4" /> {isSaving ? 'جاري...' : 'حفظ'}
                  </button>
                  <button onClick={() => deleteScreen(selectedScreen.screenId)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg" aria-label="حذف الشاشة" title="حذف الشاشة">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-7 rounded-2xl border border-admin-border bg-admin-surface/50 p-4">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-white font-semibold">معاينة قريبة من التطبيق</h3>
                      <p className="text-xs text-slate-500 mt-1">هذه معاينة للترتيب والمحتوى، والشكل النهائي يتأثر بثيم وخط المستخدم داخل التطبيق.</p>
                    </div>
                    <span className="text-xs text-slate-500">v{selectedScreen.version}</span>
                  </div>
                  <div className="mx-auto w-[320px] min-h-[520px] rounded-[32px] border-4 border-slate-700 bg-slate-950 p-4 shadow-2xl">
                    {selectedScreen.settings?.headerStyle !== 'hidden' && (
                      <div className="mb-4 flex items-center justify-between">
                        <div className="w-8 h-8 rounded-full bg-slate-800" />
                        <div className="text-white font-semibold text-sm truncate px-3">{selectedScreen.title || selectedScreen.screenId}</div>
                        <div className="w-8" />
                      </div>
                    )}
                    <div className="space-y-3">
                      {selectedScreen.sections.filter((section) => section.enabled).sort((a, b) => a.order - b.order).map((section) => (
                        <SectionPreview key={section.id} section={section} />
                      ))}
                      {selectedScreen.sections.filter((section) => section.enabled).length === 0 && (
                        <div className="text-center text-slate-500 text-sm py-20">لا يوجد محتوى مفعل في هذه الشاشة</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-span-5 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
                  <h3 className="text-blue-100 font-semibold mb-3">طريقة استخدامها فعليا</h3>
                  <div className="space-y-3 text-sm text-blue-100/80 leading-7">
                    <p>1. أنشئ الشاشة واحفظها.</p>
                    <p>2. استخدم المسار داخل التطبيق: <code className="text-blue-200" dir="ltr">{getAppRoute(selectedScreen.screenId)}</code>.</p>
                    <p>3. اربط هذا المسار من صفحة أخرى مثل البانر، الوصول السريع، الإشعارات، أو أي زر داخلي.</p>
                    <p>4. أي تعديل بعد الحفظ يصل مباشرة لمن يفتح نفس الشاشة.</p>
                  </div>
                </div>
              </div>

              <div className="bg-admin-surface/50 rounded-2xl border border-admin-border p-4">
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
                  <select className="bg-admin-bg text-white rounded-lg px-3 py-1.5 border border-admin-border text-sm" aria-label="نمط الرأس" title="نمط الرأس" value={selectedScreen.settings?.headerStyle || 'default'} onChange={e => setSelectedScreen({ ...selectedScreen, settings: { ...selectedScreen.settings!, headerStyle: e.target.value as 'default' | 'transparent' | 'hidden' } })}>
                    <option value="default">رأس عادي</option>
                    <option value="transparent">شفاف</option>
                    <option value="hidden">مخفي</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold">الأقسام ({selectedScreen.sections.length})</h3>
                  <button onClick={() => setShowAddSection(!showAddSection)} className="flex items-center gap-1 px-3 py-1.5 bg-admin-surface-light text-slate-300 rounded-lg hover:bg-admin-surface-light text-sm">
                    <Plus className="w-3.5 h-3.5" /> إضافة قسم
                  </button>
                </div>

                {showAddSection && (
                  <div className="bg-admin-surface/80 rounded-xl border border-admin-border p-4 grid grid-cols-3 gap-2">
                    {SECTION_TYPES.map(st => (
                      <button key={st.type} onClick={() => addSection(st.type)} className="flex items-center gap-2 px-3 py-2 bg-admin-surface-light/50 text-slate-300 rounded-lg hover:bg-accent-dark/20 hover:text-accent-light text-sm transition-all">
                        {st.icon} {st.label}
                      </button>
                    ))}
                  </div>
                )}

                {selectedScreen.sections.sort((a, b) => a.order - b.order).map((section, idx) => (
                  <div key={section.id} className={`bg-admin-surface/50 rounded-xl border ${section.enabled ? 'border-admin-border' : 'border-slate-800 opacity-60'} overflow-hidden`}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <GripVertical className="w-4 h-4 text-slate-600" />
                      <div className="flex-1 flex items-center gap-2">
                        {SECTION_TYPES.find(s => s.type === section.type)?.icon}
                        <span className="text-white font-medium text-sm">{section.title || section.type}</span>
                        <span className="text-xs bg-admin-surface-light text-slate-400 px-2 py-0.5 rounded">{section.type}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveSection(section.id, 'up')} disabled={idx === 0} className="p-1 text-slate-400 hover:text-white disabled:opacity-30" aria-label="لأعلى" title="لأعلى"><ChevronUp className="w-4 h-4" /></button>
                        <button onClick={() => moveSection(section.id, 'down')} disabled={idx === selectedScreen.sections.length - 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-30" aria-label="لأسفل" title="لأسفل"><ChevronDown className="w-4 h-4" /></button>
                        <button onClick={() => toggleSection(section.id)} className="p-1" aria-label={section.enabled ? 'إخفاء' : 'إظهار'} title={section.enabled ? 'إخفاء' : 'إظهار'}>
                          {section.enabled ? <Eye className="w-4 h-4 text-accent-light" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                        </button>
                        <button onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)} className="p-1 text-slate-400 hover:text-white" aria-label="تعديل" title="تعديل"><Settings className="w-4 h-4" /></button>
                        <button onClick={() => removeSection(section.id)} className="p-1 text-red-400 hover:text-red-300" aria-label="حذف" title="حذف"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>

                    {expandedSection === section.id && (
                      <div className="border-t border-admin-border px-4 py-3 space-y-3">
	                        <div className="grid grid-cols-2 gap-4">
	                          <div>
	                            <label className="text-slate-400 text-xs block mb-1">العنوان</label>
	                            <input className="w-full bg-admin-bg text-white rounded-lg px-3 py-1.5 border border-admin-border text-sm" value={section.title || ''} onChange={e => updateSectionField(section.id, 'title', e.target.value)} placeholder="عنوان القسم" aria-label="عنوان القسم" dir="rtl" />
                          </div>
                          <div>
                            <label className="text-slate-400 text-xs block mb-1">عنوان فرعي</label>
	                            <input className="w-full bg-admin-bg text-white rounded-lg px-3 py-1.5 border border-admin-border text-sm" value={section.subtitle || ''} onChange={e => updateSectionField(section.id, 'subtitle', e.target.value)} placeholder="اختياري" aria-label="عنوان فرعي" dir="rtl" />
	                          </div>
	                        </div>
	                        {section.type === 'html_block' && (
	                          <div className="space-y-3 rounded-xl bg-admin-bg/60 border border-admin-border/50 p-3">
	                            <div className="flex items-center gap-2 text-white text-sm font-semibold">
	                              <Type className="w-4 h-4 text-accent-light" />
	                              محتوى HTML الذي سيراه المستخدم
	                            </div>
	                            <textarea
	                              className="w-full bg-admin-bg text-white rounded-lg px-3 py-2 border border-admin-border text-sm font-mono"
	                              rows={6}
	                              value={typeof section.data?.html === 'string' ? section.data.html : ''}
	                              onChange={e => updateSectionField(section.id, 'data', { ...(section.data || {}), html: e.target.value })}
	                              placeholder="<h2>عنوان</h2><p>نص يظهر داخل التطبيق</p>"
	                              dir="ltr"
	                            />
	                            <div className="grid grid-cols-3 gap-3">
	                              <label className="text-slate-300 text-xs">
	                                Padding
	                                <input
	                                  type="number"
	                                  className="mt-1 w-full bg-admin-bg text-white rounded-lg px-3 py-1.5 border border-admin-border text-sm"
	                                  value={Number(section.data?.padding ?? 16)}
	                                  onChange={e => updateSectionField(section.id, 'data', { ...(section.data || {}), padding: Number(e.target.value) || 0 })}
	                                />
	                              </label>
	                              <label className="text-slate-300 text-xs">
	                                Border radius
	                                <input
	                                  type="number"
	                                  className="mt-1 w-full bg-admin-bg text-white rounded-lg px-3 py-1.5 border border-admin-border text-sm"
	                                  value={Number(section.data?.borderRadius ?? 20)}
	                                  onChange={e => updateSectionField(section.id, 'data', { ...(section.data || {}), borderRadius: Number(e.target.value) || 0 })}
	                                />
	                              </label>
	                              <label className="flex items-end gap-2 text-slate-300 text-xs pb-2">
	                                <input
	                                  type="checkbox"
	                                  checked={section.data?.useGlassContainer !== false}
	                                  onChange={e => updateSectionField(section.id, 'data', { ...(section.data || {}), useGlassContainer: e.target.checked })}
	                                  className="accent-emerald-500"
	                                />
	                                زجاج داخل التطبيق
	                              </label>
	                            </div>
	                          </div>
	                        )}
	                        {section.type === 'spacer' && (
	                          <div className="rounded-xl bg-admin-bg/60 border border-admin-border/50 p-3">
	                            <label className="text-slate-300 text-xs">
	                              ارتفاع المسافة بالبكسل
	                              <input
	                                type="number"
	                                className="mt-1 w-full bg-admin-bg text-white rounded-lg px-3 py-1.5 border border-admin-border text-sm"
	                                value={Number(section.data?.height ?? 16)}
	                                onChange={e => updateSectionField(section.id, 'data', { ...(section.data || {}), height: Number(e.target.value) || 0 })}
	                              />
	                            </label>
	                          </div>
	                        )}
	                        <div>
	                          <label className="text-slate-400 text-xs block mb-1">بيانات القسم (JSON)</label>
	                          <textarea className="w-full bg-admin-bg text-white rounded-lg px-3 py-1.5 border border-admin-border text-sm font-mono" rows={4} aria-label="بيانات القسم" title="بيانات القسم" placeholder="{}‏" value={JSON.stringify(section.data || {}, null, 2)} onChange={e => { try { updateSectionField(section.id, 'data', JSON.parse(e.target.value)); } catch { /* skip */ } }} dir="ltr" />
                        </div>
                        <div>
                          <label className="text-slate-400 text-xs block mb-1">شروط العرض (JSON)</label>
                          <textarea className="w-full bg-admin-bg text-white rounded-lg px-3 py-1.5 border border-admin-border text-sm font-mono" rows={3} aria-label="شروط العرض" title="شروط العرض" placeholder="{}‏" value={JSON.stringify(section.conditions || {}, null, 2)} onChange={e => { try { updateSectionField(section.id, 'conditions', JSON.parse(e.target.value)); } catch { /* skip */ } }} dir="ltr" />
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
