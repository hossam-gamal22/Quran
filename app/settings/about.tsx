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
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import Animated, { FadeInDown, FadeIn, useAnimatedStyle, useSharedValue, withSpring, withSequence } from 'react-native-reanimated';

import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useAppIdentity } from '@/hooks/use-app-identity';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';
import { useIsRTL } from '@/hooks/use-is-rtl';

// ========================================
// الثوابت
// ========================================

const APP_INFO = {
  email: 'hossamgamal290@gmail.com',
};

const FEATURES = [
  { icon: 'book-open-variant', titleKey: 'aboutApp.holyQuran', descKey: 'aboutApp.holyQuranDesc' },
  { icon: 'hands-pray', titleKey: 'aboutApp.adhkarAndDuas', descKey: 'aboutApp.adhkarAndDuasDesc' },
  { icon: 'mosque', titleKey: 'aboutApp.prayerTimesFeature', descKey: 'aboutApp.prayerTimesFeatureDesc' },
  { icon: 'calendar-check', titleKey: 'aboutApp.worshipTrackerFeature', descKey: 'aboutApp.worshipTrackerFeatureDesc' },
  { icon: 'bookmark-multiple', titleKey: 'aboutApp.khatmaSystem', descKey: 'aboutApp.khatmaSystemDesc' },
  { icon: 'widgets', titleKey: 'aboutApp.widgetFeature', descKey: 'aboutApp.widgetFeatureDesc' },
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
  const colors = useColors();
  const isRTL = useIsRTL();
  return (
    <TouchableOpacity
      style={[styles.linkItem, isDarkMode && styles.linkItemDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.7}
    >
      <View style={styles.linkIconBg}>
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
      </View>
      <View style={[styles.linkContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <Text style={[styles.linkTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.linkSubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{subtitle}</Text>
        )}
      </View>
      <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={24} color={isDarkMode ? '#666' : '#ccc'} />
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
  const colors = useColors();
  const isRTL = useIsRTL();
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).duration(400)}
      style={[styles.featureItem, isDarkMode && styles.featureItemDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
    >
      <View style={styles.featureIcon}>
        <MaterialCommunityIcons name={icon} size={24} color="#22C55E" />
      </View>
      <View style={[styles.featureContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <Text style={[styles.featureTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{title}</Text>
        <Text style={[styles.featureDesc, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{desc}</Text>
      </View>
    </Animated.View>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function AboutScreen() {
  const isRTL = useIsRTL();
  const { isDarkMode, t, settings } = useSettings();
  const colors = useColors();
  const { logoSource } = useAppIdentity();
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
    Linking.openURL(`mailto:${APP_INFO.email}?subject=${encodeURIComponent(t('aboutApp.emailSubject'))}`);
  };

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#11151c' : '#fff'}
      />

      {/* Header */}
      <UniversalHeader title={t('settings.about')} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* App Logo & Info */}
        <Animated.View entering={FadeInDown.delay(50).duration(500)}>
          <View
            style={[styles.heroCard, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.85)' : 'rgba(6,79,47,0.85)' }]}
          >
            <TouchableOpacity onPress={handleLogoTap} activeOpacity={0.9}>
              <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
                <Image source={logoSource} style={{ width: 70, height: 70, borderRadius: 16 }} />
              </Animated.View>
            </TouchableOpacity>
            <Text style={styles.appName}>{t('common.appName')}</Text>
            <Text style={styles.appTagline}>{t('aboutApp.subtitle')}</Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>
                {t('common.version')} {Constants.expoConfig?.version || Application.nativeApplicationVersion || '1.0.0'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <View style={[styles.descCard, isDarkMode && styles.descCardDark]}>
            <Text style={[styles.descText, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('aboutApp.description')}
            </Text>
          </View>
        </Animated.View>

        {/* Features */}
        <Animated.View entering={FadeIn.delay(150).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{t('aboutApp.features')}</Text>
          <View style={[styles.featuresGrid, isDarkMode && styles.featuresGridDark]}>
            {FEATURES.map((feature, index) => (
              <FeatureItem
                key={feature.titleKey}
                icon={feature.icon as any}
                title={t(feature.titleKey)}
                desc={t(feature.descKey)}
                index={index}
                isDarkMode={isDarkMode}
              />
            ))}
          </View>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{t('aboutApp.stats')}</Text>
          <View style={[styles.statsContainer, isDarkMode && styles.statsContainerDark]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>12</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>{t('settings.language')}</Text>
            </View>
            <View style={[styles.statDivider, isDarkMode && styles.statDividerDark]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>114</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>{t('quran.surah')}</Text>
            </View>
            <View style={[styles.statDivider, isDarkMode && styles.statDividerDark]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>100+</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>{t('home.azkarSection')}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Links */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{t('settings.support')}</Text>
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
          </View>
        </Animated.View>

        {/* Footer */}
        <Animated.View entering={FadeInDown.delay(350).duration(500)} style={styles.footer}>
          <Text style={[styles.copyright, { color: colors.textLight }]}>
            © {new Date().getFullYear()} {t('common.appName')}
          </Text>
        </Animated.View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
    </BackgroundWrapper>
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
    fontFamily: fontBold(),
    color: '#fff',
    marginBottom: 5,
  },
  appTagline: {
    fontSize: 16,
    fontFamily: fontRegular(),
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
    fontFamily: fontMedium(),
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
    fontFamily: fontRegular(),
    color: '#333',
    lineHeight: 26,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: fontBold(),
    color: '#8E8E93',
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
    backgroundColor: '#22C55E15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
    marginHorizontal: 15,
  },
  featureTitle: {
    fontSize: 15,
    fontFamily: fontBold(),
    color: '#333',
  },
  featureDesc: {
    fontSize: 12,
    fontFamily: fontRegular(),
    color: '#8E8E93',
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
    fontFamily: fontBold(),
    color: '#22C55E',
  },
  statLabel: {
    fontSize: 13,
    fontFamily: fontRegular(),
    color: '#8E8E93',
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
    fontFamily: fontSemiBold(),
    color: '#333',
  },
  linkSubtitle: {
    fontSize: 12,
    fontFamily: fontRegular(),
    color: '#8E8E93',
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
    backgroundColor: '#22C55E15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditContent: {
    flex: 1,
    marginHorizontal: 15,
  },
  creditName: {
    fontSize: 15,
    fontFamily: fontBold(),
    color: '#333',
  },
  creditRole: {
    fontSize: 12,
    fontFamily: fontRegular(),
    color: '#8E8E93',
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    marginTop: 20,
  },
  footerText: {
    fontSize: 15,
    fontFamily: fontRegular(),
    color: '#8E8E93',
    marginBottom: 8,
  },
  copyright: {
    fontSize: 12,
    fontFamily: fontRegular(),
    color: '#8E8E93',
    marginBottom: 4,
  },
  buildInfo: {
    fontSize: 11,
    fontFamily: fontRegular(),
    color: '#ccc',
  },
  bottomSpace: {
    height: 100,
  },
});
