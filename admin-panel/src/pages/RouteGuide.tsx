// admin-panel/src/pages/RouteGuide.tsx
// دليل المسارات — مرجع لجميع روابط التطبيق

import React, { useState, useMemo } from 'react';
import { Search, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { ROUTE_CATEGORIES, ALL_ROUTES, type AppRoute } from '../constants/app-routes';

export default function RouteGuide() {
  const [search, setSearch] = useState('');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(ROUTE_CATEGORIES.map(c => c.id))
  );

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return ROUTE_CATEGORIES;
    const q = search.toLowerCase();
    return ROUTE_CATEGORIES
      .map(cat => ({
        ...cat,
        routes: cat.routes.filter(
          r => r.path.toLowerCase().includes(q) || r.label.includes(q) || r.description?.includes(q)
        ),
      }))
      .filter(cat => cat.routes.length > 0);
  }, [search]);

  const totalRoutes = ALL_ROUTES.filter(r => !r.dynamic).length;
  const dynamicRoutes = ALL_ROUTES.filter(r => r.dynamic).length;

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">دليل المسارات</h1>
          <p className="text-slate-400 mt-1">
            {totalRoutes} مسار ثابت • {dynamicRoutes} مسار ديناميكي
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن مسار أو اسم صفحة..."
          className="w-full bg-slate-800 text-white rounded-xl pr-12 pl-4 py-3 border border-slate-700 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {filteredCategories.map((cat) => (
          <div key={cat.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(cat.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-750 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{cat.icon}</span>
                <div className="text-right">
                  <h2 className="text-white font-bold">{cat.label}</h2>
                  <p className="text-slate-400 text-xs">{cat.routes.length} مسار</p>
                </div>
              </div>
              {expandedCategories.has(cat.id) ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {/* Routes List */}
            {expandedCategories.has(cat.id) && (
              <div className="border-t border-slate-700">
                {cat.routes.map((route) => (
                  <RouteRow
                    key={route.path}
                    route={route}
                    copied={copiedPath === route.path}
                    onCopy={() => copyPath(route.path)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-lg">لم يتم العثور على نتائج</p>
          <p className="text-sm mt-1">جرب بحثاً مختلفاً</p>
        </div>
      )}

      {/* Dynamic Routes Note */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <h3 className="text-white font-bold mb-2">📌 ملاحظة عن المسارات الديناميكية</h3>
        <div className="text-slate-400 text-sm space-y-1">
          <p>• <code className="text-emerald-400">/surah/[id]</code> — استبدل [id] برقم السورة (1-114)، مثال: <code className="text-emerald-400">/surah/2</code></p>
          <p>• <code className="text-emerald-400">/azkar/[category]</code> — استبدل [category] باسم الفئة، مثال: <code className="text-emerald-400">/azkar/morning</code></p>
          <p>• <code className="text-emerald-400">/tafsir/[surah]</code> — استبدل [surah] برقم السورة</p>
          <p>• <code className="text-emerald-400">/temp-page/[id]</code> — استبدل [id] بمعرف الصفحة المؤقتة</p>
          <p>• <code className="text-emerald-400">/sdui/[screenId]</code> — استبدل [screenId] بمعرف شاشة SDUI</p>
        </div>
      </div>
    </div>
  );
}

function RouteRow({ route, copied, onCopy }: { route: AppRoute; copied: boolean; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-750 border-b border-slate-700/50 last:border-b-0 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium">{route.label}</p>
          {route.description && (
            <p className="text-slate-500 text-xs mt-0.5">{route.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mr-3">
        <code className="text-emerald-400 text-xs bg-emerald-500/10 px-2 py-1 rounded-lg font-mono" dir="ltr">
          {route.path}
        </code>
        <button
          onClick={onCopy}
          className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          title="نسخ المسار"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Copy className="w-4 h-4 text-slate-400" />
          )}
        </button>
      </div>
    </div>
  );
}
