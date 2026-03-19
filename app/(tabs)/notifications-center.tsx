/**
 * Notifications Center — مركز الإشعارات الشامل
 * يتحكم في: أذان الصلاة / الورد اليومي / سورة الكهف / الآية اليومية
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Platform, Alert, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import { useColors } from '@/hooks/use-colors';
import { useSettings } from '@/contexts/SettingsContext';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { t } from '@/lib/i18n';
import {
  AllNotificationSettings,
  AdhanType,
  ADHAN_AUDIO,
  DEFAULT_ALL_NOTIF,
  getAllNotifSettings,
  saveAllNotifSettings,
  scheduleAllNotifications,
  cancelAllCustomNotifications,
  requestNotifPermission,
  scheduleWirdNotifications,
  scheduleDailyAyahNotification,
} from '@/lib/notifications-manager';

// ─── Time Picker Modal ────────────────────────────────────────────────────────
interface TimePickerProps {
  visible: boolean;
  value: string;
  title: string;
  onSave: (time: string) => void;
  onClose: () => void;
  accentColor: string;
}

function TimePickerModal({ visible, value, title, onSave, onClose, accentColor }: TimePickerProps) {
  const colors = useColors();
  const isRTL = useIsRTL();
  const [hour, setHour] = useState(() => value.split(':')[0] || '07');
  const [minute, setMinute] = useState(() => value.split(':')[1] || '00');

  useEffect(() => {
    if (visible) {
      setHour(value.split(':')[0] || '07');
      setMinute(value.split(':')[1] || '00');
    }
  }, [visible, value]);

  const handleSave = () => {
    const h = Math.min(23, Math.max(0, Number(hour)));
    const m = Math.min(59, Math.max(0, Number(minute)));
    onSave(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1}>
          <View style={{ backgroundColor: 'rgba(120,120,128,0.12)', borderRadius: 20, padding: 24, width: 280, alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.foreground, marginBottom: 20 }}>{title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <View>
                <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center', marginBottom: 4 }}>{t('common.hour')}</Text>
                <TextInput
                  style={{ backgroundColor: colors.background, borderWidth: 2, borderColor: accentColor, borderRadius: 12, width: 70, height: 50, textAlign: 'center', fontSize: 22, fontWeight: '800', color: colors.foreground }}
                  value={hour}
                  onChangeText={t => setHour(t.replace(/\D/, '').slice(0, 2))}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <Text style={{ fontSize: 28, fontWeight: '900', color: accentColor, marginTop: 16 }}>:</Text>
              <View>
                <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center', marginBottom: 4 }}>{t('common.minute')}</Text>
                <TextInput
                  style={{ backgroundColor: colors.background, borderWidth: 2, borderColor: accentColor, borderRadius: 12, width: 70, height: 50, textAlign: 'center', fontSize: 22, fontWeight: '800', color: colors.foreground }}
                  value={minute}
                  onChangeText={t => setMinute(t.replace(/\D/, '').slice(0, 2))}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            </View>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                onPress={onClose}
              >
                <Text style={{ color: colors.muted, fontWeight: '700' }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: accentColor, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                onPress={handleSave}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NotificationsCenterScreen() {
  const colors = useColors();
  const { isDarkMode } = useSettings();
  const isRTL = useIsRTL();
  const [settings, setSettings] = useState<AllNotificationSettings>(DEFAULT_ALL_NOTIF);
  const [hasPermission, setHasPermission] = useState(false);
  const [timePicker, setTimePicker] = useState<{ key: string; value: string; title: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState<AdhanType | null>(null);
  const [previewLoading, setPreviewLoading] = useState<AdhanType | null>(null);
  const previewSoundRef = useRef<Audio.Sound | null>(null);

  const stopPreview = useCallback(async () => {
    if (previewSoundRef.current) {
      try {
        await previewSoundRef.current.stopAsync();
        await previewSoundRef.current.unloadAsync();
      } catch { /* ignore */ }
      previewSoundRef.current = null;
    }
    setPreviewPlaying(null);
    setPreviewLoading(null);
  }, []);

  const playPreview = useCallback(async (type: AdhanType) => {
    // If same type is playing, stop it
    if (previewPlaying === type) {
      await stopPreview();
      return;
    }
    // Stop any current preview
    await stopPreview();

    setPreviewLoading(type);
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: ADHAN_AUDIO[type] },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            stopPreview();
          }
        }
      );
      previewSoundRef.current = sound;
      setPreviewPlaying(type);
    } catch {
      Alert.alert(t('settings.adhanError'), t('settings.adhanErrorDesc'));
    } finally {
      setPreviewLoading(null);
    }
  }, [previewPlaying, stopPreview]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopPreview(); };
  }, [stopPreview]);

  useEffect(() => {
    getAllNotifSettings().then(setSettings);
    requestNotifPermission().then(setHasPermission);
  }, []);

  const updateAndSave = useCallback(async (update: Partial<AllNotificationSettings>) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    const next = { ...settings, ...update };
    setSettings(next);
    setSaving(true);
    await saveAllNotifSettings(next);
    await scheduleAllNotifications(next);
    setSaving(false);
  }, [settings]);

  const updatePrayer = useCallback(async (prayer: keyof AllNotificationSettings['prayers'], value: boolean) => {
    const nextPrayers = { ...settings.prayers, [prayer]: value };
    await updateAndSave({ prayers: nextPrayers });
  }, [settings, updateAndSave]);

  const handleRequestPermission = async () => {
    const granted = await requestNotifPermission();
    setHasPermission(granted);
    if (!granted) {
      Alert.alert(
        t('settings.notifPermissionTitle'),
        t('settings.enableFromSettings'),
        [{ text: t('common.ok') }]
      );
    }
  };

  const s = StyleSheet.create({
    header: {
      paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14,
      borderBottomWidth: 1, borderBottomColor: colors.border,
      alignItems: 'center',
    },
    title: { fontSize: 20, fontWeight: '900', color: colors.foreground, marginBottom: 2 },
    subtitle: { fontSize: 13, color: colors.muted },
    // Permission banner
    permBanner: {
      marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 14,
      backgroundColor: colors.warning + '18', borderWidth: 1, borderColor: colors.warning + '40',
      flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    // Section
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
    sectionIcon: { fontSize: 20 },
    sectionTitle: { fontSize: 15, fontWeight: '900', color: colors.foreground, flex: 1 },
    sectionToggle: {},
    card: { marginHorizontal: 12, backgroundColor: 'rgba(120,120,128,0.12)', borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 8 },
    rowDivider: { height: 0.5, backgroundColor: colors.border, marginHorizontal: 16 },
    rowLabel: { flex: 1, fontSize: 15, color: colors.foreground, textAlign: isRTL ? 'right' : 'left', fontWeight: '600' },
    rowSub: { fontSize: 12, color: colors.muted, textAlign: isRTL ? 'right' : 'left' },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    timeBtn: { backgroundColor: colors.primary + '18', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: colors.primary + '35' },
    timeBtnText: { fontSize: 14, fontWeight: '800', color: colors.primary },
    // Prayer row
    prayerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, gap: 8 },
    prayerEmoji: { fontSize: 18 },
    prayerName: { flex: 1, fontSize: 15, color: colors.foreground, textAlign: isRTL ? 'right' : 'left', fontWeight: '600' },
    // Advance row
    advanceRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12, flexWrap: 'wrap' },
    advChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(120,120,128,0.12)', borderWidth: 1, borderColor: colors.border },
    advChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    advChipText: { fontSize: 13, fontWeight: '700', color: colors.muted },
    advChipTextActive: { color: '#fff' },
    // Radio buttons for adhan type
    radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.muted, alignItems: 'center' as const, justifyContent: 'center' as const },
    radioInner: { width: 12, height: 12, borderRadius: 6 },
    previewBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(120,120,128,0.12)', alignItems: 'center' as const, justifyContent: 'center' as const },
    // Save indicator
    savingBadge: { position: 'absolute', top: 10, ...(isRTL ? { left: 16 } : { right: 16 }), backgroundColor: colors.success + '20', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  });

  const PRAYERS = [
    { key: 'Fajr',    icon: 'weather-night' as const, name: t('prayer.fajr') },
    { key: 'Dhuhr',   icon: 'white-balance-sunny' as const, name: t('prayer.dhuhr') },
    { key: 'Asr',     icon: 'weather-partly-cloudy' as const, name: t('prayer.asr') },
    { key: 'Maghrib', icon: 'weather-sunset-down' as const, name: t('prayer.maghrib') },
    { key: 'Isha',    icon: 'star-four-points' as const, name: t('prayer.isha') },
  ] as const;

  const ADVANCE_OPTIONS = [0, 5, 10, 15] as const;

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right', 'bottom']}>
      <View style={s.header}>
        <Text style={s.title}>{t('settings.notificationsCenter')}</Text>
        <Text style={s.subtitle}>{t('settings.manageReminders')}</Text>
      </View>

      {saving && (
        <View style={s.savingBadge}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.success }}>{`✓ ${t('settings.saved')}`}</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>

        {/* Permission Banner */}
        {!hasPermission && (
          <TouchableOpacity style={[s.permBanner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={handleRequestPermission}>
            <MaterialCommunityIcons name="alert" size={22} color={colors.warning} />
            <Text style={{ flex: 1, fontSize: 13, color: colors.warning, fontWeight: '600', textAlign: isRTL ? 'right' : 'left' }}>
              {t('settings.enableNotifPermission')}
            </Text>
          </TouchableOpacity>
        )}

        {/* ── 1. ADHAN ─────────────────────────────────────── */}
        <View style={[s.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Switch
            value={settings.adhanEnabled}
            onValueChange={v => updateAndSave({ adhanEnabled: v })}
            trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: colors.primary }}
            thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
            ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
          />
          <View style={{ flex: 1 }} />
          <Text style={s.sectionTitle}>{t('settings.adhanPrayer')}</Text>
          <MaterialCommunityIcons name="mosque" size={20} color={colors.primary} />
        </View>

        <View style={[s.card, !settings.adhanEnabled && { opacity: 0.5 }]}>
          {PRAYERS.map((p, idx) => (
            <View key={p.key}>
              {idx > 0 && <View style={s.rowDivider} />}
              <View style={[s.prayerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Switch
                  value={settings.prayers[p.key]}
                  onValueChange={v => updatePrayer(p.key, v)}
                  disabled={!settings.adhanEnabled}
                  trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: colors.primary }}
                  thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                  ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
                />
                <View style={{ flex: 1 }} />
                <Text style={s.prayerName}>{p.name}</Text>
                <MaterialCommunityIcons name={p.icon} size={18} color={colors.textLight} />
              </View>
            </View>
          ))}

          {/* Advance minutes */}
          <View style={s.rowDivider} />
          <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted, textAlign: isRTL ? 'right' : 'left', marginBottom: 8 }}>
              {`⏱️ ${t('settings.advanceReminder')}`}
            </Text>
          </View>
          <View style={s.advanceRow}>
            {ADVANCE_OPTIONS.map(mins => (
              <TouchableOpacity
                key={mins}
                style={[s.advChip, settings.adhanAdvanceMinutes === mins && s.advChipActive]}
                onPress={() => updateAndSave({ adhanAdvanceMinutes: mins })}
                disabled={!settings.adhanEnabled}
              >
                <Text style={[s.advChipText, settings.adhanAdvanceMinutes === mins && s.advChipTextActive]}>
                  {mins === 0 ? t('settings.atAdhanTime') : `${mins} ${t('settings.minutesBefore')}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Adhan Type Selection */}
          <View style={s.rowDivider} />
          <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted, textAlign: isRTL ? 'right' : 'left', marginBottom: 8 }}>
              {`🔊 ${t('settings.adhanType')}`}
            </Text>
          </View>

          {/* Full Adhan Option */}
          <TouchableOpacity
            style={[s.prayerRow, { flexDirection: isRTL ? 'row-reverse' : 'row', paddingVertical: 10 }]}
            onPress={() => updateAndSave({ adhanType: 'full' })}
            disabled={!settings.adhanEnabled}
            activeOpacity={0.7}
          >
            <TouchableOpacity
              onPress={() => playPreview('full')}
              disabled={!settings.adhanEnabled}
              style={s.previewBtn}
              activeOpacity={0.6}
            >
              {previewLoading === 'full' ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MaterialCommunityIcons name={previewPlaying === 'full' ? 'stop' : 'play'} size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[s.prayerName, { fontWeight: '700' }]}>{t('settings.fullAdhan')}</Text>
              <Text style={{ fontSize: 11, color: colors.muted, textAlign: isRTL ? 'right' : 'left' }}>
                {t('settings.fullAdhanDesc')}
              </Text>
            </View>
            <View style={[s.radioOuter, settings.adhanType === 'full' && { borderColor: colors.primary }]}>
              {settings.adhanType === 'full' && <View style={[s.radioInner, { backgroundColor: colors.primary }]} />}
            </View>
          </TouchableOpacity>

          <View style={s.rowDivider} />

          {/* Simple Adhan Option */}
          <TouchableOpacity
            style={[s.prayerRow, { flexDirection: isRTL ? 'row-reverse' : 'row', paddingVertical: 10, paddingBottom: 14 }]}
            onPress={() => updateAndSave({ adhanType: 'simple' })}
            disabled={!settings.adhanEnabled}
            activeOpacity={0.7}
          >
            <TouchableOpacity
              onPress={() => playPreview('simple')}
              disabled={!settings.adhanEnabled}
              style={s.previewBtn}
              activeOpacity={0.6}
            >
              {previewLoading === 'simple' ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MaterialCommunityIcons name={previewPlaying === 'simple' ? 'stop' : 'play'} size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[s.prayerName, { fontWeight: '700' }]}>{t('settings.simpleAdhan')}</Text>
              <Text style={{ fontSize: 11, color: colors.muted, textAlign: isRTL ? 'right' : 'left' }}>
                {t('settings.simpleAdhanDesc')}
              </Text>
            </View>
            <View style={[s.radioOuter, settings.adhanType === 'simple' && { borderColor: colors.primary }]}>
              {settings.adhanType === 'simple' && <View style={[s.radioInner, { backgroundColor: colors.primary }]} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* ── 2. WIRD DAILY ────────────────────────────────── */}
        <View style={[s.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Switch
            value={settings.wirdEnabled}
            onValueChange={v => updateAndSave({ wirdEnabled: v })}
            trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#D97706' }}
            thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
            ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
          />
          <View style={{ flex: 1 }} />
          <Text style={s.sectionTitle}>{t('settings.dailyWird')}</Text>
          <MaterialCommunityIcons name="counter" size={20} color="#D97706" />
        </View>

        <View style={[s.card, !settings.wirdEnabled && { opacity: 0.5 }]}>
          <View style={[s.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={s.rowRight}>
              <TouchableOpacity
                style={s.timeBtn}
                onPress={() => setTimePicker({ key: 'wirdMorningTime', value: settings.wirdMorningTime, title: t('settings.morningWirdTime') })}
                disabled={!settings.wirdEnabled}
              >
                <Text style={s.timeBtnText}>{settings.wirdMorningTime}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>{t('settings.morningWird')}</Text>
              <Text style={s.rowSub}>{t('settings.morningAzkar')}</Text>
            </View>
            <MaterialCommunityIcons name="weather-sunset-up" size={20} color="#D97706" />
          </View>
          <View style={s.rowDivider} />
          <View style={[s.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={s.rowRight}>
              <TouchableOpacity
                style={s.timeBtn}
                onPress={() => setTimePicker({ key: 'wirdEveningTime', value: settings.wirdEveningTime, title: t('settings.eveningWirdTime') })}
                disabled={!settings.wirdEnabled}
              >
                <Text style={s.timeBtnText}>{settings.wirdEveningTime}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>{t('settings.eveningWird')}</Text>
              <Text style={s.rowSub}>{t('settings.eveningAzkar')}</Text>
            </View>
            <MaterialCommunityIcons name="weather-sunset-down" size={20} color="#D97706" />
          </View>
        </View>

        {/* ── 3. SURAT AL-KAHF ─────────────────────────────── */}
        <View style={[s.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Switch
            value={settings.kahfEnabled}
            onValueChange={v => updateAndSave({ kahfEnabled: v })}
            trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#7C3AED' }}
            thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
            ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
          />
          <View style={{ flex: 1 }} />
          <Text style={s.sectionTitle}>{t('settings.surahKahf')}</Text>
          <MaterialCommunityIcons name="book-open-variant" size={20} color="#7C3AED" />
        </View>

        <View style={[s.card, !settings.kahfEnabled && { opacity: 0.5 }]}>
          <View style={[s.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={s.rowRight}>
              <TouchableOpacity
                style={[s.timeBtn, { borderColor: '#7C3AED40', backgroundColor: '#7C3AED18' }]}
                onPress={() => setTimePicker({ key: 'kahfTime', value: settings.kahfTime, title: t('settings.kahfReminderTime') })}
                disabled={!settings.kahfEnabled}
              >
                <Text style={[s.timeBtnText, { color: '#7C3AED' }]}>{settings.kahfTime}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>{t('settings.fridayReminder')}</Text>
              <Text style={s.rowSub}>{t('settings.everyFriday')}</Text>
            </View>
            <MaterialCommunityIcons name="calendar" size={20} color="#7C3AED" />
          </View>
        </View>

        {/* ── 4. DAILY AYAH ────────────────────────────────── */}
        <View style={[s.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Switch
            value={settings.dailyAyahEnabled}
            onValueChange={v => updateAndSave({ dailyAyahEnabled: v })}
            trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0EA5E9' }}
            thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
            ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
          />
          <View style={{ flex: 1 }} />
          <Text style={s.sectionTitle}>{t('home.dailyVerse')}</Text>
          <MaterialCommunityIcons name="star-four-points" size={20} color="#0EA5E9" />
        </View>

        <View style={[s.card, !settings.dailyAyahEnabled && { opacity: 0.5 }]}>
          <View style={[s.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={s.rowRight}>
              <TouchableOpacity
                style={[s.timeBtn, { borderColor: '#0EA5E940', backgroundColor: '#0EA5E918' }]}
                onPress={() => setTimePicker({ key: 'dailyAyahTime', value: settings.dailyAyahTime, title: t('settings.dailyAyahTime') })}
                disabled={!settings.dailyAyahEnabled}
              >
                <Text style={[s.timeBtnText, { color: '#0EA5E9' }]}>{settings.dailyAyahTime}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>{t('settings.dailyVerseLabel')}</Text>
              <Text style={s.rowSub}>{t('settings.dailyVerseDesc')}</Text>
            </View>
            <MaterialCommunityIcons name="star" size={20} color="#0EA5E9" />
          </View>
        </View>

        {/* ── Status Summary ────────────────────────────────── */}
        <View style={{ marginHorizontal: 12, marginTop: 20, padding: 16, backgroundColor: 'rgba(120,120,128,0.12)', borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.foreground, textAlign: isRTL ? 'right' : 'left', marginBottom: 10 }}>
            {t('settings.activeSummary')}
          </Text>
          {[
            { on: settings.adhanEnabled, label: t('settings.adhanPrayer'), icon: 'mosque' as const },
            { on: settings.wirdEnabled, label: t('settings.dailyWirdTwice'), icon: 'counter' as const },
            { on: settings.kahfEnabled, label: t('settings.kahfFriday'), icon: 'book-open-variant' as const },
            { on: settings.dailyAyahEnabled, label: t('home.dailyVerse'), icon: 'star-four-points' as const },
          ].map((item, i) => (
            <View key={i} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.on ? colors.success : colors.border }} />
              <MaterialCommunityIcons name={item.icon} size={16} color={item.on ? colors.foreground : colors.muted} />
              <Text style={{ flex: 1, fontSize: 13, color: item.on ? colors.foreground : colors.muted, textAlign: isRTL ? 'right' : 'left' }}>
                {item.label}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: item.on ? colors.success : colors.muted }}>
                {item.on ? t('settings.active') : t('settings.inactive')}
              </Text>
            </View>
          ))}
        </View>

      </ScrollView>

      {/* Time Picker Modal */}
      {timePicker && (
        <TimePickerModal
          visible={true}
          value={timePicker.value}
          title={timePicker.title}
          accentColor={colors.primary}
          onClose={() => setTimePicker(null)}
          onSave={async (time) => {
            await updateAndSave({ [timePicker.key]: time } as any);
            setTimePicker(null);
          }}
        />
      )}
    </ScreenContainer>
  );
}
