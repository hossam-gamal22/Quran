// app/settings/privacy-policy.tsx
// سياسة الخصوصية - روح المسلم

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

export default function PrivacyPolicyScreen() {
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

      <UniversalHeader title={t('settings.privacyPolicy')} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lastUpdated, { color: colors.textLight }]}>
          {isArabic ? 'آخر تحديث: مارس 2026' : 'Last updated: March 2026'}
        </Text>

        <Section
          titleAr="مقدمة"
          titleEn="Introduction"
          bodyAr={'نحن في تطبيق "روح المسلم" نقدّر خصوصيتك ونلتزم بحمايتها. توضّح هذه السياسة كيف نتعامل مع بياناتك عند استخدامك للتطبيق.'}
          bodyEn={'At "Ruh Al-Muslim", we value your privacy and are committed to protecting it. This policy explains how we handle your data when you use the app.'}
        />

        <Section
          titleAr="البيانات التي نجمعها"
          titleEn="Data We Collect"
          bodyAr={'• بيانات الموقع: نستخدم موقعك الجغرافي فقط لتحديد أوقات الصلاة واتجاه القبلة. لا يتم إرسال هذه البيانات لأي جهة خارجية.\n• إعدادات التطبيق: يتم حفظ تفضيلاتك (اللغة، المظهر، الإشعارات) محلياً على جهازك فقط.\n• تقدّم العبادات: بيانات التسبيح والختمة والأذكار تُخزّن محلياً على جهازك.'}
          bodyEn={'• Location data: We use your location only to determine prayer times and Qibla direction. This data is not sent to any third party.\n• App settings: Your preferences (language, theme, notifications) are saved locally on your device only.\n• Worship progress: Tasbih, Khatma, and Adhkar data are stored locally on your device.'}
        />

        <Section
          titleAr="كيف نستخدم بياناتك"
          titleEn="How We Use Your Data"
          bodyAr={'• تحديد مواقيت الصلاة بدقة حسب موقعك\n• تحديد اتجاه القبلة\n• تخصيص تجربة التطبيق حسب تفضيلاتك\n• إرسال إشعارات الصلاة والأذكار (بعد موافقتك)'}
          bodyEn={'• Accurately determine prayer times based on your location\n• Determine Qibla direction\n• Customize the app experience according to your preferences\n• Send prayer and Adhkar notifications (with your consent)'}
        />

        <Section
          titleAr="الإعلانات"
          titleEn="Advertisements"
          bodyAr="قد يعرض التطبيق إعلانات من خلال خدمات إعلانية خارجية. هذه الخدمات قد تستخدم معرّف الإعلانات لعرض إعلانات ذات صلة. يمكنك إلغاء التتبع من إعدادات جهازك."
          bodyEn="The app may display ads through third-party advertising services. These services may use your advertising ID to show relevant ads. You can opt out of tracking from your device settings."
        />

        <Section
          titleAr="أمان البيانات"
          titleEn="Data Security"
          bodyAr="جميع بياناتك الشخصية مخزّنة محلياً على جهازك ولا يتم رفعها إلى أي خادم. النسخ الاحتياطي يتم بتحكّمك الكامل."
          bodyEn="All your personal data is stored locally on your device and is not uploaded to any server. Backups are under your full control."
        />

        <Section
          titleAr="حقوقك"
          titleEn="Your Rights"
          bodyAr={'• يمكنك حذف جميع بياناتك من قسم الإعدادات في أي وقت\n• يمكنك إلغاء صلاحية الموقع من إعدادات جهازك\n• يمكنك إيقاف جميع الإشعارات من الإعدادات'}
          bodyEn={'• You can delete all your data from the Settings section at any time\n• You can revoke location permission from your device settings\n• You can disable all notifications from Settings'}
        />

        <Section
          titleAr="التواصل معنا"
          titleEn="Contact Us"
          bodyAr={'لأي استفسار يتعلق بالخصوصية، يمكنك التواصل معنا عبر البريد الإلكتروني:\nhossamgamal290@gmail.com'}
          bodyEn={'For any privacy-related inquiries, you can reach us at:\nhossamgamal290@gmail.com'}
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
