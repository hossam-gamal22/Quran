import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';

import { fontBold, fontMedium, fontSemiBold } from '@/lib/fonts';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { uiText } from '@/lib/ui-text';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';
import { useSmartAlarm } from '@/contexts/SmartAlarmContext';
import { Dropdown, type DropdownOption } from '@/components/smart-alarm/Dropdown';
import { SuhoorDatePicker } from '@/components/smart-alarm/SuhoorDatePicker';
import {
  ALARM_RINGTONES,
  ADHAN_VOICES,
  type AlarmRingtoneKey,
  type ChallengeType,
  type Difficulty,
  type SnoozeDuration,
} from '@/lib/smart-alarm/types';

const FAJR_OFFSETS = [-15, -10, -5, 0, 5, 10, 15] as const;
const SUHOOR_OFFSETS = [20, 30, 45, 60, 90] as const;
const SNOOZE_OPTIONS: SnoozeDuration[] = [0, 3, 5, 7, 10];

// Static maps for sound preview playback (require() must be a literal path)
const RINGTONE_PREVIEW_ASSETS: Record<string, number> = {
  alarm_classic: require('../assets/sounds/alarm_classic.mp3'),
  alarm_digital: require('../assets/sounds/alarm_digital.mp3'),
  alarm_buzzer: require('../assets/sounds/alarm_buzzer.mp3'),
  alarm_radar: require('../assets/sounds/alarm_radar.mp3'),
  alarm_chime: require('../assets/sounds/alarm_chime.mp3'),
};

const ADHAN_PREVIEW_ASSETS: Record<string, number> = {
  makkah: require('../assets/sounds/makkah.mp3'),
  madinah: require('../assets/sounds/madinah.mp3'),
  alaqsa: require('../assets/sounds/alaqsa.mp3'),
  mishary: require('../assets/sounds/mishary.mp3'),
  abdulbasit: require('../assets/sounds/abdulbasit.mp3'),
};

// Suhoor uses the same alarm ringtones as Fajr — defined inline by ALARM_RINGTONES.

type ChallengeIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const CHALLENGE_OPTIONS: { value: ChallengeType; ar: string; en: string; icon: ChallengeIcon }[] = [
  { value: 'none', ar: 'منبه عادي', en: 'Standard alarm', icon: 'close' },
  { value: 'math', ar: 'حساب', en: 'Math', icon: 'calculator' },
  { value: 'shake', ar: 'هز الجهاز', en: 'Shake', icon: 'cellphone-arrow-down' },
  { value: 'questions', ar: 'أسئلة دينية', en: 'Religious Q&A', icon: 'help-circle-outline' },
  { value: 'memory', ar: 'الذاكرة', en: 'Memory', icon: 'brain' },
  { value: 'random', ar: 'تحدي عشوائي', en: 'Random', icon: 'shuffle-variant' },
];

const DIFFICULTY_OPTIONS: { value: Difficulty; ar: string; en: string }[] = [
  { value: 'easy', ar: 'سهل', en: 'Easy' },
  { value: 'medium', ar: 'متوسط', en: 'Medium' },
  { value: 'hard', ar: 'صعب', en: 'Hard' },
];

// ─── helpers ───────────────────────────────────────────────────────────────

function formatOffsetLabel(offset: number): string {
  if (offset === 0) return uiText({ ar: 'وقت الفجر بالضبط', en: 'At Fajr' });
  if (offset > 0) return uiText({ ar: `قبل الفجر بـ ${offset} د`, en: `${offset} min before` });
  const abs = Math.abs(offset);
  return uiText({ ar: `بعد الفجر بـ ${abs} د`, en: `${abs} min after` });
}

function formatSuhoorOffset(offset: number): string {
  return uiText({ ar: `قبل الفجر بـ ${offset} د`, en: `${offset} min before Fajr` });
}

