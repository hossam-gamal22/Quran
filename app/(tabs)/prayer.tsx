import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Switch,
  Modal,
  Animated,
  Alert,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  fetchPrayerTimesByCoords,
  PrayerTimesData,
  PRAYER_NAMES_AR,
  getNextPrayer,
  getTimeUntilPrayer,
} from '@/lib/prayer-api';
import { getPrayerLocation, savePrayerLocation, getNotificationSettings, saveNotificationSettings } from '@/lib/storage';
import {
  NotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  requestNotificationPermissions,
  checkNotificationPermissions,
  schedulePrayerNotifications,
  cancelAllPrayerNotifications,
  getScheduledNotifications,
} from '@/lib/prayer-notifications';
import * as Location from 'expo-location';

const PRAYER_ORDER = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const NOTIFICATION_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
type NotifPrayer = typeof NOTIFICATION_PRAYERS[number];

const PRAYER_ICONS: Record<string, string> = {
  Fajr: '🌙',
  Sunrise: '🌅',
  Dhuhr: '☀️',
  Asr: '🌤',
  Maghrib: '🌇',
  Isha: '✨',
};

const ADVANCE_OPTIONS = [
  { label: 'عند الأذان', value: 0 },
  { label: '5 دقائق قبل', value: 5 },
  { label: '10 دقائق قبل', value: 10 },
  { label: '15 دقائق قبل', value: 15 },
  { label: '30 دقائق قبل', value: 30 },
];

// ─── Notification Panel ───────────────────────────────────────────────────────
interface NotifPanelProps {
  visible: boolean;
  colors: ReturnType<typeof useColors>;
  notifSettings: NotificationSettings;
  scheduledCount: number;
  onToggleEnabled: (val: boolean) => void;
  onTogglePrayer: (prayer: NotifPrayer, val: boolean) => void;
  onChangeAdvance: (mins: number) => void;
  onClose: () => void;
}

