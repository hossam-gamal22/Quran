/**
 * AutoTranslateField — Reusable admin component for auto-translating content
 * into all 12 supported languages using free Islamic + general APIs.
 *
 * Usage:
 *   <AutoTranslateField
 *     label="الترجمة"
 *     fieldName="translations"
 *     contentType="adhkar"
 *     arabicText={zikr.arabic}
 *     onSave={(translations) => saveToFirestore(translations)}
 *   />
 */

import React, { useState, useCallback } from 'react';
import {
  LANGUAGES,
  translateToAll,
  type LangCode,
  type ContentType,
  type TranslationResult,
  type AllTranslations,
} from '@app-lib/unifiedTranslator';

// ─── Props ───────────────────────────────────────────────────────────────────

interface AutoTranslateFieldProps {
  /** Label shown above the input */
  label: string;
  /** Field name (for identification / form state) */
  fieldName: string;
  /** Content type determines which Islamic API sources to try first */
  contentType: ContentType;
  /** Original Arabic text — pass for adhkar to enable HisnulMuslim lookup */
  arabicText?: string;
  /** For Quran content */
  surahNumber?: number;
  ayahNumber?: number;
  /** For Hadith content */
  hadithCollection?: string;
  hadithNumber?: number;
  /** Called when user clicks "Save All 12 Translations" */
  onSave: (translations: Record<LangCode, string>) => void;
  /** Pre-populate with existing translations (e.g. from Firestore) */
  initialValues?: Partial<Record<string, string>>;
  /** Number of rows for the main input textarea */
  inputRows?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LANG_FLAGS: Record<LangCode, string> = {
  ar: '🇸🇦', en: '🇺🇸', fr: '🇫🇷', tr: '🇹🇷', ur: '🇵🇰',
  de: '🇩🇪', es: '🇪🇸', hi: '🇮🇳', bn: '🇧🇩', id: '🇮🇩',
  ms: '🇲🇾', ru: '🇷🇺',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function AutoTranslateField({
  label,
  fieldName,
  contentType,
  arabicText,
  surahNumber,
  ayahNumber,
  hadithCollection,
  hadithNumber,
  onSave,
  initialValues,
  inputRows = 2,
}: AutoTranslateFieldProps) {
  const [inputText,    setInputText]    = useState('');
  const [inputLang,    setInputLang]    = useState<'ar' | 'en'>('ar');
  const [translations, setTranslations] = useState<Partial<AllTranslations>>(
    initialValues
      ? Object.fromEntries(
          Object.entries(initialValues)
            .filter(([, v]) => v)
            .map(([k, v]) => [k, { text: v!, source: 'HisnulMuslim' as const, verified: true, needsReview: false }])
        )
      : {},
  );
  const [loading,  setLoading]  = useState(false);
  const [progress, setProgress] = useState(0);

  const handleAutoTranslate = useCallback(async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setProgress(0);
    setTranslations({});

    let done = 0;
    await translateToAll(
      {
        text:        inputText,
        sourceLang:  inputLang,
        contentType,
        arabicText:  arabicText ?? (inputLang === 'ar' ? inputText : undefined),
        surahNumber,
        ayahNumber,
        hadithCollection,
        hadithNumber,
      },
      (lang, result) => {
        done++;
        setProgress(Math.round((done / 12) * 100));
        setTranslations(prev => ({ ...prev, [lang]: result }));
      },
    );

    setLoading(false);
  }, [inputText, inputLang, contentType, arabicText, surahNumber, ayahNumber, hadithCollection, hadithNumber]);

  const handleSave = useCallback(() => {
    const flat = Object.fromEntries(
      Object.entries(translations).map(([k, v]) => [k, (v as TranslationResult)?.text ?? ''])
    ) as Record<LangCode, string>;
    onSave(flat);
  }, [translations, onSave]);

  const completedCount = Object.values(translations).filter(
    t => t && (t as TranslationResult).text,
  ).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <label className="font-semibold text-sm text-slate-200">{label}</label>

      {/* Input row */}
      <div className="flex gap-2 items-start">
        <select
          value={inputLang}
          onChange={e => setInputLang(e.target.value as 'ar' | 'en')}
          className="border border-slate-600 rounded-lg px-2 py-2 text-sm bg-slate-800 text-white"
        >
          <option value="ar">عربي</option>
          <option value="en">English</option>
        </select>

        <textarea
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          className={`flex-1 border border-slate-600 rounded-lg p-2 text-sm bg-slate-800 text-white ${
            inputLang === 'ar' ? 'text-right' : 'text-left'
          }`}
          rows={inputRows}
          placeholder={inputLang === 'ar' ? 'اكتب النص هنا...' : 'Type text here...'}
          dir={inputLang === 'ar' ? 'rtl' : 'ltr'}
        />

        <button
          onClick={handleAutoTranslate}
          disabled={loading || !inputText.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg
                     disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm
                     transition-colors font-medium"
        >
          {loading ? `${progress}%` : '🌍 ترجمة تلقائية'}
        </button>
      </div>

      {/* Progress bar */}
      {loading && (
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Live translation results */}
      {Object.keys(translations).length > 0 && (
        <div className="border border-slate-700 rounded-xl divide-y divide-slate-700 bg-slate-900/50">
          {LANGUAGES.map(lang => {
            const t = translations[lang.code as LangCode] as TranslationResult | undefined;
            if (!t) return null;

            return (
              <div key={lang.code} className="flex items-start gap-3 p-3">
                {/* Flag + Language */}
                <div className="w-28 shrink-0 flex items-center gap-1.5 pt-1">
                  <span className="text-lg">{LANG_FLAGS[lang.code as LangCode]}</span>
                  <span className="text-xs font-medium text-slate-400">{lang.name}</span>
                </div>

                {/* Translated text — editable */}
                <textarea
                  value={t.text}
                  onChange={e =>
                    setTranslations(prev => ({
                      ...prev,
                      [lang.code]: { ...t, text: e.target.value } as TranslationResult,
                    }))
                  }
                  className={`flex-1 text-sm border border-slate-600 rounded-lg p-2 bg-slate-800 text-white
                    focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none ${
                    lang.rtl ? 'text-right' : 'text-left'
                  }`}
                  rows={2}
                  dir={lang.rtl ? 'rtl' : 'ltr'}
                />

                {/* Source badge */}
                <div className="shrink-0 flex flex-col items-center gap-1 pt-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                      t.verified
                        ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700'
                        : t.source === 'FAILED'
                        ? 'bg-red-900/50 text-red-400 border border-red-700'
                        : 'bg-yellow-900/50 text-yellow-400 border border-yellow-700'
                    }`}
                  >
                    {t.verified ? '✓ ' : t.source === 'FAILED' ? '✗ ' : '⚠ '}
                    {t.source}
                  </span>
                  {t.needsReview && t.source !== 'FAILED' && (
                    <span className="text-[10px] text-yellow-500">مراجعة</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Save button */}
      {completedCount > 0 && !loading && (
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl
                     font-medium transition-colors text-sm"
        >
          💾 حفظ {completedCount} ترجمة
        </button>
      )}
    </div>
  );
}
