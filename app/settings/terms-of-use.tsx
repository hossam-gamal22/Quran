// app/settings/terms-of-use.tsx
// شروط الاستخدام - روح المسلم

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { fontBold, fontRegular } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { getLanguage } from '@/lib/i18n';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { TranslatedText } from '@/components/ui/TranslatedText';
import { UniversalHeader } from '@/components/ui';

export default function TermsOfUseScreen() {
  const { isDarkMode, t, settings } = useSettings();
  const colors = useColors();
  const isRTL = useIsRTL();
  const lang = getLanguage();
  const isArabic = lang === 'ar';

  const Section = ({ titleAr, titleEn, bodyAr, bodyEn }: { titleAr: string; titleEn: string; bodyAr: string; bodyEn: string }) => (
    <>
      {isArabic ? (
        <Text style={[styles.sectionTitle, { color: colors.text, textAlign: 'right', writingDirection: 'rtl' }]}>{titleAr}</Text>
      ) : lang === 'en' ? (
        <Text style={[styles.sectionTitle, { color: colors.text, textAlign: 'left' }]}>{titleEn}</Text>
      ) : (
        <TranslatedText from="en" style={[styles.sectionTitle, { color: colors.text, textAlign: 'left' }]}>{titleEn}</TranslatedText>
      )}
      {isArabic ? (
        <Text style={[styles.paragraph, { color: colors.textLight, textAlign: 'right', writingDirection: 'rtl' }]}>{bodyAr}</Text>
      ) : lang === 'en' ? (
        <Text style={[styles.paragraph, { color: colors.textLight, textAlign: 'left' }]}>{bodyEn}</Text>
      ) : (
        <TranslatedText from="en" style={[styles.paragraph, { color: colors.textLight, textAlign: 'left' }]}>{bodyEn}</TranslatedText>
      )}
    </>
  );

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#11151c' : '#fff'}
      />

      <UniversalHeader title={t('settings.termsOfService')} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lastUpdated, { color: colors.textLight }]}>
          {isArabic ? 'آخر تحديث: مارس 2026' : 'Last updated: March 2026'}
        </Text>

        <Section
          titleAr="القبول بالشروط"
          titleEn="Acceptance of Terms"
          bodyAr={'باستخدامك لتطبيق "روح المسلم"، فإنك توافق على هذه الشروط. إذا كنت لا توافق عليها، يرجى عدم استخدام التطبيق.'}
          bodyEn={'By using the "Ruh Al-Muslim" app, you agree to these terms. If you do not agree, please do not use the app.'}
        />

        <Section
          titleAr="الغرض من التطبيق"
          titleEn="Purpose of the App"
          bodyAr={'تطبيق "روح المسلم" هو تطبيق إسلامي يهدف إلى مساعدة المسلمين في عباداتهم اليومية، ويشمل:\n• قراءة القرآن الكريم والاستماع إليه\n• متابعة أوقات الصلاة\n• الأذكار والأدعية\n• التسبيح والاستغفار\n• ختمة القرآن\n• الرقية الشرعية\n• أسماء الله الحسنى'}
          bodyEn={'Ruh Al-Muslim is an Islamic app designed to help Muslims with their daily worship, including:\n• Reading and listening to the Holy Quran\n• Tracking prayer times\n• Adhkar and supplications\n• Tasbih and Istighfar\n• Quran Khatma\n• Ruqyah (spiritual healing)\n• Names of Allah'}
        />

        <Section
          titleAr="المحتوى الإسلامي"
          titleEn="Islamic Content"
          bodyAr="نحرص على أن يكون المحتوى المقدّم دقيقاً وموثوقاً من مصادر إسلامية معتمدة. النصوص القرآنية مأخوذة من مصحف المدينة المنوّرة. الأذكار والأدعية من مصادر حديثية صحيحة."
          bodyEn="We ensure that all content is accurate and sourced from authentic Islamic references. Quranic texts are taken from the Madinah Mushaf. Adhkar and supplications are from authentic Hadith sources."
        />

        <Section
          titleAr="مسؤوليات المستخدم"
          titleEn="User Responsibilities"
          bodyAr={'• استخدام التطبيق لأغراض مشروعة فقط\n• عدم محاولة التلاعب بمحتوى التطبيق أو أنظمته\n• الإبلاغ عن أي خطأ في المحتوى الإسلامي عبر البريد الإلكتروني'}
          bodyEn={'• Use the app for lawful purposes only\n• Do not attempt to tamper with the app\'s content or systems\n• Report any errors in Islamic content via email'}
        />

        <Section
          titleAr="الملكية الفكرية"
          titleEn="Intellectual Property"
          bodyAr="التطبيق وتصميمه ومحتواه (باستثناء النصوص القرآنية والأحاديث) محميّة بحقوق الملكية الفكرية. لا يجوز نسخ أو إعادة توزيع التطبيق أو أجزاء منه دون إذن مسبق."
          bodyEn="The app, its design, and content (excluding Quranic texts and Hadiths) are protected by intellectual property rights. Copying or redistributing the app or parts of it without prior permission is prohibited."
        />

        <Section
          titleAr="إخلاء المسؤولية"
          titleEn="Disclaimer"
          bodyAr={'• أوقات الصلاة تقريبية وقد تختلف حسب طريقة الحساب المستخدمة\n• اتجاه القبلة يعتمد على بوصلة جهازك وقد يتأثر بالمجالات المغناطيسية\n• التطبيق لا يغني عن استشارة أهل العلم في المسائل الشرعية'}
          bodyEn={'• Prayer times are approximate and may vary based on the calculation method used\n• Qibla direction relies on your device\'s compass and may be affected by magnetic fields\n• The app does not replace consulting scholars on religious matters'}
        />

        <Section
          titleAr="التحديثات"
          titleEn="Updates"
          bodyAr="نحتفظ بالحق في تحديث هذه الشروط في أي وقت. سيتم إخطارك بأي تغييرات جوهرية من خلال التطبيق."
          bodyEn="We reserve the right to update these terms at any time. You will be notified of any significant changes through the app."
        />

        <Section
          titleAr="التواصل"
          titleEn="Contact Us"
          bodyAr={'لأي استفسار أو اقتراح، يمكنك مراسلتنا عبر:\nhossamgamal290@gmail.com'}
          bodyEn={'For any inquiries or suggestions, you can reach us at:\nhossamgamal290@gmail.com'}
        />

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  containerDark: { backgroundColor: '#11151c' },

  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  lastUpdated: { fontSize: 13, fontFamily: fontRegular(), color: '#999', marginBottom: 20, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontFamily: fontBold(), color: '#333', marginTop: 20, marginBottom: 10 },
  paragraph: { fontSize: 15, fontFamily: fontRegular(), color: '#555', lineHeight: 26, marginBottom: 10 },
  bold: { fontFamily: fontBold() },
  bottomSpace: { height: 60 },
});
