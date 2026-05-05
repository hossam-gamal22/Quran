/**
 * Permission Recovery System (Phase 1.B)
 * ────────────────────────────────────────
 * يفحص حالة كل الأذونات المهمة (إشعارات، موقع، إنذار دقيق) ويعرض banner
 * تحذيري للمستخدم لو أي منها مفقود/معطّل، مع زر يفتح إعدادات النظام مباشرة.
 *
 * تتعامل مع 3 سيناريوهات:
 *  1. المستخدم رفض الإذن في المرة الأولى → نعرض banner مهذب
 *  2. المستخدم منح ثم سحب الإذن من إعدادات النظام → نكتشف عند العودة للتطبيق
 *  3. أندرويد 12+ يحتاج SCHEDULE_EXACT_ALARM لكن غير ممنوح → نعرض تحذير منفصل
 */
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { Platform, Linking, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DISMISS_KEY_PREFIX = '@perm_banner_dismissed_';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 ساعة

export type PermissionKey = 'notifications' | 'location' | 'exactAlarm' | 'batteryOptimization' | 'oemAutoStart' | 'dndAccess';

export interface PermissionStatus {
  notifications: 'granted' | 'denied' | 'undetermined';
  location: 'granted' | 'denied' | 'undetermined';
  exactAlarm: 'granted' | 'denied' | 'unsupported';
  batteryOptimization: 'optimized' | 'unrestricted' | 'unsupported';
  oemAutoStart: 'aggressive' | 'standard';
  manufacturer: string;
  // Phase 4: bypass DND لا يعمل إلا بإذن صريح من المستخدم
  dndAccess: 'granted' | 'denied' | 'unsupported';
  dndActive: boolean;
}

export interface PermissionIssue {
  key: PermissionKey;
  severity: 'critical' | 'warning';
  titleAr: string;
  bodyAr: string;
  actionLabelAr: string;
  action: () => Promise<void>;
}

/**
 * يفحص حالة كل الأذونات المهمة دفعة واحدة
 */
export async function checkAllPermissions(): Promise<PermissionStatus> {
  const result: PermissionStatus = {
    notifications: 'undetermined',
    location: 'undetermined',
    exactAlarm: 'unsupported',
    batteryOptimization: 'unsupported',
    oemAutoStart: 'standard',
    manufacturer: 'unknown',
    dndAccess: 'unsupported',
    dndActive: false,
  };

  if (Platform.OS === 'web') {
    return result;
  }

  try {
    const notif = await Notifications.getPermissionsAsync();
    result.notifications = notif.status === 'granted' ? 'granted'
      : notif.status === 'denied' ? 'denied'
      : 'undetermined';
  } catch (e) {
    console.warn('⚠️ [perm-recovery] notifications check failed:', e);
  }

  try {
    const loc = await Location.getForegroundPermissionsAsync();
    result.location = loc.status === 'granted' ? 'granted'
      : loc.status === 'denied' ? 'denied'
      : 'undetermined';
  } catch (e) {
    console.warn('⚠️ [perm-recovery] location check failed:', e);
  }

  if (Platform.OS === 'android') {
    try {
      const FullAdhan = (NativeModules as any).FullAdhanModule;
      if (FullAdhan?.canScheduleExactAlarms) {
        const can = await FullAdhan.canScheduleExactAlarms();
        result.exactAlarm = can ? 'granted' : 'denied';
      }
    } catch (e) {
      console.warn('⚠️ [perm-recovery] exact alarm check failed:', e);
    }

    try {
      const FullAdhan = (NativeModules as any).FullAdhanModule;
      if (FullAdhan?.isIgnoringBatteryOptimizations) {
        const ignoring = await FullAdhan.isIgnoringBatteryOptimizations();
        result.batteryOptimization = ignoring ? 'unrestricted' : 'optimized';
      }
    } catch (e) {
      console.warn('⚠️ [perm-recovery] battery optimization check failed:', e);
    }

    // كشف OEM (Phase 1.C) — بعض الشركات تقتل الخدمات حتى بعد استثناء البطارية
    try {
      const FullAdhan = (NativeModules as any).FullAdhanModule;
      if (FullAdhan?.getDeviceManufacturer) {
        const m = (await FullAdhan.getDeviceManufacturer()) as string;
        result.manufacturer = m || 'unknown';
        const aggressiveOems = ['xiaomi', 'redmi', 'poco', 'oppo', 'realme', 'vivo', 'iqoo', 'huawei', 'honor'];
        if (aggressiveOems.some((o) => m.includes(o))) {
          result.oemAutoStart = 'aggressive';
        }
      }
    } catch (e) {
      console.warn('⚠️ [perm-recovery] manufacturer detect failed:', e);
    }

    // Phase 4: فحص DND access (إذن تجاوز "عدم الإزعاج")
    try {
      const FullAdhan = (NativeModules as any).FullAdhanModule;
      if (FullAdhan?.isDndAccessGranted) {
        const granted = await FullAdhan.isDndAccessGranted();
        result.dndAccess = granted ? 'granted' : 'denied';
      }
      if (FullAdhan?.isDndCurrentlyActive) {
        result.dndActive = await FullAdhan.isDndCurrentlyActive();
      }
    } catch (e) {
      console.warn('⚠️ [perm-recovery] DND check failed:', e);
    }
  }

  return result;
}

/**
 * يطلب إذن الموقع مباشرة (system prompt) وإذا نجح يجلب الموقع
 * ويعيد جدولة إشعارات الصلاة تلقائياً.
 */
export async function requestLocationAndReschedule(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      // المستخدم رفض — افتح إعدادات النظام كحل بديل
      await openAppSettings();
      return false;
    }

    // جلب الموقع الحالي + حفظه
    try {
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = current.coords.latitude;
      const lon = current.coords.longitude;

      // إعادة geوcoding للحصول على اسم المدينة/الدولة
      let city = '';
      let country = '';
      try {
        const [geocode] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        city = geocode?.city || geocode?.subregion || '';
        country = geocode?.country || '';
      } catch {}

      const { saveLocation } = await import('@/lib/prayer-times');
      await saveLocation({ latitude: lat, longitude: lon, city, country });

      // إعادة جدولة إشعارات الصلاة وتحديث widgets
      try {
        const { rescheduleAllFromStorage } = await import('@/lib/notifications-manager');
        rescheduleAllFromStorage().catch(() => {});
      } catch {}

      try {
        const { syncWidgetDataToNative } = await import('@/lib/widget-native-sync');
        syncWidgetDataToNative().catch(() => {});
      } catch {}

      // Phase 2: رفع الموقع لـ Firestore عشان FCM fallback يقدر يحسب الصلاة
      try {
        const uid = await AsyncStorage.getItem('@user_id');
        if (uid) {
          const { syncPrayerDataToFirestore } = await import('@/lib/fcm-prayer-sync');
          syncPrayerDataToFirestore(uid, true).catch(() => {});
        }
      } catch {}

      return true;
    } catch (e) {
      console.warn('⚠️ [perm-recovery] فشل جلب الموقع بعد منح الإذن:', e);
      return true; // الإذن ممنوح على الأقل
    }
  } catch (e) {
    console.warn('⚠️ [perm-recovery] requestLocationAndReschedule failed:', e);
    return false;
  }
}

