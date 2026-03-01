// app/(tabs)/settings.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme-provider";
import { useSettings } from "@/lib/settings-context";
import { IslamicBackground } from "@/components/ui/islamic-background";
import { GlassCard } from "@/components/ui/glass-card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BORDER_RADIUS, SPACING, FONT_SIZES } from "@/constants/theme";

interface SettingItemProps {
  icon: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showArrow?: boolean;
}

function SettingItem({
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
  rightElement,
  showArrow = true,
}: SettingItemProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      <View style={styles.settingItem}>
        <View style={[styles.settingIcon, { backgroundColor: `${iconColor}15` }]}>
          <IconSymbol name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, { color: colors.foreground }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: colors.muted }]}>{subtitle}</Text>
          )}
        </View>
        {rightElement}
        {showArrow && onPress && !rightElement && (
          <IconSymbol name="chevron.left" size={16} color={colors.muted} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { settings, updateSettings } = useSettings();
  const insets = useSafeAreaInsets();

  const handleShare = async () => {
    try {
      await Linking.openURL(
        "https://apps.apple.com/app/your-app-id" // استبدل برابط التطبيق
      );
    } catch {}
  };

  const handleRate = async () => {
    try {
      await Linking.openURL(
        "https://apps.apple.com/app/your-app-id?action=write-review"
      );
    } catch {}
  };

  const handleContact = async () => {
    try {
      await Linking.openURL("mailto:support@example.com");
    } catch {}
  };

  return (
    <IslamicBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: insets.top + 10, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>الإعدادات</Text>
        </View>

        {/* المظهر */}
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>المظهر</Text>
        <GlassCard style={styles.settingsCard}>
          <SettingItem
            icon="moon.fill"
            iconColor="#7C4DFF"
            title="الوضع الليلي"
            subtitle={isDark ? "مفعّل" : "غير مفعّل"}
            rightElement={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            }
            showArrow={false}
          />
        </GlassCard>

        {/* القراءة */}
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>القراءة</Text>
        <GlassCard style={styles.settingsCard}>
          <SettingItem
            icon="textformat.size"
            iconColor="#FF9500"
            title="حجم الخط"
            subtitle={`${settings.fontSize} px`}
            onPress={() => {
              const sizes = [18, 20, 22, 24, 26, 28, 30, 32];
              const currentIndex = sizes.indexOf(settings.fontSize);
              const nextIndex = (currentIndex + 1) % sizes.length;
              updateSettings({ fontSize: sizes[nextIndex] });
            }}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="globe"
            iconColor="#2979FF"
            title="الترجمة"
            subtitle={settings.showTranslation ? "مفعّلة" : "غير مفعّلة"}
            rightElement={
              <Switch
                value={settings.showTranslation}
                onValueChange={(value) => updateSettings({ showTranslation: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            }
            showArrow={false}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="number"
            iconColor="#00BFA5"
            title="أرقام الآيات"
            subtitle={settings.showAyahNumbers ? "ظاهرة" : "مخفية"}
            rightElement={
              <Switch
                value={settings.showAyahNumbers}
                onValueChange={(value) => updateSettings({ showAyahNumbers: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            }
            showArrow={false}
          />
        </GlassCard>

        {/* الصوت */}
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>الصوت</Text>
        <GlassCard style={styles.settingsCard}>
          <SettingItem
            icon="person.wave.2.fill"
            iconColor="#E91E63"
            title="القارئ"
            subtitle={getReciterName(settings.reciter)}
            onPress={() => {
              // يمكن فتح modal لاختيار القارئ
            }}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="play.fill"
            iconColor="#1B8A8A"
            title="التشغيل المتواصل"
            subtitle={settings.continuousPlay ? "مفعّل" : "غير مفعّل"}
            rightElement={
              <Switch
                value={settings.continuousPlay}
                onValueChange={(value) => updateSettings({ continuousPlay: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            }
            showArrow={false}
          />
        </GlassCard>

        {/* الصلاة */}
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>الصلاة</Text>
        <GlassCard style={styles.settingsCard}>
          <SettingItem
            icon="bell.fill"
            iconColor="#FF6D00"
            title="تنبيهات الصلاة"
            subtitle="إدارة التنبيهات"
            onPress={() => {
              // فتح صفحة التنبيهات
            }}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="gearshape.fill"
            iconColor="#607D8B"
            title="طريقة الحساب"
            subtitle={getCalculationMethodName(settings.calculationMethod)}
            onPress={() => {
              // يمكن فتح modal لاختيار طريقة الحساب
            }}
          />
        </GlassCard>

        {/* التطبيق */}
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>التطبيق</Text>
        <GlassCard style={styles.settingsCard}>
          <SettingItem
            icon="square.and.arrow.up.fill"
            iconColor="#1B8A8A"
            title="مشاركة التطبيق"
            subtitle="شارك التطبيق مع أصدقائك"
            onPress={handleShare}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="star.fill"
            iconColor="#FFB800"
            title="قيّم التطبيق"
            subtitle="ساعدنا بتقييمك"
            onPress={handleRate}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="envelope.fill"
            iconColor="#2979FF"
            title="تواصل معنا"
            subtitle="أرسل لنا ملاحظاتك"
            onPress={handleContact}
          />
        </GlassCard>

        {/* معلومات */}
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>معلومات</Text>
        <GlassCard style={styles.settingsCard}>
          <SettingItem
            icon="info.circle.fill"
            iconColor="#607D8B"
            title="عن التطبيق"
            subtitle="الإصدار 2.0.0"
            showArrow={false}
          />
        </GlassCard>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.muted }]}>
            صُنع بـ ❤️ لخدمة كتاب الله
          </Text>
        </View>
      </ScrollView>
    </IslamicBackground>
  );
}

function getReciterName(reciterId: string): string {
  const reciters: Record<string, string> = {
    "ar.alafasy": "مشاري العفاسي",
    "ar.abdulbasit": "عبد الباسط عبد الصمد",
    "ar.minshawi": "محمد صديق المنشاوي",
    "ar.husary": "محمود خليل الحصري",
    "ar.sudais": "عبد الرحمن السديس",
  };
  return reciters[reciterId] || "غير محدد";
}

function getCalculationMethodName(method: number): string {
  const methods: Record<number, string> = {
    1: "جامعة العلوم الإسلامية - كراتشي",
    2: "الجمعية الإسلامية لأمريكا الشمالية",
    3: "رابطة العالم الإسلامي",
    4: "أم القرى",
    5: "الهيئة المصرية العامة للمساحة",
  };
  return methods[method] || "غير محدد";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.md,
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES["3xl"],
    fontWeight: "700",
  },

  // Section
  sectionLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },

  // Settings Card
  settingsCard: {
    padding: 0,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: SPACING.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
  },
  settingSubtitle: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  divider: {
    height: 0.5,
    marginHorizontal: SPACING.md,
  },

  // Footer
  footer: {
    alignItems: "center",
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
  },
});
