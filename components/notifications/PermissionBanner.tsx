/**
 * Permission Banner (Phase 1.B)
 * ──────────────────────────────
 * يعرض banner في أعلى الصفحة لو في إذن مفقود يمنع الإشعارات من الوصول.
 * يفحص حالة الأذونات تلقائياً عند:
 *   - تحميل الصفحة
 *   - رجوع التطبيق من الـ background (المستخدم رجع من إعدادات النظام)
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState, AppStateStatus, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import {
  getPermissionIssues,
  dismissBanner,
  type PermissionKey,
  type PermissionIssue,
} from '@/lib/permission-recovery';
import { useColors } from '@/hooks/use-colors';
import { getLanguage } from '@/lib/i18n';

const RTL_LANGS = new Set(['ar', 'ur', 'fa']);

interface PermissionBannerProps {
  excludedKeys?: PermissionKey[];
  /** Show only these specific permission keys (takes precedence over excludedKeys) */
  onlyKeys?: PermissionKey[];
}

export function PermissionBanner({ excludedKeys = [], onlyKeys }: PermissionBannerProps) {
  const colors = useColors();
  const [issues, setIssues] = useState<PermissionIssue[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const list = await getPermissionIssues();
      const filtered = onlyKeys
        ? list.filter((issue) => onlyKeys.includes(issue.key))
        : list.filter((issue) => !excludedKeys.includes(issue.key));
      setIssues(filtered);
    } catch (e) {
      console.warn('⚠️ [PermissionBanner] فشل فحص الأذونات:', e);
    } finally {
      setLoading(false);
    }
  }, [excludedKeys, loading]);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') refresh();
    });
    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (issues.length === 0) return null;

  // عرض المشكلة الأولى فقط (الأعلى أولوية)
  const issue = issues[0];
  const isCritical = issue.severity === 'critical';
  const accentColor = isCritical ? '#dc2626' : '#f59e0b';
  const iconName = isCritical ? 'alert-circle' : 'alert';
  const isRTL = RTL_LANGS.has(getLanguage());

  const handleAction = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    await issue.action();
    // OEM auto-start state is not readable on many Android skins (including
    // Tecno/Transsion Phone Master), so once the user opens the vendor settings
    // we avoid nagging them again immediately.
    if (issue.key === 'oemAutoStart') {
      await dismissBanner(issue.key);
    }
    // إعادة فحص بعد 500ms (لو المستخدم منح الإذن في الإعدادات)
    setTimeout(() => refresh(), 500);
  };

  const handleDismiss = async () => {
    try {
      await Haptics.selectionAsync();
    } catch {}
    await dismissBanner(issue.key);
    await refresh();
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={Platform.OS === 'ios' ? 80 : 40} tint="light" style={styles.blur}>
        <View style={[styles.accent, { backgroundColor: accentColor }]} />
        <View style={styles.content}>
          <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name={iconName as any} size={22} color={accentColor} />
            <Text style={[styles.title, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{issue.title}</Text>
            <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="close" size={18} color={colors.textLight} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.body, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{issue.body}</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: accentColor, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={handleAction}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>{issue.actionLabel}</Text>
            <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  blur: {
    flexDirection: 'row',
  },
  accent: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  row: {
    alignItems: 'center',
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Rubik-Bold',
  },
  body: {
    fontSize: 13,
    fontFamily: 'Rubik-Regular',
    lineHeight: 20,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Rubik-SemiBold',
  },
});
