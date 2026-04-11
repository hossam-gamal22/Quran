import React, { useState, useEffect } from 'react';
import { MessageSquare, Trash2, RefreshCw, Smartphone, Clock, Globe, User } from 'lucide-react';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

interface Suggestion {
  id: string;
  text: string;
  platform: string;
  language: string;
  userName?: string;
  userId?: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

const SuggestionsPage: React.FC = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'suggestions'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const items: Suggestion[] = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as Suggestion[];
      setSuggestions(items);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSuggestions();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف هذا الاقتراح؟')) return;
    setDeleting(id);
    try {
      await deleteDoc(doc(db, 'suggestions', id));
      setSuggestions(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting suggestion:', error);
    }
    setDeleting(null);
  };

  const formatDate = (ts: { seconds: number } | null) => {
    if (!ts) return '—';
    const d = new Date(ts.seconds * 1000);
    return d.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const platformIcon = (p: string) => {
    if (p === 'ios') return '🍎';
    if (p === 'android') return '🤖';
    return '🌐';
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-7 h-7 text-emerald-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">اقتراحات المستخدمين</h1>
            <p className="text-gray-400 text-sm">
              {suggestions.length} اقتراح
            </p>
          </div>
        </div>
        <button
          onClick={loadSuggestions}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">لا توجد اقتراحات بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map(s => (
            <div
              key={s.id}
              className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-white text-base leading-relaxed flex-1 whitespace-pre-wrap">
                  {s.text}
                </p>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deleting === s.id}
                  className="text-gray-500 hover:text-red-400 transition-colors shrink-0 p-1"
                  title="حذف"
                >
                  <Trash2 className={`w-4 h-4 ${deleting === s.id ? 'animate-pulse' : ''}`} />
                </button>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                {s.userName && (
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <User className="w-3 h-3" />
                    {s.userName}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(s.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Smartphone className="w-3 h-3" />
                  {platformIcon(s.platform)} {s.platform}
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {s.language}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuggestionsPage;
