// app/settings/about.tsx
// صفحة عن التطبيق - روح المسلم

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import Animated, { FadeInDown, FadeIn, useAnimatedStyle, useSharedValue, withSpring, withSequence } from 'react-native-reanimated';

import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { fetchAppConfig } from '@/lib/app-config-api';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { showOfflineModal } from '@/components/ui/OfflineBanner';
import { useAppIdentity } from '@/hooks/use-app-identity';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';
import { useIsRTL } from '@/hooks/use-is-rtl';

// ========================================
// الثوابت
// ========================================

const APP_INFO = {
  email: 'hossamgamal290@gmail.com',
  website: 'https://roohmuslim.com',
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
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  return (
    <TouchableOpacity
      style={[styles.linkItem, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
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
        <Text style={[styles.linkTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.linkSubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{subtitle}</Text>
        )}
      </View>
      <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={24} color={colors.textLight} />
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
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).duration(400)}
      style={[styles.featureItem, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
    >
      <View style={styles.featureIcon}>
        <MaterialCommunityIcons name={icon} size={24} color="#0d8e62" />
      </View>
      <View style={[styles.featureContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <Text style={[styles.featureTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{title}</Text>
        <Text style={[styles.featureDesc, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{desc}</Text>
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
  const styles = useScaledStyles(_styles, colors.fs);
  const { logoSource } = useAppIdentity();
  const [tapCount, setTapCount] = useState(0);
  const logoScale = useSharedValue(1);
  const [contactEmail, setContactEmail] = useState(APP_INFO.email);
  const [contactWebsite, setContactWebsite] = useState(APP_INFO.website);

  useEffect(() => {
    fetchAppConfig().then(config => {
      if (config.contact?.email) setContactEmail(config.contact.email);
      if (config.contact?.website) setContactWebsite(config.contact.website);
    }).catch(() => {
      showOfflineModal();
    });
  }, []);

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
    Linking.openURL(`mailto:${contactEmail}?subject=${encodeURIComponent(t('aboutApp.emailSubject'))}`).catch(() => {
      Alert.alert(t('common.error'), t('messages.networkError'));
    });
  };

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top']}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

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
                {t('common.version')} {Constants.expoConfig?.version || Application.nativeApplicationVersion || '1.2.0'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <View style={[styles.descCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.descText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('aboutApp.description')}
            </Text>
          </View>
        </Animated.View>

        {/* Features */}
        <Animated.View entering={FadeIn.delay(150).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('aboutApp.features')}</Text>
          <View style={[styles.featuresGrid, { backgroundColor: colors.card }]}>
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
          <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('aboutApp.stats')}</Text>
          <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>12</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>{t('settings.language')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>114</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>{t('quran.surah')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>100+</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>{t('home.azkarSection')}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Links */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('settings.support')}</Text>
          <View style={[styles.linksCard, { backgroundColor: colors.card }]}>
            <LinkItem
              icon="email"
              iconColor="#3a7ca5"
              title={t('settings.contactUs')}
              subtitle={contactEmail}
              onPress={openEmail}
              isDarkMode={isDarkMode}
            />
            <LinkItem
              icon="web"
              iconColor="#0d8e62"
              title={t('aboutApp.website') || 'الموقع الإلكتروني'}
              subtitle={contactWebsite}
              onPress={() => Linking.openURL(contactWebsite).catch(() => {
                Alert.alert(t('common.error'), t('messages.networkError'));
              })}
              isDarkMode={isDarkMode}
            />
            <LinkItem
              icon="facebook"
              iconColor="#1877F2"
              title="Facebook"
              onPress={() => Linking.openURL('https://www.facebook.com/HossamGamal59/').catch(() => {
                Alert.alert(t('common.error'), t('messages.networkError'));
              })}
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

const _styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 10,
  },
  descText: {
    fontSize: 15,
    fontFamily: fontRegular(),
    lineHeight: 26,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: fontBold(),
    marginTop: 20,
    marginBottom: 12,
  },
  featuresGrid: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0d8e6215',
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
  },
  featureDesc: {
    fontSize: 12,
    fontFamily: fontRegular(),
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontFamily: fontBold(),
    color: '#0d8e62',
  },
  statLabel: {
    fontSize: 13,
    fontFamily: fontRegular(),
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  linksCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
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
  },
  linkSubtitle: {
    fontSize: 12,
    fontFamily: fontRegular(),
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
    borderRadius: 16,
    overflow: 'hidden',
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
  creditIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0d8e6215',
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
  },
  creditRole: {
    fontSize: 12,
    fontFamily: fontRegular(),
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
    marginBottom: 8,
  },
  copyright: {
    fontSize: 12,
    fontFamily: fontRegular(),
    marginBottom: 4,
  },
  buildInfo: {
    fontSize: 11,
    fontFamily: fontRegular(),
  },
  bottomSpace: {
    height: 100,
  },
});
