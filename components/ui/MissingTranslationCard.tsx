/**
 * MissingTranslationCard — Shown when auto-translation was used,
 * inviting users to help improve translations via email.
 */

import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { getLanguage } from '@/lib/i18n';
import { fontRegular, fontSemiBold } from '@/lib/fonts';

const SUPPORT_EMAIL = 'hossamgamal290@gmail.com';

const MESSAGES: Record<string, { body: string; cta: string; subject: string }> = {
  en: { body: 'Some content may be auto-translated. Help us improve!', cta: 'Suggest a correction', subject: 'Translation improvement - Ruh Al-Muslim' },
  fr: { body: 'Certains contenus peuvent être traduits automatiquement. Aidez-nous à améliorer !', cta: 'Suggérer une correction', subject: 'Amélioration de traduction - Ruh Al-Muslim' },
  de: { body: 'Einige Inhalte wurden möglicherweise automatisch übersetzt. Helfen Sie uns, sie zu verbessern!', cta: 'Korrektur vorschlagen', subject: 'Übersetzungsverbesserung - Ruh Al-Muslim' },
  es: { body: 'Algunos contenidos pueden estar traducidos automáticamente. ¡Ayúdanos a mejorar!', cta: 'Sugerir una corrección', subject: 'Mejora de traducción - Ruh Al-Muslim' },
  tr: { body: 'Bazı içerikler otomatik çevrilmiş olabilir. İyileştirmemize yardım edin!', cta: 'Düzeltme önerin', subject: 'Çeviri iyileştirmesi - Ruh Al-Muslim' },
  ur: { body: 'کچھ مواد خودکار ترجمہ ہو سکتا ہے۔ بہتر بنانے میں ہماری مدد کریں!', cta: 'اصلاح تجویز کریں', subject: 'ترجمہ بہتری - روح المسلم' },
  id: { body: 'Beberapa konten mungkin diterjemahkan otomatis. Bantu kami memperbaikinya!', cta: 'Sarankan koreksi', subject: 'Perbaikan terjemahan - Ruh Al-Muslim' },
  ms: { body: 'Sesetengah kandungan mungkin diterjemah secara automatik. Bantu kami memperbaikinya!', cta: 'Cadangkan pembetulan', subject: 'Penambahbaikan terjemahan - Ruh Al-Muslim' },
  hi: { body: 'कुछ सामग्री स्वचालित अनुवादित हो सकती है। सुधारने में हमारी मदद करें!', cta: 'सुधार सुझाएं', subject: 'अनुवाद सुधार - रूह अल-मुस्लिम' },
  bn: { body: 'কিছু বিষয়বস্তু স্বয়ংক্রিয়ভাবে অনুবাদ হতে পারে। উন্নত করতে সাহায্য করুন!', cta: 'সংশোধন প্রস্তাব করুন', subject: 'অনুবাদ উন্নতি - রুহ আল-মুসলিম' },
  ru: { body: 'Некоторый контент может быть переведён автоматически. Помогите нам улучшить!', cta: 'Предложить исправление', subject: 'Улучшение перевода - Ruh Al-Muslim' },
};

interface Props {
  /** Page/section name for the email subject */
  pageName?: string;
}

export function MissingTranslationCard({ pageName }: Props) {
  const lang = getLanguage();
  if (lang === 'ar') return null;

  const colors = useColors();
  const isRTL = useIsRTL();
  const msg = MESSAGES[lang] || MESSAGES.en;

  const handlePress = () => {
    const subject = encodeURIComponent(msg.subject + (pageName ? ` (${pageName})` : ''));
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <MaterialCommunityIcons name="translate" size={18} color={colors.muted} />
        <Text style={[styles.body, { color: colors.muted, textAlign: isRTL ? 'right' : 'left' }]}>
          {msg.body}
        </Text>
      </View>
      <TouchableOpacity onPress={handlePress} style={[styles.ctaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <MaterialCommunityIcons name="email-outline" size={14} color="#22C55E" />
        <Text style={[styles.cta, { textAlign: isRTL ? 'right' : 'left' }]}>
          {msg.cta}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
  },
  body: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontRegular(),
    lineHeight: 18,
  },
  ctaRow: {
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  cta: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
    color: '#22C55E',
  },
});