/**
 * يحوّل حالة الأذونات لقائمة مشاكل مرتبة بالأولوية (critical → warning)
 * يتجاهل المشاكل اللي المستخدم رفضها مؤقتاً (24 ساعة)
 */
export async function getPermissionIssues(status?: PermissionStatus): Promise<PermissionIssue[]> {
  const s = status ?? (await checkAllPermissions());
  const issues: PermissionIssue[] = [];

  // Critical: إشعارات معطّلة → التطبيق لا يستطيع تنبيه المستخدم نهائياً
  if (s.notifications === 'denied' && (await shouldShowBanner('notifications'))) {
    issues.push({
      key: 'notifications',
      severity: 'critical',
      titleAr: 'الإشعارات معطّلة',
      bodyAr: 'لن تصلك أذكار، تذكيرات الصلاة، أو أي تنبيهات. فعّل الإشعارات الآن.',
      actionLabelAr: 'فتح الإعدادات',
      action: openAppSettings,
    });
  }
  // Critical: إنذار دقيق معطّل (أندرويد 12+) → الأذان مش هيشتغل في وقته
  if (s.exactAlarm === 'denied' && (await shouldShowBanner('exactAlarm'))) {
    issues.push({
      key: 'exactAlarm',
      severity: 'critical',
      titleAr: 'الأذان قد يتأخر',
      bodyAr: 'الأذان يحتاج إذن "الإنذارات الدقيقة" ليعمل في وقته بالضبط.',
      actionLabelAr: 'منح الإذن',
      action: openExactAlarmSettings,
    });
  }

  // Warning: تحسين البطارية مفعّل → الإشعارات قد تتأخر أو تختفي
  if (s.batteryOptimization === 'optimized' && (await shouldShowBanner('batteryOptimization'))) {
    issues.push({
      key: 'batteryOptimization',
      severity: 'warning',
      titleAr: 'لضمان وصول الإشعارات',
      bodyAr: 'استثناء التطبيق من توفير البطارية يضمن وصول إشعارات الصلاة دائماً.',
      actionLabelAr: 'استثناء التطبيق',
      action: openBatteryOptimizationSettings,
    });
  }

  // Warning: OEM Auto-Start لشركات عدوانية (Xiaomi/Oppo/Vivo/Huawei/Honor)
  // حتى لو Battery Optimization معطل، الإشعارات تختفي بدون Auto-Start.
  if (s.oemAutoStart === 'aggressive' && (await shouldShowBanner('oemAutoStart'))) {
    const oemNameAr = getOemNameAr(s.manufacturer);
    issues.push({
      key: 'oemAutoStart',
      severity: 'warning',
      titleAr: `إعدادات ${oemNameAr} الإضافية`,
      bodyAr: `أجهزة ${oemNameAr} تحتاج تفعيل “التشغيل التلقائي” حتى تصلك إشعارات الصلاة دائماً.`,
      actionLabelAr: 'فتح الإعدادات',
      action: openOemAutoStartSettings,
    });
  }

  // Warning: موقع معطّل أو غير محدد → سيستخدم Makkah كـ fallback
  // نعرض التنبيه في حالتي denied و undetermined حتى يعرف المستخدم،
  // والزر يطلب الإذن مباشرة (أسرع من فتح الإعدادات).
  if ((s.location === 'denied' || s.location === 'undetermined') && (await shouldShowBanner('location'))) {
    const isDenied = s.location === 'denied';
    issues.push({
      key: 'location',
      severity: 'warning',
      titleAr: isDenied ? 'موقعك غير محدد' : 'فعّل الموقع لمواقيت دقيقة',
      bodyAr: isDenied
        ? 'مواقيت الصلاة معتمدة حالياً على مكة. فعّل الموقع لمواقيت دقيقة لمدينتك.'
        : 'للحصول على مواقيت صلاة دقيقة لمدينتك، فعّل خدمة الموقع.',
      actionLabelAr: isDenied ? 'فتح الإعدادات' : 'تفعيل الموقع',
      action: async () => {
        await requestLocationAndReschedule();
      },
    });
  }

  // Phase 4: DND مفعّل + bypass غير مسموح → الأذان قد يُكتم
  // نعرض التنبيه فقط لو DND مفعّل حالياً (لتقليل الإزعاج)
  if (s.dndAccess === 'denied' && s.dndActive && (await shouldShowBanner('dndAccess'))) {
    issues.push({
      key: 'dndAccess',
      severity: 'warning',
      titleAr: 'وضع "عدم الإزعاج" يكتم الأذان',
      bodyAr: 'وضع عدم الإزعاج مفعّل حالياً. اسمح للأذان بتجاوزه حتى لا يُكتم في وقت الصلاة.',
      actionLabelAr: 'منح الإذن',
      action: openDndAccessSettings,
    });
  }

  return issues;
}

