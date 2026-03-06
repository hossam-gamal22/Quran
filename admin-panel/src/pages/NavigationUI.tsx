import React, { useEffect, useState } from 'react';
import { Save, RefreshCw, Navigation2, Plus, Trash2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

type IconMode = 'material' | 'ionicons' | 'sf' | 'png';

interface ConfigurableIcon {
  mode: IconMode;
  name?: string;
  selectedName?: string;
  pngUrl?: string;
  selectedPngUrl?: string;
}

interface ConfigurableNavItem {
  key: string;
  labelAr: string;
  labelEn?: string;
  icon: ConfigurableIcon;
}

interface UISettings {
  tabBarItems: ConfigurableNavItem[];
  quranSegments: ConfigurableNavItem[];
  prayerTopSegments: ConfigurableNavItem[];
  prayerViewSegments: ConfigurableNavItem[];
  tabBarLayout: {
    labelFontSize: number;
    titleVerticalOffset: number;
    selectedBgOpacity: number;
  };
}

const DEFAULT_UI_SETTINGS: UISettings = {
  tabBarItems: [
    { key: 'settings', labelAr: 'الإعدادات', labelEn: 'Settings', icon: { mode: 'sf', name: 'gearshape', selectedName: 'gearshape.fill' } },
    { key: 'prayer', labelAr: 'الصلاة', labelEn: 'Prayer', icon: { mode: 'sf', name: 'building.columns', selectedName: 'building.columns.fill' } },
    { key: 'tasbih', labelAr: 'تسبيح', labelEn: 'Tasbih', icon: { mode: 'sf', name: 'hand.raised', selectedName: 'hand.raised.fill' } },
    { key: 'quran', labelAr: 'القرآن', labelEn: 'Quran', icon: { mode: 'sf', name: 'book', selectedName: 'book.fill' } },
    { key: 'index', labelAr: 'الرئيسية', labelEn: 'Home', icon: { mode: 'sf', name: 'house', selectedName: 'house.fill' } },
  ],
  quranSegments: [
    { key: 'surahs', labelAr: 'السور', labelEn: 'Surahs', icon: { mode: 'material', name: 'book-open-variant' } },
    { key: 'juz', labelAr: 'الأجزاء', labelEn: 'Juz', icon: { mode: 'material', name: 'bookshelf' } },
    { key: 'listen', labelAr: 'استماع', labelEn: 'Listen', icon: { mode: 'material', name: 'headphones' } },
  ],
  prayerTopSegments: [
    { key: 'prayer', labelAr: 'الصلاة', labelEn: 'Prayer', icon: { mode: 'material', name: 'clock-time-four-outline' } },
    { key: 'qibla', labelAr: 'القبلة', labelEn: 'Qibla', icon: { mode: 'material', name: 'compass' } },
  ],
  prayerViewSegments: [
    { key: 'list', labelAr: 'قائمة', labelEn: 'List', icon: { mode: 'material', name: 'format-list-text' } },
    { key: 'clock', labelAr: 'ساعة', labelEn: 'Clock', icon: { mode: 'material', name: 'clock-outline' } },
  ],
  tabBarLayout: {
    labelFontSize: 12,
    titleVerticalOffset: 4,
    selectedBgOpacity: 0.16,
  },
};

const DOC_REF = doc(db, 'config', 'app-settings');

function SectionEditor({
  title,
  items,
  onChange,
  lockKeys,
}: {
  title: string;
  items: ConfigurableNavItem[];
  onChange: (items: ConfigurableNavItem[]) => void;
  lockKeys?: string[];
}) {
  const isLocked = (key: string) => (lockKeys || []).includes(key);

  const updateItem = (index: number, patch: Partial<ConfigurableNavItem>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const updateIcon = (index: number, patch: Partial<ConfigurableIcon>) => {
    const next = [...items];
    next[index] = {
      ...next[index],
      icon: { ...next[index].icon, ...patch },
    };
    onChange(next);
  };

  const addItem = () => {
    onChange([
      ...items,
      {
        key: `key_${Date.now()}`,
        labelAr: 'عنصر جديد',
        labelEn: 'New Item',
        icon: { mode: 'material', name: 'circle-outline' },
      },
    ]);
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange(next);
  };

  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <button
          onClick={addItem}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700"
        >
          <Plus size={16} />
          إضافة
        </button>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => {
          const locked = isLocked(item.key);
          return (
            <div key={`${item.key}-${index}`} className="rounded-lg border border-gray-700 p-4 bg-gray-900/40">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">المفتاح</label>
                  <input
                    value={item.key}
                    onChange={(e) => updateItem(index, { key: e.target.value })}
                    className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">الاسم عربي</label>
                  <input
                    value={item.labelAr}
                    onChange={(e) => updateItem(index, { labelAr: e.target.value })}
                    className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">الاسم English</label>
                  <input
                    value={item.labelEn || ''}
                    onChange={(e) => updateItem(index, { labelEn: e.target.value })}
                    className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                    dir="ltr"
                  />
                </div>
                <div className="flex items-end justify-end">
                  <button
                    onClick={() => removeItem(index)}
                    className="px-3 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm"
                  >
                    <Trash2 size={14} className="inline ml-1" />
                    حذف
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">نوع الأيقونة</label>
                  <select
                    value={item.icon.mode}
                    onChange={(e) => updateIcon(index, { mode: e.target.value as IconMode })}
                    className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                  >
                    <option value="material">MaterialCommunity</option>
                    <option value="ionicons">Ionicons</option>
                    <option value="sf">SF Symbols (iOS)</option>
                    <option value="png" disabled={locked}>PNG URL {locked ? '(مقفول هنا)' : ''}</option>
                  </select>
                </div>

                {item.icon.mode === 'png' ? (
                  <>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">PNG URL</label>
                      <input
                        value={item.icon.pngUrl || ''}
                        onChange={(e) => updateIcon(index, { pngUrl: e.target.value })}
                        className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                        dir="ltr"
                        placeholder="https://.../icon.png"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">PNG Selected URL</label>
                      <input
                        value={item.icon.selectedPngUrl || ''}
                        onChange={(e) => updateIcon(index, { selectedPngUrl: e.target.value })}
                        className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                        dir="ltr"
                        placeholder="https://.../icon-selected.png"
                      />
                    </div>
                    <div />
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">اسم الأيقونة</label>
                      <input
                        value={item.icon.name || ''}
                        onChange={(e) => updateIcon(index, { name: e.target.value })}
                        className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                        dir="ltr"
                        placeholder={item.icon.mode === 'sf' ? 'house' : 'home-variant'}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">اسم الأيقونة (selected)</label>
                      <input
                        value={item.icon.selectedName || ''}
                        onChange={(e) => updateIcon(index, { selectedName: e.target.value })}
                        className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                        dir="ltr"
                        placeholder={item.icon.mode === 'sf' ? 'house.fill' : 'home'}
                      />
                    </div>
                    <div />
                  </>
                )}
              </div>

              {locked && (
                <p className="text-[11px] text-amber-400 mt-3">
                  هذا العنصر مقيد للحفاظ على استقرار النظام، لذلك تم تعطيل PNG ويمكنك التعديل من مكتبات الأيقونات فقط.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const NavigationUI: React.FC = () => {
  const [data, setData] = useState<UISettings>(DEFAULT_UI_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(DOC_REF);
      if (snap.exists()) {
        const remote = snap.data();
        const ui = remote.uiCustomization || {};
        setData({
          ...DEFAULT_UI_SETTINGS,
          ...ui,
          tabBarLayout: {
            ...DEFAULT_UI_SETTINGS.tabBarLayout,
            ...(ui.tabBarLayout || {}),
          },
        });
      } else {
        setData(DEFAULT_UI_SETTINGS);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await setDoc(
        DOC_REF,
        {
          uiCustomization: data,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-white" dir="rtl">
        <div className="animate-pulse">جاري تحميل إعدادات الـ Navigation...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Navigation2 className="w-6 h-6 text-emerald-400" />
            تخصيص التنقل والأيقونات
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            يمكنك تغيير أسماء وأيقونات التابات والأقسام من هنا (PNG أو مكتبات الأيقونات).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center gap-2"
          >
            <RefreshCw size={16} />
            تحديث
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2"
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            حفظ
          </button>
        </div>
      </div>

      <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-4 mb-5 text-sm text-slate-300">
        ملاحظة: عناصر الـ Bottom Navigation مقيدة افتراضيًا لاستخدام مكتبات الأيقونات فقط للحفاظ على استقرار شكل النظام، لكن باقي الأقسام تدعم PNG URL بالكامل.
      </div>

      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 mb-5">
        <h3 className="text-lg font-bold mb-4">شكل شريط التبويب السفلي</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">حجم الخط</label>
            <input
              type="number"
              value={data.tabBarLayout.labelFontSize}
              min={10}
              max={16}
              onChange={(e) => setData({
                ...data,
                tabBarLayout: {
                  ...data.tabBarLayout,
                  labelFontSize: Number(e.target.value || 12),
                },
              })}
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">المسافة الرأسية بين الأيقونة والنص</label>
            <input
              type="number"
              value={data.tabBarLayout.titleVerticalOffset}
              min={0}
              max={10}
              onChange={(e) => setData({
                ...data,
                tabBarLayout: {
                  ...data.tabBarLayout,
                  titleVerticalOffset: Number(e.target.value || 4),
                },
              })}
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">شفافية خلفية التاب المحدد</label>
            <input
              type="number"
              step={0.01}
              value={data.tabBarLayout.selectedBgOpacity}
              min={0.05}
              max={0.5}
              onChange={(e) => setData({
                ...data,
                tabBarLayout: {
                  ...data.tabBarLayout,
                  selectedBgOpacity: Number(e.target.value || 0.16),
                },
              })}
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <SectionEditor
        title="Bottom Navigation"
        items={data.tabBarItems}
        onChange={(items) => setData({ ...data, tabBarItems: items })}
        lockKeys={['settings', 'prayer', 'tasbih', 'quran', 'index']}
      />

      <SectionEditor
        title="Quran Segments (السور / الأجزاء / استماع)"
        items={data.quranSegments}
        onChange={(items) => setData({ ...data, quranSegments: items })}
      />

      <SectionEditor
        title="Prayer Top Tabs (الصلاة / القبلة)"
        items={data.prayerTopSegments}
        onChange={(items) => setData({ ...data, prayerTopSegments: items })}
      />

      <SectionEditor
        title="Prayer View Segments (قائمة / ساعة)"
        items={data.prayerViewSegments}
        onChange={(items) => setData({ ...data, prayerViewSegments: items })}
      />

      {saved && (
        <div className="fixed bottom-6 left-6 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg">
          تم الحفظ بنجاح
        </div>
      )}
    </div>
  );
};

export default NavigationUI;
