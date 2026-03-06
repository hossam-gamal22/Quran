// app/settings/terms-of-use.tsx
// شروط الاستخدام - روح المسلم

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

export default function TermsOfUseScreen() {
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
        <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>{t('settings.termsOfService')}</Text>
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

        <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>القبول بالشروط</Text>
        <Text style={[styles.paragraph, isDarkMode && styles.textMuted]}>
          باستخدامك لتطبيق "روح المسلم"، فإنك توافق على هذه الشروط. إذا كنت لا توافق عليها، يرجى عدم استخدام التطبيق.
        </Text>

        <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>الغرض من التطبيق</Text>
        <Text style={[styles.paragraph, isDarkMode && styles.textMuted]}>
          تطبيق "روح المسلم" هو تطبيق إسلامي يهدف إلى مساعدة المسلمين في عباداتهم اليومية، ويشمل:{'\n'}
          • قراءة القرآن الكريم والاستماع إليه{'\n'}
          • متابعة أوقات الصلاة{'\n'}
          • الأذكار والأدعية{'\n'}
          • التسبيح والاستغفار{'\n'}
          • ختمة القرآن{'\n'}
          • الرقية الشرعية{'\n'}
          • أسماء الله الحسنى
        </Text>

        <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>المحتوى الإسلامي</Text>
        <Text style={[styles.paragraph, isDarkMode && styles.textMuted]}>
          نحرص على أن يكون المحتوى المقدّم دقيقاً وموثوقاً من مصادر إسلامية معتمدة. النصوص القرآنية مأخوذة من مصحف المدينة المنوّرة. الأذكار والأدعية من مصادر حديثية صحيحة.
        </Text>

        <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>مسؤوليات المستخدم</Text>
        <Text style={[styles.paragraph, isDarkMode && styles.textMuted]}>
          • استخدام التطبيق لأغراض مشروعة فقط{'\n'}
          • عدم محاولة التلاعب بمحتوى التطبيق أو أنظمته{'\n'}
          • الإبلاغ عن أي خطأ في المحتوى الإسلامي عبر البريد الإلكتروني
        </Text>

        <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>الملكية الفكرية</Text>
        <Text style={[styles.paragraph, isDarkMode && styles.textMuted]}>
          التطبيق وتصميمه ومحتواه (باستثناء النصوص القرآنية والأحاديث) محميّة بحقوق الملكية الفكرية. لا يجوز نسخ أو إعادة توزيع التطبيق أو أجزاء منه دون إذن مسبق.
        </Text>

        <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>إخلاء المسؤولية</Text>
        <Text style={[styles.paragraph, isDarkMode && styles.textMuted]}>
          • أوقات الصلاة تقريبية وقد تختلف حسب طريقة الحساب المستخدمة{'\n'}
          • اتجاه القبلة يعتمد على بوصلة جهازك وقد يتأثر بالمجالات المغناطيسية{'\n'}
          • التطبيق لا يغني عن استشارة أهل العلم في المسائل الشرعية
        </Text>

        <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>التحديثات</Text>
        <Text style={[styles.paragraph, isDarkMode && styles.textMuted]}>
          نحتفظ بالحق في تحديث هذه الشروط في أي وقت. سيتم إخطارك بأي تغييرات جوهرية من خلال التطبيق.
        </Text>

        <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>التواصل</Text>
        <Text style={[styles.paragraph, isDarkMode && styles.textMuted]}>
          لأي استفسار أو اقتراح، يمكنك مراسلتنا عبر:{'\n'}
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
