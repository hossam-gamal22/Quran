/**
 * TranslateButton — Compact "translate to all languages" button.
 *
 * Drop into any admin section with multilingual fields.
 * Takes source text (Arabic or English), translates to all 12 languages,
 * and returns a Record<string, string> via onTranslated callback.
 *
 * Usage:
 *   <TranslateButton
 *     sourceText={titleAr}
 *     sourceLang="ar"
 *     onTranslated={(translations) => setData(prev => ({...prev, ...translations}))}
 *   />
 */

import React, { useState, useCallback } from 'react';
import { Languages } from 'lucide-react';
import {
  LANGUAGES,
  translateToAll,
  type ContentType,
  type TranslationResult,
} from '@app-lib/unifiedTranslator';

interface TranslateButtonProps {
  /** The source text to translate from */
  sourceText: string;
  /** Source language */
  sourceLang?: 'ar' | 'en';
  /** Content type for choosing translation sources */
  contentType?: ContentType;
  /** Called with { ar: '...', en: '...', fr: '...', ... } when done */
  onTranslated: (translations: Record<string, string>) => void;
  /** Optional: only translate to these language codes */
  targetLangs?: string[];
  /** Extra CSS classes for the button */
  className?: string;
  /** Compact mode — smaller button */
  compact?: boolean;
  /** Custom label */
  label?: string;
}

export default function TranslateButton({
  sourceText,
  sourceLang = 'ar',
  contentType = 'ui',
  onTranslated,
  targetLangs,
  className = '',
  compact = false,
  label,
}: TranslateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const handleTranslate = useCallback(async () => {
    if (!sourceText.trim() || loading) return;
    setLoading(true);
    setProgress(0);
    setDone(false);

    const total = targetLangs?.length || LANGUAGES.length;
    let completed = 0;

    const results = await translateToAll(
      {
        text: sourceText,
        sourceLang,
        contentType,
        arabicText: sourceLang === 'ar' ? sourceText : undefined,
      },
      () => {
        completed++;
        setProgress(Math.round((completed / total) * 100));
      },
    );

    // Flatten to Record<string, string>
    const flat: Record<string, string> = {};
    for (const [lang, result] of Object.entries(results)) {
      if (targetLangs && !targetLangs.includes(lang)) continue;
      if (result && (result as TranslationResult).text) {
        flat[lang] = (result as TranslationResult).text;
      }
    }

    onTranslated(flat);
    setDone(true);
    setLoading(false);
    setTimeout(() => setDone(false), 3000);
  }, [sourceText, sourceLang, contentType, onTranslated, targetLangs, loading]);

  if (compact) {
    return (
      <button
        onClick={handleTranslate}
        disabled={loading || !sourceText.trim()}
        className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
          ${done
            ? 'bg-emerald-800 text-emerald-300 border border-emerald-600'
            : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600'}
          disabled:opacity-40 disabled:cursor-not-allowed transition-all ${className}`}
        title="ترجمة تلقائية لكل اللغات"
      >
        <Languages className="w-3.5 h-3.5" />
        {loading ? `${progress}%` : done ? '✓' : label || '🌍 ترجمة'}
      </button>
    );
  }

  return (
    <button
      onClick={handleTranslate}
      disabled={loading || !sourceText.trim()}
      className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium
        ${done
          ? 'bg-emerald-700 text-emerald-100 border border-emerald-500'
          : 'bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white border border-emerald-600'}
        disabled:opacity-40 disabled:cursor-not-allowed transition-all ${className}`}
    >
      <Languages className="w-4 h-4" />
      {loading ? (
        <span className="flex items-center gap-2">
          جاري الترجمة...
          <span className="bg-black/20 rounded-full px-2 py-0.5 text-xs">{progress}%</span>
        </span>
      ) : done ? (
        '✓ تمت الترجمة'
      ) : (
        label || '🌍 ترجمة تلقائية لكل اللغات'
      )}
    </button>
  );
}
