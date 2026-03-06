// app/settings/privacy-policy.tsx
// سياسة الخصوصية - روح المسلم

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSettings } from '@/contexts/SettingsContext';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { isDarkMode, t } = useSettings();
  const isRTL = I18nManager.isRTL;

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#11151c' : '#fff'}
      />

      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <MaterialCommunityIcons name={isRTL ? 'arrow-right' : 'arrow-left'} size={28} color={isDarkMode ? '#fff' : '#333'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>{t('settings.privacyPolicy')}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lastUpdated, isDarkMode && styles.textMuted]}>
          آخر تحديث: مارس 2026
        </Text>

        <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>مقدمة</Text>
        <Text style={[styles.paragraph, isDarkMode && styles.textMuted]}>
          نحن في تطبيق "روح المسلم" نقدّر خصوصيتك ونلتزم بحمايتها. توضّح هذه السياسة كيف نتعامل مع بياناتك عند استخدامك للتطبيق.
        </Text>

        <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>البيانات التي نجمعها</Text>
        <Text style={[styles.paragraph, isDarkMode && styles.textMuted]}>
          • <Text style={styles.bold}>بيانات الموقع:</Text> نستخدم موقعك الجغرافي فقط لتحديد أوقات الصلاة واتجاه القبلة. لا يتم إرسال هذه البيانات لأي جهة خارجية.
        </Text>
        <Text style={[styles.paragraph, isDarkMode && styles.textMuted]}>
          • <Text style={styles.bold}>إعدادات التطبيق:</Text> يتم حفظ تفضيلاتك (اللغة، المظهر، الإشعارات) محلياً على جهازك فقط.
        </Text>
        <Text style={[styles.paragraph, isDarkMode && styles.textMuted]}>
          • <Text style={styles.bold}>تقدّم العبادات:</Text> بيانات التسبيح والختمة والأذكار تُخزّن محلياً على جهازك.
        </Text>

        <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>كيف نستخدم بياناتك</Text>
        <Text style={[styles.paragraph, isDarkMode && styles.textMuted]}>
          • تحديد مواقيت الصلاة بدقة حسب موقعك{'\n'}
          • تحديد اتجاه القبلة{'\n'}
          • تخصيص تجربة التطبيق حسب تفضيلاتك{'\n'}
          • إرسال إشعارات الصلاة والأذكار (بعد موافقتك)
        </Text>

        <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>الإعلانات</Text>
        <Text style={[styles.paragraph, isDarkMode && styles.textMuted]}>
          قد يعرض التطبيق إعلانات من خلال خدمات إعلانية خارجية. هذه الخدمات قد تستخدم معرّف الإعلانات لعرض إعلانات ذات صلة. يمكنك إلغاء التتبع من إعدادات جهازك.
        </Text>

        <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>أمان البيانات</Text>
        <Text style={[styles.paragraph, isDarkMode && styles.textMuted]}>
          جميع بياناتك الشخصية مخزّنة محلياً على جهازك ولا يتم رفعها إلى أي خادم. النسخ الاحتياطي يتم بتحكّمك الكامل.
        </Text>

        <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>حقوقك</Text>
        <Text style={[styles.paragraph, isDarkMode && styles.textMuted]}>
          • يمكنك حذف جميع بياناتك من قسم الإعدادات في أي وقت{'\n'}
          • يمكنك إلغاء صلاحية الموقع من إعدادات جهازك{'\n'}
          • يمكنك إيقاف جميع الإشعارات من الإعدادات
        </Text>

        <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>التواصل معنا</Text>
        <Text style={[styles.paragraph, isDarkMode && styles.textMuted]}>
          لأي استفسار يتعلق بالخصوصية، يمكنك التواصل معنا عبر البريد الإلكتروني:{'\n'}
          hossamgamal290@gmail.com
        </Text>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  containerDark: { backgroundColor: '#11151c' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerDark: { backgroundColor: '#1a1a2e', borderBottomColor: '#2a2a3e' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontFamily: 'Cairo-Bold', color: '#333' },
  headerPlaceholder: { width: 40 },
  textLight: { color: '#fff' },
  textMuted: { color: '#aaa' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  lastUpdated: { fontSize: 13, fontFamily: 'Cairo-Regular', color: '#999', marginBottom: 20, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontFamily: 'Cairo-Bold', color: '#333', marginTop: 20, marginBottom: 10 },
  paragraph: { fontSize: 15, fontFamily: 'Cairo-Regular', color: '#555', lineHeight: 26, marginBottom: 10 },
  bold: { fontFamily: 'Cairo-Bold' },
  bottomSpace: { height: 60 },
});
