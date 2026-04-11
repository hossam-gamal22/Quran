// app/dev/icon-test.tsx
// صفحة اختبار الأيقونات - للتحقق من أن جميع الأيقونات تعمل بشكل صحيح
// ================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useSettings } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const ICON_SIZE = 28;
const SMALL_ICON_SIZE = 22;

// ================================================================
// قائمة الأيقونات المستخدمة في التطبيق
// ================================================================

// MaterialCommunityIcons - الأكثر استخداماً
const MATERIAL_ICONS = [
  // Navigation & Actions
  'home', 'home-variant', 'home-variant-outline',
  'arrow-left', 'arrow-right', 'chevron-left', 'chevron-right', 'chevron-down', 'chevron-up',
  'close', 'check', 'check-circle', 'plus', 'minus',
  
  // Quran & Islamic
  'book-open-variant', 'book-open-page-variant', 'book-outline', 'bookmark', 'bookmark-outline',
  'mosque', 'star-crescent',
  'hands-pray', 'hand-heart', 'meditation',
  
  // Prayer
  'weather-sunset-up', 'weather-sunset-down', 'weather-sunny', 'white-balance-sunny',
  'moon-full', 'moon-waning-crescent',
  
  // Tab Bar
  'counter', 'cog', 'cog-outline',
  
  // Settings
  'translate', 'palette', 'bell', 'bell-outline', 'volume-high',
  'backup-restore', 'share-variant', 'information-outline',
  
  // Azkar & Worship
  'sleep', 'power-sleep', 'alarm',
  'heart', 'heart-outline', 'star', 'star-outline',
  'shield-check', 'shield-outline',
  
  // Content
  'play', 'pause', 'stop', 'skip-next', 'skip-previous',
  'repeat', 'shuffle', 'volume-off',
  
  // Actions
  'magnify', 'filter', 'sort', 'refresh', 'sync',
  'content-copy', 'delete', 'pencil', 'eye', 'eye-off',
  
  // Calendar & Time
  'calendar', 'calendar-today', 'clock-outline', 'timer-sand',
  
  // Misc
  'compass', 'compass-outline', 'map-marker', 'navigation',
  'help-circle-outline', 'alert-circle-outline',
  'format-list-bulleted', 'view-grid', 'dots-vertical',
  'account', 'account-outline', 'account-circle',
  'download', 'upload', 'cloud-download', 'cloud-upload',
  'wifi', 'wifi-off', 'bluetooth', 'cellphone',
  'image', 'camera', 'microphone',
  'lock', 'lock-open', 'key',
  'email', 'phone', 'message',
  'folder', 'file-document', 'file-pdf-box',
  'link', 'web', 'earth',
  'flash', 'flashlight', 'lightbulb',
  'trophy', 'medal', 'crown',
  'emoticon-happy', 'emoticon-sad',
];

// Ionicons - للنظام والملاحة
const IONICONS = [
  // Navigation
  'chevron-back', 'chevron-forward', 'arrow-back', 'arrow-forward',
  'close', 'close-circle', 'checkmark', 'checkmark-circle',
  'add', 'remove',
  
  // Tab Bar & System
  'home', 'home-outline', 'settings', 'settings-outline',
  'book', 'book-outline', 'search',
  'notifications', 'notifications-outline',
  
  // Media
  'play', 'pause', 'stop', 'volume-high', 'volume-mute',
  
  // Weather
  'sunny', 'sunny-outline', 'moon', 'moon-outline',
  'cloud', 'partly-sunny', 'rainy',
  
  // Actions
  'share', 'share-social', 'share-outline',
  'heart', 'heart-outline', 'star', 'star-outline',
  'bookmark', 'bookmark-outline',
  'trash', 'create', 'pencil',
  'copy', 'clipboard',
  
  // Status
  'information-circle', 'alert-circle', 'help-circle',
  'checkmark-done', 'close-circle',
  
  // General
  'person', 'people', 'globe-outline',
  'calendar', 'time', 'alarm',
  'location', 'compass', 'navigate',
  'camera', 'image', 'images',
  'document', 'folder', 'download',
  'wifi', 'bluetooth', 'cellular',
  'lock-closed', 'lock-open', 'key',
  'mail', 'call', 'chatbubble',
  'link', 'globe',
  'refresh', 'sync',
  'grid', 'list', 'menu',
  'ellipsis-horizontal', 'ellipsis-vertical',
];

