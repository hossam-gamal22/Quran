// app/admin/index.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { adminService } from '../../services/adminService';
import { AppStats, AppSettings, AdSettings } from '../../types/admin';

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

  const menuItems: MenuItem[] = [
    {
      id: 'settings',
      title: 'إعدادات التطبيق',
      icon: 'settings',
      route: '/admin/settings',
      color: '#3B82F6',
      description: 'الصيانة، التحديثات، الإعدادات العامة',
    },
    {
      id: 'ads',
      title: 'الإعلانات',
      icon: 'megaphone',
      route: '/admin/ads',
      color: '#F59E0B',
      description: 'تفعيل/تعطيل الإعلانات وإعداداتها',
    },
    {
      id: 'pricing',
      title: 'الأسعار',
      icon: 'cash',
      route: '/admin/pricing',
      color: '#22C55E',
      description: 'أسعار الاشتراكات حسب البلد',
    },
    {
      id: 'content',
      title: 'المحتوى',
      icon: 'document-text',
      route: '/admin/content',
      color: '#8B5CF6',
      description: 'آية اليوم، الإعلانات، النصائح',
    },
    {
      id: 'notifications',
      title: 'الإشعارات',
      icon: 'notifications',
      route: '/admin/notifications',
      color: '#EC4899',
      description: 'إرسال إشعارات للمستخدمين',
    },
    {
      id: 'reciters',
      title: 'القراء',
      icon: 'mic',
      route: '/admin/reciters',
      color: '#06B6D4',
      description: 'إدارة قائمة القراء',
    },
    {
      id: 'subscribers',
      title: 'المشتركين',
      icon: 'people',
      route: '/admin/subscribers',
      color: '#EF4444',
      description: 'عرض وإدارة المشتركين',
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
      Alert.alert('خطأ', 'فشل في تحميل البيانات');
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
        'تم',
        newValue ? 'تم تفعيل وضع الصيانة' : 'تم إلغاء وضع الصيانة'
      );
    }
  };

  const toggleAds = async () => {
    if (!adSettings) return;
    
    const newValue = !adSettings.adsEnabled;
    const success = await adminService.updateAdSettings({
      adsEnabled: newValue,
    });
    
    if (success) {
      setAdSettings({ ...adSettings, adsEnabled: newValue });
      Alert.alert(
        'تم',
        newValue ? 'تم تفعيل الإعلانات' : 'تم تعطيل الإعلانات'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>لوحة التحكم</Text>
          <Text style={styles.headerSubtitle}>رُوح المسلم</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color={Colors.primary} />
            <Text style={styles.statNumber}>{stats?.premiumUsers || 0}</Text>
            <Text style={styles.statLabel}>مشترك</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cash" size={24} color={Colors.success} />
            <Text style={styles.statNumber}>${stats?.totalRevenue || 0}</Text>
            <Text style={styles.statLabel}>إجمالي الأرباح</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="today" size={24} color={Colors.warning} />
            <Text style={styles.statNumber}>${stats?.todayRevenue || 0}</Text>
            <Text style={styles.statLabel}>أرباح اليوم</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>إجراءات سريعة</Text>
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
                {appSettings?.maintenanceMode ? 'إلغاء الصيانة' : 'وضع الصيانة'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                !adSettings?.adsEnabled && styles.actionBtnActive,
              ]}
              onPress={toggleAds}
            >
              <Ionicons
                name="megaphone"
                size={24}
                color={!adSettings?.adsEnabled ? Colors.textLight : Colors.primary}
              />
              <Text
                style={[
                  styles.actionBtnText,
                  !adSettings?.adsEnabled && styles.actionBtnTextActive,
                ]}
              >
                {adSettings?.adsEnabled ? 'تعطيل الإعلانات' : 'تفعيل الإعلانات'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>الإدارة</Text>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
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
    marginLeft: Spacing.md,
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
