// app/settings/notifications.tsx
// صفحة إعدادات الإشعارات الموحدة - روح المسلم

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  AppState,
  AppStateStatus,
  Platform,
  Linking,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Audio } from 'expo-av';
import Animated, { FadeInDown } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useSettings, NotificationSoundType, AdhanSoundType, ReminderSoundType } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { Colors, DarkColors } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { getPrayerTranslationKey } from '@/lib/prayer-times';
import {
  ADHAN_SOUNDS as ADHAN_SOUND_FILES,
  NOTIFICATION_SOUNDS as NOTIFICATION_SOUND_FILES,
  fetchDisabledBundledSounds,
  normalizeCompleteAdhanVoice,
  normalizeFullAdhanNotificationVoice,
} from '@/lib/sound-manager';
import { getSurahName } from '@/lib/quran-api';
import { fetchDownloadableSounds, getDownloadedSounds, downloadSound, isSoundDownloaded, type DownloadableSound, type DownloadedSound } from '@/lib/downloadable-sounds';
import { sendTestNotification } from '@/lib/notifications-manager';
import { checkExactAlarmPermission, openExactAlarmSettings } from '@/services/notifications/permissions';
import { useSmartAlarm } from '@/contexts/SmartAlarmContext';
import { checkAllPermissions, markPermissionRequested, openBatteryOptimizationSettings } from '@/lib/permission-recovery';


// Removed: interstitial ads on sound download to reduce user frustration
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { guardPremiumFeature } from '@/lib/premium-guard';
import { uiText } from '@/lib/ui-text';

// ========================================
// الثوابت
// ========================================

const NOTIFICATION_SOUNDS: { id: NotificationSoundType; nameKey: string; icon: string }[] = [
  { id: 'default', nameKey: 'notificationSounds.defaultSound', icon: 'bell-ring' },
  { id: 'salawat', nameKey: 'notificationSounds.salawatProphet', icon: 'volume-high' },
  { id: 'tasbih', nameKey: 'notificationSounds.subhanallahBihamdihi', icon: 'volume-high' },
  { id: 'subhanallah', nameKey: 'notificationSounds.subhanallah', icon: 'volume-high' },
  { id: 'alhamdulillah', nameKey: 'notificationSounds.alhamdulillah', icon: 'volume-high' },
  { id: 'istighfar', nameKey: 'notificationSounds.astaghfirullah', icon: 'volume-high' },
  { id: 'silent', nameKey: 'notificationSounds.silent', icon: 'bell-off' },
];

// Reminder sounds available for per-category selection
const REMINDER_SOUNDS: { id: ReminderSoundType; nameKey: string }[] = [
  { id: 'default', nameKey: 'notificationSounds.defaultSound' },
  { id: 'salawat', nameKey: 'notificationSounds.salawatProphet' },
  { id: 'tasbih', nameKey: 'notificationSounds.subhanallahBihamdihi' },
  { id: 'subhanallah', nameKey: 'notificationSounds.subhanallah' },
  { id: 'alhamdulillah', nameKey: 'notificationSounds.alhamdulillah' },
  { id: 'istighfar', nameKey: 'notificationSounds.astaghfirullah' },
  { id: 'silent', nameKey: 'notificationSounds.silent' },
];

const FREE_ADHAN_IDS: AdhanSoundType[] = ['default', 'makkah', 'madinah', 'alaqsa', 'silent'];

const ADHAN_SOUNDS: { id: AdhanSoundType; name: string; description: string; icon: string }[] = [
  { id: 'default', name: t('notificationSounds.defaultSound'), description: t('notificationSounds.systemSound'), icon: 'bell-ring' },
  { id: 'makkah', name: t('notificationSounds.makkah'), description: t('notificationSounds.makkahDesc'), icon: 'volume-high' },
  { id: 'madinah', name: t('notificationSounds.madinah'), description: t('notificationSounds.madinahDesc'), icon: 'volume-high' },
  { id: 'alaqsa', name: t('notificationSounds.alaqsa'), description: t('notificationSounds.alaqsaDesc'), icon: 'volume-high' },
  { id: 'mishary', name: t('notificationSounds.mishary'), description: t('notificationSounds.misharyDesc'), icon: 'volume-high' },
  { id: 'abdulbasit', name: t('notificationSounds.abdulbasit'), description: t('notificationSounds.abdulbasitDesc'), icon: 'volume-high' },
  { id: 'sudais', name: t('notificationSounds.sudais'), description: t('notificationSounds.sudaisDesc'), icon: 'volume-high' },
  { id: 'egypt', name: t('notificationSounds.egypt'), description: t('notificationSounds.egyptDesc'), icon: 'volume-high' },
  { id: 'dosari', name: t('notificationSounds.dosari'), description: t('notificationSounds.dosariDesc'), icon: 'volume-high' },
  { id: 'ajman', name: t('notificationSounds.ajman'), description: t('notificationSounds.ajmanDesc'), icon: 'volume-high' },
  { id: 'ali_mulla', name: t('notificationSounds.ali_mulla'), description: t('notificationSounds.ali_mullaDesc'), icon: 'volume-high' },
  { id: 'naqshbandi', name: t('notificationSounds.naqshbandi'), description: t('notificationSounds.naqshbandiDesc'), icon: 'volume-high' },
  { id: 'sharif', name: t('notificationSounds.sharif'), description: t('notificationSounds.sharifDesc'), icon: 'volume-high' },
  { id: 'mansoor_zahrani', name: t('notificationSounds.mansoor_zahrani'), description: t('notificationSounds.mansoor_zahraniDesc'), icon: 'volume-high' },
  { id: 'haramain', name: t('notificationSounds.haramain'), description: t('notificationSounds.haramainDesc'), icon: 'volume-high' },
  { id: 'silent', name: t('notificationSounds.silent'), description: t('notificationSounds.silentDesc'), icon: 'bell-off' },
];

// Ayah counts per surah (114 surahs)
const AYAH_COUNTS = [
  7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,
  112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,
  54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,
  14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,45,33,27,
  57,29,19,18,12,11,82,8,11,98,5,8,8,19,5,8,8,11,11,8,
  3,9,5,4,7,3,6,3,5,4,5,6,4,4
];

// Content type options for custom reminder
const CONTENT_TYPES: { id: 'text' | 'surah'; labelKey: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { id: 'text', labelKey: 'notificationSounds.freeText', icon: 'pencil-outline' },
  { id: 'surah', labelKey: 'notificationSounds.surah', icon: 'bookshelf' },
];

const REMINDER_OPTIONS = [
  { value: 5, label: t('notificationSounds.minutesBefore', { count: '5' }) },
  { value: 10, label: t('notificationSounds.minutesBefore', { count: '10' }) },
  { value: 15, label: t('notificationSounds.minutesBefore', { count: '15' }) },
  { value: 20, label: t('notificationSounds.minutesBefore', { count: '20' }) },
  { value: 30, label: t('notificationSounds.minutesBefore', { count: '30' }) },
];

const DID_YOU_PRAY_DELAY_OPTIONS = [15, 20, 30, 45, 60];
const DID_YOU_PRAY_SNOOZE_OPTIONS = [5, 10, 15, 20, 30];

const PRAYER_NAMES = [
  { key: 'fajr', name: t('prayer.fajr'), icon: 'weather-sunset-up' },
  { key: 'sunrise', name: t('prayer.sunrise'), icon: 'white-balance-sunny' },
  { key: 'dhuhr', name: t(getPrayerTranslationKey('dhuhr')), icon: 'weather-sunny' },
  { key: 'asr', name: t('prayer.asr'), icon: 'weather-sunny-alert' },
  { key: 'maghrib', name: t('prayer.maghrib'), icon: 'weather-sunset-down' },
  { key: 'isha', name: t('prayer.isha'), icon: 'weather-night' },
];

// Notification category definitions
interface NotificationCategoryDef {
  id: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  titleKey: string;
  subtitleKey: string;
}

const NOTIFICATION_CATEGORIES: NotificationCategoryDef[] = [
  {
    id: 'prayer',
    icon: 'mosque',
    iconColor: '#0d8e62',
    titleKey: 'notificationSounds.prayer',
    subtitleKey: 'notificationSounds.prayerTimesAlerts',
  },
  {
    id: 'salawat',
    icon: 'heart',
    iconColor: '#d4a039',
    titleKey: 'notificationSounds.salawatProphet',
    subtitleKey: 'notificationSounds.salawatReminder',
  },
  {
    id: 'tasbih',
    icon: 'counter',
    iconColor: '#2896a5',
    titleKey: 'notificationSounds.tasbeeh',
    subtitleKey: 'notificationSounds.tasbeehReminder',
  },
  {
    id: 'istighfar',
    icon: 'hand-heart',
    iconColor: '#7c5bbf',
    titleKey: 'notificationSounds.istighfar',
    subtitleKey: 'notificationSounds.istighfarReminder',
  },
  {
    id: 'azkar',
    icon: 'book-open-variant',
    iconColor: '#c07b10',
    titleKey: 'notificationSounds.adhkar',
    subtitleKey: 'notificationSounds.adhkarDesc',
  },
  {
    id: 'dailyVerse',
    icon: 'book-open-page-variant',
    iconColor: '#0d8e62',
    titleKey: 'notificationSounds.verseOfDay',
    subtitleKey: 'notificationSounds.verseOfDayDesc',
  },
  {
    id: 'quranReading',
    icon: 'bookshelf',
    iconColor: '#2E7D32',
    titleKey: 'settings.quranReadingNotifTitle',
    subtitleKey: 'settings.quranReadingNotifBody',
  },
  {
    id: 'worshipDailySummary',
    icon: 'clipboard-check',
    iconColor: '#F57C00',
    titleKey: 'settings.worshipDailySummaryTitle',
    subtitleKey: 'settings.worshipDailySummaryBody',
  },
  {
    id: 'worshipWeeklyReport',
    icon: 'chart-bar',
    iconColor: '#5C6BC0',
    titleKey: 'settings.worshipWeeklyReportTitle',
    subtitleKey: 'settings.worshipWeeklyReportBody',
  },
  {
    id: 'customReminder',
    icon: 'bell-plus',
    iconColor: '#b85c16', // Darker orange for better light mode contrast
    titleKey: 'notificationSounds.customNotification',
    subtitleKey: 'notificationSounds.customNotificationDesc',
  },
  {
    id: 'kahf',
    icon: 'book-open-variant',
    iconColor: '#1a6b4a',
    titleKey: 'settings.kahfFriday',
    subtitleKey: 'settings.kahfBody',
  },
];

// ========================================
// Helper functions
// ========================================

const formatDisplayTime = (timeStr: string): string => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? t('notificationSounds.pm') : t('notificationSounds.am');
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const parseTime = (timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const formatTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const springLayoutAnimation = () => {
  LayoutAnimation.configureNext({
    duration: 350,
    create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    update: { type: LayoutAnimation.Types.spring, springDamping: 0.85 },
    delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  });
};



// ========================================
// Dropdown picker for chip-style options
// ========================================

interface InlineDropdownProps<T extends string | number> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}

