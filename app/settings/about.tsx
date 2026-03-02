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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Application from 'expo-application';
import Animated, { FadeInDown, FadeIn, useAnimatedStyle, useSharedValue, withSpring, withSequence } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useSettings } from '@/contexts/SettingsContext';

// ========================================
// الثوابت
// ========================================

const APP_INFO = {
  name: 'روح المسلم',
  tagline: 'رفيقك الروحي اليومي',
  description: 'تطبيق إسلامي شامل يهدف إلى مساعدة المسلمين في أداء عباداتهم اليومية والتقرب إلى الله.',
  developer: 'فريق روح المسلم',
  email: 'support@roohmuslim.app',
  website: 'https://roohmuslim.app',
  privacy: 'https://roohmuslim.app/privacy',
  terms: 'https://roohmuslim.app/terms',
  twitter: 'https://twitter.com/roohmuslim',
  instagram: 'https://instagram.com/roohmuslim',
  telegram: 'https://t.me/roohmuslim',
};

const FEATURES = [
  { icon: 'book-open-variant', title: 'القرآن الكريم', desc: 'قراءة واستماع مع التفسير' },
  { icon: 'hands-pray', title: 'الأذكار والأدعية', desc: 'أذكار الصباح والمساء والمناسبات' },
  { icon: 'mosque', title: 'مواقيت الصلاة', desc: 'تنبيهات دقيقة حسب موقعك' },
  { icon: 'calendar-check', title: 'متتبع العبادات', desc: 'تتبع صلاتك وصيامك وأذكارك' },
  { icon: 'bookmark-multiple', title: 'نظام الختمات', desc: 'إنشاء وإدارة ختمات القرآن' },
  { icon: 'widgets', title: 'ويدجت', desc: 'ويدجت للشاشة الرئيسية' },
];

const TEAM = [
  { name: 'التطوير', role: 'فريق التطوير التقني' },
  { name: 'المحتوى', role: 'مراجعة شرعية ولغوية' },
  { name: 'التصميم', role: 'واجهة المستخدم والتجربة' },
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
      <View style={[styles.linkIconBg, { backgroundColor: `${iconColor}15` }]}>
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.linkContent}>
        <Text style={[styles.linkTitle, isDarkMode && styles.textLight]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.linkSubtitle, isDarkMode && styles.textMuted]}>{subtitle}</Text>
        )}
      </View>
      <MaterialCommunityIcons name="chevron-left" size={24} color={isDarkMode ? '#666' : '#ccc'} />
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
  const { isDarkMode } = useSettings();
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

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

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
          <MaterialCommunityIcons name="arrow-right" size={28} color={isDarkMode ? '#fff' : '#333'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>عن التطبيق</Text>
        <View style={styles.headerPlaceholder} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* App Logo & Info */}
        <Animated.View entering={FadeInDown.delay(50).duration(500)}>
          <LinearGradient
            colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#2f7659', '#1d4a3a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <TouchableOpacity onPress={handleLogoTap} activeOpacity={0.9}>
              <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
                <MaterialCommunityIcons name="moon-waning-crescent" size={50} color="#fff" />
              </Animated.View>
            </TouchableOpacity>
            <Text style={styles.appName}>{APP_INFO.name}</Text>
            <Text style={styles.appTagline}>{APP_INFO.tagline}</Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>
                الإصدار {Application.nativeApplicationVersion || '1.0.0'}
              </Text>
            </View>
          </LinearGradient>
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
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>مميزات التطبيق</Text>
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
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>إحصائيات</Text>
          <View style={[styles.statsContainer, isDarkMode && styles.statsContainerDark]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, isDarkMode && styles.textLight]}>12</Text>
              <Text style={[styles.statLabel, isDarkMode && styles.textMuted]}>لغة مدعومة</Text>
            </View>
            <View style={[styles.statDivider, isDarkMode && styles.statDividerDark]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, isDarkMode && styles.textLight]}>114</Text>
              <Text style={[styles.statLabel, isDarkMode && styles.textMuted]}>سورة</Text>
            </View>
            <View style={[styles.statDivider, isDarkMode && styles.statDividerDark]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, isDarkMode && styles.textLight]}>100+</Text>
              <Text style={[styles.statLabel, isDarkMode && styles.textMuted]}>ذكر ودعاء</Text>
            </View>
          </View>
        </Animated.View>

        {/* Links */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>روابط</Text>
          <View style={[styles.linksCard, isDarkMode && styles.linksCardDark]}>
            <LinkItem
              icon="web"
              iconColor="#2f7659"
              title="الموقع الرسمي"
              subtitle={APP_INFO.website}
              onPress={() => openLink(APP_INFO.website)}
              isDarkMode={isDarkMode}
            />
            <LinkItem
              icon="email"
              iconColor="#3a7ca5"
              title="تواصل معنا"
              subtitle={APP_INFO.email}
              onPress={openEmail}
              isDarkMode={isDarkMode}
            />
            <LinkItem
              icon="shield-check"
              iconColor="#5d4e8c"
              title="سياسة الخصوصية"
              onPress={() => openLink(APP_INFO.privacy)}
              isDarkMode={isDarkMode}
            />
            <LinkItem
              icon="file-document"
              iconColor="#c17f59"
              title="شروط الاستخدام"
              onPress={() => openLink(APP_INFO.terms)}
              isDarkMode={isDarkMode}
            />
          </View>
        </Animated.View>

        {/* Social */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>تابعنا</Text>
          <View style={styles.socialContainer}>
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: '#1DA1F2' }]}
              onPress={() => openLink(APP_INFO.twitter)}
            >
              <MaterialCommunityIcons name="twitter" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: '#E4405F' }]}
              onPress={() => openLink(APP_INFO.instagram)}
            >
              <MaterialCommunityIcons name="instagram" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: '#0088CC' }]}
              onPress={() => openLink(APP_INFO.telegram)}
            >
              <MaterialCommunityIcons name="telegram" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Credits */}
        <Animated.View entering={FadeInDown.delay(350).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>الفريق</Text>
          <View style={[styles.creditsCard, isDarkMode && styles.creditsCardDark]}>
            {TEAM.map((member, index) => (
              <View
                key={member.name}
                style={[
                  styles.creditItem,
                  index < TEAM.length - 1 && styles.creditItemBorder,
                  isDarkMode && styles.creditItemBorderDark,
                ]}
              >
                <View style={styles.creditIcon}>
                  <MaterialCommunityIcons
                    name={
                      member.name === 'التطوير'
                        ? 'code-tags'
                        : member.name === 'المحتوى'
                        ? 'book-open-page-variant'
                        : 'palette'
                    }
                    size={20}
                    color="#2f7659"
                  />
                </View>
                <View style={styles.creditContent}>
                  <Text style={[styles.creditName, isDarkMode && styles.textLight]}>
                    {member.name}
                  </Text>
                  <Text style={[styles.creditRole, isDarkMode && styles.textMuted]}>
                    {member.role}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Footer */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.footer}>
          <Text style={[styles.footerText, isDarkMode && styles.textMuted]}>
            صُنع بـ ❤️ لخدمة المسلمين
          </Text>
          <Text style={[styles.copyright, isDarkMode && styles.textMuted]}>
            © {new Date().getFullYear()} {APP_INFO.name}. جميع الحقوق محفوظة.
          </Text>
          <Text style={[styles.buildInfo, isDarkMode && styles.textMuted]}>
            Build {Application.nativeBuildVersion || '1'} • {Application.applicationId || 'com.roohmuslim.app'}
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
