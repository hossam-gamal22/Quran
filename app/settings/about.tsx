// app/settings/about.tsx
// صفحة عن التطبيق - روح المسلم

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Image,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Application from 'expo-application';
import Animated, { FadeInDown, FadeIn, useAnimatedStyle, useSharedValue, withSpring, withSequence } from 'react-native-reanimated';

import { useSettings } from '@/contexts/SettingsContext';

// ========================================
// الثوابت
// ========================================

const APP_INFO = {
  name: 'روح المسلم',
  tagline: 'رفيقك الروحي اليومي',
  description: 'تطبيق إسلامي شامل يهدف إلى مساعدة المسلمين في أداء عباداتهم اليومية والتقرب إلى الله.',
  email: 'hossamgamal290@gmail.com',
};

const FEATURES = [
  { icon: 'book-open-variant', title: 'القرآن الكريم', desc: 'قراءة واستماع مع التفسير' },
  { icon: 'hands-pray', title: 'الأذكار والأدعية', desc: 'أذكار الصباح والمساء والمناسبات' },
  { icon: 'mosque', title: 'مواقيت الصلاة', desc: 'تنبيهات دقيقة حسب موقعك' },
  { icon: 'calendar-check', title: 'متتبع العبادات', desc: 'تتبع صلاتك وصيامك وأذكارك' },
  { icon: 'bookmark-multiple', title: 'نظام الختمات', desc: 'إنشاء وإدارة ختمات القرآن' },
  { icon: 'widgets', title: 'ويدجت', desc: 'ويدجت للشاشة الرئيسية' },
];



// ========================================
// مكونات فرعية
// ========================================

interface LinkItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  isDarkMode: boolean;
}

const LinkItem: React.FC<LinkItemProps> = ({
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
  isDarkMode,
}) => {
  return (
    <TouchableOpacity
      style={[styles.linkItem, isDarkMode && styles.linkItemDark]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.7}
    >
      <View style={styles.linkIconBg}>
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.linkContent}>
        <Text style={[styles.linkTitle, isDarkMode && styles.textLight]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.linkSubtitle, isDarkMode && styles.textMuted]}>{subtitle}</Text>
        )}
      </View>
      <MaterialCommunityIcons name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'} size={24} color={isDarkMode ? '#666' : '#ccc'} />
    </TouchableOpacity>
  );
};

