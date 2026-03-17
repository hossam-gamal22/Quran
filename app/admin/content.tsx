// app/admin/content.tsx
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
import { DynamicContent } from '../../types/admin';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { t } from '@/lib/i18n';
type ContentType = 'ayah' | 'hadith' | 'tip' | 'announcement' | 'banner';

const getContentTypes = (): { key: ContentType; label: string; icon: string; color: string }[] => [
  { key: 'ayah', label: t('admin.typeAyah'), icon: 'book', color: '#22C55E' },
  { key: 'hadith', label: t('admin.typeHadith'), icon: 'document-text', color: '#3B82F6' },
  { key: 'tip', label: t('admin.typeTip'), icon: 'bulb', color: '#F59E0B' },
  { key: 'announcement', label: t('admin.typeAnnouncement'), icon: 'megaphone', color: '#EC4899' },
  { key: 'banner', label: t('admin.typeBanner'), icon: 'image', color: '#8B5CF6' },
];

export default function ContentScreen() {
  const isRTL = useIsRTL();
  const contentTypes = getContentTypes();
  const [content, setContent] = useState<DynamicContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingContent, setEditingContent] = useState<DynamicContent | null>(null);
  const [selectedType, setSelectedType] = useState<ContentType | 'all'>('all');
  const [formData, setFormData] = useState<Omit<DynamicContent, 'id'>>({
    type: 'ayah',
    title: '',
    titleAr: '',
    content: '',
    contentAr: '',
    imageUrl: '',
    linkUrl: '',
    isActive: true,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 1,
    targetScreen: '',
  });

  useEffect(() => {
    loadContent();
  }, [selectedType]);

  const loadContent = async () => {
    try {
      setIsLoading(true);
      const data = await adminService.getDynamicContent(
        selectedType === 'all' ? undefined : selectedType
      );
      setContent(data);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingContent(null);
    setFormData({
      type: 'ayah',
      title: '',
      titleAr: '',
      content: '',
      contentAr: '',
      imageUrl: '',
      linkUrl: '',
      isActive: true,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 1,
      targetScreen: '',
    });
    setShowModal(true);
  };

  const openEditModal = (item: DynamicContent) => {
    setEditingContent(item);
    setFormData({
      type: item.type,
      title: item.title,
      titleAr: item.titleAr,
      content: item.content,
      contentAr: item.contentAr,
      imageUrl: item.imageUrl || '',
      linkUrl: item.linkUrl || '',
      isActive: item.isActive,
      startDate: item.startDate,
      endDate: item.endDate,
      priority: item.priority,
      targetScreen: item.targetScreen || '',
    });
    setShowModal(true);
  };

  const saveContent = async () => {
    if (!formData.titleAr || !formData.contentAr) {
      Alert.alert(t('common.error'), t('admin.contentFillRequired'));
      return;
    }

    try {
      let success: boolean;
      if (editingContent) {
        success = await adminService.updateDynamicContent(editingContent.id, formData);
      } else {
        const id = await adminService.addDynamicContent(formData);
        success = !!id;
      }

      if (success) {
        Alert.alert(t('common.done'), t('admin.contentSaved'));
        setShowModal(false);
        loadContent();
      } else {
        Alert.alert(t('common.error'), t('admin.contentSaveFailed'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('admin.unexpectedError'));
    }
  };

  const deleteContent = async (id: string) => {
    Alert.alert(t('admin.confirmDelete'), t('admin.contentDeleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          const success = await adminService.deleteDynamicContent(id);
          if (success) {
            loadContent();
          }
        },
      },
    ]);
  };

  const toggleActive = async (item: DynamicContent) => {
    const success = await adminService.updateDynamicContent(item.id, {
      isActive: !item.isActive,
    });
    if (success) {
      loadContent();
    }
  };

  const getTypeInfo = (type: ContentType) => {
    return contentTypes.find((t) => t.key === type) || contentTypes[0];
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[styles.filterTab, selectedType === 'all' && styles.filterTabActive]}
          onPress={() => setSelectedType('all')}
        >
          <Text
            style={[
              styles.filterTabText,
              selectedType === 'all' && styles.filterTabTextActive,
            ]}
          >
            الكل
          </Text>
        </TouchableOpacity>
        {contentTypes.map((type) => (
          <TouchableOpacity
            key={type.key}
            style={[
              styles.filterTab,
              selectedType === type.key && styles.filterTabActive,
              selectedType === type.key && { backgroundColor: type.color },
            ]}
            onPress={() => setSelectedType(type.key)}
          >
            <Ionicons
              name={type.icon as any}
              size={16}
              color={selectedType === type.key ? Colors.textLight : type.color}
            />
            <Text
              style={[
                styles.filterTabText,
                selectedType === type.key && styles.filterTabTextActive,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
        <Ionicons name="add-circle" size={24} color={Colors.textLight} />
        <Text style={styles.addBtnText}>{t('admin.addContent')}</Text>
      </TouchableOpacity>

      {/* Content List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.list}>
            {content.map((item) => {
              const typeInfo = getTypeInfo(item.type);
              return (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.typeInfo}>
                      <View
                        style={[
                          styles.typeBadge,
                          { backgroundColor: typeInfo.color + '20' },
                        ]}
                      >
                        <Ionicons
                          name={typeInfo.icon as any}
                          size={16}
                          color={typeInfo.color}
                        />
                        <Text style={[styles.typeText, { color: typeInfo.color }]}>
                          {typeInfo.label}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: item.isActive ? Colors.success : Colors.error },
                        ]}
                      />
                    </View>
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
                        onPress={() => openEditModal(item)}
                      >
                        <Ionicons name="pencil" size={20} color={Colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => deleteContent(item.id)}
                      >
                        <Ionicons name="trash" size={20} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{item.titleAr}</Text>
                  <Text style={[styles.cardContent, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
                    {item.contentAr}
                  </Text>

                  <View style={styles.cardFooter}>
                    <Text style={styles.priorityText}>الأولوية: {item.priority}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {content.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyText}>لا يوجد محتوى</Text>
            </View>
          )}

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      )}

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
              {editingContent ? t('common.edit') : t('admin.addContent')}
            </Text>
            <TouchableOpacity onPress={saveContent}>
              <Text style={styles.saveText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Type Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>نوع المحتوى</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.typeSelector}>
                  {contentTypes.map((type) => (
                    <TouchableOpacity
                      key={type.key}
                      style={[
                        styles.typeOption,
                        formData.type === type.key && {
                          backgroundColor: type.color,
                          borderColor: type.color,
                        },
                      ]}
                      onPress={() => setFormData({ ...formData, type: type.key })}
                    >
                      <Ionicons
                        name={type.icon as any}
                        size={20}
                        color={formData.type === type.key ? Colors.textLight : type.color}
                      />
                      <Text
                        style={[
                          styles.typeOptionText,
                          formData.type === type.key && { color: Colors.textLight },
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>العنوان (عربي) *</Text>
              <TextInput
                style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                value={formData.titleAr}
                onChangeText={(value) => setFormData({ ...formData, titleAr: value })}
                placeholder="عنوان المحتوى"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>العنوان (إنجليزي)</Text>
              <TextInput
                style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                value={formData.title}
                onChangeText={(value) => setFormData({ ...formData, title: value })}
                placeholder="Content Title"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>المحتوى (عربي) *</Text>
              <TextInput
                style={[styles.input, styles.textArea, { textAlign: isRTL ? 'right' : 'left' }]}
                value={formData.contentAr}
                onChangeText={(value) => setFormData({ ...formData, contentAr: value })}
                placeholder="نص المحتوى..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>المحتوى (إنجليزي)</Text>
              <TextInput
                style={[styles.input, styles.textArea, { textAlign: isRTL ? 'right' : 'left' }]}
                value={formData.content}
                onChangeText={(value) => setFormData({ ...formData, content: value })}
                placeholder="Content text..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>رابط الصورة (اختياري)</Text>
              <TextInput
                style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                value={formData.imageUrl}
                onChangeText={(value) => setFormData({ ...formData, imageUrl: value })}
                placeholder="https://..."
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>رابط خارجي (اختياري)</Text>
              <TextInput
                style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                value={formData.linkUrl}
                onChangeText={(value) => setFormData({ ...formData, linkUrl: value })}
                placeholder="https://..."
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>الأولوية (1-10)</Text>
              <TextInput
                style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                value={String(formData.priority)}
                onChangeText={(value) =>
                  setFormData({ ...formData, priority: parseInt(value) || 1 })
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
  filterContainer: {
    maxHeight: 50,
  },
  filterContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    marginRight: Spacing.sm,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    color: Colors.text,
  },
  filterTabTextActive: {
    color: Colors.textLight,
    fontWeight: '600',
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
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  iconBtn: {
    padding: Spacing.xs,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  cardContent: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  cardFooter: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  priorityText: {
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
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typeOptionText: {
    fontSize: 14,
    color: Colors.text,
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