// FontAwesome5 - استخدام محدود
const FONTAWESOME_ICONS = [
  'bed',
  'praying-hands',
  'book-open',
];

// SF Symbols mapping للـ iOS (مع Ionicons fallback للأندرويد)
const SF_SYMBOL_ICONS = [
  { sf: 'book.fill', name: 'book.fill' },
  { sf: 'gearshape.fill', name: 'gearshape.fill' },
  { sf: 'house.fill', name: 'house.fill' },
  { sf: 'magnifyingglass', name: 'magnifyingglass' },
  { sf: 'bell.fill', name: 'bell.fill' },
  { sf: 'heart.fill', name: 'heart.fill' },
  { sf: 'star.fill', name: 'star.fill' },
  { sf: 'chevron.left', name: 'chevron.left' },
  { sf: 'chevron.right', name: 'chevron.right' },
  { sf: 'xmark', name: 'xmark' },
  { sf: 'plus', name: 'plus' },
  { sf: 'checkmark', name: 'checkmark' },
  { sf: 'globe', name: 'globe' },
  { sf: 'moon.fill', name: 'moon.fill' },
  { sf: 'sun.max.fill', name: 'sun.max.fill' },
];

// ================================================================
// مكون عرض الأيقونة مع معالجة الأخطاء
// ================================================================

interface IconDisplayProps {
  name: string;
  library: 'material' | 'ionicons' | 'fontawesome' | 'sf';
  color: string;
  bgColor: string;
}

function IconDisplay({ name, library, color, bgColor }: IconDisplayProps) {
  const [hasError, setHasError] = useState(false);

  const renderIcon = () => {
    try {
      switch (library) {
        case 'material':
          return <MaterialCommunityIcons name={name as any} size={ICON_SIZE} color={color} />;
        case 'ionicons':
          return <Ionicons name={name as any} size={ICON_SIZE} color={color} />;
        case 'fontawesome':
          return <FontAwesome5 name={name as any} size={SMALL_ICON_SIZE} color={color} />;
        case 'sf':
          return <IconSymbol name={name} size={ICON_SIZE} color={color} />;
        default:
          return null;
      }
    } catch (e) {
      setHasError(true);
      return null;
    }
  };

  return (
    <View style={[styles.iconItem, { backgroundColor: bgColor }]}>
      {hasError ? (
        <View style={styles.errorIcon}>
          <Text style={styles.errorText}>⚠️</Text>
        </View>
      ) : (
        <View style={styles.iconWrapper}>
          {renderIcon()}
        </View>
      )}
      <Text 
        style={[styles.iconName, { color }]} 
        numberOfLines={1}
        ellipsizeMode="middle"
      >
        {name}
      </Text>
      {hasError && (
        <Text style={styles.errorLabel}>ERROR</Text>
      )}
    </View>
  );
}

// ================================================================
// الشاشة الرئيسية
// ================================================================

