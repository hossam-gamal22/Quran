// app/admin/widgets.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { db } from '../../lib/firebase-config';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import WebView from 'react-native-webview';

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

type WidgetType = 'ayah' | 'azkar' | 'hijri' | 'custom';

interface VariableMapping {
  nodeSelector: string;
  variable: string;
  fallback: string;
}

interface WidgetTemplate {
  id: string;
  name: string;
  type: WidgetType;
  svgSource: string;
  mappings: VariableMapping[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

// -----------------------------------------------------------
// Constants
// -----------------------------------------------------------

const WIDGET_TYPES: { key: WidgetType; label: string; icon: string; color: string }[] = [
  { key: 'ayah', label: 'آية', icon: 'book', color: '#22C55E' },
  { key: 'azkar', label: 'أذكار', icon: 'moon', color: '#3B82F6' },
  { key: 'hijri', label: 'تاريخ هجري', icon: 'calendar', color: '#F59E0B' },
  { key: 'custom', label: 'مخصص', icon: 'construct', color: '#8B5CF6' },
];

const VARIABLE_OPTIONS = [
  { key: 'hijri_date', label: 'التاريخ الهجري' },
  { key: 'hijri_day', label: 'اليوم الهجري' },
  { key: 'hijri_month', label: 'الشهر الهجري' },
  { key: 'hijri_year', label: 'السنة الهجرية' },
  { key: 'gregorian_date', label: 'التاريخ الميلادي' },
  { key: 'random_ayah', label: 'آية عشوائية' },
  { key: 'random_dua', label: 'دعاء عشوائي' },
  { key: 'prayer_name', label: 'اسم الصلاة' },
  { key: 'prayer_time', label: 'وقت الصلاة' },
  { key: 'app_name', label: 'اسم التطبيق' },
];

const MOCK_VARIABLES: Record<string, string> = {
  hijri_date: '15 رمضان 1447',
  hijri_day: '15',
  hijri_month: 'رمضان',
  hijri_year: '1447',
  gregorian_date: '7 مارس 2026',
  random_ayah: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  random_dua: 'اللهم إني أسألك العفو والعافية',
  prayer_name: 'الفجر',
  prayer_time: '٤:٣٠ ص',
  app_name: 'روح المسلم',
};

const COLLECTION_NAME = 'widget_templates';

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

function getTypeConfig(type: WidgetType) {
  return WIDGET_TYPES.find((t) => t.key === type) ?? WIDGET_TYPES[3];
}

/** Replace all {{variable}} placeholders with mock or fallback values */
function resolveSvg(svgSource: string, mappings: VariableMapping[]): string {
  let resolved = svgSource;
  for (const m of mappings) {
    const value = MOCK_VARIABLES[m.variable] ?? m.fallback ?? '';
    // Replace placeholder pattern like {{variable_name}}
    const pattern = new RegExp(`\\{\\{${m.variable}\\}\\}`, 'g');
    resolved = resolved.replace(pattern, value);
  }
  return resolved;
}

function buildPreviewHtml(svgSource: string, mappings: VariableMapping[]): string {
  const resolved = resolveSvg(svgSource, mappings);
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { display:flex; align-items:center; justify-content:center; height:100vh; background:#f5f5f5; }
  svg { max-width:100%; max-height:100%; }
</style>
</head>
<body>${resolved}</body>
</html>`;
}

// -----------------------------------------------------------
// Main Screen
// -----------------------------------------------------------

export default function WidgetsScreen() {
  const [templates, setTemplates] = useState<WidgetTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WidgetTemplate | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<WidgetType>('ayah');
  const [svgSource, setSvgSource] = useState('');
  const [mappings, setMappings] = useState<VariableMapping[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showVariablePicker, setShowVariablePicker] = useState<number | null>(null);

  // ------ Data loading ------

  const loadTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      const q = query(collection(db, COLLECTION_NAME), orderBy('updatedAt', 'desc'));
      const snap = await getDocs(q);
      const items: WidgetTemplate[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<WidgetTemplate, 'id'>),
      }));
      setTemplates(items);
    } catch (error) {
      console.error('Error loading widget templates:', error);
      Alert.alert('خطأ', 'فشل تحميل القوالب');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // ------ Modal helpers ------

  const resetForm = () => {
    setName('');
    setType('ayah');
    setSvgSource('');
    setMappings([]);
    setEditingTemplate(null);
    setShowVariablePicker(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (item: WidgetTemplate) => {
    setEditingTemplate(item);
    setName(item.name);
    setType(item.type);
    setSvgSource(item.svgSource);
    setMappings([...item.mappings]);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  // ------ CRUD ------

  const handleSave = async (publish: boolean) => {
    if (!name.trim()) {
      Alert.alert('خطأ', 'يجب إدخال اسم القالب');
      return;
    }
    if (!svgSource.trim()) {
      Alert.alert('خطأ', 'يجب إدخال كود SVG');
      return;
    }

    try {
      setIsSaving(true);
      const now = new Date().toISOString();
      const payload: Omit<WidgetTemplate, 'id'> = {
        name: name.trim(),
        type,
        svgSource,
        mappings,
        isActive: publish ? true : editingTemplate?.isActive ?? false,
        createdAt: editingTemplate?.createdAt ?? now,
        updatedAt: now,
        ...(publish ? { publishedAt: now } : {}),
      };

      if (editingTemplate) {
        const ref = doc(db, COLLECTION_NAME, editingTemplate.id);
        await updateDoc(ref, { ...payload, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, COLLECTION_NAME), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      closeModal();
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('خطأ', 'فشل حفظ القالب');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (item: WidgetTemplate) => {
    Alert.alert('حذف القالب', `هل تريد حذف "${item.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, COLLECTION_NAME, item.id));
            loadTemplates();
          } catch (error) {
            console.error('Error deleting template:', error);
            Alert.alert('خطأ', 'فشل حذف القالب');
          }
        },
      },
    ]);
  };

  const handleToggleActive = async (item: WidgetTemplate) => {
    try {
      const ref = doc(db, COLLECTION_NAME, item.id);
      await updateDoc(ref, {
        isActive: !item.isActive,
        updatedAt: serverTimestamp(),
      });
      loadTemplates();
    } catch (error) {
      console.error('Error toggling template:', error);
    }
  };

  // ------ Mapping helpers ------

  const addMapping = () => {
    setMappings((prev) => [...prev, { nodeSelector: '', variable: 'hijri_date', fallback: '' }]);
  };

  const updateMapping = (index: number, field: keyof VariableMapping, value: string) => {
    setMappings((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeMapping = (index: number) => {
    setMappings((prev) => prev.filter((_, i) => i !== index));
  };

  // ------ Renders ------

  const renderTemplateCard = ({ item }: { item: WidgetTemplate }) => {
    const cfg = getTypeConfig(item.type);
    const updatedStr = item.updatedAt
      ? new Date(item.updatedAt).toLocaleDateString('ar-EG', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.typeBadge, { backgroundColor: cfg.color + '20' }]}>
              <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />
              <Text style={[styles.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: item.isActive ? '#22C55E20' : '#EF444420' },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: item.isActive ? '#22C55E' : '#EF4444' },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: item.isActive ? '#22C55E' : '#EF4444' },
                ]}
              >
                {item.isActive ? 'نشط' : 'مسودة'}
              </Text>
            </View>
          </View>
          <Text style={styles.cardTitle}>{item.name}</Text>
          {updatedStr ? (
            <Text style={styles.cardDate}>آخر تحديث: {updatedStr}</Text>
          ) : null}
          <Text style={styles.cardMappings}>
            {item.mappings.length} متغير{item.mappings.length !== 1 ? 'ات' : ''}
          </Text>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.primary + '15' }]}
            onPress={() => openEditModal(item)}
          >
            <Ionicons name="create-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: item.isActive ? '#EF444415' : '#22C55E15' },
            ]}
            onPress={() => handleToggleActive(item)}
          >
            <Ionicons
              name={item.isActive ? 'pause-outline' : 'play-outline'}
              size={18}
              color={item.isActive ? '#EF4444' : '#22C55E'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#EF444415' }]}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderVariablePicker = (index: number) => {
    if (showVariablePicker !== index) return null;
    return (
      <View style={styles.pickerDropdown}>
        {VARIABLE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={styles.pickerOption}
            onPress={() => {
              updateMapping(index, 'variable', opt.key);
              setShowVariablePicker(null);
            }}
          >
            <Text style={styles.pickerOptionText}>{opt.label}</Text>
            <Text style={styles.pickerOptionKey}>{opt.key}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // ------ Main render ------

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>محرك الويدجت الديناميكي</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>إضافة قالب جديد</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : templates.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="cube-outline" size={64} color={Colors.textLight} />
          <Text style={styles.emptyText}>لا توجد قوالب بعد</Text>
          <Text style={styles.emptySubtext}>اضغط على "إضافة قالب جديد" للبدء</Text>
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          renderItem={renderTemplateCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create / Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <Text style={styles.modalCancel}>إلغاء</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingTemplate ? 'تعديل القالب' : 'قالب جديد'}
            </Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Template name */}
            <Text style={styles.label}>اسم القالب</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="مثال: ويدجت الآية اليومية"
              placeholderTextColor={Colors.textLight}
            />

            {/* Type selector */}
            <Text style={styles.label}>نوع القالب</Text>
            <View style={styles.typeRow}>
              {WIDGET_TYPES.map((wt) => (
                <TouchableOpacity
                  key={wt.key}
                  style={[
                    styles.typeChip,
                    type === wt.key && { backgroundColor: wt.color + '20', borderColor: wt.color },
                  ]}
                  onPress={() => setType(wt.key)}
                >
                  <Ionicons
                    name={wt.icon as any}
                    size={16}
                    color={type === wt.key ? wt.color : Colors.textLight}
                  />
                  <Text
                    style={[
                      styles.typeChipText,
                      type === wt.key && { color: wt.color, fontWeight: '600' },
                    ]}
                  >
                    {wt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* SVG Source */}
            <Text style={styles.label}>كود SVG</Text>
            <TextInput
              style={[styles.input, styles.svgInput]}
              value={svgSource}
              onChangeText={setSvgSource}
              placeholder={'<svg ...>\n  <text id="title">{{random_ayah}}</text>\n</svg>'}
              placeholderTextColor={Colors.textLight}
              multiline
              textAlignVertical="top"
            />

            {/* Variable Mappings */}
            <View style={styles.sectionHeader}>
              <Text style={styles.label}>ربط المتغيرات</Text>
              <TouchableOpacity style={styles.addMappingBtn} onPress={addMapping}>
                <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                <Text style={styles.addMappingText}>إضافة متغير</Text>
              </TouchableOpacity>
            </View>

            {mappings.map((m, index) => (
              <View key={index} style={styles.mappingCard}>
                <View style={styles.mappingRow}>
                  <Text style={styles.mappingLabel}>المحدد (Selector)</Text>
                  <TouchableOpacity onPress={() => removeMapping(index)}>
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.mappingInput}
                  value={m.nodeSelector}
                  onChangeText={(v) => updateMapping(index, 'nodeSelector', v)}
                  placeholder='مثال: #title-text'
                  placeholderTextColor={Colors.textLight}
                />

                <Text style={styles.mappingLabel}>المتغير</Text>
                <TouchableOpacity
                  style={styles.variableSelector}
                  onPress={() =>
                    setShowVariablePicker(showVariablePicker === index ? null : index)
                  }
                >
                  <Text style={styles.variableSelectorText}>
                    {VARIABLE_OPTIONS.find((o) => o.key === m.variable)?.label ?? m.variable}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={Colors.textLight} />
                </TouchableOpacity>
                {renderVariablePicker(index)}

                <Text style={styles.mappingLabel}>القيمة الافتراضية</Text>
                <TextInput
                  style={styles.mappingInput}
                  value={m.fallback}
                  onChangeText={(v) => updateMapping(index, 'fallback', v)}
                  placeholder="قيمة احتياطية"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            ))}

            {/* Live Preview */}
            {svgSource.trim() ? (
              <>
                <Text style={[styles.label, { marginTop: Spacing.lg }]}>معاينة مباشرة</Text>
                <View style={styles.previewFrame}>
                  <WebView
                    originWhitelist={['*']}
                    source={{ html: buildPreviewHtml(svgSource, mappings) }}
                    style={styles.previewWebView}
                    scrollEnabled={false}
                    javaScriptEnabled={false}
                  />
                </View>
              </>
            ) : null}

            {/* Action buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.saveBtn, styles.saveDraftBtn]}
                onPress={() => handleSave(false)}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color={Colors.primary} />
                    <Text style={[styles.saveBtnText, { color: Colors.primary }]}>
                      حفظ كمسودة
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, styles.publishBtn]}
                onPress={() => handleSave(true)}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="rocket-outline" size={18} color="#fff" />
                    <Text style={[styles.saveBtnText, { color: '#fff' }]}>نشر</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// -----------------------------------------------------------
// Styles
// -----------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // List
  list: {
    padding: Spacing.md,
    gap: Spacing.md,
  },

  // Empty / Loading
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textLight,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    gap: 6,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  cardDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  cardMappings: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalCancel: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },

  // Form
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 15,
    color: Colors.text,
    textAlign: 'right',
  },
  svgInput: {
    height: 160,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'left',
  },

  // Type selector
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#fff',
  },
  typeChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // Mappings
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  addMappingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addMappingText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  mappingCard: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mappingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mappingLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  mappingInput: {
    backgroundColor: '#F5F5F7',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    fontSize: 14,
    color: Colors.text,
    textAlign: 'right',
  },

  // Variable picker
  variableSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
  },
  variableSelectorText: {
    fontSize: 14,
    color: Colors.text,
  },
  pickerDropdown: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.xs,
    marginTop: 4,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  pickerOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  pickerOptionKey: {
    fontSize: 12,
    color: Colors.textLight,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Preview
  previewFrame: {
    width: 300,
    height: 150,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    alignSelf: 'center',
    backgroundColor: '#f5f5f5',
  },
  previewWebView: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // Action buttons
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: BorderRadius.sm,
  },
  saveDraftBtn: {
    backgroundColor: Colors.primary + '15',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  publishBtn: {
    backgroundColor: Colors.primary,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
