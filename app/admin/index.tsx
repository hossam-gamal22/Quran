// app/admin/index.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { adminService } from '../../services/adminService';
import { AppStats, AppSettings, AdSettings } from '../../types/admin';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { t } from '@/lib/i18n';
interface MenuItem {
  id: string;
  title: string;
  icon: string;
  route: string;
  color: string;
  description: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AppStats | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isRTL = useIsRTL();

  const menuItems: MenuItem[] = [
    {
      id: 'settings',
      title: t('admin.appSettings'),
      icon: 'settings',
      route: '/admin/settings',
      color: '#3B82F6',
      description: t('admin.appSettingsDesc'),
    },
    {
      id: 'ads',
      title: t('admin.adsTitle'),
      icon: 'megaphone',
      route: '/admin/ads',
      color: '#F59E0B',
      description: t('admin.adsDesc'),
    },
    {
      id: 'pricing',
      title: t('admin.pricingTitle'),
      icon: 'cash',
      route: '/admin/pricing',
      color: '#22C55E',
      description: t('admin.pricingDesc'),
    },
    {
      id: 'content',
      title: t('admin.contentTitle'),
      icon: 'document-text',
      route: '/admin/content',
      color: '#8B5CF6',
      description: t('admin.contentDesc'),
    },
    {
      id: 'notifications',
      title: t('admin.notificationsTitle'),
      icon: 'notifications',
      route: '/admin/notifications',
      color: '#EC4899',
      description: t('admin.notificationsDesc'),
    },
    {
      id: 'reciters',
      title: t('admin.recitersTitle'),
      icon: 'mic',
      route: '/admin/reciters',
      color: '#06B6D4',
      description: t('admin.recitersDesc'),
    },
    {
      id: 'subscribers',
      title: t('admin.subscribersTitle'),
      icon: 'people',
      route: '/admin/subscribers',
      color: '#EF4444',
      description: t('admin.subscribersDesc'),
    },
    {
      id: 'events',
      title: 'المناسبات الإسلامية',
      icon: 'calendar',
      route: '/admin/events',
      color: '#10B981',
      description: 'إدارة المناسبات والأحداث الإسلامية',
    },
    {
      id: 'daily-content',
      title: 'المحتوى اليومي',
      icon: 'today',
      route: '/admin/daily-content',
      color: '#6366F1',
      description: 'التحكم في آية اليوم والحديث والدعاء',
    },
    {
      id: 'users',
      title: 'إدارة المستخدمين',
      icon: 'person-circle',
      route: '/admin/users',
      color: '#14B8A6',
      description: 'عرض وإدارة المستخدمين والصلاحيات',
    },
    {
      id: 'settings-override',
      title: 'تجاوز الإعدادات',
      icon: 'options',
      route: '/admin/settings-override',
      color: '#F97316',
      description: 'التحكم في الميزات وإعدادات التجاوز',
    },
    {
      id: 'app-sections',
      title: 'أقسام التطبيق',
      icon: 'layers',
      route: '/admin/app-sections',
      color: '#A855F7',
      description: 'التحكم في ظهور وترتيب أقسام التطبيق',
    },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [statsData, settingsData, adsData] = await Promise.all([
        adminService.getStats(),
        adminService.getAppSettings(),
        adminService.getAdSettings(),
      ]);
      setStats(statsData);
      setAppSettings(settingsData);
      setAdSettings(adsData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(t('common.error'), t('admin.loadDataFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const toggleMaintenance = async () => {
    if (!appSettings) return;
    
    const newValue = !appSettings.maintenanceMode;
    const success = await adminService.updateAppSettings({
      maintenanceMode: newValue,
    });
    
    if (success) {
      setAppSettings({ ...appSettings, maintenanceMode: newValue });
      Alert.alert(
        t('common.done'),
        newValue ? t('admin.maintenanceEnabled') : t('admin.maintenanceDisabled')
      );
    }
  };

  const toggleAds = async () => {
    if (!adSettings) return;
    
    const newValue = !adSettings.enabled;
    const success = await adminService.updateAdSettings({
      enabled: newValue,
    });
    
    if (success) {
      setAdSettings({ ...adSettings, enabled: newValue });
      Alert.alert(
        t('common.done'),
        newValue ? t('admin.adsEnabled') : t('admin.adsDisabled')
      );
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('admin.dashboard')}</Text>
          <Text style={styles.headerSubtitle}>{t('common.appName')}</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color={Colors.primary} />
            <Text style={styles.statNumber}>{stats?.premiumUsers || 0}</Text>
            <Text style={styles.statLabel}>{t('admin.subscriber')}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cash" size={24} color={Colors.success} />
            <Text style={styles.statNumber}>${stats?.totalRevenue || 0}</Text>
            <Text style={styles.statLabel}>{t('admin.totalRevenue')}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="today" size={24} color={Colors.warning} />
            <Text style={styles.statNumber}>${stats?.todayRevenue || 0}</Text>
            <Text style={styles.statLabel}>{t('admin.todayRevenue')}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>{t('admin.quickActions')}</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                appSettings?.maintenanceMode && styles.actionBtnActive,
              ]}
              onPress={toggleMaintenance}
            >
              <Ionicons
                name="construct"
                size={24}
                color={appSettings?.maintenanceMode ? Colors.textLight : Colors.warning}
              />
              <Text
                style={[
                  styles.actionBtnText,
                  appSettings?.maintenanceMode && styles.actionBtnTextActive,
                ]}
              >
                {appSettings?.maintenanceMode ? t('admin.maintenanceDisable') : t('admin.maintenanceEnable')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                !adSettings?.enabled && styles.actionBtnActive,
              ]}
              onPress={toggleAds}
            >
              <Ionicons
                name="megaphone"
                size={24}
                color={!adSettings?.enabled ? Colors.textLight : Colors.primary}
              />
              <Text
                style={[
                  styles.actionBtnText,
                  !adSettings?.enabled && styles.actionBtnTextActive,
                ]}
              >
                {adSettings?.enabled ? t('admin.adsDisable') : t('admin.adsEnable')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>{t('admin.management')}</Text>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>
            الإصدار: {appSettings?.appVersion || '1.0.0'}
          </Text>
          <Text style={styles.appInfoText}>
            الحالة: {appSettings?.maintenanceMode ? 'صيانة' : 'يعمل'}
          </Text>
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primaryDark,
    padding: Spacing.xl,
    paddingTop: Spacing.xxl,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.accent,
    marginTop: Spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  quickActions: {
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionBtnActive: {
    backgroundColor: Colors.primary,
  },
  actionBtnText: {
    fontSize: 12,
    color: Colors.text,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  actionBtnTextActive: {
    color: Colors.textLight,
  },
  menuContainer: {
    padding: Spacing.md,
  },
  menuItem: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    gap: Spacing.md,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  menuDescription: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  appInfo: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  appInfoText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