export default function IconTestScreen() {
  const colors = useColors();
  const { isDarkMode } = useSettings();
  const isRTL = useIsRTL();
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    material: true,
    ionicons: false,
    fontawesome: false,
    sf: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const bgColor = isDarkMode ? 'rgba(40,40,45,0.5)' : 'rgba(255,255,255,0.3)';

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons 
              name={isRTL ? 'chevron-right' : 'chevron-left'} 
              size={28} 
              color={colors.text} 
            />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            اختبار الأيقونات
          </Text>
          <View style={styles.backButton} />
        </View>

        {/* Info */}
        <GlassCard style={styles.infoCard}>
          <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="cellphone" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Platform: {Platform.OS} ({Platform.Version})
            </Text>
          </View>
          <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="package-variant" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Total Icons: {MATERIAL_ICONS.length + IONICONS.length + FONTAWESOME_ICONS.length + SF_SYMBOL_ICONS.length}
            </Text>
          </View>
        </GlassCard>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* MaterialCommunityIcons Section */}
          <TouchableOpacity onPress={() => toggleSection('material')}>
            <GlassCard style={styles.sectionHeader}>
              <View style={[styles.sectionHeaderContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons name="material-design" size={24} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  MaterialCommunityIcons ({MATERIAL_ICONS.length})
                </Text>
                <MaterialCommunityIcons 
                  name={expandedSections.material ? 'chevron-up' : 'chevron-down'} 
                  size={24} 
                  color={colors.text} 
                />
              </View>
            </GlassCard>
          </TouchableOpacity>
          {expandedSections.material && (
            <View style={styles.iconGrid}>
              {MATERIAL_ICONS.map(icon => (
                <IconDisplay 
                  key={`material-${icon}`}
                  name={icon}
                  library="material"
                  color={colors.text}
                  bgColor={bgColor}
                />
              ))}
            </View>
          )}

          {/* Ionicons Section */}
          <TouchableOpacity onPress={() => toggleSection('ionicons')}>
            <GlassCard style={styles.sectionHeader}>
              <View style={[styles.sectionHeaderContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="logo-ionic" size={24} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Ionicons ({IONICONS.length})
                </Text>
                <MaterialCommunityIcons 
                  name={expandedSections.ionicons ? 'chevron-up' : 'chevron-down'} 
                  size={24} 
                  color={colors.text} 
                />
              </View>
            </GlassCard>
          </TouchableOpacity>
          {expandedSections.ionicons && (
            <View style={styles.iconGrid}>
              {IONICONS.map(icon => (
                <IconDisplay 
                  key={`ionicons-${icon}`}
                  name={icon}
                  library="ionicons"
                  color={colors.text}
                  bgColor={bgColor}
                />
              ))}
            </View>
          )}

          {/* FontAwesome5 Section */}
          <TouchableOpacity onPress={() => toggleSection('fontawesome')}>
            <GlassCard style={styles.sectionHeader}>
              <View style={[styles.sectionHeaderContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <FontAwesome5 name="font-awesome" size={22} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  FontAwesome5 ({FONTAWESOME_ICONS.length})
                </Text>
                <MaterialCommunityIcons 
                  name={expandedSections.fontawesome ? 'chevron-up' : 'chevron-down'} 
                  size={24} 
                  color={colors.text} 
                />
              </View>
            </GlassCard>
          </TouchableOpacity>
          {expandedSections.fontawesome && (
            <View style={styles.iconGrid}>
              {FONTAWESOME_ICONS.map(icon => (
                <IconDisplay 
                  key={`fa-${icon}`}
                  name={icon}
                  library="fontawesome"
                  color={colors.text}
                  bgColor={bgColor}
                />
              ))}
            </View>
          )}

          {/* SF Symbols / IconSymbol Section */}
          <TouchableOpacity onPress={() => toggleSection('sf')}>
            <GlassCard style={styles.sectionHeader}>
              <View style={[styles.sectionHeaderContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons name="apple" size={24} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  SF Symbols / IconSymbol ({SF_SYMBOL_ICONS.length})
                </Text>
                <MaterialCommunityIcons 
                  name={expandedSections.sf ? 'chevron-up' : 'chevron-down'} 
                  size={24} 
                  color={colors.text} 
                />
              </View>
              <Text style={[styles.sectionSubtitle, { color: colors.textLight }]}>
                iOS: SF Symbols | Android: Ionicons fallback
              </Text>
            </GlassCard>
          </TouchableOpacity>
          {expandedSections.sf && (
            <View style={styles.iconGrid}>
              {SF_SYMBOL_ICONS.map(icon => (
                <IconDisplay 
                  key={`sf-${icon.name}`}
                  name={icon.name}
                  library="sf"
                  color={colors.text}
                  bgColor={bgColor}
                />
              ))}
            </View>
          )}

          {/* Bottom Padding */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

// ================================================================
// الأنماط
// ================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Cairo-Bold',
  },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
  },
  infoRow: {
    alignItems: 'center',
    gap: 8,
    marginVertical: 2,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    marginVertical: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    marginBottom: 12,
    padding: 12,
  },
  sectionHeaderContent: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Cairo-SemiBold',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    marginTop: 4,
    textAlign: 'center',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 16,
    gap: 8,
  },
  iconItem: {
    width: (width - 48) / 4 - 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconName: {
    fontSize: 9,
    marginTop: 4,
    textAlign: 'center',
    fontFamily: 'Cairo-Regular',
  },
  errorIcon: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 24,
  },
  errorLabel: {
    fontSize: 8,
    color: '#FF3B30',
    fontWeight: 'bold',
    marginTop: 2,
  },
});
