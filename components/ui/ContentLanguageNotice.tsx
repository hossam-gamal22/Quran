/**
 * ContentLanguageNotice — Shown on religious-content pages when the user's
 * language is neither Arabic nor English. Tells the user the content is only
 * authored in Arabic/English and that other languages rely on auto-translation.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { getLanguage } from '@/lib/i18n';
import { fontRegular, fontSemiBold } from '@/lib/fonts';

const MESSAGES: Record<string, { title: string; body: string }> = {
  fr: {
    title: 'Disponibilité linguistique limitée',
    body: "Ce contenu religieux est rédigé uniquement en arabe et en anglais. Les autres langues sont fournies par traduction automatique et peuvent contenir des inexactitudes.",
  },
  de: {
    title: 'Eingeschränkte Sprachverfügbarkeit',
    body: 'Dieser religiöse Inhalt liegt nur auf Arabisch und Englisch vor. Andere Sprachen werden automatisch übersetzt und können Ungenauigkeiten enthalten.',
  },
  es: {
    title: 'Disponibilidad de idiomas limitada',
    body: 'Este contenido religioso está disponible únicamente en árabe e inglés. Otros idiomas se ofrecen mediante traducción automática y pueden contener imprecisiones.',
  },
  tr: {
    title: 'Sınırlı dil kullanılabilirliği',
    body: 'Bu dini içerik yalnızca Arapça ve İngilizce olarak hazırlanmıştır. Diğer diller otomatik çeviri ile sunulur ve hata içerebilir.',
  },
  ur: {
    title: 'محدود زبانوں میں دستیابی',
    body: 'یہ دینی مواد صرف عربی اور انگریزی میں دستیاب ہے۔ دیگر زبانیں خودکار ترجمے سے فراہم کی جاتی ہیں اور ان میں غلطیاں ہو سکتی ہیں۔',
  },
  id: {
    title: 'Ketersediaan bahasa terbatas',
    body: 'Konten keagamaan ini hanya tersedia dalam bahasa Arab dan Inggris. Bahasa lain disediakan melalui terjemahan otomatis dan mungkin mengandung ketidakakuratan.',
  },
  ms: {
    title: 'Ketersediaan bahasa terhad',
    body: 'Kandungan keagamaan ini hanya tersedia dalam bahasa Arab dan Inggeris. Bahasa lain disediakan melalui terjemahan automatik dan mungkin mengandungi ketidaktepatan.',
  },
  hi: {
    title: 'सीमित भाषा उपलब्धता',
    body: 'यह धार्मिक सामग्री केवल अरबी और अंग्रेज़ी में उपलब्ध है। अन्य भाषाएँ स्वचालित अनुवाद से प्रदान की जाती हैं और इनमें अशुद्धियाँ हो सकती हैं।',
  },
  bn: {
    title: 'সীমিত ভাষার লভ্যতা',
    body: 'এই ধর্মীয় বিষয়বস্তু কেবলমাত্র আরবি ও ইংরেজিতে উপলব্ধ। অন্যান্য ভাষা স্বয়ংক্রিয় অনুবাদের মাধ্যমে প্রদান করা হয় এবং এতে ভুল থাকতে পারে।',
  },
  ru: {
    title: 'Ограниченная языковая доступность',
    body: 'Этот религиозный контент доступен только на арабском и английском языках. Другие языки предоставляются через автоматический перевод и могут содержать неточности.',
  },
};

interface Props {
  style?: object;
}

export function ContentLanguageNotice({ style }: Props) {
  const lang = getLanguage();
  if (lang === 'ar' || lang === 'en') return null;

  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  const msg = MESSAGES[lang] || MESSAGES.fr;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <MaterialCommunityIcons name="information-outline" size={20} color="#0d8e62" />
        <Text style={[styles.title, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {msg.title}
        </Text>
      </View>
      <Text style={[styles.body, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
        {msg.body}
      </Text>
    </View>
  );
}

export default ContentLanguageNotice;

const _styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontSemiBold(),
  },
  body: {
    fontSize: 12,
    fontFamily: fontRegular(),
    lineHeight: 18,
  },
});
