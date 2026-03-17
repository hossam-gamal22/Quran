// app/admin/events.tsx
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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { t } from '@/lib/i18n';

interface IslamicEvent {
  id?: string;
  name: string;
  nameAr: string;
  hijriMonth: number;
  hijriDay: number;
  hijriDayEnd?: number;
  description: string;
  descriptionAr: string;
  type: string;
  importance: 'major' | 'minor';
  color?: string;
  icon?: string;
}

const EVENT_TYPES = [
  { key: 'holiday', label: 'عطلة', color: '#22C55E' },
  { key: 'fasting', label: 'صيام', color: '#3B82F6' },
  { key: 'special', label: 'مناسبة خاصة', color: '#8B5CF6' },
  { key: 'observance', label: 'مناسبة', color: '#F59E0B' },
  { key: 'sunnah_fasting', label: 'صيام سنة', color: '#06B6D4' },
];

const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];

const EMPTY_EVENT: Omit<IslamicEvent, 'id'> = {
  name: '',
  nameAr: '',
  hijriMonth: 1,
  hijriDay: 1,
  description: '',
  descriptionAr: '',
  type: 'holiday',
  importance: 'major',
  color: '#22C55E',
};

export default function EventsScreen() {
  const isRTL = useIsRTL();
  const [events, setEvents] = useState<IslamicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<IslamicEvent | null>(null);
  const [formData, setFormData] = useState<Omit<IslamicEvent, 'id'>>(EMPTY_EVENT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const snap = await getDocs(collection(db, 'islamicEvents'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as IslamicEvent));
      data.sort((a, b) => (a.hijriMonth * 100 + a.hijriDay) - (b.hijriMonth * 100 + b.hijriDay));
      setEvents(data);
    } catch (err) {
      Alert.alert('خطأ', 'فشل تحميل المناسبات');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.nameAr) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    setSaving(true);
    try {
      if (editingEvent?.id) {
        await setDoc(doc(db, 'islamicEvents', editingEvent.id), formData);
      } else {
        await addDoc(collection(db, 'islamicEvents'), formData);
      }
      setShowModal(false);
      setEditingEvent(null);
      setFormData(EMPTY_EVENT);
      loadEvents();
      Alert.alert('تم', 'تم حفظ المناسبة بنجاح');
    } catch {
      Alert.alert('خطأ', 'فشل حفظ المناسبة');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (event: IslamicEvent) => {
    Alert.alert('تأكيد الحذف', `هل تريد حذف "${event.nameAr}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive', onPress: async () => {
          if (!event.id) return;
          try {
            await deleteDoc(doc(db, 'islamicEvents', event.id));
            loadEvents();
          } catch {
            Alert.alert('خطأ', 'فشل حذف المناسبة');
          }
        },
      },
    ]);
  };

  const openEdit = (event: IslamicEvent) => {
    setEditingEvent(event);
    const { id, ...rest } = event;
    setFormData(rest);
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingEvent(null);
    setFormData(EMPTY_EVENT);
    setShowModal(true);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{events.length}</Text>
            <Text style={styles.statLabel}>إجمالي المناسبات</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{events.filter(e => e.importance === 'major').length}</Text>
            <Text style={styles.statLabel}>مناسبات رئيسية</Text>
          </View>
        </View>

        {/* Events List */}
        {events.map((event) => {
          const typeInfo = EVENT_TYPES.find(et => et.key === event.type);
          return (
            <View key={event.id} style={styles.eventCard}>
              <View style={[styles.eventHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.eventInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={styles.eventName}>{event.nameAr}</Text>
                  <Text style={styles.eventNameEn}>{event.name}</Text>
                  <View style={[styles.eventMeta, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={styles.eventDate}>{HIJRI_MONTHS[event.hijriMonth - 1]} {event.hijriDay}</Text>
                    <View style={[styles.typeBadge, { backgroundColor: typeInfo?.color || Colors.primary }]}>
                      <Text style={styles.typeBadgeText}>{typeInfo?.label || event.type}</Text>
                    </View>
                    <View style={[styles.importanceBadge, { backgroundColor: event.importance === 'major' ? '#EF4444' : '#9CA3AF' }]}>
                      <Text style={styles.typeBadgeText}>{event.importance === 'major' ? 'رئيسي' : 'فرعي'}</Text>
                    </View>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  <TouchableOpacity onPress={() => openEdit(event)} activeOpacity={0.7}>
                    <Ionicons name="create-outline" size={22} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(event)} activeOpacity={0.7}>
                    <Ionicons name="trash-outline" size={22} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color={Colors.textLight} />
      </TouchableOpacity>

      {/* Edit/Add Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingEvent ? 'تعديل مناسبة' : 'إضافة مناسبة'}</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40 }}>
            <Text style={styles.inputLabel}>الاسم بالعربية *</Text>
            <TextInput style={styles.input} value={formData.nameAr} onChangeText={v => setFormData(p => ({ ...p, nameAr: v }))} placeholder="مثال: رأس السنة الهجرية" placeholderTextColor={Colors.textMuted} />

            <Text style={styles.inputLabel}>الاسم بالإنجليزية *</Text>
            <TextInput style={styles.input} value={formData.name} onChangeText={v => setFormData(p => ({ ...p, name: v }))} placeholder="e.g. Islamic New Year" placeholderTextColor={Colors.textMuted} />

            <Text style={styles.inputLabel}>الوصف بالعربية</Text>
            <TextInput style={[styles.input, { height: 80 }]} value={formData.descriptionAr} onChangeText={v => setFormData(p => ({ ...p, descriptionAr: v }))} multiline placeholderTextColor={Colors.textMuted} />

            <Text style={styles.inputLabel}>الوصف بالإنجليزية</Text>
            <TextInput style={[styles.input, { height: 80 }]} value={formData.description} onChangeText={v => setFormData(p => ({ ...p, description: v }))} multiline placeholderTextColor={Colors.textMuted} />

            {/* Hijri Date */}
            <Text style={styles.sectionLabel}>التاريخ الهجري</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>الشهر</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
                  {HIJRI_MONTHS.map((month, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.monthBtn, formData.hijriMonth === idx + 1 && styles.monthBtnActive]}
                      onPress={() => setFormData(p => ({ ...p, hijriMonth: idx + 1 }))}
                    >
                      <Text style={[styles.monthBtnText, formData.hijriMonth === idx + 1 && styles.monthBtnTextActive]}>{month}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>اليوم</Text>
                <TextInput style={styles.input} value={String(formData.hijriDay)} onChangeText={v => setFormData(p => ({ ...p, hijriDay: parseInt(v) || 1 }))} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>يوم النهاية (اختياري)</Text>
                <TextInput style={styles.input} value={formData.hijriDayEnd ? String(formData.hijriDayEnd) : ''} onChangeText={v => setFormData(p => ({ ...p, hijriDayEnd: parseInt(v) || undefined }))} keyboardType="number-pad" placeholder="—" placeholderTextColor={Colors.textMuted} />
              </View>
            </View>

            {/* Type */}
            <Text style={styles.sectionLabel}>نوع المناسبة</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
              {EVENT_TYPES.map(et => (
                <TouchableOpacity
                  key={et.key}
                  style={[styles.typeBtn, formData.type === et.key && { backgroundColor: et.color }]}
                  onPress={() => setFormData(p => ({ ...p, type: et.key, color: et.color }))}
                >
                  <Text style={[styles.typeBtnText, formData.type === et.key && { color: '#fff' }]}>{et.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Importance */}
            <Text style={styles.sectionLabel}>الأهمية</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              {(['major', 'minor'] as const).map(imp => (
                <TouchableOpacity
                  key={imp}
                  style={[styles.typeBtn, formData.importance === imp && { backgroundColor: imp === 'major' ? '#EF4444' : '#9CA3AF' }]}
                  onPress={() => setFormData(p => ({ ...p, importance: imp }))}
                >
                  <Text style={[styles.typeBtnText, formData.importance === imp && { color: '#fff' }]}>{imp === 'major' ? 'رئيسي' : 'فرعي'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Save */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
              {saving ? (
                <ActivityIndicator color={Colors.textLight} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={Colors.textLight} />
                  <Text style={styles.saveBtnText}>حفظ</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', elevation: 2, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: Colors.primary },
  statLabel: { fontSize: 12, color: Colors.textMuted, marginTop: Spacing.xs },
  eventCard: { backgroundColor: Colors.surface, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderRadius: BorderRadius.lg, padding: Spacing.md, elevation: 2, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  eventHeader: { justifyContent: 'space-between', alignItems: 'center' },
  eventInfo: { flex: 1 },
  eventName: { fontSize: 16, fontWeight: 'bold', color: Colors.text, writingDirection: 'rtl' },
  eventNameEn: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  eventMeta: { gap: Spacing.xs, marginTop: Spacing.xs, alignItems: 'center' },
  eventDate: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  typeBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  typeBadgeText: { fontSize: 10, color: '#fff', fontWeight: '600' },
  importanceBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5 },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  inputLabel: { fontSize: 13, color: Colors.textMuted, marginBottom: Spacing.xs, marginTop: Spacing.sm },
  sectionLabel: { fontSize: 15, fontWeight: '600', color: Colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  input: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.sm, fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.border, textAlign: 'right', writingDirection: 'rtl' },
  monthBtn: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, marginRight: Spacing.xs },
  monthBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  monthBtnText: { fontSize: 12, color: Colors.textMuted },
  monthBtnTextActive: { color: Colors.primary, fontWeight: '600' },
  typeBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  typeBtnText: { fontSize: 13, color: Colors.text },
  saveBtn: { backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: BorderRadius.lg, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xl },
  saveBtnText: { fontSize: 16, fontWeight: 'bold', color: Colors.textLight },
});