function NotificationPanel({
  visible, colors, notifSettings, scheduledCount,
  onToggleEnabled, onTogglePrayer, onChangeAdvance, onClose,
}: NotifPanelProps) {
  const slideAnim = useRef(new Animated.Value(800)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  if (!visible) return null;

  const s = StyleSheet.create({
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 },
    sheet: {
      position: 'absolute', left: 0, right: 0, bottom: 0,
      backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      maxHeight: '90%', zIndex: 1000,
      shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 20,
    },
    handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.foreground },
    closeBtn: { padding: 6, borderRadius: 20, backgroundColor: colors.surface },
    content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
    // Master toggle
    masterRow: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '12',
      borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.primary + '30',
    },
    masterIcon: { fontSize: 28, marginLeft: 12 },
    masterText: { flex: 1, textAlign: 'right' },
    masterTitle: { fontSize: 16, fontWeight: '800', color: colors.foreground },
    masterSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
    // Status badge
    statusBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: notifSettings.enabled ? colors.primary + '18' : colors.surface,
      borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
      marginBottom: 16, alignSelf: 'flex-end',
      borderWidth: 1, borderColor: notifSettings.enabled ? colors.primary + '40' : colors.border,
    },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: notifSettings.enabled ? '#22C55E' : colors.muted },
    statusText: { fontSize: 13, fontWeight: '600', color: notifSettings.enabled ? colors.primary : colors.muted },
    // Section
    sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.primary, textAlign: 'right', marginBottom: 10, marginTop: 6 },
    // Prayer toggles
    prayerCard: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 16 },
    prayerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
    prayerDivider: { height: 0.5, backgroundColor: colors.border, marginHorizontal: 16 },
    prayerEmoji: { fontSize: 20, marginLeft: 10 },
    prayerName: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.foreground, textAlign: 'right' },
    // Advance options
    advanceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    advanceChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    advanceChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    advanceChipText: { fontSize: 13, fontWeight: '600', color: colors.muted },
    advanceChipTextActive: { color: '#fff' },
    // Tip
    tipBox: { backgroundColor: colors.gold + '18', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.gold + '40', marginTop: 16 },
    tipText: { fontSize: 13, color: colors.foreground, textAlign: 'right', lineHeight: 22 },
  });

  return (
    <>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={s.handle} />
        <View style={s.header}>
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <IconSymbol name="xmark" size={16} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>🔔 إشعارات الصلاة</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
          {/* Status */}
          <View style={s.statusBadge}>
            <View style={s.statusDot} />
            <Text style={s.statusText}>
              {notifSettings.enabled
                ? `مُفعَّل • ${scheduledCount} إشعار مجدول`
                : 'غير مُفعَّل'}
            </Text>
          </View>

          {/* Master Toggle */}
          <View style={s.masterRow}>
            <Switch
              value={notifSettings.enabled}
              onValueChange={onToggleEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
            <View style={s.masterText}>
              <Text style={s.masterTitle}>تفعيل إشعارات الصلاة</Text>
              <Text style={s.masterSub}>استقبل تنبيهاً عند كل أذان</Text>
            </View>
            <Text style={s.masterIcon}>🕌</Text>
          </View>

          {notifSettings.enabled && (
            <>
              {/* Prayer Selection */}
              <Text style={s.sectionTitle}>اختر الصلوات</Text>
              <View style={s.prayerCard}>
                {NOTIFICATION_PRAYERS.map((prayer, index) => (
                  <React.Fragment key={prayer}>
                    {index > 0 && <View style={s.prayerDivider} />}
                    <View style={s.prayerRow}>
                      <Switch
                        value={notifSettings.prayers[prayer]}
                        onValueChange={v => onTogglePrayer(prayer, v)}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor="#fff"
                      />
                      <Text style={s.prayerName}>{PRAYER_NAMES_AR[prayer]}</Text>
                      <Text style={s.prayerEmoji}>{PRAYER_ICONS[prayer]}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>

              {/* Advance Notice */}
              <Text style={s.sectionTitle}>وقت التنبيه</Text>
              <View style={s.advanceGrid}>
                {ADVANCE_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[s.advanceChip, notifSettings.advanceMinutes === opt.value && s.advanceChipActive]}
                    onPress={() => onChangeAdvance(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.advanceChipText, notifSettings.advanceMinutes === opt.value && s.advanceChipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tip */}
              <View style={s.tipBox}>
                <Text style={s.tipText}>
                  💡 الإشعارات تُجدَّل يومياً. تأكد من السماح للتطبيق بالإشعارات في إعدادات هاتفك.
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </Animated.View>
    </>
  );
}

// ─── Prayer Screen ────────────────────────────────────────────────────────────
export default function PrayerScreen() {
  const colors = useColors();
  const [prayerData, setPrayerData] = useState<PrayerTimesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [cityName, setCityName] = useState('');
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [, forceUpdate] = useState(0);

  // Countdown ticker
  useEffect(() => {
    countdownRef.current = setInterval(() => forceUpdate(n => n + 1), 30000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  // Load notification settings
  useEffect(() => {
    const loadNotifSettings = async () => {
      const ns = await getNotificationSettings();
      setNotifSettings(ns);
      const perm = await checkNotificationPermissions();
      setHasPermission(perm);
      if (perm && ns.enabled) {
        const scheduled = await getScheduledNotifications();
        setScheduledCount(scheduled.length);
      }
    };
    loadNotifSettings();
  }, []);

  const loadPrayerTimes = useCallback(async () => {
    setLocationError(false);
    try {
      let location = await getPrayerLocation();
      if (!location && Platform.OS !== 'web') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
          location = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          await savePrayerLocation(location);
          try {
            const geocode = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
            if (geocode.length > 0) setCityName(geocode[0].city || geocode[0].region || '');
          } catch {}
        } else {
          setLocationError(true);
          setLoading(false);
          return;
        }
      } else if (!location) {
        location = { latitude: 21.3891, longitude: 39.8579, city: 'مكة المكرمة' };
        setCityName('مكة المكرمة');
      }
      if (location.city) setCityName(location.city);
      const data = await fetchPrayerTimesByCoords(location.latitude, location.longitude);
      setPrayerData(data);
    } catch {
      setLocationError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrayerTimes();
  }, [loadPrayerTimes]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrayerTimes();
    setRefreshing(false);
  };

  // ─── Notification Handlers ───────────────────────────────────────────────
  const handleToggleEnabled = useCallback(async (val: boolean) => {
    if (val) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'الإذن مطلوب',
          'يرجى السماح للتطبيق بإرسال الإشعارات من إعدادات هاتفك',
          [{ text: 'حسناً', style: 'default' }]
        );
        return;
      }
      setHasPermission(true);
    }

    const updated = { ...notifSettings, enabled: val };
    setNotifSettings(updated);
    await saveNotificationSettings(updated);

    if (val) {
      await schedulePrayerNotifications(updated);
      const scheduled = await getScheduledNotifications();
      setScheduledCount(scheduled.length);
    } else {
      await cancelAllPrayerNotifications();
      setScheduledCount(0);
    }
  }, [notifSettings]);

  const handleTogglePrayer = useCallback(async (prayer: NotifPrayer, val: boolean) => {
    const updated: NotificationSettings = {
      ...notifSettings,
      prayers: { ...notifSettings.prayers, [prayer]: val },
    };
    setNotifSettings(updated);
    await saveNotificationSettings(updated);
    if (updated.enabled) {
      await schedulePrayerNotifications(updated);
      const scheduled = await getScheduledNotifications();
      setScheduledCount(scheduled.length);
    }
  }, [notifSettings]);

  const handleChangeAdvance = useCallback(async (mins: number) => {
    const updated = { ...notifSettings, advanceMinutes: mins };
    setNotifSettings(updated);
    await saveNotificationSettings(updated);
    if (updated.enabled) {
      await schedulePrayerNotifications(updated);
      const scheduled = await getScheduledNotifications();
      setScheduledCount(scheduled.length);
    }
  }, [notifSettings]);

  // ─── Styles ──────────────────────────────────────────────────────────────
  const s = StyleSheet.create({
    header: {
      paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
      borderBottomWidth: 1, borderBottomColor: colors.border,
      flexDirection: 'row', alignItems: 'center',
    },
    headerTexts: { flex: 1 },
    title: { fontSize: 24, fontWeight: '800', color: colors.foreground, textAlign: 'right' },
    subtitle: { fontSize: 13, color: colors.muted, textAlign: 'right', marginTop: 2 },
    notifBtn: {
      padding: 10, borderRadius: 22,
      backgroundColor: notifSettings.enabled ? colors.primary : colors.surface,
      borderWidth: 1, borderColor: notifSettings.enabled ? colors.primary : colors.border,
    },
    notifDot: {
      position: 'absolute', top: 6, right: 6,
      width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E',
    },
    nextPrayerCard: {
      margin: 16, backgroundColor: colors.primary, borderRadius: 22, padding: 24,
      alignItems: 'center',
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
    },
    nextLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 6 },
    nextEmoji: { fontSize: 36, marginBottom: 6 },
    nextName: { fontSize: 30, fontWeight: '800', color: '#fff', marginBottom: 4 },
    nextTime: { fontSize: 20, color: 'rgba(255,255,255,0.9)', marginBottom: 10, fontWeight: '700' },
    countdown: {
      backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20,
      paddingHorizontal: 16, paddingVertical: 6,
    },
    countdownText: { fontSize: 14, color: '#fff', fontWeight: '600' },
    notifBanner: {
      marginHorizontal: 16, marginBottom: 8,
      backgroundColor: colors.primary + '12', borderRadius: 14, padding: 12,
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderWidth: 1, borderColor: colors.primary + '25',
    },
    notifBannerText: { flex: 1, fontSize: 13, color: colors.primary, fontWeight: '600', textAlign: 'right' },
    hijriCard: {
      marginHorizontal: 16, marginBottom: 14,
      backgroundColor: colors.surface, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: colors.border, alignItems: 'center',
    },
    hijriText: { fontSize: 17, fontWeight: '700', color: colors.foreground },
    hijriSub: { fontSize: 12, color: colors.muted, marginTop: 3 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.foreground, textAlign: 'right', marginBottom: 10, paddingHorizontal: 16 },
    prayerItem: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 14, paddingHorizontal: 16,
      borderRadius: 14, marginBottom: 8, marginHorizontal: 16,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    prayerItemActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
    prayerEmoji: { fontSize: 22, marginLeft: 12 },
    prayerName: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.foreground, textAlign: 'right' },
    prayerTime: { fontSize: 18, fontWeight: '800', color: colors.primary },
    activeBadge: {
      backgroundColor: colors.primary, borderRadius: 10,
      paddingHorizontal: 8, paddingVertical: 2, marginRight: 8,
    },
    activeBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
    notifIndicator: { marginLeft: 6 },
    errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    errorText: { fontSize: 16, color: colors.muted, textAlign: 'center', marginTop: 16, lineHeight: 26 },
    retryBtn: {
      marginTop: 20, backgroundColor: colors.primary,
      borderRadius: 20, paddingHorizontal: 24, paddingVertical: 12,
    },
    retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  });

  if (loading) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={s.header}>
          <View style={s.headerTexts}><Text style={s.title}>أوقات الصلاة</Text></View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.muted }}>جارٍ تحميل المواقيت...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (locationError || !prayerData) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={s.header}>
          <View style={s.headerTexts}><Text style={s.title}>أوقات الصلاة</Text></View>
        </View>
        <View style={s.errorContainer}>
          <Text style={{ fontSize: 52 }}>📍</Text>
          <Text style={s.errorText}>يحتاج التطبيق إلى الوصول لموقعك لعرض أوقات الصلاة الصحيحة</Text>
          <TouchableOpacity style={s.retryBtn} onPress={loadPrayerTimes}>
            <Text style={s.retryBtnText}>السماح بالوصول للموقع</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const nextPrayer = getNextPrayer(prayerData.timings);
  const hijri = prayerData.date.hijri;
  const gregorian = prayerData.date.gregorian;

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.notifBtn} onPress={() => setShowNotifPanel(true)}>
          <IconSymbol
            name="bell.fill"
            size={20}
            color={notifSettings.enabled ? '#fff' : colors.muted}
          />
          {notifSettings.enabled && <View style={s.notifDot} />}
        </TouchableOpacity>
        <View style={s.headerTexts}>
          <Text style={s.title}>أوقات الصلاة</Text>
          {cityName ? <Text style={s.subtitle}>📍 {cityName}</Text> : null}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {/* Next Prayer Card */}
        {nextPrayer && (
          <View style={s.nextPrayerCard}>
            <Text style={s.nextLabel}>الصلاة القادمة</Text>
            <Text style={s.nextEmoji}>{PRAYER_ICONS[nextPrayer.name] || '🕌'}</Text>
            <Text style={s.nextName}>{nextPrayer.arabicName}</Text>
            <Text style={s.nextTime}>{nextPrayer.time}</Text>
            <View style={s.countdown}>
              <Text style={s.countdownText}>⏱ {getTimeUntilPrayer(nextPrayer.time)}</Text>
            </View>
          </View>
        )}

        {/* Notification Banner */}
        {notifSettings.enabled ? (
          <TouchableOpacity style={s.notifBanner} onPress={() => setShowNotifPanel(true)} activeOpacity={0.8}>
            <Text style={{ fontSize: 16 }}>🔔</Text>
            <Text style={s.notifBannerText}>الإشعارات مُفعَّلة • {scheduledCount} إشعار مجدول</Text>
            <IconSymbol name="chevron.left" size={14} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[s.notifBanner, { borderColor: colors.gold + '40', backgroundColor: colors.gold + '10' }]} onPress={() => setShowNotifPanel(true)} activeOpacity={0.8}>
            <Text style={{ fontSize: 16 }}>🔕</Text>
            <Text style={[s.notifBannerText, { color: colors.gold }]}>فعّل إشعارات الأذان</Text>
            <IconSymbol name="chevron.left" size={14} color={colors.gold} />
          </TouchableOpacity>
        )}

        {/* Hijri Date */}
        <View style={s.hijriCard}>
          <Text style={s.hijriText}>{hijri.day} {hijri.month.ar} {hijri.year} هـ</Text>
          <Text style={s.hijriSub}>{gregorian.weekday.en} • {gregorian.day} {gregorian.month.en} {gregorian.year}</Text>
        </View>

        {/* All Prayer Times */}
        <Text style={s.sectionTitle}>مواقيت الصلاة</Text>
        {PRAYER_ORDER.map(prayer => {
          const time = prayerData.timings[prayer as keyof typeof prayerData.timings];
          const isNext = nextPrayer?.name === prayer;
          const hasNotif = notifSettings.enabled && notifSettings.prayers[prayer as NotifPrayer];
          return (
            <View key={prayer} style={[s.prayerItem, isNext && s.prayerItemActive]}>
              <Text style={s.prayerTime}>{time}</Text>
              {hasNotif && (
                <Text style={[s.notifIndicator, { color: colors.primary, fontSize: 13, marginRight: 4 }]}>🔔</Text>
              )}
              {isNext && (
                <View style={s.activeBadge}>
                  <Text style={s.activeBadgeText}>التالية</Text>
                </View>
              )}
              <Text style={s.prayerName}>{PRAYER_NAMES_AR[prayer] || prayer}</Text>
              <Text style={s.prayerEmoji}>{PRAYER_ICONS[prayer] || '🕌'}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Notification Panel */}
      <NotificationPanel
        visible={showNotifPanel}
        colors={colors}
        notifSettings={notifSettings}
        scheduledCount={scheduledCount}
        onToggleEnabled={handleToggleEnabled}
        onTogglePrayer={handleTogglePrayer}
        onChangeAdvance={handleChangeAdvance}
        onClose={() => setShowNotifPanel(false)}
      />
    </ScreenContainer>
  );
}
