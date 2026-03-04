import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, DarkColors, Spacing, BorderRadius, Shadows, Typography } from '../../constants/theme';
import { APP_CONFIG, APP_NAME } from '../../constants/app';
import { Share } from 'react-native';

// ============================================
// الميزات الإضافية
// ============================================

interface MoreItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  iconColor: string;
  route?: string;
  action?: () => void;
}

// ============================================
// المكون الرئيسي
// ============================================

export default function MoreScreen() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('app_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setDarkMode(parsed.darkMode ?? false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const currentColors = darkMode ? DarkColors : Colors;

  const shareApp = async () => {
    try {
      await Share.share({
        message: APP_CONFIG.getShareWithDownload(),
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const openURL = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Error opening URL:', err));
  };

  // ============================================
  // الميزات
  // ============================================

  const FEATURES: MoreItem[] = [
    {
      id: 'quran',
      title: 'القرآن الكريم',
      subtitle: 'قراءة واستماع',
      icon: 'book',
      iconColor: '#059669',
      route: '/(tabs)/quran',
    },
    {
      id: 'tasbih',
      title: 'عداد التسبيح',
      subtitle: 'سبّح واحفظ عددك',
      icon: 'radio-button-on',
      iconColor: '#8B5CF6',
      route: '/tasbih',
    },
    {
      id: 'names',
      title: 'أسماء الله الحسنى',
      subtitle: '99 اسماً مع الشرح',
      icon: 'sparkles',
      iconColor: '#D4AF37',
      route: '/names',
    },
    {
      id: 'ruqyah',
      title: 'الرقية الشرعية',
      subtitle: 'آيات وأدعية الرقية',
      icon: 'shield-checkmark',
      iconColor: '#EF4444',
      route: '/ruqyah',
    },
    {
      id: 'qibla',
      title: 'اتجاه القبلة',
      subtitle: 'بوصلة القبلة',
      icon: 'compass',
      iconColor: '#6366F1',
      route: '/qibla',
    },
    {
      id: 'hijri',
      title: 'التقويم الهجري',
      subtitle: 'التاريخ والمناسبات',
      icon: 'calendar',
      iconColor: '#F59E0B',
      route: '/hijri',
    },
  ];

  const SUPPORT_ITEMS: MoreItem[] = [
    {
      id: 'share',
      title: 'مشاركة التطبيق',
      subtitle: 'شارك التطبيق مع أصدقائك',
      icon: 'share-social',
      iconColor: '#0284C7',
      action: shareApp,
    },
    {
      id: 'rate',
      title: 'تقييم التطبيق',
      subtitle: 'ساعدنا بتقييمك',
      icon: 'star',
      iconColor: '#F59E0B',
      action: () => {
        // فتح صفحة التطبيق في المتجر
        Alert.alert('شكراً لك', 'سيتم توجيهك لصفحة التقييم');
      },
    },
    {
      id: 'contact',
      title: 'تواصل معنا',
      subtitle: 'أرسل لنا اقتراحاتك',
      icon: 'mail',
      iconColor: '#10B981',
      action: () => openURL(`mailto:${APP_CONFIG.contact.email}`),
    },
    {
      id: 'about',
      title: 'حول التطبيق',
      subtitle: `الإصدار ${APP_CONFIG.version}`,
      icon: 'information-circle',
      iconColor: '#6366F1',
      action: () => {
        Alert.alert(
          APP_NAME,
          `${APP_CONFIG.description}\n\nالإصدار: ${APP_CONFIG.version}`,
          [{ text: 'حسناً' }]
        );
      },
    },
  ];

  const LEGAL_ITEMS: MoreItem[] = [
    {
      id: 'privacy',
      title: 'سياسة الخصوصية',
      icon: 'shield-checkmark',
      iconColor: '#EF4444',
      action: () => openURL('https://example.com/privacy'),
    },
    {
      id: 'terms',
      title: 'شروط الاستخدام',
      icon: 'document-text',
      iconColor: '#8B5CF6',
      action: () => openURL('https://example.com/terms'),
    },
  ];

  // ============================================
  // عرض العنصر
  // ============================================

  const renderItem = (item: MoreItem) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.item, { backgroundColor: currentColors.surface }]}
      onPress={() => {
        if (item.route) {
          router.push(item.route as any);
        } else if (item.action) {
          item.action();
        }
      }}
    >
      <View style={[styles.itemIcon, { backgroundColor: item.iconColor + '15' }]}>
        <Ionicons name={item.icon as any} size={24} color={item.iconColor} />
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: currentColors.text }]}>{item.title}</Text>
        {item.subtitle && (
          <Text style={[styles.itemSubtitle, { color: currentColors.textLight }]}>
            {item.subtitle}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-back" size={20} color={currentColors.textLight} />
    </TouchableOpacity>
  );

  // ============================================
  // العرض
  // ============================================

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      {/* الهيدر */}
      <View style={[styles.header, { backgroundColor: currentColors.surface }]}>
        <Text style={[styles.headerTitle, { color: currentColors.text }]}>المزيد</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* بانر التطبيق */}
        <View style={[styles.appBanner, { backgroundColor: currentColors.primary }]}>
          <Ionicons name="book" size={48} color={Colors.white} />
          <Text style={styles.appName}>{APP_NAME}</Text>
          <Text style={styles.appTagline}>رفيقك الإسلامي اليومي</Text>
        </View>

        {/* الميزات */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentColors.textLight }]}>الميزات</Text>
          {FEATURES.map(renderItem)}
        </View>

        {/* الدعم */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentColors.textLight }]}>الدعم</Text>
          {SUPPORT_ITEMS.map(renderItem)}
        </View>

        {/* قانوني */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentColors.textLight }]}>قانوني</Text>
          {LEGAL_ITEMS.map(renderItem)}
        </View>

        {/* رسالة الدعم */}
        <View style={[styles.supportMessage, { backgroundColor: currentColors.surface }]}>
          <Ionicons name="heart" size={24} color={Colors.error} />
          <Text style={[styles.supportText, { color: currentColors.textSecondary }]}>
            قم بدعم التطبيق عن طريق مشاركته مع أصدقائك وإذا كان هنالك أي مشكلة أو اقتراح فلا تتردد بالتواصل معنا
          </Text>
        </View>

        {/* حقوق النشر */}
        <Text style={[styles.copyright, { color: currentColors.textLight }]}>
          {APP_NAME} © {new Date().getFullYear()}
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ============================================
// الأنماط
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + 20,
    paddingBottom: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  appBanner: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  appName: {
    fontSize: Typography.sizes.xxl,
    fontWeight: '700',
    color: Colors.white,
    marginTop: Spacing.sm,
  },
  appTagline: {
    fontSize: Typography.sizes.md,
    color: Colors.white,
    opacity: 0.9,
    marginTop: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    marginRight: Spacing.sm,
    textAlign: 'right',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
    marginHorizontal: Spacing.md,
  },
  itemTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    textAlign: 'right',
  },
  itemSubtitle: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
    textAlign: 'right',
  },
  supportMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  supportText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    lineHeight: 22,
    textAlign: 'right',
  },
  copyright: {
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
