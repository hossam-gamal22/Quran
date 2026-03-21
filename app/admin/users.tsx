// app/admin/users.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { collection, getDocs, doc, updateDoc, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useIsRTL } from '@/hooks/use-is-rtl';

interface UserData {
  id: string;
  email?: string;
  displayName?: string;
  language?: string;
  country?: string;
  platform?: string;
  appVersion?: string;
  lastActive?: string;
  createdAt?: string;
  isPremium?: boolean;
  pushToken?: string;
  disabled?: boolean;
}

export default function UsersScreen() {
  const isRTL = useIsRTL();
  const [users, setUsers] = useState<UserData[]>([]);
  const [filtered, setFiltered] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'premium' | 'free'>('all');

  const loadUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserData));
      data.sort((a, b) => {
        const dateA = a.lastActive || a.createdAt || '';
        const dateB = b.lastActive || b.createdAt || '';
        return dateB.localeCompare(dateA);
      });
      setUsers(data);
      applyFilter(data, searchQuery, filterType);
    } catch (err) {
      Alert.alert('خطأ', 'فشل تحميل المستخدمين');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilter = useCallback((data: UserData[], search: string, filter: string) => {
    let result = data;
    if (filter === 'premium') result = result.filter(u => u.isPremium);
    if (filter === 'free') result = result.filter(u => !u.isPremium);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        (u.email?.toLowerCase().includes(q)) ||
        (u.displayName?.toLowerCase().includes(q)) ||
        (u.id.toLowerCase().includes(q)) ||
        (u.country?.toLowerCase().includes(q))
      );
    }
    setFiltered(result);
  }, []);

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => { applyFilter(users, searchQuery, filterType); }, [searchQuery, filterType, users, applyFilter]);

  const toggleUserDisabled = (user: UserData) => {
    const newState = !user.disabled;
    Alert.alert(
      newState ? 'حظر المستخدم' : 'إلغاء الحظر',
      `هل تريد ${newState ? 'حظر' : 'إلغاء حظر'} هذا المستخدم؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تأكيد',
          style: newState ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'users', user.id), { disabled: newState });
              setUsers(prev => prev.map(u => u.id === user.id ? { ...u, disabled: newState } : u));
            } catch {
              Alert.alert('خطأ', 'فشل تحديث حالة المستخدم');
            }
          },
        },
      ],
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return dateStr; }
  };

  const stats = {
    total: users.length,
    premium: users.filter(u => u.isPremium).length,
    active7d: users.filter(u => {
      if (!u.lastActive) return false;
      return Date.now() - new Date(u.lastActive).getTime() < 7 * 24 * 60 * 60 * 1000;
    }).length,
  };

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>إجمالي</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.premium}</Text>
          <Text style={styles.statLabel}>مميز</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#22C55E' }]}>{stats.active7d}</Text>
          <Text style={styles.statLabel}>نشط (٧ أيام)</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="بحث بالبريد أو الاسم..."
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </View>

      {/* Filter */}
      <View style={styles.filterRow}>
        {(['all', 'premium', 'free'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filterType === f && styles.filterBtnActive]}
            onPress={() => setFilterType(f)}
          >
            <Text style={[styles.filterBtnText, filterType === f && styles.filterBtnTextActive]}>
              {f === 'all' ? 'الكل' : f === 'premium' ? 'مميز' : 'مجاني'}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.resultCount}>{filtered.length} مستخدم</Text>
      </View>

      {/* User List */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadUsers(); }} />}
      >
        {filtered.slice(0, 100).map(user => (
          <View key={user.id} style={[styles.userCard, user.disabled && styles.userCardDisabled]}>
            <View style={[styles.userRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.userAvatar, { backgroundColor: user.isPremium ? '#F59E0B20' : Colors.primary + '20' }]}>
                <Ionicons name={user.isPremium ? 'star' : 'person'} size={20} color={user.isPremium ? '#F59E0B' : Colors.primary} />
              </View>
              <View style={[styles.userInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={styles.userName}>{user.displayName || user.email || user.id.slice(0, 12)}</Text>
                {user.email && <Text style={styles.userEmail}>{user.email}</Text>}
                <View style={[styles.userMeta, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {user.language && <Text style={styles.metaBadge}>{user.language.toUpperCase()}</Text>}
                  {user.country && <Text style={styles.metaBadge}>{user.country}</Text>}
                  {user.platform && <Text style={styles.metaBadge}>{user.platform}</Text>}
                  {user.appVersion && <Text style={styles.metaBadge}>v{user.appVersion}</Text>}
                </View>
                <Text style={styles.userDate}>آخر نشاط: {formatDate(user.lastActive)}</Text>
              </View>
              <TouchableOpacity onPress={() => toggleUserDisabled(user)} activeOpacity={0.7}>
                <Ionicons name={user.disabled ? 'lock-closed' : 'lock-open'} size={20} color={user.disabled ? '#EF4444' : Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {filtered.length > 100 && (
          <Text style={styles.moreText}>يتم عرض أول ١٠٠ مستخدم فقط. استخدم البحث للعثور على مستخدم محدد.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.sm, alignItems: 'center', elevation: 2, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  searchRow: { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, padding: Spacing.sm, fontSize: 14, color: Colors.text, textAlign: 'right', writingDirection: 'rtl' },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm, alignItems: 'center', gap: Spacing.xs },
  filterBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  filterBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  filterBtnText: { fontSize: 13, color: Colors.textMuted },
  filterBtnTextActive: { color: Colors.primary, fontWeight: '600' },
  resultCount: { marginLeft: 'auto', fontSize: 12, color: Colors.textMuted },
  userCard: { backgroundColor: Colors.surface, marginHorizontal: Spacing.md, marginBottom: Spacing.xs, borderRadius: BorderRadius.lg, padding: Spacing.md, elevation: 1, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  userCardDisabled: { opacity: 0.5 },
  userRow: { alignItems: 'center', gap: Spacing.sm },
  userAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  userEmail: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  userMeta: { gap: Spacing.xs, marginTop: Spacing.xs, flexWrap: 'wrap' },
  metaBadge: { fontSize: 10, color: Colors.primary, backgroundColor: Colors.primary + '10', paddingHorizontal: Spacing.xs, paddingVertical: 1, borderRadius: BorderRadius.sm, overflow: 'hidden' },
  userDate: { fontSize: 11, color: Colors.textMuted, marginTop: Spacing.xs, writingDirection: 'rtl', textAlign: 'right' },
  moreText: { textAlign: 'center', color: Colors.textMuted, fontSize: 13, padding: Spacing.md, writingDirection: 'rtl' },
});
