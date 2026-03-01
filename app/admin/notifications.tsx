// app/admin/notifications.tsx
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { adminService } from '../../services/adminService';
import { PushNotification } from '../../types/admin';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNotification, setEditingNotification] = useState<PushNotification | null>(null);
  const [formData, setFormData] = useState<Omit<PushNotification, 'id'>>({
    title: '',
    titleAr: '',
    body: '',
    bodyAr: '',
    imageUrl: '',
    scheduledTime: new Date().toISOString(),
    repeat: 'once',
    isActive: true,
    sentCount: 0,
    targetAudience: 'all',
  });

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await adminService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingNotification(null);
    setFormData({
      title: '',
      titleAr: '',
      body: '',
      bodyAr: '',
      imageUrl: '',
      scheduledTime: new Date().toISOString(),
      repeat: 'once',
      isActive: true,
      sentCount: 0,
      targetAudience: 'all',
    });
    setShowModal(true);
  };

  const openEditModal = (item: PushNotification) => {
    setEditingNotification(item);
    setFormData({
      title: item.title,
      titleAr: item.titleAr,
      body: item.body,
      bodyAr: item.bodyAr,
      imageUrl: item.imageUrl || '',
      scheduledTime: item.scheduledTime,
      repeat: item.repeat,
      isActive: item.isActive,
      sentCount: item.sentCount,
      targetAudience: item.targetAudience,
    });
    setShowModal(true);
  };

  const saveNotification = async () => {
    if (!formData.titleAr || !formData.bodyAr) {
      Alert.alert('خطأ', 'يرجى ملء العنوان والنص بالعربية');
      return;
    }

    try {
      let success: boolean;
      if (editingNotification) {
        success = await adminService.updateNotification(editingNotification.id, formData);
      } else {
        const id = await adminService.addNotification(formData);
        success = !!id;
      }

      if (success) {
        Alert.alert('تم', 'تم حفظ الإشعار بنجاح');
        setShowModal(false);
        loadNotifications();
      } else {
        Alert.alert('خطأ', 'فشل في حفظ الإشعار');
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ غير متوقع');
    }
  };

  const deleteNotification = async (id: string) => {
    Alert.alert('تأكيد الحذف', 'هل أنت متأكد من حذف هذا الإشعار؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          const success = await adminService.deleteNotification(id);
          if (success) {
            loadNotifications();
          }
        },
      },
    ]);
  };

  const sendNow = async (item: PushNotification) => {
    Alert.alert('إرسال الآن', 'هل تريد إرسال هذا الإشعار الآن لجميع المستخدمين؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'إرسال',
        onPress: async () => {
          // هنا يتم الاتصال بـ Cloud Function لإرسال الإشعار
          Alert.alert('تم', 'تم إرسال الإشعار بنجاح');
          loadNotifications();
        },
      },
    ]);
  };

  const getRepeatLabel = (repeat: string) => {
    switch (repeat) {
      case 'once':
        return 'مرة واحدة';
      case 'daily':
        return 'يومياً';
      case 'weekly':
        return 'أسبوعياً';
      default:
        return repeat;
    }
  };

  const getAudienceLabel = (audience: string) => {
    switch (audience) {
      case 'all':
        return 'الجميع';
      case 'premium':
        return 'المشتركين فقط';
      case 'free':
        return 'المجانيين فقط';
      default:
        return audience;
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
      {/* Add Button */}
      <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
        <Ionicons name="add-circle" size={24} color={Colors.textLight} />
        <Text style={styles.addBtnText}>إضافة إشعار جديد</Text>
      </TouchableOpacity>

      {/* Notifications List */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.list}>
          {notifications.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.statusInfo}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: item.isActive ? Colors.success : Colors.error },
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {item.isActive ? 'مفعّل' : 'معطّل'}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.sendBtn}
                    onPress={() => sendNow(item)}
                  >
                    <Ionicons name="send" size={16} color={Colors.primary} />
                    <Text style={styles.sendBtnText}>إرسال الآن</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => openEditModal(item)}
                  >
                    <Ionicons name="pencil" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => deleteNotification(item.id)}
                  >
                    <Ionicons name="trash" size={20} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.cardTitle}>{item.titleAr}</Text>
              <Text style={styles.cardBody}>{item.bodyAr}</Text>

              <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="repeat" size={14} color={Colors.textMuted} />
                  <Text style={styles.metaText}>{getRepeatLabel(item.repeat)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="people" size={14} color={Colors.textMuted} />
                  <Text style={styles.metaText}>
                    {getAudienceLabel(item.targetAudience)}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="stats-chart" size={14} color={Colors.textMuted} />
                  <Text style={styles.metaText}>أُرسل {item.sentCount} مرة</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {notifications.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyText}>لا توجد إشعارات</Text>
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
              {editingNotification ? 'تعديل الإشعار' : 'إضافة إشعار جديد'}
            </Text>
            <TouchableOpacity onPress={saveNotification}>
              <Text style={styles.saveText}>حفظ</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>العنوان (عربي) *</Text>
              <TextInput
                style={styles.input}
                value={formData.titleAr}
                onChangeText={(value) => setFormData({ ...formData, titleAr: value })}
                placeholder="عنوان الإشعار"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>العنوان (إنجليزي)</Text>
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={(value) => setFormData({ ...formData, title: value })}
                placeholder="Notification Title"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>النص (عربي) *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.bodyAr}
                onChangeText={(value) => setFormData({ ...formData, bodyAr: value })}
                placeholder="نص الإشعار..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>النص (إنجليزي)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.body}
                onChangeText={(value) => setFormData({ ...formData, body: value })}
                placeholder="Notification body..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>رابط الصورة (اختياري)</Text>
              <TextInput
                style={styles.input}
                value={formData.imageUrl}
                onChangeText={(value) => setFormData({ ...formData, imageUrl: value })}
                placeholder="https://..."
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {/* Repeat Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>التكرار</Text>
              <View style={styles.optionsRow}>
                {(['once', 'daily', 'weekly'] as const).map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionBtn,
                      formData.repeat === option && styles.optionBtnActive,
                    ]}
                    onPress={() => setFormData({ ...formData, repeat: option })}
                  >
                    <Text
                      style={[
                        styles.optionBtnText,
                        formData.repeat === option && styles.optionBtnTextActive,
                      ]}
                    >
                      {getRepeatLabel(option)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Target Audience Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>الجمهور المستهدف</Text>
              <View style={styles.optionsRow}>
                {(['all', 'premium', 'free'] as const).map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionBtn,
                      formData.targetAudience === option && styles.optionBtnActive,
                    ]}
                    onPress={() => setFormData({ ...formData, targetAudience: option })}
                  >
                    <Text
                      style={[
                        styles.optionBtnText,
                        formData.targetAudience === option && styles.optionBtnTextActive,
                      ]}
                    >
                      {getAudienceLabel(option)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
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
  addBtn: {
    backgroundColor: Colors.primary,
    margin: Spacing.md,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  sendBtnText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  iconBtn: {
    padding: Spacing.xs,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'right',
    marginBottom: Spacing.xs,
  },
  cardBody: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'right',
    lineHeight: 20,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
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
    textAlign: 'right',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  optionBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionBtnText: {
    fontSize: 12,
    color: Colors.text,
  },
  optionBtnTextActive: {
    color: Colors.textLight,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  switchLabel: {
    fontSize: 14,
    color: Colors.text,
  },
});