interface FeatureItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  desc: string;
  index: number;
  isDarkMode: boolean;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, desc, index, isDarkMode }) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).duration(400)}
      style={[styles.featureItem, isDarkMode && styles.featureItemDark]}
    >
      <View style={styles.featureIcon}>
        <MaterialCommunityIcons name={icon} size={24} color="#2f7659" />
      </View>
      <View style={styles.featureContent}>
        <Text style={[styles.featureTitle, isDarkMode && styles.textLight]}>{title}</Text>
        <Text style={[styles.featureDesc, isDarkMode && styles.textMuted]}>{desc}</Text>
      </View>
    </Animated.View>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function AboutScreen() {
  const router = useRouter();
  const { isDarkMode, t } = useSettings();
  const [tapCount, setTapCount] = useState(0);
  const logoScale = useSharedValue(1);

  const handleLogoTap = () => {
    setTapCount((prev) => prev + 1);
    logoScale.value = withSequence(
      withSpring(0.9, { damping: 10 }),
      withSpring(1, { damping: 10 })
    );

    if (tapCount === 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Easter egg - يمكن إضافة ميزة مخفية هنا
      setTapCount(0);
    }
  };

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const openEmail = () => {
    Linking.openURL(`mailto:${APP_INFO.email}?subject=تطبيق روح المسلم`);
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#11151c' : '#fff'}
      />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(500)}
        style={[styles.header, isDarkMode && styles.headerDark]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <MaterialCommunityIcons name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'} size={28} color={isDarkMode ? '#fff' : '#333'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>{t('settings.about')}</Text>
        <View style={styles.headerPlaceholder} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* App Logo & Info */}
        <Animated.View entering={FadeInDown.delay(50).duration(500)}>
          <View
            style={[styles.heroCard, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.85)' : 'rgba(47,118,89,0.85)' }]}
          >
            <TouchableOpacity onPress={handleLogoTap} activeOpacity={0.9}>
              <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
                <MaterialCommunityIcons name="moon-waning-crescent" size={50} color="#fff" />
              </Animated.View>
            </TouchableOpacity>
            <Text style={styles.appName}>{t('common.appName')}</Text>
            <Text style={styles.appTagline}>{APP_INFO.tagline}</Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>
                الإصدار {Application.nativeApplicationVersion || '1.0.0'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <View style={[styles.descCard, isDarkMode && styles.descCardDark]}>
            <Text style={[styles.descText, isDarkMode && styles.textLight]}>
              {APP_INFO.description}
            </Text>
          </View>
        </Animated.View>

        {/* Features */}
        <Animated.View entering={FadeIn.delay(150).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>{t('settings.about')}</Text>
          <View style={[styles.featuresGrid, isDarkMode && styles.featuresGridDark]}>
            {FEATURES.map((feature, index) => (
              <FeatureItem
                key={feature.title}
                icon={feature.icon as any}
                title={feature.title}
                desc={feature.desc}
                index={index}
                isDarkMode={isDarkMode}
              />
            ))}
          </View>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>{t('settings.about')}</Text>
          <View style={[styles.statsContainer, isDarkMode && styles.statsContainerDark]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, isDarkMode && styles.textLight]}>12</Text>
              <Text style={[styles.statLabel, isDarkMode && styles.textMuted]}>{t('settings.language')}</Text>
            </View>
            <View style={[styles.statDivider, isDarkMode && styles.statDividerDark]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, isDarkMode && styles.textLight]}>114</Text>
              <Text style={[styles.statLabel, isDarkMode && styles.textMuted]}>{t('quran.surah')}</Text>
            </View>
            <View style={[styles.statDivider, isDarkMode && styles.statDividerDark]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, isDarkMode && styles.textLight]}>100+</Text>
              <Text style={[styles.statLabel, isDarkMode && styles.textMuted]}>{t('home.azkarSection')}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Links */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>{t('settings.support')}</Text>
          <View style={[styles.linksCard, isDarkMode && styles.linksCardDark]}>
            <LinkItem
              icon="email"
              iconColor="#3a7ca5"
              title={t('settings.contactUs')}
              subtitle={APP_INFO.email}
              onPress={openEmail}
              isDarkMode={isDarkMode}
            />
            <LinkItem
              icon="facebook"
              iconColor="#1877F2"
              title="Facebook"
              onPress={() => Linking.openURL('https://www.facebook.com/HossamGamal59/')}
              isDarkMode={isDarkMode}
            />
            <LinkItem
              icon="shield-check"
              iconColor="#5d4e8c"
              title={t('settings.privacyPolicy')}
              onPress={() => router.push('/settings/privacy-policy' as any)}
              isDarkMode={isDarkMode}
            />
            <LinkItem
              icon="file-document"
              iconColor="#c17f59"
              title={t('settings.termsOfService')}
              onPress={() => router.push('/settings/terms-of-use' as any)}
              isDarkMode={isDarkMode}
            />
          </View>
        </Animated.View>

        {/* Footer */}
        <Animated.View entering={FadeInDown.delay(350).duration(500)} style={styles.footer}>
          <Text style={[styles.copyright, isDarkMode && styles.textMuted]}>
            © {new Date().getFullYear()} {t('common.appName')}
          </Text>
        </Animated.View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ========================================
// الأنماط
// ========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#11151c',
  },
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
  headerDark: {
    backgroundColor: '#1a1a2e',
    borderBottomColor: '#2a2a3e',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  headerPlaceholder: {
    width: 40,
  },
  textLight: {
    color: '#fff',
  },
  textMuted: {
    color: '#999',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  heroCard: {
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    marginBottom: 16,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  appName: {
    fontSize: 28,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
    marginBottom: 5,
  },
  appTagline: {
    fontSize: 16,
    fontFamily: 'Cairo-Regular',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 15,
  },
  versionBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  versionText: {
    fontSize: 13,
    fontFamily: 'Cairo-Medium',
    color: '#fff',
  },
  descCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 10,
  },
  descCardDark: {
    backgroundColor: '#1a1a2e',
  },
  descText: {
    fontSize: 15,
    fontFamily: 'Cairo-Regular',
    color: '#333',
    lineHeight: 26,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 12,
  },
  featuresGrid: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuresGridDark: {
    backgroundColor: '#1a1a2e',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  featureItemDark: {
    borderBottomColor: '#2a2a3e',
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2f765915',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
    marginHorizontal: 15,
  },
  featureTitle: {
    fontSize: 15,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  featureDesc: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#999',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statsContainerDark: {
    backgroundColor: '#1a1a2e',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontFamily: 'Cairo-Bold',
    color: '#2f7659',
  },
  statLabel: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#eee',
  },
  statDividerDark: {
    backgroundColor: '#2a2a3e',
  },
  linksCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  linksCardDark: {
    backgroundColor: '#1a1a2e',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  linkItemDark: {
    borderBottomColor: '#2a2a3e',
  },
  linkIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkContent: {
    flex: 1,
    marginHorizontal: 15,
  },
  linkTitle: {
    fontSize: 15,
    fontFamily: 'Cairo-SemiBold',
    color: '#333',
  },
  linkSubtitle: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#999',
    marginTop: 2,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  creditsCardDark: {
    backgroundColor: '#1a1a2e',
  },
  creditItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  creditItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  creditItemBorderDark: {
    borderBottomColor: '#2a2a3e',
  },
  creditIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2f765915',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditContent: {
    flex: 1,
    marginHorizontal: 15,
  },
  creditName: {
    fontSize: 15,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  creditRole: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#999',
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    marginTop: 20,
  },
  footerText: {
    fontSize: 15,
    fontFamily: 'Cairo-Regular',
    color: '#666',
    marginBottom: 8,
  },
  copyright: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#999',
    marginBottom: 4,
  },
  buildInfo: {
    fontSize: 11,
    fontFamily: 'Cairo-Regular',
    color: '#ccc',
  },
  bottomSpace: {
    height: 100,
  },
});
