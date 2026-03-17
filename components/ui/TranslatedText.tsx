/**
 * TranslatedText — Auto-translating Text component.
 *
 * Drop-in replacement for <Text> that automatically translates
 * Arabic content to the user's current language.
 *
 * Usage:
 *   <TranslatedText style={styles.paragraph}>
 *     بسم الله الرحمن الرحيم
 *   </TranslatedText>
 *
 *   <TranslatedText style={styles.title} from="ar" type="hadith">
 *     {hadith.arabic}
 *   </TranslatedText>
 */

import React from 'react';
import { Text, type TextProps } from 'react-native';
import { useAutoTranslate } from '@/hooks/use-auto-translate';
import type { ContentType } from '@/lib/unifiedTranslator';
import { getLanguage } from '@/lib/i18n';

interface TranslatedTextProps extends TextProps {
  children: React.ReactNode;
  /** Source language — defaults to 'ar' */
  from?: 'ar' | 'en';
  /** Content type for API routing — defaults to 'section' */
  type?: ContentType;
  /** If true, sets writingDirection based on target language */
  autoDirection?: boolean;
}

export function TranslatedText({
  children,
  from = 'ar',
  type = 'section',
  autoDirection = true,
  style,
  ...props
}: TranslatedTextProps) {
  const safeText = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : (children ?? '').toString();
  const translated = useAutoTranslate(safeText, from, type);
  const language = getLanguage();
  const isRTL = language === 'ar' || language === 'ur';

  const directionStyle = autoDirection && language !== from
    ? {
        writingDirection: isRTL ? 'rtl' as const : 'ltr' as const,
        textAlign: isRTL ? 'right' as const : 'left' as const,
      }
    : undefined;

  return (
    <Text style={[style, directionStyle]} {...props}>
      {translated}
    </Text>
  );
}

export default TranslatedText;