/**
 * يفتح صفحة إعدادات التطبيق في النظام
 */
export async function openAppSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch (e) {
    console.error('❌ [perm-recovery] فشل فتح الإعدادات:', e);
  }
}

/**
 * يفتح صفحة "الإنذارات والتذكيرات" مباشرة على Android 12+
 */
export async function openExactAlarmSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const FullAdhan = (NativeModules as any).FullAdhanModule;
    if (FullAdhan?.requestExactAlarmPermission) {
      await FullAdhan.requestExactAlarmPermission();
      return;
    }
  } catch (e) {
    console.warn('⚠️ [perm-recovery] فشل فتح إعدادات Exact Alarm:', e);
  }
  await openAppSettings();
}

/**
 * يفتح صفحة "تحسين البطارية" مباشرة على Android
 */
export async function openBatteryOptimizationSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const FullAdhan = (NativeModules as any).FullAdhanModule;
    if (FullAdhan?.requestIgnoreBatteryOptimizations) {
      await FullAdhan.requestIgnoreBatteryOptimizations();
      return;
    }
  } catch (e) {
    console.warn('⚠️ [perm-recovery] فشل فتح إعدادات البطارية:', e);
  }
  await openAppSettings();
}
/**
 * يفتح صفحة Auto-Start الخاصة بـ OEM (Xiaomi/Oppo/Vivo/Huawei/Honor)
 */
