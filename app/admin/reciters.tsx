// app/admin/reciters.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Switch,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { adminService } from '../../services/adminService';
import { ReciterConfig } from '../../types/admin';

export default function RecitersScreen() {
  const [reciters, setReciters] = useState<ReciterConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReciter, setEditingReciter] = useState<ReciterConfig | null>(null);
  const [formData, setFormData] = useState<Omit<ReciterConfig, 'id'>>({
    name: '',
    nameAr: '',
    photoUrl: '',
    audioBaseUrl: '',
    isActive: true,
    isPremium: false,
    sortOrder: 1,
  });

  useEffect(() => {
    loadReciters();
  }, []);

  const loadReciters = async () => {
    try {
      const data = await adminService.getReciters();
      setReciters(data);
    } catch (error) {
      console.error('Error loading reciters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingReciter(null);
    setFormData({
      name: '',
      nameAr: '',
      photoUrl: '',
      audioBaseUrl: '',
      isActive: true,
      isPremium: false,
      sortOrder: reciters.length + 1,
    });
    setShowModal(true);
  };

  const openEditModal = (item: ReciterConfig) => {
    setEditingReciter(item);
    setFormData({
      name: item.name,
      nameAr: item.nameAr,
      photoUrl: item.photoUrl,
      audioBaseUrl: item.audioBaseUrl,
      isActive: item.isActive,
      isPremium: item.isPremium,
      sortOrder: item.sortOrder,
    });
    setShowModal(true);
  };

  const saveReciter = async () => {
    if (!formData.nameAr || !formData.audioBaseUrl) {
      Alert.alert('خطأ', 'يرجى ملء الاسم بالعربية ورابط الصوت');
      return;
    }

    try {
      let success: boolean;
      if (editingReciter) {
        success = await adminService.updateReciter(editingReciter.id, formData);
      } else {
        const id = await adminService.addReciter(formData);
        success = !!id;
      }

      if (success) {
        Alert.alert('تم', 'تم حفظ القارئ بنجاح');
        setShowModal(false);
        loadReciters();
      } else {
        Alert.alert('خطأ', 'فشل في حفظ القارئ');
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ غير متوقع');
    }
  };

  const deleteReciter = async (id: string) => {
    Alert.alert('تأكيد الحذف', 'هل أنت متأكد من حذف هذا القارئ؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          const success = await adminService.deleteReciter(id);
          if (success) {
            loadReciters();
          }
        },
      },
    ]);
  };

  const toggleActive = async (item: ReciterConfig) => {
    const success = await adminService.updateReciter(item.id, {
      isActive: !item.isActive,
    });
    if (success) {
      loadReciters();
    }
  };

  const togglePremium = async (item: ReciterConfig) => {
    const success = await adminService.updateReciter(item.id, {
      isPremium: !item.isPremium,
    });
    if (success) {
      loadReciters();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{reciters.length}</Text>
          <Text style={styles.statLabel}>إجمالي القراء</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {reciters.filter((r) => r.isActive).length}
          </Text>
          <Text style={styles.statLabel}>مفعّلين</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {reciters.filter((r) => r.isPremium).length}
          </Text>
          <Text style={styles.statLabel}>مميزين</Text>
        </View>
      </View>

      {/* Add Button */}
      <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
        <Ionicons name="add-circle" size={24} color={Colors.textLight} />
        <Text style={styles.addBtnText}>إضافة قارئ جديد</Text>
      </TouchableOpacity>

      {/* Reciters List */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.list}>
          {reciters.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardMain}>
                {/* Avatar */}
                <View style={styles.avatar}>
                  {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={styles.avatarImage} />
                  ) : (
                    <Ionicons name="person" size={32} color={Colors.textMuted} />
                  )}
                </View>

                {/* Info */}
                <View style={styles.reciterInfo}>
                  <Text style={styles.reciterName}>{item.nameAr}</Text>
                  <Text style={styles.reciterNameEn}>{item.name}</Text>
                  <View style={styles.badges}>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: item.isActive ? Colors.success + '20' : Colors.error + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: item.isActive ? Colors.success : Colors.error },
                        ]}
                      >
                        {item.isActive ? 'مفعّل' : 'معطّل'}
                      </Text>
                    </View>
                    {item.isPremium && (
                      <View style={[styles.badge, { backgroundColor: Colors.gold + '20' }]}>
                        <Ionicons name="star" size={12} color={Colors.gold} />
                        <Text style={[styles.badgeText, { color: Colors.gold }]}>مميز</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => toggleActive(item)}
                  >
                    <Ionicons
                      name={item.isActive ? 'eye' : 'eye-off'}
                      size={20}
                      color={item.isActive ? Colors.success : Colors.textMuted}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => togglePremium(item)}
                  >
                    <Ionicons
                      name={item.isPremium ? 'star' : 'star-outline'}
                      size={20}
                      color={item.isPremium ? Colors.gold : Colors.textMuted}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => openEditModal(item)}
                  >
                    <Ionicons name="pencil" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => deleteReciter(item.id)}
                  >
                    <Ionicons name="trash" size={20} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.audioUrl} numberOfLines={1}>
                {item.audioBaseUrl}
              </Text>
            </View>
          ))}
        </View>

        {reciters.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="mic-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyText}>لا يوجد قراء</Text>
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingReciter ? 'تعديل القارئ' : 'إضافة قارئ جديد'}
            </Text>
            <TouchableOpacity onPress={saveReciter}>
              <Text style={styles.saveText}>حفظ</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>الاسم (عربي) *</Text>
              <TextInput
                style={styles.input}
                value={formData.nameAr}
                onChangeText={(value) => setFormData({ ...formData, nameAr: value })}
                placeholder="عبدالرحمن السديس"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>الاسم (إنجليزي)</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(value) => setFormData({ ...formData, name: value })}
                placeholder="Abdul Rahman Al-Sudais"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>رابط الصورة</Text>
              <TextInput
                style={styles.input}
                value={formData.photoUrl}
                onChangeText={(value) => setFormData({ ...formData, photoUrl: value })}
                placeholder="https://..."
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>رابط قاعدة الصوت *</Text>
              <TextInput
                style={styles.input}
                value={formData.audioBaseUrl}
                onChangeText={(value) => setFormData({ ...formData, audioBaseUrl: value })}
                placeholder="https://server.com/audio/sudais/"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.inputHint}>
                سيتم إضافة رقم السورة تلقائياً (مثال: /001.mp3)
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ترتيب العرض</Text>
              <TextInput
                style={styles.input}
                value={String(formData.sortOrder)}
                onChangeText={(value) =>
                  setFormData({ ...formData, sortOrder: parseInt(value) || 1 })
                }
                placeholder="1"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>مفعّل</Text>
              <Switch
                value={formData.isActive}
                onValueChange={(value) => setFormData({ ...formData, isActive: value })}
                trackColor={{ false: Colors.border, true: Colors.accent }}
                thumbColor={Colors.primary}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>مميز (Premium فقط)</Text>
              <Switch
                value={formData.isPremium}
                onValueChange={(value) => setFormData({ ...formData, isPremium: value })}
                trackColor={{ false: Colors.border, true: Colors.gold }}
                thumbColor={formData.isPremium ? Colors.gold : Colors.textMuted}
              />
            </View>

            <View style={{ height: Spacing.xxl }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  statsRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  statItem: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    margin: Spacing.md,
    marginTop: 0,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textLight,
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
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  reciterInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  reciterName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  reciterNameEn: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  iconBtn: {
    padding: Spacing.xs,
  },
  audioUrl: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalContent: {
    padding: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputHint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  switchLabel: {
    fontSize: 14,
    color: Colors.text,
  },
});