function SectionTitle({ children }: { children: string }) {
  const colors = useColors();
  const isRTL = useIsRTL();
  return (
    <Text
      style={[
        styles.sectionTitle,
        { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
      ]}
    >
      {children}
    </Text>
  );
}

function GlassCard({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const isDarkMode = (colors as any).isDarkMode as boolean;
  return (
    <View style={styles.cardWrap}>
      {Platform.OS === 'ios' && (
        <BlurView
          intensity={70}
          tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.55)',
            borderRadius: 18,
          },
        ]}
      />
      <View style={styles.cardInner}>{children}</View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

// ─── Screen ────────────────────────────────────────────────────────────────

export default function SmartAlarmScreen() {
  const router = useRouter();
  const colors = useColors();
  const isRTL = useIsRTL();
  const { config, setFajrConfig, setSuhoorConfig, nextFajrAlarm, nextSuhoorAlarm } =
    useSmartAlarm();

  const fajr = config.fajr;
  const suhoor = config.suhoor;
  const requiresChallenge = fajr.challenge !== 'none';

  const nextFajrLabel = useMemo(
    () => (nextFajrAlarm ? nextFajrAlarm.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
    [nextFajrAlarm],
  );
  const nextSuhoorLabel = useMemo(
    () => (nextSuhoorAlarm ? nextSuhoorAlarm.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
    [nextSuhoorAlarm],
  );

  // ── Build dropdown options ──
  const fajrOffsetOptions: DropdownOption<number>[] = FAJR_OFFSETS.map((o) => ({
    value: o,
    label: formatOffsetLabel(o),
  }));

  const ringtoneOptions: DropdownOption<AlarmRingtoneKey>[] = ALARM_RINGTONES.map((r) => ({
    value: r.key,
    label: uiText({ ar: r.ar, en: r.en }),
  }));

  const adhanOptions: DropdownOption<string>[] = ADHAN_VOICES.map((v) => ({
    value: v.key,
    label: uiText({ ar: v.ar, en: v.en }),
  }));

  const challengeOptions: DropdownOption<ChallengeType>[] = CHALLENGE_OPTIONS.map((c) => ({
    value: c.value,
    label: uiText({ ar: c.ar, en: c.en }),
    icon: c.icon,
  }));

  const difficultyOptions: DropdownOption<Difficulty>[] = DIFFICULTY_OPTIONS.map((d) => ({
    value: d.value,
    label: uiText({ ar: d.ar, en: d.en }),
  }));

  const suhoorOffsetOptions: DropdownOption<number>[] = SUHOOR_OFFSETS.map((o) => ({
    value: o,
    label: formatSuhoorOffset(o),
  }));

  // Suhoor uses the same ringtone catalog — alias the Fajr options.
  const suhoorRingtoneOptions = ringtoneOptions;

  // Fasting-days calendar state. We keep a local draft while the picker is open
  // and only persist + reschedule once on close — avoids a reschedule per tap.
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);
  const [draftDates, setDraftDates] = React.useState<string[]>(suhoor.selectedDates);

  const openDatePicker = () => {
    setDraftDates(suhoor.selectedDates);
    setDatePickerOpen(true);
  };
  const closeDatePicker = () => {
    setDatePickerOpen(false);
    // Persist only if changed.
    const a = [...suhoor.selectedDates].sort().join(',');
    const b = [...draftDates].sort().join(',');
    if (a !== b) setSuhoorConfig({ selectedDates: draftDates });
  };

  const futureSuhoorDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return suhoor.selectedDates.filter((d) => {
      const dt = new Date(`${d}T00:00:00`);
      return dt.getTime() >= today.getTime();
    }).length;
  }, [suhoor.selectedDates]);

  // ── Sound preview (ringtone + adhan) ──
  const previewSoundRef = useRef<Audio.Sound | null>(null);

  const stopPreview = useCallback(async () => {
    if (previewSoundRef.current) {
      try { await previewSoundRef.current.stopAsync(); } catch {}
      try { await previewSoundRef.current.unloadAsync(); } catch {}
      previewSoundRef.current = null;
    }
  }, []);

  const playPreview = useCallback(
    async (source: number, loop: boolean): Promise<() => void> => {
      await stopPreview();
      try {
        Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        }).catch(() => {});
        const { sound } = await Audio.Sound.createAsync(source, {
          shouldPlay: true,
          isLooping: loop,
          volume: 1.0,
        });
        previewSoundRef.current = sound;
      } catch {}
      return () => {
        void stopPreview();
      };
    },
    [stopPreview],
  );

  useEffect(() => () => { void stopPreview(); }, [stopPreview]);

  const previewRingtone = useCallback(
    async (key: string | number) => {
      const src = RINGTONE_PREVIEW_ASSETS[String(key)];
      if (src == null) return;
      return playPreview(src, true);
    },
    [playPreview],
  );

  const previewAdhan = useCallback(
    async (key: string | number) => {
      const src = ADHAN_PREVIEW_ASSETS[String(key)];
      if (src == null) return;
      return playPreview(src, false);
    },
    [playPreview],
  );

  const openPreview = async () => {
    await stopPreview();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Step 1: fire a real local notification with the configured alarm sound
    // so the user experiences exactly what they'll hear at Fajr time.
    try {
      const { firePreviewNotification } = await import('@/lib/smart-alarm/scheduler');
      await firePreviewNotification(fajr.ringtoneKey);
    } catch (e) {
      if (__DEV__) console.warn('[preview] notification failed', e);
    }
    // Step 2: 2 seconds later, open the ring screen so the user sees the in-app challenge flow.
    setTimeout(() => {
      router.push({ pathname: '/smart-alarm/ring', params: { kind: 'fajr', preview: '1' } } as any);
    }, 2000);
  };

  return (
    <BackgroundWrapper>
      <StatusBar style={colors.statusBarStyle} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <UniversalHeader title={uiText({ ar: 'منبه الفجر الذكي', en: 'Smart Fajr Alarm' })} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroBox}>
            <MaterialCommunityIcons name="weather-night" size={36} color={colors.primary} />
            <Text
              style={[
                styles.heroText,
                { color: colors.text, textAlign: 'center', writingDirection: isRTL ? 'rtl' : 'ltr' },
              ]}
            >
              {uiText({
                ar: 'تنبيهات متتابعة بصوت رنين مزعج لإيقاظك — أكمل تحدياً يفتح في التطبيق لإيقاف المنبه. يلغي إشعار صلاة الفجر العادي تلقائياً.',
                en: 'Persistent ringing notifications to wake you — complete an in-app challenge to dismiss. Suppresses the regular Fajr notification automatically.',
              })}
            </Text>
          </View>

          <SectionTitle>{uiText({ ar: 'منبه الفجر', en: 'Fajr alarm' })}</SectionTitle>
          <GlassCard>
            <View style={[styles.toggleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.toggleLabelCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text
                  style={[styles.toggleLabel, { color: colors.glassText, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
                  numberOfLines={2}
                >
                  {uiText({ ar: 'تفعيل المنبه', en: 'Enable alarm' })}
                </Text>
                {fajr.enabled && nextFajrLabel ? (
                  <Text
                    style={[styles.toggleSubLabel, { color: colors.primary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
                  >
                    {uiText({ ar: 'القادم: ', en: 'Next: ' })}
                    {nextFajrLabel}
                  </Text>
                ) : null}
              </View>
              <Switch
                value={fajr.enabled}
                onValueChange={(v) => setFajrConfig({ enabled: v })}
                trackColor={{ false: '#767577', true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {fajr.enabled && (
              <>
                <Divider />
                <Dropdown
                  label={uiText({ ar: 'وقت التنبيه', en: 'Timing' })}
                  value={fajr.offsetMinutes}
                  options={fajrOffsetOptions}
                  onChange={(v) => setFajrConfig({ offsetMinutes: v })}
                />

                <Divider />
                <Dropdown
                  label={uiText({ ar: 'صوت الرنين', en: 'Ringtone' })}
                  value={fajr.ringtoneKey}
                  options={ringtoneOptions}
                  onChange={(v) => setFajrConfig({ ringtoneKey: v })}
                  onPreview={previewRingtone}
                />

                <Divider />
                <Dropdown
                  label={uiText({ ar: 'الأذان داخل التطبيق', en: 'In-app adhan' })}
                  value={fajr.adhanVoice}
                  options={adhanOptions}
                  onChange={(v) => setFajrConfig({ adhanVoice: v })}
                  onPreview={previewAdhan}
                />

                <Divider />
                <Dropdown
                  label={uiText({ ar: 'نوع التحدي', en: 'Challenge' })}
                  value={fajr.challenge}
                  options={challengeOptions}
                  onChange={(v) => setFajrConfig({ challenge: v })}
                />

                {requiresChallenge && (
                  <>
                    <Divider />
                    <Dropdown
                      label={uiText({ ar: 'مستوى الصعوبة', en: 'Difficulty' })}
                      value={fajr.difficulty}
                      options={difficultyOptions}
                      onChange={(v) => setFajrConfig({ difficulty: v })}
                    />
                  </>
                )}

                {!requiresChallenge && (
                  <>
                    <Divider />
                    <Dropdown
                      label={uiText({ ar: 'الغفوة', en: 'Snooze' })}
                      value={fajr.snoozeMinutes}
                      options={SNOOZE_OPTIONS.map((s) => ({
                        value: s,
                        label: s === 0
                          ? uiText({ ar: 'بدون', en: 'Off' })
                          : uiText({ ar: `${s} دقائق`, en: `${s} minutes` }),
                      }))}
                      onChange={(v) => setFajrConfig({ snoozeMinutes: v })}
                    />
                  </>
                )}

                <Divider />
                <TouchableOpacity
                  style={[
                    styles.previewBtn,
                    { backgroundColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                  onPress={openPreview}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="play-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.previewBtnText}>
                    {uiText({ ar: 'معاينة المنبه', en: 'Preview alarm' })}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </GlassCard>

          <SectionTitle>{uiText({ ar: 'منبه السحور', en: 'Suhoor alarm' })}</SectionTitle>
          <GlassCard>
            <View style={[styles.toggleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.toggleLabelCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text
                  style={[styles.toggleLabel, { color: colors.glassText, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
                  numberOfLines={2}
                >
                  {uiText({ ar: 'تفعيل المنبه', en: 'Enable alarm' })}
                </Text>
                {suhoor.enabled && nextSuhoorLabel ? (
                  <Text
                    style={[styles.toggleSubLabel, { color: colors.primary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
                  >
                    {uiText({ ar: 'القادم: ', en: 'Next: ' })}
                    {nextSuhoorLabel}
                  </Text>
                ) : null}
              </View>
              <Switch
                value={suhoor.enabled}
                onValueChange={(v) => setSuhoorConfig({ enabled: v })}
                trackColor={{ false: '#767577', true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {suhoor.enabled && (
              <>
                <Divider />
                {/* Fasting days picker */}
                <TouchableOpacity
                  style={[styles.daysRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    openDatePicker();
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.daysLabel, { color: colors.glassText, textAlign: isRTL ? 'right' : 'left' }]}
                  >
                    {uiText({ ar: 'أيام الصيام', en: 'Fasting days' })}
                  </Text>
                  <View style={[styles.daysValue, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text
                      style={[
                        styles.daysValueText,
                        { color: futureSuhoorDays > 0 ? colors.primary : colors.glassTextLight, textAlign: isRTL ? 'right' : 'left' },
                      ]}
                      numberOfLines={1}
                    >
                      {futureSuhoorDays > 0
                        ? uiText({ ar: `${futureSuhoorDays} أيام مختارة`, en: `${futureSuhoorDays} days selected` })
                        : uiText({ ar: 'اختر الأيام', en: 'Choose days' })}
                    </Text>
                    <MaterialCommunityIcons name="calendar-month-outline" size={18} color={colors.glassTextLight} />
                  </View>
                </TouchableOpacity>

                <Divider />
                <Dropdown
                  label={uiText({ ar: 'وقت السحور', en: 'Timing' })}
                  value={suhoor.offsetMinutes}
                  options={suhoorOffsetOptions}
                  onChange={(v) => setSuhoorConfig({ offsetMinutes: v })}
                />

                <Divider />
                <Dropdown
                  label={uiText({ ar: 'صوت السحور', en: 'Sound' })}
                  value={suhoor.ringtoneKey}
                  options={suhoorRingtoneOptions}
                  onChange={(v) => setSuhoorConfig({ ringtoneKey: v })}
                  onPreview={previewRingtone}
                />

                <Divider />
                <View style={[styles.toggleRow, { flexDirection: isRTL ? 'row-reverse' : 'row', paddingVertical: 4 }]}>
                  <View style={[styles.toggleLabelCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text
                      style={[styles.toggleLabel, { color: colors.glassText, textAlign: isRTL ? 'right' : 'left' }]}
                      numberOfLines={2}
                    >
                      {uiText({ ar: 'تسجيل صيام اليوم تلقائياً', en: 'Auto-log today as fasting' })}
                    </Text>
                    <Text
                      style={[styles.toggleSubLabel, { color: colors.glassTextLight, textAlign: isRTL ? 'right' : 'left' }]}
                      numberOfLines={2}
                    >
                      {uiText({
                        ar: 'يظهر في متتبع العبادات ولوحة الشرف',
                        en: 'Shows in worship tracker and honor board',
                      })}
                    </Text>
                  </View>
                  <Switch
                    value={suhoor.logFastingOnDismiss}
                    onValueChange={(v) => setSuhoorConfig({ logFastingOnDismiss: v })}
                    trackColor={{ false: '#767577', true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </>
            )}
          </GlassCard>

          <View style={[styles.footerBox, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="information-outline" size={16} color={colors.glassTextLight} />
            <Text
              style={[styles.footerText, { color: colors.glassTextLight, textAlign: isRTL ? 'right' : 'left' }]}
            >
              {uiText({
                ar: 'لكي يعمل المنبه بكفاءة: فعّل إذن الإشعارات، وتأكد من عدم تفعيل وضع "صامت" أو "عدم الإزعاج" عند وقت الفجر.',
                en: 'For best results: enable notifications and avoid Silent / Do Not Disturb modes at Fajr time.',
              })}
            </Text>
          </View>

          <View style={[styles.footerBox, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="calendar-refresh-outline" size={16} color={colors.glassTextLight} />
            <Text
              style={[styles.footerText, { color: colors.glassTextLight, textAlign: isRTL ? 'right' : 'left' }]}
            >
              {uiText({
                ar: 'المنبه مجدول لعدة أيام مقدماً. افتح التطبيق من حين لآخر ليتجدّد للأيام القادمة تلقائياً — سنذكّرك قبل أن ينتهي.',
                en: 'The alarm is scheduled several days ahead. Open the app occasionally so it renews for upcoming days — we will remind you before it runs out.',
              })}
            </Text>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>

        <SuhoorDatePicker
          visible={datePickerOpen}
          selectedDates={draftDates}
          onClose={closeDatePicker}
          onChange={setDraftDates}
        />
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  heroBox: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 8,
  },
  heroText: { fontSize: 13, fontFamily: fontMedium(), lineHeight: 20 },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fontBold(),
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
  },
  cardWrap: { marginHorizontal: 14, marginBottom: 14, borderRadius: 18, overflow: 'hidden' },
  cardInner: { paddingVertical: 8, paddingHorizontal: 14 },
  toggleRow: { alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, gap: 12 },
  toggleLabelCol: { flex: 1, flexShrink: 1, gap: 2 },
  toggleLabel: { fontSize: 14, fontFamily: fontSemiBold(), lineHeight: 20, includeFontPadding: false, flexShrink: 1 },
  toggleSubLabel: { fontSize: 12, fontFamily: fontMedium() },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(127,127,127,0.25)',
    marginVertical: 4,
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  previewBtnText: { fontSize: 15, fontFamily: fontBold(), color: '#FFFFFF' },
  footerBox: { paddingHorizontal: 24, paddingTop: 8, gap: 8, alignItems: 'flex-start' },
  footerText: { flex: 1, fontSize: 12, fontFamily: fontMedium(), lineHeight: 18 },
  daysRow: { alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, gap: 12 },
  daysLabel: { fontSize: 14, fontFamily: fontSemiBold(), includeFontPadding: false, flexShrink: 0 },
  daysValue: { flex: 1, alignItems: 'center', gap: 6 },
  daysValueText: { fontSize: 14, fontFamily: fontSemiBold(), includeFontPadding: false, flexShrink: 1 },
});
