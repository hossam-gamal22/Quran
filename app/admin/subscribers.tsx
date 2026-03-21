// app/admin/subscribers.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { adminService } from '../../services/adminService';
import { Subscriber, AppStats } from '../../types/admin';
import { t } from '@/lib/i18n';

import { useIsRTL } from '@/hooks/use-is-rtl';
export default function SubscribersScreen() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<AppStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [subscribersData, statsData] = await Promise.all([
        adminService.getSubscribers(),
        adminService.getStats(),
      ]);
      setSubscribers(subscribersData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredSubscribers = subscribers.filter((sub) => {
    if (filter === 'all') return true;
    if (filter === 'active') return sub.isActive;
    if (filter === 'expired') return !sub.isActive;
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color={Colors.primary} />
          <Text style={styles.statNumber}>{stats?.premiumUsers || 0}</Text>
          <Text style={styles.statLabel}>{t('admin.totalSubscribers')}</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="cash" size={24} color={Colors.success} />
          <Text style={styles.statNumber}>${stats?.totalRevenue || 0}</Text>
          <Text style={styles.statLabel}>{t('admin.totalRevenue')}</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="trending-up" size={24} color={Colors.warning} />
          <Text style={styles.statNumber}>${stats?.todayRevenue || 0}</Text>
          <Text style={styles.statLabel}>{t('admin.todayRevenue')}</Text>
        </View>
      </View>

      {/* Top Countries */}
      {stats?.topCountries && stats.topCountries.length > 0 && (
        <View style={styles.topCountries}>
          <Text style={styles.sectionTitle}>{t('admin.topCountries')}</Text>
          <View style={styles.countriesRow}>
            {stats.topCountries.slice(0, 3).map((item, index) => (
              <View key={item.country} style={styles.countryItem}>
                <Text style={styles.countryRank}>#{index + 1}</Text>
                <Text style={styles.countryName}>{item.country}</Text>
                <Text style={styles.countryCount}>{item.count}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}
          >
            {t('admin.allFilter')} ({subscribers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
          onPress={() => setFilter('active')}
        >
          <Text
            style={[styles.filterTabText, filter === 'active' && styles.filterTabTextActive]}
          >
            {t('admin.active')} ({subscribers.filter((s) => s.isActive).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'expired' && styles.filterTabActive]}
          onPress={() => setFilter('expired')}
        >
          <Text
            style={[styles.filterTabText, filter === 'expired' && styles.filterTabTextActive]}
          >
            {t('admin.expired')} ({subscribers.filter((s) => !s.isActive).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Subscribers List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.list}>
          {filteredSubscribers.map((sub) => {
            const daysRemaining = getDaysRemaining(sub.endDate);
            const isExpiringSoon = sub.isActive && daysRemaining <= 7;

            return (
              <View key={sub.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.userInfo}>
                    <View style={styles.avatar}>
                      <Ionicons name="person" size={20} color={Colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.email}>{sub.email || t('admin.noEmail')}</Text>
                      <Text style={styles.country}>{sub.country}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: sub.isActive
                          ? isExpiringSoon
                            ? Colors.warning + '20'
                            : Colors.success + '20'
                          : Colors.error + '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: sub.isActive
                            ? isExpiringSoon
                              ? Colors.warning
                              : Colors.success
                            : Colors.error,
                        },
                      ]}
                    >
                      {sub.isActive
                        ? isExpiringSoon
                          ? `${t('admin.expiresIn')} ${daysRemaining} ${t('common.days')}`
                          : t('admin.active')
                        : t('admin.expired')}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>{t('admin.subscriptionType')}</Text>
                      <Text style={styles.detailValue}>
                        {sub.subscriptionType === 'monthly' ? t('common.monthly') : t('common.yearly')}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>{t('admin.amount')}</Text>
                      <Text style={styles.detailValue}>
                        {sub.amount} {sub.currency}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>{t('admin.startDate')}</Text>
                      <Text style={styles.detailValue}>{formatDate(sub.startDate)}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>{t('admin.endDate')}</Text>
                      <Text style={styles.detailValue}>{formatDate(sub.endDate)}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.transactionId}>
                    {t('admin.transactionId')}: {sub.odPaymentId || sub.id}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {filteredSubscribers.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyText}>{t('admin.noSubscribers')}</Text>
          </View>
        )}

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  topCountries: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  countriesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  countryItem: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  countryRank: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  countryName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  countryCount: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 12,
    color: Colors.text,
  },
  filterTabTextActive: {
    color: Colors.textLight,
    fontWeight: '600',
  },
  list: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  email: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  country: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardDetails: {
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  cardFooter: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  transactionId: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
});
