import React, { useState, useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSettings } from '@/lib/settings-context';
import { RECITERS, TRANSLATION_EDITIONS } from '@/lib/quran-api';
import { CALCULATION_METHODS } from '@/lib/prayer-api';
import { useThemeContext } from '@/lib/theme-provider';
import { useRouter } from 'expo-router';
import { getNotificationSettings } from '@/lib/storage';
import { NotificationSettings } from '@/lib/prayer-notifications';

type ModalType = 'reciter' | 'translation' | 'method' | 'fontSize' | null;

export default function SettingsScreen() {
  const colors = useColors();
  const { settings, updateSettings } = useSettings();
  const { colorScheme, setColorScheme } = useThemeContext();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const router = useRouter();
  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null);

  useEffect(() => {
    getNotificationSettings().then(setNotifSettings);
  }, []);

  const s = StyleSheet.create({
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: { fontSize: 24, fontWeight: '700', color: colors.foreground, textAlign: 'right' },
    section: { paddingHorizontal: 20, marginTop: 24 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
      textAlign: 'right',
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowDivider: {
      height: 0.5,
      backgroundColor: colors.border,
      marginHorizontal: 16,
    },
    rowLabel: { flex: 1, fontSize: 16, color: colors.foreground, textAlign: 'right' },
    rowValue: { fontSize: 14, color: colors.muted, marginLeft: 8 },
    rowIcon: { marginLeft: 4 },
    themeOptions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 8,
    },
    themeBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    themeBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    themeBtnText: { fontSize: 13, fontWeight: '600', color: colors.muted },
    themeBtnTextActive: { color: '#fff' },
    fontSizeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    fontSizeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fontSizeText: { flex: 1, textAlign: 'center', fontSize: settings.fontSize, color: colors.foreground },
    fontSizeLabel: { fontSize: 14, color: colors.muted, textAlign: 'right' },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 40,
      maxHeight: '70%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, textAlign: 'right' },
    modalItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    modalItemText: { flex: 1, fontSize: 16, color: colors.foreground, textAlign: 'right' },
    checkIcon: { marginLeft: 8 },
    versionText: {
      textAlign: 'center',
      color: colors.muted,
      fontSize: 13,
      marginTop: 24,
      marginBottom: 8,
    },
    bismillahPreview: {
      fontSize: settings.fontSize,
      color: colors.primary,
      textAlign: 'center',
      padding: 12,
      lineHeight: settings.fontSize * 1.8,
    },
  });

  const currentReciter = RECITERS.find(r => r.identifier === settings.reciter);
  const currentTranslation = TRANSLATION_EDITIONS.find(t => t.identifier === settings.translationEdition);
  const currentMethod = CALCULATION_METHODS.find(m => m.id === settings.calculationMethod);

  const THEME_OPTIONS = [
    { key: 'light', label: '☀️ فاتح' },
    { key: 'dark', label: '🌙 داكن' },
    { key: 'auto', label: '🔄 تلقائي' },
  ];

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={s.header}>
        <Text style={s.title}>الإعدادات</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Theme */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>المظهر</Text>
          <View style={s.themeOptions}>
            {THEME_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[s.themeBtn, colorScheme === opt.key && s.themeBtnActive]}
                onPress={() => {
                  setColorScheme(opt.key as 'light' | 'dark');
                  updateSettings({ theme: opt.key as 'light' | 'dark' | 'auto' });
                }}
                activeOpacity={0.7}
              >
                <Text style={[s.themeBtnText, colorScheme === opt.key && s.themeBtnTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quran Reading Settings */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>إعدادات القراءة</Text>
          <View style={s.card}>
            {/* Font Size */}
            <View style={s.fontSizeRow}>
              <TouchableOpacity
                style={s.fontSizeBtn}
                onPress={() => updateSettings({ fontSize: Math.max(16, settings.fontSize - 2) })}
              >
                <IconSymbol name="minus" size={18} color={colors.primary} />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={s.fontSizeLabel}>حجم الخط</Text>
                <Text style={[s.fontSizeText, { fontSize: 20 }]}>{settings.fontSize}</Text>
              </View>
              <TouchableOpacity
                style={s.fontSizeBtn}
                onPress={() => updateSettings({ fontSize: Math.min(42, settings.fontSize + 2) })}
              >
                <IconSymbol name="plus" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
            {/* Preview */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 12, borderTopWidth: 0.5, borderTopColor: colors.border }}>
              <Text style={s.bismillahPreview}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</Text>
            </View>
            <View style={s.rowDivider} />
            {/* Translation Toggle */}
            <View style={s.row}>
              <Switch
                value={settings.showTranslation}
                onValueChange={v => updateSettings({ showTranslation: v })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
              <Text style={[s.rowLabel, { marginLeft: 12 }]}>إظهار الترجمة</Text>
            </View>
            <View style={s.rowDivider} />
            {/* Ayah Numbers Toggle */}
            <View style={s.row}>
              <Switch
                value={settings.showAyahNumbers}
                onValueChange={v => updateSettings({ showAyahNumbers: v })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
              <Text style={[s.rowLabel, { marginLeft: 12 }]}>إظهار أرقام الآيات</Text>
            </View>
            <View style={s.rowDivider} />
            {/* Continuous Play Toggle */}
            <View style={s.row}>
              <Switch
                value={settings.continuousPlay}
                onValueChange={v => updateSettings({ continuousPlay: v })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
              <Text style={[s.rowLabel, { marginLeft: 12 }]}>تشغيل متواصل للتلاوة</Text>
            </View>
            <View style={s.rowDivider} />
            {/* Translation Language */}
            <TouchableOpacity style={s.row} onPress={() => setActiveModal('translation')} activeOpacity={0.7}>
              <IconSymbol name="chevron.left" size={16} color={colors.muted} style={s.rowIcon} />
              <Text style={s.rowValue} numberOfLines={1}>{currentTranslation?.name || ''}</Text>
              <Text style={s.rowLabel}>لغة الترجمة</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Audio Settings */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>إعدادات الصوت</Text>
          <View style={s.card}>
            <TouchableOpacity style={s.row} onPress={() => setActiveModal('reciter')} activeOpacity={0.7}>
              <IconSymbol name="chevron.left" size={16} color={colors.muted} style={s.rowIcon} />
              <Text style={s.rowValue}>{currentReciter?.name || ''}</Text>
              <Text style={s.rowLabel}>القارئ</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Prayer Settings */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>إعدادات الصلاة</Text>
          <View style={s.card}>
            <TouchableOpacity style={s.row} onPress={() => setActiveModal('method')} activeOpacity={0.7}>
              <IconSymbol name="chevron.left" size={16} color={colors.muted} style={s.rowIcon} />
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, color: colors.muted, textAlign: 'left' }}>
                {currentMethod?.name || ''}
              </Text>
              <Text style={[s.rowLabel, { flex: 0, marginRight: 8 }]}>طريقة الحساب</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notification Settings Link */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>إشعارات الأذان</Text>
          <View style={s.card}>
            <TouchableOpacity
              style={s.row}
              onPress={() => router.push('/(tabs)/prayer')}
              activeOpacity={0.7}
            >
              <IconSymbol name="chevron.left" size={16} color={colors.muted} style={s.rowIcon} />
              <View style={[{ width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
                { backgroundColor: notifSettings?.enabled ? '#22C55E' : colors.border }
              ]} />
              <Text style={s.rowValue}>{notifSettings?.enabled ? 'مُفعَّل' : 'غير مُفعَّل'}</Text>
              <Text style={s.rowLabel}>إشعارات أوقات الصلاة</Text>
            </TouchableOpacity>
            {notifSettings?.enabled && (
              <>
                <View style={s.rowDivider} />
                <View style={s.row}>
                  <Text style={s.rowValue}>{Object.values(notifSettings.prayers).filter(Boolean).length} صلوات</Text>
                  <Text style={s.rowLabel}>الصلوات المُفعَّلة</Text>
                </View>
                <View style={s.rowDivider} />
                <View style={s.row}>
                  <Text style={s.rowValue}>{notifSettings.advanceMinutes === 0 ? 'عند الأذان' : `${notifSettings.advanceMinutes} دقيقة قبل`}</Text>
                  <Text style={s.rowLabel}>وقت التنبيه</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* ── Color Customization ──────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🎨 تخصيص الألوان</Text>
          <View style={s.card}>
            <View style={s.row}>
              <Text style={s.rowLabel}>اختر اللون الرئيسي للتطبيق</Text>
            </View>
            <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { color: '#1B6B3A', name: 'أخضر إسلامي' },
                  { color: '#0F4C81', name: 'أزرق ملكي' },
                  { color: '#78350F', name: 'بني ذهبي' },
                  { color: '#6B21A8', name: 'بنفسجي' },
                  { color: '#0E7490', name: 'فيروزي' },
                  { color: '#991B1B', name: 'أحمر عميق' },
                  { color: '#1E3A5F', name: 'نيلي' },
                  { color: '#374151', name: 'رصاصي' },
                ].map(item => (
                  <TouchableOpacity
                    key={item.color}
                    style={{
                      width: 44, height: 44, borderRadius: 22,
                      backgroundColor: item.color,
                      borderWidth: 3,
                      borderColor: colors.primary === item.color ? '#fff' : 'transparent',
                      shadowColor: item.color,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.5,
                      shadowRadius: 4,
                      elevation: 4,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={() => {
                      import('@/theme.config').then(tc => {
                        // Colors are theme-based; show info to user
                        Alert.alert(
                          '🎨 ' + item.name,
                          'لتغيير اللون الرئيسي، عدّل ملف theme.config.js:\n\nprimary: { light: \'' + item.color + '\', dark: ... }',
                          [{ text: 'حسناً' }]
                        );
                      }).catch(() => {});
                    }}
                  >
                    {colors.primary.toLowerCase().includes(item.color.replace('#','').toLowerCase().slice(0,4)) && (
                      <Text style={{ color: '#fff', fontSize: 16 }}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'right', marginTop: 8 }}>
                💡 اضغط على أي لون لمعرفة كيفية تطبيقه
              </Text>
            </View>
          </View>
        </View>

        {/* ── Notifications Center ──────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🔔 الإشعارات والتذكيرات</Text>
          <View style={s.card}>
            <TouchableOpacity
              style={s.row}
              onPress={() => router.push('/(tabs)/notifications-center')}
              activeOpacity={0.7}
            >
              <IconSymbol name="chevron.left" size={16} color={colors.muted} style={s.rowIcon} />
              <Text style={s.rowValue}>ضبط الأوقات</Text>
              <Text style={s.rowLabel}>مركز الإشعارات الشامل</Text>
              <Text style={{ fontSize: 20, marginRight: 8 }}>🔔</Text>
            </TouchableOpacity>
            <View style={s.rowDivider} />
            <TouchableOpacity
              style={s.row}
              onPress={() => router.push('/(tabs)/notifications-center')}
              activeOpacity={0.7}
            >
              <IconSymbol name="chevron.left" size={16} color={colors.muted} style={s.rowIcon} />
              <Text style={[s.rowValue, { color: '#1B6B3A' }]}>متاح</Text>
              <Text style={s.rowLabel}>أذان الصلاة 🕌</Text>
            </TouchableOpacity>
            <View style={s.rowDivider} />
            <TouchableOpacity
              style={s.row}
              onPress={() => router.push('/(tabs)/notifications-center')}
              activeOpacity={0.7}
            >
              <IconSymbol name="chevron.left" size={16} color={colors.muted} style={s.rowIcon} />
              <Text style={[s.rowValue, { color: '#D97706' }]}>متاح</Text>
              <Text style={s.rowLabel}>الورد اليومي 📿</Text>
            </TouchableOpacity>
            <View style={s.rowDivider} />
            <TouchableOpacity
              style={s.row}
              onPress={() => router.push('/(tabs)/notifications-center')}
              activeOpacity={0.7}
            >
              <IconSymbol name="chevron.left" size={16} color={colors.muted} style={s.rowIcon} />
              <Text style={[s.rowValue, { color: '#7C3AED' }]}>متاح</Text>
              <Text style={s.rowLabel}>سورة الكهف الجمعة 📖</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* About */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>حول التطبيق</Text>
          <View style={s.card}>
            <View style={s.row}>
              <Text style={s.rowValue}>1.0.0</Text>
              <Text style={s.rowLabel}>الإصدار</Text>
            </View>
            <View style={s.rowDivider} />
            <View style={s.row}>
              <Text style={s.rowLabel}>بيانات القرآن الكريم من مصادر موثوقة</Text>
            </View>
            <View style={s.rowDivider} />
            <View style={s.row}>
              <Text style={s.rowLabel}>أوقات الصلاة محسوبة بدقة</Text>
            </View>
            <View style={s.rowDivider} />
            <View style={s.row}>
              <Text style={s.rowLabel}>التلاوات من قراء معتمدين</Text>
            </View>
            <View style={s.rowDivider} />
            <TouchableOpacity
              style={s.row}
              onPress={() => Linking.openURL('https://www.facebook.com/HossamGamal59/')}
              activeOpacity={0.7}
            >
              <IconSymbol name="chevron.left" size={16} color={colors.muted} style={s.rowIcon} />
              <Text style={[s.rowValue, { color: '#1877F2' }]}>تواصل معنا</Text>
              <Text style={s.rowLabel}>👨‍💻 المطور</Text>
            </TouchableOpacity>
            <View style={s.rowDivider} />
            <TouchableOpacity
              style={s.row}
              onPress={() => Linking.openURL('https://www.facebook.com/HossamGamal59/')}
              activeOpacity={0.7}
            >
              <IconSymbol name="chevron.left" size={16} color={colors.muted} style={s.rowIcon} />
              <Text style={[s.rowValue, { color: '#1877F2', fontSize: 12 }]}>HossamGamal59</Text>
              <Text style={s.rowLabel}>Facebook</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={s.versionText}>القرآن الكريم v7.0 © 2025 — بتوفيق من الله</Text>
      </ScrollView>

      {/* Reciter Modal */}
      <Modal visible={activeModal === 'reciter'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setActiveModal(null)}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <IconSymbol name="xmark" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={s.modalTitle}>اختر القارئ</Text>
            </View>
            <FlatList
              data={RECITERS}
              keyExtractor={item => item.identifier}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.modalItem}
                  onPress={() => { updateSettings({ reciter: item.identifier }); setActiveModal(null); }}
                  activeOpacity={0.7}
                >
                  {settings.reciter === item.identifier && (
                    <IconSymbol name="checkmark" size={18} color={colors.primary} style={s.checkIcon} />
                  )}
                  <Text style={s.modalItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Translation Modal */}
      <Modal visible={activeModal === 'translation'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setActiveModal(null)}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <IconSymbol name="xmark" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={s.modalTitle}>اختر الترجمة أو التفسير</Text>
            </View>
            <FlatList
              data={TRANSLATION_EDITIONS}
              keyExtractor={item => item.identifier}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.modalItem}
                  onPress={() => { updateSettings({ translationEdition: item.identifier }); setActiveModal(null); }}
                  activeOpacity={0.7}
                >
                  {settings.translationEdition === item.identifier && (
                    <IconSymbol name="checkmark" size={18} color={colors.primary} style={s.checkIcon} />
                  )}
                  <Text style={s.modalItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Calculation Method Modal */}
      <Modal visible={activeModal === 'method'} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setActiveModal(null)}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <IconSymbol name="xmark" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={s.modalTitle}>طريقة حساب أوقات الصلاة</Text>
            </View>
            <FlatList
              data={CALCULATION_METHODS}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.modalItem}
                  onPress={() => { updateSettings({ calculationMethod: item.id }); setActiveModal(null); }}
                  activeOpacity={0.7}
                >
                  {settings.calculationMethod === item.id && (
                    <IconSymbol name="checkmark" size={18} color={colors.primary} style={s.checkIcon} />
                  )}
                  <Text style={s.modalItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>
  );
}