function InlineDropdown<T extends string | number>({
  label,
  options,
  value,
  onChange,
  disabled,
}: InlineDropdownProps<T>) {
  const colors = useColors();
  const isRTL = useIsRTL();
  const [open, setOpen] = useState(false);
  const isDarkMode = (colors as any).isDarkMode as boolean;
  const borderColor = (colors as any).divider ?? 'rgba(127,127,127,0.25)';
  // force dropdown/panel background to the requested color
  const triggerBg = '#091f1d';
  const current = options.find((o) => o.value === value);

  const toggleOpen = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((p) => !p);
  };

  return (
    // keep spacing vertical but let parent container control horizontal padding so width matches time picker
    <View style={{ paddingHorizontal: 0, paddingVertical: 8, gap: 6 }}>
      <Text
        style={{
          fontSize: 13,
          fontFamily: fontMedium(),
          color: colors.textLight,
          textAlign: isRTL ? 'right' : 'left',
          writingDirection: isRTL ? 'rtl' : 'ltr',
        }}
      >
        {label}
      </Text>
      <TouchableOpacity
        onPress={toggleOpen}
        activeOpacity={0.8}
        disabled={disabled}
        style={{
          width: '100%', // stretch to parent's content width (parent has horizontal padding)
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor,
          backgroundColor: triggerBg,
          opacity: disabled ? 0.5 : 1,
          gap: 8,
        }}
      >
        <Text
          style={{
            flex: 1,
            fontSize: 13,
            fontFamily: fontSemiBold(),
            color: '#ffffff',
            textAlign: isRTL ? 'right' : 'left',
            writingDirection: isRTL ? 'rtl' : 'ltr',
          }}
        >
          {current ? current.label : ''}
        </Text>
        <MaterialCommunityIcons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textLight}
        />
      </TouchableOpacity>
      {open && (
        <View
          style={{
            marginTop: 4,
            borderRadius: 12,
            borderWidth: 1,
            borderColor,
            backgroundColor: triggerBg,
            overflow: 'hidden',
            width: '100%',
          }}
        >
          {options.map((option, idx) => {
            const active = option.value === value;
            return (
              <TouchableOpacity
                key={String(option.value)}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onChange(option.value);
                  LayoutAnimation.configureNext(
                    LayoutAnimation.Presets.easeInEaseOut,
                  );
                  setOpen(false);
                }}
                activeOpacity={0.7}
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderTopWidth: idx === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderTopColor: borderColor,
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontFamily: active ? fontSemiBold() : fontMedium(),
                    color: active ? '#0d8e62' : '#ffffff',
                    textAlign: isRTL ? 'right' : 'left',
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                  }}
                >
                  {option.label}
                </Text>
                {active && (
                  <MaterialCommunityIcons
                    name="check"
                    size={18}
                    color="#0d8e62"
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ========================================
// المكون الرئيسي
// ========================================

/**
 * Inline mode picker that appears under the Fajr row when expanded.
 * Two mutually-exclusive modes: regular notification OR smart alarm.
 */
function FajrModePicker() {
  const router = useRouter();
  const colors = useColors();
  const isRTL = useIsRTL();
  const { config, setFajrConfig } = useSmartAlarm();
  const smartOn = config.fajr.enabled;
  const isDarkMode = (colors as any).isDarkMode as boolean;
  const panelBg = isDarkMode ? 'rgba(20,24,32,0.55)' : 'rgba(245,245,247,0.6)';
  const divider = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const setMode = (mode: 'regular' | 'smart') => {
    Haptics.selectionAsync().catch(() => {});
    setFajrConfig({ enabled: mode === 'smart' }).catch(() => {});
  };

  const openSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/smart-alarm' as any);
  };

  const Option = ({
    selected,
    title,
    description,
    onSelect,
    showSettingsBtn,
    isLast,
  }: {
    selected: boolean;
    title: string;
    description: string;
    onSelect: () => void;
    showSettingsBtn?: boolean;
    isLast?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.75}
      style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: divider,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: selected ? '#0d8e62' : colors.textLight,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        }}
      >
        {selected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#0d8e62' }} />}
      </View>
      <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
        <Text
          style={{
            fontSize: 14,
            fontFamily: fontSemiBold(),
            color: selected ? '#0d8e62' : colors.text,
            textAlign: isRTL ? 'right' : 'left',
            writingDirection: isRTL ? 'rtl' : 'ltr',
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            marginTop: 3,
            fontSize: 12,
            fontFamily: fontRegular(),
            lineHeight: 18,
            color: colors.textLight,
            textAlign: isRTL ? 'right' : 'left',
            writingDirection: isRTL ? 'rtl' : 'ltr',
          }}
        >
          {description}
        </Text>
        {showSettingsBtn && selected && (
          <TouchableOpacity
            onPress={openSettings}
            activeOpacity={0.8}
            style={{
              marginTop: 10,
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: '#0d8e62',
              alignSelf: isRTL ? 'flex-end' : 'flex-start',
            }}
          >
            <MaterialCommunityIcons name="cog-outline" size={14} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontFamily: fontSemiBold() }}>
              {uiText({ ar: 'ضبط المنبه الذكي', en: 'Configure smart alarm' })}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View
      style={{
        marginHorizontal: 4,
        marginBottom: 4,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: panelBg,
      }}
    >
      <Option
        selected={!smartOn}
        title={uiText({ ar: 'التنبيه العادي', en: 'Regular notification' })}
        description={uiText({
          ar: 'إشعار واحد بصوت الأذان عند وقت الفجر',
          en: 'A single notification with the adhan sound at Fajr',
        })}
        onSelect={() => setMode('regular')}
      />
      <Option
        selected={smartOn}
        title={uiText({ ar: 'التنبيه الذكي', en: 'Smart alarm' })}
        description={uiText({
          ar: 'إشعارات متتالية بصوت رنين مع تحدي لإيقاف المنبه — يضمن استيقاظك للفجر',
          en: 'Persistent ringing notifications with a wake-up challenge — ensures you wake for Fajr',
        })}
        onSelect={() => setMode('smart')}
        showSettingsBtn
        isLast
      />
    </View>
  );
}

export default function NotificationsScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const { isPremium } = useSubscription();
  const { settings, isDarkMode, updateNotifications } = useSettings();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [permissionChecked, setPermissionChecked] = useState(false);
  const searchParams = useLocalSearchParams<{ expand?: string }>();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    searchParams.expand === 'prayer' ? 'prayer' : null,
  );
  // When the user lands here from the Smart Alarm card on the prayer screen,
  // pre-expand the Fajr mode picker so they immediately see the regular vs smart choice.
  const [fajrModeExpanded, setFajrModeExpanded] = useState<boolean>(
    searchParams.expand === 'prayer',
  );
  const [prayerNotifications, setPrayerNotifications] = useState<{ [key: string]: boolean }>({
    fajr: true,
    sunrise: false,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true,
  });

  // Time picker state
  const [activeTimePicker, setActiveTimePicker] = useState<string | null>(null);

  // Adhan sound list expanded state
  const [adhanListExpanded, setAdhanListExpanded] = useState(false);

  // Day picker per-category open state
  const [dayPickerOpen, setDayPickerOpen] = useState<Record<string, boolean>>({});
  // Day selection mode per-category: 'everyday' | 'weekdays' | 'weekends' | 'custom'
  const [daySelectionMode, setDaySelectionMode] = useState<Record<string, string>>({});

  // Sound preview state
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const previewSoundRef = useRef<Audio.Sound | null>(null);
  const reminderScrollRef = useRef<ScrollView | null>(null);
  const didYouPrayDelayScrollRef = useRef<ScrollView | null>(null);
  const didYouPraySnoozeScrollRef = useRef<ScrollView | null>(null);

  // Downloadable sounds state
  const [downloadableSounds, setDownloadableSounds] = useState<DownloadableSound[]>([]);
  const [downloadedSounds, setDownloadedSounds] = useState<DownloadedSound[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [showDownloadSection, setShowDownloadSection] = useState(false);

  // Custom reminder content picker state
  const [showSurahPicker, setShowSurahPicker] = useState(false);

  // Test notification button state
  const [testingSending, setTestingSending] = useState<string | null>(null);
  const [testingSent, setTestingSent] = useState<string | null>(null);
  const [showBatteryOptimizationTip, setShowBatteryOptimizationTip] = useState(false);

  // Admin-disabled bundled sounds
  const [disabledSoundIds, setDisabledSoundIds] = useState<Set<string>>(new Set());
  const regularAdhanSoundType =
    !isPremium && !FREE_ADHAN_IDS.includes(settings.notifications.adhanSoundType || 'makkah')
      ? 'makkah'
      : (settings.notifications.adhanSoundType || 'makkah');

  // Load disabled sounds from admin config
  useEffect(() => {
    fetchDisabledBundledSounds()
      .then(setDisabledSoundIds)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const currentRegularVoice = settings.notifications.adhanSoundType || 'makkah';
    if (isPremium || FREE_ADHAN_IDS.includes(currentRegularVoice)) return;

    updateNotifications({
      adhanSoundType: 'makkah',
      fullAdhanSoundType: settings.notifications.fullAdhanSoundType || normalizeFullAdhanNotificationVoice(currentRegularVoice),
    });
  }, [
    isPremium,
    settings.notifications.adhanSoundType,
    settings.notifications.fullAdhanSoundType,
    updateNotifications,
  ]);

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

  const playPreview = useCallback(async (soundId: string) => {
    if (previewPlaying === soundId) {
      await stopPreview();
      return;
    }
    await stopPreview();

    const bundledSound = ADHAN_SOUND_FILES[soundId] || NOTIFICATION_SOUND_FILES[soundId];
    if (!bundledSound) return;

    setPreviewLoading(soundId);
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        // On Android, request audio focus so playback isn't blocked by other apps
        ...(Platform.OS === 'android' ? {
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        } : {}),
      });
      const { sound } = await Audio.Sound.createAsync(
        bundledSound,
        { shouldPlay: true, volume: 1.0 },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            stopPreview();
          }
        }
      );
      previewSoundRef.current = sound;
      // On Android, explicitly call playAsync after createAsync to ensure playback starts
      if (Platform.OS === 'android') {
        await sound.playAsync();
      }
      setPreviewPlaying(soundId);
    } catch (e) {
      console.warn('[preview] playback failed:', e);
      setPreviewPlaying(null);
    } finally {
      setPreviewLoading(null);
    }
  }, [previewPlaying, stopPreview]);

  useEffect(() => {
    return () => { stopPreview(); };
  }, [stopPreview]);

  useEffect(() => {
    checkPermissions();
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkPermissions();
    }, [settings.notifications.enabled]),
  );



  // Load downloadable sounds from Firebase
  useEffect(() => {
    const loadDownloadable = async () => {
      try {
        const [available, downloaded] = await Promise.all([
          fetchDownloadableSounds(),
          getDownloadedSounds(),
        ]);
        setDownloadableSounds(available);
        setDownloadedSounds(downloaded);
      } catch {
        // Non-blocking
      }
    };
    loadDownloadable();
  }, []);

  // Check if ayah is already cached when selection changes


  const handleDownloadSound = async (sound: DownloadableSound) => {
    if (downloadingId) return;
    setDownloadingId(sound.id);
    try {
      // Removed: interstitial ad before sound download to reduce user frustration
      
      const downloaded = await downloadSound(sound);
      setDownloadedSounds(prev => [...prev.filter(s => s.id !== sound.id), downloaded]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setDownloadingId(null);
    }
  };

  const checkPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);
    setPermissionChecked(true);
    if (status !== 'granted' && settings.notifications.enabled) {
      Alert.alert(
        t('notificationSounds.notificationsDisabled'),
        t('notificationSounds.systemNotificationsBlockedMsg'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('notificationSounds.openSettings'), onPress: () => Linking.openSettings() },
        ],
      );
    }
  };

  const refreshBatteryOptimizationTip = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setShowBatteryOptimizationTip(false);
      return;
    }

    try {
      const status = await checkAllPermissions();
      setShowBatteryOptimizationTip(status.batteryOptimization === 'optimized');
    } catch (e) {
      console.warn('[notifications] Failed to check battery optimization:', e);
      setShowBatteryOptimizationTip(false);
    }
  }, []);

  useEffect(() => {
    refreshBatteryOptimizationTip();
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') refreshBatteryOptimizationTip();
    });
    return () => sub.remove();
  }, [refreshBatteryOptimizationTip]);

  const requestPermissions = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (Platform.OS === 'android') {
      await markPermissionRequested('notifications');
    }
    const { status } = await Notifications.requestPermissionsAsync();
    setPermissionStatus(status);

    if (status !== 'granted') {
      Alert.alert(
        t('notificationSounds.notificationsRequired'),
        t('notificationSounds.notificationsRequiredMsg'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('notificationSounds.openSettings'), onPress: () => Linking.openSettings() },
        ]
      );
    } else {
      await updateNotifications({ enabled: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleToggleMain = async (enabled: boolean) => {
    if (enabled && permissionStatus !== 'granted') {
      await requestPermissions();
    } else {
      await updateNotifications({ enabled });
    }
  };

  // Layer 4: when enabling Full Adhan on Android, ensure SCHEDULE_EXACT_ALARM
  // is granted so AlarmManager.setExactAndAllowWhileIdle works reliably.
  // Without it, alarms fall back to inexact mode (up to 15-min delay).
  // Toggle is still applied either way — Layer 2 (sounded notification) is the
  // safety net so the user always hears at least the short adhan.
  const handleFullAdhanToggle = async (next: boolean) => {
    const currentRegularVoice = settings.notifications.adhanSoundType || 'makkah';
    const voiceLocked = !isPremium && !FREE_ADHAN_IDS.includes(currentRegularVoice);
    const selectedVoice = settings.notifications.fullAdhanSoundType || normalizeFullAdhanNotificationVoice(currentRegularVoice);
    console.log('[FullAdhan] user toggled:', next);
    console.log('[FullAdhan] selected voice:', selectedVoice);
    await updateNotifications({
      useFullAdhan: next,
      fullAdhanSoundType: selectedVoice,
      ...(voiceLocked ? { adhanSoundType: 'makkah' as AdhanSoundType } : {}),
    });

    if (!next || Platform.OS !== 'android') return;
    try {
      const granted = await checkExactAlarmPermission();
      if (granted) return;
      Alert.alert(
        t('notificationSounds.exactAlarmTitle') || 'إذن المنبهات الدقيقة',
        t('notificationSounds.exactAlarmMessage') ||
          'لضمان تشغيل الأذان الكامل في وقته بالضبط حتى لو كان التطبيق مغلقاً، يحتاج التطبيق إلى إذن "المنبهات والتذكيرات". بدون هذا الإذن قد يتأخر الأذان حتى 15 دقيقة.',
        [
          { text: t('common.cancel') || 'إلغاء', style: 'cancel' },
          {
            text: t('notificationSounds.grantPermission') || 'منح الإذن',
            onPress: () => openExactAlarmSettings(),
          },
        ],
      );
    } catch (e) {
      console.warn('[notifications] Failed to check exact alarm permission:', e);
    }
  };

  const handleTogglePrayerNotification = (prayerKey: string, value: boolean) => {
    setPrayerNotifications((prev) => ({ ...prev, [prayerKey]: value }));
  };

  const handleBatteryOptimizationPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await openBatteryOptimizationSettings();
    setTimeout(() => refreshBatteryOptimizationTip(), 500);
  };

  const toggleCategory = (categoryId: string) => {
    springLayoutAnimation();
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const collapseCategory = () => {
    springLayoutAnimation();
    setExpandedCategory(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const isEnabled = settings.notifications.enabled && (permissionStatus === 'granted' || !permissionChecked);

  // Get enabled state for each category
  const getCategoryEnabled = (categoryId: string): boolean => {
    switch (categoryId) {
      case 'prayer': return settings.notifications.prayerTimes;
      case 'salawat': return settings.notifications.salawatReminder ?? false;
      case 'tasbih': return settings.notifications.tasbihReminder ?? false;
      case 'istighfar': return settings.notifications.istighfarReminder ?? false;
      case 'azkar': return settings.notifications.morningAzkar || settings.notifications.eveningAzkar || settings.notifications.sleepAzkar || settings.notifications.wakeupAzkar;
      case 'dailyVerse': return settings.notifications.dailyVerse;
      case 'customReminder': return settings.notifications.customReminder ?? false;
      case 'kahf': return settings.notifications.kahfReminder ?? false;
      case 'quranReading': return settings.notifications.quranReadingReminder ?? true;
      case 'worshipDailySummary': return settings.notifications.worshipDailySummary ?? true;
      case 'worshipWeeklyReport': return settings.notifications.worshipWeeklyReport ?? false;
      default: return false;
    }
  };

  // Toggle enabled state for each category
  const toggleCategoryEnabled = (categoryId: string, value: boolean) => {
    switch (categoryId) {
      case 'prayer':
        updateNotifications({ prayerTimes: value });
        break;
      case 'salawat':
        updateNotifications({ salawatReminder: value });
        break;
      case 'tasbih':
        updateNotifications({ tasbihReminder: value });
        break;
      case 'istighfar':
        updateNotifications({ istighfarReminder: value });
        break;
      case 'azkar':
        updateNotifications({ morningAzkar: value, eveningAzkar: value, sleepAzkar: value, wakeupAzkar: value });
        break;
      case 'dailyVerse':
        updateNotifications({ dailyVerse: value });
        break;
      case 'customReminder':
        updateNotifications({ customReminder: value });
        break;
      case 'kahf':
        updateNotifications({ kahfReminder: value });
        break;
      case 'quranReading':
        updateNotifications({ quranReadingReminder: value });
        break;
      case 'worshipDailySummary':
        updateNotifications({ worshipDailySummary: value });
        break;
      case 'worshipWeeklyReport':
        updateNotifications({ worshipWeeklyReport: value });
        break;
    }
  };

  // Get time for a category
  const getCategoryTime = (categoryId: string): string | null => {
    switch (categoryId) {
      case 'salawat': return settings.notifications.salawatReminderTime ?? '09:00';
      case 'tasbih': return settings.notifications.tasbihReminderTime ?? '15:00';
      case 'istighfar': return settings.notifications.istighfarReminderTime ?? '12:00';
      case 'dailyVerse': return settings.notifications.dailyVerseTime;
      case 'customReminder': return settings.notifications.customReminderTime ?? '08:00';
      case 'quranReading': return settings.notifications.quranReadingReminderTime ?? '20:00';
      case 'worshipDailySummary': return settings.notifications.worshipDailySummaryTime ?? '22:00';
      default: return null;
    }
  };

  // Update time for a category
  const updateCategoryTime = (categoryId: string, time: string) => {
    switch (categoryId) {
      case 'salawat':
        updateNotifications({ salawatReminderTime: time, salawatReminderTimes: [time] });
        break;
      case 'tasbih':
        updateNotifications({ tasbihReminderTime: time, tasbihReminderTimes: [time] });
        break;
      case 'istighfar':
        updateNotifications({ istighfarReminderTime: time, istighfarReminderTimes: [time] });
        break;
      case 'dailyVerse':
        updateNotifications({ dailyVerseTime: time, dailyVerseTimes: [time] });
        break;
      case 'customReminder':
        updateNotifications({ customReminderTime: time, customReminderTimes: [time] });
        break;
      case 'quranReading':
        updateNotifications({ quranReadingReminderTime: time, quranReadingReminderTimes: [time] });
        break;
      case 'worshipDailySummary':
        updateNotifications({ worshipDailySummaryTime: time });
        break;
    }
  };

  const MAX_TIMES = 3;

  // Get times array for a category (multi-time support)
  const getCategoryTimes = (categoryId: string): string[] => {
    const n = settings.notifications;
    switch (categoryId) {
      case 'salawat': return n.salawatReminderTimes ?? [n.salawatReminderTime ?? '09:00'];
      case 'tasbih': return n.tasbihReminderTimes ?? [n.tasbihReminderTime ?? '15:00'];
      case 'istighfar': return n.istighfarReminderTimes ?? [n.istighfarReminderTime ?? '12:00'];
      case 'dailyVerse': return n.dailyVerseTimes ?? [n.dailyVerseTime];
      case 'customReminder': return n.customReminderTimes ?? [n.customReminderTime ?? '08:00'];
      case 'quranReading': return n.quranReadingReminderTimes ?? [n.quranReadingReminderTime];
      case 'morningAzkar': return n.morningAzkarTimes ?? [n.morningAzkarTime];
      case 'eveningAzkar': return n.eveningAzkarTimes ?? [n.eveningAzkarTime];
      case 'sleepAzkar': return n.sleepAzkarTimes ?? [n.sleepAzkarTime];
      case 'wakeupAzkar': return n.wakeupAzkarTimes ?? [n.wakeupAzkarTime];
      default: return [];
    }
  };

  // Update times array for a category
  const updateCategoryTimes = (categoryId: string, times: string[]) => {
    const primary = times[0];
    switch (categoryId) {
      case 'salawat':
        updateNotifications({ salawatReminderTimes: times, salawatReminderTime: primary, notifOverrides: { ...settings.notifications.notifOverrides, salawat: true } });
        break;
      case 'tasbih':
        updateNotifications({ tasbihReminderTimes: times, tasbihReminderTime: primary, notifOverrides: { ...settings.notifications.notifOverrides, tasbih: true } });
        break;
      case 'istighfar':
        updateNotifications({ istighfarReminderTimes: times, istighfarReminderTime: primary, notifOverrides: { ...settings.notifications.notifOverrides, istighfar: true } });
        break;
      case 'dailyVerse':
        updateNotifications({ dailyVerseTimes: times, dailyVerseTime: primary, notifOverrides: { ...settings.notifications.notifOverrides, dailyVerse: true } });
        break;
      case 'customReminder':
        updateNotifications({ customReminderTimes: times, customReminderTime: primary, notifOverrides: { ...settings.notifications.notifOverrides, customReminder: true } });
        break;
      case 'quranReading':
        updateNotifications({ quranReadingReminderTimes: times, quranReadingReminderTime: primary, notifOverrides: { ...settings.notifications.notifOverrides, quranReading: true } });
        break;
      case 'morningAzkar':
        updateNotifications({ morningAzkarTimes: times, morningAzkarTime: primary, notifOverrides: { ...settings.notifications.notifOverrides, morningAzkar: true } });
        break;
      case 'eveningAzkar':
        updateNotifications({ eveningAzkarTimes: times, eveningAzkarTime: primary, notifOverrides: { ...settings.notifications.notifOverrides, eveningAzkar: true } });
        break;
      case 'sleepAzkar':
        updateNotifications({ sleepAzkarTimes: times, sleepAzkarTime: primary, notifOverrides: { ...settings.notifications.notifOverrides, sleepAzkar: true } });
        break;
      case 'wakeupAzkar':
        updateNotifications({ wakeupAzkarTimes: times, wakeupAzkarTime: primary, notifOverrides: { ...settings.notifications.notifOverrides, wakeupAzkar: true } });
        break;
    }
  };

  // Get per-category sound type
  const getCategorySoundType = (categoryId: string): ReminderSoundType => {
    switch (categoryId) {
      case 'salawat': return settings.notifications.salawatSoundType ?? 'salawat';
      case 'tasbih': return settings.notifications.tasbihSoundType ?? 'tasbih';
      case 'istighfar': return settings.notifications.istighfarSoundType ?? 'istighfar';
      case 'azkar': return settings.notifications.azkarSoundType ?? 'default';
      case 'dailyVerse': return settings.notifications.dailyVerseSoundType ?? 'default';
      case 'customReminder': return settings.notifications.customReminderSoundType ?? 'default';
      case 'quranReading': return settings.notifications.quranReminderSoundType ?? 'default';
      case 'worshipDailySummary': return settings.notifications.soundType ?? 'default';
      default: return 'default';
    }
  };

  // Update per-category sound type
  const updateCategorySoundType = (categoryId: string, soundType: ReminderSoundType) => {
    switch (categoryId) {
      case 'salawat':
        updateNotifications({ salawatSoundType: soundType });
        break;
      case 'tasbih':
        updateNotifications({ tasbihSoundType: soundType });
        break;
      case 'istighfar':
        updateNotifications({ istighfarSoundType: soundType });
        break;
      case 'azkar':
        updateNotifications({ azkarSoundType: soundType });
        break;
      case 'dailyVerse':
        updateNotifications({ dailyVerseSoundType: soundType });
        break;
      case 'customReminder':
        updateNotifications({ customReminderSoundType: soundType });
        break;
      case 'quranReading':
        updateNotifications({ quranReminderSoundType: soundType });
        break;
    }
  };



  // Sound mapping description for each category
  const getSoundDescription = (categoryId: string): string => {
    if (categoryId === 'prayer') return t('notificationSounds.selectedAdhanSound');
    const soundType = getCategorySoundType(categoryId);
    const soundItem = REMINDER_SOUNDS.find(s => s.id === soundType);
    return soundItem ? `${t('notificationSounds.soundLabel')} ${t(soundItem.nameKey)}` : t('notificationSounds.defaultTone');
  };

  // ========================================
  // Day-of-week helpers (1=Sun...7=Sat, expo-notifications weekday)
  // ========================================
  const DAY_LABELS = [
    t('notificationSounds.daySun'),
    t('notificationSounds.dayMon'),
    t('notificationSounds.dayTue'),
    t('notificationSounds.dayWed'),
    t('notificationSounds.dayThu'),
    t('notificationSounds.dayFri'),
    t('notificationSounds.daySat'),
  ];
  const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]; // Sun-Sat

  const arraysEqual = (a: number[], b: number[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  };

  const detectDayMode = (days: number[]) => {
    const s = [...days].sort((a, b) => a - b);
    if (s.length === 7) return 'everyday';
    const weekdays = [1, 2, 3, 4, 5];
    const weekends = [6, 7];
    if (arraysEqual(s, weekdays)) return 'weekdays';
    if (arraysEqual(s, weekends)) return 'weekends';
    return 'custom';
  };

  // initialize daySelectionMode from current settings when settings change
  useEffect(() => {
    const map: Record<string, string> = {};
    NOTIFICATION_CATEGORIES.forEach((c) => {
      if (c.id === 'prayer') return;
      try {
        const days = getCategoryDays(c.id);
        map[c.id] = detectDayMode(days);
      } catch {
        map[c.id] = 'everyday';
      }
    });
    setDaySelectionMode(map);
  }, [settings.notifications]);

  const getCategoryDays = (categoryId: string): number[] => {
    switch (categoryId) {
      case 'salawat': return settings.notifications.salawatDays ?? ALL_DAYS;
      case 'tasbih': return settings.notifications.tasbihDays ?? ALL_DAYS;
      case 'istighfar': return settings.notifications.istighfarDays ?? ALL_DAYS;
      case 'azkar': return settings.notifications.azkarDays ?? ALL_DAYS;
      case 'dailyVerse': return settings.notifications.dailyVerseDays ?? ALL_DAYS;
      case 'customReminder': return settings.notifications.customReminderDays ?? ALL_DAYS;
      case 'quranReading': return settings.notifications.quranReminderDays ?? ALL_DAYS;
      default: return ALL_DAYS;
    }
  };

  const updateCategoryDays = (categoryId: string, days: number[]) => {
    switch (categoryId) {
      case 'salawat': updateNotifications({ salawatDays: days }); break;
      case 'tasbih': updateNotifications({ tasbihDays: days }); break;
      case 'istighfar': updateNotifications({ istighfarDays: days }); break;
      case 'azkar': updateNotifications({ azkarDays: days }); break;
      case 'dailyVerse': updateNotifications({ dailyVerseDays: days }); break;
      case 'customReminder': updateNotifications({ customReminderDays: days }); break;
      case 'quranReading': updateNotifications({ quranReminderDays: days }); break;
    }
  };

  const toggleDay = (categoryId: string, day: number) => {
    const current = getCategoryDays(categoryId);
    const newDays = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort((a, b) => a - b);
    // Must select at least 1 day
    if (newDays.length > 0) {
      updateCategoryDays(categoryId, newDays);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // update derived selection mode
      try {
        const mode = detectDayMode(newDays);
        setDaySelectionMode(prev => ({ ...prev, [categoryId]: mode }));
      } catch {}
    }
  };

  const renderDayPicker = (categoryId: string) => {
    if (categoryId === 'prayer') return null; // prayer has its own schedule
    const selectedDays = getCategoryDays(categoryId);
    const allSelected = selectedDays.length === 7;
    const open = !!dayPickerOpen[categoryId];
    const summary = allSelected
      ? t('notificationSounds.allDays')
      : selectedDays
          .slice()
          .sort((a, b) => a - b)
          .map((d) => DAY_LABELS[d - 1])
          .join('، ');
    const borderColor = (colors as any).divider ?? 'rgba(127,127,127,0.25)';
    const triggerBg = '#091f1d';
    const toggleOpen = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setDayPickerOpen((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
    };

    const weekdaysLabel = DAY_LABELS.slice(0, 5).join('، ');
    const weekendsLabel = DAY_LABELS.slice(5).join('، ');
    const MODE_OPTIONS = [
      { value: 'everyday', label: t('notificationSounds.allDays') },
      { value: 'weekdays', label: weekdaysLabel },
      { value: 'weekends', label: weekendsLabel },
      { value: 'custom', label: t('notificationSounds.customSelection') },
    ];

    const currentMode = daySelectionMode[categoryId] || detectDayMode(selectedDays);

    const onModeChange = (v: string) => {
      if (v === 'everyday') {
        updateCategoryDays(categoryId, ALL_DAYS);
        setDaySelectionMode(prev => ({ ...prev, [categoryId]: 'everyday' }));
        setDayPickerOpen(prev => ({ ...prev, [categoryId]: false }));
      } else if (v === 'weekdays') {
        updateCategoryDays(categoryId, [1, 2, 3, 4, 5]);
        setDaySelectionMode(prev => ({ ...prev, [categoryId]: 'weekdays' }));
        setDayPickerOpen(prev => ({ ...prev, [categoryId]: false }));
      } else if (v === 'weekends') {
        updateCategoryDays(categoryId, [6, 7]);
        setDaySelectionMode(prev => ({ ...prev, [categoryId]: 'weekends' }));
        setDayPickerOpen(prev => ({ ...prev, [categoryId]: false }));
      } else {
        // custom
        setDaySelectionMode(prev => ({ ...prev, [categoryId]: 'custom' }));
        setDayPickerOpen(prev => ({ ...prev, [categoryId]: true }));
      }
    };

    return (
      <View style={[styles.dayPickerContainer, { borderTopColor: colors.divider }]}> 
          <InlineDropdown
            label={t('notificationSounds.reminderDays')}
            options={MODE_OPTIONS}
            value={currentMode as any}
            onChange={(v) => onModeChange(String(v))}
            disabled={!isEnabled}
          />

        {(currentMode === 'custom' || open) && (
          <View
            style={{
              marginTop: 8,
              borderRadius: 12,
              borderWidth: 1,
              borderColor,
              backgroundColor: triggerBg,
              padding: 12,
              gap: 10,
            }}
          >
            <View
              style={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                justifyContent: 'flex-end',
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  updateCategoryDays(categoryId, allSelected ? [6] : ALL_DAYS);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text
                  style={[
                    styles.dayPickerToggleAll,
                    {
                      color: '#0d8e62',
                      textAlign: isRTL ? 'right' : 'left',
                      writingDirection: isRTL ? 'rtl' : 'ltr',
                    },
                  ]}
                >
                  {allSelected ? t('notificationSounds.customSelection') : t('notificationSounds.allDays')}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dayChipsRow}>
              {(isRTL ? [...ALL_DAYS].reverse() : ALL_DAYS).map((day) => {
                const index = day - 1;
                const isSelected = selectedDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayChip,
                      isSelected && styles.dayChipSelected,
                      !isSelected && { backgroundColor: colors.surface },
                    ]}
                    onPress={() => toggleDay(categoryId, day)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        isSelected && styles.dayChipTextSelected,
                        !isSelected && { color: colors.textLight },
                      ]}
                    >
                      {DAY_LABELS[index]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>
    );
  };

  // ========================================
  // Render category expanded content
  // ========================================

  const renderPrayerExpanded = () => (
    <View style={styles.expandedContent}>
      {/* Prayer reminder toggle */}
      <View style={[styles.innerSettingRow, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="bell-ring" size={18} color="#c07b10" />
          <Text style={[styles.innerSettingTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('notificationSounds.reminderBeforeAdhan')}
          </Text>
        </View>
        <Switch
          value={settings.notifications.prayerReminder}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateNotifications({ prayerReminder: val });
          }}
          trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
          disabled={!isEnabled}
        />
      </View>

      {/* Reminder minutes selector */}
      {settings.notifications.prayerReminder && (
        <InlineDropdown
          label={t('notificationSounds.reminderBeforeAdhanBy')}
          options={REMINDER_OPTIONS}
          value={settings.notifications.reminderMinutes ?? 10}
          onChange={(v) => updateNotifications({ reminderMinutes: v })}
          disabled={!isEnabled}
        />
      )}

      {/* Individual prayer toggles */}
      <View style={styles.prayerTogglesContainer}>
        <Text style={[styles.smallLabel, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {t('notificationSounds.selectPrayers')}
        </Text>
        {PRAYER_NAMES.map((prayer) => {
          const isFajr = prayer.key === 'fajr';
          const fajrExpanded = isFajr && fajrModeExpanded && prayerNotifications.fajr && isEnabled;
          const onRowTap = isFajr && prayerNotifications.fajr && isEnabled
            ? () => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setFajrModeExpanded((v) => !v);
              }
            : undefined;
          return (
            <React.Fragment key={prayer.key}>
              <View style={[styles.innerSettingRow, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row', flex: 1 }]}
                  onPress={onRowTap}
                  disabled={!onRowTap}
                  activeOpacity={onRowTap ? 0.7 : 1}
                >
                  <MaterialCommunityIcons
                    name={prayer.icon as any}
                    size={18}
                    color={prayer.key === 'fajr' ? '#4a3d73' : prayer.key === 'isha' ? '#3a7ca5' : '#c17f59'}
                  />
                  <Text style={[styles.innerSettingTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {prayer.name}
                  </Text>
                  {isFajr && prayerNotifications.fajr && isEnabled && (
                    <MaterialCommunityIcons
                      name={fajrExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.textLight}
                    />
                  )}
                </TouchableOpacity>
                <Switch
                  value={prayerNotifications[prayer.key]}
                  onValueChange={(val) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleTogglePrayerNotification(prayer.key, val);
                    if (isFajr && !val) setFajrModeExpanded(false);
                  }}
                  trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
                  thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                  ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
                  disabled={!isEnabled}
                />
              </View>
              {fajrExpanded && <FajrModePicker />}
            </React.Fragment>
          );
        })}
      </View>

      {/* "هل صليت؟" reminder controls */}
      <View style={[styles.innerSettingRow, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.innerSettingInfo, { flex: 1, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="help-circle-outline" size={20} color="#0d8e62" />
          <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={[styles.innerSettingTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('notificationSounds.didYouPrayReminderTitle')}
            </Text>
            <Text style={[{ fontSize: 12, color: colors.textLight, marginTop: 2, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('notificationSounds.didYouPrayReminderSubtitle')}
            </Text>
          </View>
        </View>
        <Switch
          value={settings.notifications.didYouPrayReminder !== false}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateNotifications({ didYouPrayReminder: val });
          }}
          trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
          disabled={!isEnabled}
        />
      </View>

      {settings.notifications.didYouPrayReminder !== false && (
        <>
          <InlineDropdown
            label={t('notificationSounds.didYouPrayDelayLabel')}
            options={DID_YOU_PRAY_DELAY_OPTIONS.map((v) => ({
              value: v,
              label: `${v} ${t('prayer.minutes')}`,
            }))}
            value={settings.notifications.didYouPrayDelayMinutes ?? 30}
            onChange={(v) => updateNotifications({ didYouPrayDelayMinutes: v })}
            disabled={!isEnabled}
          />

          <InlineDropdown
            label={t('notificationSounds.didYouPraySnoozeLabel')}
            options={DID_YOU_PRAY_SNOOZE_OPTIONS.map((v) => ({
              value: v,
              label: `${v} ${t('prayer.minutes')}`,
            }))}
            value={settings.notifications.didYouPraySnoozeMinutes ?? 15}
            onChange={(v) => updateNotifications({ didYouPraySnoozeMinutes: v })}
            disabled={!isEnabled}
          />
        </>
      )}

      {/* Full Adhan toggle — plays the complete adhan recording at prayer time. On iOS, playback will be cut automatically at ~29s by the system. */}
      <View style={[styles.adhanSoundSection, { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}>
        <View
          style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }}
        >
          <MaterialCommunityIcons
            name={settings.notifications.useFullAdhan ? 'volume-vibrate' : 'volume-medium'}
            size={22}
            color={'#0d8e62'}
          />
          <View style={{ flex: 1 }}>
            <Text style={{
              color: colors.text,
              fontFamily: fontSemiBold(),
              fontSize: 15,
              textAlign: isRTL ? 'right' : 'left',
              writingDirection: isRTL ? 'rtl' : 'ltr',
            }}>
              {t('notificationSounds.useFullAdhan')}
            </Text>
          </View>
          <Switch
            value={settings.notifications.useFullAdhan === true}
            onValueChange={(next) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleFullAdhanToggle(next);
            }}
            trackColor={{ false: colors.divider, true: '#0d8e62' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Adhan sound selection */}
      <View style={styles.adhanSoundSection}>
        {/* Selected sound summary / toggle header */}
        <TouchableOpacity
          style={[styles.adhanSoundHeader, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => {
            springLayoutAnimation();
            setAdhanListExpanded(!adhanListExpanded);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="volume-high" size={20} color="#0d8e62" />
          <Text style={[styles.adhanSoundHeaderText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('notificationSounds.adhanSound')}
          </Text>
          {(() => {
            const selectedAdhan = ADHAN_SOUNDS.find(s => s.id === regularAdhanSoundType);
            return selectedAdhan ? (
              <Text style={[styles.adhanSelectedName, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {selectedAdhan.name}
              </Text>
            ) : null;
          })()}
          <MaterialCommunityIcons
            name={adhanListExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textLight}
          />
        </TouchableOpacity>

        {/* Selected sound preview row (when collapsed) */}
        {!adhanListExpanded && (() => {
          const selectedId = regularAdhanSoundType;
          const selectedSound = ADHAN_SOUNDS.find(s => s.id === selectedId);
          if (!selectedSound || selectedId === 'default') return null;
          return (
            <View style={[styles.adhanSoundOption, { borderBottomColor: colors.divider }, styles.adhanSoundOptionSelected, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.adhanSoundIconBg, styles.adhanSoundIconBgSelected]}>
                <MaterialCommunityIcons name="volume-high" size={18} color="#fff" />
              </View>
              <View style={[styles.adhanSoundContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.adhanSoundTitle, styles.adhanSoundTitleSelected, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {selectedSound.name}
                </Text>
                <Text style={[styles.adhanSoundSubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {selectedSound.description}
                </Text>
              </View>
              {ADHAN_SOUND_FILES[selectedId] && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    playPreview(selectedId);
                  }}
                  style={[styles.previewButton, previewPlaying === selectedId && styles.previewButtonActive]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {previewLoading === selectedId ? (
                    <ActivityIndicator size="small" color="#0d8e62" />
                  ) : (
                    <MaterialCommunityIcons
                      name={previewPlaying === selectedId ? 'stop-circle' : 'play-circle'}
                      size={26}
                      color={previewPlaying === selectedId ? '#ef5350' : '#0d8e62'}
                    />
                  )}
                </TouchableOpacity>
              )}
              <MaterialCommunityIcons name="check-circle" size={22} color="#0d8e62" />
            </View>
          );
        })()}
        {adhanListExpanded && ADHAN_SOUNDS.filter(s => !disabledSoundIds.has(s.id)).map((sound) => {
          const isSelected = regularAdhanSoundType === sound.id;
          const isSoundLocked = !isPremium && !FREE_ADHAN_IDS.includes(sound.id);
          return (
            <TouchableOpacity
              key={sound.id}
              style={[
                styles.adhanSoundOption,
                { borderBottomColor: colors.divider },
                isSelected && styles.adhanSoundOptionSelected,
                { flexDirection: isRTL ? 'row-reverse' : 'row', opacity: isSoundLocked ? 0.6 : 1 },
              ]}
              onPress={() => {
                if (isSoundLocked) {
                  guardPremiumFeature('sound_downloads', router, isPremium);
                  return;
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateNotifications({ adhanSoundType: sound.id });
                springLayoutAnimation();
                setAdhanListExpanded(false);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.adhanSoundIconBg, isSelected && styles.adhanSoundIconBgSelected, !isSelected && { backgroundColor: colors.surface }]}>
                <MaterialCommunityIcons
                  name={isSoundLocked ? 'lock' : sound.icon as any}
                  size={18}
                  color={isSelected ? '#fff' : colors.textLight}
                />
              </View>
              <View style={[styles.adhanSoundContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[
                  styles.adhanSoundTitle,
                  { color: colors.text },
                  isSelected && styles.adhanSoundTitleSelected,
                  { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                ]}>
                  {sound.name}
                </Text>
                <Text style={[styles.adhanSoundSubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {sound.description}
                </Text>
              </View>
              {ADHAN_SOUND_FILES[sound.id] && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation?.();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    playPreview(sound.id);
                  }}
                  style={[styles.previewButton, previewPlaying === sound.id && styles.previewButtonActive]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {previewLoading === sound.id ? (
                    <ActivityIndicator size="small" color="#0d8e62" />
                  ) : (
                    <MaterialCommunityIcons
                      name={previewPlaying === sound.id ? 'stop-circle' : 'play-circle'}
                      size={26}
                      color={previewPlaying === sound.id ? '#ef5350' : '#0d8e62'}
                    />
                  )}
                </TouchableOpacity>
              )}
              {isSelected && (
                <MaterialCommunityIcons name="check-circle" size={22} color="#0d8e62" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {showBatteryOptimizationTip && (
        <View
          style={[
            styles.prayerBatteryTip,
            {
              backgroundColor: isDarkMode ? 'rgba(245,158,11,0.12)' : '#FFF7E6',
              borderColor: isDarkMode ? 'rgba(245,158,11,0.35)' : '#FFE2A8',
            },
          ]}
        >
          <View style={[styles.prayerBatteryTipHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.prayerBatteryTipIcon}>
              <MaterialCommunityIcons name="alert" size={18} color="#f59e0b" />
            </View>
            <Text style={[styles.prayerBatteryTipTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {uiText({ ar: 'لضمان وصول الإشعارات', en: 'To keep notifications reliable' })}
            </Text>
          </View>
          <Text style={[styles.prayerBatteryTipBody, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {uiText({
              ar: 'استثناء التطبيق من توفير البطارية يساعد إشعارات الصلاة على الوصول في وقتها دائماً.',
              en: 'Excluding the app from battery optimization helps prayer notifications arrive on time.',
            })}
          </Text>
          <TouchableOpacity
            style={[styles.prayerBatteryTipButton, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={handleBatteryOptimizationPress}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="battery-check" size={18} color="#fff" />
            <Text style={styles.prayerBatteryTipButtonText}>
              {uiText({ ar: 'استثناء التطبيق', en: 'Exclude app' })}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Test + Close buttons */}
      {renderTestButton('prayer')}
      {renderCloseButton()}
    </View>
  );

  const renderAzkarExpanded = () => (
    <View style={styles.expandedContent}>
      {/* Phase 7: Auto-anchor toggle — يربط أوقات الأذكار بأوقات الصلاة الفعلية */}
      <View style={[styles.innerSettingRow, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row', flex: 1 }]}>
          <MaterialCommunityIcons name="link-variant" size={18} color="#0d8e62" />
          <View style={{ flex: 1, marginHorizontal: 8 }}>
            <Text style={[styles.innerSettingTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {uiText({ ar: 'ربط بأوقات الصلاة تلقائياً', en: 'Link automatically to prayer times' })}
            </Text>
            <Text style={[{ color: colors.textLight, fontSize: 11, marginTop: 2, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {uiText({
                ar: 'صباح: بعد الفجر بنصف ساعة • مساء: بعد العصر بربع ساعة',
                en: 'Morning: 30 min after Fajr • Evening: 15 min after Asr',
              })}
            </Text>
          </View>
        </View>
        <Switch
          value={settings.notifications.azkarAutoAnchor === true}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateNotifications({ azkarAutoAnchor: val });
          }}
          trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
          disabled={!isEnabled}
        />
      </View>

      {/* Morning Azkar */}
      <View style={[styles.innerSettingRow, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="weather-sunset-up" size={18} color="#c07b10" />
          <Text style={[styles.innerSettingTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('notificationSounds.morningAzkar')}
          </Text>
        </View>
        <Switch
          value={settings.notifications.morningAzkar}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateNotifications({ morningAzkar: val });
          }}
          trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
          disabled={!isEnabled}
        />
      </View>

      {settings.notifications.morningAzkar && renderMultiTimePicker('morningAzkar', '#c07b10')}

      {/* Evening Azkar */}
      <View style={[styles.innerSettingRow, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="weather-sunset-down" size={18} color="#4a3d73" />
          <Text style={[styles.innerSettingTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('notificationSounds.eveningAzkar')}
          </Text>
        </View>
        <Switch
          value={settings.notifications.eveningAzkar}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateNotifications({ eveningAzkar: val });
          }}
          trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
          disabled={!isEnabled}
        />
      </View>

      {settings.notifications.eveningAzkar && renderMultiTimePicker('eveningAzkar', '#4a3d73')}

      {/* Sleep Azkar */}
      <View style={[styles.innerSettingRow, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="bed" size={18} color="#3B82F6" />
          <Text style={[styles.innerSettingTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('notificationSounds.sleepAzkar')}
          </Text>
        </View>
        <Switch
          value={settings.notifications.sleepAzkar}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateNotifications({ sleepAzkar: val });
          }}
          trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
          disabled={!isEnabled}
        />
      </View>

      {settings.notifications.sleepAzkar && renderMultiTimePicker('sleepAzkar', '#3B82F6')}

      {/* Wakeup Azkar */}
      <View style={[styles.innerSettingRow, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="weather-sunset-up" size={18} color="#10B981" />
          <Text style={[styles.innerSettingTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('notificationSounds.wakeupAzkar')}
          </Text>
        </View>
        <Switch
          value={settings.notifications.wakeupAzkar}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateNotifications({ wakeupAzkar: val });
          }}
          trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
          disabled={!isEnabled}
        />
      </View>

      {settings.notifications.wakeupAzkar && renderMultiTimePicker('wakeupAzkar', '#10B981')}

      {/* Day-of-week picker for all azkar */}
      {renderDayPicker('azkar')}

      {/* Sound picker */}
      {renderReminderSoundPicker('azkar')}

      {renderTestButton('azkar')}
      {renderCloseButton()}
    </View>
  );

  // Reusable per-category sound picker
  const renderReminderSoundPicker = (categoryId: string) => {
    const selectedSound = getCategorySoundType(categoryId);
    return (
      <View style={styles.reminderSoundSection}>
        <View style={[styles.adhanSoundHeader, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="volume-high" size={20} color="#0d8e62" />
          <Text style={[styles.adhanSoundHeaderText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('notificationSounds.reminderSound')}
          </Text>
        </View>
        {REMINDER_SOUNDS.filter(s => s.id === 'default' || s.id === 'silent' || !disabledSoundIds.has(s.id)).map((sound) => {
          const isSelected = selectedSound === sound.id;
          return (
            <TouchableOpacity
              key={sound.id}
              style={[
                styles.adhanSoundOption,
                { borderBottomColor: colors.divider },
                isSelected && styles.adhanSoundOptionSelected,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateCategorySoundType(categoryId, sound.id);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.adhanSoundIconBg, isSelected && styles.adhanSoundIconBgSelected, !isSelected && { backgroundColor: colors.surface }]}>
                <MaterialCommunityIcons
                  name={sound.id === 'silent' ? 'bell-off' : 'volume-high'}
                  size={18}
                  color={isSelected ? '#fff' : colors.textLight}
                />
              </View>
              <View style={[styles.adhanSoundContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[
                  styles.adhanSoundTitle,
                  { color: colors.text },
                  isSelected && styles.adhanSoundTitleSelected,
                  { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                ]}>
                  {t(sound.nameKey)}
                </Text>
              </View>
              {NOTIFICATION_SOUND_FILES[sound.id] && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation?.();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    playPreview(sound.id);
                  }}
                  style={[styles.previewButton, previewPlaying === sound.id && styles.previewButtonActive]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {previewLoading === sound.id ? (
                    <ActivityIndicator size="small" color="#0d8e62" />
                  ) : (
                    <MaterialCommunityIcons
                      name={previewPlaying === sound.id ? 'stop-circle' : 'play-circle'}
                      size={26}
                      color={previewPlaying === sound.id ? '#ef5350' : '#0d8e62'}
                    />
                  )}
                </TouchableOpacity>
              )}
              {isSelected && (
                <MaterialCommunityIcons name="check-circle" size={22} color="#0d8e62" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Reusable multi-time picker list
  const renderMultiTimePicker = (categoryId: string, iconColor: string) => {
    const times = getCategoryTimes(categoryId);
    if (!times || times.length === 0) return null;

    return (
      <View>
        {times.map((time, index) => {
          const pickerKey = `time_${categoryId}_${index}`;
          return (
            <View key={pickerKey}>
              <View style={[styles.multiTimeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  style={[styles.timePickerRow, { backgroundColor: colors.surface, flexDirection: isRTL ? 'row-reverse' : 'row', flex: 1 }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTimePicker(activeTimePicker === pickerKey ? null : pickerKey);
                  }}
                >
                  <MaterialCommunityIcons name="clock-outline" size={18} color={iconColor} />
                  <Text style={[styles.timePickerLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {times.length > 1 ? `${t('notificationSounds.reminderTime')} ${index + 1}` : t('notificationSounds.reminderTime')}
                  </Text>
                  <Text style={styles.timePickerValue}>
                    {formatDisplayTime(time)}
                  </Text>
                </TouchableOpacity>
                {times.length > 1 && (
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const newTimes = times.filter((_, i) => i !== index);
                      updateCategoryTimes(categoryId, newTimes);
                    }}
                    style={styles.removeTimeButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="close-circle" size={22} color="#ef5350" />
                  </TouchableOpacity>
                )}
              </View>
              {activeTimePicker === pickerKey && (
                <DateTimePicker
                  value={parseTime(time)}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  themeVariant={isDarkMode ? 'dark' : 'light'}
                  onChange={(_, selectedDate) => {
                    if (Platform.OS !== 'ios') setActiveTimePicker(null);
                    if (selectedDate) {
                      const newTimes = [...times];
                      newTimes[index] = formatTime(selectedDate);
                      updateCategoryTimes(categoryId, newTimes);
                    }
                  }}
                />
              )}
            </View>
          );
        })}
        {times.length < MAX_TIMES && (
          <TouchableOpacity
            style={[styles.addTimeButton, { borderColor: iconColor, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              springLayoutAnimation();
              updateCategoryTimes(categoryId, [...times, times[times.length - 1]]);
            }}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={18} color={iconColor} />
            <Text style={[styles.addTimeText, { color: iconColor }]}>
              {t('notificationSounds.addTime')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderSimpleExpanded = (categoryId: string) => {
    const category = NOTIFICATION_CATEGORIES.find(c => c.id === categoryId);

    return (
      <View style={styles.expandedContent}>
        {/* Multi-time pickers */}
        {renderMultiTimePicker(categoryId, category?.iconColor || '#0d8e62')}

        {/* Day-of-week picker */}
        {renderDayPicker(categoryId)}

        {/* Per-category sound picker */}
        {renderReminderSoundPicker(categoryId)}

        {renderTestButton(categoryId)}
        {renderCloseButton()}
      </View>
    );
  };

  const handleTestNotification = useCallback(async (categoryId: string) => {
    if (testingSending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTestingSending(categoryId);
    setTestingSent(null);
    try {
      const soundType = getCategorySoundType(categoryId);
      await sendTestNotification(categoryId, {
        soundType,
        adhanSoundType: regularAdhanSoundType,
        fullAdhanSoundType: settings.notifications.fullAdhanSoundType || 'makkah',
        sound: settings.notifications.sound,
        vibration: settings.notifications.vibration,
        useFullAdhan: settings.notifications.useFullAdhan === true,
        advanceMinutes: categoryId === 'prayer' && settings.notifications.prayerReminder
          ? (settings.notifications.reminderMinutes ?? 0)
          : 0,
      });
      setTestingSent(categoryId);
      setTimeout(() => setTestingSent(null), 2500);
    } catch (e: any) {
      if (e?.message !== 'NO_PERMISSION') {
        Alert.alert(t('notificationSounds.testError'), t('notificationSounds.testErrorMsg'));
      }
    } finally {
      setTestingSending(null);
    }
  }, [testingSending, settings.notifications]);

  const renderTestButton = (categoryId: string) => {
    const isSending = testingSending === categoryId;
    const wasSent = testingSent === categoryId;
    const isEnabled = getCategoryEnabled(categoryId);
    return (
      <TouchableOpacity
        style={[
          styles.testNotifButton,
          { backgroundColor: '#091f1d', flexDirection: isRTL ? 'row-reverse' : 'row', opacity: isEnabled ? 1 : 0.5 },
        ]}
        onPress={() => handleTestNotification(categoryId)}
        disabled={!isEnabled || isSending}
        activeOpacity={0.7}
      >
        {isSending ? (
          <ActivityIndicator size="small" color="#0d8e62" />
        ) : wasSent ? (
          <MaterialCommunityIcons name="check-circle" size={18} color="#0d8e62" />
        ) : (
          <MaterialCommunityIcons name="bell-ring-outline" size={18} color="#0d8e62" />
        )}
        <Text style={[styles.testNotifText, { color: wasSent ? '#0d8e62' : '#ffffff', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {wasSent ? t('notificationSounds.testSuccess') : t('notificationSounds.testNotification')}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderCloseButton = () => {
    return (
      <View style={[styles.actionButtonsRow, { flexDirection: isRTL ? 'row-reverse' : 'row', borderTopColor: colors.divider }]}>
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.surface, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={collapseCategory}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="check" size={18} color={colors.text} />
          <Text style={[styles.closeButtonText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('common.done')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCustomReminderExpanded = () => {
    const customTitle = settings.notifications.customReminderTitle || '';
    const contentType = settings.notifications.customReminderContentType || 'text';
    const selectedSurah = settings.notifications.customReminderSurah || 0;

    return (
      <View style={styles.expandedContent}>
        {/* Content type selector */}
        <Text style={[styles.contentSectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {t('notificationSounds.reminderType')}
        </Text>
        <View style={[styles.contentTypeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {CONTENT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.contentTypeChip,
                { borderColor: colors.border },
                isDarkMode && { backgroundColor: colors.surface },
                contentType === type.id && styles.contentTypeChipActive,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateNotifications({ customReminderContentType: type.id });
              }}
            >
              <MaterialCommunityIcons 
                name={type.icon} 
                size={16} 
                color={contentType === type.id ? '#fff' : colors.textLight} 
              />
              <Text style={[
                styles.contentTypeText,
                contentType === type.id && styles.contentTypeTextActive,
                contentType !== type.id && { color: colors.textLight },
                { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
              ]}>
                {t(type.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom title input — always visible */}
        <View style={[styles.timePickerRow, { backgroundColor: colors.surface }, { marginBottom: 6 }, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="pencil-outline" size={18} color={isDarkMode ? "#e67e22" : "#b85c16"} />
          <TextInput
            style={[styles.customTitleInput, { color: colors.text }]}
            placeholder={contentType === 'text' ? t('notificationSounds.reminderTextPlaceholder') : t('notificationSounds.customTitlePlaceholder')}
            placeholderTextColor={colors.textLight}
            value={customTitle}
            onChangeText={(text) => updateNotifications({ customReminderTitle: text })}
            textAlign={isRTL ? 'right' : 'left'}
          />
        </View>

        {/* Surah picker — for 'surah' type */}
        {contentType === 'surah' && (
          <>
            <TouchableOpacity
              style={[styles.timePickerRow, { backgroundColor: colors.surface, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setShowSurahPicker(!showSurahPicker);
              }}
            >
              <MaterialCommunityIcons name="book-open-variant" size={18} color="#0d8e62" />
              <Text style={[styles.timePickerLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('notificationSounds.surah')}
              </Text>
              <Text style={styles.timePickerValue}>
                {selectedSurah > 0 ? getSurahName(selectedSurah) : t('notificationSounds.chooseSurah')}
              </Text>
              <MaterialCommunityIcons 
                name={showSurahPicker ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color={colors.textLight} 
              />
            </TouchableOpacity>

            {showSurahPicker && (
              <ScrollView 
                style={[styles.surahPickerList, { backgroundColor: colors.surface }]} 
                nestedScrollEnabled
              >
                {Array.from({ length: 114 }, (_, i) => i + 1).map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.surahPickerItem,
                      selectedSurah === num && styles.surahPickerItemActive,
                      { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.divider },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateNotifications({ 
                        customReminderSurah: num,
                        customReminderAyah: 1,
                      });
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setShowSurahPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.surahPickerNumber,
                      { color: colors.textLight },
                      selectedSurah === num && { color: '#fff' },
                      { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                    ]}>
                      {num}
                    </Text>
                    <Text style={[
                      styles.surahPickerName,
                      { color: colors.text },
                      selectedSurah === num && { color: '#fff' },
                      { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                    ]}>
                      {getSurahName(num)}
                    </Text>
                    <Text style={[
                      styles.surahPickerAyahCount,
                      { color: colors.textLight },
                      selectedSurah === num && { color: 'rgba(255,255,255,0.7)' },
                      { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                    ]}>
                      {uiText({
                        ar: `${AYAH_COUNTS[num - 1]} آية`,
                        en: `${AYAH_COUNTS[num - 1]} ayahs`,
                      })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        )}

        {/* Multi-time picker */}
        {renderMultiTimePicker('customReminder', isDarkMode ? "#e67e22" : "#b85c16")}

        {/* Day-of-week picker */}
        {renderDayPicker('customReminder')}

        {renderReminderSoundPicker('customReminder')}

        {renderTestButton('customReminder')}
        {renderCloseButton()}
      </View>
    );
  };

  const renderKahfExpanded = () => {
    const kahfTime = settings.notifications.kahfTime ?? '14:00';
    const pickerKey = 'time_kahf_0';
    
    const formatDisplayTime = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      const period = h >= 12 ? (isRTL ? 'م' : 'PM') : (isRTL ? 'ص' : 'AM');
      const hour12 = h % 12 || 12;
      return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
    };
    
    const parseTimeValue = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      const date = new Date();
      date.setHours(h, m, 0, 0);
      return date;
    };
    
    const formatTimeValue = (date: Date) => {
      const h = date.getHours().toString().padStart(2, '0');
      const m = date.getMinutes().toString().padStart(2, '0');
      return `${h}:${m}`;
    };
    
    return (
      <View style={styles.expandedContent}>
        {/* Friday note */}
        <View style={[styles.dayPickerContainer, { borderTopColor: colors.divider }]}>
          <View style={[styles.dayPickerHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="calendar-week" size={18} color={colors.textLight} />
            <Text style={[styles.dayPickerLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {isRTL ? 'كل يوم جمعة' : 'Every Friday'}
            </Text>
          </View>
        </View>
        
        {/* Time picker */}
        <View style={[styles.reminderSoundSection, { borderTopColor: colors.divider }]}>
          <TouchableOpacity
            style={[styles.timePickerRow, { backgroundColor: colors.surface, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTimePicker(activeTimePicker === pickerKey ? null : pickerKey);
            }}
          >
            <MaterialCommunityIcons name="clock-outline" size={18} color="#1a6b4a" />
            <Text style={[styles.timePickerLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('notificationSounds.reminderTime')}
            </Text>
            <Text style={styles.timePickerValue}>
              {formatDisplayTime(kahfTime)}
            </Text>
          </TouchableOpacity>
          
          {activeTimePicker === pickerKey && (
            <DateTimePicker
              value={parseTimeValue(kahfTime)}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              themeVariant={isDarkMode ? 'dark' : 'light'}
              onChange={(_, selectedDate) => {
                if (Platform.OS !== 'ios') setActiveTimePicker(null);
                if (selectedDate) {
                  updateNotifications({ kahfTime: formatTimeValue(selectedDate), notifOverrides: { ...settings.notifications.notifOverrides, kahfFriday: true } });
                }
              }}
            />
          )}
        </View>
        
        {renderTestButton('kahf')}
        {renderCloseButton()}
      </View>
    );
  };

  const renderWorshipWeeklyExpanded = () => {
    return (
      <View style={styles.expandedContent}>
        {/* Friday note */}
        <View style={[styles.dayPickerContainer, { borderTopColor: colors.divider }]}>
          <View style={[styles.dayPickerHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="calendar-week" size={18} color={colors.textLight} />
            <Text style={[styles.dayPickerLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {isRTL ? 'كل يوم جمعة' : 'Every Friday'}
            </Text>
          </View>
        </View>

        {renderTestButton('worshipWeeklyReport')}
        {renderCloseButton()}
      </View>
    );
  };

  const renderExpandedContent = (categoryId: string) => {
    switch (categoryId) {
      case 'prayer': return renderPrayerExpanded();
      case 'azkar': return renderAzkarExpanded();
      case 'customReminder': return renderCustomReminderExpanded();
      case 'kahf': return renderKahfExpanded();
      case 'quranReading': return renderSimpleExpanded(categoryId);
      case 'worshipDailySummary': return renderSimpleExpanded(categoryId);
      case 'worshipWeeklyReport': return renderWorshipWeeklyExpanded();
      default: return renderSimpleExpanded(categoryId);
    }
  };

  // ========================================
  // Render
  // ========================================

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top']}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(500)}
        style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <MaterialCommunityIcons name={isRTL ? 'arrow-right' : 'arrow-left'} size={28} color={colors.text} />
        </TouchableOpacity>
        <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('settings.prayerAndAzkarAlerts')}</Text>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Permission Card */}
        {permissionChecked && permissionStatus !== 'granted' && (
          <Animated.View entering={FadeInDown.delay(50).duration(500)}>
            <TouchableOpacity
              style={[styles.permissionCard, { backgroundColor: isDarkMode ? 'rgba(239,68,68,0.15)' : '#FEF2F2', borderColor: isDarkMode ? 'rgba(239,68,68,0.3)' : '#FEE2E2' }, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={requestPermissions}
              activeOpacity={0.8}
            >
              <View style={[styles.permissionIcon, { backgroundColor: colors.card }]}>
                <MaterialCommunityIcons name="bell-off" size={32} color="#ef5350" />
              </View>
              <View style={[styles.permissionContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.permissionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {t('notificationSounds.notificationsDisabled')}
                </Text>
                <Text style={[styles.permissionSubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {t('notificationSounds.tapToEnable')}
                </Text>
              </View>
              <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={24} color="#ef5350" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Main Toggle */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <View style={[styles.mainToggleCard, { backgroundColor: colors.card, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.mainToggleIconBg}>
              <MaterialCommunityIcons name="bell" size={26} color="#fff" />
            </View>
            <View style={[styles.mainToggleContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.mainToggleTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('notificationSounds.enableNotifications')}
              </Text>
              <Text style={[styles.mainToggleSubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('settings.prayerAndAzkarAlerts')}
              </Text>
            </View>
            <Switch
              value={settings.notifications.enabled}
              onValueChange={handleToggleMain}
              trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
              thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
            />
          </View>
        </Animated.View>

        {/* Phase 10: Health Dashboard link — FULLY HIDDEN from UI.
            Background telemetry + auto-heal continue to run silently.
            The screen itself remains routable via deep link
            `/settings/notifications-health` for internal/manual QA only. */}

        {/* Notification Categories */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('notificationSounds.notificationTypes')}
          </Text>

          <View style={[styles.categoriesContainer, { backgroundColor: 'transparent' }]}>
            {NOTIFICATION_CATEGORIES.map((category, index) => {
              const categoryEnabled = getCategoryEnabled(category.id);
              const isExpanded = expandedCategory === category.id;
              const isLast = index === NOTIFICATION_CATEGORIES.length - 1;

              return (
                <View
                  key={category.id}
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(15,25,30,0.55)' : 'rgba(255,255,255,0.85)',
                    marginHorizontal: 12,
                    marginBottom: 8,
                    borderRadius: 14,
                    overflow: 'hidden',
                  }}
                >
                  {/* Category header row */}
                  <TouchableOpacity
                    style={[
                      styles.categoryRow,
                      { backgroundColor: 'transparent', marginHorizontal: 0, marginBottom: 0, borderRadius: 0 },
                      !isEnabled && styles.disabledOpacity,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                    onPress={() => {
                      if (isEnabled) toggleCategory(category.id);
                    }}
                    activeOpacity={isEnabled ? 0.7 : 1}
                  >
                    <View style={[styles.categoryIconBg, { backgroundColor: category.iconColor + '18' }]}>
                      <MaterialCommunityIcons
                        name={category.icon}
                        size={22}
                        color={category.iconColor}
                      />
                    </View>
                    <View style={[styles.categoryContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Text style={[styles.categoryTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                        {t(category.titleKey)}
                      </Text>
                      <Text style={[styles.categorySubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>
                        {t(category.subtitleKey)}
                      </Text>
                    </View>
                    <Switch
                      value={categoryEnabled}
                      onValueChange={(val) => {
                        if (isEnabled) {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          toggleCategoryEnabled(category.id, val);
                          if (val && !isExpanded) {
                            springLayoutAnimation();
                            setExpandedCategory(category.id);
                          }
                        }
                      }}
                      trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
                      thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                      ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
                      disabled={!isEnabled}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        if (isEnabled) toggleCategory(category.id);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.expandArrow}
                    >
                      <MaterialCommunityIcons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={22}
                        color={colors.textLight}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>

                  {/* Expanded content (lives inside the category card so it shares the same surface) */}
                  {isExpanded && categoryEnabled && isEnabled && (
                    <View style={[
                      styles.expandedWrapper,
                      { backgroundColor: 'transparent', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
                    ]}>
                      {renderExpandedContent(category.id)}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Sound & Vibration global settings */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          {/* Visual separator between the notification list and the sound block */}
          <View
            style={{
              height: StyleSheet.hairlineWidth,
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
              marginHorizontal: 16,
              marginTop: 24,
              marginBottom: 4,
            }}
          />
          <Text style={[styles.sectionTitle, { color: colors.textLight, marginTop: 8, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('settings.sound')}</Text>
          <View style={[styles.categoriesContainer, { backgroundColor: 'transparent' }]}>
            <View
              style={{
                backgroundColor: isDarkMode ? 'rgba(15,25,30,0.55)' : 'rgba(255,255,255,0.85)',
                marginHorizontal: 12,
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              <View style={[styles.innerSettingRow, styles.globalSettingRow, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }]}>
                <View style={[styles.categoryIconBg, { backgroundColor: '#c17f5918' }]}>
                  <MaterialCommunityIcons name="volume-high" size={20} color="#c17f59" />
                </View>
                <Text style={[styles.categoryTitle, { color: colors.text, flex: 1, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>
                  {t('notificationSounds.notificationSound')}
                </Text>
                <Switch
                  value={settings.notifications.sound !== false}
                  onValueChange={(val) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateNotifications({ sound: val });
                  }}
                  trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
                  thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                  ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
                  disabled={!isEnabled}
                />
              </View>

              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', marginHorizontal: 16 }} />

              <View style={[styles.innerSettingRow, styles.globalSettingRow, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }]}>
                <View style={[styles.categoryIconBg, { backgroundColor: '#ef535018' }]}>
                  <MaterialCommunityIcons name="vibrate" size={20} color="#ef5350" />
                </View>
                <Text style={[styles.categoryTitle, { color: colors.text, flex: 1, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>
                  {t('notificationSounds.vibration')}
                </Text>
                <Switch
                  value={settings.notifications.vibration !== false}
                  onValueChange={(val) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateNotifications({ vibration: val });
                  }}
                  trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
                  thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                  ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
                  disabled={!isEnabled}
                />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Downloadable Sounds Section */}
        {downloadableSounds.length > 0 && (
          <Animated.View entering={FadeInDown.delay(350).duration(500)}>
            <TouchableOpacity
              style={[styles.downloadSectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                springLayoutAnimation();
                setShowDownloadSection(!showDownloadSection);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.categoryIconBg, { backgroundColor: '#ab47bc18' }]}>
                  <MaterialCommunityIcons name="download" size={22} color="#ab47bc" />
                </View>
                <View>
                  <Text style={[styles.categoryTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {t('notificationSounds.additionalSounds')}
                  </Text>
                  <Text style={[styles.categorySubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {downloadableSounds.length} {t('notificationSounds.soundsAvailable')}
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons
                name={showDownloadSection ? 'chevron-up' : 'chevron-down'}
                size={24}
                color={colors.textLight}
              />
            </TouchableOpacity>

            {showDownloadSection && (
              <View style={[styles.categoriesContainer, { backgroundColor: 'transparent', marginTop: 8 }]}>
                {downloadableSounds.map((sound, index) => {
                  const isDownloaded = downloadedSounds.some(d => d.id === sound.id);
                  const isDownloading = downloadingId === sound.id;
                  const isLast = index === downloadableSounds.length - 1;

                  return (
                    <View
                      key={sound.id}
                      style={[
                        styles.downloadSoundRow,
                        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                        { flexDirection: isRTL ? 'row-reverse' : 'row' },
                      ]}
                    >
                      <View style={[styles.downloadSoundInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <MaterialCommunityIcons
                          name={isDownloaded ? 'check-circle' : 'music-circle'}
                          size={28}
                          color={isDownloaded ? '#0d8e62' : '#ab47bc'}
                        />
                        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                          <Text style={[styles.downloadSoundName, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                            {sound.name}
                          </Text>
                          {sound.description ? (
                            <Text style={[styles.downloadSoundDesc, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>
                              {sound.description}
                            </Text>
                          ) : null}
                          <Text style={[styles.downloadSoundSize, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                            {(sound.fileSize / 1024).toFixed(0)} KB
                          </Text>
                        </View>
                      </View>

                      {isDownloaded ? (
                        <View style={[styles.downloadedBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <MaterialCommunityIcons name="check" size={14} color="#0d8e62" />
                          <Text style={[styles.downloadedText, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('notificationSounds.downloaded')}</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.downloadButton, isDownloading && styles.downloadButtonLoading, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                          onPress={() => handleDownloadSound(sound)}
                          disabled={isDownloading}
                          activeOpacity={0.7}
                        >
                          {isDownloading ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <MaterialCommunityIcons name="download" size={16} color="#fff" />
                              <Text style={[styles.downloadButtonText, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('notificationSounds.download')}</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </Animated.View>
        )}

        {/* Info Card */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={[styles.infoCard, { backgroundColor: isDarkMode ? 'rgba(59,130,246,0.1)' : '#EFF6FF', borderColor: isDarkMode ? 'rgba(59,130,246,0.3)' : '#DBEAFE' }, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="information" size={20} color="#3a7ca5" />
          <Text style={[styles.infoText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('notificationSounds.notificationsInfo')}
          </Text>
        </Animated.View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
    </BackgroundWrapper>
  );
}

// ========================================
// الأنماط
// ========================================

const _styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerDark: {
    backgroundColor: DarkColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: fontBold(),
    lineHeight: 34,
    includeFontPadding: false,
    paddingHorizontal: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 15,
  },

  // Permission card
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  permissionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContent: {
    flex: 1,
    marginHorizontal: 15,
  },
  permissionTitle: {
    fontSize: 16,
    fontFamily: fontBold(),
    lineHeight: 28,
    includeFontPadding: false,
  },
  permissionSubtitle: {
    fontSize: 13,
    fontFamily: fontRegular(),
    marginTop: 2,
    lineHeight: 22,
    includeFontPadding: false,
  },

  // Main toggle card
  mainToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginTop: 5,
  },
  mainToggleIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0d8e62',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainToggleContent: {
    flex: 1,
    marginHorizontal: 14,
  },
  mainToggleTitle: {
    fontSize: 17,
    fontFamily: fontBold(),
    lineHeight: 28,
    includeFontPadding: false,
  },
  mainToggleSubtitle: {
    fontSize: 13,
    fontFamily: fontRegular(),
    marginTop: 2,
    lineHeight: 22,
    includeFontPadding: false,
  },

  // Section title
  sectionTitle: {
    fontSize: 14,
    fontFamily: fontBold(),
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 10,
    lineHeight: 24,
    includeFontPadding: false,
  },

  // Categories container — kept transparent so each row's own card style shows
  categoriesContainer: {
    marginHorizontal: 4,
    overflow: 'visible',
  },

  // Category row
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 14,
  },
  categoryRowBorder: {
    // Divider replaced by card spacing; keep style for compatibility
  },
  categoryRowBorderDark: {
    borderBottomColor: '#2d3740',
  },
  disabledOpacity: {
    opacity: 0.5,
  },
  categoryIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
    lineHeight: 26,
    includeFontPadding: false,
  },
  categorySubtitle: {
    fontSize: 12,
    fontFamily: fontRegular(),
    marginTop: 1,
    lineHeight: 20,
    includeFontPadding: false,
  },
  expandArrow: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Expanded content
  expandedWrapper: {
    paddingBottom: 4,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },

  // Inner setting row
  innerSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  innerSettingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  innerSettingTitle: {
    fontSize: 14,
    fontFamily: fontMedium(),
    lineHeight: 24,
    includeFontPadding: false,
  },
  globalSettingRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  // Small label
  smallLabel: {
    fontSize: 13,
    fontFamily: fontMedium(),
    marginBottom: 10,
    marginTop: 8,
    lineHeight: 22,
    includeFontPadding: false,
  },

  // Reminder / chip options
  reminderScroll: {
    flexDirection: 'row',
  },
  reminderMinutesContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  chipOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#E0E0E0',
    gap: 8,
  },
  chipOptionSelected: {
    backgroundColor: '#0d8e62',
  },
  chipOptionText: {
    fontSize: 13,
    fontFamily: fontMedium(),
    lineHeight: 22,
    includeFontPadding: false,
  },
  chipOptionTextSelected: {
    color: '#fff',
  },

  // Prayer toggles
  prayerTogglesContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  prayerBatteryTip: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 4,
    marginTop: 16,
    gap: 10,
  },
  prayerBatteryTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prayerBatteryTipIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(245,158,11,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayerBatteryTipTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontBold(),
    lineHeight: 24,
    includeFontPadding: false,
  },
  prayerBatteryTipBody: {
    fontSize: 13,
    fontFamily: fontRegular(),
    lineHeight: 22,
    includeFontPadding: false,
  },
  prayerBatteryTipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: '#f59e0b',
  },
  prayerBatteryTipButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: fontSemiBold(),
    lineHeight: 22,
    includeFontPadding: false,
  },

  // Time picker row
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginVertical: 2,
    borderRadius: 10,
    gap: 10,
  },
  multiTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  removeTimeButton: {
    padding: 4,
  },
  addTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 6,
    marginBottom: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addTimeText: {
    fontSize: 13,
    fontFamily: fontMedium(),
  },
  timePickerLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontMedium(),
    lineHeight: 24,
    includeFontPadding: false,
  },
  timePickerValue: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
    color: '#0d8e62',
    lineHeight: 26,
    includeFontPadding: false,
  },

  // Sound info row
  soundInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  soundInfoText: {
    fontSize: 12,
    fontFamily: fontRegular(),
    lineHeight: 20,
    includeFontPadding: false,
  },
  ayahDownloadAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  ayahDownloadAlertText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontRegular(),
    lineHeight: 20,
  },

  // Adhan sound section
  adhanSoundSection: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  adhanSoundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  adhanSoundHeaderText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontSemiBold(),
    lineHeight: 24,
    includeFontPadding: false,
  },
  adhanSoundOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  adhanSoundOptionSelected: {
    backgroundColor: 'rgba(6, 79, 47, 0.06)',
    borderRadius: 10,
  },
  adhanSoundIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adhanSoundIconBgSelected: {
    backgroundColor: '#0d8e62',
  },
  adhanSoundContent: {
    flex: 1,
  },
  adhanSoundTitle: {
    fontSize: 14,
    fontFamily: fontSemiBold(),
    lineHeight: 24,
    includeFontPadding: false,
  },
  adhanSoundTitleSelected: {
    color: '#0d8e62',
  },
  adhanSoundSubtitle: {
    fontSize: 11,
    fontFamily: fontRegular(),
    marginTop: 1,
    lineHeight: 18,
    includeFontPadding: false,
  },
  previewButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewButtonActive: {
    backgroundColor: 'rgba(239, 83, 80, 0.1)',
  },

  // Action buttons
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  closeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    gap: 8,
  },
  closeButtonText: {
    fontSize: 14,
    fontFamily: fontSemiBold(),
    lineHeight: 24,
    includeFontPadding: false,
  },

  testNotifButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
    width: '100%',
    marginHorizontal: 0,
    marginTop: 10,
  },
  testNotifText: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
    includeFontPadding: false,
  },

  // Sound picker
  soundPickerContainer: {
    padding: 14,
    borderTopWidth: 1,
  },

  // Reminder sound section
  reminderSoundSection: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },

  // Adhan selected name
  adhanSelectedName: {
    fontSize: 12,
    fontFamily: fontRegular(),
    lineHeight: 20,
    includeFontPadding: false,
  },

  // Custom title input
  customTitleInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontMedium(),
    paddingVertical: 0,
  },

  // Battery optimization card
  batteryOptCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ff980030',
  },
  batteryOptCardDark: {
    backgroundColor: DarkColors.surface,
    borderColor: '#ff980030',
  },
  batteryOptContent: {
    alignItems: 'center',
    gap: 12,
  },

  // Info card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e8f4fd',
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 12,
    padding: 15,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontRegular(),
    lineHeight: 22,
  },

  bottomSpace: {
    height: 100,
  },

  // Custom reminder content type styles
  contentSectionTitle: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
    marginBottom: 8,
    lineHeight: 22,
    includeFontPadding: false,
  },
  contentTypeRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap' as const,
  },
  contentTypeChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
  },
  contentTypeChipActive: {
    backgroundColor: '#0d8e62',
    borderColor: '#0d8e62',
  },
  contentTypeText: {
    fontSize: 13,
    fontFamily: fontMedium(),
    lineHeight: 22,
    includeFontPadding: false,
  },
  contentTypeTextActive: {
    color: '#fff',
  },

  // Surah picker
  surahPickerList: {
    maxHeight: 200,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    marginBottom: 6,
    paddingVertical: 4,
  },
  surahPickerItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  surahPickerItemActive: {
    backgroundColor: '#0d8e62',
    borderRadius: 8,
    borderBottomColor: 'transparent',
  },
  surahPickerNumber: {
    fontSize: 13,
    fontFamily: fontRegular(),
    width: 28,
    textAlign: 'center' as const,
    lineHeight: 22,
    includeFontPadding: false,
  },
  surahPickerName: {
    flex: 1,
    fontSize: 15,
    fontFamily: fontMedium(),
    lineHeight: 26,
    includeFontPadding: false,
  },
  surahPickerAyahCount: {
    fontSize: 11,
    fontFamily: fontRegular(),
    lineHeight: 18,
    includeFontPadding: false,
  },

  // Ayah number picker
  ayahNumberPicker: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  ayahArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(6,79,47,0.1)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  ayahNumberInput: {
    fontSize: 16,
    fontFamily: fontSemiBold(),
    minWidth: 40,
    paddingVertical: 2,
  },
  ayahMaxLabel: {
    fontSize: 12,
    fontFamily: fontRegular(),
    lineHeight: 20,
    includeFontPadding: false,
  },

  // Reciter picker
  reciterPickerList: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    marginBottom: 6,
    paddingVertical: 4,
  },
  reciterPickerListDark: {
    backgroundColor: DarkColors.surface,
  },
  reciterPickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  reciterPickerItemActive: {
    backgroundColor: '#0d8e62',
    borderRadius: 8,
    borderBottomColor: 'transparent',
  },
  reciterPickerName: {
    fontSize: 14,
    fontFamily: fontMedium(),
    lineHeight: 24,
    includeFontPadding: false,
  },

  // Preview ayah button
  previewAyahBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(6,79,47,0.08)',
    marginVertical: 4,
  },
  previewAyahBtnDark: {
    backgroundColor: 'rgba(6,79,47,0.15)',
  },
  previewAyahText: {
    fontSize: 14,
    fontFamily: fontMedium(),
    color: '#0d8e62',
    lineHeight: 24,
    includeFontPadding: false,
  },
  downloadedAyahBtn: {
    backgroundColor: 'rgba(34,197,94,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
  },

  // Downloadable sounds styles
  downloadSectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    marginHorizontal: 16,
  },
  downloadSoundRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  downloadSoundInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
    gap: 12,
  },
  downloadSoundName: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
    lineHeight: 26,
    includeFontPadding: false,
  },
  downloadSoundDesc: {
    fontSize: 12,
    fontFamily: fontRegular(),
    marginTop: 1,
    lineHeight: 20,
    includeFontPadding: false,
  },
  downloadSoundSize: {
    fontSize: 11,
    fontFamily: fontRegular(),
    marginTop: 2,
    lineHeight: 18,
    includeFontPadding: false,
  },
  downloadedBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: 'rgba(34,197,94,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  downloadedText: {
    fontSize: 12,
    fontFamily: fontMedium(),
    color: '#0d8e62',
    lineHeight: 20,
    includeFontPadding: false,
  },
  downloadButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: '#ab47bc',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  downloadButtonLoading: {
    opacity: 0.7,
  },
  downloadButtonText: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
    color: '#fff',
    lineHeight: 22,
    includeFontPadding: false,
  },
  // Day picker styles
  dayPickerContainer: {
    paddingHorizontal: 0,
    paddingTop: 10,
    paddingBottom: 6,
    borderTopWidth: 1,
  },
  dayPickerHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 8,
    gap: 8,
  },
  dayPickerLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontMedium(),
    lineHeight: 22,
    includeFontPadding: false,
  },
  dayPickerToggleAll: {
    fontSize: 12,
    fontFamily: fontSemiBold(),
    lineHeight: 20,
    includeFontPadding: false,
  },
  dayChipsRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  dayChip: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    minHeight: 36,
  },
  dayChipSelected: {
    backgroundColor: '#0d8e62',
  },
  dayChipText: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
    lineHeight: 22,
    includeFontPadding: false,
  },
  dayChipTextSelected: {
    color: '#fff',
  },
});