export async function openOemAutoStartSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const FullAdhan = (NativeModules as any).FullAdhanModule;
    if (FullAdhan?.openOemAutoStartSettings) {
      await FullAdhan.openOemAutoStartSettings();
      return;
    }
  } catch (e) {
    console.warn('⚠️ [perm-recovery] فشل فتح إعدادات OEM:', e);
  }
  await openAppSettings();
}

/**
 * Phase 4: يفتح إعدادات "الوصول إلى وضع عدم الإزعاج"
 * يحتاجه التطبيق ليتمكن من تجاوز DND أثناء الأذان.
 */
export async function openDndAccessSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const FullAdhan = (NativeModules as any).FullAdhanModule;
    if (FullAdhan?.openDndAccessSettings) {
      await FullAdhan.openDndAccessSettings();
      return;
    }
  } catch (e) {
    console.warn('⚠️ [perm-recovery] فشل فتح إعدادات DND:', e);
  }
  await openAppSettings();
}

/**
 * تحويل اسم الشركة لاسم عربي للعرض في banner
 */
function getOemNameAr(manufacturer: string): string {
  const m = manufacturer.toLowerCase();
  if (m.includes('xiaomi') || m.includes('redmi') || m.includes('poco')) return 'Xiaomi/Redmi';
  if (m.includes('oppo') || m.includes('realme')) return 'Oppo/Realme';
  if (m.includes('vivo') || m.includes('iqoo')) return 'Vivo';
  if (m.includes('huawei')) return 'Huawei';
  if (m.includes('honor')) return 'Honor';
  if (m.includes('samsung')) return 'Samsung';
  return 'جهازك';
}
/**
 * يخفي banner معين لمدة 24 ساعة (المستخدم رفضه يدوياً)
 */
export async function dismissBanner(key: PermissionKey): Promise<void> {
  try {
    await AsyncStorage.setItem(`${DISMISS_KEY_PREFIX}${key}`, String(Date.now()));
  } catch {}
}

/**
 * يتحقق إذا كان يجب عرض banner معين (لم يُرفض في آخر 24 ساعة)
 */
export async function shouldShowBanner(key: PermissionKey): Promise<boolean> {
  try {
    const dismissedAt = await AsyncStorage.getItem(`${DISMISS_KEY_PREFIX}${key}`);
    if (!dismissedAt) return true;
    const elapsed = Date.now() - parseInt(dismissedAt, 10);
    return elapsed > DISMISS_DURATION_MS;
  } catch {
    return true;
  }
}
