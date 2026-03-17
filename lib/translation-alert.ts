/**
 * Translation Failure Alert
 * Shows a one-time popup when auto-translation fails for non-Arabic users,
 * informing them the content isn't available in their language yet.
 */

import { Alert, Linking } from 'react-native';
import { getLanguage } from '@/lib/i18n';

const SUPPORT_EMAIL = 'hossamgamal290@gmail.com';

let alertShownThisSession = false;

const ALERT_MESSAGES: Record<string, {
  title: string;
  body: string;
  contact: string;
  ok: string;
  subject: string;
}> = {
  en: {
    title: 'Content Not Available',
    body: 'This content is not yet available in your language. We apologize for the inconvenience. Please contact us so we can include it in the next update.',
    contact: 'Contact Us',
    ok: 'OK',
    subject: 'Content translation request - Ruh Al-Muslim',
  },
  fr: {
    title: 'Contenu non disponible',
    body: "Ce contenu n'est pas encore disponible dans votre langue. Nous nous excusons pour la gêne occasionnée. Veuillez nous contacter pour que nous puissions l'inclure dans la prochaine mise à jour.",
    contact: 'Contactez-nous',
    ok: 'OK',
    subject: 'Demande de traduction - Ruh Al-Muslim',
  },
  de: {
    title: 'Inhalt nicht verfügbar',
    body: 'Dieser Inhalt ist in Ihrer Sprache noch nicht verfügbar. Wir entschuldigen uns für die Unannehmlichkeiten. Bitte kontaktieren Sie uns, damit wir ihn in das nächste Update aufnehmen können.',
    contact: 'Kontaktieren Sie uns',
    ok: 'OK',
    subject: 'Übersetzungsanfrage - Ruh Al-Muslim',
  },
  es: {
    title: 'Contenido no disponible',
    body: 'Este contenido aún no está disponible en su idioma. Pedimos disculpas por las molestias. Contáctenos para que podamos incluirlo en la próxima actualización.',
    contact: 'Contáctenos',
    ok: 'OK',
    subject: 'Solicitud de traducción - Ruh Al-Muslim',
  },
  tr: {
    title: 'İçerik Mevcut Değil',
    body: 'Bu içerik henüz dilinizde mevcut değil. Verdiğimiz rahatsızlıktan dolayı özür dileriz. Bir sonraki güncellemede ekleyebilmemiz için lütfen bizimle iletişime geçin.',
    contact: 'Bize Ulaşın',
    ok: 'Tamam',
    subject: 'Çeviri talebi - Ruh Al-Muslim',
  },
  ur: {
    title: 'مواد دستیاب نہیں',
    body: 'یہ مواد ابھی آپ کی زبان میں دستیاب نہیں ہے۔ ہم اس تکلیف کے لیے معذرت خواہ ہیں۔ براہ کرم ہم سے رابطہ کریں تاکہ ہم اسے اگلی اپڈیٹ میں شامل کر سکیں۔',
    contact: 'ہم سے رابطہ کریں',
    ok: 'ٹھیک ہے',
    subject: 'ترجمے کی درخواست - روح المسلم',
  },
  id: {
    title: 'Konten Tidak Tersedia',
    body: 'Konten ini belum tersedia dalam bahasa Anda. Kami mohon maaf atas ketidaknyamanannya. Silakan hubungi kami agar kami dapat menyertakannya dalam pembaruan berikutnya.',
    contact: 'Hubungi Kami',
    ok: 'OK',
    subject: 'Permintaan terjemahan - Ruh Al-Muslim',
  },
  ms: {
    title: 'Kandungan Tidak Tersedia',
    body: 'Kandungan ini belum tersedia dalam bahasa anda. Kami memohon maaf atas kesulitan ini. Sila hubungi kami supaya kami boleh memasukkannya dalam kemaskini seterusnya.',
    contact: 'Hubungi Kami',
    ok: 'OK',
    subject: 'Permintaan terjemahan - Ruh Al-Muslim',
  },
  hi: {
    title: 'सामग्री उपलब्ध नहीं',
    body: 'यह सामग्री अभी आपकी भाषा में उपलब्ध नहीं है। असुविधा के लिए हम क्षमा चाहते हैं। कृपया हमसे संपर्क करें ताकि हम इसे अगले अपडेट में शामिल कर सकें।',
    contact: 'हमसे संपर्क करें',
    ok: 'ठीक है',
    subject: 'अनुवाद अनुरोध - रूह अल-मुस्लिम',
  },
  bn: {
    title: 'বিষয়বস্তু উপলব্ধ নয়',
    body: 'এই বিষয়বস্তু এখনও আপনার ভাষায় উপলব্ধ নয়। অসুবিধার জন্য আমরা দুঃখিত। অনুগ্রহ করে আমাদের সাথে যোগাযোগ করুন যাতে আমরা পরবর্তী আপডেটে এটি অন্তর্ভুক্ত করতে পারি।',
    contact: 'যোগাযোগ করুন',
    ok: 'ঠিক আছে',
    subject: 'অনুবাদ অনুরোধ - রুহ আল-মুসলিম',
  },
  ru: {
    title: 'Контент недоступен',
    body: 'Этот контент пока недоступен на вашем языке. Приносим извинения за неудобства. Пожалуйста, свяжитесь с нами, чтобы мы могли включить его в следующее обновление.',
    contact: 'Связаться с нами',
    ok: 'OK',
    subject: 'Запрос на перевод - Ruh Al-Muslim',
  },
};

/**
 * Call when auto-translation fails and original Arabic/English text
 * is shown to a non-Arabic user. Shows a one-time alert per session.
 */
export function reportTranslationFailure(): void {
  if (alertShownThisSession) return;

  const lang = getLanguage();
  if (lang === 'ar') return;

  alertShownThisSession = true;

  const msg = ALERT_MESSAGES[lang] || ALERT_MESSAGES.en;

  Alert.alert(
    msg.title,
    msg.body,
    [
      { text: msg.ok, style: 'cancel' },
      {
        text: msg.contact,
        onPress: () => {
          const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(msg.subject)}`;
          Linking.openURL(mailto);
        },
      },
    ],
  );
}
